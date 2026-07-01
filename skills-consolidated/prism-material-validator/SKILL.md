---
name: prism-material-validator
description: |
  Validate material completeness and correctness for PRISM v9.0.
  Use when: Checking material data quality, validating imports, auditing coverage.
  Provides: Parameter presence checklist, value range validation, relationship checks,
  coverage scoring, data quality grading (A/B/C/D/F), missing parameter identification.
  Key principle: Incomplete data blocks calculations - validate everything.
  Part of SP.3 Materials System.
---

# PRISM-MATERIAL-VALIDATOR
## Material Completeness and Quality Validation
### Version 1.0 | Materials System | ~30KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides **comprehensive validation** of material data against the 127-parameter schema. Incomplete or incorrect data blocks calculations and produces unreliable results.

**Validation Types:**
1. **Presence Validation** - Are required parameters present?
2. **Range Validation** - Are values physically plausible?
3. **Relationship Validation** - Are related values consistent?
4. **Coverage Scoring** - What percentage of parameters are filled?
5. **Quality Grading** - Overall data quality assessment

## 1.2 The Validation Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MATERIAL VALIDATION PHILOSOPHY                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: MISSING DATA IS WORSE THAN ESTIMATED DATA                                 │
│  ───────────────────────────────────────────────────────                                │
│  A calculation that can't run is useless. An estimate with uncertainty                  │
│  is useful. Flag missing data for enhancement, don't just accept gaps.                  │
│                                                                                         │
│  PRINCIPLE 2: PHYSICS CATCHES ERRORS                                                    │
│  ─────────────────────────────────────                                                  │
│  Values outside physical ranges are wrong. A steel with 500 GPa modulus                 │
│  or negative hardness is data entry error, regardless of source.                        │
│                                                                                         │
│  PRINCIPLE 3: RELATIONSHIPS REVEAL INCONSISTENCIES                                      │
│  ─────────────────────────────────────────────────                                      │
│  Yield > Tensile? Solidus > Liquidus? These are impossible. Cross-check                 │
│  related parameters to catch transcription errors.                                      │
│                                                                                         │
│  PRINCIPLE 4: GRADE HONESTLY                                                            │
│  ─────────────────────────────────────────────────                                      │
│  An "A" material has verified, complete data. A "C" material works but                  │
│  has gaps. Be honest about quality so users know what to trust.                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Validation Levels

| Level | Name | Description | Use Case |
|-------|------|-------------|----------|
| **L1** | Quick Check | Required fields only | Fast import validation |
| **L2** | Standard | Required + ranges | Normal operation |
| **L3** | Comprehensive | All checks + relationships | Data quality audit |
| **L4** | Strict | L3 + warnings as errors | Production release |

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "validate material", "check material"
- "data quality", "coverage score"
- "missing parameters", "incomplete"
- "audit materials", "validate database"

**Contextual Triggers:**
- Importing new material data
- Before using material in calculations
- Auditing material database quality
- Preparing for production release

## 1.5 Position in SP.3 Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SP.3 MATERIALS SYSTEM                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.3.1              SP.3.2              SP.3.3              SP.3.4                      │
│  ┌────────┐         ┌────────┐         ┌────────┐         ┌────────┐                    │
│  │ SCHEMA │────────▶│PHYSICS │         │ LOOKUP │────────▶│VALIDATE│◀── THIS            │
│  │        │         │        │         │        │         │        │                    │
│  └────────┘         └────────┘         └────────┘         └────────┘                    │
│       │                                                        │                        │
│       │  Defines valid ranges                                  │                        │
│       └────────────────────────────────────────────────────────┘                        │
│                                                                                         │
│  VALIDATION FLOW:                                                                       │
│  1. LOOKUP retrieves material                                                           │
│  2. VALIDATOR checks against SCHEMA rules                                               │
│  3. If invalid → ENHANCER fills gaps                                                    │
│  4. If valid → Ready for PHYSICS calculations                                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.6 Validation Result Structure

```typescript
interface ValidationResult {
  materialId: string;
  isValid: boolean;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  
  // Presence check results
  presence: {
    required: { present: number; missing: string[]; };
    recommended: { present: number; missing: string[]; };
    optional: { present: number; missing: string[]; };
  };
  
  // Range check results
  rangeErrors: Array<{
    parameter: string;
    value: number;
    min: number;
    max: number;
    severity: 'error' | 'warning';
  }>;
  
  // Relationship check results
  relationshipErrors: Array<{
    rule: string;
    description: string;
    actual: string;
    severity: 'error' | 'warning';
  }>;
  
  // Scoring
  coverage: {
    total: number;      // % of all 127 params
    required: number;   // % of required params
    byCategory: Record<string, number>;
  };
  
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeReason: string;
}
```

---

# SECTION 2: PARAMETER PRESENCE VALIDATION

## 2.1 Required Parameters (Must Have)

These parameters are **mandatory** - material is invalid without them.

