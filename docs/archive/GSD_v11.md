# PRISM GSD v11.0 - REAL API Architecture

## 6 HARD LAWS (NEVER VIOLATE)
| # | Law | Enforcement | Tool |
|---|-----|-------------|------|
| 1 | S(x) ≥ 0.70 | HARD BLOCK | prism_cognitive_check |
| 2 | No placeholders | 100% complete | Manual review |
| 3 | New ≥ Old | Anti-regression | prism_validate_anti_regression |
| 4 | Brainstorm first | MANDATORY | prism_sp_brainstorm |
| 5 | AutoPilot default | Use autopilot | prism_autopilot_v2 |
| 6 | **REAL API ONLY** | **NO SIMULATION** | API key enforced |

## ⚠️ REAL API REQUIREMENT (NEW v11)
```
SAFETY CRITICAL: All swarms, agents, and Ralph loops use REAL Claude API.
Simulation mode DISABLED - manufacturing decisions require real AI reasoning.

Configuration: claude_desktop_config.json → env.ANTHROPIC_API_KEY
If missing: Operations will FAIL with clear error message.
```

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
// ALL agent calls use REAL Claude API (no simulation)
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

## RALPH VALIDATION - 4 PHASES (REAL API)
```
Phase 1: SCRUTINIZE → Validator agents examine content (OPUS API)
Phase 2: IMPROVE    → Apply fixes based on findings (SONNET API)
Phase 3: VALIDATE   → Quality gates check S(x) ≥ 0.70 (SONNET API)
Phase 4: ASSESS     → Final scoring + comprehensive assessment (OPUS API)
```

### Assessment Output
```json
{
  "overall_grade": "A/B/C/D/F",
  "omega_score": 0.85,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."],
  "ready_for_production": true/false,
  "confidence": 0.92
}
```

## SWARM EXECUTION (REAL API)
All swarm patterns execute with REAL Claude API calls:

| Pattern | Description | API Calls |
|---------|-------------|-----------|
| parallel | All agents run simultaneously | N agents × 1 |
| pipeline | Sequential output→input chain | N agents × 1 |
| consensus | Agents vote on output | N agents × 1 |
| map_reduce | Distribute, map, reduce | N+1 calls |

### API Models by Tier
| Tier | Model | Use Case |
|------|-------|----------|
| OPUS | claude-opus-4-5-20251101 | Complex reasoning, safety |
| SONNET | claude-sonnet-4-5-20250929 | General tasks, coding |
| HAIKU | claude-haiku-4-5-20251001 | Quick validation, counting |

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

## BATCH & SWARM OPERATIONS (REAL API)

### Auto-Triggers
When you see: "all", "every", "multiple", "batch", "compare X and Y"

### Swarm Patterns (ALL REAL API)
| Pattern | Use Case | Mode |
|---------|----------|------|
| `swarm_parallel` | Independent tasks | LIVE |
| `swarm_pipeline` | Sequential data flow | LIVE |
| `swarm_consensus` | Multiple agents vote | LIVE |

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
prism_ralph_loop(...) → 4 phases with REAL API
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
1. `prism_autopilot_v2` - Default execution (REAL API)
2. `prism_gsd_core` - Load instructions
3. `prism_todo_update` - Anchor attention
4. `prism_sp_brainstorm` - Before any code
5. `prism_cognitive_check` - Quality score
6. `prism_ralph_loop` - 4-phase validation (REAL API)
7. `swarm_parallel` - Parallel ops (REAL API)
8. `alarm_decode` - Decode alarms
9. `material_get` - Material data
10. `calc_cutting_force` - Kienzle calc

## EMERGENCY REFERENCE
| Situation | Command |
|-----------|---------|
| Lost | `prism_gsd_core` |
| Need context | Read CURRENT_STATE.json |
| Session ending | `prism_handoff_prepare` |
| API not working | Check claude_desktop_config.json env section |
