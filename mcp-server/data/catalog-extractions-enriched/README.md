# Catalog cutting-data enrichment (Phase A)

Enriches Charlie's `../catalog-extractions/` tool skeletons (which ship `cutting_data:[]`) with REAL per-ISO cutting recommendations cross-referenced from `manufacturer-speed-feed-data` (431 vendor series) + `user-proven-cutting-data` (1139 production records), via the built dist.

**This is a SEPARATE tree — Charlie's originals are untouched.** Each `cutting_data` entry carries `source`, `matchType` (series-match = confidence 0.8, ISO-aggregate fallback = 0.5), and a `caveat`. Tools with no ISO group are loud-flagged (`_enrichment.unmatched`). **Granularity is per-ISO, NOT per-grade** — Phase B (vendor PDF parsing) refines to grade precision.

Totals: 250 tools, 17 enriched (0 series-matched), 233 unmatched, 24 cutting_data entries. See ENRICHMENT-REPORT.json.

Regenerate: `node scripts/enrich-catalog-cutting-data.mjs --apply` (requires `cd mcp-server && npm run build` first so dist/data is current).
