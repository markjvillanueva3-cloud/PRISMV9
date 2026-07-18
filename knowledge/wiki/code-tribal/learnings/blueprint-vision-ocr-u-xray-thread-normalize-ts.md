# BLUEPRINT-VISION-OCR/U-XRAY-THREAD-NORMALIZE-TS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-THREAD-NORMALIZE-TS (slot:xray): TS clone of the thread normalizer wired into the production MCP OCR path (R15 build-it-everywhere)

**Commit:** `20661dda93bb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:19:51-05:00
**Tags:** blueprint-vision-ocr, u-xray-thread-normalize-ts, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-THREAD-NORMALIZE-TS (slot:xray): TS clone of the thread normalizer wired into the production MCP OCR path (R15 build-it-everywhere)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-THREAD-NORMALIZE-TS (slot:xray): TS clone of the thread normalizer wired into the production MCP OCR path (R15 build-it-everywhere)

The thread normalizer shipped 4c0828c118 was .mjs-only -- it served the script OCR path but NOT the
production MCP/TS path (cad_live_blueprint_ocr via BlueprintVisionOCREngine), which is what the app uses.
The surface-finish normalizer has both a .mjs (canonical) and a .ts clone (02b56c847f); the thread
normalizer needed its TS sibling too.

Adds src/utils/threadCalloutNormalize.ts (a documented cross-boundary CLONE of normalizeThreadCallout
with ALL the proven fixes: material/grade guard, #-less-screw-vs-inch tpi disambiguation, inch-major
cap, self-safety; pure-ASCII source via fromCharCode like surfaceFinishNormalize.ts) + resolveThread
gate. Wired into BlueprintVisionOCREngine.convertDimensions as an additive `thread:` field (next to
surface_finish_ra) + an optional `thread?` on the ExtractedDimension interface -- purely additive, the
13 importers are unaffected. Now a print's "1/4-20 UNC" thread callout becomes a canonical
{major_dia_in, tpi, pitch_mm, series, class} spec in the MCP OCR product.

8/8 vitest (reference values pinned IDENTICAL to the .mjs 88-test side -- ASME B1.1 screw majors, ISO
261 coarse pitch -- so the clones cannot silently diverge); tsc --noEmit clean (no type errors in the 4
changed files, 12GB heap). Port fidelity self-verified against the .mjs canonical (same tables/regexes/
branches). Gives the thread normalizer its production consumer (closes the R15 wire gap).
```

## Files touched (5)
- mcp-server/src/engines/BlueprintOCREngine.ts                  |  12 ++++++
- mcp-server/src/engines/BlueprintVisionOCREngine.ts            |   4 ++
- mcp-server/src/utils/__tests__/threadCalloutNormalize.test.ts |  79 ++++++++++++++++++++++++++++++++++
- mcp-server/src/utils/threadCalloutNormalize.ts                | 158 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 253 insertions(+)

## Lessons surfaced in commit body
- tils/threadCalloutNormalize.ts (a documented cross-boundary CLONE of normalizeThreadCallout

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 20661dda93bb`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._