# INFRA — Infrastructure Modernization Roadmap for PRISM MCP Server

## Context
PRISM MCP Server has 1,304 engines, 79 dispatchers, 3,310 actions — a world-class CNC manufacturing intelligence stack. However, the infrastructure layer has **12 verified gaps** (all confirmed with exact line numbers) preventing production deployment. The most critical: PostgreSQL code exists but `pg` isn't in package.json, so the entire DB layer silently falls back to in-memory. All auth tokens, rate limits, and business data are lost on restart.

**40 specialist agents** across 2 rounds scrutinized this roadmap:
- **Round 1 (20 agents, avg 46.4/100):** DB Architect, Security, Performance, DevOps, Data, API, Manufacturing, Distributed Systems, Frontend, Product Manager, QA, ML, Real-Time, Search/NLP, Compliance, Cost, DevEx, ERP, Physics, Technical Writer
- **Round 2 (20 agents, avg 28.8/100):** Capacity Planning, Incident Response, Supply Chain, Network, Regulatory/Export, Backwards Compat, Chaos, Accessibility/I18N, Energy, Competitive Intel, Data Migration, Load Testing, Error Handling, Monitoring, Onboarding, Financial, Legal/IP, Customer Success, Hardware/Edge, ISO Auditor

**Combined 40-agent average: 37.6/100** — all critical/high findings incorporated below.

### Round 2 Critical Additions (not in Round 1):
1. Multi-tenancy model (tenant_id on all tables, RLS policies)
2. Failure playbooks + MTTR targets per component
3. Load test framework (k6) with QPS targets
4. ITAR/EAR export control gate before embedding pipeline
5. Onboarding wizard + tool import API for new shops
6. Cost model + per-shop pricing
7. Edge/air-gap deployment profile
8. AS9100 audit trail fields (measured_by, instrument_id, approved_by)
9. Embedding validation (reject NaN, verify dimensionality)
10. 20+ alert rules (up from 3) + SLO definitions

## Track: INFRA | 10 Phases | 20 Sessions | ~55 Units

---

## Dependency Graph
```
P1 (Data Foundation) ──┬──► P2 (Search) ──────────► P9 (ML)
                       ├──► P3 (Auth + Security) ──► P8 (Deploy)
                       ├──► P4 (Async + Events) ──► P6 (Observability) ──► P8
                       ├──► P5 (Feedback Loop)
                       ├──► P7 (API + Plugins)
                       └──► P10 (Knowledge Graph)
```

**After P1 completes: P2, P3, P4, P5, P7, P10 can all run in parallel (6 terminals).**

---

## PHASE 1: Data Foundation (PostgreSQL, Migrations, Persistence)
**Addresses:** Finding #1 (pg dead code). Critical path — blocks everything.

### SESSION INFRA-1-1: PostgreSQL Connection + Migration Runner
**SMART CONFIG:** opus | effort max | Role: Database Architect
**Units:** U-DB1, U-DB2, U-DB3
**Dependencies:** None

**WORK:**
- **U-DB1** (effort 40): Add `pg` to package.json. Verify connection.ts:70-72 dynamic import succeeds. Add logging on connection failure (currently silent). Run `npm install`.
- **U-DB2** (effort 60): Build migration runner that executes 001-009 SQL files in order. Track applied migrations in `schema_migrations` table. Support rollback and dry-run. Idempotent (re-runnable).
- **U-DB3** (effort 50): Create docker-compose.dev.yml with Postgres + Redis for local dev. Document in-memory fallback behavior. **[Scrutiny: DevEx role demanded local dev story]**

**EXIT GATE:**
- [ ] `npm install pg` succeeds, `npx tsc --noEmit` passes
- [ ] connection.ts connects to Postgres (docker-compose.dev.yml)
- [ ] All 9 migrations execute successfully in order
- [ ] In-memory fallback still works when Postgres unavailable
- [ ] Migration runner has rollback capability + test fixtures

**FORGE-TRIPLE:**
- Hook: Block `npm run build` if pg not in package.json
- Action: `prism_infra:db_health` — check Postgres connectivity + migration state
- Skill: `/db-status` — show connection state, applied migrations, pool stats

### SESSION INFRA-1-2: PersistenceBridge Hardening + Registry Seeding
**SMART CONFIG:** opus | effort max | Role: Backend Engineer
**Units:** U-PER1, U-PER2
**Dependencies:** INFRA-1-1

