# INFRA — Infrastructure Modernization Roadmap for PRISM MCP Server

## Track ID: INFRA
## Generated: 2026-04-01
## Based on: 12 verified infrastructure findings (line-number confirmed)
## Format: RGS milestone envelopes with sessions, units, dependencies, exit gates, forge-triples

---

## Starting State

PRISM MCP Server has 1,304 engines, 79 dispatchers, 3,310 actions, and a rich manufacturing
intelligence stack. However, the infrastructure layer has 12 confirmed gaps that prevent
production deployment. PostgreSQL is dead code (`pg` not in package.json, dynamic import
silently fails). All state is in-memory Maps. No durable job queue, no event bus, no ML
model serving. Auth tokens, rate limits, and tier gates are all in-memory. Docker deploy
is broken (Dockerfile has no `production` stage but docker-compose.yml and CI both
reference `target: production`).

## Target State

- PostgreSQL connected and running migrations (schema.sql + 9 migration files)
- pgvector semantic search replacing String.includes() on 3,700+ tribal tips
- Redis-backed auth tokens, rate limits, and tier enforcement
- BullMQ durable job queue for background pipelines
- Redis Streams event bus replacing fire-and-forget SSE
- Calibration engines wired into SpeedFeedOrchestrator feedback loop
- OpenTelemetry metrics wired to existing Prometheus/Grafana deploy stack
- Auto-generated OpenAPI from existing Zod schemas
- Plugin SDK importing from canonical constants.ts
- Docker build fixed, K8s manifests added, CI deploy stage functional
- ONNX Runtime model serving foundation
- Knowledge graph persisted to PostgreSQL

## Dependency Graph

```
INFRA-P1 (Data Foundation) ──────────────────────────────────┐
    │                                                         │
    ├──► INFRA-P2 (Search & Intelligence)                    │
    │         requires: P1 complete (pg + pgvector)          │
    │                                                         │
    ├──► INFRA-P3 (Auth & Security) [PARALLEL with P2]      │
    │         requires: P1 complete (pg for user store)      │
    │                                                         │
    ├──► INFRA-P4 (Async & Events) [PARALLEL with P2, P3]   │
    │         requires: P1 complete (pg for job state)       │
    │                                                         │
    ├──► INFRA-P5 (Feedback Loop) [PARALLEL with P2-P4]     │
    │         requires: P1 complete (pg for outcomes table)  │
    │                                                         │
    └──► INFRA-P10 (Knowledge Persistence)                   │
              requires: P1 complete (pg for graph tables)    │
                                                              │
INFRA-P6 (Observability) ─── requires: P4 complete           │
                                                              │
INFRA-P7 (API & Integration) ─── requires: P1 complete       │
                                                              │
INFRA-P8 (Deployment) ─── requires: P1, P3, P6 complete     │
                                                              │
INFRA-P9 (ML Foundation) ─── requires: P1, P2 complete       │
```

### Parallelism Map

| Phase | Can start after | Can run in parallel with |
|-------|----------------|------------------------|
| P1    | immediately    | nothing (foundation)   |
| P2    | P1 complete    | P3, P4, P5, P7, P10   |
| P3    | P1 complete    | P2, P4, P5, P7, P10   |
| P4    | P1 complete    | P2, P3, P5, P7, P10   |
| P5    | P1 complete    | P2, P3, P4, P7, P10   |
| P6    | P4 complete    | P5, P7, P9, P10       |
| P7    | P1 complete    | P2-P6, P10            |
| P8    | P1+P3+P6      | P9, P10               |
| P9    | P1+P2         | P6, P8, P10           |
| P10   | P1 complete    | P2-P9                 |

**Total: 10 phases, 19 sessions, ~58 units**

---

## Phase 1: Data Foundation (PostgreSQL, Migrations, Persistence)
### Findings addressed: #1 (PostgreSQL dead code), partially #12 (Docker pg reference)
### Critical path — everything else depends on this

---

### SESSION INFRA-1-1: PostgreSQL Connection & Package Wiring (U-DB1, U-DB2)
```
SMART CONFIG: Role=database architect + backend | OPUS | MAX
UNITS: U-DB1, U-DB2
ESTIMATED CONTEXT: 40-50%
DEPENDENCIES: None (first session)

KNOWLEDGE SOURCES:
  - src/db/connection.ts — DatabaseConnection class, dynamic import at line 70-72
  - src/db/BusinessStore.ts — IBusinessStore<T> adapter pattern, Postgres + InMemory impls
  - src/db/PersistenceBridge.ts — write-through cache, fire-and-forget to store
  - package.json — pg NOT listed in dependencies
  - docker-compose.yml — postgres:16-alpine service already defined
  - .env.example — DATABASE_URL pattern

INTENT:
  PostgreSQL is completely dead code. connection.ts:70-72 does
  `await import("pg").catch(() => null)` which always returns null because pg
  is not in package.json. The entire persistence stack (BusinessStore,
  PersistenceBridge, schema.sql, 9 migrations) exists but never runs.
  This session adds pg to dependencies, verifies the connection actually works,
  and ensures PersistenceBridge switches from "memory" to "postgres" mode when
  DATABASE_URL is set.

WORK:
  U-DB1: Add pg dependency and verify connection (Effort: 25)
    npm install pg @types/pg
    Verify connection.ts connect() succeeds with a real DATABASE_URL
    Add integration test: db-connection.test.ts (connect, query, transaction, close)
    Verify PersistenceBridge.loadAll() reports mode="postgres" when connected
    Run: npx tsc --noEmit → 0 errors

  U-DB2: Migration runner + schema bootstrap (Effort: 35)
    Create src/db/migrator.ts — reads migration files in order (001-009)
    Apply schema.sql as baseline, then run migrations sequentially
    Track applied migrations in a `schema_migrations` table
    Add startup hook: run migrations on server boot (idempotent)
    Integration test: migrator.test.ts (fresh DB → all 9 migrations applied)
    Verify all tables from schema.sql exist after migration

EXIT GATE:
  ✓ pg in package.json dependencies
  ✓ DatabaseConnection.connect() returns true with valid DATABASE_URL
  ✓ PersistenceBridge.loadAll() returns { mode: "postgres" }
  ✓ All 9 migrations applied cleanly on fresh database
  ✓ schema_migrations table tracks applied versions
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-db-connection` — warn if any new engine uses InMemoryBusinessStore directly
  Action: `infra_db_status` — returns connection state, migration version, pool stats
  Skill: `/db-status` — quick database health check

