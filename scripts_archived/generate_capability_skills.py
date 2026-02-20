#!/usr/bin/env python3
"""
Generate Claude Capability Skills - BATCH with REAL content.
Focus: Prediction, Planning, Optimization, Deep Learning, Comprehensiveness
"""
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

OUTPUT = Path("C:/PRISM/skills-consolidated")

# Skills to generate with REAL content
SKILLS_TO_GENERATE = {
    "prism-prediction-engine": {
        "description": "Outcome prediction, branch analysis, probability mapping, risk assessment",
        "content": """---
name: prism-prediction-engine
description: |
  Outcome prediction with branch analysis and probability mapping.
  Use when: Planning tasks, evaluating options, assessing risks.
  Provides: Decision trees, probability estimates, risk matrices.
  Key principle: Think 3+ steps ahead, map all branches.
---

# PRISM-PREDICTION-ENGINE
## Predict Outcomes Before Acting

# SECTION 1: BRANCH PREDICTION FRAMEWORK

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVERY DECISION = BRANCH POINT                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT STATE                                                              │
│       │                                                                     │
│       ├──[Option A: P=0.7]──► Outcome A1 (good)                            │
│       │                  └──► Outcome A2 (partial)                         │
│       │                                                                     │
│       ├──[Option B: P=0.5]──► Outcome B1 (excellent)                       │
│       │                  └──► Outcome B2 (poor)                            │
│       │                                                                     │
│       └──[Option C: P=0.9]──► Outcome C1 (acceptable)                      │
│                                                                             │
│  DECISION RULE: Expected_Value = P(success) × Value - P(fail) × Cost       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

# SECTION 2: PROBABILITY ESTIMATION

## Confidence Levels
| Level | Range | Meaning | Evidence Required |
|-------|-------|---------|-------------------|
| CERTAIN | 95-100% | Will happen | Direct proof |
| LIKELY | 70-94% | Probably happens | Strong evidence |
| POSSIBLE | 30-69% | May happen | Some evidence |
| UNLIKELY | 5-29% | Probably not | Weak evidence |
| RARE | 0-4% | Almost never | No evidence |

## Estimation Formula
```
P(outcome) = P(prior) × L(evidence) / P(evidence)

Where:
  P(prior) = Base rate from similar situations
  L(evidence) = How much evidence supports this
  P(evidence) = How common is this evidence
```

# SECTION 3: RISK ASSESSMENT MATRIX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPACT                                              │
│                 Low      Medium     High      Critical                      │
│         ┌───────────────────────────────────────────────┐                   │
│  High   │ MEDIUM  │  HIGH   │ CRITICAL│ CRITICAL│                          │
│         ├─────────┼─────────┼─────────┼─────────┤                          │
│  Medium │  LOW    │ MEDIUM  │  HIGH   │ CRITICAL│                          │
│ L       ├─────────┼─────────┼─────────┼─────────┤                          │
│ I       │  LOW    │  LOW    │ MEDIUM  │  HIGH   │                          │
│ K       ├─────────┼─────────┼─────────┼─────────┤                          │
│ E       │ ACCEPT  │  LOW    │  LOW    │ MEDIUM  │                          │
│ L       └───────────────────────────────────────────────┘                   │
│ I                                                                           │
│ H                                                                           │
│ O                                                                           │
│ O                                                                           │
│ D                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

# SECTION 4: PRE-MORTEM ANALYSIS

## Before Any Action, Ask:
1. What could go wrong? (failure modes)
2. What's the worst case? (downside)
3. What's the best case? (upside)
4. What would make this fail? (dependencies)
5. What's my confidence? (uncertainty)

## Failure Mode Template
| Failure Mode | Probability | Impact | Mitigation |
|--------------|-------------|--------|------------|
| Data missing | 20% | High | Validate first |
| Wrong format | 15% | Medium | Check schema |
| Timeout | 10% | Low | Retry logic |
| Regression | 5% | Critical | Anti-regression gate |

# SECTION 5: DECISION TREE PROTOCOL

## Step 1: Map Options
```
For each option:
  - Estimate P(success)
  - Estimate value if success
  - Estimate cost if failure
  - Calculate: EV = P × Value - (1-P) × Cost
```

## Step 2: Expand Branches (3+ levels)
```
Level 1: Immediate outcome
Level 2: Secondary effects
Level 3: Long-term implications
Level 4+: Downstream dependencies
```

## Step 3: Select Optimal Path
```
IF safety_critical:
  SELECT option with lowest P(catastrophic)
ELSE IF time_critical:
  SELECT option with highest P(quick_success)
ELSE:
  SELECT option with highest Expected_Value
```

# SECTION 6: HOOKS

```
PRED-001  decision:pending     -> Build decision tree
PRED-002  option:evaluate      -> Calculate expected value
PRED-003  risk:assess          -> Run risk matrix
PRED-004  action:before        -> Pre-mortem analysis
PRED-005  outcome:after        -> Update priors with result
```

# SECTION 7: INTEGRATION WITH MCP

| MCP Tool | Prediction Use |
|----------|----------------|
| `prism_quality_omega` | Predict output quality |
| `prism_quality_safety` | Predict safety issues |
| `prism_validate_gates` | Predict gate failures |
| `prism_error_analyze` | Predict error patterns |

---
*PRISM Prediction Engine v1.0*
*Think 3+ steps ahead, map all branches*
"""
    },
    
    "prism-optimization-math": {
        "description": "Mathematical optimization algorithms, resource allocation, efficiency maximization",
        "content": """---
name: prism-optimization-math
description: |
  Mathematical optimization for resource allocation and efficiency.
  Use when: Allocating resources, maximizing output, minimizing cost.
  Provides: Linear programming, gradient descent, constraint satisfaction.
  Key principle: Quantify everything, optimize mathematically.
---

# PRISM-OPTIMIZATION-MATH
## Mathematical Optimization Framework

# SECTION 1: OPTIMIZATION TYPES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PROBLEM TYPE              │ ALGORITHM           │ USE WHEN                  │
├───────────────────────────┼─────────────────────┼───────────────────────────┤
│ Linear constraints        │ Linear Programming  │ Resource allocation       │
│ Smooth, convex           │ Gradient Descent    │ Parameter tuning          │
│ Discrete choices         │ Integer LP (ILP)    │ Selection problems        │
│ Multi-objective          │ Pareto Optimization │ Tradeoff analysis         │
│ Non-convex, complex      │ PSO/GA              │ Global search             │
│ Sequential decisions     │ Dynamic Programming │ Multi-stage problems      │
└───────────────────────────┴─────────────────────┴───────────────────────────┘
```

# SECTION 2: LINEAR PROGRAMMING (LP)

## Standard Form
```
MAXIMIZE:   c₁x₁ + c₂x₂ + ... + cₙxₙ    (objective)
SUBJECT TO: a₁₁x₁ + a₁₂x₂ + ... ≤ b₁    (constraints)
            a₂₁x₁ + a₂₂x₂ + ... ≤ b₂
            x₁, x₂, ... ≥ 0              (non-negativity)
```

## Example: Token Budget Allocation
```
MAXIMIZE: Value = 0.4×Task + 0.3×Skills + 0.2×State + 0.1×Buffer

SUBJECT TO:
  Task + Skills + State + Buffer ≤ Total_Budget
  Task ≥ 1000        (minimum for current task)
  Skills ≤ 5000      (max skill loading)
  Buffer ≥ 500       (minimum buffer)
  All ≥ 0
```

# SECTION 3: GRADIENT DESCENT

## Algorithm
```
REPEAT until convergence:
  1. Compute gradient: ∇f(x) = [∂f/∂x₁, ∂f/∂x₂, ...]
  2. Update: x_new = x_old - α × ∇f(x)
  3. Check: |f(x_new) - f(x_old)| < ε ?

Where:
  α = learning rate (0.01 - 0.1 typical)
  ε = convergence threshold
```

## Step Size Rules
| Confidence | Step Size | Rationale |
|------------|-----------|-----------|
| High (>80%) | Large (0.1) | Confident in direction |
| Medium (50-80%) | Medium (0.05) | Moderate confidence |
| Low (<50%) | Small (0.01) | Uncertain, explore carefully |

# SECTION 4: MULTI-OBJECTIVE OPTIMIZATION

## Pareto Frontier
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Objective 2 ▲                                                              │
│              │     ○ Dominated (worse on both)                             │
│              │  ●                                                          │
│              │    ●   ← Pareto Frontier (optimal tradeoffs)               │
│              │      ●                                                      │
│              │   ○    ●                                                    │
│              │          ●                                                  │
│              │    ○        ●                                               │
│              └──────────────────────► Objective 1                          │
│                                                                             │
│  Points ON frontier: Cannot improve one without hurting other              │
│  Points BELOW frontier: Can be improved (dominated)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Weighted Sum Method
```
Combined_Score = w₁×Obj₁ + w₂×Obj₂ + ... + wₙ×Objₙ
Where: Σwᵢ = 1

PRISM Default Weights (Omega equation):
  Safety:     0.30 (highest priority)
  Reasoning:  0.25
  Code:       0.20
  Process:    0.15
  Learning:   0.10
```

# SECTION 5: CONSTRAINT SATISFACTION

## Hard vs Soft Constraints
| Type | Behavior | Example |
|------|----------|---------|
| HARD | Must satisfy | S(x) ≥ 0.70 (safety gate) |
| SOFT | Prefer to satisfy | Ω(x) ≥ 0.85 (quality target) |

## Constraint Priority
```
1. Safety constraints (HARD) - Never violate
2. Correctness constraints (HARD) - Must be right
3. Quality constraints (SOFT) - Prefer high quality
4. Efficiency constraints (SOFT) - Prefer efficient
```

# SECTION 6: PRACTICAL ALGORITHMS

## Resource Selection (ILP)
```python
# Select optimal combination of resources
MAXIMIZE: Σ value[i] × selected[i]
SUBJECT TO:
  Σ cost[i] × selected[i] ≤ budget
  selected[i] ∈ {0, 1}  # binary selection
```

## Batch Size Optimization
```
Optimal_Batch = argmin(Total_Time)
Where:
  Total_Time = Setup_Time + (N/Batch) × Process_Time
  
Derivative: dT/dB = -N×Setup/B² + Process/N = 0
Solution: B* = sqrt(N × Setup / Process)
```

# SECTION 7: MCP INTEGRATION

| MCP Tool | Optimization Use |
|----------|------------------|
| `prism_formula_apply` | Apply optimization formulas |
| `prism_physics_optimize_speed` | Optimize cutting speed |
| `prism_physics_optimize_feed` | Optimize feed rate |
| `prism_physics_optimize_doc` | Optimize depth of cut |
| `prism_batch_execute` | Optimize batch operations |

# SECTION 8: HOOKS

```
OPT-001  objective:define    -> Set optimization target
OPT-002  constraint:add      -> Add constraint to problem
OPT-003  solution:compute    -> Run optimization algorithm
OPT-004  result:validate     -> Verify solution satisfies constraints
OPT-005  iterate:improve     -> Refine solution iteratively
```

---
*PRISM Optimization Math v1.0*
*Quantify everything, optimize mathematically*
"""
    },
    
    "prism-comprehensive-output": {
        "description": "Complete output generation, no placeholders, exhaustive first response",
        "content": """---
name: prism-comprehensive-output
description: |
  Framework for generating complete, comprehensive outputs.
  Use when: Creating any deliverable, writing code, generating content.
  Provides: Completeness checklist, anti-placeholder rules, quality gates.
  Key principle: First response = final response. No holding back.
---

# PRISM-COMPREHENSIVE-OUTPUT
## Complete Outputs, No Placeholders

# SECTION 1: CORE PRINCIPLES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPREHENSIVE OUTPUT PRINCIPLES                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. FIRST RESPONSE = FINAL RESPONSE                                         │
│     Don't hold back for brevity. Give everything needed.                   │
│                                                                             │
│  2. NO PLACEHOLDERS                                                         │
│     Never write: "// TODO", "...", "etc.", "and so on"                    │
│     Always write: Actual implementation, actual content                    │
│                                                                             │
│  3. EXHAUSTIVE BEFORE SHIPPING                                              │
│     Ask: "What would I add if pushed 3x more?"                             │
│     Then ADD IT before shipping.                                           │
│                                                                             │
│  4. 100% COVERAGE                                                           │
│     Every field populated. Every case handled.                             │
│     Mark N/A with reason if truly not applicable.                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

# SECTION 2: ANTI-PLACEHOLDER RULES

## Banned Patterns
| Pattern | Problem | Replace With |
|---------|---------|--------------|
| `// TODO` | Incomplete | Actual code |
| `...` | Lazy | Full content |
| `etc.` | Vague | Complete list |
| `and so on` | Incomplete | All items |
| `similar to above` | Redundant | Actual code |
| `implement later` | Deferred | Implement now |
| `placeholder` | Empty | Real content |
| `example here` | Missing | Actual example |

## Placeholder Detection
```
SCAN output for:
  - TODO, FIXME, XXX, HACK
  - Ellipsis (...)
  - "etc", "and so on", "similar"
  - Empty functions/classes
  - Comments without code
  - "placeholder", "stub", "mock"

IF found: DO NOT SHIP. Complete first.
```

# SECTION 3: COMPLETENESS CHECKLIST

## For Code
- [ ] All functions implemented (no stubs)
- [ ] All error cases handled
- [ ] All edge cases covered
- [ ] All imports included
- [ ] All types defined
- [ ] All tests passing
- [ ] Documentation complete

## For Documentation
- [ ] All sections filled
- [ ] All examples provided
- [ ] All edge cases documented
- [ ] All parameters described
- [ ] All return values specified
- [ ] All errors documented

## For Data
- [ ] All fields populated
- [ ] All relationships defined
- [ ] All constraints specified
- [ ] All defaults set
- [ ] All validations included

# SECTION 4: EVIDENCE LEVELS

| Level | Name | Requirement | Example |
|-------|------|-------------|---------|
| L1 | Claim | Statement only | "File created" |
| L2 | Reference | Path/ID cited | "Created at /path/file.py" |
| L3 | Listing | Content shown | "Contains: [list of items]" |
| L4 | Sample | Partial content | "First 10 lines: ..." |
| L5 | Verified | Full proof | "All 100 lines verified, checksum: X" |

**Minimum for "COMPLETE" claim: Level 3 (Listing)**

# SECTION 5: EXHAUSTIVE OUTPUT PROTOCOL

## Before Shipping, Ask:
1. Is every section complete?
2. Are there any TODOs or placeholders?
3. What would I add if pushed 3x?
4. Have I verified at Level 3+?
5. Does this pass all quality gates?

## Quality Gates
```
G1: No placeholders detected
G2: All functions implemented
G3: All error handling present
G4: Evidence level ≥ L3
G5: Anti-regression passed
```

# SECTION 6: OUTPUT TEMPLATES

## Code File Template
```python
\"\"\"
Module: [name]
Purpose: [description]
Author: PRISM
Version: [X.Y.Z]
\"\"\"

# Imports - ALL required
import x
import y

# Constants - ALL defined
CONST_A = value
CONST_B = value

# Functions - ALL implemented
def function_a():
    \"\"\"Complete docstring.\"\"\"
    # Full implementation
    pass

def function_b():
    \"\"\"Complete docstring.\"\"\"
    # Full implementation
    pass

# Main - if applicable
if __name__ == "__main__":
    main()
```

## Skill File Template
```markdown
---
name: [skill-id]
description: |
  [Complete description]
  Use when: [specific triggers]
  Provides: [specific capabilities]
  Key principle: [core insight]
---

# [SKILL-NAME]
## [Subtitle]

# SECTION 1: [Topic]
[Complete content - no placeholders]

# SECTION 2: [Topic]
[Complete content - no placeholders]

# SECTION N: HOOKS
[All hooks defined]
```

# SECTION 7: MCP INTEGRATION

| MCP Tool | Completeness Use |
|----------|------------------|
| `prism_validate_gates` | Check all quality gates |
| `prism_validate_anti_regression` | Ensure new ≥ old |
| `prism_quality_omega` | Score output quality |
| `prism_quality_code` | Check code completeness |

# SECTION 8: HOOKS

```
COMP-001  output:starting     -> Initialize completeness tracking
COMP-002  placeholder:detect  -> Scan for banned patterns
COMP-003  section:complete    -> Mark section done
COMP-004  output:finishing    -> Run completeness checklist
COMP-005  ship:before         -> Final quality gate check
```

---
*PRISM Comprehensive Output v1.0*
*First response = final response. No placeholders.*
"""
    },

    "prism-batch-parallel-engine": {
        "description": "Batch processing, parallel execution, queue management, loop optimization",
        "content": """---
name: prism-batch-parallel-engine
description: |
  Batch and parallel processing for maximum throughput.
  Use when: Multiple similar operations, large datasets, time pressure.
  Provides: Batching strategies, parallel patterns, queue management.
  Key principle: Never sequential if batchable. Always parallel if independent.
---

# PRISM-BATCH-PARALLEL-ENGINE
## Maximize Throughput with Batching and Parallelism

# SECTION 1: DECISION FRAMEWORK

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHEN TO BATCH/PARALLELIZE                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Q1: Are there 2+ similar operations?                                       │
│      YES → Consider batching                                                │
│                                                                             │
│  Q2: Are operations independent (no data dependency)?                       │
│      YES → Use parallel execution                                           │
│      NO  → Use sequential with batched I/O                                 │
│                                                                             │
│  Q3: Is there I/O overhead per operation?                                   │
│      YES → Batch to reduce round trips                                      │
│                                                                             │
│  RULE: If operations.count ≥ 2 AND operations.similar → BATCH              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

# SECTION 2: BATCHING PATTERNS

## Pattern 1: Batch I/O
```python
# BAD: N round trips
for item in items:
    result = fetch(item)  # Network call each time

# GOOD: 1 round trip
results = batch_fetch(items)  # Single batched call
```

## Pattern 2: Batch Processing
```python
# BAD: Process one at a time
for item in items:
    process(item)
    save(item)

# GOOD: Process in batches
for batch in chunks(items, size=100):
    processed = [process(item) for item in batch]
    batch_save(processed)
```

## Pattern 3: Batch with Validation
```python
# Generate → Scrutinize → Validate loop
batch = generate_batch(items)
valid, invalid = scrutinize(batch)
while invalid:
    fixed = fix_batch(invalid)
    newly_valid, still_invalid = scrutinize(fixed)
    valid.extend(newly_valid)
    invalid = still_invalid
```

# SECTION 3: PARALLEL PATTERNS

## Pattern 1: ThreadPoolExecutor
```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def parallel_execute(items, func, max_workers=10):
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(func, item): item for item in items}
        for future in as_completed(futures):
            results.append(future.result())
    return results
```

## Pattern 2: Map-Reduce
```python
# MAP: Apply function to all items in parallel
mapped = parallel_map(items, transform_func)

# REDUCE: Combine results
result = reduce(combine_func, mapped)
```

## Pattern 3: Pipeline Parallelism
```
Stage 1: [A1] [A2] [A3] [A4] ...  (parallel)
            ↓    ↓    ↓    ↓
Stage 2:   [B1] [B2] [B3] [B4] ... (parallel)
              ↓    ↓    ↓    ↓
Stage 3:     [C1] [C2] [C3] [C4] ... (parallel)
```

# SECTION 4: OPTIMAL BATCH SIZES

| Operation Type | Optimal Batch | Rationale |
|----------------|---------------|-----------|
| Network I/O | 50-100 | Balance latency vs payload |
| File I/O | 20-50 | Disk seek optimization |
| CPU-bound | cores × 2 | Maximize CPU utilization |
| Memory-bound | fit in RAM | Avoid swapping |
| API calls | rate_limit / 2 | Stay under limits |

## Batch Size Formula
```
Optimal_Batch = min(
    max_memory / item_size,
    rate_limit / expected_time,
    sqrt(N × setup_cost / process_cost)
)
```

# SECTION 5: QUEUE MANAGEMENT

## Priority Queue
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIORITY LEVELS                                                             │
├──────────┬─────────────────────────────────────────────────────────────────┤
│ P0       │ CRITICAL - Safety, blocking errors                              │
│ P1       │ HIGH - User-facing, time-sensitive                              │
│ P2       │ NORMAL - Standard operations                                    │
│ P3       │ LOW - Background, optimization                                  │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

## Queue Processing
```python
while queue.not_empty():
    batch = queue.get_batch(size=optimal_batch, priority_first=True)
    results = parallel_execute(batch)
    queue.mark_complete(batch)
    checkpoint_if_needed()
```

# SECTION 6: ERROR HANDLING IN BATCH

## Strategies
| Strategy | Use When | Implementation |
|----------|----------|----------------|
| Fail-fast | Critical operations | Stop on first error |
| Collect errors | Non-critical | Continue, report all errors |
| Retry failed | Transient errors | Retry with backoff |
| Partial success | Independent items | Return successful, report failed |

## Implementation
```python
def batch_with_error_handling(items, func, strategy="collect"):
    results = []
    errors = []
    
    for item in items:
        try:
            results.append(func(item))
        except Exception as e:
            if strategy == "fail_fast":
                raise
            errors.append((item, e))
    
    return results, errors
```

# SECTION 7: MCP INTEGRATION

| MCP Tool | Batch/Parallel Use |
|----------|-------------------|
| `prism_batch_execute` | Execute multiple operations |
| `prism_queue_status` | Check queue state |
| `prism_skill_load` | Batch load multiple skills |
| `prism_material_search` | Batch material lookups |

## Batch Execute Example
```python
prism_batch_execute([
    {"op": "material_get", "id": "AL-6061"},
    {"op": "material_get", "id": "AL-7075"},
    {"op": "machine_get", "id": "HAAS-VF2"},
], parallel=True, max_workers=10)
```

# SECTION 8: HOOKS

```
BATCH-001  operations:multiple  -> Auto-batch if ≥2 similar
BATCH-002  batch:starting       -> Log batch size and type
BATCH-003  batch:progress       -> Track completion %
BATCH-004  batch:error          -> Handle batch errors
BATCH-005  batch:complete       -> Report results, checkpoint
```

# SECTION 9: PERFORMANCE METRICS

## Track These
| Metric | Target | Meaning |
|--------|--------|---------|
| Batch efficiency | >3x | Speedup vs sequential |
| Parallelization | >0.7 | % of parallelizable work |
| Queue depth | <100 | Pending operations |
| Error rate | <5% | Failed operations |
| Throughput | Maximize | Operations per second |

---
*PRISM Batch-Parallel Engine v1.0*
*Never sequential if batchable. Always parallel if independent.*
"""
    },

    "prism-deep-learning-patterns": {
        "description": "Error learning, pattern extraction, continuous improvement loops",
        "content": """---
name: prism-deep-learning-patterns
description: |
  Patterns for learning from errors and extracting insights.
  Use when: Errors occur, patterns emerge, improvement needed.
  Provides: Error analysis, pattern extraction, feedback loops.
  Key principle: Every error is a learning opportunity.
---

# PRISM-DEEP-LEARNING-PATTERNS
## Learn from Everything

# SECTION 1: LEARNING LOOP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS LEARNING LOOP                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────┐                                                            │
│    │  ACTION  │                                                            │
│    └────┬─────┘                                                            │
│         │                                                                  │
│         ▼                                                                  │
│    ┌──────────┐     ┌──────────┐     ┌──────────┐                         │
│    │ OBSERVE  │────►│ ANALYZE  │────►│ EXTRACT  │                         │
│    │ outcome  │     │ why?     │     │ pattern  │                         │
│    └──────────┘     └──────────┘     └────┬─────┘                         │
│                                           │                                │
│                                           ▼                                │
│    ┌──────────┐     ┌──────────┐     ┌──────────┐                         │
│    │  APPLY   │◄────│  STORE   │◄────│ VALIDATE │                         │
│    │ learning │     │ pattern  │     │ pattern  │                         │
│    └────┬─────┘     └──────────┘     └──────────┘                         │
│         │                                                                  │
│         └─────────────────► (next action)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

# SECTION 2: ERROR ANALYSIS FRAMEWORK

## Error Categories
| Category | Description | Learning Action |
|----------|-------------|-----------------|
| SYNTAX | Code/format errors | Add validation rule |
| LOGIC | Wrong algorithm | Document correct approach |
| DATA | Invalid input | Add input validation |
| INTEGRATION | System mismatch | Document dependencies |
| REGRESSION | Previously worked | Add regression test |

## Root Cause Analysis (5 Whys)
```
Problem: Output was incorrect
Why 1: Calculation used wrong formula
Why 2: Formula was for different material
Why 3: Material type wasn't checked
Why 4: No validation on material category
Why 5: Missing guard clause in function

ROOT CAUSE: Missing input validation
FIX: Add material category check
PATTERN: Always validate category before formula selection
```

# SECTION 3: PATTERN EXTRACTION

## Pattern Template
```
PATTERN-[ID]:
  TRIGGER: When [condition] occurs
  OBSERVATION: [what happened]
  ROOT_CAUSE: [why it happened]
  SOLUTION: [how to fix/prevent]
  CONFIDENCE: [0-100%]
  OCCURRENCES: [count]
```

## Pattern Categories
| Type | Description | Example |
|------|-------------|---------|
| ERROR | Failure patterns | "Missing validation causes X" |
| SUCCESS | What works | "Batching improves speed 5x" |
| ANTI-PATTERN | What to avoid | "Never use X without Y" |
| OPTIMIZATION | Efficiency gains | "Cache Z for 3x speedup" |

# SECTION 4: FEEDBACK SIGNALS

## Reward Signals
| Signal | Value | Trigger |
|--------|-------|---------|
| User satisfied | +10 | Explicit approval |
| Task complete | +5 | No complaints |
| Partial success | +3 | Some issues |
| Rework needed | -3 | Significant fixes |
| Bug introduced | -5 | Error in output |
| Safety issue | -10 | Critical failure |

## Signal Processing
```
For each outcome:
  1. Classify signal (positive/negative/neutral)
  2. Identify contributing factors
  3. Update pattern confidence:
     IF positive: confidence += 0.1 × (1 - confidence)
     IF negative: confidence -= 0.1 × confidence
  4. Store updated pattern
```

# SECTION 5: IMPROVEMENT LOOPS

## Loop 1: Immediate (within task)
```
TRY action
IF error:
  ANALYZE error
  ADJUST approach
  RETRY with adjustment
```

## Loop 2: Session (across tasks)
```
END of session:
  REVIEW all errors
  EXTRACT patterns
  UPDATE guidelines
  CHECKPOINT learnings
```

## Loop 3: Long-term (across sessions)
```
PERIODICALLY:
  AGGREGATE patterns across sessions
  IDENTIFY recurring issues
  CREATE new rules/validations
  UPDATE skills with learnings
```

# SECTION 6: BAYESIAN LEARNING

## Prior Update Formula
```
P(hypothesis|evidence) = P(evidence|hypothesis) × P(hypothesis) / P(evidence)

In practice:
  prior = initial belief
  likelihood = how well evidence fits hypothesis
  posterior = updated belief

After each observation:
  new_belief = old_belief × (evidence_strength)
```

## Confidence Decay
```
IF pattern not seen recently:
  confidence *= 0.95^(days_since_last)

Ensures old patterns fade if not reinforced
```

# SECTION 7: MCP INTEGRATION

| MCP Tool | Learning Use |
|----------|--------------|
| `prism_error_log` | Record errors |
| `prism_error_analyze` | Analyze patterns |
| `prism_error_learn` | Extract learnings |
| `prism_decision_record` | Log decisions |
| `prism_decision_search` | Find similar cases |

## Learning Workflow
```python
# On error
prism_error_log(error, context)

# Periodically
patterns = prism_error_analyze(recent_errors)
learnings = prism_error_learn(patterns)

# Apply
prism_hook_trigger("learning:apply", learnings)
```

# SECTION 8: HOOKS

```
LEARN-001  error:occurred     -> Log and analyze
LEARN-002  pattern:detected   -> Validate and store
LEARN-003  session:end        -> Extract session learnings
LEARN-004  decision:made      -> Record for future reference
LEARN-005  feedback:received  -> Update pattern confidence
```

# SECTION 9: ANTI-REGRESSION LEARNING

## Regression Detection
```
IF output < previous_output:
  FLAG as potential regression
  COMPARE with baseline
  IF confirmed regression:
    BLOCK output
    ANALYZE cause
    REVERT or FIX
```

## Learning from Regression
```
PATTERN: v9→v10 regression lost 54% content
CAUSE: Replacement without inventory check
PREVENTION: Always count before replace
RULE: new_count >= old_count OR BLOCK
```

---
*PRISM Deep Learning Patterns v1.0*
*Every error is a learning opportunity*
"""
    }
}

