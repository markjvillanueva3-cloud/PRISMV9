/**
 * Engine Test Harness — SYS-MS2-U00
 *
 * Provides shared utilities for engine unit testing:
 * - AtomicValue assertion helpers
 * - Material/tool/machine fixtures (steel, aluminum, titanium)
 * - Engine result validators
 * - Mock registry helpers
 */

import { expect } from 'vitest';
import type {
  CuttingConditions,
  KienzleCoefficients,
  TaylorCoefficients,
  CuttingForceResult,
  ToolLifeResult,
  SpeedFeedInput,
  SpeedFeedResult,
  SurfaceFinishResult,
  MRRResult,
} from '../../engines/ManufacturingCalculations.js';

// ============================================================================
// AtomicValue Interface & Assertions
// ============================================================================

/**
 * Canonical AtomicValue shape per CLAUDE.md convention.
 * Engines don't enforce this type at compile time, but test harness
 * validates that result shapes are compatible.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  confidence?: number;
  source: string;
  warning?: string;
}

/**
 * Assert a numeric value falls within ±uncertainty of an expected value.
 */
export function expectWithinUncertainty(
  actual: number,
  expected: number,
  uncertainty: number,
  label?: string
): void {
  const msg = label ? `${label}: ` : '';
  expect(
    actual,
    `${msg}Expected ${expected} ± ${uncertainty}, got ${actual}`
  ).toBeGreaterThanOrEqual(expected - uncertainty);
  expect(
    actual,
    `${msg}Expected ${expected} ± ${uncertainty}, got ${actual}`
  ).toBeLessThanOrEqual(expected + uncertainty);
}

/**
 * Assert a numeric value is within a percentage tolerance of expected.
 */
export function expectWithinPercent(
  actual: number,
  expected: number,
  percentTolerance: number,
  label?: string
): void {
  const margin = Math.abs(expected * percentTolerance / 100);
  expectWithinUncertainty(actual, expected, margin, label);
}

/**
 * Assert a result value is positive, finite, and non-NaN.
 */
export function expectPositiveFinite(value: number, label?: string): void {
  const msg = label ? `${label}: ` : '';
  expect(value, `${msg}expected positive`).toBeGreaterThan(0);
  expect(Number.isFinite(value), `${msg}expected finite, got ${value}`).toBe(true);
  expect(Number.isNaN(value), `${msg}expected non-NaN`).toBe(false);
}

/**
 * Assert an array of values are all positive and finite.
 */
export function expectAllPositiveFinite(values: Record<string, number>): void {
  for (const [key, val] of Object.entries(values)) {
    expectPositiveFinite(val, key);
  }
}

/**
 * Validate that a CuttingForceResult has all required fields with valid values.
 */
export function assertValidCuttingForceResult(result: CuttingForceResult): void {
  expectPositiveFinite(result.Fc, 'Fc');
  expectPositiveFinite(result.power, 'power');
  expect(result.specific_force, 'specific_force should be positive').toBeGreaterThan(0);
  expect(result.calculation_method).toBeTruthy();
  expect(Array.isArray(result.warnings)).toBe(true);
  // force_ratios must have the standard keys
  expect(result.force_ratios).toBeDefined();
  expect(typeof result.force_ratios?.Ff_over_Fc).toBe('number');
  expect(typeof result.force_ratios?.Fp_over_Fc).toBe('number');
}

/**
 * Validate that a ToolLifeResult has all required fields.
 */
export function assertValidToolLifeResult(result: ToolLifeResult): void {
  expectPositiveFinite(result.tool_life_minutes, 'tool_life_minutes');
  expect(result.calculation_method).toBeTruthy();
  expect(Array.isArray(result.warnings)).toBe(true);
}

/**
 * Validate that a SpeedFeedResult has all required fields.
 */
export function assertValidSpeedFeedResult(result: SpeedFeedResult): void {
  expectPositiveFinite(result.cutting_speed, 'cutting_speed');
  expectPositiveFinite(result.spindle_speed, 'spindle_speed');
  expectPositiveFinite(result.feed_per_tooth, 'feed_per_tooth');
  expectPositiveFinite(result.feed_rate, 'feed_rate');
  expect(Array.isArray(result.warnings)).toBe(true);
}

// ============================================================================
// Material Fixtures — Verified Coefficients
// ============================================================================

export interface MaterialFixture {
  name: string;
  iso_group: string;
  hardness_hrc?: number;
  hardness_hb?: number;
  kienzle: KienzleCoefficients;
  taylor: TaylorCoefficients;
}

/**
 * Steel: AISI 4140 Annealed (ISO P)
 * Common alloy steel for shafts, gears, bolts.
 */
export const STEEL_4140: MaterialFixture = {
  name: '4140_annealed',
  iso_group: 'P',
  hardness_hb: 197,
  kienzle: { kc1_1: 1496, mc: 0.22 },
  taylor: { C: 238, n: 0.20, tool_material: 'Carbide' } as TaylorCoefficients,
};

