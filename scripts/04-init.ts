import path from "path";
import { BN, Program, AnchorProvider, Wallet } from "@anchor-lang/core";
import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import fs from "fs";
import {
  loadConfig,
  loadKeypair,
  priceAtomic,
  explorerTx,
} from "../app/lib/config";
import { merchantPda } from "../app/lib/pda";
import { programIdFromEnv } from "../app/lib/registry";

async function main() {
  const cfg = loadConfig();
  const merchant = loadKeypair(cfg.merchantKeypairPath);
  const connection = new Connection(cfg.rpc, "confirmed");
  const idl = JSON.parse(
    fs.readFileSync(path.resolve("idl/atlas_forge_svm.json"), "utf8")
  );
  const provider = new AnchorProvider(connection, new Wallet(merchant), {
    commitment: "confirmed",
  });
  const program = new Program(idl, provider);
  const programId = programIdFromEnv();
  const [config] = merchantPda(merchant.publicKey, programId);
  const mint = new PublicKey(cfg.usdcMint);
  const treasuryAta = getAssociatedTokenAddressSync(mint, merchant.publicKey);
  const price = new BN(priceAtomic(cfg.priceUsdc).toString());
  const cap = new BN(priceAtomic(cfg.spendCapUsdc).toString());

  const sig = await program.methods
    .initialize(price, cap, merchant.publicKey)
    .accountsPartial({
      authority: merchant.publicKey,
      config,
      mint,
      treasuryAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(
    JSON.stringify(
      {
        config: config.toBase58(),
        initTx: sig,
        explorer: explorerTx(sig),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
