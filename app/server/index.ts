import crypto from "crypto";
import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { PublicKey } from "@solana/web3.js";
import {
  assertDevnetOnly,
  connectionFrom,
  explorerAddress,
  HONESTY_LINE,
  loadConfig,
  loadKeypair,
  priceAtomic,
} from "../lib/config";
import { paymentCacheKey, SettlementCache } from "../lib/settle-cache";
import { programIdFromEnv, recordSettlementOnChain } from "../lib/registry";
import { resourceHash, signMerchantReceipt, slotHash } from "../lib/resource";

type Json = Record<string, unknown>;

const receiptsByPayer = new Map<string, Json>();
const receiptsBySig = new Map<string, Json>();
const settleCache = new SettlementCache();

function b64json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function parseB64json(header: string | undefined): unknown {
  if (!header) return undefined;
  return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
}

function nonceFromPayment(payload: unknown): bigint {
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest();
  return digest.readBigUInt64LE(0);
}

async function fetchFeePayer(facilitatorUrl: string, network: string): Promise<string> {
  const res = await fetch(`${facilitatorUrl.replace(/\/+$/, "")}/supported`);
  if (!res.ok) {
    throw new Error(`facilitator /supported HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    kinds?: Array<{
      x402Version: number;
      scheme: string;
      network: string;
      extra?: { feePayer?: string };
    }>;
  };
  const kind = body.kinds?.find(
    (k) =>
      k.scheme === "exact" &&
      k.network === network &&
      k.x402Version === 2
  );
  const feePayer = kind?.extra?.feePayer;
  if (!feePayer) {
    throw new Error(`no v2 exact feePayer for ${network} in /supported`);
  }
  return feePayer;
}

export async function createServer() {
  const cfg = loadConfig();
  assertDevnetOnly(cfg.cluster, cfg.rpc);
  const merchant = loadKeypair(cfg.merchantKeypairPath);
  const connection = connectionFrom(cfg);
  const facilitator = new HTTPFacilitatorClient({ url: cfg.facilitatorUrl });
  const feePayer = await fetchFeePayer(cfg.facilitatorUrl, cfg.network);
  const amount = priceAtomic(cfg.priceUsdc).toString();
  const programId = programIdFromEnv();

  const app = express();
  app.disable("x-powered-by");

  const paymentRequirements = () => ({
    scheme: "exact",
    network: cfg.network,
    amount,
    asset: cfg.usdcMint,
    payTo: merchant.publicKey.toBase58(),
    maxTimeoutSeconds: 60,
    extra: {
      feePayer,
    },
  });

  app.get("/health", async (_req, res) => {
    let slot: number | null = null;
    try {
      slot = await connection.getSlot("confirmed");
    } catch {
      slot = null;
    }
    res.json({
      ok: true,
      cluster: cfg.cluster,
      rpc: cfg.rpc,
      network: cfg.network,
      facilitator: cfg.facilitatorUrl,
      usdcMint: cfg.usdcMint,
      payTo: merchant.publicKey.toBase58(),
      feePayer,
      programId: programId.toBase58(),
      slot,
      honesty: HONESTY_LINE,
      not: [
        "marketplace",
        "mainnet",
        "swarm-tvl",
        "upto-on-solana",
        "path-B-custom-program-settlement",
      ],
    });
  });

  app.get("/resource", async (req, res) => {
    const paymentHeader =
      req.header("PAYMENT-SIGNATURE") ?? req.header("payment-signature");
    const resourceInfo = {
      url: `${cfg.resourceServerUrl}/resource`,
      description:
        "Deterministic Devnet slot-hash plus a merchant-signed receipt. Not a swarm marketplace API.",
      mimeType: "application/json",
    };

    if (!paymentHeader) {
      const body = {
        x402Version: 2,
        error: "PAYMENT-SIGNATURE header required",
        resource: resourceInfo,
        accepts: [paymentRequirements()],
      };
      res
        .status(402)
        .set("PAYMENT-REQUIRED", b64json(body))
        .set("Cache-Control", "no-store")
        .json(body);
      return;
    }

    let paymentPayload: unknown;
    try {
      paymentPayload = parseB64json(paymentHeader);
    } catch {
      res.status(400).json({ error: "PAYMENT-SIGNATURE is not valid base64 JSON" });
      return;
    }

    const requirements = paymentRequirements();
    const cacheKey = paymentCacheKey(paymentPayload);
    if (!settleCache.reserve(cacheKey)) {
      res.status(409).json({ error: "duplicate_settlement" });
      return;
    }

    try {
      const verify = await facilitator.verify(
        paymentPayload as never,
        requirements as never
      );
      if (!verify.isValid) {
        res.status(402).json({
          error: "verify_failed",
          invalidReason: verify.invalidReason,
          invalidMessage: verify.invalidMessage,
        });
        return;
      }

      const settle = await facilitator.settle(
        paymentPayload as never,
        requirements as never
      );
      if (!settle.success) {
        res.status(402).json({
          error: "settle_failed",
          errorReason: settle.errorReason,
          errorMessage: settle.errorMessage,
        });
        return;
      }

      const slot = await connection.getSlot("confirmed");
      const slots = await slotHash(connection, slot, cfg.slotWindow);
      const payerStr =
        (settle.payer as string | undefined) ??
        (verify.payer as string | undefined);
      if (!payerStr) {
        res.status(500).json({ error: "facilitator did not return payer" });
        return;
      }
      const payer = new PublicKey(payerStr);
      const nonce = nonceFromPayment(paymentPayload);
      const hash = resourceHash([
        slots,
        settle.transaction,
        payerStr,
        amount,
      ]);

      const recorded = await recordSettlementOnChain({
        connection,
        merchant,
        payer,
        amount: BigInt(amount),
        resourceHash: hash,
        nonce,
      });

      const signed = signMerchantReceipt(merchant, {
        honesty: HONESTY_LINE,
        slot,
        slotHash: slots,
        payer: payerStr,
        amount,
        usdcMint: cfg.usdcMint,
        payTo: merchant.publicKey.toBase58(),
        settleTx: settle.transaction,
        receiptPda: recorded.receipt,
        recordTx: recorded.signature,
      });

      const payload = {
        ok: true,
        honesty: HONESTY_LINE,
        resource: {
          slotHash: slots,
          lastSlot: slot,
          window: cfg.slotWindow,
        },
        receipt: signed,
        receiptPda: recorded.receipt,
        receiptExplorer: explorerAddress(recorded.receipt),
        settleTx: settle.transaction,
        recordTx: recorded.signature,
      };

      receiptsByPayer.set(payerStr, payload);
      receiptsBySig.set(settle.transaction, payload);
      receiptsBySig.set(recorded.signature, payload);

      res
        .status(200)
        .set("PAYMENT-RESPONSE", b64json(settle))
        .json(payload);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(402).json({ error: "payment_or_registry_failed", message });
    }
  });

  app.get("/receipt/:id", (req, res) => {
    const id = req.params.id;
    const found = receiptsBySig.get(id) ?? receiptsByPayer.get(id);
    if (!found) {
      res.status(404).json({ error: "receipt_not_found", id });
      return;
    }
    res.json(found);
  });

  return { app, merchant, feePayer, cfg };
}

async function main() {
  const { app, cfg } = await createServer();
  app.listen(cfg.port, "127.0.0.1", () => {
    console.log(`atlas-forge-svm resource server on 127.0.0.1:${cfg.port}`);
    console.log(HONESTY_LINE);
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
