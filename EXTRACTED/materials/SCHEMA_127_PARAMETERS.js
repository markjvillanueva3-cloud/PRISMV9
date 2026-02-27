/**
 * PRISM MATERIALS DATABASE - 127 PARAMETER SCHEMA
 * ================================================
 * 
 * PRISM Manufacturing Intelligence v9.0
 * Created: 2026-01-22 (Fresh Start)
 * 
 * This file defines the EXACT 127-parameter structure for ALL materials.
 * Every material in the database MUST follow this schema.
 * 
 * PARAMETER COUNT BREAKDOWN:
 * --------------------------
 * 1. Identification (8)
 * 2. Composition (varies, ~10-15 typical)
 * 3. Physical Properties (12)
 * 4. Mechanical Properties (15)
 * 5. Kienzle Cutting Force (9)
 * 6. Johnson-Cook Constitutive (13)
 * 7. Taylor Tool Life (12)
 * 8. Chip Formation (12)
 * 9. Friction/Tribology (10)
 * 10. Thermal Machining (14)
 * 11. Surface Integrity (12)
 * 12. Machinability Indices (8)
 * 13. Recommended Parameters (20+)
 * 14. Statistical Data (8)
 * --------------------------
 * TOTAL: 127+ parameters
 */

const MATERIAL_SCHEMA = {

  //===========================================================================
  // SECTION 1: IDENTIFICATION (8 parameters)
  //===========================================================================
  identification: {
    id: { type: 'string', required: true, example: 'P-CS-001', description: 'Unique material ID' },
    name: { type: 'string', required: true, example: 'AISI 1018', description: 'Primary designation' },
    alternateNames: { type: 'array', required: false, example: ['SAE 1018', 'UNS G10180', 'C1018'], description: 'Other names' },
    uns: { type: 'string', required: false, example: 'G10180', description: 'Unified Numbering System' },
    standard: { type: 'string', required: true, example: 'ASTM A29/A29M', description: 'Governing standard' },
    isoGroup: { type: 'string', required: true, enum: ['P', 'M', 'K', 'N', 'S', 'H'], description: 'ISO material group' },
    materialType: { type: 'string', required: true, example: 'low_carbon_steel', description: 'Material classification' },
    condition: { type: 'string', required: true, example: 'annealed', description: 'Heat treatment condition' }
  },

  //===========================================================================
  // SECTION 2: COMPOSITION (variable, typically 10-15 elements)
  //===========================================================================
  composition: {
    // Each element follows this structure:
    element: {
      min: { type: 'number', unit: 'wt%' },
      max: { type: 'number', unit: 'wt%' },
      typical: { type: 'number', unit: 'wt%' },
      note: { type: 'string', optional: true }
    }
    // Common elements: C, Mn, Si, P, S, Cr, Ni, Mo, V, W, Co, Cu, Al, Ti, Nb, N, B
  },

  //===========================================================================
  // SECTION 3: PHYSICAL PROPERTIES (12 parameters)
  //===========================================================================
  physicalProperties: {
    density: { value: 'number', unit: 'kg/m³', tolerance: 'string' },
    meltingRange: { solidus: 'number', liquidus: 'number', unit: '°C' },
    thermalConductivity: { 
      values: [{ temp: 'number', k: 'number' }], // Multiple temperatures
      unit: 'W/(m·K)' 
    },
    specificHeat: { 
      values: [{ temp: 'number', cp: 'number' }],
      unit: 'J/(kg·K)' 
    },
    thermalExpansion: { 
      values: [{ tempRange: 'string', alpha: 'number' }],
      unit: '10⁻⁶/K' 
    },
    thermalDiffusivity: { value: 'number', unit: 'mm²/s', at: 'string' },
    elasticModulus: { value: 'number', unit: 'GPa' },
    shearModulus: { value: 'number', unit: 'GPa' },
    poissonsRatio: { value: 'number' },
    electricalResistivity: { value: 'number', unit: 'μΩ·m', at: 'string' },
    magneticPermeability: { value: 'number', type: 'string' }, // ferromagnetic, paramagnetic, etc.
    hardness: { value: 'number', unit: 'HB/HRC/HV', condition: 'string' }
  },

  //===========================================================================
  // SECTION 4: MECHANICAL PROPERTIES (15 parameters)
  //===========================================================================
  mechanicalProperties: {
    tensileStrength: { value: 'number', unit: 'MPa', min: 'number', max: 'number' },
    yieldStrength: { value: 'number', unit: 'MPa', offset: '0.2%' },
    elongation: { value: 'number', unit: '%', gaugeLength: 'string' },
    reductionOfArea: { value: 'number', unit: '%' },
    trueStress: { atNecking: 'number', unit: 'MPa' },
    trueStrain: { atNecking: 'number' },
    fatigueStrength: { 
      rotatingBending: { value: 'number', unit: 'MPa', cycles: 'number' },
      axial: { value: 'number', unit: 'MPa', R: 'number' }
    },
    fatigueLimit: { value: 'number', unit: 'MPa' },
    impactToughness: { 
      charpy: { value: 'number', unit: 'J', temperature: 'number', notch: 'string' },
      izod: { value: 'number', unit: 'J' }
    },
    fractureToughness: { KIc: { value: 'number', unit: 'MPa√m' } },
    creepStrength: { value: 'number', unit: 'MPa', temperature: 'number', hours: 'number' },
    stressRupture: { value: 'number', unit: 'MPa', temperature: 'number', hours: 'number' },
    hardenability: { Jominy: { J4: 'number', J8: 'number', J16: 'number', unit: 'HRC' } },
    weldability: { rating: 'string', preheat: 'number', PWHT: 'string' },
    formability: { bendRadius: 'string', deepDrawing: 'string' }
  },

  //===========================================================================
  // SECTION 5: KIENZLE CUTTING FORCE MODEL (9 parameters)
  //===========================================================================
  kienzle: {
    tangential: {
      Kc11: { value: 'number', unit: 'N/mm²', tolerance: 'string' },
      mc: { value: 'number', description: 'Chip thickness exponent' }
    },
    feed: {
      Kc11: { value: 'number', unit: 'N/mm²' },
      mc: { value: 'number' }
    },
    radial: {
      Kc11: { value: 'number', unit: 'N/mm²' },
      mc: { value: 'number' }
    },
    corrections: {
      rakeAngle: { referenceRake: 'number', factor: 'number' },
      speed: { referenceSpeed: 'number', exponent: 'number' },
      wear: { factor: 'number', description: 'per 0.1mm VB' }
    },
    source: 'string',
    reliability: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] }
  },

  //===========================================================================
  // SECTION 6: JOHNSON-COOK CONSTITUTIVE MODEL (13 parameters)
  //===========================================================================
  johnsonCook: {
    // Flow stress: σ = (A + Bεⁿ)(1 + C·ln(ε̇/ε̇₀))(1 - T*ᵐ)
    A: { value: 'number', unit: 'MPa', description: 'Initial yield stress' },
    B: { value: 'number', unit: 'MPa', description: 'Hardening coefficient' },
    n: { value: 'number', description: 'Hardening exponent' },
    C: { value: 'number', description: 'Strain rate sensitivity' },
    m: { value: 'number', description: 'Thermal softening exponent' },
    referenceStrainRate: { value: 'number', unit: 's⁻¹' },
    referenceTemperature: { value: 'number', unit: '°C' },
    meltingTemperature: { value: 'number', unit: '°C' },
    // Johnson-Cook Damage Model
    damageParameters: {
      d1: { value: 'number', description: 'Initial failure strain' },
      d2: { value: 'number', description: 'Exponential factor' },
      d3: { value: 'number', description: 'Triaxiality factor' },
      d4: { value: 'number', description: 'Strain rate factor' },
      d5: { value: 'number', description: 'Temperature factor' }
    },
    source: 'string',
    reliability: 'string'
  },

  //===========================================================================
  // SECTION 7: TAYLOR TOOL LIFE (12 parameters)
  //===========================================================================
  taylorToolLife: {
    // V·Tⁿ·fᵃ·dᵇ = C
    hss: {
      C: { value: 'number', unit: 'm/min' },
      n: { value: 'number' },
      a: { value: 'number', default: 0.6 },
      b: { value: 'number', default: 0.15 },
      temperatureLimit: { value: 'number', unit: '°C' }
    },
    carbide_uncoated: {
      C: { value: 'number', unit: 'm/min' },
      n: { value: 'number' },
      temperatureLimit: { value: 'number', unit: '°C' }
    },
    carbide_coated: {
      C: { value: 'number', unit: 'm/min' },
      n: { value: 'number' },
      temperatureLimit: { value: 'number', unit: '°C' }
    },
    ceramic: {
      C: { value: 'number', unit: 'm/min' },
      n: { value: 'number' },
      temperatureLimit: { value: 'number', unit: '°C' }
    },
    cbn: {
      C: { value: 'number', unit: 'm/min' },
      n: { value: 'number' },
      temperatureLimit: { value: 'number', unit: '°C' }
    },
    wearRates: {
      flankWearLimit: { value: 'number', unit: 'mm' },
      craterWearLimit: { value: 'number', unit: 'mm' },
      notchWearLimit: { value: 'number', unit: 'mm' }
    }
  },

  //===========================================================================
  // SECTION 8: CHIP FORMATION (12 parameters)
  //===========================================================================
  chipFormation: {
    chipType: { 
      primary: { type: 'string', enum: ['CONTINUOUS', 'DISCONTINUOUS', 'SEGMENTED', 'SERRATED', 'POWDER'] },
      secondary: 'string'
    },
    shearAngle: { value: 'number', unit: 'degrees', range: { min: 'number', max: 'number' } },
    chipCompressionRatio: { value: 'number', range: { min: 'number', max: 'number' } },
    segmentationFrequency: { value: 'number', unit: 'kHz', condition: 'string' },
    builtUpEdge: {
      tendency: { type: 'string', enum: ['NONE', 'VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'] },
      speedRange: { min: 'number', max: 'number', unit: 'm/min' },
      temperatureRange: { min: 'number', max: 'number', unit: '°C' }
    },
    breakability: {
      rating: { type: 'string', enum: ['POOR', 'FAIR', 'GOOD', 'EXCELLENT', 'OUTSTANDING'] },
      chipBreakerRequired: 'boolean',
      recommendedBreaker: 'string'
    },
    colorAtSpeed: { slow: 'string', optimal: 'string', high: 'string' },
    chipMorphology: { description: 'string', image: 'string' }
  },

  //===========================================================================
  // SECTION 9: FRICTION/TRIBOLOGY (10 parameters)
  //===========================================================================
  friction: {
    toolChipInterface: {
      dry: { value: 'number' },
      withCoolant: { value: 'number' },
      withMQL: { value: 'number' }
    },
    toolWorkpieceInterface: {
      dry: { value: 'number' },
      withCoolant: { value: 'number' }
    },
    contactLength: {
      stickingZone: { ratio: 'number' },
      slidingZone: { ratio: 'number' }
    },
    seizureTemperature: { value: 'number', unit: '°C' },
    adhesionTendency: { rating: 'string', affectedTools: ['string'] },
    abrasiveness: { rating: 'string', cause: 'string' },
    diffusionWearTendency: { rating: 'string', affectedTools: ['string'] }
  },

  //===========================================================================
  // SECTION 10: THERMAL MACHINING (14 parameters)
  //===========================================================================
  thermalMachining: {
    cuttingTemperature: {
      model: 'string', // 'empirical', 'analytical', 'FEM'
      coefficients: { a: 'number', b: 'number', c: 'number' },
      // T = a × V^b × f^c
      maxRecommended: { value: 'number', unit: '°C' }
    },
    heatPartition: {
      chip: { value: 'number', description: 'fraction to chip' },
      tool: { value: 'number', description: 'fraction to tool' },
      workpiece: { value: 'number', description: 'fraction to workpiece' },
      coolant: { value: 'number', description: 'fraction removed by coolant' }
    },
    coolantEffectiveness: {
      flood: { heatRemoval: 'number', temperatureReduction: 'number' },
      mist: { heatRemoval: 'number' },
      mql: { lubrication: 'number', cooling: 'number' },
      cryogenic: { applicability: 'string', benefit: 'number' }
    },
    thermalDamageThreshold: {
      whiteLayer: { value: 'number', unit: '°C' },
      rehardening: { value: 'number', unit: '°C' },
      overTempering: { value: 'number', unit: '°C' },
      burning: { value: 'number', unit: '°C' }
    },
    preheatingBenefit: { applicable: 'boolean', recommendedTemp: 'number' }
  },

  //===========================================================================
  // SECTION 11: SURFACE INTEGRITY (12 parameters)
  //===========================================================================
  surfaceIntegrity: {
    residualStress: {
      typical: { surface: 'number', subsurface: 'number', unit: 'MPa' },
      depth: { value: 'number', unit: 'μm' },
      type: 'string' // 'compressive', 'tensile', 'variable'
    },
    workHardening: {
      depthAffected: { value: 'number', unit: 'μm' },
      hardnessIncrease: { value: 'number', unit: '%' },
      strainHardeningExponent: { value: 'number' }
    },
    surfaceRoughness: {
      achievable: {
        roughing: { Ra: { min: 'number', max: 'number' } },
        semifinishing: { Ra: { min: 'number', max: 'number' } },
        finishing: { Ra: { min: 'number', max: 'number' } }
      },
      unit: 'μm'
    },
    metallurgicalDamage: {
      whiteLayerRisk: { type: 'string', enum: ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'] },
      burntSurfaceRisk: 'string',
      microcrackRisk: 'string',
      phaseTransformationRisk: 'string'
    },
    burr: {
      tendency: 'string',
      type: 'string', // 'rollover', 'tear', 'poisson'
      mitigation: 'string'
    }
  },

  //===========================================================================
  // SECTION 12: MACHINABILITY INDICES (8 parameters)
  //===========================================================================
  machinability: {
    overallRating: {
      grade: { type: 'string', enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'] },
      percent: { value: 'number', reference: 'AISI B1112 = 100%' }
    },
    turningIndex: { value: 'number' },
    millingIndex: { value: 'number' },
    drillingIndex: { value: 'number' },
    grindingIndex: { value: 'number' },
    factors: {
      toolWear: { type: 'string', enum: ['MINIMUM', 'VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'] },
      surfaceFinish: { type: 'string', enum: ['POOR', 'FAIR', 'GOOD', 'EXCELLENT', 'OUTSTANDING'] },
      chipControl: 'string',
      powerRequirement: 'string',
      cuttingForces: 'string'
    }
  },

  //===========================================================================
  // SECTION 13: RECOMMENDED PARAMETERS (20+ parameters)
  //===========================================================================
  recommendedParameters: {
    turning: {
      roughing: {
        speed: { value: 'number', unit: 'm/min', range: { min: 'number', max: 'number' } },
        feed: { value: 'number', unit: 'mm/rev', range: { min: 'number', max: 'number' } },
        depthOfCut: { value: 'number', unit: 'mm', max: 'number' }
      },
      finishing: {
        speed: { value: 'number', unit: 'm/min' },
        feed: { value: 'number', unit: 'mm/rev' },
        depthOfCut: { value: 'number', unit: 'mm' }
      }
    },
    milling: {
      roughing: { speed: 'number', feedPerTooth: 'number', ae: 'number', ap: 'number' },
      finishing: { speed: 'number', feedPerTooth: 'number', ae: 'number', ap: 'number' }
    },
    drilling: {
      speed: { value: 'number', unit: 'm/min' },
      feed: { value: 'number', unit: 'mm/rev' },
      peckDepth: { value: 'number', unit: 'xD' }
    },
    threading: {
      speed: { value: 'number', unit: 'm/min' },
      infeedMethod: 'string',
      passes: 'number'
    },
    toolGeometry: {
      rakeAngle: { value: 'number', unit: 'degrees', range: { min: 'number', max: 'number' } },
      clearanceAngle: { value: 'number', unit: 'degrees' },
      noseRadius: { value: 'number', unit: 'mm' },
      edgePreparation: 'string' // 'sharp', 'honed', 'chamfered', 'T-land'
    },
    insertGrade: {
      primary: 'string', // ISO grade like P10, P20, M20, etc.
      coating: ['string'],
      substrate: 'string',
      alternatives: ['string']
    },
    coolant: {
      recommended: { type: 'string', enum: ['MANDATORY', 'RECOMMENDED', 'OPTIONAL', 'NOT_RECOMMENDED', 'AVOID'] },
      type: 'string', // 'flood', 'mist', 'MQL', 'cryogenic', 'dry'
      concentration: 'string',
      pressure: { value: 'number', unit: 'bar' }
    },
    techniques: {
      hsmRecommended: 'boolean',
      trochoidalBenefit: 'string',
      adaptiveClearingBenefit: 'string',
      specialNotes: ['string']
    }
  },

  //===========================================================================
  // SECTION 14: STATISTICAL DATA (8 parameters)
  //===========================================================================
  statisticalData: {
    dataPoints: { value: 'number', description: 'Number of data points used' },
    confidenceLevel: { value: 'number', description: 'Statistical confidence (0-1)' },
    standardDeviation: {
      speed: { value: 'number' },
      force: { value: 'number' },
      toolLife: { value: 'number' }
    },
    sources: ['string'],
    lastValidated: 'string', // 'YYYY-QN' format
    reliability: { type: 'string', enum: ['LOW', 'MEDIUM', 'MEDIUM-HIGH', 'HIGH', 'HIGHEST'] },
    crossValidated: 'boolean',
    peerReviewed: 'boolean'
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MATERIAL_SCHEMA;
}
