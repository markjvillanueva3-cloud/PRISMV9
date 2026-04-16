/**
 * AGIE (Charmilles/GF Machining Solutions) Wire EDM Power Data
 *
 * Extracted from Mastercam Wire EDM power files:
 * - AGIE.POWER (binary power file)
 * - mc_agie.dat (machine/material/Ra/thickness lookup)
 * - agiewires.utc (wire type definitions)
 * - agie.map (machine types and parameter mappings)
 *
 * Source: H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/
 *
 * AGIE/Charmilles uses different parameter naming than Mitsubishi/Makino:
 * - MAC = Machine code (128 = default AGIE)
 * - MAT = Material code (1-181)
 * - HEI = Height/thickness code
 * - MAF1/MAF2 = Material adjustment factors
 * - DIF1/DIF2 = Differential/offset factors
 * - RUG_RA = Surface roughness Ra target (micrometers)
 * - TF = Thickness factor (mm)
 * - TE = Taper/angle code
 * - TKM = Technology module/pass configuration
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AGIE machine type/family
 */
export interface AgieMachineType {
  /** Machine type index (from agie.map) */
  index: number;
  /** Machine family name */
  name: string;
  /** Description/era */
  description: string;
  /** Typical axis travels if known */
  typicalTravels_mm?: { x: number; y: number; z: number };
}

/**
 * AGIE wire type definition
 */
export interface AgieWireType {
  /** Wire ID (from agiewires.utc U record) */
  id: number;
  /** Wire family code */
  familyCode: number;
  /** Wire name */
  name: string;
  /** Wire code (4-digit) */
  wireCode: string;
  /** Wire diameter in mm */
  diameter_mm: number;
  /** Wire material type (brass, coated brass, tungsten, etc.) */
  material: "brass" | "coated_brass" | "zinc_coated" | "gamma_coated" | "tungsten" | "molybdenum";
  /** Coating type if applicable */
  coating?: string;
  /** Cost factor relative to standard brass */
  costFactor: number;
  /** Tension factor */
  tensionFactor: number;
  /** Offset adjustment */
  offsetAdjust: number;
  /** Suitable for high-speed cutting */
  highSpeed: boolean;
  /** Suitable for fine finish */
  fineFinish: boolean;
}

/**
 * AGIE material code mapping
 */
export interface AgieMaterialCode {
  /** Material code (1-181) */
  code: number;
  /** Material group name */
  name: string;
  /** ISO material group (P/M/K/N/S/H) */
  isoGroup: "P" | "M" | "K" | "N" | "S" | "H";
  /** Machinability factor relative to tool steel (1.0) */
  machinabilityFactor: number;
  /** Typical hardness range (HRC) */
  hardnessRange?: { min: number; max: number };
}

/**
 * Surface roughness Ra target with pass configuration
 */
export interface AgieRaTarget {
  /** Ra index (from agie.map) */
  index: number;
  /** Target Ra in micrometers */
  ra_um: number;
  /** Typical number of passes required */
  typicalPasses: number;
  /** Pass type for final pass */
  finalPassType: "rough" | "skim" | "fine" | "mirror";
}

/**
 * Thickness range entry
 */
export interface AgieThicknessRange {
  /** Thickness factor value */
  tf: number;
  /** Thickness in mm */
  thickness_mm: number;
  /** Speed factor relative to 25mm reference */
  speedFactor: number;
  /** Offset adjustment for this thickness */
  offsetAdjust_mm: number;
}

/**
 * Complete AGIE power lookup entry
 */
