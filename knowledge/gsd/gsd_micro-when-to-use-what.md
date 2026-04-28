---
source: gsd_micro
section: When To Use What
slug: when-to-use-what
indexed_at: 2026-04-28T02:50:03.700Z
---

## When To Use What

```
Understand a problem
  prism_sp:brainstorm (7-lens analysis)
  prismCreativeReasoningEngine.explore (cross-domain synthesis)

Find an asset (semantic-first)
  prism_memory:semantic_search { kind: skill|engine|action|tip|gsd|rule }
  prism_session:tool_route_best (verb+object → dispatcher:action)
  prism_skill_script:skill_search (legacy fallback)
  prism_data:material_search/machine_search/tool_search (registries)

Validate
  prism_validate:material/kienzle/taylor/johnson_cook (physics)
  prism_validate:safety/completeness (quality)
  prism_ralph:scrutinize|loop (code review)
  prism_omega:compute (Ω release gate)

Orchestrate
  prism_orchestrate:agent_execute (single)
  prism_orchestrate:agent_parallel (multi)
  prism_orchestrate:swarm_consensus (vote)
  prism_atcs:task_init (multi-session)
  prism_autonomous:auto_execute (background)

Manufacturing calculations
  prism_calc: cutting_force_kienzle, tool_life, speed_feed, mrr,
    power, chip_load, surface_finish, deflection, thermal,
    trochoidal, hsm, scallop, cycle_time, cost_optimize
  prism_safety: check_toolpath_collision, validate_rapid_moves,
    check_spindle_torque, predict_tool_breakage,
    calculate_clamp_force_required
  prism_thread: calculate_tap_drill, generate_thread_gcode

Recall memory
  prism_memory:semantic_search { query, kind, limit }
  prism_guard:error_ledger_recall_similar (past errors)
  prism_memory:trace_decision (graph trace)

Track progress
  prism_context:todo_update (anchor focus)
  prism_doc:append name=ACTION_TRACKER.md (log)
  prism_session:state_save (persist)

Coordinate with other chats
  prism_context:chat_post (broadcast)
  state/shared/AGENT_WORKBOARD.md (claim)
  file-claim-guard auto-tags edits

Export to a vault / re-chunk
  scripts/chunk-claudemd-vault.mjs (CLAUDE.md edits)
  scripts/chunk-gsd-vault.mjs (GSD doc edits)
  scripts/populate-tribal-vault.mjs (new tribal tips)
  scripts/embed-all-{skills,engines,actions}.mjs (asset routing)
```
