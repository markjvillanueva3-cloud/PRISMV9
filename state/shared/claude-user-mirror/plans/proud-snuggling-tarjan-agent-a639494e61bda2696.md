# PRISM INFRA Roadmap — 5-Role Scrutiny Review

## Context
- Roadmap: 10 phases, 13 sessions, 32 units
- Core stack: Postgres + Redis (single instance), in-memory fallback preserved
- Phases 1-10: migrations, pgvector, auth, BullMQ/Streams, calibration, OTel, OpenAPI, Docker/K8s, ONNX, KG
- **Key files analyzed:**
  - schema.sql (lines 1-225): audit_log, users, api_keys, materials, safety_scores
  - CAMPluginSDKEngine.ts (692 lines): 5 SDK actions, inline Kienzle/Taylor tables
  - realtime.ts (106 lines): SSE + WebSocket + event bridge routing
  - vitest.config.ts: test harness (4 threads, no isolation, 30s timeout)

---

## ROLE 11: TESTING/QA ENGINEER

### Review Questions
1. How do you test the migration runner (Phase 1)?
2. How do you test Redis-backed auth without Redis?
3. Are there integration test fixtures for Postgres?
4. How do you test the feedback loop end-to-end (Phase 5)?
5. What about load testing semantic search with 95K embeddings (Phase 2)?
6. Test isolation between BullMQ workers (Phase 4)?

### Key Findings

#### CRITICAL Issues
1. **No test/integration fixtures discovered for Postgres migrations**
   - Phase 1: "migration runner, PersistenceBridge hardening" — but no migration fixtures found
   - grep -r "migration" in __tests__/ yields only schema references, no actual migration runner tests
   - Risk: Postgres migrations could fail silently in production; no rollback validation
   - Recommendation: Create fixtures for schema versioning, rollback, and idempotency

2. **No fixture pattern for Redis-less auth testing**
   - Phase 3 requires Redis-backed auth + tier enforcement
   - Current auth (schema.sql lines 14-36: users, api_keys) is Postgres-only
   - No found mocks/stubs for Redis in test suite
   - Risk: Auth tests will require live Redis or fail; CI/CD cannot run auth tests without Redis
   - Recommendation: Create Redis mock (ioredis-mock or node-mock-redis) for unit tests

3. **Vitest config has no test isolation between workers**
   - vitest.config.ts line 12: `isolate: false` — tests share module state
   - This works for read-only registries but FAILS for:
     - Database tests (shared connection pools leak state)
     - Redis tests (shared client leaks keys between tests)
     - BullMQ tests (shared queues cross-contaminate)
   - Risk: Test suite may pass in isolation but fail when run in parallel
   - Recommendation: Enable `isolate: true` for any Phase 3-4 (auth, BullMQ) tests

#### HIGH Issues
4. **No load testing harness for semantic search (95K embeddings in Phase 2)**
   - CAMPluginSDKEngine has no benchmarks; verifest runs at 30s timeout
   - Embedding dimension, query latency targets, re-ranking strategy all undefined
   - Risk: Semantic search could be O(n) without index; 95K queries would exceed target SLA
   - Recommendation: Add perf-benchmark.test.ts suite with: pgvector indexing tests, 95K embedding load scenario, latency assertions (target <200ms @ p95)

5. **No end-to-end test for feedback loop wiring (Phase 5: SpeedFeedOrchestrator)**
   - Phase 5: "Wire calibration → SpeedFeedOrchestrator feedback loop"
   - Currently: SpeedFeedOrchestratorEngine (2,851 lines) exists but no integration test
   - Risk: Feedback loop could break on schema changes; no regression detection
   - Recommendation: Create integration test: draw → parse → optimize → measure → compare to baseline

6. **BullMQ worker test isolation undefined**
   - Phase 4: BullMQ job queue + Redis Streams event bus
   - No BullMQ test fixtures found; vitest config doesn't isolate Redis state
   - Risk: Test jobs leak into shared queue; concurrency bugs invisible
   - Recommendation: Create BullMQ test harness with isolated queue instances per test, job cleanup on teardown

#### MEDIUM Issues
7. **CAMPluginSDKEngine test coverage sparse**
   - Engine has 5 actions (sdk_optimize_sf, sdk_check_safety, sdk_suggest_tool, sdk_get_tip, sdk_batch)
   - No unit tests found; confidence based on inline Kienzle/Taylor tables (not validated against constants.ts)
   - Risk: SDK could diverge from canonical constants; CAM integrations fail silently
   - Recommendation: Add test suite checking: inline constants match src/physics/constants.ts, batch timeout <50ms, safety checks cover all 6 rules

8. **Migration runner interface not defined**
   - Phase 1 mentions "migration runner" but schema.sql only shows CREATE TABLE statements
   - No migration/versioning system evident (no migration_history table, no version tracking)
   - Risk: Cannot track which migrations have run; cannot rollback safely
   - Recommendation: Design migration metadata table (id, name, applied_at, checksum) before Phase 1 ships

---

### ROLE 11 Score: **58 / 100**

