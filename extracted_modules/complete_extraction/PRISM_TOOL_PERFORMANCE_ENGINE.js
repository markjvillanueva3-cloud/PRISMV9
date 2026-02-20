const PRISM_TOOL_PERFORMANCE_ENGINE = {
  version: '1.0.0',

  // PERFORMANCE DATA TABLES

  data: {
    // Coating performance - comprehensive
    coatings: {
      'uncoated': {
        speedFactor: 1.0,
        lifeFactor: 1.0,
        finishFactor: 1.0,
        heatResist: 400,  // Max temp °F
        frictionCoef: 0.4,
        bestFor: ['aluminum', 'brass', 'copper'],
        avoidFor: ['titanium', 'inconel']
      },
      'TiN': {
        speedFactor: 1.2,
        lifeFactor: 1.5,
        finishFactor: 1.1,
        heatResist: 1000,
        frictionCoef: 0.35,
        bestFor: ['steel', 'cast_iron'],
        avoidFor: ['aluminum'] // Can cause buildup
      },
    // EXPANDED MANUFACTURER TOOLING v1.0 - Tools with Cutting Data Integration
    // Added: 2026-01-06
    // Manufacturers: Guhring, SGS/Kyocera, YG-1, Tungaloy, Dormer Pramet,
    //                WIDIA, Fraisa, IMCO, Nachi, MOLDINO

    guhring_tools: {
      version: '1.0.0',
      manufacturer: 'Guhring',
      country: 'Germany',

      endmills: {
        // Ratio Series - Variable Helix for chatter reduction
        'RF100_U_3FL': {
          series: 'RF 100 U',
          type: 'square_endmill',
          flutes: 3,
          material: 'solid_carbide',
          coating: 'Fire',
          helix: 'variable_35_38',
          sizes_mm: [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20],
          sizes_inch: [0.125, 0.1875, 0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 1.0],
          loc_mult: 3,
          applications: ['steel', 'stainless', 'titanium'],
          cutting_data_ref: 'guhring'  // Links to MANUFACTURER_CUTTING_DATA.endmills.guhring
        },
        'RF100_A_4FL': {
          series: 'RF 100 A',
          type: 'square_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'Fire',
          helix: 'variable_35_38',
          sizes_mm: [4, 5, 6, 8, 10, 12, 14, 16, 20, 25],
          loc_mult: 4,
          applications: ['aluminum', 'non_ferrous'],
          cutting_data_ref: 'guhring'
        },
        'RF100_F_5FL': {
          series: 'RF 100 F',
          type: 'finishing_endmill',
          flutes: 5,
          material: 'solid_carbide',
          coating: 'Fire',
          helix: 45,
          sizes_mm: [6, 8, 10, 12, 16, 20],
          applications: ['steel', 'stainless', 'finishing'],
          cutting_data_ref: 'guhring'
        }
      },
      drills: {
        'RT100_U': {
          series: 'RT 100 U',
          type: 'solid_carbide_drill',
          point_angle: 140,
          coating: 'Fire',
          coolant: 'through',
          depth_mult: 5,
          sizes_mm: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20],
          applications: ['universal', 'steel', 'stainless', 'cast_iron']
        },
        'RT100_T': {
          series: 'RT 100 T',
          type: 'solid_carbide_drill',
          point_angle: 140,
          coating: 'Fire',
          coolant: 'through',
          depth_mult: 8,
          applications: ['deep_hole', 'steel']
        }
      }
    },
    sgs_kyocera_tools: {
      version: '1.0.0',
      manufacturer: 'SGS Tool / Kyocera',
      country: 'USA/Japan',

      endmills: {
        'S_CARB_SERIES_43': {
          series: 'S-Carb 43',
          type: 'square_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'Ti-NAMITE-A',
          helix: 35,
          corner_radius: 0,
          sizes_inch: [0.0625, 0.09375, 0.125, 0.15625, 0.1875, 0.25, 0.3125, 0.375, 0.4375, 0.5, 0.625, 0.75, 1.0],
          loc_mult: 3,
          applications: ['steel', 'stainless', 'high_temp_alloys'],
          cutting_data_ref: 'sgs_kyocera'
        },
        'S_CARB_SERIES_44_CR': {
          series: 'S-Carb 44 CR',
          type: 'corner_radius_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'Ti-NAMITE-A',
          helix: 35,
          corner_radii: [0.005, 0.010, 0.015, 0.020, 0.030, 0.060, 0.090, 0.120],
          applications: ['finishing', 'mold_die'],
          cutting_data_ref: 'sgs_kyocera'
        },
        'S_CARB_APF_5FL': {
          series: 'S-Carb APF',
          type: 'finishing_endmill',
          flutes: 5,
          material: 'solid_carbide',
          coating: 'Z-Carb',
          helix: 38,
          applications: ['aerospace', 'finishing', 'titanium'],
          cutting_data_ref: 'sgs_kyocera'
        }
      }
    },
    yg1_tools: {
      version: '1.0.0',
      manufacturer: 'YG-1',
      country: 'South Korea',

      endmills: {
        'POWER_A_4FL': {
          series: 'Power-A',
          type: 'square_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'X-Coating',
          helix: 35,
          sizes_mm: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20],
          sizes_inch: [0.0625, 0.125, 0.1875, 0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 1.0],
          loc_mult: 3,
          applications: ['steel', 'stainless', 'general'],
          cutting_data_ref: 'yg1'
        },
        'V7_PLUS_5FL': {
          series: 'V7 Plus',
          type: 'high_performance_endmill',
          flutes: 5,
          material: 'solid_carbide',
          coating: 'YG Coating',
          helix: 'variable_38_42',
          sizes_mm: [6, 8, 10, 12, 16, 20],
          applications: ['hardened_steel', 'high_speed'],
          cutting_data_ref: 'yg1'
        },
        'ALU_POWER_3FL': {
          series: 'Alu-Power',
          type: 'aluminum_endmill',
          flutes: 3,
          material: 'solid_carbide',
          coating: 'uncoated_polished',
          helix: 45,
          sizes_mm: [4, 6, 8, 10, 12, 16, 20, 25],
          applications: ['aluminum', 'non_ferrous', 'plastics'],
          cutting_data_ref: 'yg1'
        }
      },
      drills: {
        'DREAM_DRILL_INOX': {
          series: 'Dream Drill Inox',
          type: 'solid_carbide_drill',
          point_angle: 140,
          coating: 'TiAlN',
          coolant: 'through',
          applications: ['stainless', 'titanium']
        },
        'DREAM_DRILL_ALU': {
          series: 'Dream Drill Alu',
          type: 'solid_carbide_drill',
          point_angle: 130,
          coating: 'ZrN',
          coolant: 'through',
          applications: ['aluminum', 'non_ferrous']
        }
      },
      taps: {
        'COMBO_TAP': {
          series: 'Combo Tap',
          type: 'forming_tap',
          coating: 'TiN',
          thread_types: ['UNC', 'UNF', 'M'],
          applications: ['aluminum', 'steel', 'general']
        }
      }
    },
    tungaloy_tools: {
      version: '1.0.0',
      manufacturer: 'Tungaloy',
      country: 'Japan',

      endmills: {
        'DOFEED_4FL': {
          series: 'DoFeed',
          type: 'high_feed_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'AH8015',
          helix: 30,
          corner_radius: 1.0,
          sizes_mm: [8, 10, 12, 16, 20, 25, 32],
          applications: ['steel', 'cast_iron', 'high_feed_milling'],
          cutting_data_ref: 'tungaloy'
        },
        'ADDMEISTERBALL': {
          series: 'AddMeisterBall',
          type: 'ball_endmill',
          flutes: 2,
          material: 'solid_carbide',
          coating: 'AH725',
          sizes_mm: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12],
          applications: ['mold_die', '3d_finishing', 'hardened_steel'],
          cutting_data_ref: 'tungaloy'
        }
      },
      indexable_milling: {
        'DOFEED_INDEXABLE': {
          series: 'DoFeed',
          type: 'high_feed_face_mill',
          insert_style: 'LNMU',
          cutter_diameters: [32, 40, 50, 63, 80, 100, 125, 160],
          max_doc: 1.5,
          applications: ['roughing', 'high_mrr']
        },
        'TUNGSIX': {
          series: 'TungSix',
          type: 'hexagonal_insert_mill',
          insert_style: 'HNMU',
          cutter_diameters: [50, 63, 80, 100, 125, 160, 200],
          max_doc: 3.0,
          applications: ['steel', 'stainless', 'cast_iron']
        }
      }
    },
    dormer_pramet_tools: {
      version: '1.0.0',
      manufacturer: 'Dormer Pramet',
      parent: 'Sandvik',
      country: 'UK/Czech Republic',

      endmills: {
        'S1_SOLID': {
          series: 'S1',
          type: 'square_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'TiAlN',
          sizes_mm: [3, 4, 5, 6, 8, 10, 12, 16, 20],
          applications: ['steel', 'stainless', 'general'],
          cutting_data_ref: 'dormer_pramet'
        },
        'S6_FINISHING': {
          series: 'S6',
          type: 'finishing_endmill',
          flutes: 6,
          material: 'solid_carbide',
          coating: 'TiAlN',
          sizes_mm: [6, 8, 10, 12, 16, 20],
          applications: ['finishing', 'hardened_steel'],
          cutting_data_ref: 'dormer_pramet'
        }
      },
      drills: {
        'R458': {
          series: 'R458',
          type: 'solid_carbide_drill',
          point_angle: 140,
          coating: 'TiAlN',
          coolant: 'through',
          depth_mult: 5,
          applications: ['steel', 'stainless', 'general']
        },
        'A002': {
          series: 'A002',
          type: 'hss_drill',
          point_angle: 118,
          coating: 'steam_oxide',
          applications: ['general', 'economy']
        }
      },
      taps: {
        'E286': {
          series: 'E286',
          type: 'spiral_flute_tap',
          material: 'HSS-E',
          coating: 'TiN',
          thread_types: ['M', 'UNC', 'UNF'],
          applications: ['blind_holes', 'steel']
        }
      }
    },
    widia_tools: {
      version: '1.0.0',
      manufacturer: 'WIDIA',
      parent: 'Kennametal',
      country: 'USA',

      endmills: {
        'VARIMILL': {
          series: 'VariMill',
          type: 'variable_helix_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'AlTiN',
          helix: 'variable',
          sizes_inch: [0.125, 0.1875, 0.25, 0.3125, 0.375, 0.5, 0.625, 0.75, 1.0],
          applications: ['steel', 'stainless', 'chatter_reduction'],
          cutting_data_ref: 'widia'
        },
        'VARIMILL_XTREME': {
          series: 'VariMill Xtreme',
          type: 'high_performance_endmill',
          flutes: 5,
          material: 'solid_carbide',
          coating: 'TiAlN',
          helix: 'variable',
          applications: ['titanium', 'superalloys', 'aerospace'],
          cutting_data_ref: 'widia'
        }
      },
      indexable_milling: {
        'M370': {
          series: 'M370',
          type: 'square_shoulder_mill',
          insert_style: 'XOMT',
          cutter_diameters: [25, 32, 40, 50, 63, 80],
          max_doc: 10,
          applications: ['steel', 'stainless', 'shoulder_milling']
        },
        'M680': {
          series: 'M680',
          type: 'high_feed_mill',
          insert_style: 'LOEX',
          cutter_diameters: [32, 40, 50, 63, 80, 100],
          max_doc: 1.2,
          applications: ['high_feed', 'roughing']
        }
      }
    },
    fraisa_tools: {
      version: '1.0.0',
      manufacturer: 'Fraisa',
      country: 'Switzerland',

      endmills: {
        'AX_FPS': {
          series: 'AX-FPS',
          type: 'finishing_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'nano_coating',
          helix: 38,
          sizes_mm: [2, 3, 4, 5, 6, 8, 10, 12, 16, 20],
          applications: ['hardened_steel', 'precision_finishing'],
          cutting_data_ref: 'fraisa'
        },
        'AX_UMT': {
          series: 'AX-UMT',
          type: 'universal_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'P-coating',
          sizes_mm: [3, 4, 5, 6, 8, 10, 12, 16, 20],
          applications: ['steel', 'stainless', 'universal'],
          cutting_data_ref: 'fraisa'
        },
        'AX_NVD': {
          series: 'AX-NVD',
          type: 'aluminum_endmill',
          flutes: 3,
          material: 'solid_carbide',
          coating: 'DLC',
          helix: 45,
          applications: ['aluminum', 'composites', 'high_speed'],
          cutting_data_ref: 'fraisa'
        }
      },
      thread_mills: {
        'AX_TMS': {
          series: 'AX-TMS',
          type: 'thread_mill_solid',
          material: 'solid_carbide',
          coating: 'nano_coating',
          thread_types: ['M', 'UNC', 'UNF', 'G'],
          applications: ['universal_threading']
        }
      }
    },
    imco_tools: {
      version: '1.0.0',
      manufacturer: 'IMCO Carbide Tool',
      country: 'USA',

      endmills: {
        'POW_R_FEED': {
          series: 'POW-R-FEED',
          type: 'high_feed_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'TiAlN',
          corner_radius: 'large',
          sizes_inch: [0.25, 0.375, 0.5, 0.625, 0.75, 1.0, 1.25],
          applications: ['high_feed', 'roughing', 'steel'],
          cutting_data_ref: 'imco'
        },
        'POW_R_TUFF': {
          series: 'POW-R-TUFF',
          type: 'roughing_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'TiCN',
          chipbreaker: true,
          applications: ['heavy_roughing', 'slotting'],
          cutting_data_ref: 'imco'
        },
        'M7_SERIES': {
          series: 'M7',
          type: 'general_purpose_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'TiAlN',
          helix: 35,
          sizes_inch: [0.0625, 0.125, 0.1875, 0.25, 0.375, 0.5, 0.75, 1.0],
          applications: ['steel', 'stainless', 'general'],
          cutting_data_ref: 'imco'
        }
      }
    },
    nachi_tools: {
      version: '1.0.0',
      manufacturer: 'Nachi-Fujikoshi',
      country: 'Japan',

      endmills: {
        'AQDEX_STANDARD': {
          series: 'AQDEX',
          type: 'square_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'Aqua_EX',
          helix: 35,
          sizes_mm: [3, 4, 5, 6, 8, 10, 12, 16, 20],
          applications: ['steel', 'stainless', 'general'],
          cutting_data_ref: 'nachi'
        },
        'AQDEX_DLC': {
          series: 'AQDEX DLC',
          type: 'aluminum_endmill',
          flutes: 3,
          material: 'solid_carbide',
          coating: 'DLC',
          helix: 45,
          sizes_mm: [4, 6, 8, 10, 12, 16, 20],
          applications: ['aluminum', 'non_ferrous', 'high_speed'],
          cutting_data_ref: 'nachi'
        },
        'GS_MILL_HARD': {
          series: 'GS Mill Hard',
          type: 'hardened_steel_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'GS_coating',
          applications: ['hardened_steel_50_65hrc'],
          cutting_data_ref: 'nachi'
        }
      },
      drills: {
        'AQUA_DRILL_EX': {
          series: 'AQUA Drill EX',
          type: 'solid_carbide_drill',
          point_angle: 140,
          coating: 'Aqua_EX',
          coolant: 'through',
          depth_mult: [3, 5, 8, 10, 15, 20],
          applications: ['steel', 'stainless', 'cast_iron']
        },
        'SG_FAX_COATED': {
          series: 'SG-FAX Coated',
          type: 'solid_carbide_drill',
          point_angle: 135,
          coating: 'TiAlN',
          applications: ['general', 'high_precision']
        }
      },
      taps: {
        'SU_TAP': {
          series: 'SU+',
          type: 'spiral_point_tap',
          material: 'HSS-E_PM',
          coating: 'TiCN',
          thread_types: ['M', 'UNC', 'UNF'],
          applications: ['through_holes', 'steel', 'stainless']
        }
      }
    },
    moldino_tools: {
      version: '1.0.0',
      manufacturer: 'MOLDINO Tool Engineering',
      former_name: 'Hitachi Tool',
      country: 'Japan',

      endmills: {
        'EPOCH_SH': {
          series: 'EPOCH SH',
          type: 'ball_endmill',
          flutes: 2,
          material: 'solid_carbide',
          coating: 'TH_coating',
          sizes_mm: [0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 3, 4, 5, 6, 8, 10],
          applications: ['hardened_steel', 'mold_die', 'micro_machining'],
          cutting_data_ref: 'moldino'
        },
        'EPOCH_DEEP_BALL': {
          series: 'EPOCH Deep Ball',
          type: 'long_reach_ball',
          flutes: 2,
          material: 'solid_carbide',
          coating: 'ATH_coating',
          reach_mult: 12,
          applications: ['deep_cavity', 'mold_die'],
          cutting_data_ref: 'moldino'
        },
        'EPOCH_PANACEA': {
          series: 'EPOCH Panacea',
          type: 'square_endmill',
          flutes: 4,
          material: 'solid_carbide',
          coating: 'ATH_coating',
          helix: 40,
          sizes_mm: [4, 5, 6, 8, 10, 12, 16, 20],
          applications: ['steel', 'stainless', 'hardened_steel'],
          cutting_data_ref: 'moldino'
        }
      },
      specialty: {
        'GRAPHITE_STAR': {
          series: 'Graphite Star',
          type: 'graphite_endmill',
          flutes: 2,
          material: 'solid_carbide',
          coating: 'diamond_like',
          applications: ['graphite', 'edm_electrodes']
        },
        'EPOCH_PENCIL': {
          series: 'EPOCH Pencil',
          type: 'tapered_ball',
          flutes: 2,
          material: 'solid_carbide',
          taper_angles: [0.5, 1, 1.5, 2, 3, 5],
          applications: ['mold_ribs', 'draft_angles']
        }
      }
    },
      'TiCN': {
        speedFactor: 1.3,
        lifeFactor: 1.7,
        finishFactor: 1.15,
        heatResist: 800,
        frictionCoef: 0.3,
        bestFor: ['steel', 'stainless'],
        avoidFor: []
      },
      'TiAlN': {
        speedFactor: 1.5,
        lifeFactor: 2.2,
        finishFactor: 1.2,
        heatResist: 1500,
        frictionCoef: 0.35,
        bestFor: ['steel', 'stainless', 'cast_iron', 'titanium'],
        avoidFor: ['aluminum']
      },
      'AlTiN': {
        speedFactor: 1.6,
        lifeFactor: 2.5,
        finishFactor: 1.25,
        heatResist: 1650,
        frictionCoef: 0.32,
        bestFor: ['hardened_steel', 'titanium', 'inconel'],
        avoidFor: ['aluminum']
      },
      'AlCrN': {
        speedFactor: 1.7,
        lifeFactor: 2.8,
        finishFactor: 1.3,
        heatResist: 1800,
        frictionCoef: 0.28,
        bestFor: ['hardened_steel', 'titanium', 'inconel', 'stainless'],
        avoidFor: []
      },
      'nACo': {
        speedFactor: 1.8,
        lifeFactor: 3.0,
        finishFactor: 1.35,
        heatResist: 2100,
        frictionCoef: 0.25,
        bestFor: ['hardened_steel', 'titanium', 'inconel', 'high_temp_alloys'],
        avoidFor: []
      },
      'DLC': {
        speedFactor: 1.5,
        lifeFactor: 3.5,
        finishFactor: 1.5,
        heatResist: 600, // Lower heat resist but excellent for non-ferrous
        frictionCoef: 0.1, // Extremely low friction
        bestFor: ['aluminum', 'copper', 'graphite', 'composites', 'plastics'],
        avoidFor: ['steel', 'titanium']
      },
      'ZrN': {
        speedFactor: 1.15,
        lifeFactor: 1.4,
        finishFactor: 1.3,
        heatResist: 1000,
        frictionCoef: 0.25,
        bestFor: ['aluminum', 'brass', 'copper'],
        avoidFor: []
      },
      'diamond': {
        speedFactor: 2.5,
        lifeFactor: 10.0,
        finishFactor: 2.0,
        heatResist: 1200,
        frictionCoef: 0.05,
        bestFor: ['aluminum', 'graphite', 'composites', 'ceramics'],
        avoidFor: ['steel', 'titanium', 'iron'] // Carbon dissolves into ferrous
      }
    },
    // Helix angle performance
    helixAngles: {
      25: { chipEvac: 0.7, vibration: 0.9, finish: 0.85, bestFor: ['roughing', 'aluminum'] },
      30: { chipEvac: 0.8, vibration: 0.85, finish: 0.9, bestFor: ['general', 'steel'] },
      35: { chipEvac: 0.85, vibration: 0.8, finish: 0.92, bestFor: ['general', 'stainless'] },
      40: { chipEvac: 0.9, vibration: 0.75, finish: 0.95, bestFor: ['finishing', 'titanium'] },
      45: { chipEvac: 0.95, vibration: 0.7, finish: 0.97, bestFor: ['finishing', 'composites'] },
      50: { chipEvac: 0.98, vibration: 0.65, finish: 0.98, bestFor: ['aluminum', 'plastics'] },
      55: { chipEvac: 1.0, vibration: 0.6, finish: 1.0, bestFor: ['aluminum_finishing'] }
    },
    // Flute count performance by material
    flutePerformance: {
      aluminum: { optimal: 3, acceptable: [2, 3], avoid: [5, 6], chipSpace: 'high' },
      steel: { optimal: 4, acceptable: [3, 4, 5], avoid: [2], chipSpace: 'medium' },
      stainless: { optimal: 5, acceptable: [4, 5, 6], avoid: [2, 3], chipSpace: 'medium' },
      titanium: { optimal: 5, acceptable: [4, 5, 6], avoid: [2, 3], chipSpace: 'low' },
      inconel: { optimal: 6, acceptable: [5, 6, 7], avoid: [2, 3, 4], chipSpace: 'low' },
      cast_iron: { optimal: 4, acceptable: [3, 4, 5], avoid: [2], chipSpace: 'medium' },
      brass: { optimal: 2, acceptable: [2, 3], avoid: [5, 6], chipSpace: 'high' },
      copper: { optimal: 2, acceptable: [2, 3], avoid: [5, 6], chipSpace: 'high' },
      plastic: { optimal: 2, acceptable: [1, 2, 3], avoid: [5, 6], chipSpace: 'very_high' },
      composite: { optimal: 4, acceptable: [4, 6, 8], avoid: [], chipSpace: 'special' }
    },
    // Material removal rate (MRR) capability by tool type
    mrrCapability: {
      'standard_endmill': 1.0,
      'high_performance': 1.5,
      'high_feed': 2.5,
      'roughing': 2.0,
      'variable_helix': 1.3,
      'chipbreaker': 1.4,
      'serrated': 1.8,
      'finishing': 0.6,
      'ball_nose': 0.7
    },
    // Operation-specific tool ratings
    operationRatings: {
      'roughing': {
        preferredTypes: ['roughing', 'high_feed', 'serrated', 'chipbreaker'],
        preferredCoatings: ['TiAlN', 'AlTiN', 'AlCrN'],
        preferredFlutes: [3, 4, 5],
        preferredHelix: [30, 35],
        mrrImportance: 0.5,
        finishImportance: 0.1,
        lifeImportance: 0.4
      },
      'finishing': {
        preferredTypes: ['finishing', 'ball_nose', 'standard_endmill'],
        preferredCoatings: ['DLC', 'nACo', 'AlCrN', 'ZrN'],
        preferredFlutes: [4, 5, 6],
        preferredHelix: [40, 45, 50],
        mrrImportance: 0.1,
        finishImportance: 0.6,
        lifeImportance: 0.3
      },
      'slotting': {
        preferredTypes: ['standard_endmill', 'variable_helix'],
        preferredCoatings: ['TiAlN', 'AlTiN'],
        preferredFlutes: [3, 4],
        preferredHelix: [35, 40],
        mrrImportance: 0.3,
        finishImportance: 0.3,
        lifeImportance: 0.4
      },
      'pocketing': {
        preferredTypes: ['high_performance', 'variable_helix', 'chipbreaker'],
        preferredCoatings: ['TiAlN', 'AlTiN', 'AlCrN'],
        preferredFlutes: [3, 4, 5],
        preferredHelix: [35, 40, 45],
        mrrImportance: 0.4,
        finishImportance: 0.3,
        lifeImportance: 0.3
      },
      'profiling': {
        preferredTypes: ['standard_endmill', 'finishing', 'variable_helix'],
        preferredCoatings: ['TiAlN', 'nACo', 'DLC'],
        preferredFlutes: [4, 5],
        preferredHelix: [35, 40],
        mrrImportance: 0.2,
        finishImportance: 0.5,
        lifeImportance: 0.3
      },
      'drilling': {
        preferredTypes: ['drill', 'carbide_drill'],
        preferredCoatings: ['TiAlN', 'AlTiN'],
        preferredFlutes: [2],
        preferredHelix: [30],
        mrrImportance: 0.3,
        finishImportance: 0.3,
        lifeImportance: 0.4
      }
    },
    // Manufacturer performance ratings (specific to tool performance)
    manufacturerPerformance: {
      'sandvik': { speedCapability: 98, finishCapability: 96, lifeCapability: 95, consistency: 98 },
      'kennametal': { speedCapability: 94, finishCapability: 92, lifeCapability: 93, consistency: 95 },
      'iscar': { speedCapability: 95, finishCapability: 90, lifeCapability: 91, consistency: 92 },
      'seco': { speedCapability: 92, finishCapability: 91, lifeCapability: 90, consistency: 93 },
      'mitsubishi': { speedCapability: 93, finishCapability: 94, lifeCapability: 92, consistency: 95 },
      'walter': { speedCapability: 91, finishCapability: 93, lifeCapability: 91, consistency: 94 },
      'tungaloy': { speedCapability: 88, finishCapability: 88, lifeCapability: 87, consistency: 90 },
      'osg': { speedCapability: 90, finishCapability: 91, lifeCapability: 89, consistency: 91 },
      'guhring': { speedCapability: 89, finishCapability: 90, lifeCapability: 88, consistency: 90 },
      'emuge': { speedCapability: 88, finishCapability: 92, lifeCapability: 87, consistency: 91 },
      'harvey': { speedCapability: 85, finishCapability: 86, lifeCapability: 84, consistency: 87 },
      'helical': { speedCapability: 86, finishCapability: 87, lifeCapability: 85, consistency: 88 },
      'sgs': { speedCapability: 84, finishCapability: 85, lifeCapability: 83, consistency: 86 },
      'kyocera': { speedCapability: 87, finishCapability: 89, lifeCapability: 86, consistency: 89 },
      'sumitomo': { speedCapability: 88, finishCapability: 90, lifeCapability: 87, consistency: 90 },
      'moldino': { speedCapability: 95, finishCapability: 97, lifeCapability: 93, consistency: 96 },
      'yg-1': { speedCapability: 80, finishCapability: 78, lifeCapability: 79, consistency: 82 },
      'ma_ford': { speedCapability: 78, finishCapability: 76, lifeCapability: 77, consistency: 80 },
      'nachi': { speedCapability: 82, finishCapability: 81, lifeCapability: 80, consistency: 83 },
      'speed_tiger': { speedCapability: 83, finishCapability: 82, lifeCapability: 81, consistency: 84 },
      'accusize': { speedCapability: 70, finishCapability: 68, lifeCapability: 65, consistency: 72 },
      'generic': { speedCapability: 65, finishCapability: 62, lifeCapability: 60, consistency: 65 }
    }
  },
  // COMPREHENSIVE PERFORMANCE CALCULATION

  /**
   * Calculate complete performance score for a tool
   */
  calculatePerformance(tool, criteria) {
    const result = {
      overall: 0,
      breakdown: {
        speed: 0,         // Productivity/MRR capability
        quality: 0,       // Surface finish capability
        life: 0,          // Tool life/wear resistance
        material: 0,      // Material-specific optimization
        operation: 0,     // Operation-specific optimization
        geometry: 0,      // Geometry optimization
        rigidity: 0       // Vibration resistance
      },
      details: {},
      recommendations: []
    };
    // 1. Speed/Productivity Performance
    result.breakdown.speed = this._calculateSpeedPerformance(tool, criteria);

    // 2. Quality/Finish Performance
    result.breakdown.quality = this._calculateQualityPerformance(tool, criteria);

    // 3. Tool Life Performance
    result.breakdown.life = this._calculateLifePerformance(tool, criteria);

    // 4. Material-Specific Performance
    result.breakdown.material = this._calculateMaterialPerformance(tool, criteria);

    // 5. Operation-Specific Performance
    result.breakdown.operation = this._calculateOperationPerformance(tool, criteria);

    // 6. Geometry Performance
    result.breakdown.geometry = this._calculateGeometryPerformance(tool, criteria);

    // 7. Rigidity Performance
    result.breakdown.rigidity = this._calculateRigidityPerformance(tool, criteria);

    // Calculate weighted overall score based on operation type
    const weights = this._getWeightsForOperation(criteria.operation);

    result.overall =
      result.breakdown.speed * weights.speed +
      result.breakdown.quality * weights.quality +
      result.breakdown.life * weights.life +
      result.breakdown.material * weights.material +
      result.breakdown.operation * weights.operation +
      result.breakdown.geometry * weights.geometry +
      result.breakdown.rigidity * weights.rigidity;

    // Generate recommendations
    result.recommendations = this._generateRecommendations(tool, criteria, result.breakdown);

    return result;
  },
  _calculateSpeedPerformance(tool, criteria) {
    let score = 50; // Base

    // Coating speed factor
    const coating = this._identifyCoating(tool);
    const coatingData = this.data.coatings[coating] || this.data.coatings.uncoated;
    score += (coatingData.speedFactor - 1) * 30; // Up to +24 for best coatings

    // Tool type MRR capability
    const toolType = this._identifyToolType(tool);
    const mrrFactor = this.data.mrrCapability[toolType] || 1.0;
    score += (mrrFactor - 1) * 20; // Up to +30 for high-feed

    // Manufacturer speed capability
    const mfr = this._getMfrKey(tool);
    const mfrData = this.data.manufacturerPerformance[mfr] || this.data.manufacturerPerformance.generic;
    score += (mfrData.speedCapability - 80) * 0.5; // Up to +9 for top manufacturers

    return Math.min(Math.max(score, 0), 100);
  },
  _calculateQualityPerformance(tool, criteria) {
    let score = 50; // Base

    // Coating finish factor
    const coating = this._identifyCoating(tool);
    const coatingData = this.data.coatings[coating] || this.data.coatings.uncoated;
    score += (coatingData.finishFactor - 1) * 40; // Up to +40 for best

    // Helix angle for finish
    const helix = tool.helix || tool.helixAngle || 35;
    const helixData = this.data.helixAngles[this._roundHelix(helix)] || this.data.helixAngles[35];
    score += (helixData.finish - 0.85) * 50; // Up to +7.5 for high helix

    // Flute count for finish (more flutes = better finish generally)
    const flutes = tool.flutes || 4;
    if (flutes >= 5) score += 5;
    if (flutes >= 6) score += 3;

    // Manufacturer finish capability
    const mfr = this._getMfrKey(tool);
    const mfrData = this.data.manufacturerPerformance[mfr] || this.data.manufacturerPerformance.generic;
    score += (mfrData.finishCapability - 80) * 0.4;

    return Math.min(Math.max(score, 0), 100);
  },
  _calculateLifePerformance(tool, criteria) {
    let score = 50; // Base

    // Coating life factor
    const coating = this._identifyCoating(tool);
    const coatingData = this.data.coatings[coating] || this.data.coatings.uncoated;
    score += (coatingData.lifeFactor - 1) * 15; // Up to +135 (capped)

    // Price level (higher = better life)
    const priceLevel = tool.priceLevel || 3;
    score += (priceLevel - 3) * 8;

    // Manufacturer life capability
    const mfr = this._getMfrKey(tool);
    const mfrData = this.data.manufacturerPerformance[mfr] || this.data.manufacturerPerformance.generic;
    score += (mfrData.lifeCapability - 80) * 0.5;

    return Math.min(Math.max(score, 0), 100);
  },
  _calculateMaterialPerformance(tool, criteria) {
    let score = 50; // Base

    if (!criteria.material) return score;

    const matLower = criteria.material.toLowerCase();
    const coating = this._identifyCoating(tool);
    const coatingData = this.data.coatings[coating] || this.data.coatings.uncoated;

    // Check if coating is best for material
    for (const best of coatingData.bestFor) {
      if (matLower.includes(best)) {
        score += 25;
        break;
      }
    }
    // Check if coating should avoid material
    for (const avoid of coatingData.avoidFor) {
      if (matLower.includes(avoid)) {
        score -= 30;
        break;
      }
    }
    // Check flute count optimization
    const flutes = tool.flutes || 4;
    const materialKey = this._getMaterialKey(matLower);
    const fluteData = this.data.flutePerformance[materialKey];

    if (fluteData) {
      if (flutes === fluteData.optimal) {
        score += 15;
      } else if (fluteData.acceptable.includes(flutes)) {
        score += 5;
      } else if (fluteData.avoid.includes(flutes)) {
        score -= 20;
      }
    }
    return Math.min(Math.max(score, 0), 100);
  },
  _calculateOperationPerformance(tool, criteria) {
    let score = 50; // Base

    if (!criteria.operation) return score;

    const opLower = criteria.operation.toLowerCase();
    let opKey = 'pocketing'; // default

    if (opLower.includes('rough')) opKey = 'roughing';
    else if (opLower.includes('finish')) opKey = 'finishing';
    else if (opLower.includes('slot')) opKey = 'slotting';
    else if (opLower.includes('pocket')) opKey = 'pocketing';
    else if (opLower.includes('profile') || opLower.includes('contour')) opKey = 'profiling';
    else if (opLower.includes('drill')) opKey = 'drilling';

    const opData = this.data.operationRatings[opKey];
    if (!opData) return score;

    // Check tool type
    const toolType = this._identifyToolType(tool);
    if (opData.preferredTypes.includes(toolType)) {
      score += 15;
    }
    // Check coating
    const coating = this._identifyCoating(tool);
    if (opData.preferredCoatings.includes(coating)) {
      score += 10;
    }
    // Check flute count
    const flutes = tool.flutes || 4;
    if (opData.preferredFlutes.includes(flutes)) {
      score += 8;
    }
    // Check helix angle
    const helix = tool.helix || tool.helixAngle || 35;
    const roundedHelix = this._roundHelix(helix);
    if (opData.preferredHelix.includes(roundedHelix)) {
      score += 7;
    }
    return Math.min(Math.max(score, 0), 100);
  },
  _calculateGeometryPerformance(tool, criteria) {
    let score = 50; // Base

    // Variable helix bonus (reduces chatter)
    if (tool.variableHelix || tool.geometry?.variableHelix) {
      score += 15;
    }
    // Chipbreaker geometry (better chip control)
    if (tool.chipbreaker || tool.geometry?.chipbreaker) {
      score += 10;
    }
    // Corner radius (stronger edge)
    if (tool.cornerRadius && tool.cornerRadius > 0) {
      score += 5;
    }
    // Center cutting capability
    if (tool.centerCutting !== false) {
      score += 5;
    }
    // Helix angle optimization for chip evacuation
    const helix = tool.helix || tool.helixAngle || 35;
    const helixData = this.data.helixAngles[this._roundHelix(helix)] || this.data.helixAngles[35];
    score += (helixData.chipEvac - 0.8) * 25; // Up to +5 for high helix

    return Math.min(Math.max(score, 0), 100);
  },
  _calculateRigidityPerformance(tool, criteria) {
    let score = 50; // Base

    // L/D ratio (length to diameter)
    const diameter = tool.diameter || criteria.diameter || 0.5;
    const length = tool.loc || tool.flutLength || diameter * 3;
    const ldRatio = length / diameter;

    if (ldRatio <= 2) score += 20;      // Very rigid
    else if (ldRatio <= 3) score += 10; // Good
    else if (ldRatio <= 4) score += 0;  // Acceptable
    else if (ldRatio <= 5) score -= 10; // Getting flexible
    else score -= 25;                    // Long reach, less rigid

    // Core diameter (larger = more rigid)
    if (tool.coreRatio && tool.coreRatio > 0.5) {
      score += 10;
    }
    // Variable helix helps with vibration
    if (tool.variableHelix) {
      score += 10;
    }
    // Helix angle vs vibration
    const helix = tool.helix || tool.helixAngle || 35;
    const helixData = this.data.helixAngles[this._roundHelix(helix)] || this.data.helixAngles[35];
    score += (helixData.vibration - 0.8) * 20;

    return Math.min(Math.max(score, 0), 100);
  },
  _getWeightsForOperation(operation) {
    const opLower = (operation || '').toLowerCase();

    if (opLower.includes('rough')) {
      return { speed: 0.25, quality: 0.05, life: 0.20, material: 0.15, operation: 0.15, geometry: 0.10, rigidity: 0.10 };
    }
    if (opLower.includes('finish')) {
      return { speed: 0.05, quality: 0.30, life: 0.15, material: 0.15, operation: 0.15, geometry: 0.10, rigidity: 0.10 };
    }
    if (opLower.includes('slot')) {
      return { speed: 0.15, quality: 0.15, life: 0.15, material: 0.15, operation: 0.15, geometry: 0.10, rigidity: 0.15 };
    }
    // Default balanced weights
    return { speed: 0.15, quality: 0.15, life: 0.15, material: 0.15, operation: 0.15, geometry: 0.12, rigidity: 0.13 };
  },
  _generateRecommendations(tool, criteria, breakdown) {
    const recs = [];

    if (breakdown.speed < 60) {
      recs.push('Consider a tool with better coating for higher speeds (TiAlN, AlTiN, or AlCrN)');
    }
    if (breakdown.quality < 60 && criteria.operation?.includes('finish')) {
      recs.push('For better finish, consider higher flute count (5-6) or higher helix angle (40°+)');
    }
    if (breakdown.life < 60) {
      recs.push('Tool life may be limited. Consider premium tooling with advanced coatings');
    }
    if (breakdown.material < 60) {
      recs.push('Coating may not be optimal for this material. Check coating recommendations');
    }
    if (breakdown.rigidity < 60) {
      recs.push('Tool may be prone to vibration. Consider shorter L/D ratio or variable helix');
    }
    return recs;
  },
  // UTILITY METHODS

  _identifyCoating(tool) {
    const coatings = tool.coatings || tool.coating || [];
    const coatingStr = Array.isArray(coatings) ? coatings.join(' ') : coatings.toString();
    const coatingLower = coatingStr.toLowerCase();

    if (coatingLower.includes('diamond') || coatingLower.includes('pcd')) return 'diamond';
    if (coatingLower.includes('naco') || coatingLower.includes('nh9')) return 'nACo';
    if (coatingLower.includes('dlc')) return 'DLC';
    if (coatingLower.includes('alcrn')) return 'AlCrN';
    if (coatingLower.includes('altin')) return 'AlTiN';
    if (coatingLower.includes('tialn')) return 'TiAlN';
    if (coatingLower.includes('ticn')) return 'TiCN';
    if (coatingLower.includes('tin') || coatingLower.includes('titanium nitride')) return 'TiN';
    if (coatingLower.includes('zrn')) return 'ZrN';

    // Infer from price level
    const priceLevel = tool.priceLevel || 3;
    if (priceLevel >= 5) return 'AlCrN';
    if (priceLevel >= 4) return 'TiAlN';
    if (priceLevel >= 3) return 'TiCN';
    if (priceLevel >= 2) return 'TiN';

    return 'uncoated';
  },
  _identifyToolType(tool) {
    const name = (tool.name || tool.type || '').toLowerCase();
    const series = (tool.series || '').toLowerCase();

    if (name.includes('high feed') || name.includes('high-feed') || series.includes('hf')) return 'high_feed';
    if (name.includes('roughing') || name.includes('ripper') || series.includes('rough')) return 'roughing';
    if (name.includes('variable') || series.includes('vh')) return 'variable_helix';
    if (name.includes('chipbreaker')) return 'chipbreaker';
    if (name.includes('serrated') || name.includes('corncob')) return 'serrated';
    if (name.includes('finish')) return 'finishing';
    if (name.includes('ball')) return 'ball_nose';
    if (name.includes('high perf') || name.includes('hp') || series.includes('hp')) return 'high_performance';

    return 'standard_endmill';
  },
  _getMfrKey(tool) {
    const mfr = (tool.manufacturerKey || tool.manufacturer || '').toLowerCase();

    // Map common variations
    const mfrMap = {
      'sandvik coromant': 'sandvik',
      'sandvik': 'sandvik',
      'kennametal': 'kennametal',
      'iscar': 'iscar',
      'seco tools': 'seco',
      'seco': 'seco',
      'mitsubishi materials': 'mitsubishi',
      'mitsubishi': 'mitsubishi',
      'walter': 'walter',
      'tungaloy': 'tungaloy',
      'osg': 'osg',
      'guhring': 'guhring',
      'gühring': 'guhring',
      'emuge': 'emuge',
      'emuge-franken': 'emuge',
      'harvey tool': 'harvey',
      'harvey': 'harvey',
      'helical': 'helical',
      'sgs': 'sgs',
      'kyocera': 'kyocera',
      'sumitomo': 'sumitomo',
      'moldino': 'moldino',
      'hitachi': 'moldino',
      'yg-1': 'yg-1',
      'yg1': 'yg-1',
      'ma ford': 'ma_ford',
      'nachi': 'nachi',
      'speed tiger': 'speed_tiger',
      'speedtiger': 'speed_tiger',
      'accusize': 'accusize'
    };
    for (const [key, value] of Object.entries(mfrMap)) {
      if (mfr.includes(key)) return value;
    }
    return 'generic';
  },
  _getMaterialKey(matLower) {
    if (matLower.includes('aluminum') || matLower.includes('aluminium')) return 'aluminum';
    if (matLower.includes('stainless')) return 'stainless';
    if (matLower.includes('titanium')) return 'titanium';
    if (matLower.includes('inconel') || matLower.includes('hastelloy')) return 'inconel';
    if (matLower.includes('cast iron') || matLower.includes('cast_iron')) return 'cast_iron';
    if (matLower.includes('brass')) return 'brass';
    if (matLower.includes('copper')) return 'copper';
    if (matLower.includes('plastic') || matLower.includes('delrin') || matLower.includes('nylon')) return 'plastic';
    if (matLower.includes('composite') || matLower.includes('carbon fiber') || matLower.includes('fiberglass')) return 'composite';
    return 'steel';
  },
  _roundHelix(helix) {
    const options = [25, 30, 35, 40, 45, 50, 55];
    return options.reduce((prev, curr) =>
      Math.abs(curr - helix) < Math.abs(prev - helix) ? curr : prev
    );
  },
  // INITIALIZATION

  init() {
    console.log('[PRISM_TOOL_PERFORMANCE_ENGINE] v1.0 initializing...');

    // Register globally
    window.PRISM_TOOL_PERFORMANCE_ENGINE = this;

    // Integrate with OPTIMIZED_TOOL_SELECTOR
    if (typeof PRISM_OPTIMIZED_TOOL_SELECTOR !== 'undefined') {
      // Replace the simple performance score with comprehensive one
      PRISM_OPTIMIZED_TOOL_SELECTOR._calculatePerformanceScore = (tool, criteria) => {
        const result = this.calculatePerformance(tool, criteria);
        return result.overall;
      };
      // Add performance breakdown to scoring
      const originalScoreAll = PRISM_OPTIMIZED_TOOL_SELECTOR._scoreAllTools;
      PRISM_OPTIMIZED_TOOL_SELECTOR._scoreAllTools = (tools, criteria) => {
        const scored = tools.map(tool => {
          const performance = this.calculatePerformance(tool, criteria);

          const scores = {
            fit: PRISM_OPTIMIZED_TOOL_SELECTOR._calculateFitScore(tool, criteria),
            performance: performance.overall,
            performanceBreakdown: performance.breakdown,
            value: PRISM_OPTIMIZED_TOOL_SELECTOR._calculateValueScore(tool, criteria),
            reliability: PRISM_OPTIMIZED_TOOL_SELECTOR._calculateReliabilityScore(tool),
            overall: 0
          };
          scores.overall =
            scores.fit * 0.25 +
            scores.performance * 0.30 +  // Increased weight for comprehensive performance
            scores.value * 0.25 +
            scores.reliability * 0.20;

          const price = PRISM_OPTIMIZED_TOOL_SELECTOR._calculatePrice(tool, criteria);
          const toolLife = PRISM_OPTIMIZED_TOOL_SELECTOR._estimateToolLife(tool, criteria);
          const costPerPart = price / toolLife.partsPerTool;

          return {
            ...tool,
            scores,
            performanceDetails: performance,
            price,
            toolLife,
            costPerPart
          };
        }).sort((a, b) => b.scores.overall - a.scores.overall);

        return scored;
      };
      console.log('  ✓ Integrated with PRISM_OPTIMIZED_TOOL_SELECTOR');
    }
    // Register with DATABASE_HUB
    if (typeof PRISM_DATABASE_HUB !== 'undefined') {
      PRISM_DATABASE_HUB.toolPerformanceEngine = this;
    }
    // Global shortcuts
    window.calculateToolPerformance = this.calculatePerformance.bind(this);
    window.getCoatingPerformance = (coating) => this.data.coatings[coating] || this.data.coatings.uncoated;
    window.getMfrPerformance = (mfr) => this.data.manufacturerPerformance[this._getMfrKey({manufacturer: mfr})] || this.data.manufacturerPerformance.generic;

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_TOOL_PERFORMANCE_ENGINE] v1.0 initialized');
    console.log('  Performance factors: speed, quality, life, material, operation, geometry, rigidity');
    console.log('  Coatings: ' + Object.keys(this.data.coatings).length + ' types with full performance data');
    console.log('  Manufacturers: ' + Object.keys(this.data.manufacturerPerformance).length + ' with performance ratings');

    return this;
  }
}