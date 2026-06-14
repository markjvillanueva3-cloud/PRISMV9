# corpus-aggregation Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="corpus aggregation" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:corpus-aggregation]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/corpus-aggregation_synthesis.md` (qwen2.5-coder:7b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Data Source Management**: Decisions are made on which data sources to prioritize for harvesting (e.g., `[reference/reference_echo_post_data_corpus_paths]`, `[reference/reference_mit_courses_goal_scope_handoff_2026_05_23]`).
- **Post-Processor Data Corpus**: The post-processor data corpus is managed through formulas like `[reference/node_formula_formula_adjusted_caddispatcher_action_cad_corpus_ingest]` and `[reference/node_formula_formula_adjusted_cadautomationdispatcher_action_cad_corpus_classify]`.
- **Training Regimen Catalog**: A comprehensive catalog for training regimens (e.g., `[reference/reference_wedm_training_regimen_catalog_2026_05_31]`) is maintained to ensure consistent and reusable training materials.
- **Harvesting and Ingestion**: Multiple formulas (e.g., `[reference/node_formula_formula_adjusted_caddispatcher_action_corpus_harvest_mit]`, `[reference/node_formula_formula_adjusted_caddispatcher_action_corpus_harvest_online]`) involve extracting data from various sources into a unified corpus.
- **Corpus Classification and Scan**: Formulas like `[reference/node_formula_formula_adjusted_cadautomationdispatcher_action_cad_corpus_classify]` and `[reference/node_formula_formula_adjusted_cadautomationdispatcher_action_cad_corpus_scan_only]` handle the classification and scanning of CAD/CAM data.