**Summary:** Test infrastructure is adequate for read-only calculations but critically underspecified for stateful infrastructure (Postgres, Redis, BullMQ). The roadmap assumes tests exist for Phase 1 (migrations) and Phase 3-4 (state management) but none are observable. Vitest config is optimized for speed (no isolation) but unsuitable for stateful tests. Load testing for semantic search is absent.

**Top Blockers:**
1. Design and implement migration runner + test fixtures before Phase 1 ships
2. Create Redis/Postgres mocks + fixtures for Phase 3 auth tests
3. Enable test isolation and implement BullMQ/Streams test harness for Phase 4
4. Add load test suite for Phase 2 semantic search

---

## ROLE 12: MACHINE LEARNING ENGINEER

### Review Questions
1. Which embedding model for semantic search (Phase 2)?
2. Is ONNX Runtime in Node.js production-ready?
3. What models would be trained (Phase 9)?
4. Where does training happen (not in MCP server)?
5. Model update/deployment workflow?
6. Is a feature store in Postgres sufficient for ML workloads?
7. Should you consider MLflow or similar?

### Key Findings

#### CRITICAL Issues
1. **Phase 9 ONNX plan lacks model specification**
   - "ONNX model serving" and "feature store" mentioned but no model catalog
   - Questions unanswered: Which models? Inference on what tasks?
   - Candidates: tool wear prediction, chatter detection, force estimation, tool life — but not stated
   - Risk: Phase 9 could ship with untrained stub models or no models at all
   - Recommendation: Document Phase 9 model portfolio before roadmap approval:
     - Model 1: Tool wear progression (time-series LSTM)
     - Model 2: Chatter stability (classifier on spectral features)
     - Model 3: Force estimation (regressor on feed/speed/DOC)
     - Plus training data source, validation metrics, production inference latency target

2. **ONNX Runtime in Node.js is not production-ready for on-device inference at scale**
   - onnxruntime-node package exists but:
     - Weak documentation for GPU/threading (single-threaded by default)
     - No built-in model versioning; no model cards
     - Inference latency for large models (>100MB) can exceed 200ms
   - Current target (CAMPluginSDKEngine): <50ms for 5 SDK calls
   - Risk: If Phase 9 inference adds 500+ models @ 50ms each, total throughput collapses
   - Recommendation:
     - Benchmark ONNX Runtime on target hardware; set hard latency SLA (e.g., <100ms p95)
     - Consider dedicated ML inference service (FastAPI on Python) separate from Node.js MCP
     - Use model quantization (int8) to reduce latency; accept accuracy trade-off if needed

3. **Feature store in Postgres insufficient for ML pipelines**
   - Phase 9: "feature store in Postgres"
   - Postgres is write-optimized for OLTP, not feature engineering:
     - No built-in feature lineage (which raw data → which feature?)
     - No automatic retraining triggers
     - No A/B testing framework
     - No feature importance tracking
   - Risk: Cannot debug model degradation; feature drift invisible; retraining manual and fragile
   - Recommendation:
     - Use lightweight ML metadata layer on top of Postgres:
       - Feature lineage table: (feature_id, source_table, transform_sql, created_at, model_ids)
       - Model registry table: (model_id, name, version, framework, onnx_path, metrics_json, deployed_at)
       - Prediction log: (prediction_id, model_id, feature_vector_hash, output, timestamp) — for monitoring
     - OR adopt MLflow Tracking (open-source, integrates with Postgres backend)
     - Feature store should answer: "Which raw data produced this feature? Which models use it?"

4. **Model training environment and workflow undefined**
   - Phase 9 says "not in the MCP server" but doesn't specify:
     - Training runs on what? (Python script? Jupyter? Cloud platform?)
     - Data pipeline: How do you extract training data from Postgres?
     - Deployment: How does the trained model (ONNX) get into the MCP server?
     - Retraining: On what trigger? (Monthly? On data drift? On accuracy drop?)
   - Risk: Model becomes stale; no visibility into retraining status
   - Recommendation:
     - Design ML pipeline separate from MCP server:
       1. Daily feature extraction job (SQL → Parquet in S3/local)
       2. Weekly model training (Python script, scikit-learn/PyTorch)
       3. Model validation on holdout test set
       4. Export to ONNX + upload to S3
       5. MCP server polls S3 for new models; hot-loads on version change
     - Document SLAs: retraining latency, model staleness tolerance, fallback behavior

#### HIGH Issues
5. **Embedding model choice unspecified (Phase 2: pgvector + semantic search)**
   - Options:
     - Local (sentence-transformers): 50-300ms latency, 384-1536 dims, no API calls
     - API (OpenAI text-embedding-3): 500ms+ latency (API + network), 1536 dims, $$$ per embedding
   - For 95K tools:
     - Local: ~1-2 hours one-time, then 0 cost; requires GPU for speed
     - API: 95K × $0.02 / 1M = ~$2, but recurring if retraining
   - Risk: Choosing API embedding locks in cost; choosing local requires GPU
   - Recommendation:
     - Use local (sentence-transformers all-mpnet-base-v2 or all-MiniLM-L6-v2)
     - Embedding dimension: 384 (all-MiniLM) or 768 (mpnet) — trade off latency vs recall
     - Storage: pgvector storage for 95K × 384 = ~145MB (manageable in Postgres)
     - Embedding retraining: New tools → batch encode nightly via Python script → INSERT into pgvector table

