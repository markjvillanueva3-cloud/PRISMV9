/**
 * PostAMFinishingPlanEngine — Bridge additive manufacturing to conventional finishing
 *
 * Models: AM-specific machinability factors, support removal estimation,
 *         stress relief scheduling, multi-operation finishing plan generation
 * References: Gibson et al. (2021), ASTM F3301, NIST AM Benchmark,
 *             Bartolo (2011), ASM Handbook Vol 24 (Additive Manufacturing)
 * Safety: Residual stress management critical for AM parts
 */

// ─── Types ─────────────────────────────────────────────────────────

export type AMProcess = 'SLM' | 'EBM' | 'DED' | 'DMLS' | 'FDM';

export interface AMFeature {
  type: string;
  tolerance_mm: number;
  surface_finish_Ra?: number;
}

export interface FinishingOperation {
  sequence: number;
  process: string;
  tool: string;
  params: Record<string, number | string>;
  expected_result: string;
}

export interface FinishingPlanInput {
  am_process: AMProcess;
  material: string;
  as_built_Ra_um: number;
  target_Ra_um: number;
  features: AMFeature[];
}

export interface SupportRemoval {
  method: string;
  time_min: number;
}

export interface StressRelief {
  needed: boolean;
  method?: string;
  temp_C?: number;
  time_hours?: number;
}

export interface FinishingPlanResult {
  operations: FinishingOperation[];
  support_removal: SupportRemoval;
  stress_relief: StressRelief;
  total_time_min: number;
  total_cost_estimate: number;
}

export interface MachinabilityInput {
  am_process: AMProcess;
  material: string;
  build_orientation: string;
  density_pct?: number;
}

export interface MachinabilityResult {
  machinability_factor: number;
  recommended_speed_reduction_pct: number;
  tool_wear_increase_pct: number;
  anisotropy_warnings: string[];
  recommended_tool_coating: string;
}

// ─── Constants ─────────────────────────────────────────────────────

/** As-built surface roughness by AM process (typical Ra µm) */
const AM_AS_BUILT_RA: Record<AMProcess, number> = {
  SLM: 8,
  DMLS: 10,
  EBM: 25,
  DED: 30,
  FDM: 15,
};

/** AM process characteristics */
const AM_PROCESS_PROPS: Record<AMProcess, {
  support_method: string;
  support_time_factor: number;
  stress_relief_needed: boolean;
  porosity_typical_pct: number;
  layer_thickness_um: number;
}> = {
  SLM: {
    support_method: 'wire_EDM_and_manual',
    support_time_factor: 1.0,
    stress_relief_needed: true,
    porosity_typical_pct: 0.5,
    layer_thickness_um: 30,
  },
  DMLS: {
    support_method: 'wire_EDM_and_manual',
    support_time_factor: 1.1,
    stress_relief_needed: true,
    porosity_typical_pct: 0.8,
    layer_thickness_um: 40,
  },
  EBM: {
    support_method: 'powder_blast_and_manual',
    support_time_factor: 0.7,
    stress_relief_needed: false, // built at high temp, less residual stress
    porosity_typical_pct: 0.3,
    layer_thickness_um: 50,
  },
  DED: {
    support_method: 'machining',
    support_time_factor: 1.5,
    stress_relief_needed: true,
    porosity_typical_pct: 1.0,
    layer_thickness_um: 500,
  },
  FDM: {
    support_method: 'dissolve_or_break_away',
    support_time_factor: 0.5,
    stress_relief_needed: false,
    porosity_typical_pct: 5.0,
    layer_thickness_um: 200,
  },
};

/** Material stress relief parameters */
const STRESS_RELIEF_PARAMS: Record<string, { temp_C: number; time_hours: number; method: string }> = {
  'titanium': { temp_C: 595, time_hours: 2, method: 'vacuum_anneal' },
  'inconel': { temp_C: 1065, time_hours: 1, method: 'solution_anneal' },
  'stainless_steel': { temp_C: 650, time_hours: 2, method: 'stress_relief_anneal' },
  'alloy_steel': { temp_C: 600, time_hours: 1.5, method: 'stress_relief_anneal' },
  'aluminum': { temp_C: 350, time_hours: 2, method: 'T6_heat_treat' },
  'tool_steel': { temp_C: 550, time_hours: 2, method: 'temper' },
  'cobalt_chrome': { temp_C: 1050, time_hours: 1, method: 'HIP_and_anneal' },
  'maraging_steel': { temp_C: 490, time_hours: 6, method: 'age_harden' },
};

/** AM machinability reduction factors (relative to wrought) */
const AM_MACHINABILITY_FACTOR: Record<AMProcess, number> = {
  SLM: 0.75,
  DMLS: 0.70,
  EBM: 0.80,
  DED: 0.65,
  FDM: 1.20, // polymers often easier
};

/** Material hardness increase from AM process (HRC delta) */
const AM_HARDNESS_DELTA: Record<string, number> = {
  'titanium': 5,
  'inconel': 8,
  'stainless_steel': 3,
  'alloy_steel': 4,
  'aluminum': 2,
  'tool_steel': 6,
  'cobalt_chrome': 7,
  'maraging_steel': 10,
};

