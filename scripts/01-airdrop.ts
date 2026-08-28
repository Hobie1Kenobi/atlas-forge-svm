import { airdropOrThrow } from "./util";
import {
  connectionFrom,
  loadConfig,
  loadKeypair,
} from "../app/lib/config";

async function main() {
  const cfg = loadConfig();
  const connection = connectionFrom(cfg);
  const merchant = loadKeypair(cfg.merchantKeypairPath);
  const payer = loadKeypair(cfg.payerKeypairPath);
  const unauthorized = loadKeypair(cfg.unauthorizedKeypairPath);

  const out: Record<string, string> = {};
  for (const [name, kp] of [
    ["merchant", merchant],
    ["payer", payer],
    ["unauthorized", unauthorized],
  ] as const) {
    const sig = await airdropOrThrow(connection, kp.publicKey, 2);
    out[name] = sig;
    const bal = await connection.getBalance(kp.publicKey);
    console.log(`${name} pubkey=${kp.publicKey.toBase58()} lamports=${bal} airdrop=${sig}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
