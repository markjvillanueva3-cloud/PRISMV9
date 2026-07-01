# DOMAIN SCRUTINY — 2026-05-06

**Method:** 10-agent + direct grep/glob scrutiny pass across PRISM domains. Cross-references `WORKTREE-AUDIT-2026-05-06.md`. Read-only.

**Top-line counts (BASELINE_INVENTORY 2026-04-25 + live):**
- Engines: 3120 (was 2977 at baseline) · Dispatchers: 97 · Hooks: 395 active in `.claude/hooks/` (registry says 521)
- 9 hooks tagged `DISABLED_TOKEN_REDUX_2026_04_23`
- **1500 test files use `expect().toBeDefined()`** — test legitimacy gate violations at scale

---

## DOMAIN VERDICTS (10 domains scored 0-1.0)

| # | Domain | Score | Status | Critical action |
|---|---|---:|---|---|
| 1 | **Mill** | 0.78 | Production w/ stranded MS-AI-WIRING (17 units) | Land `prism-mill-worktree` U1-U17, dedup 7 AGI engines |
| 2 | **Lathe / mill-turn / Swiss** | 0.62 | Production claim contradicted (Multus not in main) | Land `prism-ppgh05` (798 commits), reconcile bookkeeping |
| 3 | **WEDM (wire EDM)** | 0.95 | Production-mature | Re-run `wedm_generate_digest.ts` (CLAUDE.md drift) |
| 3a | Sinker EDM | 0.65 | Functional, no per-vendor posts | Build Mitsubishi MV / Sodick AG / Makino EDNC sinker dialects |
| 3b | Laser cut / mark | 0.30 | Calculator-grade only | Trumpf TruLaser / Bystronic / Amada posts |
| 3c | Waterjet | 0.30 | Calculator-grade only | Flow / OMAX / KMT pump dialects |
| 3d | Plasma | 0.15 | Stub-grade | Hypertherm / ESAB + THC integration |
| 4 | **CAD systems (6-CAM bridges)** | 0.78 | 3 branches landable now | Land cam-ms1-93a0 (Mastercam 8/8) → cam-spcfai-ms0 (Inventor HSM SPC/FAI) |
| 5 | **Cross-process AI / Neural** | 0.92 | XPROC-NEURAL T1-T12 complete; T5 Bayesian in flight | Wait for T5 (BayesianMLP, ConformalPrediction, DeepEnsemble, CalibrationAuditor) commits |
| 6 | **Knowledge / Wiki / Memory** | 0.85 | INTEL-OLLAMA-OBSIDIAN-MS0 35/41 done | Close P8 (6 open units) — only open phase |
| 7 | **Infrastructure / Hooks / Dispatchers** | 0.70 | Test-legitimacy crisis | 1500 `toBeDefined()` violations — hard-gate audit needed |
| 8 | **Post processors / G-code** | 0.65 | Multus + Hurco + AdvancedPost stranded | Land `prism-ppgh05` (25+ U-PPGMU/U-PPGOH commits) + `prism-ppg-advancedpost` (15+ U-PPGW commits) |
| 9 | **Business / ERP / Quoting** | 0.70 | Costing + Quote bridge present, fragmented | Dedup ActualCostEngine / CostEstimationEngine / CostEstimatorEngine duplicates |
| 10 | **Safety / Omega / Quality** | 0.82 | Omega tier ladder externalized; collision/envelope wired | Merge `omega-loader-ms0` (1 commit) + `guard-wire-ms0` (1 commit), unify QualityDashboardEngine .js / .ts |

---

## 1. MILL (0.78)

**Production:** 95+ engines (`MillMaster*`, `MillingPhysicsKernel`, `HurcoV11Mill*Post`, `OkumaOSPMill*Post`, `KienzleForceModel`, `ChatterStabilityLobe`, `MicroMillingSizeEffect`, full `MillingLoRA*` stack).
**In-flight:** `prism-mill-worktree` carries entire MILL-MASTER-AI-WIRING U1-U17 branch (idle 12d, 20+ uncommitted). `prism-hypermill-ms1` (601 ahead) + `prism-ppg-advancedpost` (682 ahead) both touch mill posts.
**Anomalies:** 7 overlapping AGI engines (MillingAGI/AGIOrch/AIIntegration/AILearning/AIUltra/AIUnification/UltimateAI); orphan `ChatterStabilityLobeEngi-1` (no .ts); `mill_selfaware_stats` dispatcher gate misfires on read-only.
**Gaps:** No Mazak/Fanuc/DMG-Mori mill master post (Hurco + Okuma OSP only).

