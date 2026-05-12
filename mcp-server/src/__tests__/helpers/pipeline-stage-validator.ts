/**
 * 14-Stage Pipeline Validation Matrix — Phase 0-C U-TEST2
 *
 * Defines typed input/output and validation functions for each stage
 * of the Print-to-Program pipeline. Used to verify end-to-end
 * pipeline integrity and catch inter-stage data corruption.
 *
 * Stages:
 *  1. OCR Accuracy        8. Physics Bounds
 *  2. Feature Types        9. Collision Check
 *  3. Material Resolution 10. G-Code Syntax
 *  4. Machine Selection   11. Simulation
 *  5. Strategy Scoring    12. Cycle Time
 *  6. Tool Validation     13. Documentation
 *  7. S/F Ranges          14. Output Assembly
 */

// ============================================================================
// STAGE DEFINITIONS
// ============================================================================

export interface StageValidation {
  stage: number;
  name: string;
  validate: (data: Record<string, unknown>) => StageResult;
}

export interface StageResult {
  pass: boolean;
  score: number; // 0-1
  issues: string[];
  warnings: string[];
}

function ok(score = 1.0): StageResult {
  return { pass: true, score, issues: [], warnings: [] };
}

function fail(issues: string[], score = 0): StageResult {
  return { pass: false, score, issues, warnings: [] };
}

// ============================================================================
// STAGE 1: OCR ACCURACY
// ============================================================================
const stage1_ocrAccuracy: StageValidation = {
  stage: 1,
  name: "OCR Accuracy",
  validate(data) {
    const dims = data.dimensions as any[] | undefined;
    if (!dims || dims.length === 0) return fail(["No dimensions extracted"]);

    const issues: string[] = [];
    const warnings: string[] = [];
    let validCount = 0;

    for (const d of dims) {
      if (typeof d.nominal !== "number" || d.nominal <= 0) {
        issues.push(`Dimension ${d.id || "?"}: invalid nominal ${d.nominal}`);
      } else {
        validCount++;
      }
      if (d.nominal > 10000) warnings.push(`Dimension ${d.id}: ${d.nominal}mm unusually large`);
      if (d.nominal < 0.01) warnings.push(`Dimension ${d.id}: ${d.nominal}mm unusually small`);
    }

    const accuracy = validCount / dims.length;
    return { pass: accuracy >= 0.9, score: accuracy, issues, warnings };
  },
};

// ============================================================================
// STAGE 2: FEATURE TYPES
// ============================================================================
const VALID_FEATURE_TYPES = new Set([
  "pocket", "hole", "slot", "boss", "face", "chamfer", "fillet", "contour",
  "thread", "groove", "step", "bore", "counterbore", "countersink", "tap",
  "od_straight", "od_taper", "od_contour", "id_bore", "face_groove",
  "thread_od", "thread_id", "part_off", "drill_center",
]);

const stage2_featureTypes: StageValidation = {
  stage: 2,
  name: "Feature Types",
  validate(data) {
    const features = data.features as any[] | undefined;
    if (!features || features.length === 0) return fail(["No features classified"]);

    const issues: string[] = [];
    for (const f of features) {
      if (!f.type) issues.push(`Feature ${f.id}: missing type`);
      else if (!VALID_FEATURE_TYPES.has(f.type)) {
        issues.push(`Feature ${f.id}: unknown type '${f.type}'`);
      }
      if (!f.depth_mm && !f.diameter_mm && !f.length_mm) {
        issues.push(`Feature ${f.id}: no dimensional data`);
      }
    }

    return { pass: issues.length === 0, score: 1 - issues.length / features.length, issues, warnings: [] };
  },
};

// ============================================================================
// STAGE 3: MATERIAL RESOLUTION
// ============================================================================
const VALID_ISO_GROUPS = new Set(["P", "M", "K", "N", "S", "H"]);

const stage3_materialResolution: StageValidation = {
  stage: 3,
  name: "Material Resolution",
  validate(data) {
    const mat = data.material as any;
    if (!mat) return fail(["No material specified"]);
    if (!mat.material_name && !mat.iso_group) return fail(["Material has no name or ISO group"]);

    const issues: string[] = [];
    if (mat.iso_group && !VALID_ISO_GROUPS.has(mat.iso_group)) {
      issues.push(`Invalid ISO group: ${mat.iso_group}`);
    }

    return { pass: issues.length === 0, score: issues.length === 0 ? 1 : 0.5, issues, warnings: [] };
  },
};

// ============================================================================
// STAGE 4: MACHINE SELECTION
// ============================================================================
const stage4_machineSelection: StageValidation = {
  stage: 4,
  name: "Machine Selection",
  validate(data) {
    const warnings: string[] = [];
    const rpm = data.max_spindle_rpm as number | undefined;
    const power = data.max_power_kW as number | undefined;

    if (!rpm) warnings.push("No max_spindle_rpm — using generic limits");
    if (!power) warnings.push("No max_power_kW — using generic limits");
    if (rpm && rpm > 60000) return fail([`RPM ${rpm} exceeds any known machine`]);
    if (power && power > 200) return fail([`Power ${power}kW exceeds any known machine`]);

    return { pass: true, score: (rpm && power) ? 1.0 : 0.7, issues: [], warnings };
  },
};

