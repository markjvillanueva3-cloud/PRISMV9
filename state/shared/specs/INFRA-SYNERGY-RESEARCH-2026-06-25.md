# Infrastructure Synergy Research — Kafka · Redis · Nginx · Kubernetes · Elasticsearch · GraphQL · RabbitMQ · Docker

> **Slot:** bravo (any-domain) · **Date:** 2026-06-25 · **Type:** architecture research / synthesis (judgment task → kept on Claude per R5; grounded by live greps, not generic filler).
> **Scope:** the whole PRISM codebase (`H:/prism`). Question: how to utilize all 8 together, synergized with the existing system.

---

## 0. Honest reality check (R12) — what PRISM already has

A grep of the live tree before any recommendation:

| Tech | Status in PRISM | Evidence |
|---|---|---|
| **Docker** | ✅ **Heavily used** — the entire backend stack is containerized | root `docker-compose.yml`: `postgres:16-alpine`, `prism-mcp-server`, `prom/prometheus`, `qdrant/qdrant:v1.17.0`, `prism-hook-broker`, `ollama/ollama`, `grafana` — all on `prism-net`. Plus `docker-compose.{gpu,local-llm,ollama-bridge,dev}.yml`, `docker/ocr-tools`, `docker/hook-broker`. |
| **Redis** | ✅ **Declared + wired** | `mcp-server/package.json:62` `ioredis ^5.10.1`; used in `src/cache/RedisCacheProvider.ts`, `src/services/DistributedLockService.ts`. |
| **(Queue)** | ✅ **BullMQ** (Redis-backed) declared + wired | `package.json:58` `bullmq ^5.73.0`; `src/queue/JobQueueEngine.ts`. **This is the RabbitMQ-shaped slot already filled.** |
| **Postgres** | ✅ Containerized (relational store alongside SQLite-WAL/JSONL) | compose `prism-postgres`. |
| **Qdrant** | ✅ Vector DB containerized + many engines | `QdrantFederatedRetrieverEngine`, `QdrantMemoryEngine`, etc. |
| **Prometheus + Grafana** | ✅ Observability containerized | compose `prism-prometheus`, `prism-grafana`. |
| **REST API (port 3100)** | ✅ Express-style routes | `src/routes/{erp,sfc,drawing,upload,document,doc,docLearn,learning,integrations,inbox}.ts` → consumed by Next.js `mcp-server/web` via `lib/apiBase.ts`. |
| **Kafka** | ❌ Not present | no `kafkajs` dep. |
| **RabbitMQ** | ❌ Not present | no `amqplib` dep (BullMQ covers the need). |
| **Elasticsearch** | ❌ Not present | no `@elastic/elasticsearch` dep; text search is file/JSONL + Qdrant vectors. |
| **GraphQL** | ❌ Not present | no `graphql`/`@apollo` dep; API is REST + MCP dispatchers. |
| **Nginx** | ❌ Not present | no nginx config / reverse proxy. |
| **Kubernetes** | ❌ Not present | Docker Compose only; no k8s manifests. |

**Thesis:** The request is *not* "bolt on 8 new systems." It is: **deepen the 2 that exist (Docker, Redis), adopt ~3 that solve named PRISM pain (Elasticsearch, Kafka/Redis-Streams, Nginx), reject the 1 that's redundant (RabbitMQ), and treat 2 as a deferred migration path (Kubernetes, GraphQL).** Adding redundant infra to a single-workstation fleet is negative-ROI (R7: don't average conflicting patterns — pick one).

---

## 1. Map each tech to a REAL PRISM pain point (not a generic role)

PRISM has very specific, documented scaling wounds. The value of each tech is measured against *those*, not against a textbook.