## 2. LATHE / MILL-TURN / SWISS (0.62)

**Production:** 186 `Lathe*`, 36 `Turning*`, 14 Okuma, 5 mill-turn, 8 Swiss engines on main. Hard-turn surface integrity properly composes WhiteLayerDetection + ResidualStressRequirement.
**Critical:** **`OkumaMultusB250IIMillTurnMasterPostEngine` is NOT in main HEAD** despite CLAUDE.md "98% production" claim. Lives in `prism-ppgh05` with 25+ U-PPGMU/U-PPGOH commits (Kienzle Fc, Taylor T, chip-load, arc-feed, BlockAnnotation, dispatcher wiring).
**Collision:** `prism-lathe-prod-ready` introduces `LatheCadCamBridgeEngine` and refactors 8 turning ops; `prism-lathe-pro-v3-bookkeeping` (791 ahead, mostly rebase backlog) touches same files.
**Gaps:** Zero G76 single-point threading dialect tests (Fanuc P / Okuma I-K / Mazak T). No Swiss bushing → channel-emit E2E. `OkumaB250LatheMasterPost` has 2 tests vs OSPMill's 7.

## 3. WEDM + EDM + Non-traditional (0.95 / 0.65 / 0.30 / 0.30 / 0.15)

**Wire EDM:** 145 engines (CLAUDE.md says 62 — drift), 256 test files, 269 dispatcher tokens, 5 controller dialects (Mitsubishi/Sodick/Makino/Agie/Fanuc) + dialect verifier. Full P2P + RL/LoRA/EWC/GNN/drift stack. Production-grade.
**Sinker:** 7 engines, 5 skills, single shared `PPSinkerEDMPostEngine` (no per-vendor dialects).
**Laser/Waterjet/Plasma:** Calculator-grade. Laser has 11 engines (cutting/marking/welding/ablation/hybrid) but zero controller dialects, zero E2E pipeline. Waterjet 6 engines, no pump dialects. Plasma only 2 calculator engines, no tests/skills.
**Anomaly:** Stray file `WEDMPrintToProgramEngine-1` (no extension). `MitsubishiMV1200RWireEDMMasterPostEngine` may duplicate `WEDMPostMitsubishiEngine`.

## 4. CAD SYSTEMS (0.78)

**Per-CAM scores:**
- Fusion 360 0.92 · Mastercam 0.90 · Inventor/HSM 0.85 · hyperMILL 0.82 · HyperCAD-S 0.78 · CATIA 0.65 · SolidWorks 0.62 · Esprit 0.58
**Landable now:** (1) `prism-cam-ms1-93a0` Mastercam 8/8 + Fusion 8/8 + Inventor 8/8 (16 commits, mergeable as-is); (2) `prism-cad-sw-fidx` HyperCAD-S + 5-CAD orchestrator + Esprit E2E (16 commits + XPROC-NEURAL Tier-1 ride-along); (3) `prism-cam-spcfai-ms0` Inventor HSM SPC/FAI + cycles + material.
**Critical:** `SolidWorksCodeGeneratorEngine` exists in BOTH current branch AND `prism-cad-complete` (1154 LOC delta) — hard duplicate, must reconcile before either branch lands.
**Anomaly:** Esprit was deferred per CONTINUE-CAD.md but `cad-fidx-solidworks` already shipped INT-01/INT-02/E2E-01.

## 5. CROSS-PROCESS AI / NEURAL (0.92)

