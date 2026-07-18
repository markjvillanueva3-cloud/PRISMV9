# PRISM AutoPilot V2 Integration Guide

## Overview

AutoPilot V2 provides intelligent task classification and automatic tool selection across PRISM's 277 MCP tools. It analyzes tasks, classifies them into types, and orchestrates the optimal workflow.

## 3 AutoPilot Variants

### 1. AutoPilot V2 (Task Classification)
**Best for:** Most tasks - automatic tool selection based on task type

```typescript
prism:prism_autopilot_v2 {
  task: "Calculate cutting force for 4140 steel at 200mm/min",
  format: "compact"  // or "detailed"
}
```

**Task Classification:**
- `calculation` → calc_* tools (8 physics engines)
- `data` → alarm/material/agent/skill search tools
- `code` → Desktop Commander + skill references
- `analysis` → Web search + data tools
- `orchestration` → sp_brainstorm/plan/execute
- `session` → gsd_core, todo_update, cognitive_check

**Output Formats:**
- `compact`: Token-efficient, essential info only
- `detailed`: Full metrics, Ω(x) breakdown, reasoning

### 2. AutoPilot Full (Complete Workflow)
**Best for:** Complex tasks requiring full validation

```typescript
prism:prism_autopilot {
  task: "Redesign hook architecture for performance"
}
```

**Workflow:** GSD → STATE → BRAINSTORM → EXECUTE → RALPH x3  
**Token Savings:** 97% (server-side processing)  
**Metrics:** Full Ω(x) computation with R/C/P/S/L breakdown

### 3. AutoPilot Quick (Minimal)
**Best for:** Simple queries, quick fixes, low-risk tasks

```typescript
prism:prism_autopilot_quick {
  task: "Find alarm code for spindle overload"
}
```

**Workflow:** GSD → STATE → BRAINSTORM → EXECUTE → UPDATE  
**Skips:** Swarms, Ralph loops, formula optimization  
**Speed:** Fastest option

## Task Type Examples

### Calculation Tasks
```
"Calculate cutting force for aluminum 6061"
"Estimate tool life for carbide at 150 m/min"
"Compute MRR for roughing operation"

→ Uses: calc_cutting_force, calc_tool_life, calc_mrr
→ Auto-validates S(x) ≥ 0.70
```

### Data Query Tasks
```
"Find all FANUC spindle alarms"
"Search materials with hardness > 250 HB"
"List agents available for material selection"

→ Uses: alarm_search, material_search, agent_list
→ Working registries: 10,033 alarms, 818 materials, 75 agents
```

### Code Tasks
```
"Create TypeScript interface for material schema"
"Fix bug in AlarmRegistry.ts"
"Generate G-code post processor"

→ Uses: Desktop Commander read/write/edit
→ References: 153 skills for patterns
```

### Analysis Tasks
```
"Research latest CNC control trends"
"Compare Kienzle vs Taylor models"
"Analyze manufacturing cost drivers"

→ Uses: Web search, skill references
→ Synthesizes from multiple sources
```

### Orchestration Tasks
```
"Plan hook performance optimization"
"Design multi-agent material validation"
"Architect modular plugin system"

→ Uses: sp_brainstorm → sp_plan → sp_execute
→ Full Superpowers workflow with gates
```

### Session Management
```
"Resume from last checkpoint"
"Update current task status"
"Compute quality scores"

→ Uses: gsd_core, todo_update, cognitive_check
→ State management and attention anchoring
```

## When to Use Each Variant

| Scenario | Tool | Reason |
|----------|------|--------|
| Most tasks | `autopilot_v2` | Automatic classification + optimal tools |
| Complex design | `autopilot` | Full workflow with Ralph validation |
| Quick lookup | `autopilot_quick` | Minimal overhead |
| Manual control | Individual tools | Precise tool selection |

## Integration with Superpowers Workflow

AutoPilot can be used within each Superpowers phase:

```
BRAINSTORM: autopilot_v2 {task: "analyze design options"}
↓
PLAN: autopilot_v2 {task: "break down into tasks"}
↓
EXECUTE: autopilot_quick {task: "implement task 1"}
         autopilot_quick {task: "implement task 2"}
↓
REVIEW: autopilot_v2 {task: "validate against spec"}
```

## Performance Characteristics

