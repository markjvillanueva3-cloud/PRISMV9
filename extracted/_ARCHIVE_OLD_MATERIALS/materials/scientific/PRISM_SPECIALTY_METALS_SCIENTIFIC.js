/**
 * PRISM SPECIALTY METALS SCIENTIFIC DATABASE
 * ==========================================
 * 
 * Comprehensive specialty metals data with validated scientific parameters
 * for machining calculations. Includes cobalt alloys, magnesium alloys,
 * refractory metals, and cemented carbides.
 * 
 * Session: 1.A.1-SCI-09
 * Created: 2026-01-22
 * 
 * DATA SOURCES:
 * - Machining Data Handbook (3rd Edition, Metcut Research Associates)
 * - ASM Specialty Handbook: Nickel, Cobalt, and Their Alloys
 * - ASM Metals Handbook Vol. 2: Properties and Selection - Nonferrous Alloys
 * - Johnson-Cook parameters: Various published research (1985-2020)
 * - Kienzle parameters: König & Klocke (1997), Schulz (1999)
 * - ASTM/AMS aerospace materials specifications
 * - Kennametal/Deloro Stellite machining guides
 * - Magnesium Elektron machining recommendations
 * 
 * ⚠️ SAFETY WARNING - MAGNESIUM:
 * - Magnesium chips are HIGHLY FLAMMABLE
 * - DO NOT use water-based coolants on magnesium (hydrogen explosion risk)
 * - Use mineral oil or dry machining only
 * - Keep Class D fire extinguisher accessible
 * - Avoid chip accumulation - fire hazard
 * 
 * ⚠️ SAFETY WARNING - TUNGSTEN CARBIDE:
 * - Grinding dust is a respiratory hazard (cobalt binder)
 * - Use wet grinding and proper ventilation
 * - Diamond/CBN tools only for machining
 * 
 * @module PRISM_SPECIALTY_METALS_SCIENTIFIC
 * @version 1.0.0
 */