**XPROC-NEURAL roadmap COMPLETE for T1-T4 + T6-T12.** T5 Bayesian Suite in flight RIGHT NOW (claude-d274f0cb just landed `T5-01 BayesianMLP`, `T5-02 ConformalPrediction`; `DeepEnsemble`, `CalibrationAuditor` in flight).
**On main:** 30 `CrossProcess*` engines including Tier 8 NeuroSymbolicSafetyVerifier, Tier 9 Causal Inference (Counterfactual + DoCalculus + MediationAnalyzer + CausalGraphLearner), Tier 11 Active Learning (Curiosity + Novelty), Tier 12 Master Orchestration.
**XPROC bridges:** 5/5 shipped (SF, Post, Feature, AI, Router) per CONTINUE-CAD commits c5cb8f940→57af5c4b5.
**Anomaly:** Recurring lint-staged stash leakage forced multiple FIX1/FIX2 commits across T2-02, T3-04, T4-01.

## 6. KNOWLEDGE / WIKI / MEMORY (0.85)

**INTEL-OLLAMA-OBSIDIAN-MS0 milestone:** 35/41 units complete across 17 phases. Only **P8 (6 units, 0/6 done)** remains open.
**Production engines:** KnowledgeIngest, ObsidianMemoryRag, VaultBacklink, WikiBootstrap, CSMMemoryDBAudit, CrossSessionMemoryBridge, PlanTrajectoryExtractor, MergeCandidateScorer, AgentMemoryFabric, CADKnowledgeGraph, KnowledgeDeduplication, KnowledgeGapAwareness, ConsensusObsidianPersistence — 30+ knowledge engines.
**Wiki:** 722-entry index per CLAUDE.md.
**Anomalies:** `prism-knowledge-wiki` (493 ahead, 20+ destructive deletions, INVESTIGATE per audit). `prism-iooms1` (612 ahead with self-declared "MS-CLOSE" — verify whether to merge or retire).

## 7. INFRASTRUCTURE / HOOKS / DISPATCHERS (0.70)

**Volume:** 395 active hooks in `.claude/hooks/`, 97 dispatchers, ~7136 actions.
**Critical:** **1500 test files contain `expect().toBeDefined()`** — test-legitimacy gate at `H:/prism/.claude/hooks/test-legitimacy.mjs` should reject these. Either the gate isn't running on existing tests OR the count includes legitimate uses (need policy clarification).
**Stop hooks:** 15+ active including scrutinize-before-stop (3-of-3 multi-CLI), stop_on_build_error, stop_on_broken_imports, stop_on_awareness_degraded, asset-deletion-block, dfm-block, duplication-hard-block, error-block-capture, git-sync-stop, managed-block-guard.
**In-flight:** `prism-tsc-cleanup` (590 ahead), `guard-wire-ms0` (1 ahead, MERGE-ready — 7 unwired guard engines), `omega-loader-ms0` (1 ahead, MERGE-ready), `data-loss-fix` (1 ahead, MERGE-ready — automated-deletion hard-block).
**Anomalies:** 9 hooks tagged `DISABLED_TOKEN_REDUX_2026_04_23`. Recurring scrutiny env-fail markers (Codex Windows shim noise + Gemini daily quota).

## 8. POST PROCESSORS / G-CODE (0.65)

**Master posts on main HEAD:** 4 only — HurcoV11Mill, OkumaB250Lathe, OkumaOSPMill, MitsubishiMV1200RWireEDM.
**Stranded in `prism-ppgh05` (798 ahead):** OkumaMultusB250IIMillTurnMasterPost (U-PPGMU01-10), OkumaOSPMill PPGOH01-05 series (structured setup_sheet, MillTool/MillMaterial API, stickout deflection, Kienzle feed clamp), HurcoV11 PPGH01-15.
**Stranded in `prism-ppg-advancedpost` (682 ahead):** AdvancedPostProcessor pipeline, RapidRepositionOpt pipeline, AutoSpeedFeed pipeline (all wiring → Hurco + Okuma), JM Die fleet profiles, Okuma 5-axis fixture-offset macro, OkumaMill tribal tips (14 tips), HyperMillProbingBridge / BladeRoughing / HeatTreatmentRouter test coverage.
**Gaps:** No Mazak Integrex / Heidenhain iTNC / Siemens 840D / Hass NGC mill posts. No Citizen / Star / Tsugami / DMG-Mori Swiss posts. Per-block force-comment verification (`verifyEmittedForceEstimates`) only on Multus.

## 9. BUSINESS / ERP / QUOTING (0.70)

