import { PublicKey } from "@solana/web3.js";

export const MERCHANT_SEED = Buffer.from("merchant");
export const RECEIPT_SEED = Buffer.from("receipt");
export const WINDOW_SEED = Buffer.from("window");

function u64Le(nonce: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(nonce));
  return buf;
}

export function merchantPda(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MERCHANT_SEED, authority.toBuffer()],
    programId
  );
}

export function receiptPda(
  config: PublicKey,
  payer: PublicKey,
  nonce: bigint | number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_SEED, config.toBuffer(), payer.toBuffer(), u64Le(nonce)],
    programId
  );
}

export function windowPda(
  config: PublicKey,
  payer: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [WINDOW_SEED, config.toBuffer(), payer.toBuffer()],
    programId
  );
}
