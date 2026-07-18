---
title: Blueprint-Vision -> PRISM App Feature Integration Plan
slug: blueprint-vision-app-integration-plan-2026-06-23
galaxy: blueprint-vision
slot: xray
created: 2026-06-23
status: active
related:
  - blueprint-reading-improvement-backlog-2026-06-19
  - blueprint-vision-galaxy
  - blueprint-vision-knowledge-index
---

# Blueprint-Vision -> PRISM App Feature Integration Plan

> **Operator ask (2026-06-23, /checkin-xray):** "plan how we can utilize and apply our blueprint
> reading, ocr scanning, document reading functions and features into the prism app features ...
> utilize ollama offloading, hermes agents, parallel agents, engineered loops, harnesses and crons."

This is the **bridge plan**: the blueprint-vision backend (OCR + extraction + GD&T + the closed-loop
training just hardened) is mature, but it is almost entirely **unexposed to the user-facing app**. This
plan maps each backend capability to a concrete app feature + the exact wiring (API route + frontend
component + dispatcher action), in dependency order, and names the owning slot for cross-galaxy work.

Grounded in a parallel-agent consumer survey of the repo (2026-06-23) + the verified galaxy doctrine
(`mcp-server/src/engines/blueprint-vision/CLAUDE.md`). Every file:line below is normalized to the
main tree (the survey ran in a worktree).

---

## 1. Current state -- what is BUILT (backend) vs EXPOSED (app)

### Backend capabilities (BUILT, dispatcher-reachable)
| Capability | Surface | Status |
|------------|---------|--------|
| Multi-page PDF blueprint extraction (dims/GD&T/notes) | `resourceExtractionDispatcher` `drawing_extract` -> `Drawing2DExtractionEngine`; `PDFBlueprintDimensionExtractorEngine` | BUILT |
| VLM-ensemble OCR (>=2-model corroboration, confidence-gated) | `scripts/lib/vision-ensemble-fuse.mjs`; `ImageOCRPipelineEngine` (`ocr_process`/`ocr_stats`) | BUILT |
| GD&T callout parse + FCF validation | `cadDispatcher` `cad_gdt_callout_parse`/`cad_gdt_parse_enhanced`; `GDTCalloutParserEngine` + `FCFSyntaxValidatorEngine` | BUILT |
| Blueprint -> quote | `businessDispatcher` `blueprint_to_quote`/`blueprint_resolve_material`; `BlueprintToQuoteBridgeEngine` | BUILT |
| Print -> program (CAM) | `camDispatcher` `print_to_program_full`; `BlueprintProgramJoinEngine` | BUILT |
| CAD-file native read (DXF/STEP/F3D/FCStd/STL) | `cadDispatcher` `cad_dxf_geom_parse`/`cad_step_parse_file`/`cad_f3d_parse`/`cad_fcstd_parse`/`cad_stl_analyze` | BUILT |
| Office/document extraction (.docx/.xlsx/.pptx) | `resourceExtractionDispatcher` `office_process`/`office_search`; `OfficeDocumentPipelineEngine` | BUILT |
| Closed-loop OCR training + calibration | `scripts/blueprint-ocr-training-loop.mjs` + `validate-perfect-parts.mjs` (+ U-XRAY-CALIB-ACCUMULATE / U-XRAY-PROGRAM-GT-CALIB, 2026-06-23) | BUILT, harness healthy |
| LoRA-export anonymization (training data) | `scripts/xray-trainset-to-lora.mjs` + `scripts/lib/trainset-to-lora-pairs.mjs` (customer blocklist) | BUILT (training-side only) |

