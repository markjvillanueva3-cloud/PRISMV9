---
name: prism-physics-formulas
description: |
  Manufacturing physics formulas collection.
---

```
Source: VDI 3323, MIT 2.810

Fc = Kc1.1 × b × h^(1-mc) × Kγ × Kv × Kw

Where:
  Fc = Cutting force [N]
  Kc1.1 = Specific cutting force at h=1mm, b=1mm [N/mm²]
  b = Width of cut [mm]
  h = Undeformed chip thickness [mm]
  mc = Chip thickness exponent (0.15-0.40)
  
Correction factors:
  Kγ = Rake angle correction = 1 - (γ - γ₀) × 0.015
      γ = actual rake angle, γ₀ = reference (typically 6°)
  Kv = Speed correction = (v₀/v)^0.07
      v₀ = reference speed (100 m/min)
  Kw = Wear correction = 1 + 3 × VB
      VB = flank wear [mm]

Three components:
  Fc (tangential) = Primary cutting force
  Ff (feed) = Typically 0.3-0.5 × Fc
  Fp (radial) = Typically 0.2-0.4 × Fc
```

### 1.2 Merchant's Force Model
```
Source: MIT 2.810, Merchant 1945

Fc = (τs × As) / (cos(φ - γ) × cos(β - γ + φ))

Where:
  τs = Shear strength of workpiece [MPa]
  As = Shear plane area = b × h / sin(φ)
  φ = Shear angle [degrees]
  γ = Rake angle [degrees]
  β = Friction angle = arctan(μ)
  μ = Coefficient of friction

Shear angle (Merchant):
  φ = 45° + γ/2 - β/2

Lee-Shaffer modification:
  φ = 45° + γ - β
```

### 1.3 Specific Energy Method
```
Source: MIT 2.810

Power = Fc × v / 60,000 [kW]

Specific energy:
  u = Fc / (b × h) [J/mm³]
  
Power from MRR:
  Power = u × MRR [kW]
  MRR = v × f × ap × 1000 [mm³/min]
```

## 3. TOOL LIFE MODELS

### 3.1 Extended Taylor Equation
```
Source: MIT 2.810, Taylor 1907 + extensions

Basic Taylor:
  V × T^n = C

Extended Taylor:
  V × T^n × f^a × ap^b = C

Where:
  V = Cutting speed [m/min]
  T = Tool life [min]
  f = Feed [mm/rev]
  ap = Depth of cut [mm]
  
Typical exponents:
  n: HSS=0.10-0.15, Carbide=0.20-0.30, Ceramic=0.30-0.45
  a: 0.50-0.80
  b: 0.10-0.20

Solving for tool life:
  T = (C / (V × f^a × ap^b))^(1/n)
```

### 3.2 Tool Wear Rate Models
```
Source: MIT 2.810

Flank wear rate (Usui equation):
  dVB/dt = A × σn × Vs × exp(-B/T)

Where:
  VB = Flank wear [mm]
  σn = Normal stress on flank [MPa]
  Vs = Sliding velocity [m/min]
  T = Interface temperature [K]
  A, B = Material constants

Crater wear rate:
  dKT/dt = C × exp(-Q/(R×T)) × (diffusion controlled)

Total wear:
  VBtotal = VBabrasive + VBadhesive + VBdiffusion + VBchemical
```

### 3.3 Minimum Cost/Time Optimization
```
Source: MIT 15.060, 6.046J

Minimum cost speed:
  Vopt_cost = C × ((1-n)/(n × (Ct/Cm + tc)))^n

Minimum time speed:
  Vopt_time = C × ((1-n)/(n × tc))^n

Where:
  Ct = Tool cost per edge [$]
  Cm = Machine cost per minute [$/min]
  tc = Tool change time [min]
```

## 5. SURFACE FINISH MODELS

### 5.1 Theoretical Surface Roughness
```
Source: MIT 2.810

Turning (single point):
  Ra_ideal = f² / (32 × r)
  Rt_ideal = f² / (8 × r)

Where:
  f = Feed per revolution [mm/rev]
  r = Nose radius [mm]

For sharp tool:
  Rt = f × tan(κr) × tan(κr') / (tan(κr) + tan(κr'))
```

