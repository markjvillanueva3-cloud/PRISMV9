---
name: prism-physics-reference
description: |
  Manufacturing formulas and algorithms quick reference. Instant lookup for
  cutting mechanics, tool life, thermal analysis, and optimization.
  Validated from MIT/Stanford courses and manufacturing literature.
---

# PRISM Physics Reference Skill
## Manufacturing Formulas & Algorithms Quick Reference

---

## Purpose
**Instant formula lookup** for cutting mechanics, tool life, thermal analysis, and optimization. Derived from MIT/Stanford course material and validated manufacturing literature.

---

## 1. CUTTING FORCE MODELS

### 1.1 Kienzle Force Model (Primary)
```
Source: VDI 3323, MIT 2.810
Most reliable for general machining

Fc = kc × A = kc1.1 × h^(-mc) × b × h
   = kc1.1 × h^(1-mc) × b

Where:
  Fc  = Cutting force (N)
  kc  = Specific cutting force (N/mm²)
  kc1.1 = Unit specific cutting force at h=1mm, b=1mm
  h   = Chip thickness (mm) = f × sin(κr)
  b   = Width of cut (mm) = ap / sin(κr)
  mc  = Chip thickness exponent (0.15-0.40)
  κr  = Tool entering angle (degrees)
  f   = Feed rate (mm/rev)
  ap  = Depth of cut (mm)

Correction Factors:
  kc_corrected = kc1.1 × Kγ × Kv × KVB × Kλ × Kκ

  Kγ = 1 - (γ - γref)/100     (rake angle correction, ~1.5%/degree)
  Kv = (v/vref)^(-0.07)       (speed correction)
  KVB = 1 + 0.3 × VB/0.1      (wear correction, per 0.1mm VB)
  Kλ = varies                  (inclination angle)
  Kκ = varies                  (entering angle)
```

### 1.2 Merchant's Force Model (Orthogonal)
```
Source: MIT 2.810, Merchant 1945

For orthogonal cutting theory:

Fc = τs × Ac / (sin(φ) × cos(φ + β - γ))

Where:
  τs = Shear strength of material (MPa)
  Ac = Chip cross-section (mm²)
  φ  = Shear angle (degrees)
  β  = Friction angle = arctan(μ)
  γ  = Rake angle (degrees)
  μ  = Coefficient of friction

Shear Angle (Merchant):
  φ = 45° + γ/2 - β/2

Shear Angle (Lee-Shaffer):
  φ = 45° + γ - β

Chip Thickness Ratio:
  r = t/tc = sin(φ) / cos(φ - γ)
  
  Where:
    t  = Uncut chip thickness
    tc = Chip thickness
```

### 1.3 Extended Kienzle (3D Cutting)
```
Tangential Force:  Fc = kc1.1 × h^(1-mc) × b
Feed Force:        Ff = kf1.1 × h^(1-mf) × b  
Radial Force:      Fr = kr1.1 × h^(1-mr) × b

Typical ratios (for steel):
  Ff ≈ 0.35-0.50 × Fc
  Fr ≈ 0.25-0.35 × Fc

Total Force:
  F = √(Fc² + Ff² + Fr²)
```

---

## 2. TOOL LIFE MODELS

### 2.1 Taylor's Equation (Primary)
```
Source: F.W. Taylor 1907, MIT 2.810

Basic Form:
  V × T^n = C

Extended Taylor:
  V × T^n × f^a × ap^b = C_ext

Where:
  V   = Cutting speed (m/min)
  T   = Tool life (min)
  n   = Taylor exponent (material/tool dependent)
  C   = Taylor constant (speed for T=1 min)
  f   = Feed rate (mm/rev)
  ap  = Depth of cut (mm)
  a,b = Feed and depth exponents

Solving for Tool Life:
  T = (C/V)^(1/n)

Typical n values:
  HSS:             0.10-0.15
  Carbide uncoated: 0.20-0.28
  Carbide coated:   0.25-0.32
  Ceramic:          0.30-0.40
  CBN:              0.35-0.50
```

### 2.2 VB Wear Progression
```
Flank Wear Model:
  VB(t) = VB_i + K_w × V^a × f^b × t

Breakin-Steady-Rapid Model:
  VB(t) = { 
    Phase 1 (Breakin):  VB_0 + α×t^0.5      (t < t1)
    Phase 2 (Steady):   VB_1 + β×t          (t1 < t < t2)
    Phase 3 (Rapid):    VB_2 + γ×exp(δ×t)   (t > t2)
  }

Tool Life Criterion:
  T = time when VB reaches VB_max (typically 0.3-0.4 mm)
```

---

## 3. JOHNSON-COOK CONSTITUTIVE MODEL

