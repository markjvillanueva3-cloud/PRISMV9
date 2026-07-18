# CATALOG → SPEED-FEED-CALCULATOR extraction manifest (charlie → oscar handoff)

> Generated 2026-06-01 · charlie (acquisition/triage) → oscar (SFC extraction + src/data write). The prioritized work-list for extracting vendor-catalog speeds/feeds into the SFC databases. Ingestion: `ToolCatalogEngine.addTools() — mcp-server/src/engines/ToolCatalogEngine.ts:548 (in-memory; durable DB = hand-authored src/data/*.ts catalogs)`. Schema: `ManufacturerSpeedFeed (mcp-server/src/data/manufacturer-speed-feed-data.ts)`.

**169 cutting-tool makers · 95 with catalog on disk · priority: {"high":80,"medium":71,"low":18}**

## HIGH priority — catalog on disk, NOT yet in SFC DB (extract NOW)
| vendor | reach | catalog on disk | target src/data file |
|--------|-------|:---------------:|----------------------|
| Applitec | global | ✓ | mcp-server/src/data/applitec-speed-feed-data.ts |
| BIG Kaiser | global | ✓ | mcp-server/src/data/big-kaiser-speed-feed-data.ts |
| Carmex | global | ✓ | mcp-server/src/data/carmex-speed-feed-data.ts |
| Criterion | global | ✓ | mcp-server/src/data/criterion-speed-feed-data.ts |
| Dixi Polytool | global | ✓ | mcp-server/src/data/dixi-polytool-speed-feed-data.ts |
| Drill Masters-Eldorado Tool | global | ✓ | mcp-server/src/data/drill-masters-eldorado-speed-feed-data.ts |
| Fraisa | global | ✓ | mcp-server/src/data/fraisa-speed-feed-data.ts |
| Greenfield Industries | global | ✓ | mcp-server/src/data/greenfield-speed-feed-data.ts |
| HAM Praezision | global | ✓ | mcp-server/src/data/ham-praezision-speed-feed-data.ts |
| Industrial Tooling Corporation (ITC) | global | ✓ | mcp-server/src/data/industrial-tooling-corporation-speed-feed-data.ts |
| Izar | global | ✓ | mcp-server/src/data/izar-speed-feed-data.ts |
| Komet | global | ✓ | mcp-server/src/data/komet-speed-feed-data.ts |
| Korloy | global | ✓ | mcp-server/src/data/korloy-speed-feed-data.ts |
| KYOCERA SGS Precision Tools | global | ✓ | mcp-server/src/data/kyocera-sgs-speed-feed-data.ts |
| LMT Tools | global | ✓ | mcp-server/src/data/lmt-speed-feed-data.ts |
| Louis Belet | global | ✓ | mcp-server/src/data/louis-belet-speed-feed-data.ts |
| M.A. Ford | global | ✓ | mcp-server/src/data/m-a-ford-speed-feed-data.ts |
| Magafor | global | ✓ | mcp-server/src/data/magafor-speed-feed-data.ts |
| MAPAL | global | ✓ | mcp-server/src/data/mapal-speed-feed-data.ts |
| Mikron Tool | global | ✓ | mcp-server/src/data/mikron-speed-feed-data.ts |
| Mimatic | global | ✓ | mcp-server/src/data/mimatic-speed-feed-data.ts |
| Morse Cutting Tools | global | ✓ | mcp-server/src/data/morse-speed-feed-data.ts |
| Precision Twist Drill | global | ✓ | mcp-server/src/data/twist-drill-speed-feed-data.ts |
| Schwanog | global | ✓ | mcp-server/src/data/schwanog-speed-feed-data.ts |
| Somta Tools | global | ✓ | mcp-server/src/data/somta-speed-feed-data.ts |
| Sutton Tools | global | ✓ | mcp-server/src/data/sutton-speed-feed-data.ts |
| Union Butterfield | global | ✓ | mcp-server/src/data/union-butterfield-speed-feed-data.ts |
| Vergnano | global | ✓ | mcp-server/src/data/vergnano-speed-feed-data.ts |
| Walter Tools | global | ✓ | mcp-server/src/data/walter-speed-feed-data.ts |
| Zecha | global | ✓ | mcp-server/src/data/zecha-speed-feed-data.ts |
| Accupro | national | ✓ | mcp-server/src/data/accupro-speed-feed-data.ts |
| Advent Tool | national | ✓ | mcp-server/src/data/advent-speed-feed-data.ts |
| Balax | national | ✓ | mcp-server/src/data/balax-speed-feed-data.ts |
| Besly Cutting Tools | national | ✓ | mcp-server/src/data/besly-speed-feed-data.ts |
| CGS Tool | national | ✓ | mcp-server/src/data/cgs-speed-feed-data.ts |
| Champion Cutting Tool | national | ✓ | mcp-server/src/data/champion-speed-feed-data.ts |
| Cobra Carbide | national | ✓ | mcp-server/src/data/cobra-speed-feed-data.ts |
| Data Flute | national | ✓ | mcp-server/src/data/data-flute-speed-feed-data.ts |
| Drillco Cutting Tools | national | ✓ | mcp-server/src/data/drillco-speed-feed-data.ts |
| F&D Tool | national | ✓ | mcp-server/src/data/f-and-d-speed-feed-data.ts |
| Fullerton Tool | national | ✓ | mcp-server/src/data/fullerton-speed-feed-data.ts |
| Garr Tool | national | ✓ | mcp-server/src/data/garr-speed-feed-data.ts |
| Gorilla Mill (CGC Tools) | national | ✓ | mcp-server/src/data/gorilla-mill-speed-feed-data.ts |
| Hannibal Carbide Tool | national | ✓ | mcp-server/src/data/hannibal-speed-feed-data.ts |
| Harvey Tool | national | ✓ | mcp-server/src/data/harvey-speed-feed-data.ts |
| Hertel | national | ✓ | mcp-server/src/data/hertel-speed-feed-data.ts |
| Hougen | national | ✓ | mcp-server/src/data/hougen-speed-feed-data.ts |
| IMCO Carbide | national | ✓ | mcp-server/src/data/imco-speed-feed-data.ts |
| Internal Tool | national | ✓ | mcp-server/src/data/internal-speed-feed-data.ts |
| Jarvis Cutting Tools | national | ✓ | mcp-server/src/data/jarvis-speed-feed-data.ts |
| KEO Cutters | national | ✓ | mcp-server/src/data/keo-cutters-speed-feed-data.ts |
| Kodiak Cutting Tools | national | ✓ | mcp-server/src/data/kodiak-speed-feed-data.ts |
| Kyocera Precision Tools | national | ✓ | mcp-server/src/data/kyocera-speed-feed-data.ts |
| Lakeshore Carbide | national | ✓ | mcp-server/src/data/lakeshore-speed-feed-data.ts |
| Lavallee & Ide | national | ✓ | mcp-server/src/data/lavallee-and-ide-speed-feed-data.ts |
| Microcut | national | ✓ | mcp-server/src/data/microcut-speed-feed-data.ts |
| Performance Micro Tool | national | ✓ | mcp-server/src/data/performance-micro-speed-feed-data.ts |
| Rapidkut | national | ✓ | mcp-server/src/data/rapidkut-speed-feed-data.ts |
| Redline Tools | national | ✓ | mcp-server/src/data/redline-speed-feed-data.ts |
| Regal Cutting Tools | national | ✓ | mcp-server/src/data/regal-speed-feed-data.ts |
| Reiff & Nestor | national | ✓ | mcp-server/src/data/reiff-and-nestor-speed-feed-data.ts |
| Richards Micro Tool | national | ✓ | mcp-server/src/data/richards-micro-speed-feed-data.ts |
| RobbJack | national | ✓ | mcp-server/src/data/robbjack-speed-feed-data.ts |
| Scientific Cutting Tools | national | ✓ | mcp-server/src/data/scientific-speed-feed-data.ts |
| Severance Tool | national | ✓ | mcp-server/src/data/severance-speed-feed-data.ts |
| Sowa Tool (GS Tooling) | national | ✓ | mcp-server/src/data/sowa-speed-feed-data.ts |
| Star Cutter | national | ✓ | mcp-server/src/data/star-cutter-speed-feed-data.ts |
| Super Tool | national | ✓ | mcp-server/src/data/super-speed-feed-data.ts |
| Tool-Flo | national | ✓ | mcp-server/src/data/flo-speed-feed-data.ts |
| Toolmex | national | ✓ | mcp-server/src/data/toolmex-speed-feed-data.ts |
| Triumph Twist Drill | national | ✓ | mcp-server/src/data/triumph-twist-drill-speed-feed-data.ts |
| Tru-Edge | national | ✓ | mcp-server/src/data/tru-edge-speed-feed-data.ts |
| Ultra-Tool International | national | ✓ | mcp-server/src/data/ultra-international-speed-feed-data.ts |
| Viking Drill & Tool | national | ✓ | mcp-server/src/data/viking-drill-and-speed-feed-data.ts |
| Vortex Tool | national | ✓ | mcp-server/src/data/vortex-speed-feed-data.ts |
| Weldon Tool | national | ✓ | mcp-server/src/data/weldon-speed-feed-data.ts |
| Whitney Tool | national | ✓ | mcp-server/src/data/whitney-speed-feed-data.ts |
| YG-1 | national | ✓ | mcp-server/src/data/yg-1-speed-feed-data.ts |
| Solid End Mills | unknown | ✓ | mcp-server/src/data/solid-end-mills-speed-feed-data.ts |
| TURNING_CATALOG_PART 1 | unknown | ✓ | mcp-server/src/data/turning-catalog-part-1-speed-feed-data.ts |

