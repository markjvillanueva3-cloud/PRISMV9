#!/usr/bin/env node
/**
 * audit-mcp-route-takerate.test.mjs — unit tests for the audit classifier + summary.
 *
 * Run: node --test scripts/audit-mcp-route-takerate.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { classify, summarize, renderMd } from "./audit-mcp-route-takerate.mjs";

// ---- classify --------------------------------------------------------------

test("classify: verify-wiring WINS over suppress when takes=0 + fires>=50 (doctrine: never suppress on 0-take measurement artifacts)", () => {
  // 854 fires / 1176 total = 72.6% share, 0% take-rate, fires>=50.
  // Suppress condition holds (share>=30% + takeRate<5%) AND verify-wiring condition holds
  // (fires>=50 + takes=0). Per dashboard MD doctrine, verify-wiring wins.
  assert.equal(classify({ fires: 854, takes: 0, totalFires: 1176 }), "verify-wiring");
  // 400 fires / 1000 total = 40% share, 4% take-rate (16 real takes) → suppress
  // (real take-rate signal, just very low + dominant share → suppress is correct here).
  assert.equal(classify({ fires: 400, takes: 16, totalFires: 1000 }), "suppress");
});

test("classify: verify-wiring when fires >=50 AND takes=0", () => {
  // <30% share but >=50 fires + 0 takes → verify-wiring (measurement gap)
  assert.equal(classify({ fires: 100, takes: 0, totalFires: 1000 }), "verify-wiring");
  assert.equal(classify({ fires: 50, takes: 0, totalFires: 1000 }), "verify-wiring");
  // 49 fires + 0 takes: fires<50 so not verify-wiring; fires>=10 so not keep → retune.
  // "keep" requires fires<10 OR takeRate>=30%; neither holds for 49+0.
  assert.equal(classify({ fires: 49, takes: 0, totalFires: 1000 }), "retune");
});

test("classify: retune when take-rate <5% AND share <30% AND 10<=fires<50", () => {
  // 41 fires / 1000 total = 4.1% share, 0% take-rate.
  // fires<50 → not verify-wiring; share<30% → not suppress; takeRate<30% → not keep-by-rate;
  // fires>=10 → not keep-by-fires → retune.
  assert.equal(classify({ fires: 41, takes: 0, totalFires: 1000 }), "retune");
  // 20 fires + 1 take = 5% take-rate (NOT <5% so suppress disabled);
  // 5% < 30% so not keep-by-rate; fires>=10 so not keep-by-fires → retune.
  assert.equal(classify({ fires: 20, takes: 1, totalFires: 100 }), "retune");
});

test("classify: keep when take-rate >=30%", () => {
  // 100 fires + 30 takes = 30% take-rate → keep
  assert.equal(classify({ fires: 100, takes: 30, totalFires: 1000 }), "keep");
  // 100 fires + 50 takes = 50% take-rate → keep
  assert.equal(classify({ fires: 100, takes: 50, totalFires: 1000 }), "keep");
});

test("classify: keep when fires <10 (too small to judge)", () => {
  assert.equal(classify({ fires: 1, takes: 0, totalFires: 1000 }), "keep");
  assert.equal(classify({ fires: 9, takes: 0, totalFires: 1000 }), "keep");
});

test("classify: zero/negative fires returns keep (defensive)", () => {
  assert.equal(classify({ fires: 0, takes: 0, totalFires: 1000 }), "keep");
  assert.equal(classify({ fires: -1, takes: 0, totalFires: 1000 }), "keep");
});

// ---- summarize -------------------------------------------------------------

test("summarize: empty stats produces health=ok zero summary", () => {
  const audit = summarize({}, { now: new Date("2026-05-26T16:00:00Z") });
  assert.equal(audit.summary.totalFires, 0);
  assert.equal(audit.summary.totalTakes, 0);
  assert.equal(audit.summary.fleetTakeRate, 0);
  assert.equal(audit.summary.healthSignal, "ok");
  assert.equal(audit.rows.length, 0);
});

test("summarize: fires but zero takes → takeup-wiring-broken signal", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { backendAuditChain: 800, doctrineSurface: 200 },
  });
  assert.equal(audit.summary.totalFires, 1000);
  assert.equal(audit.summary.totalTakes, 0);
  assert.equal(audit.summary.healthSignal, "takeup-wiring-broken");
  assert.equal(audit.summary.dominantClassifier, "backendAuditChain");
  assert.ok(audit.summary.dominantShare > 0.7);
});

test("summarize: take-rate present but below target → below-target-take-rate", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { backendAuditChain: 800, doctrineSurface: 200 },
    takeupTotals: { byClassifier: { backendAuditChain: 30 } },
  });
  assert.equal(audit.summary.totalFires, 1000);
  assert.equal(audit.summary.totalTakes, 30);
  assert.equal(audit.summary.fleetTakeRate, 0.03);
  assert.equal(audit.summary.healthSignal, "below-target-take-rate");
});

test("summarize: rows sorted by fire count descending", () => {
  const audit = summarize({
    totalFires: 100,
    byClassifier: { lowFire: 5, midFire: 30, highFire: 60 },
  });
  assert.equal(audit.rows[0].classifier, "highFire");
  assert.equal(audit.rows[1].classifier, "midFire");
  assert.equal(audit.rows[2].classifier, "lowFire");
});

test("summarize: each row carries per-row take-rate + share + recommendation", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { dominant: 700, edge: 5 },
    takeupTotals: { byClassifier: { dominant: 0, edge: 3 } },
  });
  const dom = audit.rows.find((r) => r.classifier === "dominant");
  assert.equal(dom.fires, 700);
  assert.equal(dom.takes, 0);
  assert.equal(dom.takeRate, 0);
  assert.equal(dom.share, 0.7);
  // verify-wiring WINS over suppress when takes=0 + fires>=50 (precedence per dashboard doctrine).
  assert.equal(dom.recommendation, "verify-wiring");

  const edge = audit.rows.find((r) => r.classifier === "edge");
  assert.equal(edge.recommendation, "keep"); // <10 fires
});

// ---- renderMd --------------------------------------------------------------

test("renderMd: contains all summary metrics + per-row rows", () => {
  const audit = summarize({
    totalFires: 100,
    byClassifier: { foo: 60, bar: 40 },
    takeupTotals: { byClassifier: { foo: 5 } },
  });
  const md = renderMd(audit);
  assert.ok(md.includes("# MCP Route Suggest Take-Rate Audit"));
  assert.ok(md.includes("| Total fires | 100 |"));
  assert.ok(md.includes("| Total takes | 5 |"));
  assert.ok(md.includes("`foo`"));
  assert.ok(md.includes("`bar`"));
  assert.ok(md.includes("## Recommendation legend"));
  assert.ok(md.includes("## Re-run"));
});

test("renderMd: takeup-wiring-broken signal renders an explainer section", () => {
  const audit = summarize({
    totalFires: 500,
    byClassifier: { x: 500 },
  });
  const md = renderMd(audit);
  assert.ok(md.includes("⚠ Health signal: takeup-wiring-broken"));
  assert.ok(md.includes("mcp-route-takeup.mjs"));
});

test("renderMd: below-target-take-rate signal renders the corresponding banner", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { x: 1000 },
    takeupTotals: { byClassifier: { x: 30 } },
  });
  const md = renderMd(audit);
  assert.ok(md.includes("Health signal: below-target-take-rate"));
  assert.ok(md.includes("U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND"));
});

// ---- evaluations denominator + genuine-low-take-rate (U-TAKEUP-EVAL-DENOMINATOR) ----

test("summarize: 0 takes WITH evaluations>0 -> genuine-low-take-rate (NOT wiring-broken)", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { backendAuditChain: 800, doctrineSurface: 200 },
    takeupTotals: { evaluations: 12 }, // credit path exercised 12x, 0 credited in-window
  });
  assert.equal(audit.summary.totalTakes, 0);
  assert.equal(audit.summary.evaluations, 12);
  assert.equal(audit.summary.healthSignal, "genuine-low-take-rate");
});

test("summarize: 0 takes WITHOUT evaluations -> takeup-wiring-broken preserved (cause unproven)", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { x: 1000 },
  });
  assert.equal(audit.summary.totalTakes, 0);
  assert.equal(audit.summary.evaluations, 0);
  assert.equal(audit.summary.healthSignal, "takeup-wiring-broken");
});

test("summarize: evaluations is surfaced in the summary (default 0)", () => {
  assert.equal(summarize({ totalFires: 5, byClassifier: { a: 5 } }).summary.evaluations, 0);
  assert.equal(summarize({ totalFires: 5, byClassifier: { a: 5 }, takeupTotals: { evaluations: 3 } }).summary.evaluations, 3);
});

test("summarize: real takes still win over evaluations (below-target-take-rate)", () => {
  // evaluations present AND a real (sub-target) take-rate -> below-target wins, NOT genuine-low.
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { x: 1000 },
    takeupTotals: { evaluations: 40, byClassifier: { x: 20 } },
  });
  assert.equal(audit.summary.totalTakes, 20);
  assert.equal(audit.summary.healthSignal, "below-target-take-rate");
});

test("renderMd: genuine-low-take-rate signal renders its explainer + evaluations row", () => {
  const audit = summarize({
    totalFires: 667,
    byClassifier: { isVerboseBash: 346, isLargeRead: 206 },
    takeupTotals: { evaluations: 9 },
  });
  const md = renderMd(audit);
  assert.ok(md.includes("Health signal: genuine-low-take-rate"));
  assert.ok(md.includes("PROVEN LIVE"));
  assert.ok(md.includes("| Evaluations (credit-path exercised) | 9 |"));
});

// ---- suppress-candidate advisory verdict (U-CLASSIFY-SUPPRESS-CANDIDATE) ----
// A dominant 0-take classifier whose credit path is PROVEN LIVE (fleet evaluations>0) is genuine
// net-cost, not a measurement artifact -> graded suppress-candidate (ADVISORY; the decay actor
// matches recommendation==='suppress' EXACTLY + needs takes>0, so it ignores this -> nudges keep
// firing). evaluations===0 keeps the protective verify-wiring verdict.

test("classify: dominant 0-take + evaluations>0 -> suppress-candidate (proven net-cost, advisory)", () => {
  // 368/672 = 55% share, 0 takes, fires>=50, fleet credit path exercised.
  assert.equal(classify({ fires: 368, takes: 0, totalFires: 672, evaluations: 9 }), "suppress-candidate");
});

test("classify: 0-take + evaluations===0 (or absent) -> verify-wiring preserved (cause unproven, backward-compat)", () => {
  assert.equal(classify({ fires: 368, takes: 0, totalFires: 672, evaluations: 0 }), "verify-wiring");
  // Old callers pass no evaluations field at all -> defaults to 0 -> unchanged verdict.
  assert.equal(classify({ fires: 368, takes: 0, totalFires: 672 }), "verify-wiring");
});

test("classify: 0-take + evaluations>0 but NON-dominant (<30% share) -> verify-wiring (not a candidate)", () => {
  // 60/1000 = 6% share, evaluations>0 -> not dominant enough to flag as net-cost.
  assert.equal(classify({ fires: 60, takes: 0, totalFires: 1000, evaluations: 9 }), "verify-wiring");
});

test("classify: takes>0 with evaluations>0 -> evaluations does NOT hijack the real-take path", () => {
  // A real (sub-target, dominant) take-rate is still 'suppress'; evaluations only governs the 0-take case.
  assert.equal(classify({ fires: 400, takes: 16, totalFires: 1000, evaluations: 50 }), "suppress");
  // keep-by-rate still wins when take-rate is healthy.
  assert.equal(classify({ fires: 100, takes: 40, totalFires: 1000, evaluations: 50 }), "keep");
});

test("summarize: dominant 0-take row with fleet evaluations>0 grades suppress-candidate", () => {
  const audit = summarize({
    totalFires: 672,
    byClassifier: { isVerboseBash: 368, isLargeRead: 206 },
    takeupTotals: { evaluations: 9 }, // fleet credit path proven live, 0 credited
  });
  const dom = audit.rows.find((r) => r.classifier === "isVerboseBash");
  assert.equal(dom.takes, 0);
  assert.equal(dom.recommendation, "suppress-candidate");
  // Without evaluations the SAME data must stay verify-wiring (the advisory only fires when proven live).
  const audit0 = summarize({ totalFires: 672, byClassifier: { isVerboseBash: 368, isLargeRead: 206 } });
  assert.equal(audit0.rows.find((r) => r.classifier === "isVerboseBash").recommendation, "verify-wiring");
});

test("renderMd: legend documents suppress-candidate as advisory / not auto-decayed", () => {
  const audit = summarize({
    totalFires: 672,
    byClassifier: { isVerboseBash: 368 },
    takeupTotals: { evaluations: 9 },
  });
  const md = renderMd(audit);
  assert.ok(md.includes("suppress-candidate"), "legend + the row must surface the new verdict");
  assert.ok(md.includes("NOT auto-decayed"), "must make the advisory-only guarantee explicit");
});

// ---- verify-wiring legend honesty (U-AUDIT-LEGEND-HONESTY, 2026-06-20, slot:alpha) ----
// classify() emits verify-wiring for a 0-take fires>=50 classifier that is NOT graded
// suppress-candidate -- which is EITHER evaluations===0 (cause unproven) OR evaluations>0 but
// non-dominant (<30% share, the deliberately-locked case at line 229). The old rendered legend
// claimed verify-wiring == "credit path NOT yet exercised (evaluations===0)" ONLY, which
// misdirects an operator reading a `genuine-low-take-rate` dashboard (evaluations>0, PROVEN LIVE)
// to go "verify wiring" that is actually proven for a sub-dominant classifier. This locks the
// legend to describe BOTH causes. Doc/string-only -- it does NOT change classify() behaviour.

test("renderMd: verify-wiring legend covers BOTH causes (evaluations===0 AND non-dominant-proven)", () => {
  const audit = summarize({
    totalFires: 1000,
    byClassifier: { isLargeRead: 287 },     // 28.7% share -> non-dominant
    takeupTotals: { evaluations: 26 },       // credit path PROVEN LIVE fleet-wide
  });
  // The row itself must STILL be verify-wiring (the deliberate non-dominant choice is preserved).
  const row = audit.rows.find((r) => r.classifier === "isLargeRead");
  assert.equal(row.recommendation, "verify-wiring");
  assert.equal(audit.summary.healthSignal, "genuine-low-take-rate");

  const md = renderMd(audit);
  const vwLine = md.split("\n").find((l) => l.startsWith("- **verify-wiring**"));
  assert.ok(vwLine, "verify-wiring legend line must be present");
  // Honesty: the legend must acknowledge the non-dominant proven-credit-path cause, not ONLY
  // evaluations===0. Both substrings live on the single legend line (precise, non-tautological).
  assert.ok(vwLine.includes("non-dominant"), "legend must surface the non-dominant proven cause");
  assert.ok(vwLine.includes("evaluations>0"), "legend must acknowledge verify-wiring also covers evaluations>0");
  assert.ok(vwLine.includes("evaluations===0"), "legend must still name the unexercised (evaluations===0) cause");
});
