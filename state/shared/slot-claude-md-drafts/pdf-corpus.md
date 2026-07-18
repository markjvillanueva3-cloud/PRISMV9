# pdf-corpus Galaxy — fleet-managed (no dedicated slot)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = pdf-corpus-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** PDF ingestion pipeline (page-level, 76x deeper than heading-anchor method), per-page text
extraction, OCR fallback for scanned pages, JM Die corpus extraction (24,545 files → 8,752 page-level
entries), notability scoring, pypdf-canonical extraction, PDF-Learn pipeline output.

**EXCLUDES:** mill-specific PDF extraction → `pdf-corpus-mill`; OCR of CAD/blueprint files → `xray`
(blueprint-vision); MIT-OCW course content → `mit-curriculum`; tribal-tip storage/indexing →
`tribal-knowledge`; knowledge-conversion routing logic → `knowledge-conversion`.

**Slot:** fleet-managed — no dedicated slot. Any slot working here MUST claim via `/pick-unit` +
heartbeat the slot-task-claim (`node H:/prism/.claude/helpers/slot-task-claim.mjs claim`). No
persistent lock holder — race discipline required.

**Worktree:** whichever slot picks a unit; commit to that slot's `H:/prism-slot-<nato>` / `slot/<nato>`.

---

## §2 — Verified engines

No local `.ts` engines exist under `mcp-server/src/engines/pdf-corpus/` — the galaxy is a config/doc
galaxy only. The PDF-prefixed engines that serve this domain live in the engines root:

| Role | Engine file (verified — exists in `mcp-server/src/engines/`) |
|------|---------------------------------------------------------------|
| Full ingestion pipeline orchestrator | `PDFProcessingPipelineEngine.ts` |
| PDF source path registry | `PDFSourceRegistryEngine.ts` |
| Page/structure model (layer 6) | `PDFStructureEngine.ts` |
| Structured table extraction per page | `PDFTableExtractionEngine.ts` |
| Batch-mode multi-handbook ingestion | `PDFHandbookBatchProcessorEngine.ts` |
| Highlight/annotation extraction | `PDFHighlightExtractorEngine.ts` |
| Math/physics formula extraction | `PDFFormulaExtractionEngine.ts` |
| Material property extraction per page | `PDFMaterialPropertyExtractionEngine.ts` |
| Blueprint dimension extraction | `PDFBlueprintDimensionExtractorEngine.ts` |
| Corrupted/poorly-structured PDF rescue | `PDFBlueprintPatternRescueEngine.ts` |

**NOTE:** The keyword-heuristic engine list in the old CLAUDE.md (`AIExtractionReasonerEngine`,
`CADCorpusIngestionEngine`, `BlueprintCorpusHarvestEngine`, etc.) is PATHS.md false-positive noise —
those engines are NOT pdf-corpus-owned. Do not use that list.

---

## §3 — Dispatcher quick-ref

**MCP-down fallback:** `python scripts/extract-jm-die-corpus-page-by-page.py --input <pdf> --output <jsonl>`

| Dispatcher | Action | Use |
|------------|--------|-----|
| `prism_dev` | `pdf_pipeline_classify` | Classify PDF source type before extraction |
| `prism_dev` | `pdf_pipeline_extract` | Run extraction pipeline on classified PDF |
| `prism_dev` | `pdf_pipeline_read` | Read pipeline status / output |
| `prism_dev` | `pdf_pipeline_summary` | Summarize pipeline run results |
| `prism_dev` | `pdf_highlights_extract` | Extract highlights/annotations from a PDF |
| `prism_doc_learn` | `doc_upload` | Register a new PDF for knowledge extraction |
| `prism_doc_learn` | `doc_extract` | Run extraction on a registered document |
| `prism_doc_learn` | `doc_list` / `doc_get` / `doc_delete` | Manage document registry |
| `prism_resource_extraction` | `archive_discover` / `archive_analyze` | Discover + analyze archive PDFs |
| `prism_resource_extraction` | `ocr_process` / `ocr_stats` | OCR fallback for scanned pages |
| `prism_resource_extraction` | `drawing_extract` / `drawing_summary` | 2D drawing extraction |
| `prism_resource_extraction` | `classify_dark` / `dark_report` | Classify/report unreadable content |
| `prism_resource_extraction` | `log_harvest` / `log_alarms` | Harvest log/alarm pages from manuals |
| `prism_resource_extraction` | `coordinate_register` / `coordinate_claim` | Multi-slot work-queue coordination |

