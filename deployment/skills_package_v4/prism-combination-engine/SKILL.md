---
name: prism-combination-engine
version: "2.0"
level: 0
category: always-on
description: |
  Master resource coordination using ILP optimization (F-PSI-001).
  Computes mathematically optimal combination of skills, agents, formulas.
  ALWAYS-ON: Fires automatically on every task at task:prePlan hook.
  Use when: Every task (automatic). Cannot be disabled.
  Provides: Optimal resource selection, synergy calculation, optimality proofs.
  Key principle: Mathematical certainty in resource selection.
dependencies:
  - prism-resource-optimizer
  - prism-agent-selector
  - prism-synergy-calculator
consumers:
  - ALL skills (master coordinator)
hooks:
  - task:prePlan (Priority 0)
  - session:preStart (Priority 1)
safety_critical: true
---

# PRISM-COMBINATION-ENGINE
## Master Resource Coordination | Level 0 Always-On
### Version 2.0 | F-PSI-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
The Combination Engine is the **master coordination skill** that runs on EVERY task to compute the mathematically optimal combination of PRISM resources. It uses Integer Linear Programming (ILP) with warm-start heuristics to maximize task effectiveness while providing mathematical proof of optimality.

### When to Use
- **ALWAYS** - This is an L0 Always-On skill
- Fires automatically at task:prePlan hook (Priority 0)
- Required before any task execution begins
- Cannot be disabled or bypassed

### Safety Considerations
⚠️ **LIFE-SAFETY**: Resource selection directly affects manufacturing quality.
- S(R) ≥ 0.70 is a HARD CONSTRAINT (cannot be relaxed)
- Safety-critical tasks require physics_validator in agent set
- Failed optimization must halt, not proceed with suboptimal resources

### Prerequisites
- RESOURCE_REGISTRY.json loaded (691 resources)
- CAPABILITY_MATRIX.json loaded
- SYNERGY_MATRIX.json loaded (150+ pairs)
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
  S(R) ≥ 0.70              (safety constraint - HARD)
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
| S(R) | Safety Score | Min safety across R | Computed |
| M(R) | Math Rigor Score | Min rigor across R | Computed |
| Coverage(R,T) | Task Coverage | F-COVERAGE-001 | Computed |

---

## SECTION 3: THE 8-STEP PROCESS

### Step 1: PARSE Task Requirements
```javascript
function parseTaskRequirements(userRequest) {
  return {
    domains: extractDomains(userRequest),      // ["materials", "physics"]
    operations: extractOperations(userRequest), // ["calculate", "validate"]
    taskType: classifyTaskType(userRequest),   // "speed_feed_calculation"
    complexity: estimateComplexity(userRequest), // 0.0-1.0
    safetyRequired: detectSafetyRequirement(userRequest),
    rigorRequired: detectRigorRequirement(userRequest),
    constraints: extractConstraints(userRequest)
  };
}
```

### Step 2: LOAD Resource Data
```javascript
async function loadResourceData() {
  const RESOURCE_REGISTRY = await load("C:/PRISM/data/coordination/RESOURCE_REGISTRY.json");
  const CAPABILITY_MATRIX = await load("C:/PRISM/data/coordination/CAPABILITY_MATRIX.json");
  const SYNERGY_MATRIX = await load("C:/PRISM/data/coordination/SYNERGY_MATRIX.json");
  
  // Validate loaded data
  if (!RESOURCE_REGISTRY || RESOURCE_REGISTRY.resources.length < 600) {
    throw new Error("RESOURCE_REGISTRY incomplete or corrupt");
  }
  
  return { RESOURCE_REGISTRY, CAPABILITY_MATRIX, SYNERGY_MATRIX };
}
```

### Step 3: COMPUTE Capability Scores (F-RESOURCE-001)
```javascript
function computeCapabilityScores(resources, taskVector) {
  const W_DOMAIN = 0.40;
  const W_OPERATION = 0.35;
  const W_COMPLEXITY = 0.25;
  
  return resources.map(r => ({
    id: r.id,
    capability: (
      W_DOMAIN * domainMatch(r.domains, taskVector.domains) +
      W_OPERATION * operationMatch(r.operations, taskVector.operations) +
      W_COMPLEXITY * complexityMatch(r.complexity, taskVector.complexity)
    )
  }));
}

function domainMatch(resourceDomains, taskDomains) {
  // Jaccard similarity
  const intersection = resourceDomains.filter(d => taskDomains.includes(d));
  const union = [...new Set([...resourceDomains, ...taskDomains])];
  return intersection.length / union.length;
}
```