6. **Model update/deployment workflow absent**
   - "Model update/deployment workflow" = undefined
   - Questions: 
     - How does a retrained ONNX model get into production?
     - Canary testing? Gradual rollout?
     - Fallback if model inference fails?
     - A/B testing (old model vs new)?
   - Risk: Bad model deployed; no way to quickly revert
   - Recommendation:
     - Model versioning: Store model_version in memory; allow toggling between 2 versions at runtime
     - Health check: Monitor prediction accuracy on holdout set; alert if drops >5%
     - Fallback: If ONNX model fails, use cached predictions from previous model version
     - Deployment: Cold-start new MCP server with new model; gradual traffic shift

7. **No labeling/ground truth pipeline for training**
   - To train models (wear, chatter, force), you need labeled data
   - Where does ground truth come from? (user feedback? CNC sensors? Post-mortem analysis?)
   - Risk: No training data = no Phase 9 models
   - Recommendation:
     - Define labeling strategy per model:
       - Tool wear: User reports "tool failed at X minutes" → label training data up to X
       - Chatter: Operator marks "chatter detected" in real-time → label spectral window
       - Force: Compare predicted force (Kienzle) vs actual spindle load (machine API) → auto-label

#### MEDIUM Issues
8. **ONNX Runtime threading and concurrency**
   - onnxruntime-node default: single-threaded
   - MCP server handles concurrent requests; if Phase 9 infers on each request, single-threaded ONNX could bottleneck
   - Risk: If 10 concurrent requests hit ONNX model simultaneously, latency multiplies
   - Recommendation: Use onnx-runtime parallel=true flag; load-test with concurrent inference

9. **MLflow integration not considered**
   - MLflow would provide:
     - Experiment tracking (train/val/test metrics)
     - Model registry (versioning, staging, production)
     - Model serving (MLflow Serve as alternative to ONNX Runtime)
   - Risk: Re-inventing ML infrastructure when MLflow solves it
   - Recommendation: Evaluate MLflow Tracking + Model Registry before Phase 9; if road requires it, dependency on MLflow+Python backend

---

### ROLE 12 Score: **42 / 100**

**Summary:** Phase 9 (ONNX + feature store) is severely underspecified. No model catalog, no training pipeline, no feature lineage, no deployment workflow. Postgres as feature store is weak; ONNX Runtime performance on Node.js untested. Phase 2 (semantic search) embedding model choice deferred. High risk that Phase 9 ships as a stub.

**Top Blockers:**
1. Define Phase 9 model portfolio (3-5 target models) with training data, validation metrics, inference SLAs
2. Design ML pipeline (feature extraction → training → ONNX export → deployment)
3. Add feature lineage + model registry tables to Postgres; consider MLflow
4. Specify embedding model for Phase 2 semantic search (recommend: local sentence-transformers, dimension 384)
5. Benchmark ONNX Runtime inference latency; set SLA and concurrency limits

---

## ROLE 13: REAL-TIME SYSTEMS ENGINEER

### Review Questions
1. Redis Streams consumer groups — exactly-once semantics?
2. OPC-UA → event bridge wiring — what's the data rate from a CNC?
3. Back-pressure handling?
4. Event schema versioning?
5. Dead letter handling?

### Key Findings

#### CRITICAL Issues
1. **Redis Streams consumer groups lack exactly-once semantics guarantee**
   - Phase 4: "Redis Streams event bus"
   - Redis Streams provides at-least-once delivery (ACK required), but:
     - If consumer crashes after processing but before ACK → event reprocessed
     - If event handler is not idempotent → duplicate side effects
   - Current realtime.ts (lines 1-108) uses SSE + WebSocket bridge but NO exactly-once mechanism visible
   - Risk: Duplicate events cause:
     - Duplicate tool change notifications → operator confused
     - Duplicate job progress updates → UI shows wrong % complete
     - Duplicate safety alerts → false alarms
   - Recommendation:
     - Design idempotency: Event must include idempotency_key (UUID)
     - Check table: (idempotency_key, processed_at) — skip if key exists
     - Batch ACK: Process event → save to Postgres → ACK in Redis Streams
     - Or use DLQ pattern: Move failed events to dead letter queue; don't retry in main stream

2. **OPC-UA data rate from typical CNC unspecified; back-pressure handling absent**
   - OPC-UA → event bridge wiring (Phase 5 "wire calibration") but:
     - No data rate estimate: CNC sends 1KB/sec? 1MB/sec?
     - No back-pressure strategy: What if Redis Streams queue grows faster than consumer?
     - No size limits on events or queue
   - Typical CNC machine data:
     - Spindle speed: 10 values/sec × 2 bytes = 20 bytes/sec
     - Tool position: 10 values/sec × 4 bytes = 40 bytes/sec
     - Tool wear: 1 value/sec × 4 bytes = 4 bytes/sec
     - Alarms: variable, ~1KB per alarm
     - **Total: ~100-500 bytes/sec per machine**
   - With 910 machines: 100KB/sec - 500KB/sec peak
   - Risk: If events queue faster than consumer, Redis memory bloats; consumers lag; real-time guarantees break
   - Recommendation:
     - Set Redis Streams MAXLEN (e.g., 10M events max; trim oldest)
     - Monitor queue depth; alert if >1M events (approaching memory limit)
     - Implement consumer group lag tracking; pause OPC-UA ingestion if lag >30s
     - Design circuit breaker: If consumer fails, drop tail of stream; don't buffer infinitely

