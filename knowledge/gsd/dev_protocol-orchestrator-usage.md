---
source: dev_protocol
section: Orchestrator Usage
slug: orchestrator-usage
indexed_at: 2026-04-28T02:50:03.670Z
---

## Orchestrator Usage

When implementing features or fixes that span >4 steps:
1. `prism_autopilot_d:autopilot` for full lifecycle (GSD → state →
   brainstorm → execute → ralph → update).
2. For multi-session work: `prism_atcs:task_init` to create persistent
   tasks.
3. For parallel independent subtasks: `prism_orchestrate:swarm_parallel`.
4. For lightweight automation: `prism_autopilot_d:autopilot_quick`.

EXCEPTION: Do NOT orchestrate simple data lookups, single calculations,
or session management.
