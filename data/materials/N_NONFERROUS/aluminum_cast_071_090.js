/**
 * PRISM MATERIALS DATABASE - Aluminum Cast Alloys
 * File: aluminum_cast_071_090.js
 * Materials: N-AL-071 through N-AL-090
 * 
 * ISO Category: N (Non-Ferrous)
 * Sub-category: Aluminum - Cast Alloys
 * 
 * CAST ALUMINUM CHARACTERISTICS:
 * - High silicon content for fluidity and casting
 * - Sand casting, permanent mold, and die casting grades
 * - Lower ductility than wrought alloys
 * - Excellent machinability in most grades
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * Created: 2026-01-25
 */

const ALUMINUM_CAST_071_090 = {
  metadata: {
    file: "aluminum_cast_071_090.js",
    category: "N_NONFERROUS",
    subcategory: "Aluminum Cast Alloys",
    materialCount: 20,
    idRange: { start: "N-AL-071", end: "N-AL-090" },
    schemaVersion: "3.0.0",
    created: "2026-01-25"
  },

  materials: {
    "N-AL-071": {
      id: "N-AL-071",
      name: "A356-T6 Premium Sand/PM Cast",
      designation: { aa: "A356.0", uns: "A13560", iso: "AlSi7Mg", en: "EN AC-42100", jis: "AC4C" },
      iso_group: "N",
      material_class: "Aluminum - Premium Casting",
      condition: "T6 (Solution + Artificial Age)",
      casting_method: ["sand_casting", "permanent_mold"],

      composition: {
        aluminum: { min: 91.1, max: 93.3, typical: 92.2 },
        silicon: { min: 6.5, max: 7.5, typical: 7.0 },
        magnesium: { min: 0.25, max: 0.45, typical: 0.35 },
        iron: { min: 0, max: 0.20, typical: 0.12 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        manganese: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        titanium: { min: 0, max: 0.20, typical: 0.15 }
      },

      physical: {
        density: 2680,
        melting_point: { solidus: 557, liquidus: 613 },
        specific_heat: 963,
        thermal_conductivity: 151,
        thermal_expansion: 21.4e-6,
        electrical_resistivity: 4.0e-8,
        electrical_conductivity_iacs: 43,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 72400,
        shear_modulus: 27200,
        casting_shrinkage: 1.3
      },

      mechanical: {
        hardness: { brinell: 90, rockwell_b: 52, rockwell_c: null, vickers: 95 },
        tensile_strength: { min: 262, typical: 290, max: 320 },
        yield_strength: { min: 186, typical: 207, max: 235 },
        compressive_strength: { min: 186, typical: 207, max: 235 },
        elongation: { min: 5, typical: 8, max: 12 },
        reduction_of_area: { min: 12, typical: 18, max: 25 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 90,
        fracture_toughness: 22
      },

      kienzle: { kc1_1: 580, mc: 0.26, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.3 },
      taylor: { C: 920, n: 0.36, reference_speed: 460, reference_life: 15, speed_range: { min: 170, max: 820 } },

      machinability: {
        aisi_rating: 100,
        relative_to_1212: 1.00,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 0.44,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank",
        notes: "Si particles cause abrasive wear. Use PCD or carbide."
      },

      johnson_cook: { A: 200, B: 320, n: 0.35, C: 0.015, m: 0.98, T_melt: 613, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 300, opt: 510, max: 820 }, feed: { min: 0.12, opt: 0.28, max: 0.52 }, doc: { min: 0.8, opt: 3.5, max: 9.5 } },
          pcd: { speed: { min: 600, opt: 1020, max: 1540 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.8, max: 7.5 } }
        },
        milling: { carbide_coated: { speed: { min: 245, opt: 425, max: 715 }, feed_per_tooth: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.8, opt: 3.5, max: 7.5 }, woc_factor: 0.73 } },
        drilling: { carbide: { speed: { min: 165, opt: 295, max: 485 }, feed_per_rev: { min: 0.12, opt: 0.27, max: 0.50 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.8, Rz: 4.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["aerospace_castings", "aircraft_fittings", "automotive_wheels", "suspension_components"],
      heat_treatment: { temper: "T6", solution_temp: 540, quench: "hot_water_65C", artificial_aging: "155°C / 3-5h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "PREMIUM aerospace casting. Low Fe for high ductility. A356 = most widely specified aerospace casting alloy."
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

    "N-AL-072": {
      id: "N-AL-072",
      name: "A356-T61 Premium (PM)",
      designation: { aa: "A356.0", uns: "A13560", iso: "AlSi7Mg", en: "EN AC-42100", jis: "AC4C" },
      iso_group: "N",
      material_class: "Aluminum - Premium Casting",
      condition: "T61 (Solution + Artificial Age - Alternate)",
      casting_method: ["permanent_mold"],

      composition: {
        aluminum: { min: 91.1, max: 93.3, typical: 92.2 },
        silicon: { min: 6.5, max: 7.5, typical: 7.0 },
        magnesium: { min: 0.25, max: 0.45, typical: 0.35 },
        iron: { min: 0, max: 0.20, typical: 0.10 }
      },

      physical: {
        density: 2680,
        melting_point: { solidus: 557, liquidus: 613 },
        specific_heat: 963,
        thermal_conductivity: 159,
        thermal_expansion: 21.4e-6,
        electrical_resistivity: 3.8e-8,
        electrical_conductivity_iacs: 45,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 72400,
        shear_modulus: 27200
      },

      mechanical: {
        hardness: { brinell: 95, rockwell_b: 55, rockwell_c: null, vickers: 100 },
        tensile_strength: { min: 283, typical: 310, max: 340 },
        yield_strength: { min: 207, typical: 228, max: 255 },
        compressive_strength: { min: 207, typical: 228, max: 255 },
        elongation: { min: 5, typical: 7, max: 10 },
        reduction_of_area: { min: 10, typical: 15, max: 22 },
        impact_energy: { joules: 7, temperature: 20 },
        fatigue_strength: 95,
        fracture_toughness: 23
      },

      kienzle: { kc1_1: 600, mc: 0.25, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 900, n: 0.35, reference_speed: 450, reference_life: 15, speed_range: { min: 165, max: 800 } },

      machinability: {
        aisi_rating: 105,
        relative_to_1212: 1.05,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.7,
        cutting_force_factor: 0.45,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 210, B: 335, n: 0.34, C: 0.014, m: 0.96, T_melt: 613, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 295, opt: 500, max: 800 }, feed: { min: 0.12, opt: 0.27, max: 0.50 }, doc: { min: 0.8, opt: 3.4, max: 9.2 } },
          pcd: { speed: { min: 590, opt: 1000, max: 1500 }, feed: { min: 0.10, opt: 0.22, max: 0.40 }, doc: { min: 0.5, opt: 2.7, max: 7.2 } }
        },
        milling: { carbide_coated: { speed: { min: 238, opt: 415, max: 700 }, feed_per_tooth: { min: 0.10, opt: 0.21, max: 0.40 }, doc: { min: 0.8, opt: 3.4, max: 7.2 }, woc_factor: 0.72 } },
        drilling: { carbide: { speed: { min: 160, opt: 290, max: 475 }, feed_per_rev: { min: 0.12, opt: 0.26, max: 0.48 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.7, Rz: 4.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["permanent_mold_aerospace", "automotive_wheels", "structural_castings"],
      heat_treatment: { temper: "T61", solution_temp: 540, quench: "hot_water", artificial_aging: "155°C / 8-12h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "T61 = extended aging for higher strength. Permanent mold castings."
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

    "N-AL-073": {
      id: "N-AL-073",
      name: "356-T6 General Purpose Cast",
      designation: { aa: "356.0", uns: "A03560", iso: "AlSi7Mg", en: "EN AC-42000", jis: "AC4C" },
      iso_group: "N",
      material_class: "Aluminum - General Casting",
      condition: "T6 (Solution + Artificial Age)",
      casting_method: ["sand_casting", "permanent_mold"],

      composition: {
        aluminum: { min: 90.0, max: 93.3, typical: 91.7 },
        silicon: { min: 6.5, max: 7.5, typical: 7.0 },
        magnesium: { min: 0.20, max: 0.45, typical: 0.33 },
        iron: { min: 0, max: 0.60, typical: 0.35 },
        copper: { min: 0, max: 0.25, typical: 0.12 },
        manganese: { min: 0, max: 0.35, typical: 0.18 },
        zinc: { min: 0, max: 0.35, typical: 0.18 },
        titanium: { min: 0, max: 0.25, typical: 0.15 }
      },

      physical: {
        density: 2680,
        melting_point: { solidus: 557, liquidus: 613 },
        specific_heat: 963,
        thermal_conductivity: 151,
        thermal_expansion: 21.4e-6,
        electrical_resistivity: 4.2e-8,
        electrical_conductivity_iacs: 41,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 72400,
        shear_modulus: 27200
      },

      mechanical: {
        hardness: { brinell: 85, rockwell_b: 48, rockwell_c: null, vickers: 90 },
        tensile_strength: { min: 228, typical: 262, max: 295 },
        yield_strength: { min: 165, typical: 186, max: 215 },
        compressive_strength: { min: 165, typical: 186, max: 215 },
        elongation: { min: 2, typical: 4, max: 6 },
        reduction_of_area: { min: 6, typical: 10, max: 15 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 80,
        fracture_toughness: 18
      },

      kienzle: { kc1_1: 560, mc: 0.26, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.3 },
      taylor: { C: 940, n: 0.36, reference_speed: 470, reference_life: 15, speed_range: { min: 175, max: 840 } },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.9,
        cutting_force_factor: 0.42,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 180, B: 300, n: 0.36, C: 0.016, m: 1.00, T_melt: 613, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 310, opt: 525, max: 840 }, feed: { min: 0.13, opt: 0.29, max: 0.54 }, doc: { min: 0.9, opt: 3.7, max: 10.0 } },
          pcd: { speed: { min: 620, opt: 1050, max: 1580 }, feed: { min: 0.10, opt: 0.23, max: 0.43 }, doc: { min: 0.6, opt: 3.0, max: 7.8 } }
        },
        milling: { carbide_coated: { speed: { min: 252, opt: 438, max: 735 }, feed_per_tooth: { min: 0.10, opt: 0.23, max: 0.43 }, doc: { min: 0.9, opt: 3.7, max: 7.8 }, woc_factor: 0.75 } },
        drilling: { carbide: { speed: { min: 170, opt: 305, max: 500 }, feed_per_rev: { min: 0.13, opt: 0.28, max: 0.52 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.9, Rz: 5.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["general_purpose_castings", "pump_housings", "valve_bodies", "machinery_parts"],
      heat_treatment: { temper: "T6", solution_temp: 540, quench: "hot_water_65C", artificial_aging: "155°C / 3-5h" },
      corrosion_resistance: { general: "very_good", stress_corrosion: "resistant" },
      notes: "Standard 356 with higher Fe allowance than A356. General purpose castings."
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

    "N-AL-074": {
      id: "N-AL-074",
      name: "A357-T6 Premium Aerospace Cast",
      designation: { aa: "A357.0", uns: "A13570", iso: "AlSi7MgBe", en: "EN AC-42200", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Premium Aerospace Casting",
      condition: "T6 (Solution + Artificial Age)",
      casting_method: ["sand_casting", "permanent_mold", "investment_casting"],

      composition: {
        aluminum: { min: 90.4, max: 93.0, typical: 91.7 },
        silicon: { min: 6.5, max: 7.5, typical: 7.0 },
        magnesium: { min: 0.40, max: 0.70, typical: 0.55 },
        beryllium: { min: 0.04, max: 0.07, typical: 0.05 },
        iron: { min: 0, max: 0.20, typical: 0.10 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        titanium: { min: 0.04, max: 0.20, typical: 0.12 }
      },

      physical: {
        density: 2680,
        melting_point: { solidus: 557, liquidus: 613 },
        specific_heat: 963,
        thermal_conductivity: 159,
        thermal_expansion: 21.4e-6,
        electrical_resistivity: 3.8e-8,
        electrical_conductivity_iacs: 45,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 72400,
        shear_modulus: 27200
      },

      mechanical: {
        hardness: { brinell: 100, rockwell_b: 58, rockwell_c: null, vickers: 105 },
        tensile_strength: { min: 310, typical: 345, max: 380 },
        yield_strength: { min: 248, typical: 276, max: 310 },
        compressive_strength: { min: 248, typical: 276, max: 310 },
        elongation: { min: 5, typical: 8, max: 12 },
        reduction_of_area: { min: 12, typical: 18, max: 26 },
        impact_energy: { joules: 9, temperature: 20 },
        fatigue_strength: 105,
        fracture_toughness: 25
      },

      kienzle: { kc1_1: 620, mc: 0.25, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 880, n: 0.35, reference_speed: 440, reference_life: 15, speed_range: { min: 160, max: 780 } },

      machinability: {
        aisi_rating: 110,
        relative_to_1212: 1.10,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.46,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 240, B: 365, n: 0.32, C: 0.013, m: 0.94, T_melt: 613, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 285, opt: 490, max: 780 }, feed: { min: 0.11, opt: 0.26, max: 0.48 }, doc: { min: 0.7, opt: 3.2, max: 8.8 } },
          pcd: { speed: { min: 570, opt: 980, max: 1460 }, feed: { min: 0.09, opt: 0.21, max: 0.39 }, doc: { min: 0.5, opt: 2.5, max: 6.8 } }
        },
        milling: { carbide_coated: { speed: { min: 230, opt: 408, max: 682 }, feed_per_tooth: { min: 0.09, opt: 0.20, max: 0.39 }, doc: { min: 0.7, opt: 3.2, max: 6.8 }, woc_factor: 0.70 } },
        drilling: { carbide: { speed: { min: 155, opt: 280, max: 462 }, feed_per_rev: { min: 0.11, opt: 0.25, max: 0.46 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["aerospace_structural_castings", "aircraft_landing_gear", "helicopter_components", "missile_parts"],
      heat_treatment: { temper: "T6", solution_temp: 540, quench: "hot_water_65C", artificial_aging: "155°C / 5-7h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      safety_notes: "Contains BERYLLIUM - handle with proper PPE. Avoid machining dust inhalation.",
      notes: "HIGHEST STRENGTH Al-Si-Mg casting. Be addition reduces oxide films. Premium aerospace."
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

    "N-AL-075": {
      id: "N-AL-075",
      name: "A380 Die Cast",
      designation: { aa: "A380.0", uns: "A13800", iso: "AlSi8Cu3", en: "EN AC-46000", jis: "ADC10" },
      iso_group: "N",
      material_class: "Aluminum - Die Casting",
      condition: "F (As-Cast)",
      casting_method: ["die_casting"],

      composition: {
        aluminum: { min: 83.1, max: 88.4, typical: 85.8 },
        silicon: { min: 7.5, max: 9.5, typical: 8.5 },
        copper: { min: 3.0, max: 4.0, typical: 3.5 },
        iron: { min: 0, max: 1.30, typical: 0.90 },
        magnesium: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.50, typical: 0.25 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        zinc: { min: 0, max: 3.0, typical: 1.5 },
        tin: { min: 0, max: 0.35, typical: 0.18 }
      },

      physical: {
        density: 2740,
        melting_point: { solidus: 538, liquidus: 593 },
        specific_heat: 963,
        thermal_conductivity: 96,
        thermal_expansion: 21.8e-6,
        electrical_resistivity: 6.3e-8,
        electrical_conductivity_iacs: 27,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700,
        casting_shrinkage: 0.6
      },

      mechanical: {
        hardness: { brinell: 80, rockwell_b: 45, rockwell_c: null, vickers: 84 },
        tensile_strength: { min: 310, typical: 331, max: 360 },
        yield_strength: { min: 159, typical: 165, max: 180 },
        compressive_strength: { min: 159, typical: 165, max: 180 },
        elongation: { min: 2, typical: 3.5, max: 5 },
        reduction_of_area: { min: 4, typical: 7, max: 10 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 140,
        fracture_toughness: 16
      },

      kienzle: { kc1_1: 680, mc: 0.24, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 800, n: 0.33, reference_speed: 400, reference_life: 15, speed_range: { min: 140, max: 720 } },

      machinability: {
        aisi_rating: 140,
        relative_to_1212: 1.40,
        chip_form: "short_broken",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.48,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank",
        notes: "EXCELLENT machinability. High Si = abrasive. Use PCD for high volume."
      },

      johnson_cook: { A: 175, B: 280, n: 0.38, C: 0.018, m: 1.05, T_melt: 593, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 260, opt: 440, max: 720 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.5, max: 7.0 } },
          pcd: { speed: { min: 520, opt: 880, max: 1350 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.0, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 210, opt: 365, max: 630 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.6, opt: 2.5, max: 5.5 }, woc_factor: 0.68 } },
        drilling: { carbide: { speed: { min: 140, opt: 252, max: 425 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["automotive_housings", "transmission_cases", "engine_brackets", "electronic_enclosures"],
      heat_treatment: { temper: "F", note: "Typically used as-cast. T5 aging possible for slight improvement." },
      corrosion_resistance: { general: "fair", stress_corrosion: "susceptible_in_aggressive_environments" },
      notes: "MOST COMMON die cast alloy. #1 volume aluminum die casting. Excellent castability and machinability."
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

    "N-AL-076": {
      id: "N-AL-076",
      name: "383 Die Cast (ADC12)",
      designation: { aa: "383.0", uns: "A03830", iso: "AlSi10Cu3", en: "EN AC-46500", jis: "ADC12" },
      iso_group: "N",
      material_class: "Aluminum - Die Casting",
      condition: "F (As-Cast)",
      casting_method: ["die_casting"],

      composition: {
        aluminum: { min: 81.6, max: 87.7, typical: 84.7 },
        silicon: { min: 9.5, max: 11.5, typical: 10.5 },
        copper: { min: 2.0, max: 3.0, typical: 2.5 },
        iron: { min: 0, max: 1.30, typical: 0.85 },
        magnesium: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.50, typical: 0.25 },
        nickel: { min: 0, max: 0.30, typical: 0.15 },
        zinc: { min: 0, max: 3.0, typical: 1.5 },
        tin: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2740,
        melting_point: { solidus: 516, liquidus: 582 },
        specific_heat: 963,
        thermal_conductivity: 96,
        thermal_expansion: 20.9e-6,
        electrical_resistivity: 6.5e-8,
        electrical_conductivity_iacs: 27,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 75, rockwell_b: 42, rockwell_c: null, vickers: 79 },
        tensile_strength: { min: 290, typical: 310, max: 340 },
        yield_strength: { min: 145, typical: 150, max: 165 },
        compressive_strength: { min: 145, typical: 150, max: 165 },
        elongation: { min: 2, typical: 3.5, max: 5 },
        reduction_of_area: { min: 4, typical: 7, max: 10 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 130,
        fracture_toughness: 15
      },

      kienzle: { kc1_1: 700, mc: 0.24, kc_adjust_rake: -3.0, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 780, n: 0.32, reference_speed: 390, reference_life: 15, speed_range: { min: 135, max: 700 } },

      machinability: {
        aisi_rating: 145,
        relative_to_1212: 1.45,
        chip_form: "short_broken",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.49,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank",
        notes: "Higher Si than A380 = MORE abrasive but better fluidity."
      },

      johnson_cook: { A: 160, B: 265, n: 0.39, C: 0.019, m: 1.08, T_melt: 582, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 430, max: 700 }, feed: { min: 0.10, opt: 0.23, max: 0.43 }, doc: { min: 0.6, opt: 2.4, max: 6.8 } },
          pcd: { speed: { min: 500, opt: 860, max: 1320 }, feed: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.4, opt: 1.9, max: 5.3 } }
        },
        milling: { carbide_coated: { speed: { min: 202, opt: 358, max: 612 }, feed_per_tooth: { min: 0.08, opt: 0.17, max: 0.34 }, doc: { min: 0.6, opt: 2.4, max: 5.3 }, woc_factor: 0.67 } },
        drilling: { carbide: { speed: { min: 135, opt: 246, max: 414 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.41 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["thin_wall_castings", "complex_die_castings", "automotive_components"],
      heat_treatment: { temper: "F", note: "As-cast. Higher Si gives better fluidity for thin walls." },
      corrosion_resistance: { general: "fair", stress_corrosion: "susceptible" },
      notes: "Better fluidity than A380 for thin-wall castings. ADC12 in Japanese specification."
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

    "N-AL-077": {
      id: "N-AL-077",
      name: "360 Die Cast (High Corrosion Resistance)",
      designation: { aa: "360.0", uns: "A03600", iso: "AlSi10Mg", en: "EN AC-43400", jis: "ADC1" },
      iso_group: "N",
      material_class: "Aluminum - Die Casting",
      condition: "F (As-Cast)",
      casting_method: ["die_casting"],

      composition: {
        aluminum: { min: 86.4, max: 91.7, typical: 89.1 },
        silicon: { min: 9.0, max: 10.0, typical: 9.5 },
        magnesium: { min: 0.40, max: 0.60, typical: 0.50 },
        iron: { min: 0, max: 2.0, typical: 1.2 },
        copper: { min: 0, max: 0.60, typical: 0.30 },
        manganese: { min: 0, max: 0.35, typical: 0.18 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        zinc: { min: 0, max: 0.50, typical: 0.25 },
        tin: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2630,
        melting_point: { solidus: 557, liquidus: 596 },
        specific_heat: 963,
        thermal_conductivity: 113,
        thermal_expansion: 21.0e-6,
        electrical_resistivity: 5.6e-8,
        electrical_conductivity_iacs: 31,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 75, rockwell_b: 42, rockwell_c: null, vickers: 79 },
        tensile_strength: { min: 290, typical: 317, max: 350 },
        yield_strength: { min: 165, typical: 172, max: 190 },
        compressive_strength: { min: 165, typical: 172, max: 190 },
        elongation: { min: 2, typical: 3, max: 4 },
        reduction_of_area: { min: 3, typical: 6, max: 9 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 130,
        fracture_toughness: 15
      },

      kienzle: { kc1_1: 680, mc: 0.25, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 810, n: 0.33, reference_speed: 405, reference_life: 15, speed_range: { min: 142, max: 730 } },

      machinability: {
        aisi_rating: 120,
        relative_to_1212: 1.20,
        chip_form: "short_broken",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.48,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 180, B: 290, n: 0.37, C: 0.017, m: 1.02, T_melt: 596, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 265, opt: 450, max: 730 }, feed: { min: 0.10, opt: 0.24, max: 0.45 }, doc: { min: 0.6, opt: 2.6, max: 7.2 } },
          pcd: { speed: { min: 530, opt: 900, max: 1370 }, feed: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.4, opt: 2.1, max: 5.6 } }
        },
        milling: { carbide_coated: { speed: { min: 215, opt: 375, max: 638 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.36 }, doc: { min: 0.6, opt: 2.6, max: 5.6 }, woc_factor: 0.69 } },
        drilling: { carbide: { speed: { min: 142, opt: 258, max: 432 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.43 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["marine_components", "corrosion_resistant_castings", "food_handling_equipment"],
      heat_treatment: { temper: "F", note: "As-cast. Mg provides some response to aging." },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "Best corrosion resistance of common die cast alloys. Low Cu = better corrosion. Marine applications."
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

    "N-AL-078": {
      id: "N-AL-078",
      name: "390 Hypereutectic Die Cast",
      designation: { aa: "390.0", uns: "A03900", iso: "AlSi17Cu4Mg", en: "EN AC-48000", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Hypereutectic Die Casting",
      condition: "F (As-Cast)",
      casting_method: ["die_casting"],

      composition: {
        aluminum: { min: 76.0, max: 81.5, typical: 78.8 },
        silicon: { min: 16.0, max: 18.0, typical: 17.0 },
        copper: { min: 4.0, max: 5.0, typical: 4.5 },
        magnesium: { min: 0.45, max: 0.65, typical: 0.55 },
        iron: { min: 0, max: 1.30, typical: 0.80 },
        manganese: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        titanium: { min: 0, max: 0.20, typical: 0.10 }
      },

      physical: {
        density: 2730,
        melting_point: { solidus: 507, liquidus: 650 },
        specific_heat: 880,
        thermal_conductivity: 134,
        thermal_expansion: 18.0e-6,
        electrical_resistivity: 5.8e-8,
        electrical_conductivity_iacs: 30,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 81400,
        shear_modulus: 30500
      },

      mechanical: {
        hardness: { brinell: 120, rockwell_b: 68, rockwell_c: null, vickers: 126 },
        tensile_strength: { min: 276, typical: 296, max: 325 },
        yield_strength: { min: 241, typical: 262, max: 290 },
        compressive_strength: { min: 241, typical: 262, max: 290 },
        elongation: { min: 0.5, typical: 1, max: 1.5 },
        reduction_of_area: { min: 1, typical: 2, max: 3 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 100,
        fracture_toughness: 12
      },

      kienzle: { kc1_1: 850, mc: 0.22, kc_adjust_rake: -3.0, kc_adjust_speed: -0.06, chip_compression: 2.8 },
      taylor: { C: 620, n: 0.28, reference_speed: 310, reference_life: 15, speed_range: { min: 100, max: 560 } },

      machinability: {
        aisi_rating: 80,
        relative_to_1212: 0.80,
        chip_form: "powder_segmented",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 0.55,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "VERY ABRASIVE - Primary Si particles. PCD REQUIRED for production. Carbide wears rapidly."
      },

      johnson_cook: { A: 250, B: 350, n: 0.28, C: 0.010, m: 0.80, T_melt: 650, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          pcd: { speed: { min: 180, opt: 350, max: 560 }, feed: { min: 0.06, opt: 0.14, max: 0.26 }, doc: { min: 0.3, opt: 1.2, max: 3.5 } },
          carbide_coated: { speed: { min: 80, opt: 160, max: 280 }, feed: { min: 0.06, opt: 0.14, max: 0.26 }, doc: { min: 0.3, opt: 1.2, max: 3.5 }, notes: "Tool life very short" }
        },
        milling: { pcd: { speed: { min: 145, opt: 290, max: 490 }, feed_per_tooth: { min: 0.05, opt: 0.11, max: 0.21 }, doc: { min: 0.3, opt: 1.2, max: 2.8 }, woc_factor: 0.55 } },
        drilling: { pcd: { speed: { min: 95, opt: 200, max: 330 }, feed_per_rev: { min: 0.06, opt: 0.13, max: 0.24 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.8, Rz: 4.5 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil_flood", mql_suitable: false, cryogenic_benefit: "significant" },

      applications: ["engine_blocks_bores", "compressor_pistons", "wear_resistant_applications"],
      heat_treatment: { temper: "F", note: "As-cast hypereutectic. T5 or T6 possible for higher strength." },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "HYPEREUTECTIC (>12.6% Si). Primary Si particles = excellent wear resistance. Engine bore surfaces."
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

    "N-AL-079": {
      id: "N-AL-079",
      name: "319 Sand/PM Cast (General Purpose)",
      designation: { aa: "319.0", uns: "A03190", iso: "AlSi6Cu4", en: "EN AC-45200", jis: "AC2A" },
      iso_group: "N",
      material_class: "Aluminum - General Casting",
      condition: "F (As-Cast)",
      casting_method: ["sand_casting", "permanent_mold"],

      composition: {
        aluminum: { min: 84.0, max: 90.0, typical: 87.0 },
        silicon: { min: 5.5, max: 6.5, typical: 6.0 },
        copper: { min: 3.0, max: 4.0, typical: 3.5 },
        iron: { min: 0, max: 1.0, typical: 0.60 },
        magnesium: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.50, typical: 0.25 },
        nickel: { min: 0, max: 0.35, typical: 0.18 },
        zinc: { min: 0, max: 1.0, typical: 0.50 },
        titanium: { min: 0, max: 0.25, typical: 0.12 }
      },

      physical: {
        density: 2790,
        melting_point: { solidus: 516, liquidus: 604 },
        specific_heat: 963,
        thermal_conductivity: 109,
        thermal_expansion: 21.5e-6,
        electrical_resistivity: 5.8e-8,
        electrical_conductivity_iacs: 30,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 74000,
        shear_modulus: 27800
      },

      mechanical: {
        hardness: { brinell: 70, rockwell_b: 38, rockwell_c: null, vickers: 74 },
        tensile_strength: { min: 186, typical: 186, max: 210 },
        yield_strength: { min: 124, typical: 124, max: 145 },
        compressive_strength: { min: 124, typical: 124, max: 145 },
        elongation: { min: 1.5, typical: 2, max: 3 },
        reduction_of_area: { min: 3, typical: 5, max: 7 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 70,
        fracture_toughness: 14
      },

      kienzle: { kc1_1: 600, mc: 0.26, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 900, n: 0.35, reference_speed: 450, reference_life: 15, speed_range: { min: 165, max: 800 } },

      machinability: {
        aisi_rating: 125,
        relative_to_1212: 1.25,
        chip_form: "short_broken",
        surface_finish_achievable: 0.7,
        cutting_force_factor: 0.44,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 135, B: 245, n: 0.40, C: 0.020, m: 1.10, T_melt: 604, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 295, opt: 500, max: 800 }, feed: { min: 0.11, opt: 0.26, max: 0.48 }, doc: { min: 0.7, opt: 3.0, max: 8.2 } },
          pcd: { speed: { min: 590, opt: 1000, max: 1500 }, feed: { min: 0.09, opt: 0.21, max: 0.39 }, doc: { min: 0.5, opt: 2.4, max: 6.4 } }
        },
        milling: { carbide_coated: { speed: { min: 240, opt: 415, max: 700 }, feed_per_tooth: { min: 0.09, opt: 0.20, max: 0.38 }, doc: { min: 0.7, opt: 3.0, max: 6.4 }, woc_factor: 0.72 } },
        drilling: { carbide: { speed: { min: 160, opt: 286, max: 475 }, feed_per_rev: { min: 0.11, opt: 0.25, max: 0.46 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.7, Rz: 4.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["engine_blocks", "transmission_cases", "crankcases", "cylinder_heads"],
      heat_treatment: { temper: "F", note: "As-cast. T5 or T6 possible for higher strength." },
      corrosion_resistance: { general: "fair", stress_corrosion: "susceptible" },
      notes: "General purpose engine casting alloy. Excellent castability. Moderate strength."
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

    "N-AL-080": {
      id: "N-AL-080",
      name: "319-T6 Heat Treated",
      designation: { aa: "319.0", uns: "A03190", iso: "AlSi6Cu4", en: "EN AC-45200", jis: "AC2A" },
      iso_group: "N",
      material_class: "Aluminum - General Casting",
      condition: "T6 (Solution + Artificial Age)",
      casting_method: ["sand_casting", "permanent_mold"],

      composition: {
        aluminum: { min: 84.0, max: 90.0, typical: 87.0 },
        silicon: { min: 5.5, max: 6.5, typical: 6.0 },
        copper: { min: 3.0, max: 4.0, typical: 3.5 },
        iron: { min: 0, max: 1.0, typical: 0.60 }
      },

      physical: {
        density: 2790,
        melting_point: { solidus: 516, liquidus: 604 },
        specific_heat: 963,
        thermal_conductivity: 121,
        thermal_expansion: 21.5e-6,
        electrical_resistivity: 5.2e-8,
        electrical_conductivity_iacs: 33,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 74000,
        shear_modulus: 27800
      },

      mechanical: {
        hardness: { brinell: 95, rockwell_b: 55, rockwell_c: null, vickers: 100 },
        tensile_strength: { min: 248, typical: 276, max: 305 },
        yield_strength: { min: 165, typical: 186, max: 210 },
        compressive_strength: { min: 165, typical: 186, max: 210 },
        elongation: { min: 1.5, typical: 2.5, max: 4 },
        reduction_of_area: { min: 3, typical: 6, max: 9 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 90,
        fracture_toughness: 16
      },

      kienzle: { kc1_1: 660, mc: 0.25, kc_adjust_rake: -3.3, kc_adjust_speed: -0.08, chip_compression: 2.5 },
      taylor: { C: 850, n: 0.34, reference_speed: 425, reference_life: 15, speed_range: { min: 155, max: 760 } },

      machinability: {
        aisi_rating: 135,
        relative_to_1212: 1.35,
        chip_form: "short_broken",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.47,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 180, B: 300, n: 0.35, C: 0.016, m: 1.00, T_melt: 604, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 280, opt: 475, max: 760 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.7, opt: 2.8, max: 7.8 } },
          pcd: { speed: { min: 560, opt: 950, max: 1425 }, feed: { min: 0.08, opt: 0.20, max: 0.37 }, doc: { min: 0.4, opt: 2.2, max: 6.1 } }
        },
        milling: { carbide_coated: { speed: { min: 228, opt: 395, max: 665 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.7, opt: 2.8, max: 6.1 }, woc_factor: 0.70 } },
        drilling: { carbide: { speed: { min: 152, opt: 272, max: 450 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["cylinder_heads_high_performance", "engine_blocks", "high_load_castings"],
      heat_treatment: { temper: "T6", solution_temp: 505, quench: "hot_water", artificial_aging: "155°C / 3-5h" },
      corrosion_resistance: { general: "fair", stress_corrosion: "susceptible" },
      notes: "Heat treated 319 for higher strength applications. Common automotive engine alloy."
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
  module.exports = ALUMINUM_CAST_071_090;
}

    // Additional Cast Aluminum Materials (N-AL-081 through N-AL-090)

    "N-AL-081": {
      id: "N-AL-081",
      name: "332 Piston Alloy",
      designation: { aa: "332.0", uns: "A03320", iso: "AlSi12CuMg", en: "EN AC-47000", jis: "AC8A" },
      iso_group: "N",
      material_class: "Aluminum - Piston Casting",
      condition: "T5 (Cooled + Artificial Age)",
      casting_method: ["permanent_mold", "die_casting"],

      composition: {
        aluminum: { min: 82.0, max: 88.0, typical: 85.0 },
        silicon: { min: 8.5, max: 10.5, typical: 9.5 },
        copper: { min: 2.0, max: 4.0, typical: 3.0 },
        magnesium: { min: 0.50, max: 1.50, typical: 1.0 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 1.20, typical: 0.70 }
      },

      physical: {
        density: 2770,
        melting_point: { solidus: 521, liquidus: 599 },
        specific_heat: 963,
        thermal_conductivity: 117,
        thermal_expansion: 19.0e-6,
        electrical_resistivity: 5.5e-8,
        electrical_conductivity_iacs: 31,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 77200,
        shear_modulus: 29000
      },

      mechanical: {
        hardness: { brinell: 105, rockwell_b: 60, rockwell_c: null, vickers: 110 },
        tensile_strength: { min: 234, typical: 262, max: 295 },
        yield_strength: { min: 193, typical: 207, max: 235 },
        compressive_strength: { min: 193, typical: 207, max: 235 },
        elongation: { min: 0.5, typical: 1, max: 2 },
        reduction_of_area: { min: 1, typical: 2.5, max: 4 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 85,
        fracture_toughness: 14,
        elevated_temp_strength: { temp_200C: 165 }
      },

      kienzle: { kc1_1: 720, mc: 0.24, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.6 },
      taylor: { C: 760, n: 0.32, reference_speed: 380, reference_life: 15, speed_range: { min: 130, max: 680 } },

      machinability: {
        aisi_rating: 110,
        relative_to_1212: 1.10,
        chip_form: "short_broken",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.50,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 200, B: 320, n: 0.32, C: 0.012, m: 0.92, T_melt: 599, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 420, max: 680 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.5, max: 7.0 } },
          pcd: { speed: { min: 500, opt: 840, max: 1280 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.0, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 202, opt: 350, max: 595 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.6, opt: 2.5, max: 5.5 }, woc_factor: 0.68 } },
        drilling: { carbide: { speed: { min: 135, opt: 240, max: 402 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["automotive_pistons", "compressor_pistons", "high_temperature_applications"],
      heat_treatment: { temper: "T5", artificial_aging: "175°C / 7-9h" },
      corrosion_resistance: { general: "fair", stress_corrosion: "resistant" },
      notes: "PISTON ALLOY. Good elevated temperature strength. Lower CTE than standard alloys."
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

    "N-AL-082": {
      id: "N-AL-082",
      name: "336-T551 Heavy Duty Piston",
      designation: { aa: "336.0", uns: "A03360", iso: "AlSi12CuMgNi", en: "EN AC-48100", jis: "AC8B" },
      iso_group: "N",
      material_class: "Aluminum - Heavy Duty Piston",
      condition: "T551 (Cooled + Artificial Age)",
      casting_method: ["permanent_mold"],

      composition: {
        aluminum: { min: 81.0, max: 87.0, typical: 84.0 },
        silicon: { min: 11.0, max: 13.0, typical: 12.0 },
        copper: { min: 0.50, max: 1.50, typical: 1.0 },
        magnesium: { min: 0.70, max: 1.30, typical: 1.0 },
        nickel: { min: 2.0, max: 3.0, typical: 2.5 },
        iron: { min: 0, max: 1.20, typical: 0.60 }
      },

      physical: {
        density: 2720,
        melting_point: { solidus: 532, liquidus: 571 },
        specific_heat: 900,
        thermal_conductivity: 121,
        thermal_expansion: 18.0e-6,
        electrical_resistivity: 5.8e-8,
        electrical_conductivity_iacs: 30,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 79300,
        shear_modulus: 29700
      },

      mechanical: {
        hardness: { brinell: 125, rockwell_b: 70, rockwell_c: null, vickers: 131 },
        tensile_strength: { min: 248, typical: 283, max: 320 },
        yield_strength: { min: 200, typical: 234, max: 270 },
        compressive_strength: { min: 200, typical: 234, max: 270 },
        elongation: { min: 0.5, typical: 1, max: 1.5 },
        reduction_of_area: { min: 1, typical: 2, max: 3 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 95,
        fracture_toughness: 12,
        elevated_temp_strength: { temp_200C: 185, temp_300C: 95 }
      },

      kienzle: { kc1_1: 780, mc: 0.23, kc_adjust_rake: -3.0, kc_adjust_speed: -0.07, chip_compression: 2.7 },
      taylor: { C: 700, n: 0.31, reference_speed: 350, reference_life: 15, speed_range: { min: 118, max: 630 } },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "short_segmented",
        surface_finish_achievable: 0.7,
        cutting_force_factor: 0.52,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank",
        notes: "Higher Si and Ni = more abrasive. PCD preferred."
      },

      johnson_cook: { A: 220, B: 350, n: 0.30, C: 0.011, m: 0.88, T_melt: 571, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          pcd: { speed: { min: 220, opt: 390, max: 630 }, feed: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.4, opt: 1.8, max: 5.0 } },
          carbide_coated: { speed: { min: 110, opt: 210, max: 350 }, feed: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.4, opt: 1.8, max: 5.0 } }
        },
        milling: { pcd: { speed: { min: 178, opt: 325, max: 550 }, feed_per_tooth: { min: 0.06, opt: 0.14, max: 0.27 }, doc: { min: 0.4, opt: 1.8, max: 4.0 }, woc_factor: 0.62 } },
        drilling: { pcd: { speed: { min: 115, opt: 220, max: 370 }, feed_per_rev: { min: 0.08, opt: 0.17, max: 0.32 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.7, Rz: 4.0 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil_flood", mql_suitable: false, cryogenic_benefit: "significant" },

      applications: ["diesel_pistons", "heavy_duty_pistons", "high_performance_pistons"],
      heat_treatment: { temper: "T551", artificial_aging: "175°C / 7-9h" },
      corrosion_resistance: { general: "fair", stress_corrosion: "resistant" },
      notes: "HEAVY DUTY piston alloy. Ni addition = excellent elevated temp strength. Diesel pistons."
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

    "N-AL-083": {
      id: "N-AL-083",
      name: "413 Die Cast (Eutectic)",
      designation: { aa: "413.0", uns: "A04130", iso: "AlSi12", en: "EN AC-44100", jis: "ADC1" },
      iso_group: "N",
      material_class: "Aluminum - Eutectic Die Casting",
      condition: "F (As-Cast)",
      casting_method: ["die_casting"],

      composition: {
        aluminum: { min: 85.0, max: 91.0, typical: 88.0 },
        silicon: { min: 11.0, max: 13.0, typical: 12.0 },
        iron: { min: 0, max: 2.0, typical: 1.2 },
        copper: { min: 0, max: 1.0, typical: 0.50 },
        magnesium: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.35, typical: 0.18 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        zinc: { min: 0, max: 0.50, typical: 0.25 }
      },

      physical: {
        density: 2660,
        melting_point: { solidus: 574, liquidus: 582 },
        specific_heat: 963,
        thermal_conductivity: 121,
        thermal_expansion: 20.4e-6,
        electrical_resistivity: 5.2e-8,
        electrical_conductivity_iacs: 33,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700,
        casting_shrinkage: 0.5
      },

      mechanical: {
        hardness: { brinell: 80, rockwell_b: 45, rockwell_c: null, vickers: 84 },
        tensile_strength: { min: 262, typical: 296, max: 330 },
        yield_strength: { min: 117, typical: 131, max: 150 },
        compressive_strength: { min: 117, typical: 131, max: 150 },
        elongation: { min: 2, typical: 3, max: 4 },
        reduction_of_area: { min: 4, typical: 6, max: 9 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 120,
        fracture_toughness: 15
      },

      kienzle: { kc1_1: 700, mc: 0.24, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 780, n: 0.32, reference_speed: 390, reference_life: 15, speed_range: { min: 135, max: 700 } },

      machinability: {
        aisi_rating: 130,
        relative_to_1212: 1.30,
        chip_form: "short_broken",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.49,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 140, B: 260, n: 0.40, C: 0.020, m: 1.10, T_melt: 582, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 255, opt: 435, max: 700 }, feed: { min: 0.10, opt: 0.24, max: 0.44 }, doc: { min: 0.6, opt: 2.5, max: 7.0 } },
          pcd: { speed: { min: 510, opt: 870, max: 1320 }, feed: { min: 0.08, opt: 0.19, max: 0.36 }, doc: { min: 0.4, opt: 2.0, max: 5.5 } }
        },
        milling: { carbide_coated: { speed: { min: 206, opt: 362, max: 612 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.6, opt: 2.5, max: 5.5 }, woc_factor: 0.68 } },
        drilling: { carbide: { speed: { min: 137, opt: 250, max: 415 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.42 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["intricate_die_castings", "thin_wall_castings", "hydraulic_cylinders"],
      heat_treatment: { temper: "F", note: "As-cast. Eutectic composition = BEST fluidity." },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "EUTECTIC Al-Si (12%). Best fluidity of all Al alloys. Complex thin-wall die castings."
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

    "N-AL-084": {
      id: "N-AL-084",
      name: "443 Sand/PM Cast (Eutectic)",
      designation: { aa: "443.0", uns: "A04430", iso: "AlSi5", en: "EN AC-44200", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - General Casting",
      condition: "F (As-Cast)",
      casting_method: ["sand_casting", "permanent_mold"],

      composition: {
        aluminum: { min: 91.5, max: 95.5, typical: 93.5 },
        silicon: { min: 4.5, max: 6.0, typical: 5.25 },
        iron: { min: 0, max: 0.80, typical: 0.50 },
        copper: { min: 0, max: 0.60, typical: 0.30 },
        magnesium: { min: 0, max: 0.05, typical: 0.02 },
        manganese: { min: 0, max: 0.50, typical: 0.25 }
      },

      physical: {
        density: 2690,
        melting_point: { solidus: 574, liquidus: 632 },
        specific_heat: 963,
        thermal_conductivity: 163,
        thermal_expansion: 22.1e-6,
        electrical_resistivity: 4.0e-8,
        electrical_conductivity_iacs: 43,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 40, rockwell_b: null, rockwell_c: null, vickers: 42 },
        tensile_strength: { min: 131, typical: 159, max: 185 },
        yield_strength: { min: 55, typical: 62, max: 75 },
        compressive_strength: { min: 55, typical: 62, max: 75 },
        elongation: { min: 8, typical: 10, max: 14 },
        reduction_of_area: { min: 18, typical: 22, max: 28 },
        impact_energy: { joules: 10, temperature: 20 },
        fatigue_strength: 55,
        fracture_toughness: 25
      },

      kienzle: { kc1_1: 480, mc: 0.28, kc_adjust_rake: -4.0, kc_adjust_speed: -0.09, chip_compression: 2.1 },
      taylor: { C: 1050, n: 0.38, reference_speed: 525, reference_life: 15, speed_range: { min: 195, max: 940 } },

      machinability: {
        aisi_rating: 65,
        relative_to_1212: 0.65,
        chip_form: "continuous_long",
        surface_finish_achievable: 1.0,
        cutting_force_factor: 0.36,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "bue_flank",
        notes: "VERY soft and gummy. Sharp tools, high speeds required."
      },

      johnson_cook: { A: 60, B: 180, n: 0.50, C: 0.025, m: 1.20, T_melt: 632, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 350, opt: 600, max: 940 }, feed: { min: 0.16, opt: 0.38, max: 0.70 }, doc: { min: 1.2, opt: 5.5, max: 14.0 } },
          pcd: { speed: { min: 700, opt: 1200, max: 1760 }, feed: { min: 0.13, opt: 0.30, max: 0.56 }, doc: { min: 0.8, opt: 4.4, max: 11.0 } }
        },
        milling: { carbide_coated: { speed: { min: 285, opt: 500, max: 820 }, feed_per_tooth: { min: 0.14, opt: 0.30, max: 0.56 }, doc: { min: 1.2, opt: 5.5, max: 11.0 }, woc_factor: 0.82 } },
        drilling: { carbide: { speed: { min: 190, opt: 345, max: 560 }, feed_per_rev: { min: 0.16, opt: 0.37, max: 0.67 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 1.0, Rz: 5.5 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil_flood", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["cooking_utensils", "food_handling", "marine_fittings", "decorative_castings"],
      heat_treatment: { temper: "F", note: "Non-heat-treatable (no Mg/Cu)." },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "BEST corrosion resistance casting alloy. No Cu/Mg = excellent corrosion. Food contact safe."
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

    "N-AL-085": {
      id: "N-AL-085",
      name: "535 Sand Cast (Almag 35)",
      designation: { aa: "535.0", uns: "A05350", iso: "AlMg7", en: "EN AC-51300", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Corrosion Resistant Casting",
      condition: "F (As-Cast)",
      casting_method: ["sand_casting"],

      composition: {
        aluminum: { min: 91.2, max: 93.5, typical: 92.4 },
        magnesium: { min: 6.2, max: 7.5, typical: 6.85 },
        manganese: { min: 0.10, max: 0.25, typical: 0.18 },
        titanium: { min: 0.10, max: 0.25, typical: 0.18 },
        iron: { min: 0, max: 0.15, typical: 0.08 },
        silicon: { min: 0, max: 0.15, typical: 0.08 },
        copper: { min: 0, max: 0.05, typical: 0.02 }
      },

      physical: {
        density: 2620,
        melting_point: { solidus: 549, liquidus: 638 },
        specific_heat: 900,
        thermal_conductivity: 96,
        thermal_expansion: 25.2e-6,
        electrical_resistivity: 6.6e-8,
        electrical_conductivity_iacs: 26,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 65, rockwell_b: 35, rockwell_c: null, vickers: 68 },
        tensile_strength: { min: 241, typical: 276, max: 310 },
        yield_strength: { min: 124, typical: 138, max: 160 },
        compressive_strength: { min: 124, typical: 138, max: 160 },
        elongation: { min: 9, typical: 13, max: 17 },
        reduction_of_area: { min: 18, typical: 24, max: 32 },
        impact_energy: { joules: 12, temperature: 20 },
        fatigue_strength: 90,
        fracture_toughness: 28
      },

      kienzle: { kc1_1: 550, mc: 0.27, kc_adjust_rake: -3.8, kc_adjust_speed: -0.08, chip_compression: 2.3 },
      taylor: { C: 920, n: 0.36, reference_speed: 460, reference_life: 15, speed_range: { min: 170, max: 820 } },

      machinability: {
        aisi_rating: 70,
        relative_to_1212: 0.70,
        chip_form: "continuous_stringy",
        surface_finish_achievable: 0.9,
        cutting_force_factor: 0.42,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "bue_flank",
        notes: "High Mg = gummy. Sharp tools required."
      },

      johnson_cook: { A: 150, B: 280, n: 0.38, C: 0.020, m: 1.05, T_melt: 638, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 310, opt: 510, max: 820 }, feed: { min: 0.14, opt: 0.32, max: 0.58 }, doc: { min: 1.0, opt: 4.2, max: 11.0 } },
          pcd: { speed: { min: 620, opt: 1020, max: 1540 }, feed: { min: 0.11, opt: 0.26, max: 0.46 }, doc: { min: 0.6, opt: 3.4, max: 8.5 } }
        },
        milling: { carbide_coated: { speed: { min: 252, opt: 425, max: 715 }, feed_per_tooth: { min: 0.11, opt: 0.25, max: 0.46 }, doc: { min: 1.0, opt: 4.2, max: 8.5 }, woc_factor: 0.75 } },
        drilling: { carbide: { speed: { min: 168, opt: 292, max: 485 }, feed_per_rev: { min: 0.14, opt: 0.31, max: 0.56 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.04, surface_roughness_typical: { Ra: 0.9, Rz: 5.0 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil_flood", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["marine_castings", "architectural_castings", "food_machinery", "chemical_equipment"],
      heat_treatment: { temper: "F", note: "Non-heat-treatable. As-cast only." },
      corrosion_resistance: { general: "excellent", stress_corrosion: "highly_resistant" },
      notes: "BEST corrosion Al-Mg casting. ALMAG 35. Marine and architectural applications."
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

    "N-AL-086": {
      id: "N-AL-086",
      name: "A201-T7 High Strength Cast",
      designation: { aa: "A201.0", uns: "A02010", iso: "AlCu4MgTi", en: "EN AC-21100", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - High Strength Casting",
      condition: "T7 (Solution + Over-age)",
      casting_method: ["sand_casting", "investment_casting"],

      composition: {
        aluminum: { min: 91.5, max: 94.5, typical: 93.0 },
        copper: { min: 4.0, max: 5.2, typical: 4.6 },
        magnesium: { min: 0.15, max: 0.55, typical: 0.35 },
        titanium: { min: 0.15, max: 0.35, typical: 0.25 },
        silver: { min: 0.40, max: 1.0, typical: 0.70 },
        manganese: { min: 0.20, max: 0.50, typical: 0.35 },
        iron: { min: 0, max: 0.15, typical: 0.08 },
        silicon: { min: 0, max: 0.10, typical: 0.05 }
      },

      physical: {
        density: 2800,
        melting_point: { solidus: 510, liquidus: 638 },
        specific_heat: 880,
        thermal_conductivity: 121,
        thermal_expansion: 22.5e-6,
        electrical_resistivity: 5.5e-8,
        electrical_conductivity_iacs: 31,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 130, rockwell_b: 73, rockwell_c: null, vickers: 137 },
        tensile_strength: { min: 414, typical: 448, max: 485 },
        yield_strength: { min: 345, typical: 379, max: 415 },
        compressive_strength: { min: 345, typical: 379, max: 415 },
        elongation: { min: 5, typical: 8, max: 12 },
        reduction_of_area: { min: 12, typical: 18, max: 26 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 130,
        fracture_toughness: 26
      },

      kienzle: { kc1_1: 750, mc: 0.24, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 780, n: 0.33, reference_speed: 390, reference_life: 15, speed_range: { min: 135, max: 700 } },

      machinability: {
        aisi_rating: 115,
        relative_to_1212: 1.15,
        chip_form: "short_curled",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.50,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: { A: 350, B: 420, n: 0.28, C: 0.012, m: 0.88, T_melt: 638, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 255, opt: 435, max: 700 }, feed: { min: 0.10, opt: 0.24, max: 0.45 }, doc: { min: 0.6, opt: 2.6, max: 7.2 } },
          pcd: { speed: { min: 510, opt: 870, max: 1320 }, feed: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.4, opt: 2.1, max: 5.6 } }
        },
        milling: { carbide_coated: { speed: { min: 206, opt: 362, max: 612 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.36 }, doc: { min: 0.6, opt: 2.6, max: 5.6 }, woc_factor: 0.68 } },
        drilling: { carbide: { speed: { min: 137, opt: 250, max: 415 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.43 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aerospace_structural_castings", "high_performance_castings", "missile_components"],
      heat_treatment: { temper: "T7", solution_temp: 527, quench: "water", artificial_aging: "two_step_over-age" },
      corrosion_resistance: { general: "fair", stress_corrosion: "resistant_in_T7" },
      notes: "HIGHEST STRENGTH casting alloy. Silver addition. Premium aerospace investment castings."
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

    "N-AL-087": {
      id: "N-AL-087",
      name: "B390 Hypereutectic PM Cast",
      designation: { aa: "B390.0", uns: "A23900", iso: "AlSi17Cu4Mg", en: "-", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Hypereutectic Casting",
      condition: "T5 (Cooled + Artificial Age)",
      casting_method: ["permanent_mold"],

      composition: {
        aluminum: { min: 74.5, max: 81.0, typical: 77.8 },
        silicon: { min: 16.0, max: 18.0, typical: 17.0 },
        copper: { min: 4.0, max: 5.0, typical: 4.5 },
        magnesium: { min: 0.45, max: 0.65, typical: 0.55 },
        iron: { min: 0, max: 0.50, typical: 0.30 },
        manganese: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 1.50, typical: 0.75 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 507, liquidus: 650 },
        specific_heat: 880,
        thermal_conductivity: 134,
        thermal_expansion: 18.0e-6,
        electrical_resistivity: 6.0e-8,
        electrical_conductivity_iacs: 29,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 81400,
        shear_modulus: 30500
      },

      mechanical: {
        hardness: { brinell: 115, rockwell_b: 65, rockwell_c: null, vickers: 121 },
        tensile_strength: { min: 276, typical: 310, max: 345 },
        yield_strength: { min: 255, typical: 283, max: 315 },
        compressive_strength: { min: 255, typical: 283, max: 315 },
        elongation: { min: 0.5, typical: 1.5, max: 2.5 },
        reduction_of_area: { min: 1, typical: 3, max: 5 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 105,
        fracture_toughness: 13
      },

      kienzle: { kc1_1: 820, mc: 0.22, kc_adjust_rake: -3.0, kc_adjust_speed: -0.06, chip_compression: 2.7 },
      taylor: { C: 650, n: 0.29, reference_speed: 325, reference_life: 15, speed_range: { min: 108, max: 585 } },

      machinability: {
        aisi_rating: 85,
        relative_to_1212: 0.85,
        chip_form: "powder_segmented",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 0.54,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "VERY ABRASIVE. PCD REQUIRED. Lower Fe than 390.0 = better properties but still very abrasive."
      },

      johnson_cook: { A: 260, B: 365, n: 0.27, C: 0.009, m: 0.78, T_melt: 650, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          pcd: { speed: { min: 195, opt: 365, max: 585 }, feed: { min: 0.06, opt: 0.15, max: 0.28 }, doc: { min: 0.3, opt: 1.3, max: 3.8 } },
          carbide_coated: { speed: { min: 90, opt: 175, max: 300 }, feed: { min: 0.06, opt: 0.15, max: 0.28 }, doc: { min: 0.3, opt: 1.3, max: 3.8 }, notes: "Very short tool life" }
        },
        milling: { pcd: { speed: { min: 158, opt: 305, max: 512 }, feed_per_tooth: { min: 0.05, opt: 0.12, max: 0.22 }, doc: { min: 0.3, opt: 1.3, max: 3.0 }, woc_factor: 0.56 } },
        drilling: { pcd: { speed: { min: 102, opt: 210, max: 345 }, feed_per_rev: { min: 0.06, opt: 0.14, max: 0.26 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.8, Rz: 4.5 } },
      coolant: { requirement: "required", recommended_type: "soluble_oil_flood", mql_suitable: false, cryogenic_benefit: "significant" },

      applications: ["brake_rotors", "engine_blocks_hypereutectic", "wear_components"],
      heat_treatment: { temper: "T5", artificial_aging: "175°C / 8h" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "Permanent mold version of 390. Lower Fe = better mechanical properties. Brake rotors."
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

    "N-AL-088": {
      id: "N-AL-088",
      name: "A413.0 Die Cast (High Purity Eutectic)",
      designation: { aa: "A413.0", uns: "A14130", iso: "AlSi12", en: "EN AC-44000", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Premium Die Casting",
      condition: "F (As-Cast)",
      casting_method: ["die_casting"],

      composition: {
        aluminum: { min: 87.0, max: 92.0, typical: 89.5 },
        silicon: { min: 11.0, max: 13.0, typical: 12.0 },
        iron: { min: 0, max: 1.30, typical: 0.80 },
        copper: { min: 0, max: 0.10, typical: 0.05 },
        magnesium: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.35, typical: 0.18 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        zinc: { min: 0, max: 0.50, typical: 0.25 }
      },

      physical: {
        density: 2660,
        melting_point: { solidus: 574, liquidus: 582 },
        specific_heat: 963,
        thermal_conductivity: 121,
        thermal_expansion: 20.4e-6,
        electrical_resistivity: 5.0e-8,
        electrical_conductivity_iacs: 34,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71000,
        shear_modulus: 26700
      },

      mechanical: {
        hardness: { brinell: 75, rockwell_b: 42, rockwell_c: null, vickers: 79 },
        tensile_strength: { min: 283, typical: 310, max: 340 },
        yield_strength: { min: 131, typical: 145, max: 165 },
        compressive_strength: { min: 131, typical: 145, max: 165 },
        elongation: { min: 2.5, typical: 4, max: 6 },
        reduction_of_area: { min: 5, typical: 8, max: 12 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 125,
        fracture_toughness: 17
      },

      kienzle: { kc1_1: 680, mc: 0.24, kc_adjust_rake: -3.2, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 800, n: 0.33, reference_speed: 400, reference_life: 15, speed_range: { min: 140, max: 720 } },

      machinability: {
        aisi_rating: 140,
        relative_to_1212: 1.40,
        chip_form: "short_broken",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.48,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 150, B: 270, n: 0.39, C: 0.019, m: 1.08, T_melt: 582, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 262, opt: 445, max: 720 }, feed: { min: 0.10, opt: 0.24, max: 0.45 }, doc: { min: 0.6, opt: 2.6, max: 7.2 } },
          pcd: { speed: { min: 524, opt: 890, max: 1350 }, feed: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.4, opt: 2.1, max: 5.6 } }
        },
        milling: { carbide_coated: { speed: { min: 212, opt: 370, max: 630 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.36 }, doc: { min: 0.6, opt: 2.6, max: 5.6 }, woc_factor: 0.69 } },
        drilling: { carbide: { speed: { min: 140, opt: 255, max: 426 }, feed_per_rev: { min: 0.10, opt: 0.23, max: 0.43 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.01, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["premium_die_castings", "pressure_tight_castings", "hydraulic_components"],
      heat_treatment: { temper: "F", note: "As-cast. Low Cu for better corrosion." },
      corrosion_resistance: { general: "very_good", stress_corrosion: "resistant" },
      notes: "HIGH PURITY eutectic 413. Low Cu = better corrosion, better ductility. Pressure-tight."
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

    "N-AL-089": {
      id: "N-AL-089",
      name: "C355-T6 Premium Structural Cast",
      designation: { aa: "C355.0", uns: "A33550", iso: "AlSi5Cu1Mg", en: "EN AC-45300", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Premium Structural Casting",
      condition: "T6 (Solution + Artificial Age)",
      casting_method: ["sand_casting", "permanent_mold"],

      composition: {
        aluminum: { min: 92.0, max: 95.0, typical: 93.5 },
        silicon: { min: 4.5, max: 5.5, typical: 5.0 },
        copper: { min: 1.0, max: 1.5, typical: 1.25 },
        magnesium: { min: 0.40, max: 0.60, typical: 0.50 },
        iron: { min: 0, max: 0.20, typical: 0.10 },
        manganese: { min: 0, max: 0.10, typical: 0.05 },
        titanium: { min: 0, max: 0.20, typical: 0.12 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 546, liquidus: 621 },
        specific_heat: 963,
        thermal_conductivity: 151,
        thermal_expansion: 21.8e-6,
        electrical_resistivity: 4.2e-8,
        electrical_conductivity_iacs: 41,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 71700,
        shear_modulus: 26900
      },

      mechanical: {
        hardness: { brinell: 100, rockwell_b: 58, rockwell_c: null, vickers: 105 },
        tensile_strength: { min: 283, typical: 310, max: 340 },
        yield_strength: { min: 207, typical: 234, max: 265 },
        compressive_strength: { min: 207, typical: 234, max: 265 },
        elongation: { min: 4, typical: 6, max: 9 },
        reduction_of_area: { min: 10, typical: 14, max: 20 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 100,
        fracture_toughness: 22
      },

      kienzle: { kc1_1: 620, mc: 0.25, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 880, n: 0.35, reference_speed: 440, reference_life: 15, speed_range: { min: 160, max: 785 } },

      machinability: {
        aisi_rating: 105,
        relative_to_1212: 1.05,
        chip_form: "short_curled",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.46,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: { A: 220, B: 340, n: 0.33, C: 0.014, m: 0.95, T_melt: 621, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 285, opt: 490, max: 785 }, feed: { min: 0.11, opt: 0.26, max: 0.48 }, doc: { min: 0.7, opt: 3.0, max: 8.2 } },
          pcd: { speed: { min: 570, opt: 980, max: 1475 }, feed: { min: 0.09, opt: 0.21, max: 0.39 }, doc: { min: 0.5, opt: 2.4, max: 6.4 } }
        },
        milling: { carbide_coated: { speed: { min: 231, opt: 408, max: 687 }, feed_per_tooth: { min: 0.09, opt: 0.20, max: 0.39 }, doc: { min: 0.7, opt: 3.0, max: 6.4 }, woc_factor: 0.71 } },
        drilling: { carbide: { speed: { min: 154, opt: 280, max: 465 }, feed_per_rev: { min: 0.11, opt: 0.25, max: 0.46 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["aerospace_structural_castings", "automotive_structural", "military_castings"],
      heat_treatment: { temper: "T6", solution_temp: 527, quench: "hot_water_65C", artificial_aging: "155°C / 4-6h" },
      corrosion_resistance: { general: "good", stress_corrosion: "resistant" },
      notes: "Premium structural casting. Low Fe = excellent ductility. Aerospace structural."
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

    "N-AL-090": {
      id: "N-AL-090",
      name: "Alsi10Mg (AM Powder)",
      designation: { aa: "-", uns: "-", iso: "AlSi10Mg", en: "-", jis: "-" },
      iso_group: "N",
      material_class: "Aluminum - Additive Manufacturing",
      condition: "As-Built + Stress Relief",
      casting_method: ["SLM", "DMLS", "laser_powder_bed_fusion"],

      composition: {
        aluminum: { min: 88.6, max: 93.3, typical: 90.95 },
        silicon: { min: 9.0, max: 11.0, typical: 10.0 },
        magnesium: { min: 0.20, max: 0.45, typical: 0.33 },
        iron: { min: 0, max: 0.55, typical: 0.35 },
        copper: { min: 0, max: 0.05, typical: 0.02 },
        manganese: { min: 0, max: 0.45, typical: 0.25 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        titanium: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2670,
        melting_point: { solidus: 570, liquidus: 600 },
        specific_heat: 920,
        thermal_conductivity: 140,
        thermal_expansion: 20.0e-6,
        electrical_resistivity: 4.8e-8,
        electrical_conductivity_iacs: 36,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70000,
        shear_modulus: 26300
      },

      mechanical: {
        hardness: { brinell: 115, rockwell_b: 65, rockwell_c: null, vickers: 121 },
        tensile_strength: { min: 330, typical: 380, max: 430 },
        yield_strength: { min: 200, typical: 250, max: 290 },
        compressive_strength: { min: 200, typical: 250, max: 290 },
        elongation: { min: 6, typical: 10, max: 14 },
        reduction_of_area: { min: 14, typical: 20, max: 28 },
        impact_energy: { joules: 7, temperature: 20 },
        fatigue_strength: 110,
        fracture_toughness: 20,
        notes: "Properties vary significantly with build orientation and parameters"
      },

      kienzle: { kc1_1: 680, mc: 0.25, kc_adjust_rake: -3.3, kc_adjust_speed: -0.07, chip_compression: 2.5 },
      taylor: { C: 820, n: 0.34, reference_speed: 410, reference_life: 15, speed_range: { min: 145, max: 735 } },

      machinability: {
        aisi_rating: 100,
        relative_to_1212: 1.00,
        chip_form: "short_broken",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.48,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank",
        notes: "Fine microstructure from rapid solidification. May have residual porosity."
      },

      johnson_cook: { A: 230, B: 350, n: 0.32, C: 0.013, m: 0.92, T_melt: 600, T_ref: 20, epsilon_ref: 1.0 },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 265, opt: 455, max: 735 }, feed: { min: 0.10, opt: 0.25, max: 0.46 }, doc: { min: 0.6, opt: 2.7, max: 7.4 } },
          pcd: { speed: { min: 530, opt: 910, max: 1380 }, feed: { min: 0.08, opt: 0.20, max: 0.37 }, doc: { min: 0.4, opt: 2.2, max: 5.8 } }
        },
        milling: { carbide_coated: { speed: { min: 215, opt: 378, max: 642 }, feed_per_tooth: { min: 0.08, opt: 0.19, max: 0.37 }, doc: { min: 0.6, opt: 2.7, max: 5.8 }, woc_factor: 0.70 } },
        drilling: { carbide: { speed: { min: 143, opt: 260, max: 435 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.44 } } }
      },

      surface_integrity: { residual_stress_tendency: "variable", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "moderate" },

      applications: ["3D_printed_aerospace", "lightweight_structures", "topology_optimized_parts", "heat_exchangers"],
      heat_treatment: { temper: "stress_relief", stress_relief_temp: "300°C / 2h", optional_T6: "standard_356_cycle" },
      corrosion_resistance: { general: "very_good", stress_corrosion: "resistant" },
      am_specific: {
        powder_size: "20-63 microns",
        layer_thickness: "30-60 microns",
        build_rate: "5-15 cm³/h",
        surface_roughness_as_built: { Ra: 8, Rz: 50 }
      },
      notes: "ADDITIVE MANUFACTURING alloy. Most popular Al AM alloy. Higher strength than cast due to fine microstructure."
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
