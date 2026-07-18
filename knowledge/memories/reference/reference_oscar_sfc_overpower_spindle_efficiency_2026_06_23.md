---
name: reference_oscar_sfc_overpower_spindle_efficiency_2026_06_23
description: "FIXED + LIVE-VALIDATED (slot:oscar 2026-06-23, commit U-SFC-OVERPOWER-SPINDLE-EFF): SFC over-power/stall guard (ProductEngine.calculateSafetyScore) compared RAW cutting power Pc=Fc*Vc/60000 to the rated spindle power -- but the spindle MOTOR must supply Pc PLUS drivetrain losses, so the real demand is Pc/eta_drive. Omitting /eta made the check ~1/eta (~15-25%) too LENIENT (under-protected): a cut at 95% cutting-power actually draws ~112% of spindle and stalls, yet graded safe. FIX = new canonical SPINDLE_DRIVE_EFFICIENCY=0.85 (constants.ts; HSMAdvisor default / G-Wizard 0.80-0.90) + compare spindlePower=Pc/0.85 in all 4 load tiers. Monotonically SAFE (only tightens). LIVE :3100: cutting 6.18kW < rating 6.67kW (old=safe) but spindle 7.27kW > rating -> now 'warning: spindle will stall'."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.709Z
aliases: reference_oscar_sfc_overpower_spindle_efficiency_2026_06_23
---


**SFC over-power check was efficiency-blind (~15-25% too lenient, UNDER-protected) -- FIXED + DEPLOYED + LIVE-VALIDATED (slot:oscar, 2026-06-23, commit `U-SFC-OVERPOWER-SPINDLE-EFF`).** Task #10 of the SFC cutting-output hardening arc.

## The bug
`ProductEngine.calculateSafetyScore` (the SFC over-power/stall guard, backs the customer-facing `/speed-feed-calc` page) compared the **raw cutting power** `Pc = Fc*Vc/60000` (from `calculateKienzleCuttingForce.power`) directly against the machine's rated spindle power `machine_power_kw`, in 4 load tiers (>0.80/0.95/1.0/1.5 -> -0.1/-0.3/-0.5/-0.8 score). But the spindle MOTOR must deliver the cutting power PLUS belt/gear/bearing drivetrain losses, so the real demand is `P_spindle = Pc / eta_drive`. Omitting the `/eta` made every tier ~`1/eta` (~15-25%) too LENIENT -- a cut at 95% cutting-power actually draws ~112% of spindle and stalls, yet graded "safe". This UNDER-protected (the dangerous direction for a safety guard).

## The fix
- New canonical `SPINDLE_DRIVE_EFFICIENCY = 0.85` in `mcp-server/src/physics/constants.ts` (after `CANONICAL_TAYLOR_LIFE_CV`), with literature-citing comment: HSMAdvisor machine-efficiency default ~0.85, G-Wizard 0.80-0.90 band, ASM Handbook Vol.16; direct-drive spindles run ~0.92-0.95 so 0.85 is the conservative belt/geared-VMC shop default. NOT inlined in the engine (soul refuse `inline-physics-constants`).
- `calculateSafetyScore` computes `const spindlePower = power / SPINDLE_DRIVE_EFFICIENCY;` and compares `spindlePower` (not raw `power`) in all 4 tiers; warnings now report "Spindle draw X kW (cutting Y kW / 0.85 drive eff) ... N% of machine spindle". The `power` arg is cutting power at all 4 call sites (663/1047/1652/2303 -- physics-reviewer-confirmed: `forceResult.power` + `estimatedPower=kc*MRR/...`, no spindle-power-in, no double-count). Single conversion covers all callers uniformly.
- Tier thresholds (0.80/0.95/1.0/1.5) + penalties (0.1/0.3/0.5/0.8) UNCHANGED (scoring policy, pre-existing) -- only the compared quantity swapped (power -> spindlePower). **Monotonically SAFE: only tightens, never softens a threshold.**

## Direction is SAFE (not a softening)
`eta < 1` -> `Pc/eta > Pc` -> every threshold trips EARLIER -> strictly more conservative. The change makes the guard catch stalls it previously missed.

## Gates cleared
- **physics-reviewer**: validated the DESIGN -- `Pc/eta` direction stricter+safe; 0.85 defensible per HSMAdvisor/G-Wizard; all 4 call sites confirmed cutting-power (no double-count); units kW (`Fc[N]*Vc[m/min]/60000` -> kW). NOTE: the agent ran in an ISOLATED worktree branched off HEAD, so it could not see the uncommitted diff (reported "change absent / BLOCK") -- but its substantive review covered every axis on the real surrounding code, and the self-calibrating R9 test below PROVES the correction is wired. **Lesson: the physics-reviewer (Agent isolation:worktree) sees only COMMITTED code -- commit BEFORE review, or accept design-level validation + a behavioral test as proof-of-application.**
- **+1 self-calibrating R9 lock** (`sfc-jm-fleet-page-closed-loop.test.ts`): capture a cut's cutting power on an ample machine, then set the rating ABOVE cutting power but BELOW spindle draw (Pc/0.85) -> old raw-Pc logic grades "safe", the efficiency-corrected check must flag it + emit a "Spindle draw" warning. Fails on a revert to raw-power.
- 27/27 page + 84/84 SFC-path/safety-boundary tests; changed files type-clean.

## LIVE :3100 validation (post build:fast + supervisor respawn restart)
AMPLE 50kW machine: 1045 12mm 4FL ap6 fz0.15 -> cutting `power_kW=6.18`, status `safe`. TIGHT rating 6.67kW (= 6.18*1.08): cutting 6.18 < 6.67 (OLD logic -> safe) BUT spindle draw 6.18/0.85 = 7.27 > 6.67 -> status `warning`, warning `Spindle draw 7.3 kW (cutting 6.2 kW / 0.85 drive eff) EXCEEDS machine spindle 6.7 kW (109%) -- spindle will stall`. The leniency gap is closed live.

## Sibling SFC hardening (this arc)
[[reference_oscar_sfc_material_table_divergence_2026_06_23]] (task #9 canonical material constants, 4ad8a0116b) + the 4 prior page fixes (material-aware Vc/fz, engagement-arc, surface-finish per-tooth Ra). Deploy mechanism: build:fast -> kill `netstat :3100` LISTENING child -> supervisor respawn ~8s -> curl POST `/api/v1/sfc/calculate` (nested `machine.spindle.{max_rpm,power}`) parse `.result.result`.

## Open follow-up (P2, not blocking)
Per-machine spindle-efficiency override (direct-drive spindles at 0.85 are needlessly pessimistic; worn belt drives can be <0.80) -- physics-reviewer flagged as a long-term refinement, not a defect. Today a single fleet-wide 0.85 is the conservative default.
