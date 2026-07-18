---
name: reference_oscar_radial_engagement_fix_2026_06_10
description: "SHIPPED U-OSC-RADIAL-ENGAGEMENT (69146aa9c1): closed the LAST SFC axis gap. radial_depth_mm/_pct was inert in prism_optimized + hex_mm force collapsed to ~0 at a full slot. Two coupled fixes, 3-of-3 + physics-reviewer PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.693Z
aliases: reference_oscar_radial_engagement_fix_2026_06_10
---


**SHIPPED 2026-06-10 slot:oscar, commit `69146aa9c1` (4 files, +287/-2), 3-of-3 PASS + physics-reviewer PASS.** Closes the last SFC axis gap (machine_accuracy + controller_brand are by-design-inert; tool_holder_type closed earlier via `a8f72823cb`).

**Two coupled bugs (root-caused last session in [[reference_oscar_radial_pct_inert_rootcause_2026_06_10]]):**

1. **Orchestrator inertness.** `SpeedFeedNineAxisOrchestratorEngine.ts` prism_optimized branch (~line 895) recomputed `ae = (alt.ae_pct/100)*D` from the balanced ALTERNATIVE's static table, discarding the operator's `toolpath.radial_depth_mm/_pct`. So MRR was IDENTICAL 5%->100% radial engagement. FIX: `ae = userGaveRadial ? sfc.radial_depth.value : (table)`, where `userGaveRadial = (Number.isFinite(mm)&&mm>0) || (Number.isFinite(pct)&&pct>0)`. `cost_batch`/`aggressive_rush` already honored `sfc.radial_depth.value` (~line 866); only prism_optimized was broken. The fix makes all 3 modes consistent.

2. **Engine force collapse (the SAFETY coupling).** `UltimateSpeedFeedEngine.ts` STEP 9 (~line 2245) `hex_mm = fz*sin(acos(1-2*ae/Dc))` is correct for ae<Dc/2 (radial chip-thinning) but DECAYS past ae/Dc=0.5 (sin of an angle >90deg), reaching ~0 at a full slot -> Fc->0 where engagement is GREATEST. Since the orchestrator's workholding + spindle-power clamps read `sfc.forces`, honoring a high user ae with forces~0 would UNDER-PROTECT (oscar red line). FIX: `immersionRatio=min(1,ae/max(1,Dc)); hex = immersionRatio>=0.5 ? fz : fz*sin(acos(1-2*immersionRatio))`. Max chip thickness = fz for ae>=Dc/2 (peak at the 90deg centerline; Sandvik/Boothroyd-Knight). Byte-identical for ae<Dc/2; continuous at Dc/2; SAFE-DIRECTION (forces only ever increase vs the old buggy value).

**WHY force-consistent without re-derivation:** the engine computes `sfc.forces` (via hex) at the SAME resolved ae the orchestrator now reads as `sfc.radial_depth.value`. Single ae origin -> clamps stay consistent; EDIT 2 makes the full-slot forces non-zero so the clamps actually engage.

**Tests (R9):** `sfc-nine-axis-radial-engagement.test.ts` (7: MRR honors radial + MRR=ap*ae*Vf identity + backward-compat + edge 0/NaN/neg + explicit-mm + full-slot clamp safety) + `ultimate-speed-feed-immersion-force.test.ts` (5: hex PLATEAU=fz at 50/75/100%, NO-COLLAPSE, HALF==fz, UNCHANGED ae<Dc/2 branch, MONOTONE+SAFE). All genuinely RED pre-fix. 401-gauntlet + variability + orchestrator + all-axis sweep PASS (0 regressions).

**P2 FOLLOW-UPS (pre-existing, out of scope this unit -- a future oscar chat):**
- Negative *explicit* `radial_depth_mm`: engine `if(input.radial_depth_mm)` (line ~2200, UNCHANGED) treats it truthy -> ae_mm negative -> acos arg>1 -> NaN forces; the clamps' `Number.isFinite` guards then silently skip. Orchestrator's `>0` gate shields the recommendation, but a DIRECT engine call is unguarded. Add a `Math.max(0,...)` / fail-loud at the engine input boundary (or Zod reject).
- `Math.max(1,Dc)` immersion floor (line ~2253) under-reports immersion for sub-1mm micro-tools at partial engagement (force-side only; STEP-7 feed/MRR uses raw Dc). BYTE-IDENTICAL to the prior code (NOT introduced here -- Arm C mis-read it as new; the diff proves it). Recommend `Math.max(1e-6,Dc)` + a sub-mm regression case.

Related: [[reference_oscar_radial_pct_inert_rootcause_2026_06_10]] · [[reference_oscar_sfc_runout_life_derate_2026_06_09]] · [[feedback_audit_consumers_when_moving_logic_into_engine]] · [[reference_oscar_sfc_nine_axis_contract]]
