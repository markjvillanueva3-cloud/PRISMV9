/**
 * LatheOrchestrationEngine — 35-Stage CNC Turning Program Generation Pipeline
 *
 * Central orchestrator that sequences ALL aspects of lathe program generation
 * with safety gates that physically prevent dangerous programs. Every stage
 * has input/output contract and traceability.
 *
 * Pipeline stages (35):
 *   ─── INPUT & ASSESSMENT ───
 *   1.  INPUT_VALIDATE       — schema + bounds check
 *   2.  MATERIAL_ASSESS      — resolve ISO group, Kienzle kc1.1/mc, Taylor C/n
 *   3.  MACHINE_SELECT       — match to machine registry (spindle, turret, travels)
 *   4.  TOOL_SELECT          — per-feature tool selection via SmartToolSelector
 *
 *   ─── WORKHOLDING & GD&T ───
 *   5.  WORKHOLDING_PLAN     — chuck/collet/faceplate selection + jaw pressure
 *   6.  GDT_INTERPRET        — tolerance stack analysis from blueprint
 *   7.  OPERATION_SEQUENCE   — intelligent op ordering (rough→finish, OD→ID→thread→part)
 *
 *   ─── PHYSICS ───
 *   8.  CHIP_CONTROL         — chip breaker selection + chip load verification
 *   9.  PHYSICS_CORE         — Kienzle force, Taylor tool life, power, Ra prediction
 *   10. PARAMETER_OPTIMIZE   — speed/feed optimization for target (speed/life/cost/quality)
 *   11. COST_OPTIMIZE        — tool cost per part, cycle time minimization
 *
 *   ─── SAFETY GATES (cannot be bypassed) ───
 *   12. BAR_STOCK_SAFETY     — whip speed, RPM hard-block, bar feeder requirement
 *   13. CLAMPING_PER_OP      — per-op force direction, boring pull-out, cutoff safety
 *   14. MACHINE_READINESS    — spindle warm-up, turret clearance, coolant check
 *
 *   ─── G-CODE GENERATION ───
 *   15. TOOLPATH_GENERATE    — entry/exit strategy, canned cycles vs point-to-point
 *   16. GCODE_GENERATE       — G71/G70/G76/G92 code generation
 *   17. TNRC_RESOLVE         — tool nose radius compensation (G41/G42)
 *   18. CSS_OPTIMIZE         — constant surface speed (G96) with clamp (G50)
 *   19. TURRET_OPTIMIZE      — minimize index count, home position strategy
 *   20. CONTROLLER_DIALECT   — Fanuc/Haas/Mazak/Okuma/Siemens post-process
 *
 *   ─── EMERGENCY & SAFETY ───
 *   21. EMERGENCY_RECOVERY   — tool breakage response, spindle overload, e-stop
 *   22. SAFETY_VERIFY        — full program safety scan (rapid clearances, G28/G30)
 *   23. COLLISION_CHECK      — turret body, tailstock, chuck jaw interference
 *
 *   ─── VERIFICATION ───
 *   24. CYCLE_TIME           — per-operation breakdown
 *   25. MATERIAL_REMOVAL_SIM — volumetric MRR verification
 *   26. SETUP_SHEET          — printable operator document
 *   27. PROVE_OUT            — first-article conservative program (via ProveOutModeEngine)
 *   28. INSPECTION_PLAN      — in-process gauging + CMM plan
 *   29. CONFIDENCE_SCORE     — per-category 0-100% with explanations
 *
 *   ─── OUTPUT ───
 *   30. PHYSICS_REPORT       — full physics traceability document
 *   31. COST_REPORT          — tool cost, cycle time, per-part cost
 *   32. FAI_PLAN             — first article inspection plan (AS9102)
 *   33. PROGRAM_PACKAGE      — .nc file + setup sheet + report bundle
 *   34. BACKPLOT_DATA        — XZ path data for visualization
 *   35. RELEASE_GATE         — final go/no-go with all checks aggregated
 *
 * Physics references:
 *   - Kienzle (1952): Fc = kc1.1 × b × h^(1-mc)
 *   - Taylor (1907): V × T^n = C
 *   - Ra = f² / (32r) (turning surface finish)
 *   - P = Fc × Vc / 60000 (cutting power kW)
 *   - Bar whip: fn = (λ²/2πL²) × √(EI/ρA) — Rao (2007)
 *   - OSHA 1910.217, ISO 10218: clamping safety factor ≥ 2.5×
 *
 * @module engines/LatheOrchestrationEngine
 */

import { log } from "../utils/Logger.js";
import { BarStockVibrationEngine, type BarStockProps, type VibrationAnalysis } from "./BarStockVibrationEngine.js";
import type {
  TurningInput,
  TurningFeature,
  TurningMaterial,
  TurningProgramResult,
  TurningPlannedOp,
  TurningOpType,
  TurningFeatureType,
} from "./TurningPrintToProgramEngine.js";
import { turningPrintToProgramEngine } from "./TurningPrintToProgramEngine.js";

// ============================================================================
// STAGE ENUM — 35 stages in execution order
// ============================================================================

export const LATHE_STAGES = [
  "INPUT_VALIDATE",
  "MATERIAL_ASSESS",
  "MACHINE_SELECT",
  "TOOL_SELECT",
  "WORKHOLDING_PLAN",
  "GDT_INTERPRET",
  "OPERATION_SEQUENCE",
  "CHIP_CONTROL",
  "PHYSICS_CORE",
  "PARAMETER_OPTIMIZE",
  "COST_OPTIMIZE",
  "BAR_STOCK_SAFETY",
  "CLAMPING_PER_OP",
  "MACHINE_READINESS",
  "TOOLPATH_GENERATE",
  "GCODE_GENERATE",
  "TNRC_RESOLVE",
  "CSS_OPTIMIZE",
  "TURRET_OPTIMIZE",
  "CONTROLLER_DIALECT",
  "EMERGENCY_RECOVERY",
  "SAFETY_VERIFY",
  "COLLISION_CHECK",
  "CYCLE_TIME",
  "MATERIAL_REMOVAL_SIM",
  "SETUP_SHEET",
  "PROVE_OUT",
  "INSPECTION_PLAN",
  "CONFIDENCE_SCORE",
  "PHYSICS_REPORT",
  "COST_REPORT",
  "FAI_PLAN",
  "PROGRAM_PACKAGE",
  "BACKPLOT_DATA",
  "RELEASE_GATE",
] as const;

export type LatheStage = typeof LATHE_STAGES[number];

// ============================================================================
// TYPES
// ============================================================================

/** Orchestration input — extends TurningInput with orchestrator-specific fields */
export interface LatheOrchestrationInput extends TurningInput {
  /** Is this bar stock (fed through spindle) or chucked work (pre-cut billet)? */
  workpiece_type?: "bar_stock" | "chucked" | "casting" | "forging";
  /** Bar feeder installed? Required for bar stock work */
  bar_feeder?: boolean;
  /** Bar extension behind spindle (mm) — affects whip calculation */
  bar_extension_behind_spindle_mm?: number;
  /** Part catcher / sub-spindle for cutoff support */
  part_catcher?: boolean;
  /** Enable prove-out mode for first article */
  prove_out?: boolean;
  /** Skip non-safety stages (for fast validation) */
  safety_only?: boolean;
  /** Specific stages to run (default: all) */
  stages_to_run?: LatheStage[];
}

