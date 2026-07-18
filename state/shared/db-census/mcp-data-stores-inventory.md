# DB Census — Root: `mcp-server/data/**` (mcp-data-stores)

> Scout: db-census | Generated: 2026-06-04 | Method: real `find/du/ls/wc/grep/head` enumeration (no hand-waved counts).
> Root total: **537 MB** · **1,694 `.json`** + **91 `.jsonl`** files · **0 SQLite/.db** · **0 Qdrant/HNSW vector dirs** (those live outside this root).
> Store taxonomy here = (A) manifest+tables corpora, (B) append-only JSONL ledgers, (C) JSON index/registry sidecars, (D) large structured corpus dirs, (E) ML model checkpoints.
> Linked catalog surfaces (not duplicated): `mcp-server/data/jm-die-database/manifest.json`, `mcp-server/data/vendor-catalog-db/manifest.json`, `mcp-server/data/prism-reference-db/MANIFEST.json`, `state/shared/PRISM_SHARED_INDEX_SURFACES.md`, `CRITICAL-RESOURCE-ROOTS.json`, the 34 galaxy `PATHS.md`.

## Definitions
- **PATHED** = referenced in a galaxy `PATHS.md`, `PRISM_SHARED_INDEX_SURFACES.md`, `RESOURCE_CENSUS.json`, or `CRITICAL-RESOURCE-ROOTS.json`.
- **WIRED** = consumed by an actual engine/hook/script (`.ts`/`.mjs`) — NOT a PATHS.md mention. (PATHS.md-only = PATHED-but-UNWIRED.)
- **GPU-gen?** = produced (or upgradeable) by an embedding/LLM pass that an Ollama/GPU accelerator could generate/refresh.

---

## A. Manifest + tables corpora (the 3 "real DBs")

| Store (abs path) | Type | Size / count | Schema shape | PATHED | WIRED | GPU-gen? | Consolidation note |
|---|---|---|---|---|---|---|---|
| `mcp-server/data/jm-die-database/` | manifest + 2 JSONL tables + reports | 73 MB · `documents.jsonl` 59.7 MB, `files.jsonl` 10.8 MB | manifest: `{schemaVersion 1.0.0, kind:jm-die-database-manifest, corpus:{docustrata_files_total 257992, indexed_documents 111745, classified_v3 73506, jm_die_files_indexed 38251, blueprint_program_joins 76205}}` + catalogs (stock-material, tooling) | ✅ CRITICAL-RESOURCE-ROOTS.json + academy/PATHS.md | ✅ (engine refs incl Form1099NECEngine, business) | ⚠️ partial — `documents.jsonl` is classified text, no dense vectors yet → embeddable | Canonical Docustrata×JM-Die join. KEEP. owner=juliett |
| `mcp-server/data/vendor-catalog-db/` | manifest + 4 tables (3 JSONL, 1 JSON) | 376 KB · `vendors.jsonl` 228 KB (482 vendors), `catalog-vendors.jsonl`, `sfc-makers.jsonl`, `jm-tool-purchases.json` | manifest: `{schemaVersion 1.0.0, store:vendor-catalog-db, owner:juliett, directoryStats:{total 482, bySource, byCategory}}` + `EXTRACTION-ROUTING.json` | ❌ **only CLAUDE.md prose** (NOT in CRITICAL-RESOURCE-ROOTS or shared index) | ⚠️ business/PATHS.md mention only — **UNWIRED by engine** | ❌ metadata only | **GAP: PATHED-orphan.** Add to CRITICAL-RESOURCE-ROOTS.json + a `prism_business` action |
| `mcp-server/data/prism-reference-db/` | MANIFEST + 18 category JSON | 26 MB · `materials.json` 9.4 MB, `cad.json` 5.0 MB, `other.json` 4.5 MB, `machines.json` 2.0 MB, `holders.json` 1.5 MB | MANIFEST: `{schemaVersion 1.0.0, sourceFilesScanned 1715, candidateAssignments 13307, storesExtracted 1859, storesFailed 1066, totalRecords 13920, totalBytes 25.8M}` | ⚠️ blueprint-vision/PATHS.md only | ✅ `schemas/dataActionSchemas.ts` (data dispatcher) | ❌ structured reference data | KEEP. Note `storesFailed 1066` + `emptyDropped 2832` = ~15% extraction loss worth a re-pass |

## B. Append-only JSONL ledgers (`state/` + others)

