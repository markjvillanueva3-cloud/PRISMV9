# DB-Census — Root: `H:/PRISM/resources/` (resources scout)

**Generated:** 2026-06-04 · **Scope:** every persisted/structured data store under `H:/PRISM/resources/**` (NOT vendor binaries).
**Caveat:** most of the ~250k files in this root are vendor CAD/CAM software *installs* (Inventor 2027, HYPERMILL, MasterCam, DWG TrueView, Freecad, OPEN MIND) — DLLs / `.py` / `.pyc` / CATIA `.catnls` / images. Those are NOT PRISM databases and are excluded from the table below. Extension histogram top hits: `catnls 15162, dll 14470, png 13741, gif 12712, py 12280, pyc 7157` confirm this is install-tree noise.

**Top-level dir sizes (du):** Inventor 2027 11G · MIT COURSES 8.9G · MANUFACTURER_CATALOGS 8.3G · MasterCam 4.2G · HYPERMILL 3.2G · MACHINE MODELS FOR LEARNING 2.6G · Freecad 2.2G · DWG TrueView 1.0G · HSMWorks 26/27 ~0.7G each.

## KNOWN EXISTING CATALOG SURFACES (do not duplicate — linked)
- `resources/RESOURCES-INDEX.md` — **the canonical 80-agent deep audit (2026-04-11, v4)**. Combined asset totals table covers resources/ + JM DIE/. The authoritative human census for this root.
- `mcp-server/data/state/cad-cam-resources-pdf-index.json` (1.08 MB, schemaVersion 1.2.0, gen 2026-05-26) — PDF-only structured index, `totalPdfs:3936` across BOTH roots (resources + jm-die). Pipeline: `scripts/build-cad-cam-resources-pdf-index.mjs` + `query-cad-cam-resources.mjs` + tests. Wiki [[cad-cam-resources-pdf-index]].
- `state/shared/RESOURCE_CENSUS.json` — **STALE/EMPTY** (`total_resources:0`, warning `Unknown type 'banana'`). Backfill ts 2026-05-08 but produced zeros. See GAP.
- `state/shared/RESOURCE_CENSUS_REGISTRY_2026-03-30.json` (11 KB) — older registry snapshot.
- `mcp-server/src/data/mill-resources-index.ts` (MILL-AWARE-MS9) — TS index of mill resources (post/tool_db/...) wired to MillAISelfAwarenessIntegrationEngine.
- `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` — pathes `H:/PRISM/resources` at ROOT (depth-1) into all 34 galaxy PATHS.md.

## DB ARTIFACT TABLE

