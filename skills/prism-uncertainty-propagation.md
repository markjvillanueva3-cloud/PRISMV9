# PRISM UNCERTAINTY PROPAGATION SKILL v1.0
## Codename: UNCERT-PROP
## Level: 0 (Always-On - No Bare Numbers Ever)
## Triggers: ALL calculations, ALL estimates, ALL outputs

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: CORE AXIOM
# ════════════════════════════════════════════════════════════════════════════════

> **"A number without uncertainty is a lie pretending to be truth."**

COMMANDMENT 5 states: NEVER bare numbers. Always value ± error (confidence%).

This skill enforces uncertainty on EVERY numerical output:
1. ALL estimates must have confidence intervals
2. ALL calculations must propagate input uncertainties
3. ALL predictions must state confidence level
4. ALL comparisons must account for overlapping uncertainties

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: UNCERTAINTY REPRESENTATION
# ════════════════════════════════════════════════════════════════════════════════

## STANDARD FORMAT:

```
value ± uncertainty (confidence%)

EXAMPLES:
  412 ± 82 tool calls (95% CI)
  1,540 ± 0 materials (exact count)
  0.85 ± 0.05 (90% CI)
  27.3 ± 1.2 minutes (95% CI)
```

## MATHEMATICAL NOTATION:

```
x̄ ± σ_x (p%)

WHERE:
x̄ = Point estimate (mean, median, or most likely value)
σ_x = Uncertainty (standard error, half-width of CI)
p = Confidence level (typically 90%, 95%, or 99%)
```

## JSON REPRESENTATION:

```json
{
  "value": 412,
  "uncertainty": 82,
  "confidenceLevel": 0.95,
  "unit": "tool calls",
  "distribution": "normal",
  "lowerBound": 330,
  "upperBound": 494
}
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2: UNCERTAINTY SOURCES
# ════════════════════════════════════════════════════════════════════════════════

## SOURCE TAXONOMY:

```
1. MEASUREMENT UNCERTAINTY
   - Instrument precision
   - Sampling error
   - Human observation error
   
2. MODEL UNCERTAINTY
   - Formula approximation error
   - Coefficient estimation error
   - Missing variables
   
3. PARAMETER UNCERTAINTY
   - Coefficient confidence intervals
   - Input variable uncertainties
   - Prior distribution spread
   
4. ALEATORY UNCERTAINTY (inherent randomness)
   - Process variability
   - Natural variation
   - Stochastic behavior
   
5. EPISTEMIC UNCERTAINTY (lack of knowledge)
   - Unknown unknowns
   - Model limitations
   - Data gaps
```

## COMBINING UNCERTAINTIES:

```
TOTAL UNCERTAINTY (quadrature for independent sources):
σ_total = √(σ₁² + σ₂² + σ₃² + ...)

IF CORRELATED:
σ_total = √(Σᵢ σᵢ² + 2·Σᵢ<ⱼ ρᵢⱼ·σᵢ·σⱼ)

WHERE ρᵢⱼ = correlation coefficient between sources i and j
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: ERROR PROPAGATION RULES
# ════════════════════════════════════════════════════════════════════════════════

## ANALYTICAL PROPAGATION (for simple functions):

```
GIVEN: z = f(x, y) where x = x̄ ± σ_x, y = ȳ ± σ_y

GENERAL FORMULA:
σ_z = √[(∂f/∂x)²·σ_x² + (∂f/∂y)²·σ_y²]

SPECIFIC CASES:

1. ADDITION/SUBTRACTION: z = x + y or z = x - y
   σ_z = √(σ_x² + σ_y²)

2. MULTIPLICATION: z = x × y
   σ_z/z = √[(σ_x/x)² + (σ_y/y)²]
   (relative uncertainties add in quadrature)

3. DIVISION: z = x / y
   σ_z/z = √[(σ_x/x)² + (σ_y/y)²]

4. POWER: z = xⁿ
   σ_z/z = |n| × (σ_x/x)

5. EXPONENTIAL: z = e^x
   σ_z = z × σ_x

6. LOGARITHM: z = ln(x)
   σ_z = σ_x / x

7. PRODUCT OF MULTIPLE TERMS: z = a × x × y × ...
   σ_z/z = √[(σ_x/x)² + (σ_y/y)² + ...]
```

