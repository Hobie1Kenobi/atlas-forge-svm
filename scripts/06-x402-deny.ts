import { spawn } from "child_process";
import { loadConfig } from "../app/lib/config";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const cfg = loadConfig();
  const server = spawn("npx", ["ts-node", "--transpile-only", "app/server/index.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  const evidence: Array<Record<string, unknown>> = [];
  try {
    await wait(2500);
    const url = `${cfg.resourceServerUrl}/resource`;

    const noPay = await fetch(url);
    const noPayBody = (await noPay.json()) as {
      accepts?: Array<{ scheme?: string; network?: string }>;
    };
    evidence.push({
      name: "no_payment_header",
      status: noPay.status,
      hasPaymentRequired: Boolean(noPay.headers.get("PAYMENT-REQUIRED")),
      scheme: noPayBody?.accepts?.[0]?.scheme,
      network: noPayBody?.accepts?.[0]?.network,
      ok: noPay.status === 402,
    });

    const garbage = await fetch(url, {
      headers: {
        "PAYMENT-SIGNATURE": Buffer.from(
          JSON.stringify({ x402Version: 2, payload: { transaction: "not-a-tx" } })
        ).toString("base64"),
      },
    });
    const garbageBody = await garbage.json();
    evidence.push({
      name: "malformed_payment_verify_fails",
      status: garbage.status,
      body: garbageBody,
      ok: garbage.status === 402 || garbage.status === 400,
    });

    const health = await fetch(`${cfg.resourceServerUrl}/health`);
    evidence.push({
      name: "health",
      status: health.status,
      body: await health.json(),
      ok: health.status === 200,
    });

    console.log(JSON.stringify({ denyHttp: evidence }, null, 2));
    const failed = evidence.filter((e) => !e.ok);
    if (failed.length) process.exit(1);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
