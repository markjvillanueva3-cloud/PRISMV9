/**
 * PrintToProgramPipelineEngine — Upload Print → Get CNC Program
 *
 * The ultimate user-facing orchestrator: accepts engineering drawing data
 * (parsed features, dimensions, tolerances, material, surface finish) and
 * produces a complete CNC program with tool list, setup sheet, and
 * confidence scoring.
 *
 * Pipeline Stages:
 *   S1: Drawing Intake — validate completeness, flag missing dims/tolerances
 *   S2: Feature Extraction & Classification — map to machinable features, assign GD&T
 *   S3: Process Planning — operation sequencing, tool selection, S/F calculation
 *   S4: Program Generation — G-code with safety moves, coolant, spindle control
 *   S5: Validation & Output — safety checks, setup sheet, confidence score
 *
 * Physics (canonical imports from physics/constants.ts — migrated 0-D-ARCH):
 *   - Kienzle (1952): Fc = kc1.1 × ap × fz^(1−mc)
 *   - Taylor (1907): VT^n = C  →  T = (C/Vc)^(1/n)
 *   - Deflection: δ = F×L³/(3×E×I), I = π×d⁴/64
 *   - MRR: ap × ae × Vf (mm³/min)
 *   - Surface finish: Ra = fz²/(32×r_nose) (ideal)
 *
 * Constants and helper functions imported from physics/constants.ts.
 * Helper engines imported directly so ESM builds cannot silently fall back.
 *
 * @module engines/PrintToProgramPipelineEngine
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  CANONICAL_MILLING_SPEEDS,
  CANONICAL_MILLING_FEEDS,
  kienzleForce,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";
import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { coatingSelectionEngine } from "./CoatingSelectionEngine.js";
import { autoSpeedFeedEngine } from "./AutoSpeedFeedEngine.js";
import { coolantStrategyEngine } from "./CoolantStrategyEngine.js";
import { entryExitStrategyEngine } from "./EntryExitStrategyEngine.js";
import { intelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
import { workholdingVerificationEngine } from "./WorkholdingVerificationEngine.js";
import { workholdingViabilityEngine } from "./WorkholdingViabilityEngine.js";
import { crossCamRecommenderEngine } from "./CrossCamRecommenderEngine.js";
import { WorkCoordinateEngine } from "./WorkCoordinateEngine.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";
import { chatterStabilityLobeEngine } from "./ChatterStabilityLobeEngine.js";
import { pipelineOptimizationEngine, type PipelineExecutionOptions, type PipelineMetrics } from "./PipelineOptimizationEngine.js";
import { probeRoutineGeneratorEngine, type ProbeController, type ProbeFeature } from "./ProbeRoutineGeneratorEngine.js";
import { setupSheetFromGCodeEngine, type ControllerType as GCodeControllerType, type SetupSheetResult as GCodeSetupSheetResult } from "./SetupSheetFromGCodeEngine.js";

// ============================================================================
// DIRECT ENGINE HELPERS (ESM-safe, no runtime require fallbacks)
// ============================================================================

function getSmartToolSelector(): any {
  return smartToolSelectorEngine;
}

function getCoatingSelector(): any {
  return coatingSelectionEngine;
}

function getAutoSpeedFeedEngine(): any {
  return autoSpeedFeedEngine;
}

function getCoolantStrategyEngine(): any {
  return coolantStrategyEngine;
}

function getEntryExitStrategyEngine(): any {
  return entryExitStrategyEngine;
}

function getIntelligentSequencingEngine(): any {
  return intelligentSequencingEngine;
}

function getWorkholdingVerificationEngine(): any {
  return workholdingVerificationEngine;
}

function getWorkholdingViabilityEngine(): any {
  return workholdingViabilityEngine;
}

function getCrossCamRecommenderEngine(): any {
  return crossCamRecommenderEngine;
}

// WorkCoordinateEngine is STATEFUL (create() accumulates this.offsets,
// validate() reads it). Return the CLASS, not a shared singleton, so the
// pipeline can use a fresh per-call instance — a shared instance would bleed
// WCS offsets across runs and report false duplicate-offset validation.
function getWorkCoordinateEngineClass(): any {
  return WorkCoordinateEngine;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Feature types extractable from engineering drawings. */
export type DrawingFeatureType =
  | "hole_through" | "hole_blind" | "hole_counterbore" | "hole_countersink"
  | "pocket_open" | "pocket_closed" | "slot"
  | "contour_outside" | "contour_inside"
  | "face" | "step" | "chamfer" | "fillet"
  | "thread_internal" | "thread_external"
  | "bore" | "groove" | "keyway";

/** GD&T symbol types per ASME Y14.5. */
export type GDTSymbolType =
  | "position" | "flatness" | "perpendicularity" | "parallelism"
  | "circularity" | "cylindricity" | "concentricity"
  | "profile_surface" | "profile_line"
  | "circular_runout" | "total_runout" | "symmetry";

/** Tolerance specification from drawing. */
export interface DrawingTolerance {
  type: "bilateral" | "unilateral_plus" | "unilateral_minus" | "limit" | "fit_class";
  upper_mm: number;
  lower_mm: number;
  fit_class?: string;
}

/** A single dimension extracted from the drawing. */
export interface DrawingDimension {
  id: string;
  type: "linear" | "diameter" | "radius" | "angular" | "depth" | "thread";
  nominal_mm: number;
  tolerance?: DrawingTolerance;
  surface_finish_Ra_um?: number;
  location_hint?: string;
  confidence: number;
}

/** GD&T frame from the drawing. */
export interface DrawingGDT {
  id: string;
  symbol: GDTSymbolType;
  tolerance_mm: number;
  material_condition?: "MMC" | "LMC" | "RFS";
  datum_refs: string[];
  applied_to_feature?: string;
}

/** Material callout from title block or notes. */
export interface MaterialCallout {
  material_name: string;
  specification?: string;
  hardness_hrc?: number;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
}

/** A machinable feature classified from drawing data. */
export interface MachinableFeature {
  id: string;
  type: DrawingFeatureType;
  width_mm?: number;
  length_mm?: number;
  depth_mm: number;
  diameter_mm?: number;
  corner_radius_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  thread_pitch_mm?: number;
  thread_class?: string;
  position?: { x: number; y: number; z: number };
  gdt?: DrawingGDT[];
  required_operations: OperationType[];
  priority: number;
}

/** Operation types in the machining process. */
export type OperationType =
  | "face" | "rough" | "semi_finish" | "finish"
  | "drill" | "ream" | "bore" | "tap"
  | "chamfer" | "thread_mill" | "slot" | "contour"
  | "pocket_rough" | "pocket_finish";

/** Tool types for selection. */
export type ProgramToolType =
  | "face_mill" | "flat_endmill" | "ball_endmill" | "bull_nose"
  | "drill" | "center_drill" | "reamer" | "tap"
  | "chamfer_mill" | "boring_bar" | "thread_mill" | "slot_drill";

/** A selected tool for a specific operation. */
export interface SelectedTool {
  tool_number: number;
  tool_type: ProgramToolType;
  diameter_mm: number;
  flutes: number;
  flute_length_mm: number;
  corner_radius_mm: number;
  material: "carbide" | "HSS" | "ceramic" | "CBN" | "PCD";
  coating: string;
  stick_out_mm: number;
  holder_type: string;
}

/** Cutting parameters for an operation. */
export interface CuttingParams {
  spindle_rpm: number;
  feed_mm_min: number;
  feed_per_tooth_mm: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  cutting_speed_m_min: number;
}

/** Physics results for an operation. */
export interface OperationPhysics {
  cutting_force_N: number;
  power_kW: number;
  torque_Nm: number;
  tool_life_min: number;
  deflection_mm: number;
  predicted_Ra_um: number;
  mrr_mm3_min: number;
}

/** A planned machining operation. */
export interface PlannedOperation {
  op_number: number;
  feature_id: string;
  operation_type: OperationType;
  tool: SelectedTool;
  cutting_params: CuttingParams;
  physics: OperationPhysics;
  cycle_time_sec: number;
  passes: number;
  approach: "plunge" | "ramp" | "helical" | "direct";
  coolant: "flood" | "mist" | "through_tool" | "air" | "off";
  notes: string[];
  /** Feature position from drawing — drives G-code coordinates */
  position?: { x: number; y: number; z: number };
  /** Feature dimensions for G-code extent calculations */
  feature_dims?: { width_mm?: number; length_mm?: number; depth_mm?: number; diameter_mm?: number };
}

/** A single G-code block in the output program. */
export interface ProgramBlock {
  line_number: number;
  code: string;
  comment?: string;
}

/** Safety check result. */
export interface SafetyCheck {
  rule: string;
  status: "pass" | "warn" | "fail";
  message: string;
  line_ref?: number;
}

/** Setup sheet output. */
export interface SetupSheet {
  part_number: string;
  material: string;
  stock_size: { x: number; y: number; z: number };
  work_offset: string;
  datum_description: string;
  tool_list: Array<{
    tool_number: number;
    description: string;
    diameter_mm: number;
    stick_out_mm: number;
    holder: string;
  }>;
  fixture_notes: string[];
  estimated_cycle_time_sec: number;
  estimated_cycle_time_formatted: string;
}

/** Pipeline warning. */
export interface PipelineWarning {
  stage: string;
  severity: "info" | "warning" | "critical";
  message: string;
  feature_id?: string;
}

/** Drawing intake input. */
export interface DrawingInput {
  part_number?: string;
  revision?: string;
  material: MaterialCallout;
  stock_size?: { x: number; y: number; z: number };
  dimensions: DrawingDimension[];
  gdt_frames?: DrawingGDT[];
  features: MachinableFeature[];
  notes?: string[];
  machine_brand?: string;
  machine_model?: string;
  max_spindle_rpm?: number;
  max_power_kW?: number;
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";
}

/** Full pipeline result. */
export interface PrintToProgramResult {
  success: boolean;
  part_number: string;
  material: string;
  // Stage 1: Intake validation
  intake_validation: {
    complete: boolean;
    missing_dimensions: string[];
    ambiguous_tolerances: string[];
    warnings: PipelineWarning[];
  };
  // Stage 2: Classified features
  machinable_features: MachinableFeature[];
  feature_count: number;
  // Stage 3: Process plan
  operations: PlannedOperation[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  // Stage 4: G-code program
  program: ProgramBlock[];
  program_text: string;
  program_line_count: number;
  // Stage 5: Validation
  safety_checks: SafetyCheck[];
  safety_pass_rate: number;
  setup_sheet: SetupSheet;
  confidence_score: number;
  warnings: PipelineWarning[];
  tribal_tips?: KnowledgeTip[];
  /**
   * U-CAMX24 — Reverse-engineered setup sheet from the EMITTED G-code text.
   * Complementary to {@link PrintToProgramResult.setup_sheet} (operations-derived):
   * this view is parsed from `program_text` by SetupSheetFromGCodeEngine and gives
   * the operator a controller-aware Markdown document + tool-list + work-offset list
   * + reverse-engineered safety notes that reflect what the G-code *actually* does
   * (not what the planner intended). Present iff canEmitProgram && program_text length > 0.
   */
  gcode_setup_sheet?: GCodeSetupSheetResult;
  /**
   * U-CAMX09 — Fixture-geometry viability lens, COMPLEMENTARY to the
   * force-margin `workholding_force` rows in {@link PrintToProgramResult.safety_checks}
   * (produced by WorkholdingVerificationEngine). R8: not a duplicate — this
   * adds the geometric grip heuristics the force gate does NOT cover:
   * sub-100mm² clamp zones, single-clamp rotation risk, all-clamps-same-face
   * moment resistance, and vacuum sealed-area. Present iff the planner
   * produced ≥1 operation (so a peak cutting force + workholding config exist).
   */
  workholding_viability?: {
    viable: boolean;
    grip_margin: number;
    issues: string[];
    force_capacity_N: number;
  };
  /**
   * U-CAMX10 — Advisory CAM-system + strategy recommendation. The pipeline
   * emits its own G-code directly; this is a COMPLEMENTARY routing hint (R8 —
   * not duplicate toolpath gen): given the part geometry/material/machine,
   * CrossCamRecommenderEngine ranks which external CAM bridge (Fusion 360 /
   * hyperMILL / Mastercam / Esprit / …) + toolpath strategy would best machine
   * it, with a physics-validated confidence + predicted cycle time. Present iff
   * ≥1 operation was planned (so a representative tool + load exist).
   */
  cam_strategy_recommendation?: {
    recommended_cam: string;
    recommended_strategy: string;
    strategy_category: string;
    confidence: number;
    predicted_cycle_time_min: number;
    advantages: string[];
    warnings: string[];
  };
  /**
   * U-CAMX11 — Smart WCS (work-coordinate-system) plan. The emitted G-code
   * still uses the conventional G54 (unchanged — strictly additive). This
   * advisory derives the DATUM-based WCS origin + probe sequence + setup-time
   * estimate via WorkCoordinateEngine (a FRESH per-call instance — the engine
   * is stateful) and recommends additional offsets (G55…) when the part needs
   * >1 setup. Present iff ≥1 operation was planned.
   */
  wcs_plan?: {
    primary_code: string;
    origin: { x: number; y: number; z: number };
    datum_count: number;
    probe_sequence: string[];
    estimated_setup_time_min: number;
    additional_wcs: string[];
    multi_setup: boolean;
    valid: boolean;
    notes: string[];
  };
  // Stage 3.5: Chatter stability pre-check results
  chatter_checks?: Array<{
    op_number: number;
    stable: boolean;
    original_ap_mm: number;
    adjusted_ap_mm?: number;
    max_stable_ap_mm?: number;
    rpm: number;
  }>;
  // PostProcessor auto-chain status
  postprocessor_applied?: boolean;
}

/** Plan-only result (no G-code generation). */
export interface ProcessPlanResult {
  success: boolean;
  part_number: string;
  material: string;
  intake_validation: PrintToProgramResult["intake_validation"];
  machinable_features: MachinableFeature[];
  operations: PlannedOperation[];
  total_operations: number;
  total_tool_changes: number;
  estimated_cycle_time_sec: number;
  confidence_score: number;
  warnings: PipelineWarning[];
}

/** Validation-only result. */
export interface ValidationResult {
  success: boolean;
  safety_checks: SafetyCheck[];
  safety_pass_rate: number;
  warnings: PipelineWarning[];
  recommendations: string[];
}

// ============================================================================
// PHYSICS CONSTANTS — imported from canonical source (physics/constants.ts)
// ============================================================================
// All Kienzle, Taylor, speed, and feed constants are imported at the top of this file
// from CANONICAL_KIENZLE, CANONICAL_TAYLOR, CANONICAL_MILLING_SPEEDS, CANONICAL_MILLING_FEEDS.
// Previously these were inline copies that could diverge from the canonical source.
// Migration: 0-D-ARCH U-ARCH1 (2026-03-26)

const KIENZLE_DB = CANONICAL_KIENZLE as Record<string, { kc1_1: number; mc: number }>;
const TAYLOR_DB = CANONICAL_TAYLOR as Record<string, { C: number; n: number }>;
const SPEED_RANGES = CANONICAL_MILLING_SPEEDS as Record<string, { rough: number; finish: number }>;
const FEED_RANGES = CANONICAL_MILLING_FEEDS as Record<string, { rough: number; finish: number }>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// kienzleForce() and taylorLife() imported from physics/constants.ts (canonical source)
// Removed local duplicates — 0-D-ARCH U-ARCH1 migration

/**
 * Tool deflection: δ = F×L³/(3×E×I), I = π×d⁴/64
 * @param F - Force (N)
 * @param L - Stick-out length (mm)
 * @param d - Tool diameter (mm)
 * @param E - Young's modulus (MPa), default 600000 for carbide
 * @returns Deflection (mm)
 */
function toolDeflection(F: number, L: number, d: number, E = 600000): number {
  const I = (Math.PI * Math.pow(d, 4)) / 64;
  if (I <= 0) return 0;
  return (F * Math.pow(L, 3)) / (3 * E * I);
}

/**
 * Ideal surface finish: Ra = fz² / (32 × r_nose)
 * @param fz - Feed per tooth (mm)
 * @param r_nose - Nose radius (mm)
 * @returns Predicted Ra (µm)
 */
function predictedRa(fz: number, r_nose: number): number {
  if (r_nose <= 0) return 99;
  return (fz * fz * 1000) / (32 * r_nose);
}

/**
 * Material removal rate: MRR = ap × ae × Vf
 * @param ap - Depth of cut (mm)
 * @param ae - Width of cut (mm)
 * @param Vf - Feed rate (mm/min)
 * @returns MRR (mm³/min)
 */
function mrr(ap: number, ae: number, Vf: number): number {
  return ap * ae * Vf;
}

/**
 * RPM from cutting speed: n = (1000 × Vc) / (π × D)
 */
function rpmFromVc(Vc: number, D: number): number {
  if (D <= 0) return 0;
  return Math.round((1000 * Vc) / (Math.PI * D));
}

/**
 * Format seconds to MM:SS string.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// PRINT-TO-PROGRAM PIPELINE ENGINE
// ============================================================================

/**
 * PrintToProgramPipelineEngine — Orchestrates the full print-to-program workflow.
 *
 * Accepts engineering drawing data and produces a complete CNC program with
 * tool list, setup sheet, safety validation, and confidence scoring.
 *
 * Pipeline: Drawing Intake → Feature Classification → Process Planning →
 *           Program Generation → Validation & Output
 */
export class PrintToProgramPipelineEngine {
  readonly name = "PrintToProgramPipelineEngine";
  readonly version = "1.0.0";

