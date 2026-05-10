# AUDIT-LATEST
Generated: 2026-05-10T04:49:43.368Z

## Stats
- Findings: 122 (suppressed by wiki: 13, dedup rate: 9.6%)
- Domains scrutinized: 10, avg confidence: 0.739
- Phase 2: bridges=50 cycles=0 doctrine=28 dead=100
- Overlay: green=21 yellow=128757 red=138 blue=19 uncolored=370

## DOCTRINE (28)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Inline Kienzle/Taylor/material constants forbidden
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Inline Kienzle/Taylor/material constants forbidden
- Inline Kienzle/Taylor/material constants forbidden
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- TODO/FIXME/HACK markers in production code
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- Type-erasing cast (as any / as unknown as)
- TODO/FIXME/HACK markers in production code
- Type-erasing cast (as any / as unknown as)
- Inline Kienzle/Taylor/material constants forbidden

## GAP (38)
- [ai-reasoning] 16 of 19 Tier-3 specialists have feedback_loop_wired: false despite JSDoc claims. Mandate: every AGI/Ultra/Master orchestrator MUST subscribe to >=1 actuals signal (recordOutcome|onActuals|measuredOutcome) within 30 days or get demoted from production->beta.
- [ai-reasoning] Ollama user-prompt offloader is 0% effective. ollama-task-offloader fires 23 times and offloads 0 — every conversational task is kept on Claude. The 54% offload rate is entirely from cache-hit on engine-api-extraction. Re-tune the classifier or this is dead infrastructure.
- [ai-reasoning] PRISMCreativeReasoningEngine.explore() needs to be either (a) renamed to PRISMRuleBasedCombinatorEngine to match what it actually does, OR (b) routed through aiSystemRouterEngine.route('reasoning') to get a real LLM call. Current state ships a marketing-grade JSDoc over a 10-row lookup table.
- [ai-reasoning] 80 LatheLoRA* engines and 0 .safetensors weights. Either stand up real training (LatheLoRACadenceEngine should produce checkpoints under data/models/lathe-lora/<date>/) or delete the scaffolding. Current state hides 80 unused engines from /dedup audits.
- [ai-reasoning] AI-HIERARCHY-INVENTORY.md is 530 honest lines but stale (generated 2026-05-02, today is 2026-05-09). Re-run on every Stop or weekly cron — drift on this file is the difference between 'we know what we have' and 'we hallucinate what we have'.
- [ai-reasoning] AISystemRouterEngine has a telemetry ledger (knowledge/summaries/routing-decisions.jsonl) but no consumer. Add a weekly digest cron that reports route_class distribution + reachable=false rate; current state is write-only telemetry.
- [cad-ingest] No unified CADIngestEngine — ingest is fragmented across CADCorpusIngesterEngine, CADCorpusIngestionEngine, CADFileIndexerEngine, UniversalCADIndexEngine, CADCorpusFeaturePrevalenceLearnerEngine with overlapping scan/classify duties.
- [cad-ingest] Multi-page PDF extraction (Phase 8 / Docustrata 96% multi-print) lives only in Python scripts — no TS engine equivalent. Glob for phase8-tiered-blueprint-classifier*.py and docustrata* both returned ZERO results in scripts/, suggesting the validated 4.5%/page pipeline is either missing-from-repo or in a different location.
- [cad-ingest] Sparse importer coverage: only 4 files contain importStep|parseDxf|importIges|importDwg|extractFromPdf across 100+ CAD engines (CadBridge, QuoteToShipOrchestratorEngine, StepImportEngine, WEDMPrintToProgramEngine).
- [cad-ingest] BlueprintProgramJoinEngine joins to a CAD master-index it explicitly calls 'currently sparse' / 'currently stub' — fallback path is real (program-labels.json) but CAD side is degenerate.
- [cad-ingest] CADPhysicsConsistencyGateEngine is not wired into the ingest path — ingested geometry parameters are not validated until much later in CAM. Engine exists, validators are correct, but ingest engines never call it.
- [cad-ingest] Extension drift between two corpus engines: Ingester supports 8 extensions (.step .stp .iges .igs .sldprt .ipt .x_t .x_b), Ingestion supports 25+ (adds .slddrw .idw .iam .f3d .f3z .prt .asm .drw .catpart .catproduct .catdrawing .stl .dxf .dwg). Same archive, different filtering.
- [edm] {"title":"Sinker EDM is structural scaffolding, not a working pillar","evidence":"Only 7 SinkerEDM* engines (Calculator, PrintToProgram, ElectrodeGeometry, FlushingAdvisor, WearCompensation, LoRADatasetBuilder, LoRACadence) vs 100+ WEDM. Only 8 sinker dispatcher cases vs ~215 wedm. Only 2 sinker test files (numerical-sinker-engines, PPSinkerEDMPostEngine) vs 100+ WEDM. Zero sinker-prefixed skills found in C:/Users/wompu/.claude/commands/. No safety-gate stack, no controller dialect router, no AGI feedback loop, no JM Die tribal corpus.","severity":"high","confidence":0.9}
- [edm] {"title":"Sinker EDM lacks a printed-electrode-to-program pipeline of WEDM's depth","evidence":"SinkerEDMPrintToProgramEngine + SinkerEDMElectrodeGeometryEngine exist but are single engines, not a 12-stage pipeline like WEDM-P2P. No equivalent of EDMFeasibilityEngine, EDMStartHoleSetupEngine (sinker analog: pilot-hole / electrode-mount strategy), EDMQualityOrchestratorEngine for sinker. Electrode wear compensation (SinkerEDMWearCompensationEngine) is wired but no orbit-strategy engine, no dielectric-flush adequacy gate for deep cavities, no DC-arc detection.","severity":"high","confidence":0.85}
- [edm] {"title":"Tribal corpus is Mitsubishi/Mastercam-heavy, thin on other controllers","evidence":"Of ~80 tribal tips, JM Die programs are exclusively Mitsubishi FA-10S (wedm-jmd-001 H175 pattern, M78 M78 tank fill, etc.) and Mastercam X8 (wedm-mcam-001..010). Sodick, Makino, Agie tips appear only in research-derived (academic) entries, not field-grounded. PRISM has post engines for all 5 controllers but operator wisdom for only 1.","severity":"medium","confidence":0.85}
- [edm] {"title":"AGI/ML engines lack online-deployment evidence","evidence":"WEDMRLControllerEngine, WEDMOnlineLearningEngine, WEDMTransferLearningEngine, WEDMLoRAAdapterEngine all exist as code but the offline→online bridge is unclear. No engines with names like WEDMRLDeploymentBridge or WEDMModelServingEngine. Risk: ML investment may be training-only with shop deployment still manual. Worth checking model-update events in JOBOutcome telemetry.","severity":"medium","confidence":0.7}
- [edm] {"title":"Sinker physics constants asymmetry vs WEDM","evidence":"src/physics/constants.ts has dedicated EDM_PHYSICS namespace with corner_lag.response_time_ms by material, wire_safety current density limits, taper spec — all WEDM-flavored. Sinker EDM constants live inline in SinkerEDMCalculatorEngine.ts (ELECTRODE_MATERIALS, WORKPIECE_MATERIALS, VDI_SCALE) violating the 'NEVER inline constants' safety rail. wedm-constants.ts exists; no sinker-constants.ts.","severity":"high","confidence":0.85}
- [edm] {"title":"No micro-EDM AGI tier despite MicroEDMEngine existing","evidence":"edmDispatcher.ts ships MicroEDMEngine (case 'micro') and edm_micro_program action, but no MicroEDM* AGI engines (no RL, no LoRA, no learning loop). Micro-EDM is a third subgenre that the brief does not cover but PRISM has scaffolded — should be either fleshed out or de-scoped.","severity":"low","confidence":0.8}
- [edm] {"title":"WEDM tier6 / autonomy gates exist but cap-and-trade enforcement is undocumented","evidence":"WEDMTier6GeomGateEngine, WEDMAutonomyAuditEngine, WEDMOverageApprovalEngine, WEDMCreditCostEngine — engines for tiered autonomy (operator-approve vs auto-emit) exist but the policy mapping (which Sx threshold triggers which tier, who approves overages) is not visible from engine reads. Risk: autonomy framework is built but not actually gating outputs in production.","severity":"medium","confidence":0.7}
- [edm] {"title":"Sinker dispatcher actions have schema-coverage uncertainty","evidence":"edmDispatcher.ts merges 16 schema files into ALL_EDM_SCHEMAS but they are predominantly WEDM-named (WEDM_PIPELINE_ACTION_SCHEMAS, WEDM_ML_OPTIMIZER_SCHEMAS, etc.) with EDM_ACTION_SCHEMAS the only generic one. Sinker_calculate, sinker_recommend etc. likely fall under EDM_ACTION_SCHEMAS; whether their Zod definitions enforce the 18-material workpiece DB and 6-material electrode DB is not verified.","severity":"low","confidence":0.65}
- [knowledge-memory] {"id":"G2","severity":"HIGH","claim":"4,245 tribal tips have NO customer field — grep for `customer:|customer_id|customer_name` in knowledge/tribal returns 0 matches. JM Die has 118 lathe customers in folder structure but tribal tips cannot be filtered by customer at retrieval time. Per-customer learning is impossible from this corpus.","fix":"U-TRIBAL-CUSTOMER-FIELD: (1) extend tribal-tip frontmatter schema with customer_id/customer_name; (2) backfill from JM DIE folder paths via JMDieProgramHarvesterEngine — when a tip is extracted from a customer file, tag it; (3) update TribalKnowledgeEngine + TribalRAGEngine to support customer-scoped queries (`searchByCustomer(name, query)`)."}
- [knowledge-memory] {"id":"G4","severity":"MED","claim":"Wiki entries have low confidence (0.7) for ALL bootstrap-generated entries (570+ of 770). LLM-augmented entries with sources>1 + confidence>0.85 are the long-term goal but the corpus is currently 75% bootstrap-only.","fix":"U-WIKI-LLM-AUGMENT: schedule Ollama batch run that walks bootstrap entries and adds synthesized cross-refs + confidence bumps; pause when source files older than 30 days (avoid drift)."}
- [knowledge-memory] {"id":"G6","severity":"MED","claim":"Memory injection hash dedup missing — same memory can be re-injected within a session (rule 5 of 2nd-brain protocol explicitly flags this). memory-rag-inject.mjs does not track per-session injected hashes.","fix":"U-MEMORY-DEDUP-SESSION: add small JSON cache (.claude/cache/injected-this-session.json) keyed by (sessionId, memoryHash); skip injection on hit; clear at SessionStart."}
- [knowledge-memory] {"id":"G9","severity":"MED","claim":"23 Tribal* engines + 57 Knowledge* engines + 80 Learning* engines = 160 overlapping engines in this domain — high duplication risk. e.g. CAMTribalKnowledgeEngine vs MillTribalKnowledgeEngine vs WEDMTribalRuntimeEngine vs TribalKnowledgeEngine (parent). No clear inheritance hierarchy visible.","fix":"U-TRIBAL-CONSOLIDATION-AUDIT: run /dedup against Tribal* + Knowledge* + Learning* prefixes; build inheritance map; mark mergeable wrappers WIRE-EXEMPT or merge into base engines."}
- [knowledge-memory] {"id":"G10","severity":"LOW","claim":"wiki/index.md last_verified is 2026-05-08 but engine source files keep landing daily — stale-by-construction. No cron re-runs the bootstrap.","fix":"U-WIKI-CRON: cron entry that runs wiki-bootstrap.mjs nightly + on every commit that adds an *Engine.ts file (post-commit hook)."}
- [mill] MillingForceEngine is a 15-line stub but millDispatcher routes 'physics' bucket to it and 533-line test file pretends it implements Kienzle/deflection/chatter/power
- [mill] MillScientificPipelineEngine is a 14-line stub wired as the millDispatcher 'scientific' bucket — mill_scientific_analyze / mill_scientific_optimize / mill_uncertainty_quantify all hit the stub
- [mill] ChatterPredictionEngine, ChatterStabilityLobeEngine, ChatterNeuralClassifierEngine all implement variants of Altintas-Budak SLD with no canonical routing — millDispatcher chatter actions point to MillingForceEngine.predictChatter (stub)
- [mill] No standalone calc-dispatcher test asserting which mill physics action goes to which engine — hard to detect when stubs leak
- [mill] DeflectionOverlayEngine + SLDOverlayEngine are real-time visualization frames but no live websocket/streaming consumer in millDispatcher actions
- [mill] ThermalSimEngine (286L), ThermalGrowthCompensationEngine (270L), ThermalCompensationModelEngine (214L) overlap with ThermalWearCouplingEngine — millDispatcher 'thermal' bucket only points to one (ThermalWearCoupling)
- [mill] MILL-MASTER v13 roadmap lives in mcp-server/data/milestones/MILL-MASTER.json (79 phases, 900 units) but no published index of phase->dispatcher-action ownership exists; chats cannot trace which units actually ship a backend surface
- [mill] MillingPhysicsKernelEngine is 1924 lines (largest in the mill family) but only referenced by 2 consumers (calcDispatcher mill_physics_force/tool_life and ChatterPredictionEngine reverse), no contract tests on its public surface
- [mill] MillingForceEngine.test.ts (565 lines) imports MillingForceEngine class + named types — class doesn't exist on stub; either tests are skipped or build aliases another file
- [physics-safety] No physics-literal lint hook prevents inline Kienzle/Taylor/material constant duplication
- [physics-safety] No PreEmit gate on G-code dispatchers enforcing omega-thresholds.json tier
- [physics-safety] schemaVersion + migration path missing on omega-thresholds.json
- [physics-safety] No physics-consistency CI test asserting all engines reading kc1.1 / mc resolve to canonical values

