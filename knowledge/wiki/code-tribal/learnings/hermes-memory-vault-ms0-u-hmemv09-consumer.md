# HERMES-MEMORY-VAULT-MS0/U-HMEMV09-CONSUMER — [MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-CONSUMER (slot:zulu): live memory recall reads Qdrant ANN (prism_memories), int8 scan fallback

**Commit:** `4c6d8ed40cf0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T13:50:48-05:00
**Tags:** hermes-memory-vault-ms0, u-hmemv09-consumer, auto-distilled

## Subject
[MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-CONSUMER (slot:zulu): live memory recall reads Qdrant ANN (prism_memories), int8 scan fallback

## Body
```
[MAIN] [HERMES-MEMORY-VAULT-MS0]/U-HMEMV09-CONSUMER (slot:zulu): live memory recall reads Qdrant ANN (prism_memories), int8 scan fallback

denseRankViaQdrant: top-N ANN over the 17,032-vector prism_memories HNSW index
(payload.node_id == recordKey, drops into the existing RRF + byKey hydrate).
tryHybridFuse is now Qdrant-primary -- no 21.9MB sidecar load per prompt -- with
the linear int8 scan lazy-loaded ONLY on Qdrant-miss (fail-soft, revert via
PRISM_MEMORY_QDRANT_DISABLE=1). Fires from memory-index-precheck-inject across
all 26 slots.

Scrutiny-hardened (2-of-2 PASS): try/catch wrap so a dense-arm throw degrades to
BM25-only never propagating to the sync hook; symmetric EMBED_DIM=768 guard so a
wrong-dim query skips Qdrant; seen-Set dedup. 69/69 tests; live ANN 68ms,
source=hybrid validated warm. HMEMV09 memory-corpus slice done (tribal+wiki
corpora remain) -> envelope in_progress + note.
```

## Files touched (4)
- mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json |   3 +-
- scripts/lib/memory-index-search-lib.mjs                 | 150 +++++++++++++++++++++++++++++++++++-------
- scripts/lib/memory-index-search-lib.test.mjs            | 265 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 395 insertions(+), 23 deletions(-)

## Lessons surfaced in commit body
- wrong-dim query skips Qdrant; seen-Set dedup. 69/69 tests; live ANN 68ms,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c6d8ed40cf0`
- Milestone envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._