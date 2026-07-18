---
name: lathe-vendor-tooling-resources-2026-05-26
description: Consolidated vendor research for lathe tooling — Sandvik Coromant, Iscar, Widia, Ingersoll, Dapra, PTSolutions. Grade-chart URLs, tool-system families, ISO insert geometry decode (C/W/D/S/T/V/R), wiring hints for the lathe wizard pipeline.
metadata:
  type: architecture
  domain: lathe
  cross_domain: [milling]
  topic: vendor-tooling-resources
  confidence: 0.55
  needs_curation: true
  slot: whiskey
  generated_at: 2026-05-26
  data_source: mcp-server/data/ingestion_cache/whiskey-lathe-vendor-tribal-2026-05-26.json
---

# Lathe Vendor Tooling Resources (2026-05-26 research pass)

> Operator directive: *"do deep research online as well for resources from dapra, sandvik, pts-tools, widia, ingersoll cutting tools, iscar, and other reputable and popular brands for lathe tooling and machine resources for machining. download resources, convert to data then nodes into wiki and tribal knowledge and inject into lathe domain"*

This is an **advisory + URL-manifest** wiki entry. The structured data lives in
`mcp-server/data/ingestion_cache/whiskey-lathe-vendor-tribal-2026-05-26.json`
(machine-readable, schemaVersion 1.0.0). PRISM does NOT have an automated PDF
binary-fetch capability — the WebFetch tool returns text-from-HTML only.
Actual catalog PDF downloads are a follow-up unit (see §Follow-up units below).

## ISO insert geometry (C/W/D/S/T/V/R) — cross-vendor

| Code | Shape           | Use                                     | Common ANSI codes      |
|------|-----------------|-----------------------------------------|------------------------|
| C    | rhombic 80°     | general roughing + facing               | CNMG, CCMT, CNMA       |
| W    | trigon 80°      | 6 edges (3/side); economical medium     | WNMG, WNMA, WCMT       |
| D    | rhombic 55°     | profiling + finishing; contour access   | DNMG, DCMT             |
| S    | square 90°      | max DOC roughing; strongest corner      | SNMG, SCMT             |
| T    | triangle 60°    | general turning                         | TNMG, TPMR, TCMT       |
| V    | rhombic 35°     | deep profiling; sharp leading edge      | VBMT, VNMG             |
| R    | round           | shoulder/profile finishing              | RCMX, RCMT             |

## ISO material groups (P/M/K/N/S/H)

| Group | Material class             | Common alloys                              |
|-------|----------------------------|--------------------------------------------|
| P     | Steel (low + alloy)        | 1045, 4140, 8620                           |
| M     | Stainless (≥10.5% Cr)      | 304, 316, 17-4 PH                          |
| K     | Cast iron (Fe-C-Si)        | gray, nodular, chilled                     |
| N     | Non-ferrous                | 6061, 7075, brass, copper                  |
| S     | Superalloy / heat-resist   | Inconel 718, Ti-6Al-4V                     |
| H     | Hardened steel (>45 HRC)   | D2, M2, S7, case-hardened                  |

## Vendor manifest

