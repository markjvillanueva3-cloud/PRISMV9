---
name: reference_xray_doclearn_normalizer_2026_06_24
description: "3rd document producer normalizer normalizeDocLearningToContract (documentLearning IngestionResult -> procedure/note DocEntries carrying per-item confidence -> tribal_capture); wired into document_extract_contract producer:doclearn branch"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.271Z
aliases: reference_xray_doclearn_normalizer_2026_06_24
---


**documentLearning producer normalizer (2026-06-24, slot xray, U-XRAY-DOCLEARN-NORMALIZER).**

NEVER-IDLE own-domain unit after [[reference_xray_doc_router_xgalaxy_2026_06_24]]. Closes the "DocumentLearningPage -> tribal-knowledge" dead-end (consumer-application-map section 3: "More producer normalizers ... documentLearning DocRecord"). The 3rd document producer normalizer (after office + OCR).

`normalizeDocLearningToContract(ingestion, opts)` in `mcp-server/src/schemas/DocumentExtractionContract.ts`: maps a documentLearning `ContentIngestionPipelineEngine.IngestionResult` (`.items[]` of `{title, body, category, confidence}`, ContentIngestionPipelineEngine.ts:39-60) -> procedure/note DocEntries. KEY DESIGN: documentLearning items carry a REAL per-item confidence, so the normalizer carries `it.confidence` verbatim (NOT a flat regex sub-floor like the office normalizer) -- a high-confidence learned tip reaches tribal_capture WITHOUT operator-confirm; a low-confidence one is gated. value = "title: body"; DOCLEARN_PROCEDURE_HINT regex classifies procedure vs note (both route ONLY to tribal_capture, so semantic-only -- cannot mis-route); blank/dup dropped; docType default "manual" (overridable). Reuses finalizeDocContract/clamp01 (accepts full IngestionResult, .items[], or a bare IngestionItem[]).

**R15 WIRE:** `document_extract_contract` (resourceExtractionDispatcher.ts) got a `doclearn` producer branch (`params.producer==="doclearn" || params.ingestion != null`); selector order ocr -> doclearn -> office(default), office/OCR paths byte-unchanged. So the chain `doc_extract(documentLearning) -> document_extract_contract{producer:doclearn} -> document_extract_route -> tribal_capture` is live.

**Validation:** 27 tests green (7 normalizer unit + 11 doc-router + 9 round-trip incl. a new doclearn chain proving the 0.5-confidence tip confirm-gates tribal, blocking_fields=1); tsc-clean; per-file 2-arm scrutiny (code-analyzer + reviewer) BOTH PASS, NO findings -- each disk-verified the IngestionItem shape, hand-traced the confirm-gate math, confirmed totality on garbage + producer-selector non-regression + R15 reachability. Ollama cross-file advisories ("g is not defined", "mod.normalizeDocLearningToContract not imported") were FALSE POSITIVES (the symbols are defined/exported; cleared by tsc) -- a reminder that Ollama build advisories can't see across files.
