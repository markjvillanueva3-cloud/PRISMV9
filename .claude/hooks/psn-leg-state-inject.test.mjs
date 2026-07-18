#!/usr/bin/env node
/**
 * psn-leg-state-inject.test.mjs — pin the per-leg health predicates +
 * formatLegState render for U-PSN-LEG-STATE-INJECT (golf 2026-05-24).
 *
 * Each leg's predicate is pure (takes `now` + stat + optional doc).
 * Tests pin: happy/silent · stale-by-time · missing · render markers.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  shouldInject,
  legStateMemories,
  legStateSystemViz,
  legStateNnGraph,
  legStateWiki,
  legStateTribal,
  legStateEngines,
  formatLegState,
  exemplarLegNamesFromEntry,
  psnLegCoverageGauge,
  formatCoverageGauge,
  PSN_TOTAL_LEGS,
  legOwnerForLabel,
  PSN_LEG_OWNER_SLOT,
  LEG_LABEL_TO_KEY,
} from "./psn-leg-state-inject.mjs";
// Drift-guard source of truth — the collector's canonical leg→slot ownership.
// Imported test-time only (the collector has an invokedDirectly guard, so this
// does NOT run its main()); the hook keeps a fast local mirror.
import { PSN_LEG_OWNER as COLLECTOR_PSN_LEG_OWNER } from "../../scripts/psn-synergy-collect.mjs";

const NOW = 1_716_500_000_000; // fixed Date.now() for determinism
const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

/* ---------- shouldInject (same as CHECKLIST — mirror tests) ---------- */

describe("shouldInject — gating heuristic", () => {
  it("fires on substantive prompt", () => {
    assert.equal(shouldInject("can you check the NN-GRAPH state for me please"), true);
  });
  it("skips short prompts", () => {
    assert.equal(shouldInject("ok"), false);
  });
  it("skips bare slash-commands", () => {
    assert.equal(shouldInject("/system-viz"), false);
  });
  it("honors opts.enabled = false", () => {
    assert.equal(shouldInject("a long enough prompt for the gate", { enabled: false }), false);
  });
});

/* ---------- legStateMemories ---------- */

describe("legStateMemories", () => {
  it("HEALTHY: recent memory mtime → null (no concern, no inject)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    assert.equal(legStateMemories(NOW, stat), null);
  });
  it("STALE: mtime >7d old → reports STALE with day-age", () => {
    const stat = { mtimeMs: NOW - 10 * MS_DAY };
    const r = legStateMemories(NOW, stat);
    assert.ok(r);
    assert.equal(r.status, "STALE");
    assert.match(r.detail, /10d old/);
    assert.match(r.detail, /Stop hook/);
  });
  it("MISSING: null stat → reports MISSING", () => {
    const r = legStateMemories(NOW, null);
    assert.ok(r);
    assert.equal(r.status, "MISSING");
    assert.match(r.detail, /memory dir not found/);
  });
  it("BOUNDARY: exactly 7d old → still HEALTHY (rule is >7d)", () => {
    const stat = { mtimeMs: NOW - 7 * MS_DAY };
    assert.equal(legStateMemories(NOW, stat), null);
  });
});

/* ---------- legStateSystemViz ---------- */

describe("legStateSystemViz", () => {
  it("HEALTHY: graph mtime under 12h → null", () => {
    const stat = { mtimeMs: NOW - 6 * MS_HOUR };
    assert.equal(legStateSystemViz(NOW, stat), null);
  });
  it("STALE: graph >12h old → reports STALE with hour-age + regen hint", () => {
    const stat = { mtimeMs: NOW - 25 * MS_HOUR };
    const r = legStateSystemViz(NOW, stat);
    assert.ok(r);
    assert.equal(r.status, "STALE");
    assert.match(r.detail, /25h old/);
    assert.match(r.detail, /regen-viz\.mjs/);
  });
  it("MISSING: null stat → reports MISSING with regen hint", () => {
    const r = legStateSystemViz(NOW, null);
    assert.ok(r);
    assert.equal(r.status, "MISSING");
    assert.match(r.detail, /system-graph\.json not found/);
    assert.match(r.detail, /regen-viz\.mjs/);
  });
});

