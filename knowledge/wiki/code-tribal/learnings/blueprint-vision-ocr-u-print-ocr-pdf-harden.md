# BLUEPRINT-VISION-OCR/U-PRINT-OCR-PDF-HARDEN — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-PRINT-OCR-PDF-HARDEN (slot:xray): schema-clamp the cad_live_blueprint_ocr params (closes the unanimous 3-of-3 P2)

**Commit:** `f2aa3e95f208` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T23:30:05-05:00
**Tags:** blueprint-vision-ocr, u-print-ocr-pdf-harden, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-PRINT-OCR-PDF-HARDEN (slot:xray): schema-clamp the cad_live_blueprint_ocr params (closes the unanimous 3-of-3 P2)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-PRINT-OCR-PDF-HARDEN (slot:xray): schema-clamp the cad_live_blueprint_ocr params (closes the unanimous 3-of-3 P2)

All three scrutiny reviewers (A/B/C) flagged the same P2 on U-PRINT-OCR-PDF: the
cad_live_blueprint_ocr action has no Zod schema and forwarded raw MCP params
straight through as adapter opts. Risks: (1) a client setting maxPages:9999 /
dpi:100000 = a raster DoS; (2) injected analyzer/rasterizer keys swapping the OCR
engine; (3) page:0 silently re-introducing the very page-0-only bug the parent
commit fixed.

FIX: new pure, exported sanitizeLiveOcrAdapterOptions(raw) -- validates
blueprintType/expectedUnits against their enums, coerces extractGeometry/preprocess
to booleans only, clamps maxPages to [1,12] + dpi to [72,600], accepts an explicit
non-negative page but NEVER defaults one (the safe all-pages default always holds),
and NEVER forwards analyzer/rasterizer (test-injection only). Accepts camelCase +
snake_case. Wired into the cad_live_blueprint_ocr dispatcher case (replaces the raw
`p` pass-through). MIN_DPI/MAX_DPI named constants added.

TESTED: +7 sanitizer cases (clamp both bounds, enum-drop, boolean-coerce, injection
strip via toEqual({maxPages:3}), snake_case, non-object -> {}); 50/50 adapter tests;
tsc clean on adapter + cadDispatcher; esbuild OK. Additive -- the engine ocrPrint
contract is unchanged (tests/round-trip still inject analyzer/rasterizer directly).
```

## Files touched (4)
- mcp-server/src/__tests__/CADLiveBlueprintOcrAdapter.test.ts | 51 +++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CADLiveBlueprintOcrAdapter.ts        | 44 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts           |  8 ++++++--
- 3 files changed, 101 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till inject analyzer/rasterizer directly).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f2aa3e95f208`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._