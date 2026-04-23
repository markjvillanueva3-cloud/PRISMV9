/**
 * PipelineArchitectureEngine — CPL-MS3 pipeline architecture extensions.
 *
 * Six capability groups bundled into one engine:
 *   1. Phase 7: Learning Feedback — record predictions, submit actuals, calibration report
 *   2. Phase 8: Output Variants — generate multi-format output from pipeline results
 *   3. Multi-Process Router — classify features by manufacturing process
 *   4. Parallel Operation Optimization — multi-channel scheduling
 *   5. IPW Voxel Grid — coarse voxel representation of in-process workpiece
 *   6. Tolerance-Driven Parameter Selection — reverse-engineer S/F from Cpk target
 *
 * Dispatcher actions: record_predictions, submit_actuals, calibration_report,
 * output_variants, route_features, optimize_parallel, init_voxel_grid,
 * subtract_cylinder, volume_remaining, detect_thin_walls, select_for_tolerance
 *
 * @module engines/PipelineArchitectureEngine
 */

// Logger removed — inline console if needed

// ============================================================================
// TYPES
// ============================================================================

/** A manufacturing feature to be routed to a sub-pipeline. */
export interface ProcessFeature {
  id: string;
  type: string;
  dimensions: Record<string, number>;
  ra_target_um?: number;
  tolerance_mm?: number;
  hardness_hrc?: number;
}

/** 3D point. */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Coarse voxel grid for in-process workpiece tracking. */
export interface VoxelGrid {
  data: boolean[][][];
  nx: number;
  ny: number;
  nz: number;
  cell_size_mm: number;
  origin: Point3D;
}

/** Stored prediction record. */
export interface PredictionRecord {
  id: string;
  timestamp: number;
  predicted: {
    force_N?: number;
    ra_um?: number;
    tool_life_min?: number;
    cpk?: number;
    cycle_time_s?: number;
  };
  actuals?: {
    force_N?: number;
    ra_um?: number;
    tool_life_min?: number;
    cpk?: number;
    cycle_time_s?: number;
  };
  errors?: Record<string, number>;
}

/** Actuals submitted for a prediction. */
export interface ActualValues {
  force_N?: number;
  ra_um?: number;
  tool_life_min?: number;
  cpk?: number;
  cycle_time_s?: number;
}

/** Operation for parallel scheduling. */
export interface SchedulableOperation {
  id: string;
  duration_s: number;
  feature_id?: string;
  dependencies?: string[];
}

/** Scheduling constraint. */
export interface ScheduleConstraint {
  /** Operation IDs that cannot overlap */
  mutually_exclusive?: string[][];
  /** Operation ID pairs: [predecessor, successor] */
  precedence?: [string, string][];
}

/** Single scheduled item on a channel. */
export interface ScheduleEntry {
  channel: number;
  start_s: number;
  end_s: number;
  operation_id: string;
}

/** Tolerance-driven source budgets. */
export interface ToleranceSource {
  name: string;
  /** Fraction of total budget (0-1), must sum to 1 */
  budget_fraction: number;
  /** E.g. machine geometric, thermal, deflection, tool_wear */
  type: "machine" | "thermal" | "deflection" | "tool_wear";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PREDICTION_LOG = 1000;

const MILLING_FEATURES = new Set([
  "pocket", "contour", "slot", "face", "hole", "open_pocket",
  "closed_pocket", "shoulder", "step", "chamfer", "fillet",
]);

const TURNING_FEATURES = new Set([
  "od_profile", "id_profile", "facing", "grooving", "threading",
  "od_roughing", "id_roughing", "boring", "parting", "knurling",
]);

const OUTPUT_FORMATS = new Set([
  "gcode", "setup_sheet", "probe_routine", "simulation_input",
  "quote", "dfm_report", "digital_twin",
]);

// ============================================================================
// ENGINE
// ============================================================================

/**
 * PipelineArchitectureEngine — six CPL-MS3 pipeline architecture extensions.
 */
export class PipelineArchitectureEngine {
  private predictionLog: PredictionRecord[] = [];
  private nextPredictionId = 1;

  // ==========================================================================
  // 1. PHASE 7: LEARNING FEEDBACK (P3-U01)
  // ==========================================================================

  /**
   * Extract predicted values from pipeline output and store them for later
   * comparison with actuals.
   *
   * @param pipelineOutput — Output from any PRISM pipeline run containing
   *   stage results with predicted force, Ra, tool life, Cpk, cycle time.
   * @returns The stored prediction record with its assigned ID.
   */
  recordPipelinePredictions(pipelineOutput: Record<string, unknown>): PredictionRecord {
    const predicted: PredictionRecord["predicted"] = {};

    // Extract predictions from various pipeline stage result shapes
    const stages = (pipelineOutput.stages ?? pipelineOutput.stage_results ?? pipelineOutput) as Record<string, unknown>;

    // Force — from speed/feed or physics stage
    const forceVal = this.extractNumeric(stages, [
      "force_N", "cutting_force_N", "Fc", "force",
      "speed_feed.force_N", "physics.force_N", "physics.Fc",
    ]);
    if (forceVal !== undefined) predicted.force_N = forceVal;

    // Surface finish Ra
    const raVal = this.extractNumeric(stages, [
      "ra_um", "Ra", "surface_roughness_um", "surface_finish.ra_um",
      "finish.Ra", "quality.ra_um",
    ]);
    if (raVal !== undefined) predicted.ra_um = raVal;

    // Tool life
    const lifeVal = this.extractNumeric(stages, [
      "tool_life_min", "tool_life", "taylor_life_min",
      "tool.life_min", "wear.tool_life_min",
    ]);
    if (lifeVal !== undefined) predicted.tool_life_min = lifeVal;

    // Cpk
    const cpkVal = this.extractNumeric(stages, [
      "cpk", "Cpk", "cpk_predicted", "capability.cpk",
      "quality.cpk", "process_capability.cpk",
    ]);
    if (cpkVal !== undefined) predicted.cpk = cpkVal;

    // Cycle time
    const ctVal = this.extractNumeric(stages, [
      "cycle_time_s", "cycle_time", "total_time_s",
      "timing.cycle_time_s", "estimate.cycle_time_s",
    ]);
    if (ctVal !== undefined) predicted.cycle_time_s = ctVal;

    const record: PredictionRecord = {
      id: `pred-${this.nextPredictionId++}`,
      timestamp: Date.now(),
      predicted,
    };

    this.predictionLog.push(record);

    // Enforce max log size
    if (this.predictionLog.length > MAX_PREDICTION_LOG) {
      this.predictionLog = this.predictionLog.slice(-MAX_PREDICTION_LOG);
    }

    // log(`[PipelineArchitecture] Recorded prediction ${record.id} with ${Object.keys(predicted).length} predicted values`);
    return record;
  }

