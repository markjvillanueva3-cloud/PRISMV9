# /system-viz Galaxy — Why it doesn't function + what to build

**Date:** 2026-05-25
**Scope:** Why PRISM's `/system-viz` 3D graph doesn't behave like the popular "Obsidian galaxy OS" videos, and what concretely needs to be built to close the gap.
**Status:** Research deliverable. Not a build plan. Sequenced shortlist at the end.

---

## TL;DR — the 5 root causes

1. **Scale mismatch.** "Obsidian galaxy" videos show 1-3K nodes with ~5 edges/node. PRISM's full graph is ~50K+ nodes / ~150K+ edges. Force-directed layouts don't converge above ~5K nodes; they collapse into a hairball. The galactic *look* requires curated sparsity, not raw completeness.
2. **No semantic clustering.** Galaxy videos cluster by topic via co-citation + Louvain/Leiden community detection. PRISM clusters by folder/file-type, which has no natural community structure → no constellation pattern emerges.
3. **No MOC (Map of Content) layer.** MOC notes are the gravity wells that organize Obsidian galaxies into named regions. PRISM has `wiki/index.md` (a flat list) instead. Without curated hubs, every node has equal visual weight.
4. **Renderer chokes at scale.** Three.js + 50K nodes = 5fps. Videos use WebGL2 instancing + level-of-detail (LOD) culling. PRISM's regen-viz pipeline also OOM-crashes at the *data* layer (`merge augmentations` stage, exit 134) before render even runs.
5. **Edges aren't maintained, just generated.** Obsidian graphs work because every `[[link]]` is a navigable, real connection. PRISM has many INFERRED edges that don't survive node rename/move → dangling refs → visual chaos.

---

## The recipe the popular videos actually use

| Archetype | Tools | Why it works visually |
|---|---|---|
| "Linking Your Thinking" (Nick Milo) | MOCs + atomic notes + tag taxonomy | Curated hubs create gravity |
| "Smart Connections" galaxies | OpenAI/Ollama embeddings → semantic similarity edges | Edges encode meaning, not just text mentions |
| "ExcaliBrain" hierarchical | Parent/child/friend relations in YAML frontmatter | Forced topology = predictable layout |
| "Juggl" advanced graph | Cypher-like graph query language | Subgraph filtering |
| "Graph Analysis" plugin | Co-citation + Louvain communities | Auto-cluster by usage |

**Common ingredients across all of them:** atomic notes + maintained bidirectional links + semantic embeddings + community detection + LOD rendering + filter-down navigation.

---

## What PRISM already has (don't rebuild)

- ✅ Atomic markdown notes in `knowledge/wiki/` (Karpathy LLM-wiki pattern)
- ✅ Memory vault (`knowledge/memories/`)
- ✅ `/system-viz` 3D renderer substrate
- ✅ `system-graph.json` + 28 augmentation overlay roosts
- ✅ Ollama for embeddings (when daemon up — currently down)
- ✅ Multi-layer L1-L13 roosts (galaxy → cluster equivalent)
- ✅ `wiki/index.md` (proto-MOC, flat list form)
- ✅ Tribal corpus (3700+ tips)
- ✅ Orphan-inventory + close-out-audit (active pruning machinery)

---

## What PRISM lacks — 24 items, 6 groups

### Group A — Data structure (5)
- **A1: MOC notes per domain.** Curated hub-notes (mill, lathe, wedm, cam, cad, post, scheduling, quality, business) with hand-picked links. Single biggest visual transformation — gravity wells.
- **A2: Bidirectional link integrity engine.** Rename a node → all refs auto-update. Today dangling refs accumulate.
- **A3: Semantic embedding edges.** Ollama-driven similarity links. Edges = meaning, not just text matches. Gated on Ollama daemon health.
- **A4: Tag taxonomy beyond folders.** `#concept/X`, `#psn-leg/Y`, `#status/Z`. Folders are too coarse for galaxy color-coding.
- **A5: Backlinks incremental index.** No more full-regen of backlinks per change.

