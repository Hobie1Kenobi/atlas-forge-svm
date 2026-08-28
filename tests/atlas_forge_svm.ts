import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import { AtlasForgeSvm } from "../target/types/atlas_forge_svm";
import {
  createMint,
  createAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

const MERCHANT_SEED = Buffer.from("merchant");
const RECEIPT_SEED = Buffer.from("receipt");
const WINDOW_SEED = Buffer.from("window");
const PRICE = new BN(10_000); // 0.01 with 6 decimals
const CAP = new BN(10_000); // one payment per window
const RESOURCE = Buffer.alloc(32, 7);

function u64Le(n: BN): Buffer {
  return n.toArrayLike(Buffer, "le", 8);
}

function merchantPda(authority: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [MERCHANT_SEED, authority.toBuffer()],
    programId
  )[0];
}

function receiptPda(
  config: PublicKey,
  payer: PublicKey,
  nonce: BN,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_SEED, config.toBuffer(), payer.toBuffer(), u64Le(nonce)],
    programId
  )[0];
}

function windowPda(
  config: PublicKey,
  payer: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [WINDOW_SEED, config.toBuffer(), payer.toBuffer()],
    programId
  )[0];
}

function errCode(e: unknown): string {
  const anyErr = e as {
    error?: { errorCode?: { code?: string } };
    logs?: string[];
  };
  if (anyErr?.error?.errorCode?.code) return anyErr.error.errorCode.code;
  const text = String(e);
  for (const code of [
    "Unauthorized",
    "Paused",
    "OverCap",
    "Underpay",
    "WrongMint",
    "ReplayNonce",
    "ConstraintHasOne",
    "ConstraintTokenMint",
    "ConstraintTokenOwner",
  ]) {
    if (text.includes(code)) return code;
  }
  return text;
}

