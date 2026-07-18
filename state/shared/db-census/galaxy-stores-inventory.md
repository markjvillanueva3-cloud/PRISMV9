# Galaxy-Stores DB Census — `mcp-server/src/engines/*/` (34 galaxies)

> Scout root: per-galaxy data stores + PATHS.md DB-pointer coverage. Generated 2026-06-04 by db-census scout (galaxy-stores).
> Method: real `find/ls/wc/du/grep` enumeration, NOT estimates. Galaxy data stores live OUTSIDE the engine dirs (in `mcp-server/data/`, `state/shared/`); PATHS.md files are the per-galaxy atlas that should point at them.
> KNOWN catalog surfaces (linked, not duplicated): `state/shared/RESOURCE_CENSUS.json`, `state/shared/RESOURCE_CENSUS_REGISTRY_2026-03-30.json`, `state/shared/databases/`, `mcp-server/data/jm-die-database/manifest.json`, `mcp-server/data/vendor-catalog-db/manifest.json`, `data/databases/DB_MANIFEST.json` (30 DBs, repo-root), `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`, the 34 galaxy `PATHS.md`.

## Headline structural facts
- **34 galaxies, all have `PATHS.md`** (100% present). Engine dirs themselves hold almost NO data files — only 2: `database-expansion/CRITICAL-RESOURCE-ROOTS.json` (13.5KB) + a stray `engines/mcp-server/data/state/ollama-offload-stats.json` (166B). All real stores are external, reached via PATHS.md pointers.
- **412 galaxy-relevant DB artifacts** across `mcp-server/data/{state,tribal,quality,ingestion_cache,vendor-catalog-db,jm-die-database}` + `state/shared/nn-graph`. Breakdown: 244 `data/state/*.{json,jsonl}` (incl. **47 WEDM_\***), 7 tribal jsonl, 3 quality, 30 ingestion_cache jsonl, 11 nn-graph, 13 embedding sidecars.
- **16 of 34 galaxy PATHS.md are `auto-derived baseline`** — store-blind: they carry only the shared 3-root CRITICAL-RESOURCE-ROOTS boilerplate (repeated verbatim in all 34) and DO NOT point at their own owned domain stores. These are the coverage gaps.

## Per-galaxy PATHS.md DB-pointer quality

