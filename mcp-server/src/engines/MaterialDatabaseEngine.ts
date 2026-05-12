/**
 * MaterialDatabaseEngine — Comprehensive Material Properties Database
 *
 * Provides material properties for machining calculations:
 * - Kienzle kc1.1 and mc coefficients (cutting force)
 * - Taylor C and n coefficients (tool life)
 * - Physical properties (density, hardness, tensile)
 * - Thermal properties (conductivity, expansion)
 * - Machinability ratings
 * - Recommended cutting parameters
 *
 * @module engines/MaterialDatabaseEngine
 */

import { log } from "../utils/Logger.js";
import { AISI_CUTTING_COEFFICIENTS, type AISICuttingCoefficients } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type MaterialCategory =
  | "carbon_steel"
  | "alloy_steel"
  | "tool_steel"
  | "stainless_steel"
  | "aluminum"
  | "copper_alloy"
  | "titanium"
  | "nickel_alloy"
  | "plastic"
  | "cast_iron";

export interface KienzleCoefficients {
  kc1_1: number; // N/mm² - specific cutting force
  mc: number; // dimensionless - Kienzle exponent
}

export interface TaylorCoefficients {
  C: number; // m/min - Taylor constant
  n: number; // dimensionless - Taylor exponent
}

export interface MaterialProperties {
  id: string;
  name: string;
  category: MaterialCategory;
  aliases: string[];

  // Cutting coefficients
  kienzle: KienzleCoefficients;
  taylor: TaylorCoefficients;

  // Physical properties
  density: number; // g/cm³
  hardnessHB: number; // Brinell hardness
  hardnessHRC?: number; // Rockwell C (if applicable)
  tensileStrength: number; // MPa
  yieldStrength: number; // MPa

  // Thermal properties
  thermalConductivity: number; // W/(m·K)
  thermalExpansion: number; // µm/(m·K)
  meltingPoint?: number; // °C

  // Machinability
  machinabilityRating: number; // % relative to 1212 steel = 100%
  chipFormation: "continuous" | "segmented" | "discontinuous";
  builtUpEdgeTendency: "low" | "medium" | "high";

  // Recommended parameters (baseline for carbide, dry)
  recommendedSFM: {
    roughing: number;
    finishing: number;
  };
  recommendedFeedIPR: {
    roughing: number;
    finishing: number;
  };

