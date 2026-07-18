# corpus-aggregation Galaxy — fleet-managed (kilo de-facto)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = corpus-aggregation domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** multi-source corpus aggregation — PDF + MIT-OCW + web + tribal + customer-program corpora unified into a single retrievable substrate. Feeds: academy course-builder, mit-curriculum extraction, NN/GNN training pipelines.

**EXCLUDES:** PDF text extraction logic → pdf-corpus / pdf-corpus-mill; MIT course parsing → mit-curriculum; tribal tip writes → tribal-knowledge; NN/GNN model training → ai-training (india); academy course assembly → academy (lima).

**Slot:** fleet-managed — NO dedicated slot. kilo (de-facto via `learn-corpus` / `corpus-harvest-*` skills). Any slot may work here; claim via `/pick-unit` + heartbeat before starting a harvest.

**Worktree:** use your own slot worktree (`H:/prism-slot-<nato>` / `slot/<nato>`); commit `[CORPUS-AGGREGATION-MS#]/U-ID: title`. Check `prism_resource_harvester:harvest_status` before starting a new harvest to avoid duplicate runs.

---

## §2 — Verified engines

No local `.ts` engine files live under `mcp-server/src/engines/corpus-aggregation/` — the galaxy is a meta-domain; engines live in the top-level engines dir.

| Role | Engine file (verified `mcp-server/src/engines/`) |
|------|--------------------------------------------------|
| Harvest pipeline orchestrator | `HarvestPipelineEngine.ts` |
| File-type routing to domain ingesters | `IngestionOrchestratorEngine.ts` |
| Knowledge ingestion orchestrator | `KnowledgeIngestionOrchestratorEngine.ts` |
| Unified knowledge ingestion pipeline | `ContentIngestionPipelineEngine.ts` |
| Unified query across 28 SOURCE_FILE_CATALOGs | `SourceCatalogAggregator.ts` |
| Tribal corpus orchestration | `TribalCorpusOrchestratorEngine.ts` |
| Blueprint/print corpus orchestration | `PrintCorpusOrchestratorEngine.ts` |
| JM Die training corpus (U-LEARN-03) | `JMDieTrainingCorpusEngine.ts` |
| Docustrata document ingest | `JMDieDocustrataIngestEngine.ts` |
| Fleet-wide JM Die ingest | `JMDieFleetWideIngestEngine.ts` |
| CAD training corpus (CAD-COMPLETE-MS0/U-CADC17) | `CADTrainingCorpusOrchestratorEngine.ts` |
| CAM extraction aggregator | `CAMTrainingExtractionAggregatorEngine.ts` |
| Speed/feed data aggregator (statistical analysis) | `ProvenSpeedFeedAggregatorEngine.ts` |

Per-process tribal engines (verified): `GrindingTribalCorpusEngine.ts`, `SinkerEDMTribalCorpusEngine.ts`, `WeldingTribalCorpusEngine.ts`, `AdditiveManufacturingTribalCorpusEngine.ts`, `LaserCuttingTribalCorpusEngine.ts`, `WaterjetCuttingTribalCorpusEngine.ts`.

---

## §3 — Dispatcher quick-ref

| Dispatcher | Key corpus-aggregation actions | Source (verified) |
|------------|-------------------------------|-------------------|
| `prism_resource_harvester` | `scan_folder`, `classify_file`, `get_index`, `start_harvest`, `harvest_status`, `harvest_resume` | `resourceHarvesterDispatcher.ts:38–43` |
| `prism_resource_harvesting` | `harvest_scan`, `harvest_start`, `harvest_status` | `resourceHarvestingDispatcher.ts:31–33` |
| `prism_knowledge` | `corpus_harvest_mit`, `corpus_harvest_vendor`, `corpus_harvest_online` | `knowledgeDispatcher.ts:163–165` |
| `prism_cad` | `cad_corpus_orchestrate`, `cad_corpus_scan`, `cad_corpus_ingest`, `cad_corpus_load_manifest`, `cad_corpus_find_by_class`, `cad_corpus_status` | `cadDispatcher.ts:195,226` |
| `prism_cad_automation` | `cad_corpus_classify`, `cad_corpus_ingest`, `cad_corpus_scan_only`, `cad_corpus_orchestrate` | `cadAutomationDispatcher.ts:331,455` |
| `prism_data` | `database_search`, `database_list`, `globalSearch` | runtime — KnowledgeDB registered |
| `prism_memory` | `semantic_search` | recall before re-deriving |

