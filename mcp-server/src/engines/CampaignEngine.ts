/**
 * PRISM MCP Server - Campaign Engine (R3-MS3)
 *
 * Batch machining campaign orchestrator. Composes pre-computed IntelligenceEngine
 * results (11 actions) with cumulative safety tracking across operations and
 * materials to produce pass/warning/fail/quarantine status for each material.
 *
 * Architecture:
 *   Dispatcher calls IntelligenceEngine for each operation, feeds results here.
 *   CampaignEngine is PURE COMPUTATION — zero imports from other engines.
 *
 * Actions (4):
 *   campaign_create    - Build a full campaign result from pre-computed op results
 *   campaign_validate  - Validate campaign config structure and physical bounds
 *   campaign_optimize  - Reorder / adjust parameters by optimization objective
 *   campaign_cycle_time - Quick cycle time estimate without full physics
 *
 * Safety model:
 *   Wear   (0.30 weight) — cumulative tool wear across all ops
 *   Spindle (0.20 weight) — peak spindle load against machine capacity
 *   Thermal (0.25 weight) — cumulative thermal accumulation
 *   Constraints (0.25 weight) — violation count against config.constraints
 *
 * Status thresholds:
 *   pass       ≥ 0.70 and ≤ 2 violations
 *   warning    ≥ 0.50 and ≤ 2 violations
 *   fail       ≥ 0.30
 *   quarantine < 0.30 OR > 2 violations
 *
 * Temperature by ISO group (°C):
 *   P (steel):      350 + Vc × 1.5
 *   M (stainless):  400 + Vc × 1.8
 *   K (cast iron):  300 + Vc × 1.2
 *   N (non-ferrous):200 + Vc × 0.8
 *   S (superalloy): 500 + Vc × 2.0
 *   H (hardened):   450 + Vc × 1.8
 */

// ============================================================
// === Campaign Definition Types ===
// ============================================================

export interface CampaignMaterial {
  /** Material identifier (e.g. "steel_4140") */
  id: string;
  /** Display name */
  name: string;
  /** ISO group: P / M / K / N / S / H */
  iso_group: string;
  /** Brinell hardness (optional) */
  hardness_hb?: number;
}

export interface CampaignOperation {
  /** Operation order — must be positive integer, no duplicates within a config */
  sequence: number;
  /** Feature type: pocket, hole, profile, face, thread, etc. */
  feature: string;
  tool_diameter_mm: number;
  tool_type?: string;
  /** Optional — can be derived by dispatcher */
  cutting_speed_m_min?: number;
  feed_per_tooth_mm?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  /** Material volume to remove (mm³) */
  volume_mm3?: number;
  /** Coolant strategy: flood, mql, tsc, dry */
  coolant?: string;
}

export interface CampaignConfig {
  name: string;
  materials: CampaignMaterial[];
  operations: CampaignOperation[];
  machine?: {
    name?: string;
    max_spindle_rpm?: number;
    max_power_kw?: number;
    max_torque_nm?: number;
  };
  constraints?: {
    max_tool_changes?: number;
    max_cycle_time_min?: number;
    target_tool_life_min?: number;
    /** Ra in μm */
    min_surface_finish_ra?: number;
  };
  /** Parts per batch (default 1) */
  batch_size?: number;
}

// ============================================================
// === Campaign Result Types ===
// ============================================================

export interface OperationResult {
  sequence: number;
  feature: string;
  cutting_speed_m_min: number;
  feed_rate_mm_min: number;
  spindle_rpm: number;
  mrr_cm3_min: number;
  cutting_force_n: number;
  tool_life_min: number;
  cycle_time_min: number;
  surface_finish_ra?: number;
  power_kw: number;
  warnings: string[];
}

export interface CumulativeSafety {
  /** Cumulative wear across all ops (0-100%) — may exceed 100 when tool changes occur */
  total_tool_wear_pct: number;
  /** Peak spindle utilization (0-100%) */
  max_spindle_load_pct: number;
  /** Highest single-op cutting temperature (°C) */
  max_cutting_temperature_c: number;
  /** Cumulative thermal buildup with 30% carryover between ops */
  thermal_accumulation_c: number;
  /** Number of tool changes required (when cumulative wear exceeds 100%) */
  tool_changes_required: number;
  /** List of constraint violation messages */
  constraint_violations: string[];
  /** Composite safety score 0.0-1.0 (≥0.70 passes) */
  safety_score: number;
}

export interface MaterialCampaignResult {
  material: CampaignMaterial;
  operations: OperationResult[];
  cumulative_safety: CumulativeSafety;
  total_cycle_time_min: number;
  total_cost_per_part?: number;
  status: "pass" | "warning" | "fail" | "quarantine";
  quarantine_reasons?: string[];
}

export interface CampaignResult {
  name: string;
  /** ISO timestamp */
  created_at: string;
  material_count: number;
  results: MaterialCampaignResult[];
  summary: {
    total_pass: number;
    total_warning: number;
    total_fail: number;
    total_quarantine: number;
    avg_cycle_time_min: number;
    avg_safety_score: number;
    quarantined_materials: string[];
  };
  warnings: string[];
}

// ============================================================
// === Optimization Types ===
// ============================================================

export interface OptimizationTarget {
  objective: "productivity" | "cost" | "quality" | "tool_life" | "balanced";
  weights?: {
    productivity?: number;
    cost?: number;
    quality?: number;
    tool_life?: number;
  };
}

export interface OptimizedCampaign {
  original_order: number[];
  optimized_order: number[];
  operation_adjustments: Array<{
    sequence: number;
    field: string;
    original: number;
    optimized: number;
    reason: string;
  }>;
  estimated_improvement_pct: number;
  warnings: string[];
}