---

### SESSION INFRA-1-2: Persistence Bridge Hardening + Data Seeding (U-DB3, U-DB4)
```
SMART CONFIG: Role=database + backend reliability | OPUS | HIGH
UNITS: U-DB3, U-DB4
ESTIMATED CONTEXT: 45-55%
DEPENDENCIES: INFRA-1-1

KNOWLEDGE SOURCES:
  - src/db/PersistenceBridge.ts — write-through cache, pending writes queue
  - src/db/BusinessStore.ts — PostgresBusinessStore implementation
  - src/db/schema.sql — all table definitions
  - src/engines/ — any engine that calls registerMap() or registerArray()

INTENT:
  PersistenceBridge currently fire-and-forgets writes to a DB that never connects.
  Now that pg works, we need to verify that the write-through cache actually
  persists data reliably, handles errors with retries, and can seed initial data
  from registries into PostgreSQL tables.

WORK:
  U-DB3: PersistenceBridge reliability hardening (Effort: 30)
    Verify persist() actually writes to Postgres (not just queues and drops)
    Add retry logic with exponential backoff (3 retries, 100ms/200ms/400ms)
    Add flushAll() guarantee: all pending writes complete before shutdown
    Add health check: bridge.getHealth() returns pending count, error count, mode
    Test: persistence-bridge-postgres.test.ts (write, read-back, retry on failure)

  U-DB4: Registry-to-Postgres seed pipeline (Effort: 35)
    Create src/db/seeder.ts — bulk-inserts from MaterialRegistry, ToolRegistry,
    MachineRegistry into their respective Postgres tables
    Use COPY or multi-row INSERT for performance (95K tools = needs batch strategy)
    Add --seed flag to server startup (run once, idempotent via ON CONFLICT)
    Test: seeder.test.ts (seed 100 materials, verify row count + data integrity)

EXIT GATE:
  ✓ PersistenceBridge persist() confirmed writing to Postgres
  ✓ Retry logic handles transient failures (tested with mock disconnect)
  ✓ flushAll() completes all pending writes
  ✓ Seed pipeline loads materials + tools + machines into Postgres
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-persistence-bridge` — block direct SQL writes that bypass the bridge
  Action: `infra_seed_db` — trigger registry-to-Postgres seed
  Skill: `/db-seed` — seed database from registries

---

## Phase 2: Search & Intelligence (pgvector, Embeddings, Semantic Search)
### Findings addressed: #2 (semantic search does not exist)
### Requires: Phase 1 complete

---

### SESSION INFRA-2-1: pgvector Extension + Embedding Pipeline (U-VEC1, U-VEC2, U-VEC3)
```
SMART CONFIG: Role=search + NLP + database | OPUS | MAX
UNITS: U-VEC1, U-VEC2, U-VEC3
ESTIMATED CONTEXT: 55-65%
DEPENDENCIES: INFRA-1-2

KNOWLEDGE SOURCES:
  - src/engines/TribalKnowledgeEngine.ts:764-769 — String.includes() search
  - src/db/schema.sql:9 — pg_trgm extension already declared
  - pgvector documentation — vector similarity search for PostgreSQL
  - TribalKnowledgeEngine tip structure — title, body, tags, confidence, usage_count

INTENT:
  TribalKnowledgeEngine searches 3,700+ tips using String.includes() on title,
  body, and tags. A machinist searching "chatter when milling thin walls" will
  miss tips about "vibration during side milling of slender features" because
  there is zero semantic understanding. pgvector with embeddings fixes this.
  The schema already declares pg_trgm; we add pgvector alongside it.

WORK:
  U-VEC1: pgvector extension + embedding table (Effort: 25)
    Add pgvector extension to schema.sql and a new migration 010-pgvector.sql
    Create tribal_knowledge_embeddings table (tip_id FK, embedding vector(384))
    Create HNSW index on the embedding column
    Verify extension loads in docker-compose Postgres

  U-VEC2: Embedding generation pipeline (Effort: 40)
    Create src/engines/EmbeddingEngine.ts
    Use a local embedding model approach: transformers.js or pre-computed embeddings
    Batch-embed all 3,700+ tips (title + body concatenated)
    Store embeddings in tribal_knowledge_embeddings table
    Add incremental embedding on tip creation/update

  U-VEC3: Semantic search in TribalKnowledgeEngine (Effort: 35)
    Replace String.includes() search with vector similarity query
    Fallback: if pgvector unavailable, use pg_trgm similarity() as middle ground
    Final fallback: existing String.includes() for fully in-memory mode
    Hybrid scoring: 0.7 * vector_similarity + 0.3 * (confidence * log2(usage+2))
    Test: tribal-knowledge-semantic.test.ts (synonym matching, near-miss queries)

EXIT GATE:
  ✓ pgvector extension installed and functional
  ✓ All 3,700+ tips have embeddings stored
  ✓ Search for "vibration thin walls" returns tips about "chatter" and "slender features"
  ✓ Fallback chain works: pgvector → pg_trgm → String.includes()
  ✓ Search latency < 100ms for typical queries
  ✓ 2+ new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-semantic-search` — warn if new search code uses String.includes() for > 100 items
  Action: `infra_semantic_search` — expose semantic search as MCP action
  Skill: `/semantic-search` — search tribal knowledge, tools, materials by meaning

---

## Phase 3: Auth & Security (Redis-backed Tokens, Tier Enforcement, Rate Limiting)
### Findings addressed: #4 (auth tokens in memory), #7 (tier gating never enforced)
### Requires: Phase 1 complete | PARALLEL with Phases 2, 4, 5

---