  // Pipeline context set during generateProcessPlan for use in selectTool
  private _currentMaterial: MaterialCallout | null = null;
  private _currentMaxRPM = 12000;
  private _currentMaxPower = 15;
  private _currentTarget = "balanced";
  private _currentMachineBrand: string | undefined;
  private _currentMachineModel: string | undefined;
  // Registry-resolved contexts (U-ARCH3: pipeline ↔ registry bridge)
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  private _resolvedMachine: ResolvedMachineContext | null = null;

  /** Run machine envelope guard against peak milling parameters. */
  private _checkEnvelope(opts: {
    spindle_rpm?: number; feed_mm_min?: number; power_kW?: number;
    x_mm?: number; y_mm?: number; z_mm?: number;
  }): string[] {
    const envelope = this._resolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(this._resolvedMachine) : {};
    const result = machineEnvelopeGuardEngine.check({
      spindle_rpm: opts.spindle_rpm, feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW, x: opts.x_mm, y: opts.y_mm, z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  /**
   * Build a part-aware workholding recommendation from the planned load.
   * This avoids the old fixed 20 kN vise assumption for every part.
   */
  private buildWorkholdingConfig(input: DrawingInput, operations: PlannedOperation[]) {
    const iso = input.material?.iso_group || "P";
    const stock = input.stock_size || this.estimateStockSize(input.features);
    const peakCuttingForce = Math.max(1, ...operations.map(op => Math.max(1, op.physics?.cutting_force_N ?? 1)));

    const largePart = Math.max(stock.x, stock.y, stock.z) >= 180;
    const highLoadMaterial = iso === "S" || iso === "H";
    const useFixturePlate = largePart || highLoadMaterial;

    const jawMaterial = highLoadMaterial || iso === "N" ? "soft_jaws" : "steel_serrated";
    const frictionCoefficient = jawMaterial === "soft_jaws" ? 0.3 : 0.25;
    const desiredSafetyFactor = 2.75;
    const loadMargin = useFixturePlate ? 1.1 : 1.0;
    const clampingForce = Math.ceil((peakCuttingForce / frictionCoefficient) * desiredSafetyFactor * loadMargin);

    return {
      type: useFixturePlate ? ("fixture_plate" as const) : ("vise" as const),
      clamping_force_N: Math.max(clampingForce, useFixturePlate ? 50000 : 25000),
      clamp_points: useFixturePlate ? 4 : 2,
      clamping_method: highLoadMaterial ? ("hydraulic" as const) : ("manual" as const),
      jaw_material: jawMaterial,
      friction_coefficient: frictionCoefficient,
    };
  }

  /**
   * Main dispatcher — routes action strings to sub-methods.
   * @param action - One of: print_to_program_full, print_to_program_plan, print_to_program_validate
   * @param params - Drawing input or program for validation
   * @returns Pipeline result
   */
  calculate(action: string, params: Record<string, unknown>): PrintToProgramResult | ProcessPlanResult | ValidationResult {
    switch (action) {
      case "print_to_program_full":
        return this.runFullPipeline(params as unknown as DrawingInput);
      case "print_to_program_plan":
        return this.runProcessPlan(params as unknown as DrawingInput);
      case "print_to_program_validate":
        return this.validateProgram(params as unknown as { program_text: string; max_spindle_rpm?: number; max_power_kW?: number });
      case "print_to_program_check_intake": {
        // Surface intake validation as standalone MCP-callable action.
        // Maps PrintToProgramResult["intake_validation"] shape to ValidationResult
        // so operators can fast-check input completeness without running the full pipeline.
        const intake = this.validateIntake(params as unknown as DrawingInput);
        const hasBlocker = intake.warnings.some(w => w.severity === "critical");
        const recs: string[] = [];
        if (intake.missing_dimensions.length > 0) {
          recs.push(`Missing dimensions: ${intake.missing_dimensions.join(", ")}`);
        }
        if (intake.ambiguous_tolerances.length > 0) {
          recs.push(`Ambiguous tolerances: ${intake.ambiguous_tolerances.join(", ")}`);
        }
        return {
          success: !hasBlocker && intake.complete,
          safety_checks: [],
          safety_pass_rate: hasBlocker ? 0 : 1,
          warnings: intake.warnings,
          recommendations: recs,
        };
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ==========================================================================
  // STAGE 1: DRAWING INTAKE & VALIDATION
  // ==========================================================================

  /**
   * Validate drawing input for completeness.
   * Flags missing dimensions, ambiguous tolerances, and incomplete material specs.
   * @param input - Raw drawing input
   * @returns Intake validation result with warnings
   */
  private validateIntake(input: DrawingInput): PrintToProgramResult["intake_validation"] {
    const missing: string[] = [];
    const ambiguous: string[] = [];
    const warnings: PipelineWarning[] = [];

    // Check material completeness
    if (!input.material?.material_name) {
      missing.push("Material not specified");
      warnings.push({ stage: "intake", severity: "critical", message: "No material callout found on drawing" });
    }
    if (!input.material?.iso_group) {
      warnings.push({ stage: "intake", severity: "warning", message: "ISO material group not determined — defaulting to P (steel)" });
    }

    // Check stock size
    if (!input.stock_size) {
      warnings.push({ stage: "intake", severity: "warning", message: "Stock size not specified — will estimate from feature extents" });
    }

    // Validate each feature
    for (const feat of input.features) {
      if (feat.depth_mm <= 0) {
        missing.push(`Feature ${feat.id}: missing or zero depth`);
      }
      if (feat.type.includes("hole") && !feat.diameter_mm) {
        missing.push(`Feature ${feat.id}: hole without diameter`);
      }
      if (feat.type === "slot" && !feat.width_mm) {
        missing.push(`Feature ${feat.id}: slot without width`);
      }
      if (feat.type.includes("thread") && !feat.thread_pitch_mm) {
        missing.push(`Feature ${feat.id}: thread without pitch`);
      }

      // Check for ambiguous tolerances
      if (feat.tolerance_mm !== undefined && feat.surface_finish_Ra_um !== undefined) {
        if (feat.tolerance_mm > 0.1 && feat.surface_finish_Ra_um < 0.8) {
          ambiguous.push(`Feature ${feat.id}: loose tolerance (${feat.tolerance_mm}mm) contradicts fine finish (Ra ${feat.surface_finish_Ra_um}µm)`);
        }
      }

      // Warn on tight tolerances
      if (feat.tolerance_mm !== undefined && feat.tolerance_mm < 0.01) {
        warnings.push({
          stage: "intake",
          severity: "warning",
          message: `Feature ${feat.id}: very tight tolerance (${feat.tolerance_mm}mm) — verify capability`,
          feature_id: feat.id,
        });
      }
    }

    // Check dimensions have tolerances
    for (const dim of input.dimensions) {
      if (!dim.tolerance && dim.type !== "angular") {
        warnings.push({
          stage: "intake",
          severity: "info",
          message: `Dimension ${dim.id}: no tolerance specified — using general tolerance`,
        });
      }
    }

    // Check for features with no operations assigned
    for (const feat of input.features) {
      if (!feat.required_operations || feat.required_operations.length === 0) {
        warnings.push({
          stage: "intake",
          severity: "info",
          message: `Feature ${feat.id}: no operations specified — will auto-assign`,
          feature_id: feat.id,
        });
      }
    }

    return {
      complete: missing.length === 0,
      missing_dimensions: missing,
      ambiguous_tolerances: ambiguous,
      warnings,
    };
  }

  // ==========================================================================
  // STAGE 2: FEATURE CLASSIFICATION & OPERATION ASSIGNMENT
  // ==========================================================================

  /**
   * Classify features and auto-assign required operations based on feature type,
   * tolerance, and surface finish requirements.
   * @param features - Input features (may have partial operation assignments)
   * @param isoGroup - Material ISO group for operation planning
   * @returns Fully classified features with operations assigned
   */
  private classifyFeatures(features: MachinableFeature[], isoGroup: string): MachinableFeature[] {
    return features.map((feat, idx) => {
      const classified = { ...feat };

      // Auto-assign priority based on feature type
      if (!classified.priority) {
        classified.priority = this.featurePriority(feat.type);
      }

      // Auto-assign operations if not specified
      if (!classified.required_operations || classified.required_operations.length === 0) {
        classified.required_operations = this.autoAssignOperations(feat);
      }

      // Upgrade operations based on tolerance/finish requirements
      classified.required_operations = this.upgradeOperationsForQuality(
        classified.required_operations, feat.tolerance_mm, feat.surface_finish_Ra_um
      );

      return classified;
    });
  }

  /**
   * Assign default priority (lower = earlier). Facing first, then holes, pockets, contours.
   */
  private featurePriority(type: DrawingFeatureType): number {
    const priorities: Record<string, number> = {
      face: 1, step: 2,
      hole_through: 3, hole_blind: 3, hole_counterbore: 3, hole_countersink: 3,
      pocket_open: 4, pocket_closed: 4, slot: 4, keyway: 4,
      contour_outside: 5, contour_inside: 5,
      bore: 6, groove: 6,
      thread_internal: 7, thread_external: 7,
      chamfer: 8, fillet: 8,
    };
    return priorities[type] ?? 5;
  }

  /**
   * Auto-assign operations based on feature type geometry.
   */
  private autoAssignOperations(feat: MachinableFeature): OperationType[] {
    switch (feat.type) {
      case "face":
        return ["face"];
      case "step":
        return ["rough", "finish"];
      case "hole_through":
      case "hole_blind":
        return feat.diameter_mm && feat.diameter_mm > 30
          ? ["drill", "bore"]
          : ["drill"];
      case "hole_counterbore":
        return ["drill", "bore"];
      case "hole_countersink":
        return ["drill", "chamfer"];
      case "pocket_open":
      case "pocket_closed":
        return ["pocket_rough", "pocket_finish"];
      case "slot":
      case "keyway":
        return ["slot"];
      case "contour_outside":
      case "contour_inside":
        return ["rough", "finish"];
      case "bore":
        return ["rough", "semi_finish", "finish"];
      case "groove":
        return ["rough", "finish"];
      case "thread_internal":
        return feat.diameter_mm && feat.diameter_mm < 20
          ? ["drill", "tap"]
          : ["drill", "thread_mill"];
      case "thread_external":
        return ["rough", "thread_mill"];
      case "chamfer":
        return ["chamfer"];
      case "fillet":
        return ["finish"];
      default:
        return ["rough", "finish"];
    }
  }

  /**
   * Upgrade operation sequence for tight tolerances or fine surface finish.
   * Adds semi-finish pass when tolerance < 0.05mm or Ra < 1.6µm.
   */
  private upgradeOperationsForQuality(
    ops: OperationType[],
    tolerance_mm?: number,
    Ra_um?: number,
  ): OperationType[] {
    const needsSemiFinish =
      (tolerance_mm !== undefined && tolerance_mm < 0.05) ||
      (Ra_um !== undefined && Ra_um < 1.6);

    if (needsSemiFinish && ops.includes("rough") && ops.includes("finish") && !ops.includes("semi_finish")) {
      const idx = ops.indexOf("finish");
      const upgraded = [...ops];
      upgraded.splice(idx, 0, "semi_finish");
      return upgraded;
    }

    // For pockets, add semi if tight
    if (needsSemiFinish && ops.includes("pocket_rough") && ops.includes("pocket_finish") && !ops.includes("semi_finish")) {
      const idx = ops.indexOf("pocket_finish");
      const upgraded = [...ops];
      upgraded.splice(idx, 0, "semi_finish");
      return upgraded;
    }

    return ops;
  }

  // ==========================================================================
  // STAGE 3: PROCESS PLANNING — TOOL SELECTION & S/F CALCULATION
  // ==========================================================================

  /**
   * Generate complete process plan: select tools, calculate cutting parameters
   * with physics, estimate cycle times.
   * @param features - Classified features with operations
   * @param mat - Material callout
   * @param maxRPM - Machine spindle RPM limit
   * @param maxPower - Machine power limit (kW)
   * @param target - Optimization target
   * @returns Ordered list of planned operations
   */
  private generateProcessPlan(
    features: MachinableFeature[],
    mat: MaterialCallout,
    maxRPM: number,
    maxPower: number,
    target: string,
  ): PlannedOperation[] {
    // Store context for selectTool's SmartToolSelector integration
    this._currentMaterial = mat;
    this._currentMaxRPM = maxRPM;
    this._currentMaxPower = maxPower;
    this._currentTarget = target;

    const iso = mat.iso_group || "P";

    // U-ARCH3: Material-specific physics lookup from CANONICAL_MATERIAL_DB (13 materials,
    // synchronous) instead of ISO group averages. Also fires async MaterialRegistry
    // (2.9K materials) resolution to cache for subsequent calls within this instance.
    // Sync lookup guarantees material-specific values on FIRST call — no race condition.
    const matKey = mat.material_name?.toLowerCase().replace(/[^a-z0-9]/g, "_") ?? "";
    const canonicalMat = CANONICAL_MATERIAL_DB[matKey]
      ?? Object.values(CANONICAL_MATERIAL_DB).find(m =>
        m.name.toLowerCase().includes(mat.material_name?.toLowerCase() ?? "")
        || (mat.material_name?.toLowerCase() ?? "").includes(m.name.toLowerCase().split(" ")[0])
      );

    // Async registry enrichment for future calls (non-blocking, populates cache)
    if (!this._resolvedMaterial) {
      resolveMaterial({ material_name: mat.material_name, iso_group: iso as any })
        .then(rm => { this._resolvedMaterial = rm; })
        .catch(() => { /* fallback to canonical — already handled below */ });
    }

    // Priority: cached registry > sync canonical DB match > ISO group defaults
    const rm = this._resolvedMaterial;
    const kienzle = rm ? { kc1_1: rm.kc1_1, mc: rm.mc }
      : canonicalMat ? { kc1_1: canonicalMat.kc1_1, mc: canonicalMat.mc }
      : (KIENZLE_DB[iso] || KIENZLE_DB.P);
    const taylor = rm ? { C: rm.taylor_C, n: rm.taylor_n }
      : canonicalMat ? { C: canonicalMat.taylor_C, n: canonicalMat.taylor_n }
      : (TAYLOR_DB[iso] || TAYLOR_DB.P);
    const speedRange = SPEED_RANGES[iso] || SPEED_RANGES.P;
    const feedRange = FEED_RANGES[iso] || FEED_RANGES.P;
    const operations: PlannedOperation[] = [];
    let opNumber = 1;
    let toolNumber = 1;
    const toolMap = new Map<string, SelectedTool>();

    // --- Try IntelligentSequencingEngine for optimal sequencing (U08) ---
    let sorted: MachinableFeature[];
    const ise = getIntelligentSequencingEngine();
    if (ise) {
      try {
        // Map features to SequenceableOp format
        const seqOps = features.map((feat, i) => ({
          id: feat.id || `feat_${i}`,
          type: feat.type,
          operation: feat.required_operations[0] || "rough",
          tool_diameter_mm: feat.diameter_mm || feat.width_mm,
          position: feat.position,
          depth_mm: feat.depth_mm,
          is_datum: feat.type === "face",
        }));
        const seqResult = ise.sequence(seqOps);
        if (seqResult?.operations?.length === features.length) {
          // Re-order features to match sequencing engine's order
          const idOrder = new Map<string, number>(seqResult.operations.map((op: any, idx: number) => [op.id as string, idx as number]));
          sorted = [...features].sort((a, b) => {
            const ia = idOrder.get(a.id) ?? 999;
            const ib = idOrder.get(b.id) ?? 999;
            return ia - ib;
          });
          log.info?.(`IntelligentSequencingEngine: ${seqResult.rules_applied?.length ?? 0} rules, ${seqResult.tool_changes} tool changes, quality=${seqResult.sequence_quality_score}`);

          // Validate against workflow templates (fire-and-forget, non-blocking)
          const opNames = seqResult.operations.map((op: any) => op.operation || op.type);
          ise.validateAgainstTemplates?.("3d_milling", opNames)?.then((validation: any) => {
            if (validation && validation.coverage_pct < 70) {
              log.warn?.(`Workflow template coverage: ${validation.coverage_pct}%. Missing: ${validation.missing_steps.slice(0, 3).join(", ")}`);
            }
          }).catch(() => { /* template validation optional */ });
        } else {
          sorted = [...features].sort((a, b) => a.priority - b.priority);
        }
      } catch {
        sorted = [...features].sort((a, b) => a.priority - b.priority);
      }
    } else {
      // Fallback: sort by hardcoded priority table
      sorted = [...features].sort((a, b) => a.priority - b.priority);
    }

    for (const feat of sorted) {
      for (const opType of feat.required_operations) {
        // Select or reuse tool
        const toolKey = this.toolKeyForOp(opType, feat);
        let tool = toolMap.get(toolKey);
        if (!tool) {
          tool = this.selectTool(opType, feat, toolNumber);
          toolMap.set(toolKey, tool);
          toolNumber++;
        }

        // Determine if this is a roughing or finishing pass
        const isRough = opType.includes("rough") || opType === "drill" || opType === "face" || opType === "slot";
        const isFinish = opType.includes("finish") || opType === "ream" || opType === "bore";
        const isSemiFinish = opType === "semi_finish";

        // Calculate cutting speed
        let Vc: number;
        if (isRough) Vc = speedRange.rough;
        else if (isFinish) Vc = speedRange.finish;
        else if (isSemiFinish) Vc = (speedRange.rough + speedRange.finish) / 2;
        else Vc = speedRange.rough * 0.8;

        // Optimize for target
        if (target === "max_speed") Vc *= 1.15;
        else if (target === "max_tool_life") Vc *= 0.80;
        else if (target === "surface_quality" && isFinish) Vc *= 1.10;

        // RPM
        let rpm = rpmFromVc(Vc, tool.diameter_mm);
        rpm = Math.min(rpm, maxRPM);

        // Feed per tooth
        let fz = isRough ? feedRange.rough : isFinish ? feedRange.finish : (feedRange.rough + feedRange.finish) / 2;
        if (target === "surface_quality" && isFinish) fz *= 0.7;
        if (target === "max_speed" && isRough) fz *= 1.1;

        // Feed rate
        let feedMmMin = Math.round(fz * tool.flutes * rpm);

        // Depth and width of cut
        const { ap, ae } = this.calculateEngagement(opType, feat, tool);

        // Number of passes
        const totalDepth = feat.depth_mm || 10;
        const passes = Math.max(1, Math.ceil(totalDepth / ap));

        // Actual cutting speed at calculated RPM
        const actualVc = (Math.PI * tool.diameter_mm * rpm) / 1000;

        // === PHYSICS ===

        // Kienzle cutting force (per tooth)
        let Fc_tooth = kienzleForce(kienzle.kc1_1, kienzle.mc, ap, fz);
        // Total force (all teeth in cut)
        let teethInCut = Math.max(1, Math.ceil(tool.flutes * (ae / (Math.PI * tool.diameter_mm))));
        let Fc_total = Fc_tooth * teethInCut;

        // Power: P = Fc × Vc / (60 × 1000)
        let power = (Fc_total * actualVc) / 60000;

        // Check power limit — reduce if needed
        if (power > maxPower * 0.85) {
          const reductionFactor = (maxPower * 0.85) / power;
          fz *= reductionFactor;
          feedMmMin = Math.max(1, Math.round(fz * tool.flutes * rpm));

          // Recompute the stored physics so they reflect the reduced feed.
          Fc_tooth = kienzleForce(kienzle.kc1_1, kienzle.mc, ap, fz);
          teethInCut = Math.max(1, Math.ceil(tool.flutes * (ae / (Math.PI * tool.diameter_mm))));
          Fc_total = Fc_tooth * teethInCut;
          power = (Fc_total * actualVc) / 60000;
        }

        // Torque: T = Fc × D / (2 × 1000)
        let torque = (Fc_total * tool.diameter_mm) / 2000;

        // Taylor tool life
        const toolLife = taylorLife(taylor.C, taylor.n, actualVc);

        // Tool deflection
        let deflection = toolDeflection(Fc_total, tool.stick_out_mm, tool.diameter_mm);

        // Predicted surface finish
        let Ra = predictedRa(fz, tool.corner_radius_mm || 0.4);

        // MRR
        let mrrVal = mrr(ap, ae, feedMmMin);

        // Cycle time estimate (simplified)
        const cutLength = this.estimateCutLength(feat, opType);
        let cycleTimeSec = (cutLength * passes) / feedMmMin * 60 + passes * 3; // 3s per approach

        // Determine approach strategy
        const approach = this.selectApproach(opType, feat);

        // Coolant strategy
        const coolant = this.selectCoolant(iso, opType, tool);

        // Build notes
        const notes: string[] = [];
        // Add tool selection rationale if available (from SmartToolSelector or CoatingSelector)
        if ((tool as any)._rationale) {
          notes.push((tool as any)._rationale);
        }
        if (deflection > 0.05) notes.push(`Tool deflection ${deflection.toFixed(3)}mm — verify finish tolerance`);
        if (toolLife < 15) notes.push(`Short tool life ${toolLife.toFixed(1)}min — consider speed reduction`);
        if (power > maxPower * 0.7) notes.push(`High power usage ${(power / maxPower * 100).toFixed(0)}%`);
        if (Ra > (feat.surface_finish_Ra_um || 3.2) && isFinish) {
          notes.push(`Predicted Ra ${Ra.toFixed(2)}µm exceeds requirement ${feat.surface_finish_Ra_um}µm — reduce fz`);
        }

        operations.push({
          op_number: opNumber++,
          feature_id: feat.id,
          operation_type: opType,
          tool,
          cutting_params: {
            spindle_rpm: rpm,
            feed_mm_min: Math.round(feedMmMin),
            feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
            depth_of_cut_mm: Math.round(ap * 100) / 100,
            width_of_cut_mm: Math.round(ae * 100) / 100,
            cutting_speed_m_min: Math.round(actualVc * 10) / 10,
          },
          physics: {
            cutting_force_N: Math.round(Fc_total),
            power_kW: Math.round(power * 100) / 100,
            torque_Nm: Math.round(torque * 100) / 100,
            tool_life_min: Math.round(toolLife * 10) / 10,
            deflection_mm: Math.round(deflection * 1000) / 1000,
            predicted_Ra_um: Math.round(Ra * 100) / 100,
            mrr_mm3_min: Math.round(mrrVal),
          },
          cycle_time_sec: Math.round(cycleTimeSec * 10) / 10,
          passes,
          approach,
          position: feat.position,
          feature_dims: { width_mm: feat.width_mm, length_mm: feat.length_mm, depth_mm: feat.depth_mm, diameter_mm: feat.diameter_mm },
          coolant,
          notes,
        });
      }
    }

    return operations;
  }

  /**
   * Generate a tool key for deduplication — same tool type + diameter = reuse.
   */
  private toolKeyForOp(opType: OperationType, feat: MachinableFeature): string {
    const diam = this.idealToolDiameter(opType, feat);
    return `${opType}_d${diam}`;
  }

  /**
   * Determine ideal tool diameter for a given operation and feature.
   */
  private idealToolDiameter(opType: OperationType, feat: MachinableFeature): number {
    switch (opType) {
      case "face":
        return 50; // face mill
      case "drill":
      case "ream":
      case "tap":
        return feat.diameter_mm || 10;
      case "bore":
        return (feat.diameter_mm || 20) - 2; // boring bar smaller than hole
      case "rough":
      case "pocket_rough":
        // Tool diameter ~ 60-70% of pocket width or feature width
        if (feat.width_mm) return Math.min(Math.round(feat.width_mm * 0.6), 25);
        return 16;
      case "semi_finish":
      case "finish":
      case "pocket_finish":
      case "contour":
        if (feat.corner_radius_mm) return Math.min(feat.corner_radius_mm * 2, 12);
        if (feat.width_mm) return Math.min(Math.round(feat.width_mm * 0.4), 12);
        return 10;
      case "slot":
        return feat.width_mm || 10;
      case "chamfer":
        return 10; // chamfer mill
      case "thread_mill":
        return (feat.diameter_mm || 12) * 0.6;
      default:
        return 12;
    }
  }

  /**
   * Select the best tool for a given operation and feature.
   * Tries SmartToolSelectorEngine (95K catalog) first, falls back to synthetic tool.
   * Also tries CoatingSelectionEngine for coating instead of hardcoded TiAlN.
   */
  private selectTool(opType: OperationType, feat: MachinableFeature, toolNum: number): SelectedTool {
    // --- Try SmartToolSelectorEngine (catalog-backed selection) ---
    const smartSelector = getSmartToolSelector();
    if (smartSelector && this._currentMaterial) {
      try {
        const optimGoalMap: Record<string, string> = {
          balanced: "balanced",
          max_speed: "speed",
          max_tool_life: "tool_life",
          min_cost: "cost",
          surface_quality: "surface_finish",
        };
        const result = smartSelector.select({
          operation_type: opType,
          material_iso_group: this._currentMaterial.iso_group || "P",
          material_name: this._currentMaterial.material_name,
          material_hardness_hrc: this._currentMaterial.hardness_hrc,
          machine_name: this._currentMachineBrand && this._currentMachineModel
            ? `${this._currentMachineBrand} ${this._currentMachineModel}` : undefined,
          max_rpm: this._currentMaxRPM,
          max_power_kw: this._currentMaxPower,
          feature_diameter_mm: feat.diameter_mm,
          feature_depth_mm: feat.depth_mm,
          feature_width_mm: feat.width_mm,
          corner_radius_mm: feat.corner_radius_mm,
          tolerance_mm: feat.tolerance_mm,
          surface_finish_Ra: feat.surface_finish_Ra_um,
          optimize_for: (optimGoalMap[this._currentTarget] || "balanced") as any,
          max_results: 1,
        });

        if (result?.best_tool) {
          const bt = result.best_tool;
          const toolType = this.toolTypeForOp(opType);
          const fluteLen = bt.flute_length_mm || Math.max((bt.diameter_mm || 12) * 2, (feat.depth_mm || 10) + 2);
          const stickOut = fluteLen + (bt.diameter_mm || 12);
          const cornerR = (toolType === "ball_endmill") ? (bt.diameter_mm || 12) / 2 :
            (toolType === "bull_nose") ? Math.min(2, (bt.diameter_mm || 12) * 0.15) : 0;

          // Build rationale note for operation
          const rationale = bt.rationale?.length
            ? `SmartToolSelector: ${bt.designation || bt.tool_id} (score ${(bt.score * 100).toFixed(0)}%) — ${bt.rationale.join("; ")}`
            : `SmartToolSelector: ${bt.designation || bt.tool_id} (score ${(bt.score * 100).toFixed(0)}%)`;

          const selected: SelectedTool & { _rationale?: string } = {
            tool_number: toolNum,
            tool_type: toolType,
            diameter_mm: Math.round((bt.diameter_mm || 12) * 10) / 10,
            flutes: bt.flute_count || this.flutesForToolType(toolType, bt.diameter_mm || 12),
            flute_length_mm: Math.round(fluteLen),
            corner_radius_mm: cornerR,
            material: "carbide",
            coating: bt.coating || "TiAlN",
            stick_out_mm: Math.round(stickOut),
            holder_type: (bt.diameter_mm || 12) <= 20 ? "ER32" : "BT40",
            _rationale: rationale,
          };

          log.info(`[PrintToProgramPipeline] SmartToolSelector picked ${bt.designation || bt.tool_id} for ${opType}`);
          return selected;
        }
      } catch (err: any) {
        log.warn(`[PrintToProgramPipeline] SmartToolSelector failed for ${opType}, falling back to synthetic: ${err?.message || err}`);
      }
    }

    // --- Fallback: synthetic tool from fixed ratios ---
    const diam = this.idealToolDiameter(opType, feat);
    const toolType = this.toolTypeForOp(opType);
    const flutes = this.flutesForToolType(toolType, diam);
    const fluteLen = Math.max(diam * 2, (feat.depth_mm || 10) + 2);
    const stickOut = fluteLen + diam;
    const cornerR = (toolType === "ball_endmill") ? diam / 2 :
      (toolType === "bull_nose") ? Math.min(2, diam * 0.15) : 0;

    // --- Try CoatingSelectionEngine instead of hardcoded TiAlN ---
    let coating = "TiAlN";
    let coatingRationale = "";
    const coatingSelector = getCoatingSelector();
    if (coatingSelector && this._currentMaterial) {
      try {
        const iso = this._currentMaterial.iso_group || "P";
        const isRough = opType.includes("rough") || opType === "drill" || opType === "face" || opType === "slot";
        const coatingOp = isRough ? "roughing" : "finishing";
        const speedRange = SPEED_RANGES[iso] || SPEED_RANGES.P;
        const speed = isRough ? speedRange.rough : speedRange.finish;
        const coatingResult = coatingSelector.calculate({
          iso_group: iso,
          operation: coatingOp,
          speed_range: speed <= 150 ? "low" : speed <= 400 ? "medium" : "high",
          coolant: "flood",
          substrate: "carbide",
        });
        if (coatingResult?.coating) {
          coating = coatingResult.coating;
          coatingRationale = coatingResult.reasoning?.join("; ") || "";
        }
      } catch {
        // Keep TiAlN default
      }
    }

    const selected: SelectedTool & { _rationale?: string } = {
      tool_number: toolNum,
      tool_type: toolType,
      diameter_mm: Math.round(diam * 10) / 10,
      flutes,
      flute_length_mm: Math.round(fluteLen),
      corner_radius_mm: cornerR,
      material: "carbide",
      coating,
      stick_out_mm: Math.round(stickOut),
      holder_type: diam <= 20 ? "ER32" : "BT40",
      _rationale: coatingRationale ? `Synthetic tool, coating via CoatingSelectionEngine: ${coating} — ${coatingRationale}` : undefined,
    };
    return selected;
  }

  /**
   * Map operation type to tool type.
   */
  private toolTypeForOp(opType: OperationType): ProgramToolType {
    switch (opType) {
      case "face": return "face_mill";
      case "drill": return "drill";
      case "ream": return "reamer";
      case "tap": return "tap";
      case "bore": return "boring_bar";
      case "chamfer": return "chamfer_mill";
      case "thread_mill": return "thread_mill";
      case "slot": return "slot_drill";
      case "rough":
      case "pocket_rough":
        return "flat_endmill";
      case "semi_finish":
        return "flat_endmill";
      case "finish":
      case "pocket_finish":
      case "contour":
        return "bull_nose";
      default:
        return "flat_endmill";
    }
  }

  /**
   * Standard flute count by tool type and size.
   */
  private flutesForToolType(type: ProgramToolType, diam: number): number {
    switch (type) {
      case "face_mill": return diam > 40 ? 6 : 4;
      case "drill": return 2;
      case "reamer": return 6;
      case "tap": return 3;
      case "boring_bar": return 1;
      case "chamfer_mill": return 3;
      case "thread_mill": return 3;
      case "slot_drill": return 2;
      case "flat_endmill": return diam >= 16 ? 4 : 3;
      case "bull_nose": return diam >= 12 ? 4 : 3;
      case "ball_endmill": return 2;
      default: return 3;
    }
  }

  /**
   * Calculate engagement (ap, ae) based on operation type.
   */
  private calculateEngagement(
    opType: OperationType,
    feat: MachinableFeature,
    tool: SelectedTool,
  ): { ap: number; ae: number } {
    const D = tool.diameter_mm;
    switch (opType) {
      case "face":
        return { ap: 2.0, ae: D * 0.65 };
      case "rough":
      case "pocket_rough":
        return { ap: Math.min(D * 0.8, feat.depth_mm || D), ae: D * 0.5 };
      case "semi_finish":
        return { ap: Math.min(D * 0.3, feat.depth_mm || D * 0.3), ae: D * 0.3 };
      case "finish":
      case "pocket_finish":
      case "contour":
        return { ap: Math.min(D * 0.15, feat.depth_mm || D * 0.15), ae: D * 0.1 };
      case "drill":
        return { ap: D / 2, ae: D }; // full diameter engagement
      case "ream":
        return { ap: 0.1, ae: D };
      case "bore":
        return { ap: 0.5, ae: 0.5 };
      case "tap":
        return { ap: feat.thread_pitch_mm || 1.5, ae: D };
      case "slot":
        return { ap: Math.min(D * 0.5, feat.depth_mm || D * 0.5), ae: feat.width_mm || D };
      case "chamfer":
        return { ap: 1.0, ae: 1.0 };
      case "thread_mill":
        return { ap: feat.thread_pitch_mm || 1.5, ae: 0.5 };
      default:
        return { ap: D * 0.3, ae: D * 0.3 };
    }
  }

  /**
   * Estimate total cut length for a feature + operation (mm).
   */
  private estimateCutLength(feat: MachinableFeature, opType: OperationType): number {
    switch (opType) {
      case "face":
        return (feat.length_mm || 100) * 1.2;
      case "drill":
      case "ream":
      case "bore":
      case "tap":
        return feat.depth_mm || 20;
      case "pocket_rough":
      case "pocket_finish":
        // Estimate zig-zag cut length from area
        return ((feat.width_mm || 50) * (feat.length_mm || 50)) / 10;
      case "slot":
        return feat.length_mm || 50;
      case "contour":
      case "rough":
      case "finish":
      case "semi_finish":
        // Perimeter estimate
        return ((feat.width_mm || 50) + (feat.length_mm || 50)) * 2;
      case "chamfer":
        return feat.diameter_mm ? Math.PI * feat.diameter_mm : 30;
      case "thread_mill":
        return feat.diameter_mm ? Math.PI * feat.diameter_mm * (feat.depth_mm || 10) / (feat.thread_pitch_mm || 1.5) : 50;
      default:
        return 100;
    }
  }

  /**
   * Select approach strategy based on operation and feature.
   */
  private selectApproach(opType: OperationType, feat: MachinableFeature): PlannedOperation["approach"] {
    // --- Try EntryExitStrategyEngine first (U07) ---
    const eese = getEntryExitStrategyEngine();
    if (eese) {
      try {
        const toolDiam = feat.diameter_mm || feat.width_mm || 10;
        const input = {
          tool_diameter: toolDiam,
          pocket_width: feat.width_mm,
          pocket_depth: feat.depth_mm || 10,
          material: this._currentMaterial?.iso_group,
          center_cutting: opType === "drill" || opType === "bore",
        };
        const result = eese.selectEntry(input);
        if (result?.recommended_method) {
          const methodMap: Record<string, PlannedOperation["approach"]> = {
            helical: "helical", ramp: "ramp", plunge: "plunge",
            pre_drill: "plunge", arc_in: "ramp", direct: "direct",
          };
          const mapped = methodMap[result.recommended_method] ?? "direct";
          // Store feed_factor on current context for caller to pick up
          if (result.feed_factor && result.feed_factor !== 1) {
            (this as any)._lastEntryFeedFactor = result.feed_factor;
          }
          return mapped;
        }
      } catch {
        // Fall through to hardcoded logic
      }
    }

    // Fallback: hardcoded table
    switch (opType) {
      case "drill":
      case "ream":
      case "tap":
      case "bore":
        return "plunge";
      case "pocket_rough":
        return "helical";
      case "pocket_finish":
      case "contour":
      case "finish":
        return "ramp";
      default:
        return "direct";
    }
  }

  /**
   * Select coolant strategy based on material and operation.
   */
  private selectCoolant(iso: string, opType: OperationType, tool: SelectedTool): PlannedOperation["coolant"] {
    // --- Try CoolantStrategyEngine first (U06) ---
    const cse = getCoolantStrategyEngine();
    if (cse) {
      try {
        // Map ISO group to CoolantMaterial
        const isoToMaterial: Record<string, string> = {
          P: "carbon_steel", M: "stainless_steel", K: "cast_iron",
          N: "aluminum", S: "nickel_alloy", H: "hardened_steel",
        };
        // Map OperationType to CoolantOperation
        const opMap: Record<string, string> = {
          face: "milling_rough", rough: "milling_rough", semi_finish: "milling_finish",
          finish: "milling_finish", drill: "drilling", ream: "reaming",
          bore: "boring", tap: "tapping", chamfer: "milling_finish",
          thread_mill: "thread_milling", slot: "milling_rough",
          contour: "milling_finish", pocket_rough: "milling_rough", pocket_finish: "milling_finish",
        };
        const csInput = {
          workpiece_material: isoToMaterial[iso] || "carbon_steel",
          operation: opMap[opType] || "milling_rough",
          tool_has_through_coolant: tool.flute_length_mm > tool.diameter_mm * 4,
        };
        const result = cse.calculate(csInput);
        // Map CoolantMethod to PlannedOperation coolant type
        const methodMap: Record<string, PlannedOperation["coolant"]> = {
          flood: "flood", through_spindle: "through_tool", through_tool: "through_tool",
          mql: "mist", air_blast: "air", dry: "off",
          cryogenic_co2: "flood", cryogenic_ln2: "flood",
        };
        return methodMap[result.primary_method] ?? "flood";
      } catch {
        // Fall through to existing logic
      }
    }

    // --- Fallback: original if/else rules ---
    // Through-tool for deep holes
    if ((opType === "drill" || opType === "bore") && tool.flute_length_mm > tool.diameter_mm * 4) {
      return "through_tool";
    }
    // Aluminum prefers mist
    if (iso === "N") return "mist";
    // Superalloys need flood
    if (iso === "S" || iso === "H") return "flood";
    // Tapping always flood
    if (opType === "tap") return "flood";
    // Default flood
    return "flood";
  }

  // ==========================================================================
  // STAGE 4: PROGRAM GENERATION
  // ==========================================================================

  /**
   * Generate complete G-code program from planned operations.
   * Includes safe startup, tool changes, work coordinates, coolant control,
   * cutting passes, and safe shutdown.
   * @param operations - Planned operations from Stage 3
   * @param input - Drawing input for header info
   * @returns Array of program blocks and full text
   */
  /**
   * Map a drawing machine brand to a ProbeRoutineGeneratorEngine controller
   * dialect. Defaults to "fanuc" (most common macro-B base) when the brand is
   * absent or unrecognized — exit condition: "Controller-specific probe macros".
   */
  private mapBrandToProbeController(brand?: string): ProbeController {
    const b = (brand || "").toLowerCase();
    if (b.includes("haas")) return "haas";
    if (b.includes("siemens") || b.includes("sinumerik")) return "siemens";
    if (b.includes("heidenhain") || b.includes("tnc")) return "heidenhain";
    if (b.includes("mazak") || b.includes("mazatrol")) return "mazak";
    if (b.includes("okuma") || b.includes("osp")) return "okuma";
    // fanuc / haas-on-fanuc / generic macro-B
    return "fanuc";
  }

  /**
   * U-CAMX24 — Map a drawing machine brand to a SetupSheetFromGCodeEngine
   * controller dialect. Mirrors {@link mapBrandToProbeController}'s lookup
   * order so the two reverse-engineered artifacts (probe macros + setup sheet)
   * speak the same dialect for the same machine. Defaults to "fanuc" — the
   * dialect that subsumes haas / mazak-fanuc / generic macro-B controllers —
   * when the brand is absent or unrecognized. Note: SetupSheetFromGCodeEngine
   * exposes `ControllerType = fanuc|siemens|haas|mazak|okuma|heidenhain|generic`
   * (a strict subset of ProbeController's options); a Haas brand resolves to
   * "haas" here even though the probe mapper would also accept "fanuc".
   */
  private mapBrandToGCodeController(brand?: string): GCodeControllerType {
    const b = (brand || "").toLowerCase();
    if (b.includes("haas")) return "haas";
    if (b.includes("siemens") || b.includes("sinumerik")) return "siemens";
    if (b.includes("heidenhain") || b.includes("tnc")) return "heidenhain";
    if (b.includes("mazak") || b.includes("mazatrol")) return "mazak";
    if (b.includes("okuma") || b.includes("osp")) return "okuma";
    // fanuc / generic macro-B fallback (most common; subsumes haas-on-fanuc-base)
    return "fanuc";
  }

  /**
   * U-CAMX08 — Apply IntelligentSequencingEngine to reorder a planned-ops
   * array. Returns the (possibly reordered) ops + a `reordered` flag that
   * tells the caller whether to swap in the new order.
   *
   * Maps PlannedOperation → SequenceableOp (lossy projection — only the fields
   * the sequencer actually uses). The engine returns a permutation of the
   * SequenceableOps by `id`; we re-stitch the original PlannedOperation
   * instances back in that order so no field is dropped.
   *
   * Fail-soft (R12): if the engine throws or returns a non-permutation
   * (different size, missing id), the original ops are kept verbatim and a
   * warning is logged but no exception escapes — the pipeline must keep
   * running with a working (if suboptimal) ordering.
   */
  private applyIntelligentSequencing(ops: PlannedOperation[]): {
    operations: PlannedOperation[];
    reordered: boolean;
    metrics: { tool_changes: number; savings_pct: number; quality_score: number; rules_applied: string[]; warnings: string[] };
  } {
    const emptyMetrics = {
      tool_changes: 0, savings_pct: 0, quality_score: 0,
      rules_applied: [] as string[], warnings: [] as string[],
    };
    if (!Array.isArray(ops) || ops.length <= 1) {
      return { operations: ops, reordered: false, metrics: emptyMetrics };
    }
    // Project PlannedOperation → SequenceableOp. The engine only consults a
    // small subset of fields (type/operation/phase/tool_diameter_mm/tool_id/
    // position/depth_mm/force_estimate_N/setup_id). Use a stable string id so
    // the re-stitch step finds each original op by reference.
    const seqInput = ops.map((op, idx) => ({
      id: `op-${idx}`,
      type: op.operation_type,
      operation: op.operation_type,
      tool_diameter_mm: op.tool?.diameter_mm,
      tool_id: op.tool?.tool_number != null ? `T${op.tool.tool_number}` : undefined,
      position: op.position,
      depth_mm: op.cutting_params?.depth_of_cut_mm,
      force_estimate_N: op.physics?.cutting_force_N,
      estimated_time_s: op.cycle_time_sec,
    }));
    let seqResult;
    try {
      seqResult = intelligentSequencingEngine.sequence(seqInput);
    } catch (err) {
      return {
        operations: ops, reordered: false,
        metrics: { ...emptyMetrics, warnings: [`U-CAMX08 sequencing failed: ${(err as Error)?.message || String(err)}`] },
      };
    }
    if (!Array.isArray(seqResult.operations) || seqResult.operations.length !== ops.length) {
      // Sequencer dropped or added ops — refuse the result (R12: never silently
      // lose a planned operation, even if the optimized order would be faster).
      return {
        operations: ops, reordered: false,
        metrics: { ...emptyMetrics, warnings: ["U-CAMX08 sequencer returned non-permutation; original order preserved"] },
      };
    }
    // Re-stitch in the sequenced order by id.
    const byId = new Map<string, PlannedOperation>();
    for (let i = 0; i < ops.length; i++) byId.set(`op-${i}`, ops[i]);
    const reordered: PlannedOperation[] = [];
    // Defend against duplicate-id + dropped-id pathology: the length check
    // above would pass if the sequencer returned [op-0, op-0, op-2, op-3]
    // (length 4 with one dup and one missing). Track seen ids and refuse on
    // any duplicate — preserves the original order. (Reviewer B P1 fix 2026-05-18.)
    const seenIds = new Set<string>();
    let duplicateSeen = false;
    for (const so of seqResult.operations) {
      if (seenIds.has(so.id)) { duplicateSeen = true; break; }
      seenIds.add(so.id);
      const orig = byId.get(so.id);
      if (orig) reordered.push(orig);
    }
    if (duplicateSeen) {
      return {
        operations: ops, reordered: false,
        metrics: { ...emptyMetrics, warnings: ["U-CAMX08 sequencer returned duplicate id; original order preserved"] },
      };
    }
    if (reordered.length !== ops.length) {
      return {
        operations: ops, reordered: false,
        metrics: { ...emptyMetrics, warnings: ["U-CAMX08 sequencer returned unmapped id; original order preserved"] },
      };
    }
    // Re-number op_number to match the new order — downstream code uses it
    // for "Op N" comments and chatter-check labels.
    for (let i = 0; i < reordered.length; i++) {
      reordered[i] = { ...reordered[i], op_number: i + 1 };
    }
    // Detect whether anything actually changed (cheap: compare ids in order).
    let changed = false;
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] !== reordered[i]) { changed = true; break; }
    }
    return {
      operations: reordered,
      reordered: changed,
      metrics: {
        tool_changes: seqResult.tool_changes,
        savings_pct: seqResult.tool_change_savings_pct,
        quality_score: seqResult.sequence_quality_score,
        rules_applied: seqResult.rules_applied,
        warnings: seqResult.warnings,
      },
    };
  }

  /**
   * U-CAMX07 — Map a free-form drawing material name to the
   * EntryExitStrategyEngine key. The engine's MATERIAL_ENTRY_DEFAULTS table
   * is keyed on coarse families (aluminum / brass / mild_steel / alloy_steel /
   * stainless / titanium / inconel / cast_iron / hardened_steel); ISO P/M/K/N/S/H
   * groups land on the closest family. Defaults to mild_steel (most-conservative
   * generic ferrous defaults) when the brand is unknown — never throws.
   */
  private mapMaterialToEntryStrategy(materialName?: string, isoGroup?: string): string {
    const n = (materialName || "").toLowerCase();
    if (n.includes("alumin") || n.includes("6061") || n.includes("7075")) return "aluminum";
    if (n.includes("brass") || n.includes("bronze") || n.includes("copper")) return "brass";
    if (n.includes("titan")) return "titanium";
    if (n.includes("inconel") || n.includes("hastelloy") || n.includes("waspaloy")) return "inconel";
    if (n.includes("cast iron") || n.includes("cast-iron") || n.includes("gray iron")) return "cast_iron";
    if (n.includes("stainless") || n.includes("304") || n.includes("316") || n.includes("17-4")) return "stainless";
    if (n.includes("hardened") || n.includes("tool steel") || n.includes("d2") || n.includes("a2") || n.includes("h13")) return "hardened_steel";
    if (n.includes("alloy steel") || n.includes("4140") || n.includes("4340") || n.includes("8620")) return "alloy_steel";
    if (n.includes("steel") || n.includes("1018") || n.includes("1045") || n.includes("a36")) return "mild_steel";
    // ISO-group fallback when name is unrecognized.
    switch ((isoGroup || "").toUpperCase()) {
      case "N": return "aluminum";     // non-ferrous
      case "K": return "cast_iron";
      case "M": return "stainless";
      case "S": return "inconel";      // superalloys
      case "H": return "hardened_steel";
      case "P":
      default:  return "mild_steel";
    }
  }


  /**
   * Map a classified drawing feature type to the closest probe-cycle geometry
   * understood by ProbeRoutineGeneratorEngine.generatePartInspection().
   */
  private mapFeatureToProbeType(t: DrawingFeatureType): ProbeFeature["type"] {
    switch (t) {
      case "bore":
      case "hole_through":
      case "hole_blind":
      case "hole_counterbore":
      case "hole_countersink":
        return "bore";
      case "contour_outside":
      case "step":
        return "boss";
      case "contour_inside":
      case "pocket_open":
      case "pocket_closed":
      case "face":
      case "fillet":
      case "chamfer":
        return "surface";
      case "groove":
      case "keyway":
      case "slot":
        return "groove";
      default:
        return "surface";
    }
  }

  /**
   * U-CAMX23 — decide whether a feature needs in-process probing.
   * Critical iff drawing tolerance < 0.025mm OR surface finish Ra < 0.8µm
   * (strict `<` per spec: "tolerance < 0.025mm or Ra < 0.8um").
   */
  private featureNeedsInProcessProbe(feat: MachinableFeature | undefined): boolean {
    if (!feat) return false;
    const tightTol =
      feat.tolerance_mm !== undefined &&
      Number.isFinite(feat.tolerance_mm) &&
      feat.tolerance_mm < 0.025;
    const fineFinish =
      feat.surface_finish_Ra_um !== undefined &&
      Number.isFinite(feat.surface_finish_Ra_um) &&
      feat.surface_finish_Ra_um < 0.8;
    return tightTol || fineFinish;
  }

  private generateProgram(
    operations: PlannedOperation[],
    input: DrawingInput,
  ): { blocks: ProgramBlock[]; text: string } {
    const blocks: ProgramBlock[] = [];
    let lineNum = 10;

    const addLine = (code: string, comment?: string) => {
      blocks.push({ line_number: lineNum, code, comment });
      lineNum += 10;
    };

    // === Program header ===
    addLine("%", "Program start");
    addLine(`O0001`, `Print-to-Program: ${input.part_number || "PART"}`);
    addLine(`(MATERIAL: ${input.material?.material_name || "UNKNOWN"})`, "Material callout");
    addLine(`(DATE: ${new Date().toISOString().split("T")[0]})`, "Generation date");
    addLine(`(GENERATED BY PRISM PrintToProgramPipeline v${this.version})`);
    addLine("");

    // === Safe startup ===
    addLine("G90 G80 G40 G49", "Absolute, cancel canned/comp/offset");
    addLine("G17", "XY plane");
    addLine("G21", "Metric");
    addLine("G54", "Work offset 1");
    addLine("");

    let currentTool = -1;

    // === U-CAMX23: in-process probing wiring ===
    // For features whose drawing tolerance < 0.025mm or Ra < 0.8µm, auto-insert
    // a controller-specific probe-inspection cycle at the semi_finish→finish
    // transition (after semi-finish completes, before the finish pass starts).
    const featureById = new Map<string, MachinableFeature>();
    for (const f of input.features || []) featureById.set(f.id, f);
    const probeController = this.mapBrandToProbeController(input.machine_brand);
    const semiFinishDone = new Set<string>();
    const probeEmitted = new Set<string>();
    // Every critical feature that *should* receive a probe (EC1). Any id left
    // here after the loop never hit a semi→finish transition — surface it LOUD
    // (Karpathy R12) instead of silently dropping the inspection.
    const criticalNeedingProbe = new Set<string>();
    for (const f of input.features || []) {
      if (this.featureNeedsInProcessProbe(f)) criticalNeedingProbe.add(f.id);
    }

    for (const op of operations) {
      // === U-CAMX23: emit probe at semi→finish transition for critical features ===
      // Finish side is "finish" (bore/contour/groove) OR "pocket_finish" (pockets);
      // upgradeOperationsForQuality always splices the literal "semi_finish" ahead
      // of whichever finish op exists, so the transition is semi_finish→(finish|pocket_finish).
      const isFinishOp =
        op.operation_type === "finish" || op.operation_type === "pocket_finish";
      if (
        isFinishOp &&
        semiFinishDone.has(op.feature_id) &&
        !probeEmitted.has(op.feature_id)
      ) {
        const feat = featureById.get(op.feature_id);
        if (this.featureNeedsInProcessProbe(feat) && feat) {
          probeEmitted.add(op.feature_id);
          criticalNeedingProbe.delete(op.feature_id);
          const pos = feat.position ?? op.position ?? { x: 0, y: 0, z: 0 };
          const probeType = this.mapFeatureToProbeType(feat.type);
          // A dimensional tolerance alarm is only physically meaningful where
          // the probed quantity IS the toleranced dimension — i.e. a diameter
          // (bore/boss). For a surface/groove the probed value is a coordinate,
          // not the nominal, so an alarm-on-fail would trip on every part.
          // There we measure-and-record only (action_on_fail "skip").
          const tolerable = probeType === "bore" || probeType === "boss";
          const probeResult = probeRoutineGeneratorEngine.generatePartInspection({
            controller: probeController,
            features: [
              {
                type: probeType,
                position: pos,
                diameter: feat.diameter_mm,
                depth: feat.depth_mm,
                nominal: feat.diameter_mm ?? feat.width_mm ?? feat.depth_mm ?? 0,
                tolerance_plus:
                  feat.tolerance_mm !== undefined ? Math.abs(feat.tolerance_mm) : 0.025,
                tolerance_minus:
                  feat.tolerance_mm !== undefined ? -Math.abs(feat.tolerance_mm) : -0.025,
              },
            ],
            action_on_fail: tolerable ? "alarm" : "skip",
            spc_output: false,
          });
          addLine("");
          addLine(
            `(--- U-CAMX23 IN-PROCESS PROBE: Feature ${op.feature_id} (${probeController}) ---)`,
            `tol=${feat.tolerance_mm ?? "n/a"}mm Ra=${feat.surface_finish_Ra_um ?? "n/a"}µm`,
          );
          // Machine-safety preamble: the prior semi-finish op left a CUTTING
          // tool spinning. generatePartInspection assumes a probe is already
          // loaded and never stops the spindle, so a probe macro fired here
          // would drive an endmill into the bore. Stop spindle, kill coolant,
          // retract Z to machine home, and require the probe-tool load before
          // the inspection cycle runs.
          addLine("M05", "Spindle stop before probe");
          addLine("M09", "Coolant off before probe");
          addLine("G91 G28 Z0", "Safe Z retract to machine home");
          addLine("G90", "Restore absolute");
          addLine(
            `(*** LOAD TOUCH PROBE NOW — in-process inspection of Feature ${op.feature_id} ***)`,
            "Operator/probe-tool load gate",
          );
          for (const ln of probeResult.gcode.split("\n")) {
            if (ln.trim().length === 0) { addLine(""); continue; }
            addLine(ln);
          }
          for (const w of probeResult.warnings) {
            addLine(`(PROBE WARN: ${w})`);
          }
          addLine("G91 G28 Z0", "Safe Z retract after probe");
          addLine("G90", "Restore absolute");
          addLine("");
          // Force a full tool-change block on the upcoming finish op so the
          // cutting tool + length comp + spindle/coolant are cleanly reloaded
          // after the probe (the probe block left the spindle stopped).
          currentTool = -1;
        }
      }
      if (op.operation_type === "semi_finish") semiFinishDone.add(op.feature_id);

      // === Tool change if needed ===
      if (op.tool.tool_number !== currentTool) {
        // Safe Z before tool change
        if (currentTool > 0) {
          addLine("M09", "Coolant off");
          addLine("G91 G28 Z0", "Z home");
          addLine("M05", "Spindle stop");
        }

        addLine("");
        addLine(`(--- OP ${op.op_number}: ${op.operation_type.toUpperCase()} Feature ${op.feature_id} ---)`, "Operation header");
        addLine(`T${op.tool.tool_number} M06`, `Tool change: ${op.tool.tool_type} D${op.tool.diameter_mm}`);
        addLine(`G43 H${op.tool.tool_number} Z50.`, "Tool length comp + safe Z");
        addLine(`S${op.cutting_params.spindle_rpm} M03`, "Spindle CW");

        // Coolant
        const coolantCode = op.coolant === "flood" ? "M08" :
          op.coolant === "mist" ? "M07" :
          op.coolant === "through_tool" ? "M88" : "";
        if (coolantCode) addLine(coolantCode, `Coolant: ${op.coolant}`);

        currentTool = op.tool.tool_number;
      } else {
        addLine("");
        addLine(`(--- OP ${op.op_number}: ${op.operation_type.toUpperCase()} Feature ${op.feature_id} ---)`, "Operation header");
      }

      // === Generate cutting moves ===
      this.generateCuttingMoves(op, addLine, input.material?.material_name, input.material?.iso_group);
    }

    // === U-CAMX23: loud gap report (Karpathy R12 — never silently drop a probe) ===
    // A critical feature with no rough→finish (or pocket_rough→pocket_finish)
    // op pair never gets a semi_finish pass, so no semi→finish transition ever
    // occurs and no probe was inserted above. Surface it in the program text
    // so the operator/setup sheet cannot miss the un-probed critical dimension.
    if (criticalNeedingProbe.size > 0) {
      addLine("");
      addLine("(=== U-CAMX23 PROBE GAP — CRITICAL DIMENSIONS NOT AUTO-PROBED ===)");
      for (const fid of criticalNeedingProbe) {
        const gf = featureById.get(fid);
        const tol = gf?.tolerance_mm ?? "n/a";
        const ra = gf?.surface_finish_Ra_um ?? "n/a";
        addLine(
          `(PROBE GAP: Feature ${fid} tol=${tol}mm Ra=${ra}µm — no semi→finish transition; MANUAL inspection required)`,
        );
      }
      addLine("");
    }

    // === Program end ===
    addLine("");
    addLine("M09", "Coolant off");
    addLine("G91 G28 Z0", "Z home");
    addLine("G91 G28 Y0", "Y home");
    addLine("M05", "Spindle stop");
    addLine("M30", "Program end");
    addLine("%", "End of tape");

    // Build text
    const text = blocks.map(b => {
      const cmt = b.comment ? ` (${b.comment})` : "";
      return `N${b.line_number} ${b.code}${cmt}`;
    }).join("\n");

    return { blocks, text };
  }

  /**
   * Generate cutting moves for a single operation.
   * Handles approach, cutting passes, and retract.
   */
  private generateCuttingMoves(
    op: PlannedOperation,
    addLine: (code: string, comment?: string) => void,
    materialName?: string,
    isoGroup?: string,
  ): void {
    const { cutting_params: cp, passes, approach } = op;
    const ap = cp.depth_of_cut_mm;
    const F = cp.feed_mm_min;
    // Use feature position from drawing data — falls back to stock center if unspecified
    const pos = op.position ?? { x: 0, y: 0, z: 0 };
    const dims = op.feature_dims ?? {};
    const xPos = pos.x.toFixed(3);
    const yPos = pos.y.toFixed(3);

    // Rapid to above feature (Playbook Rule 573: first rapid move is critical for safety)
    addLine(`G0 X${xPos} Y${yPos}`, `Rapid to feature ${op.feature_id} position`);

    switch (op.operation_type) {
      case "drill": {
        // Peck drill cycle
        const depth = op.passes * ap;
        addLine(`G0 Z2.`, "Rapid to R-plane");
        addLine(`G83 Z${(-depth).toFixed(1)} R2. Q${Math.min(ap, op.tool.diameter_mm).toFixed(1)} F${F}`,
          "Peck drill cycle");
        addLine(`G80`, "Cancel canned cycle");
        break;
      }

      case "tap": {
        const depth = op.passes * ap;
        addLine(`G0 Z2.`, "Rapid to R-plane");
        addLine(`G84 Z${(-depth).toFixed(1)} R2. F${F}`, "Tapping cycle");
        addLine(`G80`, "Cancel canned cycle");
        break;
      }

      case "ream": {
        const depth = op.passes * ap;
        addLine(`G0 Z2.`, "Rapid to R-plane");
        addLine(`G85 Z${(-depth).toFixed(1)} R2. F${F}`, "Reaming cycle");
        addLine(`G80`, "Cancel canned cycle");
        break;
      }

      case "face": {
        const ae = cp.width_of_cut_mm;
        // Face milling: zigzag across stock from feature position
        const faceW = dims.width_mm || dims.length_mm || 100;
        const faceStartX = pos.x;
        const faceEndX = pos.x + faceW;
        addLine(`G0 Z2.`, "Rapid to R-plane");
        addLine(`G1 Z${(-ap).toFixed(2)} F${Math.round(F * 0.3)}`, "Plunge to depth");
        for (let i = 0; i < 3; i++) {
          const yStep = pos.y + i * ae;
          addLine(`G1 X${faceEndX.toFixed(3)} Y${yStep.toFixed(3)} F${F}`, "Face pass");
          addLine(`G1 X${faceStartX.toFixed(3)} Y${(yStep + ae).toFixed(3)} F${F}`, "Return pass");
        }
        addLine(`G0 Z50.`, "Retract");
        break;
      }

      default: {
        // Generic multi-pass cutting (rough/finish/contour/pocket/slot)
        // Compute feature extents from position + dimensions
        const extW = dims.width_mm || dims.diameter_mm || 50;
        const extL = dims.length_mm || dims.width_mm || dims.diameter_mm || 50;
        const x0 = pos.x;
        const y0 = pos.y;
        const x1 = pos.x + extW;
        const y1 = pos.y + extL;

        // === U-CAMX07: material-aware entry parameters ===
        // Replace hardcoded helix-diameter-factor (was 0.3 of tool dia, blind to
        // material) and hardcoded entry-feed factors (was 0.5 helical, 0.3 ramp/
        // plunge) with EntryExitStrategyEngine-derived values that respect the
        // material's max helix angle / helix-dia-factor / plunge-allowed flag
        // (e.g. titanium clamps helix to 1.5° + 0.6× dia; inconel disallows
        // plunge entirely). Falls back to safe legacy defaults when the engine
        // can't satisfy the strategy (R12 — never silently override).
        const entryStrategy = entryExitStrategyEngine.selectEntry({
          tool_diameter: op.tool.diameter_mm,
          pocket_depth: passes * ap,
          material: this.mapMaterialToEntryStrategy(materialName, isoGroup),
          // Best-effort center_cutting probe — most endmills are non-center-cutting
          // unless explicitly marked. Pre-drill not known at this scope.
          center_cutting: false,
          has_pre_drill: false,
        });
        // Material-aware helix entry diameter (in mm) — engine returns
        // helix_params.diameter_mm. Fallback when the engine can't compute
        // helix_params (material disallows helical, pocket too tight, etc.):
        // legacy emitted `I${Dc * 0.3}` where I is the helix *radius*, so the
        // legacy helix diameter was 0.6×Dc. Use that exact value here so the
        // emitted radius (helixDiamMm/2 = 0.3×Dc) is byte-identical to legacy.
        // CRITICAL — Reviewer B P0 fix 2026-05-18: the prior `* 0.3` here was a
        // silent geometry regression that halved the helix radius (0.15×Dc) the
        // moment the engine returned null helix_params.
        const helixDiamMm = entryStrategy.helix_params?.diameter_mm
          ?? op.tool.diameter_mm * 0.6;
        // Material-aware entry feed factor (clamped to [0.1, 1.0] to defend
        // against a future bad return value).
        const entryFeedFactor = Math.max(
          0.1,
          Math.min(1.0, entryStrategy.feed_factor || 0.5),
        );
        // Surface engine warnings as G-code comments so the operator/setup
        // sheet sees them at the actual point of impact (Karpathy R12 — never
        // silently drop the engine's safety advice).
        for (const w of entryStrategy.warnings) {
          addLine(`(U-CAMX07 ENTRY WARN: ${w})`);
        }
        // R12 — surface a method-mismatch advisory whenever the planner's
        // pre-computed `approach` disagrees with the engine's
        // `recommended_method` (e.g. planner picked "helical" but engine says
        // "pre_drill" or "interpolated" for inconel/hardened_steel/narrow
        // pockets). The pipeline keeps the planner's chosen approach (changing
        // it here would shadow upstream optimization) but the operator must see
        // the disagreement to verify safety.
        const plannerMethod = approach === "helical" ? "helix"
          : approach === "ramp" ? "ramp"
          : "plunge";
        if (entryStrategy.recommended_method !== plannerMethod) {
          addLine(
            `(U-CAMX07 METHOD MISMATCH: planner=${approach} engine=${entryStrategy.recommended_method} — VERIFY)`,
          );
        }

        for (let p = 1; p <= passes; p++) {
          const zDepth = -(p * ap);

          // Approach
          if (approach === "helical") {
            addLine(`G0 Z2.`, "Above material");
            addLine(`G2 X${xPos} Y${yPos} Z${zDepth.toFixed(2)} I${(helixDiamMm / 2).toFixed(2)} J0. F${Math.round(F * entryFeedFactor)}`,
              `Helical entry pass ${p}/${passes} (mat-derived dia ${helixDiamMm.toFixed(2)}mm, feed×${entryFeedFactor.toFixed(2)})`);
          } else if (approach === "ramp") {
            addLine(`G0 Z2.`, "Above material");
            addLine(`G1 X${(x0 + 10).toFixed(3)} Z${zDepth.toFixed(2)} F${Math.round(F * entryFeedFactor)}`, `Ramp entry pass ${p}/${passes} (feed×${entryFeedFactor.toFixed(2)})`);
          } else {
            addLine(`G0 Z2.`, "Above material");
            addLine(`G1 Z${zDepth.toFixed(2)} F${Math.round(F * entryFeedFactor)}`, `Plunge pass ${p}/${passes} (feed×${entryFeedFactor.toFixed(2)})`);
          }

          // Cutting move — rectangular contour around feature extents
          addLine(`G1 X${x1.toFixed(3)} F${F}`, "Cut +X");
          addLine(`G1 Y${y1.toFixed(3)} F${F}`, "Cut +Y");
          addLine(`G1 X${x0.toFixed(3)} F${F}`, "Cut -X");
          addLine(`G1 Y${y0.toFixed(3)} F${F}`, "Cut -Y");
        }

        addLine(`G0 Z50.`, "Retract to safe Z");
        break;
      }
    }
  }

  // ==========================================================================
  // STAGE 5: VALIDATION & OUTPUT
  // ==========================================================================

  /**
   * Run safety and sanity checks on generated program.
   * Checks: rapid-into-material, spindle limits, tool reach, feed limits,
   * missing coolant, missing tool length comp, proper retract.
   * @param blocks - Program blocks
   * @param operations - Planned operations
   * @param maxRPM - Machine spindle limit
   * @param maxPower - Machine power limit
   * @returns Array of safety check results
   */
  private runSafetyChecks(
    blocks: ProgramBlock[],
    operations: PlannedOperation[],
    maxRPM: number,
    maxPower: number,
  ): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    // Fail closed when the machine limits are so small that the cycle is not
    // practically runnable, even if individual operations can be derated.
    if (maxRPM < 100 || maxPower < 0.1) {
      checks.push({
        rule: "machine_limits",
        status: "fail",
        message: `Machine limits are too low for a practical program (RPM ${maxRPM}, power ${maxPower}kW)`,
      });
    }

    // 1. Check for rapid moves into negative Z without prior safe Z
    let lastZ = 999;
    for (const block of blocks) {
      const g0Match = block.code.match(/G0.*Z(-?\d+\.?\d*)/);
      const g1Match = block.code.match(/G1.*Z(-?\d+\.?\d*)/);
      if (g0Match) {
        const z = parseFloat(g0Match[1]);
        if (z < 0) {
          checks.push({
            rule: "no_rapid_into_material",
            status: "fail",
            message: `Rapid move (G0) to negative Z=${z} — potential crash`,
            line_ref: block.line_number,
          });
        }
        lastZ = z;
      }
      if (g1Match) {
        lastZ = parseFloat(g1Match[1]);
      }
    }

    // 2. Check spindle RPM limits
    for (const op of operations) {
      if (op.cutting_params.spindle_rpm > maxRPM) {
        checks.push({
          rule: "spindle_limit",
          status: "fail",
          message: `Op ${op.op_number}: RPM ${op.cutting_params.spindle_rpm} exceeds machine limit ${maxRPM}`,
        });
      } else {
        checks.push({
          rule: "spindle_limit",
          status: "pass",
          message: `Op ${op.op_number}: RPM ${op.cutting_params.spindle_rpm} within limit`,
        });
      }
    }

    // 3. Check power consumption
    for (const op of operations) {
      if (op.physics.power_kW > maxPower * 1.2) {
        checks.push({
          rule: "power_limit",
          status: "fail",
          message: `Op ${op.op_number}: Power ${op.physics.power_kW}kW exceeds machine limit ${maxPower}kW`,
        });
      } else if (op.physics.power_kW > maxPower) {
        checks.push({
          rule: "power_limit",
          status: "warn",
          message: `Op ${op.op_number}: Power ${op.physics.power_kW}kW slightly exceeds machine limit ${maxPower}kW`,
        });
      } else if (op.physics.power_kW > maxPower * 0.85) {
        checks.push({
          rule: "power_limit",
          status: "warn",
          message: `Op ${op.op_number}: Power ${op.physics.power_kW}kW at ${(op.physics.power_kW / maxPower * 100).toFixed(0)}% of limit`,
        });
      } else {
        checks.push({
          rule: "power_limit",
          status: "pass",
          message: `Op ${op.op_number}: Power OK`,
        });
      }
    }

    // 4. Check tool deflection on finish passes
    for (const op of operations) {
      if (op.operation_type.includes("finish") || op.operation_type === "contour") {
        const maxDefl = (op.cutting_params.depth_of_cut_mm < 0.5) ? 0.02 : 0.05;
        if (op.physics.deflection_mm > maxDefl) {
          checks.push({
            rule: "deflection_limit",
            status: "warn",
            message: `Op ${op.op_number}: Deflection ${op.physics.deflection_mm.toFixed(3)}mm exceeds finish limit ${maxDefl}mm`,
          });
        } else {
          checks.push({
            rule: "deflection_limit",
            status: "pass",
            message: `Op ${op.op_number}: Deflection OK for finish`,
          });
        }
      }
    }

    // 5. Check tool length comp is set before cutting
    let hasToolLenComp = false;
    const isCuttingBlock = (code: string): boolean => /^G0?[123](?:\s|$)/.test(code.trim());
    for (const block of blocks) {
      if (block.code.includes("G43")) hasToolLenComp = true;
      if (block.code.includes("M06")) hasToolLenComp = false; // reset after tool change
      if (block.code.includes("G43")) hasToolLenComp = true;
      if (isCuttingBlock(block.code) && !hasToolLenComp) {
        checks.push({
          rule: "tool_length_comp",
          status: "fail",
          message: "Cutting move without active tool length compensation",
          line_ref: block.line_number,
        });
        break;
      }
    }
    if (checks.every(c => c.rule !== "tool_length_comp")) {
      checks.push({ rule: "tool_length_comp", status: "pass", message: "Tool length comp set before all cutting" });
    }

    // 6. Check program ends with safe retract and spindle stop
    const lastBlocks = blocks.slice(-8);
    const hasRetract = lastBlocks.some(b => b.code.includes("G28 Z"));
    const hasSpindleStop = lastBlocks.some(b => b.code.includes("M05") || b.code.includes("M30"));
    checks.push({
      rule: "safe_end",
      status: hasRetract && hasSpindleStop ? "pass" : "warn",
      message: hasRetract && hasSpindleStop
        ? "Program ends with safe retract and spindle stop"
        : "Program may not end safely — check retract and spindle stop",
    });

    // 7. Check for missing coolant
    let coolantActive = false;
    for (const block of blocks) {
      if (block.code.includes("M08") || block.code.includes("M07") || block.code.includes("M88")) {
        coolantActive = true;
      }
      if (block.code.includes("M09")) coolantActive = false;
      if (block.code.includes("M30")) {
        if (coolantActive) {
          checks.push({
            rule: "coolant_off",
            status: "warn",
            message: "Coolant not turned off before program end",
          });
        }
      }
    }
    if (!checks.some(c => c.rule === "coolant_off")) {
      checks.push({ rule: "coolant_off", status: "pass", message: "Coolant properly managed" });
    }

    // 8. Check tool life adequacy
    for (const op of operations) {
      if (op.physics.tool_life_min < op.cycle_time_sec / 60) {
        checks.push({
          rule: "tool_life",
          status: "warn",
          message: `Op ${op.op_number}: Tool life ${op.physics.tool_life_min.toFixed(1)}min is shorter than cycle time ${(op.cycle_time_sec / 60).toFixed(1)}min - plan a tool change or refresh before this operation`,
        });
      }
    }

    return checks;
  }

  /**
   * Generate setup sheet from operations and input.
   */
  private generateSetupSheet(
    operations: PlannedOperation[],
    input: DrawingInput,
    totalCycleTime: number,
  ): SetupSheet {
    // Deduplicate tools
    const toolsSeen = new Set<number>();
    const toolList: SetupSheet["tool_list"] = [];
    for (const op of operations) {
      if (!toolsSeen.has(op.tool.tool_number)) {
        toolsSeen.add(op.tool.tool_number);
        toolList.push({
          tool_number: op.tool.tool_number,
          description: `${op.tool.tool_type} D${op.tool.diameter_mm} ${op.tool.material} ${op.tool.coating}`,
          diameter_mm: op.tool.diameter_mm,
          stick_out_mm: op.tool.stick_out_mm,
          holder: op.tool.holder_type,
        });
      }
    }

    // Estimate stock size from features if not provided
    const stock = input.stock_size || this.estimateStockSize(input.features);

    const fixtureNotes: string[] = [
      "Clamp on parallel bars in vise",
      `Minimum jaw opening: ${stock.x + 10}mm`,
      "Use soft jaws if surface finish critical",
    ];
    if (input.notes) {
      fixtureNotes.push(...input.notes.filter(n => n.toLowerCase().includes("fixture") || n.toLowerCase().includes("clamp")));
    }

    return {
      part_number: input.part_number || "PART-001",
      material: input.material?.material_name || "Unknown",
      stock_size: stock,
      work_offset: "G54",
      datum_description: "Top face center of stock",
      tool_list: toolList,
      fixture_notes: fixtureNotes,
      estimated_cycle_time_sec: totalCycleTime,
      estimated_cycle_time_formatted: formatTime(totalCycleTime),
    };
  }

  /**
   * Estimate stock size from feature extents.
   */
  private estimateStockSize(features: MachinableFeature[]): { x: number; y: number; z: number } {
    let maxX = 50, maxY = 50, maxZ = 20;
    for (const f of features) {
      if (f.width_mm && f.width_mm > maxX) maxX = f.width_mm;
      if (f.length_mm && f.length_mm > maxY) maxY = f.length_mm;
      if (f.depth_mm && f.depth_mm > maxZ) maxZ = f.depth_mm;
      if (f.position) {
        maxX = Math.max(maxX, Math.abs(f.position.x) * 2 + (f.width_mm || 20));
        maxY = Math.max(maxY, Math.abs(f.position.y) * 2 + (f.length_mm || 20));
      }
    }
    // Add stock margin (5mm each side, 3mm top)
    return {
      x: Math.ceil(maxX + 10),
      y: Math.ceil(maxY + 10),
      z: Math.ceil(maxZ + 3),
    };
  }

  /**
   * Calculate overall confidence score (0-100) based on pipeline results.
   */
  private calculateConfidence(
    intake: PrintToProgramResult["intake_validation"],
    operations: PlannedOperation[],
    safetyChecks: SafetyCheck[],
  ): number {
    let score = 100;

    // Penalize missing/ambiguous items
    score -= intake.missing_dimensions.length * 5;
    score -= intake.ambiguous_tolerances.length * 3;
    score -= intake.warnings.filter(w => w.severity === "critical").length * 10;
    score -= intake.warnings.filter(w => w.severity === "warning").length * 2;

    // Penalize safety failures
    score -= safetyChecks.filter(c => c.status === "fail").length * 10;
    score -= safetyChecks.filter(c => c.status === "warn").length * 3;

    // Penalize operations with warnings
    for (const op of operations) {
      score -= op.notes.length * 1;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ==========================================================================
  // PUBLIC PIPELINE METHODS
  // ==========================================================================

  /**
   * Run the full print-to-program pipeline.
   * Stages: intake → classify → plan → generate → validate
   * @param input - Drawing input with features, dimensions, material
   * @returns Complete pipeline result with G-code, setup sheet, confidence
   */
  runFullPipeline(input: DrawingInput, options?: { resumeFromStage?: number; runId?: string }): PrintToProgramResult {
    log.info(`[PrintToProgramPipeline] Full pipeline for ${input.part_number || "PART"}`);

    const cpm = new PipelineCheckpointManager('print-to-program', options?.runId);
    const resumeFrom = options?.resumeFromStage ?? -1;

    // U-ARCH3: Fire async machine resolution (non-blocking, enriches defaults for subsequent calls)
    if (!this._resolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model, max_rpm: input.max_spindle_rpm, max_power_kw: input.max_power_kW })
        .then(rm => { this._resolvedMachine = rm; })
        .catch(() => { /* fallback to input/defaults — already handled below */ });
    }

    const rm = this._resolvedMachine;
    const maxRPM = input.max_spindle_rpm || rm?.max_spindle_rpm || 12000;
    const maxPower = input.max_power_kW || rm?.max_power_kw || 15;
    const target = input.optimization_target || "balanced";

    // S1: Validate intake
    let t0 = Date.now();
    let intake: ReturnType<typeof PrintToProgramPipelineEngine.prototype.validateIntake>;
    if (resumeFrom > 0) {
      const cp = cpm.resumeFrom(0);
      intake = cp?.data ?? this.validateIntake(input);
    } else {
      intake = this.validateIntake(input);
      cpm.checkpoint('validate_intake', 0, intake, Date.now() - t0);
    }

    // S2: Classify features
    t0 = Date.now();
    const iso = input.material?.iso_group || "P";
    let classified: ReturnType<typeof this.classifyFeatures>;
    if (resumeFrom > 1) {
      const cp = cpm.resumeFrom(1);
      classified = cp?.data ?? this.classifyFeatures(input.features, iso);
    } else {
      classified = this.classifyFeatures(input.features, iso);
      cpm.checkpoint('classify_features', 1, classified, Date.now() - t0);
    }

    // S3: Process plan
    t0 = Date.now();
    this._currentMachineBrand = input.machine_brand;
    this._currentMachineModel = input.machine_model;
    let operations: ReturnType<typeof this.generateProcessPlan>;
    if (resumeFrom > 2) {
      const cp = cpm.resumeFrom(2);
      operations = cp?.data ?? this.generateProcessPlan(classified, input.material, maxRPM, maxPower, target);
    } else {
      operations = this.generateProcessPlan(classified, input.material, maxRPM, maxPower, target);
      cpm.checkpoint('process_plan', 2, operations, Date.now() - t0);
    }

    // === U-CAMX08: intelligent sequencing — reorder ops to minimize tool
    // changes + respect production rules (datum-first, rigidity-aware, phase
    // ordering, thin-wall scheduling). Replaces the implicit "operations
    // appended in feature priority order" with the 33-rule IntelligentSequencing
    // engine. Strict-additive: when sequencing fails to return a permutation
    // of the input ops, the original order is preserved (fail-soft per R12).
    const sequencingResult = this.applyIntelligentSequencing(operations);
    if (sequencingResult.reordered) {
      operations = sequencingResult.operations;
    }
    // R12 — surface sequencer warnings up to the caller. The helper would
    // otherwise drop them silently inside its return object, violating
    // "never silently swallow advisory output". (Reviewer B P1 fix 2026-05-18.)
    // Note: allWarnings is built later in this function; we capture the
    // sequencer warnings here in a local and merge them at the warning-
    // collection seam below.
    const sequencingWarnings: PipelineWarning[] = sequencingResult.metrics.warnings.map(
      msg => ({ stage: "intelligent_sequencing", severity: "warning", message: msg }),
    );

    // S3.5: Chatter stability pre-check — reject ap/RPM combos in SLD danger zone
    // Ref: Altintas (2012) Manufacturing Automation, Ch. 4
    const chatterChecks: PrintToProgramResult["chatter_checks"] = [];
    try {
      for (const op of operations) {
        // Skip non-milling operations (drilling, tapping, etc.)
        if (["drill", "ream", "tap", "chamfer"].includes(op.operation_type)) continue;

        const radialImmersion = op.cutting_params.width_of_cut_mm / (op.tool.diameter_mm || 10);
        const sldInput = {
          tool: {
            diameter_mm: op.tool.diameter_mm,
            flute_count: op.tool.flutes,
            overhang_mm: op.tool.stick_out_mm,
            material: op.tool.material?.toLowerCase() as "carbide" | "hss" | "cermet",
          },
          workpiece: {
            iso_group: iso as "P" | "M" | "K" | "N" | "S" | "H",
          },
          machine: {
            max_rpm: maxRPM,
          },
          cutting: {
            radial_immersion_ratio: Math.min(radialImmersion, 1),
            up_milling: false,
          },
        };

        const sldResult = chatterStabilityLobeEngine.compute(sldInput);
        if (sldResult?.value?.stable_pockets) {
          // Check if current (RPM, ap) falls in any stable pocket
          const rpm = op.cutting_params.spindle_rpm;
          const ap = op.cutting_params.depth_of_cut_mm;
          let isStable = false;
          let maxStableAp = 0;

          for (const pocket of sldResult.value.stable_pockets) {
            if (rpm >= pocket.rpm_range[0] && rpm <= pocket.rpm_range[1]) {
              maxStableAp = Math.max(maxStableAp, pocket.max_ap_mm);
              if (ap <= pocket.max_ap_mm) {
                isStable = true;
              }
            }
          }

          const check: NonNullable<PrintToProgramResult["chatter_checks"]>[number] = {
            op_number: op.op_number,
            stable: isStable,
            original_ap_mm: ap,
            rpm,
          };

          if (!isStable && maxStableAp > 0 && maxStableAp < ap) {
            // De-rate ap to safe limit — only when SLD limit is significantly below current ap
            check.adjusted_ap_mm = Math.round(maxStableAp * 0.9 * 100) / 100; // 90% of max stable
            check.max_stable_ap_mm = Math.round(maxStableAp * 100) / 100;
            // Advisory only — do NOT mutate operation params (preserves pipeline determinism)
            op.notes.push(
              `Chatter pre-check: ap ${ap.toFixed(2)}mm may exceed SLD limit ${maxStableAp.toFixed(2)}mm at ${rpm} RPM — consider reducing depth of cut`
            );
          } else if (!isStable) {
            op.notes.push(
              `Chatter warning: ${rpm} RPM / ${ap.toFixed(2)}mm ap may be unstable — verify with tap test`
            );
          }

          chatterChecks.push(check);
        }
      }
    } catch (e: any) {
      log.debug?.(`ChatterStabilityLobe: pre-check skipped — ${e?.message}`);
    }

    // S3.6: Thermal growth warning — flag when cutting temperature may cause >10µm drift
    // Simplified estimate: ΔT ∝ MRR × specific energy / (thermal mass)
    // Ref: Bryan (1990) thermal error budgeting
    try {
      for (const op of operations) {
        if (op.physics.mrr_mm3_min > 0) {
          // Rough thermal drift estimate: high MRR sustained over time → expansion
          // Machine steel α ≈ 12 µm/m/°C, spindle bearing zone ~50mm effective length
          // Conservative: flag if predicted MRR × time suggests >5°C sustained rise
          const cutTimeSec = op.cycle_time_sec;
          const powerInput = op.physics.power_kW;
          // Thermal rise ≈ P × t / (m × cp), simplified flag when power × time > threshold
          const thermalEnergy_kJ = powerInput * cutTimeSec / 1000;
          // Heuristic: 50kJ sustained → ~5°C rise → ~3µm drift; 100kJ → ~10µm
          if (thermalEnergy_kJ > 100) {
            op.notes.push(
              `Thermal drift warning: ${thermalEnergy_kJ.toFixed(0)}kJ thermal input may cause >10µm growth — consider thermal compensation or mid-program re-zero`
            );
          }
        }
      }
    } catch (e: any) {
      log.debug?.(`Thermal growth check: skipped — ${e?.message}`);
    }

    // S4: Generate G-code
    t0 = Date.now();
    let programOutput: ReturnType<typeof this.generateProgram>;
    if (resumeFrom > 3) {
      const cp = cpm.resumeFrom(3);
      programOutput = cp?.data ?? this.generateProgram(operations, input);
    } else {
      programOutput = this.generateProgram(operations, input);
      cpm.checkpoint('generate_program', 3, programOutput, Date.now() - t0);
    }
    let { blocks, text } = programOutput;

    // S4.5: AutoSpeedFeedEngine post-processing (U22) — optimize per-block S/F
    const asfe = getAutoSpeedFeedEngine();
    if (asfe) {
      try {
        // Build tool definitions from planned operations
        const toolMap = new Map<number, any>();
        for (const op of operations) {
          if (!toolMap.has(op.tool.tool_number)) {
            toolMap.set(op.tool.tool_number, {
              tool_number: op.tool.tool_number,
              diameter_mm: op.tool.diameter_mm,
              flutes: op.tool.flutes,
              type: op.tool.tool_type?.replace(/_/g, "") as any,
              material: op.tool.material?.toLowerCase() as any,
              coating: op.tool.coating,
              flute_length_mm: op.tool.flute_length_mm,
              corner_radius_mm: op.tool.corner_radius_mm,
            });
          }
        }
        const toolDefs = Array.from(toolMap.values());

        const asfInput = {
          gcode: text,
          material: input.material?.material_name || "steel",
          iso_group: input.material?.iso_group,
          tools: toolDefs,
          annotate: true,
          preserve_rapids: true,
          // U-CAMX22-FIX-SILENT-SKIP scrutiny P1: now that optimizeSync() runs
          // the REAL S/F optimization (it was a visible no-op before), the
          // emitted G-code diverges from the pre-optimization `blocks` that
          // runSafetyChecks() validates. Pass this machine's RPM/power envelope
          // so AutoSpeedFeedEngine's own clamps bound the optimized S/F to the
          // machine limits BEFORE emission — the optimized program is then
          // provably within the same envelope the safety gate enforces.
          // maxRPM (rpm) / maxPower (kW) units match machine_max_rpm/_power_kw.
          machine_max_rpm: maxRPM,
          machine_power_kw: maxPower,
        };

        // U-CAMX22-FIX-SILENT-SKIP (2026-05-18): AutoSpeedFeedEngine now exposes
        // a synchronous optimizeSync() — its orchestrated engines
        // (UltimateSpeedFeedEngine, PostProcessorFeedOptimizerEngine) are
        // statically imported with no async init, so the S/F optimization is
        // pure synchronous CPU work. This sync pipeline runs the REAL physics
        // optimization directly. (Previously U-CAMX22-VISIBLE-SKIP surfaced an
        // auditable skip and emitted base G-code unoptimized — the optimize()
        // Promise could not be awaited mid-sync-pipeline.) The surrounding
        // try/catch still falls back to base G-code if optimization throws.
        const r = asfe.optimizeSync(asfInput) as { gcode?: string; stats?: { lines_modified?: number } };
        if (r?.gcode) {
          text = r.gcode;
          log.info?.(`AutoSpeedFeedEngine: optimized ${r.stats?.lines_modified ?? 0} lines`);
        }
      } catch (e: any) {
        // R12: real exception is a warn, not debug — operator should see it.
        log.warn?.(`AutoSpeedFeedEngine: optimization failed, falling back to base G-code — ${e?.message}`);
      }
    }

    // S5: Validate
    t0 = Date.now();
    const safetyChecks = this.runSafetyChecks(blocks, operations, maxRPM, maxPower);

    // --- WorkholdingVerificationEngine (U09) ---
    const wve = getWorkholdingVerificationEngine();
    if (wve) {
      try {
        const workholding = this.buildWorkholdingConfig(input, operations);
        for (const op of operations) {
          const forces = {
            Fc_N: op.physics.cutting_force_N,
            torque_Nm: op.physics.torque_Nm,
            operation_name: `Op ${op.op_number} (${op.operation_type})`,
          };
          const vResult = wve.verify(forces, workholding);
          if (vResult && vResult.safety_factor < 1.5) {
            safetyChecks.push({
              rule: "workholding_force",
              status: vResult.safety_factor < 1.0 ? "fail" : "warn",
              message: `Op ${op.op_number}: Workholding safety factor ${vResult.safety_factor.toFixed(2)} (< 1.5) - ${vResult.recommendations?.[0] || "increase clamping force or reduce cut"}`,
            });
          } else if (vResult) {
            safetyChecks.push({
              rule: "workholding_force",
              status: "pass",
              message: `Op ${op.op_number}: Workholding SF ${vResult.safety_factor.toFixed(2)} OK`,
            });
          }
        }
      } catch {
        // Fall through — no workholding check (current behavior)
      }
    }

    // --- U-CAMX09: WorkholdingViabilityEngine — complementary fixture-geometry
    // viability lens. DISTINCT from the WorkholdingVerificationEngine force gate
    // above (R8): that gate answers "is grip force ≥ cutting force × SF?"; this
    // answers "is the fixture GEOMETRY sound?" — sub-100mm² zones, single-clamp
    // rotation, all-clamps-same-face moment resistance, vacuum sealed-area. The
    // two are additive safety lenses, not duplicates.
    let workholdingViability:
      | { viable: boolean; grip_margin: number; issues: string[]; force_capacity_N: number }
      | undefined;
    const workholdingViabilityWarnings: PipelineWarning[] = [];
    const wvia = getWorkholdingViabilityEngine();
    if (wvia && operations.length > 0) {
      try {
        const whCfg = this.buildWorkholdingConfig(input, operations);
        const peakForce = Math.max(
          1,
          ...operations.map(op => Math.max(1, op.physics?.cutting_force_N ?? 1)),
        );
        const nZones = Math.max(1, whCfg.clamp_points);
        const stock = input.stock_size || this.estimateStockSize(input.features);
        // Per-zone contact patch from the two smaller stock dims (a vise/plate
        // jaw footprint), split conservatively across the clamp points. Floored
        // at 100mm² so a degenerate stock never fabricates a sub-minimum zone
        // the engine would (correctly) flag on bogus geometry.
        const contactFace = Math.max(
          100,
          (Math.min(stock.x, stock.y) * Math.min(stock.y, stock.z)) / nZones,
        );
        const perZoneForce = Math.max(1, Math.round(whCfg.clamping_force_N / nZones));
        // Vise → two opposed jaw faces (good moment resistance). Fixture plate →
        // clamps all bear on the shared base face (the moment-resistance risk
        // the viability engine exists to surface).
        const faces = whCfg.type === "vise"
          ? ["left_jaw", "right_jaw"]
          : ["base", "base", "base", "base"];
        const zones = Array.from({ length: nZones }, (_, i) => ({
          id: `clamp-${i + 1}`,
          face: faces[i % faces.length],
          area_mm2: Math.round(contactFace),
          clamp_force_N: perZoneForce,
          friction_coeff: whCfg.friction_coefficient,
        }));
        const via = wvia.checkViabilityDirect({
          clamping_zones: zones,
          cutting_force_N: peakForce,
          fixture_type: whCfg.type,
          friction_coeff: whCfg.friction_coefficient,
        });
        workholdingViability = {
          viable: via.viable,
          grip_margin: via.grip_margin,
          issues: via.issues,
          force_capacity_N: via.force_capacity_N,
        };
        // R12: a non-viable verdict is CRITICAL (part may shift under cut); the
        // itemized geometry advisories follow as warnings (distinct purpose —
        // headline verdict vs per-issue breakdown, intentionally not collapsed).
        if (!via.viable) {
          workholdingViabilityWarnings.push({
            stage: "workholding_viability",
            severity: "critical",
            message: `U-CAMX09 workholding NOT viable: capacity ${via.force_capacity_N.toFixed(0)}N, margin ${(via.grip_margin * 100).toFixed(0)}% — ${via.issues[0] || "insufficient grip"}`,
          });
        }
        for (const iss of via.issues) {
          workholdingViabilityWarnings.push({
            stage: "workholding_viability",
            severity: "warning",
            message: `U-CAMX09 ${iss}`,
          });
        }
      } catch (err) {
        // R12: a thrown viability check is a visible warn, never a silent swallow.
        workholdingViabilityWarnings.push({
          stage: "workholding_viability",
          severity: "warning",
          message: `U-CAMX09 workholding viability check failed: ${(err as Error)?.message || String(err)}`,
        });
      }
    }

    // --- U-CAMX10: CrossCamRecommenderEngine — advisory CAM-bridge + strategy
    // recommendation. COMPLEMENTARY to the pipeline's own G-code (R8 — NOT
    // duplicate toolpath gen): answers "which external CAM system + toolpath
    // strategy best fits this part?", a routing hint with physics-validated
    // confidence. Never gates the program (advisory only).
    let camStrategyRecommendation:
      | {
          recommended_cam: string;
          recommended_strategy: string;
          strategy_category: string;
          confidence: number;
          predicted_cycle_time_min: number;
          advantages: string[];
          warnings: string[];
        }
      | undefined;
    const camStrategyWarnings: PipelineWarning[] = [];
    const ccr = getCrossCamRecommenderEngine();
    if (ccr && operations.length > 0) {
      try {
        const stock = input.stock_size || this.estimateStockSize(input.features);
        const pocketCount = input.features.filter(f => /pocket/i.test(f.type)).length;
        const boreCount = input.features.filter(f => /bore/i.test(f.type)).length;
        const holeCount = input.features.filter(f => /hole/i.test(f.type)).length;
        // Arm-B P1 fix: a drilling/boring-dominant part is canned-cycle work
        // with no external-CAM TOOLPATH-strategy match by definition. The
        // round-1 geomType ternary emitted "boring"/"drilling" — literals NO
        // CrossCamRecommenderEngine strategy profile lists in
        // geometry_strengths — so the engine threw on an empty candidate set
        // (bestOverall.confidence on undefined). This guard skips the
        // recommender with a SPECIFIC named reason; the ternary below now
        // emits only strategy-DB-covered literals, so the throw is
        // structurally unreachable AND a canned-cycle part no longer gets a
        // semantically-wrong milling-strategy recommendation. (Reverting just
        // this guard would not re-throw — bore-only would fall to "contour"
        // and produce a WRONG-but-valid recommendation; the fail-on-revert
        // oracle is the wrong-recommendation, not a throw.)
        const drillBoreDominant = pocketCount === 0 && (boreCount + holeCount) > 0;
        if (drillBoreDominant) {
          camStrategyWarnings.push({
            stage: "cam_strategy",
            severity: "warning",
            message:
              "U-CAMX10 CAM recommendation skipped: drilling/boring-dominant part is canned-cycle work with no external-CAM toolpath-strategy match",
          });
        } else {
          // Pocket/contour-class — every literal below IS present in
          // CrossCamRecommenderEngine strategy-profile geometry_strengths.
          const geomType =
            pocketCount > 1 ? "multi_pocket"
            : pocketCount === 1 ? "pocket_2d"
            : "contour";
        // Representative tool = the largest-diameter planned op (worst-case
        // load drives the strategy fit).
        const repOp = operations.reduce(
          (a, b) => ((b.tool?.diameter_mm ?? 0) > (a.tool?.diameter_mm ?? 0) ? b : a),
          operations[0],
        );
        const iso = (input.material?.iso_group || "P") as "P" | "M" | "K" | "N" | "S" | "H";
        const ccrInput = {
          geometry: {
            type: geomType,
            dimensions_mm: { length: stock.x, width: stock.y, depth: stock.z },
            pocket_count: pocketCount || undefined,
            surface_area_mm2: Math.max(1, stock.x * stock.y),
          },
          material: {
            class: (input.material?.material_name || `iso_${iso}`)
              .toLowerCase()
              .replace(/\s+/g, "_"),
            iso_group: iso,
            hardness_hrc: input.material?.hardness_hrc,
          },
          machine: {
            spindle_power_kw: input.max_power_kW ?? 15,
            max_rpm: input.max_spindle_rpm ?? 12000,
            axis_count: 3 as const,
          },
          tool: {
            diameter_mm: Math.max(1, repOp.tool?.diameter_mm ?? 10),
            flute_count: Math.max(1, repOp.tool?.flutes ?? 3),
            material: "carbide" as const,
            overhang_mm: Math.max(1, (repOp.tool?.diameter_mm ?? 10) * 3),
          },
          constraints: { priority: "balanced" as const },
        };
        const ccrOut = ccr.compute(ccrInput);
        const best = ccrOut?.value?.best_overall;
        if (best) {
          const conf =
            typeof ccrOut.confidence === "number" ? ccrOut.confidence : (best.confidence ?? 0);
          camStrategyRecommendation = {
            recommended_cam: best.cam_system,
            recommended_strategy: best.strategy_name,
            strategy_category: best.strategy_category,
            confidence: conf,
            predicted_cycle_time_min: best.predicted_cycle_time_min,
            advantages: Array.isArray(best.advantages) ? best.advantages : [],
            warnings: Array.isArray(best.warnings) ? best.warnings : [],
          };
          // R12: surface the recommendation + any engine warnings as advisory
          // rows (never gates the program — a low-confidence pick is still
          // operator-actionable information, not a silent drop).
          camStrategyWarnings.push({
            stage: "cam_strategy",
            severity: "warning",
            message: `U-CAMX10 CAM recommendation: ${best.cam_system}/${best.strategy_name} (${best.strategy_category}), confidence ${(conf * 100).toFixed(0)}%, ~${Number(best.predicted_cycle_time_min).toFixed(1)}min`,
          });
          for (const w of camStrategyRecommendation.warnings) {
            camStrategyWarnings.push({
              stage: "cam_strategy",
              severity: "warning",
              message: `U-CAMX10 ${w}`,
            });
          }
        } else {
          camStrategyWarnings.push({
            stage: "cam_strategy",
            severity: "warning",
            message:
              "U-CAMX10 CrossCamRecommender returned no best_overall — CAM recommendation unavailable",
          });
        }
        }
      } catch (err) {
        // R12: a thrown recommendation is a visible warn, never a silent swallow.
        camStrategyWarnings.push({
          stage: "cam_strategy",
          severity: "warning",
          message: `U-CAMX10 CAM strategy recommendation failed: ${(err as Error)?.message || String(err)}`,
        });
      }
    }

    // --- U-CAMX11: Smart WCS selection. WorkCoordinateEngine derives the
    // datum-based WCS origin + probe sequence + setup-time, and recommends
    // additional offsets (G55…) for multi-setup parts. ADDITIVE — the emitted
    // G-code still uses G54 (unchanged); this is the operator/setup-sheet
    // intelligence layer the hardcoded "G54" never provided. Stateful engine →
    // a FRESH per-call instance (shared singleton would bleed offsets and
    // report false duplicate-WCS validation).
    let wcsPlan:
      | {
          primary_code: string;
          origin: { x: number; y: number; z: number };
          datum_count: number;
          probe_sequence: string[];
          estimated_setup_time_min: number;
          additional_wcs: string[];
          multi_setup: boolean;
          valid: boolean;
          notes: string[];
        }
      | undefined;
    const wcsWarnings: PipelineWarning[] = [];
    const WceClass = getWorkCoordinateEngineClass();
    if (WceClass && operations.length > 0) {
      try {
        const stock = input.stock_size || this.estimateStockSize(input.features);
        // Conservative multi-setup signal: a feature whose origin sits clearly
        // BELOW the top datum plane (z < -1mm) implies a back-side fixturing.
        // Absent richer face data the pipeline assumes a single top-down setup
        // (stated honestly — never silently presumes more than the model knows).
        const backSide = input.features.filter(f => (f.position?.z ?? 0) < -1);
        const multiSetup = backSide.length > 0;
        const wce = new WceClass();
        // Primary setup: top-face-center surface datum + an XY corner origin.
        const datums = [
          {
            id: "DZ",
            name: "A",
            type: "surface" as const,
            position: { x: stock.x / 2, y: stock.y / 2, z: 0 },
            method: "edge_finder" as const,
          },
          {
            id: "DXY",
            name: "B",
            type: "corner" as const,
            position: { x: 0, y: 0, z: 0 },
            method: "edge_finder" as const,
          },
        ];
        const setup1 = wce.setupFromDatums("G54", datums);
        const additional: string[] = [];
        if (multiSetup) {
          // Second fixturing references the same XY origin on the flipped face.
          wce.setupFromDatums("G55", [
            {
              id: "DZ2",
              name: "C",
              type: "surface" as const,
              position: { x: stock.x / 2, y: stock.y / 2, z: -stock.z },
              method: "edge_finder" as const,
            },
          ]);
          additional.push("G55");
        }
        const validation = wce.validate();
        const planNotes = [
          ...(Array.isArray(setup1.notes) ? setup1.notes : []),
          ...(Array.isArray(validation?.warnings) ? validation.warnings : []),
        ];
        wcsPlan = {
          primary_code: setup1.wcs.code,
          origin: setup1.wcs.origin,
          datum_count: setup1.datum_points.length,
          probe_sequence: setup1.probe_sequence,
          estimated_setup_time_min: setup1.estimated_setup_time_min,
          additional_wcs: additional,
          multi_setup: multiSetup,
          valid: validation ? validation.valid : true,
          notes: planNotes,
        };
        // R12: surface the WCS plan + every note/validation issue as advisory
        // rows (never gates the program — operator/setup-sheet info).
        wcsWarnings.push({
          stage: "wcs",
          severity: "warning",
          message: `U-CAMX11 WCS plan: ${setup1.wcs.code}${additional.length ? "+" + additional.join("+") : ""} @ origin (${setup1.wcs.origin.x.toFixed(1)},${setup1.wcs.origin.y.toFixed(1)},${setup1.wcs.origin.z.toFixed(1)}), ${setup1.datum_points.length} datums, ~${setup1.estimated_setup_time_min}min setup`,
        });
        if (multiSetup) {
          wcsWarnings.push({
            stage: "wcs",
            severity: "warning",
            message: `U-CAMX11 multi-setup detected (${backSide.length} back-side feature(s)) — second fixturing on G55 recommended; emitted G-code uses G54 only (verify operator setup)`,
          });
        }
        if (validation && !validation.valid) {
          for (const iss of (Array.isArray(validation.issues) ? validation.issues : [])) {
            wcsWarnings.push({ stage: "wcs", severity: "warning", message: `U-CAMX11 ${iss}` });
          }
        }
        for (const n of planNotes) {
          wcsWarnings.push({ stage: "wcs", severity: "warning", message: `U-CAMX11 ${n}` });
        }
      } catch (err) {
        // R12: a thrown WCS plan is a visible warn, never a silent swallow.
        wcsWarnings.push({
          stage: "wcs",
          severity: "warning",
          message: `U-CAMX11 WCS plan failed: ${(err as Error)?.message || String(err)}`,
        });
      }
    }

    const totalCycleTime = operations.reduce((sum, op) => sum + op.cycle_time_sec, 0);
    const setupSheet = this.generateSetupSheet(operations, input, totalCycleTime);
    const confidence = this.calculateConfidence(intake, operations, safetyChecks);
    cpm.checkpoint('validate_output', 4, { safetyChecks, confidence }, Date.now() - t0);

    // Collect all warnings
    const allWarnings = [
      ...intake.warnings,
      // U-CAMX08 — surface sequencer warnings (R12 fix per Reviewer B P1).
      ...sequencingWarnings,
      // U-CAMX09 — surface fixture-geometry viability findings (R12).
      ...workholdingViabilityWarnings,
      // U-CAMX10 — surface advisory CAM-bridge/strategy recommendation (R12).
      ...camStrategyWarnings,
      // U-CAMX11 — surface advisory smart-WCS plan findings (R12).
      ...wcsWarnings,
      ...operations.flatMap(op => op.notes.map(n => ({
        stage: "planning",
        severity: "warning" as const,
        message: n,
        feature_id: op.feature_id,
      }))),
      ...safetyChecks.filter(c => c.status !== "pass").map(c => ({
        stage: "safety",
        severity: c.status === "fail" ? "critical" as const : "warning" as const,
        message: c.message,
      })),
    ];

    const safetyPassRate = safetyChecks.length > 0
      ? safetyChecks.filter(c => c.status === "pass").length / safetyChecks.length
      : 1;
    const hasFailedSafetyChecks = safetyChecks.some(c => c.status === "fail");
    const canEmitProgram = !hasFailedSafetyChecks && operations.length > 0;
    const emittedProgramText = canEmitProgram ? text : "";
    const emittedProgramLineCount = canEmitProgram ? blocks.length : 0;

    // === U-CAMX24: reverse-engineered setup sheet from emitted G-code ===
    // Run SetupSheetFromGCodeEngine on the actually-emitted program text (NOT
    // the operations array) so the operator gets a controller-aware Markdown
    // setup doc + tool list + work-offset list + safety notes reflecting what
    // the G-code *really* does. Complementary to the operations-derived
    // `setup_sheet` already on this result — that view is what the planner
    // intended; this view is what the post-processor + emitter produced.
    // Skipped (undefined) when no program was emitted (safety-failed plan, or
    // process-plan-only run); attempted with fail-soft per Karpathy R12.
    let gcodeSetupSheet: GCodeSetupSheetResult | undefined;
    if (canEmitProgram && emittedProgramText.length > 0) {
      try {
        gcodeSetupSheet = setupSheetFromGCodeEngine.generateSetupSheet(
          emittedProgramText,
          {
            controller: this.mapBrandToGCodeController(input.machine_brand),
            part_number: input.part_number,
            operation_name: `${input.part_number || "PART"}-PROGRAM`,
            machine_name: input.machine_model || input.machine_brand,
            include_tool_list: true,
            include_offsets: true,
            include_safety: true,
          },
        );
      } catch (err) {
        // Karpathy R12 — never silently drop a derived artifact. Surface the
        // failure as a pipeline warning so operators see *why* the gcode-derived
        // view is missing; planner-derived `setup_sheet` is unaffected.
        allWarnings.push({
          stage: "gcode_setup_sheet",
          severity: "warning",
          message: `U-CAMX24 gcode_setup_sheet skipped: ${(err as Error)?.message || String(err)}`,
        });
      }
    }

    // Count tool changes
    const toolChanges = new Set(operations.map(o => o.tool.tool_number)).size;

    // ── TK-2: Tribal knowledge consumer wiring ──
    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      tribal_tips = tribalKnowledgeEngine.search({
        category: "speeds_feeds",
        material_iso_group: input.material?.iso_group,
        operation_type: "milling",
        query: input.material?.material_name,
        min_confidence: 70,
        limit: 5,
      });
    } catch { /* tribal tips are advisory — never block pipeline */ }

    // Machine envelope guard — validate peak RPM, feed, and power across all operations
    let peakRpm = 0, peakFeed = 0, peakPower = 0;
    for (const op of operations) {
      peakRpm = Math.max(peakRpm, op.cutting_params?.spindle_rpm ?? 0);
      peakFeed = Math.max(peakFeed, op.cutting_params?.feed_mm_min ?? 0);
      peakPower = Math.max(peakPower, op.physics?.power_kW ?? 0);
    }
    for (const msg of this._checkEnvelope({
      spindle_rpm: peakRpm || undefined,
      feed_mm_min: peakFeed || undefined,
      power_kW: peakPower || undefined,
    })) {
      allWarnings.push({ stage: "envelope_guard", severity: "warning", message: msg });
    }

    return {
      success: canEmitProgram,
      part_number: input.part_number || "PART-001",
      material: input.material?.material_name || "Unknown",
      intake_validation: intake,
      machinable_features: classified,
      feature_count: classified.length,
      operations,
      total_operations: operations.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: Math.round(totalCycleTime),
      program: blocks,
      program_text: emittedProgramText,
      program_line_count: emittedProgramLineCount,
      safety_checks: safetyChecks,
      safety_pass_rate: Math.round(safetyPassRate * 100) / 100,
      setup_sheet: setupSheet,
      gcode_setup_sheet: gcodeSetupSheet,
      workholding_viability: workholdingViability,
      cam_strategy_recommendation: camStrategyRecommendation,
      wcs_plan: wcsPlan,
      confidence_score: confidence,
      warnings: allWarnings,
      tribal_tips,
      chatter_checks: chatterChecks.length > 0 ? chatterChecks : undefined,
    };
  }

  /**
   * Run process planning only (no G-code generation).
   * Useful for reviewing operations before committing to program generation.
   * @param input - Drawing input
   * @returns Process plan with operations and tool list
   */
  runProcessPlan(input: DrawingInput): ProcessPlanResult {
    log.info(`[PrintToProgramPipeline] Process plan for ${input.part_number || "PART"}`);

    // U-ARCH3: Fire async machine resolution (non-blocking)
    if (!this._resolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model, max_rpm: input.max_spindle_rpm, max_power_kw: input.max_power_kW })
        .then(rm => { this._resolvedMachine = rm; })
        .catch(() => {});
    }

