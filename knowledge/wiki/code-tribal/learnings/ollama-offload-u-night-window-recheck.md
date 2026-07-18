# OLLAMA-OFFLOAD/U-NIGHT-WINDOW-RECHECK — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-WINDOW-RECHECK (slot:zulu): between-jobs window re-check -- a long night job ending past 06:00 can no longer bleed the NEXT job into the 01:00 OCR batch GPU window or the workday (scrutiny P2 from U-NIGHT-BATCH). windowCheck injected (null for --force manual runs); every window-skipped job individually logged + surfaced in the summary. 13/13 tests (mid-run-close + back-compat pinned).

**Commit:** `44066f867239` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T11:04:56-05:00
**Tags:** ollama-offload, u-night-window-recheck, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-WINDOW-RECHECK (slot:zulu): between-jobs window re-check -- a long night job ending past 06:00 can no longer bleed the NEXT job into the 01:00 OCR batch GPU window or the workday (scrutiny P2 from U-NIGHT-BATCH). windowCheck injected (null for --force manual runs); every window-skipped job individually logged + surfaced in the summary. 13/13 tests (mid-run-close + back-compat pinned).

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-WINDOW-RECHECK (slot:zulu): between-jobs window re-check -- a long night job ending past 06:00 can no longer bleed the NEXT job into the 01:00 OCR batch GPU window or the workday (scrutiny P2 from U-NIGHT-BATCH). windowCheck injected (null for --force manual runs); every window-skipped job individually logged + surfaced in the summary. 13/13 tests (mid-run-close + back-compat pinned).
```

## Files touched (3)
- scripts/ollama-night-batch.mjs      | 30 ++++++++++++++++++++++++------
- scripts/ollama-night-batch.test.mjs | 25 +++++++++++++++++++++++++
- 2 files changed, 49 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 44066f867239`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._