/**
 * PRISM_MAJOR_MANUFACTURERS_CATALOG
 * Extracted from PRISM v8.89.002 monolith
 * References: 16
 * Category: catalogs
 * Lines: 1932
 * Session: R2.3.6 Catalog/MIT Extraction
 */

const PRISM_MAJOR_MANUFACTURERS_CATALOG = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  // 1. SANDVIK COROMANT - Complete Product Line

  sandvik: {
    manufacturer: {
      name: 'Sandvik Coromant',
      country: 'Sweden',
      founded: 1942,
      quality: 'Ultra-Premium',
      priceLevel: 5,
      marketPosition: 'Global Leader',
      website: 'sandvik.coromant.com',
      specialty: 'Complete machining solutions'
    },
    // MILLING - CoroMill Family
    milling: {
      faceMilling: {
        'CoroMill-245': {
          name: 'CoroMill 245',
          type: 'face_mill',
          leadAngle: 45,
          description: 'General face milling up to 10mm DOC',
          inserts: ['245R-12T308E-PL', '245R-12T308M-PM', '245R-12T308E-MM'],
          grades: ['GC4240', 'GC4330', 'GC1130', 'GC3040'],
          diameterRange: { metric: [40, 50, 63, 80, 100, 125, 160, 200, 250, 315] },
          maxDoc: 10,
          applications: ['steel', 'stainless', 'cast_iron']
        },
        'CoroMill-345': {
          name: 'CoroMill 345',
          type: 'face_mill',
          leadAngle: 45,
          description: '8-edge insert for economical face milling',
          inserts: ['345R-1305E-PL', '345R-1305M-PM', '345R-13T508M-PH'],
          grades: ['GC4340', 'GC4330', 'GC1130'],
          diameterRange: { metric: [32, 40, 50, 63, 80, 100, 125, 160] },
          maxDoc: 6,
          edgesPerInsert: 8
        },
        'CoroMill-390': {
          name: 'CoroMill 390',
          type: 'shoulder_mill',
          leadAngle: 90,
          description: 'Long-edge shoulder milling',
          inserts: ['390R-070204E-PM', '390R-11T308E-PM', '390R-17T308M-PM'],
          diameterRange: { metric: [10, 12, 16, 20, 25, 32, 40, 50, 63, 80] },
          maxDoc: 15.7
        },
        'CoroMill-490': {
          name: 'CoroMill 490',
          type: 'shoulder_mill',
          leadAngle: 90,
          description: 'Versatile 90° shoulder milling',
          inserts: ['490R-08T308E-ML', '490R-08T308M-PM', '490R-140408E-MM'],
          diameterRange: { metric: [20, 25, 32, 40, 50, 63, 80, 100] },
          maxDoc: 10,
          trueTo90: true
        },
        'CoroMill-600': {
          name: 'CoroMill 600',
          type: 'face_mill',
          leadAngle: 60,
          description: 'High-feed face milling',
          inserts: ['600-1045E-ML', '600-1045M-PM'],
          diameterRange: { metric: [50, 63, 80, 100, 125] },
          maxDoc: 1.3,
          highFeed: true
        }
      },
      endMilling: {
        'CoroMill-Plura': {
          name: 'CoroMill Plura',
          type: 'solid_carbide_endmill',
          description: 'Solid carbide end mills for all materials',
          series: {
            '1P220': { flutes: 2, geometry: 'general', materials: ['steel', 'stainless'] },
            '1P230': { flutes: 3, geometry: 'aluminum', materials: ['aluminum', 'non_ferrous'] },
            '1P240': { flutes: 4, geometry: 'steel', materials: ['steel', 'cast_iron'] },
            '1P260': { flutes: 6, geometry: 'finishing', materials: ['steel', 'stainless'] },
            '1P341': { flutes: 4, geometry: 'hardened', materials: ['hardened_steel'], hrc: '45-65' },
            '1P360': { flutes: 6, geometry: 'high_feed', materials: ['steel'] },
            '2P122': { flutes: 2, geometry: 'ball', materials: ['steel', 'stainless'] },
            '2B340': { flutes: 4, geometry: 'barrel', materials: ['steel', 'titanium'] }
          },
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25] },
          grades: ['GC1620', 'GC1640', 'GC1700', 'GC1730']
        },
        'CoroMill-316': {
          name: 'CoroMill 316',
          type: 'exchangeable_head',
          description: 'Exchangeable head end mill system',
          headTypes: ['square', 'ball', 'toroid', 'chamfer', 'thread'],
          diameterRange: { metric: [10, 12, 16, 20, 25] },
          coupling: 'iLock'
        }
      },
      slotMilling: {
        'CoroMill-331': {
          name: 'CoroMill 331',
          type: 'slot_mill',
          description: 'Side and slot milling',
          inserts: ['331.32-1240', '331.32-1640'],
          widthRange: { metric: [4, 5, 6, 8, 10, 12, 14, 16, 18, 20] },
          diameterRange: { metric: [63, 80, 100, 125, 160, 200] }
        }
      },
      threadMilling: {
        'CoroMill-327': {
          name: 'CoroMill 327',
          type: 'thread_mill',
          description: 'Thread milling with exchangeable heads',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT', 'API'],
          pitchRange: { metric: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0] }
        }
      },
      highFeed: {
        'CoroMill-415': {
          name: 'CoroMill 415',
          type: 'high_feed_mill',
          description: 'Small diameter high feed milling',
          inserts: ['415R-06', '415N-05'],
          diameterRange: { metric: [8, 10, 12, 16, 20, 25] },
          maxDoc: 0.8,
          maxFpt: 1.5
        },
        'CoroMill-419': {
          name: 'CoroMill 419',
          type: 'high_feed_face_mill',
          description: 'High feed face milling',
          inserts: ['419R-1405', '419N-1405'],
          diameterRange: { metric: [32, 40, 50, 63, 80, 100] },
          maxDoc: 1.0,
          maxFpt: 2.0
        }
      }
    },
    // TURNING - CoroTurn Family
    turning: {
      generalTurning: {
        'CoroTurn-107': {
          name: 'CoroTurn 107',
          type: 'positive_turning',
          description: 'Positive basic turning for light cuts',
          inserts: ['CCMT', 'DCMT', 'VCMT', 'TCMT', 'WCMT'],
          chipbreakers: ['PF', 'PM', 'PR', '-AL', '-WM'],
          grades: {
            steel: ['GC4325', 'GC4315', 'GC4335'],
            stainless: ['GC2220', 'GC2015'],
            cast_iron: ['GC3210', 'GC3220'],
            aluminum: ['H13A', 'H10']
          }
        },
        'CoroTurn-300': {
          name: 'CoroTurn 300',
          type: 'negative_turning',
          description: 'Negative turning for demanding operations',
          inserts: ['CNMG', 'DNMG', 'WNMG', 'TNMG', 'SNMG', 'VNMG'],
          chipbreakers: ['MF', 'MM', 'MR', 'MP', 'SM', 'SR'],
          grades: {
            steel: ['GC4425', 'GC4415', 'GC4335'],
            stainless: ['GC2220', 'GC2035'],
            cast_iron: ['GC3210', 'GC3220'],
            heat_resistant: ['GC1115', 'GC1125']
          }
        },
        'CoroTurn-Prime': {
          name: 'CoroTurn Prime',
          type: 'multidirectional_turning',
          description: 'Revolutionary all-direction turning',
          inserts: ['CP-A1104', 'CP-B1108'],
          grades: ['GC4325', 'GC4315'],
          features: ['all_directions', 'chip_control', 'reduced_vibration'],
          applications: ['profiling', 'facing', 'longitudinal']
        }
      },
      profiling: {
        'CoroTurn-TR': {
          name: 'CoroTurn TR',
          type: 'profiling',
          description: 'TR profiling for copy turning',
          inserts: ['TR-DC1308', 'TR-VB1304'],
          features: ['high_precision', 'thin_wall']
        }
      },
      boring: {
        'CoroTurn-SL': {
          name: 'CoroTurn SL',
          type: 'boring',
          description: 'Silent Tools damped boring bars',
          dampingType: 'tuned_mass_damper',
          overhangs: ['8xD', '10xD', '12xD', '14xD'],
          diameterRange: { metric: [25, 32, 40, 50, 60, 80, 100] },
          inserts: ['CCMT', 'DCMT', 'TCMT', 'VCMT']
        }
      },
      grooving: {
        'CoroCut-1-2': {
          name: 'CoroCut 1-2',
          type: 'grooving_parting',
          description: 'Precision grooving and parting',
          widths: { metric: [1.5, 2, 2.5, 3, 4, 5, 6] },
          maxDepth: { metric: [25, 30, 35] },
          inserts: ['N123G1', 'N123H1', 'N123J1'],
          grades: ['GC1125', 'GC1145', 'GC4225']
        },
        'CoroCut-QD': {
          name: 'CoroCut QD',
          type: 'deep_grooving_parting',
          description: 'Deep grooving and parting-off',
          widths: { metric: [2, 3, 4, 5, 6, 8] },
          maxDepth: { metric: [60, 80, 100] },
          coolantThru: true
        },
        'CoroCut-XS': {
          name: 'CoroCut XS',
          type: 'small_part_grooving',
          description: 'Precision grooving for small parts',
          widths: { metric: [0.5, 0.7, 1.0, 1.2, 1.5] },
          minBore: 2.5
        }
      },
      threading: {
        'CoroThread-266': {
          name: 'CoroThread 266',
          type: 'external_internal_threading',
          description: 'Full profile threading',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT', 'API', 'Whitworth', 'ACME', 'Trapezoidal'],
          insertSizes: ['16', '22', '27'],
          fullProfile: true
        },
        'CoroMill-325': {
          name: 'CoroMill 325',
          type: 'thread_mill',
          description: 'Thread milling',
          threadForms: ['ISO', 'UN'],
          diameterRange: { metric: [8, 10, 12, 16, 20, 25] }
        }
      }
    },
    // DRILLING - CoroDrill Family
    drilling: {
      solidCarbide: {
        'CoroDrill-860': {
          name: 'CoroDrill 860',
          type: 'solid_carbide_drill',
          description: 'High performance solid carbide drilling',
          series: {
            '860.1': { geometry: 'general', materials: ['steel', 'stainless', 'cast_iron'] },
            '860.2': { geometry: 'high_feed', materials: ['steel'] }
          },
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] },
          depthCapability: ['3xD', '5xD', '8xD'],
          coolantThru: true,
          grades: ['GC1220', 'GC1230']
        },
        'CoroDrill-862': {
          name: 'CoroDrill 862',
          type: 'solid_carbide_drill',
          description: 'Drilling of composite materials',
          materials: ['CFRP', 'GRP', 'honeycomb', 'stacks'],
          diameterRange: { metric: [4, 5, 6, 8, 10, 12, 14, 16] }
        }
      },
      indexable: {
        'CoroDrill-880': {
          name: 'CoroDrill 880',
          type: 'indexable_drill',
          description: 'Indexable insert drill',
          diameterRange: { metric: [12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            central: ['880-01', '880-02', '880-03'],
            peripheral: ['880-04', '880-05', '880-06']
          },
          grades: ['GC4044', 'GC4334', 'GC1044']
        },
        'CoroDrill-870': {
          name: 'CoroDrill 870',
          type: 'exchangeable_tip_drill',
          description: 'Exchangeable tip drill',
          diameterRange: { metric: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32] },
          depthCapability: ['3xD', '5xD', '8xD'],
          grades: ['GC1044', 'GC4234']
        }
      },
      gunDrill: {
        'CoroDrill-818': {
          name: 'CoroDrill 818',
          type: 'gun_drill',
          description: 'Deep hole drilling',
          diameterRange: { metric: [11.9, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32] },
          depthCapability: ['20xD', '25xD', '30xD', '40xD'],
          coolantPressure: { min: 20, max: 70, unit: 'bar' }
        }
      }
    },
    // INSERT GRADES
    grades: {
      steel_P: {
        'GC4425': { iso: 'P25', coating: 'CVD', application: 'first_choice_steel', versatile: true },
        'GC4415': { iso: 'P15', coating: 'CVD', application: 'steel_finishing' },
        'GC4335': { iso: 'P35', coating: 'CVD', application: 'steel_roughing' },
        'GC4315': { iso: 'P15', coating: 'CVD', application: 'steel_light_finishing' },
        'GC4325': { iso: 'P25', coating: 'CVD', application: 'steel_medium' },
        'GC1115': { iso: 'P10', coating: 'PVD', substrate: 'cermet', application: 'finishing' }
      },
      stainless_M: {
        'GC2220': { iso: 'M20', coating: 'CVD', application: 'stainless_first_choice' },
        'GC2015': { iso: 'M15', coating: 'PVD', application: 'stainless_finishing' },
        'GC2035': { iso: 'M35', coating: 'CVD', application: 'stainless_roughing' }
      },
      cast_iron_K: {
        'GC3210': { iso: 'K10', coating: 'CVD', application: 'cast_iron_finishing' },
        'GC3220': { iso: 'K20', coating: 'CVD', application: 'cast_iron_general' }
      },
      heat_resistant_S: {
        'GC1105': { iso: 'S05', coating: 'PVD', application: 'heat_resistant_finishing' },
        'GC1115_S': { iso: 'S15', coating: 'PVD', application: 'heat_resistant_general' },
        'GC1125': { iso: 'S25', coating: 'PVD', application: 'heat_resistant_medium' }
      },
      hardened_H: {
        'CB7015': { iso: 'H10', substrate: 'CBN', application: 'hardened_finishing', hrc: '48-65' },
        'CB7025': { iso: 'H20', substrate: 'CBN', application: 'hardened_general', hrc: '45-60' }
      },
      milling: {
        'GC1130': { iso: 'P/M/K', coating: 'PVD', application: 'milling_first_choice' },
        'GC4240': { iso: 'P25', coating: 'CVD', application: 'milling_steel' },
        'GC4330': { iso: 'P30', coating: 'CVD', application: 'milling_steel_versatile' },
        'GC3040': { iso: 'K20', coating: 'CVD', application: 'milling_cast_iron' },
        'GC1640': { iso: 'P/M', coating: 'PVD', application: 'solid_carbide_milling' }
      }
    }
  },
  // 2. KENNAMETAL - Complete Product Line

  kennametal: {
    manufacturer: {
      name: 'Kennametal',
      country: 'USA',
      founded: 1938,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'Top 3 Global',
      website: 'kennametal.com',
      specialty: 'Metalworking solutions and wear-resistant materials'
    },
    milling: {
      solidCarbide: {
        'HARVI-I': {
          name: 'HARVI I TE',
          type: 'solid_carbide_endmill',
          description: 'High performance end mills for general purpose',
          flutes: [3, 4, 5],
          geometry: 'square',
          coatings: ['KC643M', 'KC633M', 'KCPM40'],
          helixAngle: [35, 38],
          diameterRange: { inch: [0.125, 0.156, 0.187, 0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] },
          locRatios: ['1xD', '2xD', '3xD', '4xD']
        },
        'HARVI-II': {
          name: 'HARVI II',
          type: 'solid_carbide_endmill',
          description: 'Variable helix end mills for reduced vibration',
          flutes: [4, 5],
          geometry: 'variable_helix',
          coatings: ['KCSM15', 'KC643M'],
          helixAngle: [35, 37, 38],
          variableHelix: true,
          eccentricRelief: true,
          diameterRange: { inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] },
          applications: ['titanium', 'stainless', 'steel']
        },
        'HARVI-III': {
          name: 'HARVI III',
          type: 'solid_carbide_endmill',
          description: 'Ultimate performance for titanium and aerospace',
          flutes: [5, 6, 7],
          geometry: 'high_performance',
          coatings: ['KCSM15'],
          features: ['unequal_flute_spacing', 'eccentric_relief', 'safe_lock'],
          diameterRange: { inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750, 1.0] },
          applications: ['titanium', 'inconel', 'waspaloy']
        },
        'HARVI-Ultra-8X': {
          name: 'HARVI Ultra 8X',
          type: 'solid_carbide_endmill',
          description: '8-flute for maximum MRR in steel',
          flutes: [8],
          coatings: ['KC643M'],
          features: ['high_flute_count', 'chip_evacuation'],
          diameterRange: { inch: [0.375, 0.500, 0.625, 0.750, 1.0] }
        }
      },
      indexable: {
        'Mill-1-4': {
          name: 'Mill 1-4',
          type: 'indexable_shoulder_mill',
          description: 'True 90° shoulder milling',
          inserts: ['EDPT', 'SDPT'],
          insertSizes: ['10', '13'],
          diameterRange: { inch: [0.625, 0.750, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0] },
          maxDoc: { inch: 0.512 },
          trueTo90: true
        },
        'Mill-4-11': {
          name: 'Mill 4-11',
          type: 'indexable_helical_mill',
          description: 'Helical milling for high MRR',
          inserts: ['SDMT'],
          diameterRange: { inch: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] },
          maxDoc: { inch: 0.433 },
          helicalInterpolation: true
        },
        'Mill-4-12': {
          name: 'Mill 4-12',
          type: 'indexable_shoulder_mill',
          description: '12mm cutting depth shoulder mill',
          inserts: ['SDMT12'],
          diameterRange: { inch: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0] },
          maxDoc: { metric: 12 }
        },
        'KSSM': {
          name: 'KSSM',
          type: 'indexable_face_mill',
          description: 'Square shoulder face mill',
          inserts: ['SNMX', 'SCMT'],
          diameterRange: { inch: [2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0] }
        },
        'KSOM': {
          name: 'KSOM',
          type: 'indexable_face_mill',
          description: 'Octomill face mill - 16 edges',
          inserts: ['ONMU'],
          edgesPerInsert: 16,
          diameterRange: { inch: [2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0] }
        },
        'Fix-Perfect': {
          name: 'Fix-Perfect',
          type: 'indexable_face_mill',
          description: 'High precision face milling',
          inserts: ['SNEX', 'SNMX'],
          diameterRange: { inch: [2.0, 3.0, 4.0, 5.0, 6.0] },
          flatness: 0.002
        },
        'KSRM': {
          name: 'KSRM',
          type: 'indexable_round_insert_mill',
          description: 'Round insert milling for profiling',
          inserts: ['RCMX', 'RCMT'],
          insertSizes: ['10', '12', '16', '20'],
          diameterRange: { inch: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0] }
        }
      },
      highFeed: {
        'HARVI-Ultra-HF': {
          name: 'HARVI Ultra High Feed',
          type: 'solid_carbide_high_feed',
          description: 'Solid carbide high feed end mill',
          flutes: [4, 5, 6],
          maxDoc: { inch: 0.020 },
          maxFpt: { inch: 0.030 },
          coatings: ['KCSM15'],
          diameterRange: { inch: [0.250, 0.375, 0.500, 0.750, 1.0] }
        },
        'Dodeka': {
          name: 'Dodeka',
          type: 'indexable_high_feed',
          description: '12-edge high feed insert system',
          inserts: ['LNGX'],
          edgesPerInsert: 12,
          maxDoc: { metric: 1.5 },
          maxFpt: { metric: 2.5 },
          diameterRange: { inch: [1.5, 2.0, 2.5, 3.0, 4.0] }
        }
      }
    },
    turning: {
      generalTurning: {
        'Beyond-CNMG': {
          name: 'Beyond CNMG',
          type: 'negative_turning',
          description: 'Beyond Evolution turning inserts',
          inserts: ['CNMG120404', 'CNMG120408', 'CNMG120412', 'CNMG160608', 'CNMG160612'],
          chipbreakers: ['MP', 'MN', 'MS', 'RP', 'RN', 'RS'],
          grades: {
            steel: ['KCU25', 'KCU10', 'KC5010', 'KC5025'],
            stainless: ['KC725M', 'KC730'],
            cast_iron: ['KC9315'],
            universal: ['KC9110', 'KC9125']
          }
        },
        'Beyond-WNMG': {
          name: 'Beyond WNMG',
          type: 'negative_turning',
          inserts: ['WNMG060408', 'WNMG080408', 'WNMG080412'],
          chipbreakers: ['MP', 'MN', 'MS']
        },
        'Beyond-DNMG': {
          name: 'Beyond DNMG',
          type: 'negative_turning',
          inserts: ['DNMG110408', 'DNMG150408', 'DNMG150412', 'DNMG150608'],
          chipbreakers: ['MP', 'MN', 'RP']
        }
      },
      boring: {
        'A-Series-Boring': {
          name: 'A Series Boring Bars',
          type: 'steel_boring',
          description: 'Steel shank boring bars',
          overhangs: ['3xD', '4xD', '5xD'],
          shankDiameters: { inch: [0.375, 0.500, 0.625, 0.750, 1.0, 1.25, 1.5, 2.0] },
          insertStyles: ['CCMT', 'DCMT', 'TCMT', 'VCMT']
        },
        'E-Series-Boring': {
          name: 'E Series Boring Bars',
          type: 'carbide_boring',
          description: 'Carbide shank for extended reach',
          overhangs: ['5xD', '6xD', '7xD', '8xD'],
          shankDiameters: { inch: [0.250, 0.312, 0.375, 0.500, 0.625, 0.750] }
        },
        'Romicron': {
          name: 'Romicron',
          type: 'fine_boring',
          description: 'Precision fine boring heads',
          adjustmentRange: { metric: [0.001] },  // 1 micron
          diameterRange: { metric: [1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100] }
        }
      },
      grooving: {
        'Top-Notch': {
          name: 'Top Notch',
          type: 'grooving_parting',
          description: 'Grooving and cut-off system',
          widths: { inch: [0.059, 0.078, 0.094, 0.118, 0.157, 0.187, 0.236] },
          maxDepth: { inch: [0.590, 0.787, 1.0] },
          grades: ['KC5010', 'KC730', 'KC5025']
        },
        'A4': {
          name: 'A4 System',
          type: 'grooving_parting',
          description: 'Double-ended grooving',
          widths: { metric: [2, 2.5, 3, 4, 5, 6] },
          features: ['double_ended', 'economical']
        }
      },
      threading: {
        'Laydown-Threading': {
          name: 'Laydown Threading',
          type: 'threading_inserts',
          description: 'Full profile threading inserts',
          threadForms: ['UN', 'ISO', 'BSPT', 'NPT', 'ACME', 'Trapezoidal', 'API'],
          insertSizes: ['16ER', '16IR', '22ER', '22IR', '27ER', '27IR'],
          grades: ['KC5025', 'KC720']
        }
      }
    },
    drilling: {
      solidCarbide: {
        'B211': {
          name: 'B211 Beyond',
          type: 'solid_carbide_drill',
          description: 'High performance solid carbide',
          pointAngles: [140],
          coolantThru: true,
          depthCapability: ['3xD', '5xD', '8xD', '12xD'],
          diameterRange: { inch: [0.0394, 0.0469, 0.0625, 0.0781, 0.0937, 0.1094, 0.125, 0.1562, 0.1875, 0.2187, 0.25, 0.2812, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.75, 0.875, 1.0] },
          grades: ['KC7315', 'KC7325']
        },
        'B271': {
          name: 'B271 HPR',
          type: 'solid_carbide_drill',
          description: 'High penetration rate drilling',
          pointAngles: [140],
          coolantThru: true,
          depthCapability: ['3xD', '5xD'],
          materials: ['steel', 'stainless', 'cast_iron']
        }
      },
      indexable: {
        'KSEM': {
          name: 'KSEM',
          type: 'indexable_drill',
          description: 'Modular drill with exchangeable tips',
          diameterRange: { metric: [12, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50] },
          depthCapability: ['1.5xD', '3xD', '5xD'],
          inserts: ['KSEM_tip'],
          features: ['exchangeable_tip', 'economical']
        },
        'KSEM-Plus': {
          name: 'KSEM Plus',
          type: 'indexable_drill',
          description: 'Enhanced modular drill',
          diameterRange: { metric: [20, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60] },
          depthCapability: ['3xD', '5xD', '7xD']
        },
        'DFS': {
          name: 'DFS',
          type: 'indexable_drill',
          description: 'Double effective drill',
          diameterRange: { inch: [0.531, 0.625, 0.750, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            peripheral: ['SPMT', 'SCMT'],
            central: ['SPMT', 'WCMX']
          }
        }
      }
    },
    grades: {
      turning_steel: {
        'KCU25': { iso: 'P25', coating: 'BEYOND', technology: 'beyond_evolution' },
        'KCU10': { iso: 'P10', coating: 'BEYOND', technology: 'beyond_evolution' },
        'KC5010': { iso: 'P10', coating: 'CVD' },
        'KC5025': { iso: 'P25', coating: 'CVD' },
        'KC5040': { iso: 'P40', coating: 'CVD' }
      },
      turning_stainless: {
        'KC725M': { iso: 'M25', coating: 'PVD' },
        'KC730': { iso: 'M30', coating: 'CVD' }
      },
      turning_universal: {
        'KC9110': { iso: 'P10-M10', coating: 'PVD' },
        'KC9125': { iso: 'P25-M25', coating: 'PVD' }
      },
      milling: {
        'KCSM15': { iso: 'S15', coating: 'PVD', application: 'titanium_aerospace' },
        'KC643M': { iso: 'P/M', coating: 'AlTiN', application: 'general_milling' },
        'KC633M': { iso: 'P/M', coating: 'TiAlN', application: 'steel_milling' },
        'KCPM40': { iso: 'P40', coating: 'TiCN', application: 'roughing' }
      }
    }
  },
  // 3. ISCAR - Complete Product Line

  iscar: {
    manufacturer: {
      name: 'ISCAR',
      country: 'Israel',
      founded: 1952,
      quality: 'Premium',
      priceLevel: 4,
      parent: 'Berkshire Hathaway/IMC',
      marketPosition: 'Top 5 Global',
      website: 'iscar.com',
      specialty: 'Innovative cutting tool solutions'
    },
    milling: {
      solidCarbide: {
        'CHATTERFREE': {
          name: 'CHATTERFREE',
          type: 'solid_carbide_endmill',
          description: 'Variable pitch end mills for reduced vibration',
          series: {
            'EC-H4': { flutes: 4, geometry: 'general', variablePitch: true },
            'EC-H5': { flutes: 5, geometry: 'high_performance', variablePitch: true },
            'EC-H6': { flutes: 6, geometry: 'finishing', variablePitch: true },
            'EC-H7': { flutes: 7, geometry: 'high_mrr', variablePitch: true }
          },
          coatings: ['IC900', 'IC903', 'IC908'],
          diameterRange: { metric: [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25] },
          applications: ['steel', 'stainless', 'titanium']
        },
        'FINISHRED': {
          name: 'FINISHRED',
          type: 'solid_carbide_endmill',
          description: 'Roughing and finishing in one tool',
          flutes: [4, 5, 6],
          geometry: 'multi_flute',
          coatings: ['IC903'],
          diameterRange: { metric: [6, 8, 10, 12, 16, 20] }
        },
        'FEEDMILL': {
          name: 'FEEDMILL',
          type: 'solid_carbide_high_feed',
          description: 'High feed solid carbide end mills',
          flutes: [4, 5, 6],
          maxDoc: { metric: 0.5 },
          maxFpt: { metric: 0.75 },
          coatings: ['IC903', 'IC908'],
          diameterRange: { metric: [6, 8, 10, 12, 16, 20] }
        },
        'MULTI-MASTER': {
          name: 'MULTI-MASTER',
          type: 'exchangeable_head',
          description: 'Exchangeable carbide head system',
          headTypes: ['square', 'ball', 'corner_radius', 'chamfer', 'drill', 'thread'],
          diameterRange: { metric: [6, 8, 10, 12, 16, 20, 25, 32] },
          shankTypes: ['steel', 'carbide', 'shrink_fit']
        }
      },
      indexable: {
        'HELIQUAD': {
          name: 'HELIQUAD',
          type: 'indexable_shoulder_mill',
          description: '90° shouldering with 4 cutting edges',
          inserts: ['HQ390'],
          edgesPerInsert: 4,
          maxDoc: { metric: 12 },
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63, 80] }
        },
        'HELIMILL': {
          name: 'HELIMILL',
          type: 'indexable_shoulder_mill',
          description: 'Helical cutting action shoulder mill',
          inserts: ['HM90'],
          maxDoc: { metric: 10 },
          diameterRange: { inch: [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] }
        },
        'HELIDO': {
          name: 'HELIDO',
          type: 'indexable_face_mill',
          description: 'Double-sided 8-edge face milling',
          inserts: ['H490'],
          edgesPerInsert: 8,
          diameterRange: { metric: [50, 63, 80, 100, 125, 160, 200] }
        },
        'TANGMILL': {
          name: 'TANGMILL',
          type: 'indexable_shoulder_mill',
          description: 'Tangential clamping for rigidity',
          inserts: ['LNMT', 'LNKX'],
          maxDoc: { metric: 12 },
          diameterRange: { metric: [20, 25, 32, 40, 50, 63, 80] }
        },
        'HELI2000': {
          name: 'HELI2000',
          type: 'indexable_face_mill',
          description: 'Economical face milling',
          inserts: ['H2000'],
          diameterRange: { metric: [40, 50, 63, 80, 100, 125, 160] }
        }
      },
      highFeed: {
        'FF-FWX': {
          name: 'FF FWX',
          type: 'indexable_high_feed',
          description: 'Fast feed face milling',
          inserts: ['LNKX', 'XNMU'],
          maxDoc: { metric: 1.2 },
          maxFpt: { metric: 2.5 },
          diameterRange: { metric: [20, 25, 32, 40, 50, 63, 80, 100] }
        },
        'LOGIQ-HF': {
          name: 'LOGIQ HF',
          type: 'indexable_high_feed',
          description: 'New generation high feed',
          inserts: ['LNMU08'],
          maxDoc: { metric: 1.0 },
          diameterRange: { metric: [32, 40, 50, 63, 80] }
        },
        'MILL-4-FEED': {
          name: 'MILL 4 FEED',
          type: 'indexable_high_feed',
          description: '4-edge high feed insert',
          inserts: ['HNMF'],
          edgesPerInsert: 4,
          maxDoc: { metric: 1.2 },
          diameterRange: { metric: [40, 50, 63, 80, 100] }
        }
      },
      ballNose: {
        'BALLPLUS': {
          name: 'BALLPLUS',
          type: 'indexable_ball',
          description: 'Indexable ball nose milling',
          inserts: ['BLP'],
          diameterRange: { metric: [10, 12, 16, 20, 25, 32] }
        }
      }
    },
    turning: {
      generalTurning: {
        'LOGIQ-TURN': {
          name: 'LOGIQ TURN',
          type: 'turning_system',
          description: 'Advanced turning system',
          inserts: ['CNMG', 'WNMG', 'DNMG', 'TNMG', 'SNMG', 'VNMG'],
          chipbreakers: ['F3P', 'M3P', 'R3P', 'F3M', 'M3M', 'R3M'],
          grades: {
            steel: ['IC8250', 'IC8150', 'IC9250', 'IC9350'],
            stainless: ['IC328', 'IC330', 'IC928'],
            cast_iron: ['IC5005', 'IC5010']
          }
        },
        'SUMO-TEC': {
          name: 'SUMO TEC',
          type: 'turning_technology',
          description: 'Post-coating treatment for extended life',
          grades: ['IC6015', 'IC6025', 'IC6030']
        }
      },
      grooving: {
        'TANG-GRIP': {
          name: 'TANG-GRIP',
          type: 'grooving_parting',
          description: 'Self-grip grooving and parting',
          widths: { metric: [2, 2.5, 3, 4, 5, 6, 8] },
          maxDepth: { metric: [15, 20, 26, 32, 40] },
          grades: ['IC808', 'IC908', 'IC328']
        },
        'DO-GRIP': {
          name: 'DO-GRIP',
          type: 'grooving_parting',
          description: 'Double-ended economical grooving',
          widths: { metric: [1.5, 2, 2.5, 3, 4] },
          features: ['double_ended', 'economical']
        },
        'PENTA-CUT': {
          name: 'PENTA-CUT',
          type: 'grooving_parting',
          description: '5-edge star-shaped insert',
          edgesPerInsert: 5,
          widths: { metric: [0.5, 0.8, 1.0, 1.2, 1.5] },
          minBore: { metric: 3 }
        },
        'PENTAIQ-GRIP': {
          name: 'PENTAIQ-GRIP',
          type: 'internal_grooving',
          description: 'Internal grooving with spring clamp',
          minBore: { metric: 8 },
          widths: { metric: [1.5, 2, 2.5, 3] }
        }
      },
      threading: {
        'PENTACUT-THREAD': {
          name: 'PENTACUT Thread',
          type: 'threading',
          description: '5-edge threading inserts',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT', 'ACME'],
          edgesPerInsert: 5
        },
        '3P-THREAD': {
          name: '3P Thread',
          type: 'threading',
          description: 'Precision threading inserts',
          threadForms: ['ISO', 'UN', 'API', 'Whitworth'],
          insertSizes: ['16', '22', '27']
        }
      }
    },
    drilling: {
      solidCarbide: {
        'SUMOCHAM': {
          name: 'SUMOCHAM',
          type: 'exchangeable_head_drill',
          description: 'Exchangeable head drilling',
          diameterRange: { metric: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26] },
          depthCapability: ['1.5xD', '3xD', '5xD', '8xD', '12xD'],
          headTypes: ['standard', 'flat_bottom'],
          grades: ['IC908', 'ICP40']
        },
        'CHAMDRILL': {
          name: 'CHAMDRILL',
          type: 'solid_carbide_drill',
          description: 'Solid carbide drilling',
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] },
          depthCapability: ['3xD', '5xD', '8xD', '12xD'],
          coolantThru: true,
          grades: ['IC908']
        }
      },
      indexable: {
        'DR-TWIST': {
          name: 'DR-TWIST',
          type: 'indexable_drill',
          description: 'Indexable insert drill',
          diameterRange: { metric: [16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            peripheral: ['SOMT', 'SCMT'],
            central: ['SOGX', 'XOMT']
          }
        },
        'COMBICHAM': {
          name: 'COMBICHAM',
          type: 'combination_drill',
          description: 'Chamfer and drill in one operation',
          diameterRange: { metric: [12, 14, 16, 18, 20] },
          chamferAngles: [45, 60, 90]
        }
      }
    },
    grades: {
      steel: {
        'IC8250': { iso: 'P25', coating: 'CVD', application: 'steel_first_choice' },
        'IC8150': { iso: 'P15', coating: 'CVD', application: 'steel_finishing' },
        'IC8350': { iso: 'P35', coating: 'CVD', application: 'steel_roughing' },
        'IC9250': { iso: 'P25', coating: 'PVD', application: 'steel_medium' },
        'IC9350': { iso: 'P35', coating: 'PVD', application: 'steel_interrupted' }
      },
      stainless: {
        'IC328': { iso: 'M25', coating: 'PVD', application: 'stainless_general' },
        'IC330': { iso: 'M30', coating: 'CVD', application: 'stainless_medium' },
        'IC928': { iso: 'M28', coating: 'PVD', application: 'stainless_austenitic' }
      },
      sumoTec: {
        'IC6015': { iso: 'P15', coating: 'SUMOTEC', application: 'sumo_finishing' },
        'IC6025': { iso: 'P25', coating: 'SUMOTEC', application: 'sumo_general' },
        'IC6030': { iso: 'P30', coating: 'SUMOTEC', application: 'sumo_roughing' }
      },
      milling: {
        'IC900': { iso: 'P/M', coating: 'PVD', application: 'milling_general' },
        'IC903': { iso: 'P/M', coating: 'PVD', application: 'milling_high_perf' },
        'IC908': { iso: 'P/M/K', coating: 'PVD', application: 'milling_universal' }
      }
    }
  },
  // 4. SECO TOOLS - Complete Product Line

  seco: {
    manufacturer: {
      name: 'Seco Tools',
      country: 'Sweden',
      founded: 1932,
      quality: 'Premium',
      priceLevel: 4,
      parent: 'Sandvik Group',
      marketPosition: 'Top 5 Global',
      website: 'secotools.com',
      specialty: 'Complete metal cutting solutions'
    },
    milling: {
      solidCarbide: {
        'JABRO-SOLID2': {
          name: 'Jabro Solid2',
          type: 'solid_carbide_endmill',
          description: 'Universal solid carbide end mills',
          series: {
            'JS512': { flutes: 2, geometry: 'aluminum', applications: ['aluminum', 'plastics'] },
            'JS513': { flutes: 3, geometry: 'general', applications: ['steel', 'stainless'] },
            'JS514': { flutes: 4, geometry: 'steel', applications: ['steel', 'cast_iron'] },
            'JS520': { flutes: 4, geometry: 'high_performance', applications: ['steel'] },
            'JS533': { flutes: 3, geometry: 'aluminum_hp', applications: ['aluminum'], polished: true },
            'JS554': { flutes: 4, geometry: 'stainless', applications: ['stainless', 'titanium'] },
            'JS556': { flutes: 6, geometry: 'finishing', applications: ['steel'] },
            'JH100': { flutes: 4, geometry: 'hardened', applications: ['hardened_steel'], hrc: '45-65' }
          },
          coatings: ['SIRA', 'HXT', 'NXT'],
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25] }
        },
        'JABRO-HPM': {
          name: 'Jabro HPM',
          type: 'solid_carbide_high_performance',
          description: 'High performance milling for difficult materials',
          series: {
            'JHP770': { flutes: 7, geometry: 'titanium', applications: ['titanium', 'inconel'] },
            'JHP780': { flutes: 5, geometry: 'aerospace', applications: ['titanium', 'heat_resistant'] },
            'JHP951': { flutes: 5, geometry: 'high_temp', applications: ['inconel', 'waspaloy'] }
          },
          coatings: ['SIRA'],
          features: ['variable_helix', 'chip_splitters']
        },
        'JABRO-JC': {
          name: 'Jabro JC',
          type: 'solid_carbide_high_feed',
          description: 'High feed milling end mills',
          series: {
            'JC840': { type: 'high_feed', maxDoc: 0.5, maxFpt: 0.8 },
            'JC880': { type: 'barrel', barrelRadius: 'large' }
          },
          diameterRange: { metric: [6, 8, 10, 12, 16, 20] }
        }
      },
      indexable: {
        'TURBO-10': {
          name: 'Turbo 10',
          type: 'indexable_shoulder_mill',
          description: 'High speed machining 90° mill',
          inserts: ['LOEX', 'LPHT'],
          maxDoc: { metric: 10 },
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63, 80] }
        },
        'SQUARE-T4-08': {
          name: 'Square T4-08',
          type: 'indexable_shoulder_mill',
          description: 'Square shoulder with tangential inserts',
          inserts: ['LNEX', 'LNHT'],
          edgesPerInsert: 4,
          maxDoc: { metric: 8 },
          diameterRange: { metric: [20, 25, 32, 40, 50] }
        },
        'DOUBLE-OCTOMILL': {
          name: 'Double Octomill',
          type: 'indexable_face_mill',
          description: '16-edge double-sided face milling',
          inserts: ['ONHU'],
          edgesPerInsert: 16,
          diameterRange: { metric: [50, 63, 80, 100, 125, 160, 200, 250] }
        },
        'R220.53': {
          name: 'R220.53',
          type: 'indexable_face_mill',
          description: 'General purpose face milling',
          inserts: ['SEEX', 'SEMX'],
          diameterRange: { metric: [40, 50, 63, 80, 100, 125, 160] }
        }
      },
      highFeed: {
        'HIGHFEED-2': {
          name: 'Highfeed 2',
          type: 'indexable_high_feed',
          description: 'High feed face milling system',
          inserts: ['LOEX', 'LPMX'],
          maxDoc: { metric: 1.2 },
          maxFpt: { metric: 2.0 },
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63, 80] }
        },
        'HIGHFEED-4': {
          name: 'Highfeed 4',
          type: 'indexable_high_feed',
          description: '4-edge high feed system',
          inserts: ['LNHF'],
          edgesPerInsert: 4,
          maxDoc: { metric: 1.0 },
          diameterRange: { metric: [32, 40, 50, 63] }
        }
      }
    },
    turning: {
      generalTurning: {
        'CNMG-TP': {
          name: 'Seco CNMG TP',
          type: 'negative_turning',
          inserts: ['CNMG120404', 'CNMG120408', 'CNMG120412', 'CNMG160608', 'CNMG160612'],
          chipbreakers: ['MF1', 'MF2', 'MF3', 'MM', 'MR1', 'MR2', 'MR3', 'M5', 'R3'],
          grades: {
            steel: ['TP2500', 'TP1500', 'TP3500', 'TP0500'],
            stainless: ['TM2000', 'TM1500'],
            cast_iron: ['TK1001', 'TK2001'],
            heat_resistant: ['TS2000', 'TS2500']
          }
        },
        'DNMG-TP': {
          name: 'Seco DNMG TP',
          type: 'negative_turning',
          inserts: ['DNMG110404', 'DNMG150404', 'DNMG150408', 'DNMG150412', 'DNMG150608'],
          chipbreakers: ['MF1', 'MF2', 'MF3', 'MM', 'MR1']
        },
        'Duratomic': {
          name: 'Duratomic',
          type: 'coating_technology',
          description: 'Atomic layer coating for extended life',
          grades: ['TP2501', 'TP1501', 'TP3501'],
          benefits: ['wear_resistance', 'heat_resistance', 'edge_integrity']
        }
      },
      grooving: {
        'X4': {
          name: 'X4 Grooving',
          type: 'grooving_parting',
          description: '4-edge precision grooving',
          widths: { metric: [2, 2.5, 3, 4, 5, 6] },
          maxDepth: { metric: [22, 26, 32] },
          grades: ['CP500', 'CP600']
        },
        'MDT': {
          name: 'MDT Multidirectional',
          type: 'grooving_turning',
          description: 'Multidirectional grooving and turning',
          widths: { metric: [3, 4, 5, 6] },
          features: ['grooving', 'turning', 'profiling']
        }
      },
      threading: {
        '16ER-SNAP-TAP': {
          name: 'Snap-Tap Threading',
          type: 'threading',
          description: 'Quick change threading system',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT'],
          insertSizes: ['16', '22', '27']
        }
      }
    },
    drilling: {
      solidCarbide: {
        'FEEDMAX': {
          name: 'Feedmax',
          type: 'solid_carbide_drill',
          description: 'High feed solid carbide drilling',
          series: {
            'SD203A': { geometry: 'general', coolantThru: true },
            'SD205A': { geometry: 'deep_hole', depthCapability: '8xD' },
            'SD215': { geometry: 'composite', materials: ['CFRP', 'aluminum_stack'] }
          },
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] },
          depthCapability: ['3xD', '5xD', '8xD', '12xD'],
          grades: ['SIRA']
        },
        'PERFOMAX': {
          name: 'Perfomax',
          type: 'solid_carbide_drill',
          description: 'Universal solid carbide drill',
          diameterRange: { metric: [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
          depthCapability: ['3xD', '5xD'],
          coolantThru: true
        }
      },
      indexable: {
        'SD500': {
          name: 'SD500 Series',
          type: 'indexable_drill',
          description: 'Modular indexable drill',
          diameterRange: { metric: [17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            peripheral: ['SCGX', 'SPGX'],
            central: ['SPGX', 'SOMX']
          }
        },
        'CROWNLOC-PLUS': {
          name: 'Crownloc Plus',
          type: 'exchangeable_head',
          description: 'Exchangeable head drill system',
          diameterRange: { metric: [12, 14, 16, 17, 18, 19, 20, 22, 24, 25] },
          depthCapability: ['3xD', '5xD', '8xD']
        }
      }
    },
    grades: {
      turning_steel: {
        'TP2500': { iso: 'P25', coating: 'DURATOMIC', application: 'steel_first_choice' },
        'TP1500': { iso: 'P15', coating: 'DURATOMIC', application: 'steel_finishing' },
        'TP3500': { iso: 'P35', coating: 'DURATOMIC', application: 'steel_roughing' },
        'TP0500': { iso: 'P05', coating: 'DURATOMIC', application: 'steel_light_finishing' }
      },
      turning_stainless: {
        'TM2000': { iso: 'M20', coating: 'PVD', application: 'stainless_general' },
        'TM1500': { iso: 'M15', coating: 'PVD', application: 'stainless_finishing' }
      },
      turning_cast_iron: {
        'TK1001': { iso: 'K10', coating: 'CVD', application: 'cast_iron_finishing' },
        'TK2001': { iso: 'K20', coating: 'CVD', application: 'cast_iron_general' }
      },
      milling: {
        'MP1500': { iso: 'P15', coating: 'DURATOMIC', application: 'milling_steel' },
        'MP2500': { iso: 'P25', coating: 'DURATOMIC', application: 'milling_general' },
        'MK1500': { iso: 'K15', coating: 'DURATOMIC', application: 'milling_cast_iron' }
      },
      solid_carbide: {
        'SIRA': { coating: 'PVD', application: 'general_purpose' },
        'HXT': { coating: 'PVD', application: 'hardened_steel' },
        'NXT': { coating: 'PVD', application: 'aluminum' }
      }
    }
  },
  // 5. MITSUBISHI MATERIALS - Complete Product Line

  mitsubishi: {
    manufacturer: {
      name: 'Mitsubishi Materials',
      country: 'Japan',
      founded: 1871,
      quality: 'Premium',
      priceLevel: 4,
      marketPosition: 'Top 10 Global',
      website: 'mmc-carbide.com',
      specialty: 'Carbide tools and materials technology'
    },
    milling: {
      solidCarbide: {
        'SMART-MIRACLE': {
          name: 'SMART MIRACLE End Mills',
          type: 'solid_carbide_endmill',
          description: 'Next generation coated end mills',
          series: {
            'VF2XLB': { flutes: 2, geometry: 'long_reach_ball', applications: ['die_mold'] },
            'VF2SB': { flutes: 2, geometry: 'ball', applications: ['3d_finishing'] },
            'VF4SBR': { flutes: 4, geometry: 'ball', applications: ['high_efficiency'] },
            'VF2SSB': { flutes: 2, geometry: 'ball_micro', applications: ['micro_milling'] },
            'VCPSRB': { flutes: 4, geometry: 'corner_radius', applications: ['roughing'] },
            'VF4MD': { flutes: 4, geometry: 'square', applications: ['general_purpose'] }
          },
          coatings: ['SMART_MIRACLE', 'IMPACT_MIRACLE'],
          diameterRange: { metric: [0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25] }
        },
        'IMPACT-MIRACLE': {
          name: 'IMPACT MIRACLE',
          type: 'solid_carbide_endmill',
          description: 'For hardened steels 45-65 HRC',
          series: {
            'VF2MHV': { flutes: 2, geometry: 'square', hrc: '45-65' },
            'VF4MHV': { flutes: 4, geometry: 'square', hrc: '45-65' },
            'VF2MHVRB': { flutes: 2, geometry: 'ball', hrc: '45-65' },
            'VF4MHVRB': { flutes: 4, geometry: 'ball', hrc: '45-65' }
          },
          coatings: ['IMPACT_MIRACLE'],
          diameterRange: { metric: [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12] }
        },
        'COOLSTAR': {
          name: 'COOLSTAR',
          type: 'solid_carbide_endmill',
          description: 'Internal coolant through end mills',
          flutes: [4, 6],
          coolantThru: true,
          diameterRange: { metric: [6, 8, 10, 12, 16, 20] }
        }
      },
      indexable: {
        'APX-3000': {
          name: 'APX3000',
          type: 'indexable_shoulder_mill',
          description: '90° shoulder milling',
          inserts: ['AOMT', 'APMX'],
          maxDoc: { metric: 11 },
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63, 80] }
        },
        'APX-4000': {
          name: 'APX4000',
          type: 'indexable_shoulder_mill',
          description: 'Heavy duty shoulder milling',
          inserts: ['APET', 'APMT'],
          maxDoc: { metric: 15 },
          diameterRange: { metric: [32, 40, 50, 63, 80, 100] }
        },
        'AJX': {
          name: 'AJX Face Mill',
          type: 'indexable_face_mill',
          description: 'High efficiency face milling',
          inserts: ['JOMX', 'JOMT'],
          diameterRange: { metric: [50, 63, 80, 100, 125, 160, 200] }
        },
        'WSX445': {
          name: 'WSX445',
          type: 'indexable_face_mill',
          description: 'Double-sided 8-edge face mill',
          inserts: ['WNMU'],
          edgesPerInsert: 8,
          diameterRange: { metric: [63, 80, 100, 125, 160, 200, 250] }
        },
        'ASX445': {
          name: 'ASX445',
          type: 'indexable_face_mill',
          description: 'Square insert face milling',
          inserts: ['SNMU'],
          edgesPerInsert: 8,
          diameterRange: { metric: [50, 63, 80, 100, 125, 160] }
        }
      },
      highFeed: {
        'AQX': {
          name: 'AQX High Feed',
          type: 'indexable_high_feed',
          description: 'High feed face milling',
          inserts: ['QOMT'],
          maxDoc: { metric: 1.5 },
          maxFpt: { metric: 2.0 },
          diameterRange: { metric: [25, 32, 40, 50, 63, 80] }
        },
        'ASX400': {
          name: 'ASX400 High Feed',
          type: 'indexable_high_feed',
          description: 'Small diameter high feed',
          inserts: ['LOGU'],
          maxDoc: { metric: 1.0 },
          diameterRange: { metric: [16, 20, 25, 32, 40] }
        }
      },
      ballNose: {
        'SRM2': {
          name: 'SRM2 Ball Nose',
          type: 'indexable_ball',
          description: 'Indexable ball nose for die/mold',
          inserts: ['SPEN'],
          diameterRange: { metric: [16, 20, 25, 32, 40] }
        }
      }
    },
    turning: {
      generalTurning: {
        'MP-SERIES': {
          name: 'MP Series',
          type: 'negative_turning',
          inserts: ['CNMG', 'DNMG', 'WNMG', 'TNMG', 'SNMG', 'VNMG'],
          chipbreakers: ['GP', 'MP', 'HP', 'FP', 'GH', 'MH', 'HX'],
          grades: {
            steel: ['MC6025', 'MC6015', 'MC7015', 'MC7025'],
            stainless: ['VP15TF', 'US735'],
            cast_iron: ['MC5015', 'MC5020'],
            heat_resistant: ['VP10MF', 'VP20RT']
          }
        },
        'MV-SERIES': {
          name: 'MV Series',
          type: 'positive_turning',
          inserts: ['CCMT', 'DCMT', 'VCMT', 'TCMT'],
          chipbreakers: ['FP', 'MP', 'LP'],
          grades: ['MC6015', 'VP15TF', 'UTi20T']
        }
      },
      grooving: {
        'GY-SERIES': {
          name: 'GY Grooving',
          type: 'grooving_parting',
          description: 'Y-prism lock grooving system',
          widths: { metric: [1.5, 2, 2.5, 3, 4, 5, 6, 8] },
          maxDepth: { metric: [20, 25, 30, 40] },
          grades: ['VP15TF', 'VP20MF', 'UTi20T']
        },
        'GW-SERIES': {
          name: 'GW Grooving',
          type: 'internal_grooving',
          minBore: { metric: 8 },
          widths: { metric: [1.5, 2, 2.5, 3] }
        }
      },
      threading: {
        'MMT': {
          name: 'MMT Threading',
          type: 'threading',
          description: 'Full profile threading',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT', 'ACME', 'API'],
          insertSizes: ['16', '22', '27']
        }
      }
    },
    drilling: {
      solidCarbide: {
        'MVS': {
          name: 'MVS Drill',
          type: 'solid_carbide_drill',
          description: 'High performance solid carbide',
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] },
          depthCapability: ['3xD', '5xD', '8xD', '12xD', '15xD', '20xD', '25xD', '30xD'],
          coolantThru: true,
          grades: ['DP1020', 'DP1030']
        },
        'WSTAR': {
          name: 'WSTAR Drill',
          type: 'solid_carbide_drill',
          description: 'W-point geometry for stability',
          diameterRange: { metric: [2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16] },
          depthCapability: ['3xD', '5xD'],
          pointAngle: 140
        }
      },
      indexable: {
        'TAF': {
          name: 'TAF Drill',
          type: 'indexable_drill',
          description: 'Indexable drilling system',
          diameterRange: { metric: [16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            peripheral: ['GPMT', 'GPHT'],
            central: ['GPMT', 'XPMT']
          }
        },
        'MVX': {
          name: 'MVX Drill',
          type: 'indexable_drill',
          description: 'V-bottom indexable drill',
          diameterRange: { metric: [20, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD']
        }
      }
    },
    grades: {
      steel: {
        'MC6025': { iso: 'P25', coating: 'CVD', application: 'steel_first_choice' },
        'MC6015': { iso: 'P15', coating: 'CVD', application: 'steel_finishing' },
        'MC7015': { iso: 'P15', coating: 'PVD', application: 'steel_high_speed' },
        'MC7025': { iso: 'P25', coating: 'PVD', application: 'steel_interrupted' }
      },
      stainless: {
        'VP15TF': { iso: 'M15', coating: 'PVD', application: 'stainless_first_choice' },
        'US735': { iso: 'M35', coating: 'CVD', application: 'stainless_roughing' }
      },
      cast_iron: {
        'MC5015': { iso: 'K15', coating: 'CVD', application: 'cast_iron_finishing' },
        'MC5020': { iso: 'K20', coating: 'CVD', application: 'cast_iron_general' }
      },
      heat_resistant: {
        'VP10MF': { iso: 'S10', coating: 'PVD', application: 'inconel_finishing' },
        'VP20RT': { iso: 'S20', coating: 'PVD', application: 'titanium_general' }
      },
      solid_carbide: {
        'SMART_MIRACLE': { coating: 'PVD_multilayer', application: 'general_purpose' },
        'IMPACT_MIRACLE': { coating: 'PVD_nanocomposite', application: 'hardened_steel' }
      }
    }
  },
  // 6. WALTER - Complete Product Line

  walter: {
    manufacturer: {
      name: 'Walter',
      country: 'Germany',
      founded: 1919,
      quality: 'Premium',
      priceLevel: 4,
      parent: 'Sandvik Group',
      marketPosition: 'Top 10 Global',
      website: 'walter-tools.com',
      specialty: 'Precision tools for metalworking'
    },
    milling: {
      solidCarbide: {
        'PROTOSTAR': {
          name: 'Protostar',
          type: 'solid_carbide_endmill',
          description: 'High performance solid carbide',
          series: {
            'MC166': { flutes: 4, geometry: 'general', applications: ['steel', 'stainless'] },
            'MC167': { flutes: 5, geometry: 'high_performance', applications: ['steel', 'titanium'] },
            'MC162': { flutes: 2, geometry: 'aluminum', applications: ['aluminum'], polished: true },
            'MC164': { flutes: 4, geometry: 'finishing', applications: ['steel'] },
            'MC168': { flutes: 6, geometry: 'high_feed', applications: ['steel'] },
            'MC319': { flutes: 4, geometry: 'hardened', applications: ['hardened_steel'], hrc: '45-65' }
          },
          coatings: ['WK40TF', 'WK40TQ', 'WK40TC'],
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25] }
        },
        'PROTO-MAX': {
          name: 'Proto-Max',
          type: 'solid_carbide_roughing',
          description: 'Roughing end mills with wiper geometry',
          flutes: [4, 5, 6],
          geometry: 'roughing',
          coatings: ['WK40TF'],
          diameterRange: { metric: [6, 8, 10, 12, 16, 20, 25] }
        }
      },
      indexable: {
        'XTRA-TEC': {
          name: 'Xtra-tec',
          type: 'indexable_shoulder_mill',
          description: 'True 90° shoulder milling system',
          series: {
            'F4042': { maxDoc: 8, inserts: ['ADMT'] },
            'F4044': { maxDoc: 11, inserts: ['ODMT', 'ODLT'] },
            'F4080': { maxDoc: 8, inserts: ['LPHT'] }
          },
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63, 80, 100] }
        },
        'BLAXX-M3024': {
          name: 'BLAXX M3024',
          type: 'indexable_shoulder_mill',
          description: 'Tangential shoulder milling',
          inserts: ['LNGU'],
          maxDoc: { metric: 12 },
          diameterRange: { metric: [20, 25, 32, 40, 50, 63, 80] }
        },
        'TIGER-TEC': {
          name: 'Tiger-tec',
          type: 'indexable_face_mill',
          description: 'High performance face milling',
          inserts: ['SDHT', 'SPMT'],
          grades: ['WKP35S', 'WSP45S', 'WSM35S'],
          diameterRange: { metric: [50, 63, 80, 100, 125, 160, 200, 250] }
        },
        'M4000': {
          name: 'M4000 System',
          type: 'indexable_face_mill',
          description: 'Universal face milling system',
          inserts: ['ODMT', 'OFMT'],
          diameterRange: { metric: [40, 50, 63, 80, 100, 125, 160] }
        }
      },
      highFeed: {
        'XTRA-TEC-XT-HF': {
          name: 'Xtra-tec XT High Feed',
          type: 'indexable_high_feed',
          description: 'High feed face milling',
          inserts: ['LNHU'],
          maxDoc: { metric: 1.3 },
          maxFpt: { metric: 2.0 },
          diameterRange: { metric: [25, 32, 40, 50, 63, 80, 100] }
        },
        'F5041': {
          name: 'F5041 High Feed',
          type: 'indexable_high_feed',
          description: 'Economical high feed milling',
          inserts: ['LNMT'],
          maxDoc: { metric: 1.0 },
          diameterRange: { metric: [32, 40, 50, 63] }
        }
      }
    },
    turning: {
      generalTurning: {
        'TIGER-TEC-GOLD': {
          name: 'Tiger-tec Gold',
          type: 'turning_technology',
          description: 'Premium CVD coating technology',
          inserts: ['CNMG', 'DNMG', 'WNMG', 'TNMG', 'VNMG', 'SNMG'],
          chipbreakers: ['NF', 'NM', 'NR', 'NMF', 'NMM', 'NMR', 'RP'],
          grades: {
            steel: ['WPP10S', 'WPP20S', 'WPP30S'],
            stainless: ['WMP20S', 'WMP30S'],
            cast_iron: ['WKK10S', 'WKK20S'],
            heat_resistant: ['WSP10S', 'WSP20S']
          }
        },
        'TIGER-TEC-SILVER': {
          name: 'Tiger-tec Silver',
          type: 'turning_technology',
          description: 'PVD coating for finishing',
          grades: ['WKP35G', 'WKP25G']
        }
      },
      boring: {
        'CAPTO-BORING': {
          name: 'Capto Boring',
          type: 'boring_system',
          description: 'Modular boring with Coromant Capto',
          overhangs: ['4xD', '6xD', '8xD', '10xD'],
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63] }
        }
      },
      grooving: {
        'CUT-SX': {
          name: 'Cut SX',
          type: 'grooving_parting',
          description: 'Self-clamping grooving system',
          widths: { metric: [2, 2.5, 3, 4, 5, 6] },
          maxDepth: { metric: [20, 26, 32] },
          grades: ['WKP35S', 'WSM35S']
        },
        'CUT-GX': {
          name: 'Cut GX',
          type: 'grooving_profiling',
          description: 'Grooving and profiling system',
          widths: { metric: [3, 4, 5, 6] },
          features: ['grooving', 'profiling', 'turning']
        }
      },
      threading: {
        'VARGUS': {
          name: 'Vargus Threading',
          type: 'threading',
          description: 'Thread turning inserts',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT', 'Whitworth', 'ACME', 'Trapezoidal'],
          insertSizes: ['16', '22', '27']
        }
      }
    },
    drilling: {
      solidCarbide: {
        'TITEX': {
          name: 'Titex',
          type: 'solid_carbide_drill',
          description: 'Premium solid carbide drilling',
          series: {
            'DC150': { geometry: 'general', coolantThru: true },
            'DC160': { geometry: 'deep_hole', depthCapability: '8xD' },
            'DC170': { geometry: 'ultra_deep', depthCapability: '20xD' },
            'DC175': { geometry: 'composite', materials: ['CFRP', 'stack'] }
          },
          diameterRange: { metric: [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] },
          grades: ['WJ30EL', 'WJ30RD', 'WJ30ER']
        },
        'XTREME-MICRO': {
          name: 'Xtreme Micro',
          type: 'solid_carbide_drill',
          description: 'Micro drilling',
          diameterRange: { metric: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0] },
          depthCapability: ['3xD', '5xD', '8xD']
        }
      },
      indexable: {
        'XTRA-TEC-DRILL': {
          name: 'Xtra-tec Drill',
          type: 'indexable_drill',
          description: 'Indexable drilling system',
          diameterRange: { metric: [14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD'],
          inserts: {
            peripheral: ['SPGX'],
            central: ['SPGX', 'XPGX']
          }
        },
        'B3212': {
          name: 'B3212 Modular',
          type: 'exchangeable_head',
          description: 'Exchangeable head drilling',
          diameterRange: { metric: [12, 14, 16, 18, 20, 22, 24, 25] },
          depthCapability: ['3xD', '5xD', '8xD']
        }
      }
    },
    grades: {
      turning: {
        'WPP10S': { iso: 'P10', coating: 'TIGER_TEC_GOLD', application: 'steel_finishing' },
        'WPP20S': { iso: 'P20', coating: 'TIGER_TEC_GOLD', application: 'steel_general' },
        'WPP30S': { iso: 'P30', coating: 'TIGER_TEC_GOLD', application: 'steel_roughing' },
        'WMP20S': { iso: 'M20', coating: 'TIGER_TEC_GOLD', application: 'stainless_general' },
        'WKK10S': { iso: 'K10', coating: 'TIGER_TEC_GOLD', application: 'cast_iron_finishing' }
      },
      milling: {
        'WKP35S': { iso: 'P35', coating: 'TIGER_TEC_SILVER', application: 'milling_steel' },
        'WSP45S': { iso: 'S45', coating: 'TIGER_TEC_SILVER', application: 'milling_heat_resistant' },
        'WSM35S': { iso: 'M35', coating: 'TIGER_TEC_SILVER', application: 'milling_stainless' }
      },
      solid_carbide: {
        'WK40TF': { coating: 'PVD', application: 'general_milling' },
        'WK40TQ': { coating: 'PVD', application: 'steel_milling' },
        'WK40TC': { coating: 'PVD', application: 'stainless_milling' }
      }
    }
  },
  // 7. TUNGALOY - Complete Product Line

  tungaloy: {
    manufacturer: {
      name: 'Tungaloy',
      country: 'Japan',
      founded: 1929,
      quality: 'Premium',
      priceLevel: 4,
      parent: 'IMC Group',
      marketPosition: 'Top 10 Global',
      website: 'tungaloy.com',
      specialty: 'Cemented carbide and cutting tools'
    },
    milling: {
      solidCarbide: {
        'ADDMEISTER': {
          name: 'AddMeister',
          type: 'exchangeable_head_endmill',
          description: 'Exchangeable head end mill system',
          headTypes: ['square', 'ball', 'corner_radius', 'chamfer'],
          diameterRange: { metric: [8, 10, 12, 16, 20, 25, 32] },
          shankTypes: ['steel', 'carbide']
        },
        'ADD-FORCE-MILL': {
          name: 'AddForce Mill',
          type: 'solid_carbide_endmill',
          description: 'High performance end mills',
          series: {
            'EP': { flutes: 4, geometry: 'square', applications: ['steel', 'stainless'] },
            'EPB': { flutes: 2, geometry: 'ball', applications: ['3d_machining'] },
            'EPHV': { flutes: 4, geometry: 'variable_helix', applications: ['titanium'] },
            'EPF': { flutes: 4, geometry: 'finishing', applications: ['high_finish'] }
          },
          coatings: ['AH725', 'AH120', 'AH130'],
          diameterRange: { metric: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] }
        }
      },
      indexable: {
        'DOFORCE-TRI': {
          name: 'DoForce-Tri',
          type: 'indexable_face_mill',
          description: 'High efficiency triangular insert face mill',
          inserts: ['TNMU', 'TNGU'],
          edgesPerInsert: 6,
          diameterRange: { metric: [40, 50, 63, 80, 100, 125, 160] }
        },
        'DOFORCE-MILL': {
          name: 'DoForce-Mill',
          type: 'indexable_face_mill',
          description: 'General purpose face milling',
          inserts: ['SNMU', 'SNHU'],
          edgesPerInsert: 8,
          diameterRange: { metric: [50, 63, 80, 100, 125, 160, 200] }
        },
        'ADDMILL': {
          name: 'AddMill',
          type: 'indexable_shoulder_mill',
          description: '90° shoulder milling',
          inserts: ['AOMT', 'APMT'],
          maxDoc: { metric: 11 },
          diameterRange: { metric: [16, 20, 25, 32, 40, 50, 63, 80] }
        },
        'TUNGHEX': {
          name: 'TungHex',
          type: 'indexable_face_mill',
          description: 'Hexagonal 12-edge face milling',
          inserts: ['HNMU'],
          edgesPerInsert: 12,
          diameterRange: { metric: [63, 80, 100, 125, 160, 200] }
        },
        'TUNG-TRI': {
          name: 'TungTri',
          type: 'indexable_shoulder_mill',
          description: 'Triangular insert shoulder milling',
          inserts: ['TOMT'],
          maxDoc: { metric: 8 },
          diameterRange: { metric: [20, 25, 32, 40, 50] }
        }
      },
      highFeed: {
        'TUNGFEED': {
          name: 'TungFeed',
          type: 'indexable_high_feed',
          description: 'High feed milling system',
          inserts: ['LNKT', 'SNHT'],
          maxDoc: { metric: 1.2 },
          maxFpt: { metric: 2.0 },
          diameterRange: { metric: [25, 32, 40, 50, 63, 80, 100] }
        },
        'DOFORCE-FEED': {
          name: 'DoForce-Feed',
          type: 'indexable_high_feed',
          description: 'Economy high feed system',
          inserts: ['LNMU'],
          maxDoc: { metric: 1.0 },
          diameterRange: { metric: [32, 40, 50, 63, 80] }
        }
      }
    },
    turning: {
      generalTurning: {
        'ADDFORCE-TURN': {
          name: 'AddForce Turn',
          type: 'turning_system',
          description: 'General turning system',
          inserts: ['CNMG', 'DNMG', 'WNMG', 'TNMG', 'SNMG', 'VNMG'],
          chipbreakers: ['TM', 'TSF', 'TH', 'TF', 'TS', 'TSW', 'TMA', 'TMC', 'THP'],
          grades: {
            steel: ['T9125', 'T9115', 'T9135', 'AH8005', 'AH8015'],
            stainless: ['AH725', 'AH730', 'AH3135'],
            cast_iron: ['AH120', 'AH130'],
            heat_resistant: ['AH905', 'AH8008']
          }
        },
        'MINI-TURN': {
          name: 'DoMini-Turn',
          type: 'small_part_turning',
          description: 'Small diameter turning and boring',
          inserts: ['CCMT', 'DCMT', 'VCMT'],
          minBore: { metric: 6 },
          chipbreakers: ['TF', 'TM', 'TS']
        }
      },
      grooving: {
        'TUNGREC': {
          name: 'TungRec',
          type: 'grooving_parting',
          description: 'Grooving and parting system',
          inserts: ['TGP', 'TGF', 'TGN'],
          widths: { metric: [1.5, 2, 2.5, 3, 4, 5, 6, 8] },
          maxDepth: { metric: [15, 20, 26, 32] },
          grades: ['AH725', 'AH730', 'GH730']
        },
        'TUNGHEX-REC': {
          name: 'TungHex-Rec',
          type: 'grooving',
          description: 'Hexagonal 6-edge grooving',
          inserts: ['TGH'],
          edgesPerInsert: 6,
          widths: { metric: [3, 4, 5, 6] }
        }
      },
      threading: {
        'TUNG-THREAD': {
          name: 'TungThread',
          type: 'threading',
          description: 'Thread turning system',
          threadForms: ['ISO', 'UN', 'BSPT', 'NPT', 'API', 'Whitworth'],
          insertSizes: ['16', '22', '27'],
          grades: ['AH725', 'T9125']
        }
      }
    },
    drilling: {
      solidCarbide: {
        'ADDDRILLXD': {
          name: 'AddDrillXD',
          type: 'solid_carbide_drill',
          description: 'Extended depth solid carbide',
          diameterRange: { metric: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20] },
          depthCapability: ['3xD', '5xD', '8xD', '12xD', '15xD', '20xD'],
          coolantThru: true,
          grades: ['AH725']
        },
        'ADDDRILL': {
          name: 'AddDrill',
          type: 'solid_carbide_drill',
          description: 'General purpose drilling',
          diameterRange: { metric: [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16] },
          depthCapability: ['3xD', '5xD'],
          coolantThru: true
        }
      },
      indexable: {
        'DRILLMEISTER': {
          name: 'DrillMeister',
          type: 'indexable_drill',
          description: 'Modular indexable drilling',
          diameterRange: { metric: [12, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 40] },
          depthCapability: ['2xD', '3xD', '4xD', '5xD', '6xD'],
          inserts: ['XPMT'],
          grades: ['AH725', 'AH120']
        },
        'TACDRILL': {
          name: 'TACDrill',
          type: 'indexable_drill',
          description: 'Flat-bottom drilling',
          diameterRange: { metric: [20, 22, 24, 25, 26, 28, 30, 32, 35, 40, 45, 50] },
          geometry: 'flat_bottom',
          depthCapability: ['2xD', '3xD', '4xD']
        }
      }
    },
    grades: {
      steel: {
        'T9125': { iso: 'P25', coating: 'PVD', application: 'steel_first_choice' },
        'T9115': { iso: 'P15', coating: 'PVD', application: 'steel_finishing' },
        'T9135': { iso: 'P35', coating: 'PVD', application: 'steel_roughing' },
        'AH8005': { iso: 'P05', coating: 'CVD', application: 'steel_light_finishing' },
        'AH8015': { iso: 'P15', coating: 'CVD', application: 'steel_precision' }
      },
      stainless: {
        'AH725': { iso: 'M25', coating: 'PVD', application: 'stainless_first_choice' },
        'AH730': { iso: 'M30', coating: 'PVD', application: 'stainless_medium' },
        'AH3135': { iso: 'M35', coating: 'CVD', application: 'stainless_roughing' }
      },
      cast_iron: {
        'AH120': { iso: 'K20', coating: 'PVD', application: 'cast_iron_general' },
        'AH130': { iso: 'K30', coating: 'PVD', application: 'cast_iron_roughing' }
      },
      heat_resistant: {
        'AH905': { iso: 'S05', coating: 'PVD', application: 'heat_resistant_finishing' },
        'AH8008': { iso: 'S08', coating: 'PVD', application: 'titanium_general' }
      }
    }
  },
  // UTILITY METHODS

  // Get manufacturer by name
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
  // Get all product lines for a manufacturer
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
  // Search across all manufacturers
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
  // Get statistics
  getStats() {
    const stats = {
      manufacturers: 0,
      totalProductLines: 0,
      byCategory: {
        milling: 0,
        turning: 0,
        drilling: 0
      }
    };
    for (const [key, mfr] of Object.entries(this)) {
      if (typeof mfr !== 'object' || !mfr.manufacturer) continue;

      stats.manufacturers++;

      const lines = this.getProductLines(key);
      if (lines) {
        stats.totalProductLines += lines.length;

        for (const line of lines) {
          if (stats.byCategory[line.category] !== undefined) {
            stats.byCategory[line.category]++;
          }
        }
      }
    }
    return stats;
  },
  init() {
    console.log('[PRISM_MAJOR_MANUFACTURERS_CATALOG] Initializing 7 major manufacturers...');

    const stats = this.getStats();
    console.log('[MANUFACTURERS] ✓ ' + stats.manufacturers + ' manufacturers');
    console.log('[MANUFACTURERS] ✓ ' + stats.totalProductLines + ' total product lines');
    console.log('[MANUFACTURERS] ✓ Milling: ' + stats.byCategory.milling + ' lines');
    console.log('[MANUFACTURERS] ✓ Turning: ' + stats.byCategory.turning + ' lines');
    console.log('[MANUFACTURERS] ✓ Drilling: ' + stats.byCategory.drilling + ' lines');

    // Register global functions
    window.getMfrCatalog = (name) => this.getManufacturer(name);
    window.getMfrProductLines = (key) => this.getProductLines(key);
    window.searchMfrProducts = (query) => this.searchProducts(query);

    console.log('[PRISM_MAJOR_MANUFACTURERS_CATALOG] v1.0 - Complete catalogs ready');

    return this;
  }
}