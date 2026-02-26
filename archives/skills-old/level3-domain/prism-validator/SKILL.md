---
name: prism-validator
description: |
  Automated quality checks for materials and modules. Validates syntax,
  parameter ranges, cross-references, and physical consistency. Catches
  errors before they propagate. Includes JavaScript syntax and JSON validation.
---

# PRISM Validator Skill
## Automated Quality Checks for Materials & Modules

---

## Purpose
**Catch errors before they propagate.** Validates syntax, parameter ranges, cross-references, and physical consistency for materials and extracted modules.

---

## 1. JAVASCRIPT SYNTAX VALIDATION

### Quick Syntax Check
```bash
node --check [filename].js
```

### JSON Validation
```bash
node -e "JSON.parse(require('fs').readFileSync('[file]', 'utf8'))"
```

---

## 2. MATERIAL FILE STRUCTURE

### Required Sections (14 total)
All materials MUST have these 14 sections:

```
✓ identification      (8 required params)
✓ composition         (varies by material)
✓ physicalProperties  (12 required params)
✓ mechanicalProperties (15 required params)
✓ kienzle             (9 required params)
✓ johnsonCook         (13 required params)
✓ taylorToolLife      (12 required params)
✓ chipFormation       (12 required params)
✓ friction            (10 required params)
✓ thermalMachining    (14 required params)
✓ surfaceIntegrity    (12 required params)
✓ machinability       (8 required params)
✓ recommendedParameters (20+ params)
✓ statisticalData     (8 required params)
```

### Quick Section Check
```javascript
const requiredSections = [
  'identification', 'composition', 'physicalProperties', 'mechanicalProperties',
  'kienzle', 'johnsonCook', 'taylorToolLife', 'chipFormation',
  'friction', 'thermalMachining', 'surfaceIntegrity', 'machinability',
  'recommendedParameters', 'statisticalData'
];

function validateSections(material) {
  const missing = requiredSections.filter(s => !material[s]);
  return { valid: missing.length === 0, missing };
}
```

---

## 3. VALUE RANGE VALIDATION

### Physical Properties
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| density | 1,500 | 20,000 | kg/m³ |
| meltingPoint.solidus | 200 | 3,500 | °C |
| meltingPoint.liquidus | 200 | 3,600 | °C |
| specificHeat | 100 | 2,000 | J/(kg·K) |
| thermalConductivity | 5 | 430 | W/(m·K) |
| thermalExpansion | 0.5 | 30 | µm/(m·K) |
| electricalResistivity | 0.01 | 100 | µΩ·m |
| poissonsRatio | 0.15 | 0.50 | - |
| elasticModulus | 10 | 450 | GPa |
| shearModulus | 5 | 200 | GPa |

### Mechanical Properties
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| tensileStrength | 50 | 3,500 | MPa |
| yieldStrength | 25 | 3,000 | MPa |
| elongation | 0.5 | 80 | % |
| reductionOfArea | 1 | 90 | % |
| hardness.brinell | 30 | 750 | HB |
| hardness.rockwellC | -20 | 70 | HRC |
| impactStrength.charpy | 1 | 300 | J |
| fatigueStrength | 20 | 1,500 | MPa |
| fractureToughness | 5 | 250 | MPa·√m |
| strainHardeningExponent | 0.05 | 0.60 | - |

### Kienzle Parameters
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| Kc11_tangential | 400 | 5,000 | N/mm² |
| Kc11_feed | 100 | 2,000 | N/mm² |
| Kc11_radial | 80 | 1,500 | N/mm² |
| mc_tangential | 0.10 | 0.45 | - |
| mc_feed | 0.15 | 0.55 | - |
| mc_radial | 0.18 | 0.60 | - |

### Johnson-Cook Parameters
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| A | 50 | 2,500 | MPa |
| B | 100 | 3,000 | MPa |
| n | 0.05 | 0.80 | - |
| C | 0.001 | 0.100 | - |
| m | 0.3 | 2.5 | - |
| meltingTemperature | 200 | 3,500 | °C |

