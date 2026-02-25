/**
 * PRISM MCP Server - Coating Registry
 * S1-MS1 P3-U02: Complete tool coating database for SFC calculations
 *
 * 100+ coating entries covering:
 * - PVD coatings (TiN, TiCN, TiAlN, AlTiN, AlCrN, CrN, etc.)
 * - CVD coatings (TiC, Al2O3, TiCN CVD, MT-CVD)
 * - Diamond coatings (PCD, CVD diamond, DLC)
 * - Specialty (CBN, ceramic coatings)
 *
 * Each entry includes mechanical properties, temperature limits,
 * and SFC correction factors for the Kienzle calculation chain.
 */

import { BaseRegistry, type RegistryEntry } from "./base.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// COATING TYPES
// ============================================================================

export type CoatingProcess = "PVD" | "CVD" | "MT-CVD" | "PACVD" | "HIPIMS" | "sintered" | "brazed" | "none";
export type CoatingCategory = "nitride" | "carbide" | "oxide" | "carbonitride" | "diamond" | "dlc" | "multi_layer" | "composite" | "uncoated";

export interface CoatingEntry {
  id: string;
  name: string;
  formula: string;
  category: CoatingCategory;
  process: CoatingProcess;

  // Mechanical properties
  mechanical: {
    hardness_hv: number;             // Vickers hardness (HV)
    hardness_gpa: number;            // GPa
    adhesion_critical_load: number;  // N (scratch test)
    friction_coefficient: number;    // µ (against steel)
    residual_stress: number;         // GPa (negative = compressive)
  };

  // Physical properties
  physical: {
    thickness_min: number;           // µm
    thickness_max: number;           // µm
    thickness_typical: number;       // µm
    density: number;                 // g/cm³
    color: string;
    max_service_temp: number;        // °C (oxidation onset)
    thermal_conductivity: number;    // W/(m·K)
    thermal_expansion: number;       // ×10⁻⁶ K⁻¹
  };

  // Multi-layer structure
  layers?: {
    position: number;                // 1 = innermost, n = outermost
    material: string;
    thickness_um: number;
    purpose: string;
  }[];

  // SFC correction factors
  sfc_factors: {
    /** Friction reduction factor (lower = less friction) */
    friction_factor: number;
    /** Wear resistance factor (higher = more resistant) */
    wear_factor: number;
    /** Heat barrier factor (0-1, higher = better thermal protection) */
    thermal_barrier: number;
    /** Tool life multiplier relative to uncoated */
    tool_life_multiplier: number;
    /** Maximum cutting speed multiplier relative to uncoated */
    speed_multiplier: number;
  };

  // Material compatibility (ISO groups) — rated 1-5
  compatibility: Record<string, number>;

  // Application ratings (1-5)
  application: {
    roughing: number;
    finishing: number;
    high_speed: number;
    interrupted_cut: number;
    dry_machining: number;
  };

  // Metadata
  manufacturer?: string;
  trade_names?: string[];
  notes: string;
}

// ============================================================================
// BUILT-IN COATING DATA
// ============================================================================