### SESSION INFRA-3-1: Redis-Backed Auth Store (U-AUTH1, U-AUTH2)
```
SMART CONFIG: Role=security + backend architect | OPUS | MAX
UNITS: U-AUTH1, U-AUTH2
ESTIMATED CONTEXT: 45-55%
DEPENDENCIES: INFRA-1-1

KNOWLEDGE SOURCES:
  - src/mcp/auth.ts:285-295 — in-memory Maps for authCodes, refreshTokens, revokedAccessTokens, users
  - src/middleware/tierGate.ts:189-212 — requireTier() reads usage but nothing increments it
  - src/engines/RateLimitEngine.ts:87-88 — in-memory Maps for rules and buckets
  - docker-compose.yml — no Redis service currently defined

INTENT:
  Auth tokens live in Maps. Server restart = all users logged out, all refresh
  tokens lost. The comment at auth.ts:285 explicitly says "Production deployments
  should replace with Redis/DB-backed stores." Tier gating reads usage counters
  that are never incremented, making the entire tier system decorative. Rate
  limiting uses in-memory Maps that reset on restart and are not shared across
  instances.

WORK:
  U-AUTH1: Add Redis + migrate auth stores (Effort: 40)
    npm install ioredis
    Add Redis service to docker-compose.yml
    Create src/db/redis.ts — RedisConnection class (connection pooling, health check)
    Create src/mcp/auth-store-redis.ts — RedisAuthStore implementing same interface
    Replace Map<> stores in PrismOAuthServer with RedisAuthStore
    Set TTLs: authCodes=10min, refreshTokens=7d, revokedAccessTokens=24h
    Fallback: if REDIS_URL not set, keep in-memory (dev mode)
    Test: auth-redis-store.test.ts (store/retrieve/expire/revoke)

  U-AUTH2: Wire tier usage counters + rate limit persistence (Effort: 35)
    Create middleware to INCREMENT usage counters on each gated action
    Store counters in Redis with daily/monthly key rotation
    Wire tierGate.ts:194 to read from Redis counters instead of always-zero
    Migrate RateLimitEngine buckets to Redis (INCR + EXPIRE pattern)
    Test: tier-enforcement.test.ts (free user hits limit, pro user does not)

EXIT GATE:
  ✓ Redis service in docker-compose.yml
  ✓ Auth tokens survive server restart (stored in Redis)
  ✓ Revoked tokens actually rejected after restart
  ✓ Tier usage counters increment on gated actions
  ✓ Free tier user blocked after exceeding limit
  ✓ Rate limit state shared across restart
  ✓ Fallback to in-memory when REDIS_URL not set
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-auth-redis` — block new auth code that uses raw Map<> for tokens
  Action: `infra_auth_health` — returns Redis connection state, active token count, tier usage stats
  Skill: `/auth-health` — auth system health dashboard

---

## Phase 4: Async & Events (Job Queue, Event Bus, Background Workers)
### Findings addressed: #5 (no durable job queue), #6 (no durable event bus)
### Requires: Phase 1 complete | PARALLEL with Phases 2, 3, 5

---

### SESSION INFRA-4-1: BullMQ Durable Job Queue (U-JQ1, U-JQ2)
```
SMART CONFIG: Role=distributed systems + backend architect | OPUS | MAX
UNITS: U-JQ1, U-JQ2
ESTIMATED CONTEXT: 50-60%
DEPENDENCIES: INFRA-3-1 (Redis required)

KNOWLEDGE SOURCES:
  - src/engines/SpeedFeedOrchestratorEngine.ts — 3,103 lines, runs synchronously in HTTP handler
  - src/engines/PrintToProgramPipelineEngine.ts — multi-stage pipeline, synchronous
  - src/engines/QueueEngine.ts — manufacturing optimization, NOT a job queue (confirm)
  - BullMQ documentation — Redis-backed job queue with retries, priorities, rate limiting
  - src/routes/ — all 51 route files (pipeline actions block HTTP responses)

INTENT:
  Every pipeline (PrintToProgram, QuoteToShip, PostProcessor) runs synchronously
  inside an HTTP handler. A complex 38-stage PostProcessor run blocks the Express
  thread for seconds. QueueEngine is a manufacturing scheduling optimizer, not a
  job queue. We need BullMQ for durable, retryable, prioritized background work.

WORK:
  U-JQ1: BullMQ setup + job queue infrastructure (Effort: 35)
    npm install bullmq
    Create src/jobs/queue.ts — QueueManager class
    Define job types: pipeline-run, batch-embed, seed-db, report-generate
    Create src/jobs/worker.ts — BullMQ Worker with concurrency=4
    Add queue dashboard endpoint: GET /api/v1/jobs (list, status, retry)
    Health check: queue.getHealth() returns active/waiting/completed/failed counts
    Test: job-queue.test.ts (enqueue, process, retry on failure, priority ordering)

  U-JQ2: Migrate pipeline execution to async jobs (Effort: 40)
    Wrap PrintToProgramPipelineEngine.run() in a BullMQ job
    HTTP handler returns { jobId, status: "queued" } immediately
    Add GET /api/v1/jobs/:id/status for polling
    Add SSE endpoint /api/v1/jobs/:id/stream for real-time progress
    Wire pipeline checkpoint callbacks to job progress updates
    Test: pipeline-async.test.ts (enqueue pipeline, poll status, verify completion)

EXIT GATE:
  ✓ BullMQ in package.json
  ✓ Pipeline jobs run in background worker, not HTTP thread
  ✓ HTTP returns jobId immediately (< 50ms response time)
  ✓ Job status queryable via REST and SSE
  ✓ Failed jobs retry 3 times with exponential backoff
  ✓ Job state survives server restart (Redis-backed)
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-async-pipeline` — warn if pipeline.run() called directly in route handler
  Action: `infra_job_status` — query job queue state, active workers, failed jobs
  Skill: `/job-status` — check background job progress

---