/**
 * Steel: AISI 1045 Annealed (ISO P)
 * Medium carbon steel, general purpose.
 */
export const STEEL_1045: MaterialFixture = {
  name: '1045_annealed',
  iso_group: 'P',
  hardness_hb: 170,
  kienzle: { kc1_1: 1390, mc: 0.22 },
  taylor: { C: 255, n: 0.20, tool_material: 'Carbide' } as TaylorCoefficients,
};

/**
 * Aluminum: 6061-T6 (ISO N)
 * Most common aluminum alloy for machining.
 */
export const ALUMINUM_6061: MaterialFixture = {
  name: '6061_aluminum',
  iso_group: 'N',
  hardness_hb: 95,
  kienzle: { kc1_1: 398, mc: 0.20 },
  taylor: { C: 1749, n: 0.273, tool_material: 'Carbide' } as TaylorCoefficients,
};

/**
 * Titanium: Ti-6Al-4V (ISO S)
 * Aerospace workhorse, notoriously difficult to machine.
 */
export const TITANIUM_6AL4V: MaterialFixture = {
  name: 'ti6al4v',
  iso_group: 'S',
  hardness_hrc: 36,
  kienzle: { kc1_1: 1458, mc: 0.21 },
  taylor: { C: 60, n: 0.15, tool_material: 'Carbide' } as TaylorCoefficients,
};

/**
 * Stainless: 316 Stainless (ISO M)
 * Austenitic stainless, gummy and work-hardening.
 */
export const STAINLESS_316: MaterialFixture = {
  name: '316_stainless',
  iso_group: 'M',
  hardness_hb: 217,
  kienzle: { kc1_1: 1980, mc: 0.235 },
  taylor: { C: 136, n: 0.16, tool_material: 'Carbide' } as TaylorCoefficients,
};

/**
 * Cast Iron: Gray Cast Iron (ISO K)
 */
export const CAST_IRON_GRAY: MaterialFixture = {
  name: 'gray_cast_iron',
  iso_group: 'K',
  hardness_hb: 220,
  kienzle: { kc1_1: 1020, mc: 0.24 },
  taylor: { C: 305, n: 0.25, tool_material: 'Carbide' } as TaylorCoefficients,
};

/** All material fixtures indexed by name */
export const ALL_MATERIALS: Record<string, MaterialFixture> = {
  steel_4140: STEEL_4140,
  steel_1045: STEEL_1045,
  aluminum_6061: ALUMINUM_6061,
  titanium_6al4v: TITANIUM_6AL4V,
  stainless_316: STAINLESS_316,
  cast_iron_gray: CAST_IRON_GRAY,
};

/** ISO group → material fixture lookup */
export const MATERIALS_BY_ISO: Record<string, MaterialFixture> = {
  P: STEEL_4140,
  M: STAINLESS_316,
  K: CAST_IRON_GRAY,
  N: ALUMINUM_6061,
  S: TITANIUM_6AL4V,
};

// ============================================================================
// Tool Fixtures
// ============================================================================

export interface ToolFixture {
  name: string;
  type: 'end_mill' | 'face_mill' | 'drill' | 'turning_insert' | 'ball_nose';
  diameter: number;
  number_of_teeth: number;
  coating: string;
  helix_angle?: number;
  corner_radius?: number;
}

export const ENDMILL_12MM: ToolFixture = {
  name: '12mm_4fl_carbide',
  type: 'end_mill',
  diameter: 12,
  number_of_teeth: 4,
  coating: 'TiAlN',
  helix_angle: 35,
};

export const ENDMILL_6MM: ToolFixture = {
  name: '6mm_3fl_carbide',
  type: 'end_mill',
  diameter: 6,
  number_of_teeth: 3,
  coating: 'TiAlN',
  helix_angle: 35,
};

export const FACEMILL_50MM: ToolFixture = {
  name: '50mm_6fl_indexable',
  type: 'face_mill',
  diameter: 50,
  number_of_teeth: 6,
  coating: 'CVD',
};

export const DRILL_10MM: ToolFixture = {
  name: '10mm_carbide_drill',
  type: 'drill',
  diameter: 10,
  number_of_teeth: 2,
  coating: 'TiN',
};

export const BALLNOSE_8MM: ToolFixture = {
  name: '8mm_2fl_ballnose',
  type: 'ball_nose',
  diameter: 8,
  number_of_teeth: 2,
  coating: 'TiAlN',
  corner_radius: 4,
};

export const ALL_TOOLS: Record<string, ToolFixture> = {
  endmill_12mm: ENDMILL_12MM,
  endmill_6mm: ENDMILL_6MM,
  facemill_50mm: FACEMILL_50MM,
  drill_10mm: DRILL_10MM,
  ballnose_8mm: BALLNOSE_8MM,
};

// ============================================================================
// Machine Fixtures
// ============================================================================

