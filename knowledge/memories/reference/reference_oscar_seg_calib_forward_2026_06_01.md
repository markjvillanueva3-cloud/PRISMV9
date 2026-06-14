---
name: oscar-seg-calib-forward-2026-06-01
description: "U-OSC9-SEG-CALIB-FORWARD shipped — segment context now FLOWS into the L1 loop, so the per-(iso x regime) segmented SFC calibration is ACTIVE (was dormant). + auto-absorption confirmed live (32 catalogs). Both goal halves now active (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.245Z
aliases: reference_oscar_seg_calib_forward_2026_06_01
---


Closes the "dormant" gap the goal Stop hook flagged: the segmented L1 calibration ([[oscar-segmented-calibration-2026-06-01]], b80a1e6365) shipped the storage/apply but NOTHING passed `context`, so no segment ever populated in production. This unit wires the forwarding.

**SHIPPED — U-OSC9-SEG-CALIB-FORWARD (commit after b80a1e6365):** forwards `{material, regime}` into `speedFeedDeepLearningEngine.recordFeedback` from the two real feed paths:
1. `SpeedFeedVendorDeltaCalibrationBridgeEngine.calibrateFromCells` — each `TriVendorCellResult` carries `material_name` + `cut_type` (verified line 211-216), so the **G-Wizard + baseline** deltas now train the per-(iso|_|regime) segment that predictSpeed/predictFeed READ (write-key == read-key).
2. `calcDispatcher:sfc_dl_record_feedback` — optional `material`/`tool_material`/`regime` params forwarded for direct shop-floor actuals.
`calibrateFromHsmAdvisorCompare` stays GLOBAL (the HSMAdvisor comparator lacks a material-NAME + cut_type to form a coherent regime key — sub-follow-up). 2 new tests prove segments populate end-to-end (`S|_|finishing` via calibrateFromCells, `S|_|semi_finishing` via the dispatcher); 27/27 file, tsc 0, per-file 2-arm scrutiny PASS.

**GOAL — BOTH HALVES NOW ACTIVE (verified this session):**
- **Auto-absorption of new DBs (Charlie's vendors/tooling):** `SfcDatabaseRegistryEngine` auto-globs the data dir at call time (NO cache → new catalogs absorbed automatically). LIVE: 10/10 auto-absorption tests PASS; **32 `*-extracted.json` catalogs + 2 tool-holder catalogs** currently absorbed. (Charlie's 7 new `shop-tools-*.csv` are consumed by `ShopToolLibraryEngine` — a different path; whether that flows into the SFC registry's tooling domain is a possible follow-up, NOT orphaned.)
- **Closed-loop SFC vs HSMAdvisor + G-Wizard:** vendor-delta bridge folds G-Wizard (absolute) + baseline (HSMAdvisor-ish) deltas (fd5c4e7f13) + HSMAdvisor LIVE comparator (6b10a9ed66) + now PER-SEGMENT via this forwarding → the loop ACTIVELY flows (compare → learn per-(iso×regime) → apply).

**FOLLOW-UPS:** #50 U-OSC9-SEG-TOOLLIFE-SURFACE (per-metric keys for tool_life/surface + fix pre-existing unbounded feedbackHistory O(n^2)); verify ShopToolLibrary CSV → SFC registry tooling-domain flow; the 2 live-audit speed-feed bugs ([[reference_sfc_speed_feed_bugs_2026_05_31]]). Deferred non-blocking: regime-omitted feed → iso|_|_ is safe (never corrupts a named bucket); dispatcher tool_material forward is inert forward-compat for #50.

Relates to [[oscar-segmented-calibration-2026-06-01]], [[oscar-hsmadvisor-live-wire-2026-06-01]], [[oscar-sfc-close-loop-2026-05-31]], [[oscar-sfc-db-auto-absorb-2026-05-31]]. Wiki: [[sfc-segmented-calibration]].