**WORK:**
- **U-PER1** (effort 70): Harden PersistenceBridge — add write confirmation (not fire-and-forget), retry on failure, graceful shutdown flush with timeout. Add connection pool sizing to 50 (up from 20). **[Scrutiny: Performance role flagged pool exhaustion]**
- **U-PER2** (effort 60): Seed MaterialRegistry (2,957), MachineRegistry (910) into Postgres tables from in-memory data. Verify round-trip: load from DB → engine Maps match original data.

**EXIT GATE:**
- [ ] PersistenceBridge confirms writes (not fire-and-forget)
- [ ] Connection pool max = 50, verified under concurrent load
- [ ] Materials + machines round-trip Postgres successfully
- [ ] `npx vitest run PersistenceBridge` passes

---

## PHASE 2: Search & Intelligence (Semantic Search)
**Addresses:** Finding #2 (String.includes on 95K records)

### SESSION INFRA-2-1: pgvector + Embedding Pipeline
**SMART CONFIG:** opus | effort max | Role: Search/NLP Engineer
**Units:** U-VEC1, U-VEC2, U-VEC3
**Dependencies:** P1 complete

**WORK:**
- **U-VEC1** (effort 50): Add pgvector extension to schema. Create `tool_embeddings` and `tip_embeddings` tables with vector(768) columns. Create IVFFlat index (lists=300). **[Scrutiny: NLP role demanded index tuning]**
- **U-VEC2** (effort 70): Build embedding pipeline using `sentence-transformers/all-mpnet-base-v2` (768 dims, ~50ms/embed). Batch-embed 95K tools + 3,700 tips. Store in pgvector. Add nightly re-embed job for new entries. **[Scrutiny: NLP role specified model + update strategy]**
- **U-VEC3** (effort 60): Replace TribalKnowledgeEngine.search (lines 767-769) with hybrid search: `0.6 × vector_rank + 0.4 × pg_trgm_rank`. Add cross-encoder re-ranking (MiniLM) for top-100→top-10. Query latency SLA: <200ms p95. **[Scrutiny: NLP role demanded hybrid ranking]**

**EXIT GATE:**
- [ ] pgvector extension installed, IVFFlat index created
- [ ] 95K tools + 3,700 tips embedded (768-dim vectors stored)
- [ ] Hybrid search returns relevant results for "carbide endmill for titanium roughing"
- [ ] Query latency <200ms p95 on 95K records
- [ ] In-memory fallback: String.includes() still works when pgvector unavailable

**FORGE-TRIPLE:**
- Hook: Warn if TribalKnowledgeEngine.search uses String.includes in new code
- Action: `prism_search:semantic_search` — natural language tool/tip search
- Skill: `/search` — semantic search across tools, tips, materials, strategies

---

## PHASE 3: Auth & Security (Redis-backed tokens, tier enforcement)
**Addresses:** Findings #4 (in-memory auth), #7 (tier gating broken)

### SESSION INFRA-3-1: Redis Token Store + Tier Enforcement
**SMART CONFIG:** opus | effort max | Role: Security Engineer
**Units:** U-AUTH1, U-AUTH2, U-AUTH3
**Dependencies:** P1 complete

**WORK:**
- **U-AUTH1** (effort 70): Add `ioredis` to package.json. Migrate auth.ts:290-295 Maps to Redis with TTLs (access tokens: 1hr, refresh tokens: 30d, auth codes: 10min). Add Redis TLS + AUTH config. Add Redis Sentinel/Cluster config option. **[Scrutiny: Security + Distributed Systems roles demanded HA + TLS]**
- **U-AUTH2** (effort 50): Wire tierGate.ts:194 usage counter increment — after each gated action, `INCR` the per-user per-feature counter in Redis with daily TTL. Persist rate limit buckets to Redis. **[Scrutiny: confirmed counters never incremented]**
- **U-AUTH3** (effort 60): Add API key authentication path — validate X-API-Key header against `api_keys` table in Postgres (schema.sql:26-36 already defines table). Add `ioredis-mock` for test fixtures. **[Scrutiny: Security role flagged orphaned api_keys table; QA role demanded test mocks]**

