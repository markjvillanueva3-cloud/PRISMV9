---
name: prism-material-physics
description: |
  Physics formulas and models using material parameters from prism-material-schema.
  Use when: Calculating cutting forces, tool life, temperatures, surface finish.
  Provides: Kienzle model, Johnson-Cook model, Taylor equation, thermal models,
  surface finish prediction, chip formation models with complete derivations.
  Key principle: Every formula traces back to material parameters.
  Part of SP.3 Materials System.
---
# PRISM-MATERIAL-PHYSICS
## Physics Formulas Using Material Parameters
### Version 1.0 | Materials System | ~40KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides **complete physics formulas** that consume material parameters from prism-material-schema. Every calculation in PRISM traces back to these fundamental models.

**The Models Covered:**
1. **Kienzle Model** - Cutting force calculation
2. **Johnson-Cook Model** - Constitutive behavior for FEA
3. **Taylor Equation** - Tool life prediction
4. **Thermal Models** - Heat generation and temperature
5. **Surface Finish Models** - Ra prediction
6. **Chip Formation Models** - Chip type and breaking

**Why This Matters:**
- All PRISM calculations are physics-based
- Material parameters feed directly into these formulas
- Understanding the models enables better optimization
- Validation requires knowing the underlying physics

## 1.2 The Physics Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PHYSICS-BASED CALCULATION PHILOSOPHY                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: MODELS HAVE VALIDITY RANGES                                               │
│  ─────────────────────────────────────────                                              │
│  No model works everywhere. Kienzle is empirical and has limits.                        │
│  Johnson-Cook fails at very high strain rates. Know the boundaries.                     │
│                                                                                         │
│  PRINCIPLE 2: PARAMETERS HAVE UNCERTAINTY                                               │
│  ─────────────────────────────────────────                                              │
│  Material properties vary by heat treatment, supplier, batch.                           │
│  Calculations should reflect this uncertainty.                                          │
│                                                                                         │
│  PRINCIPLE 3: CORRECTIONS MATTER                                                        │
│  ─────────────────────────────────────────                                              │
│  Base formulas give 80% accuracy. Correction factors get to 95%.                        │
│  Always apply appropriate corrections.                                                  │
│                                                                                         │
│  PRINCIPLE 4: VALIDATE WITH REALITY                                                     │
│  ─────────────────────────────────────────                                              │
│  Theory guides, but measured data confirms. Feed learning loops                         │
│  back into parameter refinement.                                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Formula → Parameter Mapping

| Formula/Model | Key Material Parameters | From Schema |
|---------------|------------------------|-------------|
| **Kienzle Force** | kc1_1, mc, corrections | kienzle.* |
| **Johnson-Cook** | A, B, C, n, m | johnson_cook.* |
| **Taylor Life** | C, n by tool material | taylor.* |
| **Temperature Rise** | thermal_conductivity, specific_heat, density | thermal.* |
| **Surface Finish** | Ra sensitivities, tendencies | surface.* |
| **Chip Formation** | elongation, work_hardening | mechanical.*, machinability.* |

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "cutting force", "Kienzle"
- "tool life", "Taylor"
- "temperature", "heat"
- "surface finish", "Ra"
- "Johnson-Cook", "constitutive"

**Contextual Triggers:**
- Implementing calculation engines
- Validating calculation results
- Understanding formula derivations
- Debugging unexpected outputs

## 1.5 Position in SP.3 Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SP.3 MATERIALS SYSTEM                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.3.1              SP.3.2              SP.3.3                                         │
│  ┌────────┐         ┌────────┐         ┌────────┐                                       │
│  │ SCHEMA │────────▶│PHYSICS │────────▶│ LOOKUP │                                       │
│  │        │         │        │         │        │                                       │
│  └────────┘         └────────┘         └────────┘                                       │
│  Parameters         ▲ THIS             Access                                           │
│  definition         │                  patterns                                         │
│                     │                                                                   │
│  Provides:          Uses params in     Gets params                                      │
│  127 parameters     physics formulas   for formulas                                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.6 Units Convention

| Quantity | Standard Unit | Symbol |
|----------|---------------|--------|
| Force | Newton | N |
| Stress | Megapascal | MPa |
| Length | Millimeter | mm |
| Speed | Meters/minute | m/min |
| Feed | mm/revolution | mm/rev |
| Temperature | Celsius | °C |
| Power | Kilowatt | kW |
| Time | Minutes | min |
| Energy | Joule | J |

---

# SECTION 2: KIENZLE CUTTING FORCE MODEL

## 2.1 Overview

The **Kienzle model** is the primary method for calculating cutting forces in PRISM. Developed by Otto Kienzle in 1952, it remains the industry standard for force prediction.

## 2.2 Basic Kienzle Equation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           KIENZLE CUTTING FORCE EQUATION                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                    Fc = kc × A = kc × b × h                                             │
│                                                                                         │
│  Where:                                                                                 │
│    Fc = Main cutting force (N)                                                          │
│    kc = Specific cutting force (N/mm²)                                                  │
│    A  = Uncut chip area (mm²)                                                           │
│    b  = Width of cut (mm)                                                               │
│    h  = Uncut chip thickness (mm)                                                       │
│                                                                                         │
│  The specific cutting force varies with chip thickness:                                 │
│                                                                                         │
│                    kc = kc1.1 × h^(-mc)                                                 │
│                                                                                         │
│  Where:                                                                                 │
│    kc1.1 = Specific cutting force at h=1mm (N/mm²)  [FROM MATERIAL]                     │
│    mc    = Chip thickness exponent (-)              [FROM MATERIAL]                     │
│                                                                                         │
│  Therefore, the complete equation:                                                      │
│                                                                                         │
│                    Fc = kc1.1 × h^(-mc) × b × h                                         │
│                    Fc = kc1.1 × b × h^(1-mc)                                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Material Parameters Used

| Parameter | Schema Location | Typical Range | Description |
|-----------|-----------------|---------------|-------------|
| `kc1_1` | material.kienzle.kc1_1 | 500-4000 N/mm² | Specific cutting force at 1mm chip thickness |
| `mc` | material.kienzle.mc | 0.15-0.40 | Chip thickness exponent |
| `kc1_1_turning` | material.kienzle.kc1_1_turning | 500-4000 N/mm² | Operation-specific value |
| `kc1_1_milling` | material.kienzle.kc1_1_milling | 500-4500 N/mm² | Operation-specific value |
| `kc1_1_drilling` | material.kienzle.kc1_1_drilling | 600-5000 N/mm² | Operation-specific value |

## 2.4 Correction Factors

The base Kienzle equation is modified by correction factors:

```
kc_corrected = kc1.1 × h^(-mc) × Kγ × Kv × Kver × Kkühl
```

### Rake Angle Correction (Kγ)

```
Kγ = 1 - (γ - γ_ref) × (correction_factor / 100)

Where:
  γ       = Actual rake angle (°)
  γ_ref   = Reference rake angle (typically 6°)
  correction_factor = material.kienzle.rake_angle_correction (typically 1.5 %/°)

Example: γ = 10°, γ_ref = 6°, correction = 1.5%/°
  Kγ = 1 - (10 - 6) × 0.015 = 1 - 0.06 = 0.94
  (Larger positive rake = lower cutting force)
```

### Cutting Speed Correction (Kv)

```
Kv = material.kienzle.speed_correction_factor

Typical values:
  Low speed (<50 m/min):   Kv = 1.10 - 1.20
  Normal speed:            Kv = 1.00
  High speed (>200 m/min): Kv = 0.85 - 0.95
```

### Tool Wear Correction (Kver)

```
Kver = material.kienzle.wear_correction_factor

Typical values:
  Sharp tool (VB < 0.1mm):   Kver = 1.00
  Normal wear (VB = 0.2mm):  Kver = 1.15 - 1.25
  Worn tool (VB > 0.3mm):    Kver = 1.30 - 1.50
```

### Coolant Correction (Kkühl)

```
Kkühl = material.kienzle.coolant_correction_factor

Typical values:
  Dry machining:    Kkühl = 1.00
  Flood coolant:    Kkühl = 0.90 - 0.95
  MQL:              Kkühl = 0.95 - 0.98
  Cryogenic:        Kkühl = 0.85 - 0.92
```

## 2.5 Force Components

The main cutting force (Fc) is one of three orthogonal components:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THREE FORCE COMPONENTS                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Fc = Main cutting force (tangential)                                                   │
│       → Direction: Tangent to cutting velocity                                          │
│       → Calculated from Kienzle equation                                                │
│                                                                                         │
│  Ff = Feed force (axial)                                                                │
│       → Direction: Parallel to feed direction                                           │
│       → Ff = Fc × feed_force_ratio                                                      │
│       → feed_force_ratio from material.kienzle (typically 0.3-0.8)                      │
│                                                                                         │
│  Fp = Passive force (radial)                                                            │
│       → Direction: Perpendicular to both Fc and Ff                                      │
│       → Fp = Fc × passive_force_ratio                                                   │
│       → passive_force_ratio from material.kienzle (typically 0.2-0.6)                   │
│                                                                                         │
│  Resultant Force:                                                                       │
│       F_total = √(Fc² + Ff² + Fp²)                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.6 Power Calculation

