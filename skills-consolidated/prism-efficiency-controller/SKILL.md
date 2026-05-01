---
name: prism-efficiency-controller
description: |
  INTEGRATED efficiency layer that coordinates all MCP tools for optimal
  context window usage, token efficiency, batch processing, and caching.
  USE THIS SKILL FOR EVERY SESSION to maximize Claude's effectiveness.
  
  INTEGRATES: 88 MCP tools, 139 skills, batch/parallel processing
  PROVIDES: Auto-batching, context monitoring, compression triggers, caching
  KEY PRINCIPLE: Every operation goes through efficiency optimization
---

## Quick Reference (Operational)

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-efficiency-controller")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-efficiency-controller") to load programming reference
   - prism_calc→gcode_snippet for code generation
   - prism_thread→generate_thread_gcode for threading

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Code syntax, parameter tables, and programming patterns for the controller
- **Failure**: Controller not covered → check prism-controller-quick-ref

### Examples
**Example 1**: User asks "How to program efficiency on Fanuc?"
→ Load skill → Extract efficiency syntax and parameters → Generate G-code snippet → Validate against controller limits

**Example 2**: User debugging controller error in program
→ Load skill → Match error to known patterns → Provide corrected code with explanation

# PRISM-EFFICIENCY-CONTROLLER
## Unified Efficiency Layer for All Operations

# ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EFFICIENCY CONTROLLER ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   CONTEXT   │   │    TOKEN    │   │    BATCH    │   │    CACHE    │    │
│  │   MONITOR   │   │   BUDGET    │   │  PROCESSOR  │   │   MANAGER   │    │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘    │
│         │                 │                 │                 │            │
│         └────────────┬────┴────────┬────────┴────────┬────────┘            │
│                      ▼             ▼                 ▼                     │
│              ┌───────────────────────────────────────────┐                 │
│              │         EFFICIENCY CONTROLLER             │                 │
│              │  - Route operations optimally             │                 │
│              │  - Trigger compression at thresholds      │                 │
│              │  - Batch similar operations               │                 │
│              │  - Cache repeated lookups                 │                 │
│              └───────────────────────────────────────────┘                 │
│                                    │                                       │
│                      ┌─────────────┼─────────────┐                        │
│                      ▼             ▼             ▼                        │
│              ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│              │  88 MCP     │ │ 139 Skills  │ │ 416 Scripts │              │
│              │  Tools      │ │ (real)      │ │             │              │
│              └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

# CONTEXT PRESSURE PROTOCOL

## Thresholds and Actions
| Level | Usage % | Automatic Actions |
|-------|---------|-------------------|
| GREEN | 0-60% | Normal operation, no intervention |
| YELLOW | 60-75% | Start planning compression, prioritize batch |
| ORANGE | 75-85% | TRIGGER: prism_context_compress, summarize verbose |
| RED | 85-92% | TRIGGER: checkpoint + handoff_prepare |
| CRITICAL | >92% | STOP, force session_end |

## MCP Tools for Context Management
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `prism_context_size` | Check current usage | Every 5-8 operations |
| `prism_context_compress` | Reduce context size | At ORANGE threshold |
| `prism_context_expand` | Restore compressed | When needed for task |
| `prism_context_pressure` | Get pressure level | Before large operations |

# TOKEN EFFICIENCY PATTERNS

## Budget Allocation Formula
```
Working_Budget = (Context_Window - System_Prompt - 15%_Response_Reserve)

Optimal Allocation:
  40% Current Task Context
  30% Active Skills/Knowledge  
  20% State and History
  10% Tool Results Buffer
```

## Efficiency Rules

### RULE 1: BATCH SIMILAR OPERATIONS
```
INSTEAD OF:                      DO THIS:
prism_material_get("AL-6061")    prism_batch_execute([
prism_material_get("AL-7075")      {op: "material_get", id: "AL-6061"},
prism_material_get("AL-2024")      {op: "material_get", id: "AL-7075"},
                                   {op: "material_get", id: "AL-2024"}
(3 round trips)                  ])  (1 round trip, 5x faster)
```

### RULE 2: CHECK SIZE BEFORE LOADING
```
BEFORE loading any resource:
  1. prism_context_size() - Check available budget
  2. Estimate resource size
  3. If resource > budget: compress first OR load incrementally
```

### RULE 3: CACHE REPEATED LOOKUPS
```
Track what's been loaded this session:
  - Skills: Don't reload if already in context
  - Materials: Cache properties after first lookup
  - State: Use prism_state_get, don't re-read files
```

# BATCH PROCESSING INTEGRATION

## When to Use Batch Processing
| Scenario | Tool | Parameters |
|----------|------|------------|
| Multiple file reads | `prism_batch_execute` | `parallel=True` |
| Multiple validations | `prism_batch_execute` | `group_by_type=True` |
| Skill loading (2+) | `prism_batch_execute` | `max_parallel=10` |
| Database queries | `prism_batch_execute` | `parallel=True` |