  /**
   * Submit actual measured values for a previously recorded prediction.
   * Computes error percentages and flags recalibration if systematic bias detected.
   *
   * @param predictionId — ID returned from recordPipelinePredictions.
   * @param actuals — Measured values to compare against predictions.
   * @returns Error percentages and recalibration recommendation.
   */
  submitActuals(
    predictionId: string,
    actuals: ActualValues,
  ): {
    prediction_errors: Record<string, number>;
    recalibration_suggested: boolean;
    prediction_id: string;
  } {
    const record = this.predictionLog.find((r) => r.id === predictionId);
    if (!record) {
      return {
        prediction_id: predictionId,
        prediction_errors: {},
        recalibration_suggested: false,
      };
    }

    record.actuals = actuals;
    const errors: Record<string, number> = {};

    const keys: (keyof ActualValues)[] = ["force_N", "ra_um", "tool_life_min", "cpk", "cycle_time_s"];
    let anyLargeError = false;

    for (const key of keys) {
      const pred = record.predicted[key];
      const actual = actuals[key];
      if (pred !== undefined && actual !== undefined && pred !== 0) {
        const errorPct = ((pred - actual) / actual) * 100;
        errors[`${key}_error_pct`] = Math.round(errorPct * 100) / 100;
        if (Math.abs(errorPct) > 20) anyLargeError = true;
      }
    }

    record.errors = errors;

    // Check recent history for systematic bias
    const recentPairs = this.predictionLog
      .filter((r) => r.actuals && r.errors)
      .slice(-20);

    let recalibrationSuggested = anyLargeError;
    if (recentPairs.length >= 5) {
      // Check if majority have same-direction error > 10%
      for (const key of keys) {
        const errKey = `${key}_error_pct`;
        const vals = recentPairs
          .map((r) => r.errors?.[errKey])
          .filter((v): v is number => v !== undefined);
        if (vals.length >= 3) {
          const avgErr = vals.reduce((a, b) => a + b, 0) / vals.length;
          if (Math.abs(avgErr) > 10) recalibrationSuggested = true;
        }
      }
    }

    // log(`[PipelineArchitecture] Actuals submitted for ${predictionId}: ${Object.keys(errors).length} error metrics`);

    return {
      prediction_id: predictionId,
      prediction_errors: errors,
      recalibration_suggested: recalibrationSuggested,
    };
  }

  /**
   * Summarize prediction accuracy across all logged prediction-actual pairs.
   * Identifies systematic bias direction and recommends correction factors.
   *
   * @returns Calibration report with averages, bias direction, and correction factors.
   */
  getCalibrationReport(): {
    total_pairs: number;
    avg_force_error_pct: number;
    avg_ra_error_pct: number;
    avg_tool_life_error_pct: number;
    avg_cpk_error_pct: number;
    avg_cycle_time_error_pct: number;
    systematic_bias: Record<string, "over" | "under" | "neutral">;
    recommended_corrections: Record<string, number>;
  } {
    const pairs = this.predictionLog.filter((r) => r.actuals && r.errors);

    const biasKeys = [
      { short: "force", errKey: "force_N_error_pct" },
      { short: "ra", errKey: "ra_um_error_pct" },
      { short: "tool_life", errKey: "tool_life_min_error_pct" },
      { short: "cpk", errKey: "cpk_error_pct" },
      { short: "cycle_time", errKey: "cycle_time_s_error_pct" },
    ];

    const avgErrors: Record<string, number> = {};
    const bias: Record<string, "over" | "under" | "neutral"> = {};
    const corrections: Record<string, number> = {};

    for (const { short, errKey } of biasKeys) {
      const vals = pairs
        .map((r) => r.errors?.[errKey])
        .filter((v): v is number => v !== undefined);

      if (vals.length === 0) {
        avgErrors[`avg_${short}_error_pct`] = 0;
        bias[short] = "neutral";
        corrections[`${short}_factor`] = 1.0;
        continue;
      }

      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      avgErrors[`avg_${short}_error_pct`] = Math.round(avg * 100) / 100;

      // Positive error = predicted > actual = over-prediction
      if (avg > 5) {
        bias[short] = "over";
        // Correction: multiply predicted by factor < 1 to bring down
        corrections[`${short}_factor`] = Math.round((1 / (1 + avg / 100)) * 1000) / 1000;
      } else if (avg < -5) {
        bias[short] = "under";
        // Correction: multiply predicted by factor > 1 to bring up
        corrections[`${short}_factor`] = Math.round((1 / (1 + avg / 100)) * 1000) / 1000;
      } else {
        bias[short] = "neutral";
        corrections[`${short}_factor`] = 1.0;
      }
    }

    // log(`[PipelineArchitecture] Calibration report: ${pairs.length} pairs analyzed`);

    return {
      total_pairs: pairs.length,
      avg_force_error_pct: avgErrors["avg_force_error_pct"] ?? 0,
      avg_ra_error_pct: avgErrors["avg_ra_error_pct"] ?? 0,
      avg_tool_life_error_pct: avgErrors["avg_tool_life_error_pct"] ?? 0,
      avg_cpk_error_pct: avgErrors["avg_cpk_error_pct"] ?? 0,
      avg_cycle_time_error_pct: avgErrors["avg_cycle_time_error_pct"] ?? 0,
      systematic_bias: bias,
      recommended_corrections: corrections,
    };
  }