### SESSION INFRA-4-2: Durable Event Bus (U-EB1, U-EB2)
```
SMART CONFIG: Role=event-driven architecture + backend | OPUS | HIGH
UNITS: U-EB1, U-EB2
ESTIMATED CONTEXT: 45-55%
DEPENDENCIES: INFRA-3-1 (Redis required)

KNOWLEDGE SOURCES:
  - src/routes/realtime.ts — SSE implementation, fire-and-forget
  - src/tools/dispatchers/realtimeDispatcher.ts — realtime event actions
  - src/schemas/realtimeActionSchemas.ts — event schemas
  - Redis Streams documentation — durable, replayable event log

INTENT:
  SSE and WebSocket exist for pushing events to clients, but the server-side
  event production is fire-and-forget in-process. If an SSE client disconnects
  and reconnects, missed events are gone. If a consumer is slow, events are
  dropped. Redis Streams provides durable, replayable event delivery with
  consumer groups — events survive restarts and slow consumers.

WORK:
  U-EB1: Redis Streams event bus core (Effort: 35)
    Create src/events/EventBus.ts — publish(stream, event), subscribe(stream, group, handler)
    Use Redis Streams XADD/XREADGROUP for durability
    Define event streams: job.*, mutation.*, alert.*, metrics.*
    Consumer groups: web-sse, webhook-relay, metrics-collector
    Replay support: consumers can read from any event ID
    Fallback: in-process EventEmitter when REDIS_URL not set
    Test: event-bus.test.ts (publish, subscribe, replay, consumer group ack)

  U-EB2: Wire existing SSE/WebSocket to event bus (Effort: 30)
    Replace fire-and-forget event emission in realtime.ts with EventBus.publish()
    SSE endpoint reads from Redis Streams consumer group (durable delivery)
    On client reconnect, replay missed events from last-event-id
    Wire OPC-UA connector events through the event bus
    Test: realtime-durable.test.ts (disconnect, reconnect, verify no missed events)

EXIT GATE:
  ✓ EventBus publishes to Redis Streams
  ✓ SSE clients receive events via consumer group (not fire-and-forget)
  ✓ Client reconnect replays missed events
  ✓ Event bus survives server restart
  ✓ Fallback to in-process EventEmitter without Redis
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-event-bus` — warn if code emits events without going through EventBus
  Action: `infra_event_stream` — list active streams, consumer groups, lag
  Skill: `/event-health` — event bus health and consumer lag dashboard

---

## Phase 5: Feedback Loop (Wire Calibration to Orchestrator, Prediction Outcomes)
### Findings addressed: #3 (feedback loop built but not wired)
### Requires: Phase 1 complete | PARALLEL with Phases 2, 3, 4

---

### SESSION INFRA-5-1: Wire Calibration into SpeedFeedOrchestrator (U-CAL1, U-CAL2, U-CAL3)
```
SMART CONFIG: Role=physics + pipeline architect | OPUS | MAX
UNITS: U-CAL1, U-CAL2, U-CAL3
ESTIMATED CONTEXT: 60-70%

DEPENDENCIES: INFRA-1-2

KNOWLEDGE SOURCES:
  - src/engines/SpeedFeedOrchestratorEngine.ts:61-147 — OrchestratorInput (~130 fields, zero calibration)
  - src/engines/PredictionCalibrationEngine.ts — Bayesian posterior updates, prediction_calibrate action
  - src/engines/AdaptiveCalibrationEngine.ts — 6 methods (Bayesian Kienzle, Kalman Taylor, bootstrap, CUSUM, thermal gradient, AIC/BIC)
  - src/physics/constants.ts — canonical Kienzle/Taylor constants
  - src/tools/dispatchers/camDispatcher.ts — both calibration engines wired here

INTENT:
  SpeedFeedOrchestrator is the central physics hub (3,103 lines, 8 resolvers).
  PredictionCalibrationEngine does Bayesian posterior updates on Kienzle kc1.1
  and Taylor C/n from actual measurements. AdaptiveCalibrationEngine has 6
  sophisticated methods including Kalman filters and CUSUM drift detection.
  Both are exported, wired to camDispatcher, and fully functional. But
  SpeedFeedOrchestrator has NO calibration input fields and NO way to receive
  their output. The feedback loop is built at both ends but not connected.

WORK:
  U-CAL1: Add calibration fields to OrchestratorInput + outcomes table (Effort: 30)
    Extend OrchestratorInput with calibration fields:
      use_calibrated_constants?: boolean
      machine_calibration_id?: string
      material_calibration_id?: string
    Create migration 011-prediction-outcomes.sql:
      prediction_outcomes table (predicted, actual, delta, timestamp, machine_id, material_key)
    Wire PredictionCalibrationEngine.getFactors() into orchestrator resolver chain

  U-CAL2: Orchestrator resolver integration (Effort: 40)
    In SpeedFeedOrchestrator resolve chain, after base Kienzle/Taylor lookup:
      If use_calibrated_constants=true and calibration factors exist:
        Apply kc1_1_ratio from PredictionCalibrationEngine
        Apply taylor_C_ratio and taylor_n_adjustment
    Add calibration_applied flag + calibration_source to OrchestratorResult
    Integrate AdaptiveCalibrationEngine CUSUM drift detection as a warning
    When CUSUM detects drift > threshold, add warning to result

  U-CAL3: Actuals ingestion endpoint + closed-loop test (Effort: 35)
    Create POST /api/v1/calibration/record-actual
      Accepts: { prediction_id, actual_force_N, actual_tool_life_min, machine_id }
      Stores in prediction_outcomes table
      Triggers PredictionCalibrationEngine.calibrate() with new measurement
    End-to-end test: predict → record actual → re-predict → verify constants shifted
    Test: calibration-loop.test.ts (full closed-loop verification)

EXIT GATE:
  ✓ OrchestratorInput has calibration fields
  ✓ prediction_outcomes table created via migration
  ✓ SpeedFeedOrchestrator applies calibrated constants when available
  ✓ Actuals endpoint records measurements and triggers recalibration
  ✓ Closed-loop test: constants shift toward actuals after 5+ measurements
  ✓ CUSUM drift detection produces warnings when physics diverge
  ✓ 2+ new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-calibration-recording` — warn if pipeline produces S/F without recording prediction ID
  Action: `infra_calibration_status` — show calibration factors per machine/material, drift alerts
  Skill: `/calibration-status` — view active calibrations and drift warnings

