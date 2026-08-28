# Proof index

Honesty line: x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

| Reader | Start here | What “done” looks like |
|---|---|---|
| Solana / Anchor engineer | `programs/atlas_forge_svm` + `tests/atlas_forge_svm.ts` | Local `anchor test`: initialize; pay under cap; over cap fails; pause fails; wrong mint fails; replay fails; unauthorized `set_params` fails |
| x402 / agent payments | `app/server`, `app/payer`, `scripts/06-x402-deny.ts` | 402 without `PAYMENT-SIGNATURE`; verify fail on garbage payload; deny matrix ≥ 4 with HTTP and/or program evidence |
| Full-stack SVM | `scripts/03-deploy.ts` … `08-write-evidence.ts`, `PUBLIC_DEVNET_REPORT.md` | Confirmed program id + IDL hash + init tx + receipt account, **or** honest BLOCKED with the exact faucet/RPC error |

Explorer links (only after confirmed signatures):

- `https://explorer.solana.com/tx/<SIG>?cluster=devnet`
- `https://explorer.solana.com/address/<PROGRAM>?cluster=devnet`
