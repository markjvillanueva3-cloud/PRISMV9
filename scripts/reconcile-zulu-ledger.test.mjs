// scripts/reconcile-zulu-ledger.test.mjs
// Real-value tests (R9: encode INTENT). The pure checks are tested against the LIVE repo
// for stable, Ollama-independent claims (edge schema, dynamic SLOT_NAMES) so a regression
// in the reconciler logic FAILS the test. The Ollama probe is tested via its failure path
// (unreachable URL) so the suite is deterministic without a running daemon.

import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFileSync, rmSync } from "node:fs";

import {
  checkOllamaGenerate,
  checkEdgeTypeInSchema,
  checkFileExists,
  checkSourceImports,
  checkSynthesisFreshness,
  checkAiSynergyMean,
  findNewestLedger,
  reconcile,
  CLAIMS,
} from "./reconcile-zulu-ledger.mjs";

const ROOT = "H:/prism";

// reconcile() runs the (slow) Ollama probe; share one result across the integration tests
// instead of invoking it per-test (scrutiny B P1-2: avoids a ~40s double-probe in CI).
let _sharedReport;
async function sharedReconcile() {
  if (!_sharedReport) _sharedReport = await reconcile();
  return _sharedReport;
}

test("checkEdgeTypeInSchema: consensus-of IS in the frozen EDGE_TYPES whitelist (A-13 shipped)", async () => {
  const r = await checkEdgeTypeInSchema("consensus-of");
  assert.equal(r.ok, true, "consensus-of must be a real materialized edge type");
  assert.ok(Array.isArray(r.allTypes) && r.allTypes.length >= 3, "expected >=3 edge types (owned-by-slot/documented-by/embeds/consensus-of)");
});

test("checkEdgeTypeInSchema: a fabricated type is NOT in the whitelist (negative)", async () => {
  const r = await checkEdgeTypeInSchema("totally-not-a-real-edge-type-xyz");
  assert.equal(r.ok, false);
});

test("checkEdgeTypeInSchema: missing schema file reports error, never throws (edge case)", async () => {
  const r = await checkEdgeTypeInSchema("consensus-of", join(ROOT, "scripts/lib/does-not-exist.mjs"));
  assert.equal(r.ok, false);
  assert.equal(r.error, "schema-missing");
});

test("checkSourceImports: slot-task-claim imports dynamic SLOT_NAMES (A-14 fixed, not hardcoded 12)", () => {
  const r = checkSourceImports(join(ROOT, ".claude/helpers/slot-task-claim.mjs"), "SLOT_NAMES");
  assert.equal(r.ok, true, "slot-task-claim must import SLOT_NAMES, proving the slot list is dynamic");
});

test("checkSourceImports: a symbol that is not imported returns ok:false (negative)", () => {
  const r = checkSourceImports(join(ROOT, ".claude/helpers/slot-task-claim.mjs"), "NoSuchSymbolImported12345");
  assert.equal(r.ok, false);
});

test("checkSourceImports: a STRING-LITERAL embedding the import syntax is NOT a real import (no false SHIPPED)", () => {
  const p = join(tmpdir(), `zlr-strlit-${process.pid}.mjs`);
  writeFileSync(p, 'const msg = "import { SLOT_NAMES } from ./x.mjs";\nconst y = 1;\n');
  try {
    assert.equal(checkSourceImports(p, "SLOT_NAMES").ok, false, "an import inside a string literal must not count as a real import");
  } finally {
    rmSync(p, { force: true });
  }
});

test("checkSourceImports: a real top-of-line import returns true (positive control for the anchor fix)", () => {
  const p = join(tmpdir(), `zlr-realimp-${process.pid}.mjs`);
  writeFileSync(p, '  import { SLOT_NAMES } from "./chat-slots.mjs";\nconst y = 1;\n');
  try {
    assert.equal(checkSourceImports(p, "SLOT_NAMES").ok, true, "a genuine import statement (even indented) must be detected");
  } finally {
    rmSync(p, { force: true });
  }
});

test("checkSourceImports: missing file reports error, never throws (edge case)", () => {
  const r = checkSourceImports(join(ROOT, "no/such/file.mjs"), "SLOT_NAMES");
  assert.equal(r.ok, false);
  assert.equal(r.error, "file-missing");
});

test("checkFileExists: true for a real file, false for a fake one", () => {
  assert.equal(checkFileExists(join(ROOT, "scripts/reconcile-zulu-ledger.mjs")).ok, true);
  assert.equal(checkFileExists(join(ROOT, "scripts/__definitely_absent__.mjs")).ok, false);
});