```javascript
const REQUIRED_PARAMETERS = [
  // Identification (4 required)
  'id',
  'name',
  'category',
  'family',
  
  // Mechanical (2 required)
  'mechanical.tensile_strength',
  'mechanical.hardness_hrc || mechanical.hardness_hb',  // Either one
  
  // Thermal (1 required)
  'thermal.thermal_conductivity',
  
  // Physical (1 required)
  'physical.density',
  
  // Machinability (1 required)
  'machinability.machinability_index',
  
  // Kienzle (2 required)
  'kienzle.kc1_1',
  'kienzle.mc',
  
  // Metadata (4 required)
  'metadata.data_source_primary',
  'metadata.data_confidence',
  'metadata.parameter_coverage',
  'metadata.last_updated'
];
// Total: 15 required parameters
```

## 2.2 Recommended Parameters (Should Have)

These parameters enable most calculations. Missing them limits functionality.

```javascript
const RECOMMENDED_PARAMETERS = [
  // Identification
  'uns', 'din',
  
  // Mechanical
  'mechanical.yield_strength',
  'mechanical.elastic_modulus',
  'mechanical.elongation',
  
  // Thermal
  'thermal.specific_heat',
  'thermal.melting_point',
  
  // Machinability
  'machinability.chip_type',
  'machinability.tool_wear_mode',
  'machinability.recommended_tool_material',
  
  // Taylor (tool life)
  'taylor.C_carbide',
  'taylor.n_carbide'
];
// Total: 13 recommended parameters
```

## 2.3 Presence Check Implementation

```javascript
/**
 * Check parameter presence
 * @param material - Material to validate
 * @returns Presence validation results
 */
function validatePresence(material) {
  const result = {
    required: { present: 0, total: 15, missing: [] },
    recommended: { present: 0, total: 13, missing: [] },
    optional: { present: 0, total: 99, missing: [] }
  };
  
  // Check required parameters
  for (const param of REQUIRED_PARAMETERS) {
    if (param.includes('||')) {
      // Either/or parameter
      const options = param.split('||').map(p => p.trim());
      const hasAny = options.some(opt => hasParameter(material, opt));
      if (hasAny) {
        result.required.present++;
      } else {
        result.required.missing.push(param);
      }
    } else {
      if (hasParameter(material, param)) {
        result.required.present++;
      } else {
        result.required.missing.push(param);
      }
    }
  }
  
  // Check recommended parameters
  for (const param of RECOMMENDED_PARAMETERS) {
    if (hasParameter(material, param)) {
      result.recommended.present++;
    } else {
      result.recommended.missing.push(param);
    }
  }
  
  // Count optional (all remaining)
  result.optional.present = countAllParameters(material) - 
                            result.required.present - 
                            result.recommended.present;
  
  return result;
}

/**
 * Check if parameter exists and has a value
 */
function hasParameter(material, path) {
  const parts = path.split('.');
  let value = material;
  
  for (const part of parts) {
    if (value === undefined || value === null) return false;
    value = value[part];
  }
  
  return value !== undefined && value !== null && value !== '';
}

/**
 * Count all non-null parameters
 */
function countAllParameters(material) {
  let count = 0;
  
  function countRecursive(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          countRecursive(value, `${prefix}${key}.`);
        } else {
          count++;
        }
      }
    }
  }
  
  countRecursive(material);
  return count;
}
```

## 2.4 Category-Specific Requirements

Some parameters are required only for specific material categories:

```javascript
const CATEGORY_REQUIREMENTS = {
  STEEL: [
    'iso_p_class',  // ISO-P classification required for steels
    'kienzle.kc1_1_turning'
  ],
  STAINLESS: [
    'iso_m_class',  // ISO-M classification
    'machinability.work_hardening_severity'
  ],
  ALUMINUM: [
    'iso_n_class',  // ISO-N classification
    'machinability.built_up_edge_tendency'
  ],
  TITANIUM: [
    'iso_s_class',  // ISO-S classification
    'machinability.cutting_temp_tendency'
  ],
  CAST_IRON: [
    'iso_k_class',  // ISO-K classification
  ]
};

/**
 * Validate category-specific requirements
 */
function validateCategoryRequirements(material) {
  const category = material.category;
  const requirements = CATEGORY_REQUIREMENTS[category] || [];
  
  const missing = [];
  for (const param of requirements) {
    if (!hasParameter(material, param)) {
      missing.push(param);
    }
  }
  
  return {
    category,
    required: requirements,
    missing,
    complete: missing.length === 0
  };
}
```

## 2.5 Calculation-Specific Requirements

Check if material has parameters for specific calculations:

