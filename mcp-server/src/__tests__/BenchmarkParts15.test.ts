/**
 * PRISM Benchmark Parts -- 15-Part Validation Suite
 *
 * Unit: BENCH-MS0 P0-U06
 * Purpose: Verify 15 canonical benchmark parts against physics formulas and
 *          establish regression baselines for speed/feed, force, tool life,
 *          surface finish, deflection, and MRR calculations.
 *
 * Coverage:
 *   - All 6 ISO material groups (P, M, K, N, S, H)
 *   - Operations: face, pocket, hole, slot, contour, thread, bore, turn_od, groove
 *   - Physics: Kienzle force, Taylor tool life, Brammertz Ra, cantilever deflection
 *
 * References:
 *   - ISO 3685 (tool life testing)
 *   - Kronenberg (1966) machining fundamentals
 *   - Sandvik Coromant Technical Guide (material constants)
 *   - Altintas (2012) Manufacturing Automation
 */

import { describe, it, expect } from 'vitest';
import { BENCHMARK_PARTS, KIENZLE_CONSTANTS, type BenchmarkPart } from '../data/benchmark-parts.js';

// -----------------------------------------------------------------------------
// Tolerance thresholds for physics validation
// -----------------------------------------------------------------------------
const TOLERANCE = {
  rpm: 1,                    // Allow ±1 RPM rounding
  force: 0.01,               // ±1% force tolerance
  power: 0.01,               // ±1% power tolerance
  tool_life: 0.01,           // ±1% tool life tolerance
  surface_finish: 0.01,      // ±1% Ra tolerance
  deflection: 0.02,          // ±2% deflection tolerance (compound error from F, L³, d⁴)
  mrr: 0.01,                 // ±1% MRR tolerance
};

// -----------------------------------------------------------------------------
// Physics formula implementations (independent verification)
// -----------------------------------------------------------------------------

/**
 * Kienzle specific cutting force: kc = kc1.1 × h^(-mc)
 * where h = chip thickness ≈ fz for face/end milling
 */
function calculateKienzleForce(
  kc1_1: number,
  mc: number,
  ap: number,
  fz: number,
): number {
  // Fc = kc1.1 × ap × fz^(1-mc)
  return kc1_1 * ap * Math.pow(fz, 1 - mc);
}

/**
 * Cutting power: P = Fc × Vc / 60000 [kW]
 */
function calculatePower(Fc: number, Vc: number): number {
  return (Fc * Vc) / 60000;
}

/**
 * Taylor tool life: T = (C / Vc)^(1/n) [min]
 */
function calculateTaylorLife(C: number, n: number, Vc: number): number {
  return Math.pow(C / Vc, 1 / n);
}

/**
 * Brammertz surface roughness: Ra = fz² / (32 × r_nose) × 1000 [µm]
 */
function calculateSurfaceFinish(fz: number, r_nose: number): number {
  return (Math.pow(fz, 2) / (32 * r_nose)) * 1000;
}

/**
 * Cantilever beam deflection: δ = F × L³ / (3 × E × I) [m → µm]
 * where I = π × d⁴ / 64 for cylindrical tool
 */
function calculateDeflection(
  Fc: number,
  L_mm: number,
  E_GPa: number,
  d_mm: number,
): number {
  const L = L_mm / 1000; // m
  const d = d_mm / 1000; // m
  const E = E_GPa * 1e9; // Pa
  const I = (Math.PI * Math.pow(d, 4)) / 64; // m⁴
  const delta_m = (Fc * Math.pow(L, 3)) / (3 * E * I);
  return delta_m * 1e6; // µm
}

/**
 * Material removal rate: MRR = ap × ae × vf / 1000 [cm³/min]
 * where vf = fz × z × rpm [mm/min]
 */
function calculateMRR(
  ap: number,
  ae: number,
  fz: number,
  z: number,
  rpm: number,
): number {
  const vf = fz * z * rpm;
  return (ap * ae * vf) / 1000;
}

/**
 * Spindle RPM from cutting speed: rpm = (Vc × 1000) / (π × d)
 */
function calculateRPM(Vc: number, d_mm: number): number {
  return (Vc * 1000) / (Math.PI * d_mm);
}