def create_skill_directory(skill_id, content):
    """Create skill directory and SKILL.md file."""
    skill_dir = OUTPUT / skill_id
    skill_dir.mkdir(exist_ok=True)
    
    skill_file = skill_dir / "SKILL.md"
    skill_file.write_text(content, encoding='utf-8')
    
    lines = len(content.split('\n'))
    return {"id": skill_id, "lines": lines, "path": str(skill_file)}

def main():
    print("=" * 70)
    print("GENERATING CLAUDE CAPABILITY SKILLS")
    print("=" * 70)
    
    results = []
    
    # Parallel generation
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}
        for skill_id, info in SKILLS_TO_GENERATE.items():
            future = executor.submit(create_skill_directory, skill_id, info["content"])
            futures[future] = skill_id
        
        for future in as_completed(futures):
            skill_id = futures[future]
            try:
                result = future.result()
                results.append(result)
                print(f"  [OK] {result['id']}: {result['lines']} lines")
            except Exception as e:
                print(f"  [FAIL] {skill_id}: {e}")
    
    print("\n" + "=" * 70)
    print(f"GENERATED: {len(results)} skills")
    total_lines = sum(r['lines'] for r in results)
    print(f"TOTAL LINES: {total_lines}")
    print("=" * 70)
    
    return results

if __name__ == "__main__":
    main()