3. **Event schema versioning not addressed**
   - Phase 4: Redis Streams event bus, but no event schema registry
   - Example risk: OPC-UA adds "tool_temp_celsius" field to machine:status event
     - Old consumers expect 5 fields; new event has 6 fields
     - Old code ignores field → works but loses data
     - New code requires field → crashes on old events
   - Risk: Schema drift → incompatible producers/consumers; real-time system brittleness
   - Recommendation:
     - Create event schema registry:
       - Table: (event_type, version, schema_json, deprecated_at)
       - Example: ("machine:status", 1, {...}, NULL)
       - Example: ("machine:status", 2, {...}, created @ Phase 5)
     - Producers include schema version in event header: {"type": "machine:status", "version": 2, "data": {...}}
     - Consumers declare min/max versions they support; reject incompatible events
     - Versioning strategy: Additive changes (new optional fields) don't need version bump; breaking changes do

4. **Dead letter queue (DLQ) for failed event processing undefined**
   - realtime.ts emit/broadcast logic (lines 70-91) has no error handling:
     ```typescript
     sent = realtimeEventBridge.emit(type, room, eventPayload);
     ```
   - If emit fails (e.g., all consumers down), event is lost silently
   - Risk: Critical safety alerts (tool:change, safety:alert) could be dropped
   - Recommendation:
     - Catch emit errors; move to Redis Streams DLQ
     - DLQ table: (dlq_id, original_stream, event_json, error_reason, created_at, retry_count)
     - Daily job: Retry DLQ events; move to dead-dead letter after 3 retries
     - Alerting: If DLQ depth > 100, page on-call

#### HIGH Issues
5. **No circuit breaker for event producer-consumer feedback loop**
   - Phase 5: "Wire calibration → SpeedFeedOrchestrator feedback loop"
   - Feedback loop: Spindle load → event → SpeedFeedOrchestrator → adjust feed → new event
   - If SpeedFeedOrchestrator crashes, events queue up; operator gets no real-time feedback
   - Risk: Operator thinks machine is fine; actually feed rate frozen
   - Recommendation:
     - Monitor consumer lag; if >10s, disable real-time feedback; alert operator
     - Fallback: Revert to safe defaults (conservative feed rate) until consumer recovers
     - Health check: Consumer must emit heartbeat event every 5s; if not → alert

6. **WebSocket/SSE reliability in realtime.ts**
   - realtime.ts lines 29-64: SSE stream with 25-second keep-alive
   - Risk: Browser proxies/firewalls close idle connections after 60-120s; SSE not reconnecting
   - Risk: If MCP server crashes, SSE clients don't auto-reconnect; operator loses real-time updates
   - Recommendation:
     - Add exponential backoff reconnect logic in client (JS)
     - Server-side: Track SSE client health; heartbeat every 15s (keep-alive already does this)
     - Fallback: If real-time unavailable, client polls HTTP /api/v1/status every 5s
     - Test: Simulate network partition; verify reconnection and no data loss

7. **Event ordering guarantee across distributed consumers**
   - Redis Streams guarantees ordering within a single stream, but:
     - If two events are in two streams (e.g., machine:status + spindle:load), ordering undefined
     - If consumer processes both streams, can process them in wrong order
   - Risk: Spindle load increase processed before speed increase → momentary overload
   - Recommendation:
     - Centralize all real-time events into single Redis Stream (not multiple)
     - Or use event timestamp for ordering: consumer maintains wall-clock ordering

#### MEDIUM Issues
8. **No sampling/rate limiting for high-frequency events**
   - CNC spindle speed event firing 10/sec × 910 machines = 9,100 events/sec peak
   - All 9,100 forwarded to WebSocket clients could overwhelm browsers
   - Risk: Browser memory bloats; UI lags
   - Recommendation:
     - Aggregate high-frequency events: spindle speed every 1sec (instead of 10/sec)
     - Sample low-priority events: sample 10% of "spindle:status" for trending
     - Client-side: Batch updates; redraw UI max 10/sec

9. **No event correlation/tracing ID**
   - If operator triggers a feed adjustment, how do you trace the event through the system?
   - Current events in realtime.ts have no trace ID; can't correlate across components
   - Recommendation:
     - Add trace_id to event envelope: {"type": "...", "trace_id": "uuid", "data": {...}}
     - Log trace_id in all components; enable end-to-end tracing

---

### ROLE 13 Score: **44 / 100**

**Summary:** Real-time event architecture (Phase 4) is under-designed. No exactly-once semantics, no back-pressure handling, no DLQ, no event versioning, no OPC-UA data rate estimates. Phase 5 feedback loop assumes synchronous real-time but lacks circuit breaker. Redis Streams chosen but no operational details (consumer lag monitoring, rebalancing strategy). High risk of event loss, schema drift, and feedback loop instability.