## CONFLICT (8)
- [cad-ingest] Two ingest engines with near-identical names and overlapping intent
- [cad-ingest] WIRE-EXEMPT tag on CADCorpusIngestionEngine claims dispatcher integration is deferred 'until BlueprintVisionOCREngine hook is restored after the peer-chat revert resolves'.
- [mill] Triple chatter implementation, no canonical entry
- [mill] millDispatcher 'physics' bucket vs calcDispatcher mill_force_calculate
- [mill] Thermal engines proliferation — 8 thermal* engines, only ThermalWearCouplingEngine routed
- [mill] Mill skills bifurcated between project .claude and global ~/.claude — different sets, drifting
- [physics-safety] Inline ISO-S Kienzle mc value drifts from canonical
- [physics-safety] Nine Safety* engines with overlapping responsibilities

## DEAD_CODE (7)
- [cad-ingest] name-only suspicion (mock layer) — verify it's still referenced by tests before delete
- [cad-ingest] name-only suspicion (mock layer paired with HyperCADSAutomationEngine) — verify before delete
- [cad-ingest] name-only suspicion (unusual 'InCAD' naming, possible typo of 'In-CAD' adapter) — verify scope
- [mill] 15-line stub, // WIRE-EXEMPT, returns {ok:false,stub:true}; the 'real engine never existed on any branch' per its own comment. Either implement or remove the dispatcher reference.
- [mill] 14-line stub, same pattern as above; satisfies dispatcher type only.
- [mill] Likely duplicate of JMDieMillProgramHarvesterEngine (suffix-only differ); needs one to be removed. Pre-existing dup pattern caught by duplicationGuardEngine if it ever ran.
- [mill] 565 lines testing methods that don't exist on the stub. Either test file is skipped (false-green CI) or there's a hidden alias. Audit and either delete or restore the engine.

