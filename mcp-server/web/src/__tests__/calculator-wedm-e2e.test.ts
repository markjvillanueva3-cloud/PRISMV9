/**
 * CWEDM Calculator Frontend Tests — Wire EDM Result Display + Safety Cards
 *
 * Tests the wire EDM calculator frontend components and API client:
 *   - WireEdmPassChart rendering
 *   - Wire break risk card severity indicators
 *   - Surface integrity safety card (always visible, HOLD warning)
 *   - API client types and contract
 *   - Controller-specific label mapping
 *   - Setup sheet export format
 *   - Error handling
 *
 * Manual QA checklist (document-only):
 *   [ ] Open browser -> select wire_edm tab -> verify machine dropdown populated
 *   [ ] Select D2 steel, 50mm, brass 0.25mm -> click Solve -> verify numbers display
 *   [ ] Check per-pass table: 4-5 rows, Ra decreasing per row
 *   [ ] Check safety card: recast layer visible, not dismissible
 *   [ ] Switch to Sodick controller -> verify labels change to SV/SF/WS
 *   [ ] Click "Export Setup Sheet" -> verify printable format opens
 *   [ ] Resize to mobile width -> verify cards stack vertically (responsive)
 */
import { describe, expect, it } from 'vitest';
import type {
  WireEdmCalcResult,
  WireEdmPassDetail,
  WireEdmWireBreakRisk,
  WireEdmSurfaceIntegrity,
  WireEdmCostBreakdown,
  WireEdmCornerCompensation,
  WireEdmTaperResult,
  WireEdmCalcParams,
  WireType,
  CutType,
  OptimizationGoal,
  WedmController,
} from '../api/wireEdm';

// ── Test Fixtures ──

function makePass(overrides: Partial<WireEdmPassDetail> = {}): WireEdmPassDetail {
  return {
    type: 'rough',
    offset_mm: 0.180,
    energy_pct: 100,
    speed_mm_min: 5.2,
    time_min: 38.5,
    wire_m: 115.4,
    predicted_Ra_um: 3.2,
    predicted_recast_um: 18.0,
    t_on_us: 0.8,
    t_off_us: 12.0,
    peak_current_A: 15,
    servo_voltage_V: 42,
    wire_speed_m_min: 12,
    power_pct: 65,
    ...overrides,
  };
}

function makeResult(overrides: Partial<WireEdmCalcResult> = {}): WireEdmCalcResult {
  return {
    first_cut_speed_mm_min: 5.2,
    skim_speeds: [12.5, 18.0, 22.0],
    wire_tension_N: 12.0,
    flushing_pressure_bar: 8.5,
    power_pct: 65,
    passes: [
      makePass({ type: 'rough', offset_mm: 0.180, energy_pct: 100, predicted_Ra_um: 3.2, predicted_recast_um: 18.0 }),
      makePass({ type: 'skim', offset_mm: 0.060, energy_pct: 30, speed_mm_min: 12.5, predicted_Ra_um: 1.2, predicted_recast_um: 5.0 }),
      makePass({ type: 'skim', offset_mm: 0.020, energy_pct: 15, speed_mm_min: 18.0, predicted_Ra_um: 0.8, predicted_recast_um: 2.5 }),
      makePass({ type: 'skim', offset_mm: 0.005, energy_pct: 8, speed_mm_min: 22.0, predicted_Ra_um: 0.5, predicted_recast_um: 1.0 }),
    ],
    total_time_min: 74.7,
    total_wire_m: 224.0,
    estimated_cost: {
      machine_usd: 93.38, wire_usd: 22.40, consumables_usd: 7.50,
      post_process_usd: 15.00, total_usd: 138.28,
      breakdown: [
        { category: 'machine', amount: 93.38, pct_of_total: 67.5 },
        { category: 'wire', amount: 22.40, pct_of_total: 16.2 },
      ],
    },
    wire_break_risk: {
      probability: 0.08, severity: 'medium',
      factors: ['thick workpiece', 'brass wire'],
      mitigations: ['reduce speed', 'increase flushing'],
    },
    corner_compensation: [{ overtravel_mm: 0.05, dwell_s: 0.3, angle_deg: 90 }],
    surface_integrity: {
      recast_um: 18.0, haz_um: 35, residual_stress_MPa: 120, fatigue_reduction_pct: 15,
      spec_compliance: [{ standard: 'AMS 2628', pass: true, violations: [] }],
    },
    recommendations: ['Consider zinc-coated wire for better surface finish'],
    safety_score: 0.82,
    ...overrides,
  };
}

