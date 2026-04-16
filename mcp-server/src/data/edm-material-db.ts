/**
 * Canonical EDM Material Properties Database
 *
 * SINGLE SOURCE OF TRUTH for all EDM engines. Do NOT duplicate these values
 * in individual engines — import from here.
 *
 * Used by:
 *   - EDMMultiPassStrategyEngine (multi-pass planning)
 *   - EDMBiMaterialCompensationEngine (zone parameter optimization)
 *   - EDMMaterialMachineWireEngine (material selection)
 *   - EDMCuttingParamFlushEngine (flushing optimization)
 *   - WEDMPrintToProgramEngine (E-code generation)
 *
 * Sources:
 *   - Klocke & Koenig "Manufacturing Processes 3" (Springer, RWTH Aachen)
 *   - ASM Handbook Vol. 16: Machining
 *   - Rajurkar et al. (1993) — recast layer and EDM parameter modeling
 *   - Makino, Sodick, Mitsubishi manufacturer tech tables
 *   - JM Die Company production data (ITW SHAKEPROOF, NOZE TEST programs)
 *
 * @module data/edm-material-db
 */

// ============================================================================
// MULTI-PASS STRATEGY PROPERTIES
// ============================================================================

/** Material properties for multi-pass planning (EDMMultiPassStrategyEngine). */
export interface EDMMultiPassMaterialProps {
  /** MRR multiplier vs steel baseline (1.0) */
  mrr_factor: number;
  /** Klocke Ra coefficient: Ra = k_ra × I_p^0.40 × t_on^0.28 */
  k_ra: number;
  /** Thermal diffusivity [mm²/s] — for recast layer d = 2√(α·t_on) */
  alpha_mm2s: number;
  /** Max safe peak current at 50mm thickness [A] */
  max_current_A: number;
  /** Whether distortion risk applies by default */
  distortion_prone: boolean;
  /** Wire speed factor vs steel baseline (1.0) */
  wire_speed_factor: number;
  /** Flushing sensitivity — higher = needs more off-time ratio */
  flush_factor: number;
}

/**
 * Canonical multi-pass material properties.
 * All values empirically derived from production data and peer-reviewed sources.
 */
export const EDM_MULTIPASS_MATERIALS: Record<string, EDMMultiPassMaterialProps> = {
  steel:            { mrr_factor: 1.0,  k_ra: 0.171, alpha_mm2s: 14.0,  max_current_A: 400, distortion_prone: false, wire_speed_factor: 1.0,  flush_factor: 1.0  },
  tool_steel:       { mrr_factor: 0.9,  k_ra: 0.161, alpha_mm2s: 7.0,   max_current_A: 380, distortion_prone: true,  wire_speed_factor: 1.0,  flush_factor: 1.05 },
  stainless_steel:  { mrr_factor: 0.85, k_ra: 0.178, alpha_mm2s: 4.0,   max_current_A: 350, distortion_prone: false, wire_speed_factor: 0.95, flush_factor: 1.1  },
  aluminum:         { mrr_factor: 1.5,  k_ra: 0.147, alpha_mm2s: 69.0,  max_current_A: 500, distortion_prone: false, wire_speed_factor: 1.3,  flush_factor: 0.8  },
  copper:           { mrr_factor: 1.3,  k_ra: 0.138, alpha_mm2s: 117.0, max_current_A: 450, distortion_prone: false, wire_speed_factor: 1.2,  flush_factor: 0.85 },
  brass:            { mrr_factor: 1.4,  k_ra: 0.130, alpha_mm2s: 34.0,  max_current_A: 480, distortion_prone: false, wire_speed_factor: 1.25, flush_factor: 0.8  },
  tungsten_carbide: { mrr_factor: 0.35, k_ra: 0.225, alpha_mm2s: 25.0,  max_current_A: 200, distortion_prone: false, wire_speed_factor: 0.7,  flush_factor: 1.4  },
  titanium:         { mrr_factor: 0.6,  k_ra: 0.194, alpha_mm2s: 2.9,   max_current_A: 280, distortion_prone: false, wire_speed_factor: 0.8,  flush_factor: 1.3  },
  inconel:          { mrr_factor: 0.5,  k_ra: 0.209, alpha_mm2s: 3.1,   max_current_A: 250, distortion_prone: false, wire_speed_factor: 0.75, flush_factor: 1.4  },
  graphite:         { mrr_factor: 1.8,  k_ra: 0.119, alpha_mm2s: 95.0,  max_current_A: 350, distortion_prone: false, wire_speed_factor: 1.4,  flush_factor: 1.5  },
  hardened_steel:   { mrr_factor: 0.8,  k_ra: 0.166, alpha_mm2s: 12.5,  max_current_A: 350, distortion_prone: true,  wire_speed_factor: 0.9,  flush_factor: 1.1  },
  pcd:              { mrr_factor: 0.15, k_ra: 1.10,  alpha_mm2s: 50.0,  max_current_A: 120, distortion_prone: false, wire_speed_factor: 0.5,  flush_factor: 1.6  },
};

