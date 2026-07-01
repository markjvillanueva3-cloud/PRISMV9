# vendor-catalog-db

> Durable persistence of Charlie's VENDOR-NETWORK-MS0 vendor corpus. Owner: juliett.
> Schema 1.0.0. Regenerate: `node scripts/build-vendor-catalog-db.mjs`.

Consolidated from the gitignored/regenerable `state/shared/quoting/` coordination files into
this committed store (same pattern as DocuStrata -> jm-die-database).

## Counts (re-derived from live source files)
```json
{
  "vendors": 482,
  "vendors_with_website": 310,
  "catalogs": 114,
  "sfc_makers": 169,
  "sfc_high_priority": 80,
  "sfc_already_ingested": 18,
  "jm_tool_vendors": 49,
  "jm_total_tool_spend": 4914833.88
}
```

## Tables
- `tables/vendors.jsonl` — supplier/distributor directory (vendor_id, name, vendor_type, categories, website, reach, regions, pricing_access, has_api, jm)
- `tables/catalog-vendors.jsonl` — harvested catalog-vendor records (the makers behind the pulled cutting-tool catalog PDFs)
- `tables/sfc-makers.jsonl` — POINTER projection of the SFC extraction manifest (vendor, priority, on-disk, already-ingested, target .ts file) — NOT cutting data; oscar owns that
- `tables/jm-tool-purchases.json` — JM Die real tool-procurement rollup (which makers JM buys; spend by vendor)

## Scope boundary
- **oscar (speed-feed)** owns the SFC cutting-data extraction into `mcp-server/src/data/<vendor>-speed-feed-data.ts`.
  This store holds METADATA + a POINTER projection of the SFC manifest — never extracted vc/fz cutting data.
- Legacy `mcp-server/data/vendor-catalog-manifest.json` (38-PDF tool-COUNT extraction) is a distinct concern — cross-referenced, not overwritten.

## Cross-references
- **charlie_corpus_index**: state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json
- **sfc_extraction_manifest**: state/shared/quoting/catalog-sfc-extraction-manifest.json (oscar — cutting-data .ts targets)
- **sfc_data_targets**: mcp-server/src/data/<vendor>-speed-feed-data.ts (oscar's extraction output)
- **legacy_tool_count_manifest**: mcp-server/data/vendor-catalog-manifest.json (distinct: 38-PDF tool-COUNT extraction, not this directory)
- **pulled_pdfs_dir**: H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29 (164 PDFs, not in repo)
- **jm_die_database**: mcp-server/data/jm-die-database/ (JM corpus — procurement cross-ref)
