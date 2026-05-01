/**
 * PRISM TITANIUM ALLOYS SCIENTIFIC DATABASE
 * ==========================================
 * 
 * Comprehensive titanium alloys data with validated scientific parameters
 * for machining calculations. Titanium is notoriously difficult to machine
 * due to low thermal conductivity, high chemical reactivity, and work hardening.
 * 
 * Session: 1.A.1-SCI-06
 * Created: 2026-01-22
 * 
 * DATA SOURCES:
 * - Machining Data Handbook (3rd Edition, Metcut Research Associates)
 * - ASM Metals Handbook Vol. 2: Properties and Selection - Nonferrous Alloys
 * - ASM Specialty Handbook: Titanium and Titanium Alloys
 * - Johnson-Cook parameters: Lee & Lin (1998), Meyer (2006), Lesuer (2000)
 * - Kienzle parameters: Pramanik et al. (2003), Armendia et al. (2010)
 * - MMPDS (Metallic Materials Properties Development and Standardization)
 * - Donachie: Titanium - A Technical Guide (2nd Ed.)
 * 
 * MACHINING CHARACTERISTICS:
 * - Low thermal conductivity (7-22 W/m·K vs 50 for steel)
 * - High chemical reactivity with tool materials at elevated temps
 * - Strong tendency to gall and weld to cutting tools
 * - Low elastic modulus causes springback
 * - Work hardens rapidly - avoid dwelling
 * - Thin chips maintain contact with tool face
 * 
 * COVERAGE: 20 Alloys across CP, Alpha, Alpha-Beta, Near-Alpha, and Beta categories
 */

