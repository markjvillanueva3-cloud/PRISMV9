---
name: reference_kilo_cam_dispatcher_surface_2026_05_28
description: CAM execution surface — 3 dispatchers (camDispatcher / camFunctionDispatcher / toolpathDispatcher) + the canonical triad
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.632Z
aliases: reference_kilo_cam_dispatcher_surface_2026_05_28
---


2026-05-28 (slot:kilo): CAM has THREE dispatchers — route here before grepping the 71 CAM engines.

- **`prism_cam` (`camDispatcher`)** — primary surface, thousands of actions. Canonical triad: `cam_strategy_recommend` → `toolpath_generate` → `collision_check_full`. Plus `cam_safety_validate` (Ω/S(x) gate), `cam_multiaxis_recommend`, `cam_material_map`, `post_process`, `stock_update`, `fixture_setup`; vendor families `mastercam_*` / `hypermill_*` / `solidcam_*` / `nx_cam_*` / `powermill_*` / `catia_*` / `cam_fusion_*`; `cam_lora_*` (per-system LoRA), `cam_dl_*`, `cam_reasoning_*`, `cam_calibration_*`, `cam_transfer_*`, `cam_cross_translate`.
- **`camFunctionDispatcher`** — per-vendor function index (`<vendor>_function_index_*`): operation catalogs + parameter search per CAM system.
- **`prism_toolpath` (`toolpathDispatcher`)** — strategy engine: `strategy_select`, `params_calculate`, `simulate` (Kienzle force + Jaeger temp + Brammertz roughness along path), `collision_check`, `surface_finish_predict`, `cycle_time_estimate`, `rest_machining`, `tool_axis_optimize`, novel/extended/cross-cam algorithm families.

Source: `mcp-server/src/tools/dispatchers/{camDispatcher,camFunctionDispatcher,toolpathDispatcher}.ts`. Full map: galaxy `CLAUDE.md` §4 + `TOOLBELT.md`.
