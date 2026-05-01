/**
 * PRISM COPPER ALLOYS SCIENTIFIC DATABASE
 * ========================================
 * 
 * Comprehensive copper alloy data with validated scientific parameters
 * for machining calculations. Copper alloys range from excellent to 
 * difficult machinability depending on composition.
 * 
 * Session: 1.A.1-SCI-08
 * Created: 2026-01-22
 * 
 * DATA SOURCES:
 * - Machining Data Handbook (3rd Edition, Metcut Research Associates)
 * - ASM Metals Handbook Vol. 2: Properties and Selection - Nonferrous Alloys
 * - ASM Specialty Handbook: Copper and Copper Alloys
 * - Copper Development Association (CDA) Machining Guides
 * - Johnson-Cook parameters: Gao & Wagoner (1987), Follansbee (1986)
 * - Kienzle parameters: König & Klocke (1997)
 * 
 * UNS NUMBERING SYSTEM FOR COPPER ALLOYS:
 * =======================================
 * C1xxxx - Pure Copper (99%+ Cu)
 * C2xxxx - Copper-Zinc (Brasses)
 * C3xxxx - Copper-Zinc-Lead (Leaded Brasses)
 * C4xxxx - Copper-Zinc-Tin (Tin Brasses, Naval Brass)
 * C5xxxx - Copper-Tin (Phosphor Bronzes)
 * C6xxxx - Copper-Aluminum, Copper-Silicon (Al & Si Bronzes)
 * C7xxxx - Copper-Nickel, Nickel Silver
 * 
 * MACHINABILITY RATING BASELINE:
 * Free-Cutting Brass C360 = 100% (reference standard for copper alloys)
 * Note: This is DIFFERENT from B1112 steel baseline used in ferrous metals
 * 
 * @module PRISM_COPPER_ALLOYS_SCIENTIFIC
 * @version 1.0.0
 */

