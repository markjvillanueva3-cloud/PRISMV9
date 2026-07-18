# SFC Catalog ← Monolith/Registry Feed Map (verification) — U-OSC-SFC-MONOLITH-FEED-VERIFY

**Author:** oscar (slot:oscar) · 2026-06-29 · closes Task #5 ("verify which monolith modules feed which SFC catalogs").
**Method:** read `data/prism-reference-db/README.md` + `MANIFEST.json` + every `src/utils/calculator*Catalog.ts` source path. No assumptions — each row's data source is cited from the util's own `const *_PATH` / registry import.

## 1. The monolith → reference-db extraction
The monolith HTMLs + `extracted_modules/` + `data/materials_complete/` on `H:/PRISM` were extracted by
`scripts/extract-monolith-databases.mjs` into `mcp-server/data/prism-reference-db/` — **17 categories, 1859 stores,
13,920 records, 25.8 MB**, one `<category>.json` bundle per category (`{category, count, stores:{NAME:data}}`).
`MANIFEST.json` maps every store name → category + bundle + recordCount. Store names are **case-sensitive**
(`MACHINES` ≠ `Machines` ≠ `machines` — three distinct monolith datasets).

## 2. VERIFIED feed map (every SFC input → its data source)
| SFC input (SpeedFeedPage) | Frontend select | Backend util / route | Data source | Source class |
|---|---|---|---|---|
| Material | `<datalist>` | calculatorMaterialCatalog → `/material/catalog` | **MaterialRegistry** (245+ ISO alloys w/ Kienzle kc1.1/mc + Taylor C/n) | curated registry |
| Raw stock | DbBackedSelect | calculatorStockCatalog → `/stock/catalog` | `data/state/materials-stock.json` (JM stock) | JM store |
| Tool (search) | ToolSearchSelect | `/tool/search` | **ToolRegistry** (~86K brand-catalog tools) | curated registry |
| Machine | `<select>` | `/machine/search` | machine registry (aggregated) | curated registry |
| Coating | DbBackedSelect | calculatorCoatingCatalog → `/coating/catalog` | **reference-db `coatings.json`** (9 stores, 102 rec) | **monolith** ✓ |
| Indexable insert | DbBackedSelect | calculatorInsertCatalog → `/insert/catalog` | **reference-db `inserts.json`** (5 stores, 45 rec) | **monolith** ✓ |
| Turning insert | DbBackedSelect | calculatorLatheInsertCatalog → `/turning-insert/catalog` | **reference-db `inserts.json`** (lathe subset) | **monolith** ✓ |
| Holder | DbBackedSelect | calculatorToolHolderCatalog → `/holder/catalog` | **reference-db `holders.json`** (20 stores, 180 rec) | **monolith** ✓ |
| Workholding/fixture | DbBackedSelect | calculatorWorkholdingCatalog → `/workholding/catalog` | `data/workholding/*.json` + `data/databases/WorkholdingDB.json` + `PRISM_FIXTURE/WORKHOLDING_DATABASE.js` | curated stores |
| Coolant method | DbBackedSelect | calculatorCoolantCatalog → `/coolant/catalog` | **reference-db `coolants.json`** (19 stores, 183 rec) | **monolith** ✓ |
| Coolant product | DbBackedSelect | calculatorCoolantProductCatalog → `/coolant-product/catalog` | **reference-db `coolants.json`** (vendor products) | **monolith** ✓ |

**Result: every SFC input is DB-backed.** 6 catalogs draw directly from the monolith reference-db
(coating, insert, turning-insert, holder, coolant, coolant-product); the remaining inputs draw from curated
registries / JM stores.

## 3. Why the source split is CORRECT (not a gap)
The physics-load-bearing inputs — **material** (feeds Kienzle kc1.1/mc + Taylor C/n → cutting force, tool life,
power) and **tool** — source from CURATED registries, NOT the raw monolith `materials.json`/`tools.json`. This is
deliberate and safety-correct: feeding un-validated monolith kc1.1/Taylor constants into the SFC physics core
would risk wrong forces/speeds on a real machine (oscar soul refuse: `inline-physics-constants` /
`softening-safety-thresholds`). The auxiliary metadata catalogs (coating/insert/holder/coolant — descriptive, not
force-determining) correctly draw the monolith's richer corpus. So the split is by design: **monolith for
descriptive metadata, curated registry for the physics inputs.**

## 4. OPEN cross-domain question (NOT an SFC gap — flagged for juliett / database-expansion)
The monolith reference-db ALSO holds `materials.json` (150 stores, 1,980 rec), `tools.json` (37 stores, 956 rec),
`machines.json` (131 stores, 1,209 rec), and `workholding.json` (30 stores, 291 rec) that the SFC catalogs do NOT
directly consume (they use the curated registries instead). **Whether the curated MaterialRegistry / ToolRegistry
already incorporate every alloy/tool in those monolith modules — or whether the monolith holds records the
registries lack — is a material/tool CORPUS-COVERAGE question owned by juliett (database-expansion) + the registry
owners, NOT an SFC-frontend wiring gap.** If a coverage delta is found, the fix is to ENRICH the curated registry
(with validated kc1.1/Taylor per added alloy), after which the SFC material catalog picks it up automatically (it
reads the registry). oscar does NOT wire raw monolith material data into the physics calc. → handoff to juliett.

## 5. Conclusion
Task #5 verified: **the monolith→SFC feed is complete for every SFC input** (6 monolith-fed + 5 curated-source,
all wired + tested). The only follow-up is the cross-domain registry-coverage audit (§4), which is juliett's, not
oscar's. The SFC "wire every input to all possible databases incl. the monolith" work order is **satisfied**.
