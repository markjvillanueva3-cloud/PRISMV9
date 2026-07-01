# JM DIE Folder — DB Census & File Inventory

**Root:** `H:/PRISM/JM DIE/`
**Scout:** db-census (jm-die-folder root)
**Date:** 2026-06-04
**Method:** real `find / ls / head` enumeration (no estimates). `du -sh` failed (exit 255, tree too large for sandbox) — sizes are per-artifact where measured.

## Headline
- **Total files in tree: 317,137** (`find . -type f | wc -l`).
- **PATHED:** YES — `H:/PRISM/JM DIE` is one of the 3 CRITICAL-RESOURCE-ROOTS (`CRITICAL-RESOURCE-ROOTS.json` line 74) + referenced in 10+ galaxy `PATHS.md` (mill, lathe, cam, cad, wedm, speed-feed, post-processor, shop-floor, quoting, knowledge-conversion, discovery, compliance-safety, corpus-aggregation, hermes-zulu).
- **WIRED:** PARTIALLY — the *consolidated* `jm-die-database/` (metadata index) is consumed by `MillProgramCorpusEngine.ts`; the raw geometry/program/CAM payloads are NOT individually databased.

---

## File-Category Counts (real, by extension across full tree)

| Category | Extensions | Count | Databased? |
|---|---|---|---|
| **Prints / blueprints** | `.pdf` | **85,346** | METADATA only (via Docustrata `jm-die-database` document index, 73,506 v3-enriched; PDFs themselves not OCR-extracted into a content store from this folder) |
| | `.tif/.tiff` | 0 | n/a |
| **CNC programs** | `.nc` | **119,255** | NO — file-listed in `files.jsonl` (10.8MB), but program bodies/toolpaths NOT parsed into a structured store |
| | `.min` (Okuma/Mazak) | **34,990** | NO |
| | `.cyc` (cycle) | 2,876 | NO |
| | `.eia/.h/.pgm/.cnc/.hnc/.fnc/.nclist` | 218 | NO |
| **CAM files** | `.mcx-8` (Mastercam X8) | **14,769** | NO — binary, not extracted |
| | `.mcx / .mcx-6` | 2,855 | NO |
| | `.hmc` (hyperMILL) | 33 | NO |
| | `.hypermill/.invhsm-template/.hsmlib` | 17 | NO |
| | `.mcam` | 1 | NO |
| **CAD files** | `.ipt` (Inventor part) | **10,664** | NO (binary) |
| | `.dxf` | **7,772** | NO |
| | `.f3d` (Fusion) | 1,737 | NO |
| | `.iam` (Inventor asm) | 1,250 | NO |
| | `.idw` (Inventor drawing) | 361 | NO |
| | `.step/.stp` | 2,307 | NO (PRISM has STEP readers, not run over this corpus) |
| | `.dwg` | 231 | NO |
| | `.x_t/.x_b` (Parasolid) | 130 | NO |
| | `.stl` | 101 | NO |
| | `.sldprt/.slddrw` | 54 | NO |
| | `.iges/.igs` | 12 | NO |
| | `.catpart` | 3 | NO |
| **Post-processors** | `.cps` (HSM/Fusion) | **301** | YES — indexed in `POST-PROCESSORS/POST-PROCESSOR-MANIFEST.json` (676 .cps repo-wide) + PRISM-modified set tracked |
| | `.pst` (legacy post) | 26 | YES (manifest, 52 repo-wide) |
| **Docs / quotes** | `.xlsx/.xlsm/.xls` | 19 | NO (incl. root `Automated Program_Corrected 5-25.xlsm` 5.6MB VBA macro book) |
| | `.docx/.doc` | 6 | NO |
| | `.csv` | 4 | NO |
| **PRISM-gen sidecars** | `.json` | **30,896** | PRISM-PRODUCED (see DB Artifacts below) |
| **Other** | `.tcl/.txt/.xml/.zip/.cls(VBA)/.dvb` | ~600 | NO |

---

## DB Artifacts (persisted data stores found IN this root)