    const rmPlan = this._resolvedMachine;
    const maxRPM = input.max_spindle_rpm || rmPlan?.max_spindle_rpm || 12000;
    const maxPower = input.max_power_kW || rmPlan?.max_power_kw || 15;
    const target = input.optimization_target || "balanced";

    this._currentMachineBrand = input.machine_brand;
    this._currentMachineModel = input.machine_model;

    const intake = this.validateIntake(input);
    const iso = input.material?.iso_group || "P";
    const classified = this.classifyFeatures(input.features, iso);
    const operations = this.generateProcessPlan(classified, input.material, maxRPM, maxPower, target);
    const totalCycleTime = operations.reduce((sum, op) => sum + op.cycle_time_sec, 0);
    const toolChanges = new Set(operations.map(o => o.tool.tool_number)).size;

    const allWarnings = [
      ...intake.warnings,
      ...operations.flatMap(op => op.notes.map(n => ({
        stage: "planning",
        severity: "warning" as const,
        message: n,
        feature_id: op.feature_id,
      }))),
    ];

    return {
      success: true,
      part_number: input.part_number || "PART-001",
      material: input.material?.material_name || "Unknown",
      intake_validation: intake,
      machinable_features: classified,
      operations,
      total_operations: operations.length,
      total_tool_changes: toolChanges,
      estimated_cycle_time_sec: Math.round(totalCycleTime),
      confidence_score: Math.max(0, 100 - intake.missing_dimensions.length * 5 - intake.ambiguous_tolerances.length * 3),
      warnings: allWarnings,
    };
  }