| Galaxy | PATHS lines | DB-ptrs | Baseline? | Owns real stores? | PATHS points at them? | Note |
|---|---|---|---|---|---|---|
| database-expansion | 130 | 61 | no | DB_MANIFEST (30 DBs), jm-die-database, vendor-catalog-db | YES | gold standard; owner=juliett |
| wedm | 156 | 28 | no | **47 `WEDM_*` state stores** (lattice/GNN/ledgers/corpus) | YES (exemplary, all 47 enumerated) | best per-galaxy atlas |
| post-processor | 178 | 38 | no | NC/.cps corpus, controller data | YES | dense |
| speed-feed | 129 | 31 | no | SFC vendor parity (HSMAdvisor/G-Wizard) | YES | dense |
| ai-training | 120 | 33 | no | nn-graph stores, LoRA checkpoints, RAG corpus | mostly | check 768d embed pointers |
| cam | 121 | 31 | no | CAM corpus (Mastercam/hyperMILL) | YES | |
| lathe | 151 | 30 | no | turning corpus, JM lathe programs | YES | |
| business | 145 | 28 | no | Docustrata, ERP/quote stores | YES | |
| corpus-aggregation | 78 | 27 | **YES** | **3 `CAD_CORPUS_*.jsonl` + 30 ingestion_cache jsonl** | NO (baseline only) | GAP — owns corpus, blind to it |
| mill | 130 | 25 | no | mill engines, VMC fleet | partial | |
| quoting | 129 | 25 | no | vendor-catalog-db, Docustrata pricing | YES | |
| blueprint-vision | 108 | 25 | no | CAD_CORPUS_ALLVENDOR.jsonl, OCR stores | partial | |
| dormant-data | 95 | 24 | **YES** | dormant/orphan ledgers | NO (baseline) | GAP |
| discovery | 111 | 20 | no | master-index, coverage audits | partial | |
| pdf-corpus | 91 | 20 | **YES** | **30 ingestion_cache jsonl (pypdf 8,752-pg)** | NO (baseline) | GAP — owns the PDF corpus, blind |
| pdf-corpus-mill | 89 | 17 | **YES** | mill PDF extractions | NO (baseline) | GAP |
| cad | 117 | 17 | no | CAD feature/STEP stores | partial | |
| academy | 101 | 15 | no | course-0a..60, MIT-OCW corpus | YES | |
| hermes-zulu | 96 | 15 | no | agent-fleet state | partial | |
| system-viz | 82 | 15 | no | **548MB graph + `_node-embeddings.jsonl.partial` (556MB)** | partial | embed sidecar UNDER-pointed |
| token-optimization | 77 | 13 | no | offload-stats, token-budget-telemetry | partial | |
| fleet-hygiene | 64 | 13 | no | reaper/sweep ledgers | partial | |
| cad-fusion-live | 90 | 10 | **YES** | session-pattern stores | NO (baseline) | GAP |
| knowledge-conversion | 96 | 9 | **YES** | 6-node router stores | NO (baseline) | GAP |
| agent-orchestration | 94 | 8 | **YES** | orchestration state | NO (baseline) | GAP |
| quality | 72 | 8 | **YES** | **`data/quality/{audit-log.jsonl,job-history.json,parameter-priors.json}`** | NO (0 pointers to data/quality/) | GAP — Cpk/SPC stores blind |
| tribal-knowledge | 93 | 8 | **YES** | **7 `data/tribal/*.jsonl` (17.5MB jm-corpus-pages)** | NO (baseline) | GAP — owns tribal store, blind |
| shop-floor | 103 | 7 | **YES** | WEDM_MACHINE_STATE.json, live-machine | NO (baseline) | GAP |
| compliance-safety | 88 | 7 | **YES** | cost-alarm-config, S(x) gate state | NO (baseline) | GAP |
| wiring | 95 | 6 | **YES** | DISPATCHER/ENGINE_DIGEST | NO (baseline) | GAP (low-data domain — acceptable) |
| frontend-app | 83 | 6 | **YES** | BUILD_STATE.json (consumer only) | partial | low-data domain — acceptable |
| mit-curriculum | 58 | 5 | **YES** | MIT-OCW source corpus | NO (baseline) | GAP |
| backend-helper | 52 | 5 | **YES** | none owned (build/TSC assist) | n/a | acceptable (no stores) |
| bug-hunting | 50 | 5 | **YES** | system-graph.json (consumer) | n/a | acceptable (no stores) |

## Major DB artifacts (cross-galaxy, by size) — type · size · schema · PATHED · WIRED · GPU-gen

