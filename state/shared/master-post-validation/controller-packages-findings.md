# Controller-Packages Inventory — Hurco WinMax Master Post (live-validated 2026-05-31)

Area: controller settings / optional packages / build-quality+age / kinematics-travel.
Live endpoint: http://127.0.0.1:3100/mcp prism_cam. Raw runs: controller-packages-live.json.

## Verified WORKS (live :3100)
- UltiMotion ON → `G05.3 P35` (adaptive/rough) + `G05.3 P10` (finish) per tool-change. Engine HurcoV11MillMasterPostEngine.ts:1099-1106, classifySmoothing():1076-1082.
- UltiMotion OFF → 0 G05.3 lines (clean omission for diffable reference).
- Inch units → `G20 (INCH)`; metric → `G21 (METRIC)`. generateSafeStart():1047-1051.
- TSC coolant → `M88 (THROUGH-SPINDLE COOLANT)`. generateSpindleStart():1147-1149 (U-PPGH01 fixed silent-drop).
- Basic WCS G54..G59 → direct `G54 (WORK OFFSET)`. generateSafeStart():1060-1061.
- Header literal `(MACHINE: HURCO VMX24 - WINMAX V11)`. generateProgram():727.
- Controller profile (master_post_get_controller_profile, controller=hurco) returns CONTROLLER_PROFILES.hurco.
- AGI generate / AGI analyze run (different engine, MasterPostProcessorUnifiedAGIEngine).

## CONFIRMED P1 ISSUES
1. **Extended WCS G54.1 P<n> unreachable via dispatcher.** Engine supports any WO outside 54-59 → emits `G54.1 P<n>` (HurcoV11MillMasterPostEngine.ts:1056-1064). But dispatcher Zod schema clamps work_offset to [54,59]: WO=11 → "Too small: expected >=54"; WO=60 → "Too big: expected <=59". The whole extended-WCS branch is dead code over the live surface. camDispatcher.ts:6731-6741 config schema.
2. **Cross-engine HSM-code drift.** Standalone engine emits UltiMotion `G05.3 P<n>` (corrected 2026-05-22 vs real .cps). But MasterPostProcessorUnifiedAGIEngine controller profile (hurco) claims `hsm_code:"G187 P3"` + features.hsm.code "G187" (MasterPostProcessorUnifiedAGIEngine.ts:482-493) — G187 is the Haas dialect the engine's own tribal tip (HurcoV11MillMasterPostEngine.ts:479-480) flags as misinformation that "would parse-error on V11". AGI generatePost emitted `G187 P3` for hurco gcode — would parse-error on a real WinMax V11.
3. **AGI kinematics validation can't resolve the JM machine id.** master_post_unified_agi_kinematics with machine="jmdie_hurco_v11" → "Machine profile not found", all travel_check=false, valid=false. validateAgainstKinematics():964-987 → postProcessorMachineKinematicsEngine.getMachineProfile() has no jmdie_hurco_v11 profile. Travel-limit verification for the JM test machine is non-functional.
4. **mapControllerToMaster maps hurco→haas** (MasterPostProcessorUnifiedAGIEngine.ts:1117) — reinforces the G187/Haas conflation in the AGI path.

## Config knobs (HurcoPostConfig, HurcoV11MillMasterPostEngine.ts:90-161)
use_conversational(G65, no-op in sync emit), use_ultimotion, coolant_mode(flood/mist/tsc/off),
work_offset, units, safe_z_mm, tool_change_position, machine_id (→capability lookup),
advanced_aggressiveness, aggressiveness L1-5, optimize_feeds, prove_out, emit_setup_sheet,
max_cutting_force_N. Advanced-pipeline-only: controller_diagonal_mode (independent vs slowest_axis,
derived from use_ultimotion at :1518), advanced_post features.
