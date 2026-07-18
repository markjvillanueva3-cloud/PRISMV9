---
name: reference-psn-graphiti-lite-2026-05-24
description: 2026-05-24 sierra iter 11 — shipped graphiti-lite hybrid (pure-Node JSONL episode store with temporal validity + provenance traceback, mirroring getzep/graphiti data model without Kuzu/Neo4j/FalkorDB dependency). 3 functional libraries (lib + seeder + tests). 16/16 tests pass. First seed: 3 commits ingested as episodes on this branch.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.126Z
aliases: reference_psn_graphiti_lite_2026_05_24
---


## What shipped

| artifact | lines | purpose |
|---|---|---|
| `scripts/lib/episode-store.mjs` | 167 | Pure-Node JSONL append-only episode store. 11 exports: `generateEpisodeId`, `buildEpisode`, `appendEpisode`, `appendTombstone`, `loadStore`, `queryEpisodes`, `episodesAt`, `tracebackByEntity`, `summarize`, `statsFromPath`, `__test_constants`. Tombstones supersede earlier facts via `valid_until` fold-at-load. |
| `scripts/lib/episode-store.test.mjs` | 165 | 16 node:test cases — round-trip, malformed-JSON skip, tombstone supersede, temporal slice (`episodesAt`), entity traceback (case-insensitive), summarize counts, defensive null-store handling. **16/16 pass**. |
| `scripts/seed-episodes-from-git.mjs` | 100 | One-shot ingester — walks `git log`, emits one episode per commit. Entities = touched files (cap 30), metadata carries author + slot extracted from `[SCOPE]` commit subject prefix. Idempotent — re-runs skip already-ingested SHAs. |
| `state/shared/episodes.jsonl` | 3 lines | First seed against this branch (`cad-fusion-live-ms0`). Operator can re-seed with `--all --since "..."` to capture cross-branch history. |

## Hybrid pattern (graphiti × PSN)

The getzep/graphiti repo (26.5K stars, Apache-2.0, MCP server built-in) names 5 primitives we partially had:

| graphiti primitive | PSN before iter 11 | PSN after iter 11 |
|---|---|---|
| Episode (raw ingest w/ provenance) | implicit via commit history + scrutiny ledger | **explicit** via `episode-store.mjs` |
| Entity (typed) | system-graph 110K nodes | declarative `entities[]` per episode (file/slug/concept), case-insensitive traceback |
| Relationship (triplets) | wiki-links + system-graph edges | declarative `relationships[]` per episode |
| Temporal validity window | implicit git mtime | **explicit** `valid_from` / `valid_until` + tombstone supersede pattern |
| Provenance traceback | `git blame` + commit hash | **explicit** `tracebackByEntity()` API |
| Hybrid search (vector+BM25+graph) | sidecar BM25 (iters 8-10) + master-index | predicate-driven `queryEpisodes()` (vector layer = followup) |

**The hybrid:** instead of pulling Kuzu/Neo4j/FalkorDB as a new dependency, the episode-store reuses PRISM's existing JSONL ledger pattern (same shape as scrutiny-ledger, error-pattern-promote, golf-envelope-mutations) — operators already know this idiom. The append-only + tombstone fold model is a strict subset of graphiti's data model — every concept the operator learns here transfers if/when we promote to full graphiti later.

## Why pure-Node not graphiti-the-library

YAGNI + DRY (3x rule):
- **YAGNI:** PRISM doesn't need 10K-fact-per-sec writes. The real load is ~50 episodes/day from commits + scrutiny + memory writes.
- **DRY:** the JSONL load-into-memory-on-query pattern is already used by 5+ PRISM ledgers — operators know it.
- **Cost ceiling:** zero new deps, zero new daemons. Falkor/Neo4j daemons are operationally heavy on the 26-chat fleet (port conflicts, memory floor, GPU contention).
- **Migration path:** if/when episode count crosses ~100K, we have the data model + an obvious migration target (graphiti-core via `pip install graphiti-core[kuzu]`).

## What's NOT in iter 11 (explicit deferral to future iters)