/* ---------- legStateNnGraph ---------- */

describe("legStateNnGraph", () => {
  it("HEALTHY: AUROC ≥ 0.78 → null", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { auroc: 0.82, brier: 0.10 };
    assert.equal(legStateNnGraph(NOW, stat, doc), null);
  });
  it("BELOW-GATE: AUROC < 0.78 → reports with formatted score", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { auroc: 0.096 };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r);
    assert.equal(r.status, "BELOW-GATE");
    assert.match(r.detail, /0\.096/);
    assert.match(r.detail, /0\.78 deploy gate/);
  });
  it("DEGENERATE: below-gate AND eval-marked degenerate → DEGENERATE status, not generic BELOW-GATE (U-NN-DEGENERACY-HOOK-SURFACE)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { deferred: false, metrics: { auroc: 0.5, brier: 0.26 },
      degeneracy: { isDegenerate: true, mode: "constant-vote" } };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r);
    assert.equal(r.status, "DEGENERATE");
    assert.match(r.detail, /tie-break artifact/);
    assert.match(r.detail, /constant-vote/);
    assert.match(r.detail, /not a near-miss/i);
  });
  it("BELOW-GATE stays BELOW-GATE when NOT degenerate (no degeneracy field)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const r = legStateNnGraph(NOW, stat, { deferred: false, metrics: { auroc: 0.6, brier: 0.12 } });
    assert.ok(r);
    assert.equal(r.status, "BELOW-GATE", "no degeneracy field → ordinary below-gate");
  });
  it("SELECTIVE-DEPLOY: AUROC≥gate, Brier fails, but selective.deployGrade.pass → SELECTIVE-DEPLOY, not the false 'tier-5 dormant' (U-GNN-SELECTIVE-DEPLOY)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = {
      deferred: false,
      metrics: { auroc: 0.8084, macroF1: 0.4389, brier: 0.179 },
      grade: { pass: false, verdict: "shipped-research-only" },
      selective: { deployGrade: { pass: true, concentrated: true, operatingPoint: { tau: 0.7, coverage: 0.3226, brier: 0.0406, macroF1: 1, classesEmitted: 2, totalClasses: 6 } } },
    };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r);
    assert.equal(r.status, "SELECTIVE-DEPLOY");
    assert.match(r.detail, /deploy-ready-selective/);
    assert.match(r.detail, /32% coverage/);
    assert.match(r.detail, /τ=0\.7/);
    assert.match(r.detail, /spans 2\/6 classes \(concentrated\)/);
    // Regression guard: must NOT claim the tier is dormant — it contributes on 32%.
    assert.doesNotMatch(r.detail, /tier-5 dormant/);
  });
  it("BELOW-GATE when Brier fails AND no selective deploy (back-compat)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { deferred: false, metrics: { auroc: 0.82, brier: 0.179 } };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r);
    assert.equal(r.status, "BELOW-GATE");
    assert.match(r.detail, /tier-5 dormant/);
  });
  it("UNGRADED: not deferred + no measurable AUROC → reports UNGRADED (no fabricated cause)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const r1 = legStateNnGraph(NOW, stat, { auroc: NaN });
    const r2 = legStateNnGraph(NOW, stat, { auroc: null });
    const r3 = legStateNnGraph(NOW, stat, {});
    for (const r of [r1, r2, r3]) {
      assert.ok(r);
      assert.equal(r.status, "UNGRADED");
      assert.match(r.detail, /not yet graded/);
      // Regression guard: the old code injected a fabricated "embeddingSource
      // mismatch" hypothesis — it must never reappear (U-NN-LEG-SCHEMA-READ-FIX).
      assert.doesNotMatch(r.detail, /embeddingSource/);
    }
  });
  it("MISSING: missing stat OR missing evalDoc → reports MISSING", () => {
    const r1 = legStateNnGraph(NOW, null, { auroc: 0.9 });
    const r2 = legStateNnGraph(NOW, { mtimeMs: NOW }, null);
    for (const r of [r1, r2]) {
      assert.ok(r);
      assert.equal(r.status, "MISSING");
      assert.match(r.detail, /NN-EVAL\.json not found/);
    }
  });
  it("BOUNDARY: AUROC exactly 0.78 → HEALTHY (rule is < 0.78)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    assert.equal(legStateNnGraph(NOW, stat, { auroc: 0.78 }), null);
  });

  /* ----- REAL nested NN-EVAL.json schema ({deferred,reason,checkpointMeta}) -----
   * The flat {auroc} cases above exercise the legacy/top-level fallback; these
   * pin the production schema the canonical classifyGnn reads. */
  it("DEFERRED: deferred grading reports the REAL reason + sub-gate AUROC (not embeddingSource)", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = {
      deferred: true,
      reason: "insufficient-reference-pool",
      checkpointPresent: true,
      poolSize: 0,
      checkpointMeta: { auroc: 0.09607579891061868, brierCalibrated: 0.249 },
    };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r);
    assert.equal(r.status, "DEFERRED");
    assert.match(r.detail, /0\.096/);                       // sub-gate AUROC surfaced
    assert.match(r.detail, /insufficient-reference-pool/);  // REAL reason
    assert.match(r.detail, /reference pool empty/);         // poolSize 0
    assert.doesNotMatch(r.detail, /embeddingSource/);       // no fabricated cause
  });
  it("BELOW-GATE: nested checkpointMeta.auroc < 0.78, not deferred → BELOW-GATE", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { deferred: false, checkpointPresent: true, checkpointMeta: { auroc: 0.5 } };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r);
    assert.equal(r.status, "BELOW-GATE");
    assert.match(r.detail, /0\.500/);
  });
  it("HEALTHY: nested checkpointMeta.auroc ≥ 0.78 + brier within gate, not deferred → null", () => {
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { deferred: false, checkpointPresent: true, checkpointMeta: { auroc: 0.82, brierCalibrated: 0.10 } };
    assert.equal(legStateNnGraph(NOW, stat, doc), null);
  });
  it("BELOW-GATE: AUROC passes but Brier fails calibration gate → NOT silently healthy", () => {
    // Deploy decision gates on AUROC *and* Brier (classifyGnn.healthy). A
    // checkpoint that clears AUROC but fails calibration must not be certified.
    const stat = { mtimeMs: NOW - MS_HOUR };
    const doc = { deferred: false, checkpointPresent: true, checkpointMeta: { auroc: 0.82, brierCalibrated: 0.30 } };
    const r = legStateNnGraph(NOW, stat, doc);
    assert.ok(r, "auroc-pass + brier-fail must surface, not be silent");
    assert.equal(r.status, "BELOW-GATE");
    assert.match(r.detail, /0\.820/);            // auroc reported as ok
    assert.match(r.detail, /Brier 0\.300/);      // the real failing gate
    assert.match(r.detail, /calibration gate/);
  });
  it("REAL-DATA: the on-disk NN-EVAL.json classifies cleanly (anti-drift guard)", () => {
    // Reads the ACTUAL production eval doc. If the schema ever drifts again so
    // that AUROC is unreadable, this fails LOUD instead of silently mis-reporting
    // (the exact regression U-NN-LEG-SCHEMA-READ-FIX closed). Skips gracefully
    // when the file is absent (CI without nn-graph state).
    const here = dirname(fileURLToPath(import.meta.url));
    const evalPath = join(here, "..", "..", "state", "shared", "nn-graph", "NN-EVAL.json");
    let doc, stat;
    try { stat = statSync(evalPath); doc = JSON.parse(readFileSync(evalPath, "utf8")); }
    catch { return; } // file absent → nothing to assert
    const r = legStateNnGraph(NOW, stat, doc);
    // Whatever the state, it must be one of the real statuses — never the old
    // "AUROC not finite / embeddingSource mismatch" when a checkpointMeta exists.
    if (r) {
      assert.ok(["DEFERRED", "BELOW-GATE", "DEGENERATE", "UNGRADED", "MISSING", "SELECTIVE-DEPLOY"].includes(r.status));
      if (doc.checkpointMeta && Number.isFinite(Number(doc.checkpointMeta.auroc))) {
        assert.notEqual(r.status, "UNGRADED"); // a real AUROC must be read, not missed
        assert.doesNotMatch(r.detail, /embeddingSource/);
      }
    }
  });
});

