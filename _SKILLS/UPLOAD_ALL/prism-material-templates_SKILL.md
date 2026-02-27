---
name: prism-material-templates
description: |
  Collection of material templates by category. Pre-filled starting points.
---

1. **Select template** matching material category
2. **Copy template** to new material file
3. **Modify only [MODIFY] fields** with specific values
4. **Validate** with prism-validator skill
5. **Save** to appropriate file

## TEMPLATE 2: MEDIUM CARBON STEEL (P-MS)
**Use for:** AISI 1030-1055
**Carbon:** 0.25-0.55%

```javascript
'P-MS-[XXX]': {
  identification: {
    prismId: 'P-MS-[XXX]',
    materialName: '[AISI XXXX description]',
    isoGroup: 'P',
    subCategory: 'MS',
    materialFamily: 'Carbon Steel',
    condition: 'normalized'
  },
  
  // Key differences from Low Carbon:
  physicalProperties: {
    density: 7850,
    meltingPoint: { solidus: 1480, liquidus: 1520 },  // Lower than low-C
    thermalConductivity: 49.8,                         // Slightly lower
    // ... rest similar
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 570, min: 520, max: 620 },   // Higher
    yieldStrength: { value: 340, min: 300, max: 380 },     // Higher
    elongation: { value: 20, min: 17, max: 24 },           // Lower
    hardness: { brinell: 170, rockwellB: 85 },             // Higher
    strainHardeningExponent: 0.18                          // Lower
  },
  
  kienzle: {
    Kc11_tangential: { value: 1800 },    // Higher = 4.0×UTS + 400
    mc_tangential: 0.25                   // Higher
  },
  
  johnsonCook: {
    A: 340,    // Higher yield
    B: 680,    // Higher hardening
    n: 0.22    // Lower exponent
  },
  
  taylorToolLife: {
    HSS: { C: 32, n: 0.12 },             // Lower C (harder to machine)
    carbide_coated: { C: 280, n: 0.27 }
  },
  
  chipFormation: {
    chipType: 'continuous_to_segmented',
    builtUpEdgeTendency: 'moderate_high'
  },
  
  machinability: {
    rating: 55                            // Lower than low-C
  }
}
```

## TEMPLATE 4: ALLOY STEEL (P-AS)
**Use for:** AISI 4140, 4340, 8620, etc.
**Alloying:** Cr, Mo, Ni, V additions

```javascript
'P-AS-[XXX]': {
  identification: {
    prismId: 'P-AS-[XXX]',
    isoGroup: 'P',
    subCategory: 'AS',
    condition: 'annealed'
  },
  
  composition: {
    carbon: { nominal: 0.40 },
    chromium: { nominal: 1.0 },           // Alloy content
    molybdenum: { nominal: 0.25 },
    nickel: { nominal: 0.0 },             // Varies by grade
    vanadium: { nominal: 0.0 }
  },
  
  physicalProperties: {
    density: 7850,
    thermalConductivity: 42.7,            // Lower due to alloying
    thermalExpansion: 12.3
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 660, min: 600, max: 720 },
    yieldStrength: { value: 420, min: 380, max: 460 },
    hardness: { brinell: 197, rockwellC: 13 }
  },
  
  kienzle: {
    Kc11_tangential: { value: 2000 },    // = 5.0×UTS + 200
    mc_tangential: 0.26
  },
  
  johnsonCook: {
    A: 420,
    B: 710,
    n: 0.20
  },
  
  taylorToolLife: {
    HSS: { C: 28, n: 0.11 },
    carbide_coated: { C: 260, n: 0.27 }
  },
  
  machinability: {
    rating: 55
  }
}
```

## TEMPLATE 6: ALUMINUM 6XXX (N-AL)
**Use for:** 6061, 6063, 6082
**Key feature:** Excellent machinability

```javascript
'N-AL-[XXX]': {
  identification: {
    prismId: 'N-AL-[XXX]',
    isoGroup: 'N',
    subCategory: 'AL',
    materialFamily: 'Aluminum Alloy'
  },
  
  physicalProperties: {
    density: 2700,
    meltingPoint: { solidus: 580, liquidus: 650 },
    thermalConductivity: 167,             // Very high
    thermalExpansion: 23.6,               // Very high
    specificHeat: 896,
    elasticModulus: 69
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 310 },      // T6 condition
    yieldStrength: { value: 275 },
    elongation: { value: 12 },
    hardness: { brinell: 95 }
  },
  
  kienzle: {
    Kc11_tangential: { value: 800 },
    mc_tangential: 0.18
  },
  
  taylorToolLife: {
    HSS: { C: 180, n: 0.18 },
    carbide_coated: { C: 800, n: 0.35 }   // Very high speeds
  },
  
  chipFormation: {
    chipType: 'continuous_helical',
    builtUpEdgeTendency: 'moderate'
  },
  
  machinability: {
    rating: 300                           // 3x easier than B1112
  },
  
  recommendedParameters: {
    turning: {
      roughing: { speed: [300, 600], feed: [0.30, 0.60] },
      finishing: { speed: [400, 800], feed: [0.10, 0.25] }
    }
  }
}
```

## SCALING RULES

### Carbon Content Effect (per 0.1% C increase)
| Property | Change |
|----------|--------|
| Hardness (HB) | +25-30 |
| UTS | +60-80 MPa |
| Yield | +40-60 MPa |
| Elongation | -2 to -4% |
| Kc1.1 | +80-120 N/mm² |
| Machinability | -4 to -6% |

### Condition Effects
| Condition | UTS Factor | Yield Factor | Hardness Factor |
|-----------|-----------|--------------|-----------------|
| Annealed (baseline) | 1.00 | 1.00 | 1.00 |
| Normalized | 1.05-1.10 | 1.08-1.15 | 1.05-1.12 |
| Cold Drawn | 1.15-1.25 | 1.25-1.40 | 1.15-1.25 |
| Q&T 400°C | 1.60-1.80 | 1.50-1.70 | 1.50-1.70 |
| Q&T 600°C | 1.25-1.40 | 1.20-1.35 | 1.25-1.35 |

### Quick Kc1.1 Estimation
```
Low Carbon (<0.25%C):   Kc11 = 3.5 × UTS + 500
Medium Carbon:          Kc11 = 4.0 × UTS + 400
High Carbon (>0.55%C):  Kc11 = 4.5 × UTS + 300
Alloy Steel:            Kc11 = 5.0 × UTS + 200
Austenitic Stainless:   Kc11 = 4.2 × UTS + 600
```

---

## END OF SKILL