## EXAMPLE APPLICATION:

```
EFFORT(T) = Base × Complexity × Risk

GIVEN:
  Base = 176 ± 18 calls
  Complexity = 2.34 ± 0.35
  Risk = 1.0 ± 0.1

PROPAGATION (multiplication rule):
  EFFORT = 176 × 2.34 × 1.0 = 412 calls
  
  Relative uncertainties:
  σ_Base/Base = 18/176 = 0.102
  σ_Cmplx/Cmplx = 0.35/2.34 = 0.150
  σ_Risk/Risk = 0.1/1.0 = 0.100
  
  σ_EFFORT/EFFORT = √(0.102² + 0.150² + 0.100²) = 0.206
  σ_EFFORT = 0.206 × 412 = 85 calls

RESULT: EFFORT = 412 ± 85 calls (68% CI)
        Or: 412 ± 170 calls (95% CI, multiply by 2)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: MONTE CARLO UNCERTAINTY ESTIMATION
# ════════════════════════════════════════════════════════════════════════════════

## WHEN TO USE MONTE CARLO:

```
USE MONTE CARLO IF:
  - Function is complex (no simple analytical derivative)
  - Inputs have non-normal distributions
  - Correlations between inputs are significant
  - Multiple uncertainty sources interact
```

## MONTE CARLO ALGORITHM:

```python
def monte_carlo_uncertainty(func, inputs, n_samples=10000):
    """
    inputs: dict of {name: {'mean': μ, 'std': σ, 'dist': 'normal'}}
    """
    results = []
    
    for _ in range(n_samples):
        # Sample each input from its distribution
        sampled_inputs = {}
        for name, params in inputs.items():
            if params['dist'] == 'normal':
                sampled_inputs[name] = np.random.normal(
                    params['mean'], params['std']
                )
            elif params['dist'] == 'uniform':
                sampled_inputs[name] = np.random.uniform(
                    params['low'], params['high']
                )
            # Add more distributions as needed
        
        # Evaluate function
        result = func(**sampled_inputs)
        results.append(result)
    
    # Compute statistics
    mean = np.mean(results)
    std = np.std(results)
    ci_95 = np.percentile(results, [2.5, 97.5])
    
    return {
        'mean': mean,
        'std': std,
        'ci_95_lower': ci_95[0],
        'ci_95_upper': ci_95[1]
    }
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: CONFIDENCE LEVELS
# ════════════════════════════════════════════════════════════════════════════════

## STANDARD CONFIDENCE LEVELS:

```
┌──────────────┬─────────────────┬──────────────────────────────┐
│ Confidence   │ Z-score (normal)│ Interpretation               │
├──────────────┼─────────────────┼──────────────────────────────┤
│ 68%          │ 1.0             │ One standard deviation       │
│ 90%          │ 1.645           │ Common for estimates         │
│ 95%          │ 1.96            │ Standard scientific          │
│ 99%          │ 2.576           │ High confidence              │
│ 99.7%        │ 3.0             │ "Three sigma"                │
│ 99.9%        │ 3.29            │ Very high confidence         │
└──────────────┴─────────────────┴──────────────────────────────┘
```

## PRISM DEFAULTS:

```
TASK TYPE                 DEFAULT CONFIDENCE LEVEL
─────────────────────────────────────────────────
Effort estimates          95%
Time estimates            90%
Material properties       95%
Cutting parameters        95%
Safety-critical values    99%
Quick estimates           90%
```

## CONVERTING BETWEEN CONFIDENCE LEVELS:

```
CI_new = CI_68 × (Z_new / 1.0)

EXAMPLE:
  Given: 412 ± 85 (68% CI)
  Want: 95% CI
  
  CI_95 = 85 × (1.96 / 1.0) = 167
  Result: 412 ± 167 (95% CI)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: SIGNIFICANT FIGURES
# ════════════════════════════════════════════════════════════════════════════════

## RULES:

```
1. Uncertainty determines precision of reported value
   - Report value to same decimal place as uncertainty
   
2. Uncertainty typically has 1-2 significant figures
   - Round uncertainty to 1-2 sig figs
   - Then round value to match
   
3. Never report more precision than uncertainty justifies

