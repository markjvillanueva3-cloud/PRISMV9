---
title: subgraph-retrieve -- connected-neighborhood pre-search
created: 2026-06-20
slot: alpha
galaxy: token-optimization
tags: [graph, system-viz, search, token-savings, context-retention, graph-utilization]
related: [cheap-node-access-ms0, master-index-surface, system-viz-graph-navigation, graph-utilization-assessment]
---

# subgraph-retrieve -- connected-neighborhood pre-search

`U-SUBGRAPH-RETRIEVE` (rec #4 of `GRAPH-UTILIZATION-ASSESSMENT-2026-06-12`; the last alpha-buildable top-5 graph rec). Commits `256388a702` (build) + `2a7b5c0b58` (scrutiny fixes) + `abc8401737` (discoverability) on `cad-fusion-live-ms0`.

## What it is

A **connected-subgraph** retrieval over PRISM's ~110K-node system graph. Where `find` returns a FLAT top-K of orphan hits (nodes matching a query string but unrelated to each other), `subgraph` returns the seed nodes PLUS their connected neighborhood -- so you see HOW assets relate (engine -> wired-to dispatcher -> documented-by wiki -> tested-by test), i.e. **how to approach a task with PRISM capabilities**.

## Use

```
node scripts/system-viz-query.mjs subgraph "<task/topic>" [--depth N] [--nodes N] [--seeds N] [--dir both|out|in] [--json]
```

- Defaults: depth 2, nodes 40, seeds 6, dir both.
- Human output groups the neighborhood by node kind with the typed/directed relationship edge; JSON returns `{query, seeds, nodes, truncated, counts, stale, cold}`.
- Pair it with the cheap reads: `find <q>` -> ids, `subgraph "<task>"` -> connected fabric, `node-card <id>` -> full card.

## How it works (memory-safe by construction)

Composes only the two compact sidecars -- **never `loadGraph()`** (the ~770MB `system-graph.json`; the documented find-OOM class):

1. `find-cache.json` (~65MB) via `loadFindCache()` -- seed search + an id->meta map (label/layer/kind/noteCount for the WHOLE graph, so neighborhood nodes get labels for free).
2. `node-adjacency.json` (~96MB) -- precomputed bidirectional adjacency `{adjacency:{<id>:{in:[{id,type}],out:[{id,type}]}}}`, capped 8/dir, produced by `build-viz-adjacency.mjs` / `regen-viz.mjs`.

Then a bounded bidirectional BFS (`scripts/lib/subgraph-retrieve.mjs`: `loadAdjacency` + `bfsSubgraph` + `retrieveSubgraph`). The `subgraph` CLI branch **self-reexecs once with a generous heap** (`PRISM_SUBGRAPH_HEAP_MB`, default 4096) because parsing both sidecars together OOMs the ~384MB default old-space -- zero-friction for every caller (Blackwell-aligned: never fight a low default).

## Design invariants (R12)

- `loadAdjacency` FAILS LOUD on missing/unreadable/corrupt/schema-mismatch (never a silent empty neighborhood); mtime+size cache, stat-before-read (false-miss, never false-hit).
- BFS budget is honest: seeds are ALWAYS retained (never drop a real hit), and any node cut -- or seeds alone exceeding the budget -- sets `truncated:true`. (Per-file scrutiny P1: the cap was originally enforced only on neighbor admission; seeds>maxNodes overran with `truncated:false`. Fixed + regression-tested.)
- The reexec surfaces a spawn failure and exits non-zero (no R12 silent-success; 3-of-3 arm-B P1).
- Cold/stale `find-cache` propagates `cold`/`stale` so an empty result is distinguishable from a genuine 0-hit query.

## Discoverability

Wired into the two per-prompt search-first surfaces (`scripts/lib/task-substrate-router.mjs` master-graph hint + `scripts/lib/loop-goal-stack-advisor.mjs` SPOTLIGHT/Always lines) so every chat learns it alongside `find`/`node-card`/`blast-radius`.

## Tests

`scripts/lib/subgraph-retrieve.test.mjs` -- 20/20 (fail-loud stat/parse/schema, depth/nodes/dir bounds, orphan seed, two-seed via-merge, self-loop/malformed-edge adversarial, seed-overflow truncated, cold-propagation). 3-of-3 scrutiny PASS.

## Related graph-util recs

#1 local-vector leg + #2 DAG-picker (prior) + #4 subgraph (this) = SHIPPED. #3 GraphSAGE-reranker -> india (GNN selective-deploy @ tau=0.7). #5 codebase-memory-mcp = phantom (verify before wire). See [[graph-utilization-assessment]].