## Indexed memories
- **Domain corpus (live counts):** 98 curated memory file(s) · 392 wiki entr(y/ies) · 759 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 1172 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="corpus-aggregation" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/reference_f2_pdf_highlights_wire_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_post_ship_system-viz-brain-ms0-u-p1-tribal-by-domain-inject.md` · `knowledge/memories/_legacy-root/reference_tribal_by_domain_inject.md` · `knowledge/memories/_legacy-root/reference_tribal_enrichment_engine_bug.md` · `knowledge/memories/_legacy-root/reference_tribal_graph_ms0_content_mine.md`
- **Sample wiki:** `knowledge/wiki/training/cad-corpus-index.md` · `knowledge/wiki/training/cam-corpus-index.md` · `knowledge/wiki/reference/tribal-knowledge-access---jm-die-test-shop---3-700--machinist-tips.md` · `knowledge/wiki/os/commands/cad-corpus.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/cimco-verification-tribal.md` · `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md` · `knowledge/wiki/code-tribal/tribal-bc-001.md`

## Cross-galaxy bridges
- **pdf-corpus** (component) — PDF extraction corpus input.
- **mit-curriculum** (component) — MIT-OCW course source corpus.
- **tribal-knowledge** (component) — tribal-tip store.
- **academy** (consumer) — course-builder consumes the aggregated substrate.
- **ai-training (india)** (`engines/ai-training/`) — symmetric: produces aggregated corpus → NN/GNN training input.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **PDF Corpus Exhaustion**: After PDF corpus exhaustion, the need to cover JM-related machines extensively (e.g., `[feedback/feedback_jm_machine_extraction_after_pdf_exhaustion]`).
- **Domain-Aware Corpus**: The development of a domain-aware corpus for PSN-OCTOPUS-FLEET-SYNERGY-MS0 P1 (e.g., `[reference/reference_octopus_domain_aware_corpus_2026_05_31]`) and its integration into the existing framework.
- **Blueprint Corpus Harvest**: The ongoing effort to harvest and manage blueprint corpus data (e.g., `[reference/reference_india_ms1_u6_blueprint_corpus_harvest_2026_05_29]`).

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
Multi-source corpus harvest + ingestion + aggregation: scan resource folders, classify files, and route them to domain-specific ingesters that unify PDF / MIT-OCW / web-blueprint / tribal / customer-program corpora into a single retrievable substrate. The aggregated substrate feeds the academy course-builder, mit-curriculum extraction, and the NN/GNN training pipelines (see `CLAUDE.md` §Scope). De-facto owning slot: kilo (`learn-corpus`, `corpus-harvest-*` skills, per `CLAUDE.md`).

## Key engines & paths
Engine sources under `mcp-server/src/engines/` (name-matched in `PATHS.md`, descriptions from `data/docs/ENGINE_DIGEST.md`):
- `HarvestPipelineEngine.ts` — "Orchestrates per-type harvesting from scanned resources" (engine dep of `resourceHarvesterDispatcher`).
- `IngestionOrchestratorEngine.ts` — "Route scanned files to domain-specific engines".
- `KnowledgeIngestionOrchestratorEngine.ts` — knowledge-ingestion orchestrator (digest line cites the source path).
- `ContentIngestionPipelineEngine.ts` — "Unified Knowledge Ingestion Pipeline".
- `TribalCorpusOrchestratorEngine.ts` · `PrintCorpusOrchestratorEngine.ts` · `PrintCorpusTableWriter.ts` — tribal + print corpus orchestration / table emit.
- `JMDieTrainingCorpusEngine.ts` — "U-LEARN-03" JM Die training corpus.
- `CADTrainingCorpusOrchestratorEngine.ts` — "CAD-COMPLETE-MS0/U-CADC17".
- `CAMTrainingExtractionAggregatorEngine.ts` · `ProvenSpeedFeedAggregatorEngine.ts` — domain extraction aggregators ("Aggregate extracted S/F data by material/operation/tool with statistical analysis").
- `SourceCatalogAggregator.ts` — "Unified query interface for all 28 engine SOURCE_FILE_CATALOG exports".
- Per-process tribal corpus engines: `GrindingTribalCorpusEngine.ts`, `SinkerEDMTribalCorpusEngine.ts`, `LaserCuttingTribalCorpusEngine.ts`, `WaterjetCuttingTribalCorpusEngine.ts`, `WeldingTribalCorpusEngine.ts`, `AdditiveManufacturingTribalCorpusEngine.ts`.

Dispatcher actions (from `data/docs/DISPATCHER_DIGEST.md` + dispatcher sources):
- `prism_resource_harvester` (`resourceHarvesterDispatcher.ts`, 24 actions) — core actions `scan_folder`, `classify_file`, `get_index`, `start_harvest`, `harvest_status`, `harvest_resume` (engine deps `FolderScannerEngine`, `HarvestPipelineEngine`); plus JM Die mill-harvest + program-inventory action families.
- `prism_resource_harvesting` (`resourceHarvestingDispatcher.ts`, 8 actions) — automated harvesting pipeline: `harvest_scan`, `harvest_start`, …

## Standing patterns / invariants
- **Never fabricate cutting data (R12 / safety).** The catalog→`cutting_data` extraction pipeline is real in design but NOT production-ready: `scripts/extract-generic-catalog.py` mis-parses/crashes on the vendor corpus, so persisting it would poison a safety-critical store — REFUSED. Validate each `[tool, material_iso, vc/fz]` tuple against a known reference BEFORE persist. Source: `reference_catalog_extraction_pipeline_gap_2026_05_31.md`.
- **Never inline physics/cutting constants** — import from `mcp-server/src/physics/constants.ts` (project `CLAUDE.md` §SAFETY); aggregators carry provenance (vendor+pdf+page), they do not hardcode values.
- **Catalog PDFs stay un-ingested-by-design until a real-data validation oracle passes** — the durable cutting stores remain the trusted `.ts` + enricher path; loud-flag, never silently half-fill (`reference_catalog_extraction_pipeline_gap_2026_05_31.md`).
- **USE lima's pypdf page-by-page extractor (canonical)** for PDF corpus harvest — `feedback_use_lima_pypdf_page_extractor.md` (76× deeper than pdf-parse, domain-tagged).
- **Route before Grep · Ollama-offload before Claude · RTK on noisy bash** — token-lean patterns per `TOOLBELT.md`.

## Known assets
- Critical resource roots wired into this galaxy (`PATHS.md` critical-resource-roots block; owner juliett): `H:/PRISM/resources` (CAD/CAM/training/catalog/MIT-course trove; index `RESOURCES-INDEX.md`), `H:/PRISM/JM DIE` (test-shop ground truth + TRIBAL+WIKI corpus; consolidated `mcp-server/data/jm-die-database/`), `H:/PRISM/Docustrata` (ALREADY indexed — do NOT re-OCR; search `manifest.json` + `.index/`). Domain-relevant subset: `resources/PDF`, `resources/RESOURCE PDFS`, `JM DIE/TRIBAL + WIKI`, `Docustrata/.index`.
- Vendor catalog corpus: `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/` (242 PDFs) — see `reference_vendor_catalog_db_2026_05_31.md`, `reference_catalog_extraction_pipeline_gap_2026_05_31.md`.
- Wiki (`knowledge/wiki/index.md`): `[[CADCorpusIngester]]`, `[[JMDieTrainingCorpus]]`, `[[prism_resourceHarvester]]`, `[[prism_resourceHarvesting]]`, `[[dispatcher-resourceharvester]]` (24 actions), `[[dispatcher-resourceharvesting]]` (8 actions), `[[tribal-corpus-index]]` (3920 tips / 73 categories).
- Plan: `state/shared/specs/DATA-EXTRACTION-UTILIZATION-MASTERPLAN.md`.

## Cross-galaxy edges
From this galaxy's `CLAUDE.md` (§Cross-galaxy edges / §Related galaxies):
- **pdf-corpus** (component) — PDF extraction corpus input.
- **mit-curriculum** (component) — MIT-OCW course source corpus.
- **tribal-knowledge** (component) — tribal-tip store.
- **academy** (consumer) — course-builder consumes the aggregated substrate.
- **ai-training (india)** (`engines/ai-training/`) — symmetric: produces aggregated corpus → NN/GNN training input.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
PDF + MIT + tribal corpus aggregation -> academy/NN training input.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/corpus-aggregation/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [MIT OpenCourseWare](https://ocw.mit.edu/)
- [pypdf documentation](https://pypdf.readthedocs.io/)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