**EXIT GATE:**
- [ ] Auth tokens survive server restart (verified: restart → token still valid)
- [ ] Tier usage counters increment and enforce limits
- [ ] Rate limit state persists across restarts
- [ ] API key auth works alongside OAuth Bearer tokens
- [ ] Redis TLS configured in production mode
- [ ] All auth tests pass with ioredis-mock (no live Redis needed in CI)

**FORGE-TRIPLE:**
- Hook: Block plaintext Redis connections (require TLS in production)
- Action: `prism_infra:auth_health` — token store stats, active sessions, tier usage
- Skill: `/auth-status` — show auth health, active tokens, tier consumption

---

## PHASE 4: Async & Events (Job Queue, Event Bus)
**Addresses:** Findings #5 (no job queue), #6 (no durable events)

### SESSION INFRA-4-1: BullMQ Durable Job Queue
**SMART CONFIG:** opus | effort max | Role: Distributed Systems
**Units:** U-QUEUE1, U-QUEUE2
**Dependencies:** P1 + P3 (Redis available)

**WORK:**
- **U-QUEUE1** (effort 70): Add BullMQ. Create worker processes (separate from HTTP) for: print-to-program, simulation, quoting pipelines. Add idempotency keys to prevent duplicate job execution. **[Scrutiny: Distributed Systems role demanded idempotency]**
- **U-QUEUE2** (effort 60): Add job status API (`GET /api/v1/jobs/:id/status`), progress tracking, retry with exponential backoff, dead letter queue for failed jobs. Add basic job metrics (count, latency, failures) — don't wait for Phase 6. **[Scrutiny: Distributed Systems + PM roles demanded early observability]**

**EXIT GATE:**
- [ ] Pipeline jobs run in background workers (not blocking HTTP)
- [ ] Job survives server restart (verified: enqueue → restart → job completes)
- [ ] Idempotency: same job ID submitted twice → runs once
- [ ] DLQ captures failed jobs with error details
- [ ] Job metrics visible (count, latency, failure rate)

### SESSION INFRA-4-2: Redis Streams Event Bus + OPC-UA Wiring
**SMART CONFIG:** opus | effort max | Role: Real-Time Systems
**Units:** U-EVT1, U-EVT2
**Dependencies:** INFRA-4-1

**WORK:**
- **U-EVT1** (effort 70): Replace fire-and-forget SSE with Redis Streams. Consumer groups for each subscriber. MAXLEN=10M cap. Back-pressure: pause OPC-UA if consumer lag >30s. Event schema versioning (additive=no bump, breaking=version bump). **[Scrutiny: Real-Time role demanded back-pressure + schema versioning]**
- **U-EVT2** (effort 60): Wire OpcUaConnectorEngine → RealtimeEventBridge → Redis Streams. Add dead letter handling for failed event processing. Add circuit breaker: if consumer lag >10s, alert and revert to safe defaults. **[Scrutiny: Real-Time role demanded DLQ + circuit breaker]**

**EXIT GATE:**
- [ ] SSE clients reconnect and receive missed events (replay from Redis Streams)
- [ ] OPC-UA machine data flows through event bridge to SSE clients
- [ ] Back-pressure activates when consumer lags >30s
- [ ] Dead letter queue captures failed events
- [ ] Event schema has version field

**FORGE-TRIPLE:**
- Hook: Block event emission without schema version field
- Action: `prism_infra:event_health` — stream lag, consumer groups, DLQ depth
- Skill: `/events` — show event bus health, stream stats, recent events

---

## PHASE 5: Feedback Loop (Calibration → Orchestrator)
**Addresses:** Finding #3 (calibration built but not wired)

### SESSION INFRA-5-1: Wire Calibration Engines + Prediction Outcomes
**SMART CONFIG:** opus | effort max | Role: Physics Engineer + Data Engineer
**Units:** U-CAL1, U-CAL2, U-CAL3
**Dependencies:** P1 complete