/* ---------- legStateWiki (iter 7) ---------- */

describe("legStateWiki", () => {
  it("HEALTHY: broken < threshold → null", () => {
    assert.equal(legStateWiki({ broken_count: 100 }, { brokenThreshold: 5000 }), null);
  });
  it("BROKEN-LINKS: broken > threshold → reports count + remedy", () => {
    const r = legStateWiki({ broken_count: 8000 }, { brokenThreshold: 5000 });
    assert.ok(r);
    assert.equal(r.status, "BROKEN-LINKS");
    assert.match(r.detail, /8000/);
    assert.match(r.detail, /knowledge-link-audit/);
  });
  it("MISSING: null audit → reports MISSING", () => {
    const r = legStateWiki(null);
    assert.ok(r);
    assert.equal(r.status, "MISSING");
    assert.match(r.detail, /knowledge-link-audit/);
  });
  it("accepts both broken_count and brokenCount (key variants)", () => {
    assert.ok(legStateWiki({ brokenCount: 10000 }, { brokenThreshold: 5000 }));
  });
  it("BOUNDARY: broken === threshold → still HEALTHY (rule is >)", () => {
    assert.equal(legStateWiki({ broken_count: 5000 }, { brokenThreshold: 5000 }), null);
  });
  it("ignores non-numeric broken_count gracefully", () => {
    assert.equal(legStateWiki({ broken_count: "many" }), null);
  });
});

