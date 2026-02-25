

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "quick", "start"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.
- 

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-quick-start")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-quick-start") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about quick
→ Load skill: skill_content("prism-quick-start") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires start guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Quick Start - Session 28+ (V10)

## 🚀 INSTANT SESSION START (3 Commands)

```
1. prism:prism_gsd_core                    → Full instructions
2. Desktop Commander: CURRENT_STATE.json   → Context
3. prism:prism_todo_update                 → Anchor attention
```

**Duration:** 30 seconds to full operational

## 📋 CURRENT STATUS

- **Session:** 28 (2026-02-04)
- **Phase:** V10 Documentation Complete
- **Tools:** 277 MCP operational
- **Coverage:** 68% → 90% (via V10 docs)
- **Quality:** Ω=0.82, S(x)=0.90

## 🎯 AUTOPILOT-FIRST (V10 DEFAULT)

### Use AutoPilot for EVERYTHING unless it fails:
```javascript
prism_autopilot_v2(task="your task here")
```

### Task Classification (Automatic)
| Type | Auto-Tools |
|------|------------|
| calculation | calc_cutting_force, calc_tool_life, calc_mrr |
| data | material_search, alarm_decode, agent_list |
| code | sp_brainstorm → sp_plan → sp_execute |
| analysis | cognitive_check, formula_calculate |
| orchestration | swarm_parallel, swarm_pipeline |

### When Manual
- AutoPilot fails
- Very specific lookup
- User requests specific tool

## 📊 WORKING TOOLS (Verified)

**Calculations (8):** calc_cutting_force, calc_tool_life, calc_mrr, calc_power, calc_surface_finish, calc_deflection, calc_stability, calc_thermal

**Data Access:** alarm_search (10,033), alarm_decode, material_search (818), agent_list (75), skill_list (153)

**Orchestration:** prism_autopilot_v2 ⭐, prism_autopilot, swarm_parallel, swarm_pipeline

**Development:** prism_sp_brainstorm, prism_sp_plan, prism_sp_execute, prism_sp_review_*

## ⚡ BUFFER ZONES

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 | 0-8 | Normal |
| 🟡 | 9-14 | Checkpoint |
| 🔴 | 15-18 | Urgent handoff |
| ⚫ | 19+ | STOP |

## 🛡️ HARD LAWS

1. S(x) ≥ 0.70 (HARD BLOCK)
2. No placeholders (100% complete)
3. New ≥ Old (anti-regression)
4. Brainstorm before code
5. AutoPilot default (V10)

## 📊 QUALITY

**Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L**
- ≥0.85: Excellent | ≥0.70: Release | <0.70: Block

## 📁 KEY PATHS

```
State:   C:\PRISM\state\CURRENT_STATE.json
Docs:    C:\PRISM\docs\PROJECT_INSTRUCTIONS_V10.md
GSD:     C:\PRISM\docs\GSD_v10.md
Skills:  C:\PRISM\skills-consolidated\
```

## 🔄 WORKFLOWS

### AutoPilot (Default)
```
prism_autopilot_v2(task="...")
→ Verify Ω ≥ 0.70
→ Done
```

### Development (Complex)
```
prism_sp_brainstorm → APPROVAL
→ prism_sp_plan
→ prism_sp_execute
→ prism_sp_review_*
```

## ⚠️ REGISTRY STATUS

| Registry | Count | Status |
|----------|-------|--------|
| Alarms | 10,033 | ✅ |
| Materials | 818/3,518 | ⚠️ |
| Agents | 75 | ✅ |
| Skills | 153 | ✅ |
| Hooks | 25 | ✅ |

**Version:** 10.0 Quick Start  
**Updated:** 2026-02-04 Session 28
