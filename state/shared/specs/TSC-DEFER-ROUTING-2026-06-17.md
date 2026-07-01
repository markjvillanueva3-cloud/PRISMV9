# TSC Defer-Routing Punch-List — 2026-06-17 (slot:papa)

> **Purpose.** The all-domains tsc campaign drove the `mcp-server` workspace 638 → **91** errors
> (547 cleared, 86%). The remaining **91** are predominantly **domain-entangled** — fixing them
> correctly requires inventing a physics/material/feed/machine/wire/electrode/safety/unit value,
> completing an exhaustive physics `Record`, a multi-site API rename with caller updates, or
> reconciling a stale integration. **Papa will not fabricate domain values** (a wrong machine/unit
> value is a shop-floor hazard — `[[feedback_check_units_first]]`). This routes each error to the
> slot that owns the knowledge to fix it safely.
>
> **Authority:** `cd mcp-server && NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit --incremental false`
> (the 16GB heap is MANDATORY — without it tsc OOM-aborts and reports a FALSE 0). Baseline log:
> `state/shared/tsc-after-c1b.log` (91, regression-clean). (`tsc-after-c2.log` shows 108 — the
> transient ChatterStability un-masking, reverted; not a valid baseline.) Per-fix discipline: fix → gate → regression-diff → commit;
> a gate that shows NEW errors means an un-masking cascade (see ChatterStability below).
>
> **Cleared by papa this session** (U-TSC-DOMAIN-MISC1 `2d8b674ba0`): CADRegenerationTestEngine
> (318 casing alias + 341 positional GenerationConfig), QuotingMaterialBridgeEngine (113
> name→material_name). All papa-safe producer-type reconciliations, regression-clean.