```javascript
const CALCULATION_REQUIREMENTS = {
  CUTTING_FORCE: ['kienzle.kc1_1', 'kienzle.mc'],
  TOOL_LIFE: ['taylor.C_carbide', 'taylor.n_carbide'],
  TEMPERATURE: ['thermal.thermal_conductivity', 'thermal.specific_heat', 'physical.density'],
  SURFACE_FINISH: ['surface.Ra_speed_sensitivity', 'surface.Ra_feed_sensitivity'],
  FEA_SIMULATION: ['johnson_cook.A', 'johnson_cook.B', 'johnson_cook.n', 
                   'johnson_cook.C', 'johnson_cook.m'],
  DEFLECTION: ['mechanical.elastic_modulus', 'mechanical.yield_strength']
};

/**
 * Check if material can support a specific calculation
 */
function canPerformCalculation(material, calculationType) {
  const requirements = CALCULATION_REQUIREMENTS[calculationType];
  if (!requirements) return { supported: false, reason: 'Unknown calculation type' };
  
  const missing = requirements.filter(param => !hasParameter(material, param));
  
  return {
    supported: missing.length === 0,
    calculationType,
    required: requirements,
    missing,
    coverage: ((requirements.length - missing.length) / requirements.length) * 100
  };
}

/**
 * Get all supported calculations for a material
 */
function getSupportedCalculations(material) {
  const results = {};
  for (const calcType of Object.keys(CALCULATION_REQUIREMENTS)) {
    results[calcType] = canPerformCalculation(material, calcType);
  }
  return results;
}
```

## 2.6 Presence Validation Summary

```javascript
/**
 * Generate presence validation summary
 */
function presenceValidationSummary(material) {
  const presence = validatePresence(material);
  const categoryCheck = validateCategoryRequirements(material);
  const calculations = getSupportedCalculations(material);
  
  return {
    // Overall presence
    requiredComplete: presence.required.missing.length === 0,
    requiredScore: (presence.required.present / presence.required.total) * 100,
    
    // Category-specific
    categoryComplete: categoryCheck.complete,
    categoryMissing: categoryCheck.missing,
    
    // Calculation support
    supportedCalculations: Object.entries(calculations)
      .filter(([_, v]) => v.supported)
      .map(([k, _]) => k),
    unsupportedCalculations: Object.entries(calculations)
      .filter(([_, v]) => !v.supported)
      .map(([k, v]) => ({ calculation: k, missing: v.missing })),
    
    // Action items
    criticalMissing: presence.required.missing,
    recommendedMissing: presence.recommended.missing
  };
}
```

---

# SECTION 3: VALUE RANGE VALIDATION

## 3.1 Physics-Based Validation Ranges

All values must fall within physically plausible ranges:

```javascript
const VALIDATION_RANGES = {
  // Mechanical Properties
  'mechanical.tensile_strength':    { min: 50,    max: 3000,  unit: 'MPa' },
  'mechanical.yield_strength':      { min: 30,    max: 2500,  unit: 'MPa' },
  'mechanical.elongation':          { min: 0.1,   max: 70,    unit: '%' },
  'mechanical.reduction_of_area':   { min: 1,     max: 90,    unit: '%' },
  'mechanical.hardness_hrc':        { min: 10,    max: 72,    unit: 'HRC' },
  'mechanical.hardness_hb':         { min: 80,    max: 750,   unit: 'HB' },
  'mechanical.hardness_hv':         { min: 80,    max: 1000,  unit: 'HV' },
  'mechanical.elastic_modulus':     { min: 10,    max: 500,   unit: 'GPa' },
  'mechanical.shear_modulus':       { min: 5,     max: 200,   unit: 'GPa' },
  'mechanical.poisson_ratio':       { min: 0.1,   max: 0.5,   unit: '-' },
  'mechanical.fatigue_strength':    { min: 50,    max: 1500,  unit: 'MPa' },
  'mechanical.impact_strength':     { min: 1,     max: 400,   unit: 'J' },
  
  // Thermal Properties
  'thermal.thermal_conductivity':   { min: 1,     max: 500,   unit: 'W/m·K' },
  'thermal.specific_heat':          { min: 100,   max: 2000,  unit: 'J/kg·K' },
  'thermal.melting_point':          { min: 200,   max: 4000,  unit: '°C' },
  'thermal.thermal_expansion':      { min: 1,     max: 50,    unit: 'µm/m·K' },
  'thermal.emissivity':             { min: 0,     max: 1,     unit: '-' },
  
  // Physical Properties
  'physical.density':               { min: 1000,  max: 25000, unit: 'kg/m³' },
  'physical.electrical_resistivity':{ min: 0.1,   max: 500,   unit: 'µΩ·cm' },
  
  // Machinability
  'machinability.machinability_index':      { min: 5,    max: 300,  unit: '%' },
  'machinability.specific_cutting_energy':  { min: 0.1,  max: 15,   unit: 'J/mm³' },
  'machinability.cutting_speed_multiplier': { min: 0.1,  max: 5.0,  unit: '-' },
  
  // Kienzle Parameters
  'kienzle.kc1_1':                  { min: 200,   max: 6000,  unit: 'N/mm²' },
  'kienzle.mc':                     { min: 0.10,  max: 0.50,  unit: '-' },
  'kienzle.rake_angle_correction':  { min: 0.5,   max: 4.0,   unit: '%/°' },
  'kienzle.wear_correction_factor': { min: 1.0,   max: 2.5,   unit: '-' },
  'kienzle.feed_force_ratio':       { min: 0.1,   max: 1.0,   unit: '-' },
  'kienzle.passive_force_ratio':    { min: 0.1,   max: 0.8,   unit: '-' },
  
  // Johnson-Cook Parameters
  'johnson_cook.A':                 { min: 10,    max: 2500,  unit: 'MPa' },
  'johnson_cook.B':                 { min: 10,    max: 3000,  unit: 'MPa' },
  'johnson_cook.n':                 { min: 0.001, max: 1.0,   unit: '-' },
  'johnson_cook.C':                 { min: 0.0001,max: 0.3,   unit: '-' },
  'johnson_cook.m':                 { min: 0.1,   max: 3.0,   unit: '-' },
  
  // Taylor Parameters
  'taylor.C_carbide':               { min: 10,    max: 1000,  unit: 'm/min' },
  'taylor.n_carbide':               { min: 0.05,  max: 0.70,  unit: '-' },
  'taylor.C_ceramic':               { min: 20,    max: 1500,  unit: 'm/min' },
  'taylor.n_ceramic':               { min: 0.10,  max: 0.80,  unit: '-' },
  'taylor.C_hss':                   { min: 5,     max: 300,   unit: 'm/min' },
  'taylor.n_hss':                   { min: 0.03,  max: 0.30,  unit: '-' },
  
  // Surface Parameters
  'surface.min_achievable_Ra':      { min: 0.05,  max: 5.0,   unit: 'µm' },
  'surface.typical_Ra_rough':       { min: 1.0,   max: 25.0,  unit: 'µm' },
  'surface.typical_Ra_finish':      { min: 0.1,   max: 6.3,   unit: 'µm' }
};
```

