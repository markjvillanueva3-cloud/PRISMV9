/**
 * PRISM Manufacturing Intelligence — Process Verification Engine
 * R16-MS3: Predicted vs Target Comparison
 *
 * Compares machining predictions against tolerance/surface/stability targets
 * to verify that a proposed process plan will achieve specification before
 * cutting metal. Identifies drift, accumulation, and failure risk.
 *
 * MCP actions:
 *   verify_process    — Full process verification (surface + tolerance + stability)
 *   verify_tolerance  — Tolerance achievement check with IT grade mapping
 *   verify_surface    — Surface finish verification against Ra/Rz targets
 *   verify_stability  — Stability verification against SLD-derived limits
 *
 * @version 1.0.0  R16-MS3
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface VerifyProcessInput {
  operations: VerifyOperation[];
  targets: VerifyTargets;
  material?: string;
}

export interface VerifyOperation {
  operation_id: string;
  type: string;
  depth_of_cut_mm: number;
  feed_mmrev: number;
  cutting_speed_mpm: number;
  tool_nose_radius_mm?: number;
  spindle_rpm?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
}

export interface VerifyTargets {
  target_Ra_um?: number;
  target_Rz_um?: number;
  target_tolerance_mm?: number;
  target_IT_grade?: number;
  max_temperature_C?: number;
  stability_safety_factor?: number;
}

export interface VerifyResult {
  overall_pass: boolean;
  confidence_pct: number;
  surface_check: SurfaceCheck;
  tolerance_check: ToleranceCheck;
  stability_check: StabilityCheck;
  thermal_check: ThermalCheck;
  risk_factors: string[];
  recommendations: string[];
  safety: { score: number; flags: string[] };
}

interface SurfaceCheck {
  pass: boolean;
  predicted_Ra_um: number;
  predicted_Rz_um: number;
  target_Ra_um: number;
  target_Rz_um: number;
  margin_Ra_pct: number;
  margin_Rz_pct: number;
}

interface ToleranceCheck {
  pass: boolean;
  predicted_tolerance_mm: number;
  target_tolerance_mm: number;
  predicted_IT_grade: number;
  target_IT_grade: number;
  margin_pct: number;
  thermal_contribution_mm: number;
  tool_deflection_contribution_mm: number;
}

interface StabilityCheck {
  pass: boolean;
  predicted_depth_limit_mm: number;
  requested_depth_mm: number;
  safety_factor: number;
  target_safety_factor: number;
}

interface ThermalCheck {
  pass: boolean;
  predicted_temperature_C: number;
  max_temperature_C: number;
  margin_pct: number;
}

// ============================================================================
// IT GRADE TABLE (ISO 286)
// ============================================================================

const IT_GRADES: Record<number, number> = {
  // IT grade → tolerance in μm for D=25mm nominal
  1: 1.0, 2: 1.5, 3: 2.5, 4: 4, 5: 7, 6: 11, 7: 18, 8: 27,
  9: 43, 10: 70, 11: 110, 12: 180, 13: 270, 14: 430,
};

function toleranceToITGrade(tol_mm: number): number {
  const tol_um = tol_mm * 1000;
  for (const [grade, limit] of Object.entries(IT_GRADES).sort(([, a], [, b]) => a - b)) {
    if (tol_um <= limit) return parseInt(grade);
  }
  return 14;
}

function itGradeToTolerance(grade: number): number {
  return (IT_GRADES[grade] ?? 430) / 1000; // μm → mm
}

// ============================================================================
// SURFACE FINISH PREDICTION
// ============================================================================

function predictRa(op: VerifyOperation): number {
  const f = op.feed_mmrev;
  const re = op.tool_nose_radius_mm ?? 0.8;
  // Theoretical Ra (kinematic)
  let Ra = (f * f / (32 * re)) * 1000; // μm
  // Process correction
  if (op.type === 'finishing') Ra *= 0.8;
  else if (op.type === 'roughing') Ra *= 1.4;
  return +Math.max(0.1, Ra).toFixed(2);
}

function predictRz(Ra: number): number {
  return +(Ra * 4.0).toFixed(2);
}

// ============================================================================
// TOLERANCE PREDICTION
// ============================================================================

function predictTolerance(ops: VerifyOperation[]): { tol_mm: number; thermal_mm: number; deflection_mm: number } {
  // Tolerance is sum of contributors from all operations
  let thermalTotal = 0;
  let deflectionTotal = 0;

  for (const op of ops) {
    // Thermal expansion estimate (rough)
    const vc = op.cutting_speed_mpm;
    const tempRise = 50 + vc * 0.5; // Simplified
    const thermalExpansion = tempRise * 12e-6 * 50; // CTE * length estimate
    thermalTotal += thermalExpansion;

    // Tool deflection estimate
    const force = op.depth_of_cut_mm * op.feed_mmrev * 1500; // Rough force [N]
    const L = 60; // Overhang [mm]
    const D = 12; // Tool diameter [mm]
    const E = 620e3; // Carbide Young's modulus [N/mm²]
    const I = Math.PI * Math.pow(D, 4) / 64;
    const deflection = (force * Math.pow(L, 3)) / (3 * E * I);
    deflectionTotal += deflection;
  }

  const totalTol = thermalTotal + deflectionTotal;
  return {
    tol_mm: +totalTol.toFixed(4),
    thermal_mm: +thermalTotal.toFixed(4),
    deflection_mm: +deflectionTotal.toFixed(4),
  };
}

// ============================================================================
// STABILITY PREDICTION
// ============================================================================

function predictStabilityLimit(op: VerifyOperation): number {
  // Simplified Altintas critical depth estimate
  const kc = 1500; // Specific cutting force [N/mm²]
  const z = 4;     // Flutes
  const stiffness = 5e7; // N/m
  const damping = 0.03;

  // Critical depth ≈ 2·ζ·k / (Kt·z)
  const critDepth = (2 * damping * stiffness / 1000) / (kc * z);
  return +Math.max(0.5, critDepth).toFixed(2);
}

// ============================================================================
// TEMPERATURE PREDICTION
// ============================================================================

function predictTemperature(ops: VerifyOperation[]): number {
  let maxTemp = 20;
  for (const op of ops) {
    const vc = op.cutting_speed_mpm;
    const f = op.feed_mmrev;
    const ap = op.depth_of_cut_mm;
    // Empirical: T ≈ C · Vc^0.4 · f^0.2 · ap^0.1
    const temp = 200 * Math.pow(vc / 100, 0.4) * Math.pow(f, 0.2) * Math.pow(ap, 0.1);
    if (temp > maxTemp) maxTemp = temp;
  }
  return +maxTemp.toFixed(1);
}

// ============================================================================
// verify_process
// ============================================================================

export function verifyProcess(input: VerifyProcessInput): VerifyResult {
  const { operations, targets } = input;
  if (!operations || operations.length === 0) {
    throw new Error("No operations provided for verification");
  }

  // Last operation determines final surface
  const lastOp = operations[operations.length - 1]!;
  const predictedRa = predictRa(lastOp);
  const predictedRz = predictRz(predictedRa);
  const targetRa = targets.target_Ra_um ?? 3.2;
  const targetRz = targets.target_Rz_um ?? targetRa * 4;

  // Surface check
  const surfacePass = predictedRa <= targetRa && predictedRz <= targetRz;
  const surfaceCheck: SurfaceCheck = {
    pass: surfacePass,
    predicted_Ra_um: predictedRa,
    predicted_Rz_um: predictedRz,
    target_Ra_um: targetRa,
    target_Rz_um: targetRz,
    margin_Ra_pct: +((1 - predictedRa / targetRa) * 100).toFixed(1),
    margin_Rz_pct: +((1 - predictedRz / targetRz) * 100).toFixed(1),
  };

  // Tolerance check
  const tolPred = predictTolerance(operations);
  const targetTolMm = targets.target_tolerance_mm ?? itGradeToTolerance(targets.target_IT_grade ?? 8);
  const targetIT = targets.target_IT_grade ?? toleranceToITGrade(targetTolMm);
  const predictedIT = toleranceToITGrade(tolPred.tol_mm);
  const tolPass = tolPred.tol_mm <= targetTolMm;
  const toleranceCheck: ToleranceCheck = {
    pass: tolPass,
    predicted_tolerance_mm: tolPred.tol_mm,
    target_tolerance_mm: targetTolMm,
    predicted_IT_grade: predictedIT,
    target_IT_grade: targetIT,
    margin_pct: +((1 - tolPred.tol_mm / targetTolMm) * 100).toFixed(1),
    thermal_contribution_mm: tolPred.thermal_mm,
    tool_deflection_contribution_mm: tolPred.deflection_mm,
  };

  // Stability check
  const maxDepth = Math.max(...operations.map(o => o.depth_of_cut_mm));
  const depthLimit = predictStabilityLimit(lastOp);
  const targetSF = targets.stability_safety_factor ?? 1.5;
  const actualSF = depthLimit / maxDepth;
  const stabilityPass = actualSF >= targetSF;
  const stabilityCheck: StabilityCheck = {
    pass: stabilityPass,
    predicted_depth_limit_mm: depthLimit,
    requested_depth_mm: maxDepth,
    safety_factor: +actualSF.toFixed(2),
    target_safety_factor: targetSF,
  };

  // Thermal check
  const predTemp = predictTemperature(operations);
  const maxTemp = targets.max_temperature_C ?? 600;
  const thermalPass = predTemp <= maxTemp;
  const thermalCheck: ThermalCheck = {
    pass: thermalPass,
    predicted_temperature_C: predTemp,
    max_temperature_C: maxTemp,
    margin_pct: +((1 - predTemp / maxTemp) * 100).toFixed(1),
  };

  // Overall
  const allPass = surfacePass && tolPass && stabilityPass && thermalPass;
  const risks: string[] = [];
  const recs: string[] = [];

  if (!surfacePass) {
    risks.push("SURFACE_FINISH_EXCEEDS_TARGET");
    recs.push(`Reduce feed from ${lastOp.feed_mmrev}mm/rev or increase nose radius from ${lastOp.tool_nose_radius_mm ?? 0.8}mm`);
  }
  if (!tolPass) {
    risks.push("TOLERANCE_EXCEEDS_TARGET");
    if (tolPred.thermal_mm > tolPred.deflection_mm) {
      recs.push("Thermal distortion dominant — reduce cutting speed or add coolant");
    } else {
      recs.push("Tool deflection dominant — reduce overhang or increase tool diameter");
    }
  }
  if (!stabilityPass) {
    risks.push("STABILITY_MARGIN_INSUFFICIENT");
    recs.push(`Reduce depth from ${maxDepth}mm to ${(depthLimit / targetSF).toFixed(1)}mm or stiffen setup`);
  }
  if (!thermalPass) {
    risks.push("TEMPERATURE_EXCEEDS_LIMIT");
    recs.push("Reduce cutting speed or improve coolant delivery");
  }

  // Confidence (higher margin = higher confidence)
  const margins = [surfaceCheck.margin_Ra_pct, toleranceCheck.margin_pct, thermalCheck.margin_pct];
  const minMargin = Math.min(...margins);
  const confidence = Math.max(0, Math.min(100, 50 + minMargin));

  // Safety
  const flags: string[] = [];
  let score = 1.0;
  if (!surfacePass) { score -= 0.2; flags.push("SURFACE_FAIL"); }
  if (!tolPass) { score -= 0.2; flags.push("TOLERANCE_FAIL"); }
  if (!stabilityPass) { score -= 0.3; flags.push("STABILITY_FAIL"); }
  if (!thermalPass) { score -= 0.2; flags.push("THERMAL_FAIL"); }

  return {
    overall_pass: allPass,
    confidence_pct: +confidence.toFixed(1),
    surface_check: surfaceCheck,
    tolerance_check: toleranceCheck,
    stability_check: stabilityCheck,
    thermal_check: thermalCheck,
    risk_factors: risks,
    recommendations: recs,
    safety: { score: +Math.max(0, score).toFixed(2), flags },
  };
}

// ============================================================================
// verify_tolerance
// ============================================================================

export function verifyTolerance(input: { operations: VerifyOperation[]; target_tolerance_mm?: number; target_IT_grade?: number }): ToleranceCheck {
  const tolPred = predictTolerance(input.operations);
  const targetTolMm = input.target_tolerance_mm ?? itGradeToTolerance(input.target_IT_grade ?? 8);
  const targetIT = input.target_IT_grade ?? toleranceToITGrade(targetTolMm);
  const predictedIT = toleranceToITGrade(tolPred.tol_mm);

  return {
    pass: tolPred.tol_mm <= targetTolMm,
    predicted_tolerance_mm: tolPred.tol_mm,
    target_tolerance_mm: targetTolMm,
    predicted_IT_grade: predictedIT,
    target_IT_grade: targetIT,
    margin_pct: +((1 - tolPred.tol_mm / targetTolMm) * 100).toFixed(1),
    thermal_contribution_mm: tolPred.thermal_mm,
    tool_deflection_contribution_mm: tolPred.deflection_mm,
  };
}

// ============================================================================
// verify_surface
// ============================================================================

export function verifySurface(input: { operation: VerifyOperation; target_Ra_um?: number; target_Rz_um?: number }): SurfaceCheck {
  const Ra = predictRa(input.operation);
  const Rz = predictRz(Ra);
  const targetRa = input.target_Ra_um ?? 3.2;
  const targetRz = input.target_Rz_um ?? targetRa * 4;

  return {
    pass: Ra <= targetRa && Rz <= targetRz,
    predicted_Ra_um: Ra,
    predicted_Rz_um: Rz,
    target_Ra_um: targetRa,
    target_Rz_um: targetRz,
    margin_Ra_pct: +((1 - Ra / targetRa) * 100).toFixed(1),
    margin_Rz_pct: +((1 - Rz / targetRz) * 100).toFixed(1),
  };
}

// ============================================================================
// verify_stability
// ============================================================================

export function verifyStability(input: { operation: VerifyOperation; target_safety_factor?: number }): StabilityCheck {
  const depthLimit = predictStabilityLimit(input.operation);
  const targetSF = input.target_safety_factor ?? 1.5;
  const actualSF = depthLimit / input.operation.depth_of_cut_mm;

  return {
    pass: actualSF >= targetSF,
    predicted_depth_limit_mm: depthLimit,
    requested_depth_mm: input.operation.depth_of_cut_mm,
    safety_factor: +actualSF.toFixed(2),
    target_safety_factor: targetSF,
  };
}

// ============================================================================
// DISPATCHER
// ============================================================================

export function executeVerificationAction(action: string, params: Record<string, unknown>): unknown {
  log.info(`[ProcessVerification] action=${action}`);

  switch (action) {
    case 'verify_process':
      return verifyProcess(params as unknown as VerifyProcessInput);
    case 'verify_tolerance':
      return verifyTolerance(params as unknown as { operations: VerifyOperation[]; target_tolerance_mm?: number; target_IT_grade?: number });
    case 'verify_surface':
      return verifySurface(params as unknown as { operation: VerifyOperation; target_Ra_um?: number; target_Rz_um?: number });
    case 'verify_stability':
      return verifyStability(params as unknown as { operation: VerifyOperation; target_safety_factor?: number });
    default:
      throw new Error(`Unknown ProcessVerification action: ${action}`);
  }
}
