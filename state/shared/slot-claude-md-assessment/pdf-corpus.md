# pdf-corpus — fleet-managed

> Assessment date: 2026-06-13. Assessed by: subagent (sonnet-4-6). All engine names, dispatcher actions, and file paths verified by Grep/Read/Bash before citation.

---

## Current state

**Size:** 9,335 bytes / 95 lines.

**Quality grade: PARTIAL**

The file has a solid structural skeleton but suffers from these concrete problems:

1. **Sections 5/6/7 are explicitly labelled "STUB"** (line 20: `## 5/6/7 STUB — Per R12 lima refines.`). Three sections were never filled in.

2. **Engine list in `## Key engines` (lines 34-46) is copy-pasted from PATHS.md keyword-heuristic match, not a curated domain-owned list.** It includes engines that are almost certainly NOT pdf-corpus-owned: `AIExtractionReasonerEngine`, `ActionSequenceExtractorEngine`, `BlueprintCorpusHarvestEngine`, `BlueprintExtractionRAGEngine`, `BusinessDocumentExtractorEngine`, `CADCorpusIngestionEngine` etc. PATHS.md itself says "(keyword match — prune false positives)". These names were propagated into CLAUDE.md without pruning.

3. **`prism_resource_extraction` claimed to have "21 actions" (MEMORY.md line 62)** but the actual dispatcher (`resourceExtractionDispatcher.ts:31`) has only **14 actions**: `archive_discover, archive_analyze, classify_dark, dark_report, ocr_process, ocr_stats, drawing_extract, drawing_summary, office_process, office_search, log_harvest, log_alarms, coordinate_register, coordinate_claim`. The 21-action claim is inaccurate.

4. **TOOLBELT.md dispatcher section is empty** (placeholder: "owning slot lists the domain's prism_* dispatcher actions here"). No domain-specific tool-call patterns documented.

5. **The Ollama-distilled "Domain knowledge" block** (lines 32-33) is vague narrative that adds no operational value: "Key components include various engines like AIExtractionReasonerEngine…". It does not state what these engines actually do or when to call them.

6. **Tribal pointer** (line 56) points to `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md` — this is a POST-PROCESSOR tribal doc, not a pdf-corpus one. Likely a template or copy-paste error.

7. **Cross-cutting methodology block** (lines 70-96) is the fleet-wide papa-authored cross-cutting boilerplate, verbatim. It provides no pdf-corpus-specific content and wastes ~25 lines that duplicate global CLAUDE.md doctrine.

8. **The AI-systems-state block** appears identically in both CLAUDE.md and MEMORY.md — a duplicate injection that wastes tokens on every load.

---

## KEEP

The following content is accurate, load-bearing, and should stay:

- **§1 Domain scope** (lines 5-7) — correct high-level boundary statement for pdf-corpus, including the 76x depth claim and 8752 page-level stat.
- **§4 Test commands** (lines 15-18) — `npx vitest run -t "PDF|Pypdf|Corpus"` is the correct test filter.
- **§Related galaxies / PSN edges** (lines 23-26) — knowledge-conversion and pdf-corpus-mill symmetric edges are accurate.
- **§High-ROI domain memories** block (lines 48-54) — the pypdf-canonical rule, notability floor, `feedback_use_lima_pypdf_page_extractor`, `feedback_jm_machine_extraction_after_pdf_exhaustion`, and the script path `scripts/extract-jm-die-corpus-page-by-page.py` are all verified correct.
- **§Critic + keep-working contract** (lines 91-96) — correct universal pointer (just a pointer, not duplicated doctrine).
- **Cross-refs** section (lines 67-68) — accurate galaxy relationship links.
- **Critical resource roots** block in PATHS.md — `H:/PRISM/resources/PDF`, `resources/RESOURCE PDFS`, `resources/OKUMA MULTUS PDFS`, `Docustrata/manifest.json` are all correct domain-relevant roots.

Verified correct dispatcher actions (cite these verbatim going forward):
- `prism_dev:pdf_pipeline_classify` · `pdf_pipeline_extract` · `pdf_pipeline_read` · `pdf_pipeline_summary` · `pdf_highlights_extract` (devDispatcher.ts, lines 2115-2147 confirmed)
- `prism_doc_learn:doc_upload` · `doc_extract` · `doc_list` · `doc_get` · `doc_delete` (documentLearningDispatcher.ts:29-35)
- `prism_resource_extraction:archive_discover` · `archive_analyze` · `classify_dark` · `dark_report` · `ocr_process` · `ocr_stats` · `drawing_extract` · `drawing_summary` · `office_process` · `office_search` · `log_harvest` · `log_alarms` · `coordinate_register` · `coordinate_claim` (resourceExtractionDispatcher.ts:31-46, **14 actions**, NOT 21)

