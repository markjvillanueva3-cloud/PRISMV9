---
name: corpus-data-galaxies
description: Combined content-index digest for six thin corpus/data/process galaxies (corpus-aggregation, pdf-corpus, pdf-corpus-mill, mit-curriculum, tribal-knowledge, cad-fusion-live) that carry little-to-no dedicated engine code -- their substrate is corpus paths, extractor scripts, tribal stores, and live-session transport, not physics engines.
type: reference
galaxy: multi
node_type: memory
---

# corpus + data galaxies -- combined digest

These six galaxies are DATA and PROCESS galaxies, not engine clusters. Structurally,
all PRISM engines live FLAT in `mcp-server/src/engines/*.ts`; each `<galaxy>/` subdir holds
only doctrine files (CLAUDE.md / MEMORY.md / PATHS.md / SOUL.md / TOOLBELT.md). None of the
six owns a `.ts` engine INSIDE its own subdir -- every subdir returns empty for `**/*.ts`.
What each galaxy actually IS: a corpus of source files (PDFs, MIT-OCW exports, `.f3d` parts),
a set of extractor/harvest scripts, a JSONL/embed-index store, or a live-session transport
pattern. A few galaxies (tribal-knowledge, mit-curriculum) have a real cluster of
FLAT-root engines that serve the domain; the others (pdf-corpus-mill especially) own ZERO
engines and are pure filter/view/config over a parent. This digest reports the HONEST
owned-engine count per galaxy, sourced from each galaxy's verified CLAUDE.md (which cites
file:line and explicitly warns that PATHS.md keyword-match lists are false-positive noise).

