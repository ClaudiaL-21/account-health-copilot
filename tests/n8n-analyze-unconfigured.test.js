// Sprint 03 — n8n Demo Hardening: an analyze webhook URL without the shared
// secret must never result in an external request. Separate file from
// n8n-analyze.test.js on purpose — module-level env is captured once at
// import, so this "no secret" state needs its own process.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

const TEST_ORIGIN = "http://localhost:test-runner";

let requestCount = 0;
const dummyServer = createServer((req, res) => {
  requestCount++;
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ text: "{}" }));
});
const dummyUrl = await new Promise(resolve => {
  dummyServer.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${dummyServer.address().port}`));
});

process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.MOCK_AI = "false";
process.env.AI_PROVIDER = "n8n";
process.env.N8N_ANALYZE_WEBHOOK_URL = dummyUrl;
delete process.env.N8N_WEBHOOK_SECRET; // the condition under test
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;

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

test("analyze webhook URL configured without a secret makes no external request", async () => {
  const { statusCode, body } = await callHandler({ mode: "account-insight", accountId: "ACC-02" });
  assert.equal(statusCode, 503);
  assert.ok(body.error);
  assert.equal(requestCount, 0);
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
