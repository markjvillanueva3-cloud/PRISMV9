# PRISM UNCERTAINTY PROPAGATION SKILL v1.0
## Codename: UNCERT-PROP
## Level: 0 (Always-On - No Bare Numbers Ever)
## Triggers: ALL calculations, ALL estimates, ALL outputs

---

# CORE AXIOM

> **"A number without uncertainty is a lie pretending to be truth."**

COMMANDMENT 5: NEVER bare numbers. Always value ± error (confidence%).

---

# OUTPUT FORMAT (MANDATORY)

```
[VALUE] ± [UNCERTAINTY] [UNIT] ([CONFIDENCE]% CI)

EXAMPLES:
  ✓ 412 ± 85 tool calls (95% CI)
  ✓ 27.3 ± 5.5 minutes (95% CI)
  ✓ 0.847 ± 0.023 coverage (95% CI)
  ✓ 1,540 ± 0 materials (exact count)
  
  ✗ 412 tool calls              ← NO UNCERTAINTY
  ✗ About 400 calls             ← VAGUE
  ✗ 412 ± 85 calls              ← NO CONFIDENCE LEVEL
```

---

# ERROR PROPAGATION RULES

```
ADDITION/SUBTRACTION: z = x + y or z = x - y
  σ_z = √(σ_x² + σ_y²)

MULTIPLICATION: z = x × y
  σ_z/z = √[(σ_x/x)² + (σ_y/y)²]

DIVISION: z = x / y
  σ_z/z = √[(σ_x/x)² + (σ_y/y)²]

POWER: z = xⁿ
  σ_z/z = |n| × (σ_x/x)

EXPONENTIAL: z = e^x
  σ_z = z × σ_x

LOGARITHM: z = ln(x)
  σ_z = σ_x / x
```

---

# CONFIDENCE LEVELS

| Level | Z-score | Use |
|-------|---------|-----|
| 68% | 1.0 | One sigma |
| 90% | 1.645 | Quick estimates |
| 95% | 1.96 | Standard scientific |
| 99% | 2.576 | High confidence |
| 99.7% | 3.0 | "Three sigma" |

**PRISM DEFAULT: 95% CI**

---

# CONVERTING CONFIDENCE LEVELS

```
CI_new = CI_68 × (Z_new / 1.0)

EXAMPLE:
  Given: 412 ± 85 (68% CI)
  Want: 95% CI
  CI_95 = 85 × 1.96 = 167
  Result: 412 ± 167 (95% CI)
```

---

# CHECKLIST BEFORE REPORTING ANY NUMBER

```
□ Is it a measurement or estimate? → Add uncertainty
□ Is it a calculation? → Propagate input uncertainties  
□ Is it an exact count? → State "exact" or identify error sources
□ Is confidence level stated?
□ Is precision appropriate (sig figs)?
□ Are units included?
```

---

**FULL DOCUMENTATION:** See C:\PRISM\skills\prism-uncertainty-propagation.md
