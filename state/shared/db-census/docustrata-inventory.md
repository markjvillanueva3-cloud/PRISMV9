# Docustrata Root — DB Census (db-census scout)

**Root:** `H:/PRISM/Docustrata/` · **Total files:** 257,992 (verified `find -type f`; matches CRITICAL-RESOURCE-ROOTS + jm-die-database manifest) · **Survey:** read-only, real commands · **Date:** 2026-06-04

## Verdict up front
- **Has manifest + index:** YES. `manifest.json` (66.2 MB DocuStrata export rollup, 111,745 docs) + `.index/` (the real PRISM-built OCR/classification/join DB layer, ~796 MB of JSONL+JSON). **Per CLAUDE.md: never re-OCR — search the manifest + `.index/`.**
- **Consolidated into `mcp-server/data/jm-die-database/`:** YES, via `scripts/build-jm-die-database.mjs` (owner slot juliett, built 2026-05-29). The consolidator copies `documents.jsonl` (59.7 MB) + `files.jsonl` (10.8 MB) into `tables/`, registers the 76,205-row blueprint join by reference (does NOT copy the 61 MB), and writes a back-verified `manifest.json`.
- **PATHED:** YES — root is in `CRITICAL-RESOURCE-ROOTS.json` (`id:"docustrata"`, `ownIndex` points at `.index/*.jsonl + jm-die-index-v2.json + manifest.json`) and auto-wired into all 34 galaxy `PATHS.md`. NOT in `PRISM_SHARED_INDEX_SURFACES.md` (0 hits).
- **WIRED (runtime-consumed by an engine, not just produced):** PARTIAL. Only `tables/files.jsonl` is consumed at runtime (`MillProgramCorpusEngine` `DEFAULT_INDEX_PATH`). The far larger `documents.jsonl` (111,745 docs) + the 76,205-row blueprint↔program join are **registered/consolidated but have NO runtime engine consumer**.
- **Fraction databased vs orphaned:** ~100% of the corpus is *indexed* (111,745 docs in manifest; 73,506 v3-classified/enriched; 56,887 have a text layer; 44,012 verified print pages across 13,316 docs). What is **orphaned** is not the source files but the high-value *derived* DB: the print→program join (76,205 PNs, only 5.2% machine-matched) and the document-level table are not read by any dispatcher/engine.

## DB artifacts (ranked by value)

| Path | Type | Size / rows | Schema shape (head) | PATHED | WIRED | GPU-gen? | Consolidation note |
|---|---|---|---|---|---|---|---|
| `H:/PRISM/Docustrata/manifest.json` | DocuStrata export rollup (JSON array meta) | 66.2 MB / 111,745 docs | `{export_version, exported_at, platform, summary:{total_documents:111745, total_tags:2826, tags[]}, ...}` | YES (ownIndex) | indirect (consolidator reads it) | no (vendor export) | source-of-truth rollup; jm-die-database manifest derives counts from it |
| `.index/blueprint-program-join-full-v6.jsonl` | append JSONL — print↔program/CAD join | 61.9 MB / 76,205 PN records | `{part_number, part_number_normalized, blueprints:[{doc_id,filename,page_index,drawing_score}], ... matches}` | YES (`.index/*.jsonl`) | **NO runtime consumer** (registered by reference only) | **YES** — fuzzy/score join; GPU/LLM could lift 87.9% miss rate | latest of v0..v6 join chain; only v6 used by build script |
| `.index/phase20-verified-prints.jsonl` | append JSONL — per-page verified print index | 18.1 MB / 44,012 print pages | `{doc_id, filename, disk_path, page_index, part_numbers[], drawing_number, revision, material, customer, is_drawing_likely}` | YES (`.index/*.jsonl`) | **NO** (input to v6 join only) | **YES** — produced by deep-OCR pass | feeds v6 join; `-by-doc.jsonl` (6.5 MB) is the multi-print rollup |
| `.index/phase15-deep-rescan-parallel.jsonl` | append JSONL — per-page deep-OCR results | 65.3 MB / 151,265 page records (106,906 deduped) | per-page OCR text + scores | YES (`.index/*.jsonl`) | **NO** (intermediate) | **YES** — this IS the OCR output (PaddleOCR/MinerU/Gemini-vision tiers) | superseded into phase20; raw OCR cache |
| `.index/documents-classified-v3.jsonl` | append JSONL — doc classification | 66.7 MB / ~111K docs | role/source/customer classification per doc | YES | indirect → `tables/documents.jsonl` | partial (LLM-tier classify) | v3 is canonical (v0/v2 stale dupes) |
| `.index/documents-text-extracted-v3.jsonl` | append JSONL — text-layer extraction | 61.7 MB | extracted text per doc | YES | indirect | no (PDF text layer) | v3 canonical; v0/v2 stale dupes |
| `.index/jm-die-index-v2.json` | JSON array — JM DIE CAD/program file index | 10.9 MB / ~38K files | `[{path,name,stem,ext,customer,machine,kind,size,mtime}]` | YES (named in ownIndex) | indirect → `tables/files.jsonl` | no (disk walk) | v2 canonical; v1 (7 MB) stale |
| `.index/disk-index.json` | JSON array — full Docustrata disk walk | 26.4 MB | `[{path,name,stem,folder,size}]` | YES | no | no | disk-walk cache |
| `.index/pdf-page-counts.jsonl` | append JSONL — per-PDF page counts | 32.0 MB | `{doc_id, pages, ...}` | YES | no | no | pipeline intermediate |
| `.index/low-confidence.jsonl` | append JSONL — low-conf classifications | 38.7 MB | classification records below threshold | YES | no | YES (rescue via better model) | rescue queue — re-OCR candidates |
| `.index/phase7-drawing-candidates.jsonl` | append JSONL — drawing candidates | 16.6 MB | candidate drawing pages | YES | no | YES | text-density scan output |
| `.index/phase8-classified-pages.cleaned.jsonl` | append JSONL — tiered blueprint classifier | 9.0 MB | `{doc_id,page,class,...}` | YES | no | YES (tiered vision classifier) | cleaned variant canonical |
| `.index/training-triples-v4.jsonl` | append JSONL — print→program training triples | 74 KB | strict (blueprint,program,label) triples | YES | **NO** (training corpus, unconsumed) | n/a | **high value for india AI-training**, currently orphaned |
| `.index/phase23-customer-folder-index.json` | JSON — customer↔folder map | 6.1 MB | customer → docs mapping | YES | no | no | customer rollup |
| `.index/program-internal-names.json` | JSON — program internal-name keys | 5.0 MB / 22,110 keys | internal-name → program file | YES | indirect (join input) | no | join channel source |
| `.index/folder-to-docs.json` / `notebook-to-docs.json` / `role-to-docs-v3.json` / `source-to-docs.json` / `tag-to-docs.json` | JSON inverted indexes | 0.2–4.4 MB each | `{key:[doc_id,...]}` | YES | no | no | inverted indexes over manifest; query helpers |
| `mcp-server/data/jm-die-database/tables/documents.jsonl` | **consolidated** doc table | 59.7 MB / 111,745 docs | normalized DocuStrata doc records (1 line/doc) | YES (jm-die-db manifest) | **NO runtime engine consumer** | derived | **MAIN GAP** — built, registered, unread by runtime |
| `mcp-server/data/jm-die-database/tables/files.jsonl` | **consolidated** file index | 10.8 MB | CAD/program file records | YES | **YES** — `MillProgramCorpusEngine.DEFAULT_INDEX_PATH` | no | the one wired table |
| `mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json` | catalog JSON | 32.3 KB | stock/material catalog (JM-TOOLING-STOCK/U-JMTS01) | YES | partial | no | separate juliett build |
| `mcp-server/data/jm-die-database/jm-die-tooling-catalog.json` | catalog JSON | 49.7 KB | tooling catalog | YES | partial | no | separate juliett build |
| `mcp-server/data/jm-die-database/reports/report-from-jm-tool-die-llc.{json,txt}` | report extract | 5.3 MB txt | extracted text of the named 2.4 MB PDF | YES | no | no | report PDF text cache |

