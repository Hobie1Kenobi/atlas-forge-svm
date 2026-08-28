import { writeFileSync } from "fs";
import { probeFacilitator, probeRpc, summarizeProbe } from "../app/probe";
import { loadConfig } from "../app/lib/config";

async function main() {
  const cfg = loadConfig();
  const rpc = await probeRpc(cfg.rpc);
  const fac = await probeFacilitator(cfg.facilitatorUrl);
  const summary = summarizeProbe(rpc, fac);
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync("docs/.probe-cache.json", JSON.stringify({ rpc, fac, summary }, null, 2));
  if (!summary.genesisMatchesCaip2) {
    throw new Error("genesis hash does not match CAIP-2 prefix EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
  }
  if (summary.uptoOnSolana.length > 0) {
    console.log("note: facilitator unexpectedly listed upto on a solana network; still not claimed by this repo");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
