---
name: reference_oscar_sfc_t1b_sdm_chatter_2026_05_30
description: "T1-B shipped — semi-discretization (Insperger-Stépán) chatter solver + ae/D<0.5 selector router, the monolith-absorb parity-critical chatter gap"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.712Z
aliases: reference_oscar_sfc_t1b_sdm_chatter_2026_05_30
---


OSCAR-SFC-9AXIS-MS0/U-OSC9-ABSORB-2 + 2B (slot:oscar, 2026-05-30). T1-B from the monolith absorb plan ([[reference_oscar_sfc_monolith_absorb_plan_2026_05_29]]). Two commits: `23f045da09` (solver) + `3375197d27` (selector).

**Gap closed:** the existing chatter stack was analytic-only — `algorithms/StabilityLobeDiagram.ts` (Altintas-Budak zero-order SDOF) + `FRFStabilityLobe.ts` + `STFTChatter.ts`. The analytic zero-order method systematically OVER-predicts the stable critical depth at low radial immersion (ae/D < 0.5 — JM Die's adaptive-roughing regime) and is blind to period-doubling (flip) lobes. No semi-discretization existed.

**Built:**
1. `algorithms/SemiDiscretizationStability.ts` — Insperger-Stépán zeroth-order SDM for 1-DOF regenerative milling. Discretizes the DDE, builds the augmented **(k+2)-dim Floquet monodromy matrix** (position-only delay → augmented state [x,ẋ,x₋₁,…,x₋ₖ]), finds critical DOC where spectral radius ρ(Φ)=1 by bisection. Real physics: closed-form 2×2 matrix exp (e^{pΔt}(C·I+S·(M−pI))), milling directional coefficient h_xx=Σ g(φⱼ)·sinφⱼ(cosφⱼ+Kr·sinφⱼ) with up/down/slot entry-exit arcs, spectral radius via power-iteration geometric-mean growth rate, bifurcation classifier (hopf vs period_doubling from dominant-multiplier alignment — labeled diagnostic). Wired into `ALGORITHM_REGISTRY` (id `semi_discretization_stability`, sibling of analytic `stability_lobe`). 24 tests.
2. `algorithms/ChatterStabilityRouter.ts` — the "selected when ae/D<0.5" policy: `recommendChatterSolver(ae)` + `criticalDepthRouted(input)` route low immersion → SDM, else → analytic. Router validates ae∈(0,1] at the boundary so BOTH branches fail loud (StabilityLobeDiagram does NOT range-check immersion — fixed a reviewer-B P2 in-session). 11 tests. Exported from index.ts.

**Verification — the GOLDEN anchor (reusable pattern for any Floquet/monodromy code):** at a_p→0 cutting vanishes, the monodromy reduces to exp(A·τ), whose dominant multiplier magnitude is EXACTLY exp(−ζωₙτ) (structural decay over one tooth period). The test computes this from raw inputs and asserts ρ(Φ(a_p→0))≈exp(−ζωₙτ) to 2 decimals — an exact end-to-end check of the matrix-exp + augmentation + spectral-radius pipeline, independent of stiffness. This caught nothing (code was right) but is the kind of analytic invariant that makes a numerical solver trustworthy.

**Test-scenario gotcha learned:** modal stiffness units — `stiffness_N_mm` of "20 N/µm" = 20000 N/mm = 2e4, NOT 2e7. I initially wrote 2e7 (1000× too stiff) → the system was chatter-immune (no limit below the 500mm cap) → 5 tests failed against an unrealistic scenario. The ENGINE was correct (an ultra-stiff spindle IS immune). Realistic flexible mode for the low-immersion regime ≈ 1e4 N/mm (10 N/µm). Also corrected a wrong-premise test (assumed slot<up b_lim; actually low-immersion up-milling had the LOWER limit — exactly the SDM thesis that low immersion is less stable than naive expectation).

**Open follow-up:** an existing higher-level `ChatterStabilityEngine.compute()` (foxtrot's U-CHATTER-SLD-RESTORE, [[reference_chatter_engine_regression_2026_05_24]]) wraps StabilityLobeDiagram — it could adopt `criticalDepthRouted` to gain the SDM low-immersion path. Not wired into that engine yet (it's a separate consumer). The SFC 9-axis orchestrator ([[reference_oscar_sfc_nine_axis_contract]]) is the canonical recommendation path that would ultimately surface this.

Session context: shipped alongside SFC frontend P1/P2/P3 ([[reference_oscar_sfc_fe_p3_strategy_panel_2026_05_30]]) under the operator's "build everything we need so we can start testing + finish the front end app" order. Remaining backend: task#31 JC single-source dedup (JohnsonCookEngine 62 vs JohnsonCookModel 63).