  // ==========================================================================
  // 2. PHASE 8: OUTPUT VARIANTS (P3-U02)
  // ==========================================================================

  /**
   * Generate multiple output format variants from the same pipeline results.
   *
   * Supported formats: gcode, setup_sheet, probe_routine, simulation_input,
   * quote, dfm_report, digital_twin.
   *
   * @param pipelineOutput — Full pipeline output containing stage results.
   * @param formats — Array of desired output format names.
   * @returns Record mapping each requested format to its structured data.
   */
  generateOutputVariants(
    pipelineOutput: Record<string, unknown>,
    formats: string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const fmt of formats) {
      if (!OUTPUT_FORMATS.has(fmt)) {
        result[fmt] = { error: `Unsupported format: ${fmt}`, supported: [...OUTPUT_FORMATS] };
        continue;
      }

      switch (fmt) {
        case "gcode":
          result[fmt] = this.buildGCodeVariant(pipelineOutput);
          break;
        case "setup_sheet":
          result[fmt] = this.buildSetupSheetVariant(pipelineOutput);
          break;
        case "probe_routine":
          result[fmt] = this.buildProbeRoutineVariant(pipelineOutput);
          break;
        case "simulation_input":
          result[fmt] = this.buildSimulationInputVariant(pipelineOutput);
          break;
        case "quote":
          result[fmt] = this.buildQuoteVariant(pipelineOutput);
          break;
        case "dfm_report":
          result[fmt] = this.buildDfmReportVariant(pipelineOutput);
          break;
        case "digital_twin":
          result[fmt] = this.buildDigitalTwinVariant(pipelineOutput);
          break;
      }
    }

    // log(`[PipelineArchitecture] Generated ${Object.keys(result).length} output variants`);
    return result;
  }

  /** @internal Extract G-code relevant data. */
  private buildGCodeVariant(po: Record<string, unknown>): Record<string, unknown> {
    return {
      format: "gcode",
      program_number: po.program_number ?? "O0001",
      operations: po.operations ?? [],
      gcode_blocks: po.gcode ?? po.gcode_blocks ?? [],
      tool_list: po.tools ?? po.tool_list ?? [],
      controller_dialect: po.controller ?? po.dialect ?? "fanuc",
      safety_header: po.safety_header ?? true,
    };
  }

  /** @internal Extract setup sheet data. */
  private buildSetupSheetVariant(po: Record<string, unknown>): Record<string, unknown> {
    return {
      format: "setup_sheet",
      part_number: po.part_number ?? "N/A",
      material: po.material ?? "unknown",
      stock_dims: po.stock ?? po.stock_dims ?? {},
      fixture: po.fixture ?? po.workholding ?? "vise",
      datum: po.datum ?? po.wcs ?? "G54",
      tool_list: po.tools ?? po.tool_list ?? [],
      operations_summary: this.extractOpsSummary(po),
      notes: po.notes ?? [],
      estimated_cycle_time_s: po.cycle_time_s ?? po.total_time_s ?? 0,
    };
  }

  /** @internal Extract probe routine data. */
  private buildProbeRoutineVariant(po: Record<string, unknown>): Record<string, unknown> {
    const features = (po.features ?? po.critical_features ?? []) as unknown[];
    return {
      format: "probe_routine",
      probe_type: "touch_trigger",
      datum_alignment: po.datum ?? "G54",
      probe_points: features.length > 0 ? features.length * 2 : 6,
      features_to_verify: features,
      tolerances: po.tolerances ?? [],
      estimated_probe_time_s: (features.length || 3) * 15,
    };
  }

  /** @internal Extract simulation input data. */
  private buildSimulationInputVariant(po: Record<string, unknown>): Record<string, unknown> {
    return {
      format: "simulation_input",
      stock_model: po.stock ?? po.stock_dims ?? { x: 100, y: 100, z: 50 },
      tool_assemblies: po.tools ?? po.tool_list ?? [],
      gcode: po.gcode ?? po.gcode_blocks ?? [],
      machine_kinematics: po.machine ?? po.kinematics ?? {},
      material_properties: po.material_props ?? { material: po.material ?? "steel" },
      cutting_parameters: po.parameters ?? po.speed_feed ?? {},
    };
  }

  /** @internal Extract quote data. */
  private buildQuoteVariant(po: Record<string, unknown>): Record<string, unknown> {
    const cycleTime = (po.cycle_time_s ?? po.total_time_s ?? 0) as number;
    const machineRate = 85; // $/hr default
    const setupTime = 0.5; // hr default
    return {
      format: "quote",
      cycle_time_s: cycleTime,
      setup_time_hr: setupTime,
      material_cost: po.material_cost ?? 0,
      tooling_cost: po.tooling_cost ?? 0,
      machine_rate_per_hr: machineRate,
      machining_cost: Math.round((cycleTime / 3600) * machineRate * 100) / 100,
      setup_cost: Math.round(setupTime * machineRate * 100) / 100,
      total_per_part: po.cost_per_part ?? Math.round(((cycleTime / 3600 + setupTime) * machineRate) * 100) / 100,
      margin_pct: 25,
    };
  }