| follow-up unit | gap | effort estimate |
|---|---|---|
| `U-PSN-GRAPHITI-DISPATCHER` | wire `prism_graphiti:{add_episode,query,traceback,temporal_slice}` dispatcher → episode-store API | ~80 lines + 1 mcp-server build |
| `U-PSN-GRAPHITI-VIZ-ROOST` | `scripts/generate-episode-store-features.mjs` emits ghost.episode roost into `/system-viz` (per entity name) | ~120 lines + regen-viz registration |
| `U-PSN-GRAPHITI-SEED-EXPANDED` | seed across all branches (`git log --all`) + scrutiny-ledger + memory-write hooks → tens-of-thousands episodes | ~30 lines per source |
| `U-PSN-GRAPHITI-VECTOR-HYBRID` | join with iter-9 sidecar — semantic rerank over `episodesAt()` slice | ~150 lines |
| `U-PSN-GRAPHITI-TOMBSTONE-PROMOTE` | scrutiny gate FAIL → auto-tombstone the prior PASS entry for that file | ~50 lines hook patch |

## R12 disclosures

- **3 episodes seeded, not the 100K-from-fleet target.** The current branch (`cad-fusion-live-ms0`) is short. Operator re-runs `node scripts/seed-episodes-from-git.mjs --since "365 days ago" --limit 500000` (need to extend script to support `git log --all` for cross-branch capture — current implementation walks reachable-from-HEAD only).
- **117 s for 3 commits** is suspicious. `--name-only` enumerates files per commit; for 3 commits with thousands of touched files each (the fleet-merge commits), that's slower than expected. Future iter should cap files per commit at the `git log` level via `-z` + smarter parsing, OR drop file enumeration entirely (entities = empty array, queryable later via separate file→commit reverse index).
- **No vector layer yet** — `queryEpisodes()` is predicate-only. The hybrid search blend (vector + BM25 + graph traversal) that graphiti does natively is iter-N follow-up. The iter-9 sidecar already provides the BM25 piece; vector layer would need ONNX embedding wire.
- **No dispatcher yet** — `prism_graphiti:*` is the right wiring point. Skipped this iter to keep scope tight (no mcp-server build needed). Follow-up `U-PSN-GRAPHITI-DISPATCHER`.
- **No /system-viz roost yet** — episodes are invisible in the live system map until a feature-generator emits ghost nodes. Follow-up `U-PSN-GRAPHITI-VIZ-ROOST`.
- **git index.lock contention at end of iter** — peer chat held a 512K lock; 4 new files sit in working tree uncommitted. Standard pattern, will commit on next non-contested cycle. Files are durable via H: drive regardless.

## How operators use it today

```bash
# Seed (one-shot or cron)
node H:/prism/scripts/seed-episodes-from-git.mjs --since "30 days ago" --limit 500

# Query (programmatic)
import { loadStore, episodesAt, tracebackByEntity, summarize } from "H:/prism/scripts/lib/episode-store.mjs";
const store = loadStore();
summarize(store);                                  // {totalEpisodes, validNow, superseded, bySource}
episodesAt(store, "2026-05-20T12:00:00Z");         // what was true at T
tracebackByEntity(store, "feedback_psk_kernel.md"); // every episode mentioning this entity

# Append a custom episode (e.g. from a memory-write hook)
import { buildEpisode, appendEpisode } from "H:/prism/scripts/lib/episode-store.mjs";
appendEpisode(buildEpisode({
  source: "memory-write",
  source_id: "feedback_psn_definition.md",
  body: "Updated alias list",
  entities: [{ name: "PSN", type: "concept" }],
}));

# Tombstone a superseded fact
import { appendTombstone } from "H:/prism/scripts/lib/episode-store.mjs";
appendTombstone({ target_id: "ep-...", valid_until: new Date().toISOString(), reason: "scrutiny FAIL" });
```

## Closes

`PSN-ENHANCE-MS0::U-PSN-GRAPHITI-LITE-2026-05-24` — sierra iter 11/20. Delivers the merge-of-ideas the operator asked for: graphiti's data model (episodes + temporal + provenance + traceback) inside PRISM's existing JSONL ledger idiom (zero new deps, zero new daemons, compatible migration path to full graphiti-core if scale ever demands).

## Cross-refs

- [[reference-psn-aliases-maxed-2026-05-24]] — iter 9 W_ALIAS scoring (the search-side leg)
- [[reference-psn-aliases-backfill-2026-05-24]] — iter 10 wiki-link backfill (the graph-edge leg)
- [[reference-psn-master-index-aliases-synthesis-2026-05-23]] — iter 8-9 synthesis spec (the why)
- [[reference-psn-enhance-ms0-closeout-2026-05-23]] — yesterday's 7/7 cyrilXBT-pattern shipment (the foundation)
