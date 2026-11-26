import { describe, expect, it } from "vitest";
import {
  buildRateLimitHeaders,
  extractClientIp,
  SlidingWindowRateLimiter,
} from "@/lib/rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows requests within quota and blocks once limit is reached", () => {
    const limiter = new SlidingWindowRateLimiter({
      limit: 3,
      windowMs: 60_000,
    });

    const t0 = 1_000_000;
    expect(limiter.check("ip-1", t0)).toMatchObject({
      allowed: true,
      remaining: 2,
    });
    expect(limiter.check("ip-1", t0 + 100)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.check("ip-1", t0 + 200)).toMatchObject({
      allowed: true,
      remaining: 0,
    });

    const blocked = limiter.check("ip-1", t0 + 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(59);

    // Different IP stays independent
    expect(limiter.check("ip-2", t0 + 300).allowed).toBe(true);

    // Sliding window frees 1 slot right after t0 expires
    const partialSlide = limiter.check("ip-1", t0 + 60_001);
    expect(partialSlide.allowed).toBe(true);
    expect(partialSlide.remaining).toBe(0);

    // Full window expiry resets remaining quota after 1st request of new window
    const afterFullWindow = limiter.check("ip-1", t0 + 120_300);
    expect(afterFullWindow.allowed).toBe(true);
    expect(afterFullWindow.remaining).toBe(2);
  });

  it("builds standard rate-limit headers including Retry-After when blocked", () => {
    const headers = buildRateLimitHeaders({
      allowed: false,
      limit: 12,
      remaining: 0,
      resetAt: 1_060_000,
      retryAfterSeconds: 45,
    });
    expect(headers["X-RateLimit-Limit"]).toBe("12");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["Retry-After"]).toBe("45");
  });
});

describe("extractClientIp", () => {
  it("extracts first valid IP from x-forwarded-for or x-real-ip", () => {
    const h1 = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(extractClientIp(h1)).toBe("203.0.113.5");

    const h2 = new Headers({ "x-real-ip": "198.51.100.42" });
    expect(extractClientIp(h2)).toBe("198.51.100.42");

    const h3 = new Headers({ "x-forwarded-for": "invalid ip!!" });
    expect(extractClientIp(h3)).toBe("127.0.0.1");
  });
});
