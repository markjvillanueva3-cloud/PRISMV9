# PRISM Omega Integration
## Skill ID: prism-omega
## Version: 1.0.0
## Category: P6-OMEGA

---

## Overview

The Omega Integration computes the master quality equation that determines if PRISM output is production-ready. It enforces hard safety constraints and provides optimization guidance.

**Master Equation:**
```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
```

**Hard Constraint:** S(x) ≥ 0.70 or BLOCKED

---

## 6 Omega Tools

| Tool | Purpose |
|------|---------|
| `omega_compute` | Calculate full Ω(x) score with all components |
| `omega_breakdown` | Get detailed contribution percentages |
| `omega_learn_weights` | Adapt weights from outcomes (gradient descent) |
| `omega_validate` | Check against release/acceptable thresholds |
| `omega_history` | Track Ω calculations over time |
| `omega_optimize` | Get improvement suggestions to reach target |

---

## Components

| Symbol | Name | Weight | Description |
|--------|------|--------|-------------|
| R | Reasoning | 0.25 | Logic validity, cross-references, verification |
| C | Code | 0.20 | Structure, patterns, error handling, coverage |
| P | Process | 0.15 | Checkpoints, batching, efficiency |
| S | Safety | 0.30 | Physics validation, limits, edge cases |
| L | Learning | 0.10 | Outcome recording, pattern extraction |

---

## Thresholds

| Status | Ω Score | Action |
|--------|---------|--------|
| RELEASE_READY | ≥ 0.70 | Production deployment OK |
| ACCEPTABLE | ≥ 0.65 | Development continues |
| WARNING | ≥ 0.50 | Needs improvement |
| BLOCKED | < 0.40 | Cannot proceed |
| BLOCKED_SAFETY | Any (S<0.70) | Safety violation - HARD BLOCK |

---

## Usage Examples

### Compute Omega
```python
omega_compute(R=0.85, C=0.80, P=0.75, S=0.90, L=0.60)
# Returns: {omega: 0.815, status: "RELEASE_READY", ...}
```

### Check Safety Violation
```python
omega_compute(R=0.95, C=0.95, P=0.95, S=0.50, L=0.95)
# Returns: {status: "BLOCKED_SAFETY", recommendations: [...]}
```

### Get Optimization Path
```python
omega_optimize(R=0.6, C=0.6, P=0.6, S=0.7, L=0.4, target=0.70)
# Returns: {gap: 0.09, suggestions: [{component: "S", impact: 0.03}, ...]}
```

### Learn From Outcomes
```python
omega_learn_weights(outcomes=[
    {components: {R:0.9, C:0.8, P:0.7, S:0.95, L:0.6}, actual_quality: 0.88}
])
# Returns: {new_weights: {...}, outcomes_processed: 1}
```

---

## Trigger Patterns

Use omega tools when:
- Completing a phase or task
- Before releasing output
- When safety score is questionable
- To find improvement path
- After multiple sessions to learn patterns

---

## Integration

Auto-fires via `SAFETY_CHECK_MACHINING` pattern after:
- `calc_cutting_force`
- `check_spindle_torque`
- `validate_workholding_setup`
- `predict_tool_breakage`

---

## Best Practices

1. **Always check S(x) first** - Safety blocks everything
2. **Use omega_optimize** to find highest-impact improvements
3. **Call omega_validate** before marking work complete
4. **Record outcomes** via omega_learn_weights for adaptive tuning
5. **Track history** across sessions for trend analysis
