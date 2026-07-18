// Tests for vault-health.mjs (SIERRA-VAULT-OPS/U-VAULT-HEALTH).
// node --test scripts/vault-health.test.mjs
//
// Pure aggregateHealth() unit tests: injected report objects + fixed nowMs, so the
// rollup (per-source headline, severity, freshness, overall) is deterministic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateHealth, SOURCES } from "./vault-health.mjs";

const NOW = Date.parse("2026-06-17T20:00:00Z");
const FRESH = "2026-06-17T19:00:00Z";   // 1h old
const OLD = "2026-06-05T20:00:00Z";     // 12 days old
const opt = { nowMs: NOW, staleDays: 7 };

// a fully-healthy fresh set (supersession converged, 0 contradictions, 0 rot; ambiguous is info)
function healthy() {
  return {
    rot: { generatedAt: FRESH, scanned: 100, orphaned: 5, rottingCount: 0 },
    supersession: { generatedAt: FRESH, candidateCount: 0, alreadyMarked: 128, supersessionStems: 43 },
    contradiction: { generatedAt: FRESH, model: "gpt-oss:20b", totals: { contradictions: 0, pairsChecked: 1105, pairsTotal: 1105, coverage: 1 } },
    ambiguous: { generatedAt: FRESH, ambiguousTotal: 169, captured: 169, truncated: false },
  };
}
const row = (roll, key) => roll.rows.find((r) => r.key === key);

test("SOURCES covers the 4 vault detectors + the optional brain-refresh row", () => {
  assert.deepEqual(SOURCES.map((s) => s.key).sort(), ["ambiguous", "brain-refresh", "contradiction", "rot", "supersession"]);
});

// U-SIERRA-BRAIN-REFRESH-HEALTHROW (2026-06-25, slot:sierra): the overnight brain-refresh verdict is
// surfaced in this same dashboard. It is OPTIONAL (absent on a never-run machine must not degrade),
// WARNs when a pipeline failed (naming which), and treats Ollama-down deferral as benign INFO.
test("brain-refresh: absent (optional) -> no row, does NOT degrade overall", () => {
  const roll = aggregateHealth(healthy(), opt); // healthy() has no brain-refresh report
  assert.equal(row(roll, "brain-refresh"), undefined, "optional absent source produces no row");
  assert.equal(roll.overall, "OK");
  assert.equal(roll.rows.length, 4);
});

test("brain-refresh: a FAILED pipeline -> row WARN naming the step -> overall WARN", () => {
  const r = healthy();
  r["brain-refresh"] = { generatedAt: FRESH, action: "ran", verdict: "failed", exitCode: 1,
    failedSteps: ["galaxy-synth"], steps: [{ id: "mem-index", status: "ok" }, { id: "galaxy-synth", status: "failed" }, { id: "wiki-tribal", status: "ok" }] };
  const roll = aggregateHealth(r, opt);
  const br = row(roll, "brain-refresh");
  assert.equal(br.severity, "warn");
  assert.equal(br.value, 1);
  assert.match(br.detail, /galaxy-synth/);
  assert.equal(roll.overall, "WARN");
});

test("brain-refresh: deferred (Ollama down) -> INFO, does NOT degrade overall", () => {
  const r = healthy();
  r["brain-refresh"] = { generatedAt: FRESH, action: "ran", verdict: "deferred", exitCode: 3, failedSteps: [], steps: [{ id: "mem-index", status: "ok" }] };
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "brain-refresh").severity, "info");
  assert.equal(roll.overall, "OK");
});

test("brain-refresh: clean run -> OK row", () => {
  const r = healthy();
  r["brain-refresh"] = { generatedAt: FRESH, action: "ran", verdict: "ok", exitCode: 0, failedSteps: [], steps: [{ id: "mem-index", status: "ok" }, { id: "mem-embed", status: "ok" }] };
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "brain-refresh").severity, "ok");
  assert.equal(roll.overall, "OK");
});

