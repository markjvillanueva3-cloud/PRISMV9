/**
 * PRISM MATERIALS DATABASE - Aluminum Alloys (Wrought)
 * File: aluminum_wrought_011_050.js
 * Materials: N-AL-011 through N-AL-050
 * 
 * ISO Category: N (Nonferrous)
 * Sub-category: Aluminum - Wrought Alloys
 * 
 * ALLOY SERIES COVERAGE:
 * - 1xxx: Pure aluminum (>99% Al)
 * - 2xxx: Al-Cu (heat treatable, aerospace)
 * - 3xxx: Al-Mn (non-heat treatable)
 * - 5xxx: Al-Mg (non-heat treatable, marine)
 * - 6xxx: Al-Mg-Si (heat treatable, structural)
 * - 7xxx: Al-Zn (heat treatable, aerospace)
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * Created: 2026-01-25
 */

const ALUMINUM_WROUGHT_011_050 = {
  metadata: {
    file: "aluminum_wrought_011_050.js",
    category: "N_NONFERROUS",
    subcategory: "Aluminum Wrought",
    materialCount: 40,
    idRange: { start: "N-AL-011", end: "N-AL-050" },
    schemaVersion: "3.0.0",
    created: "2026-01-25"
  },

  materials: {
    // ═══════════════════════════════════════════════════════════════════════════
    // 1XXX SERIES - PURE ALUMINUM (N-AL-011 to N-AL-013)
    // ═══════════════════════════════════════════════════════════════════════════

    "N-AL-011": {
      id: "N-AL-011",
      name: "Aluminum 1100-O (Pure, Annealed)",
      designation: {
        aa: "1100-O",
        uns: "A91100",
        din: "Al99.0",
        en: "EN AW-1100",
        jis: "A1100P-O"
      },
      iso_group: "N",
      material_class: "Aluminum - Pure",
      condition: "O (Annealed)",

      composition: {
        aluminum: { min: 99.00, max: 99.95, typical: 99.40 },
        silicon: { min: 0, max: 0.25, typical: 0.12 },
        iron: { min: 0, max: 0.40, typical: 0.20 },
        copper: { min: 0.05, max: 0.20, typical: 0.12 },
        manganese: { min: 0, max: 0.05, typical: 0.02 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        others_each: { min: 0, max: 0.05, typical: 0.02 },
        others_total: { min: 0, max: 0.15, typical: 0.07 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 643, liquidus: 657 },
        specific_heat: 904,
        thermal_conductivity: 222,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 2.9e-8,
        electrical_conductivity_IACS: 59,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69000,
        shear_modulus: 26000
      },

      mechanical: {
        hardness: {
          brinell: 23,
          rockwell_b: null,
          rockwell_c: null,
          vickers: 24
        },
        tensile_strength: { min: 75, typical: 90, max: 105 },
        yield_strength: { min: 25, typical: 35, max: 45 },
        compressive_strength: { min: 75, typical: 90, max: 105 },
        elongation: { min: 35, typical: 42, max: 50 },
        reduction_of_area: { min: 60, typical: 70, max: 80 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 35,
        fracture_toughness: 30
      },

      kienzle: {
        kc1_1: 350,
        mc: 0.25,
        kc_adjust_rake: -3.0,
        kc_adjust_speed: -0.05,
        chip_compression: 2.2
      },

      taylor: {
        C: 900,
        n: 0.35,
        reference_speed: 500,
        reference_life: 15,
        speed_range: { min: 150, max: 1500 }
      },

      machinability: {
        aisi_rating: 200,
        relative_to_1212: 2.00,
        chip_form: "continuous_long_stringy",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.35,
        built_up_edge_tendency: "very_high",
        tool_wear_pattern: "built_up_edge",
        notes: "Very soft, gummy. High rake angles, sharp tools, flood coolant essential."
      },

      johnson_cook: {
        A: 35,
        B: 130,
        n: 0.42,
        C: 0.015,
        m: 1.0,
        T_melt: 650,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 300, opt: 600, max: 1200 }, feed: { min: 0.10, opt: 0.25, max: 0.50 }, doc: { min: 0.5, opt: 2.5, max: 8.0 } },
          pcd: { speed: { min: 600, opt: 1200, max: 2500 }, feed: { min: 0.08, opt: 0.20, max: 0.40 }, doc: { min: 0.3, opt: 2.0, max: 6.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 250, opt: 500, max: 1000 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.5, opt: 2.5, max: 6.0 }, woc_factor: 0.65 }
        },
        drilling: {
          carbide: { speed: { min: 150, opt: 300, max: 600 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.50 } },
          hss_cobalt: { speed: { min: 50, opt: 100, max: 200 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.50 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "neutral",
        white_layer_risk: "none",
        work_hardening_depth: 0.02,
        surface_roughness_typical: { Ra: 0.4, Rz: 2 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["heat_exchangers", "chemical_equipment", "food_processing", "reflectors", "nameplates"],
      
      heat_treatment: {
        process: "O - Full Anneal",
        anneal_temp: 345,
        cooling: "air_cool",
        age_hardening: false
      },

      corrosion_resistance: {
        general: "excellent",
        seawater: "good",
        acids: "good",
        alkalis: "poor"
      },

      notes: "Commercially pure aluminum, annealed. Excellent corrosion resistance, formability. Very gummy to machine."
    },

    "N-AL-012": {
      id: "N-AL-012",
      name: "Aluminum 1100-H14 (Pure, Half-Hard)",
      designation: {
        aa: "1100-H14",
        uns: "A91100",
        din: "Al99.0 H14",
        en: "EN AW-1100 H14",
        jis: "A1100P-H14"
      },
      iso_group: "N",
      material_class: "Aluminum - Pure",
      condition: "H14 (Strain Hardened)",

      composition: {
        aluminum: { min: 99.00, max: 99.95, typical: 99.40 },
        silicon: { min: 0, max: 0.25, typical: 0.12 },
        iron: { min: 0, max: 0.40, typical: 0.20 },
        copper: { min: 0.05, max: 0.20, typical: 0.12 },
        manganese: { min: 0, max: 0.05, typical: 0.02 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        others_each: { min: 0, max: 0.05, typical: 0.02 },
        others_total: { min: 0, max: 0.15, typical: 0.07 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 643, liquidus: 657 },
        specific_heat: 904,
        thermal_conductivity: 218,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 3.0e-8,
        electrical_conductivity_IACS: 57,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69000,
        shear_modulus: 26000
      },

      mechanical: {
        hardness: {
          brinell: 32,
          rockwell_b: null,
          rockwell_c: null,
          vickers: 34
        },
        tensile_strength: { min: 110, typical: 125, max: 140 },
        yield_strength: { min: 95, typical: 105, max: 120 },
        compressive_strength: { min: 110, typical: 125, max: 140 },
        elongation: { min: 9, typical: 12, max: 16 },
        reduction_of_area: { min: 25, typical: 35, max: 45 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 48,
        fracture_toughness: 28
      },

      kienzle: {
        kc1_1: 420,
        mc: 0.26,
        kc_adjust_rake: -3.0,
        kc_adjust_speed: -0.05,
        chip_compression: 2.4
      },

      taylor: {
        C: 850,
        n: 0.34,
        reference_speed: 480,
        reference_life: 15,
        speed_range: { min: 140, max: 1400 }
      },

      machinability: {
        aisi_rating: 180,
        relative_to_1212: 1.80,
        chip_form: "continuous_long",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.40,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "built_up_edge"
      },

      johnson_cook: {
        A: 105,
        B: 145,
        n: 0.35,
        C: 0.015,
        m: 1.0,
        T_melt: 650,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 280, opt: 550, max: 1100 }, feed: { min: 0.10, opt: 0.25, max: 0.50 }, doc: { min: 0.5, opt: 2.5, max: 8.0 } },
          pcd: { speed: { min: 550, opt: 1100, max: 2300 }, feed: { min: 0.08, opt: 0.20, max: 0.40 }, doc: { min: 0.3, opt: 2.0, max: 6.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 230, opt: 460, max: 920 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.5, opt: 2.5, max: 6.0 }, woc_factor: 0.65 }
        },
        drilling: {
          carbide: { speed: { min: 140, opt: 280, max: 560 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.50 } },
          hss_cobalt: { speed: { min: 45, opt: 90, max: 180 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.50 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.03,
        surface_roughness_typical: { Ra: 0.5, Rz: 3 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["sheet_metal", "drawn_products", "cooking_utensils", "architectural_trim"],
      
      heat_treatment: {
        process: "H14 - Strain Hardened",
        cold_work_percent: 25,
        age_hardening: false
      },

      corrosion_resistance: {
        general: "excellent",
        seawater: "good",
        acids: "good",
        alkalis: "poor"
      },

      notes: "Commercially pure aluminum, half-hard. Better machinability than O temper."
    },

    "N-AL-013": {
      id: "N-AL-013",
      name: "Aluminum 1050-H18 (Pure, Full-Hard)",
      designation: {
        aa: "1050-H18",
        uns: "A91050",
        din: "Al99.5 H18",
        en: "EN AW-1050A H18",
        jis: "A1050P-H18"
      },
      iso_group: "N",
      material_class: "Aluminum - Pure",
      condition: "H18 (Full-Hard)",

      composition: {
        aluminum: { min: 99.50, max: 99.95, typical: 99.65 },
        silicon: { min: 0, max: 0.25, typical: 0.10 },
        iron: { min: 0, max: 0.40, typical: 0.18 },
        copper: { min: 0, max: 0.05, typical: 0.02 },
        manganese: { min: 0, max: 0.05, typical: 0.02 },
        zinc: { min: 0, max: 0.05, typical: 0.02 },
        titanium: { min: 0, max: 0.03, typical: 0.01 },
        others_each: { min: 0, max: 0.03, typical: 0.01 },
        others_total: { min: 0, max: 0.10, typical: 0.05 }
      },

      physical: {
        density: 2705,
        melting_point: { solidus: 646, liquidus: 657 },
        specific_heat: 900,
        thermal_conductivity: 229,
        thermal_expansion: 23.5e-6,
        electrical_resistivity: 2.8e-8,
        electrical_conductivity_IACS: 61,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69000,
        shear_modulus: 26000
      },

      mechanical: {
        hardness: {
          brinell: 44,
          rockwell_b: null,
          rockwell_c: null,
          vickers: 46
        },
        tensile_strength: { min: 145, typical: 165, max: 185 },
        yield_strength: { min: 140, typical: 155, max: 175 },
        compressive_strength: { min: 145, typical: 165, max: 185 },
        elongation: { min: 4, typical: 6, max: 8 },
        reduction_of_area: { min: 15, typical: 20, max: 28 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 62,
        fracture_toughness: 22
      },

      kienzle: {
        kc1_1: 480,
        mc: 0.27,
        kc_adjust_rake: -3.0,
        kc_adjust_speed: -0.05,
        chip_compression: 2.5
      },

      taylor: {
        C: 820,
        n: 0.33,
        reference_speed: 460,
        reference_life: 15,
        speed_range: { min: 130, max: 1350 }
      },

      machinability: {
        aisi_rating: 160,
        relative_to_1212: 1.60,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.45,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "built_up_edge"
      },

      johnson_cook: {
        A: 155,
        B: 160,
        n: 0.28,
        C: 0.015,
        m: 1.0,
        T_melt: 652,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 260, opt: 520, max: 1050 }, feed: { min: 0.10, opt: 0.25, max: 0.50 }, doc: { min: 0.5, opt: 2.5, max: 8.0 } },
          pcd: { speed: { min: 520, opt: 1050, max: 2200 }, feed: { min: 0.08, opt: 0.20, max: 0.40 }, doc: { min: 0.3, opt: 2.0, max: 6.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 210, opt: 430, max: 870 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.35 }, doc: { min: 0.5, opt: 2.5, max: 6.0 }, woc_factor: 0.65 }
        },
        drilling: {
          carbide: { speed: { min: 130, opt: 260, max: 530 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.50 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.02,
        surface_roughness_typical: { Ra: 0.6, Rz: 3 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["electrical_conductors", "capacitor_foil", "heat_exchangers", "reflective_trim"],
      
      heat_treatment: {
        process: "H18 - Full Hard",
        cold_work_percent: 75,
        age_hardening: false
      },

      corrosion_resistance: {
        general: "excellent",
        seawater: "good",
        acids: "good",
        alkalis: "poor"
      },

      notes: "High-purity aluminum, full-hard. Best electrical conductivity of wrought alloys."
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 2XXX SERIES - Al-Cu AEROSPACE (N-AL-014 to N-AL-023)
    // ═══════════════════════════════════════════════════════════════════════════

    "N-AL-014": {
      id: "N-AL-014",
      name: "Aluminum 2011-T3 (Free-Machining)",
      designation: {
        aa: "2011-T3",
        uns: "A92011",
        din: "AlCuBiPb",
        en: "EN AW-2011 T3",
        jis: "A2011-T3"
      },
      iso_group: "N",
      material_class: "Aluminum - Free-Machining",
      condition: "T3 (Solution Treated, Cold Worked)",

      composition: {
        aluminum: { min: 91.0, max: 94.5, typical: 92.8 },
        copper: { min: 5.0, max: 6.0, typical: 5.5 },
        silicon: { min: 0, max: 0.40, typical: 0.20 },
        iron: { min: 0, max: 0.70, typical: 0.35 },
        lead: { min: 0.20, max: 0.60, typical: 0.40 },
        bismuth: { min: 0.20, max: 0.60, typical: 0.40 },
        zinc: { min: 0, max: 0.30, typical: 0.15 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2830,
        melting_point: { solidus: 535, liquidus: 640 },
        specific_heat: 864,
        thermal_conductivity: 151,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 4.0e-8,
        electrical_conductivity_IACS: 43,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70000,
        shear_modulus: 26000
      },

      mechanical: {
        hardness: {
          brinell: 95,
          rockwell_b: 56,
          rockwell_c: null,
          vickers: 100
        },
        tensile_strength: { min: 310, typical: 380, max: 420 },
        yield_strength: { min: 270, typical: 295, max: 340 },
        compressive_strength: { min: 310, typical: 380, max: 420 },
        elongation: { min: 12, typical: 15, max: 20 },
        reduction_of_area: { min: 25, typical: 35, max: 45 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 125,
        fracture_toughness: 24
      },

      kienzle: {
        kc1_1: 580,
        mc: 0.28,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.06,
        chip_compression: 2.6
      },

      taylor: {
        C: 750,
        n: 0.32,
        reference_speed: 420,
        reference_life: 15,
        speed_range: { min: 120, max: 1200 }
      },

      machinability: {
        aisi_rating: 300,
        relative_to_1212: 3.00,
        chip_form: "short_broken",
        surface_finish_achievable: 0.4,
        cutting_force_factor: 0.52,
        built_up_edge_tendency: "very_low",
        tool_wear_pattern: "even_flank",
        notes: "BEST machining aluminum. Pb/Bi additions break chips. Excellent for screw machine parts."
      },

      johnson_cook: {
        A: 310,
        B: 450,
        n: 0.38,
        C: 0.018,
        m: 1.1,
        T_melt: 588,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 250, opt: 500, max: 1000 }, feed: { min: 0.10, opt: 0.30, max: 0.60 }, doc: { min: 0.5, opt: 3.0, max: 10.0 } },
          pcd: { speed: { min: 500, opt: 1000, max: 2500 }, feed: { min: 0.08, opt: 0.25, max: 0.50 }, doc: { min: 0.3, opt: 2.5, max: 8.0 } },
          hss: { speed: { min: 80, opt: 200, max: 400 }, feed: { min: 0.10, opt: 0.30, max: 0.60 }, doc: { min: 0.5, opt: 3.0, max: 10.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 200, opt: 420, max: 850 }, feed_per_tooth: { min: 0.10, opt: 0.22, max: 0.40 }, doc: { min: 0.5, opt: 3.0, max: 8.0 }, woc_factor: 0.70 }
        },
        drilling: {
          carbide: { speed: { min: 120, opt: 280, max: 550 }, feed_per_rev: { min: 0.12, opt: 0.30, max: 0.55 } },
          hss_cobalt: { speed: { min: 40, opt: 100, max: 200 }, feed_per_rev: { min: 0.12, opt: 0.30, max: 0.55 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.05,
        surface_roughness_typical: { Ra: 0.4, Rz: 2 }
      },

      coolant: {
        requirement: "recommended",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "slight"
      },

      applications: ["screw_machine_parts", "fittings", "connectors", "couplings", "high_volume_machined_parts"],
      
      heat_treatment: {
        process: "T3 - Solution Treated + Cold Worked",
        solution_temp: 525,
        quench: "water",
        cold_work_percent: 15,
        natural_aging: true
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "susceptible"
      },

      notes: "FREE-MACHINING aluminum. Pb/Bi act as chip breakers. Best for high-volume screw machine work."
    },

    "N-AL-015": {
      id: "N-AL-015",
      name: "Aluminum 2014-T6 (Aerospace)",
      designation: {
        aa: "2014-T6",
        uns: "A92014",
        din: "AlCu4SiMg",
        en: "EN AW-2014 T6",
        jis: "A2014-T6"
      },
      iso_group: "N",
      material_class: "Aluminum - Aerospace",
      condition: "T6 (Solution Treated, Artificially Aged)",

      composition: {
        aluminum: { min: 91.0, max: 95.0, typical: 93.0 },
        copper: { min: 3.9, max: 5.0, typical: 4.4 },
        silicon: { min: 0.50, max: 1.2, typical: 0.85 },
        manganese: { min: 0.40, max: 1.2, typical: 0.80 },
        magnesium: { min: 0.20, max: 0.80, typical: 0.50 },
        iron: { min: 0, max: 0.70, typical: 0.35 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.25, typical: 0.12 },
        titanium: { min: 0, max: 0.15, typical: 0.08 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2800,
        melting_point: { solidus: 507, liquidus: 638 },
        specific_heat: 880,
        thermal_conductivity: 154,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 4.4e-8,
        electrical_conductivity_IACS: 40,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 73000,
        shear_modulus: 28000
      },

      mechanical: {
        hardness: {
          brinell: 135,
          rockwell_b: 78,
          rockwell_c: null,
          vickers: 142
        },
        tensile_strength: { min: 440, typical: 485, max: 530 },
        yield_strength: { min: 390, typical: 415, max: 460 },
        compressive_strength: { min: 440, typical: 485, max: 530 },
        elongation: { min: 9, typical: 13, max: 17 },
        reduction_of_area: { min: 20, typical: 30, max: 40 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 140,
        fracture_toughness: 26
      },

      kienzle: {
        kc1_1: 680,
        mc: 0.28,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.06,
        chip_compression: 2.7
      },

      taylor: {
        C: 680,
        n: 0.30,
        reference_speed: 380,
        reference_life: 15,
        speed_range: { min: 100, max: 1100 }
      },

      machinability: {
        aisi_rating: 140,
        relative_to_1212: 1.40,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 0.60,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 415,
        B: 520,
        n: 0.32,
        C: 0.015,
        m: 1.05,
        T_melt: 572,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 220, opt: 440, max: 880 }, feed: { min: 0.10, opt: 0.28, max: 0.50 }, doc: { min: 0.5, opt: 2.5, max: 8.0 } },
          pcd: { speed: { min: 440, opt: 880, max: 1800 }, feed: { min: 0.08, opt: 0.22, max: 0.42 }, doc: { min: 0.3, opt: 2.0, max: 6.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 180, opt: 370, max: 750 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.32 }, doc: { min: 0.5, opt: 2.5, max: 6.0 }, woc_factor: 0.60 }
        },
        drilling: {
          carbide: { speed: { min: 110, opt: 240, max: 480 }, feed_per_rev: { min: 0.10, opt: 0.25, max: 0.45 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "compressive",
        white_layer_risk: "none",
        work_hardening_depth: 0.08,
        surface_roughness_typical: { Ra: 0.8, Rz: 4 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["aircraft_structures", "truck_frames", "heavy_duty_forgings", "aerospace_fittings"],
      
      heat_treatment: {
        process: "T6 - Solution Treated + Artificially Aged",
        solution_temp: 502,
        quench: "water",
        age_temp: 160,
        age_time_hours: 18
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "susceptible"
      },

      notes: "High-strength aerospace alloy. Similar strength to 2024 but with improved forgeability."
    },

    "N-AL-016": {
      id: "N-AL-016",
      name: "Aluminum 2024-O (Aerospace, Annealed)",
      designation: {
        aa: "2024-O",
        uns: "A92024",
        din: "AlCu4Mg1",
        en: "EN AW-2024 O",
        jis: "A2024P-O"
      },
      iso_group: "N",
      material_class: "Aluminum - Aerospace",
      condition: "O (Annealed)",

      composition: {
        aluminum: { min: 90.7, max: 94.7, typical: 92.7 },
        copper: { min: 3.8, max: 4.9, typical: 4.35 },
        magnesium: { min: 1.2, max: 1.8, typical: 1.5 },
        manganese: { min: 0.30, max: 0.90, typical: 0.60 },
        silicon: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.25, typical: 0.12 },
        titanium: { min: 0, max: 0.15, typical: 0.08 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2780,
        melting_point: { solidus: 502, liquidus: 638 },
        specific_heat: 875,
        thermal_conductivity: 193,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 3.4e-8,
        electrical_conductivity_IACS: 50,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 73000,
        shear_modulus: 28000
      },

      mechanical: {
        hardness: {
          brinell: 47,
          rockwell_b: null,
          rockwell_c: null,
          vickers: 49
        },
        tensile_strength: { min: 165, typical: 185, max: 210 },
        yield_strength: { min: 70, typical: 75, max: 85 },
        compressive_strength: { min: 165, typical: 185, max: 210 },
        elongation: { min: 18, typical: 22, max: 27 },
        reduction_of_area: { min: 40, typical: 50, max: 60 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 90,
        fracture_toughness: 35
      },

      kienzle: {
        kc1_1: 420,
        mc: 0.26,
        kc_adjust_rake: -3.0,
        kc_adjust_speed: -0.05,
        chip_compression: 2.4
      },

      taylor: {
        C: 850,
        n: 0.34,
        reference_speed: 480,
        reference_life: 15,
        speed_range: { min: 140, max: 1400 }
      },

      machinability: {
        aisi_rating: 180,
        relative_to_1212: 1.80,
        chip_form: "continuous_long",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.42,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "built_up_edge"
      },

      johnson_cook: {
        A: 75,
        B: 280,
        n: 0.45,
        C: 0.015,
        m: 1.0,
        T_melt: 570,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 280, opt: 560, max: 1120 }, feed: { min: 0.10, opt: 0.28, max: 0.55 }, doc: { min: 0.5, opt: 3.0, max: 9.0 } },
          pcd: { speed: { min: 560, opt: 1120, max: 2400 }, feed: { min: 0.08, opt: 0.22, max: 0.45 }, doc: { min: 0.3, opt: 2.5, max: 7.0 } }
        },
        milling: {
          carbide_coated: { speed: { min: 230, opt: 470, max: 950 }, feed_per_tooth: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.5, opt: 3.0, max: 7.0 }, woc_factor: 0.65 }
        },
        drilling: {
          carbide: { speed: { min: 140, opt: 300, max: 580 }, feed_per_rev: { min: 0.12, opt: 0.28, max: 0.50 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "neutral",
        white_layer_risk: "none",
        work_hardening_depth: 0.03,
        surface_roughness_typical: { Ra: 0.6, Rz: 3 }
      },

      coolant: {
        requirement: "essential",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["forming_operations", "pre_heat_treatment_machining", "aircraft_skin_forming"],
      
      heat_treatment: {
        process: "O - Full Anneal",
        anneal_temp: 413,
        cooling: "slow_furnace_cool"
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "resistant_when_annealed"
      },

      notes: "Aerospace 2024 in annealed condition for forming. Soft and gummy to machine."
    },

    "N-AL-017": {
      id: "N-AL-017",
      name: "Aluminum 2024-T3 (Aerospace, Solution Treated)",
      designation: {
        aa: "2024-T3",
        uns: "A92024",
        din: "AlCu4Mg1 T3",
        en: "EN AW-2024 T3",
        jis: "A2024P-T3"
      },
      iso_group: "N",
      material_class: "Aluminum - Aerospace",
      condition: "T3 (Solution Treated, Cold Worked, Naturally Aged)",

      composition: {
        aluminum: { min: 90.7, max: 94.7, typical: 92.7 },
        copper: { min: 3.8, max: 4.9, typical: 4.35 },
        magnesium: { min: 1.2, max: 1.8, typical: 1.5 },
        manganese: { min: 0.30, max: 0.90, typical: 0.60 },
        silicon: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.25, typical: 0.12 },
        titanium: { min: 0, max: 0.15, typical: 0.08 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2780,
        melting_point: { solidus: 502, liquidus: 638 },
        specific_heat: 875,
        thermal_conductivity: 121,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 5.6e-8,
        electrical_conductivity_IACS: 30,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 73000,
        shear_modulus: 28000
      },

      mechanical: {
        hardness: {
          brinell: 120,
          rockwell_b: 72,
          rockwell_c: null,
          vickers: 126
        },
        tensile_strength: { min: 425, typical: 485, max: 530 },
        yield_strength: { min: 290, typical: 345, max: 395 },
        compressive_strength: { min: 425, typical: 485, max: 530 },
        elongation: { min: 15, typical: 18, max: 22 },
        reduction_of_area: { min: 30, typical: 38, max: 48 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 140,
        fracture_toughness: 32
      },

      kienzle: {
        kc1_1: 650,
        mc: 0.28,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.06,
        chip_compression: 2.7
      },

      taylor: {
        C: 700,
        n: 0.31,
        reference_speed: 395,
        reference_life: 15,
        speed_range: { min: 110, max: 1150 }
      },

      machinability: {
        aisi_rating: 145,
        relative_to_1212: 1.45,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.58,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 345,
        B: 480,
        n: 0.35,
        C: 0.015,
        m: 1.05,
        T_melt: 570,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 230, opt: 460, max: 920 }, feed: { min: 0.10, opt: 0.28, max: 0.50 }, doc: { min: 0.5, opt: 2.8, max: 8.0 } },
          pcd: { speed: { min: 460, opt: 920, max: 1900 }, feed: { min: 0.08, opt: 0.22, max: 0.42 }, doc: { min: 0.3, opt: 2.2, max: 6.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 190, opt: 385, max: 780 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.5, opt: 2.8, max: 6.5 }, woc_factor: 0.62 }
        },
        drilling: {
          carbide: { speed: { min: 115, opt: 250, max: 500 }, feed_per_rev: { min: 0.10, opt: 0.26, max: 0.46 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 0.6, Rz: 3 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["aircraft_skin", "wing_structures", "fuselage", "aircraft_fittings"],
      
      heat_treatment: {
        process: "T3 - Solution Treated + Cold Worked + Natural Age",
        solution_temp: 493,
        quench: "water",
        cold_work_percent: 15,
        natural_aging: true
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "susceptible"
      },

      notes: "Primary aircraft skin alloy. Excellent fatigue resistance. Usually clad (Alclad) for corrosion protection."
    },

    "N-AL-018": {
      id: "N-AL-018",
      name: "Aluminum 2024-T4 (Aerospace, Naturally Aged)",
      designation: {
        aa: "2024-T4",
        uns: "A92024",
        din: "AlCu4Mg1 T4",
        en: "EN AW-2024 T4",
        jis: "A2024P-T4"
      },
      iso_group: "N",
      material_class: "Aluminum - Aerospace",
      condition: "T4 (Solution Treated, Naturally Aged)",

      composition: {
        aluminum: { min: 90.7, max: 94.7, typical: 92.7 },
        copper: { min: 3.8, max: 4.9, typical: 4.35 },
        magnesium: { min: 1.2, max: 1.8, typical: 1.5 },
        manganese: { min: 0.30, max: 0.90, typical: 0.60 },
        silicon: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.25, typical: 0.12 },
        titanium: { min: 0, max: 0.15, typical: 0.08 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2780,
        melting_point: { solidus: 502, liquidus: 638 },
        specific_heat: 875,
        thermal_conductivity: 121,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 5.6e-8,
        electrical_conductivity_IACS: 30,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 73000,
        shear_modulus: 28000
      },

      mechanical: {
        hardness: {
          brinell: 120,
          rockwell_b: 72,
          rockwell_c: null,
          vickers: 126
        },
        tensile_strength: { min: 440, typical: 470, max: 510 },
        yield_strength: { min: 275, typical: 325, max: 370 },
        compressive_strength: { min: 440, typical: 470, max: 510 },
        elongation: { min: 17, typical: 20, max: 24 },
        reduction_of_area: { min: 35, typical: 42, max: 52 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 140,
        fracture_toughness: 34
      },

      kienzle: {
        kc1_1: 640,
        mc: 0.28,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.06,
        chip_compression: 2.7
      },

      taylor: {
        C: 710,
        n: 0.31,
        reference_speed: 400,
        reference_life: 15,
        speed_range: { min: 112, max: 1160 }
      },

      machinability: {
        aisi_rating: 148,
        relative_to_1212: 1.48,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.56,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 325,
        B: 460,
        n: 0.36,
        C: 0.015,
        m: 1.05,
        T_melt: 570,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 235, opt: 470, max: 940 }, feed: { min: 0.10, opt: 0.28, max: 0.50 }, doc: { min: 0.5, opt: 2.8, max: 8.0 } },
          pcd: { speed: { min: 470, opt: 940, max: 1950 }, feed: { min: 0.08, opt: 0.22, max: 0.42 }, doc: { min: 0.3, opt: 2.2, max: 6.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 195, opt: 395, max: 800 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.5, opt: 2.8, max: 6.5 }, woc_factor: 0.62 }
        },
        drilling: {
          carbide: { speed: { min: 118, opt: 255, max: 510 }, feed_per_rev: { min: 0.10, opt: 0.26, max: 0.46 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 0.6, Rz: 3 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["aircraft_structures", "hydraulic_fittings", "machine_parts", "rivets"],
      
      heat_treatment: {
        process: "T4 - Solution Treated + Natural Age",
        solution_temp: 493,
        quench: "water",
        natural_aging: true,
        natural_age_time: "4+ days"
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "susceptible"
      },

      notes: "2024-T4 has slightly higher ductility than T3. Standard aerospace structural alloy."
    },

    "N-AL-019": {
      id: "N-AL-019",
      name: "Aluminum 2024-T351 (Aerospace, Stress Relieved)",
      designation: {
        aa: "2024-T351",
        uns: "A92024",
        din: "AlCu4Mg1 T351",
        en: "EN AW-2024 T351",
        jis: "A2024-T351"
      },
      iso_group: "N",
      material_class: "Aluminum - Aerospace",
      condition: "T351 (Solution Treated, Stress Relieved, Naturally Aged)",

      composition: {
        aluminum: { min: 90.7, max: 94.7, typical: 92.7 },
        copper: { min: 3.8, max: 4.9, typical: 4.35 },
        magnesium: { min: 1.2, max: 1.8, typical: 1.5 },
        manganese: { min: 0.30, max: 0.90, typical: 0.60 },
        silicon: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.25, typical: 0.12 },
        titanium: { min: 0, max: 0.15, typical: 0.08 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2780,
        melting_point: { solidus: 502, liquidus: 638 },
        specific_heat: 875,
        thermal_conductivity: 121,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 5.6e-8,
        electrical_conductivity_IACS: 30,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 73000,
        shear_modulus: 28000
      },

      mechanical: {
        hardness: {
          brinell: 120,
          rockwell_b: 72,
          rockwell_c: null,
          vickers: 126
        },
        tensile_strength: { min: 440, typical: 470, max: 510 },
        yield_strength: { min: 290, typical: 325, max: 365 },
        compressive_strength: { min: 440, typical: 470, max: 510 },
        elongation: { min: 12, typical: 18, max: 22 },
        reduction_of_area: { min: 28, typical: 36, max: 45 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 140,
        fracture_toughness: 35
      },

      kienzle: {
        kc1_1: 640,
        mc: 0.28,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.06,
        chip_compression: 2.7
      },

      taylor: {
        C: 710,
        n: 0.31,
        reference_speed: 400,
        reference_life: 15,
        speed_range: { min: 112, max: 1160 }
      },

      machinability: {
        aisi_rating: 148,
        relative_to_1212: 1.48,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.56,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 325,
        B: 460,
        n: 0.36,
        C: 0.015,
        m: 1.05,
        T_melt: 570,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 235, opt: 470, max: 940 }, feed: { min: 0.10, opt: 0.28, max: 0.50 }, doc: { min: 0.5, opt: 2.8, max: 8.0 } },
          pcd: { speed: { min: 470, opt: 940, max: 1950 }, feed: { min: 0.08, opt: 0.22, max: 0.42 }, doc: { min: 0.3, opt: 2.2, max: 6.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 195, opt: 395, max: 800 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.5, opt: 2.8, max: 6.5 }, woc_factor: 0.62 }
        },
        drilling: {
          carbide: { speed: { min: 118, opt: 255, max: 510 }, feed_per_rev: { min: 0.10, opt: 0.26, max: 0.46 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "low_tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 0.6, Rz: 3 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["aircraft_plate", "machined_parts", "jigs_fixtures", "structural_members"],
      
      heat_treatment: {
        process: "T351 - Solution Treated + Stress Relief Stretch + Natural Age",
        solution_temp: 493,
        quench: "water",
        stress_relief: "1.5-3% permanent stretch",
        natural_aging: true
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "improved_due_to_stress_relief"
      },

      notes: "T351 = stress relieved by stretching. Preferred for thick plate machining due to reduced distortion."
    },

    "N-AL-020": {
      id: "N-AL-020",
      name: "Aluminum 2024-T6 (Aerospace, Peak Aged)",
      designation: {
        aa: "2024-T6",
        uns: "A92024",
        din: "AlCu4Mg1 T6",
        en: "EN AW-2024 T6",
        jis: "A2024-T6"
      },
      iso_group: "N",
      material_class: "Aluminum - Aerospace",
      condition: "T6 (Solution Treated, Artificially Aged)",

      composition: {
        aluminum: { min: 90.7, max: 94.7, typical: 92.7 },
        copper: { min: 3.8, max: 4.9, typical: 4.35 },
        magnesium: { min: 1.2, max: 1.8, typical: 1.5 },
        manganese: { min: 0.30, max: 0.90, typical: 0.60 },
        silicon: { min: 0, max: 0.50, typical: 0.25 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.25, typical: 0.12 },
        titanium: { min: 0, max: 0.15, typical: 0.08 },
        others_total: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2780,
        melting_point: { solidus: 502, liquidus: 638 },
        specific_heat: 875,
        thermal_conductivity: 151,
        thermal_expansion: 23.2e-6,
        electrical_resistivity: 4.5e-8,
        electrical_conductivity_IACS: 38,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 73000,
        shear_modulus: 28000
      },

      mechanical: {
        hardness: {
          brinell: 125,
          rockwell_b: 75,
          rockwell_c: null,
          vickers: 131
        },
        tensile_strength: { min: 440, typical: 475, max: 515 },
        yield_strength: { min: 345, typical: 395, max: 440 },
        compressive_strength: { min: 440, typical: 475, max: 515 },
        elongation: { min: 5, typical: 10, max: 13 },
        reduction_of_area: { min: 15, typical: 22, max: 30 },
        impact_energy: { joules: null, temperature: 20 },
        fatigue_strength: 130,
        fracture_toughness: 25
      },

      kienzle: {
        kc1_1: 660,
        mc: 0.28,
        kc_adjust_rake: -2.5,
        kc_adjust_speed: -0.06,
        chip_compression: 2.7
      },

      taylor: {
        C: 690,
        n: 0.30,
        reference_speed: 385,
        reference_life: 15,
        speed_range: { min: 108, max: 1125 }
      },

      machinability: {
        aisi_rating: 140,
        relative_to_1212: 1.40,
        chip_form: "segmented_short",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.58,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "flank_wear"
      },

      johnson_cook: {
        A: 395,
        B: 500,
        n: 0.32,
        C: 0.015,
        m: 1.05,
        T_melt: 570,
        T_ref: 20,
        epsilon_ref: 1.0
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 225, opt: 450, max: 900 }, feed: { min: 0.10, opt: 0.28, max: 0.50 }, doc: { min: 0.5, opt: 2.8, max: 8.0 } },
          pcd: { speed: { min: 450, opt: 900, max: 1850 }, feed: { min: 0.08, opt: 0.22, max: 0.42 }, doc: { min: 0.3, opt: 2.2, max: 6.5 } }
        },
        milling: {
          carbide_coated: { speed: { min: 185, opt: 375, max: 760 }, feed_per_tooth: { min: 0.08, opt: 0.18, max: 0.34 }, doc: { min: 0.5, opt: 2.8, max: 6.5 }, woc_factor: 0.60 }
        },
        drilling: {
          carbide: { speed: { min: 112, opt: 245, max: 490 }, feed_per_rev: { min: 0.10, opt: 0.26, max: 0.46 } }
        }
      },

      surface_integrity: {
        residual_stress_tendency: "tensile",
        white_layer_risk: "none",
        work_hardening_depth: 0.06,
        surface_roughness_typical: { Ra: 0.6, Rz: 3 }
      },

      coolant: {
        requirement: "required",
        recommended_type: "soluble_oil_aluminum",
        mql_suitable: true,
        cryogenic_benefit: "moderate"
      },

      applications: ["screw_machine_parts", "fittings", "computer_fittings", "camera_bodies"],
      
      heat_treatment: {
        process: "T6 - Solution Treated + Artificially Aged",
        solution_temp: 493,
        quench: "water",
        age_temp: 191,
        age_time_hours: 12
      },

      corrosion_resistance: {
        general: "fair",
        seawater: "poor",
        stress_corrosion: "highly_susceptible"
      },

      notes: "T6 = peak strength but reduced ductility and SCC resistance. Better chip formation than T3/T4."
    }
  }
};

// Export for use in PRISM
if (typeof module !== "undefined" && module.exports) {
  module.exports = ALUMINUM_WROUGHT_011_050;
}