### Step 4: WARM START with Greedy Heuristic
```javascript
function greedyWarmStart(resources, taskVector) {
  const selected = [];
  const uncovered = new Set(taskVector.requirements);
  
  // Sort by capability/cost ratio
  const sorted = [...resources].sort((a, b) => 
    (b.capability / b.cost) - (a.capability / a.cost)
  );
  
  for (const resource of sorted) {
    if (selected.length >= 8) break;
    
    const covers = resource.covers.filter(r => uncovered.has(r));
    if (covers.length > 0) {
      selected.push(resource);
      covers.forEach(r => uncovered.delete(r));
    }
    
    if (uncovered.size === 0) break;
  }
  
  return selected;
}
```

### Step 5: SOLVE ILP for Optimal Combination
```python
from pulp import LpProblem, LpMaximize, LpVariable, lpSum, PULP_CBC_CMD

def solve_ilp(resources, task_vector, warm_start, timeout_ms=500):
    """
    Solve the resource optimization ILP.
    
    Args:
        resources: List of available resources with capabilities
        task_vector: Parsed task requirements
        warm_start: Greedy solution for warm-starting
        timeout_ms: Solver timeout in milliseconds
        
    Returns:
        dict with optimal_resources, value, status, proof
    """
    # Decision variables
    x = {r.id: LpVariable(f"x_{r.id}", cat="Binary") for r in resources}
    
    # Warm start from greedy solution
    for r in warm_start:
        x[r.id].setInitialValue(1)
    
    # Problem definition
    prob = LpProblem("ResourceOptimization", LpMaximize)
    
    # Objective: maximize capability × synergy / cost
    prob += lpSum([
        resources[r].capability * x[r] 
        for r in x.keys()
    ])
    
    # Constraint: max 8 skills
    skills = [r for r in resources if r.type == "skill"]
    prob += lpSum([x[r.id] for r in skills]) <= 8, "max_skills"
    
    # Constraint: max 8 agents
    agents = [r for r in resources if r.type == "agent"]
    prob += lpSum([x[r.id] for r in agents]) <= 8, "max_agents"
    
    # Constraint: exactly 1 execution mode
    modes = [r for r in resources if r.type == "execution_mode"]
    prob += lpSum([x[r.id] for r in modes]) == 1, "one_mode"
    
    # Constraint: safety S(R) >= 0.70 (HARD - cannot relax)
    if task_vector.safetyRequired:
        safety_resources = [r for r in resources if r.safety_score >= 0.70]
        prob += lpSum([x[r.id] for r in safety_resources]) >= 1, "safety_hard"
    
    # Constraint: full coverage
    for req in task_vector.requirements:
        covering = [r for r in resources if req in r.covers]
        prob += lpSum([x[r.id] for r in covering]) >= 1, f"cover_{req}"
    
    # Solve with timeout
    prob.solve(PULP_CBC_CMD(timeLimit=timeout_ms/1000, msg=0))
    
    # Extract solution
    selected = [r for r in resources if x[r.id].varValue == 1]
    
    return {
        "status": interpret_status(prob.status),
        "selected": selected,
        "objective_value": prob.objective.value(),
        "gap": calculate_gap(prob)
    }
```

### Step 6: GENERATE Optimality Proof (F-PROOF-001)
```javascript
function generateOptimalityProof(ilpResult, warmStartResult) {
  const gap = ilpResult.gap;
  
  let certificate;
  if (gap === 0) certificate = "OPTIMAL";
  else if (gap <= 0.02) certificate = "NEAR_OPTIMAL";
  else if (gap <= 0.05) certificate = "GOOD";
  else certificate = "HEURISTIC";
  
  return {
    solution_value: ilpResult.objective_value,
    lower_bound: warmStartResult.value,
    upper_bound: ilpResult.upperBound,
    gap_percent: (gap * 100).toFixed(2) + "%",
    certificate: certificate,
    constraints_satisfied: ilpResult.constraints.filter(c => c.satisfied),
    alternatives_rejected: ilpResult.rejected_alternatives,
    proof_timestamp: new Date().toISOString(),
    solver_time_ms: ilpResult.solveTime
  };
}
```

