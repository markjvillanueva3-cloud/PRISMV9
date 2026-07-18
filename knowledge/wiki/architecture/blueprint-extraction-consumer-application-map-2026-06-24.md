---
title: Blueprint/OCR/Document Extraction -> ALL PRISM Features (Consumer-Application Map)
slug: blueprint-extraction-consumer-application-map-2026-06-24
galaxy: blueprint-vision
slot: xray
created: 2026-06-24
status: active
related:
  - blueprint-vision-app-integration-plan-2026-06-23
  - blueprint-reading-improvement-backlog-2026-06-19
  - blueprint-vision-galaxy
---

# Blueprint / OCR / Document Extraction -> ALL PRISM Features

> **Operator ask (2026-06-24, /checkin-xray):** "plan how we can utilize and apply our blueprint reading,
> ocr scanning, document reading functions and features into ALL prism app features that can utilize it."

This is the COMPREHENSIVE consumer-application map: every prism feature that can consume a structured
blueprint/OCR/document extraction, what it consumes, whether it is wired today, and the concrete unit +
owning galaxy to wire the gaps. Grounded in a **3-parallel-agent survey** (2026-06-24, Explore agents over
business/quality, CAD/CAM/SFC, and document-reading/AI/frontend slices) on top of the
[[blueprint-vision-app-integration-plan-2026-06-23]]. Every action below was disk-verified before listing
(xray's #1 refuse: never enshrine an unverified action).

## 1. WIRED today -- the extraction-router fan-out (20 consumers)

`mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts` (`routeExtractionToConsumers`)
maps a validated `BlueprintExtractionContract` -> a confirm-gated fan-out plan. Reachable via
`prism_cad:blueprint_extract_route` + `POST /api/v1/cad/blueprint-extract-route`. Chain:
producer -> `blueprint_extract_contract` -> `blueprint_extract_route`.

| consumer | dispatcher:action | kind | eligible when | shipped |
|----------|-------------------|------|---------------|---------|
| quote | prism_business:blueprint_to_quote | commitment | dims OR material | U-XRAY-EXTRACT-CONSUMER-ROUTER (`b7fe4242ea`) |
| print_to_program | prism_cam:print_to_program_full | commitment | dims>0 | `b7fe4242ea` |
| inspection_plan | prism_quality:blueprint_inspection_plan | commitment | gd&t OR dims | `b7fe4242ea` |
| feature_recognize | prism_cad:feature_recognize | advisory | dims>0 | `b7fe4242ea` |
| cad_reconstruct | prism_cad:blueprint_to_all_cads | advisory | dims>0 | `b7fe4242ea` |
| material_resolve | prism_business:blueprint_resolve_material | advisory | material/title-block/notes | `b7fe4242ea` |
| redact | prism_cad:blueprint_redact | privacy | title-block.customer (PII) | `b7fe4242ea` |
| stock_optimize | prism_business:stock_size_optimize | advisory | dims>0 | U-XRAY-EXTRACT-ROUTER-MACHINING-PREP (`21183fe5fd`) |
| fixture_design | prism_calc:fixture_design_recommend | advisory | dims>0 | `21183fe5fd` |
| tool_select | prism_calc:tool_select_recommend | advisory | dims>0 | `21183fe5fd` |
| speed_feed | **prism_product**:sfc_calculate | advisory | material | `21183fe5fd` (NB: `prism_product`, not `prism_calc` -- the action is overloaded; `prism_calc:sfc_calculate` is the Surface-Finish engine) |
| fai_run | prism_quality:fai_run | commitment | gd&t OR dims | doc-corrected 2026-06-24 (already in router; section-1 had under-counted) |
| spc_calculate | prism_quality:spc_calculate | advisory | dims>0 | doc-corrected 2026-06-24 (already in router) |
| material_price_lookup | prism_business:material_price_lookup | advisory | material | doc-corrected 2026-06-24 (already in router) |
| job_create | prism_business:job_create | advisory | dims OR material | doc-corrected 2026-06-24 (already in router) |
| cmm_plan_path | prism_calc:cmm_plan_path | commitment | gd&t OR dims | doc-corrected 2026-06-24 (already in router) |
| smart_tool_select | prism_cam:smart_tool_select | advisory | dims>0 | U-XRAY-EXTRACT-ROUTER-GAP-CLOSE (2026-06-24) |
| stock_allowance | prism_calc:stock_allowance | advisory | dims>0 | U-XRAY-EXTRACT-ROUTER-GAP-CLOSE |
| lathe_workholding | prism_turning:lathe_workholding_select_jaw | advisory | dims>0 | U-XRAY-EXTRACT-ROUTER-GAP-CLOSE |
| setup_sheet | prism_cam:setup_sheet_generate | advisory | dims>0 | U-XRAY-EXTRACT-ROUTER-GAP-CLOSE |

**Commitment consumers** (quote=money / program=motion / inspection=acceptance) confirm-gate on any
below-floor `needs_confirm` field; advisory/privacy never gate. Adding a consumer = one `ConsumerSpec`
entry in the data-driven `CONSUMERS` table + one test.

## 2. GAP matrix -- CLOSED 2026-06-24 (all 9 candidates now wired)

> **STATUS 2026-06-24 (U-XRAY-EXTRACT-ROUTER-GAP-CLOSE):** every candidate below is now a live
> `ConsumerSpec` in the router (section 1). The 4 last-remaining (smart_tool_select, stock_allowance,
> lathe_workholding = `lathe_workholding_select_jaw`, setup_sheet = `setup_sheet_generate`) were wired
> this unit (router 16->20; 26 tests green incl. a new gap-close describe block; per-file 2-arm scrutiny
> PASS). The other 5 (fai_run/spc_calculate/cmm_plan_path/job_create/material_price_lookup) were ALREADY
> in the router -- this map's section-1 table had under-counted them (R8/R12 doc-rot: the live CONSUMERS
> table is the source of truth, not the doc's count). Each action below was re-disk-verified before
> wiring. The table is retained as the provenance record of the closed gap.

These were additional `ConsumerSpec` candidates (clone the table pattern). Each verified on disk.

| candidate consumer | dispatcher:action | extraction fields | value | owning galaxy |
|--------------------|-------------------|-------------------|-------|---------------|
| fai_run | prism_quality:fai_run | dims + gd&t + title_block | AS9102 first-article auto-population (aerospace) | quality |
| spc_calculate | prism_quality:spc_calculate | dims -> nominal/upper/lower per GD&T | Cpk/Ppk without manual tol entry | quality |
| cmm_plan_path | prism_calc:cmm_plan_path | dims + gd&t | CMM probe sequence from features | quality/delta |
| smart_tool_select | prism_cam:smart_tool_select | feature dia/depth + material | CAM-side tool pick (sibling of tool_select) | kilo |
| stock_allowance | prism_calc:stock_allowance | dims + profiles + gd&t | stock removal envelope | delta |
| lathe_workholding | prism_turning:* (verify) | OD/ID + length + material | lathe jaw/collet pick | whiskey/oscar |
| job_create | prism_business:job_create | dims + material + title_block | work-order pre-population | hotel |
| material_price_lookup | prism_business:material_price_lookup | material + dims (volume) | volume-indexed material cost | hotel |
| setup_sheet | prism_cam:setup_sheet_generate (verify) | title_block + features + dims | operator setup sheet auto-fill | kilo |

## 3. The BIGGER gap class -- DOCUMENT reading (non-blueprint) dead-ends

The blueprint path is wired (section 1). The **document-reading path systematically dead-ends**:
office/PDF/2D-drawing extraction of speeds/feeds/tool-codes/procedures/materials reaches the engines but
NEVER reaches a consumer. There is no DOCUMENT extraction CONTRACT (the parallel to
`BlueprintExtractionContract`) -- building one is the keystone for this class.

| dead-ending surface | extracted content | should reach | wiring unit | owner |
|---------------------|-------------------|--------------|-------------|-------|
| resourceExtractionDispatcher:office_process (OfficeDocumentPipelineEngine) | speeds/feeds/toolCodes/partNumbers/materials | tool-crib (ToolingSink), SFC | route extract -> `ToolingSink.proposeTool` (pattern in IntakeArtifactProcessorEngine.parseTools) | lima + hotel |
| resourceExtractionDispatcher:ocr_process (ImageOCRPipelineEngine) | measurements/toolCodes | tool-crib via CameraIntakeRouterEngine | confirm CameraIntakeRouter downstream wire | lima |
| `/api/v1/upload` ready_for_ocr:true (routes/upload.ts) | (just a flag) | auto-dispatch ocr_process/office_process | upload handler -> async extract dispatch | quebec |
| DocumentInboxEngine.ingest / DocumentLearningPage | raw_text of setup sheets/manuals | tribal-knowledge (`prism_knowledge:tribal_capture`), academy | on type=setup_sheet/manual + confidence -> tribal_capture | xray bridge + india |
| BlueprintLoRABridgeEngine (training) | blueprint-only today | + document/procedure extracts | `xproc_lora_prepare_set {source:'document-extraction'}` | india |
| academy course modules (static) | procedures from manuals | course bulk-ingest | doc_extract(manual) -> academy ingest (schema change) | quebec + india |

**Keystone for this class -- SHIPPED 2026-06-24 (contract + router):**
- `mcp-server/src/schemas/DocumentExtractionContract.ts` (`U-XRAY-DOCUMENT-EXTRACT-CONTRACT`, `d6af0e415a`) --
  versioned `{doc_type, entries[](kind,value,confidence,needs_confirm), confirm_floor, summary}`;
  `normalizeOfficeExtractToContract` maps the live `OfficeDocumentPipelineEngine` shape; regex entries get a
  sub-floor confidence (0.6) -> needs_confirm (R12 honesty). Wired `prism_resource_extraction:document_extract_contract`.
- `mcp-server/src/engines/blueprint-vision/documentExtractionRouter.ts` (`U-XRAY-DOCUMENT-EXTRACT-ROUTER`,
  `65468bf375`) -- `routeDocumentToConsumers` fans the contract to 5 verified consumers:
  tool_crib_lookup (`prism_calc:tool_crib_inventory`), speed_feed (`prism_product:sfc_calculate`),
  tribal_capture (`prism_knowledge:tribal_capture`, COMMITMENT -- gates below-floor entries so a regex
  match can't pollute the authoritative tribal corpus), and -- added 2026-06-24 (U-XRAY-DOC-ROUTER-XGALAXY) --
  tool_catalog_lookup (`prism_calc:tool_catalog_lookup`, tool_code -> catalog spec) + material_price_lookup
  (`prism_business:material_price_lookup`, material -> price). Wired `prism_resource_extraction:document_extract_route`.
  App chain: `office_process -> document_extract_contract -> document_extract_route`. 28 tests; reviewer PASS.
- **REMAINING (cross-galaxy, queued) -- DISK-VERIFIED 2026-06-24 (U-XRAY-DOC-ROUTER-XGALAXY):** the LoRA
  feed + academy ingest are NOT clean 1-ConsumerSpec wires (verified, not wired): `xproc_lora_prepare_set`
  does NOT exist -- the real `blueprint_lora_prepare_set` (prism_ai/prism_cad) requires `precomputedPairs[]`,
  not raw doc entries (a doc-entries->LoRA-pairs transform is needed first; india's domain); no
  `academy course-ingest` action exists (only `knowledge_ingestion_stats`/`_pending` queries -- a schema
  change, as the row noted). The `upload.ts` auto-dispatch (quebec) IS the real next unlock but needs an
  ASYNC job + polling (a multi-page OCR is 10-60s, must not block the request) -- a larger unit, not a
  router ConsumerSpec. Producer normalizers: office + OCR + documentLearning (`normalizeDocLearningToContract`,
  IngestionResult items -> procedure/note carrying per-item confidence -> tribal_capture, wired into
  `document_extract_contract {producer:doclearn}`; U-XRAY-DOCLEARN-NORMALIZER 2026-06-24) are now all wired;
  more as new producer shapes appear.

## 4. Sequencing + stack utilization (operator "goal clear")
- **Build order:** section-2 blueprint-consumer gaps are cheap (1 ConsumerSpec each, GPU-free) -> build
  highest-value first (fai_run, spc_calculate). Section-3 document path is the bigger lift (needs the
  DocumentExtractionContract keystone first) -> sequence after.
- **Ollama:** all VLM OCR + document-text summarization run on the local GPU ($0). The router + contract
  are pure (no model).
- **Parallel agents:** THIS map was produced by a 3-parallel-agent survey (the operator's explicit ask);
  future phase build-outs fan out one agent per ConsumerSpec + test.
- **Harnesses/crons:** the nightly OCR training cron feeds the calibration the app's confidence badges read.

## 5. OCR-reading improvement status (honest, R12)
Per [[blueprint-reading-improvement-backlog-2026-06-19]]: the recall arc (region-routing, GD&T recall,
CAD-GT triangulation) is SHIPPED + multi-seed validated. Recall is now **GT-ceiling / fixture-bound** on
the perfect-parts corpus (1 scoreable part, itself pinned at 3/7 across 6 levers). The genuine next
OCR-recall step is **fixture-corpus acquisition** (parts whose misses are legibly on the drawing) +
the GPU-gated mill-recall validation run -- NOT a knob. So the highest-leverage blueprint-reading work
right now is APPLICATION (this map), not extraction-tuning.

---
_Authored 2026-06-24 (slot:xray) from a 3-parallel-agent consumer survey. Companion to
[[blueprint-vision-app-integration-plan-2026-06-23]] (phased plan) -- this is the COMPLETE consumer matrix._
