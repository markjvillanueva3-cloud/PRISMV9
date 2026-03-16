/**
 * PRISM: TestingProtocolEngine
 * ==============================
 * Generate standardized testing protocols for tool life (ISO 3685),
 * surface finish (ISO 4287/4288), and dimensional conformance (ISO 14253-1).
 *
 * Methods:
 *  - generateToolLifeTest      — ISO 3685 tool life test protocol
 *  - generateSurfaceFinishTest — ISO 4287/4288 surface measurement protocol
 *  - generateDimensionalTest   — ISO 14253-1 decision rules for conformance
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToolMaterial = 'HSS' | 'carbide' | 'ceramic' | 'CBN' | 'diamond';

export interface ToolLifeTestInput {
  tool_type: ToolMaterial;
  workpiece_material: string;
  cutting_speed_range_mpm: [number, number];
  num_speed_points?: number;
}

export interface WearCriterion {
  type: 'VB' | 'VBmax' | 'KT';
  limit_mm: number;
}

export interface TestPoint {
  speed_mpm: number;
  expected_life_min: number;
  replications: number;
}

export interface ToolLifeTestResult {
  protocol: {
    speeds_mpm: number[];
    feed_mm: number;
    depth_mm: number;
    tool_geometry: string;
    wear_criterion: WearCriterion;
  };
  test_matrix: TestPoint[];
  total_tools_needed: number;
  estimated_time_hours: number;
  data_collection: string[];
}

export interface SurfaceFinishTestInput {
  process: string;
  target_Ra_um: number;
  measurement_method: 'contact' | 'optical';
}

export interface SurfaceFinishTestResult {
  protocol: {
    standard: string;
    process: string;
    target_Ra_um: number;
    measurement_method: string;
  };
  measurement_params: {
    cutoff_mm: number;
    evaluation_length_mm: number;
    filter_type: string;
  };
  sample_size: number;
  acceptance_criteria: {
    max_Ra_um: number;
    max_Rz_um: number;
    max_Rq_um: number;
    num_measurements_per_sample: number;
    rule: string;
  };
}

export interface DimensionalTestInput {
  nominal_mm: number;
  tolerance_mm: number;
  measurement_uncertainty_mm: number;
}

export interface DimensionalTestResult {
  conformance_zone_mm: [number, number];
  non_conformance_zone_mm: [number, number];
  uncertainty_zone_mm: [number, number];
  decision_rule: string;
  gauge_R_R_required: boolean;
  details: {
    nominal_mm: number;
    tolerance_mm: number;
    measurement_uncertainty_mm: number;
    upper_spec_mm: number;
    lower_spec_mm: number;
    guard_band_mm: number;
    acceptance_upper_mm: number;
    acceptance_lower_mm: number;
  };
}

// ---------------------------------------------------------------------------
// Tool-specific defaults per ISO 3685
// ---------------------------------------------------------------------------

interface ToolDefaults {
  wear_criterion: WearCriterion;
  feed_mm: number;
  depth_mm: number;
  geometry: string;
  replications: number;
  taylor_C: number;  // approximate Taylor constant for life estimation
  taylor_n: number;  // Taylor exponent
}

const TOOL_DEFAULTS: Record<ToolMaterial, ToolDefaults> = {
  HSS: {
    wear_criterion: { type: 'VB', limit_mm: 0.3 },
    feed_mm: 0.25,
    depth_mm: 2.0,
    geometry: 'CNMG 120408 equivalent, 0° rake, 6° clearance',
    replications: 3,
    taylor_C: 120,
    taylor_n: 0.125,
  },
  carbide: {
    wear_criterion: { type: 'VB', limit_mm: 0.3 },
    feed_mm: 0.2,
    depth_mm: 2.0,
    geometry: 'CNMG 120408, -6° rake, 6° clearance, 0.8mm nose radius',
    replications: 3,
    taylor_C: 300,
    taylor_n: 0.25,
  },
  ceramic: {
    wear_criterion: { type: 'VBmax', limit_mm: 0.6 },
    feed_mm: 0.15,
    depth_mm: 1.5,
    geometry: 'RNGN 120700, round insert, negative rake',
    replications: 3,
    taylor_C: 600,
    taylor_n: 0.33,
  },
  CBN: {
    wear_criterion: { type: 'VB', limit_mm: 0.2 },
    feed_mm: 0.1,
    depth_mm: 0.5,
    geometry: 'CNGA 120408, -6° rake, 0.8mm nose, chamfered edge',
    replications: 2,
    taylor_C: 800,
    taylor_n: 0.4,
  },
  diamond: {
    wear_criterion: { type: 'KT', limit_mm: 0.1 },
    feed_mm: 0.08,
    depth_mm: 0.5,
    geometry: 'DCMT 070204, 5° positive rake, polished',
    replications: 2,
    taylor_C: 1200,
    taylor_n: 0.5,
  },
};

// ---------------------------------------------------------------------------
// ISO 4288 cutoff selection based on Ra range
// ---------------------------------------------------------------------------

interface CutoffRule {
  max_Ra_um: number;
  cutoff_mm: number;
  evaluation_length_mm: number;
}

const ISO_4288_CUTOFFS: CutoffRule[] = [
  { max_Ra_um: 0.02,  cutoff_mm: 0.08,  evaluation_length_mm: 0.4  },
  { max_Ra_um: 0.1,   cutoff_mm: 0.25,  evaluation_length_mm: 1.25 },
  { max_Ra_um: 2.0,   cutoff_mm: 0.8,   evaluation_length_mm: 4.0  },
  { max_Ra_um: 10.0,  cutoff_mm: 2.5,   evaluation_length_mm: 12.5 },
  { max_Ra_um: 80.0,  cutoff_mm: 8.0,   evaluation_length_mm: 40.0 },
];

function selectCutoff(Ra_um: number): { cutoff_mm: number; evaluation_length_mm: number } {
  for (const rule of ISO_4288_CUTOFFS) {
    if (Ra_um <= rule.max_Ra_um) {
      return { cutoff_mm: rule.cutoff_mm, evaluation_length_mm: rule.evaluation_length_mm };
    }
  }
  const last = ISO_4288_CUTOFFS[ISO_4288_CUTOFFS.length - 1];
  return { cutoff_mm: last.cutoff_mm, evaluation_length_mm: last.evaluation_length_mm };
}

// ---------------------------------------------------------------------------
// Material hardness modifier for Taylor life estimation
// ---------------------------------------------------------------------------

function materialLifeModifier(material: string): number {
  const m = material.toLowerCase();
  if (m.includes('aluminum') || m.includes('aluminium')) return 2.0;
  if (m.includes('brass') || m.includes('copper')) return 1.8;
  if (m.includes('cast iron') || m.includes('grey iron')) return 1.2;
  if (m.includes('stainless')) return 0.6;
  if (m.includes('titanium')) return 0.4;
  if (m.includes('inconel') || m.includes('hastelloy')) return 0.3;
  if (m.includes('hardened')) return 0.5;
  if (m.includes('steel')) return 1.0;
  return 1.0;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class TestingProtocolEngine {
  /**
   * Generate an ISO 3685 tool life test protocol.
   */
  generateToolLifeTest(input: ToolLifeTestInput): ToolLifeTestResult {
    const { tool_type, workpiece_material, cutting_speed_range_mpm } = input;
    const numPoints = input.num_speed_points ?? 5;
    const defaults = TOOL_DEFAULTS[tool_type];
    const matMod = materialLifeModifier(workpiece_material);

    // Generate speed points (logarithmic spacing per ISO 3685 recommendation)
    const vMin = cutting_speed_range_mpm[0];
    const vMax = cutting_speed_range_mpm[1];
    const logMin = Math.log10(vMin);
    const logMax = Math.log10(vMax);
    const speeds: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      const logV = logMin + (logMax - logMin) * i / (numPoints - 1);
      speeds.push(Math.round(Math.pow(10, logV) * 10) / 10);
    }

    // Estimate tool life at each speed using Taylor equation: T = (C/V)^(1/n)
    const testMatrix: TestPoint[] = speeds.map(v => {
      const life = Math.round(Math.pow(defaults.taylor_C * matMod / v, 1 / defaults.taylor_n) * 10) / 10;
      return {
        speed_mpm: v,
        expected_life_min: Math.max(1, Math.min(life, 9999)),
        replications: defaults.replications,
      };
    });

    const totalTools = testMatrix.reduce((sum, t) => sum + t.replications, 0);
    // Estimated time: sum of (expected_life * replications) + setup time
    const cuttingHours = testMatrix.reduce((sum, t) => sum + (t.expected_life_min * t.replications) / 60, 0);
    const setupHours = totalTools * 0.25; // 15 min setup per tool change
    const estimatedTime = Math.round((cuttingHours + setupHours) * 10) / 10;

    return {
      protocol: {
        speeds_mpm: speeds,
        feed_mm: defaults.feed_mm,
        depth_mm: defaults.depth_mm,
        tool_geometry: defaults.geometry,
        wear_criterion: defaults.wear_criterion,
      },
      test_matrix: testMatrix,
      total_tools_needed: totalTools,
      estimated_time_hours: estimatedTime,
      data_collection: [
        'Flank wear VB measured every 2 minutes (optical microscope, 20x)',
        'Crater wear KT measured at end of each test (profilometer)',
        'Cutting forces recorded continuously (Kistler 9257B dynamometer)',
        'Surface roughness Ra measured every 5 minutes (stylus profilometer)',
        'Chip form documented per ISO 3685 Annex A',
        'Cutting temperature via embedded thermocouple (optional)',
        'Vibration amplitude monitored (accelerometer on tool holder)',
        `Workpiece material hardness verified (${workpiece_material})`,
        'Tool nose radius measured before and after test',
        'Coolant flow rate and concentration recorded',
      ],
    };
  }

  /**
   * Generate an ISO 4287/4288 surface finish measurement protocol.
   */
  generateSurfaceFinishTest(input: SurfaceFinishTestInput): SurfaceFinishTestResult {
    const { process, target_Ra_um, measurement_method } = input;
    const { cutoff_mm, evaluation_length_mm } = selectCutoff(target_Ra_um);

    // Filter type per ISO 16610-21
    const filterType = measurement_method === 'contact'
      ? 'Gaussian (ISO 16610-21)'
      : 'Robust Gaussian (ISO 16610-31)';

    // Sample size: minimum 5 per ISO 4288 clause 4
    const sampleSize = target_Ra_um < 0.4 ? 10 : 5;

    // Rz ~ 4*Ra for machined surfaces, Rq ~ 1.25*Ra
    const maxRz = Math.round(target_Ra_um * 4 * 100) / 100;
    const maxRq = Math.round(target_Ra_um * 1.25 * 100) / 100;

    return {
      protocol: {
        standard: 'ISO 4287:1997 / ISO 4288:1996',
        process,
        target_Ra_um,
        measurement_method,
      },
      measurement_params: {
        cutoff_mm,
        evaluation_length_mm,
        filter_type: filterType,
      },
      sample_size: sampleSize,
      acceptance_criteria: {
        max_Ra_um: target_Ra_um,
        max_Rz_um: maxRz,
        max_Rq_um: maxRq,
        num_measurements_per_sample: 3,
        rule: target_Ra_um < 0.4
          ? '16% rule: none of the measured values shall exceed the specified value (ISO 4288 clause 4.2.2)'
          : 'Max rule: the maximum measured value shall not exceed the specified value (ISO 4288 clause 4.2.1)',
      },
    };
  }

  /**
   * Generate an ISO 14253-1 dimensional conformance test protocol.
   */
  generateDimensionalTest(input: DimensionalTestInput): DimensionalTestResult {
    const { nominal_mm, tolerance_mm, measurement_uncertainty_mm } = input;

    // ISO 14253-1: guard band = expanded measurement uncertainty (k=2, ~95%)
    const guardBand = measurement_uncertainty_mm;

    const upperSpec = nominal_mm + tolerance_mm / 2;
    const lowerSpec = nominal_mm - tolerance_mm / 2;

    // Conformance zone: spec limits shrunk by guard band
    const acceptanceUpper = upperSpec - guardBand;
    const acceptanceLower = lowerSpec + guardBand;

    // Non-conformance zone: outside spec limits expanded by guard band
    const nonConfUpper = upperSpec + guardBand;
    const nonConfLower = lowerSpec - guardBand;

    // Gauge R&R required when uncertainty > 10% of tolerance
    const uncertaintyRatio = measurement_uncertainty_mm / tolerance_mm;
    const gaugeRRRequired = uncertaintyRatio > 0.1;

    // Decision rule
    let decisionRule: string;
    if (uncertaintyRatio <= 0.1) {
      decisionRule = 'Simple acceptance: measurement uncertainty negligible (≤10% of tolerance). Accept if measured value within specification limits.';
    } else if (uncertaintyRatio <= 0.2) {
      decisionRule = 'Guard band acceptance (ISO 14253-1): Accept only if measured value within specification limits reduced by measurement uncertainty. Uncertainty zone exists — values in this zone are indeterminate.';
    } else if (uncertaintyRatio <= 0.4) {
      decisionRule = 'Stringent guard band: measurement uncertainty significant (>20% of tolerance). Guard band applied. Consider improving measurement capability. Gage R&R study required.';
    } else {
      decisionRule = 'WARNING: Measurement uncertainty exceeds 40% of tolerance. Measurement system inadequate per ISO 14253-1. Must improve measurement capability before conformance decisions can be made.';
    }

    return {
      conformance_zone_mm: [acceptanceLower, acceptanceUpper],
      non_conformance_zone_mm: [nonConfLower, nonConfUpper],
      uncertainty_zone_mm: [acceptanceLower, acceptanceUpper],
      decision_rule: decisionRule,
      gauge_R_R_required: gaugeRRRequired,
      details: {
        nominal_mm,
        tolerance_mm,
        measurement_uncertainty_mm,
        upper_spec_mm: upperSpec,
        lower_spec_mm: lowerSpec,
        guard_band_mm: guardBand,
        acceptance_upper_mm: acceptanceUpper,
        acceptance_lower_mm: acceptanceLower,
      },
    };
  }
}

/** Singleton */
export const testingProtocolEngine = new TestingProtocolEngine();
