---
name: reference_oscar_sfc_converge_assessment_2026_06_25
description: PRISM_SFC_CONVERGE assessment -- orchestrator carbide base (200) vs validated core balanced (160) is a band-anchor philosophy difference; correcting it is OPERATOR-GATED (customer-facing published-Vc change). Recommendation memo.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.699Z
aliases: reference_oscar_sfc_converge_assessment_2026_06_25
---


# PRISM_SFC_CONVERGE assessment (slot:oscar, 2026-06-25) -- OPERATOR-GATED decision

Assessed during the "do it all" sweep. Verdict: **leave-as-tracked-initiative; do NOT flip the default or
correct the base table without operator sign-off** -- it changes the customer-facing published Vc for the
saleable SFC product.

## What converging does (verified)
`SpeedFeedOrchestratorEngine.ts` ~3295-3442: when `process.env.PRISM_SFC_CONVERGE==='1'` the orchestrator
DELEGATES core physics to `UltimateSpeedFeedEngine.calculate()` (the 401-gauntlet core) and FULLY REPLACES
the 8 core quantities (Vc/fz/Vf/Fc/power/torque/life/Ra) + derived -- but ONLY behind a hard machine-limit
safety gate (power/torque/rpm/deflection/feed/workholding). On any breach / invalid shape / exception it
falls back to the orchestrator's own clamped value (R12 fail-loud). Replace-or-fallback, never a blend.
Default is OFF (not set in .env or any settings.json).

## Root of the ~1.13-1.37x carbide divergence (pinned)
TWO different base-speed tables for the same (material, op, cut):
- Orchestrator headline base: `MATERIAL_DB.steel.vc_base.roughing = 200` (`:500`) -- anchors at the TOP of
  the carbide P band.
- Validated core: `CUTTING_PARAMS.P_milling_roughing.vc = [100,160,220]` -> balanced column **160**.
- 200/160 = 1.25 (dead-center of the observed band). NOT a missing factor or rounding -- a base-anchor
  PHILOSOPHY difference (band-top vs balanced). 200 m/min for 1045-P carbide is still WITHIN the published
  carbide band (~110-200), at the aggressive end -- so this is a calibration choice, NOT a safety over-speed.

## Why OPERATOR-GATED (not auto-shipped under "do it all")
Both options change the CUSTOMER-FACING published Vc for the saleable SFC product:
- Flip default ON -> every sf_orchestrate / /speed-feed-calc / /auto-speed-feed routes through delegate-or-
  fallback (silent customer behavior change on an unbounded input subset; and for the canonical JM-Die
  aggressive cut the delegate OVER-TORQUES the haas and falls back to 200 anyway -- partial change).
- Correct the `MATERIAL_DB.vc_base` table to the core balanced columns (200->160 etc.) -> cleaner durable
  end-state (removes the dual-engine fallback ambiguity) BUT moves published numbers ~20% across the board.
Per safety rules, a customer-facing product-number change is operator-only. The directive "do it all" does
NOT override the operator-only classification ("never auto-decide an operator-only fork").

## Blast radius (if/when the operator approves a base-table correction)
- `SpeedFeedOrchestrator-converge-flag.test.ts:58-59,86,116,204` hard-code 200/9 as the production contract
  -> must be re-baselined INTENTIONALLY (R9), never weakened.
- `reference_oscar_sfc_deflection_vc_lever_2026_06_23` parity-probe baselines re-anchor 200->~160.
- `vcFloor = vcBase*0.23/0.30` scales proportionally; re-run the 401-gauntlet + ProductEngine page tests.

## Recommendation for the operator
Correct the orchestrator `MATERIAL_DB.*.vc_base` to match the validated core's balanced columns (the durable
fix; removes the dual-engine flag), using `SFCConvergencePreviewEngine` (`prism_calc:sfc_convergence_preview`,
read-only) as the evidence package. Sign-off needed because it moves the saleable product's published numbers.

Related: [[reference_oscar_orch_toolmat_blind_2026_06_25]] · [[reference_oscar_full_sweep_276k_accuracy_2026_06_25]]