---

## DROP

Content wasting tokens that should be removed or replaced with pointers:

1. **Lines 20 STUB label** — drop the `## 5/6/7 STUB` heading entirely; either fill the content or remove the section.
2. **Ollama-distilled vague "Domain knowledge" paragraph** (lines 32-33) — drop; replaces with the concrete engine list from MEMORY.md.
3. **Unverified engine list in `## Key engines`** (lines 34-46: `AIExtractionReasonerEngine`, `ActionSequenceExtractorEngine`, `AdditiveManufacturingTribalCorpusEngine`, `BlueprintCorpusHarvestEngine`, `BlueprintExtractionRAGEngine`, `BusinessDocumentExtractorEngine`, `CADCorpusFeaturePrevalenceLearnerEngine`, `CADCorpusIngesterEngine`, `CADCorpusIngestionEngine`, `CADCorpusPatternEngine`, `CADModelDimensionExtractorEngine`, `CADReverseCorpusCatalogEngine`) — these were auto-generated from keyword heuristic, not verified as pdf-corpus-owned. Replace with the 10 verified PDF-prefixed engines from MEMORY.md.
4. **Tribal pointer to post-processor doc** (line 56: `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md`) — wrong domain. Drop.
5. **Cross-cutting methodology block** (lines 70-81) — fleet-wide boilerplate from papa's infra lane. Replace with a one-line pointer to `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md`. Do not duplicate the prose.
6. **`<!-- AI-SYSTEMS-STATE -->` block** (lines 82-89) — already in MEMORY.md; one copy is sufficient. Drop from CLAUDE.md, keep in MEMORY.md.
7. **Duplicate `## Test commands` section** (lines 58-61 in the FILL block) — duplicates the `## 4. Test commands` at lines 15-18. Drop the second copy.

---

## ADD (domain-specific — the heart of this assessment)

These are items the pdf-corpus CLAUDE.md critically lacks. All engine names and dispatcher actions below are verified by Bash/Grep/Read.

### A. The 10 verified core PDF engines (replace the unverified list)
All exist in `mcp-server/src/engines/` (verified by `ls` output):
```
PDFProcessingPipelineEngine.ts          — orchestrates the full PDF ingestion pipeline
PDFSourceRegistryEngine.ts              — tracks all registered PDF source paths
PDFStructureEngine.ts                   — page/structure model (layer 6, built)
PDFTableExtractionEngine.ts             — structured table extraction per page
PDFHandbookBatchProcessorEngine.ts      — batch-mode for multi-handbook ingestion
PDFHighlightExtractorEngine.ts          — highlight/annotation extraction; backs pdf_highlights_extract
PDFFormulaExtractionEngine.ts           — math/physics formula extraction from pages
PDFMaterialPropertyExtractionEngine.ts  — material property extraction per page
PDFBlueprintDimensionExtractorEngine.ts — blueprint dimension extraction
PDFBlueprintPatternRescueEngine.ts      — rescues corrupted/poorly-structured blueprint PDFs
```

### B. Full verified dispatcher surface (daily tool-calls for this domain)
```
prism_dev:pdf_pipeline_classify          — classify PDF source type before extraction
prism_dev:pdf_pipeline_extract           — run extraction pipeline on classified PDF
prism_dev:pdf_pipeline_read              — read pipeline status/output
prism_dev:pdf_pipeline_summary           — summarize pipeline run results
prism_dev:pdf_highlights_extract         — extract highlights/annotations from PDF

prism_doc_learn:doc_upload               — upload a new PDF for knowledge extraction
prism_doc_learn:doc_extract              — extract knowledge from uploaded document
prism_doc_learn:doc_list / doc_get / doc_delete  — manage document registry

prism_resource_extraction:archive_discover / archive_analyze   — discover + analyze archive PDFs
prism_resource_extraction:ocr_process / ocr_stats              — OCR fallback for scanned pages
prism_resource_extraction:drawing_extract / drawing_summary    — 2D drawing extraction
prism_resource_extraction:classify_dark / dark_report          — classify/report dark/unreadable content
prism_resource_extraction:log_harvest / log_alarms             — harvest log/alarm pages from manuals
```

