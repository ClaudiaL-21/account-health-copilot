// Development Day 2 hardening — explicit ENABLE_EXTERNAL_ACTIONS=false must
// behave identically to it being unset, not be mistaken for a truthy string.
// Separate file/process from external-actions-disabled.test.js on purpose —
// module-level env is captured once at import (see other n8n-*.test.js files
// in this directory for the same reasoning).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

const TEST_ORIGIN = "http://localhost:test-runner";

let requestCount = 0;
const dummyServer = createServer((req, res) => {
  requestCount++;
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "sent", workflowConnected: true }));
});
const dummyUrl = await new Promise(resolve => {
  dummyServer.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${dummyServer.address().port}`));
});

process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.N8N_APPROVAL_WEBHOOK_URL = dummyUrl;
process.env.N8N_WEBHOOK_SECRET = "test-only-secret-do-not-use";
process.env.ENABLE_EXTERNAL_ACTIONS = "false"; // the condition under test

const { default: handler, EXTERNAL_ACTIONS_ENABLED } = await import("../api/approve-action.js");

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

test("EXTERNAL_ACTIONS_ENABLED is false for the literal string \"false\"", () => {
  assert.equal(EXTERNAL_ACTIONS_ENABLED, false);
});

test("ENABLE_EXTERNAL_ACTIONS=false blocks the real call just like unset does", async () => {
  const { statusCode, body } = await callHandler({
    accountId: "ACC-01", action: "Call the customer.", category: "risk_mitigation", rationale: "x",
  });
  assert.equal(statusCode, 200);
  assert.deepEqual(body, { status: "logged", workflowConnected: false });
  assert.equal(requestCount, 0);
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