### App surfaces that exist (Vite/React app, `mcp-server/web/src/pages/*.tsx` + React Router `App.tsx`)
| Surface | Path | What it does today | Gap |
|---------|------|--------------------|-----|
| Blueprint quote page | `mcp-server/web/src/pages/BlueprintQuotePage.tsx` | **Manual form** (material/qty/features/tolerances) | No file upload; does NOT consume OCR extraction |
| Document inbox | `mcp-server/web/src/pages/DocumentInboxPage.tsx` | Upload `.pdf/.jpg/.png/.dxf/.step/.nc/...`; shows `document_type`/`status`/`extracted_data` | Marks "uploaded" but never invokes OCR; no link to quote |
| Upload route | `mcp-server/src/routes/upload.ts` | Detects PDF -> `document_type:"blueprint"`, `ready_for_ocr:true` | Sets the flag; never calls extraction or returns dims |
| Quote route | `mcp-server/src/routes/quote.ts` | `POST /quote/blueprint` -> `blueprint_to_quote` | Expects already-extracted input; no upload->extract->quote chain |
| Calibration page | `mcp-server/web/src/pages/CalibrationPage.tsx` | (exists) | Could surface the new OCR calibration corpus state |

### The one-sentence diagnosis
**The pipeline is wired end-to-end in the BACKEND but the app stops at "file uploaded."** `upload.ts`
sets `ready_for_ocr:true` and nothing consumes it; `BlueprintQuotePage` is a manual form next to a
fully-built `blueprint_to_quote`. The highest-leverage app work is the **upload -> extract -> display ->
quote** chain, which is 100% backend-ready and ~0% front-ended.

---

## 2. Integration plan -- phased units (dependency order, R13)

### Phase 1 -- Drawing upload -> auto-extract -> structured display (THE core loop)
The keystone: turn the dead `ready_for_ocr:true` flag into a live extraction the operator sees.
- **U-APP-EXTRACT-ROUTE** (owner: papa/quebec backend): `POST /api/v1/drawing/extract` (or extend
  `upload.ts`) -> on a `ready_for_ocr` blueprint, call `resourceExtractionDispatcher:drawing_extract`
  (multi-page, VLM-ensemble) and return `{ dimensions[], gdt[], notes[], title_block, per_field_confidence }`.
  Reuse the SHIPPED extraction; do NOT re-implement. Emit per-field `confidence` (the 0.70 operator-confirm floor).
- **U-APP-EXTRACT-VIEW** (owner: quebec): a `<DrawingExtractionPanel>` component on `DocumentInboxPage`
  / `BlueprintQuotePage` that renders the extracted dims + GD&T with a confidence badge per field, and a
  per-field operator-confirm control for any field below the 0.70 floor (the human-in-the-loop gate the
  closed loop already assumes).
- **Stack:** the extraction route runs the VLM ensemble on the **local Ollama** GPU (no Claude tokens).
  Long extractions should be a **job** (`resourceExtractionDispatcher` async) polled by the UI, not a
  blocking request -- a multi-page scan is 10-60s.

### Phase 2 -- Blueprint -> quote autopopulation (close the loop the operator described)
- **U-APP-BLUEPRINT-QUOTE-WIRE** (owner: charlie + quebec): wire the Phase-1 extraction output into
  `BlueprintQuotePage` so an uploaded drawing PRE-POPULATES the quote form (material from
  `blueprint_resolve_material`, envelope/features/tolerances from the extraction) via the existing
  `POST /quote/blueprint` -> `blueprint_to_quote`. The operator uploads a PDF and gets a draft quote --
  the "print to quote" promise, end to end. Charlie owns the quote math; xray owns the extraction contract.

> **STATUS 2026-06-23 -- the redact-LIB shipped (`U-APP-REDACT-LIB`).** The xray-owned contract is built:
> shared TS `mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts` (`redactText` / `redactExtraction`
> / `redactionRegions`), extracted build-once from the CRITICAL `BlueprintLoRABridgeEngine` anonymizer (the
> LoRA engine now re-exports from it, behavior byte-identical) + expanded to the canonical 118-customer
> `JM_DIE_CUSTOMERS` registry via a DISTINCTIVE tier (masks distinctive customers like SEMBLEX/TOPURA in
> free text, preserves common-word names like ACME/FORM/AIR; full-118 is opt-in `aggressive`). Structured
> customer-identity FIELDS (customer/company/vendor/buyer/work_order/...) are masked wholesale; the
> title-block image region is returned by `redactionRegions`. 25 tests (incl. adversarial leak + over-redaction
> guard), 2-arm scrutiny (a P1 free-text leak + P2 cleartext-audit were caught and fixed). **[SCOPED] follow-up
> `U-APP-REDACT-WIRE` (quebec + a dispatcher action):** wire `redactExtraction`/`redactionRegions` into a
> `blueprint_redact` dispatcher action + the drawing-view "export anonymized" toggle. The lib is tested but
> NOT yet reachable from the app -- that wire is the consuming unit (render layer is quebec's per the ownership
> table). Memory: [[reference_xray_calibration_accumulation_and_app_plan_2026_06_23]].

