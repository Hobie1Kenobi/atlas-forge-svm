import {
  createAssociatedTokenAccountIdempotent,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  CIRCLE_DEVNET_USDC,
  connectionFrom,
  loadConfig,
  loadKeypair,
} from "../app/lib/config";

async function main() {
  const cfg = loadConfig();
  const connection = connectionFrom(cfg);
  const mint = new PublicKey(cfg.usdcMint);
  if (mint.toBase58() !== CIRCLE_DEVNET_USDC) {
    console.log(
      `WARNING: USDC_MINT is not Circle Devnet USDC. Label it AFUSDC — never USDC.`
    );
  }

  const mintInfo = await connection.getParsedAccountInfo(mint);
  if (!mintInfo.value) {
    throw new Error(`mint ${mint.toBase58()} missing on ${cfg.cluster}`);
  }
  const owner = mintInfo.value.owner.toBase58();
  if (owner !== TOKEN_PROGRAM_ID.toBase58()) {
    throw new Error(`mint owner ${owner} is not SPL Token Tokenkeg`);
  }

  const merchant = loadKeypair(cfg.merchantKeypairPath);
  const payer = loadKeypair(cfg.payerKeypairPath);
  const merchantAta = await createAssociatedTokenAccountIdempotent(
    connection,
    merchant,
    mint,
    merchant.publicKey
  );
  const payerAta = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  const merchantAcc = await getAccount(connection, merchantAta);
  const payerAcc = await getAccount(connection, payerAta);
  console.log(
    JSON.stringify(
      {
        mint: mint.toBase58(),
        merchantAta: merchantAta.toBase58(),
        payerAta: payerAta.toBase58(),
        merchantAtaAmount: merchantAcc.amount.toString(),
        payerAtaAmount: payerAcc.amount.toString(),
        circleFaucet: "https://faucet.circle.com",
        note:
          payerAcc.amount === 0n
            ? "payer ATA empty; fund via Circle Devnet USDC faucet. Do not mint a fake USDC."
            : "payer has Devnet USDC",
      },
      null,
      2
    )
  );
  if (payerAcc.amount === 0n) {
    process.exit(3);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
