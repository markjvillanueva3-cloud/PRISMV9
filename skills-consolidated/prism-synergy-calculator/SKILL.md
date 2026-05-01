---
name: prism-synergy-calculator
version: "2.0"
level: 1
category: cognitive
description: |
  Resource synergy computation using F-SYNERGY-001 geometric mean formula.
  Evaluates pairwise interactions from SYNERGY_MATRIX (150+ pairs).
  Use when: Evaluating combinations, learning patterns, detecting conflicts.
  Provides: Synergy scores, conflict detection, Bayesian learning.
  Key principle: Geometric mean captures multiplicative interactions.
dependencies:
  - prism-combination-engine
consumers:
  - prism-resource-optimizer
  - prism-agent-selector
safety_critical: false
---

# PRISM-SYNERGY-CALCULATOR
## Resource Synergy Computation | Level 1 Cognitive
### Version 2.0 | F-SYNERGY-001 Implementation

---

## SECTION 1: OVERVIEW

### Purpose
Computes the combined synergy effect of resource combinations using the SYNERGY_MATRIX. Implements F-SYNERGY-001 for use by F-PSI-001 optimization.

### When to Use
- Evaluating resource combination quality
- Learning synergy patterns from task outcomes
- Identifying resource conflicts
- Optimizing multi-agent swarm composition

### Matrix Statistics
- **Total Pairs:** 150+ explicit entries
- **Data Sources:** Learned (85%), Manual (10%), Default (5%)
- **Update Frequency:** After each task completion
- **Confidence Threshold:** 0.80 minimum for decisions

---

## SECTION 2: SYNERGY CALCULATION (F-SYNERGY-001)

### Formula
```
Syn(R) = [ Πᵢ<ⱼ SynMatrix[rᵢ][rⱼ] ]^(2/(|R|×(|R|-1)))
```

This is the **geometric mean** of all pairwise synergies.

### Implementation
```python
import itertools
import math

def compute_synergy(resources):
    """
    Compute combined synergy for a resource set.
    
    Args:
        resources: List of resource IDs
        
    Returns:
        dict with synergy score, confidence, details
    """
    if len(resources) < 2:
        return {"synergy": 1.0, "pairs": 0, "confidence": 1.0}
    
    pairs = list(itertools.combinations(resources, 2))
    pair_count = len(pairs)
    
    product = 1.0
    min_confidence = 1.0
    details = []
    
    for r1, r2 in pairs:
        pair_data = get_synergy_pair(r1, r2)
        product *= pair_data["synergy"]
        min_confidence = min(min_confidence, pair_data["confidence"])
        details.append({
            "pair": (r1, r2),
            "synergy": pair_data["synergy"],
            "source": pair_data["source"]
        })
    
    # Geometric mean
    exponent = 1.0 / pair_count
    synergy = product ** exponent
    
    return {
        "synergy": round(synergy, 4),
        "pairs": pair_count,
        "confidence": round(min_confidence, 2),
        "details": details
    }
```

### Interpretation
| Value | Category | Meaning | Action |
|-------|----------|---------|--------|
| 0.0-0.5 | CONFLICT | Resources interfere | Avoid combination |
| 0.5-0.8 | NEGATIVE | Slight interference | Consider alternatives |
| 0.8-1.2 | NEUTRAL | No interaction | Acceptable |
| 1.2-1.5 | POSITIVE | Complementary | Prefer |
| 1.5-2.0 | SYNERGISTIC | Strong amplification | Prioritize |

---

## SECTION 3: SYNERGY MATRIX

