---
name: reference_oscar_sfc_page_material_aware_fix_2026_06_23
description: "SFC codex page engine made MATERIAL-AWARE (slot:oscar 2026-06-23, commit 05e08b4702). The /speed-feed-calc page (sfcApi -> ProductEngine.sfcCalculate -> ManufacturingCalculations.calculateSpeedFeed) had 3 accuracy defects: (1) Vc from flat tool-material speed x Brinell-only, so 316 stainless out-ran 1045 steel (backwards); (2) constant chip load fz=D*0.02 for every material (~3x too high for steel/stainless); (3) rpm never clamped to spindle max (recommended unreachable rpm). FIX: optional iso_group anchors Vc+fz on existing canonical CANONICAL_MILLING_SPEEDS+FEEDS (dedup -- no new const), groupToISO + category aliases + rpm clamp+rescale + neg-hardness guard, 7 call sites. STILL OPEN (operator-gated): the orchestrator core (/speed-feed page) OVER-derates Vc to 18-33 m/min sub-carbide."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.710Z
aliases: reference_oscar_sfc_page_material_aware_fix_2026_06_23
---


**SFC codex page made material-aware (slot:oscar, 2026-06-23, /goal DO-IT-ALL continuation). Commit `05e08b4702`.**

## The page topology (corrected from the pre-compact premise)
There are TWO SFC web pages + THREE speed/feed engines:
- `/speed-feed-calc` -> **SfcCalculatorPage** ("codex" page, the operator's "mostly done just untested" target) -> `sfcApi` -> `/api/v1/sfc/calculate` -> `productSFC("sfc_calculate")` -> `ProductEngine.sfcCalculate` -> **`ManufacturingCalculations.calculateSpeedFeed`**.
- `/speed-feed` -> **SpeedFeedPage** (older) -> `speedFeedApi.orchestrate` -> `/api/v1/speed-feed/orchestrate` -> **`SpeedFeedOrchestratorEngine.compute()`** (the 11.2M-corpus engine; see [[reference_oscar_sfc_two_engine_divergence_2026_06_21]]).
- `UltimateSpeedFeedEngine.calculate()` (`prism_calc:ultimate_speed_feed`) -- the SFC-WIRING-MS0 target, NOT directly page-wired.

## The 3 page defects (physics-reviewer-confirmed) + fix
The real SmartMaterialSelector sends GRADE ids ("1045","316","6061") which resolve in `ProductEngine.MATERIAL_HARDNESS`; category strings ("steel"/"stainless") did NOT resolve -> silent steel fallback (the page TEST + my first probe used categories -> tested the fallback, an R9 trap).
1. **Vc inversion** -- `Vc = base_speeds[tool] * pow(200/HB, 0.3) * opFactor`, ISO-group-BLIND. 316 (HB180) out-ran 1045 (HB200). FIX: optional `iso_group` anchors Vc on canonical `CANONICAL_MILLING_SPEEDS` (P:200 M:130 N:500 rough), `* toolFactor(vs carbide) * boundedHardnessAdj([0.8,1.2] -> cannot invert group order)`.
2. **Material-blind chip load** -- `fz = D*0.02` (= 0.288 at D12 incl roughing x1.2) for EVERY material, ~3x the textbook steel/stainless roughing chip load. FIX: `fz = CANONICAL_MILLING_FEEDS[iso] * sqrt(D/12)`-bounded (P:0.15 M:0.12 N:0.20).
3. **No rpm clamp** -- page reported an unreachable rpm (only warned). FIX: clamp rpm to `machine_max_rpm`, rescale `Vc=pi*D*rpm/1000` + `vf=fz*teeth*rpm`; downstream Kienzle/Taylor/power read the clamped Vc (safe direction).

Also: `groupToISO()` (group string -> ISO P/M/K/N/S/H), `MATERIAL_CATEGORY_ALIASES` ("stainless"->"316" so categories no longer fall back to steel), `safeHardness` guard (no NaN from non-positive HB). `iso_group` threaded into ALL 7 `calculateSpeedFeed` call sites (sfcCalculate + compare/optimize/safety + cycle-time + ACNCx2). **No new constant -- reused existing canonical milling tables (dedup win; CHIPLOAD_REF table was NOT added once `CANONICAL_MILLING_FEEDS` was found).** Legacy fallback byte-identical for non-iso_group callers.

## Validation (live probe `scripts/sfc-engine-parity-probe.mjs`, 12mm 4FL carbide rough, VF-2)
| grade | published band | page Vc (was) | page fz (was) |
|---|---|---|---|
| 1045 P | 110-230 | 204 (124) | 0.15 (0.288) |
| 316 M | 90-160 | 134 (126) | 0.12 (0.288) -- now SLOWER than steel |
| 6061 N | 300-900 | 305 rpm-clamped 8100 (150) | 0.20 (0.288) |
316 power 6.35 -> 3.69 kW (lower fz). 23/23 page tests (6 new reference-value: inversion / bands / material-aware fz / category==grade / unknown-grade fallback / rpm clamp / neg-hardness) + 17/17 core fleet tests pass; tsc clean; 2-arm per-file scrutiny PASS (physics-reviewer + independent, 0 P0/P1).

## STILL OPEN -- operator/physics-review GATED (do NOT silently fix)
The orchestrator core (`SpeedFeedOrchestratorEngine.compute()`, the `/speed-feed` page) OVER-derates Vc to **18-33 m/min for carbide steel/stainless** -- below the carbide usable floor (built-up-edge regime), with a fake 9999-min capped life masking it. Its OWN internal Taylor computes the correct ~124-126 m/min but a downstream derate cascade (delegated to `UltimateSpeedFeedEngine` via `PRISM_SFC_CONVERGE`) crushes it 3.7-6.9x, even bypassing its `vcFloor`. Raising those speeds changes customer-facing recommendations UPWARD = a product speed/feed-PHILOSOPHY decision (per [[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]]), NOT a silent code fix. ESCALATED to operator. Sibling known defect: [[reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01]] (the `prism_calc:speed_feed` instance, task #52).
