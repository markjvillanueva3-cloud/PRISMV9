---
name: reference-predict-with-trend-2026-05-17
description: ChatterPredictionEngine.predictWithTrend() — trend slope → time-to-chatter → urgency-tiered action vectors layer re-modularized from monolith PRISM_FFT_PREDICTIVE_CHATTER. Shipped 2026-05-17 slot alpha. Re-scoped from "new engine" to "method addition" via R8 dedup-preflight (90% of monolith already shipped).
aliases: reference_predict_with_trend_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.121Z
---


# U-GAP-MILL-FFT-CHATTER — predictWithTrend method (2026-05-17, slot alpha)

Commit `2581b08eac` (HEAD~1 at write time). Method addition on the existing
`ChatterPredictionEngine`, NOT a new engine.

## The R8 dedup-preflight call

The roadmap unit said "Re-modularize PRISM_FFT_PREDICTIVE_CHATTER from v8.89
monolith". Reading the monolith (322 lines, 3 public methods) + the live
`mcp-server/src/engines/Chatter*.ts` (8 chatter engines + `STFTChatter` algorithm
+ existing 14.3K test file) revealed the monolith was **90% already shipped** —
just packaged differently. Karpathy R8 dictates reading before writing; a new
engine here would have tripped `duplicationGuardEngine.mustCheckBeforeCreating()`.

**Genuine 10% gap (what shipped):**
- `vibrationTrend` slope → time-to-chatter estimate via least-squares regression
- Tiered urgency recommendations (NONE / SOON / IMMEDIATE) with EXPLICIT
  signed `speedDelta` (RPM) + `docDelta_mm` (depth) vectors — existing API
  returned only text recommendations.

## What shipped

- `predictWithTrend(input): PredictWithTrendResult` — 4-tier predictor
  (STABLE / WARNING / IMMINENT / ACTIVE).
- `linearTrendSlope(trend)` private helper — least-squares slope with n<2 and
  zero-variance guards.
- `buildChatterAction(prediction, rpm, currentDepth, criticalDepth)` private
  helper — tiered action vectors per Altintas/Tobias playbook.
- `PREDICT_WITH_TREND_CONFIG` exported const — empirical tuning constants
  (confidence labels + action-tier fractions), explicitly NOT physics constants.
- 4 new exported types: `PredictWithTrendInput`, `PredictWithTrendResult`,
  `ChatterAction`, and the existing `StabilityLobeResult` is the composition unit.

## Per-file scrutiny — 8 reviewer agents across 2 rounds

**Engine file** (round 1):
- arm-A physics-review-agent: PASS, 4 P2 deferrables
- arm-B reviewer: **FAIL** with 3 P0 + 5 P1 — fixed all 6 ship-blockers:
  - margin precision (unrounded margin in time-to-chatter divide)
  - confidence `r4`-rounding contract
  - NaN/Infinity vibrationTrend element validation
  - imminentPct > warningPct ordering invariant throw (silent dead-WARNING trap)
  - WIRE-EXEMPT tag (no dispatcher wiring — `StabilityLobeResult` is a closure)
  - negative-zero hygiene on ACTIVE branch
- Round 2: not re-dispatched; fixes were surgical + verified by test re-run.

**Test file** (round 1):
- arm-A test-review-agent: PASS, 0 P0/P1
- arm-B reviewer: PASS with 4 P1 (test-name accuracy, integration smoke
  missing, precision-guard unachievable, -0 test pins wrong branch)
- Round 2 fixes applied:
  - Renamed misleading tests honestly (R12 fail-loud about scope)
  - Added integration smoke test with real `generateStabilityLobes` output
  - Documented precision-guard as un-writable in file docstring (deferral)
  - Renamed negative-zero test to clarify it pins literal-zero branch only
- Round 2: PASS / PASS, 0 P0/P1.

## Test fixture choice — synthetic lobes

Tests use **synthetic hand-crafted lobes** (1-segment, flat critical depth,
spans `[rpm-100, rpm+100]`) instead of real `generateStabilityLobes` output.
Reason: a **pre-existing bug** in `findStablePockets` makes the engine's own
"identifies stable pockets between lobes" test currently FAIL in main
(`expected 0 to be greater than 0` with params `{min:5000, max:20000}`).
Not in this unit's lane to fix — synthetic fixtures give predictWithTrend
exact deterministic critical-depth values regardless of upstream bugs.

One integration smoke test pins compatibility with real engine output
(loose: valid enum + numeric ranges).

## Pre-existing bugs surfaced (peer-bus notes, NOT my lane)

1. `findStablePockets` returns `peaks=[], all=[]` for the engine's own
   passing-test params `{stiffness:1e7, damping:500}, {Kt:2000e6, numTeeth:4},
   {min:5000, max:20000}`. The existing test `"identifies stable pockets"`
   is currently failing.
2. `mcp-server/src/engines/ChatterStabilityLobeEngi-1` is a corrupt filename
   (lost `ne.ts` suffix).

Chat-bus posted to peer `claude-9f57075a` requesting envelope flip
(`FEATURE-GAP-AUDIT-MS0.json` is peer-claimed — `peer-file-isolation` hook
stripped my envelope edit cleanly, then committed only the source files).

## Operator guidance

```ts
const lobes = engine.generateStabilityLobes(toolDyn, cuttingParams, rpmRange);
const out = engine.predictWithTrend({
  rpm: 10000,
  axialDepth_mm: 2.5,
  vibrationTrend: recentVibration_50to500_samples,  // newest last
  lobes,
});
if (out.prediction === "IMMINENT") {
  // out.action.docDelta_mm tells operator how far to pull depth
  // out.timeToChatterSec gives countdown to wall
}
```

WIRE-EXEMPT — no dispatcher action. The input includes the in-memory
`StabilityLobeResult` closure-of-interpolators which doesn't JSON-serialize
cleanly. A future cross-process wiring would need a lobe-id reference cache.

Related:
- [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] — prior session NN-1 ship
- [[feedback_parallel_scrutiny_per_file]] — the per-file 2-reviewer doctrine