### Phase 3 -- Auto-redaction surface (EXPLICIT operator ask; the real gap)
Redaction EXISTS on the training-export side (`xray-trainset-to-lora.mjs` customer blocklist: ITW,
OPTIMAS, SFS, HOLO-KROME, ALCOA, Continental Midland) but NOT on the **app display/export** side.
- **U-APP-REDACT-LIB** (owner: xray): a pure `scripts/lib/blueprint-redact-lib.mjs` -- given an
  extraction's title-block + notes + the rendered page, return the regions/strings to mask (customer
  name blocklist + part-number patterns + logo bbox from the title-block region the region-classifier
  already locates). Clone-don't-fork the existing LoRA blocklist into a SHARED constant both consumers use.
- **U-APP-REDACT-RENDER** (owner: quebec): a redacted-preview render (mask boxes over the title-block /
  customer regions) + an "export anonymized" toggle on the drawing view, so a drawing can be shown/shared
  without customer-identifying info. Gate any external share behind it.
- **Stack:** the region-classifier (`scripts/lib/region-classifier-lib.mjs`, P1.5) already segments
  `title-block` regions -- redaction REUSES that segmentation to find what to mask (no new vision work).

> **STATUS 2026-06-25 -- Phase-3 auto-redaction is BACKEND-HARDENED (`U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII`
> `618237fa34` + `U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD` `9ff067db37` + the MS/HR/CD tighten).** The
> `blueprintExtractionRouter` `redact` consumer had a privacy FALSE-NEGATIVE: eligibility was
> `Boolean(title_block.customer)` ONLY, so PII in a note / the `source` print path / a non-customer
> identity field (company/vendor/part_number/work_order) reported "nothing to redact" while that
> un-redacted title_block/source flowed into the quote/program/job payloads. Now it delegates to the
> shared `redactExtraction()` comprehensive audit (all ~30 identity keys + notes/gdt free text + source
> path), names PII FIELD PATHS (never the cleartext value), and **AUTO-DELIVERS the redacted artifact**
> in the payload (`{redacted_extraction, pii_fields, n_redactions}`) -- so redaction is automatic, not a
> remembered `blueprint_redact` call. A 3-of-3 scrutiny P1 (a hyphenated material grade "AISI-1045"
> matching the part-number regex -> false-flag + an under-redaction hole when blanket-passed) was closed
> with a VALUE-aware `protectGrades` exemption (`looksLikeMaterialGrade`): embedded customer names + real
> part numbers in a spec value are masked, only a clean grade is preserved; `protectGrades` defaults false
> so the LoRA export + `blueprint_redact` text path are byte-identical. 130 tests, tsc clean, 3-of-3 PASS.
> **REMAINING (Phase-3 frontend, quebec):** `U-APP-REDACT-RENDER` -- the redacted-preview render (mask
> boxes over the title-block via `redactionRegions`) + the "export anonymized" toggle on the drawing view.
> The structured backend (detection + auto-redacted artifact + the `blueprint_redact` action) is done.
> Memory [[reference_xray_redact_comprehensive_pii_2026_06_25]] · code-tribal
> [[blueprint-redact-comprehensive-pii-value-aware-exemption]].
>
> **STATUS 2026-06-25 -- the WHOLE routing plan can now be made external-safe (`U-XRAY-REDACT-PLAN-PAYLOADS`
> `94a8b3fbc8`).** The prior unit auto-redacted only the `redact` ROUTE; the other 19 consumer payloads
> (quote/program/job/fai_run/setup_sheet/cad_reconstruct) still carried the RAW `title_block`/`source`, so
> the plan object was unsafe to surface/serialize/log externally (3-of-3 P2). New opt-in
> `routeExtractionToConsumers(contract, {redactPayloads:true})` (+ `prism_cad:blueprint_extract_route` /
> `_and_route` `redactPayloads` param) runs EVERY payload through `redactExtraction`, `plan.source` through
> `redactText`, and the per-route `reason` through `redactText` (a customer name mislabeled into the
> material field would otherwise leak via a material-interpolating reason -- per-file scrutiny arm-B P1),
> setting `plan.redacted=true`. Default FALSE -> internal consumers keep the customer they need; CONTENT-ONLY
> (eligibility/confirm-gates/summary unchanged). So the app's external-share / log / client-serialize path
> can request a fully-anonymized plan in one call. 77 tests, tsc clean, 3-of-3 PASS.

