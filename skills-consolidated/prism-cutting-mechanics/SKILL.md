---
name: prism-cutting-mechanics
description: |
  Cutting mechanics and force prediction for PRISM Manufacturing Intelligence.
  Merchant analysis, Kienzle model, milling forces, tool life prediction.
  
  Modules Covered:
  - PRISM_CUTTING_MECHANICS_ENGINE (Merchant, Kienzle, Milling forces)
  - PRISM_TOOL_LIFE_ENGINE (Taylor equation, extended models)
  - Specific cutting energy database
  
  Total: ~900 lines
  Gateway Routes: cutting.*, toollife.*
  Academic Source: MIT 2.008, Merchant 1945, Shaw Metal Cutting, Taylor 1907
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cutting", "mechanics", "force", "prediction", "manufacturing", "intelligence", "merchant"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cutting-mechanics")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-cutting-mechanics") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What cutting parameters for 316 stainless?"
→ Load skill: skill_content("prism-cutting-mechanics") → Extract relevant cutting data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot mechanics issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM CUTTING MECHANICS
## Force Prediction, Chip Formation, and Tool Life
# 1. MERCHANT'S ORTHOGONAL CUTTING

## 1.1 Theory and Equations

Merchant's minimum energy criterion (1945) predicts shear plane angle in orthogonal cutting.

**Key Parameters:**
- α = Rake angle (radians)
- β = Friction angle = arctan(μ)
- φ = Shear angle
- h = Uncut chip thickness
- b = Width of cut
- τ_s = Shear strength of workpiece

**Merchant's Shear Angle:**
```
φ = π/4 - (β - α)/2
```

**Lee-Shaffer Alternative:**
```
φ = π/4 - β + α
```

## 1.2 Implementation

```javascript
/**
 * Merchant's orthogonal cutting analysis
 * Gateway: cutting.merchant
 * Source: MIT 2.008, Merchant 1945
 * 
 * @param {Object} params - Cutting parameters
 * @param {number} params.chipThickness - Uncut chip thickness h (mm)
 * @param {number} params.width - Width of cut b (mm)
 * @param {number} params.rakeAngle - Rake angle α (radians)
 * @param {number} params.shearStrength - Shear strength τ_s (MPa)
 * @param {number} [params.frictionCoeff=0.5] - Coefficient of friction μ
 * @returns {Object} Complete force analysis
 */
function merchantAnalysis(params) {
  const {
    chipThickness: h,
    width: b,
    rakeAngle: alpha,
    shearStrength: tau_s,
    frictionCoeff: mu = 0.5
  } = params;
  
  // Friction angle β = arctan(μ)
  const beta = Math.atan(mu);
  
  // Merchant's shear angle: φ = π/4 - (β - α)/2
  const phi = Math.PI / 4 - (beta - alpha) / 2;
  
  // Lee-Shaffer: φ = π/4 - β + α
  const phi_LS = Math.PI / 4 - beta + alpha;
  
  // Chip ratio (cutting ratio): r_c = cos(φ-α) / cos(α)
  const r_c = Math.cos(phi - alpha) / Math.cos(alpha);
  
  // Chip thickness: h_c = h / r_c
  const h_c = h / r_c;
  
  // Shear plane area: A_s = (b × h) / sin(φ)
  const A_s = (b * h) / Math.sin(phi);
  
  // Shear force: F_s = τ_s × A_s
  const F_s = tau_s * A_s;
  
  // Resultant force: R = F_s / cos(φ + β - α)
  const R = F_s / Math.cos(phi + beta - alpha);
  
  // Cutting force (tangential): F_c = R × cos(β - α)
  const F_c = R * Math.cos(beta - alpha);
  
  // Thrust force (feed direction): F_t = R × sin(β - α)
  const F_t = R * Math.sin(beta - alpha);
  
  // Friction force (on rake face): F_f = R × sin(β)
  const F_f = R * Math.sin(beta);
  
  // Normal force (on rake face): F_n = R × cos(β)
  const F_n = R * Math.cos(beta);
  
  // Specific cutting energy: u_c = F_c / (b × h) [MPa]
  const u_c = F_c / (b * h);
  
  return {
    shearAngle_rad: phi,
    shearAngle_deg: phi * 180 / Math.PI,
    frictionAngle_deg: beta * 180 / Math.PI,
    chipRatio: r_c,
    chipThickness_mm: h_c,
    chipCompressionRatio: 1 / r_c,
    shearPlaneArea_mm2: A_s,
    forces: {
      shear_N: F_s,
      resultant_N: R,
      cutting_N: F_c,
      thrust_N: F_t,
      friction_N: F_f,
      normal_N: F_n
    },
    specificCuttingEnergy_MPa: u_c,
    leeShaffer_phi_deg: phi_LS * 180 / Math.PI
  };
}
```

