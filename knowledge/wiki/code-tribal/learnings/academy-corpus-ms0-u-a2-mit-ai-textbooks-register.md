# ACADEMY-CORPUS-MS0/U-A2-MIT-AI-TEXTBOOKS-REGISTER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTBOOKS-REGISTER (slot:alpha, taking over for lima): register the 12 cyrilXBT MIT-Press AI/ML textbooks into pdf-sources/registry.json as a new ai_textbook category + extend PDFSourceRegistryEngine type

**Commit:** `1443283f8b71` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T14:07:25-05:00
**Tags:** academy-corpus-ms0, u-a2-mit-ai-textbooks-register, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTBOOKS-REGISTER (slot:alpha, taking over for lima): register the 12 cyrilXBT MIT-Press AI/ML textbooks into pdf-sources/registry.json as a new ai_textbook category + extend PDFSourceRegistryEngine type

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ACADEMY-CORPUS-MS0]/U-A2-MIT-AI-TEXTBOOKS-REGISTER (slot:alpha, taking over for lima): register the 12 cyrilXBT MIT-Press AI/ML textbooks into pdf-sources/registry.json as a new ai_textbook category + extend PDFSourceRegistryEngine type

A2 gap from the X-article verification (reference_rody_cyril_claude_setup_articles_2026_06_08). Verified the gap was REAL — the 12 grep-hits were false positives (JM-Die surnames + my own memory file, NOT ingested books).

- registry.json: +12 ai_textbook entries (Mohri/Prince/Goodfellow/Sutton-Barto/Murphy x2/Kochenderfer/Bellemare/Albrecht/Barocas/MIT-MLSysBook), canonical download URLs, status:pending, extractionTargets, topic tags, provenance source tag. 18->30 sources.
- PDFSourceRegistryEngine.ts: +ai_textbook to PDFSourceCategory union (data was off-contract without it).

Verified: 12/12 load via PDFSourceRegistryEngine overlay (line ~437), JSON parses, 0 new tsc errors under project tsconfig. Wired: 5 consumer engines read this registry.

PENDING (lima's, heavy job NOT done inline under memory load): download + page-by-page extract the 12, flip status pending->extracted, route to ai-training+academy (reasoning corpus, NOT physics constants).
```

## Files touched (3)
- mcp-server/data/pdf-sources/registry.json         | 561 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PDFSourceRegistryEngine.ts |   1 +
- 2 files changed, 562 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1443283f8b71`
- Milestone envelope: `mcp-server/data/milestones/ACADEMY-CORPUS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._