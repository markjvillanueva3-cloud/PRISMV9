---
name: prism-material-enhancer
description: |
  Enhancement workflows to achieve 100% parameter coverage for PRISM v9.0.
  Use when: Filling gaps identified by validator, estimating missing parameters,
  upgrading material grades from D/F to A/B.
  Provides: Enhancement sources hierarchy, estimation formulas, similar material
  interpolation, confidence tracking, batch enhancement workflows.
  Key principle: Estimated data with uncertainty beats missing data.
  Part of SP.3 Materials System.
---
# PRISM-MATERIAL-ENHANCER
## Enhancement Workflows for 100% Parameter Coverage
### Version 1.0 | Materials System | ~20KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides **systematic workflows** to fill parameter gaps identified by prism-material-validator. The goal is achieving 100% coverage with appropriate confidence levels.

**Enhancement Scenarios:**
1. **Missing Required** - Must fill to enable calculations
2. **Missing Recommended** - Should fill for full functionality
3. **Low Coverage** - Upgrade D/F grades to A/B
4. **New Material** - Build complete profile from partial data

## 1.2 The Enhancement Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MATERIAL ENHANCEMENT PHILOSOPHY                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: ESTIMATED > MISSING                                                       │
│  ─────────────────────────────────                                                      │
│  A calculation with estimated data (marked as such) is infinitely                       │
│  more useful than a calculation that can't run. Fill gaps.                              │
│                                                                                         │
│  PRINCIPLE 2: SOURCE HIERARCHY MATTERS                                                  │
│  ─────────────────────────────────────                                                  │
│  Handbook > Literature > Similar Material > Calculated > Estimated.                     │
│  Always use the highest-quality source available.                                       │
│                                                                                         │
│  PRINCIPLE 3: TRACK CONFIDENCE                                                          │
│  ─────────────────────────────────────                                                  │
│  Every enhanced parameter must have a confidence level and source.                      │
│  Users need to know what to trust.                                                      │
│                                                                                         │
│  PRINCIPLE 4: VALIDATE AFTER ENHANCEMENT                                                │
│  ─────────────────────────────────────                                                  │
│  Always re-run validator after enhancement. Estimated values                            │
│  must still pass physics checks.                                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Source Hierarchy

| Priority | Source Type | Confidence | When to Use |
|----------|-------------|------------|-------------|
| **1** | Handbook (ASM, Machining Data) | HIGH | Primary source, always prefer |
| **2** | Peer-reviewed literature | HIGH | When handbook lacks data |
| **3** | Manufacturer datasheet | MEDIUM-HIGH | Product-specific values |
| **4** | Similar material interpolation | MEDIUM | Known similar material exists |
| **5** | Physics-based calculation | MEDIUM | Derivable from other params |
| **6** | Family average | LOW-MEDIUM | Use family typical values |
| **7** | Category estimate | LOW | Last resort, wide uncertainty |

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "enhance material", "fill gaps"
- "estimate parameters", "missing data"
- "upgrade grade", "improve coverage"
- "complete material", "100% coverage"

**Contextual Triggers:**
- Validator returns grade D or F
- Missing parameters block calculations
- Importing partial material data
- Preparing material for production use

## 1.5 Position in SP.3 Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SP.3 MATERIALS SYSTEM                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.3.1              SP.3.3              SP.3.4              SP.3.5                      │
│  ┌────────┐         ┌────────┐         ┌────────┐         ┌────────┐                    │
│  │ SCHEMA │         │ LOOKUP │────────▶│VALIDATE│────────▶│ENHANCE │◀── THIS            │
│  │        │         │        │         │        │         │        │                    │
│  └────────┘         └────────┘         └────────┘         └────────┘                    │
│       │                                     │                  │                        │
│       │                                     │   gaps found     │  fills gaps            │
│       │                                     └──────────────────┘                        │
│       │                                                        │                        │
│       └────────────────────────────────────────────────────────┘                        │
│                          validates enhanced values                                      │
│                                                                                         │
│  ENHANCEMENT LOOP:                                                                      │
│  1. VALIDATOR identifies missing parameters                                             │
│  2. ENHANCER fills gaps from best available source                                      │
│  3. VALIDATOR re-checks (must pass physics)                                             │
│  4. Repeat until grade target achieved                                                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: ENHANCEMENT SOURCES AND METHODS

