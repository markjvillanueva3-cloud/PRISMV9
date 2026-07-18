---
name: speed-feed_synthesis
description: "[auto-synth · verify] Compounding synthesis of the speed-feed domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: speed-feed
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T02:43:48.487Z
  sourceHash: ae706ff9743e
  advisoryOnly: true
  mustHumanVerify: true
---

# speed-feed — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Full‑combination per‑machine sweep** is treated as the baseline completeness metric (19.6 M cells, 0 failures) and must be re‑run for every new variation [reference_oscar_sfc_per_machine_core_complete_2026_06_17].
- **Material awareness** is now baked into the speed‑feed engine chain (`sfcApi → ProductEngine.sfcCalculate → ManufacturingCalculations.calculateSpeedFeed`) to select appropriate constants per ISO group [reference_oscar_sfc_page_material_aware_fix_2026_06_23].
- **Canonical Kienzle cutting‑force constants** (`kc1.1` per ISO material) are the single source of truth for all force, power and MRR calculations [reference_oscar_sfc_canonical_kc_per_iso].
- **Vendor comparison tri‑comparator** surfaces explicit deltas (PRISM vs G‑Wizard / HSMAdvisor) and consistently shows a +67‑91 % feed advantage [reference_oscar_sfc_per_vendor_compare_2026_06_09].
- **Convergence preview & flag gating**: `prism_calc:sfc_convergence_preview` runs side‑by‑side against the ultimate engine; the convergence feature is behind a disabled flag (`PRISM_SFC_CONVERGE`) to protect production [reference_oscar_sfc_converge_flagged_built_2026_06_22] & [reference_oscar_sfc_convergence_preview_2026_06_22].
- **Frontend ownership & wiring**: Oscar now owns the SFC frontend and the page routing map distinguishes three pages with distinct backend paths (Calculator, Speed‑Feed orphan) [reference_oscar_sfc_frontend_ownership_2026_06_22] & [reference_oscar_sfc_frontend_wiring_map_2026_06_22].
- **Systemic over‑estimation bugs**: cutting force/power inflated ~3× for low radial engagement, and surface‑finish Ra inflated ~16×; both stem from missing physics terms (mean chip thickness, engaged‑teeth duty) in the orchestrator [reference_oscar_sfc_orch_force_power_3x_divergence_2026_06_25] & [reference_oscar_sfc_surface_finish_pertooth_2026_06_23].
- **Product bridge non‑functionality**: the web calculator was blocked by a false `prism_product:sfc_calculate` flag, preventing any calculation until the bridge is repaired [reference_oscar_sfc_product_bridge_2026_06_25] & [reference_post_ship_sfc-web-accuracy-u-osc-sfc-product-bridge].

## Key decisions & rules
| Decision | Rule / Implementation |
|----------|-----------------------|
| **Frontend control** | Oscar controls all SFC UI layers (web, Electron, iOS, Android) – overrides default `frontend → quebec` slot [reference_oscar_sfc_frontend_ownership_2026_06_22]. |
| **Sweep completeness** | Every machine‑spindle‑controller‑material‑holder combination must be covered; the sweep is considered *finished* only when the 19.6 M‑cell run reports zero failures [reference_oscar_sfc_per_machine_core_complete_2026_06_17] & [feedback_sfc_test_every_variation_per_machine]. |
| **Physics constants source** | Use `physics/constants.ts` for Kienzle `kc1.1`; never inline or duplicate [reference_oscar_sfc_canonical_kc_per_iso]. |
| **Material‑aware engine path** | Route calculations through the material‑aware branch; ensure ISO group lookup before any force/power formula [reference_oscar_sfc_page_material_aware_fix_2026_06_23]. |
| **Convergence gating** | Feature flag `PRISM_SFC_CONVERGE` defaults OFF; enable only after validation via `prism_calc:sfc_convergence_preview` [reference_oscar_sfc_converge_flagged_built_2026_06_22] & [reference_oscar_sfc_convergence_preview_2026_06_22]. |
| **Vendor delta reporting** | Tri‑comparator must display absolute and percentage deltas for feed, force, power against each external source [reference_oscar_sfc_per_vendor_compare_2026_06_09]. |
| **Telemetry handling** | Defer fire‑and‑forget telemetry to after `calculate()` completes; keep it read‑only during convergence preview [reference_post_ship_oscar-sfc-9axis-ms0-u-osc-sfc-perf]. |
| **Calibration persistence** | Harden calibration data storage and persist across restarts (see hardening commit) [reference_post_ship_oscar-sfc-9axis-ms0-u-osc-calib-persist-harden]. |

## Open threads
- **Force/power over‑estimation fix** – incorporate missing mean chip thickness (`Martellotti`) and engaged‑teeth duty into the orchestrator to eliminate the ~3× divergence [reference_oscar_sfc_orch_force_power_3x_divergence_2026_06_25].
- **Surface‑finish scaling correction** – determine the exact factor causing the ~16× Ra inflation and adjust `calculateSurfaceFinish` accordingly [reference_oscar_sfc_surface_finish_pertooth_2026_06_23].
- **Orphaned Speed‑Feed page routing** – resolve the orphan status of `/speed-feed` in the wiring map; ensure it hits the correct backend path [reference_oscar_sfc_frontend_wiring_map_2026_06_22].
- **Custom per‑machine engines vs universal physics lib** – evaluate whether bespoke engines are needed for outlier machines or if the shared physics library suffices [reference_oscar_sfc_engine_inventory_and_per_machine_2026_06_25].
- **OutcomeBus eperm fix** – verify that data‑SPI permissions are correctly set after the EPERM patch [reference_post_ship_oscar-sfc-9axis-ms0-u-osc-outcomebus-eperm-fix].
- **HyperMILL macro override integration** – finalize the bridge to hyperMILL macros and validate end‑to‑end behavior [reference_post_ship_bridge-deep-u-bridge-sfc-hypermill].
- **Full telemetry enablement** – plan rollout of fire‑and‑forget telemetry once convergence flag is proven stable.