---

## Phase 6: Observability (Native Metrics, OpenTelemetry, Dashboard Wiring)
### Findings addressed: partially #12 (deploy/ has Prometheus/Grafana configs but nothing emits metrics)
### Requires: Phase 4 complete (event bus for metric events)

---

### SESSION INFRA-6-1: OpenTelemetry Metrics + Prometheus Endpoint (U-OBS1, U-OBS2)
```
SMART CONFIG: Role=observability + SRE | OPUS | HIGH
UNITS: U-OBS1, U-OBS2
ESTIMATED CONTEXT: 40-50%
DEPENDENCIES: INFRA-4-2

KNOWLEDGE SOURCES:
  - deploy/prometheus.yml — Prometheus scrape config (exists but nothing to scrape)
  - deploy/grafana-dashboards/prism-dashboard.json — Grafana dashboard (exists)
  - deploy/grafana-datasources/prometheus.yml — datasource config
  - src/routes/ — 51 route files, no metrics middleware
  - src/engines/SpeedFeedOrchestratorEngine.ts — no latency/call tracking

INTENT:
  The deploy/ directory has Prometheus configs, Grafana dashboards, and
  datasource wiring. But the PRISM server emits zero metrics. No request
  latency histograms, no engine call counters, no error rates, no queue
  depth gauges. The monitoring stack exists but has nothing to monitor.

WORK:
  U-OBS1: OpenTelemetry SDK + Prometheus exporter (Effort: 35)
    npm install @opentelemetry/api @opentelemetry/sdk-metrics @opentelemetry/exporter-prometheus
    Create src/observability/metrics.ts — MetricsProvider singleton
    Define core metrics:
      prism_http_request_duration_seconds (histogram, by route+method+status)
      prism_engine_call_duration_seconds (histogram, by engine+method)
      prism_job_queue_depth (gauge, by queue name)
      prism_db_query_duration_seconds (histogram)
      prism_active_connections (gauge, by type: http/ws/sse)
      prism_calibration_drift (gauge, by machine+material)
    Add Express middleware for automatic HTTP request metrics
    Expose GET /metrics endpoint in Prometheus exposition format

  U-OBS2: Engine + pipeline instrumentation (Effort: 30)
    Instrument SpeedFeedOrchestratorEngine with call duration + resolver breakdown
    Instrument pipeline stages with per-stage timing
    Instrument DatabaseConnection with query duration + pool utilization
    Instrument EventBus with publish/consume rates + consumer lag
    Wire deploy/prometheus.yml to scrape localhost:3000/metrics
    Verify Grafana dashboard renders real data from Prometheus
    Test: metrics-endpoint.test.ts (verify /metrics returns valid Prometheus format)

EXIT GATE:
  ✓ GET /metrics returns valid Prometheus exposition format
  ✓ HTTP request latency tracked by route
  ✓ Engine call duration tracked
  ✓ Prometheus scrapes successfully (verified with curl)
  ✓ Grafana dashboard shows real data
  ✓ 1+ new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-metrics` — warn if new route handler lacks metrics middleware
  Action: `infra_metrics_summary` — return key metrics (p50/p99 latency, error rate, queue depth)
  Skill: `/metrics` — quick observability dashboard

---

## Phase 7: API & Integration (Auto OpenAPI, Plugin SDK Fix, Plugin Manifest)
### Findings addressed: #10 (OpenAPI hand-written), #11 (no plugin isolation)
### Requires: Phase 1 complete | PARALLEL with Phases 2-6

---

### SESSION INFRA-7-1: Auto-Generated OpenAPI from Zod Schemas (U-API1, U-API2)
```
SMART CONFIG: Role=API architect + documentation | SONNET | HIGH
UNITS: U-API1, U-API2
ESTIMATED CONTEXT: 40-50%
DEPENDENCIES: INFRA-1-1

KNOWLEDGE SOURCES:
  - src/routes/openapi.ts — hand-written spec covering ~30 of 3,310 actions
  - src/schemas/ — Zod schemas per dispatcher action (zod-to-json-schema in package.json)
  - src/tools/dispatchers/ — 79 dispatchers with z.enum action lists
  - package.json:48 — zod-to-json-schema already installed but unused

INTENT:
  openapi.ts has a hand-written OpenAPI spec covering ~30 actions out of 3,310.
  Meanwhile, zod-to-json-schema is already in dependencies but never called.
  Every dispatcher action already has a Zod schema in src/schemas/. We can
  auto-generate a complete OpenAPI spec by walking all dispatchers and converting
  their Zod schemas to JSON Schema.

WORK:
  U-API1: OpenAPI auto-generation from Zod schemas (Effort: 35)
    Create src/routes/openapi-generator.ts
    Walk all dispatcher files, extract action names + Zod schemas
    Use zod-to-json-schema to convert each action's input/output schema
    Generate OpenAPI 3.0 paths: POST /api/v1/{dispatcher}/{action}
    Replace hand-written spec in openapi.ts with generated spec
    Cache generated spec (regenerate on startup or via admin endpoint)
    Test: openapi-generator.test.ts (generated spec is valid OpenAPI 3.0)

  U-API2: Swagger UI + SDK generation (Effort: 20)
    npm install swagger-ui-express
    Mount Swagger UI at /api/docs
    Add script: generate-openapi.ts — writes openapi.json to disk for CI
    Verify all 3,310 actions appear in generated spec
    Test: openapi-completeness.test.ts (action count >= 3000)

EXIT GATE:
  ✓ OpenAPI spec auto-generated from Zod schemas
  ✓ All dispatcher actions represented (3,000+ paths)
  ✓ Swagger UI accessible at /api/docs
  ✓ Generated spec validates as OpenAPI 3.0
  ✓ Hand-written spec replaced
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-schema-openapi` — warn if new action lacks Zod schema (breaks OpenAPI gen)
  Action: `infra_openapi_stats` — return action coverage, schema completeness
  Skill: `/api-docs` — open Swagger UI or return OpenAPI stats

