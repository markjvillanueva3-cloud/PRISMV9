---
name: prism-material-template
description: |
  Template for creating new materials. Ensures completeness and consistency.
---

1. **Identify material category** (carbon steel, alloy steel, stainless, aluminum, etc.)
2. **Copy appropriate template** from templates section below
3. **Modify only the values that differ** from the template defaults
4. **Validate** using prism-validator skill

## TEMPLATE: LOW CARBON STEEL (P-CS)
### For AISI 1005-1026, ≤0.25% C

```javascript
// COPY THIS TEMPLATE - Modify values marked with [MODIFY]
{
  // SECTION 1: IDENTIFICATION [MODIFY ALL]
  identification: {
    id: '[MODIFY: P-CS-XXX]',
    name: '[MODIFY: AISI XXXX]',
    alternateNames: ['[MODIFY]'],
    uns: '[MODIFY: G10XXX]',
    standard: 'ASTM A29/A29M',
    isoGroup: 'P',
    materialType: 'low_carbon_steel',
    condition: '[MODIFY: annealed/cold_drawn/hot_rolled]'
  },

  // SECTION 2: COMPOSITION [MODIFY C, Mn values]
  composition: {
    C:  { min: 0.08, max: 0.13, typical: 0.10 },  // [MODIFY]
    Mn: { min: 0.30, max: 0.60, typical: 0.45 },  // [MODIFY]
    P:  { min: 0, max: 0.040, typical: 0.015 },
    S:  { min: 0, max: 0.050, typical: 0.020 },
    Si: { min: 0, max: 0.10, typical: 0.05 },
    Fe: { min: 99.0, max: 99.5, typical: 99.3, note: 'balance' }
  },

  // SECTION 3: PHYSICAL PROPERTIES [Mostly stable for low-C steels]
  physicalProperties: {
    density: { value: 7870, unit: 'kg/m³', tolerance: '±0.5%' },
    meltingRange: { solidus: 1490, liquidus: 1530, unit: '°C' },
    thermalConductivity: {
      values: [
        { temp: 25, k: 51.9 },
        { temp: 100, k: 51.1 },
        { temp: 200, k: 49.8 },
        { temp: 400, k: 45.2 }
      ],
      unit: 'W/(m·K)'
    },
    specificHeat: {
      values: [
        { temp: 25, cp: 486 },
        { temp: 200, cp: 519 },
        { temp: 400, cp: 561 }
      ],
      unit: 'J/(kg·K)'
    },
    thermalExpansion: {
      values: [
        { tempRange: '20-100°C', alpha: 11.7 },
        { tempRange: '20-200°C', alpha: 12.1 },
        { tempRange: '20-400°C', alpha: 13.0 }
      ],
      unit: '10⁻⁶/K'
    },
    thermalDiffusivity: { value: 13.6, unit: 'mm²/s', at: '25°C' },
    elasticModulus: { value: 200, unit: 'GPa' },
    shearModulus: { value: 80, unit: 'GPa' },
    poissonsRatio: { value: 0.29 },
    electricalResistivity: { value: 0.17, unit: 'μΩ·m', at: '20°C' },
    magneticPermeability: { value: 2500, type: 'ferromagnetic' },
    hardness: { value: 105, unit: 'HB', condition: '[MODIFY]' }  // [MODIFY based on condition]
  },

  // SECTION 4: MECHANICAL PROPERTIES [MODIFY based on carbon content & condition]
  mechanicalProperties: {
    tensileStrength: { value: 370, unit: 'MPa', min: 340, max: 400 },  // [MODIFY]
    yieldStrength: { value: 250, unit: 'MPa', offset: '0.2%' },  // [MODIFY]
    elongation: { value: 30, unit: '%', gaugeLength: '50mm' },  // [MODIFY]
    reductionOfArea: { value: 60, unit: '%' },
    trueStress: { atNecking: 480, unit: 'MPa' },
    trueStrain: { atNecking: 0.24 },
    fatigueStrength: {
      rotatingBending: { value: 185, unit: 'MPa', cycles: 1e7 },
      axial: { value: 160, unit: 'MPa', R: -1 }
    },
    fatigueLimit: { value: 185, unit: 'MPa' },
    impactToughness: {
      charpy: { value: 120, unit: 'J', temperature: 20, notch: 'V-notch' },
      izod: { value: 100, unit: 'J' }
    },
    fractureToughness: { KIc: { value: 110, unit: 'MPa√m' } },
    creepStrength: { value: null, unit: 'MPa', temperature: null, hours: null, note: 'Not applicable' },
    stressRupture: { value: null, unit: 'MPa', temperature: null, hours: null },
    hardenability: { Jominy: { J4: null, J8: null, J16: null, unit: 'HRC', note: 'Non-hardenable' } },
    weldability: { rating: 'EXCELLENT', preheat: null, PWHT: 'Not required' },
    formability: { bendRadius: '0.5t minimum', deepDrawing: 'EXCELLENT' }
  },

  // SECTION 5: KIENZLE [MODIFY Kc1.1 based on hardness/strength]
  kienzle: {
    tangential: {
      Kc11: { value: 1550, unit: 'N/mm²', tolerance: '±8%' },  // [MODIFY: ~4.2×UTS for low-C]
      mc: { value: 0.22, description: 'Chip thickness exponent' }
    },
    feed: {
      Kc11: { value: 540, unit: 'N/mm²' },
      mc: { value: 0.28 }
    },
    radial: {
      Kc11: { value: 390, unit: 'N/mm²' },
      mc: { value: 0.25 }
    },
    corrections: {
      rakeAngle: { referenceRake: 6, factor: 1.5, note: 'per degree deviation' },
      speed: { referenceSpeed: 100, exponent: -0.07 },
      wear: { factor: 1.3, description: 'per 0.1mm VB' }
    },
    source: 'Machining Data Handbook + empirical validation',
    reliability: 'HIGH'
  },

  // SECTION 6: JOHNSON-COOK [MODIFY A, B based on yield/tensile]
  johnsonCook: {
    A: { value: 250, unit: 'MPa', description: 'Initial yield stress' },  // ≈ yield strength
    B: { value: 580, unit: 'MPa', description: 'Hardening coefficient' },  // [MODIFY]
    n: { value: 0.36, description: 'Hardening exponent' },  // 0.32-0.40 for low-C
    C: { value: 0.010, description: 'Strain rate sensitivity' },
    m: { value: 0.95, description: 'Thermal softening exponent' },
    referenceStrainRate: { value: 1.0, unit: 's⁻¹' },
    referenceTemperature: { value: 20, unit: '°C' },
    meltingTemperature: { value: 1528, unit: '°C' },
    damageParameters: {
      d1: { value: 0.10, description: 'Initial failure strain' },
      d2: { value: 1.40, description: 'Exponential factor' },
      d3: { value: -1.5, description: 'Triaxiality factor' },
      d4: { value: 0.002, description: 'Strain rate factor' },
      d5: { value: 0.60, description: 'Temperature factor' }
    },
    source: 'Literature + FEM calibration',
    reliability: 'MEDIUM-HIGH'
  },

  // SECTION 7: TAYLOR TOOL LIFE [Stable for low-C category]
  taylorToolLife: {
    hss: { C: { value: 42, unit: 'm/min' }, n: { value: 0.125 }, a: { value: 0.60 }, b: { value: 0.15 }, temperatureLimit: { value: 550, unit: '°C' } },
    carbide_uncoated: { C: { value: 270, unit: 'm/min' }, n: { value: 0.25 }, temperatureLimit: { value: 900, unit: '°C' } },
    carbide_coated: { C: { value: 360, unit: 'm/min' }, n: { value: 0.28 }, temperatureLimit: { value: 1000, unit: '°C' } },
    ceramic: { C: { value: 600, unit: 'm/min' }, n: { value: 0.35 }, temperatureLimit: { value: 1200, unit: '°C' } },
    cbn: { C: { value: null, unit: 'm/min', note: 'Not recommended' }, n: { value: null }, temperatureLimit: { value: null, unit: '°C' } },
    wearRates: { flankWearLimit: { value: 0.30, unit: 'mm' }, craterWearLimit: { value: 0.15, unit: 'mm' }, notchWearLimit: { value: 0.50, unit: 'mm' } }
  },

  // SECTION 8: CHIP FORMATION [Consistent for low-C]
  chipFormation: {
    chipType: { primary: 'CONTINUOUS', secondary: 'Long, stringy' },
    shearAngle: { value: 28, unit: 'degrees', range: { min: 25, max: 32 } },
    chipCompressionRatio: { value: 2.4, range: { min: 2.1, max: 2.8 } },
    segmentationFrequency: { value: null, unit: 'kHz', condition: 'Not segmented' },
    builtUpEdge: { tendency: 'HIGH', speedRange: { min: 15, max: 60, unit: 'm/min' }, temperatureRange: { min: 200, max: 400, unit: '°C' } },
    breakability: { rating: 'POOR', chipBreakerRequired: true, recommendedBreaker: 'PM or MF geometry' },
    colorAtSpeed: { slow: 'Silver/Blue', optimal: 'Light straw', high: 'Blue/Purple' },
    chipMorphology: { description: 'Long continuous spiral', image: null }
  },

  // SECTION 9: FRICTION [Consistent for low-C]
  friction: {
    toolChipInterface: { dry: { value: 0.55 }, withCoolant: { value: 0.35 }, withMQL: { value: 0.28 } },
    toolWorkpieceInterface: { dry: { value: 0.45 }, withCoolant: { value: 0.30 } },
    contactLength: { stickingZone: { ratio: 0.45 }, slidingZone: { ratio: 0.55 } },
    seizureTemperature: { value: 480, unit: '°C' },
    adhesionTendency: { rating: 'HIGH', affectedTools: ['Uncoated carbide', 'HSS'] },
    abrasiveness: { rating: 'LOW', cause: 'Soft ferrite matrix' },
    diffusionWearTendency: { rating: 'MODERATE', affectedTools: ['Uncoated carbide at high speed'] }
  },

  // SECTION 10: THERMAL MACHINING [MODIFY maxRecommended if needed]
  thermalMachining: {
    cuttingTemperature: { model: 'empirical', coefficients: { a: 320, b: 0.35, c: 0.15 }, maxRecommended: { value: 650, unit: '°C' } },
    heatPartition: { chip: { value: 0.75 }, tool: { value: 0.10 }, workpiece: { value: 0.10 }, coolant: { value: 0.05 } },
    coolantEffectiveness: {
      flood: { heatRemoval: 0.25, temperatureReduction: 120 },
      mist: { heatRemoval: 0.10 },
      mql: { lubrication: 0.85, cooling: 0.15 },
      cryogenic: { applicability: 'Not typically needed', benefit: null }
    },
    thermalDamageThreshold: { whiteLayer: { value: null, note: 'Low carbon - no risk' }, rehardening: { value: null }, overTempering: { value: null }, burning: { value: 850, unit: '°C' } },
    preheatingBenefit: { applicable: false, recommendedTemp: null }
  },

  // SECTION 11: SURFACE INTEGRITY [Consistent for low-C]
  surfaceIntegrity: {
    residualStress: { typical: { surface: -50, subsurface: 20, unit: 'MPa' }, depth: { value: 25, unit: 'μm' }, type: 'compressive at surface' },
    workHardening: { depthAffected: { value: 80, unit: 'μm' }, hardnessIncrease: { value: 15, unit: '%' }, strainHardeningExponent: { value: 0.22 } },
    surfaceRoughness: {
      achievable: {
        roughing: { Ra: { min: 3.2, max: 12.5 } },
        semifinishing: { Ra: { min: 1.6, max: 3.2 } },
        finishing: { Ra: { min: 0.4, max: 1.6 } }
      },
      unit: 'μm'
    },
    metallurgicalDamage: { whiteLayerRisk: 'VERY_LOW', burntSurfaceRisk: 'LOW', microcrackRisk: 'VERY_LOW', phaseTransformationRisk: 'VERY_LOW' },
    burr: { tendency: 'HIGH', type: 'rollover', mitigation: 'Sharp tools, proper feeds, deburring pass' }
  },

  // SECTION 12: MACHINABILITY [MODIFY based on actual testing]
  machinability: {
    overallRating: { grade: 'B+', percent: { value: 70, reference: 'AISI B1112 = 100%' } },  // [MODIFY]
    turningIndex: { value: 72 },
    millingIndex: { value: 68 },
    drillingIndex: { value: 65 },
    grindingIndex: { value: 80 },
    factors: { toolWear: 'LOW', surfaceFinish: 'GOOD', chipControl: 'POOR', powerRequirement: 'LOW', cuttingForces: 'MODERATE' }
  },

  // SECTION 13: RECOMMENDED PARAMETERS [MODIFY based on material]
  recommendedParameters: {
    turning: {
      roughing: { speed: { value: 180, unit: 'm/min', range: { min: 150, max: 220 } }, feed: { value: 0.30, unit: 'mm/rev', range: { min: 0.20, max: 0.40 } }, depthOfCut: { value: 3.0, unit: 'mm', max: 5.0 } },
      finishing: { speed: { value: 250, unit: 'm/min' }, feed: { value: 0.12, unit: 'mm/rev' }, depthOfCut: { value: 0.5, unit: 'mm' } }
    },
    milling: {
      roughing: { speed: 160, feedPerTooth: 0.15, ae: 0.65, ap: 4.0 },
      finishing: { speed: 220, feedPerTooth: 0.08, ae: 0.15, ap: 1.0 }
    },
    drilling: { speed: { value: 80, unit: 'm/min' }, feed: { value: 0.22, unit: 'mm/rev' }, peckDepth: { value: 3.0, unit: 'xD' } },
    threading: { speed: { value: 60, unit: 'm/min' }, infeedMethod: 'modified_flank', passes: 6 },
    toolGeometry: { rakeAngle: { value: 8, unit: 'degrees', range: { min: 5, max: 12 } }, clearanceAngle: { value: 7, unit: 'degrees' }, noseRadius: { value: 0.8, unit: 'mm' }, edgePreparation: 'honed' },
    insertGrade: { primary: 'P15-P25', coating: ['TiN', 'TiAlN', 'TiCN'], substrate: 'Submicron carbide', alternatives: ['CVD-coated', 'Cermet'] },
    coolant: { recommended: 'RECOMMENDED', type: 'flood', concentration: '6-8%', pressure: { value: 20, unit: 'bar' } },
    techniques: { hsmRecommended: true, trochoidalBenefit: 'MODERATE', adaptiveClearingBenefit: 'HIGH', specialNotes: ['Use chip breaker geometry', 'Avoid dwelling'] }
  },

  // SECTION 14: STATISTICAL DATA
  statisticalData: {
    dataPoints: { value: 150, description: 'Number of data points' },
    confidenceLevel: { value: 0.85, description: 'Statistical confidence' },
    standardDeviation: { speed: { value: 12 }, force: { value: 8 }, toolLife: { value: 18 } },
    sources: ['Machining Data Handbook 3rd Ed', 'ASM Metals Handbook Vol 16', 'Manufacturer data'],
    lastValidated: '2026-Q1',
    reliability: 'HIGH',
    crossValidated: true,
    peerReviewed: false
  }
}
```