// ============================================================================
// BI-MATERIAL / ZONE PROPERTIES
// ============================================================================

/** Material properties for bi-material zone optimization (EDMBiMaterialCompensationEngine). */
export interface EDMBiMaterialProps {
  melting_point_C: number;
  thermal_conductivity_W_mK: number;
  resistivity_uOhm_cm: number;
  density_g_cm3: number;
  machinability_index: number;
  t_on_factor: number;
  t_off_factor: number;
  current_factor: number;
}

/** Canonical bi-material zone properties. */
export const EDM_BIMATERIAL_MATERIALS: Record<string, EDMBiMaterialProps> = {
  D2:               { melting_point_C: 1421, thermal_conductivity_W_mK: 20,  resistivity_uOhm_cm: 55,  density_g_cm3: 7.7,  machinability_index: 0.85, t_on_factor: 1.0,  t_off_factor: 1.0,  current_factor: 1.0  },
  A2:               { melting_point_C: 1425, thermal_conductivity_W_mK: 28,  resistivity_uOhm_cm: 52,  density_g_cm3: 7.86, machinability_index: 0.90, t_on_factor: 0.95, t_off_factor: 0.95, current_factor: 0.95 },
  S7:               { melting_point_C: 1425, thermal_conductivity_W_mK: 34,  resistivity_uOhm_cm: 48,  density_g_cm3: 7.83, machinability_index: 0.95, t_on_factor: 0.90, t_off_factor: 0.90, current_factor: 0.90 },
  M2:               { melting_point_C: 1430, thermal_conductivity_W_mK: 22,  resistivity_uOhm_cm: 60,  density_g_cm3: 8.16, machinability_index: 0.75, t_on_factor: 1.10, t_off_factor: 1.10, current_factor: 1.05 },
  H13:              { melting_point_C: 1427, thermal_conductivity_W_mK: 25,  resistivity_uOhm_cm: 52,  density_g_cm3: 7.80, machinability_index: 0.92, t_on_factor: 0.95, t_off_factor: 0.95, current_factor: 0.95 },
  steel:            { melting_point_C: 1500, thermal_conductivity_W_mK: 50,  resistivity_uOhm_cm: 15,  density_g_cm3: 7.85, machinability_index: 1.0,  t_on_factor: 0.85, t_off_factor: 0.85, current_factor: 0.85 },
  stainless:        { melting_point_C: 1450, thermal_conductivity_W_mK: 16,  resistivity_uOhm_cm: 72,  density_g_cm3: 8.0,  machinability_index: 0.70, t_on_factor: 1.15, t_off_factor: 1.20, current_factor: 0.90 },
  tungsten_carbide: { melting_point_C: 2870, thermal_conductivity_W_mK: 84,  resistivity_uOhm_cm: 20,  density_g_cm3: 15.6, machinability_index: 0.40, t_on_factor: 1.40, t_off_factor: 1.50, current_factor: 1.20 },
  carbide:          { melting_point_C: 2870, thermal_conductivity_W_mK: 84,  resistivity_uOhm_cm: 20,  density_g_cm3: 15.6, machinability_index: 0.40, t_on_factor: 1.40, t_off_factor: 1.50, current_factor: 1.20 },
  silver_braze:     { melting_point_C: 780,  thermal_conductivity_W_mK: 380, resistivity_uOhm_cm: 3.8, density_g_cm3: 9.3,  machinability_index: 1.50, t_on_factor: 0.60, t_off_factor: 0.50, current_factor: 0.60 },
  aluminum:         { melting_point_C: 660,  thermal_conductivity_W_mK: 167, resistivity_uOhm_cm: 2.7, density_g_cm3: 2.7,  machinability_index: 1.40, t_on_factor: 0.70, t_off_factor: 0.65, current_factor: 0.75 },
  copper:           { melting_point_C: 1085, thermal_conductivity_W_mK: 400, resistivity_uOhm_cm: 1.7, density_g_cm3: 8.96, machinability_index: 1.30, t_on_factor: 0.75, t_off_factor: 0.70, current_factor: 0.80 },
  titanium:         { melting_point_C: 1668, thermal_conductivity_W_mK: 6.7, resistivity_uOhm_cm: 178, density_g_cm3: 4.43, machinability_index: 0.55, t_on_factor: 1.20, t_off_factor: 1.30, current_factor: 1.00 },
  inconel:          { melting_point_C: 1350, thermal_conductivity_W_mK: 11,  resistivity_uOhm_cm: 125, density_g_cm3: 8.19, machinability_index: 0.45, t_on_factor: 1.30, t_off_factor: 1.40, current_factor: 1.10 },
  graphite:         { melting_point_C: 3650, thermal_conductivity_W_mK: 130, resistivity_uOhm_cm: 1400,density_g_cm3: 1.8,  machinability_index: 1.80, t_on_factor: 0.80, t_off_factor: 0.70, current_factor: 0.90 },
};