/** Per-stage execution record */
export interface StageRecord {
  stage: LatheStage;
  status: "completed" | "skipped" | "failed";
  duration_ms: number;
  reason?: string;     // skip/fail reason
  warnings: string[];
  /** Key output data for traceability */
  output_summary?: string;
}

/** Force direction analysis for a single operation */
export interface OperationForceAnalysis {
  op_number: number;
  operation_type: TurningOpType;
  feature_id: string;
  /** Primary force direction relative to chuck */
  force_direction: "into_chuck" | "away_from_chuck" | "radial" | "axial_pull" | "mixed";
  /** Force magnitude (N) — from Kienzle */
  estimated_force_N: number;
  /** Clamping adequacy: force × safety_factor < grip force */
  clamping_adequate: boolean;
  /** Safety factor achieved (grip_force / cutting_force) */
  safety_factor: number;
  /** Hazard flags */
  hazards: string[];
  /** Is this operation blocked by safety? */
  blocked: boolean;
  /** Block reason */
  block_reason?: string;
}

/** Bar stock safety analysis result */
export interface BarStockSafetyResult {
  is_bar_stock: boolean;
  /** Vibration analysis from BarStockVibrationEngine */
  vibration?: VibrationAnalysis;
  /** Maximum allowed RPM (hard limit from whip analysis) */
  max_rpm_limit?: number;
  /** Operations with RPM above limit */
  rpm_violations: Array<{ op_number: number; requested_rpm: number; limit: number }>;
  /** Is bar feeder required but missing? */
  bar_feeder_required: boolean;
  bar_feeder_present: boolean;
  /** Bar extension safety */
  extension_safe: boolean;
  extension_warning?: string;
  /** Overall: does this pass safety? */
  passed: boolean;
  /** Block reasons (if not passed) */
  block_reasons: string[];
}

/** Full orchestration result with stage traceability */
export interface LatheOrchestrationResult {
  success: boolean;
  /** Stage execution trace — ordered list of all stages */
  stage_trace: StageRecord[];
  /** Aggregated stage stats */
  stages_completed: string[];
  stages_skipped: Array<{ stage: string; reason: string }>;
  stages_failed: Array<{ stage: string; error: string }>;
  /** Total pipeline time (ms) */
  pipeline_duration_ms: number;

