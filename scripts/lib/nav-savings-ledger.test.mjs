// nav-savings-ledger.test.mjs — proves recordNavHit emits the exact line shape
// the PSN aggregator counts ({kind:"hit", est_tokens}), is fail-soft, and that
// readNavSavings round-trips it. Hermetic: every test points the ledger at a tmp
// file via PRISM_NAV_SAVINGS_LEDGER_PATH so no real dashboard is touched.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LIB = path.resolve(import.meta.dirname, "nav-savings-ledger.mjs");

async function freshLib() {
  const url = "file://" + LIB.replace(/\\/g, "/") + "?t=" + Date.now() + "-" + Math.random();
  return await import(url);
}

function tmpLedger() {
  return path.join(os.tmpdir(), `nav-led-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`);
}

test("recordNavHit writes the aggregator's {kind:'hit', est_tokens} shape", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  delete process.env.PRISM_NAV_EST_TOKENS;
  delete process.env.PRISM_NAV_SAVINGS_DISABLE;
  try {
    const lib = await freshLib();
    assert.equal(lib.recordNavHit({ label: "CuttingForceEngine", path: "src/engines/CuttingForceEngine.ts", source: "master-index" }), true);
    const lines = fs.readFileSync(p, "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    const e = JSON.parse(lines[0]);
    assert.equal(e.kind, "hit", "must be a hit line so summarizeJsonl counts it");
    assert.equal(e.est_tokens, 300, "default credit");
    assert.equal(e.path, "src/engines/CuttingForceEngine.ts");
    assert.equal(e.source, "master-index");
    assert.ok(Number.isFinite(e.ts));
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; try { fs.unlinkSync(p); } catch {} }
});

test("readNavSavings round-trips appended hits (count + savedTokens)", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  process.env.PRISM_NAV_EST_TOKENS = "250";
  try {
    const lib = await freshLib();
    lib.recordNavHit({ label: "A", path: "src/engines/A.ts" });
    lib.recordNavHit({ label: "B", path: "src/engines/B.ts" });
    const s = lib.readNavSavings();
    assert.equal(s.hits, 2);
    assert.equal(s.savedTokens, 500, "2 × 250 (env override)");
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; delete process.env.PRISM_NAV_EST_TOKENS; try { fs.unlinkSync(p); } catch {} }
});

test("PRISM_NAV_SAVINGS_DISABLE=1 → no write, returns false", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  process.env.PRISM_NAV_SAVINGS_DISABLE = "1";
  try {
    const lib = await freshLib();
    assert.equal(lib.recordNavHit({ label: "X", path: "src/engines/X.ts" }), false);
    assert.equal(fs.existsSync(p), false, "disabled → ledger never created");
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; delete process.env.PRISM_NAV_SAVINGS_DISABLE; try { fs.unlinkSync(p); } catch {} }
});

test("recordNavHit is fail-soft on an unwritable path (returns false, never throws)", async () => {
  // point the ledger at a path whose parent is an existing FILE → mkdir/append fail
  const blocker = path.join(os.tmpdir(), `nav-blocker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  fs.writeFileSync(blocker, "x", "utf8");
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = path.join(blocker, "sub", "ledger.jsonl");
  delete process.env.PRISM_NAV_SAVINGS_DISABLE;
  try {
    const lib = await freshLib();
    assert.equal(lib.recordNavHit({ label: "X", path: "src/engines/X.ts" }), false, "unwritable → false, no throw");
    assert.deepEqual(lib.readNavSavings(), { hits: 0, savedTokens: 0 }, "missing ledger reads as zeros");
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; try { fs.unlinkSync(blocker); } catch {} }
});

test("malformed input is tolerated (non-string label/path → null fields, still a hit)", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  delete process.env.PRISM_NAV_EST_TOKENS;
  try {
    const lib = await freshLib();
    assert.equal(lib.recordNavHit({ label: 42, path: null, source: undefined }), true);
    const e = JSON.parse(fs.readFileSync(p, "utf8").trim());
    assert.equal(e.label, null);
    assert.equal(e.path, null);
    assert.equal(e.source, "nav", "source defaults to 'nav'");
    assert.equal(e.kind, "hit");
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; try { fs.unlinkSync(p); } catch {} }
});

test("recordNavHit() with no args does not throw", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  try {
    const lib = await freshLib();
    assert.equal(lib.recordNavHit(), true, "empty hit still recorded (a save with unknown metadata)");
    const e = JSON.parse(fs.readFileSync(p, "utf8").trim());
    assert.equal(e.kind, "hit");
    assert.equal(e.label, null);
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; try { fs.unlinkSync(p); } catch {} }
});

// ── creditNavOnEmit — the credit-on-emit gate (closes scrutiny arm-C P2) ─────
test("creditNavOnEmit: credits ONLY when navHit present AND emittedBanner true", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  delete process.env.PRISM_NAV_SAVINGS_DISABLE;
  try {
    const lib = await freshLib();
    const hit = { label: "X", path: "mcp-server/src/engines/X.ts", source: "pre-grep" };
    assert.equal(lib.creditNavOnEmit({ navHit: hit, emittedBanner: true }), true, "emit + navHit → credited");
    assert.equal(lib.creditNavOnEmit({ navHit: hit, emittedBanner: false }), false, "deduped (no emit) → NO credit");
    assert.equal(lib.creditNavOnEmit({ navHit: null, emittedBanner: true }), false, "no nav target → no credit");
    assert.equal(lib.creditNavOnEmit({}), false);
    assert.equal(lib.creditNavOnEmit(), false, "no args → no throw, no credit");
    // exactly ONE ledger line — only the (navHit ∧ emittedBanner) case recorded.
    assert.equal(lib.readNavSavings().hits, 1, "deduped + null + empty must NOT have credited");
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; try { fs.unlinkSync(p); } catch {} }
});

test("creditNavOnEmit: respects PRISM_NAV_SAVINGS_DISABLE (recordNavHit returns false)", async () => {
  const p = tmpLedger();
  process.env.PRISM_NAV_SAVINGS_LEDGER_PATH = p;
  process.env.PRISM_NAV_SAVINGS_DISABLE = "1";
  try {
    const lib = await freshLib();
    assert.equal(lib.creditNavOnEmit({ navHit: { label: "X", path: "mcp-server/src/X.ts" }, emittedBanner: true }), false, "disabled → not credited");
    assert.equal(fs.existsSync(p), false);
  } finally { delete process.env.PRISM_NAV_SAVINGS_LEDGER_PATH; delete process.env.PRISM_NAV_SAVINGS_DISABLE; try { fs.unlinkSync(p); } catch {} }
});
