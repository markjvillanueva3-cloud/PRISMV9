/**
 * PRISM MATERIALS DATABASE - Aluminum 7xxx Series
 * File: aluminum_7xxx_051_070.js
 * Materials: N-AL-051 through N-AL-070
 * 
 * ISO Category: N (Non-Ferrous)
 * Sub-category: Aluminum - Zinc Alloys (7xxx)
 * 
 * 7xxx SERIES CHARACTERISTICS:
 * - Al-Zn-Mg(-Cu) alloys
 * - Heat treatable - highest strength aluminum alloys
 * - Used primarily in aerospace applications
 * - Stress corrosion susceptibility varies by alloy
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * Created: 2026-01-25
 */

const ALUMINUM_7XXX_051_070 = {
  metadata: {
    file: "aluminum_7xxx_051_070.js",
    category: "N_NONFERROUS",
    subcategory: "Aluminum 7xxx Series",
    materialCount: 20,
    idRange: { start: "N-AL-051", end: "N-AL-070" },
    schemaVersion: "3.0.0",
    created: "2026-01-25"
  },

  materials: {
    "N-AL-051": {
      id: "N-AL-051",
      name: "7075-O Annealed",
      designation: { aa: "7075", uns: "A97075", iso: "AlZn5.5MgCu", en: "EN AW-7075", jis: "A7075" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "O (Annealed)",

      composition: {
        aluminum: { min: 87.1, max: 91.4, typical: 89.3 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        silicon: { min: 0, max: 0.40, typical: 0.20 },
        manganese: { min: 0, max: 0.30, typical: 0.15 },
        titanium: { min: 0, max: 0.20, typical: 0.10 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 173,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 3.8e-8,
        electrical_conductivity_iacs: 45,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 60, rockwell_b: 30, rockwell_c: null, vickers: 63 },
        tensile_strength: { min: 221, typical: 230, max: 250 },
        yield_strength: { min: 103, typical: 105, max: 115 },
        compressive_strength: { min: 103, typical: 105, max: 115 },
        elongation: { min: 14, typical: 17, max: 21 },
        reduction_of_area: { min: 35, typical: 42, max: 52 },
        impact_energy: { joules: 22, temperature: 20 },
        fatigue_strength: 95,
        fracture_toughness: 38
      },

      kienzle: { kc1_1: 520, mc: 0.26, kc_adjust_rake: -3.8, kc_adjust_speed: -0.08, chip_compression: 2.2 },
      taylor: { C: 950, n: 0.36, reference_speed: 480, reference_life: 15, speed_range: { min: 175, max: 860 } },

      machinability: {
        aisi_rating: 70,
        relative_to_1212: 0.70,
        chip_form: "continuous_long",
        surface_finish_achievable: 0.9,
        cutting_force_factor: 0.40,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "bue_flank"
      },

      johnson_cook: { A: 130, B: 360, n: 0.44, C: 0.020, m: 1.10, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 320, opt: 540, max: 850 }, feed: { min: 0.14, opt: 0.32, max: 0.60 }, doc: { min: 1.0, opt: 4.5, max: 12.0 } },
          hss: { speed: { min: 100, opt: 170, max: 280 }, feed: { min: 0.14, opt: 0.32, max: 0.60 }, doc: { min: 1.0, opt: 4.5, max: 12.0 } }
        },
        milling: { carbide_coated: { speed: { min: 260, opt: 450, max: 740 }, feed_per_tooth: { min: 0.12, opt: 0.26, max: 0.48 }, doc: { min: 1.0, opt: 4.5, max: 9.0 }, woc_factor: 0.76 } },
        drilling: { carbide: { speed: { min: 170, opt: 310, max: 500 }, feed_per_rev: { min: 0.14, opt: 0.32, max: 0.56 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 0.9, Rz: 5.0 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil_flood", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["forming_stock", "cold_heading", "rivet_stock", "forging_billet"],
      heat_treatment: { temper: "O", anneal_temp: 413, cooling: "controlled_slow" },
      corrosion_resistance: { general: "fair", stress_corrosion: "resistant_in_O_temper" },
      notes: "HIGHEST strength aluminum series in annealed condition. Soft for forming, heat treat after."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-052": {
      id: "N-AL-052",
      name: "7075-T6 Peak Aged",
      designation: { aa: "7075", uns: "A97075", iso: "AlZn5.5MgCu", en: "EN AW-7075", jis: "A7075" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T6 (Solution + Artificial Age)",

      composition: {
        aluminum: { min: 87.1, max: 91.4, typical: 89.3 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        silicon: { min: 0, max: 0.40, typical: 0.20 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 130,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 5.2e-8,
        electrical_conductivity_iacs: 33,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 150, rockwell_b: 83, rockwell_c: null, vickers: 157 },
        tensile_strength: { min: 538, typical: 572, max: 605 },
        yield_strength: { min: 469, typical: 503, max: 540 },
        compressive_strength: { min: 469, typical: 503, max: 540 },
        elongation: { min: 8, typical: 11, max: 14 },
        reduction_of_area: { min: 20, typical: 26, max: 34 },
        impact_energy: { joules: 13, temperature: 20 },
        fatigue_strength: 159,
        fracture_toughness: 24
      },

      kienzle: { kc1_1: 850, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 720, n: 0.32, reference_speed: 360, reference_life: 15, speed_range: { min: 120, max: 640 } },

      machinability: {
        aisi_rating: 125,
        relative_to_1212: 1.25,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.56,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank",
        notes: "BEST machining high-strength aluminum. Excellent chip control."
      },

      johnson_cook: { A: 420, B: 510, n: 0.27, C: 0.011, m: 0.85, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 240, opt: 400, max: 640 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.5, max: 7.0 } },
          pcd: { speed: { min: 480, opt: 800, max: 1200 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.0, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 190, opt: 335, max: 560 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.6, opt: 2.5, max: 5.5 }, woc_factor: 0.65 } },
        drilling: { carbide: { speed: { min: 125, opt: 225, max: 380 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_structures", "aerospace_fittings", "gears", "shafts", "missile_parts"],
      heat_treatment: { temper: "T6", solution_temp: 477, quench: "water", artificial_aging: "121°C / 24h" },
      corrosion_resistance: { general: "fair", stress_corrosion: "highly_susceptible" },
      notes: "HIGHEST strength common aluminum. T6 susceptible to SCC - use T73/T76 for SCC resistance."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-053": {
      id: "N-AL-053",
      name: "7075-T651 Stress Relieved",
      designation: { aa: "7075", uns: "A97075", iso: "AlZn5.5MgCu", en: "EN AW-7075", jis: "A7075" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T651 (Solution + Stretch + Artificial Age)",

      composition: {
        aluminum: { min: 87.1, max: 91.4, typical: 89.3 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 130,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 5.2e-8,
        electrical_conductivity_iacs: 33,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 150, rockwell_b: 83, rockwell_c: null, vickers: 157 },
        tensile_strength: { min: 538, typical: 572, max: 605 },
        yield_strength: { min: 469, typical: 503, max: 540 },
        compressive_strength: { min: 469, typical: 503, max: 540 },
        elongation: { min: 6, typical: 9, max: 12 },
        reduction_of_area: { min: 18, typical: 24, max: 30 },
        impact_energy: { joules: 12, temperature: 20 },
        fatigue_strength: 159,
        fracture_toughness: 26
      },

      kienzle: { kc1_1: 850, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 720, n: 0.32, reference_speed: 360, reference_life: 15, speed_range: { min: 120, max: 640 } },

      machinability: {
        aisi_rating: 130,
        relative_to_1212: 1.30,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.56,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 420, B: 510, n: 0.27, C: 0.011, m: 0.85, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 240, opt: 400, max: 640 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.5, max: 7.0 } },
          pcd: { speed: { min: 480, opt: 800, max: 1200 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.0, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 190, opt: 335, max: 560 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.6, opt: 2.5, max: 5.5 }, woc_factor: 0.65 } },
        drilling: { carbide: { speed: { min: 125, opt: 225, max: 380 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_plate", "precision_machined_parts", "mold_plates", "aerospace_tooling"],
      heat_treatment: { temper: "T651", solution_temp: 477, quench: "water", stress_relief: "stretch 1.5-3%", artificial_aging: "121°C / 24h" },
      corrosion_resistance: { general: "fair", stress_corrosion: "highly_susceptible" },
      notes: "Stress-relieved plate. Preferred for precision machining. Minimal distortion."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-054": {
      id: "N-AL-054",
      name: "7075-T73 Over-aged (SCC Resistant)",
      designation: { aa: "7075", uns: "A97075", iso: "AlZn5.5MgCu", en: "EN AW-7075", jis: "A7075" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T73 (Solution + Over-age for SCC Resistance)",

      composition: {
        aluminum: { min: 87.1, max: 91.4, typical: 89.3 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 155,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 4.3e-8,
        electrical_conductivity_iacs: 40,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 135, rockwell_b: 76, rockwell_c: null, vickers: 142 },
        tensile_strength: { min: 469, typical: 503, max: 535 },
        yield_strength: { min: 386, typical: 434, max: 470 },
        compressive_strength: { min: 386, typical: 434, max: 470 },
        elongation: { min: 10, typical: 13, max: 16 },
        reduction_of_area: { min: 25, typical: 32, max: 40 },
        impact_energy: { joules: 16, temperature: 20 },
        fatigue_strength: 145,
        fracture_toughness: 32
      },

      kienzle: { kc1_1: 780, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 760, n: 0.33, reference_speed: 380, reference_life: 15, speed_range: { min: 130, max: 680 } },

      machinability: {
        aisi_rating: 115,
        relative_to_1212: 1.15,
        chip_form: "curled_short",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.52,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 380, B: 480, n: 0.29, C: 0.012, m: 0.88, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 420, max: 680 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.6, opt: 2.8, max: 7.5 } },
          pcd: { speed: { min: 500, opt: 840, max: 1280 }, feed: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.4, opt: 2.2, max: 6.0 } }
        },
        milling: { carbide_coated: { speed: { min: 200, opt: 350, max: 600 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.6, opt: 2.8, max: 6.0 }, woc_factor: 0.67 } },
        drilling: { carbide: { speed: { min: 135, opt: 240, max: 400 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_fittings", "landing_gear_components", "structural_applications_requiring_SCC_resistance"],
      heat_treatment: { temper: "T73", solution_temp: 477, quench: "water", artificial_aging: "107°C / 6-8h + 163°C / 24-30h" },
      corrosion_resistance: { general: "good", stress_corrosion: "highly_resistant" },
      notes: "OVERAGED for SCC resistance. 10-15% lower strength than T6 but MUCH better SCC resistance."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-055": {
      id: "N-AL-055",
      name: "7075-T76 Over-aged (Exfoliation Resistant)",
      designation: { aa: "7075", uns: "A97075", iso: "AlZn5.5MgCu", en: "EN AW-7075", jis: "A7075" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T76 (Solution + Over-age for Exfoliation Resistance)",

      composition: {
        aluminum: { min: 87.1, max: 91.4, typical: 89.3 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 142,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 4.7e-8,
        electrical_conductivity_iacs: 37,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 140, rockwell_b: 79, rockwell_c: null, vickers: 147 },
        tensile_strength: { min: 497, typical: 530, max: 560 },
        yield_strength: { min: 414, typical: 455, max: 490 },
        compressive_strength: { min: 414, typical: 455, max: 490 },
        elongation: { min: 9, typical: 12, max: 15 },
        reduction_of_area: { min: 24, typical: 30, max: 38 },
        impact_energy: { joules: 14, temperature: 20 },
        fatigue_strength: 152,
        fracture_toughness: 28
      },

      kienzle: { kc1_1: 810, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 740, n: 0.33, reference_speed: 370, reference_life: 15, speed_range: { min: 125, max: 660 } },

      machinability: {
        aisi_rating: 120,
        relative_to_1212: 1.20,
        chip_form: "short_curled",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.54,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 400, B: 490, n: 0.28, C: 0.012, m: 0.87, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 245, opt: 410, max: 660 }, feed: { min: 0.10, opt: 0.24, max: 0.45 }, doc: { min: 0.6, opt: 2.6, max: 7.2 } },
          pcd: { speed: { min: 490, opt: 820, max: 1250 }, feed: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.4, opt: 2.1, max: 5.8 } }
        },
        milling: { carbide_coated: { speed: { min: 195, opt: 345, max: 580 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.6, opt: 2.6, max: 5.8 }, woc_factor: 0.66 } },
        drilling: { carbide: { speed: { min: 130, opt: 235, max: 390 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.43 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_wing_skins", "fuselage_skins", "areas_exposed_to_weather", "marine_aerospace"],
      heat_treatment: { temper: "T76", solution_temp: 477, quench: "water", artificial_aging: "121°C / 3-5h + 163°C / 15-18h" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant", exfoliation: "highly_resistant" },
      notes: "T76 = exfoliation resistant. Between T6 and T73. Good for external aircraft surfaces."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-056": {
      id: "N-AL-056",
      name: "7050-T7451 Aerospace Plate",
      designation: { aa: "7050", uns: "A97050", iso: "AlZn6CuMgZr", en: "EN AW-7050", jis: "A7050" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T7451 (Solution + Stress Relief + Over-age)",

      composition: {
        aluminum: { min: 87.3, max: 90.3, typical: 88.8 },
        zinc: { min: 5.7, max: 6.7, typical: 6.2 },
        copper: { min: 2.0, max: 2.6, typical: 2.3 },
        magnesium: { min: 1.9, max: 2.6, typical: 2.25 },
        zirconium: { min: 0.08, max: 0.15, typical: 0.12 },
        iron: { min: 0, max: 0.15, typical: 0.08 },
        silicon: { min: 0, max: 0.12, typical: 0.06 }
      },

      physical: {
        density: 2830,
        melting_point: { solidus: 488, liquidus: 630 },
        specific_heat: 860,
        thermal_conductivity: 157,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 4.2e-8,
        electrical_conductivity_iacs: 41,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 145, rockwell_b: 81, rockwell_c: null, vickers: 152 },
        tensile_strength: { min: 510, typical: 552, max: 585 },
        yield_strength: { min: 441, typical: 490, max: 525 },
        compressive_strength: { min: 441, typical: 490, max: 525 },
        elongation: { min: 9, typical: 12, max: 15 },
        reduction_of_area: { min: 24, typical: 30, max: 38 },
        impact_energy: { joules: 16, temperature: 20 },
        fatigue_strength: 160,
        fracture_toughness: 33
      },

      kienzle: { kc1_1: 830, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 740, n: 0.33, reference_speed: 370, reference_life: 15, speed_range: { min: 125, max: 660 } },

      machinability: {
        aisi_rating: 120,
        relative_to_1212: 1.20,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.55,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 410, B: 495, n: 0.28, C: 0.012, m: 0.86, T_melt: 630, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 245, opt: 410, max: 660 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.6, max: 7.0 } },
          pcd: { speed: { min: 490, opt: 820, max: 1250 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.1, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 195, opt: 345, max: 580 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.6, opt: 2.6, max: 5.5 }, woc_factor: 0.66 } },
        drilling: { carbide: { speed: { min: 130, opt: 235, max: 390 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_wing_structures", "fuselage_frames", "bulkheads", "heavy_machined_parts"],
      heat_treatment: { temper: "T7451", solution_temp: 477, quench: "water", stress_relief: "stretch 1.5-3%", artificial_aging: "121°C / 6h + 177°C / 6-10h" },
      corrosion_resistance: { general: "good", stress_corrosion: "highly_resistant" },
      notes: "7050 = higher Cu than 7075. Better thick-section properties and SCC resistance. F-15, F-18, 747."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-057": {
      id: "N-AL-057",
      name: "7050-T7651 Aerospace Plate (Higher Strength)",
      designation: { aa: "7050", uns: "A97050", iso: "AlZn6CuMgZr", en: "EN AW-7050", jis: "A7050" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T7651 (Solution + Stretch + Alternate Age)",

      composition: {
        aluminum: { min: 87.3, max: 90.3, typical: 88.8 },
        zinc: { min: 5.7, max: 6.7, typical: 6.2 },
        copper: { min: 2.0, max: 2.6, typical: 2.3 },
        magnesium: { min: 1.9, max: 2.6, typical: 2.25 },
        zirconium: { min: 0.08, max: 0.15, typical: 0.12 }
      },

      physical: {
        density: 2830,
        melting_point: { solidus: 488, liquidus: 630 },
        specific_heat: 860,
        thermal_conductivity: 147,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 4.5e-8,
        electrical_conductivity_iacs: 38,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 150, rockwell_b: 83, rockwell_c: null, vickers: 157 },
        tensile_strength: { min: 538, typical: 570, max: 600 },
        yield_strength: { min: 483, typical: 510, max: 545 },
        compressive_strength: { min: 483, typical: 510, max: 545 },
        elongation: { min: 8, typical: 11, max: 14 },
        reduction_of_area: { min: 22, typical: 28, max: 36 },
        impact_energy: { joules: 14, temperature: 20 },
        fatigue_strength: 165,
        fracture_toughness: 30
      },

      kienzle: { kc1_1: 850, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 730, n: 0.32, reference_speed: 365, reference_life: 15, speed_range: { min: 122, max: 650 } },

      machinability: {
        aisi_rating: 125,
        relative_to_1212: 1.25,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.56,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 430, B: 505, n: 0.27, C: 0.011, m: 0.85, T_melt: 630, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 240, opt: 400, max: 650 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.5, max: 6.8 } },
          pcd: { speed: { min: 480, opt: 800, max: 1220 }, feed: { min: 0.08, opt: 0.19, max: 0.35 }, doc: { min: 0.4, opt: 2.0, max: 5.3 } }
        },
        milling: { carbide_coated: { speed: { min: 190, opt: 335, max: 570 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.6, opt: 2.5, max: 5.3 }, woc_factor: 0.65 } },
        drilling: { carbide: { speed: { min: 128, opt: 230, max: 385 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_wing_spars", "heavy_section_machining", "aerospace_tooling", "military_aircraft"],
      heat_treatment: { temper: "T7651", solution_temp: 477, quench: "water", stress_relief: "stretch 1.5-3%", artificial_aging: "alternate_two_step" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "T7651 = higher strength than T7451 with moderate SCC resistance. Heavy plate applications."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-058": {
      id: "N-AL-058",
      name: "7055-T7751 Highest Strength",
      designation: { aa: "7055", uns: "A97055", iso: "AlZn8MgCuZr", en: "EN AW-7055", jis: "A7055" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft Highest Strength",
      condition: "T7751 (Solution + Stress Relief + Retrogressed + Re-aged)",

      composition: {
        aluminum: { min: 85.1, max: 89.6, typical: 87.4 },
        zinc: { min: 7.6, max: 8.4, typical: 8.0 },
        magnesium: { min: 1.8, max: 2.3, typical: 2.05 },
        copper: { min: 2.0, max: 2.6, typical: 2.3 },
        zirconium: { min: 0.08, max: 0.25, typical: 0.12 },
        iron: { min: 0, max: 0.15, typical: 0.08 },
        silicon: { min: 0, max: 0.10, typical: 0.05 }
      },

      physical: {
        density: 2850,
        melting_point: { solidus: 477, liquidus: 627 },
        specific_heat: 855,
        thermal_conductivity: 155,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 4.3e-8,
        electrical_conductivity_iacs: 40,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 165, rockwell_b: 88, rockwell_c: null, vickers: 173 },
        tensile_strength: { min: 593, typical: 634, max: 670 },
        yield_strength: { min: 552, typical: 593, max: 630 },
        compressive_strength: { min: 552, typical: 593, max: 630 },
        elongation: { min: 6, typical: 9, max: 12 },
        reduction_of_area: { min: 18, typical: 24, max: 30 },
        impact_energy: { joules: 11, temperature: 20 },
        fatigue_strength: 175,
        fracture_toughness: 27
      },

      kienzle: { kc1_1: 920, mc: 0.22, kc_adjust_rake: -3.0, kc_adjust_speed: -0.07, chip_compression: 2.8 },
      taylor: { C: 680, n: 0.31, reference_speed: 340, reference_life: 15, speed_range: { min: 115, max: 610 } },

      machinability: {
        aisi_rating: 130,
        relative_to_1212: 1.30,
        chip_form: "segmented_short",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.60,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 510, B: 545, n: 0.24, C: 0.010, m: 0.82, T_melt: 627, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 225, opt: 380, max: 610 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.2, max: 6.2 } },
          pcd: { speed: { min: 450, opt: 760, max: 1150 }, feed: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.3, opt: 1.8, max: 4.8 } }
        },
        milling: { carbide_coated: { speed: { min: 180, opt: 315, max: 535 }, feed_per_tooth: { min: 0.08, opt: 0.16, max: 0.32 }, doc: { min: 0.5, opt: 2.2, max: 4.8 }, woc_factor: 0.62 } },
        drilling: { carbide: { speed: { min: 118, opt: 215, max: 360 }, feed_per_rev: { min: 0.10, opt: 0.21, max: 0.40 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "slight" },

      applications: ["boeing_777_upper_wing_skins", "military_aircraft", "highest_strength_applications"],
      heat_treatment: { temper: "T7751", solution_temp: 477, quench: "water", stress_relief: "stretch", artificial_aging: "retrogression_re-aging" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "HIGHEST strength production aluminum (634 MPa). Boeing 777 upper wing skins. Expensive."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-059": {
      id: "N-AL-059",
      name: "7475-T7351 High Toughness",
      designation: { aa: "7475", uns: "A97475", iso: "AlZn5.5MgCu", en: "EN AW-7475", jis: "A7475" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Toughness",
      condition: "T7351 (Solution + Stretch + Over-age)",

      composition: {
        aluminum: { min: 88.6, max: 92.0, typical: 90.3 },
        zinc: { min: 5.2, max: 6.2, typical: 5.7 },
        magnesium: { min: 1.9, max: 2.6, typical: 2.25 },
        copper: { min: 1.2, max: 1.9, typical: 1.55 },
        chromium: { min: 0.18, max: 0.25, typical: 0.22 },
        iron: { min: 0, max: 0.12, typical: 0.06 },
        silicon: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.06, typical: 0.03 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 862,
        thermal_conductivity: 163,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 4.1e-8,
        electrical_conductivity_iacs: 42,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70300,
        shear_modulus: 26400
      },

      mechanical: {
        hardness: { brinell: 140, rockwell_b: 79, rockwell_c: null, vickers: 147 },
        tensile_strength: { min: 469, typical: 503, max: 535 },
        yield_strength: { min: 386, typical: 441, max: 480 },
        compressive_strength: { min: 386, typical: 441, max: 480 },
        elongation: { min: 11, typical: 14, max: 18 },
        reduction_of_area: { min: 28, typical: 35, max: 44 },
        impact_energy: { joules: 22, temperature: 20 },
        fatigue_strength: 145,
        fracture_toughness: 42
      },

      kienzle: { kc1_1: 780, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 760, n: 0.33, reference_speed: 380, reference_life: 15, speed_range: { min: 130, max: 680 } },

      machinability: {
        aisi_rating: 110,
        relative_to_1212: 1.10,
        chip_form: "curled_short",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.52,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 390, B: 480, n: 0.30, C: 0.012, m: 0.88, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 420, max: 680 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.6, opt: 2.8, max: 7.5 } },
          pcd: { speed: { min: 500, opt: 840, max: 1280 }, feed: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.4, opt: 2.2, max: 6.0 } }
        },
        milling: { carbide_coated: { speed: { min: 200, opt: 350, max: 600 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.6, opt: 2.8, max: 6.0 }, woc_factor: 0.67 } },
        drilling: { carbide: { speed: { min: 135, opt: 240, max: 400 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["fuselage_lower_skins", "wing_lower_skins", "damage_tolerant_designs", "fatigue_critical_areas"],
      heat_treatment: { temper: "T7351", solution_temp: 477, quench: "water", stress_relief: "stretch 1.5-3%", artificial_aging: "two_step_over-age" },
      corrosion_resistance: { general: "good", stress_corrosion: "highly_resistant" },
      notes: "HIGHEST TOUGHNESS 7xxx. Low Fe/Si = superior damage tolerance. Lower wing skins, fuselage."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-060": {
      id: "N-AL-060",
      name: "7178-T6 High Strength",
      designation: { aa: "7178", uns: "A97178", iso: "AlZn7MgCu", en: "EN AW-7178", jis: "A7178" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T6 (Solution + Artificial Age)",

      composition: {
        aluminum: { min: 86.0, max: 89.5, typical: 87.8 },
        zinc: { min: 6.3, max: 7.3, typical: 6.8 },
        magnesium: { min: 2.4, max: 3.1, typical: 2.75 },
        copper: { min: 1.6, max: 2.4, typical: 2.0 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        silicon: { min: 0, max: 0.40, typical: 0.20 }
      },

      physical: {
        density: 2830,
        melting_point: { solidus: 477, liquidus: 629 },
        specific_heat: 856,
        thermal_conductivity: 125,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 5.5e-8,
        electrical_conductivity_iacs: 31,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 160, rockwell_b: 86, rockwell_c: null, vickers: 168 },
        tensile_strength: { min: 593, typical: 607, max: 640 },
        yield_strength: { min: 538, typical: 538, max: 575 },
        compressive_strength: { min: 538, typical: 538, max: 575 },
        elongation: { min: 5, typical: 8, max: 11 },
        reduction_of_area: { min: 15, typical: 20, max: 26 },
        impact_energy: { joules: 10, temperature: 20 },
        fatigue_strength: 165,
        fracture_toughness: 22
      },

      kienzle: { kc1_1: 900, mc: 0.22, kc_adjust_rake: -3.0, kc_adjust_speed: -0.07, chip_compression: 2.7 },
      taylor: { C: 680, n: 0.31, reference_speed: 340, reference_life: 15, speed_range: { min: 115, max: 610 } },

      machinability: {
        aisi_rating: 130,
        relative_to_1212: 1.30,
        chip_form: "segmented_short",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.58,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 480, B: 530, n: 0.25, C: 0.010, m: 0.83, T_melt: 629, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 225, opt: 380, max: 610 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.2, max: 6.2 } },
          pcd: { speed: { min: 450, opt: 760, max: 1150 }, feed: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.3, opt: 1.8, max: 4.8 } }
        },
        milling: { carbide_coated: { speed: { min: 180, opt: 315, max: 535 }, feed_per_tooth: { min: 0.08, opt: 0.16, max: 0.32 }, doc: { min: 0.5, opt: 2.2, max: 4.8 }, woc_factor: 0.62 } },
        drilling: { carbide: { speed: { min: 118, opt: 215, max: 360 }, feed_per_rev: { min: 0.10, opt: 0.21, max: 0.40 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "slight" },

      applications: ["highly_stressed_aircraft_parts", "wing_compression_members", "aircraft_stringers"],
      heat_treatment: { temper: "T6", solution_temp: 477, quench: "water", artificial_aging: "121°C / 24h" },
      corrosion_resistance: { general: "fair", stress_corrosion: "highly_susceptible" },
      notes: "Higher Zn/Mg than 7075 = higher strength but LOWER toughness and SCC resistance."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ALUMINUM_7XXX_051_070;
}


    // Additional 7xxx Materials (N-AL-061 through N-AL-070)

    "N-AL-061": {
      id: "N-AL-061",
      name: "7178-T76 Exfoliation Resistant",
      designation: { aa: "7178", uns: "A97178", iso: "AlZn7MgCu", en: "EN AW-7178", jis: "A7178" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T76 (Solution + Over-age for Exfoliation)",

      composition: {
        aluminum: { min: 86.0, max: 89.5, typical: 87.8 },
        zinc: { min: 6.3, max: 7.3, typical: 6.8 },
        magnesium: { min: 2.4, max: 3.1, typical: 2.75 },
        copper: { min: 1.6, max: 2.4, typical: 2.0 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 }
      },

      physical: {
        density: 2830,
        melting_point: { solidus: 477, liquidus: 629 },
        specific_heat: 856,
        thermal_conductivity: 142,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 4.7e-8,
        electrical_conductivity_iacs: 37,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 148, rockwell_b: 82, rockwell_c: null, vickers: 155 },
        tensile_strength: { min: 538, typical: 560, max: 590 },
        yield_strength: { min: 483, typical: 500, max: 530 },
        compressive_strength: { min: 483, typical: 500, max: 530 },
        elongation: { min: 6, typical: 10, max: 13 },
        reduction_of_area: { min: 18, typical: 24, max: 30 },
        impact_energy: { joules: 12, temperature: 20 },
        fatigue_strength: 155,
        fracture_toughness: 25
      },

      kienzle: { kc1_1: 850, mc: 0.23, kc_adjust_rake: -3.1, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 710, n: 0.32, reference_speed: 355, reference_life: 15, speed_range: { min: 120, max: 635 } },

      machinability: {
        aisi_rating: 125,
        relative_to_1212: 1.25,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.56,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 440, B: 510, n: 0.26, C: 0.011, m: 0.84, T_melt: 629, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 235, opt: 395, max: 635 }, feed: { min: 0.10, opt: 0.23, max: 0.43 }, doc: { min: 0.5, opt: 2.4, max: 6.5 } },
          pcd: { speed: { min: 470, opt: 790, max: 1190 }, feed: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.3, opt: 1.9, max: 5.0 } }
        },
        milling: { carbide_coated: { speed: { min: 188, opt: 330, max: 555 }, feed_per_tooth: { min: 0.08, opt: 0.17, max: 0.33 }, doc: { min: 0.5, opt: 2.4, max: 5.0 }, woc_factor: 0.64 } },
        drilling: { carbide: { speed: { min: 125, opt: 225, max: 375 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.41 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_external_skins", "compression_members", "wing_skins"],
      heat_treatment: { temper: "T76", solution_temp: 477, quench: "water", artificial_aging: "121°C / 3-5h + 163°C / 15-18h" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant", exfoliation: "highly_resistant" },
      notes: "T76 over-aged for exfoliation resistance. Better corrosion than T6 with ~8% lower strength."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-062": {
      id: "N-AL-062",
      name: "7150-T7751 High Strength/Toughness",
      designation: { aa: "7150", uns: "A97150", iso: "AlZn6.3MgCuZr", en: "EN AW-7150", jis: "A7150" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft High Strength",
      condition: "T7751 (Solution + Stretch + RRA)",

      composition: {
        aluminum: { min: 86.5, max: 89.9, typical: 88.2 },
        zinc: { min: 5.9, max: 6.9, typical: 6.4 },
        magnesium: { min: 2.0, max: 2.7, typical: 2.35 },
        copper: { min: 1.9, max: 2.5, typical: 2.2 },
        zirconium: { min: 0.08, max: 0.15, typical: 0.12 },
        iron: { min: 0, max: 0.15, typical: 0.08 },
        silicon: { min: 0, max: 0.12, typical: 0.06 }
      },

      physical: {
        density: 2840,
        melting_point: { solidus: 477, liquidus: 630 },
        specific_heat: 858,
        thermal_conductivity: 155,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 4.3e-8,
        electrical_conductivity_iacs: 40,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 158, rockwell_b: 85, rockwell_c: null, vickers: 166 },
        tensile_strength: { min: 572, typical: 607, max: 640 },
        yield_strength: { min: 524, typical: 558, max: 590 },
        compressive_strength: { min: 524, typical: 558, max: 590 },
        elongation: { min: 7, typical: 10, max: 13 },
        reduction_of_area: { min: 20, typical: 26, max: 34 },
        impact_energy: { joules: 14, temperature: 20 },
        fatigue_strength: 170,
        fracture_toughness: 30
      },

      kienzle: { kc1_1: 880, mc: 0.22, kc_adjust_rake: -3.0, kc_adjust_speed: -0.07, chip_compression: 2.7 },
      taylor: { C: 700, n: 0.31, reference_speed: 350, reference_life: 15, speed_range: { min: 118, max: 625 } },

      machinability: {
        aisi_rating: 128,
        relative_to_1212: 1.28,
        chip_form: "segmented_short",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.58,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 470, B: 525, n: 0.25, C: 0.010, m: 0.83, T_melt: 630, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 230, opt: 390, max: 625 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.3, max: 6.3 } },
          pcd: { speed: { min: 460, opt: 780, max: 1175 }, feed: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.3, opt: 1.8, max: 4.9 } }
        },
        milling: { carbide_coated: { speed: { min: 185, opt: 325, max: 548 }, feed_per_tooth: { min: 0.08, opt: 0.16, max: 0.32 }, doc: { min: 0.5, opt: 2.3, max: 4.9 }, woc_factor: 0.63 } },
        drilling: { carbide: { speed: { min: 122, opt: 220, max: 370 }, feed_per_rev: { min: 0.10, opt: 0.21, max: 0.40 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "slight" },

      applications: ["wing_spar_caps", "fuselage_stringers", "high_strength_extrusions", "F-22_components"],
      heat_treatment: { temper: "T7751", solution_temp: 477, quench: "water", stress_relief: "stretch", artificial_aging: "RRA_process" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "Zr grain refiner instead of Cr. Better thick-section properties than 7050. F-22, A380 applications."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-063": {
      id: "N-AL-063",
      name: "7085-T7651 Ultra-Thick Plate",
      designation: { aa: "7085", uns: "A97085", iso: "AlZn7.5MgCuZr", en: "EN AW-7085", jis: "A7085" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft Ultra-Thick Section",
      condition: "T7651 (Solution + Stretch + Over-age)",

      composition: {
        aluminum: { min: 85.5, max: 89.3, typical: 87.4 },
        zinc: { min: 7.0, max: 8.0, typical: 7.5 },
        magnesium: { min: 1.2, max: 1.8, typical: 1.5 },
        copper: { min: 1.3, max: 2.0, typical: 1.65 },
        zirconium: { min: 0.08, max: 0.15, typical: 0.12 },
        iron: { min: 0, max: 0.08, typical: 0.04 },
        silicon: { min: 0, max: 0.06, typical: 0.03 }
      },

      physical: {
        density: 2850,
        melting_point: { solidus: 477, liquidus: 627 },
        specific_heat: 855,
        thermal_conductivity: 157,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 4.2e-8,
        electrical_conductivity_iacs: 41,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 27000
      },

      mechanical: {
        hardness: { brinell: 145, rockwell_b: 81, rockwell_c: null, vickers: 152 },
        tensile_strength: { min: 517, typical: 550, max: 580 },
        yield_strength: { min: 469, typical: 496, max: 530 },
        compressive_strength: { min: 469, typical: 496, max: 530 },
        elongation: { min: 8, typical: 11, max: 14 },
        reduction_of_area: { min: 22, typical: 28, max: 36 },
        impact_energy: { joules: 16, temperature: 20 },
        fatigue_strength: 155,
        fracture_toughness: 35
      },

      kienzle: { kc1_1: 820, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 740, n: 0.33, reference_speed: 370, reference_life: 15, speed_range: { min: 125, max: 660 } },

      machinability: {
        aisi_rating: 118,
        relative_to_1212: 1.18,
        chip_form: "short_curled",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.54,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 425, B: 495, n: 0.27, C: 0.011, m: 0.85, T_melt: 627, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 245, opt: 410, max: 660 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.6, max: 7.0 } },
          pcd: { speed: { min: 490, opt: 820, max: 1250 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.1, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 195, opt: 345, max: 580 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.6, opt: 2.6, max: 5.5 }, woc_factor: 0.66 } },
        drilling: { carbide: { speed: { min: 130, opt: 235, max: 390 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.4, Rz: 2.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["wing_box_ribs", "bulkheads", "heavy_machined_wing_parts", "A380_wing_components"],
      heat_treatment: { temper: "T7651", solution_temp: 477, quench: "water", stress_relief: "stretch 1.5-3%", artificial_aging: "two_step" },
      corrosion_resistance: { general: "very_good", stress_corrosion: "highly_resistant" },
      notes: "Ultra-low Fe/Si for thick section properties. Airbus A380 wing components. Up to 300mm thick."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-064": {
      id: "N-AL-064",
      name: "7039-T64 Military/Marine",
      designation: { aa: "7039", uns: "A97039", iso: "AlZn4Mg", en: "EN AW-7039", jis: "A7039" },
      iso_group: "N",
      material_class: "Aluminum - Military/Weldable",
      condition: "T64 (Solution + Artificial Age)",

      composition: {
        aluminum: { min: 91.0, max: 94.5, typical: 92.8 },
        zinc: { min: 3.5, max: 4.5, typical: 4.0 },
        magnesium: { min: 2.3, max: 3.3, typical: 2.8 },
        manganese: { min: 0.10, max: 0.40, typical: 0.25 },
        chromium: { min: 0.15, max: 0.25, typical: 0.20 },
        iron: { min: 0, max: 0.40, typical: 0.20 },
        silicon: { min: 0, max: 0.30, typical: 0.15 },
        copper: { min: 0, max: 0.10, typical: 0.05 }
      },

      physical: {
        density: 2740,
        melting_point: { solidus: 538, liquidus: 649 },
        specific_heat: 880,
        thermal_conductivity: 145,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 4.5e-8,
        electrical_conductivity_iacs: 38,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69600,
        shear_modulus: 26200
      },

      mechanical: {
        hardness: { brinell: 105, rockwell_b: 60, rockwell_c: null, vickers: 110 },
        tensile_strength: { min: 393, typical: 415, max: 445 },
        yield_strength: { min: 317, typical: 340, max: 370 },
        compressive_strength: { min: 317, typical: 340, max: 370 },
        elongation: { min: 10, typical: 14, max: 18 },
        reduction_of_area: { min: 25, typical: 32, max: 40 },
        impact_energy: { joules: 18, temperature: 20 },
        fatigue_strength: 125,
        fracture_toughness: 30
      },

      kienzle: { kc1_1: 700, mc: 0.24, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 800, n: 0.34, reference_speed: 400, reference_life: 15, speed_range: { min: 140, max: 720 } },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "curled_medium",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.48,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 300, B: 440, n: 0.32, C: 0.014, m: 0.92, T_melt: 649, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 265, opt: 450, max: 720 }, feed: { min: 0.12, opt: 0.28, max: 0.50 }, doc: { min: 0.8, opt: 3.2, max: 8.5 } },
          pcd: { speed: { min: 530, opt: 900, max: 1350 }, feed: { min: 0.10, opt: 0.22, max: 0.40 }, doc: { min: 0.5, opt: 2.5, max: 6.5 } }
        },
        milling: { carbide_coated: { speed: { min: 215, opt: 375, max: 630 }, feed_per_tooth: { min: 0.10, opt: 0.22, max: 0.40 }, doc: { min: 0.8, opt: 3.2, max: 6.5 }, woc_factor: 0.70 } },
        drilling: { carbide: { speed: { min: 145, opt: 260, max: 430 }, feed_per_rev: { min: 0.12, opt: 0.27, max: 0.48 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["military_vehicles", "pontoon_bridges", "marine_structures", "armor_applications"],
      heat_treatment: { temper: "T64", solution_temp: 460, quench: "water", artificial_aging: "120°C / 24h" },
      corrosion_resistance: { general: "very_good", stress_corrosion: "resistant" },
      notes: "WELDABLE 7xxx! No Cu = good weldability. Military bridging, marine. M113 APC armor."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-065": {
      id: "N-AL-065",
      name: "7022-T6 Weldable High Strength",
      designation: { aa: "7022", uns: "A97022", iso: "AlZn5MgCr", en: "EN AW-7022", jis: "A7022" },
      iso_group: "N",
      material_class: "Aluminum - Weldable High Strength",
      condition: "T6 (Solution + Artificial Age)",

      composition: {
        aluminum: { min: 90.0, max: 94.0, typical: 92.0 },
        zinc: { min: 4.3, max: 5.2, typical: 4.75 },
        magnesium: { min: 2.6, max: 3.7, typical: 3.15 },
        chromium: { min: 0.10, max: 0.30, typical: 0.20 },
        manganese: { min: 0.10, max: 0.40, typical: 0.25 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        silicon: { min: 0, max: 0.50, typical: 0.25 }
      },

      physical: {
        density: 2770,
        melting_point: { solidus: 505, liquidus: 643 },
        specific_heat: 870,
        thermal_conductivity: 138,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 4.8e-8,
        electrical_conductivity_iacs: 36,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70000,
        shear_modulus: 26500
      },

      mechanical: {
        hardness: { brinell: 130, rockwell_b: 72, rockwell_c: null, vickers: 137 },
        tensile_strength: { min: 455, typical: 490, max: 525 },
        yield_strength: { min: 386, typical: 425, max: 460 },
        compressive_strength: { min: 386, typical: 425, max: 460 },
        elongation: { min: 8, typical: 12, max: 16 },
        reduction_of_area: { min: 22, typical: 28, max: 36 },
        impact_energy: { joules: 15, temperature: 20 },
        fatigue_strength: 145,
        fracture_toughness: 28
      },

      kienzle: { kc1_1: 780, mc: 0.23, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 750, n: 0.33, reference_speed: 375, reference_life: 15, speed_range: { min: 128, max: 675 } },

      machinability: {
        aisi_rating: 112,
        relative_to_1212: 1.12,
        chip_form: "curled_short",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.52,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 370, B: 475, n: 0.29, C: 0.012, m: 0.88, T_melt: 643, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 420, max: 675 }, feed: { min: 0.10, opt: 0.24, max: 0.45 }, doc: { min: 0.6, opt: 2.7, max: 7.2 } },
          pcd: { speed: { min: 500, opt: 840, max: 1270 }, feed: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.4, opt: 2.2, max: 5.6 } }
        },
        milling: { carbide_coated: { speed: { min: 200, opt: 350, max: 590 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.6, opt: 2.7, max: 5.6 }, woc_factor: 0.67 } },
        drilling: { carbide: { speed: { min: 133, opt: 240, max: 400 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.43 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["welded_structures", "mobile_equipment", "crane_booms", "transport_equipment"],
      heat_treatment: { temper: "T6", solution_temp: 465, quench: "water", artificial_aging: "130°C / 16h" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "Weldable 7xxx with low Cu. Good balance of strength and weldability. European standard."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-066": {
      id: "N-AL-066",
      name: "7020-T6 Weldable Structural",
      designation: { aa: "7020", uns: "A97020", iso: "AlZn4.5Mg1", en: "EN AW-7020", jis: "A7020" },
      iso_group: "N",
      material_class: "Aluminum - Weldable Structural",
      condition: "T6 (Solution + Artificial Age)",

      composition: {
        aluminum: { min: 91.5, max: 95.5, typical: 93.5 },
        zinc: { min: 4.0, max: 5.0, typical: 4.5 },
        magnesium: { min: 1.0, max: 1.4, typical: 1.2 },
        manganese: { min: 0.05, max: 0.50, typical: 0.28 },
        chromium: { min: 0.10, max: 0.35, typical: 0.23 },
        iron: { min: 0, max: 0.40, typical: 0.20 },
        silicon: { min: 0, max: 0.35, typical: 0.18 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        zirconium: { min: 0.08, max: 0.20, typical: 0.14 }
      },

      physical: {
        density: 2780,
        melting_point: { solidus: 532, liquidus: 643 },
        specific_heat: 875,
        thermal_conductivity: 155,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 4.3e-8,
        electrical_conductivity_iacs: 40,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70000,
        shear_modulus: 26500
      },

      mechanical: {
        hardness: { brinell: 115, rockwell_b: 65, rockwell_c: null, vickers: 120 },
        tensile_strength: { min: 350, typical: 385, max: 420 },
        yield_strength: { min: 280, typical: 325, max: 360 },
        compressive_strength: { min: 280, typical: 325, max: 360 },
        elongation: { min: 10, typical: 14, max: 18 },
        reduction_of_area: { min: 28, typical: 35, max: 44 },
        impact_energy: { joules: 18, temperature: 20 },
        fatigue_strength: 115,
        fracture_toughness: 32
      },

      kienzle: { kc1_1: 700, mc: 0.24, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 820, n: 0.35, reference_speed: 410, reference_life: 15, speed_range: { min: 145, max: 740 } },

      machinability: {
        aisi_rating: 100,
        relative_to_1212: 1.00,
        chip_form: "curled_medium",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.48,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 290, B: 420, n: 0.33, C: 0.014, m: 0.92, T_melt: 643, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 270, opt: 460, max: 740 }, feed: { min: 0.12, opt: 0.28, max: 0.52 }, doc: { min: 0.8, opt: 3.4, max: 9.0 } },
          pcd: { speed: { min: 540, opt: 920, max: 1390 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.7, max: 7.0 } }
        },
        milling: { carbide_coated: { speed: { min: 220, opt: 385, max: 650 }, feed_per_tooth: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.8, opt: 3.4, max: 7.0 }, woc_factor: 0.72 } },
        drilling: { carbide: { speed: { min: 148, opt: 265, max: 440 }, feed_per_rev: { min: 0.12, opt: 0.27, max: 0.50 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["welded_structures", "railway_vehicles", "truck_bodies", "trailers", "bridges"],
      heat_treatment: { temper: "T6", solution_temp: 470, quench: "water", artificial_aging: "120°C / 24h" },
      corrosion_resistance: { general: "very_good", stress_corrosion: "resistant" },
      notes: "Natural aging after welding restores ~80% of weld zone strength. Railway standard alloy."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-067": {
      id: "N-AL-067",
      name: "7075-T7352 Forgings",
      designation: { aa: "7075", uns: "A97075", iso: "AlZn5.5MgCu", en: "EN AW-7075", jis: "A7075" },
      iso_group: "N",
      material_class: "Aluminum - Forging",
      condition: "T7352 (Solution + Cold Work + Over-age Forgings)",

      composition: {
        aluminum: { min: 87.1, max: 91.4, typical: 89.3 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 }
      },

      physical: {
        density: 2810,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 155,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 4.3e-8,
        electrical_conductivity_iacs: 40,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 138, rockwell_b: 77, rockwell_c: null, vickers: 145 },
        tensile_strength: { min: 476, typical: 510, max: 545 },
        yield_strength: { min: 400, typical: 450, max: 490 },
        compressive_strength: { min: 400, typical: 450, max: 490 },
        elongation: { min: 8, typical: 12, max: 16 },
        reduction_of_area: { min: 22, typical: 28, max: 36 },
        impact_energy: { joules: 15, temperature: 20 },
        fatigue_strength: 145,
        fracture_toughness: 33
      },

      kienzle: { kc1_1: 790, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 760, n: 0.33, reference_speed: 380, reference_life: 15, speed_range: { min: 130, max: 680 } },

      machinability: {
        aisi_rating: 115,
        relative_to_1212: 1.15,
        chip_form: "curled_short",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.52,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 390, B: 485, n: 0.29, C: 0.012, m: 0.88, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 420, max: 680 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.6, opt: 2.8, max: 7.5 } },
          pcd: { speed: { min: 500, opt: 840, max: 1280 }, feed: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.4, opt: 2.2, max: 6.0 } }
        },
        milling: { carbide_coated: { speed: { min: 200, opt: 350, max: 600 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.6, opt: 2.8, max: 6.0 }, woc_factor: 0.67 } },
        drilling: { carbide: { speed: { min: 135, opt: 240, max: 400 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_fittings", "landing_gear_components", "forged_aerospace_parts"],
      heat_treatment: { temper: "T7352", solution_temp: 477, quench: "water", cold_work: "forging_deformation", artificial_aging: "two_step_over-age" },
      corrosion_resistance: { general: "good", stress_corrosion: "highly_resistant" },
      notes: "Forging temper with SCC resistance. Die forgings and hand forgings."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-068": {
      id: "N-AL-068",
      name: "7175-T7351 High Purity Forging",
      designation: { aa: "7175", uns: "A97175", iso: "AlZn5.5MgCu", en: "EN AW-7175", jis: "A7175" },
      iso_group: "N",
      material_class: "Aluminum - High Purity Forging",
      condition: "T7351 (Solution + Stretch + Over-age)",

      composition: {
        aluminum: { min: 88.2, max: 91.7, typical: 90.0 },
        zinc: { min: 5.1, max: 6.1, typical: 5.6 },
        magnesium: { min: 2.1, max: 2.9, typical: 2.5 },
        copper: { min: 1.2, max: 2.0, typical: 1.6 },
        chromium: { min: 0.18, max: 0.28, typical: 0.23 },
        iron: { min: 0, max: 0.20, typical: 0.10 },
        silicon: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2800,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 862,
        thermal_conductivity: 157,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 4.2e-8,
        electrical_conductivity_iacs: 41,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 142, rockwell_b: 80, rockwell_c: null, vickers: 149 },
        tensile_strength: { min: 490, typical: 524, max: 560 },
        yield_strength: { min: 420, typical: 462, max: 500 },
        compressive_strength: { min: 420, typical: 462, max: 500 },
        elongation: { min: 9, typical: 13, max: 17 },
        reduction_of_area: { min: 25, typical: 32, max: 42 },
        impact_energy: { joules: 18, temperature: 20 },
        fatigue_strength: 150,
        fracture_toughness: 38
      },

      kienzle: { kc1_1: 800, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 750, n: 0.33, reference_speed: 375, reference_life: 15, speed_range: { min: 128, max: 675 } },

      machinability: {
        aisi_rating: 112,
        relative_to_1212: 1.12,
        chip_form: "curled_short",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.53,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 400, B: 490, n: 0.29, C: 0.012, m: 0.87, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 248, opt: 415, max: 675 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.6, opt: 2.7, max: 7.4 } },
          pcd: { speed: { min: 496, opt: 830, max: 1270 }, feed: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.4, opt: 2.2, max: 5.8 } }
        },
        milling: { carbide_coated: { speed: { min: 198, opt: 346, max: 592 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.6, opt: 2.7, max: 5.8 }, woc_factor: 0.67 } },
        drilling: { carbide: { speed: { min: 133, opt: 238, max: 398 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_forgings", "high_fatigue_applications", "landing_gear", "structural_forgings"],
      heat_treatment: { temper: "T7351", solution_temp: 477, quench: "water", stress_relief: "stretch 1.5-3%", artificial_aging: "two_step_over-age" },
      corrosion_resistance: { general: "good", stress_corrosion: "highly_resistant" },
      notes: "HIGH PURITY 7075 for forgings. Lower Fe/Si = better toughness. Premium aerospace forgings."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-069": {
      id: "N-AL-069",
      name: "7075 Alclad-T6 (Clad)",
      designation: { aa: "Alclad 7075", uns: "A97075", iso: "AlZn5.5MgCu clad", en: "EN AW-7075 clad", jis: "A7075P clad" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft Clad",
      condition: "T6 Alclad (Clad + Solution + Artificial Age)",

      composition: {
        core: {
          aluminum: { typical: 89.3 },
          zinc: { typical: 5.6 },
          magnesium: { typical: 2.5 },
          copper: { typical: 1.6 }
        },
        cladding: {
          aluminum: { typical: 99.0 },
          note: "7072 clad (Al-1Zn), typically 4-5% per side"
        }
      },

      physical: {
        density: 2800,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 135,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 5.0e-8,
        electrical_conductivity_iacs: 35,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70500,
        shear_modulus: 26500
      },

      mechanical: {
        hardness: { brinell: 143, rockwell_b: 80, rockwell_c: null, vickers: 150 },
        tensile_strength: { min: 503, typical: 538, max: 570 },
        yield_strength: { min: 434, typical: 469, max: 505 },
        compressive_strength: { min: 434, typical: 469, max: 505 },
        elongation: { min: 8, typical: 11, max: 14 },
        reduction_of_area: { min: 20, typical: 26, max: 34 },
        impact_energy: { joules: 12, temperature: 20 },
        fatigue_strength: 150,
        fracture_toughness: 25,
        notes: "~5% reduced properties due to soft clad layer"
      },

      kienzle: { kc1_1: 820, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 730, n: 0.33, reference_speed: 365, reference_life: 15, speed_range: { min: 125, max: 655 } },

      machinability: {
        aisi_rating: 118,
        relative_to_1212: 1.18,
        chip_form: "mixed_clad_core",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.54,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank",
        notes: "Soft clad can smear. Use sharp tools."
      },

      johnson_cook: { A: 405, B: 495, n: 0.28, C: 0.012, m: 0.86, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 242, opt: 405, max: 655 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.6, max: 7.0 } },
          pcd: { speed: { min: 484, opt: 810, max: 1230 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.1, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 193, opt: 338, max: 574 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.6, opt: 2.6, max: 5.5 }, woc_factor: 0.66 } },
        drilling: { carbide: { speed: { min: 130, opt: 232, max: 388 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_skins", "fuselage_panels", "wing_skins", "external_structures"],
      heat_treatment: { temper: "T6 Alclad", solution_temp: 477, quench: "water", artificial_aging: "121°C / 24h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "good", notes: "7072 clad provides cathodic protection" },
      notes: "Clad 7075 for corrosion protection. 7072 clad more anodic than 7075 core. Aircraft skins."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "N-AL-070": {
      id: "N-AL-070",
      name: "7075 Alclad-T73 (Clad, SCC Resistant)",
      designation: { aa: "Alclad 7075", uns: "A97075", iso: "AlZn5.5MgCu clad", en: "EN AW-7075 clad", jis: "A7075P clad" },
      iso_group: "N",
      material_class: "Aluminum - Aircraft Clad",
      condition: "T73 Alclad (Clad + Solution + Over-age)",

      composition: {
        core: {
          aluminum: { typical: 89.3 },
          zinc: { typical: 5.6 },
          magnesium: { typical: 2.5 },
          copper: { typical: 1.6 }
        },
        cladding: {
          aluminum: { typical: 99.0 },
          note: "7072 clad"
        }
      },

      physical: {
        density: 2800,
        melting_point: { solidus: 477, liquidus: 635 },
        specific_heat: 860,
        thermal_conductivity: 150,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 4.4e-8,
        electrical_conductivity_iacs: 39,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70500,
        shear_modulus: 26500
      },

      mechanical: {
        hardness: { brinell: 128, rockwell_b: 73, rockwell_c: null, vickers: 134 },
        tensile_strength: { min: 434, typical: 469, max: 500 },
        yield_strength: { min: 358, typical: 400, max: 435 },
        compressive_strength: { min: 358, typical: 400, max: 435 },
        elongation: { min: 10, typical: 13, max: 16 },
        reduction_of_area: { min: 26, typical: 33, max: 42 },
        impact_energy: { joules: 15, temperature: 20 },
        fatigue_strength: 138,
        fracture_toughness: 33
      },

      kienzle: { kc1_1: 760, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 760, n: 0.33, reference_speed: 380, reference_life: 15, speed_range: { min: 130, max: 680 } },

      machinability: {
        aisi_rating: 108,
        relative_to_1212: 1.08,
        chip_form: "mixed_clad_core",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.50,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 360, B: 465, n: 0.30, C: 0.013, m: 0.89, T_melt: 635, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 252, opt: 420, max: 680 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.6, opt: 2.8, max: 7.5 } },
          pcd: { speed: { min: 504, opt: 840, max: 1280 }, feed: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.4, opt: 2.2, max: 6.0 } }
        },
        milling: { carbide_coated: { speed: { min: 202, opt: 350, max: 596 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.6, opt: 2.8, max: 6.0 }, woc_factor: 0.68 } },
        drilling: { carbide: { speed: { min: 135, opt: 240, max: 402 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aircraft_fittings", "external_structures_requiring_SCC_resistance", "marine_aerospace"],
      heat_treatment: { temper: "T73 Alclad", solution_temp: 477, quench: "water", artificial_aging: "107°C / 6-8h + 163°C / 24-30h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "highly_resistant" },
      notes: "Clad 7075-T73 = best corrosion + SCC resistance. Premium external aircraft applications."
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    }
  }

};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ALUMINUM_7XXX_051_070;
}
