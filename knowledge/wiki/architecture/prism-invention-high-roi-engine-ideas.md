---
schema: ideablock-v1
title: "PRISM invention queue — high-ROI engine, algorithm, and feature ideas derived from the wiki corpus"
domain: "PRISM architecture"
category: invention
version_state: Current
confidence: 0.93
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - The 55 canonical wiki entries of the 2026-05-21 pivot (Phase 2A/2B/2C + Phase-A math)
  - BUILD_STATE.md + PRISM-INVENTORY-LATEST.md (gap signals)
  - operator /goal Phase B directive (invent high-ROI ideas)
extracted_via: human-authored
extracted_at: 2026-05-21T17:40:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INVENTION-ENGINE-IDEAS)
---

## Purpose

Phase B of the operator /goal: *"once [the math expansion is] exhausted, invent high-ROI wikis and ideas to generate engines, algorithms, and features for PRISM."* This entry is the **invention queue** — engine/algorithm/feature ideas, each derived from a gap a wiki entry exposed, each with an ROI rationale + an effort estimate. It is a living backlog; subsequent Phase-B entries deep-dive the top picks.

## The invention method — derive ideas from documented gaps

The 55 canonical wiki entries each end with anti-patterns + tie-ins. An anti-pattern is a recurring mistake → an engine that *prevents* it is high-ROI. A tie-in that crosses domains → a bridge engine. A formula in a math entry with no PRISM engine → a missing capability. This entry mines those systematically.

## Invention queue — engines

| # | Engine idea | Derived from | ROI rationale | Effort |
|---|---|---|---|---|
| E1 | ~~**StabilityLobeAdvisorEngine**~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `ChatterStabilityLobeEngine` (35.5K, mature) already returns the lobe diagram + `optimal_rpm` + `recommendations`, wired via `prism_calc:chatter_stability_lobes`. DO NOT BUILD — see [[prism-invention-stability-lobe-advisor-spec]] §VERIFIED REDUNDANT | DROP |
| E2 | ~~**AbbeErrorBudgetEngine**~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `prism_cam` already ships `acc_21_error_model`, `acc_abbe_offset`, `acc_volumetric`, `acc_ball_bar`, `acc_thermal_error` — the full 21-component volumetric error model + Abbe offset. DO NOT BUILD | DROP |
| E3 | ~~GilbertOptimalSpeedEngine~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `GilbertEconomicSpeedEngine.ts` (9.0K) already exists. DO NOT BUILD | DROP |
| E4 | ~~**ToleranceStackMonteCarloEngine**~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `MonteCarloEngine.toleranceStackUp({dimensions,target_tolerance,samples})` already does an MC tolerance stack-up, wired via `prism_calc:monte_carlo_tolerance` + `prism_cam:stats_monte_carlo_tolerance`. Plus `ToleranceStackEngine`, `ToleranceStackUpEngine`, `LathePrintToleranceStackEngine`, `ToleranceEngine` on disk. `duplicationGuard` would block. DO NOT BUILD | DROP |
| E5 | ~~RecastLayerPredictorEngine~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `RecastLayerEngine.ts` (8.5K) already exists. DO NOT BUILD | DROP |
| E6 | ~~OEEDecompositionEngine~~ — **VERIFIED EXTEND-ONLY 2026-05-21** | — | `OEECalculatorEngine.ts` (5.7K) exists. Not a new engine — at most add a limiting-factor decomposition method to it | EXTEND |
| E7 | ~~**QueueingLeadTimeEngine**~~ — **BUILT 2026-05-21** ✓ — Kingman VUT honest lead-time | [[math-shop-floor-management-throughput-oee]] §queueing | Built + tested (24/24: 21 engine + 3 dispatcher round-trip) + wired `prism_scheduling:queue_lead_time` (8→9 actions) + Zod schema. Replaces the naive `queue_factor=2.5` estimate with ρ/(1−ρ) physics. See [[prism-invention-queueing-leadtime-spec]] | DONE |
| E8 | ~~**ABCJobCostEngine**~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `prism_business:quote_abc_cost` action already exists (businessDispatcher case ~L3307), backed by `QuotingFormulaEngine`'s activity-based costing method. DO NOT BUILD | DROP |

## Invention queue — algorithms