### Group B — Layout engine (4)
- **B1: Louvain (or Leiden) community detection.** Auto-color clusters. Required for the constellation pattern.
- **B2: Pre-computed spatial positions cached.** Don't recompute layout every render — pin positions, only adjust on graph change.
- **B3: Constrained force simulation.** Bounded iterations + decay schedule = converges instead of jittering.
- **B4: Hierarchical zoom topology.** Galaxy → cluster → constellation → star. LOD shells, not single zoom level.

### Group C — Rendering performance (4)
- **C1: WebGL2 instancing.** Single draw call for 10K+ nodes.
- **C2: Level-of-detail (LOD).** Distant nodes render as points, only near nodes as full meshes.
- **C3: Viewport culling.** Don't render what's off-screen.
- **C4: Streamed graph data.** Load galaxy → cluster → star progressively, not 520MB up-front.

### Group D — Interaction UX (4)
- **D1: Live filters.** By tag, PSN-leg, recency, status, build-class. Persistent URL state.
- **D2: Local graph view.** Click node → see N-hop subgraph in side panel.
- **D3: Drill-down navigation.** Click cluster → expand to its stars with smooth camera.
- **D4: Search-with-highlight.** Type → matching nodes glow → camera frames the matches.

### Group E — Live updates (3)
- **E1: Incremental regen.** Append a single node without full pipeline re-run.
- **E2: Watch-mode.** Node change on disk → graph update in <1s (currently 7min).
- **E3: Stale-edge invalidation.** Removed node → its edges auto-prune.

### Group F — Brain rituals (4, Obsidian-specific)
- **F1: Daily notes** as time-anchored entry points (we have handoffs but no daily notes).
- **F2: Spaced repetition surface** for resurfacing dormant notes (we have `wiki-morning` skill, not graph-promoted).
- **F3: Note atomicity enforcement** — one-concept-per-note (CLAUDE.md is monolithic and growing).
- **F4: Active orphan curation** — auto-route orphan-inventory → graph-promoted UX, not buried report file.

---

## Immediate drift fix — concrete command

The data-layer blocker is `regen-viz.mjs` OOM at the merge-augmentations stage (exit 134, last seen 2026-05-25T17:15:42Z). The known-good pattern from `[MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP` (commit ee8be4fd2) is:

```bash
NODE_OPTIONS="--max-old-space-size=16384" node scripts/regen-viz.mjs
```

