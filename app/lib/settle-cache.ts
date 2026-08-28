/**
 * In-memory duplicate /settle cache (x402 SVM spec, ~2x blockhash lifetime).
 * Keyed by the base64 payment transaction string. Never stores key material.
 */
export class SettlementCache {
  private readonly ttlMs: number;
  private readonly seen = new Map<string, number>();

  constructor(ttlMs = 120_000) {
    this.ttlMs = ttlMs;
  }

  private gc(now: number): void {
    for (const [k, t] of this.seen) {
      if (now - t > this.ttlMs) this.seen.delete(k);
    }
  }

  reserve(key: string): boolean {
    const now = Date.now();
    this.gc(now);
    if (this.seen.has(key)) return false;
    this.seen.set(key, now);
    return true;
  }

  has(key: string): boolean {
    this.gc(Date.now());
    return this.seen.has(key);
  }
}

export function paymentCacheKey(payload: unknown): string {
  try {
    const rec = payload as { payload?: { transaction?: string } };
    if (rec?.payload?.transaction) return rec.payload.transaction;
  } catch {
    /* fall through */
  }
  return JSON.stringify(payload);
}
