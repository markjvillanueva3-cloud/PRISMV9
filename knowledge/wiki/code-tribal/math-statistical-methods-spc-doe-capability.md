---
schema: ideablock-v1
title: "Statistical methods — SPC, process capability, DOE, regression, Monte Carlo for manufacturing"
domain: "Manufacturing statistics"
category: manufacturing-math
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - ISO 7870 (control charts) + ISO 22514 (process capability)
  - Montgomery "Introduction to Statistical Quality Control"
  - Montgomery "Design and Analysis of Experiments"
  - Western Electric Statistical Quality Control Handbook
  - Machinery's Handbook 31e §SPC §Process Capability
extracted_via: human-authored
extracted_at: 2026-05-21T14:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-STATISTICS)
---

## Question

The complete statistical toolkit for manufacturing — control charts, capability indices, DOE, regression, Monte Carlo — every formula, with the decision rule.

## Answer (canonical — measure variation, distinguish signal from noise, optimize, predict the distribution)

### 1. Control charts — X̄-R (variable data)

For subgroups of size `n`, sampled over time:
```
X̄ = mean of subgroup means      R̄ = mean of subgroup ranges
X̄ chart:  UCL/LCL = X̄ ± A₂·R̄
R chart:   UCL = D₄·R̄,  LCL = D₃·R̄
```
`A₂, D₃, D₄` are subgroup-size constants (n=5: A₂=0.577, D₃=0, D₄=2.114 — tabulated in ISO 7870). The estimate of process σ:
```
σ̂ = R̄ / d₂           [d₂ = 2.326 for n=5]
```
For individuals (n=1): X-MR chart, using the moving range `MR̄` and `σ̂ = MR̄/1.128`.

### 2. Out-of-control rules (Western Electric / Nelson)

A point outside ±3σ is the obvious signal. The pattern rules catch drift before it breaches:
1. 1 point beyond 3σ
2. 9 points same side of centerline
3. 6 points trending monotonically
4. 14 points alternating up/down
5. 2 of 3 beyond 2σ same side
6. 4 of 5 beyond 1σ same side
7. 15 points within 1σ (too good — gauge problem)
8. 8 points beyond 1σ either side

False-alarm rate of rule 1 alone: ~0.27 % per point. If rules fire > 1 %/point, the process is genuinely unstable.

### 3. Process capability

```
Cp  = (USL − LSL) / 6σ_within            [potential — ignores centering]
Cpk = min[(USL − μ)/3σ_within, (μ − LSL)/3σ_within]   [actual — includes centering]
Pp  = (USL − LSL) / 6σ_total             [performance — total variation]
Ppk = min[...] with σ_total
```
σ_within from R̄/d₂ (short-term); σ_total from all data (long-term, includes drift). Targets: Cpk 1.33 (4σ, industry standard), 1.67 (5σ, safety-critical), 2.0 (6σ). Cp > Cpk ⇒ off-center; Pp > Ppk or Cpk > Ppk ⇒ between-subgroup drift (thermal/wear). PPM defective ≈ from the normal tail: Cpk 1.33 → 63 PPM; 1.67 → 0.6 PPM.

### 4. Design of experiments (DOE)

**Full factorial** `2^k` — every combination of k factors at 2 levels. Estimates all main effects + all interactions. Cost: 2^k runs (k=5 → 32 runs).

**Fractional factorial** `2^(k−p)` — a 1/2^p fraction; aliases higher-order interactions with main effects. Resolution III/IV/V grades the aliasing. Use to screen many factors cheaply.

**Main effect** of factor A: `E_A = ȳ(A+) − ȳ(A−)` (mean response at high level minus low level).
**Interaction** AB: `E_AB = ½[(ȳ at A+B+ + ȳ at A−B−) − (ȳ at A+B− + ȳ at A−B+)]`.

**ANOVA** partitions total variation: `SS_total = SS_factors + SS_interactions + SS_error`. The F-statistic `F = MS_factor / MS_error`; if `F > F_crit(α, df)` the factor is significant.

**Taguchi** — orthogonal arrays (L8, L9, L18...) + the signal-to-noise ratio. For "nominal-is-best": `SN = 10·log(μ²/σ²)`. Maximize SN → robust to noise. **RSM** (response surface) fits a quadratic + finds the optimum via the stationary point of `ŷ = β₀ + Σβᵢxᵢ + Σβᵢⱼxᵢxⱼ + Σβᵢᵢxᵢ²`.

### 5. Regression

