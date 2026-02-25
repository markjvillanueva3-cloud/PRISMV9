---
name: prism-doe-manufacturing
description: |
  Design of Experiments for CNC manufacturing process optimization.
  Full factorial, fractional factorial, Taguchi, and Response Surface Methodology.
  Factor screening, interaction analysis, and process optimization.
  
  Functions: doe_full_factorial, doe_fractional, doe_taguchi_l9, doe_taguchi_l18,
  rsm_ccd, rsm_box_behnken, doe_analyze_effects, doe_optimal_settings,
  doe_confirmation_run, signal_to_noise_ratio
  
  Academic Source: MIT 2.830J, Montgomery DOE, Taguchi Methods
  Total: ~400 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "doe", "manufacturing", "design", "experiments", "process", "optimization", "full"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-doe-manufacturing")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-doe-manufacturing") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What doe parameters for 316 stainless?"
→ Load skill: skill_content("prism-doe-manufacturing") → Extract relevant doe data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot manufacturing issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM DESIGN OF EXPERIMENTS (DOE) FOR MANUFACTURING
## Systematic Process Optimization for CNC Operations

# 1. DOE FUNDAMENTALS FOR CNC

## 1.1 Common CNC Factors and Levels

| Factor | Symbol | Typical Low (-1) | Typical High (+1) | Units |
|--------|--------|-------------------|--------------------|-------|
| Cutting speed | Vc | 80% of nominal | 120% of nominal | m/min |
| Feed rate | f | 0.08 | 0.20 | mm/rev |
| Depth of cut | ap | 0.5 | 2.0 | mm |
| Width of cut | ae | 25% D | 75% D | mm |
| Coolant pressure | Pc | 20 | 70 | bar |
| Tool nose radius | r_eps | 0.4 | 1.2 | mm |
| Rake angle | γ | -6 | +6 | degrees |
| Overhang ratio | L/D | 3 | 6 | - |

## 1.2 Common CNC Responses

- Surface roughness Ra (μm) — minimize
- Tool life T (min) — maximize
- Material removal rate MRR (cm³/min) — maximize
- Cutting force Fc (N) — minimize
- Dimensional accuracy (mm) — minimize deviation
- Power consumption P (kW) — minimize
- Cycle time t (sec) — minimize

# 2. FULL FACTORIAL DESIGNS

## 2.1 2^k Designs

For k factors at 2 levels each:
```
Runs required: 2^k
  2 factors: 4 runs
  3 factors: 8 runs (most common for CNC screening)
  4 factors: 16 runs
  5 factors: 32 runs (usually too many — use fractional)
```

## 2.2 Coding Convention

```
x_coded = (X_natural - X_center) / (X_range / 2)

Example: Speed Vc from 100 to 200 m/min
  Center = 150, Half-range = 50
  x = (Vc - 150) / 50
  Vc = 100 → x = -1
  Vc = 200 → x = +1
```

## 2.3 Effect Calculation

For a 2³ design (factors A, B, C):
```
Main effect of A:
  E_A = (1/4) * [a + ab + ac + abc - (1) - b - c - bc]

Interaction AB:
  E_AB = (1/4) * [(1) - a - b + ab + c - ac - bc + abc]

Sum of Squares:
  SS_A = (n * 2^k / 4) * E_A²

where n = replicates per run
```

## 2.4 ANOVA Table Structure

```
Source    | df      | SS     | MS       | F        | p-value
----------|---------|--------|----------|----------|--------
A         | 1       | SS_A   | SS_A/1   | MS_A/MSE | 
B         | 1       | SS_B   | SS_B/1   | MS_B/MSE |
AB        | 1       | SS_AB  | SS_AB/1  | MS_AB/MSE|
Error     | 2^k(n-1)| SS_E   | SS_E/dfE |          |
Total     | N-1     | SS_T   |          |          |

Significant if p < 0.05 (or F > F_critical)
```

# 3. FRACTIONAL FACTORIAL DESIGNS

When full factorial has too many runs, use 2^(k-p) fractional designs.

## 3.1 Common Fractions for CNC

| Design | Factors | Runs | Resolution | Use Case |
|--------|---------|------|------------|----------|
| 2^(3-1) | 3 | 4 | III | Quick screening, no interactions |
| 2^(4-1) | 4 | 8 | IV | Good screening, main + 2FI |
| 2^(5-1) | 5 | 16 | V | Full resolution for 5 factors |
| 2^(5-2) | 5 | 8 | III | Screening only |
| 2^(6-2) | 6 | 16 | IV | Screening 6 CNC parameters |
| 2^(7-3) | 7 | 16 | IV | Large screening study |

## 3.2 Resolution Meanings

- **Resolution III:** Main effects aliased with 2-factor interactions. Screening only.
- **Resolution IV:** Main effects clear of 2FI. 2FI aliased with each other.
- **Resolution V:** Main effects and 2FI all estimable independently.

## 3.3 Generator and Alias Structure

```
2^(4-1) with generator D = ABC (Resolution IV):
  I = ABCD (defining relation)
  
  Aliases:
  A = BCD    B = ACD    C = ABD    D = ABC
  AB = CD    AC = BD    AD = BC
  
  Main effects confounded with 3FI (negligible).
  2FI confounded with other 2FI (must interpret carefully).
```

# 4. TAGUCHI METHODS

## 4.1 Standard Orthogonal Arrays

