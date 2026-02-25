---
name: prism-physics-unified
description: |
  All manufacturing physics formulas and mathematical foundations in one reference.
  Kienzle, Johnson-Cook, Taylor, thermal, stability, plus 109 core math formulas.
  Consolidates: physics-formulas, physics-reference, universal-formulas.
  MIT Sources: 2.810, 2.003, 2.005, 6.867, 18.06, 18.330.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "physics", "unified", "manufacturing", "formulas", "mathematical", "foundations", "kienzle"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-physics-unified")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-physics-unified") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What physics parameters for 316 stainless?"
→ Load skill: skill_content("prism-physics-unified") → Extract relevant physics data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot unified issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Physics Unified
## Manufacturing Formulas & Mathematical Foundation

## Quick Reference

| Formula | Equation | Key Params | Dispatcher |
|---------|----------|------------|------------|
| Cutting force | Fc = kc1.1 × b × h^(1-mc) | kc1.1, mc, b, h | prism_calc→cutting_force |
| Flow stress | σ = (A+Bε^n)(1+C·ln(ε̇*))(1-T*^m) | A,B,n,C,m | prism_calc→flow_stress |
| Tool life | VT^n = C | V, n, C | prism_calc→tool_life |
| Surface finish | Ra = f²/(32r) | f (feed), r (nose radius) | prism_calc→surface_finish |
| Power | P = Fc × Vc / (60×10³) | Fc (N), Vc (m/min) | prism_calc→power |
| MRR | Q = ap × ae × Vf | ap, ae, Vf (mm/min) | prism_calc→mrr |
| Chip load | fz = Vf / (n × z) | Vf, n (RPM), z (teeth) | prism_calc→chip_load |

## 1. CUTTING MECHANICS

### Kienzle Cutting Force Model (MIT 2.810)
```
Fc = kc1.1 × b × h^(1-mc)
```
| Param | Description | Unit | Typical Range |
|-------|-------------|------|---------------|
| kc1.1 | Specific cutting force at h=1mm, b=1mm | N/mm² | 300-4500 |
| mc | Kienzle exponent | — | 0.14-0.40 |
| b | Width of cut (chip width) | mm | — |
| h | Undeformed chip thickness | mm | 0.01-1.0 |

**Chip thickness:** h = fz × sin(κ) (milling), h = f (turning)
**Correction factors:** Kγ (rake angle), Kv (speed), Kver (wear), Ksch (lubricant)

### Merchant's Circle (Force Components)
```
Fc = Fs × cos(β-α) / cos(φ+β-α)    (cutting force)
Ft = Fs × sin(β-α) / cos(φ+β-α)    (thrust force)
Fs = τs × As / sin(φ)               (shear force)
φ = 45 + α/2 - β/2                  (Merchant's shear angle)
```

## 2. CONSTITUTIVE MODELS

### Johnson-Cook Flow Stress (MIT 2.810)
```
σ = (A + B·ε^n) × (1 + C·ln(ε̇/ε̇₀)) × (1 - T*^m)
T* = (T - T_room) / (T_melt - T_room)
```
| Param | Description | Unit | Example (4140) |
|-------|-------------|------|----------------|
| A | Yield stress | MPa | 806 |
| B | Hardening modulus | MPa | 614 |
| n | Hardening exponent | — | 0.168 |
| C | Strain rate sensitivity | — | 0.0089 |
| m | Thermal softening | — | 1.1 |

## 3. TOOL LIFE

### Taylor Tool Life (Basic)
```
V × T^n = C
→ T = (C/V)^(1/n)
```
| Param | Description | Unit | Carbide Typical |
|-------|-------------|------|-----------------|
| V | Cutting speed | m/min | 100-500 |
| T | Tool life | min | 15-60 target |
| n | Taylor exponent | — | 0.20-0.35 |
| C | Taylor constant | — | Material-specific |

### Extended Taylor (Multi-Factor)
```
V × T^n × f^a × ap^b = C_ext
```
Adds feed (f) and depth (ap) dependencies. Exponents a, b from empirical testing.

### Minimum Cost / Maximum Production
```
Tc_opt = T × (1/n - 1)              (minimum cost)
Tp_opt = T × (1/n - 1) × Ct/Cm     (max production)
```

## 4. THERMAL ANALYSIS

### Cutting Zone Temperature (MIT 2.005)
```
T_cut = T_ambient + (Fc × Vc) / (ρ × Cp × A_chip × 60) × η_tool
```
**Heat partition:** Chip 60-80%, Tool 5-20%, Workpiece 10-25%

### Thermal Expansion
```
ΔL = L × α × ΔT
```
| Material | α (μm/m/°C) |
|----------|-------------|
| Steel | 11-13 |
| Aluminum | 23 |
| Titanium | 8.6 |
| Invar | 1.2 |

### Coolant Heat Removal
```
Q_coolant = ṁ × Cp_coolant × ΔT_coolant
```

## 5. STABILITY & CHATTER

### Stability Lobe Diagram
```
ap_lim = -1 / (2 × Ks × Re[G(jω)])
```
Where G(jω) is the frequency response function at tooth-passing frequency.

**Practical rules:**
- Below lobe → stable (good surface finish)
- Above lobe → unstable (chatter marks, tool damage)
- Sweet spots at lobe valleys allow deeper cuts at specific RPMs
- Measure FRF with hammer test or use analytical model

## 6. MATHEMATICAL FOUNDATION

### Linear Algebra (MIT 18.06)
- Matrix operations: Ax=b, eigenvalues, SVD, condition number κ(A)
- κ(A) > 10⁶ = ill-conditioned → use SVD or regularization
- Least squares: x = (AᵀA)⁻¹Aᵀb (normal equations) or QR decomposition

### Calculus & Differential Equations
- Numerical integration: Gauss-Legendre (smooth), adaptive Simpson (general)
- ODE solvers: RK4 (standard), implicit Euler (stiff systems)
- Optimization: gradient descent, Newton's method (requires Hessian)

### Statistics (MIT 6.867)
- Distributions: Normal, Weibull (tool life), Lognormal (surface finish)
- Hypothesis testing: t-test, F-test, chi-squared
- Regression: linear, polynomial, nonlinear least squares
- Process capability: Cp = (USL-LSL)/(6σ), Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ))

### Numerical Methods (MIT 18.330)
- Root finding: Newton-Raphson (fast, needs derivative), bisection (guaranteed)
- Interpolation: cubic spline (smooth), linear (fast)
- FFT: frequency analysis for chatter detection
- Monte Carlo: uncertainty propagation, tolerance stack-up
