---
name: reference_gnn_confirmed_wiring_labels_2026_06_24
description: India 2026-06-24 -- 11 CONFIRMED ground-truth dispatcher-wiring labels for GNN active-worklist ghost engines, mined by the sanctioned vault-to-gnn-refpool.mjs feeder (mined set 14 -> 25). Every label is a real import+invocation (file:line cited) AND corrects a wrong model prediction. SPARSE + BALANCED (<=+3/class) = the measured-SAFE regime, NOT the rejected 3206 mass-dump. The macro-F1 EFFECT is operator-measured+gated by nn-graph-retrain-lifecycle (auto-applies the feeder, gates promotion) -- NOT assumed positive; pool growth is not a free win (see reference_codebase_wired_refpool_rejected_2026_06_18).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.589Z
aliases: reference_gnn_confirmed_wiring_labels_2026_06_24
---


# GNN confirmed-wiring labels -- india 2026-06-24

These are candidate ground-truth labels for the OPEN NN/GNN PSN leg ("full-coverage pending
ref-pool growth": selective-deploy AUROC 0.808 OK; full-holdout macro-F1 0.439 < 0.55 gate).
**Pool growth is NOT a free win** -- [[reference_codebase_wired_refpool_rejected_2026_06_18]]
MEASURED that a 3206-label MASS dump REGRESSED the gate (AUROC 0.789->0.772, selective verdict
deploy-ready->no-deployable-operating-point, Brier@gate 0.04->0.26): a dense/diverse pool
manufactures spurious high-confidence votes for wrong dispatchers and kills the abstention
discipline. The 06-18 cap-sweep showed sparse/balanced subsets (cap<=20/class) HOLD the gate
(cap=20 PEAKED AUROC +0.099). **These 11 are in that measured-SAFE regime**: sparse (+11 total),
balanced (<=+3 to any class), active-learning-SELECTED (highest uncertainty x rarity), all
ground-truth -- the OPPOSITE of the rejected mass-dump. They also flow through the SANCTIONED
vault feeder (already part of the deploy-ready baseline), not the rejected codebase-wired one.
The macro-F1 EFFECT is operator-measured: nn-graph-retrain-lifecycle auto-applies the feeder,
re-evals, and GATES promotion (a sub-gate candidate is NOT promoted, so the deployed selective
path cannot regress). Each engine below is a GNN active-worklist target the
label-starved model predicted WRONG; I read each dispatcher and confirmed a REAL import +
invocation (not a comment/type-only ref), so the dispatcher it is actually wired into is its
ground-truth class. `vault-to-gnn-refpool.mjs` mines these "wired into prism_X" assertions
(confidence 0.85, above the 0.8 refMinConf gate) and `nn-graph-retrain-lifecycle.mjs` auto-runs
that feeder `--apply` as a pre-retrain stage.

## Confirmed labels (mineable -- 11, all into existing multi-example ref-pool classes)

- SFCRAGWarmStartEngine wired into prism_calc (calcDispatcher.ts:11040, real SFCRAGWarmStartEngine.retrieve). Model predicted prism_5axis.
- SFCParameterRefinementEngine wired into prism_calc (calcDispatcher.ts:9655, sfcParameterRefinementEngine import; the OSCAR-SFC-SELFLEARN-WIRE that stripped its FALSE WIRE-EXEMPT). Model predicted prism_safety.
- SFCMultiHypothesisRankerEngine wired into prism_calc (calcDispatcher.ts:9617, sfcMultiHypothesisRankerEngine import). Model predicted prism_5axis.
- SBOMReviewEngine wired into prism_safety (safetyDispatcher.ts:1030, sbomReviewEngine import, 5 read-only sbom_* inspection actions). Model predicted prism_quoting.
- TriLevelKillSwitchEngine wired into prism_safety (safetyDispatcher.ts:1006, triLevelKillSwitchEngine import). Model predicted prism_turning.
- DisasterRecoveryEngine wired into prism_dev (devDispatcher.ts:11522, disasterRecoveryEngine import; U-WIRE-DR). Model predicted prism_orchestrate.
- LokiLogSinkEngine wired into prism_dev (devDispatcher.ts:11594, lokiLogSinkEngine import; U-WIRE-LOKI). Model predicted prism_turning.
- HzpDashAuditEngine wired into prism_dev (devDispatcher.ts:11788, HzpDashAuditEngine.build; U-WIRE-HZPAUDIT, comment self-asserts prism_dev). Model predicted prism_quoting.
- TurretLayoutEngine wired into prism_turning (turningDispatcher.ts:3714, self-routes the 6 turret_* actions via executeAction). Model predicted prism_safety.
- TPEHyperparameterSearchEngine wired into prism_ai (aiReasoningDispatcher.ts:5200, tpeHyperparameterSearchEngine import; U-WIRE-TPE). Model predicted prism_turning.
- SyncCodeVerificationEngine wired into prism_cam (camDispatcher.ts:20800, syncCodeVerificationEngine import; multi-channel mill-turn/Swiss sync-code checker). Model predicted prism_safety.

Ref-pool class deltas (179 -> 190): prism_calc 21->24, prism_safety 5->7 (starved, biggest lever),
prism_dev 15->18, prism_turning 52->53, prism_ai 20->21, prism_cam 41->42.

## True but intentionally NOT fed (rationale -- R12 honest)

- MOEAStoppingCriterion is dispatched by calcDispatcher (prism_calc, calcDispatcher.ts:10993, `new MOEAStoppingCriterion`). True label = prism_calc, but the feeder anchors on an ...Engine-suffixed token and this name ends in "Criterion", so it is NOT auto-minable. prism_calc already gains +3 above, so no loss.
- PPGOutcomeCaptureWireEngine is dispatched by ppDispatcher (prism_pp, ppDispatcher.ts:2347). True, but prism_pp has ZERO other ref-pool examples, so seeding it would create a SINGLETON class that is unevaluable in the macro-F1 holdout (drags the average down). Deliberately excluded to protect the gate; revisit once >=1 more prism_pp engine is confirmed-wired.

## Domain-home candidates -- NOT fed (unwired, cannot assert "wired into" without fabricating)

Genuinely-unwired engine files whose domain home looks clear from the NAME but which I did NOT
verify by reading the body this pass (a wrong label poisons the gate worse than no label):
GeminiClientEngine / GrokClientEngine / GrokCLIClientEngine -> likely prism_ai (LLM API clients);
GrooveClassificationEngine -> likely prism_turning; CadPartLibraryEngine / OnshapeLiveCollabAdapter
-> likely prism_cad (STARVED class, high value if confirmed). These need a DIFFERENT seeder (they
are not wired, so "wired into" is false) OR an actual wiring first. Queued, not asserted.
Non-engines (cadLiveDispatch, IEngine) are NOISE -- never label.

## Corrects a documented blocker

[[reference_gnn_refpool_crossfleet_labeling_blocker_2026_06_21]] claimed india can fabrication-free
label ONLY its own AI-domain ghosts (LLM clients -> prism_ai), so the STARVED high-lever classes
(prism_safety/dev/turning/cam/cad) were "cross-fleet blocked" needing domain owners. That is true
ONLY for the DOMAIN-INFERENCE path (guessing an unwired engine's home). It is FALSE for the
ACTUAL-WIRING path: when an engine is genuinely imported + invoked in a dispatcher case, that
dispatcher IS its ground-truth class -- no domain expertise, no guessing, no fabrication. All 11
labels above are other-domain classes (safety/dev/turning/cam/calc) yet india-labelable because the
wiring is read from code. The blocker stands for unwired ghosts; it does NOT bound actual-wiring
labeling. Future india ref-pool growth = enumerate ghost.unwired-engine, keep the audit
FALSE-NEGATIVES (engines the audit calls unwired but that ARE cased in a dispatcher), label those.

## Verification path

Dry-run proof (this session): `node scripts/vault-to-gnn-refpool.mjs --json` extracts these 11
(count 14 -> 25; byDispatcher prism_calc 1->4, prism_dev 1->4, prism_safety 0->2, prism_turning
0->1, prism_ai 1->2, prism_cam 0->1; the 2 excluded engines correctly absent). The `--apply`
(542MB atomic graph merge) is auto-run as a pre-stage of the operator-gated
`nn-graph-retrain-lifecycle.mjs --force` (GPU); the macro-F1 re-grade vs the 0.55 gate is that
operator step (which gates promotion). India soul refuses promoting past the gate without real
AUROC/Brier.

QUEUED (gold-standard pre-apply, optional -- the lifecycle gate already protects production):
a NON-DESTRUCTIVE marginal measurement of just these 11, mirroring
`scripts/measure-codebase-wired-refpool-auroc.mjs --controlled` (the assessHoldout holdoutGraph
seam) but sourcing the 11 vault-wired ghosts instead of the codebase-wired 3206 -- report
Brier@gate + macroF1@gate + the selective verdict (NOT AUROC alone; AUROC missed the 3206
collapse). Expectation: HOLDS (sparse/balanced/ground-truth), but MEASURE, do not assume.

Source worklist: [[reference_gnn_active_worklist_refresh_2026_06_24]]. Doctrine:
[[reference_codebase_wired_refpool_rejected_2026_06_18]] (measure-before-deploy; coverage is the
wrong target, emitted-band calibration is the constraint).