## 2.1 Handbook Sources

Primary authoritative sources for material data:

```javascript
const HANDBOOK_SOURCES = {
  'ASM_METALS_HANDBOOK': {
    name: 'ASM Metals Handbook',
    confidence: 'HIGH',
    covers: ['mechanical', 'thermal', 'physical', 'machinability'],
    volumes: {
      1: 'Properties and Selection: Irons, Steels',
      2: 'Properties and Selection: Nonferrous',
      16: 'Machining'
    }
  },
  'MACHINING_DATA_HANDBOOK': {
    name: 'Machining Data Handbook (Metcut)',
    confidence: 'HIGH',
    covers: ['kienzle', 'taylor', 'machinability', 'surface'],
    edition: '3rd Edition'
  },
  'MATWEB': {
    name: 'MatWeb Material Property Data',
    confidence: 'MEDIUM-HIGH',
    covers: ['mechanical', 'thermal', 'physical'],
    url: 'https://www.matweb.com'
  },
  'TOTAL_MATERIA': {
    name: 'Total Materia Database',
    confidence: 'HIGH',
    covers: ['all'],
    notes: 'Comprehensive but requires subscription'
  }
};
```

## 2.2 Similar Material Lookup

Find similar materials to interpolate from:

```javascript
/**
 * Find best similar material for parameter estimation
 * @param material - Material missing parameters
 * @param missingParams - Parameters to estimate
 * @returns Similar material with those parameters
 */
function findBestSimilarMaterial(material, missingParams) {
  // 1. Check explicit similar_materials list first
  if (material.similar_materials?.length > 0) {
    for (const similarId of material.similar_materials) {
      const similar = getMaterialById(similarId);
      if (similar && hasAllParameters(similar, missingParams)) {
        return { material: similar, source: 'explicit_similar', confidence: 'MEDIUM' };
      }
    }
  }
  
  // 2. Find by same family + similar hardness
  const familyMatches = getMaterialsByFamily(material.family)
    .filter(m => m.id !== material.id)
    .filter(m => hasAllParameters(m, missingParams))
    .map(m => ({
      material: m,
      score: calculateSimilarityScore(material, m)
    }))
    .sort((a, b) => b.score - a.score);
  
  if (familyMatches.length > 0 && familyMatches[0].score > 0.7) {
    return { 
      material: familyMatches[0].material, 
      source: 'family_match',
      confidence: 'MEDIUM',
      score: familyMatches[0].score
    };
  }
  
  // 3. Fall back to category average
  return { material: null, source: 'no_match', confidence: 'LOW' };
}

/**
 * Calculate similarity score for interpolation
 */
function calculateSimilarityScore(mat1, mat2) {
  let score = 0;
  
  // Hardness similarity (±5 HRC = full points)
  const h1 = mat1.mechanical?.hardness_hrc || 0;
  const h2 = mat2.mechanical?.hardness_hrc || 0;
  const hardnessDiff = Math.abs(h1 - h2);
  score += Math.max(0, 0.4 * (1 - hardnessDiff / 20));
  
  // Tensile similarity (±100 MPa = full points)
  const t1 = mat1.mechanical?.tensile_strength || 0;
  const t2 = mat2.mechanical?.tensile_strength || 0;
  const tensileDiff = Math.abs(t1 - t2);
  score += Math.max(0, 0.3 * (1 - tensileDiff / 500));
  
  // Same family bonus
  if (mat1.family === mat2.family) score += 0.2;
  
  // Same ISO class bonus
  if (mat1.iso_p_class === mat2.iso_p_class) score += 0.1;
  
  return score;
}
```