```
Cutting Power:
  Pc = (Fc × Vc) / (60 × 1000)   [kW]

Where:
  Fc = Main cutting force (N)
  Vc = Cutting speed (m/min)

Motor Power (accounting for efficiency):
  Pm = Pc / η

Where:
  η = Machine efficiency (typically 0.75-0.90)
```

## 2.7 Implementation Example

```javascript
/**
 * Calculate cutting force using Kienzle model
 * @param material - Material with kienzle parameters
 * @param conditions - Cutting conditions
 * @returns Force components and power
 */
function calculateCuttingForce(material, conditions) {
  const { b, h, rakeAngle, speed, coolant, toolWear } = conditions;
  const { kc1_1, mc, rake_angle_correction, 
          speed_correction_factor, wear_correction_factor,
          coolant_correction_factor, feed_force_ratio, 
          passive_force_ratio } = material.kienzle;
  
  // Base specific cutting force
  const kc_base = kc1_1 * Math.pow(h, -mc);
  
  // Apply corrections
  const K_gamma = 1 - (rakeAngle - 6) * (rake_angle_correction / 100);
  const K_v = speed_correction_factor || 1.0;
  const K_ver = wear_correction_factor || 1.0;
  const K_kuhl = coolant_correction_factor || 1.0;
  
  const kc = kc_base * K_gamma * K_v * K_ver * K_kuhl;
  
  // Calculate forces
  const Fc = kc * b * h;
  const Ff = Fc * feed_force_ratio;
  const Fp = Fc * passive_force_ratio;
  const F_total = Math.sqrt(Fc*Fc + Ff*Ff + Fp*Fp);
  
  // Calculate power
  const Pc = (Fc * speed) / (60 * 1000);  // kW
  
  return {
    Fc,        // Main cutting force (N)
    Ff,        // Feed force (N)
    Fp,        // Passive force (N)
    F_total,   // Resultant force (N)
    kc,        // Specific cutting force (N/mm²)
    Pc         // Cutting power (kW)
  };
}
```

## 2.8 Validity and Limitations

| Aspect | Valid Range | Limitation |
|--------|-------------|------------|
| Chip thickness | 0.05 - 1.0 mm | Extrapolation unreliable outside range |
| Cutting speed | 20 - 500 m/min | Speed effects not fully captured |
| Tool geometry | Standard | Special geometries need adjustment |
| Work hardening | Low-medium | Severe hardening needs modification |
| Material state | Annealed/normalized | Heat-treated may vary |

---

# SECTION 3: JOHNSON-COOK CONSTITUTIVE MODEL

## 3.1 Overview

The **Johnson-Cook model** describes material flow stress as a function of strain, strain rate, and temperature. Essential for FEA simulation and high-speed machining analysis.

## 3.2 Johnson-Cook Equation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           JOHNSON-COOK CONSTITUTIVE EQUATION                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│           σ = (A + B × εⁿ) × (1 + C × ln(ε̇*)) × (1 - T*ᵐ)                              │
│               ─────────────   ─────────────────   ──────────                            │
│                  Term 1           Term 2           Term 3                               │
│                                                                                         │
│  Where:                                                                                 │
│    σ   = Flow stress (MPa)                                                              │
│    ε   = Plastic strain (-)                                                             │
│    ε̇*  = Dimensionless strain rate = ε̇ / ε̇₀                                            │
│    T*  = Homologous temperature = (T - T_ref) / (T_melt - T_ref)                        │
│                                                                                         │
│  TERM 1: Strain Hardening                                                               │
│    A = Initial yield stress (MPa)           [FROM MATERIAL]                             │
│    B = Strain hardening coefficient (MPa)   [FROM MATERIAL]                             │
│    n = Strain hardening exponent (-)        [FROM MATERIAL]                             │
│                                                                                         │
│  TERM 2: Strain Rate Sensitivity                                                        │
│    C = Strain rate coefficient (-)          [FROM MATERIAL]                             │
│    ε̇₀ = Reference strain rate (1/s)        [FROM MATERIAL, typically 1.0]              │
│                                                                                         │
│  TERM 3: Thermal Softening                                                              │
│    m = Thermal softening exponent (-)       [FROM MATERIAL]                             │
│    T_ref = Reference temperature (°C)       [FROM MATERIAL, typically 25]               │
│    T_melt = Melting temperature (°C)        [FROM MATERIAL thermal.melting_point]       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Material Parameters Used

| Parameter | Schema Location | Typical Range | Description |
|-----------|-----------------|---------------|-------------|
| `A` | material.johnson_cook.A | 100-2000 MPa | Initial yield stress |
| `B` | material.johnson_cook.B | 100-2000 MPa | Hardening coefficient |
| `n` | material.johnson_cook.n | 0.01-0.8 | Hardening exponent |
| `C` | material.johnson_cook.C | 0.001-0.1 | Strain rate coefficient |
| `m` | material.johnson_cook.m | 0.5-2.0 | Thermal softening exponent |
| `ref_strain_rate` | material.johnson_cook.ref_strain_rate | 1.0 1/s | Reference strain rate |
| `ref_temp` | material.johnson_cook.ref_temp | 20-25 °C | Reference temperature |
| `melting_point` | material.thermal.melting_point | 400-3500 °C | Melting temperature |

## 3.4 Physical Interpretation

### Term 1: Strain Hardening (A + Bεⁿ)

```
- At zero strain (ε = 0): σ = A (initial yield)
- As strain increases: stress increases following power law
- Higher n = more rapid initial hardening that slows down
- Lower n = more gradual, sustained hardening

Typical behavior:
  ε = 0:   σ = A
  ε = 0.1: σ = A + B × (0.1)ⁿ
  ε = 0.5: σ = A + B × (0.5)ⁿ
```

### Term 2: Strain Rate Effect (1 + C × ln(ε̇*))

```
- At reference strain rate (ε̇ = ε̇₀): Term = 1 (no effect)
- Higher strain rate: increased stress (work strengthening)
- Effect is logarithmic (diminishing returns at very high rates)

Typical machining strain rates: 10³ - 10⁶ /s
  ε̇ = 1000 /s: Term = 1 + C × ln(1000) = 1 + 6.9C
  ε̇ = 10000 /s: Term = 1 + C × ln(10000) = 1 + 9.2C
```

### Term 3: Thermal Softening (1 - T*ᵐ)

```
- At reference temperature (T = T_ref): T* = 0, Term = 1
- At melting temperature (T = T_melt): T* = 1, Term = 0
- Higher m = more abrupt softening near melting
- Lower m = more gradual softening

Example (Steel, T_ref=25°C, T_melt=1500°C):
  T = 200°C: T* = (200-25)/(1500-25) = 0.12, Term = 1 - 0.12ᵐ
  T = 600°C: T* = (600-25)/(1500-25) = 0.39, Term = 1 - 0.39ᵐ
```

## 3.5 Implementation Example

```javascript
/**
 * Calculate flow stress using Johnson-Cook model
 * @param material - Material with johnson_cook parameters
 * @param conditions - Deformation conditions
 * @returns Flow stress in MPa
 */
function calculateFlowStress(material, conditions) {
  const { strain, strainRate, temperature } = conditions;
  const { A, B, n, C, m, ref_strain_rate, ref_temp } = material.johnson_cook;
  const T_melt = material.thermal.melting_point;
  
  // Term 1: Strain hardening
  const term1 = A + B * Math.pow(strain, n);
  
  // Term 2: Strain rate effect
  const strainRateStar = strainRate / (ref_strain_rate || 1.0);
  const term2 = 1 + C * Math.log(Math.max(strainRateStar, 1.0));
  
  // Term 3: Thermal softening
  const T_ref = ref_temp || 25;
  const T_star = (temperature - T_ref) / (T_melt - T_ref);
  const T_star_clamped = Math.max(0, Math.min(1, T_star));
  const term3 = 1 - Math.pow(T_star_clamped, m);
  
  // Combined flow stress
  const sigma = term1 * term2 * term3;
  
  return {
    sigma,           // Flow stress (MPa)
    term1,           // Strain hardening contribution
    term2,           // Strain rate contribution
    term3,           // Thermal softening contribution
    T_star           // Homologous temperature
  };
}
```

## 3.6 Typical J-C Parameters by Material Class

| Material | A (MPa) | B (MPa) | n | C | m |
|----------|---------|---------|---|---|---|
| **AISI 1045** | 553 | 600 | 0.234 | 0.013 | 1.0 |
| **AISI 4140** | 595 | 580 | 0.133 | 0.023 | 1.03 |
| **Ti-6Al-4V** | 1098 | 1092 | 0.93 | 0.014 | 1.1 |
| **Al 6061-T6** | 324 | 114 | 0.42 | 0.002 | 1.34 |
| **Inconel 718** | 1241 | 622 | 0.652 | 0.0134 | 1.3 |
| **304 Stainless** | 310 | 1000 | 0.65 | 0.07 | 1.0 |

## 3.7 Applications in PRISM

| Application | How J-C is Used |
|-------------|-----------------|
| **Chip Formation** | Predicts shear stress in primary shear zone |
| **Cutting Temperature** | Thermal softening affects energy partition |
| **Tool Wear** | High stress/temp accelerates wear |
| **Surface Integrity** | Residual stress from thermal/mechanical effects |
| **High-Speed Machining** | Strain rate effects become dominant |

