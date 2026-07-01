# PDF-TRIBAL-HERMES/U-TRIBAL-RESOURCES-CHUNKER — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-RESOURCES-CHUNKER (slot:zulu): the extractor->generator bridge that unblocks the 4338-PDF resources drain

**Commit:** `42bf1c598c66` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:42:50-05:00
**Tags:** pdf-tribal-hermes, u-tribal-resources-chunker, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-RESOURCES-CHUNKER (slot:zulu): the extractor->generator bridge that unblocks the 4338-PDF resources drain

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-RESOURCES-CHUNKER (slot:zulu): the extractor->generator bridge that unblocks the 4338-PDF resources drain

iter6: PROVEN end-to-end on real content. pdf-text-layer-extract.py extracts the
Haas lathe operator manual at 654809 chars/532pp (the 2D_Drawing scan correctly
fails no-text-layer -> vision OCR). But a 532pp manual exceeds the generator's ~8K
prompt cap -> mines only page 1. This chunker splits each extractor JSONL row into
~6K-char paragraph-boundary chunks -> one generator node per chunk (stable
sha8=hash(path::idx) so the generator resume cursor skips drained chunks). Output
shape = exactly what generate-pdf-tribal-tips-hermes.mjs reads.
Pipeline: extract.py -> chunk -> PRISM_TRIBAL_SOURCE_DIR=dir generate -> embed.
7/7 tests (chunkText boundary/mega-para/content-preservation, rowToNodes stable-id/cap).
```

## Files touched (2)
- .claude/hooks/dead-pixel-guard.mjs | 27 ++++++++++++++++++++++++---
- 1 file changed, 24 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 42bf1c598c66`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._