---

### SESSION INFRA-7-2: Plugin SDK Fix + Plugin Manifest (U-PLG1, U-PLG2)
```
SMART CONFIG: Role=plugin architecture + safety | SONNET | HIGH
UNITS: U-PLG1, U-PLG2
ESTIMATED CONTEXT: 40-50%
DEPENDENCIES: INFRA-1-1

KNOWLEDGE SOURCES:
  - src/engines/CAMPluginSDKEngine.ts:14-35 — inlined Kienzle/Taylor constants
  - src/physics/constants.ts — canonical constants (kc1_1 per ISO group)
  - Engine conventions: CLAUDE.md — "never inline constants"

INTENT:
  CAMPluginSDKEngine inlines Kienzle and Taylor constants (lines 14-35) instead
  of importing from src/physics/constants.ts. This means plugin SDK users get
  potentially stale constants that diverge from the canonical source. There is
  also no plugin manifest, no sandboxing, and no version contract for plugins.

WORK:
  U-PLG1: Fix CAMPluginSDKEngine constant imports (Effort: 20)
    Replace inlined KIENZLE Record<string, KienzleRow> with import from constants.ts
    Replace inlined TAYLOR Record<string, TaylorRow> with import from constants.ts
    Replace inlined VC_TABLE with import or derivation from canonical source
    Verify all SDK methods return identical results after refactor
    Test: cam-plugin-sdk-constants.test.ts (SDK values match canonical constants)

  U-PLG2: Plugin manifest + isolation framework (Effort: 30)
    Create src/plugins/manifest.ts — PluginManifest interface:
      { id, name, version, permissions: string[], constants_version, entrypoint }
    Create src/plugins/loader.ts — validates manifest before loading plugin
    Permission model: plugins declare which engines/actions they can access
    Constants versioning: plugins pin to a constants.ts hash, warn on mismatch
    Plugin registry: list loaded plugins, their versions, permissions
    Test: plugin-manifest.test.ts (valid manifest loads, invalid rejected)

EXIT GATE:
  ✓ CAMPluginSDKEngine imports from constants.ts (zero inlined constants)
  ✓ SDK output unchanged (regression test passes)
  ✓ Plugin manifest schema defined and validated
  ✓ Plugin loader rejects manifests with unknown permissions
  ✓ Constants version tracking works
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-no-inline-constants` — block inlined Kienzle/Taylor/Vc outside constants.ts
  Action: `infra_plugin_list` — list loaded plugins with versions and permissions
  Skill: `/plugin-status` — plugin health and compatibility dashboard

---

## Phase 8: Deployment (Docker Fix, CI/CD, K8s Manifests)
### Findings addressed: #12 (Docker deploy broken)
### Requires: Phase 1 + Phase 3 + Phase 6 complete

---

### SESSION INFRA-8-1: Docker Build Fix + CI/CD Deploy Stage (U-DEP1, U-DEP2)
```
SMART CONFIG: Role=DevOps + container architecture | SONNET | HIGH
UNITS: U-DEP1, U-DEP2
ESTIMATED CONTEXT: 40-50%
DEPENDENCIES: INFRA-6-1

KNOWLEDGE SOURCES:
  - Dockerfile — stages "builder" and "runtime" (no "production" stage)
  - docker-compose.yml:30 — `target: production` references non-existent stage
  - .github/workflows/ci.yml:105 — `target: production` in Docker build step
  - deploy/start.sh — startup script
  - deploy/prometheus.yml, deploy/grafana-* — monitoring configs

INTENT:
  Dockerfile defines stages "builder" and "runtime". docker-compose.yml:30
  references `target: production` which does not exist, causing docker-compose
  build to fail. CI workflow ci.yml:105 also references `target: production`.
  The deploy stage (ci.yml:113-120) is just echo statements. This needs to
  actually work for production deployment.

WORK:
  U-DEP1: Fix Docker multi-stage build (Effort: 25)
    Rename Dockerfile stage "runtime" to "production" (or add alias)
    Verify: docker-compose build succeeds
    Verify: docker-compose up brings up postgres + prism-server + prometheus + grafana
    Add Redis service to docker-compose.yml (required by Phase 3)
    Add pg dependency to Dockerfile npm install
    Health check: all services healthy within 60s
    Test: manual docker-compose up + curl /health + curl /metrics

  U-DEP2: CI/CD deploy stage + K8s manifests (Effort: 35)
    Fix ci.yml deploy stage: replace echo with actual deployment commands
    Add deploy/k8s/ directory:
      deployment.yaml — PRISM server deployment (2 replicas, resource limits)
      service.yaml — ClusterIP service on port 3000
      configmap.yaml — environment variables
      secret.yaml — template for DATABASE_URL, REDIS_URL, JWT_SECRET
      ingress.yaml — nginx ingress with TLS
    Add Helm chart skeleton (optional): deploy/helm/prism/
    Add docker-compose.dev.yml for local development (hot reload, debug ports)
    Test: kubectl apply --dry-run=client on all K8s manifests (valid YAML)

EXIT GATE:
  ✓ docker-compose build succeeds (no "production" stage error)
  ✓ docker-compose up starts all services (postgres, redis, prism, prometheus, grafana)
  ✓ /health returns 200 in container
  ✓ /metrics returns Prometheus format in container
  ✓ K8s manifests pass dry-run validation
  ✓ CI deploy stage has real deployment commands (not echo)
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-docker-build` — CI hook that runs docker build on Dockerfile changes
  Action: `infra_deploy_status` — return container health, image version, K8s pod status
  Skill: `/deploy-status` — deployment health dashboard

---

## Phase 9: ML Foundation (Model Serving, Feature Store, Training Pipeline)
### Findings addressed: #8 (no ML model serving)
### Requires: Phase 1 + Phase 2 complete

---

