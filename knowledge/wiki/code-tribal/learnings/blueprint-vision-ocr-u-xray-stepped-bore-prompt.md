# BLUEPRINT-VISION-OCR/U-XRAY-STEPPED-BORE-PROMPT — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-STEPPED-BORE-PROMPT (slot:xray): extraction prompt now captures far-side smaller IDs + lead-in chamfers on stepped bores

**Commit:** `84a78522f820` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T22:53:19-05:00
**Tags:** blueprint-vision-ocr, u-xray-stepped-bore-prompt, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-STEPPED-BORE-PROMPT (slot:xray): extraction prompt now captures far-side smaller IDs + lead-in chamfers on stepped bores

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-STEPPED-BORE-PROMPT (slot:xray): extraction prompt now captures far-side smaller IDs + lead-in chamfers on stepped bores

Operator found the VLM systematically MISSED the smaller diameter ID on the far/
opposite side of a stepped bore + the lead-in chamfer transitioning to it (it read
the dominant near-side ID and stopped). The schema already supported diameter/
chamfer/counterbore, but the prompt never told the model a bore can have MULTIPLE
diameters along its axis. Added 3 RULES to buildVisionPrompt: (1) report EVERY
diameter of a stepped/counterbore/through-bore incl. the smaller far-side ID, read
section views from BOTH ends; (2) capture lead-in/transition/counterbore chamfers
between two diameters as type chamfer; (3) keep the anti-hallucination guard (only
dimensions ACTUALLY shown; do not invent). +1 regression test (65/65).

Applies to ALL extraction (nightly loop + broad OCR). Live re-OCR validation could
not run in-session (in-session VLM procs get reaper-killed -- known constraint); the
fix is prompt-level verified and takes effect on the reaper-immune nightly re-run.
```

## Files touched (3)
- scripts/lib/ollama-vision-extract-lib.mjs      | 3 +++
- scripts/lib/ollama-vision-extract-lib.test.mjs | 9 +++++++++
- 2 files changed, 12 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 84a78522f820`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._