## 3.2 Range Validation Implementation

```javascript
/**
 * Validate all parameter values against physics-based ranges
 * @param material - Material to validate
 * @returns Array of range errors/warnings
 */
function validateRanges(material) {
  const errors = [];
  
  for (const [path, range] of Object.entries(VALIDATION_RANGES)) {
    const value = getParameterValue(material, path);
    
    if (value === null || value === undefined) continue;  // Skip missing
    
    if (value < range.min) {
      errors.push({
        parameter: path,
        value,
        min: range.min,
        max: range.max,
        unit: range.unit,
        severity: 'error',
        message: `${path} = ${value} is below minimum ${range.min} ${range.unit}`
      });
    } else if (value > range.max) {
      errors.push({
        parameter: path,
        value,
        min: range.min,
        max: range.max,
        unit: range.unit,
        severity: 'error',
        message: `${path} = ${value} exceeds maximum ${range.max} ${range.unit}`
      });
    }
  }
  
  return errors;
}

/**
 * Get parameter value by dot-notation path
 */
function getParameterValue(material, path) {
  const parts = path.split('.');
  let value = material;
  
  for (const part of parts) {
    if (value === undefined || value === null) return null;
    value = value[part];
  }
  
  return value;
}
```

## 3.3 Relationship Validation Rules

Some parameters must maintain specific relationships:

```javascript
const RELATIONSHIP_RULES = [
  {
    id: 'yield_vs_tensile',
    description: 'Yield strength must be ≤ tensile strength',
    check: (mat) => {
      const ys = mat.mechanical?.yield_strength;
      const ts = mat.mechanical?.tensile_strength;
      if (ys && ts) return ys <= ts;
      return true;  // Skip if missing
    },
    severity: 'error'
  },
  {
    id: 'solidus_vs_liquidus',
    description: 'Solidus temperature must be ≤ liquidus temperature',
    check: (mat) => {
      const sol = mat.thermal?.solidus_temp;
      const liq = mat.thermal?.liquidus_temp;
      if (sol && liq) return sol <= liq;
      return true;
    },
    severity: 'error'
  },
  {
    id: 'melting_in_range',
    description: 'Melting point should be between solidus and liquidus',
    check: (mat) => {
      const mp = mat.thermal?.melting_point;
      const sol = mat.thermal?.solidus_temp;
      const liq = mat.thermal?.liquidus_temp;
      if (mp && sol && liq) return mp >= sol && mp <= liq;
      return true;
    },
    severity: 'warning'
  },
  {
    id: 'shear_vs_tensile',
    description: 'Shear strength should be ~60% of tensile strength (±20%)',
    check: (mat) => {
      const ss = mat.mechanical?.shear_strength;
      const ts = mat.mechanical?.tensile_strength;
      if (ss && ts) {
        const ratio = ss / ts;
        return ratio >= 0.4 && ratio <= 0.8;
      }
      return true;
    },
    severity: 'warning'
  },
  {
    id: 'modulus_relationship',
    description: 'Shear modulus ≈ E / (2(1+ν)) within 10%',
    check: (mat) => {
      const G = mat.mechanical?.shear_modulus;
      const E = mat.mechanical?.elastic_modulus;
      const nu = mat.mechanical?.poisson_ratio;
      if (G && E && nu) {
        const expected = E / (2 * (1 + nu));
        const ratio = G / expected;
        return ratio >= 0.9 && ratio <= 1.1;
      }
      return true;
    },
    severity: 'warning'
  },
  {
    id: 'jc_a_vs_yield',
    description: 'Johnson-Cook A should be close to yield strength (±30%)',
    check: (mat) => {
      const A = mat.johnson_cook?.A;
      const ys = mat.mechanical?.yield_strength;
      if (A && ys) {
        const ratio = A / ys;
        return ratio >= 0.7 && ratio <= 1.3;
      }
      return true;
    },
    severity: 'warning'
  },
  {
    id: 'hardness_consistency',
    description: 'HRC and HB should be consistent (conversion formula)',
    check: (mat) => {
      const hrc = mat.mechanical?.hardness_hrc;
      const hb = mat.mechanical?.hardness_hb;
      if (hrc && hb) {
        // Approximate conversion: HB ≈ 10 × HRC (rough)
        const expectedHB = hrc * 10;
        const ratio = hb / expectedHB;
        return ratio >= 0.8 && ratio <= 1.3;
      }
      return true;
    },
    severity: 'warning'
  },
  {
    id: 'ra_finish_vs_rough',
    description: 'Finish Ra should be less than rough Ra',
    check: (mat) => {
      const finish = mat.surface?.typical_Ra_finish;
      const rough = mat.surface?.typical_Ra_rough;
      if (finish && rough) return finish < rough;
      return true;
    },
    severity: 'error'
  }
];

/**
 * Validate all relationship rules
 */
function validateRelationships(material) {
  const errors = [];
  
  for (const rule of RELATIONSHIP_RULES) {
    if (!rule.check(material)) {
      errors.push({
        rule: rule.id,
        description: rule.description,
        severity: rule.severity
      });
    }
  }
  
  return errors;
}
```