### C. Canonical extractor workflow (missing from CLAUDE.md, present only in MEMORY.md)
The CLAUDE.md should inline this so a pdf-corpus chat doesn't need to read MEMORY.md first:
```
# Step 1 — classify the PDF
prism_dev:pdf_pipeline_classify { source: "<abs-path>" }

# Step 2 — run page-by-page extraction (canonical: lima pypdf)
python scripts/extract-jm-die-corpus-page-by-page.py \
  --input <pdf-path> --output mcp-server/data/tribal/jm-die-corpus-pages.jsonl \
  --notability-floor 0.4

# Step 3 — for scanned/image PDFs, OCR fallback
prism_resource_extraction:ocr_process { filePath: "<abs-path>" }

# Step 4 — pipeline read / summary
prism_dev:pdf_pipeline_read   →  pdf_pipeline_summary
```

### D. Domain-specific safety / invariants (NOT in current CLAUDE.md body, buried in MEMORY.md)
These must be in the doctrine file (CLAUDE.md), not just the brain (MEMORY.md):
- **Notability floor = 0.4** — pages below this score (TOC, blank, cover) are skipped (~22% of corpus). `NOTABLE_CONFIG` in the script is the canonical weight source. Do NOT re-invent weights.
- **Page-count verification required** — every extraction run must verify `extracted_pages == pdf.page_count`; a mismatch is a hard stop, not a warning (SOUL.md refuse: `ignoring-page-count-mismatch`).
- **No overwriting existing tribal entries** (SOUL.md refuse: `overwriting-existing-tribal-entries`) — always append-mode to `jm-die-corpus-pages.jsonl`; the file is gitignored but golf hygiene preserves it.
- **Text normalization before embedding** (SOUL.md refuse: `embedding-without-text-normalization`) — strip control chars, normalize unicode before sending page text to `nomic-embed-text`.
- **OCR fallback is mandatory for scanned pages** (SOUL.md refuse: `skipping-ocr-fallback-on-scanned-docs`) — detect via `PDFStructureEngine` image-page flag; route to `prism_resource_extraction:ocr_process`.
- **Never re-OCR already-indexed corpora** — `H:/PRISM/Docustrata` (257,992 files) is indexed at `Docustrata/.index/jm-die-index-v2.json` + `manifest.json`. Search the index, never re-extract. Same for `mcp-server/data/jm-die-database/` (38,251 files).
- **Provenance is mandatory** — every emitted tribal entry must cite: `source_pdf`, `page_number`, `extraction_date`. No provenance = reject the entry.

### E. Domain resource paths (not currently in CLAUDE.md body, only in PATHS.md)
```
H:/PRISM/resources/PDF                      — reference PDF trove (CAM/machine manuals)
H:/PRISM/resources/RESOURCE PDFS            — additional reference PDFs
H:/PRISM/resources/OKUMA MULTUS PDFS        — Okuma-specific PDF manuals
H:/PRISM/Docustrata/manifest.json           — business/order doc index (66.2M rollup, do NOT re-OCR)
mcp-server/data/tribal/jm-die-corpus-pages.jsonl  — canonical page-level output (gitignored)
mcp-server/data/tribal/jm-die-corpus.jsonl         — per-PDF catalog (gitignored)
scripts/extract-jm-die-corpus-page-by-page.py      — canonical pypdf extractor (LIMA method)
```

### F. What NOT to do in this domain (currently nowhere in CLAUDE.md)
```
NEVER use scripts/pdf-parse-extract.mjs for page extraction — heading-anchor only,
  yields 115 rows vs 8,752 (76x inferior). Use the pypdf script.

NEVER re-OCR Docustrata or jm-die-database — already indexed; re-OCR wastes hours
  and duplicates entries.

NEVER emit a tribal entry without provenance (source_pdf + page_number + date).

NEVER inline the notability weights inline in new code — reference NOTABLE_CONFIG
  in scripts/extract-jm-die-corpus-page-by-page.py.

NEVER claim prism_resource_extraction has 21 actions — it has 14 (verified
  resourceExtractionDispatcher.ts:31-46, 2026-06-13).

NEVER use the CAD-corpus or Blueprint engines (BlueprintCorpusHarvestEngine,
  CADCorpusIngestionEngine etc.) without verifying they are actually pdf-corpus-owned —
  PATHS.md engine list is a keyword heuristic with false positives.
```

