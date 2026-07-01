# TOKEN-SAVINGS-EXPAND/U-EMBED-BATCH — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-EMBED-BATCH (slot:alpha): batch memo embeddings via /api/embed — HIGHVALUE-DISCOVERY #7 (in-lane slice)

**Commit:** `1dd17250b376` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:47:35-05:00
**Tags:** token-savings-expand, u-embed-batch, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-EMBED-BATCH (slot:alpha): batch memo embeddings via /api/embed — HIGHVALUE-DISCOVERY #7 (in-lane slice)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-EMBED-BATCH (slot:alpha): batch memo embeddings via /api/embed — HIGHVALUE-DISCOVERY #7 (in-lane slice)

embedTextBatch() in memo-embed-lib embeds an ARRAY of texts in ONE /api/embed
call (verified live: array input -> 3x768-d distinct vectors) instead of N serial
/api/embeddings round-trips. build-memo-embedding-cache restructured: Phase 1
pure reuse-scan (unchanged), Phase 2 batched embed (BATCH_SIZE=64, knob
PRISM_MEMO_EMBED_BATCH) with PER-BATCH fail-soft -> per-item embedText fallback
so one bad batch never loses the run. Order-aligned (one vec per input; empty
slots -> null); count-mismatch/timeout/non-200 -> null -> caller falls back.

Live: --full --limit 80 (2 batches) -> 78 vectors/768-d in 0.576s (per-item full
1490-build was 36s; batched ~3x faster). 15/15 lib tests (3 new: empty->[],
all-empty->nulls, unreachable->null bounded).

In-lane slice of #7 (the memo cache is alpha/F3-owned). The GNN/wiki embedding
scripts (build-node-embeddings, build-wiki-embeddings) are india/sierra territory —
they can adopt embedTextBatch the same way. NO 768-d/int8 invariant change here.
```

## Files touched (4)
- scripts/build-memo-embedding-cache.mjs | 37 ++++++++++++++++++++++++++++++++-----
- scripts/lib/memo-embed-lib.mjs         | 48 ++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/memo-embed-lib.test.mjs    | 21 ++++++++++++++++++++-
- 3 files changed, 100 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1dd17250b376`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._