| Store (abs path) | Size | Schema shape (line-0) | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|
| `state/ai-intelligence-log.jsonl` | **57.7 MB** | per-event AI routing log | ❌ | ✅ `PRISMIntelligenceLayer.ts` | ❌ | LARGEST ledger; unbounded growth — rotate/compact candidate |
| `state/hook-fire-counts.jsonl` | 26.2 MB | hook fire telemetry | ❌ | ✅ hook-written (`archived-skill-suggest.mjs` et al), no engine reader | ❌ | Append-only telemetry; compactable to counts |
| `tribal/jm-die-corpus-pages.jsonl` | 17.5 MB | per-page tribal corpus | ❌ | ⚠️ academy/PATHS.md only — **UNWIRED by engine** | ✅ embeddable page text | RAG source; could feed dense index |
| `state/WORLD_SIM_PREDICTIONS.jsonl` | 6.2 MB | `{id, timestamp, tool, inputSummary, willSucceed, risk, outcome}` | ❌ | ⚠️ hook-written (`curiosity-explorer.mjs`) — **UNWIRED by engine** | ❌ | Outcome=null on many rows; orphan-ish |
| `state/CAD_CORPUS_ALLVENDOR.jsonl` | 5.7 MB | `{sourcePath, ext, bytes, hash, scannedAt}` | ❌ | ❌ **UNWIRED** | ❌ (file-hash manifest) | Points at deleted worktree paths (`brave-euclid`) → stale |
| `state/MILLING_REASONING_TRACE_LEDGER.jsonl` | 4.3 MB | reasoning traces | ❌ | ✅ `MillingReasoningTraceLedgerEngine.ts` | ❌ | |
| `tribal/youtube-toolpath-tribal.jsonl` | 3.5 MB | yt-derived tribal tips | ❌ | ⚠️ tribal corpus | ✅ embeddable | |
| `tribal/online-cad-cam-tips.jsonl` | 2.5 MB | scraped tips | ❌ | ⚠️ tribal corpus | ✅ embeddable | |
| `state/UNIFIED_ERROR_LEDGER.jsonl` | 2.0 MB | error events | ❌ | ✅ `UnifiedErrorLedgerEngine.ts` | ❌ | |
| `state/token-budget-telemetry.jsonl` | 927 KB | budget events | ❌ | ✅ hook (`token-budget-gate.mjs`) | ❌ | |
| `state/dev-outcomes.jsonl` | 601 KB | dev outcome events | ❌ | ✅ hook (`dev-outcome-tracker.mjs`) | ❌ | |
| `state/CURIOSITY_QUEUE.jsonl` · `BROADCAST_CHANNEL.jsonl` · `WEDM_OUTCOME_LEDGER.jsonl` · `ERROR_LEARN_LEDGER.jsonl` | 448K/279K/275K/167K | event ledgers | ❌ | mixed (hook/engine) | ❌ | |

## C. JSON index / registry sidecars (`state/` + `docs/`)

| Store (abs path) | Size | Schema shape | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|
| `state/jm-die-full-program-index-v2.json` | 14.0 MB | `{schemaVersion 2.0.0, rootPath:JM DIE, stats:{totalFiles 34786, programs 25949, cadFiles 8837, byExtension}}` | ❌ | ❌ **UNWIRED by engine** | ❌ | See JM-DIE-PROGRAM-CATALOG.md |
| `state/jm-die-full-program-index.json` (v1) | 12.5 MB | v1 of above (May-9) | ❌ | ❌ | ❌ | **DUP — v1 superseded by v2; deletable** |
| `data/MASTER_INDEX.json` | 1.9 MB | unified master index | ❌ | blueprint ref | ❌ | Master search index dump |
| `docs/CODE_SYSTEM_INDEX.json` | 943 KB | shortcode→path map | ✅ canonical (CLAUDE.md) | ✅ codeSystemIndexEngine | ❌ | KEEP |
| `state/TEST_COVERAGE_INDEX.json` | 6.8 MB | coverage map | ❌ | ✅ `TestCoverageIndexEngine.ts` | ❌ | |
| `state/CAM_TRIBAL_RAG_INDEX.json` | 5.6 MB | `{schemaVersion 1, vocabulary:[...], ...}` — **TF/vocabulary, NOT dense vectors** | ⚠️ cad/PATHS.md | ✅ `CAMTribalRAGEngine.ts` | 🟢 **HIGH — upgrade TF→dense Ollama embeddings** | GPU-gen target |
| `state/SEMANTIC_SIGNATURES.json` | 2.9 MB | `{signatures:{<engine>:{terms:{...0/1}}}}` — **term-presence bag, NOT dense vectors** | ❌ | ✅ `SemanticSimilarityGuardEngine.ts` | 🟢 **HIGH — replace term-bag with real embeddings** | GPU-gen target |
| `state/cad-corpus-manifest.json` + `-recovered.json` | 5.2 MB ×2 | CAD corpus manifest | ❌ | ⚠️ | ❌ | **near-DUP pair (same mtime/size) — merge/dedup** |
| `state/CAD_FILE_REGISTRY.json` (3.0M) · `SIGNATURE_HASH_INDEX.json` (944K) · `DEP_GRAPH.json` (1.0M) · `ACTIONS_INDEX.json` (1.5M) · `ACTION_RESOLUTION_INDEX.json` (1.4M) · `WEDM_LATTICE_GRAPH.json` (1.6M) · `cross-session-asset-registry.json` (1.7M) | — | various indices | ❌ | ✅ (CADContentAddressableStore / AwarenessQuery / CAMAIActionLinker / WEDMLatticeGraph / AgentAutoUpdate engines) | ❌ | all engine-wired |
| `state/BASELINE_INVENTORY.json` (1.4K) · `HEALTH_CHECK_REPORT.json` · `extraction-log.json` (56K) | — | anti-regression baselines / extraction dedup log | ✅ canonical (CLAUDE.md) | ✅ | ❌ | KEEP |

