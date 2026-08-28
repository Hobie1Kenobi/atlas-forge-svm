import {
  CIRCLE_DEVNET_USDC,
  HONESTY_LINE,
  TOKEN_PROGRAM,
  X402_NETWORK,
} from "./lib/config";

export async function probeFacilitator(url: string) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/supported`);
  const body = await res.json();
  return { status: res.status, body };
}

export async function probeRpc(rpc: string) {
  const call = async (method: string, params: unknown[] = []) => {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    return res.json();
  };
  const [health, version, genesis, slot, epoch, mint] = await Promise.all([
    call("getHealth"),
    call("getVersion"),
    call("getGenesisHash"),
    call("getSlot"),
    call("getEpochInfo"),
    call("getAccountInfo", [
      CIRCLE_DEVNET_USDC,
      { encoding: "jsonParsed" },
    ]),
  ]);
  return { health, version, genesis, slot, epoch, mint };
}

export function summarizeProbe(rpc: Awaited<ReturnType<typeof probeRpc>>, fac: Awaited<ReturnType<typeof probeFacilitator>>) {
  const kinds = (fac.body as { kinds?: Array<Record<string, unknown>> }).kinds ?? [];
  const svmExact = kinds.filter(
    (k) =>
      k.scheme === "exact" &&
      (k.network === X402_NETWORK || k.network === "solana-devnet")
  );
  const uptoOnSolana = kinds.filter(
    (k) => k.scheme === "upto" && String(k.network).startsWith("solana")
  );
  return {
    honesty: HONESTY_LINE,
    genesis: (rpc.genesis as { result?: string }).result,
    genesisMatchesCaip2: String(
      (rpc.genesis as { result?: string }).result ?? ""
    ).startsWith("EtWTRABZaYq6iMfeYKouRu166VU2xqa1"),
    solanaCore: (rpc.version as { result?: { "solana-core"?: string } }).result?.[
      "solana-core"
    ],
    health: (rpc.health as { result?: string }).result,
    slot: (rpc.slot as { result?: number }).result,
    epoch: (rpc.epoch as { result?: { epoch?: number } }).result?.epoch,
    usdcMint: CIRCLE_DEVNET_USDC,
    usdcOwner: (
      rpc.mint as {
        result?: { value?: { owner?: string } };
      }
    ).result?.value?.owner,
    usdcDecimals: (
      rpc.mint as {
        result?: {
          value?: { data?: { parsed?: { info?: { decimals?: number } } } };
        };
      }
    ).result?.value?.data?.parsed?.info?.decimals,
    tokenProgramExpected: TOKEN_PROGRAM,
    facilitatorSvmExact: svmExact,
    uptoOnSolana,
    claimUptoOnSolana: false,
  };
}

if (require.main === module) {
  (async () => {
    const rpc = await probeRpc("https://api.devnet.solana.com");
    const fac = await probeFacilitator("https://x402.org/facilitator");
    console.log(JSON.stringify(summarizeProbe(rpc, fac), null, 2));
  })().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
