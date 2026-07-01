# BLUEPRINT-VISION-OCR/U-XRAY-GDT-FCF-WIRE-BLUEPRINTOCR — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-FCF-WIRE-BLUEPRINTOCR (slot:xray): light up the dormant FCF-validation fields on BlueprintOCREngine.extractGDT (datum-deficiency now flagged on the 2nd production OCR path)

**Commit:** `68150b27a0aa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:44:04-05:00
**Tags:** blueprint-vision-ocr, u-xray-gdt-fcf-wire-blueprintocr, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-FCF-WIRE-BLUEPRINTOCR (slot:xray): light up the dormant FCF-validation fields on BlueprintOCREngine.extractGDT (datum-deficiency now flagged on the 2nd production OCR path)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-FCF-WIRE-BLUEPRINTOCR (slot:xray): light up the dormant FCF-validation fields on BlueprintOCREngine.extractGDT (datum-deficiency now flagged on the 2nd production OCR path)

Closes the scrutiny-flagged follow-up from U-XRAY-GDT-SYMBOL-NORMALIZE-TS. BlueprintOCREngine (a SEPARATE
dispatcher-wired production OCR engine -- live via qualityDispatcher + devDispatcher) declared
fcf_valid?/fcf_issues? on its ExtractedGDT (with a docstring citing gdtFcfValidate) but extractGDT NEVER
called validateExtractedGdt -- so those fields were always undefined and a datum-deficient
position/orientation/runout callout was silently NOT flagged on this path (a dormant wire).

Fix: extractGDT now builds the frame, runs validateExtractedGdt(frame), and attaches the verdict --
mirroring BlueprintVisionOCREngine.convertGDT. Pure + informational (no cost/process-bearing mutation);
an unrecognized symbol leaves the frame un-annotated. No symbol normalizer needed here: this engine parses
raw callout TEXT via GDT_SYMBOL_MAP / GDT_TEXT_ENTRIES, which already yield a canonical GDTSymbol or
`continue` (unlike the VLM path's verbatim symbol). Additive: the fcf fields were already declared optional,
so no contract change for the 13 importers.

tsc --noEmit clean. 31 vitest (+3: datum-less POSITION -> fcf_valid:false + datum issue; FLATNESS form-tol
-> fcf_valid:true not deficient; POSITION with datums A B C -> not deficient). Completes GD&T FCF validation
across BOTH production OCR engines (BlueprintVisionOCREngine + BlueprintOCREngine).
```

## Files touched (5)
- mcp-server/src/engines/BlueprintOCREngine.ts         | 11 ++++++++
- mcp-server/src/engines/BlueprintVisionOCREngine.ts   |  2 ++
- mcp-server/src/utils/chamferCalloutNormalize.test.ts | 46 +++++++++++++++++++++++++++++++
- mcp-server/src/utils/chamferCalloutNormalize.ts      | 88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 147 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 68150b27a0aa`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._