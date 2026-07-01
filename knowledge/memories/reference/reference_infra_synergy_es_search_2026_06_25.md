---
name: reference_infra_synergy_es_search_2026_06_25
description: "Infra-synergy research (kafka/redis/nginx/k8s/elasticsearch/graphql/rabbitmq/docker) + fail-soft Elasticsearch SearchIndexEngine, shipped b8184fb49a (slot:bravo)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.623Z
aliases: reference_infra_synergy_es_search_2026_06_25
---


**INFRA-SYNERGY / U-ES-SEARCH-INDEX** (2026-06-25, slot:bravo, commit `b8184fb49a`).

Deep-research deliverable: how to use Kafka/Redis/Nginx/Kubernetes/Elasticsearch/GraphQL/RabbitMQ/Docker together, synergized with PRISM.

**Honest finding (verified by grep):** PRISM already runs **Docker** (full compose stack: postgres/mcp-server/qdrant/prometheus/hook-broker/ollama/grafana on `prism-net`) + **Redis** (`ioredis` cache/locks + `bullmq` queue at `mcp-server/src/{cache,services,queue}`). So the request reduces to: deepen Docker+Redis; adopt **Elasticsearch** (retires the 512MB V8 string-cap data-loss class — the 2026-06-08 tribal-index clobber + 548MB system-graph), a **Redis-Streams event log** (replaces the 29k-unread AGENT_CHAT.jsonl bus + unifies closed-loop learning), and **Nginx** ingress; **REJECT RabbitMQ** (redundant with bullmq); **DEFER** Kafka/GraphQL/Kubernetes behind measured triggers.

**Artifacts (all reversible; nothing deployed — Docker daemon was down):**
- `state/shared/specs/INFRA-SYNERGY-RESEARCH-2026-06-25.md` — research + target architecture + phased plan.
- Phase 1 ingress DRAFT: `deploy/nginx/nginx.conf` + `docker-compose.nginx.yml`.
- Phase 2 ES DRAFT: `docker-compose.search.yml` + `state/shared/specs/INFRA-SYNERGY-PHASE2-ELASTICSEARCH-DESIGN.md`.
- `mcp-server/src/engines/SearchIndexEngine.ts` — fail-soft/fail-CLOSED ES client over `fetch` (NO new dep, mirrors `GrokClientEngine`). Credits a doc only on a verified per-item bulk result; ANY item-count mismatch (none/fewer/MORE) fails closed (the fail-OPEN clobber class + its over-report twin); invariant `indexed+failed===docs.length`; flag `PRISM_SEARCH_BACKEND=file|es` default `file` => zero behavior change. WIRE-EXEMPT I/O client (wiring = the live-gated consumer re-point). Test `src/__tests__/SearchIndexEngine.test.ts` (14: 13 + 1 opt-in `PRISM_ES_LIVE`).

**Lesson reaffirmed:** an I/O client that reports write success must FAIL CLOSED on any unverifiable response — per-file scrutiny (reviewer+code-analyzer, 3 rounds) caught TWO real fail-OPEN P1s (items-less 200 over-credit, then over-long-items over-credit) before ship. See [[reference_tribal_index_v8_string_cap_2026_06_08]].

**Deferred (operator-gated):** start Docker -> deploy overlays + self-signed cert -> `/health`+429 verify; ES backfill + parity gate + consumer re-point (master_index_query / tribal rerank / wiki precheck cutover).

**Phase 3 (Redis-Streams event log) -- dedup finding, NOT a greenfield build:** a wired incumbent already owns the "event bus" concern -- `EventBusEngine.ts` (in-memory pub/sub, ring-buffer history, `getStats().mode`, 4 `infraDispatcher` actions: event_bus_{publish,events,stats} + summary). A speculative parallel `EventLogEngine` was built + DELETED this session (R7/R8: don't fork a wired engine). **Correct Phase 3 = add a durable Redis-Streams BACKEND MODE to `EventBusEngine`** (it already has a `mode` field) so the in-memory bus optionally fans out to Redis Streams consumer groups (per-group offsets/lag replacing AGENT_CHAT.jsonl's 29k-unread). Blast radius: 9 dispatcher consumers -> must be done with Redis up to validate, deliberately, not rushed. `ioredis` already wired (no new dep); mirror `RedisCacheProvider` graceful-degradation. Sibling incumbents: `SessionEventLogEngine` (in-memory recorder), file bus.
