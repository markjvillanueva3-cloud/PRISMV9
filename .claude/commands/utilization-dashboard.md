---
description: Graph-wide utilization classifier — buckets every PRISM node into hub/sink/source/orphan/ghost. Use to answer "what's actually being used?" and to surface the audit punch list (built-but-unwired, dead code).
allowed-tools: mcp__prism_safe__prism_session, Read
---

# /utilization-dashboard — Who's Using What

Classifies every node in the system-viz graph (excluding L9 fs root + L11 filesystem leaves by default) into one of six utilization buckets:

| Bucket | Definition | What it means |
|--------|------------|---------------|
| **hub** | high in-degree + high out-degree | Central infrastructure (dispatchers, orchestrators) |
| **sink** | high in-degree + low out-degree | Terminal consumer — many call it, it calls few (well-used utility / data registry) |
| **source** | low in-degree + high out-degree | Driver / orchestrator — few call it, it calls many |
| **orphan** | low in + low out + has docs | **Built but unwired** — audit punch list. Has wiki/memory entries so someone documented it, but the graph shows it's not connected. |
| **ghost** | low in + low out + no docs | **Dead-code candidate** — undocumented + unwired. Strong delete-or-wire signal. |
| **normal** | everything else | Functioning, ordinary usage |

"High" = ≥85th-percentile of in/out-degree across the filtered graph (computed dynamically per call). "Low" = ≤1.

## When to use

- "What's actually being used in PRISM?" → run dashboard, look at hubs + sinks
- "What did we build but forget to wire?" → look at `topOrphans` (sorted by utilization desc)
- "What's dead code we should delete?" → look at `topGhosts`
- "How do dispatchers vs registries break down?" → check `byLayer` (L4=dispatchers, L7=registries)
- Roadmap planning: orphans + ghosts are the cheap-wins backlog

## Args

- *(none — interactive)*: prompt for layer filter
- `--layer <L4|L5|...>`: restrict to layers
- `--exclude <L9,L11>`: override default exclusion list

## How it runs

```
prism_session:master_index_utilization_dashboard  { layers?, exclude_layers? }
```

## Output shape

```json
{
  "totals": {
    "nodesScanned": 1234,
    "hubs": 18, "sinks": 142, "sources": 32,
    "orphans": 87, "ghosts": 411, "normal": 544
  },
  "byLayer": {
    "L4": { "hub": 18, "sink": 0, ..., "normal": 79 },   // dispatchers
    "L5": { "hub": 0, "sink": 142, ..., "normal": 200 }, // engine domains
    "L7": { ... },                                        // registries
    ...
  },
  "topHubs":    [ { id, label, layer, status, inDegree, outDegree, utilization, class, hasDocs }, ... ],
  "topOrphans": [ ... ],   // sorted by utilization desc — most-documented orphans first
  "topGhosts":  [ ... ],   // dead-code candidates
  "graphMtime": "2026-05-12T...",
  "warnings":   []
}
```

## Why this exists

User goal (2026-05-12): *"prism awareness system so we know exactly what is built, still needs building, what is wired and needs wiring and **how to determine whether a node is being fully utilized**."* This skill answers the last clause directly — it's the per-node utilization classifier the goal explicitly named.

Companion to `/master-index <query>` (search-first), `/build-state` (high-level built/needs-wiring totals), `/system-viz` (3D viewer). Where `/build-state` answers "how many engines are unwired in aggregate", this answers "*which specific* nodes are orphans vs hubs vs ghosts."

Backed by `MasterIndexEngine.classifyAllNodes()` (mtime-cached graph + log-normalized utilization scores). Shipped 2026-05-12 OBSIDIAN-PRISM-OS-MS0/U-NODE-UTILIZATION (slot alpha).