  /** @internal Extract DFM report data. */
  private buildDfmReportVariant(po: Record<string, unknown>): Record<string, unknown> {
    const warnings: string[] = [];
    const features = (po.features ?? []) as Record<string, unknown>[];

    for (const f of features) {
      if (f.ra_target_um !== undefined && (f.ra_target_um as number) < 0.2) {
        warnings.push(`Feature ${f.id}: Ra target ${f.ra_target_um}μm may require lapping/polishing`);
      }
      if (f.tolerance_mm !== undefined && (f.tolerance_mm as number) < 0.005) {
        warnings.push(`Feature ${f.id}: tolerance ±${f.tolerance_mm}mm requires precision grinding`);
      }
    }

    return {
      format: "dfm_report",
      feature_count: features.length,
      manufacturability_score: warnings.length === 0 ? 95 : Math.max(50, 95 - warnings.length * 10),
      warnings,
      recommendations: po.recommendations ?? [],
      alternative_processes: po.alternatives ?? [],
    };
  }

  /** @internal Extract digital twin data. */
  private buildDigitalTwinVariant(po: Record<string, unknown>): Record<string, unknown> {
    return {
      format: "digital_twin",
      machine_state: po.machine ?? {},
      tool_state: po.tools ?? po.tool_list ?? [],
      workpiece_state: po.workpiece ?? po.ipw ?? {},
      cutting_parameters: po.parameters ?? po.speed_feed ?? {},
      sensor_channels: ["spindle_load", "vibration", "temperature", "acoustic_emission"],
      update_rate_hz: 100,
      physics_model: {
        force_model: "kienzle",
        thermal_model: "rosenthal",
        wear_model: "takeyama_murata",
      },
    };
  }

  /** @internal Summarize operations from pipeline output. */
  private extractOpsSummary(po: Record<string, unknown>): unknown[] {
    const ops = (po.operations ?? po.ops ?? []) as Record<string, unknown>[];
    return ops.map((op, i) => ({
      step: i + 1,
      operation: op.type ?? op.operation ?? "machining",
      tool: op.tool ?? op.tool_id ?? `T${i + 1}`,
      rpm: op.rpm ?? op.spindle_rpm ?? 0,
      feed: op.feed ?? op.feed_mmpm ?? 0,
    }));
  }

  // ==========================================================================
  // 3. MULTI-PROCESS ROUTER (P3-U03)
  // ==========================================================================

  /**
   * Route features to appropriate sub-pipelines based on feature type,
   * surface finish requirements, and material hardness.
   *
   * Classification rules:
   *   - Milling: pockets, contours, slots, faces, holes
   *   - Turning: OD/ID profiles, facing, grooving, threading (rotational symmetry)
   *   - Grinding: Ra < 0.4μm or hardness > HRC 58
   *   - EDM: internal corners < 0.5mm radius, blind slots with no tool access
   *   - Additive: complex internal channels, lattice structures
   *
   * @param features — Array of process features to classify and route.
   * @returns Routed feature groups and any unroutable features.
   */
  routeFeatures(features: ProcessFeature[]): {
    routes: { process: string; features: ProcessFeature[]; pipeline: string }[];
    unroutable: ProcessFeature[];
  } {
    const buckets: Record<string, ProcessFeature[]> = {
      milling: [],
      turning: [],
      grinding: [],
      edm: [],
      additive: [],
    };
    const unroutable: ProcessFeature[] = [];

    for (const feat of features) {
      const process = this.classifyFeature(feat);
      if (process && buckets[process]) {
        buckets[process].push(feat);
      } else {
        unroutable.push(feat);
      }
    }

    const pipelineMap: Record<string, string> = {
      milling: "MillingPipeline",
      turning: "TurningPipeline",
      grinding: "GrindingPipeline",
      edm: "EDMPipeline",
      additive: "AdditivePipeline",
    };

    const routes = Object.entries(buckets)
      .filter(([, feats]) => feats.length > 0)
      .map(([process, feats]) => ({
        process,
        features: feats,
        pipeline: pipelineMap[process] ?? "GenericPipeline",
      }));

    // log(`[PipelineArchitecture] Routed ${features.length} features: ${routes.map((r) => `${r.process}(${r.features.length})`).join(", ")}, unroutable: ${unroutable.length}`);

    return { routes, unroutable };
  }

  /**
   * @internal Classify a single feature to a manufacturing process.
   * Priority: grinding/EDM overrides (finish/hardness) → additive → turning → milling → null.
   */
  private classifyFeature(feat: ProcessFeature): string | null {
    const ftype = feat.type.toLowerCase().replace(/[_\s-]+/g, "_");

    // Grinding override: very fine finish or very hard material
    if (
      (feat.ra_target_um !== undefined && feat.ra_target_um < 0.4) ||
      (feat.hardness_hrc !== undefined && feat.hardness_hrc > 58)
    ) {
      return "grinding";
    }

    // EDM: internal corners with tiny radius, blind slots with no access
    if (
      ftype === "internal_corner" ||
      ftype === "sharp_internal_corner" ||
      ftype === "blind_keyway" ||
      ftype === "blind_slot"
    ) {
      // Check corner radius for EDM routing
      const radius = feat.dimensions?.corner_radius_mm ?? feat.dimensions?.radius_mm;
      if (radius !== undefined && radius < 0.5) return "edm";
      if (ftype === "blind_keyway" || ftype === "blind_slot") return "edm";
    }
    if (ftype === "wire_edm_profile" || ftype === "sinker_edm_cavity") return "edm";

    // Additive: internal channels, lattice, conformal cooling
    if (
      ftype === "internal_channel" ||
      ftype === "conformal_channel" ||
      ftype === "lattice" ||
      ftype === "lattice_structure" ||
      ftype === "complex_internal" ||
      ftype === "topology_optimized"
    ) {
      return "additive";
    }

    // Turning: rotational features
    if (TURNING_FEATURES.has(ftype)) return "turning";

    // Milling: standard subtractive features
    if (MILLING_FEATURES.has(ftype)) return "milling";

    // Fallback heuristics by dimension hints
    if ((feat.dimensions as any)?.is_rotational || (feat.dimensions as any)?.is_axisymmetric) {
      return "turning";
    }

    return null;
  }

