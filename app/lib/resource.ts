import crypto from "crypto";
import nacl from "tweetnacl";
import { Connection, Keypair } from "@solana/web3.js";

export async function slotHash(
  connection: Connection,
  currentSlot: number,
  n: number
): Promise<string> {
  const slots: number[] = [];
  for (let i = 0; i < n; i++) {
    slots.push(Math.max(currentSlot - i, 0));
  }
  return crypto.createHash("sha256").update(slots.join(",")).digest("hex");
}

export function signMerchantReceipt(
  merchant: Keypair,
  body: Record<string, unknown>
): { body: Record<string, unknown>; signature: string } {
  const msg = Buffer.from(JSON.stringify(body), "utf8");
  const signature = Buffer.from(
    nacl.sign.detached(msg, merchant.secretKey)
  ).toString("base64");
  return { body, signature };
}

export function resourceHash(parts: string[]): Buffer {
  return crypto.createHash("sha256").update(parts.join("|")).digest();
}