  // Notes
  machiningNotes: string[];
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

const MATERIALS: MaterialProperties[] = [
  // ==================== CARBON STEELS ====================
  {
    id: "1018",
    name: "AISI 1018 Carbon Steel",
    category: "carbon_steel",
    aliases: ["1018", "C1018", "SAE 1018", "low carbon"],
    kienzle: { kc1_1: 1780, mc: 0.18 },
    taylor: { C: 350, n: 0.25 },
    density: 7.87,
    hardnessHB: 126,
    tensileStrength: 440,
    yieldStrength: 370,
    thermalConductivity: 51.9,
    thermalExpansion: 11.7,
    meltingPoint: 1510,
    machinabilityRating: 78,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 500, finishing: 700 },
    recommendedFeedIPR: { roughing: 0.012, finishing: 0.005 },
    machiningNotes: [
      "Good machinability, forms continuous chips",
      "May require chip breakers at higher feeds",
      "Prone to built-up edge at low speeds",
    ],
  },
  {
    id: "1045",
    name: "AISI 1045 Medium Carbon Steel",
    category: "carbon_steel",
    aliases: ["1045", "C1045", "SAE 1045", "medium carbon"],
    kienzle: { kc1_1: 2220, mc: 0.26 },
    taylor: { C: 300, n: 0.23 },
    density: 7.85,
    hardnessHB: 170,
    tensileStrength: 585,
    yieldStrength: 450,
    thermalConductivity: 49.8,
    thermalExpansion: 11.3,
    meltingPoint: 1505,
    machinabilityRating: 65,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 400, finishing: 550 },
    recommendedFeedIPR: { roughing: 0.010, finishing: 0.004 },
    machiningNotes: [
      "Harder than 1018, requires sharper tools",
      "Can be heat treated for higher hardness",
      "Good for shafts, gears, bolts",
    ],
  },
  {
    id: "12L14",
    name: "AISI 12L14 Free-Machining Steel",
    category: "carbon_steel",
    aliases: ["12L14", "leaded steel", "free machining"],
    kienzle: { kc1_1: 1580, mc: 0.15 },
    taylor: { C: 450, n: 0.28 },
    density: 7.87,
    hardnessHB: 163,
    tensileStrength: 540,
    yieldStrength: 415,
    thermalConductivity: 51.9,
    thermalExpansion: 11.7,
    meltingPoint: 1510,
    machinabilityRating: 195,
    chipFormation: "discontinuous",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 700, finishing: 1000 },
    recommendedFeedIPR: { roughing: 0.015, finishing: 0.006 },
    machiningNotes: [
      "Excellent machinability - the benchmark",
      "Lead content provides natural lubricity",
      "Short chips, excellent surface finish",
      "Environmental restrictions on lead content",
    ],
  },

  // ==================== ALLOY STEELS ====================
  {
    id: "4140",
    name: "AISI 4140 Chromoly Steel",
    category: "alloy_steel",
    aliases: ["4140", "chromoly", "41xx", "SAE 4140"],
    kienzle: { kc1_1: 2500, mc: 0.26 },
    taylor: { C: 280, n: 0.22 },
    density: 7.85,
    hardnessHB: 197,
    hardnessHRC: 28,
    tensileStrength: 655,
    yieldStrength: 415,
    thermalConductivity: 42.6,
    thermalExpansion: 12.2,
    meltingPoint: 1430,
    machinabilityRating: 65,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 350, finishing: 500 },
    recommendedFeedIPR: { roughing: 0.010, finishing: 0.004 },
    machiningNotes: [
      "Most common alloy steel in job shops",
      "Prehardened stock available (HRC 28-32)",
      "Excellent for shafts, gears, tooling",
      "Can be through-hardened to HRC 55+",
    ],
  },
  {
    id: "4340",
    name: "AISI 4340 Nickel-Chromoly Steel",
    category: "alloy_steel",
    aliases: ["4340", "nickel chromoly", "aircraft steel"],
    kienzle: { kc1_1: 2180, mc: 0.23 },
    taylor: { C: 240, n: 0.20 },
    density: 7.85,
    hardnessHB: 217,
    hardnessHRC: 30,
    tensileStrength: 745,
    yieldStrength: 470,
    thermalConductivity: 44.5,
    thermalExpansion: 12.3,
    meltingPoint: 1427,
    machinabilityRating: 55,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 300, finishing: 450 },
    recommendedFeedIPR: { roughing: 0.008, finishing: 0.003 },
    machiningNotes: [
      "High-strength aerospace applications",
      "More difficult than 4140",
      "Requires rigid setup, sharp tools",
      "Heat treat to HRC 50+ for extreme strength",
    ],
  },
  {
    id: "8620",
    name: "AISI 8620 Case Hardening Steel",
    category: "alloy_steel",
    aliases: ["8620", "case hardening", "carburizing steel"],
    kienzle: { kc1_1: 1850, mc: 0.19 },
    taylor: { C: 300, n: 0.23 },
    density: 7.85,
    hardnessHB: 149,
    tensileStrength: 530,
    yieldStrength: 385,
    thermalConductivity: 46.6,
    thermalExpansion: 11.9,
    meltingPoint: 1450,
    machinabilityRating: 70,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 400, finishing: 550 },
    recommendedFeedIPR: { roughing: 0.010, finishing: 0.004 },
    machiningNotes: [
      "Carburize for hard surface, tough core",
      "Common for gears, pins, shafts",
      "Machine before case hardening",
      "Surface HRC 58-62 after carburizing",
    ],
  },

  // ==================== TOOL STEELS ====================
  {
    id: "D2",
    name: "AISI D2 Tool Steel",
    category: "tool_steel",
    aliases: ["D2", "die steel", "cold work"],
    kienzle: { kc1_1: 2850, mc: 0.28 },
    taylor: { C: 150, n: 0.15 },
    density: 7.70,
    hardnessHB: 255,
    hardnessHRC: 62,
    tensileStrength: 1860,
    yieldStrength: 1530,
    thermalConductivity: 20.0,
    thermalExpansion: 10.4,
    meltingPoint: 1420,
    machinabilityRating: 35,
    chipFormation: "segmented",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 150, finishing: 250 },
    recommendedFeedIPR: { roughing: 0.006, finishing: 0.002 },
    machiningNotes: [
      "Machine in annealed state (HB 255)",
      "Very difficult after hardening",
      "CBN or ceramic for hardened D2",
      "Air hardening - minimal distortion",
    ],
  },
  {
    id: "A2",
    name: "AISI A2 Tool Steel",
    category: "tool_steel",
    aliases: ["A2", "air hardening", "general purpose tool"],
    kienzle: { kc1_1: 2650, mc: 0.26 },
    taylor: { C: 170, n: 0.16 },
    density: 7.86,
    hardnessHB: 241,
    hardnessHRC: 60,
    tensileStrength: 1720,
    yieldStrength: 1380,
    thermalConductivity: 25.5,
    thermalExpansion: 10.7,
    meltingPoint: 1425,
    machinabilityRating: 40,
    chipFormation: "segmented",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 180, finishing: 280 },
    recommendedFeedIPR: { roughing: 0.006, finishing: 0.002 },
    machiningNotes: [
      "More machinable than D2",
      "Good balance of wear and toughness",
      "Air hardening - size stable",
      "Common for punches, dies, gauges",
    ],
  },
  {
    id: "H13",
    name: "AISI H13 Hot Work Tool Steel",
    category: "tool_steel",
    aliases: ["H13", "hot work", "die casting"],
    kienzle: { kc1_1: 2550, mc: 0.25 },
    taylor: { C: 180, n: 0.17 },
    density: 7.80,
    hardnessHB: 229,
    hardnessHRC: 50,
    tensileStrength: 1590,
    yieldStrength: 1280,
    thermalConductivity: 24.4,
    thermalExpansion: 11.5,
    meltingPoint: 1425,
    machinabilityRating: 45,
    chipFormation: "segmented",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 200, finishing: 300 },
    recommendedFeedIPR: { roughing: 0.007, finishing: 0.003 },
    machiningNotes: [
      "Excellent hot hardness retention",
      "Die casting dies, forging dies",
      "Good thermal shock resistance",
      "Machine in soft state, heat treat",
    ],
  },
  {
    id: "S7",
    name: "AISI S7 Shock-Resistant Tool Steel",
    category: "tool_steel",
    aliases: ["S7", "shock resistant", "impact"],
    kienzle: { kc1_1: 2400, mc: 0.24 },
    taylor: { C: 190, n: 0.18 },
    density: 7.83,
    hardnessHB: 229,
    hardnessHRC: 56,
    tensileStrength: 1650,
    yieldStrength: 1380,
    thermalConductivity: 24.0,
    thermalExpansion: 10.9,
    meltingPoint: 1420,
    machinabilityRating: 48,
    chipFormation: "segmented",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 220, finishing: 320 },
    recommendedFeedIPR: { roughing: 0.007, finishing: 0.003 },
    machiningNotes: [
      "High toughness, resists chipping",
      "Punches, chisels, shear blades",
      "Good for impact applications",
      "Air or oil hardening",
    ],
  },
  {
    id: "M2",
    name: "AISI M2 High Speed Steel",
    category: "tool_steel",
    aliases: ["M2", "HSS", "high speed"],
    kienzle: { kc1_1: 3100, mc: 0.30 },
    taylor: { C: 120, n: 0.12 },
    density: 8.16,
    hardnessHB: 241,
    hardnessHRC: 65,
    tensileStrength: 2200,
    yieldStrength: 1900,
    thermalConductivity: 19.2,
    thermalExpansion: 9.7,
    meltingPoint: 1430,
    machinabilityRating: 25,
    chipFormation: "segmented",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 100, finishing: 180 },
    recommendedFeedIPR: { roughing: 0.005, finishing: 0.002 },
    machiningNotes: [
      "Extremely difficult to machine",
      "Used for cutting tools themselves",
      "CBN required for hardened state",
      "Grind to finish dimensions",
    ],
  },

  // ==================== STAINLESS STEELS ====================
  {
    id: "303",
    name: "AISI 303 Free-Machining Stainless",
    category: "stainless_steel",
    aliases: ["303", "free machining stainless"],
    kienzle: { kc1_1: 2100, mc: 0.22 },
    taylor: { C: 200, n: 0.18 },
    density: 8.03,
    hardnessHB: 228,
    tensileStrength: 620,
    yieldStrength: 415,
    thermalConductivity: 16.2,
    thermalExpansion: 17.2,
    meltingPoint: 1400,
    machinabilityRating: 78,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 350, finishing: 500 },
    recommendedFeedIPR: { roughing: 0.008, finishing: 0.003 },
    machiningNotes: [
      "Best machining stainless steel",
      "Sulfur addition improves chips",
      "Not for welding applications",
      "Reduced corrosion resistance",
    ],
  },
  {
    id: "304",
    name: "AISI 304 Austenitic Stainless",
    category: "stainless_steel",
    aliases: ["304", "18-8", "A2 stainless"],
    kienzle: { kc1_1: 2350, mc: 0.24 },
    taylor: { C: 160, n: 0.15 },
    density: 8.00,
    hardnessHB: 201,
    tensileStrength: 515,
    yieldStrength: 205,
    thermalConductivity: 16.2,
    thermalExpansion: 17.3,
    meltingPoint: 1400,
    machinabilityRating: 45,
    chipFormation: "continuous",
    builtUpEdgeTendency: "high",
    recommendedSFM: { roughing: 250, finishing: 400 },
    recommendedFeedIPR: { roughing: 0.007, finishing: 0.003 },
    machiningNotes: [
      "Work hardens rapidly",
      "Use positive rake, sharp tools",
      "Maintain feed - never dwell",
      "High built-up edge tendency",
    ],
  },
  {
    id: "316",
    name: "AISI 316 Marine Grade Stainless",
    category: "stainless_steel",
    aliases: ["316", "marine grade", "A4 stainless"],
    kienzle: { kc1_1: 2000, mc: 0.25 },
    taylor: { C: 150, n: 0.14 },
    density: 8.00,
    hardnessHB: 217,
    tensileStrength: 580,
    yieldStrength: 290,
    thermalConductivity: 16.3,
    thermalExpansion: 15.9,
    meltingPoint: 1375,
    machinabilityRating: 42,
    chipFormation: "continuous",
    builtUpEdgeTendency: "high",
    recommendedSFM: { roughing: 230, finishing: 370 },
    recommendedFeedIPR: { roughing: 0.007, finishing: 0.003 },
    machiningNotes: [
      "More difficult than 304",
      "Molybdenum adds corrosion resistance",
      "Gummy, stringy chips",
      "Use coolant, maintain chip load",
    ],
  },
  {
    id: "17-4",
    name: "17-4 PH Precipitation Hardening Stainless",
    category: "stainless_steel",
    aliases: ["17-4", "17-4PH", "precipitation hardening"],
    kienzle: { kc1_1: 2680, mc: 0.27 },
    taylor: { C: 130, n: 0.13 },
    density: 7.78,
    hardnessHB: 352,
    hardnessHRC: 40,
    tensileStrength: 1170,
    yieldStrength: 1070,
    thermalConductivity: 18.3,
    thermalExpansion: 10.8,
    meltingPoint: 1400,
    machinabilityRating: 35,
    chipFormation: "segmented",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 180, finishing: 300 },
    recommendedFeedIPR: { roughing: 0.006, finishing: 0.002 },
    machiningNotes: [
      "Machine in solution treated condition",
      "Age hardens after machining",
      "Aerospace and medical applications",
      "Rigid setup essential",
    ],
  },

  // ==================== ALUMINUM ALLOYS ====================
  {
    id: "6061-T6",
    name: "6061-T6 Aluminum",
    category: "aluminum",
    aliases: ["6061", "structural aluminum"],
    kienzle: { kc1_1: 790, mc: 0.15 },
    taylor: { C: 900, n: 0.35 },
    density: 2.70,
    hardnessHB: 95,
    tensileStrength: 310,
    yieldStrength: 276,
    thermalConductivity: 167,
    thermalExpansion: 23.6,
    meltingPoint: 582,
    machinabilityRating: 90,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 800, finishing: 1200 },
    recommendedFeedIPR: { roughing: 0.012, finishing: 0.005 },
    machiningNotes: [
      "Most common structural aluminum",
      "Good machinability, long stringy chips",
      "Use sharp tools, high rake angles",
      "Weldable, anodizes well",
    ],
  },
  {
    id: "7075-T6",
    name: "7075-T6 Aluminum",
    category: "aluminum",
    aliases: ["7075", "aircraft aluminum", "zinc aluminum"],
    kienzle: { kc1_1: 870, mc: 0.16 },
    taylor: { C: 850, n: 0.33 },
    density: 2.81,
    hardnessHB: 150,
    tensileStrength: 572,
    yieldStrength: 503,
    thermalConductivity: 130,
    thermalExpansion: 23.4,
    meltingPoint: 477,
    machinabilityRating: 85,
    chipFormation: "continuous",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 750, finishing: 1100 },
    recommendedFeedIPR: { roughing: 0.012, finishing: 0.005 },
    machiningNotes: [
      "Highest strength common aluminum",
      "Aerospace standard",
      "Better chip breaking than 6061",
      "Not weldable, poor corrosion resistance",
    ],
  },
  {
    id: "2024-T3",
    name: "2024-T3 Aluminum",
    category: "aluminum",
    aliases: ["2024", "copper aluminum", "aircraft skin"],
    kienzle: { kc1_1: 820, mc: 0.15 },
    taylor: { C: 870, n: 0.34 },
    density: 2.78,
    hardnessHB: 120,
    tensileStrength: 483,
    yieldStrength: 345,
    thermalConductivity: 121,
    thermalExpansion: 23.2,
    meltingPoint: 502,
    machinabilityRating: 88,
    chipFormation: "continuous",
    builtUpEdgeTendency: "medium",
    recommendedSFM: { roughing: 780, finishing: 1150 },
    recommendedFeedIPR: { roughing: 0.012, finishing: 0.005 },
    machiningNotes: [
      "High strength, good fatigue resistance",
      "Aircraft skins, structural",
      "Not weldable",
      "Machines similar to 7075",
    ],
  },

  // ==================== TITANIUM ALLOYS ====================
  {
    id: "Ti-6Al-4V",
    name: "Ti-6Al-4V Grade 5 Titanium",
    category: "titanium",
    aliases: ["Ti64", "grade 5 titanium", "aerospace titanium"],
    kienzle: { kc1_1: 1970, mc: 0.21 },
    taylor: { C: 190, n: 0.20 },
    density: 4.43,
    hardnessHB: 334,
    hardnessHRC: 36,
    tensileStrength: 950,
    yieldStrength: 880,
    thermalConductivity: 6.7,
    thermalExpansion: 8.6,
    meltingPoint: 1660,
    machinabilityRating: 22,
    chipFormation: "segmented",
    builtUpEdgeTendency: "high",
    recommendedSFM: { roughing: 100, finishing: 200 },
    recommendedFeedIPR: { roughing: 0.006, finishing: 0.003 },
    machiningNotes: [
      "Very poor thermal conductivity",
      "Heat stays in cut zone",
      "Low modulus - springy material",
      "Sharp tools, heavy coolant, rigid setup",
      "Fire risk at high speeds",
    ],
  },

  // ==================== NICKEL ALLOYS ====================
  {
    id: "Inconel 718",
    name: "Inconel 718 Nickel Superalloy",
    category: "nickel_alloy",
    aliases: ["Inconel", "718", "nickel superalloy"],
    kienzle: { kc1_1: 2700, mc: 0.25 },
    taylor: { C: 55, n: 0.15 },
    density: 8.19,
    hardnessHB: 363,
    hardnessHRC: 40,
    tensileStrength: 1275,
    yieldStrength: 1034,
    thermalConductivity: 11.4,
    thermalExpansion: 13.0,
    meltingPoint: 1336,
    machinabilityRating: 12,
    chipFormation: "segmented",
    builtUpEdgeTendency: "high",
    recommendedSFM: { roughing: 60, finishing: 120 },
    recommendedFeedIPR: { roughing: 0.005, finishing: 0.002 },
    machiningNotes: [
      "Extremely difficult to machine",
      "Work hardens severely",
      "Ceramic or CBN tooling preferred",
      "Never dwell, maintain feed",
      "Heavy flood coolant required",
    ],
  },
  {
    id: "Hastelloy C276",
    name: "Hastelloy C-276",
    category: "nickel_alloy",
    aliases: ["Hastelloy", "C276", "corrosion resistant"],
    kienzle: { kc1_1: 3100, mc: 0.31 },
    taylor: { C: 55, n: 0.11 },
    density: 8.89,
    hardnessHB: 210,
    tensileStrength: 785,
    yieldStrength: 355,
    thermalConductivity: 10.2,
    thermalExpansion: 11.2,
    meltingPoint: 1370,
    machinabilityRating: 15,
    chipFormation: "continuous",
    builtUpEdgeTendency: "high",
    recommendedSFM: { roughing: 70, finishing: 130 },
    recommendedFeedIPR: { roughing: 0.005, finishing: 0.002 },
    machiningNotes: [
      "Gummy, stringy chips",
      "High work hardening",
      "Sharp carbide or ceramic tools",
      "Chemical processing applications",
    ],
  },

  // ==================== COPPER ALLOYS ====================
  {
    id: "C360",
    name: "C360 Free-Machining Brass",
    category: "copper_alloy",
    aliases: ["360 brass", "free cutting brass", "C36000"],
    kienzle: { kc1_1: 680, mc: 0.14 },
    taylor: { C: 800, n: 0.32 },
    density: 8.50,
    hardnessHB: 100,
    tensileStrength: 385,
    yieldStrength: 140,
    thermalConductivity: 115,
    thermalExpansion: 20.5,
    meltingPoint: 885,
    machinabilityRating: 100,
    chipFormation: "discontinuous",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 600, finishing: 1000 },
    recommendedFeedIPR: { roughing: 0.015, finishing: 0.006 },
    machiningNotes: [
      "Benchmark material - 100% machinability",
      "Excellent chip breaking",
      "Can run dry in many applications",
      "Swiss screw machine work",
    ],
  },
  {
    id: "C110",
    name: "C110 Electrolytic Tough Pitch Copper",
    category: "copper_alloy",
    aliases: ["ETP copper", "pure copper", "C11000"],
    kienzle: { kc1_1: 720, mc: 0.15 },
    taylor: { C: 700, n: 0.30 },
    density: 8.94,
    hardnessHB: 50,
    tensileStrength: 220,
    yieldStrength: 69,
    thermalConductivity: 391,
    thermalExpansion: 16.9,
    meltingPoint: 1083,
    machinabilityRating: 20,
    chipFormation: "continuous",
    builtUpEdgeTendency: "high",
    recommendedSFM: { roughing: 300, finishing: 500 },
    recommendedFeedIPR: { roughing: 0.008, finishing: 0.003 },
    machiningNotes: [
      "Soft, gummy, difficult to machine",
      "Long stringy chips",
      "Sharp tools, positive rake",
      "Electrical applications",
    ],
  },

  // ==================== CAST IRON ====================
  {
    id: "Gray Iron Class 30",
    name: "Gray Iron ASTM A48 Class 30",
    category: "cast_iron",
    aliases: ["gray iron", "grey iron", "class 30"],
    kienzle: { kc1_1: 1150, mc: 0.18 },
    taylor: { C: 250, n: 0.20 },
    density: 7.15,
    hardnessHB: 187,
    tensileStrength: 207,
    yieldStrength: 0, // Cast iron doesn't yield like steel
    thermalConductivity: 46.0,
    thermalExpansion: 10.8,
    meltingPoint: 1175,
    machinabilityRating: 80,
    chipFormation: "discontinuous",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 400, finishing: 600 },
    recommendedFeedIPR: { roughing: 0.012, finishing: 0.005 },
    machiningNotes: [
      "Graphite acts as lubricant",
      "Small, broken chips",
      "Creates abrasive dust - use extraction",
      "Can machine dry",
    ],
  },
  {
    id: "Ductile Iron 65-45-12",
    name: "Ductile Iron ASTM A536 65-45-12",
    category: "cast_iron",
    aliases: ["ductile iron", "nodular iron", "SG iron"],
    kienzle: { kc1_1: 1450, mc: 0.20 },
    taylor: { C: 220, n: 0.18 },
    density: 7.10,
    hardnessHB: 156,
    tensileStrength: 448,
    yieldStrength: 310,
    thermalConductivity: 36.0,
    thermalExpansion: 12.5,
    meltingPoint: 1150,
    machinabilityRating: 65,
    chipFormation: "segmented",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 350, finishing: 500 },
    recommendedFeedIPR: { roughing: 0.010, finishing: 0.004 },
    machiningNotes: [
      "More ductile than gray iron",
      "Better mechanical properties",
      "Slightly harder to machine than gray",
      "Longer chips than gray iron",
    ],
  },

  // ==================== PLASTICS ====================
  {
    id: "Delrin",
    name: "Delrin (Acetal Homopolymer)",
    category: "plastic",
    aliases: ["Delrin", "POM", "acetal", "polyoxymethylene"],
    kienzle: { kc1_1: 180, mc: 0.10 },
    taylor: { C: 2000, n: 0.45 },
    density: 1.42,
    hardnessHB: 20, // Rockwell M scale typically used
    tensileStrength: 69,
    yieldStrength: 65,
    thermalConductivity: 0.37,
    thermalExpansion: 90,
    meltingPoint: 175,
    machinabilityRating: 150,
    chipFormation: "continuous",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 500, finishing: 800 },
    recommendedFeedIPR: { roughing: 0.010, finishing: 0.005 },
    machiningNotes: [
      "Excellent machinability",
      "Low friction, self-lubricating",
      "Watch for heat buildup - melts easily",
      "Sharp tools, light cuts",
    ],
  },
  {
    id: "UHMW",
    name: "UHMW Polyethylene",
    category: "plastic",
    aliases: ["UHMW", "UHMWPE", "ultra high molecular weight"],
    kienzle: { kc1_1: 120, mc: 0.08 },
    taylor: { C: 2500, n: 0.50 },
    density: 0.94,
    hardnessHB: 10,
    tensileStrength: 40,
    yieldStrength: 21,
    thermalConductivity: 0.42,
    thermalExpansion: 180,
    meltingPoint: 130,
    machinabilityRating: 120,
    chipFormation: "continuous",
    builtUpEdgeTendency: "low",
    recommendedSFM: { roughing: 400, finishing: 700 },
    recommendedFeedIPR: { roughing: 0.012, finishing: 0.006 },
    machiningNotes: [
      "Soft, flexes during machining",
      "Use sharp tools, support material",
      "Low melting point - avoid friction heat",
      "Long stringy chips",
    ],
  },
];

