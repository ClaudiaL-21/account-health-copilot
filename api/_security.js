// Shared origin-allowlist + naive in-memory rate limiter for the serverless
// API endpoints. Extracted so /api/analyze.js and /api/approve-action.js
// can't drift out of sync on a security-relevant check.
//
// Resets on cold start and isn't shared across concurrent instances — good
// enough to deter casual abuse of a public demo endpoint; a real production
// deployment would back this with Upstash/Vercel KV instead.

const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

export function checkRateLimit(key) {
  const now = Date.now();
  const timestamps = (hits.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}

export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
}

// Runs the shared origin+CORS+rate-limit gate. Returns true if the request
// should continue; already wrote a response and returns false if not.
export function applyGate(req, res) {
  const origin = req.headers.origin || "";
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.includes(origin);

  if (req.method === "OPTIONS") {
    if (isAllowed) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return false;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  if (!isAllowed) {
    res.status(403).json({ error: "Origin not allowed" });
    return false;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);

  if (!checkRateLimit(getClientIp(req))) {
    res.status(429).json({ error: "Rate limit exceeded, please try again in a minute." });
    return false;
  }
  return true;
}
