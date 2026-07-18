# camDispatcher Phantom-Method Audit (2026-06-24, slot:echo)

> **Bug class:** the fleet-wide dispatcher idiom `(engine as any).method?.() ?? { engine:"X", note:"... not callable" }`
> SILENTLY HIDES calls to methods that DO NOT EXIST on the engine -- the action returns
> `{ success:true, data:{ note:"not callable" } }` (a fabricated success / R12 lie). Surfaced while
> hunting the lathe-learner backlog; the first instance was fixed in `U-PP-JMDIE-LEARN-UNDARK`
> (commit `199f04a14a`: `jmdie_post_enhancement_ranking`/`_recommendations` -> real static methods).
>
> **Audit scope:** `mcp-server/src/tools/dispatchers/camDispatcher.ts` (~102 `"not callable"` occurrences).
> 42 distinct entries method-verified against their engines this pass (read each engine, checked static
> vs instance + existence). Remaining ~60 are the jmdie/lathe-learner group (fixed/verified clean) and
> the AGI/wiring group (verified present). **echo's post-processor surface (`pp_*`/`post_*`/`jmdie_*`/
> `lathe_*`/WEDM parse+tech-table) is CLEAN** -- no phantom bugs remain there.
>
> **Ownership:** the 9 confirmed phantoms below are **kilo's CAM domain** (CAM bridges / pattern-miner /
> macro-analyzer / training-aggregator / batch / radial-engagement) + one incident engine. echo surfaces;
> the owning slot fixes (several need real param-mapping or a new convenience method, not a 1-line re-point).
>
> **OVERLAP / route-to (R8 dedup):** slot **xray** owns fleet dispatcher->engine method-drift
> (`U-FLEET-DISPATCHER-DRIFT-REMEDIATION`, fixed 25 actions 2026-06-24 -- see
> [[reference_dispatcher_method_drift_fleet_audit_2026_06_24]] + bravo
> [[reference_dispatcher_engine_method_audit_2026_06_22]]). The 9 below are camDispatcher
> RESIDUALS still broken at HEAD (beyond xray's 25) -- route them INTO xray's remediation
> rather than opening a parallel track.

## CONFIRMED PHANTOM (action always silently returns the not-callable stub)

| Action | line | Engine | called (absent) method | real method to route to |
|---|---|---|---|---|
| `cam_bridge_kit_run` | ~20538 | CamBridgeKitEngine (export const = the CLASS) | `.run()` / `.process()` | route by `params.bridge` to a static bridge (`cadCamHandoff`/`sfcFusionBridge`/...) -- NON-TRIVIAL |
| `nc_pattern_mine` | ~20588 | NCPatternMinerEngine | `.mine()` / `.run()` | `static parseProgram(content, filePath)` |
| `macro_conversion_analyze` | ~20582 | MacroConversionAnalyzerEngine | `.analyze()` / `.run()` | `static analyzeProgram(content, filePath, options)` |
| `cam_training_extraction_aggregate` | ~20527 | CAMTrainingExtractionAggregatorEngine | `.getCorpus()` (then `.aggregate`) | `static aggregate(profiles, sourceDir)` (drop getCorpus) |
| `cam_utility_batch_run` | ~20094 | BatchCAMEngine | `.run()` | `generateBatch(parts, generateFn)` -- needs a CALLBACK, NON-TRIVIAL |
| `cimatron_cam_bridge_run` | ~20114 | CimatronCAMBridgeEngine | `.run()` / `.process()` | `extract(projectPath, options)` / `analyze(project, options)` |
| `tebis_cam_bridge_run` | ~20119 | TebisCAMBridgeEngine | `.run()` / `.process()` | `extractProject(projectPath)` |
| `radial_engagement_analyze` | ~20127 | RadialEngagementControllerEngine | `.analyze()` | `control(segments, params)` / `quickControl(...)` |
| `blameless_post_mortem_run` | ~20138 | BlamelessPostMortemEngine (incident, NOT a post-processor) | `.run()` / `.analyze()` | `file(input: PostMortemDraft)` |

## Fix protocol (for the owning slot)
1. Re-point each case to the real method (typed call, NO `as any` + NO `?.() ?? {note}` silent fallback) so it FAILS LOUD (outer dispatcher try/catch surfaces real errors).
2. Map the dispatcher `params` to the real method's signature (several take positional args, not a single params object).
3. Add a contract-lock test: engine unit tests CANNOT catch a dispatcher name-mismatch -- assert the real method exists + returns the expected shape, and `[regression]` the phantom name stays absent (pattern: `JMDiePostProcessorLearningEngine.test.ts` U-PP-JMDIE-LEARN-UNDARK block).
4. Re-run the full `"not callable"` audit on the REMAINING ~60 unverified cases + the other dispatchers (ppDispatcher etc.) -- this audit covered camDispatcher's first 42 distinct entries.

## Verified CLEAN this pass (method exists -- no action needed)
all 5 WEDM `*_parse`, all 4 WEDM `*_tech_table` (incl. Agie's intentional `getTecTable` spelling), all 4 `lathe_master_post_*` sub-engines, `lathe_cam_intelligence_recommend`, all `lathe_post_active_learning_*`, `jmdie_post_*` (static, post-fix), `pp_agi_cl_*`, `pp_agi_registry_*`, `pp_agi_wiring_*`, `cross_cam_post_*`, `novel_post_*`, `post_library_*`, `cam_post_feature_*`, `cam_post_emit_safety_gate`, `cps_parser_harvest`, `cam_phase5_*`, `cam_lora_adapter_status`.

_Authored by slot:echo (session 0731e3b0) via a read-only sonnet code-analyzer audit. Companion to ECHO-OPEN-TASKS-LEDGER.md + ECHO-ULTIMATE-ROADMAP-2026-06-24.md._
