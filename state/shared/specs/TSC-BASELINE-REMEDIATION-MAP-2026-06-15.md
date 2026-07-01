# TSC Baseline Remediation Map — 638 errors, owner-routed (2026-06-15, slot:papa)

> Produced by papa (backend-helper) after the WIRE-UNWIRED-PAPA campaign closed. papa's mandate is
> "surface build state loud + unblock peer backend work" — NOT to unilaterally edit 247 domain-owned
> files (soul: *defer domain edits to the owning slot*; 3 peers live + 16 foreign claims at audit time).
> **This map routes each cluster of build debt to its owning slot so each fixes its own engines.**
>
> Source: `state/shared/specs/TSC-BASELINE-638-2026-06-15.txt` (full `tsc --noEmit` error list, integration
> branch cad-fusion-live-ms0). Regenerate: `cd mcp-server && NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit`.
> **638 errors across 247 files** (209 in `src/engines/`). This is the long-standing pre-existing baseline
> every WIRE-UNWIRED-PAPA commit measured "0-new" against — it is fleet type-drift, not any one slot's regression.

## Per-slot routing (by file-path keyword → owning galaxy)

| Owning slot | Galaxy | ~Errors | Biggest single files |
|---|---|---|---|
| **delta** | CAD | ~111 | cad-validation-corpus.ts (16), cadDispatcher.ts (8), SolidWorksCodeGenerator (7), SolidWorksAutomationBridge (6), CADLiveBlueprintOcrAdapter (6), ImpellerCADEngine (5), HyperCADSLiveBridgeEngine (5) |
| **mike** | WEDM | ~106 | **WEDMSetupSheetEngine.ts (48 — the single largest)**, WEDMJobCreatorEngine (13), WedmProgramIndexEngine (7), WEDMNeuralTrainingEngine (5), WEDMArchiveBackfillEngine (4) |
| **india** | AI-training | ~86 | TribalCorpusOrchestratorEngine (7), TrainingSchedulerEngine (7), WEDMNeuralTraining overlap, MITCourseKnowledgeEngine, CADTrialErrorLearningEngine |
| **whiskey** | Lathe | ~81 | LatheMasterOrchestratorFacadeEngine (10), LatheQualityGateEngine (7), JMDieLatheProgramUpgraderV2Engine (7), LatheCAMIntelligenceEngine |
| **kilo** | CAM | ~38 | knowledgeDispatcher overlap, camUIElementSchema (4), Mastercam/hyperMILL family, ToolCatalogAdaptiveEngine (5) |
| **oscar** | Speed-Feed | ~30 | SpeedFeedNineAxisOrchestratorEngine (13), SpeedFeedPropagationBridgeEngine (6), SpeedFeedAdvancedAIEngine, SpeedFeedUltimateAIEngine |
| **hotel** | Business | ~20 | RealTimeFinancialSnapshotEngine (6), **ProcessIntelligenceRouterEngine (6 — see BUG below)**, OSHA300LogEngine |
| **foxtrot** | Mill | ~15 | MillingPhysicsKernelEngine (10) |

_(Counts use case-insensitive file-path keyword matching and overlap slightly where a file name carries two
domain tokens — e.g. WEDMNeuralTraining counts for both mike and india; treat as ±5%. The COUNT is the routing
signal, not a precise per-slot ledger.)_

## Dominant error classes (whole baseline)

