# RAG-UPGRADE-MS0/U-RAG-2 — [MAIN] [RAG-UPGRADE-MS0]/U-RAG-2 (slot:golf): wire two-stage lexical rerank into tribal-by-domain-inject

**Commit:** `6df057e0980e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T13:45:50-05:00
**Tags:** rag-upgrade-ms0, u-rag-2, auto-distilled

## Subject
[MAIN] [RAG-UPGRADE-MS0]/U-RAG-2 (slot:golf): wire two-stage lexical rerank into tribal-by-domain-inject

## Body
```
[MAIN] [RAG-UPGRADE-MS0]/U-RAG-2 (slot:golf): wire two-stage lexical rerank into tribal-by-domain-inject

The tribal-by-domain inject hook had a single cosine retrieval stage
(tribal-rerank.mjs). The 2026 RAG research prescribes a second careful
rerank stage on top of recall — this wires the already-shipped pure
lexical reranker (scripts/lib/lexical-rerank.mjs, U-RAG-2 lib) as that
stage 2. Cosine pass now fetches STAGE1_K candidates (recall); the new
applyLexicalRerank() re-scores them on exact-phrase / coverage / title /
density and narrows to TOP_K (precision). Pure, no model, no network —
safe inside a per-UserPromptSubmit hook where a cross-encoder is not.
+7 tests (47/47), per-file scrutiny 2/2 PASS.
```

## Files touched (3)
- .claude/hooks/tribal-by-domain-inject.mjs      | 53 +++++++++++++++++++--
- .claude/hooks/tribal-by-domain-inject.test.mjs | 66 ++++++++++++++++++++++++++
- 2 files changed, 115 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6df057e0980e`
- Milestone envelope: `mcp-server/data/milestones/RAG-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._