## 3.8 Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Assumes isotropic | Inaccurate for textured materials | Use anisotropic models |
| Uncoupled damage | No fracture prediction | Add damage model (J-C damage) |
| Limited to moderate temps | Fails near melting | Use phase-aware models |
| No microstructure | Ignores phase changes | Use metallurgical models |

---

# SECTION 4: TAYLOR TOOL LIFE MODEL

## 4.1 Overview

The **Taylor equation** predicts tool life as a function of cutting speed. Developed by F.W. Taylor in 1907, it remains the foundation of tool life prediction.

## 4.2 Basic Taylor Equation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           TAYLOR TOOL LIFE EQUATION                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                           V × Tⁿ = C                                                    │
│                                                                                         │
│  Where:                                                                                 │
│    V = Cutting speed (m/min)                                                            │
│    T = Tool life (minutes)                                                              │
│    n = Taylor exponent (-)              [FROM MATERIAL - tool dependent]                │
│    C = Taylor constant (m/min)          [FROM MATERIAL - tool dependent]                │
│                                                                                         │
│  Rearranged to solve for tool life:                                                     │
│                                                                                         │
│                           T = (C / V)^(1/n)                                             │
│                                                                                         │
│  Or to solve for speed at desired life:                                                 │
│                                                                                         │
│                           V = C / T^n                                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Material Parameters Used

| Parameter | Schema Location | Typical Range | Description |
|-----------|-----------------|---------------|-------------|
| `C_carbide` | material.taylor.C_carbide | 50-500 m/min | Carbide tool constant |
| `n_carbide` | material.taylor.n_carbide | 0.15-0.40 | Carbide tool exponent |
| `C_ceramic` | material.taylor.C_ceramic | 100-800 m/min | Ceramic tool constant |
| `n_ceramic` | material.taylor.n_ceramic | 0.20-0.50 | Ceramic tool exponent |
| `C_hss` | material.taylor.C_hss | 20-150 m/min | HSS tool constant |
| `n_hss` | material.taylor.n_hss | 0.08-0.20 | HSS tool exponent |

## 4.4 Extended Taylor Equation

The basic equation is extended to include feed and depth of cut:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTENDED TAYLOR EQUATION                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                    V × Tⁿ × f^α × d^β = C                                               │
│                                                                                         │
│  Where:                                                                                 │
│    f = Feed rate (mm/rev)                                                               │
│    d = Depth of cut (mm)                                                                │
│    α = Feed exponent (-)               [FROM MATERIAL: taylor.feed_exp]                 │
│    β = Depth exponent (-)              [FROM MATERIAL: taylor.doc_exp]                  │
│                                                                                         │
│  Typical values:                                                                        │
│    α (feed_exp) = 0.5 - 1.0  (feed has significant effect)                              │
│    β (doc_exp)  = 0.1 - 0.3  (depth has smaller effect)                                 │
│                                                                                         │
│  Rearranged:                                                                            │
│                    T = (C / (V × f^α × d^β))^(1/n)                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.5 Hardness Correction

Tool life is strongly affected by workpiece hardness:

```
T_corrected = T_base × K_hardness

K_hardness = material.taylor.hardness_factor

Or calculated from:
K_hardness = (HB_ref / HB_actual)^k

Where:
  HB_ref = Reference hardness (typically 200 HB)
  HB_actual = Actual workpiece hardness
  k = Hardness sensitivity (typically 1.5-2.5)
```

## 4.6 Tool Life Prediction by Tool Material

```javascript
/**
 * Calculate tool life using extended Taylor equation
 * @param material - Material with taylor parameters
 * @param tool - Tool material type
 * @param conditions - Cutting conditions
 * @returns Tool life in minutes
 */
function calculateToolLife(material, toolType, conditions) {
  const { speed, feed, doc } = conditions;
  const taylor = material.taylor;
  
  // Select parameters based on tool material
  let C, n;
  switch (toolType) {
    case 'CARBIDE':
      C = taylor.C_carbide;
      n = taylor.n_carbide;
      break;
    case 'CERAMIC':
      C = taylor.C_ceramic;
      n = taylor.n_ceramic;
      break;
    case 'HSS':
      C = taylor.C_hss;
      n = taylor.n_hss;
      break;
    default:
      throw new Error(`Unknown tool type: ${toolType}`);
  }
  
  // Extended Taylor with feed and DOC
  const feed_exp = taylor.feed_exp || 0.75;
  const doc_exp = taylor.doc_exp || 0.15;
  const hardness_factor = taylor.hardness_factor || 1.0;
  
  // Calculate tool life
  const denominator = speed * Math.pow(feed, feed_exp) * Math.pow(doc, doc_exp);
  const T_base = Math.pow(C / denominator, 1 / n);
  const T = T_base * hardness_factor;
  
  return {
    toolLife: T,           // Minutes
    toolLifeHours: T / 60, // Hours
    C, n,                  // Parameters used
    denominator            // For debugging
  };
}
```

## 4.7 Speed for Target Tool Life

```javascript
/**
 * Calculate cutting speed for target tool life
 * @param material - Material with taylor parameters
 * @param toolType - Tool material
 * @param targetLife - Desired tool life (minutes)
 * @param conditions - Feed and DOC
 * @returns Recommended cutting speed
 */
function calculateSpeedForLife(material, toolType, targetLife, conditions) {
  const { feed, doc } = conditions;
  const taylor = material.taylor;
  
  // Get parameters
  const C = taylor[`C_${toolType.toLowerCase()}`];
  const n = taylor[`n_${toolType.toLowerCase()}`];
  const feed_exp = taylor.feed_exp || 0.75;
  const doc_exp = taylor.doc_exp || 0.15;
  
  // V = C / (T^n × f^α × d^β)
  const V = C / (Math.pow(targetLife, n) * 
                 Math.pow(feed, feed_exp) * 
                 Math.pow(doc, doc_exp));
  
  return {
    speed: V,
    targetLife,
    toolType
  };
}
```

## 4.8 Taylor Parameters by Material Class

| Material | C (Carbide) | n (Carbide) | C (HSS) | n (HSS) |
|----------|-------------|-------------|---------|---------|
| **Low Carbon Steel** | 350 | 0.25 | 70 | 0.125 |
| **Medium Carbon Steel** | 280 | 0.25 | 50 | 0.125 |
| **Alloy Steel (4140)** | 280 | 0.25 | 45 | 0.125 |
| **Stainless 304** | 180 | 0.22 | 30 | 0.10 |
| **Ti-6Al-4V** | 80 | 0.20 | 15 | 0.08 |
| **Aluminum 6061** | 800 | 0.40 | 200 | 0.20 |
| **Inconel 718** | 40 | 0.18 | 8 | 0.08 |

## 4.9 Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Empirical model | Limited extrapolation | Stay within tested ranges |
| Assumes constant wear | Real wear is non-linear | Use wear curves for precision |
| No crater wear | Misses some failure modes | Monitor multiple wear types |
| Temperature ignored | Fails at extreme speeds | Use thermal-adjusted models |

---

# SECTION 5: THERMAL MODELS

## 5.1 Overview

Thermal models predict **heat generation, temperature rise, and heat partition** during cutting. Critical for tool life, surface integrity, and coolant selection.

## 5.2 Heat Generation in Cutting

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           HEAT SOURCES IN MACHINING                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Three primary heat sources:                                                            │
│                                                                                         │
│  1. PRIMARY SHEAR ZONE (Qs) - ~70-80% of total heat                                     │
│     Location: Where chip forms                                                          │
│     Cause: Plastic deformation of workpiece                                             │
│                                                                                         │
│  2. SECONDARY SHEAR ZONE (Qf) - ~15-25% of total heat                                   │
│     Location: Tool-chip interface                                                       │
│     Cause: Friction between chip and rake face                                          │
│                                                                                         │
│  3. TERTIARY ZONE (Qt) - ~5% of total heat                                              │
│     Location: Tool-workpiece interface (flank)                                          │
│     Cause: Friction and rubbing                                                         │
│                                                                                         │
│  Total heat:                                                                            │
│     Q_total = Qs + Qf + Qt                                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.3 Total Heat Generation Rate

```
Q_total = Pc × 1000   [W]

Where:
  Pc = Cutting power (kW) from Kienzle model
  
Alternatively:
  Q_total = Fc × Vc / 60   [W]

Where:
  Fc = Cutting force (N)
  Vc = Cutting speed (m/min)
```

## 5.4 Heat Partition

Heat is distributed among chip, workpiece, tool, and coolant:

```
Q_total = Q_chip + Q_workpiece + Q_tool + Q_coolant

Partition ratios (typical, dry machining):
  R_chip      = 0.70 - 0.85  (chip carries most heat away)
  R_workpiece = 0.05 - 0.15
  R_tool      = 0.05 - 0.15
  R_coolant   = 0 (dry) to 0.20 (flood)

Material parameters affecting partition:
  - thermal_conductivity: Higher → more heat to workpiece
  - specific_heat: Higher → more heat absorbed per °C
  - density: Affects thermal mass
```

