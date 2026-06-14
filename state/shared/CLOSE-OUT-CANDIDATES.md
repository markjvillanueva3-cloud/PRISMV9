# CLOSE-OUT-CANDIDATES — units that look shipped but envelope says pending

> Generated: 2026-05-26T23:44:49.711Z
> Source: `scripts/audit-close-out-candidates.mjs`
> Filter: min-confidence ≥ 0.75

**Rule:** Advisory only — file presence ≠ spec correctness. Every candidate MUST be human-verified before flipping the envelope. False close-outs corrupt MILESTONE_PROGRESS and BUILD_STATE.

## Summary

- Milestones scanned: 748
- Parse errors (skipped): 1
- Milestones with candidates: 0
- Total candidate units: 0

_No close-out candidates above the confidence floor._
---

## Silent Close-Out Debt (1 milestones · 1 hidden-shipped units)

> **Different drift class:** envelope.status=`complete` + envelope.units[].status=`complete` for all units, BUT `MILESTONE_PROGRESS.shipped=0` (or below envelope's completed count). Likely cause: pre-2026-05-12 ship commits used non-tagged subjects, so `build-milestone-progress.mjs` can't match them.

> Same advisory rule applies — file presence ≠ spec correctness. Spot-verify before reconciling `MILESTONE_PROGRESS`. Reconciliation path: `node scripts/build-milestone-progress.mjs` (re-derive from git) or operator-flip via `node scripts/close-out-milestone.mjs --milestone <ID>`.

| Milestone | Envelope | env_complete/total | progress_shipped | Hidden | Confidence |
|-----------|----------|--------------------|-----------------:|-------:|------------|
| NN-STACK-INTEG-MS0 | complete | 3/3 | 2 | **+1** | envelope-fully-complete |

---

## Partial-Milestone Drift (45 candidates · 495 open milestones scanned)

> **Third drift class:** `envelope.status=in_progress` + `unit.status=pending` + `unit.title` names an `XxxEngine` + `src/engines/<XxxEngine>.ts` exists (≥1024B). Neither the candidate-resolver (needs declared path strings) nor silent-close-out-drift (needs envelope-complete) catches this. Discovered 2026-05-23 closing WEDM-NEXT-MS0/U-WN06+U-WN08.

> Same advisory rule applies — engine-on-disk ≠ engine-satisfies-spec (false positives: AI-TRAINING-FIRST units where engine exists but training isn't done). Verify each candidate against `deliverables` + `acceptance` + `exit_criteria` before flipping.

| Milestone | Unit | Engine | Size | Title |
|-----------|------|--------|-----:|-------|
| AI-STACK-PER-DOMAIN-MS0 | AS-charlie-L7 | WEDMProgramSafetyGateEngine | 16005 B | charlie L7 — WEDMProgramSafetyGateEngine.evaluateWithCoV (queued U-COV-WEDM, cha |
| AI-STACK-PER-DOMAIN-MS0 | AS-echo-L7 | CAMTribalRAGEngine | 13432 B | echo L7 — CAMTribalRAGEngine + CoV strategy verifier |
| AI-STACK-PER-DOMAIN-MS0 | AS-foxtrot-L6 | MillLoRATribalAugmentationEngine | 23270 B | foxtrot L6 — mill LoRA (already ships MillLoRATribalAugmentationEngine — extend) |
| AI-STACK-PER-DOMAIN-MS0 | AS-foxtrot-L7 | ChatterStabilityLobeEngine | 36327 B | foxtrot L7 — ChatterStabilityLobeEngine.predictWithCoV (queued U-COV-MILL) |
| AI-STACK-PER-DOMAIN-MS0 | AS-hotel-L7 | OmegaSafetyScoreEngine | 8667 B | hotel L7 — OmegaSafetyScoreEngine.computeWithCoV (queued U-COV-OMEGA) |
| AI-STACK-PER-DOMAIN-MS0 | AS-whiskey-L6 | LatheLoRATribalAugmentationEngine | 15116 B | whiskey L6 — lathe LoRA (LatheLoRATribalAugmentationEngine — extend) |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-ACADEMY-CROSS-DISCIPLINARY-DEEP-LEARNING | CrossDisciplinaryDeepLearningEngine | 73808 B | Train CrossDisciplinaryDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-ACADEMY-MIT-COURSE-DEEP-LEARNING | MITCourseDeepLearningEngine | 45161 B | Train MITCourseDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-O |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-CAM-CAM-DEEP-LEARNING | CAMDeepLearningEngine | 48430 B | Train CAMDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW + v |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-CAM-CAM-DEEP-LEARNING-ORCHESTRATOR | CAMDeepLearningOrchestratorEngine | 20230 B | Train CAMDeepLearningOrchestratorEngine on full pre-revenue corpus (JM-DIE 76K + |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-CAM-FUSION-DEEP-LEARNING | FusionDeepLearningEngine | 38617 B | Train FusionDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW  |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-CAM-HYPER-MILL-DEEP-LEARNING | HyperMillDeepLearningEngine | 113754 B | Train HyperMillDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-O |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-CAM-MASTERCAM-DEEP-LEARNING | MastercamDeepLearningEngine | 20256 B | Train MastercamDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-O |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-DATABASE-TOOL-DATABASE-DEEP-LEARNING | ToolDatabaseDeepLearningEngine | 54140 B | Train ToolDatabaseDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MI |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-LATHE-LATHE-DEEP-LEARNING | LatheDeepLearningEngine | 34030 B | Train LatheDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW + |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-LATHE-LATHE-DEEP-LEARNING-INTELLIGENCE | LatheDeepLearningIntelligenceEngine | 45420 B | Train LatheDeepLearningIntelligenceEngine on full pre-revenue corpus (JM-DIE 76K |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-LATHE-LATHE-KINEMATICS-DEEP-LEARNING | LatheKinematicsDeepLearningEngine | 40819 B | Train LatheKinematicsDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-LATHE-LATHE-META-LEARNING | LatheMetaLearningEngine | 93046 B | Train LatheMetaLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW + |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-LATHE-LATHE-SPEED-FEED-DEEP-LEARNING-ADVISOR | LatheSpeedFeedDeepLearningAdvisorEngine | 23305 B | Train LatheSpeedFeedDeepLearningAdvisorEngine on full pre-revenue corpus (JM-DIE |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MILL-FIVE-AXIS-AI-ULTRA-INTELLIGENCE | FiveAxisAIUltraIntelligenceEngine | 68525 B | Train FiveAxisAIUltraIntelligenceEngine on full pre-revenue corpus (JM-DIE 76K + |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MILL-FIVE-AXIS-DEEP-LEARNING | FiveAxisDeepLearningEngine | 92845 B | Train FiveAxisDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OC |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MILL-MILL-DEEP-LEARNING | MillDeepLearningEngine | 38817 B | Train MillDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW +  |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MILL-MILLING-AI-ULTRA-INTELLIGENCE | MillingAIUltraIntelligenceEngine | 98560 B | Train MillingAIUltraIntelligenceEngine on full pre-revenue corpus (JM-DIE 76K +  |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MILL-MILLING-META-LEARNING | MillingMetaLearningEngine | 27249 B | Train MillingMetaLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-OCW |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MILL-VIRTUAL-MACHINING-DEEP-LEARNING | VirtualMachiningDeepLearningEngine | 60490 B | Train VirtualMachiningDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K  |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-MISC-META-LEARNING-OPTIMIZER | MetaLearningOptimizerEngine | 4515 B | Train MetaLearningOptimizerEngine on full pre-revenue corpus (JM-DIE 76K + MIT-O |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING | CNCControllerDeepLearningEngine | 27820 B | Train CNCControllerDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + M |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-POST-POST-PROCESSOR-DEEP-LEARNING | PostProcessorDeepLearningEngine | 37239 B | Train PostProcessorDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + M |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-POST-POST-PROCESSOR-META-LEARNING | PostProcessorMetaLearningEngine | 33906 B | Train PostProcessorMetaLearningEngine on full pre-revenue corpus (JM-DIE 76K + M |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-SPEEDFEED-SPEED-FEED-DEEP-LEARNING | SpeedFeedDeepLearningEngine | 42357 B | Train SpeedFeedDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-O |
| AI-TRAINING-FIRST-MS0 | U-AITRAIN-WIRE-ELECTRODE-DEEP-LEARNING | ElectrodeDeepLearningEngine | 34625 B | Train ElectrodeDeepLearningEngine on full pre-revenue corpus (JM-DIE 76K + MIT-O |
| JM-DIE-FINANCIAL-BASELINE-MS0 | U-JM01 | JMDieDocustrataIngestEngine | 6862 B | JMDieDocustrataIngestEngine — walks _PART LIBRARY/<customer>/<part>/<docs>, extr |
| JM-DIE-FINANCIAL-BASELINE-MS0 | U-JM02 | HistoricalMaterialPriceEngine | 6536 B | HistoricalMaterialPriceEngine — date → commodity price lookup (CSV-seeded LME st |
| JM-DIE-FINANCIAL-BASELINE-MS0 | U-JM03 | JMDieFinancialBaselineEngine | 6244 B | JMDieFinancialBaselineEngine — per-customer revenue + per-material spend + per-p |
| JM-DIE-FINANCIAL-BASELINE-MS0 | U-JM04 | JMDieQuoteTrainingPipelineEngine | 5995 B | JMDieQuoteTrainingPipelineEngine — orchestrates U-JM01 + U-JM02 + QuoteOutcomeFe |
| K2-CLOUD-MS0 | U-K2-TIER-REGISTER | AISystemRouterEngine | 11812 B | K2 — Register kimi-k2.6:cloud tier in AISystemRouterEngine (AIBackend union, KIM |
| KNOWLEDGE-WIKI-MS0 | U-WIKI02 | WikiIndexMaintainerEngine | 12901 B | WikiIndexMaintainerEngine + WikiLogAppenderEngine |
| KNOWLEDGE-WIKI-MS0 | U-WIKI03 | WikiLintEngine | 16969 B | WikiLintEngine — Safety-Aware Health Check |
| KNOWLEDGE-WIKI-MS0 | U-WIKI04 | WikiIngestRouterEngine | 16521 B | WikiIngestRouterEngine — Staged Ollama→Claude Pipeline |
| MS-P1.5-ONESHOT | U-P1.5-OS-05 | WEDMWirePathCollisionEngine | 14880 B | WEDMWirePathCollisionEngine — wire path swept-volume collision |
| PROGRAM-PROOF-MS0 | U-PP01-FLEET-ENVELOPE-CATALOG | JMDieMachineEnvelopeCatalogEngine | 8690 B | JMDieMachineEnvelopeCatalogEngine — ingest all 21 JM Die machines into a unified |
| PROGRAM-PROOF-MS0 | U-PP02-INTERVAL-ARITHMETIC | IntervalArithmeticPredicateEngine | 4443 B | IntervalArithmeticPredicateEngine — wrap collision/distance predicates so FP rou |
| PROGRAM-PROOF-MS0 | U-PP03-CERT-ORCHESTRATOR | ProgramProofCertificateEngine | 6554 B | ProgramProofCertificateEngine — orchestrator that produces signed 'this program  |
| PSN-INCORPORATION-MS0 | U-PSN-R2-MFG-01 | WEDMThermalFieldEngine | 28570 B | NVIDIA Modulus PINN for WEDMThermalFieldEngine |
| SVI-ENHANCE-MS0 | U-SVI-E01-MULTI-COMPONENT-CALCULATOR | SVIEnhancedCalculatorEngine | 22865 B | SVIEnhancedCalculatorEngine — 9-component Ψ from LIVE sources (replaces hardcode |