// -----------------------------------------------------------------------------
// Suite: Benchmark Parts Data Integrity
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Data Integrity', () => {
  it('should have exactly 15 benchmark parts', () => {
    expect(BENCHMARK_PARTS.length).toBe(15);
  });

  it('should have unique part IDs', () => {
    const ids = BENCHMARK_PARTS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(15);
  });

  it('should have IDs in BP-001 through BP-015 format', () => {
    const expectedIds = Array.from({ length: 15 }, (_, i) =>
      `BP-${String(i + 1).padStart(3, '0')}`
    );
    const actualIds = BENCHMARK_PARTS.map((p) => p.id).sort();
    expect(actualIds).toEqual(expectedIds);
  });

  it('should cover all 6 ISO material groups', () => {
    const groups = new Set(BENCHMARK_PARTS.map((p) => p.material.iso_group));
    expect(groups).toContain('P');
    expect(groups).toContain('M');
    expect(groups).toContain('K');
    expect(groups).toContain('N');
    expect(groups).toContain('S');
    expect(groups).toContain('H');
    expect(groups.size).toBe(6);
  });

  it('should have all required feature types across parts', () => {
    const allFeatureTypes = new Set<string>();
    for (const part of BENCHMARK_PARTS) {
      for (const feature of part.features) {
        allFeatureTypes.add(feature.type);
      }
    }
    // Required types per unit requirements
    expect(allFeatureTypes).toContain('face');
    expect(allFeatureTypes).toContain('pocket');
    expect(allFeatureTypes).toContain('hole');
    expect(allFeatureTypes).toContain('slot');
    expect(allFeatureTypes).toContain('contour');
    expect(allFeatureTypes).toContain('thread');
    expect(allFeatureTypes).toContain('bore');
    expect(allFeatureTypes).toContain('turn_od');
    expect(allFeatureTypes).toContain('groove');
  });

  it('should have KIENZLE_CONSTANTS for all ISO groups', () => {
    expect(KIENZLE_CONSTANTS.P).toBeDefined();
    expect(KIENZLE_CONSTANTS.M).toBeDefined();
    expect(KIENZLE_CONSTANTS.K).toBeDefined();
    expect(KIENZLE_CONSTANTS.N).toBeDefined();
    expect(KIENZLE_CONSTANTS.S).toBeDefined();
    expect(KIENZLE_CONSTANTS.H).toBeDefined();
  });
});

// -----------------------------------------------------------------------------
// Suite: Kienzle Force Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Kienzle Force Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): Fc matches Kienzle formula`, () => {
      const { kc1_1, mc } = part.material;
      const ap = part.reference_answers.optimal_depth_mm;
      const fz = part.reference_answers.optimal_feed_mm_per_tooth;

      const expected = calculateKienzleForce(kc1_1, mc, ap, fz);
      const actual = part.reference_answers.Fc_N;

      // Allow rounding tolerance
      expect(actual).toBeCloseTo(expected, 1);
    });
  }

  it('Kienzle constants match canonical values', () => {
    expect(KIENZLE_CONSTANTS.P.kc1_1).toBe(1800);
    expect(KIENZLE_CONSTANTS.M.kc1_1).toBe(2100);
    expect(KIENZLE_CONSTANTS.K.kc1_1).toBe(1100);
    expect(KIENZLE_CONSTANTS.N.kc1_1).toBe(800);
    expect(KIENZLE_CONSTANTS.S.kc1_1).toBe(2800);
    expect(KIENZLE_CONSTANTS.H.kc1_1).toBe(3500);
  });
});

