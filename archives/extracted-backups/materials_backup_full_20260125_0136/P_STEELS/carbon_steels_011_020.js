/**
 * PRISM MATERIALS DATABASE - Carbon Steels Part 2
 * File: carbon_steels_011_020.js
 * Materials: P-CS-011 through P-CS-020
 * 
 * ISO Category: P (Steels)
 * Sub-category: Low Carbon Steels (continuation)
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * 
 * Created: 2026-01-23
 * Last Updated: 2026-01-23
 */

const CARBON_STEELS_011_020 = {
  metadata: {
    file: "carbon_steels_011_020.js",
    category: "P_STEELS",
    subcategory: "Low Carbon Steels",
    materialCount: 10,
    idRange: { start: "P-CS-011", end: "P-CS-020" },
    schemaVersion: "3.0.0",
    created: "2026-01-23",
    lastUpdated: "2026-01-23"
  },

  materials: {
    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-011: AISI 1018 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-011": {
      // SECTION 1: IDENTIFICATION (6 parameters)
      id: "P-CS-011",
      name: "AISI 1018 Cold Drawn",
      designation: {
        aisi_sae: "1018",
        uns: "G10180",
        din: "1.0453",
        jis: "S18C",
        en: "C18E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Cold Drawn",

      // SECTION 2: COMPOSITION (16 parameters - ranges)
      composition: {
        carbon: { min: 0.15, max: 0.20, typical: 0.18 },
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
        iron: { min: 98.5, max: 99.2, typical: 98.8 }
      },

      // SECTION 3: PHYSICAL PROPERTIES (10 parameters)
      physical: {
        density: 7870,
        melting_point: { solidus: 1480, liquidus: 1530 },
        specific_heat: 486,
        thermal_conductivity: 51.9,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 15.9e-8,
        magnetic_permeability: 800,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      // SECTION 4: MECHANICAL PROPERTIES (12 parameters)
      mechanical: {
        hardness: {
          brinell: 143,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 152
        },
        tensile_strength: { min: 510, typical: 540, max: 570 },
        yield_strength: { min: 415, typical: 440, max: 465 },
        elongation: { min: 12, typical: 15, max: 18 },
        reduction_of_area: { min: 40, typical: 50, max: 55 },
        impact_energy: { joules: 85, temperature: 20 },
        fatigue_strength: 245,
        fracture_toughness: 115
      },

      // SECTION 5: CUTTING FORCE MODEL - KIENZLE (8 parameters)
      kienzle: {
        kc1_1: 1780,
        mc: 0.25,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.74,
        cutting_edge_correction: 1.05,
        engagement_factor: 1.0
      },

      // SECTION 6: CONSTITUTIVE MODEL - JOHNSON-COOK (7 parameters)
      johnson_cook: {
        A: 330,
        B: 560,
        C: 0.035,
        n: 0.32,
        m: 1.05,
        melting_temp: 1530,
        reference_strain_rate: 1.0
      },

      // SECTION 7: TOOL LIFE MODEL - TAYLOR (6 parameters)
      taylor: {
        C: 340,
        n: 0.28,
        temperature_exponent: 2.2,
        hardness_factor: 0.95,
        coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.15 },
        depth_exponent: 0.12
      },

      // SECTION 8: CHIP FORMATION (8 parameters)
      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "moderate",
        optimal_chip_thickness: 0.12,
        shear_angle: 32,
        friction_coefficient: 0.45,
        chip_compression_ratio: 2.3
      },

      // SECTION 9: FRICTION/TRIBOLOGY (6 parameters)
      tribology: {
        sliding_friction: 0.42,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1150,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      // SECTION 10: THERMAL IN MACHINING (8 parameters)
      thermal_machining: {
        cutting_temperature_coefficient: 0.85,
        heat_partition_to_chip: 0.75,
        heat_partition_to_tool: 0.12,
        heat_partition_to_workpiece: 0.13,
        thermal_softening_onset: 450,
        recrystallization_temperature: 650,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      // SECTION 11: SURFACE INTEGRITY (8 parameters)
      surface_integrity: {
        achievable_roughness: { Ra_min: 0.6, Ra_typical: 1.6, Ra_max: 3.2 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.08,
        microstructure_stability: "good",
        burr_formation: "moderate",
        surface_defect_sensitivity: "low",
        polishability: "good"
      },

      // SECTION 12: MACHINABILITY INDICES (8 parameters)
      machinability: {
        aisi_rating: 75,
        relative_to_1212: 0.75,
        power_factor: 0.92,
        tool_wear_factor: 0.88,
        surface_finish_factor: 0.90,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      // SECTION 13: RECOMMENDED PARAMETERS (18 parameters)
      recommendations: {
        turning: {
          speed: { min: 140, optimal: 180, max: 220, unit: "m/min" },
          feed: { min: 0.15, optimal: 0.25, max: 0.40, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.5, max: 6.0, unit: "mm" }
        },
        milling: {
          speed: { min: 130, optimal: 170, max: 210, unit: "m/min" },
          feed_per_tooth: { min: 0.08, optimal: 0.15, max: 0.25, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 3.0, max: 8.0, unit: "mm" },
          radial_depth_percent: { min: 25, optimal: 50, max: 75 }
        },
        drilling: {
          speed: { min: 35, optimal: 45, max: 55, unit: "m/min" },
          feed: { min: 0.12, optimal: 0.20, max: 0.30, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      // SECTION 14: STATISTICAL/CONFIDENCE (6 parameters)
      statistics: {
        data_quality: "high",
        sample_size: 250,
        confidence_level: 0.95,
        standard_deviation_kc: 85,
        last_validated: "2025-12-01",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data-Handbook"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-012: AISI 1018 Cold Drawn + Stress Relieved
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-012": {
      id: "P-CS-012",
      name: "AISI 1018 Cold Drawn + Stress Relieved",
      designation: {
        aisi_sae: "1018 SR",
        uns: "G10180",
        din: "1.0453",
        jis: "S18C",
        en: "C18E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Cold Drawn + Stress Relieved",

      composition: {
        carbon: { min: 0.15, max: 0.20, typical: 0.18 },
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
        iron: { min: 98.5, max: 99.2, typical: 98.8 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1480, liquidus: 1530 },
        specific_heat: 486,
        thermal_conductivity: 51.9,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 15.9e-8,
        magnetic_permeability: 800,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 137,
          rockwell_b: 76,
          rockwell_c: null,
          vickers: 145
        },
        tensile_strength: { min: 485, typical: 515, max: 545 },
        yield_strength: { min: 385, typical: 415, max: 440 },
        elongation: { min: 14, typical: 17, max: 20 },
        reduction_of_area: { min: 45, typical: 55, max: 60 },
        impact_energy: { joules: 95, temperature: 20 },
        fatigue_strength: 235,
        fracture_toughness: 120
      },

      kienzle: {
        kc1_1: 1720,
        mc: 0.25,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.74,
        cutting_edge_correction: 1.04,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 315,
        B: 545,
        C: 0.035,
        n: 0.32,
        m: 1.05,
        melting_temp: 1530,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 350,
        n: 0.29,
        temperature_exponent: 2.2,
        hardness_factor: 0.97,
        coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.15 },
        depth_exponent: 0.12
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "low",
        chip_breaking: "moderate",
        optimal_chip_thickness: 0.12,
        shear_angle: 33,
        friction_coefficient: 0.43,
        chip_compression_ratio: 2.2
      },

      tribology: {
        sliding_friction: 0.41,
        adhesion_tendency: "low",
        galling_tendency: "low",
        welding_temperature: 1150,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.83,
        heat_partition_to_chip: 0.76,
        heat_partition_to_tool: 0.11,
        heat_partition_to_workpiece: 0.13,
        thermal_softening_onset: 450,
        recrystallization_temperature: 650,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.5, Ra_typical: 1.4, Ra_max: 2.8 },
        residual_stress_tendency: "neutral",
        white_layer_tendency: "low",
        work_hardening_depth: 0.06,
        microstructure_stability: "excellent",
        burr_formation: "low",
        surface_defect_sensitivity: "low",
        polishability: "excellent"
      },

      machinability: {
        aisi_rating: 78,
        relative_to_1212: 0.78,
        power_factor: 0.90,
        tool_wear_factor: 0.90,
        surface_finish_factor: 0.92,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      recommendations: {
        turning: {
          speed: { min: 145, optimal: 185, max: 230, unit: "m/min" },
          feed: { min: 0.15, optimal: 0.25, max: 0.40, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.5, max: 6.0, unit: "mm" }
        },
        milling: {
          speed: { min: 135, optimal: 175, max: 220, unit: "m/min" },
          feed_per_tooth: { min: 0.08, optimal: 0.15, max: 0.25, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 3.0, max: 8.0, unit: "mm" },
          radial_depth_percent: { min: 25, optimal: 50, max: 75 }
        },
        drilling: {
          speed: { min: 38, optimal: 48, max: 58, unit: "m/min" },
          feed: { min: 0.12, optimal: 0.20, max: 0.30, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      statistics: {
        data_quality: "high",
        sample_size: 180,
        confidence_level: 0.95,
        standard_deviation_kc: 82,
        last_validated: "2025-11-15",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Industrial-Testing"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-013: AISI 1019 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-013": {
      id: "P-CS-013",
      name: "AISI 1019 Annealed",
      designation: {
        aisi_sae: "1019",
        uns: "G10190",
        din: "1.0402",
        jis: "S20C",
        en: "C20"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Annealed",

      composition: {
        carbon: { min: 0.15, max: 0.20, typical: 0.19 },
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
        iron: { min: 98.3, max: 99.0, typical: 98.7 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1478, liquidus: 1527 },
        specific_heat: 486,
        thermal_conductivity: 51.2,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 16.2e-8,
        magnetic_permeability: 780,
        poissons_ratio: 0.29,
        elastic_modulus: 205000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 121,
          rockwell_b: 68,
          rockwell_c: null,
          vickers: 128
        },
        tensile_strength: { min: 400, typical: 430, max: 460 },
        yield_strength: { min: 275, typical: 305, max: 330 },
        elongation: { min: 25, typical: 30, max: 35 },
        reduction_of_area: { min: 50, typical: 60, max: 65 },
        impact_energy: { joules: 115, temperature: 20 },
        fatigue_strength: 195,
        fracture_toughness: 135
      },

      kienzle: {
        kc1_1: 1580,
        mc: 0.26,
        kc_temp_coefficient: -0.0016,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.75,
        cutting_edge_correction: 1.03,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 280,
        B: 520,
        C: 0.034,
        n: 0.33,
        m: 1.06,
        melting_temp: 1527,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 380,
        n: 0.30,
        temperature_exponent: 2.1,
        hardness_factor: 1.02,
        coolant_factor: { dry: 1.0, flood: 1.40, mist: 1.18 },
        depth_exponent: 0.11
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "very_low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "poor",
        optimal_chip_thickness: 0.14,
        shear_angle: 30,
        friction_coefficient: 0.48,
        chip_compression_ratio: 2.5
      },

      tribology: {
        sliding_friction: 0.45,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1140,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.80,
        heat_partition_to_chip: 0.73,
        heat_partition_to_tool: 0.13,
        heat_partition_to_workpiece: 0.14,
        thermal_softening_onset: 440,
        recrystallization_temperature: 640,
        hot_hardness_retention: "low",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.0 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "very_low",
        work_hardening_depth: 0.10,
        microstructure_stability: "good",
        burr_formation: "high",
        surface_defect_sensitivity: "low",
        polishability: "moderate"
      },

      machinability: {
        aisi_rating: 82,
        relative_to_1212: 0.82,
        power_factor: 0.85,
        tool_wear_factor: 0.95,
        surface_finish_factor: 0.85,
        chip_control_rating: "fair",
        overall_rating: "good",
        difficulty_class: 1
      },

      recommendations: {
        turning: {
          speed: { min: 155, optimal: 200, max: 250, unit: "m/min" },
          feed: { min: 0.18, optimal: 0.28, max: 0.45, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 3.0, max: 7.0, unit: "mm" }
        },
        milling: {
          speed: { min: 145, optimal: 190, max: 240, unit: "m/min" },
          feed_per_tooth: { min: 0.10, optimal: 0.18, max: 0.28, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 4.0, max: 10.0, unit: "mm" },
          radial_depth_percent: { min: 30, optimal: 55, max: 80 }
        },
        drilling: {
          speed: { min: 40, optimal: 52, max: 65, unit: "m/min" },
          feed: { min: 0.15, optimal: 0.25, max: 0.35, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P15", "P25", "P30"],
        preferred_coatings: ["TiAlN", "TiCN", "AlTiN"],
        coolant_recommendation: "flood_required"
      },

      statistics: {
        data_quality: "high",
        sample_size: 165,
        confidence_level: 0.95,
        standard_deviation_kc: 78,
        last_validated: "2025-10-20",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Steel-Data-Manual"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-014: AISI 1020 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-014": {
      id: "P-CS-014",
      name: "AISI 1020 Annealed",
      designation: {
        aisi_sae: "1020",
        uns: "G10200",
        din: "1.0402",
        jis: "S20C",
        en: "C20E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Annealed",

      composition: {
        carbon: { min: 0.18, max: 0.23, typical: 0.20 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
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
        iron: { min: 98.7, max: 99.3, typical: 99.0 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1477, liquidus: 1525 },
        specific_heat: 486,
        thermal_conductivity: 51.1,
        thermal_expansion: 11.7e-6,
        electrical_resistivity: 16.0e-8,
        magnetic_permeability: 750,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 111,
          rockwell_b: 62,
          rockwell_c: null,
          vickers: 118
        },
        tensile_strength: { min: 380, typical: 415, max: 445 },
        yield_strength: { min: 250, typical: 285, max: 315 },
        elongation: { min: 28, typical: 33, max: 38 },
        reduction_of_area: { min: 55, typical: 62, max: 68 },
        impact_energy: { joules: 120, temperature: 20 },
        fatigue_strength: 185,
        fracture_toughness: 140
      },

      kienzle: {
        kc1_1: 1520,
        mc: 0.26,
        kc_temp_coefficient: -0.0016,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.016,
        chip_thickness_exponent: 0.75,
        cutting_edge_correction: 1.02,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 265,
        B: 510,
        C: 0.033,
        n: 0.34,
        m: 1.07,
        melting_temp: 1525,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 395,
        n: 0.31,
        temperature_exponent: 2.0,
        hardness_factor: 1.05,
        coolant_factor: { dry: 1.0, flood: 1.42, mist: 1.20 },
        depth_exponent: 0.11
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "very_low",
        built_up_edge_tendency: "high",
        chip_breaking: "poor",
        optimal_chip_thickness: 0.14,
        shear_angle: 29,
        friction_coefficient: 0.50,
        chip_compression_ratio: 2.6
      },

      tribology: {
        sliding_friction: 0.48,
        adhesion_tendency: "moderate_high",
        galling_tendency: "moderate",
        welding_temperature: 1130,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.78,
        heat_partition_to_chip: 0.72,
        heat_partition_to_tool: 0.14,
        heat_partition_to_workpiece: 0.14,
        thermal_softening_onset: 435,
        recrystallization_temperature: 635,
        hot_hardness_retention: "low",
        thermal_shock_sensitivity: "very_low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 1.0, Ra_typical: 2.4, Ra_max: 4.8 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "very_low",
        work_hardening_depth: 0.12,
        microstructure_stability: "good",
        burr_formation: "high",
        surface_defect_sensitivity: "low",
        polishability: "moderate"
      },

      machinability: {
        aisi_rating: 85,
        relative_to_1212: 0.85,
        power_factor: 0.82,
        tool_wear_factor: 0.96,
        surface_finish_factor: 0.82,
        chip_control_rating: "fair",
        overall_rating: "good",
        difficulty_class: 1
      },

      recommendations: {
        turning: {
          speed: { min: 160, optimal: 210, max: 265, unit: "m/min" },
          feed: { min: 0.18, optimal: 0.30, max: 0.48, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 3.0, max: 8.0, unit: "mm" }
        },
        milling: {
          speed: { min: 150, optimal: 200, max: 255, unit: "m/min" },
          feed_per_tooth: { min: 0.10, optimal: 0.18, max: 0.30, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 4.0, max: 10.0, unit: "mm" },
          radial_depth_percent: { min: 30, optimal: 60, max: 85 }
        },
        drilling: {
          speed: { min: 42, optimal: 55, max: 70, unit: "m/min" },
          feed: { min: 0.15, optimal: 0.25, max: 0.38, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P15", "P25", "P30"],
        preferred_coatings: ["TiAlN", "TiCN", "AlCrN"],
        coolant_recommendation: "flood_required"
      },

      statistics: {
        data_quality: "very_high",
        sample_size: 320,
        confidence_level: 0.95,
        standard_deviation_kc: 72,
        last_validated: "2025-12-10",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Sandvik-Data", "Kennametal-DB"]
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-015: AISI 1020 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-015": {
      id: "P-CS-015",
      name: "AISI 1020 Cold Drawn",
      designation: {
        aisi_sae: "1020",
        uns: "G10200",
        din: "1.0402",
        jis: "S20C",
        en: "C20E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Cold Drawn",

      composition: {
        carbon: { min: 0.18, max: 0.23, typical: 0.20 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
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
        iron: { min: 98.7, max: 99.3, typical: 99.0 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1477, liquidus: 1525 },
        specific_heat: 486,
        thermal_conductivity: 51.1,
        thermal_expansion: 11.7e-6,
        electrical_resistivity: 16.0e-8,
        magnetic_permeability: 750,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 131,
          rockwell_b: 73,
          rockwell_c: null,
          vickers: 139
        },
        tensile_strength: { min: 470, typical: 500, max: 530 },
        yield_strength: { min: 380, typical: 415, max: 445 },
        elongation: { min: 14, typical: 18, max: 22 },
        reduction_of_area: { min: 42, typical: 52, max: 58 },
        impact_energy: { joules: 95, temperature: 20 },
        fatigue_strength: 225,
        fracture_toughness: 118
      },

      kienzle: {
        kc1_1: 1680,
        mc: 0.25,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.74,
        cutting_edge_correction: 1.04,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 310,
        B: 550,
        C: 0.034,
        n: 0.33,
        m: 1.05,
        melting_temp: 1525,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 355,
        n: 0.28,
        temperature_exponent: 2.2,
        hardness_factor: 0.96,
        coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.16 },
        depth_exponent: 0.12
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "moderate",
        optimal_chip_thickness: 0.12,
        shear_angle: 31,
        friction_coefficient: 0.46,
        chip_compression_ratio: 2.4
      },

      tribology: {
        sliding_friction: 0.44,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1140,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.83,
        heat_partition_to_chip: 0.74,
        heat_partition_to_tool: 0.12,
        heat_partition_to_workpiece: 0.14,
        thermal_softening_onset: 445,
        recrystallization_temperature: 645,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.6, Ra_typical: 1.6, Ra_max: 3.2 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.08,
        microstructure_stability: "good",
        burr_formation: "moderate",
        surface_defect_sensitivity: "low",
        polishability: "good"
      },

      machinability: {
        aisi_rating: 76,
        relative_to_1212: 0.76,
        power_factor: 0.90,
        tool_wear_factor: 0.89,
        surface_finish_factor: 0.91,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      recommendations: {
        turning: {
          speed: { min: 145, optimal: 190, max: 235, unit: "m/min" },
          feed: { min: 0.15, optimal: 0.26, max: 0.42, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.5, max: 6.5, unit: "mm" }
        },
        milling: {
          speed: { min: 135, optimal: 180, max: 225, unit: "m/min" },
          feed_per_tooth: { min: 0.08, optimal: 0.16, max: 0.26, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 3.5, max: 9.0, unit: "mm" },
          radial_depth_percent: { min: 25, optimal: 55, max: 80 }
        },
        drilling: {
          speed: { min: 38, optimal: 50, max: 62, unit: "m/min" },
          feed: { min: 0.14, optimal: 0.22, max: 0.32, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      statistics: {
        data_quality: "very_high",
        sample_size: 285,
        confidence_level: 0.95,
        standard_deviation_kc: 80,
        last_validated: "2025-12-05",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Sandvik-Data"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-016: AISI 1021 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-016": {
      id: "P-CS-016",
      name: "AISI 1021 Hot Rolled",
      designation: {
        aisi_sae: "1021",
        uns: "G10210",
        din: "1.0405",
        jis: "S20CK",
        en: "C22"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Hot Rolled",

      composition: {
        carbon: { min: 0.18, max: 0.23, typical: 0.21 },
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
        iron: { min: 98.5, max: 99.1, typical: 98.8 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1475, liquidus: 1523 },
        specific_heat: 486,
        thermal_conductivity: 50.8,
        thermal_expansion: 11.7e-6,
        electrical_resistivity: 16.4e-8,
        magnetic_permeability: 720,
        poissons_ratio: 0.29,
        elastic_modulus: 206000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 143,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 152
        },
        tensile_strength: { min: 460, typical: 490, max: 520 },
        yield_strength: { min: 295, typical: 325, max: 355 },
        elongation: { min: 22, typical: 26, max: 30 },
        reduction_of_area: { min: 45, typical: 55, max: 62 },
        impact_energy: { joules: 105, temperature: 20 },
        fatigue_strength: 220,
        fracture_toughness: 125
      },

      kienzle: {
        kc1_1: 1620,
        mc: 0.25,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.74,
        cutting_edge_correction: 1.03,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 295,
        B: 535,
        C: 0.034,
        n: 0.33,
        m: 1.05,
        melting_temp: 1523,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 365,
        n: 0.29,
        temperature_exponent: 2.1,
        hardness_factor: 0.98,
        coolant_factor: { dry: 1.0, flood: 1.38, mist: 1.16 },
        depth_exponent: 0.12
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "moderate",
        optimal_chip_thickness: 0.13,
        shear_angle: 31,
        friction_coefficient: 0.46,
        chip_compression_ratio: 2.4
      },

      tribology: {
        sliding_friction: 0.44,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1135,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.82,
        heat_partition_to_chip: 0.74,
        heat_partition_to_tool: 0.12,
        heat_partition_to_workpiece: 0.14,
        thermal_softening_onset: 442,
        recrystallization_temperature: 642,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.8, Ra_typical: 2.0, Ra_max: 4.0 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.09,
        microstructure_stability: "good",
        burr_formation: "moderate",
        surface_defect_sensitivity: "low",
        polishability: "good"
      },

      machinability: {
        aisi_rating: 78,
        relative_to_1212: 0.78,
        power_factor: 0.88,
        tool_wear_factor: 0.91,
        surface_finish_factor: 0.88,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      recommendations: {
        turning: {
          speed: { min: 150, optimal: 195, max: 240, unit: "m/min" },
          feed: { min: 0.16, optimal: 0.27, max: 0.44, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.8, max: 7.0, unit: "mm" }
        },
        milling: {
          speed: { min: 140, optimal: 185, max: 230, unit: "m/min" },
          feed_per_tooth: { min: 0.09, optimal: 0.17, max: 0.27, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 3.5, max: 9.0, unit: "mm" },
          radial_depth_percent: { min: 25, optimal: 55, max: 80 }
        },
        drilling: {
          speed: { min: 40, optimal: 52, max: 65, unit: "m/min" },
          feed: { min: 0.14, optimal: 0.23, max: 0.34, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      statistics: {
        data_quality: "high",
        sample_size: 195,
        confidence_level: 0.95,
        standard_deviation_kc: 82,
        last_validated: "2025-11-20",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Steel-Manual"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-017: AISI 1022 Hot Rolled
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-017": {
      id: "P-CS-017",
      name: "AISI 1022 Hot Rolled",
      designation: {
        aisi_sae: "1022",
        uns: "G10220",
        din: "1.0402",
        jis: "S22C",
        en: "C22E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Hot Rolled",

      composition: {
        carbon: { min: 0.18, max: 0.23, typical: 0.22 },
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
        iron: { min: 98.4, max: 99.0, typical: 98.7 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1474, liquidus: 1521 },
        specific_heat: 486,
        thermal_conductivity: 50.5,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 16.6e-8,
        magnetic_permeability: 710,
        poissons_ratio: 0.29,
        elastic_modulus: 206000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 149,
          rockwell_b: 80,
          rockwell_c: null,
          vickers: 158
        },
        tensile_strength: { min: 485, typical: 515, max: 545 },
        yield_strength: { min: 305, typical: 340, max: 370 },
        elongation: { min: 20, typical: 24, max: 28 },
        reduction_of_area: { min: 42, typical: 52, max: 58 },
        impact_energy: { joules: 95, temperature: 20 },
        fatigue_strength: 230,
        fracture_toughness: 120
      },

      kienzle: {
        kc1_1: 1680,
        mc: 0.25,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.74,
        cutting_edge_correction: 1.04,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 310,
        B: 550,
        C: 0.034,
        n: 0.32,
        m: 1.04,
        melting_temp: 1521,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 350,
        n: 0.28,
        temperature_exponent: 2.2,
        hardness_factor: 0.95,
        coolant_factor: { dry: 1.0, flood: 1.36, mist: 1.15 },
        depth_exponent: 0.12
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "moderate",
        optimal_chip_thickness: 0.12,
        shear_angle: 31,
        friction_coefficient: 0.45,
        chip_compression_ratio: 2.3
      },

      tribology: {
        sliding_friction: 0.43,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1130,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.84,
        heat_partition_to_chip: 0.75,
        heat_partition_to_tool: 0.12,
        heat_partition_to_workpiece: 0.13,
        thermal_softening_onset: 445,
        recrystallization_temperature: 645,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.7, Ra_typical: 1.8, Ra_max: 3.6 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.08,
        microstructure_stability: "good",
        burr_formation: "moderate",
        surface_defect_sensitivity: "low",
        polishability: "good"
      },

      machinability: {
        aisi_rating: 75,
        relative_to_1212: 0.75,
        power_factor: 0.90,
        tool_wear_factor: 0.88,
        surface_finish_factor: 0.90,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      recommendations: {
        turning: {
          speed: { min: 145, optimal: 185, max: 230, unit: "m/min" },
          feed: { min: 0.15, optimal: 0.26, max: 0.42, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.5, max: 6.5, unit: "mm" }
        },
        milling: {
          speed: { min: 135, optimal: 175, max: 220, unit: "m/min" },
          feed_per_tooth: { min: 0.08, optimal: 0.16, max: 0.26, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 3.0, max: 8.0, unit: "mm" },
          radial_depth_percent: { min: 25, optimal: 50, max: 75 }
        },
        drilling: {
          speed: { min: 38, optimal: 48, max: 60, unit: "m/min" },
          feed: { min: 0.12, optimal: 0.21, max: 0.32, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P20", "P25"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      statistics: {
        data_quality: "high",
        sample_size: 210,
        confidence_level: 0.95,
        standard_deviation_kc: 84,
        last_validated: "2025-11-25",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data"]
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-018: AISI 1023 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-018": {
      id: "P-CS-018",
      name: "AISI 1023 Cold Drawn",
      designation: {
        aisi_sae: "1023",
        uns: "G10230",
        din: "1.0406",
        jis: "S22CK",
        en: "C22"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Cold Drawn",

      composition: {
        carbon: { min: 0.20, max: 0.25, typical: 0.23 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
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
        iron: { min: 98.6, max: 99.2, typical: 98.9 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1472, liquidus: 1519 },
        specific_heat: 486,
        thermal_conductivity: 50.2,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 16.8e-8,
        magnetic_permeability: 700,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 149,
          rockwell_b: 80,
          rockwell_c: null,
          vickers: 158
        },
        tensile_strength: { min: 510, typical: 540, max: 570 },
        yield_strength: { min: 415, typical: 450, max: 480 },
        elongation: { min: 12, typical: 16, max: 20 },
        reduction_of_area: { min: 40, typical: 50, max: 56 },
        impact_energy: { joules: 85, temperature: 20 },
        fatigue_strength: 245,
        fracture_toughness: 112
      },

      kienzle: {
        kc1_1: 1750,
        mc: 0.24,
        kc_temp_coefficient: -0.0014,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.73,
        cutting_edge_correction: 1.05,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 330,
        B: 570,
        C: 0.033,
        n: 0.32,
        m: 1.04,
        melting_temp: 1519,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 335,
        n: 0.27,
        temperature_exponent: 2.3,
        hardness_factor: 0.93,
        coolant_factor: { dry: 1.0, flood: 1.35, mist: 1.14 },
        depth_exponent: 0.13
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "good",
        optimal_chip_thickness: 0.11,
        shear_angle: 32,
        friction_coefficient: 0.44,
        chip_compression_ratio: 2.2
      },

      tribology: {
        sliding_friction: 0.42,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1125,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.86,
        heat_partition_to_chip: 0.76,
        heat_partition_to_tool: 0.11,
        heat_partition_to_workpiece: 0.13,
        thermal_softening_onset: 450,
        recrystallization_temperature: 650,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.5, Ra_typical: 1.4, Ra_max: 2.8 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.07,
        microstructure_stability: "good",
        burr_formation: "low",
        surface_defect_sensitivity: "low",
        polishability: "very_good"
      },

      machinability: {
        aisi_rating: 72,
        relative_to_1212: 0.72,
        power_factor: 0.93,
        tool_wear_factor: 0.86,
        surface_finish_factor: 0.92,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      recommendations: {
        turning: {
          speed: { min: 135, optimal: 175, max: 215, unit: "m/min" },
          feed: { min: 0.14, optimal: 0.24, max: 0.38, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.2, max: 5.5, unit: "mm" }
        },
        milling: {
          speed: { min: 125, optimal: 165, max: 205, unit: "m/min" },
          feed_per_tooth: { min: 0.07, optimal: 0.14, max: 0.24, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 2.8, max: 7.0, unit: "mm" },
          radial_depth_percent: { min: 20, optimal: 45, max: 70 }
        },
        drilling: {
          speed: { min: 35, optimal: 45, max: 55, unit: "m/min" },
          feed: { min: 0.12, optimal: 0.19, max: 0.28, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P15", "P20"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_recommended"
      },

      statistics: {
        data_quality: "high",
        sample_size: 175,
        confidence_level: 0.95,
        standard_deviation_kc: 88,
        last_validated: "2025-11-10",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Machining-Data"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-019: AISI 1025 Annealed
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-019": {
      id: "P-CS-019",
      name: "AISI 1025 Annealed",
      designation: {
        aisi_sae: "1025",
        uns: "G10250",
        din: "1.0406",
        jis: "S25C",
        en: "C25E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Annealed",

      composition: {
        carbon: { min: 0.22, max: 0.28, typical: 0.25 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
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
        iron: { min: 98.5, max: 99.1, typical: 98.8 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1468, liquidus: 1515 },
        specific_heat: 486,
        thermal_conductivity: 49.8,
        thermal_expansion: 11.9e-6,
        electrical_resistivity: 17.0e-8,
        magnetic_permeability: 680,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 121,
          rockwell_b: 68,
          rockwell_c: null,
          vickers: 128
        },
        tensile_strength: { min: 410, typical: 450, max: 485 },
        yield_strength: { min: 275, typical: 310, max: 345 },
        elongation: { min: 25, typical: 30, max: 35 },
        reduction_of_area: { min: 50, typical: 58, max: 65 },
        impact_energy: { joules: 110, temperature: 20 },
        fatigue_strength: 205,
        fracture_toughness: 130
      },

      kienzle: {
        kc1_1: 1600,
        mc: 0.26,
        kc_temp_coefficient: -0.0015,
        kc_speed_coefficient: -0.08,
        rake_angle_correction: 0.016,
        chip_thickness_exponent: 0.75,
        cutting_edge_correction: 1.03,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 285,
        B: 530,
        C: 0.033,
        n: 0.34,
        m: 1.06,
        melting_temp: 1515,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 370,
        n: 0.30,
        temperature_exponent: 2.1,
        hardness_factor: 1.00,
        coolant_factor: { dry: 1.0, flood: 1.40, mist: 1.18 },
        depth_exponent: 0.11
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "very_low",
        built_up_edge_tendency: "high",
        chip_breaking: "poor",
        optimal_chip_thickness: 0.14,
        shear_angle: 29,
        friction_coefficient: 0.50,
        chip_compression_ratio: 2.6
      },

      tribology: {
        sliding_friction: 0.48,
        adhesion_tendency: "moderate_high",
        galling_tendency: "moderate",
        welding_temperature: 1120,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.80,
        heat_partition_to_chip: 0.72,
        heat_partition_to_tool: 0.14,
        heat_partition_to_workpiece: 0.14,
        thermal_softening_onset: 435,
        recrystallization_temperature: 635,
        hot_hardness_retention: "low",
        thermal_shock_sensitivity: "very_low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 1.0, Ra_typical: 2.4, Ra_max: 4.8 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "very_low",
        work_hardening_depth: 0.12,
        microstructure_stability: "good",
        burr_formation: "high",
        surface_defect_sensitivity: "low",
        polishability: "moderate"
      },

      machinability: {
        aisi_rating: 80,
        relative_to_1212: 0.80,
        power_factor: 0.85,
        tool_wear_factor: 0.92,
        surface_finish_factor: 0.84,
        chip_control_rating: "fair",
        overall_rating: "good",
        difficulty_class: 1
      },

      recommendations: {
        turning: {
          speed: { min: 155, optimal: 200, max: 250, unit: "m/min" },
          feed: { min: 0.18, optimal: 0.28, max: 0.46, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 3.0, max: 7.5, unit: "mm" }
        },
        milling: {
          speed: { min: 145, optimal: 190, max: 240, unit: "m/min" },
          feed_per_tooth: { min: 0.10, optimal: 0.18, max: 0.28, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 4.0, max: 10.0, unit: "mm" },
          radial_depth_percent: { min: 30, optimal: 55, max: 80 }
        },
        drilling: {
          speed: { min: 42, optimal: 55, max: 70, unit: "m/min" },
          feed: { min: 0.16, optimal: 0.26, max: 0.38, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P15", "P25", "P30"],
        preferred_coatings: ["TiAlN", "TiCN", "AlCrN"],
        coolant_recommendation: "flood_required"
      },

      statistics: {
        data_quality: "very_high",
        sample_size: 295,
        confidence_level: 0.95,
        standard_deviation_kc: 75,
        last_validated: "2025-12-08",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Sandvik-Data", "Kennametal-DB"]
      }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // P-CS-020: AISI 1025 Cold Drawn
    // ═══════════════════════════════════════════════════════════════════════════
    "P-CS-020": {
      id: "P-CS-020",
      name: "AISI 1025 Cold Drawn",
      designation: {
        aisi_sae: "1025",
        uns: "G10250",
        din: "1.0406",
        jis: "S25C",
        en: "C25E"
      },
      iso_group: "P",
      material_class: "Low Carbon Steel",
      condition: "Cold Drawn",

      composition: {
        carbon: { min: 0.22, max: 0.28, typical: 0.25 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
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
        iron: { min: 98.5, max: 99.1, typical: 98.8 }
      },

      physical: {
        density: 7870,
        melting_point: { solidus: 1468, liquidus: 1515 },
        specific_heat: 486,
        thermal_conductivity: 49.8,
        thermal_expansion: 11.9e-6,
        electrical_resistivity: 17.0e-8,
        magnetic_permeability: 680,
        poissons_ratio: 0.29,
        elastic_modulus: 207000,
        shear_modulus: 80000
      },

      mechanical: {
        hardness: {
          brinell: 149,
          rockwell_b: 80,
          rockwell_c: null,
          vickers: 158
        },
        tensile_strength: { min: 530, typical: 565, max: 600 },
        yield_strength: { min: 440, typical: 475, max: 510 },
        elongation: { min: 10, typical: 14, max: 18 },
        reduction_of_area: { min: 38, typical: 48, max: 55 },
        impact_energy: { joules: 75, temperature: 20 },
        fatigue_strength: 255,
        fracture_toughness: 105
      },

      kienzle: {
        kc1_1: 1820,
        mc: 0.24,
        kc_temp_coefficient: -0.0014,
        kc_speed_coefficient: -0.09,
        rake_angle_correction: 0.015,
        chip_thickness_exponent: 0.73,
        cutting_edge_correction: 1.06,
        engagement_factor: 1.0
      },

      johnson_cook: {
        A: 355,
        B: 585,
        C: 0.032,
        n: 0.31,
        m: 1.03,
        melting_temp: 1515,
        reference_strain_rate: 1.0
      },

      taylor: {
        C: 320,
        n: 0.26,
        temperature_exponent: 2.4,
        hardness_factor: 0.90,
        coolant_factor: { dry: 1.0, flood: 1.32, mist: 1.12 },
        depth_exponent: 0.13
      },

      chip_formation: {
        chip_type: "continuous",
        serration_tendency: "low",
        built_up_edge_tendency: "moderate",
        chip_breaking: "good",
        optimal_chip_thickness: 0.10,
        shear_angle: 33,
        friction_coefficient: 0.42,
        chip_compression_ratio: 2.1
      },

      tribology: {
        sliding_friction: 0.40,
        adhesion_tendency: "moderate",
        galling_tendency: "low",
        welding_temperature: 1115,
        oxide_stability: "moderate",
        lubricity_response: "good"
      },

      thermal_machining: {
        cutting_temperature_coefficient: 0.88,
        heat_partition_to_chip: 0.77,
        heat_partition_to_tool: 0.11,
        heat_partition_to_workpiece: 0.12,
        thermal_softening_onset: 455,
        recrystallization_temperature: 655,
        hot_hardness_retention: "moderate",
        thermal_shock_sensitivity: "low"
      },

      surface_integrity: {
        achievable_roughness: { Ra_min: 0.5, Ra_typical: 1.2, Ra_max: 2.4 },
        residual_stress_tendency: "compressive",
        white_layer_tendency: "low",
        work_hardening_depth: 0.06,
        microstructure_stability: "good",
        burr_formation: "low",
        surface_defect_sensitivity: "low",
        polishability: "very_good"
      },

      machinability: {
        aisi_rating: 70,
        relative_to_1212: 0.70,
        power_factor: 0.95,
        tool_wear_factor: 0.84,
        surface_finish_factor: 0.94,
        chip_control_rating: "good",
        overall_rating: "good",
        difficulty_class: 2
      },

      recommendations: {
        turning: {
          speed: { min: 130, optimal: 165, max: 205, unit: "m/min" },
          feed: { min: 0.12, optimal: 0.22, max: 0.35, unit: "mm/rev" },
          depth: { min: 0.5, optimal: 2.0, max: 5.0, unit: "mm" }
        },
        milling: {
          speed: { min: 120, optimal: 155, max: 195, unit: "m/min" },
          feed_per_tooth: { min: 0.07, optimal: 0.13, max: 0.22, unit: "mm" },
          axial_depth: { min: 0.5, optimal: 2.5, max: 6.0, unit: "mm" },
          radial_depth_percent: { min: 20, optimal: 45, max: 70 }
        },
        drilling: {
          speed: { min: 32, optimal: 42, max: 52, unit: "m/min" },
          feed: { min: 0.10, optimal: 0.18, max: 0.26, unit: "mm/rev" }
        },
        preferred_tool_grades: ["P10", "P15", "P20"],
        preferred_coatings: ["TiAlN", "AlTiN", "TiCN"],
        coolant_recommendation: "flood_required"
      },

      statistics: {
        data_quality: "very_high",
        sample_size: 260,
        confidence_level: 0.95,
        standard_deviation_kc: 92,
        last_validated: "2025-12-12",
        source_references: ["MFGDB-2024", "ASM-Handbook", "Sandvik-Data", "Kennametal-DB"]
      }
    }
  }
};

// Export for module usage
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

module.exports = CARBON_STEELS_011_020;
}
