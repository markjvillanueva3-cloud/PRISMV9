# OBSIDIAN-AI-SYNERGY/U-GNN-BRIDGE-SHARD-AWARE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-GNN-BRIDGE-SHARD-AWARE (slot:india): graph-node-embedding-bridge reads canonical shards not the deleted monolith

**Commit:** `a9b3b2ebeea3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:51:34-05:00
**Tags:** obsidian-ai-synergy, u-gnn-bridge-shard-aware, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-GNN-BRIDGE-SHARD-AWARE (slot:india): graph-node-embedding-bridge reads canonical shards not the deleted monolith

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-GNN-BRIDGE-SHARD-AWARE (slot:india): graph-node-embedding-bridge reads canonical shards not the deleted monolith

buildEmbeddingSource read the index via readFile+JSON.parse on the monolith path (no shard-awareness; the graph read already had a streaming fallback, the index read did not). Since the monolith was deleted (shard migration 2026-06-08) the GNN embedding-source came up EMPTY -> 0 hits -> closed-loop ref-pool growth stalled (the embeddingHitCount=0 class this bridge exists to fix). Fix: loadTribalIndex (manifest-first) when !opts.readFileImpl; the injected test seam keeps the legacy text+parse path. LIVE: loadTribalIndex reads 35000 shard entries (all 768-d embedding), buildIndexLookup size 35000 dim 768 (was 0 on the absent monolith). +R9 regression test (shard fixture, NO monolith -> fails on a revert to the old read). 61/61 tests pass.
```

## Files touched (3)
- scripts/lib/graph-node-embedding-bridge.mjs      | 232 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------
- scripts/lib/graph-node-embedding-bridge.test.mjs | 243 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 459 insertions(+), 16 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a9b3b2ebeea3`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._