### G. Top tribal gotchas (from MEMORY.md known failure modes — need surfacing in CLAUDE.md)
- **tribal-by-domain-inject domain map regression** — adding domains to DOMAIN_MAP in `tribal-rerank.mjs` can zero out tribal tips for those slots if the getDomainTokens() routing is wrong. Verify domain tokens return non-empty before wiring a new domain. (`reference_tribal_domain_map_premise_false_2026_06_01`)
- **Academy tribal PSN leg marked red** — `getDomainTokens(lima)` yielded garbage in the routing chain; if extracting for the academy consumer, verify the PSN leg is green first. (`reference_lima_tribal_routing_chain_2026_05_29`)
- **No dedicated slot** — pdf-corpus is fleet-managed. Any slot working in this galaxy must claim via `/pick-unit` + heartbeat the slot-task-claim, because there is no persistent pdf-corpus slot to hold the lock.

### H. Cross-galaxy consumer contract (when downstream galaxies break, check here first)
- **academy** reads from `jm-die-corpus-pages.jsonl` — if the file is truncated or empty, academy training data is stale.
- **mit-curriculum** depends on raw PDF availability under `H:/PRISM/resources/PDF`; verify the resource root is mounted before a mit-curriculum consumer reports "no PDFs found."
- **knowledge-conversion** is the upstream PRODUCER — if knowledge-conversion's 6-node router is broken, pdf-corpus receives malformed input. Check `engines/knowledge-conversion/` before debugging extraction failures.
- **post-processor** (echo) POST-PDF-NODE pipeline consumes this corpus — breakage there shows as missing wiki entries, not extraction errors.

---

## IDEAL SECTION OUTLINE

The ordered sections this galaxy CLAUDE.md should have (a pdf-corpus chat needs nothing else but the universal-core pointer):

```
1. Domain scope + slot assignment        — what this galaxy owns; fleet-managed (no dedicated slot)
2. Canonical extractor workflow          — classify → pypdf page-by-page → OCR fallback → pipeline-read
3. Verified core engines (10)            — PDF-prefixed engines only, 1-line each, file path
4. Verified dispatcher surface           — prism_dev / prism_doc_learn / prism_resource_extraction actions
5. Domain resource paths                 — 7 canonical paths (PDF troves, JSONL outputs, extractor script)
6. Safety invariants + REFUSES           — notability floor, page-count verify, no-overwrite, OCR-mandatory,
                                           provenance-mandatory, no-re-OCR, text-normalize-before-embed
7. What NOT to do                        — 6 concrete prohibitions with rationale
8. Tribal gotchas                        — domain_map regression, lima PSN leg red, fleet-managed lock discipline
9. Cross-galaxy consumer contract        — academy / mit-curriculum / knowledge-conversion / post-processor
10. Test commands                        — vitest filter + extractor smoke test
11. Related galaxies (PSN edges)         — knowledge-conversion, pdf-corpus-mill, mit-curriculum, academy, post-processor
12. Universal-core pointer               — one line pointing to H:/PRISM/CLAUDE.md for R1-R15, scrutiny, handoff
```

---

## UNIVERSAL-CORE POINTER

The following universal rules must remain available to pdf-corpus chats but should NOT be duplicated in this file — pointer only:

> See `H:/PRISM/CLAUDE.md` for:
> - R1-R15 Karpathy + agent-era rules (§CLAUDE.md RULES 5-13)
> - Scrutiny 3-of-3 gate + per-file 2-arm scrutiny (§SCRUTINY GATE)
> - Per-chat handoff protocol (§PER-CHAT HANDOFF)
> - Commit format `[SCOPE]/U-ID: title` (§SESSION HYGIENE)
> - Units-first / never-inline-constants / no-stub-engines (§SAFETY RAILS)
> - Slot-worktree commit discipline (§Lane discipline)
> - RTK bash prefix (§RTK)
> - MCP dispatcher map overview (§MCP DISPATCHERS)
> - Ollama fallback ladder (§AI SYSTEM ROUTING)

The cross-cutting methodology block, AI-systems-state block, and Karpathy 5-step should NOT be copied into this galaxy CLAUDE.md — they live in the universal core and are already auto-injected by the hook stack.