export interface MachineFixture {
  name: string;
  type: 'vertical_3axis' | 'horizontal_4axis' | '5axis_trunnion' | 'lathe';
  max_spindle_speed: number;
  max_power_kw: number;
  max_torque_nm: number;
  controller: string;
  axes: number;
}

export const MACHINE_VMC_3AXIS: MachineFixture = {
  name: 'Haas VF-2',
  type: 'vertical_3axis',
  max_spindle_speed: 8100,
  max_power_kw: 22.4,
  max_torque_nm: 122,
  controller: 'Haas NGC',
  axes: 3,
};

export const MACHINE_HMC_4AXIS: MachineFixture = {
  name: 'Okuma MB-5000H',
  type: 'horizontal_4axis',
  max_spindle_speed: 15000,
  max_power_kw: 30,
  max_torque_nm: 200,
  controller: 'OSP-P300MA',
  axes: 4,
};

export const MACHINE_5AXIS: MachineFixture = {
  name: 'DMG Mori DMU 50',
  type: '5axis_trunnion',
  max_spindle_speed: 20000,
  max_power_kw: 35,
  max_torque_nm: 130,
  controller: 'CELOS/Siemens 840D',
  axes: 5,
};

export const MACHINE_LATHE: MachineFixture = {
  name: 'Okuma LB3000 EX II',
  type: 'lathe',
  max_spindle_speed: 5000,
  max_power_kw: 22,
  max_torque_nm: 485,
  controller: 'OSP-P300L',
  axes: 2,
};

export const ALL_MACHINES: Record<string, MachineFixture> = {
  vmc_3axis: MACHINE_VMC_3AXIS,
  hmc_4axis: MACHINE_HMC_4AXIS,
  fiveaxis: MACHINE_5AXIS,
  lathe: MACHINE_LATHE,
};

// ============================================================================
// Standard Cutting Conditions Builders
// ============================================================================

/**
 * Build CuttingConditions from tool + material + optional overrides.
 * Uses conservative defaults appropriate for each material group.
 */
export function makeCuttingConditions(
  tool: ToolFixture,
  material: MaterialFixture,
  overrides?: Partial<CuttingConditions>
): CuttingConditions {
  const speedMap: Record<string, number> = {
    P: 200, M: 120, K: 250, N: 500, S: 50, H: 80,
  };
  const fptMap: Record<string, number> = {
    P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.06, H: 0.05,
  };

  return {
    cutting_speed: speedMap[material.iso_group] ?? 150,
    feed_per_tooth: fptMap[material.iso_group] ?? 0.08,
    axial_depth: tool.diameter * 0.5,
    radial_depth: tool.diameter * 0.5,
    tool_diameter: tool.diameter,
    number_of_teeth: tool.number_of_teeth,
    ...overrides,
  };
}

/**
 * Build SpeedFeedInput from tool + material + optional overrides.
 */
export function makeSpeedFeedInput(
  tool: ToolFixture,
  material: MaterialFixture,
  overrides?: Partial<SpeedFeedInput>
): SpeedFeedInput {
  return {
    tool_material: 'Carbide',
    operation: 'roughing',
    tool_diameter: tool.diameter,
    number_of_teeth: tool.number_of_teeth,
    material_hardness: material.hardness_hb ?? material.hardness_hrc,
    kienzle: material.kienzle,
    taylor: material.taylor,
    ...overrides,
  };
}

// ============================================================================
// Safety Test Helpers
// ============================================================================

/** Conditions that should trigger SAFETY BLOCK (negative depth) */
export const UNSAFE_NEGATIVE_DEPTH: Partial<CuttingConditions> = {
  axial_depth: -1,
};

/** Conditions that should trigger SAFETY BLOCK (zero feed) */
export const UNSAFE_ZERO_FEED: Partial<CuttingConditions> = {
  feed_per_tooth: 0,
};

/** Conditions that should trigger SAFETY BLOCK (NaN speed) */
export const UNSAFE_NAN_SPEED: Partial<CuttingConditions> = {
  cutting_speed: NaN,
};

/** Conditions that should trigger SAFETY BLOCK (Infinity) */
export const UNSAFE_INFINITY: Partial<CuttingConditions> = {
  cutting_speed: Infinity,
};

/**
 * Assert that a function throws SAFETY BLOCK for unsafe conditions.
 */
export function expectSafetyBlock(fn: () => any, label?: string): void {
  expect(fn, label ?? 'Expected SAFETY BLOCK').toThrow('SAFETY BLOCK');
}

// ============================================================================
// Dispatcher Test Helpers
// ============================================================================

export interface CapturedTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

/**
 * Create a mock MCP server that captures tool registrations.
 */
export function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool: (name: string, description: string, inputSchema: any, handler: any) => {
      tools.push({ name, description, inputSchema, handler });
    },
  };
  return { server, tools };
}

/**
 * Call a dispatcher action through a captured tool.
 */
export async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}