### SESSION INFRA-9-1: ONNX Runtime Model Serving (U-ML1, U-ML2)
```
SMART CONFIG: Role=ML engineering + manufacturing physics | OPUS | HIGH
UNITS: U-ML1, U-ML2
ESTIMATED CONTEXT: 50-60%
DEPENDENCIES: INFRA-2-1

KNOWLEDGE SOURCES:
  - No existing ONNX/TensorFlow references in src/
  - src/engines/PredictionCalibrationEngine.ts — Bayesian calibration (potential ML consumer)
  - src/engines/AdaptiveCalibrationEngine.ts — 6 calibration methods
  - src/engines/ChatterStabilityLobeEngine.ts — SLD generation (ML augmentation candidate)
  - src/engines/ToolWearProgressionEngine.ts — wear prediction (ML augmentation candidate)
  - ONNX Runtime Node.js documentation

INTENT:
  All "ML" in PRISM is parametric physics in TypeScript (Kienzle, Taylor, SLD).
  These are excellent physics models but they cannot learn from data beyond
  Bayesian constant calibration. ONNX Runtime enables deploying trained models
  (tool wear prediction from sensor data, chatter detection from audio, surface
  finish prediction from images) without adding Python/TensorFlow to the server.

WORK:
  U-ML1: ONNX Runtime integration + model registry (Effort: 40)
    npm install onnxruntime-node
    Create src/ml/ModelServer.ts — load ONNX models, run inference, cache sessions
    Create src/ml/ModelRegistry.ts — register models with metadata:
      { id, name, version, input_schema, output_schema, path, loaded }
    Create model storage: data/models/ directory
    Ship one starter model: tool-wear-classifier (pre-trained, exported as .onnx)
    Add health check: modelServer.getHealth() returns loaded models + inference latency
    Test: model-server.test.ts (load model, run inference, verify output shape)

  U-ML2: Feature store + training data pipeline (Effort: 35)
    Create src/ml/FeatureStore.ts — store feature vectors in Postgres
    Create migration 012-feature-store.sql:
      features table (entity_type, entity_id, feature_vector, timestamp)
    Pipeline: extract features from SpeedFeedOrchestrator results → store
    Pipeline: extract features from prediction_outcomes → training dataset export
    Export training data as CSV/Parquet for offline model training
    Test: feature-store.test.ts (store features, retrieve by entity, export dataset)

EXIT GATE:
  ✓ onnxruntime-node in package.json
  ✓ ModelServer loads and runs inference on starter model
  ✓ Model registry tracks loaded models with metadata
  ✓ Feature store persists feature vectors to Postgres
  ✓ Training data export pipeline produces valid dataset
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-model-registry` — warn if ML inference called without registered model
  Action: `infra_ml_status` — list loaded models, inference latency, feature store size
  Skill: `/ml-status` — ML model serving dashboard

---

## Phase 10: Knowledge Persistence (Graph DB, Tribal Knowledge Persistence)
### Findings addressed: #9 (knowledge graph rebuilt every restart)
### Requires: Phase 1 complete | PARALLEL with Phases 2-9

---

### SESSION INFRA-10-1: Persistent Knowledge Graph (U-KG1, U-KG2)
```
SMART CONFIG: Role=knowledge engineering + database | SONNET | HIGH
UNITS: U-KG1, U-KG2
ESTIMATED CONTEXT: 45-55%
DEPENDENCIES: INFRA-1-2

KNOWLEDGE SOURCES:
  - src/engines/ManufacturingKnowledgeGraphEngine.ts — in-memory graph, rebuilt every restart
  - src/db/schema.sql — no graph tables
  - PostgreSQL JSONB + recursive CTE capabilities (graph queries without graph DB)

INTENT:
  ManufacturingKnowledgeGraphEngine builds the entire knowledge graph in memory
  on every server restart. This means startup is slow, any graph mutations during
  runtime are lost, and the graph cannot grow beyond what fits in memory. We
  persist the graph to PostgreSQL using an adjacency list model with JSONB
  properties, enabling recursive CTE traversal for graph queries.

WORK:
  U-KG1: Graph persistence tables + migration (Effort: 30)
    Create migration 013-knowledge-graph.sql:
      kg_nodes (id, type, label, properties JSONB, created_at, updated_at)
      kg_edges (id, source_id FK, target_id FK, relation, weight, properties JSONB)
      Indexes: type, label, source_id, target_id, relation
    Create src/db/GraphStore.ts — CRUD for nodes/edges, batch upsert
    Add recursive CTE query: traverse(start_node, max_depth, relation_filter)
    Migrate existing in-memory graph data to Postgres on first startup
    Test: graph-store.test.ts (create nodes, add edges, traverse, verify depth)

  U-KG2: Wire ManufacturingKnowledgeGraphEngine to persistence (Effort: 30)
    Modify engine to use GraphStore as backing store instead of in-memory Maps
    Keep in-memory cache for hot-path reads (LRU, 10K nodes max)
    Write-through: mutations update both cache and Postgres
    Startup: load hot subgraph from Postgres (not full rebuild)
    Add incremental update: new engines/tips/formulas add nodes without full rebuild
    Fallback: pure in-memory mode when DATABASE_URL not set
    Test: knowledge-graph-persistent.test.ts (restart server, verify graph survives)

EXIT GATE:
  ✓ Knowledge graph persisted in PostgreSQL
  ✓ Graph survives server restart (no full rebuild)
  ✓ Recursive traversal queries work (find all nodes within 3 hops of "Kienzle")
  ✓ In-memory cache provides sub-10ms reads for hot nodes
  ✓ Incremental updates add nodes without rebuild
  ✓ Fallback to pure in-memory without Postgres
  ✓ 2 new test files pass
  ✓ npx tsc --noEmit → 0 errors
```

FORGE-TRIPLE:
  Hook: `enforce-graph-persistence` — warn if knowledge graph mutations skip GraphStore
  Action: `infra_graph_stats` — node count, edge count, traversal latency, cache hit rate
  Skill: `/graph-health` — knowledge graph health and statistics

---

---

## Summary: Session & Unit Matrix

