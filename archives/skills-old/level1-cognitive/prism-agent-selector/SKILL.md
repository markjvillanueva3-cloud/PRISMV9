# PRISM-AGENT-SELECTOR
## ILP-Based Agent Optimization | Level 1 Cognitive
### Version 1.0 | F-AGENT-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Selects the optimal subset of agents for a task using Integer Linear Programming. Minimizes cost while ensuring full task coverage and tier balance.

### When to Use
- Selecting agents for swarm execution
- Single-agent task assignment
- Cost-constrained optimization

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
```

### Agent Costs ($/MTok)
| Tier | Cost | Agents |
|------|------|--------|
| OPUS | $75 | 18 agents |
| SONNET | $15 | 32 agents |
| HAIKU | $1 | 9 agents |

---

## SECTION 3: TIER BALANCE RULES

### For Complex Tasks (complexity > 0.8)
- Minimum 1 OPUS agent required
- OPUS handles reasoning/synthesis
- SONNET handles implementation
- HAIKU handles lookups

### For Simple Tasks (complexity ≤ 0.5)
- HAIKU preferred for cost efficiency
- SONNET if HAIKU insufficient
- OPUS only if required

---

## SECTION 4: ILP FORMULATION

```python
from pulp import LpProblem, LpMinimize, LpVariable, lpSum

# Decision variables
x = {a.id: LpVariable(f"x_{a.id}", cat="Binary") for a in agents}

# Objective: minimize total cost
prob = LpProblem("AgentSelection", LpMinimize)
prob += lpSum([cost[a.id] * x[a.id] for a in agents])

# Coverage constraint
for req in task.requirements:
    prob += lpSum([covers[a.id][req] * x[a.id] for a in agents]) >= 1

# Size constraint
prob += lpSum([x[a.id] for a in agents]) <= 8

# Tier balance (if complex)
if task.complexity > 0.8:
    prob += lpSum([x[a.id] for a in opus_agents]) >= 1

prob.solve()
```

---

## SECTION 5: AGENT INVENTORY

### OPUS Agents (15 + 3 new)
- architect, coordinator, materials_scientist, machinist
- physics_validator, domain_expert, synthesizer, debugger
- root_cause_analyst, task_decomposer, learning_extractor
- verification_chain, meta_analyst
- **NEW**: combination_optimizer, synergy_analyst, proof_generator

### SONNET Agents (32 + 3 new)
- extractor, validator, merger, coder, analyst, researcher
- tool_engineer, cam_specialist, quality_engineer, process_engineer
- machine_specialist, gcode_expert, monolith_navigator
- schema_designer, api_designer, completeness_auditor
- regression_checker, test_generator, code_reviewer, optimizer
- refactorer, security_auditor, documentation_writer
- thermal_calculator, force_calculator, estimator
- context_builder, cross_referencer, pattern_matcher
- quality_gate, session_continuity, dependency_analyzer
- **NEW**: resource_auditor, calibration_engineer, test_orchestrator

### HAIKU Agents (9)
- state_manager, cutting_calculator, surface_calculator
- standards_expert, formula_lookup, material_lookup
- tool_lookup, call_tracer, knowledge_graph_builder

---

## SECTION 6: QUICK REFERENCE

### Selection Checklist
- [ ] Task requirements extracted
- [ ] Coverage matrix computed
- [ ] Cost optimization run
- [ ] Tier balance verified
- [ ] Optimal agents selected

### Cost Targets
| Swarm Size | Max Cost |
|------------|----------|
| 1-2 agents | $90 |
| 3-4 agents | $150 |
| 5-6 agents | $250 |
| 7-8 agents | $400 |

---

**Version:** 1.0 | **Date:** 2026-01-27 | **Level:** 1 (Cognitive)
