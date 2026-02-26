---
name: prism-graph-algo
description: |
  Graph algorithms from MIT 6.006/18.433. Dijkstra, A*, Prim/Kruskal MST, topological sort, Christofides TSP approximation.

  MIT 6.006 (Intro to Algorithms), MIT 18.433
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "Dijkstra", "shortest path", "A-star", "MST", "minimum spanning tree", "topological sort", "TSP", "graph algorithm", "Christofides"
- Source: `C:/PRISM/extracted/algorithms/PRISM_GRAPH_ALGORITHMS.js`
- Category: algorithms

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-graph-algo")`
2. Functions available: dijkstra, aStar, primMST, kruskalMST, topologicalSort, christofides
3. Cross-reference with dispatchers:
   - prism_toolpath
   - prism_calc

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_GRAPH_ALGORITHMS.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply dijkstra() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Graph Algo

## Source
**MIT 6.006 (Intro to Algorithms), MIT 18.433**

## Functions
dijkstra, aStar, primMST, kruskalMST, topologicalSort, christofides

## Integration
- Extracted from: `PRISM_GRAPH_ALGORITHMS.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: Dijkstra, shortest path, A-star, MST, minimum spanning tree
