/**
 * Merchant-side record_settlement after an x402 SPL TransferChecked is confirmed.
 * Does not ask the facilitator to execute a custom program instruction (Path A).
 */
import { PublicKey } from "@solana/web3.js";
import {
  connectionFrom,
  loadConfig,
  loadKeypair,
  priceAtomic,
} from "../app/lib/config";
import { recordSettlementOnChain } from "../app/lib/registry";
import { resourceHash } from "../app/lib/resource";

async function main() {
  const cfg = loadConfig();
  const payerArg = process.argv[2];
  const nonceArg = process.argv[3];
  if (!payerArg || !nonceArg) {
    console.error("usage: ts-node scripts/07-record-or-settle.ts <payerPubkey> <nonce>");
    process.exit(1);
  }
  const merchant = loadKeypair(cfg.merchantKeypairPath);
  const connection = connectionFrom(cfg);
  const out = await recordSettlementOnChain({
    connection,
    merchant,
    payer: new PublicKey(payerArg),
    amount: priceAtomic(cfg.priceUsdc),
    resourceHash: resourceHash(["manual", payerArg, nonceArg]),
    nonce: BigInt(nonceArg),
  });
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