**Top Blockers:**
1. Design exactly-once event processing with idempotency keys + PostgreSQL dedup table
2. Estimate OPC-UA data rate per machine (100-500 bytes/sec); set Redis Streams MAXLEN and back-pressure strategy
3. Implement event schema versioning + registry; design schema evolution rules
4. Add DLQ for failed events; design retry logic and alerting
5. Add circuit breaker + fallback for feedback loop (Phase 5)

---

## ROLE 14: SEARCH/NLP ENGINEER

### Review Questions
1. Which embedding model?
2. Local (sentence-transformers) vs API (OpenAI)?
3. Embedding dimension and storage cost for 95K tools?
4. How to handle updates when new tools added?
5. Hybrid search (keyword + vector) ranking strategy?
6. Query latency target?
7. Re-ranking?

### Key Findings

#### CRITICAL Issues
1. **Embedding model choice unspecified; Phase 2 lacks query latency SLA**
   - "Phase 2: pgvector + embeddings for semantic search" but no model name
   - Questions: sentence-transformers? BERT? GPT embeddings?
   - Query latency target not stated (sub-100ms? sub-500ms?)
   - Risk: Phase 2 ships with default model; worst-case latency could be 500ms+ per query
   - Recommendation:
     - Specify model: sentence-transformers/all-mpnet-base-v2 (768 dims, 50ms latency)
     - SLA: <200ms p95 for single query; <500ms p95 for 10 tool suggestions
     - Benchmark on target hardware before shipping Phase 2

2. **Hybrid search (keyword + vector) ranking strategy undefined**
   - Phase 2 mentions "semantic search" but doesn't define hybrid approach
   - Options:
     1. Vector-only: pgvector cosine similarity (ignores exact term matches)
     2. Keyword-only: full-text search (misses semantic matches)
     3. Hybrid: Score = 0.7 × (vector rank) + 0.3 × (keyword rank)
   - Risk: Poor search quality; tool recommendations miss relevance
   - Example: User queries "carbide endmill" (exact match) but gets "solid carbide rotary" (semantic but not endmill)
   - Recommendation:
     - Use hybrid scoring:
       - Vector similarity: pgvector cosine_distance (0-2, lower = more similar)
       - Keyword match: trigram similarity (pg_trgm, 0-1) + full-text search rank
       - Combined: `0.6 * (1 - cos_dist) + 0.4 * (trgm_sim + 0.1 * ts_rank)`
     - Re-ranking: BM25 (keyword) for first-pass filter; vector search for final ranking
     - Test: Benchmark recall@10 on 95K tools with 100 test queries

3. **95K embedding storage and update strategy not addressed**
   - 95K tools × 768 dimensions (all-mpnet) = ~287 MB just for vectors
   - Update latency: If new tool added, re-embed and INSERT; latency = embedding latency (~50ms) + pgvector INSERT (~1ms)
   - Risk: Slow embedding service (API) → new tools invisible to search for hours
   - Risk: If embedding model retrains, must re-embed all 95K tools (~1.3 hours)
   - Recommendation:
     - Embedding batch job:
       - New tools detected → queue for embedding (async)
       - Nightly batch: Embed all queued tools via local sentence-transformers
       - Insert pgvector rows; update tool_embeddings_version timestamp
     - Re-embedding: New model version → schedule nightly batch re-embed all 95K; gradually migrate clients
     - Fallback: If embedding fails, tool remains searchable via keyword-only

4. **Query latency bottleneck: pgvector exact-match search on 95K vectors**
   - Naive approach: `SELECT * FROM tools ORDER BY embedding <-> query_embedding LIMIT 10`
   - Without index: Full table scan = O(n) = ~50-100ms per query
   - With pgvector index (IVFFlat): O(log n) = ~5-10ms per query
   - But: IVFFlat requires tuning (lists=ceil(sqrt(95000))=308); wrong tuning = poor recall
   - Risk: Latency SLA violated; users perceive slow search
   - Recommendation:
     - Create pgvector IVFFlat index: `CREATE INDEX ON tools USING ivfflat (embedding vector_cosine_ops) WITH (lists=300)`
     - Benchmark: Verify <100ms p95 latency on 95K tools
     - Tune lists parameter empirically; trade off recall vs latency
     - Consider: Partitioning tools by category; search category-specific index first

#### HIGH Issues
5. **No re-ranking strategy for semantic search**
   - Phase 2 mentions semantic search but no re-ranking
   - Raw pgvector cosine similarity can miss nuance:
     - Query: "fast aluminum cutting" — might return "fast steel cutting" (high vector similarity, wrong material)
   - Re-ranking approach:
     1. Initial retrieval: Get top-100 from pgvector (fast, broad)
     2. Re-rank: Cross-encoder model scores top-100 (slower, precise)
       - Example: SBERT cross-encoder/ms-marco-TinyBERT-L-2-v2 (15ms, 50-dims)
     3. Return top-10 re-ranked results
   - Risk: Without re-ranking, search quality mediocre
   - Recommendation:
     - Use light-weight cross-encoder for re-ranking (MiniLM-based, <20ms)
     - OR: Fine-tune embedding model on tool-query pairs (user feedback) instead of general corpus