/* ---------- legStateTribal (iter 7) ---------- */

describe("legStateTribal", () => {
  it("HEALTHY: tribal dir mtime under 30d → null", () => {
    assert.equal(legStateTribal(NOW, { mtimeMs: NOW - 10 * MS_DAY }), null);
  });
  it("STALE: tribal mtime >30d → reports day-age + harvest hint", () => {
    const r = legStateTribal(NOW, { mtimeMs: NOW - 45 * MS_DAY });
    assert.ok(r);
    assert.equal(r.status, "STALE");
    assert.match(r.detail, /45d old/);
    assert.match(r.detail, /distill-tribal|wiki-harvest/);
  });
  it("MISSING: null stat → reports MISSING", () => {
    const r = legStateTribal(NOW, null);
    assert.ok(r);
    assert.equal(r.status, "MISSING");
    assert.match(r.detail, /tribal corpus dir not found/);
  });
});

/* ---------- legStateEngines (iter 7) ---------- */

describe("legStateEngines", () => {
  it("HEALTHY: unwired count under threshold → null", () => {
    const md = "**2763 engines wired** · **593 unwired** · 2876 units pending";
    assert.equal(legStateEngines(md, { unwiredThreshold: 700 }), null);
  });
  it("UNWIRED-DRIFT: unwired > threshold → reports count + remedy", () => {
    const md = "**2763 engines wired** · **850 unwired** · 2876 units pending";
    const r = legStateEngines(md, { unwiredThreshold: 700 });
    assert.ok(r);
    assert.equal(r.status, "UNWIRED-DRIFT");
    assert.match(r.detail, /850/);
    assert.match(r.detail, /\/wire-unwired/);
  });
  it("HONORS alternate phrasings (NEEDS_WIRING / 'engines with no dispatcher')", () => {
    assert.ok(legStateEngines("899 NEEDS_WIRING", { unwiredThreshold: 100 }));
    assert.ok(legStateEngines("750 engines with no dispatcher reference", { unwiredThreshold: 100 }));
  });
  it("MISSING: null/empty inventory → reports MISSING", () => {
    const r1 = legStateEngines(null);
    const r2 = legStateEngines("");
    for (const r of [r1, r2]) {
      assert.ok(r);
      assert.equal(r.status, "MISSING");
      assert.match(r.detail, /PRISM-INVENTORY-LATEST\.md/);
    }
  });
  it("returns null on inventory without an unwired count (don't fabricate)", () => {
    assert.equal(legStateEngines("the inventory has no unwired metric"), null);
  });
  it("BOUNDARY: unwired === threshold → still HEALTHY", () => {
    const md = "**500 unwired**";
    assert.equal(legStateEngines(md, { unwiredThreshold: 500 }), null);
  });
});

