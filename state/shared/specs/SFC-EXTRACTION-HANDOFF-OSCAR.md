# SFC EXTRACTION HANDOFF — charlie → oscar (speeds/feeds DB population)

> **Cross-galaxy work-order.** charlie (quoting) acquired + triaged the catalog corpus; **oscar (Speed-Feed Calculator) owns the extraction into `src/data/*.ts`** (physics-adjacent — never inline constants, cite source pages). Generated 2026-05-30, slot:charlie, VENDOR-NETWORK-MS0/U-VDN-CATALOG-PULL.

## What charlie delivered
- **27 real validated S/F catalogs (~538 MB)** in `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/` (NOT in the repo — they're binaries in Resources).
- **Triage manifest:** `state/shared/quoting/catalog-sfc-extraction-manifest.json` (schemaVersion 1.1.0) — every cutting-tool maker → extraction target + priority + `catalog_on_disk` + `already_ingested` + **`jm_buys`/`jm_tool_spend`** (does JM actually buy cutting tools from this maker — the real-usage signal).
- **106 makers · 19 HIGH (catalog on disk + not ingested → extract NOW) · 18 LOW (already ingested → augment) · 69 MEDIUM (pull-then-extract).**

## Extraction order (JM-PRIORITIZED, per operator directive)
1. **JM-buys HIGH first** — the catalogs JM actually buys cutting tools from (`jm_buys:true` in the manifest). Sort the 19 HIGH by `jm_buys desc` (already done in the manifest sort). These directly serve JM's real tooling.
2. Then the remaining HIGH (catalog on disk, not ingested): Garr Tool (76 MB master + dedicated RECOMMENDED speeds/feeds), RobbJack, YG-1, Fullerton, IMCO, Cobra Carbide, Data Flute, Lakeshore Carbide, Kyocera, Tool-Flo (threading/grooving), Korloy, M.A. Ford, Walter, Harvey Tool.
3. LOW (augment): Sumitomo turning grade catalogs (E-185/E-176 just pulled) refresh existing `src/data/sumitomo-*`.

## Method (oscar's lane)
- Use **lima's pypdf page-by-page extractor** (canonical, NOT whiskey pdf-parse — [[feedback_use_lima_pypdf_page_extractor]]) on the S/F-table pages of each HIGH catalog.
- Map rows → **`ManufacturerSpeedFeed { series, isoGroup(P|M|K|N|S|H), vc_min/max (m/min), fz_min/max (mm/tooth|mm/rev), dc_min/max? }`** — one `mcp-server/src/data/<vendor>-speed-feed-data.ts` per vendor, exported + imported into **`ToolCatalogEngine.addTools()`** (ToolCatalogEngine.ts:548).
- **Cite source catalog + page per record; flag low-confidence parses; NEVER inline material/physics constants** (use `src/physics/constants.ts`). physics-reviewer gate applies (per-file scrutiny).
- A maker flagged `verify_ingestion:true` → confirm no existing `src/data` catalog covers it before extracting (don't double-ingest).

## Acceptance
Each new `<vendor>-speed-feed-data.ts` round-trips through `ToolCatalogEngine` + has a test asserting ≥1 real (series, isoGroup, vc, fz) tuple against the cited catalog page. Re-run `node scripts/build-catalog-sfc-manifest.mjs --jm-tools …` afterward — the extracted vendors flip HIGH→LOW (ingested), shrinking the HIGH queue.
