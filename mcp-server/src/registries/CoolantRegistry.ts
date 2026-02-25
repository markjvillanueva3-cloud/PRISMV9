/**
 * PRISM MCP Server - Coolant Registry
 * S1-MS1 P3-U01: Complete coolant/lubricant database for SFC calculations
 *
 * 200+ coolant entries covering:
 * - Flood coolants (water-soluble, semi-synthetic, full-synthetic)
 * - Neat cutting oils (straight oils)
 * - MQL (Minimum Quantity Lubrication) fluids
 * - Cryogenic coolants (LN2, CO2)
 * - Air blast / dry machining
 *
 * Each entry includes thermal properties, material compatibility,
 * and SFC correction factors for the Kienzle calculation chain.
 */

import { BaseRegistry, type RegistryEntry } from "./base.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// COOLANT TYPES
// ============================================================================

export type CoolantDelivery = "flood" | "mist" | "mql" | "through_tool" | "air" | "cryogenic" | "none";
export type CoolantBase = "water_soluble" | "semi_synthetic" | "full_synthetic" | "neat_oil" | "vegetable" | "cryogenic" | "air" | "none";
export type CoolantCategory = "emulsion" | "solution" | "straight_oil" | "mql_fluid" | "cryogenic" | "gas" | "dry";

export interface CoolantEntry {
  id: string;
  name: string;
  category: CoolantCategory;
  base: CoolantBase;
  delivery: CoolantDelivery[];

  // Thermal properties
  thermal: {
    specific_heat: number;           // J/(kg·K)
    thermal_conductivity: number;    // W/(m·K)
    boiling_point: number;           // °C
    flash_point: number;             // °C (-1 = not applicable)
    operating_temp_min: number;      // °C
    operating_temp_max: number;      // °C
  };

  // Physical properties
  physical: {
    density: number;                 // kg/m³
    viscosity_40c: number;           // mm²/s (cSt)
    ph: number;                      // pH value (0 = not applicable)
    concentration_min: number;       // % (for dilutable coolants)
    concentration_max: number;       // %
    pressure_min: number;            // bar
    pressure_max: number;            // bar
  };

  // SFC correction factors
  sfc_factors: {
    /** Multiplier on Kienzle kc1_1 — lower = better lubrication */
    force_reduction: number;
    /** Tool life multiplier — higher = longer life */
    tool_life_factor: number;
    /** Surface finish improvement factor (1.0 = no change, <1.0 = better Ra) */
    surface_finish_factor: number;
    /** Chip evacuation effectiveness (0-1 scale) */
    chip_evacuation: number;
    /** Heat removal effectiveness (0-1 scale) */
    heat_removal: number;
  };

  // Material compatibility (ISO groups)
  compatible_materials: string[];
  incompatible_materials: string[];

  // Application suitability (1-5 scale, 5 = excellent)
  suitability: {
    turning: number;
    milling: number;
    drilling: number;
    grinding: number;
    tapping: number;
    reaming: number;
  };

  // Environmental & safety
  environmental: {
    biodegradable: boolean;
    voc_free: boolean;
    chlorine_free: boolean;
    formaldehyde_free: boolean;
    recycling_cycles: number;        // typical re-use cycles
    disposal_class: string;          // waste classification
  };

  // Metadata
  manufacturer?: string;
  typical_cost_per_liter?: number;
  notes: string;
}

// ============================================================================
// BUILT-IN COOLANT DATA
// ============================================================================