test("all present + fresh + clean -> overall OK; ambiguous is INFO not WARN", () => {
  const roll = aggregateHealth(healthy(), opt);
  assert.equal(roll.overall, "OK");
  assert.equal(roll.rows.length, 4);
  assert.equal(row(roll, "rot").severity, "ok");
  assert.equal(row(roll, "supersession").severity, "ok");
  assert.equal(row(roll, "contradiction").severity, "ok");
  assert.equal(row(roll, "ambiguous").severity, "info");   // info does NOT degrade overall
  assert.equal(roll.counts.warn, 0);
  assert.equal(roll.counts.info, 1);
});

test("a real contradiction -> that row WARN -> overall WARN", () => {
  const r = healthy();
  r.contradiction.totals.contradictions = 2;
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "contradiction").severity, "warn");
  assert.equal(row(roll, "contradiction").value, 2);
  assert.equal(roll.overall, "WARN");
});

test("unmarked superseded memos -> supersession WARN (stale-as-current is a defect)", () => {
  const r = healthy();
  r.supersession.candidateCount = 5;
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "supersession").severity, "warn");
  assert.equal(roll.overall, "WARN");
});

test("supersession value falls back to `unmarked` when candidateCount absent", () => {
  const r = healthy();
  delete r.supersession.candidateCount;
  r.supersession.unmarked = 3;
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "supersession").value, 3);
  assert.equal(row(roll, "supersession").severity, "warn");
});

test("a missing report -> state=missing + regen cmd -> overall STALE (no warn)", () => {
  const r = healthy();
  delete r.rot;
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "rot").state, "missing");
  assert.match(row(roll, "rot").regen, /vault-rot-sentinel/);
  assert.equal(roll.counts.missing, 1);
  assert.equal(roll.overall, "STALE");
});

test("a stale report (older than staleDays) -> stale flag -> overall STALE", () => {
  const r = healthy();
  r.contradiction.generatedAt = OLD;   // 12d > 7
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "contradiction").stale, true);
  assert.ok(row(roll, "contradiction").ageDays >= 11);
  assert.equal(roll.counts.stale, 1);
  assert.equal(roll.overall, "STALE");
});

test("severity precedence: WARN dominates a concurrent STALE", () => {
  const r = healthy();
  r.contradiction.totals.contradictions = 1;   // warn
  r.rot.generatedAt = OLD;                      // stale
  const roll = aggregateHealth(r, opt);
  assert.equal(roll.counts.warn, 1);
  assert.equal(roll.counts.stale, 1);
  assert.equal(roll.overall, "WARN");   // not STALE
});

test("missing headline fields degrade gracefully (no crash); a model-less contradiction is needsScan", () => {
  const roll = aggregateHealth({
    rot: { generatedAt: FRESH },               // no rottingCount -> graceful 0/ok (no scan concept)
    contradiction: { generatedAt: FRESH },     // no model/totals -> unscanned, NOT a clean ok
  }, opt);
  assert.equal(row(roll, "rot").value, 0);
  assert.equal(row(roll, "rot").severity, "ok");
  assert.equal(row(roll, "contradiction").value, 0);
  assert.equal(row(roll, "contradiction").needsScan, true);   // no model = we did not look
  assert.notEqual(row(roll, "contradiction").severity, "ok");
  assert.equal(roll.overall, "STALE");                        // 2 missing + 1 needsScan
});

test("undated report -> ageDays null, not stale (cannot judge freshness without generatedAt)", () => {
  const r = healthy();
  delete r.ambiguous.generatedAt;
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "ambiguous").ageDays, null);
  assert.equal(row(roll, "ambiguous").stale, false);
});

test("empty input -> all 4 missing -> overall STALE, no crash", () => {
  const roll = aggregateHealth({}, opt);
  assert.equal(roll.counts.missing, 4);
  assert.equal(roll.overall, "STALE");
  assert.equal(roll.rows.length, 4);
});

