---
name: reference_xray_doc_router_xgalaxy_2026_06_24
description: "documentExtractionRouter +2 cross-galaxy consumers (tool_catalog_lookup/prism_calc, material_price_lookup/prism_business) 3->5; LoRA feed + academy ingest disk-verified NOT clean wires (xproc_lora_prepare_set doesn't exist; blueprint_lora needs precomputedPairs; no academy course-ingest action)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_doc_router_xgalaxy_2026_06_24
---


**documentExtractionRouter cross-galaxy consumer expansion (2026-06-24, slot xray, U-XRAY-DOC-ROUTER-XGALAXY).**

Operator "do the cross galaxy work" after [[reference_xray_extract_router_gap_close_2026_06_24]]. Wired the 2 verified-clean-fit document consumers into `mcp-server/src/engines/blueprint-vision/documentExtractionRouter.ts` DOC_CONSUMERS (3 -> 5):
- `tool_catalog_lookup` -> prism_calc:tool_catalog_lookup (calcDispatcher.ts enum 684 / case 4712 -> toolCatalogEngine.lookup) -- tool_code -> catalog SPEC. Sibling of tool_crib_lookup (= on-hand inventory); distinct question, BOTH eligible on tool_code = intended fan-out, not a dup.
- `material_price_lookup` -> prism_business:material_price_lookup (businessDispatcher.ts enum 767 / case 3204 -> marketMaterialPricingEngine.lookup) -- material -> price (hotel-owned action).
Both advisory, kind-gated (tool_code / material), never confirm-gate.

**R12 / xray-#1-refuse finding -- the cross-galaxy items the prior handoff NAMED were disk-verified NOT clean wires:**
- LoRA training feed: the map's `xproc_lora_prepare_set` DOES NOT EXIST. The real action `blueprint_lora_prepare_set` (prism_ai aiReasoningDispatcher:91/4215 + prism_cad cadDispatcher:276/3462) requires `confidenceTier + precomputedPairs[]`, NOT raw document entries -- wiring it as a doc consumer would be a semantic-mismatch fake. Needs a doc-entries -> LoRA-pairs transform first (india's domain).
- academy course bulk-ingest: no clean `course_ingest`/`academy_ingest` action exists (only `knowledge_ingestion_stats`/`_pending` query actions). The map flagged it "schema change" -- correct; not a 1-ConsumerSpec wire.
- `upload.ts` auto-dispatch (quebec): the real Phase-1 unlock, but needs an ASYNC job + polling (multi-page OCR 10-60s must not block the request, per the app-integration plan) -- a larger unit, NOT a router ConsumerSpec. Named for the next session.

**Validation:** 19 tests green (11 doc-router unit incl. new cross-galaxy describe block + 8 prism_resource_extraction round-trip through document_extract_route); tsc-clean; per-file 2-arm scrutiny (code-analyzer + reviewer) BOTH PASS -- each disk-verified both actions reach a real engine method (not phantom/stub) + hand-derived every changed count.

**Open seam (P2, PRE-EXISTING, not this diff):** the router is a pure PLANNER -- payloads are plural arrays (`{tool_codes:[...]}`, `{materials:[...]}`) but the target engines take singular params; the future EXECUTOR layer must fan each plural payload to per-item dispatcher calls (same seam already present on the pre-existing tool_crib_lookup/speed_feed consumers). Documented so the executor build accounts for it.