  // ── Primary output (compatible with TurningProgramResult) ──
  part_number: string;
  material: string;
  bar_stock_od_mm: number;
  part_length_mm: number;
  operations: TurningPlannedOp[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  setup_notes: string[];
  confidence_score: number;

  // ── Safety gate results ──
  bar_stock_safety?: BarStockSafetyResult;
  clamping_analysis?: OperationForceAnalysis[];
  collision_checks?: Array<{
    check_type: string;
    passed: boolean;
    clearance_mm: number;
    description: string;
    severity: "info" | "warning" | "critical";
  }>;

  /** Overall safety verdict */
  safety_passed: boolean;
  safety_blocks: string[];

  /** Prove-out program text (if requested) */
  prove_out_program?: string;

  /** Physics report text */
  physics_report?: string;
  /** Setup sheet text */
  setup_sheet_text?: string;
  /** Cost-drivers report text (U-LW-SPINE-REPORTS): cycle time + tool-change breakdown. */
  cost_report?: string;
  /** Backplot data for visualization */
  backplot?: Array<{ x: number; z: number; type: "rapid" | "cut" | "arc" }>;

  /** Release gate verdict */
  release_gate: {
    passed: boolean;
    checks: Array<{ name: string; passed: boolean; detail: string }>;
  };

  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Clamping safety factor per ISO 10218 / OSHA 1910.217 */
const CLAMPING_SAFETY_FACTOR = 2.5;

/** Maximum RPM for unsupported cutoff (no catcher/sub-spindle) */
const MAX_CUTOFF_RPM_NO_CATCHER = 800;

/** L/D threshold for bar stock feeder requirement */
const BAR_FEEDER_REQUIRED_LD = 4.0;

/** Maximum safe bar extension behind spindle (mm) */
const MAX_BAR_EXTENSION_MM = 300;

/** Default chuck grip force (N) — 3-jaw hydraulic at 20 bar */
const DEFAULT_GRIP_FORCE_N = 25000;

/** U-LW-LIVETOOL-FAILLOUD: live-tooling / C-axis feature types the TURNING spine does NOT natively
 *  program. inferOperations has no case for them, so they fall to the od_rough default; stageClampingPerOp
 *  surfaces a LOUD warning so this is never silent (they require live-tool / mill-turn programming). */
const LIVE_TOOLING_FEATURE_TYPES: ReadonlySet<string> = new Set([
  "whistle_notch", "od_pocket_mill", "cross_drill", "cross_tap", "keyway", "flat_mill", "hex_mill",
]);

// ============================================================================
// ENGINE
// ============================================================================

export class LatheOrchestrationEngine {
  private barVibrationEngine = new BarStockVibrationEngine();

  /**
   * Execute the 35-stage lathe program generation pipeline.
   *
   * Safety gates (stages 12-14) CANNOT be bypassed — they will always run
   * even if `stages_to_run` tries to skip them.
   */
  calculate(
    _action: string,
    input: LatheOrchestrationInput,
  ): LatheOrchestrationResult {
    const pipelineStart = Date.now();
    const stageTrace: StageRecord[] = [];
    const warnings: LatheOrchestrationResult["warnings"] = [];
    const safetyBlocks: string[] = [];

    // Determine which stages to run
    const stagesToRun = new Set<LatheStage>(
      input.stages_to_run ?? [...LATHE_STAGES],
    );
    // Safety stages are MANDATORY — cannot be skipped
    const SAFETY_STAGES: LatheStage[] = [
      "BAR_STOCK_SAFETY",
      "CLAMPING_PER_OP",
      "MACHINE_READINESS",
      "SAFETY_VERIFY",
      "COLLISION_CHECK",
      "RELEASE_GATE",
    ];
    for (const s of SAFETY_STAGES) stagesToRun.add(s);

    // If safety_only, run only safety + input stages
    if (input.safety_only) {
      const safetySet = new Set<LatheStage>([
        "INPUT_VALIDATE",
        "MATERIAL_ASSESS",
        "MACHINE_SELECT",
        ...SAFETY_STAGES,
      ]);
      for (const s of LATHE_STAGES) {
        if (!safetySet.has(s)) stagesToRun.delete(s);
      }
    }

    log.info(`[LatheOrchestrator] Starting ${stagesToRun.size}/35 stages`);

    // Pipeline state — accumulates as stages execute
    const state: PipelineState = {
      input,
      operations: [],
      program_lines: [],
      setup_notes: [],
      confidence_components: [],
      bar_stock_safety: undefined,
      clamping_analysis: [],
      backplot_points: [],
    };

    // ── Execute stages sequentially ──
    for (const stage of LATHE_STAGES) {
      if (!stagesToRun.has(stage)) {
        stageTrace.push({
          stage,
          status: "skipped",
          duration_ms: 0,
          reason: input.safety_only ? "safety_only mode" : "not in stages_to_run",
          warnings: [],
        });
        continue;
      }

      const stageStart = Date.now();
      const stageWarnings: string[] = [];

      try {
        this.executeStage(stage, state, stageWarnings);
        stageTrace.push({
          stage,
          status: "completed",
          duration_ms: Date.now() - stageStart,
          warnings: stageWarnings,
          output_summary: this.summarizeStage(stage, state),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        stageTrace.push({
          stage,
          status: "failed",
          duration_ms: Date.now() - stageStart,
          reason: msg,
          warnings: stageWarnings,
        });

        // Safety stage failure = hard block
        if (SAFETY_STAGES.includes(stage)) {
          safetyBlocks.push(`${stage}: ${msg}`);
        }
      }

      // Propagate stage warnings
      for (const w of stageWarnings) {
        warnings.push({ stage, severity: "warning", message: w });
      }
    }

    // ── Aggregate safety results ──
    const barSafety = state.bar_stock_safety;
    if (barSafety && !barSafety.passed) {
      for (const reason of barSafety.block_reasons) {
        safetyBlocks.push(`BAR_STOCK_SAFETY: ${reason}`);
      }
    }
    const clampingBlocked = (state.clamping_analysis ?? []).filter(a => a.blocked);
    for (const c of clampingBlocked) {
      safetyBlocks.push(`CLAMPING_PER_OP: Op ${c.op_number} (${c.operation_type}) — ${c.block_reason}`);
    }

    // U-LW-AIHEAD-SPINE: a runPipeline fail-close in GCODE_GENERATE is a hard emission block
    // (the verified pipeline is the program-emission authority) -- surface it so success +
    // program_text reflect the block instead of silently emitting nothing.
    if (state.program_gen_block) {
      safetyBlocks.push(`GCODE_GENERATE: ${state.program_gen_block}`);
    }

    const safetyPassed = safetyBlocks.length === 0;
    const programText = safetyPassed
      ? state.program_lines.join("\n") || "(program generation pending — orchestrator shell)"
      : `(SAFETY BLOCK — program generation prevented)\n(${safetyBlocks.join("\\n")})`;

    // ── Build result ──
    // U-LW-SPINE-RESULT-SURFACE: prefer the verified pipeline's real metadata over the stub stages'.
    const pr = state.pipeline_result;
    const result: LatheOrchestrationResult = {
      success: safetyPassed && stageTrace.filter(s => s.status === "failed").length === 0,
      stage_trace: stageTrace,
      stages_completed: stageTrace.filter(s => s.status === "completed").map(s => s.stage),
      stages_skipped: stageTrace
        .filter(s => s.status === "skipped")
        .map(s => ({ stage: s.stage, reason: s.reason ?? "unknown" })),
      stages_failed: stageTrace
        .filter(s => s.status === "failed")
        .map(s => ({ stage: s.stage, error: s.reason ?? "unknown" })),
      pipeline_duration_ms: Date.now() - pipelineStart,

      part_number: input.part_number ?? "LATHE-ORCH",
      material: input.material?.material_name ?? "unknown",
      bar_stock_od_mm: input.bar_stock_od_mm ?? 0,
      part_length_mm: input.part_length_mm ?? 0,
      operations: pr?.operations ?? state.operations,
      total_operations: pr?.total_operations ?? state.operations.length,
      total_tool_changes: pr?.total_tool_changes ?? new Set(state.operations.map(op => op.tool?.tool_number)).size,
      estimated_cycle_time_sec: pr?.estimated_cycle_time_sec ?? state.operations.reduce((sum, op) => sum + (op.cycle_time_sec ?? 0), 0),
      program_text: programText,
      program_line_count: state.program_lines.length,
      setup_notes: state.setup_notes,
      confidence_score: this.aggregateConfidence(state.confidence_components),

      bar_stock_safety: state.bar_stock_safety,
      clamping_analysis: state.clamping_analysis,
      collision_checks: pr?.collision_checks ?? [],

      safety_passed: safetyPassed,
      safety_blocks: safetyBlocks,

      backplot: state.backplot_points,

      physics_report: state.physics_report,
      setup_sheet_text: state.setup_sheet,
      cost_report: state.cost_report,

      release_gate: {
        passed: safetyPassed,
        checks: [
          { name: "safety_gates", passed: safetyPassed, detail: safetyPassed ? "All safety gates passed" : `${safetyBlocks.length} blocks` },
          { name: "stages_completed", passed: true, detail: `${stageTrace.filter(s => s.status === "completed").length}/${LATHE_STAGES.length}` },
        ],
      },

      warnings,
    };

    log.info(
      `[LatheOrchestrator] Complete: ${result.stages_completed.length}/${LATHE_STAGES.length} stages, ` +
      `safety=${safetyPassed ? "PASS" : "BLOCKED"}, ${warnings.length} warnings, ${result.pipeline_duration_ms}ms`,
    );

    return result;
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGE DISPATCHER
  // ════════════════════════════════════════════════════════════════════

  private executeStage(stage: LatheStage, state: PipelineState, warnings: string[]): void {
    switch (stage) {
      case "INPUT_VALIDATE":       return this.stageInputValidate(state, warnings);
      case "MATERIAL_ASSESS":      return this.stageMaterialAssess(state, warnings);
      case "MACHINE_SELECT":       return this.stageMachineSelect(state, warnings);
      case "TOOL_SELECT":          return this.stageToolSelect(state, warnings);
      case "WORKHOLDING_PLAN":     return this.stageWorkholdingPlan(state, warnings);
      case "GDT_INTERPRET":        return this.stageGdtInterpret(state, warnings);
      case "OPERATION_SEQUENCE":   return this.stageOperationSequence(state, warnings);
      case "CHIP_CONTROL":         return this.stageChipControl(state, warnings);
      case "PHYSICS_CORE":         return this.stagePhysicsCore(state, warnings);
      case "PARAMETER_OPTIMIZE":   return this.stageParameterOptimize(state, warnings);
      case "COST_OPTIMIZE":        return this.stageCostOptimize(state, warnings);
      case "BAR_STOCK_SAFETY":     return this.stageBarStockSafety(state, warnings);
      case "CLAMPING_PER_OP":      return this.stageClampingPerOp(state, warnings);
      case "MACHINE_READINESS":    return this.stageMachineReadiness(state, warnings);
      case "TOOLPATH_GENERATE":    return this.stageToolpathGenerate(state, warnings);
      case "GCODE_GENERATE":       return this.stageGcodeGenerate(state, warnings);
      case "TNRC_RESOLVE":         return this.stageTnrcResolve(state, warnings);
      case "CSS_OPTIMIZE":         return this.stageCssOptimize(state, warnings);
      case "TURRET_OPTIMIZE":      return this.stageTurretOptimize(state, warnings);
      case "CONTROLLER_DIALECT":   return this.stageControllerDialect(state, warnings);
      case "EMERGENCY_RECOVERY":   return this.stageEmergencyRecovery(state, warnings);
      case "SAFETY_VERIFY":        return this.stageSafetyVerify(state, warnings);
      case "COLLISION_CHECK":      return this.stageCollisionCheck(state, warnings);
      case "CYCLE_TIME":           return this.stageCycleTime(state, warnings);
      case "MATERIAL_REMOVAL_SIM": return this.stageMaterialRemovalSim(state, warnings);
      case "SETUP_SHEET":          return this.stageSetupSheet(state, warnings);
      case "PROVE_OUT":            return this.stageProveOut(state, warnings);
      case "INSPECTION_PLAN":      return this.stageInspectionPlan(state, warnings);
      case "CONFIDENCE_SCORE":     return this.stageConfidenceScore(state, warnings);
      case "PHYSICS_REPORT":       return this.stagePhysicsReport(state, warnings);
      case "COST_REPORT":          return this.stageCostReport(state, warnings);
      case "FAI_PLAN":             return this.stageFaiPlan(state, warnings);
      case "PROGRAM_PACKAGE":      return this.stageProgramPackage(state, warnings);
      case "BACKPLOT_DATA":        return this.stageBackplotData(state, warnings);
      case "RELEASE_GATE":         return this.stageReleaseGate(state, warnings);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGE IMPLEMENTATIONS
  // ════════════════════════════════════════════════════════════════════

  // ── Stage 1: INPUT_VALIDATE ──────────────────────────────────────

  private stageInputValidate(state: PipelineState, warnings: string[]): void {
    const { input } = state;
    if (!input.features || input.features.length === 0) {
      throw new Error("No features provided — at least one feature required");
    }
    if (input.bar_stock_od_mm <= 0) {
      throw new Error("bar_stock_od_mm must be positive");
    }
    if (input.part_length_mm <= 0) {
      throw new Error("part_length_mm must be positive");
    }
    if (!input.material) {
      throw new Error("material is required");
    }
    // Check finished OD doesn't exceed bar stock
    const maxFeatureOD = Math.max(
      ...input.features.map(f => f.od_mm ?? f.diameter_mm ?? 0),
      input.finished_od_mm ?? 0,
    );
    if (maxFeatureOD > input.bar_stock_od_mm) {
      throw new Error(
        `Finished OD ${maxFeatureOD}mm exceeds bar stock OD ${input.bar_stock_od_mm}mm`,
      );
    }
    if (input.part_length_mm > input.bar_stock_od_mm * 20) {
      warnings.push(
        `Part L/D ratio = ${(input.part_length_mm / input.bar_stock_od_mm).toFixed(1)} — ` +
        "extremely slender, will require tailstock or steady rest",
      );
    }
  }

  // ── Stage 2: MATERIAL_ASSESS ─────────────────────────────────────

  private stageMaterialAssess(state: PipelineState, warnings: string[]): void {
    const mat = state.input.material;
    if (!mat?.iso_group) {
      warnings.push("No ISO group specified — defaulting to P (steel)");
    }
    state.setup_notes.push(`Material: ${mat?.material_name ?? "unknown"} (ISO ${mat?.iso_group ?? "P"})`);
  }

  // ── Stage 3: MACHINE_SELECT ──────────────────────────────────────

  private stageMachineSelect(state: PipelineState, warnings: string[]): void {
    const { input } = state;
    const swing = input.bar_stock_od_mm * 2 + 50; // rough swing-over-bed estimate
    state.setup_notes.push(
      `Machine: ${input.machine_brand ?? "Generic"} ${input.machine_model ?? "CNC Lathe"}`,
    );
    if (swing > 400) {
      warnings.push(`Swing requirement ~${swing.toFixed(0)}mm — verify machine capacity`);
    }
  }

  // ── Stage 4: TOOL_SELECT ─────────────────────────────────────────

  private stageToolSelect(state: PipelineState, _warnings: string[]): void {
    // Stub — will be wired to SmartToolSelectorEngine in later session
    state.setup_notes.push(`Tools: ${state.input.features.length} features to tool`);
  }

  // ── Stage 5: WORKHOLDING_PLAN ────────────────────────────────────

  private stageWorkholdingPlan(state: PipelineState, _warnings: string[]): void {
    const chuck = state.input.chuck_type ?? "3_jaw";
    state.setup_notes.push(`Workholding: ${chuck.replace("_", "-")} chuck`);
  }

  // ── Stage 6: GDT_INTERPRET ───────────────────────────────────────

  private stageGdtInterpret(state: PipelineState, _warnings: string[]): void {
    // Stub — will wire to GDTInterpreterEngine
    const tightestTol = Math.min(
      ...state.input.features.map(f => f.tolerance_mm ?? 0.05),
    );
    if (tightestTol < 0.01) {
      state.setup_notes.push(`Tight tolerance: ${tightestTol}mm — multiple finish passes required`);
    }
  }

  // ── Stage 7: OPERATION_SEQUENCE ──────────────────────────────────

  private stageOperationSequence(state: PipelineState, _warnings: string[]): void {
    // Stub — will wire to IntelligentSequencingEngine
    state.setup_notes.push(`Operations: ${state.input.features.length} features sequenced`);
  }

  // ── Stage 8: CHIP_CONTROL ────────────────────────────────────────

  private stageChipControl(state: PipelineState, _warnings: string[]): void {
    // Stub — chip breaker selection based on material + DOC
  }

  // ── Stage 9: PHYSICS_CORE ────────────────────────────────────────

  private stagePhysicsCore(state: PipelineState, _warnings: string[]): void {
    // Stub — will wire to full Kienzle/Taylor calculations
    state.confidence_components.push({ name: "physics", score: 50, reason: "stub" });
  }

  // ── Stage 10: PARAMETER_OPTIMIZE ─────────────────────────────────

  private stageParameterOptimize(state: PipelineState, _warnings: string[]): void {
    // Stub — speed/feed optimization
  }

  // ── Stage 11: COST_OPTIMIZE ──────────────────────────────────────

  private stageCostOptimize(state: PipelineState, _warnings: string[]): void {
    // Stub — tool cost per part analysis
  }

  // ── Stage 12: BAR_STOCK_SAFETY (SAFETY GATE — wired) ─────────────

  private stageBarStockSafety(state: PipelineState, warnings: string[]): void {
    const { input } = state;
    const isBarStock = input.workpiece_type === "bar_stock" ||
      (!input.workpiece_type && input.bar_stock_od_mm <= 65); // heuristic: ≤65mm likely bar

    if (!isBarStock) {
      state.bar_stock_safety = {
        is_bar_stock: false,
        passed: true,
        rpm_violations: [],
        bar_feeder_required: false,
        bar_feeder_present: input.bar_feeder ?? false,
        extension_safe: true,
        block_reasons: [],
      };
      return;
    }

    const blockReasons: string[] = [];

    // Map material name to BarStockVibrationEngine material key
    const barMatKey = this.mapToBarMaterial(input.material);

    // Compute vibration analysis
    const barProps: BarStockProps = {
      diameter_mm: input.bar_stock_od_mm,
      length_mm: input.part_length_mm + (input.bar_extension_behind_spindle_mm ?? 0),
      material: barMatKey,
      support: input.tailstock ? "tailstock" : "cantilever",
      unsupported_length_mm: input.part_length_mm, // from chuck face to free end
    };

    const vibration = this.barVibrationEngine.analyze(barProps);
    const maxSafeRPM = vibration.max_safe_rpm;

    // Check RPM violations against max safe RPM
    const rpmViolations: BarStockSafetyResult["rpm_violations"] = [];
    const maxRequestedRPM = input.max_spindle_rpm ?? 4000;
    if (maxRequestedRPM > maxSafeRPM) {
      rpmViolations.push({
        op_number: 0, // general limit
        requested_rpm: maxRequestedRPM,
        limit: maxSafeRPM,
      });
      warnings.push(
        `Bar whip limit: max safe RPM = ${maxSafeRPM}, requested = ${maxRequestedRPM}. ` +
        `RPM will be hard-clamped to ${maxSafeRPM}.`,
      );
    }

    // Bar feeder requirement
    const ld = vibration.l_d_ratio;
    const barFeederRequired = ld >= BAR_FEEDER_REQUIRED_LD;
    const barFeederPresent = input.bar_feeder ?? false;
    if (barFeederRequired && !barFeederPresent) {
      blockReasons.push(
        `Bar stock L/D = ${ld.toFixed(1)} ≥ ${BAR_FEEDER_REQUIRED_LD} — bar feeder required but not specified. ` +
        "Set bar_feeder: true or switch to chucked workpiece.",
      );
    }

    // Bar extension behind spindle
    const extension = input.bar_extension_behind_spindle_mm ?? 0;
    const extensionSafe = extension <= MAX_BAR_EXTENSION_MM;
    let extensionWarning: string | undefined;
    if (!extensionSafe) {
      extensionWarning = `Bar extends ${extension}mm behind spindle (max ${MAX_BAR_EXTENSION_MM}mm) — whipping hazard behind headstock`;
      blockReasons.push(extensionWarning);
    } else if (extension > MAX_BAR_EXTENSION_MM * 0.7) {
      extensionWarning = `Bar extension ${extension}mm is close to ${MAX_BAR_EXTENSION_MM}mm limit — monitor for vibration`;
      warnings.push(extensionWarning);
    }

    // Critical vibration risk = block
    if (vibration.risk === "critical" && !input.tailstock) {
      blockReasons.push(
        `Bar vibration risk CRITICAL (L/D = ${ld.toFixed(1)}). ` +
        "Tailstock or steady rest required. Set tailstock: true.",
      );
    }

    state.bar_stock_safety = {
      is_bar_stock: true,
      vibration,
      max_rpm_limit: maxSafeRPM,
      rpm_violations: rpmViolations,
      bar_feeder_required: barFeederRequired,
      bar_feeder_present: barFeederPresent,
      extension_safe: extensionSafe,
      extension_warning: extensionWarning,
      passed: blockReasons.length === 0,
      block_reasons: blockReasons,
    };

    // Add recommendations to setup notes
    for (const rec of vibration.recommendations) {
      state.setup_notes.push(`[BAR SAFETY] ${rec}`);
    }
    for (const sug of vibration.support_suggestions) {
      state.setup_notes.push(`[BAR SAFETY] Suggestion: ${sug.type} — ${sug.reason}`);
    }
  }

  // ── Stage 13: CLAMPING_PER_OP (SAFETY GATE — wired) ──────────────

  private stageClampingPerOp(state: PipelineState, warnings: string[]): void {
    const { input } = state;
    const gripForce = DEFAULT_GRIP_FORCE_N;
    const analyses: OperationForceAnalysis[] = [];

    // Analyze each feature's expected operations
    for (let i = 0; i < input.features.length; i++) {
      const feature = input.features[i];
      // U-LW-LIVETOOL-FAILLOUD: a live-tooling feature type has no inferOperations case -> it silently falls
      // back to od_rough. Surface a LOUD warning so the operator knows the turning spine does not natively
      // plan it (needs live-tool / mill-turn programming) instead of trusting a fallback od_rough analysis.
      if (LIVE_TOOLING_FEATURE_TYPES.has(feature.type)) {
        warnings.push(
          `[live-tooling] feature '${feature.type}' (feature ${i + 1}) requires live-tool / mill-turn programming -- ` +
          `the turning spine does not natively plan it; clamping analysis falls back to od_rough. ` +
          `Program the live-tool op via mill-turn (MillTurnSwissPipelineEngine) before running.`,
        );
      }
      // U-LW-KNURL-ADVISORY: 'knurl' also has no inferOperations case -> it silently falls back to od_rough.
      // Knurling is a FORMING op (not live-tooling), so warn distinctly: the spine does not emit a knurl cycle,
      // and form-knurl radial force (5-20x cutting force) can deflect slender parts.
      if (feature.type === "knurl") {
        warnings.push(
          `[knurl] feature '${feature.type}' (feature ${i + 1}) is a knurling (forming) operation -- the turning ` +
          `spine does not natively emit a knurl cycle; clamping analysis falls back to od_rough. Use the knurl ` +
          `advisory (KnurlingEngine) for pitch / blank-diameter / radial-force before running (form-knurl radial ` +
          `force is 5-20x cutting force and can deflect slender parts).`,
        );
      }
      const opTypes = feature.required_operations ?? this.inferOperations(feature);

      for (const opType of opTypes) {
        const analysis = this.analyzeOperationForce(
          i + 1,
          opType,
          feature,
          input,
          gripForce,
          warnings,
        );
        analyses.push(analysis);
      }
    }

    state.clamping_analysis = analyses;

    // Summary
    const blocked = analyses.filter(a => a.blocked);
    if (blocked.length > 0) {
      warnings.push(
        `${blocked.length} operation(s) blocked by clamping safety — ` +
        blocked.map(b => `Op ${b.op_number}: ${b.block_reason}`).join("; "),
      );
    }

    const pullOutHazards = analyses.filter(a => a.force_direction === "axial_pull");
    if (pullOutHazards.length > 0) {
      state.setup_notes.push(
        `[CLAMPING] WARNING: ${pullOutHazards.length} boring operation(s) with axial pull-out hazard — ` +
        "verify jaw grip depth ≥ 1.5× bar diameter",
      );
    }
  }

  /**
   * Analyze force direction and clamping adequacy for a single operation.
   *
   * Force direction by operation type:
   * - OD turning: radial (into chuck) + tangential → relatively safe
   * - Boring: radial + axial PULL (out of chuck) → hazardous
   * - Part-off: tangential + axial → cutoff hazard without catcher
   * - Threading: low force, but intermittent → vibration risk
   * - Face grooving: axial into chuck → check jaw clamping depth
   * - Drilling: axial into chuck → safe for through-spindle
   */
  private analyzeOperationForce(
    opNumber: number,
    opType: TurningOpType,
    feature: TurningFeature,
    input: LatheOrchestrationInput,
    gripForce: number,
    warnings: string[],
  ): OperationForceAnalysis {
    const hazards: string[] = [];
    let blocked = false;
    let blockReason: string | undefined;

    // Estimate cutting force using simplified Kienzle
    // Fc = kc1.1 × ap × f^(1-mc)
    // Typical values: kc1.1 ≈ 1800 MPa (steel P), mc ≈ 0.25
    const kc1_1 = this.getKc11(input.material?.iso_group ?? "P");
    const mc = this.getMc(input.material?.iso_group ?? "P");
    const ap = this.estimateDoc(opType, feature);
    const f = this.estimateFeed(opType, input.material?.iso_group ?? "P");
    const Fc = kc1_1 * ap * Math.pow(f, 1 - mc);

    // Determine force direction based on operation type
    let forceDirection: OperationForceAnalysis["force_direction"];

    if (opType.startsWith("od_") || opType === "taper") {
      // OD turning: radial force pushes workpiece INTO chuck jaws
      forceDirection = "into_chuck";

    } else if (opType.startsWith("id_") || opType.startsWith("bore_")) {
      // Boring: tool enters bore, axial feed creates pull-out force
      forceDirection = "axial_pull";
      hazards.push("Boring creates axial pull-out force — verify jaw grip depth");
      // Boring with deep bore increases risk
      const depth = feature.depth_mm ?? feature.length_mm ?? 0;
      const boreDia = feature.id_mm ?? feature.diameter_mm ?? 20;
      if (depth > boreDia * 4) {
        hazards.push(
          `Deep bore L/D = ${(depth / boreDia).toFixed(1)} — boring bar deflection risk + pull-out amplified`,
        );
      }

    } else if (opType === "part_off" || opType === "groove_cutoff" as any) {
      // Part-off: tangential force + part separation
      forceDirection = "mixed";
      if (!input.part_catcher && !input.sub_spindle) {
        hazards.push("Cutoff without part catcher or sub-spindle");
        // Check RPM limit for unsupported cutoff
        const maxRPM = input.max_spindle_rpm ?? 4000;
        if (maxRPM > MAX_CUTOFF_RPM_NO_CATCHER) {
          blocked = true;
          blockReason =
            `Cutoff RPM ${maxRPM} exceeds ${MAX_CUTOFF_RPM_NO_CATCHER} RPM limit without part catcher/sub-spindle. ` +
            "Add part_catcher: true or sub_spindle: true, or reduce cutoff RPM.";
        }
      }

    } else if (opType === "face_rough" || opType === "face_finish") {
      // Facing: axial force into chuck (generally safe)
      forceDirection = "into_chuck";

    } else if (opType.includes("groove") || opType === "groove" || opType === "groove_finish") {
      // Grooving: radial plunge — check for face groove (axial)
      if (feature.type === "face_groove" || feature.type === "groove_face") {
        forceDirection = "radial"; // face groove = axial cutting = radial clamping check
        hazards.push("Face grooving — verify axial clamping adequacy (jaw face contact)");
      } else {
        forceDirection = "radial";
      }

    } else if (opType.includes("thread")) {
      // Threading: low force but intermittent engagement
      forceDirection = "into_chuck";
      if (opType === "id_thread" as any) {
        forceDirection = "axial_pull";
        hazards.push("Internal threading with axial pull — lower risk than boring but monitor");
      }

    } else if (opType === "drill" || opType === "center_drill") {
      // Drilling: axial into chuck (through spindle)
      forceDirection = "into_chuck";

    } else {
      forceDirection = "mixed";
    }

    // Compute safety factor
    const safetyFactor = gripForce / Math.max(Fc, 1);
    const clampingAdequate = safetyFactor >= CLAMPING_SAFETY_FACTOR;

    if (!clampingAdequate) {
      hazards.push(
        `Clamping safety factor ${safetyFactor.toFixed(1)} < ${CLAMPING_SAFETY_FACTOR} minimum — ` +
        `cutting force ${Fc.toFixed(0)}N vs grip ${gripForce}N`,
      );
      if (safetyFactor < 1.5) {
        blocked = true;
        blockReason = blockReason ??
          `Clamping safety factor ${safetyFactor.toFixed(1)} critically low — workpiece ejection risk`;
      }
    }

    // Pull-out hazard always gets a warning even if force is low
    if (forceDirection === "axial_pull") {
      warnings.push(
        `Op ${opNumber} (${opType}): axial pull-out force ${Fc.toFixed(0)}N — ` +
        `safety factor ${safetyFactor.toFixed(1)} (min ${CLAMPING_SAFETY_FACTOR})`,
      );
    }

    return {
      op_number: opNumber,
      operation_type: opType,
      feature_id: feature.id,
      force_direction: forceDirection,
      estimated_force_N: parseFloat(Fc.toFixed(1)),
      clamping_adequate: clampingAdequate,
      safety_factor: parseFloat(safetyFactor.toFixed(2)),
      hazards,
      blocked,
      block_reason: blockReason,
    };
  }

  // ── Stages 14-35: Stubs (to be wired in later sessions) ──────────

  private stageMachineReadiness(state: PipelineState, _warnings: string[]): void {
    state.setup_notes.push("[READINESS] Machine readiness check — stub");
  }

  private stageToolpathGenerate(state: PipelineState, _warnings: string[]): void {
    // Stub — will wire to EntryExitStrategyEngine
  }

  private stageGcodeGenerate(state: PipelineState, warnings: string[]): void {
    // U-LW-AIHEAD-SPINE: delegate to the verified program-generation pipeline.
    // LatheOrchestrationInput extends TurningInput, so state.input IS a valid TurningInput.
    // runPipeline is the fail-CLOSED emission authority: if it suppresses output (a critical
    // warning -> empty program_text), the orchestrator emits NO program and records the block,
    // which the result assembly folds into safetyBlocks (-> success:false, program_text shows BLOCK).
    const result: TurningProgramResult = turningPrintToProgramEngine.runPipeline(state.input);
    // U-LW-SPINE-RESULT-SURFACE: store the full result so the result assembly surfaces the pipeline's
    // REAL operations / cycle-time / collision-checks (the spine's own reporting stages 24-29 are stubs).
    state.pipeline_result = result;

    // Fail-LOUD: surface the pipeline's own critical warnings on this stage's trace.
    for (const w of result.warnings ?? []) {
      if (w.severity === "critical") warnings.push(`[runPipeline:${w.stage}] ${w.message}`);
    }

    if (result.success && result.program_text.trim().length > 0) {
      for (const line of result.program_text.split("\n")) state.program_lines.push(line);
    } else {
      // Fail-CLOSED: no program emitted; record the block for the result + release gate.
      state.program_gen_block =
        "program emission BLOCKED by runPipeline safety gate (no program emitted)";
    }
  }

  private stageTnrcResolve(_state: PipelineState, _warnings: string[]): void {
    // Stub — tool nose radius compensation G41/G42
  }

  private stageCssOptimize(_state: PipelineState, _warnings: string[]): void {
    // Stub — constant surface speed G96 with G50 clamp
  }

  private stageTurretOptimize(_state: PipelineState, _warnings: string[]): void {
    // Stub — minimize turret index count
  }

  private stageControllerDialect(_state: PipelineState, _warnings: string[]): void {
    // Stub — Fanuc/Haas/Mazak/Okuma/Siemens post-process
  }

  private stageEmergencyRecovery(state: PipelineState, _warnings: string[]): void {
    state.setup_notes.push("[EMERGENCY] Emergency recovery procedures — stub");
  }

  private stageSafetyVerify(_state: PipelineState, _warnings: string[]): void {
    // Stub — full program safety scan
  }

  private stageCollisionCheck(_state: PipelineState, _warnings: string[]): void {
    // Stub — will wire to LatheCollisionZoneEngine
  }

  private stageCycleTime(_state: PipelineState, _warnings: string[]): void {
    // Stub — per-operation cycle time breakdown
  }

  private stageMaterialRemovalSim(_state: PipelineState, _warnings: string[]): void {
    // Stub — volumetric MRR verification
  }

  private stageSetupSheet(state: PipelineState, _warnings: string[]): void {
    // U-LW-SPINE-REPORTS: build a real operator setup sheet from the verified pipeline result
    // (operation sequence + per-op cutting params + tool list + stock). Honest fail-soft: if no
    // program was emitted (runPipeline fail-closed), emit no sheet rather than a fabricated one.
    const pr = state.pipeline_result;
    if (!pr || !pr.success || pr.operations.length === 0) {
      state.setup_notes.push("[SETUP] Setup sheet not generated (no emitted program).");
      return;
    }
    const lines: string[] = [];
    lines.push("=== LATHE SETUP SHEET ===");
    lines.push(`Part: ${state.input.part_number ?? "(unnamed)"}  |  Material: ${state.input.material?.material_name ?? "?"} (ISO ${state.input.material?.iso_group ?? "?"})`);
    lines.push(`Stock: OD ${state.input.bar_stock_od_mm ?? "?"}mm x L ${state.input.part_length_mm ?? "?"}mm  |  Operations: ${pr.total_operations}  |  Tool changes: ${pr.total_tool_changes}  |  Est. cycle: ${(pr.estimated_cycle_time_sec / 60).toFixed(2)} min`);
    lines.push("");
    lines.push("OP | TYPE | TOOL | Vc(m/min) | fn(mm/rev) | ap(mm) | RPM");
    for (const op of pr.operations) {
      const cp = op.cutting_params;
      lines.push(`${op.op_number} | ${op.operation_type} | T${op.tool?.tool_number ?? "?"} | ${cp.cutting_speed_m_min} | ${cp.feed_mm_rev} | ${cp.depth_of_cut_mm} | ${Math.round(cp.spindle_rpm)}`);
    }
    const tools = Array.from(new Set(pr.operations.map((op) => op.tool?.tool_number).filter((t) => t != null)));
    lines.push("");
    lines.push(`Tools required (${tools.length}): ${tools.map((t) => "T" + t).join(", ")}`);
    state.setup_sheet = lines.join("\n");
    state.setup_notes.push("[SETUP] Setup sheet generated from verified pipeline result.");
  }

  private stageProveOut(_state: PipelineState, _warnings: string[]): void {
    // Stub — will wire to ProveOutModeEngine
  }

  private stageInspectionPlan(_state: PipelineState, _warnings: string[]): void {
    // Stub — in-process gauging + CMM plan
  }

  private stageConfidenceScore(state: PipelineState, _warnings: string[]): void {
    // Aggregate confidence from all components
    state.confidence_components.push({
      name: "orchestrator_completeness",
      score: 30, // low because most stages are stubs
      reason: "Orchestrator shell — stages pending full wiring",
    });
  }

  private stagePhysicsReport(state: PipelineState, _warnings: string[]): void {
    // U-LW-SPINE-REPORTS: build a physics traceability report from the verified pipeline result --
    // the per-op Kienzle cutting force (computed in runPipeline) + cutting params + the peak-force op
    // that the workholding + spindle-torque gates size to. Real numbers only; no fabrication.
    const pr = state.pipeline_result;
    if (!pr || !pr.success || pr.operations.length === 0) return;
    const lines: string[] = [];
    lines.push("=== PHYSICS TRACEABILITY REPORT ===");
    lines.push(`Material: ${state.input.material?.material_name ?? "?"} (ISO ${state.input.material?.iso_group ?? "?"})`);
    lines.push("Per-op physics (Kienzle Fc = kc1.1 * ap * fn^(1-mc), computed in runPipeline):");
    lines.push("OP | TYPE | Fc(N) | Power(kW) | Torque(Nm) | ToolLife(min) | Ra(um)");
    let peakFc = 0;
    let peakOp = 0;
    let peakPower = 0;
    for (const op of pr.operations) {
      const ph = op.physics;
      const fc = Number.isFinite(ph?.cutting_force_N) ? ph.cutting_force_N : 0;
      const pw = Number.isFinite(ph?.power_kW) ? ph.power_kW : 0;
      if (fc > peakFc) { peakFc = fc; peakOp = op.op_number; }
      if (pw > peakPower) peakPower = pw;
      lines.push(`${op.op_number} | ${op.operation_type} | ${Math.round(fc)} | ${pw} | ${ph?.torque_Nm ?? 0} | ${ph?.tool_life_min ?? 0} | ${ph?.predicted_Ra_um ?? 0}`);
    }
    lines.push("");
    lines.push(`Peak cutting force: ${Math.round(peakFc)} N at OP${peakOp}; peak power ${peakPower} kW -- the workholding + spindle torque/power gates size to these.`);
    state.physics_report = lines.join("\n");
  }

  private stageCostReport(state: PipelineState, _warnings: string[]): void {
    // U-LW-SPINE-REPORTS: surface the physical cost DRIVERS from the verified pipeline result --
    // total + per-op cycle time and tool-change count. R7/R12: per-part $ (machine rate x time +
    // tooling + material) is owned by the ERP/quoting galaxy, so this report defers it rather than
    // inventing a rate.
    const pr = state.pipeline_result;
    if (!pr || !pr.success || pr.operations.length === 0) return;
    const lines: string[] = [];
    lines.push("=== COST DRIVERS REPORT ===");
    lines.push(`Total cycle time: ${(pr.estimated_cycle_time_sec / 60).toFixed(2)} min (${Math.round(pr.estimated_cycle_time_sec)} s)`);
    lines.push(`Operations: ${pr.total_operations}  |  Tool changes: ${pr.total_tool_changes}`);
    lines.push("Per-op cycle time:");
    for (const op of pr.operations) {
      lines.push(`  OP${op.op_number} ${op.operation_type}: ${(Number.isFinite(op.cycle_time_sec) ? op.cycle_time_sec : 0).toFixed(1)} s`);
    }
    lines.push("");
    lines.push("NOTE: per-part $ (machine rate x time + tooling + material) is owned by the ERP/quoting galaxy; this report surfaces the physical cost DRIVERS (cycle time + tool changes) only.");
    state.cost_report = lines.join("\n");
  }

  private stageFaiPlan(_state: PipelineState, _warnings: string[]): void {
    // Stub — first article inspection plan (AS9102)
  }

  private stageProgramPackage(_state: PipelineState, _warnings: string[]): void {
    // Stub — .nc + setup sheet + report bundle
  }

  private stageBackplotData(state: PipelineState, _warnings: string[]): void {
    // Stub — generate XZ path data for visualization
    state.backplot_points.push({ x: 0, z: 0, type: "rapid" });
  }

  private stageReleaseGate(state: PipelineState, warnings: string[]): void {
    // Aggregate all safety results for final go/no-go
    const barSafety = state.bar_stock_safety;
    const clampingBlocked = (state.clamping_analysis ?? []).some(a => a.blocked);

    if (barSafety && !barSafety.passed) {
      warnings.push("RELEASE GATE: BLOCKED by bar stock safety violations");
    }
    if (clampingBlocked) {
      warnings.push("RELEASE GATE: BLOCKED by clamping safety violations");
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════

  /** Map TurningMaterial to BarStockVibrationEngine material key */
  private mapToBarMaterial(mat: TurningMaterial | undefined): string {
    if (!mat) return "steel_1045";
    const name = (mat.material_name ?? "").toLowerCase();
    if (name.includes("4140")) return "steel_4140";
    if (name.includes("1045")) return "steel_1045";
    if (name.includes("12l14")) return "steel_12l14";
    if (name.includes("303")) return "stainless_303";
    if (name.includes("304")) return "stainless_304";
    if (name.includes("6061")) return "aluminum_6061";
    if (name.includes("2011")) return "aluminum_2011";
    if (name.includes("360") && name.includes("brass")) return "brass_360";
    if (name.includes("ti") || name.includes("6al4v")) return "titanium_6al4v";
    if (name.includes("inconel") || name.includes("718")) return "inconel_718";
    // Fallback by ISO group
    switch (mat.iso_group) {
      case "P": return "steel_1045";
      case "M": return "stainless_304";
      case "K": return "steel_1045"; // cast iron ≈ steel stiffness
      case "N": return "aluminum_6061";
      case "S": return "titanium_6al4v";
      case "H": return "steel_4140";
      default: return "steel_1045";
    }
  }

  /** Infer operations from feature type */
  private inferOperations(feature: TurningFeature): TurningOpType[] {
    switch (feature.type) {
      case "od_straight":
      case "od_contour":
      case "od_shoulder":
        return ["od_rough", "od_finish"];
      case "od_taper":
        return ["od_rough", "taper"];
      case "id_bore":
      case "id_contour":
      case "id_taper":
        return ["drill", "bore_rough", "bore_finish"];
      case "face":
        return ["face_rough", "face_finish"];
      case "face_groove":
        return ["groove"];
      case "groove_od":
      case "groove_id":
      case "groove_face":
        return ["groove", "groove_finish"];
      case "groove_cutoff":
        return ["part_off"];
      case "thread_od":
        return ["od_rough", "od_finish", "thread_single_point"];
      case "thread_id":
        return ["drill", "bore_rough", "bore_finish", "thread_single_point"];
      case "thread_pipe":
        return ["thread_single_point"];
      case "drill_center":
        return ["center_drill"];
      case "drill_through":
      case "drill_blind":
        return ["center_drill", "drill"];
      case "part_off":
        return ["part_off"];
      default:
        return ["od_rough"];
    }
  }

  /** Get Kienzle kc1.1 by ISO group (MPa) */
  private getKc11(isoGroup: string): number {
    const kc: Record<string, number> = {
      P: 1800, M: 2100, K: 1200, N: 750, S: 2500, H: 3200,
    };
    return kc[isoGroup] ?? 1800;
  }

  /** Get Kienzle mc exponent by ISO group */
  private getMc(isoGroup: string): number {
    const mc: Record<string, number> = {
      P: 0.25, M: 0.25, K: 0.28, N: 0.23, S: 0.27, H: 0.30,
    };
    return mc[isoGroup] ?? 0.25;
  }

  /** Estimate depth of cut by operation type (mm) */
  private estimateDoc(opType: TurningOpType, feature: TurningFeature): number {
    if (opType.includes("finish")) return 0.5;
    if (opType.includes("rough")) return feature.depth_mm ?? 2.0;
    if (opType === "groove" || opType === "groove_finish") return feature.groove_width_mm ?? 3.0;
    if (opType === "part_off") return 3.0;
    if (opType.includes("thread")) return 0.5;
    if (opType === "drill" || opType === "center_drill") return (feature.diameter_mm ?? 10) / 2;
    return 2.0;
  }

  /** Estimate feed by operation type and ISO group (mm/rev) */
  private estimateFeed(opType: TurningOpType, isoGroup: string): number {
    const isFinish = opType.includes("finish");
    const feeds: Record<string, { rough: number; finish: number }> = {
      P: { rough: 0.30, finish: 0.12 },
      M: { rough: 0.22, finish: 0.10 },
      K: { rough: 0.35, finish: 0.15 },
      N: { rough: 0.40, finish: 0.15 },
      S: { rough: 0.15, finish: 0.08 },
      H: { rough: 0.12, finish: 0.06 },
    };
    const f = feeds[isoGroup] ?? feeds.P;
    if (opType === "part_off") return 0.08;
    if (opType.includes("thread")) return 0.1; // pitch-driven, simplified
    if (opType === "drill") return 0.15;
    return isFinish ? f.finish : f.rough;
  }

  /** Aggregate confidence score from components */
  private aggregateConfidence(components: Array<{ name: string; score: number; reason: string }>): number {
    if (components.length === 0) return 0;
    const sum = components.reduce((s, c) => s + c.score, 0);
    return Math.round(sum / components.length);
  }

  /** One-line stage summary for traceability */
  private summarizeStage(stage: LatheStage, state: PipelineState): string {
    switch (stage) {
      case "INPUT_VALIDATE":
        return `${state.input.features.length} features, OD=${state.input.bar_stock_od_mm}mm, L=${state.input.part_length_mm}mm`;
      case "BAR_STOCK_SAFETY":
        return state.bar_stock_safety?.passed
          ? `PASS — max RPM=${state.bar_stock_safety.max_rpm_limit ?? "N/A"}`
          : `BLOCKED — ${state.bar_stock_safety?.block_reasons.length ?? 0} reasons`;
      case "CLAMPING_PER_OP":
        return `${state.clamping_analysis?.length ?? 0} ops analyzed, ` +
          `${state.clamping_analysis?.filter(a => a.blocked).length ?? 0} blocked`;
      default:
        return "completed";
    }
  }
}

// ============================================================================
// INTERNAL PIPELINE STATE
// ============================================================================

interface PipelineState {
  input: LatheOrchestrationInput;
  operations: TurningPlannedOp[];
  program_lines: string[];
  setup_notes: string[];
  confidence_components: Array<{ name: string; score: number; reason: string }>;
  bar_stock_safety?: BarStockSafetyResult;
  clamping_analysis: OperationForceAnalysis[];
  backplot_points: Array<{ x: number; z: number; type: "rapid" | "cut" | "arc" }>;
  /** U-LW-AIHEAD-SPINE: set when runPipeline fail-closes in GCODE_GENERATE -> folded into safetyBlocks. */
  program_gen_block?: string;
  /** U-LW-SPINE-RESULT-SURFACE: the verified pipeline result, stored so the result assembly surfaces
   *  runPipeline's REAL operations / cycle-time / collision-checks (the spine's stages 24-29 are stubs). */
  pipeline_result?: TurningProgramResult;
  /** U-LW-SPINE-REPORTS: real report text built from pipeline_result in the late report stages
   *  (PHYSICS_REPORT/SETUP_SHEET/COST_REPORT, which run AFTER GCODE_GENERATE sets pipeline_result). */
  physics_report?: string;
  setup_sheet?: string;
  cost_report?: string;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheOrchestrationEngine = new LatheOrchestrationEngine();
