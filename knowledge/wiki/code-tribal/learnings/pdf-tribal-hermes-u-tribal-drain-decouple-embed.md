# PDF-TRIBAL-HERMES/U-TRIBAL-DRAIN-DECOUPLE-EMBED — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-DECOUPLE-EMBED (slot:zulu): --no-embed flag decouples fast generate from slow full-index embed

**Commit:** `b99d6c8e7ac7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T22:44:01-05:00
**Tags:** pdf-tribal-hermes, u-tribal-drain-decouple-embed, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-DECOUPLE-EMBED (slot:zulu): --no-embed flag decouples fast generate from slow full-index embed

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-DECOUPLE-EMBED (slot:zulu): --no-embed flag decouples fast generate from slow full-index embed

LIVE: drain GENERATED great (4388+ tips from rich manuals) but index stayed 76071
-- the 19-min task limit killed each tick mid-embed. Caught up: +3056, 76071->79127.
Fix (R7): --no-embed=generate-only tick (resumable); a separate session-independent
PRISM Tribal Embed scheduled task (every 15min) owns the index rewrite. 6/6 tests.
```

## Files touched (2)
- scripts/drain-resources-tribal.mjs | 19 +++++++++++++++----
- 1 file changed, 15 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b99d6c8e7ac7`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._