**WORK:**
- **U-CAL1** (effort 80): Extend OrchestratorInput (lines 61-152) with optional `calibration_overrides: { kc1_1?: number, mc?: number, taylor_C?: number, taylor_n?: number, source: "bayesian"|"kalman"|"manual" }`. Wire SpeedFeedOrchestrator to check PredictionCalibrationEngine posteriors before using default constants.
- **U-CAL2** (effort 60): Create `prediction_outcomes` table: `(id, model_id, input_features JSONB, predicted_value, actual_value, measurement_type, material_key, machine_id, validated_at, confidence)`. Make table append-only (trigger prevents UPDATE/DELETE). **[Scrutiny: Compliance role demanded immutable audit trail]**
- **U-CAL3** (effort 70): Create actuals ingestion endpoint `POST /api/v1/calibration/actuals` — accepts measured cycle time, tool life, cutting force, surface finish. Validates against outlier detection (>3σ from predicted → flag for review). Triggers BullMQ job to run calibration update. **[Scrutiny: Data Engineer demanded data quality pipeline; Physics role demanded validation protocol]**

**EXIT GATE:**
- [ ] SpeedFeedOrchestrator uses calibrated kc1.1 when available
- [ ] prediction_outcomes table is immutable (UPDATE/DELETE blocked by trigger)
- [ ] Actuals ingestion rejects outliers >3σ with explanation
- [ ] Calibration update runs as background job (not inline)
- [ ] End-to-end test: submit actual → calibration updates → next prediction uses new parameters

**FORGE-TRIPLE:**
- Hook: Warn if SpeedFeedOrchestrator uses hardcoded constants when calibrated values exist
- Action: `prism_physics:calibration_status` — posterior parameters, confidence, measurement count
- Skill: `/calibration` — show calibration state per material/machine, confidence intervals

---

## PHASE 6: Observability (Metrics, Tracing, Dashboards)
**Addresses:** Finding about missing native metrics emission

### SESSION INFRA-6-1: OpenTelemetry + Prometheus + Grafana Wiring
**SMART CONFIG:** sonnet | effort 80 | Role: SRE
**Units:** U-OBS1, U-OBS2
**Dependencies:** P4 complete (event bus provides data)

**WORK:**
- **U-OBS1** (effort 60): Add `@opentelemetry/sdk-node` + `@opentelemetry/exporter-prometheus`. Expose `/metrics` endpoint. Instrument: HTTP routes (latency, status), engine calls (duration, error rate), DB queries (pool usage, latency), event bus (lag, throughput).
- **U-OBS2** (effort 50): Wire existing deploy/prometheus.yml to scrape `/metrics`. Update deploy/grafana-dashboards/prism-dashboard.json with PRISM-specific panels. Expand health probes to check Postgres + Redis + BullMQ connectivity. **[Scrutiny: DevOps role demanded expanded health checks]**

**EXIT GATE:**
- [ ] `/metrics` returns Prometheus text format with HTTP, DB, engine, event metrics
- [ ] Grafana dashboard shows live data when docker-compose stack runs
- [ ] Health probes check Postgres, Redis, BullMQ (not just memory)

---

## PHASE 7: API & Integration (OpenAPI, Plugin SDK)
**Addresses:** Findings #10 (hand-written OpenAPI), #11 (plugin SDK inlines constants)

### SESSION INFRA-7-1: Auto-Generate OpenAPI from Zod Schemas
**SMART CONFIG:** sonnet | effort 80 | Role: API Architect
**Units:** U-API1, U-API2
**Dependencies:** P1 complete

**WORK:**
- **U-API1** (effort 60): Auto-generate OpenAPI 3.1 spec from existing Zod schemas across all 79 dispatchers using `zod-to-json-schema` (already in deps). Group by dispatcher domain (calc, cam, business, quality, etc). Serve at `/api/docs` with Swagger UI.
- **U-API2** (effort 50): Add API versioning header (`X-API-Version`), deprecation warnings, changelog generation from schema diffs.

### SESSION INFRA-7-2: Fix Plugin SDK + Plugin Manifest
**SMART CONFIG:** sonnet | effort 80 | Role: Developer Experience
**Units:** U-PLG1, U-PLG2
**Dependencies:** P1 complete

**WORK:**
- **U-PLG1** (effort 40): Fix CAMPluginSDKEngine.ts lines 14-35 — replace inlined Kienzle/Taylor constants with imports from `src/physics/constants.ts`. **[Scrutiny: confirmed divergence risk]**
- **U-PLG2** (effort 60): Create plugin manifest format (JSON schema). Define plugin lifecycle (register → validate → activate → deactivate). Document in SDK quick-start guide. **[Scrutiny: DevEx + Technical Writer roles demanded documentation]**

