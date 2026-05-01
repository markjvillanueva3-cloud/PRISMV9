---
name: prism-resource-optimizer
version: "2.0"
level: 1
category: cognitive
description: |
  Mathematical resource selection using F-RESOURCE-001 capability scoring.
  Computes Cap(r,T) for all PRISM resources via Jaccard similarity.
  Use when: Resource evaluation, capability gap analysis, optimization.
  Provides: Capability scores, rankings, gap analysis, recommendations.
  Key principle: Quantifiable resource-task matching.
dependencies:
  - prism-combination-engine
consumers:
  - prism-agent-selector
  - prism-swarm-coordinator
safety_critical: true
---

# PRISM-RESOURCE-OPTIMIZER
## Mathematical Resource Selection | Level 1 Cognitive
### Version 2.0 | F-RESOURCE-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Computes capability scores for all PRISM resources against task requirements using fuzzy matching across domains, operations, and complexity dimensions. Provides the Cap(r,T) function used by F-PSI-001.

### When to Use
- Called by prism-combination-engine during optimization
- When evaluating resource fit for a specific task
- For capability gap analysis
- Resource selection validation

### Safety Considerations
⚠️ **LIFE-SAFETY**: Incorrect capability scoring can select wrong resources.
- Always validate score calculations
- Flag resources with safety requirements
- Ensure safety-critical resources score appropriately

### Outputs
- Capability score Cap(r,T) for each resource
- Capability ranking
- Gap analysis (missing capabilities)
- Recommendations for gaps

---

## SECTION 2: CAPABILITY SCORING (F-RESOURCE-001)

### Formula
```
Cap(r,T) = w_d × DomainMatch(r,T) + w_o × OperationMatch(r,T) + w_c × ComplexityMatch(r,T)
```

### Weights (Calibratable)
| Weight | Value | Coefficient ID | Uncertainty |
|--------|-------|----------------|-------------|
| w_d | 0.40 | K-CAP-DOMAIN-WEIGHT | ±0.05 |
| w_o | 0.35 | K-CAP-OPERATION-WEIGHT | ±0.05 |
| w_c | 0.25 | K-CAP-COMPLEXITY-WEIGHT | ±0.03 |

### Uncertainty Propagation
```python
def compute_capability_with_uncertainty(resource, task):
    """Compute Cap(r,T) with uncertainty bounds."""
    
    # Base scores
    d = domain_match(resource, task)
    o = operation_match(resource, task)
    c = complexity_match(resource, task)
    
    # Weights with uncertainty
    w_d = 0.40; w_d_err = 0.05
    w_o = 0.35; w_o_err = 0.05
    w_c = 0.25; w_c_err = 0.03
    
    # Central estimate
    cap = w_d * d + w_o * o + w_c * c
    
    # Error propagation (quadrature)
    cap_err = math.sqrt(
        (d * w_d_err)**2 + 
        (o * w_o_err)**2 + 
        (c * w_c_err)**2
    )
    
    return {
        "score": round(cap, 4),
        "uncertainty": round(cap_err, 4),
        "confidence": 0.95,
        "notation": f"{cap:.2f} ± {cap_err:.2f} (95% CI)"
    }
```

---

## SECTION 3: MATCH FUNCTIONS

### DomainMatch (Jaccard Similarity)
```python
def domain_match(resource, task):
    """
    Compute domain overlap using Jaccard similarity.
    Returns: float in [0, 1]
    """
    r_domains = set(resource.capabilities.domains)
    t_domains = set(task.domains)
    
    if not r_domains and not t_domains:
        return 0.0
    
    intersection = r_domains & t_domains
    union = r_domains | t_domains
    
    return len(intersection) / len(union)
```

### OperationMatch (Coverage Ratio)
```python
def operation_match(resource, task):
    """
    Compute operation coverage ratio.
    Returns: float in [0, 1]
    """
    r_ops = set(resource.capabilities.operations)
    t_ops = set(task.operations)
    
    if not t_ops:
        return 0.0
    
    covered = sum(1 for op in t_ops if op in r_ops)
    return covered / len(t_ops)
```

