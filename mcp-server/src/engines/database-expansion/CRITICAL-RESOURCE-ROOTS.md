# Critical Resource Roots — fleet atlas

> GENERATED from `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` by `scripts/wire-galaxies-to-resource-roots.mjs` — do not hand-edit.
> Owner: juliett · consumers: all galaxies (fleet-wide; wired via scripts/wire-galaxies-to-resource-roots.mjs) · verified-on-disk 2026-05-30.

The 3 operator-designated most-important folders in PRISM. Every galaxy's PATHS.md carries a marked pointer to these (re-run the script to re-wire). The pathway is the **root + its own index** — deep file enumeration lives in each root's index (e.g. Docustrata `manifest.json` + `.index/`), never copied per-galaxy.

## H:/PRISM/resources

**Role:** CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries.

- **Files:** 164,039
- **Own index:** H:/PRISM/resources/RESOURCES-INDEX.md

| Top-level folder | Purpose |
|---|---|
| `1- Basic Training Day 1` | CAD/CAM basic training day 1 (2D drawing, basic CAD, chain, shapes) |
| `2- Basic Training Day 2` | training day 2 (3D part, cavity/basic mold, hyperMILL basic, MAXX roughing, tool DB) |
| `3- Basic Training Day 3` | training day 3 (advanced 2D, drilling/contours/pockets, rib & groove, final exercise) |
| `CAD FILES` | loose CAD model files |
| `cam-acquired-2026-05-27` | CAM assets acquired 2026-05-27 |
| `DWG TrueView 2027 - English` | Autodesk DWG TrueView 2027 viewer install (app internals; DWG/DXF viewing) |
| `excel_extract` | extracted Excel workbook contents |
| `Freecad` | FreeCAD install + Mod/Ext (open-source CAD seat) |
| `FUSION 360 PROGRAMS` | Fusion 360 CAM programs / sample projects |
| `FUSION BASIC POSTS` | baseline Fusion post-processors (.cps) |
| `FUSION POSTS` | Fusion post-processor library (.cps) |
| `FUSION360` | Fusion 360 design/CAD files + projects |
| `fusion-addin` | PRISM Fusion add-in (PRISM-ExcelBridge) source |
| `GENERIC MACHINE MODELS` | generic machine kinematic models |
| `GENERIC_MACHINE_MODELS` | generic machine models (snake_case mirror) |
| `HSMWorks 2026` | HSMWorks 2026 CAM seat assets |
| `HSMWorks 2027` | HSMWorks 2027 CAM seat assets |
| `HYPERMILL` | hyperMILL CAM assets |
| `Inventor` | Autodesk Inventor files |
| `Inventor 2027` | Inventor 2027 assets |
| `inventor-hsm` | Inventor HSM CAM assets |
| `MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` | machine models feeding the learning/sim engine |
| `MACHINE_SIMULATION_MODELS` | machine-simulation kinematic models |
| `MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` | machining formulas + algorithms reference (speed/feed/physics knowledge) |
| `MACRO PROGRAMS` | controller macro programs (G-code macros) |
| `MANUFACTURER_CATALOGS` | tool/insert manufacturer catalogs (cutting-data source corpus) |
| `MasterCam` | Mastercam CAM assets + posts |
| `MIT COURSES` | MIT OCW course material (academy curriculum source) |
| `MULTUS PROGRAMS` | Okuma MULTUS multi-tasking lathe programs |
| `OKUMA MULTUS PDFS` | Okuma MULTUS reference PDFs |
| `OPEN MIND` | OPEN MIND (hyperMILL) E-Learning + assets |
| `PART MODELS FOR LEARNING ENGINE` | part models feeding the learning engine |
| `PDF` | general PDF reference corpus |
| `POSTS AND MACHINES` | post-processors + machine definitions |
| `PRISM CAD-CAM TRAINING` | PRISM-authored CAD/CAM training material |
| `PRISM FOLDER FROM HOME` | imported home PRISM working folder |
| `RESOURCE PDFS` | resource PDF corpus |
| `SOLIDCAM` | SolidCAM CAM assets |
| `SOLIDWORKS` | SolidWorks CAD files |
| `TOOL_HOLDER_CAD_FILES` | tool-holder CAD models (holder geometry library) |
| `Training Videos(1).2IlEDvUm.zip` | extracted training-videos archive FOLDER (despite .zip name it is a directory of CAD/CAM training videos) |
| `Virtual_Machine_Creator` | virtual-machine (machine-sim) creator tool |
| `Virtual_Machine_Viewer` | virtual-machine viewer tool |
| `Virtual_Machining_Center` | virtual machining center sim assets |
| `winmax-docs` | Hurco WinMax control documentation |
| `WORKHOLDING AND FIXTURE CATALOGS` | workholding + fixture vendor catalogs |
| `ZIP FILES FROM CLAUDE` | archived zips produced by prior Claude sessions |