// ============================================================================
// MATERIAL NAME RESOLUTION
// ============================================================================

/** Common aliases mapping to canonical material keys. */
const MATERIAL_ALIASES: Record<string, string> = {
  "d2": "D2", "skd11": "D2", "aisi d2": "D2", "1.2379": "D2",
  "a2": "A2", "aisi a2": "A2", "1.2363": "A2",
  "s7": "S7", "aisi s7": "S7",
  "m2": "M2", "aisi m2": "M2", "skh51": "M2", "1.3343": "M2",
  "h13": "H13", "skd61": "H13", "aisi h13": "H13", "1.2344": "H13",
  "o1": "tool_steel", "w1": "tool_steel", "p20": "tool_steel",
  "4140": "steel", "4340": "steel", "1018": "steel", "1045": "steel",
  "304": "stainless_steel", "316": "stainless_steel", "17-4": "stainless_steel",
  "stainless 304": "stainless_steel", "stainless 316": "stainless_steel",
  "6061": "aluminum", "7075": "aluminum", "aluminum 6061": "aluminum",
  "ti-6al-4v": "titanium", "ti6al4v": "titanium", "grade 5": "titanium",
  "inconel 718": "inconel", "inconel 625": "inconel",
  "wc": "tungsten_carbide", "cemented carbide": "tungsten_carbide",
  "ofhc": "copper", "c110": "copper",
};

/**
 * Resolve a material name/grade to its canonical multi-pass key.
 * Handles common aliases, case insensitivity, and partial matches.
 */
export function resolveEDMMaterial(input: string): string {
  const key = input.toLowerCase().trim();

  // Direct match
  if (EDM_MULTIPASS_MATERIALS[key]) return key;

  // Alias lookup
  if (MATERIAL_ALIASES[key]) {
    const alias = MATERIAL_ALIASES[key];
    return EDM_MULTIPASS_MATERIALS[alias.toLowerCase()] ? alias.toLowerCase() : alias;
  }

  // Fuzzy: check if input contains a known material name
  for (const [alias, canonical] of Object.entries(MATERIAL_ALIASES)) {
    if (key.includes(alias)) {
      return EDM_MULTIPASS_MATERIALS[canonical.toLowerCase()] ? canonical.toLowerCase() : canonical;
    }
  }

  // Fallback category matching
  if (key.includes("carbide")) return "tungsten_carbide";
  if (key.includes("titanium") || key.includes("ti-")) return "titanium";
  if (key.includes("inconel") || key.includes("hastelloy")) return "inconel";
  if (key.includes("stainless") || key.includes("ss")) return "stainless_steel";
  if (key.includes("aluminum") || key.includes("aluminium")) return "aluminum";
  if (key.includes("copper") || key.includes("brass")) return "copper";
  if (key.includes("graphite")) return "graphite";
  if (key.includes("tool") || key.includes("harden")) return "tool_steel";

  return "steel"; // ultimate fallback
}

/**
 * Resolve a material name to its bi-material zone properties.
 * Falls back to steel if not found.
 */
export function resolveEDMBiMaterial(input: string, zoneType?: string): EDMBiMaterialProps {
  const key = input.toLowerCase().trim();

  // Zone type overrides
  if (zoneType === "braze_joint") return EDM_BIMATERIAL_MATERIALS["silver_braze"];
  if (zoneType === "carbide_insert") return EDM_BIMATERIAL_MATERIALS["tungsten_carbide"];

  // Direct match
  if (EDM_BIMATERIAL_MATERIALS[key]) return EDM_BIMATERIAL_MATERIALS[key];
  if (EDM_BIMATERIAL_MATERIALS[input]) return EDM_BIMATERIAL_MATERIALS[input];

  // Alias
  const alias = MATERIAL_ALIASES[key];
  if (alias && EDM_BIMATERIAL_MATERIALS[alias]) return EDM_BIMATERIAL_MATERIALS[alias];

  // Fallback
  return EDM_BIMATERIAL_MATERIALS["steel"];
}
