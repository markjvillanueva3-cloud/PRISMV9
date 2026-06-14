---
title: U-WIRE-ARCFIT — wire ArcFittingEngine into prism_calc:arc_fit_kasa
milestone: WIRE-UNWIRED-MS0
unit_id: U-WIRE-ARCFIT
shipped_at: 2026-05-17
shipped_by: claude-9587867d / slot kilo
commit: 409cf71f80
status: shipped
kind: architecture
---

# U-WIRE-ARCFIT

Closes the orphan `ArcFittingEngine` (Kasa least-squares point-cloud → G02/G03 arc fitter, `MIO-MS0/U-MIO20`) — engine had a passing unit test (`__tests__/ArcFittingEngine.test.ts`) but **zero dispatcher reference** until this unit. Confirmed via `scripts/validate-unwired-signal.mjs` (50-engine deterministic sample, 0 TRULY-UNWIRED, 34 WEAK-SIGNAL test-only candidates) + grep across the dispatcher tree.

## Why a new action, not a re-bind

`prism_calc` already had an `arc_fit` action — but it wires to a **different function**: `ToolpathCalculations.calculateArcFitting`, a scalar block-time calc with signature `(chord_tolerance, arc_radius, feedrate, block_time)` returning timing info. The orphan `ArcFittingEngine` is something else entirely: a Kasa least-squares solver that takes a point cloud and emits G02/G03 arc moves. Two different jobs, two different surfaces. A new action name (`arc_fit_kasa`) keeps both intact without ambiguity.

## Files touched

| File | Change |
|------|--------|
| `mcp-server/src/schemas/calcActionSchemas.ts` | new `arc_fit_kasa` Zod schema (~line 329) + `ACTION_CALC_SCHEMAS` entry (~line 1219) |
| `mcp-server/src/tools/dispatchers/calcDispatcher.ts` | `"arc_fit_kasa"` in ACTIONS (~line 547) + case handler (~line 1244) |
| `mcp-server/src/__tests__/arc-fit-kasa-wiring.test.ts` | 13-case behavioral test (newly created) — `PASS 13/0` |

## Dispatcher case shape

```ts
case "arc_fit_kasa": {
  const { arcFittingEngine } = await import("../../engines/ArcFittingEngine.js");
  const pts = params.points as Array<{ x: number; y: number; z: number }>;
  const fitParams: Record<string, unknown> = {};
  if (params.tolerance_mm  !== undefined) fitParams.tolerance_mm  = params.tolerance_mm;
  if (params.min_points    !== undefined) fitParams.min_points    = params.min_points;
  if (params.max_radius_mm !== undefined) fitParams.max_radius_mm = params.max_radius_mm;
  if (params.min_radius_mm !== undefined) fitParams.min_radius_mm = params.min_radius_mm;
  if (params.plane         !== undefined) fitParams.plane         = params.plane;
  const fitResult = arcFittingEngine.fit(pts, fitParams as Partial<…>);
  result = params.emit_gcode
    ? { ...fitResult, gcode: arcFittingEngine.toGCode(fitResult.arcs, params.feedrate) }
    : fitResult;
  break;
}
```

The `if (param !== undefined)` threading is load-bearing — the engine's `fit()` does `{ ...DEFAULT_PARAMS, ...userParams }`, so an `undefined` value in the spread WOULD overwrite the default. The guard is necessary and idiomatic for this codebase.

## Schema

```ts
const arc_fit_kasa = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() })).min(2),
  tolerance_mm: optPosNum,
  min_points: z.number().int().positive().optional(),
  max_radius_mm: optPosNum,
  min_radius_mm: optPosNum,
  plane: z.enum(["XY", "XZ", "YZ"]).optional(),
  emit_gcode: z.boolean().optional(),
  feedrate: optPosNum,
}).passthrough();
```

Schema `.min(2)` is the structural floor (need ≥2 points for a sequence). The engine's `min_points` default of 5 is the **fitting** threshold — the engine returns `arcs: []` for <5 points cleanly. Test #8 exercises this 2-point early-return path on purpose.

## Test design (13 cases)