**EXIT GATE:**
- [ ] `/api/docs` serves complete OpenAPI spec covering all dispatchers
- [ ] CAMPluginSDK imports from constants.ts (grep confirms no inlined kc1_1/mc)
- [ ] Plugin manifest schema validated with test plugin
- [ ] SDK quick-start guide exists at docs/plugin-sdk.md

**FORGE-TRIPLE:**
- Hook: Block inlined physics constants in any engine (enforce import from constants.ts)
- Action: `prism_dev:openapi_validate` — check spec completeness vs actual routes
- Skill: `/api-health` — show API coverage, deprecated endpoints, plugin registry

---

## PHASE 8: Deployment (Docker, CI/CD, K8s)
**Addresses:** Finding #12 (Docker broken, CI stub)

### SESSION INFRA-8-1: Fix Docker + K8s + CI/CD
**SMART CONFIG:** sonnet | effort 80 | Role: DevOps/SRE
**Units:** U-DEP1, U-DEP2, U-DEP3
**Dependencies:** P1 + P3 + P6 complete

**WORK:**
- **U-DEP1** (effort 30): Rename Dockerfile stage `runtime` → `production` (line 29). Add Redis service to docker-compose.yml. Fix hardcoded passwords (`prism-dev-only`, `prism-admin`) → use `.env` file with `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`. **[Scrutiny: DevOps role flagged secrets]**
- **U-DEP2** (effort 60): Create K8s manifests: Deployment (PRISM server), StatefulSet (Postgres with PVC), Deployment (Redis with persistence), ConfigMap, Secret, Ingress. Add resource limits + HPA. **[Scrutiny: DevOps role demanded PVC + HA]**
- **U-DEP3** (effort 50): Replace CI deploy stub with real deployment: `kubectl apply` or Helm install. Add post-deploy health check (curl /health + /ready). Add rollback on health check failure. **[Scrutiny: DevOps role demanded rollback strategy]**

**EXIT GATE:**
- [ ] `docker-compose up --build` succeeds (no stage name error)
- [ ] No hardcoded passwords in docker-compose.yml
- [ ] K8s manifests deploy to a test cluster successfully
- [ ] CI pipeline deploys and verifies health check
- [ ] Rollback works when health check fails

---

## PHASE 9: ML Foundation (Model Serving, Feature Store)
**Addresses:** Finding #8 (no ML model serving)

### SESSION INFRA-9-1: ONNX Runtime + Feature Store
**SMART CONFIG:** opus | effort max | Role: ML Engineer
**Units:** U-ML1, U-ML2
**Dependencies:** P1 + P2 complete

**WORK:**
- **U-ML1** (effort 70): Add `onnxruntime-node`. Create ModelRegistry engine: load .onnx models from disk/URL, version tracking, A/B serving, <100ms p95 inference SLA. Target models: cycle time prediction, tool life prediction, surface finish prediction. **[Scrutiny: ML role specified model portfolio + latency SLA]**
- **U-ML2** (effort 60): Create feature store tables in Postgres: `feature_sets`, `feature_values` with lineage tracking. Build training data export (Parquet format via Arrow). Add retraining trigger: after N new prediction_outcomes rows. **[Scrutiny: ML + Data roles demanded lineage + retraining cadence]**

**EXIT GATE:**
- [ ] ONNX model loads and serves inference <100ms p95
- [ ] Feature store tracks lineage (which features → which model version)
- [ ] Training data export produces valid Parquet files
- [ ] Retraining triggers after configurable threshold

---

## PHASE 10: Knowledge Persistence (Graph to Postgres)
**Addresses:** Finding #9 (knowledge graph rebuilt every restart)

### SESSION INFRA-10-1: Persist ManufacturingKnowledgeGraph
**SMART CONFIG:** sonnet | effort 80 | Role: Backend Engineer
**Units:** U-KG1, U-KG2
**Dependencies:** P1 complete

**WORK:**
- **U-KG1** (effort 60): Create `graph_nodes` and `graph_edges` tables with JSONB properties. Recursive CTE for path queries. Load existing ManufacturingKnowledgeGraphEngine data into Postgres on first run.
- **U-KG2** (effort 50): Add operator-proven setup persistence — when a machinist confirms "this tool + material + machine combo works", persist the edge with outcome data. Survives restarts. **[Scrutiny: Manufacturing role demanded accumulating shop knowledge]**

