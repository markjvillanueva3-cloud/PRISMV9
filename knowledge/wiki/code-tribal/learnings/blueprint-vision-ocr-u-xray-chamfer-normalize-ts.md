# BLUEPRINT-VISION-OCR/U-XRAY-CHAMFER-NORMALIZE-TS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CHAMFER-NORMALIZE-TS (slot:xray): production .ts clone of the chamfer/csk normalizer -- completes the symbol-normalizer build-everywhere set

**Commit:** `68150b27a0aa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:44:04-05:00
**Tags:** blueprint-vision-ocr, u-xray-chamfer-normalize-ts, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CHAMFER-NORMALIZE-TS (slot:xray): production .ts clone of the chamfer/csk normalizer -- completes the symbol-normalizer build-everywhere set

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CHAMFER-NORMALIZE-TS (slot:xray): production .ts clone of the chamfer/csk normalizer -- completes the symbol-normalizer build-everywhere set

The chamfer normalizer shipped on the .mjs script path (U-XRAY-CHAMFER-NORMALIZE, 0440ed4f04) but -- unlike
thread / surface-finish / GD&T -- had NO production .ts clone, so the live MCP OCR path (convertDimensions)
surfaced thread enrichment but not chamfer. R15 build-it-everywhere: a galaxy-specific asset replicated
(clone-don't-fork) to every path that shares the need.

- mcp-server/src/utils/chamferCalloutNormalize.ts: normalizeChamferCallout + resolveChamfer (gate) -- a
  documented cross-boundary CLONE of scripts/lib/ollama-vision-extract-lib.mjs::normalizeChamferCallout +
  maybeChamfer. Keyword-gated (R12): the overloaded "<a> X <b>" notation ("2 X .500 DRILL") requires a
  CSK/CHAMFER keyword. Pure-ASCII. Mirrors threadCalloutNormalize.ts / gdtSymbolNormalize.ts.
- BlueprintOCREngine.ts: additive `chamfer?:` field on ExtractedDimension (next to thread?:).
- BlueprintVisionOCREngine.convertDimensions: `chamfer: resolveChamfer(d.type, d.raw_text)` (next to thread).

tsc --noEmit clean. 5 vitest PINNED IDENTICAL to the .mjs 95-test chamfer side (csk angle+dia; chamfer
X-pair both orders; no-angle -> null; size-X-size -> no fabricated angle R12; keyword-gate rejects "2 X
.500 DRILL"). Additive -- the chamfer field is optional, no contract change for the 13 importers.

Completes the symbol/vocabulary normalizer family (backlog P2.8) across BOTH the script (.mjs) and
production (.ts) paths: surface-finish, thread, chamfer, GD&T symbol -- all dual-home, all pinned-identical.
```

## Files touched (5)
- mcp-server/src/engines/BlueprintOCREngine.ts         | 11 ++++++++
- mcp-server/src/engines/BlueprintVisionOCREngine.ts   |  2 ++
- mcp-server/src/utils/chamferCalloutNormalize.test.ts | 46 +++++++++++++++++++++++++++++++
- mcp-server/src/utils/chamferCalloutNormalize.ts      | 88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 147 insertions(+)

## Lessons surfaced in commit body
- tils/chamferCalloutNormalize.ts: normalizeChamferCallout + resolveChamfer (gate) -- a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 68150b27a0aa`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._