## 1.3 Typical Values

| Material | τ_s (MPa) | Typical μ | Typical φ (°) |
|----------|-----------|-----------|---------------|
| Aluminum 6061 | 150 | 0.3-0.4 | 30-35 |
| Steel 1045 | 450 | 0.5-0.6 | 20-25 |
| Stainless 304 | 480 | 0.6-0.7 | 18-22 |
| Ti-6Al-4V | 600 | 0.4-0.5 | 25-30 |
| Inconel 718 | 700 | 0.5-0.6 | 15-20 |
# 2. KIENZLE FORCE MODEL

## 2.1 Theory

Kienzle model accounts for size effect where specific cutting force increases with decreasing chip thickness.

**Kienzle Equation:**
```
F_c = K_c × b × h
K_c = K_c1.1 × h^(-m_c)
```

Where:
- K_c1.1 = Specific cutting force at h=1mm, b=1mm (N/mm²)
- m_c = Material exponent (typically 0.20-0.30)
- h = Chip thickness (mm)
- b = Width of cut (mm)

## 2.2 Implementation

```javascript
/**
 * Kienzle cutting force model with size effect
 * Gateway: cutting.kienzle
 * 
 * @param {Object} params - Cutting parameters
 * @param {number} params.chipThickness - Uncut chip thickness h (mm)
 * @param {number} params.width - Width of cut b (mm)
 * @param {number} params.Kc1_1 - Specific cutting force at h=1mm (N/mm²)
 * @param {number} [params.mc=0.25] - Kienzle exponent
 * @returns {Object} Force calculation results
 */
function kienzleForce(params) {
  const {
    chipThickness: h,
    width: b,
    Kc1_1,
    mc = 0.25
  } = params;
  
  // Size effect correction
  const sizeEffectFactor = Math.pow(h, -mc);
  
  // Specific cutting force
  const Kc = Kc1_1 * sizeEffectFactor;
  
  // Main cutting force
  const Fc = Kc * b * h;
  
  // Chip area
  const chipArea = b * h;
  
  return {
    specificCuttingForce_N_mm2: Kc,
    cuttingForce_N: Fc,
    chipArea_mm2: chipArea,
    Kc1_1,
    exponent_mc: mc,
    sizeEffectFactor
  };
}
```

## 2.3 Kienzle Constants Database

