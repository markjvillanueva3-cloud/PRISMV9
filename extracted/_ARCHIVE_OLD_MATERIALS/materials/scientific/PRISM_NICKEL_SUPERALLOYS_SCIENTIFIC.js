/**
 * PRISM NICKEL SUPERALLOYS SCIENTIFIC DATABASE
 * =============================================
 * 
 * Comprehensive nickel-based superalloy data with validated scientific parameters
 * for machining calculations. These materials are among the most difficult to machine.
 * 
 * Session: 1.A.1-SCI-07
 * Created: 2026-01-22
 * 
 * DATA SOURCES:
 * - Machining Data Handbook (3rd Edition, Metcut Research Associates)
 * - ASM Specialty Handbook: Nickel, Cobalt, and Their Alloys
 * - ASM Metals Handbook Vol. 2: Properties and Selection - Nonferrous Alloys
 * - Johnson-Cook parameters: Kobayashi & Dodd (1989), Sima & Özel (2010)
 * - Kienzle parameters: König & Klocke (1997), Chou & Evans (1999)
 * - NACE/ASTM corrosion standards
 * - Aerospace Materials Specification (AMS) standards
 * - Special Metals Corporation technical data
 * - Haynes International machining guides
 * 
 * CRITICAL MACHINING NOTES FOR NICKEL SUPERALLOYS:
 * ================================================
 * 1. Work Hardening: Severe - light cuts cause more work hardening than heavy cuts
 * 2. Heat Generation: Extreme - 80% of heat goes to tool (vs 10% for steel)
 * 3. Cutting Forces: 2-3x higher than steel at same MRR
 * 4. Tool Life: Very short - ceramic/CBN tools often preferred for roughing
 * 5. Surface Integrity: Critical - avoid white layer formation, monitor residual stress
 * 6. Coolant: Essential - high-pressure (1000+ psi) recommended
 * 7. Chip Control: Difficult - stringy chips require chip breakers
 * 8. Positive Rake: Required - negative rake causes excessive work hardening
 * 
 * RECOMMENDED TOOLING HIERARCHY:
 * - Roughing: Ceramic (SiAlON, Whisker-reinforced), CBN
 * - Finishing: Carbide (C2 uncoated or TiAlN coated), CBN
 * - Avoid: TiN coating (chemical affinity), PCD (dissolves at temperature)
 * 
 * @module PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC
 * @version 1.0.0
 */

const PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC = {
  
  version: '1.0.0',
  category: 'nickel_superalloys',
  lastUpdated: '2026-01-22',
  
  /**
   * MACHINING FUNDAMENTALS FOR NICKEL SUPERALLOYS
   * These apply across ALL superalloys and should inform every calculation
   */
  machiningFundamentals: {
    
    workHardening: {
      description: 'Nickel superalloys work harden rapidly during machining',
      mechanism: 'Strain hardening + precipitation hardening (γ′/γ″ formers)',
      criticalFactors: [
        'Use sharp tools only - dull tools increase work hardening 200-400%',
        'Heavy DOC preferred over light - minimum 0.5mm recommended',
        'No dwelling or rubbing - maintain positive feed always',
        'First pass removes most material - subsequent passes encounter hardened layer',
        'Pecking in drilling causes severe work hardening'
      ],
      workHardenedLayerDepth: {
        lightCut: { value: '0.05-0.15', unit: 'mm', note: 'With dull tool can be 0.5mm' },
        heavyCut: { value: '0.02-0.05', unit: 'mm', note: 'With sharp tool' }
      }
    },
    
    heatManagement: {
      description: 'Extreme heat generation concentrated at tool tip',
      heatDistribution: {
        tool: { percent: 80, note: 'vs 10% for carbon steel' },
        chip: { percent: 15 },
        workpiece: { percent: 5 }
      },
      consequences: [
        'Rapid tool wear (crater, flank, notch)',
        'Risk of welding chip to tool',
        'Altered surface metallurgy if overheated',
        'Built-up edge at low speeds'
      ],
      mitigation: [
        'High-pressure coolant (70-140 bar / 1000-2000 psi)',
        'Through-spindle coolant delivery',
        'Cryogenic machining for difficult alloys',
        'Minimum Quantity Lubrication NOT recommended'
      ]
    },
    
    toolSelection: {
      roughing: {
        preferred: ['Ceramic (SiAlON)', 'Ceramic (Whisker-reinforced Al2O3)', 'CBN'],
        speeds: 'Ceramics: 150-300 m/min, CBN: 200-400 m/min',
        note: 'Ceramic tools allow higher speeds due to hot hardness'
      },
      finishing: {
        preferred: ['Carbide C2 uncoated', 'Carbide TiAlN coated', 'CBN'],
        speeds: 'Carbide: 15-45 m/min, CBN: 150-250 m/min',
        note: 'Lower speeds for better surface finish'
      },
      avoid: [
        { material: 'TiN coating', reason: 'Chemical affinity with Ni causes rapid wear' },
        { material: 'PCD', reason: 'Carbon dissolves into nickel at cutting temperature' },
        { material: 'Al2O3 pure ceramic', reason: 'Too brittle, lacks thermal shock resistance' }
      ],
      geometry: {
        rakeAngle: { value: '5-10°', note: 'Positive rake REQUIRED' },
        reliefAngle: { value: '10-12°', note: 'Higher than for steel' },
        edgePrep: { value: 'Sharp honed', note: 'No heavy chamfer or radius' },
        chipBreaker: 'Essential - open geometry to reduce force'
      }
    },
    
    cuttingParameters: {
      speedMultiplier: {
        vsSteelAISI1045: 0.15,
        vsTitanium6Al4V: 1.0,
        vsStainless316: 0.5
      },
      feedStrategy: 'Higher feed preferred over higher speed',
      docStrategy: 'Heavy DOC (1-3mm) preferred over light',
      coolantPressure: {
        minimum: { value: 35, unit: 'bar' },
        recommended: { value: 70, unit: 'bar' },
        optimal: { value: 140, unit: 'bar' }
      }
    },
    
    surfaceIntegrity: {
      concerns: [
        'White layer formation (recast layer)',
        'Tensile residual stress from thermal effects',
        'Recrystallization in HAZ',
        'Carbide precipitation at grain boundaries',
        'Microcracking from thermal shock'
      ],
      inspection: [
        'Eddy current for surface anomalies',
        'Acid etch for metallurgical changes',
        'X-ray diffraction for residual stress',
        'Microhardness traverse'
      ]
    }
  },
  
  /**
   * SUPERALLOY CLASSIFICATION
   */
  classification: {
    'solid_solution': {
      description: 'Strengthened by solid solution elements (Mo, W, Cr)',
      characteristics: 'Good weldability, moderate strength, excellent corrosion resistance',
      examples: ['Inconel 600', 'Inconel 625', 'Hastelloy X', 'Hastelloy C-276'],
      machinability: 'Better than precipitation hardened (still difficult)'
    },
    'precipitation_hardened': {
      description: 'Strengthened by γ′ (Ni3Al,Ti) and/or γ″ (Ni3Nb) precipitates',
      characteristics: 'High strength at temperature, age-hardenable',
      examples: ['Inconel 718', 'Waspaloy', 'René 41', 'Udimet 720'],
      machinability: 'Most difficult - machine in solution treated condition when possible'
    },
    'oxide_dispersion': {
      description: 'Strengthened by fine oxide particles (Y2O3)',
      characteristics: 'Highest temperature capability, not age-hardenable',
      examples: ['MA754', 'MA758', 'MA6000'],
      machinability: 'Extremely difficult - abrasive particles cause rapid tool wear'
    }
  },
  
  /**
   * MATERIAL DATABASE
   */
  materials: {
    
    // ============================================
    // INCONEL SERIES (Special Metals Corporation)
    // ============================================
    
    'Inconel_600': {
      name: 'Inconel 600',
      uns: 'N06600',
      description: 'Solid-solution Ni-Cr alloy with excellent oxidation resistance',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { min: 72.0, nominal: 76.0, unit: '%' },
        Cr: { min: 14.0, max: 17.0, nominal: 15.5, unit: '%' },
        Fe: { max: 10.0, nominal: 8.0, unit: '%' },
        C: { max: 0.15, unit: '%' },
        Mn: { max: 1.0, unit: '%' },
        Si: { max: 0.5, unit: '%' },
        Cu: { max: 0.5, unit: '%' },
        S: { max: 0.015, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { brinell: 150, rockwellB: 79 },
          tensileStrength: { value: 550, unit: 'MPa' },
          yieldStrength: { value: 240, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2850, unit: 'MPa', note: 'Extrapolated from cutting force data' },
            mc: { value: 0.22 },
            tempCoeff: { value: -0.0008, note: 'Slight decrease with temperature' },
            reliability: 'medium',
            source: 'König & Klocke (1997), Chou & Evans (1999)'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 15,
            description: 'Solid-solution alloy - better than precipitation hardened',
            speedFactor: 0.20
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 25, unit: 'm/min' }, finish: { value: 35, unit: 'm/min' } },
            ceramic: { rough: { value: 200, unit: 'm/min' }, finish: { value: 180, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8470, unit: 'kg/m³' },
        meltingRange: { min: 1354, max: 1413, unit: '°C' },
        thermalConductivity: { value: 14.9, unit: 'W/m·K', at: '20°C' },
        thermalConductivity600C: { value: 22.8, unit: 'W/m·K' },
        specificHeat: { value: 444, unit: 'J/kg·K' },
        thermalExpansion: { value: 13.3, unit: 'µm/m·°C', range: '20-100°C' },
        elasticModulus: { value: 214, unit: 'GPa' },
        electricalResistivity: { value: 1030, unit: 'nΩ·m' }
      },
      
      johnsonCook: {
        A: { value: 235, unit: 'MPa' },
        B: { value: 1450, unit: 'MPa' },
        n: { value: 0.62 },
        C: { value: 0.017 },
        m: { value: 1.04 },
        meltingTemp: { value: 1413, unit: '°C' },
        referenceStrainRate: { value: 1.0, unit: 's⁻¹' },
        reliability: 'medium',
        source: 'Sima & Özel (2010)'
      },
      
      thermalProperties: {
        maxServiceTemp: { value: 1095, unit: '°C' },
        oxidationResistance: { rating: 'Excellent', maxTemp: 1150, unit: '°C' },
        carburizationResistance: 'Good',
        sulfidationResistance: 'Moderate'
      },
      
      applications: [
        'Furnace muffles and retorts',
        'Chemical processing equipment',
        'Nuclear engineering',
        'Heat treating baskets',
        'Electronic components'
      ]
    },
    
    'Inconel_601': {
      name: 'Inconel 601',
      uns: 'N06601',
      description: 'Al-bearing Ni-Cr alloy for extreme oxidation resistance',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { min: 58.0, max: 63.0, nominal: 60.5, unit: '%' },
        Cr: { min: 21.0, max: 25.0, nominal: 23.0, unit: '%' },
        Al: { min: 1.0, max: 1.7, nominal: 1.35, unit: '%' },
        Fe: { balance: true },
        C: { max: 0.10, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { brinell: 170, rockwellB: 86 },
          tensileStrength: { value: 620, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          elongation: { value: 40, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2950, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 14,
            speedFactor: 0.18
          }
        }
      },
      
      physical: {
        density: { value: 8110, unit: 'kg/m³' },
        meltingRange: { min: 1301, max: 1368, unit: '°C' },
        thermalConductivity: { value: 11.2, unit: 'W/m·K' },
        elasticModulus: { value: 206, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 270, unit: 'MPa' },
        B: { value: 1520, unit: 'MPa' },
        n: { value: 0.58 },
        C: { value: 0.016 },
        m: { value: 1.05 },
        reliability: 'low'
      },
      
      applications: ['Thermal processing', 'Pollution control', 'Petrochemical furnaces']
    },
    
    'Inconel_617': {
      name: 'Inconel 617',
      uns: 'N06617',
      description: 'Solid-solution alloy with exceptional high-temp strength and oxidation resistance',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { min: 44.5, nominal: 54, unit: '%' },
        Cr: { min: 20.0, max: 24.0, nominal: 22.0, unit: '%' },
        Co: { min: 10.0, max: 15.0, nominal: 12.5, unit: '%' },
        Mo: { min: 8.0, max: 10.0, nominal: 9.0, unit: '%' },
        Al: { min: 0.8, max: 1.5, nominal: 1.15, unit: '%' },
        Ti: { max: 0.6, unit: '%' },
        Fe: { max: 3.0, unit: '%' }
      },
      
      conditions: {
        'Solution Annealed': {
          hardness: { brinell: 175, rockwellB: 89 },
          tensileStrength: { value: 655, unit: 'MPa' },
          yieldStrength: { value: 295, unit: 'MPa' },
          elongation: { value: 55, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3050, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 13,
            description: 'Co content increases difficulty',
            speedFactor: 0.16
          }
        }
      },
      
      physical: {
        density: { value: 8360, unit: 'kg/m³' },
        meltingRange: { min: 1332, max: 1380, unit: '°C' },
        thermalConductivity: { value: 13.4, unit: 'W/m·K' },
        elasticModulus: { value: 211, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 290, unit: 'MPa' },
        B: { value: 1580, unit: 'MPa' },
        n: { value: 0.55 },
        C: { value: 0.018 },
        m: { value: 1.1 },
        reliability: 'low'
      },
      
      applications: ['Gas turbine combustors', 'Ducting', 'VHTR nuclear applications']
    },
    
    'Inconel_625': {
      name: 'Inconel 625',
      uns: 'N06625',
      description: 'Mo/Nb-bearing solid-solution alloy with exceptional strength and corrosion resistance',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { min: 58.0, nominal: 61.0, unit: '%' },
        Cr: { min: 20.0, max: 23.0, nominal: 21.5, unit: '%' },
        Mo: { min: 8.0, max: 10.0, nominal: 9.0, unit: '%' },
        Nb: { min: 3.15, max: 4.15, nominal: 3.65, unit: '%', plusTa: true },
        Fe: { max: 5.0, unit: '%' },
        Ti: { max: 0.4, unit: '%' },
        Al: { max: 0.4, unit: '%' },
        C: { max: 0.10, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { brinell: 175, rockwellB: 93 },
          tensileStrength: { value: 827, unit: 'MPa' },
          yieldStrength: { value: 414, unit: 'MPa' },
          elongation: { value: 50, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3200, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'good',
            source: 'Validated against multiple cutting force studies'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            description: 'Better than 718 due to no precipitation hardening',
            speedFactor: 0.15
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 20, unit: 'm/min' }, finish: { value: 30, unit: 'm/min' } },
            ceramic: { rough: { value: 180, unit: 'm/min' }, finish: { value: 150, unit: 'm/min' } }
          }
        },
        
        'Solution Treated': {
          hardness: { brinell: 190, rockwellC: 22 },
          tensileStrength: { value: 930, unit: 'MPa' },
          yieldStrength: { value: 517, unit: 'MPa' },
          elongation: { value: 42, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3400, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 10,
            speedFactor: 0.12
          }
        }
      },
      
      physical: {
        density: { value: 8440, unit: 'kg/m³' },
        meltingRange: { min: 1290, max: 1350, unit: '°C' },
        thermalConductivity: { value: 9.8, unit: 'W/m·K', at: '20°C' },
        thermalConductivity600C: { value: 17.5, unit: 'W/m·K' },
        specificHeat: { value: 410, unit: 'J/kg·K' },
        thermalExpansion: { value: 12.8, unit: 'µm/m·°C' },
        elasticModulus: { value: 208, unit: 'GPa' },
        electricalResistivity: { value: 1290, unit: 'nΩ·m' }
      },
      
      johnsonCook: {
        A: { value: 410, unit: 'MPa' },
        B: { value: 1680, unit: 'MPa' },
        n: { value: 0.54 },
        C: { value: 0.020 },
        m: { value: 1.08 },
        meltingTemp: { value: 1350, unit: '°C' },
        reliability: 'good',
        source: 'Sima & Özel (2010), validated experimentally'
      },
      
      corrosionResistance: {
        pitting: 'Excellent - PREN > 45',
        crevice: 'Excellent',
        stress_corrosion: 'Excellent in chlorides',
        seawater: 'Excellent',
        acids: 'Excellent in HCl, H2SO4, HF, H3PO4'
      },
      
      applications: [
        'Aerospace exhaust systems',
        'Marine engineering',
        'Chemical processing',
        'Nuclear water reactors',
        'Oil & gas wellhead equipment',
        'Flare stacks'
      ]
    },
    
    'Inconel_718': {
      name: 'Inconel 718',
      uns: 'N07718',
      description: 'Precipitation-hardened Ni-Cr-Fe alloy - most widely used superalloy',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { min: 50.0, max: 55.0, nominal: 52.5, unit: '%' },
        Cr: { min: 17.0, max: 21.0, nominal: 19.0, unit: '%' },
        Fe: { balance: true, nominal: 18.5, unit: '%' },
        Nb: { min: 4.75, max: 5.50, nominal: 5.1, unit: '%', plusTa: true },
        Mo: { min: 2.8, max: 3.3, nominal: 3.05, unit: '%' },
        Ti: { min: 0.65, max: 1.15, nominal: 0.9, unit: '%' },
        Al: { min: 0.2, max: 0.8, nominal: 0.5, unit: '%' },
        Co: { max: 1.0, unit: '%' },
        C: { max: 0.08, unit: '%' },
        B: { max: 0.006, unit: '%' }
      },
      
      strengthening: {
        primary: 'γ″ (Ni3Nb) - BCT structure',
        secondary: 'γ′ (Ni3(Al,Ti)) - FCC structure',
        note: 'γ″ is metastable and transforms to δ-phase above 650°C'
      },
      
      conditions: {
        'Solution Treated': {
          treatment: '954-982°C, 1 hour, air cool or faster',
          hardness: { rockwellC: 30, brinell: 285 },
          tensileStrength: { value: 965, unit: 'MPa' },
          yieldStrength: { value: 550, unit: 'MPa' },
          elongation: { value: 45, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3100, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'good',
            source: 'Chou & Evans (1999), validated'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            description: 'PREFERRED machining condition - before aging',
            speedFactor: 0.15,
            strategy: 'Machine in ST condition, then age'
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 22, unit: 'm/min' }, finish: { value: 32, unit: 'm/min' } },
            ceramic: { rough: { value: 220, unit: 'm/min' }, finish: { value: 180, unit: 'm/min' } },
            cbn: { rough: { value: 250, unit: 'm/min' }, finish: { value: 200, unit: 'm/min' } }
          }
        },
        
        'Aged_Standard': {
          treatment: '718°C/8hr FC to 621°C/8hr AC (AMS 5662/5663)',
          hardness: { rockwellC: 44, brinell: 409 },
          tensileStrength: { value: 1380, unit: 'MPa' },
          yieldStrength: { value: 1170, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4200, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'good',
            note: 'Significantly harder to machine than ST'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 6,
            description: 'Most difficult common superalloy to machine',
            speedFactor: 0.08,
            strategy: 'Ceramic or CBN required for production rates'
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 12, unit: 'm/min' }, finish: { value: 18, unit: 'm/min' } },
            ceramic: { rough: { value: 180, unit: 'm/min' }, finish: { value: 150, unit: 'm/min' } },
            cbn: { rough: { value: 200, unit: 'm/min' }, finish: { value: 180, unit: 'm/min' } }
          }
        },
        
        'Direct_Aged': {
          treatment: 'Direct age from forge without solution treatment',
          hardness: { rockwellC: 40, brinell: 375 },
          tensileStrength: { value: 1275, unit: 'MPa' },
          yieldStrength: { value: 1050, unit: 'MPa' },
          elongation: { value: 18, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3850, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            speedFactor: 0.10
          }
        }
      },
      
      physical: {
        density: { value: 8190, unit: 'kg/m³' },
        meltingRange: { min: 1260, max: 1336, unit: '°C' },
        thermalConductivity: { value: 11.4, unit: 'W/m·K', at: '20°C' },
        thermalConductivity600C: { value: 18.7, unit: 'W/m·K' },
        specificHeat: { value: 435, unit: 'J/kg·K' },
        thermalExpansion: { value: 13.0, unit: 'µm/m·°C', range: '20-100°C' },
        elasticModulus: { value: 211, unit: 'GPa' },
        electricalResistivity: { value: 1250, unit: 'nΩ·m' }
      },
      
      johnsonCook: {
        A: { value: 450, unit: 'MPa', condition: 'Solution Treated' },
        B: { value: 1700, unit: 'MPa' },
        n: { value: 0.65 },
        C: { value: 0.017 },
        m: { value: 1.3 },
        meltingTemp: { value: 1336, unit: '°C' },
        referenceStrainRate: { value: 1.0, unit: 's⁻¹' },
        reliability: 'good',
        source: 'Sima & Özel (2010), Kobayashi & Dodd (1989)',
        
        agedCondition: {
          A: { value: 1180, unit: 'MPa' },
          B: { value: 890, unit: 'MPa' },
          n: { value: 0.45 },
          C: { value: 0.012 },
          m: { value: 1.15 },
          reliability: 'good',
          note: 'Precipitation hardened - reduced work hardening exponent'
        }
      },
      
      temperatureLimits: {
        longTerm: { value: 650, unit: '°C', note: 'δ-phase forms above this' },
        shortTerm: { value: 700, unit: '°C' }
      },
      
      applications: [
        'Gas turbine disks and blades',
        'Rocket motor components',
        'Cryogenic tankage',
        'Nuclear applications',
        'Oil & gas downhole tools',
        'Aerospace structural members'
      ]
    },
    
    'Inconel_706': {
      name: 'Inconel 706',
      uns: 'N09706',
      description: 'Precipitation-hardened alloy similar to 718 but more forgeable',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { min: 39.0, max: 44.0, nominal: 41.5, unit: '%' },
        Cr: { min: 14.5, max: 17.5, nominal: 16.0, unit: '%' },
        Fe: { balance: true },
        Nb: { min: 2.5, max: 3.3, nominal: 2.9, unit: '%' },
        Ti: { min: 1.5, max: 2.0, nominal: 1.75, unit: '%' },
        Al: { max: 0.4, unit: '%' }
      },
      
      conditions: {
        'Solution Treated': {
          hardness: { rockwellC: 28, brinell: 270 },
          tensileStrength: { value: 900, unit: 'MPa' },
          yieldStrength: { value: 520, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2950, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 14,
            speedFactor: 0.17
          }
        },
        
        'Aged': {
          hardness: { rockwellC: 38, brinell: 355 },
          tensileStrength: { value: 1240, unit: 'MPa' },
          yieldStrength: { value: 1035, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3800, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            speedFactor: 0.10
          }
        }
      },
      
      physical: {
        density: { value: 8080, unit: 'kg/m³' },
        meltingRange: { min: 1300, max: 1375, unit: '°C' },
        thermalConductivity: { value: 12.1, unit: 'W/m·K' },
        elasticModulus: { value: 214, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 515, unit: 'MPa' },
        B: { value: 1550, unit: 'MPa' },
        n: { value: 0.58 },
        C: { value: 0.016 },
        m: { value: 1.2 },
        reliability: 'low'
      },
      
      applications: ['Large turbine components', 'Heavy-section forgings']
    },
    
    'Inconel_X750': {
      name: 'Inconel X-750',
      uns: 'N07750',
      description: 'Precipitation-hardened alloy with excellent relaxation resistance',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { min: 70.0, nominal: 73.0, unit: '%' },
        Cr: { min: 14.0, max: 17.0, nominal: 15.5, unit: '%' },
        Fe: { min: 5.0, max: 9.0, nominal: 7.0, unit: '%' },
        Ti: { min: 2.25, max: 2.75, nominal: 2.5, unit: '%' },
        Al: { min: 0.4, max: 1.0, nominal: 0.7, unit: '%' },
        Nb: { min: 0.7, max: 1.2, nominal: 0.95, unit: '%' }
      },
      
      strengthening: {
        primary: 'γ′ (Ni3(Al,Ti))',
        secondary: 'γ″ (Ni3Nb)',
        note: 'Higher Ti than 718 shifts toward γ′ strengthening'
      },
      
      conditions: {
        'Solution Treated': {
          hardness: { rockwellC: 26, brinell: 255 },
          tensileStrength: { value: 860, unit: 'MPa' },
          yieldStrength: { value: 415, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2900, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 13,
            speedFactor: 0.16
          }
        },
        
        'Aged': {
          hardness: { rockwellC: 40, brinell: 375 },
          tensileStrength: { value: 1170, unit: 'MPa' },
          yieldStrength: { value: 780, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3700, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            speedFactor: 0.10
          }
        }
      },
      
      physical: {
        density: { value: 8280, unit: 'kg/m³' },
        meltingRange: { min: 1393, max: 1427, unit: '°C' },
        thermalConductivity: { value: 12.0, unit: 'W/m·K' },
        elasticModulus: { value: 214, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 400, unit: 'MPa' },
        B: { value: 1600, unit: 'MPa' },
        n: { value: 0.60 },
        C: { value: 0.017 },
        m: { value: 1.15 },
        reliability: 'low'
      },
      
      applications: ['Springs', 'Bellows', 'Nuclear reactor internals', 'Gas turbine components']
    },
    
    'Inconel_725': {
      name: 'Inconel 725',
      uns: 'N07725',
      description: 'Age-hardenable version of 625 with improved strength',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { min: 55.0, max: 59.0, nominal: 57.0, unit: '%' },
        Cr: { min: 19.0, max: 22.5, nominal: 20.75, unit: '%' },
        Mo: { min: 7.0, max: 9.5, nominal: 8.25, unit: '%' },
        Nb: { min: 2.75, max: 4.0, nominal: 3.4, unit: '%' },
        Ti: { min: 1.0, max: 1.7, nominal: 1.35, unit: '%' },
        Fe: { balance: true }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellC: 30 },
          tensileStrength: { value: 930, unit: 'MPa' },
          yieldStrength: { value: 550, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3150, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            speedFactor: 0.15
          }
        },
        
        'Aged': {
          hardness: { rockwellC: 42 },
          tensileStrength: { value: 1380, unit: 'MPa' },
          yieldStrength: { value: 1035, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 4000, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 7,
            speedFactor: 0.09
          }
        }
      },
      
      physical: {
        density: { value: 8310, unit: 'kg/m³' },
        meltingRange: { min: 1288, max: 1351, unit: '°C' },
        thermalConductivity: { value: 10.1, unit: 'W/m·K' },
        elasticModulus: { value: 204, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 545, unit: 'MPa' },
        B: { value: 1620, unit: 'MPa' },
        n: { value: 0.52 },
        C: { value: 0.018 },
        m: { value: 1.12 },
        reliability: 'low'
      },
      
      applications: ['Oil & gas sour service', 'High-strength fasteners', 'Subsea equipment']
    },

    
    // ============================================
    // HASTELLOY SERIES (Haynes International)
    // ============================================
    
    'Hastelloy_X': {
      name: 'Hastelloy X',
      uns: 'N06002',
      description: 'Solid-solution alloy with exceptional oxidation resistance and fabricability',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { balance: true, nominal: 47.0, unit: '%' },
        Cr: { min: 20.5, max: 23.0, nominal: 22.0, unit: '%' },
        Fe: { min: 17.0, max: 20.0, nominal: 18.5, unit: '%' },
        Mo: { min: 8.0, max: 10.0, nominal: 9.0, unit: '%' },
        Co: { min: 0.5, max: 2.5, nominal: 1.5, unit: '%' },
        W: { min: 0.2, max: 1.0, nominal: 0.6, unit: '%' }
      },
      
      conditions: {
        'Solution Annealed': {
          hardness: { rockwellB: 92, brinell: 185 },
          tensileStrength: { value: 690, unit: 'MPa' },
          yieldStrength: { value: 310, unit: 'MPa' },
          elongation: { value: 43, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2800, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium',
            source: 'Haynes machining data'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 16,
            description: 'Best machinability among Hastelloys',
            speedFactor: 0.20
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 28, unit: 'm/min' }, finish: { value: 38, unit: 'm/min' } },
            ceramic: { rough: { value: 210, unit: 'm/min' }, finish: { value: 180, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8220, unit: 'kg/m³' },
        meltingRange: { min: 1260, max: 1355, unit: '°C' },
        thermalConductivity: { value: 9.1, unit: 'W/m·K' },
        elasticModulus: { value: 205, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 305, unit: 'MPa' },
        B: { value: 1520, unit: 'MPa' },
        n: { value: 0.58 },
        C: { value: 0.018 },
        m: { value: 1.08 },
        reliability: 'medium'
      },
      
      applications: ['Gas turbine combustors', 'Afterburners', 'Transition ducts', 'Cabin heaters']
    },
    
    'Hastelloy_C276': {
      name: 'Hastelloy C-276',
      uns: 'N10276',
      description: 'Low-carbon Ni-Mo-Cr alloy with outstanding corrosion resistance',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { balance: true, nominal: 57.0, unit: '%' },
        Mo: { min: 15.0, max: 17.0, nominal: 16.0, unit: '%' },
        Cr: { min: 14.5, max: 16.5, nominal: 15.5, unit: '%' },
        Fe: { min: 4.0, max: 7.0, nominal: 5.5, unit: '%' },
        W: { min: 3.0, max: 4.5, nominal: 3.75, unit: '%' },
        Co: { max: 2.5, unit: '%' },
        C: { max: 0.01, unit: '%', note: 'Low C to resist sensitization' }
      },
      
      conditions: {
        'Solution Annealed': {
          hardness: { rockwellB: 90, brinell: 180 },
          tensileStrength: { value: 785, unit: 'MPa' },
          yieldStrength: { value: 355, unit: 'MPa' },
          elongation: { value: 60, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3100, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium',
            note: 'High Mo content increases cutting forces'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 11,
            description: 'Mo makes it gummier than other Hastelloys',
            speedFactor: 0.14
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 18, unit: 'm/min' }, finish: { value: 28, unit: 'm/min' } },
            ceramic: { rough: { value: 180, unit: 'm/min' }, finish: { value: 150, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8890, unit: 'kg/m³' },
        meltingRange: { min: 1323, max: 1371, unit: '°C' },
        thermalConductivity: { value: 10.2, unit: 'W/m·K' },
        elasticModulus: { value: 205, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 350, unit: 'MPa' },
        B: { value: 1650, unit: 'MPa' },
        n: { value: 0.56 },
        C: { value: 0.019 },
        m: { value: 1.10 },
        reliability: 'medium'
      },
      
      corrosionResistance: {
        pitting: 'Exceptional - PREN > 70',
        crevice: 'Excellent',
        oxidizing_acids: 'Excellent',
        reducing_acids: 'Excellent (HCl, H2SO4)',
        chloride_SCC: 'Excellent'
      },
      
      applications: ['Chemical processing', 'Flue gas desulfurization', 'Pollution control', 'Pulp & paper']
    },
    
    'Hastelloy_C22': {
      name: 'Hastelloy C-22',
      uns: 'N06022',
      description: 'Improved C-276 with better weldability and versatility',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { balance: true, nominal: 56.0, unit: '%' },
        Cr: { min: 20.0, max: 22.5, nominal: 21.0, unit: '%' },
        Mo: { min: 12.5, max: 14.5, nominal: 13.5, unit: '%' },
        W: { min: 2.5, max: 3.5, nominal: 3.0, unit: '%' },
        Fe: { min: 2.0, max: 6.0, nominal: 4.0, unit: '%' },
        Co: { max: 2.5, unit: '%' }
      },
      
      conditions: {
        'Solution Annealed': {
          hardness: { rockwellB: 93, brinell: 188 },
          tensileStrength: { value: 785, unit: 'MPa' },
          yieldStrength: { value: 365, unit: 'MPa' },
          elongation: { value: 55, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3050, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            speedFactor: 0.15
          }
        }
      },
      
      physical: {
        density: { value: 8690, unit: 'kg/m³' },
        meltingRange: { min: 1357, max: 1399, unit: '°C' },
        thermalConductivity: { value: 10.1, unit: 'W/m·K' },
        elasticModulus: { value: 206, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 360, unit: 'MPa' },
        B: { value: 1600, unit: 'MPa' },
        n: { value: 0.55 },
        C: { value: 0.018 },
        m: { value: 1.08 },
        reliability: 'low'
      },
      
      applications: ['Chemical process vessels', 'Flue gas scrubbers', 'Incinerators', 'Waste treatment']
    },
    
    'Hastelloy_B2': {
      name: 'Hastelloy B-2',
      uns: 'N10665',
      description: 'Ni-Mo alloy with exceptional resistance to HCl',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { balance: true, nominal: 69.0, unit: '%' },
        Mo: { min: 26.0, max: 30.0, nominal: 28.0, unit: '%' },
        Fe: { max: 2.0, unit: '%' },
        Cr: { max: 1.0, unit: '%' },
        Co: { max: 1.0, unit: '%' }
      },
      
      conditions: {
        'Solution Annealed': {
          hardness: { rockwellB: 95, brinell: 195 },
          tensileStrength: { value: 895, unit: 'MPa' },
          yieldStrength: { value: 380, unit: 'MPa' },
          elongation: { value: 55, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3350, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium',
            note: 'Very high Mo makes this extremely gummy'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            description: 'One of most difficult to machine - high Mo content',
            speedFactor: 0.10
          }
        }
      },
      
      physical: {
        density: { value: 9220, unit: 'kg/m³' },
        meltingRange: { min: 1330, max: 1380, unit: '°C' },
        thermalConductivity: { value: 11.1, unit: 'W/m·K' },
        elasticModulus: { value: 217, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 375, unit: 'MPa' },
        B: { value: 1750, unit: 'MPa' },
        n: { value: 0.58 },
        C: { value: 0.021 },
        m: { value: 1.12 },
        reliability: 'low'
      },
      
      applications: ['HCl acid processing', 'Acetic acid production', 'Vacuum furnaces']
    },
    
    // ============================================
    // WASPALOY (United Technologies)
    // ============================================
    
    'Waspaloy': {
      name: 'Waspaloy',
      uns: 'N07001',
      description: 'Precipitation-hardened alloy for high-temp structural applications',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 58.0, unit: '%' },
        Cr: { min: 18.0, max: 21.0, nominal: 19.5, unit: '%' },
        Co: { min: 12.0, max: 15.0, nominal: 13.5, unit: '%' },
        Mo: { min: 3.5, max: 5.0, nominal: 4.3, unit: '%' },
        Ti: { min: 2.75, max: 3.25, nominal: 3.0, unit: '%' },
        Al: { min: 1.2, max: 1.6, nominal: 1.4, unit: '%' },
        Zr: { max: 0.09, unit: '%' },
        B: { max: 0.006, unit: '%' }
      },
      
      strengthening: {
        primary: 'γ′ (Ni3(Al,Ti))',
        volumeFraction: { value: 25, unit: '%' },
        note: 'High Ti/Al ratio makes γ′ very stable'
      },
      
      conditions: {
        'Solution Treated': {
          treatment: '1010-1040°C, 4 hours, air cool',
          hardness: { rockwellC: 30, brinell: 285 },
          tensileStrength: { value: 1000, unit: 'MPa' },
          yieldStrength: { value: 620, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3200, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 11,
            description: 'Machine in ST condition for best results',
            speedFactor: 0.14
          }
        },
        
        'Aged': {
          treatment: '845°C/4hr AC + 760°C/16hr AC',
          hardness: { rockwellC: 44, brinell: 415 },
          tensileStrength: { value: 1275, unit: 'MPa' },
          yieldStrength: { value: 795, unit: 'MPa' },
          elongation: { value: 25, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4100, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium',
            note: 'Co content increases work hardening'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 6,
            description: 'Very difficult in aged condition',
            speedFactor: 0.08
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 10, unit: 'm/min' }, finish: { value: 15, unit: 'm/min' } },
            ceramic: { rough: { value: 170, unit: 'm/min' }, finish: { value: 140, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8190, unit: 'kg/m³' },
        meltingRange: { min: 1330, max: 1360, unit: '°C' },
        thermalConductivity: { value: 11.7, unit: 'W/m·K' },
        elasticModulus: { value: 212, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 620, unit: 'MPa' },
        B: { value: 1450, unit: 'MPa' },
        n: { value: 0.48 },
        C: { value: 0.015 },
        m: { value: 1.18 },
        reliability: 'medium'
      },
      
      temperatureLimits: {
        longTerm: { value: 870, unit: '°C' },
        shortTerm: { value: 980, unit: '°C' }
      },
      
      applications: ['Gas turbine disks', 'Rings', 'Casings', 'Shafts', 'Fasteners']
    },
    
    // ============================================
    // MONEL SERIES (Special Metals)
    // ============================================
    
    'Monel_400': {
      name: 'Monel 400',
      uns: 'N04400',
      description: 'Solid-solution Ni-Cu alloy with excellent seawater resistance',
      category: 'nickel_superalloys',
      subcategory: 'solid_solution',
      
      composition: {
        Ni: { min: 63.0, nominal: 66.0, unit: '%' },
        Cu: { min: 28.0, max: 34.0, nominal: 31.5, unit: '%' },
        Fe: { max: 2.5, unit: '%' },
        Mn: { max: 2.0, unit: '%' },
        C: { max: 0.3, unit: '%' },
        Si: { max: 0.5, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 70, brinell: 120 },
          tensileStrength: { value: 517, unit: 'MPa' },
          yieldStrength: { value: 172, unit: 'MPa' },
          elongation: { value: 48, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2100, unit: 'MPa' },
            mc: { value: 0.21 },
            reliability: 'good',
            note: 'Relatively easy to machine for Ni alloy'
          },
          
          machinability: {
            rating: 'C',
            percentOfB1112: 30,
            description: 'Best machinability among Ni superalloys',
            speedFactor: 0.40
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 45, unit: 'm/min' }, finish: { value: 60, unit: 'm/min' } },
            hss: { rough: { value: 15, unit: 'm/min' }, finish: { value: 20, unit: 'm/min' } }
          }
        },
        
        'Hot Worked': {
          hardness: { rockwellB: 80, brinell: 145 },
          tensileStrength: { value: 586, unit: 'MPa' },
          yieldStrength: { value: 276, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2350, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'good'
          },
          
          machinability: {
            rating: 'C',
            percentOfB1112: 25,
            speedFactor: 0.35
          }
        }
      },
      
      physical: {
        density: { value: 8800, unit: 'kg/m³' },
        meltingRange: { min: 1299, max: 1349, unit: '°C' },
        thermalConductivity: { value: 21.8, unit: 'W/m·K' },
        elasticModulus: { value: 179, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 170, unit: 'MPa' },
        B: { value: 1200, unit: 'MPa' },
        n: { value: 0.68 },
        C: { value: 0.015 },
        m: { value: 1.0 },
        reliability: 'medium'
      },
      
      applications: ['Marine engineering', 'Chemical processing', 'Valves', 'Pumps', 'Propeller shafts']
    },
    
    'Monel_K500': {
      name: 'Monel K-500',
      uns: 'N05500',
      description: 'Age-hardenable Ni-Cu alloy with enhanced strength',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { min: 63.0, nominal: 65.0, unit: '%' },
        Cu: { min: 27.0, max: 33.0, nominal: 30.0, unit: '%' },
        Al: { min: 2.3, max: 3.15, nominal: 2.7, unit: '%' },
        Ti: { min: 0.35, max: 0.85, nominal: 0.6, unit: '%' },
        Fe: { max: 2.0, unit: '%' }
      },
      
      strengthening: {
        primary: 'γ′ (Ni3(Al,Ti))',
        note: 'Age hardens to much higher strength than Monel 400'
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellB: 82, brinell: 155 },
          tensileStrength: { value: 690, unit: 'MPa' },
          yieldStrength: { value: 310, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2500, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfB1112: 22,
            description: 'Machine before aging when possible',
            speedFactor: 0.28
          }
        },
        
        'Aged': {
          treatment: '593°C/16hr, air cool',
          hardness: { rockwellC: 35, brinell: 320 },
          tensileStrength: { value: 1100, unit: 'MPa' },
          yieldStrength: { value: 790, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3400, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            description: 'Significantly harder to machine after aging',
            speedFactor: 0.15
          }
        }
      },
      
      physical: {
        density: { value: 8440, unit: 'kg/m³' },
        meltingRange: { min: 1315, max: 1349, unit: '°C' },
        thermalConductivity: { value: 17.5, unit: 'W/m·K' },
        elasticModulus: { value: 179, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 305, unit: 'MPa' },
        B: { value: 1380, unit: 'MPa' },
        n: { value: 0.55 },
        C: { value: 0.016 },
        m: { value: 1.05 },
        reliability: 'low'
      },
      
      applications: ['Oil well tools', 'Doctor blades', 'Pump shafts', 'Marine fasteners']
    },

    
    // ============================================
    // RENÉ SERIES (GE/Pratt & Whitney)
    // ============================================
    
    'Rene_41': {
      name: 'René 41',
      uns: 'N07041',
      description: 'Precipitation-hardened alloy for aerospace structural applications',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 55.0, unit: '%' },
        Cr: { min: 18.0, max: 20.0, nominal: 19.0, unit: '%' },
        Co: { min: 10.0, max: 12.0, nominal: 11.0, unit: '%' },
        Mo: { min: 9.0, max: 10.5, nominal: 9.75, unit: '%' },
        Ti: { min: 3.0, max: 3.3, nominal: 3.15, unit: '%' },
        Al: { min: 1.4, max: 1.8, nominal: 1.6, unit: '%' },
        Fe: { max: 5.0, unit: '%' },
        B: { min: 0.003, max: 0.01, unit: '%' }
      },
      
      strengthening: {
        primary: 'γ′ (Ni3(Al,Ti))',
        volumeFraction: { value: 30, unit: '%' },
        note: 'High Mo provides additional solid solution strengthening'
      },
      
      conditions: {
        'Solution Treated': {
          treatment: '1066°C/0.5hr, air cool',
          hardness: { rockwellC: 32, brinell: 300 },
          tensileStrength: { value: 1034, unit: 'MPa' },
          yieldStrength: { value: 620, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3250, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 10,
            speedFactor: 0.12
          }
        },
        
        'Aged': {
          treatment: '760°C/16hr, air cool',
          hardness: { rockwellC: 42, brinell: 388 },
          tensileStrength: { value: 1310, unit: 'MPa' },
          yieldStrength: { value: 965, unit: 'MPa' },
          elongation: { value: 14, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4150, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 5,
            description: 'One of most difficult alloys to machine',
            speedFactor: 0.06
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 8, unit: 'm/min' }, finish: { value: 12, unit: 'm/min' } },
            ceramic: { rough: { value: 160, unit: 'm/min' }, finish: { value: 130, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8250, unit: 'kg/m³' },
        meltingRange: { min: 1315, max: 1370, unit: '°C' },
        thermalConductivity: { value: 10.9, unit: 'W/m·K' },
        elasticModulus: { value: 219, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 620, unit: 'MPa' },
        B: { value: 1400, unit: 'MPa' },
        n: { value: 0.44 },
        C: { value: 0.014 },
        m: { value: 1.20 },
        reliability: 'medium'
      },
      
      temperatureLimits: {
        longTerm: { value: 870, unit: '°C' },
        shortTerm: { value: 980, unit: '°C' }
      },
      
      applications: ['Turbine blades', 'Wheels', 'Spacers', 'Afterburner parts', 'Fasteners']
    },
    
    'Rene_80': {
      name: 'René 80',
      description: 'Cast superalloy for turbine blades',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 60.0, unit: '%' },
        Cr: { nominal: 14.0, unit: '%' },
        Co: { nominal: 9.5, unit: '%' },
        Ti: { nominal: 5.0, unit: '%' },
        Mo: { nominal: 4.0, unit: '%' },
        W: { nominal: 4.0, unit: '%' },
        Al: { nominal: 3.0, unit: '%' },
        Zr: { nominal: 0.03, unit: '%' },
        C: { nominal: 0.17, unit: '%' },
        B: { nominal: 0.015, unit: '%' }
      },
      
      conditions: {
        'As Cast + HT': {
          hardness: { rockwellC: 40, brinell: 375 },
          tensileStrength: { value: 1200, unit: 'MPa' },
          yieldStrength: { value: 950, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3900, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 5,
            description: 'Cast structure + high strength = very difficult',
            speedFactor: 0.06
          }
        }
      },
      
      physical: {
        density: { value: 8160, unit: 'kg/m³' },
        meltingRange: { min: 1290, max: 1345, unit: '°C' },
        thermalConductivity: { value: 9.5, unit: 'W/m·K' },
        elasticModulus: { value: 218, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 945, unit: 'MPa' },
        B: { value: 1100, unit: 'MPa' },
        n: { value: 0.38 },
        C: { value: 0.012 },
        m: { value: 1.25 },
        reliability: 'low'
      },
      
      applications: ['Turbine blades', 'Guide vanes', 'High-temp castings']
    },
    
    'Rene_95': {
      name: 'René 95',
      description: 'P/M processed superalloy with exceptional high-temp strength',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      processingNote: 'Often P/M (powder metallurgy) processed for uniform microstructure',
      
      composition: {
        Ni: { balance: true, nominal: 61.0, unit: '%' },
        Cr: { nominal: 14.0, unit: '%' },
        Co: { nominal: 8.0, unit: '%' },
        Mo: { nominal: 3.5, unit: '%' },
        W: { nominal: 3.5, unit: '%' },
        Ti: { nominal: 2.5, unit: '%' },
        Al: { nominal: 3.5, unit: '%' },
        Nb: { nominal: 3.5, unit: '%' },
        Zr: { nominal: 0.05, unit: '%' },
        C: { nominal: 0.065, unit: '%' },
        B: { nominal: 0.01, unit: '%' }
      },
      
      conditions: {
        'Aged': {
          hardness: { rockwellC: 46, brinell: 430 },
          tensileStrength: { value: 1520, unit: 'MPa' },
          yieldStrength: { value: 1200, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4450, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 4,
            description: 'MOST DIFFICULT COMMON SUPERALLOY',
            speedFactor: 0.05,
            strategy: 'CBN or ceramic ONLY'
          },
          
          recommendedSpeeds: {
            carbide: { rough: { value: 6, unit: 'm/min', note: 'Not recommended' } },
            ceramic: { rough: { value: 150, unit: 'm/min' }, finish: { value: 120, unit: 'm/min' } },
            cbn: { rough: { value: 180, unit: 'm/min' }, finish: { value: 150, unit: 'm/min' } }
          }
        }
      },
      
      physical: {
        density: { value: 8240, unit: 'kg/m³' },
        meltingRange: { min: 1280, max: 1340, unit: '°C' },
        thermalConductivity: { value: 9.0, unit: 'W/m·K' },
        elasticModulus: { value: 222, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 1195, unit: 'MPa' },
        B: { value: 950, unit: 'MPa' },
        n: { value: 0.32 },
        C: { value: 0.010 },
        m: { value: 1.30 },
        reliability: 'low',
        note: 'Very limited plastic flow before fracture'
      },
      
      applications: ['Advanced turbine disks', 'Compressor disks', 'Turbine seals']
    },
    
    // ============================================
    // NIMONIC SERIES (Special Metals UK)
    // ============================================
    
    'Nimonic_80A': {
      name: 'Nimonic 80A',
      uns: 'N07080',
      description: 'Original precipitation-hardened superalloy',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 76.0, unit: '%' },
        Cr: { min: 18.0, max: 21.0, nominal: 19.5, unit: '%' },
        Ti: { min: 1.8, max: 2.7, nominal: 2.25, unit: '%' },
        Al: { min: 1.0, max: 1.8, nominal: 1.4, unit: '%' },
        Fe: { max: 3.0, unit: '%' },
        Co: { max: 2.0, unit: '%' }
      },
      
      conditions: {
        'Solution Treated': {
          hardness: { rockwellC: 25, brinell: 250 },
          tensileStrength: { value: 860, unit: 'MPa' },
          yieldStrength: { value: 450, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 2850, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 14,
            speedFactor: 0.18
          }
        },
        
        'Aged': {
          treatment: '705°C/16hr, air cool',
          hardness: { rockwellC: 35, brinell: 325 },
          tensileStrength: { value: 1100, unit: 'MPa' },
          yieldStrength: { value: 690, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3550, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 9,
            speedFactor: 0.11
          }
        }
      },
      
      physical: {
        density: { value: 8190, unit: 'kg/m³' },
        meltingRange: { min: 1320, max: 1365, unit: '°C' },
        thermalConductivity: { value: 11.2, unit: 'W/m·K' },
        elasticModulus: { value: 222, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 445, unit: 'MPa' },
        B: { value: 1500, unit: 'MPa' },
        n: { value: 0.58 },
        C: { value: 0.016 },
        m: { value: 1.12 },
        reliability: 'low'
      },
      
      applications: ['Exhaust valves', 'Turbine blades (low temp)', 'Bolts', 'Afterburner sheets']
    },
    
    'Nimonic_90': {
      name: 'Nimonic 90',
      uns: 'N07090',
      description: 'Higher strength version of 80A with Co addition',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 59.0, unit: '%' },
        Cr: { min: 18.0, max: 21.0, nominal: 19.5, unit: '%' },
        Co: { min: 15.0, max: 21.0, nominal: 18.0, unit: '%' },
        Ti: { min: 2.0, max: 3.0, nominal: 2.5, unit: '%' },
        Al: { min: 1.0, max: 2.0, nominal: 1.5, unit: '%' }
      },
      
      conditions: {
        'Aged': {
          hardness: { rockwellC: 38, brinell: 350 },
          tensileStrength: { value: 1175, unit: 'MPa' },
          yieldStrength: { value: 800, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3700, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            speedFactor: 0.10
          }
        }
      },
      
      physical: {
        density: { value: 8180, unit: 'kg/m³' },
        meltingRange: { min: 1310, max: 1365, unit: '°C' },
        thermalConductivity: { value: 10.5, unit: 'W/m·K' },
        elasticModulus: { value: 224, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 795, unit: 'MPa' },
        B: { value: 1200, unit: 'MPa' },
        n: { value: 0.45 },
        C: { value: 0.014 },
        m: { value: 1.18 },
        reliability: 'low'
      },
      
      applications: ['Turbine blades', 'Discs', 'Ring sections', 'Bolts', 'High-temp springs']
    },
    
    // ============================================
    // UDIMET SERIES (Special Metals)
    // ============================================
    
    'Udimet_500': {
      name: 'Udimet 500',
      uns: 'N07500',
      description: 'Workhorse turbine blade alloy',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 54.0, unit: '%' },
        Cr: { nominal: 18.0, unit: '%' },
        Co: { nominal: 18.5, unit: '%' },
        Mo: { nominal: 4.0, unit: '%' },
        Ti: { nominal: 2.9, unit: '%' },
        Al: { nominal: 2.9, unit: '%' },
        B: { nominal: 0.006, unit: '%' },
        Zr: { nominal: 0.05, unit: '%' }
      },
      
      conditions: {
        'Aged': {
          hardness: { rockwellC: 40, brinell: 375 },
          tensileStrength: { value: 1240, unit: 'MPa' },
          yieldStrength: { value: 860, unit: 'MPa' },
          
          kienzle: {
            kc1_1: { value: 3850, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 7,
            speedFactor: 0.09
          }
        }
      },
      
      physical: {
        density: { value: 8020, unit: 'kg/m³' },
        meltingRange: { min: 1295, max: 1355, unit: '°C' },
        thermalConductivity: { value: 11.5, unit: 'W/m·K' },
        elasticModulus: { value: 213, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 855, unit: 'MPa' },
        B: { value: 1150, unit: 'MPa' },
        n: { value: 0.42 },
        C: { value: 0.013 },
        m: { value: 1.20 },
        reliability: 'low'
      },
      
      applications: ['Turbine blades', 'Vanes', 'Discs', 'Rings']
    },
    
    'Udimet_720': {
      name: 'Udimet 720 / 720Li',
      description: 'High-strength disk alloy',
      category: 'nickel_superalloys',
      subcategory: 'precipitation_hardened',
      
      composition: {
        Ni: { balance: true, nominal: 57.0, unit: '%' },
        Cr: { nominal: 16.0, unit: '%' },
        Co: { nominal: 15.0, unit: '%' },
        Ti: { nominal: 5.0, unit: '%' },
        Mo: { nominal: 3.0, unit: '%' },
        W: { nominal: 1.25, unit: '%' },
        Al: { nominal: 2.5, unit: '%' },
        C: { nominal: 0.025, unit: '%' },
        B: { nominal: 0.018, unit: '%' },
        Zr: { nominal: 0.04, unit: '%' }
      },
      
      conditions: {
        'Aged': {
          hardness: { rockwellC: 45, brinell: 420 },
          tensileStrength: { value: 1450, unit: 'MPa' },
          yieldStrength: { value: 1150, unit: 'MPa' },
          elongation: { value: 11, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4300, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 4,
            description: 'Extremely difficult - advanced tooling required',
            speedFactor: 0.05
          }
        }
      },
      
      physical: {
        density: { value: 8080, unit: 'kg/m³' },
        meltingRange: { min: 1260, max: 1320, unit: '°C' },
        thermalConductivity: { value: 10.1, unit: 'W/m·K' },
        elasticModulus: { value: 220, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 1145, unit: 'MPa' },
        B: { value: 980, unit: 'MPa' },
        n: { value: 0.34 },
        C: { value: 0.010 },
        m: { value: 1.28 },
        reliability: 'low'
      },
      
      applications: ['High-performance turbine disks', 'Compressor disks', 'Spacers']
    }
    
  }, // End of materials object
  
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
  
  getJohnsonCook: function(materialId, condition) {
    const material = this.getMaterial(materialId);
    if (!material) return null;
    
    if (condition && material.johnsonCook?.[condition + 'Condition']) {
      return material.johnsonCook[condition + 'Condition'];
    }
    return material.johnsonCook || null;
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
  
  getSolidSolutionAlloys: function() {
    return this.searchBySubcategory('solid_solution');
  },
  
  getPrecipitationHardenedAlloys: function() {
    return this.searchBySubcategory('precipitation_hardened');
  },
  
  searchByMachinability: function(minRating, maxRating) {
    const results = [];
    for (const id in this.materials) {
      const material = this.materials[id];
      for (const cond in material.conditions) {
        const rating = material.conditions[cond].machinability?.percentOfB1112;
        if (rating !== undefined && rating >= minRating && rating <= maxRating) {
          results.push({
            id: id,
            name: material.name,
            condition: cond,
            machinabilityRating: rating,
            speedFactor: material.conditions[cond].machinability?.speedFactor
          });
        }
      }
    }
    return results.sort((a, b) => b.machinabilityRating - a.machinabilityRating);
  },
  
  getRecommendedTooling: function(materialId, condition, operation) {
    const material = this.getMaterial(materialId);
    if (!material || !material.conditions) return this.machiningFundamentals.toolSelection;
    
    const cond = condition || Object.keys(material.conditions)[0];
    const speeds = material.conditions[cond]?.recommendedSpeeds;
    
    return {
      generalGuidance: this.machiningFundamentals.toolSelection,
      specificSpeeds: speeds || null,
      machinability: material.conditions[cond]?.machinability
    };
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
  }

};

// Export for use in PRISM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC;
}

if (typeof window !== 'undefined') {
  window.PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC = PRISM_NICKEL_SUPERALLOYS_SCIENTIFIC;
}
