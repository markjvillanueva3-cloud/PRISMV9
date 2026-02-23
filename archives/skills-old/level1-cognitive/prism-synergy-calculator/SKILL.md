# PRISM-SYNERGY-CALCULATOR
## Resource Synergy Computation | Level 1 Cognitive
### Version 1.0 | F-SYNERGY-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Computes the combined synergy effect of resource combinations using the SYNERGY_MATRIX. Implements F-SYNERGY-001 for use by F-PSI-001 optimization.

### When to Use
- Evaluating resource combination quality
- Learning synergy patterns from task outcomes
- Identifying resource conflicts

---

## SECTION 2: SYNERGY CALCULATION (F-SYNERGY-001)

### Formula
```
Syn(R) = [ Πᵢ<ⱼ SynMatrix[rᵢ][rⱼ] ]^(2/(|R|×(|R|-1)))
```

### Interpretation (Geometric Mean of Pairwise Synergies)
| Value | Meaning |
|-------|---------|
| 0.0-0.5 | CONFLICT - Resources interfere |
| 0.5-0.8 | NEGATIVE - Slight interference |
| 0.8-1.2 | NEUTRAL - No interaction |
| 1.2-1.5 | POSITIVE - Complementary |
| 1.5-2.0 | SYNERGISTIC - Strong amplification |

---

## SECTION 3: SYNERGY MATRIX

### Structure (SYNERGY_MATRIX.json)
```json
{
  "pairs": {
    "prism-material-physics:materials_scientist": {
      "synergy": 1.9,
      "confidence": 0.92,
      "dataPoints": 15,
      "source": "learned",
      "reason": "Physics skill + scientist agent = domain amplification"
    }
  }
}
```

### Lookup Function
```python
def get_synergy(r1, r2):
    key = f"{r1}:{r2}" if r1 < r2 else f"{r2}:{r1}"
    if key in SYNERGY_MATRIX["pairs"]:
        return SYNERGY_MATRIX["pairs"][key]["synergy"]
    return get_category_default(r1, r2)
```

### Category Defaults
| Category Pair | Default Synergy |
|---------------|-----------------|
| skill:skill_same_level | 1.2 |
| skill:agent_matching_domain | 1.5 |
| skill:agent_different_domain | 0.9 |
| skill:formula_using | 1.7 |
| agent:agent_same_tier | 1.1 |
| formula:formula_same_domain | 1.3 |

---

## SECTION 4: LEARNING

### Update After Task Completion
```python
def update_synergy(r1, r2, task_outcome):
    current = get_synergy(r1, r2)
    actual_effect = measure_interaction_effect(r1, r2, task_outcome)
    
    # Bayesian update
    alpha = learning_rate  # Default 0.1
    new_synergy = (1 - alpha) * current + alpha * actual_effect
    
    # Update matrix
    update_entry(r1, r2, new_synergy, increment_data_points=True)
```

### Confidence Decay
```python
confidence = base_confidence * (0.95 ^ days_since_update)
```

---

## SECTION 5: CONFLICT DETECTION

### Known Conflicts (Synergy < 0.5)
- prism-sp-brainstorm + prism-sp-execution (can't brainstorm and execute simultaneously)
- prism-fanuc-programming + prism-siemens-programming (different controllers)

### Auto-Detection
```python
def detect_conflicts(combination):
    conflicts = []
    for r1, r2 in itertools.combinations(combination, 2):
        if get_synergy(r1, r2) < 0.5:
            conflicts.append((r1, r2, get_synergy(r1, r2)))
    return conflicts
```

---

## SECTION 6: INTEGRATION

### With Combination Engine
```python
# Called during F-PSI-001 optimization
def compute_combination_synergy(R):
    if len(R) < 2:
        return 1.0  # No pairs
    
    product = 1.0
    pair_count = 0
    for r1, r2 in itertools.combinations(R, 2):
        product *= synergy_calculator.get_synergy(r1, r2)
        pair_count += 1
    
    # Geometric mean
    return product ** (1 / pair_count)
```

---

## SECTION 7: QUICK REFERENCE

### High-Synergy Pairs (≥1.8)
| Pair | Synergy | Reason |
|------|---------|--------|
| prism-combination-engine:combination_optimizer | 2.0 | L0 + optimizer = perfect |
| prism-material-physics:F-PHYS-001 | 2.0 | Skill uses formula |
| prism-formula-evolution:calibration_engineer | 2.0 | Calibration match |
| prism-monolith-extractor:deep_extraction_swarm | 2.0 | Extraction synergy |

### Conflict Pairs (<0.5)
| Pair | Synergy | Reason |
|------|---------|--------|
| prism-sp-brainstorm:prism-sp-execution | 0.3 | Sequential only |

---

**Version:** 1.0 | **Date:** 2026-01-27 | **Level:** 1 (Cognitive)