## PROPERTY SCALING RULES

### As Carbon Content Increases:
| Property | Change | Formula Adjustment |
|----------|--------|-------------------|
| Hardness | ↑ | +30 HB per 0.1% C (annealed) |
| UTS | ↑ | +70 MPa per 0.1% C |
| Yield | ↑ | +50 MPa per 0.1% C |
| Elongation | ↓ | -3% per 0.1% C |
| Kc1.1 | ↑ | +100 N/mm² per 0.1% C |
| Machinability | ↓ | -5% per 0.1% C |
| BUE tendency | ↓ | Decreases with C |
| Chip breakability | ↑ | Improves with C |

### Condition Effects (vs Annealed):
| Condition | UTS | Yield | Elong | Hardness | Kc1.1 |
|-----------|-----|-------|-------|----------|-------|
| Annealed | 1.0× | 1.0× | 1.0× | 1.0× | 1.0× |
| Normalized | 1.05× | 1.10× | 0.95× | 1.08× | 1.05× |
| Cold Drawn | 1.20× | 1.35× | 0.70× | 1.25× | 1.15× |
| Stress Relieved | 0.98× | 0.95× | 1.02× | 0.95× | 0.98× |
| Quench+Temper | 1.5-2.5× | 1.8-3.0× | 0.4-0.7× | 1.5-3.0× | 1.3-1.8× |

---

## END OF SKILL
