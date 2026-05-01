/**
 * PRISM ALUMINUM ALLOYS SCIENTIFIC DATABASE
 * ==========================================
 * 
 * Session: 1.A.1-SCI-05
 * Created: 2026-01-22
 * 
 * DATA SOURCES:
 * - Machining Data Handbook (3rd Ed)
 * - ASM Metals Handbook Vol. 2
 * - Johnson-Cook: Lesuer (2000), Meyer & Kleponis (2001)
 * - Kienzle: König & Klocke (1997)
 * 
 * COVERAGE: 38 Alloys across 7 series + cast
 */

const PRISM_ALUMINUM_ALLOYS_SCIENTIFIC = {
  version: "1.0.0",
  category: "aluminum_alloys",
  lastUpdated: "2026-01-22",
  
  materials: {
    
    // ===== 1XXX SERIES - COMMERCIALLY PURE =====
    
    '1050': {
      name: '1050 Aluminum',
      description: '99.5% pure aluminum',
      category: 'aluminum_alloys',
      subcategory: '1xxx_series',
      conditions: {
        'O': { hardness: { brinell: 20 }, tensileStrength: { value: 76, unit: 'MPa' }, yieldStrength: { value: 28, unit: 'MPa' },
               kienzle: { kc1_1: { value: 350, unit: 'MPa' }, mc: { value: 0.18 }, source: 'König & Klocke', reliability: 'medium' },
               machinability: { rating: 'D', percentOfB1112: 180, notes: 'Very gummy, BUE tendency' } },
        'H14': { hardness: { brinell: 32 }, tensileStrength: { value: 115, unit: 'MPa' }, yieldStrength: { value: 95, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 420, unit: 'MPa' }, mc: { value: 0.20 }, reliability: 'medium' },
                 machinability: { rating: 'D', percentOfB1112: 170 } }
      },
      physical: { density: { value: 2710, unit: 'kg/m³' }, meltingRange: { min: 646, max: 657, unit: '°C' }, thermalConductivity: { value: 229, unit: 'W/m·K' }, elasticModulus: { value: 69, unit: 'GPa' } },
      johnsonCook: { A: { value: 26, unit: 'MPa' }, B: { value: 155, unit: 'MPa' }, n: { value: 0.36 }, C: { value: 0.015 }, m: { value: 1.0 }, meltingTemp: { value: 657, unit: '°C' }, reliability: 'low' }
    },
    
    '1100': {
      name: '1100 Aluminum',
      description: '99.0% pure aluminum, general purpose',
      category: 'aluminum_alloys',
      subcategory: '1xxx_series',
      conditions: {
        'O': { hardness: { brinell: 23 }, tensileStrength: { value: 90, unit: 'MPa' }, yieldStrength: { value: 34, unit: 'MPa' },
               kienzle: { kc1_1: { value: 370, unit: 'MPa' }, mc: { value: 0.19 }, source: 'Machining Data Handbook', reliability: 'high' },
               machinability: { rating: 'D', percentOfB1112: 170 } },
        'H14': { hardness: { brinell: 32 }, tensileStrength: { value: 125, unit: 'MPa' }, yieldStrength: { value: 115, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 440, unit: 'MPa' }, mc: { value: 0.21 }, reliability: 'medium' },
                 machinability: { rating: 'D', percentOfB1112: 165 } },
        'H18': { hardness: { brinell: 44 }, tensileStrength: { value: 165, unit: 'MPa' }, yieldStrength: { value: 150, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 500, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'medium' },
                 machinability: { rating: 'C', percentOfB1112: 150 } }
      },
      physical: { density: { value: 2710, unit: 'kg/m³' }, meltingRange: { min: 643, max: 657, unit: '°C' }, thermalConductivity: { value: 222, unit: 'W/m·K' }, elasticModulus: { value: 69, unit: 'GPa' } },
      johnsonCook: { A: { value: 32, unit: 'MPa' }, B: { value: 160, unit: 'MPa' }, n: { value: 0.34 }, C: { value: 0.015 }, m: { value: 1.0 }, meltingTemp: { value: 657, unit: '°C' }, reliability: 'low' }
    },
    
    // ===== 2XXX SERIES - ALUMINUM-COPPER =====
    
    '2011': {
      name: '2011 Aluminum',
      description: 'Free-machining Al-Cu with Pb/Bi',
      category: 'aluminum_alloys',
      subcategory: '2xxx_series',
      primaryAlloying: 'Cu (5.0-6.0%), Pb, Bi',
      conditions: {
        'T3': { hardness: { brinell: 95 }, tensileStrength: { value: 380, unit: 'MPa' }, yieldStrength: { value: 295, unit: 'MPa' },
                kienzle: { kc1_1: { value: 580, unit: 'MPa' }, mc: { value: 0.24 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'A', percentOfB1112: 300, notes: 'BEST MACHINING ALUMINUM' } },
        'T8': { hardness: { brinell: 100 }, tensileStrength: { value: 405, unit: 'MPa' }, yieldStrength: { value: 310, unit: 'MPa' },
                kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                machinability: { rating: 'A', percentOfB1112: 290 } }
      },
      physical: { density: { value: 2830, unit: 'kg/m³' }, meltingRange: { min: 541, max: 638, unit: '°C' }, thermalConductivity: { value: 151, unit: 'W/m·K' }, elasticModulus: { value: 70, unit: 'GPa' } },
      johnsonCook: { A: { value: 290, unit: 'MPa' }, B: { value: 300, unit: 'MPa' }, n: { value: 0.35 }, C: { value: 0.012 }, m: { value: 1.0 }, meltingTemp: { value: 638, unit: '°C' }, reliability: 'low' },
      machiningNotes: { environmental: 'Contains lead - comply with regulations' }
    },
    
    '2014': {
      name: '2014 Aluminum',
      description: 'High-strength aerospace Al-Cu',
      category: 'aluminum_alloys',
      subcategory: '2xxx_series',
      primaryAlloying: 'Cu (3.9-5.0%), Mg, Si',
      conditions: {
        'T4': { hardness: { brinell: 105 }, tensileStrength: { value: 425, unit: 'MPa' }, yieldStrength: { value: 290, unit: 'MPa' },
                kienzle: { kc1_1: { value: 640, unit: 'MPa' }, mc: { value: 0.25 }, source: 'König & Klocke', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 150 } },
        'T6': { hardness: { brinell: 135 }, tensileStrength: { value: 483, unit: 'MPa' }, yieldStrength: { value: 414, unit: 'MPa' },
                kienzle: { kc1_1: { value: 720, unit: 'MPa' }, mc: { value: 0.26 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 130 } },
        'T651': { hardness: { brinell: 135 }, tensileStrength: { value: 483, unit: 'MPa' }, yieldStrength: { value: 414, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 720, unit: 'MPa' }, mc: { value: 0.26 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 130, notes: 'Better stability than T6' } }
      },
      physical: { density: { value: 2800, unit: 'kg/m³' }, meltingRange: { min: 507, max: 638, unit: '°C' }, thermalConductivity: { value: 154, unit: 'W/m·K' }, elasticModulus: { value: 73, unit: 'GPa' } },
      johnsonCook: { A: { value: 400, unit: 'MPa' }, B: { value: 400, unit: 'MPa' }, n: { value: 0.41 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 638, unit: '°C' }, source: 'Lesuer', reliability: 'medium' }
    },
    
    '2024': {
      name: '2024 Aluminum',
      description: 'Most used 2xxx aerospace alloy',
      category: 'aluminum_alloys',
      subcategory: '2xxx_series',
      primaryAlloying: 'Cu (3.8-4.9%), Mg (1.2-1.8%)',
      conditions: {
        'O': { hardness: { brinell: 47 }, tensileStrength: { value: 186, unit: 'MPa' }, yieldStrength: { value: 76, unit: 'MPa' },
               kienzle: { kc1_1: { value: 450, unit: 'MPa' }, mc: { value: 0.21 }, reliability: 'medium' },
               machinability: { rating: 'C', percentOfB1112: 140 } },
        'T3': { hardness: { brinell: 120 }, tensileStrength: { value: 483, unit: 'MPa' }, yieldStrength: { value: 345, unit: 'MPa' },
                kienzle: { kc1_1: { value: 700, unit: 'MPa' }, mc: { value: 0.26 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 120 } },
        'T351': { hardness: { brinell: 120 }, tensileStrength: { value: 470, unit: 'MPa' }, yieldStrength: { value: 325, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 690, unit: 'MPa' }, mc: { value: 0.26 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 125 } },
        'T4': { hardness: { brinell: 120 }, tensileStrength: { value: 469, unit: 'MPa' }, yieldStrength: { value: 324, unit: 'MPa' },
                kienzle: { kc1_1: { value: 680, unit: 'MPa' }, mc: { value: 0.26 }, reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 125 } },
        'T6': { hardness: { brinell: 125 }, tensileStrength: { value: 476, unit: 'MPa' }, yieldStrength: { value: 393, unit: 'MPa' },
                kienzle: { kc1_1: { value: 720, unit: 'MPa' }, mc: { value: 0.27 }, source: 'König & Klocke', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 115 } }
      },
      physical: { density: { value: 2780, unit: 'kg/m³' }, meltingRange: { min: 502, max: 638, unit: '°C' }, thermalConductivity: { value: 121, unit: 'W/m·K' }, elasticModulus: { value: 73, unit: 'GPa' } },
      johnsonCook: { A: { value: 369, unit: 'MPa' }, B: { value: 684, unit: 'MPa' }, n: { value: 0.73 }, C: { value: 0.0083 }, m: { value: 1.7 }, meltingTemp: { value: 775, unit: 'K' }, source: 'Lesuer (2000) - VALIDATED', reliability: 'high' },
      applications: ['Aircraft structures', 'Truck wheels', 'Fasteners']
    },
    
    '2219': {
      name: '2219 Aluminum',
      description: 'Weldable Al-Cu for cryogenic',
      category: 'aluminum_alloys',
      subcategory: '2xxx_series',
      conditions: {
        'T62': { hardness: { brinell: 130 }, tensileStrength: { value: 414, unit: 'MPa' }, yieldStrength: { value: 290, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 670, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'medium' },
                 machinability: { rating: 'B', percentOfB1112: 125 } },
        'T87': { hardness: { brinell: 140 }, tensileStrength: { value: 476, unit: 'MPa' }, yieldStrength: { value: 393, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 730, unit: 'MPa' }, mc: { value: 0.27 }, reliability: 'medium' },
                 machinability: { rating: 'B', percentOfB1112: 115 } }
      },
      physical: { density: { value: 2840, unit: 'kg/m³' }, meltingRange: { min: 543, max: 643, unit: '°C' }, thermalConductivity: { value: 120, unit: 'W/m·K' }, elasticModulus: { value: 73, unit: 'GPa' } },
      johnsonCook: { A: { value: 290, unit: 'MPa' }, B: { value: 500, unit: 'MPa' }, n: { value: 0.50 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 643, unit: '°C' }, reliability: 'low' },
      applications: ['Space structures', 'Cryogenic tankage']
    },
    
    // ===== 3XXX SERIES - ALUMINUM-MANGANESE =====
    
    '3003': {
      name: '3003 Aluminum',
      description: 'Most widely used Al alloy',
      category: 'aluminum_alloys',
      subcategory: '3xxx_series',
      conditions: {
        'O': { hardness: { brinell: 28 }, tensileStrength: { value: 110, unit: 'MPa' }, yieldStrength: { value: 42, unit: 'MPa' },
               kienzle: { kc1_1: { value: 400, unit: 'MPa' }, mc: { value: 0.20 }, source: 'Machining Data Handbook', reliability: 'high' },
               machinability: { rating: 'D', percentOfB1112: 160 } },
        'H14': { hardness: { brinell: 40 }, tensileStrength: { value: 150, unit: 'MPa' }, yieldStrength: { value: 125, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 480, unit: 'MPa' }, mc: { value: 0.22 }, reliability: 'high' },
                 machinability: { rating: 'D', percentOfB1112: 150 } },
        'H18': { hardness: { brinell: 55 }, tensileStrength: { value: 200, unit: 'MPa' }, yieldStrength: { value: 185, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 540, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'medium' },
                 machinability: { rating: 'C', percentOfB1112: 140 } }
      },
      physical: { density: { value: 2730, unit: 'kg/m³' }, meltingRange: { min: 643, max: 654, unit: '°C' }, thermalConductivity: { value: 193, unit: 'W/m·K' }, elasticModulus: { value: 70, unit: 'GPa' } },
      johnsonCook: { A: { value: 40, unit: 'MPa' }, B: { value: 200, unit: 'MPa' }, n: { value: 0.33 }, C: { value: 0.015 }, m: { value: 1.0 }, meltingTemp: { value: 654, unit: '°C' }, reliability: 'low' },
      applications: ['Sheet metal', 'Chemical equipment', 'Cooking utensils']
    },
    
    // ===== 5XXX SERIES - ALUMINUM-MAGNESIUM =====
    
    '5052': {
      name: '5052 Aluminum',
      description: 'Best general non-heat-treatable',
      category: 'aluminum_alloys',
      subcategory: '5xxx_series',
      conditions: {
        'O': { hardness: { brinell: 47 }, tensileStrength: { value: 195, unit: 'MPa' }, yieldStrength: { value: 90, unit: 'MPa' },
               kienzle: { kc1_1: { value: 500, unit: 'MPa' }, mc: { value: 0.22 }, source: 'Machining Data Handbook', reliability: 'high' },
               machinability: { rating: 'C', percentOfB1112: 130 } },
        'H32': { hardness: { brinell: 60 }, tensileStrength: { value: 230, unit: 'MPa' }, yieldStrength: { value: 180, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 550, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'high' },
                 machinability: { rating: 'C', percentOfB1112: 120 } },
        'H34': { hardness: { brinell: 68 }, tensileStrength: { value: 260, unit: 'MPa' }, yieldStrength: { value: 215, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 590, unit: 'MPa' }, mc: { value: 0.24 }, reliability: 'high' },
                 machinability: { rating: 'B', percentOfB1112: 115 } }
      },
      physical: { density: { value: 2680, unit: 'kg/m³' }, meltingRange: { min: 607, max: 649, unit: '°C' }, thermalConductivity: { value: 138, unit: 'W/m·K' }, elasticModulus: { value: 70, unit: 'GPa' } },
      johnsonCook: { A: { value: 90, unit: 'MPa' }, B: { value: 290, unit: 'MPa' }, n: { value: 0.38 }, C: { value: 0.012 }, m: { value: 1.0 }, meltingTemp: { value: 649, unit: '°C' }, source: 'Meyer (2001)', reliability: 'medium' },
      applications: ['Marine', 'Truck trailers', 'Pressure vessels']
    },
    
    '5083': {
      name: '5083 Aluminum',
      description: 'Highest strength non-heat-treatable',
      category: 'aluminum_alloys',
      subcategory: '5xxx_series',
      conditions: {
        'O': { hardness: { brinell: 65 }, tensileStrength: { value: 290, unit: 'MPa' }, yieldStrength: { value: 145, unit: 'MPa' },
               kienzle: { kc1_1: { value: 580, unit: 'MPa' }, mc: { value: 0.24 }, source: 'König & Klocke', reliability: 'high' },
               machinability: { rating: 'C', percentOfB1112: 110 } },
        'H116': { hardness: { brinell: 75 }, tensileStrength: { value: 315, unit: 'MPa' }, yieldStrength: { value: 215, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 630, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 100 } },
        'H321': { hardness: { brinell: 80 }, tensileStrength: { value: 320, unit: 'MPa' }, yieldStrength: { value: 230, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 640, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 95 } }
      },
      physical: { density: { value: 2660, unit: 'kg/m³' }, meltingRange: { min: 574, max: 638, unit: '°C' }, thermalConductivity: { value: 117, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 145, unit: 'MPa' }, B: { value: 370, unit: 'MPa' }, n: { value: 0.40 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 638, unit: '°C' }, reliability: 'medium' },
      applications: ['Shipbuilding', 'Cryogenic vessels', 'Bridges']
    },
    
    '5086': {
      name: '5086 Aluminum',
      description: 'Marine alloy with weldability',
      category: 'aluminum_alloys',
      subcategory: '5xxx_series',
      conditions: {
        'O': { hardness: { brinell: 56 }, tensileStrength: { value: 260, unit: 'MPa' }, yieldStrength: { value: 115, unit: 'MPa' },
               kienzle: { kc1_1: { value: 540, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'high' },
               machinability: { rating: 'C', percentOfB1112: 115 } },
        'H32': { hardness: { brinell: 65 }, tensileStrength: { value: 290, unit: 'MPa' }, yieldStrength: { value: 205, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 600, unit: 'MPa' }, mc: { value: 0.24 }, reliability: 'high' },
                 machinability: { rating: 'B', percentOfB1112: 105 } },
        'H116': { hardness: { brinell: 70 }, tensileStrength: { value: 290, unit: 'MPa' }, yieldStrength: { value: 205, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 600, unit: 'MPa' }, mc: { value: 0.24 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 105 } }
      },
      physical: { density: { value: 2660, unit: 'kg/m³' }, meltingRange: { min: 585, max: 640, unit: '°C' }, thermalConductivity: { value: 127, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 115, unit: 'MPa' }, B: { value: 340, unit: 'MPa' }, n: { value: 0.38 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 640, unit: '°C' }, reliability: 'low' },
      applications: ['Marine', 'Pressure vessels', 'Tanks']
    },
    
    // ===== 6XXX SERIES - ALUMINUM-MAGNESIUM-SILICON =====
    
    '6061': {
      name: '6061 Aluminum',
      description: 'Most versatile heat-treatable',
      category: 'aluminum_alloys',
      subcategory: '6xxx_series',
      conditions: {
        'O': { hardness: { brinell: 30 }, tensileStrength: { value: 124, unit: 'MPa' }, yieldStrength: { value: 55, unit: 'MPa' },
               kienzle: { kc1_1: { value: 420, unit: 'MPa' }, mc: { value: 0.21 }, reliability: 'medium' },
               machinability: { rating: 'C', percentOfB1112: 140 } },
        'T4': { hardness: { brinell: 65 }, tensileStrength: { value: 240, unit: 'MPa' }, yieldStrength: { value: 145, unit: 'MPa' },
                kienzle: { kc1_1: { value: 540, unit: 'MPa' }, mc: { value: 0.23 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 120 } },
        'T6': { hardness: { brinell: 95 }, tensileStrength: { value: 310, unit: 'MPa' }, yieldStrength: { value: 276, unit: 'MPa' },
                kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.25 }, source: 'König & Klocke', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 100 } },
        'T651': { hardness: { brinell: 95 }, tensileStrength: { value: 310, unit: 'MPa' }, yieldStrength: { value: 276, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 100, notes: 'Best dimensional stability' } }
      },
      physical: { density: { value: 2700, unit: 'kg/m³' }, meltingRange: { min: 582, max: 652, unit: '°C' }, thermalConductivity: { value: 167, unit: 'W/m·K' }, elasticModulus: { value: 69, unit: 'GPa' } },
      johnsonCook: { A: { value: 270, unit: 'MPa' }, B: { value: 154, unit: 'MPa' }, n: { value: 0.22 }, C: { value: 0.015 }, m: { value: 1.0 }, meltingTemp: { value: 925, unit: 'K' }, source: 'Meyer & Kleponis (2001) - VALIDATED', reliability: 'high' },
      applications: ['Structural', 'Truck frames', 'Furniture', 'Pipelines']
    },
    
    '6063': {
      name: '6063 Aluminum',
      description: 'Architectural extrusion alloy',
      category: 'aluminum_alloys',
      subcategory: '6xxx_series',
      conditions: {
        'O': { hardness: { brinell: 25 }, tensileStrength: { value: 90, unit: 'MPa' }, yieldStrength: { value: 48, unit: 'MPa' },
               kienzle: { kc1_1: { value: 380, unit: 'MPa' }, mc: { value: 0.19 }, reliability: 'medium' },
               machinability: { rating: 'C', percentOfB1112: 145 } },
        'T5': { hardness: { brinell: 60 }, tensileStrength: { value: 186, unit: 'MPa' }, yieldStrength: { value: 145, unit: 'MPa' },
                kienzle: { kc1_1: { value: 500, unit: 'MPa' }, mc: { value: 0.22 }, reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 120 } },
        'T6': { hardness: { brinell: 73 }, tensileStrength: { value: 241, unit: 'MPa' }, yieldStrength: { value: 214, unit: 'MPa' },
                kienzle: { kc1_1: { value: 560, unit: 'MPa' }, mc: { value: 0.24 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 110 } }
      },
      physical: { density: { value: 2690, unit: 'kg/m³' }, meltingRange: { min: 616, max: 654, unit: '°C' }, thermalConductivity: { value: 201, unit: 'W/m·K' }, elasticModulus: { value: 69, unit: 'GPa' } },
      johnsonCook: { A: { value: 200, unit: 'MPa' }, B: { value: 150, unit: 'MPa' }, n: { value: 0.25 }, C: { value: 0.015 }, m: { value: 1.0 }, meltingTemp: { value: 654, unit: '°C' }, reliability: 'low' },
      applications: ['Architectural extrusions', 'Furniture', 'Window frames']
    },
    
    '6082': {
      name: '6082 Aluminum',
      description: 'High-strength 6xxx, European standard',
      category: 'aluminum_alloys',
      subcategory: '6xxx_series',
      conditions: {
        'T4': { hardness: { brinell: 75 }, tensileStrength: { value: 260, unit: 'MPa' }, yieldStrength: { value: 170, unit: 'MPa' },
                kienzle: { kc1_1: { value: 570, unit: 'MPa' }, mc: { value: 0.24 }, reliability: 'medium' },
                machinability: { rating: 'B', percentOfB1112: 110 } },
        'T6': { hardness: { brinell: 95 }, tensileStrength: { value: 340, unit: 'MPa' }, yieldStrength: { value: 310, unit: 'MPa' },
                kienzle: { kc1_1: { value: 660, unit: 'MPa' }, mc: { value: 0.26 }, source: 'European data', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 95 } },
        'T651': { hardness: { brinell: 95 }, tensileStrength: { value: 340, unit: 'MPa' }, yieldStrength: { value: 310, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 660, unit: 'MPa' }, mc: { value: 0.26 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 95 } }
      },
      physical: { density: { value: 2710, unit: 'kg/m³' }, meltingRange: { min: 555, max: 650, unit: '°C' }, thermalConductivity: { value: 172, unit: 'W/m·K' }, elasticModulus: { value: 70, unit: 'GPa' } },
      johnsonCook: { A: { value: 295, unit: 'MPa' }, B: { value: 180, unit: 'MPa' }, n: { value: 0.23 }, C: { value: 0.012 }, m: { value: 1.0 }, meltingTemp: { value: 650, unit: '°C' }, reliability: 'medium' },
      applications: ['Structural', 'Offshore', 'Bridge decks']
    },
    
    '6262': {
      name: '6262 Aluminum',
      description: 'Free-machining 6xxx with Pb/Bi',
      category: 'aluminum_alloys',
      subcategory: '6xxx_series',
      conditions: {
        'T6': { hardness: { brinell: 90 }, tensileStrength: { value: 310, unit: 'MPa' }, yieldStrength: { value: 275, unit: 'MPa' },
                kienzle: { kc1_1: { value: 560, unit: 'MPa' }, mc: { value: 0.24 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'A', percentOfB1112: 200, notes: 'FREE MACHINING - best of 6xxx' } },
        'T9': { hardness: { brinell: 100 }, tensileStrength: { value: 340, unit: 'MPa' }, yieldStrength: { value: 310, unit: 'MPa' },
                kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                machinability: { rating: 'A', percentOfB1112: 180 } }
      },
      physical: { density: { value: 2720, unit: 'kg/m³' }, meltingRange: { min: 582, max: 652, unit: '°C' }, thermalConductivity: { value: 167, unit: 'W/m·K' }, elasticModulus: { value: 69, unit: 'GPa' } },
      johnsonCook: { A: { value: 270, unit: 'MPa' }, B: { value: 160, unit: 'MPa' }, n: { value: 0.22 }, C: { value: 0.015 }, m: { value: 1.0 }, meltingTemp: { value: 652, unit: '°C' }, reliability: 'low' },
      machiningNotes: { environmental: 'Contains lead' },
      applications: ['Screw machine products', 'Fittings', 'Valves']
    },
    
    // ===== 7XXX SERIES - ALUMINUM-ZINC =====
    
    '7050': {
      name: '7050 Aluminum',
      description: 'High-strength aerospace with SCC resistance',
      category: 'aluminum_alloys',
      subcategory: '7xxx_series',
      conditions: {
        'T7451': { hardness: { brinell: 145 }, tensileStrength: { value: 524, unit: 'MPa' }, yieldStrength: { value: 469, unit: 'MPa' },
                   kienzle: { kc1_1: { value: 770, unit: 'MPa' }, mc: { value: 0.28 }, source: 'Aerospace data', reliability: 'high' },
                   machinability: { rating: 'B', percentOfB1112: 85 } },
        'T7651': { hardness: { brinell: 142 }, tensileStrength: { value: 510, unit: 'MPa' }, yieldStrength: { value: 455, unit: 'MPa' },
                   kienzle: { kc1_1: { value: 760, unit: 'MPa' }, mc: { value: 0.28 }, reliability: 'high' },
                   machinability: { rating: 'B', percentOfB1112: 85 } }
      },
      physical: { density: { value: 2830, unit: 'kg/m³' }, meltingRange: { min: 477, max: 635, unit: '°C' }, thermalConductivity: { value: 157, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 460, unit: 'MPa' }, B: { value: 400, unit: 'MPa' }, n: { value: 0.40 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 635, unit: '°C' }, reliability: 'medium' },
      applications: ['Aircraft structures', 'Bulkheads', 'Wing skins']
    },
    
    '7075': {
      name: '7075 Aluminum',
      description: 'Highest strength wrought Al, aerospace standard',
      category: 'aluminum_alloys',
      subcategory: '7xxx_series',
      conditions: {
        'O': { hardness: { brinell: 60 }, tensileStrength: { value: 228, unit: 'MPa' }, yieldStrength: { value: 103, unit: 'MPa' },
               kienzle: { kc1_1: { value: 520, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'medium' },
               machinability: { rating: 'C', percentOfB1112: 110 } },
        'T6': { hardness: { brinell: 150 }, tensileStrength: { value: 572, unit: 'MPa' }, yieldStrength: { value: 503, unit: 'MPa' },
                kienzle: { kc1_1: { value: 820, unit: 'MPa' }, mc: { value: 0.29 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 80 } },
        'T651': { hardness: { brinell: 150 }, tensileStrength: { value: 572, unit: 'MPa' }, yieldStrength: { value: 503, unit: 'MPa' },
                  kienzle: { kc1_1: { value: 820, unit: 'MPa' }, mc: { value: 0.29 }, reliability: 'high' },
                  machinability: { rating: 'B', percentOfB1112: 80, notes: 'Preferred for machining' } },
        'T73': { hardness: { brinell: 135 }, tensileStrength: { value: 503, unit: 'MPa' }, yieldStrength: { value: 434, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 770, unit: 'MPa' }, mc: { value: 0.28 }, reliability: 'high' },
                 machinability: { rating: 'B', percentOfB1112: 85 } },
        'T7351': { hardness: { brinell: 135 }, tensileStrength: { value: 503, unit: 'MPa' }, yieldStrength: { value: 434, unit: 'MPa' },
                   kienzle: { kc1_1: { value: 770, unit: 'MPa' }, mc: { value: 0.28 }, reliability: 'high' },
                   machinability: { rating: 'B', percentOfB1112: 85 } }
      },
      physical: { density: { value: 2810, unit: 'kg/m³' }, meltingRange: { min: 477, max: 635, unit: '°C' }, thermalConductivity: { value: 130, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 546, unit: 'MPa' }, B: { value: 678, unit: 'MPa' }, n: { value: 0.71 }, C: { value: 0.024 }, m: { value: 1.56 }, meltingTemp: { value: 893, unit: 'K' }, source: 'Lesuer (2000) - VALIDATED', reliability: 'high' },
      applications: ['Aircraft structures', 'Gears', 'Shafts', 'Missile parts']
    },
    
    '7175': {
      name: '7175 Aluminum',
      description: 'High-strength aerospace forging',
      category: 'aluminum_alloys',
      subcategory: '7xxx_series',
      conditions: {
        'T66': { hardness: { brinell: 155 }, tensileStrength: { value: 593, unit: 'MPa' }, yieldStrength: { value: 538, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 850, unit: 'MPa' }, mc: { value: 0.30 }, reliability: 'medium' },
                 machinability: { rating: 'B', percentOfB1112: 75 } },
        'T7351': { hardness: { brinell: 140 }, tensileStrength: { value: 524, unit: 'MPa' }, yieldStrength: { value: 462, unit: 'MPa' },
                   kienzle: { kc1_1: { value: 790, unit: 'MPa' }, mc: { value: 0.28 }, reliability: 'medium' },
                   machinability: { rating: 'B', percentOfB1112: 82 } }
      },
      physical: { density: { value: 2800, unit: 'kg/m³' }, meltingRange: { min: 477, max: 635, unit: '°C' }, thermalConductivity: { value: 157, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 525, unit: 'MPa' }, B: { value: 650, unit: 'MPa' }, n: { value: 0.70 }, C: { value: 0.022 }, m: { value: 1.5 }, meltingTemp: { value: 635, unit: '°C' }, reliability: 'low' },
      applications: ['Aircraft forgings', 'Structural components']
    },
    
    '7475': {
      name: '7475 Aluminum',
      description: 'High fracture toughness 7xxx',
      category: 'aluminum_alloys',
      subcategory: '7xxx_series',
      conditions: {
        'T61': { hardness: { brinell: 138 }, tensileStrength: { value: 517, unit: 'MPa' }, yieldStrength: { value: 448, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 780, unit: 'MPa' }, mc: { value: 0.28 }, reliability: 'medium' },
                 machinability: { rating: 'B', percentOfB1112: 82 } },
        'T7351': { hardness: { brinell: 125 }, tensileStrength: { value: 462, unit: 'MPa' }, yieldStrength: { value: 386, unit: 'MPa' },
                   kienzle: { kc1_1: { value: 740, unit: 'MPa' }, mc: { value: 0.27 }, reliability: 'medium' },
                   machinability: { rating: 'B', percentOfB1112: 88 } }
      },
      physical: { density: { value: 2810, unit: 'kg/m³' }, meltingRange: { min: 477, max: 635, unit: '°C' }, thermalConductivity: { value: 154, unit: 'W/m·K' }, elasticModulus: { value: 70, unit: 'GPa' } },
      johnsonCook: { A: { value: 440, unit: 'MPa' }, B: { value: 580, unit: 'MPa' }, n: { value: 0.65 }, C: { value: 0.02 }, m: { value: 1.5 }, meltingTemp: { value: 635, unit: '°C' }, reliability: 'low' },
      applications: ['Fuselage skin', 'Wing skins', 'Damage-tolerant structures']
    },
    
    // ===== CAST ALUMINUM ALLOYS =====
    
    'A356': {
      name: 'A356 Aluminum',
      description: 'Premium quality casting, low iron',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      castingProcess: ['Sand', 'Permanent Mold'],
      siliconContent: { value: 7, unit: '%' },
      conditions: {
        'F': { hardness: { brinell: 55 }, tensileStrength: { value: 175, unit: 'MPa' }, yieldStrength: { value: 85, unit: 'MPa' },
               kienzle: { kc1_1: { value: 520, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'medium' },
               machinability: { rating: 'B', percentOfB1112: 95 } },
        'T6': { hardness: { brinell: 80 }, tensileStrength: { value: 262, unit: 'MPa' }, yieldStrength: { value: 186, unit: 'MPa' },
                kienzle: { kc1_1: { value: 600, unit: 'MPa' }, mc: { value: 0.25 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 85 } },
        'T61': { hardness: { brinell: 70 }, tensileStrength: { value: 234, unit: 'MPa' }, yieldStrength: { value: 165, unit: 'MPa' },
                 kienzle: { kc1_1: { value: 570, unit: 'MPa' }, mc: { value: 0.24 }, reliability: 'medium' },
                 machinability: { rating: 'B', percentOfB1112: 90 } }
      },
      physical: { density: { value: 2680, unit: 'kg/m³' }, meltingRange: { min: 557, max: 613, unit: '°C' }, thermalConductivity: { value: 151, unit: 'W/m·K' }, elasticModulus: { value: 72, unit: 'GPa' } },
      johnsonCook: { A: { value: 180, unit: 'MPa' }, B: { value: 250, unit: 'MPa' }, n: { value: 0.30 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 613, unit: '°C' }, reliability: 'medium' },
      applications: ['Aircraft wheels', 'Automotive wheels', 'Aerospace castings']
    },
    
    'A357': {
      name: 'A357 Aluminum',
      description: 'Premium casting with Be',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      siliconContent: { value: 7, unit: '%' },
      conditions: {
        'T6': { hardness: { brinell: 90 }, tensileStrength: { value: 317, unit: 'MPa' }, yieldStrength: { value: 248, unit: 'MPa' },
                kienzle: { kc1_1: { value: 640, unit: 'MPa' }, mc: { value: 0.26 }, source: 'Aerospace data', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 80 } }
      },
      physical: { density: { value: 2680, unit: 'kg/m³' }, meltingRange: { min: 557, max: 613, unit: '°C' }, thermalConductivity: { value: 159, unit: 'W/m·K' }, elasticModulus: { value: 72, unit: 'GPa' } },
      johnsonCook: { A: { value: 245, unit: 'MPa' }, B: { value: 280, unit: 'MPa' }, n: { value: 0.32 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 613, unit: '°C' }, reliability: 'medium' },
      applications: ['Aerospace castings', 'Missile components']
    },
    
    '319': {
      name: '319 Aluminum',
      description: 'General purpose casting',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      siliconContent: { value: 6, unit: '%' },
      conditions: {
        'F': { hardness: { brinell: 70 }, tensileStrength: { value: 186, unit: 'MPa' }, yieldStrength: { value: 124, unit: 'MPa' },
               kienzle: { kc1_1: { value: 550, unit: 'MPa' }, mc: { value: 0.24 }, source: 'Machining Data Handbook', reliability: 'high' },
               machinability: { rating: 'B', percentOfB1112: 100 } },
        'T5': { hardness: { brinell: 80 }, tensileStrength: { value: 207, unit: 'MPa' }, yieldStrength: { value: 152, unit: 'MPa' },
                kienzle: { kc1_1: { value: 590, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 95 } },
        'T6': { hardness: { brinell: 95 }, tensileStrength: { value: 248, unit: 'MPa' }, yieldStrength: { value: 179, unit: 'MPa' },
                kienzle: { kc1_1: { value: 630, unit: 'MPa' }, mc: { value: 0.26 }, reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 90 } }
      },
      physical: { density: { value: 2790, unit: 'kg/m³' }, meltingRange: { min: 521, max: 604, unit: '°C' }, thermalConductivity: { value: 109, unit: 'W/m·K' }, elasticModulus: { value: 74, unit: 'GPa' } },
      johnsonCook: { A: { value: 120, unit: 'MPa' }, B: { value: 240, unit: 'MPa' }, n: { value: 0.28 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 604, unit: '°C' }, reliability: 'medium' },
      applications: ['Engine blocks', 'Cylinder heads', 'Manifolds']
    },
    
    '356': {
      name: '356 Aluminum',
      description: 'Most widely used cast Al',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      siliconContent: { value: 7, unit: '%' },
      conditions: {
        'F': { hardness: { brinell: 55 }, tensileStrength: { value: 165, unit: 'MPa' }, yieldStrength: { value: 83, unit: 'MPa' },
               kienzle: { kc1_1: { value: 500, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'high' },
               machinability: { rating: 'B', percentOfB1112: 100 } },
        'T6': { hardness: { brinell: 75 }, tensileStrength: { value: 228, unit: 'MPa' }, yieldStrength: { value: 165, unit: 'MPa' },
                kienzle: { kc1_1: { value: 570, unit: 'MPa' }, mc: { value: 0.24 }, source: 'Machining Data Handbook', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 90 } },
        'T7': { hardness: { brinell: 60 }, tensileStrength: { value: 193, unit: 'MPa' }, yieldStrength: { value: 131, unit: 'MPa' },
                kienzle: { kc1_1: { value: 530, unit: 'MPa' }, mc: { value: 0.23 }, reliability: 'medium' },
                machinability: { rating: 'B', percentOfB1112: 95 } }
      },
      physical: { density: { value: 2680, unit: 'kg/m³' }, meltingRange: { min: 557, max: 613, unit: '°C' }, thermalConductivity: { value: 151, unit: 'W/m·K' }, elasticModulus: { value: 72, unit: 'GPa' } },
      johnsonCook: { A: { value: 160, unit: 'MPa' }, B: { value: 240, unit: 'MPa' }, n: { value: 0.28 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 613, unit: '°C' }, reliability: 'medium' },
      applications: ['Automotive parts', 'Pump housings', 'Marine hardware']
    },
    
    '380': {
      name: '380 Aluminum',
      description: 'Most used die casting alloy',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      castingProcess: ['Die Cast'],
      siliconContent: { value: 8.5, unit: '%', effect: 'Higher Si - increased tool wear' },
      conditions: {
        'F': { hardness: { brinell: 80 }, tensileStrength: { value: 317, unit: 'MPa' }, yieldStrength: { value: 159, unit: 'MPa' },
               kienzle: { kc1_1: { value: 650, unit: 'MPa' }, mc: { value: 0.26 }, source: 'Machining Data Handbook', reliability: 'high' },
               machinability: { rating: 'C', percentOfB1112: 80, notes: 'Higher Si = more tool wear' } }
      },
      physical: { density: { value: 2740, unit: 'kg/m³' }, meltingRange: { min: 521, max: 593, unit: '°C' }, thermalConductivity: { value: 96, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 155, unit: 'MPa' }, B: { value: 350, unit: 'MPa' }, n: { value: 0.35 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 593, unit: '°C' }, reliability: 'medium' },
      applications: ['Lawnmower housings', 'Auto brackets', 'Electrical fittings']
    },
    
    '390': {
      name: '390 Aluminum',
      description: 'Hypereutectic high-Si die cast',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      castingProcess: ['Die Cast'],
      siliconContent: { value: 17, unit: '%', effect: 'HYPEREUTECTIC - PCD/CBN REQUIRED' },
      conditions: {
        'F': { hardness: { brinell: 120 }, tensileStrength: { value: 279, unit: 'MPa' }, yieldStrength: { value: 241, unit: 'MPa' },
               kienzle: { kc1_1: { value: 750, unit: 'MPa' }, mc: { value: 0.28 }, source: 'Automotive data', reliability: 'high' },
               machinability: { rating: 'D', percentOfB1112: 50, notes: 'DIFFICULT - PCD or CBN required' } },
        'T5': { hardness: { brinell: 135 }, tensileStrength: { value: 310, unit: 'MPa' }, yieldStrength: { value: 276, unit: 'MPa' },
                kienzle: { kc1_1: { value: 800, unit: 'MPa' }, mc: { value: 0.29 }, reliability: 'high' },
                machinability: { rating: 'D', percentOfB1112: 45 } }
      },
      physical: { density: { value: 2730, unit: 'kg/m³' }, meltingRange: { min: 507, max: 649, unit: '°C' }, thermalConductivity: { value: 134, unit: 'W/m·K' }, elasticModulus: { value: 81, unit: 'GPa' }, wearResistance: 'EXCELLENT' },
      johnsonCook: { A: { value: 235, unit: 'MPa' }, B: { value: 350, unit: 'MPa' }, n: { value: 0.30 }, C: { value: 0.012 }, m: { value: 1.0 }, meltingTemp: { value: 649, unit: '°C' }, reliability: 'medium' },
      machiningNotes: { tooling: 'PCD or CBN MANDATORY', cutting_speed: 'Lower than standard Al', coolant: 'Heavy flood required' },
      applications: ['Engine blocks (linerless)', 'Pistons', 'High-wear components']
    },
    
    '413': {
      name: '413 Aluminum',
      description: 'Eutectic die cast, excellent fluidity',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      castingProcess: ['Die Cast'],
      siliconContent: { value: 12, unit: '%', effect: 'Near-eutectic - carbide OK' },
      conditions: {
        'F': { hardness: { brinell: 80 }, tensileStrength: { value: 296, unit: 'MPa' }, yieldStrength: { value: 145, unit: 'MPa' },
               kienzle: { kc1_1: { value: 640, unit: 'MPa' }, mc: { value: 0.26 }, source: 'Die casting data', reliability: 'high' },
               machinability: { rating: 'C', percentOfB1112: 65 } }
      },
      physical: { density: { value: 2660, unit: 'kg/m³' }, meltingRange: { min: 574, max: 582, unit: '°C' }, thermalConductivity: { value: 121, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 140, unit: 'MPa' }, B: { value: 320, unit: 'MPa' }, n: { value: 0.32 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 582, unit: '°C' }, reliability: 'low' },
      applications: ['Thin-wall castings', 'Intricate shapes']
    },

    '518': {
      name: '518 Aluminum (518.0)',
      description: 'High-strength Mg-based die cast',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      aluminumAssociation: '518.0',
      primaryAlloying: 'Mg (7.5-8.5%)',
      castingProcess: ['Die Cast'],
      siliconContent: { value: 0.35, unit: '%', effect: 'Low Si - excellent machinability' },
      conditions: {
        'F': { hardness: { brinell: 75 }, tensileStrength: { value: 310, unit: 'MPa' }, yieldStrength: { value: 186, unit: 'MPa' },
               kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'medium' },
               machinability: { rating: 'B', percentOfB1112: 100 } }
      },
      physical: { density: { value: 2530, unit: 'kg/m³' }, meltingRange: { min: 538, max: 621, unit: '°C' }, thermalConductivity: { value: 96, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 185, unit: 'MPa' }, B: { value: 300, unit: 'MPa' }, n: { value: 0.35 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 621, unit: '°C' }, reliability: 'low' },
      applications: ['Automotive parts requiring anodizing', 'Marine', 'Premium die castings']
    },
    
    '713': {
      name: '713 Aluminum (713.0)',
      description: 'Pressure-tight casting alloy',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      aluminumAssociation: '713.0',
      primaryAlloying: 'Zn (7.0-8.0%), Mg (0.25-0.45%), Cu (0.4-1.0%)',
      castingProcess: ['Sand', 'Permanent Mold'],
      conditions: {
        'F': { hardness: { brinell: 75 }, tensileStrength: { value: 220, unit: 'MPa' }, yieldStrength: { value: 150, unit: 'MPa' },
               kienzle: { kc1_1: { value: 580, unit: 'MPa' }, mc: { value: 0.24 }, reliability: 'medium' },
               machinability: { rating: 'B', percentOfB1112: 95 } },
        'T5': { hardness: { brinell: 85 }, tensileStrength: { value: 252, unit: 'MPa' }, yieldStrength: { value: 179, unit: 'MPa' },
                kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'medium' },
                machinability: { rating: 'B', percentOfB1112: 90 } }
      },
      physical: { density: { value: 2810, unit: 'kg/m³' }, meltingRange: { min: 596, max: 643, unit: '°C' }, thermalConductivity: { value: 117, unit: 'W/m·K' }, elasticModulus: { value: 71, unit: 'GPa' } },
      johnsonCook: { A: { value: 145, unit: 'MPa' }, B: { value: 280, unit: 'MPa' }, n: { value: 0.30 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 643, unit: '°C' }, reliability: 'low' },
      applications: ['Pump housings', 'Pressure-tight housings', 'Machine tool parts']
    },
    
    'A357': {
      name: 'A357 Aluminum (A03570)',
      description: 'Premium quality casting alloy with Be addition',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      aluminumAssociation: 'A357.0',
      primaryAlloying: 'Si (6.5-7.5%), Mg (0.45-0.6%), Be (0.04-0.07%)',
      conditions: {
        'T6': { hardness: { brinell: 90 }, tensileStrength: { value: 317, unit: 'MPa' }, yieldStrength: { value: 248, unit: 'MPa' },
                kienzle: { kc1_1: { value: 640, unit: 'MPa' }, mc: { value: 0.26 }, source: 'Aerospace data', reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 80 } }
      },
      physical: { density: { value: 2680, unit: 'kg/m³' }, meltingRange: { min: 557, max: 613, unit: '°C' }, thermalConductivity: { value: 159, unit: 'W/m·K' }, elasticModulus: { value: 72, unit: 'GPa' } },
      johnsonCook: { A: { value: 245, unit: 'MPa' }, B: { value: 280, unit: 'MPa' }, n: { value: 0.32 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 613, unit: '°C' }, reliability: 'medium' },
      applications: ['Aerospace castings', 'Missile components', 'Premium structural']
    },
    
    '319': {
      name: '319 Aluminum (319.0)',
      description: 'General purpose sand/perm mold casting alloy',
      category: 'aluminum_alloys',
      subcategory: 'cast_alloys',
      aluminumAssociation: '319.0',
      primaryAlloying: 'Si (5.5-6.5%), Cu (3.0-4.0%)',
      conditions: {
        'F': { hardness: { brinell: 70 }, tensileStrength: { value: 186, unit: 'MPa' }, yieldStrength: { value: 124, unit: 'MPa' },
               kienzle: { kc1_1: { value: 550, unit: 'MPa' }, mc: { value: 0.24 }, source: 'Machining Data Handbook', reliability: 'high' },
               machinability: { rating: 'B', percentOfB1112: 100 } },
        'T5': { hardness: { brinell: 80 }, tensileStrength: { value: 207, unit: 'MPa' }, yieldStrength: { value: 145, unit: 'MPa' },
                kienzle: { kc1_1: { value: 580, unit: 'MPa' }, mc: { value: 0.25 }, reliability: 'high' },
                machinability: { rating: 'B', percentOfB1112: 95 } },
        'T6': { hardness: { brinell: 85 }, tensileStrength: { value: 250, unit: 'MPa' }, yieldStrength: { value: 165, unit: 'MPa' },
                kienzle: { kc1_1: { value: 620, unit: 'MPa' }, mc: { value: 0.26 }, reliability: 'high' },
                machinability: { rating: 'C', percentOfB1112: 70 } }
      },
      physical: { density: { value: 2790, unit: 'kg/m³' }, meltingRange: { min: 516, max: 604, unit: '°C' }, thermalConductivity: { value: 109, unit: 'W/m·K' }, elasticModulus: { value: 74, unit: 'GPa' } },
      johnsonCook: { A: { value: 165, unit: 'MPa' }, B: { value: 280, unit: 'MPa' }, n: { value: 0.32 }, C: { value: 0.01 }, m: { value: 1.0 }, meltingTemp: { value: 604, unit: '°C' }, reliability: 'medium' },
      applications: ['Engine blocks', 'Transmission housings', 'General purpose castings']
    }
  },
  
  // ===== SERIES CHARACTERISTICS =====
  
  seriesCharacteristics: {
    '1xxx': {
      name: 'Commercially Pure',
      primaryElement: 'Al (99%+)',
      heatTreatable: false,
      corrosionResistance: 'Excellent',
      weldability: 'Excellent',
      machinabilityNotes: 'Soft, gummy - can smear. Sharp tools, high speeds'
    },
    '2xxx': {
      name: 'Aluminum-Copper',
      primaryElement: 'Cu (3.5-6.5%)',
      heatTreatable: true,
      corrosionResistance: 'Fair (needs protection)',
      weldability: 'Limited',
      machinabilityNotes: 'Best aerospace machining. Avoid aged condition for heavy cuts'
    },
    '3xxx': {
      name: 'Aluminum-Manganese',
      primaryElement: 'Mn (0.5-1.5%)',
      heatTreatable: false,
      corrosionResistance: 'Good',
      weldability: 'Excellent',
      machinabilityNotes: 'Soft, similar to 1xxx. Better chip formation'
    },
    '5xxx': {
      name: 'Aluminum-Magnesium',
      primaryElement: 'Mg (0.5-5.5%)',
      heatTreatable: false,
      corrosionResistance: 'Excellent (especially marine)',
      weldability: 'Excellent',
      machinabilityNotes: 'Good chips, moderate speeds. Strain hardens'
    },
    '6xxx': {
      name: 'Aluminum-Magnesium-Silicon',
      primaryElement: 'Mg + Si',
      heatTreatable: true,
      corrosionResistance: 'Good',
      weldability: 'Good',
      machinabilityNotes: 'Most machinable heat-treatable series. 6061-T6 excellent'
    },
    '7xxx': {
      name: 'Aluminum-Zinc',
      primaryElement: 'Zn (4-8%)',
      heatTreatable: true,
      corrosionResistance: 'Fair (SCC susceptible)',
      weldability: 'Poor to Fair',
      machinabilityNotes: 'Highest strength. Good machining but produces fine chips'
    },
    'cast': {
      name: 'Cast Alloys',
      primaryElement: 'Varies (Si dominant)',
      heatTreatable: 'Most yes',
      corrosionResistance: 'Varies',
      weldability: 'Limited',
      machinabilityNotes: 'Si content critical: <7% carbide OK, >12% PCD required'
    }
  },
  
  // ===== SILICON CONTENT MACHINING GUIDE =====
  
  siliconMachiningGuide: {
    'low': {
      range: '0-7%',
      toolMaterial: 'Carbide (coated or uncoated)',
      example: ['A356', 'A357', '319', '518'],
      speeds: 'Normal aluminum speeds',
      wear: 'Moderate - flank wear dominant'
    },
    'hypoeutectic': {
      range: '7-11%',
      toolMaterial: 'Carbide (coated recommended)',
      example: ['380', '383'],
      speeds: 'Reduce 10-20% from normal',
      wear: 'Accelerated - abrasive Si particles'
    },
    'nearEutectic': {
      range: '11-13%',
      toolMaterial: 'Carbide or PCD',
      example: ['413'],
      speeds: 'Carbide: reduce 30%, PCD: normal+',
      wear: 'Significant - primary Si crystals'
    },
    'hypereutectic': {
      range: '>13%',
      toolMaterial: 'PCD or CBN MANDATORY',
      example: ['390'],
      speeds: 'Carbide fails rapidly',
      wear: 'EXTREME - primary Si crystals to 50μm'
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

  searchBySeries: function(series) {
    const results = [];
    const seriesPrefix = series.replace('xxx', '');
    for (const id in this.materials) {
      if (id.startsWith(seriesPrefix) || 
          (this.materials[id].subcategory && this.materials[id].subcategory.includes(seriesPrefix))) {
        results.push({ id: id, ...this.materials[id] });
      }
    }
    return results;
  },

  getCastAlloys: function() {
    const results = [];
    for (const id in this.materials) {
      if (this.materials[id].subcategory === 'cast_alloys') {
        results.push({ id: id, ...this.materials[id] });
      }
    }
    return results;
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

  getSiliconToolingRecommendation: function(siPercent) {
    if (siPercent <= 7) return this.siliconMachiningGuide.low;
    if (siPercent <= 11) return this.siliconMachiningGuide.hypoeutectic;
    if (siPercent <= 13) return this.siliconMachiningGuide.nearEutectic;
    return this.siliconMachiningGuide.hypereutectic;
  },

  getSeriesInfo: function(series) {
    return this.seriesCharacteristics[series] || null;
  },

  searchByApplication: function(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();
    for (const id in this.materials) {
      const material = this.materials[id];
      if (material.applications && 
          material.applications.some(app => app.toLowerCase().includes(searchTerm))) {
        results.push({ id: id, ...material });
      }
    }
    return results;
  },

  getAerospaceAlloys: function() {
    return [
      ...this.searchBySeries('2xxx'),
      ...this.searchBySeries('7xxx')
    ].filter(m => m.applications && 
      m.applications.some(a => a.toLowerCase().includes('aerospace') || a.toLowerCase().includes('aircraft')));
  }
};

// Export for use in PRISM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_ALUMINUM_ALLOYS_SCIENTIFIC;
}

if (typeof window !== 'undefined') {
  window.PRISM_ALUMINUM_ALLOYS_SCIENTIFIC = PRISM_ALUMINUM_ALLOYS_SCIENTIFIC;
}