## 3.4 Category-Specific Range Adjustments

Different material categories have different typical ranges:

```javascript
const CATEGORY_RANGE_ADJUSTMENTS = {
  ALUMINUM: {
    'physical.density': { min: 2500, max: 2900 },
    'mechanical.elastic_modulus': { min: 65, max: 80 },
    'thermal.thermal_conductivity': { min: 100, max: 250 },
    'thermal.melting_point': { min: 500, max: 700 }
  },
  TITANIUM: {
    'physical.density': { min: 4400, max: 4900 },
    'mechanical.elastic_modulus': { min: 100, max: 125 },
    'thermal.thermal_conductivity': { min: 5, max: 25 }
  },
  STEEL: {
    'physical.density': { min: 7700, max: 8100 },
    'mechanical.elastic_modulus': { min: 190, max: 220 }
  },
  SUPERALLOY: {
    'physical.density': { min: 7800, max: 9500 },
    'thermal.melting_point': { min: 1200, max: 1500 }
  }
};

/**
 * Get adjusted ranges for material category
 */
function getAdjustedRanges(category) {
  const adjustments = CATEGORY_RANGE_ADJUSTMENTS[category] || {};
  const ranges = { ...VALIDATION_RANGES };
  
  for (const [path, adjustment] of Object.entries(adjustments)) {
    if (ranges[path]) {
      ranges[path] = { ...ranges[path], ...adjustment };
    }
  }
  
  return ranges;
}
```

---

# SECTION 4: COVERAGE SCORING AND GRADING

## 4.1 Coverage Score Calculation

```javascript
/**
 * Calculate coverage score for a material
 * @param material - Material to score
 * @returns Coverage scores by category and overall
 */
function calculateCoverage(material) {
  const categories = {
    identification: { total: 12, present: 0, params: [] },
    classification: { total: 8, present: 0, params: [] },
    mechanical: { total: 18, present: 0, params: [] },
    thermal: { total: 12, present: 0, params: [] },
    physical: { total: 6, present: 0, params: [] },
    machinability: { total: 15, present: 0, params: [] },
    kienzle: { total: 12, present: 0, params: [] },
    johnson_cook: { total: 8, present: 0, params: [] },
    taylor: { total: 10, present: 0, params: [] },
    surface: { total: 8, present: 0, params: [] },
    coolant: { total: 8, present: 0, params: [] },
    metadata: { total: 10, present: 0, params: [] }
  };
  
  // Count parameters in each category
  countCategoryParams(material, '', categories);
  
  // Calculate percentages
  let totalPresent = 0;
  let totalParams = 0;
  
  for (const [catName, cat] of Object.entries(categories)) {
    cat.percentage = (cat.present / cat.total) * 100;
    totalPresent += cat.present;
    totalParams += cat.total;
  }
  
  return {
    overall: (totalPresent / totalParams) * 100,
    totalPresent,
    totalParams,
    byCategory: categories
  };
}

/**
 * Count parameters recursively
 */
function countCategoryParams(obj, path, categories) {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    const category = getCategoryForPath(fullPath);
    
    if (category && categories[category]) {
      if (value !== null && value !== undefined && value !== '') {
        categories[category].present++;
        categories[category].params.push(fullPath);
      }
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      countCategoryParams(value, fullPath, categories);
    }
  }
}

/**
 * Map parameter path to category
 */
function getCategoryForPath(path) {
  if (path.startsWith('mechanical.')) return 'mechanical';
  if (path.startsWith('thermal.')) return 'thermal';
  if (path.startsWith('physical.')) return 'physical';
  if (path.startsWith('machinability.')) return 'machinability';
  if (path.startsWith('kienzle.')) return 'kienzle';
  if (path.startsWith('johnson_cook.')) return 'johnson_cook';
  if (path.startsWith('taylor.')) return 'taylor';
  if (path.startsWith('surface.')) return 'surface';
  if (path.startsWith('coolant.')) return 'coolant';
  if (path.startsWith('metadata.')) return 'metadata';
  
  // Top-level identification/classification
  const identParams = ['id', 'name', 'uns', 'din', 'jis', 'iso', 'aliases', 
                       'manufacturer_names', 'description', 'typical_applications',
                       'similar_materials', 'image_url'];
  const classParams = ['category', 'family', 'group', 'iso_p_class', 'iso_m_class',
                       'iso_k_class', 'iso_n_class', 'iso_s_class'];
  
  if (identParams.includes(path)) return 'identification';
  if (classParams.includes(path)) return 'classification';
  
  return null;
}
```

