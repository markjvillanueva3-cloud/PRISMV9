---
name: reference_jm_fusion_compat_gate_machine_db_2026_06_01
description: "JM-FUSION-TOOLS-MS0 expanded goal — material-compatibility preset gating + Fusion machine DB + the physics-caught P0 safety lesson (slot:romeo, 2026-06-01)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.171Z
aliases: reference_jm_fusion_compat_gate_machine_db_2026_06_01
---


**JM-FUSION-TOOLS-MS0 expanded goal (slot:romeo, 2026-06-01)** — continues [[reference_jm_fusion_matgroup_libraries_2026_06_01]]. Goal: tool+holder+MACHINE DB for Fusion, convertible to hyperMILL+Mastercam, with presets gated to material domains COMPATIBLE with each tool. Commits on cad-fusion-live-ms0:

- **U-JFT-MATGROUP-COMPAT-GATE (+FIX)** — `coatingSelectionAdapter.compatibleIsoGroups(coating, substrate)` in `CoatingSelectionAdapter.ts`: the canonical material-domain gate consumed by all CAM exports. Al-bearing PVD (TiAlN/AlTiN/ti-coated)→[P,M,K,S,H] NOT aluminum N (Al affinity→BUE); PCD→[N]; CBN→[H,K]; uncoated→[N,K]; HSS substrate→[P,M,K,N]; TiN→[P,M,K,N]; TiCN→[P,M,K]; ceramic→[K,S]; **unknown coating→conservative [P,M,K]**. Generator gates preset rows by it (1526→1151 rows).
- **U-JFT-MACHINE-DB** — `scripts/generate-jm-fusion-machine-library.ts` → 6 Fusion `.machine` XML (hsmworks ns) from `JmDieMachineConfigEngine.getAllConfigs()` filtered to vmc/5axis/mill_turn. Output `state/shared/jm-fusion-machines/`. Exported `buildMachineXml` (6 tests). X/Y range 0..travel, Z -travel..0; rotary A→"1 0 0" B→"0 1 0" C→"0 0 1".

**THE LESSON (physics-review-agent P0, R12)** — my first compat gate had unknown-coating default `[P,M,K,S,H]`, which **granted superalloy(S)+hardened(H) to an UNIDENTIFIED coating**. S/H are catastrophic-failure domains demanding a verified high-temp/superhard film — a wrong coating there shatters the tool. Fix: unknown→conservative `[P,M,K]`, never S/H without a verified film. Also HSS was wrongly denied K (cast iron — HSS taps/reamers run iron daily). **Always physics-review cutting-data domain mappings; the tests were green over wrong metallurgy.** See [[feedback_always_capture_lessons]].

**STILL OPEN (G4/G5)**: hyperMILL (HyperMillToolExportEngine.exportToHMT→SQLite; gate Materials Vc/fz by compat) + Mastercam (real .tooldb is SQLite, not the engine's .mcam-tools JSON). Both apply the same compat gate. Build LEAN (import only UltimateSpeedFeed+CoatingSelectionAdapter — toolCatalogEngine-dependent engines crash on __dirname under tsx). Full plan: handoff `state/shared/handoffs/HANDOFF-claude-859c0089-jm-fusion-tools-ms0.md`.