// ============================================================================
// CANONICAL COEFFICIENT VALIDATION (U-AWR16)
// ============================================================================
// Validates that inline kienzle/taylor values match AISI_CUTTING_COEFFICIENTS.
// Ensures single source of truth for physics constants.

function validateCoefficientParity(): { valid: boolean; divergences: string[] } {
  const divergences: string[] = [];
  const tolerance = 0.001; // Allow 0.1% floating point tolerance

  for (const mat of MATERIALS) {
    const canonical = AISI_CUTTING_COEFFICIENTS[mat.id];
    if (!canonical) continue; // No canonical entry for this material

    // Check kc1_1
    if (Math.abs(mat.kienzle.kc1_1 - canonical.kc1_1) / canonical.kc1_1 > tolerance) {
      divergences.push(`${mat.id}: kc1_1 diverges (inline=${mat.kienzle.kc1_1}, canonical=${canonical.kc1_1})`);
    }
    // Check mc
    if (Math.abs(mat.kienzle.mc - canonical.mc) / canonical.mc > tolerance) {
      divergences.push(`${mat.id}: mc diverges (inline=${mat.kienzle.mc}, canonical=${canonical.mc})`);
    }
    // Check Taylor C
    if (Math.abs(mat.taylor.C - canonical.taylor_C) / canonical.taylor_C > tolerance) {
      divergences.push(`${mat.id}: taylor_C diverges (inline=${mat.taylor.C}, canonical=${canonical.taylor_C})`);
    }
    // Check Taylor n
    if (Math.abs(mat.taylor.n - canonical.taylor_n) / canonical.taylor_n > tolerance) {
      divergences.push(`${mat.id}: taylor_n diverges (inline=${mat.taylor.n}, canonical=${canonical.taylor_n})`);
    }
  }

  return { valid: divergences.length === 0, divergences };
}

