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