/** Recommended coatings for AM machining */
const COATING_RECOMMENDATION: Record<string, string> = {
  'titanium': 'TiAlN',
  'inconel': 'AlTiN',
  'stainless_steel': 'TiCN',
  'alloy_steel': 'TiAlN',
  'aluminum': 'DLC_or_uncoated',
  'tool_steel': 'AlCrN',
  'cobalt_chrome': 'AlTiN',
};

/** Cost rate per minute for finishing operations ($/min) */
const OP_COST_RATES: Record<string, number> = {
  'milling': 1.50,
  'turning': 1.20,
  'grinding': 2.00,
  'polishing': 0.80,
  'honing': 1.80,
  'EDM': 2.50,
  'blasting': 0.50,
  'burnishing': 1.00,
  'wire_EDM': 3.00,
};

function getMaterialKey(material: string): string {
  const m = material.toLowerCase().replace(/[\s-]+/g, '_');
  for (const key of Object.keys(STRESS_RELIEF_PARAMS)) {
    if (m.includes(key)) return key;
  }
  // Check additional keys
  for (const key of Object.keys(AM_HARDNESS_DELTA)) {
    if (m.includes(key)) return key;
  }
  return 'alloy_steel';
}

// ─── Engine ────────────────────────────────────────────────────────

export class PostAMFinishingPlanEngine {
  /**
   * Plan finishing operations to bridge AM as-built to target specifications.
   * Generates sequenced operation plan with support removal and stress relief.
   */
  planFinishing(input: FinishingPlanInput): FinishingPlanResult {
    const matKey = getMaterialKey(input.material);
    const processProps = AM_PROCESS_PROPS[input.am_process];
    const operations: FinishingOperation[] = [];
    let sequence = 1;
    let totalTime = 0;
    let totalCost = 0;

    // Support removal
    const supportTime = Math.round(15 * processProps.support_time_factor);
    const support_removal: SupportRemoval = {
      method: processProps.support_method,
      time_min: supportTime,
    };
    totalTime += supportTime;
    totalCost += supportTime * (OP_COST_RATES['wire_EDM'] ?? 1.5);

    // Stress relief determination
    const srParams = STRESS_RELIEF_PARAMS[matKey];
    const stress_relief: StressRelief = processProps.stress_relief_needed && srParams
      ? {
        needed: true,
        method: srParams.method,
        temp_C: srParams.temp_C,
        time_hours: srParams.time_hours,
      }
      : { needed: false };

    if (stress_relief.needed && stress_relief.time_hours) {
      totalTime += stress_relief.time_hours * 60; // furnace time
      totalCost += stress_relief.time_hours * 20; // $/hr for heat treatment
    }

    // Current roughness tracking
    let currentRa = input.as_built_Ra_um;

    // Step 1: Rough machining if Ra is very high or tight tolerances needed
    const tightFeatures = input.features.filter(f => f.tolerance_mm < 0.05);
    if (currentRa > 6 || tightFeatures.length > 0) {
      const roughTime = Math.round(10 + tightFeatures.length * 5);
      operations.push({
        sequence: sequence++,
        process: 'rough_milling',
        tool: '4-flute_carbide_endmill',
        params: { depth_of_cut_mm: 1.0, stepover_pct: 50, strategy: 'adaptive_clearing' },
        expected_result: `Remove bulk AM stock, Ra ~3.2 µm`,
      });
      totalTime += roughTime;
      totalCost += roughTime * (OP_COST_RATES['milling'] ?? 1.5);
      currentRa = 3.2;
    }

    // Step 2: Semi-finish machining for tolerance-critical features
    if (tightFeatures.length > 0 && currentRa > 1.6) {
      const semiTime = Math.round(8 + tightFeatures.length * 3);
      operations.push({
        sequence: sequence++,
        process: 'semi_finish_milling',
        tool: '4-flute_carbide_endmill',
        params: { depth_of_cut_mm: 0.3, stepover_pct: 25, strategy: 'contour' },
        expected_result: `Establish geometry within 0.05mm, Ra ~1.6 µm`,
      });
      totalTime += semiTime;
      totalCost += semiTime * (OP_COST_RATES['milling'] ?? 1.5);
      currentRa = 1.6;
    }

    // Step 3: Finish machining
    if (currentRa > input.target_Ra_um * 2) {
      const finishTime = Math.round(12 + input.features.length * 2);
      operations.push({
        sequence: sequence++,
        process: 'finish_milling',
        tool: '2-flute_ballnose_or_endmill',
        params: { depth_of_cut_mm: 0.1, stepover_pct: 10, strategy: 'scallop_height_control' },
        expected_result: `Finish surfaces to Ra ~0.8 µm`,
      });
      totalTime += finishTime;
      totalCost += finishTime * (OP_COST_RATES['milling'] ?? 1.5);
      currentRa = 0.8;
    }

    // Step 4: Feature-specific operations
    for (const feat of input.features) {
      const featRa = feat.surface_finish_Ra ?? input.target_Ra_um;

      if (feat.type === 'bore' || feat.type === 'hole') {
        if (featRa < 0.4) {
          const honeTime = 15;
          operations.push({
            sequence: sequence++,
            process: 'honing',
            tool: 'diamond_honing_stone',
            params: { target_Ra_um: featRa, crosshatch_deg: 45 },
            expected_result: `Bore finish to Ra ${featRa} µm with crosshatch`,
          });
          totalTime += honeTime;
          totalCost += honeTime * (OP_COST_RATES['honing'] ?? 1.8);
        }
      } else if (feat.type === 'flat' || feat.type === 'datum') {
        if (feat.tolerance_mm < 0.01) {
          const grindTime = 10;
          operations.push({
            sequence: sequence++,
            process: 'surface_grinding',
            tool: 'vitrified_wheel_400_grit',
            params: { target_Ra_um: featRa, flatness_um: feat.tolerance_mm * 1000 },
            expected_result: `Grind flat to ${feat.tolerance_mm}mm flatness`,
          });
          totalTime += grindTime;
          totalCost += grindTime * (OP_COST_RATES['grinding'] ?? 2.0);
        }
      }
    }

    // Step 5: Final polishing if target Ra is very low
    if (input.target_Ra_um < 0.4 && currentRa > input.target_Ra_um) {
      const polishTime = Math.round(20 * (0.4 / Math.max(input.target_Ra_um, 0.01)));
      operations.push({
        sequence: sequence++,
        process: 'polishing',
        tool: 'progressive_grit_abrasive',
        params: { target_Ra_um: input.target_Ra_um, method: 'mechanical' },
        expected_result: `Polish to Ra ${input.target_Ra_um} µm`,
      });
      totalTime += polishTime;
      totalCost += polishTime * (OP_COST_RATES['polishing'] ?? 0.8);
    }

    return {
      operations,
      support_removal,
      stress_relief,
      total_time_min: Math.round(totalTime),
      total_cost_estimate: Math.round(totalCost * 100) / 100,
    };
  }