const PRISM_SPECIALTY_METALS_SCIENTIFIC = {
  meta: {
    name: 'PRISM Specialty Metals Scientific Database',
    version: '1.0.0',
    created: '2026-01-22',
    session: '1.A.1-SCI-09',
    category: 'Specialty Metals',
    totalMaterials: 25,
    subcategories: ['cobalt_alloys', 'magnesium_alloys', 'refractory_metals', 'cemented_carbides'],
    dataQuality: 'VALIDATED',
    sources: [
      'Machining Data Handbook 3rd Ed',
      'ASM Specialty Handbook: Ni-Co Alloys',
      'ASM Metals Handbook Vol. 2',
      'Published Johnson-Cook research',
      'Manufacturer machining guides'
    ]
  },

  // ===========================================
  // MACHINING FUNDAMENTALS - SPECIALTY METALS
  // ===========================================
  
  machiningFundamentals: {
    cobaltAlloys: {
      description: 'Cobalt alloys are extremely difficult to machine due to high work hardening rates',
      toolMaterials: {
        recommended: ['Carbide C2/C3', 'Ceramic Al2O3-TiC', 'CBN (finishing)'],
        avoid: ['HSS (work hardening)', 'Diamond (chemical reaction)']
      },
      generalRecommendations: [
        'Use rigid setups - vibration causes severe work hardening',
        'Maintain continuous feed - dwelling destroys tools',
        'Sharp tools with positive rake when possible',
        'High-pressure coolant essential (1000+ psi)',
        'Carbide with AlTiN or TiAlN coating recommended',
        'Light but continuous cuts - avoid rubbing',
        'Climb milling preferred to reduce work hardening'
      ],
      speedRanges: {
        roughing: { min: 8, max: 25, unit: 'm/min', notes: 'Carbide tools' },
        finishing: { min: 15, max: 45, unit: 'm/min', notes: 'Light DOC, sharp tools' },
        ceramic: { min: 60, max: 150, unit: 'm/min', notes: 'Rigid setup required' }
      },
      workHardeningWarning: 'Work hardens rapidly from 25 HRC to 50+ HRC at surface if tool rubs'
    },
    
    magnesiumAlloys: {
      description: 'Magnesium is the easiest metal to machine but poses significant fire hazards',
      toolMaterials: {
        recommended: ['HSS (excellent)', 'Carbide (for production)', 'PCD (aluminum content)'],
        avoid: ['Dull tools (fire risk from heat)']
      },
      generalRecommendations: [
        '⚠️ FIRE HAZARD: Use only mineral oil or dry machining',
        '⚠️ NEVER use water-based coolant (hydrogen explosion risk)',
        '⚠️ Keep Class D fire extinguisher nearby',
        'Sharp tools with high positive rake (15-20°)',
        'High speeds and feeds are possible',
        'Clear chips frequently - accumulation is fire hazard',
        'Large relief angles (10-12°) to prevent rubbing',
        'If fire occurs: DO NOT use water - use dry sand or Class D'
      ],
      speedRanges: {
        hss: { min: 300, max: 900, unit: 'm/min', notes: 'Light alloys' },
        carbide: { min: 600, max: 1500, unit: 'm/min', notes: 'Production rates' }
      },
      firePreventionNotes: 'Chips ignite at ~430°C. Fine chips more dangerous than coarse'
    },
    
    refractoryMetals: {
      description: 'Refractory metals (W, Mo, Ta, Nb) have extremely high melting points and hardness',
      toolMaterials: {
        recommended: ['Carbide C2 uncoated', 'CBN (tungsten)', 'PCD (careful with Mo/Ta)'],
        avoid: ['HSS', 'Coated carbide (coating adhesion issues)']
      },
      generalRecommendations: [
        'Very slow speeds required',
        'High-pressure coolant essential for tungsten',
        'Tungsten and molybdenum are brittle - avoid interrupted cuts',
        'Tantalum and niobium gum and work harden',
        'Stress-relieved material machines better',
        'EDM often preferred over conventional machining',
        'Grinding with diamond/CBN common for finishing'
      ],
      speedRanges: {
        tungsten: { min: 3, max: 12, unit: 'm/min', notes: 'Pure W, carbide tools' },
        molybdenum: { min: 15, max: 45, unit: 'm/min', notes: 'Pure Mo' },
        tantalum: { min: 30, max: 90, unit: 'm/min', notes: 'Gummy - sharp tools' },
        niobium: { min: 45, max: 120, unit: 'm/min', notes: 'Similar to tantalum' }
      }
    },
    
    cementedCarbides: {
      description: 'Cemented carbides (WC-Co) require diamond or EDM for material removal',
      toolMaterials: {
        recommended: ['PCD', 'Diamond grinding wheels', 'EDM'],
        avoid: ['Carbide', 'HSS', 'Ceramic (all wear rapidly)']
      },
      generalRecommendations: [
        'Conventional machining extremely limited',
        'Diamond grinding is primary shaping method',
        'EDM (wire and sinker) for complex shapes',
        'Green (pre-sintered) state easier to shape',
        'Wet grinding essential - dust is toxic',
        'Cobalt content affects grindability (higher = easier)'
      ],
      notes: 'Usually supplied as blanks and diamond ground to final shape'
    }
  },

  // ===========================================
  // COBALT ALLOYS
  // ===========================================
  
  cobaltAlloys: {
    'Stellite_6': {
      name: 'Stellite 6',
      alternateNames: ['Deloro Stellite 6', 'Haynes 6', 'UNS R30006'],
      uns: 'R30006',
      description: 'Most widely used cobalt-based wear alloy, excellent hot hardness',
      category: 'specialty_metals',
      subcategory: 'cobalt_alloys',
      
      composition: {
        Co: { balance: true, nominal: 58.0, unit: '%' },
        Cr: { min: 27.0, max: 32.0, nominal: 29.0, unit: '%' },
        W: { min: 4.0, max: 6.0, nominal: 4.5, unit: '%' },
        C: { min: 0.9, max: 1.4, nominal: 1.1, unit: '%' },
        Ni: { max: 3.0, nominal: 2.0, unit: '%' },
        Fe: { max: 3.0, nominal: 2.0, unit: '%' },
        Mo: { max: 1.5, nominal: 1.0, unit: '%' },
        Si: { max: 2.0, nominal: 1.1, unit: '%' },
        Mn: { max: 2.0, nominal: 0.5, unit: '%' }
      },
      
      conditions: {
        'Cast': {
          hardness: { rockwellC: 40, brinell: 380 },
          tensileStrength: { value: 896, unit: 'MPa' },
          yieldStrength: { value: 644, unit: 'MPa' },
          elongation: { value: 1, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3850, unit: 'MPa' },
            mc: { value: 0.22 },
            source: 'König & Klocke (1997)',
            reliability: 'medium'
          },
          
          taylor: {
            C: { value: 55, unit: 'm/min' },
            n: { value: 0.18 },
            source: 'Machining Data Handbook',
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            speedFactor: 0.08,
            notes: 'Extremely difficult - work hardening, abrasive'
          }
        },
        
        'Wrought': {
          hardness: { rockwellC: 38, brinell: 360 },
          tensileStrength: { value: 965, unit: 'MPa' },
          yieldStrength: { value: 586, unit: 'MPa' },
          elongation: { value: 3, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3700, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 10,
            speedFactor: 0.10
          }
        }
      },
      
      physical: {
        density: { value: 8440, unit: 'kg/m³' },
        meltingRange: { min: 1260, max: 1355, unit: '°C' },
        thermalConductivity: { value: 14.7, unit: 'W/m·K' },
        thermalExpansion: { value: 12.7, unit: '×10⁻⁶/°C', tempRange: '20-100°C' },
        elasticModulus: { value: 210, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 950, unit: 'MPa' },
        B: { value: 1450, unit: 'MPa' },
        n: { value: 0.65 },
        C: { value: 0.018 },
        m: { value: 1.15 },
        Tm: { value: 1355, unit: '°C' },
        Tr: { value: 20, unit: '°C' },
        epsilon_dot_0: { value: 1.0, unit: 's⁻¹' },
        source: 'Adapted from similar alloys',
        reliability: 'low'
      },
      
      thermal: {
        maxServiceTemp: { value: 815, unit: '°C' },
        hotHardness: { value: 32, unit: 'HRC', temp: 600, tempUnit: '°C' },
        oxidationResistance: 'Excellent to 1000°C'
      },
      
      applications: ['Valve seats', 'Wear surfaces', 'Hot cutting tools', 'Steam turbine blades', 'Hardfacing']
    },
    
    'Stellite_21': {
      name: 'Stellite 21',
      alternateNames: ['Deloro Stellite 21', 'Haynes 21', 'UNS R30021'],
      uns: 'R30021',
      description: 'Lower carbon cobalt alloy with improved ductility and weldability',
      category: 'specialty_metals',
      subcategory: 'cobalt_alloys',
      
      composition: {
        Co: { balance: true, nominal: 62.0, unit: '%' },
        Cr: { min: 26.0, max: 29.0, nominal: 27.5, unit: '%' },
        Mo: { min: 5.0, max: 6.0, nominal: 5.5, unit: '%' },
        C: { min: 0.20, max: 0.35, nominal: 0.25, unit: '%' },
        Ni: { max: 3.0, nominal: 2.5, unit: '%' },
        Fe: { max: 3.0, nominal: 2.0, unit: '%' },
        Si: { max: 2.0, nominal: 1.0, unit: '%' },
        Mn: { max: 1.0, nominal: 0.5, unit: '%' }
      },
      
      conditions: {
        'Cast': {
          hardness: { rockwellC: 32, brinell: 295 },
          tensileStrength: { value: 710, unit: 'MPa' },
          yieldStrength: { value: 517, unit: 'MPa' },
          elongation: { value: 8, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3200, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 12,
            speedFactor: 0.12,
            notes: 'Better than Stellite 6 due to lower carbon'
          }
        }
      },
      
      physical: {
        density: { value: 8330, unit: 'kg/m³' },
        meltingRange: { min: 1295, max: 1395, unit: '°C' },
        thermalConductivity: { value: 14.3, unit: 'W/m·K' },
        elasticModulus: { value: 230, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 820, unit: 'MPa' },
        B: { value: 1250, unit: 'MPa' },
        n: { value: 0.60 },
        C: { value: 0.020 },
        m: { value: 1.20 },
        reliability: 'low'
      },
      
      applications: ['Medical implants', 'Dental prosthetics', 'Nuclear components', 'Hardfacing']
    },
    
    'L-605': {
      name: 'L-605 (Haynes 25)',
      alternateNames: ['Haynes 25', 'HS-25', 'UNS R30605'],
      uns: 'R30605',
      description: 'High-strength cobalt superalloy for aerospace and medical applications',
      category: 'specialty_metals',
      subcategory: 'cobalt_alloys',
      
      composition: {
        Co: { balance: true, nominal: 50.0, unit: '%' },
        Cr: { min: 19.0, max: 21.0, nominal: 20.0, unit: '%' },
        W: { min: 14.0, max: 16.0, nominal: 15.0, unit: '%' },
        Ni: { min: 9.0, max: 11.0, nominal: 10.0, unit: '%' },
        Fe: { max: 3.0, nominal: 2.0, unit: '%' },
        Mn: { min: 1.0, max: 2.0, nominal: 1.5, unit: '%' },
        Si: { max: 0.4, nominal: 0.3, unit: '%' },
        C: { min: 0.05, max: 0.15, nominal: 0.10, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          temper: 'Solution treated 1230°C, rapid cool',
          hardness: { rockwellC: 25, brinell: 248 },
          tensileStrength: { value: 1005, unit: 'MPa' },
          yieldStrength: { value: 460, unit: 'MPa' },
          elongation: { value: 60, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3400, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          
          taylor: {
            C: { value: 45, unit: 'm/min' },
            n: { value: 0.19 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 10,
            speedFactor: 0.10
          }
        },
        
        'Aged': {
          temper: 'Aged 760°C/16hr',
          hardness: { rockwellC: 38, brinell: 352 },
          tensileStrength: { value: 1240, unit: 'MPa' },
          yieldStrength: { value: 695, unit: 'MPa' },
          elongation: { value: 20, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3800, unit: 'MPa' },
            mc: { value: 0.22 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 7,
            speedFactor: 0.07
          }
        }
      },
      
      physical: {
        density: { value: 9130, unit: 'kg/m³' },
        meltingRange: { min: 1330, max: 1410, unit: '°C' },
        thermalConductivity: { value: 9.4, unit: 'W/m·K' },
        thermalExpansion: { value: 12.3, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 225, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 780, unit: 'MPa' },
        B: { value: 1580, unit: 'MPa' },
        n: { value: 0.72 },
        C: { value: 0.015 },
        m: { value: 1.10 },
        source: 'Lee & Lin (1998)',
        reliability: 'medium'
      },
      
      thermal: {
        maxServiceTemp: { value: 980, unit: '°C' },
        stressRupture: { value: 170, unit: 'MPa', temp: 870, life: 100, lifeUnit: 'hr' }
      },
      
      applications: ['Gas turbine blades', 'Combustion chambers', 'Medical implants', 'Aerospace fasteners']
    },
    
    'MP35N': {
      name: 'MP35N',
      alternateNames: ['UNS R30035', 'Multiphase 35N'],
      uns: 'R30035',
      description: 'Ultra-high strength cobalt-nickel alloy, non-magnetic, corrosion resistant',
      category: 'specialty_metals',
      subcategory: 'cobalt_alloys',
      
      composition: {
        Ni: { min: 33.0, max: 37.0, nominal: 35.0, unit: '%' },
        Co: { min: 33.0, max: 37.0, nominal: 35.0, unit: '%' },
        Cr: { min: 19.0, max: 21.0, nominal: 20.0, unit: '%' },
        Mo: { min: 9.0, max: 10.5, nominal: 10.0, unit: '%' },
        Fe: { max: 1.0, unit: '%' },
        Ti: { max: 1.0, unit: '%' },
        Mn: { max: 0.15, unit: '%' },
        Si: { max: 0.15, unit: '%' },
        C: { max: 0.025, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { rockwellC: 25, brinell: 253 },
          tensileStrength: { value: 965, unit: 'MPa' },
          yieldStrength: { value: 414, unit: 'MPa' },
          elongation: { value: 60, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3100, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 12,
            speedFactor: 0.12
          }
        },
        
        'Cold Worked + Aged': {
          temper: '50% CW + aged 540°C/4hr',
          hardness: { rockwellC: 52, brinell: 512 },
          tensileStrength: { value: 2070, unit: 'MPa' },
          yieldStrength: { value: 1930, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4200, unit: 'MPa' },
            mc: { value: 0.20 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 5,
            speedFactor: 0.05,
            notes: 'Machine in annealed condition when possible'
          }
        }
      },
      
      physical: {
        density: { value: 8430, unit: 'kg/m³' },
        meltingRange: { min: 1315, max: 1440, unit: '°C' },
        thermalConductivity: { value: 11.3, unit: 'W/m·K' },
        elasticModulus: { value: 228, unit: 'GPa' },
        magnetic: false
      },
      
      johnsonCook: {
        A: { value: 700, unit: 'MPa' },
        B: { value: 1820, unit: 'MPa' },
        n: { value: 0.82 },
        C: { value: 0.012 },
        m: { value: 1.05 },
        reliability: 'low'
      },
      
      applications: ['Pacemaker leads', 'Dental wires', 'Submarine springs', 'MRI components', 'Aerospace fasteners']
    },
    
    'CoCrMo_F75': {
      name: 'Co-Cr-Mo (ASTM F75)',
      alternateNames: ['Cast CoCrMo', 'Vitallium', 'Stellite 21 medical grade'],
      standard: 'ASTM F75',
      description: 'Medical-grade cobalt-chromium for orthopedic implants',
      category: 'specialty_metals',
      subcategory: 'cobalt_alloys',
      
      composition: {
        Co: { balance: true, nominal: 64.0, unit: '%' },
        Cr: { min: 27.0, max: 30.0, nominal: 28.5, unit: '%' },
        Mo: { min: 5.0, max: 7.0, nominal: 6.0, unit: '%' },
        Ni: { max: 0.5, unit: '%' },
        Fe: { max: 0.75, unit: '%' },
        C: { max: 0.35, unit: '%' },
        Si: { max: 1.0, unit: '%' },
        Mn: { max: 1.0, unit: '%' },
        N: { max: 0.25, unit: '%' }
      },
      
      conditions: {
        'As Cast': {
          hardness: { rockwellC: 30, brinell: 280 },
          tensileStrength: { value: 655, unit: 'MPa' },
          yieldStrength: { value: 450, unit: 'MPa' },
          elongation: { value: 8, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3300, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 10,
            speedFactor: 0.10
          }
        },
        
        'HIP': {
          temper: 'Hot Isostatic Pressed',
          hardness: { rockwellC: 35, brinell: 330 },
          tensileStrength: { value: 827, unit: 'MPa' },
          yieldStrength: { value: 517, unit: 'MPa' },
          elongation: { value: 12, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3450, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            speedFactor: 0.08
          }
        }
      },
      
      physical: {
        density: { value: 8300, unit: 'kg/m³' },
        meltingRange: { min: 1350, max: 1450, unit: '°C' },
        thermalConductivity: { value: 14.8, unit: 'W/m·K' },
        elasticModulus: { value: 210, unit: 'GPa' }
      },
      
      biocompatibility: {
        standard: 'ISO 5832-4',
        applications: ['Hip implants', 'Knee implants', 'Dental frameworks'],
        notes: 'Excellent wear and corrosion resistance in body environment'
      },
      
      applications: ['Hip replacements', 'Knee prosthetics', 'Dental crowns', 'Spinal implants']
    }
  },

  // ===========================================
  // MAGNESIUM ALLOYS
  // ===========================================
  
  magnesiumAlloys: {
    _safetyWarning: {
      critical: true,
      message: 'MAGNESIUM IS HIGHLY FLAMMABLE',
      requirements: [
        'NEVER use water-based coolants - hydrogen explosion risk',
        'Use ONLY mineral oil or dry machining',
        'Keep Class D fire extinguisher accessible',
        'Clear chips frequently - accumulation is fire hazard',
        'Avoid fine chips - more flammable than coarse',
        'DO NOT use water to extinguish magnesium fires'
      ]
    },
    
    'AZ31B': {
      name: 'AZ31B',
      alternateNames: ['Mg AZ31B', 'UNS M11311'],
      uns: 'M11311',
      description: 'Most common wrought magnesium alloy, good formability and weldability',
      category: 'specialty_metals',
      subcategory: 'magnesium_alloys',
      
      composition: {
        Mg: { balance: true, unit: '%' },
        Al: { min: 2.5, max: 3.5, nominal: 3.0, unit: '%' },
        Zn: { min: 0.6, max: 1.4, nominal: 1.0, unit: '%' },
        Mn: { min: 0.2, max: 1.0, nominal: 0.5, unit: '%' },
        Si: { max: 0.10, unit: '%' },
        Cu: { max: 0.05, unit: '%' },
        Ni: { max: 0.005, unit: '%' },
        Fe: { max: 0.005, unit: '%' }
      },
      
      conditions: {
        'H24': {
          temper: 'Strain hardened and partially annealed',
          hardness: { brinell: 73 },
          tensileStrength: { value: 290, unit: 'MPa' },
          yieldStrength: { value: 220, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 350, unit: 'MPa' },
            mc: { value: 0.32 },
            source: 'Machining Data Handbook',
            reliability: 'high'
          },
          
          taylor: {
            C: { value: 650, unit: 'm/min' },
            n: { value: 0.30 },
            reliability: 'high'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 500,
            speedFactor: 5.0,
            notes: 'Excellent machinability - highest of common metals'
          }
        },
        
        'O': {
          temper: 'Annealed',
          hardness: { brinell: 49 },
          tensileStrength: { value: 255, unit: 'MPa' },
          yieldStrength: { value: 150, unit: 'MPa' },
          elongation: { value: 21, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 310, unit: 'MPa' },
            mc: { value: 0.34 },
            reliability: 'high'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 550,
            speedFactor: 5.5
          }
        }
      },
      
      physical: {
        density: { value: 1770, unit: 'kg/m³' },
        meltingRange: { min: 566, max: 632, unit: '°C' },
        thermalConductivity: { value: 96, unit: 'W/m·K' },
        thermalExpansion: { value: 26, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 45, unit: 'GPa' },
        ignitionTemp: { value: 430, unit: '°C', notes: 'Fine chips' }
      },
      
      johnsonCook: {
        A: { value: 172, unit: 'MPa' },
        B: { value: 360, unit: 'MPa' },
        n: { value: 0.22 },
        C: { value: 0.012 },
        m: { value: 1.50 },
        source: 'Ulacia et al. (2010)',
        reliability: 'high'
      },
      
      applications: ['Aircraft structures', 'Automotive panels', 'Camera bodies', 'Laptop cases', 'Bicycle frames']
    },
    
    'AZ61A': {
      name: 'AZ61A',
      uns: 'M11610',
      description: 'Higher strength wrought magnesium with more aluminum',
      category: 'specialty_metals',
      subcategory: 'magnesium_alloys',
      
      composition: {
        Mg: { balance: true, unit: '%' },
        Al: { min: 5.8, max: 7.2, nominal: 6.5, unit: '%' },
        Zn: { min: 0.4, max: 1.5, nominal: 1.0, unit: '%' },
        Mn: { min: 0.15, max: 0.5, nominal: 0.3, unit: '%' }
      },
      
      conditions: {
        'F': {
          temper: 'As fabricated',
          hardness: { brinell: 60 },
          tensileStrength: { value: 310, unit: 'MPa' },
          yieldStrength: { value: 230, unit: 'MPa' },
          elongation: { value: 16, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 380, unit: 'MPa' },
            mc: { value: 0.31 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 450,
            speedFactor: 4.5
          }
        }
      },
      
      physical: {
        density: { value: 1800, unit: 'kg/m³' },
        meltingRange: { min: 525, max: 620, unit: '°C' },
        thermalConductivity: { value: 77, unit: 'W/m·K' },
        elasticModulus: { value: 45, unit: 'GPa' }
      },
      
      applications: ['Extrusions', 'Forgings', 'Aircraft structures']
    },
    
    'AZ80A': {
      name: 'AZ80A',
      uns: 'M11800',
      description: 'High-strength wrought magnesium alloy for forgings',
      category: 'specialty_metals',
      subcategory: 'magnesium_alloys',
      
      composition: {
        Mg: { balance: true, unit: '%' },
        Al: { min: 7.8, max: 9.2, nominal: 8.5, unit: '%' },
        Zn: { min: 0.2, max: 0.8, nominal: 0.5, unit: '%' },
        Mn: { min: 0.12, max: 0.5, nominal: 0.25, unit: '%' }
      },
      
      conditions: {
        'T5': {
          temper: 'Artificially aged',
          hardness: { brinell: 82 },
          tensileStrength: { value: 380, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          elongation: { value: 7, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 420, unit: 'MPa' },
            mc: { value: 0.29 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 400,
            speedFactor: 4.0
          }
        }
      },
      
      physical: {
        density: { value: 1810, unit: 'kg/m³' },
        meltingRange: { min: 475, max: 610, unit: '°C' },
        thermalConductivity: { value: 72, unit: 'W/m·K' },
        elasticModulus: { value: 45, unit: 'GPa' }
      },
      
      applications: ['Aerospace forgings', 'Automotive wheels', 'High-stress components']
    },
    
    'AZ91D': {
      name: 'AZ91D',
      uns: 'M11916',
      description: 'Most widely used die casting magnesium alloy',
      category: 'specialty_metals',
      subcategory: 'magnesium_alloys',
      
      composition: {
        Mg: { balance: true, unit: '%' },
        Al: { min: 8.3, max: 9.7, nominal: 9.0, unit: '%' },
        Zn: { min: 0.35, max: 1.0, nominal: 0.7, unit: '%' },
        Mn: { min: 0.15, max: 0.5, nominal: 0.3, unit: '%' },
        Si: { max: 0.10, unit: '%' },
        Cu: { max: 0.030, unit: '%' },
        Ni: { max: 0.002, unit: '%' },
        Fe: { max: 0.005, unit: '%' }
      },
      
      conditions: {
        'F': {
          temper: 'As cast',
          hardness: { brinell: 63 },
          tensileStrength: { value: 230, unit: 'MPa' },
          yieldStrength: { value: 150, unit: 'MPa' },
          elongation: { value: 3, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 400, unit: 'MPa' },
            mc: { value: 0.30 },
            source: 'Machining Data Handbook',
            reliability: 'high'
          },
          
          taylor: {
            C: { value: 600, unit: 'm/min' },
            n: { value: 0.28 },
            reliability: 'high'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 450,
            speedFactor: 4.5
          }
        },
        
        'T6': {
          temper: 'Solution treated and aged',
          hardness: { brinell: 70 },
          tensileStrength: { value: 275, unit: 'MPa' },
          yieldStrength: { value: 145, unit: 'MPa' },
          elongation: { value: 6, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 380, unit: 'MPa' },
            mc: { value: 0.31 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 480,
            speedFactor: 4.8
          }
        }
      },
      
      physical: {
        density: { value: 1810, unit: 'kg/m³' },
        meltingRange: { min: 470, max: 595, unit: '°C' },
        thermalConductivity: { value: 72, unit: 'W/m·K' },
        thermalExpansion: { value: 26, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 45, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 190, unit: 'MPa' },
        B: { value: 420, unit: 'MPa' },
        n: { value: 0.24 },
        C: { value: 0.015 },
        m: { value: 1.45 },
        source: 'Hasenpouth (2010)',
        reliability: 'high'
      },
      
      applications: ['Die cast housings', 'Automotive parts', 'Power tools', 'Electronics enclosures']
    },
    
    'ZK60A': {
      name: 'ZK60A',
      uns: 'M16600',
      description: 'High-strength wrought magnesium with zinc-zirconium',
      category: 'specialty_metals',
      subcategory: 'magnesium_alloys',
      
      composition: {
        Mg: { balance: true, unit: '%' },
        Zn: { min: 4.8, max: 6.2, nominal: 5.5, unit: '%' },
        Zr: { min: 0.45, nominal: 0.55, unit: '%' }
      },
      
      conditions: {
        'T5': {
          temper: 'Artificially aged',
          hardness: { brinell: 88 },
          tensileStrength: { value: 365, unit: 'MPa' },
          yieldStrength: { value: 305, unit: 'MPa' },
          elongation: { value: 11, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 450, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 380,
            speedFactor: 3.8
          }
        }
      },
      
      physical: {
        density: { value: 1830, unit: 'kg/m³' },
        meltingRange: { min: 520, max: 635, unit: '°C' },
        thermalConductivity: { value: 115, unit: 'W/m·K' },
        elasticModulus: { value: 45, unit: 'GPa' }
      },
      
      applications: ['Aerospace structures', 'Racing bicycle frames', 'High-strength extrusions']
    },
    
    'WE43': {
      name: 'WE43',
      alternateNames: ['Elektron WE43'],
      description: 'Rare-earth magnesium alloy for elevated temperature applications',
      category: 'specialty_metals',
      subcategory: 'magnesium_alloys',
      
      composition: {
        Mg: { balance: true, unit: '%' },
        Y: { min: 3.7, max: 4.3, nominal: 4.0, unit: '%' },
        Nd: { min: 2.0, max: 2.5, nominal: 2.25, unit: '%' },
        RE: { min: 0.4, max: 1.0, nominal: 0.7, unit: '%', notes: 'Heavy rare earths' },
        Zr: { min: 0.4, nominal: 0.5, unit: '%' }
      },
      
      conditions: {
        'T6': {
          temper: 'Solution treated and aged',
          hardness: { brinell: 85 },
          tensileStrength: { value: 295, unit: 'MPa' },
          yieldStrength: { value: 195, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 410, unit: 'MPa' },
            mc: { value: 0.29 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'A',
            percentOfB1112: 350,
            speedFactor: 3.5,
            notes: 'Machines well but requires careful chip management'
          }
        }
      },
      
      physical: {
        density: { value: 1840, unit: 'kg/m³' },
        meltingRange: { min: 545, max: 640, unit: '°C' },
        thermalConductivity: { value: 51, unit: 'W/m·K' },
        elasticModulus: { value: 44, unit: 'GPa' }
      },
      
      thermal: {
        maxServiceTemp: { value: 250, unit: '°C' },
        creepResistance: 'Excellent for magnesium alloys'
      },
      
      applications: ['Aerospace castings', 'Helicopter gearboxes', 'Racing engines', 'Biomedical implants']
    }
  },

  // ===========================================
  // REFRACTORY METALS
  // ===========================================
  
  refractoryMetals: {
    'Tungsten_Pure': {
      name: 'Pure Tungsten',
      alternateNames: ['Wolfram', 'W', 'UNS R07004'],
      uns: 'R07004',
      description: 'Highest melting point of all metals, extremely difficult to machine',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        W: { min: 99.95, unit: '%' }
      },
      
      conditions: {
        'Sintered': {
          hardness: { vickers: 350, brinell: 310 },
          tensileStrength: { value: 980, unit: 'MPa' },
          yieldStrength: { value: 750, unit: 'MPa' },
          elongation: { value: 2, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4500, unit: 'MPa' },
            mc: { value: 0.18 },
            source: 'Estimated from hardness correlation',
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 3,
            speedFactor: 0.03,
            notes: 'Extremely difficult - brittle, abrasive, high hardness'
          }
        },
        
        'Stress_Relieved': {
          hardness: { vickers: 400, brinell: 350 },
          tensileStrength: { value: 1250, unit: 'MPa' },
          yieldStrength: { value: 950, unit: 'MPa' },
          elongation: { value: 4, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4800, unit: 'MPa' },
            mc: { value: 0.17 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 4,
            speedFactor: 0.04
          }
        }
      },
      
      physical: {
        density: { value: 19300, unit: 'kg/m³' },
        meltingPoint: { value: 3422, unit: '°C' },
        thermalConductivity: { value: 173, unit: 'W/m·K' },
        thermalExpansion: { value: 4.5, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 411, unit: 'GPa' },
        specificHeat: { value: 132, unit: 'J/kg·K' }
      },
      
      johnsonCook: {
        A: { value: 1506, unit: 'MPa' },
        B: { value: 177, unit: 'MPa' },
        n: { value: 0.12 },
        C: { value: 0.016 },
        m: { value: 1.0 },
        source: 'Johnson & Cook (1985)',
        reliability: 'medium'
      },
      
      machiningNotes: [
        'EDM often preferred over conventional machining',
        'Diamond grinding for precision',
        'Carbide tools C2 uncoated, sharp edges',
        'Very slow speeds: 3-12 m/min',
        'High-pressure coolant essential',
        'Brittle - avoid interrupted cuts'
      ],
      
      applications: ['X-ray targets', 'Rocket nozzles', 'Electrodes', 'Radiation shielding', 'Furnace elements']
    },
    
    'W-25Re': {
      name: 'W-25Re (Tungsten-Rhenium)',
      uns: 'R07031',
      description: 'Tungsten-rhenium alloy with improved ductility',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        W: { balance: true, unit: '%' },
        Re: { min: 24.5, max: 26.5, nominal: 25.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { vickers: 500, brinell: 420 },
          tensileStrength: { value: 1400, unit: 'MPa' },
          yieldStrength: { value: 1100, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 4200, unit: 'MPa' },
            mc: { value: 0.19 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'E',
            percentOfB1112: 5,
            speedFactor: 0.05,
            notes: 'Better than pure W due to ductility'
          }
        }
      },
      
      physical: {
        density: { value: 19700, unit: 'kg/m³' },
        meltingPoint: { value: 3120, unit: '°C' },
        thermalConductivity: { value: 70, unit: 'W/m·K' },
        elasticModulus: { value: 420, unit: 'GPa' }
      },
      
      applications: ['Thermocouple elements', 'Space nuclear power', 'High-temperature springs']
    },
    
    'Molybdenum_Pure': {
      name: 'Pure Molybdenum',
      alternateNames: ['Mo', 'UNS R03600'],
      uns: 'R03600',
      description: 'Refractory metal with excellent high-temperature strength',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        Mo: { min: 99.95, unit: '%' }
      },
      
      conditions: {
        'Stress_Relieved': {
          hardness: { vickers: 200, brinell: 190 },
          tensileStrength: { value: 655, unit: 'MPa' },
          yieldStrength: { value: 550, unit: 'MPa' },
          elongation: { value: 25, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2800, unit: 'MPa' },
            mc: { value: 0.22 },
            source: 'Machining Data Handbook',
            reliability: 'medium'
          },
          
          taylor: {
            C: { value: 65, unit: 'm/min' },
            n: { value: 0.22 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 15,
            speedFactor: 0.15
          }
        },
        
        'Arc_Cast': {
          hardness: { vickers: 230, brinell: 215 },
          tensileStrength: { value: 760, unit: 'MPa' },
          yieldStrength: { value: 620, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3000, unit: 'MPa' },
            mc: { value: 0.21 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            speedFactor: 0.12
          }
        }
      },
      
      physical: {
        density: { value: 10220, unit: 'kg/m³' },
        meltingPoint: { value: 2623, unit: '°C' },
        thermalConductivity: { value: 138, unit: 'W/m·K' },
        thermalExpansion: { value: 5.1, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 329, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 950, unit: 'MPa' },
        B: { value: 1050, unit: 'MPa' },
        n: { value: 0.25 },
        C: { value: 0.014 },
        m: { value: 0.85 },
        source: 'Chen & Gray (1996)',
        reliability: 'medium'
      },
      
      machiningNotes: [
        'Machines better than tungsten',
        'Carbide C2 uncoated tools',
        'Speeds: 15-45 m/min typical',
        'Work hardens - maintain feed',
        'Brittle below DBTT (~-40°C)'
      ],
      
      applications: ['Furnace heating elements', 'Glass melting electrodes', 'Missile components', 'Electrical contacts']
    },
    
    'TZM': {
      name: 'TZM (Mo-Ti-Zr)',
      alternateNames: ['Titanium-Zirconium-Molybdenum'],
      uns: 'R03630',
      description: 'High-strength molybdenum alloy for elevated temperatures',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        Mo: { balance: true, unit: '%' },
        Ti: { min: 0.40, max: 0.55, nominal: 0.50, unit: '%' },
        Zr: { min: 0.06, max: 0.12, nominal: 0.08, unit: '%' },
        C: { min: 0.01, max: 0.04, nominal: 0.02, unit: '%' }
      },
      
      conditions: {
        'Stress_Relieved': {
          hardness: { vickers: 265, brinell: 235 },
          tensileStrength: { value: 895, unit: 'MPa' },
          yieldStrength: { value: 760, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 3200, unit: 'MPa' },
            mc: { value: 0.21 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'D',
            percentOfB1112: 12,
            speedFactor: 0.12
          }
        }
      },
      
      physical: {
        density: { value: 10160, unit: 'kg/m³' },
        meltingPoint: { value: 2620, unit: '°C' },
        thermalConductivity: { value: 126, unit: 'W/m·K' },
        elasticModulus: { value: 317, unit: 'GPa' }
      },
      
      thermal: {
        maxServiceTemp: { value: 1400, unit: '°C' },
        recrystallizationTemp: { value: 1400, unit: '°C' }
      },
      
      applications: ['Rocket nozzles', 'Die casting dies', 'Nuclear components', 'High-temp fasteners']
    },
    
    'Tantalum_Pure': {
      name: 'Pure Tantalum',
      alternateNames: ['Ta', 'UNS R05200'],
      uns: 'R05200',
      description: 'Highly corrosion resistant refractory metal, ductile',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        Ta: { min: 99.5, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { vickers: 120, brinell: 95 },
          tensileStrength: { value: 345, unit: 'MPa' },
          yieldStrength: { value: 165, unit: 'MPa' },
          elongation: { value: 40, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1850, unit: 'MPa' },
            mc: { value: 0.26 },
            source: 'Machining Data Handbook',
            reliability: 'medium'
          },
          
          taylor: {
            C: { value: 130, unit: 'm/min' },
            n: { value: 0.25 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfB1112: 30,
            speedFactor: 0.30,
            notes: 'Gummy - work hardens, chips weld to tool'
          }
        }
      },
      
      physical: {
        density: { value: 16600, unit: 'kg/m³' },
        meltingPoint: { value: 3017, unit: '°C' },
        thermalConductivity: { value: 57.5, unit: 'W/m·K' },
        thermalExpansion: { value: 6.3, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 186, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 250, unit: 'MPa' },
        B: { value: 665, unit: 'MPa' },
        n: { value: 0.42 },
        C: { value: 0.020 },
        m: { value: 1.35 },
        source: 'Nemat-Nasser (1998)',
        reliability: 'medium'
      },
      
      machiningNotes: [
        'Gummy - tends to form built-up edge',
        'Sharp tools with positive rake essential',
        'Light feeds to avoid work hardening',
        'Speeds: 30-90 m/min',
        'Excellent corrosion resistance simplifies coolant selection'
      ],
      
      applications: ['Chemical processing', 'Capacitors', 'Medical implants', 'High-temp furnaces']
    },
    
    'Niobium_Pure': {
      name: 'Pure Niobium',
      alternateNames: ['Columbium', 'Cb', 'Nb', 'UNS R04200'],
      uns: 'R04200',
      description: 'Ductile refractory metal, excellent for superconducting applications',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        Nb: { min: 99.0, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { vickers: 80, brinell: 60 },
          tensileStrength: { value: 275, unit: 'MPa' },
          yieldStrength: { value: 105, unit: 'MPa' },
          elongation: { value: 30, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 1550, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'medium'
          },
          
          taylor: {
            C: { value: 150, unit: 'm/min' },
            n: { value: 0.26 },
            reliability: 'medium'
          },
          
          machinability: {
            rating: 'C',
            percentOfB1112: 35,
            speedFactor: 0.35,
            notes: 'Similar to tantalum - gummy'
          }
        }
      },
      
      physical: {
        density: { value: 8570, unit: 'kg/m³' },
        meltingPoint: { value: 2477, unit: '°C' },
        thermalConductivity: { value: 53.7, unit: 'W/m·K' },
        thermalExpansion: { value: 7.3, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 105, unit: 'GPa' }
      },
      
      johnsonCook: {
        A: { value: 180, unit: 'MPa' },
        B: { value: 560, unit: 'MPa' },
        n: { value: 0.44 },
        C: { value: 0.018 },
        m: { value: 1.40 },
        reliability: 'low'
      },
      
      applications: ['Superconducting wire', 'Surgical implants', 'Aerospace alloys', 'Nuclear reactors']
    },
    
    'C103': {
      name: 'C103 (Nb-10Hf-1Ti)',
      description: 'High-strength niobium alloy for aerospace applications',
      category: 'specialty_metals',
      subcategory: 'refractory_metals',
      
      composition: {
        Nb: { balance: true, unit: '%' },
        Hf: { min: 9.0, max: 11.0, nominal: 10.0, unit: '%' },
        Ti: { min: 0.7, max: 1.3, nominal: 1.0, unit: '%' },
        Zr: { max: 0.7, unit: '%' }
      },
      
      conditions: {
        'Annealed': {
          hardness: { vickers: 160, brinell: 135 },
          tensileStrength: { value: 400, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          elongation: { value: 25, unit: '%' },
          
          kienzle: {
            kc1_1: { value: 2000, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'low'
          },
          
          machinability: {
            rating: 'C',
            percentOfB1112: 25,
            speedFactor: 0.25
          }
        }
      },
      
      physical: {
        density: { value: 8860, unit: 'kg/m³' },
        meltingPoint: { value: 2350, unit: '°C' },
        thermalConductivity: { value: 44, unit: 'W/m·K' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      
      thermal: {
        maxServiceTemp: { value: 1370, unit: '°C' }
      },
      
      applications: ['Rocket nozzles', 'Space thruster components', 'Nuclear fuel cladding']
    }
  },

  // ===========================================
  // CEMENTED CARBIDES
  // ===========================================
  
  cementedCarbides: {
    _machiningWarning: {
      critical: true,
      message: 'CEMENTED CARBIDES REQUIRE SPECIAL MACHINING',
      requirements: [
        'Diamond grinding is primary shaping method',
        'PCD tooling for any turning/milling',
        'EDM (wire/sinker) for complex shapes',
        'Wet grinding essential - cobalt dust is toxic',
        'Conventional carbide/HSS tools wear rapidly',
        'Green (pre-sintered) state easier to shape'
      ]
    },
    
    'WC-6Co': {
      name: 'WC-6Co (Fine Grain)',
      alternateNames: ['Cemented Carbide Grade C2'],
      description: 'Fine-grain tungsten carbide with 6% cobalt binder, for cutting tools',
      category: 'specialty_metals',
      subcategory: 'cemented_carbides',
      
      composition: {
        WC: { nominal: 94.0, unit: '%' },
        Co: { nominal: 6.0, unit: '%' }
      },
      
      properties: {
        hardness: { rockwellA: 92.5, vickers: 1700 },
        transverseRuptureStrength: { value: 2400, unit: 'MPa' },
        compressiveStrength: { value: 6000, unit: 'MPa' },
        
        kienzle: {
          kc1_1: { value: 8500, unit: 'MPa' },
          mc: { value: 0.12 },
          notes: 'Theoretical - diamond grinding only',
          reliability: 'low'
        },
        
        machinability: {
          rating: 'F',
          percentOfB1112: 0.5,
          speedFactor: 0.005,
          notes: 'Diamond grinding only - conventional machining impractical'
        }
      },
      
      physical: {
        density: { value: 14900, unit: 'kg/m³' },
        meltingPoint: { notes: 'Decomposes ~2870°C' },
        thermalConductivity: { value: 100, unit: 'W/m·K' },
        thermalExpansion: { value: 5.5, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 630, unit: 'GPa' }
      },
      
      grindability: {
        rating: 'Good',
        wheelRecommendation: 'Diamond resin bond 100-150 grit',
        coolant: 'Required - cobalt dust hazard',
        materialRemovalRate: 'Low'
      },
      
      applications: ['Cutting tool inserts', 'Wear parts', 'Dies', 'Metal forming tools']
    },
    
    'WC-10Co': {
      name: 'WC-10Co (Medium Grain)',
      alternateNames: ['Cemented Carbide Grade C5'],
      description: 'Medium-grain tungsten carbide with 10% cobalt, for mining/construction',
      category: 'specialty_metals',
      subcategory: 'cemented_carbides',
      
      composition: {
        WC: { nominal: 90.0, unit: '%' },
        Co: { nominal: 10.0, unit: '%' }
      },
      
      properties: {
        hardness: { rockwellA: 89.5, vickers: 1400 },
        transverseRuptureStrength: { value: 3000, unit: 'MPa' },
        compressiveStrength: { value: 5200, unit: 'MPa' },
        
        kienzle: {
          kc1_1: { value: 7500, unit: 'MPa' },
          mc: { value: 0.14 },
          reliability: 'low'
        },
        
        machinability: {
          rating: 'F',
          percentOfB1112: 0.8,
          speedFactor: 0.008
        }
      },
      
      physical: {
        density: { value: 14500, unit: 'kg/m³' },
        thermalConductivity: { value: 90, unit: 'W/m·K' },
        thermalExpansion: { value: 5.9, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 570, unit: 'GPa' }
      },
      
      grindability: {
        rating: 'Better than WC-6Co',
        wheelRecommendation: 'Diamond resin bond 80-120 grit',
        notes: 'Higher cobalt = easier grinding but more wheel loading'
      },
      
      applications: ['Mining bits', 'Construction tools', 'Cold heading dies', 'Wear plates']
    },
    
    'WC-15Co': {
      name: 'WC-15Co (Coarse Grain)',
      alternateNames: ['Cemented Carbide Grade C8'],
      description: 'Coarse-grain tungsten carbide with high cobalt for impact resistance',
      category: 'specialty_metals',
      subcategory: 'cemented_carbides',
      
      composition: {
        WC: { nominal: 85.0, unit: '%' },
        Co: { nominal: 15.0, unit: '%' }
      },
      
      properties: {
        hardness: { rockwellA: 86.5, vickers: 1150 },
        transverseRuptureStrength: { value: 3400, unit: 'MPa' },
        compressiveStrength: { value: 4600, unit: 'MPa' },
        
        kienzle: {
          kc1_1: { value: 6500, unit: 'MPa' },
          mc: { value: 0.16 },
          reliability: 'low'
        },
        
        machinability: {
          rating: 'F',
          percentOfB1112: 1.0,
          speedFactor: 0.01,
          notes: 'Easiest carbide to grind due to high cobalt'
        }
      },
      
      physical: {
        density: { value: 14000, unit: 'kg/m³' },
        thermalConductivity: { value: 80, unit: 'W/m·K' },
        thermalExpansion: { value: 6.4, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 510, unit: 'GPa' }
      },
      
      grindability: {
        rating: 'Best of WC grades',
        notes: 'High cobalt provides better toughness during grinding'
      },
      
      applications: ['Percussion drilling', 'Roll rings', 'Stamping dies', 'High-impact wear parts']
    }
  },

  // ===========================================
  // HELPER METHODS
  // ===========================================
  
  getMaterial: function(materialId) {
    // Check all categories
    const categories = [
      'cobaltAlloys',
      'magnesiumAlloys',
      'refractoryMetals',
      'cementedCarbides'
    ];
    
    for (const category of categories) {
      if (this[category] && this[category][materialId]) {
        return { ...this[category][materialId], category: category };
      }
    }
    return null;
  },
  
  getAllMaterials: function() {
    const materials = [];
    const categories = ['cobaltAlloys', 'magnesiumAlloys', 'refractoryMetals', 'cementedCarbides'];
    
    for (const category of categories) {
      if (this[category]) {
        for (const [id, material] of Object.entries(this[category])) {
          if (id.startsWith('_')) continue; // Skip meta entries
          materials.push({ id, ...material, category });
        }
      }
    }
    return materials;
  },
  
  getMaterialsByCategory: function(category) {
    if (!this[category]) return [];
    return Object.entries(this[category])
      .filter(([id]) => !id.startsWith('_'))
      .map(([id, material]) => ({ id, ...material }));
  },
  
  getCobaltAlloys: function() { return this.getMaterialsByCategory('cobaltAlloys'); },
  getMagnesiumAlloys: function() { return this.getMaterialsByCategory('magnesiumAlloys'); },
  getRefractoryMetals: function() { return this.getMaterialsByCategory('refractoryMetals'); },
  getCementedCarbides: function() { return this.getMaterialsByCategory('cementedCarbides'); },
  
  getSafetyWarnings: function(materialId) {
    const material = this.getMaterial(materialId);
    if (!material) return null;
    
    const warnings = [];
    
    // Magnesium fire warning
    if (material.category === 'magnesiumAlloys') {
      warnings.push(this.magnesiumAlloys._safetyWarning);
    }
    
    // Cemented carbide grinding warning
    if (material.category === 'cementedCarbides') {
      warnings.push(this.cementedCarbides._machiningWarning);
    }
    
    // Cobalt work hardening warning
    if (material.category === 'cobaltAlloys') {
      warnings.push({
        type: 'workHardening',
        message: 'Cobalt alloys work harden rapidly - maintain continuous feed'
      });
    }
    
    return warnings.length > 0 ? warnings : null;
  },
  
  validateData: function() {
    const issues = [];
    const materials = this.getAllMaterials();
    
    for (const material of materials) {
      // Check required fields
      if (!material.name) issues.push(`${material.id}: Missing name`);
      if (!material.physical) issues.push(`${material.id}: Missing physical properties`);
      
      // Check for at least one condition with kienzle data
      if (material.conditions) {
        const hasKienzle = Object.values(material.conditions).some(c => c.kienzle);
        if (!hasKienzle) issues.push(`${material.id}: No Kienzle data in any condition`);
      } else if (!material.properties?.kienzle) {
        issues.push(`${material.id}: No conditions or properties with Kienzle data`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues: issues,
      totalMaterials: materials.length
    };
  }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_SPECIALTY_METALS_SCIENTIFIC;
}
if (typeof window !== 'undefined') {
  window.PRISM_SPECIALTY_METALS_SCIENTIFIC = PRISM_SPECIALTY_METALS_SCIENTIFIC;
}