### Taylor Tool Life
| Parameter | Min | Max | Notes |
|-----------|-----|-----|-------|
| HSS.C | 5 | 100 | m/min |
| HSS.n | 0.08 | 0.20 | - |
| carbide.C | 50 | 600 | m/min |
| carbide.n | 0.15 | 0.40 | - |
| ceramic.C | 100 | 1,000 | m/min |
| ceramic.n | 0.25 | 0.55 | - |

### Machinability
| Parameter | Min | Max | Notes |
|-----------|-----|-----|-------|
| rating | 5 | 400 | % vs B1112 |
| drillabilityIndex | 5 | 400 | - |
| grindabilityIndex | 5 | 200 | - |
| threadingIndex | 5 | 200 | - |

---

## 4. RELATIONSHIP VALIDATION

### Physical Consistency
```javascript
// These relationships MUST hold:

// 1. Yield < Tensile
yieldStrength < tensileStrength
// Typical ratio: yield/tensile = 0.50-0.95

// 2. Solidus < Liquidus
meltingPoint.solidus < meltingPoint.liquidus
// Typical gap: 20-100°C

// 3. Modulus relationships
elasticModulus > shearModulus
// E ≈ 2.5 × G for most metals

// 4. Poisson's ratio check
poissonsRatio ≈ (E / (2 × G)) - 1
// Tolerance: ±5%
```

### Kienzle Consistency
```javascript
// Force component ordering
Kc11_tangential > Kc11_feed > Kc11_radial

// Typical ratios:
// feed ≈ 30-40% of tangential
// radial ≈ 20-30% of tangential

// Exponent ordering
mc_tangential < mc_feed < mc_radial

// Typical ranges:
// mc_tangential: 0.18-0.32
// mc_feed: mc_tangential + 0.08-0.12
// mc_radial: mc_feed + 0.03-0.08
```

### Taylor Consistency
```javascript
// C value ordering (higher = easier to machine)
C_ceramic > C_carbide_coated > C_carbide_uncoated > C_HSS

// n value ordering (higher = less speed sensitive)
n_ceramic > n_carbide_coated > n_carbide_uncoated > n_HSS

// Typical n values by tool type:
// HSS: 0.10-0.15
// Carbide uncoated: 0.20-0.28
// Carbide coated: 0.25-0.32
// Ceramic: 0.30-0.45
```

### Johnson-Cook Consistency
```javascript
// A ≈ Yield strength (within ±20%)
Math.abs(A - yieldStrength) / yieldStrength < 0.20

// B relationship
B ≈ (tensileStrength - yieldStrength) / (strainHardeningExponent)^strainHardeningExponent

// Typical C values
C: 0.010-0.030 for most metals

// Melting point match
johnsonCook.meltingTemperature ≈ meltingPoint.solidus (±50°C)
```

---

## 5. MACHINABILITY CROSS-CHECKS

### High Strength = Low Machinability
```javascript
if (tensileStrength > 1000) {
  expect(machinability.rating < 40);
}
if (tensileStrength > 1500) {
  expect(machinability.rating < 25);
}
```

### Stainless Steel (M group)
```javascript
if (isoGroup === 'M') {
  expect(Kc11_tangential > 2000);
  expect(machinability.rating < 60);
  expect(thermalConductivity < 30);
}
```

### Titanium/Superalloys (S group)
```javascript
if (isoGroup === 'S') {
  expect(machinability.rating < 30);
  expect(taylorToolLife.HSS.C < 15);
  expect(thermalConductivity < 20);
}
```

### Aluminum (N group)
```javascript
if (isoGroup === 'N' && subCategory === 'AL') {
  expect(machinability.rating > 150);
  expect(thermalConductivity > 100);
  expect(Kc11_tangential < 1200);
}
```

---

## 6. VALIDATION FUNCTION

