---
name: prism-validator
description: |
  Automated quality checks. Syntax, ranges, cross-references, physical consistency.
---

```bash
node --check [filename].js
```

### JSON Validation
```bash
node -e "JSON.parse(require('fs').readFileSync('[file]', 'utf8'))"
```

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

## END OF SKILL
