---
name: reference_jm_by_machine_fleet_libraries_2026_06_15
description: "JM Die fleet tool libraries BY MACHINE, material-first, spindle-clamped (slot:romeo 2026-06-15). 218 actual crib tools x 12 CNC machines = 31,392 presets, 397 rpm-clamped. generate-jm-by-machine-libraries.ts + clampToSpindle (7 tests). Spec source = JmDieMachineConfigEngine OEM datasheets. Folded into alpha's db02ed6b11 by cherry-pick race (data live, attribution wrong)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.625Z
aliases: reference_jm_by_machine_fleet_libraries_2026_06_15
---


**JM-BY-MACHINE fleet libraries** (slot:romeo, 2026-06-15). Operator: *"look how the current jm die fusion library is setup and update your work to coincide with how we set our tools up by machines. update the jm die fleet utilizing the same logic of categorizing by material type first so that cutting parameters coincide with the material."*

**How JM sets up (verified):** the source `resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY` has 7 cribs grouped by FUNCTION + one explicit machine crib -- END MILLS FOR MACHINE 4 + TWIST DRILLS = mill (58 tools); TURNING TOOLS + BORING BARS (rough/finish) + 130/180 deg INSERT DRILLS = lathe (160 tools). The `tool_block_machineSideConnectionType`/`stationNumber` columns are EMPTY -- machine assignment is encoded in the FILE NAME, not a column.

**Deliverable:** `mcp-server/scripts/generate-jm-by-machine-libraries.ts` assigns JM's ACTUAL 218 crib tools to JM's ACTUAL **12 CNC cutting machines** (not the 118K corpus -- JM does not own 118K tools), **material-first** (`state/shared/jm-fusion-tools/by-machine/{machine_id}/{P,M,K,N,S,H}.csv`), with cutting data **CLAMPED to each machine's spindle**. Fleet: **31,392 presets, 397 rpm-clamped**. `FLEET-LEDGER.json` = per-machine roster. Output 6.2MB (committable).

**Machine-coincidence (the core ask):** the same tool+material yields different usable parameters per machine. `clampToSpindle(rpm,sfm,feedMmpm,maxRpm)` (pure, exported, 7 vitest cases): a milling preset whose computed RPM exceeds the spindle ceiling is pinned at the ceiling; SFM + table feed scale down with RPM (chip-load fz constant); turning (rpm=null CSS) + no-cap machines pass through. Clamp counts prove differentiation: Okuma MB-56VA(6k)=128, Haas VF-2(8.1k)=54, Hurco VMX30i(12k)=7, Haas OM-2(30k)=0, Roku-Roku RMX-5(40k)=0; Multus(mill_turn,both,5k)=208; 6 lathes(3.8-5k)=0 (CSS, spindle cap surfaced as a column).

**Spec source (R7):** spindle max_rpm/power/taper + roster from `JmDieMachineConfigEngine.getAllConfigs()` (OEM datasheets) -- the SAME source the Fusion `.machine` kinematic defs use (`generate-jm-fusion-machine-library.ts` -> `FusionMachineLibraryExportEngine`), so tool libs + machine envelopes stay consistent. `ShopConfigurationEngine`'s controller-map IDs (VMC-01..05/LTH-01..07, matching post-processor filenames) carry NO mill max_rpm so cannot drive clamping. **FLAGGED for reconciliation (a juliett/papa DB task), not merged:** model-name deltas between the two inventories -- Hurco VM30i↔VMX30i, Okuma M460V-5AX↔MB-56VA, Roku-Roku HC658-II↔RMX-5.

**SHARED-TREE RACE (R12):** committing to MAIN, my files folded into **alpha's `db02ed6b11`** via a cherry-pick that started in the git-add->commit window (2nd occurrence -- see [[feedback_check_inprogress_git_op_before_commit]] RECURRENCE). Verified intact: 68 by-machine files + generator + test in HEAD, 7/7 tests pass -- data LIVE + correct, attribution wrong, peers built on top so NOT rewritten.

**FUSION-IMPORTABLE extension SHIPPED** (commit `fa9f37969b` [MAIN-FORCE], U-FLEET-FUSION-IMPORT). Each machine now also gets `by-machine/{id}/FUSION-IMPORT.csv` -- the full 173-col Fusion CSV_TOOLS format (header md5-identical to JM's source cribs), every preset row material-first ordered, importable straight into Fusion as that machine's library. `buildFusionRow` clones the source tool's verbatim geometry/holder columns + overrides only the cutting cells (spindle/surface speed, feeds, stepdown/over, CSS) with the spindle-clamped preset. Correct machine class from the source-crib FILENAME (avoids the insert-vs-twist-drill ambiguity a merged-crib post-process would hit). Verified: 0 rows exceed haas-vf-2's 8100 cap, 54 pinned at 8100, geometry preserved. `--reset` now preserves README.md (was wiping the doc). 12 FUSION-IMPORT.csv, 31,392 presets.

**This commit landed CLEANLY as my own** (`fa9f37969b`, HEAD) -- the in-line same-command cherry-pick guard (`[ -e .git/CHERRY_PICK_HEAD ] && abort || git commit`) BEAT the race that folded the prior two commits into peers. Confirms the [[feedback_check_inprogress_git_op_before_commit]] RECURRENCE fix #2 (tighter guard) works in practice.

**NEXT (honest, not done):** (1) the geometry gaps from [[reference_cam_collision_sim_geometry_state_2026_06_15]] (hyperMILL export drops geometry -> kilo; holder segment profiles -> need JM source data) still pending. (2) reconcile the 3 machine-model name deltas (ShopConfig vs MachineConfig) -- a juliett/papa DB task.

Linked: [[reference_corpus_cutting_corpus_2026_06_14]] (the 118K corpus cutting data), [[reference_cam_collision_sim_geometry_state_2026_06_15]] (geometry state), [[reference_fusion_per_grade_allconditions_2026_06_11]] (the material->type->brand crib).