/* ---------- formatLegState ---------- */

describe("formatLegState", () => {
  it("returns null when ALL legs healthy (silent — no inject)", () => {
    assert.equal(formatLegState([null, null, null]), null);
    assert.equal(formatLegState([]), null);
  });
  it("includes stable header anchor for concerning legs", () => {
    const out = formatLegState([{ leg: "X", status: "STALE", detail: "y" }]);
    assert.match(out, /## 🩺 PSN-LEG-STATE/);
  });
  it("lists ALL concerning legs (filters nulls, preserves order)", () => {
    const states = [
      { leg: "A", status: "STALE", detail: "alpha-detail" },
      null,
      { leg: "B", status: "MISSING", detail: "bravo-detail" },
    ];
    const out = formatLegState(states);
    assert.match(out, /\*\*A\*\* \[STALE\] — alpha-detail/);
    assert.match(out, /\*\*B\*\* \[MISSING\] — bravo-detail/);
    // Order preserved (A before B)
    assert.ok(out.indexOf("alpha-detail") < out.indexOf("bravo-detail"));
  });
  it("includes canonical reference + kill-switch", () => {
    const out = formatLegState([{ leg: "X", status: "S", detail: "d" }]);
    assert.match(out, /\[\[feedback_psn_definition\]\]/);
    assert.match(out, /PRISM_PSN_LEG_STATE_INJECT_DISABLE=1/);
  });
  it("stays compact — under 1500 chars on a single concerning leg", () => {
    const out = formatLegState([{ leg: "Memories (#4)", status: "STALE", detail: "most-recent memo 10d old (auto-feed Stop hook may be unwired)" }]);
    assert.ok(out.length < 1500, `output length ${out.length} exceeds 1500-char ceiling`);
  });
});

/* ---------- coverage gauge (U-FLEET-P6-PSN-LEG-COVERAGE-DIAL) ---------- */

describe("exemplarLegNamesFromEntry — extract consulted legs from a ledger record", () => {
  it("Shape A: legs[] with hits → distinct leg names, empty-hit legs excluded", () => {
    const entry = {
      kind: "octopus-consensus",
      psnExemplars: {
        legs: [
          { name: "wiki", hits: [{ text: "x", score: 0.5 }] },
          { name: "tribal", hits: [{ text: "y", score: 0.3 }, { text: "z", score: 0.1 }] },
          { name: "skills", hits: [] }, // empty → must NOT count
        ],
      },
    };
    const names = exemplarLegNamesFromEntry(entry);
    assert.deepEqual(names.sort(), ["tribal", "wiki"]);
    assert.ok(!names.includes("skills"), "empty-hit leg must not inflate coverage");
  });
  it("Shape B: flat object keyed by leg → leg names with non-empty arrays", () => {
    const entry = { psnExemplars: { wiki: ["a"], memories: ["b", "c"], skills: [] } };
    const names = exemplarLegNamesFromEntry(entry).sort();
    assert.deepEqual(names, ["memories", "wiki"]);
  });
  it("FAILURE: null / no psnExemplars / non-object → [] (never throws)", () => {
    assert.deepEqual(exemplarLegNamesFromEntry(null), []);
    assert.deepEqual(exemplarLegNamesFromEntry({}), []);
    assert.deepEqual(exemplarLegNamesFromEntry({ psnExemplars: null }), []);
    assert.deepEqual(exemplarLegNamesFromEntry("not an object"), []);
  });
  it("ADVERSARIAL: malformed leg entries (null leg, non-string name, missing hits) skipped", () => {
    const entry = {
      psnExemplars: {
        legs: [
          null,
          { name: 42, hits: [{ text: "x" }] },     // non-string name → skip
          { name: "  ", hits: [{ text: "y" }] },    // blank name → skip
          { name: "wiki", hits: "notarray" },       // hits not array → skip
          { name: "memories", hits: [{ text: "ok" }] }, // valid
        ],
      },
    };
    assert.deepEqual(exemplarLegNamesFromEntry(entry), ["memories"]);
  });
  it("ADVERSARIAL: duplicate leg names collapse to one", () => {
    const entry = {
      psnExemplars: {
        legs: [
          { name: "wiki", hits: [{ text: "a" }] },
          { name: "wiki", hits: [{ text: "b" }] },
        ],
      },
    };
    assert.deepEqual(exemplarLegNamesFromEntry(entry), ["wiki"]);
  });
});

describe("psnLegCoverageGauge — N/11 dial", () => {
  it("HAPPY (substrate-config): no ledger legs → loader leg set / PSN_TOTAL_LEGS", () => {
    const g = psnLegCoverageGauge({ loaderLegSet: ["wiki", "memories", "skills", "tribal", "master_index"] });
    assert.equal(g.consulted, 5);
    assert.equal(g.total, PSN_TOTAL_LEGS);
    assert.equal(g.total, 11);
    assert.equal(g.source, "substrate-config");
    assert.deepEqual(g.legs.sort(), ["master_index", "memories", "skills", "tribal", "wiki"]);
  });
  it("HAPPY (ledger): ledger legs present → empirical consulted count, source=ledger", () => {
    const g = psnLegCoverageGauge({
      loaderLegSet: ["wiki", "memories", "skills", "tribal", "master_index"],
      ledgerLegNames: ["wiki", "tribal", "master_index"],
    });
    assert.equal(g.consulted, 3);
    assert.equal(g.total, 11);
    assert.equal(g.source, "ledger");
  });
  it("FAILURE (empty ledger array): falls back to substrate-config", () => {
    const g = psnLegCoverageGauge({ loaderLegSet: ["wiki", "skills"], ledgerLegNames: [] });
    assert.equal(g.consulted, 2);
    assert.equal(g.source, "substrate-config");
  });
  it("FAILURE (no loaderLegSet, no ledger): 0/11, never throws", () => {
    const g = psnLegCoverageGauge({});
    assert.equal(g.consulted, 0);
    assert.equal(g.total, 11);
    assert.deepEqual(g.legs, []);
    assert.equal(g.source, "substrate-config");
  });
  it("FAILURE (no args at all): defaults to 0/11", () => {
    const g = psnLegCoverageGauge();
    assert.equal(g.consulted, 0);
    assert.equal(g.total, 11);
  });
  it("ADVERSARIAL: ledger legs exceed total → consulted clamped to total (never >100%)", () => {
    const g = psnLegCoverageGauge({
      loaderLegSet: ["wiki"],
      ledgerLegNames: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"], // 13 > 11
      totalLegs: 11,
    });
    assert.equal(g.consulted, 11, "must clamp to taxonomy size");
    assert.equal(g.source, "ledger");
  });
  it("ADVERSARIAL: non-string / blank entries in leg sets are filtered", () => {
    const g = psnLegCoverageGauge({
      loaderLegSet: ["wiki", "", "  ", 42, null, "skills"],
      ledgerLegNames: undefined,
    });
    assert.equal(g.consulted, 2);
    assert.deepEqual(g.legs.sort(), ["skills", "wiki"]);
  });
  it("respects a custom totalLegs override (forward-compat if taxonomy grows)", () => {
    const g = psnLegCoverageGauge({ loaderLegSet: ["wiki", "tribal"], totalLegs: 12 });
    assert.equal(g.total, 12);
    assert.equal(g.consulted, 2);
  });
});

describe("formatCoverageGauge — ALWAYS-ON render (not silent like formatLegState)", () => {
  it("renders the N/11 dial with a stable header anchor", () => {
    const out = formatCoverageGauge({ consulted: 5, total: 11, legs: ["wiki", "tribal"], source: "ledger" });
    assert.ok(out, "gauge must render even when all legs healthy (always-on)");
    assert.match(out, /## 🐙 PSN-LEG-COVERAGE/);
    assert.match(out, /5\/11 PSN legs/);
    assert.match(out, /last octopus run/);
  });
  it("substrate-config source renders 'substrate config' label", () => {
    const out = formatCoverageGauge({ consulted: 5, total: 11, legs: ["wiki"], source: "substrate-config" });
    assert.match(out, /substrate config/);
    assert.match(out, /PRISM_PSN_LEG_COVERAGE_GAUGE=1/);
  });
  it("renders 0/11 with '(none)' when no legs consulted (never blank)", () => {
    const out = formatCoverageGauge({ consulted: 0, total: 11, legs: [], source: "substrate-config" });
    assert.match(out, /0\/11 PSN legs/);
    assert.match(out, /\(none\)/);
  });
  it("FAILURE: malformed gauge (null / non-finite / total<=0) → null (no inject)", () => {
    assert.equal(formatCoverageGauge(null), null);
    assert.equal(formatCoverageGauge({ consulted: NaN, total: 11, legs: [], source: "ledger" }), null);
    assert.equal(formatCoverageGauge({ consulted: 5, total: 0, legs: [], source: "ledger" }), null);
    assert.equal(formatCoverageGauge("not an object"), null);
  });
  it("round-trips with psnLegCoverageGauge end-to-end", () => {
    const g = psnLegCoverageGauge({ loaderLegSet: ["wiki", "memories", "skills", "tribal", "master_index"] });
    const out = formatCoverageGauge(g);
    assert.match(out, /5\/11 PSN legs/);
  });
});

/* ---------- knob gating (default-OFF behavior contract) ---------- */

describe("PRISM_PSN_LEG_COVERAGE_GAUGE knob — default OFF = zero behavior change", () => {
  const HOOK = fileURLToPath(new URL("./psn-leg-state-inject.mjs", import.meta.url));
  const PROMPT = JSON.stringify({ prompt: "explain the kienzle specific cutting force model used in milling please" });

  function runHook(env) {
    const res = spawnSync(process.execPath, [HOOK], {
      input: PROMPT,
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    return res.stdout || "";
  }

  it("knob UNSET → output never contains the coverage gauge header", () => {
    const out = runHook({ PRISM_PSN_LEG_COVERAGE_GAUGE: "" });
    assert.ok(!out.includes("PSN-LEG-COVERAGE"), "gauge must be absent when knob is OFF (default)");
  });

  it("knob=1 → output contains the always-on N/11 coverage gauge", () => {
    const out = runHook({ PRISM_PSN_LEG_COVERAGE_GAUGE: "1" });
    assert.ok(out.includes("PSN-LEG-COVERAGE"), "gauge must render when knob is ON");
    assert.match(out, /\/11 PSN legs/);
  });

  it("knob=anything-but-1 (e.g. 'true', '0') → treated as OFF (strict ===\"1\")", () => {
    for (const v of ["true", "0", "yes", "on"]) {
      const out = runHook({ PRISM_PSN_LEG_COVERAGE_GAUGE: v });
      assert.ok(!out.includes("PSN-LEG-COVERAGE"), `knob='${v}' must NOT enable the gauge (strict ==='1')`);
    }
  });
});

/* ---------- leg → owner-slot routing (Bridge#7 loop-closure) ---------- */

describe("legOwnerForLabel — PSN leg-health owner routing", () => {
  it("resolves EVERY leg label this hook can surface to a real owner slot", () => {
    // Drive each predicate to its MISSING branch to capture the exact label it
    // emits, then assert that label routes to an owner. If a future leg predicate
    // adds a new label, this fails until LEG_LABEL_TO_KEY covers it.
    const labels = [
      legStateWiki(null).leg,
      legStateMemories(NOW, null).leg,
      legStateTribal(NOW, null).leg,
      legStateSystemViz(NOW, null).leg,
      legStateEngines(null).leg,
      legStateNnGraph(NOW, null, null).leg,
    ];
    for (const label of labels) {
      const owner = legOwnerForLabel(label);
      assert.ok(owner && typeof owner === "string",
        `leg label "${label}" must resolve to an owner slot (add it to LEG_LABEL_TO_KEY)`);
    }
  });

  it("routes each surfaced leg to its canonical domain owner", () => {
    assert.equal(legOwnerForLabel("NN/GNN (#10)"), "india");
    assert.equal(legOwnerForLabel("System Viz (#6)"), "sierra");
    assert.equal(legOwnerForLabel("Tribal (#5)"), "golf");
    assert.equal(legOwnerForLabel("Engines (#7)"), "papa");
    assert.equal(legOwnerForLabel("Wiki (#3)"), "alpha");
    assert.equal(legOwnerForLabel("Memories (#4)"), "alpha");
  });

  it("returns null for unknown / non-string labels (never throws)", () => {
    assert.equal(legOwnerForLabel("Bogus (#99)"), null);
    assert.equal(legOwnerForLabel(""), null);
    assert.equal(legOwnerForLabel(null), null);
    assert.equal(legOwnerForLabel(undefined), null);
    assert.equal(legOwnerForLabel(42), null);
  });

  it("DRIFT GUARD: local owner mirror is identical to collector PSN_LEG_OWNER (single source of truth)", () => {
    // The hook keeps a LOCAL mirror to avoid importing the 850-line collector on
    // every prompt; THIS test is what makes that mirror safe — it fails the moment
    // the collector's ownership changes without the hook mirror following.
    assert.deepEqual(
      PSN_LEG_OWNER_SLOT,
      COLLECTOR_PSN_LEG_OWNER,
      "PSN_LEG_OWNER_SLOT (hook mirror) diverged from PSN_LEG_OWNER (collector source of truth)"
    );
  });

  it("every LEG_LABEL_TO_KEY value is a real collector leg key", () => {
    for (const [label, key] of Object.entries(LEG_LABEL_TO_KEY)) {
      assert.ok(key in COLLECTOR_PSN_LEG_OWNER,
        `LEG_LABEL_TO_KEY["${label}"] = "${key}" is not a real collector leg key`);
    }
  });
});

describe("formatLegState — owner tag render (Bridge#7)", () => {
  it("appends → owner: `<slot>` to a concerning leg with a known owner", () => {
    const md = formatLegState([
      { leg: "NN/GNN (#10)", status: "DEGENERATE", detail: "collapsed (constant-vote)" },
    ]);
    assert.match(md, /\*\*NN\/GNN \(#10\)\*\* \[DEGENERATE\] — collapsed \(constant-vote\) → owner: `india`/);
  });

  it("omits the owner tag for an unknown leg label (no fabricated owner)", () => {
    const md = formatLegState([{ leg: "Custom (#42)", status: "STALE", detail: "x" }]);
    assert.match(md, /\*\*Custom \(#42\)\*\* \[STALE\] — x$/m);
    assert.ok(!md.includes("→ owner:"), "unknown leg must not emit an owner tag");
  });

  it("footer documents the → owner routing as Bridge#7", () => {
    const md = formatLegState([{ leg: "Wiki (#3)", status: "MISSING", detail: "y" }]);
    assert.match(md, /Bridge#7/);
    assert.match(md, /→ owner: `alpha`/);
  });

  it("still silent when all legs healthy", () => {
    assert.equal(formatLegState([null, null]), null);
  });
});
