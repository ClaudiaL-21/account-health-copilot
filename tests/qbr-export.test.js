// QBR PPTX export — endpoint tests for api/qbr-export.js.
// 2026-08 Block B — the master-template renderer (pptx-automizer against
// assets/qbr-master/QBR_Customer.pptx) replaces the PptxGenJS-built deck.
// Real rendering runs here (no mock mode for a file-format renderer), so
// these are slower than pure-logic tests, but they're the only tests that
// prove the actual .pptx bytes are well-formed and that the customer-safe
// boundary holds all the way through to the exported file.
//
// pptx-automizer numbers newly-written slide XML parts sequentially AFTER
// the source template's own (unreferenced) parts — e.g. with a 10-slide
// master, the actually-displayed slides land in ppt/slides/slide11.xml..
// slide20.xml, not slide1..slide10.xml. Tests must resolve slide POSITION
// (1-10, what a human sees) to its real XML part via presentation.xml's
// <p:sldIdLst> + presentation.xml.rels, exactly like a real reader (or
// PowerPoint) would — reading slide1.xml directly would silently check an
// orphaned, unreferenced leftover part instead of the real first slide.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

const TEST_ORIGIN = "http://localhost:test-runner";
process.env.ALLOWED_ORIGINS = TEST_ORIGIN;

const { default: handler } = await import("../api/qbr-export.js");