## 5.5 Chip Temperature (Simplified Model)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CHIP TEMPERATURE MODEL                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                    ΔT_chip = (R_chip × Fc × Vc) / (ṁ × cp × 60)                         │
│                                                                                         │
│  Where:                                                                                 │
│    ΔT_chip = Temperature rise of chip (°C)                                              │
│    R_chip  = Heat partition ratio to chip (-)                                           │
│    Fc      = Cutting force (N)                                                          │
│    Vc      = Cutting speed (m/min)                                                      │
│    ṁ       = Mass flow rate of chip (kg/s)                                              │
│    cp      = Specific heat (J/kg·K)           [FROM MATERIAL: thermal.specific_heat]    │
│                                                                                         │
│  Mass flow rate:                                                                        │
│    ṁ = ρ × b × h × Vc / 60000                                                           │
│                                                                                         │
│  Where:                                                                                 │
│    ρ = Density (kg/m³)                        [FROM MATERIAL: physical.density]         │
│    b = Width of cut (mm)                                                                │
│    h = Chip thickness (mm)                                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.6 Tool-Chip Interface Temperature

```
Empirical correlation (Loewen-Shaw):

T_interface = T_ambient + ΔT_shear + ΔT_friction

Where:
  ΔT_shear ≈ (0.9 × τ × γ) / (ρ × cp)
  
  τ = Shear stress in chip (≈ tensile_strength / √3)
  γ = Shear strain (depends on rake angle)

Simplified estimation:
  T_interface ≈ T_ambient + K × Vc^0.5 × f^0.3

Where K depends on material thermal properties:
  K = f(thermal_conductivity, specific_heat, density)
```

## 5.7 Material Parameters Used

| Parameter | Schema Location | Used For |
|-----------|-----------------|----------|
| `thermal_conductivity` | material.thermal.thermal_conductivity | Heat dissipation rate |
| `specific_heat` | material.thermal.specific_heat | Temperature rise per energy |
| `density` | material.physical.density | Thermal mass |
| `thermal_diffusivity` | material.thermal.thermal_diffusivity | Heat spreading rate |
| `melting_point` | material.thermal.melting_point | Upper temperature limit |

## 5.8 Implementation Example

```javascript
/**
 * Calculate cutting temperatures
 * @param material - Material with thermal parameters
 * @param force - Cutting force (N)
 * @param conditions - Cutting conditions
 * @returns Temperature estimates
 */
function calculateTemperatures(material, force, conditions) {
  const { speed, feed, width, chipThickness } = conditions;
  const { thermal_conductivity, specific_heat } = material.thermal;
  const { density } = material.physical;
  const ambient = 25;  // °C
  
  // Heat generation rate (W)
  const Q_total = (force * speed) / 60;
  
  // Chip mass flow rate (kg/s)
  const massFlowRate = (density * width * chipThickness * speed) / 60000000;
  
  // Heat partition (simplified)
  const R_chip = 0.75;
  const R_tool = 0.15;
  const R_workpiece = 0.10;
  
  // Chip temperature rise
  const deltaT_chip = (R_chip * Q_total) / (massFlowRate * specific_heat);
  
  // Interface temperature (empirical)
  const K = 15 / Math.sqrt(thermal_conductivity);
  const T_interface = ambient + K * Math.pow(speed, 0.5) * Math.pow(feed, 0.3);
  
  return {
    Q_total,                        // Total heat (W)
    Q_chip: R_chip * Q_total,       // Heat to chip (W)
    Q_tool: R_tool * Q_total,       // Heat to tool (W)
    Q_workpiece: R_workpiece * Q_total,
    T_chip: ambient + deltaT_chip,  // Chip temperature (°C)
    T_interface,                    // Interface temperature (°C)
    massFlowRate                    // kg/s
  };
}
```

## 5.9 Temperature Effects on Machining

| Temperature Range | Effects |
|-------------------|---------|
| < 200°C | Minimal effect, normal machining |
| 200-400°C | Tool coating may degrade |
| 400-600°C | Tool softening begins (HSS) |
| 600-800°C | Carbide performance degrades |
| 800-1000°C | Workpiece may undergo phase change |
| > Melting | Material removal by melting (not cutting) |

---

# SECTION 6: SURFACE FINISH AND CHIP FORMATION MODELS

## 6.1 Surface Roughness Prediction

### Theoretical Surface Roughness (Turning)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THEORETICAL SURFACE ROUGHNESS                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  For a round tool nose:                                                                 │
│                                                                                         │
│                    Ra_theoretical = f² / (32 × r)                                       │
│                                                                                         │
│  Where:                                                                                 │
│    Ra = Arithmetic average roughness (µm)                                               │
│    f  = Feed per revolution (mm/rev)                                                    │
│    r  = Tool nose radius (mm)                                                           │
│                                                                                         │
│  This is the GEOMETRIC minimum - actual Ra is always higher                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Actual Surface Roughness

```
Ra_actual = Ra_theoretical × K_material × K_speed × K_vibration × K_tool

Where:
  K_material  = Material roughness factor (0.8 - 2.5)
  K_speed     = Speed correction factor
  K_vibration = Vibration/chatter factor
  K_tool      = Tool condition factor
```

### Material Parameters Used

| Parameter | Schema Location | Effect |
|-----------|-----------------|--------|
| `Ra_speed_sensitivity` | material.surface.Ra_speed_sensitivity | Speed effect on Ra |
| `Ra_feed_sensitivity` | material.surface.Ra_feed_sensitivity | Feed effect on Ra |
| `min_achievable_Ra` | material.surface.min_achievable_Ra | Lower bound |
| `smearing_tendency` | material.surface.smearing_tendency | Soft material effect |
| `burr_formation_tendency` | material.surface.burr_formation_tendency | Edge quality |

## 6.2 Surface Roughness Implementation

```javascript
/**
 * Predict surface roughness
 * @param material - Material with surface parameters
 * @param tool - Tool parameters
 * @param conditions - Cutting conditions
 * @returns Predicted Ra values
 */
function predictSurfaceRoughness(material, tool, conditions) {
  const { feed, speed } = conditions;
  const { noseRadius } = tool;
  const surface = material.surface || {};
  
  // Theoretical minimum (geometric)
  const Ra_theoretical = (feed * feed * 1000) / (32 * noseRadius);
  
  // Material correction
  const smearing = surface.smearing_tendency || 'LOW';
  const K_material = smearing === 'HIGH' ? 2.0 : 
                     smearing === 'MEDIUM' ? 1.4 : 1.0;
  
  // Speed correction
  const speedSens = surface.Ra_speed_sensitivity || 1.0;
  const K_speed = Math.pow(100 / speed, 0.1 * speedSens);
  
  // Calculate actual Ra
  let Ra_actual = Ra_theoretical * K_material * K_speed;
  
  // Apply minimum limit
  const Ra_min = surface.min_achievable_Ra || 0.4;
  Ra_actual = Math.max(Ra_actual, Ra_min);
  
  return {
    Ra_theoretical,  // Geometric minimum (µm)
    Ra_actual,       // Predicted actual (µm)
    K_material,
    K_speed
  };
}
```

## 6.3 Chip Formation Model

### Chip Type Prediction

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CHIP TYPE CLASSIFICATION                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  CONTINUOUS CHIPS                                                                       │
│  • Ductile materials (elongation > 10%)                                                 │
│  • Higher cutting speeds                                                                │
│  • Sharp tools with positive rake                                                       │
│  • Good surface finish but chip control issues                                          │
│                                                                                         │
│  DISCONTINUOUS CHIPS                                                                    │
│  • Brittle materials (elongation < 5%)                                                  │
│  • Cast iron, hardened steel, brass                                                     │
│  • Easy chip disposal                                                                   │
│  • Variable surface finish                                                              │
│                                                                                         │
│  SEGMENTED CHIPS (Shear-localized)                                                      │
│  • Difficult-to-machine materials                                                       │
│  • Titanium, nickel alloys                                                              │
│  • High-speed machining of steels                                                       │
│  • Periodic force fluctuations                                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Material Parameters for Chip Prediction

| Parameter | Schema Location | Prediction Use |
|-----------|-----------------|----------------|
| `elongation` | material.mechanical.elongation | Ductility indicator |
| `chip_type` | material.machinability.chip_type | Known chip behavior |
| `chip_breakability` | material.machinability.chip_breakability | Breaking tendency |
| `work_hardening_severity` | material.machinability.work_hardening_severity | Segmentation |

## 6.4 Specific Cutting Energy

The energy required to remove a unit volume of material:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SPECIFIC CUTTING ENERGY                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                    u = Fc / A = kc    [J/mm³] or [N/mm²]                                │
│                                                                                         │
│  Where:                                                                                 │
│    u  = Specific cutting energy                                                         │
│    Fc = Cutting force (N)                                                               │
│    A  = Uncut chip area (mm²)                                                           │
│    kc = Specific cutting force (N/mm²)                                                  │
│                                                                                         │
│  Alternative (from power):                                                              │
│                    u = Pc / MRR                                                         │
│                                                                                         │
│  Where:                                                                                 │
│    Pc  = Cutting power (kW)                                                             │
│    MRR = Material removal rate (cm³/min)                                                │
│                                                                                         │
│  Typical values:                                                                        │
│    Aluminum:    0.4 - 1.0 J/mm³                                                         │
│    Steel:       2.0 - 4.0 J/mm³                                                         │
│    Titanium:    3.0 - 5.0 J/mm³                                                         │
│    Nickel:      4.0 - 7.0 J/mm³                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.5 Built-Up Edge (BUE) Prediction