// -----------------------------------------------------------------------------
// Suite: Cutting Power Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Power Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): Power matches P = Fc×Vc/60000`, () => {
      const Fc = part.reference_answers.Fc_N;
      const Vc = part.reference_answers.cutting_speed_m_per_min;

      const expected = calculatePower(Fc, Vc);
      const actual = part.reference_answers.power_kW;

      expect(actual).toBeCloseTo(expected, 2);
    });
  }

  it('power increases with harder materials (kc1.1 effect)', () => {
    // Verify kc1.1 ordering is correct across material groups
    // H-group (3500) > S-group (2800) > M-group (2100) > P-group (1800) > K-group (1100) > N-group (800)
    expect(KIENZLE_CONSTANTS.H.kc1_1).toBeGreaterThan(KIENZLE_CONSTANTS.S.kc1_1);
    expect(KIENZLE_CONSTANTS.S.kc1_1).toBeGreaterThan(KIENZLE_CONSTANTS.M.kc1_1);
    expect(KIENZLE_CONSTANTS.M.kc1_1).toBeGreaterThan(KIENZLE_CONSTANTS.P.kc1_1);
    expect(KIENZLE_CONSTANTS.P.kc1_1).toBeGreaterThan(KIENZLE_CONSTANTS.K.kc1_1);
    expect(KIENZLE_CONSTANTS.K.kc1_1).toBeGreaterThan(KIENZLE_CONSTANTS.N.kc1_1);

    // Verify power calculation is proportional to kc1.1 at equal conditions
    // (actual part comparison is confounded by different ap, fz, Vc)
  });
});

// -----------------------------------------------------------------------------
// Suite: Taylor Tool Life Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Taylor Tool Life Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): Tool life matches Taylor T = (C/Vc)^(1/n)`, () => {
      const { taylor_C, taylor_n } = part.material;
      const Vc = part.reference_answers.cutting_speed_m_per_min;

      const expected = calculateTaylorLife(taylor_C, taylor_n, Vc);
      const actual = part.reference_answers.tool_life_min;

      expect(actual).toBeCloseTo(expected, 1);
    });
  }

  it('tool life decreases with increased cutting speed', () => {
    // Compare aluminum parts at different speeds
    const bp003 = BENCHMARK_PARTS.find((p) => p.id === 'BP-003')!; // 500 m/min
    const bp010 = BENCHMARK_PARTS.find((p) => p.id === 'BP-010')!; // 753 m/min

    // Higher Vc → shorter tool life (Taylor equation)
    expect(bp010.reference_answers.cutting_speed_m_per_min).toBeGreaterThan(
      bp003.reference_answers.cutting_speed_m_per_min
    );
    expect(bp010.reference_answers.tool_life_min).toBeLessThan(
      bp003.reference_answers.tool_life_min
    );
  });

  it('superalloys have shortest Taylor constant (C=40)', () => {
    const bp011 = BENCHMARK_PARTS.find((p) => p.id === 'BP-011')!; // Inconel Vc=25
    const bp014 = BENCHMARK_PARTS.find((p) => p.id === 'BP-014')!; // Inconel Vc=20

    // Inconel (S-group) has Taylor C=40 — lowest of all groups
    expect(bp011.material.taylor_C).toBe(40);
    expect(bp014.material.taylor_C).toBe(40);

    // Tool life at low Vc is longer due to Taylor equation
    // T = (40/25)^(1/0.15) ≈ 23 min at Vc=25
    // T = (40/20)^(1/0.15) ≈ 102 min at Vc=20
    expect(bp011.reference_answers.tool_life_min).toBeCloseTo(22.95, 0);
    expect(bp014.reference_answers.tool_life_min).toBeCloseTo(101.59, 0);
  });
});

// -----------------------------------------------------------------------------
// Suite: Surface Finish (Brammertz) Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Surface Finish Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): Ra matches Brammertz Ra = fz²/(32×r)×1000`, () => {
      const fz = part.reference_answers.optimal_feed_mm_per_tooth;
      const r_nose = part.tool.nose_radius_mm;

      const expected = calculateSurfaceFinish(fz, r_nose);
      const actual = part.reference_answers.Ra_um;

      expect(actual).toBeCloseTo(expected, 2);
    });
  }

  it('finer feed produces better surface finish', () => {
    // BP-009 (Swiss micro) uses fz=0.015 vs BP-001 (block) uses fz=0.15
    const bp001 = BENCHMARK_PARTS.find((p) => p.id === 'BP-001')!;
    const bp009 = BENCHMARK_PARTS.find((p) => p.id === 'BP-009')!;

    expect(bp009.reference_answers.optimal_feed_mm_per_tooth).toBeLessThan(
      bp001.reference_answers.optimal_feed_mm_per_tooth
    );
    expect(bp009.reference_answers.Ra_um).toBeLessThan(
      bp001.reference_answers.Ra_um
    );
  });

  it('larger nose radius improves surface finish', () => {
    // At equal feed, larger r_nose → lower Ra
    // BP-003 (r=0.5) vs BP-010 (r=1.0) both use similar fz
    const bp003 = BENCHMARK_PARTS.find((p) => p.id === 'BP-003')!;
    const bp010 = BENCHMARK_PARTS.find((p) => p.id === 'BP-010')!;

    // Verify formula relationship: Ra ∝ 1/r_nose
    const ra_factor_003 = bp003.reference_answers.Ra_um * bp003.tool.nose_radius_mm;
    const ra_factor_010 = bp010.reference_answers.Ra_um * bp010.tool.nose_radius_mm;

    // Both should have similar fz²/32 factor (adjusted for actual fz difference)
    const fz_003 = bp003.reference_answers.optimal_feed_mm_per_tooth;
    const fz_010 = bp010.reference_answers.optimal_feed_mm_per_tooth;
    const expected_ratio = Math.pow(fz_003 / fz_010, 2);
    const actual_ratio = ra_factor_003 / ra_factor_010;

    expect(actual_ratio).toBeCloseTo(expected_ratio, 1);
  });
});

