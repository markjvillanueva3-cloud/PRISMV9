# Phase 2 Design — Elasticsearch as PRISM's durable search substrate

> **Parent:** `INFRA-SYNERGY-RESEARCH-2026-06-25.md` · **Slot:** bravo · **Status:** design (no engine built yet — see §7 operator-only gates).
> **Solves P2** directly: the 512MB V8 string-cap data-loss class (`tribal-embed-index.json` clobbered 33,639→1 on 2026-06-08; `system-graph.json` 548–644MB unreadable whole). ES is durable, shardable, and never needs a single JSON parsed whole.

---

## 1. Why ES *and* Qdrant (not either/or)

PRISM already has Qdrant for **dense-vector** similarity. ES owns the orthogonal half:
- **Lexical** (BM25 exact/fuzzy term match — "find every node mentioning `kc1.1`").
- **Structured** (filter by `layer`, `kind`, `status`, `galaxy`, date ranges).
- **Aggregations** (counts/facets — "how many ghost roosts per galaxy", today done by walking JSONL).

Hybrid retrieval = ES candidate set (lexical+filter) ∪ Qdrant candidate set (dense), fused by the existing rerank code. This is the design the GNN/RAG legs should read from.

## 2. Indices + mappings

One index per corpus, time-versioned behind a write alias (`*-write`) and a read alias (`*-read`) so reindex is zero-downtime.

| Index | Source today | Key fields |
|---|---|---|
| `prism-graph-nodes` | `system-graph.json` (548MB) / node-card offset index | `id` (keyword), `label` (text+keyword), `layer`, `kind`, `status`, `galaxy` (keyword), `info` (text), `neighbors` (keyword[]) |
| `prism-tribal` | `tribal-embed-index.json` (the clobbered corpus) | `id`, `text` (text), `domain` (keyword), `source`, `embeddedAt` (date) |
| `prism-wiki` | `knowledge/wiki/**` | `slug`, `title` (text+kw), `section` (kw), `body` (text), `backlinks` (kw[]) |
| `prism-memories` | `knowledge/memories/**` | `name`, `type` (kw), `description` (text), `body` (text) |
| `prism-transcripts` | mined transcripts / handoffs | `slot` (kw), `ts` (date), `text` (text) |

Mapping notes: `text` fields use the standard analyzer + a `.keyword` sub-field for exact/agg; `id`/`slug` are `keyword` (exact join keys); dense vectors stay in Qdrant (do **not** duplicate embeddings into ES).

## 3. Write path (additive, dual-write — the safe part)

ES is fed by the **same triggers that already rebuild the JSON files** — no new polling. Wherever a rebuild writes `system-graph.json` / `tribal-embed-index.json` today, add an *additive* `bulk` upsert into the matching `*-write` alias. The JSON file keeps being written during cutover (dual-write), so nothing is lost if ES is down (fail-soft: log + continue, never block the rebuild — the opposite of the fail-open clobber that caused the 2026-06-08 loss).

Event-driven variant (composes with the Phase 3 event log): index on `*.indexed` events instead of inline, so indexing is a consumer, not a rebuild-path dependency.

## 4. Read path (dual-read with fallback — reversible cutover)

`master_index_query`, tribal rerank, and wiki precheck get an ES backend **behind a flag** (`PRISM_SEARCH_BACKEND=es|file`, default `file`):
- `file` → current behavior, byte-identical (zero risk while ES bakes).
- `es` → query ES; **on any ES error fall back to the file path** and log. Cutover is flipping a flag; rollback is flipping it back. No code revert needed.

Parity gate before default-flip: run N real queries through both backends, assert top-k overlap ≥ threshold (R9 — a real parity test, not "looks fine").

## 5. New asset (when built — NOT in this design doc)

- `SearchIndexEngine.ts` — `index(corpus, docs[])`, `query(corpus, {q, filters, k})`, `health()`; `ioredis`-style fail-soft. Wired into **every** consumer in the same commit (R15): `master_index_query` (`prism_session`), tribal rerank, wiki precheck, plus a `prism_dev:search_*` dispatcher action.
- **Test matrix (R15):** happy (index→query round-trip returns the seeded doc) · 3 failure modes (ES down → file fallback; malformed doc → skipped+logged, batch survives; empty query → bounded result) · 2 adversarial (a doc larger than the old 512MB *whole-file* limit indexes fine in shards; a query that returned 0 from files returns ES hits → proves the upgrade). Round-tripped through the dispatcher, not just the singleton.

## 6. Migration / done-signal

1. `docker compose -f docker-compose.yml -f docker-compose.search.yml up -d elasticsearch` (overlay already drafted).
2. One-shot backfill: stream each corpus into its `*-write` alias (bulk, resumable cursor — reuse the OCR-corpus cursor pattern so a reaper kill resumes, not restarts).
3. Dual-write live; bake; run the parity gate.
4. Flip `PRISM_SEARCH_BACKEND=es`; the monolith JSON becomes read-only legacy.
- **Done when:** a tribal/wiki/graph query returns from ES <100ms p50, zero monolithic-JSON parse, parity ≥ threshold, and a forced ES-down falls back cleanly.

## 7. Operator-only gates (correct to wait on these)
- **Deploy ES** (go-live; needs Docker running) + set `ELASTIC_PASSWORD`/enable `xpack.security` for any non-local exposure (credentials).
- **Build + wire `SearchIndexEngine`** — needs a live cluster to test against and is a real production-search re-point (scope/go-live). This is the commit-to-adopt decision.
- **Flip the default backend to `es`** (production cutover) after the parity gate passes.

Recommendation: deploy ES locally (overlay), I build the indexer + backfill + parity gate behind the `file` default (all reversible), and you flip the default only once parity is green.
