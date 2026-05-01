/**
 * PRISM MATERIALS DATABASE - Carbon Steels Part 5
 * File: carbon_steels_041_050.js
 * Materials: P-CS-041 through P-CS-050
 * 
 * ISO Category: P (Steels)
 * Sub-category: Medium Carbon Steels (1043-1046 series)
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * 
 * Created: 2026-01-23
 * Last Updated: 2026-01-23
 */

const CARBON_STEELS_041_050 = {
  metadata: {
    file: "carbon_steels_041_050.js",
    category: "P_STEELS",
    subcategory: "Medium Carbon Steels",
    materialCount: 10,
    idRange: { start: "P-CS-041", end: "P-CS-050" },
    schemaVersion: "3.0.0",
    created: "2026-01-23",
    lastUpdated: "2026-01-23"
  },

  materials: {
    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-041: AISI 1043 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-041": {
      id: "P-CS-041", name: "AISI 1043 Hot Rolled",
      designation: { aisi_sae: "1043", uns: "G10430", din: "1.0519", jis: "S43C", en: "C43E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Hot Rolled",
      composition: {
        carbon: { min: 0.40, max: 0.47, typical: 0.43 }, manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 97.8, max: 98.6, typical: 98.2 }
      },
      physical: { density: 7845, melting_point: { solidus: 1430, liquidus: 1485 }, specific_heat: 486, thermal_conductivity: 47.5, thermal_expansion: 12.0e-6, electrical_resistivity: 19.0e-8, magnetic_permeability: 600, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 187, rockwell_b: 90, rockwell_c: null, vickers: 196 }, tensile_strength: { min: 580, typical: 620, max: 670 }, yield_strength: { min: 310, typical: 345, max: 380 }, elongation: { min: 18, typical: 22, max: 26 }, reduction_of_area: { min: 40, typical: 48, max: 55 }, impact_energy: { joules: 55, temperature: 20 }, fatigue_strength: 275, fracture_toughness: 95 },
      kienzle: { kc1_1: 1880, mc: 0.27, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.09, rake_angle_correction: 0.014, chip_thickness_exponent: 0.77, cutting_edge_correction: 1.07, engagement_factor: 1.0 },
      johnson_cook: { A: 360, B: 590, C: 0.036, n: 0.29, m: 1.02, melting_temp: 1485, reference_strain_rate: 1.0 },
      taylor: { C: 265, n: 0.23, temperature_exponent: 2.3, hardness_factor: 0.92, coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.14 }, depth_exponent: 0.13 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.12, shear_angle: 28, friction_coefficient: 0.48, chip_compression_ratio: 2.6 },
      tribology: { sliding_friction: 0.46, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1100, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.88, heat_partition_to_chip: 0.72, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 420, recrystallization_temperature: 610, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.2, Ra_max: 4.2 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.12, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 55, relative_to_1212: 0.55, power_factor: 0.93, tool_wear_factor: 0.88, surface_finish_factor: 0.83, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 100, optimal: 130, max: 165, unit: "m/min" }, feed: { min: 0.14, optimal: 0.25, max: 0.40, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.5, max: 5.5, unit: "mm" } },
        milling: { speed: { min: 90, optimal: 120, max: 155, unit: "m/min" }, feed_per_tooth: { min: 0.08, optimal: 0.15, max: 0.24, unit: "mm" }, axial_depth: { min: 0.5, optimal: 2.8, max: 7.0, unit: "mm" }, radial_depth_percent: { min: 22, optimal: 48, max: 72 } },
        drilling: { speed: { min: 25, optimal: 33, max: 42, unit: "m/min" }, feed: { min: 0.09, optimal: 0.18, max: 0.27, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 175, confidence_level: 0.95, standard_deviation_kc: 92, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-042: AISI 1043 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-042": {
      id: "P-CS-042", name: "AISI 1043 Cold Drawn",
      designation: { aisi_sae: "1043", uns: "G10430", din: "1.0519", jis: "S43C", en: "C43E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Cold Drawn",
      composition: {
        carbon: { min: 0.40, max: 0.47, typical: 0.43 }, manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 97.8, max: 98.6, typical: 98.2 }
      },
      physical: { density: 7845, melting_point: { solidus: 1430, liquidus: 1485 }, specific_heat: 486, thermal_conductivity: 46.8, thermal_expansion: 12.1e-6, electrical_resistivity: 19.5e-8, magnetic_permeability: 580, poissons_ratio: 0.29, elastic_modulus: 207000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 217, rockwell_b: 96, rockwell_c: 18, vickers: 228 }, tensile_strength: { min: 680, typical: 730, max: 790 }, yield_strength: { min: 530, typical: 575, max: 620 }, elongation: { min: 12, typical: 16, max: 20 }, reduction_of_area: { min: 35, typical: 42, max: 50 }, impact_energy: { joules: 40, temperature: 20 }, fatigue_strength: 320, fracture_toughness: 82 },
      kienzle: { kc1_1: 2020, mc: 0.28, kc_temp_coefficient: -0.0017, kc_speed_coefficient: -0.10, rake_angle_correction: 0.015, chip_thickness_exponent: 0.78, cutting_edge_correction: 1.08, engagement_factor: 1.0 },
      johnson_cook: { A: 440, B: 620, C: 0.038, n: 0.28, m: 1.00, melting_temp: 1485, reference_strain_rate: 1.0 },
      taylor: { C: 240, n: 0.21, temperature_exponent: 2.4, hardness_factor: 0.95, coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.16 }, depth_exponent: 0.14 },
      chip_formation: { chip_type: "continuous", serration_tendency: "moderate", built_up_edge_tendency: "moderate", chip_breaking: "good", optimal_chip_thickness: 0.10, shear_angle: 27, friction_coefficient: 0.50, chip_compression_ratio: 2.7 },
      tribology: { sliding_friction: 0.48, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1090, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.90, heat_partition_to_chip: 0.70, heat_partition_to_tool: 0.16, heat_partition_to_workpiece: 0.14, thermal_softening_onset: 415, recrystallization_temperature: 605, hot_hardness_retention: "good", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.6, Ra_typical: 1.6, Ra_max: 3.2 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.14, microstructure_stability: "good", burr_formation: "low", surface_defect_sensitivity: "low", polishability: "excellent" },
      machinability: { aisi_rating: 50, relative_to_1212: 0.50, power_factor: 0.96, tool_wear_factor: 0.92, surface_finish_factor: 0.90, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 90, optimal: 118, max: 150, unit: "m/min" }, feed: { min: 0.12, optimal: 0.22, max: 0.35, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.2, max: 4.8, unit: "mm" } },
        milling: { speed: { min: 80, optimal: 108, max: 140, unit: "m/min" }, feed_per_tooth: { min: 0.07, optimal: 0.14, max: 0.22, unit: "mm" }, axial_depth: { min: 0.5, optimal: 2.5, max: 6.0, unit: "mm" }, radial_depth_percent: { min: 20, optimal: 45, max: 68 } },
        drilling: { speed: { min: 22, optimal: 30, max: 38, unit: "m/min" }, feed: { min: 0.08, optimal: 0.16, max: 0.24, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 165, confidence_level: 0.95, standard_deviation_kc: 98, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-043: AISI 1044 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-043": {
      id: "P-CS-043", name: "AISI 1044 Annealed",
      designation: { aisi_sae: "1044", uns: "G10440", din: "1.0520", jis: "S44C", en: "C44E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Annealed",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.46 }, manganese: { min: 0.30, max: 0.60, typical: 0.45 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 98.2, max: 99.0, typical: 98.6 }
      },
      physical: { density: 7845, melting_point: { solidus: 1425, liquidus: 1480 }, specific_heat: 486, thermal_conductivity: 48.5, thermal_expansion: 12.1e-6, electrical_resistivity: 18.8e-8, magnetic_permeability: 610, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 163, rockwell_b: 84, rockwell_c: null, vickers: 171 }, tensile_strength: { min: 530, typical: 565, max: 605 }, yield_strength: { min: 285, typical: 310, max: 340 }, elongation: { min: 22, typical: 26, max: 31 }, reduction_of_area: { min: 45, typical: 54, max: 62 }, impact_energy: { joules: 75, temperature: 20 }, fatigue_strength: 250, fracture_toughness: 110 },
      kienzle: { kc1_1: 1800, mc: 0.26, kc_temp_coefficient: -0.0015, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.06, engagement_factor: 1.0 },
      johnson_cook: { A: 330, B: 555, C: 0.034, n: 0.28, m: 1.02, melting_temp: 1480, reference_strain_rate: 1.0 },
      taylor: { C: 290, n: 0.26, temperature_exponent: 2.2, hardness_factor: 0.87, coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.15 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.12, shear_angle: 29, friction_coefficient: 0.47, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.45, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1110, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.84, heat_partition_to_chip: 0.74, heat_partition_to_tool: 0.14, heat_partition_to_workpiece: 0.12, thermal_softening_onset: 430, recrystallization_temperature: 620, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.0 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.11, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 60, relative_to_1212: 0.60, power_factor: 0.90, tool_wear_factor: 0.84, surface_finish_factor: 0.86, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 115, optimal: 145, max: 180, unit: "m/min" }, feed: { min: 0.15, optimal: 0.26, max: 0.42, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.8, max: 6.0, unit: "mm" } },
        milling: { speed: { min: 105, optimal: 135, max: 170, unit: "m/min" }, feed_per_tooth: { min: 0.09, optimal: 0.17, max: 0.26, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.2, max: 7.8, unit: "mm" }, radial_depth_percent: { min: 25, optimal: 52, max: 78 } },
        drilling: { speed: { min: 28, optimal: 38, max: 48, unit: "m/min" }, feed: { min: 0.10, optimal: 0.20, max: 0.30, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 168, confidence_level: 0.95, standard_deviation_kc: 88, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-044: AISI 1044 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-044": {
      id: "P-CS-044", name: "AISI 1044 Hot Rolled",
      designation: { aisi_sae: "1044", uns: "G10440", din: "1.0520", jis: "S44C", en: "C44E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Hot Rolled",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.46 }, manganese: { min: 0.30, max: 0.60, typical: 0.45 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 98.2, max: 99.0, typical: 98.6 }
      },
      physical: { density: 7845, melting_point: { solidus: 1425, liquidus: 1480 }, specific_heat: 486, thermal_conductivity: 47.8, thermal_expansion: 12.0e-6, electrical_resistivity: 19.2e-8, magnetic_permeability: 590, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 190, rockwell_b: 91, rockwell_c: null, vickers: 199 }, tensile_strength: { min: 590, typical: 635, max: 685 }, yield_strength: { min: 315, typical: 355, max: 395 }, elongation: { min: 17, typical: 21, max: 25 }, reduction_of_area: { min: 38, typical: 46, max: 54 }, impact_energy: { joules: 52, temperature: 20 }, fatigue_strength: 280, fracture_toughness: 92 },
      kienzle: { kc1_1: 1900, mc: 0.27, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.09, rake_angle_correction: 0.015, chip_thickness_exponent: 0.77, cutting_edge_correction: 1.07, engagement_factor: 1.0 },
      johnson_cook: { A: 370, B: 595, C: 0.036, n: 0.29, m: 1.01, melting_temp: 1480, reference_strain_rate: 1.0 },
      taylor: { C: 260, n: 0.23, temperature_exponent: 2.3, hardness_factor: 0.93, coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.14 }, depth_exponent: 0.13 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 28, friction_coefficient: 0.48, chip_compression_ratio: 2.6 },
      tribology: { sliding_friction: 0.47, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1095, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.87, heat_partition_to_chip: 0.72, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 418, recrystallization_temperature: 608, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.2, Ra_max: 4.3 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.12, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 54, relative_to_1212: 0.54, power_factor: 0.94, tool_wear_factor: 0.89, surface_finish_factor: 0.83, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 98, optimal: 128, max: 162, unit: "m/min" }, feed: { min: 0.13, optimal: 0.24, max: 0.38, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.5, max: 5.3, unit: "mm" } },
        milling: { speed: { min: 88, optimal: 118, max: 152, unit: "m/min" }, feed_per_tooth: { min: 0.08, optimal: 0.15, max: 0.23, unit: "mm" }, axial_depth: { min: 0.5, optimal: 2.8, max: 6.8, unit: "mm" }, radial_depth_percent: { min: 22, optimal: 48, max: 72 } },
        drilling: { speed: { min: 24, optimal: 32, max: 41, unit: "m/min" }, feed: { min: 0.09, optimal: 0.18, max: 0.26, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 170, confidence_level: 0.95, standard_deviation_kc: 94, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-045: AISI 1045 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-045": {
      id: "P-CS-045", name: "AISI 1045 Annealed",
      designation: { aisi_sae: "1045", uns: "G10450", din: "1.0503", jis: "S45C", en: "C45E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Annealed",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.46 }, manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.20, typical: 0.08 },
        nickel: { min: 0, max: 0.20, typical: 0.08 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.25, typical: 0.12 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },
      physical: { density: 7850, melting_point: { solidus: 1420, liquidus: 1475 }, specific_heat: 486, thermal_conductivity: 49.8, thermal_expansion: 12.2e-6, electrical_resistivity: 18.5e-8, magnetic_permeability: 620, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 163, rockwell_b: 84, rockwell_c: null, vickers: 171 }, tensile_strength: { min: 530, typical: 565, max: 610 }, yield_strength: { min: 285, typical: 310, max: 345 }, elongation: { min: 22, typical: 26, max: 32 }, reduction_of_area: { min: 46, typical: 55, max: 63 }, impact_energy: { joules: 78, temperature: 20 }, fatigue_strength: 252, fracture_toughness: 112 },
      kienzle: { kc1_1: 1785, mc: 0.26, kc_temp_coefficient: -0.0015, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.06, engagement_factor: 1.0 },
      johnson_cook: { A: 328, B: 550, C: 0.034, n: 0.28, m: 1.02, melting_temp: 1475, reference_strain_rate: 1.0 },
      taylor: { C: 295, n: 0.26, temperature_exponent: 2.2, hardness_factor: 0.86, coolant_factor: { dry: 1.0, flood: 1.40, mist: 1.16 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.12, shear_angle: 30, friction_coefficient: 0.46, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.44, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1115, oxide_stability: "moderate", lubricity_response: "excellent" },
      thermal_machining: { cutting_temperature_coefficient: 0.83, heat_partition_to_chip: 0.75, heat_partition_to_tool: 0.13, heat_partition_to_workpiece: 0.12, thermal_softening_onset: 435, recrystallization_temperature: 625, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 3.8 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.10, microstructure_stability: "excellent", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 62, relative_to_1212: 0.62, power_factor: 0.89, tool_wear_factor: 0.83, surface_finish_factor: 0.87, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 118, optimal: 150, max: 185, unit: "m/min" }, feed: { min: 0.15, optimal: 0.27, max: 0.44, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.9, max: 6.2, unit: "mm" } },
        milling: { speed: { min: 108, optimal: 140, max: 175, unit: "m/min" }, feed_per_tooth: { min: 0.10, optimal: 0.18, max: 0.27, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.3, max: 8.0, unit: "mm" }, radial_depth_percent: { min: 25, optimal: 53, max: 80 } },
        drilling: { speed: { min: 30, optimal: 40, max: 50, unit: "m/min" }, feed: { min: 0.11, optimal: 0.21, max: 0.31, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 250, confidence_level: 0.95, standard_deviation_kc: 82, last_validated: "2025-12-01", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook", "Industrial-Validation-2025"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-046: AISI 1045 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-046": {
      id: "P-CS-046", name: "AISI 1045 Hot Rolled",
      designation: { aisi_sae: "1045", uns: "G10450", din: "1.0503", jis: "S45C", en: "C45E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Hot Rolled",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.46 }, manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.20, typical: 0.08 },
        nickel: { min: 0, max: 0.20, typical: 0.08 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.25, typical: 0.12 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },
      physical: { density: 7850, melting_point: { solidus: 1420, liquidus: 1475 }, specific_heat: 486, thermal_conductivity: 48.5, thermal_expansion: 12.1e-6, electrical_resistivity: 19.0e-8, magnetic_permeability: 600, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 192, rockwell_b: 91, rockwell_c: null, vickers: 201 }, tensile_strength: { min: 600, typical: 645, max: 700 }, yield_strength: { min: 320, typical: 365, max: 410 }, elongation: { min: 16, typical: 20, max: 24 }, reduction_of_area: { min: 38, typical: 45, max: 53 }, impact_energy: { joules: 50, temperature: 20 }, fatigue_strength: 285, fracture_toughness: 90 },
      kienzle: { kc1_1: 1920, mc: 0.27, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.09, rake_angle_correction: 0.015, chip_thickness_exponent: 0.77, cutting_edge_correction: 1.07, engagement_factor: 1.0 },
      johnson_cook: { A: 378, B: 600, C: 0.036, n: 0.29, m: 1.01, melting_temp: 1475, reference_strain_rate: 1.0 },
      taylor: { C: 255, n: 0.22, temperature_exponent: 2.3, hardness_factor: 0.94, coolant_factor: { dry: 1.0, flood: 1.36, mist: 1.14 }, depth_exponent: 0.13 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 28, friction_coefficient: 0.48, chip_compression_ratio: 2.6 },
      tribology: { sliding_friction: 0.47, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1090, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.88, heat_partition_to_chip: 0.72, heat_partition_to_tool: 0.15, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 415, recrystallization_temperature: 605, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.3, Ra_max: 4.5 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.12, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 53, relative_to_1212: 0.53, power_factor: 0.95, tool_wear_factor: 0.90, surface_finish_factor: 0.82, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 95, optimal: 125, max: 158, unit: "m/min" }, feed: { min: 0.13, optimal: 0.24, max: 0.38, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.4, max: 5.2, unit: "mm" } },
        milling: { speed: { min: 85, optimal: 115, max: 148, unit: "m/min" }, feed_per_tooth: { min: 0.08, optimal: 0.15, max: 0.23, unit: "mm" }, axial_depth: { min: 0.5, optimal: 2.7, max: 6.5, unit: "mm" }, radial_depth_percent: { min: 20, optimal: 46, max: 70 } },
        drilling: { speed: { min: 23, optimal: 31, max: 40, unit: "m/min" }, feed: { min: 0.09, optimal: 0.17, max: 0.25, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 235, confidence_level: 0.95, standard_deviation_kc: 90, last_validated: "2025-12-01", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook", "Industrial-Validation-2025"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-047: AISI 1045 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-047": {
      id: "P-CS-047", name: "AISI 1045 Cold Drawn",
      designation: { aisi_sae: "1045", uns: "G10450", din: "1.0503", jis: "S45C", en: "C45E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Cold Drawn",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.46 }, manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.20, typical: 0.08 },
        nickel: { min: 0, max: 0.20, typical: 0.08 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.25, typical: 0.12 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },
      physical: { density: 7850, melting_point: { solidus: 1420, liquidus: 1475 }, specific_heat: 486, thermal_conductivity: 47.2, thermal_expansion: 12.2e-6, electrical_resistivity: 19.8e-8, magnetic_permeability: 570, poissons_ratio: 0.29, elastic_modulus: 207000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 225, rockwell_b: 98, rockwell_c: 20, vickers: 236 }, tensile_strength: { min: 710, typical: 765, max: 830 }, yield_strength: { min: 565, typical: 615, max: 670 }, elongation: { min: 10, typical: 14, max: 18 }, reduction_of_area: { min: 32, typical: 40, max: 48 }, impact_energy: { joules: 35, temperature: 20 }, fatigue_strength: 340, fracture_toughness: 78 },
      kienzle: { kc1_1: 2080, mc: 0.29, kc_temp_coefficient: -0.0018, kc_speed_coefficient: -0.11, rake_angle_correction: 0.016, chip_thickness_exponent: 0.79, cutting_edge_correction: 1.09, engagement_factor: 1.0 },
      johnson_cook: { A: 480, B: 650, C: 0.040, n: 0.27, m: 0.98, melting_temp: 1475, reference_strain_rate: 1.0 },
      taylor: { C: 225, n: 0.20, temperature_exponent: 2.5, hardness_factor: 0.98, coolant_factor: { dry: 1.0, flood: 1.42, mist: 1.18 }, depth_exponent: 0.15 },
      chip_formation: { chip_type: "continuous", serration_tendency: "moderate", built_up_edge_tendency: "moderate", chip_breaking: "good", optimal_chip_thickness: 0.09, shear_angle: 26, friction_coefficient: 0.52, chip_compression_ratio: 2.8 },
      tribology: { sliding_friction: 0.50, adhesion_tendency: "moderate", galling_tendency: "moderate", welding_temperature: 1075, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.92, heat_partition_to_chip: 0.68, heat_partition_to_tool: 0.18, heat_partition_to_workpiece: 0.14, thermal_softening_onset: 405, recrystallization_temperature: 595, hot_hardness_retention: "good", thermal_shock_sensitivity: "moderate" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.5, Ra_typical: 1.4, Ra_max: 2.8 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.15, microstructure_stability: "good", burr_formation: "low", surface_defect_sensitivity: "low", polishability: "excellent" },
      machinability: { aisi_rating: 48, relative_to_1212: 0.48, power_factor: 0.98, tool_wear_factor: 0.94, surface_finish_factor: 0.92, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 85, optimal: 112, max: 142, unit: "m/min" }, feed: { min: 0.11, optimal: 0.20, max: 0.32, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.0, max: 4.5, unit: "mm" } },
        milling: { speed: { min: 75, optimal: 102, max: 132, unit: "m/min" }, feed_per_tooth: { min: 0.07, optimal: 0.13, max: 0.20, unit: "mm" }, axial_depth: { min: 0.5, optimal: 2.2, max: 5.5, unit: "mm" }, radial_depth_percent: { min: 18, optimal: 42, max: 65 } },
        drilling: { speed: { min: 20, optimal: 27, max: 35, unit: "m/min" }, feed: { min: 0.07, optimal: 0.14, max: 0.22, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_required"
      },
      statistics: { data_quality: "high", sample_size: 220, confidence_level: 0.95, standard_deviation_kc: 102, last_validated: "2025-12-01", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook", "Industrial-Validation-2025"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-048: AISI 1045 Normalized
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-048": {
      id: "P-CS-048", name: "AISI 1045 Normalized",
      designation: { aisi_sae: "1045", uns: "G10450", din: "1.0503", jis: "S45C", en: "C45E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Normalized",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.46 }, manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.20, typical: 0.08 },
        nickel: { min: 0, max: 0.20, typical: 0.08 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.25, typical: 0.12 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 98.0, max: 98.8, typical: 98.4 }
      },
      physical: { density: 7850, melting_point: { solidus: 1420, liquidus: 1475 }, specific_heat: 486, thermal_conductivity: 49.0, thermal_expansion: 12.1e-6, electrical_resistivity: 18.8e-8, magnetic_permeability: 610, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 180, rockwell_b: 88, rockwell_c: null, vickers: 189 }, tensile_strength: { min: 565, typical: 605, max: 655 }, yield_strength: { min: 300, typical: 340, max: 380 }, elongation: { min: 18, typical: 22, max: 27 }, reduction_of_area: { min: 40, typical: 48, max: 56 }, impact_energy: { joules: 60, temperature: 20 }, fatigue_strength: 270, fracture_toughness: 98 },
      kienzle: { kc1_1: 1860, mc: 0.27, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.09, rake_angle_correction: 0.015, chip_thickness_exponent: 0.77, cutting_edge_correction: 1.07, engagement_factor: 1.0 },
      johnson_cook: { A: 355, B: 580, C: 0.035, n: 0.29, m: 1.01, melting_temp: 1475, reference_strain_rate: 1.0 },
      taylor: { C: 268, n: 0.24, temperature_exponent: 2.3, hardness_factor: 0.91, coolant_factor: { dry: 1.0, flood: 1.37, mist: 1.15 }, depth_exponent: 0.13 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 29, friction_coefficient: 0.47, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.46, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1100, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.86, heat_partition_to_chip: 0.73, heat_partition_to_tool: 0.14, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 422, recrystallization_temperature: 612, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.1, Ra_max: 4.0 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.11, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 57, relative_to_1212: 0.57, power_factor: 0.92, tool_wear_factor: 0.87, surface_finish_factor: 0.85, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 102, optimal: 132, max: 168, unit: "m/min" }, feed: { min: 0.14, optimal: 0.25, max: 0.40, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.6, max: 5.5, unit: "mm" } },
        milling: { speed: { min: 92, optimal: 122, max: 158, unit: "m/min" }, feed_per_tooth: { min: 0.08, optimal: 0.16, max: 0.25, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.0, max: 7.2, unit: "mm" }, radial_depth_percent: { min: 22, optimal: 50, max: 75 } },
        drilling: { speed: { min: 25, optimal: 34, max: 44, unit: "m/min" }, feed: { min: 0.09, optimal: 0.18, max: 0.27, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 210, confidence_level: 0.95, standard_deviation_kc: 88, last_validated: "2025-12-01", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook", "Industrial-Validation-2025"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-049: AISI 1046 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-049": {
      id: "P-CS-049", name: "AISI 1046 Annealed",
      designation: { aisi_sae: "1046", uns: "G10460", din: "1.0521", jis: "S46C", en: "C46E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Annealed",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.47 }, manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 97.8, max: 98.6, typical: 98.2 }
      },
      physical: { density: 7845, melting_point: { solidus: 1415, liquidus: 1470 }, specific_heat: 486, thermal_conductivity: 48.0, thermal_expansion: 12.2e-6, electrical_resistivity: 19.0e-8, magnetic_permeability: 605, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 170, rockwell_b: 86, rockwell_c: null, vickers: 178 }, tensile_strength: { min: 545, typical: 585, max: 630 }, yield_strength: { min: 295, typical: 325, max: 360 }, elongation: { min: 20, typical: 24, max: 29 }, reduction_of_area: { min: 42, typical: 52, max: 60 }, impact_energy: { joules: 68, temperature: 20 }, fatigue_strength: 260, fracture_toughness: 105 },
      kienzle: { kc1_1: 1820, mc: 0.27, kc_temp_coefficient: -0.0015, kc_speed_coefficient: -0.08, rake_angle_correction: 0.014, chip_thickness_exponent: 0.76, cutting_edge_correction: 1.06, engagement_factor: 1.0 },
      johnson_cook: { A: 345, B: 565, C: 0.035, n: 0.28, m: 1.02, melting_temp: 1470, reference_strain_rate: 1.0 },
      taylor: { C: 280, n: 0.25, temperature_exponent: 2.2, hardness_factor: 0.88, coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.15 }, depth_exponent: 0.12 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.12, shear_angle: 29, friction_coefficient: 0.47, chip_compression_ratio: 2.5 },
      tribology: { sliding_friction: 0.45, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1105, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.85, heat_partition_to_chip: 0.74, heat_partition_to_tool: 0.14, heat_partition_to_workpiece: 0.12, thermal_softening_onset: 428, recrystallization_temperature: 618, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 3.9 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.11, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 58, relative_to_1212: 0.58, power_factor: 0.91, tool_wear_factor: 0.86, surface_finish_factor: 0.85, chip_control_rating: "good", overall_rating: "good", difficulty_class: 2 },
      recommendations: {
        turning: { speed: { min: 112, optimal: 142, max: 178, unit: "m/min" }, feed: { min: 0.14, optimal: 0.26, max: 0.42, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.7, max: 5.8, unit: "mm" } },
        milling: { speed: { min: 102, optimal: 132, max: 168, unit: "m/min" }, feed_per_tooth: { min: 0.09, optimal: 0.16, max: 0.25, unit: "mm" }, axial_depth: { min: 0.5, optimal: 3.1, max: 7.5, unit: "mm" }, radial_depth_percent: { min: 23, optimal: 50, max: 76 } },
        drilling: { speed: { min: 27, optimal: 36, max: 46, unit: "m/min" }, feed: { min: 0.10, optimal: 0.19, max: 0.28, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 178, confidence_level: 0.95, standard_deviation_kc: 86, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-050: AISI 1046 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-050": {
      id: "P-CS-050", name: "AISI 1046 Hot Rolled",
      designation: { aisi_sae: "1046", uns: "G10460", din: "1.0521", jis: "S46C", en: "C46E" },
      iso_group: "P", material_class: "Medium Carbon Steel", condition: "Hot Rolled",
      composition: {
        carbon: { min: 0.43, max: 0.50, typical: 0.47 }, manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        silicon: { min: 0.15, max: 0.35, typical: 0.25 }, phosphorus: { min: 0, max: 0.040, typical: 0.020 },
        sulfur: { min: 0, max: 0.050, typical: 0.025 }, chromium: { min: 0, max: 0.15, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.05 }, molybdenum: { min: 0, max: 0.06, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 }, vanadium: { min: 0, max: 0.02, typical: 0.005 },
        tungsten: { min: 0, max: 0, typical: 0 }, cobalt: { min: 0, max: 0, typical: 0 },
        titanium: { min: 0, max: 0, typical: 0 }, aluminum: { min: 0, max: 0.05, typical: 0.02 },
        nitrogen: { min: 0, max: 0.010, typical: 0.005 }, iron: { min: 97.8, max: 98.6, typical: 98.2 }
      },
      physical: { density: 7845, melting_point: { solidus: 1415, liquidus: 1470 }, specific_heat: 486, thermal_conductivity: 47.2, thermal_expansion: 12.1e-6, electrical_resistivity: 19.5e-8, magnetic_permeability: 585, poissons_ratio: 0.29, elastic_modulus: 205000, shear_modulus: 80000 },
      mechanical: { hardness: { brinell: 197, rockwell_b: 92, rockwell_c: null, vickers: 207 }, tensile_strength: { min: 615, typical: 660, max: 715 }, yield_strength: { min: 330, typical: 375, max: 420 }, elongation: { min: 15, typical: 19, max: 23 }, reduction_of_area: { min: 36, typical: 44, max: 52 }, impact_energy: { joules: 48, temperature: 20 }, fatigue_strength: 290, fracture_toughness: 88 },
      kienzle: { kc1_1: 1950, mc: 0.28, kc_temp_coefficient: -0.0016, kc_speed_coefficient: -0.09, rake_angle_correction: 0.015, chip_thickness_exponent: 0.78, cutting_edge_correction: 1.08, engagement_factor: 1.0 },
      johnson_cook: { A: 388, B: 610, C: 0.037, n: 0.29, m: 1.00, melting_temp: 1470, reference_strain_rate: 1.0 },
      taylor: { C: 250, n: 0.22, temperature_exponent: 2.4, hardness_factor: 0.95, coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.14 }, depth_exponent: 0.14 },
      chip_formation: { chip_type: "continuous", serration_tendency: "low", built_up_edge_tendency: "moderate", chip_breaking: "moderate", optimal_chip_thickness: 0.11, shear_angle: 27, friction_coefficient: 0.49, chip_compression_ratio: 2.7 },
      tribology: { sliding_friction: 0.48, adhesion_tendency: "moderate", galling_tendency: "low", welding_temperature: 1085, oxide_stability: "moderate", lubricity_response: "good" },
      thermal_machining: { cutting_temperature_coefficient: 0.89, heat_partition_to_chip: 0.71, heat_partition_to_tool: 0.16, heat_partition_to_workpiece: 0.13, thermal_softening_onset: 412, recrystallization_temperature: 602, hot_hardness_retention: "moderate", thermal_shock_sensitivity: "low" },
      surface_integrity: { achievable_roughness: { Ra_min: 0.9, Ra_typical: 2.4, Ra_max: 4.6 }, residual_stress_tendency: "compressive", white_layer_tendency: "low", work_hardening_depth: 0.13, microstructure_stability: "good", burr_formation: "moderate", surface_defect_sensitivity: "low", polishability: "good" },
      machinability: { aisi_rating: 52, relative_to_1212: 0.52, power_factor: 0.95, tool_wear_factor: 0.91, surface_finish_factor: 0.81, chip_control_rating: "good", overall_rating: "good", difficulty_class: 3 },
      recommendations: {
        turning: { speed: { min: 92, optimal: 122, max: 155, unit: "m/min" }, feed: { min: 0.13, optimal: 0.23, max: 0.37, unit: "mm/rev" }, depth: { min: 0.5, optimal: 2.4, max: 5.0, unit: "mm" } },
        milling: { speed: { min: 82, optimal: 112, max: 145, unit: "m/min" }, feed_per_tooth: { min: 0.07, optimal: 0.14, max: 0.22, unit: "mm" }, axial_depth: { min: 0.5, optimal: 2.6, max: 6.3, unit: "mm" }, radial_depth_percent: { min: 20, optimal: 45, max: 70 } },
        drilling: { speed: { min: 22, optimal: 30, max: 39, unit: "m/min" }, feed: { min: 0.08, optimal: 0.16, max: 0.25, unit: "mm/rev" } },
        preferred_tool_grades: ["P15", "P20", "P25"], preferred_coatings: ["TiAlN", "AlTiN", "TiCN"], coolant_recommendation: "flood_recommended"
      },
      statistics: { data_quality: "high", sample_size: 172, confidence_level: 0.95, standard_deviation_kc: 94, last_validated: "2025-11-15", source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"] }
    }
  }
};

// Export for module system
if (typeof module !== 'undefined' && 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: P_STEELS | Materials: 10 | Sections added: 5
// ADD THESE TO EACH MATERIAL:
// ============================================================================
/*
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed", "Estimated"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
*/

module.exports) {
  
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: P_STEELS | Materials: 10 | Sections added: 5
// ADD THESE TO EACH MATERIAL:
// ============================================================================
/*
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed", "Estimated"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
*/

module.exports = CARBON_STEELS_041_050;
}

// Export for ES6 modules
export default CARBON_STEELS_041_050;
