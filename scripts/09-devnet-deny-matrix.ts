/**
 * Live Devnet deny matrix against the receipt registry.
 * Does not move USDC. x402 settlement remains exact SPL TransferChecked.
 */
import fs from "fs";
import path from "path";
import { BN, Program, AnchorProvider, Wallet } from "@anchor-lang/core";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  HONESTY_LINE,
  loadConfig,
  loadKeypair,
  priceAtomic,
} from "../app/lib/config";
import { merchantPda, receiptPda, windowPda } from "../app/lib/pda";
import { programIdFromEnv } from "../app/lib/registry";

function loadKp(p: string): Keypair {
  return loadKeypair(p);
}

function errInfo(e: unknown): {
  message: string;
  logs: string[];
  signature?: string;
} {
  const anyErr = e as {
    message?: string;
    logs?: string[];
    signature?: string;
    transaction?: string;
  };
  const logs = Array.isArray(anyErr.logs) ? anyErr.logs : [];
  const text = `${anyErr.message ?? ""}\n${String(e)}`;
  const sigMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/);
  return {
    message: anyErr.message ?? String(e),
    logs,
    signature: anyErr.signature ?? anyErr.transaction ?? sigMatch?.[0],
  };
}

function hasCode(
  info: { message: string; logs: string[] },
  codes: string[],
): boolean {
  const text = `${info.message}\n${info.logs.join("\n")}`;
  return codes.some((c) => text.includes(c));
}

async function main() {
  const cfg = loadConfig();
  const connection = new Connection(cfg.rpc, "confirmed");
  const merchant = loadKp(cfg.merchantKeypairPath);
  const payer = loadKp(cfg.payerKeypairPath);
  const unauthorized = loadKp(cfg.unauthorizedKeypairPath);
  const idl = JSON.parse(
    fs.readFileSync(path.resolve("idl/atlas_forge_svm.json"), "utf8"),
  );
  const provider = new AnchorProvider(connection, new Wallet(merchant), {
    commitment: "confirmed",
  });
  const program = new Program(idl, provider);
  const programId = programIdFromEnv();
  const [config] = merchantPda(merchant.publicKey, programId);
  const mint = new PublicKey(cfg.usdcMint);
  const treasuryAta = getAssociatedTokenAddressSync(mint, merchant.publicKey);
  const payerAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const price = new BN(priceAtomic(cfg.priceUsdc).toString());
  const cap = new BN(priceAtomic(cfg.spendCapUsdc).toString());
  const resource = Buffer.alloc(32, 9);

  async function recordRpc(nonce: bigint, authority = merchant) {
    const nonceBn = new BN(nonce.toString());
    const [receipt] = receiptPda(config, payer.publicKey, nonce, programId);
    const [payerSpend] = windowPda(config, payer.publicKey, programId);
    return program.methods
      .recordSettlement(price, Array.from(resource), nonceBn)
      .accountsPartial({
        authority: authority.publicKey,
        config,
        mint,
        treasury: merchant.publicKey,
        treasuryAta,
        payer: payer.publicKey,
        payerAta,
        receipt,
        payerSpend,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers(
        authority.publicKey.equals(merchant.publicKey) ? [] : [authority],
      )
      .rpc({ skipPreflight: true });
  }

  const deny: Array<Record<string, unknown>> = [];

  // 1) unauthorized set_params
  try {
    const sig = await program.methods
      .setParams(price, cap, merchant.publicKey)
      .accountsPartial({
        authority: unauthorized.publicKey,
        config,
        mint,
        treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([unauthorized])
      .rpc({ skipPreflight: true });
    deny.push({
      name: "unauthorized_set_params",
      ok: false,
      error: "unexpected success",
      signature: sig,
    });
  } catch (e) {
    const info = errInfo(e);
    deny.push({
      name: "unauthorized_set_params",
      ok: hasCode(info, ["Unauthorized", "ConstraintHasOne"]),
      signature: info.signature ?? null,
      message: info.message.split("\n")[0],
    });
  }

  // 2) pay under cap then replay
  const replayNonce = 9001n;
  const first = await recordRpc(replayNonce);
  deny.push({
    name: "record_under_cap_for_replay",
    ok: true,
    signature: first,
  });
  try {
    const sig = await recordRpc(replayNonce);
    deny.push({
      name: "replay_nonce",
      ok: false,
      error: "unexpected success",
      signature: sig,
    });
  } catch (e) {
    const info = errInfo(e);
    deny.push({
      name: "replay_nonce",
      ok: hasCode(info, ["ReplayNonce"]),
      signature: info.signature ?? null,
      message: info.message.split("\n")[0],
    });
  }

  // 3) over cap: set cap to current spent (one payment) then record
  const tightCap = price;
  const capTx = await program.methods
    .setParams(price, tightCap, merchant.publicKey)
    .accountsPartial({
      authority: merchant.publicKey,
      config,
      mint,
      treasuryAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  deny.push({ name: "set_params_tight_cap", ok: true, signature: capTx });
  try {
    const sig = await recordRpc(9002n);
    deny.push({
      name: "over_cap",
      ok: false,
      error: "unexpected success",
      signature: sig,
    });
  } catch (e) {
    const info = errInfo(e);
    deny.push({
      name: "over_cap",
      ok: hasCode(info, ["OverCap"]),
      signature: info.signature ?? null,
      message: info.message.split("\n")[0],
    });
  }

  // restore cap
  const restoreCap = await program.methods
    .setParams(price, cap, merchant.publicKey)
    .accountsPartial({
      authority: merchant.publicKey,
      config,
      mint,
      treasuryAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  deny.push({ name: "restore_cap", ok: true, signature: restoreCap });

  // 4) pause
  const pauseTx = await program.methods
    .pause()
    .accountsPartial({
      authority: merchant.publicKey,
      config,
    })
    .rpc();
  deny.push({ name: "pause", ok: true, signature: pauseTx });
  try {
    const sig = await recordRpc(9003n);
    deny.push({
      name: "paused_record",
      ok: false,
      error: "unexpected success",
      signature: sig,
    });
  } catch (e) {
    const info = errInfo(e);
    deny.push({
      name: "paused_record",
      ok: hasCode(info, ["Paused"]),
      signature: info.signature ?? null,
      message: info.message.split("\n")[0],
    });
  }
  const unpauseTx = await program.methods
    .unpause()
    .accountsPartial({
      authority: merchant.publicKey,
      config,
    })
    .rpc();
  deny.push({ name: "unpause", ok: true, signature: unpauseTx });

  const failed = deny.filter((d) => !d.ok);
  console.log(
    JSON.stringify(
      {
        honesty: HONESTY_LINE,
        programId: programId.toBase58(),
        config: config.toBase58(),
        deny,
        failed: failed.map((d) => d.name),
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
