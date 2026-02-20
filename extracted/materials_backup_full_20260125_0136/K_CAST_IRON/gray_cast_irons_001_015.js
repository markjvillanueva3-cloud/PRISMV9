/**
 * PRISM MATERIALS DATABASE - Cast Irons Part 1
 * File: gray_cast_irons_001_015.js
 * Materials: K-CI-001 through K-CI-015
 * 
 * ISO Category: K (Cast Irons)
 * Sub-category: Gray Cast Irons (Flake Graphite)
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * 
 * CAST IRON CHARACTERISTICS:
 * - Graphite morphology determines properties
 * - Excellent damping and wear resistance
 * - High compressive strength (3-4x tensile)
 * - Good machinability (graphite acts as lubricant)
 * - Lower ductility than steels
 * 
 * Created: 2026-01-25
 */

const GRAY_CAST_IRONS_001_015 = {
  metadata: {
    file: "gray_cast_irons_001_015.js",
    category: "K_CAST_IRON",
    subcategory: "Gray Cast Iron",
    materialCount: 15,
    idRange: { start: "K-CI-001", end: "K-CI-015" },
    schemaVersion: "3.0.0",
    created: "2026-01-25"
  },

  materials: {
    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-001: Gray Iron Class 20
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-001": {
      id: "K-CI-001",
      name: "Gray Iron Class 20 As-Cast",
      designation: {
        astm: "A48 Class 20",
        sae: "J431 G1800",
        din: "GG-15",
        en: "EN-GJL-150",
        jis: "FC150"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.40, max: 3.70, typical: 3.50 },
        silicon: { min: 2.30, max: 2.70, typical: 2.50 },
        manganese: { min: 0.50, max: 0.80, typical: 0.65 },
        phosphorus: { min: 0, max: 0.15, typical: 0.08 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0, max: 0.10, typical: 0.03 },
        molybdenum: { min: 0, max: 0.05, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 92.0, max: 94.0, typical: 93.0 }
      },

      physical: {
        density: 7150,
        melting_point: { solidus: 1140, liquidus: 1260 },
        specific_heat: 460,
        thermal_conductivity: 46,
        thermal_expansion: 10.5e-6,
        electrical_resistivity: 67e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.26,
        elastic_modulus: 100000,
        shear_modulus: 40000
      },

      mechanical: {
        hardness: {
          brinell: 156,
          rockwell_b: 80,
          rockwell_c: null,
          vickers: 165
        },
        tensile_strength: { min: 138, typical: 150, max: 175 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 550, typical: 600, max: 650 },
        elongation: { min: 0, typical: 0.5, max: 1.0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 65,
        fracture_toughness: 15
      },

      kienzle: {
        kc1_1: 790,
        mc: 0.28,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.2
      },

      taylor: {
        C: 280,
        n: 0.28,
        reference_speed: 150,
        reference_life: 15,
        speed_range: { min: 60, max: 250 }
      },

      machinability: {
        aisi_rating: 125,
        relative_to_1212: 1.25,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.75,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 200,
        B: 350,
        n: 0.15,
        C: 0.015,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 150, opt: 200, max: 280 }, feed: { min: 0.15, opt: 0.30, max: 0.50 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } },
          carbide_uncoated: { speed: { min: 120, opt: 160, max: 220 }, feed: { min: 0.15, opt: 0.30, max: 0.50 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } },
          ceramic: { speed: { min: 300, opt: 450, max: 600 }, feed: { min: 0.10, opt: 0.20, max: 0.35 }, doc: { min: 0.5, opt: 2.0, max: 4.0 } },
          cbn: { speed: { min: 400, opt: 600, max: 900 }, feed: { min: 0.08, opt: 0.15, max: 0.25 }, doc: { min: 0.3, opt: 1.0, max: 2.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 120, opt: 180, max: 250 }, feed_per_tooth: { min: 0.10, opt: 0.18, max: 0.30 }, doc: { min: 1.0, opt: 3.0, max: 6.0 }, woc_factor: 0.6 }
        },
        drilling: {
          carbide: { speed: { min: 80, opt: 120, max: 160 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.40 } },
          hss_cobalt: { speed: { min: 25, opt: 40, max: 55 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.40 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal",
        notes: "Graphite provides natural lubrication"
      },

      applications: ["engine_blocks", "brake_drums", "machine_bases", "pipe_fittings", "cookware"],
      
      microstructure: {
        graphite_form: "Type A flake",
        matrix: "ferritic-pearlitic",
        graphite_size: "4-5",
        nodularity: null,
        carbides: "none"
      },

      damping_capacity: {
        relative_to_steel: 10,
        log_decrement: 0.08,
        notes: "Excellent vibration damping"
      },

      notes: "Most common gray iron grade for general applications. Excellent machinability, damping, and castability."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-002: Gray Iron Class 25
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-002": {
      id: "K-CI-002",
      name: "Gray Iron Class 25 As-Cast",
      designation: {
        astm: "A48 Class 25",
        sae: "J431 G2500",
        din: "GG-20",
        en: "EN-GJL-200",
        jis: "FC200"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.20, max: 3.50, typical: 3.35 },
        silicon: { min: 2.10, max: 2.50, typical: 2.30 },
        manganese: { min: 0.50, max: 0.80, typical: 0.65 },
        phosphorus: { min: 0, max: 0.12, typical: 0.06 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0, max: 0.15, typical: 0.08 },
        nickel: { min: 0, max: 0.15, typical: 0.05 },
        molybdenum: { min: 0, max: 0.06, typical: 0.03 },
        copper: { min: 0, max: 0.25, typical: 0.15 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 92.5, max: 94.5, typical: 93.5 }
      },

      physical: {
        density: 7200,
        melting_point: { solidus: 1145, liquidus: 1255 },
        specific_heat: 460,
        thermal_conductivity: 48,
        thermal_expansion: 10.8e-6,
        electrical_resistivity: 62e-8,
        magnetic_permeability: 220,
        poissons_ratio: 0.26,
        elastic_modulus: 110000,
        shear_modulus: 44000
      },

      mechanical: {
        hardness: {
          brinell: 174,
          rockwell_b: 85,
          rockwell_c: null,
          vickers: 183
        },
        tensile_strength: { min: 172, typical: 185, max: 210 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 690, typical: 750, max: 800 },
        elongation: { min: 0, typical: 0.5, max: 1.0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 80,
        fracture_toughness: 16
      },

      kienzle: {
        kc1_1: 850,
        mc: 0.27,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.3
      },

      taylor: {
        C: 260,
        n: 0.27,
        reference_speed: 140,
        reference_life: 15,
        speed_range: { min: 55, max: 230 }
      },

      machinability: {
        aisi_rating: 115,
        relative_to_1212: 1.15,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.80,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 230,
        B: 380,
        n: 0.16,
        C: 0.015,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 140, opt: 190, max: 260 }, feed: { min: 0.15, opt: 0.30, max: 0.50 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } },
          carbide_uncoated: { speed: { min: 110, opt: 150, max: 200 }, feed: { min: 0.15, opt: 0.30, max: 0.50 }, doc: { min: 1.0, opt: 3.0, max: 8.0 } },
          ceramic: { speed: { min: 280, opt: 420, max: 560 }, feed: { min: 0.10, opt: 0.20, max: 0.35 }, doc: { min: 0.5, opt: 2.0, max: 4.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 110, opt: 160, max: 230 }, feed_per_tooth: { min: 0.10, opt: 0.18, max: 0.30 }, doc: { min: 1.0, opt: 3.0, max: 6.0 }, woc_factor: 0.6 }
        },
        drilling: {
          carbide: { speed: { min: 70, opt: 110, max: 150 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.40 } },
          hss_cobalt: { speed: { min: 22, opt: 35, max: 50 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.40 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["cylinder_blocks", "flywheels", "brake_drums", "pump_housings", "compressor_parts"],
      
      microstructure: {
        graphite_form: "Type A flake",
        matrix: "pearlitic-ferritic",
        graphite_size: "4-5",
        nodularity: null,
        carbides: "none"
      },

      damping_capacity: {
        relative_to_steel: 9,
        log_decrement: 0.07
      },

      notes: "Standard grade for automotive and general engineering. Good strength-to-cost ratio."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-003: Gray Iron Class 30
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-003": {
      id: "K-CI-003",
      name: "Gray Iron Class 30 As-Cast",
      designation: {
        astm: "A48 Class 30",
        sae: "J431 G3000",
        din: "GG-25",
        en: "EN-GJL-250",
        jis: "FC250"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.10, max: 3.40, typical: 3.25 },
        silicon: { min: 1.90, max: 2.30, typical: 2.10 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        phosphorus: { min: 0, max: 0.10, typical: 0.05 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.10, max: 0.25, typical: 0.15 },
        nickel: { min: 0, max: 0.20, typical: 0.10 },
        molybdenum: { min: 0, max: 0.10, typical: 0.05 },
        copper: { min: 0.20, max: 0.40, typical: 0.30 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 92.0, max: 94.0, typical: 93.0 }
      },

      physical: {
        density: 7250,
        melting_point: { solidus: 1150, liquidus: 1250 },
        specific_heat: 460,
        thermal_conductivity: 46,
        thermal_expansion: 11.0e-6,
        electrical_resistivity: 58e-8,
        magnetic_permeability: 240,
        poissons_ratio: 0.26,
        elastic_modulus: 120000,
        shear_modulus: 48000
      },

      mechanical: {
        hardness: {
          brinell: 196,
          rockwell_b: 92,
          rockwell_c: null,
          vickers: 206
        },
        tensile_strength: { min: 207, typical: 230, max: 260 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 830, typical: 900, max: 950 },
        elongation: { min: 0, typical: 0.5, max: 1.0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 100,
        fracture_toughness: 17
      },

      kienzle: {
        kc1_1: 920,
        mc: 0.26,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.4
      },

      taylor: {
        C: 240,
        n: 0.26,
        reference_speed: 130,
        reference_life: 15,
        speed_range: { min: 50, max: 210 }
      },

      machinability: {
        aisi_rating: 100,
        relative_to_1212: 1.00,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.85,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 270,
        B: 420,
        n: 0.17,
        C: 0.016,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 130, opt: 170, max: 240 }, feed: { min: 0.15, opt: 0.28, max: 0.45 }, doc: { min: 1.0, opt: 3.0, max: 7.0 } },
          carbide_uncoated: { speed: { min: 100, opt: 140, max: 180 }, feed: { min: 0.15, opt: 0.28, max: 0.45 }, doc: { min: 1.0, opt: 3.0, max: 7.0 } },
          ceramic: { speed: { min: 260, opt: 380, max: 520 }, feed: { min: 0.10, opt: 0.18, max: 0.30 }, doc: { min: 0.5, opt: 2.0, max: 4.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 100, opt: 145, max: 210 }, feed_per_tooth: { min: 0.10, opt: 0.16, max: 0.28 }, doc: { min: 1.0, opt: 3.0, max: 6.0 }, woc_factor: 0.6 }
        },
        drilling: {
          carbide: { speed: { min: 65, opt: 100, max: 140 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.38 } },
          hss_cobalt: { speed: { min: 20, opt: 32, max: 45 }, feed_per_rev: { min: 0.10, opt: 0.22, max: 0.38 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["cylinder_heads", "machine_tool_beds", "diesel_blocks", "hydraulic_components"],
      
      microstructure: {
        graphite_form: "Type A flake",
        matrix: "pearlitic",
        graphite_size: "4-5",
        nodularity: null,
        carbides: "trace"
      },

      damping_capacity: {
        relative_to_steel: 8,
        log_decrement: 0.06
      },

      notes: "Higher strength grade for structural applications. Predominantly pearlitic matrix."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-004: Gray Iron Class 35
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-004": {
      id: "K-CI-004",
      name: "Gray Iron Class 35 As-Cast",
      designation: {
        astm: "A48 Class 35",
        sae: "J431 G3500",
        din: "GG-30",
        en: "EN-GJL-300",
        jis: "FC300"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.00, max: 3.30, typical: 3.15 },
        silicon: { min: 1.70, max: 2.10, typical: 1.90 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.15, max: 0.35, typical: 0.25 },
        nickel: { min: 0.10, max: 0.30, typical: 0.20 },
        molybdenum: { min: 0.10, max: 0.25, typical: 0.15 },
        copper: { min: 0.30, max: 0.50, typical: 0.40 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 91.5, max: 93.5, typical: 92.5 }
      },

      physical: {
        density: 7300,
        melting_point: { solidus: 1155, liquidus: 1245 },
        specific_heat: 460,
        thermal_conductivity: 44,
        thermal_expansion: 11.2e-6,
        electrical_resistivity: 55e-8,
        magnetic_permeability: 260,
        poissons_ratio: 0.26,
        elastic_modulus: 130000,
        shear_modulus: 52000
      },

      mechanical: {
        hardness: {
          brinell: 212,
          rockwell_b: 96,
          rockwell_c: null,
          vickers: 223
        },
        tensile_strength: { min: 241, typical: 265, max: 295 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 960, typical: 1050, max: 1120 },
        elongation: { min: 0, typical: 0.5, max: 0.8 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 115,
        fracture_toughness: 18
      },

      kienzle: {
        kc1_1: 990,
        mc: 0.25,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.5
      },

      taylor: {
        C: 220,
        n: 0.25,
        reference_speed: 120,
        reference_life: 15,
        speed_range: { min: 45, max: 190 }
      },

      machinability: {
        aisi_rating: 90,
        relative_to_1212: 0.90,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.90,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 310,
        B: 460,
        n: 0.18,
        C: 0.016,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 120, opt: 160, max: 220 }, feed: { min: 0.12, opt: 0.25, max: 0.40 }, doc: { min: 1.0, opt: 2.5, max: 6.0 } },
          carbide_uncoated: { speed: { min: 90, opt: 125, max: 165 }, feed: { min: 0.12, opt: 0.25, max: 0.40 }, doc: { min: 1.0, opt: 2.5, max: 6.0 } },
          ceramic: { speed: { min: 240, opt: 350, max: 480 }, feed: { min: 0.08, opt: 0.16, max: 0.28 }, doc: { min: 0.5, opt: 1.5, max: 3.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 95, opt: 135, max: 195 }, feed_per_tooth: { min: 0.08, opt: 0.15, max: 0.25 }, doc: { min: 1.0, opt: 2.5, max: 5.0 }, woc_factor: 0.55 }
        },
        drilling: {
          carbide: { speed: { min: 60, opt: 90, max: 130 }, feed_per_rev: { min: 0.08, opt: 0.20, max: 0.35 } },
          hss_cobalt: { speed: { min: 18, opt: 28, max: 42 }, feed_per_rev: { min: 0.08, opt: 0.20, max: 0.35 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["heavy_duty_cylinders", "large_gears", "press_beds", "rolls"],
      
      microstructure: {
        graphite_form: "Type A/B flake",
        matrix: "pearlitic",
        graphite_size: "5-6",
        nodularity: null,
        carbides: "trace"
      },

      damping_capacity: {
        relative_to_steel: 7,
        log_decrement: 0.055
      },

      notes: "High strength gray iron for heavy-duty applications. Alloyed for strength."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-005: Gray Iron Class 40
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-005": {
      id: "K-CI-005",
      name: "Gray Iron Class 40 As-Cast",
      designation: {
        astm: "A48 Class 40",
        sae: "J431 G4000",
        din: "GG-35",
        en: "EN-GJL-350",
        jis: "FC350"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.90, max: 3.20, typical: 3.05 },
        silicon: { min: 1.50, max: 1.90, typical: 1.70 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        phosphorus: { min: 0, max: 0.06, typical: 0.03 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.25, max: 0.45, typical: 0.35 },
        nickel: { min: 0.20, max: 0.50, typical: 0.35 },
        molybdenum: { min: 0.20, max: 0.40, typical: 0.30 },
        copper: { min: 0.40, max: 0.70, typical: 0.55 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0.05, typical: 0.02 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 90.5, max: 92.5, typical: 91.5 }
      },

      physical: {
        density: 7350,
        melting_point: { solidus: 1160, liquidus: 1240 },
        specific_heat: 460,
        thermal_conductivity: 42,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 52e-8,
        magnetic_permeability: 280,
        poissons_ratio: 0.26,
        elastic_modulus: 140000,
        shear_modulus: 56000
      },

      mechanical: {
        hardness: {
          brinell: 235,
          rockwell_c: 21,
          rockwell_b: null,
          vickers: 247
        },
        tensile_strength: { min: 276, typical: 300, max: 340 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1100, typical: 1200, max: 1280 },
        elongation: { min: 0, typical: 0.4, max: 0.6 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 130,
        fracture_toughness: 19
      },

      kienzle: {
        kc1_1: 1060,
        mc: 0.24,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.6
      },

      taylor: {
        C: 200,
        n: 0.24,
        reference_speed: 110,
        reference_life: 15,
        speed_range: { min: 40, max: 170 }
      },

      machinability: {
        aisi_rating: 80,
        relative_to_1212: 0.80,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.95,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 350,
        B: 500,
        n: 0.19,
        C: 0.017,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 110, opt: 145, max: 200 }, feed: { min: 0.10, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.5, max: 5.5 } },
          carbide_uncoated: { speed: { min: 80, opt: 115, max: 150 }, feed: { min: 0.10, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.5, max: 5.5 } },
          ceramic: { speed: { min: 220, opt: 320, max: 450 }, feed: { min: 0.08, opt: 0.15, max: 0.25 }, doc: { min: 0.4, opt: 1.5, max: 3.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 85, opt: 120, max: 175 }, feed_per_tooth: { min: 0.08, opt: 0.14, max: 0.22 }, doc: { min: 0.8, opt: 2.5, max: 5.0 }, woc_factor: 0.55 }
        },
        drilling: {
          carbide: { speed: { min: 55, opt: 85, max: 120 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } },
          hss_cobalt: { speed: { min: 16, opt: 26, max: 38 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 10 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["diesel_engine_blocks", "large_machine_frames", "heavy_gears", "dies"],
      
      microstructure: {
        graphite_form: "Type A/D flake",
        matrix: "pearlitic",
        graphite_size: "5-7",
        nodularity: null,
        carbides: "minor"
      },

      damping_capacity: {
        relative_to_steel: 6,
        log_decrement: 0.05
      },

      notes: "High-strength alloyed gray iron for demanding applications."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-006: Gray Iron Class 45
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-006": {
      id: "K-CI-006",
      name: "Gray Iron Class 45 As-Cast",
      designation: {
        astm: "A48 Class 45",
        sae: "J431 G4500",
        din: "GG-40",
        en: "EN-GJL-400",
        jis: "FC400"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.80, max: 3.10, typical: 2.95 },
        silicon: { min: 1.30, max: 1.70, typical: 1.50 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        phosphorus: { min: 0, max: 0.05, typical: 0.025 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.30, max: 0.55, typical: 0.40 },
        nickel: { min: 0.40, max: 0.70, typical: 0.55 },
        molybdenum: { min: 0.30, max: 0.50, typical: 0.40 },
        copper: { min: 0.50, max: 0.80, typical: 0.65 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0.08, typical: 0.04 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 89.5, max: 91.5, typical: 90.5 }
      },

      physical: {
        density: 7400,
        melting_point: { solidus: 1165, liquidus: 1235 },
        specific_heat: 460,
        thermal_conductivity: 40,
        thermal_expansion: 11.8e-6,
        electrical_resistivity: 50e-8,
        magnetic_permeability: 300,
        poissons_ratio: 0.26,
        elastic_modulus: 150000,
        shear_modulus: 60000
      },

      mechanical: {
        hardness: {
          brinell: 255,
          rockwell_c: 25,
          rockwell_b: null,
          vickers: 268
        },
        tensile_strength: { min: 310, typical: 345, max: 380 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1240, typical: 1350, max: 1440 },
        elongation: { min: 0, typical: 0.3, max: 0.5 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 150,
        fracture_toughness: 19
      },

      kienzle: {
        kc1_1: 1130,
        mc: 0.23,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.7
      },

      taylor: {
        C: 180,
        n: 0.23,
        reference_speed: 100,
        reference_life: 15,
        speed_range: { min: 35, max: 155 }
      },

      machinability: {
        aisi_rating: 70,
        relative_to_1212: 0.70,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 1.00,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 400,
        B: 550,
        n: 0.20,
        C: 0.018,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 100, opt: 130, max: 180 }, feed: { min: 0.10, opt: 0.20, max: 0.35 }, doc: { min: 0.8, opt: 2.0, max: 5.0 } },
          carbide_uncoated: { speed: { min: 75, opt: 100, max: 140 }, feed: { min: 0.10, opt: 0.20, max: 0.35 }, doc: { min: 0.8, opt: 2.0, max: 5.0 } },
          ceramic: { speed: { min: 200, opt: 290, max: 400 }, feed: { min: 0.08, opt: 0.15, max: 0.25 }, doc: { min: 0.3, opt: 1.2, max: 2.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 80, opt: 110, max: 160 }, feed_per_tooth: { min: 0.08, opt: 0.13, max: 0.20 }, doc: { min: 0.8, opt: 2.0, max: 4.5 }, woc_factor: 0.50 }
        },
        drilling: {
          carbide: { speed: { min: 50, opt: 75, max: 110 }, feed_per_rev: { min: 0.08, opt: 0.16, max: 0.28 } },
          hss_cobalt: { speed: { min: 14, opt: 23, max: 35 }, feed_per_rev: { min: 0.08, opt: 0.16, max: 0.28 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["heavy_truck_brake_drums", "large_presses", "mill_housings", "crane_wheels"],
      
      microstructure: {
        graphite_form: "Type D/E flake",
        matrix: "pearlitic",
        graphite_size: "6-7",
        nodularity: null,
        carbides: "5-10%"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.045
      },

      notes: "Very high strength gray iron. Heavily alloyed for maximum strength."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-007: Gray Iron Class 50
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-007": {
      id: "K-CI-007",
      name: "Gray Iron Class 50 As-Cast",
      designation: {
        astm: "A48 Class 50",
        sae: "J431 G5000",
        din: "GG-45",
        en: "EN-GJL-450",
        jis: "FC450"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.70, max: 3.00, typical: 2.85 },
        silicon: { min: 1.20, max: 1.50, typical: 1.35 },
        manganese: { min: 0.80, max: 1.10, typical: 0.95 },
        phosphorus: { min: 0, max: 0.04, typical: 0.02 },
        sulfur: { min: 0.05, max: 0.10, typical: 0.07 },
        chromium: { min: 0.40, max: 0.65, typical: 0.50 },
        nickel: { min: 0.60, max: 1.00, typical: 0.80 },
        molybdenum: { min: 0.40, max: 0.60, typical: 0.50 },
        copper: { min: 0.60, max: 1.00, typical: 0.80 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0.05, max: 0.12, typical: 0.08 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 88.0, max: 90.5, typical: 89.2 }
      },

      physical: {
        density: 7450,
        melting_point: { solidus: 1170, liquidus: 1230 },
        specific_heat: 460,
        thermal_conductivity: 38,
        thermal_expansion: 12.0e-6,
        electrical_resistivity: 48e-8,
        magnetic_permeability: 320,
        poissons_ratio: 0.26,
        elastic_modulus: 155000,
        shear_modulus: 62000
      },

      mechanical: {
        hardness: {
          brinell: 275,
          rockwell_c: 28,
          rockwell_b: null,
          vickers: 289
        },
        tensile_strength: { min: 345, typical: 380, max: 420 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1380, typical: 1500, max: 1600 },
        elongation: { min: 0, typical: 0.2, max: 0.4 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 165,
        fracture_toughness: 18
      },

      kienzle: {
        kc1_1: 1200,
        mc: 0.22,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.8
      },

      taylor: {
        C: 160,
        n: 0.22,
        reference_speed: 90,
        reference_life: 15,
        speed_range: { min: 30, max: 140 }
      },

      machinability: {
        aisi_rating: 60,
        relative_to_1212: 0.60,
        chip_form: "discontinuous",
        surface_finish_achievable: 2.0,
        cutting_force_factor: 1.05,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 450,
        B: 600,
        n: 0.21,
        C: 0.018,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 90, opt: 120, max: 165 }, feed: { min: 0.10, opt: 0.18, max: 0.32 }, doc: { min: 0.6, opt: 1.8, max: 4.5 } },
          carbide_uncoated: { speed: { min: 65, opt: 90, max: 125 }, feed: { min: 0.10, opt: 0.18, max: 0.32 }, doc: { min: 0.6, opt: 1.8, max: 4.5 } },
          ceramic: { speed: { min: 180, opt: 260, max: 360 }, feed: { min: 0.06, opt: 0.12, max: 0.22 }, doc: { min: 0.3, opt: 1.0, max: 2.2 } }
        },
        milling: {
          carbide_coated: { speed: { min: 70, opt: 100, max: 145 }, feed_per_tooth: { min: 0.06, opt: 0.12, max: 0.18 }, doc: { min: 0.6, opt: 1.8, max: 4.0 }, woc_factor: 0.50 }
        },
        drilling: {
          carbide: { speed: { min: 45, opt: 70, max: 100 }, feed_per_rev: { min: 0.06, opt: 0.14, max: 0.25 } },
          hss_cobalt: { speed: { min: 12, opt: 20, max: 32 }, feed_per_rev: { min: 0.06, opt: 0.14, max: 0.25 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 2.0, Rz: 12 }
      },

      coolant: {
        requirement: "flood_recommended",
        recommended_type: "soluble_oil",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["very_large_gears", "rolling_mill_housings", "heavy_press_components"],
      
      microstructure: {
        graphite_form: "Type D/E flake",
        matrix: "pearlitic",
        graphite_size: "7-8",
        nodularity: null,
        carbides: "10-15%"
      },

      damping_capacity: {
        relative_to_steel: 4,
        log_decrement: 0.04
      },

      notes: "Highest strength standard gray iron. Contains significant carbides."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-008: Gray Iron Class 60 (Maximum Strength)
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-008": {
      id: "K-CI-008",
      name: "Gray Iron Class 60 As-Cast",
      designation: {
        astm: "A48 Class 60",
        sae: "J431 G6000",
        din: "GG-50",
        en: "EN-GJL-500",
        jis: "FC500"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.50, max: 2.85, typical: 2.70 },
        silicon: { min: 1.00, max: 1.40, typical: 1.20 },
        manganese: { min: 0.80, max: 1.20, typical: 1.00 },
        phosphorus: { min: 0, max: 0.03, typical: 0.015 },
        sulfur: { min: 0.04, max: 0.09, typical: 0.065 },
        chromium: { min: 0.50, max: 0.80, typical: 0.65 },
        nickel: { min: 0.80, max: 1.30, typical: 1.05 },
        molybdenum: { min: 0.50, max: 0.80, typical: 0.65 },
        copper: { min: 0.70, max: 1.20, typical: 0.95 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0.08, max: 0.15, typical: 0.11 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 86.5, max: 89.0, typical: 87.8 }
      },

      physical: {
        density: 7500,
        melting_point: { solidus: 1175, liquidus: 1225 },
        specific_heat: 460,
        thermal_conductivity: 35,
        thermal_expansion: 12.2e-6,
        electrical_resistivity: 45e-8,
        magnetic_permeability: 340,
        poissons_ratio: 0.26,
        elastic_modulus: 165000,
        shear_modulus: 66000
      },

      mechanical: {
        hardness: {
          brinell: 300,
          rockwell_c: 32,
          rockwell_b: null,
          vickers: 315
        },
        tensile_strength: { min: 414, typical: 450, max: 500 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1650, typical: 1800, max: 1920 },
        elongation: { min: 0, typical: 0.1, max: 0.3 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 4, temperature: 20 },
        fatigue_strength: 195,
        fracture_toughness: 17
      },

      kienzle: {
        kc1_1: 1300,
        mc: 0.21,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.9
      },

      taylor: {
        C: 140,
        n: 0.21,
        reference_speed: 80,
        reference_life: 15,
        speed_range: { min: 25, max: 125 }
      },

      machinability: {
        aisi_rating: 50,
        relative_to_1212: 0.50,
        chip_form: "discontinuous",
        surface_finish_achievable: 2.5,
        cutting_force_factor: 1.15,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_crater"
      },

      johnson_cook: {
        A: 520,
        B: 680,
        n: 0.22,
        C: 0.019,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 80, opt: 105, max: 145 }, feed: { min: 0.08, opt: 0.16, max: 0.28 }, doc: { min: 0.5, opt: 1.5, max: 4.0 } },
          carbide_uncoated: { speed: { min: 55, opt: 80, max: 110 }, feed: { min: 0.08, opt: 0.16, max: 0.28 }, doc: { min: 0.5, opt: 1.5, max: 4.0 } },
          ceramic: { speed: { min: 160, opt: 230, max: 320 }, feed: { min: 0.05, opt: 0.10, max: 0.18 }, doc: { min: 0.2, opt: 0.8, max: 2.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 60, opt: 90, max: 130 }, feed_per_tooth: { min: 0.05, opt: 0.10, max: 0.16 }, doc: { min: 0.5, opt: 1.5, max: 3.5 }, woc_factor: 0.45 }
        },
        drilling: {
          carbide: { speed: { min: 40, opt: 60, max: 90 }, feed_per_rev: { min: 0.05, opt: 0.12, max: 0.22 } },
          hss_cobalt: { speed: { min: 10, opt: 18, max: 28 }, feed_per_rev: { min: 0.05, opt: 0.12, max: 0.22 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "low",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 2.5, Rz: 14 }
      },

      coolant: {
        requirement: "flood_recommended",
        recommended_type: "soluble_oil",
        mql_suitable: false,
        cryogenic_benefit: "slight"
      },

      applications: ["extreme_duty_gears", "special_dies", "heavy_rolls"],
      
      microstructure: {
        graphite_form: "Type D/E flake",
        matrix: "pearlitic-bainitic",
        graphite_size: "7-8",
        nodularity: null,
        carbides: "15-20%"
      },

      damping_capacity: {
        relative_to_steel: 3,
        log_decrement: 0.035
      },

      notes: "Maximum strength gray iron. Significant carbide content affects machinability. Use rigid setup."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-009: High-Phosphorus Gray Iron (Damping Grade)
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-009": {
      id: "K-CI-009",
      name: "High-Phosphorus Gray Iron As-Cast",
      designation: {
        astm: "A48 Class 25 Modified",
        sae: "J431",
        din: "GG-P",
        en: "EN-GJL-HB155",
        jis: "FCP"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron - Damping Grade",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.20, max: 3.50, typical: 3.35 },
        silicon: { min: 2.20, max: 2.60, typical: 2.40 },
        manganese: { min: 0.50, max: 0.80, typical: 0.65 },
        phosphorus: { min: 0.30, max: 0.60, typical: 0.45 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        nickel: { min: 0, max: 0.10, typical: 0.05 },
        molybdenum: { min: 0, max: 0.05, typical: 0.02 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 91.5, max: 93.5, typical: 92.5 }
      },

      physical: {
        density: 7150,
        melting_point: { solidus: 1120, liquidus: 1240 },
        specific_heat: 460,
        thermal_conductivity: 50,
        thermal_expansion: 10.5e-6,
        electrical_resistivity: 70e-8,
        magnetic_permeability: 200,
        poissons_ratio: 0.26,
        elastic_modulus: 95000,
        shear_modulus: 38000
      },

      mechanical: {
        hardness: {
          brinell: 155,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 163
        },
        tensile_strength: { min: 170, typical: 190, max: 220 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 680, typical: 760, max: 820 },
        elongation: { min: 0, typical: 0.5, max: 1.0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 3, temperature: 20 },
        fatigue_strength: 80,
        fracture_toughness: 14
      },

      kienzle: {
        kc1_1: 820,
        mc: 0.28,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.2
      },

      taylor: {
        C: 270,
        n: 0.28,
        reference_speed: 150,
        reference_life: 15,
        speed_range: { min: 60, max: 240 }
      },

      machinability: {
        aisi_rating: 130,
        relative_to_1212: 1.30,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.4,
        cutting_force_factor: 0.72,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "even_flank"
      },

      johnson_cook: {
        A: 225,
        B: 370,
        n: 0.15,
        C: 0.015,
        m: 0.85,
        T_melt: 1180,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 160, opt: 220, max: 300 }, feed: { min: 0.15, opt: 0.32, max: 0.55 }, doc: { min: 1.0, opt: 3.5, max: 9.0 } },
          carbide_uncoated: { speed: { min: 130, opt: 175, max: 240 }, feed: { min: 0.15, opt: 0.32, max: 0.55 }, doc: { min: 1.0, opt: 3.5, max: 9.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 130, opt: 190, max: 270 }, feed_per_tooth: { min: 0.12, opt: 0.20, max: 0.35 }, doc: { min: 1.0, opt: 3.5, max: 7.0 }, woc_factor: 0.65 }
        },
        drilling: {
          carbide: { speed: { min: 90, opt: 130, max: 180 }, feed_per_rev: { min: 0.12, opt: 0.28, max: 0.45 } },
          hss_cobalt: { speed: { min: 28, opt: 45, max: 60 }, feed_per_rev: { min: 0.12, opt: 0.28, max: 0.45 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.4, Rz: 7 }
      },

      coolant: {
        requirement: "dry_preferred",
        recommended_type: "air_blast",
        mql_suitable: true,
        cryogenic_benefit: "none"
      },

      applications: ["machine_bases", "precision_equipment_frames", "vibration_damping_structures"],
      
      microstructure: {
        graphite_form: "Type A flake",
        matrix: "ferritic-pearlitic",
        graphite_size: "4-5",
        nodularity: null,
        carbides: "none",
        steadite: "yes - phosphide eutectic"
      },

      damping_capacity: {
        relative_to_steel: 15,
        log_decrement: 0.12,
        notes: "EXCEPTIONAL damping - phosphorus creates steadite phase"
      },

      notes: "Exceptional vibration damping due to phosphide eutectic (steadite). Best for machine tool bases."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-010: Meehanite Grade GB
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-010": {
      id: "K-CI-010",
      name: "Meehanite Grade GB As-Cast",
      designation: {
        astm: "A48 Modified",
        sae: "Meehanite GB",
        din: "Meehanite GB",
        en: "Meehanite GB",
        jis: ""
      },
      iso_group: "K",
      material_class: "Gray Cast Iron - Engineered",
      condition: "As-Cast",

      composition: {
        carbon: { min: 3.00, max: 3.30, typical: 3.15 },
        silicon: { min: 1.80, max: 2.20, typical: 2.00 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        phosphorus: { min: 0, max: 0.08, typical: 0.04 },
        sulfur: { min: 0.05, max: 0.10, typical: 0.07 },
        chromium: { min: 0.15, max: 0.30, typical: 0.22 },
        nickel: { min: 0.15, max: 0.30, typical: 0.22 },
        molybdenum: { min: 0.15, max: 0.30, typical: 0.22 },
        copper: { min: 0.30, max: 0.50, typical: 0.40 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0.03, typical: 0.01 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 91.0, max: 93.5, typical: 92.2 }
      },

      physical: {
        density: 7280,
        melting_point: { solidus: 1155, liquidus: 1245 },
        specific_heat: 460,
        thermal_conductivity: 44,
        thermal_expansion: 11.2e-6,
        electrical_resistivity: 55e-8,
        magnetic_permeability: 260,
        poissons_ratio: 0.26,
        elastic_modulus: 125000,
        shear_modulus: 50000
      },

      mechanical: {
        hardness: {
          brinell: 207,
          rockwell_b: 95,
          rockwell_c: null,
          vickers: 217
        },
        tensile_strength: { min: 240, typical: 270, max: 300 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 960, typical: 1080, max: 1150 },
        elongation: { min: 0, typical: 0.5, max: 0.8 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 120,
        fracture_toughness: 18
      },

      kienzle: {
        kc1_1: 960,
        mc: 0.25,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.4
      },

      taylor: {
        C: 230,
        n: 0.25,
        reference_speed: 125,
        reference_life: 15,
        speed_range: { min: 50, max: 200 }
      },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.6,
        cutting_force_factor: 0.88,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 315,
        B: 465,
        n: 0.18,
        C: 0.016,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 125, opt: 165, max: 225 }, feed: { min: 0.12, opt: 0.25, max: 0.42 }, doc: { min: 1.0, opt: 2.8, max: 6.5 } },
          carbide_uncoated: { speed: { min: 95, opt: 130, max: 175 }, feed: { min: 0.12, opt: 0.25, max: 0.42 }, doc: { min: 1.0, opt: 2.8, max: 6.5 } },
          ceramic: { speed: { min: 250, opt: 360, max: 500 }, feed: { min: 0.08, opt: 0.16, max: 0.28 }, doc: { min: 0.5, opt: 1.8, max: 3.8 } }
        },
        milling: {
          carbide_coated: { speed: { min: 95, opt: 140, max: 200 }, feed_per_tooth: { min: 0.08, opt: 0.16, max: 0.26 }, doc: { min: 1.0, opt: 2.8, max: 5.5 }, woc_factor: 0.58 }
        },
        drilling: {
          carbide: { speed: { min: 62, opt: 95, max: 135 }, feed_per_rev: { min: 0.08, opt: 0.20, max: 0.36 } },
          hss_cobalt: { speed: { min: 19, opt: 30, max: 44 }, feed_per_rev: { min: 0.08, opt: 0.20, max: 0.36 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.6, Rz: 8 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["precision_machine_components", "hydraulic_cylinders", "heavy_duty_housings"],
      
      microstructure: {
        graphite_form: "Type A flake - controlled",
        matrix: "pearlitic",
        graphite_size: "4-5 uniform",
        nodularity: null,
        carbides: "trace"
      },

      damping_capacity: {
        relative_to_steel: 7,
        log_decrement: 0.055
      },

      notes: "Meehanite process produces uniform fine graphite structure. Predictable properties."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-011: Meehanite Grade GD (Higher Strength)
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-011": {
      id: "K-CI-011",
      name: "Meehanite Grade GD As-Cast",
      designation: {
        astm: "A48 Modified",
        sae: "Meehanite GD",
        din: "Meehanite GD",
        en: "Meehanite GD",
        jis: ""
      },
      iso_group: "K",
      material_class: "Gray Cast Iron - Engineered",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.90, max: 3.20, typical: 3.05 },
        silicon: { min: 1.60, max: 2.00, typical: 1.80 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        phosphorus: { min: 0, max: 0.06, typical: 0.03 },
        sulfur: { min: 0.05, max: 0.10, typical: 0.07 },
        chromium: { min: 0.25, max: 0.45, typical: 0.35 },
        nickel: { min: 0.25, max: 0.45, typical: 0.35 },
        molybdenum: { min: 0.25, max: 0.45, typical: 0.35 },
        copper: { min: 0.40, max: 0.60, typical: 0.50 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0.02, max: 0.06, typical: 0.04 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 90.0, max: 92.5, typical: 91.2 }
      },

      physical: {
        density: 7350,
        melting_point: { solidus: 1160, liquidus: 1240 },
        specific_heat: 460,
        thermal_conductivity: 42,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 52e-8,
        magnetic_permeability: 280,
        poissons_ratio: 0.26,
        elastic_modulus: 140000,
        shear_modulus: 56000
      },

      mechanical: {
        hardness: {
          brinell: 241,
          rockwell_c: 22,
          rockwell_b: null,
          vickers: 253
        },
        tensile_strength: { min: 300, typical: 335, max: 370 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1200, typical: 1340, max: 1420 },
        elongation: { min: 0, typical: 0.4, max: 0.6 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 6, temperature: 20 },
        fatigue_strength: 145,
        fracture_toughness: 19
      },

      kienzle: {
        kc1_1: 1080,
        mc: 0.24,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.6
      },

      taylor: {
        C: 195,
        n: 0.24,
        reference_speed: 110,
        reference_life: 15,
        speed_range: { min: 40, max: 175 }
      },

      machinability: {
        aisi_rating: 78,
        relative_to_1212: 0.78,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.8,
        cutting_force_factor: 0.96,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 390,
        B: 530,
        n: 0.19,
        C: 0.017,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 108, opt: 145, max: 200 }, feed: { min: 0.10, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.5, max: 5.5 } },
          carbide_uncoated: { speed: { min: 80, opt: 112, max: 155 }, feed: { min: 0.10, opt: 0.22, max: 0.38 }, doc: { min: 0.8, opt: 2.5, max: 5.5 } },
          ceramic: { speed: { min: 215, opt: 320, max: 440 }, feed: { min: 0.08, opt: 0.15, max: 0.25 }, doc: { min: 0.4, opt: 1.5, max: 3.2 } }
        },
        milling: {
          carbide_coated: { speed: { min: 85, opt: 122, max: 175 }, feed_per_tooth: { min: 0.08, opt: 0.14, max: 0.22 }, doc: { min: 0.8, opt: 2.5, max: 5.0 }, woc_factor: 0.54 }
        },
        drilling: {
          carbide: { speed: { min: 54, opt: 85, max: 120 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } },
          hss_cobalt: { speed: { min: 16, opt: 26, max: 38 }, feed_per_rev: { min: 0.08, opt: 0.18, max: 0.32 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.8, Rz: 10 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["heavy_duty_gears", "press_components", "machine_frames"],
      
      microstructure: {
        graphite_form: "Type A flake - controlled fine",
        matrix: "pearlitic",
        graphite_size: "5-6 uniform",
        nodularity: null,
        carbides: "trace"
      },

      damping_capacity: {
        relative_to_steel: 6,
        log_decrement: 0.05
      },

      notes: "Higher strength Meehanite grade. Excellent combination of strength and machinability."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-012: Gray Iron - Heat Treated (Stress Relieved)
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-012": {
      id: "K-CI-012",
      name: "Gray Iron Class 30 Stress Relieved",
      designation: {
        astm: "A48 Class 30 SR",
        sae: "J431 G3000 SR",
        din: "GG-25 SR",
        en: "EN-GJL-250 SR",
        jis: "FC250 SR"
      },
      iso_group: "K",
      material_class: "Gray Cast Iron",
      condition: "Stress Relieved",

      composition: {
        carbon: { min: 3.10, max: 3.40, typical: 3.25 },
        silicon: { min: 1.90, max: 2.30, typical: 2.10 },
        manganese: { min: 0.60, max: 0.90, typical: 0.75 },
        phosphorus: { min: 0, max: 0.10, typical: 0.05 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.10, max: 0.25, typical: 0.15 },
        nickel: { min: 0, max: 0.20, typical: 0.10 },
        molybdenum: { min: 0, max: 0.10, typical: 0.05 },
        copper: { min: 0.20, max: 0.40, typical: 0.30 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0, typical: 0 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 92.0, max: 94.0, typical: 93.0 }
      },

      physical: {
        density: 7250,
        melting_point: { solidus: 1150, liquidus: 1250 },
        specific_heat: 460,
        thermal_conductivity: 46,
        thermal_expansion: 11.0e-6,
        electrical_resistivity: 58e-8,
        magnetic_permeability: 240,
        poissons_ratio: 0.26,
        elastic_modulus: 120000,
        shear_modulus: 48000
      },

      mechanical: {
        hardness: {
          brinell: 190,
          rockwell_b: 90,
          rockwell_c: null,
          vickers: 200
        },
        tensile_strength: { min: 207, typical: 225, max: 255 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 830, typical: 890, max: 940 },
        elongation: { min: 0, typical: 0.5, max: 1.0 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 98,
        fracture_toughness: 17
      },

      kienzle: {
        kc1_1: 900,
        mc: 0.26,
        kc_adjust_rake: -1.5,
        kc_adjust_speed: -0.10,
        chip_compression: 2.4
      },

      taylor: {
        C: 245,
        n: 0.26,
        reference_speed: 135,
        reference_life: 15,
        speed_range: { min: 52, max: 215 }
      },

      machinability: {
        aisi_rating: 105,
        relative_to_1212: 1.05,
        chip_form: "discontinuous",
        surface_finish_achievable: 1.4,
        cutting_force_factor: 0.83,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "abrasive_flank"
      },

      johnson_cook: {
        A: 265,
        B: 415,
        n: 0.17,
        C: 0.016,
        m: 0.85,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 135, opt: 180, max: 250 }, feed: { min: 0.15, opt: 0.28, max: 0.48 }, doc: { min: 1.0, opt: 3.0, max: 7.5 } },
          carbide_uncoated: { speed: { min: 105, opt: 145, max: 190 }, feed: { min: 0.15, opt: 0.28, max: 0.48 }, doc: { min: 1.0, opt: 3.0, max: 7.5 } },
          ceramic: { speed: { min: 270, opt: 400, max: 540 }, feed: { min: 0.10, opt: 0.18, max: 0.32 }, doc: { min: 0.5, opt: 2.0, max: 4.2 } }
        },
        milling: {
          carbide_coated: { speed: { min: 105, opt: 152, max: 220 }, feed_per_tooth: { min: 0.10, opt: 0.18, max: 0.30 }, doc: { min: 1.0, opt: 3.0, max: 6.2 }, woc_factor: 0.60 }
        },
        drilling: {
          carbide: { speed: { min: 68, opt: 105, max: 145 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.40 } },
          hss_cobalt: { speed: { min: 21, opt: 34, max: 48 }, feed_per_rev: { min: 0.10, opt: 0.24, max: 0.40 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "neutral",
        white_layer_risk: "none",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 1.4, Rz: 7 }
      },

      coolant: {
        requirement: "dry_or_flood",
        recommended_type: "dry_preferred",
        mql_suitable: true,
        cryogenic_benefit: "minimal"
      },

      applications: ["precision_machine_bases", "measuring_equipment", "precision_fixtures"],
      
      microstructure: {
        graphite_form: "Type A flake",
        matrix: "pearlitic - stress relieved",
        graphite_size: "4-5",
        nodularity: null,
        carbides: "trace"
      },

      heat_treatment: {
        process: "Stress Relief",
        temperature: 565,
        time_hours: 2,
        cooling: "furnace_cool",
        purpose: "Eliminate casting stresses for dimensional stability"
      },

      damping_capacity: {
        relative_to_steel: 8,
        log_decrement: 0.06
      },

      notes: "Stress relieved for dimensional stability. Essential for precision applications."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-013: Gray Iron - Flame Hardened Surface
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-013": {
      id: "K-CI-013",
      name: "Gray Iron Class 40 Flame Hardened",
      designation: {
        astm: "A48 Class 40 FH",
        sae: "J431 G4000 FH",
        din: "GG-35 FH",
        en: "EN-GJL-350 FH",
        jis: "FC350 FH"
      },
      iso_group: "H",
      material_class: "Gray Cast Iron - Surface Hardened",
      condition: "Flame Hardened",

      composition: {
        carbon: { min: 2.90, max: 3.20, typical: 3.05 },
        silicon: { min: 1.50, max: 1.90, typical: 1.70 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        phosphorus: { min: 0, max: 0.06, typical: 0.03 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.25, max: 0.45, typical: 0.35 },
        nickel: { min: 0.20, max: 0.50, typical: 0.35 },
        molybdenum: { min: 0.20, max: 0.40, typical: 0.30 },
        copper: { min: 0.40, max: 0.70, typical: 0.55 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0.05, typical: 0.02 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 90.5, max: 92.5, typical: 91.5 }
      },

      physical: {
        density: 7350,
        melting_point: { solidus: 1160, liquidus: 1240 },
        specific_heat: 460,
        thermal_conductivity: 42,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 52e-8,
        magnetic_permeability: 280,
        poissons_ratio: 0.26,
        elastic_modulus: 140000,
        shear_modulus: 56000
      },

      mechanical: {
        hardness: {
          brinell: 550,
          rockwell_c: 55,
          rockwell_b: null,
          vickers: 578,
          surface_note: "Surface hardness - core 235 HB"
        },
        tensile_strength: { min: 276, typical: 300, max: 340 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1100, typical: 1200, max: 1280 },
        elongation: { min: 0, typical: 0.4, max: 0.6 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 180,
        fracture_toughness: 18
      },

      kienzle: {
        kc1_1: 1550,
        mc: 0.22,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.12,
        chip_compression: 3.2,
        note: "Values for hardened surface - core is lower"
      },

      taylor: {
        C: 85,
        n: 0.20,
        reference_speed: 50,
        reference_life: 15,
        speed_range: { min: 15, max: 80 }
      },

      machinability: {
        aisi_rating: 25,
        relative_to_1212: 0.25,
        chip_form: "powder/discontinuous",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 1.45,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "crater_abrasive",
        notes: "REQUIRES CBN OR CERAMIC TOOLING"
      },

      johnson_cook: {
        A: 750,
        B: 850,
        n: 0.15,
        C: 0.012,
        m: 0.70,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          cbn: { speed: { min: 80, opt: 120, max: 180 }, feed: { min: 0.05, opt: 0.10, max: 0.18 }, doc: { min: 0.1, opt: 0.3, max: 0.8 } },
          ceramic: { speed: { min: 60, opt: 90, max: 140 }, feed: { min: 0.05, opt: 0.10, max: 0.18 }, doc: { min: 0.1, opt: 0.3, max: 0.8 } }
        },
        milling: {
          cbn: { speed: { min: 60, opt: 100, max: 150 }, feed_per_tooth: { min: 0.03, opt: 0.06, max: 0.12 }, doc: { min: 0.1, opt: 0.25, max: 0.6 }, woc_factor: 0.35 }
        },
        grinding: {
          wheel_type: "CBN or SiC",
          speed: 25,
          feed_rate: 0.01,
          notes: "Preferred method for hardened surface"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "medium",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.6, Rz: 4 },
        hardened_case_depth: { min: 1.5, typical: 3.0, max: 6.0 }
      },

      coolant: {
        requirement: "flood_required",
        recommended_type: "synthetic_oil",
        mql_suitable: false,
        cryogenic_benefit: "moderate"
      },

      applications: ["cam_shafts", "cylinder_liners", "wear_surfaces", "gears"],
      
      microstructure: {
        graphite_form: "Type A/D flake",
        matrix: "martensite (surface), pearlite (core)",
        graphite_size: "5-7",
        nodularity: null,
        carbides: "minor"
      },

      heat_treatment: {
        process: "Flame Hardening",
        surface_temperature: 870,
        quench: "water_spray",
        case_depth_mm: 3,
        temper_temperature: 175,
        purpose: "Wear-resistant surface with tough core"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.04
      },

      notes: "Surface hardened for wear resistance. Machine before hardening when possible. Use CBN/ceramic for finished surfaces."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-014: Gray Iron - Induction Hardened
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-014": {
      id: "K-CI-014",
      name: "Gray Iron Class 40 Induction Hardened",
      designation: {
        astm: "A48 Class 40 IH",
        sae: "J431 G4000 IH",
        din: "GG-35 IH",
        en: "EN-GJL-350 IH",
        jis: "FC350 IH"
      },
      iso_group: "H",
      material_class: "Gray Cast Iron - Surface Hardened",
      condition: "Induction Hardened",

      composition: {
        carbon: { min: 2.90, max: 3.20, typical: 3.05 },
        silicon: { min: 1.50, max: 1.90, typical: 1.70 },
        manganese: { min: 0.70, max: 1.00, typical: 0.85 },
        phosphorus: { min: 0, max: 0.06, typical: 0.03 },
        sulfur: { min: 0.05, max: 0.12, typical: 0.08 },
        chromium: { min: 0.25, max: 0.45, typical: 0.35 },
        nickel: { min: 0.20, max: 0.50, typical: 0.35 },
        molybdenum: { min: 0.20, max: 0.40, typical: 0.30 },
        copper: { min: 0.40, max: 0.70, typical: 0.55 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        vanadium: { min: 0, max: 0.05, typical: 0.02 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.01, typical: 0.005 },
        nitrogen: { min: 0, max: 0.01, typical: 0.005 },
        iron: { min: 90.5, max: 92.5, typical: 91.5 }
      },

      physical: {
        density: 7350,
        melting_point: { solidus: 1160, liquidus: 1240 },
        specific_heat: 460,
        thermal_conductivity: 42,
        thermal_expansion: 11.5e-6,
        electrical_resistivity: 52e-8,
        magnetic_permeability: 280,
        poissons_ratio: 0.26,
        elastic_modulus: 140000,
        shear_modulus: 56000
      },

      mechanical: {
        hardness: {
          brinell: 580,
          rockwell_c: 57,
          rockwell_b: null,
          vickers: 610,
          surface_note: "Surface hardness - core 235 HB"
        },
        tensile_strength: { min: 276, typical: 300, max: 340 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1100, typical: 1200, max: 1280 },
        elongation: { min: 0, typical: 0.4, max: 0.6 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 5, temperature: 20 },
        fatigue_strength: 190,
        fracture_toughness: 18
      },

      kienzle: {
        kc1_1: 1620,
        mc: 0.21,
        kc_adjust_rake: -2.0,
        kc_adjust_speed: -0.12,
        chip_compression: 3.3,
        note: "Values for hardened surface"
      },

      taylor: {
        C: 75,
        n: 0.19,
        reference_speed: 45,
        reference_life: 15,
        speed_range: { min: 12, max: 75 }
      },

      machinability: {
        aisi_rating: 22,
        relative_to_1212: 0.22,
        chip_form: "powder/discontinuous",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 1.50,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "crater_abrasive",
        notes: "CBN REQUIRED. Grinding preferred."
      },

      johnson_cook: {
        A: 780,
        B: 880,
        n: 0.14,
        C: 0.012,
        m: 0.70,
        T_melt: 1200,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          cbn: { speed: { min: 75, opt: 110, max: 160 }, feed: { min: 0.04, opt: 0.08, max: 0.15 }, doc: { min: 0.1, opt: 0.25, max: 0.6 } }
        },
        grinding: {
          wheel_type: "CBN",
          speed: 30,
          feed_rate: 0.008,
          notes: "Preferred finishing method"
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

      applications: ["precision_cam_lobes", "cylinder_bores", "precision_gears"],
      
      microstructure: {
        graphite_form: "Type A/D flake",
        matrix: "martensite (surface), pearlite (core)",
        graphite_size: "5-7",
        nodularity: null,
        carbides: "minor"
      },

      heat_treatment: {
        process: "Induction Hardening",
        frequency_khz: 10,
        surface_temperature: 880,
        quench: "polymer_quench",
        case_depth_mm: 4,
        temper_temperature: 175,
        purpose: "Precise localized hardening with controlled depth"
      },

      damping_capacity: {
        relative_to_steel: 5,
        log_decrement: 0.04
      },

      notes: "Induction hardening provides precise, controlled case depth. Superior to flame hardening for precision parts."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // K-CI-015: Gray Iron - High Chromium Wear Resistant
    // ═══════════════════════════════════════════════════════════════════════════
    "K-CI-015": {
      id: "K-CI-015",
      name: "Gray Iron High-Chrome Wear Resistant As-Cast",
      designation: {
        astm: "A532 Class II Type D",
        sae: "",
        din: "GX300CrMo27-2",
        en: "EN-GJN-HV600",
        jis: ""
      },
      iso_group: "H",
      material_class: "Gray Cast Iron - High Chrome",
      condition: "As-Cast",

      composition: {
        carbon: { min: 2.40, max: 2.80, typical: 2.60 },
        silicon: { min: 0.50, max: 1.00, typical: 0.75 },
        manganese: { min: 0.50, max: 1.00, typical: 0.75 },
        phosphorus: { min: 0, max: 0.04, typical: 0.02 },
        sulfur: { min: 0, max: 0.04, typical: 0.02 },
        chromium: { min: 25.0, max: 30.0, typical: 27.5 },
        nickel: { min: 0, max: 0.50, typical: 0.25 },
        molybdenum: { min: 1.50, max: 2.50, typical: 2.00 },
        copper: { min: 0, max: 0.50, typical: 0.25 },
        titanium: { min: 0, max: 0.05, typical: 0.02 },
        vanadium: { min: 0, max: 0.10, typical: 0.05 },
        tungsten: { min: 0, max: 0, typical: 0 },
        cobalt: { min: 0, max: 0, typical: 0 },
        aluminum: { min: 0, max: 0.02, typical: 0.01 },
        nitrogen: { min: 0, max: 0.02, typical: 0.01 },
        iron: { min: 62.0, max: 68.0, typical: 65.0 }
      },

      physical: {
        density: 7600,
        melting_point: { solidus: 1230, liquidus: 1350 },
        specific_heat: 450,
        thermal_conductivity: 18,
        thermal_expansion: 10.5e-6,
        electrical_resistivity: 95e-8,
        magnetic_permeability: 1.1,
        poissons_ratio: 0.27,
        elastic_modulus: 190000,
        shear_modulus: 76000
      },

      mechanical: {
        hardness: {
          brinell: 600,
          rockwell_c: 58,
          rockwell_b: null,
          vickers: 630
        },
        tensile_strength: { min: 450, typical: 520, max: 580 },
        yield_strength: { min: null, typical: null, max: null },
        compressive_strength: { min: 1800, typical: 2000, max: 2200 },
        elongation: { min: 0, typical: 0, max: 0.5 },
        reduction_of_area: { min: 0, typical: 0, max: 0 },
        impact_energy: { joules: 2, temperature: 20 },
        fatigue_strength: 210,
        fracture_toughness: 12
      },

      kienzle: {
        kc1_1: 2100,
        mc: 0.18,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.15,
        chip_compression: 3.8
      },

      taylor: {
        C: 40,
        n: 0.15,
        reference_speed: 25,
        reference_life: 15,
        speed_range: { min: 8, max: 45 }
      },

      machinability: {
        aisi_rating: 12,
        relative_to_1212: 0.12,
        chip_form: "powder",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 1.90,
        built_up_edge_tendency: "none",
        tool_wear_pattern: "severe_abrasive",
        notes: "EXTREMELY DIFFICULT. CBN/PCBN only. Grinding preferred."
      },

      johnson_cook: {
        A: 950,
        B: 1100,
        n: 0.12,
        C: 0.008,
        m: 0.65,
        T_melt: 1290,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          pcbn: { speed: { min: 40, opt: 60, max: 90 }, feed: { min: 0.03, opt: 0.06, max: 0.12 }, doc: { min: 0.05, opt: 0.15, max: 0.4 } }
        },
        grinding: {
          wheel_type: "Diamond or CBN",
          speed: 20,
          feed_rate: 0.005,
          notes: "Grinding is the preferred method"
        }
      },

      surface_integrity: {
        residual_stress_tendency: "neutral",
        white_layer_risk: "high",
        work_hardening_depth: 0,
        surface_roughness_typical: { Ra: 0.6, Rz: 4 }
      },

      coolant: {
        requirement: "flood_essential",
        recommended_type: "synthetic_heavy_duty",
        mql_suitable: false,
        cryogenic_benefit: "significant"
      },

      applications: ["slurry_pumps", "mining_equipment", "crushers", "shot_blast_equipment"],
      
      microstructure: {
        graphite_form: "none - white iron",
        matrix: "austenite + massive M7C3 carbides",
        graphite_size: null,
        nodularity: null,
        carbides: "30-40% massive M7C3 chromium carbides"
      },

      wear_resistance: {
        abrasion_factor: 15,
        relative_to_mild_steel: 15,
        notes: "EXCEPTIONAL abrasion resistance"
      },

      damping_capacity: {
        relative_to_steel: 1,
        log_decrement: 0.01,
        notes: "Poor damping - essentially white iron"
      },

      notes: "High-chrome white iron for severe abrasion. 30-40% hard carbides. Extremely difficult to machine - use grinding."
    }
  }
};

if (typeof module !== "undefined" && 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: K_CAST_IRON | Materials: 15 | Sections added: 5
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
// Category: K_CAST_IRON | Materials: 15 | Sections added: 5
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

module.exports = GRAY_CAST_IRONS_001_015;
}