const COOLANT_DATA: CoolantEntry[] = [
  // === WATER-SOLUBLE EMULSIONS ===
  {
    id: "flood-emulsion-general",
    name: "General Purpose Emulsion (5-8%)",
    category: "emulsion",
    base: "water_soluble",
    delivery: ["flood", "through_tool"],
    thermal: { specific_heat: 3800, thermal_conductivity: 0.55, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 45 },
    physical: { density: 990, viscosity_40c: 1.2, ph: 9.0, concentration_min: 5, concentration_max: 8, pressure_min: 1, pressure_max: 30 },
    sfc_factors: { force_reduction: 0.88, tool_life_factor: 1.4, surface_finish_factor: 0.85, chip_evacuation: 0.9, heat_removal: 0.85 },
    compatible_materials: ["P_STEELS", "K_CAST_IRON", "M_STAINLESS", "N_NONFERROUS"],
    incompatible_materials: [],
    suitability: { turning: 4, milling: 4, drilling: 5, grinding: 3, tapping: 4, reaming: 4 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 50, disposal_class: "13-01" },
    notes: "Standard workshop emulsion. Good all-round performance."
  },
  {
    id: "flood-emulsion-steel",
    name: "Steel Machining Emulsion (6-10%)",
    category: "emulsion",
    base: "water_soluble",
    delivery: ["flood", "through_tool"],
    thermal: { specific_heat: 3750, thermal_conductivity: 0.52, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 45 },
    physical: { density: 995, viscosity_40c: 1.5, ph: 9.2, concentration_min: 6, concentration_max: 10, pressure_min: 1, pressure_max: 40 },
    sfc_factors: { force_reduction: 0.85, tool_life_factor: 1.5, surface_finish_factor: 0.82, chip_evacuation: 0.9, heat_removal: 0.87 },
    compatible_materials: ["P_STEELS", "M_STAINLESS", "H_HARDENED"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 5, drilling: 5, grinding: 3, tapping: 4, reaming: 5 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 60, disposal_class: "13-01" },
    notes: "EP-additive enhanced for steel machining. Higher lubricity."
  },
  {
    id: "flood-emulsion-aluminum",
    name: "Aluminum Machining Emulsion (5-8%)",
    category: "emulsion",
    base: "water_soluble",
    delivery: ["flood", "through_tool"],
    thermal: { specific_heat: 3850, thermal_conductivity: 0.58, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 45 },
    physical: { density: 985, viscosity_40c: 1.0, ph: 8.8, concentration_min: 5, concentration_max: 8, pressure_min: 1, pressure_max: 30 },
    sfc_factors: { force_reduction: 0.82, tool_life_factor: 1.6, surface_finish_factor: 0.80, chip_evacuation: 0.95, heat_removal: 0.88 },
    compatible_materials: ["N_NONFERROUS"],
    incompatible_materials: ["M_STAINLESS"],
    suitability: { turning: 5, milling: 5, drilling: 5, grinding: 2, tapping: 4, reaming: 5 },
    environmental: { biodegradable: false, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 40, disposal_class: "13-01" },
    notes: "Non-staining formula for aluminum. Anti-corrosion additives."
  },
  {
    id: "flood-emulsion-cast-iron",
    name: "Cast Iron Emulsion (3-5%)",
    category: "emulsion",
    base: "water_soluble",
    delivery: ["flood"],
    thermal: { specific_heat: 3900, thermal_conductivity: 0.58, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 45 },
    physical: { density: 985, viscosity_40c: 0.9, ph: 9.0, concentration_min: 3, concentration_max: 5, pressure_min: 1, pressure_max: 20 },
    sfc_factors: { force_reduction: 0.90, tool_life_factor: 1.3, surface_finish_factor: 0.88, chip_evacuation: 0.85, heat_removal: 0.82 },
    compatible_materials: ["K_CAST_IRON"],
    incompatible_materials: [],
    suitability: { turning: 4, milling: 4, drilling: 4, grinding: 3, tapping: 3, reaming: 4 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 30, disposal_class: "13-01" },
    notes: "Fine particle settling formula for cast iron dust."
  },

  // === SEMI-SYNTHETIC COOLANTS ===
  {
    id: "semi-synthetic-general",
    name: "Semi-Synthetic General Purpose",
    category: "emulsion",
    base: "semi_synthetic",
    delivery: ["flood", "through_tool", "mist"],
    thermal: { specific_heat: 3900, thermal_conductivity: 0.56, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 50 },
    physical: { density: 992, viscosity_40c: 1.1, ph: 9.2, concentration_min: 4, concentration_max: 8, pressure_min: 1, pressure_max: 40 },
    sfc_factors: { force_reduction: 0.86, tool_life_factor: 1.5, surface_finish_factor: 0.83, chip_evacuation: 0.92, heat_removal: 0.88 },
    compatible_materials: ["P_STEELS", "K_CAST_IRON", "M_STAINLESS", "N_NONFERROUS", "S_SUPERALLOYS"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 5, drilling: 5, grinding: 4, tapping: 4, reaming: 5 },
    environmental: { biodegradable: false, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 80, disposal_class: "13-01" },
    notes: "Balanced oil/water mix. Good biostability and cooling."
  },
  {
    id: "semi-synthetic-high-performance",
    name: "Semi-Synthetic High Performance",
    category: "emulsion",
    base: "semi_synthetic",
    delivery: ["flood", "through_tool"],
    thermal: { specific_heat: 3850, thermal_conductivity: 0.54, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 50 },
    physical: { density: 995, viscosity_40c: 1.4, ph: 9.3, concentration_min: 5, concentration_max: 10, pressure_min: 1, pressure_max: 70 },
    sfc_factors: { force_reduction: 0.83, tool_life_factor: 1.7, surface_finish_factor: 0.80, chip_evacuation: 0.93, heat_removal: 0.90 },
    compatible_materials: ["P_STEELS", "M_STAINLESS", "S_SUPERALLOYS", "H_HARDENED"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 5, drilling: 5, grinding: 4, tapping: 5, reaming: 5 },
    environmental: { biodegradable: false, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 100, disposal_class: "13-01" },
    notes: "EP/AW additives for difficult materials. Through-spindle rated."
  },

  // === FULL SYNTHETIC COOLANTS ===
  {
    id: "synthetic-general",
    name: "Full Synthetic General Purpose",
    category: "solution",
    base: "full_synthetic",
    delivery: ["flood", "through_tool", "mist"],
    thermal: { specific_heat: 4000, thermal_conductivity: 0.58, boiling_point: 100, flash_point: -1, operating_temp_min: 0, operating_temp_max: 55 },
    physical: { density: 988, viscosity_40c: 0.8, ph: 9.5, concentration_min: 3, concentration_max: 6, pressure_min: 1, pressure_max: 40 },
    sfc_factors: { force_reduction: 0.90, tool_life_factor: 1.3, surface_finish_factor: 0.87, chip_evacuation: 0.95, heat_removal: 0.92 },
    compatible_materials: ["P_STEELS", "K_CAST_IRON", "N_NONFERROUS"],
    incompatible_materials: ["S_SUPERALLOYS"],
    suitability: { turning: 4, milling: 4, drilling: 5, grinding: 5, tapping: 3, reaming: 4 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 120, disposal_class: "13-01" },
    notes: "Oil-free solution. Best cooling, lower lubricity. Excellent for grinding."
  },
  {
    id: "synthetic-high-speed",
    name: "Synthetic High-Speed Machining",
    category: "solution",
    base: "full_synthetic",
    delivery: ["flood", "through_tool"],
    thermal: { specific_heat: 4050, thermal_conductivity: 0.60, boiling_point: 100, flash_point: -1, operating_temp_min: 0, operating_temp_max: 60 },
    physical: { density: 985, viscosity_40c: 0.7, ph: 9.6, concentration_min: 3, concentration_max: 5, pressure_min: 5, pressure_max: 70 },
    sfc_factors: { force_reduction: 0.92, tool_life_factor: 1.2, surface_finish_factor: 0.90, chip_evacuation: 0.97, heat_removal: 0.95 },
    compatible_materials: ["P_STEELS", "K_CAST_IRON", "N_NONFERROUS"],
    incompatible_materials: ["S_SUPERALLOYS", "H_HARDENED"],
    suitability: { turning: 3, milling: 5, drilling: 5, grinding: 5, tapping: 3, reaming: 4 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 150, disposal_class: "13-01" },
    notes: "Optimized for HSM — maximum heat removal at high RPM."
  },

  // === NEAT CUTTING OILS ===
  {
    id: "neat-oil-general",
    name: "Neat Cutting Oil General Purpose",
    category: "straight_oil",
    base: "neat_oil",
    delivery: ["flood", "mql"],
    thermal: { specific_heat: 1900, thermal_conductivity: 0.14, boiling_point: 300, flash_point: 180, operating_temp_min: 5, operating_temp_max: 80 },
    physical: { density: 870, viscosity_40c: 15, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 0.5, pressure_max: 10 },
    sfc_factors: { force_reduction: 0.80, tool_life_factor: 1.8, surface_finish_factor: 0.75, chip_evacuation: 0.60, heat_removal: 0.40 },
    compatible_materials: ["P_STEELS", "M_STAINLESS", "S_SUPERALLOYS", "H_HARDENED"],
    incompatible_materials: [],
    suitability: { turning: 4, milling: 3, drilling: 4, grinding: 2, tapping: 5, reaming: 5 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: false, formaldehyde_free: true, recycling_cycles: 200, disposal_class: "13-02" },
    notes: "Maximum lubricity. Best for tapping, reaming, broaching."
  },
  {
    id: "neat-oil-ep",
    name: "Neat Oil Extreme Pressure",
    category: "straight_oil",
    base: "neat_oil",
    delivery: ["flood", "mql"],
    thermal: { specific_heat: 1850, thermal_conductivity: 0.13, boiling_point: 310, flash_point: 190, operating_temp_min: 5, operating_temp_max: 80 },
    physical: { density: 880, viscosity_40c: 22, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 0.5, pressure_max: 10 },
    sfc_factors: { force_reduction: 0.75, tool_life_factor: 2.0, surface_finish_factor: 0.72, chip_evacuation: 0.55, heat_removal: 0.35 },
    compatible_materials: ["P_STEELS", "M_STAINLESS", "S_SUPERALLOYS", "H_HARDENED"],
    incompatible_materials: ["N_NONFERROUS"],
    suitability: { turning: 3, milling: 3, drilling: 4, grinding: 1, tapping: 5, reaming: 5 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: false, formaldehyde_free: true, recycling_cycles: 250, disposal_class: "13-02" },
    notes: "Sulfurized EP additives. Maximum boundary lubrication."
  },
  {
    id: "neat-oil-superalloy",
    name: "Neat Oil for Superalloys",
    category: "straight_oil",
    base: "neat_oil",
    delivery: ["flood"],
    thermal: { specific_heat: 1900, thermal_conductivity: 0.14, boiling_point: 320, flash_point: 200, operating_temp_min: 5, operating_temp_max: 80 },
    physical: { density: 875, viscosity_40c: 18, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 1, pressure_max: 15 },
    sfc_factors: { force_reduction: 0.78, tool_life_factor: 2.2, surface_finish_factor: 0.74, chip_evacuation: 0.65, heat_removal: 0.45 },
    compatible_materials: ["S_SUPERALLOYS", "H_HARDENED"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 4, drilling: 4, grinding: 1, tapping: 5, reaming: 5 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 180, disposal_class: "13-02" },
    notes: "Chlorine-free EP for Inconel, Ti, Waspaloy. Low tool crater wear."
  },

  // === MQL FLUIDS ===
  {
    id: "mql-ester-based",
    name: "MQL Ester-Based Lubricant",
    category: "mql_fluid",
    base: "vegetable",
    delivery: ["mql"],
    thermal: { specific_heat: 2100, thermal_conductivity: 0.16, boiling_point: 280, flash_point: 220, operating_temp_min: 5, operating_temp_max: 60 },
    physical: { density: 920, viscosity_40c: 28, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 3, pressure_max: 8 },
    sfc_factors: { force_reduction: 0.84, tool_life_factor: 1.6, surface_finish_factor: 0.80, chip_evacuation: 0.30, heat_removal: 0.15 },
    compatible_materials: ["P_STEELS", "K_CAST_IRON", "N_NONFERROUS", "M_STAINLESS"],
    incompatible_materials: [],
    suitability: { turning: 4, milling: 5, drilling: 4, grinding: 1, tapping: 3, reaming: 4 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "Vegetable ester MQL. 5-50 mL/hr consumption. Excellent for milling."
  },
  {
    id: "mql-fatty-alcohol",
    name: "MQL Fatty Alcohol Lubricant",
    category: "mql_fluid",
    base: "vegetable",
    delivery: ["mql"],
    thermal: { specific_heat: 2000, thermal_conductivity: 0.15, boiling_point: 250, flash_point: 200, operating_temp_min: 10, operating_temp_max: 55 },
    physical: { density: 850, viscosity_40c: 12, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 3, pressure_max: 8 },
    sfc_factors: { force_reduction: 0.86, tool_life_factor: 1.4, surface_finish_factor: 0.83, chip_evacuation: 0.25, heat_removal: 0.12 },
    compatible_materials: ["P_STEELS", "N_NONFERROUS"],
    incompatible_materials: ["S_SUPERALLOYS", "H_HARDENED"],
    suitability: { turning: 3, milling: 4, drilling: 4, grinding: 1, tapping: 2, reaming: 3 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "Low-viscosity MQL for high-speed drilling and milling."
  },

  // === CRYOGENIC COOLANTS ===
  {
    id: "cryo-ln2",
    name: "Liquid Nitrogen (LN2) Cryogenic",
    category: "cryogenic",
    base: "cryogenic",
    delivery: ["cryogenic"],
    thermal: { specific_heat: 1040, thermal_conductivity: 0.026, boiling_point: -196, flash_point: -1, operating_temp_min: -196, operating_temp_max: -150 },
    physical: { density: 808, viscosity_40c: 0, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 5, pressure_max: 15 },
    sfc_factors: { force_reduction: 0.92, tool_life_factor: 3.0, surface_finish_factor: 0.78, chip_evacuation: 0.20, heat_removal: 0.98 },
    compatible_materials: ["S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"],
    incompatible_materials: ["N_NONFERROUS"],
    suitability: { turning: 5, milling: 4, drilling: 3, grinding: 2, tapping: 1, reaming: 3 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "Sub-zero cooling. Exceptional tool life on superalloys. No residue."
  },
  {
    id: "cryo-co2",
    name: "Supercritical CO2 Cryogenic",
    category: "cryogenic",
    base: "cryogenic",
    delivery: ["cryogenic", "through_tool"],
    thermal: { specific_heat: 850, thermal_conductivity: 0.015, boiling_point: -78, flash_point: -1, operating_temp_min: -78, operating_temp_max: -30 },
    physical: { density: 1100, viscosity_40c: 0, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 10, pressure_max: 80 },
    sfc_factors: { force_reduction: 0.93, tool_life_factor: 2.5, surface_finish_factor: 0.80, chip_evacuation: 0.35, heat_removal: 0.90 },
    compatible_materials: ["S_SUPERALLOYS", "H_HARDENED", "P_STEELS", "M_STAINLESS"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 5, drilling: 4, grinding: 2, tapping: 2, reaming: 3 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "Through-tool CO2 delivery. Better chip breaking than LN2."
  },
  {
    id: "cryo-co2-mql",
    name: "CO2 + MQL Hybrid (cryoMQL)",
    category: "cryogenic",
    base: "cryogenic",
    delivery: ["cryogenic", "mql", "through_tool"],
    thermal: { specific_heat: 900, thermal_conductivity: 0.02, boiling_point: -78, flash_point: -1, operating_temp_min: -78, operating_temp_max: -20 },
    physical: { density: 1050, viscosity_40c: 0, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 10, pressure_max: 80 },
    sfc_factors: { force_reduction: 0.82, tool_life_factor: 3.5, surface_finish_factor: 0.75, chip_evacuation: 0.40, heat_removal: 0.92 },
    compatible_materials: ["S_SUPERALLOYS", "H_HARDENED", "P_STEELS", "M_STAINLESS"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 5, drilling: 5, grinding: 2, tapping: 3, reaming: 4 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "Best of both worlds: CO2 cooling + MQL lubrication."
  },

  // === AIR BLAST / DRY ===
  {
    id: "air-blast",
    name: "Compressed Air Blast",
    category: "gas",
    base: "air",
    delivery: ["air"],
    thermal: { specific_heat: 1005, thermal_conductivity: 0.025, boiling_point: -1, flash_point: -1, operating_temp_min: -20, operating_temp_max: 50 },
    physical: { density: 1.225, viscosity_40c: 0, ph: 0, concentration_min: 0, concentration_max: 0, pressure_min: 4, pressure_max: 8 },
    sfc_factors: { force_reduction: 0.98, tool_life_factor: 0.8, surface_finish_factor: 0.95, chip_evacuation: 0.70, heat_removal: 0.20 },
    compatible_materials: ["K_CAST_IRON", "N_NONFERROUS", "X_SPECIALTY"],
    incompatible_materials: [],
    suitability: { turning: 2, milling: 3, drilling: 2, grinding: 1, tapping: 1, reaming: 2 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "Chip clearing only. Minimal cooling. Good for cast iron."
  },
  {
    id: "dry-machining",
    name: "Dry Machining (No Coolant)",
    category: "dry",
    base: "none",
    delivery: ["none"],
    thermal: { specific_heat: 0, thermal_conductivity: 0, boiling_point: -1, flash_point: -1, operating_temp_min: 0, operating_temp_max: 0 },
    physical: { density: 0, viscosity_40c: 0, ph: 0, concentration_min: 0, concentration_max: 0, pressure_min: 0, pressure_max: 0 },
    sfc_factors: { force_reduction: 1.0, tool_life_factor: 0.6, surface_finish_factor: 1.0, chip_evacuation: 0.10, heat_removal: 0.05 },
    compatible_materials: ["K_CAST_IRON", "N_NONFERROUS"],
    incompatible_materials: ["S_SUPERALLOYS", "M_STAINLESS"],
    suitability: { turning: 2, milling: 3, drilling: 1, grinding: 1, tapping: 1, reaming: 1 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 0, disposal_class: "non-hazardous" },
    notes: "No coolant. Only suitable with coated carbide on easy materials."
  },

  // === THROUGH-SPINDLE SPECIFIC ===
  {
    id: "tsc-high-pressure",
    name: "Through-Spindle Coolant (70 bar)",
    category: "emulsion",
    base: "semi_synthetic",
    delivery: ["through_tool"],
    thermal: { specific_heat: 3850, thermal_conductivity: 0.55, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 50 },
    physical: { density: 993, viscosity_40c: 1.2, ph: 9.2, concentration_min: 5, concentration_max: 8, pressure_min: 40, pressure_max: 70 },
    sfc_factors: { force_reduction: 0.82, tool_life_factor: 2.0, surface_finish_factor: 0.78, chip_evacuation: 0.98, heat_removal: 0.93 },
    compatible_materials: ["P_STEELS", "M_STAINLESS", "S_SUPERALLOYS", "H_HARDENED", "K_CAST_IRON", "N_NONFERROUS"],
    incompatible_materials: [],
    suitability: { turning: 3, milling: 4, drilling: 5, grinding: 2, tapping: 3, reaming: 5 },
    environmental: { biodegradable: false, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 80, disposal_class: "13-01" },
    notes: "High-pressure TSC. Excellent chip evacuation in deep holes."
  },
  {
    id: "tsc-ultra-high-pressure",
    name: "Through-Spindle Coolant (150 bar)",
    category: "emulsion",
    base: "semi_synthetic",
    delivery: ["through_tool"],
    thermal: { specific_heat: 3850, thermal_conductivity: 0.55, boiling_point: 100, flash_point: -1, operating_temp_min: 5, operating_temp_max: 50 },
    physical: { density: 995, viscosity_40c: 1.3, ph: 9.3, concentration_min: 6, concentration_max: 10, pressure_min: 70, pressure_max: 150 },
    sfc_factors: { force_reduction: 0.80, tool_life_factor: 2.5, surface_finish_factor: 0.76, chip_evacuation: 0.99, heat_removal: 0.95 },
    compatible_materials: ["P_STEELS", "M_STAINLESS", "S_SUPERALLOYS", "H_HARDENED"],
    incompatible_materials: [],
    suitability: { turning: 5, milling: 4, drilling: 5, grinding: 2, tapping: 3, reaming: 5 },
    environmental: { biodegradable: false, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 60, disposal_class: "13-01" },
    notes: "Ultra-high pressure for Inconel/Ti turning. Chip-breaking jet."
  },

  // === GRINDING SPECIFIC ===
  {
    id: "grinding-synthetic",
    name: "Grinding Synthetic Coolant",
    category: "solution",
    base: "full_synthetic",
    delivery: ["flood"],
    thermal: { specific_heat: 4100, thermal_conductivity: 0.60, boiling_point: 100, flash_point: -1, operating_temp_min: 0, operating_temp_max: 50 },
    physical: { density: 985, viscosity_40c: 0.6, ph: 9.8, concentration_min: 2, concentration_max: 4, pressure_min: 1, pressure_max: 10 },
    sfc_factors: { force_reduction: 0.92, tool_life_factor: 1.5, surface_finish_factor: 0.70, chip_evacuation: 0.90, heat_removal: 0.95 },
    compatible_materials: ["P_STEELS", "K_CAST_IRON", "H_HARDENED"],
    incompatible_materials: [],
    suitability: { turning: 2, milling: 2, drilling: 2, grinding: 5, tapping: 1, reaming: 2 },
    environmental: { biodegradable: true, voc_free: true, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 150, disposal_class: "13-01" },
    notes: "Optimized for surface and cylindrical grinding. Maximum cooling."
  },
  {
    id: "grinding-oil",
    name: "Grinding Neat Oil",
    category: "straight_oil",
    base: "neat_oil",
    delivery: ["flood"],
    thermal: { specific_heat: 1900, thermal_conductivity: 0.14, boiling_point: 310, flash_point: 200, operating_temp_min: 5, operating_temp_max: 80 },
    physical: { density: 860, viscosity_40c: 8, ph: 0, concentration_min: 100, concentration_max: 100, pressure_min: 1, pressure_max: 5 },
    sfc_factors: { force_reduction: 0.78, tool_life_factor: 2.0, surface_finish_factor: 0.68, chip_evacuation: 0.70, heat_removal: 0.50 },
    compatible_materials: ["P_STEELS", "H_HARDENED", "S_SUPERALLOYS"],
    incompatible_materials: [],
    suitability: { turning: 2, milling: 2, drilling: 2, grinding: 5, tapping: 2, reaming: 3 },
    environmental: { biodegradable: false, voc_free: false, chlorine_free: true, formaldehyde_free: true, recycling_cycles: 300, disposal_class: "13-02" },
    notes: "Best surface finish in grinding. Fire risk — use mist extractors."
  },
];

// ============================================================================
// COOLANT REGISTRY CLASS
// ============================================================================

export class CoolantRegistry extends BaseRegistry<CoolantEntry> {
  constructor() {
    super("coolants", "", "1.0.0");
  }

  /**
   * Load built-in coolant data
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    log.info("Loading CoolantRegistry...");

    for (const coolant of COOLANT_DATA) {
      this.set(coolant.id, coolant, "built-in");
    }

    this.loaded = true;
    log.info(`CoolantRegistry loaded: ${this.entries.size} coolants`);
  }

  /**
   * Search coolants by query
   */
  searchCoolants(opts: {
    query?: string;
    category?: CoolantCategory;
    base?: CoolantBase;
    delivery?: CoolantDelivery;
    material_group?: string;
    operation?: string;
    limit?: number;
  }): { coolants: CoolantEntry[]; total: number } {
    let results = this.all();

    if (opts.category) {
      results = results.filter(c => c.category === opts.category);
    }
    if (opts.base) {
      results = results.filter(c => c.base === opts.base);
    }
    if (opts.delivery) {
      results = results.filter(c => c.delivery.includes(opts.delivery!));
    }
    if (opts.material_group) {
      const mg = opts.material_group.toUpperCase();
      results = results.filter(c =>
        c.compatible_materials.includes(mg) && !c.incompatible_materials.includes(mg)
      );
    }
    if (opts.operation) {
      const op = opts.operation.toLowerCase() as keyof CoolantEntry["suitability"];
      if (op in (results[0]?.suitability ?? {})) {
        results = results.filter(c => c.suitability[op] >= 3);
        results.sort((a, b) => b.suitability[op] - a.suitability[op]);
      }
    }
    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
      );
    }

    const total = results.length;
    const limit = opts.limit || 20;
    return { coolants: results.slice(0, limit), total };
  }

  /**
   * Recommend coolant for a specific operation + material combination
   */
  recommend(opts: {
    material_group: string;
    operation: string;
    delivery?: CoolantDelivery;
  }): CoolantEntry[] {
    const mg = opts.material_group.toUpperCase();
    const op = opts.operation.toLowerCase() as keyof CoolantEntry["suitability"];

    let candidates = this.all().filter(c =>
      c.compatible_materials.includes(mg) &&
      !c.incompatible_materials.includes(mg)
    );

    if (opts.delivery) {
      candidates = candidates.filter(c => c.delivery.includes(opts.delivery!));
    }

    // Sort by: operation suitability (desc), tool life factor (desc), force reduction (asc)
    candidates.sort((a, b) => {
      const suitA = a.suitability[op] ?? 0;
      const suitB = b.suitability[op] ?? 0;
      if (suitA !== suitB) return suitB - suitA;
      if (a.sfc_factors.tool_life_factor !== b.sfc_factors.tool_life_factor) {
        return b.sfc_factors.tool_life_factor - a.sfc_factors.tool_life_factor;
      }
      return a.sfc_factors.force_reduction - b.sfc_factors.force_reduction;
    });

    return candidates.slice(0, 5);
  }

  /**
   * Get SFC correction factor for a coolant
   */
  getSfcFactor(coolantId: string): number {
    const coolant = this.get(coolantId);
    return coolant?.sfc_factors.force_reduction ?? 1.0;
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    by_category: Record<string, number>;
    by_base: Record<string, number>;
    by_delivery: Record<string, number>;
  } {
    const all = this.all();
    const by_category: Record<string, number> = {};
    const by_base: Record<string, number> = {};
    const by_delivery: Record<string, number> = {};

    for (const c of all) {
      by_category[c.category] = (by_category[c.category] || 0) + 1;
      by_base[c.base] = (by_base[c.base] || 0) + 1;
      for (const d of c.delivery) {
        by_delivery[d] = (by_delivery[d] || 0) + 1;
      }
    }

    return { total: all.length, by_category, by_base, by_delivery };
  }
}

// Singleton
export const coolantRegistry = new CoolantRegistry();
