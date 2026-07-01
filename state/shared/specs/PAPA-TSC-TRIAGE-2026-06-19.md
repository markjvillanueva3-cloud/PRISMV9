# PAPA TSC Triage — mcp-server build-quality (slot:papa, 2026-06-19)

> Verify count ONLY with a 16GB heap (default heap CRASHES exit 134, misreported as 0 errors --
> [[reference_tsc_default_heap_crash_false_green_2026_06_19]]):
> `cd mcp-server && NODE_OPTIONS=--max-old-space-size=16384 npx tsc -p tsconfig.json --noEmit --incremental false; echo exit=$?`
> exit 2 = real errors (trust count) · exit 134 = crash (count is a lie) · exit 0 = clean.

**Session progress:** cold **54 -> 45** (-9). Committed: `U-TSC-LITERAL-CONTRACT-49` (SpeedFeedExhaustive
holder/strategy literals + WireEDM method-optional + PostProc cryo-coolant), `U-TSC-CONTRACT-45` (Mastercam
unknown-cast + UnifiedProgramParser probe-enum/ParsedOperation-fields/g_code).

The remaining **45** split into 3 buckets. Bucket A is the important architectural finding; B needs
physics-review values; C is mechanical per-site work.

## A. DEEP -- orchestration calling NEVER-IMPLEMENTED methods (DARK engines; ~13 errors)
These are NOT type noise -- the call sites invoke methods/exports that do not exist, so the engines throw
or no-op at runtime (stub-wired/dark). Fix = implement the real method on the target engine OR rewire the
call to the existing API. **Do NOT stub to silence tsc (R12).**
- `NXCAMAIOrchestrationEngine.ts(223)` `selectStrategy` -- NXCAMStrategyEngine only has `recommend(NXRecommendInput): NXStrategyRecommendation[]` (input+output shapes differ; adapter needed).
- `PowerMillAIOrchestrationEngine.ts(233)` `selectStrategy` on PowerMillStrategyEngine.
- `SolidCAMAIOrchestrationEngine.ts(260)` `selectStrategy`; `(296)` `calculateOptimalLevel`.
- `TurningStochasticPlanEngine.ts(92,97)` `insertChangeSchedule`, `wearAccumulation` -- TurningInsertLifeEngine only has `predictLife`/`selectGrade`/`validateChipbreaker`.
- `CadQueryCodeGeneratorEngine.ts(326,379)` `generateCadQueryCode` on CADOperationTaxonomyEngine.
- `FusionAIOrchestrationEngine.ts(258)` `getPhysicsProfile` on FusionMaterialBridgeEngine.
- `CADAdapterRegistry.ts(97)` `mastercamCADGeneratorAdapter` export missing on the Mastercam module.

## B. PHYSICS/SAFETY VALUES -- missing constants/fields (need physics-reviewer; ~9 errors)
- `TrilobeElectrodeGeometryEngine.ts(525,527,528)` + `ElectrodeAIReasoningEngine.ts(539,540,541,542)` --
  reference `EDM_PHYSICS.sinker_spark_gap.{finish,semi,rough}_mm.graphite` and `sinker_duty_cycle`, which do
  NOT exist in `src/physics/constants.ts`. ONE constants addition (sinker spark-gap by finish level +
  electrode material, sinker duty cycle, with cited sources) fixes all 6. physics-review required.
- `FiveAxisDeepLearningEngine.ts(313,397,481)` -- 3 inline MaterialProps literals missing `density_kg_m3` +
  `specific_heat_j_kgk` (iso H, iso N). Prefer sourcing from the material registry over inlining.
- `WEDMSafetyEnvelopeEngine.ts(62)` -- envelope limits `Record<keyof EnvelopeReading, EnvelopeLimit>` missing
  `U_mm, X_mm, Y_mm, Z_upper_mm` + 2 (axis travel/soft-band limits). Safety envelope -- real machine limits + review.

