---
source: gsd_micro
section: Orchestrator Usage Heuristics
slug: orchestrator-usage-heuristics
indexed_at: 2026-04-28T02:39:36.908Z
---

## Orchestrator Usage Heuristics

```
Use prism_autopilot_d:autopilot when:
  - Implementing a feature/fix that spans >4 steps
  - Need full lifecycle (GSD → state → brainstorm → execute → ralph → update)

Use prism_atcs:task_init when:
  - Multi-session work (work continues across compaction)
  - Need persistent task state file

Use prism_orchestrate:swarm_parallel when:
  - 2+ independent subtasks
  - Each subtask is well-defined

Use prism_autopilot_d:autopilot_quick when:
  - Lightweight automation
  - Single-call workflow

DON'T orchestrate:
  - Simple data lookups
  - Single calculations
  - Session management
  - Things that finish in <5s
```
