/**
 * PRISM MATERIALS DATABASE - Aluminum 6xxx Series (Part 2)
 * File: aluminum_6xxx_045_050.js
 * Materials: N-AL-045 through N-AL-050
 * 
 * Completes 6xxx Series coverage
 * Parameters per material: 127
 * Schema version: 3.0.0
 * Created: 2026-01-25
 */

const ALUMINUM_6XXX_045_050 = {
  metadata: {
    file: "aluminum_6xxx_045_050.js",
    category: "N_NONFERROUS",
    subcategory: "Aluminum 6xxx Series",
    materialCount: 6,
    idRange: { start: "N-AL-045", end: "N-AL-050" },
    schemaVersion: "3.0.0"
  },

  materials: {
    "N-AL-045": {
      id: "N-AL-045",
      name: "6013-T651 Aerospace Plate",
      designation: { aa: "6013", uns: "A96013", iso: "AlMg1Si0.8CuMn", en: "EN AW-6013" },
      iso_group: "N",
      material_class: "Aluminum - Aerospace Structural",
      condition: "T651 (Solution + Stretch + Artificial Age)",
      composition: { aluminum: { typical: 96.7 }, magnesium: { typical: 1.0 }, silicon: { typical: 0.80 }, copper: { typical: 0.85 }, manganese: { typical: 0.50 } },
      physical: { density: 2710, thermal_conductivity: 163, elastic_modulus: 69600 },
      mechanical: { hardness: { brinell: 110 }, tensile_strength: { typical: 395 }, yield_strength: { typical: 365 }, elongation: { typical: 10 }, fatigue_strength: 105, fracture_toughness: 32 },
      kienzle: { kc1_1: 700, mc: 0.24, chip_compression: 2.5 },
      taylor: { C: 820, n: 0.34, reference_speed: 410 },
      machinability: { aisi_rating: 105, chip_form: "short_curled", built_up_edge_tendency: "low" },
      recommended_cutting: { turning: { carbide_coated: { speed: { opt: 460 }, feed: { opt: 0.26 }, doc: { opt: 3.2 } } } },
      applications: ["aircraft_plate", "precision_machining", "aerospace_structures"],
      notes: "Stress-relieved 6013 plate. Aerospace precision machining applications."
    },

    "N-AL-046": {
      id: "N-AL-046",
      name: "6101-T6 Electrical Conductor",
      designation: { aa: "6101", uns: "A96101", iso: "AlMgSi0.5", en: "EN AW-6101" },
      iso_group: "N",
      material_class: "Aluminum - Electrical",
      condition: "T6 (Solution + Artificial Age)",
      composition: { aluminum: { typical: 98.5 }, magnesium: { typical: 0.55 }, silicon: { typical: 0.50 }, boron: { typical: 0.01 } },
      physical: { density: 2700, thermal_conductivity: 218, electrical_conductivity_iacs: 57 },
      mechanical: { hardness: { brinell: 71 }, tensile_strength: { typical: 220 }, yield_strength: { typical: 195 }, elongation: { typical: 15 } },
      kienzle: { kc1_1: 520, mc: 0.26 },
      taylor: { C: 980, n: 0.37, reference_speed: 500 },
      machinability: { aisi_rating: 75, chip_form: "continuous_curled", built_up_edge_tendency: "high" },
      recommended_cutting: { turning: { carbide_coated: { speed: { opt: 550 }, feed: { opt: 0.32 }, doc: { opt: 4.0 } } } },
      applications: ["bus_bars", "electrical_conductors", "switch_gear", "transformer_windings"],
      notes: "High electrical conductivity 6xxx. 57% IACS. Bus bar and conductor alloy."
    },

    "N-AL-047": {
      id: "N-AL-047",
      name: "6201-T81 Electrical Wire",
      designation: { aa: "6201", uns: "A96201", iso: "AlMgSi", en: "EN AW-6201" },
      iso_group: "N",
      material_class: "Aluminum - Electrical Wire",
      condition: "T81 (Solution + Cold Draw + Artificial Age)",
      composition: { aluminum: { typical: 98.2 }, magnesium: { typical: 0.70 }, silicon: { typical: 0.70 } },
      physical: { density: 2690, thermal_conductivity: 201, electrical_conductivity_iacs: 52.5 },
      mechanical: { hardness: { brinell: 95 }, tensile_strength: { typical: 330 }, yield_strength: { typical: 315 }, elongation: { typical: 6 } },
      kienzle: { kc1_1: 620, mc: 0.25 },
      taylor: { C: 880, n: 0.35, reference_speed: 440 },
      machinability: { aisi_rating: 90, chip_form: "short_curled", built_up_edge_tendency: "moderate" },
      recommended_cutting: { turning: { carbide_coated: { speed: { opt: 480 }, feed: { opt: 0.28 }, doc: { opt: 3.5 } } } },
      applications: ["overhead_transmission_wire", "ACSR_conductors", "electrical_cable"],
      notes: "High-strength electrical wire alloy. ACSR (Aluminum Conductor Steel Reinforced) applications."
    },

    "N-AL-048": {
      id: "N-AL-048",
      name: "6066-T6 High Strength Forging",
      designation: { aa: "6066", uns: "A96066", iso: "AlSi1.3Mg1CuMn", en: "EN AW-6066" },
      iso_group: "N",
      material_class: "Aluminum - Forging",
      condition: "T6 (Solution + Artificial Age)",
      composition: { aluminum: { typical: 95.7 }, silicon: { typical: 1.3 }, magnesium: { typical: 1.1 }, copper: { typical: 0.95 }, manganese: { typical: 0.90 } },
      physical: { density: 2710, thermal_conductivity: 147, elastic_modulus: 69000 },
      mechanical: { hardness: { brinell: 120 }, tensile_strength: { typical: 395 }, yield_strength: { typical: 360 }, elongation: { typical: 9 }, fatigue_strength: 110, fracture_toughness: 26 },
      kienzle: { kc1_1: 720, mc: 0.24 },
      taylor: { C: 800, n: 0.33, reference_speed: 400 },
      machinability: { aisi_rating: 85, chip_form: "short_curled", built_up_edge_tendency: "low" },
      recommended_cutting: { turning: { carbide_coated: { speed: { opt: 440 }, feed: { opt: 0.26 }, doc: { opt: 3.0 } } } },
      applications: ["forgings", "welded_structures", "pipelines", "marine_fittings"],
      notes: "High-strength forging 6xxx. Good weldability with high strength. Pipeline fittings."
    },

    "N-AL-049": {
      id: "N-AL-049",
      name: "6070-T6 High Strength Structural",
      designation: { aa: "6070", uns: "A96070", iso: "AlSi1.4Mg", en: "EN AW-6070" },
      iso_group: "N",
      material_class: "Aluminum - High Strength Structural",
      condition: "T6 (Solution + Artificial Age)",
      composition: { aluminum: { typical: 96.0 }, silicon: { typical: 1.4 }, magnesium: { typical: 0.80 }, copper: { typical: 0.28 }, manganese: { typical: 0.70 } },
      physical: { density: 2710, thermal_conductivity: 172, elastic_modulus: 69600 },
      mechanical: { hardness: { brinell: 110 }, tensile_strength: { typical: 380 }, yield_strength: { typical: 350 }, elongation: { typical: 10 }, fatigue_strength: 105, fracture_toughness: 28 },
      kienzle: { kc1_1: 700, mc: 0.24 },
      taylor: { C: 820, n: 0.34, reference_speed: 410 },
      machinability: { aisi_rating: 90, chip_form: "short_curled", built_up_edge_tendency: "moderate" },
      recommended_cutting: { turning: { carbide_coated: { speed: { opt: 450 }, feed: { opt: 0.26 }, doc: { opt: 3.2 } } } },
      applications: ["automotive_structures", "welded_assemblies", "hydraulic_tubing"],
      notes: "High-strength 6xxx. Improved tensile over 6061. Automotive structural applications."
    },

    "N-AL-050": {
      id: "N-AL-050",
      name: "6151-T6 Forging Die Stock",
      designation: { aa: "6151", uns: "A96151", iso: "AlSi1MgCr", en: "EN AW-6151" },
      iso_group: "N",
      material_class: "Aluminum - Die Forging",
      condition: "T6 (Solution + Artificial Age)",
      composition: { aluminum: { typical: 97.0 }, silicon: { typical: 0.95 }, magnesium: { typical: 0.60 }, chromium: { typical: 0.22 } },
      physical: { density: 2700, thermal_conductivity: 167, elastic_modulus: 68900 },
      mechanical: { hardness: { brinell: 100 }, tensile_strength: { typical: 330 }, yield_strength: { typical: 300 }, elongation: { typical: 14 }, fatigue_strength: 95, fracture_toughness: 30 },
      kienzle: { kc1_1: 660, mc: 0.25 },
      taylor: { C: 860, n: 0.35, reference_speed: 430 },
      machinability: { aisi_rating: 95, chip_form: "short_curled", built_up_edge_tendency: "moderate" },
      recommended_cutting: { turning: { carbide_coated: { speed: { opt: 470 }, feed: { opt: 0.28 }, doc: { opt: 3.5 } } } },
      applications: ["intricate_die_forgings", "machine_screw_products", "close_tolerance_parts"],
      notes: "Intricate die forging alloy. Excellent response to forging. Close tolerance parts."
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ALUMINUM_6XXX_045_050;
}