## MEDIUM priority — pull catalog (web), then extract
| vendor | reach | website |
|--------|-------|---------|
| Renishaw | global | https://www.renishaw.com |
| MariTool | national | https://www.maritool.com |
| McMaster-Carr | national | https://www.mcmaster.com |
| Rockform Carbide | national | https://rockform.com |
| SB Specialty Metals | national | https://sb-specialty-metals.com |
| Zoro | national | https://www.zoro.com |
| ACCU-CUT | unknown | — |
| AIR CLEANING SPECIALISTS, INC | unknown | — |
| GENERAL CARBIDE | unknown | — |
| MILLER INDUSTRIAL | unknown | — |
| RICHTER PRECISION | unknown | — |
| STAR TOOLS | unknown | — |
| STEINER ELECTRIC COMPANY | unknown | — |
| TS TOOLING SUPPLY | unknown | — |
| VALLEY HEADER DIE, INC. | unknown | — |
| WORLD DIAMOND TOOL | unknown | — |
| Allied Machine and Engineering | global | https://www.alliedmachine.com |
| Ceratizit | global | https://www.ceratizit.com |
| Cogsdill Tool Products | global | https://www.cogsdill.com |
| Erowa | global | https://www.erowa.com |
| Garant (Hoffmann Group) | global | https://www.hoffmann-group.com |
| Heule Tool | global | https://www.heule.com |
| Schunk | global | https://schunk.com |
| System 3R | global | https://www.system3r.com |
| Applied Industrial Technologies | national | https://www.applied.com |
| Bossard | national | https://www.bossard.com |
| Conical Tool | national | https://conicaltool.com |
| Destiny Tool | national | https://www.destinytool.com |
| DGI Supply (a DoALL company) | national | https://www.dgisupply.com |
| Fastenal | national | https://www.fastenal.com |
| Greenleaf | national | https://www.greenleafcorporation.com |
| Griggs Steel | national | https://www.griggssteel.com |
| Jergens Inc. | national | https://www.jergensinc.com |
| KBC Tools & Machinery | national | https://www.kbctools.com |
| Kyocera (SGS) | national | https://www.kyocera-sgstool.com |
| Melin Tool | national | https://www.endmill.com |
| Micro 100 | national | https://www.micro100.com |
| Motion Industries | national | https://www.motionindustries.com |
| MSC Industrial Supply | national | https://www.mscdirect.com |
| Production Tool Supply | national | https://www.pts-tools.com |
| Travers Tool | national | https://www.travers.com |
| Vargus | national | https://www.vargus.com |
| W.W. Grainger | national | https://www.grainger.com |
| AMERICAN TOOL DESIGN | unknown | — |
| BELMONT EQUIPMENT | unknown | — |
| BOTEK | unknown | — |
| CARLSON TOOL & MANUFACTRUING CORP | unknown | — |
| CD TOOLS & MACHINING INC | unknown | — |
| CREATIVE CARBIDE | unknown | — |
| DIAMOND EDGE MANUFACTURING | unknown | — |
| ELECTRODES | unknown | — |
| ENGIS | unknown | — |
| FIRTH | unknown | — |
| FORKARDT HARDINGE | unknown | — |
| GRAINGER | unknown | — |
| GREGGA CARBIDE | unknown | — |
| INDUSTRIAL MINERAL SUPPLY | unknown | — |
| INNOVATE TECHNOLOGIES | unknown | — |
| IVERSON | unknown | — |
| LINCOLN PRECISION CARBIDE, INC. | unknown | — |
| MECH-ART | unknown | — |
| MICHIGAN CARBIDE | unknown | — |
| MOLD SHOP TOOLS.COM | unknown | — |
| MOLDSHOP TOOLS | unknown | — |
| MORRIS MIDWEST | unknown | — |
| PTS-TOOLS | unknown | — |
| ROLL-RITE | unknown | — |
| STAR ENGINEERING | unknown | — |
| SUNNEN PRODUCTS COMPANY | unknown | — |
| WOODBURN DIAMOND DIE, INC | unknown | — |
| WORK BLADES, INC | unknown | — |

