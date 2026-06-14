---
name: oscar-shoptool-csv-auto-absorb-2026-06-01
description: "U-OSC9-SHOPTOOL-CSV-AUTO-ABSORB shipped — ShopToolLibraryEngine auto-globs shop-tools-*.csv (was hardcoded 7-file list). Goal's auto-absorption half now COMPLETE for both data formats: JSON registry + CSV tool-library (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.259Z
aliases: reference_oscar_shoptool_csv_auto_absorb_2026_06_01
---


Found while verifying the goal's "automatic absorption of Charlie's new databases" was complete end-to-end. The JSON catalog path auto-absorbs ([[oscar-sfc-db-auto-absorb-2026-05-31]], 5c1480c413 — `SfcDatabaseRegistryEngine` auto-globs `*-extracted.json`, 32 catalogs live). But the **CSV** tool path did NOT.

**GAP (found 2026-06-01):** `ShopToolLibraryEngine.loadAll()` read a HARDCODED `CSV_SOURCES` list of 7 files. Charlie's tool CSVs reach the SFC pipeline via `SpeedFeedShopLibraryBridgeEngine`, but a NEW `shop-tools-*.csv` he dropped in was NOT absorbed (not in the list).

**SHIPPED — U-OSC9-SHOPTOOL-CSV-AUTO-ABSORB (2 files, +91/-5):** new `loadFrom(dir)` loads the known `CSV_SOURCES` (explicit categories) AND `readdirSync`-globs any other `shop-tools-*.csv`, deriving the category from the filename (`[\s-]`->`_` + lowercase, matching `getByCategory`). `loadAll()` delegates to `loadFrom(DATA_DIR)`; `_tools` cache + `reload()` intact. Backward-compat: byte-identical today (the `loaded` Set skips the 7 known from the glob). Fail-soft on unreadable dir. 4 R9 tests (backward-compat + auto-discovery via real-content temp CSV + normalized-category + fail-soft); tsc 0; per-file 2-arm scrutiny PASS. LF-in-index (normalized after Edit — same anomaly class as the other SFC engines).

**GOAL STATUS — auto-absorption half now COMPLETE for BOTH formats:** JSON catalogs (`SfcDatabaseRegistry` auto-glob) + CSV tool libraries (`ShopToolLibrary` auto-glob). New databases Charlie adds in EITHER format are absorbed on next load/reload with zero code change. (Live-mid-process absorption still needs `reload()` — matches prior behavior, no regression; a watcher is a future option.)

**Note:** the live-:3100-audit speed-feed bugs ([[reference_sfc_speed_feed_bugs_2026_05_31]]) + #50 tool_life/surface per-metric segmentation remain queued.

Relates to [[oscar-seg-calib-forward-2026-06-01]], [[oscar-sfc-db-auto-absorb-2026-05-31]], [[reference_shop_tool_library_bridge_design_2026_05_27]].
