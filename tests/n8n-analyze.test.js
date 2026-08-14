// Sprint 03 — n8n Demo Hardening: analyze-webhook auth header, response
// contract, and timeout handling. Uses a local loopback dummy HTTP server —
// no real n8n, OpenAI, Gmail, or Google Sheets call is ever made.
//
// All relevant env vars are set BEFORE the single dynamic import of
// api/analyze.js below (module-level consts are captured once at import).
// Nothing here reads a real .env, so a developer's local n8n/API credentials
// can never leak into this run.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

const TEST_ORIGIN = "http://localhost:test-runner";
const TEST_SECRET = "test-only-secret-do-not-use";

// Single dummy server for the whole file; each test swaps `currentHandler`
// to control the response for that one call.
let currentHandler = (req, body, res) => { res.writeHead(500); res.end(); };
const dummyServer = createServer((req, res) => {
  let body = "";
  req.on("data", c => { body += c; });
  req.on("end", () => currentHandler(req, body, res));
});
const dummyUrl = await new Promise(resolve => {
  dummyServer.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${dummyServer.address().port}`));
});

process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.MOCK_AI = "false";
process.env.AI_PROVIDER = "n8n";
process.env.N8N_ANALYZE_WEBHOOK_URL = dummyUrl;
process.env.N8N_WEBHOOK_SECRET = TEST_SECRET;
process.env.N8N_ANALYZE_TIMEOUT_MS = "150"; // short on purpose, keeps the timeout test fast
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.N8N_APPROVAL_WEBHOOK_URL;

const { default: handler } = await import("../api/analyze.js");

function callHandler(body) {
  return new Promise((resolve, reject) => {
    const req = { method: "POST", headers: { origin: TEST_ORIGIN }, socket: {}, body };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      setHeader() {},
      json(obj) { resolve({ statusCode: this.statusCode, body: obj }); },
      end() { resolve({ statusCode: this.statusCode, body: null }); },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

const VALID_AI_JSON = JSON.stringify({
  sentiment: { label: "neutral", rationale: "test" },
  narrative: "test narrative",
  nextBestAction: { category: "risk_mitigation", action: "Call the customer.", rationale: "test" },
});

test("analyze webhook call carries the shared secret header", async () => {
  let receivedSecretHeader;
  currentHandler = (req, body, res) => {
    receivedSecretHeader = req.headers["x-cs-ai-hub-secret"];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text: VALID_AI_JSON }));
  };
  const { statusCode } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  assert.equal(statusCode, 200);
  assert.equal(receivedSecretHeader, TEST_SECRET);
});

test("valid n8n response is accepted and parsed through the normal schema", async () => {
  currentHandler = (req, body, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text: VALID_AI_JSON }));
  };
  const { statusCode, body } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  assert.equal(statusCode, 200);
  assert.equal(body.narrative, "test narrative");
  assert.ok(body.confidence?.level, "confidence should still be server-derived (Sprint 01)");
});

test("empty text field is rejected with a controlled error", async () => {
  currentHandler = (req, body, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text: "" }));
  };
  const { statusCode, body } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  assert.equal(statusCode, 502);
  assert.ok(body.error);
});

test("missing text field is rejected with a controlled error", async () => {
  currentHandler = (req, body, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ notText: "oops" }));
  };
  const { statusCode, body } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  assert.equal(statusCode, 502);
  assert.ok(body.error);
});

test("a non-2xx n8n response body is never leaked into the browser response or server logs", async () => {
  const SENSITIVE_MARKER = "SENSITIVE-MARKER-DO-NOT-LEAK-8f3a";
  currentHandler = (req, body, res) => {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`Internal error, debug dump: ${SENSITIVE_MARKER}`);
  };
  const originalConsoleError = console.error;
  const loggedCalls = [];
  console.error = (...args) => { loggedCalls.push(args); };
  let result;
  try {
    result = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(result.statusCode, 502);
  assert.ok(!JSON.stringify(result.body).includes(SENSITIVE_MARKER), "browser response must not contain the n8n response body");
  assert.ok(!JSON.stringify(loggedCalls).includes(SENSITIVE_MARKER), "server logs must not contain the n8n response body");
});

test("malformed JSON body from n8n is rejected, not crashed on", async () => {
  currentHandler = (req, body, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("this is not json");
  };
  const { statusCode } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  assert.equal(statusCode, 502);
});

test("a slow n8n response is aborted at the configured timeout, not left hanging", async () => {
  currentHandler = (req, body, res) => {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ text: VALID_AI_JSON }));
    }, 400); // well beyond the 150ms N8N_ANALYZE_TIMEOUT_MS set above
  };
  const start = Date.now();
  const { statusCode, body } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  const elapsed = Date.now() - start;
  assert.equal(statusCode, 502);
  assert.ok(body.error);
  assert.ok(elapsed < 1000, `expected the 150ms timeout to fire well under 1s, took ${elapsed}ms`);
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
