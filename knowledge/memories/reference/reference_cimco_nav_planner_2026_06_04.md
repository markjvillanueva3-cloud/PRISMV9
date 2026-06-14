---
name: reference_cimco_nav_planner_2026_06_04
description: "CIMCO blind-nav PLANNER — goal-driven executable layer over the static 511-surface nav-map (U-CIMCO-NAV-PLANNER, slot:echo)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.065Z
aliases: reference_cimco_nav_planner_2026_06_04
---


**CIMCO blind-nav PLANNER — U-CIMCO-NAV-PLANNER (slot:echo, 2026-06-04, commit `d92b58cd21`)**

The EXECUTABLE layer over the static map. `cimco-nav-map.mjs` is a passive surface catalog and `synthesis.criticalProcedures` is baked text; `scripts/cimco-nav-planner.mjs` composes the ordered, channel-prioritized, FAIL-LOUD step plan to prove a PRISM post on a **specific** JM machine.

- `planNavigation({jobType:open|verify-external|compare|simulate, ncFile, jmMachineId?, goldenFile?})` resolves JM machine → sim `.mcfg` (jm-fleet-sim-map.json) and classifies the proof arm: `byte-equiv` (offline compareNC) · `external-cmd` (blind-safe FILE hook) · `sim-uia` (collision verdict — UIA + live license, SPINE-2) · `discharge-physics` (EDM). `planFleet()` → all 15 JM machines (**12 sim-uia gated + 3 EDM**). CLI `plan|fleet|summary`. Reuses `loadNavMap/queryNav/CHANNEL_RANK` (no dup).
- **Honest (R12):** `verdictProducible` gates `blindDriveable` (a null-arm verdict job never reads blind-driveable); unverified launch never promoted to blind-safe; **25.4× units guard** on `unitsResolved=false`; corrupt mill/lathe (null `cimcoMatch`) THROWS instead of mis-routing to EDM.
- 27/27 tests; per-file 2-reviewer PASS — arm-B caught a P1 (blindDriveable decoupled from verdict producibility) + P2 (corrupt-data fail-loud hole), both fixed + regression-locked.

Iteration 1 of the CIMCO full-suite proveout `/loop`. Sibling: [[reference_cimco_verify_open_file_2026_06_04]]. Wiki [[cimco-verification-simulation-integration]]. Static-map provenance: [[reference_cimco_navmap_2026_06_03]].