## 2.3 Family Averages

Pre-computed averages by material family:

```javascript
const FAMILY_AVERAGES = {
  CARBON_STEEL: {
    'mechanical.elastic_modulus': 207,
    'mechanical.poisson_ratio': 0.29,
    'thermal.thermal_conductivity': 50,
    'thermal.specific_heat': 486,
    'physical.density': 7850,
    'kienzle.mc': 0.26,
    'taylor.n_carbide': 0.25
  },
  ALLOY_STEEL: {
    'mechanical.elastic_modulus': 210,
    'mechanical.poisson_ratio': 0.29,
    'thermal.thermal_conductivity': 42,
    'thermal.specific_heat': 475,
    'physical.density': 7850,
    'kienzle.mc': 0.26,
    'taylor.n_carbide': 0.25
  },
  STAINLESS_AUSTENITIC: {
    'mechanical.elastic_modulus': 193,
    'mechanical.poisson_ratio': 0.29,
    'thermal.thermal_conductivity': 16,
    'thermal.specific_heat': 500,
    'physical.density': 8000,
    'kienzle.mc': 0.22,
    'taylor.n_carbide': 0.22
  },
  ALUMINUM_WROUGHT: {
    'mechanical.elastic_modulus': 70,
    'mechanical.poisson_ratio': 0.33,
    'thermal.thermal_conductivity': 170,
    'thermal.specific_heat': 900,
    'physical.density': 2700,
    'kienzle.mc': 0.30,
    'taylor.n_carbide': 0.35
  },
  TITANIUM_ALPHA_BETA: {
    'mechanical.elastic_modulus': 114,
    'mechanical.poisson_ratio': 0.34,
    'thermal.thermal_conductivity': 7,
    'thermal.specific_heat': 560,
    'physical.density': 4430,
    'kienzle.mc': 0.21,
    'taylor.n_carbide': 0.20
  }
};

/**
 * Get family average for a parameter
 */
function getFamilyAverage(family, parameter) {
  const familyData = FAMILY_AVERAGES[family];
  if (!familyData) return null;
  return familyData[parameter] || null;
}
```

## 2.4 Enhancement Method Selection

```javascript
/**
 * Select best enhancement method for a parameter
 * @param material - Material to enhance
 * @param parameter - Parameter to fill
 * @returns Enhancement method and value
 */
function selectEnhancementMethod(material, parameter) {
  // 1. Try physics-based calculation first
  const calculated = tryCalculateParameter(material, parameter);
  if (calculated.success) {
    return {
      method: 'calculated',
      value: calculated.value,
      confidence: 'MEDIUM',
      formula: calculated.formula,
      source: 'physics_derivation'
    };
  }
  
  // 2. Try similar material interpolation
  const similar = findBestSimilarMaterial(material, [parameter]);
  if (similar.material) {
    const value = getParameterValue(similar.material, parameter);
    return {
      method: 'similar_material',
      value,
      confidence: similar.confidence,
      source: `interpolated_from_${similar.material.id}`,
      similarity: similar.score
    };
  }
  
  // 3. Fall back to family average
  const familyAvg = getFamilyAverage(material.family, parameter);
  if (familyAvg !== null) {
    return {
      method: 'family_average',
      value: familyAvg,
      confidence: 'LOW',
      source: `${material.family}_average`
    };
  }
  
  // 4. Cannot enhance
  return {
    method: 'none',
    value: null,
    confidence: 'NONE',
    source: 'no_source_available'
  };
}
```

---

# SECTION 3: PARAMETER ESTIMATION FORMULAS

## 3.1 Physics-Based Derivations

Many parameters can be calculated from others:

