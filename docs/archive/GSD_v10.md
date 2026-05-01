# PRISM GSD v10.0 - AutoPilot-First Architecture

## 5 HARD LAWS (NEVER VIOLATE)
| # | Law | Enforcement | Tool |
|---|-----|-------------|------|
| 1 | S(x) ≥ 0.70 | HARD BLOCK | prism_cognitive_check |
| 2 | No placeholders | 100% complete | Manual review |
| 3 | New ≥ Old | Anti-regression | prism_validate_anti_regression |
| 4 | Brainstorm first | MANDATORY | prism_sp_brainstorm |
| 5 | AutoPilot default | Use autopilot | prism_autopilot_v2 |

## SESSION START PROTOCOL (3 Steps)
```
1. prism_gsd_core              → Full instructions (365 lines)
2. Read CURRENT_STATE.json     → Session context
3. prism_todo_update           → Anchor attention
```

## AUTOPILOT-FIRST EXECUTION

### Default: prism_autopilot_v2
```javascript
prism_autopilot_v2(task="your task here")
// Auto-classifies → Selects tools → Executes → Returns Ω score
```

### Task Classification (Automatic)
| Type | Auto-Selected Tools |
|------|---------------------|
| calculation | calc_cutting_force, calc_tool_life, calc_mrr, formula_calculate |
| data | material_get, alarm_decode, agent_list, skill_search |
| code | sp_brainstorm → sp_plan → sp_execute |
| analysis | cognitive_check, formula_calculate, material_compare |
| orchestration | swarm_parallel, swarm_pipeline, prism_master_batch |

### When to Use Manual Tools
- AutoPilot fails or errors
- Very specific lookup needed
- Debugging AutoPilot itself
- User explicitly requests specific tool

## MASTER EQUATION
```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
```
| Score | Meaning | Action |
|-------|---------|--------|
| ≥ 0.85 | Excellent | Ship immediately |
| ≥ 0.70 | Release OK | Ship with notes |
| < 0.70 | BLOCKED | Fix before shipping |

## BUFFER ZONES
| Zone | Calls | Action |
|------|-------|--------|
| 🟢 | 0-8 | Normal |
| 🟡 | 9-14 | Checkpoint + batch |
| 🔴 | 15-18 | Urgent handoff prep |
| ⚫ | 19+ | STOP immediately |

## REGISTRY ACCESS PATTERNS

### Quick Lookups
| Need | Tool |
|------|------|
| Alarm code | `alarm_decode(code, controller)` |
| Material | `material_get(identifier)` |
| Formula | `formula_calculate(formula_id, inputs)` |
| Agent | `agent_find_for_task(task_type)` |
| Skill | `skill_find_for_task(task_description)` |

### Search Patterns
| Need | Tool | Example |
|------|------|---------|
| Alarms by text | `alarm_search` | `query="servo", limit=10` |
| Materials by ISO | `material_search` | `iso_group="P", has_kienzle=true` |
| Agents by role | `agent_search` | `category="domain_expert"` |

## BATCH OPERATIONS (Auto-Trigger)

### Triggers
When you see: "all", "every", "multiple", "batch", "compare X and Y"

### Swarm Patterns
| Pattern | Use Case |
|---------|----------|
| `swarm_parallel` | Independent tasks |
| `swarm_pipeline` | Sequential data flow |
| `swarm_consensus` | Multiple agents vote |

## CONTEXT MANAGEMENT

### Layered Loading
| Layer | Tokens | Content |
|-------|--------|---------|
| L0 | 280 | Bootstrap header |
| L1 | 1,200 | GSD via prism_gsd_core |
| L2 | 800 | Domain skills (auto) |
| L3 | 2,000+ | Deep content (explicit) |

### Pressure Zones
| Zone | Action |
|------|--------|
| 🟢 0-60% | Load freely |
| 🟡 60-75% | Selective only |
| 🟠 75-85% | Checkpoint + evict |
| 🔴 85-92% | Handoff prep |
| ⚫ >92% | STOP - handoff |

## DEVELOPMENT WORKFLOW

### Standard (Complex Tasks)
```
prism_sp_brainstorm(goal="...") → WAIT APPROVAL
    ↓
prism_sp_plan(approved_scope="...")
    ↓
prism_sp_execute(task_description="...")
    ↓
prism_sp_review_spec(...) + prism_sp_review_quality(...)
    ↓
Update state + prism_todo_update
```

### Quick (Simple Tasks)
```
prism_autopilot_v2(task="...")
    ↓
Verify Ω ≥ 0.70
    ↓
Done
```

## TOP 10 TOOLS
1. `prism_autopilot_v2` - Default execution
2. `prism_gsd_core` - Load instructions
3. `prism_todo_update` - Anchor attention
4. `prism_sp_brainstorm` - Before any code
5. `prism_cognitive_check` - Quality score
6. `alarm_decode` - Decode alarms
7. `material_get` - Material data
8. `calc_cutting_force` - Kienzle calc
9. `swarm_parallel` - Parallel ops
10. `prism_validate_anti_regression` - Safety check

## EMERGENCY REFERENCE
| Situation | Command |
|-----------|---------|
| Lost | `prism_gsd_core` |
| Need context | Read CURRENT_STATE.json |
| Session ending | `prism_handoff_prepare` |
| Quality check | `prism_cognitive_check` |
| Something broke | `alarm_decode` → `alarm_fix` |

---
v10.0 | 277 MCP Tools | AutoPilot-First | Safety-Critical
