---
source: dev_protocol
section: WHEN TO USE WHAT
slug: when-to-use-what
indexed_at: 2026-04-28T02:29:29.171Z
---

## WHEN TO USE WHAT

### I need to understand a problem
prism_sp→brainstorm (7-lens analysis, grounded in PRISM knowledge)

### I need to find something
prism_skill_script→skill_search or script_search (by keyword)
prism_knowledge→search (cross-registry: materials, formulas, machines)
prism_data→material_search/machine_search/tool_search (specific registries)

### I need to validate something
prism_validate→material/kienzle/taylor/johnson_cook (physics models)
prism_validate→safety/completeness (quality checks)
prism_ralph→scrutinize or loop (code/architecture review)

### I need to orchestrate complex work
prism_orchestrate→agent_execute (single agent task)
prism_orchestrate→agent_parallel (multiple agents simultaneously)
prism_orchestrate→swarm_consensus (agents vote on best approach)
prism_atcs→task_init (multi-session autonomous task)
prism_autonomous→auto_execute (background processing)

### I need manufacturing calculations
prism_calc: cutting_force, tool_life, speed_feed, mrr, power, chip_load, surface_finish, deflection, thermal, trochoidal, hsm, scallop, cycle_time, cost_optimize, multi_optimize
prism_safety: check_toolpath_collision, validate_rapid_moves, check_spindle_torque, predict_tool_breakage, calculate_clamp_force_required, validate_workholding_setup
prism_thread: calculate_tap_drill, calculate_thread_mill_params, generate_thread_gcode

### I need to track progress
prism_context→todo_update (anchor current focus)
prism_doc→append name=ACTION_TRACKER.md (log completed work)
prism_session→state_save (persist state for resume)
