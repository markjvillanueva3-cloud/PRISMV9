---
name: prism-agent-selector
version: "1.1"
level: 1
category: cognitive
description: |
  ILP-based agent optimization for PRISM Manufacturing Intelligence.
  Selects optimal agent subset using F-AGENT-001 formula.
  Minimizes cost while ensuring coverage and tier balance.
  Use when: Selecting agents for swarm execution, single-agent tasks, cost optimization.
  Provides: Agent selection algorithm, cost optimization, tier balance rules.
  Key principle: Minimum cost subset with ≥95% task coverage.
dependencies:
  - prism-combination-engine
  - prism-resource-optimizer
consumers:
  - prism-swarm-coordinator
  - prism-unified-orchestrator
safety_critical: true
---

# PRISM-AGENT-SELECTOR
## ILP-Based Agent Optimization | Level 1 Cognitive
### Version 1.1 | F-AGENT-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Selects the optimal subset of agents for a task using Integer Linear Programming. Minimizes cost while ensuring full task coverage and tier balance.

### When to Use
- Selecting agents for swarm execution
- Single-agent task assignment
- Cost-constrained optimization
- Resource budget planning

### Safety Considerations
⚠️ **LIFE-SAFETY**: Agent selection affects manufacturing output quality.
- Always include validator agent for safety-critical tasks
- OPUS tier required for complex reasoning that affects machine operations
- Never skip tier balance for tasks with S(x) requirements

---

## SECTION 2: AGENT SELECTION (F-AGENT-001)

### Formula
```
A*(T) = argmin    Σᵢ Cost(aᵢ)
        A⊆Agents

Subject to:
  Coverage(A,T) ≥ 0.95      (95% requirement coverage)
  |A| ≤ 8                    (max 8 agents)
  TierBalance(A)             (at least 1 OPUS for complex tasks)
  SafetyAgent(A) if S(T)>0   (validator required for safety tasks)
```

### Agent Costs ($/MTok)
| Tier | Cost | Count | Best For |
|------|------|-------|----------|
| OPUS | $75 | 18 | Complex reasoning, synthesis, architecture |
| SONNET | $15 | 32 | Implementation, validation, extraction |
| HAIKU | $1 | 9 | Lookups, simple calculations, state |

---

## SECTION 3: TIER BALANCE RULES

### For Complex Tasks (complexity > 0.8)
- Minimum 1 OPUS agent required
- OPUS handles reasoning/synthesis
- SONNET handles implementation
- HAIKU handles lookups

### For Medium Tasks (0.5 < complexity ≤ 0.8)
- SONNET primary
- OPUS optional for validation
- HAIKU for support

### For Simple Tasks (complexity ≤ 0.5)
- HAIKU preferred for cost efficiency
- SONNET if HAIKU insufficient
- OPUS only if explicitly required

### Safety-Critical Tasks (S(T) > 0)
- Always include physics_validator or quality_engineer
- OPUS for any decision affecting machine operations
- Dual validation required for S(T) > 0.8

---

## SECTION 4: ILP FORMULATION

```python
from pulp import LpProblem, LpMinimize, LpVariable, lpSum, PULP_CBC_CMD

def select_agents(task, agents, timeout_seconds=30):
    """
    Select optimal agent subset for task.
    
    Args:
        task: Task object with requirements, complexity, safety_score
        agents: List of available agents
        timeout_seconds: Solver timeout
        
    Returns:
        dict with selected_agents, total_cost, coverage, status
    """
    try:
        # Decision variables
        x = {a.id: LpVariable(f"x_{a.id}", cat="Binary") for a in agents}
        
        # Cost lookup
        cost = {"OPUS": 75, "SONNET": 15, "HAIKU": 1}
        
        # Objective: minimize total cost
        prob = LpProblem("AgentSelection", LpMinimize)
        prob += lpSum([cost[a.tier] * x[a.id] for a in agents])
        
        # Coverage constraint - each requirement must be covered
        for req in task.requirements:
            prob += lpSum([
                a.covers(req) * x[a.id] for a in agents
            ]) >= 1, f"cover_{req}"
        
        # Size constraint
        prob += lpSum([x[a.id] for a in agents]) <= 8, "max_agents"
        
        # Tier balance (if complex)
        opus_agents = [a for a in agents if a.tier == "OPUS"]
        if task.complexity > 0.8:
            prob += lpSum([x[a.id] for a in opus_agents]) >= 1, "opus_required"
        
        # Safety constraint (if safety-critical)
        if task.safety_score > 0:
            validators = [a for a in agents if "validator" in a.id or "quality" in a.id]
            prob += lpSum([x[a.id] for a in validators]) >= 1, "safety_required"
        
        # Solve with timeout
        prob.solve(PULP_CBC_CMD(timeLimit=timeout_seconds, msg=0))
        
        # Extract results
        selected = [a for a in agents if x[a.id].varValue == 1]
        total_cost = sum(cost[a.tier] for a in selected)
        coverage = calculate_coverage(selected, task.requirements)
        
        return {
            "status": "OPTIMAL" if prob.status == 1 else "SUBOPTIMAL",
            "selected_agents": [a.id for a in selected],
            "agent_count": len(selected),
            "total_cost": total_cost,
            "coverage": coverage,
            "tier_distribution": count_tiers(selected)
        }
        
    except Exception as e:
        # Fallback to greedy selection
        return greedy_fallback(task, agents, str(e))


def greedy_fallback(task, agents, error_reason):
    """
    Fallback greedy selection when ILP fails.
    """
    selected = []
    uncovered = set(task.requirements)
    
    # Sort by coverage/cost ratio
    sorted_agents = sorted(agents, 
        key=lambda a: len([r for r in uncovered if a.covers(r)]) / cost[a.tier],
        reverse=True
    )
    
    for agent in sorted_agents:
        if len(selected) >= 8:
            break
        covers = [r for r in uncovered if agent.covers(r)]
        if covers:
            selected.append(agent)
            uncovered -= set(covers)
        if not uncovered:
            break
    
    return {
        "status": "HEURISTIC",
        "selected_agents": [a.id for a in selected],
        "agent_count": len(selected),
        "fallback_reason": error_reason,
        "warning": "ILP failed, using greedy selection"
    }
```

