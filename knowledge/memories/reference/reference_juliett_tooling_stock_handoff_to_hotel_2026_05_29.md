---
name: reference_juliett_tooling_stock_handoff_to_hotel_2026_05_29
description: JM Die tooling+stock compiled from ALL sources (purchased + 153K mfr-catalog records + holders + monolith) into a cross-referenced master manifest, handed to hotel for the ERP (U-JMTS01)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.176Z
aliases: reference_juliett_tooling_stock_handoff_to_hotel_2026_05_29
---


**JM Die tooling+stock → hotel ERP handoff (2026-05-29, slot:juliett, U-JMTS01, commit ab30f93da8).**

Operator directive: compile JM Die tooling+stock from the DocuStrata folder + vendor-orders PDF, **include ALL data (not just the vendor report)** incl. the **previous monolith build**, keep sources **SEPARATE + cross-referenced**, pass to hotel.

**Key correction (operator caught the undercount):** my first pass was vendor-report-only (~6,248 tooling lines = ~4% of reality). The real tooling universe is far bigger; I built a **master manifest** indexing every source.

**Parser undercount root-cause fix (2nd correction, same session):** the PURCHASED parser had 3 real bugs, all fixed + 16/16 tests:
1. Line detector keyed on `/^Bill/` — dropped EVERY vendor block's FIRST item row (QuickBooks prints the vendor name in the Type column on row 1, not "Bill") + all bare-date continuation rows. Single-transaction vendors (GREGGA CARBIDE) vanished entirely. Fixed: key on the transaction DATE.
2. `Total <vendor>` name extraction glued the category column onto names (`PTS-TOOLS … MISC. 4,914`). Fixed: column-split, take col 0. (Do NOT strip a trailing number — QuickBooks names distinct accounts `CINTAS 22` vs `CINTAS 769`; stripping merged them.)
3. `promoteClass()` (new pure+tested fn): a CARBIDE/TOOL-named vendor with a spurious "STEEL" category column but NO real steel grade → tooling (ROC FORM CARBIDE 1,900 lines + GREGGA + PTS-TOOLS were wrongly in stock). Also added a `main()`-on-import guard (test-import was silently rewriting the catalogs).
Result: tooling vendors 50→**59**, tooling lines 6,754→**8,028** (+18.9%); stock correctly shed the carbide-house noise (3,281→2,212 lines / **60** grade-forms). vendorCount reconciles at **174**.

**Sources (kept separate, cross-referenced — NOT merged/duplicated):**
- **PURCHASED** (vendor report): `jm-die-tooling-catalog.json` (**59 tooling vendors / 8,028 lines**) + `jm-die-stock-material-catalog.json` (**60 grade-forms / 2,212 lines**; H13/M2/S7/D2 top). Reconciles hotel's 174-vendor registry. `itemLineTotal=20,731` (DISTINCT item rows > hotel's ~20,550 Bill-transactions — finer granularity, not a discrepancy). NO $ (financial-invariant). Residuals (documented, low-impact): grinding/abrasive houses ~1% over-promoted to tooling (RADIAC ABRASIVES is genuinely abrasive tooling → correct; F&S GRINDING is service → minor); MEYER GAGE→shop_supply (metrology); machinery dealers (ALL WORLD, H&W) + EDM subcontractors (XACT, PRO-WIRE) correctly NOT tooling.
- **MFR_CATALOGS**: **77 files ≈ 153,394** manufacturer tool/insert spec records in `mcp-server/src/data/*-tools-extracted.json` / `*-tool-catalog.ts` (emuge 13.7K, additional 13.3K, kennametal-turning 11.9K, osg 11.5K, indexable 11.5K…) + `tool-catalog-inventory.json` (45 source PDF catalogs).
- **HOLDERS**: big-daishowa 1,208 + fusion-tool-holders 795 + haimer 489 + guhring 23.
- **MONOLITH**: `H:/PRISM/PRISM_v8_89_002_TRUE_100_PERCENT.html` (48.6MB, 944,903 lines; `PRISM_CUTTING_TOOL_DATABASE_V2`, `PRISM_BIG_DAISHOWA_HOLDER_DATABASE`, `PRISM_TOOL_HOLDER_INTERFACES_COMPLETE`) — ported to `ToolHolderDatabaseEngine.ts` + `ToolDatabaseBridgeEngine.ts` + re-extracted into the MFR_CATALOGS files. **This is the "previous monolith build" the operator referenced — it's on H:, found.**

**Artifacts (juliett DB `mcp-server/data/jm-die-database/`):** `jm-die-tooling-stock-master-manifest.json` (the cross-ref index) + `jm-die-tooling-stock-handoff.json` (hotel ERP recs) + the 2 purchased catalogs. Builders: `scripts/compile-jm-tooling-stock.mjs` (purchased, 7/7 tests) + `scripts/compile-jm-tooling-stock-manifest.mjs` (manifest).

**Classifier fixes (R12 — operator's "counts don't look correct"):** precedence STEEL-cat→service→grade→tooling; vendor-name signals (SCIENTIFIC METAL TREATING→service not stock; TS TOOLING→tooling not other); column-aware memo extraction. Residual: SUNNEN (honing) stays "other"; ~244 MICHIGAN CARBIDE lines leak vendor-name into memo (cosmetic).

**Hotel ERP path:** material-master from PURCHASED stock grades; tooling-master from MFR_CATALOGS; vendor-preference by crossing PURCHASED tooling-vendors × MFR manufacturers; holder-library from HOLDERS. Posted to chat-bus → hotel. See [[reference_juliett_jm_die_database_2026_05_29]] + [[reference_hotel_jm_die_vendor_data_ingest_2026_05_29]].
