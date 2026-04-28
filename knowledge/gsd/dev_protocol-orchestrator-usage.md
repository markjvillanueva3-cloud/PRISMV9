---
source: dev_protocol
section: ORCHESTRATOR USAGE
slug: orchestrator-usage
indexed_at: 2026-04-28T02:29:29.173Z
---

## ORCHESTRATOR USAGE

When implementing features or fixes that span >4 steps:
1. Consider `prism_autopilot_d→autopilot` for full lifecycle (GSD→State→Brainstorm→Execute→Ralph→Update)
2. For multi-session work, use `prism_atcs→task_init` to create persistent tasks
3. For parallel independent subtasks, use `prism_orchestrate→swarm_parallel`
4. For lightweight automation, use `prism_autopilot_d→autopilot_quick`

EXCEPTION: Do NOT orchestrate simple data lookups, single calculations, or session management.