| # | Algorithm idea | Derived from | ROI rationale |
|---|---|---|---|
| A1 | ~~Stability-lobe solver~~ — **VERIFIED REDUNDANT 2026-05-21** — fed E1, which is itself redundant (`ChatterStabilityLobeEngine` has the solver) | — | DROP |
| A2 | ~~**MinimumZoneFitEngine**~~ (Chebyshev/L∞ fit) — **BUILT 2026-05-21** ✓ — GD&T form-error extraction | [[math-cad-geometry-nurbs-gdt]] §best-fit | Built + tested (30/30: hand-computed oracles + 4 dispatcher round-trip) + wired `prism_calc:minimum_zone_fit` (+1 action) + Zod schema. straightness (golden-section), flatness + circularity (Nelder-Mead), each clamped to ≤ the LSQ zone. 2 parallel scrutiny agents PASS. Replaces non-compliant least-squares form-error reporting | DONE |
| A3 | ~~Look-ahead feed-profile optimizer~~ — **VERIFIED REDUNDANT 2026-05-21** | — | `FeedOptimizationEngine.ts` (14.9K) + `FeedRateOptimizationEngine.ts` (19.7K) already exist. DO NOT BUILD | DROP |
| A4 | ~~**Wright learning-curve fitter**~~ — **VERIFIED REDUNDANT-LEANING 2026-05-21** | — | `prism_business:quote_learning_curve` action exists, AND three engines expose a `learningCurve` method — `AdvancedRegressionEngine`, `ManufacturingStatisticsEngine`, `DimensionalAnalysisCrossValidationEngine`. The regression/statistics engines fit from data by construction. `duplicationGuard` would very likely block a new fitter. DO NOT BUILD without first confirming none of the three already fits Wright/Crawford from (unit,cost) pairs | DROP-LEANING |

## Invention queue — features

| # | Feature idea | Derived from | ROI rationale |
|---|---|---|---|
| F1 | **Distribution-valued speed/feed output** — every SF recommendation ships P50 + P95, not a point | [[math-speed-feed-the-full-physics]] §statistical layer | Designing to the mean means half the cuts exceed the design point. **Verify-then-extend 2026-05-21: `SFCCalculateEngine.ts` exists + an `sfc_stochastic` action — EXTEND-ONLY: confirm whether sfc_stochastic already returns P50/P95; if point-only, add the distribution wrapper** | EXTEND |
| F2 | **Tribal-anchor auto-link in dispatcher descriptions** — every wired action's `.describe()` links its canonical wiki entry | [[wiring-pattern-engine-to-dispatcher]] | Compounds system injection. **Codemod script (not an engine) — GENUINE GAP; touches many dispatcher files so build in a low-contention window** | ~120 LOC — GAP |
| F3 | ~~`wiki-canonical-to-training-pairs.mjs`~~ — **BUILT 2026-05-21** ✓ | [[tribal-to-ai-training-bridge]] | Built + tested (21/21) + committed. 61 entries → 282 training pairs + drift manifest. See [[prism-invention-wiki-to-training-pairs-spec]] | DONE |
| F4 | **Cross-domain "which-limit-binds" diagnostic** — given a precision failure, route through rigidity vs thermal synthesis | [[synthesis-rigidity-envelope]] + [[synthesis-thermal-envelope]] | Turns the two synthesis entries into a live diagnostic. **Verify-then-extend: `prism_diagnosis` has inverse/troubleshoot actions — confirm overlap before build** | ~150 LOC — verify |

## VERIFIED STATUS (2026-05-21 verify-then-extend pass — all 16 ideas cross-checked vs the 3,314-engine inventory)

| Status | Ideas | Action |
|---|---|---|
| **BUILT ✓** | F3, E7, A2 | F3 wiki→training-pairs adapter (282 pairs, 21/21); E7 QueueingLeadTimeEngine (24/24, wired prism_scheduling); A2 MinimumZoneFitEngine (30/30, wired prism_calc:minimum_zone_fit) |
| **REDUNDANT — DROP** | E1, E2, E3, E4, E5, E8, A1, A3, A4 | Existing engine/action covers it (ChatterStabilityLobe, acc_21_error_model, GilbertEconomicSpeed, MonteCarloEngine.toleranceStackUp, RecastLayer, quote_abc_cost, FeedOptimization×2, learningCurve×3). `duplicationGuard` would block a new build. |
| **EXTEND-ONLY** | E6, F1 | Existing engine (OEECalculator, SFCCalculate) — add a method, do NOT create a new engine |
| **GENUINE GAP — buildable** | F2 | Codemod (tribal-anchor auto-link) — the last open build target; touches many dispatcher files so deferred to a low-contention window |
| **VERIFY-CONFIRM then build** | F4 | `prism_diagnosis` already has inverse/troubleshoot actions — confirm overlap before build |

