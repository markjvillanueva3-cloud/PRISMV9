---
name: prism-orchestration
description: |
  Unified orchestration for PRISM: agent selection, batch processing, swarm coordination,
  autonomous execution, and API acceleration. Covers all multi-task execution patterns.
  Consolidates: agent-selector, batch-orchestrator, swarm-coordinator, autonomous-execution, api-acceleration.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "orchestration", "unified", "agent", "selection", "batch", "processing"
- Multi-agent task, parallel execution, or workflow pipeline coordination needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-orchestration")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_orchestrate→agent_execute/swarm_execute for task orchestration
   - prism_skill_script→skill_content(id="prism-orchestration") for orchestration patterns

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about orchestration
→ Load skill: skill_content("prism-orchestration") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires orchestration guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Orchestration
## Unified Multi-Task Execution Patterns

## Execution Mode Selection

| Scenario | Mode | Dispatcher Action |
|----------|------|-------------------|
| Single focused task | **Agent** | `prism_orchestrate→agent_execute` |
| Independent parallel tasks | **Batch/Parallel** | `prism_orchestrate→agent_parallel` |
| Sequential dependent steps | **Pipeline** | `prism_orchestrate→agent_pipeline` |
| Complex multi-perspective analysis | **Swarm** | `prism_orchestrate→swarm_execute` |
| Multi-session persistent work | **ATCS** | `prism_atcs→task_init` |
| Background with quality gates | **Autonomous** | `prism_autonomous→auto_execute` |

### Decision Tree
```
Task complexity?
├── Simple (1 agent, <5 calls) → agent_execute
├── Medium, independent subtasks → agent_parallel
├── Medium, dependent chain → agent_pipeline  
├── Complex, needs consensus → swarm_consensus
└── Large, multi-session → ATCS + autonomous
```

## 1. AGENT SELECTION (F-AGENT-001)

**Formula:** `Score(a) = Σ(coverage_i × weight_i) / cost(a)`

**Agent Tiers:**
| Tier | Model | Cost | Best For |
|------|-------|------|----------|
| T1 (Opus) | claude-opus-4-6 | $$$ | Complex reasoning, safety review |
| T2 (Sonnet) | claude-sonnet-4-5-20250929 | $$ | General tasks, code generation |
| T3 (Haiku) | claude-haiku-4-5-20251001 | $ | Classification, simple extraction |

**Selection Rules:**
- Safety-critical → Always T1 (Opus)
- Code generation → T2 (Sonnet) default
- Batch classification → T3 (Haiku) for cost
- Coverage target: ≥95% task requirements
- ILP constraint: minimize Σcost subject to coverage ≥ threshold

## 2. BATCH & PARALLEL EXECUTION

**When to batch:** Independent tasks, no shared state, order doesn't matter.

```javascript
// Parallel pattern
prism_orchestrate→agent_parallel({
  tasks: [
    { id: "task1", agent: "analyzer", prompt: "..." },
    { id: "task2", agent: "validator", prompt: "..." }
  ]
})
```

**Batch Rules:**
- Max parallel: 5 agents (API rate limit)
- Each task must be self-contained (no cross-references)
- Aggregate results after all complete
- Failed tasks don't block others

**Pipeline pattern** (sequential with data flow):
```javascript
prism_orchestrate→agent_pipeline({
  steps: [
    { agent: "researcher", prompt: "Find..." },
    { agent: "analyzer", prompt: "Analyze {prev_result}..." },
    { agent: "writer", prompt: "Write report from {prev_result}..." }
  ]
})
```

## 3. SWARM COORDINATION (F-SWARM-001)

**Formula:** `Efficiency = (Quality × Coverage) / (Agents × Time × Cost)`

**Swarm Patterns:**
| Pattern | Agents | Use When |
|---------|--------|----------|
| `swarm_parallel` | All work independently | Diverse perspectives needed |
| `swarm_consensus` | Vote on best answer | Critical decisions, safety |
| `swarm_pipeline` | Sequential handoff | Complex multi-stage analysis |

**Conflict Resolution:** When agents disagree:
1. Weight by agent tier (Opus > Sonnet > Haiku)
2. Majority vote for non-safety items
3. Most conservative answer for safety items
4. Escalate unresolved conflicts to user

**Load Balancing:**
- Distribute by estimated complexity, not count
- Monitor per-agent token usage
- Rebalance if any agent >2x average

## 4. AUTONOMOUS EXECUTION (ATCS)

**Lifecycle:** `init → plan → execute → validate → assemble`

```javascript
// Initialize multi-session task
prism_atcs→task_init({ 
  task: "Merge 8 skill clusters",
  units: ["orchestration", "code_quality", "aiml", ...],
  budget: { max_calls: 200, max_sessions: 3 }
})

// Execute next unit
prism_atcs→queue_next()  // Returns next pending unit

// Mark unit complete
prism_atcs→unit_complete({ unit_id: "orchestration", status: "done" })

// Validate batch
prism_atcs→batch_validate()  // Runs quality checks

// Assemble final output
prism_atcs→assemble()
```

**State persistence:** Task state at `C:\PRISM\autonomous-tasks\`
**Resume:** `prism_atcs→task_resume()` picks up where left off
**Quality gates:** Each unit must pass validation before next starts

## 5. API ACCELERATION

**Direct API calls** for true parallel execution (bypasses MCP serialization):

```javascript
// In prism_orchestrate dispatcher
const results = await Promise.all([
  callClaude({ model: "claude-sonnet-4-5-20250929", prompt: task1 }),
  callClaude({ model: "claude-sonnet-4-5-20250929", prompt: task2 }),
  callClaude({ model: "claude-sonnet-4-5-20250929", prompt: task3 })
]);
```

**Rate limits:** Respect Anthropic API limits (check current tier)
**Cost tracking:** Log tokens per agent call for optimization
**Speedup:** 3-4x for independent parallel tasks

## Integration Points

| Dispatcher | Key Actions |
|------------|-------------|
| `prism_orchestrate` | agent_execute, agent_parallel, agent_pipeline, swarm_* |
| `prism_atcs` | task_init, queue_next, unit_complete, batch_validate, assemble |
| `prism_autonomous` | auto_configure, auto_plan, auto_execute, auto_validate |
| `prism_ralph` | loop, scrutinize, assess (quality validation) |
