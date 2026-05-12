/**
 * PRISM Engine Test Harness
 *
 * Shared test infrastructure for engine unit tests.
 * Provides material/tool/machine fixtures and assertion helpers.
 *
 * @milestone SYS-MS2-U00
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// MATERIAL FIXTURES — Real ISO 513 / DIN EN 10027 data
// ============================================================================

/** Steel: AISI 1045 (C45) — ISO P group, the universal baseline */
export const STEEL_1045 = {
  id: "aisi-1045",
  name: "AISI 1045",
  iso_group: "P",
  category: "carbon_steel",
  hardness_hb: 200,
  tensile_strength_mpa: 620,
  density_kg_m3: 7850,
  thermal_conductivity_w_mk: 49.8,
  specific_heat_j_kgk: 486,
  melting_point_c: 1495,
  elastic_modulus_gpa: 205,
  kienzle: { kc1_1: 1800, mc: 0.25, material_id: "aisi-1045", source: "fixture" },
  taylor: { C: 200, n: 0.25, material_id: "aisi-1045", tool_material: "Carbide", source: "fixture" },
} as const;

/** Aluminum: 6061-T6 — ISO N group, soft non-ferrous */
export const ALUMINUM_6061 = {
  id: "al-6061-t6",
  name: "6061-T6 Aluminum",
  iso_group: "N",
  category: "aluminum",
  hardness_hb: 95,
  tensile_strength_mpa: 310,
  density_kg_m3: 2700,
  thermal_conductivity_w_mk: 167,
  specific_heat_j_kgk: 896,
  melting_point_c: 652,
  elastic_modulus_gpa: 69,
  kienzle: { kc1_1: 700, mc: 0.23, material_id: "al-6061-t6", source: "fixture" },
  taylor: { C: 500, n: 0.35, material_id: "al-6061-t6", tool_material: "Carbide", source: "fixture" },
} as const;

/** Titanium: Ti-6Al-4V — ISO S group, difficult-to-cut */
export const TITANIUM_6AL4V = {
  id: "ti-6al-4v",
  name: "Ti-6Al-4V",
  iso_group: "S",
  category: "titanium",
  hardness_hb: 334,
  tensile_strength_mpa: 950,
  density_kg_m3: 4430,
  thermal_conductivity_w_mk: 6.7,
  specific_heat_j_kgk: 526,
  melting_point_c: 1660,
  elastic_modulus_gpa: 114,
  kienzle: { kc1_1: 1500, mc: 0.22, material_id: "ti-6al-4v", source: "fixture" },
  taylor: { C: 60, n: 0.15, material_id: "ti-6al-4v", tool_material: "Carbide", source: "fixture" },
} as const;

/** Stainless: 316L — ISO M group */
export const STAINLESS_316L = {
  id: "ss-316l",
  name: "316L Stainless",
  iso_group: "M",
  category: "stainless_steel",
  hardness_hb: 217,
  tensile_strength_mpa: 485,
  density_kg_m3: 8000,
  thermal_conductivity_w_mk: 16.3,
  specific_heat_j_kgk: 500,
  melting_point_c: 1400,
  elastic_modulus_gpa: 193,
  kienzle: { kc1_1: 2200, mc: 0.26, material_id: "ss-316l", source: "fixture" },
  taylor: { C: 120, n: 0.20, material_id: "ss-316l", tool_material: "Carbide", source: "fixture" },
} as const;

/** Cast Iron: GG25 (EN-GJL-250) — ISO K group */
export const CAST_IRON_GG25 = {
  id: "gg25",
  name: "GG25 Cast Iron",
  iso_group: "K",
  category: "cast_iron",
  hardness_hb: 200,
  tensile_strength_mpa: 250,
  density_kg_m3: 7200,
  thermal_conductivity_w_mk: 46,
  specific_heat_j_kgk: 460,
  melting_point_c: 1200,
  elastic_modulus_gpa: 110,
  kienzle: { kc1_1: 1100, mc: 0.26, material_id: "gg25", source: "fixture" },
  taylor: { C: 180, n: 0.25, material_id: "gg25", tool_material: "Carbide", source: "fixture" },
} as const;

/** Hardened Steel: AISI D2 (60 HRC) — ISO H group */
export const HARDENED_D2 = {
  id: "aisi-d2-60hrc",
  name: "AISI D2 Hardened",
  iso_group: "H",
  category: "hardened_steel",
  hardness_hb: 650,
  tensile_strength_mpa: 2000,
  density_kg_m3: 7700,
  thermal_conductivity_w_mk: 20.5,
  specific_heat_j_kgk: 460,
  melting_point_c: 1420,
  elastic_modulus_gpa: 210,
  kienzle: { kc1_1: 4500, mc: 0.30, material_id: "aisi-d2-60hrc", source: "fixture" },
  taylor: { C: 80, n: 0.12, material_id: "aisi-d2-60hrc", tool_material: "CBN", source: "fixture" },
} as const;

/** All material fixtures indexed by ISO group */
export const MATERIAL_FIXTURES = {
  P: STEEL_1045,
  N: ALUMINUM_6061,
  S: TITANIUM_6AL4V,
  M: STAINLESS_316L,
  K: CAST_IRON_GG25,
  H: HARDENED_D2,
} as const;