// ============================================================================
// STAGE 5: STRATEGY SCORING
// ============================================================================
const stage5_strategyScoring: StageValidation = {
  stage: 5,
  name: "Strategy Scoring",
  validate(data) {
    const ops = data.operations as any[] | undefined;
    if (!ops || ops.length === 0) return fail(["No operations planned"]);

    const issues: string[] = [];
    for (const op of ops) {
      if (!op.operation_type) issues.push(`Op ${op.op_number}: missing operation_type`);
      if (!op.tool) issues.push(`Op ${op.op_number}: missing tool`);
    }

    return { pass: issues.length === 0, score: 1 - issues.length / ops.length, issues, warnings: [] };
  },
};

// ============================================================================
// STAGE 6: TOOL VALIDATION
// ============================================================================
const stage6_toolValidation: StageValidation = {
  stage: 6,
  name: "Tool Validation",
  validate(data) {
    const ops = data.operations as any[] | undefined;
    if (!ops) return ok(0.5);

    const issues: string[] = [];
    const warnings: string[] = [];
    for (const op of ops) {
      const t = op.tool;
      if (!t) continue;
      if (!t.diameter_mm || t.diameter_mm <= 0) issues.push(`Op ${op.op_number}: tool diameter ≤0`);
      if (t.diameter_mm > 200) warnings.push(`Op ${op.op_number}: tool ${t.diameter_mm}mm unusually large`);
      if (t.flute_length_mm && op.cutting_params?.depth_of_cut_mm > t.flute_length_mm) {
        issues.push(`Op ${op.op_number}: DOC ${op.cutting_params.depth_of_cut_mm}mm > flute length ${t.flute_length_mm}mm`);
      }
    }

    return { pass: issues.length === 0, score: 1 - issues.length / Math.max(1, ops.length), issues, warnings };
  },
};

// ============================================================================
// STAGE 7: S/F RANGES
// ============================================================================
const SF_LIMITS: Record<string, { rpm_max: number; feed_max: number; vc_max: number }> = {
  P: { rpm_max: 15000, feed_max: 5000, vc_max: 500 },
  M: { rpm_max: 12000, feed_max: 3000, vc_max: 350 },
  K: { rpm_max: 15000, feed_max: 5000, vc_max: 500 },
  N: { rpm_max: 30000, feed_max: 15000, vc_max: 5000 },
  S: { rpm_max: 8000, feed_max: 1500, vc_max: 150 },
  H: { rpm_max: 10000, feed_max: 2000, vc_max: 300 },
};

const stage7_sfRanges: StageValidation = {
  stage: 7,
  name: "S/F Ranges",
  validate(data) {
    const ops = data.operations as any[] | undefined;
    const iso = (data.material as any)?.iso_group || "P";
    const limits = SF_LIMITS[iso] || SF_LIMITS["P"];
    if (!ops) return ok(0.5);

    const issues: string[] = [];
    for (const op of ops) {
      const cp = op.cutting_params;
      if (!cp) continue;
      if (cp.spindle_rpm > limits.rpm_max) issues.push(`Op ${op.op_number}: RPM ${cp.spindle_rpm} > ${iso} max ${limits.rpm_max}`);
      if (cp.feed_mm_min > limits.feed_max) issues.push(`Op ${op.op_number}: feed ${cp.feed_mm_min} > ${iso} max ${limits.feed_max}`);
      if (cp.cutting_speed_m_min > limits.vc_max) issues.push(`Op ${op.op_number}: Vc ${cp.cutting_speed_m_min} > ${iso} max ${limits.vc_max}`);
      if (cp.spindle_rpm <= 0) issues.push(`Op ${op.op_number}: RPM ≤0`);
      if (cp.feed_mm_min <= 0) issues.push(`Op ${op.op_number}: feed ≤0`);
    }

    return { pass: issues.length === 0, score: 1 - issues.length / Math.max(1, ops.length), issues, warnings: [] };
  },
};

