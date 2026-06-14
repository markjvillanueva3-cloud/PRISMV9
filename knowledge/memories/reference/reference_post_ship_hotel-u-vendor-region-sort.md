---
name: reference_post_ship_hotel-u-vendor-region-sort
description: Auto-distilled learnings from shipping HOTEL/U-VENDOR-REGION-SORT (commit 36fe87c03). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.503Z
aliases: reference_post_ship_hotel-u-vendor-region-sort
---


# HOTEL/U-VENDOR-REGION-SORT

[MAIN] [HOTEL]/U-VENDOR-REGION-SORT (slot:hotel iter11) [BOOTSTRAP-SLOT-ENFORCE]: NEW algorithm + engine — HaversineDistanceAlgorithm (24 NOAA-validated tests; Sinnott-1984 haversine formula; algebraic invariants symmetry+triangle-inequality+identity+antipodal verified within 0.001 relative error; clamped h for antipodal numerical stability) + VendorRegionEngine (20 tests; reads VendorEngine, ranks by proximity to origin_zip, separate unknown_location bucket per hotel-soul no-silent-fallback rule, deterministic tie-break, max_distance+limit cutoffs). 4 vendor_region_* actions wired into prism_business. Closes G9 from ERP-comparison audit (region-aware vendor sort — competitors lack this). 44 tests pass.

**Shipped:** 2026-05-24T14:43:26-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[hotel-u-vendor-region-sort]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._