```javascript
const DERIVATION_FORMULAS = {
  // Mechanical derivations
  'mechanical.shear_modulus': {
    requires: ['mechanical.elastic_modulus', 'mechanical.poisson_ratio'],
    formula: (mat) => {
      const E = mat.mechanical.elastic_modulus;
      const nu = mat.mechanical.poisson_ratio;
      return E / (2 * (1 + nu));
    },
    confidence: 'HIGH',
    note: 'G = E / 2(1+ν) - exact relationship'
  },
  
  'mechanical.bulk_modulus': {
    requires: ['mechanical.elastic_modulus', 'mechanical.poisson_ratio'],
    formula: (mat) => {
      const E = mat.mechanical.elastic_modulus;
      const nu = mat.mechanical.poisson_ratio;
      return E / (3 * (1 - 2 * nu));
    },
    confidence: 'HIGH',
    note: 'K = E / 3(1-2ν) - exact relationship'
  },
  
  'mechanical.shear_strength': {
    requires: ['mechanical.tensile_strength'],
    formula: (mat) => mat.mechanical.tensile_strength * 0.6,
    confidence: 'MEDIUM',
    note: 'Approximation: τ ≈ 0.6 × σ_tensile'
  },
  
  'mechanical.fatigue_strength': {
    requires: ['mechanical.tensile_strength'],
    formula: (mat) => mat.mechanical.tensile_strength * 0.45,
    confidence: 'LOW',
    note: 'Rough estimate: σ_fatigue ≈ 0.45 × σ_tensile for steels'
  },

  // Thermal derivations
  'thermal.thermal_diffusivity': {
    requires: ['thermal.thermal_conductivity', 'thermal.specific_heat', 'physical.density'],
    formula: (mat) => {
      const k = mat.thermal.thermal_conductivity;
      const cp = mat.thermal.specific_heat;
      const rho = mat.physical.density;
      return (k * 1e6) / (rho * cp);  // mm²/s
    },
    confidence: 'HIGH',
    note: 'α = k / (ρ × cp) - exact relationship'
  },

  // Kienzle derivations
  'kienzle.kc1_1_turning': {
    requires: ['kienzle.kc1_1'],
    formula: (mat) => mat.kienzle.kc1_1,
    confidence: 'HIGH',
    note: 'Default: same as base kc1.1'
  },
  
  'kienzle.kc1_1_milling': {
    requires: ['kienzle.kc1_1'],
    formula: (mat) => mat.kienzle.kc1_1 * 1.1,
    confidence: 'MEDIUM',
    note: 'Milling typically 10% higher due to interrupted cut'
  },
  
  'kienzle.kc1_1_drilling': {
    requires: ['kienzle.kc1_1'],
    formula: (mat) => mat.kienzle.kc1_1 * 1.2,
    confidence: 'MEDIUM',
    note: 'Drilling typically 20% higher due to confined chip flow'
  },
  
  'kienzle.feed_force_ratio': {
    requires: [],
    formula: (mat) => {
      // Estimate based on material type
      if (mat.category === 'ALUMINUM') return 0.4;
      if (mat.category === 'TITANIUM') return 0.6;
      return 0.5;  // Default for steels
    },
    confidence: 'LOW',
    note: 'Estimate based on material category'
  },
  
  'kienzle.passive_force_ratio': {
    requires: [],
    formula: (mat) => {
      if (mat.category === 'ALUMINUM') return 0.25;
      if (mat.category === 'TITANIUM') return 0.45;
      return 0.35;
    },
    confidence: 'LOW',
    note: 'Estimate based on material category'
  },

  // Taylor derivations
  'taylor.C_hss': {
    requires: ['taylor.C_carbide'],
    formula: (mat) => mat.taylor.C_carbide * 0.25,
    confidence: 'MEDIUM',
    note: 'HSS typically 25% of carbide speed capability'
  },
  
  'taylor.n_hss': {
    requires: ['taylor.n_carbide'],
    formula: (mat) => mat.taylor.n_carbide * 0.5,
    confidence: 'MEDIUM',
    note: 'HSS exponent typically 50% of carbide'
  },
  
  'taylor.C_ceramic': {
    requires: ['taylor.C_carbide'],
    formula: (mat) => mat.taylor.C_carbide * 2.0,
    confidence: 'LOW',
    note: 'Ceramic typically 2x carbide (varies widely)'
  },

  // Johnson-Cook estimation from tensile
  'johnson_cook.A': {
    requires: ['mechanical.yield_strength'],
    formula: (mat) => mat.mechanical.yield_strength,
    confidence: 'MEDIUM',
    note: 'A ≈ yield strength at reference conditions'
  }
};

/**
 * Try to calculate a parameter from others
 */
function tryCalculateParameter(material, parameter) {
  const formula = DERIVATION_FORMULAS[parameter];
  if (!formula) {
    return { success: false, reason: 'no_formula' };
  }
  
  // Check if required parameters exist
  for (const req of formula.requires) {
    if (!hasParameter(material, req)) {
      return { success: false, reason: 'missing_required', missing: req };
    }
  }
  
  // Calculate
  const value = formula.formula(material);
  
  return {
    success: true,
    value,
    confidence: formula.confidence,
    formula: parameter,
    note: formula.note
  };
}
```