  /**
   * Validate an existing program text for safety issues.
   * Parses G-code and runs safety rule checks.
   * @param params - Program text and optional machine limits
   * @returns Validation result with safety checks and recommendations
   */
  validateProgram(params: { program_text: string; max_spindle_rpm?: number; max_power_kW?: number }): ValidationResult {
    log.info("[PrintToProgramPipeline] Validate program");

    const { program_text, max_spindle_rpm = 12000, max_power_kW = 15 } = params;
    const lines = program_text.split("\n").filter(l => l.trim());
    const checks: SafetyCheck[] = [];
    const recommendations: string[] = [];

    let hasG90 = false;
    let hasG21orG20 = false;
    let hasToolLenComp = false;
    let hasWorkOffset = false;
    let lastMoveType: "G0" | "G1" | null = null;
    let maxFoundRPM = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (line.includes("G90")) hasG90 = true;
      if (line.includes("G21") || line.includes("G20")) hasG21orG20 = true;
      if (line.includes("G43")) hasToolLenComp = true;
      if (line.match(/G5[4-9]/)) hasWorkOffset = true;

      // Check rapid into material
      const g0Z = line.match(/G0[^1-9].*Z(-?\d+\.?\d*)/i);
      if (g0Z) {
        const z = parseFloat(g0Z[1]);
        if (z < 0) {
          checks.push({ rule: "rapid_into_material", status: "fail", message: `Line ${lineNum}: G0 to Z${z}`, line_ref: lineNum });
        }
        lastMoveType = "G0";
      }

      // Track spindle RPM
      const sMatch = line.match(/S(\d+)/);
      if (sMatch) {
        const rpm = parseInt(sMatch[1]);
        maxFoundRPM = Math.max(maxFoundRPM, rpm);
        if (rpm > max_spindle_rpm) {
          checks.push({ rule: "spindle_over_limit", status: "fail", message: `Line ${lineNum}: S${rpm} exceeds ${max_spindle_rpm}`, line_ref: lineNum });
        }
      }

      // Check feed rate present on cutting moves
      if (line.match(/^N?\d*\s*G[123]\b/) && !line.includes("F") && !line.match(/G28|G91/)) {
        checks.push({ rule: "missing_feed", status: "warn", message: `Line ${lineNum}: Cutting move without feed rate`, line_ref: lineNum });
      }
    }

