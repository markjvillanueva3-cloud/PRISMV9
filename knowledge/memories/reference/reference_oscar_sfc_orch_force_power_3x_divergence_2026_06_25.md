---
name: reference_oscar_sfc_orch_force_power_3x_divergence_2026_06_25
description: SpeedFeedOrchestratorEngine over-states cutting force/power ~3x for low-radial-engagement milling (inline Kienzle at line 2930 omits Martellotti mean-chip-thickness + engaged-teeth z_e duty). Path A (ProductEngine via shared core) is correct. Root-caused by safety-physics; FIX is operator-gated (saleable-product published-number + S(x) verdict reshape). NOT yet fixed.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.709Z
aliases: reference_oscar_sfc_orch_force_power_3x_divergence_2026_06_25
---


**SFC cross-path force/power 3x divergence (slot:oscar, 2026-06-25, FOUND not yet fixed).** Surfaced via live closed-loop parity testing on :3100 (the two saleable SFC compute paths disagree for an identical cut).

**The divergence** -- identical 4140 cut (ISO P, 300 HB, carbide D=12mm z=4, ap=6mm, ae=1.8mm = 15% radial, Haas VF-2 8100rpm/22.4kW, flood, conventional/balanced roughing):
- **Path A** `sfc_calculate` -> `ProductEngine.sfcCalculate` (backs **SfcCalculatorPage** /speed-feed-calc): Vc 184, Fc **707N**, power **2.17kW**, life 8.9min.
- **Path B** `sf_orchestrate` -> `SpeedFeedOrchestratorEngine.compute` (backs **SpeedFeedPage** /speed-feed + **CalculatorPage** /calculator): Vc 150, Fc **2724N**, power **6.81kW**, life 30min.
- Force/power diverge **~3.1-3.85x**. Decisive physics: specific cutting energy Path A = 4.1 J/mm3 (physical for P-steel, 3-4); Path B = **17.7 J/mm3 (~4-5x too high)**. Path B reports HIGHER power on LOWER MRR -- physically backwards.

**Root cause (safety-physics oracle, read-only):** `SpeedFeedOrchestratorEngine.ts:2930` (+ recompute twins :3204, :3259) computes its OWN inline Kienzle `Fc = kc1_1 * ap * fz^(1-mc)` using the raw/**chip-thinning-inflated** `fz` (line 2909-2912 inflates fz x1.40 to hold MRR) **with NO Martellotti mean-chip-thickness term and NO engaged-teeth (z_e) duty factor**. At ae/D=0.15 a tooth is in cut only ~13% of each rev (z_e ~ 0.5 avg teeth engaged) and the mean chip is ~0.06*fz, NOT fz -- so omitting both corrections AND feeding the inflated fz over-states the force ~3x. The published `tangential_force_N` (:3790), `power_kw` (:3260), tool DEFLECTION (:3265 delta=Fc*L^3/3EI), and WORKHOLDING force (:3251) ALL derive from the one over-stated `finalFc`.

**Correct reference exists:** Path A flows through the shared `ManufacturingCalculations.calculateKienzleCuttingForce` (`ManufacturingCalculations.ts:308`, lines 320-359/391: Martellotti `h_mean = fz*(1-cos phi_e)/phi_e` + engaged-teeth `z_e = z*phi_e/2pi`, Altintas 2012). The fix is to route the orchestrator's force/power/deflection/workholding through that shared core (or replicate h_mean + z_e), and STOP feeding the chip-thinned fz into the force law.

**Fix is SAFE-direction but OPERATOR-GATED:**
- The over-power/STALL guard becomes correctly-calibrated (was over-conservative: flagged ~6.8kW "near limit" on a 22.4kW spindle really drawing ~2kW) -- removing a 3x over-statement = removing FALSE alarms, NOT reducing real protection. Stall direction never under-protected.
- BUT it RESHAPES the saleable product's published force/power/life ~3x on 2 of 3 SFC pages, and shifts deflection/workholding safety verdicts (cuts falsely flagged "deflection critical" at 3x force now correctly pass). That is an S(x)-verdict change on the customer-facing product -> operator-gated per the crossroad protocol's "safety/S(x)" criterion.
- Soul mandate: **verify vendor-parity before publishing** -- the corrected ~2kW must be checked vs G-Wizard/HSMAdvisor for this 4140 15%-radial cut as part of the fix.

**Blast radius (enumerated -- SMALL test impact):** the `ultimate-speed-feed-gauntlet*` 401-assert suite tests a DIFFERENT engine (UltimateSpeedFeedEngine), unaffected. The orchestrator's OWN tests assert force/power only as invariants (>0, ordering) + internal-consistency (re-derived power ~ published power, e.g. SpeedFeedOrchestrator-converge-safety.test.ts:70-71) -- NOT specific magnitudes -- so a CONSISTENT fix needs NO magnitude re-baseline. The variability corpus + `sfc_nine_axis` consume the force -> they'd get CORRECTED (better) data. (Per oracle: the corrupted core currently feeds those, per the `## Recent regressions` log.)

**Lesson:** an engine that rolls its OWN inline Kienzle instead of the shared `calculateKienzleCuttingForce` core silently drifts from the physics -- low-radial milling REQUIRES the Martellotti mean-chip-thickness + engaged-teeth duty factor; using raw (or chip-thinning-inflated) fz as the chip thickness over-states force ~3x. Cross-path PARITY probing (same cut through both saleable engines) + a specific-cutting-energy sanity check (J/mm3 vs the material's physical 3-4) is the fast way to catch it.

**RECOMMENDATION (operator sign-off):** fix the orchestrator to route force/power/deflection/workholding through the shared `calculateKienzleCuttingForce` core; validate the corrected numbers against G-Wizard/HSMAdvisor (vendor parity); physics-reviewer + 3-of-3; then refresh the variability corpus + sfc_nine_axis. Sibling of [[reference_oscar_orch_optimize_for_dead_slider_2026_06_25]] + [[reference_oscar_sfc_blocked_gate_surface_2026_06_25]] (same SFC-page closed-loop session). Relates to the page-vs-core divergence regression class.
