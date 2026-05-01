# PRISM-COMBINATION-ENGINE
## Master Resource Coordination | Level 0 Always-On
### Version 1.0 | F-PSI-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
The Combination Engine is the **master coordination skill** that runs on EVERY task to compute the mathematically optimal combination of PRISM resources. It uses Integer Linear Programming (ILP) with warm-start heuristics to maximize task effectiveness while providing mathematical proof of optimality.

### When to Use
- **ALWAYS** - This is an L0 Always-On skill
- Fires automatically at task:prePlan hook
- Required before any task execution begins

### Prerequisites
- RESOURCE_REGISTRY.json loaded
- CAPABILITY_MATRIX.json loaded  
- SYNERGY_MATRIX.json loaded
- FORMULA_REGISTRY.json with F-PSI-001

### Outputs
- Optimal resource combination R*
- Optimality proof via F-PROOF-001
- Plan for user approval

---

## SECTION 2: THE MASTER COMBINATION EQUATION (F-PSI-001)

### Mathematical Formulation

```
Ψ(T,R) = argmax    [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) / Cost(R) ]
         R⊆ALL

Subject to:
  |R_skills| ≤ 8           (max 8 skills)
  |R_agents| ≤ 8           (max 8 agents)  
  |R_execution| = 1         (exactly 1 execution mode)
  S(R) ≥ 0.70              (safety constraint)
  M(R) ≥ 0.60              (rigor constraint)
  Coverage(R,T) = 1.0       (full coverage required)
```

### Variable Definitions

| Symbol | Name | Formula | Source |
|--------|------|---------|--------|
| Cap(r,T) | Capability Score | F-RESOURCE-001 | CAPABILITY_MATRIX.json |
| Syn(R) | Synergy Multiplier | F-SYNERGY-001 | SYNERGY_MATRIX.json |
| Ω(R) | Quality Score | F-QUAL-001 | Computed |
| Cost(R) | Total Cost | Sum of resource costs | RESOURCE_REGISTRY.json |
| Coverage(R,T) | Task Coverage | F-COVERAGE-001 | Computed |

---

## SECTION 3: THE PROCESS

### Step 1: PARSE Task Requirements
```
TASK_VECTOR = {
  domains: [...],           // e.g., ["materials", "physics", "calculation"]
  operations: [...],        // e.g., ["calculate", "validate", "generate"]
  taskType: "...",          // e.g., "speed_feed_calculation"
  complexity: 0.0-1.0,      // Task complexity estimate
  safetyRequired: true/false,
  rigorRequired: true/false
}
```

### Step 2: LOAD Resource Data
```python
RESOURCE_REGISTRY = load("C:/PRISM/data/coordination/RESOURCE_REGISTRY.json")
CAPABILITY_MATRIX = load("C:/PRISM/data/coordination/CAPABILITY_MATRIX.json")
SYNERGY_MATRIX = load("C:/PRISM/data/coordination/SYNERGY_MATRIX.json")
```

### Step 3: COMPUTE Capability Scores (F-RESOURCE-001)
```
For each resource r in RESOURCE_REGISTRY:
  Cap(r,T) = w_d × DomainMatch(r,T) + w_o × OperationMatch(r,T) + w_c × ComplexityMatch(r,T)

Where: w_d=0.40, w_o=0.35, w_c=0.25
```

### Step 4: WARM START with Greedy Heuristic
```
R_warmstart = []
While uncovered_requirements not empty:
  best_resource = argmax_r Cap(r, uncovered_requirements)
  R_warmstart.append(best_resource)
  uncovered_requirements -= covered_by(best_resource)
```

### Step 5: SOLVE ILP for Optimal Combination
```python
from pulp import LpProblem, LpMaximize, LpVariable, lpSum

x = {r.id: LpVariable(f"x_{r.id}", cat="Binary") for r in resources}
prob = LpProblem("ResourceOptimization", LpMaximize)
prob += lpSum([Cap(r,T) * x[r.id] for r in resources])

# Constraints
prob += lpSum([x[r.id] for r in skills]) <= 8
prob += lpSum([x[r.id] for r in agents]) <= 8
prob += lpSum([x[r.id] for r in execution_modes]) == 1

prob.solve(timeLimit=500)  # 500ms max
```

### Step 6: GENERATE Optimality Proof (F-PROOF-001)
```
PROOF = {
  solution_value: Ψ*,
  lower_bound: Ψ_LB,
  upper_bound: Ψ_UB,
  gap: (Ψ_UB - Ψ_LB) / Ψ_UB × 100,
  gap_certificate: "OPTIMAL" | "NEAR_OPTIMAL" | "GOOD" | "HEURISTIC",
  constraints_satisfied: [...],
  alternatives_rejected: [...]
}
```

### Step 7: PRESENT Plan for User Approval
### Step 8: HAND OFF to Execution

---

## SECTION 4: QUICK REFERENCE

### Proof Certificates
| Certificate | Gap | Meaning |
|-------------|-----|---------|
| OPTIMAL | 0% | Provably optimal solution |
| NEAR_OPTIMAL | ≤2% | Within 2% of theoretical maximum |
| GOOD | ≤5% | Acceptable solution |
| HEURISTIC | N/A | ILP timed out, using warm-start |

### Key Files
| File | Path |
|------|------|
| RESOURCE_REGISTRY | C:\PRISM\data\coordination\RESOURCE_REGISTRY.json |
| CAPABILITY_MATRIX | C:\PRISM\data\coordination\CAPABILITY_MATRIX.json |
| SYNERGY_MATRIX | C:\PRISM\data\coordination\SYNERGY_MATRIX.json |
| FORMULA_REGISTRY | C:\PRISM\data\FORMULA_REGISTRY.json |

### Formulas Used
F-PSI-001, F-RESOURCE-001, F-SYNERGY-001, F-COVERAGE-001, F-QUAL-001, F-PROOF-001

---

**Version:** 1.0 | **Date:** 2026-01-27 | **Level:** 0 (Always-On)
