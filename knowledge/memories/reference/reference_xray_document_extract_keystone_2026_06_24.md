---
name: reference_xray_document_extract_keystone_2026_06_24
description: "xray document-reading keystone (DocumentExtractionContract + documentExtractionRouter) for the non-blueprint doc dead-end class, 2026-06-24"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_document_extract_keystone_2026_06_24
---


**Document-reading keystone** (slot xray, 2026-06-24) — closes the "apply document reading to ALL prism
features" gap from [[blueprint-extraction-consumer-application-map-2026-06-24]] section 3. The sibling of
the blueprint contract+router for NON-blueprint documents (office/OCR/catalog/manual).

**Two units shipped on cad-fusion-live-ms0:**
1. **`U-XRAY-DOCUMENT-EXTRACT-CONTRACT`** (`d6af0e415a`) — `mcp-server/src/schemas/DocumentExtractionContract.ts`.
   Versioned `{schemaVersion, source?, doc_type, entries[](kind,value,confidence,needs_confirm), confirm_floor,
   summary(n_entries,n_needs_confirm,by_kind)}`; entries `.default([])` (slimResponse round-trip).
   `normalizeOfficeExtractToContract` maps the LIVE `OfficeDocumentPipelineEngine.ExtractionResult.extractedData`
   ({speeds,feeds,toolCodes,partNumbers,materials}: string[][]) → typed `DocEntry[]`, dedup within kind,
   blank-drop. **R12 honesty:** office regex extraction is heuristic, so each entry gets a sub-floor default
   confidence (`OFFICE_REGEX_DEFAULT_CONFIDENCE=0.6` < `DOC_PER_FIELD_CONFIRM_FLOOR=0.7`) → needs_confirm; a
   regex-matched tool code NEVER auto-feeds a consumer without operator confirmation. Wired
   `prism_resource_extraction:document_extract_contract`.
2. **`U-XRAY-DOCUMENT-EXTRACT-ROUTER`** (`65468bf375`) — `mcp-server/src/engines/blueprint-vision/documentExtractionRouter.ts`.
   `routeDocumentToConsumers(contract)` fans to 3 disk-verified consumers via a data-driven DOC_CONSUMERS
   table keyed on entry KIND: tool_crib_lookup (`prism_calc:tool_crib_inventory`, tool_code, advisory),
   speed_feed (`prism_product:sfc_calculate` — NOT prism_calc/Surface-Finish, material, advisory),
   tribal_capture (`prism_knowledge:tribal_capture`, procedure/note, COMMITMENT — confirm-gates below-floor
   entries so a regex match can't pollute the authoritative tribal corpus). Wired
   `prism_resource_extraction:document_extract_route`. App chain:
   `office_process → document_extract_contract → document_extract_route → confirm-gated fan-out`.

**Tests:** 9 contract + 4 contract-dispatcher + 12 router + 3 router-dispatcher = 28; tsc-clean. 1 reviewer
PASS (no P0/P1; confirmed sfc_calculate→prism_product, tribal=sole commitment gate, summary invariants,
n_needs_confirm recomputed-not-mirrored). P2 (values() defensive parity) fixed in-pass.

**Pattern (reusable):** the versioned-contract + data-driven-router + dispatcher-wire shape is now proven 3×
(BlueprintExtractionContract, the blueprint router with 13 consumers, and this). Adding a consumer = 1
ConsumerSpec + test reference-values. Adding a producer = 1 normalizer.

**Remaining (cross-galaxy, queued):** academy course bulk-ingest + LoRA training feed (verify
`xproc_lora_prepare_set`) + `upload.ts` auto-dispatch (quebec); more producer normalizers
(ImageOCRPipelineEngine, documentLearning DocRecord). Sibling of
[[reference_xray_extract_consumer_router_2026_06_24]] (the blueprint router).
