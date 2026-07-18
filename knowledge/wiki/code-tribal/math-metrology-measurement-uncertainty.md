---
schema: ideablock-v1
title: "Metrology & measurement uncertainty — the GUM framework, gauge R&R, conformance decision rules"
domain: "Manufacturing metrology"
category: manufacturing-math
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - JCGM 100:2008 (GUM — Guide to the expression of Uncertainty in Measurement)
  - ISO 14253-1 (decision rules for conformance with specification)
  - AIAG MSA 4th edition (gauge R&R)
  - ISO/IEC 17025 (calibration & test traceability)
  - Machinery's Handbook 31e — Inspection & Measurement
extracted_via: human-authored
extracted_at: 2026-05-21T19:30:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-METROLOGY)
---

## Question

Every inspected dimension carries an uncertainty. How do you evaluate each
component, combine them correctly, expand to a confidence interval, and turn
the result into a conformance decision — the complete measurement-uncertainty
math, with the decision rule.

## Answer (canonical — a measured value without an uncertainty is not a measurement)

### 1. The measurement model & the uncertainty budget

The measurand `y` is a function of input quantities:
```
y = f(x₁, x₂, …, xₙ)
```
Each input `xᵢ` carries a **standard uncertainty** `u(xᵢ)` (always expressed as
a standard deviation, k=1). The list of all `u(xᵢ)` with their type, value and
degrees of freedom is the **uncertainty budget** — the audit trail of the result.

### 2. Type A vs Type B evaluation

- **Type A** — statistical, from `n` repeated observations. The standard
  uncertainty is the standard deviation *of the mean*:
  ```
  u = s / √n           ν = n − 1   degrees of freedom
  ```
- **Type B** — from any other knowledge (calibration certificate, instrument
  spec, resolution, handbook). Convert the stated limits to a standard
  uncertainty by the assumed distribution:
  ```
  Rectangular (half-width a):   u = a / √3       (spec limits, unknown shape)
  Triangular  (half-width a):   u = a / √6       (value most likely central)
  U-shaped    (half-width a):   u = a / √2       (thermal cycling, sine drift)
  Digital resolution δ:         u = δ / (2√3)    (rounding, rectangular over ±δ/2)
  Cal cert giving U at k=2:     u = U / 2        (un-expand the certificate)
  ```

### 3. Combined standard uncertainty — the law of propagation

```
u_c(y)² = Σᵢ cᵢ² · u(xᵢ)²   +   2 ΣᵢΣⱼ>ᵢ cᵢ cⱼ · u(xᵢ,xⱼ)
```
where the **sensitivity coefficient** `cᵢ = ∂f/∂xᵢ` and `u(xᵢ,xⱼ)` is the
covariance. For **uncorrelated** inputs the cross term vanishes — it is the
root-sum-square (RSS) of the `cᵢ·u(xᵢ)` terms. Two shortcuts:
```
pure sum      y = Σ xᵢ      →  u_c² = Σ u(xᵢ)²
pure product  y = ∏ xᵢ      →  (u_c/y)² = Σ (u(xᵢ)/xᵢ)²     [relative form]
```

### 4. Expanded uncertainty & coverage

The reported interval is the **expanded uncertainty**:
```
U = k · u_c            result reported as  y ± U
```
`k` is the **coverage factor**. For an approximately normal result with large
effective degrees of freedom: `k = 2` → 95.45 %, `k = 2.576` → 99 %,
`k = 3` → 99.73 %. For small `ν_eff`, `k` is the Student-t value at `ν_eff`.

### 5. Welch–Satterthwaite — effective degrees of freedom

When Type A components have few observations, the combined result is not
quite normal; the effective degrees of freedom set the correct `t`:
```
ν_eff = u_c⁴ / Σᵢ ( cᵢ⁴ · u(xᵢ)⁴ / νᵢ )
```
Type B components are usually taken as `νᵢ = ∞` (they drop out of the sum).
Look up `k = t(ν_eff, 95 %)`; a small `ν_eff` inflates `k` above 2.

### 6. Gauge R&R — the variance decomposition (AIAG MSA)

The observed part-to-part spread is contaminated by the measurement system:
```
σ²_total = σ²_part + σ²_GRR
σ²_GRR   = σ²_repeatability (EV, equipment) + σ²_reproducibility (AV, appraiser)
```
Acceptance on the **%GRR** ratio and the **number of distinct categories**:
```
%GRR = σ_GRR / σ_total            < 10 % accept · 10–30 % marginal · > 30 % reject
ndc  = 1.41 · (σ_part / σ_GRR)    want ndc ≥ 5  (the gauge resolves ≥5 part bins)
```
ANOVA is preferred over the older average-and-range method because it alone
estimates the appraiser×part **interaction**.

