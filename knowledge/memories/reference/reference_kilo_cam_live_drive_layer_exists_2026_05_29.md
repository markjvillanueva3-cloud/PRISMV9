---
name: reference_kilo_cam_live_drive_layer_exists_2026_05_29
description: "PRISM already HAS a live Fusion CAM drive layer (Fusion360LiveBridgeEngine + :18360 in-app add-in calling real adsk.cam write methods, consumed by AutoProgramOrchestratorEngine) — kilo's catalog/enumerator is the read+validate front; the gap is exposure/validate-fuse/param-coverage, not a missing driver"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.182Z
aliases: reference_kilo_cam_live_drive_layer_exists_2026_05_29
---


3-agent grounded investigation (workflow wf_a0be3ab8, slot:kilo 2026-05-29) answering "does kilo drive CAM the way delta drives CAD?" Corrects an earlier underclaim ("CAM drive layer not built").

**THE DRIVE LAYER ALREADY EXISTS for Fusion 360 CAM** — same architecture delta uses for Fusion CAD (HTTP bridge → in-app add-in):
- `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` (~2614 lines) — in-Fusion add-in HTTP server on :18360. Real `adsk.cam` WRITE: `_create_cam_setup`→`cam.setups.add()`, `_create_cam_operation`→`setup.operations.add()`+`CAMParameter.expression` setter, `_assign_cam_tool`→`Tool.createFromJson`, `_generate_cam_toolpath`→`cam.generateAllToolpaths/generateToolpath`, `_cam_post_process`→`cam.postProcess` (writes G-code to disk). Plus full CAD drive (sketch/extrude/revolve/hole/pattern/fillet/chamfer).
- `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` — PRISM-side typed client (port 18360, real fetch+retry, toolpath 180s timeout): createCamSetup/createCamOperation/assignTool/generateToolpaths/getToolpathStatus/postProcess. Same engine delta drives CAD verbs through.
- `mcp-server/src/engines/AutoProgramOrchestratorEngine.ts` — CONSUMES the full chain end-to-end (~L2260 createCamSetup → L2334 createCamOperation → L2341 assignTool → L2839 generateToolpaths → L2918 postProcess) = blueprint→setup→op→tool→toolpath→G-code.

**3-layer model:** (1) ENUMERATE [kilo built: fusion-cam-param-enumerator.py + ingest] → (2) VALIDATE [kilo built: CAMCatalogQueryEngine.validateOperation] → (3) DRIVE [ALREADY EXISTS: bridge+add-in+orchestrator].

**The real gaps (not a missing driver — wiring/exposure/coverage):**
1. **EXPOSURE** — the live CAM write methods are NOT discrete `prism_cam` actions; only READ is wired (camDispatcher 11421-11437: listCamOperations/getToolpathValidity/getCycleTime/getCamMaterials). Write reachable only inside AutoProgramOrchestratorEngine. Fix ≈ 6 prism_cam proxy actions (engine code already exists).
2. **PARAM COVERAGE — the synergy with kilo's catalog** — the bridge's `CAM_PARAM_MAP` maps only ~9 keys (spindle/feeds/stepdown/stepover/tolerance/stock-to-leave); it CANNOT set the full ~847-param Fusion universe. **kilo's enumerated catalog is exactly what expands CAM_PARAM_MAP to drive EVERY param, not 9.**
3. **NO VALIDATE→DRIVE FUSE** — `CAMCatalogQueryEngine.validateOperation` is not chained before `createCamOperation` actuates. kilo's soul refuses (emitting-program-without-pmi-validation, collision gate) belong on this seam.
4. **NO live simulate/collision verb** on the drive path (`cam_fusion_build_simulate` only builds an envelope).
5. **Fusion-ONLY** — Mastercam = envelope-builders + generic E1144 HTTP client needing a compiled `MastercamNetHook.dll` server; hyperMILL `prism_ac` = read+ExportSTEP+OptimizePPP (no create-op). "Drive any CAM" is Fusion-only today.
6. **No tested live E2E** in-repo (add-in path built, real-seat round-trip unverified — CAM MEMORY #6 hermetic-fakes lesson).
7. **Runtime prereq** — needs Fusion running + PRISM add-in installed (%APPDATA%/.../AddIns/PRISMBridge) listening on 18360; add-in-side `auto_cam.py` already does one-click STEP→G-code (PRISM advises, add-in drives).

**So:** yes, the delta pattern applies and the Fusion drive exists; kilo's catalog work is the key that turns "drive 9 params" into "drive every param, validated." See [[reference_kilo_cam_fusion_enumerator_2026_05_29]] · [[reference_kilo_cam_catalog_query_2026_05_29]]. Build to close: expose write actions + validate-fuse + CAM_PARAM_MAP expansion from the catalog + live collision verb.
