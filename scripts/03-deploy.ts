import fs from "fs";
import path from "path";
import { run } from "./util";
import { loadConfig, loadKeypair } from "../app/lib/config";

async function main() {
  const cfg = loadConfig();
  const merchant = loadKeypair(cfg.merchantKeypairPath);
  const env = {
    ANCHOR_PROVIDER_URL: cfg.rpc,
    ANCHOR_WALLET: path.resolve(cfg.merchantKeypairPath),
  };
  console.log(`deploying with merchant pubkey=${merchant.publicKey.toBase58()}`);
  const out = run("anchor", ["deploy", "--provider.cluster", "devnet"], env);
  console.log(out);
  const pubkey = run("solana-keygen", [
    "pubkey",
    "target/deploy/atlas_forge_svm-keypair.json",
  ]);
  console.log(`programId=${pubkey}`);
  fs.mkdirSync("deployments", { recursive: true });
  const pending = {
    cluster: "devnet",
    programId: pubkey,
    note: "fill signatures in 04-init / 08-write-evidence after confirmed txs only",
  };
  fs.writeFileSync(
    "deployments/.deploy-pending.json",
    JSON.stringify(pending, null, 2)
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
