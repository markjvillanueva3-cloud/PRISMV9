---
name: reference_oscar_sfc_coating_calib_restore_2026_06_16
description: SFC accuracy session (2026-06-16, slot:oscar) -- (1) REGRESSION CAUGHT+FIXED the --theirs sync (243f894c64) silently dropped MORE than fast_bulk -- it reverted the ENTIRE CSFH calib-apply keystone (U-OSC9-CALIB-APPLY-WIRE) + the 3-site turning-Dw fix; re-grafted onto integration's base (U-PF-RESTORE-CALIB e155a5d51d). (2) SHIPPED U-PF-COATING (a53eec618f) -- CoatingVcModifier, the last open SFC base-model gap (coating->Vc), beating G-Wizard/HSMAdvisor coating accuracy. Both 2-reviewer PASS + tsx-validated.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.698Z
aliases: reference_oscar_sfc_coating_calib_restore_2026_06_16
---


# SFC accuracy session (2026-06-16, slot:oscar)

Continued the operator goal: "more accurate cutting data than G-Wizard/HSMAdvisor across ALL sfc
inputs (coating/substrate/coolant/hardness/machine/toolpath)." Built on the now-current foundation
(post-sync 243f894c64). Two units shipped + one important regression caught.

## REGRESSION CAUGHT + FIXED: the --theirs sync dropped a KEYSTONE, not just fast_bulk
The 2945-commit `cad-fusion-live-ms0 -> slot/oscar` sync resolved `UltimateSpeedFeedEngine.ts` with
blanket `--theirs`. Last session I caught it dropped `fast_bulk` (U-FT-01) and re-applied that. THIS
session I found it dropped TWO MORE net-new oscar features the integration branch never had:
1. **U-OSC9-CALIB-APPLY-WIRE (CSFH unit 12, KEYSTONE)** -- the whole STEP-18F shop-floor
   calibration-apply block + `setSfcCalibrationProvider` / `sfcCalibApplyEnabled` exports +
   `SfcCalibProvider`. This is the SFC self-learning loop (DL-singleton learned correction applied
   to the EMITTED operating point). The integration engine stopped at STEP-18E (no 18F).
2. **U-OSC-TURNING-CAP-VC-DW** -- turning Vc back-calc must use workpiece Dw not tool Dc at 3 sites;
   the merge reverted to the buggy Dc form (6.25x vc error at Dw=100/Dc=16).

**THE TELL (how to detect this class):** 4 surviving oscar test files (`calib-apply`,
`calib-coherence`, `turning-cap-dw`) imported `setSfcCalibrationProvider` -- an export the merged
engine no longer had. **A surviving test importing a now-absent symbol == a net-new feature the
`--theirs` merge silently reverted.** Lesson (extends [[reference_oscar_sfc_sync_complete_2026_06_16]]):
after ANY "bring current" `--theirs` merge on a SHARED engine, enumerate EVERY net-new feature on
that file (grep the unit markers + run the guarding tests) and re-apply each onto the newer base.
fast_bulk was the tip; the keystone was the iceberg.

**FIX = U-PF-RESTORE-CALIB (e155a5d51d):** re-grafted both onto integration's SUPERIOR base physics
(substrate/coolant/hardness->vc, tool-material-speed-override, ISO_SUBGROUP_KC1). NOT a duplicate --
the apply side is unique to this engine (persist side = SpeedFeedCalibrationPersistEngine; no
relocation in the merged tree). Safety invariants preserved: calib DEFAULT-OFF byte-identical;
never overrides a user-pinned point; clamp [0.4,2.5]; post-calib RPM re-cap re-respects ceiling
(turning off Dw); analytics stay pre-calibration. Validated 20/20 (tsx; vitest absent in worktree);
physics-reviewer + reviewer PASS, no P0/P1.

## SHIPPED: U-PF-COATING (a53eec618f) -- the LAST open base-model gap
`tool_coating` only drove the thermal limit; it NEVER scaled Vc. G-Wizard + HSMAdvisor both apply a
coating speed multiplier (+20-50% TiAlN/AlTiN on ferrous). Closed it, physically grounded:
- **NEW `src/algorithms/CoatingVcModifier.ts` (algo 8.6)** -- clone of CoolantVcModifier (8.5).
  `coatingVcFactor = speedMult[user] / speedMult[regimeBaseline]` -- RELATIVE TO THE REGIME BASELINE
  (`BASE_PARAMS.coatings[0]`), NOT rel-uncoated. WHY: the base Vc table already bakes in a premium
  coating per regime (P/M milling AlTiN, drilling TiAlN, N milling uncoated), so rel-uncoated would
  DOUBLE-COUNT and over-speed every default call. == 1.0 when user==baseline (byte-identical default).
- **MATERIAL-GATED** (goodCoatings): an unsuited coating is clamped <=1.0 -- no nitride speed-up on
  aluminium (BUE); the real N speed-up is the PCD/diamond SUBSTRATE (separate tool_material axis --
  NO double-count, physics-reviewer confirmed).
- **FAIL-SAFE 1.0** on any unresolved coating (CVD multilayer / Al2O3 / CBN / cermet / ZrN have no
  speedMult) -- never over-speeds off an undefined ratio. No NaN/Infinity reachable.
- **DATA MIRRORS coatings.json** (`coatingFactors[*].speedMult`) + **DRIFT-GUARDED** by a test pinning
  the inlined maps to the JSON. Physics-reviewer caught that I correctly avoided the DECOY stores in
  the same file (`coatingMultiplier` TiAlN=2.0, `coatingFactor` tialn=1.6) that would badly over-speed.
- WIRED at STEP-4 lookup Vc + axisVcMult (alternatives); lookup-branch only (never overrides a
  user-pinned Vc/rpm); dispatcher-reachable via prism_calc.
- VALIDATED: 20/20 modifier+engine integration (steel uncoated 0.714x / TiN 0.821x derate; aluminium
  AlTiN GATED to 1.0 + warning; aluminium DLC 1.25x boost) + 14/14 drift-guard. Catalog-compare
  no-regression: match 157 / divergent 507 UNCHANGED (no-coating sweep byte-identical). 2-reviewer PASS.

## Net state of the SFC per-input accuracy program
substrate ok . coolant ok (dry/flood/mist/MQL/cryo + air_blast->dry, through_tool->flood) . hardness
ok . **coating ok (this session -- was THE headline gap)** . machine rigidity + spindle torque ok .
toolpath radial engagement ok . calibration self-learning loop ok (restored). The coating gap was the
last genuinely-open base-model accuracy axis vs G-Wizard/HSMAdvisor.

## Open follow-ups
- "air" (plain air, distinct from "air_blast") coolant has no explicit map -> falls to flood default (minor).
- Task #17: DL-singleton E2E test + fz force-envelope physics test (pending).
- vitest is ABSENT in the slot worktree -> all validation via main-tree tsx
  (`H:/prism/mcp-server/node_modules/.bin/tsx`); the committed .test.ts files run green in CI.
See [[reference_oscar_sfc_sync_complete_2026_06_16]] . [[reference_oscar_sfc_physics_fidelity_program_2026_06_15]].
