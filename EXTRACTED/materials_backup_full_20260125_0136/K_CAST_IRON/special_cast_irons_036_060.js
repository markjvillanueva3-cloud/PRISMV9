/**
 * PRISM MATERIALS DATABASE - Malleable, CGI, and White Cast Irons
 * File: special_cast_irons_036_060.js
 * Materials: K-CI-036 through K-CI-060
 * 
 * ISO Category: K (Cast Irons) / H (Hardened)
 * Sub-categories: Malleable, CGI (Vermicular), White Cast Irons
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * 
 * CAST IRON TYPE SUMMARY:
 * - Malleable: Heat-treated white iron → temper carbon nodules
 * - CGI: Compacted/vermicular graphite → compromise between gray and ductile
 * - White: No graphite → carbides → extreme hardness
 * 
 * Created: 2026-01-25
 */

const SPECIAL_CAST_IRONS_036_060 = {
  metadata: {
    file: "special_cast_irons_036_060.js",
    category: "K_CAST_IRON",
    subcategory: "Special Cast Irons",
    materialCount: 25,
    idRange: { start: "K-CI-036", end: "K-CI-060" },
    schemaVersion: "3.0.0",
    created: "2026-01-25"
  },

  materials: {
    // ═══════════════════════════════════════════════════════════════════════════
    // MALLEABLE CAST IRONS (K-CI-036 to K-CI-042)
    // ═══════════════════════════════════════════════════════════════════════════

    "K-CI-036": {
      id: "K-CI-036",
      name: "Malleable Iron M3210 Ferritic (Blackheart)",
      designation: {
        astm: "A47 Grade 32510",
        sae: "J158 M3210",
        din: "GTS-35",
        en: "EN-GJMB-350-10",
        jis: "FCMB35"
      },
      iso_group: "K",
      material_class: "Malleable Cast Iron - Ferritic",
      condition: "Malleabilized (Blackheart)",

      composition: {
        carbon: { min: 2.20, max: 2.70, typical: 2.45 },
        silicon: { min: 1.00, max: 1.75, typical: 1.40 },
        manganese: { min: 0.20, max: 0.55, typical: 0.40 },
        phosphorus: { min: 0, max: 0.15, typical: 0.08 },
        sulfur: { min: 0.05, max: 0.18, typical: 0.10 },
        chromium: { min: 0, max: 0.08, typical: 0.04 },
        nickel: { min: 0, max: 0.10, typical: 0.05 },
        molybdenum: { min: 0, max: 0.03, typical: 0.015 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        titanium: { min: 0, max: 0.03, typical: 0.015 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 94.0, max: 96.5, typical: 95.2 }
      },

      physical: {
        density: 7300,
        melting_point: { solidus: 1140, liquidus: 1230 },
        specific_heat: 460,
        thermal_conductivity: 50,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 30e-8,
        magnetic_permeability: 180,
        poissons_ratio: 0.27,
        elastic_modulus: 175000,
        shear_modulus: 69000
      },

      mechanical: {
        hardness: {
          brinell: 130,
          rockwell_b: 70,
          rockwell_c: null,
          vickers: 136
        },
        tensile_strength: { min: 345, typical: 380, max: 420 },
        yield_strength: { min: 220, typical: 250, max: 280 },
        compressive_strength: { min: 1035, typical: 1140, max: 1260 },
        elongation: { min: 10, typical: 14, max: 18 },
        reduction_of_area: { min: 8, typical: 12, max: 16 },
        impact_energy: { joules: 12, temperature: 20 },
        fatigue_strength: 150,
        fracture_toughness: 38
      },

      kienzle: {
        kc1_1: 980,
        mc: 0.27,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.6
      },

      taylor: {
        C: 240,
        n: 0.27,
        reference_speed: 130,
        reference_life: 15,
        speed_range: { min: 50, max: 210 }
      },

      machinability: {
        aisi_rating: 110,
        relative_to_1212: 1.10,
        chip_form: "continuous_curled",
        surface_finish_achievable: 1.2,
        cutting_force_factor: 0.88,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: {
        A: 290,
        B: 520,
        n: 0.32,
        C: 0.020,
        m: 0.90,
        T_melt: 1185,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 130, opt: 180, max: 250 }, feed: { min: 0.15, opt: 0.32, max: 0.55 }, doc: { min: 1.0, opt: 3.5, max: 9.0 } },
          carbide_uncoated: { speed: { min: 100, opt: 145, max: 195 }, feed: { min: 0.15, opt: 0.32, max: 0.55 }, doc: { min: 1.0, opt: 3.5, max: 9.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 105, opt: 155, max: 215 }, feed_per_tooth: { min: 0.12, opt: 0.20, max: 0.35 }, doc: { min: 1.0, opt: 3.5, max: 7.5 }, woc_factor: 0.60 }
        },
        drilling: {
          carbide: { speed: { min: 70, opt: 108, max: 150 }, feed_per_rev: { min: 0.15, opt: 0.28, max: 0.45 } },
          hss_cobalt: { speed: { min: 22, opt: 35, max: 48 }, feed_per_rev: { min: 0.15, opt: 0.28, max: 0.45 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.05,
        surface_roughness_typical: { Ra: 1.2, Rz: 6 }
      },

      coolant: {
        requirement: "optional",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "none"
      },

      applications: ["pipe_fittings", "electrical_fittings", "hardware", "brackets", "hinges"],
      
      microstructure: {
        graphite_form: "Temper carbon (compact clusters)",
        matrix: "ferritic (100%)",
        graphite_size: "Type VI",
        nodularity: null,
        carbides: "none"
      },

      heat_treatment: {
        process: "Malleabilizing (Blackheart)",
        anneal_temp: 940,
        anneal_time_hours: 60,
        cooling: "slow_furnace_cool",
        purpose: "Transform carbides to temper carbon in ferritic matrix"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.04
      },

      notes: "Ferritic malleable (blackheart). Best machinability of cast irons. Excellent for thin-wall castings."
    },

    "K-CI-037": {
      id: "K-CI-037",
      name: "Malleable Iron M4504 Ferritic",
      designation: {
        astm: "A47 Grade 35018",
        sae: "J158 M4504",
        din: "GTS-45",
        en: "EN-GJMB-450-6",
        jis: "FCMB45"
      },
      iso_group: "K",
      material_class: "Malleable Cast Iron - Ferritic",
      condition: "Malleabilized (Higher Strength)",

      composition: {
        carbon: { min: 2.30, max: 2.80, typical: 2.55 },
        silicon: { min: 1.10, max: 1.80, typical: 1.50 },
        manganese: { min: 0.25, max: 0.60, typical: 0.45 },
        phosphorus: { min: 0, max: 0.12, typical: 0.06 },
        sulfur: { min: 0.05, max: 0.15, typical: 0.09 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0, max: 0.15, typical: 0.08 },
        molybdenum: { min: 0, max: 0.05, typical: 0.025 },
        copper: { min: 0.10, max: 0.30, typical: 0.20 },
        titanium: { min: 0, max: 0.03, typical: 0.015 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 93.5, max: 96.0, typical: 94.8 }
      },

      physical: {
        density: 7300,
        melting_point: { solidus: 1145, liquidus: 1235 },
        specific_heat: 460,
        thermal_conductivity: 48,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 32e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.27,
        elastic_modulus: 180000,
        shear_modulus: 71000
      },

      mechanical: {
        hardness: {
          brinell: 150,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 157
        },
        tensile_strength: { min: 448, typical: 490, max: 540 },
        yield_strength: { min: 310, typical: 345, max: 380 },
        compressive_strength: { min: 1345, typical: 1470, max: 1620 },
        elongation: { min: 4, typical: 6, max: 10 },
        reduction_of_area: { min: 4, typical: 6, max: 10 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 195,
        fracture_toughness: 32
      },

      kienzle: {
        kc1_1: 1100,
        mc: 0.26,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.8
      },

      taylor: {
        C: 210,
        n: 0.26,
        reference_speed: 115,
        reference_life: 15,
        speed_range: { min: 45, max: 185 }
      },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "continuous_short",
        surface_finish_achievable: 1.4,
        cutting_force_factor: 0.95,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: {
        A: 380,
        B: 600,
        n: 0.28,
        C: 0.018,
        m: 0.88,
        T_melt: 1190,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 115, opt: 160, max: 220 }, feed: { min: 0.12, opt: 0.28, max: 0.48 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } },
          carbide_uncoated: { speed: { min: 90, opt: 125, max: 172 }, feed: { min: 0.12, opt: 0.28, max: 0.48 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 92, opt: 135, max: 190 }, feed_per_tooth: { min: 0.10, opt: 0.18, max: 0.30 }, doc: { min: 1.0, opt: 3.0, max: 6.5 }, woc_factor: 0.58 }
        },
        drilling: {
          carbide: { speed: { min: 60, opt: 95, max: 132 }, feed_per_rev: { min: 0.12, opt: 0.25, max: 0.40 } },
          hss_cobalt: { speed: { min: 18, opt: 30, max: 42 }, feed_per_rev: { min: 0.12, opt: 0.25, max: 0.40 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 1.4, Rz: 7 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "none"
      },

      applications: ["automotive_parts", "farm_equipment", "transmission_parts", "levers"],
      
      microstructure: {
        graphite_form: "Temper carbon (compact clusters)",
        matrix: "ferritic (>95%)",
        graphite_size: "Type VI",
        nodularity: null,
        carbides: "trace"
      },

      heat_treatment: {
        process: "Malleabilizing (Modified)",
        anneal_temp: 960,
        anneal_time_hours: 48,
        cooling: "controlled_cool",
        purpose: "Higher strength ferritic malleable"
      },

      damping_capacity: {
        relative_to_steel: 4.5,
        log_decrement: 0.035
      },

      notes: "Higher strength ferritic malleable. Good combination of machinability and strength."
    },

    "K-CI-038": {
      id: "K-CI-038",
      name: "Malleable Iron M5003 Pearlitic",
      designation: {
        astm: "A220 Grade 50005",
        sae: "J158 M5003",
        din: "GTS-55",
        en: "EN-GJMW-550-4",
        jis: "FCMP55"
      },
      iso_group: "K",
      material_class: "Malleable Cast Iron - Pearlitic",
      condition: "Malleabilized Pearlitic",

      composition: {
        carbon: { min: 2.40, max: 2.90, typical: 2.65 },
        silicon: { min: 1.20, max: 1.90, typical: 1.55 },
        manganese: { min: 0.30, max: 0.70, typical: 0.50 },
        phosphorus: { min: 0, max: 0.10, typical: 0.05 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0, max: 0.12, typical: 0.06 },
        nickel: { min: 0, max: 0.20, typical: 0.10 },
        molybdenum: { min: 0, max: 0.08, typical: 0.04 },
        copper: { min: 0.20, max: 0.50, typical: 0.35 },
        titanium: { min: 0, max: 0.03, typical: 0.015 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 93.0, max: 95.5, typical: 94.2 }
      },

      physical: {
        density: 7350,
        melting_point: { solidus: 1150, liquidus: 1240 },
        specific_heat: 460,
        thermal_conductivity: 42,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 35e-8,
        magnetic_permeability: 250,
        poissons_ratio: 0.27,
        elastic_modulus: 185000,
        shear_modulus: 73000
      },

      mechanical: {
        hardness: {
          brinell: 187,
          rockwell_b: 89,
          rockwell_c: null,
          vickers: 196
        },
        tensile_strength: { min: 552, typical: 610, max: 675 },
        yield_strength: { min: 379, typical: 420, max: 465 },
        compressive_strength: { min: 1655, typical: 1830, max: 2025 },
        elongation: { min: 3, typical: 5, max: 8 },
        reduction_of_area: { min: 3, typical: 5, max: 8 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 245,
        fracture_toughness: 28
      },

      kienzle: {
        kc1_1: 1280,
        mc: 0.24,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.0
      },

      taylor: {
        C: 175,
        n: 0.24,
        reference_speed: 98,
        reference_life: 15,
        speed_range: { min: 38, max: 158 }
      },

      machinability: {
        aisi_rating: 75,
        relative_to_1212: 0.75,
        chip_form: "short_curled",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.05,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 480,
        B: 720,
        n: 0.24,
        C: 0.015,
        m: 0.85,
        T_melt: 1195,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 98, opt: 138, max: 190 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.5, max: 7.0 } },
          carbide_uncoated: { speed: { min: 76, opt: 108, max: 148 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.5, max: 7.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 78, opt: 115, max: 165 }, feed_per_tooth: { min: 0.08, opt: 0.15, max: 0.26 }, doc: { min: 0.8, opt: 2.5, max: 5.8 }, woc_factor: 0.54 }
        },
        drilling: {
          carbide: { speed: { min: 52, opt: 82, max: 115 }, feed_per_rev: { min: 0.10, opt: 0.20, max: 0.35 } },
          hss_cobalt: { speed: { min: 15, opt: 25, max: 36 }, feed_per_rev: { min: 0.10, opt: 0.20, max: 0.35 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.08,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["gears", "connecting_rods", "crankshafts", "hubs", "brake_drums"],
      
      microstructure: {
        graphite_form: "Temper carbon (compact clusters)",
        matrix: "pearlitic (100%)",
        graphite_size: "Type VI",
        nodularity: null,
        carbides: "none"
      },

      heat_treatment: {
        process: "Malleabilizing + Air Cool",
        anneal_temp: 950,
        anneal_time_hours: 40,
        cooling: "air_cool",
        purpose: "Pearlitic matrix for higher strength"
      },

      damping_capacity: {
        relative_to_steel: 3.5,
        log_decrement: 0.028
      },

      notes: "Pearlitic malleable. Higher strength than ferritic but lower ductility."
    },

    "K-CI-039": {
      id: "K-CI-039",
      name: "Malleable Iron M7002 Pearlitic (High Strength)",
      designation: {
        astm: "A220 Grade 70003",
        sae: "J158 M7002",
        din: "GTS-70",
        en: "EN-GJMW-700-2",
        jis: "FCMP70"
      },
      iso_group: "K",
      material_class: "Malleable Cast Iron - Pearlitic",
      condition: "Malleabilized Pearlitic + Temper",

      composition: {
        carbon: { min: 2.50, max: 3.00, typical: 2.75 },
        silicon: { min: 1.30, max: 2.00, typical: 1.65 },
        manganese: { min: 0.35, max: 0.80, typical: 0.58 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0, max: 0.15, typical: 0.08 },
        nickel: { min: 0, max: 0.25, typical: 0.12 },
        molybdenum: { min: 0, max: 0.12, typical: 0.06 },
        copper: { min: 0.30, max: 0.60, typical: 0.45 },
        titanium: { min: 0, max: 0.03, typical: 0.015 },
        vanadium: { min: 0, max: 0.03, typical: 0.015 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 92.5, max: 95.0, typical: 93.8 }
      },

      physical: {
        density: 7400,
        melting_point: { solidus: 1155, liquidus: 1245 },
        specific_heat: 460,
        thermal_conductivity: 38,
        thermal_expansion: 11.2e-6,
        electrical_resistivity: 38e-8,
        magnetic_permeability: 280,
        poissons_ratio: 0.27,
        elastic_modulus: 190000,
        shear_modulus: 75000
      },

      mechanical: {
        hardness: {
          brinell: 229,
          rockwell_c: 20,
          rockwell_b: null,
          vickers: 240
        },
        tensile_strength: { min: 690, typical: 760, max: 830 },
        yield_strength: { min: 483, typical: 540, max: 600 },
        compressive_strength: { min: 2070, typical: 2280, max: 2490 },
        elongation: { min: 2, typical: 3, max: 5 },
        reduction_of_area: { min: 2, typical: 3, max: 5 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 305,
        fracture_toughness: 24
      },

      kienzle: {
        kc1_1: 1480,
        mc: 0.23,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.2
      },

      taylor: {
        C: 145,
        n: 0.23,
        reference_speed: 82,
        reference_life: 15,
        speed_range: { min: 30, max: 132 }
      },

      machinability: {
        aisi_rating: 58,
        relative_to_1212: 0.58,
        chip_form: "segmented_short",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.15,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_abrasive"
      },

      johnson_cook: {
        A: 600,
        B: 850,
        n: 0.21,
        C: 0.013,
        m: 0.82,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 82, opt: 115, max: 160 }, feed: { min: 0.08, opt: 0.22, max: 0.38 }, doc: { min: 0.6, opt: 2.0, max: 5.5 } },
          carbide_uncoated: { speed: { min: 62, opt: 90, max: 125 }, feed: { min: 0.08, opt: 0.22, max: 0.38 }, doc: { min: 0.6, opt: 2.0, max: 5.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 65, opt: 98, max: 140 }, feed_per_tooth: { min: 0.06, opt: 0.12, max: 0.22 }, doc: { min: 0.6, opt: 2.0, max: 4.8 }, woc_factor: 0.50 }
        },
        drilling: {
          carbide: { speed: { min: 42, opt: 68, max: 96 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.30 } },
          hss_cobalt: { speed: { min: 12, opt: 21, max: 30 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.30 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.10,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "slight"
      },

      applications: ["heavy_duty_gears", "rocker_arms", "differential_cases", "universal_joint_yokes"],
      
      microstructure: {
        graphite_form: "Temper carbon (compact clusters)",
        matrix: "fine pearlitic + tempered martensite",
        graphite_size: "Type VI",
        nodularity: null,
        carbides: "trace"
      },

      heat_treatment: {
        process: "Malleabilizing + Q&T",
        anneal_temp: 950,
        anneal_time_hours: 40,
        quench: "oil",
        temper_temp: 650,
        purpose: "Maximum strength malleable iron"
      },

      damping_capacity: {
        relative_to_steel: 2.5,
        log_decrement: 0.022
      },

      notes: "High-strength pearlitic malleable. Oil quenched and tempered for maximum strength."
    },

    "K-CI-040": {
      id: "K-CI-040",
      name: "Whiteheart Malleable Iron",
      designation: {
        astm: "A602",
        sae: "",
        din: "GTW-40",
        en: "EN-GJMW-400-5",
        jis: "FCMW40"
      },
      iso_group: "K",
      material_class: "Malleable Cast Iron - Whiteheart",
      condition: "Decarburized Surface",

      composition: {
        carbon: { min: 2.80, max: 3.30, typical: 3.05 },
        silicon: { min: 0.50, max: 1.00, typical: 0.75 },
        manganese: { min: 0.30, max: 0.60, typical: 0.45 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0.10, max: 0.25, typical: 0.18 },
        chromium: { min: 0, max: 0.05, typical: 0.025 },
        nickel: { min: 0, max: 0.08, typical: 0.04 },
        molybdenum: { min: 0, max: 0.02, typical: 0.01 },
        copper: { min: 0, max: 0.15, typical: 0.08 },
        titanium: { min: 0, max: 0.02, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 94.5, max: 96.5, typical: 95.5 }
      },

      physical: {
        density: 7400,
        melting_point: { solidus: 1135, liquidus: 1220 },
        specific_heat: 460,
        thermal_conductivity: 35,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 40e-8,
        magnetic_permeability: 220,
        poissons_ratio: 0.27,
        elastic_modulus: 180000,
        shear_modulus: 71000
      },

      mechanical: {
        hardness: {
          brinell: 150,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 157,
          surface_note: "Surface ferritic ~130 HB, core pearlitic ~180 HB"
        },
        tensile_strength: { min: 400, typical: 450, max: 500 },
        yield_strength: { min: 260, typical: 300, max: 340 },
        compressive_strength: { min: 1200, typical: 1350, max: 1500 },
        elongation: { min: 5, typical: 8, max: 12 },
        reduction_of_area: { min: 5, typical: 8, max: 12 },
        impact_energy: { joules: 10, temperature: 20 },
        fatigue_strength: 180,
        fracture_toughness: 35
      },

      kienzle: {
        kc1_1: 1100,
        mc: 0.26,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.8
      },

      taylor: {
        C: 200,
        n: 0.26,
        reference_speed: 110,
        reference_life: 15,
        speed_range: { min: 42, max: 178 }
      },

      machinability: {
        aisi_rating: 90,
        relative_to_1212: 0.90,
        chip_form: "continuous_curled",
        surface_finish_achievable: 1.4,
        cutting_force_factor: 0.95,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: {
        A: 350,
        B: 580,
        n: 0.30,
        C: 0.018,
        m: 0.88,
        T_melt: 1178,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 110, opt: 155, max: 215 }, feed: { min: 0.12, opt: 0.28, max: 0.48 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } },
          carbide_uncoated: { speed: { min: 85, opt: 120, max: 168 }, feed: { min: 0.12, opt: 0.28, max: 0.48 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 88, opt: 130, max: 185 }, feed_per_tooth: { min: 0.10, opt: 0.18, max: 0.28 }, doc: { min: 1.0, opt: 3.0, max: 6.5 }, woc_factor: 0.56 }
        },
        drilling: {
          carbide: { speed: { min: 58, opt: 90, max: 128 }, feed_per_rev: { min: 0.12, opt: 0.24, max: 0.40 } },
          hss_cobalt: { speed: { min: 18, opt: 28, max: 40 }, feed_per_rev: { min: 0.12, opt: 0.24, max: 0.40 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "neutral",
        white_layer_risk: "none",
        work_hardening_depth: 0.05,
        surface_roughness_typical: { Ra: 1.4, Rz: 7 }
      },

      coolant: {
        requirement: "optional",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "none"
      },

      applications: ["thin_wall_castings", "pipe_fittings", "chains", "hooks", "agricultural_parts"],
      
      microstructure: {
        graphite_form: "Temper carbon (surface decarburized)",
        matrix: "ferritic (surface) / pearlitic (core)",
        graphite_size: "Type VI",
        nodularity: null,
        carbides: "none",
        surface_condition: "Decarburized ferritic skin"
      },

      heat_treatment: {
        process: "Whiteheart Malleabilizing",
        anneal_temp: 1000,
        anneal_time_hours: 80,
        atmosphere: "oxidizing",
        cooling: "slow_furnace_cool",
        purpose: "Decarburize surface for ductile skin, retain pearlite core"
      },

      damping_capacity: {
        relative_to_steel: 4,
        log_decrement: 0.032
      },

      notes: "European whiteheart process. Decarburized ductile surface with stronger pearlitic core."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPACTED GRAPHITE IRON (CGI/VERMICULAR) (K-CI-041 to K-CI-048)
    // ═══════════════════════════════════════════════════════════════════════════

    "K-CI-041": {
      id: "K-CI-041",
      name: "CGI Grade 300 (Vermicular) Ferritic",
      designation: {
        astm: "A842 Grade 300",
        sae: "J1887 CGI-300",
        din: "GGV-30",
        en: "EN-GJV-300",
        jis: "FCV300"
      },
      iso_group: "K",
      material_class: "Compacted Graphite Iron",
      condition: "As-Cast Ferritic",

      composition: {
        carbon: { min: 3.30, max: 3.70, typical: 3.50 },
        silicon: { min: 2.00, max: 2.60, typical: 2.30 },
        manganese: { min: 0.15, max: 0.40, typical: 0.28 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.05, typical: 0.025 },
        nickel: { min: 0, max: 0.10, typical: 0.05 },
        molybdenum: { min: 0, max: 0.03, typical: 0.015 },
        copper: { min: 0, max: 0.15, typical: 0.08 },
        magnesium: { min: 0.010, max: 0.020, typical: 0.015 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0.015, max: 0.045, typical: 0.030 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 92.5, max: 94.5, typical: 93.5 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 40,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 52e-8,
        magnetic_permeability: 170,
        poissons_ratio: 0.27,
        elastic_modulus: 145000,
        shear_modulus: 57000
      },

      mechanical: {
        hardness: {
          brinell: 150,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 157
        },
        tensile_strength: { min: 300, typical: 340, max: 380 },
        yield_strength: { min: 220, typical: 255, max: 290 },
        compressive_strength: { min: 900, typical: 1020, max: 1140 },
        elongation: { min: 1.5, typical: 3.0, max: 5.0 },
        reduction_of_area: { min: 1, typical: 2, max: 4 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 135,
        fracture_toughness: 28
      },

      kienzle: {
        kc1_1: 1080,
        mc: 0.26,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.9
      },

      taylor: {
        C: 180,
        n: 0.26,
        reference_speed: 100,
        reference_life: 15,
        speed_range: { min: 38, max: 162 }
      },

      machinability: {
        aisi_rating: 78,
        relative_to_1212: 0.78,
        chip_form: "short_curled",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.98,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear",
        notes: "Intermediate between gray and ductile iron machinability"
      },

      johnson_cook: {
        A: 300,
        B: 480,
        n: 0.26,
        C: 0.018,
        m: 0.88,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 100, opt: 140, max: 195 }, feed: { min: 0.12, opt: 0.28, max: 0.45 }, doc: { min: 1.0, opt: 3.0, max: 7.5 } },
          carbide_uncoated: { speed: { min: 78, opt: 110, max: 152 }, feed: { min: 0.12, opt: 0.28, max: 0.45 }, doc: { min: 1.0, opt: 3.0, max: 7.5 } },
          ceramic: { speed: { min: 200, opt: 310, max: 420 }, feed: { min: 0.08, opt: 0.16, max: 0.28 }, doc: { min: 0.5, opt: 1.8, max: 3.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 80, opt: 118, max: 170 }, feed_per_tooth: { min: 0.10, opt: 0.16, max: 0.28 }, doc: { min: 1.0, opt: 3.0, max: 6.0 }, woc_factor: 0.55 }
        },
        drilling: {
          carbide: { speed: { min: 52, opt: 82, max: 118 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.38 } },
          hss_cobalt: { speed: { min: 16, opt: 26, max: 38 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.38 } }
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

      applications: ["diesel_cylinder_blocks", "cylinder_heads", "exhaust_manifolds", "bedplates"],
      
      microstructure: {
        graphite_form: "Compacted/Vermicular (>70% Type III/IV)",
        matrix: "ferritic (>80%)",
        graphite_size: "5-6",
        nodularity: { min: 0, max: 20 },
        carbides: "none"
      },

      damping_capacity: {
        relative_to_steel: 7,
        log_decrement: 0.055,
        notes: "Better damping than ductile, less than gray iron"
      },

      notes: "CGI/Vermicular iron. Combines gray iron thermal properties with ductile iron strength."
    },

    "K-CI-042": {
      id: "K-CI-042",
      name: "CGI Grade 350 Ferritic-Pearlitic",
      designation: {
        astm: "A842 Grade 350",
        sae: "J1887 CGI-350",
        din: "GGV-35",
        en: "EN-GJV-350",
        jis: "FCV350"
      },
      iso_group: "K",
      material_class: "Compacted Graphite Iron",
      condition: "As-Cast Ferritic-Pearlitic",

      composition: {
        carbon: { min: 3.20, max: 3.60, typical: 3.40 },
        silicon: { min: 1.90, max: 2.50, typical: 2.20 },
        manganese: { min: 0.20, max: 0.50, typical: 0.35 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.08, typical: 0.04 },
        nickel: { min: 0, max: 0.15, typical: 0.08 },
        molybdenum: { min: 0, max: 0.05, typical: 0.025 },
        copper: { min: 0.20, max: 0.45, typical: 0.32 },
        magnesium: { min: 0.010, max: 0.020, typical: 0.015 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0.015, max: 0.045, typical: 0.030 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 92.0, max: 94.0, typical: 93.0 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 38,
        thermal_expansion: 11.2e-6,
        electrical_resistivity: 50e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.27,
        elastic_modulus: 150000,
        shear_modulus: 59000
      },

      mechanical: {
        hardness: {
          brinell: 175,
          rockwell_b: 86,
          rockwell_c: null,
          vickers: 184
        },
        tensile_strength: { min: 350, typical: 400, max: 450 },
        yield_strength: { min: 260, typical: 300, max: 345 },
        compressive_strength: { min: 1050, typical: 1200, max: 1350 },
        elongation: { min: 1.0, typical: 2.0, max: 3.5 },
        reduction_of_area: { min: 1, typical: 2, max: 3 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 160,
        fracture_toughness: 25
      },

      kienzle: {
        kc1_1: 1200,
        mc: 0.25,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.0
      },

      taylor: {
        C: 160,
        n: 0.25,
        reference_speed: 90,
        reference_life: 15,
        speed_range: { min: 35, max: 145 }
      },

      machinability: {
        aisi_rating: 68,
        relative_to_1212: 0.68,
        chip_form: "short_segmented",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.05,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_abrasive"
      },

      johnson_cook: {
        A: 360,
        B: 550,
        n: 0.24,
        C: 0.016,
        m: 0.86,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 90, opt: 128, max: 175 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.8, max: 7.0 } },
          carbide_uncoated: { speed: { min: 70, opt: 100, max: 138 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.8, max: 7.0 } },
          ceramic: { speed: { min: 180, opt: 280, max: 380 }, feed: { min: 0.08, opt: 0.15, max: 0.26 }, doc: { min: 0.4, opt: 1.6, max: 3.2 } }
        },
        milling: {
          carbide_coated: { speed: { min: 72, opt: 108, max: 155 }, feed_per_tooth: { min: 0.08, opt: 0.14, max: 0.25 }, doc: { min: 0.8, opt: 2.8, max: 5.5 }, woc_factor: 0.52 }
        },
        drilling: {
          carbide: { speed: { min: 48, opt: 75, max: 105 }, feed_per_rev: { min: 0.08, opt: 0.20, max: 0.35 } },
          hss_cobalt: { speed: { min: 14, opt: 23, max: 34 }, feed_per_rev: { min: 0.08, opt: 0.20, max: 0.35 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 1.6, Rz: 9 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["diesel_engine_blocks", "cylinder_heads", "turbocharger_housings", "gear_housings"],
      
      microstructure: {
        graphite_form: "Compacted/Vermicular (>80% Type III/IV)",
        matrix: "ferritic-pearlitic (50/50)",
        graphite_size: "5-6",
        nodularity: { min: 5, max: 20 },
        carbides: "none"
      },

      damping_capacity: {
        relative_to_steel: 6,
        log_decrement: 0.048
      },

      notes: "Standard CGI grade for diesel engines. Better thermal fatigue than gray iron."
    },

    "K-CI-043": {
      id: "K-CI-043",
      name: "CGI Grade 400 Pearlitic",
      designation: {
        astm: "A842 Grade 400",
        sae: "J1887 CGI-400",
        din: "GGV-40",
        en: "EN-GJV-400",
        jis: "FCV400"
      },
      iso_group: "K",
      material_class: "Compacted Graphite Iron",
      condition: "As-Cast Pearlitic",

      composition: {
        carbon: { min: 3.10, max: 3.50, typical: 3.30 },
        silicon: { min: 1.80, max: 2.40, typical: 2.10 },
        manganese: { min: 0.25, max: 0.60, typical: 0.42 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0, max: 0.20, typical: 0.10 },
        molybdenum: { min: 0, max: 0.08, typical: 0.04 },
        copper: { min: 0.40, max: 0.70, typical: 0.55 },
        magnesium: { min: 0.010, max: 0.020, typical: 0.015 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0.015, max: 0.045, typical: 0.030 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 91.5, max: 93.5, typical: 92.5 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1170 },
        specific_heat: 460,
        thermal_conductivity: 35,
        thermal_expansion: 11.0e-6,
        electrical_resistivity: 48e-8,
        magnetic_permeability: 230,
        poissons_ratio: 0.27,
        elastic_modulus: 155000,
        shear_modulus: 61000
      },

      mechanical: {
        hardness: {
          brinell: 210,
          rockwell_b: 95,
          rockwell_c: null,
          vickers: 220
        },
        tensile_strength: { min: 400, typical: 460, max: 520 },
        yield_strength: { min: 310, typical: 360, max: 410 },
        compressive_strength: { min: 1200, typical: 1380, max: 1560 },
        elongation: { min: 0.5, typical: 1.5, max: 2.5 },
        reduction_of_area: { min: 0.5, typical: 1, max: 2 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 185,
        fracture_toughness: 22
      },

      kienzle: {
        kc1_1: 1350,
        mc: 0.24,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.1
      },

      taylor: {
        C: 140,
        n: 0.24,
        reference_speed: 78,
        reference_life: 15,
        speed_range: { min: 30, max: 128 }
      },

      machinability: {
        aisi_rating: 58,
        relative_to_1212: 0.58,
        chip_form: "segmented_short",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.12,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_abrasive"
      },

      johnson_cook: {
        A: 430,
        B: 640,
        n: 0.22,
        C: 0.015,
        m: 0.84,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 78, opt: 112, max: 155 }, feed: { min: 0.08, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.5, max: 6.0 } },
          carbide_uncoated: { speed: { min: 60, opt: 88, max: 122 }, feed: { min: 0.08, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.5, max: 6.0 } },
          ceramic: { speed: { min: 155, opt: 245, max: 340 }, feed: { min: 0.06, opt: 0.14, max: 0.24 }, doc: { min: 0.4, opt: 1.4, max: 2.8 } }
        },
        milling: {
          carbide_coated: { speed: { min: 62, opt: 95, max: 138 }, feed_per_tooth: { min: 0.06, opt: 0.12, max: 0.22 }, doc: { min: 0.8, opt: 2.5, max: 5.0 }, woc_factor: 0.50 }
        },
        drilling: {
          carbide: { speed: { min: 42, opt: 65, max: 95 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } },
          hss_cobalt: { speed: { min: 12, opt: 20, max: 30 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.08,
        surface_roughness_typical: { Ra: 1.6, Rz: 10 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "slight"
      },

      applications: ["high_performance_diesel_blocks", "industrial_engines", "exhaust_manifolds"],
      
      microstructure: {
        graphite_form: "Compacted/Vermicular (>85% Type III/IV)",
        matrix: "pearlitic (>80%)",
        graphite_size: "5-6",
        nodularity: { min: 5, max: 20 },
        carbides: "trace"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.04
      },

      notes: "High-strength CGI for demanding diesel applications. Lower machinability than lower grades."
    },

    "K-CI-044": {
      id: "K-CI-044",
      name: "CGI Grade 450 High Strength",
      designation: {
        astm: "A842 Grade 450",
        sae: "J1887 CGI-450",
        din: "GGV-45",
        en: "EN-GJV-450",
        jis: "FCV450"
      },
      iso_group: "K",
      material_class: "Compacted Graphite Iron",
      condition: "As-Cast Pearlitic",

      composition: {
        carbon: { min: 3.00, max: 3.40, typical: 3.20 },
        silicon: { min: 1.70, max: 2.30, typical: 2.00 },
        manganese: { min: 0.30, max: 0.70, typical: 0.50 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0.05, max: 0.15, typical: 0.10 },
        nickel: { min: 0.10, max: 0.30, typical: 0.20 },
        molybdenum: { min: 0.05, max: 0.15, typical: 0.10 },
        copper: { min: 0.60, max: 0.90, typical: 0.75 },
        magnesium: { min: 0.010, max: 0.020, typical: 0.015 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0.015, max: 0.045, typical: 0.030 },
        vanadium: { min: 0, max: 0.03, typical: 0.015 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 90.5, max: 93.0, typical: 91.8 }
      },

      physical: {
        density: 7150,
        melting_point: { solidus: 1130, liquidus: 1165 },
        specific_heat: 460,
        thermal_conductivity: 33,
        thermal_expansion: 10.8e-6,
        electrical_resistivity: 46e-8,
        magnetic_permeability: 260,
        poissons_ratio: 0.27,
        elastic_modulus: 160000,
        shear_modulus: 63000
      },

      mechanical: {
        hardness: {
          brinell: 235,
          rockwell_c: 21,
          rockwell_b: null,
          vickers: 247
        },
        tensile_strength: { min: 450, typical: 520, max: 590 },
        yield_strength: { min: 360, typical: 420, max: 480 },
        compressive_strength: { min: 1350, typical: 1560, max: 1770 },
        elongation: { min: 0.5, typical: 1.0, max: 2.0 },
        reduction_of_area: { min: 0.5, typical: 1, max: 2 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 210,
        fracture_toughness: 20
      },

      kienzle: {
        kc1_1: 1500,
        mc: 0.23,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.12,
        chip_compression: 3.3
      },

      taylor: {
        C: 120,
        n: 0.23,
        reference_speed: 68,
        reference_life: 15,
        speed_range: { min: 25, max: 110 }
      },

      machinability: {
        aisi_rating: 48,
        relative_to_1212: 0.48,
        chip_form: "segmented",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.20,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 500,
        B: 720,
        n: 0.20,
        C: 0.013,
        m: 0.82,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 68, opt: 98, max: 135 }, feed: { min: 0.08, opt: 0.20, max: 0.35 }, doc: { min: 0.6, opt: 2.0, max: 5.0 } },
          carbide_uncoated: { speed: { min: 52, opt: 76, max: 105 }, feed: { min: 0.08, opt: 0.20, max: 0.35 }, doc: { min: 0.6, opt: 2.0, max: 5.0 } },
          ceramic: { speed: { min: 135, opt: 215, max: 300 }, feed: { min: 0.05, opt: 0.12, max: 0.22 }, doc: { min: 0.3, opt: 1.2, max: 2.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 55, opt: 82, max: 120 }, feed_per_tooth: { min: 0.05, opt: 0.10, max: 0.18 }, doc: { min: 0.6, opt: 2.0, max: 4.5 }, woc_factor: 0.48 }
        },
        drilling: {
          carbide: { speed: { min: 36, opt: 58, max: 82 }, feed_per_rev: { min: 0.06, opt: 0.15, max: 0.28 } },
          hss_cobalt: { speed: { min: 10, opt: 18, max: 26 }, feed_per_rev: { min: 0.06, opt: 0.15, max: 0.28 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "low",
        work_hardening_depth: 0.10,
        surface_roughness_typical: { Ra: 1.8, Rz: 11 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil",
        mql_suitable: false,
        cryogenic_benefit: "moderate"
      },

      applications: ["large_diesel_blocks", "marine_engines", "locomotive_engines", "heavy_machinery"],
      
      microstructure: {
        graphite_form: "Compacted/Vermicular (>90% Type III/IV)",
        matrix: "fine pearlitic (>95%)",
        graphite_size: "6-7",
        nodularity: { min: 5, max: 15 },
        carbides: "5%"
      },

      damping_capacity: {
        relative_to_steel: 4,
        log_decrement: 0.032
      },

      notes: "High-strength alloyed CGI. Lower machinability due to carbides. Rigid setup required."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // WHITE AND SPECIAL CAST IRONS (K-CI-045 to K-CI-060)
    // ═══════════════════════════════════════════════════════════════════════════

    "K-CI-045": {
      id: "K-CI-045",
      name: "Ni-Hard Type 1 (Low Chrome White Iron)",
      designation: {
        astm: "A532 Class I Type A",
        sae: "",
        din: "GX130Ni30",
        en: "EN-GJN-HV520",
        jis: ""
      },
      iso_group: "H",
      material_class: "White Cast Iron - Ni-Hard",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.80, max: 3.60, typical: 3.20 },
        silicon: { min: 0.40, max: 0.80, typical: 0.60 },
        manganese: { min: 0.40, max: 0.80, typical: 0.60 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0, max: 0.06, typical: 0.03 },
        chromium: { min: 1.20, max: 2.00, typical: 1.60 },
        nickel: { min: 3.00, max: 5.00, typical: 4.00 },
        molybdenum: { min: 0, max: 0.50, typical: 0.25 },
        copper: { min: 0, max: 0.30, typical: 0.15 },
        titanium: { min: 0, max: 0.10, typical: 0.05 },
        vanadium: { min: 0, max: 0.05, typical: 0.025 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.02, typical: 0.01 },
        iron: { min: 85.0, max: 90.0, typical: 87.5 }
      },

      physical: {
        density: 7650,
        melting_point: { solidus: 1180, liquidus: 1290 },
        specific_heat: 450,
        thermal_conductivity: 22,
        thermal_expansion: 11.0e-6,
        electrical_resistivity: 80e-8,
        magnetic_permeability: 1.1,
        poissons_ratio: 0.27,
        elastic_modulus: 180000,
        shear_modulus: 71000
      },

      mechanical: {
        hardness: {
          brinell: 520,
          rockwell_c: 52,
          rockwell_b: null,
          vickers: 546
        },
        tensile_strength: { min: 380, typical: 450, max: 520 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1520, typical: 1800, max: 2080 },
        elongation: { min: 0, typical: 0, max: 1 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 180,
        fracture_toughness: 14
      },

      kienzle: {
        kc1_1: 1850,
        mc: 0.19,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.15,
        chip_compression: 3.6
      },

      taylor: {
        C: 50,
        n: 0.17,
        reference_speed: 30,
        reference_life: 15,
        speed_range: { min: 10, max: 50 }
      },

      machinability: {
        aisi_rating: 18,
        relative_to_1212: 0.18,
        chip_form: "powder",
        surface_finish_achievable: 1.2,
        cutting_force_factor: 1.65,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "GRINDING ONLY. No practical cutting."
      },

      johnson_cook: {
        A: 850,
        B: 1000,
        n: 0.14,
        C: 0.008,
        m: 0.68,
        T_melt: 1235,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "CBN or Diamond",
          speed: 22,
          feed_rate: 0.006,
          notes: "ONLY practical machining method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "high",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.8, Rz: 5 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["ball_mill_liners", "slurry_pumps", "crusher_hammers", "grinding_balls"],
      
      microstructure: {
        graphite_form: "none - white iron",
        matrix: "martensite + austenite + M3C carbides",
        graphite_size: null,
        nodularity: null,
        carbides: "25-35% M3C (cementite)"
      },

      wear_resistance: {
        abrasion_factor: 10,
        relative_to_mild_steel: 10,
        notes: "Excellent abrasion resistance"
      },

      damping_capacity: {
        relative_to_steel: 0.5,
        log_decrement: 0.005
      },

      notes: "Ni-Hard Type 1. Classic abrasion-resistant white iron. No graphite. GRINDING ONLY."
    },

    "K-CI-046": {
      id: "K-CI-046",
      name: "Ni-Hard Type 4 (High Chrome)",
      designation: {
        astm: "A532 Class I Type D",
        sae: "",
        din: "GX260NiCr42",
        en: "EN-GJN-HV600",
        jis: ""
      },
      iso_group: "H",
      material_class: "White Cast Iron - Ni-Hard",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.50, max: 3.20, typical: 2.85 },
        silicon: { min: 0.40, max: 1.00, typical: 0.70 },
        manganese: { min: 0.40, max: 0.80, typical: 0.60 },
        phosphorus: { min: 0, max: 0.06, typical: 0.03 },
        sulfur: { min: 0, max: 0.05, typical: 0.025 },
        chromium: { min: 7.00, max: 11.00, typical: 9.00 },
        nickel: { min: 4.50, max: 7.00, typical: 5.75 },
        molybdenum: { min: 0, max: 1.00, typical: 0.50 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        titanium: { min: 0, max: 0.10, typical: 0.05 },
        vanadium: { min: 0, max: 0.10, typical: 0.05 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.02, typical: 0.01 },
        iron: { min: 77.0, max: 84.0, typical: 80.5 }
      },

      physical: {
        density: 7700,
        melting_point: { solidus: 1200, liquidus: 1320 },
        specific_heat: 450,
        thermal_conductivity: 20,
        thermal_expansion: 10.5e-6,
        electrical_resistivity: 90e-8,
        magnetic_permeability: 1.05,
        poissons_ratio: 0.27,
        elastic_modulus: 185000,
        shear_modulus: 73000
      },

      mechanical: {
        hardness: {
          brinell: 600,
          rockwell_c: 58,
          rockwell_b: null,
          vickers: 630
        },
        tensile_strength: { min: 350, typical: 420, max: 490 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1400, typical: 1680, max: 1960 },
        elongation: { min: 0, typical: 0, max: 0.5 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 165,
        fracture_toughness: 12
      },

      kienzle: {
        kc1_1: 2050,
        mc: 0.18,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.18,
        chip_compression: 3.8
      },

      taylor: {
        C: 38,
        n: 0.16,
        reference_speed: 22,
        reference_life: 15,
        speed_range: { min: 8, max: 40 }
      },

      machinability: {
        aisi_rating: 12,
        relative_to_1212: 0.12,
        chip_form: "powder",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 1.85,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "extreme_abrasive",
        notes: "GRINDING ONLY. Diamond or CBN required."
      },

      johnson_cook: {
        A: 920,
        B: 1080,
        n: 0.12,
        C: 0.007,
        m: 0.65,
        T_melt: 1260,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "Diamond or CBN",
          speed: 20,
          feed_rate: 0.005,
          notes: "ONLY practical method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "very_high",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.6, Rz: 4 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["severe_abrasion_service", "cement_mill_liners", "coal_pulverizer_rolls", "coke_oven_doors"],
      
      microstructure: {
        graphite_form: "none - white iron",
        matrix: "martensite + austenite + M7C3 carbides",
        graphite_size: null,
        nodularity: null,
        carbides: "30-40% M7C3 chromium carbides"
      },

      wear_resistance: {
        abrasion_factor: 14,
        relative_to_mild_steel: 14,
        notes: "EXCEPTIONAL abrasion resistance due to M7C3 carbides"
      },

      corrosion_resistance: {
        oxidation: "good",
        acids: "moderate",
        alkalis: "good"
      },

      damping_capacity: {
        relative_to_steel: 0.4,
        log_decrement: 0.004
      },

      notes: "Ni-Hard Type 4. Chrome carbides (M7C3) harder than cementite. GRINDING ONLY."
    },

    "K-CI-047": {
      id: "K-CI-047",
      name: "High-Chrome White Iron 15% Cr",
      designation: {
        astm: "A532 Class II Type B",
        sae: "",
        din: "GX260CrMo15-2",
        en: "EN-GJN-HV550(Cr15)",
        jis: ""
      },
      iso_group: "H",
      material_class: "White Cast Iron - High Chrome",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.40, max: 3.00, typical: 2.70 },
        silicon: { min: 0.50, max: 1.20, typical: 0.85 },
        manganese: { min: 0.50, max: 1.20, typical: 0.85 },
        phosphorus: { min: 0, max: 0.05, typical: 0.025 },
        sulfur: { min: 0, max: 0.05, typical: 0.025 },
        chromium: { min: 14.0, max: 18.0, typical: 16.0 },
        nickel: { min: 0, max: 2.50, typical: 1.25 },
        molybdenum: { min: 1.00, max: 3.00, typical: 2.00 },
        copper: { min: 0, max: 1.00, typical: 0.50 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0, max: 0.10, typical: 0.05 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.02, typical: 0.01 },
        iron: { min: 72.0, max: 80.0, typical: 76.0 }
      },

      physical: {
        density: 7550,
        melting_point: { solidus: 1220, liquidus: 1350 },
        specific_heat: 450,
        thermal_conductivity: 18,
        thermal_expansion: 10.2e-6,
        electrical_resistivity: 95e-8,
        magnetic_permeability: 1.02,
        poissons_ratio: 0.27,
        elastic_modulus: 190000,
        shear_modulus: 75000
      },

      mechanical: {
        hardness: {
          brinell: 550,
          rockwell_c: 55,
          rockwell_b: null,
          vickers: 578
        },
        tensile_strength: { min: 400, typical: 480, max: 560 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1600, typical: 1920, max: 2240 },
        elongation: { min: 0, typical: 0, max: 0.5 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 190,
        fracture_toughness: 13
      },

      kienzle: {
        kc1_1: 1950,
        mc: 0.18,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.15,
        chip_compression: 3.7
      },

      taylor: {
        C: 42,
        n: 0.16,
        reference_speed: 25,
        reference_life: 15,
        speed_range: { min: 8, max: 45 }
      },

      machinability: {
        aisi_rating: 14,
        relative_to_1212: 0.14,
        chip_form: "powder",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 1.80,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "GRINDING ONLY"
      },

      johnson_cook: {
        A: 880,
        B: 1050,
        n: 0.13,
        C: 0.008,
        m: 0.66,
        T_melt: 1285,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "Diamond or CBN",
          speed: 20,
          feed_rate: 0.005,
          notes: "Grinding is the only practical method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "high",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.6, Rz: 4 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["slurry_pumps", "dredge_pumps", "mining_equipment", "cement_industry"],
      
      microstructure: {
        graphite_form: "none - white iron",
        matrix: "martensite + austenite + M7C3 carbides",
        graphite_size: null,
        nodularity: null,
        carbides: "25-35% M7C3"
      },

      wear_resistance: {
        abrasion_factor: 12,
        relative_to_mild_steel: 12,
        notes: "Excellent combined abrasion and corrosion resistance"
      },

      corrosion_resistance: {
        oxidation: "excellent",
        acids: "good",
        alkalis: "excellent"
      },

      damping_capacity: {
        relative_to_steel: 0.5,
        log_decrement: 0.005
      },

      notes: "15% Cr white iron. Good corrosion resistance with high abrasion resistance. GRINDING ONLY."
    },

    "K-CI-048": {
      id: "K-CI-048",
      name: "High-Chrome White Iron 27% Cr",
      designation: {
        astm: "A532 Class III Type A",
        sae: "",
        din: "GX300CrMo27-2",
        en: "EN-GJN-HV600(Cr27)",
        jis: ""
      },
      iso_group: "H",
      material_class: "White Cast Iron - High Chrome",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.30, max: 2.80, typical: 2.55 },
        silicon: { min: 0.40, max: 1.00, typical: 0.70 },
        manganese: { min: 0.50, max: 1.00, typical: 0.75 },
        phosphorus: { min: 0, max: 0.04, typical: 0.02 },
        sulfur: { min: 0, max: 0.04, typical: 0.02 },
        chromium: { min: 25.0, max: 30.0, typical: 27.5 },
        nickel: { min: 0, max: 1.50, typical: 0.75 },
        molybdenum: { min: 1.50, max: 3.00, typical: 2.25 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0, max: 0.15, typical: 0.075 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.02, typical: 0.01 },
        iron: { min: 63.0, max: 70.0, typical: 66.5 }
      },

      physical: {
        density: 7600,
        melting_point: { solidus: 1250, liquidus: 1380 },
        specific_heat: 450,
        thermal_conductivity: 16,
        thermal_expansion: 10.0e-6,
        electrical_resistivity: 100e-8,
        magnetic_permeability: 1.01,
        poissons_ratio: 0.27,
        elastic_modulus: 195000,
        shear_modulus: 77000
      },

      mechanical: {
        hardness: {
          brinell: 620,
          rockwell_c: 60,
          rockwell_b: null,
          vickers: 651
        },
        tensile_strength: { min: 450, typical: 540, max: 620 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1800, typical: 2160, max: 2480 },
        elongation: { min: 0, typical: 0, max: 0.3 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 215,
        fracture_toughness: 11
      },

      kienzle: {
        kc1_1: 2150,
        mc: 0.17,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.18,
        chip_compression: 3.9
      },

      taylor: {
        C: 35,
        n: 0.15,
        reference_speed: 20,
        reference_life: 15,
        speed_range: { min: 6, max: 38 }
      },

      machinability: {
        aisi_rating: 10,
        relative_to_1212: 0.10,
        chip_form: "powder",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 2.00,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "extreme_abrasive",
        notes: "GRINDING ONLY. Diamond wheels recommended."
      },

      johnson_cook: {
        A: 980,
        B: 1150,
        n: 0.11,
        C: 0.006,
        m: 0.62,
        T_melt: 1315,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "Diamond",
          speed: 18,
          feed_rate: 0.004,
          notes: "Diamond wheels essential for this material"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "very_high",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.5, Rz: 3 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["severe_slurry_pumps", "ore_processing", "shot_blast_equipment", "glass_molds"],
      
      microstructure: {
        graphite_form: "none - white iron",
        matrix: "austenite + massive M7C3 carbides",
        graphite_size: null,
        nodularity: null,
        carbides: "35-45% massive M7C3 chromium carbides"
      },

      wear_resistance: {
        abrasion_factor: 16,
        relative_to_mild_steel: 16,
        notes: "MAXIMUM abrasion resistance"
      },

      corrosion_resistance: {
        oxidation: "EXCEPTIONAL",
        acids: "good",
        alkalis: "excellent",
        high_temp: "excellent to 900°C"
      },

      damping_capacity: {
        relative_to_steel: 0.3,
        log_decrement: 0.003
      },

      notes: "27% Cr white iron - maximum wear resistance. GRINDING ONLY with diamond wheels."
    },

    "K-CI-049": {
      id: "K-CI-049",
      name: "Chilled Cast Iron (Chill Cast)",
      designation: {
        astm: "A48 Chill Cast",
        sae: "",
        din: "Hartguss",
        en: "EN-GJN-HV400",
        jis: ""
      },
      iso_group: "H",
      material_class: "Chilled Cast Iron",
      condition: "Chilled Surface",

      composition: {
        carbon: { min: 3.00, max: 3.60, typical: 3.30 },
        silicon: { min: 0.80, max: 1.40, typical: 1.10 },
        manganese: { min: 0.50, max: 0.90, typical: 0.70 },
        phosphorus: { min: 0, max: 0.15, typical: 0.08 },
        sulfur: { min: 0.05, max: 0.15, typical: 0.10 },
        chromium: { min: 0.15, max: 0.40, typical: 0.28 },
        nickel: { min: 0.30, max: 0.80, typical: 0.55 },
        molybdenum: { min: 0.15, max: 0.40, typical: 0.28 },
        copper: { min: 0, max: 0.30, typical: 0.15 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0, max: 0.03, typical: 0.015 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 92.0, max: 95.0, typical: 93.5 }
      },

      physical: {
        density: 7450,
        melting_point: { solidus: 1140, liquidus: 1230 },
        specific_heat: 460,
        thermal_conductivity: 35,
        thermal_expansion: 11.2e-6,
        electrical_resistivity: 55e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.27,
        elastic_modulus: 170000,
        shear_modulus: 67000
      },

      mechanical: {
        hardness: {
          brinell: 400,
          rockwell_c: 42,
          rockwell_b: null,
          vickers: 420,
          surface_note: "Chill zone 400-550 HB, gray core 180-220 HB"
        },
        tensile_strength: { min: 280, typical: 330, max: 380 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1120, typical: 1320, max: 1520 },
        elongation: { min: 0, typical: 0, max: 0.5 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 130,
        fracture_toughness: 16
      },

      kienzle: {
        kc1_1: 1600,
        mc: 0.21,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.4,
        note: "Values for chilled surface"
      },

      taylor: {
        C: 65,
        n: 0.19,
        reference_speed: 38,
        reference_life: 15,
        speed_range: { min: 12, max: 62 }
      },

      machinability: {
        aisi_rating: 22,
        relative_to_1212: 0.22,
        chip_form: "powder",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 1.50,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_crater",
        notes: "CBN or grinding for chilled zone. Gray core machines easily."
      },

      johnson_cook: {
        A: 700,
        B: 850,
        n: 0.16,
        C: 0.010,
        m: 0.72,
        T_melt: 1185,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          cbn: { speed: { min: 60, opt: 95, max: 140 }, feed: { min: 0.04, opt: 0.08, max: 0.14 }, doc: { min: 0.1, opt: 0.3, max: 0.8 } }
        },
        grinding: {
          wheel_type: "CBN or SiC",
          speed: 22,
          feed_rate: 0.008,
          notes: "Preferred for chilled surface finishing"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "moderate",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.6, Rz: 4 },
        chill_zone_depth: { min: 3, typical: 8, max: 15 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "moderate"
      },

      applications: ["rolling_mill_rolls", "camshafts", "crusher_rolls", "railroad_wheels"],
      
      microstructure: {
        graphite_form: "white iron (surface) / gray flake (core)",
        matrix: "cementite + pearlite (chill) / pearlitic (core)",
        graphite_size: "5-6 in gray zone",
        nodularity: null,
        carbides: "70-90% in chill zone"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "Dual-structure iron: hard white iron surface from chill, tough gray iron core."
    },

    "K-CI-050": {
      id: "K-CI-050",
      name: "Indefinite Chill Iron (ICDP Roll)",
      designation: {
        astm: "A532 Modified",
        sae: "",
        din: "ICDP",
        en: "EN-GJN-HV500(ICDP)",
        jis: ""
      },
      iso_group: "H",
      material_class: "Indefinite Chill Cast Iron",
      condition: "Indefinite Chill",

      composition: {
        carbon: { min: 3.20, max: 3.80, typical: 3.50 },
        silicon: { min: 0.60, max: 1.20, typical: 0.90 },
        manganese: { min: 0.40, max: 0.90, typical: 0.65 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0.02, max: 0.08, typical: 0.05 },
        chromium: { min: 1.50, max: 2.50, typical: 2.00 },
        nickel: { min: 4.00, max: 5.00, typical: 4.50 },
        molybdenum: { min: 0.30, max: 0.80, typical: 0.55 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0, max: 0.08, typical: 0.04 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 85.0, max: 90.0, typical: 87.5 }
      },

      physical: {
        density: 7500,
        melting_point: { solidus: 1160, liquidus: 1280 },
        specific_heat: 460,
        thermal_conductivity: 25,
        thermal_expansion: 10.8e-6,
        electrical_resistivity: 65e-8,
        magnetic_permeability: 1.1,
        poissons_ratio: 0.27,
        elastic_modulus: 175000,
        shear_modulus: 69000
      },

      mechanical: {
        hardness: {
          brinell: 500,
          rockwell_c: 50,
          rockwell_b: null,
          vickers: 525
        },
        tensile_strength: { min: 350, typical: 420, max: 490 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1400, typical: 1680, max: 1960 },
        elongation: { min: 0, typical: 0.5, max: 1.0 },
        reduction_of_area: { min: 0, typical: 0.5, max: 1.0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 165,
        fracture_toughness: 18
      },

      kienzle: {
        kc1_1: 1750,
        mc: 0.20,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.5
      },

      taylor: {
        C: 55,
        n: 0.18,
        reference_speed: 32,
        reference_life: 15,
        speed_range: { min: 10, max: 55 }
      },

      machinability: {
        aisi_rating: 18,
        relative_to_1212: 0.18,
        chip_form: "powder_segmented",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 1.60,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_crater"
      },

      johnson_cook: {
        A: 780,
        B: 950,
        n: 0.15,
        C: 0.009,
        m: 0.70,
        T_melt: 1220,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          cbn: { speed: { min: 50, opt: 82, max: 120 }, feed: { min: 0.04, opt: 0.08, max: 0.14 }, doc: { min: 0.1, opt: 0.3, max: 0.8 } }
        },
        grinding: {
          wheel_type: "CBN",
          speed: 22,
          feed_rate: 0.008,
          notes: "Primary machining method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "moderate",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.6, Rz: 4 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "moderate"
      },

      applications: ["hot_strip_mill_rolls", "plate_mill_rolls", "roughing_mill_rolls"],
      
      microstructure: {
        graphite_form: "mottled (graphite + carbide)",
        matrix: "martensite + retained austenite",
        graphite_size: "fine distributed",
        nodularity: null,
        carbides: "20-30% distributed carbides"
      },

      wear_resistance: {
        abrasion_factor: 8,
        relative_to_mild_steel: 8,
        thermal_fatigue: "excellent"
      },

      damping_capacity: {
        relative_to_steel: 3,
        log_decrement: 0.025
      },

      notes: "ICDP - Indefinite Chill Double Pour. Excellent thermal fatigue for mill rolls."
    }
  }
};

// Export for use in PRISM
if (typeof module !== "undefined" && 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: K_CAST_IRON | Materials: 25 | Sections added: 5
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
// Category: K_CAST_IRON | Materials: 25 | Sections added: 5
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

module.exports = SPECIAL_CAST_IRONS_036_060;
}


    // ═══════════════════════════════════════════════════════════════════════════
    // SPECIALTY AND ALLOYED CAST IRONS (K-CI-051 to K-CI-060)
    // ═══════════════════════════════════════════════════════════════════════════

    "K-CI-051": {
      id: "K-CI-051",
      name: "High-Silicon Corrosion Resistant Iron (Duriron)",
      designation: {
        astm: "A518 Grade 1",
        sae: "",
        din: "GGL-Si15",
        en: "EN-GJL-Si15",
        jis: ""
      },
      iso_group: "K",
      material_class: "High-Silicon Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 0.70, max: 1.10, typical: 0.90 },
        silicon: { min: 14.20, max: 14.75, typical: 14.50 },
        manganese: { min: 0, max: 1.50, typical: 0.75 },
        phosphorus: { min: 0, max: 0.15, typical: 0.08 },
        sulfur: { min: 0, max: 0.10, typical: 0.05 },
        chromium: { min: 0, max: 0.50, typical: 0.25 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        molybdenum: { min: 0, max: 0.50, typical: 0.25 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.025 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 80.0, max: 84.0, typical: 82.0 }
      },

      physical: {
        density: 7000,
        melting_point: { solidus: 1200, liquidus: 1350 },
        specific_heat: 500,
        thermal_conductivity: 12,
        thermal_expansion: 10.5e-6,
        electrical_resistivity: 120e-8,
        magnetic_permeability: 1.01,
        poissons_ratio: 0.26,
        elastic_modulus: 115000,
        shear_modulus: 46000
      },

      mechanical: {
        hardness: {
          brinell: 480,
          rockwell_c: 48,
          rockwell_b: null,
          vickers: 504
        },
        tensile_strength: { min: 115, typical: 140, max: 170 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 690, typical: 840, max: 1020 },
        elongation: { min: 0, typical: 0, max: 0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 1, temperature: 20 },
        fatigue_strength: 55,
        fracture_toughness: 8
      },

      kienzle: {
        kc1_1: 1400,
        mc: 0.22,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.2
      },

      taylor: {
        C: 60,
        n: 0.20,
        reference_speed: 35,
        reference_life: 15,
        speed_range: { min: 12, max: 58 }
      },

      machinability: {
        aisi_rating: 22,
        relative_to_1212: 0.22,
        chip_form: "powder",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.45,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_flank",
        notes: "EXTREMELY BRITTLE. Diamond tooling. No shock loading."
      },

      johnson_cook: {
        A: 200,
        B: 300,
        n: 0.10,
        C: 0.005,
        m: 0.60,
        T_melt: 1275,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 35, opt: 55, max: 80 }, feed: { min: 0.02, opt: 0.05, max: 0.10 }, doc: { min: 0.2, opt: 0.5, max: 1.2 } }
        },
        grinding: {
          wheel_type: "Diamond or SiC",
          speed: 20,
          feed_rate: 0.005,
          notes: "Grinding preferred due to extreme brittleness"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "water_based",
        mql_suitable: false,
        cryogenic_benefit: "none"
      },

      applications: ["acid_pumps", "chemical_process_equipment", "sulfuric_acid_tanks", "nitric_acid_service"],
      
      microstructure: {
        graphite_form: "none or trace",
        matrix: "silico-ferrite",
        graphite_size: null,
        nodularity: null,
        carbides: "none"
      },

      corrosion_resistance: {
        sulfuric_acid: "EXCEPTIONAL (all concentrations)",
        nitric_acid: "EXCEPTIONAL",
        hydrochloric_acid: "poor",
        phosphoric_acid: "excellent",
        oxidizing_acids: "excellent"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "Duriron-type. EXTREMELY BRITTLE - handle with care. Exceptional acid resistance."
    },

    "K-CI-052": {
      id: "K-CI-052",
      name: "High-Silicon Mo-Cr Corrosion Iron (Durichlor)",
      designation: {
        astm: "A518 Grade 3",
        sae: "",
        din: "GGL-Si15CrMo",
        en: "EN-GJL-Si15CrMo",
        jis: ""
      },
      iso_group: "K",
      material_class: "High-Silicon Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 0.70, max: 1.10, typical: 0.90 },
        silicon: { min: 14.20, max: 14.75, typical: 14.50 },
        manganese: { min: 0, max: 1.50, typical: 0.75 },
        phosphorus: { min: 0, max: 0.15, typical: 0.08 },
        sulfur: { min: 0, max: 0.10, typical: 0.05 },
        chromium: { min: 3.25, max: 5.00, typical: 4.12 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        molybdenum: { min: 0.40, max: 0.60, typical: 0.50 },
        copper: { min: 0.40, max: 0.60, typical: 0.50 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.05, typical: 0.025 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 75.0, max: 80.0, typical: 77.5 }
      },

      physical: {
        density: 7050,
        melting_point: { solidus: 1210, liquidus: 1360 },
        specific_heat: 500,
        thermal_conductivity: 11,
        thermal_expansion: 10.3e-6,
        electrical_resistivity: 130e-8,
        magnetic_permeability: 1.01,
        poissons_ratio: 0.26,
        elastic_modulus: 120000,
        shear_modulus: 48000
      },

      mechanical: {
        hardness: {
          brinell: 520,
          rockwell_c: 52,
          rockwell_b: null,
          vickers: 546
        },
        tensile_strength: { min: 125, typical: 155, max: 185 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 750, typical: 930, max: 1110 },
        elongation: { min: 0, typical: 0, max: 0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 1, temperature: 20 },
        fatigue_strength: 62,
        fracture_toughness: 7
      },

      kienzle: {
        kc1_1: 1500,
        mc: 0.21,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.3
      },

      taylor: {
        C: 52,
        n: 0.19,
        reference_speed: 30,
        reference_life: 15,
        speed_range: { min: 10, max: 52 }
      },

      machinability: {
        aisi_rating: 18,
        relative_to_1212: 0.18,
        chip_form: "powder",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.52,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_flank",
        notes: "EXTREMELY BRITTLE. Grinding preferred."
      },

      johnson_cook: {
        A: 220,
        B: 330,
        n: 0.09,
        C: 0.004,
        m: 0.58,
        T_melt: 1285,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "Diamond or SiC",
          speed: 18,
          feed_rate: 0.004,
          notes: "Grinding is preferred method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "water_based",
        mql_suitable: false,
        cryogenic_benefit: "none"
      },

      applications: ["chlorine_service", "bromine_handling", "ferric_chloride", "wet_chlorine_gas"],
      
      microstructure: {
        graphite_form: "none or trace",
        matrix: "silico-ferrite with Cr/Mo",
        graphite_size: null,
        nodularity: null,
        carbides: "trace Cr carbides"
      },

      corrosion_resistance: {
        sulfuric_acid: "exceptional",
        nitric_acid: "exceptional",
        hydrochloric_acid: "GOOD (unlike Grade 1)",
        chlorine: "EXCEPTIONAL",
        ferric_chloride: "EXCEPTIONAL"
      },

      damping_capacity: {
        relative_to_steel: 1.8,
        log_decrement: 0.015
      },

      notes: "Durichlor-type. EXTREMELY BRITTLE. Exceptional resistance to chlorine and chlorides."
    },

    "K-CI-053": {
      id: "K-CI-053",
      name: "Abrasion Resistant Gray Iron (AR Gray)",
      designation: {
        astm: "A48 Class 40 AR",
        sae: "",
        din: "GGL-40 AR",
        en: "EN-GJL-300 AR",
        jis: "FC300-AR"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron - Abrasion Resistant",
      condition: "Alloyed As-Cast",

      composition: {
        carbon: { min: 2.80, max: 3.30, typical: 3.05 },
        silicon: { min: 1.60, max: 2.20, typical: 1.90 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        phosphorus: { min: 0, max: 0.10, typical: 0.05 },
        sulfur: { min: 0.06, max: 0.12, typical: 0.09 },
        chromium: { min: 0.40, max: 0.80, typical: 0.60 },
        nickel: { min: 0.30, max: 0.60, typical: 0.45 },
        molybdenum: { min: 0.25, max: 0.50, typical: 0.38 },
        copper: { min: 0.30, max: 0.60, typical: 0.45 },
        titanium: { min: 0, max: 0.08, typical: 0.04 },
        vanadium: { min: 0.05, max: 0.15, typical: 0.10 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 91.0, max: 94.0, typical: 92.5 }
      },

      physical: {
        density: 7200,
        melting_point: { solidus: 1140, liquidus: 1210 },
        specific_heat: 460,
        thermal_conductivity: 38,
        thermal_expansion: 10.8e-6,
        electrical_resistivity: 58e-8,
        magnetic_permeability: 280,
        poissons_ratio: 0.26,
        elastic_modulus: 125000,
        shear_modulus: 50000
      },

      mechanical: {
        hardness: {
          brinell: 280,
          rockwell_c: 28,
          rockwell_b: null,
          vickers: 294
        },
        tensile_strength: { min: 300, typical: 350, max: 400 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1200, typical: 1400, max: 1600 },
        elongation: { min: 0, typical: 0, max: 0.5 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 140,
        fracture_toughness: 17
      },

      kienzle: {
        kc1_1: 1350,
        mc: 0.23,
        kc_adjust_rake: -1.8,
        kc_adjust_speed: -0.12,
        chip_compression: 3.1
      },

      taylor: {
        C: 115,
        n: 0.23,
        reference_speed: 65,
        reference_life: 15,
        speed_range: { min: 25, max: 105 }
      },

      machinability: {
        aisi_rating: 48,
        relative_to_1212: 0.48,
        chip_form: "segmented_short",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 1.22,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 420,
        B: 580,
        n: 0.18,
        C: 0.012,
        m: 0.78,
        T_melt: 1175,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 65, opt: 95, max: 130 }, feed: { min: 0.08, opt: 0.18, max: 0.32 }, doc: { min: 0.6, opt: 1.8, max: 4.5 } },
          ceramic: { speed: { min: 130, opt: 200, max: 280 }, feed: { min: 0.05, opt: 0.12, max: 0.22 }, doc: { min: 0.3, opt: 1.2, max: 2.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 52, opt: 80, max: 115 }, feed_per_tooth: { min: 0.06, opt: 0.12, max: 0.20 }, doc: { min: 0.6, opt: 1.8, max: 4.0 }, woc_factor: 0.48 }
        },
        drilling: {
          carbide: { speed: { min: 35, opt: 55, max: 78 }, feed_per_rev: { min: 0.06, opt: 0.14, max: 0.26 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.05,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "recommended_dry",
        recommended_type: "dry or mist",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["piston_rings", "cylinder_liners", "brake_drums", "clutch_plates"],
      
      microstructure: {
        graphite_form: "Flake (Type A)",
        matrix: "fine pearlitic + carbides",
        graphite_size: "5-6",
        nodularity: null,
        carbides: "5-10% distributed"
      },

      wear_resistance: {
        abrasion_factor: 4,
        relative_to_mild_steel: 4,
        notes: "Excellent wear resistance with retained gray iron properties"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.04
      },

      notes: "Alloyed abrasion-resistant gray iron. Retains damping with improved wear resistance."
    },

    "K-CI-054": {
      id: "K-CI-054",
      name: "Medium-Alloy Ductile Iron (Ni-Mo-Cu)",
      designation: {
        astm: "A536 Modified",
        sae: "J434 Modified",
        din: "GGG-NiMoCu",
        en: "EN-GJS-NiMoCu",
        jis: "FCD-NiMoCu"
      },
      iso_group: "K",
      material_class: "Ductile Cast Iron - Alloyed",
      condition: "As-Cast Alloyed",

      composition: {
        carbon: { min: 3.30, max: 3.70, typical: 3.50 },
        silicon: { min: 2.20, max: 2.80, typical: 2.50 },
        manganese: { min: 0.20, max: 0.50, typical: 0.35 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0.80, max: 1.50, typical: 1.15 },
        molybdenum: { min: 0.30, max: 0.60, typical: 0.45 },
        copper: { min: 0.60, max: 1.00, typical: 0.80 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.03, typical: 0.015 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 89.0, max: 92.5, typical: 90.8 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1170 },
        specific_heat: 460,
        thermal_conductivity: 30,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 55e-8,
        magnetic_permeability: 180,
        poissons_ratio: 0.28,
        elastic_modulus: 172000,
        shear_modulus: 68000
      },

      mechanical: {
        hardness: {
          brinell: 230,
          rockwell_c: 20,
          rockwell_b: null,
          vickers: 241
        },
        tensile_strength: { min: 700, typical: 780, max: 860 },
        yield_strength: { min: 500, typical: 560, max: 620 },
        compressive_strength: { min: 2100, typical: 2340, max: 2580 },
        elongation: { min: 3, typical: 5, max: 8 },
        reduction_of_area: { min: 3, typical: 5, max: 8 },
        impact_energy: { joules: 12, temperature: 20 },
        fatigue_strength: 310,
        fracture_toughness: 42
      },

      kienzle: {
        kc1_1: 1380,
        mc: 0.24,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.1
      },

      taylor: {
        C: 145,
        n: 0.24,
        reference_speed: 82,
        reference_life: 15,
        speed_range: { min: 32, max: 132 }
      },

      machinability: {
        aisi_rating: 60,
        relative_to_1212: 0.60,
        chip_form: "continuous_short",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.12,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_abrasive"
      },

      johnson_cook: {
        A: 620,
        B: 780,
        n: 0.22,
        C: 0.014,
        m: 0.82,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 82, opt: 118, max: 162 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.5, max: 6.5 } },
          carbide_uncoated: { speed: { min: 62, opt: 92, max: 128 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.5, max: 6.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 65, opt: 100, max: 142 }, feed_per_tooth: { min: 0.08, opt: 0.14, max: 0.24 }, doc: { min: 0.8, opt: 2.5, max: 5.5 }, woc_factor: 0.52 }
        },
        drilling: {
          carbide: { speed: { min: 45, opt: 70, max: 98 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } },
          hss_cobalt: { speed: { min: 14, opt: 22, max: 32 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.10,
        surface_roughness_typical: { Ra: 1.6, Rz: 9 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "slight"
      },

      applications: ["heavy_gears", "transmission_housings", "press_components", "machine_bases"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "fine pearlitic",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 88 },
        carbides: "none"
      },

      damping_capacity: {
        relative_to_steel: 3.5,
        log_decrement: 0.028
      },

      notes: "Medium-alloy ductile for elevated strength without heat treatment."
    },

    "K-CI-055": {
      id: "K-CI-055",
      name: "Low-Temp Impact Ductile Iron (Cryogenic)",
      designation: {
        astm: "A536 LT",
        sae: "J434 LT",
        din: "GGG-40 LT",
        en: "EN-GJS-400-18-LT",
        jis: "FCD400-LT"
      },
      iso_group: "K",
      material_class: "Ductile Cast Iron - Low Temperature",
      condition: "Ferritizing Annealed",

      composition: {
        carbon: { min: 3.40, max: 3.80, typical: 3.60 },
        silicon: { min: 2.20, max: 2.80, typical: 2.50 },
        manganese: { min: 0.10, max: 0.25, typical: 0.18 },
        phosphorus: { min: 0, max: 0.02, typical: 0.010 },
        sulfur: { min: 0, max: 0.01, typical: 0.005 },
        chromium: { min: 0, max: 0.03, typical: 0.015 },
        nickel: { min: 0.50, max: 1.00, typical: 0.75 },
        molybdenum: { min: 0, max: 0.02, typical: 0.01 },
        copper: { min: 0, max: 0.10, typical: 0.05 },
        magnesium: { min: 0.04, max: 0.07, typical: 0.055 },
        cerium: { min: 0.01, max: 0.03, typical: 0.02 },
        titanium: { min: 0, max: 0.02, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 91.5, max: 93.5, typical: 92.5 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1135, liquidus: 1185 },
        specific_heat: 460,
        thermal_conductivity: 36,
        thermal_expansion: 12.2e-6,
        electrical_resistivity: 48e-8,
        magnetic_permeability: 140,
        poissons_ratio: 0.28,
        elastic_modulus: 165000,
        shear_modulus: 65000
      },

      mechanical: {
        hardness: {
          brinell: 135,
          rockwell_b: 72,
          rockwell_c: null,
          vickers: 142
        },
        tensile_strength: { min: 400, typical: 450, max: 500 },
        yield_strength: { min: 250, typical: 290, max: 330 },
        compressive_strength: { min: 1200, typical: 1350, max: 1500 },
        elongation: { min: 18, typical: 24, max: 30 },
        reduction_of_area: { min: 15, typical: 20, max: 26 },
        impact_energy: { joules: 12, temperature: -40 },
        impact_energy_rt: { joules: 20, temperature: 20 },
        fatigue_strength: 180,
        fracture_toughness: 55
      },

      kienzle: {
        kc1_1: 1050,
        mc: 0.27,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.08,
        chip_compression: 2.8
      },

      taylor: {
        C: 210,
        n: 0.27,
        reference_speed: 115,
        reference_life: 15,
        speed_range: { min: 45, max: 185 }
      },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "continuous_curled",
        surface_finish_achievable: 1.4,
        cutting_force_factor: 0.92,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: {
        A: 320,
        B: 520,
        n: 0.32,
        C: 0.020,
        m: 0.92,
        T_melt: 1160,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 115, opt: 162, max: 225 }, feed: { min: 0.15, opt: 0.32, max: 0.52 }, doc: { min: 1.0, opt: 3.5, max: 8.5 } },
          carbide_uncoated: { speed: { min: 90, opt: 125, max: 175 }, feed: { min: 0.15, opt: 0.32, max: 0.52 }, doc: { min: 1.0, opt: 3.5, max: 8.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 92, opt: 138, max: 198 }, feed_per_tooth: { min: 0.12, opt: 0.20, max: 0.32 }, doc: { min: 1.0, opt: 3.5, max: 7.0 }, woc_factor: 0.58 }
        },
        drilling: {
          carbide: { speed: { min: 62, opt: 95, max: 135 }, feed_per_rev: { min: 0.12, opt: 0.26, max: 0.42 } },
          hss_cobalt: { speed: { min: 19, opt: 30, max: 42 }, feed_per_rev: { min: 0.12, opt: 0.26, max: 0.42 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.05,
        surface_roughness_typical: { Ra: 1.4, Rz: 7 }
      },

      coolant: {
        requirement: "optional",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "none"
      },

      applications: ["LNG_equipment", "cryogenic_valves", "cold_storage_equipment", "arctic_service"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I)",
        matrix: "ferritic (100%)",
        graphite_size: "6-7",
        nodularity: { min: 90, typical: 95 },
        carbides: "none",
        inclusions: "ultra-clean"
      },

      heat_treatment: {
        process: "Full Ferritizing Anneal",
        anneal_temp: 900,
        anneal_time_hours: 4,
        cooling: "slow_furnace_cool",
        purpose: "100% ferritic matrix for maximum low-temp toughness"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.04
      },

      notes: "Low-temperature service ductile iron. Maintains impact toughness to -40°C."
    },

    "K-CI-056": {
      id: "K-CI-056",
      name: "Carbidic Austempered Ductile Iron (CADI)",
      designation: {
        astm: "A897 Modified",
        sae: "J2477 Modified",
        din: "GGG-CADI",
        en: "EN-GJS-CADI",
        jis: "FCD-CADI"
      },
      iso_group: "H",
      material_class: "Austempered Ductile Iron - Carbidic",
      condition: "Austempered with Carbides",

      composition: {
        carbon: { min: 3.00, max: 3.40, typical: 3.20 },
        silicon: { min: 2.40, max: 3.00, typical: 2.70 },
        manganese: { min: 0.20, max: 0.50, typical: 0.35 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 0.50, max: 1.00, typical: 0.75 },
        nickel: { min: 0.40, max: 0.80, typical: 0.60 },
        molybdenum: { min: 0.20, max: 0.50, typical: 0.35 },
        copper: { min: 0.40, max: 0.80, typical: 0.60 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0.10, max: 0.25, typical: 0.18 },
        vanadium: { min: 0.05, max: 0.15, typical: 0.10 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 89.0, max: 92.0, typical: 90.5 }
      },

      physical: {
        density: 7150,
        melting_point: { solidus: 1120, liquidus: 1160 },
        specific_heat: 460,
        thermal_conductivity: 26,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 60e-8,
        magnetic_permeability: 1.15,
        poissons_ratio: 0.28,
        elastic_modulus: 168000,
        shear_modulus: 66000
      },

      mechanical: {
        hardness: {
          brinell: 420,
          rockwell_c: 44,
          rockwell_b: null,
          vickers: 441
        },
        tensile_strength: { min: 1100, typical: 1250, max: 1400 },
        yield_strength: { min: 900, typical: 1020, max: 1140 },
        compressive_strength: { min: 3300, typical: 3750, max: 4200 },
        elongation: { min: 0.5, typical: 1.5, max: 3 },
        reduction_of_area: { min: 0.5, typical: 1.5, max: 3 },
        impact_energy: { joules: 15, temperature: 20 },
        fatigue_strength: 500,
        fracture_toughness: 35
      },

      kienzle: {
        kc1_1: 1850,
        mc: 0.20,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.15,
        chip_compression: 3.5
      },

      taylor: {
        C: 58,
        n: 0.19,
        reference_speed: 35,
        reference_life: 15,
        speed_range: { min: 12, max: 58 }
      },

      machinability: {
        aisi_rating: 22,
        relative_to_1212: 0.22,
        chip_form: "segmented_hard",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.55,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "Machine BEFORE austempering. CBN for finished parts."
      },

      johnson_cook: {
        A: 1050,
        B: 1280,
        n: 0.18,
        C: 0.010,
        m: 0.72,
        T_melt: 1140,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          cbn: { speed: { min: 55, opt: 85, max: 125 }, feed: { min: 0.04, opt: 0.08, max: 0.15 }, doc: { min: 0.15, opt: 0.4, max: 1.0 } }
        },
        grinding: {
          wheel_type: "CBN",
          speed: 22,
          feed_rate: 0.008,
          notes: "Preferred finishing method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "moderate",
        work_hardening_depth: 0.25,
        surface_roughness_typical: { Ra: 1.6, Rz: 10 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["wear_plates", "ground_engaging_tools", "mill_hammers", "agricultural_wear_parts"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "ausferritic + distributed carbides",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "8-15% Ti/V carbides"
      },

      heat_treatment: {
        process: "Austempering",
        austenitize_temp: 900,
        austempering_temp: 320,
        austempering_time_min: 120,
        cooling: "salt_bath",
        purpose: "Ausferritic matrix with wear-resistant carbides"
      },

      wear_resistance: {
        abrasion_factor: 6,
        relative_to_mild_steel: 6,
        notes: "Combines ADI toughness with carbide abrasion resistance"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "CADI - Carbidic ADI. Superior wear resistance to standard ADI. Pre-machine before heat treatment."
    },

    "K-CI-057": {
      id: "K-CI-057",
      name: "Thin-Wall High-Strength Ductile Iron",
      designation: {
        astm: "A536 TWHS",
        sae: "J434 TWHS",
        din: "GGG-TW",
        en: "EN-GJS-500-7 TW",
        jis: "FCD500-TW"
      },
      iso_group: "K",
      material_class: "Ductile Cast Iron - Thin Wall",
      condition: "As-Cast Optimized",

      composition: {
        carbon: { min: 3.60, max: 3.90, typical: 3.75 },
        silicon: { min: 2.60, max: 3.00, typical: 2.80 },
        manganese: { min: 0.15, max: 0.35, typical: 0.25 },
        phosphorus: { min: 0, max: 0.02, typical: 0.010 },
        sulfur: { min: 0, max: 0.01, typical: 0.005 },
        chromium: { min: 0, max: 0.03, typical: 0.015 },
        nickel: { min: 0, max: 0.10, typical: 0.05 },
        molybdenum: { min: 0, max: 0.02, typical: 0.01 },
        copper: { min: 0.30, max: 0.50, typical: 0.40 },
        magnesium: { min: 0.035, max: 0.055, typical: 0.045 },
        cerium: { min: 0.01, max: 0.02, typical: 0.015 },
        titanium: { min: 0, max: 0.02, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 92.5, max: 94.0, typical: 93.2 }
      },

      physical: {
        density: 7050,
        melting_point: { solidus: 1140, liquidus: 1180 },
        specific_heat: 460,
        thermal_conductivity: 34,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 50e-8,
        magnetic_permeability: 160,
        poissons_ratio: 0.28,
        elastic_modulus: 168000,
        shear_modulus: 66000
      },

      mechanical: {
        hardness: {
          brinell: 185,
          rockwell_b: 89,
          rockwell_c: null,
          vickers: 194
        },
        tensile_strength: { min: 500, typical: 560, max: 620 },
        yield_strength: { min: 340, typical: 385, max: 430 },
        compressive_strength: { min: 1500, typical: 1680, max: 1860 },
        elongation: { min: 7, typical: 10, max: 14 },
        reduction_of_area: { min: 7, typical: 10, max: 14 },
        impact_energy: { joules: 10, temperature: 20 },
        fatigue_strength: 225,
        fracture_toughness: 38
      },

      kienzle: {
        kc1_1: 1250,
        mc: 0.25,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 3.0
      },

      taylor: {
        C: 170,
        n: 0.25,
        reference_speed: 95,
        reference_life: 15,
        speed_range: { min: 38, max: 155 }
      },

      machinability: {
        aisi_rating: 72,
        relative_to_1212: 0.72,
        chip_form: "continuous_short",
        surface_finish_achievable: 1.4,
        cutting_force_factor: 1.08,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 440,
        B: 650,
        n: 0.26,
        C: 0.016,
        m: 0.85,
        T_melt: 1160,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 95, opt: 135, max: 188 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.5, max: 6.5 } },
          carbide_uncoated: { speed: { min: 72, opt: 105, max: 148 }, feed: { min: 0.10, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.5, max: 6.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 76, opt: 115, max: 165 }, feed_per_tooth: { min: 0.08, opt: 0.15, max: 0.25 }, doc: { min: 0.8, opt: 2.5, max: 5.5 }, woc_factor: 0.52 }
        },
        drilling: {
          carbide: { speed: { min: 52, opt: 80, max: 115 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.34 } },
          hss_cobalt: { speed: { min: 15, opt: 25, max: 36 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.34 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 1.4, Rz: 7 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["automotive_structural", "suspension_components", "steering_knuckles", "brake_calipers"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I)",
        matrix: "ferritic-pearlitic (optimized)",
        graphite_size: "7-8",
        nodularity: { min: 90, typical: 95 },
        carbides: "none"
      },

      casting_notes: {
        min_wall_thickness: 2.5,
        max_wall_thickness: 12,
        inoculant: "FeSiBaLa",
        notes: "Optimized for thin sections with high nodule count"
      },

      damping_capacity: {
        relative_to_steel: 3.5,
        log_decrement: 0.028
      },

      notes: "Thin-wall ductile iron optimized for 2.5-12mm sections. High nodule count prevents carbides."
    },

    "K-CI-058": {
      id: "K-CI-058",
      name: "High-Chromium Alloy Ductile Iron",
      designation: {
        astm: "A536 Modified",
        sae: "",
        din: "GGG-HiCr",
        en: "EN-GJS-HiCr",
        jis: ""
      },
      iso_group: "K",
      material_class: "Ductile Cast Iron - High Chromium",
      condition: "As-Cast Alloyed",

      composition: {
        carbon: { min: 2.80, max: 3.30, typical: 3.05 },
        silicon: { min: 2.00, max: 2.60, typical: 2.30 },
        manganese: { min: 0.40, max: 0.80, typical: 0.60 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 4.00, max: 6.00, typical: 5.00 },
        nickel: { min: 0.50, max: 1.00, typical: 0.75 },
        molybdenum: { min: 0.50, max: 1.00, typical: 0.75 },
        copper: { min: 0, max: 0.30, typical: 0.15 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        vanadium: { min: 0.10, max: 0.30, typical: 0.20 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 84.0, max: 88.5, typical: 86.2 }
      },

      physical: {
        density: 7200,
        melting_point: { solidus: 1160, liquidus: 1220 },
        specific_heat: 460,
        thermal_conductivity: 24,
        thermal_expansion: 11.0e-6,
        electrical_resistivity: 70e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.28,
        elastic_modulus: 175000,
        shear_modulus: 69000
      },

      mechanical: {
        hardness: {
          brinell: 320,
          rockwell_c: 34,
          rockwell_b: null,
          vickers: 336
        },
        tensile_strength: { min: 600, typical: 700, max: 800 },
        yield_strength: { min: 450, typical: 530, max: 610 },
        compressive_strength: { min: 1800, typical: 2100, max: 2400 },
        elongation: { min: 1, typical: 2, max: 4 },
        reduction_of_area: { min: 1, typical: 2, max: 4 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 280,
        fracture_toughness: 28
      },

      kienzle: {
        kc1_1: 1600,
        mc: 0.22,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.12,
        chip_compression: 3.4
      },

      taylor: {
        C: 95,
        n: 0.21,
        reference_speed: 55,
        reference_life: 15,
        speed_range: { min: 20, max: 90 }
      },

      machinability: {
        aisi_rating: 38,
        relative_to_1212: 0.38,
        chip_form: "segmented_short",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.35,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "abrasive_crater"
      },

      johnson_cook: {
        A: 600,
        B: 850,
        n: 0.20,
        C: 0.012,
        m: 0.78,
        T_melt: 1190,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 55, opt: 82, max: 115 }, feed: { min: 0.08, opt: 0.18, max: 0.32 }, doc: { min: 0.6, opt: 1.8, max: 4.5 } },
          ceramic: { speed: { min: 110, opt: 175, max: 250 }, feed: { min: 0.05, opt: 0.12, max: 0.22 }, doc: { min: 0.3, opt: 1.2, max: 2.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 45, opt: 68, max: 100 }, feed_per_tooth: { min: 0.06, opt: 0.12, max: 0.20 }, doc: { min: 0.6, opt: 1.8, max: 4.0 }, woc_factor: 0.45 }
        },
        drilling: {
          carbide: { speed: { min: 30, opt: 48, max: 70 }, feed_per_rev: { min: 0.06, opt: 0.14, max: 0.26 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "low",
        work_hardening_depth: 0.12,
        surface_roughness_typical: { Ra: 1.6, Rz: 9 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil",
        mql_suitable: false,
        cryogenic_benefit: "moderate"
      },

      applications: ["high_temp_applications", "oxidation_resistant_parts", "heat_treatment_fixtures", "exhaust_components"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "pearlitic + Cr carbides",
        graphite_size: "6-7",
        nodularity: { min: 75, typical: 82 },
        carbides: "10-15% Cr7C3"
      },

      high_temp_properties: {
        oxidation_resistance: "Excellent to 850°C",
        scaling_limit: 900,
        creep_strength_650C: 70
      },

      damping_capacity: {
        relative_to_steel: 2.5,
        log_decrement: 0.022
      },

      notes: "High-Cr ductile iron for elevated temperature and oxidation resistance."
    },

    "K-CI-059": {
      id: "K-CI-059",
      name: "Ductile Iron Plasma Nitrided Surface",
      designation: {
        astm: "A536 80-55-06 PN",
        sae: "J434 D5506 PN",
        din: "GGG-50 PN",
        en: "EN-GJS-500-7 PN",
        jis: "FCD500-PN"
      },
      iso_group: "H",
      material_class: "Ductile Cast Iron - Plasma Nitrided",
      condition: "Plasma Nitrided",

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
        aluminum: { min: 0.30, max: 0.60, typical: 0.45 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 90.0, max: 92.8, typical: 91.4 }
      },

      physical: {
        density: 7100,
        melting_point: { solidus: 1130, liquidus: 1175 },
        specific_heat: 460,
        thermal_conductivity: 30,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 54e-8,
        magnetic_permeability: 220,
        poissons_ratio: 0.28,
        elastic_modulus: 172000,
        shear_modulus: 68000
      },

      mechanical: {
        hardness: {
          brinell: 700,
          rockwell_c: 63,
          rockwell_b: null,
          vickers: 735,
          surface_note: "Surface hardness (compound zone) - core 195 HB"
        },
        tensile_strength: { min: 552, typical: 600, max: 650 },
        yield_strength: { min: 379, typical: 420, max: 460 },
        compressive_strength: { min: 1650, typical: 1800, max: 1950 },
        elongation: { min: 6, typical: 8, max: 12 },
        reduction_of_area: { min: 5, typical: 8, max: 12 },
        impact_energy: { joules: 8, temperature: 20 },
        fatigue_strength: 380,
        fracture_toughness: 30
      },

      kienzle: {
        kc1_1: 1850,
        mc: 0.18,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.15,
        chip_compression: 3.7,
        note: "Values for plasma nitrided surface"
      },

      taylor: {
        C: 48,
        n: 0.17,
        reference_speed: 28,
        reference_life: 15,
        speed_range: { min: 8, max: 50 }
      },

      machinability: {
        aisi_rating: 15,
        relative_to_1212: 0.15,
        chip_form: "powder",
        surface_finish_achievable: 0.3,
        cutting_force_factor: 1.65,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "GRINDING ONLY for plasma nitrided surface."
      },

      johnson_cook: {
        A: 880,
        B: 1000,
        n: 0.10,
        C: 0.007,
        m: 0.65,
        T_melt: 1150,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        grinding: {
          wheel_type: "CBN",
          speed: 22,
          feed_rate: 0.004,
          notes: "ONLY practical method for plasma nitrided surface"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "highly_compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.2, Rz: 1.5 },
        nitrided_case_depth: { compound_zone: 0.008, diffusion_zone: 0.25 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "minimal"
      },

      applications: ["precision_gears", "high_speed_shafts", "bearing_races", "hydraulic_spools"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "pearlite (core), Fe4N+Fe2-3N compound zone (surface)",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "none",
        nitrides: "ε-Fe2-3N + γ'-Fe4N compound zone"
      },

      heat_treatment: {
        process: "Plasma Nitriding (Ion Nitriding)",
        temperature: 480,
        time_hours: 20,
        gas_mixture: "75% N2 + 25% H2",
        case_depth_mm: 0.25,
        purpose: "Maximum surface hardness with controlled compound zone"
      },

      damping_capacity: {
        relative_to_steel: 2,
        log_decrement: 0.018
      },

      notes: "Plasma nitrided ductile iron. Superior to gas nitriding - controlled compound zone, less distortion."
    },

    "K-CI-060": {
      id: "K-CI-060",
      name: "High-Nitrogen Austenitic Ductile Iron",
      designation: {
        astm: "A439 Modified",
        sae: "",
        din: "GGG-Ni-N",
        en: "EN-GJSA-XNiCrN",
        jis: ""
      },
      iso_group: "K",
      material_class: "Austenitic Ductile Iron - Nitrogen Enhanced",
      condition: "As-Cast Austenitic",

      composition: {
        carbon: { min: 2.60, max: 3.10, typical: 2.85 },
        silicon: { min: 1.80, max: 2.40, typical: 2.10 },
        manganese: { min: 3.00, max: 5.00, typical: 4.00 },
        phosphorus: { min: 0, max: 0.05, typical: 0.025 },
        sulfur: { min: 0, max: 0.02, typical: 0.010 },
        chromium: { min: 14.0, max: 18.0, typical: 16.0 },
        nickel: { min: 10.0, max: 14.0, typical: 12.0 },
        molybdenum: { min: 2.00, max: 3.50, typical: 2.75 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        magnesium: { min: 0.03, max: 0.06, typical: 0.045 },
        cerium: { min: 0, max: 0.02, typical: 0.01 },
        titanium: { min: 0, max: 0.05, typical: 0.025 },
        nitrogen: { min: 0.08, max: 0.20, typical: 0.14 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        iron: { min: 58.0, max: 66.0, typical: 62.0 }
      },

      physical: {
        density: 7500,
        melting_point: { solidus: 1260, liquidus: 1380 },
        specific_heat: 510,
        thermal_conductivity: 12,
        thermal_expansion: 16.5e-6,
        electrical_resistivity: 105e-8,
        magnetic_permeability: 1.01,
        poissons_ratio: 0.29,
        elastic_modulus: 155000,
        shear_modulus: 60000
      },

      mechanical: {
        hardness: {
          brinell: 200,
          rockwell_b: 93,
          rockwell_c: null,
          vickers: 210
        },
        tensile_strength: { min: 520, typical: 600, max: 680 },
        yield_strength: { min: 280, typical: 340, max: 400 },
        compressive_strength: { min: 1560, typical: 1800, max: 2040 },
        elongation: { min: 20, typical: 30, max: 42 },
        reduction_of_area: { min: 18, typical: 25, max: 35 },
        impact_energy: { joules: 45, temperature: 20 },
        fatigue_strength: 240,
        fracture_toughness: 80
      },

      kienzle: {
        kc1_1: 1550,
        mc: 0.30,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.18,
        chip_compression: 3.6,
        note: "Severe work hardening"
      },

      taylor: {
        C: 55,
        n: 0.20,
        reference_speed: 32,
        reference_life: 15,
        speed_range: { min: 10, max: 55 }
      },

      machinability: {
        aisi_rating: 22,
        relative_to_1212: 0.22,
        chip_form: "continuous_stringy",
        surface_finish_achievable: 2.0,
        cutting_force_factor: 1.55,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "notch_crater",
        notes: "VERY DIFFICULT. Work hardens severely. Use sharp tools, positive rake, constant feed."
      },

      johnson_cook: {
        A: 400,
        B: 900,
        n: 0.52,
        C: 0.045,
        m: 1.05,
        T_melt: 1320,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 32, opt: 48, max: 72 }, feed: { min: 0.12, opt: 0.25, max: 0.42 }, doc: { min: 0.8, opt: 2.0, max: 5.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 26, opt: 40, max: 62 }, feed_per_tooth: { min: 0.10, opt: 0.18, max: 0.28 }, doc: { min: 0.8, opt: 2.0, max: 4.5 }, woc_factor: 0.42 }
        },
        drilling: {
          carbide: { speed: { min: 18, opt: 28, max: 42 }, feed_per_rev: { min: 0.10, opt: 0.20, max: 0.35 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.80,
        surface_roughness_typical: { Ra: 2.0, Rz: 12 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "high_lubricity_EP",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["seawater_pumps", "chemical_processing", "offshore_equipment", "desalination_plants"],
      
      microstructure: {
        graphite_form: "Spheroidal (Type I-II)",
        matrix: "austenitic (100%)",
        graphite_size: "6-7",
        nodularity: { min: 80, typical: 85 },
        carbides: "trace"
      },

      corrosion_resistance: {
        seawater: "EXCEPTIONAL",
        pitting_resistance: "PREN ~35",
        crevice_corrosion: "excellent",
        acids: "good_to_excellent",
        chlorides: "exceptional",
        stress_corrosion: "excellent"
      },

      high_temp_properties: {
        oxidation_resistance: "Excellent to 800°C",
        scaling_limit: 850
      },

      damping_capacity: {
        relative_to_steel: 4,
        log_decrement: 0.032
      },

      notes: "High-N austenitic ductile iron. EXCEPTIONAL seawater/chloride resistance. SEVERE work hardening."
    }
  }
};

// Update metadata with correct count
SPECIAL_CAST_IRONS_036_060.metadata.materialCount = 25;

// Export for use in PRISM
if (typeof module !== "undefined" && 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: K_CAST_IRON | Materials: 25 | Sections added: 5
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
// Category: K_CAST_IRON | Materials: 25 | Sections added: 5
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

module.exports = SPECIAL_CAST_IRONS_036_060;
}
