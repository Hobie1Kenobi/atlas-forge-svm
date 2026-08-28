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
  try {
    await wait(2500);
    const payer = spawn("npx", ["ts-node", "--transpile-only", "app/payer/index.ts"], {
      stdio: "inherit",
      env: process.env,
    });
    const code: number = await new Promise((resolve) => {
      payer.on("close", (c) => resolve(c ?? 1));
    });
    if (code !== 0) process.exit(code);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