**MCP-down fallback:** `node scripts/ask-ollama.mjs summarize <corpus-dir>` for local batch summarization; `python scripts/extract-jm-die-corpus-page-by-page.py` for PDF extraction.

---

## §4 — Canonical constants + data paths

- **NEVER inline physics/cutting constants** — import from `mcp-server/src/physics/constants.ts`. Aggregators carry provenance (vendor + pdf + page); never hardcode `vc`, `fz`, `kc1.1` values.
- **Docustrata index** — `H:/PRISM/Docustrata/.index/*.jsonl` + `manifest.json`. NEVER full-read; query via `prism_data:database_search`.
- **Resource harvest index** — cached manifest via `prism_resource_harvester:get_index`. NEVER re-scan from scratch when the cached index is fresh.
- **SourceCatalogAggregator** — unified query across 28 `SOURCE_FILE_CATALOG` exports (`SourceCatalogAggregator.ts:2`). Use it before writing a new per-engine catalog search.
- **Tribal tip store** — 3,920 tips / 73 categories via `prism_memory:semantic_search`; do NOT write to `knowledge/tribal/*.md` directly (auto-overwritten).

---

## §5 — Domain gotchas / safety rails

1. **Cutting data must have a reference oracle before persist.** `scripts/extract-generic-catalog.py` mis-parses vendor PDFs and can silently poison `cutting_data` stores — a safety violation downstream in speed-feed. Every `[tool, material_iso, vc/fz]` tuple must be validated against a known reference before writing to any store. Source: `reference_catalog_extraction_pipeline_gap_2026_05_31.md`.
2. **PDF extraction depth trap.** `pdf-parse` (npm) yields shallow text; `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) is 76× deeper and domain-tagged. Use only the pypdf canonical extractor for corpus harvest.
3. **Harvest idempotency.** Always call `prism_resource_harvester:harvest_status` or `prism_resource_harvesting:harvest_status` before starting a new harvest — a parallel duplicate run corrupts the in-progress manifest.
4. **Engine name noise.** The PATHS.md 46-engine keyword-match list includes false positives (`FiveAxisAggregatorEngine`, `HermesParallelVerdictAggregatorEngine`, `CrossProcessFedAvgAggregatorEngine` — these aggregate other things, not corpus data). Verify any engine name by reading its file header before citing. `// UNVERIFIED` if not checked.
5. **Online corpus is lowest trust.** `corpus_harvest_online` output requires human validation gate before any model-training use; never auto-persist online-harvested data without a review step.
6. **Loop tick discipline.** Every `/loop` corpus-ingest iteration MUST call `loop-state tick`; without it, `/compact` strands the progress count and the loop restarts from zero.

---

## §6 — What NOT to do (domain refuses)

