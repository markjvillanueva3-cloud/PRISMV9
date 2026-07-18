---
name: reference_subgraph_retrieve_2026_06_20
description: 2026-06-20 slot:alpha shipped U-SUBGRAPH-RETRIEVE (rec
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:47.213Z
aliases: reference_subgraph_retrieve_2026_06_20
---


# U-SUBGRAPH-RETRIEVE -- connected pre-search (2026-06-20, slot:alpha)

**What.** `node scripts/system-viz-query.mjs subgraph <query> [--depth N] [--nodes N] [--seeds N] [--dir both|out|in] [--json]` -- returns a CONNECTED neighborhood around the query's seed nodes, grouped by kind with the relationship edge (`-> wiki_link`, `<- contains`, etc.) and direction. Closes rec #4 of [[reference_graph_utilization_assessment_2026_06_12]] (the last alpha-buildable top-5 graph rec; #1/#2 shipped, #3->india, #5=phantom per [[reference_graph_recs_3to5_routing_2026_06_12]]).

**Why it beats `find`.** `find` returns a flat top-K of orphan hits -- nodes matching the query string but unrelated to each other. `subgraph` expands the seeds over the graph's edges so you see the wiring/doc/test fabric around a topic = "how to approach task X with PRISM capabilities."

**Files.**
- `scripts/lib/subgraph-retrieve.mjs` -- `loadAdjacency()` (mtime-cached, fail-loud), `bfsSubgraph(seedIds, adjacency, opts)` (bounded BFS, bidirectional, honest `truncated`), `retrieveSubgraph(query, opts, di)` (find seeds -> BFS -> enrich labels). DI seam for tests.
- `scripts/lib/subgraph-retrieve.test.mjs` -- 20/20 (happy + fail-loud stat/parse/schema + maxDepth/maxNodes/direction bounds + orphan seed + two-seed via-merge + self-loop/malformed-edge adversarial + seed-overflow truncated + cold-propagation).
- `scripts/system-viz-query.mjs` -- `subgraph`/`neighborhood` short-circuit BEFORE loadGraph (like find/node-card).

**MEMORY-SAFETY (load-bearing).** NEVER calls loadGraph (the ~770MB system-graph.json). Composes only `find-cache.json` (~65MB, loadFindCache -> seeds + id->label meta) + `node-adjacency.json` (~96MB precomputed bidirectional adjacency `{adjacency:{<id>:{in:[{id,type}],out:[{id,type}]}}}`, capped 8/dir, built by build-viz-adjacency.mjs). `blast-radius` rebuilds adjacency from a full loadGraph -- this does NOT (the find-OOM class, [[reference_systemviz_find_oom_2026_06_09]]). Parsing both sidecars together OOMs the ~384MB default heap, so the subgraph branch SELF-REEXECs once with `--max-old-space-size` (knob `PRISM_SUBGRAPH_HEAP_MB`, default 4096; guard `PRISM_SUBGRAPH_REEXEC`) -- zero-friction for every caller (CLI/hook/programmatic), Blackwell-aligned "never fight a low default."

**Per-file scrutiny caught (P1, both arms converged).** The `maxNodes` "HARD cap" was only enforced during neighbor expansion -- `seeds.length > maxNodes` (reachable via `seedLimit > maxNodes`) overran with `truncated:false`. Fixed: seeds are ALWAYS retained (never drop a real hit) but `truncated:true` is set when seeds alone exceed the budget; regression-tested. Lesson: a documented "HARD cap" must be enforced at EVERY admission point (seeds + neighbors), not just the obvious one.

**Live validation.** `subgraph "precompact" --depth 1 --nodes 18` -> 6 seeds, 18 nodes, typed edges + honest `[truncated]`. JSON shape `{query, seeds, nodes, truncated, counts, stale, cold}`.

**APPLY-TO-ALL-GALAXIES.** General fleet-wide query tool -- single build serves all 34 galaxies (no clone). Next graph-util candidates remain owner-gated: #3 GraphSAGE-reranker (india, GNN gate), #5 codebase-memory-mcp (phantom, verify-before-wire).
