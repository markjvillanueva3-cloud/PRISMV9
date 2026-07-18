# BLUEPRINT-VISION-OCR/U-XRAY-LIVE-OCR-FCF-SURFACE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LIVE-OCR-FCF-SURFACE (slot:xray): surface the FCF verdict in the live cad_live_blueprint_ocr MCP output (was silently dropped)

**Commit:** `b649ebba4cda` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:56:05-05:00
**Tags:** blueprint-vision-ocr, u-xray-live-ocr-fcf-surface, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LIVE-OCR-FCF-SURFACE (slot:xray): surface the FCF verdict in the live cad_live_blueprint_ocr MCP output (was silently dropped)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LIVE-OCR-FCF-SURFACE (slot:xray): surface the FCF verdict in the live cad_live_blueprint_ocr MCP output (was silently dropped)

The live MCP consumer CADLiveBlueprintOcrAdapter.mapAnalysisToPrintOcr flattened
analysis.gdt_frames -> {id,kind,detail} and DROPPED the FCF verdict (fcf_valid/fcf_issues)
that U-XRAY-GDT-FCF-VALIDATE computes in convertGDT -- so cad_live_blueprint_ocr (the
operator-facing MCP action) never surfaced a structurally-invalid GD&T frame. The validation
was computed but never delivered to the consumer (orphan output).

Fix (the real R15 consumer that ACTS on fcf_valid): added fcfValid?/fcfIssues? to PrintFeature
(CADRoundTripValidationEngine.ts, additive optional) and carry the verdict through the GD&T
mapping -- an invalid frame (e.g. a position/runout/concentricity callout missing its datum) is
marked "-- INVALID FCF" in detail + carries fcfValid:false + fcfIssues. ALL advisory issues are
carried (not just on invalid frames -- e.g. PROFILE_WITHOUT_DATUM info on a valid frame, per
arm-A P2). Verdict survives the multi-page unionFeatures spread. Informational only -- no
numeric/cost field mutated; the dimension/scorer path is untouched; unknown-symbol/pre-validation
frames preserve the EXACT prior shape (back-compat test pins detail "0.005").

Blast radius: PrintFeature optional fields are additive (no importer/consumer breaks; the sole
runtime reader DefaultIntentBuilder uses kind/detail only; no numeric parse of feature.detail).

53/53 adapter tests (+3: invalid->fcfValid:false+issues+marker; valid->fcfValid:true; valid+
advisory->issues carried no marker; no-verdict->fields absent + back-compat detail); tsc 0 errors.
Per-file 2-arm scrutiny BOTH PASS (no P0/P1; arm-A advisory-issue P2 fixed inline + tested).
```

## Files touched (4)
- mcp-server/src/__tests__/CADLiveBlueprintOcrAdapter.test.ts | 50 ++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CADLiveBlueprintOcrAdapter.ts        | 22 +++++++++++++++++++---
- mcp-server/src/engines/CADRoundTripValidationEngine.ts      | 10 ++++++++++
- 3 files changed, 79 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b649ebba4cda`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._