test("contradiction with model:null (Ollama down) -> NEEDS-SCAN, NOT ok -> overall STALE (no false green)", () => {
  const r = healthy();
  r.contradiction = { generatedAt: FRESH, model: null, totals: { contradictions: 0, pairsChecked: 0, pairsTotal: 0, coverage: 0 }, note: "no NLI model available" };
  const roll = aggregateHealth(r, opt);
  const c = row(roll, "contradiction");
  assert.equal(c.needsScan, true);
  assert.notEqual(c.severity, "ok");          // a green 0 here would mask an unscanned vault
  assert.match(c.detail, /NOT SCANNED/);
  assert.equal(roll.counts.needsScan, 1);
  assert.equal(roll.overall, "STALE");        // not OK
});

test("contradiction that checked 0 of N pairs (aborted) -> NEEDS-SCAN, not a clean OK", () => {
  const r = healthy();
  r.contradiction.totals = { contradictions: 0, pairsChecked: 0, pairsTotal: 1105, coverage: 0 };
  const roll = aggregateHealth(r, opt);
  assert.equal(row(roll, "contradiction").needsScan, true);
  assert.equal(roll.overall, "STALE");
});

test("a real scan with contradictions:0 over FULL coverage IS ok (not needsScan, not lowCoverage)", () => {
  const roll = aggregateHealth(healthy(), opt);   // pairsChecked:1105/1105 cov 1 model:gpt-oss:20b
  assert.equal(row(roll, "contradiction").needsScan, false);
  assert.equal(row(roll, "contradiction").lowCoverage, false);
  assert.equal(row(roll, "contradiction").severity, "ok");
});

test("clean 0-found at LOW coverage -> info+lowCoverage, NOT ok (no false clean bill)", () => {
  const r = healthy();
  r.contradiction.totals = { contradictions: 0, pairsChecked: 8, pairsTotal: 1105, coverage: 0.007 };
  const roll = aggregateHealth(r, opt);
  const c = row(roll, "contradiction");
  assert.equal(c.severity, "info");
  assert.equal(c.lowCoverage, true);
  assert.notEqual(c.severity, "ok", "a 0 over 0.7% scanned must NOT read as a clean bill");
  assert.match(c.detail, /LOW COVERAGE/);
  assert.equal(roll.counts.lowCoverage, 1);
  // lowCoverage is INFO -> does NOT escalate overall (still OK here; nothing warn/stale/missing)
  assert.equal(roll.overall, "OK");
});

test("a real contradiction at low coverage still WARNs (contradiction dominates coverage)", () => {
  const r = healthy();
  r.contradiction.totals = { contradictions: 1, pairsChecked: 8, pairsTotal: 1105, coverage: 0.007 };
  const roll = aggregateHealth(r, opt);
  const c = row(roll, "contradiction");
  assert.equal(c.severity, "warn");
  assert.equal(c.lowCoverage, false, "a found contradiction is not flagged lowCoverage -- it's a real WARN");
  assert.equal(roll.overall, "WARN");
});

test("lowCoverage boundary: cov >= LOW_COVERAGE(0.5) is ok; just below is lowCoverage", () => {
  const atFloor = healthy();
  atFloor.contradiction.totals = { contradictions: 0, pairsChecked: 553, pairsTotal: 1105, coverage: 0.5 }; // 0.5004 >= 0.5
  assert.equal(row(aggregateHealth(atFloor, opt), "contradiction").severity, "ok");
  const below = healthy();
  below.contradiction.totals = { contradictions: 0, pairsChecked: 540, pairsTotal: 1105, coverage: 0.489 }; // 0.4886 < 0.5
  assert.equal(row(aggregateHealth(below, opt), "contradiction").lowCoverage, true);
});