| # | Path (abs) | Type | Size / Count | Schema shape | PATHED? | WIRED? | GPU-gen? | Consolidation note |
|---|------------|------|--------------|--------------|---------|--------|----------|--------------------|
| 1 | `resources/2- Basic Training Day 2/Training Tools.db` | SQLite 3.x | 3.5 MB, 856 pages, schema v4 | Mastercam tool-library SQLite (binary) | Root-pathed only | **YES** — `TrainingContentIndexEngine.ts` scans the 3 Basic Training dirs | No (binary tool tables) | Tool data overlaps with `.tooldb` set (#7) and PRISM `data/tool-*`; candidate merge into a unified tool corpus |
| 2 | `resources/cad-cam-resources-pdf-index.json` source corpus → `mcp-server/data/state/cad-cam-resources-pdf-index.json` | JSON index | 1.08 MB · 3936 PDFs (both roots) | `{schemaVersion, roots, totalPdfs, byDomain{training,mfg,cam,catalog,machine,cad,blueprint}, bySoftware{hypermill,mit-ocw,...}}` | **YES** | **YES** — `query-cad-cam-resources.mjs` + tribal-by-domain; blueprint-vision/cam/speed-feed PATHS reference | **YES** — PDF text → embeddings; Ollama/GPU candidate | Only structured index of resources/; PDF-ONLY (misses NC/CAD/STL/DXF) |
| 3 | `resources/RESOURCE PDFS/**` | PDF corpus | **513 PDFs** | training/reference docs | Root-pathed | Partial — folded into #2 (`software:misc`) | **YES** — pypdf page extract → embed (use lima extractor) | Largest unclassified PDF bucket; `software:misc 547` in index |
| 4 | `resources/MANUFACTURER_CATALOGS/**` | PDF + data corpus | 8.3 GB · 365 files (**287 PDFs**) | vendor tool/insert catalogs | Root-pathed | Partial — 46 in index as `tool-catalog` | **YES** — catalog OCR → tool params; high-value GPU extract | 287 on-disk vs 46 indexed = **241 catalog PDFs UNINDEXED** |
| 5 | `resources/MIT COURSES/**` | mixed corpus | 8.9 GB · 1106 files (**196 PDFs** + 910 non-PDF: video/notes/code) | MIT-OCW course material | Root-pathed | PDFs in #2 (`mit-ocw 196`); algorithms ported (FDM/FEM/GradientDescent/Lagrangian via KNOWLEDGE-CONVERSION-MS0) | **YES** — transcript/PDF embed | 910 non-PDF MIT files (videos, lecture notes) UNINDEXED |
| 6 | `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/*.js` | JS data/formula files | 320 KB · 3 files | `PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js` (159K), `PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js` (128K), `PRISM_ADVANCED_CROSS_DOMAIN_v1.js` (33K) | NOT pathed | **UNWIRED** — not imported under mcp-server/src | No | PRISM-authored formula corpus sitting orphaned in resources/; should move to `mcp-server/src/data/` and wire to creative-reasoning |
| 7 | `resources/**/*.tooldb` (Mastercam) | binary tool DB | **135 files** (ISCAR/KENNAMET/lathe_inch/mm/DatabaseCatalog...) | Mastercam tool library tables | NOT individually pathed | Partial — `mill-resources-index.ts` tool_db type; MastercamPluginAdapterEngine | No | Vendor tool corpus; merge-candidate with #1 + #8 into unified vendor-tool DB |
| 8 | `resources/{HYPERMILL,OPEN MIND}/**/*.db` (Automation_Center ToolDB/MacroDB, IM_Tool_DB, MacroDB_Template) | binary .db | **68 files** | hyperMILL automation-center tool + macro databases | NOT individually pathed | Partial — HyperMillNonCAMMappingEngine / PostProcessorComprehensiveKnowledgeEngine grep tooldb | No | OPEN MIND macro/tool DBs; duplicated across 31.0 + 33.0 version trees + `addins project` mirror (4x dup) |
| 9 | `resources/{cimco-2025,cimco-2026}/CIMCOEdit/MachineCfg/*/config.json` | JSON config | **71 files** | per-machine CIMCO post config `{axes, kinematics, ...}` | NOT pathed | **UNWIRED** — CIMCO machine kinematics not consumed (CIMCO-INTEGRATION-MS0 is echo's separate work) | No | 35 machine kinematics configs × 2 versions; high-value for 5-axis kinematics wiring |
| 10 | `resources/FUSION360/tool-library/*.csv` | CSV tool tables | 7 files (drills/boring/endmills/turning) | header+rows speeds/feeds per tool | NOT pathed | **UNWIRED** | No | JM-authored Fusion tool libs; should feed SFC/tool-crib |
| 11 | `resources/Freecad/data/Mod/**/*.json` (Hole presets, IFC presets, AddonCatalog) | JSON data | ~30 files | ISO/DIN hole-spec tables, IFC product schemas | NOT pathed | **UNWIRED** (vendor data) | No | FreeCAD install data — ISO hole tables potentially useful for cad-tolerance; low priority |
| 12 | `resources/CAD FILES/` (40f) + `MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/` (272f, 2.6G) + `PART MODELS FOR LEARNING ENGINE/` (31f) | CAD-model corpus | STEP/STP **411** · STL **1172** · DXF **1433** | 3D geometry for learning/simulation | Root-pathed | **UNWIRED to a structured index** — no STEP/STL/DXF index exists | **Partial** — feature-recognition could embed geometry | Named "FOR LEARNING ENGINE" but no learning-engine index ingests them |
| 13 | `resources/**/*.{MIN,nc}` | NC program corpus | **511 programs** | Okuma/Fusion/Multus NC G-code | Root-pathed | Partial — post-processor corpus refs | **YES** — NC tokenize/embed | Small vs JM DIE's 15.6k NC; complementary |
| 14 | `resources/**/*.zip` | compressed archives | **549 zips** | CAM training, post packages, sample parts | NOT pathed | **UNWIRED** (unextracted) | n/a until extracted | 549 sealed archives = dark corpus; none enumerated/extracted |
| 15 | `resources/fusion-addin/PRISM-ExcelBridge/sample_parts.json` | JSON sample data | 1.2 KB | PRISM-authored Excel-bridge sample parts | NOT pathed | Dev fixture | No | Tiny; harmless |

## CLASSIFICATION SUMMARY
- **DB artifacts found (rows above):** 15 distinct stores/corpora.
- **PATHED:** only at ROOT (depth-1) via CRITICAL-RESOURCE-ROOTS → all 34 galaxy PATHS.md. NONE of the individual sub-stores (#6, #9, #10, #11, #12-index, #14) are individually pathed.
- **UNPATHED (individually):** #6 formulas, #9 cimco configs, #10 fusion CSVs, #11 freecad data, #12 CAD-model index, #14 zips, #15 sample → **7 of 15**.
- **UNWIRED (no engine consumes):** #6 MACHINING-KNOWLEDGE formulas, #9 cimco configs, #10 fusion tool CSVs, #11 freecad data, #14 zips, plus the **non-PDF CAD/STL/DXF corpus (#12) has no structured index** → **~6 of 15**.
- **GPU-gen opportunity (embedding/OCR pass):** #2 PDF index, #3 RESOURCE PDFS, #4 MANUFACTURER_CATALOGS (241 unindexed), #5 MIT, #13 NC → 5 corpora are LLM/embed-extract candidates routable to Ollama/GPU.

## TOP GAPS / CONSOLIDATION OPPORTUNITIES
1. **`RESOURCE_CENSUS.json` is dead (total_resources:0, "banana" warning).** The system has an EMPTY top-level census while `RESOURCES-INDEX.md` (human) and `cad-cam-resources-pdf-index.json` (PDF-only) carry the real data. The census scanner needs re-running / fixing — this is the single highest-value DATA-INTEGRITY gap.
2. **PDF index is PDF-ONLY.** The structured index covers 0 of: 411 STEP/STP, 1172 STL, 1433 DXF, 511 NC/MIN, 549 ZIPs, 71 cimco configs. The dirs literally named "FOR LEARNING ENGINE" feed nothing. Highest-value BUILD gap = a non-PDF corpus index (CAD geometry + NC) to unlock feature-recognition/NC-tokenize training.
3. **241 MANUFACTURER_CATALOG PDFs unindexed** (287 on-disk vs 46 in index) — direct tool-parameter extraction value, GPU-OCR candidate.
4. **Tool-DB fragmentation:** Training Tools.db (#1) + 135 `.tooldb` (#7) + 68 OPEN MIND `.db` (#8) + 7 Fusion CSVs (#10) are 4 disjoint vendor-tool stores; consolidation into one queryable tool corpus would dedupe ISCAR/KENNAMET/Sandvik overlap.
5. **PRISM-authored orphans in resources/:** the 3 `MACHINING KNOWLEDGE FORMULAS` `.js` files (320 KB of cross-disciplinary formulas) are unwired — belong in `mcp-server/src/data/` feeding PRISMCreativeReasoningEngine.