| Material | K_c1.1 (N/mm²) | m_c | Notes |
|----------|----------------|-----|-------|
| **ALUMINUM** | | | |
| Al 6061-T6 | 700 | 0.25 | General purpose |
| Al 7075-T6 | 900 | 0.25 | Aerospace |
| Al 2024-T351 | 850 | 0.26 | Aerospace |
| Al Cast (356) | 550 | 0.23 | Casting |
| **STEEL** | | | |
| Steel 1018 | 1800 | 0.25 | Low carbon |
| Steel 1045 | 2200 | 0.26 | Medium carbon |
| Steel 4140 | 2500 | 0.27 | Alloy |
| Steel 4340 | 2800 | 0.28 | High strength |
| Steel D2 | 3200 | 0.22 | Tool steel |
| Steel H13 | 2900 | 0.24 | Tool steel |
| **STAINLESS** | | | |
| SS 304 | 2400 | 0.23 | Austenitic |
| SS 316 | 2600 | 0.24 | Austenitic |
| SS 17-4PH | 2800 | 0.25 | PH |
| SS 2205 | 2700 | 0.26 | Duplex |
| **TITANIUM** | | | |
| Ti Grade 2 | 1500 | 0.20 | Pure |
| Ti-6Al-4V | 1800 | 0.22 | Alpha-Beta |
| Ti-5553 | 2000 | 0.23 | Beta |
| **SUPERALLOYS** | | | |
| Inconel 718 | 3200 | 0.20 | Nickel |
| Inconel 625 | 3000 | 0.21 | Nickel |
| Waspaloy | 3400 | 0.19 | Nickel |
| Hastelloy X | 2900 | 0.22 | Nickel |
| **CAST IRON** | | | |
| Gray Iron | 1200 | 0.28 | Class 30 |
| Ductile Iron | 1500 | 0.26 | 65-45-12 |
| CGI | 1400 | 0.27 | Compacted |
| **OTHER** | | | |
| Brass | 800 | 0.20 | C36000 |
| Copper | 1000 | 0.22 | C11000 |
| Bronze | 900 | 0.21 | C93200 |
# 3. MILLING FORCE ANALYSIS

## 3.1 Time-Varying Forces in End Milling

```javascript
/**
 * Complete milling force model with tooth engagement
 * Gateway: cutting.milling
 * 
 * @param {Object} tool - Tool geometry
 * @param {Object} params - Cutting conditions
 * @returns {Object} Time-varying force profile
 */
function millingForces(tool, params) {
  const {
    diameter: D,
    teeth: z,
    helixAngle = 30,
    rakeAngle = 10
  } = tool;
  
  const {
    rpm,
    feedPerTooth: f_z,    // mm/tooth
    axialDepth: a_p,      // mm
    radialDepth: a_e,     // mm
    Ktc,                  // Tangential specific force (N/mm²)
    Krc = 0.3 * Ktc,      // Radial specific force
    Kac = 0.1 * Ktc,      // Axial specific force
    direction = 'climb'   // 'climb' or 'conventional'
  } = params;
  
  const R = D / 2;
  const radialImmersion = a_e / D;
  
  // Entry and exit angles depend on milling direction
  let phi_st, phi_ex;
  if (direction === 'climb') {
    // Down milling (climb)
    phi_st = Math.acos(1 - 2 * radialImmersion);
    phi_ex = Math.PI;
  } else {
    // Up milling (conventional)
    phi_st = 0;
    phi_ex = Math.acos(1 - 2 * radialImmersion);
  }
  
  // Generate force profile (360 points per revolution)
  const points = 360;
  const forces = [];
  
  for (let i = 0; i < points; i++) {
    const phi = (i / points) * 2 * Math.PI;
    let Fx = 0, Fy = 0, Fz = 0;
    
    // Sum contributions from each tooth
    for (let tooth = 0; tooth < z; tooth++) {
      const phi_tooth = phi + tooth * (2 * Math.PI / z);
      const phi_mod = phi_tooth % (2 * Math.PI);
      
      // Check if tooth is engaged
      if (phi_mod >= phi_st && phi_mod <= phi_ex) {
        // Instantaneous chip thickness
        const h = f_z * Math.sin(phi_mod);
        
        if (h > 0) {
          // Force components
          const Ft = Ktc * a_p * h;  // Tangential
          const Fr = Krc * a_p * h;  // Radial
          const Fa = Kac * a_p * h;  // Axial
          
          // Transform to workpiece XYZ
          Fx += -Ft * Math.cos(phi_mod) - Fr * Math.sin(phi_mod);
          Fy += Ft * Math.sin(phi_mod) - Fr * Math.cos(phi_mod);
          Fz += Fa;
        }
      }
    }
    
    forces.push({
      angle_deg: i,
      Fx, Fy, Fz,
      magnitude: Math.sqrt(Fx*Fx + Fy*Fy + Fz*Fz)
    });
  }
  
  // Statistics
  const Fx_max = Math.max(...forces.map(f => Math.abs(f.Fx)));
  const Fy_max = Math.max(...forces.map(f => Math.abs(f.Fy)));
  const Fz_max = Math.max(...forces.map(f => Math.abs(f.Fz)));
  const Fx_avg = forces.reduce((s, f) => s + Math.abs(f.Fx), 0) / points;
  const Fy_avg = forces.reduce((s, f) => s + Math.abs(f.Fy), 0) / points;
  
  // Power calculation
  const V_c = Math.PI * D * rpm / 1000;  // m/min
  const P_avg = (Fx_avg * V_c / 60) / 1000;  // kW
  
  return {
    forceProfile: forces,
    maxForces: { Fx: Fx_max, Fy: Fy_max, Fz: Fz_max },
    avgForces: { Fx: Fx_avg, Fy: Fy_avg },
    engagement: {
      entry_deg: phi_st * 180 / Math.PI,
      exit_deg: phi_ex * 180 / Math.PI,
      arc_deg: (phi_ex - phi_st) * 180 / Math.PI
    },
    power_kW: P_avg,
    torque_Nm: (P_avg * 1000 * 60) / (2 * Math.PI * rpm)
  };
}
```