**Notable files:** `RESOURCES-INDEX.md (existing index)` · `MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/* (physics/speed-feed knowledge)` · `Automated Program_Corrected 5-25.xlsm (lathe automation workbook)` · `WinMax Mill CUTTER COMPENSATION.pdf / RECOVERY AND RESTART.pdf (Hurco control docs)` · `FULL-PROGRAM-4*.MIN / INSERTS-MARK.MIN (sample NC programs)`

## H:/PRISM/JM DIE

**Role:** JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus.

- **Files:** 317,129
- **Consolidated into:** H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)

| Top-level folder | Purpose |
|---|---|
| `BASEBALL PARTS` | baseball-part program set (+ OldVersions) |
| `CNC LATHE` | lathe programs organized by 100+ customers (ACME, ALCOA, HOLO-KROME, ITW, KEYSTONE, LELAND, ...) |
| `CNC MILL HAAS` | Haas VMC mill programs |
| `CNC OKUMA MULTUS` | Okuma MULTUS multi-tasking programs |
| `CONTROLLERS` | controller configs / control reference |
| `FUSION CAD AND CAM FILES` | Fusion 360 CAD + CAM source files |
| `GENERAL BANDAGES` | general fixes / patch programs |
| `HAAS-HURCO` | combined Haas + Hurco programs |
| `HURCO CNC PROGRAMS` | Hurco WinMax programs |
| `JM DIE COMPANY` | JM Die company documents / business records |
| `LATHE` | lathe programs (general) |
| `MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` | machine models for learning/sim |
| `MACRO PROGRAMS` | controller macro programs |
| `MATTHEW programs` | operator (Matthew) program set |
| `OKUMA` | Okuma programs (general) |
| `POST PROCESSORS` | stock post-processors |
| `PRISM CAD TESTING` | PRISM CAD test cases against shop parts |
| `Prism JM Die` | PRISM-processed JM Die working set |
| `PRISM MODIFIED POST PROCESSORS` | PRISM-tuned post-processors |
| `QUEUE` | program queue / staging |
| `REVERSE ENGINEERING` | reverse-engineering scans / models |
| `ROKU-ROKU` | Roku-Roku machine programs |
| `SETUPS` | setup sheets / fixturing |
| `TRIBAL + WIKI` | shop tribal knowledge + wiki corpus (PDF extraction source) |
| `WIRE EDM` | wire-EDM programs + setups |

**Notable files:** `Automated Program_Corrected 5-25.xlsm (VBA-driven program automation)` · `vba *.cls (VBA automation modules)` · `lathe-ai-training-report.json (lathe AI training output)`

## H:/PRISM/Docustrata

**Role:** JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database.

- **Files:** 257,992
- **Own index:** H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup)
- **Consolidated into:** H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)

| Top-level folder | Purpose |
|---|---|
| `.index` | pre-extraction pipeline output (documents/classified/text/blueprint-join jsonl + jm-die-index-v2.json) — the fast-search surface, NEVER re-OCR |
| `JMD Acct RecPay` | accounts receivable / payable documents |
| `JMD AltracsTaptite` | Altracs/Taptite fastener-product order docs |
| `JMD Laser Sheets` | laser-cut sheet documents |
| `JMD Orders Closed` | completed/closed customer orders |
| `JMD Packing Slips` | shipping packing slips |
| `JMD Quotes` | customer quotes (quote-to-ship source) |
| `JMD Sales Orders` | open sales orders |
| `JMD Scans` | scanned documents (blueprints, paperwork) |
| `JMD TaxesIRS` | tax / IRS records |
| `JMD UPS` | UPS shipping records |
| `My Notebook` | operator notebook |
| `Unfiled` | unfiled documents (triage) |
| `Untitled Folder` | untriaged documents |
| `_Imported_ 1012024` | import batch 2024-10-01 |
| `_Imported_ 1032024` | import batch 2024-10-03 |
| `_Imported_ 9302024` | import batch 2024-09-30 |
| `_Imported_ 9302024 _1_` | import batch 2024-09-30 (split 1) |
| `_organized` | organized/triaged corpus subset |

**Notable files:** `manifest.json (66.2M — corpus rollup + per-file index)` · `Report_from_J.M._Tool__Die_LLC.pdf (vendor report — tooling/stock baseline)` · `README.txt`

## Per-galaxy domain-relevant subfolders

