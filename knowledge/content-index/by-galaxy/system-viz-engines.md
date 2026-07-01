---
name: system-viz-engines
description: Strategic engine + script digest for the system-viz galaxy -- the 3D system map, ghost roosts, master graph, node-card cheap-read surface, and cross-substrate edge spine. Covers both the flat .ts engines and the load-bearing scripts/ pipeline.
type: reference
galaxy: system-viz
node_type: memory
owner_slot: sierra
generated: 2026-07-01
---

# system-viz galaxy -- engine digest

## Overview

The system-viz galaxy is a doctrine/orchestration hub, NOT a conventional
engine cluster. Its directory (`mcp-server/src/engines/system-viz/`) holds ONLY
5 brain docs (CLAUDE/MEMORY/PATHS/TOOLBELT/GSD) -- there are NO `.ts` files
there. Load-bearing code lives in two places: (1) flat engine classes under
`mcp-server/src/engines/*.ts`, and (2) the far larger SCRIPT tier under
`scripts/` + `scripts/lib/`. Most of the actual pipeline is scripts, not
engines -- so this digest covers BOTH.

Core facts (grounded in the galaxy doctrine, R12):

- `regen-viz.mjs` is the ONE canonical writer of the merged
  `system-graph.json` (the 370-575 MB / ~244K-345K-node graph; older docs cite
  "548 MB" and "644 MB" -- the size is a range that grows each regen, check
  `.last-successful-regen.json` for the current value). One-writer-per-path is a
  hard rail: any independent writer silently clobbers.
- ~52 ghost-roost generators (`scripts/generate-*-features.mjs`) emit the
  augmentation nodes for every remaining fleet unit (priority-queue, misc-tasks,
  bridge-synergy, feature-gap, domain-pipelines, ...). Each needs BOTH a
  `regen-viz.mjs` FAST[] entry AND a `merge-augmentations.mjs` splice block --
  one without the other = silently-discarded data (the load-bearing dual-reg
  invariant, audited by `scripts/audit-viz-dual-registration.mjs`).
- The graph feeds the GNN tier-5 ref-pool: `seed-ghost-from-unwired.mjs`
  produces the `_node-embeddings.jsonl` (~555 MB) + high-confidence
  `ghost.unwired-engine` reference nodes that india's GraphSAGE tier-5 consumes.
  Sierra owns the graph + ref-pool feed; india owns the model weights + retrain.
- The graph IS the fleet search substrate. master-index / awareness /
  pre-*-graph hooks all resolve against it, so a degraded graph is a fleet-wide
  search outage across all 26 slots. Correctness here is load-bearing.
- Cheap-read: `system-viz-query.mjs node-card <id>` returns a ~200-token card
  (~98.7% cut vs the 186K-token raw graph read). Pattern: `find <noun>` -> ids
  -> `node-card <id>`. NEVER raw `JSON.parse` / `stringify(...,null,2)` the
  merged graph (OOM / exit-134 string-cap).

## Strategic categories

1. **Graph regen + merge (the pipeline core)** -- regen-viz (master writer),
   generate-system-viz (arch-only graph), merge-augmentations (splice),
   post-merge repair/dedup/reparent/parent-edges stages. Scripts, not engines.
2. **Ghost-roost generators (~52)** -- `generate-*-features.mjs` emit the
   augmentation nodes; VizAutoAugmentationEngine converts research verdicts into
   augmentation docs. This is how every remaining fleet unit renders as a roost.
3. **Master-index + awareness query** -- MasterIndexEngine (4-index fusion),
   MasterIndexGenerator (source scanner), RankedHybridGraphSearchEngine (RRF
   fusion of confidence x utilization), HybridIndexEngine (RRF primitive).
   Surfaced via `prism_session:master_index_*`.
4. **Node-card cheap access** -- `scripts/lib/node-card-{schema,read,offset-lib}.mjs`
   + `system-viz-graph.mjs` + `graph-io.mjs` = the token-cheap seek-by-id
   surface (CHEAP-NODE-ACCESS-MS0). No engine class; pure script libs.
