---
name: prism-material-physics
description: |
  Physics formulas using material parameters. Kienzle, Johnson-Cook, Taylor equations.
---

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
