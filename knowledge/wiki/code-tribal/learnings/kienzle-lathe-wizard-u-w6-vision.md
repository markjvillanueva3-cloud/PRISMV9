# KIENZLE-LATHE-WIZARD/U-W6-VISION — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W6-VISION (slot:whiskey): lathe tribal vision-route + auto-discovery

**Commit:** `8f1434d8a500` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T08:24:27-05:00
**Tags:** kienzle-lathe-wizard, u-w6-vision, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W6-VISION (slot:whiskey): lathe tribal vision-route + auto-discovery

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W6-VISION (slot:whiskey): lathe tribal vision-route + auto-discovery

Image-heavy PDFs (tool catalogs, Siemens cycle docs) that pypdf reads as <200
chars are now RESCUED via a vision fallback: PyMuPDF raster -> local vision model
(qwen2.5vl:7b, Blackwell-resident) -> transcription -> the SAME extractTips() step
($0-Claude). Corpus is now AUTO-DISCOVERED across the verified lathe roots
(lathe-tribal-corpus-discover.mjs, mill-exclude + word-boundary filter) -- 12
hard-coded -> 48 lathe PDFs, rot-proof + 'all means all'. Un-skipped 8 stale
no-text records so the drain re-processes them via vision.

LIVE-VALIDATED: image-heavy Sumitomo catalog -> via=pdf-vision, +15 real tips;
schwanog grooving (text) +15. corpus 49->71. 11/11 discover-lib tests; node --check.

2-arm per-file scrutiny: 2 P1 fixed -- (1) filter contamination (bare 'thread'
pulled a Thread-MILLING doc -> MILL_EXCLUDE veto + word-boundary 'boring'); (2) an
Ollama model-not-found body was silently a PERMANENT skip -> transcribePage/extractTips
throw on body.error (retriable). Re-verified PASS. corpus jsonl gitignored (data).
```

## Files touched (4)
- scripts/lathe-tribal-ollama-ingest.mjs            | 136 +++++++++++++++++++++++++++++++++++++++++++++++++++++++-------
- scripts/lib/lathe-tribal-corpus-discover.mjs      |  80 ++++++++++++++++++++++++++++++++++++
- scripts/lib/lathe-tribal-corpus-discover.test.mjs | 108 +++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 310 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8f1434d8a500`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._