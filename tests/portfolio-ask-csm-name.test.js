// Sprint 10 — Demo Flow Hardening: regression test for the fixed bug where
// the portfolio-ask AI context only contained each account's raw csmId
// (e.g. "CSM-1"), never the CSM's actual name from accounts.json's "csms"
// list — so a question like "how many customers does Lukas have?" wrongly
// got answered as if no CSM name existed. Asserts on the actual outbound
// prompt text (via a local dummy n8n webhook, no real AI/network call) so a
// future refactor of portfolioAccountSummary() can't silently drop the name
// again without this test catching it.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_DATA = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
);
const lukas = ACCOUNTS_DATA.csms.find(c => c.name.includes("Lukas"));
const lukasAccount = ACCOUNTS_DATA.accounts.find(a => a.csmId === lukas.csmId);

const TEST_ORIGIN = "http://localhost:test-runner";
const TEST_SECRET = "test-only-secret-do-not-use";

let lastRequestBody = null;
const dummyServer = createServer((req, res) => {
  let body = "";
  req.on("data", c => { body += c; });
  req.on("end", () => {
    lastRequestBody = JSON.parse(body);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text: JSON.stringify({ answer: "ok" }) }));
  });
});
const dummyUrl = await new Promise(resolve => {
  dummyServer.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${dummyServer.address().port}`));
});

process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.MOCK_AI = "false";
process.env.AI_PROVIDER = "n8n";
process.env.N8N_ANALYZE_WEBHOOK_URL = dummyUrl;
process.env.N8N_WEBHOOK_SECRET = TEST_SECRET;
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

test("portfolio-ask: outbound AI prompt includes the CSM's actual name, not just the raw csmId", async () => {
  const { statusCode } = await callHandler({
    mode: "portfolio-ask",
    accountIds: [lukasAccount.accountId],
    question: "How many customers does this CSM have?",
  });
  assert.equal(statusCode, 200);
  assert.ok(lastRequestBody, "no request reached the dummy n8n webhook");
  assert.ok(
    lastRequestBody.user.includes(lukas.name),
    `expected the AI prompt to include CSM name "${lukas.name}", got: ${lastRequestBody.user}`
  );
  assert.ok(
    lastRequestBody.user.includes(lukas.csmId),
    `expected the AI prompt to still include the raw csmId "${lukas.csmId}" alongside the name`
  );
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
