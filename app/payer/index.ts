import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import {
  assertDevnetOnly,
  CIRCLE_DEVNET_USDC,
  HONESTY_LINE,
  loadConfig,
  loadKeypair,
} from "../lib/config";

async function main() {
  const cfg = loadConfig();
  assertDevnetOnly(cfg.cluster, cfg.rpc);
  const payer = loadKeypair(cfg.payerKeypairPath);
  const signer = await createKeyPairSignerFromBytes(payer.secretKey);
  const client = new x402Client();
  client.setSpendControls({
    maxAmountPerPayment: "$1",
    allowedAssets: [
      {
        network: cfg.network,
        asset: cfg.usdcMint || CIRCLE_DEVNET_USDC,
        maxAmountPerPayment: "1000000",
      },
    ],
  });
  client.register(cfg.network, new ExactSvmScheme(signer));
  client.register("solana:*", new ExactSvmScheme(signer));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);
  const url = `${cfg.resourceServerUrl}/resource`;
  console.log(`payer hitting ${url}`);
  console.log(HONESTY_LINE);

  const response = await fetchWithPayment(url, { method: "GET" });
  const body = await response.json();
  const settlement = httpClient.getPaymentSettleResponse?.(
    (name: string) => response.headers.get(name)
  );
  console.log(
    JSON.stringify(
      {
        status: response.status,
        body,
        settlement: settlement ?? null,
      },
      null,
      2
    )
  );
  if (!response.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