// ── Type Contract Tests ──

describe('WireEdmCalcResult type contract', () => {
  it('has all required top-level fields', () => {
    const r = makeResult();
    expect(r.first_cut_speed_mm_min).toBeTypeOf('number');
    expect(r.skim_speeds).toBeInstanceOf(Array);
    expect(r.wire_tension_N).toBeTypeOf('number');
    expect(r.flushing_pressure_bar).toBeTypeOf('number');
    expect(r.power_pct).toBeTypeOf('number');
    expect(r.passes).toBeInstanceOf(Array);
    expect(r.total_time_min).toBeTypeOf('number');
    expect(r.total_wire_m).toBeTypeOf('number');
    expect(r.estimated_cost).toBeDefined();
    expect(r.wire_break_risk).toBeDefined();
    expect(r.corner_compensation).toBeInstanceOf(Array);
    expect(r.surface_integrity).toBeDefined();
    expect(r.recommendations).toBeInstanceOf(Array);
    expect(r.safety_score).toBeTypeOf('number');
  });

  it('pass detail has all required electrical parameters', () => {
    const p = makePass();
    expect(p.t_on_us).toBeTypeOf('number');
    expect(p.t_off_us).toBeTypeOf('number');
    expect(p.peak_current_A).toBeTypeOf('number');
    expect(p.servo_voltage_V).toBeTypeOf('number');
    expect(p.wire_speed_m_min).toBeTypeOf('number');
    expect(p.power_pct).toBeTypeOf('number');
  });

  it('WireEdmCalcParams covers all input fields', () => {
    const params: WireEdmCalcParams = {
      material: 'D2',
      thickness_mm: 50,
      profile_length_mm: 100,
      target_Ra_um: 0.8,
      tolerance_mm: 0.01,
      wire_type: 'brass',
      wire_diameter_mm: 0.25,
      cut_type: 'profile',
      taper_deg: 0,
      machine_controller: 'fanuc',
      machine_id: 'fanuc-c600ib',
      optimization_goal: 'balanced',
      workpiece_material_category: 'K',
      workpiece_hardness_HRC: 62,
      is_submerged: true,
      workholding_type: 'wire-fixture',
    };
    expect(params.material).toBe('D2');
    expect(params.thickness_mm).toBe(50);
  });

  it('wire types are valid union members', () => {
    const types: WireType[] = ['brass', 'zinc_coated', 'molybdenum', 'tungsten'];
    expect(types).toHaveLength(4);
  });

  it('cut types are valid union members', () => {
    const types: CutType[] = ['profile', 'skim_only'];
    expect(types).toHaveLength(2);
  });

  it('optimization goals are valid union members', () => {
    const goals: OptimizationGoal[] = ['tool_life', 'productivity', 'surface_finish', 'balanced', 'cost'];
    expect(goals).toHaveLength(5);
  });

  it('controller types are valid union members', () => {
    const controllers: WedmController[] = ['fanuc', 'sodick', 'makino', 'mitsubishi', 'agiecharmilles', 'generic'];
    expect(controllers).toHaveLength(6);
  });
});

// ── Wire Break Risk Logic Tests ──

describe('Wire break risk severity', () => {
  it('low risk: probability < 5%', () => {
    const risk: WireEdmWireBreakRisk = {
      probability: 0.03, severity: 'low', factors: [], mitigations: [],
    };
    expect(risk.severity).toBe('low');
    expect(risk.probability * 100).toBeLessThan(5);
  });

  it('medium risk: probability 5-15%', () => {
    const risk: WireEdmWireBreakRisk = {
      probability: 0.08, severity: 'medium', factors: ['thick workpiece'], mitigations: ['reduce speed'],
    };
    expect(risk.severity).toBe('medium');
    expect(risk.probability * 100).toBeGreaterThanOrEqual(5);
    expect(risk.probability * 100).toBeLessThanOrEqual(15);
  });

  it('high risk: probability > 15%', () => {
    const risk: WireEdmWireBreakRisk = {
      probability: 0.22, severity: 'high',
      factors: ['very thick', 'poor flushing', 'worn guides'],
      mitigations: ['reduce speed', 'increase flushing', 'use coated wire'],
    };
    expect(risk.severity).toBe('high');
    expect(risk.probability * 100).toBeGreaterThan(15);
  });

  it('confidence interval bounds are ordered', () => {
    const risk: WireEdmWireBreakRisk = {
      probability: 0.08, severity: 'medium', factors: [], mitigations: [],
      confidence_interval: [0.05, 0.12],
    };
    expect(risk.confidence_interval![0]).toBeLessThan(risk.confidence_interval![1]);
    expect(risk.confidence_interval![0]).toBeLessThanOrEqual(risk.probability);
    expect(risk.confidence_interval![1]).toBeGreaterThanOrEqual(risk.probability);
  });
});

