---
title: CAM-DRIVE-MS0 — live Fusion CAM drive, validated + full-parameter
domain: cam
slot: kilo
created: 2026-05-29
status: shipped
tags: [cam, fusion, drive, live-bridge, safety-gate, catalog]
---

# CAM-DRIVE-MS0 — PRISM fully drives live Fusion CAM

**Operator question that drove this:** *"are you building the same way delta is where you'll be able to fully control and drive the cam software?"* → *"lets build everything we need."*

## The 3-layer stack (now complete + wired for Fusion)

| Layer | What | Where |
|---|---|---|
| 1. ENUMERATE | live-API param dump → grounded catalog | `scripts/cam-enumerators/fusion-cam-param-enumerator.py` + `ingest-fusion-cam-enum.mjs` → `cam-functions/fusion360/` |
| 2. VALIDATE | per-op param validity vs catalog | `CAMCatalogQueryEngine.validateOperation` |
| 3. **DRIVE** | create setup/op, set params, gen toolpath, post G-code in the live seat | `Fusion360LiveBridgeEngine` → `:18360` add-in (`fusion360_api_server.py`) → real `adsk.cam` |

CAM-DRIVE-MS0 added the **fuse between 2 and 3** and exposed the drive as MCP actions, so the catalog now *actuates* the machine — not just describes it.

## What shipped (4 units, 29 tests, 2-reviewer scrutiny PASS, 0 net-new tsc)

- **`CAMDriveGateEngine`** (`mcp-server/src/engines/CAMDriveGateEngine.ts`) — the validate→actuate safety fuse. `gate({system,operation,params})` → `{clearedToActuate, violations, knownParamCount, reason}`. Pure+sync, constructor-DI validator. Delegates to `validateOperation` + adds a **non-finite guard** (JS NaN/±Infinity *and* numeric strings `"Infinity"`/`"1e999"`, without false-flagging string enums). Fail-safe (validator throws → BLOCKED). Soul invariant: *no program without PMI validation*.
- **7 `prism_cam` drive actions** (camDispatcher): `cam_drive_gate` (preview), `cam_drive_create_setup`, `cam_drive_create_operation` (**gated** — blocks before the bridge on a bad op), `cam_drive_assign_tool`, `cam_drive_generate_toolpath` (+ `applyCollisionGate`), `cam_drive_toolpath_status`, `cam_drive_post` (+ `collisionGateForPost` — refuses an un-cleared toolpath).
- **Catalog-driven full-param expansion** — `CamOperationInput.raw_parameters` (TS, passed verbatim) + `_create_cam_operation` `raw_parameters` passthrough (Python add-in: sets *any* `operation.parameters.itemByName(name).expression`, per-param try/except, `{set,failed}` report). Closes the old 9-key `CAM_PARAM_MAP` cap — the full enumerated universe is now drivable.

## How delta drives CAD (the pattern this matches)

delta's true live-drive is Fusion-only too: `Fusion360LiveBridgeEngine` → `:18360` custom add-in (real create/modify). SolidWorks/Mastercam/Inventor are read/export-only or dry-run code-gen; Creo has no production transport. So "drive the software" = the Fusion HTTP-bridge-to-add-in pattern — which CAM-DRIVE-MS0 extends to the CAM verbs on the same bridge.

## Honest scope (R12)

Wires + exposes + param-expands the drive. The **live round-trip needs Fusion running + the PRISM add-in installed on :18360** (operator runtime; `auto_cam.py` already does add-in-side one-click STEP→G-code). The add-in must be Stopped+Run after the `.py` edit. **Next:** Mastercam (C-Hook) + hyperMILL drive once Fusion is proven on a real seat. Backbone for `MS-CAM-MASTERY` (34-unit click-level mastery).

## Memory
[[reference_kilo_cam_drive_ms0_2026_05_29]] · [[reference_kilo_cam_live_drive_layer_exists_2026_05_29]] · [[reference_kilo_cam_fusion_enumerator_2026_05_29]] · [[reference_kilo_cam_catalog_query_2026_05_29]]
