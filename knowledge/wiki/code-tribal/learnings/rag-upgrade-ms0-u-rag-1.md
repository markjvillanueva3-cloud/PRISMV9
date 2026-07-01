# RAG-UPGRADE-MS0/U-RAG-1 — [MAIN] [RAG-UPGRADE-MS0]/U-RAG-1 (slot:golf): embed clamp 6K + skip-on-oversize

**Commit:** `db60c2ff9b01` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T12:56:43-05:00
**Tags:** rag-upgrade-ms0, u-rag-1, auto-distilled

## Subject
[MAIN] [RAG-UPGRADE-MS0]/U-RAG-1 (slot:golf): embed clamp 6K + skip-on-oversize

## Body
```
[MAIN] [RAG-UPGRADE-MS0]/U-RAG-1 (slot:golf): embed clamp 6K + skip-on-oversize

16000-char clamp still 500'd — Ollama runs nomic-embed-text with a smaller
default context. MAX_EMBED_CHARS 16000->6000, and the embed loop now skips a
single oversized file (failed++, continue) instead of aborting the whole
backfill; non-overflow errors (Ollama down) still fail loud. 16/16 tests.
Run resumes from ~10544 checkpointed entries.
```

## Files touched (2)
- scripts/embed-all-wiki.mjs | 24 +++++++++++++++++-------
- 1 file changed, 17 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till 500'd — Ollama runs nomic-embed-text with a smaller
- till fail loud. 16/16 tests.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db60c2ff9b01`
- Milestone envelope: `mcp-server/data/milestones/RAG-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._