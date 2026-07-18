---
name: ""
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_graph_hardening_verified_2026_06_21
---


# Graph capabilities/utilization -- hardening posture VERIFIED (2026-06-21, slot:alpha)

Operator: "harden graph capabilities and utilization." Verify-first (R8, reconciled against prior work — the lesson that caught the context-improvements near-duplicate this session):

**CAPABILITY/ACCESS surface is ALREADY hardened (verified by reading the code):**
- `scripts/system-viz-query.mjs` — every CHEAP subcommand (find, node-card, subgraph, doc-nodes, canvas-doc, cache-status) short-circuits BEFORE the eager `loadGraph()` at line 354. The eager load (heavy subcommands only) is FAIL-LOUD: `try{loadGraph()}catch(e){console.error;process.exit(3)}` (354-358) — not fail-open.
- `scripts/lib/subgraph-retrieve.mjs` (mine, this session) — `loadGraph`=0 in the cheap path, 5 `throw`, 0 catch-return-empty (fail-loud).
- `scripts/lib/node-card-read.mjs` + `node-card-offset-lib.mjs` — `loadGraph`=0 (seek-based), fail-loud throws.
- The historic `system-viz-query find` OOM was root-caused + fixed 2026-06-09 (slot:alpha) — find-cache sidecar path, never the 770MB graph.
- Sidecar staleness degrades GRACEFULLY with a clear message (find: "cold -- run regen-find-cache.mjs"); subgraph THROWS on missing adjacency; node-card THROWS on missing offset index. No silent-empty fail-open.

**UTILIZATION is comprehensively MAPPED, not greenfield:** `state/shared/specs/GRAPH-UTILIZATION-ASSESSMENT-2026-06-12.md` + [[reference_graph_utilization_assessment_2026_06_12]] (25-agent workflow, 16 ranked recs). Graph infra is DEEP (38 engines, 711MB/~372K-node graph, GraphSAGE AUROC 0.808, 54,489 embeddings). The gap is WIRING into 3 hot paths, NOT robustness:
- SEARCH: master-index flat BM25, no edge-following / GraphSAGE rerank. (My subgraph-retrieve this session added connected-neighborhood pre-search + discoverability — partial close.)
- LOOP: 0/3197 units carry `depends_on` → picker dependency-blind despite RoadmapDAGEngine.ts existing (large data + shared-lane unit).
- CONTEXT: subagent pre-search returns flat orphan hits (subgraph addresses this).

**Why no in-lane greenfield build shipped this turn (R12 honest):** the access surface is hardened; the utilization recs are documented + mostly CROSS-LANE (GraphSAGE rerank → india; system-viz internals → sierra; loop-picker depends_on → shared/large-data). A subgraph AUTO-INVOKE per-prompt injector would directly CONFLICT with the injection-budget finding ([[reference_context_awareness_improvements_2026_06_21]] — 65 injectors already) — so it is correctly an on-demand skill, not a 66th injector (R7/R16: fit the whole, don't add a conflicting consumer).

**Buildable remaining (need operator greenlight / owner coordination):** (1) LOOP depends_on population (RoadmapDAGEngine wire — high value, large-data, shared-lane); (2) SEARCH GraphSAGE selective rerank @ τ=0.7 (india owns GNN; deploy-ready-selective per [[reference_gnn_selective_deploy_2026_06_06]]); (3) sidecar auto-regen-on-stale (verify the ensure-index-daemon-guardian already covers this before building — likely daemon-managed).
