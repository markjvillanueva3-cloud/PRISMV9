# India-AI Orphan-Wire Queue (bravo cross-galaxy, 2026-06-11, wf_4ebeaa0f-2cc)

"link in with india galaxy and do it for india" -- the SFC-style orphan-wire treatment applied to
india's AI-systems galaxy. India's own survey (`AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md` /
`INDIA-CONTEXT-LEDGER.md`) is exhaustive on the NN-GRAPH deploy gate + LoRA training but **never
surveyed dispatcher REACHABILITY** of india's AI engines -- so this axis is orthogonal + non-duplicative
to india's GPU/label-gated backlog.

**Recon:** an ultracode **sonnet** fan-out (Workflow `wf_4ebeaa0f-2cc`, 21 agents, 757K sonnet tok --
mechanical classify routed to sonnet per the fallback ladder [[feedback_ollama_fallback_sonnet_agents]],
NOT Opus) classified all 21 dispatcher-DARK AI-net engines. Full output:
`C:/Users/.../tasks/wg05n04kk.output` (in the workflow transcript dir).

**R12 INVARIANT (carried from the SFC sweep):** expose deterministic DATA / stats / readiness /
provenance ONLY -- NEVER trained-model NN inference (india keeps inference gated until trained). Every
wired action is a pure read / pure-math surface.

## SHIPPED (bravo, prism_ai / aiReasoningDispatcher, INDIA_AI_ORPHAN group)
- **#1 KnowledgeLineageEngine -- SHIPPED `f7ae1ac016`** (7/7, 2-agent PASS). `knowledge_lineage_report`
  (getLineageReport, atomId-guarded) + `knowledge_lineage_stats` (getStats) + `knowledge_lineage_pending_conflicts`
  (getPendingConflicts). Pure read-only provenance graph.
- **#2 LocalEmbeddingEngine -- SHIPPED `894be27d1f`** (7/7, 2-agent PASS). `local_embedding_status`
  (isLoaded+getModel) + `local_embedding_similarity` (cosineSimilarity, all 3 throw-conditions guarded +
  finite-number guard vs silent NaN). embed() NOT surfaced (lazy-loads ~90MB ONNX -> would put inference
  on the wire).

