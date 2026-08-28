# atlas-forge-svm

Anchor receipt registry + x402 **exact** SPL TransferChecked on **Solana Devnet**. Atlas Forge P4.

**Honesty line:** x402 on this repo is exact SPL TransferChecked to the merchant ATA. The Anchor program is a cap/pause/replay receipt registry, not the settlement target.

This is not Hobie's agentic swarm marketplace, not a Virtuals launchpad, not an agent token, and not an EVM port of atlas-forge-vault / RWA / XRPL product logic.

Suggested GitHub topics: `solana`, `anchor`, `x402`, `devnet`, `spl-token`.

## 8-minute audit

### What the program enforces

`MerchantConfig` (PDA) stores authority, treasury (USDC ATA owner / `payTo`), `price_atomic` (6 decimals), `spend_cap_per_payer_window`, `paused`, bump.

`record_settlement` is merchant-signed **after** the x402 facilitator confirms an SPL `TransferChecked`. It rejects paused merchants, underpay, wrong mint, replayed nonce, and spend over the per-payer window cap. Pause does not mutate already-settled receipts.

The program does **not** take USDC. The facilitator does **not** execute a custom Atlas instruction. That is Path A, locked 2026-08-27 CT.

### Path A vs Path B

| | Path A (this repo) | Path B (rejected) |
|---|---|---|
| Settlement target | Merchant ATA via SPL `TransferChecked` | Custom program instruction |
| Facilitator | Signs as `feePayer` on a Path-1 compute-budget + `TransferChecked` + memo tx (or Path-2 smart-wallet allowlist) | Would CPI into Atlas — **do not claim this** |
| Atlas program | Cap / pause / replay receipt registry | Pretend it is the 402 settlement target |

### Cluster (Devnet only)

- RPC `https://api.devnet.solana.com` (fallback Helius/QuickNode/Alchemy **Devnet** if public RPC rate-limits)
- WS `wss://api.devnet.solana.com`
- CAIP-2 `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Explorer https://explorer.solana.com/?cluster=devnet
- **No Solana mainnet. No Solana Testnet (`api.testnet.solana.com`). No real SOL value claims. No real (mainnet) USDC.**
- USDC mint **must** be Circle Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals, SPL Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`). If that mint is unusable, label a custom mint **AFUSDC** — never USDC.

### x402

- Scheme **exact** only. Facilitator `https://x402.org/facilitator`.
- Live GET `/supported` (re-probe before locking): v2 exact on `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` with `extra.feePayer` `CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5` and `features.smartWalletSupported: true`; also v1 exact `solana-devnet` same feePayer.
- `upto` and `batch-settlement` exist on `eip155:84532` only — this repo does not claim them on Solana.
- CDP `/supported` is 401 without an account; do not use CDP for this rehearsal.

Paid resource: hash of last N slots + a merchant-signed receipt. **Not** a wrapper around a swarm marketplace API.

### Toolchain pins

| Tool | Version |
|---|---|
| rustc | 1.89.0 (Anchor 1.1.2 MSRV) |
| solana-cli | 3.1.10 |
| anchor-cli / anchor-lang / anchor-spl | 1.1.2 LTS |
| Node.js | 22.x |
| TypeScript | 5.8+ |

Anchor 2.x is not used.

### Probe / airdrop / deploy / pay

```bash
cp .env.example .env
# generate gitignored keypairs (never commit keys/, .keys/, or .env)
mkdir -p keys .keys target/deploy
solana-keygen new --no-bip39-passphrase -o keys/operator.json
solana-keygen new --no-bip39-passphrase -o keys/merchant.json
solana-keygen new --no-bip39-passphrase -o keys/payer.json
solana-keygen new --no-bip39-passphrase -o keys/unauthorized.json
solana-keygen new --no-bip39-passphrase -o keys/program.json
solana-keygen new --no-bip39-passphrase -o target/deploy/atlas_forge_svm-keypair.json
anchor keys sync   # if the program pubkey differs from declare_id!

npm install
anchor test --validator legacy        # local validator: initialize, cap, pause, wrong mint, replay, unauthorized
npx ts-node --transpile-only scripts/00-probe.ts
npx ts-node --transpile-only scripts/01-airdrop.ts
npx ts-node --transpile-only scripts/02-usdc.ts   # Circle faucet https://faucet.circle.com if empty
npx ts-node --transpile-only scripts/03-deploy.ts
npx ts-node --transpile-only scripts/04-init.ts
npx ts-node --transpile-only scripts/05-x402-happy.ts
npx ts-node --transpile-only scripts/06-x402-deny.ts
npx ts-node --transpile-only scripts/08-write-evidence.ts
```

If airdrop or the USDC faucet blocks you: keep keys gitignored, leave `PUBLIC_DEVNET_REPORT.md` **BLOCKED** with the exact error, and keep the local skeleton + `anchor test`.

### HTTP surface

- `GET /health`
- `GET /resource` → 402 `paymentRequirements` (network CAIP-2, scheme exact, asset = Devnet USDC, `payTo` = merchant pubkey, `extra.feePayer` from `/supported`). Retry with `PAYMENT-SIGNATURE` → facilitator verify → settle → merchant `record_settlement` → 200 JSON + receipt PDA.
- `GET /receipt/:payer` or `GET /receipt/:sig`

Payer client: max-amount guard + settlement cache for duplicate `/settle` races.

## License

MIT © 2026 Hobie Cunningham
