# SYSTEM-VIZ/U-VIZ-NEAR — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR (slot:sierra): semantic nearest-neighbor node search -- 'system-viz-query near <id>' over the rtx6000 768d embedding pool

**Commit:** `d828f94dbae3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:55:25-05:00
**Tags:** system-viz, u-viz-near, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR (slot:sierra): semantic nearest-neighbor node search -- 'system-viz-query near <id>' over the rtx6000 768d embedding pool

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR (slot:sierra): semantic nearest-neighbor node search -- 'system-viz-query near <id>' over the rtx6000 768d embedding pool

The cheap-read surface had find (substring), subgraph (edges), node-card (read-by-id)
but NO SEMANTIC neighbor lookup. near <id> [--k N] streams the 60k-node 768d pool
(state/shared/nn-graph/node-embeddings-768d.jsonl), cosine-ranks top-K, enriches each
with its node-card (label/layer/kind). Bounded-memory two-pass readline stream -- NEVER
loads the 884MB graph (the in-memory path OOMs at ~384MB). Honest ENOEMBED on an
un-embedded id (R12). Lib scripts/lib/node-near-search.mjs (pure cosine/topK/stream),
12 reference-value tests; live: core.hooks_cl -> fe.cli/claude-brief-* (semantically tight).
```

## Files touched (4)
- scripts/lib/node-near-search.mjs      | 141 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/node-near-search.test.mjs | 138 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-viz-query.mjs          |  44 +++++++++++++++++++++++++++++++++++++++++++-
- 3 files changed, 322 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d828f94dbae3`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._