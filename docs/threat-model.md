# Threat model

Honesty line: x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

## Facilitator is not trustless

`https://x402.org/facilitator` sponsors fees as `feePayer` `CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5`. It can refuse, delay, or (in a facilitator bug) report settle success incorrectly. Merchants must still check the confirmed `TransferChecked` on Devnet before treating access as paid. This rehearsal does not make the facilitator a trusted enclave.

## Issuer / merchant authority can pause and cap

`MerchantConfig.authority` can `pause`, `unpause`, and `set_params` (price, cap, treasury). A paused merchant rejects **new** `record_settlement` calls. Already-settled receipts stay settled — pause is not a trapdoor on paid access records. Caps are per payer per `WINDOW_SLOTS` (432000 slots, ~one Devnet epoch).

The mint authority of Circle Devnet USDC (`GrNg1XM2ctzeE2mXxXCfhcTUbejM8Z4z4wNVTy2FjMEz`) and freeze authority (`CJtyoKSLrktozQzjERTiK3btQtiTK3nN4QrqGHLidyCT`) can mint or freeze Devnet USDC. That is faucet-minted test supply, not AUM.

## Replay

Receipt PDAs are keyed by `(config, payer, nonce)`. A settled receipt cannot be settled again (`ReplayNonce`). HTTP settlement cache (120s) mitigates duplicate `/settle` races where Solana dedupes the transfer but a naive server would grant twice.

## Duplicate settle race

The SVM exact spec documents a race: two `/settle` calls on the same partially-signed tx can both see RPC success while only one transfer lands. This server reserves an in-memory cache key from the payment transaction **before** calling `/settle` and returns `duplicate_settlement` on the loser.

## Out of scope

- Solana mainnet
- Real USDC / real SOL value
- Smart-wallet Path 2 as a merchant program
- Facilitator compromise making Atlas transfer merchant funds (Path A never gives the program custody of the USDC)