/**
 * Gets canonical Kienzle coefficients from constants.ts, falling back to inline.
 * Use this method for calculations to ensure canonical values are used.
 */
function getCanonicalKienzle(materialId: string): KienzleCoefficients | null {
  const canonical = AISI_CUTTING_COEFFICIENTS[materialId];
  if (canonical) {
    return { kc1_1: canonical.kc1_1, mc: canonical.mc };
  }
  // Fallback to inline for materials not in canonical DB
  const mat = MATERIALS.find((m) => m.id === materialId);
  return mat?.kienzle || null;
}

/**
 * Gets canonical Taylor coefficients from constants.ts, falling back to inline.
 * Use this method for calculations to ensure canonical values are used.
 */
function getCanonicalTaylor(materialId: string): TaylorCoefficients | null {
  const canonical = AISI_CUTTING_COEFFICIENTS[materialId];
  if (canonical) {
    return { C: canonical.taylor_C, n: canonical.taylor_n };
  }
  // Fallback to inline for materials not in canonical DB
  const mat = MATERIALS.find((m) => m.id === materialId);
  return mat?.taylor || null;
}

// ============================================================================
// ENGINE
// ============================================================================

export class MaterialDatabaseEngine {
  private materials: Map<string, MaterialProperties>;

  constructor() {
    this.materials = new Map();
    this.loadMaterials();
    this.validateCanonicalParity();
    log.info(`[MaterialDB] Initialized with ${this.materials.size} materials`);
  }