describe("atlas_forge_svm", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.atlasForgeSvm as Program<AtlasForgeSvm>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  let mint: PublicKey;
  let wrongMint: PublicKey;
  let treasuryAta: PublicKey;
  let payer: Keypair;
  let payerAta: PublicKey;
  let wrongPayerAta: PublicKey;
  let config: PublicKey;
  const unauthorized = Keypair.generate();

  async function record(params: {
    amount: BN;
    nonce: BN;
    payerKp?: Keypair;
    payerAta?: PublicKey;
    mint?: PublicKey;
    treasuryAta?: PublicKey;
    authorityKp?: Keypair;
  }) {
    const payerKp = params.payerKp ?? payer;
    const usedMint = params.mint ?? mint;
    const usedTreasury = params.treasuryAta ?? treasuryAta;
    const usedPayerAta = params.payerAta ?? payerAta;
    const auth = params.authorityKp ?? authority;
    const receipt = receiptPda(config, payerKp.publicKey, params.nonce, program.programId);
    const spend = windowPda(config, payerKp.publicKey, program.programId);
    return program.methods
      .recordSettlement(params.amount, Array.from(RESOURCE) as number[], params.nonce)
      .accountsPartial({
        authority: auth.publicKey,
        config,
        mint: usedMint,
        treasury: authority.publicKey,
        treasuryAta: usedTreasury,
        payer: payerKp.publicKey,
        payerAta: usedPayerAta,
        receipt,
        payerSpend: spend,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers(auth === authority ? [] : [auth])
      .rpc();
  }

  before(async () => {
    payer = Keypair.generate();
    const sig = await connection.requestAirdrop(payer.publicKey, 2_000_000_000);
    await connection.confirmTransaction(sig, "confirmed");
    const unauthAirdrop = await connection.requestAirdrop(
      unauthorized.publicKey,
      1_000_000_000
    );
    await connection.confirmTransaction(unauthAirdrop, "confirmed");

    mint = await createMint(connection, authority, authority.publicKey, null, 6);
    wrongMint = await createMint(connection, authority, authority.publicKey, null, 6);
    treasuryAta = await createAccount(
      connection,
      authority,
      mint,
      authority.publicKey
    );
    payerAta = await createAccount(connection, authority, mint, payer.publicKey);
    wrongPayerAta = await createAccount(
      connection,
      authority,
      wrongMint,
      payer.publicKey
    );
    config = merchantPda(authority.publicKey, program.programId);
  });

  it("initialize", async () => {
    await program.methods
      .initialize(PRICE, CAP, authority.publicKey)
      .accountsPartial({
        authority: authority.publicKey,
        config,
        mint,
        treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const cfg = await program.account.merchantConfig.fetch(config);
    expect(cfg.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(cfg.treasury.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(cfg.mint.toBase58()).to.equal(mint.toBase58());
    expect(cfg.priceAtomic.toString()).to.equal(PRICE.toString());
    expect(cfg.spendCapPerPayerWindow.toString()).to.equal(CAP.toString());
    expect(cfg.paused).to.equal(false);
  });

  it("pay under cap", async () => {
    const nonce = new BN(1);
    await record({ amount: PRICE, nonce });
    const receipt = receiptPda(config, payer.publicKey, nonce, program.programId);
    const rec = await program.account.receipt.fetch(receipt);
    expect(rec.settled).to.equal(true);
    expect(rec.amount.toString()).to.equal(PRICE.toString());
    expect(rec.payer.toBase58()).to.equal(payer.publicKey.toBase58());
    const spend = await program.account.payerSpend.fetch(
      windowPda(config, payer.publicKey, program.programId)
    );
    expect(spend.spent.toString()).to.equal(PRICE.toString());
  });

  it("pay over cap fails", async () => {
    try {
      await record({ amount: PRICE, nonce: new BN(2) });
      expect.fail("expected OverCap");
    } catch (e) {
      expect(errCode(e)).to.equal("OverCap");
    }
  });

  it("pause fails new receipts and does not trap settled ones", async () => {
    const settled = await program.account.receipt.fetch(
      receiptPda(config, payer.publicKey, new BN(1), program.programId)
    );
    expect(settled.settled).to.equal(true);

    await program.methods
      .pause()
      .accountsPartial({
        authority: authority.publicKey,
        config,
      })
      .rpc();

    try {
      await record({ amount: PRICE, nonce: new BN(3) });
      expect.fail("expected Paused");
    } catch (e) {
      expect(errCode(e)).to.equal("Paused");
    }

    const still = await program.account.receipt.fetch(
      receiptPda(config, payer.publicKey, new BN(1), program.programId)
    );
    expect(still.settled).to.equal(true);

    await program.methods
      .unpause()
      .accountsPartial({
        authority: authority.publicKey,
        config,
      })
      .rpc();

    await program.methods
      .setParams(PRICE, new BN(1_000_000), authority.publicKey)
      .accountsPartial({
        authority: authority.publicKey,
        config,
        mint,
        treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  it("wrong mint fails", async () => {
    const wrongTreasury = await createAccount(
      connection,
      authority,
      wrongMint,
      authority.publicKey
    );
    try {
      await record({
        amount: PRICE,
        nonce: new BN(4),
        mint: wrongMint,
        treasuryAta: wrongTreasury,
        payerAta: wrongPayerAta,
      });
      expect.fail("expected WrongMint");
    } catch (e) {
      const code = errCode(e);
      expect(["WrongMint", "ConstraintHasOne", "ConstraintTokenMint"]).to.include(
        code
      );
    }
  });

  it("replay fails", async () => {
    const nonce = new BN(5);
    await record({ amount: PRICE, nonce });
    try {
      await record({ amount: PRICE, nonce });
      expect.fail("expected ReplayNonce");
    } catch (e) {
      expect(errCode(e)).to.equal("ReplayNonce");
    }
  });

  it("unauthorized set_params fails", async () => {
    try {
      await program.methods
        .setParams(PRICE, CAP, authority.publicKey)
        .accountsPartial({
          authority: unauthorized.publicKey,
          config,
          mint,
          treasuryAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorized])
        .rpc();
      expect.fail("expected Unauthorized");
    } catch (e) {
      const code = errCode(e);
      expect(["Unauthorized", "ConstraintHasOne"]).to.include(code);
    }
  });
});
