---
name: reference_catalog_extraction_pipeline_gap_2026_05_31
description: Catalog→cutting_data extraction pipeline is NOT production-ready — extract-generic-catalog.py mis-parses/crashes; build the camelot→schema normalizer before persisting.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.506Z
aliases: reference_catalog_extraction_pipeline_gap_2026_05_31
---


First real run of the BUILT catalog-extraction pipeline against the 242-PDF (≈256–263 recursive) tooling-vendor corpus at `H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/` (juliett, 2026-05-31). The pipeline is real in DESIGN but **not production-ready** — do not assume "run the extractor → DB is populated."

**Verified behavior (do not trust blindly):**
- `scripts/extract-generic-catalog.py` (arg-driven `<pdf> <out> [mfr]`, ISO-13399 geometry) — **MIS-PARSES** on this corpus: Korloy turning → 35 items but `designation:"1/64~1/32"` paired with `cutting_diameter_mm:5` (1/32″≈0.79 mm — wrong columns grabbed). Yields **0 items** on speeds-feeds GRID catalogs (maford-sf/ingersoll/lakeshore — grids ≠ geometry tables). **Crashes** on some PDFs (garr-sf → MuPDF "No common ancestor in structure tree"; harvey → batch exit 255). Output has **no `cutting_data` field**, so `enrich-catalog-cutting-data.mjs` can't consume it. **Persisting it would poison a safety-critical cutting DB → REFUSED + deleted per the operator's "never fabricate cutting data" bar (R12).**
- `scripts/camelot-extract.py` (camelot-py 1.0.9, installed this session) — **WORKS**: cleanly extracts SF-grid TABLES (garr-sf → 13, applitec → 12) as `{page,table_index_on_page,row_count,col_count,rows[][]}`. Use `--flavor stream` (avoids the Ghostscript dep). **But the raw tables are NOT mapped to `cutting_data` / MATH_SCIENCE_SCHEMA** — that mapping is unbuilt.

**The real net-new BUILD (next keystone, replaces the optimistic "seeder"):** a **camelot-tables → MATH_SCIENCE_SCHEMA classifier + per-vendor column normalizer** — (a) classify each table cutting-data/geometry/index by header keywords (SFM/IPT/chipload/Vc/fz/RPM/ap/ae); (b) per-vendor column maps; (c) **validate each normalized `[tool, material_iso, vc/fz]` tuple against a known reference value BEFORE persist** (CI-gated, no single-sample "calibrated"); (d) provenance-tagged records (vendor+pdf+page) → `prism-reference-db`. Until it passes a real-data validation oracle, the durable cutting stores stay the trusted `.ts` + enricher path — the catalog PDFs remain un-ingested-by-design, loud-flagged not silently half-filled.

**Side fix:** `scripts/db-toolbelt.mjs --status` was a silent misreport — printed `prism-reference-db · {}` while the store held **13,920 records** (summarizer ignored the `byCategory` manifest shape). Fixed → `total=13920` + category breakdown.

Canonical plan + full findings: `state/shared/specs/DATA-EXTRACTION-UTILIZATION-MASTERPLAN.md` (commits 920b4dc7, eeeef9e6). Related: [[reference_vendor_catalog_db_2026_05_31]] · [[feedback_always_fill_gaps]] · [[feedback_use_lima_pypdf_page_extractor]].
