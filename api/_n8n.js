// Shared n8n webhook client for Sprint 03 — Demo Hardening.
//
// Both api/analyze.js and api/approve-action.js call out to n8n, and both
// must attach the same shared-secret header, enforce a timeout, and never
// leak a response body from an external workflow. Centralizing it here means
// none of that can be forgotten in one call site and kept in the other.
//
// The secret is read once at module load and never logged, never included in
// thrown error messages, and never returned to the browser.

const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export function hasWebhookSecret() {
  return Boolean(N8N_WEBHOOK_SECRET);
}

// Co-PO review, round 1 — Point 3, round 2 — Point 2: only a finite,
// reasonably-bounded, whole-millisecond timeout is ever used. A misconfigured
// value (negative, NaN, Infinity, an absurdly large number from a typo, or a
// value so small the call could never realistically complete) must not
// disable the timeout or let a hung request block the app indefinitely; it
// falls back to a safe default instead. MIN_WEBHOOK_TIMEOUT_MS is set below
// the 150ms value used by this project's own tests so local test timeouts
// keep working, while still ruling out clearly-unusable values like 1ms.
// Values above the minimum are rounded to whole milliseconds and capped at
// MAX_WEBHOOK_TIMEOUT_MS.
export const DEFAULT_ANALYZE_TIMEOUT_MS = 25000;
export const DEFAULT_APPROVAL_TIMEOUT_MS = 8000;
export const MIN_WEBHOOK_TIMEOUT_MS = 50;
export const MAX_WEBHOOK_TIMEOUT_MS = 60000;

export function resolveTimeoutMs(envValue, defaultMs) {
  const n = Number(envValue);
  if (!Number.isFinite(n) || n < MIN_WEBHOOK_TIMEOUT_MS) return defaultMs;
  return Math.min(Math.round(n), MAX_WEBHOOK_TIMEOUT_MS);
}

// Attaches the shared-secret header and enforces `timeoutMs` via AbortController.
// Resolves with the Response only on a 2xx status. On timeout, network failure,
// or a non-2xx status, throws a plain Error built from a fixed, generic
// message and (for non-2xx) the status code only — the response body from an
// external, untrusted workflow is never read into an error message or a log.
export async function callN8nWebhook(url, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cs-ai-hub-secret": N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("n8n webhook timed out");
    }
    throw new Error("n8n webhook request failed");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`n8n webhook returned a non-success status (${res.status})`);
  }
  return res;
}