| Code | Count | Meaning | Typical fix owner |
|---|---|---|---|
| TS2339 | 131 | property does not exist on type | domain (the engine's own type model) |
| TS2322 | 130 | type not assignable | domain |
| TS18048 | 58 | value possibly 'undefined' | domain (add the guard the logic intends) |
| TS2353 | 52 | object literal unknown property | domain (shape drift) |
| TS2345 | 46 | argument type mismatch | domain |
| TS2352 | 30 | unsafe conversion | domain |
| TS2554 | 28 | wrong arg count (incl. `z.record(1-arg)`) | **mixed — z.record-arity is mechanical** |
| TS7006/7022/7031/7053 | 29 | implicit-any (needs annotation) | **mechanical (add a type annotation; zero behavior change)** |
| TS2307 | 6 | module not found | see ProcessIntelligenceRouter BUG |

The two **mechanical** classes (implicit-any 29 + z.record-arity subset of TS2554) are the only ones fixable
without domain knowledge — but they are scattered ~1-3 per file across 19+ domain-owned files (SpeedFeed/Lathe/
MITCourse/WEDM/etc.), so each is best fixed by the owning slot *while it touches that file anyway*. There is no
papa-safe contiguous block worth a cross-slot edit pass.

## NOTABLE BUGS surfaced (route to owner)

1. **`ProcessIntelligenceRouterEngine.ts` imports 3 engines that do not exist** (TS2307 ×6, lines 40/44/45/301/322/343):
   `./CrossProcessSpeedFeedBridge.js`, `./CrossProcessPostBridge.js`, `./CrossProcessFeatureBridge.js`.
   Either these bridge engines were never created (forward-declared imports) or were moved/deleted. **→ hotel** (or
   whoever owns ProcessIntelligence): create the 3 bridge engines OR remove the dead imports + their call sites.
   This is a real broken-module bug, not type-drift.

2. **`WEDMSetupSheetEngine.ts` carries 48 errors** — the single largest concentration (7.5% of the whole baseline).
   **→ mike.** Likely a single type-model/shape cascade; fixing the root type there could clear a large fraction at once.

## papa-EXECUTED slices (2026-06-15, slot:papa) — baseline 638 -> 615 (23 errors cleared, 0-new each)

Under the operator-greenlit "do it all / bypass galaxy gates" directive, papa cleared every GENERIC,
non-domain, mechanical tsc error across galaxies — pure type fixes / the established dispatcher-boundary
`as unknown as` idiom / additive optional type fields. NO domain values fabricated, no `any`, nothing
silenced. Each slice: tsc 0-new + anti-sweep-clean (hunk-line-range verified) + affected-tests-green.

- **Slice 1 — `e9f5005612` (638 -> 626, 12):** CriticalPathSchedulingFormula (succs:string[]),
  CSVStructureEngine (cell:string), GraphQLSchemaEngine (validated GraphQLKind cast), precompactDossierSchema
  (.errors->.issues + e:z.ZodIssue), claudeAccountDispatcher (typed handler). 52/52 tests.
- **Slice 2 — `e2d54d8e6c` (626 -> 616, 10):** devActionSchemas z.record arity; devDispatcher + calcDispatcher
  dispatcher-boundary `as unknown as` (idiom); RANSACHyperplane V:number[][] + domain "spatial"->"geometry";
  python-api await+envelope x2 (latent Promise-serialization bug); EventBusEvent +correlation_id (additive). 106/106 tests.
- **Slice 3 — `3b2d5724ba` (616 -> 615, 1):** HookExecutor HookContext +phase?:HookPhase (additive; clears
  guardDispatcher excess-property; 79 importers unaffected).

**The remaining 615 are DOMAIN-OWNED** (table above). The papa-safe generic seam is EXHAUSTED — what's left
needs the owning slot's domain/product knowledge (papa will NOT guess domain values into shop-floor output):

| File:line | What papa verified | Owner | Fix needed |
|---|---|---|---|
| `index.ts` 851-854, 1211 | MCP SDK `McpServer` not assignable to `Server<>` + arg-count drift | (infra/boot) | SDK-version-aware registration signature; risky (boot file) |
| `routes/python-api.ts` 261 | route calls `.search(query,opts)` but `TribalKnowledgeAdvisorEngine` only has `query(TribalQueryContext)` (structured: material/iso_group/operation/keywords/customer/hardness…) | **india** | free-text -> structured `TribalQueryContext` adapter |
| `schemas/camFunctionIndexSchema.ts` 242 | `CAMMenuSchema` recursive self-reference (TS7022) | **kilo** | `z.lazy(() => …)` + explicit `z.ZodType<CAMMenu>` annotation |
| `tools/dispatchers/algorithmDispatcher.ts` 193, 1282 | module exports `algorithmGateway()` fn — NO `algorithmGatewayEngine` singleton; `.split` on `never` | **tango** | remap to the exported fn / narrow the `never` |
| `tools/dispatchers/aiDispatcher.ts` 21 | TS7031 implicit-any binding — but file is **untracked** (peer's uncommitted new file) | (peer) | skip until committed; then typed destructure |
| WEDMSetupSheetEngine.ts (48), Lathe/CAD/SFC/Mill engines | consumer reads fields the producer never computes (feature reconciliation) | mike/whiskey/delta/oscar/foxtrot | domain type<->producer reconciliation (see per-slot punch-list) |

## papa's stance + recommended next directive

- papa does **not** unilaterally edit 247 domain-owned files (collision + ownership). This map is the deliverable.
- **If the operator wants papa to take a bounded slice:** the lowest-risk papa-fixable unit is the **implicit-any
  annotation class in GENERIC (non-domain) infra/algorithm files only** — `src/algorithms/CriticalPathSchedulingFormula.ts`
  (3), `src/algorithms/RANSACHyperplane.ts`, `src/index.ts`, `src/routes/python-api.ts` — pure type annotations, no
  behavior change, low churn. That is a small (<10-error) operator-gated unit, NOT a 638-sweep.
- **Each domain slot** should run `npx tsc --noEmit` filtered to its own engines and clear its rows on its slot branch
  (anti-sweep + 0-new discipline). The map above tells each slot its debt size + biggest files.

Memory: [[reference_papa_wire_unwired_v2_1_extension_2026_06_15]]. Companion to the WIRE-UNWIRED worklist
`PAPA-WIRE-UNWIRED-WORKLIST-2026-06-15.md` (campaign complete). Baseline snapshot: `TSC-BASELINE-638-2026-06-15.txt`.