```
BUE likelihood factors:

1. Material adhesion tendency
   - built_up_edge_tendency from material.machinability
   
2. Cutting speed
   - LOW speed (<30 m/min): HIGH BUE risk
   - MEDIUM speed (30-100 m/min): MEDIUM risk
   - HIGH speed (>100 m/min): LOW risk
   
3. Tool coating
   - Uncoated: HIGH risk
   - TiN: MEDIUM risk
   - TiAlN, AlCrN: LOW risk

4. Coolant
   - Dry: HIGHER risk
   - Flood: LOWER risk
```

## 6.6 Formula Summary Table

| Model | Primary Equation | Key Parameters |
|-------|------------------|----------------|
| **Kienzle** | Fc = kc1.1 × h^(1-mc) × b | kc1_1, mc |
| **Johnson-Cook** | σ = (A+Bεⁿ)(1+C·ln ε̇*)(1-T*ᵐ) | A, B, n, C, m |
| **Taylor** | V × Tⁿ = C | C, n by tool type |
| **Temperature** | ΔT = Q/(ṁ×cp) | cp, k, ρ |
| **Surface** | Ra = f²/(32r) × K | Ra sensitivities |
| **Energy** | u = Fc/A | specific_cutting_energy |

---

# SECTION 7: INTEGRATION

## 7.1 Skill Metadata

```yaml
skill_id: prism-material-physics
version: 1.0.0
category: materials-system
priority: HIGH

triggers:
  keywords:
    - "cutting force", "Kienzle", "kc"
    - "tool life", "Taylor", "VTn=C"
    - "temperature", "thermal", "heat"
    - "surface finish", "Ra", "roughness"
    - "Johnson-Cook", "flow stress", "constitutive"
  contexts:
    - Implementing calculation engines
    - Validating calculation results
    - Debugging unexpected outputs
    - Understanding formulas

activation_rule: |
  IF (need physics calculation OR formula reference)
  THEN activate prism-material-physics
  AND use material parameters from schema

outputs:
  - Force calculations
  - Tool life predictions
  - Temperature estimates
  - Surface finish predictions
  - Formula implementations

related_skills:
  - prism-material-schema (provides parameters)
  - prism-material-lookup (gets material data)
```

## 7.2 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MATERIAL-PHYSICS QUICK REFERENCE                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│  KIENZLE CUTTING FORCE                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│                                                                                         │
│    Fc = kc1.1 × b × h^(1-mc) × Kγ × Kv × Kver × Kkühl                                  │
│                                                                                         │
│    kc1.1 = 500-4000 N/mm² (material dependent)                                          │
│    mc = 0.15-0.40 (chip thickness exponent)                                             │
│    Kγ = rake angle correction                                                           │
│    Kv = speed correction                                                                │
│    Kver = wear correction                                                               │
│    Kkühl = coolant correction                                                           │
│                                                                                         │
│    Power: Pc = Fc × Vc / 60000 [kW]                                                     │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│  JOHNSON-COOK FLOW STRESS                                                               │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│                                                                                         │
│    σ = (A + Bεⁿ)(1 + C·ln ε̇*)(1 - T*ᵐ)                                                 │
│                                                                                         │
│    Term 1: Strain hardening (A, B, n)                                                   │
│    Term 2: Strain rate (C)                                                              │
│    Term 3: Thermal softening (m)                                                        │
│    T* = (T - Tref)/(Tmelt - Tref)                                                       │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│  TAYLOR TOOL LIFE                                                                       │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│                                                                                         │
│    V × Tⁿ × f^α × d^β = C                                                               │
│    T = (C / V)^(1/n)  [basic form]                                                      │
│                                                                                         │
│    Tool type   |  n typical  |  C range                                                 │
│    HSS         |  0.08-0.20  |  20-150 m/min                                            │
│    Carbide     |  0.15-0.40  |  50-500 m/min                                            │
│    Ceramic     |  0.20-0.50  |  100-800 m/min                                           │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│  THERMAL                                                                                │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│                                                                                         │
│    Q = Fc × Vc / 60 [W]                                                                 │
│    ΔT = Q × R / (ṁ × cp)                                                                │
│    Partition: ~75% chip, ~15% tool, ~10% workpiece                                      │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│  SURFACE FINISH                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════    │
│                                                                                         │
│    Ra_theoretical = f² / (32 × r) [µm]                                                  │
│    Ra_actual = Ra_theoretical × K_material × K_speed                                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.3 Parameter → Formula Cross-Reference

| Material Parameter | Used In |
|--------------------|---------|
| `kienzle.kc1_1` | Cutting force (Kienzle) |
| `kienzle.mc` | Cutting force (Kienzle) |
| `johnson_cook.A, B, n, C, m` | Flow stress (J-C) |
| `taylor.C_carbide, n_carbide` | Tool life (Taylor) |
| `thermal.thermal_conductivity` | Heat dissipation |
| `thermal.specific_heat` | Temperature rise |
| `physical.density` | Mass flow rate, thermal |
| `mechanical.tensile_strength` | Shear stress estimate |
| `surface.Ra_*` | Surface finish prediction |

## 7.4 Calculation Engine Mapping

| PRISM Engine | Primary Model | Section |
|--------------|---------------|---------|
| `cutting_force_engine` | Kienzle | 2 |
| `tool_life_engine` | Taylor | 4 |
| `power_torque_engine` | Kienzle + Power | 2 |
| `thermal_engine` | Thermal models | 5 |
| `surface_finish_engine` | Ra models | 6 |
| `fea_simulation` | Johnson-Cook | 3 |
| `chip_prediction` | Chip formation | 6 |

---

# APPENDIX A: COMPREHENSIVE CONSTANTS DATABASES
## Extracted from PRISM v8.89 Monolith | 2026-01-30

This appendix contains ready-to-use constants for Taylor, Kienzle, and Johnson-Cook models.
All values validated against manufacturing literature and the Machining Data Handbook.

---

## A.1 TAYLOR TOOL LIFE CONSTANTS

### Extended Taylor Equation: V × T^n × f^a × d^b = C