export interface CycleTimeEstimate {
  materials_count: number;
  operations_per_material: number;
  estimated_cutting_time_min: number;
  estimated_rapid_time_min: number;
  estimated_tool_change_time_min: number;
  estimated_total_time_min: number;
  time_per_material_min: number;
  batch_time_min?: number;
  warnings: string[];
}

// ============================================================
// === Constants ===
// ============================================================

export const CAMPAIGN_ACTIONS = [
  "campaign_create",
  "campaign_validate",
  "campaign_optimize",
  "campaign_cycle_time",
] as const;

// Physical bounds for parameter validation
const PARAM_BOUNDS = {
  cutting_speed_m_min: { min: 1, max: 2000 },
  feed_per_tooth_mm: { min: 0.001, max: 1.0 },
  axial_depth_mm: { min: 0.01, max: 50 },
  tool_diameter_mm: { min: 0.1, max: 200 },
} as const;

// Temperature model coefficients indexed by ISO group (uppercase)
const TEMP_MODEL: Record<string, { base: number; slope: number }> = {
  P: { base: 350, slope: 1.5 },
  M: { base: 400, slope: 1.8 },
  K: { base: 300, slope: 1.2 },
  N: { base: 200, slope: 0.8 },
  S: { base: 500, slope: 2.0 },
  H: { base: 450, slope: 1.8 },
};

// Safety score component weights (must sum to 1.0)
const SAFETY_WEIGHTS = {
  wear: 0.30,
  spindle: 0.20,
  thermal: 0.25,
  constraints: 0.25,
} as const;

// Tool change time in minutes
const TOOL_CHANGE_TIME_MIN = 15 / 60; // 15 seconds -> 0.25 min

// ============================================================
// === Internal Helpers ===
// ============================================================

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Estimate cutting temperature for a single operation given ISO group and
 * cutting speed. Falls back to P-group model when ISO group is unrecognised.
 */
function estimateTemperature(iso_group: string, cutting_speed_m_min: number): number {
  const model = TEMP_MODEL[iso_group.toUpperCase()] ?? TEMP_MODEL["P"];
  return model.base + cutting_speed_m_min * model.slope;
}

/**
 * Compute the cumulative safety object for one material given its ordered
 * operation results and the campaign config (for machine / constraint data).
 */
function computeCumulativeSafety(
  ops: OperationResult[],
  config: CampaignConfig,
  material: CampaignMaterial,
): CumulativeSafety {
  const violations: string[] = [];

  // ── Wear tracking ──────────────────────────────────────────────────────────
  let accumulatedWearPct = 0;
  let rawTotalWearPct = 0;
  let toolChanges = 0;

  for (const op of ops) {
    // Guard against zero or negative tool life
    const tl = op.tool_life_min > 0 ? op.tool_life_min : 1;
    const wearContribution = (op.cycle_time_min / tl) * 100;
    accumulatedWearPct += wearContribution;
    rawTotalWearPct += wearContribution;

    if (accumulatedWearPct > 100) {
      toolChanges += 1;
      // Reset wear after a tool change; carry the overshoot into the next tool
      accumulatedWearPct = accumulatedWearPct - 100;
    }
  }

  // total_tool_wear_pct is the raw cumulative total (may exceed 100% when tool changes occur)
  const totalToolWearPct = Math.max(rawTotalWearPct, 0);

  // ── Spindle load tracking ───────────────────────────────────────────────────
  const allPowers = ops.map((o) => o.power_kw).filter((p) => p > 0);
  const maxPowerKw = allPowers.length > 0 ? Math.max(...allPowers) : 0;

  let maxSpindleLoadPct: number;
  const machineMaxPower = config.machine?.max_power_kw;
  if (machineMaxPower && machineMaxPower > 0) {
    maxSpindleLoadPct = (maxPowerKw / machineMaxPower) * 100;
  } else {
    // No machine spec: treat max observed as 80% load (safe assumption)
    maxSpindleLoadPct = 80;
  }
  maxSpindleLoadPct = clamp(maxSpindleLoadPct, 0, 200); // Allow >100 as a violation indicator

  // ── Temperature tracking ───────────────────────────────────────────────────
  const isoGroup = (material.iso_group ?? "P").trim().toUpperCase().charAt(0);
  let maxCuttingTempC = 0;
  let thermalAccumulationC = 0;

  for (const op of ops) {
    const vc = op.cutting_speed_m_min > 0 ? op.cutting_speed_m_min : 100;
    const opTempC = estimateTemperature(isoGroup, vc);

    if (opTempC > maxCuttingTempC) {
      maxCuttingTempC = opTempC;
    }

    // Thermal contribution: temperature × normalised time (assume tool_life is baseline)
    const normTime = op.cycle_time_min > 0 ? op.cycle_time_min : 0;
    const contribution = opTempC * normTime;
    // Apply 30% carryover of accumulated heat into next operation
    thermalAccumulationC = thermalAccumulationC * 0.30 + contribution;
  }

  // ── Constraint violation checking ─────────────────────────────────────────
  const constraints = config.constraints;
  if (constraints) {
    if (
      constraints.max_tool_changes !== undefined &&
      toolChanges > constraints.max_tool_changes
    ) {
      violations.push(
        `Tool changes required (${toolChanges}) exceeds max allowed (${constraints.max_tool_changes})`,
      );
    }

    const totalCycleTime = ops.reduce((s, o) => s + o.cycle_time_min, 0);
    if (
      constraints.max_cycle_time_min !== undefined &&
      totalCycleTime > constraints.max_cycle_time_min
    ) {
      violations.push(
        `Total cycle time (${totalCycleTime.toFixed(1)} min) exceeds max (${constraints.max_cycle_time_min} min)`,
      );
    }

    const minToolLife = Math.min(...ops.map((o) => o.tool_life_min));
    if (
      constraints.target_tool_life_min !== undefined &&
      minToolLife < constraints.target_tool_life_min
    ) {
      violations.push(
        `Minimum tool life (${minToolLife.toFixed(1)} min) below target (${constraints.target_tool_life_min} min)`,
      );
    }

    if (constraints.min_surface_finish_ra !== undefined) {
      for (const op of ops) {
        if (
          op.surface_finish_ra !== undefined &&
          op.surface_finish_ra > constraints.min_surface_finish_ra
        ) {
          violations.push(
            `Op ${op.sequence} surface finish Ra=${op.surface_finish_ra.toFixed(2)} μm exceeds limit ${constraints.min_surface_finish_ra} μm`,
          );
        }
      }
    }

    if (
      machineMaxPower &&
      machineMaxPower > 0 &&
      maxPowerKw > machineMaxPower
    ) {
      violations.push(
        `Peak power (${maxPowerKw.toFixed(1)} kW) exceeds machine rating (${machineMaxPower} kW)`,
      );
    }

    const machineMaxRpm = config.machine?.max_spindle_rpm;
    if (machineMaxRpm && machineMaxRpm > 0) {
      const maxRpmUsed = Math.max(...ops.map((o) => o.spindle_rpm));
      if (maxRpmUsed > machineMaxRpm) {
        violations.push(
          `Peak spindle RPM (${Math.round(maxRpmUsed)}) exceeds machine max (${machineMaxRpm})`,
        );
      }
    }
  }

  // ── Safety score ──────────────────────────────────────────────────────────
  //   Each component is normalised to [0, 1] where 1.0 = fully safe.
  const wearComponent = 1 - clamp(totalToolWearPct / 100, 0, 1);
  const spindleComponent = 1 - clamp(maxSpindleLoadPct / 100, 0, 1);
  const thermalComponent = 1 - clamp(thermalAccumulationC / 1000, 0, 1);
  const constraintComponent =
    violations.length === 0
      ? 1.0
      : violations.length === 1
        ? 0.7
        : violations.length === 2
          ? 0.4
          : 0.0; // >2 violations → quarantine territory

  const safetyScore =
    SAFETY_WEIGHTS.wear * wearComponent +
    SAFETY_WEIGHTS.spindle * spindleComponent +
    SAFETY_WEIGHTS.thermal * thermalComponent +
    SAFETY_WEIGHTS.constraints * constraintComponent;

  return {
    total_tool_wear_pct: Math.round(totalToolWearPct * 10) / 10,
    max_spindle_load_pct: Math.round(maxSpindleLoadPct * 10) / 10,
    max_cutting_temperature_c: Math.round(maxCuttingTempC),
    thermal_accumulation_c: Math.round(thermalAccumulationC * 10) / 10,
    tool_changes_required: toolChanges,
    constraint_violations: violations,
    safety_score: Math.round(safetyScore * 1000) / 1000,
  };
}