### Sandvik Coromant
- **Site**: https://www.sandvik.coromant.com
- **Tool families**: CoroTurn 107, CoroTurn Prime, CoroTurn TR, CoroTurn 300, CoroBore 111
- **Top steel grades**: GC4425, GC4415, GC4405
- **Resources**:
  - [Grade selection overview](https://www.sandvik.coromant.com/en-us/tools/inserts-grades/insert-grade-information/turning-inserts-grades)
  - [How to choose correct turning insert](https://www.sandvik.coromant.com/en-us/knowledge/general-turning/how-to-choose-correct-turning-insert)
  - [Steel grades](https://www.sandvik.coromant.com/en-us/tools/inserts-grades/insert-grade-information/turning-inserts-grades/turning-inserts-grades-steel)
  - [Stainless grades](https://www.sandvik.coromant.com/en-us/tools/inserts-grades/insert-grade-information/turning-inserts-grades/turning-inserts-grades-stainless-steel)
  - [Cast iron grades](https://www.sandvik.coromant.com/en-us/tools/inserts-grades/insert-grade-information/turning-inserts-grades/turning-inserts-grades-cast-iron)
  - [Hardened steel grades](https://www.sandvik.coromant.com/en-us/tools/inserts-grades/insert-grade-information/turning-inserts-grades/turning-inserts-grades-hardened-steel)
  - [Downloads + Handbook](https://www.sandvik.coromant.com/en-us/downloads) — Metal Cutting Training Handbook, three-volume ordering catalogue
- **Key features**: CoroTurn 107 for small/slender parts; CoroTurn Prime all-directional; CoroTurn TR + 300 with iLock locking + over/under coolant.

### Iscar
- **Site**: https://www.iscar.com
- **Tool families**: ISO-Turning (extensive chipformer suffixes)
- **Chipformer codes**: -CERMET, -F3S, -F3P, -GN (general), -NR (heavy rough), -PP (ductile), -VL (high-temp + stainless), -M3, -M3M
- **Resources**:
  - [Grade chart PDF](https://www.iscar.com/ecat/iscar_grade_chart.pdf) — the one-page cross-vendor application matcher
  - [Interactive grades table](https://www.iscar.com/ecatalog/gradesTable/gradesTable.html)
  - [Grades Guide](https://www.iscar.com/eCatalog/GradesGuide.aspx)
  - [ISO-Turning Inserts catalog](https://www.iscar.com/eCatalog/Products.aspx?mapp=IS&app=282)
  - [Turning + Threading Tools PDF](https://pdf.directindustry.com/pdf/iscar-tools/turning-threading-tools/5692-642531.html)
- **Key features**: ECO inserts (3/8" IC) cover ~75% of turning apps with higher feed durability than standard same-size.

### Widia (Kennametal brand)
- **Site**: https://www.widia.com
- **Tool families**: Victory ISO Inserts; shape styles R/S/T/V/W/C/D/L
- **Resources**:
  - [Conversion guide](https://www.widia.com/us/en/resources/conversion-guide.html) — competitor → Widia grade lookup
  - [Victory Carbide Inserts](https://www.widia.com/tr/en/products/turning/od-and-id-turning/high-performance-inserts/widia-victory-carbide-inserts.html)
  - [Carbide inserts catalog](https://www.widia.com/us/en/products/p.spu.2028555.html)
  - [Third-party grade chart PDF (Tyson Tool)](https://tysontool.com/turnCat-InsertInformation.pdf)
- **Key features**: Widaselect multi-layer (TiN-TiCN-Al2O3-ZrCN) MTCVD coating at 800°C; M/S grade = TiN PVD over unalloyed substrate for high-temp + Ti.

### Ingersoll Cutting Tools
- **Site**: https://www.ingersoll-imc.com
- **Tool families**: TAEGUline turning
- **Carbide grades**: CT3000, TT5100, TT7005, TT7015, TT7100, TT7310, TT8115, TT8125, TT8135, TT9215, TT9225, TT9235
- **CBN grades**: TB610 (continuous + light-interrupted hard steel), TB670 (severe interrupt + chilled cast iron), TB730 (gray + nodular cast iron + carbide rolls)
- **Cermet grades**: PV3010 (PVD coated), CT3000 (uncoated)
- **Resources**:
  - [Catalogs landing](https://www.ingersoll-imc.com/catalogs)
  - [Turning catalog PDF (CAT-011)](https://cuttingtoolschicago.com/wp-content/catalogs/ingersoll/Turning/turning%20catalog/CAT-011_Technical.pdf)
  - [Grade chart PDF](https://www.suncoasttools.com/PDFFILES/Ingersoll/IngersollGradeChart.pdf)
  - [Insert Master PDF (MAN-009-1)](https://ssl.ingersoll-imc.com/resources/pdf/insert_master/MAN-009-1_Insert_Master.pdf)
  - [Super Catalog — Turning Products](https://pdf.directindustry.com/pdf/ingersoll-cutting-tools/super-catalog-turning-products/17869-106745.html)
- **Key features**: 8 PVD-coated grades + 6 CVD-coated grades; CT3000 cermet covers P10/P20 + M10/M20 + K10/K20 with excellent surface finish.

### Dapra Corporation
- **Site**: https://www.dapra.com
- **Tool families**: Indexable inserts (primarily milling; smaller turning + profiling line)
- **Resources**:
  - [Literature downloads](https://www.dapra.com/resources/literature)
  - [Tool reference](https://www.dapra.com/resources/tool-reference)
  - [Insert grade + coating selection](https://www.dapra.com/high-feed/insert-grade-selection)
  - [Product catalog PDF (Durrie mirror)](https://durrie.com/wp-content/uploads/2023/02/Dapra-Product-Catalog.pdf)
  - [Toroid high-feed PDF](https://www.dapra.com/customer/downloads/cutting-tools/Dapra-Toroid.pdf)
  - [BlackHawk distributor turning inserts](https://www.bhid.com/brands/dapra-corp/catalog/products/indexable-cutting-tools/indexable-inserts/turning-and-profiling-inserts/turning-inserts)
- **Key features**: ISO-material-group filter on insert selection + starting speed-feed + DOC charts per insert per material group. Aerospace + automotive + mold-die + firearms focus.
- **Caveat**: MaxiMet appears not to be a Dapra product line — operator may want to confirm or rename in the original directive.

### PTSolutions (PTS Tools)
- **Site**: https://www.pts-tools.com
- **Role**: Distributor — multi-vendor turning inserts + holders. Cross-references Sandvik / Kennametal / Widia + others.
- **Caveat**: Public-site catalog UI is dynamic + gated behind login — WebSearch returns limited content. For PRISM wiring, treat PTS as a logistics/availability layer (do we have this insert in stock?), NOT a primary technical source. Operator may want a contracted product feed (CSV/API) instead of scraping.

## Lathe wizard wiring (hints from the JSON manifest)

Four consumers in PRISM benefit from this vendor data:

1. **LatheAITrainingEngine** — validation phase. When a JM-Die `.MIN` program names an insert (e.g. `CNMG-432`), reverse-lookup the vendor grade chart for the substrate's recommended Vc + DOC range; flag if program parameters lie outside the recommended range. `ValidationIssue.physics_basis = "<vendor>/<grade-chart-url>"`.

2. **LatheCAMIntelligenceEngine** — tool-selection phase. Given material (ISO-P/M/K/N/S/H) + operation (od_rough / od_finish / face / groove / thread), rank candidate inserts by `(geometry × grade × vendor availability)`. The 3 default vendor families: Sandvik CoroTurn 107/Prime/TR/300, Iscar -GN/-PP, Ingersoll TT-series.

3. **ShopFloorQuoteEngine / quote pipeline** — cost phase. Sandvik typically 1.4-1.6× Iscar list; Iscar typically 1.1-1.3× Korean (Korloy/TaeguTec); pick the lowest-cost vendor whose grade chart covers the material + cutting condition.

4. **/system-viz lathe roost** — render each vendor as a child node under the lathe domain roost; each node carries the resource URLs; clicking opens the vendor's grade-chart page in browser.

## Follow-up units (proposed, not built)

| Unit ID                              | Scope                                                                                                                                                                            | Priority |
|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `U-LATHE-VENDOR-PDF-DOWNLOAD`        | Operator/wget — download the 14 named PDFs from the JSON manifest into `resources/MANUFACTURER_CATALOGS/uploaded/`. PRISM has no automated PDF binary fetch (WebFetch HTML-only). | P1       |
| `U-LATHE-VENDOR-GRADE-CHART-PARSE`   | Extend `pdf-parse-extract.mjs` to ingest each downloaded vendor grade chart + emit per-grade tribal records (grade × ISO-group × Vc range × DOC range)                          | P1       |
| `U-LATHE-WIZARD-VENDOR-LOOKUP`       | Wire vendor-tribal JSON into `LatheCAMIntelligenceEngine.selectInsert` — current heuristic uses material-group only; with vendor data we add grade-x-condition match              | **P0**   |
| `U-LATHE-VENDOR-GRAPH-NODE`          | `/system-viz` `ghost.lathe_vendors` roost — surface 6 vendor nodes under the lathe domain with click-through URLs                                                                | P2       |

## Sources

- Sandvik Coromant: [overview](https://www.sandvik.coromant.com/en-us/tools/inserts-grades/insert-grade-information/turning-inserts-grades), [downloads](https://www.sandvik.coromant.com/en-us/downloads)
- Iscar: [grade chart PDF](https://www.iscar.com/ecat/iscar_grade_chart.pdf), [interactive table](https://www.iscar.com/ecatalog/gradesTable/gradesTable.html)
- Widia: [conversion guide](https://www.widia.com/us/en/resources/conversion-guide.html), [third-party grade chart](https://tysontool.com/turnCat-InsertInformation.pdf)
- Ingersoll: [turning catalog PDF](https://cuttingtoolschicago.com/wp-content/catalogs/ingersoll/Turning/turning%20catalog/CAT-011_Technical.pdf), [insert master PDF](https://ssl.ingersoll-imc.com/resources/pdf/insert_master/MAN-009-1_Insert_Master.pdf), [grade chart PDF](https://www.suncoasttools.com/PDFFILES/Ingersoll/IngersollGradeChart.pdf)
- Dapra: [literature](https://www.dapra.com/resources/literature), [product catalog PDF](https://durrie.com/wp-content/uploads/2023/02/Dapra-Product-Catalog.pdf), [BHID distributor turning inserts](https://www.bhid.com/brands/dapra-corp/catalog/products/indexable-cutting-tools/indexable-inserts/turning-and-profiling-inserts/turning-inserts)
- PTSolutions: [pts-tools.com](https://www.pts-tools.com/)