export type MaterialFixture = typeof MATERIAL_FIXTURES[keyof typeof MATERIAL_FIXTURES];

// ============================================================================
// CUTTING CONDITION FIXTURES
// ============================================================================

/** Standard roughing conditions for AISI 1045 with Carbide */
export function makeCuttingConditions(overrides?: Record<string, any>) {
  return {
    cutting_speed: 200,       // Vc [m/min]
    feed_per_tooth: 0.15,     // fz [mm/tooth]
    axial_depth: 3.0,         // ap [mm]
    radial_depth: 25.0,       // ae [mm]
    tool_diameter: 50,        // D [mm]
    number_of_teeth: 4,       // z
    rake_angle: 6,            // γ [degrees]
    tool_nose_radius: 0.8,    // r [mm]
    ...overrides,
  };
}

/** Finishing conditions — lighter cuts, tighter tolerance */
export function makeFinishingConditions(overrides?: Record<string, any>) {
  return makeCuttingConditions({
    cutting_speed: 250,
    feed_per_tooth: 0.08,
    axial_depth: 0.5,
    radial_depth: 25.0,
    ...overrides,
  });
}

/** Extreme conditions — for testing safety limits and edge cases */
export function makeExtremeConditions(overrides?: Record<string, any>) {
  return makeCuttingConditions({
    cutting_speed: 1500,      // very high — near safety limit
    feed_per_tooth: 1.5,      // very heavy
    axial_depth: 50,          // deep cut
    radial_depth: 50,
    ...overrides,
  });
}

// ============================================================================
// COOLANT SYSTEM FIXTURES
// ============================================================================

export function makeCoolantSystem(overrides?: Record<string, any>) {
  return {
    delivery: "FLOOD" as const,
    coolantType: "SEMI_SYNTHETIC" as const,
    flowRate: 20,              // [L/min]
    pressure: 20,              // [bar]
    concentration: 8,          // [%]
    temperature: 22,           // [°C]
    filtration: 25,            // [μm]
    tankCapacity: 200,         // [L]
    ...overrides,
  };
}

export function makeMQLSystem(overrides?: Record<string, any>) {
  return makeCoolantSystem({
    delivery: "MQL" as const,
    coolantType: "STRAIGHT_OIL" as const,
    flowRate: 0.05,            // [L/min] — very low for MQL
    pressure: 6,
    ...overrides,
  });
}

export function makeDrySystem(overrides?: Record<string, any>) {
  return makeCoolantSystem({
    delivery: "DRY" as const,
    coolantType: "NONE" as const,
    flowRate: 0,
    pressure: 0,
    ...overrides,
  });
}

export function makeCoolantOperationParams(overrides?: Record<string, any>) {
  return {
    operation: "MILLING_GENERAL" as const,
    toolDiameter: 50,          // [mm]
    cuttingSpeed: 200,         // [m/min]
    feedRate: 500,             // [mm/min]
    depthOfCut: 3.0,           // [mm]
    materialHardness: 200,     // [HB]
    materialType: "STEEL" as const,
    ...overrides,
  };
}

// ============================================================================
// TOOL FIXTURES
// ============================================================================

export const CARBIDE_ENDMILL_50MM = {
  id: "carbide-endmill-50",
  type: "endmill",
  material: "Carbide",
  diameter: 50,
  number_of_teeth: 4,
  helix_angle: 30,
  rake_angle: 6,
  nose_radius: 0.8,
  stickout: 80,
  overall_length: 120,
  coating: "TiAlN",
} as const;

export const HSS_DRILL_10MM = {
  id: "hss-drill-10",
  type: "drill",
  material: "HSS",
  diameter: 10,
  number_of_teeth: 2,
  point_angle: 118,
  helix_angle: 28,
  stickout: 60,
  overall_length: 100,
  coating: "TiN",
} as const;

export const CBN_INSERT = {
  id: "cbn-insert-tnga",
  type: "insert",
  material: "CBN",
  nose_radius: 0.8,
  rake_angle: -6,
  clearance_angle: 6,
  coating: "none",
} as const;

// ============================================================================
// MACHINE FIXTURES
// ============================================================================

export const CNC_3AXIS_VERTICAL = {
  id: "haas-vf2",
  name: "Haas VF-2",
  type: "milling",
  axes: 3,
  max_spindle_rpm: 8100,
  spindle_power_kw: 22.4,
  max_feed_rate: 16500,      // [mm/min]
  controller: "haas",
  work_envelope: {
    x: 762,                   // [mm]
    y: 406,
    z: 508,
  },
} as const;

export const CNC_5AXIS = {
  id: "dmg-dmu50",
  name: "DMG DMU 50",
  type: "milling",
  axes: 5,
  max_spindle_rpm: 14000,
  spindle_power_kw: 35,
  max_feed_rate: 30000,
  controller: "siemens",
  work_envelope: {
    x: 500,
    y: 450,
    z: 400,
    a: { min: -120, max: 30 },
    c: { min: -360, max: 360 },
  },
} as const;

