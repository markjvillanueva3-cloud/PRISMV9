---
source: gsd_micro
section: Orchestrator Heuristics
slug: orchestrator-heuristics
indexed_at: 2026-04-28T02:50:03.704Z
---

## Orchestrator Heuristics

```
Use prism_autopilot_d:autopilot when:
  - Implementing a feature/fix that spans >4 steps
  - Need full lifecycle (GSD → state → brainstorm → execute → ralph → update)

Use prism_atcs:task_init when:
  - Multi-session work (continues across compaction)
  - Need persistent task state file

Use prism_orchestrate:swarm_parallel when:
  - 2+ independent subtasks, each well-defined

Use prism_autopilot_d:autopilot_quick when:
  - Lightweight automation, single-call workflow

DON'T orchestrate:
  - Simple data lookups
  - Single calculations
  - Session management
  - Anything that finishes in <5s
```