### Structure (SYNERGY_MATRIX.json)
```json
{
  "version": "2.0",
  "generated": "2026-01-29T20:00:00Z",
  "totalPairs": 156,
  "pairs": {
    "prism-material-physics:materials_scientist": {
      "synergy": 1.9,
      "confidence": 0.92,
      "dataPoints": 15,
      "source": "learned",
      "reason": "Physics skill + scientist agent = domain amplification",
      "lastUpdated": "2026-01-28"
    },
    "prism-combination-engine:combination_optimizer": {
      "synergy": 2.0,
      "confidence": 0.98,
      "dataPoints": 42,
      "source": "learned",
      "reason": "L0 skill + dedicated optimizer agent",
      "lastUpdated": "2026-01-29"
    }
  },
  "categoryDefaults": {
    "skill:skill_same_level": 1.2,
    "skill:agent_matching_domain": 1.5,
    "skill:agent_different_domain": 0.9,
    "skill:formula_using": 1.7,
    "agent:agent_same_tier": 1.1,
    "formula:formula_same_domain": 1.3
  }
}
```

### Lookup with Fallback
```python
def get_synergy_pair(r1, r2):
    """Get synergy for a resource pair with fallback chain."""
    
    # Normalize key order (alphabetical)
    key = f"{r1}:{r2}" if r1 < r2 else f"{r2}:{r1}"
    
    # 1. Try explicit pair
    if key in SYNERGY_MATRIX["pairs"]:
        return SYNERGY_MATRIX["pairs"][key]
    
    # 2. Try category default
    category_key = get_category_key(r1, r2)
    if category_key in SYNERGY_MATRIX["categoryDefaults"]:
        return {
            "synergy": SYNERGY_MATRIX["categoryDefaults"][category_key],
            "confidence": 0.70,
            "source": "category_default"
        }
    
    # 3. Global default
    return {
        "synergy": 1.0,
        "confidence": 0.50,
        "source": "global_default"
    }
```

---

## SECTION 4: LEARNING

### Bayesian Update After Task
```python
def update_synergy_from_outcome(r1, r2, task_outcome, actual_interaction_effect):
    """
    Update synergy estimate using Bayesian learning.
    
    Args:
        r1, r2: Resource IDs
        task_outcome: Task success metrics
        actual_interaction_effect: Measured interaction (0-2 scale)
    """
    current = get_synergy_pair(r1, r2)
    prior = current["synergy"]
    prior_confidence = current["confidence"]
    data_points = current.get("dataPoints", 1)
    
    # Learning rate decays with data points
    alpha = min(0.3, 1.0 / (data_points + 1))
    
    # Bayesian update
    posterior = (1 - alpha) * prior + alpha * actual_interaction_effect
    
    # Confidence increases with data
    new_confidence = min(0.99, prior_confidence + 0.02)
    
    # Update matrix
    update_synergy_entry(r1, r2, {
        "synergy": round(posterior, 4),
        "confidence": round(new_confidence, 2),
        "dataPoints": data_points + 1,
        "lastUpdated": datetime.now().isoformat()
    })
    
    return {"prior": prior, "posterior": posterior, "change": posterior - prior}
```

### Confidence Decay
```python
def apply_confidence_decay():
    """Apply daily confidence decay to stale entries."""
    
    today = datetime.now()
    decay_rate = 0.95  # 5% per day
    
    for key, entry in SYNERGY_MATRIX["pairs"].items():
        last_update = datetime.fromisoformat(entry["lastUpdated"])
        days_stale = (today - last_update).days
        
        if days_stale > 0:
            decayed_confidence = entry["confidence"] * (decay_rate ** days_stale)
            entry["confidence"] = max(0.50, round(decayed_confidence, 2))
```

---

## SECTION 5: CONFLICT DETECTION

### Known Conflicts (Synergy < 0.5)
| Pair | Synergy | Reason |
|------|---------|--------|
| prism-sp-brainstorm:prism-sp-execution | 0.3 | Sequential only |
| prism-fanuc-programming:prism-siemens-programming | 0.4 | Different controllers |
| prism-sp-planning:prism-sp-debugging | 0.4 | Different phases |