6. **Tool recommendation context missing**
   - "Semantic search" for tools but no context:
     - Tool attribute relevance: material? operation? tool diameter?
     - Operator context: What machine? What material? What tolerance?
   - Risk: Recommending 10mm endmill when operator has 3mm holder
   - Recommendation:
     - Contextual search:
       1. Extract query entities: material (aluminum?), operation (milling?), tool type (endmill?)
       2. Filter tools by constraints: tool_diameter < machine_capacity, material in ToolRegistry[material]
       3. Re-rank by relevance + constraint satisfaction
     - Example query: "carbide endmill for aluminum finishing" → extract [carbide, endmill, aluminum, finishing] → filter → rank

7. **No cold-start strategy for new users/new tools**
   - If tool is added to ToolRegistry but never searched, no feedback to improve ranking
   - If new user has no search history, no personalization
   - Risk: New tools/users get generic recommendations
   - Recommendation:
     - Cold-start: Use tool metadata (material, operation, geometry) as proxy for embedding
     - Personalization: Track user search + selection behavior; re-rank based on past selections
     - Feedback loop: "User clicked this tool" → increase rank for similar queries

#### MEDIUM Issues
8. **Embedding model drift over time**
   - Embedding model (Phase 2) might be updated; old embeddings become stale
   - If model version changes, can't compare old embeddings with new query embeddings
   - Risk: After model update, search quality drops until all tools re-embedded
   - Recommendation:
     - Version embeddings: Store model_version in database
     - Query: Convert query using SAME model version as tools
     - Monitor: If embedding model version mismatches, alert and trigger re-embedding

9. **Query expansion for natural language search**
   - User might query: "fast cutoff tool for stainless" (natural language)
   - Need to expand: stainless → 304, 316, 17-4 (material synonyms)
   - Risk: Without expansion, miss relevant tools
   - Recommendation:
     - Query rewriting: Parse NL → extract entities + constraints → rewrite as structured query
     - Synonym expansion: Use tool registry + domain ontology to expand material/operation synonyms

---

### ROLE 14 Score: **48 / 100**

**Summary:** Phase 2 (semantic search) is feature-complete but critically underspecified. No embedding model name, no query latency SLA, no hybrid search ranking strategy, no re-ranking, no update strategy for 95K embeddings. pgvector index tuning and query optimization untested. High risk of poor search quality and latency violations.

**Top Blockers:**
1. Specify embedding model (recommend: sentence-transformers/all-mpnet-base-v2) and query latency SLA (<200ms p95)
2. Design hybrid search ranking (0.6 vector + 0.4 keyword) with BM25 or cross-encoder re-ranking
3. Create pgvector IVFFlat index with tuned lists parameter; benchmark latency and recall
4. Define embedding update strategy for new tools (nightly batch) and model retraining (schedule re-embed all 95K)
5. Add cold-start + personalization strategies for new tools/users

---

## ROLE 15: COMPLIANCE/AUDIT ENGINEER

### Review Questions
1. Does prediction_outcomes table satisfy ISO 9001 traceability?
2. Is audit_log in schema.sql sufficient?
3. FLSA compliance for time tracking?
4. Data retention policies?
5. GDPR considerations for employee data?
6. Is there an immutable audit trail for safety-critical parameter changes?

### Key Findings

#### CRITICAL Issues
1. **No "prediction_outcomes" table found in schema.sql**
   - Role 15 asks: "Does prediction_outcomes table satisfy ISO 9001 traceability?"
   - But: No such table exists in schema.sql (lines 1-225 show audit_log, users, api_keys, materials, safety_scores, jobs — no prediction_outcomes)
   - Risk: Phase 9 (ML predictions) will have NO audit trail; can't link predictions to inputs
   - Risk: ISO 9001 §8.5.1 (Control of production) requires documented evidence of process control; missing table fails compliance
   - Recommendation:
     - Create prediction_outcomes table:
       ```sql
       CREATE TABLE prediction_outcomes (
         id UUID PRIMARY KEY,
         prediction_id UUID UNIQUE NOT NULL,
         model_id UUID NOT NULL REFERENCES model_registry(id),
         input_features JSONB NOT NULL, -- feature vector used for prediction
         predicted_value NUMERIC NOT NULL,
         actual_value NUMERIC,
         confidence NUMERIC(5,2),
         timestamp TIMESTAMPTZ DEFAULT NOW(),
         validated_at TIMESTAMPTZ,
         validated_by VARCHAR(100),
         CONSTRAINT pred_immutable CHECK (validated_at IS NULL OR validated_at >= timestamp)
       );
       CREATE INDEX idx_prediction_model ON prediction_outcomes(model_id, timestamp);
       CREATE INDEX idx_prediction_validation ON prediction_outcomes(validated_at) WHERE validated_at IS NOT NULL;
       ```
     - Link to audit_log via audit_log.details JSONB containing prediction_id