### 5.2 Practical Surface Roughness
```
Source: Empirical + MIT 2.810

Ra_actual = Ra_ideal × Kv × Km × Kt × Kw

Correction factors:
  Kv = Speed factor (decreases with speed, typically 0.8-1.2)
  Km = Material factor (ductile materials rougher)
  Kt = Tool condition (increases with wear)
  Kw = Workpiece rigidity

Milling:
  Ra = (f_z² × (ae/D)) / (8 × r) × √(1 + (2r/D))
```

### 5.3 Surface Integrity Parameters
```
Source: MIT 2.810, Field

Residual stress (turning):
  σresidual = -k1 × (Fc / (f × ap)) + k2 × T

Work hardening depth:
  dhardened = k × (Fc/f)^0.5

White layer depth (hardened steel):
  dwhite = α × v^0.3 × f^0.2 × exp(T/T_critical)
```

## 7. OPTIMIZATION ALGORITHMS

### 7.1 Particle Swarm Optimization (PSO)
```
Source: MIT 6.867

Update equations:
  v_i(t+1) = w × v_i(t) + c1 × r1 × (p_best_i - x_i) + c2 × r2 × (g_best - x_i)
  x_i(t+1) = x_i(t) + v_i(t+1)

Parameters:
  w = Inertia weight (0.4-0.9, typically decreasing)
  c1 = Cognitive parameter (1.5-2.5)
  c2 = Social parameter (1.5-2.5)
  
For cutting parameters:
  Objective: Minimize cost OR time OR maximize MRR
  Constraints: Power, force, surface finish, stability
```

### 7.2 Genetic Algorithm
```
Source: MIT 6.034

For cutting optimization:
  Chromosome = [V, f, ap, tool_code]
  
Fitness function:
  f = w1 × (1/cost) + w2 × (1/time) + w3 × MRR - penalties

Operations:
  Selection: Tournament or roulette
  Crossover: Single/two-point (rate: 0.7-0.9)
  Mutation: Random perturbation (rate: 0.01-0.1)
```

### 7.3 Bayesian Optimization
```
Source: MIT 6.867

For expensive function optimization:
  
Gaussian Process model:
  f(x) ~ GP(m(x), k(x,x'))

Acquisition function (Expected Improvement):
  EI(x) = (μ(x) - f_best) × Φ(Z) + σ(x) × φ(Z)
  Z = (μ(x) - f_best) / σ(x)

Application:
  Best for tuning with limited trials
  Good for noisy objectives (tool life)
```

## 9. QUICK REFERENCE TABLES

### Force Calculation Quick Reference
| Material | Kc1.1 (N/mm²) | mc | Speed Factor |
|----------|---------------|-----|--------------|
| Low C Steel | 1400-1600 | 0.20-0.24 | (100/v)^0.07 |
| Med C Steel | 1600-1900 | 0.22-0.28 | (100/v)^0.08 |
| High C Steel | 1900-2300 | 0.25-0.32 | (100/v)^0.09 |
| Alloy Steel | 1700-2200 | 0.24-0.30 | (100/v)^0.08 |
| Stainless 304 | 2100-2400 | 0.26-0.32 | (100/v)^0.10 |
| Titanium | 1400-1800 | 0.20-0.28 | (100/v)^0.05 |
| Aluminum | 700-900 | 0.15-0.22 | (100/v)^0.05 |
| Inconel 718 | 3500-4500 | 0.28-0.36 | (100/v)^0.12 |

### Taylor Constants Quick Reference
| Tool Type | n Range | C Range (steel) |
|-----------|---------|-----------------|
| HSS | 0.10-0.15 | 30-60 m/min |
| Carbide P20 | 0.20-0.28 | 200-350 m/min |
| Carbide P10 | 0.22-0.30 | 250-400 m/min |
| Coated Carbide | 0.25-0.32 | 300-500 m/min |
| Cermet | 0.28-0.35 | 350-550 m/min |
| Ceramic | 0.30-0.45 | 400-800 m/min |
| CBN | 0.35-0.50 | 100-300 m/min |

---

## END OF SKILL