```javascript
const TAYLOR_CONSTANTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // LOW CARBON STEELS (< 0.30% C)
  // ═══════════════════════════════════════════════════════════════════════════
  'steel_low_carbon': {
    'HSS':              { C: 70,   n: 0.125, a: 0.75, b: 0.15 },
    'HSS_Coated':       { C: 85,   n: 0.130, a: 0.72, b: 0.14 },
    'Carbide_Uncoated': { C: 200,  n: 0.250, a: 0.50, b: 0.15 },
    'Carbide_TiN':      { C: 280,  n: 0.270, a: 0.48, b: 0.14 },
    'Carbide_TiAlN':    { C: 320,  n: 0.280, a: 0.45, b: 0.13 },
    'Carbide_AlTiN':    { C: 350,  n: 0.290, a: 0.44, b: 0.12 },
    'Ceramic_Al2O3':    { C: 450,  n: 0.350, a: 0.40, b: 0.10 },
    'CBN':              { C: 550,  n: 0.380, a: 0.35, b: 0.08 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM CARBON STEELS (0.30-0.60% C)
  // ═══════════════════════════════════════════════════════════════════════════
  'steel_medium_carbon': {
    'HSS':              { C: 55,   n: 0.110, a: 0.78, b: 0.16 },
    'HSS_Coated':       { C: 70,   n: 0.115, a: 0.75, b: 0.15 },
    'Carbide_Uncoated': { C: 170,  n: 0.230, a: 0.52, b: 0.16 },
    'Carbide_TiN':      { C: 240,  n: 0.250, a: 0.50, b: 0.15 },
    'Carbide_TiAlN':    { C: 280,  n: 0.260, a: 0.48, b: 0.14 },
    'Carbide_AlTiN':    { C: 310,  n: 0.270, a: 0.46, b: 0.13 },
    'Ceramic_Al2O3':    { C: 400,  n: 0.320, a: 0.42, b: 0.11 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH CARBON STEELS (> 0.60% C)
  // ═══════════════════════════════════════════════════════════════════════════
  'steel_high_carbon': {
    'HSS':              { C: 40,   n: 0.100, a: 0.80, b: 0.17 },
    'Carbide_Uncoated': { C: 140,  n: 0.210, a: 0.55, b: 0.17 },
    'Carbide_TiAlN':    { C: 240,  n: 0.240, a: 0.50, b: 0.15 },
    'Ceramic_Al2O3':    { C: 350,  n: 0.300, a: 0.44, b: 0.12 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ALLOY STEELS (4140, 4340, 8620, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  'alloy_steel': {
    'HSS':              { C: 45,   n: 0.105, a: 0.78, b: 0.16 },
    'Carbide_Uncoated': { C: 150,  n: 0.220, a: 0.53, b: 0.16 },
    'Carbide_TiN':      { C: 210,  n: 0.240, a: 0.50, b: 0.15 },
    'Carbide_TiAlN':    { C: 260,  n: 0.255, a: 0.48, b: 0.14 },
    'Carbide_AlTiN':    { C: 290,  n: 0.265, a: 0.46, b: 0.13 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STAINLESS STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  'stainless_austenitic': {  // 304, 316, etc.
    'HSS':              { C: 35,   n: 0.095, a: 0.80, b: 0.18 },
    'Carbide_TiN':      { C: 150,  n: 0.200, a: 0.55, b: 0.17 },
    'Carbide_TiAlN':    { C: 190,  n: 0.220, a: 0.52, b: 0.16 },
    'Carbide_AlTiN':    { C: 220,  n: 0.235, a: 0.50, b: 0.15 }
  },
  'stainless_martensitic': {  // 410, 420, 440C
    'HSS':              { C: 40,   n: 0.100, a: 0.78, b: 0.17 },
    'Carbide_TiAlN':    { C: 200,  n: 0.225, a: 0.52, b: 0.16 }
  },
  'stainless_duplex': {  // 2205, 2507
    'Carbide_TiAlN':    { C: 160,  n: 0.200, a: 0.55, b: 0.17 },
    'Carbide_AlTiN':    { C: 185,  n: 0.215, a: 0.53, b: 0.16 }
  },
  'stainless_ph': {  // 17-4PH, 15-5PH
    'Carbide_TiAlN':    { C: 170,  n: 0.205, a: 0.54, b: 0.17 },
    'Carbide_AlTiN':    { C: 195,  n: 0.220, a: 0.52, b: 0.16 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAST IRONS
  // ═══════════════════════════════════════════════════════════════════════════
  'cast_iron_gray': {
    'HSS':              { C: 80,   n: 0.140, a: 0.70, b: 0.14 },
    'Carbide_Uncoated': { C: 250,  n: 0.280, a: 0.45, b: 0.13 },
    'Carbide_TiN':      { C: 350,  n: 0.300, a: 0.40, b: 0.12 },
    'Ceramic_Al2O3':    { C: 600,  n: 0.400, a: 0.35, b: 0.10 },
    'Ceramic_SiAlON':   { C: 700,  n: 0.420, a: 0.33, b: 0.09 }
  },
  'cast_iron_ductile': {
    'HSS':              { C: 65,   n: 0.125, a: 0.73, b: 0.15 },
    'Carbide_TiN':      { C: 280,  n: 0.280, a: 0.45, b: 0.13 },
    'Ceramic_Al2O3':    { C: 500,  n: 0.370, a: 0.38, b: 0.11 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ALUMINUM ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'aluminum_wrought': {  // 6061, 7075, 2024
    'HSS':              { C: 350,  n: 0.350, a: 0.45, b: 0.12 },
    'Carbide_Uncoated': { C: 900,  n: 0.400, a: 0.35, b: 0.10 },
    'Carbide_TiB2':     { C: 1100, n: 0.420, a: 0.32, b: 0.09 },
    'PCD':              { C: 1500, n: 0.450, a: 0.30, b: 0.08 }
  },
  'aluminum_cast': {  // 356, A380
    'HSS':              { C: 300,  n: 0.330, a: 0.48, b: 0.13 },
    'Carbide_Uncoated': { C: 750,  n: 0.380, a: 0.38, b: 0.11 },
    'PCD':              { C: 1200, n: 0.430, a: 0.32, b: 0.09 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TITANIUM ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'titanium_pure': {
    'Carbide_Uncoated': { C: 120,  n: 0.200, a: 0.55, b: 0.18 },
    'Carbide_TiAlN':    { C: 150,  n: 0.220, a: 0.52, b: 0.17 }
  },
  'titanium_ti6al4v': {
    'Carbide_Uncoated': { C: 80,   n: 0.170, a: 0.58, b: 0.19 },
    'Carbide_TiAlN':    { C: 110,  n: 0.190, a: 0.55, b: 0.18 },
    'Carbide_AlTiN':    { C: 125,  n: 0.200, a: 0.53, b: 0.17 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUPERALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'inconel_718': {
    'Carbide_TiAlN':    { C: 60,   n: 0.150, a: 0.60, b: 0.20 },
    'Carbide_AlTiN':    { C: 75,   n: 0.165, a: 0.58, b: 0.19 },
    'Ceramic_SiAlON':   { C: 150,  n: 0.220, a: 0.50, b: 0.16 }
  },
  'inconel_625': {
    'Carbide_TiAlN':    { C: 55,   n: 0.145, a: 0.62, b: 0.21 },
    'Carbide_AlTiN':    { C: 70,   n: 0.160, a: 0.59, b: 0.20 }
  },
  'waspaloy': {
    'Carbide_AlTiN':    { C: 65,   n: 0.155, a: 0.60, b: 0.20 },
    'Ceramic_SiAlON':   { C: 130,  n: 0.210, a: 0.52, b: 0.17 }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COPPER ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'copper_pure': {
    'HSS':              { C: 200,  n: 0.280, a: 0.55, b: 0.14 },
    'Carbide_Uncoated': { C: 500,  n: 0.350, a: 0.42, b: 0.12 }
  },
  'brass': {
    'HSS':              { C: 250,  n: 0.300, a: 0.50, b: 0.13 },
    'Carbide_Uncoated': { C: 600,  n: 0.370, a: 0.40, b: 0.11 }
  },
  'bronze': {
    'HSS':              { C: 180,  n: 0.260, a: 0.55, b: 0.14 },
    'Carbide_Uncoated': { C: 450,  n: 0.340, a: 0.43, b: 0.12 }
  }
};

// Usage: const params = TAYLOR_CONSTANTS['steel_low_carbon']['Carbide_TiAlN'];
//        const toolLife = Math.pow(params.C / V, 1/params.n);
```

---

## A.2 KIENZLE CUTTING FORCE CONSTANTS

### Kienzle Equation: Fc = kc1.1 × b × h^(1-mc)