### ComplexityMatch (Linear Penalty)
```python
def complexity_match(resource, task):
    """
    Compute complexity alignment with linear penalty.
    Returns: float in [0, 1]
    """
    r_complexity = resource.capabilities.complexity
    t_complexity = task.complexity
    
    diff = abs(r_complexity - t_complexity)
    return max(0.0, 1.0 - diff)
```

---

## SECTION 4: CAPABILITY MATRIX

### Structure (CAPABILITY_MATRIX.json)
```json
{
  "version": "2.0",
  "generated": "2026-01-29T20:00:00Z",
  "resourceCapabilities": {
    "SKILL-001": {
      "id": "prism-combination-engine",
      "type": "skill",
      "domains": ["coordination", "planning", "optimization"],
      "operations": ["coordinate", "optimize", "select", "validate"],
      "complexity": 0.85,
      "safety_score": 0.95,
      "domainScores": {"coordination": 1.0, "planning": 0.95, "optimization": 0.90},
      "operationScores": {"coordinate": 1.0, "optimize": 0.98, "select": 0.95},
      "taskTypeScores": {"coordination": 1.0, "planning": 0.95}
    }
  },
  "totalResources": 691
}
```

### Lookup with Caching
```python
_capability_cache = {}

def get_capability_vector(resource_id):
    """Get capability vector with caching."""
    if resource_id not in _capability_cache:
        _capability_cache[resource_id] = CAPABILITY_MATRIX["resourceCapabilities"].get(
            resource_id, None
        )
    return _capability_cache[resource_id]

def invalidate_cache():
    """Call when CAPABILITY_MATRIX is updated."""
    _capability_cache.clear()
```

---

## SECTION 5: GAP ANALYSIS

### Finding Missing Capabilities
```python
def find_capability_gaps(task, available_resources):
    """
    Identify capabilities required by task but not covered by resources.
    
    Returns:
        dict with domains_missing, operations_missing, recommendations
    """
    # Required capabilities
    required_domains = set(task.domains)
    required_ops = set(task.operations)
    
    # Covered capabilities
    covered_domains = set()
    covered_ops = set()
    
    for r in available_resources:
        covered_domains.update(r.capabilities.domains)
        covered_ops.update(r.capabilities.operations)
    
    # Gaps
    domain_gaps = required_domains - covered_domains
    operation_gaps = required_ops - covered_ops
    
    # Recommendations
    recommendations = []
    if domain_gaps:
        recommendations.extend(suggest_resources_for_domains(domain_gaps))
    if operation_gaps:
        recommendations.extend(suggest_resources_for_operations(operation_gaps))
    
    return {
        "domains_missing": list(domain_gaps),
        "operations_missing": list(operation_gaps),
        "coverage_percent": calculate_coverage(task, available_resources) * 100,
        "recommendations": recommendations,
        "can_proceed": len(operation_gaps) == 0  # Must cover all operations
    }
```

### Recommendations Generator
```python
def suggest_resources_for_domains(missing_domains):
    """Suggest resources that could fill domain gaps."""
    suggestions = []
    
    for domain in missing_domains:
        matching = [
            r for r in RESOURCE_REGISTRY.resources 
            if domain in r.capabilities.domains
        ]
        
        if matching:
            best = max(matching, key=lambda r: r.capabilities.domainScores.get(domain, 0))
            suggestions.append({
                "gap": domain,
                "suggested_resource": best.id,
                "match_score": best.capabilities.domainScores.get(domain, 0),
                "action": "add_to_selection"
            })
        else:
            suggestions.append({
                "gap": domain,
                "suggested_resource": None,
                "action": "create_new_skill",
                "description": f"No resource covers domain '{domain}'"
            })
    
    return suggestions
```

---

## SECTION 6: EXAMPLES