/**
 * Map a safety score + violation count to a campaign status string.
 */
function resolveStatus(
  safetyScore: number,
  violationCount: number,
): MaterialCampaignResult["status"] {
  if (safetyScore < 0.30 || violationCount > 2) return "quarantine";
  if (safetyScore < 0.50) return "fail";
  if (safetyScore < 0.70) return "warning";
  return "pass";
}

// ============================================================
// === 1. createCampaign ===
// ============================================================

/**
 * Build a full CampaignResult from a config and pre-computed operation results.
 *
 * @param config          - Campaign configuration (materials, operations, machine, constraints)
 * @param operationResults - 2D array: one OperationResult[] per material, in config.materials order
 * @returns CampaignResult with per-material status and aggregate summary
 * @throws Error with [CampaignEngine] prefix on invalid input
 */
export function createCampaign(
  config: CampaignConfig,
  operationResults: OperationResult[][],
): CampaignResult {
  // ── Input validation ───────────────────────────────────────────────────────
  if (!config || typeof config !== "object") {
    throw new Error("[CampaignEngine] config must be a non-null object");
  }
  if (!config.name || typeof config.name !== "string" || config.name.trim() === "") {
    throw new Error("[CampaignEngine] config.name is required");
  }
  if (!Array.isArray(config.materials) || config.materials.length === 0) {
    throw new Error("[CampaignEngine] config.materials must be a non-empty array");
  }
  if (!Array.isArray(config.operations) || config.operations.length === 0) {
    throw new Error("[CampaignEngine] config.operations must be a non-empty array");
  }
  if (!Array.isArray(operationResults)) {
    throw new Error("[CampaignEngine] operationResults must be a 2D array");
  }
  if (operationResults.length !== config.materials.length) {
    throw new Error(
      `[CampaignEngine] operationResults length (${operationResults.length}) must match materials length (${config.materials.length})`,
    );
  }

  const globalWarnings: string[] = [];

  // ── Process each material ─────────────────────────────────────────────────
  const results: MaterialCampaignResult[] = config.materials.map(
    (material, idx) => {
      const rawOps = operationResults[idx];
      if (!Array.isArray(rawOps)) {
        throw new Error(
          `[CampaignEngine] operationResults[${idx}] must be an array (material "${material.id}")`,
        );
      }

      // Sort operations by sequence number
      const ops = [...rawOps].sort((a, b) => a.sequence - b.sequence);

      // Propagate op-level warnings to global list
      for (const op of ops) {
        for (const w of op.warnings ?? []) {
          globalWarnings.push(`[${material.name} op ${op.sequence}] ${w}`);
        }
        if (op.tool_life_min < 5) {
          globalWarnings.push(
            `[${material.name} op ${op.sequence}] Tool life critically low: ${op.tool_life_min.toFixed(1)} min`,
          );
        }
      }

      const cumSafety = computeCumulativeSafety(ops, config, material);
      const totalCycleTime = ops.reduce((s, o) => s + o.cycle_time_min, 0);
      const status = resolveStatus(
        cumSafety.safety_score,
        cumSafety.constraint_violations.length,
      );

      const quarantineReasons: string[] = [];
      if (status === "quarantine") {
        if (cumSafety.safety_score < 0.30) {
          quarantineReasons.push(
            `Safety score ${cumSafety.safety_score.toFixed(3)} below quarantine threshold (0.30)`,
          );
        }
        if (cumSafety.constraint_violations.length > 2) {
          quarantineReasons.push(
            `${cumSafety.constraint_violations.length} constraint violations exceed quarantine limit (2)`,
          );
        }
      }

      return {
        material,
        operations: ops,
        cumulative_safety: cumSafety,
        total_cycle_time_min: Math.round(totalCycleTime * 100) / 100,
        status,
        ...(quarantineReasons.length > 0 ? { quarantine_reasons: quarantineReasons } : {}),
      };
    },
  );

  // ── Build summary ─────────────────────────────────────────────────────────
  const totalPass = results.filter((r) => r.status === "pass").length;
  const totalWarning = results.filter((r) => r.status === "warning").length;
  const totalFail = results.filter((r) => r.status === "fail").length;
  const totalQuarantine = results.filter((r) => r.status === "quarantine").length;

  const avgCycleTime =
    results.reduce((s, r) => s + r.total_cycle_time_min, 0) / results.length;
  const avgSafetyScore =
    results.reduce((s, r) => s + r.cumulative_safety.safety_score, 0) /
    results.length;

  const quarantinedMaterials = results
    .filter((r) => r.status === "quarantine")
    .map((r) => r.material.id);

  return {
    name: config.name.trim(),
    created_at: new Date().toISOString(),
    material_count: config.materials.length,
    results,
    summary: {
      total_pass: totalPass,
      total_warning: totalWarning,
      total_fail: totalFail,
      total_quarantine: totalQuarantine,
      avg_cycle_time_min: Math.round(avgCycleTime * 100) / 100,
      avg_safety_score: Math.round(avgSafetyScore * 1000) / 1000,
      quarantined_materials: quarantinedMaterials,
    },
    warnings: globalWarnings,
  };
}