---

## SECTION 5: AGENT INVENTORY

### OPUS Agents (18) - Complex Reasoning
| Agent | Specialty | Cost |
|-------|-----------|------|
| architect | System design, architecture | $75 |
| coordinator | Task orchestration | $75 |
| materials_scientist | Material analysis | $75 |
| machinist | Shop floor expertise | $75 |
| physics_validator | Physics verification | $75 |
| domain_expert | Domain knowledge | $75 |
| synthesizer | Information synthesis | $75 |
| debugger | Complex debugging | $75 |
| root_cause_analyst | Root cause analysis | $75 |
| task_decomposer | Task breakdown | $75 |
| learning_extractor | Pattern learning | $75 |
| verification_chain | Multi-level verify | $75 |
| meta_analyst | Meta-analysis | $75 |
| combination_optimizer | ILP optimization | $75 |
| synergy_analyst | Synergy patterns | $75 |
| proof_generator | Math proofs | $75 |
| uncertainty_quantifier | Uncertainty calc | $75 |
| migration_specialist | Code migration | $75 |

### SONNET Agents (37) - Implementation
| Agent | Specialty | Cost |
|-------|-----------|------|
| extractor | Code extraction | $15 |
| validator | Validation | $15 |
| merger | Content merging | $15 |
| coder | Code writing | $15 |
| analyst | Data analysis | $15 |
| researcher | Research tasks | $15 |
| ... (32 more) | Various | $15 |

### HAIKU Agents (9) - Lookups
| Agent | Specialty | Cost |
|-------|-----------|------|
| state_manager | State ops | $1 |
| cutting_calculator | Speed/feed | $1 |
| surface_calculator | Surface finish | $1 |
| formula_lookup | Formula fetch | $1 |
| material_lookup | Material fetch | $1 |
| tool_lookup | Tool fetch | $1 |
| standards_expert | Standards | $1 |
| call_tracer | Tracing | $1 |
| knowledge_graph_builder | Graph ops | $1 |

---

## SECTION 6: EXAMPLES

### Example 1: Simple Lookup Task
```python
task = Task(
    requirements=["material_properties", "cutting_speed"],
    complexity=0.3,
    safety_score=0
)

result = select_agents(task, all_agents)
# Returns: {
#   "status": "OPTIMAL",
#   "selected_agents": ["material_lookup", "cutting_calculator"],
#   "total_cost": 2,
#   "coverage": 1.0
# }
```

### Example 2: Complex Manufacturing Task
```python
task = Task(
    requirements=["design_review", "physics_validation", "code_generation", "testing"],
    complexity=0.85,
    safety_score=0.8
)

result = select_agents(task, all_agents)
# Returns: {
#   "status": "OPTIMAL",
#   "selected_agents": ["architect", "physics_validator", "coder", "test_generator"],
#   "total_cost": 105,
#   "coverage": 1.0,
#   "tier_distribution": {"OPUS": 2, "SONNET": 2, "HAIKU": 0}
# }
```

### Example 3: Budget-Constrained
```python
task = Task(
    requirements=["extraction", "validation", "documentation"],
    complexity=0.6,
    budget_limit=50
)

# Add budget constraint to ILP
prob += lpSum([cost[a.tier] * x[a.id] for a in agents]) <= task.budget_limit
```

---

## SECTION 7: ERROR HANDLING

### Error Types
| Error | Cause | Recovery |
|-------|-------|----------|
| INFEASIBLE | No agent combination covers requirements | Relax coverage to 90%, warn user |
| TIMEOUT | ILP solver timeout | Use greedy fallback |
| NO_OPUS | Complex task, no OPUS available | Escalate to user |
| BUDGET_EXCEEDED | Cannot meet budget | Return cheapest option with warning |

### Validation Checklist
- [ ] Task requirements non-empty
- [ ] At least one agent available per requirement
- [ ] Budget > minimum possible cost
- [ ] Timeout reasonable (10-60 seconds)

---

## SECTION 8: INTEGRATION

### With Combination Engine
```python
# Called during F-PSI-001 optimization
optimal_agents = agent_selector.select(task, AGENT_REGISTRY)
combination_engine.set_agents(optimal_agents)
```

### With Swarm Coordinator
```python
# Pass selected agents to swarm
swarm = SwarmCoordinator(
    agents=agent_selector.select(task).selected_agents,
    pattern="intelligent_swarm"
)
```

---

## SECTION 9: QUICK REFERENCE

### Selection Checklist
- [ ] Task requirements extracted
- [ ] Safety score determined
- [ ] Coverage matrix computed
- [ ] Cost optimization run
- [ ] Tier balance verified
- [ ] Optimal agents selected
- [ ] Fallback ready if needed

### Cost Targets
| Swarm Size | Target Cost | Max Cost |
|------------|-------------|----------|
| 1-2 agents | $16-90 | $150 |
| 3-4 agents | $45-120 | $200 |
| 5-6 agents | $60-180 | $300 |
| 7-8 agents | $75-240 | $400 |

---

**Version:** 1.1 | **Date:** 2026-01-29 | **Level:** 1 (Cognitive)
**Enhanced:** YAML frontmatter, error handling, examples, safety integration