Honest-count method note: a loose `ls *.ts | grep -iE '<keyword>'` at the flat root is
NOISY (it catches sensor-fusion, physics-fusion, rate-limit-course, etc.). The counts below
are the DOCTRINE-VERIFIED owned counts (per each galaxy's `sec 2 Verified engines`), with the
raw loose-grep number shown in parentheses to expose the gap.

---

## corpus-aggregation

Purpose: multi-source corpus harvest + ingestion + aggregation -- scan resource folders,
classify files, route them to domain-specific ingesters, and unify PDF / MIT-OCW /
web-blueprint / tribal / customer-program corpora into one retrievable substrate. Feeds the
academy course-builder, mit-curriculum extraction, and the NN/GNN training pipelines. De-facto
owning slot: kilo (via `learn-corpus` / `corpus-harvest-*` skills); no dedicated slot.

Dedicated engines (honest): ~13-20 FLAT-root orchestration engines serve this galaxy, but
ZERO live inside `engines/corpus-aggregation/` (config/doc galaxy only, per CLAUDE.md sec 2).
Loose grep `Corpus|Aggregat` returns 33 -- the CLAUDE.md explicitly flags names like
`FiveAxisAggregatorEngine`, `HermesParallelVerdictAggregatorEngine`,
`CrossProcessFedAvgAggregatorEngine` as keyword-match noise (they aggregate other things).
Verified-owned: `HarvestPipelineEngine`, `IngestionOrchestratorEngine`,
`KnowledgeIngestionOrchestratorEngine`, `ContentIngestionPipelineEngine`,
`SourceCatalogAggregator` (unified query across 28 SOURCE_FILE_CATALOG exports),
`TribalCorpusOrchestratorEngine`, `PrintCorpusOrchestratorEngine`, `JMDieTrainingCorpusEngine`,
`CADTrainingCorpusOrchestratorEngine`, `CAMTrainingExtractionAggregatorEngine`,
`ProvenSpeedFeedAggregatorEngine` + 6 per-process tribal corpus engines
(Grinding/SinkerEDM/Welding/Additive/Laser/Waterjet).

Data/corpus + scripts: dispatchers `prism_resource_harvester` (24 actions:
`scan_folder`/`classify_file`/`get_index`/`start_harvest`/`harvest_status`/`harvest_resume`) +
`prism_resource_harvesting` (8) + `prism_knowledge:corpus_harvest_{mit,vendor,online}`. Ground-truth
roots: `H:/PRISM/JM DIE` (38,251 indexed files), `H:/PRISM/resources/PDF`,
`resources/MANUFACTURER_CATALOGS/uploaded/` (242 vendor PDFs), `H:/PRISM/Docustrata/.index`
(already indexed -- do NOT re-OCR). Canonical PDF extractor: `scripts/extract-jm-die-corpus-page-by-page.py`.
Safety rail: cutting-data extraction has a KNOWN gap -- validate every `[tool, material_iso, vc/fz]`
tuple against a reference oracle before persist, else it poisons the safety-critical speed-feed store.

Consumed by: academy (course-builder), ai-training/india (NN/GNN training input). Pulls FROM:
pdf-corpus, mit-curriculum, tribal-knowledge (the three component source galaxies).

---

## pdf-corpus

Purpose: PDF ingestion + page-level corpus extraction -- turn the JM-Die TRIBAL/WIKI PDF
library and the `resources/PDF` reference trove into structured, domain-tagged, page-level
tribal entries that train the rest of the fleet. Canonical method is lima's pypdf
page-by-page extractor (page text -> notability score -> domain classification -> JSONL),
~76x deeper than heading-anchor parsing. Fleet-managed, no dedicated slot.

Dedicated engines (honest): 10 verified FLAT-root PDF engines serve this galaxy; ZERO inside
`engines/pdf-corpus/` (config/doc galaxy, CLAUDE.md sec 2). Loose grep `PDF|Pdf` returns 12
(includes 2 non-owned: `QuoteExplainPDFEngine` = quoting, `SpeedFeedPDFCorpusBridgeEngine` = SFC).
Verified-owned: `PDFProcessingPipelineEngine`, `PDFSourceRegistryEngine`, `PDFStructureEngine`,
`PDFTableExtractionEngine`, `PDFHandbookBatchProcessorEngine`, `PDFHighlightExtractorEngine`,
`PDFFormulaExtractionEngine`, `PDFMaterialPropertyExtractionEngine`,
`PDFBlueprintDimensionExtractorEngine`, `PDFBlueprintPatternRescueEngine`.

Data/corpus + scripts: dispatchers `prism_dev:pdf_pipeline_{classify,extract,read,summary}` +
`pdf_highlights_extract`, `prism_doc_learn` (5 actions), `prism_resource_extraction` (14 actions,
NOT the 21 the old MEMORY.md claimed). Canonical extractor script:
`scripts/extract-jm-die-corpus-page-by-page.py` (pypdf, notability floor 0.4, provenance-mandatory).
Outputs (gitignored, regenerable): `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (page-level) +
`jm-die-corpus.jsonl` (per-PDF catalog). Source roots: `resources/PDF`, `resources/RESOURCE PDFS`,
`resources/OKUMA MULTUS PDFS`, `Docustrata/manifest.json`.

Consumed by: mit-curriculum (raw PDF source), academy (extracted pages as training data),
post-processor/echo (POST-PDF-NODE dialect mining), corpus-aggregation (INGEST stage input).
Sibling: pdf-corpus-mill (mill-filtered subset). Receives FROM: knowledge-conversion (6-node router).

---

## pdf-corpus-mill

Purpose: the mill-filtered SUBSET of pdf-corpus -- mill operator-manual + per-controller
(Haas / Hurco WinMAX / Mazak Matrix) macro-programming PDFs, extracted page-by-page into
domain-tagged tribal entries addressable separately from the general corpus. It owns NO
extractor of its own; it reuses pdf-corpus's lima pypdf pipeline with a mill content filter.
De-facto slot: foxtrot (mill); fleet-managed otherwise.

Dedicated engines (honest): ZERO -- by design. `Glob engines/pdf-corpus-mill/**/*.ts` returns
empty AND there is no mill-specific PDF engine at the flat root; ALL extraction machinery lives
in the pdf-corpus parent (CLAUDE.md sec 2 is explicit: "Do NOT create new `.ts` files here").
This is the thinnest of the six -- a pure filter/view galaxy.

Data/corpus + scripts: NO dedicated dispatcher (do not invent one) -- inherits
`prism_dev:pdf_pipeline_*` + `prism_resource_extraction` from the parent. Mill-scoped emitter:
`scripts/generate-milling-extracted-pdf-bridge.mjs` (2026-05-26). Real source PDFs in
`H:/prism/resources/`: `WinMax Mill CUTTER COMPENSATION.pdf`, `WinMax Mill RECOVERY AND RESTART.pdf`
+ Haas / Mazak Matrix manuals (see this galaxy's PATHS.md, a 6.4K H:-wide mill-PDF atlas).
Store: filter the parent `jm-die-corpus-pages.jsonl` by source tags `Haas|Hurco|Mazak|mill|WinMax|Matrix`.
Gotcha: JM Die = INCH (G20) by convention -- tag extracted Haas/Hurco feeds as imperial; Mazak may differ.

Consumed by: mill/foxtrot (mill-tagged page entries as tribal input), post-processor/echo
(Haas Mill / Mazak Matrix dialect mining). Parent: pdf-corpus. No reverse write to the parent.

---

## mit-curriculum

Purpose: MIT OpenCourseWare is this galaxy's SOURCE corpus -- raw OCW course exports (lecture
notes, assignments, exams, readings, transcripts) are ingested and indexed so PRISM can convert
academic material into manufacturing-relevant knowledge nodes. It is a SOURCE/extraction galaxy:
it produces course knowledge that academy teaches and knowledge-conversion routes into
algorithms/formulas/engines. NOT a physics or G-code domain. Fleet-managed, no dedicated slot.

Dedicated engines (honest): 11 verified MIT/course engines serve this galaxy at the FLAT root;
ZERO inside `engines/mit-curriculum/` subdir (CLAUDE.md sec 2). Loose grep `MIT|Curriculum|Course`
returns ~29 -- badly polluted by unrelated `RateLimit*`, `*Emit*`, `LocalCommitMessage`, etc.
(the loose regex matched substrings, not ownership). Verified-owned: `MitCourseIndexEngine`
(indexes 200+ OCW courses), `MITCourseRegistryEngine`, `MITCourseKnowledgeEngine`,
`MITCourseDeepLearningEngine`, `MITCourseIntegrationEngine`, `MITCourseFullIntegrationEngine`,
`MITCourseExpansionEngine`, `MitOcwResourceResolverEngine`, `CourseBuilderEngine`,
`CurriculumEngine`, `KnowledgeCurriculumBridgeEngine`.

Data/corpus + scripts: NO `prism_*` dispatcher exists (no `prism_course`/`prism_mit`/`prism_curriculum`
-- do not invent one; call engines directly or route via knowledge-conversion). Corpus root:
`H:/PRISM/resources/MIT COURSES/` (20+ course dirs + `MIT COURSES 2/3/4/5/` subdirs), with
`PRISM_COURSE_CATALOG.json` + `MIT_COURSE_INDEX.json` + `ALGORITHM_REGISTRY.json` indexes.
Write target: `mcp-server/data/extracted-knowledge/mit-courses/` (NOT `H:/PRISM/extracted/mit-ocw/`,
which does not exist). Correction: `mcp-server/src/data/mit-courses-registry.ts` does NOT exist --
use `MITCourseRegistryEngine.ts`. Harvest-on-demand only (never bulk -- exhausts memory).

Consumed by: academy (curriculum delivery), knowledge-conversion (routes source into the
6-node-type pipeline). Sibling SOURCE: pdf-corpus. NOTE: the 7-algorithm port
(OperatorSplitting/ODEIntegrator/FEM/FDM/etc.) belongs to knowledge-conversion, NOT here.

---

## tribal-knowledge

Purpose: the cited-tip store every PRISM galaxy emits to and consumes from -- distill
shop-floor wisdom into structured tips, embed them into a domain-tagged rerank corpus, and
inject the top hits back into every chat (parent prompt + per-edit + per-subagent). No
domain-specific physics; this galaxy is the cross-cutting KNOWLEDGE SUBSTRATE. Fleet-managed;
golf owns pipeline hygiene (embed-index health, confidence-gate audits, DOMAIN_MAP fixes).

Dedicated engines (honest): ~9-11 core FLAT-root tribal engines + ~11 domain-consumer tribal
engines; ZERO inside `engines/tribal-knowledge/` subdir (CLAUDE.md sec 2, metadata-only dir).
Loose grep `Tribal` returns 39 (the CLAUDE.md warns the PATHS.md 93-entry keyword list is noise).
Core-owned: `TribalKnowledgeEngine` (core tip store), `TribalKnowledgeAdvisorEngine`,
`TribalRAGEngine`, `TribalEnrichmentCoordinatorEngine`, `TribalPlaybookEnforcementEngine`,
`TribalEvolutionEngine`, `TribalExplanationEngine`, `TribalKnowledgeOutcomeBridgeEngine`,
`TribalKnowledgeTrainingEngine` (LoRA feed). Domain consumers (emit INTO the store):
`CAMTribalKnowledgeEngine`, `MillTribalKnowledgeEngine`, `LatheTribalInjectorEngine`,
`WEDMTribalRuntimeEngine`, `PostProcessorTribalKnowledgeIntegrationEngine`, etc. This is the ONLY
one of the six that OWNS an AI engine (`TribalRAGEngine`, per its sec AI Synergy).

Data/corpus + scripts: dispatcher `prism_shop_practice` (53 actions:
`tribal_search`/`tribal_add`/`tribal_enrich*`/`tribal_apply*`/`playbook_*`/`lathe_lora_tribal_*`)
co-equal with `prism_knowledge:tribal_{search,capture,suggest,stats,enrich}`. Store:
`state/shared/tribal-embed-index.shard-*.json` (sharded 2026-06-08; ~200MB rerank corpus) +
`tribal-citation-log.jsonl`. Injection: `.claude/hooks/tribal-by-domain-inject.mjs` +
`.claude/scripts/tribal-rerank.mjs --domain`. Embedders: `scripts/embed-*-into-tribal-index.mjs`;
promoter `promote-tribal-to-wiki.mjs` (confidence >=90% gate). Atomic O_EXCL lock required
(`scripts/lib/tribal-index-lock.mjs`) -- five embedders share the index. Open P1: DOMAIN_MAP
lacks speed-feed/database-expansion/business (oscar/juliett/hotel get no injection).

Consumed by: EVERY galaxy (mill/lathe/wedm/cam/post-processor emit + consume), knowledge-conversion
(Lane-A tips -> nodes), academy (training source), corpus-aggregation (raw corpus storage),
ai-training/india (LoRA dataset via `TribalKnowledgeTrainingEngine`).

---

## cad-fusion-live

Purpose: live, long-running Autodesk Fusion 360 integration -- a PRISM-side HTTP client talks
to a host-side Python add-in running inside Fusion on `127.0.0.1` loopback, driving real CAD
operations (sketch/extrude/fillet/chamfer/revolve/hole/pattern/combine/shell/export/undo) and
reading back actual geometry. It is the LIVE TRANSPORT LAYER for the closed-loop "replicate a
part to 100% match" workflow and the mill-turn live handoff. Branch-scoped `cad-fusion-live-ms0`;
fleet-managed (delta owns CAD geometry, kilo owns CAM toolpaths; both use this transport).

Dedicated engines (honest): 4 verified FLAT-root Fusion-live engines (CLAUDE.md sec 2 cites
ENGINE_DIGEST line numbers); ZERO inside `engines/cad-fusion-live/` subdir. Loose grep
`Fusion|CADLive` returns 53 -- massively polluted by sensor-fusion, physics-fusion,
cross-process-fusion, Fusion tool-library/CAM engines owned by cad/cam/wedm, etc. The CLAUDE.md
explicitly warns the 236-item PATHS.md list is keyword-match false-positive noise. Verified-owned:
`Fusion360LiveBridgeEngine` (L993, the PRISM-side HTTP client; retry [100,500,2000]ms, toolpath
timeout 180s), `Fusion360MillTurnBridgeEngine` (L995, sub-spindle handoff),
`AutodeskFusionMCPProxyEngine` (L137, JSON-RPC 2.0 to Autodesk's official MCP),
`FusionProjectCrawlerEngine` (L1013, cloud-project crawler). (MEMORY.md also cites
`HyperCADSElectrodeEngine`, but CLAUDE.md sec 6 flags it as `ghost.unwired` -- treat as unverified.)

Data/corpus + scripts: NOT a corpus galaxy -- the "data" is a live loopback transport, not a
JSONL store. Dispatchers: `prism_cad` (20 `f360_live_*` + parse actions, cadDispatcher.ts L137-142/L317-318)
+ `prism_cam` (`f360_live_operations`/`toolpath_validity`/`cycle_time`/`materials` read-only introspection
+ `fusion_5x_*` + `cam_hypermill_millturn_*`, camDispatcher.ts). Host-side add-in:
`resources/fusion360/prism-api-server/prism_api_server.py` (binds `127.0.0.1:18360`, loopback + CORS +
`PRISM_FUSION_RAW_DISABLE=1` kill switch, `runOnStartup:false`). JM Die corpus:
`H:/PRISM/JM DIE/FUSION CAD AND CAM FILES` (1,163 `.f3d` parts). Critical gotcha: Fusion API unit is
CM -- raw inch value passed as cm = 2.54x undersized geometry; `f360_live_new_doc` MUST be first each cycle.

Consumed by / bridges: cad/delta (recognized features -> live model), cam/kilo (live toolpath
preview), mill/foxtrot + lathe/whiskey (mill-turn live bridges), post-processor/echo
(`f360_live_export` -> G-code emission). Canonical order flow: Fusion CAD (delta) -> hyperMILL/Mastercam
CAM -> Master Post -> JM Die controller.

---

## Cross-cutting facts (all six)

- **Zero-in-subdir invariant:** none of the six owns a `.ts` file inside its own `<galaxy>/`
  subdir; all serving engines (where they exist) live FLAT in `mcp-server/src/engines/`.
- **PATHS.md keyword lists are NOISE:** every galaxy's CLAUDE.md sec 2 warns that the auto-generated
  keyword-match engine list (46 / 236 / 93 entries, etc.) contains false positives -- the
  verified-owned counts above come from the sec 2 tables (grep class-definition / ENGINE_DIGEST line cite).
- **Honest owned-engine tally:** corpus-aggregation ~13-20 (flat, 0 in-subdir) - pdf-corpus 10
  (flat, 0 in-subdir) - pdf-corpus-mill 0 (pure filter over parent) - mit-curriculum 11 (flat,
  0 in-subdir) - tribal-knowledge ~9 core + ~11 consumers (flat, 0 in-subdir) - cad-fusion-live 4
  (flat, 0 in-subdir).
- **AI participation:** five are AI-substrate CONSUMERS (`aiEngineCount` 0); tribal-knowledge is
  the sole first-class AI PARTICIPANT (owns `TribalRAGEngine`). All six reason over their own
  doctrine via `scripts/lib/galaxy-reasoning-bridge.mjs <galaxy> "<q>"` (local Ollama, $0).
- **Shared canonical extractor:** the three PDF-adjacent galaxies (corpus-aggregation, pdf-corpus,
  pdf-corpus-mill) all use `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf, ~76x deeper
  than pdf-parse) -- never `scripts/pdf-parse-extract.mjs`.

_Source: each galaxy's `mcp-server/src/engines/<galaxy>/{MEMORY.md,CLAUDE.md}` (read + verified,
2026-07-01) + one flat-root `ls | grep` enumeration per galaxy to expose the loose-grep vs
verified-owned gap. R12: counts are doctrine-verified owned counts, not raw keyword-match totals._