`prism_resource_extraction` has **14 actions** (verified `resourceExtractionDispatcher.ts:31-46`,
2026-06-13). The 21-action claim in the old MEMORY.md is WRONG — do not repeat it.

---

## §4 — Canonical constants + data paths

**NEVER inline notability weights** — reference `NOTABLE_CONFIG` in
`scripts/extract-jm-die-corpus-page-by-page.py`. The canonical notability floor is **0.4** (pages
below this score — TOC, blank, cover — are skipped; ~22% of corpus). Do not re-derive or override.

**NEVER full-read the Docustrata index** (`Docustrata/.index/jm-die-index-v2.json`, 66.2M rollup) —
search via `manifest.json` or `prism_resource_extraction:archive_discover`.

| Resource | Path |
|----------|------|
| Reference PDF trove (CAM/machine manuals) | `H:/PRISM/resources/PDF` |
| Additional reference PDFs | `H:/PRISM/resources/RESOURCE PDFS` |
| Okuma-specific PDF manuals | `H:/PRISM/resources/OKUMA MULTUS PDFS` |
| Business/order doc index (do NOT re-OCR) | `H:/PRISM/Docustrata/manifest.json` |
| Canonical page-level output (gitignored) | `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` |
| Per-PDF catalog (gitignored) | `mcp-server/data/tribal/jm-die-corpus.jsonl` |
| Canonical pypdf extractor (LIMA method) | `scripts/extract-jm-die-corpus-page-by-page.py` |
| Already-indexed JM Die corpus | `mcp-server/data/jm-die-database/` (38,251 files) |

---

## §5 — Domain gotchas / safety rails

1. **Notability floor is 0.4 — do not skip it.** Pages below threshold are intentionally excluded.
   Bypassing the floor inflates the corpus with noise (TOC/blank pages) that pollutes downstream tribal.
2. **Page-count verification is mandatory.** Every extraction run must assert
   `extracted_pages == pdf.page_count`. A mismatch is a hard stop, not a warning.
3. **Never overwrite existing tribal entries.** Always append-mode to `jm-die-corpus-pages.jsonl`.
   The file is gitignored but Golf hygiene preserves it — a truncation destroys months of extraction.
4. **Text-normalize before embedding.** Strip control chars + normalize unicode before sending page
   text to `nomic-embed-text`. Raw PDF text contains encoding artifacts that corrupt vector neighbors.
5. **OCR fallback is mandatory for image-mode pages.** Detect via `PDFStructureEngine` image-page
   flag; route to `prism_resource_extraction:ocr_process`. Silent skip = missing corpus entries.
6. **Never re-OCR already-indexed corpora.** `H:/PRISM/Docustrata` (257,992 files) is fully indexed
   at `Docustrata/.index/jm-die-index-v2.json`. Re-extraction wastes hours and duplicates entries.
7. **Provenance is mandatory on every emitted tribal entry.** Must include: `source_pdf`,
   `page_number`, `extraction_date`. No provenance = reject the entry (downstream tribal dedup fails).

---

## §6 — What NOT to do (domain refuses)

- **NEVER use `scripts/pdf-parse-extract.mjs` for page-level extraction** — heading-anchor only,
  yields 115 rows vs 8,752 (76x inferior). Always use `scripts/extract-jm-die-corpus-page-by-page.py`.
- **NEVER re-OCR Docustrata or `mcp-server/data/jm-die-database/`** — already indexed; re-extraction
  duplicates entries and wastes GPU hours.
- **NEVER emit a tribal entry without provenance** (`source_pdf` + `page_number` + `extraction_date`).
- **NEVER inline notability weights** in new code — reference `NOTABLE_CONFIG` in the extractor script.
- **NEVER claim `prism_resource_extraction` has 21 actions** — it has 14 (verified 2026-06-13).
- **NEVER treat the old PATHS.md keyword-match engine list as ground truth** — it contains false
  positives (`CADCorpusIngestionEngine`, `BlueprintCorpusHarvestEngine`, etc.) that are NOT owned here.
- **NEVER work in this galaxy without claiming a slot-task-claim** — fleet-managed = no persistent
  lock; two slots racing on `jm-die-corpus-pages.jsonl` will corrupt the append-only file.

---

## §7 — Domain workflow / pipeline contract

