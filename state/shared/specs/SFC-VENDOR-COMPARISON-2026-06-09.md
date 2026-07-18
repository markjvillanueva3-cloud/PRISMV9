# SFC vs published-reference comparison + axis-propagation findings (2026-06-09, slot:oscar)

> Goal: "compare ALL possible calculations/parameters with max variability to gwizard and hsmadvisor."
> This is the FIRST real numbers-on-the-table comparison. Harness: `mcp-server/scripts/sfc-baseline-compare-run.ts`
> (`SpeedFeedBaselineComparatorEngine` + curated `BASELINE_DB`). G-Wizard's own numbers require the live
> app's crib export (`GWizardComparatorBridgeEngine` reads `toolcrib.csv`) — not present in this environment;
> the published-reference baselines (Sandvik / Kennametal / CNCCookbook / **HSMAdvisor-public**) ARE present.

## PASS 1 — PRISM SFC vs published baselines (10 BASELINE_DB cells, default PRISM-optimized mode)

| material | dia | op | cut | PRISM vc | median vc | Δ | in-env | agree |
|----------|-----|----|----|----------|-----------|---|--------|-------|
| AISI 1018 | 12 | milling | rough | 140 | 220 | **−36.4%** | no | 0.00 |
| AISI 1018 | 6 | milling | rough | 140 | 200 | −30.0% | no | 0.00 |
| AISI 304 SS | 12 | milling | rough | 100 | 135 | −25.9% | no | 0.00 |
| Gray cast iron | 12 | milling | rough | 170 | 170 | +0.0% | no | 0.10 |
| 6061-T6 Al | 10 | milling | rough | 365 | 775 | **−52.9%** | no | 0.00 |
| Ti-6Al-4V | 10 | milling | rough | 46 | 55 | −16.4% | no | 0.70 |
| 4140 HRC45 | 10 | milling | finish | 107 | 85 | **+25.9%** | no | 0.65 |
| 1018 turn | 25 | turning | rough | 185 | 230 | −19.6% | no | 0.77 |
| 6061 turn | 25 | turning | rough | 365 | 575 | −36.5% | no | 0.50 |
| 1018 drill | 10 | drilling | rough | 105 | 115 | −8.7% | **YES** | 0.86 |

**SUMMARY: 1/10 in the ±15% envelope · mean agreement 0.358 · mean |Δvc| = 25.2% vs baseline-median · 37.8% vs HSMAdvisor-public (n=1, 1018-12mm).**

## Finding 1 — PRISM systematically UNDER-speeds vs published references (~25% mean, 53% worst)
PRISM's recommended Vc is consistently BELOW Sandvik/Kennametal/CNCCookbook/HSMAdvisor (8 of 10 cells negative).
Worst: 6061 aluminum (PRISM 365 vs published 775, −53%) — roughly half. Conservative = safe, but a machinist/
competitor sees 25–53% of speed left on the table. The base `CUTTING_PARAMS` table in `UltimateSpeedFeedEngine`
is the lever (esp. the N-group aluminum + P-group steel rows). NOT a quick tune — needs a vendor-calibration pass
(physics-reviewer + S(x) gated; raising Vc is the un-safe-leaning direction).

## Finding 2 (root-caused) — the orchestrator's DEFAULT mode bypasses the axis factors
The 3 shipped axes (tool_material, coolant, machine_rigidity) are applied to the engine's PRIMARY
`sfc.cutting_speed.value`, BUT the default **PRISM-optimized** mode in `SpeedFeedNineAxisOrchestratorEngine.
buildModeRecommendation` (line 789-794) reads `sfc.alternatives.balanced.vc` instead — and the engine's
ALTERNATIVES (`UltimateSpeedFeedEngine.ts:2640-2661`) are computed as `baseVc × strategy × hardness` WITHOUT
the tool_material/coolant/rigidity factors. So through the orchestrator's default surface the axes are inert
(`carbide vc = hss vc = 140`), even though the core engine differentiates correctly.

Proof (live):
- orchestrator default: tool_material carbide=140 == hss=140  → DROPPED
- core engine direct: carbide=140 / hss=49 / ceramic=350; coolant flood=140 / dry=109; rigidity low=98 / med=140 / high=154  → LIVE

cost_batch + aggressive_rush modes DO reflect the factors (they read `sfc.cutting_speed.value`, line 764). Only
the default PRISM-optimized path uses the un-factored alts.

### THE FIX (next unit — `U-OSC-ALTS-FACTOR`)
Apply the tool_material × coolant × rigidity factors to the engine's 3 alternative parameter sets
(`alts.{conservative,balanced,aggressive}.vc`) so they are consistent with the primary Vc. Requires hoisting
`toolMatFactor` + `coolantFactor` (currently local to the Vc `else` block ~2088-2105) to a scope visible at the
alts (2640); `rigidityFactor` is already in scope (2629). Then the orchestrator's default surface — the one the
comparator + CAD/CAM consume — finally reflects the axes. Physics-reviewer + per-file scrutiny gated.

## Coverage / honesty
- Covers: PRISM vs published refs (incl. HSMAdvisor-public) on 10 BASELINE_DB cells.
- Does NOT cover: G-Wizard's own numbers (needs live `toolcrib.csv` export — external dep), nor "every
  combination" (BASELINE_DB is 10 curated cells; the full combinatorial sweep needs the remaining inert axes
  live + the alts fix so variation actually propagates).
- The genuine "every combination vs both vendors" goal is multi-iteration: (1) `U-OSC-ALTS-FACTOR` so axes reach
  the surface, (2) remaining axes (holder/spindle/controller/workholding/insert + rigidity-DOC), (3) vendor
  datasets for G-Wizard, (4) the full sweep.