### 7. The conformance decision rule & guard-banding (ISO 14253-1)

A measured value near a spec limit is ambiguous — the true value could be on
either side by up to `U`. ISO 14253-1 default (stringent) rule shrinks the
acceptance zone by the uncertainty:
```
PROVEN conforming   ⇔   LSL + U  ≤  measured  ≤  USL − U
PROVEN nonconforming ⇔  measured < LSL − U   or   measured > USL + U
otherwise            →  indeterminate (uncertainty straddles the limit)
```
The shrink `g = U` is the **guard band**. A *relaxed* rule (acceptance =
spec + U) widens acceptance and shifts risk from producer to consumer — only
by explicit agreement. The choice trades **producer's risk** (scrapping good
parts) against **consumer's risk** (passing bad parts).

### 8. Traceability & the test-uncertainty ratio

A gauge is only as good as its calibration chain back to a national standard.
The **test-uncertainty ratio** gates gauge selection:
```
TUR = tolerance / (2 · U_gauge)            want TUR ≥ 4 : 1
```
A 4:1 TUR keeps the measurement-induced misclassification rate negligible; a
1:1 ratio means the gauge uncertainty alone fills the whole tolerance.

### 9. Worked example — a bored hole Ø25.000 ±0.013 mm

Budget for the diameter measurement at 22 °C:
```
repeatability (Type A, n=10):  s/√n = 0.0030/√10 = 0.95 µm   ν=9
indicator resolution 1 µm:     1/(2√3)            = 0.29 µm   ν=∞
ring-gauge cal cert U=0.8µm:   0.8/2              = 0.40 µm   ν=∞
thermal (ΔT≈2°C, see note):    a/√3, a=0.59µm     = 0.34 µm   ν=∞
u_c = √(0.95² + 0.29² + 0.40² + 0.34²)            = 1.13 µm
ν_eff ≈ huge (Type A term modest) → k = 2
U = 2 · 1.13                                       = 2.3 µm
```
Acceptance zone: `[25.000 − 0.013 + 0.0023, 25.000 + 0.013 − 0.0023]` =
`Ø24.9893 … 25.0107`. TUR = 26 µm / (2·2.3 µm) ≈ 5.7 : 1 — adequate.
*Thermal note:* the `a` half-width comes from differential expansion of part
vs gauge over ΔT; use the canonical per-material expansion coefficient from
the PRISM material DB (`src/physics/constants.ts`) — do not inline it.

## Anti-patterns

- **Reporting a measured value with no uncertainty** — it is then not a
  measurement, just a number; conformance cannot be decided.
- **RSS-combining correlated components** — shared error sources (one thermal
  drift feeding two readings) need the covariance term, or the budget is wrong.
- **Using k = 2 when ν_eff is small** — a 3-observation Type A term needs the
  Student-t factor; k=2 then understates the interval.
- **Guard-banding the wrong way** — accepting `spec + U` silently passes
  borderline-bad parts; that is the relaxed rule and needs explicit agreement.
- **Ignoring the 20 °C reference temperature** — measuring warm parts and not
  correcting is one of the largest hidden budget terms on big steel work.
- **Least-squares form fit where Y14.5.1 mandates minimum-zone** — LSQ
  over-reports form error; use the minimum-zone (Chebyshev) fit. PRISM ships
  this as `MinimumZoneFitEngine` → `prism_calc:minimum_zone_fit`.
- **TUR below 4:1** — the gauge then consumes most of the tolerance and the
  measurement decision is dominated by measurement noise.

## Cross-references

- [[math-statistical-methods-spc-doe-capability]] — gauge R&R ANOVA, Cp/Cpk; the process-statistics companion to this measurement-statistics entry
- [[math-cad-geometry-nurbs-gdt]] — GD&T form tolerances whose evaluation this uncertainty math wraps
- [[math-machine-domains-dynamics-kinematics-accuracy]] — Abbe error & the 21-component volumetric model: machine-side uncertainty sources
- [[math-engineering-mechanics-of-materials]] — elastic deflection of the part under probe force, another budget term
- [[prism-invention-high-roi-engine-ideas]] — invention A2 `MinimumZoneFitEngine` computes the Y14.5.1-correct form error this budget then expands

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-METROLOGY — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). It is the **measurement-science** depth layer the original
9 math-* entries lacked: `math-statistical-methods-spc-doe-capability` covers
*process* statistics, this covers *measurement* statistics (GUM). Confidence
0.97 — every formula is canonical GUM / ISO 14253-1 / AIAG MSA.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `measurement uncertainty`,
`GUM`, `expanded uncertainty`, `coverage factor`, `gauge R&R`, `guard band`,
`conformance decision`, `traceability`, `TUR`, `Welch-Satterthwaite`,
`uncertainty budget` keywords. Zero new wiring required.