> **STATUS 2026-06-25 -- the END-TO-END EXECUTION LAYER shipped (`U-XRAY-EXTRACTION-PLAN-EXECUTOR` `fd46f6cff7`;
> operator "bypass domains + combine roles" directive).** The routers produced a PURE confirm-gated fan-out
> plan but nothing EXECUTED it. New `engines/blueprint-vision/extractionPlanExecutor.ts` (`executeExtractionPlan`,
> pure DI) + `routes/drawing.ts` `executePlanResponse` + `POST /api/v1/drawing/execute` drive the eligible,
> gate-cleared consumer actions end-to-end across EVERY downstream domain (quote->business, program->cam,
> inspection/fai/cmm->quality, feature/cad/redact->cad). SAFETY: a commitment consumer (money/machine/acceptance)
> NEVER auto-fires -- needs its id in `confirmedConsumers`; default executes ONLY advisory+privacy; per-consumer
> error isolation. SECURITY: the route takes a CONTRACT (not a raw plan) + re-derives a trusted plan via
> `blueprint_extract_route` (no caller-injected `dispatcher:action`). 88 tests, tsc clean, 3-of-3 PASS.
> **NEXT UNIT `U-XRAY-EXECUTOR-PAYLOAD-ADAPT` (arm-C P2):** several router CONSUMERS payloads don't match the
> real action params (spc_calculate needs runtime measurements not extraction dims; material_resolve needs
> `params.material`; feature_recognize needs geometry) -> advisory consumers no-op while recorded `executed`;
> a per-consumer drivability reconciliation is the next unit. Memory [[reference_xray_extraction_plan_executor_2026_06_25]].

### Phase 4 -- Document-reading exposure (catalogs / manuals / setup-sheets)
The office/PDF extraction engines are built but invisible to the app.
- **U-APP-DOC-EXTRACT** (owner: quebec + lima): expose `resourceExtractionDispatcher:office_process` +
  the lima pypdf page extractor via a "Document" tab on `DocumentInboxPage` -- upload a tool catalog ->
  extract tool geometry; a setup sheet -> extract speeds/feeds; a manual -> extract procedure text, each
  routed to its consumer (tool-crib / SFC / academy). **Ollama-summarize** the extracted text (`ask-ollama
  summarize`), never Claude.

### Phase 5 -- Print -> program (CAM) app surface
- **U-APP-PRINT-TO-PROGRAM** (owner: kilo + quebec): surface `camDispatcher:print_to_program_full` so an
  extracted drawing can be carried to a toolpath draft. Downstream of Phase 1; kilo owns the toolpath contract.

---