## Corpus body (source files, indexed by the DB above — NOT separate stores)
- 18 top-level folders (`JMD Acct RecPay`, `JMD Orders Closed`, `JMD Quotes`, `JMD Sales Orders`, `JMD Scans`, `_Imported_*`, `My Notebook`, `Unfiled`, `Untitled Folder`, `_organized/` [146,309 files], etc.) + `Report_from_J.M._Tool__Die_LLC.pdf` (2.4 MB).
- Doc-role rollup (from jm-die-db manifest): NOTE 26,572 · SALES_ORDER 21,543 · SCAN_GENERIC 20,349 · CLOSED_ORDER 12,773 · SCAN_BUSINESS 12,501 · PRINT (drawings) ... ; documents_total_bytes ≈ 95.6 GB.
- **All of these are databased** through manifest + `.index/`; CLAUDE.md rule applies: pathway = root + its index, never re-OCR / never re-enumerate into galaxy files.

## Pipeline (`.index/`) provenance
24-phase Python pipeline (`docustrata-pipeline.py` + `phase0`..`phase23-*.py`): disk-index → classify → text-extract → orphan-recovery → tiered blueprint classify (phase8, PaddleOCR/MinerU/Gemini-vision) → deep-rescan (phase15) → verified-prints (phase20) → blueprint↔program join (phase16 v6) → customer-folder match (phase23). `FUTURE_WORK_GCODE_EXTRACTION.md` flags an unbuilt G-code-extraction phase.

## Consolidation / dedup notes
- **Version chains are duplicate stores kept on disk:** join v0,v2,v3,v4,v5,v6 (~131 MB total; only v6 live); documents-classified v0/v2/v3; documents-text-extracted v0/v2/v3; jm-die-index v1/v2; role-to-docs v0/v2/v3. ~250+ MB of superseded JSONL/JSON could be archived (only the `-v{latest}` and the canonical are read).
- `disk-ghosts.jsonl`, `t1-conflicts*.jsonl`, `phase22-delta-pdfs.jsonl`, `phase6b-delta-errors.jsonl` are 0-byte (clean state markers).
- The consolidated `tables/files.jsonl` ⊂ `jm-die-index-v2.json` (same JM DIE CAD walk) — one is the live wired copy, the other the source.

## Cross-links (do not duplicate)
`mcp-server/data/jm-die-database/manifest.json` · `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (`id:docustrata`) · `scripts/build-jm-die-database.mjs` (consolidator) · `scripts/docustrata/phase16-blueprint-program-join-v6.py` + `phase20-verified-prints-index.py` (generators) · `state/shared/JM-DIE-PROGRAM-CATALOG.md` · 34× galaxy `PATHS.md`. Reference memory: `reference_critical_resource_roots_2026_05_30`.