  /**
   * Assess machinability of an AM part vs wrought equivalent.
   * AM parts have different grain structure, residual stress, and porosity.
   */
  assessMachinability(input: MachinabilityInput): MachinabilityResult {
    const matKey = getMaterialKey(input.material);
    const processProps = AM_PROCESS_PROPS[input.am_process];
    const baseFactor = AM_MACHINABILITY_FACTOR[input.am_process];

    // Density correction: lower density = more porosity = different cutting behavior
    const densityPct = input.density_pct ?? (100 - processProps.porosity_typical_pct);
    const densityFactor = densityPct >= 99.5 ? 1.0 :
      densityPct >= 98 ? 0.95 :
        densityPct >= 95 ? 0.85 : 0.70;

    const machinability_factor = Math.round(baseFactor * densityFactor * 100) / 100;

    // Speed reduction from wrought baseline
    const speedReduction = Math.round((1 - machinability_factor) * 100);

    // Tool wear increase
    const hardnessDelta = AM_HARDNESS_DELTA[matKey] ?? 3;
    const wearIncrease = Math.round(hardnessDelta * 5 + (1 - densityFactor) * 50);

    // Anisotropy warnings based on build orientation
    const anisotropy_warnings: string[] = [];
    const orientation = input.build_orientation.toLowerCase();

    if (orientation.includes('z') || orientation.includes('vertical')) {
      anisotropy_warnings.push('Vertical build: reduced tensile strength in Z direction (10-20% lower than XY).');
      anisotropy_warnings.push('Layer boundaries may cause intermittent cutting forces — reduce feed by 10%.');
    }
    if (orientation.includes('45') || orientation.includes('angle')) {
      anisotropy_warnings.push('Angled build: varying grain orientation across cut — expect non-uniform surface finish.');
    }
    if (orientation.includes('x') || orientation.includes('horizontal')) {
      anisotropy_warnings.push('Horizontal build: best machinability in XY plane, watch for support interface roughness on underside.');
    }

    if (densityPct < 99) {
      anisotropy_warnings.push(`Porosity ${(100 - densityPct).toFixed(1)}%: risk of micro-voids causing intermittent tool loading. Use sharp edges and positive rake.`);
    }

    if (input.am_process === 'DED') {
      anisotropy_warnings.push('DED process: expect non-uniform near-net shape. Rough machining envelope required before finishing.');
    }

    if (processProps.stress_relief_needed) {
      anisotropy_warnings.push('Machine AFTER stress relief to prevent distortion and workholding movement.');
    }

    // Tool coating recommendation
    const recommended_tool_coating = COATING_RECOMMENDATION[matKey] ?? 'TiAlN';

    return {
      machinability_factor,
      recommended_speed_reduction_pct: Math.max(0, speedReduction),
      tool_wear_increase_pct: Math.max(0, wearIncrease),
      anisotropy_warnings,
      recommended_tool_coating,
    };
  }
}

export const postAMFinishingPlanEngine = new PostAMFinishingPlanEngine();