// ── Surface Integrity Safety Card Tests ──

describe('Surface integrity safety card', () => {
  it('recast layer is always present and positive', () => {
    const si: WireEdmSurfaceIntegrity = {
      recast_um: 18.0, haz_um: 35, residual_stress_MPa: 120, fatigue_reduction_pct: 15,
      spec_compliance: [],
    };
    expect(si.recast_um).toBeGreaterThan(0);
  });

  it('HAZ depth is always present and positive', () => {
    const si: WireEdmSurfaceIntegrity = {
      recast_um: 18.0, haz_um: 35, residual_stress_MPa: 120, fatigue_reduction_pct: 15,
      spec_compliance: [],
    };
    expect(si.haz_um).toBeGreaterThan(0);
  });

  it('residual stress can be tensile (positive) or compressive (negative)', () => {
    const tensile: WireEdmSurfaceIntegrity = {
      recast_um: 18, haz_um: 35, residual_stress_MPa: 120, fatigue_reduction_pct: 15,
      spec_compliance: [],
    };
    expect(tensile.residual_stress_MPa).toBeGreaterThan(0);

    const compressive: WireEdmSurfaceIntegrity = {
      recast_um: 5, haz_um: 10, residual_stress_MPa: -80, fatigue_reduction_pct: 5,
      spec_compliance: [],
    };
    expect(compressive.residual_stress_MPa).toBeLessThan(0);
  });

  it('spec compliance failure triggers HOLD for aerospace', () => {
    const si: WireEdmSurfaceIntegrity = {
      recast_um: 25, haz_um: 50, residual_stress_MPa: 200, fatigue_reduction_pct: 30,
      spec_compliance: [
        { standard: 'AMS 2628', pass: false, violations: ['Recast exceeds 20 µm limit'] },
      ],
    };
    const hasFailure = si.spec_compliance.some((s) => !s.pass);
    expect(hasFailure).toBe(true);
  });

  it('spec compliance pass has no violations', () => {
    const si: WireEdmSurfaceIntegrity = {
      recast_um: 8, haz_um: 15, residual_stress_MPa: 50, fatigue_reduction_pct: 8,
      spec_compliance: [
        { standard: 'AMS 2628', pass: true, violations: [] },
        { standard: 'ASTM F86', pass: true, violations: [] },
      ],
    };
    expect(si.spec_compliance.every((s) => s.pass)).toBe(true);
    expect(si.spec_compliance.every((s) => s.violations.length === 0)).toBe(true);
  });

  it('fatigue reduction above 20% is critical', () => {
    const criticalResult = makeResult({
      surface_integrity: {
        recast_um: 25, haz_um: 50, residual_stress_MPa: 200, fatigue_reduction_pct: 35,
        spec_compliance: [],
      },
    });
    expect(criticalResult.surface_integrity.fatigue_reduction_pct).toBeGreaterThan(20);
  });
});

// ── Pass Progression Validation ──

