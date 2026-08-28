# PUBLIC_DEVNET_REPORT

Status: **BLOCKED** (program deploy + init + registry deny matrix confirmed; x402 happy-path USDC movement waiting on Circle faucet recaptcha)

x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

This is a Solana **Devnet** rehearsal, not an issuance, not mainnet, not a marketplace. No USD value claims.

## Cluster

- Cluster: `devnet`
- RPC: `https://api.devnet.solana.com`
- WS: `wss://api.devnet.solana.com`
- CAIP-2: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Explorer: https://explorer.solana.com/?cluster=devnet
- No Solana mainnet. No Solana Testnet (`api.testnet.solana.com`). No real SOL value claims. No mainnet USDC.

## Program (confirmed on Devnet)

- Program ID: `CFogKbTTNkDn9kQr6pNtnMDJnqTCTcaF9t5dzYajtVwA`
- Program explorer: https://explorer.solana.com/address/CFogKbTTNkDn9kQr6pNtnMDJnqTCTcaF9t5dzYajtVwA?cluster=devnet
- ProgramData: `39M2ugT5z8ak6QpcpT7jx7uQdiF9j2HWAU7UL6JzhUcY`
- Upgrade authority (operator): `FazWNHnhXtKstcmbsv5wU3mhpAxqmbz3fmLjeKrun5eP`
- Deploy tx (slot 489402466, `getTransaction` err=null): https://explorer.solana.com/tx/1FtSXyMXUGPxSHC44eueQKakcCtrP4h9oSm2eHkK1GP2ZCG5TB2RAsChGEipcNF3AWj9uLSebvwCtxBpjE2odjL?cluster=devnet
- IDL SHA-256: `55d26abcb521e94d199ab2d9079c6f73813f265c70833667eff437dccdc6e431`
- Init tx: https://explorer.solana.com/tx/4URvJ56Kzdi8FVqupT42rhfzmwQprdm27EcwP4kaxyeUzFjzEQzJbNLtc1cf7Y3APKGGzXkm3fKqch6D9m9h5kSn?cluster=devnet
- Merchant config PDA: `5EAQnQDgJYpuYSjFEEMDZNmnnWVpG9HnEyPHwBYkuzPU`
- Mint locked at init: Circle Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (not AFUSDC)

## Circle vs AFUSDC

- Circle Devnet USDC mint is live and is the merchant config mint.
- Payer ATA `FipgLMnqhL6aTujqNT3QD2rwFUE5ZJ3E8B6PfYsuj688` balance is **0**.
- Circle faucet attempts:
  - `POST https://api.circle.com/v1/faucet/drips` → HTTP 401 `malformed authorization. Missing API key`
  - `POST https://faucet.circle.com/api/graphql` `requestToken(blockchain: SOL, token: USDC)` → `ReCAPTCHA verification failed` (`RECAPTCHA_ERROR` / `RECAPTCHA_ASSESSMENT_FAILED`)
- AFUSDC was **not** minted. Substituting a homemade mint would not match the initialized config mint (`has_one = mint`) and must never be labeled USDC.

## Happy path

_No confirmed x402 exact SPL `TransferChecked` signatures. Payer has 0 Circle Devnet USDC. Do not invent explorer URLs._

## Deny evidence (live Devnet, confirmed via `getTransaction`)

