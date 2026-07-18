# Fusion 360 Backend Navigation Map — no screenshots, no blind navigation

**Owner:** kilo (CAM) — bridge owner · **For:** delta (CAD/design), echo (post-processors), kilo (CAM)
**Date:** 2026-05-31 · **Status:** built (delta+echo nav endpoints proven on live build 2703.1.11; **pending Fusion add-in restart to expose the new routes** — no hot-reload)

## Why this exists

Operator directive: *"plotting the entire back end for navigation so we won't need screenshots and won't have to navigate blindly."*

When PRISM AI drives Fusion, it must **know the backend state** — what bodies/sketches/occurrences are in the design, what the timeline did, what parameters exist, what the operator has selected, which posts are installed, which NC programs exist. Before this map, that meant a screenshot of the Fusion UI or blind API probing. Now every piece of backend state is reachable by a **deterministic read endpoint** keyed on a stable id/path. The AI navigates by reference, never by sight.

This is the same move that made **CAM** non-blind (the `/cam/*` + `/component/*` read endpoints). This map extends it to the **Design (delta)** and **Post (echo)** backends and documents the whole navigation surface in one place.

## The bridge

- **Add-in:** `PRISM_Fusion_Drive` (`mcp-server/scripts/fusion360-addin/fusion360_api_server.py`), HTTP server on **`http://127.0.0.1:18365`**.
- **No hot-reload.** Editing the add-in requires a **full Fusion restart** (or Scripts-and-Add-Ins → Stop/Run) before new routes appear. The new `/design/*` + `/post/*` routes below are committed but **will 404 until the next restart** — verify with `curl :18365/design/tree` after restart.
- **Thread model:** every read runs on Fusion's main thread via the custom-event dispatch; `/health` is the only off-thread route.
- **Units:** Fusion's internal length unit is **cm**. All geometry reads here emit **INCH** (`/2.54`) AND report the design's own `design_length_unit` so a metric document can never be misread as inch (the 25.4× scale trap). JM is imperial — confirm `design_length_unit == "in"`.

## Navigation surface — read endpoints by domain

### Shared (any workspace)
| Endpoint | Method | Returns | Navigate-by |
|---|---|---|---|
| `/status` | GET | doc name, component/body/timeline counts, `data_file_id`+`data_file_name`+`is_saved` when cloud-saved | **`data_file_id`** — the stable cloud id; reopen instantly via `Data.findFileById` (beats the 60s enumeration cap) |
| `/health` | GET | `{status:"ok",port}` | liveness probe (off-thread) |
| `/geometry` | GET | root bodies (mm — legacy) | body index/name |

### delta — CAD / Design backend (NEW)
| Endpoint | Method | Returns | Navigate-by |
|---|---|---|---|
| `/design/tree` | GET | root component (bodies+sketches+construction counts, each body's `name/is_solid/is_visible/volume_in3/bbox_in/face_count`, each sketch's `name/profile_count/is_fully_constrained`) + every occurrence (flat, ≤500) with `full_path/component_name/is_grounded/is_visible/body_count/bbox_in` + `design_length_unit` | **`full_path`** (occurrence) · body/sketch **`index`+`name`** |
| `/design/features` | GET | timeline (≤1000): each item `name/entity_type/entity_name/is_suppressed/health_state` | timeline **`index`** · feature **`name`** |
| `/design/parameters` | GET | user params + model params (≤2000): `name/expression/value(internal cm·rad)/unit/comment` | parameter **`name`** (drive edits by name, never by clicking) |
| `/design/selection` | GET | live UI selection: each `entity_type/name/body/component/bbox_in` | reads what the **operator** picked (e.g. a parting face) — no screenshot |

### echo — Post-processor backend (NEW)
| Endpoint | Method | Returns | Navigate-by |
|---|---|---|---|
| `/post/library` | GET | per library location (Fusion360 / Local / Cloud "My Posts" / External): `root_url`, `post_count`, `posts[]={leaf,url}` (≤500, depth-capped, fail-soft) | **post `url`** (e.g. `system://acramatic.cps`) — select a `.cps` by url/leaf, never by browsing the Post Library dialog |
| `/post/programs` | GET | NC Programs in the active doc: `name/post_url/operation_count`. Empty + `note` when the doc has no Manufacture data (a state, not an error). | NC-program **`index`+`name`** |

### kilo — CAM backend (pre-existing, listed for completeness)
`/cam/setups` · `/cam/setup/stock` · `/cam/setup/bodies` · `/cam/geometry-detail` · `/cam/feature-candidates` · `/cam/toolpath/status` · `/tool-library` · `/tool-library/search` · `/data/projects` (GET) · `/component/insert` · `/component/list` · `/component/joint` · `/cam/setup` · `/cam/operation` · `/cam/post` (POST) — see `state/shared/cam-drive/` for the CAM-drive recipe-replay system that consumes these.

## The deterministic "navigate without a screenshot" workflow

1. **Identity** — `GET /status` → cache `data_file_id`. Reopen any time via `Data.findFileById(id)` (POST `/data/file/open` with the cached id) — no cloud enumeration, no 60s cap.
2. **What's in the design** — `GET /design/tree` → bodies/sketches/occurrences by `full_path`/`index`/`name`, all bbox in inch.
3. **How it was built** — `GET /design/features` → the timeline recipe.
4. **What's parametric** — `GET /design/parameters` → edit by `name` via POST `/parameter`.
5. **What the operator picked** — `GET /design/selection` → read the live selection (parting face, datum, etc.) instead of asking for a screenshot.
6. **Which post / what's programmed** — `GET /post/library` (pick a `.cps` by url) → `GET /post/programs` (existing NC programs).
7. CAM drive proceeds via the `/cam/*` + `/component/*` write endpoints, gated (see CAM-drive recipe-replay).

Every step returns structured JSON keyed on a stable reference. No UI scraping anywhere in the loop.

## Live-proven (build 2703.1.11, 2026-05-31)

Verified via the add-in's `/execute` (proving the underlying Fusion API on the live build without a restart):

- **delta:** `unitsManager.defaultLengthUnits`→`"in"` · `bRepBodies/sketches/allOccurrences/timeline/userParameters/allParameters/constructionPlanes.count` · body `isSolid/isVisible/volume÷16.387064→in³/boundingBox→inch` · timeline `name/isSuppressed/int(healthState)/entity.objectType="adsk::fusion::Sketch"` · `userInterface.activeSelections.count`.
- **echo:** `adsk.cam.LibraryLocations` all 4 members · `CAMManager.get().libraryManager.postLibrary` · `urlByLocation(Fusion360LibraryLocation)`→`"system://"` · `childAssetURLs`→**100 posts** · `childFolderURLs`→0 (flat) · `URL.leafName`→`"acramatic.cps"` · `URL.toString()`→`"system://acramatic.cps"`.

`py_compile` clean. The literal new routes cannot be curled until the running add-in is restarted (no hot-reload) — that is the only unverified step, flagged honestly.

## Notes for delta + echo

- The endpoints live in kilo's shared Fusion add-in (one add-in = one bridge — do not fork a second HTTP server; the port-collision lesson is in `[[reference_kilo_fusion_addin_port_fork_2026_05_30]]`).
- To add a domain-specific read, follow the convention: a GET handler `_design_*`/`_post_*`, fail-soft via `_nav_safe`, INCH out + unit label, an elif in `_dispatch_get`. Then restart Fusion and curl to verify.
- After restart, smoke-test: `curl :18365/design/tree`, `curl :18365/post/library`.