## How to use this
1. Find your slot's section. Each row: `file:line` · TS-code · root cause · fix-hint · ⚠=fabrication/runtime risk.
2. Read the REAL producer type first (papa's recurring lesson: most "renames" are actually contract mismatches).
3. Fix → gate with the authority command above → confirm the regression-diff is empty (no un-masking) → commit `[SCOPE]/U-ID`.
4. ⚠ rows: the value/contract is yours to supply correctly — do NOT let another slot guess it.

---

## delta — CAD (≈24 errors, the largest cluster)

**CAD code-generator result-contract + capability-matrix.** Two intertwined root causes: (a) the
`*CodeGeneratorEngine.runScriptBody`/mock returns use an OLD result shape (`success/outputPath/
executionTime/logs`) but `CADExecutionResult` (interfaces/ICADCodeGenerator.ts:251) is `{ok, error?,
durationMs, metrics?}`; (b) the `cadSystem`/capability-matrix literal is missing required fields —
and ⚠ `nativeLengthUnit` MUST be verified per generator (a 25.4× unit-scale hazard), never guessed.

- `SolidWorksCodeGeneratorEngine.ts` (223 TS2741 cadSystem ⚠, 539 TS2881 redundant-nullish [papa-safe], 1127 TS2416 runScriptBody sig, 1133/1144/1153 TS2353 success→ok, 1142 TS2339 SolidWorksAutomationBridge.executeVBA missing) — result-contract + bridge API.
- `InventorCADCodeGeneratorEngine.ts` (139 TS2322 Set→ReadonlySet, 528 TS2416 requireArg sig, 730 TS2352 number[][] conversion, 2077 TS2353 warningCount in geometry-metrics).
- `MastercamCodeGeneratorEngine.ts` (163 TS2739 cadSystem ⚠, 501 TS2352 number[][] conversion).
- `Fusion360CodeGeneratorEngine.ts` (109 TS2739 cadSystem ⚠, 1704 TS2561 'output'→known CADExecutionResult field).
- `CadQueryCodeGeneratorEngine.ts` (326,379 TS2339 generateCadQueryCode missing on CADOperationTaxonomyEngine).
- `HyperCADSCodeGeneratorEngine.ts` (67 TS2739 cadSystem ⚠).
- `NXCodeGeneratorEngine.ts` (130 TS2353 maxOpsPerScript not in CADCapabilityMatrix — add the optional field to the matrix interface, the kilo-precedent for the +4 fields).
- `CADAdapterRegistry.ts` (97 TS2339) — siblings return `mod.<sys>CADGeneratorAdapter`; Mastercam exports only `mastercamCodeGeneratorEngine` (no adapter). Add the adapter export OR change the registry return — adapter-pattern decision.
- `CADFeatureClassifierEngine.ts` (99 TS2739 archetype object missing required fields ⚠ — complexity/risk values).
- `CADPartArchetypeRegistryEngine.ts` (37 TS2554 expected 2-3 args got 1 — verify the missing args are not domain values).
- `FusionAIOrchestrationEngine.ts` (258 TS2339 getPhysicsProfile missing on FusionMaterialBridgeEngine [build a method], 279 FusionFeatureType / 281 FusionMachineType enum-narrow).

## kilo — CAM (≈6)

- `SolidCAMAIOrchestrationEngine.ts` (260 TS2339 selectStrategy missing on SolidCAMStrategyEngine, 296 calculateOptimalLevel missing) — method does not exist; build or rename.
- `PowerMillAIOrchestrationEngine.ts` (233 TS2339 selectStrategy missing).
- `NXCAMAIOrchestrationEngine.ts` (223 TS2339 selectStrategy missing).
- `IntelligentSequencingAdapter.ts` (50 TS2724) ⚠ — imports `SequenceResult` (real export `SequencingResult`), BUT the adapter builds a DIFFERENT result shape (`rationale`, `tool_changes_saved`) than `SequencingResult` (`tool_change_savings_pct`, `warnings`). Define the adapter's own result interface OR map the engine result — a CAM adapter-contract decision (papa reverted its alias touch to baseline to avoid masking this).
- `ProcessIntelligenceRouterEngine.ts` (40,44,45,301,322,343 TS2307) — missing modules `CrossProcessSpeedFeedBridge` / `CrossProcessPostBridge` / `CrossProcessFeatureBridge`. These are unbuilt cross-process bridge FEATURES, not type errors (deep-integration bridge units — see ROADMAP-CONSOLIDATED bridge layer).

## mike — Wire-EDM / electrode (≈12) — ⚠ all physics/safety values

- `ElectrodeAIReasoningEngine.ts` (539,540,541,542 TS2339 sinker_spark_gap / sinker_duty_cycle missing on the EDM physics const) ⚠ — the const needs these keys with REAL EDM values.
- `TrilobeElectrodeGeometryEngine.ts` (525,527,528 TS2339 sinker_spark_gap) ⚠ — same physics const.
- `WireEDMNeuralOrchestrationEngine.ts` (793 TS2322 "brass"→WireType, 794 string→WireDiameter) ⚠ — union membership / real wire spec.
- `WireEDMMachineTechDataEngine.ts` (377,396 TS2741 'method' missing) — `TechLookupResult.method` is required but the not-found branch omits it; needs a discriminated union on `found` (papa-noted in prior campaign).
- `WEDMSafetyEnvelopeEngine.ts` (62 TS2740 missing axis-travel fields) ⚠⚠ — X/Y/Z travel SAFETY limits; safety-critical, never guess.

## oscar — Speed-Feed / chatter (≈8) — mostly ⚠

- `ChatterStabilityLobeEngine.ts` (341,778 TS2351 `new StabilityLobeDiagram()` on a singleton) ⚠ **LATENT RUNTIME BUG** — the `new` throws → degraded SDOF fallback (`[[reference_chatter_engine_regression_2026_05_24]]` documents foxtrot's compute()-path fix; these two `_computeWithStabilityLobeDiagram` paths were missed). NOT a 1-line fix: removing `new` un-masks 19 errors (the invalid `new` types `sldAlg` as `any`, masking a real Algorithm-API mismatch at 343-377 / 816-847). Reconcile the sldInput/method/result usage to the real `Algorithm<StabilityLobeInput,StabilityLobeOutput>` API. Papa reverted to baseline (the 2 TS2351 mask the 19).
- `SpecificCuttingEnergyEngine.ts` (151 Fc, 151 Vc, 152 mrrInput — TS18048 possibly-undefined) — guard-only fix (early-return/throw, NO fabricated default); papa-safe-ADJACENT but lives in a physics engine — oscar/safety to confirm the guard semantics.
- `SpeedFeedExhaustiveCombinationEngine.ts` (329 ToolHolderType, 331 strategy union — TS2322) — literal not in target union; widen the union or map the value.
- `SpeedFeedNineAxisOrchestratorEngine.ts` (1417 TS2741 part_volume_cm3 missing) ⚠ — a volume VALUE; derive from real geometry, don't fabricate.
- `PPValidatorAGIWiringEngine.ts` (438 TS2339 kc1_1 on Record<ISOGroup,...>) ⚠ — physics-const key access.

## whiskey — Lathe (≈6)

- `LatheMasterOrchestratorFacadeEngine.ts` (477 expected 9 got 5, 487 expected 1 got 4, 490 string→number — TS2554/TS2345) — arg-arity to the orchestrated lathe engines; verify each missing arg is not a domain value.
- `LatheQualityGateEngine.ts` (712 TS2353 'type' not in OperationInput) ⚠ — the omega `evaluate` expects milling `OperationInput{ap_mm,fz_mm,vc_mpm,...}` but the caller passes turning `{type,feed_mm_rev,depth_of_cut_mm,diameter_mm}` for S(x) safety — a turning-vs-milling safety-physics mismatch; safety-critical.
- `TurningStochasticPlanEngine.ts` (92 insertChangeSchedule, 97 wearAccumulation — TS2339 missing on TurningInsertLifeEngine) — methods don't exist; build or rename to the real TurningInsertLifeEngine API.

## india — AI-training / RL (≈3)

- `ReinforcementLearningCAMFeedbackEngine.ts` (302,373 TS2554 expected 5 got 4) ⚠ — the missing 5th arg is a turning-physics outcome object.
- `OfflineRLOrchestratorEngine.ts` (69 TS2322 domain union "mill"|"lathe"|... → "quality"|"post_processor"|...) — reconcile the RL domain enum.

## echo — Post-processor (≈3)

- `PostProcessorPhysicsAwareGeneratorEngine.ts` (571 TS7053) ⚠ — `state.coolantType` includes `"cryogenic"` but per-controller `coolantCodes` has no cryogenic M-code; add the real M-code per controller (machine data) OR map cryogenic.
- `PostEmitSafetyGateEngine.ts` (127 TS2352 GateOp→Record) — safety-gate cast; verify the conversion is sound at the boundary.
- `PPGDialectRankerEngine.ts` (231 TS2353 controller_family→controller) — param-field rename on PPGRAGDialectMatchEngine.match; verify the full param contract (top_k vs top_k_programs too).

## charlie — Quoting (≈1)

- `QuotingClosedLoopRunnerEngine.ts` (286 TS2739 result type missing fields) — supply the real result fields or fix the type.

## lima — Academy (≈2)

- `LectureNoteExtractionEngine.ts` (142 TS2654 missing BaseEngine getCapabilities/etc., 150 TS2554 expected 1 got 0) — implement the BaseEngine contract members + fix the super/constructor call.

## papa — infra (own backlog; multi-site or stale-integration, ≈8)

- `HookDAGValidatorEngine.ts` (139 TS2416) — the public `validate(opts): HookDAGValidation` collides with BaseEngine's abstract `validate(input:unknown): string|null` (return covariance violation). Rename the domain method (e.g. `validateManifest`) + add a real BaseEngine `validate` impl + update all callers/dispatcher. Multi-site — own unit.
- `hooks/index.ts` (102 TS2308) — duplicate `preMachineControllerCompatibility` (two DIFFERENT HookDefinitions in CrossReferenceHooks + MachineValidationHooks). Rename one + update its array/consumers, or explicit disambiguating re-export. Real symbol collision.
- `ReasoningChainSharingEngine.ts` (662 TS2345) — `subscribeToEvents` calls a 3-arg `eventBus.subscribe(ns,event,handler)` but EventBus is 2-arg `subscribe(eventType, handler)` with an `{evt}` payload (handler reads `data.chain_id` from a payload shape that no longer exists). Stale integration — re-map to the real EventBus API + correct event name (risk: silent no-fire if the event name is wrong).
- `RoadmapIntelligenceEngine.ts` (381 TS2322 node shape) — infra graph node literal mismatch.
- `JMDieProgramAnalyzerEngine.ts` (435 TS2339 max_rpm on `never`) — a spindle-type narrowing collapses to never; fix the type guard / declaration.
- `AutomatedResourceHarvestingPipeline.ts` (482 TS2339 callDocumentAction) — documentLearningDispatcher exports only `registerDocumentLearningDispatcher` (no direct-call API); the consumer expects a call API that doesn't exist.
- `mcp/authHttp.ts` (18,19,20 TS2339 authorizationUrl/tokenUrl/scopes on OAuthConfig) ⚠ — OAuth config shape; security-sensitive, align to the real OAuthConfig.
- `routes/python-api.ts` (261 TS2339 search on TribalKnowledgeAdvisorEngine) — the route expects free-text `search(str)`; the engine offers only structured `query(TribalQueryContext)→{tips,...}`. Build a text-search method (tribal) OR re-map the route to structured query (quebec/tribal) — faking a phantom `search` would make the endpoint a silent no-op.

## general — `AdaptiveSystemIntegrationEngine.ts` (274 expected 8 got 5, 281 expected 9 got 5 — TS2554)

Arg-arity to an integrated subsystem; verify the missing args are not domain values before supplying (owner depends on the called subsystem — read first).

---

## Papa lesson (for the campaign-state doc + future passes)
The long tail of a tsc campaign is NOT more of the same easy renames. Past ~90 errors, almost every
remaining one is one of: **(1)** a physics/safety/machine VALUE behind a "missing property" (fabrication
trap), **(2)** an enum member whose addition cascades into exhaustive `Record<Enum,physicsValue>` maps
(the `OperationType "probe"` trap — adding it demands probe Vc/Fz/DOC baselines), **(3)** an `any`-escape
(invalid `new`/cast) masking a real API mismatch (the ChatterStability trap — the "fix" un-masks N>1),
**(4)** a stale integration written against an old API, or **(5)** a multi-site rename with caller breakage.
Gate EVERY change and read the regression-diff — a green count drop that hides new un-masking is a lie.