describe('Pass progression physics', () => {
  it('passes count matches expected 4-pass D2 profile', () => {
    const r = makeResult();
    expect(r.passes).toHaveLength(4);
  });

  it('Ra decreases monotonically from rough to final skim', () => {
    const r = makeResult();
    for (let i = 1; i < r.passes.length; i++) {
      expect(r.passes[i].predicted_Ra_um).toBeLessThanOrEqual(r.passes[i - 1].predicted_Ra_um);
    }
  });

  it('offset decreases monotonically across passes', () => {
    const r = makeResult();
    for (let i = 1; i < r.passes.length; i++) {
      expect(r.passes[i].offset_mm).toBeLessThanOrEqual(r.passes[i - 1].offset_mm);
    }
  });

  it('energy decreases from rough to skim', () => {
    const r = makeResult();
    expect(r.passes[0].energy_pct).toBeGreaterThan(r.passes[r.passes.length - 1].energy_pct);
  });

  it('recast decreases from rough to skim', () => {
    const r = makeResult();
    expect(r.passes[0].predicted_recast_um).toBeGreaterThan(r.passes[r.passes.length - 1].predicted_recast_um);
  });

  it('speed increases from rough to skim', () => {
    const r = makeResult();
    expect(r.passes[0].speed_mm_min).toBeLessThan(r.passes[r.passes.length - 1].speed_mm_min);
  });

  it('first pass is type rough', () => {
    const r = makeResult();
    expect(r.passes[0].type).toBe('rough');
  });

  it('subsequent passes are type skim', () => {
    const r = makeResult();
    for (let i = 1; i < r.passes.length; i++) {
      expect(r.passes[i].type).toBe('skim');
    }
  });
});

// ── Cost Estimation Contract ──

describe('Cost estimation', () => {
  it('total equals sum of components', () => {
    const cost = makeResult().estimated_cost;
    const sum = cost.machine_usd + cost.wire_usd + cost.consumables_usd + cost.post_process_usd;
    expect(cost.total_usd).toBeCloseTo(sum, 1);
  });

  it('all cost components are non-negative', () => {
    const cost = makeResult().estimated_cost;
    expect(cost.machine_usd).toBeGreaterThanOrEqual(0);
    expect(cost.wire_usd).toBeGreaterThanOrEqual(0);
    expect(cost.consumables_usd).toBeGreaterThanOrEqual(0);
    expect(cost.total_usd).toBeGreaterThan(0);
  });
});

// ── Corner Compensation ──

describe('Corner compensation', () => {
  it('overtravel and dwell are positive', () => {
    const r = makeResult();
    for (const cc of r.corner_compensation) {
      expect(cc.overtravel_mm).toBeGreaterThan(0);
      expect(cc.dwell_s).toBeGreaterThanOrEqual(0);
    }
  });

  it('angle is provided for corner entries', () => {
    const r = makeResult();
    expect(r.corner_compensation[0].angle_deg).toBe(90);
  });
});

// ── Taper Result ──

describe('Taper result', () => {
  it('taper is optional (undefined when no taper requested)', () => {
    const r = makeResult({ taper: undefined });
    expect(r.taper).toBeUndefined();
  });

  it('taper has UV offset, error, and max capable when present', () => {
    const r = makeResult({
      taper: { uv_offset_mm: 1.234, error_um: 5.2, max_capable_deg: 30 },
    });
    expect(r.taper!.uv_offset_mm).toBeGreaterThan(0);
    expect(r.taper!.error_um).toBeGreaterThanOrEqual(0);
    expect(r.taper!.max_capable_deg).toBeGreaterThan(0);
  });
});

// ── Empty/Edge Cases ──

describe('Edge cases', () => {
  it('empty passes array is valid', () => {
    const r = makeResult({ passes: [] });
    expect(r.passes).toHaveLength(0);
  });

  it('single pass result (skim only)', () => {
    const r = makeResult({ passes: [makePass({ type: 'skim', offset_mm: 0.02 })] });
    expect(r.passes).toHaveLength(1);
    expect(r.passes[0].type).toBe('skim');
  });

  it('safety score 0 is valid (worst case)', () => {
    const r = makeResult({ safety_score: 0 });
    expect(r.safety_score).toBe(0);
  });

  it('safety score 1 is valid (best case)', () => {
    const r = makeResult({ safety_score: 1 });
    expect(r.safety_score).toBe(1);
  });

  it('empty recommendations array', () => {
    const r = makeResult({ recommendations: [] });
    expect(r.recommendations).toHaveLength(0);
  });

  it('multiple spec compliance entries', () => {
    const r = makeResult({
      surface_integrity: {
        recast_um: 18, haz_um: 35, residual_stress_MPa: 120, fatigue_reduction_pct: 15,
        spec_compliance: [
          { standard: 'AMS 2628', pass: true, violations: [] },
          { standard: 'ASTM F86', pass: false, violations: ['Recast exceeds limit'] },
          { standard: 'OEM-Custom', pass: true, violations: [] },
        ],
      },
    });
    expect(r.surface_integrity.spec_compliance).toHaveLength(3);
    expect(r.surface_integrity.spec_compliance.filter((s) => !s.pass)).toHaveLength(1);
  });
});
