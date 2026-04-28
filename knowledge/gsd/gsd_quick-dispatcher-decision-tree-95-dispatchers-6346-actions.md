---
source: gsd_quick
section: DISPATCHER DECISION TREE (95 DISPATCHERS, 6346 ACTIONS)
slug: dispatcher-decision-tree-95-dispatchers-6346-actions
indexed_at: 2026-04-28T02:39:36.831Z
---

## DISPATCHER DECISION TREE (95 DISPATCHERS, 6346 ACTIONS)

### Manufacturing (SAFETY CRITICAL)
- **prism_calc** (1900+) — Force, power, time, deflection, thermal, chatter
- **prism_safety** (29) — S(x) scoring, collision, clearance
- **prism_turning** (40+) — Lathe operations, threading, profile, cycle time
- **prism_grinding** (10) — Grinding cycles
- **prism_cam** (1500+) — Toolpath, post-processing, multi-CAM bridge
- **prism_5axis** (5) — 5-axis kinematics
- **prism_thread** (21) — Threading operations + thread-mill

### AI & Intelligence
- **prism_ai** (300+) — Reasoning, speed/feed, tool select, strategy
- **prism_intelligence** (300+) — Learning, knowledge query
- **prism_knowledge** (130+) — Cross-registry knowledge
- **prism_knowledge_ext** (40+) — Knowledge extraction

### Memory & Vector (NEW — INTEL milestone)
- **prism_memory** (12) — get_health, trace_decision, find_similar, get_session,
    get_node, run_integrity, consolidate, consolidation_stats,
    consolidation_patterns, **record_session_end**, **semantic_search**, **remember**

### Data & Quality
- **prism_data** (300+) — Material, machine, tool lookup
- **prism_quality** (17) — Inspection, SPC, GD&T
- **prism_validate** (13) — Validation workflows
- **prism_omega** (6) — Ω quality scoring
- **prism_ralph** (3) — 4-phase deep validation

### Session & Dev
- **prism_session** (50+) — State save/restore, dispatcher map, action search
- **prism_context** (45+) — Context, tokens, presence, chat bus
- **prism_dev** (190+) — Build, test, quality, inventory, foresight
- **prism_gsd** (6) — GSD protocol (this doc)

### Guard & Safety (4 NEW — INTEL P2-U03)
- **prism_guard** (60+) — Decision logs, audit, **error_ledger_append**,
    **error_ledger_append_and_embed**, **error_ledger_recent**,
    **error_ledger_recall_similar**

### Orchestration
- **prism_orchestrate** (26) — Multi-agent coordination
- **prism_atcs** (12) — Multi-session autonomous tasks
- **prism_autonomous** (8) — Autonomous tasks
- **prism_autopilot_d** (8) — Workflow orchestration
