# PUBLIC_DEVNET_REPORT

Status: **waiting for funding**

x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

Devnet deploy and happy-path USDC movement were not executed. Pubkeys for a funded deploy are published in `deployments/devnet-pubkeys.json`. Waiting for ATLAS to fund those addresses from the operator wallet, then a follow-up will deploy. Local `anchor test --validator legacy` is green (7/7). Do not invent signatures or explorer URLs for a deployment that did not confirm.

## Cluster

- Cluster: `devnet`
- RPC: `https://api.devnet.solana.com`
- WS: `wss://api.devnet.solana.com`
- CAIP-2: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Explorer: https://explorer.solana.com/?cluster=devnet
- No Solana mainnet. No Solana Testnet (`api.testnet.solana.com`). No real SOL value claims. No mainnet USDC.

## Facilitator kinds (live GET https://x402.org/facilitator/supported on 2026-08-28)

```json
[
  {
    "x402Version": 2,
    "scheme": "exact",
    "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    "extra": {
      "feePayer": "CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5",
      "features": { "smartWalletSupported": true }
    }
  },
  {
    "x402Version": 1,
    "scheme": "exact",
    "network": "solana-devnet",
    "extra": {
      "feePayer": "CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5"
    }
  }
]
```

`upto` and `batch-settlement` were present only on `eip155:84532`. This repo does not claim them on Solana. CDP `/supported` is unused (401 without an account).

## Program

- Declared program ID (local keypair, **not deployed**; synced to `keys/program.json` / `target/deploy/atlas_forge_svm-keypair.json`): `CFogKbTTNkDn9kQr6pNtnMDJnqTCTcaF9t5dzYajtVwA`
- Devnet program ID: none (deploy not reached; waiting for funding)
- Published pubkeys: `deployments/devnet-pubkeys.json`
- Init tx: none

## Happy path

No confirmed signatures. Public RPC airdrop failed before ATAs / Circle Devnet USDC / `anchor deploy`.

## Deny evidence (local program + HTTP skeleton)

| # | Deny | Evidence |
|---|---|---|
| 1 | Over cap | `tests/atlas_forge_svm.ts` → `OverCap` |
| 2 | Pause | `tests/atlas_forge_svm.ts` → `Paused`; settled receipt remains `settled: true` |
| 3 | Wrong mint | `tests/atlas_forge_svm.ts` → `WrongMint` / token mint constraint |
| 4 | Replay nonce | `tests/atlas_forge_svm.ts` → `ReplayNonce` |
| 5 | Unauthorized `set_params` | `tests/atlas_forge_svm.ts` → `Unauthorized` / `ConstraintHasOne` |
| 6 | No `PAYMENT-SIGNATURE` | `scripts/06-x402-deny.ts` / `GET /resource` → HTTP 402 (needs SOL-funded merchant to boot the live server) |

## Live probe snapshot (public RPC, 2026-08-28)

- `getHealth` → `ok`
- `solana-core` → `4.3.0-beta.2`
- genesis → `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` (matches CAIP-2 prefix)
- slot ~489212601, epoch 1132
- Circle Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` initialized, decimals 6, owner `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`, mint authority `GrNg1XM2ctzeE2mXxXCfhcTUbejM8Z4z4wNVTy2FjMEz`, freeze authority `CJtyoKSLrktozQzjERTiK3btQtiTK3nN4QrqGHLidyCT` (faucet-minted supply, not AUM)
- `faucet.solana.com` HTTP 200

## Blocked reasons (exact)

Waiting for ATLAS to fund the published addresses in `deployments/devnet-pubkeys.json` from the funded operator wallet `4Dj2J34g2RNXPBNHT5J9bcUUPeiGKGeDfH3X3JzXNsuq`. No `requestAirdrop`, no `solana airdrop`, no `anchor deploy`, and no transactions were sent in this phase.

Prior public-RPC airdrop failures (kept for the record; not retried):

1. `scripts/01-airdrop.ts` / `connection.requestAirdrop`: `airdrop to DvuEDnCHimQwXrJ7uAhz5ybkF9dzcrnDgaBB8SBPWqQP failed: Internal error`
2. `solana airdrop 2 <merchant> --url https://api.devnet.solana.com`: `Error: airdrop request failed. This can happen when the rate limit is reached.`
3. `scripts/02-usdc.ts` (create ATA): `Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.` because merchant/payer have **0 SOL**. Documented USDC path remains https://faucet.circle.com — not attempted; needs SOL first. No fake USDC mint was created.

Keys remain gitignored under `keys/` and `.keys/`. Skeleton + local tests are complete.

## Never

- Solana mainnet volume
- Swarm TVL
- upto-on-Solana
- Path B (facilitator executing a custom Atlas instruction)
- Invented explorer URLs
