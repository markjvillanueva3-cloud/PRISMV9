---
name: reference_kilo_fusion_backend_nav_map_2026_05_31
description: "Fusion 360 Backend Navigation Map (slot kilo, 2026-05-31): read-only :18365 add-in endpoints exposing the Design (delta), Post (echo) + CAM (kilo) backends as JSON keyed on stable ids/paths — so PRISM AI navigates by reference, never by screenshot or blind probing. Operator: 'plot the entire back end for navigation so we won't need screenshots and won't navigate blindly.'"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.184Z
aliases: reference_kilo_fusion_backend_nav_map_2026_05_31
---


**Fusion Backend Navigation Map** (slot kilo, 2026-05-31, `/checkin-kilo` work order). Operator: *"follow the same steps for echo and delta by plotting the entire back end for navigation so we won't need screenshots and won't have to navigate blindly."*

Made the Fusion **Design (delta)** + **Post (echo)** backends queryable the same way the CAM backend already was — read-only HTTP endpoints in the shared `PRISM_Fusion_Drive` add-in (`:18365`), returning structured JSON keyed on stable ids/paths. The AI navigates by reference, never by sight.

**New GET endpoints** (`mcp-server/scripts/fusion360-addin/fusion360_api_server.py`):
- delta: `/design/tree` (browser: bodies/sketches/occurrences w/ `full_path`+INCH `bbox_in`+`design_length_unit`), `/design/features` (timeline), `/design/parameters` (user+model, edit-by-name), `/design/selection` (live UI selection — what the operator picked).
- echo: `/post/library` (installed `.cps` across all library locations, pick by `url`), `/post/programs` (NC programs in active doc).

All fail-soft via `_nav_safe`; INCH out + doc's own unit label (25.4× guard); read-only GET (no actuation).

**Live-proven** on build 2703.1.11 via the add-in's `/execute` — every underlying Fusion API call (`CAMManager...postLibrary.urlByLocation`→`system://`, `childAssetURLs`→100 posts, `URL.leafName/toString`; `unitsManager.defaultLengthUnits`→`"in"`, timeline `int(healthState)`, `activeSelections.count`). `py_compile` clean. **Honest caveat (R12):** the literal new routes 404 until the running add-in is restarted (no hot-reload — same as the CAM nav endpoints) — that one step is unverified-pending-restart.

Full map: `state/shared/fusion-backend/BACKEND-NAV-MAP.md`. Wiki: [[fusion-backend-nav-map]]. CLAUDE.md pointer deferred to golf integration (peer-locked shared tree). Pairs with [[reference_kilo_cam_drive_recipe_engine_2026_05_31]] (CAM-drive consumes these reads), [[reference_kilo_fusion_addin_port_fork_2026_05_30]] (one add-in = one bridge).
