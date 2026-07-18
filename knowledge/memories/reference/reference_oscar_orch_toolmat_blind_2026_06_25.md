---
name: reference_oscar_orch_toolmat_blind_2026_06_25
description: "SFC safety fix -- SpeedFeedOrchestratorEngine headline Vc was tool-material-blind (HSS published at carbide speed, ~3.4x over-speed). Apply canonical factor clamped <=1.0. Commit 5684b03311."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.692Z
aliases: reference_oscar_orch_toolmat_blind_2026_06_25
---


# SFC orchestrator headline tool-material-blind over-speed (slot:oscar, 2026-06-25, commit 5684b03311)

Found while VALIDATING the aggressive-Vc cap ([[reference_oscar_hss_aggressive_vc_cap_2026_06_25]]) -- a
bigger, balanced/headline-path safety gap. The investigate-before-ship habit surfaced it.

## The bug
`SpeedFeedOrchestratorEngine.compute()` (the customer-facing `sf_orchestrate` / SFC-web path) built its
headline Vc as `vcBase * coating * insert * coolant * cam * geom * grade * calVc` -- applying EVERY factor
EXCEPT the tool-material speed factor. `vcBase` is CARBIDE-anchored, so HSS published the CARBIDE speed.
Live-probed: HSS-1045-P headline Vc = 200 m/min == carbide (correct HSS ~58-70) = ~3.4x over-speed
(P 3.44x / M 3.23x / N 3.91x). HSS red-hardness ~600 C -> the tool burns up near-instantly. Known
"carbide vc == hss vc DROPPED" issue (SFC-VENDOR-COMPARISON-2026-06-09), still live by default
(PRISM_SFC_CONVERGE off). This is the customer-default path, so a more impactful safety gap than the
aggressive-mode cap.

## The fix (safety-first <=1.0 clamp -- the key design decision)
`toolMaterialSpeedFactor = input.tool_material ? Math.min(1.0, getMaterialSpecificToolSpeedFactor(
input.tool_material, material.iso_group.value)) : 1.0`, multiplied into the headline Vc.
The `Math.min(1.0, ...)` CLAMP only ever LOWERS the headline: SLOWER-than-carbide materials (HSS 0.35x,
HSS-on-K 0.13x) are derated (the fix); FASTER-than-carbide materials (cermet 1.15 / ceramic 2.5 / CBN
1.4-2.5) stay UNCHANGED at the conservative carbide-anchored headline. **Why not the full factor:** raising
CBN/ceramic is the un-safe-leaning direction and OVER-SPEEDS at extreme hardness -- the single-value
`cbn:{H:1.4}` factor is calibrated for 58-62 HRC, not 70 HRC. A naive full-factor apply broke the HRC-70
CBN conservative-bound test (`<150`); the clamp is the safety-correct choice. Faster materials' true
capability is delivered by UltimateSpeedFeedEngine (full factor) + PRISM_SFC_CONVERGE. No double-apply under
convergence (the delegate's already-factored dVc REPLACES convergeVc). Explicit-tool-material only.

## Validation (rigorous)
carbide 200/120/500 + unspecified BYTE-IDENTICAL; HSS 70/42/175 (=0.35x); ceramic/CBN clamped to carbide.
MILL-HARD-MS1 failing-set DIFFED before/after (copy-aside, no shared-tree stash): ZERO new failures, 1
pre-existing FIXED ("HSS tool at high speed on hardened steel"). 7 new reference-value tests + 326/326 SFC
regression (incl 9-axis + baseline-comparator non-carbide) green; tsc exit 0. physics-reviewer PASS +
reviewer PASS. Also fixed the RPM-clamp "vs target" display message (was omitting toolMat/insertGrade/calVc,
over-stating HSS target ~2.86x; R12).

## Lessons
1. **Investigate before shipping a high-blast-radius central-hub change** -- the CBN extreme-hardness
   overshoot only surfaced by running the full suite + diffing the failing set; it drove the safety-first
   `<=1.0` clamp instead of a naive full-factor apply.
2. **A relative per-material factor (cbn:{H:1.4}) calibrated at one hardness can over-speed at another** --
   a single H-group value does not capture the speed collapse at extreme HRC.
3. **Diff the failing-set, not just the count** -- count 108->107 hid that my change BOTH fixed 1 and (in
   the rejected full-factor version) broke 2; `comm -23/-13` on sorted failing-test names is the proof.

## Open (sibling, NOT done)
- The 9-axis `speedFeedNineAxisOrchestratorEngine.run()` headline is ALSO material-blind (altsAxisPropagation
  "HSS < carbide" test fails pre-existing) -- a sibling of this fix in a different engine. Next unit.
- Separate convergence delta: orchestrator carbide base diverges ~1.13-1.37x from UltimateSpeedFeedEngine
  (the PRISM_SFC_CONVERGE initiative).

Related: [[reference_oscar_hss_aggressive_vc_cap_2026_06_25]] · [[reference_oscar_sfc_hss_overspeed_finding_2026_06_09]] · [[reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01]]