## 3.2 Cutting Force Coefficients

| Material | Ktc (N/mm²) | Krc/Ktc | Kac/Ktc |
|----------|-------------|---------|---------|
| Aluminum | 800 | 0.25 | 0.10 |
| Steel 1045 | 2000 | 0.30 | 0.10 |
| Stainless 304 | 2400 | 0.35 | 0.12 |
| Ti-6Al-4V | 1900 | 0.30 | 0.15 |
| Inconel 718 | 3000 | 0.35 | 0.15 |
# 4. TAYLOR TOOL LIFE

## 4.1 Taylor Equation

**Basic Taylor (1907):**
```
V × T^n = C
```

**Extended Taylor:**
```
V × T^n × f^m × d^p = C
```

Where:
- V = Cutting speed (m/min)
- T = Tool life (minutes)
- f = Feed rate (mm/rev)
- d = Depth of cut (mm)
- n, m, p = Material/tool exponents
- C = Taylor constant

## 4.2 Implementation

```javascript
/**
 * Taylor tool life prediction
 * Gateway: toollife.taylor
 * 
 * @param {Object} params - Cutting parameters
 * @returns {Object} Tool life prediction
 */
function taylorToolLife(params) {
  const {
    cuttingSpeed: V,      // m/min
    feed: f = null,       // mm/rev (optional for extended)
    depth: d = null,      // mm (optional for extended)
    n = 0.25,             // Speed exponent
    C = 200,              // Taylor constant
    m = null,             // Feed exponent (extended)
    p = null              // Depth exponent (extended)
  } = params;
  
  let T;
  
  if (f !== null && d !== null && m !== null && p !== null) {
    // Extended Taylor: T = (C / V)^(1/n) × f^(-m/n) × d^(-p/n)
    T = Math.pow(C / V, 1/n) * Math.pow(f, -m/n) * Math.pow(d, -p/n);
  } else {
    // Basic Taylor: T = (C / V)^(1/n)
    T = Math.pow(C / V, 1/n);
  }
  
  return {
    toolLife_min: T,
    toolLife_hr: T / 60,
    cuttingSpeed_m_min: V,
    taylorConstant: C,
    exponent_n: n,
    equation: f ? 'Extended Taylor' : 'Basic Taylor'
  };
}

/**
 * Calculate cutting speed for target tool life
 */
function speedForToolLife(params) {
  const {
    targetLife: T,   // minutes
    n = 0.25,
    C = 200
  } = params;
  
  // V = C / T^n
  const V = C / Math.pow(T, n);
  
  return {
    cuttingSpeed_m_min: V,
    targetToolLife_min: T,
    taylorConstant: C,
    exponent_n: n
  };
}
```

## 4.3 Taylor Constants Database