| Galaxy | Domain-relevant roots/subfolders (empty = uniform 3-root pointer only) |
|---|---|
| **academy** | `resources/MIT COURSES` · `resources/1- Basic Training Day 1` · `resources/2- Basic Training Day 2` · `resources/3- Basic Training Day 3` · `resources/PRISM CAD-CAM TRAINING` |
| **agent-orchestration** | _(infra/meta — uniform 3-root pointer)_ |
| **ai-training** | `resources/PART MODELS FOR LEARNING ENGINE` · `resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` · `JM DIE/lathe-ai-training-report.json` |
| **backend-helper** | _(infra/meta — uniform 3-root pointer)_ |
| **blueprint-vision** | `Docustrata/JMD Scans` · `Docustrata/JMD Laser Sheets` · `resources/PDF` · `JM DIE/REVERSE ENGINEERING` |
| **bug-hunting** | _(infra/meta — uniform 3-root pointer)_ |
| **business** | `Docustrata/JMD Acct RecPay` · `Docustrata/JMD TaxesIRS` · `Docustrata/JMD UPS` · `Docustrata/JMD Sales Orders` · `Docustrata/JMD Packing Slips` · `JM DIE/JM DIE COMPANY` |
| **cad** | `resources/CAD FILES` · `resources/FUSION360` · `resources/Inventor` · `resources/SOLIDWORKS` · `resources/Freecad` · `resources/DWG TrueView 2027 - English` · `JM DIE/FUSION CAD AND CAM FILES` · `JM DIE/REVERSE ENGINEERING` · `JM DIE/PRISM CAD TESTING` |
| **cad-fusion-live** | `resources/FUSION360` · `resources/FUSION POSTS` · `resources/fusion-addin` · `JM DIE/FUSION CAD AND CAM FILES` |
| **cam** | `resources/FUSION 360 PROGRAMS` · `resources/HSMWorks 2027` · `resources/MasterCam` · `resources/SOLIDCAM` · `resources/OPEN MIND` · `resources/HYPERMILL` · `resources/inventor-hsm` · `JM DIE/FUSION CAD AND CAM FILES` |
| **compliance-safety** | _(infra/meta — uniform 3-root pointer)_ |
| **corpus-aggregation** | `resources/PDF` · `resources/RESOURCE PDFS` · `JM DIE/TRIBAL + WIKI` · `Docustrata/.index` |
| **database-expansion** | `resources/MANUFACTURER_CATALOGS` · `resources/WORKHOLDING AND FIXTURE CATALOGS` · `JM DIE/TRIBAL + WIKI` · `Docustrata/manifest.json` |
| **discovery** | _(infra/meta — uniform 3-root pointer)_ |
| **dormant-data** | _(infra/meta — uniform 3-root pointer)_ |
| **fleet-hygiene** | _(infra/meta — uniform 3-root pointer)_ |
| **frontend-app** | _(infra/meta — uniform 3-root pointer)_ |
| **hermes-zulu** | _(infra/meta — uniform 3-root pointer)_ |
| **knowledge-conversion** | `resources/MIT COURSES` · `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` · `JM DIE/TRIBAL + WIKI` |
| **lathe** | `JM DIE/CNC LATHE` · `JM DIE/LATHE` · `JM DIE/OKUMA` · `JM DIE/CNC OKUMA MULTUS` · `resources/MULTUS PROGRAMS` |
| **mill** | `JM DIE/CNC MILL HAAS` · `JM DIE/HAAS-HURCO` · `JM DIE/HURCO CNC PROGRAMS` · `resources/HSMWorks 2027` · `resources/MasterCam` |
| **mit-curriculum** | `resources/MIT COURSES` |
| **pdf-corpus** | `resources/PDF` · `resources/RESOURCE PDFS` · `resources/OKUMA MULTUS PDFS` · `Docustrata/manifest.json` |
| **pdf-corpus-mill** | `resources/PDF` · `resources/MANUFACTURER_CATALOGS` |
| **post-processor** | `resources/FUSION POSTS` · `resources/FUSION BASIC POSTS` · `resources/POSTS AND MACHINES` · `JM DIE/POST PROCESSORS` · `JM DIE/PRISM MODIFIED POST PROCESSORS` · `JM DIE/CONTROLLERS` |
| **quality** | `JM DIE/SETUPS` · `Docustrata/JMD Orders Closed` |
| **quoting** | `Docustrata/JMD Quotes` · `Docustrata/JMD Sales Orders` · `Docustrata/JMD Orders Closed` · `JM DIE/JM DIE COMPANY` |
| **shop-floor** | `JM DIE/SETUPS` · `JM DIE/QUEUE` · `JM DIE/CONTROLLERS` |
| **speed-feed** | `resources/MANUFACTURER_CATALOGS` · `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` · `resources/WORKHOLDING AND FIXTURE CATALOGS` |
| **system-viz** | `resources/RESOURCES-INDEX.md` · `Docustrata/manifest.json` |
| **token-optimization** | _(infra/meta — uniform 3-root pointer)_ |
| **tribal-knowledge** | `JM DIE/TRIBAL + WIKI` · `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` |
| **wedm** | `JM DIE/WIRE EDM` |
| **wiring** | _(infra/meta — uniform 3-root pointer)_ |