| Path | Type | Size | Schema shape | PATHED | WIRED | GPU-gen | Consolidation |
|---|---|---|---|---|---|---|---|
| `state/shared/system-viz/_node-embeddings.jsonl.partial` | embedding sidecar (JSONL) | **556MB** | per-node `{id, vector[768]}` | weak (system-viz) | 3 consumers | **YES — Ollama/GPU embed pass; `.partial` = INTERRUPTED, never finalized** | merge-target w/ nn-graph 768d |
| `state/shared/tribal-embed-index.json` | embedding index (JSON) | **508MB** | tribal-tip→vector map | yes (tribal) | 3 consumers (+`.bak` 7.8MB) | **YES — embed pass** | dup w/ `.tribal-embed-index.bak.json` + blurbs-cache |
| `mcp-server/data/jm-die-database/tables/documents.jsonl` | corpus table | 57MB | per-doc enriched record | YES (manifest) | yes | partial (OCR done) | canonical — do NOT re-OCR |
| `mcp-server/data/state/ai-intelligence-log.jsonl` | append-only ledger | 57MB | reasoning-trace events | partial | 1 consumer | no | rotation candidate |
| `mcp-server/data/state/hook-fire-counts.jsonl` | telemetry ledger | 26MB | hook→fire-count events | no | yes | no | rotation candidate |
| `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` | tribal corpus | 17.5MB | per-page tribal text | **NO (tribal-knowledge baseline)** | yes | embed-source | feeds tribal-embed-index |
| `state/shared/nn-graph/node-embeddings-768d.jsonl` | embedding sidecar | 7.2MB | `{nodeId, emb[768]}` | yes (ai-training) | 3 consumers | **YES — GraphSAGE feature pass** | merge w/ system-viz partial |
| `mcp-server/data/tribal/*.jsonl` (×7) | tribal stores | ~24MB | tribal tips by source | **NO (baseline)** | yes | embed-source | — |
| `mcp-server/data/quality/audit-log.jsonl` + 2 | SPC/Cpk stores | ~240KB | audit + job-history + priors | **NO (0 ptrs)** | yes | no | — |
| `mcp-server/data/state/WEDM_*` (×47) | per-galaxy state | varies (lattice 1.5M, GNN 131K) | per-store typed | YES (wedm exemplary) | yes | GNN-weights GPU-gen | model — replicate this coverage |
| `data/databases/DB_MANIFEST.json` | central registry | 22KB | `{version, total_databases:30, databases[]}` | partial | yes | no | **PATHS.md points at WRONG path** (see below) |

## STALE / BROKEN POINTERS found
- **`DB_MANIFEST.json` path is wrong fleet-wide.** Galaxy PATHS.md (compliance-safety, shop-floor, quality, ...) reference it as `data/databases/DB_MANIFEST.json` discoverable via `prism_data:database_list`, but the file lives at **repo-root `H:/prism/data/databases/DB_MANIFEST.json`** (22KB, 30 DBs) — `mcp-server/data/databases/DB_MANIFEST.json` does NOT exist. Any galaxy resolving the manifest relative to `mcp-server/` will miss it.
- **`WEDM_DIGEST.json`** — wedm PATHS.md itself flags root CLAUDE.md says `data/docs/` but file is in `data/state/` (already self-corrected in atlas).
- **`_node-embeddings.jsonl.partial`** (556MB) — `.partial` suffix means the embedding pass was interrupted and the canonical `_node-embeddings.jsonl` was never produced; consumers may be reading a half-written file.

## GPU-gen opportunities (embedding/LLM passes that could be Ollama/GPU-accelerated)
1. `tribal-embed-index.json` (508MB) + 7 `data/tribal/*.jsonl` source corpus → re-embed on Blackwell qwen2.5-coder/embed model; currently a slow CPU pass (evidence: `embed-engines-detached.log`, in-progress pool-wiring tasks #1-3).
2. `system-viz/_node-embeddings.jsonl.partial` (556MB, interrupted) → finalize via GPU embed pass.
3. `nn-graph/node-embeddings-768d.jsonl` (7.2MB) → GraphSAGE feature embed, GPU candidate.
4. WEDM_GNN_WEIGHTS.json → GNN training pass, GPU.

## Consolidation opportunities
- **Embedding-sidecar sprawl:** `tribal-embed-index.json` (508MB) + `.tribal-embed-index.bak.json` (7.8MB) + `tribal-embed-index.blurbs-cache.json` (3.2MB) + `system-viz/_node-embeddings.jsonl.partial` (556MB) + `nn-graph/node-embeddings-768d.jsonl` (7.2MB) + `memory-embeddings-sidecar.json` (14.9MB) = **6 separate 768-d embedding stores, ~1.1GB, no shared HNSW index.** Single canonical 768-d vector store (one schema, one finalize/rotate path) would dedupe + unblock the `.partial`.
- **`data/state/*.jsonl` ledger rotation:** ai-intelligence-log (57MB) + hook-fire-counts (26MB) un-PATHED, un-rotated.
