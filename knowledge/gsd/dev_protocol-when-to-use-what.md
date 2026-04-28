---
source: dev_protocol
section: When To Use What
slug: when-to-use-what
indexed_at: 2026-04-28T02:50:03.667Z
---

## When To Use What

### Understand a problem
`prism_sp:brainstorm` (7-lens analysis, grounded in PRISM knowledge).

### Find an asset
- Skills: `prism_memory:semantic_search kind=skill` or `prism_skill_script:skill_search`
- Scripts: `prism_skill_script:script_search`
- Engines: `prism_memory:semantic_search kind=engine` or
  `duplicationGuardEngine.checkBeforeCreatingSemantic`
- Actions: `prism_memory:semantic_search kind=action` or
  `prism_session:tool_route_best`
- Cross-registry: `prism_knowledge:search`
- Specific registry: `prism_data:material_search/machine_search/tool_search`

### Validate
- Physics: `prism_validate:material/kienzle/taylor/johnson_cook`
- Quality: `prism_validate:safety/completeness`
- Code: `prism_ralph:scrutinize` or `prism_ralph:loop`
- Release: `prism_omega:compute`

### Orchestrate
- Single agent: `prism_orchestrate:agent_execute`
- Parallel: `prism_orchestrate:agent_parallel`
- Vote: `prism_orchestrate:swarm_consensus`
- Multi-session: `prism_atcs:task_init`
- Background: `prism_autonomous:auto_execute`

### Manufacturing calculations
- `prism_calc`: cutting_force_kienzle, tool_life, speed_feed, mrr,
  power, chip_load, surface_finish, deflection, thermal, trochoidal,
  hsm, scallop, cycle_time, cost_optimize, multi_optimize
- `prism_safety`: check_toolpath_collision, validate_rapid_moves,
  check_spindle_torque, predict_tool_breakage,
  calculate_clamp_force_required, validate_workholding_setup
- `prism_thread`: calculate_tap_drill, calculate_thread_mill_params,
  generate_thread_gcode

### Recall memory
- `prism_memory:semantic_search { query, kind, limit }`
- `prism_guard:error_ledger_recall_similar` (past errors)
- `prism_memory:trace_decision` (graph trace)

### Track progress
- `prism_context:todo_update` — anchor current focus.
- `prism_doc:append name=ACTION_TRACKER.md` — log completed work.
- `prism_session:state_save` — persist for resume.

### Coordinate with other chats
- `prism_context:chat_post` — broadcast intent.
- `state/shared/AGENT_WORKBOARD.md` — claim a unit.
- `file-claim-guard` auto-tags edits with stable session id.