## Decision Rule
```
IF operations.count >= 2 AND operations.similar:
    USE prism_batch_execute(parallel=True)
    EXPECTED: 3-5x speedup
```

# INTEGRATED WORKFLOW

## Session Start Protocol
```
1. prism_context_size()           -> Get baseline
2. prism_state_get()              -> Load current state  
3. prism_session_resume()         -> Resume if available
4. prism_gsd_get()                -> Load GSD (cached prefix)
5. prism_skill_relevance(task)    -> Identify needed skills
6. prism_batch_execute(skills)    -> Load skills in parallel
```

## During Session Protocol
```
EVERY 5-8 OPERATIONS:
  1. prism_context_size() -> Check pressure
  2. IF pressure >= YELLOW: prism_context_compress()
  3. prism_checkpoint_create() -> Save progress

BEFORE LARGE OPERATION:
  1. prism_context_pressure() -> Verify headroom
  2. IF insufficient: compress OR defer OR batch
```

## Session End Protocol
```
1. prism_checkpoint_create(reason="session_end")
2. prism_state_update(session_summary)
3. prism_handoff_prepare(format="CLAUDE")
4. prism_session_end(shutdown_type="GRACEFUL")
```

# ALL 88 MCP TOOLS BY CATEGORY

## Context & Efficiency (8)
`prism_context_size`, `prism_context_compress`, `prism_context_expand`,
`prism_context_pressure`, `prism_context_inject`, `prism_cache_validate`,
`prism_json_sort`, `prism_attention_focus`

## Batch & Parallel (3)
`prism_batch_execute`, `prism_queue_status`, `prism_relevance_score`

## State & Session (11)
`prism_state_get`, `prism_state_update`, `prism_state_checkpoint`,
`prism_state_restore`, `prism_state_rollback`, `prism_checkpoint_create`,
`prism_checkpoint_restore`, `prism_session_resume`, `prism_session_end`,
`prism_handoff_prepare`, `prism_compaction_detect`

## Validation & Quality (8)
`prism_quality_omega`, `prism_quality_safety`, `prism_quality_reasoning`,
`prism_quality_code`, `prism_validate_gates`, `prism_validate_anti_regression`,
`prism_safety_check_limits`, `prism_safety_check_collision`

## Learning & Error (3)
`prism_error_log`, `prism_error_analyze`, `prism_error_learn`

## Skills & Resources (12)
`prism_skill_load`, `prism_skill_list`, `prism_skill_read`, `prism_skill_search`,
`prism_skill_relevance`, `prism_skill_select`, `prism_skill_dependencies`,
`prism_skill_consumers`, `prism_resource_get`, `prism_resource_search`,
`prism_resource_list`, `prism_registry_get`

## Data & Physics (24)
Materials: `prism_material_get/search/property/similar`
Machines: `prism_machine_get/search/capabilities`
Alarms: `prism_alarm_get/search`
Physics: `prism_physics_kienzle/taylor/johnson_cook/stability/deflection/surface/validate_kienzle/check_limits/unit_convert/optimize_speed/optimize_feed/optimize_doc`

## Orchestration (8)
Agents: `prism_agent_list/select/spawn/status`
Hooks: `prism_hook_list/trigger`
Formulas: `prism_formula_list/apply`

## Prompts (2)
`prism_prompt_build`, `prism_template_get`

# EFFICIENCY HOOKS

```
EFF-001  session:start      -> Initialize context budget, load GSD
EFF-002  operation:batch    -> Auto-batch if 2+ similar operations
EFF-003  context:60%        -> YELLOW alert, start planning
EFF-004  context:75%        -> ORANGE trigger, auto-compress
EFF-005  context:85%        -> RED trigger, checkpoint + handoff
EFF-006  context:92%        -> CRITICAL, force session end
EFF-007  checkpoint:every8  -> Auto-checkpoint every 8 operations
EFF-008  cache:hit          -> Track cache hits
EFF-009  cache:miss         -> Track misses, consider preloading
EFF-010  error:detected     -> Log via prism_error_log
```

# INTEGRATION CHECKLIST

## Every Session Must:
- [ ] Check context size at start
- [ ] Load GSD (stable prefix for KV-cache)
- [ ] Batch similar operations (never sequential if 2+)
- [ ] Checkpoint every 5-8 operations
- [ ] Monitor pressure continuously
- [ ] Compress at ORANGE threshold
- [ ] Handoff at RED threshold
- [ ] End gracefully with state saved

## Every Operation Must:
- [ ] Check if batchable with pending operations
- [ ] Verify sufficient context budget
- [ ] Use cached data if available
- [ ] Log errors for learning pipeline

*PRISM Efficiency Controller v1.0*
*Integrates 88 MCP tools, 139 skills, 416 scripts*
