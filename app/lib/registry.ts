import fs from "fs";
import path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { merchantPda, receiptPda, windowPda } from "./pda";
import { PROGRAM_ID_DEFAULT } from "./config";

function loadIdl(): object {
  const p = path.resolve(process.cwd(), "idl/atlas_forge_svm.json");
  if (!fs.existsSync(p)) {
    throw new Error("idl/atlas_forge_svm.json missing; run anchor build");
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as object;
}

export function programIdFromEnv(): PublicKey {
  return process.env.PROGRAM_ID
    ? new PublicKey(process.env.PROGRAM_ID)
    : PROGRAM_ID_DEFAULT;
}

export function makeProgram(connection: Connection, merchant: Keypair): Program {
  const wallet = new Wallet(merchant);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(loadIdl() as never, provider);
}

export async function recordSettlementOnChain(args: {
  connection: Connection;
  merchant: Keypair;
  payer: PublicKey;
  amount: bigint;
  resourceHash: Buffer;
  nonce: bigint;
}): Promise<{ signature: string; receipt: string; config: string }> {
  const program = makeProgram(args.connection, args.merchant);
  const programId = program.programId;
  const [config] = merchantPda(args.merchant.publicKey, programId);
  const cfg = (await (program.account as unknown as {
    merchantConfig: { fetch: (k: PublicKey) => Promise<{ mint: PublicKey; treasury: PublicKey }> };
  }).merchantConfig.fetch(config));
  const mint = cfg.mint as PublicKey;
  const treasury = cfg.treasury as PublicKey;
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury);
  const payerAta = getAssociatedTokenAddressSync(mint, args.payer);
  const nonceBn = new BN(args.nonce.toString());
  const [receipt] = receiptPda(config, args.payer, args.nonce, programId);
  const [payerSpend] = windowPda(config, args.payer, programId);

  const signature = await program.methods
    .recordSettlement(
      new BN(args.amount.toString()),
      Array.from(args.resourceHash),
      nonceBn
    )
    .accountsPartial({
      authority: args.merchant.publicKey,
      config,
      mint,
      treasury,
      treasuryAta,
      payer: args.payer,
      payerAta,
      receipt,
      payerSpend,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { signature, receipt: receipt.toBase58(), config: config.toBase58() };
}