| Variant | Tool Calls | Token Cost | Server Processing | Use Case |
|---------|------------|------------|-------------------|----------|
| V2 Compact | 1 | Low | High | Production queries |
| V2 Detailed | 1 | Medium | High | Debugging/analysis |
| Full | 1 | Low | Very High | Complex workflows |
| Quick | 1 | Very Low | Medium | Simple queries |

## Example Workflows

### Workflow 1: Material Validation
```typescript
// AutoPilot V2 handles entire workflow
prism:prism_autopilot_v2 {
  task: "Validate material 4140 steel has Kienzle coefficients in range",
  format: "compact"
}

// Internally executes:
// 1. material_search {query: "4140"}
// 2. validate_kienzle {kc1_1, mc, iso_group: "P"}
// 3. validate_safety {material_data}
// Returns: S(x) score + validation result
```

### Workflow 2: Alarm Diagnosis
```typescript
prism:prism_autopilot_v2 {
  task: "Decode FANUC alarm PS0001 and provide fix procedure",
  format: "detailed"
}

// Internally executes:
// 1. alarm_decode {code: "PS0001", controller: "FANUC"}
// 2. Extracts: description, causes, fix steps
// Returns: Full diagnostic with metrics
```

### Workflow 3: Physics Calculation
```typescript
prism:prism_autopilot_v2 {
  task: "Calculate cutting force for 1045 steel, 2mm depth, 50mm width, 0.1mm/tooth feed",
  format: "compact"
}

// Internally executes:
// 1. material_search {query: "1045 steel"}
// 2. calc_cutting_force {material_id, ap:2, ae:50, fz:0.1}
// 3. validate_safety {result}
// Returns: Fc, Ff, Fp, power, S(x) score
```

## Error Handling

AutoPilot includes automatic error recovery:

```
Material not found → Suggests similar materials
Tool broken → Falls back to alternative
S(x) < 0.70 → BLOCKS with safety warning
Ambiguous task → Requests clarification
```

## Registry Status Awareness

AutoPilot V2 knows registry status:

```
Alarms: 10,033 ✅ (Use freely)
Materials: 818/3,518 ⚠️ (Partial - may not find obscure materials)
Agents: 75 ✅ (Full coverage)
Skills: 153 ✅ (All available)
Hooks: 25 ✅ (Working)
Scripts: 322 ✅ (Operational)
```

## Best Practices

### DO:
✅ Use V2 for most tasks - let it classify
✅ Use `compact` format for production
✅ Use `detailed` format for debugging
✅ Trust the tool selection algorithm

### DON'T:
❌ Call broken tools directly (material_get)
❌ Over-specify when V2 can handle it
❌ Skip safety validation (S(x) check)
❌ Ignore HARD BLOCK warnings

## Tool Selection Algorithm

```python
def classify_task(task: str) -> TaskType:
    keywords = extract_keywords(task)
    
    if contains_physics_terms(keywords):
        return "calculation"  # calc_* tools
    
    if contains_query_words(keywords):
        return "data"  # search tools
    
    if contains_code_terms(keywords):
        return "code"  # Desktop Commander
    
    if contains_research_words(keywords):
        return "analysis"  # web search
    
    if contains_design_terms(keywords):
        return "orchestration"  # sp_* workflow
    
    if contains_session_terms(keywords):
        return "session"  # gsd, todo, cognitive
    
    return "analysis"  # default fallback
```

## Metrics Interpretation

When `format: "detailed"`:

```json
{
  "R(x)": 0.95,  // Reasoning: High = good evidence/logic
  "C(x)": 0.86,  // Code: High = clean patterns
  "P(x)": 0.85,  // Process: High = efficient workflow
  "S(x)": 0.90,  // Safety: ≥0.70 required (HARD BLOCK)
  "L(x)": 0.85,  // Learning: High = good pattern extraction
  "Ω(x)": 0.89   // Overall: ≥0.70 release, ≥0.85 excellent
}
```

**Status Levels:**
- Ω(x) ≥ 0.85: 🌟 EXCELLENT
- Ω(x) ≥ 0.70: ✅ GOOD (releasable)
- Ω(x) < 0.70: ⚠️ NEEDS IMPROVEMENT
- S(x) < 0.70: 🛑 BLOCKED

---
**Version:** 2.0  
**Updated:** 2026-02-04 Session 26  
**Status:** ✅ Operational - All 3 variants working