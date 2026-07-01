---
name: reference_graph_utilization_assessment_2026_06_12
description: 2026-06-12 slot:alpha graph-utilization assessment + deep research (ultracode Workflow wf_459dc061-01a, 25 agents). Finding — PRISM graph utilization is DEEP (38 engines, 711MB graph, GraphSAGE, PPR, 54489 embeddings, 819 graph-articles); the gap is WIRING/COMPOSITION into search/loop/context hot paths, not greenfield. 16 recs verified: 2 novel, 14 partial, 0 already-exists.
type: reference
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_graph_utilization_assessment_2026_06_12
---


# Graph utilization assessment (2026-06-12, slot:alpha)

**Artifact:** `state/shared/specs/GRAPH-UTILIZATION-ASSESSMENT-2026-06-12.md` (full inventory + 16 ranked recs + top-5). Workflow `wf_459dc061-01a` (25 agents, 3.06M tokens).

**Headline finding.** PRISM already runs deep graph infra: 38 graph engines/algorithms (GraphAlgorithms/Spectral/7 domain-KGs/PageRank/PersonalizedPageRank/RankedHybridGraphSearch/MasterIndex/MemoryGraph/CrossProcessCausalGraphLearner + GraphSAGE 7-lib script stack), a 711MB/~372K-node `system-graph.json`, a 139MB/54,489-vector `_embeddings.jsonl`, a trained GraphSAGE checkpoint (AUROC 0.808). **819 graph-referencing articles** (wiki 359 + memories 255 + specs 205). So "do we use graphs?" = yes, heavily. The real gap = the operator's 3 named hot paths UNDER-use the graph:
- SEARCH: master-index is flat BM25; no edge-following, no local-vector join (Qdrant SPOF), no GraphSAGE rerank.
- LOOP: 0/3197 units carry `depends_on` (verified topup-slot-queues.mjs:268) -> picker is dependency-blind (R13 violation) despite RoadmapDAGEngine.ts existing.
- CONTEXT: memory/wiki edges lack temporal metadata; subagent pre-search returns flat orphan hits not connected neighborhoods.

**Adversarial verification (iter-1 lesson applied)** — of 16 research recs: **2 novel** (U-SUBGRAPH-RETRIEVE connected-neighborhood pre-search; GraphSAGE regression-risk predictor), **14 partial** (core asset exists, work = wire/compose — e.g. PersonalizedPageRank.ts, graphsage-predictor.mjs:110, RoadmapDAGEngine.ts:52, hybrid-retrieval.mjs rrfMerge, graph-io.mjs streaming, master-index-query-log.mjs, tribal-graph-clusters.mjs), **0 already-fully-built**. Highest-ROI = composition, not greenfield (R13).

**Top-5 builds:** (1) local-vector leg into rrfMerge [kills Qdrant SPOF, alpha], (2) U-DAG-PICKER [fix loop dependency-blindness, agent-orch], (3) GraphSAGE-as-reranker [finally USE the trained GNN, alpha+india], (4) U-SUBGRAPH-RETRIEVE [connected pre-search = context savings, alpha], (5) wire codebase-memory-mcp [4 dead skills, S-effort, papa/tango].

**Caveat:** advisory + mustHumanVerify; prior art exists for some (e.g. [[reference_psn_graphiti_wire_2026_05_24]] for the bi-temporal/Graphiti rec #10) — confirm against live tree before building. Loop: alpha /loop /goal iter3. [[feedback_wire_test_validate_all_galaxies]].
