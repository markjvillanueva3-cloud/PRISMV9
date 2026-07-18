---
title: Fusion 360 Backend Navigation Map
slug: fusion-backend-nav-map
kind: architecture
status: built
date: 2026-05-31
owner: kilo (CAM, Fusion-bridge owner) — for delta (CAD) + echo (post)
---

# Fusion 360 Backend Navigation Map

**What:** read-only HTTP endpoints in the `PRISM_Fusion_Drive` add-in (`:18365`) that expose the full Fusion backend — Design (delta), Post (echo), and CAM (kilo) — as structured JSON keyed on stable ids/paths, so PRISM AI navigates **by reference, never by screenshot or blind API probing.** Operator directive: *"plotting the entire back end for navigation so we won't need screenshots and won't have to navigate blindly."* Extends the move that made CAM non-blind to the CAD-design and post-processor backends.

## New navigation endpoints (CAMDRIVE/BACKEND-NAV, slot kilo)

| Domain | GET endpoint | Backend it exposes |
|---|---|---|
| delta (CAD) | `/design/tree` | browser: root component bodies+sketches+construction, every occurrence (`full_path`, `is_grounded`, INCH `bbox_in`), `design_length_unit` |
| delta (CAD) | `/design/features` | timeline (name, entity_type, suppression, health) |
| delta (CAD) | `/design/parameters` | user + model parameters (name, expression, value, unit) — drive edits by name |
| delta (CAD) | `/design/selection` | live UI selection (what the operator picked — e.g. a parting face) |
| echo (post) | `/post/library` | installed `.cps` posts across all library locations (`url`, `leaf`) — pick by url |
| echo (post) | `/post/programs` | NC Programs in the active doc (post, op count); empty+note when no Manufacture data |

All emit **INCH** (`/2.54`) + the doc's own `design_length_unit` (25.4× metric/imperial guard). Every field is fail-soft via `_nav_safe` — one bad entity never blanks the read.

## Live-proven + the one honest caveat
Every underlying Fusion API call is verified on **build 2703.1.11** via the add-in's `/execute` (e.g. `CAMManager.get().libraryManager.postLibrary.urlByLocation(...)` → `system://`, `childAssetURLs` → 100 posts, `URL.leafName`/`toString`; `design.unitsManager.defaultLengthUnits`→`"in"`, timeline `int(healthState)`, `activeSelections.count`). `py_compile` clean. **The literal new routes 404 until the running add-in is restarted** (no hot-reload) — the only unverified step, flagged honestly (R12).

## Convention for adding a domain read
GET handler `_<domain>_*`, fail-soft via `_nav_safe`, INCH out + unit label, an elif in `_dispatch_get`, then **restart Fusion** and `curl :18365/<route>` to verify. One add-in = one bridge — never fork a second HTTP server (port-collision lesson: [[reference_kilo_fusion_addin_port_fork_2026_05_30]]).

Full map: `state/shared/fusion-backend/BACKEND-NAV-MAP.md`. Add-in: `mcp-server/scripts/fusion360-addin/fusion360_api_server.py`. Pairs with the CAM-drive recipe-replay system ([[cam-drive-recipe-replay]]). Memory: [[reference_kilo_fusion_backend_nav_map_2026_05_31]].