```javascript
const KIENZLE_CONSTANTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CARBON STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  // Format: { kc1_1: N/mm², mc: exponent, feed_ratio: Ff/Fc, passive_ratio: Fp/Fc }
  
  'SAE1010':  { kc1_1: 1550, mc: 0.24, feed_ratio: 0.40, passive_ratio: 0.25 },
  'SAE1020':  { kc1_1: 1700, mc: 0.25, feed_ratio: 0.42, passive_ratio: 0.26 },
  'SAE1030':  { kc1_1: 1800, mc: 0.25, feed_ratio: 0.43, passive_ratio: 0.27 },
  'SAE1040':  { kc1_1: 1850, mc: 0.26, feed_ratio: 0.44, passive_ratio: 0.28 },
  'SAE1045':  { kc1_1: 1900, mc: 0.26, feed_ratio: 0.45, passive_ratio: 0.28 },
  'SAE1050':  { kc1_1: 1950, mc: 0.27, feed_ratio: 0.46, passive_ratio: 0.29 },
  'SAE1060':  { kc1_1: 2050, mc: 0.27, feed_ratio: 0.47, passive_ratio: 0.30 },
  'SAE1080':  { kc1_1: 2200, mc: 0.28, feed_ratio: 0.48, passive_ratio: 0.31 },
  'SAE1095':  { kc1_1: 2350, mc: 0.29, feed_ratio: 0.50, passive_ratio: 0.32 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ALLOY STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  'SAE4130':  { kc1_1: 2100, mc: 0.27, feed_ratio: 0.48, passive_ratio: 0.30 },
  'SAE4140':  { kc1_1: 2200, mc: 0.28, feed_ratio: 0.50, passive_ratio: 0.31 },
  'SAE4340':  { kc1_1: 2400, mc: 0.29, feed_ratio: 0.52, passive_ratio: 0.33 },
  'SAE8620':  { kc1_1: 2000, mc: 0.26, feed_ratio: 0.46, passive_ratio: 0.29 },
  'SAE8640':  { kc1_1: 2150, mc: 0.27, feed_ratio: 0.48, passive_ratio: 0.30 },
  'SAE9310':  { kc1_1: 2250, mc: 0.28, feed_ratio: 0.50, passive_ratio: 0.32 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  'A2':       { kc1_1: 2600, mc: 0.30, feed_ratio: 0.55, passive_ratio: 0.35 },
  'D2':       { kc1_1: 2800, mc: 0.31, feed_ratio: 0.58, passive_ratio: 0.37 },
  'H13':      { kc1_1: 2500, mc: 0.29, feed_ratio: 0.53, passive_ratio: 0.34 },
  'M2':       { kc1_1: 2700, mc: 0.30, feed_ratio: 0.56, passive_ratio: 0.36 },
  'O1':       { kc1_1: 2450, mc: 0.29, feed_ratio: 0.52, passive_ratio: 0.33 },
  'S7':       { kc1_1: 2550, mc: 0.30, feed_ratio: 0.54, passive_ratio: 0.35 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STAINLESS STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  '303SS':    { kc1_1: 2300, mc: 0.21, feed_ratio: 0.50, passive_ratio: 0.32 },
  '304SS':    { kc1_1: 2500, mc: 0.22, feed_ratio: 0.55, passive_ratio: 0.35 },
  '316SS':    { kc1_1: 2600, mc: 0.23, feed_ratio: 0.57, passive_ratio: 0.36 },
  '410SS':    { kc1_1: 2200, mc: 0.24, feed_ratio: 0.48, passive_ratio: 0.30 },
  '420SS':    { kc1_1: 2350, mc: 0.25, feed_ratio: 0.50, passive_ratio: 0.32 },
  '440CSS':   { kc1_1: 2700, mc: 0.27, feed_ratio: 0.58, passive_ratio: 0.37 },
  '17-4PH':   { kc1_1: 2800, mc: 0.24, feed_ratio: 0.60, passive_ratio: 0.38 },
  '15-5PH':   { kc1_1: 2750, mc: 0.24, feed_ratio: 0.58, passive_ratio: 0.37 },
  '2205':     { kc1_1: 2900, mc: 0.23, feed_ratio: 0.62, passive_ratio: 0.40 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAST IRONS
  // ═══════════════════════════════════════════════════════════════════════════
  'Gray_CI_Class20': { kc1_1: 900,  mc: 0.26, feed_ratio: 0.35, passive_ratio: 0.22 },
  'Gray_CI_Class30': { kc1_1: 1000, mc: 0.27, feed_ratio: 0.36, passive_ratio: 0.23 },
  'Gray_CI_Class40': { kc1_1: 1100, mc: 0.28, feed_ratio: 0.38, passive_ratio: 0.24 },
  'Ductile_60-40-18':{ kc1_1: 1300, mc: 0.25, feed_ratio: 0.40, passive_ratio: 0.26 },
  'Ductile_80-55-06':{ kc1_1: 1450, mc: 0.26, feed_ratio: 0.42, passive_ratio: 0.27 },
  'Ductile_100-70-03':{ kc1_1: 1600, mc: 0.27, feed_ratio: 0.45, passive_ratio: 0.29 },
  'Malleable':       { kc1_1: 1200, mc: 0.25, feed_ratio: 0.40, passive_ratio: 0.25 },
  'CGI':             { kc1_1: 1350, mc: 0.26, feed_ratio: 0.42, passive_ratio: 0.27 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ALUMINUM ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  '1100':     { kc1_1: 500,  mc: 0.20, feed_ratio: 0.30, passive_ratio: 0.18 },
  '2024_T3':  { kc1_1: 800,  mc: 0.22, feed_ratio: 0.35, passive_ratio: 0.22 },
  '2024_T4':  { kc1_1: 820,  mc: 0.22, feed_ratio: 0.35, passive_ratio: 0.22 },
  '6061_T6':  { kc1_1: 750,  mc: 0.22, feed_ratio: 0.33, passive_ratio: 0.20 },
  '6063_T6':  { kc1_1: 700,  mc: 0.21, feed_ratio: 0.32, passive_ratio: 0.19 },
  '7075_T6':  { kc1_1: 850,  mc: 0.23, feed_ratio: 0.36, passive_ratio: 0.23 },
  '7075_T73': { kc1_1: 830,  mc: 0.23, feed_ratio: 0.35, passive_ratio: 0.22 },
  'A356_T6':  { kc1_1: 700,  mc: 0.24, feed_ratio: 0.34, passive_ratio: 0.21 },
  'A380':     { kc1_1: 720,  mc: 0.25, feed_ratio: 0.35, passive_ratio: 0.22 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TITANIUM ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'Ti_CP_Grade2': { kc1_1: 1400, mc: 0.20, feed_ratio: 0.45, passive_ratio: 0.30 },
  'Ti_CP_Grade4': { kc1_1: 1550, mc: 0.20, feed_ratio: 0.47, passive_ratio: 0.31 },
  'Ti6Al4V':      { kc1_1: 1800, mc: 0.21, feed_ratio: 0.55, passive_ratio: 0.35 },
  'Ti6Al4V_ELI':  { kc1_1: 1750, mc: 0.21, feed_ratio: 0.53, passive_ratio: 0.34 },
  'Ti6Al2Sn4Zr2Mo': { kc1_1: 1900, mc: 0.21, feed_ratio: 0.57, passive_ratio: 0.36 },
  'Ti5Al2.5Sn':   { kc1_1: 1650, mc: 0.20, feed_ratio: 0.50, passive_ratio: 0.32 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NICKEL SUPERALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'Inconel600':   { kc1_1: 2800, mc: 0.18, feed_ratio: 0.65, passive_ratio: 0.42 },
  'Inconel625':   { kc1_1: 3100, mc: 0.18, feed_ratio: 0.68, passive_ratio: 0.44 },
  'Inconel718':   { kc1_1: 3400, mc: 0.19, feed_ratio: 0.70, passive_ratio: 0.45 },
  'Inconel750':   { kc1_1: 3200, mc: 0.18, feed_ratio: 0.68, passive_ratio: 0.44 },
  'Waspaloy':     { kc1_1: 3200, mc: 0.18, feed_ratio: 0.68, passive_ratio: 0.44 },
  'Rene41':       { kc1_1: 3300, mc: 0.19, feed_ratio: 0.70, passive_ratio: 0.45 },
  'Hastelloy_C276': { kc1_1: 3000, mc: 0.18, feed_ratio: 0.65, passive_ratio: 0.42 },
  'Monel400':     { kc1_1: 2200, mc: 0.20, feed_ratio: 0.52, passive_ratio: 0.33 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COPPER ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'Cu_Pure':      { kc1_1: 1100, mc: 0.20, feed_ratio: 0.40, passive_ratio: 0.25 },
  'Brass_C360':   { kc1_1: 750,  mc: 0.18, feed_ratio: 0.32, passive_ratio: 0.20 },
  'Brass_C260':   { kc1_1: 850,  mc: 0.19, feed_ratio: 0.35, passive_ratio: 0.22 },
  'Bronze_C932':  { kc1_1: 900,  mc: 0.20, feed_ratio: 0.38, passive_ratio: 0.24 },
  'Bronze_C954':  { kc1_1: 1200, mc: 0.22, feed_ratio: 0.45, passive_ratio: 0.28 },
  'BeCu_C17200':  { kc1_1: 1800, mc: 0.23, feed_ratio: 0.55, passive_ratio: 0.35 }
};

// Usage: const mat = KIENZLE_CONSTANTS['SAE4140'];
//        const kc = mat.kc1_1 * Math.pow(h, -mat.mc);
//        const Fc = kc * b * h;
```

---

## A.3 JOHNSON-COOK CONSTITUTIVE CONSTANTS

### Johnson-Cook Equation: σ = (A + B×ε^n)(1 + C×ln(ε̇*))(1 - T*^m)

