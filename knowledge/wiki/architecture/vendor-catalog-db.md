---
title: vendor-catalog-db — persisted vendor corpus store
type: architecture
status: current
owner: juliett
created: 2026-05-31
tags: [database-expansion, vendor, catalog, quoting, procurement, jm-die, persistence]
---

# vendor-catalog-db

Juliett's durable, committed, schema-versioned persistence of Charlie's **VENDOR-NETWORK-MS0** vendor corpus. Operator directive 2026-05-31: *"charlie linked you new pdfs and customers to extract into our databases."*

## What + why

Charlie's catalog-pull campaign produced gitignored/regenerable coordination files under `state/shared/quoting/`. Those are not durable. This store consolidates them into the committed data layer — the same pattern as `DocuStrata → mcp-server/data/jm-die-database/`.

| Table | Records | Content |
|---|---|---|
| `tables/vendors.jsonl` | 425 | supplier/distributor directory (vendor_id, name, type, categories, website, reach, regions, pricing_access, has_api, jm) |
| `tables/catalog-vendors.jsonl` | 77 | makers behind the 164 pulled catalog PDFs |
| `tables/sfc-makers.jsonl` | 131 | **pointer projection** of the SFC extraction manifest (vendor, priority, on-disk, target .ts) — NOT cutting data |
| `tables/jm-tool-purchases.json` | — | JM Die procurement rollup ($4.91M; 49 distinct tool vendors) |
| `manifest.json` | — | schemaVersion + counts + `directoryStats` + `sourceRegistry` + `crossRef` + `consumers` |

## Scope boundary (no duplication)

- **oscar (speed-feed)** owns SFC cutting-data extraction → `mcp-server/src/data/<vendor>-speed-feed-data.ts`. This store keeps only metadata + manifest pointers; `projectSfcMaker()` is allowlist-style so vc/fz cutting data cannot leak in (regression-tested).
- Legacy `mcp-server/data/vendor-catalog-manifest.json` (38-PDF tool-COUNT extraction) is a distinct concern — cross-referenced, not overwritten.
- **charlie** owns acquisition; **hotel** consumes the directory as a procurement/supplier master.

## Ops

```bash
node scripts/build-vendor-catalog-db.mjs            # apply (re-run after Charlie regenerates the quoting artifacts)
node scripts/build-vendor-catalog-db.mjs --check    # verify the 5 sources + report counts, no writes
node --test scripts/build-vendor-catalog-db.test.mjs   # 7 tests
```

**Fail-loud:** throws if any of the 5 quoting sources is missing, OR if the SFC manifest `.records` array is empty (schema-drift guard — never persists a 0-maker store). Counts are re-derived from the live files (the corpus index's own rule: "re-derive from live files, not prose"). Tables are force-added (`git add -f`) past the blanket data-jsonl ignore — small, durable reference data.

## Extraction routing + full math/science schema (2026-05-31)

`scripts/lib/catalog-extraction-router.mjs` (+ `.test.mjs`, 11/11) is the **governance layer** over PRISM's extraction toolset — emitted as `EXTRACTION-ROUTING.json` in this store by the ingester. Operator directive: *use the extractor scripts + "batch books" we built; capture ALL math/science so it compounds across domains + equation parts.*

- **`EXTRACTORS`** (7) — inventory of the EXISTING tools + what math/science each captures + when-applicable: `camelot-extract.py` (clean tables), per-vendor `extract-<vendor>.py` (pymupdf geometry), `batch-ollama-vision-extract.mjs` (scanned/overnight GPU), `batch-pdf-extract.mjs` (triage stubs), lima `extract-jm-die-corpus-page-by-page.py` (prose), `scripts/batch/*.py` (the "batch books" — batch_processor/extraction_batch/material_batch), `enrich-catalog-cutting-data.mjs` (post-extract cross-ref). **Route to these; never reinvent.**
- **`MATH_SCIENCE_SCHEMA`** — the full physics superset (cutting_params vc/fz/ap/ae · tool_material+wear · coating · geometry · material_physics kc1.1/mc/Taylor · conditions coolant/hardness · limits), each group naming the **equations** it feeds and the **domains** that compound it. Physics constants stay canonical in `src/physics/constants.ts` — extraction records the catalog value + provenance, never inlines.
- **`routeCatalog(signals)`** picks the extractor(s); **`coverageGaps(record)`** flags missing math/science groups.

Memory: [[reference_vendor_catalog_db_2026_05_31]] · source index: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json`.