export interface AgiePowerEntry {
  /** Machine code */
  machineCode: number;
  /** Material code */
  materialCode: number;
  /** Height/thickness code */
  heightCode: number;
  /** Material factor 1 */
  materialFactor1: number;
  /** Differential factor 1 (offset) */
  diffFactor1: number;
  /** Material factor 2 */
  materialFactor2: number;
  /** Differential factor 2 */
  diffFactor2: number;
  /** Target Ra in micrometers */
  rugRa_um: number;
  /** Thickness factor in mm */
  thicknessFactor_mm: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MACHINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AGIE/Charmilles machine families
 * Source: agie.map [AGIE MACHINE TYPES] section
 */
export const AGIE_MACHINE_TYPES: AgieMachineType[] = [
  { index: 0, name: "Classic", description: "Legacy AGIE machines (1980s-1990s)" },
  { index: 1, name: "Challenge", description: "Entry-level production machines" },
  { index: 2, name: "Evolution", description: "Mid-range machines with AWF" },
  { index: 3, name: "Excellence", description: "High-precision machines" },
  { index: 4, name: "Progress", description: "Advanced production machines" },
  { index: 5, name: "Vertex", description: "High-speed cutting machines" },
  { index: 6, name: "Attak", description: "Economic fast machines" },
  // Additional models found in agie.map
  { index: 7, name: "V304", description: "V-series 304" },
  { index: 8, name: "VERS", description: "Versatile series" },
  { index: 9, name: "V401", description: "V-series 401" },
  { index: 10, name: "V5", description: "V-series 5" },
];

// ═══════════════════════════════════════════════════════════════════════════
// WIRE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AGIE/Charmilles wire electrode types
 * Source: agiewires.utc
 *
 * Wire codes:
 * - 0000: Standard brass (SW series)
 * - 0010: Diffusion annealed (Cobra Cut D)
 * - 0020: Beryllium-free coated (Thermo-Brass, Berco Cut)
 * - 0040: Tungsten wire (TWS series)
 * - 0070: Steel-core precision (SP Wire)
 * - 0080: Gamma-phase coated (Cobra Cut G)
 * - 0090: Thermo-Speed coated
 * - 0100-0130: Various coated/specialty wires
 */
export const AGIE_WIRE_TYPES: AgieWireType[] = [
  // Thermo-SD series (code 0130) - High-speed coated
  {
    id: 2,
    familyCode: 8128240,
    name: "Thermo-SD 25",
    wireCode: "0130",
    diameter_mm: 0.25,
    material: "coated_brass",
    coating: "Thermo-SD zinc diffusion",
    costFactor: 0.97,
    tensionFactor: 13.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },

  // Topas_H series (code 0130) - Precision coated
  {
    id: 3,
    familyCode: 8128240,
    name: "Topas_H 0.30",
    wireCode: "0130",
    diameter_mm: 0.30,
    material: "coated_brass",
    coating: "Topas hard coating",
    costFactor: 0.97,
    tensionFactor: 13.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: true,
  },
  {
    id: 4,
    familyCode: 8128240,
    name: "Topas_H 0.25",
    wireCode: "0130",
    diameter_mm: 0.25,
    material: "coated_brass",
    coating: "Topas hard coating",
    costFactor: 0.97,
    tensionFactor: 13.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: true,
  },

  // HIS series (code 0110) - High-intensity spark
  {
    id: 5,
    familyCode: 8128240,
    name: "HIS 0.33",
    wireCode: "0110",
    diameter_mm: 0.33,
    material: "coated_brass",
    coating: "HIS high-intensity",
    costFactor: 1.25,
    tensionFactor: 11.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },

  // Cobra Cut V series (code 0100) - Vapor-deposited coating
  {
    id: 6,
    familyCode: 8128240,
    name: "Cobra Cut V 0.33",
    wireCode: "0100",
    diameter_mm: 0.33,
    material: "coated_brass",
    coating: "Vapor deposited zinc",
    costFactor: 0.90,
    tensionFactor: 12.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },
  {
    id: 7,
    familyCode: 8128240,
    name: "Cobra Cut V 0.30",
    wireCode: "0100",
    diameter_mm: 0.30,
    material: "coated_brass",
    coating: "Vapor deposited zinc",
    costFactor: 0.90,
    tensionFactor: 11.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },

  // Cobra Cut standard (code 0120)
  {
    id: 8,
    familyCode: 8128240,
    name: "Cobra Cut 0.20",
    wireCode: "0120",
    diameter_mm: 0.20,
    material: "coated_brass",
    coating: "Standard zinc",
    costFactor: 1.00,
    tensionFactor: 4.3,
    offsetAdjust: 0,
    highSpeed: false,
    fineFinish: true,
  },

  // Thermo-Speed series (code 0090) - Fast cutting
  {
    id: 9,
    familyCode: 8128240,
    name: "Thermo-Speed 0.33",
    wireCode: "0090",
    diameter_mm: 0.33,
    material: "coated_brass",
    coating: "Thermo-Speed",
    costFactor: 0.55,
    tensionFactor: 7.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },
  {
    id: 10,
    familyCode: 8128240,
    name: "Thermo-Speed 0.30",
    wireCode: "0090",
    diameter_mm: 0.30,
    material: "coated_brass",
    coating: "Thermo-Speed",
    costFactor: 0.55,
    tensionFactor: 7.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },

  // Cobra Cut G series (code 0080) - Gamma-phase coating for precision
  {
    id: 11,
    familyCode: 8128240,
    name: "Cobra Cut G 0.25",
    wireCode: "0080",
    diameter_mm: 0.25,
    material: "gamma_coated",
    coating: "Gamma-phase zinc",
    costFactor: 1.06,
    tensionFactor: 14.0,
    offsetAdjust: -0.6,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 12,
    familyCode: 8128240,
    name: "Cobra Cut G 0.20",
    wireCode: "0080",
    diameter_mm: 0.20,
    material: "gamma_coated",
    coating: "Gamma-phase zinc",
    costFactor: 1.03,
    tensionFactor: 18.2,
    offsetAdjust: -0.6,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 13,
    familyCode: 8128240,
    name: "Cobra Cut G 0.15",
    wireCode: "0080",
    diameter_mm: 0.15,
    material: "gamma_coated",
    coating: "Gamma-phase zinc",
    costFactor: 1.04,
    tensionFactor: 21.0,
    offsetAdjust: -0.65,
    highSpeed: false,
    fineFinish: true,
  },

  // Thermo-Brass series (code 0020) - Standard coated
  {
    id: 14,
    familyCode: 8128240,
    name: "Thermo-Brass30",
    wireCode: "0020",
    diameter_mm: 0.30,
    material: "zinc_coated",
    coating: "Thermo zinc",
    costFactor: 1.06,
    tensionFactor: 14.0,
    offsetAdjust: -0.60,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 15,
    familyCode: 8128240,
    name: "Thermo-Brass25",
    wireCode: "0020",
    diameter_mm: 0.25,
    material: "zinc_coated",
    coating: "Thermo zinc",
    costFactor: 1.06,
    tensionFactor: 14.0,
    offsetAdjust: -0.60,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 16,
    familyCode: 8128240,
    name: "Thermo-Brass20",
    wireCode: "0020",
    diameter_mm: 0.20,
    material: "zinc_coated",
    coating: "Thermo zinc",
    costFactor: 1.03,
    tensionFactor: 18.2,
    offsetAdjust: -0.60,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 17,
    familyCode: 8128240,
    name: "Thermo-Brass15",
    wireCode: "0020",
    diameter_mm: 0.15,
    material: "zinc_coated",
    coating: "Thermo zinc",
    costFactor: 1.04,
    tensionFactor: 21.0,
    offsetAdjust: -0.65,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 18,
    familyCode: 8128240,
    name: "Thermo-Brass10",
    wireCode: "0020",
    diameter_mm: 0.10,
    material: "zinc_coated",
    coating: "Thermo zinc",
    costFactor: 0.90,
    tensionFactor: 23.0,
    offsetAdjust: -0.70,
    highSpeed: false,
    fineFinish: true,
  },

  // SW A series (code 0000) - Standard brass wire
  {
    id: 19,
    familyCode: 8128240,
    name: "SW 30 A",
    wireCode: "0000",
    diameter_mm: 0.30,
    material: "brass",
    costFactor: 1.03,
    tensionFactor: 13.5,
    offsetAdjust: -0.60,
    highSpeed: false,
    fineFinish: false,
  },
  {
    id: 20,
    familyCode: 8128240,
    name: "SW 25 A",
    wireCode: "0000",
    diameter_mm: 0.25,
    material: "brass",
    costFactor: 1.03,
    tensionFactor: 13.5,
    offsetAdjust: -0.60,
    highSpeed: false,
    fineFinish: false,
  },
  {
    id: 21,
    familyCode: 8128240,
    name: "SW 20 A",
    wireCode: "0000",
    diameter_mm: 0.20,
    material: "brass",
    costFactor: 1.03,
    tensionFactor: 18.2,
    offsetAdjust: -0.60,
    highSpeed: false,
    fineFinish: false,
  },
  {
    id: 22,
    familyCode: 8128240,
    name: "SW 15 A",
    wireCode: "0000",
    diameter_mm: 0.15,
    material: "brass",
    costFactor: 1.04,
    tensionFactor: 21.0,
    offsetAdjust: -0.65,
    highSpeed: false,
    fineFinish: false,
  },
  {
    id: 23,
    familyCode: 8128240,
    name: "SW 10 A",
    wireCode: "0000",
    diameter_mm: 0.10,
    material: "brass",
    costFactor: 0.90,
    tensionFactor: 23.0,
    offsetAdjust: -0.70,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 24,
    familyCode: 8128240,
    name: "SW 07 A",
    wireCode: "0000",
    diameter_mm: 0.07,
    material: "brass",
    costFactor: 0.90,
    tensionFactor: 24.0,
    offsetAdjust: -0.70,
    highSpeed: false,
    fineFinish: true,
  },

  // Berco Cut series (code 0020) - Beryllium-free coated
  {
    id: 25,
    familyCode: 8128240,
    name: "Berco Cut 0.30",
    wireCode: "0020",
    diameter_mm: 0.30,
    material: "coated_brass",
    coating: "Beryllium-free zinc",
    costFactor: 1.06,
    tensionFactor: 14.0,
    offsetAdjust: 0,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 26,
    familyCode: 8128240,
    name: "Berco Cut 0.25",
    wireCode: "0020",
    diameter_mm: 0.25,
    material: "coated_brass",
    coating: "Beryllium-free zinc",
    costFactor: 1.06,
    tensionFactor: 14.0,
    offsetAdjust: 0,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 27,
    familyCode: 8128240,
    name: "Berco Cut 0.20",
    wireCode: "0020",
    diameter_mm: 0.20,
    material: "coated_brass",
    coating: "Beryllium-free zinc",
    costFactor: 1.03,
    tensionFactor: 18.2,
    offsetAdjust: -0.6,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 28,
    familyCode: 8128240,
    name: "Berco Cut 0.15",
    wireCode: "0020",
    diameter_mm: 0.15,
    material: "coated_brass",
    coating: "Beryllium-free zinc",
    costFactor: 1.04,
    tensionFactor: 21.0,
    offsetAdjust: -0.65,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 29,
    familyCode: 8128240,
    name: "Berco Cut 0.10",
    wireCode: "0020",
    diameter_mm: 0.10,
    material: "coated_brass",
    coating: "Beryllium-free zinc",
    costFactor: 0.90,
    tensionFactor: 23.0,
    offsetAdjust: -0.7,
    highSpeed: false,
    fineFinish: true,
  },

  // SP Wire series (code 0070) - Steel-core precision
  {
    id: 30,
    familyCode: 8128240,
    name: "SP Wire 0.07",
    wireCode: "0070",
    diameter_mm: 0.07,
    material: "molybdenum",
    coating: "Steel-core precision",
    costFactor: 1.88,
    tensionFactor: 1000,
    offsetAdjust: -0.85,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 31,
    familyCode: 8128240,
    name: "SP Wire 0.05",
    wireCode: "0070",
    diameter_mm: 0.05,
    material: "molybdenum",
    coating: "Steel-core precision",
    costFactor: 1.88,
    tensionFactor: 1000,
    offsetAdjust: -0.85,
    highSpeed: false,
    fineFinish: true,
  },

  // TWS series (code 0040) - Tungsten wire
  {
    id: 32,
    familyCode: 8128240,
    name: "TWS-50",
    wireCode: "0040",
    diameter_mm: 0.05,
    material: "tungsten",
    costFactor: 4.15,
    tensionFactor: 1000,
    offsetAdjust: -0.85,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 33,
    familyCode: 8128240,
    name: "TWS-30",
    wireCode: "0040",
    diameter_mm: 0.03,
    material: "tungsten",
    costFactor: 4.15,
    tensionFactor: 1000,
    offsetAdjust: -0.85,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 34,
    familyCode: 8128240,
    name: "TWS-20",
    wireCode: "0040",
    diameter_mm: 0.02,
    material: "tungsten",
    costFactor: 4.15,
    tensionFactor: 1000,
    offsetAdjust: -0.75,
    highSpeed: false,
    fineFinish: true,
  },

  // Cobra Cut D series (code 0010) - Diffusion annealed
  {
    id: 35,
    familyCode: 8128240,
    name: "Cobra Cut D 0.25",
    wireCode: "0010",
    diameter_mm: 0.25,
    material: "coated_brass",
    coating: "Diffusion annealed",
    costFactor: 0.99,
    tensionFactor: 13.0,
    offsetAdjust: 0,
    highSpeed: true,
    fineFinish: false,
  },

  // Cobra Cut A series (code 0000) - Standard brass Cobra
  {
    id: 36,
    familyCode: 8128240,
    name: "Cobra Cut A 0.30",
    wireCode: "0000",
    diameter_mm: 0.30,
    material: "brass",
    costFactor: 1.03,
    tensionFactor: 13.5,
    offsetAdjust: 0,
    highSpeed: false,
    fineFinish: false,
  },
  {
    id: 37,
    familyCode: 8128240,
    name: "Cobra Cut A 0.25",
    wireCode: "0000",
    diameter_mm: 0.25,
    material: "brass",
    costFactor: 1.03,
    tensionFactor: 13.5,
    offsetAdjust: 0,
    highSpeed: false,
    fineFinish: false,
  },
  {
    id: 38,
    familyCode: 8128240,
    name: "Cobra Cut A 0.20",
    wireCode: "0000",
    diameter_mm: 0.20,
    material: "brass",
    costFactor: 1.03,
    tensionFactor: 18.2,
    offsetAdjust: -0.6,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 39,
    familyCode: 8128240,
    name: "Cobra Cut A 0.15",
    wireCode: "0000",
    diameter_mm: 0.15,
    material: "brass",
    costFactor: 1.04,
    tensionFactor: 21.0,
    offsetAdjust: -0.65,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 40,
    familyCode: 8128240,
    name: "Cobra Cut A 0.10",
    wireCode: "0000",
    diameter_mm: 0.10,
    material: "brass",
    costFactor: 0.90,
    tensionFactor: 23.0,
    offsetAdjust: -0.7,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 41,
    familyCode: 8128240,
    name: "Cobra Cut A 0.07",
    wireCode: "0000",
    diameter_mm: 0.07,
    material: "brass",
    costFactor: 0.90,
    tensionFactor: 24.0,
    offsetAdjust: -0.7,
    highSpeed: false,
    fineFinish: true,
  },
  {
    id: 42,
    familyCode: 8128240,
    name: "Cobra Cut A 0.05",
    wireCode: "0000",
    diameter_mm: 0.05,
    material: "brass",
    costFactor: 0.90,
    tensionFactor: 25.0,
    offsetAdjust: -0.7,
    highSpeed: false,
    fineFinish: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL CODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AGIE material code definitions
 * Source: mc_agie.dat MAT codes + industry standard mappings
 *
 * Code structure:
 * - 1-9: Tool steel variants
 * - 11-19: Stainless steel variants
 * - 21-29: High-speed steel variants
 * - 31-39: Cast iron variants
 * - 41-49: Aluminum alloy variants
 * - 51-59: Copper alloy variants
 * - 61-69: Titanium alloy variants
 * - 71-79: Nickel alloy variants
 * - 81-89: Tungsten carbide variants
 * - 91-99: Graphite/carbon variants
 * - 101-109: Sintered materials
 * - 111-119: Hardened steel (>50 HRC)
 * - 121-126: PCD/CBN materials
 * - 131-133: Polycrystalline materials
 * - 141-149: Ceramics
 * - 151-155: Composites
 * - 161-162: Special alloys
 * - 171+: Reserved
 */
export const AGIE_MATERIAL_CODES: AgieMaterialCode[] = [
  // Tool Steel (P group)
  { code: 1, name: "Tool Steel (General)", isoGroup: "P", machinabilityFactor: 1.0 },

  // Stainless Steel (M group)
  { code: 11, name: "Stainless Steel (Austenitic)", isoGroup: "M", machinabilityFactor: 0.85 },

  // High-Speed Steel
  { code: 21, name: "HSS (M2/M42)", isoGroup: "P", machinabilityFactor: 0.75, hardnessRange: { min: 60, max: 67 } },

  // Cast Iron (K group)
  { code: 31, name: "Cast Iron (Grey)", isoGroup: "K", machinabilityFactor: 1.2 },

  // Aluminum (N group)
  { code: 41, name: "Aluminum Alloy", isoGroup: "N", machinabilityFactor: 1.5 },

  // Copper Alloys (N group)
  { code: 51, name: "Copper/Bronze", isoGroup: "N", machinabilityFactor: 1.3 },

  // Titanium (S group)
  { code: 61, name: "Titanium Alloy", isoGroup: "S", machinabilityFactor: 0.6 },

  // Nickel Alloys (S group)
  { code: 71, name: "Nickel Alloy (Inconel)", isoGroup: "S", machinabilityFactor: 0.5 },

  // Tungsten Carbide (H group)
  { code: 81, name: "Tungsten Carbide", isoGroup: "H", machinabilityFactor: 0.3, hardnessRange: { min: 85, max: 95 } },

  // Graphite (special)
  { code: 91, name: "Graphite (EDM Electrode)", isoGroup: "K", machinabilityFactor: 2.0 },

  // Sintered Materials
  { code: 101, name: "Sintered Steel", isoGroup: "P", machinabilityFactor: 0.8 },

  // Hardened Steel (H group)
  {
    code: 111,
    name: "Hardened Tool Steel (>50 HRC)",
    isoGroup: "H",
    machinabilityFactor: 0.7,
    hardnessRange: { min: 50, max: 65 },
  },

  // PCD/CBN (special hard materials)
  { code: 121, name: "PCD (Polycrystalline Diamond)", isoGroup: "H", machinabilityFactor: 0.15 },
  { code: 122, name: "CBN (Cubic Boron Nitride)", isoGroup: "H", machinabilityFactor: 0.2 },
  { code: 123, name: "PCD-Tipped Inserts", isoGroup: "H", machinabilityFactor: 0.18 },
  { code: 124, name: "Natural Diamond", isoGroup: "H", machinabilityFactor: 0.1 },
  { code: 125, name: "Synthetic Diamond", isoGroup: "H", machinabilityFactor: 0.12 },
  { code: 126, name: "Diamond Compact", isoGroup: "H", machinabilityFactor: 0.14 },

  // Additional hard materials
  { code: 131, name: "Stellite", isoGroup: "S", machinabilityFactor: 0.45 },
  { code: 132, name: "Hastelloy", isoGroup: "S", machinabilityFactor: 0.4 },
  { code: 133, name: "Waspaloy", isoGroup: "S", machinabilityFactor: 0.4 },

  // Ceramics
  { code: 141, name: "Ceramic (Alumina)", isoGroup: "H", machinabilityFactor: 0.25 },

  // Composites
  { code: 151, name: "Metal Matrix Composite", isoGroup: "N", machinabilityFactor: 0.5 },
  { code: 152, name: "Fiber-Reinforced Composite", isoGroup: "N", machinabilityFactor: 0.6 },
  { code: 153, name: "Cermet", isoGroup: "H", machinabilityFactor: 0.35 },
  { code: 154, name: "Silicon Nitride", isoGroup: "H", machinabilityFactor: 0.3 },
  { code: 155, name: "Silicon Carbide", isoGroup: "H", machinabilityFactor: 0.28 },

  // Special alloys
  { code: 161, name: "Kovar", isoGroup: "M", machinabilityFactor: 0.6 },
  { code: 162, name: "Invar", isoGroup: "M", machinabilityFactor: 0.55 },

  // Magnesium
  { code: 171, name: "Magnesium Alloy", isoGroup: "N", machinabilityFactor: 1.8 },

  // Beryllium
  { code: 181, name: "Beryllium Copper", isoGroup: "N", machinabilityFactor: 0.9 },
];

// ═══════════════════════════════════════════════════════════════════════════
// RA TARGETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Surface roughness Ra targets with pass configurations
 * Source: agie.map [AGIE MAP RA] section
 */
export const AGIE_RA_TARGETS: AgieRaTarget[] = [
  { index: 0, ra_um: 0.01, typicalPasses: 7, finalPassType: "mirror" },
  { index: 1, ra_um: 0.04, typicalPasses: 6, finalPassType: "mirror" },
  { index: 2, ra_um: 0.1, typicalPasses: 5, finalPassType: "fine" },
  { index: 3, ra_um: 0.12, typicalPasses: 5, finalPassType: "fine" },
  { index: 4, ra_um: 0.15, typicalPasses: 4, finalPassType: "fine" },
  { index: 5, ra_um: 0.18, typicalPasses: 4, finalPassType: "fine" },
  { index: 6, ra_um: 0.2, typicalPasses: 4, finalPassType: "fine" },
  { index: 7, ra_um: 0.25, typicalPasses: 4, finalPassType: "skim" },
  { index: 8, ra_um: 0.3, typicalPasses: 3, finalPassType: "skim" },
  { index: 9, ra_um: 0.35, typicalPasses: 3, finalPassType: "skim" },
  { index: 10, ra_um: 0.4, typicalPasses: 3, finalPassType: "skim" },
  { index: 11, ra_um: 0.45, typicalPasses: 3, finalPassType: "skim" },
  { index: 12, ra_um: 0.5, typicalPasses: 3, finalPassType: "skim" },
  { index: 13, ra_um: 0.6, typicalPasses: 2, finalPassType: "skim" },
  { index: 14, ra_um: 0.7, typicalPasses: 2, finalPassType: "skim" },
  { index: 15, ra_um: 0.8, typicalPasses: 2, finalPassType: "skim" },
  { index: 16, ra_um: 0.9, typicalPasses: 2, finalPassType: "skim" },
  { index: 17, ra_um: 1.0, typicalPasses: 2, finalPassType: "skim" },
  { index: 18, ra_um: 1.1, typicalPasses: 2, finalPassType: "skim" },
  { index: 19, ra_um: 1.2, typicalPasses: 2, finalPassType: "skim" },
  { index: 20, ra_um: 1.3, typicalPasses: 2, finalPassType: "skim" },
  { index: 21, ra_um: 1.5, typicalPasses: 2, finalPassType: "skim" },
  { index: 22, ra_um: 1.8, typicalPasses: 1, finalPassType: "rough" },
  { index: 23, ra_um: 2.0, typicalPasses: 1, finalPassType: "rough" },
  { index: 24, ra_um: 2.3, typicalPasses: 1, finalPassType: "rough" },
  { index: 25, ra_um: 2.5, typicalPasses: 1, finalPassType: "rough" },
  { index: 26, ra_um: 3.0, typicalPasses: 1, finalPassType: "rough" },
  { index: 27, ra_um: 5.0, typicalPasses: 1, finalPassType: "rough" },
];

// ═══════════════════════════════════════════════════════════════════════════
// THICKNESS RANGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Thickness factor to actual thickness mapping with speed factors
 * Source: mc_agie.dat TF values
 *
 * Speed factor is relative to 25mm reference thickness
 */
export const AGIE_THICKNESS_RANGES: AgieThicknessRange[] = [
  { tf: 0.5, thickness_mm: 0.5, speedFactor: 2.5, offsetAdjust_mm: -0.002 },
  { tf: 1.0, thickness_mm: 1.0, speedFactor: 2.2, offsetAdjust_mm: -0.002 },
  { tf: 1.5, thickness_mm: 1.5, speedFactor: 2.0, offsetAdjust_mm: -0.001 },
  { tf: 2.0, thickness_mm: 2.0, speedFactor: 1.9, offsetAdjust_mm: -0.001 },
  { tf: 2.5, thickness_mm: 2.5, speedFactor: 1.8, offsetAdjust_mm: -0.001 },
  { tf: 3.0, thickness_mm: 3.0, speedFactor: 1.7, offsetAdjust_mm: 0 },
  { tf: 3.5, thickness_mm: 3.5, speedFactor: 1.65, offsetAdjust_mm: 0 },
  { tf: 4.0, thickness_mm: 4.0, speedFactor: 1.6, offsetAdjust_mm: 0 },
  { tf: 4.5, thickness_mm: 4.5, speedFactor: 1.55, offsetAdjust_mm: 0 },
  { tf: 5.0, thickness_mm: 5.0, speedFactor: 1.5, offsetAdjust_mm: 0 },
  { tf: 5.5, thickness_mm: 5.5, speedFactor: 1.45, offsetAdjust_mm: 0 },
  { tf: 6.0, thickness_mm: 6.0, speedFactor: 1.4, offsetAdjust_mm: 0 },
  { tf: 6.5, thickness_mm: 6.5, speedFactor: 1.35, offsetAdjust_mm: 0 },
  { tf: 7.0, thickness_mm: 7.0, speedFactor: 1.3, offsetAdjust_mm: 0 },
  { tf: 7.5, thickness_mm: 7.5, speedFactor: 1.25, offsetAdjust_mm: 0 },
  { tf: 8.0, thickness_mm: 8.0, speedFactor: 1.2, offsetAdjust_mm: 0 },
  { tf: 8.5, thickness_mm: 8.5, speedFactor: 1.18, offsetAdjust_mm: 0 },
  { tf: 9.0, thickness_mm: 9.0, speedFactor: 1.15, offsetAdjust_mm: 0 },
  { tf: 9.5, thickness_mm: 9.5, speedFactor: 1.12, offsetAdjust_mm: 0 },
  { tf: 10.0, thickness_mm: 10.0, speedFactor: 1.1, offsetAdjust_mm: 0 },
  { tf: 11.0, thickness_mm: 11.0, speedFactor: 1.08, offsetAdjust_mm: 0 },
  { tf: 12.0, thickness_mm: 12.0, speedFactor: 1.06, offsetAdjust_mm: 0 },
  { tf: 13.0, thickness_mm: 13.0, speedFactor: 1.04, offsetAdjust_mm: 0 },
  { tf: 14.0, thickness_mm: 14.0, speedFactor: 1.02, offsetAdjust_mm: 0 },
  { tf: 15.0, thickness_mm: 15.0, speedFactor: 1.01, offsetAdjust_mm: 0 },
  { tf: 16.0, thickness_mm: 16.0, speedFactor: 1.0, offsetAdjust_mm: 0 },
  { tf: 17.0, thickness_mm: 17.0, speedFactor: 0.99, offsetAdjust_mm: 0 },
  { tf: 18.0, thickness_mm: 18.0, speedFactor: 0.98, offsetAdjust_mm: 0 },
  { tf: 19.0, thickness_mm: 19.0, speedFactor: 0.97, offsetAdjust_mm: 0 },
  { tf: 20.0, thickness_mm: 20.0, speedFactor: 0.95, offsetAdjust_mm: 0 },
  { tf: 25.0, thickness_mm: 25.0, speedFactor: 1.0, offsetAdjust_mm: 0 }, // Reference
  { tf: 30.0, thickness_mm: 30.0, speedFactor: 0.92, offsetAdjust_mm: 0 },
  { tf: 35.0, thickness_mm: 35.0, speedFactor: 0.85, offsetAdjust_mm: 0 },
  { tf: 40.0, thickness_mm: 40.0, speedFactor: 0.8, offsetAdjust_mm: 0 },
  { tf: 45.0, thickness_mm: 45.0, speedFactor: 0.75, offsetAdjust_mm: 0 },
  { tf: 50.0, thickness_mm: 50.0, speedFactor: 0.7, offsetAdjust_mm: 0.001 },
  { tf: 55.0, thickness_mm: 55.0, speedFactor: 0.65, offsetAdjust_mm: 0.001 },
  { tf: 60.0, thickness_mm: 60.0, speedFactor: 0.6, offsetAdjust_mm: 0.001 },
  { tf: 65.0, thickness_mm: 65.0, speedFactor: 0.55, offsetAdjust_mm: 0.001 },
  { tf: 70.0, thickness_mm: 70.0, speedFactor: 0.5, offsetAdjust_mm: 0.002 },
  { tf: 75.0, thickness_mm: 75.0, speedFactor: 0.48, offsetAdjust_mm: 0.002 },
  { tf: 80.0, thickness_mm: 80.0, speedFactor: 0.45, offsetAdjust_mm: 0.002 },
  { tf: 85.0, thickness_mm: 85.0, speedFactor: 0.42, offsetAdjust_mm: 0.002 },
  { tf: 90.0, thickness_mm: 90.0, speedFactor: 0.4, offsetAdjust_mm: 0.003 },
  { tf: 95.0, thickness_mm: 95.0, speedFactor: 0.38, offsetAdjust_mm: 0.003 },
  { tf: 100.0, thickness_mm: 100.0, speedFactor: 0.35, offsetAdjust_mm: 0.003 },
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find wire type by diameter
 */
export function findAgieWireByDiameter(diameter_mm: number): AgieWireType[] {
  const tolerance = 0.005; // 5 micron tolerance
  return AGIE_WIRE_TYPES.filter((w) => Math.abs(w.diameter_mm - diameter_mm) <= tolerance);
}

/**
 * Find wire type by name (partial match)
 */
export function findAgieWireByName(namePattern: string): AgieWireType[] {
  const pattern = namePattern.toLowerCase();
  return AGIE_WIRE_TYPES.filter((w) => w.name.toLowerCase().includes(pattern));
}

/**
 * Get recommended wire for material and Ra target
 */
export function getRecommendedWire(
  materialCode: number,
  targetRa_um: number
): { primary: AgieWireType; alternatives: AgieWireType[] } | null {
  const material = AGIE_MATERIAL_CODES.find((m) => m.code === materialCode);
  if (!material) return null;

  // For fine finishes (Ra < 0.3), prefer gamma-coated or precision wires
  if (targetRa_um < 0.3) {
    const fineWires = AGIE_WIRE_TYPES.filter((w) => w.fineFinish && w.diameter_mm <= 0.2);
    if (fineWires.length > 0) {
      return { primary: fineWires[0], alternatives: fineWires.slice(1, 3) };
    }
  }

  // For rough cuts on hard materials (carbide, PCD), use tungsten wire
  if (material.isoGroup === "H" && targetRa_um >= 1.0) {
    const tungstenWires = AGIE_WIRE_TYPES.filter((w) => w.material === "tungsten");
    if (tungstenWires.length > 0) {
      return { primary: tungstenWires[0], alternatives: [] };
    }
  }

  // Default: 0.25mm coated brass for balance of speed and finish
  const standardWires = AGIE_WIRE_TYPES.filter((w) => w.diameter_mm === 0.25 && w.material !== "tungsten");

  if (standardWires.length > 0) {
    return {
      primary: standardWires.find((w) => w.highSpeed) || standardWires[0],
      alternatives: standardWires.slice(1, 3),
    };
  }

  return null;
}

/**
 * Get Ra target configuration by target value
 */
export function getRaTargetConfig(targetRa_um: number): AgieRaTarget | null {
  // Find closest Ra target
  let closest = AGIE_RA_TARGETS[0];
  let minDiff = Math.abs(targetRa_um - closest.ra_um);

  for (const rt of AGIE_RA_TARGETS) {
    const diff = Math.abs(targetRa_um - rt.ra_um);
    if (diff < minDiff) {
      minDiff = diff;
      closest = rt;
    }
  }

  return closest;
}

/**
 * Get thickness range entry
 */
export function getThicknessRange(thickness_mm: number): AgieThicknessRange | null {
  // Find closest thickness
  let closest = AGIE_THICKNESS_RANGES[0];
  let minDiff = Math.abs(thickness_mm - closest.thickness_mm);

  for (const tr of AGIE_THICKNESS_RANGES) {
    const diff = Math.abs(thickness_mm - tr.thickness_mm);
    if (diff < minDiff) {
      minDiff = diff;
      closest = tr;
    }
  }

  return closest;
}

/**
 * Calculate estimated cutting speed for material/thickness/wire combination
 * Returns mm^2/min
 */
export function estimateCuttingSpeed(params: {
  materialCode: number;
  thickness_mm: number;
  wireDiameter_mm: number;
  targetRa_um: number;
}): number {
  const material = AGIE_MATERIAL_CODES.find((m) => m.code === params.materialCode);
  const thicknessRange = getThicknessRange(params.thickness_mm);
  const raTarget = getRaTargetConfig(params.targetRa_um);

  if (!material || !thicknessRange || !raTarget) {
    return 0;
  }

  // Base speed for 0.25mm wire on tool steel at 25mm: ~150 mm^2/min
  const BASE_SPEED = 150;

  // Wire diameter factor (larger wire = faster)
  const wireFactor = params.wireDiameter_mm / 0.25;

  // Calculate speed
  const speed =
    BASE_SPEED *
    material.machinabilityFactor *
    thicknessRange.speedFactor *
    wireFactor *
    (1 / raTarget.typicalPasses); // More passes = slower total

  return Math.round(speed * 10) / 10;
}

/**
 * Calculate wire offset for cutting conditions
 * Returns offset in mm
 */
export function calculateWireOffset(params: {
  wireDiameter_mm: number;
  sparkGap_mm?: number;
  passNumber: number;
  targetRa_um: number;
}): number {
  // Default spark gap based on Ra target
  const raTarget = getRaTargetConfig(params.targetRa_um);
  const defaultGap = raTarget
    ? raTarget.finalPassType === "rough"
      ? 0.04
      : raTarget.finalPassType === "skim"
        ? 0.025
        : raTarget.finalPassType === "fine"
          ? 0.015
          : 0.008 // mirror
    : 0.03;

  const sparkGap = params.sparkGap_mm ?? defaultGap;

  // Base offset = wire radius + spark gap
  const baseOffset = params.wireDiameter_mm / 2 + sparkGap;

  // Adjust for pass number (later passes have smaller offset)
  const passReduction = (params.passNumber - 1) * 0.015; // 15 microns per pass

  return Math.round((baseOffset - passReduction) * 1000) / 1000;
}

/**
 * Get material by ISO group
 */
export function getMaterialsByIsoGroup(isoGroup: "P" | "M" | "K" | "N" | "S" | "H"): AgieMaterialCode[] {
  return AGIE_MATERIAL_CODES.filter((m) => m.isoGroup === isoGroup);
}

/**
 * Get all available wire diameters
 */
export function getAvailableWireDiameters(): number[] {
  const diameters = new Set<number>();
  AGIE_WIRE_TYPES.forEach((w) => diameters.add(w.diameter_mm));
  return Array.from(diameters).sort((a, b) => a - b);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Summary of extracted AGIE power data
 */
export const AGIE_POWER_SUMMARY = {
  machineTypes: AGIE_MACHINE_TYPES.length,
  wireTypes: AGIE_WIRE_TYPES.length,
  materialCodes: AGIE_MATERIAL_CODES.length,
  raTargets: AGIE_RA_TARGETS.length,
  thicknessRanges: AGIE_THICKNESS_RANGES.length,
  wireDiameterRange_mm: {
    min: Math.min(...AGIE_WIRE_TYPES.map((w) => w.diameter_mm)),
    max: Math.max(...AGIE_WIRE_TYPES.map((w) => w.diameter_mm)),
  },
  raRange_um: {
    min: Math.min(...AGIE_RA_TARGETS.map((r) => r.ra_um)),
    max: Math.max(...AGIE_RA_TARGETS.map((r) => r.ra_um)),
  },
  thicknessRange_mm: {
    min: Math.min(...AGIE_THICKNESS_RANGES.map((t) => t.thickness_mm)),
    max: Math.max(...AGIE_THICKNESS_RANGES.map((t) => t.thickness_mm)),
  },
  source: "Mastercam mcamX8 AGIE.POWER + mc_agie.dat + agiewires.utc + agie.map",
  extractionDate: "2026-04-15",
};