```javascript
const JOHNSON_COOK_CONSTANTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CARBON AND ALLOY STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  // Format: { A: MPa, B: MPa, n, C, m, T_melt: K, T_ref: 293K }
  
  'AISI1006':  { A: 350,  B: 275,  n: 0.360, C: 0.022, m: 1.00, T_melt: 1793 },
  'AISI1015':  { A: 450,  B: 385,  n: 0.270, C: 0.015, m: 1.00, T_melt: 1783 },
  'AISI1018':  { A: 480,  B: 420,  n: 0.260, C: 0.014, m: 1.00, T_melt: 1773 },
  'AISI1020':  { A: 470,  B: 430,  n: 0.260, C: 0.014, m: 1.00, T_melt: 1768 },
  'AISI1045':  { A: 553,  B: 600,  n: 0.234, C: 0.0134,m: 1.00, T_melt: 1733 },
  'AISI1050':  { A: 580,  B: 650,  n: 0.230, C: 0.013, m: 1.00, T_melt: 1723 },
  'AISI4130':  { A: 710,  B: 450,  n: 0.270, C: 0.012, m: 1.00, T_melt: 1763 },
  'AISI4140':  { A: 750,  B: 520,  n: 0.250, C: 0.013, m: 1.00, T_melt: 1753 },
  'AISI4340':  { A: 792,  B: 510,  n: 0.260, C: 0.014, m: 1.03, T_melt: 1793 },
  'AISI8620':  { A: 650,  B: 490,  n: 0.280, C: 0.012, m: 1.00, T_melt: 1773 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STAINLESS STEELS
  // ═══════════════════════════════════════════════════════════════════════════
  '304SS':     { A: 310,  B: 1000, n: 0.650, C: 0.070, m: 1.00, T_melt: 1673 },
  '304L_SS':   { A: 280,  B: 950,  n: 0.640, C: 0.065, m: 1.00, T_melt: 1673 },
  '316SS':     { A: 305,  B: 1161, n: 0.610, C: 0.010, m: 1.00, T_melt: 1673 },
  '316L_SS':   { A: 290,  B: 1100, n: 0.600, C: 0.010, m: 1.00, T_melt: 1673 },
  '410SS':     { A: 450,  B: 680,  n: 0.450, C: 0.020, m: 1.00, T_melt: 1753 },
  '17-4PH':    { A: 1050, B: 380,  n: 0.350, C: 0.025, m: 1.05, T_melt: 1723 },
  '15-5PH':    { A: 1020, B: 360,  n: 0.340, C: 0.024, m: 1.03, T_melt: 1723 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ALUMINUM ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'Al1100_O':  { A: 30,   B: 140,  n: 0.250, C: 0.001, m: 1.00, T_melt: 933 },
  'Al2024_T3': { A: 369,  B: 684,  n: 0.730, C: 0.0083,m: 1.70, T_melt: 911 },
  'Al2024_T351':{ A: 265, B: 426,  n: 0.340, C: 0.015, m: 1.00, T_melt: 911 },
  'Al6061_O':  { A: 60,   B: 235,  n: 0.420, C: 0.002, m: 1.34, T_melt: 855 },
  'Al6061_T6': { A: 324,  B: 114,  n: 0.420, C: 0.002, m: 1.34, T_melt: 855 },
  'Al7075_O':  { A: 120,  B: 450,  n: 0.450, C: 0.010, m: 1.40, T_melt: 908 },
  'Al7075_T6': { A: 546,  B: 678,  n: 0.710, C: 0.024, m: 1.56, T_melt: 908 },
  'Al7075_T651':{ A: 520, B: 477,  n: 0.520, C: 0.001, m: 1.61, T_melt: 908 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TITANIUM ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'Ti_CP_Gr2': { A: 380,  B: 660,  n: 0.500, C: 0.020, m: 0.80, T_melt: 1941 },
  'Ti_CP_Gr4': { A: 560,  B: 710,  n: 0.480, C: 0.018, m: 0.85, T_melt: 1941 },
  'Ti6Al4V':   { A: 1098, B: 1092, n: 0.930, C: 0.014, m: 1.10, T_melt: 1933 },
  'Ti6Al4V_Ann':{ A: 997, B: 653,  n: 0.450, C: 0.0198,m: 0.70, T_melt: 1933 },
  'Ti6Al2Sn4Zr2Mo':{ A: 1050, B: 890, n: 0.650, C: 0.016, m: 1.00, T_melt: 1923 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NICKEL SUPERALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'Inconel600': { A: 550,  B: 2200, n: 0.800, C: 0.025, m: 1.30, T_melt: 1686 },
  'Inconel625': { A: 858,  B: 1080, n: 0.540, C: 0.015, m: 1.25, T_melt: 1623 },
  'Inconel718': { A: 1241, B: 622,  n: 0.650, C: 0.0134,m: 1.30, T_melt: 1609 },
  'Waspaloy':   { A: 1100, B: 800,  n: 0.600, C: 0.015, m: 1.25, T_melt: 1623 },
  'Hastelloy_X':{ A: 380,  B: 1900, n: 0.740, C: 0.016, m: 1.00, T_melt: 1628 },
  'Rene41':     { A: 1150, B: 750,  n: 0.580, C: 0.014, m: 1.20, T_melt: 1633 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COPPER ALLOYS
  // ═══════════════════════════════════════════════════════════════════════════
  'OFHC_Cu':   { A: 90,   B: 292,  n: 0.310, C: 0.025, m: 1.09, T_melt: 1356 },
  'Cu_ETP':    { A: 120,  B: 320,  n: 0.350, C: 0.022, m: 1.05, T_melt: 1356 },
  'Brass_70-30':{ A: 206, B: 505,  n: 0.420, C: 0.020, m: 1.68, T_melt: 1223 },
  'Bronze_Phos':{ A: 250, B: 410,  n: 0.380, C: 0.015, m: 1.20, T_melt: 1303 }
};

// Usage:
// const jc = JOHNSON_COOK_CONSTANTS['Ti6Al4V'];
// const T_star = (T - 293) / (jc.T_melt - 293);
// const sigma = (jc.A + jc.B * Math.pow(eps, jc.n)) * 
//               (1 + jc.C * Math.log(eps_dot)) * 
//               (1 - Math.pow(T_star, jc.m));
```

---

## A.4 THERMAL PROPERTIES DATABASE

```javascript
const THERMAL_PROPERTIES = {
  // Format: { k: W/m·K, cp: J/kg·K, rho: kg/m³, alpha: m²/s (diffusivity) }
  
  // Steels
  'Carbon_Steel':     { k: 50,   cp: 486, rho: 7850, alpha: 1.31e-5 },
  'Alloy_Steel':      { k: 42,   cp: 490, rho: 7800, alpha: 1.10e-5 },
  'Stainless_304':    { k: 16.2, cp: 500, rho: 8000, alpha: 4.05e-6 },
  'Stainless_316':    { k: 14.0, cp: 500, rho: 8027, alpha: 3.48e-6 },
  'Tool_Steel':       { k: 28,   cp: 460, rho: 7750, alpha: 7.85e-6 },
  
  // Aluminum
  'Aluminum_Pure':    { k: 237,  cp: 897, rho: 2700, alpha: 9.77e-5 },
  'Al_6061_T6':       { k: 167,  cp: 896, rho: 2700, alpha: 6.89e-5 },
  'Al_7075_T6':       { k: 130,  cp: 960, rho: 2810, alpha: 4.82e-5 },
  
  // Titanium
  'Ti_Pure':          { k: 21.9, cp: 523, rho: 4507, alpha: 9.29e-6 },
  'Ti6Al4V':          { k: 6.7,  cp: 526, rho: 4430, alpha: 2.87e-6 },
  
  // Superalloys
  'Inconel_718':      { k: 11.4, cp: 435, rho: 8190, alpha: 3.20e-6 },
  'Inconel_625':      { k: 9.8,  cp: 410, rho: 8440, alpha: 2.83e-6 },
  
  // Cast Iron
  'Gray_Iron':        { k: 53,   cp: 490, rho: 7200, alpha: 1.50e-5 },
  'Ductile_Iron':     { k: 36,   cp: 490, rho: 7100, alpha: 1.04e-5 },
  
  // Copper
  'Copper_Pure':      { k: 401,  cp: 385, rho: 8960, alpha: 1.16e-4 },
  'Brass':            { k: 109,  cp: 380, rho: 8500, alpha: 3.37e-5 },
  'Bronze':           { k: 50,   cp: 380, rho: 8800, alpha: 1.50e-5 }
};
```

---

## A.5 CHIP THINNING COMPENSATION

From PRISM_ADVANCED_FEED_OPTIMIZER:

```javascript
/**
 * Calculate chip thinning factor for radial engagement < 50%
 * When radial engagement is less than half the tool diameter,
 * effective chip thickness decreases, requiring feed compensation.
 */
function calculateChipThinningFactor(ae, toolDiameter) {
  const radialEngagement = ae / toolDiameter;
  
  if (radialEngagement >= 0.5) {
    return 1.0; // No compensation needed above 50% engagement
  }
  
  // CTF = 1 / sqrt(1 - (1 - 2*ae/D)^2)
  // Simplified: CTF = D / (2 * sqrt(ae * (D - ae)))
  const factor = 1 - 2 * radialEngagement;
  const ctf = 1 / Math.sqrt(1 - factor * factor);
  
  return Math.min(ctf, 2.0); // Cap at 2x to prevent unrealistic compensation
}

/**
 * Adjusted feed for chip thinning
 */
function adjustFeedForChipThinning(fz_programmed, ae, toolDiameter) {
  const ctf = calculateChipThinningFactor(ae, toolDiameter);
  return fz_programmed * ctf;
}

// Example: 10mm tool, 2mm stepover (20% engagement)
// CTF = 1 / sqrt(1 - (1 - 0.4)^2) = 1 / sqrt(1 - 0.36) = 1.25
// If programmed fz = 0.1mm, adjusted fz = 0.125mm
```

---

## A.6 LOOKUP FUNCTIONS

```javascript
/**
 * Get Taylor constants for material-tool combination
 */
function getTaylorConstants(materialClass, toolMaterial) {
  const matData = TAYLOR_CONSTANTS[materialClass];
  if (!matData) {
    console.warn(`Unknown material class: ${materialClass}`);
    return TAYLOR_CONSTANTS['steel_medium_carbon']['Carbide_TiAlN']; // Default
  }
  
  const toolData = matData[toolMaterial];
  if (!toolData) {
    // Find closest tool material
    const tools = Object.keys(matData);
    console.warn(`Tool ${toolMaterial} not found, using ${tools[0]}`);
    return matData[tools[0]];
  }
  
  return toolData;
}

/**
 * Get Kienzle constants for specific material
 */
function getKienzleConstants(materialGrade) {
  const data = KIENZLE_CONSTANTS[materialGrade];
  if (!data) {
    console.warn(`Unknown material: ${materialGrade}, using SAE1045`);
    return KIENZLE_CONSTANTS['SAE1045'];
  }
  return data;
}

/**
 * Get Johnson-Cook constants for material
 */
function getJohnsonCookConstants(material) {
  const data = JOHNSON_COOK_CONSTANTS[material];
  if (!data) {
    console.warn(`Unknown material: ${material}, using AISI1045`);
    return JOHNSON_COOK_CONSTANTS['AISI1045'];
  }
  return data;
}
```

---

# DOCUMENT END

**Skill:** prism-material-physics
**Version:** 1.0
**Total Sections:** 7
**Part of:** SP.3 Materials System (SP.3.2 of 5)
**Created:** Session SP.3.2
**Status:** COMPLETE

**Key Models Covered:**
1. Kienzle Cutting Force - Complete with corrections
2. Johnson-Cook Constitutive - Flow stress for FEA
3. Taylor Tool Life - Extended equation with feed/DOC
4. Thermal Models - Heat generation and partition
5. Surface Finish - Ra prediction
6. Chip Formation - Type classification

**Principle:** Every formula traces back to material parameters from prism-material-schema.

---
