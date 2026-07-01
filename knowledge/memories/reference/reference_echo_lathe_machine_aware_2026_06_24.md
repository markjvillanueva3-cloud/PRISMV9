---
name: reference_echo_lathe_machine_aware_2026_06_24
description: U-PP-LATHE-MACHINE-AWARE (slot:echo, commit e6b72b9e69) — made the canonical OkumaB250LatheMasterPostEngine machine-aware (LB250II-M/LB3000/MULTUS-B250II), closed crit-path A1 (engine was UNTESTED), forwarded machine_model through master_post_by_machine, and fixed a latent c_mill FNaN bug. The named JM lathe deliverable's PRISM-tier identity.
type: reference
slot: echo
source: prism-memory
synced: 2026-06-27T20:30:46.561Z
aliases: reference_echo_lathe_machine_aware_2026_06_24
---


# Echo — lathe post machine-aware + A1 closed (2026-06-24, commit e6b72b9e69)

**Trigger:** operator `/checkin-echo /goal` to build the JM Die post processors (both .cps + PRISM-tier), Hurco mill baseline + LB3000/B250II Multus lathe. The ECHO-ULTIMATE-ROADMAP (a53cde69f013, same day) already planned it; this session EXECUTED critical-path A1 for the lathe.

## What shipped (Track A1 + C2 for the lathe)
- `OkumaB250LatheMasterPostEngine` was **hardwired to LB250II-M** — `generateProgram` hardcoded the `(MACHINE: OKUMA LB250II-M OSP-P300L)` header and `getStats()` returned a mixed-case `"Okuma LB250II-M"`. So an **LB3000** or **MULTUS B250II** post emitted the WRONG machine-identity header (the route's "acknowledged risk" comment).
- Added `OkumaLatheMachineId` + `OKUMA_LATHE_MACHINES` identity map (model + OSP controller — **identity facts only**, capability flags stay caller-supplied to avoid fabricating unverified per-machine specs). `generateProgram` resolves `machine_id` (default LB250II-M = byte-identical back-compat); `getStats(machineId?)` parametrized; unknown id fails SOFT to LB250II-M + warns via `hasOwnProperty` (no `record[key]===undefined` TS2367, never throws).
- `camDispatcher master_post_by_machine` Okuma-lathe branch resolves `latheMachineId` from `machine_model` (LB3000 before B250; **LB250 guarded out of MULTUS** via `!model.includes("LB")` since "LB250" contains "B250") and forwards it via config. Explicit LB3000/MULTUS matches + supported-list error update.
- **First-ever test for this engine** (was UNTESTED — crit-path A1): `OkumaB250LatheMasterPostEngine.test.ts` 16 reference-value tests + 4 LB3000/MULTUS cases added to the `MasterPostByMachineExpanded` replica. 100/100 across the 3 affected files; build:fast clean.

## Bug fixed (arm-A scrutiny, latent)
- `generateCAxisMilling` did `F${op.feed_mm_rev * op.spindle_rpm!}` — a non-null assertion on the **optional** `spindle_rpm`. When omitted it emitted a literal **`FNaN`** into the G-code (a controller would choke). Fixed to the guarded `liveToolRpm` (default 3000, clamp 6000) + `.toFixed(3)` (was emitting raw 14-digit float). Regression-locked by a no-NaN test.

## Lessons
- A "canonical" engine that hardcodes one machine's identity silently mis-labels every other machine routed through it — make identity a resolved profile, default-preserving back-compat.
- Don't fabricate per-machine capability specs you can't verify (R12): resolve **identity** (name/controller, sourced) but leave capability flags caller-supplied.
- A non-null assertion (`!`) on an optional numeric field is a latent NaN-emit; arm-A scrutiny caught it. Prefer the already-guarded local.
- The `MasterPostByMachineExpanded` integration test uses a **replica `routeByMachine` helper** (intentional — bypasses the buggy HurcoV11 engine); keep it in sync with the real dispatcher or its "routing intent" coverage rots.

## Deferred (pre-existing, out of scope — honest)
- `master_post_by_machine` Hurco/Haas/Okuma-lathe branches return RAW engine output (unsealed) while OSP-mill/WEDM seal via `sealMasterPostOutput`. Uniform-seal is a **separate unit** (changes the return shape — needs caller audit). NOT introduced here.
- `OkumaB250LatheMasterPostEngine.getMaxSurfaceSpeed` inlines a per-ISO maxCSS table (P250/M150/K200/N500/S50/H100) — should align to `src/physics/constants.ts` / oscar SFC turning-speeds. Pre-existing.

## Next (lathe baseline trio, crit-path A1 remaining)
Test `LathePostProcessorEngine` + `LathePostProcessorAIEngine` (both UNTESTED). Then B-track byte-equiv vs the LB3000/Multus `.cps` goldens. See [[reference_echo_post_gen_coverage_audit]] + `state/shared/specs/ECHO-ULTIMATE-ROADMAP-2026-06-24.md`.