  // ==========================================================================
  // 4. PARALLEL OPERATION OPTIMIZATION (P3-U04)
  // ==========================================================================

  /**
   * Schedule operations across multiple machine channels to maximize utilization.
   * Uses greedy longest-first assignment to earliest-finishing channel, with
   * constraints for same-feature exclusion and precedence ordering.
   *
   * @param operations — Operations with durations to schedule.
   * @param channels — Number of available channels (spindles/turrets).
   * @param constraints — Optional mutual exclusion and precedence constraints.
   * @returns Optimized schedule with utilization metrics.
   */
  optimizeParallelOps(
    operations: SchedulableOperation[],
    channels: number,
    constraints?: ScheduleConstraint,
  ): {
    schedule: ScheduleEntry[];
    total_time_s: number;
    utilization_pct: number;
    speedup_vs_serial: number;
  } {
    if (operations.length === 0 || channels < 1) {
      return { schedule: [], total_time_s: 0, utilization_pct: 0, speedup_vs_serial: 1 };
    }

    const ch = Math.max(1, Math.floor(channels));

    // Build precedence map
    const mustFollow = new Map<string, Set<string>>(); // opId → set of ops that must complete first
    if (constraints?.precedence) {
      for (const [pred, succ] of constraints.precedence) {
        if (!mustFollow.has(succ)) mustFollow.set(succ, new Set());
        mustFollow.get(succ)!.add(pred);
      }
    }

    // Build same-feature exclusion groups
    const featureOps = new Map<string, string[]>();
    for (const op of operations) {
      if (op.feature_id) {
        if (!featureOps.has(op.feature_id)) featureOps.set(op.feature_id, []);
        featureOps.get(op.feature_id)!.push(op.id);
      }
    }

    // Mutual exclusion from constraints + same-feature
    const mutexGroups: string[][] = [];
    if (constraints?.mutually_exclusive) {
      mutexGroups.push(...constraints.mutually_exclusive);
    }
    for (const [, ids] of featureOps) {
      if (ids.length > 1) mutexGroups.push(ids);
    }

    // Sort operations longest-first (greedy heuristic)
    const sorted = [...operations].sort((a, b) => b.duration_s - a.duration_s);

    const schedule: ScheduleEntry[] = [];
    const channelEndTimes = new Array(ch).fill(0);
    const opEndTimes = new Map<string, number>();
    const opChannels = new Map<string, number>();
    const scheduled = new Set<string>();
    const remaining = new Set(sorted.map((o) => o.id));
    const opMap = new Map(sorted.map((o) => [o.id, o]));

    // Iteratively schedule operations respecting constraints
    let iterations = 0;
    const maxIter = operations.length * operations.length + operations.length;

    while (remaining.size > 0 && iterations++ < maxIter) {
      let bestOp: SchedulableOperation | null = null;
      let bestChannel = 0;
      let bestStart = Infinity;

      for (const opId of remaining) {
        const op = opMap.get(opId)!;

        // Check precedence: all predecessors must be scheduled
        const preds = mustFollow.get(opId);
        if (preds) {
          let allDone = true;
          for (const p of preds) {
            if (!scheduled.has(p)) { allDone = false; break; }
          }
          if (!allDone) continue;
        }

        // Find earliest valid start across channels
        for (let c = 0; c < ch; c++) {
          let earliestStart = channelEndTimes[c];

          // Respect precedence end times
          if (preds) {
            for (const p of preds) {
              const pEnd = opEndTimes.get(p) ?? 0;
              if (pEnd > earliestStart) earliestStart = pEnd;
            }
          }

          // Respect mutex: can't overlap with mutex partners
          for (const group of mutexGroups) {
            if (!group.includes(opId)) continue;
            for (const partnerId of group) {
              if (partnerId === opId || !scheduled.has(partnerId)) continue;
              const partnerEnd = opEndTimes.get(partnerId) ?? 0;
              if (partnerEnd > earliestStart) earliestStart = partnerEnd;
            }
          }

          if (earliestStart < bestStart || (earliestStart === bestStart && (!bestOp || op.duration_s > bestOp.duration_s))) {
            bestStart = earliestStart;
            bestChannel = c;
            bestOp = op;
          }
        }
      }

      if (!bestOp) break; // Deadlock or done

      const endTime = bestStart + bestOp.duration_s;
      schedule.push({
        channel: bestChannel,
        start_s: Math.round(bestStart * 1000) / 1000,
        end_s: Math.round(endTime * 1000) / 1000,
        operation_id: bestOp.id,
      });

      channelEndTimes[bestChannel] = endTime;
      opEndTimes.set(bestOp.id, endTime);
      opChannels.set(bestOp.id, bestChannel);
      scheduled.add(bestOp.id);
      remaining.delete(bestOp.id);
    }

    const totalTime = Math.max(...channelEndTimes, 0);
    const serialTime = operations.reduce((s, op) => s + op.duration_s, 0);
    const utilization = totalTime > 0
      ? Math.round((serialTime / (totalTime * ch)) * 10000) / 100
      : 0;

    // log(`[PipelineArchitecture] Scheduled ${schedule.length}/${operations.length} ops on ${ch} channels, ${Math.round(totalTime)}s total, ${utilization}% utilization`);

    return {
      schedule,
      total_time_s: Math.round(totalTime * 1000) / 1000,
      utilization_pct: utilization,
      speedup_vs_serial: serialTime > 0 ? Math.round((serialTime / totalTime) * 100) / 100 : 1,
    };
  }