## 4.2 Data Quality Grading

```javascript
/**
 * Grade material data quality
 * Grades: A (Excellent), B (Good), C (Adequate), D (Poor), F (Failing)
 */
const GRADE_CRITERIA = {
  A: {
    minCoverage: 90,
    requiredComplete: true,
    maxRangeErrors: 0,
    maxRelationshipErrors: 0,
    description: 'Excellent - Production ready, fully validated'
  },
  B: {
    minCoverage: 75,
    requiredComplete: true,
    maxRangeErrors: 0,
    maxRelationshipWarnings: 2,
    description: 'Good - Usable for most calculations'
  },
  C: {
    minCoverage: 50,
    requiredComplete: true,
    maxRangeErrors: 1,
    maxRelationshipWarnings: 5,
    description: 'Adequate - Basic calculations supported'
  },
  D: {
    minCoverage: 30,
    requiredComplete: false,
    description: 'Poor - Limited functionality, needs enhancement'
  },
  F: {
    minCoverage: 0,
    description: 'Failing - Missing critical data, unusable'
  }
};

/**
 * Calculate grade for material
 */
function calculateGrade(material, validationResult) {
  const coverage = validationResult.coverage.overall;
  const requiredComplete = validationResult.presence.required.missing.length === 0;
  const rangeErrors = validationResult.rangeErrors.filter(e => e.severity === 'error').length;
  const rangeWarnings = validationResult.rangeErrors.filter(e => e.severity === 'warning').length;
  const relErrors = validationResult.relationshipErrors.filter(e => e.severity === 'error').length;
  const relWarnings = validationResult.relationshipErrors.filter(e => e.severity === 'warning').length;
  
  // Check grade criteria in order (A → F)
  if (coverage >= 90 && requiredComplete && rangeErrors === 0 && relErrors === 0) {
    return { grade: 'A', ...GRADE_CRITERIA.A };
  }
  
  if (coverage >= 75 && requiredComplete && rangeErrors === 0 && relWarnings <= 2) {
    return { grade: 'B', ...GRADE_CRITERIA.B };
  }
  
  if (coverage >= 50 && requiredComplete && rangeErrors <= 1 && relWarnings <= 5) {
    return { grade: 'C', ...GRADE_CRITERIA.C };
  }
  
  if (coverage >= 30) {
    return { grade: 'D', ...GRADE_CRITERIA.D };
  }
  
  return { grade: 'F', ...GRADE_CRITERIA.F };
}
```

## 4.3 Complete Validation Function

```javascript
/**
 * Perform complete material validation
 * @param material - Material to validate
 * @param level - Validation level (L1-L4)
 * @returns Complete validation result
 */
function validateMaterial(material, level = 'L2') {
  const result = {
    materialId: material.id,
    materialName: material.name,
    level,
    timestamp: new Date().toISOString(),
    
    // Presence validation
    presence: validatePresence(material),
    categoryRequirements: validateCategoryRequirements(material),
    
    // Range validation (L2+)
    rangeErrors: level !== 'L1' ? validateRanges(material) : [],
    
    // Relationship validation (L3+)
    relationshipErrors: ['L3', 'L4'].includes(level) ? 
                       validateRelationships(material) : [],
    
    // Coverage scoring
    coverage: calculateCoverage(material),
    
    // Calculation support
    calculationSupport: getSupportedCalculations(material)
  };
  
  // Calculate grade
  const gradeResult = calculateGrade(material, result);
  result.grade = gradeResult.grade;
  result.gradeDescription = gradeResult.description;
  
  // Determine overall validity
  if (level === 'L4') {
    // Strict: warnings count as errors
    result.isValid = result.presence.required.missing.length === 0 &&
                     result.rangeErrors.length === 0 &&
                     result.relationshipErrors.length === 0;
  } else {
    // Normal: only errors fail validation
    result.isValid = result.presence.required.missing.length === 0 &&
                     result.rangeErrors.filter(e => e.severity === 'error').length === 0 &&
                     result.relationshipErrors.filter(e => e.severity === 'error').length === 0;
  }
  
  return result;
}
```

