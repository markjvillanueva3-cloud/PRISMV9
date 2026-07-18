# CAD Graph — Topology-aware CAD dependency graph

Build or query a CAD knowledge graph using `CADKnowledgeGraphEngine`
(CADCAM-DAGI-MS0/U-DAGI02). Nodes are Sketch / Plane / Feature / Body /
Assembly. Edges are references / modifies / constrains / contains.

## Usage
- `/cad-graph build <ops-json-file>` — build graph from op list; print stats
- `/cad-graph cycles <graph-json>` — detect cycles (Johnson DFS)
- `/cad-graph orphans <graph-json>` — report unconnected nodes
- `/cad-graph ancestors <graph-json> <node-id>` — transitive upstream
- `/cad-graph descendants <graph-json> <node-id>` — transitive downstream
- `/cad-graph jsonld <graph-json>` — emit W3C JSON-LD for interop
- `/cad-graph validate <graph-json>` — cycles + orphans + dangling-edge check

## Node Types
`Sketch` · `Plane` · `Feature` · `Body` · `Assembly`

## Edge Types
`references` · `modifies` · `constrains` · `contains`

## Steps
1. Parse `$ARGUMENTS` to extract subcommand + path(s).
2. For `build`:
   a. Read the ops-json file (array of CADOperationInput).
   b. Call `prism_cad:graph_build` with `{ operations }`.
   c. Output node/edge counts, degree distribution, detected orphans.
3. For `cycles` | `orphans` | `ancestors` | `descendants` | `jsonld`:
   a. Read the graph JSON.
   b. Call `prism_cad:graph_query` with `{ graph, query, node_id? }`.
4. For `validate`:
   a. Call both `detect_cycles` and `find_orphans`.
   b. Additionally check every edge.from/edge.to resolves to a node id.

## Invariants
- Every Sketch has exactly one Plane reference (auto-materialized if absent).
- Features produce a new Body (solid-producing + booleans + fillet/chamfer/
  hole/pattern).
- Acyclic in the dependency closure — cycles abort per U-DAGI02 criteria.

## Output Format
```
BUILD:  <n> nodes, <m> edges
        Sketch=<c>, Plane=<c>, Feature=<c>, Body=<c>, Assembly=<c>
        orphans: <count>, cycles: <count>

QUERY:  <query-name> -> <result-summary>
```

## Related
- Engine: `src/engines/CADKnowledgeGraphEngine.ts`
- Tests: `src/__tests__/CADKnowledgeGraphEngine.test.ts`
- Hook: `.claude/hooks/cad-graph-integrity.mjs`
- Actions: `prism_cad:graph_build`, `prism_cad:graph_query`
- Input source: usually the output of `/cad-tokenize` + op parsing.
