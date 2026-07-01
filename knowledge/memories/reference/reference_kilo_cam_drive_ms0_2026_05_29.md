---
name: reference_kilo_cam_drive_ms0_2026_05_29
description: "CAM-DRIVE-MS0 — wired PRISM to fully drive live Fusion CAM (7 cam_drive_* actions) gated by CAMDriveGateEngine + catalog-driven full-param expansion (raw_parameters); the catalog/enumerator now actuates every Fusion param, not 9"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.632Z
aliases: reference_kilo_cam_drive_ms0_2026_05_29
---


Operator: *"are you building the same way delta is where you'll be able to fully control and drive the cam software?"* → *"lets build everything we need."* CAM-DRIVE-MS0 (slot:kilo claude-1981bb83, 2026-05-29, ultracode). Connects kilo's catalog/enumerator work ([[reference_kilo_cam_fusion_enumerator_2026_05_29]]) to the pre-existing Fusion live-drive layer ([[reference_kilo_cam_live_drive_layer_exists_2026_05_29]]).

**The 3-layer stack is now complete + wired for Fusion CAM:** (1) ENUMERATE [enumerator] → (2) VALIDATE [CAMCatalogQueryEngine] → (3) DRIVE [Fusion360LiveBridgeEngine + :18360 add-in], now exposed as MCP actions with the validate→actuate fuse between 2 and 3.

**Built (4 units, all tested + 2-reviewer scrutiny PASS, 0 net-new tsc vs 548 baseline):**
- **U1 `CAMDriveGateEngine`** (`mcp-server/src/engines/CAMDriveGateEngine.ts`) — the validate→actuate safety fuse. `gate({system,operation,params,allowUnknownParams})→{clearedToActuate,violations:{missingRequired,outOfRange,invalidEnum,nonFinite,unknownParams},knownParamCount,reason}`. Pure+sync, **constructor-DI** validator (default = real catalog; tests inject fakes). Delegates param validity to `validateOperation` and ADDS a non-finite guard (catches JS NaN/±Infinity AND numeric-string "Infinity"/"1e999" via a numeric-shape regex that doesn't false-flag string enums like "climb"). Fail-safe: validator throws → BLOCKED. `unknown` extra keys are advisory by default (catalog ~55-59% complete) but always flagged; hard errors always block. 16 tests.
- **U2 7 `cam_drive_*` actions** in `camDispatcher.ts` (enum ~L1678 + cases after `f360_live_materials`): `cam_drive_{gate,create_setup,create_operation,assign_tool,generate_toolpath,toolpath_status,post}`. `create_operation` calls the gate FIRST and `break`s on `!clearedToActuate` BEFORE importing/calling the bridge (bridge unreachable when blocked — verified). `generate_toolpath` runs `applyCollisionGate`; `post` runs `collisionGateForPost`. `create_setup`/`assign_tool` are intentionally ungated (no catalog op to validate). 7 dispatcher tests.
- **U3 catalog-driven param expansion** — `CamOperationInput.raw_parameters?: Record<string,string|number>` (TS bridge passes verbatim) + `fusion360_api_server.py _create_cam_operation` `raw_parameters` passthrough (sets ANY `operation.parameters.itemByName(name).expression`, per-param try/except, `{set,failed}` report). **Closes the 9-param cap** — the bridge previously set only the 9-key `CAM_PARAM_MAP`; now the full enumerated universe (kilo's catalog) is drivable. 6 bridge tests (real loopback round-trip proving raw_parameters reaches the wire, NOT capped at 9).
- **U4** collision gates on the drive path + the two test suites above (real `node:http` loopback for the bridge — NOT a fetch mock; the TEST LEGITIMACY GATE rejects mocking the critical-domain SUT).

**Honest scope (R12):** this wires + exposes + param-expands the drive; the actual live-seat round-trip needs Fusion running + the PRISM add-in installed on :18360 (operator runtime — `auto_cam.py` already does add-in-side one-click STEP→G-code). The add-in MUST be Stopped+Run after the .py edit. Related milestone: `MS-CAM-MASTERY` (34 units, the 5-pillar per-system click-level mastery — this is the live-drive backbone for it). Next: same pattern for Mastercam (C-Hook) + hyperMILL once Fusion proven on a real seat. 29 tests total. Wiki: `knowledge/wiki/architecture/cam-drive-ms0.md` (pending). See [[reference_kilo_cam_catalog_query_2026_05_29]].
