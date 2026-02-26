.0 },
        silicon: { min: 0.60, max: 1.0, typical: 0.80 },
        copper: { min: 0.60, max: 1.1, typical: 0.85 },
        manganese: { min: 0.20, max: 0.80, typical: 0.50 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 565, liquidus: 648 },
        specific_heat: 895,
        thermal_conductivity: 163,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 4.1e-8,
        electrical_conductivity_iacs: 42,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69600,
        shear_modulus: 26000
      },

      mechanical: {
        hardness: { brinell: 110, rockwell_b: 63, rockwell_c: null, vickers: 115 },
        tensile_strength: { min: 365, typical: 395, max: 430 },
        yield_strength: { min: 338, typical: 365, max: 400 },
        compressive_strength: { min: 338, typical: 365, max: 400 },
        elongation: { min: 7, typical: 10, max: 14 },
        reduction_of_area: { min: 20, typical: 25, max: 32 },
        impact_energy: { joules: 14, temperature: 20 },
        fatigue_strength: 105,
        fracture_toughness: 30
      },

      kienzle: { kc1_1: 700, mc: 0.24, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.5 },
      taylor: { C: 820, n: 0.34, reference_speed: 410, reference_life: 15, speed_range: { min: 145, max: 730 } },

      machinability: {
        aisi_rating: 105,
        relative_to_1212: 1.05,
        chip_form: "short_curled",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.50,
        built_up_edge_tendency: "low",
        tool_wear_pattern: "even_flank"
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 270, opt: 460, max: 730 }, feed: { min: 0.10, opt: 0.26, max: 0.48 }, doc: { min: 0.8, opt: 3.2, max: 8.5 } },
          pcd: { speed: { min: 540, opt: 920, max: 1370 }, feed: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.5, opt: 2.5, max: 6.5 } }
        },
        milling: { carbide_coated: { speed: { min: 220, opt: 385, max: 640 }, feed_per_tooth: { min: 0.08, opt: 0.20, max: 0.38 }, doc: { min: 0.8, opt: 3.2, max: 6.5 }, woc_factor: 0.68 } },
        drilling: { carbide: { speed: { min: 145, opt: 260, max: 430 }, feed_per_rev: { min: 0.10, opt: 0.26, max: 0.46 } } }
      },

      surface_integrity: { residual_stress_tendency: "very_low", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["aerospace_extrusions", "aircraft_stringers", "precision_extruded_parts"],
      heat_treatment: { temper: "T6511", solution_temp: 535, quench: "water", stress_relief: "minor_straightening", artificial_aging: "175°C / 8h" },
      corrosion_resistance: { general: "very_good", stress_corrosion: "resistant" },
      notes: "Stress-relieved aerospace extrusion. Minor straightening only."
    },

    "N-AL-046": {
      id: "N-AL-046",
      name: "6111-T4 Automotive Body",
      designation: { aa: "6111", uns: "A96111", iso: "AlMgSi0.9Cu0.7", en: "EN AW-6111", jis: "A6111" },
      iso_group: "N",
      material_class: "Aluminum - Automotive",
      condition: "T4 (Solution + Natural Age)",

      composition: {
        aluminum: { min: 95.0, max: 97.8, typical: 96.4 },
        silicon: { min: 0.70, max: 1.1, typical: 0.90 },
        magnesium: { min: 0.50, max: 1.0, typical: 0.75 },
        copper: { min: 0.50, max: 0.90, typical: 0.70 },
        manganese: { min: 0.10, max: 0.45, typical: 0.28 },
        iron: { min: 0, max: 0.40, typical: 0.20 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.15, typical: 0.08 },
        titanium: { min: 0, max: 0.10, typical: 0.05 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 575, liquidus: 650 },
        specific_heat: 895,
        thermal_conductivity: 163,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 4.1e-8,
        electrical_conductivity_iacs: 42,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70000,
        shear_modulus: 26200
      },

      mechanical: {
        hardness: { brinell: 70, rockwell_b: 38, rockwell_c: null, vickers: 74 },
        tensile_strength: { min: 245, typical: 290, max: 320 },
        yield_strength: { min: 145, typical: 170, max: 200 },
        compressive_strength: { min: 145, typical: 170, max: 200 },
        elongation: { min: 22, typical: 26, max: 30 },
        reduction_of_area: { min: 48, typical: 55, max: 65 },
        impact_energy: { joules: 28, temperature: 20 },
        fatigue_strength: 95,
        fracture_toughness: 38
      },

      kienzle: { kc1_1: 540, mc: 0.26, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.2 },
      taylor: { C: 960, n: 0.37, reference_speed: 480, reference_life: 15, speed_range: { min: 175, max: 860 } },

      machinability: {
        aisi_rating: 80,
        relative_to_1212: 0.80,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.7,
        cutting_force_factor: 0.42,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "bue_flank"
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 315, opt: 530, max: 840 }, feed: { min: 0.14, opt: 0.32, max: 0.58 }, doc: { min: 1.0, opt: 4.2, max: 11.0 } },
          pcd: { speed: { min: 630, opt: 1060, max: 1580 }, feed: { min: 0.11, opt: 0.26, max: 0.46 }, doc: { min: 0.6, opt: 3.4, max: 8.5 } }
        },
        milling: { carbide_coated: { speed: { min: 255, opt: 440, max: 730 }, feed_per_tooth: { min: 0.11, opt: 0.25, max: 0.46 }, doc: { min: 1.0, opt: 4.2, max: 8.5 }, woc_factor: 0.76 } },
        drilling: { carbide: { speed: { min: 170, opt: 305, max: 490 }, feed_per_rev: { min: 0.14, opt: 0.32, max: 0.56 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 0.7, Rz: 4.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["automotive_body_panels", "doors", "hoods", "fenders", "structural_panels"],
      heat_treatment: { temper: "T4", solution_temp: 540, quench: "water", natural_aging: "4+ days" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "Automotive outer body panel alloy. Paint bake hardens to T4P (higher strength)."
    },

    "N-AL-047": {
      id: "N-AL-047",
      name: "6111-T4P Paint Bake Hardened",
      designation: { aa: "6111", uns: "A96111", iso: "AlMgSi0.9Cu0.7", en: "EN AW-6111", jis: "A6111" },
      iso_group: "N",
      material_class: "Aluminum - Automotive",
      condition: "T4P (Paint Bake Hardened)",

      composition: {
        aluminum: { min: 95.0, max: 97.8, typical: 96.4 },
        silicon: { min: 0.70, max: 1.1, typical: 0.90 },
        magnesium: { min: 0.50, max: 1.0, typical: 0.75 },
        copper: { min: 0.50, max: 0.90, typical: 0.70 },
        manganese: { min: 0.10, max: 0.45, typical: 0.28 }
      },

      physical: {
        density: 2710,
        melting_point: { solidus: 575, liquidus: 650 },
        specific_heat: 895,
        thermal_conductivity: 172,
        thermal_expansion: 23.4e-6,
        electrical_resistivity: 3.9e-8,
        electrical_conductivity_iacs: 44,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 70000,
        shear_modulus: 26200
      },

      mechanical: {
        hardness: { brinell: 95, rockwell_b: 55, rockwell_c: null, vickers: 100 },
        tensile_strength: { min: 290, typical: 340, max: 380 },
        yield_strength: { min: 235, typical: 290, max: 330 },
        compressive_strength: { min: 235, typical: 290, max: 330 },
        elongation: { min: 10, typical: 14, max: 18 },
        reduction_of_area: { min: 28, typical: 35, max: 44 },
        impact_energy: { joules: 20, temperature: 20 },
        fatigue_strength: 105,
        fracture_toughness: 30
      },

      kienzle: { kc1_1: 620, mc: 0.25, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 880, n: 0.35, reference_speed: 440, reference_life: 15, speed_range: { min: 160, max: 780 } },

      machinability: {
        aisi_rating: 95,
        relative_to_1212: 0.95,
        chip_form: "short_curled",
        surface_finish_achievable: 0.5,
        cutting_force_factor: 0.46,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 290, opt: 490, max: 780 }, feed: { min: 0.12, opt: 0.28, max: 0.52 }, doc: { min: 0.8, opt: 3.5, max: 9.0 } },
          pcd: { speed: { min: 580, opt: 980, max: 1460 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.8, max: 7.0 } }
        },
        milling: { carbide_coated: { speed: { min: 240, opt: 410, max: 680 }, feed_per_tooth: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.8, opt: 3.5, max: 7.0 }, woc_factor: 0.72 } },
        drilling: { carbide: { speed: { min: 155, opt: 280, max: 460 }, feed_per_rev: { min: 0.12, opt: 0.28, max: 0.50 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.03, surface_roughness_typical: { Ra: 0.5, Rz: 3.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["automotive_body_panels_painted", "structural_closures"],
      heat_treatment: { temper: "T4P", note: "Formed in T4, strength increases during paint cure at 170-180°C" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "Paint bake response alloy. Strength increases 50-70 MPa during automotive paint cure cycle."
    },

    "N-AL-048": {
      id: "N-AL-048",
      name: "6016-T4 Automotive Body (European)",
      designation: { aa: "6016", uns: "A96016", iso: "AlSi1.2Mg0.4", en: "EN AW-6016", jis: "A6016" },
      iso_group: "N",
      material_class: "Aluminum - Automotive",
      condition: "T4 (Solution + Natural Age)",

      composition: {
        aluminum: { min: 96.3, max: 98.8, typical: 97.6 },
        silicon: { min: 1.0, max: 1.5, typical: 1.25 },
        magnesium: { min: 0.25, max: 0.60, typical: 0.42 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        copper: { min: 0, max: 0.20, typical: 0.10 },
        manganese: { min: 0, max: 0.20, typical: 0.10 },
        chromium: { min: 0, max: 0.10, typical: 0.05 },
        zinc: { min: 0, max: 0.20, typical: 0.10 },
        titanium: { min: 0, max: 0.15, typical: 0.08 }
      },

      physical: {
        density: 2700,
        melting_point: { solidus: 588, liquidus: 652 },
        specific_heat: 896,
        thermal_conductivity: 180,
        thermal_expansion: 23.6e-6,
        electrical_resistivity: 3.7e-8,
        electrical_conductivity_iacs: 47,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69000,
        shear_modulus: 25800
      },

      mechanical: {
        hardness: { brinell: 65, rockwell_b: 35, rockwell_c: null, vickers: 68 },
        tensile_strength: { min: 200, typical: 225, max: 255 },
        yield_strength: { min: 100, typical: 115, max: 135 },
        compressive_strength: { min: 100, typical: 115, max: 135 },
        elongation: { min: 24, typical: 28, max: 32 },
        reduction_of_area: { min: 52, typical: 60, max: 70 },
        impact_energy: { joules: 30, temperature: 20 },
        fatigue_strength: 85,
        fracture_toughness: 40
      },

      kienzle: { kc1_1: 500, mc: 0.27, kc_adjust_rake: -4.0, kc_adjust_speed: -0.08, chip_compression: 2.1 },
      taylor: { C: 1020, n: 0.38, reference_speed: 520, reference_life: 15, speed_range: { min: 195, max: 940 } },

      machinability: {
        aisi_rating: 70,
        relative_to_1212: 0.70,
        chip_form: "continuous_long",
        surface_finish_achievable: 0.8,
        cutting_force_factor: 0.38,
        built_up_edge_tendency: "high",
        tool_wear_pattern: "bue_flank"
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 340, opt: 580, max: 900 }, feed: { min: 0.16, opt: 0.36, max: 0.65 }, doc: { min: 1.2, opt: 5.2, max: 13.0 } },
          pcd: { speed: { min: 680, opt: 1160, max: 1700 }, feed: { min: 0.13, opt: 0.29, max: 0.52 }, doc: { min: 0.8, opt: 4.2, max: 10.0 } }
        },
        milling: { carbide_coated: { speed: { min: 275, opt: 485, max: 785 }, feed_per_tooth: { min: 0.14, opt: 0.29, max: 0.52 }, doc: { min: 1.2, opt: 5.2, max: 10.0 }, woc_factor: 0.80 } },
        drilling: { carbide: { speed: { min: 185, opt: 340, max: 545 }, feed_per_rev: { min: 0.16, opt: 0.37, max: 0.62 } } }
      },

      surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.8, Rz: 4.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["automotive_outer_panels", "european_car_bodies", "closure_panels"],
      heat_treatment: { temper: "T4", solution_temp: 530, quench: "water", natural_aging: "4+ days" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "European automotive body alloy. Lower strength than 6111 but better formability and surface."
    },

    "N-AL-049": {
      id: "N-AL-049",
      name: "6201-T81 Electrical Conductor",
      designation: { aa: "6201", uns: "A96201", iso: "AlMgSi0.7", en: "EN AW-6101B", jis: "A6201" },
      iso_group: "N",
      material_class: "Aluminum - Electrical",
      condition: "T81 (Solution + Cold Draw + Artificial Age)",

      composition: {
        aluminum: { min: 97.5, max: 99.2, typical: 98.4 },
        silicon: { min: 0.50, max: 0.90, typical: 0.70 },
        magnesium: { min: 0.60, max: 0.90, typical: 0.75 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        copper: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.03, typical: 0.01 },
        chromium: { min: 0, max: 0.03, typical: 0.01 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        boron: { min: 0, max: 0.06, typical: 0.03 }
      },

      physical: {
        density: 2690,
        melting_point: { solidus: 607, liquidus: 654 },
        specific_heat: 900,
        thermal_conductivity: 218,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 3.0e-8,
        electrical_conductivity_iacs: 57,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69000,
        shear_modulus: 25800
      },

      mechanical: {
        hardness: { brinell: 90, rockwell_b: 52, rockwell_c: null, vickers: 95 },
        tensile_strength: { min: 310, typical: 330, max: 360 },
        yield_strength: { min: 276, typical: 295, max: 325 },
        compressive_strength: { min: 276, typical: 295, max: 325 },
        elongation: { min: 6, typical: 10, max: 14 },
        reduction_of_area: { min: 18, typical: 25, max: 32 },
        impact_energy: { joules: 14, temperature: 20 },
        fatigue_strength: 95,
        fracture_toughness: 25
      },

      kienzle: { kc1_1: 620, mc: 0.25, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.4 },
      taylor: { C: 880, n: 0.35, reference_speed: 440, reference_life: 15, speed_range: { min: 160, max: 780 } },

      machinability: {
        aisi_rating: 90,
        relative_to_1212: 0.90,
        chip_form: "short_curled",
        surface_finish_achievable: 0.6,
        cutting_force_factor: 0.46,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 290, opt: 490, max: 780 }, feed: { min: 0.12, opt: 0.28, max: 0.52 }, doc: { min: 0.8, opt: 3.5, max: 9.0 } },
          pcd: { speed: { min: 580, opt: 980, max: 1460 }, feed: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.5, opt: 2.8, max: 7.0 } }
        },
        milling: { carbide_coated: { speed: { min: 240, opt: 410, max: 680 }, feed_per_tooth: { min: 0.10, opt: 0.22, max: 0.42 }, doc: { min: 0.8, opt: 3.5, max: 7.0 }, woc_factor: 0.72 } },
        drilling: { carbide: { speed: { min: 155, opt: 280, max: 460 }, feed_per_rev: { min: 0.12, opt: 0.28, max: 0.50 } } }
      },

      surface_integrity: { residual_stress_tendency: "tensile", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.6, Rz: 3.5 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["electrical_bus_bars", "electrical_conductors", "power_transmission_wire", "ACSR_conductor"],
      heat_treatment: { temper: "T81", solution_temp: 510, quench: "water", cold_work: "wire_draw", artificial_aging: "175°C / 5h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "High-strength electrical conductor. ACSR core wire. 52% IACS minimum conductivity."
    },

    "N-AL-050": {
      id: "N-AL-050",
      name: "6101-T6 Electrical Bus Bar",
      designation: { aa: "6101", uns: "A96101", iso: "AlMgSi0.5", en: "EN AW-6101", jis: "A6101" },
      iso_group: "N",
      material_class: "Aluminum - Electrical",
      condition: "T6 (Solution + Artificial Age)",

      composition: {
        aluminum: { min: 97.8, max: 99.5, typical: 98.7 },
        silicon: { min: 0.30, max: 0.70, typical: 0.50 },
        magnesium: { min: 0.35, max: 0.80, typical: 0.58 },
        iron: { min: 0, max: 0.50, typical: 0.25 },
        copper: { min: 0, max: 0.10, typical: 0.05 },
        manganese: { min: 0, max: 0.03, typical: 0.01 },
        chromium: { min: 0, max: 0.03, typical: 0.01 },
        zinc: { min: 0, max: 0.10, typical: 0.05 },
        boron: { min: 0.003, max: 0.06, typical: 0.03 }
      },

      physical: {
        density: 2700,
        melting_point: { solidus: 621, liquidus: 654 },
        specific_heat: 895,
        thermal_conductivity: 218,
        thermal_expansion: 23.0e-6,
        electrical_resistivity: 2.98e-8,
        electrical_conductivity_iacs: 58,
        magnetic_permeability: 1.00,
        poissons_ratio: 0.33,
        elastic_modulus: 69000,
        shear_modulus: 25800
      },

      mechanical: {
        hardness: { brinell: 71, rockwell_b: 39, rockwell_c: null, vickers: 75 },
        tensile_strength: { min: 200, typical: 220, max: 250 },
        yield_strength: { min: 172, typical: 195, max: 225 },
        compressive_strength: { min: 172, typical: 195, max: 225 },
        elongation: { min: 12, typical: 16, max: 20 },
        reduction_of_area: { min: 30, typical: 38, max: 48 },
        impact_energy: { joules: 20, temperature: 20 },
        fatigue_strength: 70,
        fracture_toughness: 32
      },

      kienzle: { kc1_1: 540, mc: 0.26, kc_adjust_rake: -3.5, kc_adjust_speed: -0.08, chip_compression: 2.2 },
      taylor: { C: 960, n: 0.37, reference_speed: 480, reference_life: 15, speed_range: { min: 175, max: 860 } },

      machinability: {
        aisi_rating: 85,
        relative_to_1212: 0.85,
        chip_form: "continuous_curled",
        surface_finish_achievable: 0.7,
        cutting_force_factor: 0.42,
        built_up_edge_tendency: "moderate",
        tool_wear_pattern: "even_flank"
      },

      recommended_cutting: {
        turning: {
          carbide_coated: { speed: { min: 310, opt: 530, max: 840 }, feed: { min: 0.14, opt: 0.32, max: 0.58 }, doc: { min: 1.0, opt: 4.2, max: 11.0 } },
          pcd: { speed: { min: 620, opt: 1060, max: 1580 }, feed: { min: 0.11, opt: 0.26, max: 0.46 }, doc: { min: 0.6, opt: 3.4, max: 8.5 } }
        },
        milling: { carbide_coated: { speed: { min: 255, opt: 440, max: 730 }, feed_per_tooth: { min: 0.11, opt: 0.25, max: 0.46 }, doc: { min: 1.0, opt: 4.2, max: 8.5 }, woc_factor: 0.76 } },
        drilling: { carbide: { speed: { min: 170, opt: 305, max: 490 }, feed_per_rev: { min: 0.14, opt: 0.32, max: 0.56 } } }
      },

      surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardening_depth: 0.02, surface_roughness_typical: { Ra: 0.7, Rz: 4.0 } },
      coolant: { requirement: "recommended", recommended_type: "soluble_oil", mql_suitable: true, cryogenic_benefit: "minimal" },

      applications: ["electrical_bus_bars", "switchgear", "transformer_windings", "electrical_equipment"],
      heat_treatment: { temper: "T6", solution_temp: 510, quench: "water", artificial_aging: "175°C / 6h" },
      corrosion_resistance: { general: "excellent", stress_corrosion: "resistant" },
      notes: "Primary bus bar alloy. 55-58% IACS conductivity. Good strength for electrical applications."
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ALUMINUM_6XXX_031_050;
}
