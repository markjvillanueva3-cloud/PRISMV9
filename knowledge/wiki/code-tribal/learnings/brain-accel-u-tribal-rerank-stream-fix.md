# BRAIN-ACCEL/U-TRIBAL-RERANK-STREAM-FIX — [MAIN] [BRAIN-ACCEL]/U-TRIBAL-RERANK-STREAM-FIX (slot:sierra): shard-aware inject gate + doc-drift (scrutiny reviewer-C P3)

**Commit:** `e7704ba4504d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T04:37:24-05:00
**Tags:** brain-accel, u-tribal-rerank-stream-fix, auto-distilled

## Subject
[MAIN] [BRAIN-ACCEL]/U-TRIBAL-RERANK-STREAM-FIX (slot:sierra): shard-aware inject gate + doc-drift (scrutiny reviewer-C P3)

## Body
```
[MAIN] [BRAIN-ACCEL]/U-TRIBAL-RERANK-STREAM-FIX (slot:sierra): shard-aware inject gate + doc-drift (scrutiny reviewer-C P3)

R15 completeness for U-TRIBAL-RERANK-STREAM (17294fc77f): the streaming rerank
unblocks index growth, and that growth is exactly what triggers the shard writer
(>480MiB -> manifest + shard files, monolith .json disappears). Reviewer-C caught
that tribal-by-domain-inject.mjs:runRerank gated on existsSync(INDEX_PATH) ONLY,
so post-shard it would return index_missing and silently kill PSN leg5 before
ever spawning the now-manifest-aware rerank. Widen the gate to accept the sibling
.manifest.json too (mirrors the rerank's own dual existence check). Behavior is
IDENTICAL today (monolith present -> the && short-circuits exactly as before);
the change only adds forward-compat for the sharded layout.

Also doc-drift (R12): walkEntriesArray's JSDoc said 'Returns an array' (it returns
a COUNT via callback) -> corrected; load-tribal-index.mjs header export list +
WRITE-side-needs-sharding note updated (sharding shipped in write-tribal-index.mjs).

Verified: node --check both files clean; 16/16 tests still pass; widened gate
proven non-regressive (monolith exists today). Doc-only + 1-conditional guard.
```

## Files touched (3)
- .claude/hooks/tribal-by-domain-inject.mjs |  9 ++++++++-
- scripts/lib/load-tribal-index.mjs         | 20 +++++++++++++-------
- 2 files changed, 21 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till pass; widened gate

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7704ba4504d`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._