const PRISM_MANUFACTURERS_CATALOG_BATCH2 = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  // 1. OSG CORPORATION - Complete Product Line

  osg: {
    manufacturer: {
      name: 'OSG Corporation',
      country: 'Japan',
      founded: 1938,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'World Leader in Taps & Thread Mills',
      website: 'osgtool.com',
      specialty: 'Threading tools, drills, end mills'
    },
    // TAPPING
    tapping: {
      spiralPoint: {
        'A-TAP': {
          name: 'A-TAP Series',
          type: 'spiral_point',
          description: 'Universal spiral point taps',
          series: {
            'A-SFT': { geometry: 'spiral_flute', materials: ['steel', 'stainless', 'aluminum'] },
            'A-POT': { geometry: 'spiral_point', materials: ['steel', 'cast_iron'] },
            'A-LT': { geometry: 'long_shank', materials: ['deep_holes'] }
          },
          coatings: ['V_COAT', 'TiN', 'TiCN', 'TiAlN'],
          threadForms: ['UN', 'UNC', 'UNF', 'UNEF', 'M', 'MF'],
          sizeRange: {
            inch: ['#0-80', '#1-64', '#2-56', '#4-40', '#6-32', '#8-32', '#10-24', '#10-32', '1/4-20', '1/4-28', '5/16-18', '5/16-24', '3/8-16', '3/8-24', '7/16-14', '7/16-20', '1/2-13', '1/2-20', '9/16-12', '9/16-18', '5/8-11', '5/8-18', '3/4-10', '3/4-16', '7/8-9', '1-8', '1-12'],
            metric: ['M1.6x0.35', 'M2x0.4', 'M2.5x0.45', 'M3x0.5', 'M4x0.7', 'M5x0.8', 'M6x1', 'M8x1.25', 'M10x1.5', 'M12x1.75', 'M14x2', 'M16x2', 'M18x2.5', 'M20x2.5', 'M22x2.5', 'M24x3', 'M27x3', 'M30x3.5']
          }
        },
        'HY-PRO-TT': {
          name: 'Hy-Pro TT Roll Tap',
          type: 'roll_forming',
          description: 'Cold forming taps - no chips',
          coatings: ['V_COAT', 'TiN'],
          materials: ['aluminum', 'copper', 'brass', 'mild_steel', 'stainless_304'],
          advantages: ['no_chips', 'stronger_threads', 'higher_speeds', 'longer_life'],
          sizeRange: {
            inch: ['#0-80', '#2-56', '#4-40', '#6-32', '#8-32', '#10-24', '#10-32', '1/4-20', '1/4-28', '5/16-18', '3/8-16', '3/8-24', '1/2-13', '1/2-20', '5/8-11', '3/4-10'],
            metric: ['M2x0.4', 'M2.5x0.45', 'M3x0.5', 'M4x0.7', 'M5x0.8', 'M6x1', 'M8x1.25', 'M10x1.5', 'M12x1.75', 'M14x2', 'M16x2']
          }
        },
        'EXOTAP': {
          name: 'EXOTAP Series',
          type: 'high_performance',
          description: 'Premium performance tapping',
          series: {
            'EXO-SFT': { type: 'spiral_flute', performance: 'ultra_high' },
            'EXO-POT': { type: 'spiral_point', performance: 'ultra_high' },
            'EXO-HT': { type: 'hardened_steel', hrc: '35-55' }
          },
          coatings: ['V_COAT', 'WXL_COAT'],
          materials: ['hardened_steel', 'titanium', 'inconel']
        }
      },
      threadMills: {
        'AT-1': {
          name: 'AT-1 Thread Mill',
          type: 'solid_carbide_thread_mill',
          description: 'Single point thread milling',
          threadForms: ['UN', 'UNC', 'UNF', 'M', 'MF', 'BSPT', 'NPT', 'API'],
          pitchRange: {
            tpi: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 27, 28, 32, 36, 40, 48, 56, 64, 72, 80],
            metric: [0.25, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.75, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
          },
          coatings: ['WXL_COAT', 'TiAlN'],
          diameterRange: { metric: [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25] }
        },
        'PROTOMAX': {
          name: 'ProtoMax Thread Mill',
          type: 'indexable_thread_mill',
          description: 'Indexable thread milling system',
          insertTypes: ['UN', 'ISO', 'NPT', 'API'],
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63] }
        }
      }
    },
    // END MILLS
    milling: {
      solidCarbide: {
        'A-BRAND': {
          name: 'A Brand End Mills',
          type: 'solid_carbide_endmill',
          description: 'Premium solid carbide end mills',
          series: {
            'AE-VMS': { flutes: 4, geometry: 'square', applications: ['steel', 'stainless'] },
            'AE-VML': { flutes: 4, geometry: 'long', applications: ['deep_pockets'] },
            'AE-VMD': { flutes: 2, geometry: 'aluminum', applications: ['aluminum', 'plastics'] },
            'AE-CRE': { flutes: 4, geometry: 'corner_radius', applications: ['profiling'] },
            'AE-BD': { flutes: 2, geometry: 'ball', applications: ['3d_finishing'] },
            'AE-BDE': { flutes: 4, geometry: 'ball', applications: ['high_efficiency_ball'] }
          },
          coatings: ['A_BRAND_COAT', 'WXL_COAT', 'EXO_COAT'],
          diameterRange: {
            inch: [0.031, 0.047, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0],
            metric: [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25]
          }
        },
        'PHX': {
          name: 'Phoenix Series',
          type: 'high_performance_endmill',
          description: 'Multi-flute high performance',
          series: {
            'PHX-CPR': { flutes: 4, geometry: 'corner_radius', applications: ['roughing'] },
            'PHX-DRN': { flutes: 5, geometry: 'roughing', applications: ['slotting'] },
            'PHX-DBT': { flutes: 6, geometry: 'finishing', applications: ['high_feed'] }
          },
          coatings: ['PHX_COAT'],
          variableHelix: true,
          diameterRange: { metric: [6, 8, 10, 12, 16, 20, 25] }
        },
        'AERO': {
          name: 'AERO Series',
          type: 'aerospace_endmill',
          description: 'Aerospace aluminum machining',
          flutes: [2, 3],
          geometry: 'high_helix',
          helixAngle: 45,
          coatings: ['DLC', 'DIAMOND'],
          polished: true,
          maxRpm: 50000,
          diameterRange: {
            inch: [0.125, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0],
            metric: [3, 4, 5, 6, 8, 10, 12, 16, 20, 25]
          }
        }
      }
    },
    // DRILLING
    drilling: {
      solidCarbide: {
        'ADO': {
          name: 'ADO Drill Series',
          type: 'solid_carbide_drill',
          description: 'High performance carbide drills',
          series: {
            'ADO-3D': { depth: '3xD', coolantThru: true },
            'ADO-5D': { depth: '5xD', coolantThru: true },
            'ADO-8D': { depth: '8xD', coolantThru: true },
            'ADO-15D': { depth: '15xD', coolantThru: true },
            'ADO-20D': { depth: '20xD', coolantThru: true },
            'ADO-25D': { depth: '25xD', coolantThru: true },
            'ADO-30D': { depth: '30xD', coolantThru: true },
            'ADO-40D': { depth: '40xD', coolantThru: true }
          },
          coatings: ['WXL_COAT', 'EXO_COAT'],
          pointAngles: [140],
          diameterRange: {
            metric: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15, 16, 18, 20]
          }
        },
        'ADO-MICRO': {
          name: 'ADO Micro Drill',
          type: 'micro_drill',
          description: 'Precision micro drilling',
          diameterRange: { metric: [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
          depthCapability: ['3xD', '5xD', '8xD'],
          coolantThru: true
        }
      },
      hss: {
        'EX-SUS-GDR': {
          name: 'EX-SUS-GDR',
          type: 'hss_cobalt_drill',
          description: 'Stainless steel drilling',
          material: 'HSS-E_Co',
          coatings: ['TiN', 'TiAlN'],
          pointAngles: [135],
          diameterRange: {
            inch: [0.0135, 0.0145, 0.016, 0.018, 0.02, 0.021, 0.0225, 0.024, 0.025, 0.026, 0.028, 0.0292, 0.031, 0.032, 0.033, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.0465, 0.052, 0.055, 0.0595, 0.0635, 0.067, 0.07, 0.073, 0.076, 0.0785, 0.081, 0.082, 0.086, 0.089, 0.0935, 0.096, 0.098, 0.0995, 0.1015, 0.104, 0.1065, 0.11, 0.111, 0.113, 0.116, 0.12, 0.125, 0.1285, 0.136, 0.1405, 0.144, 0.147, 0.1495, 0.152, 0.154, 0.157, 0.159, 0.161, 0.166, 0.1695, 0.173, 0.177, 0.18, 0.182, 0.185, 0.189, 0.191, 0.1935, 0.196, 0.199, 0.201, 0.204, 0.2055, 0.209, 0.213, 0.221, 0.228, 0.234, 0.238, 0.242, 0.246, 0.25, 0.257, 0.261, 0.266, 0.272, 0.277, 0.281, 0.29, 0.295, 0.302, 0.3125, 0.316, 0.323, 0.332, 0.339, 0.348, 0.358, 0.368, 0.375, 0.377, 0.386, 0.397, 0.404, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1.0]
          }
        }
      }
    },
    grades: {
      carbide: {
        'WXL': { coating: 'WXL_COAT', application: 'general_purpose', color: 'gold' },
        'EXO': { coating: 'EXO_COAT', application: 'high_performance', color: 'purple' },
        'A_BRAND': { coating: 'A_BRAND_COAT', application: 'premium', color: 'blue' },
        'DLC': { coating: 'DLC', application: 'aluminum', color: 'black' },
        'PHX': { coating: 'PHX_COAT', application: 'phoenix_series', color: 'copper' }
      },
      hss: {
        'V_COAT': { coating: 'V_COAT', application: 'tapping', color: 'gold_tint' },
        'TiN': { coating: 'TiN', application: 'general', color: 'gold' },
        'TiCN': { coating: 'TiCN', application: 'stainless', color: 'gray' }
      }
    }
  },
  // 2. GÜHRING - Complete Product Line

  guhring: {
    manufacturer: {
      name: 'Gühring',
      country: 'Germany',
      founded: 1898,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'World Leader in Drilling',
      website: 'guhring.com',
      specialty: 'Precision drilling tools'
    },
    drilling: {
      solidCarbide: {
        'RT100': {
          name: 'RT 100 Series',
          type: 'solid_carbide_drill',
          description: 'Premium solid carbide drilling',
          series: {
            'RT100T': { geometry: 'general', coolantThru: true },
            'RT100U': { geometry: 'universal', coolantThru: true },
            'RT100HF': { geometry: 'high_feed', coolantThru: true },
            'RT100XF': { geometry: 'extreme', coolantThru: true }
          },
          coatings: ['FIRE', 'SIGNUM', 'PERROX'],
          pointAngles: [140, 142],
          depthCapability: ['3xD', '5xD', '7xD', '8xD', '12xD', '15xD', '20xD', '25xD', '30xD'],
          diameterRange: { metric: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15, 16, 18, 20] }
        },
        'RT100-INOX': {
          name: 'RT 100 Inox',
          type: 'stainless_drill',
          description: 'Stainless steel specific',
          materials: ['stainless_304', 'stainless_316', 'duplex', 'super_duplex'],
          coatings: ['PERROX'],
          coolantThru: true,
          depthCapability: ['3xD', '5xD', '8xD']
        },
        'RT100-TITAN': {
          name: 'RT 100 Titan',
          type: 'titanium_drill',
          description: 'Titanium and heat resistant alloys',
          materials: ['titanium', 'inconel', 'hastelloy', 'waspaloy'],
          coatings: ['FIRE'],
          coolantThru: true,
          depthCapability: ['3xD', '5xD']
        }
      },
      hss: {
        'HSCO-VA': {
          name: 'HSS-E VA Series',
          type: 'hss_cobalt_drill',
          description: 'Cobalt HSS for stainless',
          material: 'HSS-E_8%Co',
          coatings: ['TiN', 'TiAlN', 'FIRE'],
          depthCapability: ['3xD', '5xD', '10xD', '15xD', '20xD'],
          diameterRange: {
            metric: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13]
          }
        }
      },
      indexable: {
        'DIVER': {
          name: 'DIVER Indexable Drill',
          type: 'indexable_drill',
          description: 'Modular indexable drilling',
          diameterRange: { metric: [14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            peripheral: ['SPMT', 'SCMT'],
            central: ['SOMT', 'XOMT']
          }
        }
      },
      micro: {
        'MICRO-DRILL': {
          name: 'Micro Precision Drill',
          type: 'micro_drill',
          description: 'Ultra precision micro drilling',
          diameterRange: { metric: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
          depthCapability: ['3xD', '5xD', '10xD'],
          tolerance: 'IT6'
        }
      }
    },
    milling: {
      solidCarbide: {
        'RF100': {
          name: 'RF 100 End Mill',
          type: 'solid_carbide_endmill',
          description: 'High performance end mills',
          series: {
            'RF100U': { flutes: 4, geometry: 'universal' },
            'RF100A': { flutes: 3, geometry: 'aluminum' },
            'RF100F': { flutes: 4, geometry: 'finishing' },
            'RF100Sharp': { flutes: 5, geometry: 'high_performance' }
          },
          coatings: ['FIRE', 'SIGNUM', 'PERROX'],
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25] }
        },
        'G-MOLD': {
          name: 'G-Mold Series',
          type: 'die_mold_endmill',
          description: 'Die and mold machining',
          series: {
            'ball': { geometry: 'ball', applications: ['3d_finishing'] },
            'corner_radius': { geometry: 'corner_radius', applications: ['roughing'] },
            'long_reach': { geometry: 'long_reach', applications: ['deep_cavities'] }
          },
          coatings: ['FIRE', 'SIGNUM'],
          diameterRange: { metric: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] }
        }
      }
    },
    tapping: {
      'POWERTAP': {
        name: 'PowerTap Series',
        type: 'spiral_point_tap',
        description: 'High performance tapping',
        series: {
          'standard': { geometry: 'spiral_point', materials: ['steel', 'cast_iron'] },
          'form': { geometry: 'roll_forming', materials: ['aluminum', 'copper'] },
          'vario': { geometry: 'variable_helix', materials: ['stainless'] }
        },
        coatings: ['TiN', 'TiCN', 'FIRE_COAT'],
        threadForms: ['UN', 'UNC', 'UNF', 'M', 'MF', 'G', 'Rc'],
        sizeRange: {
          metric: ['M1.6', 'M2', 'M2.5', 'M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24']
        }
      }
    },
    reaming: {
      'HR500': {
        name: 'HR 500 Reamer',
        type: 'solid_carbide_reamer',
        description: 'Precision reaming',
        tolerance: 'H7',
        coatings: ['TiAlN', 'FIRE'],
        diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 25] },
        coolantThru: true
      }
    },
    grades: {
      'FIRE': { coating: 'multilayer_TiAlN', application: 'general_high_perf', color: 'copper' },
      'SIGNUM': { coating: 'nanocomposite', application: 'hardened_steel', color: 'gray' },
      'PERROX': { coating: 'AlCrN', application: 'stainless_titanium', color: 'purple' },
      'DLC': { coating: 'diamond_like_carbon', application: 'aluminum', color: 'black' }
    }
  },
  // 3. EMUGE - Complete Product Line

  emuge: {
    manufacturer: {
      name: 'Emuge Corporation',
      country: 'Germany',
      founded: 1920,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'World Leader in Threading',
      website: 'emuge.com',
      specialty: 'Threading tools and workholding'
    },
    tapping: {
      spiralFlute: {
        'REKORD': {
          name: 'Rekord Series',
          type: 'spiral_flute_tap',
          description: 'Premium spiral flute taps',
          series: {
            'B': { geometry: 'standard', flutes: 3 },
            'BT': { geometry: 'through_hole', flutes: 3 },
            'C': { geometry: 'high_performance', flutes: 3 },
            'SFT': { geometry: 'deep_blind', flutes: 2 }
          },
          coatings: ['TiN', 'TiCN', 'TiAlN', 'HARD_LUBE'],
          threadForms: ['UN', 'UNC', 'UNF', 'UNEF', 'M', 'MF'],
          sizeRange: {
            inch: ['#0-80', '#1-72', '#2-56', '#3-48', '#4-40', '#5-40', '#6-32', '#8-32', '#10-24', '#10-32', '#12-24', '1/4-20', '1/4-28', '5/16-18', '5/16-24', '3/8-16', '3/8-24', '7/16-14', '7/16-20', '1/2-13', '1/2-20', '9/16-12', '9/16-18', '5/8-11', '5/8-18', '3/4-10', '3/4-16', '7/8-9', '7/8-14', '1-8', '1-12', '1-14'],
            metric: ['M1', 'M1.2', 'M1.4', 'M1.6', 'M1.8', 'M2', 'M2.2', 'M2.5', 'M3', 'M3.5', 'M4', 'M4.5', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24', 'M27', 'M30', 'M33', 'M36']
          }
        },
        'INNOFORM': {
          name: 'InnoForm Roll Tap',
          type: 'roll_forming_tap',
          description: 'Cold forming taps',
          series: {
            'standard': { geometry: 'standard_form', coolantThru: false },
            'HC': { geometry: 'high_speed', coolantThru: true },
            'HS': { geometry: 'high_speed_steel', coolantThru: false }
          },
          coatings: ['TiN', 'TiCN', 'HARD_LUBE'],
          materials: ['aluminum', 'copper', 'brass', 'zinc', 'mild_steel', 'stainless_304'],
          advantages: ['no_chips', 'stronger_threads', '50%_faster', '10x_longer_life'],
          sizeRange: {
            inch: ['#2-56', '#4-40', '#6-32', '#8-32', '#10-24', '#10-32', '1/4-20', '1/4-28', '5/16-18', '5/16-24', '3/8-16', '3/8-24', '1/2-13', '1/2-20'],
            metric: ['M2x0.4', 'M2.5x0.45', 'M3x0.5', 'M4x0.7', 'M5x0.8', 'M6x1', 'M8x1.25', 'M10x1.5', 'M12x1.75']
          }
        },
        'THREADS-ALL': {
          name: 'Threads-All',
          type: 'universal_tap',
          description: 'Universal tapping solution',
          materials: ['steel', 'stainless', 'cast_iron', 'aluminum', 'brass', 'bronze'],
          coatings: ['TiCN', 'HARD_LUBE'],
          features: ['universal_geometry', 'multi_material']
        }
      },
      threadMills: {
        'THREADS-DICUT': {
          name: 'Threads Dicut',
          type: 'solid_carbide_thread_mill',
          description: 'Single point thread milling',
          threadForms: ['UN', 'UNC', 'UNF', 'UNEF', 'M', 'MF', 'NPT', 'BSPT'],
          coatings: ['TiAlN', 'TiCN'],
          diameterRange: { metric: [2, 3, 4, 5, 6, 8, 10, 12, 16, 20] }
        },
        'THREADS-GIGANT': {
          name: 'Threads Gigant',
          type: 'large_thread_mill',
          description: 'Large diameter thread milling',
          threadForms: ['UN', 'M', 'ACME', 'Trapezoidal', 'API'],
          diameterRange: { metric: [30, 40, 50, 63, 80, 100, 125, 160, 200] }
        }
      }
    },
    milling: {
      solidCarbide: {
        'TOP-CUT': {
          name: 'Top-Cut Series',
          type: 'solid_carbide_endmill',
          description: 'High performance end mills',
          series: {
            'VAR4': { flutes: 4, geometry: 'variable_helix', applications: ['steel', 'stainless'] },
            'VAR5': { flutes: 5, geometry: 'variable_helix', applications: ['titanium'] },
            'VAR6': { flutes: 6, geometry: 'variable_helix', applications: ['high_feed'] },
            'ALU3': { flutes: 3, geometry: 'aluminum', applications: ['aluminum'] },
            'BALL2': { flutes: 2, geometry: 'ball', applications: ['3d_finishing'] },
            'BALL4': { flutes: 4, geometry: 'ball', applications: ['high_feed_ball'] }
          },
          coatings: ['TiAlN', 'nACo', 'DLC'],
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25] }
        },
        'CIRCLE-SEGMENT': {
          name: 'Circle Segment Cutters',
          type: 'barrel_cutter',
          description: 'Advanced surface finishing',
          types: {
            'barrel': { profile: 'barrel', stepover: '10x_ball' },
            'lens': { profile: 'lens', stepover: '8x_ball' },
            'taper_ball': { profile: 'taper_ball', stepover: '5x_ball' },
            'oval': { profile: 'oval', stepover: '6x_ball' }
          },
          coatings: ['TiAlN', 'nACo'],
          barrelRadii: { metric: [50, 75, 100, 150, 200, 250, 300] },
          diameterRange: { metric: [6, 8, 10, 12, 16, 20] }
        }
      }
    },
    workholding: {
      'SISTEMA': {
        name: 'Sistema Clamping',
        type: 'workholding_system',
        description: 'Precision workholding',
        products: ['collet_chucks', 'hydraulic_chucks', 'shrink_fit', 'power_chucks'],
        tapers: ['BT30', 'BT40', 'BT50', 'CAT40', 'CAT50', 'HSK-A63', 'HSK-A100']
      }
    },
    grades: {
      'TiN': { coating: 'TiN', application: 'general', color: 'gold', hardness: 2300 },
      'TiCN': { coating: 'TiCN', application: 'stainless', color: 'gray', hardness: 3000 },
      'TiAlN': { coating: 'TiAlN', application: 'high_temp', color: 'purple', hardness: 3300 },
      'HARD_LUBE': { coating: 'lubricant_layer', application: 'forming', color: 'silver', friction: 0.1 },
      'nACo': { coating: 'nanocomposite', application: 'hardened', color: 'copper', hardness: 4500 }
    }
  },
  // 4. HARVEY TOOL - Complete Product Line

  harveyTool: {
    manufacturer: {
      name: 'Harvey Tool',
      country: 'USA',
      founded: 1985,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'Leader in Specialty Tooling',
      website: 'harveytool.com',
      specialty: 'Specialty solid carbide tools'
    },
    milling: {
      miniatureEndMills: {
        'MINIATURE-SQUARE': {
          name: 'Miniature Square End Mills',
          type: 'miniature_endmill',
          description: 'Micro and miniature end mills',
          flutes: [2, 3, 4],
          coatings: ['AlTiN', 'TiB2', 'CVD_DIAMOND', 'Amorphous_DIAMOND'],
          diameterRange: {
            inch: [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.010, 0.012, 0.015, 0.020, 0.025, 0.030, 0.035, 0.040, 0.045, 0.050, 0.055, 0.060, 0.062, 0.070, 0.078, 0.080, 0.090, 0.094, 0.100, 0.110, 0.120, 0.125]
          },
          tolerance: { diameter: 0.0001, runout: 0.0001 },
          maxRpm: 100000
        },
        'MINIATURE-BALL': {
          name: 'Miniature Ball End Mills',
          type: 'miniature_ball',
          description: 'Micro ball end mills',
          flutes: [2],
          coatings: ['AlTiN', 'TiB2', 'CVD_DIAMOND'],
          diameterRange: {
            inch: [0.002, 0.004, 0.005, 0.006, 0.008, 0.010, 0.012, 0.015, 0.020, 0.025, 0.030, 0.040, 0.050, 0.062, 0.078, 0.094, 0.125]
          }
        }
      },
      undercutting: {
        'KEYSEAT': {
          name: 'Keyseat Cutters',
          type: 'keyseat_cutter',
          description: 'Woodruff keyseat and slot cutters',
          styles: ['straight_tooth', 'staggered_tooth', 'pointed'],
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] },
          widthRange: { inch: [0.015, 0.020, 0.025, 0.031, 0.040, 0.047, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250] }
        },
        'LOLLIPOP': {
          name: 'Lollipop Cutters',
          type: 'lollipop_cutter',
          description: 'Ball end undercutting',
          coatings: ['AlTiN', 'TiB2'],
          diameterRange: { inch: [0.015, 0.020, 0.025, 0.031, 0.040, 0.047, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500] },
          neckDiameters: { inch: [0.010, 0.015, 0.020, 0.025, 0.031, 0.040, 0.047, 0.062, 0.078, 0.094] }
        },
        'BACK-DRAFT': {
          name: 'Back Draft Cutters',
          type: 'back_draft',
          description: 'Reverse draft machining',
          angles: [0.5, 1, 2, 3, 5, 7, 10, 15, 20],
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500] }
        }
      },
      threadMills: {
        'SINGLE-FORM': {
          name: 'Single Form Thread Mills',
          type: 'single_point_thread_mill',
          description: 'Single point threading',
          threadForms: ['UN', 'UNC', 'UNF', 'UNEF', 'UNS', 'M', 'MF', 'NPT', 'NPTF', 'BSPT', 'BSP', 'ACME', 'Trapezoidal'],
          pitchRange: {
            tpi: [4, 5, 6, 7, 8, 9, 10, 11, 11.5, 12, 13, 14, 16, 18, 20, 24, 27, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80],
            metric: [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.75, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
          },
          coatings: ['AlTiN', 'TiAlN', 'TiB2'],
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        'MULTI-FORM': {
          name: 'Multi-Form Thread Mills',
          type: 'multi_point_thread_mill',
          description: 'Multiple tooth threading',
          threadForms: ['UN', 'M', 'NPT', 'NPTF'],
          features: ['faster_cycle', 'fewer_passes']
        }
      },
      specialtyEndMills: {
        'CHAMFER': {
          name: 'Chamfer Mills',
          type: 'chamfer_mill',
          description: 'Precision chamfering',
          angles: [15, 30, 45, 60, 75, 82, 90, 100, 110, 120],
          coatings: ['AlTiN', 'TiB2'],
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        'ENGRAVING': {
          name: 'Engraving Tools',
          type: 'engraving_cutter',
          description: 'Precision engraving',
          tipAngles: [10, 15, 20, 30, 45, 60, 90, 120],
          tipSizes: { inch: [0.003, 0.005, 0.007, 0.010, 0.015, 0.020, 0.025, 0.030] }
        },
        'DOVETAIL': {
          name: 'Dovetail Cutters',
          type: 'dovetail_cutter',
          description: 'Dovetail slot machining',
          angles: [45, 50, 55, 60],
          coatings: ['AlTiN'],
          diameterRange: { inch: [0.125, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        'CORNER-RADIUS': {
          name: 'Corner Radius End Mills',
          type: 'corner_radius_endmill',
          description: 'Precision corner rounding',
          flutes: [2, 3, 4],
          radii: { inch: [0.005, 0.010, 0.015, 0.020, 0.025, 0.030, 0.031, 0.040, 0.047, 0.050, 0.062, 0.078, 0.094, 0.100, 0.120, 0.125, 0.156, 0.187, 0.250] },
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        }
      }
    },
    drilling: {
      'MICRO-DRILLS': {
        name: 'Micro Precision Drills',
        type: 'micro_drill',
        description: 'Ultra precision drilling',
        diameterRange: { inch: [0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.010, 0.012, 0.015, 0.018, 0.020, 0.025, 0.030, 0.035, 0.040] },
        depthCapability: ['3xD', '5xD', '10xD'],
        pointAngles: [118, 130, 140]
      },
      'SPOT-DRILLS': {
        name: 'Spot Drills',
        type: 'spot_drill',
        description: 'Precision spotting',
        angles: [60, 82, 90, 100, 118, 120, 140, 142],
        diameterRange: { inch: [0.031, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500] }
      }
    },
    grades: {
      'AlTiN': { coating: 'AlTiN', application: 'general_high_temp', maxTemp: 800, color: 'purple' },
      'TiB2': { coating: 'TiB2', application: 'aluminum_titanium', friction: 0.15, color: 'gray' },
      'CVD_DIAMOND': { coating: 'CVD_diamond', application: 'graphite_composites', hardness: 10000, color: 'white' },
      'Amorphous_DIAMOND': { coating: 'amorphous_diamond', application: 'non_ferrous', friction: 0.05, color: 'silver' }
    }
  },
  // 5. HELICAL SOLUTIONS - Complete Product Line

  helical: {
    manufacturer: {
      name: 'Helical Solutions',
      country: 'USA',
      founded: 2006,
      quality: 'Premium',
      priceLevel: 4,
      parent: 'Harvey Performance Company',
      marketPosition: 'Leader in High Performance End Mills',
      website: 'helicaltool.com',
      specialty: 'High performance solid carbide end mills'
    },
    milling: {
      squareEndMills: {
        'HVTI': {
          name: 'HVTI Series',
          type: 'variable_helix_endmill',
          description: 'Titanium and heat resistant alloys',
          flutes: [5, 6, 7],
          helixAngles: [35, 37, 38],
          variableHelix: true,
          variablePitch: true,
          coatings: ['Aplus'],
          materials: ['titanium', 'inconel', 'waspaloy', 'hastelloy', 'monel'],
          diameterRange: { inch: [0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        'H35AL': {
          name: 'H35AL Series',
          type: 'aluminum_endmill',
          description: 'High helix aluminum machining',
          flutes: [2, 3],
          helixAngle: 45,
          polished: true,
          coatings: ['ZrN', 'Uncoated'],
          maxRpm: 60000,
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        'H45HV': {
          name: 'H45HV Series',
          type: 'hardened_steel_endmill',
          description: 'Hardened steels 45-65 HRC',
          flutes: [4, 6],
          coatings: ['Aplus', 'nACo'],
          hrcRange: [45, 65],
          variableHelix: true,
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500] }
        },
        'HEV': {
          name: 'HEV Series',
          type: 'general_purpose_endmill',
          description: 'General purpose variable helix',
          flutes: [4, 5],
          helixAngles: [35, 37, 38],
          variableHelix: true,
          coatings: ['Aplus'],
          materials: ['steel', 'stainless', 'cast_iron'],
          diameterRange: { inch: [0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0, 1.250] }
        },
        'HSPE': {
          name: 'HSPE Series',
          type: 'high_speed_endmill',
          description: 'High speed machining',
          flutes: [5, 7, 9],
          coatings: ['Aplus'],
          features: ['chip_splitters', 'reduced_vibration'],
          diameterRange: { inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        }
      },
      ballEndMills: {
        'HB': {
          name: 'HB Ball Series',
          type: 'ball_endmill',
          description: 'General purpose ball end mills',
          flutes: [2, 4],
          coatings: ['Aplus', 'ZrN'],
          diameterRange: { inch: [0.015, 0.020, 0.025, 0.031, 0.040, 0.047, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] },
          neckStyles: ['standard', 'long_reach', 'extra_long_reach']
        },
        'HBH': {
          name: 'HBH Ball Series',
          type: 'hardened_ball_endmill',
          description: 'Ball end mills for hardened steel',
          flutes: [2, 4],
          coatings: ['Aplus', 'nACo'],
          hrcRange: [45, 65],
          diameterRange: { inch: [0.020, 0.031, 0.047, 0.062, 0.094, 0.125, 0.187, 0.250, 0.312, 0.375, 0.500] }
        }
      },
      cornerRadius: {
        'HCR': {
          name: 'HCR Corner Radius',
          type: 'corner_radius_endmill',
          description: 'Corner radius end mills',
          flutes: [4, 5],
          radii: { inch: [0.005, 0.010, 0.015, 0.020, 0.030, 0.040, 0.062, 0.094, 0.125] },
          coatings: ['Aplus'],
          diameterRange: { inch: [0.125, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        }
      },
      roughing: {
        'HCF': {
          name: 'HCF Chipbreaker',
          type: 'roughing_endmill',
          description: 'Chipbreaker roughing end mills',
          flutes: [4, 5, 6],
          coatings: ['Aplus'],
          chipbreaker: true,
          diameterRange: { inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0, 1.250] }
        }
      }
    },
    grades: {
      'Aplus': { coating: 'AlTiN_plus', application: 'general_high_performance', maxTemp: 900, color: 'purple' },
      'nACo': { coating: 'nanocomposite_AlCrN', application: 'hardened_steel', maxTemp: 1100, color: 'copper' },
      'ZrN': { coating: 'ZrN', application: 'aluminum_non_ferrous', friction: 0.15, color: 'gold' }
    }
  },
  // 6. SGS TOOL COMPANY - Complete Product Line

  sgs: {
    manufacturer: {
      name: 'SGS Tool Company',
      country: 'USA',
      founded: 1960,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'Leader in Solid Carbide End Mills',
      website: 'sgstool.com',
      specialty: 'Solid carbide end mills and burrs'
    },
    milling: {
      squareEndMills: {
        'S-CARB': {
          name: 'S-Carb Series',
          type: 'solid_carbide_endmill',
          description: 'Premium solid carbide end mills',
          series: {
            'Z-CARB': { flutes: 3, geometry: 'aluminum', applications: ['aluminum', 'plastics'] },
            '4Z': { flutes: 4, geometry: 'general', applications: ['steel', 'stainless'] },
            '5Z': { flutes: 5, geometry: 'high_performance', applications: ['steel', 'titanium'] },
            '6Z': { flutes: 6, geometry: 'finishing', applications: ['steel', 'hardened'] },
            'HP': { flutes: 4, geometry: 'high_performance', applications: ['aerospace'] }
          },
          coatings: ['Ti-NAMITE-A', 'Ti-NAMITE-X', 'Ti-NAMITE-C', 'Diamond_ZR'],
          diameterRange: { inch: [0.031, 0.047, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0, 1.250] }
        },
        '43': {
          name: 'Series 43',
          type: 'high_performance_endmill',
          description: 'High performance titanium machining',
          flutes: [5, 6, 7],
          variableHelix: true,
          variablePitch: true,
          coatings: ['Ti-NAMITE-A'],
          materials: ['titanium', 'inconel', 'waspaloy'],
          diameterRange: { inch: [0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        '44': {
          name: 'Series 44',
          type: 'hardened_steel_endmill',
          description: 'Hardened steel machining',
          flutes: [4, 6],
          coatings: ['Ti-NAMITE-X'],
          hrcRange: [48, 65],
          diameterRange: { inch: [0.062, 0.094, 0.125, 0.187, 0.250, 0.312, 0.375, 0.500] }
        }
      },
      ballEndMills: {
        '10B': {
          name: 'Series 10B Ball',
          type: 'ball_endmill',
          description: 'General purpose ball end mills',
          flutes: [2, 4],
          coatings: ['Ti-NAMITE-A', 'Ti-NAMITE-X'],
          diameterRange: { inch: [0.015, 0.020, 0.031, 0.047, 0.062, 0.094, 0.125, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
        },
        '44B': {
          name: 'Series 44B Ball',
          type: 'hardened_ball_endmill',
          description: 'Ball end for hardened steel',
          flutes: [2, 4],
          coatings: ['Ti-NAMITE-X'],
          hrcRange: [48, 65],
          diameterRange: { inch: [0.020, 0.031, 0.047, 0.062, 0.094, 0.125, 0.187, 0.250, 0.312, 0.375, 0.500] }
        }
      },
      roughing: {
        'POWER-CARB': {
          name: 'Power-Carb Series',
          type: 'roughing_endmill',
          description: 'High MRR roughing end mills',
          flutes: [4, 5, 6],
          chipbreaker: true,
          coatings: ['Ti-NAMITE-A'],
          diameterRange: { inch: [0.250, 0.375, 0.500, 0.625, 0.750, 1.0, 1.250] }
        }
      }
    },
    burrs: {
      'CARBIDE-BURRS': {
        name: 'Carbide Burrs',
        type: 'rotary_burr',
        description: 'Precision carbide burrs',
        shapes: ['cylinder', 'ball', 'tree', 'flame', 'cone', 'oval', 'inverted_cone'],
        cuts: ['single', 'double', 'aluminum'],
        diameterRange: { inch: [0.062, 0.094, 0.125, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] }
      }
    },
    grades: {
      'Ti-NAMITE-A': { coating: 'AlTiN_multilayer', application: 'general_aerospace', maxTemp: 800, color: 'purple' },
      'Ti-NAMITE-X': { coating: 'AlTiN_extreme', application: 'hardened_steel', maxTemp: 1000, color: 'copper' },
      'Ti-NAMITE-C': { coating: 'TiCN_AlTiN', application: 'stainless', maxTemp: 700, color: 'gray' },
      'Diamond_ZR': { coating: 'ZrN', application: 'aluminum', friction: 0.15, color: 'gold' }
    }
  },
  // 7. KYOCERA - Complete Product Line

  kyocera: {
    manufacturer: {
      name: 'Kyocera Precision Tools',
      country: 'Japan',
      founded: 1959,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'Leader in Ceramics & Cermets',
      website: 'kyoceraprecisiontools.com',
      specialty: 'Ceramic cutting tools and advanced materials'
    },
    turning: {
      inserts: {
        'CNMG': {
          name: 'CNMG Inserts',
          type: 'negative_turning_insert',
          chipbreakers: ['PV', 'PP', 'PG', 'PR', 'PH', 'GF', 'GS', 'GK'],
          grades: {
            steel: ['PR1535', 'PR1525', 'PR1510', 'PR1305'],
            stainless: ['PR1225', 'PR1215'],
            cast_iron: ['PR1025', 'PR1015'],
            cermet: ['TN60', 'TN620'],
            ceramic: ['A65', 'A66'],
            cbn: ['KBN510', 'KBN525']
          },
          sizes: ['120404', '120408', '120412', '160608', '160612', '160616']
        },
        'CCMT': {
          name: 'CCMT Inserts',
          type: 'positive_turning_insert',
          chipbreakers: ['PV', 'PP', 'GF', 'GS'],
          grades: {
            steel: ['PR1535', 'PR1525'],
            stainless: ['PR1225'],
            cermet: ['TN60', 'TN620']
          },
          sizes: ['060204', '09T304', '09T308', '120404', '120408']
        }
      },
      grooving: {
        'GBA': {
          name: 'GBA Grooving System',
          type: 'grooving',
          description: 'Self-grip grooving',
          widths: { metric: [1.5, 2, 2.5, 3, 4, 5, 6] },
          maxDepth: { metric: [15, 20, 25, 30] },
          grades: ['PR1215', 'PR1225', 'TN60']
        }
      }
    },
    milling: {
      indexable: {
        'MEC': {
          name: 'MEC Milling System',
          type: 'indexable_shoulder_mill',
          description: 'High efficiency milling',
          inserts: ['LOMU', 'SOMT'],
          maxDoc: { metric: 11 },
          diameterRange: { metric: [40, 50, 63, 80, 100, 125] }
        },
        'MFK': {
          name: 'MFK Face Mill',
          type: 'indexable_face_mill',
          description: 'Multi-functional face milling',
          inserts: ['AOMT', 'APMT'],
          diameterRange: { metric: [16, 20, 25, 32, 40, 50] }
        },
        'MFH': {
          name: 'MFH High Feed',
          type: 'indexable_high_feed',
          description: 'High feed milling',
          inserts: ['LNMU'],
          maxDoc: { metric: 1.2 },
          maxFpt: { metric: 2.0 },
          diameterRange: { metric: [25, 32, 40, 50, 63, 80] }
        }
      },
      solidCarbide: {
        'MFPN': {
          name: 'MFPN End Mill',
          type: 'solid_carbide_endmill',
          description: 'Precision solid carbide',
          flutes: [2, 4, 6],
          coatings: ['MEGACOAT', 'MEGACOAT_NANO'],
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] }
        }
      }
    },
    drilling: {
      solidCarbide: {
        'KDA': {
          name: 'KDA Drill',
          type: 'solid_carbide_drill',
          description: 'High precision drilling',
          coatings: ['MEGACOAT'],
          depthCapability: ['3xD', '5xD', '8xD', '12xD'],
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] }
        }
      },
      indexable: {
        'MDP': {
          name: 'MDP Indexable Drill',
          type: 'indexable_drill',
          description: 'Modular drilling system',
          diameterRange: { metric: [14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD']
        }
      }
    },
    grades: {
      carbide: {
        'PR1535': { iso: 'P35', coating: 'MEGACOAT_NANO', application: 'steel_roughing' },
        'PR1525': { iso: 'P25', coating: 'MEGACOAT_NANO', application: 'steel_general' },
        'PR1510': { iso: 'P10', coating: 'MEGACOAT_NANO', application: 'steel_finishing' },
        'PR1225': { iso: 'M25', coating: 'MEGACOAT', application: 'stainless_general' },
        'PR1025': { iso: 'K25', coating: 'MEGACOAT', application: 'cast_iron_general' }
      },
      cermet: {
        'TN60': { substrate: 'cermet', application: 'steel_finishing', hardness: 1600 },
        'TN620': { substrate: 'cermet', application: 'steel_semi_finish', hardness: 1550 }
      },
      ceramic: {
        'A65': { substrate: 'alumina', application: 'cast_iron', speed: '600-3000m/min', color: 'white' },
        'A66': { substrate: 'alumina_TiC', application: 'hardened_steel', speed: '100-600m/min', color: 'black' },
        'KS6050': { substrate: 'SiAlON', application: 'nickel_alloy', speed: '600-1500m/min', color: 'gray' }
      },
      cbn: {
        'KBN510': { substrate: 'CBN', application: 'hardened_steel', hrcRange: [50, 65], continuous: true },
        'KBN525': { substrate: 'CBN', application: 'hardened_steel', hrcRange: [45, 62], interrupted: true }
      }
    }
  },
  // 8. SUMITOMO ELECTRIC - Complete Product Line

  sumitomo: {
    manufacturer: {
      name: 'Sumitomo Electric Hardmetal',
      country: 'Japan',
      founded: 1928,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'Top 10 Global',
      website: 'sumitomotool.com',
      specialty: 'Advanced carbide and CBN tools'
    },
    turning: {
      inserts: {
        'AC8000P': {
          name: 'AC8000P Series',
          type: 'steel_turning_grade',
          technology: 'ABSOTECH',
          description: 'Multi-layer CVD for steel',
          grades: {
            'AC8015P': { iso: 'P15', application: 'finishing' },
            'AC8025P': { iso: 'P25', application: 'medium' },
            'AC8035P': { iso: 'P35', application: 'roughing' }
          },
          shapes: ['CNMG', 'DNMG', 'WNMG', 'TNMG', 'VNMG', 'SNMG'],
          chipbreakers: ['EUP', 'EUX', 'EGP', 'EGE', 'EGX', 'EMP', 'EMX', 'ERP', 'ERX']
        },
        'AC800M': {
          name: 'AC800M Series',
          type: 'stainless_turning_grade',
          description: 'Stainless steel machining',
          grades: {
            'AC820M': { iso: 'M20', application: 'general' },
            'AC830M': { iso: 'M30', application: 'roughing' }
          },
          shapes: ['CNMG', 'DNMG', 'WNMG', 'TNMG']
        },
        'BN7000': {
          name: 'BN7000 CBN',
          type: 'cbn_insert',
          description: 'CBN for hardened steel',
          grades: {
            'BN7500': { application: 'continuous', hrcRange: [50, 65] },
            'BN7800': { application: 'interrupted', hrcRange: [45, 62] }
          },
          shapes: ['CNGA', 'DNGA', 'TNGA', 'VNGA', 'WNGA']
        }
      },
      grooving: {
        'GND': {
          name: 'GND Grooving',
          type: 'grooving_parting',
          description: 'Precision grooving system',
          widths: { metric: [1.5, 2, 2.5, 3, 4, 5, 6] },
          maxDepth: { metric: [15, 20, 25] },
          grades: ['AC820M', 'AC8025P']
        }
      }
    },
    milling: {
      solidCarbide: {
        'WEX': {
          name: 'WEX End Mill',
          type: 'solid_carbide_endmill',
          description: 'Wave cutting edge for vibration reduction',
          flutes: [4, 5, 6],
          coatings: ['Super_ZX', 'Super_FF'],
          waveEdge: true,
          diameterRange: { metric: [6, 8, 10, 12, 16, 20, 25] },
          applications: ['steel', 'stainless', 'titanium']
        },
        'GSX': {
          name: 'GSX End Mill',
          type: 'solid_carbide_endmill',
          description: 'High efficiency general purpose',
          flutes: [2, 4],
          coatings: ['Super_FF', 'Super_ZX'],
          diameterRange: { metric: [2, 3, 4, 5, 6, 8, 10, 12] }
        }
      },
      indexable: {
        'SEC-WAVE': {
          name: 'SEC-Wave Mill',
          type: 'indexable_shoulder_mill',
          description: 'Wave edge shoulder milling',
          inserts: ['AOMT', 'LOMT'],
          maxDoc: { metric: 11 },
          diameterRange: { metric: [25, 32, 40, 50, 63, 80] }
        },
        'DFC': {
          name: 'DFC Face Mill',
          type: 'indexable_face_mill',
          description: 'Double-sided face milling',
          inserts: ['SNMU', 'ONMU'],
          edgesPerInsert: 8,
          diameterRange: { metric: [50, 63, 80, 100, 125, 160, 200] }
        }
      }
    },
    drilling: {
      solidCarbide: {
        'MDW': {
          name: 'MDW Drill',
          type: 'solid_carbide_drill',
          description: 'Multi-material drilling',
          coatings: ['Super_ZX'],
          depthCapability: ['3xD', '5xD', '8xD', '12xD'],
          coolantThru: true,
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] }
        }
      },
      indexable: {
        'SMD': {
          name: 'SMD Multi-Drill',
          type: 'indexable_drill',
          description: 'Modular indexable drilling',
          inserts: ['SOMT', 'SCMT'],
          diameterRange: { metric: [14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD']
        }
      }
    },
    grades: {
      steel: {
        'AC8015P': { iso: 'P15', coating: 'ABSOTECH_CVD', application: 'steel_finishing' },
        'AC8025P': { iso: 'P25', coating: 'ABSOTECH_CVD', application: 'steel_general' },
        'AC8035P': { iso: 'P35', coating: 'ABSOTECH_CVD', application: 'steel_roughing' }
      },
      stainless: {
        'AC820M': { iso: 'M20', coating: 'PVD', application: 'stainless_general' },
        'AC830M': { iso: 'M30', coating: 'CVD', application: 'stainless_roughing' }
      },
      solid_carbide: {
        'Super_ZX': { coating: 'multilayer_TiAlN', application: 'general_high_performance' },
        'Super_FF': { coating: 'TiAlN_lubricant', application: 'finishing' }
      },
      cbn: {
        'BN7500': { substrate: 'CBN_high_content', application: 'continuous_hardened' },
        'BN7800': { substrate: 'CBN_tough', application: 'interrupted_hardened' }
      }
    }
  },
  // UTILITY METHODS

  getManufacturer(name) {
    const key = name.toLowerCase().replace(/[^a-z]/g, '');
    for (const [mfrKey, mfr] of Object.entries(this)) {
      if (typeof mfr === 'object' && mfr.manufacturer) {
        if (mfrKey.includes(key) || mfr.manufacturer.name.toLowerCase().includes(key)) {
          return { key: mfrKey, ...mfr };
        }
      }
    }
    return null;
  },
  getProductLines(manufacturerKey) {
    const mfr = this[manufacturerKey];
    if (!mfr) return null;

    const lines = [];
    for (const [category, products] of Object.entries(mfr)) {
      if (category === 'manufacturer' || category === 'grades') continue;

      if (typeof products === 'object') {
        for (const [subCat, items] of Object.entries(products)) {
          if (typeof items === 'object') {
            for (const [name, data] of Object.entries(items)) {
              lines.push({
                category: category,
                subCategory: subCat,
                name: name,
                ...data
              });
            }
          }
        }
      }
    }
    return lines;
  },
  searchProducts(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [mfrKey, mfr] of Object.entries(this)) {
      if (typeof mfr !== 'object' || !mfr.manufacturer) continue;

      const lines = this.getProductLines(mfrKey);
      if (!lines) continue;

      for (const line of lines) {
        if (line.name.toLowerCase().includes(lowerQuery) ||
            (line.description && line.description.toLowerCase().includes(lowerQuery))) {
          results.push({
            manufacturer: mfr.manufacturer.name,
            ...line
          });
        }
      }
    }
    return results;
  },
  getStats() {
    const stats = {
      manufacturers: 0,
      totalProductLines: 0,
      byCategory: {}
    };
    for (const [key, mfr] of Object.entries(this)) {
      if (typeof mfr !== 'object' || !mfr.manufacturer) continue;

      stats.manufacturers++;

      const lines = this.getProductLines(key);
      if (lines) {
        stats.totalProductLines += lines.length;

        for (const line of lines) {
          if (!stats.byCategory[line.category]) {
            stats.byCategory[line.category] = 0;
          }
          stats.byCategory[line.category]++;
        }
      }
    }
    return stats;
  },
  init() {
    console.log('[PRISM_MANUFACTURERS_BATCH2] Initializing 8 additional manufacturers...');

    const stats = this.getStats();
    console.log('[MANUFACTURERS_B2] ✓ ' + stats.manufacturers + ' manufacturers');
    console.log('[MANUFACTURERS_B2] ✓ ' + stats.totalProductLines + ' product lines');

    // Register additional global functions
    window.getMfrCatalog2 = (name) => this.getManufacturer(name);
    window.searchMfrProducts2 = (query) => this.searchProducts(query);

    console.log('[PRISM_MANUFACTURERS_BATCH2] v1.0 - Additional catalogs ready');

    return this;
  }
}