# U-CAMX23 — In-Process Probing wired into PrintToProgram

**Milestone:** CAMX-MS0.3 · **Shipped:** 2026-05-17 (slot kilo, resumed from crashed `claude-148fd42f` /loop iter 4/10)

## What

`PrintToProgramPipelineEngine.generateProgram()` now auto-inserts a
controller-specific in-process probe-inspection cycle for any
`MachinableFeature` whose drawing `tolerance_mm < 0.025` **or**
`surface_finish_Ra_um < 0.8` (strict `<`). The probe block is spliced at the
`semi_finish` → (`finish` | `pocket_finish`) transition, once per feature,
calling `probeRoutineGeneratorEngine.generatePartInspection()`.

Controller dialect (Renishaw `G65 P98xx` / Siemens `CYCLE9xx` / Heidenhain
`TCH PROBE`) is derived from `DrawingInput.machine_brand` via
`mapBrandToProbeController()` (fanuc default).

## Exit conditions (CAMX-MS0.3 envelope)

1. Auto-probing for critical tolerances — `featureNeedsInProcessProbe()`.
2. Controller-specific probe macros — `mapBrandToProbeController()` → engine dialect.
3. Inserted at semi→finish transition — `semiFinishDone`/`probeEmitted` Set gating.

## Machine-safety contract (load-bearing)

`generatePartInspection` assumes a probe is already loaded and never stops the
spindle. A raw splice would fire `G65 P98xx` with the semi-finish endmill
spinning → bore collision. The wiring therefore emits, around the engine gcode:

- before: `M05` (spindle stop), `M09` (coolant off), `G91 G28 Z0` (safe-Z to
  machine home), `G90`, and a `(*** LOAD TOUCH PROBE NOW ***)` operator gate;
- after: `G91 G28 Z0`, `G90`, then `currentTool = -1` so the upcoming finish
  op re-issues a full tool-change (cutting tool + length comp + spindle/coolant
  cleanly reloaded).

`action_on_fail` is `"alarm"` only for `bore`/`boss` probes (where the probed
value IS the toleranced diameter); `"skip"` for `surface`/`groove` (probed
value is a coordinate, not the nominal — alarm would trip every part).

## Fail-loud (R12)

A critical feature whose op-list has no rough/finish pair (e.g. `fillet` →
`["finish"]`, small hole → `["drill"]`) never produces a semi→finish
transition. Rather than silently skip the inspection, a
`(=== U-CAMX23 PROBE GAP … ===)` banner with per-feature
`(PROBE GAP: Feature X tol=… Ra=… — MANUAL inspection required)` lines is
emitted before program end.

## Tests

`mcp-server/src/__tests__/CAMX-MS0.3-U-CAMX23-InProcessProbe.test.ts` — 20
behavioral cases driving the real `runFullPipeline` path: EC1/EC2/EC3, strict
boundary (`==0.025`/`==0.8` → no probe), dialect-token proofs (fanuc vs
siemens), once-per-feature idempotency, multi-feature independence, the
safety-preamble ordering, alarm-vs-skip by probe type, and the PROBE GAP path.

## Review

Per-file 2-reviewer gate: `code-analyzer` + independent `reviewer`, both PASS.
3 P1s surfaced and fixed in-session before commit (pocket_finish gate,
machine-safety preamble, action_on_fail-by-type, R12 gap banner). The
spinning-endmill-into-bore defect was caught only by the independent pass — a
correctness-only review misses splice-point machine state.

Memory: [[reference_u_camx23_2026_05_17]] · Sibling wiring class:
[[u-wire-energy]] / `reference_u_wire_energy_2026_05_17`.