### Example 1: Simple Capability Scoring
```python
task = Task(
    domains=["materials", "physics"],
    operations=["calculate", "validate"],
    complexity=0.6
)

resource = Resource(
    id="prism-material-physics",
    capabilities={
        "domains": ["materials", "physics", "thermal"],
        "operations": ["calculate", "model", "derive"],
        "complexity": 0.7
    }
)

result = compute_capability(resource, task)
# {
#   "score": 0.78,
#   "uncertainty": 0.04,
#   "breakdown": {
#     "domain_match": 0.67,  # 2/3 Jaccard
#     "operation_match": 0.50,  # 1/2 covered
#     "complexity_match": 0.90  # |0.7-0.6| = 0.1 penalty
#   }
# }
```

### Example 2: Gap Analysis
```python
task = Task(
    domains=["CAD", "simulation", "optimization"],
    operations=["model", "simulate", "optimize", "verify"]
)

available = [skill_cad, skill_simulation]

gaps = find_capability_gaps(task, available)
# {
#   "domains_missing": ["optimization"],
#   "operations_missing": ["optimize"],
#   "coverage_percent": 75.0,
#   "recommendations": [{
#     "gap": "optimization",
#     "suggested_resource": "prism-process-optimizer",
#     "match_score": 0.95,
#     "action": "add_to_selection"
#   }],
#   "can_proceed": False
# }
```

---

## SECTION 7: ERROR HANDLING

| Error | Cause | Recovery |
|-------|-------|----------|
| MISSING_RESOURCE | Resource ID not in registry | Log warning, return 0 score |
| INVALID_TASK | Task missing required fields | Raise validation error |
| EMPTY_CAPABILITIES | Resource has no capabilities | Return 0 score with warning |
| MATRIX_LOAD_FAIL | Cannot load CAPABILITY_MATRIX | Use cached version or default scores |

```python
def compute_capability_safe(resource, task):
    """Safe wrapper with error handling."""
    try:
        # Validate inputs
        if not resource or not hasattr(resource, 'capabilities'):
            return {"score": 0, "error": "INVALID_RESOURCE"}
        if not task or not hasattr(task, 'domains'):
            return {"score": 0, "error": "INVALID_TASK"}
        
        # Compute
        return compute_capability_with_uncertainty(resource, task)
        
    except Exception as e:
        return {
            "score": 0,
            "error": str(e),
            "fallback": True
        }
```

---

## SECTION 8: INTEGRATION

### With Combination Engine
```python
# Called during F-PSI-001 optimization
def compute_all_capabilities(task):
    scores = {}
    for r in RESOURCE_REGISTRY.resources:
        result = resource_optimizer.compute_capability(r, task)
        scores[r.id] = result
    return scores
```

### With Calibration System
```python
# After task completion, update weights
def calibrate_from_outcome(task_id, selected_resources, actual_effectiveness):
    predicted_scores = get_predicted_scores(task_id)
    
    for resource_id, predicted in predicted_scores.items():
        actual = actual_effectiveness.get(resource_id, 0)
        error = actual - predicted["score"]
        
        if abs(error) > 0.1:  # Significant deviation
            log_calibration_needed(resource_id, predicted, actual)
    
    # Trigger weight recalibration if systematic bias detected
    if detect_systematic_bias(predicted_scores, actual_effectiveness):
        schedule_weight_calibration()
```

---

## SECTION 9: QUICK REFERENCE

### Scoring Scale
| Score | Interpretation | Action |
|-------|----------------|--------|
| 0.0-0.3 | Poor fit | Exclude |
| 0.3-0.5 | Below threshold | Consider alternatives |
| 0.5-0.7 | Acceptable | Include if needed |
| 0.7-0.9 | Good fit | Prefer |
| 0.9-1.0 | Excellent fit | Prioritize |

### Coverage Threshold
- Default: θ = 0.50 (K-COVERAGE-THRESHOLD)
- Resource counts as "covering" if Cap(r,T) ≥ θ
- Safety-critical: θ = 0.70 minimum

### Key Files
| File | Contents |
|------|----------|
| CAPABILITY_MATRIX.json | Resource capability vectors |
| RESOURCE_REGISTRY.json | 691 resource definitions |
| COEFFICIENT_DATABASE.json | Calibratable weights |

---

**Version:** 2.0 | **Date:** 2026-01-29 | **Level:** 1 (Cognitive)
**Enhanced:** YAML frontmatter, uncertainty propagation, examples, error handling