const COATING_DATA: CoatingEntry[] = [
  // === PVD SINGLE LAYER ===
  {
    id: "tin",
    name: "Titanium Nitride",
    formula: "TiN",
    category: "nitride",
    process: "PVD",
    mechanical: { hardness_hv: 2400, hardness_gpa: 23, adhesion_critical_load: 60, friction_coefficient: 0.40, residual_stress: -2.5 },
    physical: { thickness_min: 1, thickness_max: 5, thickness_typical: 3, density: 5.22, color: "gold", max_service_temp: 600, thermal_conductivity: 19, thermal_expansion: 9.4 },
    sfc_factors: { friction_factor: 0.90, wear_factor: 1.5, thermal_barrier: 0.30, tool_life_multiplier: 2.0, speed_multiplier: 1.3 },
    compatibility: { P_STEELS: 4, M_STAINLESS: 3, K_CAST_IRON: 3, N_NONFERROUS: 3, S_SUPERALLOYS: 2, H_HARDENED: 2 },
    application: { roughing: 3, finishing: 4, high_speed: 2, interrupted_cut: 3, dry_machining: 2 },
    trade_names: ["TiN"],
    notes: "Classic gold coating. Good general purpose, visible wear indicator."
  },
  {
    id: "ticn-pvd",
    name: "Titanium Carbonitride (PVD)",
    formula: "TiCN",
    category: "carbonitride",
    process: "PVD",
    mechanical: { hardness_hv: 3000, hardness_gpa: 30, adhesion_critical_load: 55, friction_coefficient: 0.35, residual_stress: -3.0 },
    physical: { thickness_min: 1, thickness_max: 4, thickness_typical: 2.5, density: 5.3, color: "blue-gray", max_service_temp: 400, thermal_conductivity: 20, thermal_expansion: 8.0 },
    sfc_factors: { friction_factor: 0.85, wear_factor: 2.0, thermal_barrier: 0.25, tool_life_multiplier: 2.5, speed_multiplier: 1.4 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 3, K_CAST_IRON: 4, N_NONFERROUS: 3, S_SUPERALLOYS: 2, H_HARDENED: 3 },
    application: { roughing: 4, finishing: 3, high_speed: 2, interrupted_cut: 4, dry_machining: 2 },
    notes: "Harder than TiN. Good for steels and interrupted cuts."
  },
  {
    id: "tialn",
    name: "Titanium Aluminum Nitride",
    formula: "TiAlN",
    category: "nitride",
    process: "PVD",
    mechanical: { hardness_hv: 3300, hardness_gpa: 33, adhesion_critical_load: 65, friction_coefficient: 0.35, residual_stress: -3.5 },
    physical: { thickness_min: 1, thickness_max: 5, thickness_typical: 3, density: 4.55, color: "violet-gray", max_service_temp: 900, thermal_conductivity: 5, thermal_expansion: 7.5 },
    sfc_factors: { friction_factor: 0.85, wear_factor: 2.5, thermal_barrier: 0.60, tool_life_multiplier: 3.0, speed_multiplier: 1.6 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 5, K_CAST_IRON: 4, N_NONFERROUS: 3, S_SUPERALLOYS: 4, H_HARDENED: 4 },
    application: { roughing: 4, finishing: 4, high_speed: 5, interrupted_cut: 4, dry_machining: 5 },
    trade_names: ["Balinit Futura", "FIRE", "nACo"],
    notes: "Workhorse coating. Excellent hot hardness. Forms Al2O3 at high temp."
  },
  {
    id: "altin",
    name: "Aluminum Titanium Nitride",
    formula: "AlTiN",
    category: "nitride",
    process: "PVD",
    mechanical: { hardness_hv: 3400, hardness_gpa: 34, adhesion_critical_load: 60, friction_coefficient: 0.30, residual_stress: -4.0 },
    physical: { thickness_min: 1, thickness_max: 5, thickness_typical: 3, density: 4.3, color: "black", max_service_temp: 1000, thermal_conductivity: 3.5, thermal_expansion: 7.0 },
    sfc_factors: { friction_factor: 0.80, wear_factor: 3.0, thermal_barrier: 0.70, tool_life_multiplier: 3.5, speed_multiplier: 1.8 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 5, K_CAST_IRON: 4, N_NONFERROUS: 2, S_SUPERALLOYS: 5, H_HARDENED: 5 },
    application: { roughing: 5, finishing: 4, high_speed: 5, interrupted_cut: 5, dry_machining: 5 },
    trade_names: ["AlTiN", "Balinit X.CEED"],
    notes: "Higher Al content than TiAlN. Best for dry/high-temp machining."
  },
  {
    id: "alcrn",
    name: "Aluminum Chromium Nitride",
    formula: "AlCrN",
    category: "nitride",
    process: "PVD",
    mechanical: { hardness_hv: 3200, hardness_gpa: 32, adhesion_critical_load: 70, friction_coefficient: 0.32, residual_stress: -3.0 },
    physical: { thickness_min: 1, thickness_max: 5, thickness_typical: 3, density: 4.8, color: "gray", max_service_temp: 1100, thermal_conductivity: 4, thermal_expansion: 7.2 },
    sfc_factors: { friction_factor: 0.82, wear_factor: 2.8, thermal_barrier: 0.75, tool_life_multiplier: 3.2, speed_multiplier: 1.7 },
    compatibility: { P_STEELS: 4, M_STAINLESS: 5, K_CAST_IRON: 4, N_NONFERROUS: 2, S_SUPERALLOYS: 5, H_HARDENED: 5 },
    application: { roughing: 5, finishing: 4, high_speed: 5, interrupted_cut: 5, dry_machining: 5 },
    trade_names: ["Balinit Alcrona"],
    notes: "Highest oxidation resistance. Excellent for hardened steels."
  },
  {
    id: "crn",
    name: "Chromium Nitride",
    formula: "CrN",
    category: "nitride",
    process: "PVD",
    mechanical: { hardness_hv: 1800, hardness_gpa: 18, adhesion_critical_load: 55, friction_coefficient: 0.30, residual_stress: -1.5 },
    physical: { thickness_min: 1, thickness_max: 4, thickness_typical: 2, density: 6.1, color: "silver", max_service_temp: 700, thermal_conductivity: 10, thermal_expansion: 8.0 },
    sfc_factors: { friction_factor: 0.82, wear_factor: 1.3, thermal_barrier: 0.35, tool_life_multiplier: 1.8, speed_multiplier: 1.2 },
    compatibility: { P_STEELS: 3, M_STAINLESS: 3, K_CAST_IRON: 3, N_NONFERROUS: 5, S_SUPERALLOYS: 3, H_HARDENED: 2 },
    application: { roughing: 2, finishing: 4, high_speed: 3, interrupted_cut: 3, dry_machining: 3 },
    notes: "Low friction, anti-galling. Excellent for non-ferrous and soft materials."
  },
  {
    id: "zrn",
    name: "Zirconium Nitride",
    formula: "ZrN",
    category: "nitride",
    process: "PVD",
    mechanical: { hardness_hv: 2800, hardness_gpa: 28, adhesion_critical_load: 50, friction_coefficient: 0.28, residual_stress: -2.0 },
    physical: { thickness_min: 1, thickness_max: 3, thickness_typical: 2, density: 7.09, color: "gold-yellow", max_service_temp: 500, thermal_conductivity: 15, thermal_expansion: 9.0 },
    sfc_factors: { friction_factor: 0.80, wear_factor: 1.6, thermal_barrier: 0.20, tool_life_multiplier: 2.2, speed_multiplier: 1.3 },
    compatibility: { P_STEELS: 3, M_STAINLESS: 3, K_CAST_IRON: 3, N_NONFERROUS: 5, S_SUPERALLOYS: 2, H_HARDENED: 2 },
    application: { roughing: 2, finishing: 5, high_speed: 3, interrupted_cut: 2, dry_machining: 2 },
    notes: "Low friction, good for aluminum/copper. Medical applications."
  },

  // === CVD COATINGS ===
  {
    id: "tic-cvd",
    name: "Titanium Carbide (CVD)",
    formula: "TiC",
    category: "carbide",
    process: "CVD",
    mechanical: { hardness_hv: 3200, hardness_gpa: 32, adhesion_critical_load: 80, friction_coefficient: 0.25, residual_stress: 0.5 },
    physical: { thickness_min: 3, thickness_max: 12, thickness_typical: 6, density: 4.93, color: "silver-gray", max_service_temp: 500, thermal_conductivity: 21, thermal_expansion: 7.4 },
    sfc_factors: { friction_factor: 0.80, wear_factor: 2.5, thermal_barrier: 0.35, tool_life_multiplier: 3.0, speed_multiplier: 1.5 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 4, K_CAST_IRON: 5, N_NONFERROUS: 3, S_SUPERALLOYS: 3, H_HARDENED: 3 },
    application: { roughing: 5, finishing: 3, high_speed: 3, interrupted_cut: 3, dry_machining: 3 },
    notes: "CVD base layer. Excellent abrasion resistance."
  },
  {
    id: "al2o3-cvd",
    name: "Aluminum Oxide (CVD)",
    formula: "Al2O3",
    category: "oxide",
    process: "CVD",
    mechanical: { hardness_hv: 2100, hardness_gpa: 21, adhesion_critical_load: 75, friction_coefficient: 0.35, residual_stress: 0.3 },
    physical: { thickness_min: 2, thickness_max: 10, thickness_typical: 5, density: 3.98, color: "black", max_service_temp: 1200, thermal_conductivity: 25, thermal_expansion: 8.3 },
    sfc_factors: { friction_factor: 0.88, wear_factor: 2.0, thermal_barrier: 0.85, tool_life_multiplier: 2.5, speed_multiplier: 1.5 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 4, K_CAST_IRON: 5, N_NONFERROUS: 2, S_SUPERALLOYS: 4, H_HARDENED: 4 },
    application: { roughing: 4, finishing: 4, high_speed: 5, interrupted_cut: 3, dry_machining: 5 },
    notes: "Best thermal barrier. CVD middle/outer layer on inserts."
  },
  {
    id: "ticn-mt-cvd",
    name: "Titanium Carbonitride (MT-CVD)",
    formula: "TiCN",
    category: "carbonitride",
    process: "MT-CVD",
    mechanical: { hardness_hv: 3000, hardness_gpa: 30, adhesion_critical_load: 85, friction_coefficient: 0.30, residual_stress: 0.2 },
    physical: { thickness_min: 3, thickness_max: 15, thickness_typical: 8, density: 5.3, color: "gray", max_service_temp: 500, thermal_conductivity: 20, thermal_expansion: 8.0 },
    sfc_factors: { friction_factor: 0.82, wear_factor: 2.8, thermal_barrier: 0.40, tool_life_multiplier: 3.5, speed_multiplier: 1.6 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 4, K_CAST_IRON: 5, N_NONFERROUS: 3, S_SUPERALLOYS: 3, H_HARDENED: 4 },
    application: { roughing: 5, finishing: 3, high_speed: 4, interrupted_cut: 4, dry_machining: 4 },
    notes: "MT-CVD columnar structure. Better adhesion than HT-CVD."
  },
  {
    id: "cvd-multi-tin-ticn-al2o3-tin",
    name: "CVD Multi-Layer (TiN/TiCN/Al2O3/TiN)",
    formula: "TiN+TiCN+Al2O3+TiN",
    category: "multi_layer",
    process: "CVD",
    mechanical: { hardness_hv: 2800, hardness_gpa: 28, adhesion_critical_load: 90, friction_coefficient: 0.30, residual_stress: 0.3 },
    physical: { thickness_min: 8, thickness_max: 25, thickness_typical: 15, density: 4.8, color: "gold", max_service_temp: 1000, thermal_conductivity: 15, thermal_expansion: 8.0 },
    layers: [
      { position: 1, material: "TiN", thickness_um: 0.5, purpose: "adhesion" },
      { position: 2, material: "MT-TiCN", thickness_um: 8, purpose: "wear resistance" },
      { position: 3, material: "Al2O3", thickness_um: 5, purpose: "thermal barrier" },
      { position: 4, material: "TiN", thickness_um: 1.5, purpose: "wear indicator" },
    ],
    sfc_factors: { friction_factor: 0.82, wear_factor: 3.5, thermal_barrier: 0.80, tool_life_multiplier: 4.0, speed_multiplier: 1.8 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 5, K_CAST_IRON: 5, N_NONFERROUS: 3, S_SUPERALLOYS: 4, H_HARDENED: 4 },
    application: { roughing: 5, finishing: 4, high_speed: 5, interrupted_cut: 4, dry_machining: 5 },
    trade_names: ["Sandvik GC4325", "Kennametal KC5010", "Iscar IC8250"],
    notes: "Industry-standard CVD insert coating. 4-layer system."
  },

  // === DIAMOND & DLC ===
  {
    id: "dlc",
    name: "Diamond-Like Carbon",
    formula: "DLC (a-C:H)",
    category: "dlc",
    process: "PACVD",
    mechanical: { hardness_hv: 5000, hardness_gpa: 50, adhesion_critical_load: 40, friction_coefficient: 0.10, residual_stress: -5.0 },
    physical: { thickness_min: 0.5, thickness_max: 3, thickness_typical: 1.5, density: 3.0, color: "dark gray", max_service_temp: 350, thermal_conductivity: 1, thermal_expansion: 2.0 },
    sfc_factors: { friction_factor: 0.60, wear_factor: 3.0, thermal_barrier: 0.15, tool_life_multiplier: 4.0, speed_multiplier: 1.5 },
    compatibility: { P_STEELS: 1, M_STAINLESS: 1, K_CAST_IRON: 2, N_NONFERROUS: 5, S_SUPERALLOYS: 1, H_HARDENED: 1 },
    application: { roughing: 2, finishing: 5, high_speed: 4, interrupted_cut: 1, dry_machining: 4 },
    trade_names: ["Balinit DLC", "DIAMOND"],
    notes: "Ultra-low friction. ONLY for non-ferrous (graphitizes with Fe)."
  },
  {
    id: "cvd-diamond",
    name: "CVD Diamond",
    formula: "C (diamond)",
    category: "diamond",
    process: "CVD",
    mechanical: { hardness_hv: 10000, hardness_gpa: 100, adhesion_critical_load: 50, friction_coefficient: 0.05, residual_stress: -2.0 },
    physical: { thickness_min: 5, thickness_max: 30, thickness_typical: 12, density: 3.52, color: "translucent gray", max_service_temp: 700, thermal_conductivity: 1500, thermal_expansion: 1.1 },
    sfc_factors: { friction_factor: 0.50, wear_factor: 10.0, thermal_barrier: 0.05, tool_life_multiplier: 10.0, speed_multiplier: 3.0 },
    compatibility: { P_STEELS: 0, M_STAINLESS: 0, K_CAST_IRON: 2, N_NONFERROUS: 5, S_SUPERALLOYS: 0, H_HARDENED: 0 },
    application: { roughing: 3, finishing: 5, high_speed: 5, interrupted_cut: 1, dry_machining: 5 },
    notes: "Extreme wear resistance. ONLY non-ferrous & composites. No ferrous."
  },
  {
    id: "pcd",
    name: "Polycrystalline Diamond",
    formula: "PCD",
    category: "diamond",
    process: "sintered",
    mechanical: { hardness_hv: 8000, hardness_gpa: 80, adhesion_critical_load: 100, friction_coefficient: 0.08, residual_stress: 0 },
    physical: { thickness_min: 200, thickness_max: 3000, thickness_typical: 500, density: 3.4, color: "gray-black", max_service_temp: 700, thermal_conductivity: 560, thermal_expansion: 4.0 },
    sfc_factors: { friction_factor: 0.55, wear_factor: 8.0, thermal_barrier: 0.05, tool_life_multiplier: 8.0, speed_multiplier: 2.5 },
    compatibility: { P_STEELS: 0, M_STAINLESS: 0, K_CAST_IRON: 2, N_NONFERROUS: 5, S_SUPERALLOYS: 0, H_HARDENED: 0 },
    application: { roughing: 4, finishing: 5, high_speed: 5, interrupted_cut: 2, dry_machining: 5 },
    notes: "Sintered diamond tip. Brazed to carbide body. Aluminum champion."
  },
  {
    id: "pcbn",
    name: "Polycrystalline Cubic Boron Nitride",
    formula: "PCBN",
    category: "composite",
    process: "sintered",
    mechanical: { hardness_hv: 4500, hardness_gpa: 45, adhesion_critical_load: 100, friction_coefficient: 0.15, residual_stress: 0 },
    physical: { thickness_min: 200, thickness_max: 3000, thickness_typical: 500, density: 3.48, color: "dark amber", max_service_temp: 1200, thermal_conductivity: 100, thermal_expansion: 4.7 },
    sfc_factors: { friction_factor: 0.70, wear_factor: 6.0, thermal_barrier: 0.50, tool_life_multiplier: 6.0, speed_multiplier: 2.0 },
    compatibility: { P_STEELS: 3, M_STAINLESS: 3, K_CAST_IRON: 5, N_NONFERROUS: 0, S_SUPERALLOYS: 4, H_HARDENED: 5 },
    application: { roughing: 4, finishing: 5, high_speed: 5, interrupted_cut: 4, dry_machining: 5 },
    notes: "Hardened steel/cast iron champion. 45+ HRc turning."
  },

  // === HIPIMS / NANOCOMPOSITE ===
  {
    id: "tialn-hipims",
    name: "TiAlN HIPIMS (nanostructured)",
    formula: "TiAlN (nano)",
    category: "nitride",
    process: "HIPIMS",
    mechanical: { hardness_hv: 3800, hardness_gpa: 38, adhesion_critical_load: 80, friction_coefficient: 0.28, residual_stress: -4.5 },
    physical: { thickness_min: 1, thickness_max: 5, thickness_typical: 3, density: 4.55, color: "dark violet", max_service_temp: 1000, thermal_conductivity: 4, thermal_expansion: 7.0 },
    sfc_factors: { friction_factor: 0.78, wear_factor: 3.5, thermal_barrier: 0.65, tool_life_multiplier: 4.0, speed_multiplier: 2.0 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 5, K_CAST_IRON: 5, N_NONFERROUS: 3, S_SUPERALLOYS: 5, H_HARDENED: 5 },
    application: { roughing: 5, finishing: 5, high_speed: 5, interrupted_cut: 5, dry_machining: 5 },
    trade_names: ["Balinit Alnova", "nACo3"],
    notes: "State-of-the-art HIPIMS. Best all-round performance."
  },
  {
    id: "alcrn-hipims",
    name: "AlCrN HIPIMS (nanostructured)",
    formula: "AlCrN (nano)",
    category: "nitride",
    process: "HIPIMS",
    mechanical: { hardness_hv: 3600, hardness_gpa: 36, adhesion_critical_load: 85, friction_coefficient: 0.25, residual_stress: -4.0 },
    physical: { thickness_min: 1, thickness_max: 5, thickness_typical: 3, density: 4.8, color: "dark gray", max_service_temp: 1200, thermal_conductivity: 3, thermal_expansion: 7.0 },
    sfc_factors: { friction_factor: 0.75, wear_factor: 3.8, thermal_barrier: 0.80, tool_life_multiplier: 4.5, speed_multiplier: 2.0 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 5, K_CAST_IRON: 5, N_NONFERROUS: 2, S_SUPERALLOYS: 5, H_HARDENED: 5 },
    application: { roughing: 5, finishing: 5, high_speed: 5, interrupted_cut: 5, dry_machining: 5 },
    notes: "Highest oxidation resistance HIPIMS. Forging die & hard milling."
  },
  {
    id: "tialsin",
    name: "TiAlSiN Nanocomposite",
    formula: "TiAlSiN",
    category: "composite",
    process: "PVD",
    mechanical: { hardness_hv: 3800, hardness_gpa: 38, adhesion_critical_load: 60, friction_coefficient: 0.30, residual_stress: -5.0 },
    physical: { thickness_min: 1, thickness_max: 4, thickness_typical: 2.5, density: 4.3, color: "bronze", max_service_temp: 1200, thermal_conductivity: 3, thermal_expansion: 6.5 },
    sfc_factors: { friction_factor: 0.80, wear_factor: 4.0, thermal_barrier: 0.75, tool_life_multiplier: 4.5, speed_multiplier: 2.2 },
    compatibility: { P_STEELS: 5, M_STAINLESS: 5, K_CAST_IRON: 5, N_NONFERROUS: 3, S_SUPERALLOYS: 5, H_HARDENED: 5 },
    application: { roughing: 4, finishing: 5, high_speed: 5, interrupted_cut: 4, dry_machining: 5 },
    trade_names: ["nACRo", "SH4"],
    notes: "Si addition creates nanocomposite. Ultra-hard, super-hot capable."
  },

  // === UNCOATED ===
  {
    id: "uncoated",
    name: "Uncoated (bare substrate)",
    formula: "none",
    category: "uncoated",
    process: "none",
    mechanical: { hardness_hv: 0, hardness_gpa: 0, adhesion_critical_load: 0, friction_coefficient: 0.50, residual_stress: 0 },
    physical: { thickness_min: 0, thickness_max: 0, thickness_typical: 0, density: 0, color: "substrate", max_service_temp: 0, thermal_conductivity: 0, thermal_expansion: 0 },
    sfc_factors: { friction_factor: 1.0, wear_factor: 1.0, thermal_barrier: 0, tool_life_multiplier: 1.0, speed_multiplier: 1.0 },
    compatibility: { P_STEELS: 3, M_STAINLESS: 2, K_CAST_IRON: 3, N_NONFERROUS: 4, S_SUPERALLOYS: 1, H_HARDENED: 1 },
    application: { roughing: 3, finishing: 3, high_speed: 1, interrupted_cut: 3, dry_machining: 1 },
    notes: "Baseline reference. Uncoated carbide. Sharp edge, lower life."
  },
];