1. **Conservation invariant** — `Σ arc.original_points + remaining.length == original_count`, every `fit_error ≤ tolerance`.
2. **Perfect quarter-circle (r=10, 11 pts)** — exactly 1 arc, `radius==10`, `sweep==90°`, `fit_error<0.001`.
3. **Perfect half-circle (r=15, 31 pts)** — exactly 1 arc, `radius==15`, `sweep==180°`.
4. **Lazy-import parity** — `dispatcher.result === engineFit.result` (same arc_count, original_count, reduction_pct, radius).
5. **Plane propagation** — XZ fits 1 arc at r=6; XY (Y-collinear) fits 0 arcs.
6. **`emit_gcode: true`** — exactly 1 G02 for CW half-circle, `|i,j|==12`, `feedrate==1000`.
7. **`emit_gcode` omitted** — `result.gcode === undefined`, engine arcs preserved.
8. **Insufficient points** — 2 points → 0 arcs, both preserved.
9. **Linear sequence** — outside radius band → 0 arcs, all 12 preserved.
10. **Tolerance honored** — tight (0.01) rejects ±0.3mm noisy arc; loose (1.0) accepts exactly 1.
11. **CW direction** — clockwise half-circle → `direction == "cw"`.
12. **CCW direction** — counter-clockwise quarter-circle → `direction == "ccw"`.
13. **`ai_reasoning` trace** — first line literally names input point count.

Tests 1 + 8 use `?? []` to normalize empty arrays stripped by `slimResponse` (per [[reference_slimresponse_strips_empty_arrays]]). The assertions themselves (`.toBe(7)`, `.toBe(0)`, fixed counts) still fail if the engine regresses — the normalization handles dispatcher output shape, not the values under test.

## 2-reviewer per-file gate

**PASS / PASS** — 0 P0, 0 P1.

Deferrable findings (next-unit):

- **P2** — `calcExtractKeyValues` (the dispatcher's pressure-degraded payload extractor) has no `arc_fit_kasa` branch. Under `pressurePct > 50` the `default:` branch extracts only the first 5 scalar fields — arc/remaining/reasoning/gcode arrays are silently dropped. Karpathy R12 — defeats the engine's value under context pressure. Follow-up unit: add an `arc_fit_kasa` branch returning `{arc_count, original_count, reduction_pct, total_fit_error_mm, first_arc_radius_mm, first_arc_direction}`.
- **P2** — `ArcFittingEngine` is not re-exported from `src/engines/index.ts`. Dispatcher path-imports work without it; address in next barrel sweep.
- **P3** — `toGCode(arcs, feedrate?)` assigns `f: undefined` when feedrate is omitted; JSON.stringify converts to `"f": null` rather than absent key. Guard with `...(feedrate !== undefined && { f: feedrate })`.
- **P3** — Schema `points.min(2)` is laxer than engine `min_points=5`. The engine handles <5 gracefully (test #8 confirms); cosmetic — `.describe()` could explain.

## Anti-regression

`calcDispatcher` ACTIONS count: **50 → 51** (one new entry, no removals). `npx tsc --noEmit` introduces zero new errors (the 6 pre-existing errors at lines 1152/1156/534/7813/9065/9080 of calcDispatcher.ts are outside this change's range).

## How this unit was found

`/checkin-lima last chat crashed, pick up where lima left off` (kilo, claude-9587867d, 2026-05-17). The previous lima occupant `claude-88486e9e` had started a `/loop` task `"wire unwired engines"` with target 20 but **crashed at iter 0**, no iterations done. After reaping the dead loop-state, ran `scripts/validate-unwired-signal.mjs` with `--sample 50 --report .tmp-uw-validate.json`:

```
counts: { "TRULY-UNWIRED": 0, "FALSE-POSITIVE-WIRED": 7, "WEAK-SIGNAL": 43, "EXEMPT": 0 }
falsePositiveRatePct: 14  threshold: 10  verdict: FAIL
```

The TRULY-UNWIRED list was empty — but 34 of 43 WEAK-SIGNAL hits had `firstMatch: test:__tests__/...` (test-only refs, no dispatcher). Test-only is **functionally orphan** for the public MCP surface. Picked `ArcFittingEngine` from the list: pure-compute, clear input/output, existing unit test, natural fit to `prism_calc`. Confirmed orphan by greppinig `mcp-server/src/tools/dispatchers/` and `mcp-server/src/schemas/` — zero hits.

This is the kind of unit the lima crashed loop would have done if it had survived past iter 0. Real wiring, not noise.

## Sibling reading

- [[reference_wire_unwired_ms0_u_wire01_2026_05_16]] — 96%-noise warning for the 729-pool (lima alpha 2026-05-16). The validator's TRULY-UNWIRED is too strict; test-only WEAK-SIGNAL is where real orphans hide.
- [[reference_slimresponse_strips_empty_arrays]] — tests must `?? []` on empty-array paths.
- [[reference_skill_tier_wire_pattern]] — 5-file orphan-rescue recipe (schemas+ACTION, dispatcher case+remap, wire test, engine test, vitest+tsc).

## Commit

```
409cf71f80 [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ARCFIT: wire ArcFittingEngine into prism_calc:arc_fit_kasa
```