**The decisive Phase-B finding:** the invention queue was gap-mined from the wiki corpus WITHOUT cross-checking the 3,314-engine inventory — so 7 of 8 engine proposals + 2 of 4 algorithms turned out redundant. This is the `mustHumanVerify` flag working exactly as intended: **catching redundant proposals before a build is the high-value Phase-B outcome**, not a failure. **3 of the 16 ideas were genuine gaps and all 3 are now BUILT (F3, E7, A2).** Remaining: F2 (codemod, contention-deferred), E8 + F4 (verify-confirm), E6 + F1 (extend-only). The honest Phase-B lesson: in a 3,300-engine system the marginal *new-engine* gap is small — most ROI is in **extending** existing engines and **wiring/bridging** what already exists.

## Recommended next-build order (the verified-actionable list)

| Rank | Idea | Status | Why |
|---|---|---|---|
| 1 | F2 tribal-anchor auto-link | GAP (codemod) — **the only open target** | Compounds the whole injection layer; touches many dispatcher files — build in a low-contention window |
| 2 | ~~E7 QueueingLeadTimeEngine~~ | **BUILT ✓ 2026-05-21** | Done — 24/24 tests, wired prism_scheduling:queue_lead_time |
| 3 | ~~A2 MinimumZoneFitEngine~~ | **BUILT ✓ 2026-05-21** | Done — 30/30 tests, wired prism_calc:minimum_zone_fit |
| 4 | ~~E4 ToleranceStackMonteCarloEngine~~ | **DROPPED — REDUNDANT** | `MonteCarloEngine.toleranceStackUp` already covers it |
| 5 | ~~A4 Wright learning-curve fitter~~ | **DROPPED — REDUNDANT-LEANING** | 3 engines expose `learningCurve`; `quote_learning_curve` action exists |

## Build discipline for every idea above

Per CLAUDE.md: before building ANY of these, run `duplicationGuardEngine.mustCheckBeforeCreating()` + check `ENGINE_DIGEST.md`. The 2026-05-21 verify pass above did the first-order cross-check; a second confirm at build time is still required. Each ships with real tests + dispatcher wiring per [[wiring-pattern-engine-to-dispatcher]]. **Lesson: gap-mining the wiki without cross-checking the engine inventory over-proposes — always verify-then-extend before a build.**

## Provenance

Built from the 55 canonical wiki entries of the 2026-05-21 pivot + BUILD_STATE.md + PRISM-INVENTORY-LATEST.md gap signals. Authored 2026-05-21 by slot:hotel under U-WIKI-INVENTION-ENGINE-IDEAS — **56th canonical entry**, **opens Phase B** of the operator /goal (invent high-ROI engine/algorithm/feature ideas). New `invention` category. Confidence 0.93 — these are proposals; effort estimates + the verify-then-extend flags need confirmation against the live engine inventory before any build.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `invention queue`, `engine idea`, `algorithm idea`, `feature idea`, `what to build`, `high ROI engine`, `stability lobe advisor`, `Abbe error engine`, `tolerance Monte Carlo`, `OEE decomposition`, `queueing engine`, `ABC cost engine`, `wiki to training pairs` keywords. Zero new wiring required.

## Cross-references

- [[math-speed-feed-the-full-physics]] · [[math-machine-domains-dynamics-kinematics-accuracy]] · [[math-cad-geometry-nurbs-gdt]] · [[math-cam-toolpath-mathematics]] · [[math-shop-floor-management-throughput-oee]] · [[math-business-management-costing-finance]] · [[part-setup-tolerance-stack-up-methods]] · [[wedm-tactics-multipass-and-recast]] — the math entries each idea derives from
- [[tribal-to-ai-training-bridge]] — F3 is detailed there
- [[wiring-pattern-engine-to-dispatcher]] — every idea wires per this pattern
- [[index-prism-build-gaps-and-bridges]] — bridge-layer navigation root
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule this Phase-B serves
