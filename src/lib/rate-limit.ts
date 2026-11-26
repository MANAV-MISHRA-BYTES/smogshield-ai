/**
 * In-memory sliding-window IP rate limiter for AI endpoints.
 */

export interface RateLimitConfig {
  /** Maximum requests allowed within the time window. */
  limit: number;
  /** Time window duration in milliseconds. */
  windowMs: number;
  /** Upper bound on tracked IP buckets to prevent memory exhaustion. */
  maxEntries?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface BucketEntry {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, BucketEntry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(config: RateLimitConfig) {
    this.limit = config.limit;
    this.windowMs = config.windowMs;
    this.maxEntries = config.maxEntries ?? 2000;
  }

  /**
   * Evaluates and records a request against the client's sliding window.
   *
   * @param key - Normalized client IP or compound route:ip identifier.
   * @param now - Optional timestamp override for deterministic testing.
   * @returns Rate limit decision and quota metadata.
   */
  public check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const existing = this.buckets.get(key);
    const activeTimestamps = (existing?.timestamps ?? []).filter(
      (ts) => ts > windowStart,
    );

    if (activeTimestamps.length >= this.limit) {
      const oldest = activeTimestamps[0] ?? now;
      const resetAt = oldest + this.windowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetAt - now) / 1000),
      );
      this.buckets.set(key, { timestamps: activeTimestamps });
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds,
      };
    }

    activeTimestamps.push(now);
    this.buckets.set(key, { timestamps: activeTimestamps });

    if (this.buckets.size > this.maxEntries) {
      this.prune(windowStart);
    }

    const oldest = activeTimestamps[0] ?? now;
    return {
      allowed: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - activeTimestamps.length),
      resetAt: oldest + this.windowMs,
      retryAfterSeconds: 0,
    };
  }

  /** Removes expired buckets to keep memory bounded. */
  public prune(windowStart: number): void {
    for (const [key, entry] of this.buckets.entries()) {
      const fresh = entry.timestamps.filter((ts) => ts > windowStart);
      if (fresh.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, { timestamps: fresh });
      }
    }
  }

  /** Clears all rate limit state (intended for unit tests). */
  public reset(): void {
    this.buckets.clear();
  }
}

/**
 * Extracts a normalized client IP address from standard proxy headers.
 *
 * @param headers - Request Headers object.
 * @returns Normalized client IP string.
 */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && /^[a-zA-Z0-9.:-]+$/.test(first)) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && /^[a-zA-Z0-9.:-]+$/.test(realIp)) {
    return realIp;
  }

  return "127.0.0.1";
}

/**
 * Builds standard HTTP rate-limit response headers.
 */
export function buildRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

/** Shared limiter for /api/plan (12 requests / minute / IP). */
export const planRateLimiter = new SlidingWindowRateLimiter({
  limit: 12,
  windowMs: 60_000,
});

/** Shared limiter for /api/chat (25 requests / minute / IP). */
export const chatRateLimiter = new SlidingWindowRateLimiter({
  limit: 25,
  windowMs: 60_000,
});