### Pain inventory (from CLAUDE.md regressions + live state)
- **P1 — chat bus is a file with 29,405 unread.** `AGENT_CHAT.jsonl` is append-only file-based pub/sub across 26 slots. No consumer offsets, no fan-out, no backpressure. (Live: `claude-672ceaa6 · 29405 unread`.)
- **P2 — giant single-file indexes blow V8's 512MB string cap.** `tribal-embed-index.json` crossed `0x1fffffe8` and a fail-open read **clobbered 33,639 → 1 entries** (2026-06-08). `system-graph.json` is 548–644MB and cannot be read into any context; reads go through a hand-rolled offset index.
- **P3 — heavy batch jobs OOM / aren't durable.** GNN retrain OOMs on in-process graph load; OCR corpus runs lost all progress on a reaper kill until a resumable cursor was added; embeddings rebuilds are multi-minute.
- **P4 — fleet coordination is files + locks.** `chat-slots.json`, `slot-task-claims.json`, `DistributedLockManager.withLock`, file-claim guards. Race-prone, no TTL semantics beyond hand-rolled heartbeats.
- **P5 — one REST surface, many consumers.** Next.js web + future phone app + CAM bridges all hit port 3100 directly; no gateway, no rate-limit, no TLS termination, no caching layer, no fan-in of the ~40 dispatchers.
- **P6 — orchestration is per-host scheduled tasks.** Fleet reaper, memory monitor, task-health, nightly retrains = Windows Scheduled Tasks. No declarative lifecycle, no multi-host story.

### Tech → pain mapping

| Tech | PRISM pain it actually solves | Honest verdict |
|---|---|---|
| **Redis (deepen)** | P4 fleet coordination (atomic claims w/ TTL, `SETNX` locks), P1 low-latency pub/sub (**Redis Streams** w/ consumer groups), P2 hot-index cache, P5 response cache + rate-limit token buckets | **Highest leverage. Already wired — extend, don't add.** |
| **Elasticsearch** | P2 the search wound directly — full-text + structured search over the 110K-node graph, tribal corpus, wiki, memories, transcripts; durable, shardable, no 512MB string cap | **Highest-ROI NEW add.** Complements Qdrant (ES=lexical/structured/aggregations, Qdrant=dense vectors) → hybrid retrieval. |
| **Kafka *or* Redis Streams** | P1 chat bus + P3 durable event log for closed-loop learning (every quote/cut/OCR outcome as an immutable event other galaxies replay) | **Adopt the event-log pattern. Start with Redis Streams (already have Redis); graduate to Kafka only at real throughput.** |
| **Nginx** | P5 single TLS-terminating reverse proxy in front of port 3100 + web + Grafana + Ollama; rate-limiting; static caching; one ingress | **Adopt — cheap, high-value, zero app changes.** |
| **Docker (deepen)** | Already the substrate. Add the 3 new services (ES, Nginx, optional Kafka) as compose services on `prism-net`; pin a GPU profile | **Extend existing compose.** |
| **RabbitMQ** | P3 durable task queue — **but BullMQ already fills this** | **REJECT.** Redundant with `JobQueueEngine.ts`. Running RabbitMQ *and* BullMQ = two brokers, doubled ops, the exact "code that satisfies both" anti-pattern (R7). |
| **GraphQL** | P5 — a typed gateway that fans the ~40 dispatchers into one schema for the web/phone app | **DEFER.** Real value for the phone app, but MCP dispatchers + REST already work and GraphQL competes with the MCP contract. Adopt only when the phone app's over-/under-fetching becomes a measured problem. |
| **Kubernetes** | P6 declarative lifecycle + multi-host | **DEFER (document the path).** Overkill for one Blackwell workstation; Compose is correct today. The migration becomes worthwhile only when a 2nd host joins. Keep manifests *generatable* from compose (kompose) so the door stays open. |

---

## 2. The synergized target architecture

One coherent **event-driven platform** layered on what exists — not 8 silos. Read bottom-up.

```
                          ┌──────────────── INGRESS ────────────────┐
   web / phone / CAM ───▶ │  NGINX  (TLS · rate-limit · cache · LB)  │
   bridges               └──────┬──────────────┬───────────────┬────┘
                                │              │               │
                       :3100 REST/MCP     /grafana        /ollama (guarded)
                                │
        ┌───────────────────────▼────────────────────────┐
        │      MCP-SERVER  (dispatchers + routes)          │
        │   prism_calc/cam/ai/safety/dev/memory/...        │
        └───┬───────────┬────────────┬───────────┬─────────┘
            │ cache+lock │ enqueue    │ search    │ emit event
            ▼            ▼            ▼           ▼
        ┌────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐
        │ REDIS  │  │ BULLMQ  │  │  ELASTIC │  │  EVENT LOG          │
        │ cache  │  │ (Redis) │  │  SEARCH  │  │  Redis Streams →    │
        │ locks  │  │ workers │  │ lexical+ │  │  (Kafka at scale)   │
        │ streams│  │ GNN/OCR │  │ struct + │  │  topics: quote.*    │
        │ claims │  │ embed   │  │ aggs     │  │  cut.* ocr.* fleet.*│
        └────────┘  └─────────┘  └────┬─────┘  └─────────┬───────────┘
                                      │ hybrid           │ consumers (per galaxy)
                                ┌─────▼─────┐      ┌──────▼──────────────────┐
                                │  QDRANT   │      │ closed-loop learners:   │
                                │  vectors  │      │ GNN refpool, LoRA feed, │
                                │  (dense)  │      │ quote-vs-actual, viz    │
                                └───────────┘      └─────────────────────────┘

   ALL of the above = DOCKER services on `prism-net`  (K8s = deferred migration target)
   Observability sidecar: PROMETHEUS scrapes every service → GRAFANA dashboards
```