2. **Audit_log table lacks immutability guarantee**
   - Current schema (lines 193-212): `CREATE TABLE audit_log (...)`
   - Weakness: No CHECK constraint to prevent UPDATE/DELETE of audit entries
   - Risk: Malicious actor could UPDATE audit_log timestamp or DELETE entries; destroys audit trail
   - Risk: ISO 9001 §4.4.3 (Information management) requires control of documented information; updatable audit log fails compliance
   - Risk: GDPR Article 5 (integrity and confidentiality) requires logging; updatable logs could hide data breaches
   - Recommendation:
     - Make audit_log immutable:
       ```sql
       CREATE TABLE audit_log (
         id BIGSERIAL PRIMARY KEY,
         timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         user_id UUID REFERENCES users(id),
         action VARCHAR(100) NOT NULL,
         entity_type VARCHAR(50),
         entity_id UUID,
         method VARCHAR(10),
         path VARCHAR(500),
         ip_address INET,
         user_agent TEXT,
         status_code INTEGER,
         duration_ms INTEGER,
         details JSONB,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         CONSTRAINT audit_immutable PRIMARY KEY (id),
         CONSTRAINT audit_no_update CHECK (created_at = created_at)  -- PostgreSQL limitation; use trigger instead
       );
       
       -- Trigger to prevent UPDATE/DELETE
       CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON audit_log
       FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();
       ```
     - Or: Use PostgreSQL UNLOGGED table with archival strategy

3. **GDPR data retention policy undefined**
   - schema.sql has no retention clauses
   - GDPR Article 5(1)(e): Data must not be kept in a form which permits identification longer than necessary
   - Questions unanswered:
     - How long do you keep audit_log entries? (30 days? 7 years?)
     - How long do you keep personal data (employee login history, IP addresses)?
     - What's your data minimization policy? (Do you need user_agent + ip_address in audit_log?)
   - Risk: Non-compliance with GDPR; potential fines (€20M or 4% of revenue)
   - Recommendation:
     - Document data retention by data type:
       ```
       audit_log: 7 years (ISO 9001 record retention for manufacturing)
       users: Delete account + anonymize audit entries after 1 year of inactivity (GDPR Article 17 right to erasure)
       user_agent: Delete after 30 days (not essential for audit; high privacy risk)
       ip_address: Anonymize after 30 days (keep only /16 subnet for geolocation)
       prediction_outcomes: 3 years (product liability statute of limitations)
       ```
     - Implement archival job: Move audit_log entries >1 year old to cold storage (PostgreSQL archive table)
     - Implement deletion job: Auto-delete anonymized user data >1 year old

4. **No safety-critical parameter change audit trail**
   - Phase 5: "Wire calibration → SpeedFeedOrchestrator feedback loop"
   - Safety-critical changes (feed rate, spindle speed, tool change) must be auditable
   - Current audit_log records HTTP requests but NOT parameter CHANGES within a request
   - Risk: If malicious user changes feed rate from 50 to 5000 mm/min, audit log shows HTTP POST but not the parameter value change
   - Risk: ISO 9001 §8.5.1 (process control) requires documented evidence of what parameters were set; current audit log insufficient
   - Recommendation:
     - Create parameter_change_log table:
       ```sql
       CREATE TABLE parameter_change_log (
         id UUID PRIMARY KEY,
         timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         user_id UUID NOT NULL REFERENCES users(id),
         job_id UUID REFERENCES jobs(id),
         parameter_name VARCHAR(100) NOT NULL, -- "feed_rate_mmMin"
         old_value NUMERIC,
         new_value NUMERIC NOT NULL,
         safety_impact VARCHAR(200), -- "feed increase from 50 to 5000 => 10x overload"
         approved_by UUID REFERENCES users(id),
         approved_at TIMESTAMPTZ,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         CONSTRAINT param_change_immutable PRIMARY KEY (id)
       );
       CREATE UNIQUE INDEX idx_parameter_change_order ON parameter_change_log(job_id, parameter_name, timestamp);
       ```
     - Trigger on every parameter change: INSERT into parameter_change_log
     - Approval workflow: Change waits for approval (manager review) before applied

#### HIGH Issues
5. **Audit_log details JSONB lacks schema validation**
   - audit_log.details JSONB (line 206) is unstructured
   - Risk: Different parts of codebase populate details differently; impossible to query consistently
   - Risk: Sensitive data (passwords, API keys) might be logged in details
   - Recommendation:
     - Define schema for details by action type:
       ```json
       // For action="update_tool"
       {
         "entity_id": "uuid",
         "before": {"speed_mmin": 250},
         "after": {"speed_mmin": 280},
         "reason": "operator-adjustment"
       }
       ```
     - Use JSON schema validation or Zod to ensure details match action type
     - Redact sensitive fields: Never log passwords, API keys, credit cards

6. **FLSA compliance for time tracking not addressed**
   - Roadmap mentions "time tracking" (job start/end times) but no FLSA rules enforced
   - FLSA (Fair Labor Standards Act) requires: Track working time; pay overtime for >40 hrs/week
   - Current schema has no hours_worked or overtime_calculated fields
   - Risk: Manufacturing shop could underpay workers; legal liability
   - Recommendation:
     - Create time_tracking table:
       ```sql
       CREATE TABLE time_tracking (
         id UUID PRIMARY KEY,
         employee_id UUID NOT NULL,
         job_id UUID REFERENCES jobs(id),
         date_worked DATE NOT NULL,
         hours_worked NUMERIC(5,2) NOT NULL CHECK (hours_worked BETWEEN 0 AND 24),
         overtime_hours NUMERIC(5,2) DEFAULT 0,
         approved_at TIMESTAMPTZ,
         approved_by UUID REFERENCES users(id),
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       );
       ```
     - Weekly aggregation job: SUM hours_worked by employee per week; calculate overtime if >40 hrs
     - Audit: Link to audit_log for approval trail

