import "server-only";
import { AppError } from "./errors";

/**
 * Rate limiting.
 *
 * The default store is in-memory (per server instance) which is adequate for a
 * single node. For multi-instance deployments implement `RateLimitStore` on top
 * of Redis/Upstash (INCR + PEXPIRE) and register it with `setRateLimitStore`.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 10_000) this.sweep(now);
      return fresh;
    }
    b.count++;
    return b;
  }
  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}

const g = globalThis as unknown as { __rateStore?: RateLimitStore };
let store: RateLimitStore = (g.__rateStore ??= new MemoryStore());

export function setRateLimitStore(s: RateLimitStore) {
  store = s;
  g.__rateStore = s;
}

export const LIMITS = {
  signIn: { limit: 10, windowMs: 15 * 60_000 },
  signUp: { limit: 5, windowMs: 60 * 60_000 },
  ai: { limit: 30, windowMs: 60 * 60_000 },
  upload: { limit: 60, windowMs: 60 * 60_000 },
  api: { limit: 300, windowMs: 60_000 },
  export: { limit: 5, windowMs: 60 * 60_000 },
} as const;

export async function rateLimit(bucket: keyof typeof LIMITS, key: string) {
  const { limit, windowMs } = LIMITS[bucket];
  const { count, resetAt } = await store.hit(`${bucket}:${key}`, windowMs);
  if (count > limit) {
    const mins = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
    throw new AppError(
      "RATE_LIMITED",
      `Too many attempts. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    );
  }
}