## D. Large structured corpus directories

| Dir (abs path) | Size / count | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|
| `mcp-server/data/posts/` | 75 MB · 679 files | ⚠️ post-processor domain | ✅ post engines | ❌ | NC/.cps/post corpus |
| `mcp-server/data/programs/` | 39 MB · 2,888 files (haas/hurco/mastercam/okuma/wire-edm) | ⚠️ | ⚠️ partial | ❌ | NC program corpus |
| `mcp-server/data/tribal/` | 23 MB | ❌ | ⚠️ tribal corpus | ✅ embeddable | see B rows |
| `mcp-server/data/transformers-cache/` (Xenova) | 23 MB | ❌ | ✅ ONNX runtime cache | n/a | embedding-model cache (the engine that DOES gen vectors) |
| `mcp-server/data/training/` | 20 MB · 22 files | ❌ | ⚠️ | ✅ corpus | LoRA/training corpora |
| `mcp-server/data/machine-handbooks/` | 20 MB · 15 files | ❌ | ⚠️ | ✅ embeddable | |
| `mcp-server/data/milestones/` | 15 MB · 761 JSON | ❌ | ✅ envelope readers | ❌ | milestone envelopes |
| `mcp-server/data/video-learned/` (8.9M·69) · `extracted-knowledge/` (3.8M·28) · `ingestion_cache/` (5.2M·40) | — | ❌ | ⚠️ | ✅ embeddable | extraction/learn corpora |

## E. ML model checkpoints

| Store (abs path) | Size / count | Schema | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|
| `mcp-server/data/models/pp-transformer/` | 8 versions · `checkpoint.json` + tiny `.bin` layers (8–20 B) | `{modelId:pp-transformer, parameterCount 125000000, architecture:transformer, weights:[{layerName, shape, dtype:float32, dataPath, checksum}]}` | ❌ | ✅ `MasterPostProcessorAGIOrchestrationEngine.ts` | 🟡 weight `.bin` files are stubs (shape `[5]`, ≤20 B) vs claimed 125M params — **placeholder model** | post-processor transformer; weights not real |
| `mcp-server/data/models/{surface-cnn,tool-life-mlp,cad_param_predictor,test-model-*}` | small checkpoints | checkpoint.json | ❌ | ⚠️ | 🟡 | several `test-model-batch1-*` = test debris, deletable |

---

## Summary counts
- **DB artifacts catalogued: ~46** (3 manifest-corpora + ~17 JSONL ledgers + ~16 JSON index sidecars + ~8 corpus dirs + ~2 model groups).
- **UNPATHED: ~38 of 46** (only jm-die-database, CODE_SYSTEM_INDEX, BASELINE_INVENTORY, extraction-log, HEALTH_CHECK_REPORT, and PATHS.md-mention stores are referenced anywhere).
- **UNWIRED-by-engine: ~9** (`vendor-catalog-db`, `WORLD_SIM_PREDICTIONS.jsonl`, `CAD_CORPUS_ALLVENDOR.jsonl`, `jm-die-full-program-index{,-v2}.json`, `jm-die-corpus-pages.jsonl`, `hook-fire-counts.jsonl` [hook-only], `tribal/*tips.jsonl`, cad-corpus-manifest pair).
- **Consolidation/cleanup targets:** v1 program-index (12.5M dup of v2), cad-corpus-manifest + -recovered pair (dup), `test-model-batch1-*` debris, `CAD_CORPUS_ALLVENDOR.jsonl` (stale dead-worktree paths), `ai-intelligence-log.jsonl` (57.7M unbounded → rotate).
- **GPU-gen opportunities:** `CAM_TRIBAL_RAG_INDEX.json` + `SEMANTIC_SIGNATURES.json` are **TF/term-bag, not dense vectors** — upgrade to Ollama/ONNX dense embeddings; plus all `tribal/*.jsonl` + `jm-die-corpus-pages.jsonl` + machine-handbooks are unembedded RAG text.