## 4.4 Batch Validation

```javascript
/**
 * Validate multiple materials and generate report
 */
function validateMaterialBatch(materials, level = 'L2') {
  const results = materials.map(mat => validateMaterial(mat, level));
  
  // Summary statistics
  const summary = {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    
    byGrade: {
      A: results.filter(r => r.grade === 'A').length,
      B: results.filter(r => r.grade === 'B').length,
      C: results.filter(r => r.grade === 'C').length,
      D: results.filter(r => r.grade === 'D').length,
      F: results.filter(r => r.grade === 'F').length
    },
    
    averageCoverage: results.reduce((sum, r) => sum + r.coverage.overall, 0) / results.length,
    
    commonMissingParams: findCommonMissing(results),
    commonRangeErrors: findCommonRangeErrors(results)
  };
  
  return { results, summary };
}

/**
 * Find most commonly missing parameters
 */
function findCommonMissing(results) {
  const missing = {};
  
  for (const result of results) {
    for (const param of result.presence.required.missing) {
      missing[param] = (missing[param] || 0) + 1;
    }
    for (const param of result.presence.recommended.missing) {
      missing[param] = (missing[param] || 0) + 1;
    }
  }
  
  return Object.entries(missing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([param, count]) => ({ param, count, percentage: (count / results.length) * 100 }));
}
```

## 4.5 Validation Report Generation

```javascript
/**
 * Generate human-readable validation report
 */
function generateValidationReport(result) {
  const lines = [];
  
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`MATERIAL VALIDATION REPORT`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`Material: ${result.materialName} (${result.materialId})`);
  lines.push(`Level: ${result.level}`);
  lines.push(`Grade: ${result.grade} - ${result.gradeDescription}`);
  lines.push(`Valid: ${result.isValid ? 'YES ✓' : 'NO ✗'}`);
  lines.push(``);
  
  lines.push(`COVERAGE: ${result.coverage.overall.toFixed(1)}%`);
  lines.push(`  (${result.coverage.totalPresent} of ${result.coverage.totalParams} parameters)`);
  lines.push(``);
  
  if (result.presence.required.missing.length > 0) {
    lines.push(`MISSING REQUIRED PARAMETERS:`);
    for (const param of result.presence.required.missing) {
      lines.push(`  ✗ ${param}`);
    }
    lines.push(``);
  }
  
  if (result.rangeErrors.length > 0) {
    lines.push(`RANGE ERRORS:`);
    for (const err of result.rangeErrors) {
      lines.push(`  ${err.severity === 'error' ? '✗' : '⚠'} ${err.message}`);
    }
    lines.push(``);
  }
  
  if (result.relationshipErrors.length > 0) {
    lines.push(`RELATIONSHIP ERRORS:`);
    for (const err of result.relationshipErrors) {
      lines.push(`  ${err.severity === 'error' ? '✗' : '⚠'} ${err.description}`);
    }
    lines.push(``);
  }
  
  lines.push(`CALCULATION SUPPORT:`);
  for (const [calc, support] of Object.entries(result.calculationSupport)) {
    lines.push(`  ${support.supported ? '✓' : '✗'} ${calc}`);
  }
  
  lines.push(`═══════════════════════════════════════════════════════════════`);
  
  return lines.join('\n');
}
```

---

# SECTION 5: INTEGRATION

## 5.1 Skill Metadata

```yaml
skill_id: prism-material-validator
version: 1.0.0
category: materials-system
priority: HIGH

triggers:
  keywords:
    - "validate material", "check material"
    - "data quality", "coverage score"
    - "missing parameters", "incomplete"
    - "audit materials", "grade"
  contexts:
    - Importing new material data
    - Before calculations
    - Database quality audit
    - Production release

activation_rule: |
  IF (need to validate material data)
  THEN activate prism-material-validator
  AND use appropriate validation level

outputs:
  - Validation results
  - Coverage scores
  - Data quality grades
  - Missing parameter lists

related_skills:
  - prism-material-schema (defines valid ranges)
  - prism-material-lookup (gets materials to validate)
  - prism-material-enhancer (fills gaps found by validator)
```

## 5.2 API Summary

| Method | Input | Output | Use Case |
|--------|-------|--------|----------|
| `validateMaterial(mat, level)` | Material, Level | ValidationResult | Single validation |
| `validatePresence(mat)` | Material | PresenceResult | Check required params |
| `validateRanges(mat)` | Material | Error[] | Check value ranges |
| `validateRelationships(mat)` | Material | Error[] | Check consistency |
| `calculateCoverage(mat)` | Material | CoverageResult | Get % complete |
| `calculateGrade(mat, result)` | Material, Result | Grade | Get quality grade |
| `validateMaterialBatch(mats)` | Material[] | BatchResult | Validate many |
| `canPerformCalculation(mat, calc)` | Material, CalcType | Support | Check calc support |
| `generateValidationReport(result)` | ValidationResult | String | Human-readable report |

