# NN-GRAPH-MS0/U-NNG-NODE2VEC-TOPOLOGY — [MAIN] [NN-GRAPH-MS0]/U-NNG-NODE2VEC-TOPOLOGY: U3c — system-viz node feature projector

**Commit:** `0a10062dc08a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T23:56:30-05:00
**Tags:** nn-graph-ms0, u-nng-node2vec-topology, auto-distilled

## Subject
[MAIN] [NN-GRAPH-MS0]/U-NNG-NODE2VEC-TOPOLOGY: U3c — system-viz node feature projector

## Body
```
[MAIN] [NN-GRAPH-MS0]/U-NNG-NODE2VEC-TOPOLOGY: U3c — system-viz node feature projector

scripts/lib/systemviz-node-feature-projector.mjs — projects a system-viz graph
node into a fixed 8-d numeric feature vector (Float32Array, every component in
[0,1]): layer ordinal, tier, svi, coverage, log1p-percentile-scaled complexity
& actionCount, status, roi. The intrinsic-attribute complement to U3b's
topology embedding; together they feed GraphSAGE (U4).

sklearn-style fit/transform: computeFeatureStats(graph) finds P99 of the
heavy-tailed fields in one pass (P99 not max — resists a single outlier
crushing every other node), projectNodeFeatures(node, stats) is then pure.
Missing fields fail-soft to 0; computeFeatureStats reports missingAwareness /
missingBusinessValue counts so a degraded input graph stays observable (R12).
Node schema sampled from the live system-graph-normalized.json (v2.29.0).

32/32 node:test — [0,1] bound holds on an adversarial graph, fit/transform
discipline (stats fitted on graph A genuinely re-normalize graph B), P99
outlier-resistance vs max-scaling. Per-file 2-agent scrutiny PASS on both files.

This completes U3 (U-NNG-NODE2VEC-TOPOLOGY): U3a walks + U3b topology embedder
+ U3c feature projector. Next: U4 GraphSAGE training.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/lib/systemviz-node-feature-projector.mjs   | 225 ++++++++++++++
- .../lib/systemviz-node-feature-projector.test.mjs  | 345 +++++++++++++++++++++
- 2 files changed, 570 insertions(+)

## Lessons surfaced in commit body
- tile-scaled complexity

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a10062dc08a`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._