test("confidence-gate: a reasoned contradiction WARNs; a reason-less one is low-confidence, not counted", () => {
  const r = healthy();
  r.contradiction = { generatedAt: FRESH, model: "gpt-oss:20b",
    totals: { contradictions: 2, pairsChecked: 1105, pairsTotal: 1105, coverage: 1 },
    contradictions: [
      { a: "x", b: "y", reason: "A says no normalization but B says .gitattributes exists -- mutually inconsistent." },
      { a: "p", b: "q", reason: "" }, // empty reason -> low-confidence false positive (NLI noise)
    ] };
  const c = row(aggregateHealth(r, opt), "contradiction");
  assert.equal(c.value, 1, "only the reasoned contradiction counts toward the WARN");
  assert.equal(c.severity, "warn");
  assert.match(c.detail, /1 low-confidence/);
});

test("confidence-gate: all reason-less contradictions -> 0 confirmed, NOT a WARN (surfaced as low-confidence)", () => {
  const r = healthy();
  r.contradiction = { generatedAt: FRESH, model: "gpt-oss:20b",
    totals: { contradictions: 2, pairsChecked: 1105, pairsTotal: 1105, coverage: 1 },
    contradictions: [ { a: "x", b: "y", reason: "" }, { a: "p", b: "q", reason: "   " } ] };
  const roll = aggregateHealth(r, opt);
  const c = row(roll, "contradiction");
  assert.equal(c.value, 0, "no reasoned contradiction -> 0 confirmed");
  assert.equal(c.severity, "ok", "reason-less NLI noise must NOT WARN");
  assert.match(c.detail, /2 low-confidence/);
  assert.equal(roll.overall, "OK");
});

test("confidence-gate: no per-finding array -> falls back to totals.contradictions (back-compat)", () => {
  const r = healthy();
  r.contradiction.totals.contradictions = 3; // totals-only report shape, no `contradictions` array
  const c = row(aggregateHealth(r, opt), "contradiction");
  assert.equal(c.value, 3, "trust the total when no per-finding array is present");
  assert.equal(c.severity, "warn");
});

test("confidence-gate: reason at MIN_REASON_LEN counts; below is low-confidence", () => {
  const mk = (reason) => {
    const r = healthy();
    r.contradiction = { generatedAt: FRESH, model: "gpt-oss:20b",
      totals: { contradictions: 1, pairsChecked: 1105, pairsTotal: 1105, coverage: 1 },
      contradictions: [{ a: "x", b: "y", reason }] };
    return row(aggregateHealth(r, opt), "contradiction");
  };
  assert.equal(mk("ten-charss").value, 1, "exactly 10 chars -> counts");      // length 10 == MIN_REASON_LEN
  assert.equal(mk("short").value, 0, "5 chars -> low-confidence, not counted");
});

test("cov display: shows CHECKED coverage (checked/total), not the report's selection coverage", () => {
  const r = healthy();
  // budget-partial divergence: 16 CHECKED of 150 selected of 1105 -> report.coverage 0.136,
  // but the meaningful (judgment) coverage is checked/total = 16/1105 = 0.014.
  r.contradiction.totals = { contradictions: 0, pairsChecked: 16, pairsTotal: 1105, pairsConsidered: 150, coverage: 0.136 };
  const c = row(aggregateHealth(r, opt), "contradiction");
  assert.match(c.detail, /16\/1105 pairs \(cov 0\.014\)/);   // checked/total, matches the numerator + the lowCoverage gate
  assert.ok(!c.detail.includes("0.136"), "must NOT display the report's selection-coverage 0.136 as the pair cov");
  assert.equal(c.lowCoverage, true);   // 0.014 < 0.5
});

test("cov display: surfaces a budget-partial note explaining why coverage is low", () => {
  const r = healthy();
  r.contradiction.totals = { contradictions: 0, pairsChecked: 16, pairsTotal: 1105, coverage: 0.136, notAttempted: 134 };
  r.contradiction.budgetExceeded = true;   // a bounded interactive run, not a failure
  const c = row(aggregateHealth(r, opt), "contradiction");
  assert.match(c.detail, /budget-partial \(134 not attempted\)/);
});
