---
name: reference_kilo_cam_wiring_campaign_2026_05_29
description: CAM-domain unwired-engine wiring campaign — audit of 36 true orphans, triage (WIRE/WIRE-EXEMPT/cross-domain/dedup-check), first wire shipped (CAMPrintToProgramOrchestrator)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.183Z
aliases: reference_kilo_cam_wiring_campaign_2026_05_29
---


slot:kilo wiring mandate (operator: "go through each node one by one, ensure all applicable nodes are wired in"). This is the multi-iteration campaign tracker.

## Audit method + numbers (2026-05-29)
Ground-truth audit (NOT BUILD_STATE, which says 0 CAM unwired because it counts TRANSITIVE reachability): for each CAM-domain engine file (`CAM*.ts` + `HyperMill*.ts` + `Creo*.ts` + `engines/hypermill/*.ts` = **182**), check if its class name appears in ANY dispatcher/registry/route/tool source. Then classify the no-direct-ref set by whether OTHER engines reference it (internal-layer) vs nothing (true orphan).
- **182** CAM-domain engine files · **130** referenced in dispatchers/registries · **52** no direct ref.
- Of the 52: **36 TRUE ORPHANS** (built + have a test file, but referenced NOWHERE in src) · **16 INTERNAL-LAYER** (consumed by other engines → transitively wired, legit, leave as-is).

**CRITICAL dedup caveat (R8):** several "orphan" engines may be SUPERSEDED by already-wired equivalents — `cam_safety_validate`, `surface_finish_predict` (prism_toolpath), `cycle_time_estimate` (prism_toolpath) ALREADY exist. Before wiring CAMSafetyValidator/CAMSurfaceFinishMapper/CAMCycleTimeEstimator, `grep` the existing action — if a wired equivalent exists, mark WIRE-EXEMPT (superseded), do NOT add a duplicate action.

## Shipped
- ✅ **U-CAM-WIRE-P2P** (commit `197ecf17`, 3-of-3 PASS): `CAMPrintToProgramOrchestratorEngine` → `prism_cam:cam_p2p_orchestrate` + `cam_p2p_explain` (engine declared these in getCapabilities() but was never wired). 7-test round-trip suite. Honest null-loader contract (stages 1-3 succeed, stage 4 click soft-fails without a catalog loader). Highest-leverage orphan (kilo's core pipeline).
- ✅ **U-CAM-WIRE-PHYS** (commit `7adf4af9`, 3-of-3 PASS): 6 physics/score engines → prism_cam (+6 actions): `cam_kienzle_force`/`cam_taylor_tool_life`/`cam_feedrate_chipload`/`cam_tool_deflection`/`cam_coolant_strategy`/`cam_omega_score`. 9-test suite reusing each engine's own fixtures (kc≈2691.5, rpm≈3183.1, I=πd⁴/64, E=580, laser→air_blast, Ω≈1.0). **Progress: 7 of ~17 WIRE-targets wired.**
  - **P2 follow-up (all 3 reviewers converged)** → micro-unit `U-CAM-WIRE-PHYS-HARDEN`: the 4 always-return engines (feedrate/deflection/coolant/omega) yield NaN on missing/non-numeric params (Math.max(MIN, undefined)=NaN), asymmetric with Kienzle/Taylor's null→error. NaN→null via JSON (no crash) but silently-wrong for a safety domain. Fix: `Number.isFinite` pre-guard on required numeric params + a descriptive error + 1 adversarial-input test per engine. Deferred (P2, non-blocking) — do before relying on these in a safety gate.

## Triage of the remaining 35 true orphans (next /loop iterations)
**WIRE → prism_cam (runtime CAM physics/planning — verify-not-dup first):**
- CAMKienzleForceEngine, CAMTaylorToolLifeEngine, CAMFeedrateChiploadEngine, CAMToolStickoutDeflectionEngine, CAMOmegaScoreEngine, CAMCoolantStrategyEngine — physics/score (import constants.ts; NEVER inline).
- CAMToolpathStrategyClassifierEngine, CAMISO286FitClassifierEngine, CAMTemplateParameterCompletenessEngine — classifiers.
- CAMOperationSequencePlannerEngine, CAMMultiSetupPlannerEngine, CAMWCSOriginSelectionEngine, CAMOperatorGateEngine — print-to-part pipeline stages (DOMAIN-PIPELINE-MS0).
- CAMPostProcessorBridgeEngine — CAM→post bridge (kilo's output edge; echo owns dialect).
- **DEDUP-CHECK before wiring:** CAMCycleTimeEstimatorEngine (vs toolpath:cycle_time_estimate), CAMSurfaceFinishMapperEngine (vs toolpath:surface_finish_predict), CAMSafetyValidatorEngine (vs cam_safety_validate — also it's internal-layer).

**WIRE → prism_cam hypermill family OR consumed by HyperMillAIOrchestration (investigate per-engine):**
- HyperMill{CAD,CAMCore,CAMAdvanced,Fixture,Linking,Settings,SimNC}ArtifactGeneratorEngine (7), HyperMillResourceIndexEngine, HyperMillSchemaUnifier.
- CreoAddinRibbonEngine, CreoToolkitBridgeEngine — Creo add-in (may be build-time add-in gen → WIRE-EXEMPT).

**WIRE-EXEMPT (build-time/training/test tooling — script-invoked, NOT runtime dispatcher; tag `// WIRE-EXEMPT: <reason>`):**
- CAMTrainingExtractionAggregatorEngine, CAMTrainingManifestEngine, CAMTribalTipExtractorEngine, CAMRAGIndexEntryEngine, CAMWikiEntryGeneratorEngine — knowledge/training pipeline build-time.
- CAMUtilityEngines, CreoIntegrationTestSuiteEngine — utility/test.

**CROSS-DOMAIN (NOT kilo — surface to delta/CAD via chat-bus, do not wire from kilo):**
- CADSequenceLearningEngine, FeatureSequenceReplicatorEngine, STEPFeatureExtractorEngine, HMCProjectParserEngine, PartSimilaritySearchEngine.

## Wiring pattern (proven this session)
1. Read engine API (singleton export + method signature).
2. `grep "<action>" camDispatcher.ts` to confirm NOT already wired (dedup).
3. Add action(s) to `ACTIONS` array (snake_case + comment) + a handler `case` (lazy `await import()`, param-normalize, `Parameters<typeof fn>[N]` cast, R12 missing-param error).
4. Write `camDispatcher.<engine>-wire.test.ts` (MockMCPServer + `call()` + **z.enum-membership guard** for the false-green class + CONCRETE value assertions — no `.toBeTruthy()`, the legitimacy gate rejects it).
5. `vitest run` the suite + `tsc --noEmit | grep <surfaces>` (repo has a tsc baseline — isolate new errors).
6. 3-of-3 scrutiny + commit `[kilo] [...]/U-CAM-WIRE-<X>`.

Pairs with [[reference_kilo_cam_galaxy_buildout_2026_05_28]] · [[reference_kilo_cam_dispatcher_surface_2026_05_28]] · [[reference_kilo_cam_awareness_surface_2026_05_28]]. The cam-galaxy-verify.mjs dispatcher check (>=20 cam_ actions) guards against a wiring regression dropping the count.
