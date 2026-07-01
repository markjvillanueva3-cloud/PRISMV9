---
name: system-viz-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the system-viz galaxy (large-graph layout/rendering, force-directed, hierarchical, codebase navigation). 9 fetched sources. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: system-viz
  tier: VERIFIED
  verifiedBy: WebFetch
---

# system-viz galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Directly informs PRISM's 548MB system graph + ghost-roost layout.

## Synthesis
Layout-algorithm choice must be driven by graph structure (DAG vs general, planar vs non-planar) + user task (overview/path-tracing/cluster-detection), not rendering convenience (Munzner, Tamassia). At codebase scale (10k+ nodes): naive O(n²) force-directed is infeasible — **multilevel coarsening** (DRGraph, BigGraphVis) or **t-distribution-bounded repulsive forces with FFT** (t-FDP) reduce effective complexity to O(n log n) or better; **GPU/WebGL rendering (Sigma.js, D3-WebGL) is a hard requirement beyond ~5k nodes** (2025 7-library / 481-dataset benchmark: SVG unusable for large graphs, Canvas degrades at 3-5k). **Hierarchical abstraction** — collapsing a subgraph to one node per zoom level — emerges across independent lines (Code-Craft bottom-up LLM summaries, E-SC4R MDG clustering, beyond-planarity crossing-bounded decomposition) as the only paradigm keeping both rendering + cognitive load tractable for full-system maps. Next frontier: streaming community detection for real-time updates, crossing-minimization from beyond-planarity theory, and MDG-metric hierarchical clustering driving ghost-roost grouping + drill-down (which PRISM system-viz already exposes).

## Verified sources
### [Force-Directed Graph Layouts Revisited: A New Force Based on the T-Distribution (arXiv 2303.03964)](https://arxiv.org/abs/2303.03964) — paper
> "exerts limited repulsive forces for nearby nodes and can be adapted separately in its short- and long-range effects."

**Knowledge:** t-FDP — Student's-t repulsive force preserving neighborhoods, FFT-accelerated. For force-directed layout of large dependency graphs where cluster separation + local cohesion must coexist.

### [BigGraphVis: Streaming Algorithms + GPU for Big Graphs (arXiv 2108.00529)](https://arxiv.org/abs/2108.00529) — paper
> "the first attempt to combine the power of streaming algorithms coupled with GPU computing to tackle big graph visualization"

**Knowledge:** Parallel streaming community detection + GPU layout → 70-95% speedup; 3M nodes / 34M edges in ~5 min. The production ceiling for real-time full-codebase graph rendering.

### [DRGraph: Efficient Layout for Large Graphs by Dimensionality Reduction (arXiv 2008.07799)](https://arxiv.org/abs/2008.07799) — paper
> "approximating graph distances by means of a sparse distance matrix, estimating the gradient by using the negative sampling technique, and accelerating... through a multi-level layout scheme"

**Knowledge:** Linear O(n) via sparse distance matrix + negative sampling + multi-level layout. The multi-level scheme transfers to hierarchical system-viz (coarsen subsystem clusters before fine module layout).

### [Force-directed algorithms for schematic drawings and placement: A survey (arXiv 2204.01006)](https://arxiv.org/abs/2204.01006) — paper
> "a full roadmap for state-of-the-art force-directed algorithms in schematic drawings and placement"

**Knowledge:** Classifies 50 yrs of force-directed into accumulated-force / energy-minimisation / combinatorial-optimisation + hybrid multilevel/MDS. Maps the speed vs aesthetic vs scalability trade-off for software graphs.

### [A Survey on Graph Drawing Beyond Planarity (arXiv 1804.07257)](https://arxiv.org/abs/1804.07257) — paper
> "classifies and studies geometric representations of non-planar graphs in terms of forbidden crossing configurations."

**Knowledge:** k-planar / fan-crossing-free / beyond-planar models bounding edge crossings. Dependency graphs are non-planar; supplies the vocabulary for crossing-minimization guarantees in dense module-interaction zones.

### [Visualization Analysis and Design (Munzner, CRC 2014), Ch.9 Networks & Trees](https://www.cs.ubc.ca/~tmm/vadbook/) — textbook
> "Tamara Munzner. Visualization Analysis and Design. A K Peters Visualization Series, CRC Press, 2014."

**Knowledge:** Canonical text unifying idiom/task/data-type frameworks. Ch.9: node-link, adjacency-matrix, hierarchical idioms with task-analysis criteria — principled basis for choosing system-viz rendering modes by user task.

### [Graph visualization efficiency of popular web-based libraries (PMC, 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12061801/) — paper
> "systematic, controlled experiment... selected 481 graph datasets with node scales ranging from 100 to 200k."

**Knowledge:** Benchmarks D3 (SVG/Canvas/WebGL), ECharts, G6 across 481 datasets. WebGL required beyond ~5k nodes; Canvas degrades 3-5k; SVG unsuitable for any large dependency graph.

### [Code-Craft: Hierarchical Graph-Based Code Summarization (arXiv 2504.08975)](https://arxiv.org/abs/2504.08975) — paper
> "Understanding and navigating large-scale codebases remains a significant challenge in software engineering."

**Knowledge:** Multi-layered bottom-up codebase graph (file→module→subsystem) with LLM summaries per level → up to 82% top-1 retrieval-precision gain. Hierarchical abstraction = drill galaxy→engine→function without loading the full graph.

### [E-SC4R: Explaining Software Clustering for Remodularisation (arXiv 2107.01766)](https://arxiv.org/abs/2107.01766) — paper
> "Software clustering is often used as a remodularisation and architecture recovery technique"

**Knowledge:** Evaluates hierarchical + Bunch clustering across 30 projects via Module Dependency Graphs — which algorithm families recover high-cohesion/low-coupling modules. Informs the clustering tier feeding ghost-roost grouping.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