```
Step 1 — classify
  prism_dev:pdf_pipeline_classify { source: "<abs-path>" }

Step 2 — page-by-page extraction (canonical: lima pypdf)
  python scripts/extract-jm-die-corpus-page-by-page.py \
    --input <pdf-path> \
    --output mcp-server/data/tribal/jm-die-corpus-pages.jsonl \
    --notability-floor 0.4
  → verify extracted_pages == pdf.page_count (hard stop on mismatch)

Step 3 — OCR fallback (image-mode pages only, detected by PDFStructureEngine)
  prism_resource_extraction:ocr_process { filePath: "<abs-path>" }

Step 4 — read / summarize
  prism_dev:pdf_pipeline_read  →  prism_dev:pdf_pipeline_summary

Step 5 — after PDF corpus exhausted, shift to JM machine manuals
  (alarm books, parts books, kinematics) per [[feedback_jm_machine_extraction_after_pdf_exhaustion]]
```

---

## §8 — Tribal + corpus pointers

- **Wiki:** `knowledge/wiki/pdf-corpus` (query before re-deriving corpus coverage)
- **JM Die corpus:** accessed via `prismSelfAwarenessEngine.getJMDieCustomerPath()` —
  NEVER `Glob` the 24,545-file tree directly.
- **Canonical pypdf rule:** `knowledge/memories/feedback/feedback_use_lima_pypdf_page_extractor.md`
- **JM machine extraction rule:** `knowledge/memories/feedback/feedback_jm_machine_extraction_after_pdf_exhaustion.md`
- **Extractor path reference:** `knowledge/memories/reference/reference_xray_pypdf_canonical_extractor_path.md`
- **Tribal capture rule:** use `prism_knowledge:tribal_capture slot=<nato>` — NEVER write
  `knowledge/tribal/*.md` directly (auto-overwritten on next sync).
- **tribal-by-domain-inject regression:** adding domains to `DOMAIN_MAP` in `tribal-rerank.mjs` can
  zero out tribal tips for those slots if `getDomainTokens()` routing returns empty. Verify non-empty
  before wiring. (`reference_tribal_domain_map_premise_false_2026_06_01`)

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge / note |
|-----------|--------|---------------|
| RECEIVES from → | `knowledge-conversion` | 6-node router produces raw PDFs → pdf-corpus ingests. If knowledge-conversion router is broken, pdf-corpus receives malformed input — check there first. |
| PRODUCES to → | `mit-curriculum` | Raw PDF availability under `H:/PRISM/resources/PDF`; verify resource root is mounted before mit-curriculum reports "no PDFs found." |
| PRODUCES to → | `academy` | `jm-die-corpus-pages.jsonl` is academy training data source — truncation here = stale academy corpus. |
| PRODUCES to → | `post-processor` | POST-PDF-NODE pipeline (echo's POST-PDF-NODE-MS0) consumes this corpus — breakage shows as missing wiki entries, not extraction errors. |
| SIBLING | `pdf-corpus-mill` | Mill-specific extraction subset — symmetric split; pdf-corpus owns the generalist pipeline, pdf-corpus-mill owns mill-domain PDFs. |

---

## §10 — Closed-loop integration (india)

On extraction completion: `xproc_outcome_publish { slot: '<active-nato>', domain: 'pdf-corpus' }` // UNVERIFIED action name — grep `xproc_outcome_publish` in dispatcher source before calling.
Tribal capture: `prism_knowledge:tribal_capture` after every batch run. Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
# Domain-filtered unit tests
cd mcp-server && rtk npx vitest run -t "PDF|Pypdf|Corpus"

# Extractor smoke test (no MCP required)
python scripts/extract-jm-die-corpus-page-by-page.py \
  --input <any-pdf> --output /tmp/smoke-test.jsonl --notability-floor 0.4 --limit 5
```

---

## §12 — Known bugs / open threads

- **SOUL.md `refuses` §5/6/7 were stubs** in the original CLAUDE.md (labelled explicitly `STUB — Per R12 lima refines`). Filled by this rewrite; lima or any fleet slot should validate invariants against live extraction run.
- **tribal pointer was wrong:** old file pointed to `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md` (post-processor doc, not pdf-corpus). Removed.
- **Open:** lima PSN leg (academy consumer) was marked red (`getDomainTokens(lima)` returned garbage in the routing chain). Verify `prism_knowledge:tribal_capture slot=lima` is green before extraction targeting academy. (`reference_lima_tribal_routing_chain_2026_05_29`)

---

## §13 — AI / reasoning surface

```bash
# Galaxy reasoning bridge (local, $0)
node scripts/lib/galaxy-reasoning-bridge.mjs pdf-corpus "<question>"
```

Ollama routing: summarize an extracted page → `gpt-oss:20b`; OCR/VLM on scanned page → VLM ensemble;
lint extractor code → `qwen2.5-coder:32b`; deep domain reasoning → `gpt-oss:120b`.