## 5.3 Usage Patterns

### Pattern 1: Pre-Calculation Validation

```javascript
// Before using material in calculation
function safeCalculation(materialId, calcType) {
  const material = getMaterialById(materialId);
  
  // Check if calculation is supported
  const support = canPerformCalculation(material, calcType);
  if (!support.supported) {
    return {
      error: true,
      message: `Cannot perform ${calcType}: missing ${support.missing.join(', ')}`
    };
  }
  
  // Proceed with calculation
  return performCalculation(material, calcType);
}
```

### Pattern 2: Import Validation

```javascript
// Validate imported material data
function importMaterial(data) {
  // Quick validation first
  const quickResult = validateMaterial(data, 'L1');
  if (!quickResult.isValid) {
    return { success: false, errors: quickResult.presence.required.missing };
  }
  
  // Full validation
  const fullResult = validateMaterial(data, 'L3');
  
  // Accept with warnings
  if (fullResult.isValid) {
    saveMaterial(data);
    return { 
      success: true, 
      warnings: fullResult.rangeErrors.concat(fullResult.relationshipErrors),
      grade: fullResult.grade
    };
  }
  
  return { success: false, result: fullResult };
}
```

### Pattern 3: Database Audit

```javascript
// Audit entire material database
async function auditMaterialDatabase() {
  const allMaterials = getAllMaterials();
  const { results, summary } = validateMaterialBatch(allMaterials, 'L3');
  
  console.log(`Database Audit Complete`);
  console.log(`Total: ${summary.total}`);
  console.log(`Valid: ${summary.valid} (${(summary.valid/summary.total*100).toFixed(1)}%)`);
  console.log(`Average Coverage: ${summary.averageCoverage.toFixed(1)}%`);
  console.log(`Grade Distribution: A=${summary.byGrade.A}, B=${summary.byGrade.B}, C=${summary.byGrade.C}, D=${summary.byGrade.D}, F=${summary.byGrade.F}`);
  
  // Flag materials needing attention
  const needsWork = results.filter(r => r.grade === 'D' || r.grade === 'F');
  console.log(`Materials needing enhancement: ${needsWork.length}`);
  
  return { results, summary, needsWork };
}
```

## 5.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MATERIAL-VALIDATOR QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  VALIDATION LEVELS                                                                      │
│  ═════════════════                                                                      │
│  L1 - Quick Check   : Required fields only (fast import check)                          │
│  L2 - Standard      : Required + value ranges (normal use)                              │
│  L3 - Comprehensive : All checks + relationships (quality audit)                        │
│  L4 - Strict        : L3 + warnings as errors (production release)                      │
│                                                                                         │
│  QUALITY GRADES                                                                         │
│  ═════════════════                                                                      │
│  A (90%+)  : Excellent - Production ready, fully validated                              │
│  B (75%+)  : Good - Usable for most calculations                                        │
│  C (50%+)  : Adequate - Basic calculations supported                                    │
│  D (30%+)  : Poor - Limited functionality, needs enhancement                            │
│  F (<30%)  : Failing - Missing critical data, unusable                                  │
│                                                                                         │
│  REQUIRED PARAMETERS (15)                                                               │
│  ═════════════════════════                                                              │
│  id, name, category, family                                                             │
│  mechanical.tensile_strength, hardness (HRC or HB)                                      │
│  thermal.thermal_conductivity, physical.density                                         │
│  machinability.machinability_index                                                      │
│  kienzle.kc1_1, kienzle.mc                                                              │
│  metadata: data_source_primary, data_confidence, parameter_coverage, last_updated       │
│                                                                                         │
│  KEY RELATIONSHIPS CHECKED                                                              │
│  ═════════════════════════                                                              │
│  • yield_strength ≤ tensile_strength                                                    │
│  • solidus_temp ≤ melting_point ≤ liquidus_temp                                         │
│  • shear_strength ≈ 0.6 × tensile_strength                                              │
│  • shear_modulus ≈ E / (2(1+ν))                                                         │
│  • HRC ↔ HB conversion consistency                                                      │
│                                                                                         │
│  QUICK VALIDATION                                                                       │
│  ═════════════════                                                                      │
│  const result = validateMaterial(material, 'L2');                                       │
│  if (result.isValid) { /* proceed */ }                                                  │
│  else { console.log(result.presence.required.missing); }                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT END

**Skill:** prism-material-validator
**Version:** 1.0
**Total Sections:** 5
**Part of:** SP.3 Materials System (SP.3.4 of 5)
**Created:** Session SP.3.4
**Status:** COMPLETE

**Key Features:**
- 4 validation levels (L1-L4) from quick to strict
- Presence validation for 127 parameters (15 required, 13 recommended)
- Physics-based range validation (~50 parameters)
- 8 relationship consistency rules
- Coverage scoring by category and overall
- Quality grading (A-F) with clear criteria
- Batch validation with summary statistics
- Human-readable report generation

**Principle:** Incomplete data blocks calculations - validate everything.

---