## 3.2 Hardness Conversions

```javascript
/**
 * Convert between hardness scales
 */
const HARDNESS_CONVERSIONS = {
  hrc_to_hb: (hrc) => {
    // Approximate conversion for steels
    if (hrc < 20) return 225 + (hrc - 20) * 5;
    if (hrc < 40) return 225 + (hrc - 20) * 8;
    return 390 + (hrc - 40) * 12;
  },
  
  hb_to_hrc: (hb) => {
    if (hb < 225) return 20 - (225 - hb) / 5;
    if (hb < 390) return 20 + (hb - 225) / 8;
    return 40 + (hb - 390) / 12;
  },
  
  hrc_to_hv: (hrc) => {
    // HV ≈ HRC × 10 + 200 (rough)
    return hrc * 11 + 170;
  },
  
  hb_to_tensile: (hb) => {
    // σ_tensile ≈ 3.45 × HB (for steels)
    return hb * 3.45;
  }
};

/**
 * Enhance hardness values from available data
 */
function enhanceHardness(material) {
  const enhancements = [];
  
  if (material.mechanical.hardness_hrc && !material.mechanical.hardness_hb) {
    enhancements.push({
      parameter: 'mechanical.hardness_hb',
      value: HARDNESS_CONVERSIONS.hrc_to_hb(material.mechanical.hardness_hrc),
      confidence: 'MEDIUM',
      source: 'converted_from_hrc'
    });
  }
  
  if (material.mechanical.hardness_hb && !material.mechanical.hardness_hrc) {
    enhancements.push({
      parameter: 'mechanical.hardness_hrc',
      value: HARDNESS_CONVERSIONS.hb_to_hrc(material.mechanical.hardness_hb),
      confidence: 'MEDIUM',
      source: 'converted_from_hb'
    });
  }
  
  return enhancements;
}
```

## 3.3 Kienzle Parameter Estimation

```javascript
/**
 * Estimate Kienzle parameters from tensile strength
 */
function estimateKienzleFromTensile(tensile_strength, category) {
  // kc1.1 correlates with tensile strength
  // Empirical: kc1.1 ≈ 2.5-3.5 × tensile for steels
  
  const multipliers = {
    STEEL: 3.0,
    STAINLESS: 3.5,
    CAST_IRON: 2.0,
    ALUMINUM: 1.5,
    TITANIUM: 4.0,
    SUPERALLOY: 4.5
  };
  
  const mult = multipliers[category] || 3.0;
  const kc1_1 = tensile_strength * mult;
  
  // mc depends on material type
  const mcValues = {
    STEEL: 0.26,
    STAINLESS: 0.22,
    CAST_IRON: 0.28,
    ALUMINUM: 0.30,
    TITANIUM: 0.21,
    SUPERALLOY: 0.20
  };
  
  return {
    kc1_1: {
      value: kc1_1,
      confidence: 'LOW',
      source: 'estimated_from_tensile'
    },
    mc: {
      value: mcValues[category] || 0.25,
      confidence: 'LOW',
      source: 'category_typical'
    }
  };
}
```

