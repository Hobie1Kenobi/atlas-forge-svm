import fs from "fs";
import path from "path";
import crypto from "crypto";
import { probeFacilitator, probeRpc, summarizeProbe } from "../app/probe";
import {
  explorerAddress,
  HONESTY_LINE,
  loadConfig,
} from "../app/lib/config";

async function main() {
  const cfg = loadConfig();
  const rpc = await probeRpc(cfg.rpc);
  const fac = await probeFacilitator(cfg.facilitatorUrl);
  const summary = summarizeProbe(rpc, fac);

  let idlHash: string | null = null;
  const idlPath = path.resolve("idl/atlas_forge_svm.json");
  if (fs.existsSync(idlPath)) {
    idlHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(idlPath))
      .digest("hex");
  }

  const blockedReasons: string[] = [];
  const usdcScript = process.env.USDC_STATUS;
  if (usdcScript) blockedReasons.push(usdcScript);

  const programId = process.env.PROGRAM_ID ?? "CFogKbTTNkDn9kQr6pNtnMDJnqTCTcaF9t5dzYajtVwA";
  const initTx = process.env.INIT_TX ?? null;
  const happySigs = process.env.HAPPY_SIGS ? process.env.HAPPY_SIGS.split(",") : [];
  const executed = Boolean(initTx) && happySigs.length > 0;

  const report = {
    status: executed ? "EXECUTED" : "BLOCKED",
    honesty: HONESTY_LINE,
    cluster: "devnet",
    rpc: cfg.rpc,
    caip2: cfg.network,
    facilitator: cfg.facilitatorUrl,
    facilitatorKinds: summary.facilitatorSvmExact,
    programId,
    programExplorer: explorerAddress(programId),
    idlHash,
    initTx,
    happyPathSigs: happySigs,
    denyEvidence: [
      "local anchor test: OverCap",
      "local anchor test: Paused",
      "local anchor test: WrongMint",
      "local anchor test: ReplayNonce",
      "local anchor test: Unauthorized set_params",
      "HTTP GET /resource without PAYMENT-SIGNATURE → 402 (script 06)",
    ],
    probe: summary,
    blockedReasons,
    never: [
      "Solana mainnet",
      "Solana Testnet (api.testnet.solana.com)",
      "real SOL value claims",
      "real USDC (mainnet)",
      "upto or batch-settlement on Solana",
      "Path B custom program as x402 settlement target",
    ],
  };

  fs.writeFileSync(
    "PUBLIC_DEVNET_REPORT.md",
    render(report)
  );
  console.log(executed ? "EXECUTED" : "BLOCKED");
}

function render(report: Record<string, unknown>): string {
  return `# PUBLIC_DEVNET_REPORT

Status: **${report.status}**

${report.honesty}

## Cluster

- Cluster: \`${report.cluster}\`
- RPC: \`${report.rpc}\`
- CAIP-2: \`${report.caip2}\`
- Explorer: https://explorer.solana.com/?cluster=devnet

## Facilitator kinds (live GET /supported)

\`\`\`json
${JSON.stringify(report.facilitatorKinds, null, 2)}
\`\`\`

upto and batch-settlement are **not** claimed on Solana. They exist on eip155:84532 only in the 2026-08-28 probe.

## Program

- Program ID: \`${report.programId}\`
- Explorer: ${report.programExplorer}
- IDL SHA-256: \`${report.idlHash ?? "not built"}\`
- Init tx: ${report.initTx ? `https://explorer.solana.com/tx/${report.initTx}?cluster=devnet` : "not confirmed (BLOCKED or pending)"}

## Happy path

${
    (report.happyPathSigs as string[]).length
      ? (report.happyPathSigs as string[])
          .map((s) => `- https://explorer.solana.com/tx/${s}?cluster=devnet`)
          .join("\n")
      : "_No confirmed happy-path signatures. Do not invent explorer URLs._"
  }

## Deny evidence

${(report.denyEvidence as string[]).map((d) => `- ${d}`).join("\n")}

## Live probe snapshot

\`\`\`json
${JSON.stringify(report.probe, null, 2)}
\`\`\`

## Blocked reasons

${
    (report.blockedReasons as string[]).length
      ? (report.blockedReasons as string[]).map((r) => `- ${r}`).join("\n")
      : executedLine(report.status as string)
  }

## Never

${(report.never as string[]).map((n) => `- ${n}`).join("\n")}
`;
}

function executedLine(status: string): string {
  return status === "EXECUTED"
    ? "- none"
    : "- Devnet funding/deploy not completed in this run; local tests still required.";
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