### 3.1 Flow Stress Equation
```
Source: Johnson & Cook 1983, MIT 2.810

σ = [A + B×ε^n] × [1 + C×ln(ε̇*)] × [1 - T*^m]

Where:
  σ   = Flow stress (MPa)
  ε   = Equivalent plastic strain
  ε̇*  = Normalized strain rate = ε̇/ε̇_0
  T*  = Homologous temperature = (T - T_room)/(T_melt - T_room)
  
Parameters:
  A = Initial yield stress (MPa)
  B = Strain hardening coefficient (MPa)
  n = Strain hardening exponent
  C = Strain rate sensitivity coefficient
  m = Thermal softening exponent
  ε̇_0 = Reference strain rate (typically 1.0 s⁻¹)
```

### 3.2 Estimating J-C Parameters
```
From tensile test data:

A ≈ σ_y (yield strength at reference conditions)

B ≈ (σ_UTS - σ_y) / ε_u^n
  where ε_u = uniform strain ≈ n

n ≈ ln(σ_UTS/σ_y) / ln(ε_u)
  or from strain hardening curve fit

C ≈ 0.01-0.02 for most metals

m ≈ 0.8-1.2 for steels
```

---

## 4. THERMAL MODELS

### 4.1 Cutting Temperature
```
Source: MIT 2.810, Boothroyd

Average Chip Temperature:
  θ_chip = θ_amb + C_temp × V^a × f^b × ap^c

Typical values:
  C_temp = 300-400 (constant)
  a = 0.30-0.40
  b = 0.10-0.20
  c = 0.05-0.10

Heat Partition:
  Chip:      70-80%
  Tool:      10-20%
  Workpiece: 5-15%
```

---

## 5. SURFACE FINISH MODELS

### 5.1 Theoretical Surface Roughness
```
Turning (Ideal):
  Ra = f² / (32 × r_ε)
  Rt = f² / (8 × r_ε)

Where:
  Ra = Average roughness (μm)
  Rt = Peak-to-valley (μm)
  f  = Feed per revolution (mm/rev)
  r_ε = Nose radius (mm)

Practical:
  Ra_actual = Ra_theoretical × (1 + k_BUE + k_vib + k_wear)
```

---

## 6. POWER & TORQUE

### 6.1 Cutting Power
```
Power (kW):
  P = Fc × V / 60000

From MRR:
  P = MRR × u_s / 60

Where:
  MRR = Material removal rate (mm³/min)
  u_s = Specific cutting energy (J/mm³)

Typical u_s values:
  Aluminum:     0.4-0.8 J/mm³
  Carbon steel: 2.0-4.0 J/mm³
  Stainless:    3.0-5.0 J/mm³
  Titanium:     3.5-5.5 J/mm³
  Nickel alloy: 4.0-6.0 J/mm³
```

---

## 7. QUICK REFERENCE TABLES

### Material Coefficients
| Material | Kc1.1 (N/mm²) | mc | n (Taylor) | u_s (J/mm³) |
|----------|---------------|-----|------------|-------------|
| Low C Steel | 1400-1600 | 0.20-0.24 | 0.25-0.28 | 2.5-3.5 |
| Med C Steel | 1600-1900 | 0.22-0.28 | 0.23-0.26 | 3.0-4.0 |
| High C Steel | 1900-2300 | 0.25-0.32 | 0.20-0.24 | 3.5-4.5 |
| Alloy Steel | 1800-2400 | 0.24-0.30 | 0.22-0.26 | 3.0-4.5 |
| Stainless 304 | 2200-2600 | 0.25-0.30 | 0.20-0.24 | 3.5-4.5 |
| Stainless 316 | 2400-2800 | 0.26-0.32 | 0.18-0.22 | 4.0-5.0 |
| Gray Iron | 1100-1400 | 0.22-0.28 | 0.25-0.30 | 1.5-2.5 |
| Al 6061 | 700-900 | 0.15-0.20 | 0.30-0.40 | 0.5-0.8 |
| Al 7075 | 850-1050 | 0.18-0.22 | 0.28-0.35 | 0.6-1.0 |
| Ti-6Al-4V | 2100-2500 | 0.20-0.28 | 0.15-0.20 | 4.0-5.5 |
| Inconel 718 | 3500-4500 | 0.25-0.32 | 0.10-0.15 | 5.0-7.0 |

### Unit Conversions
| From | To | Multiply by |
|------|-----|-------------|
| m/min | sfm | 3.281 |
| mm/rev | ipr | 0.03937 |
| mm | inch | 0.03937 |
| N | lbf | 0.2248 |
| MPa | ksi | 0.1450 |
| kW | HP | 1.341 |

---

## END OF SKILL
