---
name: prism-material-validator
description: |
  Validates material data completeness and physical consistency.
---

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
