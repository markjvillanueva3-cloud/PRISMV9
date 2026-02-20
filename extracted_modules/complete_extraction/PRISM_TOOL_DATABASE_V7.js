const PRISM_TOOL_DATABASE_V7 = {
  version: '7.0.0',
  generated: '2025-01-01',

  // STANDARD SIZES (All industry-standard diameters)

  sizes: {
    inch: {
      micro: [0.005, 0.010, 0.015, 0.020, 0.025, 0.030, 0.035, 0.040, 0.045, 0.050],

      numberDrills: {  // #80 to #1
        80: 0.0135, 79: 0.0145, 78: 0.0160, 77: 0.0180, 76: 0.0200,
        75: 0.0210, 74: 0.0225, 73: 0.0240, 72: 0.0250, 71: 0.0260,
        70: 0.0280, 69: 0.0292, 68: 0.0310, 67: 0.0320, 66: 0.0330,
        65: 0.0350, 64: 0.0360, 63: 0.0370, 62: 0.0380, 61: 0.0390,
        60: 0.0400, 59: 0.0410, 58: 0.0420, 57: 0.0430, 56: 0.0465,
        55: 0.0520, 54: 0.0550, 53: 0.0595, 52: 0.0635, 51: 0.0670,
        50: 0.0700, 49: 0.0730, 48: 0.0760, 47: 0.0785, 46: 0.0810,
        45: 0.0820, 44: 0.0860, 43: 0.0890, 42: 0.0935, 41: 0.0960,
        40: 0.0980, 39: 0.0995, 38: 0.1015, 37: 0.1040, 36: 0.1065,
        35: 0.1100, 34: 0.1110, 33: 0.1130, 32: 0.1160, 31: 0.1200,
        30: 0.1285, 29: 0.1360, 28: 0.1405, 27: 0.1440, 26: 0.1470,
        25: 0.1495, 24: 0.1520, 23: 0.1540, 22: 0.1570, 21: 0.1590,
        20: 0.1610, 19: 0.1660, 18: 0.1695, 17: 0.1730, 16: 0.1770,
        15: 0.1800, 14: 0.1820, 13: 0.1850, 12: 0.1890, 11: 0.1910,
        10: 0.1935, 9: 0.1960, 8: 0.1990, 7: 0.2010, 6: 0.2040,
        5: 0.2055, 4: 0.2090, 3: 0.2130, 2: 0.2210, 1: 0.2280
      },
      letterDrills: {  // A to Z
        A: 0.234, B: 0.238, C: 0.242, D: 0.246, E: 0.250, F: 0.257,
        G: 0.261, H: 0.266, I: 0.272, J: 0.277, K: 0.281, L: 0.290,
        M: 0.295, N: 0.302, O: 0.316, P: 0.323, Q: 0.332, R: 0.339,
        S: 0.348, T: 0.358, U: 0.368, V: 0.377, W: 0.386, X: 0.397,
        Y: 0.404, Z: 0.413
      },
      fractional: [
        0.0156, 0.0312, 0.0469, 0.0625, 0.0781, 0.0938, 0.1094, 0.125,
        0.1406, 0.1562, 0.1719, 0.1875, 0.2031, 0.2188, 0.2344, 0.250,
        0.2656, 0.2812, 0.2969, 0.3125, 0.3281, 0.3438, 0.3594, 0.375,
        0.3906, 0.4062, 0.4219, 0.4375, 0.4531, 0.4688, 0.4844, 0.500,
        0.5156, 0.5312, 0.5469, 0.5625, 0.5781, 0.5938, 0.6094, 0.625,
        0.6406, 0.6562, 0.6719, 0.6875, 0.7031, 0.7188, 0.7344, 0.750,
        0.7656, 0.7812, 0.7969, 0.8125, 0.8281, 0.8438, 0.8594, 0.875,
        0.8906, 0.9062, 0.9219, 0.9375, 0.9531, 0.9688, 0.9844, 1.000,
        1.0625, 1.125, 1.1875, 1.250, 1.3125, 1.375, 1.4375, 1.500,
        1.5625, 1.625, 1.6875, 1.750, 1.8125, 1.875, 1.9375, 2.000
      ]
    },
    metric: {
      micro: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
      small: [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5,
              3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0],
      medium: [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0,
               12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 17.0, 18.0, 19.0, 20.0],
      large: [21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 28.0, 30.0, 32.0, 35.0, 36.0, 38.0, 40.0,
              42.0, 45.0, 48.0, 50.0]
    }
  },
  // COATINGS

  coatings: {
    uncoated: { name: 'Uncoated', color: '#C0C0C0', tempLimit: 500, materials: ['aluminum', 'plastics', 'brass', 'copper'] },
    TiN: { name: 'Titanium Nitride', color: '#FFD700', tempLimit: 600, materials: ['steel', 'cast_iron', 'stainless'] },
    TiCN: { name: 'Titanium Carbonitride', color: '#4169E1', tempLimit: 700, materials: ['steel', 'stainless', 'cast_iron'] },
    TiAlN: { name: 'Titanium Aluminum Nitride', color: '#8B4513', tempLimit: 800, materials: ['steel', 'stainless', 'titanium', 'hardened'] },
    AlTiN: { name: 'Aluminum Titanium Nitride', color: '#2F4F4F', tempLimit: 900, materials: ['steel', 'stainless', 'titanium', 'superalloys'] },
    AlCrN: { name: 'Aluminum Chromium Nitride', color: '#696969', tempLimit: 1000, materials: ['hardened_steel', 'titanium'] },
    nACo: { name: 'nACo (Nano)', color: '#1E90FF', tempLimit: 1100, materials: ['hardened_steel', 'superalloys'] },
    ZrN: { name: 'Zirconium Nitride', color: '#FFD700', tempLimit: 600, materials: ['aluminum', 'copper', 'brass'] },
    DLC: { name: 'Diamond-Like Carbon', color: '#000000', tempLimit: 350, materials: ['aluminum', 'graphite', 'composites'] },
    CVD_diamond: { name: 'CVD Diamond', color: '#FFFFFF', tempLimit: 700, materials: ['aluminum', 'graphite', 'composites', 'ceramics'] }
  },
  // SUBSTRATES

  substrates: {
    HSS: { name: 'High Speed Steel', hardness: 'HRC 62-65', toughness: 'high', cost: 1.0 },
    'HSS-E': { name: 'Cobalt HSS (5-8%)', hardness: 'HRC 65-67', toughness: 'high', cost: 1.3 },
    'HSS-E-PM': { name: 'Powder Metal HSS', hardness: 'HRC 67-69', toughness: 'very_high', cost: 1.8 },
    carbide_micro: { name: 'Micrograin Carbide', hardness: 'HRA 91-93', toughness: 'medium', cost: 2.5 },
    carbide_ultra: { name: 'Ultrafine Carbide', hardness: 'HRA 93-94', toughness: 'medium', cost: 3.0 },
    carbide_submicron: { name: 'Submicron Carbide', hardness: 'HRA 94-95', toughness: 'low', cost: 4.0 }
  },
  // BRANDS BY TIER

  brands: {
    premium_usa: [
      { id: 'harvey', name: 'Harvey Tool', specialty: 'Micro/specialty end mills' },
      { id: 'helical', name: 'Helical Solutions', specialty: 'High performance carbide' },
      { id: 'sgs', name: 'SGS Tool', specialty: 'Solid carbide' },
      { id: 'destiny', name: 'Destiny Tool', specialty: 'CNC cutting tools' },
      { id: 'gorilla', name: 'Gorilla Mill', specialty: 'Aggressive roughing' },
      { id: 'garr', name: 'GARR Tool', specialty: 'Solid carbide' },
      { id: 'fullerton', name: 'Fullerton Tool', specialty: 'High performance' },
      { id: 'imco', name: 'IMCO Carbide', specialty: 'Solid carbide' },
      { id: 'kennametal', name: 'Kennametal', specialty: 'Complete tooling' }
    ],
    premium_europe: [
      { id: 'sandvik', name: 'Sandvik Coromant', specialty: 'Complete solutions' },
      { id: 'seco', name: 'Seco Tools', specialty: 'Metal cutting' },
      { id: 'walter', name: 'Walter', specialty: 'Precision tools' },
      { id: 'guhring', name: 'Gühring', specialty: 'Drilling/milling' },
      { id: 'mapal', name: 'MAPAL', specialty: 'Precision boring' },
      { id: 'fraisa', name: 'Fraisa', specialty: 'High precision' },
      { id: 'emuge', name: 'Emuge-Franken', specialty: 'Threading' }
    ],
    premium_japan: [
      { id: 'osg', name: 'OSG', specialty: 'Taps/drills/end mills' },
      { id: 'mitsubishi', name: 'Mitsubishi Materials', specialty: 'Carbide tooling' },
      { id: 'kyocera', name: 'Kyocera', specialty: 'Ceramic/carbide' },
      { id: 'sumitomo', name: 'Sumitomo', specialty: 'CBN/carbide' },
      { id: 'tungaloy', name: 'Tungaloy', specialty: 'Carbide tools' },
      { id: 'nachi', name: 'Nachi', specialty: 'Drills/end mills' }
    ],
    premium_other: [
      { id: 'iscar', name: 'ISCAR', specialty: 'Innovative indexable' }
    ],
    tier2: [
      { id: 'yg1', name: 'YG-1', specialty: 'General purpose' },
      { id: 'taegutec', name: 'TaeguTec', specialty: 'Indexable tools' },
      { id: 'lakeshore', name: 'Lakeshore Carbide', specialty: 'Value carbide' },
      { id: 'maford', name: 'MA Ford', specialty: 'HSS tools' }
    ],
    economy: [
      { id: 'accupro', name: 'AccuPro', specialty: 'Value tools' },
      { id: 'shars', name: 'Shars', specialty: 'Import tools' },
      { id: 'generic', name: 'Generic Import', specialty: 'Economy' }
    ]
  },
  // TOOL TEMPLATES (Define tool families)

  templates: {
    // END MILLS

    endmills: {
      // 2-Flute Square for Aluminum
      'EM-2F-ALU': {
        name: '2-Flute Square End Mill - Aluminum',
        type: 'endmill', subtype: 'square', flutes: 2, helix: 30,
        coatings: ['uncoated', 'ZrN', 'DLC'],
        substrates: ['carbide_micro'],
        sizeRange: { inch: [0.0625, 1.0], metric: [2, 25] },
        materials: ['aluminum', 'brass', 'plastics', 'copper'],
        locMultiplier: 3, oalMultiplier: 6,
        speeds: { aluminum: { sfm: 800, ipt: 0.004 }, brass: { sfm: 500, ipt: 0.003 } }
      },
      // 3-Flute Variable Helix for Aluminum
      'EM-3F-ALU-VH': {
        name: '3-Flute Variable Helix - Aluminum',
        type: 'endmill', subtype: 'variable_helix', flutes: 3, helix: [35, 38, 40],
        coatings: ['uncoated', 'ZrN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.125, 1.0], metric: [3, 25] },
        materials: ['aluminum', 'brass'],
        locMultiplier: 3, oalMultiplier: 6,
        speeds: { aluminum: { sfm: 1000, ipt: 0.005 } }
      },
      // 4-Flute Square for Steel
      'EM-4F-STEEL': {
        name: '4-Flute Square End Mill - Steel',
        type: 'endmill', subtype: 'square', flutes: 4, helix: 30,
        coatings: ['TiN', 'TiAlN', 'AlTiN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.0625, 1.5], metric: [2, 38] },
        materials: ['steel', 'stainless', 'cast_iron'],
        locMultiplier: 2.5, oalMultiplier: 5,
        speeds: { steel: { sfm: 300, ipt: 0.002 }, stainless: { sfm: 180, ipt: 0.0015 } }
      },
      // 5-Flute Variable Helix for Steel
      'EM-5F-VH-STEEL': {
        name: '5-Flute Variable Helix - Steel',
        type: 'endmill', subtype: 'variable_helix', flutes: 5, helix: [35, 38, 40, 42],
        coatings: ['TiAlN', 'AlTiN', 'nACo'],
        substrates: ['carbide_ultra', 'carbide_submicron'],
        sizeRange: { inch: [0.125, 1.0], metric: [3, 25] },
        materials: ['steel', 'stainless', 'titanium'],
        locMultiplier: 2.5, oalMultiplier: 5,
        speeds: { steel: { sfm: 400, ipt: 0.003 }, titanium: { sfm: 120, ipt: 0.001 } }
      },
      // 6-Flute Finishing
      'EM-6F-FIN': {
        name: '6-Flute Finishing End Mill',
        type: 'endmill', subtype: 'finishing', flutes: 6, helix: 45,
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_ultra'],
        sizeRange: { inch: [0.125, 1.0], metric: [3, 25] },
        materials: ['steel', 'stainless', 'aluminum'],
        locMultiplier: 2, oalMultiplier: 4.5,
        speeds: { steel: { sfm: 350, ipt: 0.0015 } }
      },
      // Ball Nose
      'EM-BALL-2F': {
        name: '2-Flute Ball Nose End Mill',
        type: 'endmill', subtype: 'ballnose', flutes: 2, helix: 30,
        coatings: ['TiN', 'TiAlN', 'AlTiN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.0312, 1.0], metric: [1, 25] },
        materials: ['steel', 'stainless', 'aluminum'],
        locMultiplier: 2.5, oalMultiplier: 5,
        speeds: { steel: { sfm: 250, ipt: 0.002 } }
      },
      // Ball Nose 4-Flute
      'EM-BALL-4F': {
        name: '4-Flute Ball Nose End Mill',
        type: 'endmill', subtype: 'ballnose', flutes: 4, helix: 35,
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_ultra'],
        sizeRange: { inch: [0.125, 1.0], metric: [3, 25] },
        materials: ['steel', 'stainless', 'hardened'],
        locMultiplier: 2, oalMultiplier: 4.5,
        speeds: { steel: { sfm: 300, ipt: 0.0015 } }
      },
      // Corner Radius
      'EM-CR-4F': {
        name: '4-Flute Corner Radius End Mill',
        type: 'endmill', subtype: 'corner_radius', flutes: 4, helix: 35,
        cornerRadii: [0.010, 0.015, 0.020, 0.030, 0.060, 0.090, 0.120],
        coatings: ['TiN', 'TiAlN', 'AlTiN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.25, 1.5], metric: [6, 38] },
        materials: ['steel', 'stainless'],
        locMultiplier: 2, oalMultiplier: 4.5,
        speeds: { steel: { sfm: 320, ipt: 0.002 } }
      },
      // Roughing (Corncob)
      'EM-ROUGH-4F': {
        name: '4-Flute Roughing End Mill',
        type: 'endmill', subtype: 'roughing', flutes: 4, helix: 35,
        chipbreaker: true,
        coatings: ['TiN', 'TiAlN'],
        substrates: ['carbide_micro'],
        sizeRange: { inch: [0.25, 2.0], metric: [6, 50] },
        materials: ['steel', 'stainless', 'cast_iron'],
        locMultiplier: 3, oalMultiplier: 5.5,
        speeds: { steel: { sfm: 200, ipt: 0.004 } }
      },
      // High Feed
      'EM-HF-4F': {
        name: '4-Flute High Feed End Mill',
        type: 'endmill', subtype: 'high_feed', flutes: 4, helix: 40,
        geometry: 'high_feed',
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_ultra'],
        sizeRange: { inch: [0.375, 1.5], metric: [10, 38] },
        materials: ['steel', 'stainless', 'titanium'],
        locMultiplier: 0.5, oalMultiplier: 4,
        speeds: { steel: { sfm: 300, ipt: 0.006 } }
      }
    },
    // DRILLS

    drills: {
      // Jobber HSS
      'DR-JOB-HSS': {
        name: 'HSS Jobber Drill',
        type: 'drill', subtype: 'jobber', flutes: 2, pointAngle: 118,
        lengthRatio: 10,
        coatings: ['uncoated', 'TiN', 'TiCN'],
        substrates: ['HSS', 'HSS-E'],
        sizeRange: { inch: [0.0135, 0.750], metric: [0.5, 20] },
        coolantThrough: false,
        speeds: { steel: { sfm: 80, ipr: 0.005 }, aluminum: { sfm: 250, ipr: 0.010 } }
      },
      // Stub/Screw Machine
      'DR-STUB': {
        name: 'Stub/Screw Machine Drill',
        type: 'drill', subtype: 'stub', flutes: 2, pointAngle: 118,
        lengthRatio: 5,
        coatings: ['TiN', 'TiAlN'],
        substrates: ['HSS-E', 'carbide_micro'],
        sizeRange: { inch: [0.0625, 0.500], metric: [2, 12] },
        coolantThrough: false,
        speeds: { steel: { sfm: 100, ipr: 0.004 } }
      },
      // Carbide 3xD
      'DR-3XD-CARB': {
        name: 'Solid Carbide Drill 3xD',
        type: 'drill', subtype: '3xD', flutes: 2, pointAngle: 140,
        lengthRatio: 3,
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.0625, 1.0], metric: [2, 25] },
        coolantThrough: true,
        speeds: { steel: { sfm: 300, ipr: 0.006 }, stainless: { sfm: 180, ipr: 0.004 } }
      },
      // Carbide 5xD
      'DR-5XD-CARB': {
        name: 'Solid Carbide Drill 5xD',
        type: 'drill', subtype: '5xD', flutes: 2, pointAngle: 140,
        lengthRatio: 5,
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.0938, 1.0], metric: [3, 25] },
        coolantThrough: true,
        speeds: { steel: { sfm: 280, ipr: 0.005 } }
      },
      // Carbide 8xD
      'DR-8XD-CARB': {
        name: 'Solid Carbide Drill 8xD',
        type: 'drill', subtype: '8xD', flutes: 2, pointAngle: 140,
        lengthRatio: 8,
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_ultra'],
        sizeRange: { inch: [0.125, 0.750], metric: [3, 20] },
        coolantThrough: true,
        speeds: { steel: { sfm: 250, ipr: 0.004 } }
      },
      // Parabolic Flute (Deep Hole)
      'DR-PARABOLIC': {
        name: 'Parabolic Flute Deep Hole Drill',
        type: 'drill', subtype: 'parabolic', flutes: 2, pointAngle: 130,
        lengthRatio: 25,
        coatings: ['TiN', 'TiAlN'],
        substrates: ['HSS-E', 'HSS-E-PM'],
        sizeRange: { inch: [0.125, 0.500], metric: [3, 12] },
        coolantThrough: false,
        speeds: { steel: { sfm: 60, ipr: 0.003 } }
      }
    },
    // TAPS

    taps: {
      'TAP-SP-HSS': {
        name: 'Spiral Point Tap - HSS',
        type: 'tap', subtype: 'spiral_point', chamfer: 'plug',
        coatings: ['TiN', 'TiCN'],
        substrates: ['HSS-E', 'HSS-E-PM'],
        threadTypes: ['UNC', 'UNF', 'metric_coarse', 'metric_fine'],
        speeds: { steel: { sfm: 35, pctThread: 75 }, aluminum: { sfm: 90, pctThread: 65 } }
      },
      'TAP-SF-HSS': {
        name: 'Spiral Flute Tap - HSS',
        type: 'tap', subtype: 'spiral_flute', chamfer: 'bottoming',
        coatings: ['TiN', 'TiCN'],
        substrates: ['HSS-E', 'HSS-E-PM'],
        threadTypes: ['UNC', 'UNF', 'metric_coarse', 'metric_fine'],
        speeds: { steel: { sfm: 30, pctThread: 75 } }
      },
      'TAP-FORM': {
        name: 'Form/Roll Tap',
        type: 'tap', subtype: 'form', chamfer: 'plug',
        coatings: ['TiN', 'TiCN'],
        substrates: ['HSS-E', 'HSS-E-PM'],
        threadTypes: ['UNC', 'UNF', 'metric_coarse', 'metric_fine'],
        speeds: { steel: { sfm: 50, pctThread: 70 }, aluminum: { sfm: 120, pctThread: 60 } }
      },
      'TAP-CARB': {
        name: 'Solid Carbide Tap',
        type: 'tap', subtype: 'solid_carbide', chamfer: 'plug',
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_micro'],
        threadTypes: ['UNC', 'UNF', 'metric_coarse'],
        speeds: { steel: { sfm: 80, pctThread: 75 } }
      },
      'THREADMILL': {
        name: 'Thread Mill',
        type: 'threadmill', subtype: 'single_form',
        coatings: ['TiAlN', 'AlTiN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        threadTypes: ['UNC', 'UNF', 'metric_coarse', 'metric_fine', 'NPT', 'BSPP'],
        speeds: { steel: { sfm: 200 } }
      }
    },
    // REAMERS

    reamers: {
      'RM-STRAIGHT-HSS': {
        name: 'Straight Flute Reamer - HSS',
        type: 'reamer', subtype: 'straight_flute', flutes: 6,
        coatings: ['uncoated', 'TiN'],
        substrates: ['HSS', 'HSS-E'],
        sizeRange: { inch: [0.125, 1.5], metric: [3, 38] },
        tolerance: 'H7',
        speeds: { steel: { sfm: 50, ipr: 0.003 } }
      },
      'RM-SPIRAL-CARB': {
        name: 'Spiral Flute Reamer - Carbide',
        type: 'reamer', subtype: 'spiral_flute', flutes: 6,
        coatings: ['TiN', 'TiAlN'],
        substrates: ['carbide_micro'],
        sizeRange: { inch: [0.125, 1.0], metric: [3, 25] },
        tolerance: 'H7',
        speeds: { steel: { sfm: 150, ipr: 0.004 } }
      },
      'RM-EXPANSION': {
        name: 'Expansion Reamer',
        type: 'reamer', subtype: 'expansion', flutes: 8,
        adjustable: true, adjustmentRange: 0.003,
        coatings: ['uncoated'],
        substrates: ['HSS'],
        sizeRange: { inch: [0.25, 2.0], metric: [6, 50] },
        tolerance: 'adjustable',
        speeds: { steel: { sfm: 40, ipr: 0.002 } }
      }
    },
    // CHAMFER/SPOT/COUNTERSINK

    chamfer: {
      'CH-MILL': {
        name: 'Chamfer Mill',
        type: 'chamfer', subtype: 'chamfer_mill', flutes: 4,
        angles: [45, 60, 82, 90, 100, 120],
        coatings: ['TiN', 'TiAlN'],
        substrates: ['carbide_micro'],
        sizeRange: { inch: [0.25, 1.0], metric: [6, 25] }
      },
      'SPOT-DRILL': {
        name: 'Spot Drill',
        type: 'spot_drill', subtype: 'spot', flutes: 2,
        angles: [60, 82, 90, 118, 120, 140],
        coatings: ['TiN', 'TiAlN'],
        substrates: ['carbide_micro', 'carbide_ultra'],
        sizeRange: { inch: [0.125, 0.750], metric: [3, 20] }
      },
      'COUNTERSINK': {
        name: 'Countersink',
        type: 'countersink', subtype: 'countersink', flutes: 6,
        angles: [60, 82, 90, 100, 110, 120],
        coatings: ['TiN'],
        substrates: ['HSS', 'carbide_micro'],
        sizeRange: { inch: [0.25, 1.5], metric: [6, 38] }
      }
    },
    // BORING

    boring: {
      'BOR-BAR': {
        name: 'Boring Bar',
        type: 'boring', subtype: 'boring_bar',
        lengthRatios: [3, 4, 5, 6, 7, 8, 10],
        minBores: [0.25, 0.375, 0.5, 0.625, 0.75, 1.0, 1.5, 2.0],
        insertTypes: ['CCMT', 'DCMT', 'TCMT', 'VCMT'],
        substrates: ['carbide_micro', 'steel_body']
      },
      'BOR-FINE': {
        name: 'Fine Boring Head',
        type: 'boring', subtype: 'fine_boring',
        adjustability: 0.0001,
        minBores: [0.375, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0],
        insertTypes: ['CCMT', 'DCMT']
      },
      'BOR-BACK': {
        name: 'Back Boring Bar',
        type: 'boring', subtype: 'back_boring',
        minBores: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
        insertTypes: ['CPMT', 'DPMT']
      }
    },
    // INDEXABLE MILLS

    indexable: {
      'IDX-FACE': {
        name: 'Indexable Face Mill',
        type: 'indexable_mill', subtype: 'face_mill',
        diameters: [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0],
        insertTypes: ['SDMT1204', 'SEKR1203', 'OFER070405'],
        brands: ['Sandvik Coromant', 'Kennametal', 'ISCAR', 'Seco Tools', 'Walter']
      },
      'IDX-SHOULDER': {
        name: 'Indexable Square Shoulder Mill',
        type: 'indexable_mill', subtype: 'square_shoulder',
        diameters: [1.0, 1.5, 2.0, 2.5, 3.0, 4.0],
        insertTypes: ['APKT1003', 'XPMT1204', 'LNGU0634'],
        brands: ['Sandvik Coromant', 'Kennametal', 'ISCAR', 'Seco Tools']
      },
      'IDX-HIGHFEED': {
        name: 'Indexable High Feed Mill',
        type: 'indexable_mill', subtype: 'high_feed',
        diameters: [1.5, 2.0, 2.5, 3.0, 4.0],
        insertTypes: ['LNGU0634', 'XNMU0604', 'LOMU0604'],
        brands: ['ISCAR', 'Kennametal', 'Seco Tools']
      },
      'IDX-DRILL': {
        name: 'Indexable U-Drill',
        type: 'indexable_drill', subtype: 'u_drill',
        diameters: [0.75, 0.875, 1.0, 1.125, 1.25, 1.5, 1.75, 2.0],
        insertTypes: ['SCMT', 'WCMT', 'SPGT'],
        brands: ['Sandvik Coromant', 'Kennametal', 'ISCAR', 'Seco Tools']
      }
    }
  },
  // THREAD SIZES

  threads: {
    UNC: [
      { size: '#0', tpi: 80, major: 0.060, tapDrill: 0.0469, tapDrillNum: '3/64' },
      { size: '#1', tpi: 64, major: 0.073, tapDrill: 0.0595, tapDrillNum: '#53' },
      { size: '#2', tpi: 56, major: 0.086, tapDrill: 0.070, tapDrillNum: '#50' },
      { size: '#3', tpi: 48, major: 0.099, tapDrill: 0.0785, tapDrillNum: '#47' },
      { size: '#4', tpi: 40, major: 0.112, tapDrill: 0.089, tapDrillNum: '#43' },
      { size: '#5', tpi: 40, major: 0.125, tapDrill: 0.1015, tapDrillNum: '#38' },
      { size: '#6', tpi: 32, major: 0.138, tapDrill: 0.1065, tapDrillNum: '#36' },
      { size: '#8', tpi: 32, major: 0.164, tapDrill: 0.1360, tapDrillNum: '#29' },
      { size: '#10', tpi: 24, major: 0.190, tapDrill: 0.1495, tapDrillNum: '#25' },
      { size: '#12', tpi: 24, major: 0.216, tapDrill: 0.177, tapDrillNum: '#16' },
      { size: '1/4', tpi: 20, major: 0.250, tapDrill: 0.201, tapDrillNum: '#7' },
      { size: '5/16', tpi: 18, major: 0.3125, tapDrill: 0.257, tapDrillNum: 'F' },
      { size: '3/8', tpi: 16, major: 0.375, tapDrill: 0.3125, tapDrillNum: '5/16' },
      { size: '7/16', tpi: 14, major: 0.4375, tapDrill: 0.368, tapDrillNum: 'U' },
      { size: '1/2', tpi: 13, major: 0.500, tapDrill: 0.4219, tapDrillNum: '27/64' },
      { size: '9/16', tpi: 12, major: 0.5625, tapDrill: 0.4844, tapDrillNum: '31/64' },
      { size: '5/8', tpi: 11, major: 0.625, tapDrill: 0.5312, tapDrillNum: '17/32' },
      { size: '3/4', tpi: 10, major: 0.750, tapDrill: 0.6562, tapDrillNum: '21/32' },
      { size: '7/8', tpi: 9, major: 0.875, tapDrill: 0.7656, tapDrillNum: '49/64' },
      { size: '1', tpi: 8, major: 1.000, tapDrill: 0.875, tapDrillNum: '7/8' }
    ],

    UNF: [
      { size: '#0', tpi: 80, major: 0.060, tapDrill: 0.0469, tapDrillNum: '3/64' },
      { size: '#1', tpi: 72, major: 0.073, tapDrill: 0.0595, tapDrillNum: '#53' },
      { size: '#2', tpi: 64, major: 0.086, tapDrill: 0.070, tapDrillNum: '#50' },
      { size: '#3', tpi: 56, major: 0.099, tapDrill: 0.082, tapDrillNum: '#45' },
      { size: '#4', tpi: 48, major: 0.112, tapDrill: 0.0935, tapDrillNum: '#42' },
      { size: '#5', tpi: 44, major: 0.125, tapDrill: 0.104, tapDrillNum: '#37' },
      { size: '#6', tpi: 40, major: 0.138, tapDrill: 0.113, tapDrillNum: '#33' },
      { size: '#8', tpi: 36, major: 0.164, tapDrill: 0.136, tapDrillNum: '#29' },
      { size: '#10', tpi: 32, major: 0.190, tapDrill: 0.159, tapDrillNum: '#21' },
      { size: '#12', tpi: 28, major: 0.216, tapDrill: 0.180, tapDrillNum: '#14' },
      { size: '1/4', tpi: 28, major: 0.250, tapDrill: 0.213, tapDrillNum: '#3' },
      { size: '5/16', tpi: 24, major: 0.3125, tapDrill: 0.272, tapDrillNum: 'I' },
      { size: '3/8', tpi: 24, major: 0.375, tapDrill: 0.332, tapDrillNum: 'Q' },
      { size: '7/16', tpi: 20, major: 0.4375, tapDrill: 0.391, tapDrillNum: '25/64' },
      { size: '1/2', tpi: 20, major: 0.500, tapDrill: 0.453, tapDrillNum: '29/64' },
      { size: '9/16', tpi: 18, major: 0.5625, tapDrill: 0.516, tapDrillNum: '33/64' },
      { size: '5/8', tpi: 18, major: 0.625, tapDrill: 0.578, tapDrillNum: '37/64' },
      { size: '3/4', tpi: 16, major: 0.750, tapDrill: 0.688, tapDrillNum: '11/16' }
    ],

    metric_coarse: [
      { size: 'M1', pitch: 0.25, major: 1.0, tapDrill: 0.75 },
      { size: 'M1.2', pitch: 0.25, major: 1.2, tapDrill: 0.95 },
      { size: 'M1.6', pitch: 0.35, major: 1.6, tapDrill: 1.25 },
      { size: 'M2', pitch: 0.4, major: 2.0, tapDrill: 1.6 },
      { size: 'M2.5', pitch: 0.45, major: 2.5, tapDrill: 2.05 },
      { size: 'M3', pitch: 0.5, major: 3.0, tapDrill: 2.5 },
      { size: 'M4', pitch: 0.7, major: 4.0, tapDrill: 3.3 },
      { size: 'M5', pitch: 0.8, major: 5.0, tapDrill: 4.2 },
      { size: 'M6', pitch: 1.0, major: 6.0, tapDrill: 5.0 },
      { size: 'M8', pitch: 1.25, major: 8.0, tapDrill: 6.8 },
      { size: 'M10', pitch: 1.5, major: 10.0, tapDrill: 8.5 },
      { size: 'M12', pitch: 1.75, major: 12.0, tapDrill: 10.2 },
      { size: 'M14', pitch: 2.0, major: 14.0, tapDrill: 12.0 },
      { size: 'M16', pitch: 2.0, major: 16.0, tapDrill: 14.0 },
      { size: 'M18', pitch: 2.5, major: 18.0, tapDrill: 15.5 },
      { size: 'M20', pitch: 2.5, major: 20.0, tapDrill: 17.5 },
      { size: 'M24', pitch: 3.0, major: 24.0, tapDrill: 21.0 },
      { size: 'M30', pitch: 3.5, major: 30.0, tapDrill: 26.5 },
      { size: 'M36', pitch: 4.0, major: 36.0, tapDrill: 32.0 }
    ]
  },
  // STATISTICS

  stats: {
    totalConfigurations: 87561,
    breakdown: {
      endmills: 63168,
      drills: 18000,
      taps: 2656,
      reamers: 3330,
      chamfer: 288,
      boring: 35,
      indexable: 84
    }
  }
}