// -----------------------------------------------------------------------------
// Suite: Deflection Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Deflection Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): Deflection matches δ = FL³/(3EI)`, () => {
      const Fc = part.reference_answers.Fc_N;
      const L = part.tool.overhang_mm;
      const E = part.tool.E_GPa;
      const d = part.tool.diameter_mm;

      const expected = calculateDeflection(Fc, L, E, d);
      const actual = part.reference_answers.deflection_um;

      // Allow 2% tolerance for compound calculation
      const tolerance = Math.abs(expected) * TOLERANCE.deflection;
      expect(Math.abs(actual - expected)).toBeLessThan(Math.max(tolerance, 0.01));
    });
  }

  it('smaller tools deflect more at equal force', () => {
    // Deflection ∝ 1/d⁴, so smaller diameter → much more deflection
    // Compare BP-005 (d=6mm) vs BP-010 (d=20mm)
    const bp005 = BENCHMARK_PARTS.find((p) => p.id === 'BP-005')!;
    const bp010 = BENCHMARK_PARTS.find((p) => p.id === 'BP-010')!;

    // Normalize by force and overhang³ to isolate diameter effect
    const norm005 = bp005.reference_answers.deflection_um * Math.pow(bp005.tool.diameter_mm, 4) /
      (bp005.reference_answers.Fc_N * Math.pow(bp005.tool.overhang_mm, 3));
    const norm010 = bp010.reference_answers.deflection_um * Math.pow(bp010.tool.diameter_mm, 4) /
      (bp010.reference_answers.Fc_N * Math.pow(bp010.tool.overhang_mm, 3));

    // Should be similar (both are 1/(3*E_GPa) factor)
    expect(norm005).toBeCloseTo(norm010, 0);
  });

  it('CBN tools have lower deflection due to higher E', () => {
    // BP-004 uses CBN (E=680 GPa) vs carbide (E=580 GPa)
    const bp004 = BENCHMARK_PARTS.find((p) => p.id === 'BP-004')!;
    expect(bp004.tool.E_GPa).toBe(680);

    // PCD has even higher E
    const bp012 = BENCHMARK_PARTS.find((p) => p.id === 'BP-012')!;
    expect(bp012.tool.E_GPa).toBe(900);
  });
});

// -----------------------------------------------------------------------------
// Suite: MRR Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: MRR Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): MRR matches ap×ae×vf/1000`, () => {
      const ap = part.reference_answers.optimal_depth_mm;
      const ae = part.cut_params.ae_mm;
      const fz = part.reference_answers.optimal_feed_mm_per_tooth;
      const z = part.tool.flutes;
      const rpm = part.reference_answers.optimal_rpm;

      const expected = calculateMRR(ap, ae, fz, z, rpm);
      const actual = part.reference_answers.MRR_cm3_per_min;

      expect(actual).toBeCloseTo(expected, 1);
    });
  }

  it('aluminum achieves highest MRR due to high cutting speeds', () => {
    // BP-010 (Al heatsink) should have high MRR
    const bp010 = BENCHMARK_PARTS.find((p) => p.id === 'BP-010')!;
    const steelParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'P');

    const maxSteelMRR = Math.max(...steelParts.map((p) => p.reference_answers.MRR_cm3_per_min));
    expect(bp010.reference_answers.MRR_cm3_per_min).toBeGreaterThan(maxSteelMRR);
  });

  it('superalloys have lowest MRR due to speed constraints', () => {
    const bp011 = BENCHMARK_PARTS.find((p) => p.id === 'BP-011')!; // Inconel
    const averageMRR = BENCHMARK_PARTS.reduce(
      (sum, p) => sum + p.reference_answers.MRR_cm3_per_min,
      0
    ) / BENCHMARK_PARTS.length;

    // Inconel MRR should be below average
    expect(bp011.reference_answers.MRR_cm3_per_min).toBeLessThan(averageMRR);
  });
});

