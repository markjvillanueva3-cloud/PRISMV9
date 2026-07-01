---
name: reference_graph_recs_3to5_routing_2026_06_12
description: 2026-06-12 slot:alpha verify-first routing of GRAPH-UTILIZATION recs #3-5 (after shipping #1 local-vector + #2 DAG-picker). #3 GraphSAGE-reranker = DEFER (GNN grade.pass=false, not deploy-ready; india's domain). #5 codebase-memory-mcp = AMBIGUOUS (only skill-doc references, no implementation -- not a wireable asset). #4 U-SUBGRAPH-RETRIEVE = novel design-from-scratch (fresh pass). The two readily-buildable recs are shipped; the rest need other owners / clarification / fresh design.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_graph_recs_3to5_routing_2026_06_12
---


# GRAPH-UTILIZATION recs #3-5 routing (2026-06-12, slot:alpha)

After shipping rec #1 (`U-LOCAL-VECTOR-LEG-WIRE`, local-vector hybrid leg) and rec #2 (`U-DAG-PICKER`, dependency-aware picker), verify-first scoping of the remaining recs shows they are NOT clean alpha-buildable units:

- **#3 GraphSAGE-as-reranker — DEFER + route to india.** `scripts/lib/graphsage-predictor.mjs` exists and is NOT yet wired as a reranker, but the GNN deploy gate is **`grade.pass:false`** (`state/shared/nn-graph/NN-EVAL.json`, AUROC 0.8084 < the full-gate target). Wiring a search/pickup reranker on a sub-gate model = shipping a consumer on an unvalidated foundation (R12). The GNN is INDIA's domain (full-system AI training; PSN leg #10 `[SELECTIVE-DEPLOY]`, owner india). RIGHT MOVE: either (a) india clears the GNN deploy gate first, then wire the reranker; or (b) build a SELECTIVE reranker that only reranks above the confidence threshold (τ=0.7, ~32% coverage) -- also india's call since they own the selective-deploy logic. Do NOT blind-wire from alpha.

- **#5 wire codebase-memory-mcp — AMBIGUOUS, needs "what is it" first.** `grep -rlE "codebase-memory|codebaseMemory"` finds ONLY skill-doc references (`autopilot.md`, `forge7.md`, `rgs.md`, `generate-roadmap.md`) + an archived audit script -- NO engine/MCP-server implementation by that name. So "wire codebase-memory-mcp" assumes an asset that does not exist as a wireable thing; it is an aspirational reference in skill prose. Before any "wiring," investigate what codebase-memory-mcp was meant to be (an external MCP? a renamed engine? a never-built idea) -- it may be a no-op rec. The assessment likely surfaced the string from the skill docs without confirming an implementation (the same "string in docs != built asset" class as the rec #2 RoadmapDAGEngine over-claim, but inverted).

- **#4 U-SUBGRAPH-RETRIEVE — novel, fresh-pass design.** No existing asset; a from-scratch subgraph-retrieval feature for search (retrieve a connected subgraph around a query node, not just top-K independent hits). Genuinely buildable by alpha but a substantial NEW design -- deserves a dedicated pass with a design spec (the local-vector scope-then-build rhythm), not the tail of a marathon turn.

**Net:** the high-ROI, readily-buildable graph recs (#1, #2) are SHIPPED. #3 belongs to india + a model-readiness gate; #5 is likely a phantom asset (verify before wiring); #4 is a real but substantial novel build. Source assessment: `state/shared/specs/GRAPH-UTILIZATION-ASSESSMENT-2026-06-12.md`. Sister: [[reference_dag_picker_rec2_reshaped_2026_06_12]] (verify-first reshaped #2), [[reference_local_vector_leg_2026_06_12]] (#1).