---
name: mfg-graph-traverse
description: Traverse and search the knowledge graph for connected concepts
---

# Graph Navigation Engine

## When To Use
- Exploring how manufacturing concepts connect to each other
- Finding all entities within N hops of a starting concept
- Searching the graph by entity properties or relationship types
- Building context by walking the graph from a known starting point

## How To Use
```
prism_intelligence action=graph_traverse params={start: "carbide_end_mill", depth: 3, direction: "outbound"}
```

```
prism_intelligence action=graph_search params={query: "coated inserts", entity_type: "tool", limit: 10}
```

## What It Returns
- `nodes` — traversed nodes with types, properties, and depth from start
- `edges` — relationships connecting the traversed nodes
- `paths` — complete paths from start node to each discovered node
- `subgraph` — the extracted subgraph as an adjacency structure
- `stats` — traversal statistics (nodes visited, max depth reached, time)

## Examples
- `graph_traverse params={start: "Ti-6Al-4V", depth: 2, edge_filter: "machined_with"}` — find all tools/strategies connected to titanium
- `graph_search params={query: "high temperature alloy", limit: 5}` — search for HTA-related graph entities
- `graph_traverse params={start: "chatter", depth: 3, direction: "both"}` — explore the chatter concept neighborhood