## 3.4 Machinability Index Estimation

```javascript
/**
 * Estimate machinability index from material properties
 */
function estimateMachinabilityIndex(material) {
  // Base on category
  const categoryBase = {
    ALUMINUM: 200,
    COPPER: 100,
    CARBON_STEEL: 70,
    ALLOY_STEEL: 50,
    STAINLESS: 40,
    TITANIUM: 25,
    SUPERALLOY: 15
  };
  
  let index = categoryBase[material.category] || 50;
  
  // Adjust for hardness
  const hrc = material.mechanical?.hardness_hrc || 25;
  if (hrc > 35) index *= 0.8;
  if (hrc > 45) index *= 0.7;
  
  // Adjust for tensile strength
  const tensile = material.mechanical?.tensile_strength || 500;
  if (tensile > 1000) index *= 0.85;
  if (tensile > 1500) index *= 0.75;
  
  return {
    value: Math.round(index),
    confidence: 'LOW',
    source: 'estimated_from_properties'
  };
}
```

---

# SECTION 4: ENHANCEMENT WORKFLOW

## 4.1 Single Material Enhancement

```javascript
/**
 * Enhance a single material to target coverage/grade
 * @param material - Material to enhance
 * @param options - Enhancement options
 * @returns Enhanced material with audit trail
 */
function enhanceMaterial(material, options = {}) {
  const {
    targetGrade = 'B',
    targetCoverage = 75,
    allowEstimation = true,
    maxIterations = 5
  } = options;
  
  // Clone material for modification
  const enhanced = JSON.parse(JSON.stringify(material));
  const enhancements = [];
  
  // Initial validation
  let validation = validateMaterial(enhanced, 'L3');
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    
    // Check if target reached
    if (gradeToNumber(validation.grade) >= gradeToNumber(targetGrade) &&
        validation.coverage.overall >= targetCoverage) {
      break;
    }
    
    // Get missing parameters prioritized by importance
    const missing = prioritizeMissing(validation);
    
    if (missing.length === 0) break;  // Nothing more to enhance
    
    // Enhance each missing parameter
    for (const param of missing) {
      const enhancement = selectEnhancementMethod(enhanced, param);
      
      if (enhancement.method === 'none') continue;
      if (!allowEstimation && enhancement.confidence === 'LOW') continue;
      
      // Apply enhancement
      setParameterValue(enhanced, param, enhancement.value);
      
      enhancements.push({
        parameter: param,
        value: enhancement.value,
        method: enhancement.method,
        confidence: enhancement.confidence,
        source: enhancement.source,
        iteration
      });
    }
    
    // Re-validate
    validation = validateMaterial(enhanced, 'L3');
  }
  
  // Update metadata
  enhanced.metadata.last_updated = new Date().toISOString();
  enhanced.metadata.parameter_coverage = validation.coverage.overall;
  enhanced.metadata.enhancement_applied = true;
  enhanced.metadata.enhancement_count = enhancements.length;
  
  return {
    original: material,
    enhanced,
    enhancements,
    validation,
    summary: {
      originalGrade: validateMaterial(material, 'L3').grade,
      newGrade: validation.grade,
      originalCoverage: validateMaterial(material, 'L3').coverage.overall,
      newCoverage: validation.coverage.overall,
      parametersEnhanced: enhancements.length,
      iterations: iteration
    }
  };
}

/**
 * Prioritize missing parameters by importance
 */
function prioritizeMissing(validation) {
  const priority = [];
  
  // Required first
  for (const param of validation.presence.required.missing) {
    priority.push({ param, priority: 1 });
  }
  
  // Then recommended
  for (const param of validation.presence.recommended.missing) {
    priority.push({ param, priority: 2 });
  }
  
  // Then by calculation impact
  const calcParams = [
    'kienzle.kc1_1', 'kienzle.mc',
    'taylor.C_carbide', 'taylor.n_carbide',
    'thermal.thermal_conductivity', 'thermal.specific_heat'
  ];
  
  for (const param of calcParams) {
    if (!hasParameter(validation, param) && 
        !priority.find(p => p.param === param)) {
      priority.push({ param, priority: 3 });
    }
  }
  
  return priority.sort((a, b) => a.priority - b.priority).map(p => p.param);
}
```

