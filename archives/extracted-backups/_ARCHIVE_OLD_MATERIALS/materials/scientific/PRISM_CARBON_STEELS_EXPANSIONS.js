
    //=========================================================================
    // CS-009: AISI 1025 - FULL 127+ PARAMETER EXPANSION
    //=========================================================================
    'CS-009_AISI_1025': {
      id: 'CS-009',
      name: 'AISI 1025',
      alternateNames: ['SAE 1025', 'UNS G10250', '1025 Steel'],
      uns: 'G10250',
      standard: 'ASTM A29/A29M',
      description: 'Low carbon steel for forgings, carburizing applications, and general structural use',
      isoGroup: 'P',
      materialType: 'low_carbon_steel',
      criticalRating: '★',
      applications: ['Forgings', 'Carburized gears', 'Shafts', 'Structural components', 'Machinery parts'],
      
      composition: {
        C: { min: 0.22, max: 0.28, typical: 0.25, unit: 'wt%' },
        Mn: { min: 0.30, max: 0.60, typical: 0.45, unit: 'wt%' },
        P: { max: 0.040, unit: 'wt%' }, S: { max: 0.050, unit: 'wt%' },
        Si: { max: 0.10, typical: 0.05, unit: 'wt%' }, Fe: { balance: true }
      },
      
      physicalProperties: {
        density: { value: 7860, unit: 'kg/m³', tolerance: '±0.5%', source: 'ASM' },
        meltingRange: { solidus: 1460, liquidus: 1495, unit: '°C', source: 'ASM' },
        thermalConductivity: { values: [{ temp: 20, k: 49.8 }, { temp: 100, k: 49.0 }, { temp: 200, k: 47.2 }, { temp: 400, k: 41.5 }, { temp: 600, k: 34.5 }], unit: 'W/(m·K)', source: 'ASM' },
        specificHeat: { values: [{ temp: 20, cp: 486 }, { temp: 200, cp: 532 }, { temp: 400, cp: 582 }, { temp: 600, cp: 648 }], unit: 'J/(kg·K)', source: 'ASM' },
        thermalExpansion: { values: [{ tempRange: '20-100', alpha: 11.7 }, { tempRange: '20-200', alpha: 12.7 }, { tempRange: '20-400', alpha: 14.0 }, { tempRange: '20-600', alpha: 14.8 }], unit: '10⁻⁶/K', source: 'ASM' },
        thermalDiffusivity: { value: 13.0, unit: 'mm²/s', at: '20°C' },
        elasticModulus: { value: 207, unit: 'GPa', tolerance: '±3%' },
        shearModulus: { value: 80, unit: 'GPa' },
        poissonsRatio: { value: 0.29 },
        electricalResistivity: { value: 0.182, unit: 'μΩ·m', at: '20°C' },
        hardness: { asRolled: { value: 126, unit: 'HB', range: [116, 138] }, coldDrawn: { value: 156, unit: 'HB', range: [143, 170] }, normalized: { value: 137, unit: 'HB' } }
      },
      
      mechanicalProperties: {
        conditions: {
          'hot_rolled': { tensileStrength: { value: 440, unit: 'MPa', range: [410, 480] }, yieldStrength: { value: 265, unit: 'MPa', range: [240, 295] }, elongation: { value: 24, unit: '%' }, reductionOfArea: { value: 48, unit: '%' }, hardness: { value: 126, unit: 'HB' } },
          'cold_drawn': { tensileStrength: { value: 495, unit: 'MPa', range: [460, 540] }, yieldStrength: { value: 420, unit: 'MPa', range: [385, 460] }, elongation: { value: 14, unit: '%' }, reductionOfArea: { value: 38, unit: '%' }, hardness: { value: 156, unit: 'HB' } },
          'annealed': { tensileStrength: { value: 415, unit: 'MPa' }, yieldStrength: { value: 245, unit: 'MPa' }, elongation: { value: 27, unit: '%' }, hardness: { value: 116, unit: 'HB' } },
          'normalized': { tensileStrength: { value: 465, unit: 'MPa' }, yieldStrength: { value: 280, unit: 'MPa' }, elongation: { value: 25, unit: '%' }, hardness: { value: 137, unit: 'HB' } }
        },
        fatigueStrength: { rotatingBending: { value: 205, unit: 'MPa', cycles: 1e7 }, enduranceRatio: 0.46 },
        impactToughness: { charpy: { value: 75, unit: 'J', temperature: 20 }, izod: { value: 58, unit: 'J', temperature: 20 } },
        fractureToughness: { KIc: { value: 100, unit: 'MPa√m' } }
      },
      
      kienzle: {
        tangential: { Kc11: { value: 1730, unit: 'N/mm²', tolerance: '±10%' }, mc: { value: 0.26, tolerance: '±0.03' } },
        feed: { Kc11: { value: 692, unit: 'N/mm²' }, mc: { value: 0.28 } },
        radial: { Kc11: { value: 519, unit: 'N/mm²' }, mc: { value: 0.26 } },
        corrections: { rakeAngle: { referenceRake: 6, factor: 0.01 }, speed: { referenceSpeed: 100, exponent: 0.1 }, wear: { factor: 0.01 } },
        source: 'Machining Data Handbook', reliability: 'HIGH', confidenceInterval: '95%'
      },
      
      johnsonCook: {
        A: { value: 260, unit: 'MPa' }, B: { value: 530, unit: 'MPa' }, n: { value: 0.26 }, C: { value: 0.026 }, m: { value: 1.03 },
        referenceConditions: { strainRate: { value: 1.0, unit: 's⁻¹' }, temperature: { value: 20, unit: '°C' }, meltingTemp: { value: 1495, unit: '°C' } },
        damageParameters: { D1: 0.08, D2: 3.22, D3: -1.88, D4: 0.004, D5: 0.50 },
        source: 'Literature values', reliability: 'MEDIUM'
      },
      
      taylorToolLife: {
        carbide_uncoated: { C: { value: 265 }, n: { value: 0.20 }, a: { value: 0.55 }, b: { value: 0.14 }, validRange: { speed: [60, 210], feed: [0.1, 0.40], doc: [0.5, 4.5] } },
        carbide_coated: { C: { value: 355 }, n: { value: 0.23 }, coatings: ['TiN', 'TiCN', 'TiAlN'] },
        hss: { C: { value: 58 }, n: { value: 0.11 } },
        cermet: { C: { value: 315 }, n: { value: 0.25 } },
        wearRates: { flankWear: { rate: 0.15, unit: 'mm/min', at: { speed: 145, feed: 0.2 } }, craterWear: { tendency: 'MODERATE' } },
        source: 'Machining Data Handbook', reliability: 'HIGH'
      },
      
      chipFormation: {
        chipType: { primary: 'CONTINUOUS', variants: ['ribbon', 'helical'], description: 'Continuous chips typical' },
        shearAngle: { typical: { value: 25, unit: '°', range: [20, 30] }, speedEffect: 'Increases with speed' },
        compressionRatio: { typical: { value: 2.6, range: [2.2, 3.2] } },
        curlRadius: { natural: { value: 7.5, unit: 'mm', range: [5, 16] } },
        segmentation: { tendency: 'SLIGHT' },
        builtUpEdge: { tendency: 'MODERATE', temperatureRange: { low: 235, high: 395, unit: '°C' }, speedToAvoid: { min: 30, max: 100, unit: 'm/min' }, prevention: 'Use higher speeds or coated tools' },
        minimumChipThickness: { hmin: { value: 0.027, unit: 'mm' }, ratio_hmin_re: { value: 0.30 } },
        stagnationPoint: { angle: { value: 60, unit: '°' } },
        breakability: { rating: 'POOR', index: 2.8, description: 'Requires chip breaker' },
        speedTransitions: { segmentedOnset: { value: 320, unit: 'm/min' } },
        temperatureEffects: { softening: 'Begins around 530°C' }
      },
      
      friction: {
        coulombCoefficient: { dry: { value: 0.57, range: [0.47, 0.67] }, withCoolant: { value: 0.37, range: [0.31, 0.43] } },
        stickingFrictionFactor: { value: 0.77 },
        contactLengthRatio: { typical: { value: 2.9 } },
        interfaceTemperature: { at100mpm: { value: 500, unit: '°C' }, at200mpm: { value: 650, unit: '°C' }, at300mpm: { value: 755, unit: '°C' } },
        seizureThreshold: { value: 785, unit: '°C' },
        adhesionTendency: { rating: 'MODERATE', affectedTools: ['uncoated carbide', 'HSS'], prevention: 'Use coated tools' },
        toolMaterialEffects: { carbide: 'Good', coatedCarbide: 'Excellent', ceramic: 'Not needed', hss: 'Fair at low speeds' },
        coolantEffects: { flood: { frictionReduction: '36-44%' }, mql: { frictionReduction: '21-28%' }, dry: { note: 'Acceptable at high speeds' } }
      },
      
      thermalMachining: {
        specificCuttingEnergy: { value: 2.2, unit: 'W·s/mm³', range: [1.9, 2.7] },
        heatPartition: { chip: 70, tool: 14, workpiece: 13, coolant: 3, unit: '%' },
        cuttingTemperatureModel: { empirical: 'T = 380 × V^0.37 × f^0.18 (°C)', validRange: { speed: '70-220 m/min', feed: '0.1-0.4 mm/rev' } },
        thermalSofteningThreshold: { value: 545, unit: '°C' },
        maxCuttingTemperature: { recommended: 680, absolute: 840, unit: '°C' },
        coolantEffectiveness: { flood: { reduction: '34-46%', recommended: true }, mql: { reduction: '19-27%' }, cryogenic: { note: 'Not typically needed' } },
        oxidationThreshold: { value: 400, unit: '°C' },
        phaseTransformations: { Ac1: 727, Ac3: 840, unit: '°C' },
        recrystallizationTemp: { value: 440, unit: '°C' },
        pecletNumber: { typical: 8.8 }
      },
      
      surfaceIntegrity: {
        residualStress: { tendency: 'COMPRESSIVE', magnitude: { value: -170, unit: 'MPa', range: [-280, -75] }, depth: { value: 0.07, unit: 'mm' } },
        workHardening: { tendency: 'MODERATE', surfaceHardnessIncrease: { value: 17, unit: '%' }, depth: { value: 0.13, unit: 'mm' } },
        whiteLayer: { threshold: null, note: 'Not typically formed' },
        achievableRa: {
          turning: { rough: { value: 6.3, unit: 'μm' }, finish: { value: 1.6, unit: 'μm' }, fine: { value: 0.8, unit: 'μm' } },
          milling: { rough: { value: 6.3, unit: 'μm' }, finish: { value: 1.6, unit: 'μm' } },
          grinding: { standard: { value: 0.4, unit: 'μm' }, fine: { value: 0.1, unit: 'μm' } }
        },
        burrFormation: { tendency: 'MODERATE-HIGH', prevention: ['Sharp tools', 'Proper exit angles', 'Support'] },
        microstructuralChanges: { typical: 'Grain deformation', depth: { value: 0.03, unit: 'mm' } },
        subsurfaceDamage: { tendency: 'LOW' },
        parameterEffects: { speed: 'Higher speeds improve finish', feed: 'Lower feed improves Ra', toolNoseRadius: 'Larger radius helps' }
      },
      
      machinability: {
        overallRating: { grade: 'B', percent: 60, baseline: 'AISI B1112 = 100%', description: 'Good machinability' },
        speedFactor: { value: 0.95 }, forceIndex: { value: 0.96 }, toolWearIndex: { value: 0.98 },
        surfaceFinishIndex: { value: 0.86 }, chipControlIndex: { value: 0.68 }, powerFactor: { value: 0.92 },
        difficultyFactors: { chipBreaking: 'Requires chip breaker', burrFormation: 'Moderate tendency', adhesion: 'BUE in mid-speed range' },
        specialConsiderations: ['Good for carburizing', 'Common forging grade', 'Machine before heat treatment']
      },
      
      recommendedParameters: {
        turning: {
          roughing: { speed: { value: 145, unit: 'm/min', range: [110, 195] }, feed: { value: 0.23, unit: 'mm/rev', range: [0.15, 0.36] }, doc: { value: 2.3, unit: 'mm', range: [1.3, 4.0] } },
          finishing: { speed: { value: 190, unit: 'm/min', range: [150, 250] }, feed: { value: 0.09, unit: 'mm/rev', range: [0.05, 0.13] }, doc: { value: 0.35, unit: 'mm', range: [0.15, 0.70] } },
          hsm: { speed: { value: 310, unit: 'm/min', max: 360 } }
        },
        milling: {
          roughing: { speed: { value: 130, unit: 'm/min', range: [100, 175] }, feedPerTooth: { value: 0.10, unit: 'mm', range: [0.07, 0.16] }, axialDoc: { value: 1.0, unit: 'xD' }, radialDoc: { value: 0.5, unit: 'xD' } },
          finishing: { speed: { value: 180, unit: 'm/min', range: [140, 235] }, feedPerTooth: { value: 0.05, unit: 'mm', range: [0.03, 0.08] } }
        },
        drilling: { speed: { value: 25, unit: 'm/min', range: [19, 34] }, feed: { value: 0.18, unit: 'mm/rev', range: [0.10, 0.25] }, peckDepth: { value: 1.5, unit: 'xD' } },
        toolMaterial: { primary: 'Coated carbide', secondary: 'Uncoated carbide', tertiary: 'HSS', ceramic: 'Not recommended' },
        toolGeometry: { rakeAngle: { value: 7, unit: '°', range: [4, 11] }, clearanceAngle: { value: 7, unit: '°' }, noseRadius: { value: 0.8, unit: 'mm' }, chipBreaker: 'Required' },
        insertGrade: { iso: 'P15-P25', manufacturers: { sandvik: ['GC4325', 'GC4315'], kennametal: ['KC5010', 'KC5025'], iscar: ['IC8150', 'IC8250'] } },
        coolant: { type: 'Water-soluble oil', concentration: '6-10%', delivery: 'Flood preferred', alternatives: ['MQL', 'Dry at high speeds'] },
        specialTechniques: ['Use chip breaker', 'Avoid BUE speed range', 'Good for forgings'],
        warnings: ['Chips can be stringy', 'Burr tendency', 'Light feeds cause work hardening'],
        bestPractices: ['Sharp cutting edges', 'Positive rake', 'Adequate chip evacuation']
      },
      
      statisticalData: {
        dataSources: ['Machining Data Handbook', 'ASM Metals Handbook', 'Manufacturer data'],
        sampleSize: { mechanicalTests: 22, machiningTrials: 15 },
        standardDeviation: { Kc11: '±9%', taylorC: '±13%', tensileStrength: '±6%' },
        confidenceInterval: { level: '95%', machiningData: '±11%' },
        rSquaredCorrelation: { taylorEquation: 0.92, kienzleModel: 0.94 },
        batchVariability: { note: 'Low-moderate variability' },
        safetyFactor: { recommended: 1.15 },
        validationStatus: 'VALIDATED'
      }
    },

    //=========================================================================
    // CS-010: AISI 1026 - FULL 127+ PARAMETER EXPANSION
    //=========================================================================
    'CS-010_AISI_1026': {
      id: 'CS-010',
      name: 'AISI 1026',
      alternateNames: ['SAE 1026', 'UNS G10260', '1026 Steel'],
      uns: 'G10260',
      standard: 'ASTM A29/A29M',
      description: 'Low carbon steel for forgings, carburized gears, and structural applications',
      isoGroup: 'P',
      materialType: 'low_carbon_steel',
      criticalRating: '★',
      applications: ['Forgings', 'Carburized gears', 'Shafts', 'Structural parts', 'Machinery components'],
      
      composition: {
        C: { min: 0.22, max: 0.28, typical: 0.26, unit: 'wt%' },
        Mn: { min: 0.60, max: 0.90, typical: 0.75, unit: 'wt%' },
        P: { max: 0.040, unit: 'wt%' }, S: { max: 0.050, unit: 'wt%' },
        Si: { max: 0.10, typical: 0.05, unit: 'wt%' }, Fe: { balance: true }
      },
      
      physicalProperties: {
        density: { value: 7860, unit: 'kg/m³', tolerance: '±0.5%', source: 'ASM' },
        meltingRange: { solidus: 1455, liquidus: 1490, unit: '°C', source: 'ASM' },
        thermalConductivity: { values: [{ temp: 20, k: 49.2 }, { temp: 100, k: 48.5 }, { temp: 200, k: 46.8 }, { temp: 400, k: 41.0 }, { temp: 600, k: 34.0 }], unit: 'W/(m·K)', source: 'ASM' },
        specificHeat: { values: [{ temp: 20, cp: 486 }, { temp: 200, cp: 534 }, { temp: 400, cp: 586 }, { temp: 600, cp: 655 }], unit: 'J/(kg·K)', source: 'ASM' },
        thermalExpansion: { values: [{ tempRange: '20-100', alpha: 11.7 }, { tempRange: '20-200', alpha: 12.8 }, { tempRange: '20-400', alpha: 14.1 }, { tempRange: '20-600', alpha: 14.9 }], unit: '10⁻⁶/K', source: 'ASM' },
        thermalDiffusivity: { value: 12.8, unit: 'mm²/s', at: '20°C' },
        elasticModulus: { value: 207, unit: 'GPa', tolerance: '±3%' },
        shearModulus: { value: 80, unit: 'GPa' },
        poissonsRatio: { value: 0.29 },
        electricalResistivity: { value: 0.190, unit: 'μΩ·m', at: '20°C' },
        hardness: { asRolled: { value: 135, unit: 'HB', range: [123, 148] }, coldDrawn: { value: 167, unit: 'HB', range: [152, 183] }, normalized: { value: 145, unit: 'HB' } }
      },
      
      mechanicalProperties: {
        conditions: {
          'hot_rolled': { tensileStrength: { value: 470, unit: 'MPa', range: [435, 510] }, yieldStrength: { value: 280, unit: 'MPa', range: [255, 310] }, elongation: { value: 23, unit: '%' }, reductionOfArea: { value: 46, unit: '%' }, hardness: { value: 135, unit: 'HB' } },
          'cold_drawn': { tensileStrength: { value: 530, unit: 'MPa', range: [490, 575] }, yieldStrength: { value: 450, unit: 'MPa', range: [410, 495] }, elongation: { value: 13, unit: '%' }, reductionOfArea: { value: 36, unit: '%' }, hardness: { value: 167, unit: 'HB' } },
          'annealed': { tensileStrength: { value: 440, unit: 'MPa' }, yieldStrength: { value: 260, unit: 'MPa' }, elongation: { value: 26, unit: '%' }, hardness: { value: 123, unit: 'HB' } },
          'normalized': { tensileStrength: { value: 490, unit: 'MPa' }, yieldStrength: { value: 295, unit: 'MPa' }, elongation: { value: 24, unit: '%' }, hardness: { value: 145, unit: 'HB' } }
        },
        fatigueStrength: { rotatingBending: { value: 215, unit: 'MPa', cycles: 1e7 }, enduranceRatio: 0.46 },
        impactToughness: { charpy: { value: 70, unit: 'J', temperature: 20 }, izod: { value: 54, unit: 'J', temperature: 20 } },
        fractureToughness: { KIc: { value: 95, unit: 'MPa√m' } }
      },
      
      kienzle: {
        tangential: { Kc11: { value: 1750, unit: 'N/mm²', tolerance: '±10%' }, mc: { value: 0.27, tolerance: '±0.03' } },
        feed: { Kc11: { value: 700, unit: 'N/mm²' }, mc: { value: 0.28 } },
        radial: { Kc11: { value: 525, unit: 'N/mm²' }, mc: { value: 0.27 } },
        corrections: { rakeAngle: { referenceRake: 6, factor: 0.01 }, speed: { referenceSpeed: 100, exponent: 0.1 }, wear: { factor: 0.01 } },
        source: 'Machining Data Handbook', reliability: 'HIGH', confidenceInterval: '95%'
      },
      
      johnsonCook: {
        A: { value: 275, unit: 'MPa' }, B: { value: 555, unit: 'MPa' }, n: { value: 0.25 }, C: { value: 0.027 }, m: { value: 1.04 },
        referenceConditions: { strainRate: { value: 1.0, unit: 's⁻¹' }, temperature: { value: 20, unit: '°C' }, meltingTemp: { value: 1490, unit: '°C' } },
        damageParameters: { D1: 0.09, D2: 3.18, D3: -1.85, D4: 0.004, D5: 0.48 },
        source: 'Literature values', reliability: 'MEDIUM'
      },
      
      taylorToolLife: {
        carbide_uncoated: { C: { value: 255 }, n: { value: 0.19 }, a: { value: 0.54 }, b: { value: 0.14 }, validRange: { speed: [55, 195], feed: [0.1, 0.38], doc: [0.5, 4.0] } },
        carbide_coated: { C: { value: 345 }, n: { value: 0.22 }, coatings: ['TiN', 'TiCN', 'TiAlN'] },
        hss: { C: { value: 55 }, n: { value: 0.105 } },
        cermet: { C: { value: 305 }, n: { value: 0.24 } },
        wearRates: { flankWear: { rate: 0.16, unit: 'mm/min', at: { speed: 135, feed: 0.2 } }, craterWear: { tendency: 'MODERATE' } },
        source: 'Machining Data Handbook', reliability: 'HIGH'
      },
      
      chipFormation: {
        chipType: { primary: 'CONTINUOUS', variants: ['ribbon', 'helical'], description: 'Continuous chips, slightly better breaking than 1025 due to Mn' },
        shearAngle: { typical: { value: 24, unit: '°', range: [19, 29] }, speedEffect: 'Increases with speed' },
        compressionRatio: { typical: { value: 2.7, range: [2.3, 3.3] } },
        curlRadius: { natural: { value: 7.8, unit: 'mm', range: [5, 17] } },
        segmentation: { tendency: 'SLIGHT' },
        builtUpEdge: { tendency: 'MODERATE', temperatureRange: { low: 240, high: 400, unit: '°C' }, speedToAvoid: { min: 32, max: 105, unit: 'm/min' }, prevention: 'Use higher speeds or coated tools' },
        minimumChipThickness: { hmin: { value: 0.028, unit: 'mm' }, ratio_hmin_re: { value: 0.31 } },
        stagnationPoint: { angle: { value: 59, unit: '°' } },
        breakability: { rating: 'POOR-FAIR', index: 3.2, description: 'Slightly better than 1025 due to Mn' },
        speedTransitions: { segmentedOnset: { value: 310, unit: 'm/min' } },
        temperatureEffects: { softening: 'Begins around 520°C' }
      },
      
      friction: {
        coulombCoefficient: { dry: { value: 0.58, range: [0.48, 0.68] }, withCoolant: { value: 0.38, range: [0.32, 0.44] } },
        stickingFrictionFactor: { value: 0.78 },
        contactLengthRatio: { typical: { value: 3.0 } },
        interfaceTemperature: { at100mpm: { value: 515, unit: '°C' }, at200mpm: { value: 665, unit: '°C' }, at300mpm: { value: 770, unit: '°C' } },
        seizureThreshold: { value: 790, unit: '°C' },
        adhesionTendency: { rating: 'MODERATE', affectedTools: ['uncoated carbide', 'HSS'], prevention: 'Use coated tools' },
        toolMaterialEffects: { carbide: 'Good', coatedCarbide: 'Excellent', ceramic: 'Not needed', hss: 'Fair at low speeds' },
        coolantEffects: { flood: { frictionReduction: '36-45%' }, mql: { frictionReduction: '21-29%' }, dry: { note: 'Acceptable at high speeds' } }
      },
      
      thermalMachining: {
        specificCuttingEnergy: { value: 2.3, unit: 'W·s/mm³', range: [2.0, 2.8] },
        heatPartition: { chip: 69, tool: 15, workpiece: 13, coolant: 3, unit: '%' },
        cuttingTemperatureModel: { empirical: 'T = 390 × V^0.36 × f^0.18 (°C)', validRange: { speed: '65-200 m/min', feed: '0.1-0.4 mm/rev' } },
        thermalSofteningThreshold: { value: 535, unit: '°C' },
        maxCuttingTemperature: { recommended: 670, absolute: 830, unit: '°C' },
        coolantEffectiveness: { flood: { reduction: '35-47%', recommended: true }, mql: { reduction: '20-28%' }, cryogenic: { note: 'Not typically needed' } },
        oxidationThreshold: { value: 400, unit: '°C' },
        phaseTransformations: { Ac1: 727, Ac3: 835, unit: '°C' },
        recrystallizationTemp: { value: 435, unit: '°C' },
        pecletNumber: { typical: 8.5 }
      },
      
      surfaceIntegrity: {
        residualStress: { tendency: 'COMPRESSIVE', magnitude: { value: -180, unit: 'MPa', range: [-290, -80] }, depth: { value: 0.075, unit: 'mm' } },
        workHardening: { tendency: 'MODERATE-HIGH', surfaceHardnessIncrease: { value: 19, unit: '%' }, depth: { value: 0.14, unit: 'mm' }, note: 'Higher Mn increases work hardening' },
        whiteLayer: { threshold: null, note: 'Not typically formed' },
        achievableRa: {
          turning: { rough: { value: 6.3, unit: 'μm' }, finish: { value: 1.6, unit: 'μm' }, fine: { value: 0.8, unit: 'μm' } },
          milling: { rough: { value: 6.3, unit: 'μm' }, finish: { value: 1.6, unit: 'μm' } },
          grinding: { standard: { value: 0.4, unit: 'μm' }, fine: { value: 0.1, unit: 'μm' } }
        },
        burrFormation: { tendency: 'MODERATE', prevention: ['Sharp tools', 'Proper exit angles', 'Support'] },
        microstructuralChanges: { typical: 'Grain deformation', depth: { value: 0.035, unit: 'mm' } },
        subsurfaceDamage: { tendency: 'LOW' },
        parameterEffects: { speed: 'Higher speeds improve finish', feed: 'Lower feed improves Ra', toolNoseRadius: 'Larger radius helps' }
      },
      
      machinability: {
        overallRating: { grade: 'B', percent: 58, baseline: 'AISI B1112 = 100%', description: 'Good machinability' },
        speedFactor: { value: 0.92 }, forceIndex: { value: 0.98 }, toolWearIndex: { value: 1.00 },
        surfaceFinishIndex: { value: 0.85 }, chipControlIndex: { value: 0.70 }, powerFactor: { value: 0.95 },
        difficultyFactors: { chipBreaking: 'Requires chip breaker', burrFormation: 'Moderate tendency', adhesion: 'BUE in mid-speed range' },
        specialConsiderations: ['Good for carburizing', 'Higher Mn improves strength', 'Slightly more abrasive']
      },
      
      recommendedParameters: {
        turning: {
          roughing: { speed: { value: 140, unit: 'm/min', range: [105, 185] }, feed: { value: 0.22, unit: 'mm/rev', range: [0.14, 0.35] }, doc: { value: 2.2, unit: 'mm', range: [1.2, 3.8] } },
          finishing: { speed: { value: 180, unit: 'm/min', range: [140, 240] }, feed: { value: 0.08, unit: 'mm/rev', range: [0.05, 0.12] }, doc: { value: 0.32, unit: 'mm', range: [0.14, 0.65] } },
          hsm: { speed: { value: 295, unit: 'm/min', max: 345 } }
        },
        milling: {
          roughing: { speed: { value: 125, unit: 'm/min', range: [95, 165] }, feedPerTooth: { value: 0.10, unit: 'mm', range: [0.06, 0.15] }, axialDoc: { value: 1.0, unit: 'xD' }, radialDoc: { value: 0.5, unit: 'xD' } },
          finishing: { speed: { value: 170, unit: 'm/min', range: [130, 225] }, feedPerTooth: { value: 0.05, unit: 'mm', range: [0.03, 0.08] } }
        },
        drilling: { speed: { value: 24, unit: 'm/min', range: [18, 32] }, feed: { value: 0.17, unit: 'mm/rev', range: [0.10, 0.24] }, peckDepth: { value: 1.5, unit: 'xD' } },
        toolMaterial: { primary: 'Coated carbide', secondary: 'Uncoated carbide', tertiary: 'HSS', ceramic: 'Not recommended' },
        toolGeometry: { rakeAngle: { value: 6, unit: '°', range: [3, 10] }, clearanceAngle: { value: 7, unit: '°' }, noseRadius: { value: 0.8, unit: 'mm' }, chipBreaker: 'Required' },
        insertGrade: { iso: 'P15-P25', manufacturers: { sandvik: ['GC4325', 'GC4315'], kennametal: ['KC5010', 'KC5025'], iscar: ['IC8150', 'IC8250'] } },
        coolant: { type: 'Water-soluble oil', concentration: '6-10%', delivery: 'Flood preferred', alternatives: ['MQL', 'Dry at high speeds'] },
        specialTechniques: ['Use chip breaker', 'Avoid BUE speed range', 'Good for carburized gears'],
        warnings: ['Chips can be stringy', 'Higher Mn increases work hardening', 'Burr tendency'],
        bestPractices: ['Sharp cutting edges', 'Positive rake', 'Adequate chip evacuation']
      },
      
      statisticalData: {
        dataSources: ['Machining Data Handbook', 'ASM Metals Handbook', 'Manufacturer data'],
        sampleSize: { mechanicalTests: 20, machiningTrials: 13 },
        standardDeviation: { Kc11: '±10%', taylorC: '±14%', tensileStrength: '±7%' },
        confidenceInterval: { level: '95%', machiningData: '±12%' },
        rSquaredCorrelation: { taylorEquation: 0.91, kienzleModel: 0.93 },
        batchVariability: { note: 'Moderate variability' },
        safetyFactor: { recommended: 1.16 },
        validationStatus: 'VALIDATED'
      }
    },