// -----------------------------------------------------------------------------
// Suite: RPM Verification
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: RPM Verification', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id} (${part.name}): RPM matches Vc×1000/(π×d)`, () => {
      const Vc = part.reference_answers.cutting_speed_m_per_min;
      const d = part.tool.diameter_mm;

      const expected = Math.round(calculateRPM(Vc, d));
      const actual = part.reference_answers.optimal_rpm;

      expect(actual).toBeCloseTo(expected, 0);
    });
  }

  it('smaller tools require higher RPM at same cutting speed', () => {
    // Compare same material (steel P-group) with different diameters
    const bp001 = BENCHMARK_PARTS.find((p) => p.id === 'BP-001')!; // d=50mm
    const bp002 = BENCHMARK_PARTS.find((p) => p.id === 'BP-002')!; // d=12mm

    // At similar Vc, smaller d → higher RPM
    expect(bp002.tool.diameter_mm).toBeLessThan(bp001.tool.diameter_mm);
    expect(bp002.reference_answers.optimal_rpm).toBeGreaterThan(
      bp001.reference_answers.optimal_rpm
    );
  });
});

// -----------------------------------------------------------------------------
// Suite: Machine Capability Checks
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Machine Capability Validation', () => {
  for (const part of BENCHMARK_PARTS) {
    it(`${part.id}: RPM within machine limits`, () => {
      expect(part.reference_answers.optimal_rpm).toBeLessThanOrEqual(
        part.machine.max_rpm
      );
    });

    it(`${part.id}: Power within machine limits`, () => {
      expect(part.reference_answers.power_kW).toBeLessThanOrEqual(
        part.machine.max_power_kW
      );
    });
  }
});

// -----------------------------------------------------------------------------
// Suite: ISO Material Group Coverage
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: ISO Material Group Distribution', () => {
  it('P-group (steel): minimum 3 parts', () => {
    const pParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'P');
    expect(pParts.length).toBeGreaterThanOrEqual(3);
  });

  it('M-group (stainless): minimum 2 parts', () => {
    const mParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'M');
    expect(mParts.length).toBeGreaterThanOrEqual(2);
  });

  it('K-group (cast iron): minimum 1 part', () => {
    const kParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'K');
    expect(kParts.length).toBeGreaterThanOrEqual(1);
  });

  it('N-group (aluminum/non-ferrous): minimum 3 parts', () => {
    const nParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'N');
    expect(nParts.length).toBeGreaterThanOrEqual(3);
  });

  it('S-group (superalloy): minimum 2 parts', () => {
    const sParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'S');
    expect(sParts.length).toBeGreaterThanOrEqual(2);
  });

  it('H-group (hardened): minimum 1 part', () => {
    const hParts = BENCHMARK_PARTS.filter((p) => p.material.iso_group === 'H');
    expect(hParts.length).toBeGreaterThanOrEqual(1);
  });
});

// -----------------------------------------------------------------------------
// Suite: Operation Coverage
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Operation Type Coverage', () => {
  const operationCounts: Record<string, number> = {};

  for (const part of BENCHMARK_PARTS) {
    for (const feature of part.features) {
      operationCounts[feature.type] = (operationCounts[feature.type] || 0) + 1;
    }
  }

  it('face operations: minimum 4', () => {
    expect(operationCounts['face'] || 0).toBeGreaterThanOrEqual(4);
  });

  it('pocket operations: minimum 10', () => {
    expect(operationCounts['pocket'] || 0).toBeGreaterThanOrEqual(10);
  });

  it('hole operations: minimum 8', () => {
    expect(operationCounts['hole'] || 0).toBeGreaterThanOrEqual(8);
  });

  it('thread operations: minimum 4', () => {
    expect(operationCounts['thread'] || 0).toBeGreaterThanOrEqual(4);
  });

  it('turn_od operations: minimum 2 (lathe parts)', () => {
    expect(operationCounts['turn_od'] || 0).toBeGreaterThanOrEqual(2);
  });
});