### How the substrates actually synergize (the "in unison" part)

1. **Redis is the nervous system.** It already holds locks + cache + BullMQ. Add two roles: **(a) Redis Streams** as the typed replacement for `AGENT_CHAT.jsonl` (consumer groups = each slot gets its own offset, no "29,405 unread"); **(b) fleet claims** (`chat-slots`/`slot-task-claims`) become Redis keys with real TTL instead of file heartbeats → kills a whole class of stale-claim races (P4).

2. **Elasticsearch + Qdrant = hybrid retrieval.** Today the master-index/tribal/wiki search is bespoke file-walking that hit the 512MB cap. ES owns lexical + structured + aggregation queries; Qdrant owns dense-vector similarity; a thin fusion ranker (PRISM already has rerank code) merges them. This directly retires P2 — no single JSON file ever needs to be parsed whole again, and the GNN/RAG legs read from a real index. **ES is the durable home the tribal brain should have had.**

3. **The event log is the closed-loop backbone.** PRISM's whole premise is "closed-loop learning from shop floor + ERP." Right now outcomes are scattered JSONL ledgers. Model every outcome (`quote.created`, `cut.completed`, `ocr.extracted`, `fleet.commit`) as an immutable event on Redis Streams (→ Kafka at scale). Then GNN refpool growth, LoRA dataset feed, quote-vs-actual reconciliation, and system-viz roosts all become **independent consumers of the same log** instead of bespoke pollers. This is the single biggest architectural unlock (P1+P3).

4. **BullMQ runs the heavy/durable work.** GNN retrain, OCR corpus, embedding rebuilds → enqueue as BullMQ jobs (already `JobQueueEngine.ts`). Workers get the Blackwell heap flags once, centrally; a reaper kill just means the job is retried, not lost (retires the "resumable cursor" hand-rolling, P3). **This is why RabbitMQ is rejected — the slot is filled.**

5. **Nginx is the front door.** One ingress terminates TLS, rate-limits the public quote/SFC endpoints, caches static + idempotent GETs, and load-balances if the mcp-server scales to >1 replica. Zero application code changes (P5).

6. **Docker holds it together now; Kubernetes is the documented exit.** Everything is a compose service on `prism-net` today. Keep service definitions clean so `kompose convert` produces a starting k8s manifest the day a second host (or cloud burst) is real (P6).

---

## 3. Phased adoption plan (logical/dependency order — R13)

Each phase ships on a *proven* foundation; no consumer before its dependency.

