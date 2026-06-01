// In-memory rate limiter — suitable for single-instance deployments.
// For multi-region, replace with Supabase or Vercel KV.

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

interface RateLimitResult {
  allowed: boolean;
  attemptsLeft: number;
  retryAfterMinutes: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, attemptsLeft: maxAttempts - 1, retryAfterMinutes: 0 };
  }

  if (record.count >= maxAttempts) {
    const minutes = Math.ceil((record.resetAt - now) / 60_000);
    return { allowed: false, attemptsLeft: 0, retryAfterMinutes: minutes };
  }

  record.count += 1;
  return {
    allowed: true,
    attemptsLeft: maxAttempts - record.count,
    retryAfterMinutes: 0,
  };
}