Linear least squares: minimize `Σ(yᵢ − ŷᵢ)²`. For `y = β₀ + β₁x`:
```
β₁ = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²        β₀ = ȳ − β₁x̄
R² = 1 − SS_res/SS_total               [fraction of variance explained]
```
Multiple regression: `β = (XᵀX)⁻¹Xᵀy` (the normal equations). Always check residuals — non-random residuals mean the model form is wrong. R² near 1 with bad residuals = overfit. Adjusted R² penalizes added terms.

### 6. Monte Carlo + uncertainty propagation

When inputs are distributions, the output is a distribution. Two methods:

**Analytical (first-order / RSS)** — for `y = f(x₁..xₙ)` with independent inputs:
```
σ_y² ≈ Σ (∂f/∂xᵢ)² · σ_xᵢ²
```
Exact for linear `f`; approximate for nonlinear.

**Monte Carlo** — sample each `xᵢ` from its distribution, evaluate `f`, repeat N=10⁴-10⁶, measure the empirical output distribution. Handles any `f`, any distribution, correlations. The honest method when `f` is nonlinear or inputs are non-normal. Convergence: the MC estimate's standard error ∝ `1/√N`.

### 7. Reliability / tool life — Weibull

Tool life + failure data fit a Weibull distribution better than normal:
```
F(t) = 1 − exp[ −(t/η)^β ]          [η scale, β shape]
```
β < 1 infant mortality; β = 1 random (exponential); β > 1 wear-out. Plot `ln(−ln(1−F))` vs `ln(t)` — Weibull data is linear, slope = β. MTBF for the exponential case = η. Tool-life data is wear-out (β > 1, typically 2-4).

### 8. Hypothesis testing — the decision frame

`H₀` (null) vs `H₁` (alternative). The p-value = P(observing this data | H₀ true). Reject H₀ if p < α (typ 0.05). Type-I error (α): reject a true H₀. Type-II (β): fail to reject a false H₀. Power = 1−β. For comparing two process means: the t-test; for variances: the F-test; for > 2 means: ANOVA.

### Anti-patterns

- **"Cpk = 1.33 means good."** It means 4σ (63 PPM). For flight-critical or implant, target 1.67-2.0. "Good" is spec-dependent.
- **"R² = 0.98 so the model is right."** Check residuals. High R² with patterned residuals = wrong model form, possibly overfit.
- **"More DOE runs = better."** Fractional factorial screens many factors cheaply; full factorial only when interactions matter. Match the design to the question.
- **"RSS uncertainty is exact."** RSS is first-order — exact only for linear `f` with independent normal inputs. Nonlinear or correlated → Monte Carlo.
- **"Control limits = spec limits."** No — control limits come from the *process* (±3σ of what it does); spec limits come from the *customer*. A process can be in-control (stable) and incapable (Cpk < 1) simultaneously.
- **"Fit tool life with a normal distribution."** Wear-out failure is Weibull (β > 1). The normal misestimates the tails — exactly where replacement decisions live.

### Tie-ins

- [[quality-first-article-inspection-and-spc-cadence]] — operational SPC + FAI
- [[part-setup-tolerance-stack-up-methods]] — RSS + Monte Carlo tolerance propagation
- [[math-speed-feed-the-full-physics]] — every speed/feed output is a distribution
- [[tooling-tool-life-and-wear-management]] — Weibull tool-life modeling
- [[machining-tactics-material-removal-economics]] — DOE to optimize the cost surface

## Provenance

Distilled from ISO 7870 + ISO 22514 + Montgomery "Statistical Quality Control" + Montgomery "Design and Analysis of Experiments" + Western Electric SQC Handbook + Machinery's Handbook 31e. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-STATISTICS — **49th canonical entry**, Phase-A mathematical expansion (statistical-methods domain). New `manufacturing-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `SPC`, `control chart`, `X-bar R`, `Cp Cpk Pp Ppk`, `process capability`, `DOE`, `design of experiments`, `factorial`, `ANOVA`, `Taguchi`, `RSM`, `regression`, `least squares`, `Monte Carlo`, `Weibull`, `hypothesis test`, `Western Electric rules` keywords. Zero new wiring required.

## Cross-references

- [[quality-first-article-inspection-and-spc-cadence]] — operational SPC + FAI
- [[part-setup-tolerance-stack-up-methods]] — RSS + Monte Carlo
- [[math-speed-feed-the-full-physics]] — distributions on every output
- [[tooling-tool-life-and-wear-management]] — Weibull tool life
- [[machining-tactics-material-removal-economics]] — DOE cost optimization
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