| Session ID | Title | Units | Deps | Effort Total | Finding(s) |
|-----------|-------|-------|------|-------------|------------|
| INFRA-1-1 | PostgreSQL Connection & Package Wiring | U-DB1 (25), U-DB2 (35) | None | 60 | #1 |
| INFRA-1-2 | Persistence Bridge Hardening + Data Seeding | U-DB3 (30), U-DB4 (35) | 1-1 | 65 | #1 |
| INFRA-2-1 | pgvector Extension + Embedding Pipeline | U-VEC1 (25), U-VEC2 (40), U-VEC3 (35) | 1-2 | 100 | #2 |
| INFRA-3-1 | Redis-Backed Auth Store + Tier Enforcement | U-AUTH1 (40), U-AUTH2 (35) | 1-1 | 75 | #4, #7 |
| INFRA-4-1 | BullMQ Durable Job Queue | U-JQ1 (35), U-JQ2 (40) | 3-1 | 75 | #5 |
| INFRA-4-2 | Durable Event Bus | U-EB1 (35), U-EB2 (30) | 3-1 | 65 | #6 |
| INFRA-5-1 | Wire Calibration into Orchestrator | U-CAL1 (30), U-CAL2 (40), U-CAL3 (35) | 1-2 | 105 | #3 |
| INFRA-6-1 | OpenTelemetry Metrics + Prometheus Endpoint | U-OBS1 (35), U-OBS2 (30) | 4-2 | 65 | #12 partial |
| INFRA-7-1 | Auto-Generated OpenAPI from Zod | U-API1 (35), U-API2 (20) | 1-1 | 55 | #10 |
| INFRA-7-2 | Plugin SDK Fix + Plugin Manifest | U-PLG1 (20), U-PLG2 (30) | 1-1 | 50 | #11 |
| INFRA-8-1 | Docker Build Fix + CI/CD + K8s | U-DEP1 (25), U-DEP2 (35) | 6-1 | 60 | #12 |
| INFRA-9-1 | ONNX Runtime Model Serving | U-ML1 (40), U-ML2 (35) | 2-1 | 75 | #8 |
| INFRA-10-1 | Persistent Knowledge Graph | U-KG1 (30), U-KG2 (30) | 1-2 | 60 | #9 |

**Totals: 13 sessions, 32 units, combined effort score 910**

---

## New Dependencies Introduced (npm packages)

| Package | Phase | Purpose |
|---------|-------|---------|
| pg, @types/pg | P1 | PostgreSQL client |
| ioredis | P3 | Redis client for auth, rate limits, event bus, job queue |
| bullmq | P4 | Durable job queue |
| @opentelemetry/api, @opentelemetry/sdk-metrics, @opentelemetry/exporter-prometheus | P6 | Metrics |
| swagger-ui-express | P7 | OpenAPI documentation UI |
| onnxruntime-node | P9 | ML model inference |

## New Database Migrations

| Migration | Phase | Tables Created |
|-----------|-------|---------------|
| 010-pgvector.sql | P2 | tribal_knowledge_embeddings |
| 011-prediction-outcomes.sql | P5 | prediction_outcomes |
| 012-feature-store.sql | P9 | features |
| 013-knowledge-graph.sql | P10 | kg_nodes, kg_edges |

## Docker-Compose Services (after all phases)

| Service | Image | Purpose |
|---------|-------|---------|
| postgres | postgres:16-alpine (existing) | Primary database |
| redis | redis:7-alpine (new) | Auth tokens, rate limits, job queue, event bus |
| prism-server | prism-mcp (fixed) | PRISM MCP server |
| prometheus | prom/prometheus (existing) | Metrics collection |
| grafana | grafana/grafana (existing) | Dashboards |

---

## Execution Strategy

### Critical Path (sequential, blocks everything)
```
INFRA-1-1 → INFRA-1-2 → (everything else can branch)
```

### Recommended Execution Order (balances dependencies + parallelism)
```
Sprint 1 (week 1-2):  INFRA-1-1, INFRA-1-2 (data foundation — blocks all)
Sprint 2 (week 3-4):  INFRA-3-1, INFRA-7-1, INFRA-7-2 (auth + API, parallel)
Sprint 3 (week 5-6):  INFRA-4-1, INFRA-4-2, INFRA-5-1 (async + feedback, parallel)
Sprint 4 (week 7-8):  INFRA-2-1, INFRA-10-1 (search + graph, parallel)
Sprint 5 (week 9-10): INFRA-6-1, INFRA-8-1 (observability + deploy)
Sprint 6 (week 11-12): INFRA-9-1 (ML foundation)
```

### Risk Mitigation
- Phase 1 is the single point of failure — if pg integration fails, all else blocks
- Redis is required by Phases 3, 4 — add Redis to docker-compose early (Phase 3)
- pgvector requires Postgres extension support — verify docker image supports it
- ONNX Runtime has native bindings — verify it builds in Alpine Docker image
- All phases maintain fallback to in-memory mode for local development

### Finding Coverage Verification

| Finding | Phase | Session(s) | Status |
|---------|-------|-----------|--------|
| #1 PostgreSQL dead code | P1 | INFRA-1-1, INFRA-1-2 | Fully addressed |
| #2 Semantic search missing | P2 | INFRA-2-1 | Fully addressed |
| #3 Feedback loop unwired | P5 | INFRA-5-1 | Fully addressed |
| #4 Auth tokens in memory | P3 | INFRA-3-1 | Fully addressed |
| #5 No durable job queue | P4 | INFRA-4-1 | Fully addressed |
| #6 No durable event bus | P4 | INFRA-4-2 | Fully addressed |
| #7 Tier gating not enforced | P3 | INFRA-3-1 | Fully addressed |
| #8 No ML model serving | P9 | INFRA-9-1 | Fully addressed |
| #9 Knowledge graph rebuilt | P10 | INFRA-10-1 | Fully addressed |
| #10 OpenAPI hand-written | P7 | INFRA-7-1 | Fully addressed |
| #11 No plugin isolation | P7 | INFRA-7-2 | Fully addressed |
| #12 Docker deploy broken | P8 | INFRA-8-1 | Fully addressed |