| Tool-Material Combination | n | C (m/min) | Typical V for T=15min |
|---------------------------|---|-----------|----------------------|
| **HSS Tools** | | | |
| HSS → Aluminum | 0.10 | 350 | 200 |
| HSS → Steel 1045 | 0.125 | 70 | 35 |
| HSS → Stainless 304 | 0.10 | 35 | 20 |
| **Carbide Uncoated** | | | |
| Carbide → Aluminum | 0.20 | 600 | 300 |
| Carbide → Steel 1045 | 0.25 | 300 | 150 |
| Carbide → Stainless 304 | 0.20 | 150 | 75 |
| Carbide → Ti-6Al-4V | 0.20 | 100 | 50 |
| **Carbide Coated** | | | |
| TiAlN → Steel 1045 | 0.25 | 400 | 200 |
| TiAlN → Stainless 304 | 0.22 | 200 | 100 |
| TiAlN → Ti-6Al-4V | 0.20 | 130 | 65 |
| TiAlN → Inconel 718 | 0.18 | 80 | 40 |
| **Ceramic** | | | |
| Ceramic → Cast Iron | 0.30 | 800 | 400 |
| Ceramic → Hard Steel | 0.25 | 500 | 250 |
| **CBN** | | | |
| CBN → Hardened Steel | 0.30 | 400 | 200 |
| CBN → Cast Iron | 0.35 | 600 | 300 |
# 5. SPECIFIC CUTTING ENERGY DATABASE

## 5.1 Quick Lookup Function

```javascript
/**
 * Get specific cutting force data for material
 * Gateway: cutting.materialData
 * 
 * @param {string} material - Material identifier
 * @returns {Object} Cutting force constants
 */
function getMaterialCuttingData(material) {
  const database = {
    // Aluminum
    'aluminum_6061': { Kc1_1: 700, mc: 0.25, tau_s: 150, Ktc: 800 },
    'aluminum_7075': { Kc1_1: 900, mc: 0.25, tau_s: 220, Ktc: 950 },
    'aluminum_2024': { Kc1_1: 850, mc: 0.26, tau_s: 200, Ktc: 900 },
    
    // Steel
    'steel_1018': { Kc1_1: 1800, mc: 0.25, tau_s: 350, Ktc: 1700 },
    'steel_1045': { Kc1_1: 2200, mc: 0.26, tau_s: 450, Ktc: 2000 },
    'steel_4140': { Kc1_1: 2500, mc: 0.27, tau_s: 520, Ktc: 2300 },
    'steel_4340': { Kc1_1: 2800, mc: 0.28, tau_s: 580, Ktc: 2600 },
    
    // Stainless
    'stainless_304': { Kc1_1: 2400, mc: 0.23, tau_s: 480, Ktc: 2400 },
    'stainless_316': { Kc1_1: 2600, mc: 0.24, tau_s: 510, Ktc: 2600 },
    'stainless_17-4ph': { Kc1_1: 2800, mc: 0.25, tau_s: 550, Ktc: 2800 },
    
    // Titanium
    'titanium_grade2': { Kc1_1: 1500, mc: 0.20, tau_s: 400, Ktc: 1600 },
    'titanium_ti6al4v': { Kc1_1: 1800, mc: 0.22, tau_s: 600, Ktc: 1900 },
    
    // Superalloys
    'inconel_718': { Kc1_1: 3200, mc: 0.20, tau_s: 700, Ktc: 3000 },
    'inconel_625': { Kc1_1: 3000, mc: 0.21, tau_s: 650, Ktc: 2800 },
    
    // Cast Iron
    'cast_iron_gray': { Kc1_1: 1200, mc: 0.28, tau_s: 280, Ktc: 1100 },
    'cast_iron_ductile': { Kc1_1: 1500, mc: 0.26, tau_s: 350, Ktc: 1400 },
    
    // Copper alloys
    'brass': { Kc1_1: 800, mc: 0.20, tau_s: 180, Ktc: 750 },
    'copper': { Kc1_1: 1000, mc: 0.22, tau_s: 200, Ktc: 950 }
  };
  
  const key = material.toLowerCase().replace(/[\s-]/g, '_');
  return database[key] || { Kc1_1: 2000, mc: 0.25, tau_s: 400, Ktc: 1800 };
}
```
# 6. POWER AND TORQUE

## 6.1 Calculation Functions