EXAMPLES:
  ✗ 412.3847 ± 85.2341 (too many decimals)
  ✓ 412 ± 85 (appropriate precision)
  
  ✗ 3.14159265 ± 0.00023 (value too precise)
  ✓ 3.1416 ± 0.0002 (matched precision)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: COMPARISON WITH UNCERTAINTY
# ════════════════════════════════════════════════════════════════════════════════

## WHEN COMPARING VALUES WITH UNCERTAINTY:

```
GIVEN: A = a ± σ_a, B = b ± σ_b

DIFFERENCE:
D = A - B = (a - b) ± √(σ_a² + σ_b²)

SIGNIFICANCE TEST:
z = |a - b| / √(σ_a² + σ_b²)

INTERPRETATION:
  z < 1.96: Not significantly different (95% level)
  z ≥ 1.96: Significantly different (95% level)
  z ≥ 2.58: Highly significantly different (99% level)
```

## OVERLAP TEST:

```
INTERVALS OVERLAP IF:
  (a - 2σ_a) < (b + 2σ_b) AND (b - 2σ_b) < (a + 2σ_a)

IF OVERLAP: Values are statistically indistinguishable
IF NO OVERLAP: Values are significantly different
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: UNCERTAINTY FOR COUNTS AND EXACT VALUES
# ════════════════════════════════════════════════════════════════════════════════

## EXACT COUNTS:

```
WHEN value is an exact count (no measurement error):
  - Uncertainty = 0
  - Report as: n = 1,540 ± 0 materials (exact)
  
BUT if count has potential errors:
  - Missing items: n = 1,540 ± 5 materials (estimated ±5 may be missing)
```

## POISSON UNCERTAINTY (for counts):

```
IF counting events/items with inherent randomness:
σ = √n

EXAMPLE:
  Observed: 100 defects
  Uncertainty: √100 = 10
  Report: 100 ± 10 defects (Poisson)
```

## BINOMIAL UNCERTAINTY (for proportions):

```
IF measuring proportion p from n samples:
σ_p = √[p(1-p)/n]

EXAMPLE:
  Observed: 85 successes out of 100 trials
  p = 0.85
  σ_p = √[0.85 × 0.15 / 100] = 0.036
  Report: 0.85 ± 0.04 (or 85% ± 4%)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: ENFORCEMENT CHECKLIST
# ════════════════════════════════════════════════════════════════════════════════

## BEFORE REPORTING ANY NUMBER:

```
□ Is it a measurement or estimate? → Add uncertainty
□ Is it a calculation? → Propagate input uncertainties
□ Is it an exact count? → State "exact" or identify potential error sources
□ Is confidence level stated?
□ Is precision appropriate (sig figs)?
□ Are units included?
```

## OUTPUT TEMPLATE:

```
VALUE ± UNCERTAINTY UNIT (CONFIDENCE%)

EXAMPLES:
  Effort: 412 ± 85 tool calls (95% CI)
  Time: 27.3 ± 5.5 minutes (95% CI)
  Coverage: 0.847 ± 0.023 (95% CI)
  Count: 1,540 ± 0 materials (exact)
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: SENSITIVITY ANALYSIS
# ════════════════════════════════════════════════════════════════════════════════

## IDENTIFY DOMINANT UNCERTAINTY SOURCES:

```
SENSITIVITY INDEX (for each input):
S_i = (∂f/∂xᵢ)² × σᵢ² / σ_output²

INTERPRETATION:
S_i ≈ 1: This input dominates uncertainty
S_i ≈ 0: This input contributes little

USE: Focus calibration efforts on high-S inputs
```

## TORNADO DIAGRAM:

```
For output z = f(x₁, x₂, x₃, ...):

COMPUTE for each input:
  z_high = f(..., xᵢ + σᵢ, ...)
  z_low = f(..., xᵢ - σᵢ, ...)
  swing_i = z_high - z_low

RANK by |swing_i| descending

DISPLAY:
  Input 3: ████████████████ (largest swing)
  Input 1: ██████████       (medium swing)
  Input 2: ███              (smallest swing)
```

---

**UNCERTAINTY IS NOT A WEAKNESS—IT'S HONESTY.**

**Version:** 1.0 | **Created:** 2026-01-26 | **Author:** PRISM Development
