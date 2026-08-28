# Case study — receipt registry vs fake settlement target

Honesty line: x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

## Why not Path B

The live SVM exact spec (and the 2026-08-28 facilitator `/supported` document) verifies **exactly one** `TransferChecked` to `ATA(payTo, asset)`. Path 1 is a static layout of compute-budget + transfer + optional memo/Lighthouse. Path 2 is an allowlist of **wallet** programs (Squads, Swig, Governance, Metaplex, Lighthouse), not a merchant registry.

If this repo declared Atlas as the 402 settlement target, the public facilitator would have to execute a custom instruction it does not list as a supported kind. That would be a lie.

## What a receipt registry is for

After the facilitator lands USDC in the merchant ATA, the merchant still needs:

- a pause switch that does not unwind settled access records
- a per-payer window cap so one funded wallet cannot drain the resource
- mint checks so a lookalike token cannot be recorded as USDC
- nonce replay protection so one payment cannot mint two receipts
- a deterministic paid payload (slot hash + signed receipt) that is **not** a swarm marketplace API wrapper

Those are money/access **policy**, recorded on-chain, without pretending the program is where settlement happens.

## What this is not

Not a marketplace. Not mainnet volume. Not swarm TVL. Not upto-on-Solana. Not an EVM port.
