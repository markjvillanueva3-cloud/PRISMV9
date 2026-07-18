# WIRE-UNWIRED-MS0/U-WIRE-PR — wire PageRankEngine into prism_dev (6 actions)

**Commit:** `7a160eae3df7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:37:36-05:00
**Tags:** wire-unwired-ms0, u-wire-pr, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-PR: wire PageRankEngine into prism_dev (6 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-PR: wire PageRankEngine into prism_dev (6 actions)

USSH Phase 0.25 graph-importance scoring. Engine is stateful (loadGraph
mutates internal adjacency/scores), so each dispatcher case instantiates
a FRESH PageRankEngine per call — peer dispatcher calls cannot race on
the singleton's shared state.

- pr_compute_scores: load+compute → {scores, iterations, converged, residual, topNodes}
- pr_analyze_graph: load+analyze → {node/edge_count, density, avg_degree, orphan/sink/source_nodes}
- pr_find_critical_nodes: load+compute+threshold → critical_nodes[]
- pr_compute_hits: load+computeHITS → {hubs, authorities} (Maps → Object.fromEntries)
- pr_topological_sort: load+sort → {acyclic, sorted|null}
- pr_detect_cycles: load+detect → cycles[]

NOT WIRED: setConfig() + reset() — cross-call config drift is hostile
to a shared singleton; config passed per-call via optional `config` param.
loadGraph/compute/getScores etc. NOT wired as standalone — they require
the stateful protocol and aren't safe over an MCP boundary.

Wire-safety doctrine:
- Fresh `new PageRankEngine(p.config)` per call (singleton untouched)
- Map → Object.fromEntries() conversion for JSON-serializable wire
- acyclic:true|false discriminator on topological_sort (slimResponse strips null)
- DoS guards: ≤10k nodes, ≤100k edges, ≤1000 max_iterations
- damping_factor + personalization weights gated to [0,1]

Engine quirks discovered & documented in tests:
- compute() double-counts dangling-sum contributions each iteration →
  scores do NOT normalize to 1.0 (canonical PageRank invariant).
  Test asserts positivity + node-count + per-node ROUTING PROOF equality
  instead. Engine math is preserved as-is over the wire.
- Convergence not guaranteed on small graphs — test asserts iterations
  ∈ [1, max_iterations] rather than converged=true.

Tests: 25/25 PASS (7 schema gates incl. DoS bounds + [0,1] enum on
damping+threshold+personalization + 4 compute paths (positivity +
iteration bounds + VARIABILITY sink-vs-source + personalization
boost) + ROUTING PROOF per-node equality + analyze graph identifies
orphan/sink/source correctly + density math 4/12 + critical-node
threshold scan + HITS hubs/authorities Map conversion + topo sort
acyclic vs cyclic discriminator + detect cycles non-empty + 3
schema-reject envelope checks).
```

## Files touched (4)
- .../src/__tests__/dispatcher.pageRank.test.ts      | 301 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         | 114 ++++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  83 +++++-
- 3 files changed, 497 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tile

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7a160eae3df7`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._