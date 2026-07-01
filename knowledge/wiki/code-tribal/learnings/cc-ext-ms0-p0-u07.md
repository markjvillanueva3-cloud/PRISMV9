# CC-EXT-MS0/P0-U07 — [MAIN] [CC-EXT-MS0]/P0-U07 + [BP-MS0]/U-LEARN1 (slot:lima): document routes + close-out

**Commit:** `d915fa3be815` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T14:55:42-05:00
**Tags:** cc-ext-ms0, p0-u07, auto-distilled

## Subject
[MAIN] [CC-EXT-MS0]/P0-U07 + [BP-MS0]/U-LEARN1 (slot:lima): document routes + close-out

## Body
```
[MAIN] [CC-EXT-MS0]/P0-U07 + [BP-MS0]/U-LEARN1 (slot:lima): document routes + close-out

CC-EXT-MS0/P0-U07: 5 Express document routes added to routes/learning.ts wiring
prism_doc_learn (documentLearningDispatcher) into /api/v1/learning:
  POST /document/upload   -> doc_upload
  POST /document/extract  -> doc_extract
  GET  /documents         -> doc_list
  GET  /document/:id      -> doc_get   {document_id}
  DELETE /document/:id    -> doc_delete {document_id}
5 new integration tests in learning-routes.test.ts (10/10 pass).
documentLearningDispatcher pre-existed + registered; only Express adapter missing.

BP-MS0/U-LEARN1: verified close-out (no rebuild). LearningProgressionEngine
(courses+checkpoints, 19.5K) pre-existed + wired to operatingSystemDispatcher
(9 actions: course_create/get/enroll/progress/search, checkpoint_submit,
enrollment_summary, learning_media_add/list). presets-learning-engines.test.ts
passes (exit 0).

Both files type-clean; global tsc 529 errors are pre-existing peer churn in
unrelated dispatchers (calc/cam/data/dev/guard/infra/knowledge).
```

## Files touched (5)
- mcp-server/data/milestones/BP-MS0.json           | 863 +++++++++++++++++++++++
- mcp-server/data/milestones/CC-EXT-MS0.json       | 703 ++++++++++++++++++
- mcp-server/src/__tests__/learning-routes.test.ts |  43 ++
- mcp-server/src/routes/learning.ts                |  27 +
- 4 files changed, 1636 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d915fa3be815`
- Milestone envelope: `mcp-server/data/milestones/CC-EXT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._