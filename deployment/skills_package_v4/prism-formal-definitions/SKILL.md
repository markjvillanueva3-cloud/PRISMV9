---
name: prism-formal-definitions
description: |
  Formal mathematical definitions and notation standards for PRISM Manufacturing Intelligence.
  Level 4 Reference skill providing rigorous definitions for all PRISM formulas, constants, and concepts.
  Use when precise mathematical notation or formal definitions are required.
---

# PRISM FORMAL DEFINITIONS v1.0
## Mathematical Notation & Rigorous Definitions
### Level 4 Reference | Updated: 2026-01-30

---

# CORE NOTATION

## Sets & Collections
| Symbol | Definition | Example |
|--------|------------|---------|
| R | Set of all resources | R = {skills, agents, formulas, hooks} |
| T | Task requirements vector | T = (domains, operations, complexity) |
| S | Skills subset | S ⊆ R_skills |
| A | Agents subset | A ⊆ R_agents |
| M | Materials database | M = {m₁, m₂, ..., mₙ} |

## Functions
| Symbol | Definition | Domain → Range |
|--------|------------|----------------|
| Cap(r,T) | Capability score | Resource × Task → [0,1] |
| Syn(R) | Synergy multiplier | Set → [0.5, 2.0] |
| S(x) | Safety score | Output → [0,1] |
| M(x) | Math rigor score | Output → [0,1] |
| C(T) | Completeness | Task → [0,1] |

## Operators
| Symbol | Meaning |
|--------|---------|
| ⊆ | Subset of |
| ∈ | Element of |
| Σ | Summation |
| Π | Product |
| argmax | Argument that maximizes |
| ± | Plus or minus (uncertainty) |

---

# FORMAL DEFINITIONS

## D1: Resource
A resource r is a tuple:
```
r = (id, type, level, capabilities, cost, dependencies)
```
where:
- id ∈ String (unique identifier)
- type ∈ {skill, agent, formula, hook, coefficient}
- level ∈ {L0, L1, L2, L3, L4}
- capabilities ∈ Set[String]
- cost ∈ ℝ⁺
- dependencies ∈ Set[Resource]

## D2: Task
A task T is a tuple:
```
T = (domains, operations, complexity, constraints)
```
where:
- domains ∈ Set[String] (e.g., {materials, physics})
- operations ∈ Set[String] (e.g., {calculate, validate})
- complexity ∈ [0,1]
- constraints ∈ Set[Constraint]

## D3: Capability Score
```
Cap(r,T) = w_d × DomainMatch(r,T) + w_o × OpMatch(r,T) + w_c × ComplexMatch(r,T)
```
where w_d + w_o + w_c = 1.0

## D4: Synergy
For resource set R:
```
Syn(R) = (Π_{i<j} syn(rᵢ, rⱼ))^(1/|pairs|)
```
(Geometric mean of pairwise synergies)

## D5: Safety Score
```
S(x) = min(S_physical(x), S_data(x), S_operational(x))
```
Required: S(x) ≥ 0.70

## D6: Math Rigor Score
```
M(x) = (hasDerivation × 0.3) + (hasUncertainty × 0.3) + (hasValidation × 0.4)
```
Required: M(x) ≥ 0.60

## D7: Completeness
```
C(T) = |completed_items| / |total_items|
```
Required: C(T) = 1.0

---

# CONSTRAINT DEFINITIONS

## C1: Skill Limit
```
|R_skills| ≤ 8
```

## C2: Agent Limit
```
|R_agents| ≤ 8
```

## C3: Safety Threshold
```
∀ output x: S(x) ≥ 0.70
```

## C4: Rigor Threshold
```
∀ calculation x: M(x) ≥ 0.60
```

## C5: Coverage Requirement
```
Coverage(R,T) = 1.0
```

---

# UNCERTAINTY NOTATION

## Format
All numerical outputs must be:
```
value ± uncertainty (confidence%)
```

Example: 412 ± 85 m/min (95% CI)

## Propagation
For f(x,y):
```
σ_f² = (∂f/∂x)²σ_x² + (∂f/∂y)²σ_y²
```

---

# PHYSICS CONSTANTS

| Symbol | Name | Value | Unit |
|--------|------|-------|------|
| kc1.1 | Kienzle specific force | material-dependent | N/mm² |
| mc | Kienzle exponent | material-dependent | - |
| C | Taylor constant | material-dependent | - |
| n | Taylor exponent | 0.1-0.5 | - |
| A, B, C, m, n | Johnson-Cook params | material-dependent | various |

---

# VERIFICATION LEVELS

| Level | Evidence | Confidence |
|-------|----------|------------|
| L1 | Claim only | 20% |
| L2 | File listing | 50% |
| L3 | Content sample | 75% |
| L4 | Reproducible | 90% |
| L5 | User verified | 95%+ |

---

**v1.0 | 2026-01-30 | Reference Library**
