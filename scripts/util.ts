import path from "path";
import { spawnSync } from "child_process";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = {}): string {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
    cwd: process.cwd(),
  });
  if (res.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed: ${(res.stderr || res.stdout || "").trim()}`
    );
  }
  return (res.stdout || "").trim();
}

export async function airdropOrThrow(
  connection: Connection,
  pubkey: PublicKey,
  sol = 1
): Promise<string> {
  try {
    const sig = await connection.requestAirdrop(
      pubkey,
      sol * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`devnet airdrop blocked for ${pubkey.toBase58()}: ${message}`);
  }
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function loadJson<T>(file: string): T {
  const fs = require("fs") as typeof import("fs");
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) as T;
}
