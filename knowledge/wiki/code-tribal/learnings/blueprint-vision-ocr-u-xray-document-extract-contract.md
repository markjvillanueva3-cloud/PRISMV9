# BLUEPRINT-VISION-OCR/U-XRAY-DOCUMENT-EXTRACT-CONTRACT — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DOCUMENT-EXTRACT-CONTRACT (slot:xray): versioned contract for NON-blueprint document extraction (the doc-reading keystone)

**Commit:** `d6af0e415a22` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T08:30:38-05:00
**Tags:** blueprint-vision-ocr, u-xray-document-extract-contract, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DOCUMENT-EXTRACT-CONTRACT (slot:xray): versioned contract for NON-blueprint document extraction (the doc-reading keystone)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-DOCUMENT-EXTRACT-CONTRACT (slot:xray): versioned contract for NON-blueprint document extraction (the doc-reading keystone)

Closes the keystone for the document-reading dead-end class (consumer-application-map section 3): office/OCR extraction of speeds/feeds/tool-codes/materials reaches the engines but had no stable shape a consumer could bind to. New DocumentExtractionContract.ts is the sibling of BlueprintExtractionContract for unstructured docs:
- versioned {schemaVersion, source?, doc_type, entries[](kind,value,confidence,needs_confirm), confirm_floor, summary(n_entries, n_needs_confirm, by_kind)}; entries .default([]) for slimResponse round-trip.
- normalizeOfficeExtractToContract maps the LIVE OfficeDocumentPipelineEngine.ExtractionResult.extractedData ({speeds,feeds,toolCodes,partNumbers,materials}: string[][]) -> typed DocEntries, dedup within kind, blank-drop. R12 honesty: office regex extraction is heuristic -> each entry gets a documented SUB-FLOOR default confidence (0.6 < 0.70) -> needs_confirm, so a regex-matched tool code NEVER auto-feeds a consumer without operator confirmation.

WIRE: prism_resource_extraction:document_extract_contract (mirrors blueprint_extract_contract; obtain via office_process first, then normalize). Verified downstream consumer actions for the NEXT unit (documentExtractionRouter): prism_knowledge:tribal_capture, prism_calc:tool_crib_*, prism_product:sfc_calculate.
TEST: 9 contract unit + 4 dispatcher round-trip = 13 new, all green; tsc-clean.
NOTE (R12): 4 PRE-EXISTING failures in resourceExtractionDispatcher.test.ts (ocr_stats/drawing_extract/drawing_summary/log_harvest -- engine-method drift e.g. getSummary-not-a-function, present on HEAD) are out-of-domain + NOT introduced by this enum+case addition; left for the Ocr/Drawing/Log owners.
```

## Files touched (5)
- mcp-server/src/__tests__/DocumentExtractionContract.test.ts                 | 110 +++++++++++++++++++
- .../src/__tests__/resourceExtractionDispatcher.documentContract.test.ts     |  61 +++++++++++
- mcp-server/src/schemas/DocumentExtractionContract.ts                        | 203 ++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts            |  23 ++++
- 4 files changed, 397 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d6af0e415a22`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._