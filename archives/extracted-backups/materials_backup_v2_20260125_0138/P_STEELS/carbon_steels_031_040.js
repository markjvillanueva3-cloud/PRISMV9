/**
 * PRISM MATERIALS DATABASE - Carbon Steels Part 4
 * File: carbon_steels_031_040.js
 * Materials: P-CS-031 through P-CS-040
 * 
 * ISO Category: P (Steels)
 * Sub-category: Medium Carbon Steels (1037-1043 series)
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * 
 * Created: 2026-01-23
 * Last Updated: 2026-01-23
 */

const CARBON_STEELS_031_040 = {
  metadata: {
    file: "carbon_steels_031_040.js",
    category: "P_STEELS",
    subcategory: "Medium Carbon Steels",
    materialCount: 10,
    idRange: { start: "P-CS-031", end: "P-CS-040" },
    schemaVersion: "3.0.0",
    created: "2026-01-23",
    lastUpdated: "2026-01-23"
  },

  materials: {
    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-031: AISI 1037 Normalized
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-031": {
      // SECTION 1: IDENTIFICATION (6 parameters)
      id: "P-CS-031",
      name: "AISI 1037 Normalized",
      designation: { aisi_sae: "1037", uns: "G10370", din: "1.0535", jis: "S35C", en: "C35E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Normalized",

      // SECTION 2: COMPOSITION (16 parameters)
      composition: {
        carbon: { min: 0.32, max: 0.38, typical: 0.37 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },

      // SECTION 3: PHYSICAL PROPERTIES (10 parameters)
      physical: {
        density: 7850,
        melting_point: { solidus: 1460, liquidus: 1510 },
        specific_heat: 486,
        thermal_conductivity: 49.8,
        thermal_expansion: 11.7e-6,
        electrical_resistivity: 17.5e-8,
        magnetic_permeability: 700,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      // SECTION 4: MECHANICAL PROPERTIES (12 parameters)
      mechanical: {
        hardness: { brinell: 170, rockwell_b: 86, rockwell_c: null, vickers: 178 },
        tensile_strength: { min: 540, typical: 570, max: 610 },
        yield_strength: { min: 290, typical: 315, max: 345 },
        elongation: { min: 20, typical: 24, max: 28 },
        reduction_of_area: { min: 45, typical: 52, max: 58 },
        impact_energy: { joules: 70, temperature: 20 },
        fatigue_strength: 250,
        fracture_toughness: 110
      },

      // SECTION 5: CUTTING FORCE MODEL - KIENZLE (8 parameters)
      kienzle: {
        kc1_1: 1780,
        mc: 0.25,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.014,
        chip_thickness_exponent: 0.75,
        cutting_edge_correction: 1.05,
        engagement_factor: 1.0
      },

      // SECTION 6: CONSTITUTIVE MODEL - JOHNSON-COOK (7 parameters)
      johnson_cook: {
        A: 340,
        B: 560,
        C: 0.034,
        n: 0.28,
        m: 1.0,
        melting_temp: 1510,
        reference_strain_rate: 1.0
      },

      // SECTION 7: TOOL LIFE MODEL - TAYLOR (6 parameters)
      taylor: {
        C: 290,
        n: 0.25,
        temperature_exponent: 2.2,
        hardness_factor: 0.88,
        coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.15 },
        depth_exponent: 0.12
      },

      // SECTION 8: CHIP FORMATION (8 parameters)
      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "moderate",
        optimal_chip_thickness: 0.11,
        shear_angle: 30,
        friction_coefficient: 0.48,
        chip_compression_ratio: 2.5
      },

      // SECTION 9: FRICTION/TRIBOLOGY (6 parameters)
      tribology: {
        sliding_friction: 0.46,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1120,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      // SECTION 10: THERMAL IN MACHINING (8 parameters)
      thermal_machining: {
        cutting_temperature_coefficient: 0.85,
        heat_partition_to_chip: 0.73,
        heat_partition_to_tool: 0.14,
        heat_partition_to_workpiece: 0.13,
        thermal_softening_onset: 430,
        recrystallization_temperature: 620,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      // SECTION 11: SURFACE INTEGRITY (8 parameters)
      surface_integrity: {
        achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.2, Ra_max: 4.5 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.12,
        microstructure_stability: "good",
        burr_formation: "moderate",
        surface_defect_sensitivity: "low",
        polishability: "good"
      },

      // SECTION 12: MACHINABILITY INDICES (8 parameters)
      machinability: {
        aisi_rating: 65,
        relative_to_1212: 0.65,
        power_factor: 0.90,
        tool_wear_factor: 0.88,
        surface_finish_factor: 0.85,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      // SECTION 13: RECOMMENDED PARAMETERS (18 parameters)
      recommendations: {
        turning: { speed: { min: 120, optimal: 150, max: 185, unit: "m/min" }, feed: { min: 0.15, optimal: 0.26, max: 0.42, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.8, max: 6.0, unit: "mm" } },
        milling: { speed: { min: 110, optimal: 140, max: 175, unit: "m/min" }, feed_per_tooth: { min: 0.10, optimal: 0.17, max: 0.26, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.2, max: 8.0, unit: "mm" }, radial_depth_percent: { min: 25, optimal: 50, max: 75 } },
        drilling: { speed: { min: 28, optimal: 38, max: 48, unit: "m/min" }, feed: { min: 0.10, optimal: 0.20, max: 0.30, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      // SECTION 14: STATISTICAL/CONFIDENCE (6 parameters)
      statistics: {
        data_quality: "high",
        sample_size: 165,
        confidence_level: 0.95,
        standard_deviation_kc: 88,
        last_validated: "2025-11-15",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-032: AISI 1038 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-032": {
      id: "P-CS-032",
      name: "AISI 1038 Hot Rolled",
      designation: { aisi_sae: "1038", uns: "G10380", din: "1.0501", jis: "S38C", en: "C38" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Hot Rolled",

      composition: {
        carbon: { min: 0.35, max: 0.42, typical: 0.38 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },

      physical: {
        density: 7850,
        melting_point: { solidus: 1455, liquidus: 1505 },
        specific_heat: 486,
        thermal_conductivity: 49.5,
        thermal_expansion: 11.7e-6,
        electrical_resistivity: 17.8e-8,
        magnetic_permeability: 680,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: { brinell: 149, rockwell_b: 80, rockwell_c: null, vickers: 156 },
        tensile_strength: { min: 490, typical: 520, max: 560 },
        yield_strength: { min: 260, typical: 285, max: 315 },
        elongation: { min: 22, typical: 26, max: 30 },
        reduction_of_area: { min: 48, typical: 54, max: 60 },
        impact_energy: { joules: 80, temperature: 20 },
        fatigue_strength: 235,
        fracture_toughness: 115
      },

      kienzle: { kc1_1: 1760, mc: 0.25, kc_temp_coefficient: -0.0015, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.75, cutting_edge_correction: 1.05, engagement_factor: 1.0 },
      johnson_cook: { A: 320, B: 550, C: 0.033, n: 0.29, m: 1.02, melting_temp: 1505, reference_strain_rate: 1.0 },
      taylor: { C: 300, n: 0.26, temperature_exponent: 2.1, hardness_factor: 0.90, coolant_factor: { dry: 1.0, flood: 1.36, mist: 1.14 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 30, friction_coefficient: 0.47, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.45, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1125, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.84, heat_partition_to_chip: 0.73, heat_partition_to_tool: 0.14, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 435, recrystallization_temperature: 625, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.2 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.11, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 66, relative_to_1212: 0.66, power_factor: 0.89, tool_wear_factor: 0.87, surface_finish_factor: 0.86, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 125, optimal: 155, max: 190, unit: "m/min" }, feed: { min: 0.15, optimal: 0.27, max: 0.43, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.9, max: 6.2, unit: "mm" } },
        milling: { speed: { min: 115, optimal: 145, max: 180, unit: "m/min" }, feed_per_tooth: { min: 0.10, optimal: 0.17, max: 0.27, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.3, max: 8.2, unit: "mm" }, radial_depth_percent: { min: 25, optimal: 52, max: 78 } },
        drilling: { speed: { min: 30, optimal: 40, max: 50, unit: "m/min" }, feed: { min: 0.11, optimal: 0.21, max: 0.31, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 170, confidence_level: 0.95, standard_deviation_kc: 85, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-033: AISI 1038 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-033": {
      id: "P-CS-033",
      name: "AISI 1038 Cold Drawn",
      designation: { aisi_sae: "1038", uns: "G10380", din: "1.0501", jis: "S38C", en: "C38" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Cold Drawn",

      composition: {
        carbon: { min: 0.35, max: 0.42, typical: 0.38 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },

      physical: {
        density: 7850,
        melting_point: { solidus: 1455, liquidus: 1505 },
        specific_heat: 486,
        thermal_conductivity: 49.5,
        thermal_expansion: 11.7e-6,
        electrical_resistivity: 17.8e-8,
        magnetic_permeability: 680,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80500
      },

      mechanical: {
        hardness: { brinell: 179, rockwell_b: 89, rockwell_c: null, vickers: 188 },
        tensile_strength: { min: 570, typical: 605, max: 650 },
        yield_strength: { min: 490, typical: 515, max: 550 },
        elongation: { min: 14, typical: 17, max: 21 },
        reduction_of_area: { min: 42, typical: 48, max: 55 },
        impact_energy: { joules: 55, temperature: 20 },
        fatigue_strength: 280,
        fracture_toughness: 95
      },

      kienzle: { kc1_1: 1850, mc: 0.26, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.09, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.06, engagement_factor: 1.0 },
      johnson_cook: { A: 490, B: 580, C: 0.035, n: 0.26, m: 0.98, melting_temp: 1505, reference_strain_rate: 1.0 },
      taylor: { C: 275, n: 0.24, temperature_exponent: 2.3, hardness_factor: 0.85, coolant_factor: { dry: 1.0, flood: 1.40, mist: 1.16 }, depth_exponent: 0.13 },
      chip_formation: { chip_type: "continuous", serration_tendency: "moderate", built_up_edge_tendency: "low", chip_breaking: "good", optimal_chip_thickness: 0.10, shear_angle: 28, friction_coefficient: 0.45, chip_compression_ratio: 2.6 },
      tribology: { sliding_friction: 0.43, adhesion_tendency: "low", galling_tendency: "low", welding_temperature: 1115, oxide_stability: "good", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.87, heat_partition_to_chip: 0.72, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 420, recrystallization_temperature: 610, hot_hardness_retention: "good", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.6, Ra_typical: 1.6, Ra_max: 3.2 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.08, microstructure_stability: "excellent", burr_formation: "low", surface_defect_sensitivity: "low", polishability: "excellent" },
      machinability: { aisi_rating: 62, relative_to_1212: 0.62, power_factor: 0.92, tool_wear_factor: 0.84, surface_finish_factor: 0.90, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 110, optimal: 140, max: 170, unit: "m/min" }, feed: { min: 0.12, optimal: 0.24, max: 0.38, unit: "mm/rev" }, depth: { min: 0.3, optimal: 2.2, max: 5.0, unit: "mm" } },
        milling: { speed: { min: 100, optimal: 130, max: 160, unit: "m/min" }, feed_per_tooth: { min: 0.08, optimal: 0.15, max: 0.24, unit: "mm" }, axial_depth: { min: 0.3, optimal: 2.5, max: 6.5, unit: "mm" }, radial_depth_percent: { min: 20, optimal: 45, max: 70 } },
        drilling: { speed: { min: 26, optimal: 35, max: 44, unit: "m/min" }, feed: { min: 0.09, optimal: 0.18, max: 0.27, unit: "mm/rev" } },
        preferred_tool_grades: ["P10", "P15", "P20"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_required"
      },
      statistics: { data_quality: "high", sample_size: 160, confidence_level: 0.95, standard_deviation_kc: 92, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-034: AISI 1040 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-034": {
      id: "P-CS-034",
      name: "AISI 1040 Annealed",
      designation: { aisi_sae: "1040", uns: "G10400", din: "1.0511", jis: "S40C", en: "C40E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Annealed",

      composition: {
        carbon: { min: 0.37, max: 0.44, typical: 0.40 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.7, typical: 98.3 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1450, liquidus: 1500 },
        specific_heat: 486,
        thermal_conductivity: 49.0,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 18.0e-8,
        magnetic_permeability: 660,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: { brinell: 149, rockwell_b: 80, rockwell_c: null, vickers: 156 },
        tensile_strength: { min: 480, typical: 515, max: 560 },
        yield_strength: { min: 250, typical: 275, max: 305 },
        elongation: { min: 24, typical: 28, max: 33 },
        reduction_of_area: { min: 50, typical: 58, max: 65 },
        impact_energy: { joules: 85, temperature: 20 },
        fatigue_strength: 230,
        fracture_toughness: 120
      },

      kienzle: { kc1_1: 1750, mc: 0.25, kc_temp_coefficient: -0.0015, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.75, cutting_edge_correction: 1.05, engagement_factor: 1.0 },
      johnson_cook: { A: 300, B: 545, C: 0.032, n: 0.30, m: 1.03, melting_temp: 1500, reference_strain_rate: 1.0 },
      taylor: { C: 310, n: 0.26, temperature_exponent: 2.1, hardness_factor: 0.91, coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.13 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.12, shear_angle: 31, friction_coefficient: 0.46, chip_compression_ratio: 2.4 },
      tribology: { sliding_friction: 0.44, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1130, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.83, heat_partition_to_chip: 0.74, heat_partition_to_tool: 0.13, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 440, recrystallization_temperature: 630, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.0 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.10, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 64, relative_to_1212: 0.64, power_factor: 0.88, tool_wear_factor: 0.88, surface_finish_factor: 0.87, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 130, optimal: 160, max: 195, unit: "m/min" }, feed: { min: 0.15, optimal: 0.28, max: 0.45, unit: "mm/rev" }, depth: { min: 0.5, optimal: 3.0, max: 6.5, unit: "mm" } },
        milling: { speed: { min: 120, optimal: 150, max: 185, unit: "m/min" }, feed_per_tooth: { min: 0.10, optimal: 0.18, max: 0.28, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.5, max: 8.5, unit: "mm" }, radial_depth_percent: { min: 25, optimal: 55, max: 80 } },
        drilling: { speed: { min: 32, optimal: 42, max: 52, unit: "m/min" }, feed: { min: 0.12, optimal: 0.22, max: 0.32, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 200, confidence_level: 0.95, standard_deviation_kc: 82, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-035: AISI 1040 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-035": {
      id: "P-CS-035",
      name: "AISI 1040 Hot Rolled",
      designation: { aisi_sae: "1040", uns: "G10400", din: "1.0511", jis: "S40C", en: "C40E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Hot Rolled",

      composition: {
        carbon: { min: 0.37, max: 0.44, typical: 0.40 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.7, typical: 98.3 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1450, liquidus: 1500 },
        specific_heat: 486,
        thermal_conductivity: 49.0,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 18.0e-8,
        magnetic_permeability: 660,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: { brinell: 170, rockwell_b: 86, rockwell_c: null, vickers: 178 },
        tensile_strength: { min: 540, typical: 575, max: 620 },
        yield_strength: { min: 290, typical: 320, max: 355 },
        elongation: { min: 20, typical: 24, max: 28 },
        reduction_of_area: { min: 45, typical: 52, max: 58 },
        impact_energy: { joules: 65, temperature: 20 },
        fatigue_strength: 255,
        fracture_toughness: 105
      },

      kienzle: { kc1_1: 1820, mc: 0.26, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.05, engagement_factor: 1.0 },
      johnson_cook: { A: 345, B: 565, C: 0.034, n: 0.28, m: 1.0, melting_temp: 1500, reference_strain_rate: 1.0 },
      taylor: { C: 285, n: 0.25, temperature_exponent: 2.2, hardness_factor: 0.87, coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.15 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 29, friction_coefficient: 0.48, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.46, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1115, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.86, heat_partition_to_chip: 0.72, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 425, recrystallization_temperature: 615, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.2, Ra_max: 4.5 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.12, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 60, relative_to_1212: 0.60, power_factor: 0.92, tool_wear_factor: 0.85, surface_finish_factor: 0.84, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 115, optimal: 145, max: 180, unit: "m/min" }, feed: { min: 0.14, optimal: 0.25, max: 0.40, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.7, max: 5.8, unit: "mm" } },
        milling: { speed: { min: 105, optimal: 135, max: 168, unit: "m/min" }, feed_per_tooth: { min: 0.09, optimal: 0.16, max: 0.25, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.0, max: 7.5, unit: "mm" }, radial_depth_percent: { min: 25, optimal: 50, max: 75 } },
        drilling: { speed: { min: 27, optimal: 36, max: 46, unit: "m/min" }, feed: { min: 0.10, optimal: 0.19, max: 0.29, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 195, confidence_level: 0.95, standard_deviation_kc: 90, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-036: AISI 1040 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-036": {
      id: "P-CS-036",
      name: "AISI 1040 Cold Drawn",
      designation: { aisi_sae: "1040", uns: "G10400", din: "1.0511", jis: "S40C", en: "C40E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Cold Drawn",

      composition: {
        carbon: { min: 0.37, max: 0.44, typical: 0.40 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.7, typical: 98.3 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1450, liquidus: 1500 },
        specific_heat: 486,
        thermal_conductivity: 49.0,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 18.0e-8,
        magnetic_permeability: 660,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80500
      },

      mechanical: {
        hardness: { brinell: 197, rockwell_b: 93, rockwell_c: 14, vickers: 207 },
        tensile_strength: { min: 620, typical: 660, max: 710 },
        yield_strength: { min: 530, typical: 560, max: 600 },
        elongation: { min: 12, typical: 15, max: 19 },
        reduction_of_area: { min: 40, typical: 46, max: 52 },
        impact_energy: { joules: 45, temperature: 20 },
        fatigue_strength: 305,
        fracture_toughness: 85
      },

      kienzle: { kc1_1: 1920, mc: 0.27, kc_temp_coefficient: -0.0017, kc_speed_coefficient: -0.09, rake_angle_correction: 0.014, chip_thickness_exponent: 0.77, cutting_edge_correction: 1.07, engagement_factor: 1.0 },
      johnson_cook: { A: 535, B: 600, C: 0.036, n: 0.25, m: 0.96, melting_temp: 1500, reference_strain_rate: 1.0 },
      taylor: { C: 255, n: 0.23, temperature_exponent: 2.4, hardness_factor: 0.82, coolant_factor: { dry: 1.0, flood: 1.42, mist: 1.18 }, depth_exponent: 0.13 },
      chip_formation: { chip_type: "continuous", serration_tendency: "moderate", built_up_edge_tendency: "low", chip_breaking: "good", optimal_chip_thickness: 0.09, shear_angle: 27, friction_coefficient: 0.44, chip_compression_ratio: 2.7 },
      tribology: { sliding_friction: 0.42, adhesion_tendency: "low", galling_tendency: "low", welding_temperature: 1100, oxide_stability: "good", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.89, heat_partition_to_chip: 0.71, heat_partition_to_tool: 0.16, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 410, recrystallization_temperature: 600, hot_hardness_retention: "good", thermal_shock_sensitivity: "moderate" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.5, Ra_typical: 1.4, Ra_max: 3.0 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.07, microstructure_stability: "excellent", burr_formation: "low", surface_defect_sensitivity: "low", polishability: "excellent" },
      machinability: { aisi_rating: 55, relative_to_1212: 0.55, power_factor: 0.95, tool_wear_factor: 0.80, surface_finish_factor: 0.92, chip_control_rating: "excellent", overall_rating: "moderate", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 100, optimal: 125, max: 155, unit: "m/min" }, feed: { min: 0.10, optimal: 0.20, max: 0.32, unit: "mm/rev" }, depth: { min: 0.3, optimal: 1.8, max: 4.0, unit: "mm" } },
        milling: { speed: { min: 90, optimal: 115, max: 145, unit: "m/min" }, feed_per_tooth: { min: 0.06, optimal: 0.12, max: 0.20, unit: "mm" }, axial_depth: { min: 0.3, optimal: 2.0, max: 5.5, unit: "mm" }, radial_depth_percent: { min: 18, optimal: 40, max: 65 } },
        drilling: { speed: { min: 22, optimal: 30, max: 38, unit: "m/min" }, feed: { min: 0.07, optimal: 0.15, max: 0.23, unit: "mm/rev" } },
        preferred_tool_grades: ["P10", "P15", "P20"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_required"
      },
      statistics: { data_quality: "high", sample_size: 185, confidence_level: 0.95, standard_deviation_kc: 98, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-037: AISI 1040 Normalized
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-037": {
      id: "P-CS-037",
      name: "AISI 1040 Normalized",
      designation: { aisi_sae: "1040", uns: "G10400", din: "1.0511", jis: "S40C", en: "C40E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Normalized",

      composition: {
        carbon: { min: 0.37, max: 0.44, typical: 0.40 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 98.0, max: 98.7, typical: 98.3 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1450, liquidus: 1500 },
        specific_heat: 486,
        thermal_conductivity: 49.0,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 18.0e-8,
        magnetic_permeability: 660,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: { brinell: 183, rockwell_b: 90, rockwell_c: null, vickers: 192 },
        tensile_strength: { min: 580, typical: 620, max: 670 },
        yield_strength: { min: 330, typical: 365, max: 405 },
        elongation: { min: 18, typical: 22, max: 26 },
        reduction_of_area: { min: 43, typical: 50, max: 56 },
        impact_energy: { joules: 58, temperature: 20 },
        fatigue_strength: 275,
        fracture_toughness: 98
      },

      kienzle: { kc1_1: 1870, mc: 0.26, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.06, engagement_factor: 1.0 },
      johnson_cook: { A: 385, B: 580, C: 0.035, n: 0.27, m: 0.98, melting_temp: 1500, reference_strain_rate: 1.0 },
      taylor: { C: 270, n: 0.24, temperature_exponent: 2.3, hardness_factor: 0.85, coolant_factor: { dry: 1.0, flood: 1.40, mist: 1.16 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "moderate", built_up_edge_tendency: "low", chip_breaking: "good", optimal_chip_thickness: 0.10, shear_angle: 28, friction_coefficient: 0.46, chip_compression_ratio: 2.6 },
      tribology: { sliding_friction: 0.44, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1110, oxide_stability: "good", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.87, heat_partition_to_chip: 0.72, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 415, recrystallization_temperature: 605, hot_hardness_retention: "good", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.7, Ra_typical: 1.8, Ra_max: 3.8 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.09, microstructure_stability: "good", burr_formation: "low", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 58, relative_to_1212: 0.58, power_factor: 0.93, tool_wear_factor: 0.83, surface_finish_factor: 0.88, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 108, optimal: 135, max: 165, unit: "m/min" }, feed: { min: 0.12, optimal: 0.22, max: 0.36, unit: "mm/rev" }, depth: { min: 0.4, optimal: 2.4, max: 5.2, unit: "mm" } },
        milling: { speed: { min: 98, optimal: 125, max: 155, unit: "m/min" }, feed_per_tooth: { min: 0.08, optimal: 0.14, max: 0.22, unit: "mm" }, axial_depth: { min: 0.4, optimal: 2.8, max: 7.0, unit: "mm" }, radial_depth_percent: { min: 22, optimal: 47, max: 72 } },
        drilling: { speed: { min: 25, optimal: 33, max: 42, unit: "m/min" }, feed: { min: 0.09, optimal: 0.17, max: 0.26, unit: "mm/rev" } },
        preferred_tool_grades: ["P10", "P15", "P20"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 175, confidence_level: 0.95, standard_deviation_kc: 93, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-038: AISI 1042 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-038": {
      id: "P-CS-038",
      name: "AISI 1042 Annealed",
      designation: { aisi_sae: "1042", uns: "G10420", din: "1.0517", jis: "S42C", en: "C42E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Annealed",

      composition: {
        carbon: { min: 0.40, max: 0.47, typical: 0.42 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 97.9, max: 98.6, typical: 98.2 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1445, liquidus: 1495 },
        specific_heat: 486,
        thermal_conductivity: 48.5,
        thermal_expansion: 11.9e-6,
        electrical_resistivity: 18.3e-8,
        magnetic_permeability: 640,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: { brinell: 156, rockwell_b: 82, rockwell_c: null, vickers: 163 },
        tensile_strength: { min: 510, typical: 545, max: 590 },
        yield_strength: { min: 270, typical: 295, max: 325 },
        elongation: { min: 22, typical: 26, max: 31 },
        reduction_of_area: { min: 48, typical: 55, max: 62 },
        impact_energy: { joules: 78, temperature: 20 },
        fatigue_strength: 245,
        fracture_toughness: 112
      },

      kienzle: { kc1_1: 1790, mc: 0.26, kc_temp_coefficient: -0.0015, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.05, engagement_factor: 1.0 },
      johnson_cook: { A: 320, B: 555, C: 0.033, n: 0.29, m: 1.02, melting_temp: 1495, reference_strain_rate: 1.0 },
      taylor: { C: 295, n: 0.25, temperature_exponent: 2.2, hardness_factor: 0.89, coolant_factor: { dry: 1.0, flood: 1.36, mist: 1.14 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 30, friction_coefficient: 0.47, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.45, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1120, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.84, heat_partition_to_chip: 0.73, heat_partition_to_tool: 0.14, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 432, recrystallization_temperature: 622, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.1, Ra_max: 4.2 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.10, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 62, relative_to_1212: 0.62, power_factor: 0.90, tool_wear_factor: 0.86, surface_finish_factor: 0.86, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 122, optimal: 152, max: 188, unit: "m/min" }, feed: { min: 0.14, optimal: 0.26, max: 0.42, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.8, max: 6.2, unit: "mm" } },
        milling: { speed: { min: 112, optimal: 142, max: 178, unit: "m/min" }, feed_per_tooth: { min: 0.09, optimal: 0.16, max: 0.26, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.2, max: 8.0, unit: "mm" }, radial_depth_percent: { min: 24, optimal: 52, max: 78 } },
        drilling: { speed: { min: 29, optimal: 39, max: 49, unit: "m/min" }, feed: { min: 0.11, optimal: 0.21, max: 0.30, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 168, confidence_level: 0.95, standard_deviation_kc: 86, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-039: AISI 1042 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-039": {
      id: "P-CS-039",
      name: "AISI 1042 Cold Drawn",
      designation: { aisi_sae: "1042", uns: "G10420", din: "1.0517", jis: "S42C", en: "C42E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Cold Drawn",

      composition: {
        carbon: { min: 0.40, max: 0.47, typical: 0.42 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 97.9, max: 98.6, typical: 98.2 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1445, liquidus: 1495 },
        specific_heat: 486,
        thermal_conductivity: 48.5,
        thermal_expansion: 11.9e-6,
        electrical_resistivity: 18.3e-8,
        magnetic_permeability: 640,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80500
      },

      mechanical: {
        hardness: { brinell: 207, rockwell_b: 95, rockwell_c: 17, vickers: 217 },
        tensile_strength: { min: 650, typical: 695, max: 750 },
        yield_strength: { min: 560, typical: 595, max: 640 },
        elongation: { min: 10, typical: 13, max: 17 },
        reduction_of_area: { min: 38, typical: 44, max: 50 },
        impact_energy: { joules: 38, temperature: 20 },
        fatigue_strength: 320,
        fracture_toughness: 78
      },

      kienzle: { kc1_1: 1980, mc: 0.28, kc_temp_coefficient: -0.0018, kc_speed_coefficient: -0.10, rake_angle_correction: 0.014, chip_thickness_exponent: 0.78, cutting_edge_correction: 1.08, engagement_factor: 1.0 },
      johnson_cook: { A: 570, B: 620, C: 0.038, n: 0.24, m: 0.94, melting_temp: 1495, reference_strain_rate: 1.0 },
      taylor: { C: 240, n: 0.22, temperature_exponent: 2.5, hardness_factor: 0.79, coolant_factor: { dry: 1.0, flood: 1.45, mist: 1.20 }, depth_exponent: 0.14 },
      chip_formation: { chip_type: "continuous", serration_tendency: "moderate", built_up_edge_tendency: "low", chip_breaking: "excellent", optimal_chip_thickness: 0.08, shear_angle: 26, friction_coefficient: 0.43, chip_compression_ratio: 2.8 },
      tribology: { sliding_friction: 0.41, adhesion_tendency: "low", galling_tendency: "low", welding_temperature: 1090, oxide_stability: "good", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.90, heat_partition_to_chip: 0.70, heat_partition_to_tool: 0.17, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 400, recrystallization_temperature: 590, hot_hardness_retention: "good", thermal_shock_sensitivity: "moderate" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.4, Ra_typical: 1.2, Ra_max: 2.8 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.06, microstructure_stability: "excellent", burr_formation: "low", surface_defect_sensitivity: "low", polishability: "excellent" },
      machinability: { aisi_rating: 52, relative_to_1212: 0.52, power_factor: 0.97, tool_wear_factor: 0.77, surface_finish_factor: 0.93, chip_control_rating: "excellent", overall_rating: "moderate", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 92, optimal: 115, max: 142, unit: "m/min" }, feed: { min: 0.08, optimal: 0.18, max: 0.28, unit: "mm/rev" }, depth: { min: 0.2, optimal: 1.5, max: 3.5, unit: "mm" } },
        milling: { speed: { min: 82, optimal: 105, max: 132, unit: "m/min" }, feed_per_tooth: { min: 0.05, optimal: 0.10, max: 0.18, unit: "mm" }, axial_depth: { min: 0.2, optimal: 1.8, max: 4.8, unit: "mm" }, radial_depth_percent: { min: 15, optimal: 35, max: 60 } },
        drilling: { speed: { min: 20, optimal: 27, max: 34, unit: "m/min" }, feed: { min: 0.06, optimal: 0.13, max: 0.20, unit: "mm/rev" } },
        preferred_tool_grades: ["P10", "P15"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_required"
      },
      statistics: { data_quality: "high", sample_size: 155, confidence_level: 0.95, standard_deviation_kc: 102, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-040: AISI 1043 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-040": {
      id: "P-CS-040",
      name: "AISI 1043 Annealed",
      designation: { aisi_sae: "1043", uns: "G10430", din: "1.0519", jis: "S43C", en: "C43E" },
      iso_group: "P",
      material_class: "Medium Carbon Steel",
      condition: "Annealed",

      composition: {
        carbon: { min: 0.40, max: 0.48, typical: 0.43 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 },
        chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 },
        iron: { min: 97.8, max: 98.5, typical: 98.1 }
      },

      physical: {
        density: 7845,
        melting_point: { solidus: 1440, liquidus: 1490 },
        specific_heat: 486,
        thermal_conductivity: 48.2,
        thermal_expansion: 11.9e-6,
        electrical_resistivity: 18.5e-8,
        magnetic_permeability: 630,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: { brinell: 163, rockwell_b: 84, rockwell_c: null, vickers: 171 },
        tensile_strength: { min: 530, typical: 565, max: 610 },
        yield_strength: { min: 285, typical: 310, max: 340 },
        elongation: { min: 21, typical: 25, max: 30 },
        reduction_of_area: { min: 46, typical: 53, max: 60 },
        impact_energy: { joules: 72, temperature: 20 },
        fatigue_strength: 255,
        fracture_toughness: 108
      },

      kienzle: { kc1_1: 1820, mc: 0.26, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.06, engagement_factor: 1.0 },
      johnson_cook: { A: 335, B: 560, C: 0.034, n: 0.28, m: 1.01, melting_temp: 1490, reference_strain_rate: 1.0 },
      taylor: { C: 285, n: 0.25, temperature_exponent: 2.2, hardness_factor: 0.88, coolant_factor: { dry: 1.0, flood: 1.37, mist: 1.15 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 29, friction_coefficient: 0.47, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.45, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1115, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.85, heat_partition_to_chip: 0.73, heat_partition_to_tool: 0.14, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 428, recrystallization_temperature: 618, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.0 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.11, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 60, relative_to_1212: 0.60, power_factor: 0.91, tool_wear_factor: 0.85, surface_finish_factor: 0.85, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 118, optimal: 148, max: 182, unit: "m/min" }, feed: { min: 0.14, optimal: 0.25, max: 0.40, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.7, max: 5.8, unit: "mm" } },
        milling: { speed: { min: 108, optimal: 138, max: 172, unit: "m/min" }, feed_per_tooth: { min: 0.09, optimal: 0.16, max: 0.25, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.0, max: 7.5, unit: "mm" }, radial_depth_percent: { min: 24, optimal: 50, max: 75 } },
        drilling: { speed: { min: 28, optimal: 37, max: 47, unit: "m/min" }, feed: { min: 0.10, optimal: 0.20, max: 0.29, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 172, confidence_level: 0.95, standard_deviation_kc: 89, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    }
  }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CARBON_STEELS_031_040;
}

// Export for ES6 modules
export default CARBON_STEELS_031_040;
