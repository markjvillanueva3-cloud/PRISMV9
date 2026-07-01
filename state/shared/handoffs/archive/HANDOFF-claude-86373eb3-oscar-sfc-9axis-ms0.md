---
session: claude-86373eb3
topic: oscar-sfc-9axis-ms0
slot: kilo
written_at: 2026-06-09T15:14:46.391Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-86373eb3
status: active
---

# HANDOFF: claude-86373eb3
Updated: 2026-06-09T15:14:46.391Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-86373eb3

## STATE
5 commits this window: toolmat(2)+coolant+rigidity-Vc+vendor-compare. 182 tests green. Comparison harness sfc-baseline-compare-run.ts works (PASS1 vs published, PASS2 orchestrator-propagation check, PASS3 core-engine check). Key insight: axis live at core != axis reaches product — TWO Vc paths (primary factored vs alts unfactored); default orchestrator surface uses alts. Memory: reference_oscar_sfc_vendor_comparison_2026_06_09.

## RESUME
TOP NEXT FIX = U-OSC-ALTS-FACTOR (the linchpin). The 3 wired axes (tool_material 658c8280fe/e9b68da865, coolant 585584e3ae, rigidity-Vc 7d0affcae6) are LIVE at UltimateSpeedFeedEngine.calculate() PRIMARY Vc but DEAD on the orchestrator's default surface: buildModeRecommendation:789-794 (PRISM-optimized mode) reads sfc.alternatives.balanced.vc, and the engine alts (:2640-2661 = baseVc x strategy x hardness) DON'T apply the 3 factors. FIX: hoist toolMatFactor(:2088)+coolantFactor(:~2105) to alts scope (rigidityFactor already at :2629), multiply all 3 into alts.{conservative,balanced,aggressive}.vc so they match the primary Vc. Verify via mcp-server/scripts/sfc-baseline-compare-run.ts PASS 2 (orchestrator carbide!=hss). physics-reviewer + per-file scrutiny GATED (Vc change). THEN: re-run comparison (was 1/10 in-envelope, mean |Δvc| 25.2% under published — PRISM systematically under-speeds, worst 6061 Al -53%); that under-speeding is FINDING 1 (separate vendor-calibration unit, physics-reviewer+S(x) gated, base CUTTING_PARAMS is the lever). Then remaining axes: U-OSC-RIGIDITY-DOC (stability stiffness->critical_depth, physics-reviewer-gated), holder/spindle/controller/workholding/insert; then full sweep. G-Wizard own-numbers need live toolcrib.csv export (external). Report: state/shared/specs/SFC-VENDOR-COMPARISON-2026-06-09.md. DEDUP-FIRST always.

## CONTEXT

