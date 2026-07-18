---
name: reference_jm_vmc_spindle_envelopes_2026_06_02
description: "Verified JM mill fleet (VMC-01..05) spindle envelopes (power_kw/max_rpm/torque) for SFC power-headroom grounding; VMC-05 unmapped; shipped as U-MILL-MACHINE-GROUND. Source of truth = src/data/jm-mill-fleet-envelopes.ts."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.629Z
aliases: reference_jm_vmc_spindle_envelopes_2026_06_02
---


# JM mill fleet spindle envelopes — verified (slot foxtrot, 2026-06-02)

**Source of truth:** `mcp-server/src/data/jm-mill-fleet-envelopes.ts` (`JM_MILL_FLEET_ENVELOPES` map + `resolveJmMillEnvelope(id)` + `machineGroundingConstraints(env)` gate). Shipped in commit `f95571612` (U-MILL-MACHINE-GROUND / POST-TRAIN-MS0). Every value was adversarially verified against on-disk catalogs (workflow `jm-vmc-spindle-verify`, 2-pass verify+refute per machine) — **NOT fabricated**.

| VMC | machine | power_kw | max_rpm | torque_nm | rigidity | verified | catalog source |
|-----|---------|----------|---------|-----------|----------|----------|----------------|
| VMC-01 | Hurco VM30i (WinMAX) | 18.6 | 10000 | 143 | high | ✅ | machine-profiles-catalog-ext.ts L2799-2804 (BT40) |
| VMC-02 | Okuma GENOS M460V-5AX | 22 | 15000 | 87.5 | high | ✅ | machine-profiles-catalog-ext2.ts (catalog row reads 'M460-VE(e)', same GENOS M460 family; torque cross-check-corrected 100→87.5) |
| VMC-03 | Haas VF-2 | 15 | 8100 | 100 | high | ✅ | machine-post-enriched.ts L5746 (CAT40) |
| VMC-04 | Haas OM-2 (Office Mill) | 5.6 | 15000 | 18 | low | ✅ | machine-enrichment-catalog.ts (BT30) — LOWEST power, strictest gate |
| VMC-05 | Roku-Roku HC 658-II | — | — | — | — | ❌ UNMAPPED | jm-die-profile.ts L252 (registered; spindle nameplate ABSENT from catalogs) |

**Two caveats (do NOT lose):**
- **VMC-03 Haas VF-2 = 15 kW in catalog, but Haas publishes 30 HP / 22.4 kW** for the standard VF-2 spindle. Using the catalog (lower) figure is **conservative / safe-side** for a power-headroom gate (stricter, never looser). Flagged for a data-lane reconciliation pass (catalog vs OEM datasheet).
- **VMC-05 Roku-Roku HC 658-II is UNMAPPED** — exact model not in any catalog. Callers MUST fail-soft to machine-agnostic grounding; **never substitute a neighbour Roku-Roku model's specs**. To map: add the HC 658-II nameplate to a catalog (juliett/data lane) then flip `verified:true`.

**How it's consumed (physics gate #3 — spindle power ≤ installed − ~20% headroom):** `machineGroundingConstraints(env)` is the ONLY path a spec reaches `UltimateSpeedFeedEngine.calculate()` — it returns `undefined` for `verified:false`, NaN/Infinity/≤0 power, or unknown id (an unverified/non-finite power can never reach the safety calc). `calculate()` then caps rpm at `machine_max_rpm` (hard ceiling) and computes `power_utilization_pct` + `limiting_factor="power"` against `machine_power_kw × 0.85`.

**Wired into:** `MillToolpathTemplateLibraryEngine.generateLibrary({machine})` + `.generateSFCGroundedLibrary({machine})` + `MillTemplateTrainingHarnessEngine.runFleetClosedLoopTest` (auto-grounds each VMC against its own envelope; aggregates `machine_grounded_cells`/`power_limited_cells`/`rpm_capped_cells`/`unmapped_machines`). Dispatcher: `mill_template_library`/`mill_sfc_grounded_template_library`/`mill_template_train_sweep` gained a `machine` param.

**How to apply:** any mill physics/SFC/quoting work that needs a JM machine's real spindle limit reads `resolveJmMillEnvelope("VMC-0X")` — do NOT re-grep catalogs or hardcode. Relates: [[feedback_foxtrot_spindle_power_headroom]] · [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]] · [[reference_ultimatespeedfeed_calculate_slow_2026_06_01]] · [[feedback_check_units_first]].
