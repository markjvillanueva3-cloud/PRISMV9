---
name: prism-uncertainty-propagation
description: |
  Mandatory uncertainty quantification for all PRISM outputs. Enforces
  COMMANDMENT 5: NEVER bare numbers. Provides error propagation rules,
  confidence intervals, and Monte Carlo methods. Every calculation must
  output value ± uncertainty (confidence%). Level 0 Always-On skill.
---

# PRISM Uncertainty Propagation Skill v1.0
## No Bare Numbers Ever - Level 0 Always-On
## Triggers: ALL calculations, ALL estimates, ALL outputs

---

## Core Axiom

> **"A number without uncertainty is a lie pretending to be truth."**

**COMMANDMENT 5:** NEVER bare numbers. Always value ± error (confidence%).

---

## 1. MANDATORY OUTPUT FORMAT

```
[VALUE] ± [UNCERTAINTY] [UNIT] ([CONFIDENCE]% CI)
```

### Valid Examples
```
✓ 412 ± 85 tool calls (95% CI)
✓ 27.3 ± 5.5 minutes (95% CI)
✓ 0.847 ± 0.023 coverage (95% CI)
✓ 1,540 ± 0 materials (exact count)
✓ 1,850 ± 180 N/mm² (95% CI)
```

### Invalid Examples
```
✗ 412 tool calls              ← NO UNCERTAINTY
✗ About 400 calls             ← VAGUE
✗ 412 ± 85 calls              ← NO CONFIDENCE LEVEL
✗ ~30 minutes                 ← INFORMAL
```

---

## 2. ERROR PROPAGATION RULES

### Addition / Subtraction: z = x ± y
```
σ_z = √(σ_x² + σ_y²)
```

### Multiplication: z = x × y
```
σ_z/z = √[(σ_x/x)² + (σ_y/y)²]
```

### Division: z = x / y
```
σ_z/z = √[(σ_x/x)² + (σ_y/y)²]
```

### Power: z = xⁿ
```
σ_z/z = |n| × (σ_x/x)
```

### Exponential: z = e^x
```
σ_z = z × σ_x
```

### Logarithm: z = ln(x)
```
σ_z = σ_x / x
```

---

## 3. WORKED EXAMPLE

**Problem:** EFFORT = Base × Complexity × Risk

**Given:**
- Base = 176 ± 18 calls (10.2% relative)
- Complexity = 2.34 ± 0.35 (15.0% relative)
- Risk = 1.0 ± 0.10 (10.0% relative)

**Calculate:**
```
EFFORT = 176 × 2.34 × 1.0 = 412 calls

σ_EFFORT/EFFORT = √(0.102² + 0.150² + 0.100²)
                = √(0.0104 + 0.0225 + 0.0100)
                = √0.0429
                = 0.207 (20.7%)

σ_EFFORT = 0.207 × 412 = 85 calls
```

**Result:** 412 ± 85 calls (68% CI) or 412 ± 167 calls (95% CI)

---

## 4. CONFIDENCE LEVELS

| Level | Z-score | Use Case |
|-------|---------|----------|
| 68% | 1.00 | One standard deviation |
| 90% | 1.645 | Quick estimates |
| 95% | 1.96 | Standard scientific |
| 99% | 2.576 | High confidence |
| 99.7% | 3.00 | "Three sigma" |

**PRISM Default: 95% CI**

### Converting Between Levels
```
CI_new = CI_68 × (Z_new / 1.0)

Example: 412 ± 85 (68% CI) → 95% CI
CI_95 = 85 × 1.96 = 167
Result: 412 ± 167 (95% CI)
```

---

## 5. UNCERTAINTY SOURCES

| Source | Type | Example |
|--------|------|---------|
| Measurement | Instrument precision | ±0.01 mm |
| Sampling | Limited data points | n=10 samples |
| Model | Formula approximation | ±15% typical |
| Parameter | Coefficient CI | ±0.15 on k_io |
| Aleatory | Inherent randomness | Process variation |
| Epistemic | Unknown unknowns | Missing variables |

### Combining Independent Sources
```
σ_total = √(σ₁² + σ₂² + σ₃² + ...)
```

### Combining Correlated Sources
```
σ_total = √(Σᵢ σᵢ² + 2·Σᵢ<ⱼ ρᵢⱼ·σᵢ·σⱼ)
```

---

## 6. MONTE CARLO METHOD

Use when:
- Function is complex (nonlinear)
- Inputs are non-normal
- Multiple correlated sources

```python
def monte_carlo(func, inputs, n_samples=10000):
    results = []
    for _ in range(n_samples):
        sampled = {k: sample(v) for k, v in inputs.items()}
        results.append(func(**sampled))
    return {
        'mean': np.mean(results),
        'std': np.std(results),
        'ci_95': np.percentile(results, [2.5, 97.5])
    }
```

---

## 7. SIGNIFICANT FIGURES

**Rule:** Uncertainty determines precision.

| Raw Calculation | Uncertainty | Report As |
|-----------------|-------------|-----------|
| 412.3847 | ±85.2341 | 412 ± 85 |
| 0.84732 | ±0.02341 | 0.847 ± 0.023 |
| 1854.7 | ±183.2 | 1850 ± 180 |

---

## 8. COMPARING VALUES WITH UNCERTAINTY

**Are two values significantly different?**

```
z = |a - b| / √(σ_a² + σ_b²)

If z < 1.96: NOT significantly different (95%)
If z ≥ 1.96: Significantly different (95%)
```

**Example:**
- Value A: 412 ± 85
- Value B: 380 ± 70
- z = |412 - 380| / √(85² + 70²) = 32 / 110 = 0.29
- 0.29 < 1.96 → NOT significantly different

---

## 9. PRISM DEFAULTS BY CATEGORY

| Category | Default CI | Rationale |
|----------|------------|-----------|
| Effort estimates | 95% | Planning precision |
| Time estimates | 90% | Quick decisions |
| Material properties | 95% | Scientific standard |
| Cutting parameters | 95% | Safety margin |
| Safety-critical | 99% | Extra caution |
| Quick estimates | 90% | Speed vs precision |

---

## 10. CHECKLIST BEFORE REPORTING

```
□ Is it measurement/estimate? → Add uncertainty
□ Is it calculation? → Propagate uncertainties
□ Is it exact count? → State "exact" or ± 0
□ Is confidence level stated?
□ Is precision appropriate (sig figs)?
□ Are units included?
□ Are sources of uncertainty documented?
```

---

## 11. SENSITIVITY ANALYSIS

**Which input dominates uncertainty?**

```
S_i = (∂f/∂xᵢ)² × σᵢ² / σ_output²

S_i ≈ 1: Input dominates uncertainty
S_i ≈ 0: Input contributes little

→ Focus calibration on high-S inputs
```

---

## 12. COMMON MISTAKES

| Mistake | Correction |
|---------|------------|
| "About 400" | 400 ± 80 (95% CI) |
| "400-500 range" | 450 ± 50 (95% CI) |
| "Approximately 400" | 400 ± X (state X) |
| Ignoring correlation | Include ρ term |
| Over-precision | Round to uncertainty |

---

## 13. ENFORCEMENT

```
HARD RULE: M(x) ≥ 0.60 required

M(x) = (U + D + E + V) / 4

WHERE:
U = Uncertainty coverage (outputs have ± bounds)
D = Dimensional consistency (units verified)
E = Evolution compliance (formulas calibrated)
V = Verification coverage (proofs provided)

IF M(x) < 0.60 → Ω(x) FORCED to 0 → BLOCKED
```

---

**A NUMBER WITHOUT UNCERTAINTY IS A LIE.**
