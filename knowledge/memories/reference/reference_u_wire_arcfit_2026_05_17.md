---
name: reference-u-wire-arcfit-2026-05-17
description: "U-WIRE-ARCFIT shipped 2026-05-17 kilo — wires orphan ArcFittingEngine into prism_calc:arc_fit_kasa; 13-case wiring test PASS; 2-reviewer gate PASS; teaches \"test-only WEAK-SIGNAL hides real orphans\" + \"TRULY-UNWIRED bar in validate-unwired-signal is too strict\""
aliases: reference_u_wire_arcfit_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.028Z
---


# U-WIRE-ARCFIT — wire ArcFittingEngine into `prism_calc:arc_fit_kasa`

**Shipped:** 2026-05-17 kilo / claude-9587867d / commit `409cf71f80`. Triggered by `/checkin-lima last chat crashed, pick up where lima left off` (previous lima occupant `claude-88486e9e` crashed at iter 0 of a `/loop wire unwired engines` target=20, 0 iterations done; reaped via `loop-state.mjs reap`).

## What

Closes the orphan `ArcFittingEngine` (Kasa LSQ point-cloud → G02/G03 arc fitter, `MIO-MS0/U-MIO20`). Engine had a passing unit test but **zero dispatcher reference**. The existing `prism_calc:arc_fit` action wires to a **different function** (`ToolpathCalculations.calculateArcFitting`, scalar block-time calc) — confirmed by reading both. A new action `arc_fit_kasa` was added rather than rebinding the old one.

3 files touched:
- `mcp-server/src/schemas/calcActionSchemas.ts` — new Zod schema + `ACTION_CALC_SCHEMAS` map entry
- `mcp-server/src/tools/dispatchers/calcDispatcher.ts` — `"arc_fit_kasa"` in ACTIONS + case handler (lazy import, undefined-safe param threading, `emit_gcode` branch)
- `mcp-server/src/__tests__/arc-fit-kasa-wiring.test.ts` — 13-case behavioral test (PASS 13/0)

## Why this teaches

**1. `validate-unwired-signal.mjs` TRULY-UNWIRED bar is too strict.** A 50-engine deterministic sample of the 729-pool reported `TRULY-UNWIRED: 0, WEAK-SIGNAL: 43, FALSE-POSITIVE-WIRED: 7`. The naive read: "nothing to wire". The honest read: **34 of 43 WEAK-SIGNAL hits had `firstMatch: test:__tests__/...`** — test-only references with zero dispatcher consumption. Test refs do NOT count as production wiring; those are real orphans the validator mis-classifies.

**2. Confirm via grep before wiring.** Before picking, I grepped `mcp-server/src/tools/dispatchers/` and `mcp-server/src/schemas/` for `ArcFittingEngine|arcFittingEngine` — zero hits across all dispatchers + schemas. The system-viz first hook also redirected my Glob through the graph (matched 2 nodes — engine + test, no consumer). Triple-confirm before claiming an engine is orphan.

**3. Don't rebind an existing action — add a new one when the names collide but the surfaces differ.** `prism_calc:arc_fit` was already wired to a different function. The clean move is `arc_fit_kasa` as a new action. Renaming or rebinding `arc_fit` would have silently broken every existing caller.

**4. Dispatcher param threading must guard `!== undefined`.** The engine's `fit()` does `{...DEFAULT_PARAMS, ...userParams}` — passing `undefined` from an unset schema field would clobber the default. Guard each optional param with `if (params.X !== undefined) fitParams.X = params.X`.

**5. `slimResponse` strips empty arrays — wire tests need `?? []` on empty-array paths.** Per [[reference_slimresponse_strips_empty_arrays]] — exactly the pattern that bit the test on first run (2 tests failed at `Cannot read properties of undefined (reading 'length')`).

## 2-reviewer per-file gate

PASS / PASS (wiring-review-agent + reviewer). 0 P0, 0 P1.

Deferrable findings:
- **P2** — `calcExtractKeyValues` has no `arc_fit_kasa` branch → silent payload truncation under `pressurePct > 50`. Follow-up unit.
- **P2** — `ArcFittingEngine` not in `src/engines/index.ts` barrel. Cosmetic; dispatcher path-imports work.
- **P3** — `toGCode(arcs, feedrate?)` writes `f: undefined` when feedrate omitted; JSON.stringify → `"f": null`. Guard with conditional spread.
- **P3** — Schema `points.min(2)` is laxer than engine `min_points=5`. Test #8 covers the gap; `.describe()` could clarify.

## Verification

`npx vitest run src/__tests__/arc-fit-kasa-wiring.test.ts` → `PASS 13 / FAIL 0`.
`npx tsc --noEmit` → 0 new errors (6 pre-existing TS errors at lines 1152/1156/534/7813/9065/9080 of calcDispatcher.ts are unrelated to this change).
`calcDispatcher` ACTIONS count: 50 → 51 (anti-regression UP).

## Sibling memory

[[reference_wire_unwired_ms0_u_wire01_2026_05_16]] — the 729-pool 96%-noise warning. Today's run reconfirms it.
[[reference_slimresponse_strips_empty_arrays]] — the empty-array gotcha that bit this PR's tests on first run.
[[reference_skill_tier_wire_pattern]] — 5-file orphan-rescue recipe.

## Wiki

[knowledge/wiki/architecture/u-wire-arcfit.md](../H--PRISM/wiki/architecture/u-wire-arcfit.md) (in-repo path: `H:/prism/knowledge/wiki/architecture/u-wire-arcfit.md`)