| Deny | Code | Signature | Explorer |
|---|---|---|---|
| Unauthorized `set_params` | 6000 | `CUeF7JSA2HneudcBbWP54JCMhiRee8gBs46RGTHsKCrWmioAsQzbSqwgf7wdv6VEnBg8kE2e18ygU41cs6TUxZS` | https://explorer.solana.com/tx/CUeF7JSA2HneudcBbWP54JCMhiRee8gBs46RGTHsKCrWmioAsQzbSqwgf7wdv6VEnBg8kE2e18ygU41cs6TUxZS?cluster=devnet |
| Replay nonce | 6005 | `2jvAzmszNcoDGo1EshJbRT7jLjF9xaW4TjXvTHPEuvXqw3LMi8JuwPXBiMDzuuCAkmXkLHFhQCGjbFuFKRmEiTWS` | https://explorer.solana.com/tx/2jvAzmszNcoDGo1EshJbRT7jLjF9xaW4TjXvTHPEuvXqw3LMi8JuwPXBiMDzuuCAkmXkLHFhQCGjbFuFKRmEiTWS?cluster=devnet |
| Over cap | 6002 | `JbJByWr1PRni7gaMiEVg7G35k5P7WNDdfoJ3wkUxeywP8mkHq1BY1ua322KJvko8bGtVamrFJcVJXpvvrkswp1u` | https://explorer.solana.com/tx/JbJByWr1PRni7gaMiEVg7G35k5P7WNDdfoJ3wkUxeywP8mkHq1BY1ua322KJvko8bGtVamrFJcVJXpvvrkswp1u?cluster=devnet |
| Pause (new receipt) | 6001 | `5Jgf3TmQ5fmZ7uuCfA51BMsniUJxJ8sM4Af47gGT7aarwidpqV7LDpwYKjFv733SSBxaVc9PnTHBRuv7Q29og91i` | https://explorer.solana.com/tx/5Jgf3TmQ5fmZ7uuCfA51BMsniUJxJ8sM4Af47gGT7aarwidpqV7LDpwYKjFv733SSBxaVc9PnTHBRuv7Q29og91i?cluster=devnet |
| HTTP `GET /resource` without `PAYMENT-SIGNATURE` | HTTP 402 exact / `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | n/a | n/a |

Settled receipt under cap (registry record, not x402 settlement): https://explorer.solana.com/tx/53MpjuVKAYM9QLeNcQEUA4dv3shoWTf7xXNS4Z3f6eDbAqetBRtrLCW9as5WWA6yr6ELD6iQwTJ6644B5WbwAxEM?cluster=devnet

Pause tx: https://explorer.solana.com/tx/s3EkEG7H3zQB3NGsJo25uF4tn9teVx1ckKWRXmkE9Ra3e3UKmYupcw69fR65kjZLS3RF1i6QfMtMfprJxdUVJyW?cluster=devnet

Unpause tx: https://explorer.solana.com/tx/2qf6WtPURsWkviFCJYnKVnu7vB8Eu8bEfuX3jyemzt5fpnLEKsRP9fCEaMDg3qUZ6mD4t2ywuoFkXZ6q455ZQZ5B?cluster=devnet

## ATA creates (Circle mint, 0 balance)

- merchant `3jQeuMntsvjMXAwCqy2tic689citb7Bbuxe3EgJ55LJp`: https://explorer.solana.com/tx/4dj9fpNnjQHzQ9q1puTHjsJNNK1TiuTJK3rVSoqW5yKaHZZcVWurddrRoY6QevjXxH5tuHtoywfukYNvB3JrWPd9?cluster=devnet
- payer `FipgLMnqhL6aTujqNT3QD2rwFUE5ZJ3E8B6PfYsuj688`: https://explorer.solana.com/tx/5T7PLjzYirUUukuMfPrAL1eFNtFgwRswNXurxU27EnPxfJZK2bCHsoz2AXxACdpStE2GvLwSiwJWxyPDeu3WA5RJ?cluster=devnet
- unauthorized `2DRnjth2kmJgaFEHr2PThBL4z6PvR8BsRWhip7nHiU64`: https://explorer.solana.com/tx/2YCPugRJ4MUJGZf7byqtpvg4aJusF6SWmD82JuUrpj7BRRzjymj8cWLnx75xhg5q2dGAGgBmG332gU3YFbVsSpV9?cluster=devnet
- operator `ETWUmGTE6tbquYGkBeRqvnBeS34SkU8Q44pCg5rNa39j`: https://explorer.solana.com/tx/2DQrxWxDyvCV4SLY7UyHagKBp3Jsma5rfKW289teiFC2ktfzBpGwwxT3gj6zPcDH5ELK7XDTjsxio5y2fCw2tQi2?cluster=devnet

## Never

- Solana mainnet volume
- Swarm TVL
- upto-on-Solana
- Path B (facilitator executing a custom Atlas instruction)
- Invented explorer URLs
- Homemade mint labeled USDC
