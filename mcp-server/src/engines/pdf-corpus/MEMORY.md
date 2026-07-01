# pdf-corpus Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="pdf corpus" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:pdf-corpus]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/pdf-corpus_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Rule (user directive, 2026-05-26):** For all PDF→tribal-knowledge ingestion, use Lima's pypdf page-by-page extractor instead of pdf-parse-extract.mjs [feedback/feedback_use_lima_pypdf_page_extractor].
- After exhausting the PDF corpus, focus on JM-related machines extensively, including manuals, alarm books, parts books, and kinematics [feedback/feedback_jm_machine_extraction_after_pdf_exhaustion].
- The canonical multi-print pypdf extractor is a Python script located at `scripts/extract-jm-die-corpus-page-by-page.py` [reference/reference_xray_pypdf_canonical_extractor_path].
- Lima's pypdf page-by-page extractor is consistently used for PDF→tribal-knowledge ingestion due to its superior performance over other methods [feedback/feedback_use_lima_pypdf_page_extractor], [reference/reference_lima_pypdf_extraction_canonical_2026_05_26].
- The extraction process involves converting PDFs into page-level entries and embedding them into the tribal-embed-index, which includes various types of documents like manuals, alarm books, parts books, and kinematics [feedback/feedback_jm_machine_extraction_after_pdf_exhaustion], [reference/reference_jm_die_curriculum_pipeline_2026_05_26].
- The tribal-by-domain-inject hook surfaces top-3 tribal entries on every prompt, keyed on the active chat-slot's milestone domain via tribal-rerank.mjs [reference/reference_tribal_by_domain_inject].

