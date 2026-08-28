# x402 probe

Re-run `npx ts-node --transpile-only scripts/00-probe.ts` before locking facilitator kinds. Discard any hypothesis if the connected RPC or facilitator disagrees.

## Commands

```bash
curl -sS https://x402.org/facilitator/supported
curl -sS https://api.devnet.solana.com -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getGenesisHash"}'
```

## Expected (2026-08-28, re-verify)

- Network: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Scheme: `exact` only on Solana
- Asset: Circle Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- feePayer: `CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5`
- `upto` / `batch-settlement`: eip155:84532 only — **not claimed here**

## Honesty line

x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.