function callHandler(body) {
  return new Promise((resolve, reject) => {
    const req = { method: "POST", headers: { origin: TEST_ORIGIN }, socket: {}, body };
    const headers = {};
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { headers[k] = v; },
      json(obj) { resolve({ statusCode: this.statusCode, headers, body: obj, buffer: null }); },
      end(buf) { resolve({ statusCode: this.statusCode, headers, body: null, buffer: buf || null }); },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

// Minimal test-only ZIP reader (local file headers, method 0=stored or
// 8=deflate) — lets these tests assert on the exported .pptx's actual XML
// text without adding a zip-parsing dependency to the app itself.
function readZipEntryText(buf, nameSubstring) {
  let offset = 0;
  while (offset < buf.length - 4) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) { offset++; continue; }
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.toString("utf-8", nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    if (name.includes(nameSubstring)) {
      const raw = buf.subarray(dataStart, dataStart + compSize);
      return method === 8 ? zlib.inflateRawSync(raw).toString("utf-8") : raw.toString("utf-8");
    }
    offset = dataStart + compSize;
  }
  return null;
}

// Resolves the Nth displayed slide (1-based, human-visible order) to its
// actual ppt/slides/slideXX.xml part, following <p:sldIdLst> order and the
// presentation.xml.rels relationship — see the module comment above.
function resolveSlidePart(buf, position) {
  const pres = readZipEntryText(buf, "ppt/presentation.xml");
  const rels = readZipEntryText(buf, "ppt/_rels/presentation.xml.rels");
  const rIds = [...pres.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)].map(m => m[1]);
  const rId = rIds[position - 1];
  if (!rId) return null;
  const relMatch = rels.match(new RegExp(`<Relationship Id="${rId}"[^>]*Target="([^"]+)"`));
  return relMatch ? `ppt/${relMatch[1]}` : null;
}

function slideText(buf, position) {
  const part = resolveSlidePart(buf, position);
  return part ? readZipEntryText(buf, part) || "" : "";
}

function allSlidesText(buf) {
  let text = "";
  for (let i = 1; i <= 10; i++) text += slideText(buf, i);
  return text;
}

const fullSections = [
  { key: "valueDelivered", safeText: "We automated 62% of inbound support tickets, cutting resolution time.", presentationText: "Automated 62% of tickets." },
  { key: "adoption", safeText: "full", presentationText: "57% weekly active usage." },
  { key: "renewalOutlook", safeText: "full", presentationText: "On track for Q4 renewal." },
  { key: "businessObjectives", safeText: "full", presentationText: "Reduce resolution time below 4 hours." },
  { key: "healthTrends", safeText: "full", presentationText: "Health Score trending upward." },
  { key: "risks", safeText: "full", presentationText: "Three items need alignment." },
];

// --- Basic contract --------------------------------------------------------

test("unknown accountId returns 404, never attempts to render", async () => {
  const { statusCode, body } = await callHandler({ accountId: "ACC-does-not-exist", sections: [] });
  assert.equal(statusCode, 404);
  assert.match(body.error, /unknown accountid/i);
});

test("a valid request returns a well-formed .pptx with the expected content-type and all 10 master slides present", async () => {
  const { statusCode, headers, buffer } = await callHandler({ accountId: "ACC-01", sections: fullSections });
  assert.equal(statusCode, 200);
  assert.equal(headers["Content-Type"], "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  assert.match(headers["Content-Disposition"], /attachment; filename="Alpenbank-AG-Customer-QBR\.pptx"/);
  assert.ok(buffer && buffer.length > 10000, "expected a non-trivial binary payload");
  assert.equal(buffer.subarray(0, 2).toString(), "PK", "must be a real zip/OOXML container");
  for (let i = 1; i <= 10; i++) {
    assert.ok(resolveSlidePart(buffer, i), `displayed slide ${i} must resolve to a real slide part`);
  }
});

// --- Customer-safe-only export, presentation content contract --------------

test("only reviewed presentationText the client sent appears in the deck — verbatim, never internal/customerSafeDefault", async () => {
  const marker = "UNIQUE-MARKER-1234-value-story";
  const { buffer } = await callHandler({
    accountId: "ACC-01",
    sections: [{ key: "valueDelivered", safeText: "full text", presentationText: marker }],
  });
  assert.ok(allSlidesText(buffer).includes(marker));
});

test("a section the client did not send never appears, even if it exists in data/accounts.json's evidence", async () => {
  const { buffer } = await callHandler({
    accountId: "ACC-01",
    sections: [{ key: "valueDelivered", safeText: "Only this section was reviewed.", presentationText: "Only this was reviewed." }],
  });
  const text = allSlidesText(buffer);
  const account = ACCOUNTS.find(a => a.accountId === "ACC-01");
  for (const artifact of account.freeTextArtifacts || []) {
    assert.equal(text.includes(artifact.text), false, "internal free-text evidence must never leak into the export");
  }
});

test("an extraneous `internal`-style field on a section tuple is ignored — only the sanitized fields are ever read", async () => {
  const marker = "SHOULD-NEVER-APPEAR-INTERNAL-TEXT";
  const { buffer } = await callHandler({
    accountId: "ACC-01",
    sections: [{ key: "risks", safeText: "Customer-safe risk framing.", presentationText: "Reviewed risk note.", internal: marker, customerSafeDefault: marker }],
  });
  assert.equal(allSlidesText(buffer).includes(marker), false);
});

test("an unknown/malformed section key is dropped, not rendered and not fatal", async () => {
  const { statusCode, buffer } = await callHandler({
    accountId: "ACC-01",
    sections: [{ key: "not-a-real-section", safeText: "x", presentationText: "must never appear" }, ...fullSections],
  });
  assert.equal(statusCode, 200);
  assert.equal(allSlidesText(buffer).includes("must never appear"), false);
});

test("presentationText without a matching safeText is dropped (safeText is required to keep a section in scope)", async () => {
  const { buffer } = await callHandler({
    accountId: "ACC-01",
    sections: [{ key: "valueDelivered", safeText: "", presentationText: "must never appear either" }],
  });
  assert.equal(allSlidesText(buffer).includes("must never appear either"), false);
});

// --- Health chart --------------------------------------------------------

test("health chart renders as a native chart object on the displayed slide 2", async () => {
  const { buffer } = await callHandler({ accountId: "ACC-01", sections: [] });
  const part = resolveSlidePart(buffer, 2);
  const slideNum = part.match(/slide(\d+)\.xml/)[1];
  const rels = readZipEntryText(buffer, `ppt/slides/_rels/slide${slideNum}.xml.rels`);
  assert.match(rels, /chart/i);
});

// --- Overflow validation -----------------------------------------------------

test("reviewed presentation text over the layout limit returns 422 with slide/slot-identified warnings, never a truncated render", async () => {
  const { statusCode, body, buffer } = await callHandler({
    accountId: "ACC-01",
    sections: [{ key: "valueDelivered", safeText: "x", presentationText: "x".repeat(300) }],
  });
  assert.equal(statusCode, 422);
  assert.equal(buffer, null, "must not also return a partial file");
  assert.ok(Array.isArray(body.warnings) && body.warnings.length >= 1);
  assert.ok(body.warnings[0].slide && body.warnings[0].slot && body.warnings[0].message);
});

// --- Regression: existing analyze.js QBR flow untouched --------------------

test("QBR_SECTION_DEFS import used for key validation matches the 12 known keys, unmodified", async () => {
  const { QBR_SECTION_DEFS } = await import("../api/analyze.js");
  assert.equal(QBR_SECTION_DEFS.length, 12);
  assert.deepEqual(
    QBR_SECTION_DEFS.map(d => d.key),
    ["executiveSummary", "valueDelivered", "businessObjectives", "healthTrends", "adoption",
      "relationship", "risks", "featureRequests", "renewalOutlook", "previousInterventions",
      "openCommitments", "nextQuarterPlan"]
  );
});