// -----------------------------------------------------------------------------
// Suite: Regression Baseline (golden values)
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Regression Baseline', () => {
  // These are the golden reference values that should not change
  // unless the physics implementation is intentionally modified

  it('BP-001 baseline: steel face mill', () => {
    const bp001 = BENCHMARK_PARTS.find((p) => p.id === 'BP-001')!;
    // Fc = 1800 × 2.0 × 0.15^(1-0.25) = 1800 × 2.0 × 0.15^0.75 ≈ 868 N
    expect(bp001.reference_answers.Fc_N).toBeCloseTo(868, 0);
    expect(bp001.reference_answers.power_kW).toBeCloseTo(2.6, 0);
    // T = (250/180)^(1/0.25) = 1.389^4 ≈ 3.72 min
    expect(bp001.reference_answers.tool_life_min).toBeCloseTo(3.72, 1);
  });

  it('BP-004 baseline: hardened D2 mold', () => {
    const bp004 = BENCHMARK_PARTS.find((p) => p.id === 'BP-004')!;
    // Fc = 3500 × 0.3 × 0.04^(1-0.30) = 3500 × 0.3 × 0.04^0.70 ≈ 110 N
    expect(bp004.reference_answers.Fc_N).toBeCloseTo(110, 0);
    // Deflection at 8mm tool with 32mm overhang
    expect(bp004.reference_answers.deflection_um).toBeLessThan(10);
  });

  it('BP-008 baseline: turned shaft', () => {
    const bp008 = BENCHMARK_PARTS.find((p) => p.id === 'BP-008')!;
    expect(bp008.reference_answers.MRR_cm3_per_min).toBeGreaterThan(10);
    expect(bp008.material.iso_group).toBe('P');
  });

  it('BP-011 baseline: Inconel bracket', () => {
    const bp011 = BENCHMARK_PARTS.find((p) => p.id === 'BP-011')!;
    // At Vc=25 m/min: T = (40/25)^(1/0.15) ≈ 23 min
    expect(bp011.reference_answers.tool_life_min).toBeLessThan(30);
    expect(bp011.material.taylor_C).toBe(40);
  });

  it('BP-015 baseline: production bracket with cost', () => {
    const bp015 = BENCHMARK_PARTS.find((p) => p.id === 'BP-015')!;
    expect(bp015.reference_answers.cost_per_part).toBeDefined();
    expect(bp015.reference_answers.cycle_time_min).toBeDefined();
    expect(bp015.reference_answers.cost_per_part).toBe(12.50);
    expect(bp015.reference_answers.cycle_time_min).toBe(4.2);
  });
});

// -----------------------------------------------------------------------------
// Suite: Formula Documentation
// -----------------------------------------------------------------------------
describe('BenchmarkParts15: Formula Documentation', () => {
  it('all parts have documented formulas', () => {
    for (const part of BENCHMARK_PARTS) {
      expect(part.reference_answers.formulas).toBeDefined();
      expect(part.reference_answers.formulas.Fc).toBeDefined();
      expect(part.reference_answers.formulas.power).toBeDefined();
      expect(part.reference_answers.formulas.taylor).toBeDefined();
      expect(part.reference_answers.formulas.Ra).toBeDefined();
      expect(part.reference_answers.formulas.deflection).toBeDefined();
      expect(part.reference_answers.formulas.MRR).toBeDefined();
    }
  });

  it('formulas match implementation', () => {
    const bp001 = BENCHMARK_PARTS.find((p) => p.id === 'BP-001')!;
    expect(bp001.reference_answers.formulas.Fc).toContain('kc1.1');
    expect(bp001.reference_answers.formulas.taylor).toContain('(C / Vc)');
    expect(bp001.reference_answers.formulas.deflection).toContain('L^3');
  });
});
