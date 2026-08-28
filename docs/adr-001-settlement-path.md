# ADR-001 — Settlement path is Path A

Status: **Locked** (Hobie approved 2026-08-27 CT)

## Honesty line

x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

Do not pretend Path B. Do not claim the facilitator will execute a custom program instruction.

## Decision

PATH A.

x402 `exact` on SVM is defined as **exactly one** SPL Token or Token-2022 `TransferChecked` to `ATA(payTo, asset)`. Reference verification:

- Path 1: compute-budget + `TransferChecked` + optional memo / Lighthouse (standard wallets).
- Path 2: smart-wallet allowlist (Squads / Swig / SPL Governance / Metaplex Core / Lighthouse) via simulation of CPI inner instructions.

Path 2 is **not** a merchant program. Atlas Forge is therefore a receipt registry that records access after the facilitator-confirmed transfer, and enforces pause, per-payer window cap, mint, and nonce replay on that record.

## Probe evidence (re-verify on connect; discard if RPC/facilitator disagrees)

Live public Devnet RPC `https://api.devnet.solana.com` (2026-08-28):

- `getHealth` → `ok`
- `getVersion` → `solana-core` `4.3.0-beta.2`
- `getGenesisHash` → `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` (matches CAIP-2 `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`)
- slot ~489207672, epoch 1132
- Circle Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` initialized, decimals 6, mint authority `GrNg1XM2ctzeE2mXxXCfhcTUbejM8Z4z4wNVTy2FjMEz`, freeze authority `CJtyoKSLrktozQzjERTiK3btQtiTK3nN4QrqGHLidyCT`, owner SPL Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`, supply is faucet-minted (not AUM)
- `faucet.solana.com` HTTP 200. Circle faucet https://faucet.circle.com is the documented USDC path.

Live `GET https://x402.org/facilitator/supported` (2026-08-28):

- v2 `exact` on `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` with `extra.feePayer` `CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5` and `features.smartWalletSupported: true`
- v1 `exact` `solana-devnet` same feePayer
- `upto` and `batch-settlement` only on `eip155:84532`
- CDP `/supported` 401 without an account — unused

## Consequences

- `payTo` is the merchant pubkey so `TransferChecked` lands in the treasury ATA.
- `record_settlement` is a merchant instruction after confirmation, not an x402 settlement instruction.
- No mainnet, no Solana Testnet, no upto-on-Solana claims.
