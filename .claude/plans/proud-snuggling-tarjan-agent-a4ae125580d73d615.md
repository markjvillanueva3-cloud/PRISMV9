# PRISM Infra Roadmap: 5-Role Scrutiny Reviews

## Context Snapshot
- **Frontend**: 54 pages in /web/src/pages/ (45 listed above are partial implementation)
- **Dispatchers**: 79 dispatchers across ~42K LOC with 3,310 total actions
- **Scope**: 10 phases, 13 sessions, 32 units covering DB, cache, vector embeddings, job queues, telemetry, K8s
- **Tribal Knowledge**: 3,700+ tips in TribalKnowledgeEngine (lines 744-776 show faceted search)
- **SpeedFeedOrchestrator**: 2,851 lines, hub wiring 67 integration points, atomic value pattern

## Reviews to Conduct

### ROLE 6: API Design Architect
**Question**: With 3,310 actions across 79 dispatchers, how are they grouped in OpenAPI? GraphQL layer? Developer discovery & testing? Versioning?

**Data Points to Validate**:
- Count actual dispatchers (79) and approximate action distribution
- Review dispatcher naming patterns (contextDispatcher, authDispatcher, etc.)
- Check if Zod schemas exist per action (they should per CLAUDE.md rules)
- Examine SpeedFeedOrchestrator interface for type-safety patterns
- Assess current discoverability: are actions self-documenting or hidden?

**Expected Findings**:
- Grouping likely by domain (auth, telemetry, tools, etc.) not REST principles
- No GraphQL layer visible yet; Phase 7 mentions "auto-generate OpenAPI from Zod"
- Discovery likely manual or schema-introspection only
- Versioning strategy unclear from roadmap

### ROLE 7: Manufacturing Domain Expert
**Question**: Will semantic search (Phase 2: pgvector on 95K tools + 3.7K tribal tips) actually help machinists? Feedback loop? Barcode/QR integration? UI for shop floor tablets?

**Data Points to Validate**:
- TribalKnowledgeEngine search implementation (lines 744-776) — faceted by material, operation, machine, confidence
- No barcode/QR fields in KnowledgeTip schema visible
- No shop floor UX documented in roadmap or visible pages
- Feedback loop: who enters actual measurement data? (CaptureOpsPage exists)
- Phase 2 is early; e-search UX may be theoretical

**Expected Findings**:
- Search engine exists but lacks domain-specific tuning (no barcodes, no operator workflow)
- CaptureOpsPage may provide the "feedback loop" but integration unclear
- No mention of shop floor tablet constraints (touch, offline, network lag)
- Semantic search trained on what? (Tribal tips only? Or full 95K tools?)

### ROLE 8: Distributed Systems Architect
**Question**: Single Redis instance — single point of failure? Graceful degradation when down? BullMQ worker isolation & event ordering? Idempotency?

**Data Points to Validate**:
- Phase 3: Redis for auth tokens + tier counters + rate limits (no replication mentioned)
- Phase 4: BullMQ + Redis Streams event bus
- No mention of Redis Cluster, Sentinel, or failover in roadmap
- Idempotency requirements for BullMQ jobs (mandatory for safety-critical CNC system)
- Event ordering guarantees with Redis Streams (default: order per stream key)

**Expected Findings**:
- Single Redis creates bottleneck risk in manufacturing environment
- Graceful degradation strategy missing (fallback to in-memory? Postgres?)
- BullMQ likely single-process (Node.js threads not recommended); no multi-worker strategy
- Idempotency not mentioned anywhere in roadmap — critical gap for manufacturing
- Event ordering per-dispatcher is assumed but not proven

### ROLE 9: Frontend/UX Engineer
**Question**: 54 pages exist but "most unwired." How does infra roadmap unblock them? Real-time event bus benefits frontend? Semantic search UI? Feedback loop UI?

**Data Points to Validate**:
- Page files: JobPlannerPage, CaptureOpsPage, DashboardPage, etc. — 54 total
- None are known to be "wired" to backend (roadmap assumes Phase 7+ unlocks this)
- Phase 4 adds Redis Streams event bus — enables real-time WebSocket/SSE?
- Phase 2 semantic search needs UI component (not mentioned)
- Feedback loop UI would live where? (CaptureOpsPage? New page?)

**Expected Findings**:
- Pages exist but lack backend integration specs
- Real-time event bus (Phase 4) could unblock live dashboards but no UI roadmap exists
- Semantic search UI deferred; no design or wireframe visible
- Feedback loop UI assumed to be CaptureOpsPage but not validated against UX needs
- Frontend-blocking dependencies poorly sequenced relative to backend phases

### ROLE 10: Product Manager
**Question**: Prioritization correct? Ship user-facing features (semantic search, dashboards) before infra (OpenTelemetry, K8s)? What's MVP? What can be cut?

**Data Points to Validate**:
- Phase 1-3: Backend groundwork (DB, embeddings, cache)
- Phase 4: Job queue + event bus (enables async work, real-time features)
- Phase 6: Observability (OpenTelemetry, Prometheus, Grafana)
- Phase 7: API auto-generation + fixes
- Phase 8: Containerization (Docker, K8s)
- User-facing features: semantic search (Phase 2), real-time dashboards (Phase 4+), feedback loop (Phase 5?)

**Expected Findings**:
- Phases 1-3 are necessary but invisible to users (data + speed)
- Phase 4 (event bus) is critical for Phase 9 features (real-time dashboards)
- Phase 6-8 (observability, containerization) can be cut or deferred without losing MVP
- Semantic search (Phase 2) ships but with limited UX (Phase 7+)
- Roadmap optimizes for technical debt cleanup, not user value delivery
- MVP candidate: Phases 1-4 + 7 (core backend + API + basic UX)

## Scoring Framework

**100-80**: Thoroughly thought-through, all major concerns addressed, clear sequencing
**79-60**: Good overall, 2-4 gaps or risks, mitigation strategies suggested
**60-40**: Partial coverage, significant gaps, concerning interdependencies or risks
**39-20**: Major gaps, risks not acknowledged, poor sequencing
**<20**: Fundamental misalignment, critical dependencies missing, unsafe assumptions

## Severity Levels
- **CRITICAL**: Blocks shipping, safety risk, or single point of failure unaddressed
- **HIGH**: Feature incomplete, major risk, poor UX consequence, or backwards-incompatible change
- **MEDIUM**: Performance concern, missing documentation, or workflow inefficiency

---

## Analysis Plan (READ-ONLY)

1. **Gather dispatcher stats** — count actions per dispatcher, identify grouping patterns
2. **Review semantic search** — lines 744-776 of TribalKnowledgeEngine show current state
3. **Check Redis strategy** — grep for "redis" in roadmap, look for failover/replication
4. **Scan frontend pages** — count existing pages, identify which are wired
5. **Map phase dependencies** — chart which phases unblock which features
6. **Score each role** — apply framework above, list findings by severity

---

## Ready for Execution
When user approves, I will:
1. Read CAMX-RESTRUCTURED-ROADMAP-v24.md for full phase details
2. Conduct parallel Grep searches for Redis, K8s, event bus, API patterns
3. Score each role 0-100 with CRITICAL/HIGH/MEDIUM findings
4. Provide actionable recommendations per role