    // Global checks
    if (!hasG90) {
      checks.push({ rule: "absolute_mode", status: "warn", message: "No G90 found — incremental mode risk" });
      recommendations.push("Add G90 at program start for absolute positioning");
    } else {
      checks.push({ rule: "absolute_mode", status: "pass", message: "Absolute mode (G90) set" });
    }

    if (!hasG21orG20) {
      checks.push({ rule: "unit_mode", status: "warn", message: "No G20/G21 — unit mode ambiguous" });
      recommendations.push("Add G21 (metric) or G20 (inch) at program start");
    }

    if (!hasWorkOffset) {
      checks.push({ rule: "work_offset", status: "warn", message: "No work offset (G54-G59) found" });
      recommendations.push("Add work offset command before first move");
    }

    const lastLines = lines.slice(-5).join(" ");
    if (!lastLines.includes("M30") && !lastLines.includes("M02")) {
      checks.push({ rule: "program_end", status: "warn", message: "No M30/M02 program end" });
      recommendations.push("Add M30 at program end");
    } else {
      checks.push({ rule: "program_end", status: "pass", message: "Program end code present" });
    }

    if (!lastLines.includes("M05") && !lastLines.includes("M30")) {
      recommendations.push("Add M05 (spindle stop) before program end");
    }

    const safetyPassRate = checks.length > 0
      ? checks.filter(c => c.status === "pass").length / checks.length
      : 1;

