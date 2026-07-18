---
name: reference_oscar_sfc_vendor_comparison_2026_06_09
description: "PRISM SFC vs published refs — under-speeds ~25% (53% worst on Al); + the orchestrator default mode reads un-factored alternatives, so the wired axes are inert on the main surface."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.714Z
aliases: reference_oscar_sfc_vendor_comparison_2026_06_09
---


# SFC vs published-reference comparison + 2 root-caused findings (slot:oscar, 2026-06-09)

Ran the FIRST real numbers comparison toward the operator's "compare ALL ... to gwizard and hsmadvisor" goal, after wiring 3 axes (tool-material/coolant/rigidity-Vc) this session. Harness: `mcp-server/scripts/sfc-baseline-compare-run.ts` driving `SpeedFeedBaselineComparatorEngine` (curated `BASELINE_DB` of Sandvik/Kennametal/CNCCookbook/**HSMAdvisor-public** values). Full report: `state/shared/specs/SFC-VENDOR-COMPARISON-2026-06-09.md`.

## Finding 1 — PRISM systematically UNDER-speeds vs published refs (~25% mean, −53% worst)
Across 10 BASELINE_DB cells: **1/10 in the ±15% envelope, mean agreement 0.358, mean |Δvc| 25.2%** vs baseline-median (37.8% vs HSMAdvisor-public on 1018-12mm). 8 of 10 negative. Worst: 6061 aluminum PRISM 365 vs published 775 (−53%, ~half). The base `CUTTING_PARAMS` table in `UltimateSpeedFeedEngine` (esp. N-group Al + P-group steel) is the lever. Conservative=safe but leaves 25-53% of speed on the table — a real accuracy gap in the saleable product. Raising Vc is the un-safe-leaning direction → vendor-calibration pass must be physics-reviewer + S(x) gated.

## Finding 2 (ROOT-CAUSED) — the orchestrator's DEFAULT mode bypasses the axis factors
The 3 axes are applied to the engine's PRIMARY `sfc.cutting_speed.value`, but `SpeedFeedNineAxisOrchestratorEngine.buildModeRecommendation` line 789-794 (default **PRISM-optimized** mode) reads `sfc.alternatives.balanced.vc` instead — and the engine's ALTERNATIVES (`UltimateSpeedFeedEngine.ts:2640-2661`) are `baseVc × strategy × hardness` WITHOUT the tool_material/coolant/rigidity factors. So through the orchestrator's default surface the axes are INERT (`carbide vc = hss vc = 140`), even though the core engine differentiates (carbide 140 / hss 49 / ceramic 350; coolant flood 140 / dry 109; rigidity low 98 / high 154). cost_batch + aggressive_rush modes DO reflect them (they read `sfc.cutting_speed.value`, line 764) — only the default path uses the un-factored alts.

**This explains why the axes appeared inert in the operator's probe** — the orchestrator/9-axis surface (what the comparator + CAD/CAM consume) defaults to PRISM-optimized → un-factored alts.

### NEXT FIX — `U-OSC-ALTS-FACTOR` (top priority)
Apply tool_material × coolant × rigidity factors to `alts.{conservative,balanced,aggressive}.vc` so they match the primary Vc. Requires hoisting `toolMatFactor` + `coolantFactor` (local to the Vc `else` block ~2088-2105) to the alts scope (2640); `rigidityFactor` already in scope (2629). Then the wired axes finally reach the production surface. Physics-reviewer + per-file scrutiny gated. **Without this, the 3 axis commits don't reach the default consumer surface — it is the linchpin of the whole axis-awareness effort (R15 WIRE-to-every-consumer).**

## Lesson (compounds the coolant/rigidity lesson)
"Axis is live at the core engine" ≠ "axis reaches the product." There are TWO Vc paths: the factored primary (`cutting_speed.value`) and the un-factored alternatives (`alternatives.*.vc`); the default orchestrator surface uses the alts. ALWAYS verify an axis propagates THROUGH the orchestrator/dispatcher surface a consumer uses, not just the core singleton (R15 step: round-trip through the dispatcher, not the singleton). See [[reference_oscar_sfc_coolant_axis_wired_2026_06_09]] · [[reference_oscar_sfc_axis_impact_gap_2026_06_08]].