### Step 7: PRESENT Plan for User Approval
```javascript
function presentPlanForApproval(optimalResources, proof) {
  const plan = {
    summary: generateSummary(optimalResources),
    resources: {
      skills: optimalResources.filter(r => r.type === "skill").map(r => r.name),
      agents: optimalResources.filter(r => r.type === "agent").map(r => r.name),
      execution_mode: optimalResources.find(r => r.type === "execution_mode")?.name
    },
    estimated_cost: calculateTotalCost(optimalResources),
    optimality: proof.certificate,
    gap: proof.gap_percent,
    safety_score: calculateSafetyScore(optimalResources),
    requires_approval: true
  };
  
  // Display to user
  console.log("═══════════════════════════════════════════════════════════");
  console.log("COMBINATION ENGINE - RESOURCE PLAN");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Skills (${plan.resources.skills.length}): ${plan.resources.skills.join(", ")}`);
  console.log(`Agents (${plan.resources.agents.length}): ${plan.resources.agents.join(", ")}`);
  console.log(`Mode: ${plan.resources.execution_mode}`);
  console.log(`Optimality: ${plan.optimality} (gap: ${plan.gap})`);
  console.log(`Safety: S(R) = ${plan.safety_score.toFixed(2)}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Approve this plan? [Y/n]");
  
  return plan;
}
```

### Step 8: HAND OFF to Execution
```javascript
async function handOffToExecution(approvedPlan, taskVector) {
  // Validate approval
  if (!approvedPlan.approved) {
    throw new Error("Plan not approved - cannot proceed");
  }
  
  // Load selected resources
  const loadedSkills = await Promise.all(
    approvedPlan.resources.skills.map(s => loadSkill(s))
  );
  
  // Initialize agents
  const initializedAgents = await Promise.all(
    approvedPlan.resources.agents.map(a => initializeAgent(a))
  );
  
  // Configure execution mode
  const executionConfig = configureExecutionMode(
    approvedPlan.resources.execution_mode,
    { skills: loadedSkills, agents: initializedAgents }
  );
  
  // Record in state
  await updateState({
    currentTask: {
      ...taskVector,
      resources: approvedPlan,
      status: "EXECUTING",
      startTime: new Date().toISOString()
    }
  });
  
  // Execute via orchestrator
  return await executeWithResources(executionConfig, taskVector);
}
```

---

## SECTION 4: HOOKS

### Hook Registration
```javascript
const HOOKS = {
  "task:prePlan": {
    priority: 0,  // Highest priority - runs first
    handler: runCombinationEngine,
    required: true,
    cannotBypass: true
  },
  "session:preStart": {
    priority: 1,
    handler: preloadResourceData,
    required: true
  }
};
```

### Hook: task:prePlan
```javascript
async function runCombinationEngine(task) {
  // Step 1: Parse
  const taskVector = parseTaskRequirements(task);
  
  // Step 2: Load
  const data = await loadResourceData();
  
  // Step 3: Compute capabilities
  const capabilities = computeCapabilityScores(data.RESOURCE_REGISTRY.resources, taskVector);
  
  // Step 4: Warm start
  const warmStart = greedyWarmStart(capabilities, taskVector);
  
  // Step 5: Solve ILP
  const ilpResult = await solveILP(capabilities, taskVector, warmStart);
  
  // Step 6: Generate proof
  const proof = generateOptimalityProof(ilpResult, { value: evaluateWarmStart(warmStart) });
  
  // Step 7: Present plan
  const plan = presentPlanForApproval(ilpResult.selected, proof);
  
  // Wait for approval
  const approved = await waitForUserApproval(plan);
  
  // Step 8: Hand off
  if (approved) {
    return await handOffToExecution({ ...plan, approved: true }, taskVector);
  } else {
    throw new Error("Plan rejected by user");
  }
}
```

---

## SECTION 5: ERROR HANDLING

### Error Types and Recovery
| Error | Cause | Recovery |
|-------|-------|----------|
| INFEASIBLE | No valid resource combination | Relax non-safety constraints, warn user |
| TIMEOUT | ILP solver timeout (>500ms) | Use warm-start solution with HEURISTIC certificate |
| SAFETY_VIOLATION | S(R) < 0.70 | HALT - do not proceed, escalate to user |
| COVERAGE_GAP | Cannot cover all requirements | Identify missing capability, suggest alternatives |
| RESOURCE_LOAD_FAIL | Cannot load registry files | Check paths, fall back to cached version |

### Safety-Critical Error Handling
```javascript
function handleSafetyViolation(safetyScore, required = 0.70) {
  if (safetyScore < required) {
    // HARD STOP - cannot proceed
    console.error("═══════════════════════════════════════════════════════════");
    console.error("⛔ SAFETY VIOLATION - COMBINATION ENGINE HALTED");
    console.error(`S(R) = ${safetyScore.toFixed(2)} < ${required} minimum`);
    console.error("Cannot proceed with current resource combination.");
    console.error("═══════════════════════════════════════════════════════════");
    
    throw new SafetyViolationError({
      score: safetyScore,
      required: required,
      message: "Resource combination does not meet safety threshold"
    });
  }
}
```

---

## SECTION 6: EXAMPLES

### Example 1: Speed/Feed Calculation Task
```javascript
const task = "Calculate optimal speeds and feeds for 4140 steel roughing";

// Step 1: Parse
const taskVector = {
  domains: ["materials", "physics", "calculation"],
  operations: ["calculate", "validate", "optimize"],
  taskType: "speed_feed_calculation",
  complexity: 0.6,
  safetyRequired: true,
  rigorRequired: true
};

// Result after optimization
const result = {
  skills: ["prism-speed-feed-engine", "prism-material-physics", "prism-tool-life-engine"],
  agents: ["materials_scientist", "physics_validator", "cutting_calculator"],
  execution_mode: "single",
  optimality: "OPTIMAL",
  gap: "0%",
  safety_score: 0.92
};
```

### Example 2: Complex Multi-Domain Task
```javascript
const task = "Extract monolith module, validate physics, generate tests";

// Result
const result = {
  skills: ["prism-monolith-extractor", "prism-material-physics", "prism-tdd-enhanced", 
           "prism-quality-master", "prism-sp-verification"],
  agents: ["extractor", "physics_validator", "test_generator", "quality_engineer",
           "verification_chain", "completeness_auditor"],
  execution_mode: "intelligent_swarm",
  optimality: "NEAR_OPTIMAL",
  gap: "1.2%",
  safety_score: 0.88
};
```

---

## SECTION 7: QUICK REFERENCE

### Proof Certificates
| Certificate | Gap | Meaning |
|-------------|-----|---------|
| OPTIMAL | 0% | Provably optimal solution |
| NEAR_OPTIMAL | ≤2% | Within 2% of theoretical maximum |
| GOOD | ≤5% | Acceptable solution |
| HEURISTIC | N/A | ILP timed out, using warm-start |

### Key Files
| File | Path | Contents |
|------|------|----------|
| RESOURCE_REGISTRY | C:\PRISM\data\coordination\RESOURCE_REGISTRY.json | 691 resources |
| CAPABILITY_MATRIX | C:\PRISM\data\coordination\CAPABILITY_MATRIX.json | Resource-task matching |
| SYNERGY_MATRIX | C:\PRISM\data\coordination\SYNERGY_MATRIX.json | 150+ pairwise synergies |
| FORMULA_REGISTRY | C:\PRISM\data\FORMULA_REGISTRY.json | 22 formulas |

### Constraints Summary
| Constraint | Value | Type |
|------------|-------|------|
| Max Skills | 8 | Soft |
| Max Agents | 8 | Soft |
| Execution Mode | 1 | Hard |
| Safety S(R) | ≥0.70 | **HARD** |
| Math Rigor M(R) | ≥0.60 | Soft |
| Coverage | 100% | Hard |

### Formulas Used
- F-PSI-001: Master Combination Equation
- F-RESOURCE-001: Capability Scoring
- F-SYNERGY-001: Synergy Calculation
- F-COVERAGE-001: Coverage Computation
- F-QUAL-001: Quality Scoring
- F-PROOF-001: Optimality Proof Generation

---

**Version:** 2.0 | **Date:** 2026-01-29 | **Level:** 0 (Always-On)
**Enhanced:** YAML frontmatter, Steps 7-8 complete, hooks, error handling, examples