7. **ISO 9001 traceability gap: No material certification tracking**
   - ISO 9001 §8.4.3 (Control of externally provided processes) requires documented material certs
   - schema.sql has materials table but no certification_id field linking to COC (Certificate of Conformance)
   - Risk: Shop could use wrong material; product fails; no proof of material verification
   - Recommendation:
     - Add material_certification table:
       ```sql
       CREATE TABLE material_certifications (
         id UUID PRIMARY KEY,
         material_lot_id VARCHAR(100) UNIQUE NOT NULL,
         material_id UUID NOT NULL REFERENCES materials(id),
         supplier_id VARCHAR(100) NOT NULL,
         cert_date DATE NOT NULL,
         coc_document BYTEA, -- Store uploaded COC PDF
         received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         verified_at TIMESTAMPTZ,
         verified_by UUID REFERENCES users(id),
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       );
       ```
     - Link jobs.material_lot_id → material_certifications for traceability

#### MEDIUM Issues
8. **No data minimization in audit_log**
   - audit_log logs user_agent + ip_address for every request
   - GDPR Article 5(1)(c): data minimization — collect only necessary data
   - Logging full user_agent (browser version, OS, plugins) is not necessary for manufacturing audit
   - Recommendation:
     - Minimize audit_log:
       - Keep: user_id, action, entity_type, entity_id, timestamp, status_code, duration_ms
       - Drop: user_agent, ip_address (except for security-critical actions like password change)
       - Option: Store ip_address + user_agent in separate security_events table only for login/auth failures

9. **No immutable archive strategy**
   - PostgreSQL doesn't have write-once storage natively
   - Risk: As audit_log grows >1B rows, performance degrades; queries slow
   - Recommendation:
     - Archive strategy:
       1. Partition audit_log by month: `audit_log_2026_04`, `audit_log_2026_03`, etc.
       2. After 1 month, move partition to read-only table (no further updates)
       3. Option: Export to immutable cloud storage (S3 with versioning disabled, Glacier) after 7 years

---

### ROLE 15 Score: **35 / 100**

**Summary:** Compliance posture is critically weak. No prediction_outcomes table despite Phase 9 ML. Audit log is updatable (violates immutability requirement). No GDPR retention policy, no FLSA time tracking, no ISO 9001 traceability for material certifications. Safety-critical parameter changes not auditable separately from HTTP requests. High legal and regulatory risk.

**Top Blockers:**
1. Make audit_log immutable (trigger + constraint to prevent UPDATE/DELETE)
2. Create prediction_outcomes table (Phase 9 requirement) + parameter_change_log (safety-critical tracking)
3. Document GDPR data retention policy by data type; implement archival and deletion jobs
4. Add material_certification table (ISO 9001 traceability) + approval workflow
5. Create time_tracking table with weekly overtime calculation (FLSA compliance)

---

## Summary: All Roles

| Role | Score | Key Gaps |
|------|-------|----------|
| 11: Testing/QA | 58 | No migration fixtures, no Redis mocks, no test isolation, no semantic search load test |
| 12: ML Engineer | 42 | Phase 9 unspecified (no models, no training pipeline), ONNX not production-ready, feature store weak |
| 13: Real-time Systems | 44 | No exactly-once semantics, no back-pressure, no DLQ, no event versioning, no OPC-UA data rate |
| 14: Search/NLP | 48 | No embedding model, no latency SLA, no hybrid ranking, no re-ranking, no embedding update strategy |
| 15: Compliance/Audit | 35 | No prediction_outcomes table, audit_log updatable, no GDPR/FLSA/ISO9001 policies, parameter changes unauditable |

**Average Score: 45.4 / 100** — **ROADMAP REQUIRES MAJOR REVISION BEFORE EXECUTION**

---

## Top 10 Critical Blockers (Cross-Role)

1. **Phase 1 (migrations)**: No migration runner interface + test fixtures defined
2. **Phase 2 (semantic search)**: No embedding model chosen; query latency SLA missing; no hybrid ranking
3. **Phase 4 (Redis Streams)**: No exactly-once semantics, no back-pressure handling, no DLQ pattern
4. **Phase 5 (feedback loop)**: No circuit breaker; could crash and lose real-time control
5. **Phase 3 (auth)**: No Redis mock for testing; can't run auth tests without live Redis
6. **Phase 9 (ONNX)**: No model portfolio defined; no training pipeline; feature store insufficient
7. **Vitest config**: `isolate: false` unsuitable for stateful tests (Postgres, Redis, BullMQ)
8. **Audit trail**: audit_log updatable (immutability violation); no parameter_change_log; no prediction_outcomes table
9. **Data retention**: No GDPR policy; no FLSA time tracking; no ISO 9001 material traceability
10. **Event schema versioning**: Not addressed; will cause producer-consumer incompatibility as system evolves