// ============================================================
// === 2. validateCampaign ===
// ============================================================

/**
 * Validate a CampaignConfig for structural correctness and physical plausibility.
 *
 * @param config - Campaign configuration to validate
 * @returns Object with valid flag, error list, and warning list
 */
export function validateCampaign(config: CampaignConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== "object") {
    return { valid: false, errors: ["[CampaignEngine] config must be an object"], warnings: [] };
  }

  // ── Name ──────────────────────────────────────────────────────────────────
  if (!config.name || typeof config.name !== "string" || config.name.trim() === "") {
    errors.push("[CampaignEngine] name is required and must be a non-empty string");
  }

  // ── Materials ─────────────────────────────────────────────────────────────
  if (!Array.isArray(config.materials) || config.materials.length === 0) {
    errors.push("[CampaignEngine] At least one material is required");
  } else {
    const seenMaterialIds = new Set<string>();
    config.materials.forEach((mat, i) => {
      if (!mat.id || typeof mat.id !== "string") {
        errors.push(`[CampaignEngine] materials[${i}].id is required`);
      } else {
        if (seenMaterialIds.has(mat.id)) {
          errors.push(`[CampaignEngine] Duplicate material id: "${mat.id}"`);
        }
        seenMaterialIds.add(mat.id);
      }
      if (!mat.name || typeof mat.name !== "string") {
        errors.push(`[CampaignEngine] materials[${i}].name is required`);
      }
      if (!mat.iso_group || typeof mat.iso_group !== "string") {
        errors.push(`[CampaignEngine] materials[${i}].iso_group is required`);
      } else {
        const grp = mat.iso_group.trim().toUpperCase().charAt(0);
        if (!["P", "M", "K", "N", "S", "H"].includes(grp)) {
          warnings.push(
            `[CampaignEngine] materials[${i}] iso_group "${mat.iso_group}" is not a recognised ISO group (P/M/K/N/S/H) — defaulting to P`,
          );
        }
      }
      if (mat.hardness_hb !== undefined) {
        if (typeof mat.hardness_hb !== "number" || mat.hardness_hb <= 0) {
          errors.push(`[CampaignEngine] materials[${i}].hardness_hb must be a positive number`);
        } else if (mat.hardness_hb > 900) {
          warnings.push(`[CampaignEngine] materials[${i}].hardness_hb=${mat.hardness_hb} HB is unusually high`);
        }
      }
    });
  }

  // ── Operations ────────────────────────────────────────────────────────────
  if (!Array.isArray(config.operations) || config.operations.length === 0) {
    errors.push("[CampaignEngine] At least one operation is required");
  } else {
    const seenSeqs = new Set<number>();
    config.operations.forEach((op, i) => {
      // Sequence
      if (typeof op.sequence !== "number" || !Number.isInteger(op.sequence) || op.sequence < 1) {
        errors.push(
          `[CampaignEngine] operations[${i}].sequence must be a positive integer`,
        );
      } else {
        if (seenSeqs.has(op.sequence)) {
          errors.push(
            `[CampaignEngine] Duplicate operation sequence number: ${op.sequence}`,
          );
        }
        seenSeqs.add(op.sequence);
      }

      // Feature
      if (!op.feature || typeof op.feature !== "string") {
        errors.push(`[CampaignEngine] operations[${i}].feature is required`);
      }

      // Tool diameter
      const { min: dMin, max: dMax } = PARAM_BOUNDS.tool_diameter_mm;
      if (typeof op.tool_diameter_mm !== "number" || op.tool_diameter_mm < dMin || op.tool_diameter_mm > dMax) {
        errors.push(
          `[CampaignEngine] operations[${i}].tool_diameter_mm must be ${dMin}-${dMax} mm (got ${op.tool_diameter_mm})`,
        );
      }

      // Optional — cutting speed
      if (op.cutting_speed_m_min !== undefined) {
        const { min: vcMin, max: vcMax } = PARAM_BOUNDS.cutting_speed_m_min;
        if (op.cutting_speed_m_min < vcMin || op.cutting_speed_m_min > vcMax) {
          errors.push(
            `[CampaignEngine] operations[${i}].cutting_speed_m_min must be ${vcMin}-${vcMax} m/min (got ${op.cutting_speed_m_min})`,
          );
        }
      }

      // Optional — feed per tooth
      if (op.feed_per_tooth_mm !== undefined) {
        const { min: fMin, max: fMax } = PARAM_BOUNDS.feed_per_tooth_mm;
        if (op.feed_per_tooth_mm < fMin || op.feed_per_tooth_mm > fMax) {
          errors.push(
            `[CampaignEngine] operations[${i}].feed_per_tooth_mm must be ${fMin}-${fMax} mm (got ${op.feed_per_tooth_mm})`,
          );
        }
      }

      // Optional — axial depth
      if (op.axial_depth_mm !== undefined) {
        const { min: apMin, max: apMax } = PARAM_BOUNDS.axial_depth_mm;
        if (op.axial_depth_mm < apMin || op.axial_depth_mm > apMax) {
          errors.push(
            `[CampaignEngine] operations[${i}].axial_depth_mm must be ${apMin}-${apMax} mm (got ${op.axial_depth_mm})`,
          );
        }
      }

      // Volume check
      if (op.volume_mm3 !== undefined && (typeof op.volume_mm3 !== "number" || op.volume_mm3 < 0)) {
        errors.push(`[CampaignEngine] operations[${i}].volume_mm3 must be a non-negative number`);
      }

      // Coolant check
      if (op.coolant !== undefined) {
        const validCoolants = ["flood", "mql", "tsc", "dry"];
        if (!validCoolants.includes(op.coolant.toLowerCase())) {
          warnings.push(
            `[CampaignEngine] operations[${i}].coolant "${op.coolant}" not in known values (flood/mql/tsc/dry)`,
          );
        }
      }
    });
  }

  // ── Machine ───────────────────────────────────────────────────────────────
  if (config.machine) {
    const { max_spindle_rpm, max_power_kw, max_torque_nm } = config.machine;
    if (max_spindle_rpm !== undefined && (max_spindle_rpm <= 0 || max_spindle_rpm > 200000)) {
      errors.push("[CampaignEngine] machine.max_spindle_rpm must be 1-200,000 RPM");
    }
    if (max_power_kw !== undefined && (max_power_kw <= 0 || max_power_kw > 1000)) {
      errors.push("[CampaignEngine] machine.max_power_kw must be 1-1,000 kW");
    }
    if (max_torque_nm !== undefined && (max_torque_nm <= 0 || max_torque_nm > 50000)) {
      errors.push("[CampaignEngine] machine.max_torque_nm must be 1-50,000 Nm");
    }
  }

  // ── Constraints ───────────────────────────────────────────────────────────
  if (config.constraints) {
    const { max_tool_changes, max_cycle_time_min, target_tool_life_min, min_surface_finish_ra } =
      config.constraints;
    if (max_tool_changes !== undefined && (max_tool_changes < 0 || !Number.isInteger(max_tool_changes))) {
      errors.push("[CampaignEngine] constraints.max_tool_changes must be a non-negative integer");
    }
    if (max_cycle_time_min !== undefined && max_cycle_time_min <= 0) {
      errors.push("[CampaignEngine] constraints.max_cycle_time_min must be positive");
    }
    if (target_tool_life_min !== undefined && target_tool_life_min <= 0) {
      errors.push("[CampaignEngine] constraints.target_tool_life_min must be positive");
    }
    if (min_surface_finish_ra !== undefined && min_surface_finish_ra <= 0) {
      errors.push("[CampaignEngine] constraints.min_surface_finish_ra must be positive");
    }
  }

  // ── Batch size ────────────────────────────────────────────────────────────
  if (config.batch_size !== undefined) {
    if (!Number.isInteger(config.batch_size) || config.batch_size < 1) {
      errors.push("[CampaignEngine] batch_size must be a positive integer");
    } else if (config.batch_size > 10000) {
      warnings.push("[CampaignEngine] batch_size > 10,000 — verify this is intentional");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// === 3. optimizeCampaign ===
// ============================================================

/**
 * Reorder and adjust campaign operations for a given optimization objective.
 *
 * @param config - Campaign configuration containing operations to optimise
 * @param target - Optimisation objective and optional per-criterion weights
 * @returns Optimised operation order and parameter adjustment recommendations
 */
export function optimizeCampaign(
  config: CampaignConfig,
  target: OptimizationTarget,
): OptimizedCampaign {
  if (!config || !Array.isArray(config.operations) || config.operations.length === 0) {
    return {
      original_order: [],
      optimized_order: [],
      operation_adjustments: [],
      estimated_improvement_pct: 0,
      warnings: ["[CampaignEngine] No operations to optimise"],
    };
  }

  const ops = [...config.operations].sort((a, b) => a.sequence - b.sequence);
  const originalOrder = ops.map((o) => o.sequence);
  const warnings: string[] = [];
  const adjustments: OptimizedCampaign["operation_adjustments"] = [];

  // ── Step 1: Reorder operations ─────────────────────────────────────────────
  let optimisedOps: CampaignOperation[];

  switch (target.objective) {
    case "productivity": {
      // Group by tool type to minimise tool changes, then heaviest cuts first
      // (heaviest = largest axial_depth × radial_depth × tool_diameter proxy)
      const toolGroups = new Map<string, CampaignOperation[]>();
      for (const op of ops) {
        const key = op.tool_type ?? `d${op.tool_diameter_mm}`;
        if (!toolGroups.has(key)) toolGroups.set(key, []);
        toolGroups.get(key)!.push(op);
      }
      // Within each tool group, sort by volume desc (heaviest first)
      optimisedOps = [];
      for (const [, group] of toolGroups) {
        group.sort((a, b) => {
          const volA =
            a.volume_mm3 ??
            (a.axial_depth_mm ?? 1) * (a.radial_depth_mm ?? a.tool_diameter_mm * 0.5) * a.tool_diameter_mm * 10;
          const volB =
            b.volume_mm3 ??
            (b.axial_depth_mm ?? 1) * (b.radial_depth_mm ?? b.tool_diameter_mm * 0.5) * b.tool_diameter_mm * 10;
          return volB - volA;
        });
        optimisedOps.push(...group);
      }
      break;
    }

    case "cost": {
      // Longest tool life first (preserve expensive tools), lightest cuts first
      // Proxy for tool life: low speed & small depth = longer life
      optimisedOps = [...ops].sort((a, b) => {
        const loadA = (a.cutting_speed_m_min ?? 100) * (a.axial_depth_mm ?? 1);
        const loadB = (b.cutting_speed_m_min ?? 100) * (b.axial_depth_mm ?? 1);
        return loadA - loadB; // ascending = lightest first
      });
      break;
    }

    case "quality": {
      // Roughing (heavy cuts) first, finishing (light cuts) last — standard sequence
      optimisedOps = [...ops].sort((a, b) => {
        const depthA = a.axial_depth_mm ?? 1;
        const depthB = b.axial_depth_mm ?? 1;
        return depthB - depthA; // descending = heavy before light
      });
      break;
    }

    case "tool_life": {
      // Sort by material difficulty proxy (speed × depth product) ascending
      // so easy operations come first while the tool is fresh and sharp
      optimisedOps = [...ops].sort((a, b) => {
        const diffA = (a.cutting_speed_m_min ?? 100) * (a.axial_depth_mm ?? 1);
        const diffB = (b.cutting_speed_m_min ?? 100) * (b.axial_depth_mm ?? 1);
        return diffA - diffB;
      });
      break;
    }

    case "balanced":
    default: {
      // Equal-weight blend: no reordering, only parameter adjustments
      optimisedOps = [...ops];
      break;
    }
  }

  const optimisedOrder = optimisedOps.map((o) => o.sequence);

  // ── Step 2: Parameter adjustments per objective ────────────────────────────
  for (const op of ops) {
    switch (target.objective) {
      case "productivity": {
        // Increase feed by 10%, accept ~5% more wear
        if (op.feed_per_tooth_mm !== undefined) {
          const original = op.feed_per_tooth_mm;
          const optimised = Math.min(original * 1.10, PARAM_BOUNDS.feed_per_tooth_mm.max);
          if (optimised !== original) {
            adjustments.push({
              sequence: op.sequence,
              field: "feed_per_tooth_mm",
              original,
              optimized: Math.round(optimised * 10000) / 10000,
              reason: "Productivity: +10% feed increases MRR (accepts ~5% additional tool wear)",
            });
          }
        }
        break;
      }

      case "cost": {
        // Reduce speed by 10% and depth by 10% to extend tool life
        if (op.cutting_speed_m_min !== undefined) {
          const original = op.cutting_speed_m_min;
          const optimised = Math.max(original * 0.90, PARAM_BOUNDS.cutting_speed_m_min.min);
          adjustments.push({
            sequence: op.sequence,
            field: "cutting_speed_m_min",
            original,
            optimized: Math.round(optimised * 10) / 10,
            reason: "Cost: -10% cutting speed significantly extends tool life (Taylor exponent effect)",
          });
        }
        if (op.axial_depth_mm !== undefined) {
          const original = op.axial_depth_mm;
          const optimised = Math.max(original * 0.90, PARAM_BOUNDS.axial_depth_mm.min);
          adjustments.push({
            sequence: op.sequence,
            field: "axial_depth_mm",
            original,
            optimized: Math.round(optimised * 1000) / 1000,
            reason: "Cost: -10% axial depth reduces cutting force and thermal load",
          });
        }
        break;
      }

      case "quality": {
        // Reduce feed by 15%, increase speed by 5% for better surface finish
        if (op.feed_per_tooth_mm !== undefined) {
          const original = op.feed_per_tooth_mm;
          const optimised = Math.max(original * 0.85, PARAM_BOUNDS.feed_per_tooth_mm.min);
          adjustments.push({
            sequence: op.sequence,
            field: "feed_per_tooth_mm",
            original,
            optimized: Math.round(optimised * 10000) / 10000,
            reason: "Quality: -15% feed improves surface finish Ra",
          });
        }
        if (op.cutting_speed_m_min !== undefined) {
          const original = op.cutting_speed_m_min;
          const optimised = Math.min(original * 1.05, PARAM_BOUNDS.cutting_speed_m_min.max);
          adjustments.push({
            sequence: op.sequence,
            field: "cutting_speed_m_min",
            original,
            optimized: Math.round(optimised * 10) / 10,
            reason: "Quality: +5% cutting speed reduces built-up edge and improves finish",
          });
        }
        break;
      }

      case "tool_life": {
        // Reduce speed by 10%, reduce depth by 10%
        if (op.cutting_speed_m_min !== undefined) {
          const original = op.cutting_speed_m_min;
          const optimised = Math.max(original * 0.90, PARAM_BOUNDS.cutting_speed_m_min.min);
          adjustments.push({
            sequence: op.sequence,
            field: "cutting_speed_m_min",
            original,
            optimized: Math.round(optimised * 10) / 10,
            reason: "Tool life: -10% cutting speed reduces thermal load on cutting edge",
          });
        }
        if (op.axial_depth_mm !== undefined) {
          const original = op.axial_depth_mm;
          const optimised = Math.max(original * 0.90, PARAM_BOUNDS.axial_depth_mm.min);
          adjustments.push({
            sequence: op.sequence,
            field: "axial_depth_mm",
            original,
            optimized: Math.round(optimised * 1000) / 1000,
            reason: "Tool life: -10% axial depth reduces chip load and edge stress",
          });
        }
        break;
      }

      case "balanced":
      default: {
        // Balanced: apply modest adjustments across all objectives
        const w = target.weights ?? {};
        const wProd = w.productivity ?? 0.25;
        const wCost = w.cost ?? 0.25;
        const wQual = w.quality ?? 0.25;
        const wTool = w.tool_life ?? 0.25;

        // Net feed adjustment: productivity pushes up (+10%), quality & tool_life push down (-15%, -10%)
        const feedMultiplier = 1 + wProd * 0.10 - wQual * 0.15 - wTool * 0.05 - wCost * 0.05;
        if (op.feed_per_tooth_mm !== undefined && Math.abs(feedMultiplier - 1) > 0.001) {
          const original = op.feed_per_tooth_mm;
          const optimised = clamp(
            original * feedMultiplier,
            PARAM_BOUNDS.feed_per_tooth_mm.min,
            PARAM_BOUNDS.feed_per_tooth_mm.max,
          );
          adjustments.push({
            sequence: op.sequence,
            field: "feed_per_tooth_mm",
            original,
            optimized: Math.round(optimised * 10000) / 10000,
            reason: `Balanced (weights prod=${wProd} cost=${wCost} qual=${wQual} tl=${wTool}): net feed factor ${feedMultiplier.toFixed(3)}`,
          });
        }

        // Net speed adjustment: quality & productivity nudge up, cost & tool_life nudge down
        const speedMultiplier = 1 + wQual * 0.05 + wProd * 0.02 - wCost * 0.05 - wTool * 0.05;
        if (op.cutting_speed_m_min !== undefined && Math.abs(speedMultiplier - 1) > 0.001) {
          const original = op.cutting_speed_m_min;
          const optimised = clamp(
            original * speedMultiplier,
            PARAM_BOUNDS.cutting_speed_m_min.min,
            PARAM_BOUNDS.cutting_speed_m_min.max,
          );
          adjustments.push({
            sequence: op.sequence,
            field: "cutting_speed_m_min",
            original,
            optimized: Math.round(optimised * 10) / 10,
            reason: `Balanced: net speed factor ${speedMultiplier.toFixed(3)}`,
          });
        }
        break;
      }
    }
  }

  // ── Step 3: Estimate improvement percentage ────────────────────────────────
  // Heuristic based on objective and number of adjustments made
  let estimatedImprovementPct = 0;
  const adjCount = adjustments.length;

  switch (target.objective) {
    case "productivity":
      estimatedImprovementPct = adjCount > 0 ? Math.min(adjCount * 5, 20) : 0;
      break;
    case "cost":
      estimatedImprovementPct = adjCount > 0 ? Math.min(adjCount * 8, 30) : 0;
      break;
    case "quality":
      estimatedImprovementPct = adjCount > 0 ? Math.min(adjCount * 6, 25) : 0;
      break;
    case "tool_life":
      estimatedImprovementPct = adjCount > 0 ? Math.min(adjCount * 10, 35) : 0;
      break;
    case "balanced":
    default:
      estimatedImprovementPct = adjCount > 0 ? Math.min(adjCount * 4, 15) : 0;
      break;
  }

  // Add a reordering bonus when the order changed
  const orderChanged = originalOrder.some((seq, i) => seq !== optimisedOrder[i]);
  if (orderChanged) {
    estimatedImprovementPct += target.objective === "productivity" ? 5 : 3;
  }

  if (adjustments.length === 0 && !orderChanged) {
    warnings.push(
      "[CampaignEngine] No adjustable parameters found; provide cutting_speed_m_min or feed_per_tooth_mm for parameter suggestions",
    );
  }

  return {
    original_order: originalOrder,
    optimized_order: optimisedOrder,
    operation_adjustments: adjustments,
    estimated_improvement_pct: Math.round(estimatedImprovementPct * 10) / 10,
    warnings,
  };
}

// ============================================================
// === 4. estimateCycleTime ===
// ============================================================

/**
 * Quick cycle time estimation without full physics calculations.
 * Uses volume / MRR heuristics. If no volume is provided, estimates
 * from axial_depth × radial_depth × tool_diameter × 10.
 *
 * @param config - Campaign configuration (only operations and machine used)
 * @returns CycleTimeEstimate with per-material and batch totals
 */
export function estimateCycleTime(config: CampaignConfig): CycleTimeEstimate {
  const warnings: string[] = [];

  if (!config || !Array.isArray(config.operations) || config.operations.length === 0) {
    return {
      materials_count: config?.materials?.length ?? 0,
      operations_per_material: 0,
      estimated_cutting_time_min: 0,
      estimated_rapid_time_min: 0,
      estimated_tool_change_time_min: 0,
      estimated_total_time_min: 0,
      time_per_material_min: 0,
      warnings: ["[CampaignEngine] No operations provided for cycle time estimation"],
    };
  }

  const materialsCount = Array.isArray(config.materials) ? config.materials.length : 1;
  const batchSize = config.batch_size && config.batch_size > 0 ? config.batch_size : 1;

  let totalCuttingTimeMin = 0;
  let toolChanges = 0;
  let prevToolType: string | undefined;

  for (const op of config.operations) {
    // Estimate volume if not provided
    let volumeMm3 = op.volume_mm3;
    if (volumeMm3 === undefined || volumeMm3 <= 0) {
      const ap = op.axial_depth_mm ?? op.tool_diameter_mm * 0.5;
      const ae = op.radial_depth_mm ?? op.tool_diameter_mm * 0.3;
      const D = op.tool_diameter_mm;
      volumeMm3 = ap * ae * D * 10; // heuristic: 10 × tool diameter equivalent length
      warnings.push(
        `[CampaignEngine] op ${op.sequence} volume estimated from depths: ${Math.round(volumeMm3)} mm³`,
      );
    }

    // Rough MRR from parameters (mm³/min)
    const vc = op.cutting_speed_m_min ?? 100;
    const fz = op.feed_per_tooth_mm ?? 0.1;
    const ap = op.axial_depth_mm ?? op.tool_diameter_mm * 0.5;
    const ae = op.radial_depth_mm ?? op.tool_diameter_mm * 0.3;
    // RPM = (Vc × 1000) / (π × D); feed rate = RPM × fz × z (assume 2 flutes)
    const rpm = (vc * 1000) / (Math.PI * op.tool_diameter_mm);
    const flutes = 2;
    const feedRateMmMin = rpm * fz * flutes;
    const mrrMm3Min = feedRateMmMin * ap * ae;

    const safetyMrr = mrrMm3Min > 0 ? mrrMm3Min : 1000; // fallback 1 cm³/min
    const cuttingTimeMin = volumeMm3 / safetyMrr;
    totalCuttingTimeMin += cuttingTimeMin;

    // Count tool changes
    const currentToolType = op.tool_type ?? `d${op.tool_diameter_mm}`;
    if (prevToolType !== undefined && prevToolType !== currentToolType) {
      toolChanges += 1;
    }
    prevToolType = currentToolType;
  }

  // Rapid time ≈ 30% of cutting time (industry typical ratio)
  const rapidTimeMin = totalCuttingTimeMin * 0.30;

  // Tool change time
  const toolChangeTimeMin = toolChanges * TOOL_CHANGE_TIME_MIN;

  // Per-material total
  const timePerMaterialMin = totalCuttingTimeMin + rapidTimeMin + toolChangeTimeMin;

  // Total for all materials in one batch pass
  const estimatedTotalMin = timePerMaterialMin * materialsCount;

  // Batch total
  const batchTimeMin = estimatedTotalMin * batchSize;

  if (totalCuttingTimeMin < 0.01) {
    warnings.push(
      "[CampaignEngine] Estimated cutting time is very short; verify volumes and parameters",
    );
  }

  return {
    materials_count: materialsCount,
    operations_per_material: config.operations.length,
    estimated_cutting_time_min: Math.round(totalCuttingTimeMin * 100) / 100,
    estimated_rapid_time_min: Math.round(rapidTimeMin * 100) / 100,
    estimated_tool_change_time_min: Math.round(toolChangeTimeMin * 100) / 100,
    estimated_total_time_min: Math.round(estimatedTotalMin * 100) / 100,
    time_per_material_min: Math.round(timePerMaterialMin * 100) / 100,
    batch_time_min: Math.round(batchTimeMin * 100) / 100,
    warnings,
  };
}

// ============================================================
// === 5. listCampaignActions ===
// ============================================================

/**
 * Return metadata describing each available campaign action.
 */
export function listCampaignActions(): Array<{
  name: string;
  description: string;
  required_params: string[];
}> {
  return [
    {
      name: "campaign_create",
      description:
        "Build a full CampaignResult from a CampaignConfig and pre-computed OperationResult[][] " +
        "(one array per material). Computes cumulative safety, status, and aggregate summary.",
      required_params: ["config", "operation_results"],
    },
    {
      name: "campaign_validate",
      description:
        "Validate a CampaignConfig for structural correctness and physical plausibility. " +
        "Checks operation sequences, parameter bounds, machine limits, and constraint values.",
      required_params: ["config"],
    },
    {
      name: "campaign_optimize",
      description:
        "Reorder operations and suggest parameter adjustments for a given objective: " +
        "productivity, cost, quality, tool_life, or balanced.",
      required_params: ["config", "target"],
    },
    {
      name: "campaign_cycle_time",
      description:
        "Quick cycle time estimate using volume / MRR heuristics — no full physics required. " +
        "Returns per-material and batch totals including rapid and tool-change allowances.",
      required_params: ["config"],
    },
  ];
}
