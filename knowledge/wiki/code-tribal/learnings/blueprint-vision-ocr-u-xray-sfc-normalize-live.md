# BLUEPRINT-VISION-OCR/U-XRAY-SFC-NORMALIZE-LIVE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-SFC-NORMALIZE-LIVE (slot:xray): port surface-finish callout recovery to the LIVE MCP OCR path (R15 completion)

**Commit:** `02b56c847f08` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T21:16:05-05:00
**Tags:** blueprint-vision-ocr, u-xray-sfc-normalize-live, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-SFC-NORMALIZE-LIVE (slot:xray): port surface-finish callout recovery to the LIVE MCP OCR path (R15 completion)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-SFC-NORMALIZE-LIVE (slot:xray): port surface-finish callout recovery to the LIVE MCP OCR path (R15 completion)

The .mjs grinder side recovers surface-finish callouts the VLM emits as TEXT
("63 RMS", "125 uin", "N6", "Ra 0.8"); the LIVE MCP path (cad_live_blueprint_ocr ->
CADLiveBlueprintOcrAdapter -> BlueprintVisionOCREngine.analyzeBlueprint) had a SEPARATE
parser that still DROPPED them: convertDimensions did `surface_finish_ra:
d.surface_finish_ra ?? undefined`, so a text callout (the VLM emits one at runtime despite
the `number | null` type) was lost.

FIX: new pure `src/utils/surfaceFinishNormalize.ts` -- a documented cross-boundary CLONE of
the canonical scripts/.mjs normalizer (the MCP/TS bundle cannot import the scripts/.mjs:
separate runtime, untyped, node-only siblings). Exports normalizeSurfaceFinish(raw) +
resolveSurfaceFinishRa(x) + ISO_N_GRADE_RA_UM. Wired into convertDimensions via
resolveSurfaceFinishRa(d.surface_finish_ra) -- additive (returns number|undefined, the
same ExtractedDimension.surface_finish_ra contract; numeric path preserved, NaN now coerced
to undefined instead of leaking, runtime string callouts recovered). Micron signs built via
String.fromCharCode (pure-ASCII source). Exact/chart-canonical conversions (63 uin = 1.6002
um; ASME B46.1 RMS; ISO 1302 N1..N12); bare ambiguous numbers stay resolved:false (R12);
negatives rejected; explicit um/uin tokens win over RMS.

TESTED: 17 vitest reference-value cases (happy + RMS/uin/um/N-grade + microinch-double-quote
parity + 4 failure modes incl R12 negative-reject + 2 adversarial); tsc clean on both files.
Per-file 2-arm scrutiny: arm B PASS; arm A caught a P1 port-fidelity gap (dropped the .mjs
`(?:micro|u)"` inch-double-quote alternative -> 25u" silently read as 25 um) -- FIXED +
regression-tested in this commit. Sole downstream reader (routes/edm.ts target_ra_um) takes
min of valid Ra -> recovering a formerly-dropped callout only supplies a correct target.
Scope: only the dimension-level surface_finish_ra (the engine has no surface_finishes[]
consumer channel). Sibling of the .mjs U-XRAY-SURFACE-FINISH-NORMALIZE (keep clones in sync).
```

## Files touched (4)
- mcp-server/src/engines/BlueprintVisionOCREngine.ts            |   5 ++++-
- mcp-server/src/utils/__tests__/surfaceFinishNormalize.test.ts | 126 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/utils/surfaceFinishNormalize.ts                | 115 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 245 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till DROPPED them: convertDimensions did `surface_finish_ra:
- tils/surfaceFinishNormalize.ts` -- a documented cross-boundary CLONE of

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 02b56c847f08`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._