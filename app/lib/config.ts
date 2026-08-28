import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const CIRCLE_DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const X402_NETWORK = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const DEVNET_GENESIS_PREFIX = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const HONESTY_LINE =
  "x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.";

export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

export function loadConfig() {
  const rpc = env("SOLANA_RPC", "https://api.devnet.solana.com");
  const ws = env("SOLANA_WS", "wss://api.devnet.solana.com");
  return {
    cluster: env("SOLANA_CLUSTER", "devnet"),
    rpc,
    ws,
    network: env("X402_NETWORK", X402_NETWORK),
    facilitatorUrl: env("X402_FACILITATOR_URL", "https://x402.org/facilitator"),
    usdcMint: env("USDC_MINT", CIRCLE_DEVNET_USDC),
    merchantKeypairPath: env("MERCHANT_KEYPAIR", "./keys/merchant.json"),
    payerKeypairPath: env("PAYER_KEYPAIR", "./keys/payer.json"),
    unauthorizedKeypairPath: env(
      "UNAUTHORIZED_KEYPAIR",
      "./keys/unauthorized.json"
    ),
    priceUsdc: Number(env("PRICE_USDC", "0.01")),
    spendCapUsdc: Number(env("SPEND_CAP_USDC", "0.05")),
    port: Number(env("PORT", "4021")),
    resourceServerUrl: env("RESOURCE_SERVER_URL", "http://127.0.0.1:4021"),
    slotWindow: Number(env("SLOT_WINDOW", "8")),
    programId: process.env.PROGRAM_ID,
  };
}

export function loadKeypair(filePath: string): Keypair {
  const abs = path.resolve(filePath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as unknown;
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`keypair file ${filePath} is not a 64-byte secret array`);
  }
  const bytes = Uint8Array.from(raw as number[]);
  return Keypair.fromSecretKey(bytes);
}

export function connectionFrom(cfg = loadConfig()): Connection {
  return new Connection(cfg.rpc, {
    commitment: "confirmed",
    wsEndpoint: cfg.ws,
  });
}

export function priceAtomic(priceUsdc: number): bigint {
  return BigInt(Math.round(priceUsdc * 1_000_000));
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

export function assertDevnetOnly(cluster: string, rpc: string): void {
  if (cluster !== "devnet") {
    throw new Error("this repo is Solana Devnet only");
  }
  if (rpc.includes("api.mainnet") || rpc.includes("api.testnet.solana.com")) {
    throw new Error("refusing mainnet or solana testnet RPC");
  }
}

export const PROGRAM_ID_DEFAULT = new PublicKey(
  "5u6WZQsMPrufRZVbnWKjv6K1cH2pmF3gXbVhK15rh1eQ"
);
