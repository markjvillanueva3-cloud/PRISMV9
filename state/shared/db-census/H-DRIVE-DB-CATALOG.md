# H-DRIVE DB CATALOG — Unified Index of Every Database & Corpus on H:

**Generated:** 2026-06-04 · **Owner:** slot juliett (database-expansion — ingestion / schema / atomicity / pathways)
**Method:** synthesis of 10 read-only db-census scout inventories under `state/shared/db-census/*-inventory.md` (real `find/du/wc/head/grep` enumeration, no hand-waved counts).

> **This catalog UNIFIES and LINKS the existing catalog surfaces — it does NOT replace them.** Each surface below remains the authoritative source for its slice. This file is the *index-of-indexes*: one place where the fleet can find which DB store lives where, who owns it, whether it is PATHED/WIRED, and whether a GPU pass produced (or should refresh) it.

## Authoritative catalog surfaces this file links (DO NOT rebuild — link)

| Surface | Path | Authoritative for | State |
|---|---|---|---|
| **CRITICAL-RESOURCE-ROOTS** | `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (+ `.md` atlas) | The 3 operator roots (`resources` 164,039 / `jm-die` 317,137 / `docustrata` 257,992) + 34-galaxy hint map | ✅ 2026-05-30, fleet-wired into all 34 PATHS.md |
| **DB_MANIFEST** | `data/databases/DB_MANIFEST.json` (repo-root, **NOT** `mcp-server/data/...`) | 27 registered DBs (12 core + 12 specialty + 3 juliett directory stores) | ✅ v2.0.0 2026-06-03; ⚠️ PATHS.md point at the wrong (mcp-server) path — see GAP-LIST |
| **jm-die-database manifest** | `mcp-server/data/jm-die-database/manifest.json` | Consolidated DocuStrata×JM-Die store (111,745 docs, 38,251 JM files, 76,205 blueprint→program joins, 95.6 GB) | ✅ 2026-05-29, heavily wired |
| **vendor-catalog-db manifest** | `mcp-server/data/vendor-catalog-db/manifest.json` | 482 vendors + 114 catalogs + 169 SFC-makers + 49 JM tool-vendors + $4.91M JM tool spend | ✅ 2026-06-02 (freshest), wired |
| **RESOURCE_CENSUS + registry** | `state/shared/RESOURCE_CENSUS.json` + `RESOURCE_CENSUS_REGISTRY_2026-03-30.json` | Live H:/C: resource scan rollup (21 corpora) | 🔴 census = DEAD `total_resources:0`; 🟠 registry stale 2026-03-30 |
| **PRISM_SHARED_INDEX_SURFACES** | `state/shared/PRISM_SHARED_INDEX_SURFACES.md` | "hit these before broad sweeps" pointer set (11 indexes) | 🟠 path-rot (`C:\PRISM` prefix, 2026-03-27) |
| **JM-DIE-PROGRAM-CATALOG** | `state/shared/JM-DIE-PROGRAM-CATALOG.md` | JM Die program awareness card (38,251 files) | ✅ 2026-05-09, mirror of jm-die-database rollups |
| **QUOTING-DATA-INDEX** | `state/shared/quoting/QUOTING-DATA-INDEX.md` + `quoting-data-index.json` | 46-entry self-index of the quoting root | 🟡 present but UNPATHED+UNWIRED |
| **cad-cam-resources-pdf-index** | `mcp-server/data/state/cad-cam-resources-pdf-index.json` | 3,936 PDFs across resources+jm-die roots | ✅ 2026-05-26, wired |
| **RESOURCES-INDEX** | `resources/RESOURCES-INDEX.md` | 80-agent deep audit of the `resources` root | ✅ 2026-04-11 v4 (human census) |

### Definitions
- **PATHED** = referenced in a galaxy `PATHS.md`, `PRISM_SHARED_INDEX_SURFACES.md`, `RESOURCE_CENSUS.json`, `CRITICAL-RESOURCE-ROOTS.json`, or `DB_MANIFEST.json`. *(Root-only PATHED = the parent root is pathed but the individual store is not — still effectively invisible.)*
- **WIRED** = consumed at runtime by an engine/hook/script (`.ts`/`.mjs`), NOT merely mentioned in a PATHS.md.
- **GPU-gen?** = produced (or upgradeable) by an embedding/LLM/OCR pass an Ollama/Blackwell GPU accelerator could generate or refresh.

---

## Category 1 — Operational-state stores (live coordination, ledgers, indexes)

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `state/shared/system-viz/system-graph.json` | canonical fleet graph | 644 MB | system-viz (sierra) | Y | Y | N |
| `state/shared/system-viz/system-graph.previous.json` | rollback copy | 495 MB | system-viz | N | partial | N |
| `state/shared/system-viz/system-graph-normalized.json` | derived graph | 247 MB | system-viz | partial | Y | N |
| `state/shared/system-viz/system-graph-index.json` | adjacency/lookup index | 193 MB | system-viz | partial | Y | N |
| `state/shared/system-viz/obsidian-augmentation.json` | augmentation overlay | 297 MB | system-viz | partial | Y | N |
| `state/shared/system-viz/architecture-graph.json` | oversize-fallback graph | 52 MB | system-viz | partial | Y | N |
| `state/shared/system-viz/node-adjacency.json` | adjacency | 77 MB | system-viz | N | N (by name) | N |
| `state/shared/system-viz/find-cache.json` | search cache | 55 MB | system-viz | N | N | N |
| `state/shared/system-viz/h-drive-census.json` | FS census | 126 MB | database-expansion | N | N | N |
| `state/shared/system-viz/h-drive-files.jsonl` | H: file inventory | 196 MB | system-viz | N | Y | N |
| `state/shared/UNLINKED-MENTIONS.json` | wiki-link candidate index | 96.8 MB | discovery | N | N | N |
| `state/shared/BUILD_STATE.json` | built/needs-wiring snapshot | small | frontend/backend | Y | Y (14 refs) | N |
| `state/shared/HOOK_REGISTRY.json` (+ `.previous.json`) | hook registry | small | fleet-hygiene | Y | Y (13) | N |
| `state/shared/coordination.db` | SQLite H8 WAL coord store | 40 KB | database-expansion | Y | Y | N |
| `state/shared/chat-bus/messages/*` | chat-bus ledger | 17,267 JSON | agent-orchestration | partial | Y | N |
| `state/shared/checkpoints/*` | unit checkpoint ledger | 4,017 JSON | agent-orchestration | partial | Y | N |
| `state/shared/loop-state/*` · `agent-coordination/{cursors,heartbeats}` | ephemeral coord | 317 / 769 / 594 JSON | agent-orchestration | partial | Y | N |
| `mcp-server/data/state/ai-intelligence-log.jsonl` | AI routing ledger | **57.7 MB** (largest ledger) | token-optimization | N | Y | N |
| `mcp-server/data/state/hook-fire-counts.jsonl` | hook telemetry | 26.2 MB | fleet-hygiene | N | hook-only | N |
| `state/shared/source-monitor-log.jsonl` | arXiv/RSS sweep log | **232 MB** (largest live ledger) | discovery | N | Y | N |
| `state/shared/outcome-bus.jsonl` | fleet outcome bus | 17 MB | ai-training | Y | Y | N |
| `state/shared/UNIFIED_EDIT_TAP.jsonl` | every Edit/Write fleet-wide | 12 MB | fleet-hygiene | N | Y (drained) | N |
| `state/shared/zebra-orchestrator-log.jsonl` | DEAD orchestrator log | 10 MB | hermes-zulu | N | **N (dead dup of zulu)** | N |
| `state/shared/zulu-orchestrator-log.jsonl` | live orchestrator log | 0.57 MB | hermes-zulu | N | Y | N |
| `mcp-server/data/state/MASTER_INDEX.json` | unified master index | 1.9 MB | discovery | N | blueprint ref | N |
| `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` | shortcode→path map | 943 KB | discovery | Y (canonical) | Y | N |
| `mcp-server/data/state/TEST_COVERAGE_INDEX.json` | coverage map | 6.8 MB | backend-helper | N | Y | N |
| `mcp-server/data/state/{CAD_FILE_REGISTRY,SIGNATURE_HASH_INDEX,DEP_GRAPH,ACTIONS_INDEX,ACTION_RESOLUTION_INDEX,WEDM_LATTICE_GRAPH,cross-session-asset-registry}.json` | engine indices | 0.9–3.0 MB ea | various | N | Y | N |
| `mcp-server/data/state/{BASELINE_INVENTORY,HEALTH_CHECK_REPORT,extraction-log}.json` | anti-regression baselines | small | backend-helper | Y (canonical) | Y | N |
| `mcp-server/data/state/{MACHINE_REGISTRY,MACHINE_HARDENING,CAPABILITY_INDEX,ENGINE_WIRING_INDEX}.json` | registries (report-only) | small | various | N | N (by name) | N |
| ~80 bounded `*.jsonl` ledgers (error/budget/dev-outcome/cron/bypass/history) | append-only event ledgers | <1 MB ea | various | mostly N | mostly Y | N |

## Category 2 — Vector / embedding stores (GPU-gen family, nomic-embed-text dim-768)

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `state/shared/tribal-embed-index.json` | float dim-768 vector index | **507 MB** | tribal-knowledge / ai-training | Y (10+) | Y (4) | **Y** |
| `knowledge/wiki/architecture/_embeddings.jsonl` | int8 dim-768 vector store (twin of above, 5× smaller) | 106 MB / 43,440 vecs | discovery / ai-training | Y (8+) | Y | **Y** |
| `state/shared/system-viz/_node-embeddings.jsonl.partial` | **STALLED** node-embedding pass | **556 MB / 223,001 lines** | system-viz / ai-training | weak | Y (writer) | **Y (resume on GPU)** |
| `state/shared/nn-graph/node-embeddings-768d.jsonl` | int8 dim-768 GNN feature sidecar | 7.2 MB / 3,790 lines | ai-training (india) | Y | Y (4) | **Y** |
| `state/shared/memory-embeddings-sidecar.json` | memory dim-768 vectors | 15 MB | ai-training | N | **N (UNWIRED)** | **Y** |
| `state/shared/memory-index-sidecar.json` | memory index (11,315 records) | 6.7 MB | ai-training | N | **N (UNWIRED)** | partial |
| `state/shared/tribal-graph/course-embed-checkpoint.json` | course embed checkpoint | 3.1 MB | academy | partial | partial | Y |
| `mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json` | **TF/vocabulary (NOT dense)** | 5.6 MB | cam (kilo) | cad PATHS | Y | **Y (upgrade TF→dense)** |
| `mcp-server/data/state/SEMANTIC_SIGNATURES.json` | **term-presence bag (NOT dense)** | 2.9 MB | discovery | N | Y | **Y (replace w/ embeddings)** |
| `mcp-server/data/transformers-cache/` (Xenova ONNX) | embedding-model cache | 23 MB | ai-training | N | Y | n/a (the generator) |
| Stale dupes: `.tribal-embed-index.bak.json` (7.4 MB), `.blurbs-cache.json` (3.1 MB), `prism-test-*/`, `worktrees/rgs6-*/` copies | backup/cache | ~25 MB total | — | N | N | DUP |

## Category 3 — JM-Die corpus (triple-catalogued, consistent — do NOT rebuild)

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `mcp-server/data/jm-die-database/` (manifest + tables + reports) | consolidated DocuStrata×JM-Die DB | 73 MB · 111,745 docs · 95.6 GB corpus | database-expansion (juliett) | Y | Y (4 ts) | partial (73,506 need OCR — but NEVER re-OCR) |
| `mcp-server/data/jm-die-database/tables/documents.jsonl` | per-doc table | 59.7 MB / 111,745 | database-expansion | Y | **N (no runtime consumer)** | derived |
| `mcp-server/data/jm-die-database/tables/files.jsonl` | CAD/program file index | 10.8 MB | database-expansion | Y | Y (`MillProgramCorpusEngine`) | N |
| `mcp-server/data/jm-die-database/{jm-die-tooling-catalog,jm-die-stock-material-catalog,...}.json` | tooling/stock catalogs | 32–50 KB ea | business / lathe | Y | partial | N |
| `H:/PRISM/Docustrata/manifest.json` | DocuStrata export rollup | 66.2 MB / 111,745 docs | database-expansion | Y (ownIndex) | indirect | N |
| `H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl` | print↔program join | 61.9 MB / 76,205 PNs | blueprint-vision / cad | Y | **N (registered by ref only)** | **Y (lift 87.9% miss)** |
| `H:/PRISM/Docustrata/.index/phase20-verified-prints.jsonl` | per-page verified prints | 18.1 MB / 44,012 pages | blueprint-vision | Y | N (join input) | **Y (deep-OCR)** |
| `H:/PRISM/Docustrata/.index/phase15-deep-rescan-parallel.jsonl` | raw deep-OCR cache | 65.3 MB / 151,265 pages | blueprint-vision | Y | N (intermediate) | **Y (IS the OCR output)** |
| `H:/PRISM/Docustrata/.index/documents-{classified,text-extracted}-v3.jsonl` | doc classify / text extract | 66.7 / 61.7 MB | database-expansion | Y | indirect | partial |
| `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` | JM CAD/program file index | 10.9 MB / ~38K | database-expansion | Y | indirect → files.jsonl | N |
| `H:/PRISM/Docustrata/.index/{disk-index,low-confidence,phase7-drawing-candidates,phase8-classified-pages,training-triples-v4,inverted indexes}` | pipeline indexes | 0.07–38.7 MB | blueprint-vision / ai-training | Y | mostly N | mixed |
| `H:/PRISM/JM DIE/Prism JM Die/**/part.json` | per-part extraction sidecars | **30,896 files** (20,861 `_UNASSIGNED`) | blueprint-vision / mill | partial | **N (orphaned)** | **Y (classify 20,861 unassigned)** |
| `H:/PRISM/JM DIE/` raw payloads (119,255 NC · 34,990 .min · 14,769 mcx-8 · 10,664 ipt · 85,346 pdf · 7,772 dxf) | raw program/CAD/print files | 317,137 files | mill/lathe/cam/cad | root-PATHED | path-level only (bodies unparsed) | **Y (NC tokenize / CAD feature / OCR)** |
| `state/shared/databases/jm-file-inventory.jsonl` | JM file inventory ledger | 113 MB / 554,999 files | database-expansion | Y | Y (8 refs) | N |
| `state/shared/databases/jm-customers.jsonl` | customer master | 156 KB / ~470 | business (hotel) | Y | Y (`CustomerManagementEngine`) | N |
| `state/shared/databases/{jm-document-ledger-summary,jm-doc-bridge-registry}.json` | doc routing + wiring map | 9.8 / 13.3 KB | database-expansion | partial | Y (accountability gate) | N |
| `state/shared/jm-sim/{jm-job-catalog.json,jm-business-docs.jsonl}` | JM simulated job catalog | 19.3 / 9.2 MB | business | N | N (job-catalog) / Y (docs) | N |
| `state/shared/scan-tracking/jm-die-scan-ledger.jsonl` | program-scan ledger | 91 MB | database-expansion | N | Y (`CrossPartToolingSynergyEngine`) | N |
| `state/shared/print-corpus-tables/{rows,by-customer/_PART_LIBRARY}.jsonl` | print/blueprint corpus | 58 MB ea (near-dup) | blueprint-vision | N | Y (`PrintAccuracyProofEngine`) | OCR-gen |
| `state/shared/blueprint-training-pairs.jsonl` + `blueprint-extraction-*-2026-05-24.jsonl` | blueprint trainsets | 54 / 26 / 17 MB | blueprint-vision / ai-training | N | Y (blueprint scripts) | partial |

## Category 4 — CAD/CAM/CNC/Post corpus & catalogs

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `mcp-server/data/prism-reference-db/` (MANIFEST + 18 category JSON) | structured reference DB | 26 MB / 13,920 records | database-expansion / blueprint-vision | blueprint PATHS | Y (data dispatcher) | N (15% extraction loss — re-pass) |
| `mcp-server/data/posts/` | NC/.cps post corpus | 75 MB / 679 files | post-processor (echo) | post PATHS | Y | N |
| `mcp-server/data/programs/` (haas/hurco/mastercam/okuma/wire-edm) | NC program corpus | 39 MB / 2,888 files | post-processor / mill | partial | partial | N |
| `H:/PRISM/JM DIE/POST PROCESSORS/POST-PROCESSOR-MANIFEST.json` | post manifest | 10,051 post files | post-processor | Y | Y | N |
| `mcp-server/data/machine-handbooks/` | machine handbook corpus | 20 MB / 15 files | mill/lathe | N | partial | **Y (embeddable)** |
| `mcp-server/data/state/{cad-corpus-manifest,cad-corpus-manifest-recovered}.json` | CAD corpus manifest (near-dup pair) | 5.2 MB ×2 | cad (delta) | N | partial | N |
| `state/shared/CAD_CORPUS_ALLVENDOR.jsonl` | CAD file manifest | 5.7 MB | blueprint-vision | N | **N (stale dead-worktree paths)** | N |
| `mcp-server/data/state/jm-die-full-program-index-v2.json` | JM program index v2 | 14.0 MB / 34,786 | mill | N | **N (UNWIRED)** | N |
| `mcp-server/data/state/jm-die-full-program-index.json` (v1) | superseded v1 | 12.5 MB | mill | N | **N (DUP of v2 — deletable)** | N |
| `mcp-server/data/state/WEDM_*` (×47 stores) | WEDM lattice/GNN/ledgers/corpus | varies | wedm (mike) | Y (exemplary) | Y | GNN-weights GPU-gen |
| `resources/2- Basic Training Day 2/Training Tools.db` | Mastercam tool-library SQLite | 3.5 MB / 856 pages | speed-feed / cam | root-pathed | Y (`TrainingContentIndexEngine`) | N |
| `resources/**/*.tooldb` (Mastercam ISCAR/KENNAMET/...) | binary tool DB | 135 files | speed-feed / cam | N | partial (`mill-resources-index`) | N |
| `resources/{HYPERMILL,OPEN MIND}/**/*.db` (ToolDB/MacroDB) | hyperMILL tool+macro DB | 68 files | cam | N | partial | N |
| `resources/FUSION360/tool-library/*.csv` | Fusion tool tables | 7 files | speed-feed | N | **N (UNWIRED)** | N |
| `resources/{cimco-2025,cimco-2026}/.../config.json` | CIMCO machine kinematics | 71 files | post-processor / 5axis | N | **N (UNWIRED)** | N |
| `resources/MANUFACTURER_CATALOGS/**` | vendor tool/insert catalogs | 8.3 GB / 287 PDFs (46 indexed) | speed-feed / quoting | root-pathed | partial | **Y (241 unindexed — OCR)** |
| `resources/RESOURCE PDFS/**` · `MIT COURSES/**` | training/reference + MIT-OCW | 513 + 196 PDFs | academy / discovery | root-pathed | partial (folded into pdf-index) | **Y (embed)** |
| `resources/{CAD FILES,MACHINE MODELS FOR LEARNING,PART MODELS}/` | CAD-model corpus (STEP 411 / STL 1172 / DXF 1433) | 2.6 GB+ | cad | root-pathed | **N (no structured index)** | partial (feature-recog) |
| `resources/**/*.zip` | sealed CAM/post/part archives | 549 zips | cad/cam | N | **N (unextracted dark corpus)** | n/a until extracted |
| `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/*.js` | PRISM formula corpus | 320 KB / 3 files | discovery (creative-reasoning) | N | **N (orphaned in resources/)** | N |
| `mcp-server/data/state/cad-cam-resources-pdf-index.json` | PDF index (both roots) | 1.08 MB / 3,936 PDFs | cad/cam | Y | Y | partial |

## Category 5 — Business / ERP / Quoting

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `mcp-server/data/vendor-catalog-db/` (manifest + 4 tables) | vendor corpus | 376 KB / 482 vendors | business / quoting (hotel/charlie) | Y (7 PATHS) | Y (6 consumers) | partial |
| `state/shared/quoting/jm-vendor-ap-ledger.jsonl` | **$10.08M A/P procurement ledger** | 5.0 MB / 20,736 lines | quoting (charlie) | **N** | Y (`VendorCostIndexEngine`) | N |
| `state/shared/quoting/jm-vendor-cost-index.json` | A/P rollup | 39.6 KB | quoting | N | Y | N |
| `state/shared/quoting/jm-sold-orders.json` | OCR-parsed sold orders | 154 KB / 12,761 orders | quoting | **N** | Y (`OutboundPriceIndexEngine`) | **Y (8,580 low/no-conf OCR)** |
| `state/shared/quoting/jm-tool-purchases.json` | **$4.91M JM tool spend** | 16 KB / 7,150 items | quoting / speed-feed | partial (2) | Y (`PartGeometryPipelineEngine`) | N |
| `state/shared/quoting/baseline-records-corpus.json` (+ `-with-real`, `-with-synth`) | quoting training corpus (**STUB revenue cost×1.4**) | 16.8 + 18.7 + 18.7 = 54 MB | quoting / ai-training | partial (1) | Y (`QuotingTrainingLoopEngine`) | **Y (replace stub via Docustrata OCR)** |
| `state/shared/quoting/{active-calibration,train-cycle-history}.json/jsonl` | training state (MAPE 71%) | 78 / 28 KB | quoting | N | partial | N |
| `state/shared/quoting/vendor-directory.jsonl` | vendor directory | 228 KB / 482 | quoting | N | indirect (=vendor-catalog-db) | N |
| `state/shared/quoting/{quoting-data-index,quoting-knowledge-index}.json` | self-indexes of quoting root | 20 / 50 KB | quoting | N | **N (UNWIRED)** | N |
| `state/shared/quoting/vendor-sources/{imts,thomasnet,catalog-vendors}.jsonl` | raw harvested vendor sources | 23+13+54 KB | quoting | N | indirect (folded) | partial (web-harvest) |
| `state/shared/quoting/docustrata-{invoices.curated,revenues.sample}.json` | Docustrata invoice/revenue samples | 2.4 / 1.7 KB | quoting | N | partial | **Y (OCR — ties to revenue gap)** |
| `mcp-server/data/state/invoices.json` | ERP invoices (synthetic seed) | 11.5 KB | business (hotel) | N | Y (`erp-seed` + InvoicesPage) | N |
| `mcp-server/data/state/customer-consents.json` | AI-training consent registry | 3.4 KB | business / ai-training | N | Y | N |
| `mcp-server/data/shop/jm-die-customers.json` | shop customer rollup (142) | 2.7 KB | business / shop-floor | N | N (folder-scan) | N |
| `mcp-server/data/{wedm-intelligence/customer-profiles,state/WEDM_CUSTOMER_PATTERN_INDEX}.json` | WEDM customer patterns (UNKNOWN-heavy) | 0.6 / 2.3 KB | wedm | N | partial | N |
| `state/shared/databases/jm-vendors.jsonl` | 12-vendor stub | 3.4 KB | quoting | N | overlaps vendor-catalog-db | N |
| `mcp-server/data/vendor-catalog-manifest.json` (legacy) | 38-PDF tool-COUNT extraction | 18.7 KB | quoting | N | N (superseded) | N |
| `mcp-server/data/quoting-lora-smoke-out/{train,val,test}.jsonl` | quoting LoRA dataset | 22.8/6.7/4.2 KB | ai-training / quoting | N | partial (lora) | **Y (LoRA fine-tune)** |

## Category 6 — Knowledge / wiki / tribal / training stores

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `knowledge/wiki/architecture/_embeddings.jsonl` | int8 dim-768 wiki vector store | 106 MB / 43,440 vecs | discovery / ai-training | Y (8+) | Y | **Y** |
| `knowledge/wiki/architecture/_leaf-index.jsonl` | leaf catalog (no vectors) | 17.7 MB / 54,230 | discovery | Y | Y | N |
| `knowledge/wiki/index.jsonl` (+ `index.md`) | 770-entry wiki catalog | 193 KB / 770 | discovery | Y | Y (`WikiIndexMaintainerEngine`) | N |
| `knowledge/wiki/architecture/_skill-triggers.jsonl` (+ pathglob) | skill-trigger index | 90 KB / 518 | agent-orchestration | via hook | Y (`skill-auto-trigger`) | N |
| `knowledge/wiki/**` (md corpus) | wiki markdown | 38,741 .md / 305 MB | all galaxies | Y | embedded into `_embeddings.jsonl` | **Y (architecture tail 27.6%)** |
| `knowledge/memories/**` (md corpus) | Obsidian-brain memories | 11,702 .md / 55 MB | all galaxies | Y | embedded (≈100% coverage) | Y |
| `knowledge/tribal/**` (md) + `mcp-server/data/tribal/*.jsonl` (×7) | tribal tips | 4,247 .md + 24 MB jsonl | tribal-knowledge | md=Y / jsonl=**N** | Y | **Y (embed-source)** |
| `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` | per-page tribal corpus | 17.5 MB | tribal-knowledge | **N (baseline)** | Y | **Y (RAG embed)** |
| `state/shared/training/psn-leg-{1..11}-*.jsonl` | 11-leg PSN training corpus | 95 MB (leg-6 = 76 MB) | ai-training (india) | partial | Y (`build-psn-training-corpus`) | partial (text legs embeddable) |
| `state/shared/training/wiki-canonical-pairs.jsonl` | wiki Q→A training pairs | 0.5 MB / 282 | ai-training | N | **N (UNWIRED — likely orphaned)** | text |
| `state/shared/nn-graph/graphsage-checkpoint.candidate.json` | GNN checkpoint | 2.9 MB | ai-training | partial | Y | GPU-train |
| `mcp-server/data/models/pp-transformer/` (8 versions) | post-processor transformer | tiny `.bin` (placeholder weights) | post-processor | N | Y | 🟡 stub weights vs claimed 125M params |
| `mcp-server/data/models/{surface-cnn,tool-life-mlp,cad_param_predictor,test-model-*}` | ML checkpoints | small | various | N | partial | 🟡 (test-model-* = deletable debris) |
| `mcp-server/data/{training,video-learned,extracted-knowledge,ingestion_cache}/` | learn/extraction corpora | 20 / 8.9 / 3.8 / 5.2 MB | corpus-aggregation / pdf-corpus | N (baseline) | partial | **Y (embeddable)** |
| `knowledge/code-index/EXECUTION_CHAIN.json` · `data-index/DATA_TAXONOMY.json` · `sessions/SESSION_KNOWLEDGE_INDEX.json` | stale index sidecars (Feb-17) | 24 / 4.9 / 5.9 KB | discovery | N | N (2 fully UNWIRED) | N |
| `mcp-server/data/quality/{audit-log.jsonl,job-history.json,parameter-priors.json}` | Cpk/SPC stores | ~240 KB | quality | **N (0 ptrs)** | Y | N |

## Category 7 — Large physics-gen corpus (count-dominating)

| Path | Type | Size / count | Owner galaxy | PATHED | WIRED | GPU-gen |
|---|---|---|---|---|---|---|
| `state/shared/sfc-variability-results/{mill,lathe}/chunk-*.jsonl` | SFC physics-gauntlet result corpus | **2.2 GB / 47,378 files** (99.6% of all state/shared jsonl) | speed-feed (oscar) | 1 PATHS | guard-wired, **N by dir name** | N (physics-gen) |
| `state/shared/dashboards/jm-die-lathe-audit-dashboard.json` | oversized single-file dashboard | 59 MB | lathe / quality | N | N | N |

---

## Roll-up

- **Total distinct DB stores / corpora catalogued:** **~155** (deduplicating the 47,378 SFC chunks → 1 corpus artifact and the 4,635 wiki hook-cache files → 1). Counting raw file inventories: H: holds ~1.0 GB+ of embedding stores, 9.3 GB under `state/shared`, 537 MB under `mcp-server/data`, 382 MB under `knowledge`, plus the 3 operator roots (`resources`/`jm-die`/`docustrata` = 732K+ files).
- **The 3 operator roots** (`resources` 164,039 · `jm-die` 317,137 · `docustrata` 257,992) are PATHED at depth-1 via CRITICAL-RESOURCE-ROOTS but their high-value *derived* DBs (the 76,205-row print→program join, 30,896 `part.json` sidecars, the non-PDF CAD index) are the orphan layer — see `DB-GAP-LIST.md`.
- **JM-Die / DocuStrata is the only fully-consolidated corpus chain** (roots → jm-die-database manifest → program-catalog card → jm-doc ledger/bridge). Do NOT rebuild it; link this chain. Every other category has at least one unpathed or unwired store.

> Companion: **`DB-GAP-LIST.md`** (same dir) — prioritized action list (unpathed · unwired · duplicate · GPU-gen) ranked by fleet-search-value × effort, each tagged with an owner slot.
