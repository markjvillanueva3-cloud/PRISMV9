---
name: reference_vendor_catalog_db_2026_05_31
description: vendor-catalog-db — juliett's persisted, committed, schema-versioned consolidation of Charlie's VENDOR-NETWORK-MS0 vendor corpus (433-vendor directory + catalog-vendors + 131 SFC-maker pointers + JM procurement). Where it lives, how to regenerate, the oscar scope boundary.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.035Z
aliases: reference_vendor_catalog_db_2026_05_31
---


**vendor-catalog-db: Charlie's vendor corpus, persisted (2026-05-31, slot:juliett, U-VENDOR-CATALOG-DB + -HARDEN).**

Operator: "charlie linked you new pdfs and customers to extract into our databases." Charlie's VENDOR-NETWORK-MS0 Phase 2 produced a vendor catalog corpus (164 pulled PDFs at `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29` (not repo), a 433-vendor directory, 131 SFC makers) as **gitignored/regenerable** files under `state/shared/quoting/`. Per `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json`, juliett's role = "persist the durable vendor stores (atomic-write + schema-version discipline)."

**Store:** `mcp-server/data/vendor-catalog-db/` (DocuStrata→jm-die-database pattern):
- `manifest.json` (committed, schemaVersion 1.0.0) — counts (re-derived from LIVE files, not prose), `directoryStats` (byCategory/byType/byPricing/byReach), `sourceRegistry` (path+bytes+mtime+records per source), `crossRef`, `consumers`.
- `tables/vendors.jsonl` (425), `tables/catalog-vendors.jsonl` (77), `tables/sfc-makers.jsonl` (131 — **POINTER projection only**), `tables/jm-tool-purchases.json` ($4.91M, 49 distinct tool vendors). Tables **force-added** (`git add -f`) past the blanket data-jsonl ignore — small reference data, durable.
- `README.md`.

**Builder:** `scripts/build-vendor-catalog-db.mjs` (+ `.test.mjs`, 7/7). Re-run after Charlie's pipeline regenerates the quoting artifacts. `--check` = verify sources, no writes. **Fail-loud:** throws if any of the 5 sources missing OR if the SFC manifest `.records` array is empty (schema-drift guard — no silent 0-maker store).

**Live counts:** 425 vendors (251 with website) · 77 catalog-vendors · 131 SFC makers (**44 HIGH priority**, 18 already-ingested) · JM tool spend **$4,914,833.88**. (Index said 433 vendors; 425 is the live-file count per the index's own "re-derive from live files, not prose" rule.)

**SCOPE BOUNDARY (no duplication):**
- **oscar (speed-feed)** owns extracting cutting data (vc/fz) from the 44 HIGH catalogs into `mcp-server/src/data/<vendor>-speed-feed-data.ts`. This store holds only METADATA + a pointer projection of the SFC manifest — `projectSfcMaker()` is allowlist-style (explicit field copy), so extracted cutting data CANNOT leak in (regression-tested).
- Legacy `mcp-server/data/vendor-catalog-manifest.json` (Apr-16 38-PDF tool-COUNT extraction, 54080 tools) is a DISTINCT concern — cross-referenced, never overwritten.
- **charlie** owns acquisition + the quoting index; **hotel** consumes the directory as a supplier/procurement master; **foxtrot/echo/kilo** read the manifest + PDFs.

**Extraction governance (U-CATALOG-EXTRACTION-ROUTER, same session):** `scripts/lib/catalog-extraction-router.mjs` (+`.test`, 11/11) is the fleet's canonical extractor-routing + full math/science schema — emitted as `mcp-server/data/vendor-catalog-db/EXTRACTION-ROUTING.json`. Operator directive: "use the extracter scripts + batch books we built; capture ALL math/science from catalogs to fine-tune/generate custom per-tooling calculations that compound across domains + equation parts." `EXTRACTORS` (7) inventories the EXISTING tools (camelot / per-vendor pymupdf / ollama-vision / batch-pdf / lima-pypdf / `scripts/batch/*.py` batch-books / enricher) + what each captures + when — route to these, never reinvent. `MATH_SCIENCE_SCHEMA` = full physics superset (vc/fz/ap/ae + tool_material + coating + geometry + material_physics(kc1.1/mc/Taylor) + conditions + limits), each group naming the equations it feeds + the domains it compounds. Constants stay canonical in `src/physics/constants.ts`. `routeCatalog()` + `coverageGaps()`. **Oscar/lima/kilo doing catalog extraction MUST consult this router first.**

Related: [[reference_prism_reference_db_2026_05_30]] · [[reference_critical_resource_roots_2026_05_30]] · [[feedback_think_ahead_extract_adjacent_databases]] · Charlie's corpus index `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json`.
