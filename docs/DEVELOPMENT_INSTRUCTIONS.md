# PRISM DEVELOPMENT INSTRUCTIONS
## Token-Optimized | MCP-First | Context-Aware
---

## RULE 1: MCP FIRST

```
ALWAYS use MCP tools over direct file access:
  prism_skill_read > view SKILL.md
  prism_material_get > read database
  prism_state_get > read CURRENT_STATE.json
  prism_batch_execute > sequential calls
```

## RULE 2: BATCH PARALLEL

```
IF 2+ similar operations → BATCH
NEVER: op1(); op2(); op3();
ALWAYS: batch_execute([op1, op2, op3])
```

## RULE 3: CONTEXT MONITOR

```
Every 5-8 operations: prism_context_size()
At ORANGE (75%): prism_context_compress()
At RED (85%): checkpoint + handoff prep
```

## RULE 4: TOKEN BUDGET

```
Allocation:
  40% - Current task
  30% - Active skills  
  20% - State/history
  10% - Tool buffer

Reserve 15% for response
```

## RULE 5: CHECKPOINT ALWAYS

```
Every 5-8 items: prism_checkpoint_create()
Before large ops: verify context budget
After completion: prism_state_update()
```

## MCP CATEGORIES (89 tools)

```
Context:     size, compress, expand, pressure, inject
Batch:       execute, queue_status
State:       get, update, checkpoint, restore, rollback
Skills:      read, search, list, relevance, select
Materials:   get, search, property, similar
Machines:    get, search, capabilities
Physics:     kienzle, taylor, surface, optimize_*
Quality:     omega, safety, reasoning, code
Validation:  gates, anti_regression
Agents:      list, select, spawn, status
Hooks:       list, trigger
Formulas:    list, apply
```

## WORKFLOW

```
1. prism_context_size()         → Budget check
2. prism_state_get()            → Load state
3. prism_skill_relevance(task)  → Find skills
4. prism_batch_execute(skills)  → Batch load
5. [WORK with checkpoints]
6. prism_quality_omega(output)  → Validate
7. prism_state_update(summary)  → Save
```

## VALIDATION GATES

```
G1: C: drive accessible
G5: Output on C: not /home
G7: New ≥ Old (anti-regression)
G8: S(x) ≥ 0.70 (safety HARD BLOCK)
G9: Ω(x) ≥ 0.70 (quality)

Check all: prism_validate_gates({output})
```

## ANTI-PATTERNS (NEVER DO)

```
❌ Sequential calls when batchable
❌ Direct file read when MCP exists
❌ Skip context monitoring
❌ Forget checkpoints
❌ Placeholders or TODOs
❌ New < Old (regression)
```

---
**Use MCP. Batch everything. Monitor context. Checkpoint always.**
