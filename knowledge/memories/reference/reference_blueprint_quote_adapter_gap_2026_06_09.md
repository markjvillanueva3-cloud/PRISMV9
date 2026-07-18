---
name: reference_blueprint_quote_adapter_gap_2026_06_09
description: "REAL USE-LAYER SILENT BUG (found 2026-06-09 slot:charlie, NOT yet fixed) — shopDispatcher emp_blueprint_to_quote feeds BlueprintOCREngine.BlueprintAnalysis into a bridge() expecting a DIFFERENT BlueprintToQuoteBridgeEngine.BlueprintAnalysis. Intake->quote path silently drops GD&T + mis-reads dims. Next unit = U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.481Z
aliases: reference_blueprint_quote_adapter_gap_2026_06_09
---


# Blueprint->quote intake path adapter gap (silent USE-layer bug, found + FIXED 2026-06-09 slot:charlie)

**Status: FIXED in commit `d447cee202`** (U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER) -- added `BlueprintToQuoteBridgeEngine.fromOCRAnalysis(ocr)` + `bridgeFromOCR(ocr, overrides)`, re-exported `QuoteEstimateInput`, rewired BOTH consumers (shopDispatcher emp_blueprint_to_quote + businessDispatcher blueprint_to_quote -- the dedup workflow found businessDispatcher had the SAME runtime bug, hidden behind z.record(any)). 6 real-OCR fail-on-revert tests, 73 green, tsc -2/0-introduced, 3-of-3 PASS. Original root-cause analysis preserved below.

## The bug
`shopDispatcher.ts:1476-1483` (`emp_blueprint_to_quote`, hotel W3 employee-mobile-portal) does:
```
type Analysis = import("BlueprintOCREngine.js").BlueprintAnalysis;   // OCR output shape
const p = params as { analysis: Analysis; overrides?: ... };
const bridge = blueprintToQuoteBridgeEngine.bridge(p.analysis, p.overrides);  // expects a DIFFERENT shape
```
But `bridge(analysis: BlueprintAnalysis, ...)` wants `BlueprintToQuoteBridgeEngine.BlueprintAnalysis` -- a STRUCTURALLY DIFFERENT type. tsc flags TS2345 (mismatch) + TS2694 (line 1479 imports `QuoteEstimateInput` from the bridge, which only re-imports it from QuoteEstimatorEngine and never re-exports).

## The two incompatible shapes
| field | BlueprintOCREngine (producer, L102) | BlueprintToQuoteBridgeEngine (consumer, L18) |
|---|---|---|
| dimensions | `ExtractedDimension[]` | `Array<{type,value,unit,tolerance?,text}>` |
| GD&T | `gdt_frames: ExtractedGDT[]` | `gdt?: Array<{symbol,tolerance_value,datum_refs?,feature_type?}>` |
| notes | `ExtractedNote[]` | `Array<{category,text}>` |
| extra | `summary{...}` | `bounding_box{length,width,height,unit}` |

The KEY name differs (`gdt_frames` vs `gdt`), and the element shapes differ. So at runtime `bridge()` reads `analysis.gdt` -> undefined (OCR put it in `gdt_frames`) -> **ALL GD&T silently dropped**, `analysis.dimensions[i].value`/`.unit` likely undefined -> mis-read dims -> a garbage/under-spec'd quote from a real OCR'd print. R12 silent-bug class.

## The fix (next unit)
Add a proper adapter so the OCR output reaches the bridge correctly. Two options:
1. `BlueprintToQuoteBridgeEngine.fromOCRAnalysis(ocr: BlueprintOCREngine.BlueprintAnalysis): BridgeBlueprintAnalysis` -- a typed mapper (gdt_frames->gdt, ExtractedDimension->{type,value,unit,tolerance,text}, ExtractedNote->{category,text}, derive bounding_box if available), then the dispatcher calls `bridge(fromOCRAnalysis(p.analysis))`.
2. Make `bridge()` accept the OCR shape directly (wider input union) -- less clean, couples the bridge to OCR internals.
Prefer (1). Requires reading ExtractedDimension/ExtractedGDT/ExtractedNote/TitleBlockData shapes (BlueprintOCREngine.ts) first (R8). Add real round-trip tests (OCR sample -> adapter -> bridge -> QuoteEstimateInput with GD&T + dims preserved). Cross-galaxy: shopDispatcher is shop/hotel-authored -- post to chat-bus / patch-sibling per multi-chat discipline before editing the dispatcher case.

## Also fix in the same unit
`shopDispatcher.ts:1479` should import `QuoteEstimateInput` from `QuoteEstimatorEngine.js` (its real export site), not from the bridge.