### Auto-Detection
```python
def detect_conflicts(resources, threshold=0.5):
    """
    Detect conflicting resource pairs.
    
    Returns:
        List of conflict tuples (r1, r2, synergy, reason)
    """
    conflicts = []
    
    for r1, r2 in itertools.combinations(resources, 2):
        pair_data = get_synergy_pair(r1, r2)
        
        if pair_data["synergy"] < threshold:
            conflicts.append({
                "pair": (r1, r2),
                "synergy": pair_data["synergy"],
                "reason": pair_data.get("reason", "Unknown conflict"),
                "severity": "CRITICAL" if pair_data["synergy"] < 0.3 else "WARNING"
            })
    
    return conflicts


def validate_combination(resources):
    """Validate combination has no critical conflicts."""
    
    conflicts = detect_conflicts(resources)
    critical = [c for c in conflicts if c["severity"] == "CRITICAL"]
    
    if critical:
        return {
            "valid": False,
            "reason": f"Critical conflicts: {critical}",
            "conflicts": conflicts
        }
    
    return {
        "valid": True,
        "warnings": [c for c in conflicts if c["severity"] == "WARNING"]
    }
```

---

## SECTION 6: EXAMPLES

### Example 1: Calculate Swarm Synergy
```python
agents = [
    "materials_scientist",
    "physics_validator", 
    "extractor",
    "test_generator"
]

result = compute_synergy(agents)
# {
#   "synergy": 1.45,
#   "pairs": 6,
#   "confidence": 0.88,
#   "details": [
#     {"pair": ("materials_scientist", "physics_validator"), "synergy": 1.8},
#     {"pair": ("materials_scientist", "extractor"), "synergy": 1.4},
#     ...
#   ]
# }
```

### Example 2: Detect Conflicts Before Execution
```python
proposed = [
    "prism-sp-brainstorm",
    "prism-sp-execution",  # Conflict!
    "prism-quality-master"
]

validation = validate_combination(proposed)
# {
#   "valid": False,
#   "reason": "Critical conflicts: brainstorm + execution",
#   "conflicts": [{"pair": ("prism-sp-brainstorm", "prism-sp-execution"), "synergy": 0.3}]
# }
```

### Example 3: Learn from Task Outcome
```python
# After successful task using physics + materials
update_synergy_from_outcome(
    r1="prism-material-physics",
    r2="materials_scientist",
    task_outcome={"success": True, "quality": 0.95},
    actual_interaction_effect=1.95
)
# {"prior": 1.9, "posterior": 1.915, "change": 0.015}
```

---

## SECTION 7: ERROR HANDLING

| Error | Cause | Recovery |
|-------|-------|----------|
| MISSING_PAIR | Pair not in matrix | Use category default |
| INVALID_RESOURCE | Resource ID not found | Log warning, return 1.0 |
| MATRIX_CORRUPT | Cannot load matrix | Use cached version |
| UPDATE_FAILED | Cannot write update | Queue for retry |

```python
def get_synergy_safe(r1, r2):
    """Safe wrapper with error handling."""
    try:
        return get_synergy_pair(r1, r2)
    except KeyError:
        log_warning(f"Unknown resource pair: {r1}, {r2}")
        return {"synergy": 1.0, "confidence": 0.50, "source": "error_fallback"}
    except Exception as e:
        log_error(f"Synergy lookup failed: {e}")
        return {"synergy": 1.0, "confidence": 0.30, "source": "error_fallback"}
```

---

## SECTION 8: QUICK REFERENCE

### High-Synergy Pairs (≥1.8)
| Pair | Synergy | Data Points |
|------|---------|-------------|
| prism-combination-engine:combination_optimizer | 2.0 | 42 |
| prism-material-physics:F-PHYS-001 | 2.0 | 38 |
| prism-formula-evolution:calibration_engineer | 2.0 | 25 |
| prism-monolith-extractor:deep_extraction_swarm | 2.0 | 31 |
| prism-material-physics:materials_scientist | 1.9 | 15 |

### Key Files
| File | Path |
|------|------|
| SYNERGY_MATRIX | C:\PRISM\data\coordination\SYNERGY_MATRIX.json |
| Backup | C:\PRISM\data\coordination\SYNERGY_MATRIX.backup.json |

---

**Version:** 2.0 | **Date:** 2026-01-29 | **Level:** 1 (Cognitive)
**Enhanced:** YAML frontmatter, examples, error handling, learning details
