---
name: reference_dormant_engine_triage_2026_06_10
description: "Grounded triage (sierra 2026-06-10) of the 66 TRULY-dormant engines (0 consumers anywhere) surfaced by the corrected unwired audit (a6dbec1842, WIRED-VIA-ENGINE). NOT 66 wire-candidates: 2 stubs + ~11 with a dispatcher home (each still needs per-engine capability judgment -- some are test-harnesses/runners) + 53 UNKNOWN-dispatcher that are overwhelmingly external-tool integration bridges / ops-infra / SUPERSEDED. Do NOT cargo-cult-wire all 66 to reduce a count -- activation needs per-engine 'is this a real user-facing capability?' judgment + the superseded ones should be left/deprecated."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.556Z
aliases: reference_dormant_engine_triage_2026_06_10
---


# Dormant-engine triage -- the 66 are NOT 66 wire-candidates (2026-06-10, slot:sierra)

Clause-4 "look for dormant nodes to activate". After the unwired-audit fix (a6dbec1842, WIRED-VIA-ENGINE) corrected the count to **66 truly-dormant** (0 consumers of ANY kind, not just dispatcher), I triaged them so activation is grounded, not a cargo-cult count-reduction (R13: comprehensive CORRECTNESS, not churn). Source: `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` `unwiredEngines`.

## Breakdown (by stub-size / suggested-dispatcher / judgment)
- **2 STUBS** (<=2KB): `WEDMLoRADatasetBuilderEngine` (0KB), `MillPrintToProgramEngine` (1KB) -- investigate or leave; a stub is not an activation candidate (wiring a placeholder is worse than leaving it).
- **~11 with a SUGGESTED DISPATCHER** (the actionable-for-wiring subset, but EACH needs per-engine "is this a user-facing capability vs a test-harness/runner/internal?" judgment before wiring):
  - `PlaywrightAutomationEngine`->prism_automation, `SyncCodeVerificationEngine`->prism_dev, `cycleSchedulingBridge`->prism_scheduling, `MastercamHeadlessIntegrationTestEngine`->prism_cam (LIKELY a test harness, NOT a dispatcher action), `reactiveChainBootstrap`->prism_ai, `XProcNeuralAutoFireEngine`->prism_ai, `BayesianAcquisitionRefiner`->prism_ai, `DocuStrataMaterialPriorEngine`->prism_data, `QuotingClosedLoopRunnerEngine`->prism_adaptive_control (charlie/quoting domain), `JMCustomerVendorDatabaseEngine`->prism_business, `HyperCADSElectrodeEngine`->prism_cad.
  - "has a suggested dispatcher" is the suggestDispatcher() HEURISTIC, NOT proof the engine should be a dispatcher action. Verify-first per engine: read it, confirm it is a real capability (not a *Test*/*Runner*/*Bootstrap*/internal), then wire+test+scrutiny.
- **53 UNKNOWN-dispatcher** -- overwhelmingly NOT wire-to-dispatcher candidates:
  - **External-tool integration bridges** (consumed via their own integration path, not a prism_ dispatcher): Creo (Toolkit/Addin/IntegrationTestSuite), CATIA (CAAV5/AddinPlugin), Onshape (API/LiveCollab), Rhino (RhinoCommon), NXOpen, HyperMillAC, HyperCADS.
  - **Ops/reliability infra** (cron/runbook-driven, not user actions): DisasterRecovery, BackupRestoreDrill, ChaosDrillScheduler, SBOMReview, PactContractTest, LokiLogSink, TenantOnboardingRunbook, TriLevelKillSwitch, WetRun{StateMachine,ChangeFreeze,RetentionPolicy}.
  - **SUPERSEDED by a live path** (do NOT wire -- would duplicate): `LocalEmbeddingEngine`/`EmbeddingGuardEngine` (vs live nomic-embed/ONNX), `SemanticAssetIndexEngine` (vs master-index), `DeepSeekClientEngine`/`GrokCLIClientEngine` (vs the live ollama/Claude routing), `BlueprintOCRAdapter` (vs the live blueprint-vision OCR).
  - The rest (MIT course, Counterfactual, TransferLearning, Attractor, Entropy, Metacognition, TPE/MOEA optimizers, Swiss/Turret/BarRemnant lathe bits) need domain-owner judgment.

## Activation rule (for the next session)
Activation candidates = the ~11 dispatcher-homed engines, MINUS the test-harnesses/runners/bootstraps, MINUS any superseded. Realistically a handful are genuine "wire this real capability" wins; the rest are correctly-dormant infra/bridges/superseded that should be LEFT (or deprecated via never-delete-only-disable), NOT force-wired. Per-engine: read -> confirm real capability -> wire to the natural dispatcher (R15 wire-to-all-consumers) -> real test through the dispatcher -> scrutiny. This is a fresh-budget unit (per-engine judgment x ~11).

## Route through the EXISTING activation framework -- do NOT start a parallel effort
There is already a dormant-engine activation roadmap: **DEA-MS0** ([[reference_dormant_engine_roadmap_2026_05_22]], slot **november**, ~120 units split across slots; CHAT-SLOT-DOMAINS lists `NOVEMBER -- U-DEA`). This triage REFINES DEA-MS0's scope with the POST-correction honest count: DEA-MS0 predates the WIRED-VIA-ENGINE audit fix (a6dbec1842), so its "dormant" set likely included the 23 library-consumed engines now correctly reclassified WIRED-VIA-ENGINE. The next activation pass should (1) re-base DEA-MS0's target list onto these 66 (truly 0-consumer) + drop the 23 library-layer, (2) apply the wire-candidate filter above (~11 minus test-harnesses/superseded), (3) stay in november's U-DEA lane. Feed this triage to november, do not fork a new activation roadmap.

Related: [[reference_audit_wired_via_engine_2026_06_10]] (the audit fix that produced the honest 66) · [[reference_dormant_engine_roadmap_2026_05_22]] (DEA-MS0, november's lane) · [[feedback_never_claim_absence_without_deep_search]] · [[feedback_build_comprehensive_route]].