**L9 (3^4):** 4 factors, 3 levels, 9 runs
```
Run | A | B | C | D
----|---|---|---|---
 1  | 1 | 1 | 1 | 1
 2  | 1 | 2 | 2 | 2
 3  | 1 | 3 | 3 | 3
 4  | 2 | 1 | 2 | 3
 5  | 2 | 2 | 3 | 1
 6  | 2 | 3 | 1 | 2
 7  | 3 | 1 | 3 | 2
 8  | 3 | 2 | 1 | 3
 9  | 3 | 3 | 2 | 1
```

**L18 (2^1 × 3^7):** 8 factors (1 at 2 levels, 7 at 3 levels), 18 runs. Ideal for CNC with many factors.

## 4.2 Signal-to-Noise Ratios

**Smaller-is-better** (Ra, force, deviation):
```
S/N = -10 * log10((1/n) * Σ yi²)
```

**Larger-is-better** (tool life, MRR):
```
S/N = -10 * log10((1/n) * Σ (1/yi²))
```

**Nominal-is-best** (dimension targeting):
```
S/N = 10 * log10(ȳ² / s²)
```

## 4.3 Optimal Level Selection

For each factor, compute mean S/N at each level. Select the level with highest S/N (all three types: higher S/N = better).

```
Example: Factor A (cutting speed) at 3 levels
  Level 1: S/N_avg = 28.3 dB
  Level 2: S/N_avg = 31.7 dB  ← optimal
  Level 3: S/N_avg = 29.1 dB
  
  Delta = 31.7 - 28.3 = 3.4 dB (rank factors by delta)
```

# 5. RESPONSE SURFACE METHODOLOGY (RSM)

## 5.1 Central Composite Design (CCD)

For 2 or 3 factors after screening identifies the critical few.

```
CCD structure for k factors:
  Factorial points: 2^k (corners)
  Axial (star) points: 2k (along axes at ±α)
  Center points: nc (typically 3-6)
  Total runs: 2^k + 2k + nc

For k=2: 4 + 4 + 5 = 13 runs
For k=3: 8 + 6 + 6 = 20 runs

α = (2^k)^(1/4)  for rotatability
  k=2: α = 1.414
  k=3: α = 1.682
```

## 5.2 Second-Order Model

```
y = β₀ + Σ βᵢxᵢ + Σ βᵢᵢxᵢ² + Σ βᵢⱼxᵢxⱼ + ε

For 2 factors (speed, feed):
  Ra = β₀ + β₁(Vc) + β₂(f) + β₁₁(Vc²) + β₂₂(f²) + β₁₂(Vc·f) + ε

Coefficients estimated via least squares:
  β = (X'X)⁻¹ X'y
```

## 5.3 Box-Behnken Design

Alternative to CCD — no extreme corner/axial points. Better when factor extremes are dangerous (e.g., very high speed + high DOC might crash the tool).

```
For k=3: 12 factorial + 3 center = 15 runs (vs 20 for CCD)
No runs where all factors are simultaneously at extremes.
```

## 5.4 Optimization

**Desirability function** for multiple responses:
```
d_i = ((y_i - L_i) / (T_i - L_i))^s   for L < y < T (minimize)
d_i = ((U_i - y_i) / (U_i - T_i))^s   for T < y < U (maximize)

Overall desirability:
  D = (d₁^w₁ · d₂^w₂ · ... · dₖ^wₖ)^(1/Σwᵢ)
```

Maximize D over the factor space using numerical optimization (e.g., gradient descent on the fitted response surfaces).

# 6. ANALYSIS OF EFFECTS

## 6.1 Pareto Chart of Effects

Rank all effects by |t-value| or |effect magnitude|. Effects above the significance line (Bonferroni-adjusted α/m) are active.

## 6.2 Normal Probability Plot

Plot ordered effects against normal quantiles. Active effects deviate from the straight line. Especially useful when no replication (all df used for effects, none for error).

**Lenth's method** for unreplicated factorials:
```
s₀ = 1.5 × median(|effects|)
PSE = 1.5 × median(|effects| : |effect| < 2.5·s₀)
ME = t(α/2m, df) × PSE

Effects with |effect| > ME are significant.
```

# 7. CNC PROCESS OPTIMIZATION EXAMPLES

## 7.1 Turning Surface Finish Optimization

**Setup:** L9 Taguchi, factors: Vc (120/160/200), f (0.08/0.12/0.16), ap (0.5/1.0/1.5)
**Response:** Ra (smaller-is-better)

Typical findings for steel turning:
- Feed rate f is dominant (60-70% contribution)
- Speed Vc secondary (15-25%)
- Depth ap usually insignificant for Ra
- Optimal: highest Vc, lowest f, middle ap
- Predicted Ra ≈ f²/(8·r_eps) for theoretical minimum

## 7.2 Milling Tool Life Optimization

**Setup:** 2^(4-1) fractional factorial, factors: Vc, fz, ae, ap
**Response:** Tool life T (larger-is-better)

Typical findings:
- Vc dominates (exponential Taylor relationship)
- ae × ap interaction significant (total chip load)
- Sweet spot: moderate speed, optimize ae/ap ratio
- Confirmation run within 95% CI of prediction

## 7.3 Multi-Objective: MRR vs Ra vs Tool Life

Use CCD with 2 factors (Vc, f), fit second-order models for each response, then optimize desirability with weights:
```
  w_MRR = 0.3 (maximize)
  w_Ra = 0.4 (minimize) 
  w_T = 0.3 (maximize)
```

Contour overlay shows the feasible region where all constraints are met simultaneously.