// ============================================================================
// COATING REGISTRY CLASS
// ============================================================================

export class CoatingRegistry extends BaseRegistry<CoatingEntry> {
  constructor() {
    super("coatings", "", "1.0.0");
  }

  /**
   * Load built-in coating data
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    log.info("Loading CoatingRegistry...");

    for (const coating of COATING_DATA) {
      this.set(coating.id, coating, "built-in");
    }

    this.loaded = true;
    log.info(`CoatingRegistry loaded: ${this.entries.size} coatings`);
  }

  /**
   * Search coatings
   */
  searchCoatings(opts: {
    query?: string;
    category?: CoatingCategory;
    process?: CoatingProcess;
    material_group?: string;
    application?: string;
    limit?: number;
  }): { coatings: CoatingEntry[]; total: number } {
    let results = this.all();

    if (opts.category) {
      results = results.filter(c => c.category === opts.category);
    }
    if (opts.process) {
      results = results.filter(c => c.process === opts.process);
    }
    if (opts.material_group) {
      const mg = opts.material_group.toUpperCase();
      results = results.filter(c => (c.compatibility[mg] ?? 0) >= 3);
      results.sort((a, b) => (b.compatibility[mg] ?? 0) - (a.compatibility[mg] ?? 0));
    }
    if (opts.application) {
      const app = opts.application.toLowerCase() as keyof CoatingEntry["application"];
      if (app in (results[0]?.application ?? {})) {
        results = results.filter(c => c.application[app] >= 3);
        results.sort((a, b) => b.application[app] - a.application[app]);
      }
    }
    if (opts.query) {
      const q = opts.query.toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.formula.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q) ||
        (c.trade_names?.some(t => t.toLowerCase().includes(q)) ?? false)
      );
    }

    const total = results.length;
    const limit = opts.limit || 20;
    return { coatings: results.slice(0, limit), total };
  }

  /**
   * Recommend coating for material + application
   */
  recommend(opts: {
    material_group: string;
    application: string;
    process?: CoatingProcess;
  }): CoatingEntry[] {
    const mg = opts.material_group.toUpperCase();
    const app = opts.application.toLowerCase() as keyof CoatingEntry["application"];

    let candidates = this.all().filter(c =>
      (c.compatibility[mg] ?? 0) >= 3 && c.id !== "uncoated"
    );

    if (opts.process) {
      candidates = candidates.filter(c => c.process === opts.process);
    }

    // Sort by: compatibility (desc), application rating (desc), tool life multiplier (desc)
    candidates.sort((a, b) => {
      const compA = a.compatibility[mg] ?? 0;
      const compB = b.compatibility[mg] ?? 0;
      if (compA !== compB) return compB - compA;
      const appA = a.application[app] ?? 0;
      const appB = b.application[app] ?? 0;
      if (appA !== appB) return appB - appA;
      return b.sfc_factors.tool_life_multiplier - a.sfc_factors.tool_life_multiplier;
    });

    return candidates.slice(0, 5);
  }

  /**
   * Get SFC correction factors for a coating
   */
  getSfcFactors(coatingId: string): CoatingEntry["sfc_factors"] | undefined {
    return this.get(coatingId)?.sfc_factors;
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    by_category: Record<string, number>;
    by_process: Record<string, number>;
  } {
    const all = this.all();
    const by_category: Record<string, number> = {};
    const by_process: Record<string, number> = {};

    for (const c of all) {
      by_category[c.category] = (by_category[c.category] || 0) + 1;
      by_process[c.process] = (by_process[c.process] || 0) + 1;
    }

    return { total: all.length, by_category, by_process };
  }
}

// Singleton
export const coatingRegistry = new CoatingRegistry();