test("checkSynthesisFreshness: the patterns dir holds the galaxy syntheses (count is plausible)", () => {
  const r = checkSynthesisFreshness();
  assert.equal(r.ok, true, "patterns/<galaxy>_synthesis.md cluster must exist");
  assert.ok(r.count >= 20, `expected >=20 synthesis files for the 34-galaxy fleet, got ${r.count}`);
  assert.ok(r.fresh >= 0 && r.fresh <= r.count, "fresh count must be within [0, count]");
});

test("checkSynthesisFreshness: missing dir reports error, never throws (edge case)", () => {
  const r = checkSynthesisFreshness(24, join(ROOT, "knowledge/memories/__absent__"));
  assert.equal(r.ok, false);
  assert.equal(r.count, 0);
});

test("checkAiSynergyMean: parses a finite mean from the audit", () => {
  const r = checkAiSynergyMean();
  assert.equal(r.ok, true, "AI-SYNERGY-AUDIT.md must be parseable");
  assert.ok(Number.isFinite(r.mean), "mean synergy must parse to a number");
});

test("checkOllamaGenerate: unreachable URL fails cleanly with a numeric ms (deterministic, no daemon)", async () => {
  const r = await checkOllamaGenerate("http://127.0.0.1:6553", "qwen2.5-coder:32b", 1500);
  assert.equal(r.ok, false);
  assert.ok(typeof r.ms === "number" && r.ms >= 0, "ms must be a non-negative number even on failure");
  assert.ok(typeof r.error === "string" && r.error.length > 0, "must surface an error string (fail-loud)");
});

test("CLAIMS registry: every claim has id, ledgerSays, and an async probe", () => {
  assert.ok(Array.isArray(CLAIMS) && CLAIMS.length >= 5);
  for (const c of CLAIMS) {
    assert.ok(typeof c.id === "string" && c.id.length > 0, "claim needs an id");
    assert.ok(c.ledgerSays === "OPEN" || c.ledgerSays === "SHIPPED", "ledgerSays must be OPEN|SHIPPED");
    assert.equal(typeof c.probe, "function", "claim needs a probe()");
  }
});

test("reconcile: detects ledger staleness on the live repo (>=2 OPEN-claimed items verified SHIPPED)", async () => {
  const report = await sharedReconcile();
  assert.equal(report.summary.total, CLAIMS.length, "every claim must be evaluated");
  // A-13 (consensus-of edge) + A-14 (dynamic SLOT_NAMES) are fs/schema-stable SHIPPED facts,
  // both marked OPEN in the ledger => the reconciler must flag >=2 stale. This is the core
  // intent: a stale ledger is detected automatically.
  assert.ok(report.summary.ledgerStaleCount >= 2, `expected >=2 stale ledger items, got ${report.summary.ledgerStaleCount}`);
  // Every result carries a valid verdict + a boolean staleness flag.
  const allowed = new Set(["SHIPPED", "OPEN", "COVERED", "UNKNOWN"]);
  for (const r of report.results) {
    assert.ok(allowed.has(r.verdict), `bad verdict ${r.verdict}`);
    assert.equal(typeof r.ledgerStale, "boolean");
    assert.ok(typeof r.evidence === "string" && r.evidence.length > 0, "evidence must be present");
  }
});

test("reconcile: per-item verdicts are correct for env-independent claims (catches wrong-but-legal verdicts)", async () => {
  const report = await sharedReconcile();
  const byId = Object.fromEntries(report.results.map((r) => [r.id, r]));
  // fs/schema-stable -> deterministic regardless of Ollama/synthesis freshness:
  assert.equal(byId["A-13"].verdict, "SHIPPED", "consensus-of edge IS materialized");
  assert.equal(byId["A-14"].verdict, "SHIPPED", "SLOT_NAMES IS dynamic");
  assert.equal(byId["A-06"].verdict, "OPEN", "no dedicated galaxy-brain-read API exists (R12-honest, not COVERED)");
  assert.equal(byId["A-04"].verdict, "UNKNOWN", "consensus_ask wiring is peer-owned, not file-probeable");
});

test("findNewestLedger: returns the newest ZULU-MASTER-CONTEXT-LEDGER-*.md (snapshot-staleness guard)", () => {
  const newest = findNewestLedger();
  assert.ok(typeof newest === "string" && /^ZULU-MASTER-CONTEXT-LEDGER-.*\.md$/.test(newest), `expected a ledger filename, got ${newest}`);
});
