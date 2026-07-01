# PAPA WIRE-UNWIRED worklist v2 (2026-06-15 fleet re-audit) -- cross-galaxy

> Supersedes the 2026-06-14 worklist (18-engine subset, now done/peer-built). Source: fresh fleet
> audit `state/shared/UNWIRED-ENGINE-AUDIT-2026-06-15.json` (37 unwired of 3790) + a Hermes triage
> agent reading each engine's API (agentId ac3c77693513dbdfa). PERMANENT rule:
> [[feedback_papa_cross_galaxy_work_commit_to_their_worktrees]] -- papa wires across all galaxies and
> commits to the owning slot's worktree (safe shared-tree fallback when the slot is live).
> Loop: pick next unchecked CLEAN -> dup-check ALL branches -> wire (actions + Zod schema +
> round-trip-through-dispatcher test) -> tsc 0-new -> vitest -> 2 per-file scrutiny agents ->
> commit to owning slot's branch (or [MAIN-FORCE] shared-tree fallback) -> loop-state tick.

## CLEAN -- wireable (11)

### prism_dev (papa home / golf / echo / foxtrot domains)
- [x] CohortBridgeShimEngine -> prism_dev | applyNodeNextSuffix/rewriteSourceImports/buildShapeCoerceShim/recommendShimsForTopBridges (pure source transforms) | galaxy:papa | HIGHEST ROI (papa-owned, trivial schema) | CohortBridgeShimEngine.ts:217 | DONE d35e85d8ed (4 actions, 22-test, dual-PASS)
- [x] HzpDashAuditEngine -> prism_dev | static build/toJsonl/renderLine (Zod-schema'd) | galaxy:golf | HzpDashAuditEngine.ts:48 | DONE 7b784ba8a0 (3 actions, 15-test, dual-PASS)
- [x] UnifiedProgramParserEngine -> prism_dev | parseContent(content,filePath) ONLY (parseFile/parseArchive are fs -- exclude) | galaxy:echo/india | UnifiedProgramParserEngine.ts:281 (singleton :1698) | DONE e2af8b8d3c (program_parse_content, 10-test, dual-PASS). NOTE: engine has 3 PRE-EXISTING tsc errors L1206/1226/1240 ('probe' OperationType gap) -> echo/india/TSC-CLEANUP, not mine
- [x] MillProgramCorpusEngine -> prism_dev | mill_corpus_stats (calculate corpus_stats; caller path NOT forwarded = no traversal; getCorpus/load/raw-computeStats deferred) | galaxy:foxtrot/juliett | DONE d51ad52e6d (7-test, dual-PASS). FLAG->foxtrot: deriveAxisCount NPE on operations-less row (MillProgramReplicationEngine.ts:154)
- [x] DesignToFloorPipelineEngine -> prism_dev | d2f_preflight (runPreFlightAnalysis physics+safety+MC-risk, in-mem job) + d2f_job_count + d2f_calibration_state; SPC/history/mutators/reset excluded | galaxy:foxtrot/golf | DONE a118efaf1d (11-test, dual-PASS; physics WIRED not edited)

### prism_calc (tango / oscar)
- [x] MOEAStoppingCriterion -> prism_calc | moea_stopping_evaluate (stateless batch: sequence of fronts -> fresh instance -> evaluate-until-stop -> decision+trajectory) | galaxy:tango | DONE e70bffb7af (12-test, dual-PASS, type-safe no-as-any)
- [x] SpeedFeedPSNDecisionPriorEngine -> prism_calc | sfc_psn_decision_prior (query() read-only PSN prior fusion; priors NOT edited) | galaxy:oscar | DONE ef8ebf72aa (8-test, dual-PASS). DEFERRED->oscar: seeded-ledger fusion-math test

### prism_session (golf)
- [x] SlotSessionHistoryEngine -> prism_session | slot_session_fleet_state/_latest/_history (read; slot=NatoSlot enum, no traversal; record* excluded) | galaxy:golf | DONE 7389585b5f (10-test, dual-PASS). INCIDENT: this commit git-add-SWEPT sierra's uncommitted GAC04 dual_channel_dispatch wiring (latent dangling import on untracked DualChannelContextEngine.ts) -> chat-bus alerted sierra; see [[reference_papa_gac04_sweep_incident_2026_06_15]]. ROOT FIX for remaining cam iters: git status --porcelain <file> BEFORE editing a shared file; if peer-dirty, do NOT git-add it.

### prism_cam (kilo) -- the 3 Adapter orchestrators (base *Engine siblings ARE wired; these Adapters are NOT -- import the Adapter singleton, not the base)
- [x] CoolantStrategyAdapter -> prism_cam | coolant_select_orchestrated (selectCoolantOrchestrated) | galaxy:kilo | DONE d909751978 (8-test, dual-PASS; anti-sweep hunk-range verified; shared-tree fallback, kilo worktree stale)
- [x] EntryExitStrategyAdapter -> prism_cam | entryexit_select_orchestrated (selectEntryExitOrchestrated) | galaxy:kilo | DONE 794047f414 (8-test, dual-PASS 0-findings; anti-sweep hunk-range verified; shared-tree fallback, kilo worktree stale). Content proofs: center_cutting:false drops MILL-plunge (only center-cut entry); op:finish drops rough-only entries.
- [x] IntelligentSequencingAdapter -> prism_cam | sequence_select_orchestrated (selectSequenceOrchestrated; 5-strategy orchestrated select, distinct from existing raw sequence_operations) | galaxy:kilo | DONE ca79d01fd9 (9-test, dual-PASS 0-findings; anti-sweep hunk-range verified; shared-tree fallback). Content proofs: empty->no_candidates:true/MINIMAL branch; input-op-id preservation; tool-change monotonicity. FLAG->kilo: pre-existing type drift IntelligentSequencingAdapter.ts:50 imports non-existent 'SequenceResult' (engine exports 'SequencingResult'); in 638 baseline, runtime-harmless. NOTE: sequenceFor* convenience wrappers NOT separately wired -- they internally call selectSequenceOrchestrated with a fixed decision_point; one orchestrated action is the canonical surface (matches coolant/entryexit 1-action pattern).

## NEW CLEAN v2.1 (4) -- surfaced by the post-11/11 audit re-run (backlog 37->26; these 4 appeared since the 2026-06-15 snapshot). Triage agentId a3fd090ef12230bba read each engine's public API. All 4 -> prism_dev (papa home; cross-domain CLEAN engines route to prism_dev per the established pattern -- MillProgramCorpus/HzpDashAudit precedent). loop-state target extended 11->15.
- [x] PactContractTestEngine -> prism_dev | pact_define_contract/pact_verify_interaction/pact_check_backward_compat (defineContract/verifyInteraction/checkBackwardCompat; class-static, plain-object I/O) | galaxy:dev (papa) | DONE 4e0de6a764 (13-test, dual-PASS 0-P0/P1; anti-sweep hunk-range verified). 3 module-level Zod helpers; createdAt-vs-now contract-shape distinction. FLAG->golf: pre-existing devActionSchemas.ts:450 z.record 1-arg (commit ad5f4dcc080, charlie SVI; in 638 baseline, not mine).
- [x] AcquisitionRecommendationEngine -> prism_dev | acquisition_recommend/best/roi/distributor/compare/stats (6 actions; in-mem catalog, machine-binding-gated recommend/best; recordPurchase mutator excluded) | galaxy:hotel/business | DONE 6194a764c8 (11-test, dual-PASS 0-P0/P1; exact ROI 900/14/170 math proof; binding-gate null traced through 3 engines by reviewer; anti-sweep verified). nullable returns wrapped (slim-stripped null). Content-rich round-trips use real catalog ids per legitimacy gate.
- [x] MeasureSummaryEngine -> prism_dev | measure_add/generate_summary/get_summary/list_summaries/quality_trend/parts_with_issues/export (7 actions; in-mem store, static class methods) | galaxy:quality | DONE 184febdbfb (10-test all-7-actions-round-tripped; severity/passRate/disposition exact proofs; tsc 638/0-new; anti-sweep verified). SCRUTINY-QUOTA-BLOCKED (agents hit session limit, reset 3pm CT) -> committed with R12 disclosure, FLAGGED for post-reset 2-agent re-review. FLAG->golf: pre-existing MeasureSummaryEngine.ts:32 z.record 1-arg (638 baseline, untouched).
- [x] PlaywrightAutomationEngine -> prism_dev | **ALREADY WIRED BY NOVEMBER (do NOT duplicate)** -- commit d68dc6d26c `[NOVEMBER] [DEA-MS0]/U-DEA-november-EXTRA15` wired it into prism_dev (playwright_get_profile + playwright_generate_script, 8/8 test). Playwright is november's territory (NOVEMBER = U-DEA). Dup-check (`git log --all | grep -i playwright`) caught it before papa wired a duplicate. Shows UNWIRED in the shared-tree audit only because november's commit is on slot/november (unmerged); it wires when november merges. papa STANDS DOWN on this engine.

## CAMPAIGN COMPLETE (2026-06-15) -- NO CLEAN CANDIDATES REMAIN
**All CLEAN engines wired.** 11 original (papa) + v2.1 NEW CLEAN: Pact (4e0de6a764 papa), Acquisition (6194a764c8 papa), MeasureSummary (184febdbfb papa, + romeo wired the same engine -> prism_quality e763f5252c = canonical quality home; coexisting), Playwright (november d68dc6d26c). Live audit re-run (`audit-unwired-engines.mjs`): **23 UNWIRED = 1 november-owned (Playwright) + 3 already-wired/redundant (XProc/BarRemnant/MillPrintToProgram) + ~19 genuinely DEFERRED** (transport/closure/test-harness/stub -- cannot cross a JSON dispatcher boundary; each routed to its owning slot in the DEFERRED list above). Directive stop condition ("stop when no CLEAN candidates remain") = MET.
**OPEN: NONE.** U-WIRE-MEASURE re-scrutiny DONE post-quota-reset — reviewer PASS (live 10/10, tsc 638, no enum drift, no P0/P1); acted on its 2 P2 findings (get_summary/export miss-signal now `{found,...}` mirroring romeo) -> commit 97f2ebd387 (U-WIRE-MEASURE-P2, +1 not-found test, 11/11). Stale cron a35205ba deleted; loop-state ended (iter 14). CAMPAIGN FULLY CLOSED.
**PIVOT note:** directive says pivot to november (U-DEA) / juliett (DB). november is LIVE running its own /loop (e.g. d68dc6d26c iter18 cron) -- do NOT collide with its active U-DEA backlog. juliett DB-expansion work needs a fresh scoped investigation + the scrutiny gate before papa picks it up.

## DEFERRED (18) -- cannot cross a JSON dispatcher boundary; need a different surface
### NEW DEFERRED v2.1 (5) -- surfaced by the post-11/11 audit (triage agentId a3fd090ef12230bba)
- EmbeddingGuardEngine -- no exported singleton + constructor needs injected `GuardEmbedder` closure -> needs a factory surface (owner of embedding-guard)
- SemanticAssetIndexEngine -- no singleton + constructor needs live `QdrantVectorStoreEngine` (HTTP transport) + injected `IndexEmbedder` -> juliett (DB/Qdrant) + a transport-factory
- CreoToolkitBridgeEngine -- injected `CreoTransport` (live `ptcsetup; pro_toolkit_daemon` subprocess/IPC) -> delta + transport-factory
- CreoIntegrationTestSuiteEngine -- runOne/runAll take a `ScenarioDriver` closure as a primary param -> delta test surface
- CATIACAAV5BridgeEngine -- factory-only export; injected `CatiaTransport` (live CATIA CAA V5 TCP daemon) -> delta + transport-factory

### Original DEFERRED (13)
- WEDMLoRADatasetBuilderEngine -- EMPTY STUB (0 bytes; real builders are per-domain *LoRADatasetBuilderEngine + WEDMLoRAAdapterEngine) -> route to india/mike
- RhinoCommonBridgeEngine / OnshapeAPIBridgeEngine / OnshapeLiveCollabAdapter / NXOpenAssemblyDrawingEngine -- live CAD-app IPC/REST/websocket transports (injected send()/transport) -> delta + a transport-factory surface
- HyperMillACBridgeEngine -- live hyperMILL Automation-Center HTTP driver -> echo/kilo
- HyperCADSElectrodeEngine -- 7 ops via injected HyperCADSLiveBridge (only 4 list* catalog reads are pure -- wire ONLY if catalog reads justify) -> delta
- DeepSeekClientEngine / GrokCLIClientEngine -- HTTP/CLI LLM transports (api key / child_process spawn) -> india
- MastercamHeadlessIntegrationTestEngine -- drives a live headless Mastercam process (test harness) -> kilo test surface
- BlueprintOCRAdapter -- an `interface` (async OCR service), no singleton; only summarizeConfidence() pure -> xray
- BayesianAcquisitionRefiner -- refine(input.acquisitionFn:(x)=>number) closure-typed primary input -> tango/india
- cycleSchedulingBridge / reactiveChainBootstrap -- side-effect modules (register eventBus actions/reactive-chains at load; no callable export surface) -> their owning domain

## ALREADY-WIRED / REDUNDANT (4) -- DO NOT re-wire (dup-check caught these)
- XProcNeuralAutoFireEngine -- LIVE: aiReasoningDispatcher.ts:622-624 (xproc_autofire_{activate,deactivate,status}). Audit entry stale.
- BarRemnantManagementEngine -- ALREADY on slot/romeo (98693a6363: prism_turning + 4 bar_remnant_* + 12-test) + november->prism_dev. SKIP (peer owns).
- MillPrintToProgramEngine -- REDUNDANT thin delegator to millingPrintToProgramEngine (millDispatcher already wires the canonical path).
- HyperMillACServerConfig sibling was wired (CAM-EXHAUST c7c9287599); the bridge engine itself stays DEFERRED (live transport).

## Order (highest ROI first)
1. CohortBridgeShimEngine (papa-own, prism_dev) -- prove the flow
2. HzpDashAuditEngine (prism_dev, static, schema'd)
3. MOEAStoppingCriterion (prism_calc, single method)
4. SpeedFeedPSNDecisionPrior (prism_calc, single method)
5. SlotSessionHistoryEngine (prism_session, reads)
6. UnifiedProgramParserEngine (prism_dev, parseContent)
7. HzpDashAudit done above; then DesignToFloorPipeline, MillProgramCorpus (prism_dev, read methods)
8. CoolantStrategyAdapter, EntryExitStrategyAdapter, IntelligentSequencingAdapter (prism_cam -> commit to slot/kilo per the cross-galaxy rule)

Memory: [[feedback_papa_cross_galaxy_work_commit_to_their_worktrees]] · triage agentId ac3c77693513dbdfa.