5. **Graph-as-LLM-context + importance** -- GraphContextLensEngine (ego-graph
   slices), CodeGraphProjectionEngine (RepoGraph-style code graph), and
   GraphImportanceEngine (Personalized PageRank surface) turn the graph into
   scoped, ranked LLM context.
6. **Graph algorithms (classical)** -- GraphAlgorithmsEngine (MST/SCC/CPM/
   max-flow), GraphTheoryEngine (DAG/TSP/coloring), SpectralGraphEngine
   (Laplacian / Fiedler partitioning). Manufacturing-planning primitives that
   run ON graph structure.
7. **3D viewer + visualization pipeline** -- VisualizationEngine (WebGL/Three.js
   scene-graph data) + the `_server.cjs` viewer serving `architecture-graph.json`.
8. **GNN ref-pool feed + graph-improvement** -- seed-ghost-from-unwired.mjs
   (ref-pool + embeddings for india's tier-5), GraphImprovementFanoutEngine
   (leverage-queue -> parallel graph-improvement plan).

## Key engines + scripts (detailed)

### regen-viz.mjs (script -- pipeline core)
The single-shot master regenerator and the ONE canonical writer of
`system-graph.json`. Runs the FAST[] generator list -> merge-augmentations ->
repair-classification -> dedup -> reparent -> add-parent-edges ->
seed-ghost-from-unwired -> writes `.last-successful-regen.json`. The viz viewer
polls the graph every 30 sec and hot-reloads on mtime change.
File: `scripts/regen-viz.mjs`.

### system-viz-query.mjs (script -- the viz-first surface)
Read-only programmatic adapter for the live graph -- the CLI surface every audit
uses BEFORE Grep/Glob. Verified subcommands: `find` / `subgraph` / `node-card`
/ `near` / `octopus` / `headline` / `roadmap-candidates` / `blast-radius` /
`dispatcher-summary` / `coverage-by-domain` / `worktrees`. Node-card and near
never load the 644 MB graph (seek/sidecar paths). `--json` for machine output.
File: `scripts/system-viz-query.mjs`.

### merge-augmentations.mjs (script -- the splice)
Folds every per-augmentation JSON (obsidian/awareness/novelty/business-value +
each ghost-roost output) back into `system-graph.json`, gaining `.knowledge`,
`.awareness`, `.novelty`, `.businessValue` on nodes. Now reads/writes via
streaming graph-io (no string-parse/stringify), so the merge itself no longer
OOMs (the exit-134 class is RESOLVED for this path but preserved as a hard rail
for all new graph code). File: `scripts/merge-augmentations.mjs`.

### MasterIndexEngine.ts
Unified master search: ONE query replaces N Grep/Glob/Agent calls. Fuses 4
pre-built indexes -- system-graph.json nodes (with pre-joined wiki/memory
entries), PRISMSelfAwarenessEngine fuzzy capability match, BUILD_STATE lifecycle
classification, and graph in-degree utilization. mtime-cached; inverted index
built lazily against the cached graph. Wired `prism_session:master_index_query`.
File: `mcp-server/src/engines/MasterIndexEngine.ts`.
Notable: `masterIndexEngine` singleton, `query()`, `MasterIndexHit`.

### MasterIndexGenerator.ts
Auto-scans MCP server source (dispatchers, engines, registries, services, utils,
hooks, skills) to produce `MASTER_INDEX.json` as a living single-source-of-truth,
with DSL-eligibility classification + auto-categorization. The generator behind
the index MasterIndexEngine queries. File: `mcp-server/src/engines/MasterIndexGenerator.ts`.
Notable exports: `DispatcherEntry`, `EngineEntry`.

### VizAutoAugmentationEngine.ts
Converts SynergyClassifierEngine verdicts (one per researcher-subagent bundle)
into a system-viz `AugmentationDocument` (nodes + edges with confidence/band/
origin), which merge-augmentations picks up and folds into the live graph. The
auto-learning-loop bridge from research findings to graph nodes.
File: `mcp-server/src/engines/VizAutoAugmentationEngine.ts`.
Notable: `AugmentationDocument` contract (auto-research-finding nodes).

### GraphImportanceEngine.ts
Engine-namespace wrapper exposing Personalized PageRank (from
`algorithms/PersonalizedPageRank.ts`) as a stable singleton for slot-personalized
node importance. Planned consumers: /system-viz semantic-zoom, /impact
blast-radius, ghost-roost confidence, master-index PPR channel. Adds no math --
it makes PPR discoverable + dispatcher-consumable.
File: `mcp-server/src/engines/GraphImportanceEngine.ts`.
Notable: `SlotDomain` type, PPR ranking surface.

### RankedHybridGraphSearchEngine.ts
Sierra's N1 orchestration: RRF-fuses MasterIndexEngine confidence ranking against
the utilization (in-degree) ranking so a structurally-important hub surfaces above
a lexically-strong isolated match. OOM-safe by construction (reuses the cached
index, never parses the merged graph). Wired `prism_session:master_index_ranked_hybrid`.
File: `mcp-server/src/engines/RankedHybridGraphSearchEngine.ts`.
Notable: composes `masterIndexEngine` + `HybridIndexEngine.fuse()`.

### HybridIndexEngine.ts
Pure-core RRF fuser: caller supplies two ranked lists (BM25 sparse + semantic
dense) keyed by entry_id; returns one unified ranking via
`RRF(d) = sum 1/(k + rank_i(d))`, default k=60 (Cormack 2009). The RRF primitive
under RankedHybridGraphSearchEngine. File: `mcp-server/src/engines/HybridIndexEngine.ts`.
Notable: `RankedHitSchema` (zod), `FusionResult`.

### GraphContextLensEngine.ts
Makes the live graph directly addressable as scoped LLM context -- extracts
ego-graphs (BFS slice around a node), by-domain slices, community rollups, and
renders JSON/Markdown/Mermaid. Reads the BOUNDED adjacency sidecar
(`node-adjacency.json`) + node-card seek index, NEVER the full 644 MB graph
(deliberate deviation from the literal spec to avoid OOM). Wired
`prism_ai:graph_context_lens_extract`. File: `mcp-server/src/engines/GraphContextLensEngine.ts`.

### CodeGraphProjectionEngine.ts
Projects TypeScript source into a code graph (files + symbols + import targets;
`declares` / `imports` edges) for ego-graph retrieval by coding agents
(RepoGraph, ICLR 2025). Per-file syntactic parse only -- cannot OOM on the full
tree. Wired `prism_dev:code_graph_project`.
File: `mcp-server/src/engines/CodeGraphProjectionEngine.ts`. Notable: `CodeGraph`,
`egoGraph()`.

### VisualizationEngine.ts
The 3D visualization DATA pipeline (does not render): produces WebGL/Three.js
scene graphs, stock/tool/kinematic-chain meshes, heatmap overlays, and section
views. Feeds the client-side 3D viewer. File: `mcp-server/src/engines/VisualizationEngine.ts`.
Notable: `ViewPreset`, `ColorMode`, `Vec3`.

### GraphImprovementFanoutEngine.ts
Pure planning core of the parallel graph-improvement loop: takes the leverage
wiring queue (domain buckets of unwired engines = missing engine->dispatcher
edges) and decomposes it into parallelizable subtasks, sizes the opus-fast-max
fan-out, assigns subtasks to slots, and attaches an executable AgentSpec batch.
Wired `hermes_graph_improve_plan`. File: `mcp-server/src/engines/GraphImprovementFanoutEngine.ts`.

### seed-ghost-from-unwired.mjs (script -- GNN ref-pool feed)
regen-viz post-merge stage that seeds high-confidence `ghost.unwired-engine`
reference-pool nodes and produces the `_node-embeddings.jsonl` (~555 MB) that
india's GraphSAGE tier-5 consumes. The system-viz -> ai-training PSN edge.
File: `scripts/seed-ghost-from-unwired.mjs` (co-owned sierra + india).

### GraphAlgorithmsEngine.ts / GraphTheoryEngine.ts / SpectralGraphEngine.ts (algorithm cluster)
Classical graph primitives that run on graph structure: GraphAlgorithmsEngine
(MST Kruskal/Prim, Bellman-Ford/Floyd-Warshall, topo-sort, SCC Kosaraju, CPM);
GraphTheoryEngine (DAG-schedule, MST, TSP hole-pattern, max-flow chip-evacuation,
graph-coloring fixture/setup); SpectralGraphEngine (graph Laplacian, power-
iteration eigenvectors, Fiedler partitioning for CAD mesh / feature recognition).
Files: `mcp-server/src/engines/{GraphAlgorithmsEngine,GraphTheoryEngine,SpectralGraphEngine}.ts`.
(These are manufacturing-planning primitives shared fleet-wide; catalogued here
as the galaxy's graph-math tier.)

## Full index

Engine count (system-viz-owned, header-verified): 13 `.ts` engines.
Script count: 62 viz/graph scripts matched (incl. ~52 `generate-*-features.mjs`
ghost-roost generators) + the node-card / graph-io libs under `scripts/lib/`.
Adjacent graph engines owned by OTHER galaxies (CAD*, Lathe*, WEDM*,
PostProcessor*, GraphRAG/KnowledgeGraph* = ai-training/knowledge) are EXCLUDED
per the galaxy CLAUDE.md scope.

| Asset | Kind | Category | One-line |
|---|---|---|---|
| MasterIndexEngine.ts | engine | master-index | 4-index fusion; ONE query replaces N Grep/Glob; `prism_session:master_index_query` |
| MasterIndexGenerator.ts | engine | master-index | source scanner -> MASTER_INDEX.json living SSOT |
| RankedHybridGraphSearchEngine.ts | engine | master-index | RRF-fuse confidence x utilization (N1, OOM-safe) |
| HybridIndexEngine.ts | engine | master-index | pure RRF fuser (BM25 + dense), k=60 |
| VizAutoAugmentationEngine.ts | engine | ghost-roosts | synergy verdicts -> AugmentationDocument for merge |
| GraphImportanceEngine.ts | engine | importance | Personalized PageRank namespace surface |
| GraphContextLensEngine.ts | engine | graph-as-context | ego-graph slices; adjacency sidecar, no 644MB load |
| CodeGraphProjectionEngine.ts | engine | graph-as-context | TS source -> code graph for agent ego-retrieval |
| VisualizationEngine.ts | engine | canvas-3d | WebGL/Three.js scene-graph data pipeline |
| GraphImprovementFanoutEngine.ts | engine | gnn/graph-improve | leverage-queue -> parallel graph-improvement plan |
| GraphAlgorithmsEngine.ts | engine | graph-algorithms | MST/SCC/CPM/max-flow/topo-sort primitives |
| GraphTheoryEngine.ts | engine | graph-algorithms | DAG/MST/TSP/max-flow/coloring for planning |
| SpectralGraphEngine.ts | engine | graph-algorithms | Laplacian / Fiedler partitioning (CAD mesh) |
| regen-viz.mjs | script | graph-regen | MASTER regenerator; ONE canonical writer of system-graph.json |
| generate-system-viz.mjs | script | graph-regen | arch-only L1-L10 -> architecture-graph.json (3D viewer) |
| merge-augmentations.mjs | script | graph-regen | splice every augmentation into merged graph (streaming) |
| system-viz-query.mjs | script | master-index | read-only CLI: find/subgraph/node-card/near/blast-radius/... |
| system-viz-add-node.mjs | script | graph-regen | atomic single-node append (PID-lock) (name-derived) |
| reparent-viz-categories.mjs | script | graph-regen | post-merge reparent stage (name-derived) |
| detect-system-viz-drift.mjs | script | graph-regen | DRIFT_REPORT.json generator (name-derived) |
| viz-regen-guard.mjs | script | graph-regen | regen fingerprint/manifest guard (name-derived) |
| regen-graph-normalized.mjs | script | graph-regen | normalized graph regen (name-derived) |
| regen-find-cache.mjs | script | master-index | rebuild find-cache sidecar (name-derived) |
| regen-master-index / generate-master-index.mjs | script | master-index | generate MASTER_INDEX artifact (name-derived) |
| master-index-daemon.mjs | script | master-index | long-running master-index server (name-derived) |
| master-index-query-stats.mjs | script | master-index | master-index hit-counter telemetry (name-derived) |
| build-graph-index.mjs | script | node-card-access | build node-card offset index (per doctrine PATHS) |
| build-viz-adjacency.mjs | script | node-card-access | precompute node-adjacency.json sidecar (name-derived) |
| system-viz-graph.mjs (lib) | script | node-card-access | canonical mtime-cached size-capped graph reader |
| graph-io.mjs (lib) | script | node-card-access | streaming graph read/write-atomic (no OOM) |
| node-card-schema.mjs (lib) | script | node-card-access | NodeCard shape (~200-token compact card) |
| node-card-read.mjs (lib) | script | node-card-access | readCard/readCards from freshest sidecar |
| node-card-offset-lib.mjs (lib) | script | node-card-access | seekable offset index (makeCard single-source) |
| seed-ghost-from-unwired.mjs | script | gnn-refpool | ref-pool + _node-embeddings.jsonl for india tier-5 |
| seed-ghost-gnn-classify.mjs | script | gnn-refpool | GNN classify ghost-unwired nodes (name-derived) |
| seed-ghost-llm-classify.mjs | script | gnn-refpool | LLM classify ghost-unwired nodes (name-derived) |
| seed-ghost-nodes.mjs | script | gnn-refpool | seed ghost nodes into graph (name-derived) |
| ghost-wire-outcomes-to-refpool.mjs | script | gnn-refpool | closed-loop outcomes -> ref-pool (name-derived) |
| validate-ghost-wires.mjs | script | ghost-roosts | validate ghost-wire edges (name-derived) |
| audit-viz-dual-registration.mjs | script | ghost-roosts | FAST[]+splice both-or-neither static auditor |
| generate-*-features.mjs (~52) | script | ghost-roosts | per-unit ghost-roost augmentation generators (name-derived) |
| generate-database-surfaces-roost.mjs | script | ghost-roosts | DB-surfaces roost generator (verified in ls) |
| generate-galaxy-federation-roost-features.mjs | script | ghost-roosts | galaxy-federation roost (verified in ls) |
| generate-substrate-meta-roost-features.mjs | script | ghost-roosts | substrate-meta roost (verified in ls) |
| generate-cited-tips-viz-features.mjs | script | ghost-roosts | cited-tips corpus roost (verified in ls) |
| generate-echo-viz-layers-features.mjs | script | ghost-roosts | echo post-processor viz layers (verified in ls) |
| system-viz-obsidian-bridge-v2.mjs | script | cross-substrate | bidirectional graph <-> Obsidian vault bridge (name-derived) |
| generate-cross-substrate-edges.mjs | script | cross-substrate | typed ADD-only owned-by/documented-by/embeds edges (per doctrine) |
| system-viz-blast-radius / cot-reason-blast-radius.mjs | script | master-index | CoT blast-radius reasoning (name-derived) |
| system-viz-health.mjs | script | graph-regen | viz health check (name-derived) |
| system-viz-dead-pixel-sweep.mjs | script | graph-regen | dead-pixel node-quality sweep (name-derived) |
| system-viz-type-backfill.mjs | script | graph-regen | node type backfill scanner (name-derived) |
| system-viz-drift-overlay.mjs | script | graph-regen | drift overlay onto graph (name-derived) |
| system-viz-ghost-report.mjs | script | ghost-roosts | ghost-node report (name-derived) |
| system-viz-slot-ownership.mjs | script | cross-substrate | slot-ownership edges/report (name-derived) |
| system-viz-fleet-awareness.mjs | script | master-index | fleet-awareness overlay (name-derived) |
| render-viz-screenshot.mjs | script | canvas-3d | render 3D viewer screenshot (name-derived) |
| _server.cjs | script | canvas-3d | /system-viz HTTP/3D viewer server (per doctrine PATHS) |
| roadmap-to-viz-nodes.mjs / reconcile-roadmap-vs-viz.mjs | script | ghost-roosts | roadmap<->viz node reconcile (name-derived) |

> Entries marked "(name-derived)" were enumerated via `ls` but not header-read
> this pass; their category is inferred from filename + PATHS.md doctrine and
> should be header-verified before load-bearing citation (R12). All 13 engines
> and the 3 central scripts (regen-viz / system-viz-query / merge-augmentations)
> plus the node-card libs were header-read + grounded.