  /**
   * Validates that inline coefficients match canonical constants.ts.
   * Logs warnings for any divergences (doesn't throw to allow graceful degradation).
   */
  private validateCanonicalParity(): void {
    const { valid, divergences } = validateCoefficientParity();
    if (!valid) {
      log.warn(`[MaterialDB] Coefficient divergence detected from constants.ts:`);
      divergences.forEach((d) => log.warn(`  ${d}`));
      log.warn(`[MaterialDB] Update AISI_CUTTING_COEFFICIENTS in src/physics/constants.ts to fix.`);
    }
  }

  private loadMaterials(): void {
    for (const mat of MATERIALS) {
      this.materials.set(mat.id.toLowerCase(), mat);
      // Also index by aliases
      for (const alias of mat.aliases) {
        this.materials.set(alias.toLowerCase(), mat);
      }
    }
  }

  /**
   * Get material by ID or alias
   */
  getMaterial(idOrAlias: string): MaterialProperties | null {
    return this.materials.get(idOrAlias.toLowerCase()) || null;
  }

  /**
   * Search materials by keyword
   */
  search(query: string): MaterialProperties[] {
    const normalized = query.toLowerCase();
    const results: MaterialProperties[] = [];
    const seen = new Set<string>();

    for (const mat of MATERIALS) {
      if (seen.has(mat.id)) continue;

      const searchText = `${mat.id} ${mat.name} ${mat.aliases.join(" ")} ${mat.category}`.toLowerCase();
      if (searchText.includes(normalized)) {
        results.push(mat);
        seen.add(mat.id);
      }
    }

    return results;
  }

