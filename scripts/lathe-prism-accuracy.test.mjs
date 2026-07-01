/**
 * lathe-prism-accuracy.test.mjs -- slot:whiskey  [PRISM-vs-.MIN consumer tests]
 * Tests the PURE scorePrismVsMin (the live number needs a Rung C-STEP run; this proves the LOGIC,
 * esp. the cross-source op-type-band normalization that lets wizard "od_rough" pair with .MIN "rough").
 * Run: node scripts/lathe-prism-accuracy.test.mjs   (main is import-guarded, so importing is safe)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scorePrismVsMin } from "./lathe-prism-accuracy.mjs";

// A mock paired .MIN: G96 CSS 656 SFM, one rough cut at 0.0118 IPR.
// parseMinOpParams -> {operation_type:"rough", cutting_speed_m_min ~199.9, feed_mm_rev ~0.2997}
const MIN_ROUGH = "G96 S656\nG0 X1.05 Z0.1\nG1 X1.0 Z-0.5 F0.0118";

test("cross-source vocab normalization: wizard 'od_rough' pairs with .MIN 'rough' and matches", () => {
  // Wizard op-type is "od_rough"; the .MIN extractor emits "rough". Band-normalization must pair them.
  const wizardOps = [{ operation_type: "od_rough", cutting_speed_m_min: 200, feed_mm_rev: 0.30 }];
  const r = scorePrismVsMin(wizardOps, MIN_ROUGH);
  assert.equal(r.n_ops_scored, 1, "od_rough must pair with the .MIN rough op (band-normalized)");
  assert.equal(r.verdict, "match"); // ~200 m/min & ~0.30 mm/rev on both sides -> within +-10%
});

test("a far-off wizard param vs the same .MIN -> 'divergent' (real signal, not always-match)", () => {
  const wizardOps = [{ operation_type: "od_rough", cutting_speed_m_min: 120, feed_mm_rev: 0.15 }]; // ~40% / ~50% off
  const r = scorePrismVsMin(wizardOps, MIN_ROUGH);
  assert.equal(r.n_ops_scored, 1);
  assert.equal(r.verdict, "divergent");
});

test("wizard 'od_finish' pairs with a .MIN finish op (band normalization, finish bucket)", () => {
  const MIN_FIN = "G96 S800\nG1 X0.98 Z-0.6 F0.003"; // finish (IPR 0.003 < 0.006)
  // 800 SFM -> 243.8 m/min; 0.003 IPR -> 0.0762 mm/rev
  const wizardOps = [{ operation_type: "od_finish", cutting_speed_m_min: 243.8, feed_mm_rev: 0.0762 }];
  const r = scorePrismVsMin(wizardOps, MIN_FIN);
  assert.equal(r.n_ops_scored, 1);
  assert.equal(r.verdict, "match");
});

test("no common (band) op -> 'no-scoreable-ops' (no fabricated comparison)", () => {
  // wizard has only a rough op; the .MIN has only a finish op -> different bands -> no pair.
  const r = scorePrismVsMin(
    [{ operation_type: "od_rough", cutting_speed_m_min: 200, feed_mm_rev: 0.30 }],
    "G96 S800\nG1 X0.98 Z-0.6 F0.003", // finish only
  );
  assert.equal(r.n_ops_scored, 0);
  assert.equal(r.verdict, "no-scoreable-ops");
});

test("specialty ops (thread) on both sides are excluded -> no-scoreable-ops", () => {
  const r = scorePrismVsMin(
    [{ operation_type: "thread_single_point", cutting_speed_m_min: 50, feed_mm_rev: 1.5 }],
    "G97 S800\nG1 X0.5 Z-1.0 F0.05 (THREAD)",
  );
  assert.equal(r.n_ops_scored, 0);
  assert.equal(r.verdict, "no-scoreable-ops");
});

test("empty wizard ops / empty .MIN -> no-scoreable-ops, no crash", () => {
  assert.equal(scorePrismVsMin([], MIN_ROUGH).verdict, "no-scoreable-ops");
  assert.equal(scorePrismVsMin([{ operation_type: "od_rough", cutting_speed_m_min: 200, feed_mm_rev: 0.3 }], "").verdict, "no-scoreable-ops");
});

test("representative (default): PRISM od_rough scores vs JM's MEDIAN OD rough, NOT a leading near-center op", () => {
  // A real-shape .MIN: a near-center G97 rough FIRST (genuinely ~2 m/min at X0.04/680rpm), then real OD roughing.
  // strict/k-th pairing would compare PRISM's 200 m/min od_rough against the 2 m/min near-center op (fake huge error).
  // representative pairs against the OD median (~200 m/min) -> the honest verdict.
  const min = [
    "G97 S680 M3", "G0 X0.04 Z0.1", "G1 X0.04 Z-0.2 F0.010",      // near-center rough: tiny dia, ~2 m/min
    "G96 S656 M3", "G0 X1.5 Z0.1", "G1 X1.5 Z-0.5 F0.0118",        // OD rough: 656 SFM ~ 200 m/min, dia 1.5
  ].join("\n");
  const wizardOps = [{ operation_type: "od_rough", cutting_speed_m_min: 200, feed_mm_rev: 0.30 }];
  const rep = scorePrismVsMin(wizardOps, min);              // representative (default)
  assert.equal(rep.verdict, "match", "vs the OD median ~200 m/min, PRISM 200 m/min matches");
  const strict = scorePrismVsMin(wizardOps, min, { strict: true }); // k-th pairing hits the near-center op first
  assert.equal(strict.verdict, "divergent", "strict mode confounded by the leading near-center op -> false divergence");
});