- **NEVER persist extracted cutting data without a reference oracle.** Silent data poisoning propagates to speed-feed physics and is a safety violation.
- **NEVER re-OCR Docustrata.** Already indexed at `H:/PRISM/Docustrata/.index/`. Query the index; do not re-run OCR.
- **NEVER re-scan resource folders from scratch** when `prism_resource_harvester:get_index` can return the cached manifest.
- **NEVER use pdf-parse (npm) for PDF corpus harvest.** Use `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf canonical — 76× deeper, domain-tagged per `feedback_use_lima_pypdf_page_extractor.md`).
- **NEVER write to `knowledge/tribal/*.md` directly** — auto-overwritten; use `prism_knowledge:tribal_capture slot=<nato>`.
- **NEVER cite `FiveAxisAggregatorEngine`, `HermesParallelVerdictAggregatorEngine`, or `CrossProcessFedAvgAggregatorEngine` as corpus-aggregation engines** — they are name-match noise from PATHS.md keyword heuristics; read the file header before using any name from that list.
- **After PDF corpus exhaustion, cover JM-machine corpora next** — do not pivot to web/synthetic data; ground truth is in the JM Die archive first (`feedback_jm_machine_extraction_after_pdf_exhaustion.md`).

---

## §7 — Domain workflow / pipeline contract

Stage order for every corpus build or refresh:

```
SCAN → CLASSIFY → INGEST → AGGREGATE → VALIDATE → SERVE
```

| Stage | Dispatcher action(s) |
|-------|----------------------|
| SCAN | `prism_resource_harvester:scan_folder` · `prism_resource_harvesting:harvest_scan` |
| CLASSIFY | `prism_resource_harvester:classify_file` · `prism_cad_automation:cad_corpus_classify` |
| INGEST | `prism_resource_harvester:start_harvest` → `harvest_status` → `harvest_resume` · `prism_cad_automation:cad_corpus_ingest` · `prism_knowledge:corpus_harvest_mit` / `corpus_harvest_vendor` / `corpus_harvest_online` |
| AGGREGATE | `SourceCatalogAggregator.ts` — unified query across all 28 SOURCE_FILE_CATALOG exports |
| VALIDATE | reference-oracle check before any cutting-data persist (see §5 gotcha #1) |
| SERVE | `prism_data:database_search` · `database_list` · `globalSearch` |

**Loop patterns:** corpus ingest `/loop` (zero-drop streaming, tick every iteration); coverage-audit `/loop` (periodic re-scan against known manifest). Write findings to `knowledge/memories/patterns/corpus-aggregation_synthesis.md` after any significant aggregation pass.

---

## §8 — Tribal + corpus pointers

**Data source priority (ground-truth order):**
1. `H:/PRISM/JM DIE/` — real-shop ground truth (programs, tribal, wiki; 38,251 indexed files). Access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER `Glob` the 38K-file tree.
2. `H:/PRISM/resources/PDF` + `resources/RESOURCE PDFS` — vendor manuals, catalogs, MIT-OCW.
3. `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/` — 242 vendor catalog PDFs (extraction pipeline has known cutting-data gap — see §5 gotcha #1; do not auto-persist).
4. `H:/PRISM/Docustrata/.index/` — business/order corpus (already indexed; do not re-OCR).
5. Online (`corpus_harvest_online`) — lowest trust; requires human validation gate.

**Wiki entries (query before re-deriving):**
- `knowledge/wiki/corpus-aggregation/` — 4 entries
- `knowledge/wiki/training/cad-corpus-index.md`
- `knowledge/wiki/training/cam-corpus-index.md`
- `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md`
- `knowledge/wiki/reference/tribal-knowledge-access---jm-die-test-shop---3-700--machinist-tips.md`

**Specs:** `state/shared/specs/DATA-EXTRACTION-UTILIZATION-MASTERPLAN.md`

**PDF extraction canonical:** `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf, 76× deeper than pdf-parse, domain-tagged).

**Synthesis brain:** `knowledge/memories/patterns/corpus-aggregation_synthesis.md`

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| corpus-aggregation → | **academy** (lima) | aggregated corpus → course content substrate |
| corpus-aggregation → | **ai-training** (india) | aggregated corpus → NN/GNN training input |
| ← component | **pdf-corpus** (fleet) | raw PDF extraction feeds INGEST stage |
| ← component | **mit-curriculum** (fleet) | MIT-OCW parsed content feeds INGEST stage |
| ← component | **tribal-knowledge** (fleet) | tribal tip store feeds AGGREGATE stage |

---

## §10 — Closed-loop integration (india)

On any significant corpus harvest or coverage audit: call `xproc_outcome_publish {slot:'<nato>', domain:'corpus-aggregation'}` // UNVERIFIED — grep `knowledgeDispatcher.ts` to confirm action name before use.  
Tribal capture: `prism_knowledge:tribal_capture slot=<nato>` for any new corpus-domain insight. Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "corpus|harvest|ingest|aggregat"
# Pure-node health (no server required):
node scripts/ask-ollama.mjs summarize "H:/PRISM/resources/PDF" 2>/dev/null || echo "Ollama offline"
```

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs corpus-aggregation "<question>"
```

Ollama routing: batch corpus summarization / dedup → `gpt-oss:20b`; engine/ingest code lint → `qwen2.5-coder:32b`; deep domain reasoning (extraction strategy, trust hierarchy) → `gpt-oss:120b`. Embed via `nomic-embed-text`.  
AI-systems fleet state: `knowledge/memories/patterns/ai-systems-fleet-state.md`.

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs corpus-aggregation "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/corpus-aggregation_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