  /**
   * Get materials by category
   */
  getByCategory(category: MaterialCategory): MaterialProperties[] {
    return MATERIALS.filter((m) => m.category === category);
  }

  /**
   * Get Kienzle coefficients for a material.
   * Returns canonical values from constants.ts when available.
   */
  getKienzleCoefficients(material: string): KienzleCoefficients | null {
    const mat = this.getMaterial(material);
    if (!mat) return null;
    // Prefer canonical constants.ts values
    return getCanonicalKienzle(mat.id) || mat.kienzle;
  }

  /**
   * Get Taylor coefficients for a material.
   * Returns canonical values from constants.ts when available.
   */
  getTaylorCoefficients(material: string): TaylorCoefficients | null {
    const mat = this.getMaterial(material);
    if (!mat) return null;
    // Prefer canonical constants.ts values
    return getCanonicalTaylor(mat.id) || mat.taylor;
  }

  /**
   * Get recommended cutting parameters
   */
  getRecommendedParameters(
    material: string,
    operation: "roughing" | "finishing"
  ): { sfm: number; feedIPR: number } | null {
    const mat = this.getMaterial(material);
    if (!mat) return null;

    return {
      sfm: mat.recommendedSFM[operation],
      feedIPR: mat.recommendedFeedIPR[operation],
    };
  }

  /**
   * Get all material IDs
   */
  getAllMaterialIds(): string[] {
    return MATERIALS.map((m) => m.id);
  }

  /**
   * Get count of materials
   */
  getCount(): number {
    return MATERIALS.length;
  }

  /**
   * Get summary for session awareness
   */
  getSummary(): string {
    const byCategory: Record<string, number> = {};
    for (const mat of MATERIALS) {
      byCategory[mat.category] = (byCategory[mat.category] || 0) + 1;
    }

    const lines = [
      `MATERIAL DATABASE: ${MATERIALS.length} materials`,
      "",
      "BY CATEGORY:",
      ...Object.entries(byCategory).map(([cat, count]) => `  ${cat}: ${count}`),
      "",
      "KEY MATERIALS:",
      ...MATERIALS.slice(0, 10).map((m) => `  ${m.id}: kc1.1=${m.kienzle.kc1_1}`),
    ];

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const materialDatabaseEngine = new MaterialDatabaseEngine();
