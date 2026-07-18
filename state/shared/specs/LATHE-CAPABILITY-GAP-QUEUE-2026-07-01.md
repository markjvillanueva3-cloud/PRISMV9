# Lathe Capability-Coverage Gap Queue (2026-07-01, slot:whiskey)

> Reconciles TWO coverage audits of the full lathe machining taxonomy:
> - **Deterministic** `scripts/lathe-capability-coverage.mjs` (52 caps -> 41 COVERED / 11 PARTIAL / 0 GAP).
> - **Agent** Workflow `wf_77183ecf` (6 whiskey-lathe agents + opus synth; 54 caps -> 44 COVERED / 6 PARTIAL / 4 GAP).
>
> **Reconciliation (R12):** the deterministic tool reports "0 GAP" because its substring body-grep
> FALSE-POSITIVES on generic terms ("live tool", "whirl" appear incidentally in unrelated engine bodies).
> The AGENT audit is authoritative for "is the SPECIFIC capability implemented" (method-level, file:line).
> Lesson: a substring match on a capability keyword != that capability is built. The tool is useful as a
> fast COVERED-baseline but must not be trusted for GAP verdicts on capabilities whose keyword is generic.

## GENUINE SAFE-ADDITIVE GAPS (whiskey builds; NO default emitted-G-code change)
1. **Live-tool cross-tapping** (agent #1, highest frequency) -- `LatheLiveToolingPlannerEngine` has
   `generateCrossDrilling` but the operation enum (`cross_drilling|c_axis_milling|y_axis_milling`) has no
   `cross_tapping`. Extend: add the op + `generateCrossTapping()` (rigid-tap sync feed=RPM*pitch, reuse the
   tap-drill/torque + thread math) + a dispatcher action. Additive new op -> existing 3 ops byte-identical.
2. **O-ring/circlip/relief groove SIZING tables** -- `GrooveClassificationEngine` LABELS these groove types
   but has no ISO 3601 / DIN 471/472/509/76 DIMENSION lookup. New `src/data/standard-groove-dimensions.ts` +
   a `groove_size_from_standard` read-only action. (e.g. DIN 471 shaft d20 -> width 1.85 / depth 1.30.)
3. **Form turning** -- title in a file header only; 0 method/formula. New `getFormTurningParams()`
   (radial force scales with total engaged form-width: Kienzle Fc over the engaged width) + action.
4. **Canonicalize inline dwell + jaw-balance-K constants** (REFUSE-LIST: inline-physics-constants) --
   move `catcherTiming()` dwell magic-numbers (`G04 P500/P1000/P400`) + chuck-jaw centrifugal `K` into named
   `constants.ts` symbols; byte-identical emit by construction (pure refactor -> zero G-code change).
5. **Wire orphaned `LatheAdvancedOperationsEngine` methods** (R15) -- `getGroovingParams`,
   `getEccentricParams`, `getPolygonTurningParams`, `getContourParams` are reachable only via
   `getLiveToolingParams` today; add dispatcher actions (dispatcher-parity tests).

## OPERATOR-GATED GAPS (would change emitted G-code / need physics-reviewer -- do NOT auto-build)
- **Thread whirling** -- new high-speed multi-insert rotating-head G-code path; the JM Okuma fleet may not
  have a whirling attachment. VERIFY the fleet has it before scoping; else defer (exotic Swiss-screw feature).
- **Titanium-fire ignition formula** -- distinct from the existing Mg autoignition (~473C) model; physics-
  reviewer must define the Ti threshold. Do NOT route Ti coolant decisions through `magnesium_fire_risk`
  (silent-wrong physics). Gate a Ti-specific formula behind physics-reviewer before any coolant output uses it.
- **Y-axis-on-lathe kinematics engine** -- today Y-axis is an embedded param (in `MillTurnSwissPipelineEngine`
  + `LatheAuxAxisTimingEngine`); a first-class engine would change how off-center features post. Verify the
  fleet routinely posts Y-axis toolpaths first.
- **Spindle-torque blocking gate** -- only `spindle_power_*` actions confirmed; a separately-blocking
  `spindle_torque_check` could newly BLOCK programs that pass power but fail torque. Physics-reviewer confirms
  whether torque is already enforced in the power path first.

## UNVERIFIED (carried forward, re-grep before relying):
workpiece-thermal-growth dispatcher route; `spindle_torque_*` action name; polygon_turning exact action string.

## Build order: #1 cross-tapping (this session) -> #4 canonicalize-constants -> #5 wire-orphans -> #2 sizing -> #3 form-turning.
Each: real reference-value test, round-trip through dispatcher, per-file 2-arm scrutiny, commit-by-pathspec.
Full agent synthesis: workflow `wf_77183ecf` output. Deterministic report: `state/shared/lathe-capability-coverage.md`.