**Phase 0 — deepen what's wired (days, low risk).**
- Promote `RedisCacheProvider` to also serve dispatcher response caching + token-bucket rate-limit keys.
- Add Redis health to the existing health surface; ensure Redis is a first-class compose service (today it's an implied BullMQ dependency — make it explicit).
- *Done-signal:* `redis-cli ping` from the mcp-server container; cache hit-rate visible in Grafana.

**Phase 1 — Nginx ingress (days, isolated).**
- Add `nginx` compose service in front of :3100 + web + /grafana. TLS, rate-limit on `/api/v1/quotes` + `/api/v1/sfc`, gzip, static cache.
- *Done-signal:* all traffic flows through one host:443; rate-limit returns 429 under a load test.

**Phase 2 — Elasticsearch as the search substrate (1–2 weeks, highest ROI).**
- Add `elasticsearch` compose service. Index: system-graph nodes, tribal corpus, wiki, memories, transcripts. Build a `SearchIndexEngine` that writes on the same events that today rebuild JSON files.
- Wire `master_index_query` + tribal rerank + wiki precheck to query ES (fallback to current files during cutover).
- *Done-signal:* a tribal/wiki/graph query returns from ES in <100ms with zero 512MB-string-cap risk; the old monolith JSON is read-only legacy.

**Phase 3 — Event log + Redis Streams chat bus (1–2 weeks).**
- Define a typed event schema (`scripts/lib/event-schema.mjs`, ADD-only like the cross-substrate edge schema). Replace `AGENT_CHAT.jsonl` writes with `XADD`; each slot a consumer group.
- Re-point closed-loop learners (GNN refpool, LoRA feed, quote-vs-actual) to consume their topics.
- *Done-signal:* "unread" is per-consumer-group lag (0 for a caught-up slot), and one outcome event drives ≥2 independent consumers.

**Phase 4 — BullMQ for all heavy jobs (ongoing).**
- Migrate GNN retrain / OCR corpus / embedding rebuild to BullMQ workers with centralized Blackwell heap config + retry/backoff.
- *Done-signal:* a killed worker auto-retries; no job loses progress.

**Phase 5 (deferred, gated) — Kafka.** Only when Redis Streams shows real backpressure/throughput limits (multi-host, >X events/s). Same producer/consumer interface → swap the transport, not the consumers.

**Phase 6 (deferred, gated) — GraphQL gateway.** Only when the phone app's REST over/under-fetching is a measured cost. Layer Apollo over the existing dispatchers; don't replace MCP.

**Phase 7 (deferred, documented) — Kubernetes.** Only when a 2nd host/cloud burst is real. `kompose convert` from the maintained compose as the seed.

---

## 4. What NOT to do (anti-patterns, R7/R8)

- **Do NOT add RabbitMQ.** BullMQ (Redis) already owns durable queues. Two brokers = doubled ops + the "satisfies both" worst-code smell.
- **Do NOT replace Qdrant with Elasticsearch (or vice-versa).** They're complementary (dense vs lexical/structured). Use both → hybrid rank.
- **Do NOT jump to Kubernetes on a single workstation.** Compose is the correct tool until host #2. Premature k8s = ops tax for zero benefit (YAGNI).
- **Do NOT let Kafka and Redis Streams both carry the chat bus.** Pick Streams now; Kafka is a *transport swap behind the same interface*, never a parallel bus.
- **Do NOT rip out the REST routes for GraphQL.** Additive gateway only, when measured.
- **Do NOT build any of this as a new singleton without wiring (R15).** Each substrate gets a provider engine + dispatcher action + real tests + the consumer re-pointed in the same change.

---

## 5. Deterministic done-signal for the overall initiative

The initiative is "done" (per phase gate) when:
1. A single Nginx ingress fronts all services with TLS + rate-limit (load-test proven).
2. Tribal/wiki/graph search returns from Elasticsearch with **zero** monolithic-JSON parse and <100ms p50.
3. The chat bus reports per-consumer-group lag (no global "unread") and one outcome event fans out to ≥2 consumers.
4. GNN/OCR/embedding jobs survive a worker kill via BullMQ retry.
5. Redis holds fleet claims with TTL; no file-heartbeat stale-claim races in a 26-slot soak test.
6. Kafka / GraphQL / Kubernetes remain *documented, gated* — adopted only against a measured trigger, never speculatively.

---

## Appendix — grounding citations (verified this session)
- `mcp-server/package.json:58` `bullmq ^5.73.0` · `:62` `ioredis ^5.10.1`
- `mcp-server/src/cache/RedisCacheProvider.ts` · `src/services/DistributedLockService.ts` · `src/queue/JobQueueEngine.ts` · `src/engines/CADRegressionWorkerThreadRunnerEngine.ts`
- root `docker-compose.yml` services: postgres:16-alpine · prism-mcp-server · prom/prometheus · qdrant/qdrant:v1.17.0 · prism-hook-broker · ollama/ollama · grafana (network `prism-net`)
- `mcp-server/src/routes/{erp,sfc,drawing,upload,document,doc,docLearn,learning,integrations,inbox}.ts` (REST/3100) · web consumer `mcp-server/web/.../apiBase.ts`
- Absent deps (verified): kafkajs · amqplib · @elastic/elasticsearch · graphql/@apollo · nats · nginx config · k8s manifests
- Pain references: CLAUDE.md `## Recent regressions` — tribal-index V8 512MB clobber (2026-06-08), system-graph 548–644MB, GNN retrain OOM, chat bus 29,405 unread (live).