const PRISM_COPPER_ALLOYS_SCIENTIFIC = {
  
  version: '1.0.0',
  category: 'copper_alloys',
  lastUpdated: '2026-01-22',
  
  /**
   * MACHINING FUNDAMENTALS FOR COPPER ALLOYS
   */
  machiningFundamentals: {
    
    machinabilityFactors: {
      description: 'Copper alloy machinability varies widely based on composition',
      leadEffect: {
        benefit: 'Lead (Pb) dramatically improves machinability - acts as chip breaker and lubricant',
        bestAlloys: ['C360 (3% Pb)', 'C353 (1.8% Pb)', 'C385 (2.5% Pb)'],
        modern_alternatives: 'Bismuth (Bi) or Selenium (Se) for lead-free requirements',
        leadFreeNote: 'RoHS and drinking water applications require lead-free alternatives'
      },
      sulfurEffect: {
        benefit: 'Sulfur additions improve chip breaking in tellurium copper',
        example: 'C145 (Tellurium Copper) - 90% of C360 machinability'
      },
      zincEffect: {
        highZinc: 'Higher Zn content generally improves machinability (vs pure Cu)',
        limit: 'Above 40% Zn creates beta phase - reduces ductility'
      },
      tinEffect: {
        note: 'Tin additions (phosphor bronzes) reduce machinability',
        hardParticles: 'Cu-Sn intermetallics are abrasive'
      },
      aluminumEffect: {
        note: 'Aluminum bronze is most difficult copper alloy family',
        reason: 'Al2O3 inclusions are extremely abrasive',
        strategy: 'Use ceramic or CBN tooling for high-Al grades'
      }
    },
    
    chipFormation: {
      pureCopperProblem: 'Pure copper forms long, stringy chips due to high ductility',
      solutions: [
        'Add lead or bismuth for chip breaking',
        'Use positive rake angles',
        'Increase feed rate to force chip breakage',
        'Use chip breaker geometry'
      ],
      chipTypes: {
        freeCuttingBrass: 'Type 1 - Discontinuous, easy to handle',
        standardBrass: 'Type 2 - Short spiral, manageable', 
        pureCopper: 'Type 3 - Long continuous spiral, problematic',
        phosphorBronze: 'Type 2-3 - Depends on Sn content'
      }
    },
    
    toolSelection: {
      generalRecommendation: 'HSS tools work well for most copper alloys',
      carbide: {
        grade: 'C2 (K10-K20) uncoated or TiN coated',
        use: 'Higher speeds, production runs'
      },
      hss: {
        grade: 'M2, M7 high-speed steel',
        use: 'General purpose, especially for softer alloys'
      },
      pcd: {
        use: 'Aluminum bronze only - abrasive Al2O3 requires diamond',
        avoid: 'Not needed for other copper alloys'
      },
      geometry: {
        rakeAngle: { value: '10-20°', note: 'Higher positive rake than steel' },
        reliefAngle: { value: '10-15°' },
        note: 'Sharp edges essential - copper alloys gum up dull tools'
      }
    },
    
    coolantStrategy: {
      freeCuttingBrass: 'Often machined dry - lead provides lubrication',
      standardBrass: 'Light cutting oil or soluble oil',
      pureCopper: 'Heavy-duty soluble oil recommended',
      bronzes: 'Sulfurized cutting oils work well',
      aluminumBronze: 'Heavy-duty EP oils essential',
      berylliumCopper: 'Flood coolant REQUIRED for dust suppression (health hazard)'
    },
    
    speedGuidelines: {
      note: 'Copper alloys typically machine at 2-5x steel speeds',
      freeCuttingBrass: { carbide: '150-300 m/min', hss: '60-90 m/min' },
      standardBrass: { carbide: '120-250 m/min', hss: '45-75 m/min' },
      pureCopper: { carbide: '100-200 m/min', hss: '30-60 m/min' },
      phosphorBronze: { carbide: '60-150 m/min', hss: '25-45 m/min' },
      aluminumBronze: { carbide: '30-90 m/min', hss: '15-30 m/min' },
      berylliumCopper: { carbide: '45-120 m/min', hss: '20-40 m/min' }
    }
  },
  
  /**
   * COPPER ALLOY CLASSIFICATION
   */
  classification: {
    'pure_copper': {
      uns_range: 'C10100-C15999',
      description: 'Unalloyed copper with 99%+ purity',
      characteristics: 'Highest conductivity, poor machinability, very ductile',
      machinability: '20-30% of C360',
      examples: ['C101', 'C102', 'C110', 'C122']
    },
    'brass': {
      uns_range: 'C20500-C28580',
      description: 'Copper-zinc alloys without intentional lead',
      characteristics: 'Good strength, moderate machinability, yellow color',
      machinability: '30-50% of C360',
      examples: ['C260', 'C270', 'C280']
    },
    'leaded_brass': {
      uns_range: 'C31200-C38590',
      description: 'Copper-zinc-lead alloys for excellent machinability',
      characteristics: 'Free-cutting, excellent chip control, yellow color',
      machinability: '80-100% of C360',
      examples: ['C360', 'C353', '385']
    },
    'tin_brass': {
      uns_range: 'C40400-C49080',
      description: 'Copper-zinc-tin alloys (naval brass, etc.)',
      characteristics: 'Corrosion resistant, moderate machinability',
      machinability: '30-50% of C360',
      examples: ['C443', 'C464']
    },
    'phosphor_bronze': {
      uns_range: 'C50100-C54400',
      description: 'Copper-tin alloys with phosphorus',
      characteristics: 'High strength, wear resistant, good springs',
      machinability: '20-35% of C360',
      examples: ['C510', '521', 'C544']
    },
    'aluminum_bronze': {
      uns_range: 'C60600-C64400',
      description: 'Copper-aluminum alloys',
      characteristics: 'Very high strength, corrosion resistant, DIFFICULT to machine',
      machinability: '20-40% of C360',
      examples: ['C614', 'C630', 'C954']
    },
    'silicon_bronze': {
      uns_range: 'C64700-C66100',
      description: 'Copper-silicon alloys',
      characteristics: 'Good strength, weldable, moderate machinability',
      machinability: '30-40% of C360',
      examples: ['C651', 'C655']
    },
    'copper_nickel': {
      uns_range: 'C70100-C72950',
      description: 'Copper-nickel alloys (cupronickels)',
      characteristics: 'Excellent seawater resistance, challenging machining',
      machinability: '20-30% of C360',
      examples: ['C706', 'C715']
    },
    'nickel_silver': {
      uns_range: 'C73150-C79900',
      description: 'Copper-nickel-zinc alloys (no silver content)',
      characteristics: 'Attractive silver color, good corrosion resistance',
      machinability: '25-35% of C360',
      examples: ['C745', 'C752', 'C770']
    },
    'beryllium_copper': {
      uns_range: 'C17000-C17530',
      description: 'Copper-beryllium alloys (age-hardenable)',
      characteristics: 'HIGHEST strength copper alloy, non-sparking, TOXIC dust',
      machinability: '20-50% of C360 (condition dependent)',
      examples: ['C172', 'C175'],
      safetyWarning: 'BERYLLIUM IS TOXIC - requires dust extraction and PPE'
    }
  },
  
  /**
   * MATERIAL DATABASE
   */
  materials: {
    
    // ============================================
    // PURE COPPER (C1xxxx Series)
    // ============================================
    
    'C101': {
      name: 'C101 Oxygen-Free Electronic (OFE)',
      uns: 'C10100',
      description: 'Highest purity copper (99.99%+), oxygen-free',
      category: 'copper_alloys',
      subcategory: 'pure_copper',
      
      composition: {
        Cu: { min: 99.99, unit: '%' },
        O: { max: 0.0005, unit: '%', note: 'Oxygen-free' }
      },
      
      conditions: {
        'Annealed': {
          temper: 'O60',
          hardness: { rockwellF: 40, brinell: 45 },
          tensileStrength: { value: 220, unit: 'MPa' },
          yieldStrength: { value: 69, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1350, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'medium',
            note: 'Very gummy - long stringy chips'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 20,
            percentOfB1112: 40,
            description: 'Very difficult - extreme ductility causes chip problems',
            speedFactor: 0.20
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 120, unit: 'm/min' }, finish: { value: 180, unit: 'm/min' } },
            hss: { rough: { value: 35, unit: 'm/min' }, finish: { value: 50, unit: 'm/min' } }
          }
        },
        
        'Half-Hard': {
          temper: 'H02',
          hardness: { rockwellF: 60, brinell: 60 },
          tensileStrength: { value: 260, unit: 'MPa' },
          yieldStrength: { value: 220, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1450, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 25,
            speedFactor: 0.25
          }
        }
      },
      
      physical: {
        density: { value: 8940, unit: 'kg/m³' },
        meltingPoint: { value: 1083, unit: '°C' },
        thermalConductivity: { value: 391, unit: 'W/m·K', note: 'Highest of all copper alloys' },
        electricalConductivity: { value: 101, unit: '%IACS' },
        specificHeat: { value: 385, unit: 'J/kg·K' },
        thermalExpansion: { value: 17.0, unit: 'µm/m·°C' },
        elasticModulus: { value: 117, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 90, unit: 'MPa' },
        B: { value: 292, unit: 'MPa' },
        n: { value: 0.31 },
        C: { value: 0.025 },
        m: { value: 1.09 },
        meltingTemp: { value: 1083, unit: '°C' },
        reliability: 'good',
        source: 'Follansbee (1986)'
      },
      
      applications: ['Electronics', 'Waveguides', 'Superconductor stabilizers', 'Vacuum equipment']
    },
    
    'C110': {
      name: 'C110 Electrolytic Tough Pitch (ETP)',
      uns: 'C11000',
      description: 'Most common copper (99.9%), contains oxygen',
      category: 'copper_alloys',
      subcategory: 'pure_copper',
      
      composition: {
        Cu: { min: 99.90, unit: '%' },
        O: { max: 0.04, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          temper: 'O60',
          hardness: { rockwellF: 40, brinell: 45 },
          tensileStrength: { value: 220, unit: 'MPa' },
          yieldStrength: { value: 69, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1380, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 20,
            percentOfB1112: 40,
            description: 'Gummy, stringy chips',
            speedFactor: 0.20
          }
        },
        
        'Hard': {
          temper: 'H04',
          hardness: { rockwellF: 84, brinell: 85 },
          tensileStrength: { value: 345, unit: 'MPa' },
          yieldStrength: { value: 310, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1550, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 25,
            speedFactor: 0.25
          }
        }
      },
      
      physical: {
        density: { value: 8940, unit: 'kg/m³' },
        meltingPoint: { value: 1083, unit: '°C' },
        thermalConductivity: { value: 388, unit: 'W/m·K' },
        electricalConductivity: { value: 100, unit: '%IACS' },
        elasticModulus: { value: 117, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 90, unit: 'MPa' },
        B: { value: 292, unit: 'MPa' },
        n: { value: 0.31 },
        C: { value: 0.025 },
        m: { value: 1.09 },
        reliability: 'good'
      },
      
      applications: ['Electrical wire', 'Bus bars', 'Roofing', 'Heat exchangers']
    },
    
    'C122': {
      name: 'C122 Deoxidized High Phosphorus (DHP)',
      uns: 'C12200',
      description: 'Phosphorus-deoxidized copper for welding/brazing',
      category: 'copper_alloys',
      subcategory: 'pure_copper',
      
      composition: {
        Cu: { min: 99.90, unit: '%' },
        P: { min: 0.015, max: 0.040, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellF: 40, brinell: 45 },
          tensileStrength: { value: 220, unit: 'MPa' },
          yieldStrength: { value: 69, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1400, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 20,
            speedFactor: 0.20
          }
        }
      },
      
      physical: {
        density: { value: 8940, unit: 'kg/m³' },
        meltingPoint: { value: 1083, unit: '°C' },
        thermalConductivity: { value: 339, unit: 'W/m·K' },
        electricalConductivity: { value: 85, unit: '%IACS' },
        elasticModulus: { value: 117, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 90, unit: 'MPa' },
        B: { value: 300, unit: 'MPa' },
        n: { value: 0.32 },
        C: { value: 0.024 },
        m: { value: 1.08 },
        reliability: 'low'
      },
      
      applications: ['Plumbing tube', 'Heat exchangers', 'Condenser tubes']
    },
    
    'C145': {
      name: 'C145 Tellurium Copper',
      uns: 'C14500',
      description: 'Free-machining copper with tellurium addition',
      category: 'copper_alloys',
      subcategory: 'pure_copper',
      
      composition: {
        Cu: { min: 99.50, unit: '%' },
        Te: { min: 0.40, max: 0.70, nominal: 0.55, unit: '%' },
        P: { min: 0.004, max: 0.012, unit: '%' }
      },
      
      conditions: {
        'Soft': {
          hardness: { rockwellF: 55, brinell: 55 },
          tensileStrength: { value: 240, unit: 'MPa' },
          yieldStrength: { value: 165, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1280, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'good',
            note: 'Tellurium acts as chip breaker'
          },
          
          machinability: {
            rating: 'B',
            percentOfC360: 90,
            percentOfB1112: 180,
            description: 'BEST pure copper for machining - tellurium breaks chips',
            speedFactor: 0.90
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 180, unit: 'm/min' }, finish: { value: 250, unit: 'm/min' } },
            hss: { rough: { value: 60, unit: 'm/min' }, finish: { value: 85, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8940, unit: 'kg/m³' },
        meltingPoint: { value: 1083, unit: '°C' },
        thermalConductivity: { value: 355, unit: 'W/m·K' },
        electricalConductivity: { value: 93, unit: '%IACS' },
        elasticModulus: { value: 117, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 160, unit: 'MPa' },
        B: { value: 280, unit: 'MPa' },
        n: { value: 0.30 },
        C: { value: 0.020 },
        m: { value: 1.05 },
        reliability: 'medium'
      },
      
      applications: ['Screw machine products', 'Electrical connectors', 'Motor parts']
    },

    
    // ============================================
    // BRASSES - STANDARD (C2xxxx Series)
    // ============================================
    
    'C260': {
      name: 'C260 Cartridge Brass (70/30)',
      uns: 'C26000',
      description: 'Classic 70% Cu / 30% Zn brass for deep drawing',
      category: 'copper_alloys',
      subcategory: 'brass',
      
      composition: {
        Cu: { min: 68.5, max: 71.5, nominal: 70.0, unit: '%' },
        Zn: { balance: true, nominal: 30.0, unit: '%' },
        Pb: { max: 0.07, unit: '%' },
        Fe: { max: 0.05, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          temper: 'O60',
          hardness: { rockwellF: 63, rockwellB: 55, brinell: 65 },
          tensileStrength: { value: 315, unit: 'MPa' },
          yieldStrength: { value: 105, unit: 'MPa' },
          elongation: { value: 66, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1150, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 30,
            percentOfB1112: 60,
            description: 'Moderate - no lead means longer chips',
            speedFactor: 0.30
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 150, unit: 'm/min' }, finish: { value: 220, unit: 'm/min' } },
            hss: { rough: { value: 50, unit: 'm/min' }, finish: { value: 75, unit: 'm/min' } }
          }
        },
        
        'Half-Hard': {
          temper: 'H02',
          hardness: { rockwellB: 65, brinell: 85 },
          tensileStrength: { value: 385, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1280, unit: 'MPa' },
            mc: { value: 0.21 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 35,
            speedFactor: 0.35
          }
        },
        
        'Hard': {
          temper: 'H04',
          hardness: { rockwellB: 75, brinell: 105 },
          tensileStrength: { value: 455, unit: 'MPa' },
          yieldStrength: { value: 385, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1400, unit: 'MPa' },
            mc: { value: 0.20 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 40,
            speedFactor: 0.40
          }
        }
      },
      
      physical: {
        density: { value: 8530, unit: 'kg/m³' },
        meltingRange: { min: 915, max: 955, unit: '°C' },
        thermalConductivity: { value: 120, unit: 'W/m·K' },
        electricalConductivity: { value: 28, unit: '%IACS' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 112, unit: 'MPa' },
        B: { value: 505, unit: 'MPa' },
        n: { value: 0.42 },
        C: { value: 0.009 },
        m: { value: 1.68 },
        reliability: 'good',
        source: 'Gao & Wagoner (1987)'
      },
      
      applications: ['Ammunition casings', 'Radiator cores', 'Hardware', 'Lamp fixtures']
    },
    
    'C280': {
      name: 'C280 Muntz Metal (60/40)',
      uns: 'C28000',
      description: 'High-zinc brass for hot working',
      category: 'copper_alloys',
      subcategory: 'brass',
      
      composition: {
        Cu: { min: 59.0, max: 63.0, nominal: 60.0, unit: '%' },
        Zn: { balance: true, nominal: 40.0, unit: '%' },
        Pb: { max: 0.30, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 55, brinell: 70 },
          tensileStrength: { value: 370, unit: 'MPa' },
          yieldStrength: { value: 140, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1180, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 40,
            percentOfB1112: 80,
            description: 'Better than 70/30 due to beta phase',
            speedFactor: 0.40
          }
        }
      },
      
      physical: {
        density: { value: 8390, unit: 'kg/m³' },
        meltingRange: { min: 880, max: 900, unit: '°C' },
        thermalConductivity: { value: 123, unit: 'W/m·K' },
        electricalConductivity: { value: 28, unit: '%IACS' },
        elasticModulus: { value: 100, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 140, unit: 'MPa' },
        B: { value: 480, unit: 'MPa' },
        n: { value: 0.40 },
        C: { value: 0.010 },
        m: { value: 1.60 },
        reliability: 'low'
      },
      
      applications: ['Architectural', 'Condenser plates', 'Hot forgings']
    },
    
    // ============================================
    // FREE-MACHINING LEADED BRASSES (C3xxxx Series)
    // ============================================
    
    'C360': {
      name: 'C360 Free-Cutting Brass',
      uns: 'C36000',
      description: 'THE REFERENCE STANDARD for copper alloy machinability (100%)',
      category: 'copper_alloys',
      subcategory: 'leaded_brass',
      
      composition: {
        Cu: { min: 60.0, max: 63.0, nominal: 61.5, unit: '%' },
        Pb: { min: 2.5, max: 3.7, nominal: 3.0, unit: '%' },
        Zn: { balance: true, nominal: 35.5, unit: '%' },
        Fe: { max: 0.35, unit: '%' }
      },
      
      leadNote: 'Lead provides chip breaking and internal lubrication',
      
      conditions: {
        'Half-Hard': {
          temper: 'H02',
          hardness: { rockwellB: 75, brinell: 100 },
          tensileStrength: { value: 385, unit: 'MPa' },
          yieldStrength: { value: 310, unit: 'MPa' },
          elongation: { value: 25, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 950, unit: 'MPa' },
            mc: { value: 0.18 },
            reliability: 'excellent',
            note: 'Reference standard - best documented copper alloy'
          },
          
          machinability: {
            rating: 'A',
            percentOfC360: 100,
            percentOfB1112: 200,
            description: 'REFERENCE STANDARD - Excellent chip control, low tool wear',
            speedFactor: 1.00
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 250, unit: 'm/min' }, finish: { value: 350, unit: 'm/min' } },
            hss: { rough: { value: 90, unit: 'm/min' }, finish: { value: 120, unit: 'm/min' } }
          }
        },
        
        'Soft': {
          temper: 'O60',
          hardness: { rockwellB: 60, brinell: 70 },
          tensileStrength: { value: 340, unit: 'MPa' },
          yieldStrength: { value: 125, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 880, unit: 'MPa' },
            mc: { value: 0.17 },
            reliability: 'excellent'
          },
          
          machinability: {
            rating: 'A',
            percentOfC360: 100,
            speedFactor: 1.00
          }
        }
      },
      
      physical: {
        density: { value: 8500, unit: 'kg/m³' },
        meltingRange: { min: 885, max: 900, unit: '°C' },
        thermalConductivity: { value: 115, unit: 'W/m·K' },
        electricalConductivity: { value: 26, unit: '%IACS' },
        elasticModulus: { value: 97, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 125, unit: 'MPa' },
        B: { value: 450, unit: 'MPa' },
        n: { value: 0.38 },
        C: { value: 0.012 },
        m: { value: 1.50 },
        reliability: 'good'
      },
      
      applications: ['Screw machine products', 'Gears', 'Pinions', 'Valve stems', 'Fittings']
    },
    
    'C353': {
      name: 'C353 High-Leaded Brass',
      uns: 'C35300',
      description: 'Higher lead content for improved machinability',
      category: 'copper_alloys',
      subcategory: 'leaded_brass',
      
      composition: {
        Cu: { min: 60.0, max: 63.0, nominal: 61.5, unit: '%' },
        Pb: { min: 1.5, max: 2.5, nominal: 1.8, unit: '%' },
        Zn: { balance: true, unit: '%' }
      },
      
      conditions: {
        'Half-Hard': {
          hardness: { rockwellB: 70, brinell: 90 },
          tensileStrength: { value: 360, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1000, unit: 'MPa' },
            mc: { value: 0.19 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'A',
            percentOfC360: 90,
            speedFactor: 0.90
          }
        }
      },
      
      physical: {
        density: { value: 8450, unit: 'kg/m³' },
        meltingRange: { min: 895, max: 915, unit: '°C' },
        thermalConductivity: { value: 116, unit: 'W/m·K' },
        electricalConductivity: { value: 27, unit: '%IACS' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 130, unit: 'MPa' },
        B: { value: 460, unit: 'MPa' },
        n: { value: 0.39 },
        C: { value: 0.011 },
        m: { value: 1.52 },
        reliability: 'low'
      },
      
      applications: ['Clock parts', 'Gears', 'Watch components']
    },
    
    'C385': {
      name: 'C385 Architectural Bronze',
      uns: 'C38500',
      description: 'Leaded brass for architectural applications',
      category: 'copper_alloys',
      subcategory: 'leaded_brass',
      
      composition: {
        Cu: { min: 55.0, max: 59.0, nominal: 57.0, unit: '%' },
        Pb: { min: 2.5, max: 3.5, nominal: 3.0, unit: '%' },
        Zn: { balance: true, unit: '%' }
      },
      
      conditions: {
        'As Extruded': {
          hardness: { rockwellB: 72, brinell: 95 },
          tensileStrength: { value: 415, unit: 'MPa' },
          yieldStrength: { value: 170, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 970, unit: 'MPa' },
            mc: { value: 0.18 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'A',
            percentOfC360: 90,
            speedFactor: 0.90
          }
        }
      },
      
      physical: {
        density: { value: 8450, unit: 'kg/m³' },
        meltingRange: { min: 879, max: 899, unit: '°C' },
        thermalConductivity: { value: 109, unit: 'W/m·K' },
        electricalConductivity: { value: 26, unit: '%IACS' },
        elasticModulus: { value: 97, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 168, unit: 'MPa' },
        B: { value: 430, unit: 'MPa' },
        n: { value: 0.36 },
        C: { value: 0.012 },
        m: { value: 1.48 },
        reliability: 'low'
      },
      
      applications: ['Architectural extrusions', 'Hinges', 'Lock bodies']
    },
    
    // ============================================
    // NAVAL BRASS (C4xxxx Series)
    // ============================================
    
    'C464': {
      name: 'C464 Naval Brass',
      uns: 'C46400',
      description: 'Tin-bearing brass for seawater applications',
      category: 'copper_alloys',
      subcategory: 'tin_brass',
      
      composition: {
        Cu: { min: 59.0, max: 62.0, nominal: 60.5, unit: '%' },
        Sn: { min: 0.5, max: 1.0, nominal: 0.75, unit: '%' },
        Zn: { balance: true, unit: '%' },
        Pb: { max: 0.20, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 60, brinell: 75 },
          tensileStrength: { value: 380, unit: 'MPa' },
          yieldStrength: { value: 170, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1200, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 35,
            percentOfB1112: 70,
            description: 'Tin makes it harder to machine than plain brass',
            speedFactor: 0.35
          }
        },
        
        'Half-Hard': {
          hardness: { rockwellB: 75, brinell: 100 },
          tensileStrength: { value: 450, unit: 'MPa' },
          yieldStrength: { value: 345, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1320, unit: 'MPa' },
            mc: { value: 0.21 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 40,
            speedFactor: 0.40
          }
        }
      },
      
      physical: {
        density: { value: 8410, unit: 'kg/m³' },
        meltingRange: { min: 885, max: 900, unit: '°C' },
        thermalConductivity: { value: 116, unit: 'W/m·K' },
        electricalConductivity: { value: 26, unit: '%IACS' },
        elasticModulus: { value: 100, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 168, unit: 'MPa' },
        B: { value: 490, unit: 'MPa' },
        n: { value: 0.40 },
        C: { value: 0.010 },
        m: { value: 1.55 },
        reliability: 'low'
      },
      
      corrosionResistance: {
        seawater: 'Excellent - resists dezincification',
        brackish: 'Excellent'
      },
      
      applications: ['Marine hardware', 'Propeller shafts', 'Valve stems', 'Condenser plates']
    },

    
    // ============================================
    // PHOSPHOR BRONZE (C5xxxx Series)
    // ============================================
    
    'C510': {
      name: 'C510 Phosphor Bronze A',
      uns: 'C51000',
      description: '5% tin phosphor bronze - excellent spring properties',
      category: 'copper_alloys',
      subcategory: 'phosphor_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 94.8, unit: '%' },
        Sn: { min: 4.2, max: 5.8, nominal: 5.0, unit: '%' },
        P: { min: 0.03, max: 0.35, nominal: 0.2, unit: '%' },
        Zn: { max: 0.30, unit: '%' },
        Pb: { max: 0.05, unit: '%' },
        Fe: { max: 0.10, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          temper: 'O60',
          hardness: { rockwellF: 70, brinell: 70 },
          tensileStrength: { value: 325, unit: 'MPa' },
          yieldStrength: { value: 130, unit: 'MPa' },
          elongation: { value: 64, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1350, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 25,
            percentOfB1112: 50,
            description: 'Tin creates abrasive Cu-Sn particles',
            speedFactor: 0.25
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 90, unit: 'm/min' }, finish: { value: 140, unit: 'm/min' } },
            hss: { rough: { value: 30, unit: 'm/min' }, finish: { value: 50, unit: 'm/min' } }
          }
        },
        
        'Spring': {
          temper: 'H08',
          hardness: { rockwellC: 30, brinell: 190 },
          tensileStrength: { value: 620, unit: 'MPa' },
          yieldStrength: { value: 520, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1600, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 30,
            speedFactor: 0.30
          }
        }
      },
      
      physical: {
        density: { value: 8860, unit: 'kg/m³' },
        meltingRange: { min: 1000, max: 1050, unit: '°C' },
        thermalConductivity: { value: 69, unit: 'W/m·K' },
        electricalConductivity: { value: 15, unit: '%IACS' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 128, unit: 'MPa' },
        B: { value: 580, unit: 'MPa' },
        n: { value: 0.46 },
        C: { value: 0.008 },
        m: { value: 1.45 },
        reliability: 'medium'
      },
      
      applications: ['Springs', 'Electrical contacts', 'Fasteners', 'Bellows', 'Diaphragms']
    },
    
    'C521': {
      name: 'C521 Phosphor Bronze B',
      uns: 'C52100',
      description: '8% tin phosphor bronze - higher strength',
      category: 'copper_alloys',
      subcategory: 'phosphor_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 91.8, unit: '%' },
        Sn: { min: 7.0, max: 9.0, nominal: 8.0, unit: '%' },
        P: { min: 0.03, max: 0.35, nominal: 0.2, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellF: 75, brinell: 80 },
          tensileStrength: { value: 380, unit: 'MPa' },
          yieldStrength: { value: 165, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1450, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 20,
            percentOfB1112: 40,
            description: 'Higher Sn = more difficult',
            speedFactor: 0.20
          }
        },
        
        'Spring': {
          hardness: { rockwellC: 35, brinell: 220 },
          tensileStrength: { value: 720, unit: 'MPa' },
          yieldStrength: { value: 620, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1720, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 25,
            speedFactor: 0.25
          }
        }
      },
      
      physical: {
        density: { value: 8800, unit: 'kg/m³' },
        meltingRange: { min: 955, max: 1025, unit: '°C' },
        thermalConductivity: { value: 50, unit: 'W/m·K' },
        electricalConductivity: { value: 13, unit: '%IACS' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 162, unit: 'MPa' },
        B: { value: 620, unit: 'MPa' },
        n: { value: 0.45 },
        C: { value: 0.008 },
        m: { value: 1.42 },
        reliability: 'low'
      },
      
      applications: ['Heavy-duty springs', 'Gears', 'Bearings', 'Bushings']
    },
    
    'C544': {
      name: 'C544 Free-Cutting Phosphor Bronze',
      uns: 'C54400',
      description: 'Leaded phosphor bronze for improved machinability',
      category: 'copper_alloys',
      subcategory: 'phosphor_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 87.5, unit: '%' },
        Sn: { min: 3.5, max: 4.5, nominal: 4.0, unit: '%' },
        Pb: { min: 3.5, max: 4.5, nominal: 4.0, unit: '%' },
        Zn: { min: 1.5, max: 4.5, nominal: 3.0, unit: '%' },
        P: { max: 0.10, unit: '%' }
      },
      
      conditions: {
        'Half-Hard': {
          hardness: { rockwellB: 72, brinell: 90 },
          tensileStrength: { value: 380, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1150, unit: 'MPa' },
            mc: { value: 0.20 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'B',
            percentOfC360: 80,
            percentOfB1112: 160,
            description: 'BEST phosphor bronze for machining - lead addition',
            speedFactor: 0.80
          }
        }
      },
      
      physical: {
        density: { value: 8890, unit: 'kg/m³' },
        meltingRange: { min: 935, max: 1000, unit: '°C' },
        thermalConductivity: { value: 75, unit: 'W/m·K' },
        electricalConductivity: { value: 19, unit: '%IACS' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 140, unit: 'MPa' },
        B: { value: 500, unit: 'MPa' },
        n: { value: 0.40 },
        C: { value: 0.010 },
        m: { value: 1.48 },
        reliability: 'medium'
      },
      
      applications: ['Bearings', 'Bushings', 'Gears', 'Screw machine products']
    },
    
    // ============================================
    // ALUMINUM BRONZE (C6xxxx Series)
    // ============================================
    
    'C614': {
      name: 'C614 Aluminum Bronze',
      uns: 'C61400',
      description: '7% aluminum bronze - moderate strength',
      category: 'copper_alloys',
      subcategory: 'aluminum_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 91.0, unit: '%' },
        Al: { min: 6.0, max: 8.0, nominal: 7.0, unit: '%' },
        Fe: { min: 1.5, max: 3.5, nominal: 2.5, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 75, brinell: 110 },
          tensileStrength: { value: 485, unit: 'MPa' },
          yieldStrength: { value: 195, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1650, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium',
            note: 'Al2O3 inclusions are abrasive'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 30,
            percentOfB1112: 60,
            description: 'Aluminum oxide particles cause tool wear',
            speedFactor: 0.30
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 60, unit: 'm/min' }, finish: { value: 90, unit: 'm/min' } },
            hss: { rough: { value: 20, unit: 'm/min' }, finish: { value: 30, unit: 'm/min' } }
          }
        },
        
        'Half-Hard': {
          hardness: { rockwellB: 88, brinell: 150 },
          tensileStrength: { value: 585, unit: 'MPa' },
          yieldStrength: { value: 380, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1820, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 35,
            speedFactor: 0.35
          }
        }
      },
      
      physical: {
        density: { value: 7800, unit: 'kg/m³' },
        meltingRange: { min: 1015, max: 1050, unit: '°C' },
        thermalConductivity: { value: 59, unit: 'W/m·K' },
        electricalConductivity: { value: 14, unit: '%IACS' },
        elasticModulus: { value: 117, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 193, unit: 'MPa' },
        B: { value: 600, unit: 'MPa' },
        n: { value: 0.42 },
        C: { value: 0.009 },
        m: { value: 1.35 },
        reliability: 'low'
      },
      
      applications: ['Marine hardware', 'Pump components', 'Valves', 'Propellers']
    },
    
    'C630': {
      name: 'C630 Aluminum Bronze (10%)',
      uns: 'C63000',
      description: 'High-aluminum bronze - maximum strength',
      category: 'copper_alloys',
      subcategory: 'aluminum_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 81.5, unit: '%' },
        Al: { min: 9.0, max: 11.0, nominal: 10.0, unit: '%' },
        Fe: { min: 2.0, max: 4.0, nominal: 3.0, unit: '%' },
        Ni: { min: 4.0, max: 5.5, nominal: 5.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellC: 20, brinell: 170 },
          tensileStrength: { value: 620, unit: 'MPa' },
          yieldStrength: { value: 260, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2050, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 20,
            percentOfB1112: 40,
            description: 'MOST DIFFICULT copper alloy - use ceramic or CBN',
            speedFactor: 0.20
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 45, unit: 'm/min' }, finish: { value: 70, unit: 'm/min' } },
            ceramic: { rough: { value: 150, unit: 'm/min' }, finish: { value: 120, unit: 'm/min' } },
            hss: { rough: { value: 15, unit: 'm/min', note: 'Not recommended' } }
          }
        },
        
        'Heat Treated': {
          treatment: 'Quench + Temper',
          hardness: { rockwellC: 36, brinell: 310 },
          tensileStrength: { value: 895, unit: 'MPa' },
          yieldStrength: { value: 515, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2350, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 15,
            description: 'Extremely difficult - machine before heat treatment when possible',
            speedFactor: 0.15
          }
        }
      },
      
      physical: {
        density: { value: 7580, unit: 'kg/m³' },
        meltingRange: { min: 1015, max: 1055, unit: '°C' },
        thermalConductivity: { value: 42, unit: 'W/m·K' },
        electricalConductivity: { value: 7, unit: '%IACS' },
        elasticModulus: { value: 115, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 258, unit: 'MPa' },
        B: { value: 700, unit: 'MPa' },
        n: { value: 0.40 },
        C: { value: 0.008 },
        m: { value: 1.30 },
        reliability: 'low'
      },
      
      applications: ['Gears', 'Worm wheels', 'Heavy-duty bearings', 'Landing gear', 'Marine propellers']
    },
    
    'C954': {
      name: 'C954 Aluminum Bronze (Cast)',
      uns: 'C95400',
      description: 'Cast aluminum bronze for heavy-duty applications',
      category: 'copper_alloys',
      subcategory: 'aluminum_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 85.0, unit: '%' },
        Al: { min: 10.0, max: 11.5, nominal: 10.75, unit: '%' },
        Fe: { min: 3.0, max: 5.0, nominal: 4.0, unit: '%' }
      },
      
      conditions: {
        'As Cast': {
          hardness: { brinell: 170 },
          tensileStrength: { value: 585, unit: 'MPa' },
          yieldStrength: { value: 240, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1950, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 22,
            speedFactor: 0.22
          }
        },
        
        'Heat Treated': {
          hardness: { brinell: 235 },
          tensileStrength: { value: 725, unit: 'MPa' },
          yieldStrength: { value: 380, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2200, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 18,
            speedFactor: 0.18
          }
        }
      },
      
      physical: {
        density: { value: 7450, unit: 'kg/m³' },
        meltingRange: { min: 1025, max: 1045, unit: '°C' },
        thermalConductivity: { value: 59, unit: 'W/m·K' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 238, unit: 'MPa' },
        B: { value: 680, unit: 'MPa' },
        n: { value: 0.42 },
        C: { value: 0.008 },
        m: { value: 1.28 },
        reliability: 'low'
      },
      
      applications: ['Gears', 'Pump impellers', 'Valve bodies', 'Large bearings']
    },
    
    // ============================================
    // SILICON BRONZE (C6xxxx Series)
    // ============================================
    
    'C651': {
      name: 'C651 Low-Silicon Bronze A',
      uns: 'C65100',
      description: '1.5% silicon bronze - good weldability',
      category: 'copper_alloys',
      subcategory: 'silicon_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 98.5, unit: '%' },
        Si: { min: 0.8, max: 2.0, nominal: 1.5, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 50, brinell: 60 },
          tensileStrength: { value: 310, unit: 'MPa' },
          yieldStrength: { value: 110, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1250, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 35,
            speedFactor: 0.35
          }
        }
      },
      
      physical: {
        density: { value: 8750, unit: 'kg/m³' },
        meltingRange: { min: 1025, max: 1060, unit: '°C' },
        thermalConductivity: { value: 50, unit: 'W/m·K' },
        electricalConductivity: { value: 12, unit: '%IACS' },
        elasticModulus: { value: 117, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 108, unit: 'MPa' },
        B: { value: 520, unit: 'MPa' },
        n: { value: 0.45 },
        C: { value: 0.010 },
        m: { value: 1.40 },
        reliability: 'low'
      },
      
      applications: ['Hardware', 'Pole line hardware', 'Fasteners', 'Marine hardware']
    },
    
    'C655': {
      name: 'C655 High-Silicon Bronze A',
      uns: 'C65500',
      description: '3% silicon bronze - higher strength',
      category: 'copper_alloys',
      subcategory: 'silicon_bronze',
      
      composition: {
        Cu: { balance: true, nominal: 97.0, unit: '%' },
        Si: { min: 2.8, max: 3.8, nominal: 3.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 70, brinell: 85 },
          tensileStrength: { value: 390, unit: 'MPa' },
          yieldStrength: { value: 165, unit: 'MPa' },
          elongation: { value: 55, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1380, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 30,
            percentOfB1112: 60,
            speedFactor: 0.30
          }
        },
        
        'Hard': {
          hardness: { rockwellB: 97, brinell: 155 },
          tensileStrength: { value: 580, unit: 'MPa' },
          yieldStrength: { value: 485, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1580, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 35,
            speedFactor: 0.35
          }
        }
      },
      
      physical: {
        density: { value: 8530, unit: 'kg/m³' },
        meltingRange: { min: 970, max: 1025, unit: '°C' },
        thermalConductivity: { value: 36, unit: 'W/m·K' },
        electricalConductivity: { value: 7, unit: '%IACS' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 162, unit: 'MPa' },
        B: { value: 560, unit: 'MPa' },
        n: { value: 0.43 },
        C: { value: 0.009 },
        m: { value: 1.38 },
        reliability: 'low'
      },
      
      applications: ['Marine hardware', 'Poles', 'Hydraulic pressure lines', 'Fasteners']
    },

    
    // ============================================
    // COPPER-NICKEL (C7xxxx Series)
    // ============================================
    
    'C706': {
      name: 'C706 Copper-Nickel 90/10',
      uns: 'C70600',
      description: '10% nickel cupronickel - excellent seawater resistance',
      category: 'copper_alloys',
      subcategory: 'copper_nickel',
      
      composition: {
        Cu: { balance: true, nominal: 88.6, unit: '%' },
        Ni: { min: 9.0, max: 11.0, nominal: 10.0, unit: '%' },
        Fe: { min: 1.0, max: 1.8, nominal: 1.4, unit: '%' },
        Mn: { max: 1.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellF: 75, brinell: 85 },
          tensileStrength: { value: 315, unit: 'MPa' },
          yieldStrength: { value: 115, unit: 'MPa' },
          elongation: { value: 42, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1420, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 25,
            percentOfB1112: 50,
            description: 'Challenging - work hardens rapidly',
            speedFactor: 0.25
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 75, unit: 'm/min' }, finish: { value: 110, unit: 'm/min' } },
            hss: { rough: { value: 25, unit: 'm/min' }, finish: { value: 40, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8940, unit: 'kg/m³' },
        meltingRange: { min: 1100, max: 1145, unit: '°C' },
        thermalConductivity: { value: 45, unit: 'W/m·K' },
        electricalConductivity: { value: 9, unit: '%IACS' },
        elasticModulus: { value: 135, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 114, unit: 'MPa' },
        B: { value: 540, unit: 'MPa' },
        n: { value: 0.46 },
        C: { value: 0.008 },
        m: { value: 1.35 },
        reliability: 'low'
      },
      
      corrosionResistance: {
        seawater: 'Excellent - resists biofouling',
        brackish: 'Excellent',
        note: 'Standard for seawater piping'
      },
      
      applications: ['Seawater piping', 'Condenser tubes', 'Heat exchangers', 'Desalination']
    },
    
    'C715': {
      name: 'C715 Copper-Nickel 70/30',
      uns: 'C71500',
      description: '30% nickel cupronickel - maximum corrosion resistance',
      category: 'copper_alloys',
      subcategory: 'copper_nickel',
      
      composition: {
        Cu: { balance: true, nominal: 69.5, unit: '%' },
        Ni: { min: 29.0, max: 33.0, nominal: 30.0, unit: '%' },
        Fe: { min: 0.4, max: 1.0, nominal: 0.5, unit: '%' },
        Mn: { max: 1.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 65, brinell: 100 },
          tensileStrength: { value: 380, unit: 'MPa' },
          yieldStrength: { value: 140, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1550, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 20,
            percentOfB1112: 40,
            description: 'Difficult - high work hardening, gummy chips',
            speedFactor: 0.20
          }
        },
        
        'Cold Worked': {
          hardness: { rockwellB: 85, brinell: 140 },
          tensileStrength: { value: 510, unit: 'MPa' },
          yieldStrength: { value: 400, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1750, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfC360: 25,
            speedFactor: 0.25
          }
        }
      },
      
      physical: {
        density: { value: 8940, unit: 'kg/m³' },
        meltingRange: { min: 1170, max: 1240, unit: '°C' },
        thermalConductivity: { value: 29, unit: 'W/m·K' },
        electricalConductivity: { value: 4.6, unit: '%IACS' },
        elasticModulus: { value: 150, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 138, unit: 'MPa' },
        B: { value: 590, unit: 'MPa' },
        n: { value: 0.44 },
        C: { value: 0.007 },
        m: { value: 1.32 },
        reliability: 'low'
      },
      
      corrosionResistance: {
        seawater: 'Best cupronickel for velocity resistance',
        note: 'Used in highest-velocity seawater applications'
      },
      
      applications: ['High-velocity seawater', 'Condenser tubes', 'Feedwater heaters', 'Salt water piping']
    },
    
    // ============================================
    // NICKEL SILVER (C7xxxx Series)
    // ============================================
    
    'C752': {
      name: 'C752 Nickel Silver 65-18',
      uns: 'C75200',
      description: 'Standard nickel silver - attractive silver color',
      category: 'copper_alloys',
      subcategory: 'nickel_silver',
      
      composition: {
        Cu: { min: 63.0, max: 66.5, nominal: 65.0, unit: '%' },
        Ni: { min: 16.5, max: 19.5, nominal: 18.0, unit: '%' },
        Zn: { balance: true, nominal: 17.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 55, brinell: 75 },
          tensileStrength: { value: 380, unit: 'MPa' },
          yieldStrength: { value: 150, unit: 'MPa' },
          elongation: { value: 40, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1380, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 30,
            percentOfB1112: 60,
            speedFactor: 0.30
          }
        },
        
        'Spring': {
          temper: 'H06',
          hardness: { rockwellB: 90, brinell: 145 },
          tensileStrength: { value: 585, unit: 'MPa' },
          yieldStrength: { value: 530, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1620, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 35,
            speedFactor: 0.35
          }
        }
      },
      
      physical: {
        density: { value: 8730, unit: 'kg/m³' },
        meltingRange: { min: 1020, max: 1110, unit: '°C' },
        thermalConductivity: { value: 33, unit: 'W/m·K' },
        electricalConductivity: { value: 6, unit: '%IACS' },
        elasticModulus: { value: 125, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 148, unit: 'MPa' },
        B: { value: 560, unit: 'MPa' },
        n: { value: 0.44 },
        C: { value: 0.009 },
        m: { value: 1.40 },
        reliability: 'low'
      },
      
      applications: ['Optical parts', 'Musical instruments', 'Silverware', 'Keys', 'Zippers']
    },
    
    // ============================================
    // BERYLLIUM COPPER (C17xxx Series) - TOXIC!
    // ============================================
    
    'C172': {
      name: 'C172 Beryllium Copper',
      uns: 'C17200',
      description: 'HIGHEST STRENGTH copper alloy - TOXIC dust, handle with care',
      category: 'copper_alloys',
      subcategory: 'beryllium_copper',
      
      safetyWarning: {
        hazard: 'BERYLLIUM DUST IS TOXIC AND CARCINOGENIC',
        requirements: [
          'HEPA-filtered dust extraction MANDATORY',
          'Wet machining strongly recommended',
          'Full PPE including respirator required',
          'Do NOT grind or polish dry',
          'Comply with OSHA beryllium standards (29 CFR 1910.1024)'
        ],
        permissibleExposure: { value: 0.2, unit: 'µg/m³', standard: 'OSHA PEL' }
      },
      
      composition: {
        Cu: { balance: true, nominal: 97.3, unit: '%' },
        Be: { min: 1.80, max: 2.00, nominal: 1.9, unit: '%' },
        Co: { max: 0.30, unit: '%' },
        Ni: { max: 0.30, unit: '%' }
      },
      
      conditions: {
        'Solution Annealed (A)': {
          treatment: 'Solution treated, quenched',
          hardness: { rockwellB: 60, brinell: 85 },
          tensileStrength: { value: 470, unit: 'MPa' },
          yieldStrength: { value: 195, unit: 'MPa' },
          elongation: { value: 35, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1320, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium',
            note: 'BEST condition for machining - do majority of machining here'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 50,
            percentOfB1112: 100,
            description: 'Machine in A temper, THEN age harden',
            speedFactor: 0.50
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 100, unit: 'm/min' }, finish: { value: 150, unit: 'm/min' } },
            hss: { rough: { value: 40, unit: 'm/min' }, finish: { value: 60, unit: 'm/min' } }
          }
        },
        
        'Age Hardened (AT)': {
          treatment: 'Solution treated + aged at 315°C (600°F)',
          hardness: { rockwellC: 38, brinell: 360 },
          tensileStrength: { value: 1280, unit: 'MPa' },
          yieldStrength: { value: 1105, unit: 'MPa' },
          elongation: { value: 3, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2250, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 20,
            percentOfB1112: 40,
            description: 'Extremely difficult - minimize machining in aged condition',
            speedFactor: 0.20
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 45, unit: 'm/min' }, finish: { value: 75, unit: 'm/min' } },
            note: 'HSS not recommended'
          }
        },
        
        'Half-Hard (1/2H + AT)': {
          treatment: 'Cold worked + aged',
          hardness: { rockwellC: 40, brinell: 380 },
          tensileStrength: { value: 1380, unit: 'MPa' },
          yieldStrength: { value: 1245, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2400, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfC360: 15,
            speedFactor: 0.15
          }
        }
      },
      
      machiningStrategy: {
        recommendation: 'ALWAYS machine in solution annealed (A) condition',
        process: [
          '1. Rough machine in A temper (leaving 0.25-0.5mm)',
          '2. Age harden (precipitation hardening)',
          '3. Finish machine (minimal stock removal)',
          '4. Do NOT grind if possible'
        ],
        coolant: {
          requirement: 'FLOOD coolant required for dust suppression',
          type: 'Water-soluble oil recommended',
          pressure: 'High pressure through-tool if possible'
        }
      },
      
      physical: {
        density: { value: 8250, unit: 'kg/m³' },
        meltingRange: { min: 865, max: 980, unit: '°C' },
        thermalConductivity: { value: 130, unit: 'W/m·K', condition: 'Aged' },
        electricalConductivity: { value: 22, unit: '%IACS', condition: 'Aged' },
        elasticModulus: { value: 128, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 450, unit: 'MPa', condition: 'Aged' },
        B: { value: 700, unit: 'MPa' },
        n: { value: 0.30 },
        C: { value: 0.008 },
        m: { value: 1.20 },
        reliability: 'medium'
      },
      
      applications: ['Non-sparking tools', 'Springs', 'Electrical contacts', 'Mold inserts', 'Aerospace'],
      
      nonSparking: {
        note: 'Non-sparking property makes it critical for explosive environments',
        standards: ['ASTM F2503', 'FM Approval']
      }
    },
    
    'C175': {
      name: 'C175 Beryllium Copper (Low Be)',
      uns: 'C17500',
      description: 'Lower Be content - better conductivity, easier machining',
      category: 'copper_alloys',
      subcategory: 'beryllium_copper',
      
      safetyWarning: {
        hazard: 'BERYLLIUM DUST IS TOXIC',
        requirements: ['Same precautions as C172 required']
      },
      
      composition: {
        Cu: { balance: true, nominal: 97.2, unit: '%' },
        Be: { min: 0.40, max: 0.70, nominal: 0.55, unit: '%' },
        Co: { min: 2.4, max: 2.7, nominal: 2.55, unit: '%' }
      },
      
      conditions: {
        'Solution Annealed': {
          hardness: { rockwellB: 45, brinell: 60 },
          tensileStrength: { value: 310, unit: 'MPa' },
          yieldStrength: { value: 140, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1180, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'B',
            percentOfC360: 60,
            description: 'Easier than C172 due to lower Be content',
            speedFactor: 0.60
          }
        },
        
        'Age Hardened': {
          hardness: { rockwellB: 98, brinell: 180 },
          tensileStrength: { value: 690, unit: 'MPa' },
          yieldStrength: { value: 590, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 1680, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfC360: 40,
            speedFactor: 0.40
          }
        }
      },
      
      physical: {
        density: { value: 8750, unit: 'kg/m³' },
        meltingRange: { min: 1030, max: 1070, unit: '°C' },
        thermalConductivity: { value: 210, unit: 'W/m·K', condition: 'Aged' },
        electricalConductivity: { value: 48, unit: '%IACS', condition: 'Aged' },
        elasticModulus: { value: 131, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 280, unit: 'MPa', condition: 'Aged' },
        B: { value: 580, unit: 'MPa' },
        n: { value: 0.35 },
        C: { value: 0.009 },
        m: { value: 1.28 },
        reliability: 'low'
      },
      
      applications: ['Resistance welding electrodes', 'Electrical connectors', 'Switch parts']
    }
  },
  
  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  getMaterial: function(materialId) {
    return this.materials[materialId] || null;
  },
  
  getKienzle: function(materialId, condition) {
    const material = this.getMaterial(materialId);
    if (!material || !material.conditions) return null;
    
    const cond = condition || Object.keys(material.conditions)[0];
    return material.conditions[cond]?.kienzle || null;
  },
  
  getJohnsonCook: function(materialId) {
    const material = this.getMaterial(materialId);
    return material ? material.johnsonCook : null;
  },
  
  getMachinability: function(materialId, condition) {
    const material = this.getMaterial(materialId);
    if (!material || !material.conditions) return null;
    
    const cond = condition || Object.keys(material.conditions)[0];
    return material.conditions[cond]?.machinability || null;
  },
  
  searchBySubcategory: function(subcategory) {
    const results = [];
    for (const id in this.materials) {
      if (this.materials[id].subcategory === subcategory) {
        results.push({ id: id, ...this.materials[id] });
      }
    }
    return results;
  },
  
  searchByMachinability: function(minRating, maxRating) {
    const ratingMap = { 'A': 100, 'B': 80, 'C': 50, 'D': 30, 'E': 15 };
    const results = [];
    
    for (const id in this.materials) {
      const material = this.materials[id];
      for (const cond in material.conditions) {
        const rating = material.conditions[cond]?.machinability?.rating;
        if (rating) {
          const numRating = ratingMap[rating] || 0;
          if (numRating >= minRating && numRating <= maxRating) {
            results.push({
              id: id,
              name: material.name,
              condition: cond,
              machinabilityRating: rating,
              numericRating: numRating,
              percentOfC360: material.conditions[cond].machinability.percentOfC360
            });
          }
        }
      }
    }
    return results.sort((a, b) => b.numericRating - a.numericRating);
  },
  
  getToolRecommendation: function(materialId, condition) {
    const material = this.getMaterial(materialId);
    if (!material) return this.machiningFundamentals.toolSelection;
    
    // Special handling for beryllium copper
    if (material.subcategory === 'beryllium_copper') {
      return {
        safetyWarning: material.safetyWarning,
        generalGuidance: this.machiningFundamentals.toolSelection,
        strategy: material.machiningStrategy
      };
    }
    
    // Special handling for aluminum bronze
    if (material.subcategory === 'aluminum_bronze') {
      return {
        generalGuidance: this.machiningFundamentals.toolSelection,
        specialNote: 'Use ceramic or CBN tooling for high-Al grades',
        reason: 'Al2O3 inclusions are extremely abrasive'
      };
    }
    
    return this.machiningFundamentals.toolSelection;
  },
  
  getSpeedGuidelines: function(subcategory) {
    return this.machiningFundamentals.speedGuidelines[subcategory] || 
           this.machiningFundamentals.speedGuidelines;
  },
  
  getFreeMachiningAlloys: function() {
    // Return all alloys rated A or B machinability
    return this.searchByMachinability(80, 100);
  },
  
  getDifficultAlloys: function() {
    // Return all alloys rated D or E machinability
    return this.searchByMachinability(0, 35);
  },
  
  getAllMaterialIds: function() {
    return Object.keys(this.materials);
  },
  
  getMaterialCount: function() {
    return Object.keys(this.materials).length;
  },
  
  getClassificationInfo: function(type) {
    return this.classification[type] || null;
  },
  
  getMachiningFundamentals: function() {
    return this.machiningFundamentals;
  },
  
  getBerylliumSafetyInfo: function() {
    const beCu = this.materials['C172'];
    return beCu ? beCu.safetyWarning : null;
  }

};

// Export for use in PRISM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_COPPER_ALLOYS_SCIENTIFIC;
}

if (typeof window !== 'undefined') {
  window.PRISM_COPPER_ALLOYS_SCIENTIFIC = PRISM_COPPER_ALLOYS_SCIENTIFIC;
}
