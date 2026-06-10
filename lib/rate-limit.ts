// Lightweight in-memory fixed-window rate limiter. Per serverless instance —
// not a distributed limiter, but enough to blunt spam/abuse on public routes.
// For stricter global limits, back this with Upstash/Redis later.

const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function clientIp(req: Request): string {
  // Vercel appends the real client IP as the rightmost entry in x-forwarded-for.
  // Never trust the leftmost entry — it can be spoofed by the client.
  // x-vercel-proxied-for is set by Vercel's edge and is not forgeable.
  const vercelIp = req.headers.get("x-vercel-proxied-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",").at(-1)!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Opportunistically drop old entries so the map can't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, 5 * 60 * 1000).unref?.();
}