```javascript
/**
 * Calculate spindle power requirement
 * Gateway: cutting.power
 * 
 * @param {Object} params - Force and speed parameters
 * @returns {Object} Power calculation
 */
function calculatePower(params) {
  const {
    cuttingForce: Fc,       // N
    cuttingSpeed: V,        // m/min (or rpm + diameter)
    rpm = null,
    diameter = null,
    efficiency = 0.85       // Machine efficiency
  } = params;
  
  // Calculate cutting speed if rpm and diameter provided
  let V_calc = V;
  if (rpm && diameter) {
    V_calc = Math.PI * diameter * rpm / 1000;  // m/min
  }
  
  // Cutting power: P_c = F_c × V_c / 60000 (kW)
  const P_c = (Fc * V_calc) / 60000;
  
  // Required spindle power (accounting for efficiency)
  const P_spindle = P_c / efficiency;
  
  // Torque: T = P × 60000 / (2π × rpm)
  let torque = null;
  if (rpm) {
    torque = (P_c * 60000) / (2 * Math.PI * rpm);  // Nm
  }
  
  return {
    cuttingPower_kW: P_c,
    cuttingPower_hp: P_c * 1.341,
    spindlePower_kW: P_spindle,
    spindlePower_hp: P_spindle * 1.341,
    torque_Nm: torque,
    machineEfficiency: efficiency
  };
}

/**
 * Quick MRR and power estimate
 * Gateway: cutting.mrr
 */
function materialRemovalRate(params) {
  const {
    cuttingSpeed: V,        // m/min
    feed: f,                // mm/rev or mm/tooth
    depth: d,               // mm (radial for milling)
    axialDepth: ap = null,  // mm (for milling)
    teeth: z = 1,           // Number of teeth
    Kc = 2000               // Specific cutting energy (N/mm²)
  } = params;
  
  // MRR for turning: V × f × d (mm³/s converted from m×mm×mm/min)
  // MRR for milling: f_z × z × rpm × ap × ae
  
  let MRR;  // mm³/min
  if (ap !== null) {
    // Milling: approximate
    const rpm_approx = (V * 1000) / (Math.PI * 2 * d);  // Assuming d=diameter/2
    MRR = f * z * rpm_approx * ap * d;
  } else {
    // Turning
    MRR = (V * 1000) * f * d;  // mm³/min
  }
  
  // Power from MRR: P = Kc × MRR / 60000000
  const P_c = (Kc * MRR) / 60000000;  // kW
  
  return {
    mrr_mm3_min: MRR,
    mrr_cm3_min: MRR / 1000,
    mrr_in3_min: MRR / 16387,
    estimatedPower_kW: P_c,
    estimatedPower_hp: P_c * 1.341
  };
}
```
## GATEWAY ROUTE SUMMARY

| Route | Function | Description |
|-------|----------|-------------|
| `cutting.merchant` | merchantAnalysis() | Orthogonal cutting analysis |
| `cutting.kienzle` | kienzleForce() | Kienzle force model |
| `cutting.milling` | millingForces() | Milling force profile |
| `cutting.materialData` | getMaterialCuttingData() | Material constants lookup |
| `cutting.power` | calculatePower() | Power calculation |
| `cutting.mrr` | materialRemovalRate() | MRR and power estimate |
| `toollife.taylor` | taylorToolLife() | Tool life prediction |
| `toollife.speed` | speedForToolLife() | Speed for target life |
## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| CUT-1001 | Invalid chip thickness | Ensure h > 0 |
| CUT-1002 | Invalid rake angle | Use radians, typical -10° to +20° |
| CUT-1003 | Material not found | Use getMaterialCuttingData() |
| CUT-1004 | Force calculation failed | Check input parameters |
| TL-2001 | Invalid Taylor exponent | Use n between 0.1 and 0.4 |
| TL-2002 | Tool life overflow | Reduce cutting speed |
**END OF PRISM CUTTING MECHANICS SKILL**
**Version 1.0 | Level 4 Reference | ~900 Lines**
**Academic Source: MIT 2.008, Merchant 1945, Shaw Metal Cutting, Taylor 1907**