## C. CASCADE-CONTRACT -- call-site literals vs current type (mechanical per-site rewrites; ~23 errors)
Each is a literal/arg/field written against an older shape. Verify downstream usage before rewriting.
- `PPGDialectRankerEngine.ts(231)` match() call: `controller_family`->`controller`, `operation_types:[x]`->`operation:x`, `top_k`->`top_k_programs`, drop `include_tips`.
- `WireEDMNeuralOrchestrationEngine.ts(793,794)` `"brass"`/string vs HybridStrategy `WireType`/`WireDiameter` literals.
- `OfflineRLOrchestratorEngine.ts(69)` domain enum `general`/`sinker` vs ledger canonical (`sinker_edm`, no `general`) -- map before query.
- `LatheQualityGateEngine.ts(712)` `type` field not in omegaSafety `OperationInput` (rename to its op field).
- `SpeedFeedNineAxisOrchestratorEngine.ts(1417)` missing required `part_volume_cm3`.
- `CADFeatureClassifierEngine.ts(99)` Record<FeatureType> missing 4 keys (thread_internal, pocket_complex, slot_dovetail, slot_t_shaped) -- add 4 FeatureProfile entries.
- `ShopMachineOverlayEngine.ts(396)` canonical_package literal is a DIFFERENT shape than `CanonicalMachinePackage` (canonical_id vs id, type vs machine_type, missing footprint_mm/weight_kg/axes_count) -- the field type is likely wrong; investigate before editing (renaming `type` cascades ~10 errors).
- `AdaptiveSystemIntegrationEngine.ts(274,281)` calls missing args (expected 8/9, got 5).
- `LatheMasterOrchestratorFacadeEngine.ts(477,487,490)` arg count/type mismatches.
- `ReinforcementLearningCAMFeedbackEngine.ts(302,373)` expected 5 args, got 4.
- `CADPartArchetypeRegistryEngine.ts(37)` expected 2-3 args, got 1.
- `ChatterStabilityLobeEngine.ts(341,778)` TS2351 "not constructable" (a value used as `new X()` that isn't a ctor).
- `FusionAIOrchestrationEngine.ts(279,281)` FusionFeatureType/FusionMachineType literal mismatch.
- `InventorCADCodeGeneratorEngine.ts(139)` Set<string> vs ReadonlySet<union>; `(528)` requireArg override signature; `(2077)` `warningCount` excess property.
- `ReasoningChainSharingEngine.ts(662)` string vs `EventHandler<unknown>` arg.
- DONE this session (cold tsc 54->41): Mastercam(507), UnifiedProgramParser, SpeedFeedExhaustive, WireEDM-TechData,
  PostProcessorPhysicsAware, SpeedFeedNineAxis(part_volume_cm3), WireEDMNeural(793/794), InventorCAD(2077 + execute() literal).

## HIGH-PRIORITY SAFETY FINDING -- ChatterStabilityLobeEngine `_computeWithStabilityLobeDiagram` (lines 341, 778)
Both do `new StabilityLobeDiagram()` but `StabilityLobeDiagram` is a SINGLETON instance
(`src/algorithms/StabilityLobeDiagram.ts:243 export const StabilityLobeDiagram = new StabilityLobeDiagramImpl()`),
so `new` THROWS at runtime -> the safety-critical SDOF chatter path falls to a degraded fallback. This is the SAME
bug class as the 2026-05-30 fix `U-CHATTER-SLD-RESTORE` ([[reference_chatter_engine_regression_2026_05_24]]) -- which
fixed the `compute()` site but MISSED these two `_computeWithStabilityLobeDiagram` paths. The correct fix (drop `new`,
use the singleton) is verified-correct BUT unmasks **19 downstream errors**: the entire method body calls a STALE
StabilityLobeDiagram API (15x TS2339 method-not-found + 4x TS2345 arg + `.lobes` result-shape) -- the method must be
rewritten against the current `Algorithm<StabilityLobeInput, StabilityLobeOutput>` interface (`.execute(input)`).
**Safety-critical -> route to foxtrot/oscar (chatter owner) WITH physics-review; not a rush fix.** (I reverted the
1-line `new` removal this session to avoid leaving the build at 58 with a half-rewritten safety path.)

**Recommended next-tick order:** the ChatterStabilityLobe safety path (above) FIRST (correctness + safety) -> C (mechanical,
fast, verifiable) -> B (gather physics values + physics-review) -> A (real implementation, largest; route each to its owning
galaxy slot: NX/PowerMill/SolidCAM/Fusion->kilo CAM, Turning->whiskey lathe, CadQuery->delta CAD, sinker constants->mike/wedm).

## SESSION-2 UPDATE (cold tsc 54 -> 38; +6 more units shipped)
Additionally DONE: SpeedFeedNineAxis(part_volume_cm3 omit), WireEDMNeural(plain_brass/numeric dia), InventorCAD(execute()
literal->CADExecutionResult), CADFeatureClassifier(4 FEATURE_PROFILES keys), PPGDialectRanker(match() real schema),
ReasoningChainSharing(eventBus.subscribe arity).
**Newly investigated -> confirmed DEEP (NOT mechanical; root cause noted for the owner):**
- `ReinforcementLearningCAMFeedbackEngine(302,373)` -- `.step()` requires `outcome:{mrr,tool_life_factor,surface_ra,safety_margin}`
  as the 4th arg; the call passes a scalar reward + `done` in the wrong slot. The "rewardOverride" comment describes an API
  that doesn't exist. Needs the CAM-RL outcome reconstructed (india/CAM domain), not a mechanical fix.
- `CADPartArchetypeRegistryEngine(37 -> 53)` -- COUPLED 2-part: (1) Zod-v4 `z.record(z.string(), valueSchema)` migration;
  (2) once (1) lands, line-53 archetype data has `args` with `undefined` values violating `Record<string,string|number|boolean>`
  -- fix the 8 ARCHETYPE_REGISTRY op_template args (drop undefined / widen schema). Do BOTH together or it stays at 1 error.
- `OfflineRLOrchestratorEngine(69)` -- domain map `general`/`sinker` -> ledger (`sinker_edm`, no `general`; `general`->`other`?).
  Semantic -- india's call (affects which experience bucket a policy trains on).
- Bucket-B physics deferred (own classification): `FiveAxisDeepLearning(313/397/481)` material literals (D2/M2 HSS/EDM-3 graphite)
  need `density_kg_m3`+`specific_heat_j_kgk` (textbook values, but physics-review per the safety rails).

## SESSION-3 DEEP-DIVE (workflow push 38->12, then proven owner-bound remainder)
Workflow-assisted (chunked-3 sonnet agents + papa curate) cleared 38->12 (9 files committed: WF1/PHYSICS-WF2/
WF3). The remaining **12 errors / 6 files** were DEEP-DIVED this session and PROVEN owner-bound -- papa cannot fix
without fabricating output mappings (R12). Exact fix-paths for the owners:

- **SolidCAMAIOrchestration(260,296)** -> KILO. (260) `selectStrategy({...})` -> real `recommend(feature,material,
  machine,tool,priority): SolidCAMStrategyRecommendation[]` (construct the 4 minimal objects -- only type/iso_group/
  diameter_mm+flute_count required; take [0]; map name<-strategy.display_name, solidcam_operation<-strategy.category,
  parameters<-{ae_pct,ap_factor,vc_multiplier,engagement_control}, rationale<-reasoning). (296) `calculateOptimalLevel`
  DOES NOT EXIST on prismPathConstantEngagementEngine; the real `technologyWizard(iso,machine_class,level)` returns
  `WizardParameters{level,ae_mm,ap_mm,vc_factor,fz_mm,machine_rigidity_factor,justification}` -- the consumer expects
  `{cutting_feed_pct,mrr_increase_pct,tool_life_increase_pct,step_down_mm,step_over_pct,wizard_recommendation}` which
  have NO equivalent. KILO must add a real calculateOptimalLevel returning the consumed shape, OR redesign imachiningOpt
  to use the real WizardParameters fields. (Do NOT fabricate mrr/tool-life increase %.)
- **ShopMachineOverlay(396)** -> HOTEL/papa-followup. The `canonical_package: CanonicalMachinePackage` annotation is
  WRONG: the producer literal + the consumer (`MachineConsumerBindingEngine.ts:286` reads `.canonical_id`) both use an
  overlay shape (canonical_id/type/controller/spindle/.../confidence_breakdown, ~17 fields), NOT CanonicalMachinePackage
  (id/machine_type). FIX: define an `EnrichedMachineOverlayPackage` interface matching the literal + retype the field.
  No fabrication -- pure type-def alignment (deferred only for budget; it is papa-completable).
- **TurningStochasticPlan(92,97)** -> WHISKEY. insertChangeSchedule/wearAccumulation don't exist on TurningInsertLifeEngine
  (has predictLife/selectGrade/validateChipbreaker). Needs the scheduling/wear-accumulation logic implemented, not stubbed.
- **CADAdapterRegistry(97)** -> ECHO/CAM. mastercamCodeGeneratorEngine doesn't satisfy ICADCodeGenerator (base-class
  conformance gap, same family as InventorCAD requireArg). Needs the engine to conform or a real adapter.
- **InventorCAD(139,528)** -> papa-followup (careful). 139 `new Set<CADOperationKind>` UNMASKS a 24-error cascade
  (verified -- the ops list has members outside CADOperationKind); needs the op-list reconciled to the union FIRST.
  528 requireArg override narrows base visibility/param-kinds -- align to base.
- **WEDMSafetyEnvelope(62)** -> MIKE + physics-review. Missing U/X/Y/Z axis EnvelopeLimit entries -- real machine
  travel/soft-band values (safety; do NOT fabricate).
- **OfflineRL(92)** -> peer-owned (modified by a peer chat this session; leave to them).
