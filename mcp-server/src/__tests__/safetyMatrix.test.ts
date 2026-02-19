/**
 * R2 Safety Matrix Tests
 * Tests cutting force (Kienzle), tool life (Taylor), and input validation
 * for safety-critical manufacturing calculations.
 * 
 * SAFETY CRITICAL: These tests protect against calculation errors
 * that can cause tool explosions and operator injuries.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSpeedFeed,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients
} from '../engines/ManufacturingCalculations.js';

// Material coefficients from verified registry data
const MATERIALS = {
  '4140_annealed': {
    kienzle: { kc1_1: 1496, mc: 0.22, iso_group: 'P', data_quality: 'verified' } as any,
    taylor: { C: 238, n: 0.20, tool_material: 'Carbide' } as TaylorCoefficients
  },
  '1045_annealed': {
    kienzle: { kc1_1: 1390, mc: 0.22, iso_group: 'P', data_quality: 'verified' } as any,
    taylor: { C: 255, n: 0.20, tool_material: 'Carbide' } as TaylorCoefficients
  },
  'ti6al4v': {
    kienzle: { kc1_1: 1458, mc: 0.21, iso_group: 'S', data_quality: 'verified' } as any,
    taylor: { C: 60, n: 0.15, tool_material: 'Carbide' } as TaylorCoefficients
  },
  '316_stainless': {
    kienzle: { kc1_1: 1980, mc: 0.235, iso_group: 'M', data_quality: 'verified' } as any,
    taylor: { C: 136, n: 0.16, tool_material: 'Carbide' } as TaylorCoefficients
  },
  '6061_aluminum': {
    kienzle: { kc1_1: 398, mc: 0.20, iso_group: 'N', data_quality: 'verified' } as any,
    taylor: { C: 1749, n: 0.273, tool_material: 'Carbide' } as TaylorCoefficients
  }
};

const BASE_CONDITIONS: CuttingConditions = {
  cutting_speed: 200,
  feed_per_tooth: 0.1,
  axial_depth: 2,
  radial_depth: 6,
  tool_diameter: 12,
  number_of_teeth: 4
};

describe('Kienzle Cutting Force', () => {
  it('produces positive finite force for all test materials', () => {
    for (const [name, mat] of Object.entries(MATERIALS)) {
      const result = calculateKienzleCuttingForce(BASE_CONDITIONS, mat.kienzle);
      expect(result.Fc).toBeGreaterThan(0);
      expect(Number.isFinite(result.Fc)).toBe(true);
      expect(result.power).toBeGreaterThan(0);
      expect(Number.isFinite(result.power)).toBe(true);
    }
  });

  it('returns correct ISO group force ratios', () => {
    const expectedRatios: Record<string, [number, number]> = {
      P: [0.4, 0.3], M: [0.45, 0.35], N: [0.3, 0.2], S: [0.5, 0.4]
    };
    for (const [name, mat] of Object.entries(MATERIALS)) {
      const result = calculateKienzleCuttingForce(BASE_CONDITIONS, mat.kienzle);
      const iso = mat.kienzle.iso_group;
      const [expectedFf, expectedFp] = expectedRatios[iso] || [0.4, 0.3];
      expect(result.force_ratios.Ff_over_Fc).toBe(expectedFf);
      expect(result.force_ratios.Fp_over_Fc).toBe(expectedFp);
    }
  });

  it('aluminum has lower kc than steel', () => {
    const steel = calculateKienzleCuttingForce(BASE_CONDITIONS, MATERIALS['4140_annealed'].kienzle);
    const aluminum = calculateKienzleCuttingForce(BASE_CONDITIONS, MATERIALS['6061_aluminum'].kienzle);
    expect(aluminum.specific_force).toBeLessThan(steel.specific_force);
  });

  it('rejects negative depth of cut', () => {
    const badConditions = { ...BASE_CONDITIONS, axial_depth: -1 };
    expect(() => calculateKienzleCuttingForce(badConditions, MATERIALS['4140_annealed'].kienzle))
      .toThrow('SAFETY BLOCK');
  });

  it('rejects NaN input', () => {
    const badConditions = { ...BASE_CONDITIONS, radial_depth: NaN };
    expect(() => calculateKienzleCuttingForce(badConditions, MATERIALS['4140_annealed'].kienzle))
      .toThrow('SAFETY BLOCK');
  });

  it('rejects zero tool diameter', () => {
    const badConditions = { ...BASE_CONDITIONS, tool_diameter: 0 };
    expect(() => calculateKienzleCuttingForce(badConditions, MATERIALS['4140_annealed'].kienzle))
      .toThrow('SAFETY BLOCK');
  });

  it('rejects Infinity input', () => {
    const badConditions = { ...BASE_CONDITIONS, cutting_speed: Infinity };
    expect(() => calculateKienzleCuttingForce(badConditions, MATERIALS['4140_annealed'].kienzle))
      .toThrow('SAFETY BLOCK');
  });

  it('warns on kc inflation at very small engagement', () => {
    const thinCut = { ...BASE_CONDITIONS, radial_depth: 0.12 };
    const result = calculateKienzleCuttingForce(thinCut, MATERIALS['4140_annealed'].kienzle);
    expect(result.warnings.some(w => w.includes('KC_INFLATED'))).toBe(true);
  });

  it('warns on full slotting', () => {
    const fullSlot = { ...BASE_CONDITIONS, radial_depth: 12 };
    const result = calculateKienzleCuttingForce(fullSlot, MATERIALS['4140_annealed'].kienzle);
    expect(result.warnings.some(w => w.includes('FULL_SLOT'))).toBe(true);
  });
});

describe('Taylor Tool Life', () => {
  it('produces positive finite tool life for all materials', () => {
    for (const [name, mat] of Object.entries(MATERIALS)) {
      const result = calculateTaylorToolLife(100, mat.taylor);
      expect(result.tool_life_minutes).toBeGreaterThan(0);
      expect(Number.isFinite(result.tool_life_minutes)).toBe(true);
    }
  });

  it('tool life decreases with increasing speed', () => {
    const slow = calculateTaylorToolLife(100, MATERIALS['4140_annealed'].taylor);
    const fast = calculateTaylorToolLife(200, MATERIALS['4140_annealed'].taylor);
    expect(fast.tool_life_minutes).toBeLessThan(slow.tool_life_minutes);
  });

  it('warns on Taylor cliff edge (T < 5 min)', () => {
    const result = calculateTaylorToolLife(235, MATERIALS['4140_annealed'].taylor);
    expect(result.tool_life_minutes).toBeLessThan(5);
    expect(result.warnings.some(w => w.includes('TAYLOR_CLIFF'))).toBe(true);
  });

  it('warns when speed near Taylor C constant', () => {
    const C = MATERIALS['4140_annealed'].taylor.C;
    const result = calculateTaylorToolLife(C * 0.95, MATERIALS['4140_annealed'].taylor);
    expect(result.warnings.some(w => w.includes('TAYLOR_CLIFF'))).toBe(true);
  });

  it('titanium has shorter tool life than steel at same speed', () => {
    const steel = calculateTaylorToolLife(60, MATERIALS['4140_annealed'].taylor);
    const titanium = calculateTaylorToolLife(60, MATERIALS['ti6al4v'].taylor);
    expect(titanium.tool_life_minutes).toBeLessThan(steel.tool_life_minutes);
  });
});

describe('Speed & Feed Calculator', () => {
  it('returns all required fields', () => {
    const result = calculateSpeedFeed({
      material_hardness: 200,
      tool_material: 'Carbide',
      operation: 'roughing',
      tool_diameter: 12,
      number_of_teeth: 4
    });
    expect(result.cutting_speed).toBeGreaterThan(0);
    expect(result.spindle_speed).toBeGreaterThan(0);
    expect(result.feed_per_tooth).toBeGreaterThan(0);
    expect(result.feed_rate).toBeGreaterThan(0);
    expect(result.axial_depth).toBeGreaterThan(0);
    expect(result.radial_depth).toBeGreaterThan(0);
  });

  it('finishing speed is higher than roughing speed', () => {
    const roughing = calculateSpeedFeed({
      material_hardness: 200, tool_material: 'Carbide',
      operation: 'roughing', tool_diameter: 12, number_of_teeth: 4
    });
    const finishing = calculateSpeedFeed({
      material_hardness: 200, tool_material: 'Carbide',
      operation: 'finishing', tool_diameter: 12, number_of_teeth: 4
    });
    expect(finishing.cutting_speed).toBeGreaterThan(roughing.cutting_speed);
  });

  it('harder material gets lower speed', () => {
    const soft = calculateSpeedFeed({
      material_hardness: 150, tool_material: 'Carbide',
      operation: 'roughing', tool_diameter: 12, number_of_teeth: 4
    });
    const hard = calculateSpeedFeed({
      material_hardness: 400, tool_material: 'Carbide',
      operation: 'roughing', tool_diameter: 12, number_of_teeth: 4
    });
    expect(hard.cutting_speed).toBeLessThan(soft.cutting_speed);
  });
});