```javascript
function validateMaterial(material) {
  const errors = [];
  const warnings = [];
  
  // 1. Check all sections present
  const requiredSections = [
    'identification', 'composition', 'physicalProperties', 
    'mechanicalProperties', 'kienzle', 'johnsonCook', 
    'taylorToolLife', 'chipFormation', 'friction',
    'thermalMachining', 'surfaceIntegrity', 'machinability',
    'recommendedParameters', 'statisticalData'
  ];
  
  requiredSections.forEach(section => {
    if (!material[section]) {
      errors.push(`Missing section: ${section}`);
    }
  });
  
  // 2. Check ID format
  const id = material.identification?.prismId;
  if (!id?.match(/^[PMKNSH]-[A-Z]{2}-\d{3}$/)) {
    errors.push(`Invalid ID format: ${id}`);
  }
  
  // 3. Check yield < tensile
  const y = material.mechanicalProperties?.yieldStrength?.value;
  const t = material.mechanicalProperties?.tensileStrength?.value;
  if (y && t && y >= t) {
    errors.push(`Yield (${y}) must be < tensile (${t})`);
  }
  
  // 4. Check solidus < liquidus
  const sol = material.physicalProperties?.meltingPoint?.solidus;
  const liq = material.physicalProperties?.meltingPoint?.liquidus;
  if (sol && liq && sol >= liq) {
    errors.push(`Solidus (${sol}) must be < liquidus (${liq})`);
  }
  
  // 5. Check Kc ordering
  const kc_t = material.kienzle?.Kc11_tangential?.value;
  const kc_f = material.kienzle?.Kc11_feed?.value;
  const kc_r = material.kienzle?.Kc11_radial?.value;
  if (kc_t && kc_f && kc_r) {
    if (!(kc_t > kc_f && kc_f > kc_r)) {
      warnings.push(`Kc ordering should be: tangential > feed > radial`);
    }
  }
  
  // 6. Check J-C A ≈ yield
  const A = material.johnsonCook?.A;
  if (A && y) {
    const diff = Math.abs(A - y) / y;
    if (diff > 0.25) {
      warnings.push(`J-C A (${A}) differs from yield (${y}) by ${(diff*100).toFixed(0)}%`);
    }
  }
  
  // 7. Check Kc1.1 range
  if (kc_t && (kc_t < 400 || kc_t > 5000)) {
    errors.push(`Kc1.1 tangential (${kc_t}) out of range [400-5000]`);
  }
  
  // 8. Check composition sums ~100%
  const comp = material.composition;
  if (comp) {
    let sum = 0;
    Object.entries(comp).forEach(([k, v]) => {
      if (k !== 'iron' && typeof v?.nominal === 'number') {
        sum += v.nominal;
      }
    });
    if (sum > 50) {  // If enough alloying elements specified
      warnings.push(`Check composition sum: non-iron elements = ${sum.toFixed(1)}%`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 7. QUICK VALIDATION CHECKLIST

Use this mental checklist for each material:

```
□ ID matches pattern: [ISO]-[SUB]-[###]
□ All 14 sections present
□ Composition adds to ~100% (with Fe balance)
□ Yield < Tensile (ratio 0.5-0.95)
□ Solidus < Liquidus
□ Kc1.1 in valid range (400-5000 N/mm²)
□ Kc ordering: tangential > feed > radial
□ mc ordering: tangential < feed < radial
□ Taylor n: HSS < carbide < ceramic
□ Taylor C: HSS < carbide < ceramic
□ J-C A ≈ yield strength (±20%)
□ Thermal conductivity reasonable for material type
□ Machinability rating consistent with hardness/strength
```

---

## 8. FILE STRUCTURE VALIDATION

### Required File Elements
```javascript
// 1. Header comment
/**
 * PRISM Manufacturing Intelligence
 * Material Database: [Category]
 * ...
 */

// 2. Metadata
const METADATA = {
  version: "9.0.0",
  category: "[Category]",
  count: [N],
  lastUpdated: "[ISO date]"
};

// 3. Materials object
const [CATEGORY]_MATERIALS = {
  'P-CS-001': { ... },
  'P-CS-002': { ... }
};

// 4. Export
if (typeof module !== 'undefined') {
  module.exports = { METADATA, [CATEGORY]_MATERIALS };
}
```

---

## END OF SKILL