## 3. Cross-galaxy ownership + coordination
| Phase | xray (extraction contract) | quebec (frontend) | charlie (quote) | kilo (CAM) | lima (doc corpus) |
|-------|---------------------------|-------------------|-----------------|------------|-------------------|
| 1 extract+display | OWNS the route's extraction contract | OWNS the panel | -- | -- | -- |
| 2 blueprint->quote | extraction schema | wires form | OWNS quote math | -- | -- |
| 3 redaction | OWNS redact-lib | OWNS render/toggle | -- | -- | -- |
| 4 doc-reading | -- | OWNS doc tab | -- | -- | OWNS pypdf extractor |
| 5 print->program | extraction schema | wires carry-over | -- | OWNS toolpath | -- |

xray's deliverable across all phases is a **stable extraction contract** (the JSON shape of
`{dimensions, gdt, notes, title_block, confidence}`) that the app consumers bind to -- versioned, so a
frontend change never silently breaks on an extraction-shape change.

> **STATUS 2026-06-23 -- the extraction contract SHIPPED (`U-XRAY-EXTRACTION-CONTRACT`).**
> `mcp-server/src/schemas/BlueprintExtractionContract.ts` (Zod v4, 14/14 tests, tsc-clean, 2-arm
> scrutiny PASS): `BLUEPRINT_EXTRACTION_CONTRACT_VERSION="1.0.0"` + `blueprintExtractionContractSchema`
> (`{schemaVersion, units:"mm", dimensions[], gdt[], notes[], profiles[], surface_finishes[],
> title_block?, confirm_floor, summary}`) + `normalizeFusedToContract(fused)` (maps the live
> `fuseEnsemble` output, attaches per-field `needs_confirm = confidence < OCR_PER_FIELD_CONFIRM_FLOOR`
> 0.70) + `validateBlueprintExtractionContract` (safeParse, never throws). This is xray's foundation
> deliverable -- the upload->extract route (Phase 1, **owner papa/quebec**) should `import` it, call
> `normalizeFusedToContract` on the `drawing_extract`/ensemble output, and return + validate the
> versioned envelope. A producer change now forces a `schemaVersion` bump + migration, never a silent
> consumer break. Per-file scrutiny caught + fixed 2 producer-drift P1s (callout text/confidence read
> the keys the VLM ensemble actually emits). Memory [[reference_xray_extraction_contract_2026_06_23]].

> **STATUS 2026-06-24 -- the GEOMETRY-path normalizer SHIPPED (`U-XRAY-DRAWING-EXTRACT-CONTRACT-NORMALIZER`).**
> Reading-first (R8) surfaced that the dispatcher-reachable `drawing_extract`
> (`resourceExtractionDispatcher.ts:175` -> `Drawing2DExtractionEngine.extractDrawing`) returns a
> DISTINCT producer shape from the VLM fuse: `ExtractionResult.dimensions[] = {value, unit:'mm'|'in',
> type:'linear'|'angular'|'radial'|'diameter', text}` (each dim carries its OWN unit, NOT a
> pre-normalized `value_mm`). Piping it through `normalizeFusedToContract` would silently drop EVERY
> dimension (its `value_mm` is `undefined`) AND lose the inch->mm conversion -- the exact silent-loss the
> contract exists to prevent. Closed with a sibling normalizer `normalizeDrawingExtractToContract`
> (BlueprintExtractionContract.ts): per-dim inch->mm (units-first; unrecognized/missing unit kept but
> forced `needs_confirm`, never silently mm), `radial->radius` type map, geometry-confidence (1.0 on a
> deterministic parse / 0.5 if a producer signals failure), `annotations->notes`, `partInfo->title_block`,
> `n_models:0`. Extracted a shared private `finalizeContract` so both normalizers' summary rollup lives in
> ONE place (the fuse normalizer refactored onto it, behavior-identical -- 14 prior tests stay green). 28
> tests (14 new), tsc-clean, 3-arm scrutiny PASS (P2 units-leak + value-coercion hardened in-pass). So
> BOTH producer paths (VLM ensemble + CAD-drawing geometry) now reach the versioned contract. **The Phase-1
> `POST /api/v1/drawing/extract` route (owner papa/quebec) is now a thin follow-on**: call the producer
> dispatcher, pick the matching normalizer by producer (`normalizeFusedToContract` for the VLM/`fuseEnsemble`
> path, `normalizeDrawingExtractToContract` for `drawing_extract`/DXF), `validateBlueprintExtractionContract`,
> return. NB `drawing_extract` is currently simulated-data-driven (real DXF parse not yet implemented) and
> `createUploadRouter` is not yet registered in `routes/index.ts` -- both are producer-side gaps the route
> owner resolves. Memory [[reference_xray_drawing_extract_normalizer_2026_06_24]].

