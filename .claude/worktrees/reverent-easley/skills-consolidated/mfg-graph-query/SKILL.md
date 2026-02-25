---
name: mfg-graph-query
description: Query the manufacturing knowledge graph for relationships and facts
---

# Knowledge Graph Query

## When To Use
- Finding relationships between materials, tools, machines, and processes
- Answering factual questions about manufacturing knowledge
- Discovering what tools/materials/methods relate to a given concept
- Building context for complex manufacturing decisions

## How To Use
```
prism_intelligence action=graph_query params={query: "tools for titanium milling"}
```

## What It Returns
- `nodes` — matched knowledge graph entities with types and properties
- `edges` — relationships between matched entities (e.g., "suited_for", "requires")
- `confidence` — relevance score for each result
- `path` — traversal path showing how entities connect
- `metadata` — source references and last-updated timestamps

## Examples
- `graph_query params={query: "tools for titanium milling"}` — find tooling knowledge for Ti machining
- `graph_query params={query: "coolant types for stainless steel drilling"}` — retrieve coolant-material relationships
- `graph_query params={query: "failure modes for carbide end mills"}` — query known failure patterns