## 4.2 Batch Enhancement

```javascript
/**
 * Enhance multiple materials
 */
function enhanceMaterialBatch(materials, options = {}) {
  const results = [];
  
  for (const material of materials) {
    const result = enhanceMaterial(material, options);
    results.push(result);
  }
  
  // Summary statistics
  const summary = {
    total: results.length,
    improved: results.filter(r => 
      gradeToNumber(r.summary.newGrade) > gradeToNumber(r.summary.originalGrade)
    ).length,
    targetReached: results.filter(r => 
      gradeToNumber(r.summary.newGrade) >= gradeToNumber(options.targetGrade || 'B')
    ).length,
    totalEnhancements: results.reduce((sum, r) => sum + r.enhancements.length, 0),
    averageCoverageGain: results.reduce((sum, r) => 
      sum + (r.summary.newCoverage - r.summary.originalCoverage), 0) / results.length
  };
  
  return { results, summary };
}
```

## 4.3 Enhancement Report Generation

```javascript
/**
 * Generate human-readable enhancement report
 */
function generateEnhancementReport(result) {
  const lines = [];
  
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`MATERIAL ENHANCEMENT REPORT`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`Material: ${result.enhanced.name} (${result.enhanced.id})`);
  lines.push(``);
  lines.push(`IMPROVEMENT SUMMARY`);
  lines.push(`  Grade:    ${result.summary.originalGrade} → ${result.summary.newGrade}`);
  lines.push(`  Coverage: ${result.summary.originalCoverage.toFixed(1)}% → ${result.summary.newCoverage.toFixed(1)}%`);
  lines.push(`  Parameters Enhanced: ${result.summary.parametersEnhanced}`);
  lines.push(``);
  
  if (result.enhancements.length > 0) {
    lines.push(`ENHANCEMENTS APPLIED:`);
    for (const enh of result.enhancements) {
      lines.push(`  • ${enh.parameter}`);
      lines.push(`    Value: ${enh.value}`);
      lines.push(`    Method: ${enh.method} (${enh.confidence} confidence)`);
      lines.push(`    Source: ${enh.source}`);
    }
  }
  
  lines.push(``);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  
  return lines.join('\n');
}
```

## 4.4 Helper Functions

```javascript
/**
 * Set parameter value by dot-notation path
 */
function setParameterValue(material, path, value) {
  const parts = path.split('.');
  let obj = material;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  
  obj[parts[parts.length - 1]] = value;
}

/**
 * Convert grade to number for comparison
 */
function gradeToNumber(grade) {
  const grades = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
  return grades[grade] || 0;
}
```

---

# SECTION 5: INTEGRATION

## 5.1 Skill Metadata

```yaml
skill_id: prism-material-enhancer
version: 1.0.0
category: materials-system
priority: MEDIUM

triggers:
  keywords:
    - "enhance material", "fill gaps"
    - "estimate parameters", "missing data"
    - "upgrade grade", "improve coverage"
    - "complete material", "100% coverage"
  contexts:
    - Validator returns grade D or F
    - Missing parameters block calculations
    - Importing partial material data
    - Preparing for production use

activation_rule: |
  IF (material has gaps OR grade < target)
  THEN activate prism-material-enhancer
  AND fill gaps using source hierarchy

outputs:
  - Enhanced material objects
  - Enhancement audit trail
  - Coverage improvement reports

related_skills:
  - prism-material-validator (identifies gaps)
  - prism-material-schema (defines valid ranges)
  - prism-material-lookup (finds similar materials)
```