## CLOSED 2026-06-29 (slot:india): ALL 6 "REMAINING" UNITS SHIPPED + TESTED -- do NOT re-wire
> STALE-DOC CORRECTION (R12, verified in-code 2026-06-29, NOT from this doc's title). Every "remaining"
> unit below (3 IntentClassifier, 4 PolicyExperienceLedger, 5 TemporalReasoning, 6 RealTimeAnomalyDetection,
> 7 KnowledgeIngestion) -- PLUS a later Unit 8 `blueprint_loop_drain` -- is now WIRED into the
> `INDIA_AI_ORPHAN` group (actions `aiReasoningDispatcher.ts:307-358`, schemas `:360-379`, case handlers
> `:4904-5076`) AND covered by dispatcher round-trip tests (`src/__tests__/ai-dispatcher-ledger-wire.test.ts:238-509`:
> `U-WIRE-INTENT` + `U-WIRE-DATA-ENGINES`, happy + input-guard + adversarial NaN/oversize paths; disk-backed
> singletons monkeypatched). The R12 DATA-only invariant held (no NN inference wired). This axis -- india
> AI-engine dispatcher REACHABILITY -- is DONE. The list below is HISTORICAL. (Lesson: a single empty grep
> nearly led to a duplicate build twice this session; reading the dispatcher + test file in full settled it
> -- "never claim absence/presence without a deep search.")

## REMAINING WIRE_SAFE_DATA (HISTORICAL -- all shipped, see CLOSED banner above; original notes preserved)
3. **IntentClassifierEngine** (conf 0.97, export `intentClassifierEngine` + class) -- pure regex/keyword
   classifier (CATEGORY_PATTERNS/ENTITY_PATTERNS/TIER_ESCALATION_KEYWORDS; no NN). Header documents a pending
   `U-INTENT-WIRE` for `prism_session:classify_intent`. Proposed: `classify_intent` (classify) +
   `quick_classify_intent` (quickClassify) + `extract_intent_entities` (extractEntities). HIGH value (PUOA tier routing).
4. **PolicyExperienceLedgerEngine** (0.97, singleton) -- RL (s,a,r,s') experience JSONL ledger. Consumers
   (IQLEngine/MaxEntIRL/OfflineRLOrchestrator) are themselves dispatcher-dark. Proposed: `policy_experience_stats`
   (stats) + `policy_experience_query` (query). `append` is a write -- wire read-only first.
5. **TransferLearningAdapterEngine** (0.93, singleton) -- `getStatistics`/`getTasks`/`computeDomainSimilarity`
   are DATA/deterministic; `adapt()` is the NN sim -> MUST stay gated. Proposed: stats + tasks + domain_similarity.
6. **TemporalReasoningEngine** (0.93, singleton+class) -- snapshots/project/forecast = deterministic
   linear-regression over a stored timeline ledger. The one consumer instantiates a LOCAL copy, so the
   singleton is dark. Proposed: `temporal_snapshots` + `temporal_project` + `temporal_forecast`.
7. **RealTimeAnomalyDetectionEngine** (0.93, singleton) -- `detect()` = 5 deterministic statistical
   detectors (CUSUM/EWMA/Mahalanobis/FFT/Wavelet); no trained model. Sole consumer (OperatorDashboardOrchestrator)
   is dispatcher-dark. Proposed: `detect_cutting_anomalies` (process-health, monitoring not control).
8. **KnowledgeIngestionOrchestratorEngine** (0.97, singleton) -- `getStats`/`getPending` read-safe;
   `discoverResources`/`runPipeline` do disk I/O (side-effects -> wire reads first). Header documents a pending
   `prism_knowledge:U-KNOWLEDGE-INGEST-WIRE`. NOTE: verify `prism_knowledge` dispatcher EXISTS before routing there;
   else use prism_ai INDIA_AI_ORPHAN group like #1/#2.

## EXEMPT / NOT-WIRED (7 -- correctly excluded by the fan-out)
- **ConsensusModelPerformanceEngine -- NO_SAFE_SURFACE**: a build-unblock STUB (methods throw). bravo soul
  refuses stub-wiring. Do NOT wire until the real implementation lands.
- **PRISMLoRAAdapterEngine -- REACHABLE_EXEMPT**: rich DATA surface but both consumers (IncrementalLearning ->
  orchestrationDispatcher, MachiningIntelligence -> camDispatcher) are dispatcher-wired -> already reachable.
- **TribalKnowledgeTrainingEngine -- REACHABLE_EXEMPT**: consumed by PRISMNeuralKnowledgeSynthesis (orchestrationDispatcher-wired).
- **FusionDeepLearningEngine -- REACHABLE_EXEMPT + cad-fusion domain** (not india-core; reachable via FusionAIOrchestration -> camDispatcher).
- **SFCRAGWarmStartEngine -- MIDDLEWARE_EXEMPT**: driven in-process by the (now-wired) SFC Ranker.
- **SFCInferenceGateWireEngine -- MIDDLEWARE_EXEMPT** (RESOLVES bravo's open #6): in-process middleware in the
  chain UltimateSpeedFeed -> SFCInferenceGateWire -> SFCProvenanceWire; NEVER dispatcher-wired. The india memory
  [[reference_sfc_inference_gate_wire_la1_2026_06_01]] claiming it's wired via `ultimate_speed_feed` is STALE/unmerged.
- **PPGInferenceGateWire / PPValidatorAGIWiring / PPGRAGDialectMatch -- middleware / cam-strategy** (other domain).

## Wire pattern (proven, KnowledgeLineage f7ae1ac016 + LocalEmbedding 894be27d1f)
Add action name(s) to `INDIA_AI_ORPHAN_ACTIONS` (aiReasoningDispatcher) + matching `INDIA_AI_ORPHAN_SCHEMAS`
(permissive `z.record` -- the case owns validation) + the `AIAction` union already spreads it; add `case`
before `default`. Result wraps as `{success:true, data: slimResponse(result)}` (payload under `.data`,
empty arrays stripped). Test via the `ai-dispatcher-ledger-wire.test.ts` harness (`createServer`/`call`),
concrete value assertions (the legitimacy gate blocks `.toBeUndefined()`-empty-parens; use `.toBe(undefined)`).
For disk-backed singletons monkeypatch the persist method -> no-op + restore (zero pollution). Commit
`[MAIN][BOOTSTRAP-SLOT-ENFORCE] [INDIA-AI-ORPHAN-WIRE]/U-...` via `-F msgfile`.

## Coordinate: india owns AI-systems; bravo galaxy_access:all-galaxies (chat-bus posted). Do NOT collide.