## Indexed memories
- **Domain corpus (live counts):** 33 curated memory file(s) · 129 wiki entr(y/ies) · 24 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 24 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="pdf-corpus" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/reference_f2_pdf_highlights_wire_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_misc_tasks_extraction_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_u_ms1_u2_pdf_blueprint_pattern_rescue.md` · `knowledge/memories/reference/reference_cad_cam_pdf_extraction_2026_05_26.md` · `knowledge/memories/reference/reference_catalog_extraction_pipeline_gap_2026_05_31.md`
- **Sample wiki:** `knowledge/wiki/os/commands/pdf-learn.md` · `knowledge/wiki/os/commands/pdf-process.md` · `knowledge/wiki/lessons/pdf-extract-basic-3d-machining.md` · `knowledge/wiki/lessons/pdf-extract-big-daishowa-high-performance-tooling-solutions-vol-5.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/milling/milling-pdf-corpus.md` · `knowledge/wiki/code-tribal/learnings/cad-cam-resources-index-u-pdf-domain-wire.md` · `knowledge/wiki/code-tribal/learnings/db-expansion-u-catalog-extraction-router.md`

## Cross-galaxy bridges
- **knowledge-conversion** (`engines/knowledge-conversion/`) — produces raw PDFs into the 6-node router; symmetric edge per CLAUDE.md.
- **pdf-corpus-mill** (`engines/pdf-corpus-mill/`) — mill-specific extraction subset.
- **mit-curriculum** — consumes raw PDFs as course source corpus.
- **academy** — consumes extracted pages as training data.
- **post-processor** — echo's POST-PDF-NODE pipeline consumes the corpus (wiki: `code-tribal/learnings/post-pdf-node-ms0-*`).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- Verification caught a regression where adding speed-feed/database/business to tribal-by-domain-inject DOMAIN_MAP would have zeroed those slots' tribal tips; this needs further investigation or correction [reference/reference_tribal_domain_map_premise_false_2026_06_01].
- The academy Tribal PSN leg is marked as 🔴 due to issues in the routing chain, specifically with getDomainTokens(lima) yielding garbage [reference/reference_lima_tribal_routing_chain_2026_05_29].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
PDF ingestion + page-level corpus extraction: turning the JM-Die TRIBAL/WIKI PDF library and the `resources/PDF` reference trove into structured, domain-tagged, page-level tribal entries that train the rest of the fleet. The canonical method is lima's pypdf page-by-page extractor — page text → notability score → domain classification → JSONL — NOT heading-anchor parsing (`feedback_use_lima_pypdf_page_extractor.md`). Downstream consumers (academy, mit-curriculum, post-processor) read the emitted corpus rather than re-extracting.

## Key engines & paths
Real PDF engines under `mcp-server/src/engines/` (verified on disk + ENGINE_DIGEST.md):
- `PDFProcessingPipelineEngine.ts` — PDF processing pipeline (digest "SQ2-1-PDF"); backs `prism_dev` pdf_pipeline actions.
- `PDFSourceRegistryEngine.ts` — PDF source registry (wiki: `engines/pdf/pdfsourceregistryengine.md`).
- `PDFStructureEngine.ts` — page/structure model (graph: L6/built).
- `PDFTableExtractionEngine.ts` — table extraction (wiki: `engines/pdf/pdftableextractionengine.md`).
- `PDFHandbookBatchProcessorEngine.ts` — handbook batch processor (wiki: `engines/knowledge/pdfhandbookbatchprocessorengine.md`).
- `PDFHighlightExtractorEngine.ts` — highlight extraction (graph: L5/built; backs `pdf_highlights_extract`).
- `PDFFormulaExtractionEngine.ts`, `PDFMaterialPropertyExtractionEngine.ts`, `PDFBlueprintDimensionExtractorEngine.ts`, `PDFBlueprintPatternRescueEngine.ts` — formula/material/blueprint extractors (ENGINE_DIGEST.md lines 1982-1988).

Dispatcher actions (verified in `mcp-server/src/tools/dispatchers/devDispatcher.ts`):
- `prism_dev:pdf_pipeline_classify` · `prism_dev:pdf_pipeline_extract` · `prism_dev:pdf_pipeline_read` · `prism_dev:pdf_pipeline_summary` · `prism_dev:pdf_highlights_extract` (cases at lines 1877-1909).
- `prism_doc_learn` (documentLearningDispatcher, 5 actions) — upload PDFs/notes/articles for knowledge extraction.
- `prism_resource_extraction` (resourceExtractionDispatcher, 21 actions) — archives / OCR / drawings extraction pipeline.
- `prism_export:render-pdf` (exportDispatcher) — PDF render output side.

Canonical extractor script (this tree): `scripts/extract-jm-die-corpus-page-by-page.py` — pypdf, ease-first queue order, page-level JSONL with notability + domain tags.

## Standing patterns / invariants
- **Use lima's pypdf page extractor (CANONICAL, fleet-wide).** All PDF→tribal ingestion uses `scripts/extract-jm-die-corpus-page-by-page.py`, NOT `scripts/pdf-parse-extract.mjs` (heading-anchor only). Empirical: 8,752 page-level entries from 73 PDFs / 11,160 pages vs 115 rows — ~76× deeper. (`feedback_use_lima_pypdf_page_extractor.md`)
- **No claim without provenance.** Every emitted tribal entry cites source PDF + page number + extraction date (lima soul, in the script header).
- **Notability floor.** Pages scored 0.0-1.0; skip below 0.4 (filters ~22% TOC/cover/blank). Scoring detail lives in the feedback memory + `NOTABLE_CONFIG` in the script — do not re-invent the weights.
- **Do NOT re-OCR the indexed corpora.** `H:/PRISM/Docustrata` (257,992 files) and `H:/PRISM/JM DIE` are already indexed/consolidated into `mcp-server/data/jm-die-database/` — search the manifest/index, never re-extract (PATHS.md critical-resource-roots block).
- **Never inline physics/material constants** when extracting formula/material pages — reference `mcp-server/src/physics/constants.ts` (CLAUDE.md §SAFETY).
- **Outputs are gitignored + regenerable.** `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` + `jm-die-corpus.jsonl` are derived artifacts; golf hygiene preserves them on disk.

## Known assets
- Corpus outputs (verified on disk): `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (page-level entries) · `mcp-server/data/tribal/jm-die-corpus.jsonl` (per-PDF catalog).
- Domain resource roots (PATHS.md): `H:/PRISM/resources/PDF` · `resources/RESOURCE PDFS` · `resources/OKUMA MULTUS PDFS` · `Docustrata/manifest.json`.
- Wiki: `knowledge/wiki/architecture/domain-pdf.md` (engine-only domain `pdf`) · `engines/dev/pdfprocessingpipelineengine.md` · `engines/pdf/{pdfsourceregistryengine,pdftableextractionengine,pdfformulaextractionengine}.md` · `architecture/f2-pdf-highlights-wire.md` · pipeline action pages `actions/dev/pdf-pipeline-{extract,classify,read,summary}.md` · per-PDF lesson leaves `lessons/pdf-extract-*.md`.
- OS commands: `knowledge/wiki/os/commands/pdf-learn.md` · `pdf-process.md` (skills `/pdf-learn`, `/pdf-process`).
- Memory: `feedback_use_lima_pypdf_page_extractor.md` (CANONICAL) · `reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26.md` (the deprecated pdf-parse pipeline) · `reference_jm_die_lima_page_extraction_2026_05_26.md`.

## Cross-galaxy edges
- **knowledge-conversion** (`engines/knowledge-conversion/`) — produces raw PDFs into the 6-node router; symmetric edge per CLAUDE.md.
- **pdf-corpus-mill** (`engines/pdf-corpus-mill/`) — mill-specific extraction subset.
- **mit-curriculum** — consumes raw PDFs as course source corpus.
- **academy** — consumes extracted pages as training data.
- **post-processor** — echo's POST-PDF-NODE pipeline consumes the corpus (wiki: `code-tribal/learnings/post-pdf-node-ms0-*`).

## Cross-refs
[`./CLAUDE.md`](CLAUDE.md) · [`./PATHS.md`](PATHS.md) · [`./TOOLBELT.md`](TOOLBELT.md) · parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
pypdf page-by-page extraction corpus (the lima pypdf extractor is canonical).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/pdf-corpus/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [pypdf documentation](https://pypdf.readthedocs.io/)
- [Tesseract OCR documentation](https://tesseract-ocr.github.io/)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
