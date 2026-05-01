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
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";
import { chatterStabilityLobeEngine } from "./ChatterStabilityLobeEngine.js";

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

    for (const op of operations) {
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
      this.generateCuttingMoves(op, addLine);
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

        for (let p = 1; p <= passes; p++) {
          const zDepth = -(p * ap);

          // Approach
          if (approach === "helical") {
            addLine(`G0 Z2.`, "Above material");
            addLine(`G2 X${xPos} Y${yPos} Z${zDepth.toFixed(2)} I${(op.tool.diameter_mm * 0.3).toFixed(1)} J0. F${Math.round(F * 0.5)}`,
              `Helical entry pass ${p}/${passes}`);
          } else if (approach === "ramp") {
            addLine(`G0 Z2.`, "Above material");
            addLine(`G1 X${(x0 + 10).toFixed(3)} Z${zDepth.toFixed(2)} F${Math.round(F * 0.3)}`, `Ramp entry pass ${p}/${passes}`);
          } else {
            addLine(`G0 Z2.`, "Above material");
            addLine(`G1 Z${zDepth.toFixed(2)} F${Math.round(F * 0.3)}`, `Plunge pass ${p}/${passes}`);
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
    let intake: ReturnType<typeof this.validateIntake>;
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
        };

        // optimize() is async — run synchronously if possible, skip if not
        const result = asfe.optimize(asfInput);
        if (result && typeof result.then === "function") {
          // Cannot await in sync compute — skip async optimization
          log.debug?.("AutoSpeedFeedEngine: skipping async optimization in sync pipeline");
        } else if (result?.gcode) {
          text = result.gcode;
          log.info?.(`AutoSpeedFeedEngine: optimized ${result.stats?.lines_modified ?? 0} lines`);
        }
      } catch (e: any) {
        log.debug?.(`AutoSpeedFeedEngine: fallback to original G-code — ${e?.message}`);
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
    const totalCycleTime = operations.reduce((sum, op) => sum + op.cycle_time_sec, 0);
    const setupSheet = this.generateSetupSheet(operations, input, totalCycleTime);
    const confidence = this.calculateConfidence(intake, operations, safetyChecks);
    cpm.checkpoint('validate_output', 4, { safetyChecks, confidence }, Date.now() - t0);

    // Collect all warnings
    const allWarnings = [
      ...intake.warnings,
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
}

/** Singleton instance. */
export const printToProgramPipelineEngine = new PrintToProgramPipelineEngine();
