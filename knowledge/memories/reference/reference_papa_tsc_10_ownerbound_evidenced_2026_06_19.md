---
name: reference_papa_tsc_10_ownerbound_evidenced_2026_06_19
description: "mcp-server TSC 54->8 (papa). Papa-tractable fixes DONE: ShopMachine 951764e07f, WEDM 11be15d843, OfflineRL 5f1496509c, InventorCAD:528 23316cfe63. Remaining 8 are GENUINE domain-build work (git history PROVES the missing methods/adapters never existed -- unbuilt features, not bugs): SolidCAM->kilo, TurningStochastic->whiskey, CadQuery+CADAdapter->delta/echo, InventorCAD:139->delta. Papa can't build them without fabrication/type-weakening (soul refuses)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.723Z
aliases: reference_papa_tsc_10_ownerbound_evidenced_2026_06_19
---


# Remaining 10 owner-bound mcp-server TSC errors -- evidenced routing (slot:papa 2026-06-19)

Papa fixed the 2 genuinely papa-fixable ones this session: **ShopMachine** (`951764e07f`, type retype) and
**WEDM** (`11be15d843`, `SafetyEnvelope.limits` -> `Partial<Record>` -- structural, zero physics changed).
The remaining 10 were each investigated to file:line and are **confirmed domain-owner work** -- papa fixing them
would require fabrication (R12) or a stub (no-stub rule). Routing with exact fix-paths so owners can act:

## SolidCAM (2 errors) -> kilo
`SolidCAMAIOrchestrationEngine.ts:260` `selectStrategy` + `:296` `calculateOptimalLevel`.
**Evidence:** file header line 15-19 SELF-DOCUMENTS `// WIRE-EXEMPT: pre-existing orphan ... has unresolved
method-binding bugs (calls calculateOptimalLevel + selectStrategy that don't exist on the wrapped singletons)`.
`SolidCAMStrategyEngine` has `recommend(feature,material,machine,tool,priority): Recommendation[]` (positional,
array) NOT `selectStrategy({flat object}): single`. `prismPathConstantEngagementEngine` (an object) has `compute`
NOT `calculateOptimalLevel`. **Fix needs real adaptation** (construct SolidCAMFeature/Material/Machine/Tool from
the flat request -> call recommend -> map[0]; or implement the iMachining level calc) = kilo domain logic.

## TurningStochastic (2) -> whiskey
`TurningStochasticPlanEngine.ts:92` `insertChangeSchedule` + `:97` `wearAccumulation`.
**Evidence:** `TurningInsertLifeEngine` exports `predictLife`/`selectGrade`/`validateChipbreaker` ONLY (grep
confirmed) -- neither called method exists. Call site consumes `sched.parts_per_edge` + `wearTraj.final_wear`.
**Fix:** implement `insertChangeSchedule`/`wearAccumulation` on TurningInsertLifeEngine (real insert-life/wear
schedule physics) OR rewire to `predictLife` IF it yields parts_per_edge + final_wear = whiskey decision.

## CadQuery (2) -> delta/cad
`CadQueryCodeGeneratorEngine.ts:326,379` `_actionToCode` -- 2 call sites (in `generateScript`/`generateStepByStep`),
ZERO definition (grep confirmed). Contract: `(action: ExtractedAction) => string`, returns `"# unknown ..."` for
unrecognized types. **Fix needs the real per-action CadQuery codegen mapper** (sibling adapter
`InventorCADGeneratorAdapter` is ~544 lines of per-op emission) = delta domain. A stub returning `# unknown` would
be an R12 violation (generator emits useless scripts).

## CADAdapterRegistry (1) -> echo/CAM
`CADAdapterRegistry.ts:97` `return mod.mastercamCADGeneratorAdapter` -- MastercamCodeGeneratorEngine exports only
`mastercamCodeGeneratorEngine` (the engine singleton), NO adapter. Siblings export `fusion360CADGeneratorAdapter`
(line 71) + `inventorCADGeneratorAdapter` (line 84), each a full ~500-line ICADCodeGenerator impl. **Fix needs a
real `mastercamCADGeneratorAdapter`** (Mastercam NetHook3 C# per-CAD-op emission) = echo/CAM. Prior papa attempt
swapping `mastercamCodeGeneratorEngine` failed (doesn't satisfy ICADCodeGenerator) -- REVERTED.

## InventorCAD (2) -> delta/echo-careful
`InventorCADCodeGeneratorEngine.ts:139` Set<string> vs ReadonlySet<CADOperationKind(97 kinds)>; `:528` `requireArg`
override vs base. **Evidence :528:** base `UnifiedCADCodeGeneratorBase.requireArg` (line 315) is
`protected requireArg<T>(op,name,kind:"number"|"string"|"boolean"|"array")`; override (528) is
`private ... expectedType:"number"|"string"|"boolean"|"object"` -- TWO divergences (private narrows protected; `"object"`
vs `"array"`). Fixing :528 means aligning the override AND every InventorCAD `requireArg` call passing `"object"`.
**:139 is the regression trap** -- a prior `new Set<CADOperationKind>` unmasked the file 2->26 (set members include
strings outside the union). Both need the InventorCAD op-kind model owner = delta/echo, careful (NOT a blind papa fix).

## OfflineRL (1) -> india
`OfflineRLOrchestratorEngine.ts:92` source domain enum `mill|lathe|grinder|general|wedm|sinker|welder` not
assignable to `policyExperienceLedgerEngine.query` domain `...|sinker_edm|...` (no `general`/`welder`; `sinker_edm`
not `sinker`). **Fix is a semantic domain-model decision** (`sinker`->`sinker_edm`? `welder`->? `general`->`other`?)
-- `welder` has no ledger equivalent, so a clean map needs india's RL/ledger domain-vocabulary call.

## NOT papa: atcsDispatcher (2, transient) -> zulu (LIVE)
`atcsDispatcher.ts:91,1294` `getApiKey`/`hasValidApiKey` appeared mid-investigation -- zulu's live account-cycle
edit (flickers between tsc runs). DO NOT touch (peer live file).

Related: [[reference_papa_tsc_workflow_orchestration_2026_06_19]] · [[feedback_papa_cross_galaxy_work_commit_to_their_worktrees]] · [[reference_papa_lane_guard_failopen_commit_2026_06_19]].
