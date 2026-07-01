---
name: reference_hotel_jm_die_vendor_data_ingest_2026_05_29
description: JM Die's DocuStrata QuickBooks "Purchases by Vendor Detail" report (880pp, 2014-2026) ingested into the ERP as jm-die-vendor-registry.json (174 vendors) + jm-die-purchases-summary.json (20,550 bill-lines) — real AP/vendor master data; regen path + honesty caveat recorded
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.611Z
aliases: reference_hotel_jm_die_vendor_data_ingest_2026_05_29
---


Ingested JM Die's real accounts-payable history into the ERP (slot:hotel, 2026-05-29, commit U-PSGB-HOTEL-ERPDATA).

**Source:** `H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf` — a QuickBooks **Purchases by Vendor Detail** export, 880 pages, Accrual Basis May 1 2014 → May 29 2026. (This partially supersedes [[reference_hotel_jm_die_back_office_geography]]'s "NO accounting subtree" note — there IS now structured AP/vendor data in the ERP state dir, ingested from the DocuStrata report.)

**Pipeline:** PDF → text via pypdf (`H:/Tools/python/python.exe`, one-liner in the script header; the Read tool can't rasterize — no pdftoppm) → `scripts/ingest-docustrata-jm-report.mjs` parses it.

**Parse model (after a dry-run caught a bug):** the per-vendor `Total <name> <N>` line is the AUTHORITATIVE anchor (the naive "any non-Bill line = vendor" heuristic mis-counted 20,274 fake vendors; Total-anchored gives the true **174**). `Bill` lines accumulate into a pending buffer that each `Total` flushes to that vendor. `N` on a Total line = the **Qty-column sum (units), NOT a transaction count and NOT dollars** — labeled `qtyTotalReported`.

**Outputs (ERP state dir `mcp-server/data/state/`):**
- `jm-die-vendor-registry.json` — 174 vendors: `{vendor, billLineCount, qtyTotalReported, itemCategories, firstBillDate, lastBillDate}`.
- `jm-die-purchases-summary.json` — 20,550 bill-lines · byItemCategory (steel 5609 / machine 3967 / misc 1803 / subcontract 1284 / shop_supplies 561 / uncategorized 7326) · byYear (2014-2026, peak 2014 @ 2668 + 2025 @ 2626) · top-25 by activity.

**Top vendors by activity (real T&D suppliers — validates the parse):** MICHIGAN CARBIDE (2879 bill-lines), CINCINNATI TOOL STEEL (2040), ROCKFORM CARBIDE MFG (1953), ALRO STEEL (1464), SCIENTIFIC METAL TREATING (1238).

**HONESTY (financial-invariant doctrine):** NO dollar spend extracted — column-flattened PDF text can't yield dollars-to-the-cent, and fabricating a spend figure would violate no-fabrication-in-financial-reports ([[feedback_hotel_financial_invariant_gate]]). Counts are authoritative (Total-line-anchored + parsed Bill lines); spend reconciliation must come from the QuickBooks source. Vendor names are B2B data (no PII).

**Wired to juliett (database-expansion), commit U-PSGB-HOTEL-DBWIRE:** both files carry a `databaseExpansionBridge` pointer (baked into the ingest script's output, survives regeneration). Juliett owns the CANONICAL `mcp-server/data/jm-die-database/` store (the SAME DocuStrata report consolidated with 111k docs, via `build-jm-die-database.mjs`) — these ERP files are the business VENDOR-MASTER VIEW; query the full store via `prism_data:database_search`. Bridge declared in business `CLAUDE.md §Related-galaxies` + `MEMORY.md`; juliett's own MEMORY.md line-59 already carries the reverse `business CONSUMES` edge (symmetric). Reconcile against juliett's store, do NOT re-OCR (R8). Cross-tree caveat: juliett's store is juliett-worktree-canonical (merges to main via golf) — verify the path before relying on it programmatically.

**Regen:** `node scripts/ingest-docustrata-jm-report.mjs` (re-extract text first via the pypdf one-liner in the script header; the 2.26MB `.tmp.txt` is deleted/regenerable). Paths recorded in `business/PATHS.md`. Future ERP-vendor work (vendor-management engine, reorder-point) can consume these as vendor master data. Links: [[reference_hotel_jm_die_back_office_geography]] · [[reference_hotel_business_galaxy_2026_05_28]] · [[reference_juliett_jm_die_database_2026_05_29]].
