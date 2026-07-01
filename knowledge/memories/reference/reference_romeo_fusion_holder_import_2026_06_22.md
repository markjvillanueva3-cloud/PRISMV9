---
name: reference_romeo_fusion_holder_import_2026_06_22
description: "ROMEO drove the live Fusion bridge to import the 643-holder catalog + the JM tooling DB; found+fixed HAIMER catalog designation corruption (slot:romeo, 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.148Z
aliases: reference_romeo_fusion_holder_import_2026_06_22
---


ROMEO session 2026-06-22 (commit `bc9956b610`). Operator: "we built a system for you to drive fusion, 3 ports open... get the tool holder and tooling databases imported into fusion."

## The Fusion drive system (discovered)
- **`scripts/fusion360-addin/fusion360_api_server.py`** (base PORT 18360) is the HTTP server running INSIDE Fusion with `adsk` API access. Three live instances: **:18361 / :18362 / :18365** (each `GET /health` -> `{status:ok,port:N}`). `:3100` is the separate PRISM MCP backend; `prism_bridge.py` is a CLIENT (add-in -> PRISM :18361/ppg), NOT the drive server.
- Key endpoints: `GET /status` (active doc/workspace), `GET /tool-library` (lists libs; `source:cam_api` when CAM active, `file_fallback` when not), **`POST /tool-import`** `{library_name, tools:[]}` (<=1000/req; `adsk.cam.Tool.createFromJson`+`tool_lib.add` into LocalLibraryLocation when CAM active, else writes `.tools` to Local/ dir), `DELETE /tool-library/<name>`, CAM-creation endpoints (line 1293+).
- **CAM-active gate:** `createFromJson` only runs when the CAM product is `app.activeProduct` (i.e. Fusion is in the Manufacturing workspace). On an empty/Design doc it falls back to file-write (which Fusion still loads on tool-library refresh). This session stayed `file_fallback` (operator did not switch to Manufacturing), so the standalone-holder LOADER acceptance is unverified-by-bridge -- pending a tool-library refresh.

## What shipped
- **Tooling DB confirmed imported:** 49 libs / 57,666 tools live in Fusion Local/ (JM cribs + 17 brand catalogs). JM machine tools carry REAL holder collision geometry (679/1071, VMC mills 100%) from [[reference_fusion_holder_libraries_2026_06_18]] (CSV `holder_segments` -> `holder.segments`).
- **643-holder catalog imported** into 7 per-type libs (`PRISM_HOLDERS_{SHRINK_FIT 476,HYDRAULIC 46,WELDON 42,COLLET_CHUCK 40,MILLING_CHUCK 21,POWER_CHUCK 16,ER 2}`) via `scripts/holders-to-fusion-import.mjs` (probe/all/dry, batched). Uses the PROVEN `holder.segments` shape (description/vendor/product-id + `[{upper-diameter,lower-diameter,height}]`, INCHES) pulled from a live JM crib tool (REGO-FIX CAPTO). Structure verified (v2 JSON, type:"holder", segments populated); probe lib cleaned up via DELETE.

## R12 finding: HAIMER catalog designation corruption
`mcp-server/src/data/haimer-holder-catalog.ts` has **428/489 mangled designations** (`.12.4`, `.11.71)` -- valid bore/body/overall dims, garbage NAME strings; the true HAIMER order codes are LOST upstream, need a catalog re-extraction). Only 80/643 were fully clean. Fix at import time: `canonDesignation()` reconstructs canonical `BRAND-TAPER-TYPE-BORE` (e.g. `.11.71)` -> `HAIMER-PSC-ER-16.0`) from the valid fields (0/643 still-bad after). Caught by a `--dry` run on real data BEFORE bulk import (verify-before-bulk on my own tool). The DIMENSIONS were always fine -- only names needed reconstruction.

## Open / follow-ups
- **Loader-acceptance unverified:** standalone `type:"holder"` entries written via file_fallback; confirm they appear on Fusion tool-library refresh. If not, pivot to (a) live `createFromJson` once operator is in Manufacturing, or (b) holders-on-tools (proven shape, guaranteed load).
- **Root-cause:** repair `haimer-holder-catalog.ts` designations at source (juliett/data domain) so all consumers get clean names -- canonical reconstruction or re-extract true order codes.
- **PRISM_JM_Milling** (15,994 aggregate) still holder-name-only (its CSV not run through the fixed jm-csv-to-fusion-tools converter) -- per [[reference_fusion_holder_libraries_2026_06_18]].