// ============================================================================
// STAGE 8: PHYSICS BOUNDS
// ============================================================================
const stage8_physicsBounds: StageValidation = {
  stage: 8,
  name: "Physics Bounds",
  validate(data) {
    const ops = data.operations as any[] | undefined;
    if (!ops) return ok(0.5);

    const issues: string[] = [];
    const maxPower = (data.max_power_kW as number) || 30;
    for (const op of ops) {
      const ph = op.physics;
      if (!ph) continue;
      if (ph.cutting_force_N < 0) issues.push(`Op ${op.op_number}: negative force ${ph.cutting_force_N}N`);
      if (ph.cutting_force_N > 50000) issues.push(`Op ${op.op_number}: force ${ph.cutting_force_N}N impossibly high`);
      if (ph.power_kW > maxPower * 1.2) issues.push(`Op ${op.op_number}: power ${ph.power_kW}kW > machine max ${maxPower}kW`);
      if (ph.power_kW < 0) issues.push(`Op ${op.op_number}: negative power`);
      if (ph.tool_life_min <= 0) issues.push(`Op ${op.op_number}: tool life ≤0`);
      if (ph.deflection_mm > 0.5) issues.push(`Op ${op.op_number}: deflection ${ph.deflection_mm}mm excessive`);
    }

    return { pass: issues.length === 0, score: 1 - issues.length / Math.max(1, ops.length * 4), issues, warnings: [] };
  },
};

// ============================================================================
// STAGES 9-14 (lighter validation — full impl in later phases)
// ============================================================================

const stage9_collisionCheck: StageValidation = {
  stage: 9, name: "Collision Check",
  validate(data) {
    const safety = data.safety_checks as any[] | undefined;
    if (!safety) return { pass: true, score: 0.5, issues: [], warnings: ["No safety checks run"] };
    const fails = safety.filter((s: any) => s.status === "fail");
    return { pass: fails.length === 0, score: 1 - fails.length / safety.length, issues: fails.map((f: any) => f.message), warnings: [] };
  },
};

const stage10_gcodeSyntax: StageValidation = {
  stage: 10, name: "G-Code Syntax",
  validate(data) {
    const text = data.program_text as string | undefined;
    if (!text) return fail(["No program text"]);
    const issues: string[] = [];
    if (!text.includes("M30") && !text.includes("M02")) issues.push("Missing program end (M30/M02)");
    if (text.includes("NaN")) issues.push("NaN found in program");
    if (text.includes("undefined")) issues.push("'undefined' found in program");
    if (text.includes("Infinity")) issues.push("'Infinity' found in program");
    return { pass: issues.length === 0, score: issues.length === 0 ? 1 : 0.3, issues, warnings: [] };
  },
};

const stage11_simulation: StageValidation = {
  stage: 11, name: "Simulation",
  validate() { return ok(0.5); }, // Placeholder — Phase 4 implements full simulation
};

const stage12_cycleTime: StageValidation = {
  stage: 12, name: "Cycle Time",
  validate(data) {
    const ct = data.estimated_cycle_time_sec as number | undefined;
    if (!ct || ct <= 0) return fail(["No cycle time estimate"]);
    if (ct > 86400) return fail([`Cycle time ${ct}s = ${(ct/3600).toFixed(1)}h — likely error`]);
    return ok(1.0);
  },
};

const stage13_documentation: StageValidation = {
  stage: 13, name: "Documentation",
  validate(data) {
    const warnings: string[] = [];
    if (!data.setup_sheet) warnings.push("No setup sheet generated");
    if (!data.tool_list && !(data as any).operations) warnings.push("No tool list");
    return { pass: true, score: warnings.length === 0 ? 1 : 0.6, issues: [], warnings };
  },
};

const stage14_outputAssembly: StageValidation = {
  stage: 14, name: "Output Assembly",
  validate(data) {
    const issues: string[] = [];
    if (!data.program_text) issues.push("Missing program_text");
    if (data.success === false) issues.push("Pipeline reported failure");
    return { pass: issues.length === 0, score: issues.length === 0 ? 1 : 0, issues, warnings: [] };
  },
};

// ============================================================================
// PIPELINE VALIDATOR
// ============================================================================

export const PIPELINE_STAGES: StageValidation[] = [
  stage1_ocrAccuracy,
  stage2_featureTypes,
  stage3_materialResolution,
  stage4_machineSelection,
  stage5_strategyScoring,
  stage6_toolValidation,
  stage7_sfRanges,
  stage8_physicsBounds,
  stage9_collisionCheck,
  stage10_gcodeSyntax,
  stage11_simulation,
  stage12_cycleTime,
  stage13_documentation,
  stage14_outputAssembly,
];

export interface PipelineValidationReport {
  overall_pass: boolean;
  overall_score: number;
  stages: Array<{ stage: number; name: string; result: StageResult }>;
  failing_stages: string[];
}

/**
 * Run all 14 validation stages on pipeline output.
 * Pass the full pipeline result object as `data`.
 */
export function validatePipeline(data: Record<string, unknown>): PipelineValidationReport {
  const results = PIPELINE_STAGES.map(s => ({
    stage: s.stage,
    name: s.name,
    result: s.validate(data),
  }));

  const failing = results.filter(r => !r.result.pass);
  const avgScore = results.reduce((s, r) => s + r.result.score, 0) / results.length;

  return {
    overall_pass: failing.length === 0,
    overall_score: Math.round(avgScore * 100) / 100,
    stages: results,
    failing_stages: failing.map(f => `Stage ${f.stage}: ${f.name}`),
  };
}