> **STATUS 2026-06-24 -- the normalizers are now REACHABLE as an app surface (`U-XRAY-EXTRACT-CONTRACT-WIRE`).**
> New `prism_cad:blueprint_extract_contract` action (`cadDispatcher.ts`, mirrors the `blueprint_redact`
> precedent) + `POST /api/v1/cad/blueprint-extract-contract` route (`routes/cad.ts`, registered): take a
> PRE-OBTAINED producer extraction (`fused` OR `drawing`), pick the matching normalizer, validate, return
> the versioned contract + a real schema-validation verdict. No producer run / no I/O / no GPU (the app
> obtains the extraction via the producer action first, then calls this -- same pattern as blueprint_redact).
> exactly-one-of-producer guard; 5 round-trip tests THROUGH prism_cad (inch->mm proven through the
> dispatcher; `valid` verified as a REAL gate -- a corrupted contract returns valid:false). So the contract
> normalizers are no longer orphaned. The **Phase-1 `POST /drawing/extract` upload route (papa/quebec) now
> just chains: producer extract action -> `blueprint_extract_contract` -> return** (or producer + normalizer
> inline). Memory [[reference_xray_extract_contract_wire_2026_06_24]].

> **STATUS 2026-06-24 -- the EXECUTABLE "apply to ALL features" backbone SHIPPED (`U-XRAY-EXTRACT-CONSUMER-ROUTER`, `b7fe4242ea`).**
> The contract NORMALIZED one part's extraction but nothing turned it into ACTION. New pure
> `mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts` (`routeExtractionToConsumers`)
> maps a validated contract -> a fan-out plan: which downstream prism feature each extraction can drive,
> with per-consumer eligibility + contract-derived payloads + (for COMMITMENT consumers quote/program/
> inspection) a confirm-gate that blocks on any below-floor `needs_confirm` field. 7 consumers wired,
> all 6 dispatcher actions disk-verified: quote=`prism_business:blueprint_to_quote`,
> material_resolve=`prism_business:blueprint_resolve_material`, feature_recognize=`prism_cad:feature_recognize`,
> cad_reconstruct=`prism_cad:blueprint_to_all_cads`, redact=`prism_cad:blueprint_redact`,
> print_to_program=`prism_cam:print_to_program_full`, inspection_plan=`prism_quality:blueprint_inspection_plan`.
> WIRED: `prism_cad:blueprint_extract_route` + `POST /api/v1/cad/blueprint-extract-route`. The app
> upload->extract->route flow now chains: producer -> `blueprint_extract_contract` -> `blueprint_extract_route`
> -> a confirm-gated fan-out plan in ONE place. Schema: the contract's 5 array fields are `.default([])`
> so a contract round-tripping through `slimResponse` (strips empty arrays) re-validates cleanly. 20 new
> tests (15 router + 5 prism_cad round-trip), 53 affected green, tsc-clean, per-file 2-arm scrutiny PASS
> (2 P2s -- summary-mirror self-disagreement + REST surface parity -- both fixed in-pass). NOT a dup of
> `ExtractionIntelligenceRouter` (that routes extracted KNOWLEDGE to codebase wiring; this routes a part's
> EXTRACTION CONTRACT to feature consumers). Memory [[reference_xray_extract_consumer_router_2026_06_24]].

