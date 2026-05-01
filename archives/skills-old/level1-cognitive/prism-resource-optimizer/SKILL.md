# PRISM-RESOURCE-OPTIMIZER
## Mathematical Resource Selection | Level 1 Cognitive
### Version 1.0 | F-RESOURCE-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Computes capability scores for all PRISM resources against task requirements using fuzzy matching across domains, operations, and complexity dimensions. Provides the Cap(r,T) function used by F-PSI-001.

### When to Use
- Called by prism-combination-engine during optimization
- When evaluating resource fit for a specific task
- For capability gap analysis

### Outputs
- Capability score Cap(r,T) for each resource
- Capability ranking
- Gap analysis (missing capabilities)

---

## SECTION 2: CAPABILITY SCORING (F-RESOURCE-001)

### Formula
```
Cap(r,T) = w_d × DomainMatch(r,T) + w_o × OperationMatch(r,T) + w_c × ComplexityMatch(r,T)
```

### Weights (Calibratable)
| Weight | Value | Coefficient ID |
|--------|-------|----------------|
| w_d | 0.40 | K-CAP-DOMAIN-WEIGHT |
| w_o | 0.35 | K-CAP-OPERATION-WEIGHT |
| w_c | 0.25 | K-CAP-COMPLEXITY-WEIGHT |

---

## SECTION 3: MATCH FUNCTIONS

### DomainMatch
```python
def domain_match(resource, task):
    r_domains = set(resource.capabilities.domains)
    t_domains = set(task.domains)
    intersection = r_domains & t_domains
    union = r_domains | t_domains
    return len(intersection) / len(union) if union else 0  # Jaccard
```

### OperationMatch
```python
def operation_match(resource, task):
    r_ops = set(resource.capabilities.operations)
    t_ops = set(task.operations)
    covered = sum(1 for op in t_ops if op in r_ops)
    return covered / len(t_ops) if t_ops else 0
```

### ComplexityMatch
```python
def complexity_match(resource, task):
    r_complexity = resource.capabilities.complexity
    t_complexity = task.complexity
    diff = abs(r_complexity - t_complexity)
    return max(0, 1 - diff)  # Linear penalty
```

---

## SECTION 4: CAPABILITY MATRIX

### Structure (CAPABILITY_MATRIX.json)
```json
{
  "resourceCapabilities": {
    "SKILL-001": {
      "name": "prism-combination-engine",
      "domainScores": {"coordination": 1.0, "planning": 0.95},
      "operationScores": {"coordinate": 1.0, "optimize": 0.98},
      "taskTypeScores": {"coordination": 1.0, "planning": 0.95}
    }
  }
}
```

### Lookup
```python
def get_capability_vector(resource_id):
    return CAPABILITY_MATRIX["resourceCapabilities"][resource_id]
```

---

## SECTION 5: GAP ANALYSIS

### Finding Missing Capabilities
```python
def find_gaps(task, available_resources):
    required = set(task.operations)
    covered = set()
    for r in available_resources:
        covered.update(r.capabilities.operations)
    gaps = required - covered
    return gaps
```

### Recommendations
If gaps found:
1. Suggest new skills/agents to create
2. Identify similar resources that could be extended
3. Flag for human review

---

## SECTION 6: INTEGRATION

### With Combination Engine
```python
# Called during F-PSI-001 optimization
for r in RESOURCE_REGISTRY.resources:
    scores[r.id] = resource_optimizer.compute_capability(r, task)
```

### Calibration
```python
# After task completion, update weights
actual_effectiveness = measure_effectiveness(selected_resources)
calibrate_weights(predicted_scores, actual_effectiveness)
```

---

## SECTION 7: QUICK REFERENCE

### Scoring Scale
| Score | Interpretation |
|-------|----------------|
| 0.0-0.3 | Poor fit |
| 0.3-0.5 | Below threshold |
| 0.5-0.7 | Acceptable |
| 0.7-0.9 | Good fit |
| 0.9-1.0 | Excellent fit |

### Coverage Threshold
- Default: θ = 0.50 (K-COVERAGE-THRESHOLD)
- Resource counts as "covering" if Cap(r,T) ≥ θ

---

**Version:** 1.0 | **Date:** 2026-01-27 | **Level:** 1 (Cognitive)
