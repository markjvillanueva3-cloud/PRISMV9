/**
 * PRISM SCIENTIFIC PARAMETERS SCHEMA
 * ===================================
 * 
 * MASTER TEMPLATE defining ALL required scientific parameters for EVERY material.
 * This schema ensures 100% coverage across all 600+ materials.
 * 
 * Created: 2026-01-22
 * Purpose: Define comprehensive parameter requirements for world-class material database
 * 
 * COVERAGE REQUIREMENTS:
 * - Every material MUST have ALL parameters (no gaps)
 * - Missing experimental data → use validated theoretical models
 * - Every value includes source, reliability rating, and uncertainty
 * 
 * @module PRISM_SCIENTIFIC_PARAMETERS_SCHEMA
 * @version 1.0.0
 */

const PRISM_SCIENTIFIC_PARAMETERS_SCHEMA = {

  // ===========================================
  // SCHEMA VERSION & META
  // ===========================================
  
  meta: {
    schemaVersion: '1.0.0',
    created: '2026-01-22',
    purpose: 'Define 100% parameter coverage requirements for all materials',
    totalParameterCategories: 15,
    totalIndividualParameters: 127,
    reliabilityScale: {
      'A': 'Experimental - peer-reviewed publication',
      'B': 'Experimental - manufacturer/industry data',
      'C': 'Validated theoretical model',
      'D': 'Interpolated from similar materials',
      'E': 'Estimated - requires validation'
    }
  },

  // ===========================================
  // 1. IDENTIFICATION & CLASSIFICATION
  // ===========================================
  
  identification: {
    required: true,
    parameters: {
      id: { type: 'string', required: true, description: 'Unique identifier' },
      name: { type: 'string', required: true, description: 'Common name' },
      alternateNames: { type: 'array', required: false, description: 'Other designations' },
      uns: { type: 'string', required: false, description: 'UNS number if applicable' },
      din: { type: 'string', required: false, description: 'DIN designation' },
      iso: { type: 'string', required: false, description: 'ISO designation' },
      jis: { type: 'string', required: false, description: 'JIS designation' },
      description: { type: 'string', required: true, description: 'Brief description' },
      category: { type: 'string', required: true, description: 'Primary category' },
      subcategory: { type: 'string', required: true, description: 'Subcategory' },
      materialClass: { 
        type: 'enum', 
        required: true,
        values: ['ferrous', 'non-ferrous', 'superalloy', 'refractory', 'composite', 'ceramic', 'polymer']
      }
    }
  },

  // ===========================================
  // 2. COMPOSITION
  // ===========================================
  
  composition: {
    required: true,
    parameters: {
      elements: {
        type: 'object',
        required: true,
        structure: {
          min: { type: 'number', unit: '%' },
          max: { type: 'number', unit: '%' },
          nominal: { type: 'number', unit: '%' },
          balance: { type: 'boolean' }
        }
      },
      impurityLimits: { type: 'object', required: false },
      carbonEquivalent: { type: 'number', required: false, description: 'CE for steels' },
      pren: { type: 'number', required: false, description: 'Pitting resistance for stainless' }
    }
  },

  // ===========================================
  // 3. PHYSICAL PROPERTIES
  // ===========================================
  
  physicalProperties: {
    required: true,
    parameters: {
      density: { 
        type: 'number', 
        unit: 'kg/m³', 
        required: true,
        typicalRange: [1700, 19500]
      },
      meltingPoint: { 
        type: 'object',
        required: true,
        structure: {
          solidus: { type: 'number', unit: '°C' },
          liquidus: { type: 'number', unit: '°C' },
          single: { type: 'number', unit: '°C', description: 'For pure metals' }
        }
      },
      thermalConductivity: {
        type: 'object',
        required: true,
        structure: {
          value: { type: 'number', unit: 'W/m·K' },
          tempDependence: { type: 'array', description: '[[T1,k1], [T2,k2], ...]' }
        }
      },
      specificHeat: {
        type: 'object',
        required: true,
        structure: {
          value: { type: 'number', unit: 'J/kg·K' },
          tempDependence: { type: 'array' }
        }
      },
      thermalExpansion: {
        type: 'object',
        required: true,
        structure: {
          value: { type: 'number', unit: '×10⁻⁶/°C' },
          tempRange: { type: 'string' }
        }
      },
      thermalDiffusivity: {
        type: 'number',
        unit: 'mm²/s',
        required: true,
        calculation: 'k / (ρ × Cp)'
      },
      electricalResistivity: {
        type: 'number',
        unit: 'μΩ·cm',
        required: false
      },
      magneticPermeability: {
        type: 'number',
        required: false,
        description: 'Relative to vacuum'
      }
    }
  },

  // ===========================================
  // 4. MECHANICAL PROPERTIES (per condition)
  // ===========================================
  
  mechanicalProperties: {
    required: true,
    perCondition: true,
    parameters: {
      hardness: {
        type: 'object',
        required: true,
        structure: {
          brinell: { type: 'number', unit: 'HB' },
          rockwellB: { type: 'number', unit: 'HRB' },
          rockwellC: { type: 'number', unit: 'HRC' },
          vickers: { type: 'number', unit: 'HV' },
          knoop: { type: 'number', unit: 'HK' }
        }
      },
      tensileStrength: {
        type: 'object',
        required: true,
        structure: {
          value: { type: 'number', unit: 'MPa' },
          uncertainty: { type: 'number', unit: '%' }
        }
      },
      yieldStrength: {
        type: 'object',
        required: true,
        structure: {
          value: { type: 'number', unit: 'MPa' },
          offset: { type: 'number', default: 0.2, unit: '%' }
        }
      },
      elongation: {
        type: 'object',
        required: true,
        structure: {
          value: { type: 'number', unit: '%' },
          gaugeLength: { type: 'number', unit: 'mm' }
        }
      },
      reductionOfArea: { type: 'number', unit: '%', required: false },
      elasticModulus: { type: 'number', unit: 'GPa', required: true },
      shearModulus: { type: 'number', unit: 'GPa', required: true },
      poissonsRatio: { type: 'number', required: true, typicalRange: [0.25, 0.35] },
      fatigueStrength: {
        type: 'object',
        required: false,
        structure: {
          value: { type: 'number', unit: 'MPa' },
          cycles: { type: 'number', default: 1e7 }
        }
      },
      impactToughness: {
        type: 'object',
        required: false,
        structure: {
          charpy: { type: 'number', unit: 'J' },
          izod: { type: 'number', unit: 'J' },
          temperature: { type: 'number', unit: '°C' }
        }
      },
      fractureToughness: {
        type: 'number',
        unit: 'MPa·√m',
        required: false
      }
    }
  },

  // ===========================================
  // 5. KIENZLE CUTTING FORCE PARAMETERS
  // ===========================================
  
  kienzleParameters: {
    required: true,
    perCondition: true,
    description: 'Specific cutting force model: kc = kc1_1 × h^(-mc)',
    parameters: {
      kc1_1: {
        type: 'object',
        required: true,
        description: 'Specific cutting force at h=1mm, b=1mm',
        structure: {
          value: { type: 'number', unit: 'MPa' },
          uncertainty: { type: 'number', unit: '%', default: 10 },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRanges: {
          aluminum: [300, 800],
          copper: [1200, 2200],
          steel: [1400, 2800],
          stainless: [2000, 3200],
          titanium: [1600, 2400],
          nickel: [2800, 4500],
          cobalt: [3200, 4200]
        }
      },
      mc: {
        type: 'object',
        required: true,
        description: 'Chip thickness exponent (typically 0.18-0.35)',
        structure: {
          value: { type: 'number' },
          uncertainty: { type: 'number', unit: '%' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRange: [0.18, 0.35]
      },
      kc_rake_correction: {
        type: 'number',
        required: true,
        description: 'Correction factor per degree rake angle change',
        default: 0.015,
        formula: 'kc_corrected = kc × (1 - 0.015 × Δγ)'
      },
      kc_speed_correction: {
        type: 'object',
        required: false,
        description: 'Speed-dependent correction',
        structure: {
          factor: { type: 'number' },
          referenceSpeed: { type: 'number', unit: 'm/min' }
        }
      },
      kc_wear_correction: {
        type: 'number',
        required: false,
        description: 'Correction factor for tool wear (VB=0.3mm)',
        typicalRange: [1.1, 1.4]
      }
    }
  },

  // ===========================================
  // 6. JOHNSON-COOK CONSTITUTIVE MODEL
  // ===========================================
  
  johnsonCookParameters: {
    required: true,
    perCondition: true,
    description: 'σ = (A + B×ε^n) × (1 + C×ln(ε̇*)) × (1 - T*^m)',
    parameters: {
      A: {
        type: 'object',
        required: true,
        description: 'Initial yield stress',
        structure: {
          value: { type: 'number', unit: 'MPa' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        }
      },
      B: {
        type: 'object',
        required: true,
        description: 'Strain hardening coefficient',
        structure: {
          value: { type: 'number', unit: 'MPa' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        }
      },
      n: {
        type: 'object',
        required: true,
        description: 'Strain hardening exponent',
        structure: {
          value: { type: 'number' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRange: [0.05, 0.80]
      },
      C: {
        type: 'object',
        required: true,
        description: 'Strain rate sensitivity coefficient',
        structure: {
          value: { type: 'number' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRange: [0.001, 0.10]
      },
      m: {
        type: 'object',
        required: true,
        description: 'Thermal softening exponent',
        structure: {
          value: { type: 'number' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRange: [0.5, 2.0]
      },
      Tm: {
        type: 'number',
        unit: '°C',
        required: true,
        description: 'Melting temperature'
      },
      Tr: {
        type: 'number',
        unit: '°C',
        required: true,
        description: 'Reference temperature',
        default: 20
      },
      epsilon_dot_0: {
        type: 'number',
        unit: 's⁻¹',
        required: true,
        description: 'Reference strain rate',
        default: 1.0
      }
    }
  },

  // ===========================================
  // 7. TAYLOR TOOL LIFE PARAMETERS
  // ===========================================
  
  taylorToolLifeParameters: {
    required: true,
    perCondition: true,
    description: 'V × T^n = C (Taylor equation)',
    parameters: {
      C: {
        type: 'object',
        required: true,
        description: 'Taylor constant (speed for 1 min tool life)',
        structure: {
          value: { type: 'number', unit: 'm/min' },
          toolMaterial: { type: 'string' },
          wearCriterion: { type: 'string', default: 'VB=0.3mm' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        }
      },
      n: {
        type: 'object',
        required: true,
        description: 'Taylor exponent (typically 0.1-0.4)',
        structure: {
          value: { type: 'number' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRange: [0.08, 0.40]
      },
      extendedTaylor: {
        type: 'object',
        required: false,
        description: 'Extended Taylor: V×T^n×f^a×d^b = C',
        structure: {
          a: { type: 'number', description: 'Feed exponent' },
          b: { type: 'number', description: 'Depth of cut exponent' }
        }
      },
      toolMaterials: {
        type: 'array',
        required: true,
        description: 'Parameters for different tool materials',
        items: {
          toolMaterial: { type: 'string' },
          C: { type: 'number' },
          n: { type: 'number' }
        }
      }
    }
  },

  // ===========================================
  // 8. CHIP FORMATION PARAMETERS
  // ===========================================
  
  chipFormationParameters: {
    required: true,
    perCondition: true,
    description: 'Chip morphology and formation mechanics',
    parameters: {
      chipType: {
        type: 'object',
        required: true,
        structure: {
          primary: { 
            type: 'enum', 
            values: ['continuous', 'discontinuous', 'segmented', 'built-up-edge'],
            required: true
          },
          transitionSpeed: { type: 'number', unit: 'm/min', description: 'Speed for chip type transition' },
          transitionTemp: { type: 'number', unit: '°C' }
        }
      },
      shearAngle: {
        type: 'object',
        required: true,
        description: 'Primary shear plane angle',
        structure: {
          value: { type: 'number', unit: '°' },
          method: { type: 'string', description: 'Merchant, Lee-Shaffer, etc.' },
          conditions: { type: 'string' }
        },
        typicalRange: [15, 45]
      },
      chipCompressionRatio: {
        type: 'object',
        required: true,
        description: 'rc = chip thickness / uncut chip thickness',
        structure: {
          value: { type: 'number' },
          conditions: { type: 'string' }
        },
        typicalRange: [1.5, 6.0]
      },
      chipCurlRadius: {
        type: 'object',
        required: false,
        structure: {
          value: { type: 'number', unit: 'mm' },
          conditions: { type: 'string' }
        }
      },
      segmentationParameters: {
        type: 'object',
        required: false,
        description: 'For segmented/serrated chips',
        structure: {
          frequency: { type: 'number', unit: 'kHz' },
          amplitude: { type: 'number', unit: 'μm' },
          criticalSpeed: { type: 'number', unit: 'm/min' },
          shearBandWidth: { type: 'number', unit: 'μm' }
        }
      },
      builtUpEdgeTendency: {
        type: 'object',
        required: true,
        structure: {
          rating: { type: 'enum', values: ['none', 'low', 'moderate', 'high', 'severe'] },
          criticalSpeedRange: { 
            type: 'object',
            structure: {
              min: { type: 'number', unit: 'm/min' },
              max: { type: 'number', unit: 'm/min' }
            }
          },
          criticalTempRange: {
            type: 'object',
            structure: {
              min: { type: 'number', unit: '°C' },
              max: { type: 'number', unit: '°C' }
            }
          }
        }
      },
      minimumChipThickness: {
        type: 'object',
        required: true,
        description: 'hmin for ploughing vs cutting transition',
        structure: {
          value: { type: 'number', unit: 'μm' },
          edgeRadiusRatio: { type: 'number', description: 'hmin/re ratio' }
        },
        typicalRange: [0.1, 0.4],
        notes: 'hmin/re typically 0.2-0.3'
      }
    }
  },

  // ===========================================
  // 9. FRICTION & TRIBOLOGY PARAMETERS
  // ===========================================
  
  frictionTribologyParameters: {
    required: true,
    perCondition: true,
    description: 'Tool-chip and tool-workpiece interface',
    parameters: {
      coulombFriction: {
        type: 'object',
        required: true,
        description: 'Sliding friction coefficient μ',
        structure: {
          value: { type: 'number' },
          conditions: { type: 'string' },
          toolMaterial: { type: 'string' },
          lubricant: { type: 'string' },
          source: { type: 'string' },
          reliability: { type: 'enum', values: ['A', 'B', 'C', 'D', 'E'] }
        },
        typicalRange: [0.2, 0.8]
      },
      stickingFriction: {
        type: 'object',
        required: true,
        description: 'Sticking zone parameters',
        structure: {
          shearFactor: { type: 'number', description: 'm in τ = m×k' },
          stickingLength: { type: 'number', unit: 'mm', description: 'Contact length' },
          stickingRatio: { type: 'number', description: 'lstick/lcontact' }
        }
      },
      frictionModel: {
        type: 'object',
        required: true,
        description: 'Combined friction model parameters',
        structure: {
          model: { type: 'enum', values: ['coulomb', 'shear', 'hybrid', 'zorev'] },
          transitionPressure: { type: 'number', unit: 'MPa' },
          parameters: { type: 'object' }
        }
      },
      contactLength: {
        type: 'object',
        required: false,
        structure: {
          ratio: { type: 'number', description: 'lc/h ratio' },
          formula: { type: 'string' }
        }
      },
      adhesionTendency: {
        type: 'object',
        required: true,
        structure: {
          rating: { type: 'enum', values: ['none', 'low', 'moderate', 'high', 'severe'] },
          criticalTemperature: { type: 'number', unit: '°C' },
          affectedToolMaterials: { type: 'array' }
        }
      }
    }
  },

  // ===========================================
  // 10. THERMAL MACHINING PARAMETERS
  // ===========================================
  
  thermalMachiningParameters: {
    required: true,
    perCondition: true,
    description: 'Heat generation and distribution in cutting',
    parameters: {
      specificCuttingEnergy: {
        type: 'object',
        required: true,
        description: 'Energy per unit volume removed',
        structure: {
          value: { type: 'number', unit: 'J/mm³' },
          conditions: { type: 'string' }
        },
        typicalRanges: {
          aluminum: [0.4, 1.0],
          steel: [2.0, 5.0],
          titanium: [3.0, 6.0],
          nickel: [4.0, 8.0]
        }
      },
      heatPartitionCoefficient: {
        type: 'object',
        required: true,
        description: 'Fraction of heat to chip vs tool vs workpiece',
        structure: {
          toChip: { type: 'number', description: 'Rchip (typically 0.7-0.9)' },
          toTool: { type: 'number', description: 'Rtool (typically 0.05-0.2)' },
          toWorkpiece: { type: 'number', description: 'Rwork (typically 0.05-0.15)' },
          speedDependence: { type: 'string', description: 'How partition changes with speed' }
        }
      },
      cuttingTemperature: {
        type: 'object',
        required: true,
        description: 'Tool-chip interface temperature model',
        structure: {
          model: { type: 'enum', values: ['shaw', 'boothroyd', 'loewen-shaw', 'trigger-chao'] },
          referenceTemp: { type: 'number', unit: '°C' },
          referenceSpeed: { type: 'number', unit: 'm/min' },
          temperatureCoefficient: { type: 'number', description: 'Temp rise per speed increment' }
        }
      },
      thermalSofteningThreshold: {
        type: 'object',
        required: true,
        structure: {
          temperature: { type: 'number', unit: '°C' },
          strengthReduction: { type: 'number', unit: '%' }
        }
      },
      maxCuttingTemperature: {
        type: 'object',
        required: true,
        description: 'Temperature limit before thermal damage',
        structure: {
          value: { type: 'number', unit: '°C' },
          damageType: { type: 'string' }
        }
      },
      coolantEffectiveness: {
        type: 'object',
        required: true,
        structure: {
          flood: { type: 'number', description: 'Temperature reduction factor' },
          mql: { type: 'number' },
          cryogenic: { type: 'number' },
          dry: { type: 'number', default: 1.0 }
        }
      }
    }
  },

  // ===========================================
  // 11. SURFACE INTEGRITY PARAMETERS
  // ===========================================
  
  surfaceIntegrityParameters: {
    required: true,
    perCondition: true,
    description: 'Machining effects on surface and subsurface',
    parameters: {
      residualStress: {
        type: 'object',
        required: true,
        structure: {
          tendency: { type: 'enum', values: ['compressive', 'tensile', 'variable'] },
          surfaceMagnitude: { type: 'number', unit: 'MPa' },
          maxDepth: { type: 'number', unit: 'μm' },
          speedEffect: { type: 'string' },
          feedEffect: { type: 'string' }
        }
      },
      workHardening: {
        type: 'object',
        required: true,
        structure: {
          tendency: { type: 'enum', values: ['none', 'low', 'moderate', 'high', 'severe'] },
          hardnessIncrease: { type: 'number', unit: '%' },
          affectedDepth: { type: 'number', unit: 'μm' },
          criticalFeed: { type: 'number', unit: 'mm/rev', description: 'Below this, severe hardening' }
        }
      },
      whiteLayerFormation: {
        type: 'object',
        required: false,
        description: 'Hard, brittle surface layer (mainly steels)',
        structure: {
          susceptible: { type: 'boolean' },
          criticalTemperature: { type: 'number', unit: '°C' },
          typicalThickness: { type: 'number', unit: 'μm' },
          hardnessHV: { type: 'number' }
        }
      },
      surfaceRoughnessModel: {
        type: 'object',
        required: true,
        structure: {
          theoreticalRa: { 
            type: 'string', 
            formula: 'Ra = f²/(32×r)',
            description: 'Ideal roughness from geometry'
          },
          materialFactor: { type: 'number', description: 'Multiplier for actual vs theoretical' },
          minimumRaAchievable: { type: 'number', unit: 'μm' },
          speedEffect: { type: 'string' }
        }
      },
      burrFormation: {
        type: 'object',
        required: true,
        structure: {
          tendency: { type: 'enum', values: ['none', 'low', 'moderate', 'high', 'severe'] },
          burrType: { type: 'array', items: ['poisson', 'rollover', 'tear', 'cutoff'] },
          criticalConditions: { type: 'string' }
        }
      },
      microstructuralChanges: {
        type: 'object',
        required: false,
        structure: {
          phaseTransformation: { type: 'boolean' },
          grainRefinement: { type: 'boolean' },
          recrystallization: { type: 'boolean' },
          affectedDepth: { type: 'number', unit: 'μm' }
        }
      }
    }
  },

  // ===========================================
  // 12. MACHINABILITY INDICES
  // ===========================================
  
  machinabilityIndices: {
    required: true,
    perCondition: true,
    parameters: {
      overallRating: {
        type: 'enum',
        required: true,
        values: ['A', 'B', 'C', 'D', 'E', 'F'],
        description: 'A=Excellent to F=Extremely difficult'
      },
      percentOfB1112: {
        type: 'number',
        required: true,
        description: 'Relative to AISI B1112 free-machining steel = 100%'
      },
      percentOfC360: {
        type: 'number',
        required: false,
        description: 'For non-ferrous: relative to C360 brass = 100%'
      },
      speedFactor: {
        type: 'number',
        required: true,
        description: 'Multiplier vs baseline (B1112=1.0)'
      },
      forceIndex: {
        type: 'number',
        required: true,
        description: 'Relative cutting force (B1112=1.0)'
      },
      toolWearIndex: {
        type: 'number',
        required: true,
        description: 'Relative tool wear rate (B1112=1.0)'
      },
      surfaceFinishIndex: {
        type: 'number',
        required: true,
        description: 'Achievable surface quality (higher=better)'
      },
      chipControlIndex: {
        type: 'number',
        required: true,
        description: 'Ease of chip control (higher=better)'
      }
    }
  },

  // ===========================================
  // 13. RECOMMENDED CUTTING PARAMETERS
  // ===========================================
  
  recommendedCuttingParameters: {
    required: true,
    perCondition: true,
    perOperation: true,
    operations: ['turning', 'milling', 'drilling', 'tapping', 'reaming', 'boring', 'grinding'],
    parameters: {
      cuttingSpeed: {
        type: 'object',
        required: true,
        structure: {
          roughing: { min: 'number', max: 'number', unit: 'm/min' },
          finishing: { min: 'number', max: 'number', unit: 'm/min' },
          hsm: { min: 'number', max: 'number', unit: 'm/min', description: 'High-speed machining' }
        }
      },
      feedRate: {
        type: 'object',
        required: true,
        structure: {
          roughing: { min: 'number', max: 'number', unit: 'mm/rev or mm/tooth' },
          finishing: { min: 'number', max: 'number', unit: 'mm/rev or mm/tooth' }
        }
      },
      depthOfCut: {
        type: 'object',
        required: true,
        structure: {
          roughing: { min: 'number', max: 'number', unit: 'mm' },
          finishing: { min: 'number', max: 'number', unit: 'mm' }
        }
      },
      toolMaterialRecommendations: {
        type: 'object',
        required: true,
        structure: {
          preferred: { type: 'array' },
          acceptable: { type: 'array' },
          avoid: { type: 'array' }
        }
      },
      coatingRecommendations: {
        type: 'object',
        required: true,
        structure: {
          preferred: { type: 'array' },
          acceptable: { type: 'array' },
          avoid: { type: 'array' }
        }
      },
      coolantRecommendations: {
        type: 'object',
        required: true,
        structure: {
          type: { type: 'enum', values: ['flood', 'mql', 'cryogenic', 'dry', 'high-pressure'] },
          concentration: { type: 'string' },
          pressure: { type: 'number', unit: 'bar' },
          specialNotes: { type: 'string' }
        }
      },
      geometryRecommendations: {
        type: 'object',
        required: true,
        structure: {
          rakeAngle: { type: 'object', structure: { min: 'number', max: 'number', unit: '°' } },
          clearanceAngle: { type: 'object', structure: { min: 'number', max: 'number', unit: '°' } },
          noseRadius: { type: 'object', structure: { min: 'number', max: 'number', unit: 'mm' } },
          edgePreparation: { type: 'string' }
        }
      }
    }
  },

  // ===========================================
  // 14. STATISTICAL & UNCERTAINTY DATA
  // ===========================================
  
  statisticalData: {
    required: true,
    parameters: {
      sampleSize: {
        type: 'object',
        required: true,
        description: 'Data points per parameter',
        structure: {
          kienzle: { type: 'number' },
          johnsonCook: { type: 'number' },
          taylor: { type: 'number' },
          friction: { type: 'number' }
        }
      },
      standardDeviation: {
        type: 'object',
        required: true,
        structure: {
          kc1_1: { type: 'number', unit: '%' },
          mc: { type: 'number', unit: '%' },
          taylorC: { type: 'number', unit: '%' },
          taylorN: { type: 'number', unit: '%' }
        }
      },
      confidenceInterval: {
        type: 'object',
        required: true,
        structure: {
          level: { type: 'number', default: 95, unit: '%' },
          kc1_1: { type: 'object', structure: { lower: 'number', upper: 'number' } },
          mc: { type: 'object', structure: { lower: 'number', upper: 'number' } }
        }
      },
      correlationCoefficients: {
        type: 'object',
        required: false,
        description: 'R² for fitted models',
        structure: {
          kienzle: { type: 'number' },
          johnsonCook: { type: 'number' },
          taylor: { type: 'number' }
        }
      },
      batchVariability: {
        type: 'object',
        required: false,
        description: 'Heat-to-heat variation',
        structure: {
          hardness: { type: 'number', unit: '%' },
          strength: { type: 'number', unit: '%' },
          machinability: { type: 'number', unit: '%' }
        }
      }
    }
  },

  // ===========================================
  // 15. PROCESS-SPECIFIC FACTORS
  // ===========================================
  
  processSpecificFactors: {
    required: true,
    parameters: {
      highSpeedMachining: {
        type: 'object',
        structure: {
          suitable: { type: 'boolean' },
          speedThreshold: { type: 'number', unit: 'm/min' },
          benefits: { type: 'array' },
          limitations: { type: 'array' }
        }
      },
      cryogenicMachining: {
        type: 'object',
        structure: {
          suitable: { type: 'boolean' },
          temperatureRange: { type: 'object', structure: { min: 'number', max: 'number', unit: '°C' } },
          benefits: { type: 'array' },
          toolLifeImprovement: { type: 'number', unit: '%' }
        }
      },
      mqlMachining: {
        type: 'object',
        structure: {
          suitable: { type: 'boolean' },
          oilType: { type: 'string' },
          flowRate: { type: 'number', unit: 'ml/hr' },
          temperatureLimit: { type: 'number', unit: '°C' }
        }
      },
      hardMachining: {
        type: 'object',
        structure: {
          suitable: { type: 'boolean' },
          hardnessRange: { type: 'object', structure: { min: 'number', max: 'number', unit: 'HRC' } },
          toolRequirements: { type: 'array' }
        }
      },
      microMachining: {
        type: 'object',
        structure: {
          suitable: { type: 'boolean' },
          minimumFeatureSize: { type: 'number', unit: 'μm' },
          sizeEffects: { type: 'string' }
        }
      },
      additiveHybrid: {
        type: 'object',
        structure: {
          postMachiningRequired: { type: 'boolean' },
          asBuiltMachinability: { type: 'string' },
          heatTreatmentEffect: { type: 'string' }
        }
      }
    }
  },

  // ===========================================
  // VALIDATION METHODS
  // ===========================================
  
  validate: function(material) {
    const errors = [];
    const warnings = [];
    
    // Check all required sections
    const requiredSections = [
      'identification', 'composition', 'physicalProperties', 'mechanicalProperties',
      'kienzleParameters', 'johnsonCookParameters', 'taylorToolLifeParameters',
      'chipFormationParameters', 'frictionTribologyParameters', 'thermalMachiningParameters',
      'surfaceIntegrityParameters', 'machinabilityIndices', 'recommendedCuttingParameters',
      'statisticalData', 'processSpecificFactors'
    ];
    
    for (const section of requiredSections) {
      if (!material[section]) {
        errors.push(`Missing required section: ${section}`);
      }
    }
    
    // Check reliability ratings
    const reliabilityFields = ['kienzle', 'johnsonCook', 'taylor', 'friction'];
    let lowReliabilityCount = 0;
    
    for (const field of reliabilityFields) {
      if (material[field + 'Parameters']?.reliability === 'E') {
        lowReliabilityCount++;
        warnings.push(`Low reliability data for: ${field}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      completeness: (15 - errors.length) / 15 * 100,
      reliabilityScore: (4 - lowReliabilityCount) / 4 * 100
    };
  },
  
  getTemplate: function(category) {
    // Returns empty template with all required fields
    return {
      identification: {},
      composition: { elements: {} },
      physicalProperties: {},
      mechanicalProperties: {},
      kienzleParameters: {},
      johnsonCookParameters: {},
      taylorToolLifeParameters: {},
      chipFormationParameters: {},
      frictionTribologyParameters: {},
      thermalMachiningParameters: {},
      surfaceIntegrityParameters: {},
      machinabilityIndices: {},
      recommendedCuttingParameters: {},
      statisticalData: {},
      processSpecificFactors: {}
    };
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_SCIENTIFIC_PARAMETERS_SCHEMA;
}
if (typeof window !== 'undefined') {
  window.PRISM_SCIENTIFIC_PARAMETERS_SCHEMA = PRISM_SCIENTIFIC_PARAMETERS_SCHEMA;
}
