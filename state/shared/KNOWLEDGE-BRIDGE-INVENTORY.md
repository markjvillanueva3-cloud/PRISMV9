# KNOWLEDGE BRIDGE INVENTORY (Section 0.75)

Generated: 2026-05-02 — silent-rot detection audit for H:/last.md §0.75.

## (A) INGESTION INVENTORY

### Pipeline 1 — PDF Learn (vendor catalogs)
- **Status**: ACTIVE
- **Actions**: `prism_dev:pdf_pipeline_classify|extract|read|summary`
- **Scripts**: 27 vendor extractors (`extract-iscar-tools.py`, `extract-kennametal-{milling,turning,threading,holemaking}.py`, `extract-sandvik-tools.py`, `extract-tungaloy-{holders,endmills,drills,turning,tooling}.py`, `extract-osg-tools.py`, `extract-yg1.py`, `extract-widia-2022{,-rotating}.py`, `extract-seco-tools.py`, `extract-korloy-catalogs.py`, `extract-haimer-holders.py`, `extract-ingersoll.py`, `extract-camfix.py`, `extract-accupro.py`, `extract-ampc.py`, `extract-iso286-extended.py`, `extract-guhring-tools.py`, `extract-hypermill-{materials,speedfeed}.py`, `extract-generic-catalog.py`, `extract-remaining-catalogs.py`)
- **Last run**: 2026-04-24 (most recent doc-* timestamp); 49 of 63 extractions since 2026-04-20
- **Documents processed**: 63 extraction records, 7,250 tribal tips
- **Documents pending**: hyperMILL Manual Vol 1 only partial; SQL Tool DB returned 0 (no manufacturing content)
- **Schedule**: Manual / on-demand (no cron found)
- **Embedding target**: `H:/prism/cad-engine/knowledge_store/doc-*.json` (56 files)
- **Destination registry**: `mcp-server/data/state/extraction-log.json` (schemaVersion 1.0.0); `extraction-ingestion-state.json` (12 files, 2,428 items, last 2026-04-13)

### Pipeline 2 — hyperMILL Comprehensive (in-process knowledge graph)
- **Status**: ACTIVE
- **Source**: `data/extracted-knowledge/hypermill/{deep-extraction, tips, atoms, knowledge-graph, tribal-tips}-{ts}.json`
- **Output counts**: 434 tribal tips (`hypermill-tribal-comprehensive`), API/property reference, workflows
- **Last run**: 2026-04-15 (followed by Apr 24 vol-1/2/3 manual extraction)

### Pipeline 3 — Video Learn (27-session YouTube CAM roadmap)
- **Status**: NOT STARTED (per memory) — confirmed: NO `extract-mit-courses.ts` data products; no video knowledge files in `cad-engine/knowledge_store/`
- **Skill**: `/video-learn` exists; engines `VideoKnowledgeIntegrationEngine`, `PostProcessorVideoKnowledgeNeuralEngine` exist
- **Documents processed**: 1 (Titans of CNC, 42 procedures, 2026-04-05) — all video-tagged tips were SOURCE-attributed not transcript-derived
- **Documents pending**: 26+ planned sessions
- **Schedule**: None
- **Embedding target**: Engine has no destination registry wired

### Pipeline 4 — JM Die Programs (corpus indexer)
- **Status**: COMPLETE-ish
- **Source**: `H:/PRISM/JM DIE/**`
- **Documents processed**: 24,545 programs indexed (2026-04-14)
- **Type**: program-analysis (NOT tribal tip extraction — different bucket)
- **Destination**: `JMDieProgramRAGEngine` index

### Pipeline 5 — JM Die CAD Corpus (CADCorpusIngesterEngine)
- **Status**: ENGINE_READY_AWAITING_BINARY_PARSER (synthetic only)
- **Source**: `H:/PRISM/JM DIE/**/*.{step,stp,iges,igs,sldprt,ipt,x_t,x_b}`
- **Tips generated**: 0 (binary STEP/IGES parsing deferred to U-DAGI04)
- **Schedule**: Blocked