If 16GB still OOMs (the merge-augmentations stage loads all 28 overlays into RAM simultaneously — that's the real bug), the next step is a streaming-merge refactor: process one augmentation at a time, write incrementally, free between batches. Tracked as `[BUG-FIX]/U-REGEN-VIZ-STREAMING-MERGE`.

---

## Sequenced priority — if you ship one thing at a time

Compounding-leverage order (each enables the next):

| Order | Item | Why now |
|---|---|---|
| 1 | Drift fix (regen-viz heap-bump or streaming) | Without fresh data, every other improvement renders stale junk |
| 2 | A1 MOCs (~9 domain hubs) | Single biggest visual transformation — galaxy gets its gravity wells |
| 3 | B1 Louvain communities | Colors the galaxy into named regions |
| 4 | C1 + C2 LOD rendering | 50K nodes become navigable instead of hairball |
| 5 | B4 hierarchical zoom | The "drill into a cluster" UX from the videos |
| 6 | A3 Ollama semantic edges | When daemon is healthy; transforms edge meaning |
| 7 | D1-D4 interaction | Finishes the UX gap |
| 8 | E1-E3 live updates | Removes the regen lag |
| 9 | A2, A4, A5 | Hygiene that compounds over time |
| 10 | F1-F4 brain rituals | The "OS" half of "galaxy OS" |

**First 4 items would visually transform `/system-viz` from "hairball" to "navigable galaxy" with a few days of work — assuming the OOM is fixable.**

---

## Honest expectations

- **You will not get a galaxy with 50K nodes.** No video does. The videos curate down to 1-3K. PRISM should similarly emit a *visualized* graph that's a curated subgraph of the *queryable* graph. Two artifacts, two purposes.
- **The 2D HTML index proposed earlier is the queryable surface.** The 3D galaxy is the *visual* surface for human navigation, not a data tool.
- **Ollama down breaks A3 (semantic edges).** Until the daemon is stable, plan around regex/community-detection-only edges.
- **"Galaxy OS" videos heavily edit for visual effect.** Real-time interaction at video-level smoothness requires the C-group items (LOD + WebGL2 + culling), which is real engineering, not config.

---

## Out of scope (named, parked)

- `[BUG-FIX]/U-REGEN-VIZ-OOM-HEAP-BUMP` — fixed in seconds via NODE_OPTIONS; tracked
- `[BUG-FIX]/U-REGEN-VIZ-STREAMING-MERGE` — proper fix; multi-hour work
- `[BUG-FIX]/U-OLLAMA-DAEMON-HEALTH` — separate, the `/api/chat` death banner has been firing all session
- `[INFRA]/U-CLAUDE-GRAPH-INDEX` — the 2D HTML + JSONL index for Claude (proposed earlier)
- `PSN-HYBRID-ORCHESTRATOR-MS0` — the forcing-function milestone proposed earlier
- This research → spec → milestone path is: `SYSTEM-VIZ-GALAXY-MS0` (24 items × 6 groups; multi-week)

---

## What this doc IS

A research deliverable to guide future build sessions. It is not a roadmap envelope. It will be linked from:
- A new milestone envelope when one is approved (operator decision)
- Wiki entry: `knowledge/wiki/architecture/system-viz-galaxy-research.md` (TBD)
- CLAUDE.md pointer (when the build kicks off)

## What this doc IS NOT

- A build approval
- A claim that current `/system-viz` is fully broken (the renderer works; the data layer is stale)
- A claim that PRISM should ape Obsidian completely (PRISM's graph is bigger and more wired; it needs a tiered visualization)

---

## Appendix A — Stratified Manifold Architecture (the hybrid)

**Decision:** the visual is NOT a single metaphor. It is a **5-level semantic-zoom stratified manifold** where each scale uses the visual metaphor that fits that scale, and the math underlying every pixel comes from PRISM's actual graph metrics.

### The 5 levels

| Level | Scale | Metaphor | Why this fits here |
|---|---|---|---|
| L0 — Cosmos | 50K nodes overview | **Constellation map** — 11 labeled PSN-leg regions | Sparse + labeled = humans orient |
| L1 — Region | ~1K nodes/leg | **Subway lines** + cluster shading | Workflow paths through the region |
| L2 — Neighborhood | ~50 nodes | **Force-directed local graph** | Classic Obsidian "local graph" view |
| L3 — Node interior | 1 node × facets | **🔷 Tesseract** | Each node is genuinely 4D |
| L4 — Source | The file | **Markdown / code panel** | The leaf |

Transitions are morphs, never jump cuts. Eye follows one anchor the whole way down — this is the failure mode in multi-scale viz, so it's the primary UX constraint.

### Tesseract mechanics (L3 — the novel piece)

A tesseract has 8 cubical cells. Showing all 8 is spaghetti. Therefore:

1. **Default view:** 3 cells visible as nested cubes; 4th axis collapsed to a side slider
2. **Slider sweep:** drag the slider → inner cube morphs across the 4th dimension in real time
3. **Axis swap:** click any axis label → promote it to "in-view", demote another to slider. Like rotating a Rubik's cube in 4D
4. **Cell hover:** highlight the 2D face + side panel shows the underlying numbers
5. **Pivot to neighbor:** click the "outputs" cell → smooth zoom out to L2 with that downstream node as new center

### Tesseract axes adapt to node type

| Node type | 4 axes |
|---|---|
| Engine | inputs · algorithms · outputs · time (versions) |
| Dispatcher | actions · schemas · consumers · routing rules |
| Hook | events · matchers · outcomes · success-rate |
| Memory | timestamp · refs-to · refs-from · usage count |
| Skill | triggers · tools invoked · outcomes · adoption rate |
| Wiki entry | links-out · links-in · revisions · tags |
| Algorithm | inputs · kernel · convergence · stability domain |
| Formula | variables · physical regime · uncertainty · provenance |

### Math drives every visual property

Nothing decorative. Every pixel encodes a query-able number:

| Property | Driver | PRISM source |
|---|---|---|
| L0/L1 position | UMAP/t-SNE projection of node embedding | embedding index (gated on Ollama) |
| Node size | PageRank centrality | `pr_compute_scores` action |
| Node color | Louvain/Leiden community | community detection lib |
| Edge thickness | Mutual information / causal strength | NN-graph predictor scores |
| Edge curvature | Hyperbolic distance | Poincaré ball projection |
| Cluster boundary | Silhouette score threshold | cluster validation |
| Tesseract face brightness | Attention weight for current query | NN attention |
| Time-axis position | Recency × usage decay | commit log + usage telemetry |

### Two additional layers (don't pick one — overlay them)

- **Fractal self-similarity.** repo → domain → engine → algorithm → formula → constant. Each scale shows the same archetype (hub-spoke-with-bridges). UX: the gesture that works at L0 works at L3. Muscle-memory transfer.
- **Knot diagrams at L1 for bridges.** The 16 deep-integration bridges (SFC→CAM, Master-Post→CAM, 3-tier AI) rendered as mathematical knots — over/under crossings. Topology becomes data: trefoil = strongly linked, simple arc = loose coupling, crossing number = integration complexity.

### Worked example: `CADAdaptiveLearningEngine`

```
L0  Constellation: "Engines" leg, ~3500 stars. Click "CAD" cluster.
L1  Subway: "learn-loop" line visible. Engine is a station. Click it.
L2  Local graph: this engine + 12 neighbors. Edges visible:
    LearningSystem (in), CADReplayBuffer (in), PRISMSelfAwareness (out),
    4 dispatchers wired. Click the engine.
L3  Tesseract opens: inputs cell + algorithms cell + outputs cell visible,
    time slider on the right. Drag slider to yesterday → see what changed.
    Click an algorithm name in cell 2.
L4  Source code panel for that algorithm. Tesseract collapses to thumbnail.
```

### Build effort breakdown

| Component | Effort vs flat-galaxy | Note |
|---|---|---|
| L0 constellation rendering | 1.0× | Same as today's `/system-viz` overview |
| L1 subway layer | 1.0× | New; uses existing pipeline-edge data |
| L2 local graph | 0.5× | Partially built |
| **L3 tesseract** | **2.0×** | Novel; needs WebGL + 4D projection math |
| L4 transition | 0.5× | Standard panel swap |
| Smooth transitions | 1.0× | Polish layer |
| Fractal coherence | 0.5× | Design once, reuse |
| Knot rendering | 0.5× | Only 16 edges |
| **Total** | **~5.0×** flat-galaxy | Multi-week milestone |

**Sequenceable:** L0+L1+L2 alone = ~2.5× effort, delivers 70% of the UX win. L3 tesseract can be a v2 unit. The milestone is not all-or-nothing.

### Why this works for PRISM specifically

- PRISM has **named structure** (PSN legs) — the metaphor uses it (constellation regions)
- PRISM has **pipelines** (print→program, quote→ship) — the metaphor uses them (subway lines)
- PRISM has **multi-dimensional nodes** — tesseract is the right tool
- PRISM is **self-similar** at every scale — fractal is the right gesture
- PRISM has **explicit cross-domain bridges** — knots make them visible

It's principled (the structure actually is stratified at different topology per scale), it's mathematical (every visual is a number), and it's novel (no YouTube video has this — it's a real contribution, not aesthetic copy).