**Production:** 30+ business engines (CostEstimation, ActualCost, CostAwareRouter, BlueprintToQuoteBridge, CapacityPlanning, CapacityMonteCarlo, AdditiveQuote, CastingQuote, CycleTimeEstimator, CustomerKnowledge, CustomerManagement, CustomerPortal, CustomerPortfolioMiner, CrossCustomerPolicyTransfer, EngineeringChangeOrder, E2ShopConnector, EDMCostDocumentation, ChaosDrillScheduler).
**Anomalies:** `ActualCostEngine.ts` AND `ActualCostEngine.ts-1` (duplicate). `CostEstimationEngine.ts` AND `CostEstimatorEngine.ts` (semantic dup).
**Skills:** Mature — quote, quote-job, quote-review, quote-to-ship, shop-quote, job-cost, cost-optimize, cost-optimize-lathe, estimate, machine-roi, roi-analysis, vendor, capacity-plan.

## 10. SAFETY / OMEGA / QUALITY (0.82)

**Omega tier ladder** externalized to `state/shared/omega-thresholds.json` (5-tier: shop_floor 0.95/0.98, production 0.90/0.95, proven_out 0.85/0.90, sim, dev). Shipped via `omega-loader-ms0` worktree (1 commit, MERGE-ready).
**Safety production:** 30+ engines including OmegaSafetyScore, MachineEnvelopeGuard, MachineForceLimitValidation, CollisionDetection (3 variants — possible dup), CollisionPrevention, ContinuousCollisionDetection, AGISafetyContainment, LatheAGISafetyContainment, BayesianSafety, BuildGuardChain, GitSafety, EmbeddingGuard, DuplicationGuard. Hooks: `Fusion360SafetyHooks`, `HyperMillSafetyHooks`, `MastercamSafetyHooks`.
**Quality production:** 30+ engines including CpkPredictionGate, MultivariateSPC, NelsonSPCRules, FirstArticleInspectionPipeline, CMMHistory/Import/PathPlanning, HyperMillFAIBridge, HyperMillSPCBridge, MastercamFAIBridge, MastercamSPCBridge, LathePrintToleranceStack, LatheQualityGate, QualityFormulas, QualityManagement, QualityPrediction, QualityScore.
**Anomalies:** `QualityDashboardEngine.js` AND `QualityDashboardEngine.ts` (duplicate file extensions). `QualityScoreEngine.js` AND `QualityScoreEngine.ts` (same).
**Anomaly:** `CollisionEngine`, `CollisionDetectionEngine`, `CollisionHazardDetectorEngine`, `CollisionIntegrationEngine`, `CollisionPreventionEngine`, `ContinuousCollisionDetectionEngine`, `MillKinematicsCollisionEngine`, `LatheCollisionZoneEngine` — 8 collision-class engines, dedup audit candidate.

---

## CROSS-DOMAIN HOTSPOTS (highest priority)

1. **Land prism-ppgh05 (798 commits)** — unblocks Multus production + OkumaOSPMill PPGOH series + HurcoV11 PPGH series. Single biggest stranded value pool.
2. **Land prism-ppg-advancedpost (682 commits)** — unblocks AdvancedPost pipeline → Hurco + Okuma, RapidReposition, AutoSpeedFeed, JM Die fleet profiles.
3. **Land prism-mill-worktree (63 ahead, 20+ uncommitted)** — MILL-MASTER-AI-WIRING U1-U17 (17 retrofit units, `mill_prism_reason` action, MXU telemetry).
4. **Test legitimacy crisis** — 1500 `toBeDefined()` files. Either run hard-gate audit or document policy.
5. **Reconcile SolidWorksCodeGeneratorEngine duplicate** between current branch and `prism-cad-complete` — hard merge conflict guaranteed.
6. **Land cam-ms1-93a0 (626 ahead)** — Mastercam/Fusion/Inventor 8/8 sealed-COMPLETE function-index.
7. **Dedup audit** — multiple .js/.ts pairs (QualityDashboard, QualityScore, ActualCost), 7-engine MillingAGI cluster, 8-engine Collision cluster.

---

**Audit timestamp:** 2026-05-06T17:00Z
**Auditor:** claude-e7271397 (10-domain pass via 4 sub-agents + 6 inline grep/glob/bash)
**Reference:** `state/shared/WORKTREE-AUDIT-2026-05-06.md` (45-worktree classification)