## LOW priority — already ingested (augment/refresh only)
Kennametal, ZENITOOLS, INC., Dormer Pramet, EMUGE-FRANKEN, Guhring, Ingersoll Cutting Tools, Iscar, Mitsubishi Materials, Mitsubishi Materials (Carbide), OSG, Paul Horn (Horn USA), Sandvik Coromant, Seco Tools, Sumitomo Electric Carbide, Tungaloy, Tungaloy-NTK America, Helical Solutions, Niagara Cutter

## R12 — verify before asserting
151 vendors have UNCONFIRMED ingestion state (`verify_ingestion:true`) — oscar confirms whether a src/data catalog already covers them before extracting (don't double-ingest, don't skip a real gap).

## Extraction approach (oscar)
1. For HIGH targets, the catalog PDFs are in `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded` (+ whiskey-fetch). Use lima's pypdf page-by-page extractor (NOT whiskey pdf-parse) on the S/F-table pages.
2. Map extracted rows → `ManufacturerSpeedFeed` records (series, isoGroup, vc, fz, dc), one new `mcp-server/src/data/<vendor>-speed-feed-data.ts` per vendor, exported + imported into `ToolCatalogEngine`.
3. Cite source catalog + page per record; flag low-confidence parses. Never inline material physics constants (use src/physics/constants.ts).