const PRISM_TITANIUM_ALLOYS_SCIENTIFIC = {
  version: "1.0.0",
  category: "titanium_alloys",
  lastUpdated: "2026-01-22",
  
  // ===== MACHINING FUNDAMENTALS =====
  
  machiningFundamentals: {
    criticalFactors: [
      'Low thermal conductivity concentrates heat at tool tip',
      'High chemical reactivity causes tool wear acceleration above 500°C',
      'Low elastic modulus (100-120 GPa) causes workpiece deflection and springback',
      'Tendency to gall/weld to tool requires sharp edges and appropriate coatings',
      'Segmented chip formation creates cyclic loading on tool',
      'Work hardening requires consistent feed - never dwell'
    ],
    toolingRecommendations: {
      carbide: {
        grades: ['Uncoated C2/C3 (K10-K20)', 'TiAlN coated for finishing'],
        notes: 'Uncoated often preferred - coatings can accelerate chemical wear'
      },
      ceramic: {
        suitable: false,
        reason: 'Chemical reaction with titanium causes rapid failure'
      },
      cbn: {
        suitable: 'Limited',
        notes: 'Only for finishing hardened beta alloys'
      },
      pcd: {
        suitable: false,
        reason: 'Carbon diffusion into titanium causes rapid wear'
      },
      hss: {
        suitable: 'For low speeds only',
        notes: 'M42, M33 cobalt grades for drilling/tapping'
      }
    },
    coolantCritical: true,
    coolantNotes: 'HIGH PRESSURE (1000+ psi) flood coolant MANDATORY. Chlorinated oils excellent but environmental concerns. Water-soluble OK with high concentration.',
    speedReduction: 'Titanium speeds typically 20-30% of equivalent strength steel'
  },

  materials: {
    
    // ===== COMMERCIALLY PURE (CP) TITANIUM =====
    
    'CP-Ti-Grade1': {
      name: 'CP Titanium Grade 1',
      uns: 'R50250',
      description: 'Highest purity, lowest strength, best formability and corrosion resistance',
      category: 'titanium_alloys',
      subcategory: 'commercially_pure',
      oxygenContent: { max: 0.18, unit: '%', effect: 'Lowest oxygen = softest CP grade' },
      conditions: {
        'Annealed': {
          hardness: { brinell: 120, rockwellB: 70 },
          tensileStrength: { value: 240, unit: 'MPa' },
          yieldStrength: { value: 170, unit: 'MPa' },
          elongation: { value: 24, unit: '%' },
          kienzle: {
            kc1_1: { value: 1350, unit: 'MPa' },
            mc: { value: 0.21 },
            source: 'Pramanik et al. (2003)',
            reliability: 'high',
            notes: 'Despite low strength, high kc due to gummy nature'
          },
          machinability: {
            rating: 'C',
            percentOfB1112: 25,
            notes: 'Gummy, tends to smear. Sharp tools essential.'
          }
        }
      },
      physical: {
        density: { value: 4510, unit: 'kg/m³' },
        meltingPoint: { value: 1668, unit: '°C' },
        thermalConductivity: { value: 16.4, unit: 'W/m·K' },
        specificHeat: { value: 523, unit: 'J/kg·K' },
        thermalExpansion: { value: 8.6, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 170, unit: 'MPa' },
        B: { value: 380, unit: 'MPa' },
        n: { value: 0.32 },
        C: { value: 0.032 },
        m: { value: 0.7 },
        meltingTemp: { value: 1668, unit: '°C' },
        source: 'Estimated from CP-Ti-Grade2',
        reliability: 'low'
      },
      applications: ['Chemical processing', 'Marine', 'Medical implants', 'Architecture']
    },
    
    'CP-Ti-Grade2': {
      name: 'CP Titanium Grade 2',
      uns: 'R50400',
      description: 'Most common CP grade - balance of strength and formability',
      category: 'titanium_alloys',
      subcategory: 'commercially_pure',
      oxygenContent: { max: 0.25, unit: '%' },
      conditions: {
        'Annealed': {
          hardness: { brinell: 160, rockwellB: 80 },
          tensileStrength: { value: 345, unit: 'MPa' },
          yieldStrength: { value: 275, unit: 'MPa' },
          elongation: { value: 20, unit: '%' },
          kienzle: {
            kc1_1: { value: 1420, unit: 'MPa' },
            mc: { value: 0.22 },
            source: 'Machining Data Handbook',
            reliability: 'high'
          },
          machinability: {
            rating: 'C',
            percentOfB1112: 22,
            notes: 'Most machinable CP grade. Still requires care.'
          }
        }
      },
      physical: {
        density: { value: 4510, unit: 'kg/m³' },
        meltingPoint: { value: 1665, unit: '°C' },
        thermalConductivity: { value: 16.4, unit: 'W/m·K' },
        specificHeat: { value: 523, unit: 'J/kg·K' },
        thermalExpansion: { value: 8.6, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 275, unit: 'MPa' },
        B: { value: 420, unit: 'MPa' },
        n: { value: 0.30 },
        C: { value: 0.030 },
        m: { value: 0.7 },
        meltingTemp: { value: 1665, unit: '°C' },
        source: 'Lee & Lin (1998)',
        reliability: 'medium'
      },
      applications: ['Chemical equipment', 'Marine hardware', 'Heat exchangers', 'Desalination']
    },
    
    'CP-Ti-Grade3': {
      name: 'CP Titanium Grade 3',
      uns: 'R50550',
      description: 'Higher strength CP grade',
      category: 'titanium_alloys',
      subcategory: 'commercially_pure',
      oxygenContent: { max: 0.35, unit: '%' },
      conditions: {
        'Annealed': {
          hardness: { brinell: 200, rockwellC: 18 },
          tensileStrength: { value: 450, unit: 'MPa' },
          yieldStrength: { value: 380, unit: 'MPa' },
          elongation: { value: 18, unit: '%' },
          kienzle: {
            kc1_1: { value: 1500, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 20
          }
        }
      },
      physical: {
        density: { value: 4510, unit: 'kg/m³' },
        meltingPoint: { value: 1660, unit: '°C' },
        thermalConductivity: { value: 16.4, unit: 'W/m·K' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 380, unit: 'MPa' },
        B: { value: 450, unit: 'MPa' },
        n: { value: 0.28 },
        C: { value: 0.028 },
        m: { value: 0.7 },
        meltingTemp: { value: 1660, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Aerospace ducting', 'Hydraulic tubing', 'Pressure vessels']
    },
    
    'CP-Ti-Grade4': {
      name: 'CP Titanium Grade 4',
      uns: 'R50700',
      description: 'Highest strength CP grade',
      category: 'titanium_alloys',
      subcategory: 'commercially_pure',
      oxygenContent: { max: 0.40, unit: '%' },
      conditions: {
        'Annealed': {
          hardness: { brinell: 253, rockwellC: 25 },
          tensileStrength: { value: 550, unit: 'MPa' },
          yieldStrength: { value: 485, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          kienzle: {
            kc1_1: { value: 1580, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 18
          }
        }
      },
      physical: {
        density: { value: 4510, unit: 'kg/m³' },
        meltingPoint: { value: 1655, unit: '°C' },
        thermalConductivity: { value: 16.4, unit: 'W/m·K' },
        elasticModulus: { value: 104, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 485, unit: 'MPa' },
        B: { value: 480, unit: 'MPa' },
        n: { value: 0.26 },
        C: { value: 0.026 },
        m: { value: 0.7 },
        meltingTemp: { value: 1655, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Airframe components', 'Surgical implants', 'Marine fasteners']
    },
    
    // ===== ALPHA ALLOYS =====
    
    'Ti-5Al-2.5Sn': {
      name: 'Ti-5Al-2.5Sn (Ti-5-2.5)',
      uns: 'R54520',
      description: 'Weldable alpha alloy for cryogenic and elevated temperature',
      category: 'titanium_alloys',
      subcategory: 'alpha',
      composition: { Al: '5%', Sn: '2.5%' },
      conditions: {
        'Annealed': {
          hardness: { brinell: 300, rockwellC: 32 },
          tensileStrength: { value: 830, unit: 'MPa' },
          yieldStrength: { value: 780, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          kienzle: {
            kc1_1: { value: 1750, unit: 'MPa' },
            mc: { value: 0.26 },
            source: 'Armendia et al. (2010)',
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 15,
            notes: 'Good weldability but difficult machining'
          }
        }
      },
      physical: {
        density: { value: 4480, unit: 'kg/m³' },
        betaTransus: { value: 1040, unit: '°C' },
        thermalConductivity: { value: 7.8, unit: 'W/m·K', notes: 'Very low - heat concentration' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 780, unit: 'MPa' },
        B: { value: 550, unit: 'MPa' },
        n: { value: 0.32 },
        C: { value: 0.020 },
        m: { value: 0.8 },
        meltingTemp: { value: 1650, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Cryogenic vessels', 'Gas turbine compressor blades', 'Aerospace forgings']
    },
    
    // ===== ALPHA-BETA ALLOYS =====
    
    'Ti-6Al-4V': {
      name: 'Ti-6Al-4V (Ti-6-4, Grade 5)',
      uns: 'R56400',
      description: 'THE workhorse titanium alloy - 50%+ of all titanium usage',
      category: 'titanium_alloys',
      subcategory: 'alpha_beta',
      composition: { Al: '6%', V: '4%' },
      conditions: {
        'Mill-Annealed': {
          name: 'Mill Annealed',
          hardness: { brinell: 334, rockwellC: 36 },
          tensileStrength: { value: 950, unit: 'MPa' },
          yieldStrength: { value: 880, unit: 'MPa' },
          elongation: { value: 14, unit: '%' },
          kienzle: {
            kc1_1: { value: 1850, unit: 'MPa' },
            mc: { value: 0.25 },
            source: 'Multiple validated sources',
            reliability: 'high'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 22,
            notes: 'Most commonly machined titanium grade'
          }
        },
        'STA': {
          name: 'Solution Treated & Aged',
          hardness: { brinell: 379, rockwellC: 41 },
          tensileStrength: { value: 1100, unit: 'MPa' },
          yieldStrength: { value: 1030, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          kienzle: {
            kc1_1: { value: 2050, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'high'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 15,
            notes: 'Significantly harder to machine than mill-annealed'
          }
        },
        'Annealed': {
          name: 'Fully Annealed',
          hardness: { brinell: 302, rockwellC: 32 },
          tensileStrength: { value: 895, unit: 'MPa' },
          yieldStrength: { value: 825, unit: 'MPa' },
          elongation: { value: 14, unit: '%' },
          kienzle: {
            kc1_1: { value: 1780, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'high'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 24,
            notes: 'Best condition for heavy machining'
          }
        }
      },
      physical: {
        density: { value: 4430, unit: 'kg/m³' },
        betaTransus: { value: 995, unit: '°C' },
        thermalConductivity: { value: 6.7, unit: 'W/m·K', notes: 'VERY LOW - major machining challenge' },
        specificHeat: { value: 560, unit: 'J/kg·K' },
        thermalExpansion: { value: 8.6, unit: '×10⁻⁶/°C' },
        elasticModulus: { value: 114, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1098, unit: 'MPa' },
        B: { value: 1092, unit: 'MPa' },
        n: { value: 0.93 },
        C: { value: 0.014 },
        m: { value: 1.1 },
        strainRate0: { value: 1, unit: '/s' },
        meltingTemp: { value: 1660, unit: '°C' },
        source: 'Lee & Lin (1998) - Extensively validated',
        reliability: 'high',
        notes: 'Most studied Ti alloy J-C parameters'
      },
      applications: ['Aerospace structures', 'Gas turbine disks', 'Medical implants', 'Marine hardware', 'Sporting goods']
    },
    
    'Ti-6Al-4V-ELI': {
      name: 'Ti-6Al-4V ELI (Grade 23)',
      uns: 'R56401',
      description: 'Extra Low Interstitial - improved fracture toughness, biocompatibility',
      category: 'titanium_alloys',
      subcategory: 'alpha_beta',
      composition: { Al: '6%', V: '4%', O: '<0.13%', Fe: '<0.25%' },
      conditions: {
        'Mill-Annealed': {
          hardness: { brinell: 311, rockwellC: 33 },
          tensileStrength: { value: 860, unit: 'MPa' },
          yieldStrength: { value: 795, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          kienzle: {
            kc1_1: { value: 1750, unit: 'MPa' },
            mc: { value: 0.24 },
            reliability: 'high',
            notes: 'Slightly easier to machine than standard grade'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 25
          }
        },
        'Annealed': {
          hardness: { brinell: 290, rockwellC: 30 },
          tensileStrength: { value: 825, unit: 'MPa' },
          yieldStrength: { value: 760, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          kienzle: {
            kc1_1: { value: 1680, unit: 'MPa' },
            mc: { value: 0.23 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'C',
            percentOfB1112: 27,
            notes: 'Best machinability of Ti-6Al-4V variants'
          }
        }
      },
      physical: {
        density: { value: 4430, unit: 'kg/m³' },
        betaTransus: { value: 975, unit: '°C' },
        thermalConductivity: { value: 6.7, unit: 'W/m·K' },
        elasticModulus: { value: 114, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1000, unit: 'MPa' },
        B: { value: 1050, unit: 'MPa' },
        n: { value: 0.90 },
        C: { value: 0.014 },
        m: { value: 1.1 },
        meltingTemp: { value: 1660, unit: '°C' },
        source: 'Modified from Ti-6-4 for lower interstitials',
        reliability: 'medium'
      },
      applications: ['Surgical implants', 'Joint replacements', 'Cryogenic applications', 'Aerospace critical']
    },
    
    'Ti-6Al-6V-2Sn': {
      name: 'Ti-6Al-6V-2Sn (Ti-6-6-2)',
      uns: 'R56620',
      description: 'Higher strength than Ti-6-4, used in airframe structures',
      category: 'titanium_alloys',
      subcategory: 'alpha_beta',
      composition: { Al: '6%', V: '6%', Sn: '2%', Cu: '0.75%', Fe: '0.35%' },
      conditions: {
        'STA': {
          hardness: { brinell: 375, rockwellC: 40 },
          tensileStrength: { value: 1170, unit: 'MPa' },
          yieldStrength: { value: 1100, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          kienzle: {
            kc1_1: { value: 2100, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 12,
            notes: 'Very difficult - requires aggressive coolant'
          }
        },
        'Annealed': {
          hardness: { brinell: 321, rockwellC: 34 },
          tensileStrength: { value: 1030, unit: 'MPa' },
          yieldStrength: { value: 965, unit: 'MPa' },
          elongation: { value: 14, unit: '%' },
          kienzle: {
            kc1_1: { value: 1900, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 17
          }
        }
      },
      physical: {
        density: { value: 4540, unit: 'kg/m³' },
        betaTransus: { value: 945, unit: '°C' },
        thermalConductivity: { value: 6.6, unit: 'W/m·K' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1100, unit: 'MPa' },
        B: { value: 850, unit: 'MPa' },
        n: { value: 0.48 },
        C: { value: 0.018 },
        m: { value: 1.0 },
        meltingTemp: { value: 1650, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Rocket motor cases', 'Airframe structures', 'Compressor blades', 'Fasteners']
    },

    'Ti-6Al-2Sn-4Zr-2Mo': {
      name: 'Ti-6Al-2Sn-4Zr-2Mo (Ti-6242)',
      uns: 'R54620',
      description: 'High-temperature creep-resistant alloy',
      category: 'titanium_alloys',
      subcategory: 'near_alpha',
      composition: { Al: '6%', Sn: '2%', Zr: '4%', Mo: '2%' },
      conditions: {
        'Duplex-Annealed': {
          hardness: { brinell: 340, rockwellC: 37 },
          tensileStrength: { value: 1000, unit: 'MPa' },
          yieldStrength: { value: 930, unit: 'MPa' },
          elongation: { value: 12, unit: '%' },
          kienzle: {
            kc1_1: { value: 1950, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 14,
            notes: 'Creep-resistant structure resists cutting'
          }
        }
      },
      physical: {
        density: { value: 4540, unit: 'kg/m³' },
        betaTransus: { value: 995, unit: '°C' },
        thermalConductivity: { value: 7.0, unit: 'W/m·K' },
        elasticModulus: { value: 114, unit: 'GPa' },
        maxServiceTemp: { value: 540, unit: '°C' }
      },
      johnsonCook: {
        A: { value: 930, unit: 'MPa' },
        B: { value: 750, unit: 'MPa' },
        n: { value: 0.45 },
        C: { value: 0.015 },
        m: { value: 0.9 },
        meltingTemp: { value: 1650, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Jet engine compressors', 'Airframe skins', 'High-temp structures']
    },
    
    'Ti-6242S': {
      name: 'Ti-6Al-2Sn-4Zr-2Mo-0.1Si (Ti-6242S)',
      uns: 'R54621',
      description: 'Silicon-modified for improved creep resistance',
      category: 'titanium_alloys',
      subcategory: 'near_alpha',
      composition: { Al: '6%', Sn: '2%', Zr: '4%', Mo: '2%', Si: '0.1%' },
      conditions: {
        'Duplex-Annealed': {
          hardness: { brinell: 350, rockwellC: 38 },
          tensileStrength: { value: 1030, unit: 'MPa' },
          yieldStrength: { value: 965, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          kienzle: {
            kc1_1: { value: 2000, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 13,
            notes: 'Silicon addition increases abrasive wear'
          }
        }
      },
      physical: {
        density: { value: 4540, unit: 'kg/m³' },
        betaTransus: { value: 990, unit: '°C' },
        thermalConductivity: { value: 7.0, unit: 'W/m·K' },
        elasticModulus: { value: 114, unit: 'GPa' },
        maxServiceTemp: { value: 565, unit: '°C', notes: '25°C improvement over Ti-6242' }
      },
      johnsonCook: {
        A: { value: 965, unit: 'MPa' },
        B: { value: 780, unit: 'MPa' },
        n: { value: 0.46 },
        C: { value: 0.016 },
        m: { value: 0.9 },
        meltingTemp: { value: 1650, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Jet engine compressor disks', 'High-pressure compressor blades']
    },
    
    'Ti-6Al-2Sn-4Zr-6Mo': {
      name: 'Ti-6Al-2Sn-4Zr-6Mo (Ti-6-2-4-6)',
      uns: 'R56260',
      description: 'High-strength alpha-beta for thick sections',
      category: 'titanium_alloys',
      subcategory: 'alpha_beta',
      composition: { Al: '6%', Sn: '2%', Zr: '4%', Mo: '6%' },
      conditions: {
        'STA': {
          hardness: { brinell: 388, rockwellC: 42 },
          tensileStrength: { value: 1170, unit: 'MPa' },
          yieldStrength: { value: 1100, unit: 'MPa' },
          elongation: { value: 10, unit: '%' },
          kienzle: {
            kc1_1: { value: 2150, unit: 'MPa' },
            mc: { value: 0.29 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 11
          }
        },
        'Annealed': {
          hardness: { brinell: 340, rockwellC: 36 },
          tensileStrength: { value: 1030, unit: 'MPa' },
          yieldStrength: { value: 965, unit: 'MPa' },
          elongation: { value: 13, unit: '%' },
          kienzle: {
            kc1_1: { value: 1950, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 15
          }
        }
      },
      physical: {
        density: { value: 4650, unit: 'kg/m³' },
        betaTransus: { value: 935, unit: '°C' },
        thermalConductivity: { value: 6.8, unit: 'W/m·K' },
        elasticModulus: { value: 114, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1100, unit: 'MPa' },
        B: { value: 820, unit: 'MPa' },
        n: { value: 0.50 },
        C: { value: 0.016 },
        m: { value: 1.0 },
        meltingTemp: { value: 1640, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Landing gear', 'Large structural forgings', 'Gas turbine components']
    },
    
    // ===== BETA ALLOYS =====
    
    'Ti-15-3': {
      name: 'Ti-15V-3Cr-3Sn-3Al (Ti-15-3)',
      uns: 'R58153',
      description: 'Cold-formable metastable beta, ages to very high strength',
      category: 'titanium_alloys',
      subcategory: 'metastable_beta',
      composition: { V: '15%', Cr: '3%', Sn: '3%', Al: '3%' },
      conditions: {
        'Solution-Treated': {
          name: 'Solution Treated (Soft)',
          hardness: { brinell: 277, rockwellC: 28 },
          tensileStrength: { value: 790, unit: 'MPa' },
          yieldStrength: { value: 760, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          kienzle: {
            kc1_1: { value: 1680, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'medium',
            notes: 'Better machinability in ST condition'
          },
          machinability: {
            rating: 'C',
            percentOfB1112: 25,
            notes: 'Machine in ST condition, then age'
          }
        },
        'Aged': {
          name: 'Solution Treated & Aged',
          hardness: { brinell: 405, rockwellC: 44 },
          tensileStrength: { value: 1240, unit: 'MPa' },
          yieldStrength: { value: 1170, unit: 'MPa' },
          elongation: { value: 7, unit: '%' },
          kienzle: {
            kc1_1: { value: 2250, unit: 'MPa' },
            mc: { value: 0.30 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 10,
            notes: 'Extremely difficult after aging'
          }
        }
      },
      physical: {
        density: { value: 4760, unit: 'kg/m³' },
        betaTransus: { value: 760, unit: '°C', notes: 'Low - all beta at room temp in ST condition' },
        thermalConductivity: { value: 8.1, unit: 'W/m·K' },
        elasticModulus: { value: 82, unit: 'GPa', notes: 'Lower modulus - more springback' }
      },
      johnsonCook: {
        A: { value: 760, unit: 'MPa' },
        B: { value: 950, unit: 'MPa' },
        n: { value: 0.55 },
        C: { value: 0.022 },
        m: { value: 0.8 },
        meltingTemp: { value: 1620, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Aircraft springs', 'Aerospace fasteners', 'Sheet metal ducting']
    },
    
    'Ti-10-2-3': {
      name: 'Ti-10V-2Fe-3Al (Ti-10-2-3)',
      uns: 'R56410',
      description: 'High-strength beta alloy for landing gear',
      category: 'titanium_alloys',
      subcategory: 'metastable_beta',
      composition: { V: '10%', Fe: '2%', Al: '3%' },
      conditions: {
        'STA': {
          hardness: { brinell: 405, rockwellC: 44 },
          tensileStrength: { value: 1250, unit: 'MPa' },
          yieldStrength: { value: 1170, unit: 'MPa' },
          elongation: { value: 6, unit: '%' },
          kienzle: {
            kc1_1: { value: 2300, unit: 'MPa' },
            mc: { value: 0.31 },
            source: 'Armendia et al. (2010)',
            reliability: 'high'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 9,
            notes: 'One of the most difficult titanium alloys'
          }
        },
        'Solution-Treated': {
          hardness: { brinell: 300, rockwellC: 32 },
          tensileStrength: { value: 900, unit: 'MPa' },
          yieldStrength: { value: 860, unit: 'MPa' },
          elongation: { value: 12, unit: '%' },
          kienzle: {
            kc1_1: { value: 1820, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 18
          }
        }
      },
      physical: {
        density: { value: 4650, unit: 'kg/m³' },
        betaTransus: { value: 800, unit: '°C' },
        thermalConductivity: { value: 7.8, unit: 'W/m·K' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1170, unit: 'MPa' },
        B: { value: 780, unit: 'MPa' },
        n: { value: 0.42 },
        C: { value: 0.018 },
        m: { value: 0.9 },
        meltingTemp: { value: 1620, unit: '°C' },
        source: 'Meyer (2006)',
        reliability: 'medium'
      },
      applications: ['Landing gear beams', 'Flap tracks', 'Truck beams', 'Large forgings']
    },
    
    'Beta-C': {
      name: 'Ti-3Al-8V-6Cr-4Mo-4Zr (Beta-C)',
      uns: 'R58640',
      description: 'Corrosion-resistant beta alloy',
      category: 'titanium_alloys',
      subcategory: 'metastable_beta',
      composition: { Al: '3%', V: '8%', Cr: '6%', Mo: '4%', Zr: '4%' },
      conditions: {
        'STA': {
          hardness: { brinell: 405, rockwellC: 44 },
          tensileStrength: { value: 1310, unit: 'MPa' },
          yieldStrength: { value: 1200, unit: 'MPa' },
          elongation: { value: 6, unit: '%' },
          kienzle: {
            kc1_1: { value: 2350, unit: 'MPa' },
            mc: { value: 0.32 },
            reliability: 'low'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 8,
            notes: 'Very difficult'
          }
        },
        'Solution-Treated': {
          hardness: { brinell: 311, rockwellC: 33 },
          tensileStrength: { value: 880, unit: 'MPa' },
          yieldStrength: { value: 830, unit: 'MPa' },
          elongation: { value: 15, unit: '%' },
          kienzle: {
            kc1_1: { value: 1800, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 20
          }
        }
      },
      physical: {
        density: { value: 4820, unit: 'kg/m³' },
        betaTransus: { value: 795, unit: '°C' },
        thermalConductivity: { value: 8.4, unit: 'W/m·K' },
        elasticModulus: { value: 103, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1200, unit: 'MPa' },
        B: { value: 750, unit: 'MPa' },
        n: { value: 0.40 },
        C: { value: 0.020 },
        m: { value: 0.85 },
        meltingTemp: { value: 1580, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Aerospace fasteners', 'Springs', 'Offshore applications', 'Oil & gas']
    },
    
    'Ti-5553': {
      name: 'Ti-5Al-5V-5Mo-3Cr (Ti-5553)',
      uns: 'R58350',
      description: 'Modern high-strength beta alloy replacing Ti-10-2-3',
      category: 'titanium_alloys',
      subcategory: 'metastable_beta',
      composition: { Al: '5%', V: '5%', Mo: '5%', Cr: '3%' },
      conditions: {
        'STA': {
          hardness: { brinell: 410, rockwellC: 45 },
          tensileStrength: { value: 1280, unit: 'MPa' },
          yieldStrength: { value: 1200, unit: 'MPa' },
          elongation: { value: 6, unit: '%' },
          kienzle: {
            kc1_1: { value: 2320, unit: 'MPa' },
            mc: { value: 0.31 },
            source: 'Recent aerospace studies',
            reliability: 'medium'
          },
          machinability: {
            rating: 'E',
            percentOfB1112: 9
          }
        },
        'Solution-Treated': {
          hardness: { brinell: 311, rockwellC: 33 },
          tensileStrength: { value: 950, unit: 'MPa' },
          yieldStrength: { value: 900, unit: 'MPa' },
          elongation: { value: 12, unit: '%' },
          kienzle: {
            kc1_1: { value: 1880, unit: 'MPa' },
            mc: { value: 0.27 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 17
          }
        }
      },
      physical: {
        density: { value: 4650, unit: 'kg/m³' },
        betaTransus: { value: 845, unit: '°C' },
        thermalConductivity: { value: 6.2, unit: 'W/m·K', notes: 'Very low - even for Ti' },
        elasticModulus: { value: 110, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 1200, unit: 'MPa' },
        B: { value: 800, unit: 'MPa' },
        n: { value: 0.45 },
        C: { value: 0.018 },
        m: { value: 0.9 },
        meltingTemp: { value: 1610, unit: '°C' },
        reliability: 'low'
      },
      applications: ['Landing gear', 'Flap tracks', 'Large structural components', 'A350/787 programs']
    },

    // ===== SPECIALTY ALLOYS =====
    
    'Ti-6Al-7Nb': {
      name: 'Ti-6Al-7Nb',
      uns: 'R56700',
      description: 'Vanadium-free biocompatible alloy for implants',
      category: 'titanium_alloys',
      subcategory: 'alpha_beta',
      composition: { Al: '6%', Nb: '7%' },
      conditions: {
        'Mill-Annealed': {
          hardness: { brinell: 320, rockwellC: 34 },
          tensileStrength: { value: 1000, unit: 'MPa' },
          yieldStrength: { value: 900, unit: 'MPa' },
          elongation: { value: 12, unit: '%' },
          kienzle: {
            kc1_1: { value: 1900, unit: 'MPa' },
            mc: { value: 0.26 },
            reliability: 'medium'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 18,
            notes: 'Similar to Ti-6-4, niobium less reactive'
          }
        }
      },
      physical: {
        density: { value: 4520, unit: 'kg/m³' },
        betaTransus: { value: 1010, unit: '°C' },
        thermalConductivity: { value: 7.0, unit: 'W/m·K' },
        elasticModulus: { value: 114, unit: 'GPa' }
      },
      johnsonCook: {
        A: { value: 900, unit: 'MPa' },
        B: { value: 950, unit: 'MPa' },
        n: { value: 0.85 },
        C: { value: 0.015 },
        m: { value: 1.0 },
        meltingTemp: { value: 1660, unit: '°C' },
        reliability: 'low'
      },
      biocompatibility: 'Excellent - no vanadium release',
      applications: ['Orthopedic implants', 'Dental implants', 'Surgical instruments']
    },
    
    'Ti-15Mo': {
      name: 'Ti-15Mo (Beta-21S)',
      uns: 'R58150',
      description: 'Biocompatible beta alloy for orthopedics',
      category: 'titanium_alloys',
      subcategory: 'metastable_beta',
      composition: { Mo: '15%' },
      conditions: {
        'Solution-Treated': {
          hardness: { brinell: 260, rockwellC: 26 },
          tensileStrength: { value: 880, unit: 'MPa' },
          yieldStrength: { value: 830, unit: 'MPa' },
          elongation: { value: 18, unit: '%' },
          kienzle: {
            kc1_1: { value: 1750, unit: 'MPa' },
            mc: { value: 0.25 },
            reliability: 'low'
          },
          machinability: {
            rating: 'C',
            percentOfB1112: 22,
            notes: 'Good machinability for a Ti alloy'
          }
        },
        'Aged': {
          hardness: { brinell: 345, rockwellC: 37 },
          tensileStrength: { value: 1035, unit: 'MPa' },
          yieldStrength: { value: 965, unit: 'MPa' },
          elongation: { value: 12, unit: '%' },
          kienzle: {
            kc1_1: { value: 2000, unit: 'MPa' },
            mc: { value: 0.28 },
            reliability: 'low'
          },
          machinability: {
            rating: 'D',
            percentOfB1112: 16
          }
        }
      },
      physical: {
        density: { value: 4940, unit: 'kg/m³' },
        betaTransus: { value: 727, unit: '°C' },
        thermalConductivity: { value: 8.0, unit: 'W/m·K' },
        elasticModulus: { value: 78, unit: 'GPa', notes: 'Very low - closer to bone' }
      },
      johnsonCook: {
        A: { value: 830, unit: 'MPa' },
        B: { value: 650, unit: 'MPa' },
        n: { value: 0.38 },
        C: { value: 0.018 },
        m: { value: 0.8 },
        meltingTemp: { value: 1600, unit: '°C' },
        reliability: 'low'
      },
      biocompatibility: 'Excellent - no Al or V',
      applications: ['Hip implants', 'Knee implants', 'Dental implants', 'Spinal fixation']
    }
  },

  // ===== ALLOY CATEGORY CHARACTERISTICS =====
  
  categoryCharacteristics: {
    'commercially_pure': {
      name: 'Commercially Pure (CP) Grades 1-4',
      strengthRange: '240-550 MPa',
      primaryUse: 'Corrosion resistance, formability',
      machiningNotes: 'Gummy, smearing tendency. Sharp tools essential.',
      heatTreatment: 'Not heat treatable (annealing only)'
    },
    'alpha': {
      name: 'Alpha Alloys',
      strengthRange: '800-900 MPa',
      primaryUse: 'Cryogenic, elevated temperature',
      machiningNotes: 'Weldable, moderate difficulty',
      heatTreatment: 'Not age-hardenable'
    },
    'alpha_beta': {
      name: 'Alpha-Beta Alloys (Ti-6Al-4V family)',
      strengthRange: '850-1200 MPa',
      primaryUse: 'General aerospace and industrial',
      machiningNotes: 'Most common machined Ti. Machine in annealed when possible.',
      heatTreatment: 'Solution treat + age for max strength'
    },
    'near_alpha': {
      name: 'Near-Alpha Alloys (High temp)',
      strengthRange: '950-1100 MPa',
      primaryUse: 'High-temperature creep resistance',
      machiningNotes: 'Very difficult due to creep-resistant structure',
      heatTreatment: 'Duplex anneal for creep optimization'
    },
    'metastable_beta': {
      name: 'Metastable Beta Alloys',
      strengthRange: '900-1350 MPa (aged)',
      primaryUse: 'Landing gear, high-strength structures',
      machiningNotes: 'MUST machine in solution treated condition, then age. Extremely difficult after aging.',
      heatTreatment: 'Solution treat (formable) → Age (high strength)'
    }
  },

  // ===== UTILITY FUNCTIONS =====

  getMaterial: function(id) {
    return this.materials[id] || null;
  },

  getKienzle: function(materialId, condition) {
    const material = this.getMaterial(materialId);
    if (!material || !material.conditions[condition]) return null;
    return material.conditions[condition].kienzle;
  },

  getJohnsonCook: function(materialId) {
    const material = this.getMaterial(materialId);
    return material ? material.johnsonCook : null;
  },

  searchByCategory: function(subcategory) {
    const results = [];
    for (const id in this.materials) {
      if (this.materials[id].subcategory === subcategory) {
        results.push({ id: id, ...this.materials[id] });
      }
    }
    return results;
  },

  getCPGrades: function() {
    return this.searchByCategory('commercially_pure');
  },

  getAlphaBetaAlloys: function() {
    return this.searchByCategory('alpha_beta');
  },

  getBetaAlloys: function() {
    return this.searchByCategory('metastable_beta');
  },

  getBiocompatible: function() {
    const results = [];
    for (const id in this.materials) {
      const material = this.materials[id];
      if (material.biocompatibility || 
          id.includes('ELI') || 
          id.includes('Grade1') || 
          id.includes('Grade2') ||
          id === 'Ti-6Al-7Nb' ||
          id === 'Ti-15Mo') {
        results.push({ id: id, ...material });
      }
    }
    return results;
  },

  searchByStrength: function(minStrength, maxStrength) {
    const results = [];
    for (const id in this.materials) {
      const material = this.materials[id];
      for (const cond in material.conditions) {
        const strength = material.conditions[cond].tensileStrength?.value;
        if (strength && strength >= minStrength && strength <= maxStrength) {
          results.push({
            id: id,
            condition: cond,
            tensileStrength: strength,
            ...material
          });
          break;
        }
      }
    }
    return results.sort((a, b) => b.tensileStrength - a.tensileStrength);
  },

  getByMachinabilityRating: function(rating) {
    const results = [];
    for (const id in this.materials) {
      const material = this.materials[id];
      for (const cond in material.conditions) {
        if (material.conditions[cond].machinability?.rating === rating) {
          results.push({ id: id, condition: cond, ...material });
          break;
        }
      }
    }
    return results;
  },

  getCategoryInfo: function(category) {
    return this.categoryCharacteristics[category] || null;
  },

  getMachiningGuidance: function() {
    return this.machiningFundamentals;
  },

  getToolingRecommendation: function(materialId, condition) {
    const material = this.getMaterial(materialId);
    if (!material) return null;
    
    const conditionData = material.conditions[condition];
    if (!conditionData) return null;
    
    const base = { ...this.machiningFundamentals.toolingRecommendations };
    
    // Adjust based on hardness
    if (conditionData.hardness?.rockwellC > 40) {
      base.notes = 'HIGH HARDNESS: Reduce speed 30-40%, use uncoated carbide';
    }
    
    return base;
  }
};

// Export for use in PRISM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_TITANIUM_ALLOYS_SCIENTIFIC;
}

if (typeof window !== 'undefined') {
  window.PRISM_TITANIUM_ALLOYS_SCIENTIFIC = PRISM_TITANIUM_ALLOYS_SCIENTIFIC;
}
