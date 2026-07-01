---
name: reference_oscar_sfc_wiring_audit_2026_06_19
description: "SFC wiring-completeness audit (2026-06-19, slot:oscar) -- ~96 SFC-applicable engines/algos are UNWIRED-INTO-THE-RESULT; orchestrators re-implement physics inline. Plus commit-path resolution + feature designs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.715Z
aliases: reference_oscar_sfc_wiring_audit_2026_06_19
---


SFC wiring-completeness audit + launch-feature designs (2026-06-19, slot:oscar). Operator /goal sequence:
"validate SFC vs G-Wizard/HSMAdvisor" -> "do shop-recommended default + ROI tool suggestions at price points"
-> "go through ALL engines/algorithms/formulas, ensure everything applied to the SFC is wired so it's fully
functional." Ran via Ultracode multi-agent workflows.

**WIRING AUDIT (14-agent workflow, task wgouelmpn) -- THE headline finding:**
**"WIRED-via-dispatcher != wired-into-the-SFC-result."** ~233 SFC-applicable assets: ~95 WIRED / **~96
UNWIRED-BUT-APPLICABLE** / ~62 DEAD. Most "wired" engines are reachable ONLY as standalone `calcDispatcher`
actions -- a user calling `speed_feed`/`ultimate_speed_feed` does NOT get them. The 3 orchestrators
(UltimateSpeedFeed / SpeedFeedNineAxis / SpeedFeedOrchestrator) **re-implement** force/thermal/deflection/
engagement/holder/chip-thinning physics INLINE. SFC is functional but ISOLATED from ~40+ specialist engines.
**Most isolated:** Deflection (0/13 wired -- all inline delta=FL^3/3EI), tool-wear (5/19), closed-loop sinks
(comment/type-only). R12 caveat: ground-truth-map + coolant scans were rate-limited (429) -> counts are ~,
need a re-verify pass. Full report: `state/shared/specs/SFC-WIRING-COMPLETENESS-AUDIT-2026-06-19.md` (committed
slot/oscar f8cdde844c). **Top-10 gaps:** (1) InstantaneousEngagement/CWEZBuffer replaces inline hex_mm (the
2026-06-10 regression source); (2) HeatTreatmentAwareSpeedFeed (25-40% Vc error on Q&T stock); (3)
SFCFewShotNewMaterial (silent steel defaults for unknown mat = R12 violation); (4) ChipThinningCompensation
canonical vs inline divergence; (5) deflection engines (0 wired); (6) ResidualStress+SurfaceIntegrity; (7)
StochasticToolWear+BayesianWear; (8) EffectiveDiameterCompensator (ball tools); (9) Cryogenic+HPC coolant; (10)
SFCOutcomeCaptureWire+CrossProcessOutcomeStore (closed-loop sink is comment/type-only). Roadmap = SFC-WIRING-MS0
(multi-unit, dependency-ordered, physics-reviewer on force paths).

**COMMIT-PATH RESOLVED:** the lane guard blocks engine commits to cad-fusion-live-ms0 from a slot chat (it
derives scope from `git worktree list`, not chat-slots branch -- 5 failed attempts). FIX: brought the
`slot/oscar` worktree CURRENT (`git -C H:/prism-slot-oscar merge cad-fusion-live-ms0` -- was 391 behind, CLEAN
merge, commit bc58639912) -> now commit lane-compliantly to slot/oscar via `git -C H:/prism-slot-oscar add
<abs-worktree-path>` (golf merges back). NOTE: the worktree has STALE uncommitted state from a prior session
(line offsets differ from HEAD) -- build engine changes carefully or reset-clean first.

**ROI-popup regression fix ALREADY LANDED** on cad-fusion-live-ms0 (HEAD has `rec.cost_per_part_usd ?? 0` at
SpeedFeedNineAxisOrchestratorEngine.ts:1239 -- a peer committed the identical fix during the session). **P-steel
fix NOT applied** (I only validated via input-override; HEAD still [90,140,185]); physics-approved ->
[100,160,220], safety caveat closed (all JM mills cap 5000rpm -> 12mm tool RPM-gated to Vc=188 regardless).

**FEATURE DESIGNS READY (design workflow wycxbkpc4):**
- **shop_recommended default goal** = new `optimize_for` enum via index-INTERPOLATION `balanced+0.80*(aggressive
  -balanced)` (NOT a 4th table column); interpolate vc+fz, keep ap/ae at balanced. Defaults: engine
  optimize_for L3131 + orchestrator mode->optimize_for L788-794 (prism_optimized -> shop_recommended). **KEYSTONE
  (critical):** orchestrator reads `sfc.alternatives.balanced` (L891), so the core engine MUST compute
  sfc.forces at the shop_recommended chip load or power/workholding clamps under-protect -> unsafe (2026-06-10
  regression class). REST /api/v1/sfc/calculate routes to SFCCalculateEngine (SURFACE-FINISH), NOT the
  goal-driven path -- features are MCP-sfc_nine_axis_run-only, NOT REST/web-reachable (wiring gap).
- **ROI tool tiers** = DELEGATE to existing `ToolROIEngine` (95K-catalog, budget/standard/premium, real
  Taylor-C) + `ToolSelectionRecommenderEngine` for the suitability baseline; add 3 optional fields
  (tier/suitability_reason/category) to ROIInvestmentSuggestion; gate on genuine sub-optimality (uncoated->
  coated, carbide-in-Al->PCD). DO NOT build a 3rd price ladder (dedup hard-block).

**SAFETY GAPS surfaced:** no hard SLD/chatter ap-clamp + no S(x) gate in the recommendation path -- a
more-aggressive default amplifies both; vendor-parity comparator tests must pin mode=balanced or they regress.

Relates [[reference_oscar_sfc_validation_honest_2026_06_19]]. Committed slot/oscar: e89b52bd15 / 54b0e6edec /
b15fca0efc / bc58639912(merge) / f8cdde844c(wiring audit).