## 5.2 API Summary

| Method | Input | Output | Use Case |
|--------|-------|--------|----------|
| `enhanceMaterial(mat, opts)` | Material, Options | EnhancementResult | Single enhancement |
| `enhanceMaterialBatch(mats)` | Material[] | BatchResult | Bulk enhancement |
| `selectEnhancementMethod(mat, param)` | Material, Param | Method | Choose source |
| `findBestSimilarMaterial(mat, params)` | Material, Params | SimilarResult | Interpolation |
| `tryCalculateParameter(mat, param)` | Material, Param | CalcResult | Physics derivation |
| `getFamilyAverage(family, param)` | Family, Param | Value | Family fallback |
| `generateEnhancementReport(result)` | Result | String | Human-readable |

## 5.3 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MATERIAL-ENHANCER QUICK REFERENCE                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SOURCE HIERARCHY (use highest available)                                               │
│  ════════════════════════════════════════                                               │
│  1. Handbook (ASM, Machining Data)      → HIGH confidence                               │
│  2. Peer-reviewed literature            → HIGH confidence                               │
│  3. Manufacturer datasheet              → MEDIUM-HIGH confidence                        │
│  4. Similar material interpolation      → MEDIUM confidence                             │
│  5. Physics-based calculation           → MEDIUM confidence                             │
│  6. Family average                      → LOW-MEDIUM confidence                         │
│  7. Category estimate                   → LOW confidence                                │
│                                                                                         │
│  PHYSICS DERIVATIONS (exact or approximate)                                             │
│  ════════════════════════════════════════════                                           │
│  G = E / 2(1+ν)           (shear modulus - exact)                                       │
│  τ ≈ 0.6 × σ_tensile      (shear strength - approximate)                                │
│  α = k / (ρ × cp)         (thermal diffusivity - exact)                                 │
│  kc_milling ≈ 1.1 × kc    (milling correction)                                          │
│  kc_drilling ≈ 1.2 × kc   (drilling correction)                                         │
│  C_hss ≈ 0.25 × C_carbide (Taylor HSS estimate)                                         │
│                                                                                         │
│  QUICK ENHANCEMENT                                                                      │
│  ════════════════════════════════════════════                                           │
│  const result = enhanceMaterial(material, {                                             │
│    targetGrade: 'B',                                                                    │
│    targetCoverage: 75,                                                                  │
│    allowEstimation: true                                                                │
│  });                                                                                    │
│                                                                                         │
│  if (result.summary.newGrade >= 'B') {                                                  │
│    saveMaterial(result.enhanced);                                                       │
│  }                                                                                      │
│                                                                                         │
│  CONFIDENCE LEVELS                                                                      │
│  ════════════════════════════════════════════                                           │
│  HIGH   : Handbook/literature verified data                                             │
│  MEDIUM : Calculated or interpolated from similar                                       │
│  LOW    : Estimated from category/family averages                                       │
│                                                                                         │
│  Always track confidence in metadata.enhancement_sources                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT END

**Skill:** prism-material-enhancer
**Version:** 1.0
**Total Sections:** 5
**Part of:** SP.3 Materials System (SP.3.5 of 5)
**Created:** Session SP.3.5
**Status:** COMPLETE

**Key Features:**
- Source hierarchy (7 levels from handbook to estimate)
- 15+ physics-based derivation formulas
- Similar material interpolation
- Family average fallbacks
- Hardness scale conversions
- Kienzle/Taylor parameter estimation
- Batch enhancement workflows
- Audit trail for all enhancements

**Principle:** Estimated data with uncertainty beats missing data.

---
