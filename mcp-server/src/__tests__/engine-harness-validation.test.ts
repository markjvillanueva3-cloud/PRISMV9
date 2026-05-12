/**
 * Engine Test Harness Validation — SYS-MS2-U00
 * Verifies the test harness, fixtures, and assertion helpers work correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSpeedFeed,
} from '../engines/ManufacturingCalculations.js';

import {
  // AtomicValue helpers
  expectWithinUncertainty,
  expectWithinPercent,
  expectPositiveFinite,
  expectAllPositiveFinite,
  assertValidCuttingForceResult,
  assertValidToolLifeResult,
  assertValidSpeedFeedResult,
  expectSafetyBlock,

  // Material fixtures
  STEEL_4140,
  STEEL_1045,
  ALUMINUM_6061,
  TITANIUM_6AL4V,
  STAINLESS_316,
  CAST_IRON_GRAY,
  ALL_MATERIALS,
  MATERIALS_BY_ISO,

  // Tool fixtures
  ENDMILL_12MM,
  ENDMILL_6MM,
  FACEMILL_50MM,
  DRILL_10MM,
  BALLNOSE_8MM,
  ALL_TOOLS,

  // Machine fixtures
  MACHINE_VMC_3AXIS,
  MACHINE_5AXIS,
  ALL_MACHINES,

  // Builders
  makeCuttingConditions,
  makeSpeedFeedInput,

  // Safety
  UNSAFE_NEGATIVE_DEPTH,
  UNSAFE_ZERO_FEED,
  UNSAFE_NAN_SPEED,
  UNSAFE_INFINITY,
} from './helpers/engine-test-harness.js';

// ============================================================================
// Fixture Coverage Tests
// ============================================================================

describe('Test Harness — Fixture Coverage', () => {
  it('has 6 material fixtures covering all major ISO groups', () => {
    expect(Object.keys(ALL_MATERIALS)).toHaveLength(6);
    const groups = Object.values(ALL_MATERIALS).map(m => m.iso_group);
    expect(groups).toContain('P'); // Steel
    expect(groups).toContain('M'); // Stainless
    expect(groups).toContain('K'); // Cast iron
    expect(groups).toContain('N'); // Non-ferrous (aluminum)
    expect(groups).toContain('S'); // Superalloys (titanium)
  });

  it('has ISO group lookup for all 5 groups', () => {
    expect(MATERIALS_BY_ISO['P'].name).toContain('4140');
    expect(MATERIALS_BY_ISO['M'].name).toContain('316');
    expect(MATERIALS_BY_ISO['K'].name).toContain('cast_iron');
    expect(MATERIALS_BY_ISO['N'].name).toContain('6061');
    expect(MATERIALS_BY_ISO['S'].name).toContain('ti6al4v');
  });

  it('has 5 tool fixtures covering common types', () => {
    expect(Object.keys(ALL_TOOLS)).toHaveLength(5);
    const types = Object.values(ALL_TOOLS).map(t => t.type);
    expect(types).toContain('end_mill');
    expect(types).toContain('face_mill');
    expect(types).toContain('drill');
    expect(types).toContain('ball_nose');
  });

  it('has 4 machine fixtures', () => {
    expect(Object.keys(ALL_MACHINES)).toHaveLength(4);
    const types = Object.values(ALL_MACHINES).map(m => m.type);
    expect(types).toContain('vertical_3axis');
    expect(types).toContain('horizontal_4axis');
    expect(types).toContain('5axis_trunnion');
    expect(types).toContain('lathe');
  });

  it('all material fixtures have valid Kienzle and Taylor coefficients', () => {
    for (const [name, mat] of Object.entries(ALL_MATERIALS)) {
      expect(mat.kienzle.kc1_1, `${name} kc1_1`).toBeGreaterThan(0);
      expect(mat.kienzle.mc, `${name} mc`).toBeGreaterThan(0);
      expect(mat.taylor.C, `${name} Taylor C`).toBeGreaterThan(0);
      expect(mat.taylor.n, `${name} Taylor n`).toBeGreaterThan(0);
      expect(mat.taylor.n, `${name} Taylor n < 1`).toBeLessThan(1);
    }
  });
});

// ============================================================================
// Assertion Helper Tests
// ============================================================================

describe('Test Harness — Assertion Helpers', () => {
  it('expectWithinUncertainty passes for values in range', () => {
    expectWithinUncertainty(100, 100, 5);     // exact
    expectWithinUncertainty(103, 100, 5);     // within +5
    expectWithinUncertainty(96, 100, 5);      // within -5
  });

  it('expectWithinPercent passes for values in range', () => {
    expectWithinPercent(105, 100, 10);        // +5% within ±10%
    expectWithinPercent(95, 100, 10);         // -5% within ±10%
  });

  it('expectPositiveFinite passes for valid numbers', () => {
    expectPositiveFinite(1);
    expectPositiveFinite(0.001);
    expectPositiveFinite(1e6);
  });

  it('expectAllPositiveFinite validates multiple values', () => {
    expectAllPositiveFinite({ a: 1, b: 2.5, c: 0.01 });
  });
});

// ============================================================================
// Condition Builder Tests
// ============================================================================

describe('Test Harness — Condition Builders', () => {
  it('makeCuttingConditions builds valid conditions for steel', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, STEEL_4140);
    expect(conds.cutting_speed).toBe(200);       // P-group default
    expect(conds.feed_per_tooth).toBe(0.10);
    expect(conds.tool_diameter).toBe(12);
    expect(conds.number_of_teeth).toBe(4);
    expect(conds.axial_depth).toBe(6);            // 12 * 0.5
    expect(conds.radial_depth).toBe(6);
  });

  it('makeCuttingConditions builds valid conditions for aluminum (faster)', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, ALUMINUM_6061);
    expect(conds.cutting_speed).toBe(500);       // N-group default
    expect(conds.feed_per_tooth).toBe(0.15);
  });

  it('makeCuttingConditions builds valid conditions for titanium (slower)', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, TITANIUM_6AL4V);
    expect(conds.cutting_speed).toBe(50);        // S-group default
    expect(conds.feed_per_tooth).toBe(0.06);
  });

  it('makeCuttingConditions accepts overrides', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, STEEL_4140, {
      cutting_speed: 300,
      axial_depth: 1,
    });
    expect(conds.cutting_speed).toBe(300);
    expect(conds.axial_depth).toBe(1);
    expect(conds.tool_diameter).toBe(12);         // not overridden
  });

  it('makeSpeedFeedInput builds valid input', () => {
    const input = makeSpeedFeedInput(ENDMILL_12MM, STEEL_4140);
    expect(input.tool_material).toBe('Carbide');
    expect(input.operation).toBe('roughing');
    expect(input.tool_diameter).toBe(12);
    expect(input.kienzle).toBeDefined();
    expect(input.taylor).toBeDefined();
  });
});

// ============================================================================
// Integration: Fixtures → Engines
// ============================================================================

describe('Test Harness — Engine Integration', () => {
  it('all material fixtures produce valid Kienzle results with 12mm endmill', () => {
    for (const [name, mat] of Object.entries(ALL_MATERIALS)) {
      const conds = makeCuttingConditions(ENDMILL_12MM, mat);
      const result = calculateKienzleCuttingForce(conds, mat.kienzle);
      assertValidCuttingForceResult(result);
    }
  });

  it('all material fixtures produce valid Taylor results', () => {
    for (const [name, mat] of Object.entries(ALL_MATERIALS)) {
      const result = calculateTaylorToolLife(
        makeCuttingConditions(ENDMILL_12MM, mat).cutting_speed,
        mat.taylor
      );
      assertValidToolLifeResult(result);
    }
  });

  it('aluminum tool life >> titanium tool life at same conditions', () => {
    const speed = 100;
    const alLife = calculateTaylorToolLife(speed, ALUMINUM_6061.taylor);
    const tiLife = calculateTaylorToolLife(speed, TITANIUM_6AL4V.taylor);
    expect(alLife.tool_life_minutes).toBeGreaterThan(tiLife.tool_life_minutes);
  });

  it('all material fixtures produce valid SpeedFeed results', () => {
    for (const [name, mat] of Object.entries(ALL_MATERIALS)) {
      const input = makeSpeedFeedInput(ENDMILL_12MM, mat);
      const result = calculateSpeedFeed(input);
      assertValidSpeedFeedResult(result);
    }
  });

  it('smaller tool gets lower feed rate than larger tool', () => {
    const small = calculateSpeedFeed(makeSpeedFeedInput(ENDMILL_6MM, STEEL_4140));
    const large = calculateSpeedFeed(makeSpeedFeedInput(ENDMILL_12MM, STEEL_4140));
    expect(small.feed_rate).toBeLessThan(large.feed_rate);
  });
});

// ============================================================================
// Safety Integration
// ============================================================================

describe('Test Harness — Safety Helpers', () => {
  it('UNSAFE_NEGATIVE_DEPTH triggers SAFETY BLOCK', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, STEEL_4140, UNSAFE_NEGATIVE_DEPTH);
    expectSafetyBlock(() => calculateKienzleCuttingForce(conds, STEEL_4140.kienzle));
  });

  it('UNSAFE_ZERO_FEED triggers SAFETY BLOCK', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, STEEL_4140, UNSAFE_ZERO_FEED);
    expectSafetyBlock(() => calculateKienzleCuttingForce(conds, STEEL_4140.kienzle));
  });

  it('UNSAFE_NAN_SPEED triggers SAFETY BLOCK', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, STEEL_4140, UNSAFE_NAN_SPEED);
    expectSafetyBlock(() => calculateKienzleCuttingForce(conds, STEEL_4140.kienzle));
  });

  it('UNSAFE_INFINITY triggers SAFETY BLOCK', () => {
    const conds = makeCuttingConditions(ENDMILL_12MM, STEEL_4140, UNSAFE_INFINITY);
    expectSafetyBlock(() => calculateKienzleCuttingForce(conds, STEEL_4140.kienzle));
  });
});
