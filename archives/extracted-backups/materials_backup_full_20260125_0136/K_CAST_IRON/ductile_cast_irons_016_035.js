: 12, max: 68 }
      },

      machinability: {
        aisi_rating: 25,
        relative_to_1212: 0.25,
        chip_form: "segmented_hard",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.45,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "crater_abrasive"
      },

      johnson_cook: {
        A: 980,
        B: 1200,
        n: 0.26,
        C: 0.011,
        m: 0.75,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 42, opt: 60, max: 85 }, feed: { min: 0.05, opt: 0.12, max: 0.22 }, doc: { min: 0.3, opt: 1.0, max: 2.5 } },
          ceramic: { speed: { min: 85, opt: 130, max: 185 }, feed: { min: 0.04, opt: 0.08, max: 0.15 }, doc: { min: 0.2, opt: 0.7, max: 1.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 35, opt: 50, max: 75 }, feed_per_tooth: { min: 0.04, opt: 0.07, max: 0.12 }, doc: { min: 0.3, opt: 1.0, max: 2.2 }, woc_factor: 0.40 }
        },
        drilling: {
          carbide: { speed: { min: 22, opt: 35, max: 52 }, feed_per_rev: { min: 0.04, opt: 0.08, max: 0.15 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "moderate",
        work_hardening_depth: 0.30,
        surface_roughness_typical: { Ra: 1.8, Rz: 12 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["high_strength_gears", "wear_components", "defense_applications", "heavy_equipment"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "ausferritic (fine)",
        graphite_size: "6-7",
        nodularity: { min: 85, typical: 90 },
        carbides: "trace",
        retained_austenite: "15-25%"
      },

      heat_treatment: {
        process: "Austempering",
        austenitize_temp: 900,
        austempering_temp: 300,
        austempering_time_min: 150,
        cooling: "salt_bath",
        purpose: "High strength for demanding applications"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "ADI Grade 3 - High strength grade. Severe work hardening. Machine before austempering."
    },

    "K-CI-028": {
      id: "K-CI-028",
      name: "ADI Grade 4 (1400/1)",
      designation: {
        astm: "A897 Grade 4",
        sae: "J2477 Grade 4",
        din: "EN-GJS-1400-1",
        en: "EN-GJS-1400-1",
        jis: "FCD1400-AD"
      },
      iso_group: "K",
      material_class: "Austempered Ductile Iron",
      condition: "Austempered (Ausferritic)",

      composition: {
        carbon: { min: 3.40, max: 3.80, typical: 3.60 },
        silicon: { min: 2.20, max: 2.80, typical: 2.50 },
        manganese: { min: 0.20, max: 0.40, typical: 0.30 },
        phosphorus: { min: 0, max: 0.02, typical: 0.010 },
        sulfur: { min: 0, max: 0.01, typical: 0.005 },
        chromium: { min: 0, max: 0.05, typical: 0.02 },
        nickel: { min: 0.40, max: 0.80, typical: 0.60 },
        molybdenum: { min: 0.15, max: 0.30, typical: 0.22 },
        copper: { min: 0.40, max: 0.80, typical: 0.60 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.02, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 90.5, max: 93.0, typical: 91.8 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 21,
        thermal_expansion: 12.8e-6,
        electrical_resistivity: 34e-8,
        magnetic_permeability: 1.10,
        poissons_ratio: 0.28,
        elastic_modulus: 166000,
        shear_modulus: 66000
      },

      mechanical: {
        hardness: {
          brinell: 400,
          rockwell_c: 42,
          rockwell_b: null,
          vickers: 420
        },
        tensile_strength: { min: 1400, typical: 1520, max: 1650 },
        yield_strength: { min: 1100, typical: 1200, max: 1300 },
        compressive_strength: { min: 4200, typical: 4560, max: 4950 },
        elongation: { min: 1, typical: 2, max: 3 },
        reduction_of_area: { min: 1, typical: 2, max: 3 },
        impact_energy: { joules: 35, temperature: 20 },
        fatigue_strength: 610,
        fracture_toughness: 40
      },

      kienzle: {
        kc1_1: 2200,
        mc: 0.19,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.15,
        chip_compression: 3.9
      },

      taylor: {
        C: 50,
        n: 0.19,
        reference_speed: 32,
        reference_life: 15,
        speed_range: { min: 10, max: 55 }
      },

      machinability: {
        aisi_rating: 18,
        relative_to_1212: 0.18,
        chip_form: "powder_segmented",
        surface_finish_achievable: 2.0,
        cutting_force_factor: 1.60,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "VERY DIFFICULT. CBN or ceramic required. Grinding preferred."
      },

      johnson_cook: {
        A: 1180,
        B: 1400,
        n: 0.22,
        C: 0.009,
        m: 0.72,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          ceramic: { speed: { min: 70, opt: 105, max: 150 }, feed: { min: 0.03, opt: 0.06, max: 0.12 }, doc: { min: 0.15, opt: 0.5, max: 1.2 } },
          cbn: { speed: { min: 100, opt: 150, max: 220 }, feed: { min: 0.03, opt: 0.06, max: 0.12 }, doc: { min: 0.1, opt: 0.4, max: 1.0 } }
        },
        grinding: {
          wheel_type: "CBN",
          speed: 25,
          feed_rate: 0.008,
          notes: "Grinding strongly recommended"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "high",
        work_hardening_depth: 0.35,
        surface_roughness_typical: { Ra: 2.0, Rz: 14 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["armor_applications", "high_wear_gears", "mill_liners", "crusher_components"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "ausferritic (very fine)",
        graphite_size: "6-7",
        nodularity: { min: 85, typical: 90 },
        carbides: "5%",
        retained_austenite: "10-20%"
      },

      heat_treatment: {
        process: "Austempering",
        austenitize_temp: 900,
        austempering_temp: 260,
        austempering_time_min: 180,
        cooling: "salt_bath",
        purpose: "Maximum strength ADI"
      },

      damping_capacity: {
        relative_to_steel: 1.5,
        log_decrement: 0.015
      },

      notes: "ADI Grade 4 - Very high strength. EXTREMELY difficult to machine. Pre-machine before austempering."
    },

    "K-CI-029": {
      id: "K-CI-029",
      name: "ADI Grade 5 (1600/0)",
      designation: {
        astm: "A897 Grade 5",
        sae: "J2477 Grade 5",
        din: "EN-GJS-HB450",
        en: "EN-GJS-HB450",
        jis: "FCD-AD5"
      },
      iso_group: "H",
      material_class: "Austempered Ductile Iron",
      condition: "Austempered (Maximum Hardness)",

      composition: {
        carbon: { min: 3.40, max: 3.80, typical: 3.60 },
        silicon: { min: 2.20, max: 2.80, typical: 2.50 },
        manganese: { min: 0.20, max: 0.40, typical: 0.30 },
        phosphorus: { min: 0, max: 0.02, typical: 0.010 },
        sulfur: { min: 0, max: 0.01, typical: 0.005 },
        chromium: { min: 0, max: 0.05, typical: 0.02 },
        nickel: { min: 0.40, max: 0.80, typical: 0.60 },
        molybdenum: { min: 0.15, max: 0.30, typical: 0.22 },
        copper: { min: 0.40, max: 0.80, typical: 0.60 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.02, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 90.5, max: 93.0, typical: 91.8 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 20,
        thermal_expansion: 12.5e-6,
        electrical_resistivity: 32e-8,
        magnetic_permeability: 1.15,
        poissons_ratio: 0.28,
        elastic_modulus: 168000,
        shear_modulus: 67000
      },

      mechanical: {
        hardness: {
          brinell: 450,
          rockwell_c: 47,
          rockwell_b: null,
          vickers: 473
        },
        tensile_strength: { min: 1600, typical: 1750, max: 1900 },
        yield_strength: { min: 1300, typical: 1420, max: 1550 },
        compressive_strength: { min: 4800, typical: 5250, max: 5700 },
        elongation: { min: 0, typical: 1, max: 2 },
        reduction_of_area: { min: 0, typical: 1, max: 2 },
        impact_energy: { joules: 20, temperature: 20 },
        fatigue_strength: 700,
        fracture_toughness: 30
      },

      kienzle: {
        kc1_1: 2450,
        mc: 0.18,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.18,
        chip_compression: 4.1
      },

      taylor: {
        C: 35,
        n: 0.18,
        reference_speed: 22,
        reference_life: 15,
        speed_range: { min: 6, max: 40 }
      },

      machinability: {
        aisi_rating: 12,
        relative_to_1212: 0.12,
        chip_form: "powder",
        surface_finish_achievable: 2.5,
        cutting_force_factor: 1.80,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "extreme_abrasive",
        notes: "GRINDING ONLY. No practical cutting possible."
      },

      johnson_cook: {
        A: 1400,
        B: 1650,
        n: 0.18,
        C: 0.007,
        m: 0.68,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "CBN or Diamond",
          speed: 20,
          feed_rate: 0.005,
          notes: "ONLY practical machining method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "very_high",
        work_hardening_depth: 0.40,
        surface_roughness_typical: { Ra: 0.8, Rz: 5 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["armor_plate", "wear_plates", "ball_mill_liners", "chute_liners"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "bainitic-ausferritic",
        graphite_size: "6-7",
        nodularity: { min: 85, typical: 90 },
        carbides: "8-12%",
        retained_austenite: "5-15%"
      },

      heat_treatment: {
        process: "Austempering (Low Temperature)",
        austenitize_temp: 900,
        austempering_temp: 230,
        austempering_time_min: 240,
        cooling: "salt_bath",
        purpose: "Maximum hardness and wear resistance"
      },

      damping_capacity: {
        relative_to_steel: 1.2,
        log_decrement: 0.012
      },

      notes: "ADI Grade 5 - Maximum hardness. CANNOT BE MACHINED. Grinding only. Pre-machine to final dimensions."
    },

    "K-CI-030": {
      id: "K-CI-030",
      name: "Ni-Resist Type D-2 (Austenitic)",
      designation: {
        astm: "A439 Type D-2",
        sae: "",
        din: "GGL-NiCuCr 15 6 2",
        en: "EN-GJLA-XNiCuCr15-6-2",
        jis: "FCA-NiCuCr"
      },
      iso_group: "K",
      material_class: "Austenitic Ductile Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.90, max: 3.30, typical: 3.10 },
        silicon: { min: 1.50, max: 2.80, typical: 2.20 },
        manganese: { min: 0.70, max: 1.25, typical: 1.00 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0, max: 0.03, typical: 0.015 },
        chromium: { min: 1.75, max: 2.75, typical: 2.25 },
        nickel: { min: 18.0, max: 22.0, typical: 20.0 },
        molybdenum: { min: 0, max: 0.50, typical: 0.25 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 68.0, max: 75.0, typical: 71.5 }
      },

      physical: {
        density: 7400,
        melting_point: { solidus: 1180, liquidus: 1280 },
        specific_heat: 500,
        thermal_conductivity: 13,
        thermal_expansion: 18.5e-6,
        electrical_resistivity: 100e-8,
        magnetic_permeability: 1.01,
        poissons_ratio: 0.29,
        elastic_modulus: 140000,
        shear_modulus: 54000
      },

      mechanical: {
        hardness: {
          brinell: 150,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 157
        },
        tensile_strength: { min: 400, typical: 450, max: 500 },
        yield_strength: { min: 210, typical: 240, max: 275 },
        compressive_strength: { min: 1200, typical: 1350, max: 1500 },
        elongation: { min: 15, typical: 25, max: 35 },
        reduction_of_area: { min: 12, typical: 20, max: 28 },
        impact_energy: { joules: 30, temperature: 20 },
        fatigue_strength: 180,
        fracture_toughness: 65
      },

      kienzle: {
        kc1_1: 1450,
        mc: 0.28,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.5,
        note: "Work hardens significantly"
      },

      taylor: {
        C: 65,
        n: 0.22,
        reference_speed: 40,
        reference_life: 15,
        speed_range: { min: 12, max: 65 }
      },

      machinability: {
        aisi_rating: 30,
        relative_to_1212: 0.30,
        chip_form: "continuous_stringy",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.35,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "notch_crater",
        notes: "Severe work hardening. Similar to machining austenitic stainless."
      },

      johnson_cook: {
        A: 280,
        B: 680,
        n: 0.45,
        C: 0.030,
        m: 0.95,
        T_melt: 1230,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 40, opt: 60, max: 85 }, feed: { min: 0.10, opt: 0.20, max: 0.35 }, doc: { min: 0.5, opt: 1.5, max: 4.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 32, opt: 50, max: 72 }, feed_per_tooth: { min: 0.08, opt: 0.14, max: 0.22 }, doc: { min: 0.5, opt: 1.5, max: 3.5 }, woc_factor: 0.45 }
        },
        drilling: {
          carbide: { speed: { min: 20, opt: 35, max: 50 }, feed_per_rev: { min: 0.08, opt: 0.15, max: 0.28 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.50,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "high_lubricity_EP",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["pumps_for_seawater", "chemical_equipment", "cryogenic_equipment", "high_temp_applications"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "austenitic",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "5-10%"
      },

      corrosion_resistance: {
        seawater: "excellent",
        acids: "good",
        alkalis: "excellent",
        high_temp_oxidation: "excellent"
      },

      damping_capacity: {
        relative_to_steel: 4,
        log_decrement: 0.032
      },

      notes: "Austenitic (non-magnetic) ductile iron. Excellent corrosion resistance. Work hardens severely."
    },

    "K-CI-031": {
      id: "K-CI-031",
      name: "Ni-Resist Type D-5S (High Silicon)",
      designation: {
        astm: "A439 Type D-5S",
        sae: "",
        din: "GGL-NiSiCr 35 5 2",
        en: "EN-GJSA-XNiSiCr35-5-2",
        jis: "FCA-NiSiCr"
      },
      iso_group: "K",
      material_class: "Austenitic Ductile Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.40, max: 2.80, typical: 2.60 },
        silicon: { min: 4.50, max: 5.50, typical: 5.00 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0, max: 0.03, typical: 0.015 },
        chromium: { min: 1.75, max: 2.25, typical: 2.00 },
        nickel: { min: 34.0, max: 36.0, typical: 35.0 },
        molybdenum: { min: 0, max: 0.30, typical: 0.15 },
        copper: { min: 0, max: 0.30, typical: 0.15 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 52.0, max: 58.0, typical: 55.0 }
      },

      physical: {
        density: 7300,
        melting_point: { solidus: 1200, liquidus: 1320 },
        specific_heat: 510,
        thermal_conductivity: 11,
        thermal_expansion: 13.5e-6,
        electrical_resistivity: 110e-8,
        magnetic_permeability: 1.01,
        poissons_ratio: 0.29,
        elastic_modulus: 130000,
        shear_modulus: 50000
      },

      mechanical: {
        hardness: {
          brinell: 140,
          rockwell_b: 75,
          rockwell_c: null,
          vickers: 147
        },
        tensile_strength: { min: 380, typical: 420, max: 480 },
        yield_strength: { min: 195, typical: 220, max: 250 },
        compressive_strength: { min: 1140, typical: 1260, max: 1440 },
        elongation: { min: 10, typical: 18, max: 28 },
        reduction_of_area: { min: 8, typical: 15, max: 22 },
        impact_energy: { joules: 25, temperature: 20 },
        fatigue_strength: 170,
        fracture_toughness: 60
      },

      kienzle: {
        kc1_1: 1380,
        mc: 0.29,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.4
      },

      taylor: {
        C: 60,
        n: 0.23,
        reference_speed: 38,
        reference_life: 15,
        speed_range: { min: 10, max: 60 }
      },

      machinability: {
        aisi_rating: 28,
        relative_to_1212: 0.28,
        chip_form: "continuous_stringy",
        surface_finish_achievable: 2.0,
        cutting_force_factor: 1.32,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "notch_crater"
      },

      johnson_cook: {
        A: 260,
        B: 650,
        n: 0.48,
        C: 0.032,
        m: 0.98,
        T_melt: 1260,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 38, opt: 55, max: 78 }, feed: { min: 0.10, opt: 0.18, max: 0.32 }, doc: { min: 0.5, opt: 1.2, max: 3.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 30, opt: 45, max: 68 }, feed_per_tooth: { min: 0.08, opt: 0.12, max: 0.20 }, doc: { min: 0.5, opt: 1.2, max: 3.0 }, woc_factor: 0.45 }
        },
        drilling: {
          carbide: { speed: { min: 18, opt: 32, max: 48 }, feed_per_rev: { min: 0.08, opt: 0.14, max: 0.25 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.55,
        surface_roughness_typical: { Ra: 2.0, Rz: 12 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "high_lubricity_EP",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["high_temp_furnace_parts", "heat_treatment_fixtures", "glass_molds", "exhaust_manifolds"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "austenitic",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "trace"
      },

      high_temp_properties: {
        oxidation_resistance: "EXCELLENT to 900°C",
        scaling_limit: 950,
        creep_strength_650C: 60
      },

      corrosion_resistance: {
        seawater: "excellent",
        acids: "good_to_moderate",
        alkalis: "excellent",
        high_temp_oxidation: "EXCEPTIONAL"
      },

      damping_capacity: {
        relative_to_steel: 4.5,
        log_decrement: 0.035
      },

      notes: "High-silicon austenitic for elevated temperatures. Exceptional oxidation resistance to 900°C."
    },

    "K-CI-032": {
      id: "K-CI-032",
      name: "Silicon-Molybdenum Ductile Iron (SiMo)",
      designation: {
        astm: "A1095",
        sae: "J2952",
        din: "GGG-SiMo5-1",
        en: "EN-GJS-SiMo5-1",
        jis: "FCD-SiMo"
      },
      iso_group: "K",
      material_class: "Ductile Cast Iron - High Temperature",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.00, max: 3.50, typical: 3.25 },
        silicon: { min: 4.00, max: 5.50, typical: 4.75 },
        manganese: { min: 0.20, max: 0.50, typical: 0.35 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        molybdenum: { min: 0.80, max: 1.20, typical: 1.00 },
        copper: { min: 0, max: 0.30, typical: 0.15 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 87.0, max: 91.0, typical: 89.0 }
      },

      physical: {
        density: 7050,
        melting_point: { solidus: 1140, liquidus: 1200 },
        specific_heat: 500,
        thermal_conductivity: 15,
        thermal_expansion: 12.5e-6,
        electrical_resistivity: 65e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.28,
        elastic_modulus: 165000,
        shear_modulus: 65000
      },

      mechanical: {
        hardness: {
          brinell: 200,
          rockwell_b: 93,
          rockwell_c: null,
          vickers: 210
        },
        tensile_strength: { min: 480, typical: 550, max: 620 },
        yield_strength: { min: 380, typical: 430, max: 485 },
        compressive_strength: { min: 1440, typical: 1650, max: 1860 },
        elongation: { min: 5, typical: 10, max: 15 },
        reduction_of_area: { min: 5, typical: 10, max: 15 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 220,
        fracture_toughness: 35
      },

      kienzle: {
        kc1_1: 1400,
        mc: 0.24,
        kc_adjust_rake: -1.8,
        kc_adjust_speed: -0.12,
        chip_compression: 3.2
      },

      taylor: {
        C: 140,
        n: 0.24,
        reference_speed: 85,
        reference_life: 15,
        speed_range: { min: 30, max: 135 }
      },

      machinability: {
        aisi_rating: 55,
        relative_to_1212: 0.55,
        chip_form: "short_curled",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.15,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_abrasive"
      },

      johnson_cook: {
        A: 500,
        B: 720,
        n: 0.25,
        C: 0.015,
        m: 0.82,
        T_melt: 1170,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 85, opt: 120, max: 165 }, feed: { min: 0.10, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.2, max: 5.5 } },
          carbide_uncoated: { speed: { min: 65, opt: 95, max: 130 }, feed: { min: 0.10, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.2, max: 5.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 68, opt: 100, max: 145 }, feed_per_tooth: { min: 0.08, opt: 0.13, max: 0.22 }, doc: { min: 0.8, opt: 2.2, max: 4.8 }, woc_factor: 0.52 }
        },
        drilling: {
          carbide: { speed: { min: 45, opt: 70, max: 100 }, feed_per_rev: { min: 0.08, opt: 0.16, max: 0.30 } },
          hss_cobalt: { speed: { min: 13, opt: 22, max: 32 }, feed_per_rev: { min: 0.08, opt: 0.16, max: 0.30 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.08,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["exhaust_manifolds", "turbocharger_housings", "brake_discs", "furnace_parts"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "ferritic",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 88 },
        carbides: "none"
      },

      high_temp_properties: {
        oxidation_resistance: "Excellent to 850°C",
        scaling_limit: 870,
        creep_strength_650C: 45,
        thermal_fatigue_resistance: "excellent"
      },

      damping_capacity: {
        relative_to_steel: 3.5,
        log_decrement: 0.028
      },

      notes: "SiMo grade for automotive exhaust and turbocharger applications. Excellent thermal fatigue resistance."
    },

    "K-CI-033": {
      id: "K-CI-033",
      name: "Solid Solution Strengthened Ferritic Ductile Iron",
      designation: {
        astm: "A536 Modified",
        sae: "",
        din: "GGG-40 Si",
        en: "EN-GJS-450-18",
        jis: "FCD450-Si"
      },
      iso_group: "K",
      material_class: "Ductile Cast Iron - Solution Strengthened",
      condition: "As-Cast (High Si Ferritic)",

      composition: {
        carbon: { min: 3.30, max: 3.70, typical: 3.50 },
        silicon: { min: 3.50, max: 4.30, typical: 3.90 },
        manganese: { min: 0.10, max: 0.30, typical: 0.20 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.05, typical: 0.02 },
        nickel: { min: 0, max: 0.10, typical: 0.05 },
        molybdenum: { min: 0, max: 0.03, typical: 0.015 },
        copper: { min: 0, max: 0.10, typical: 0.05 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 90.0, max: 93.0, typical: 91.5 }
      },

      physical: {
        density: 7050,
        melting_point: { solidus: 1135, liquidus: 1185 },
        specific_heat: 470,
        thermal_conductivity: 28,
        thermal_expansion: 12.8e-6,
        electrical_resistivity: 60e-8,
        magnetic_permeability: 140,
        poissons_ratio: 0.28,
        elastic_modulus: 168000,
        shear_modulus: 66000
      },

      mechanical: {
        hardness: {
          brinell: 165,
          rockwell_b: 84,
          rockwell_c: null,
          vickers: 173
        },
        tensile_strength: { min: 450, typical: 500, max: 550 },
        yield_strength: { min: 350, typical: 400, max: 450 },
        compressive_strength: { min: 1350, typical: 1500, max: 1650 },
        elongation: { min: 14, typical: 18, max: 22 },
        reduction_of_area: { min: 12, typical: 16, max: 20 },
        impact_energy: { joules: 14, temperature: 20 },
        fatigue_strength: 200,
        fracture_toughness: 48
      },

      kienzle: {
        kc1_1: 1200,
        mc: 0.25,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.0
      },

      taylor: {
        C: 190,
        n: 0.25,
        reference_speed: 105,
        reference_life: 15,
        speed_range: { min: 40, max: 168 }
      },

      machinability: {
        aisi_rating: 80,
        relative_to_1212: 0.80,
        chip_form: "continuous_curled",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.02,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 450,
        B: 620,
        n: 0.28,
        C: 0.018,
        m: 0.88,
        T_melt: 1160,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 105, opt: 148, max: 200 }, feed: { min: 0.12, opt: 0.28, max: 0.45 }, doc: { min: 1.0, opt: 2.8, max: 7.0 } },
          carbide_uncoated: { speed: { min: 82, opt: 118, max: 158 }, feed: { min: 0.12, opt: 0.28, max: 0.45 }, doc: { min: 1.0, opt: 2.8, max: 7.0 } },
          ceramic: { speed: { min: 210, opt: 320, max: 440 }, feed: { min: 0.08, opt: 0.16, max: 0.28 }, doc: { min: 0.5, opt: 1.8, max: 3.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 85, opt: 125, max: 178 }, feed_per_tooth: { min: 0.08, opt: 0.16, max: 0.26 }, doc: { min: 1.0, opt: 2.8, max: 5.8 }, woc_factor: 0.55 }
        },
        drilling: {
          carbide: { speed: { min: 55, opt: 88, max: 120 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.36 } },
          hss_cobalt: { speed: { min: 17, opt: 27, max: 38 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.36 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.05,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["wind_turbine_hubs", "heavy_structural_castings", "machine_frames", "press_components"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "ferritic (100% Si-strengthened)",
        graphite_size: "6-7",
        nodularity: { min: 85, typical: 92 },
        carbides: "none"
      },

      damping_capacity: {
        relative_to_steel: 4,
        log_decrement: 0.032
      },

      notes: "High-Si solution strengthened grade. Combines ferritic ductility with higher strength. No heat treatment required."
    },

    "K-CI-034": {
      id: "K-CI-034",
      name: "Ductile Iron Induction Hardened Surface",
      designation: {
        astm: "A536 80-55-06 IH",
        sae: "J434 D5506 IH",
        din: "GGG-50 IH",
        en: "EN-GJS-500-7 IH",
        jis: "FCD500-IH"
      },
      iso_group: "H",
      material_class: "Ductile Cast Iron - Surface Hardened",
      condition: "Induction Hardened",

      composition: {
        carbon: { min: 3.30, max: 3.70, typical: 3.50 },
        silicon: { min: 1.80, max: 2.40, typical: 2.10 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0, max: 0.20, typical: 0.10 },
        molybdenum: { min: 0, max: 0.06, typical: 0.03 },
        copper: { min: 0.30, max: 0.60, typical: 0.45 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 91.5, max: 93.5, typical: 92.5 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 32,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 50e-8,
        magnetic_permeability: 250,
        poissons_ratio: 0.28,
        elastic_modulus: 172000,
        shear_modulus: 68000
      },

      mechanical: {
        hardness: {
          brinell: 560,
          rockwell_c: 56,
          rockwell_b: null,
          vickers: 588,
          surface_note: "Surface hardness - core 195 HB"
        },
        tensile_strength: { min: 552, typical: 600, max: 650 },
        yield_strength: { min: 379, typical: 420, max: 460 },
        compressive_strength: { min: 1650, typical: 1800, max: 1950 },
        elongation: { min: 6, typical: 8, max: 12 },
        reduction_of_area: { min: 5, typical: 8, max: 12 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 280,
        fracture_toughness: 30
      },

      kienzle: {
        kc1_1: 1600,
        mc: 0.20,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.12,
        chip_compression: 3.5,
        note: "Values for hardened surface"
      },

      taylor: {
        C: 70,
        n: 0.19,
        reference_speed: 42,
        reference_life: 15,
        speed_range: { min: 12, max: 72 }
      },

      machinability: {
        aisi_rating: 22,
        relative_to_1212: 0.22,
        chip_form: "powder_segmented",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 1.48,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_crater",
        notes: "CBN required for hardened surface. Grinding preferred."
      },

      johnson_cook: {
        A: 760,
        B: 880,
        n: 0.14,
        C: 0.011,
        m: 0.72,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          cbn: { speed: { min: 70, opt: 105, max: 155 }, feed: { min: 0.04, opt: 0.08, max: 0.15 }, doc: { min: 0.1, opt: 0.25, max: 0.6 } }
        },
        grinding: {
          wheel_type: "CBN",
          speed: 28,
          feed_rate: 0.008,
          notes: "Preferred finishing method for hardened surface"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "low",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.4, Rz: 3 },
        hardened_case_depth: { min: 2.0, typical: 4.0, max: 8.0 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "moderate"
      },

      applications: ["camshafts", "crankshafts", "gears", "bearing_journals"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "martensite (surface), pearlite (core)",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "none"
      },

      heat_treatment: {
        process: "Induction Hardening",
        frequency_khz: 10,
        surface_temperature: 900,
        quench: "polymer_quench",
        case_depth_mm: 4,
        temper_temperature: 175,
        purpose: "Wear-resistant surface with tough ductile core"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "Induction hardened ductile iron. Superior to gray iron due to tough core. Excellent for automotive camshafts/crankshafts."
    },

    "K-CI-035": {
      id: "K-CI-035",
      name: "Ductile Iron Nitrided Surface",
      designation: {
        astm: "A536 80-55-06 Nit",
        sae: "J434 D5506 Nit",
        din: "GGG-50 Nit",
        en: "EN-GJS-500-7 Nit",
        jis: "FCD500-Nit"
      },
      iso_group: "H",
      material_class: "Ductile Cast Iron - Surface Hardened",
      condition: "Nitrided",

      composition: {
        carbon: { min: 3.30, max: 3.70, typical: 3.50 },
        silicon: { min: 1.80, max: 2.40, typical: 2.10 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0.20, max: 0.40, typical: 0.30 },
        nickel: { min: 0, max: 0.20, typical: 0.10 },
        molybdenum: { min: 0.15, max: 0.30, typical: 0.22 },
        copper: { min: 0.30, max: 0.60, typical: 0.45 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        aluminum: { min: 0.20, max: 0.50, typical: 0.35 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 90.5, max: 93.0, typical: 91.8 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 31,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 52e-8,
        magnetic_permeability: 230,
        poissons_ratio: 0.28,
        elastic_modulus: 172000,
        shear_modulus: 68000
      },

      mechanical: {
        hardness: {
          brinell: 620,
          rockwell_c: 60,
          rockwell_b: null,
          vickers: 651,
          surface_note: "Surface hardness (compound zone) - core 195 HB"
        },
        tensile_strength: { min: 552, typical: 600, max: 650 },
        yield_strength: { min: 379, typical: 420, max: 460 },
        compressive_strength: { min: 1650, typical: 1800, max: 1950 },
        elongation: { min: 6, typical: 8, max: 12 },
        reduction_of_area: { min: 5, typical: 8, max: 12 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 320,
        fracture_toughness: 30
      },

      kienzle: {
        kc1_1: 1700,
        mc: 0.19,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.15,
        chip_compression: 3.6,
        note: "Values for nitrided surface"
      },

      taylor: {
        C: 55,
        n: 0.18,
        reference_speed: 35,
        reference_life: 15,
        speed_range: { min: 10, max: 58 }
      },

      machinability: {
        aisi_rating: 18,
        relative_to_1212: 0.18,
        chip_form: "powder",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 1.55,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "GRINDING ONLY for nitrided surface. CBN wheels required."
      },

      johnson_cook: {
        A: 800,
        B: 920,
        n: 0.12,
        C: 0.009,
        m: 0.68,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "CBN",
          speed: 25,
          feed_rate: 0.005,
          notes: "ONLY practical method for nitrided surface"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "highly_compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.3, Rz: 2 },
        nitrided_case_depth: { compound_zone: 0.015, diffusion_zone: 0.30 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "minimal"
      },

      applications: ["precision_gears", "diesel_crankshafts", "cam_followers", "hydraulic_components"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "pearlite (core), Fe4N compound zone (surface)",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "none",
        nitrides: "Fe4N compound zone + diffusion zone"
      },

      heat_treatment: {
        process: "Gas Nitriding",
        temperature: 520,
        time_hours: 48,
        atmosphere: "NH3",
        case_depth_mm: 0.3,
        purpose: "Maximum wear and fatigue resistance with minimal distortion"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "Nitrided ductile iron. Exceptional fatigue strength improvement. Minimal distortion during treatment."
    }
  }
};

if (typeof module !== "undefined" && 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: K_CAST_IRON | Materials: 8 | Sections added: 5
// ADD THESE TO EACH MATERIAL:
// ============================================================================
/*
      chipFormation: {
        chipType: { primary: "DISCONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 32, unit: "degrees", range: { min: 27, max: 38 } },
        chipCompressionRatio: { value: 2.5, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "NONE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "EXCELLENT", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.35, withCoolant: 0.22, withMQL: 0.27 },
        toolWorkpieceInterface: { dry: 0.28, withCoolant: 0.18 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "NONE" },
        abrasiveness: { rating: "HIGH" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 220, b: 0.24, c: 0.10 }, maxRecommended: { value: 850, unit: "C" } },
        heatPartition: { chip: 0.70, tool: 0.24, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 930, overTempering: 670, burning: 1050 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -80, subsurface: 48, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 8, strainHardeningExponent: 0.10 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.82,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed", "Estimated"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
*/

module.exports) {
  
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: K_CAST_IRON | Materials: 8 | Sections added: 5
// ADD THESE TO EACH MATERIAL:
// ============================================================================
/*
      chipFormation: {
        chipType: { primary: "DISCONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 32, unit: "degrees", range: { min: 27, max: 38 } },
        chipCompressionRatio: { value: 2.5, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "NONE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "EXCELLENT", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.35, withCoolant: 0.22, withMQL: 0.27 },
        toolWorkpieceInterface: { dry: 0.28, withCoolant: 0.18 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "NONE" },
        abrasiveness: { rating: "HIGH" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 220, b: 0.24, c: 0.10 }, maxRecommended: { value: 850, unit: "C" } },
        heatPartition: { chip: 0.70, tool: 0.24, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 930, overTempering: 670, burning: 1050 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -80, subsurface: 48, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 8, strainHardeningExponent: 0.10 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.82,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed", "Estimated"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
*/

module.exports = DUCTILE_CAST_IRONS_016_035;
}