| # | Path | Type | Size / count | Schema shape | PATHED | WIRED | GPU-gen opp | Consolidation note |
|---|---|---|---|---|---|---|---|---|
| 1 | `H:/PRISM/JM DIE/Prism JM Die/**/part.json` | JSONL-equiv corpus of per-part extraction sidecars | **30,896 files** (20,861 in `_UNASSIGNED`; rest customer-foldered: FASTENAL 1312, ALLFAST 1233, AGRATI 840, FONTANA 583, OPTIMAS 493…) | `part.json` per CAMCAR/customer part dir — PRISM print/program extraction output | partial (folder PATHED, files not) | **NO** — produced by a PRISM pass but not loaded by any dispatcher/engine | **YES** — 20,861 `_UNASSIGNED` parts need customer/feature classification = ideal Ollama/GPU embedding+classify pass | **HIGH-VALUE GAP** — this is the print-to-program extraction substrate, sitting un-databased & 67% unassigned |
| 2 | `H:/PRISM/JM DIE/POST PROCESSORS/POST-PROCESSOR-MANIFEST.json` | manifest store | ~schemaVersion 1.0.0, total 10,051 post files, by_format + by_brand rollups (scan roots: resources + JM DIE) | `{schemaVersion, scan_roots, counts:{total,by_format,by_brand}}` | YES (post-processor PATHS.md) | YES (post-processor galaxy) | no | canonical — no dup |
| 3 | `H:/PRISM/JM DIE/lathe-ai-training-report.json` | training-report sidecar | 10,786 B | lathe AI training run output | YES (CRITICAL-RESOURCE-ROOTS line 150, ai-training PATHS) | partial (referenced, consumer unclear) | maybe (retrain artifact) | single report, keep |
| 4 | `H:/PRISM/JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.json` | machine-config sidecar | machine def | machine model JSON | partial | NO | no | candidate for machine-model store |
| 5 | `H:/PRISM/JM DIE/TRIBAL + WIKI/**` | tribal knowledge corpus dir | (dir) | tribal tips / wiki source | YES (tribal-knowledge PATHS) | YES (tribal injection) | no | already in PSN tribal leg |

### EXTERNAL consolidated store (built FROM this folder — link, do not duplicate)
| Path | Type | Size | Shape | Note |
|---|---|---|---|---|
| `H:/prism/mcp-server/data/jm-die-database/` | consolidated metadata DB | manifest 9.2KB; `tables/documents.jsonl` **59.7MB**; `tables/files.jsonl` **10.8MB**; 4 catalog JSONs (tooling 49.7KB, stock-material 32.3KB, master-manifest 38.8KB) | manifest: `{corpus:{jm_die_files_indexed:38251, blueprint_program_joins:76205, indexed_documents:111745, classified_v3_enriched:73506}, rollups}` | Builder: `scripts/build-jm-die-database.mjs` (owner slot juliett). WIRED via `MillProgramCorpusEngine.ts`. Indexes Docustrata (257,992 files) + JM DIE file paths — **METADATA/JOINS only, NOT geometry/program content**. |

---

## PATHED / WIRED Verdict

- **`jm-die-database/`** (the consolidated index): PATHED + WIRED. Indexes 38,251 JM DIE file paths + 73,506 enriched docs as a metadata/join layer.
- **Raw payloads** (119,255 NC, 34,990 min, 14,769 mcx-8 CAM, 10,664 ipt CAD, 7,772 dxf, 85,346 pdf): file paths are LISTED in `files.jsonl` but **content is NOT parsed into any structured store** — these are databased only at the filename/path level, not as queryable program/geometry/feature records.
- **30,896 `part.json` sidecars** under `Prism JM Die/`: PRISM-produced but **orphaned** — no dispatcher/engine loads them.

---

## Known catalog surfaces (linked, not duplicated)
`state/shared/RESOURCE_CENSUS.json` · `state/shared/JM-DIE-PROGRAM-CATALOG.md` · `state/shared/PRISM_SHARED_INDEX_SURFACES.md` · `mcp-server/data/jm-die-database/manifest.json` · `mcp-server/data/vendor-catalog-db/manifest.json` · `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (line 74 = this root).