    return {
      success: true,
      safety_checks: checks,
      safety_pass_rate: Math.round(safetyPassRate * 100) / 100,
      warnings: checks.filter(c => c.status !== "pass").map(c => ({
        stage: "validation",
        severity: c.status === "fail" ? "critical" as const : "warning" as const,
        message: c.message,
      })),
      recommendations,
    };
  }

  // ==========================================================================
  // ASYNC PIPELINE WITH FULL INFRASTRUCTURE INTEGRATION
  // ==========================================================================

  /**
   * Run the full print-to-program pipeline with infrastructure integration.
   *
   * Adds:
   *   - Distributed locking for concurrent execution safety
   *   - Dead-letter queue for failed jobs
   *   - Telemetry/metrics collection
   *   - Schema validation at stage boundaries
   *   - Checkpoint/recovery integration
   *
   * @param input - Drawing input with features, dimensions, material
   * @param options - Pipeline execution options
   * @returns Pipeline result with metrics and infrastructure data
   */
  async runFullPipelineAsync(
    input: DrawingInput,
    options: PipelineExecutionOptions = {}
  ): Promise<{
    result: PrintToProgramResult;
    metrics: PipelineMetrics;
    infrastructureWarnings: string[];
  }> {
    const wrapper = pipelineOptimizationEngine.wrapPipeline("PrintToProgram");

    // Define pipeline stages for infrastructure tracking
    const stages = [
      {
        definition: { name: "validate_intake", index: 0, timeoutMs: 5000 },
        execute: async (stageInput: unknown) => {
          const drawingInput = stageInput as DrawingInput;
          return this.validateIntake(drawingInput);
        },
      },
      {
        definition: { name: "classify_features", index: 1, timeoutMs: 10000 },
        execute: async (stageInput: unknown) => {
          const drawingInput = stageInput as { input: DrawingInput; intake: ReturnType<typeof PrintToProgramPipelineEngine.prototype.validateIntake> };
          const iso = drawingInput.input.material?.iso_group || "P";
          return {
            classified: this.classifyFeatures(drawingInput.input.features, iso),
            input: drawingInput.input,
            intake: drawingInput.intake,
          };
        },
      },
      {
        definition: { name: "generate_process_plan", index: 2, timeoutMs: 30000, resources: { cpuIntensive: true } },
        execute: async (stageInput: unknown) => {
          const data = stageInput as {
            classified: MachinableFeature[];
            input: DrawingInput;
            intake: ReturnType<typeof PrintToProgramPipelineEngine.prototype.validateIntake>;
          };
          const maxRPM = data.input.max_spindle_rpm || 12000;
          const maxPower = data.input.max_power_kW || 15;
          const target = data.input.optimization_target || "balanced";
          this._currentMachineBrand = data.input.machine_brand;
          this._currentMachineModel = data.input.machine_model;
          return {
            operations: this.generateProcessPlan(data.classified, data.input.material, maxRPM, maxPower, target),
            classified: data.classified,
            input: data.input,
            intake: data.intake,
          };
        },
      },
      {
        definition: { name: "generate_gcode", index: 3, timeoutMs: 20000 },
        execute: async (stageInput: unknown) => {
          const data = stageInput as {
            operations: PlannedOperation[];
            classified: MachinableFeature[];
            input: DrawingInput;
            intake: ReturnType<typeof PrintToProgramPipelineEngine.prototype.validateIntake>;
          };
          const { blocks, text } = this.generateProgram(data.operations, data.input);
          return { blocks, text, ...data };
        },
      },
      {
        definition: { name: "validate_output", index: 4, timeoutMs: 15000 },
        execute: async (stageInput: unknown) => {
          const data = stageInput as {
            blocks: ProgramBlock[];
            text: string;
            operations: PlannedOperation[];
            classified: MachinableFeature[];
            input: DrawingInput;
            intake: ReturnType<typeof PrintToProgramPipelineEngine.prototype.validateIntake>;
          };
          const safetyChecks = this.generateSafetyChecks(data.blocks, data.input);
          const totalCycleTime = data.operations.reduce((sum, op) => sum + op.cycle_time_sec, 0);
          const setupSheet = this.generateSetupSheet(data.operations, data.input, totalCycleTime);
          const confidence = this.calculateConfidence(data.intake, data.operations, safetyChecks);
          return { safetyChecks, setupSheet, confidence, totalCycleTime, ...data };
        },
      },
    ];

    // Execute with infrastructure
    const infraResult = await wrapper.executeWithInfra<{ input: DrawingInput; intake: ReturnType<typeof PrintToProgramPipelineEngine.prototype.validateIntake> }, any>(
      { input, intake: this.validateIntake(input) },
      stages,
      {
        useLock: options.useLock ?? true,
        lockResource: options.lockResource ?? `print-to-program:${input.part_number || "unknown"}`,
        useCheckpoints: options.useCheckpoints ?? true,
        useDeadLetterQueue: options.useDeadLetterQueue ?? true,
        collectMetrics: options.collectMetrics ?? true,
        metadata: {
          part_number: input.part_number,
          material: input.material?.material_name,
          feature_count: input.features.length,
        },
        ...options,
      }
    );

    // Build result from infrastructure output
    if (infraResult.success && infraResult.output) {
      const data = infraResult.output;
      const toolChanges = new Set(data.operations.map((o: PlannedOperation) => o.tool.tool_number)).size;
      const safetyPassRate = data.safetyChecks.length > 0
        ? data.safetyChecks.filter((c: SafetyCheck) => c.status === "pass").length / data.safetyChecks.length
        : 1;

      const allWarnings: PipelineWarning[] = [
        ...data.intake.warnings,
        ...data.operations.flatMap((op: PlannedOperation) => op.notes.map((n: string) => ({
          stage: "planning",
          severity: "warning" as const,
          message: n,
          feature_id: op.feature_id,
        }))),
        ...data.safetyChecks.filter((c: SafetyCheck) => c.status !== "pass").map((c: SafetyCheck) => ({
          stage: "safety",
          severity: c.status === "fail" ? "critical" as const : "warning" as const,
          message: c.message,
        })),
      ];

      const result: PrintToProgramResult = {
        success: true,
        part_number: input.part_number || "PART-001",
        material: input.material?.material_name || "Unknown",
        intake_validation: data.intake,
        machinable_features: data.classified,
        feature_count: data.classified.length,
        operations: data.operations,
        total_operations: data.operations.length,
        total_tool_changes: toolChanges,
        estimated_cycle_time_sec: Math.round(data.totalCycleTime),
        program: data.blocks,
        program_text: data.text,
        program_line_count: data.blocks.length,
        safety_checks: data.safetyChecks,
        safety_pass_rate: Math.round(safetyPassRate * 100) / 100,
        setup_sheet: data.setupSheet,
        confidence_score: data.confidence,
        warnings: allWarnings,
      };

      return {
        result,
        metrics: infraResult.metrics,
        infrastructureWarnings: infraResult.warnings,
      };
    }

    // Pipeline failed - return error result
    const errorResult: PrintToProgramResult = {
      success: false,
      part_number: input.part_number || "PART-001",
      material: input.material?.material_name || "Unknown",
      intake_validation: this.validateIntake(input),
      machinable_features: [],
      feature_count: 0,
      operations: [],
      total_operations: 0,
      total_tool_changes: 0,
      estimated_cycle_time_sec: 0,
      program: [],
      program_text: "",
      program_line_count: 0,
      safety_checks: [],
      safety_pass_rate: 0,
      setup_sheet: {
        part_number: input.part_number || "PART-001",
        material: input.material?.material_name || "Unknown",
        stock_size: { x: 0, y: 0, z: 0 },
        work_offset: "G54",
        datum_description: "",
        tool_list: [],
        fixture_notes: [],
        estimated_cycle_time_sec: 0,
        estimated_cycle_time_formatted: "0:00",
      },
      confidence_score: 0,
      warnings: infraResult.errors.map(e => ({
        stage: "infrastructure",
        severity: "critical" as const,
        message: e,
      })),
    };

    return {
      result: errorResult,
      metrics: infraResult.metrics,
      infrastructureWarnings: [...infraResult.warnings, ...infraResult.errors],
    };
  }

  /**
   * Generate safety checks for a program.
   * (Extracted for async pipeline use)
   */
  private generateSafetyChecks(blocks: ProgramBlock[], input: DrawingInput): SafetyCheck[] {
    const safetyChecks: SafetyCheck[] = [];

    // Basic safety checks on generated program
    const text = blocks.map(b => b.code).join("\n");

    // Check for essential safety codes
    if (!text.includes("G90")) {
      safetyChecks.push({ rule: "absolute_mode", status: "warn", message: "No G90 absolute mode command" });
    } else {
      safetyChecks.push({ rule: "absolute_mode", status: "pass", message: "Absolute mode (G90) set" });
    }

    if (!text.includes("G21") && !text.includes("G20")) {
      safetyChecks.push({ rule: "unit_mode", status: "warn", message: "No unit mode (G20/G21) specified" });
    }

    if (text.includes("M30") || text.includes("M02")) {
      safetyChecks.push({ rule: "program_end", status: "pass", message: "Program end code present" });
    } else {
      safetyChecks.push({ rule: "program_end", status: "warn", message: "No program end code (M30/M02)" });
    }

    return safetyChecks;
  }
}

/** Singleton instance. */
export const printToProgramPipelineEngine = new PrintToProgramPipelineEngine();
