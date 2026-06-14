---
name: reference-whiskey-lathe-galaxy-dispatcher-surface-2026-05-28
description: The 4 lathe-dedicated MCP dispatchers + their action counts + where lathe actions hide inside generic dispatchers. Use INSTEAD of re-deriving.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.049Z
aliases: reference_whiskey_lathe_galaxy_dispatcher_surface_2026_05_28
---


Lathe MCP surface (use `prism_safe` namespace this session; `prism` port-3100 often down):

- `prism_turning` (turningDispatcher, **373 actions**) — SAFETY-CRITICAL: chuck/tailstock/steady-rest/bar-pull, threading, grooving, cycle-time, AGI, the safety predicates (`lathe_safety_predicate_evaluate`, `lathe_partoff_safety_gate`, `lathe_workholding_select_jaw`), LoRA cadence, print-to-program. Spindle torque/power envelope checks are `prism_safety:check_spindle_torque`/`check_spindle_power` (the `lathe_`-prefixed spindle action IDs do NOT exist — verified 2026-05-29).
- `prism_turning_program` (turningProgramDispatcher, **14**) — print→program: blueprint intake, feature taxonomy, ISO 286 fit parse, ISO 2768 tolerance defaults, rev-profile, stock select.
- `prism_thread` (threadDispatcher, **17**) — tap drill, depth, pitch, engagement, thread-milling.
- `prism_threading_pipeline` (**3**) — complete thread programming pipeline.

Lathe actions also inside generic dispatchers: `prism_cam` → `lathe_post_process`, `lathe_sf_calculate/advise`, `lathe_masterpost_*`, `lathe_print_*`; `prism_calc` → `turning_force`, `merchant_analysis`, `diamond_turning_forces`, `tnr_*`. Discover via `prism_session:action_search {query}` rather than reading the 373-action enum. Full asset map: [[reference_whiskey_lathe_complete_asset_map_2026_05_27]].
