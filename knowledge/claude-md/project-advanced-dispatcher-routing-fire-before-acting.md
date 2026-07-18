---
source: project
section: ADVANCED DISPATCHER ROUTING — fire BEFORE acting
slug: advanced-dispatcher-routing-fire-before-acting
indexed_at: 2026-04-30T17:23:24.968Z
---

## ADVANCED DISPATCHER ROUTING — fire BEFORE acting

PRISM has 96 dispatchers / 7935 actions / 199 hooks (live counts: regenerate `MASTER_INDEX.json`). Don't guess — route.

| Trigger | Action | Purpose |
|---|---|---|
| uncertain which tool, capability lookup | `prism_session:tool_route_best` | Returns optimal dispatcher:action for task |
| "what action does X" | `prism_session:action_search` | Fuzzy-search all actions by keyword |
| about to edit engine/dispatcher/schema/hook | `prism_dev:simulate_build` + `change_radius_predict` + `edit_impact_predict` | Pre-play edit, predict blast radius |
| created new engine/algorithm | `prism_dev:gap_predict` | Predicts missing tests + dispatcher wiring |
| quote, program-gen, CAM/CNC build | `prism_provenPipeline:proven_find_similar` | Match to proven recipe before generating |
| post-job after using proven recipe | `prism_provenPipeline:proven_record_outcome` | Closes feedback loop; calibrates similarity weights |
| starting/resuming a milestone unit | `prism_atcs:task_init` / `task_resume` / `unit_complete` | State machine survives compaction |
| claiming roadmap unit (multi-chat) | `prism_orchestrate:roadmap_claim` + `roadmap_heartbeat` | Stale-claim reaper expects heartbeat |
| safety-critical output (turning, 5-axis, EDM, fixture) | `prism_omega:auto_score` | Auto-derives R/C/P/S/L; HARD BLOCK if S<0.70 |
| HARD BLOCK fired by safety/dup guard | `prism_guard:safety_explain_veto` + `safety_counterfactual` | Returns WHY blocked + what input would have passed |
| non-obvious decision, hit error | `prism_guard:decision_log` / `error_capture` / `failure_library` | Persistent decision + error memory |
| pre-creation domain-similar asset | `prism_guard:dup_guard_check` + `prism_shop_practice:tribal_search` + `playbook_advise` | Catches behavior duplicates the keyword guard misses |
| engine fails / hook blocks / test red | `prism_dev:failure_cascade_chain` + `failure_risk_analyze` | Maps blast radius across dependent engines |
| about to commit edit to wired engine | `prism_dev:rollback_plan_and_verify` + `integration_foresight` | Pre-stages safe revert; predicts cascading breakage |
| operating on stale doc/digest | `prism_dev:knowledge_gap_check` | Detects assumption drift vs live inventory |
| ambiguous N-way decision, multi-agent split | `prism_orchestrate:swarm_consensus` | N-agent vote — use for tiebreaks beyond `swarm_parallel` |
| Stop gate / claiming done | `prism_orchestrate:swarm_parallel` (4 reviewers) | Beats single agent |
| post-ship unit, before next claim | `prism_validation:calibration_run` + `improvement_run` | Updates physics calibration + queues self-improvement |
| pre-compaction or context-pressure spike | `prism_session:self_awareness_context_summary` + `compaction_detect` | Snapshots session knowledge before /compact loses it |

**Naming note:** dispatcher tool names use snake_case in MCP (`prism_proven_pipeline`) but the canonical dispatcher object is camelCase (`prism_provenPipeline`); `prism_validate` ≡ `prism_validation`. Both route correctly.

**Default:** request touches >2 files OR involves safety/wiring/tests → `tool_route_best` first instead of guessing.