export const CNC_LATHE = {
  id: "mazak-qt200",
  name: "Mazak QT-200",
  type: "turning",
  axes: 2,
  max_spindle_rpm: 5000,
  spindle_power_kw: 18.5,
  max_feed_rate: 20000,
  controller: "mazatrol",
  work_envelope: {
    x: 200,                   // swing radius [mm]
    z: 500,                   // max turning length [mm]
  },
} as const;

// ============================================================================
// SPEED/FEED INPUT FACTORIES
// ============================================================================

export function makeSpeedFeedInput(overrides?: Record<string, any>) {
  return {
    tool_material: "Carbide" as string,
    operation: "roughing" as string,
    tool_diameter: 50,
    number_of_teeth: 4,
    material_hardness: 200,
    kienzle: { ...STEEL_1045.kienzle },
    taylor: { ...STEEL_1045.taylor },
    ...overrides,
  };
}

// ============================================================================
// JOHNSON-COOK FIXTURES
// ============================================================================

/** J-C flow stress coefficients for AISI 1045 (Jaspers & Dautzenberg, 2002) */
export const JC_AISI_1045 = {
  A: 553.1,          // [MPa] yield strength
  B: 600.8,          // [MPa] hardening modulus
  C: 0.0134,         // strain rate sensitivity
  n_jc: 0.234,       // hardening exponent
  m: 1.0,            // thermal softening exponent
  T_ref: 25,         // [°C]
  T_melt: 1460,      // [°C]
  epsilon_dot_ref: 1.0, // [1/s]
} as const;

/** J-C coefficients for Ti-6Al-4V (Lee & Lin, 1998) */
export const JC_TI6AL4V = {
  A: 1098,
  B: 1092,
  C: 0.014,
  n_jc: 0.93,
  m: 1.1,
  T_ref: 25,
  T_melt: 1660,
  epsilon_dot_ref: 1.0,
} as const;

// ============================================================================
// CHUCK / TAILSTOCK FIXTURES
// ============================================================================

export function makeChuckForceInput(overrides?: Record<string, any>) {
  return {
    chuck_type: "3_jaw_power" as string,
    jaw_type: "hard" as string,
    num_jaws: 3,
    workpiece_mass_kg: 5.0,
    workpiece_od_mm: 80,
    workpiece_length_mm: 120,
    gripping_diameter_mm: 80,
    gripping_length_mm: 40,
    spindle_rpm: 2000,
    max_spindle_rpm: 5000,
    cutting_force_tangential_N: 1500,
    cutting_force_radial_N: 600,
    cutting_force_axial_N: 375,
    friction_coefficient: 0.3,
    ...overrides,
  };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert a numeric result is within percentage tolerance of expected value.
 * Used for physics calculations where exact match isn't expected.
 */
export function expectApprox(actual: number, expected: number, tolerancePct = 5) {
  const tolerance = Math.abs(expected * tolerancePct / 100);
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

/**
 * Assert a result has the expected shape (all required keys present and defined).
 */
export function expectShape(result: any, requiredKeys: string[]) {
  expect(result).toBeDefined();
  expect(typeof result).toBe("object");
  for (const key of requiredKeys) {
    expect(result).toHaveProperty(key);
    expect(result[key]).toBeDefined();
  }
}

/**
 * Assert a numeric value is within physical bounds.
 * Catches NaN, Infinity, and negative values where positive is expected.
 */
export function expectPhysicalValue(value: number, label: string, min = 0, max = Infinity) {
  expect(value, `${label} should be a finite number`).toBeTypeOf("number");
  expect(Number.isFinite(value), `${label} should be finite (got ${value})`).toBe(true);
  expect(value, `${label} should be >= ${min}`).toBeGreaterThanOrEqual(min);
  if (max < Infinity) {
    expect(value, `${label} should be <= ${max}`).toBeLessThanOrEqual(max);
  }
}

/**
 * Assert a safety result is properly structured.
 */
export function expectSafetyResult(result: any) {
  expect(result).toBeDefined();
  if ("is_safe" in result) {
    expect(typeof result.is_safe).toBe("boolean");
  }
  if ("safety_factor" in result) {
    expectPhysicalValue(result.safety_factor, "safety_factor", 0);
  }
  if ("warnings" in result) {
    expect(Array.isArray(result.warnings)).toBe(true);
  }
  if ("recommendations" in result) {
    expect(Array.isArray(result.recommendations)).toBe(true);
  }
}

/**
 * Run a parameterized test across all ISO material groups.
 * Callback receives the material fixture and should contain expect() calls.
 */
export function forEachMaterial(
  callback: (material: MaterialFixture, group: string) => void | Promise<void>
) {
  for (const [group, material] of Object.entries(MATERIAL_FIXTURES)) {
    it(`handles ISO ${group} material (${material.name})`, async () => {
      await callback(material, group);
    });
  }
}

/**
 * Run a parameterized test across multiple operations.
 */
export function forEachOperation(
  operations: readonly string[],
  callback: (operation: string) => void | Promise<void>
) {
  for (const op of operations) {
    it(`handles ${op} operation`, async () => {
      await callback(op);
    });
  }
}
