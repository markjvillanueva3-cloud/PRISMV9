const PRISM_CUTTING_TOOL_EXPANSION_V3 = {
  version: '3.0.0',
  lastUpdated: '2026-01-06',

  // 1. BALL END MILLS - Comprehensive Coverage

  ballEndMills: {

    // MOLDINO (Hitachi) - Die/Mold Specialists
    moldino: {
      manufacturer: { name: 'Moldino (Hitachi Tool)', country: 'Japan', quality: 'Ultra-Premium', specialty: 'Die/Mold', priceLevel: 5 },
      series: {
        'EPOCH-DEEP-BALL': {
          name: 'EPOCH Deep Ball',
          description: 'Ultra-deep reach ball end mills for die/mold',
          geometry: 'ball',
          flutes: [2, 4],
          substrate: 'ultrafine_carbide',
          coatings: ['TH3', 'TH2'],
          helixAngle: [30],
          maxDepthRatio: 20,  // 20xD reach
          sizes: {
            inch: [0.020, 0.031, 0.039, 0.047, 0.062, 0.078, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500],
            metric: [0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0]
          },
          tolerances: { diameter: 0.0002, runout: 0.0001 },
          applications: ['die_mold', 'micro_machining', 'medical', 'aerospace'],
          cuttingData: {
            steel_p: { sfm: 650, ipt: 0.0008, ae: 0.05, stepover_pct: 5 },
            steel_h50: { sfm: 300, ipt: 0.0004, ae: 0.03, stepover_pct: 3 },
            aluminum: { sfm: 1500, ipt: 0.002, ae: 0.1, stepover_pct: 8 },
            graphite: { sfm: 2000, ipt: 0.003, ae: 0.15, stepover_pct: 10 }
          }
        },
        'EPOCH-SUS-BALL': {
          name: 'EPOCH SUS Ball',
          description: 'Ball end mills for stainless and heat-resistant alloys',
          flutes: [4, 6],
          coatings: ['TH3'],
          helixAngle: [35],
          sizes: { metric: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0] },
          cuttingData: {
            stainless_304: { sfm: 350, ipt: 0.0006, ae: 0.04, stepover_pct: 4 },
            inconel: { sfm: 120, ipt: 0.0003, ae: 0.02, stepover_pct: 2 },
            titanium: { sfm: 180, ipt: 0.0004, ae: 0.03, stepover_pct: 3 }
          }
        },
        'GALLEA-BALL': {
          name: 'GALLEA Ball End Mill',
          description: 'High efficiency ball end for general die/mold',
          flutes: [2, 4],
          coatings: ['TH3', 'TH2'],
          helixAngle: [30, 35],
          sizes: { metric: [2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0, 20.0] },
          applications: ['die_mold', 'general_finishing']
        }
      }
    },
    // MITSUBISHI MATERIALS
    mitsubishi: {
      manufacturer: { name: 'Mitsubishi Materials', country: 'Japan', quality: 'Premium', specialty: 'Carbide Tools', priceLevel: 4 },
      series: {
        'VF2SB': {
          name: 'VF2SB Ball Nose',
          description: 'SMART MIRACLE coated 2-flute ball',
          flutes: [2],
          coatings: ['SMART_MIRACLE'],
          helixAngle: [30],
          sizes: { metric: [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0] },
          cuttingData: {
            steel_p: { sfm: 590, ipt: 0.0008, stepover_pct: 5 },
            steel_h45: { sfm: 350, ipt: 0.0005, stepover_pct: 3 }
          }
        },
        'VF4SBR': {
          name: 'VF4SBR Multi-Flute Ball',
          description: '4-flute ball for high efficiency finishing',
          flutes: [4],
          coatings: ['SMART_MIRACLE'],
          helixAngle: [30],
          sizes: { metric: [3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0] }
        },
        'IMPACT-MIRACLE-BALL': {
          name: 'Impact Miracle Ball',
          description: 'For hardened steels up to 65 HRC',
          flutes: [2, 4],
          coatings: ['IMPACT_MIRACLE'],
          helixAngle: [30],
          hardnessRange: { min: 45, max: 65 },
          sizes: { metric: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0] }
        }
      }
    },
    // OSG
    osg: {
      manufacturer: { name: 'OSG', country: 'Japan', quality: 'Premium', specialty: 'Threading & Milling', priceLevel: 4 },
      series: {
        'A-BRAND-BALL': {
          name: 'A Brand Ball End Mill',
          description: 'Universal ball end mills',
          flutes: [2, 4],
          coatings: ['WXL', 'A_BRAND_COAT'],
          helixAngle: [30],
          sizes: {
            inch: [0.031, 0.062, 0.094, 0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0],
            metric: [0.8, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0, 20.0]
          }
        },
        'PHX-BALL': {
          name: 'Phoenix Ball End Mill',
          description: 'High performance ball for tough materials',
          flutes: [4, 6],
          coatings: ['PHX_COAT'],
          helixAngle: [35],
          sizes: { metric: [3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0] }
        }
      }
    },
    // SANDVIK COROMANT
    sandvik: {
      manufacturer: { name: 'Sandvik Coromant', country: 'Sweden', quality: 'Premium', specialty: 'Complete Solutions', priceLevel: 5 },
      series: {
        'COROMILL-PLURA-BALL': {
          name: 'CoroMill Plura Ball Nose',
          description: 'Solid carbide ball nose for die/mold',
          flutes: [2, 4],
          coatings: ['GC1620', 'GC1640'],
          helixAngle: [30],
          sizes: { metric: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0, 20.0] },
          neckTypes: ['standard', 'long_reach', 'taper_neck'],
          cuttingData: {
            steel_p: { vc: 200, fz: 0.02, ae_pct: 5 },
            steel_h: { vc: 100, fz: 0.01, ae_pct: 3 },
            stainless: { vc: 150, fz: 0.015, ae_pct: 4 }
          }
        },
        'R216-BALL': {
          name: 'R216 Ball Nose End Mill',
          description: 'Indexable ball nose for larger diameters',
          type: 'indexable',
          inserts: ['R216-16T3', 'R216-20T3', 'R216-25T3', 'R216-32T3'],
          sizes: { metric: [16, 20, 25, 32, 40, 50] }
        }
      }
    },
    // KENNAMETAL
    kennametal: {
      manufacturer: { name: 'Kennametal', country: 'USA', quality: 'Premium', specialty: 'Metalworking', priceLevel: 4 },
      series: {
        'HARVI-BALL': {
          name: 'HARVI Ball End Mill',
          description: 'High performance ball for aerospace & die/mold',
          flutes: [2, 4],
          coatings: ['KCSM15', 'KC643M'],
          helixAngle: [30, 38],
          sizes: {
            inch: [0.125, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0],
            metric: [3, 5, 6, 8, 10, 12, 16, 20, 25]
          },
          features: ['variable_helix', 'eccentric_relief', 'center_cutting']
        }
      }
    }
  },
  // 2. BARREL/CIRCLE SEGMENT CUTTERS - Advanced Finishing

  barrelCutters: {

    types: {
      'barrel': {
        name: 'Barrel Cutter',
        description: 'Tangent barrel form for walls and fillets',
        effectiveRadius: 'large',  // R typically 25-200mm effective
        bestFor: ['wall_finishing', 'fillet_machining', 'blend_surfaces'],
        stepoverAdvantage: '5-10x vs ball end mill'
      },
      'lens': {
        name: 'Lens Form / Oval Form',
        description: 'Double radius form for complex surfaces',
        effectiveRadius: 'very_large',
        bestFor: ['complex_surfaces', 'automotive_dies', 'turbine_blades']
      },
      'taper_ball': {
        name: 'Taper Ball / Conical Ball',
        description: 'Ball with tapered neck for deep cavities',
        effectiveRadius: 'standard_ball',
        bestFor: ['deep_cavities', 'ribs', 'narrow_slots']
      },
      'drop_shape': {
        name: 'Drop Shape / Teardrop',
        description: 'Asymmetric form for undercuts',
        effectiveRadius: 'medium',
        bestFor: ['undercuts', 'turbine_roots', 'airfoils']
      }
    },
    // EMUGE - Circle Segment Leaders
    emuge: {
      manufacturer: { name: 'Emuge-Franken', country: 'Germany', quality: 'Premium', specialty: 'Threading & Milling', priceLevel: 4 },
      series: {
        'CIRCLE-SEGMENT-BARREL': {
          name: 'Circle Segment Barrel Form',
          type: 'barrel',
          flutes: [4, 6],
          coatings: ['TiAlN', 'nACo'],
          sizes: {
            inch: [
              { d: 0.250, r: 2.0, loc: 0.375 },
              { d: 0.375, r: 3.0, loc: 0.500 },
              { d: 0.500, r: 4.0, loc: 0.625 },
              { d: 0.500, r: 6.0, loc: 0.750 },
              { d: 0.625, r: 5.0, loc: 0.750 },
              { d: 0.750, r: 6.0, loc: 0.875 },
              { d: 0.750, r: 10.0, loc: 1.000 },
              { d: 1.000, r: 8.0, loc: 1.000 },
              { d: 1.000, r: 15.0, loc: 1.250 }
            ],
            metric: [
              { d: 6, r: 50, loc: 10 },
              { d: 8, r: 75, loc: 12 },
              { d: 10, r: 100, loc: 15 },
              { d: 12, r: 125, loc: 18 },
              { d: 16, r: 150, loc: 24 },
              { d: 20, r: 200, loc: 30 }
            ]
          },
          geometry: {
            cutting_profile: 'circular_arc',
            contact_angle_range: { min: 15, max: 75 },
            effective_stepover: '5-10x ball'
          },
          cuttingData: {
            steel_p: { sfm: 500, ipt: 0.002, stepover_mm: 2.0 },
            steel_h45: { sfm: 280, ipt: 0.001, stepover_mm: 1.0 },
            aluminum: { sfm: 1200, ipt: 0.004, stepover_mm: 4.0 },
            titanium: { sfm: 150, ipt: 0.0008, stepover_mm: 0.8 }
          }
        },
        'CIRCLE-SEGMENT-LENS': {
          name: 'Circle Segment Lens Form',
          type: 'lens',
          flutes: [4, 6],
          coatings: ['TiAlN', 'nACo'],
          description: 'Double radius for bottom and side cutting',
          sizes: {
            inch: [
              { d: 0.500, r1: 4.0, r2: 2.0, loc: 0.625 },
              { d: 0.750, r1: 6.0, r2: 3.0, loc: 0.875 },
              { d: 1.000, r1: 8.0, r2: 4.0, loc: 1.000 }
            ]
          }
        },
        'CIRCLE-SEGMENT-TAPER': {
          name: 'Circle Segment Taper Ball',
          type: 'taper_ball',
          flutes: [2, 4],
          coatings: ['TiAlN'],
          description: 'Ball end with tapered neck for deep reach',
          taperAngles: [1, 2, 3, 5],
          sizes: {
            inch: [
              { d: 0.125, taper: 1, reach: 2.0 },
              { d: 0.187, taper: 1, reach: 2.5 },
              { d: 0.250, taper: 2, reach: 3.0 },
              { d: 0.375, taper: 2, reach: 4.0 },
              { d: 0.500, taper: 3, reach: 5.0 }
            ]
          }
        }
      }
    },
    // SANDVIK COROMANT - CoroMill Plura Barrel
    sandvik: {
      manufacturer: { name: 'Sandvik Coromant', country: 'Sweden', quality: 'Premium', priceLevel: 5 },
      series: {
        'COROMILL-PLURA-BARREL': {
          name: 'CoroMill Plura Barrel',
          type: 'barrel',
          flutes: [4],
          coatings: ['GC1640'],
          sizes: {
            metric: [
              { d: 10, r: 100, loc: 15 },
              { d: 12, r: 100, loc: 18 },
              { d: 12, r: 150, loc: 20 },
              { d: 16, r: 150, loc: 24 },
              { d: 16, r: 200, loc: 28 },
              { d: 20, r: 200, loc: 30 }
            ]
          },
          cuttingData: {
            steel_p: { vc: 200, fz: 0.08, ae: 2.0 },
            steel_h: { vc: 100, fz: 0.04, ae: 1.0 },
            stainless: { vc: 150, fz: 0.06, ae: 1.5 }
          }
        }
      }
    },
    // SECO - Circle Segment Cutters
    seco: {
      manufacturer: { name: 'Seco Tools', country: 'Sweden', quality: 'Premium', priceLevel: 4 },
      series: {
        'JABRO-BARREL': {
          name: 'Jabro Circle Segment',
          type: 'barrel',
          flutes: [4, 5, 6],
          coatings: ['SIRA'],
          sizes: {
            metric: [
              { d: 8, r: 60, loc: 12 },
              { d: 10, r: 80, loc: 15 },
              { d: 12, r: 100, loc: 18 },
              { d: 16, r: 150, loc: 24 }
            ]
          }
        }
      }
    },
    // KENNAMETAL
    kennametal: {
      manufacturer: { name: 'Kennametal', country: 'USA', quality: 'Premium', priceLevel: 4 },
      series: {
        'HARVI-BARREL': {
          name: 'HARVI Circle Segment',
          type: 'barrel',
          flutes: [4, 6],
          coatings: ['KCSM15', 'KC643M'],
          features: ['variable_helix'],
          sizes: {
            inch: [
              { d: 0.500, r: 4.0, loc: 0.625 },
              { d: 0.750, r: 6.0, loc: 0.875 },
              { d: 1.000, r: 8.0, loc: 1.000 }
            ]
          }
        }
      }
    }
  },
  // 3. HIGH FEED MILLS - Modern Roughing

  highFeedMills: {

    solidCarbide: {
      // ISCAR High Feed
      'ISCAR-FEEDMILL': {
        manufacturer: 'iscar',
        name: 'FeedMill',
        description: 'High feed solid carbide end mills',
        flutes: [4, 5, 6],
        coatings: ['IC903', 'IC908'],
        helixAngle: [45],
        chipbreaker: true,
        maxDoc: 0.020,  // shallow DOC
        maxFpt: 0.030,  // high feed per tooth
        sizes: { inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.000] },
        cuttingData: {
          steel_p: { sfm: 650, ipt: 0.015, doc: 0.015, woc: 0.6 },
          stainless: { sfm: 450, ipt: 0.012, doc: 0.012, woc: 0.5 },
          cast_iron: { sfm: 700, ipt: 0.018, doc: 0.018, woc: 0.65 }
        }
      },
      // SECO Highfeed
      'SECO-HIGHFEED-SC': {
        manufacturer: 'seco',
        name: 'Jabro Highfeed',
        description: 'High feed end mills for roughing',
        flutes: [4, 5, 6, 7],
        coatings: ['SIRA', 'HXT'],
        helixAngle: [40],
        sizes: { metric: [6, 8, 10, 12, 16, 20, 25] }
      },
      // Destiny High Feed
      'DESTINY-VIPER': {
        manufacturer: 'destiny',
        name: 'Viper High Feed',
        description: 'American-made high feed end mills',
        flutes: [4, 5, 6],
        coatings: ['AlTiN', 'nACo'],
        sizes: { inch: [0.250, 0.375, 0.500, 0.625, 0.750, 1.000] }
      }
    },
    indexable: {
      // ISCAR High Feed Indexable
      'ISCAR-FF-FWX': {
        manufacturer: 'iscar',
        name: 'FF FWX High Feed Mill',
        type: 'face_mill',
        inserts: ['LNKX', 'XNMU'],
        sizes: { metric: [20, 25, 32, 40, 50, 63, 80, 100] },
        insertPockets: [2, 3, 4, 5, 6, 7, 8, 10],
        maxDoc: 1.2,
        maxFpt: 2.5
      },
      // SECO Highfeed Indexable
      'SECO-HIGHFEED-2': {
        manufacturer: 'seco',
        name: 'Highfeed 2',
        inserts: ['LOEX', 'LPMX'],
        sizes: { metric: [16, 20, 25, 32, 40, 50, 63] },
        features: ['through_coolant', 'close_pitch']
      },
      // Kennametal HARVI Ultra
      'KENNAMETAL-HARVI-ULTRA': {
        manufacturer: 'kennametal',
        name: 'HARVI Ultra High Feed',
        inserts: ['XNGX'],
        sizes: { inch: [0.750, 1.000, 1.250, 1.500, 2.000] },
        features: ['helical_insert', 'free_cutting']
      },
      // Sandvik CoroMill 415
      'SANDVIK-COROMILL-415': {
        manufacturer: 'sandvik',
        name: 'CoroMill 415 High Feed',
        inserts: ['415R', '415N'],
        sizes: { metric: [16, 20, 25, 32, 40, 50] },
        maxDoc: 0.8,