### Pipeline 6 — Manual Tribal Authoring
- **Status**: UNCLEAR — no dedicated registry file (`tribal*.json`, `playbook*.json` glob = 0 hits in `data/registries/` or `data/state/`)
- **Engines**: `TribalKnowledgeEngine` reads `cad-engine/knowledge_store/` at runtime; no separate manual store

### Summary — Pipeline Health
- **Active**: 4 (PDF Learn, hyperMILL, JM Die programs, manual auth via cad-engine store)
- **Stale**: 1 (extraction-ingestion-state.json last write 2026-04-13)
- **Dead**: 2 (Video Learn never started; JM Die CAD Corpus blocked on binary parser)

---

## (B) CONSUMER INVENTORY

```yaml
- consumer_id: SpeedFeedOrchestratorEngine (SFC central)
  consumer_type: engine
  retrieves_from: [tribal]
  retrieval_method: tribal_search (line 3163: tribalKnowledgeEngine.search)
  query_pattern: per_call
  injected_into: recommendation (result.tribal_tips field)
  evidence_of_use: source_inspection + 38 tribal references in file
  bridge_health: active

- consumer_id: AutoSpeedFeedEngine
  consumer_type: engine
  retrieves_from: [playbook]
  retrieval_method: playbook_query (line 703 _collectPlaybookWarnings)
  query_pattern: per_call
  injected_into: recommendation (playbook_warnings field)
  evidence_of_use: source_inspection
  bridge_health: active (playbook only — NO tribal)

- consumer_id: PostProcessorPipelineEngine (38-stage post)
  consumer_type: engine
  retrieves_from: [playbook, tribal]
  retrieval_method: stages 5.2_playbook_rules + 5.3_tribal_knowledge (gated by stageFlags)
  query_pattern: per_call (stage-conditional)
  injected_into: pipeline stage data
  evidence_of_use: source_inspection (stages 3211, 3236)
  bridge_health: active

- consumer_id: MillingAGIMasterEngine
  consumer_type: engine
  retrieves_from: [tribal] (claimed in narrative only)
  retrieval_method: NONE — only references "tribal_sources" as schema field/string label
  query_pattern: never (no tribalKnowledgeEngine import)
  injected_into: tribal_sources string array in result (always empty)
  evidence_of_use: NEGATIVE source_inspection — narrative claim, no actual call
  bridge_health: BROKEN (claims tribal consult but never invokes)

- consumer_id: AutoPrintToProgramBridgeEngine
  consumer_type: engine
  retrieves_from: []
  retrieval_method: NONE
  query_pattern: never
  injected_into: unused
  evidence_of_use: NEGATIVE source_inspection — 0 hits for tribal/playbook/cam_rag/TribalKnowledge
  bridge_health: never_wired

- consumer_id: LatheAGIKnowledgeUnificationEngine
  consumer_type: engine
  retrieves_from: []
  retrieval_method: NONE
  query_pattern: never
  injected_into: unused
  evidence_of_use: NEGATIVE source_inspection — 0 hits despite name
  bridge_health: BROKEN (named "Knowledge Unification" but ingests no tribal/playbook)

- consumer_id: WEDMNeuralFormulaFusionEngine
  consumer_type: engine
  retrieves_from: []
  retrieval_method: NONE
  query_pattern: never
  injected_into: unused
  evidence_of_use: NEGATIVE source_inspection — 0 hits
  bridge_health: never_wired

- consumer_id: CADDrawingKnowledgeEngine
  consumer_type: engine
  retrieves_from: []
  retrieval_method: NONE
  query_pattern: never
  injected_into: unused
  evidence_of_use: NEGATIVE source_inspection — 0 hits despite "Knowledge" in name
  bridge_health: BROKEN (knowledge engine that consumes no tribal/playbook)

- consumer_id: cam_strategy_recommend (dispatcher action)
  consumer_type: dispatcher_action
  retrieves_from: [hypermill_strategy_only]
  retrieval_method: NONE for tribal — calls HyperMillStrategyEngine.recommend + safety check ONLY
  query_pattern: never (for tribal)
  injected_into: unused
  evidence_of_use: source_inspection (camDispatcher.ts line 2024-2034)
  bridge_health: never_wired (does NOT consult cam_tribal_lookup despite both actions existing)

- consumer_id: post_line_by_line (dispatcher action)
  consumer_type: dispatcher_action
  retrieves_from: []
  retrieval_method: NONE — eng.optimize(params) only
  query_pattern: never
  injected_into: unused
  evidence_of_use: source_inspection (line 8594)
  bridge_health: never_wired

- consumer_id: dfm_check (dispatcher action)
  consumer_type: dispatcher_action
  retrieves_from: []
  retrieval_method: NONE — dfm.checkDfMRules(params) only
  query_pattern: never
  injected_into: unused
  evidence_of_use: source_inspection (line 258)
  bridge_health: never_wired

- consumer_id: ai_milling_deep_reason (dispatcher action)
  consumer_type: dispatcher_action
  retrieves_from: [tribal claimed]
  retrieval_method: claims evidence retrieval but live test returned "Found 0 relevant evidence items. Sources: ."
  query_pattern: per_call (broken)
  injected_into: reasoning_chain step 2 (always 0 evidence)
  evidence_of_use: live test FAILED to return citations
  bridge_health: BROKEN (bridge fires but returns empty — index miss or wrong store)

- consumer_id: CAMTribalRAGEngine
  consumer_type: engine
  retrieves_from: [tribal index]
  retrieval_method: cam_rag_retrieve (camDispatcher 2622-2637)
  query_pattern: per_call
  injected_into: optional, on-demand
  evidence_of_use: source_inspection + unit tests
  bridge_health: active (but consumers don't call it — 5 file matches, none from program-gen pipeline)

- consumer_id: TribalRAGEngine
  consumer_type: engine
  retrieves_from: [tribal index]
  retrieval_method: rag_retrieve
  query_pattern: per_call
  injected_into: optional, on-demand
  evidence_of_use: source_inspection
  bridge_health: stale (engine exists, callers minimal)

- consumer_id: cam_tribal_lookup (dispatcher action)
  consumer_type: dispatcher_action
  retrieves_from: [tribal]
  retrieval_method: explicit
  query_pattern: per_call
  injected_into: caller-controlled
  evidence_of_use: dispatcher line 1782
  bridge_health: active (action exists, callers must opt in)
```

### Consumer Health Counts
- **Active**: 5 (SFC, AutoSpeedFeed, PostPipeline, CAMTribalRAG, cam_tribal_lookup action)
- **Stale**: 1 (TribalRAGEngine — wired but rarely called)
- **Broken**: 4 (MillingAGIMaster, LatheAGIKnowledgeUnification, CADDrawingKnowledge, ai_milling_deep_reason — names/narrative claim consumption, code doesn't invoke or returns empty)
- **Never-wired**: 5 (AutoPrintToProgramBridge, WEDMNeuralFormulaFusion, cam_strategy_recommend, post_line_by_line, dfm_check)

---

## (C) BRIDGE HEALTH AT A GLANCE
| Consumer category | Count | Notes |
|---|---|---|
| Active tribal+playbook consumers | 3 | SFC, AutoSpeedFeed (playbook only), PostPipeline (gated) |
| Active RAG-only engines | 2 | CAMTribalRAGEngine, TribalRAGEngine (low call volume) |
| Broken (claims-no-call) | 4 | High silent-rot risk |
| Never-wired program generators | 5 | Including the headline `cam_strategy_recommend` |