> **STATUS 2026-06-24 -- the GEOMETRY producer is now REAL (`U-XRAY-DRAWING-EXTRACT-REAL-DXF`).**
> The section-1 producer table + the normalizer STATUS notes flagged `drawing_extract`
> (`resourceExtractionDispatcher` -> `Drawing2DExtractionEngine`) as "simulated-data-driven (real
> DXF parse not yet implemented)" -- a real stub that made the contract DROP every dimension on a DXF
> upload. CLOSED: `Drawing2DExtractionEngine.parseDxfContent(content)` now parses real DXF (entities +
> DIMENSION group-42 values + type + layers + $INSUNITS + TEXT annotations), reusing `parseDXFGroups`
> (exported from `DXFGeometryParserEngine`). The engine stays I/O-free; the `drawing_extract` dispatcher
> does the guarded `fs.readFileSync` (64MB cap) and passes `content`; `simulatedData` kept as a
> back-compat override. LIVE-validated on a real tool DXF (`3105249 ... DXF-inch.dxf`): units=in
> detected (25.4x trap avoided), 1311 entities, 6 real dims. Per-file 2-arm scrutiny caught + I fixed a
> NET-NEW units-trust gap (unknown-`$INSUNITS` dims were collapsed to mm -> normalizer trusted them with
> needs_confirm=false; now `unit:'unknown'` propagates so the contract forces needs_confirm). So the
> `normalizeDrawingExtractToContract` path (06-24 above) now has a REAL upstream producer for DXF/
> drawing-geometry uploads -- the VLM path stays the async GPU job. 29 engine tests + 28 contract tests,
> tsc-clean. Memory [[reference_xray_drawing_extract_real_dxf_2026_06_24]]. **Phase-1 remaining:** the
> `POST /api/v1/drawing/extract` upload route + `createUploadRouter` registration (papa/quebec) + the
> async VLM-OCR job; the producer + contract + router chain is now real end-to-end for DXF.

> **STATUS 2026-06-24 -- the Phase-1 `POST /api/v1/drawing/extract` route SHIPPED (`U-XRAY-DRAWING-EXTRACT-ROUTE`, `ab018ccb85`).**
> The keystone of Phase 1 is live: `routes/drawing.ts` (`extractDrawingChain`) composes the now-real
> producer (`prism_resource_extraction:drawing_extract`) -> `prism_cad:blueprint_extract_and_route`
> (or `blueprint_extract_contract` when `route:false`) -> returns the versioned BlueprintExtractionContract
> + the confirm-gated 20-consumer fan-out plan, in ONE HTTP call; mounted `/api/v1/drawing` in
> `routes/index.ts`. DXF/inline-content is SYNCHRONOUS; PDF/raster returns **202 queued** (async VLM OCR
> is a GPU job, NOT faked synchronously -- R12). Per-file 2-arm scrutiny caught + I fixed a real P1
> arbitrary-file-read/path-traversal (an HTTP caller-supplied path was fs-read unauthenticated --
> `optionalToken` is non-blocking): added `drawingExtractAllowRoots()` + a prefix-confusion-safe
> `isWithinAllowedRoot` guard (403 before the producer when a `.dxf` would be read outside the upload
> staging dir; mirrors `routes/ppg.ts`) + adversarial 403 tests + generic 422 bodies (no raw-error leak).
> 13 route tests (incl 2 adversarial) + 80/80 across the engine+dispatcher+contract+route chain; both
> scrutiny arms PASS post-fix. **Phase-1 remaining now narrows to:** `createUploadRouter` registration +
> the async VLM-OCR **job+poll** for the PDF/image path (currently honest-202); the DXF path is fully live.
> Memory [[reference_xray_drawing_extract_real_dxf_2026_06_24]].
>
> **STATUS 2026-06-25 -- Phase-1 is COMPLETE: the async VLM-OCR job+poll path SHIPPED**
> (`U-XRAY-EXTRACTION-JOB-ENGINE` `5282a059e1` + `U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC` `7db54c683c` +
> `U-XRAY-DRAWING-EXTRACT-POLL-PRUNE` `d350e3818a`; `createUploadRouter` was wired `0485ba77e6`).
> The PDF/raster branch no longer returns an inert 202 stub -- it ENQUEUES a real durable job and the
> client polls a result:
> - `POST /api/v1/drawing/extract` with a PDF/image path -> **202 `{ jobId, poll_url, document_type }`**;
>   a background `runExtractionJob` runs the GPU ensemble OFF the event loop and normalizes -> contract.
> - `GET /api/v1/drawing/extract/job/:jobId` -> **`{ status: queued|running|done|failed, result?, error? }`**.
> - Substrate: `engines/blueprint-vision/extractionJobStore.ts` (forward-only state machine, atomic
>   per-job-file writes, sanitized jobId = traversal-safe) + `extractionJobRunner.ts` (injected `ocr` +
>   `callTool`, never throws, honest `extraction_empty` flag on a 0-dim result) + the real `ocr` dep
>   `scripts/ocr-extract-one.mjs` (a THIN exec: PDF->PNG via `pdf-to-png.py` + the SHARED
>   `runEnsembleOverImage` core -- NOT a dup of `vision-ensemble-extract.mjs`).
> - Security: the async branch is path-confined like the `.dxf` branch (the OCR exec fs-reads the path ->
>   out-of-root `.pdf` is **403 before enqueue**); poll jobId traversal -> 404; spawn is argv-array +
>   `windowsHide:true`; subprocess stderr stays server-side (generic client error). prune-on-enqueue
>   bounds tmp growth (no background timer -> no R14 orphan), TTL clamped to a >=60s floor.
> 60 tests (16 route incl 5 async + 7 poll, 13 runner, 15 store, 16 exec-cores incl R9 cap + thinking-trap),
> tsc-clean, both per-file 2-arm scrutiny passes PASS. **Phase-1 (the core upload->extract->structured
> loop) is now 100% backend-live for BOTH producer paths (DXF sync + PDF/raster async).** What remains is
> quebec's React surface (consume the contract + poll the job) -- the backend is no longer the gate.
> Memory [[reference_xray_async_ocr_job_route_2026_06_25]].

