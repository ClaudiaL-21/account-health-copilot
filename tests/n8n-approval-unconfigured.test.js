// Sprint 03 — n8n Demo Hardening: an approval webhook URL without the shared
// secret must never result in an external request (distinct from the "no URL
// at all" local-logging fallback, which tests/human-review.test.js already
// covers and which remains unchanged). Separate file/process on purpose —
// module-level env is captured once at import.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

const TEST_ORIGIN = "http://localhost:test-runner";

let requestCount = 0;
const dummyServer = createServer((req, res) => {
  requestCount++;
  res.writeHead(200);
  res.end();
});
const dummyUrl = await new Promise(resolve => {
  dummyServer.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${dummyServer.address().port}`));
});

process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.N8N_APPROVAL_WEBHOOK_URL = dummyUrl;
delete process.env.N8N_WEBHOOK_SECRET; // the condition under test

const { default: handler } = await import("../api/approve-action.js");

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

test("approval webhook URL configured without a secret makes no external request", async () => {
  const { statusCode, body } = await callHandler({
    accountId: ACCOUNTS[0].accountId, action: "Call the customer.", category: "risk_mitigation", rationale: "x",
  });
  assert.equal(statusCode, 503);
  assert.ok(body.error);
  assert.equal(requestCount, 0);
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