  // ==========================================================================
  // 5. IPW VOXEL GRID (P3-U05)
  // ==========================================================================

  /**
   * Create a 3D boolean voxel grid representing the initial stock material.
   * All voxels start as `true` (material present).
   *
   * @param stockDims — Stock dimensions { x, y, z } in mm.
   * @param resolution — Grid resolution per axis (default 32). Clamped to 4-128.
   * @returns Initialized VoxelGrid with all voxels set to true.
   */
  initializeVoxelGrid(
    stockDims: { x: number; y: number; z: number },
    resolution?: number,
  ): VoxelGrid {
    const res = Math.max(4, Math.min(128, resolution ?? 32));

    // Compute cell size from largest dimension
    const maxDim = Math.max(stockDims.x, stockDims.y, stockDims.z);
    const cellSize = maxDim / res;

    const nx = Math.max(1, Math.ceil(stockDims.x / cellSize));
    const ny = Math.max(1, Math.ceil(stockDims.y / cellSize));
    const nz = Math.max(1, Math.ceil(stockDims.z / cellSize));

    // Allocate 3D boolean array, all true
    const data: boolean[][][] = [];
    for (let i = 0; i < nx; i++) {
      data[i] = [];
      for (let j = 0; j < ny; j++) {
        data[i][j] = new Array(nz).fill(true);
      }
    }

    // log(`[PipelineArchitecture] Initialized voxel grid ${nx}×${ny}×${nz} (${nx * ny * nz} voxels), cell ${cellSize.toFixed(3)}mm`);

    return {
      data,
      nx,
      ny,
      nz,
      cell_size_mm: Math.round(cellSize * 1000) / 1000,
      origin: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Subtract a cylindrical volume from the voxel grid (tool swept volume).
   * Removes all voxels whose centers fall within the cylinder defined by
   * start/end axis and radius.
   *
   * @param grid — The VoxelGrid to modify (mutated in place).
   * @param start — Cylinder axis start point (mm).
   * @param end — Cylinder axis end point (mm).
   * @param radius — Cylinder radius (mm).
   * @returns Updated grid and count of voxels removed.
   */
  subtractCylinder(
    grid: VoxelGrid,
    start: Point3D,
    end: Point3D,
    radius: number,
  ): { grid: VoxelGrid; voxels_removed: number } {
    let removed = 0;
    const cs = grid.cell_size_mm;
    const r2 = radius * radius;

    // Cylinder axis vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const axisLen2 = dx * dx + dy * dy + dz * dz;

    if (axisLen2 === 0) {
      // Degenerate: point — treat as sphere
      return this.subtractSphere(grid, start, radius);
    }

    const axisLen = Math.sqrt(axisLen2);

    for (let i = 0; i < grid.nx; i++) {
      const cx = grid.origin.x + (i + 0.5) * cs;
      for (let j = 0; j < grid.ny; j++) {
        const cy = grid.origin.y + (j + 0.5) * cs;
        for (let k = 0; k < grid.nz; k++) {
          if (!grid.data[i][j][k]) continue;

          const cz = grid.origin.z + (k + 0.5) * cs;

          // Project voxel center onto cylinder axis
          const px = cx - start.x;
          const py = cy - start.y;
          const pz = cz - start.z;

          const t = (px * dx + py * dy + pz * dz) / axisLen2;

          // Clamp t to [0, 1] — finite cylinder
          if (t < 0 || t > 1) continue;

          // Closest point on axis
          const qx = start.x + t * dx;
          const qy = start.y + t * dy;
          const qz = start.z + t * dz;

          // Distance from voxel center to axis
          const dist2 = (cx - qx) ** 2 + (cy - qy) ** 2 + (cz - qz) ** 2;

          if (dist2 <= r2) {
            grid.data[i][j][k] = false;
            removed++;
          }
        }
      }
    }

    // log(`[PipelineArchitecture] Subtracted cylinder r=${radius}mm, removed ${removed} voxels`);
    return { grid, voxels_removed: removed };
  }

  /**
   * @internal Subtract a sphere from the voxel grid (degenerate cylinder).
   */
  private subtractSphere(
    grid: VoxelGrid,
    center: Point3D,
    radius: number,
  ): { grid: VoxelGrid; voxels_removed: number } {
    let removed = 0;
    const cs = grid.cell_size_mm;
    const r2 = radius * radius;

    for (let i = 0; i < grid.nx; i++) {
      const cx = grid.origin.x + (i + 0.5) * cs;
      for (let j = 0; j < grid.ny; j++) {
        const cy = grid.origin.y + (j + 0.5) * cs;
        for (let k = 0; k < grid.nz; k++) {
          if (!grid.data[i][j][k]) continue;
          const cz = grid.origin.z + (k + 0.5) * cs;
          const dist2 = (cx - center.x) ** 2 + (cy - center.y) ** 2 + (cz - center.z) ** 2;
          if (dist2 <= r2) {
            grid.data[i][j][k] = false;
            removed++;
          }
        }
      }
    }

    return { grid, voxels_removed: removed };
  }

  /**
   * Compute remaining material volume as a fraction of total voxels.
   *
   * @param grid — The VoxelGrid to analyze.
   * @returns Volume remaining percentage, material voxel count, and total voxels.
   */
  getVolumeRemaining(grid: VoxelGrid): {
    volume_pct: number;
    voxel_count: number;
    total_voxels: number;
  } {
    let materialCount = 0;
    const total = grid.nx * grid.ny * grid.nz;

    for (let i = 0; i < grid.nx; i++) {
      for (let j = 0; j < grid.ny; j++) {
        for (let k = 0; k < grid.nz; k++) {
          if (grid.data[i][j][k]) materialCount++;
        }
      }
    }

    return {
      volume_pct: total > 0 ? Math.round((materialCount / total) * 10000) / 100 : 0,
      voxel_count: materialCount,
      total_voxels: total,
    };
  }

  /**
   * Detect thin wall regions in the voxel grid where material thickness
   * is below a threshold (measured in adjacent voxel count).
   *
   * A voxel is flagged as "thin" if fewer than `threshold_voxels` of its
   * 6 face-adjacent neighbors contain material.
   *
   * @param grid — The VoxelGrid to analyze.
   * @param threshold_voxels — Minimum neighbor count (1-6). Voxels with fewer
   *   material neighbors are flagged. Default 2.
   * @returns Array of thin wall voxel locations in mm coordinates.
   */
  detectThinWalls(
    grid: VoxelGrid,
    threshold_voxels?: number,
  ): {
    thin_wall_locations: Point3D[];
    thin_wall_count: number;
    total_material_voxels: number;
    thin_wall_pct: number;
  } {
    const threshold = Math.max(1, Math.min(6, threshold_voxels ?? 2));
    const thinWalls: Point3D[] = [];
    let materialCount = 0;
    const cs = grid.cell_size_mm;

    // 6-connected neighbor offsets
    const neighbors: [number, number, number][] = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];

    for (let i = 0; i < grid.nx; i++) {
      for (let j = 0; j < grid.ny; j++) {
        for (let k = 0; k < grid.nz; k++) {
          if (!grid.data[i][j][k]) continue;
          materialCount++;

          let adjacentMaterial = 0;
          for (const [di, dj, dk] of neighbors) {
            const ni = i + di;
            const nj = j + dj;
            const nk = k + dk;
            if (
              ni >= 0 && ni < grid.nx &&
              nj >= 0 && nj < grid.ny &&
              nk >= 0 && nk < grid.nz &&
              grid.data[ni][nj][nk]
            ) {
              adjacentMaterial++;
            }
          }

          if (adjacentMaterial < threshold) {
            thinWalls.push({
              x: Math.round((grid.origin.x + (i + 0.5) * cs) * 1000) / 1000,
              y: Math.round((grid.origin.y + (j + 0.5) * cs) * 1000) / 1000,
              z: Math.round((grid.origin.z + (k + 0.5) * cs) * 1000) / 1000,
            });
          }
        }
      }
    }

    // log(`[PipelineArchitecture] Detected ${thinWalls.length} thin wall voxels (threshold=${threshold})`);

    return {
      thin_wall_locations: thinWalls,
      thin_wall_count: thinWalls.length,
      total_material_voxels: materialCount,
      thin_wall_pct: materialCount > 0 ? Math.round((thinWalls.length / materialCount) * 10000) / 100 : 0,
    };
  }

  // ==========================================================================
  // 6. TOLERANCE-DRIVEN PARAMETER SELECTION (P3-U06)
  // ==========================================================================

  /**
   * Reverse-engineer cutting parameters from a tolerance/Cpk requirement.
   *
   * Given target Cpk, tolerance band, and error budget allocation across sources,
   * computes the maximum feed, speed, and depth of cut that keep predicted
   * deflection within the allocated budget.
   *
   * Key formula: σ_total = tolerance / (3 × Cpk_target)
   * Deflection budget: δ_max = σ_deflection (from budget fraction)
   * Feed from deflection: F_max = δ_max × 3EI / (kc × L³)
   *
   * @param target_cpk — Desired process capability index (typically ≥ 1.33).
   * @param tolerance_mm — Total tolerance band (bilateral, e.g. ±0.01 = 0.02).
   * @param sources — Error budget allocation across sources.
   * @returns Recommended parameters with rationale and predicted Cpk.
   */
  selectParametersForTolerance(
    target_cpk: number,
    tolerance_mm: number,
    sources?: ToleranceSource[],
  ): {
    recommended_feed_mmpm: number;
    recommended_rpm: number;
    recommended_ap_mm: number;
    parameter_rationale: string[];
    cpk_predicted: number;
    sigma_total_mm: number;
    budget_breakdown: Record<string, number>;
  } {
    // Default sources if not provided
    const defaultSources: ToleranceSource[] = [
      { name: "machine_geometric", budget_fraction: 0.30, type: "machine" },
      { name: "thermal_expansion", budget_fraction: 0.20, type: "thermal" },
      { name: "tool_deflection", budget_fraction: 0.35, type: "deflection" },
      { name: "tool_wear", budget_fraction: 0.15, type: "tool_wear" },
    ];

    const activeSources = sources && sources.length > 0 ? sources : defaultSources;

    // Normalize fractions to sum to 1
    const fracSum = activeSources.reduce((s, src) => s + src.budget_fraction, 0);
    const normalized = activeSources.map((s) => ({
      ...s,
      budget_fraction: s.budget_fraction / (fracSum || 1),
    }));

    // Total allowable standard deviation
    const cpk = Math.max(0.5, target_cpk);
    const sigmaTotalMm = tolerance_mm / (3 * cpk);

    // RSS budget: σ_total² = Σ σ_i²
    // Each source gets σ_i = σ_total × √(fraction_i) ... no, under RSS:
    // σ_i² = fraction_i × σ_total², so σ_i = σ_total × √fraction_i
    const budgetBreakdown: Record<string, number> = {};
    let deflectionBudgetMm = 0;

    for (const src of normalized) {
      const sigmaI = sigmaTotalMm * Math.sqrt(src.budget_fraction);
      budgetBreakdown[src.name] = Math.round(sigmaI * 10000) / 10000;
      if (src.type === "deflection") {
        deflectionBudgetMm = sigmaI;
      }
    }

    // Solve for max feed from deflection budget
    // δ = F × L³ / (3 × E × I) — cantilever beam model
    // F = kc × ap × fz (cutting force ≈ specific cutting force × chip area)
    // Rearranging: fz_max = δ_budget × 3EI / (kc × ap × L³)

    // Default physics assumptions (carbide end mill in steel)
    const E_GPa = 600;        // Carbide Young's modulus
    const E_Pa = E_GPa * 1e9;
    const D_mm = 10;          // Default tool diameter
    const D_m = D_mm / 1000;
    const I_m4 = (Math.PI * D_m ** 4) / 64; // Second moment of area
    const L_mm = 30;          // Overhang
    const L_m = L_mm / 1000;
    const kc_MPa = 2100;      // Specific cutting force for steel
    const kc_Pa = kc_MPa * 1e6;
    const flutes = 4;

    const deltaMax_m = deflectionBudgetMm / 1000;

    // Default depth of cut — conservative for tight tolerance
    let ap_mm = Math.min(0.5, tolerance_mm * 5); // Light finishing
    const ap_m = ap_mm / 1000;

    // Solve: fz_max = δ_max × 3 × E × I / (kc × ap × L³)
    let fz_max_m = 0;
    if (kc_Pa * ap_m * L_m ** 3 > 0) {
      fz_max_m = (deltaMax_m * 3 * E_Pa * I_m4) / (kc_Pa * ap_m * L_m ** 3);
    }
    let fz_max_mm = fz_max_m * 1000;

    // Clamp to reasonable range
    fz_max_mm = Math.max(0.01, Math.min(0.3, fz_max_mm));

    // Compute recommended RPM from surface speed (conservative for finishing)
    const Vc_mpm = 120; // m/min for finishing steel with carbide
    const rpm = Math.round((Vc_mpm * 1000) / (Math.PI * D_mm));

    // Feed rate = fz × z × n
    const feedMmpm = Math.round(fz_max_mm * flutes * rpm * 10) / 10;

    // Verify predicted Cpk
    // Predicted σ from the chosen parameters
    const actualDeflection_m = (kc_Pa * ap_m * (fz_max_mm / 1000) * L_m ** 3) / (3 * E_Pa * I_m4);
    const actualDeflection_mm = actualDeflection_m * 1000;

    // Reconstruct σ_total (other sources unchanged + actual deflection)
    let sigma2_others = 0;
    for (const src of normalized) {
      if (src.type !== "deflection") {
        sigma2_others += (sigmaTotalMm * Math.sqrt(src.budget_fraction)) ** 2;
      }
    }
    const predictedSigmaTotal = Math.sqrt(sigma2_others + actualDeflection_mm ** 2);
    const predictedCpk = predictedSigmaTotal > 0
      ? Math.round((tolerance_mm / (3 * predictedSigmaTotal)) * 100) / 100
      : target_cpk;

    const rationale: string[] = [
      `Target Cpk=${cpk} with tolerance=${tolerance_mm}mm → σ_total=${(sigmaTotalMm * 1000).toFixed(1)}μm`,
      `Deflection budget: ${(deflectionBudgetMm * 1000).toFixed(1)}μm (${Math.round(normalized.find((s) => s.type === "deflection")?.budget_fraction ?? 0.35) * 100}% of total)`,
      `Max fz=${fz_max_mm.toFixed(3)}mm at L/D=${(L_mm / D_mm).toFixed(1)} overhang ratio`,
      `Conservative ap=${ap_mm.toFixed(2)}mm for finishing pass`,
      `Predicted deflection: ${(actualDeflection_mm * 1000).toFixed(1)}μm`,
      `Predicted Cpk: ${predictedCpk} (target: ${cpk})`,
    ];

    // log(`[PipelineArchitecture] Tolerance-driven selection: feed=${feedMmpm}mm/min, rpm=${rpm}, ap=${ap_mm}mm, Cpk=${predictedCpk}`);

    return {
      recommended_feed_mmpm: feedMmpm,
      recommended_rpm: rpm,
      recommended_ap_mm: Math.round(ap_mm * 1000) / 1000,
      parameter_rationale: rationale,
      cpk_predicted: predictedCpk,
      sigma_total_mm: Math.round(sigmaTotalMm * 10000) / 10000,
      budget_breakdown: budgetBreakdown,
    };
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * @internal Extract a numeric value from nested objects by trying multiple paths.
   */
  private extractNumeric(obj: Record<string, unknown>, paths: string[]): number | undefined {
    for (const path of paths) {
      const parts = path.split(".");
      let current: unknown = obj;
      for (const part of parts) {
        if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          current = undefined;
          break;
        }
      }
      if (typeof current === "number" && isFinite(current)) return current;
    }
    return undefined;
  }

  /**
   * Reset the prediction log (useful for testing).
   */
  resetPredictionLog(): void {
    this.predictionLog = [];
    this.nextPredictionId = 1;
  }

  /**
   * Get the current prediction log size.
   */
  getPredictionLogSize(): number {
    return this.predictionLog.length;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pipelineArchitectureEngine = new PipelineArchitectureEngine();
export default PipelineArchitectureEngine;