---

## 4. Stack utilization (per the operator "goal clear")
- **Ollama offloading:** ALL VLM OCR + all document-text summarization run on the local Ollama GPU
  ($0, no Claude tokens) -- the extraction route, doc-reading, and redaction-region detection are
  mechanical/vision tasks, exactly the offload class.
- **Hermes / parallel agents:** the consumer survey that grounded THIS plan was a parallel Explore agent
  (88K tokens, 30 tool calls, off the main context). Future phase build-outs fan out the same way
  (one agent per route + component + test) under a Workflow coordinator.
- **Engineered loops / harnesses:** the closed-loop OCR training harness (`PRISM OCR Training Loop`
  scheduled task, healthy, last result 0) now ALSO accumulates real program-GT calibration samples
  (U-XRAY-PROGRAM-GT-CALIB) -- the app's confidence badges (Phase 1) read the same calibration the
  harness produces, so the UI trust signal compounds as the corpus grows.
- **Crons:** the nightly training cron is the engine behind the app's improving extraction; a future
  per-customer redaction-blocklist refresh (Phase 3) is a natural cron consumer.

---

## 5. Sequencing + risk
Phase 1 (extract route + view) is the unlock for everything else and is 100% backend-ready -- build it
first. Phases 2/5 depend on Phase 1's extraction contract. Phase 3 (redaction) is independent and the
explicit operator ask -- build in parallel with Phase 1 by a different owner. Phase 4 is independent.

**Risk:** the frontend ownership is quebec's; xray's role is the extraction contract + redact-lib, not
the React. This plan is a coordination artifact -- the actual route/component units land in quebec's and
charlie's queues with xray supplying the contract. The single biggest miss to avoid: re-implementing
extraction in a route instead of calling the SHIPPED `drawing_extract` dispatcher (R8/dedup).

---
_Authored 2026-06-23 (slot:xray) from a parallel-agent consumer survey + galaxy doctrine. Pairs with
the [[blueprint-reading-improvement-backlog-2026-06-19]] (backend recall/precision) -- this is the
APP-EXPOSURE companion: that backlog makes the reading better, this plan makes it usable in the product._
