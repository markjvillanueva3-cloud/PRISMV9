---
name: mfg-ref-algorithms
description: Algorithms and data structures reference from MIT 6.006 and 6.046J
---

# MIT Algorithms & Data Structures Reference for Manufacturing

## When To Use
- Need algorithm design for manufacturing scheduling and sequencing
- Applying graph algorithms to process routing and dependency analysis
- Understanding NP-hardness and approximation for job shop scheduling
- Designing efficient search for tool selection or parameter optimization

## How To Use
```
prism_knowledge action=search params={
  query: "graph algorithms scheduling NP-hard approximation dynamic programming",
  registries: ["formulas", "courses"]
}
```

## What It Returns
- Graph traversal algorithms for prism_intelligence graph_query process routing
- Dynamic programming patterns for prism_intelligence optimize_sequence
- Approximation algorithm strategies for prism_intelligence shop_schedule
- Sorting and search structures for prism_intelligence algorithm_select

## Key Course Mappings
- **MIT 6.006** (Intro Algorithms): BFS/DFS, shortest path, DP, hashing -> graph_query, algorithm_select
- **MIT 6.046J** (Design & Analysis): Greedy, NP-completeness, approximation -> shop_schedule, optimize_sequence

## Examples
- **Process routing**: Use 6.006 shortest path (Dijkstra) via prism_intelligence graph_traverse for min-cost route
- **Job scheduling**: Apply 6.046J NP-hard approximation via prism_intelligence shop_schedule for makespan
- **Tool selection**: Use 6.006 hashing and search via prism_intelligence algorithm_select for fast lookup
- **Sequence optimization**: Apply 6.006 DP via prism_intelligence optimize_sequence for operation ordering
- **Dependency graphs**: Use 6.006 topological sort via prism_intelligence graph_query for precedence constraints