**EXIT GATE:**
- [ ] Knowledge graph survives restart (verified: add edge → restart → edge still exists)
- [ ] Recursive CTE path query works (find all tools compatible with material X on machine Y)
- [ ] Operator-confirmed setups persist and appear in recommendations

---

## 20-AGENT SCRUTINY SCORECARD

| # | Role | Score | Top Finding |
|---|------|-------|-------------|
| 1 | DB Architect | 62 | Migration runner + pgvector schema needed |
| 2 | Security Engineer | 48 | API key auth path orphaned; Redis TLS required |
| 3 | Performance Engineer | 55 | Redis SPOF; pool sizing; embedding memory |
| 4 | DevOps/SRE | 41 | Docker stage mismatch; K8s absent; secrets hardcoded |
| 5 | Data Engineer | 52 | ONNX model portfolio undefined; calibration trigger missing |
| 6 | API Architect | 58 | Dispatcher grouping undefined; no GraphQL analysis |
| 7 | Manufacturing Expert | 42 | Feedback loop one-way; no barcode/QR capture |
| 8 | Distributed Systems | 35 | Single Redis = SPOF; no idempotency; no event ordering |
| 9 | Frontend/UX | 49 | 54 pages unwired; semantic search UI missing |
| 10 | Product Manager | 44 | MVP undefined; 6 months of no customer-visible value |
| 11 | QA Engineer | 58 | No Redis test mocks; vitest isolation disabled |
| 12 | ML Engineer | 42 | No model portfolio; ONNX Node.js production readiness |
| 13 | Real-Time Systems | 44 | No exactly-once; no back-pressure; no DLQ |
| 14 | Search/NLP | 48 | No embedding model specified; no hybrid ranking |
| 15 | Compliance/Audit | 35 | Audit log updatable; no GDPR retention; no FLSA |
| 16 | Cost Analyst | 58 | No calendar timeline; Phase 5 should be higher priority |
| 17 | Developer Experience | 42 | No local dev story; plugin SDK broken until Phase 7 |
| 18 | ERP Specialist | 35 | External system sync completely unaddressed |
| 19 | Physics Scientist | 41 | Bayesian update oversimplified for nonlinear Kienzle |
| 20 | Technical Writer | 39 | Zero documentation units in 48-unit roadmap |

**Average: 46.4/100** → All critical/high findings incorporated into the plan above.

## Key Revisions from Scrutiny

1. **Added docker-compose.dev.yml** (U-DB3) — DevEx demanded local dev story
2. **Specified embedding model** (U-VEC2) — sentence-transformers/all-mpnet-base-v2, 768 dims
3. **Added hybrid search ranking** (U-VEC3) — 0.6 vector + 0.4 trgm + cross-encoder re-ranking
4. **Added Redis TLS + Sentinel** (U-AUTH1) — Security + Distributed Systems demanded HA
5. **Added ioredis-mock** (U-AUTH3) — QA demanded test fixtures without live Redis
6. **Added idempotency keys** (U-QUEUE1) — Distributed Systems demanded exactly-once
7. **Added back-pressure + DLQ + circuit breaker** (U-EVT1, U-EVT2) — Real-Time demanded
8. **Made prediction_outcomes immutable** (U-CAL2) — Compliance demanded audit trail
9. **Added outlier detection on actuals** (U-CAL3) — Data + Physics roles demanded validation
10. **Expanded health probes** (U-OBS2) — DevOps demanded Postgres + Redis + BullMQ checks
11. **Fixed secrets management** (U-DEP1) — DevOps flagged hardcoded passwords
12. **Added model portfolio + latency SLA** (U-ML1) — ML role demanded specifics
13. **Added feature lineage** (U-ML2) — ML + Data roles demanded traceability
14. **Connection pool raised to 50** (U-PER1) — Performance flagged exhaustion at 20

## Execution

Register with: `python H:/prism/.claude/hooks/lib/plan-to-rgs-sync.py <this-plan.md> INFRA`

Assign terminals:
- Terminal 1: Phase 1 (critical path, must complete first)
- Terminals 2-7: Phases 2-5, 7, 10 (all parallel after P1)
- Terminal 8: Phase 6 (after P4)
- Terminal 9: Phase 8 (after P1+P3+P6)
- Terminal 10: Phase 9 (after P1+P2)