## OPPORTUNITY (41)
- [cad-ingest] Wire CADPhysicsConsistencyGateEngine.validate() as a post-parse hook in CADCorpusIngesterEngine.ingestOne() — rejects unmanufacturable geometry from training corpus with S(x) score recorded as provenance.
- [cad-ingest] Build a single CADIngestFacadeEngine that fans out to (a) Ingester for training, (b) Ingestion for retrieval, (c) BlueprintProgramJoinEngine for print↔program, (d) UniversalCADIndexEngine for search index — single filesystem walk feeds all four downstream consumers.
- [cad-ingest] Port phase8-tiered-blueprint-classifier into a TS MultiPagePDFExtractEngine so the 4.5%/page recovery rate cited in the Docustrata memory becomes a first-class engine and feeds BlueprintProgramJoinEngine directly instead of via JSONL hand-off.
- [cam-bridges] Wire all 31 unwired CAM engines in single sweep (BUILD_STATE-driven)
- [cam-bridges] PostProcessor consolidation — fold 53 engines into 1 MasterPostProcessor + 9 vendor strategies (Strategy pattern)
- [cam-bridges] Carve camDispatcher.ts (17,936 lines) into per-vendor dispatchers
- [cam-bridges] CATIA engine build-out — 0 engines, 24 actions, 2 skills
- [cam-bridges] Esprit + Inventor HSM skill catalog parity
- [cam-bridges] Cross-CAM AI orchestration parity
- [cam-bridges] Third-party CAM bridge consolidation (Cimatron, WorkNC, Tebis, BobCAD)
- [cam-bridges] Post-processor cross-cutting test harness
- [edm] Sinker EDM second-pillar buildout — 30% of WEDM depth
- [edm] Unify dispatcher routing — single source of truth for EDM action discovery
- [edm] Sodick/Makino/Agie tribal corpus harvest
- [edm] Online ML deployment bridge — close the train→serve gap
- [edm] EDM real-time pulse telemetry consumer
- [edm] Cross-domain analogy: WEDM safety-gate template → other processes
- [edm] Move sinker physics constants into sinker-constants.ts
- [edm] Micro-EDM scope decision — flesh out or deprecate
- [edm] WEDM-corpus → sinker-corpus knowledge transfer
- [edm] Document the autonomy-tier policy mapping
- [knowledge-memory] {"id":"O1","rank":1,"claim":"Docustrata phase-8 run is the single highest-leverage knowledge-acquisition pull: ~5,400 new prints from already-on-disk PDFs, zero new infra, vision-LLM tier already exis
- [knowledge-memory] {"id":"O2","rank":2,"claim":"Customer-tagged tribal tips unlock per-customer recall — JM Die has 118 lathe customers + ITW/Alcoa/Optimas/SFS/Holo-Krome/FONTANA/ATF visible in CNC LATHE. A per-customer
- [knowledge-memory] {"id":"O3","rank":3,"claim":"Wiki entries auto-published into RGS forge phases — every new engine commit → wiki entry → indexed → next forge run can /forge-triple against existing knowledge instead of
- [knowledge-memory] {"id":"O4","rank":4,"claim":"OBSIDIAN_VAULT real-vault mount unblocks the human-touchable second brain (the user can read + edit memories in the actual Obsidian app). Currently the vault is read-only 
- [knowledge-memory] {"id":"O5","rank":5,"claim":"Tribal-tip → wiki promotion path: when a tip is referenced N>=3 times, auto-promote to wiki/code-tribal/ as a versioned entry. Compounds shop-floor wisdom into permanent r
- [knowledge-memory] {"id":"O6","rank":6,"claim":"Vault wiki-link compounding (rule 4) — backfilling [[links]] across 191 memories via Ollama is a one-time batch that creates a free graph of inter-memory associations.","l
- [knowledge-memory] {"id":"O7","rank":7,"claim":"Per-process tribal tip extraction from JM Die programs (24,545 files) — current 4,245 tips are mostly auto-ingested generic CAM hints. JM Die programs are ground truth for
- [knowledge-memory] {"id":"O9","rank":9,"claim":"Memory injection dedup (rule 5 fix) saves measurable Claude tokens at zero functionality cost — straightforward hook patch with high session-level frequency.","leverage":"
- [knowledge-memory] {"id":"O10","rank":10,"claim":"/wiki-morning daily cron: digest yesterday's commits + memories + tribal tips, summarize via Ollama, append to wiki/log.md — auto-curated audit trail.","leverage":"low-m
- [mill] Wire SLDOverlayEngine + DeflectionOverlayEngine as live mill_overlay_stream action — both engines exist, only need a websocket/SSE adapter
- [mill] Replace MillingForceEngine + MillScientificPipelineEngine stubs with thin facades over MillingPhysicsKernelEngine (already 1924L of canonical physics)
- [mill] Build mill_recipe_optimize action chaining mill_force → mill_chatter → mill_thermal → mill_deflection in a single dispatcher call (currently 4 round-trips)
- [mill] JM Die mill program harvest already has 2 engines (JMDieMillProgramHarvestEngine, JMDieMillProgramHarvesterEngine — note the duplicate 'er' suffix) — wire to MillPatternMinerEngine for a learning loop
- [mill] MillTribalKnowledgeEngine + MillTribalIntegrationEngine wired separately — combine into one tribal endpoint with mill-specific filters
- [mill] MillNeuralNetworkEngine (747L) + MillStrategyNeuralEngine (270L) + MillComprehensiveNeuralEngine + ChatterNeuralClassifierEngine + MillingNeuralCognitiveEngine — 5 mill neural engines, candidate for unified MillNeuralRouterEngine
- [mill] MillDeepLearningEngine + MillingDeepReasoningEngine + MillingDeepIntegrationEngine + MillingDeepKnowledgeSynthesisEngine — 4 'Deep' engines, no shared interface
- [mill] MILL-MASTER v13 has 79 phases; build phase-to-dispatcher-action contract that the BUILD_STATE snapshot can verify per phase
- [physics-safety] Reuse duplication-hard-block.mjs pattern as physics-literal-lint hook
- [physics-safety] OmegaGate as PreEmit on G-code dispatchers unlocks the documented five-sigma claim
- [physics-safety] Wikify the canonical Kienzle table (already in constants.ts) into knowledge/wiki/concepts/kienzle-iso-groups.md so engines reference [[wiki-link]] rather than file path
