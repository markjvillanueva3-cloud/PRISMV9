# BLUEPRINT-VISION-OCR/U-APP-REDACT-WIRE-DOCS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE-DOCS (slot:xray): wiki lesson for the P1 customer-name-in-KEY redaction leak

**Commit:** `e2165ab2a065` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:59:46-05:00
**Tags:** blueprint-vision-ocr, u-app-redact-wire-docs, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE-DOCS (slot:xray): wiki lesson for the P1 customer-name-in-KEY redaction leak

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE-DOCS (slot:xray): wiki lesson for the P1 customer-name-in-KEY redaction leak

Bug-finding->wiki gate companion to 62c20067d1. A structured-data redactor must scrub object KEYS as well as VALUES (an identity can BE the key in a per-customer map / title-block-as-key), and a tier tuned for free-text over-redaction safety is the WRONG tier for a whole-key exact match (use the full registry). Memory: reference_xray_app_redact_wire_2026_06_23.
```

## Files touched (2)
- knowledge/wiki/lessons/redaction-must-scrub-object-keys.md | 61 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 61 insertions(+)

## Lessons surfaced in commit body
- lesson for the P1 customer-name-in-KEY redaction leak
- WRONG tier for a whole-key exact match (use the full registry). Memory: reference_xray_app_redact_wire_2026_06_23.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e2165ab2a065`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._