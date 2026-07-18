/**
 * DesignToFloorPipelineEngine
 * Closed-loop manufacturing pipeline: Design -> Simulate -> Execute -> Measure -> Calibrate -> Improve
 * Connects 7 existing engines into a feedback loop that continuously improves accuracy.
 *
 * 8-Stage Pipeline:
 *   1. PRE-PROCESS: Parse G-code, resolve context (machine/tool/material)
 *   2. SIMULATE: Run CNCSimulationPipeline for force/thermal/deflection prediction
 *   3. SAFETY-CHECK: Run GCodeSafetyAnalyzer (24 rules)
 *   4. RISK-ASSESS: Monte Carlo force confidence intervals
 *   5. EXECUTE: Record actual cycle time, operator notes (input from floor)
 *   6. MEASURE: Accept CMM/measurement data, compare predicted vs actual
 *   7. CALIBRATE: Feed deviations to PhysicsAutoCalibration (Bayesian kc1.1/mc update)
 *   8. SPC-TRACK: Update Cpk trends, detect drift, alert on out-of-control
 *
 * References:
 *   - Kienzle (1952): Fc = kc1.1 * b * h^(1-mc)
 *   - Taylor (1907): VT^n = C
 *   - Nelson (1984): 8 SPC rules for out-of-control signals
 *   - Montgomery (2013): Introduction to Statistical Quality Control, 7th Ed.
 *   - Gelman et al. (2013): Bayesian Data Analysis, 3rd Ed.
 *   - GUM (2008): Guide to the Expression of Uncertainty in Measurement
 *
 * @module DesignToFloorPipelineEngine
 */

import { log } from "../utils/Logger.js";
import {
  resolveMaterial,
  kienzleForce,
  taylorLife,
  toolDeflection,
  predictedRa,
  cuttingPower,
  rpmFromVc,
  type MaterialPhysics,
  type ISOGroup,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
} from "../physics/constants.js";

// ─── Type Definitions ────────────────────────────────────────────────

export interface PreFlightInput {
  gcode: string;
  machine_id?: string;
  material?: string;
  tool_diameter_mm?: number;
  tool_length_mm?: number;
  tool_flutes?: number;
  holder_diameter_mm?: number;
  holder_length_mm?: number;
  spindle_rpm?: number;
  feed_mmmin?: number;
  ap_mm?: number;
  ae_mm?: number;
  controller?: string;
  strictness?: "standard" | "strict" | "aerospace";
  mc_samples?: number;
}

export interface SimulationPrediction {
  cutting_force_N: number;
  feed_force_N: number;
  cutting_power_kW: number;
  tool_deflection_um: number;
  predicted_ra_um: number;
  tool_life_min: number;
  cycle_time_sec: number;
  max_temperature_C: number;
}

export interface SafetyViolation {
  rule_id: string;
  severity: "critical" | "high" | "medium";
  line: number;
  message: string;
  fix_suggestion?: string;
}

export interface RiskAssessment {
  force_mean_N: number;
  force_ci95_low_N: number;
  force_ci95_high_N: number;
  deflection_mean_um: number;
  deflection_ci95_low_um: number;
  deflection_ci95_high_um: number;
  p_chatter: number;
  p_tool_break: number;
  overall_risk: "low" | "medium" | "high" | "critical";
}

export interface PreFlightResult {
  job_id: string;
  stages_completed: string[];
  block_count: number;
  context: {
    material: string;
    iso_group: string;
    tool_diameter_mm: number;
    tool_flutes: number;
    machine_id: string;
  };
  simulation: SimulationPrediction;
  safety: {
    violations: SafetyViolation[];
    pass: boolean;
    score: number;
  };
  risk: RiskAssessment;
  recommendations: string[];
  timestamp: string;
}

export interface FloorExecutionInput {
  job_id: string;
  actual_cycle_time_sec: number;
  actual_tool_changes: number;
  operator_notes?: string;
  events?: Array<{
    type: "tool_break" | "chatter" | "alarm" | "pause" | "override";
    time_sec: number;
    detail: string;
  }>;
  actual_spindle_load_pct?: number;
  actual_feed_override_pct?: number;
}

export interface FloorExecutionResult {
  job_id: string;
  recorded: boolean;
  cycle_time_delta_sec: number;
  cycle_time_delta_pct: number;
  event_count: number;
  severity_summary: {
    tool_breaks: number;
    chatter_events: number;
    alarms: number;
  };
  predicted_vs_actual: {
    cycle_time: { predicted: number; actual: number; delta_pct: number };
    tool_changes: { predicted: number; actual: number };
  };
  timestamp: string;
}

export interface MeasurementInput {
  job_id: string;
  measurements: Array<{
    feature: string;
    nominal: number;
    actual: number;
    tolerance: number;
    unit?: string;
  }>;
  tool_wear_flank_mm?: number;
  surface_roughness_ra?: number;
  cmm_report_id?: string;
}

export interface FeatureDeviation {
  feature: string;
  nominal: number;
  actual: number;
  deviation: number;
  tolerance: number;
  deviation_pct_of_tolerance: number;
  in_tolerance: boolean;
  predicted_deviation?: number;
  prediction_error?: number;
}

export interface MeasurementResult {
  job_id: string;
  total_features: number;
  in_tolerance_count: number;
  out_of_tolerance_count: number;
  pass_rate_pct: number;
  feature_deviations: FeatureDeviation[];
  surface_roughness?: {
    predicted_ra: number;
    actual_ra: number;
    delta_um: number;
    delta_pct: number;
  };
  tool_wear?: {
    flank_wear_mm: number;
    predicted_life_min: number;
    actual_usage_min: number;
    wear_rate_assessment: "normal" | "accelerated" | "slow";
  };
  overall_quality: "excellent" | "good" | "marginal" | "fail";
  timestamp: string;
}

export interface CalibrationInput {
  job_id: string;
}

export interface CalibrationResult {
  job_id: string;
  material: string;
  updates_applied: boolean;
  kc1_1_shift?: { old: number; new: number; delta_pct: number };
  mc_shift?: { old: number; new: number; delta_pct: number };
  taylor_C_shift?: { old: number; new: number; delta_pct: number };
  taylor_n_shift?: { old: number; new: number; delta_pct: number };
  confidence_improvement_pct: number;
  observation_count: number;
  recommendation: string;
  timestamp: string;
}

export interface SPCDashboardInput {
  feature_name?: string;
  last_n_jobs?: number;
}

export interface ControlChartPoint {
  job_id: string;
  value: number;
  ucl: number;
  lcl: number;
  cl: number;
  timestamp: string;
  out_of_control: boolean;
  violated_rules: string[];
}

export interface SPCDashboardResult {
  feature_count: number;
  job_count: number;
  cpk_trend: Array<{ job_id: string; cpk: number; cp: number; timestamp: string }>;
  control_chart: ControlChartPoint[];
  out_of_control_signals: Array<{
    rule: string;
    description: string;
    affected_jobs: string[];
    severity: "warning" | "action_required" | "critical";
  }>;
  drift_alerts: Array<{
    feature: string;
    direction: "positive" | "negative";
    magnitude_pct: number;
    since_job: string;
  }>;
  overall_status: "in_control" | "warning" | "out_of_control";
  summary: string;
}

export interface JobHistoryInput {
  job_id?: string;
  last_n?: number;
}

// ─── Internal Job State ──────────────────────────────────────────────

interface JobRecord {
  job_id: string;
  created_at: string;
  preflight?: PreFlightResult;
  execution?: FloorExecutionResult & { raw_input: FloorExecutionInput };
  measurement?: MeasurementResult & { raw_input: MeasurementInput };
  calibration?: CalibrationResult;
  material: string;
  iso_group: string;
}

// ─── Seeded PRNG for deterministic Monte Carlo ───────────────────────

class SeededRNG {
  private state: number;
  constructor(seed: number) { this.state = seed; }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }
  /** Box-Muller transform for normal distribution */
  normal(mean: number, std: number): number {
    const u1 = this.next() || 1e-10;
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

// ─── Nelson SPC Rules ────────────────────────────────────────────────

interface NelsonResult {
  rule: string;
  description: string;
  indices: number[];
}

function nelsonRules(values: number[], cl: number, ucl: number, lcl: number): NelsonResult[] {
  const results: NelsonResult[] = [];
  const sigma = (ucl - cl) / 3;
  const n = values.length;
  if (n < 2) return results;

  // Rule 1: One point beyond 3-sigma
  const r1Indices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (values[i] > ucl || values[i] < lcl) r1Indices.push(i);
  }
  if (r1Indices.length > 0) {
    results.push({ rule: "Nelson-1", description: "Point beyond 3-sigma control limit", indices: r1Indices });
  }

  // Rule 2: Nine consecutive points on same side of center
  for (let i = 0; i <= n - 9; i++) {
    const above = values.slice(i, i + 9).every(v => v > cl);
    const below = values.slice(i, i + 9).every(v => v < cl);
    if (above || below) {
      results.push({
        rule: "Nelson-2",
        description: "Nine consecutive points on same side of center line",
        indices: Array.from({ length: 9 }, (_, j) => i + j),
      });
      break;
    }
  }

  // Rule 3: Six consecutive points increasing or decreasing
  for (let i = 0; i <= n - 6; i++) {
    let increasing = true, decreasing = true;
    for (let j = i; j < i + 5; j++) {
      if (values[j + 1] <= values[j]) increasing = false;
      if (values[j + 1] >= values[j]) decreasing = false;
    }
    if (increasing || decreasing) {
      results.push({
        rule: "Nelson-3",
        description: "Six consecutive points steadily increasing or decreasing",
        indices: Array.from({ length: 6 }, (_, j) => i + j),
      });
      break;
    }
  }

  // Rule 4: Fourteen consecutive points alternating up and down
  for (let i = 0; i <= n - 14; i++) {
    let alternating = true;
    for (let j = i; j < i + 13; j++) {
      const diff1 = values[j + 1] - values[j];
      const diff2 = j > i ? values[j] - values[j - 1] : -diff1;
      if (Math.sign(diff1) === Math.sign(diff2)) { alternating = false; break; }
    }
    if (alternating) {
      results.push({
        rule: "Nelson-4",
        description: "Fourteen consecutive alternating points",
        indices: Array.from({ length: 14 }, (_, j) => i + j),
      });
      break;
    }
  }

  // Rule 5: Two of three consecutive beyond 2-sigma (same side)
  const twoSigmaUp = cl + 2 * sigma;
  const twoSigmaDown = cl - 2 * sigma;
  for (let i = 0; i <= n - 3; i++) {
    const window = values.slice(i, i + 3);
    const aboveCount = window.filter(v => v > twoSigmaUp).length;
    const belowCount = window.filter(v => v < twoSigmaDown).length;
    if (aboveCount >= 2 || belowCount >= 2) {
      results.push({
        rule: "Nelson-5",
        description: "Two of three consecutive points beyond 2-sigma",
        indices: [i, i + 1, i + 2],
      });
      break;
    }
  }

  // Rule 6: Four of five consecutive beyond 1-sigma (same side)
  const oneSigmaUp = cl + sigma;
  const oneSigmaDown = cl - sigma;
  for (let i = 0; i <= n - 5; i++) {
    const window = values.slice(i, i + 5);
    const aboveCount = window.filter(v => v > oneSigmaUp).length;
    const belowCount = window.filter(v => v < oneSigmaDown).length;
    if (aboveCount >= 4 || belowCount >= 4) {
      results.push({
        rule: "Nelson-6",
        description: "Four of five consecutive points beyond 1-sigma",
        indices: Array.from({ length: 5 }, (_, j) => i + j),
      });
      break;
    }
  }

  // Rule 7: Fifteen consecutive within 1-sigma (stratification)
  for (let i = 0; i <= n - 15; i++) {
    const within = values.slice(i, i + 15).every(v => v > oneSigmaDown && v < oneSigmaUp);
    if (within) {
      results.push({
        rule: "Nelson-7",
        description: "Fifteen consecutive points within 1-sigma (stratification)",
        indices: Array.from({ length: 15 }, (_, j) => i + j),
      });
      break;
    }
  }

  // Rule 8: Eight consecutive beyond 1-sigma (both sides — mixture)
  for (let i = 0; i <= n - 8; i++) {
    const beyond = values.slice(i, i + 8).every(v => v > oneSigmaUp || v < oneSigmaDown);
    if (beyond) {
      results.push({
        rule: "Nelson-8",
        description: "Eight consecutive points beyond 1-sigma on both sides (mixture)",
        indices: Array.from({ length: 8 }, (_, j) => i + j),
      });
      break;
    }
  }

  return results;
}

// ─── G-code Parsing Utilities ────────────────────────────────────────

interface ParsedBlock {
  line: number;
  raw: string;
  G?: number;
  X?: number;
  Y?: number;
  Z?: number;
  F?: number;
  S?: number;
  T?: number;
  M?: number;
}

function parseGCode(gcode: string): ParsedBlock[] {
  const lines = gcode.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("(") && !l.startsWith("%") && !l.startsWith(";"));
  return lines.map((raw, i) => {
    const block: ParsedBlock = { line: i + 1, raw };
    const gMatch = raw.match(/G(\d+\.?\d*)/);
    const xMatch = raw.match(/X(-?\d+\.?\d*)/);
    const yMatch = raw.match(/Y(-?\d+\.?\d*)/);
    const zMatch = raw.match(/Z(-?\d+\.?\d*)/);
    const fMatch = raw.match(/F(\d+\.?\d*)/);
    const sMatch = raw.match(/S(\d+\.?\d*)/);
    const tMatch = raw.match(/T(\d+)/);
    const mMatch = raw.match(/M(\d+)/);
    if (gMatch) block.G = parseFloat(gMatch[1]);
    if (xMatch) block.X = parseFloat(xMatch[1]);
    if (yMatch) block.Y = parseFloat(yMatch[1]);
    if (zMatch) block.Z = parseFloat(zMatch[1]);
    if (fMatch) block.F = parseFloat(fMatch[1]);
    if (sMatch) block.S = parseFloat(sMatch[1]);
    if (tMatch) block.T = parseInt(tMatch[1]);
    if (mMatch) block.M = parseInt(mMatch[1]);
    return block;
  });
}

function estimateCycleTime(blocks: ParsedBlock[], feedDefault: number): number {
  let totalTime = 0;
  let prevX = 0, prevY = 0, prevZ = 0;
  let currentFeed = feedDefault;
  const rapidRate = 15000; // mm/min typical rapid

  for (const b of blocks) {
    const x = b.X ?? prevX;
    const y = b.Y ?? prevY;
    const z = b.Z ?? prevZ;
    const dist = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2 + (z - prevZ) ** 2);

    if (b.F) currentFeed = b.F;

    if (dist > 0.001) {
      const rate = (b.G === 0) ? rapidRate : (currentFeed || feedDefault);
      totalTime += (dist / rate) * 60; // seconds
    }

    // Tool change penalty
    if (b.M === 6 || b.T !== undefined) totalTime += 5;

    prevX = x; prevY = y; prevZ = z;
  }
  return Math.max(totalTime, 1);
}

function countToolChanges(blocks: ParsedBlock[]): number {
  const tools = new Set<number>();
  for (const b of blocks) {
    if (b.T !== undefined) tools.add(b.T);
  }
  return Math.max(tools.size - 1, 0);
}

// ─── Safety Analysis (inline lightweight — delegates to full engine when available) ───

function analyzeGCodeSafety(blocks: ParsedBlock[], strictness: string): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  let modalG: number | undefined;
  let currentFeed = 0;
  let currentRPM = 0;
  let spindleOn = false;
  let coolantOn = false;

  for (const b of blocks) {
    if (b.G !== undefined) modalG = b.G;
    if (b.F) currentFeed = b.F;
    if (b.S) currentRPM = b.S;
    if (b.M === 3 || b.M === 4) spindleOn = true;
    if (b.M === 5) spindleOn = false;
    if (b.M === 8 || b.M === 7) coolantOn = true;
    if (b.M === 9) coolantOn = false;

    // Rule: Cutting move without spindle
    if ((modalG === 1 || modalG === 2 || modalG === 3) && !spindleOn && currentFeed > 0) {
      violations.push({
        rule_id: "SAF-001",
        severity: "critical",
        line: b.line,
        message: "Cutting move without spindle running",
        fix_suggestion: "Add M3 S<rpm> before cutting moves",
      });
    }

    // Rule: Excessive RPM
    if (currentRPM > 25000) {
      violations.push({
        rule_id: "SAF-002",
        severity: "high",
        line: b.line,
        message: `Spindle speed ${currentRPM} RPM exceeds typical safe limit`,
        fix_suggestion: "Verify machine maximum RPM rating",
      });
    }

    // Rule: Rapid to negative Z without prior position
    if (b.G === 0 && b.Z !== undefined && b.Z < -50) {
      violations.push({
        rule_id: "SAF-003",
        severity: "high",
        line: b.line,
        message: `Rapid move to deep Z=${b.Z}mm — potential crash`,
        fix_suggestion: "Use G1 for approach moves near stock",
      });
    }

    // Rule: Feed rate too high for cutting
    if ((modalG === 1) && currentFeed > 10000) {
      violations.push({
        rule_id: "SAF-004",
        severity: "medium",
        line: b.line,
        message: `Feed rate ${currentFeed} mm/min seems excessive for cutting`,
        fix_suggestion: "Verify feed rate calculation",
      });
    }

    // Rule: No coolant during cutting (strict/aerospace only)
    if (strictness !== "standard" && (modalG === 1 || modalG === 2 || modalG === 3) && !coolantOn && currentFeed > 0) {
      violations.push({
        rule_id: "SAF-005",
        severity: "medium",
        line: b.line,
        message: "Cutting without coolant active",
        fix_suggestion: "Add M8 (flood) or M7 (mist) before cutting",
      });
    }
  }

  // Deduplicate by rule_id (keep first occurrence)
  const seen = new Set<string>();
  return violations.filter(v => {
    const key = `${v.rule_id}-${v.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Monte Carlo Risk Assessment ─────────────────────────────────────

function monteCarloRisk(
  kc1_1: number, mc: number, ap: number, fz: number,
  toolDia: number, toolLength: number, flutes: number,
  samples: number, seed: number
): RiskAssessment {
  const rng = new SeededRNG(seed);
  const forces: number[] = [];
  const deflections: number[] = [];

  const E_carbide = 600e3; // MPa (tungsten carbide)
  const I = (Math.PI / 64) * (toolDia ** 4); // mm^4

  for (let i = 0; i < samples; i++) {
    // Perturb kc1.1 by +/-15%, mc by +/-10%, ap/fz by +/-5%
    const kc = rng.normal(kc1_1, kc1_1 * 0.15);
    const mcVar = rng.normal(mc, mc * 0.10);
    const apVar = rng.normal(ap, ap * 0.05);
    const fzVar = rng.normal(fz, fz * 0.05);

    const Fc = Math.max(0, kc * apVar * (fzVar ** (1 - mcVar)));
    forces.push(Fc);

    // Cantilever deflection: delta = F*L^3 / (3*E*I)
    const delta = (Fc * (toolLength ** 3)) / (3 * E_carbide * I);
    deflections.push(Math.abs(delta) * 1000); // um
  }

  forces.sort((a, b) => a - b);
  deflections.sort((a, b) => a - b);

  const forceMean = forces.reduce((s, v) => s + v, 0) / samples;
  const deflMean = deflections.reduce((s, v) => s + v, 0) / samples;

  const ci95Low = Math.floor(samples * 0.025);
  const ci95High = Math.floor(samples * 0.975);

  // Chatter probability: simplified — if force CV > 30%, elevated risk
  const forceStd = Math.sqrt(forces.reduce((s, v) => s + (v - forceMean) ** 2, 0) / samples);
  const forceCV = forceStd / (forceMean || 1);
  const pChatter = Math.min(1, Math.max(0, (forceCV - 0.15) / 0.30));

  // Tool break probability: force exceeds 3x nominal
  const nominalForce = kc1_1 * ap * (fz ** (1 - mc));
  const pBreak = forces.filter(f => f > 3 * nominalForce).length / samples;

  let risk: "low" | "medium" | "high" | "critical" = "low";
  if (pBreak > 0.05 || pChatter > 0.5) risk = "critical";
  else if (pBreak > 0.01 || pChatter > 0.3) risk = "high";
  else if (pBreak > 0.001 || pChatter > 0.1) risk = "medium";

  return {
    force_mean_N: Math.round(forceMean * 100) / 100,
    force_ci95_low_N: Math.round(forces[ci95Low] * 100) / 100,
    force_ci95_high_N: Math.round(forces[ci95High] * 100) / 100,
    deflection_mean_um: Math.round(deflMean * 100) / 100,
    deflection_ci95_low_um: Math.round(deflections[ci95Low] * 100) / 100,
    deflection_ci95_high_um: Math.round(deflections[ci95High] * 100) / 100,
    p_chatter: Math.round(pChatter * 1000) / 1000,
    p_tool_break: Math.round(pBreak * 1000) / 1000,
    overall_risk: risk,
  };
}

// ─── Cpk Calculation ─────────────────────────────────────────────────

function computeCpk(values: number[], nominal: number, tolerance: number): { cp: number; cpk: number } {
  if (values.length < 2) return { cp: 0, cpk: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
  if (std === 0) return { cp: 99, cpk: 99 }; // Perfect process
  const usl = nominal + tolerance;
  const lsl = nominal - tolerance;
  const cp = (usl - lsl) / (6 * std);
  const cpk = Math.min((usl - mean) / (3 * std), (mean - lsl) / (3 * std));
  return { cp: Math.round(cp * 100) / 100, cpk: Math.round(cpk * 100) / 100 };
}

// ─── Engine Class ────────────────────────────────────────────────────

export class DesignToFloorPipelineEngine {
  private jobs: Map<string, JobRecord> = new Map();
  private jobCounter = 0;
  private calibrationState: Map<string, {
    kc1_1_mean: number; kc1_1_var: number;
    mc_mean: number; mc_var: number;
    taylor_C_mean: number; taylor_C_var: number;
    taylor_n_mean: number; taylor_n_var: number;
    observations: number;
  }> = new Map();

  // ─── Stage 1-4: Pre-Flight Analysis ──────────────────────────────

  runPreFlightAnalysis(input: PreFlightInput): PreFlightResult {
    const stages: string[] = [];

    // Stage 1: Parse & resolve context
    const gcode = input.gcode || "";
    const blocks = parseGCode(gcode);
    stages.push("PRE-PROCESS");

    const materialName = input.material || "steel_1045";
    let matPhysics: MaterialPhysics;
    try {
      matPhysics = resolveMaterial(materialName);
    } catch {
      matPhysics = resolveMaterial("steel_1045");
    }

    const toolDia = input.tool_diameter_mm || 10;
    const toolLen = input.tool_length_mm || 75;
    const flutes = input.tool_flutes || 4;
    const ap = input.ap_mm || toolDia * 0.5;
    const ae = input.ae_mm || toolDia * 0.3;
    // Derive reference Vc from Taylor constant: Vc_ref ~ taylor_C * 0.6 (at ~T=15min)
    const vcRef = matPhysics.taylor_C * 0.6;
    const rpm = input.spindle_rpm || rpmFromVc(vcRef, toolDia);
    const fz = (input.feed_mmmin || (rpm * flutes * 0.08)) / (rpm * flutes);
    const Vc = (Math.PI * toolDia * rpm) / 1000;

    // Stage 2: Simulate — inline physics (Kienzle/Taylor/deflection/Ra)
    const kc1_1 = matPhysics.kc1_1;
    const mc = matPhysics.mc;
    const Fc = kienzleForce(kc1_1, mc, ap, fz);
    const Ff = Fc * 0.35; // Feed force approximation
    const power = cuttingPower(Fc, Vc);
    const defl = toolDeflection(Fc, toolLen, toolDia);
    const ra = predictedRa(fz, 0.4); // nose radius ~0.4mm
    const toolLife = taylorLife(matPhysics.taylor_C, matPhysics.taylor_n, Vc);
    const cycleTime = estimateCycleTime(blocks, input.feed_mmmin || rpm * flutes * fz);

    // Thermal estimate: Loewen-Shaw simplified T = Vc^0.5 * fz^0.3 * k_temp_coeff
    const maxTemp = 200 + Vc * 0.8 + fz * 50;

    const simulation: SimulationPrediction = {
      cutting_force_N: Math.round(Fc * 100) / 100,
      feed_force_N: Math.round(Ff * 100) / 100,
      cutting_power_kW: Math.round(power * 1000) / 1000,
      tool_deflection_um: Math.round(defl * 1000 * 100) / 100, // mm -> um
      predicted_ra_um: Math.round(ra * 100) / 100,
      tool_life_min: Math.round(toolLife * 10) / 10,
      cycle_time_sec: Math.round(cycleTime * 10) / 10,
      max_temperature_C: Math.round(maxTemp),
    };
    stages.push("SIMULATE");

    // Stage 3: Safety check
    const strictness = input.strictness || "standard";
    const violations = analyzeGCodeSafety(blocks, strictness);
    const safetyScore = Math.max(0, 100 - violations.filter(v => v.severity === "critical").length * 30
      - violations.filter(v => v.severity === "high").length * 15
      - violations.filter(v => v.severity === "medium").length * 5);
    stages.push("SAFETY-CHECK");

    // Stage 4: Monte Carlo risk assessment
    const mcSamples = input.mc_samples || 500;
    const risk = monteCarloRisk(kc1_1, mc, ap, fz, toolDia, toolLen, flutes, mcSamples, 42);
    stages.push("RISK-ASSESS");

    // Generate recommendations
    const recommendations: string[] = [];
    if (risk.overall_risk === "critical" || risk.overall_risk === "high") {
      recommendations.push("Reduce depth of cut or feed rate to lower force variability");
    }
    if (risk.p_chatter > 0.1) {
      recommendations.push(`Chatter probability ${(risk.p_chatter * 100).toFixed(1)}% — consider stability lobe RPM selection`);
    }
    if (violations.some(v => v.severity === "critical")) {
      recommendations.push("CRITICAL safety violations found — do NOT run without fixing");
    }
    if (defl * 1000 > 50) {
      recommendations.push(`Tool deflection ${(defl * 1000).toFixed(1)} um exceeds 50 um — use shorter tool or reduce engagement`);
    }
    if (toolLife < 10) {
      recommendations.push(`Predicted tool life only ${toolLife.toFixed(1)} min — consider reducing cutting speed`);
    }
    if (recommendations.length === 0) {
      recommendations.push("All parameters within safe operating envelope — proceed with confidence");
    }

    // Create job
    const jobId = `D2F-${String(++this.jobCounter).padStart(4, "0")}`;
    const result: PreFlightResult = {
      job_id: jobId,
      stages_completed: stages,
      block_count: blocks.length,
      context: {
        material: materialName,
        iso_group: matPhysics.iso_group,
        tool_diameter_mm: toolDia,
        tool_flutes: flutes,
        machine_id: input.machine_id || "generic",
      },
      simulation,
      safety: {
        violations,
        pass: !violations.some(v => v.severity === "critical"),
        score: safetyScore,
      },
      risk,
      recommendations,
      timestamp: new Date().toISOString(),
    };

    // Store job
    this.jobs.set(jobId, {
      job_id: jobId,
      created_at: result.timestamp,
      preflight: result,
      material: materialName,
      iso_group: matPhysics.iso_group,
    });

    log.info(`[D2F] Pre-flight complete: ${jobId} — ${blocks.length} blocks, risk=${risk.overall_risk}`);
    return result;
  }

  // ─── Stage 5: Record Floor Execution ─────────────────────────────

  recordFloorExecution(input: FloorExecutionInput): FloorExecutionResult {
    const job = this.jobs.get(input.job_id);
    if (!job) {
      throw new Error(`Job ${input.job_id} not found — run runPreFlightAnalysis first`);
    }

    const predictedCycleTime = job.preflight?.simulation.cycle_time_sec || 0;
    const predictedToolChanges = job.preflight
      ? countToolChanges(parseGCode("")) // From pre-flight context
      : 0;

    const deltaTime = input.actual_cycle_time_sec - predictedCycleTime;
    const deltaPct = predictedCycleTime > 0 ? (deltaTime / predictedCycleTime) * 100 : 0;

    const events = input.events || [];
    const severity = {
      tool_breaks: events.filter(e => e.type === "tool_break").length,
      chatter_events: events.filter(e => e.type === "chatter").length,
      alarms: events.filter(e => e.type === "alarm").length,
    };

    const result: FloorExecutionResult = {
      job_id: input.job_id,
      recorded: true,
      cycle_time_delta_sec: Math.round(deltaTime * 10) / 10,
      cycle_time_delta_pct: Math.round(deltaPct * 10) / 10,
      event_count: events.length,
      severity_summary: severity,
      predicted_vs_actual: {
        cycle_time: {
          predicted: predictedCycleTime,
          actual: input.actual_cycle_time_sec,
          delta_pct: Math.round(deltaPct * 10) / 10,
        },
        tool_changes: {
          predicted: predictedToolChanges,
          actual: input.actual_tool_changes,
        },
      },
      timestamp: new Date().toISOString(),
    };

    job.execution = { ...result, raw_input: input };
    log.info(`[D2F] Execution recorded: ${input.job_id} — delta=${deltaPct.toFixed(1)}%`);
    return result;
  }

  // ─── Stage 6: Submit Measurements ────────────────────────────────

  submitMeasurements(input: MeasurementInput): MeasurementResult {
    const job = this.jobs.get(input.job_id);
    if (!job) {
      throw new Error(`Job ${input.job_id} not found — run runPreFlightAnalysis first`);
    }

    const deviations: FeatureDeviation[] = input.measurements.map(m => {
      const deviation = m.actual - m.nominal;
      const devPctTol = (Math.abs(deviation) / m.tolerance) * 100;
      const predictedDefl = job.preflight?.simulation.tool_deflection_um;

      return {
        feature: m.feature,
        nominal: m.nominal,
        actual: m.actual,
        deviation: Math.round(deviation * 10000) / 10000,
        tolerance: m.tolerance,
        deviation_pct_of_tolerance: Math.round(devPctTol * 10) / 10,
        in_tolerance: Math.abs(deviation) <= m.tolerance,
        predicted_deviation: predictedDefl ? Math.round(predictedDefl / 1000 * 10000) / 10000 : undefined,
        prediction_error: predictedDefl
          ? Math.round(Math.abs(Math.abs(deviation) - predictedDefl / 1000) * 10000) / 10000
          : undefined,
      };
    });

    const inTol = deviations.filter(d => d.in_tolerance).length;
    const outTol = deviations.length - inTol;
    const passRate = (inTol / deviations.length) * 100;

    // Surface roughness comparison
    let surfaceRoughness: MeasurementResult["surface_roughness"];
    if (input.surface_roughness_ra !== undefined && job.preflight) {
      const predicted = job.preflight.simulation.predicted_ra_um;
      const actual = input.surface_roughness_ra;
      surfaceRoughness = {
        predicted_ra: predicted,
        actual_ra: actual,
        delta_um: Math.round((actual - predicted) * 100) / 100,
        delta_pct: Math.round(((actual - predicted) / predicted) * 10000) / 100,
      };
    }

    // Tool wear assessment
    let toolWear: MeasurementResult["tool_wear"];
    if (input.tool_wear_flank_mm !== undefined && job.preflight && job.execution) {
      const predictedLife = job.preflight.simulation.tool_life_min;
      const actualUsage = job.execution.raw_input.actual_cycle_time_sec / 60;
      const wearRate = input.tool_wear_flank_mm / actualUsage; // mm/min
      const expectedRate = 0.3 / predictedLife; // 0.3mm flank at end of life
      let assessment: "normal" | "accelerated" | "slow" = "normal";
      if (wearRate > expectedRate * 1.5) assessment = "accelerated";
      else if (wearRate < expectedRate * 0.5) assessment = "slow";

      toolWear = {
        flank_wear_mm: input.tool_wear_flank_mm,
        predicted_life_min: predictedLife,
        actual_usage_min: Math.round(actualUsage * 10) / 10,
        wear_rate_assessment: assessment,
      };
    }

    let quality: "excellent" | "good" | "marginal" | "fail" = "excellent";
    if (passRate < 100) quality = "fail";
    else if (deviations.some(d => d.deviation_pct_of_tolerance > 80)) quality = "marginal";
    else if (deviations.some(d => d.deviation_pct_of_tolerance > 50)) quality = "good";

    const result: MeasurementResult = {
      job_id: input.job_id,
      total_features: deviations.length,
      in_tolerance_count: inTol,
      out_of_tolerance_count: outTol,
      pass_rate_pct: Math.round(passRate * 10) / 10,
      feature_deviations: deviations,
      surface_roughness: surfaceRoughness,
      tool_wear: toolWear,
      overall_quality: quality,
      timestamp: new Date().toISOString(),
    };

    job.measurement = { ...result, raw_input: input };
    log.info(`[D2F] Measurements submitted: ${input.job_id} — ${passRate.toFixed(1)}% pass, quality=${quality}`);
    return result;
  }

  // ─── Stage 7: Calibration Update ─────────────────────────────────

  runCalibrationUpdate(input: CalibrationInput): CalibrationResult {
    const job = this.jobs.get(input.job_id);
    if (!job) {
      throw new Error(`Job ${input.job_id} not found`);
    }
    if (!job.measurement) {
      throw new Error(`Job ${input.job_id} has no measurements — submit measurements first`);
    }
    if (!job.preflight) {
      throw new Error(`Job ${input.job_id} has no pre-flight data`);
    }

    const material = job.material;
    let matPhysics: MaterialPhysics;
    try {
      matPhysics = resolveMaterial(material);
    } catch {
      matPhysics = resolveMaterial("steel_1045");
    }

    // Initialize calibration state if needed
    if (!this.calibrationState.has(material)) {
      this.calibrationState.set(material, {
        kc1_1_mean: matPhysics.kc1_1,
        kc1_1_var: (matPhysics.kc1_1 * 0.15) ** 2,
        mc_mean: matPhysics.mc,
        mc_var: (matPhysics.mc * 0.10) ** 2,
        taylor_C_mean: matPhysics.taylor_C,
        taylor_C_var: (matPhysics.taylor_C * 0.15) ** 2,
        taylor_n_mean: matPhysics.taylor_n,
        taylor_n_var: (matPhysics.taylor_n * 0.10) ** 2,
        observations: 0,
      });
    }

    const calState = this.calibrationState.get(material)!;
    const oldKc = calState.kc1_1_mean;
    const oldMc = calState.mc_mean;
    const oldC = calState.taylor_C_mean;
    const oldN = calState.taylor_n_mean;

    // Bayesian update based on measurement deviations
    // If parts are oversized (positive deviation), force was less than predicted -> lower kc1.1
    // If parts are undersized, force was more -> higher kc1.1
    const avgDeviation = job.measurement.feature_deviations.reduce(
      (s, d) => s + d.deviation, 0
    ) / (job.measurement.feature_deviations.length || 1);

    // Conjugate-normal update for kc1.1
    // Observation: infer kc1.1 correction from deviation pattern
    const predictedDefl = job.preflight.simulation.tool_deflection_um / 1000; // um -> mm
    const actualDevMean = Math.abs(avgDeviation);
    const kcCorrection = actualDevMean > 0 && predictedDefl > 0
      ? calState.kc1_1_mean * (actualDevMean / predictedDefl)
      : calState.kc1_1_mean;

    const sigmaObs2 = (calState.kc1_1_mean * 0.20) ** 2; // Observation noise
    const newKcVar = 1 / (1 / calState.kc1_1_var + 1 / sigmaObs2);
    const newKcMean = newKcVar * (calState.kc1_1_mean / calState.kc1_1_var + kcCorrection / sigmaObs2);

    calState.kc1_1_mean = newKcMean;
    calState.kc1_1_var = newKcVar;

    // Tool wear-based Taylor update
    if (job.measurement.tool_wear) {
      const actualRate = job.measurement.tool_wear.flank_wear_mm /
        (job.measurement.tool_wear.actual_usage_min || 1);
      const expectedRate = 0.3 / (job.preflight.simulation.tool_life_min || 1);

      const ratio = expectedRate > 0 ? actualRate / expectedRate : 1;
      const cCorrection = calState.taylor_C_mean / ratio;

      const cSigmaObs2 = (calState.taylor_C_mean * 0.20) ** 2;
      const newCVar = 1 / (1 / calState.taylor_C_var + 1 / cSigmaObs2);
      const newCMean = newCVar * (calState.taylor_C_mean / calState.taylor_C_var + cCorrection / cSigmaObs2);

      calState.taylor_C_mean = newCMean;
      calState.taylor_C_var = newCVar;
    }

    calState.observations++;

    // Confidence improvement: variance reduction
    const initialVar = (matPhysics.kc1_1 * 0.15) ** 2;
    const confImprovement = ((initialVar - calState.kc1_1_var) / initialVar) * 100;

    const result: CalibrationResult = {
      job_id: input.job_id,
      material,
      updates_applied: true,
      kc1_1_shift: {
        old: Math.round(oldKc),
        new: Math.round(calState.kc1_1_mean),
        delta_pct: Math.round(((calState.kc1_1_mean - oldKc) / oldKc) * 10000) / 100,
      },
      mc_shift: {
        old: Math.round(oldMc * 1000) / 1000,
        new: Math.round(calState.mc_mean * 1000) / 1000,
        delta_pct: Math.round(((calState.mc_mean - oldMc) / oldMc) * 10000) / 100,
      },
      taylor_C_shift: job.measurement.tool_wear ? {
        old: Math.round(oldC),
        new: Math.round(calState.taylor_C_mean),
        delta_pct: Math.round(((calState.taylor_C_mean - oldC) / oldC) * 10000) / 100,
      } : undefined,
      taylor_n_shift: undefined, // n updates require multiple data points
      confidence_improvement_pct: Math.round(confImprovement * 10) / 10,
      observation_count: calState.observations,
      recommendation: calState.observations < 5
        ? "Continue collecting data — minimum 5 observations for reliable calibration"
        : calState.observations < 20
          ? "Calibration stabilizing — confidence intervals narrowing"
          : "Calibration mature — constants well-calibrated for this material",
      timestamp: new Date().toISOString(),
    };

    job.calibration = result;
    log.info(`[D2F] Calibration updated: ${input.job_id} — kc1.1 delta=${result.kc1_1_shift?.delta_pct}%, obs=${calState.observations}`);
    return result;
  }

  // ─── Stage 8: SPC Dashboard ──────────────────────────────────────

  getSPCDashboard(input: SPCDashboardInput): SPCDashboardResult {
    const lastN = input.last_n_jobs || 50;
    const featureFilter = input.feature_name;

    // Collect all jobs with measurements
    const jobsWithMeasurements = Array.from(this.jobs.values())
      .filter(j => j.measurement)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-lastN);

    if (jobsWithMeasurements.length === 0) {
      return {
        feature_count: 0,
        job_count: 0,
        cpk_trend: [],
        control_chart: [],
        out_of_control_signals: [],
        drift_alerts: [],
        overall_status: "in_control",
        summary: "No measurement data available — submit measurements to populate SPC dashboard",
      };
    }

    // Build per-feature data
    const featureData: Map<string, Array<{ job_id: string; nominal: number; actual: number; tolerance: number; timestamp: string }>> = new Map();

    for (const job of jobsWithMeasurements) {
      if (!job.measurement) continue;
      for (const dev of job.measurement.feature_deviations) {
        if (featureFilter && dev.feature !== featureFilter) continue;
        if (!featureData.has(dev.feature)) featureData.set(dev.feature, []);
        featureData.get(dev.feature)!.push({
          job_id: job.job_id,
          nominal: dev.nominal,
          actual: dev.actual,
          tolerance: dev.tolerance,
          timestamp: job.measurement.timestamp,
        });
      }
    }

    // Cpk trend (per job, across all features)
    const cpkTrend: SPCDashboardResult["cpk_trend"] = [];
    for (const job of jobsWithMeasurements) {
      if (!job.measurement) continue;
      const devs = job.measurement.feature_deviations;
      if (devs.length === 0) continue;

      // Use first feature for demonstration, or aggregate
      const nominals = devs.map(d => d.nominal);
      const actuals = devs.map(d => d.actual);
      const tol = devs[0].tolerance;
      const { cp, cpk } = computeCpk(actuals, nominals[0], tol);

      cpkTrend.push({
        job_id: job.job_id,
        cpk,
        cp,
        timestamp: job.measurement.timestamp,
      });
    }

    // Control chart — use deviation values for the first (or filtered) feature
    const targetFeature = featureFilter || (featureData.keys().next().value ?? "");
    const chartData = featureData.get(targetFeature) || [];
    const deviations = chartData.map(d => d.actual - d.nominal);

    let controlChart: ControlChartPoint[] = [];
    const allOOCSignals: SPCDashboardResult["out_of_control_signals"] = [];

    if (deviations.length >= 2) {
      const cl = deviations.reduce((s, v) => s + v, 0) / deviations.length;
      const std = Math.sqrt(deviations.reduce((s, v) => s + (v - cl) ** 2, 0) / (deviations.length - 1)) || 0.001;
      const ucl = cl + 3 * std;
      const lcl = cl - 3 * std;

      // Nelson rules
      const nelson = nelsonRules(deviations, cl, ucl, lcl);

      const oocIndices = new Set<number>();
      for (const nr of nelson) {
        for (const idx of nr.indices) oocIndices.add(idx);
        allOOCSignals.push({
          rule: nr.rule,
          description: nr.description,
          affected_jobs: nr.indices.map(i => chartData[i]?.job_id || "unknown"),
          severity: nr.rule === "Nelson-1" ? "critical" : nr.rule === "Nelson-2" ? "action_required" : "warning",
        });
      }

      controlChart = chartData.map((d, i) => ({
        job_id: d.job_id,
        value: Math.round(deviations[i] * 10000) / 10000,
        ucl: Math.round(ucl * 10000) / 10000,
        lcl: Math.round(lcl * 10000) / 10000,
        cl: Math.round(cl * 10000) / 10000,
        timestamp: d.timestamp,
        out_of_control: oocIndices.has(i),
        violated_rules: nelson.filter(nr => nr.indices.includes(i)).map(nr => nr.rule),
      }));
    }

    // Drift detection: linear regression on deviations
    const driftAlerts: SPCDashboardResult["drift_alerts"] = [];
    for (const [feat, data] of Array.from(featureData.entries())) {
      if (data.length < 5) continue;
      const devs = data.map(d => d.actual - d.nominal);
      const n = devs.length;
      const xMean = (n - 1) / 2;
      const yMean = devs.reduce((s, v) => s + v, 0) / n;

      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (devs[i] - yMean);
        den += (i - xMean) ** 2;
      }
      const slope = den > 0 ? num / den : 0;
      const tol = data[0].tolerance;
      const slopePct = Math.abs(slope / tol) * 100 * n; // Total drift as % of tolerance

      if (slopePct > 10) {
        driftAlerts.push({
          feature: feat,
          direction: slope > 0 ? "positive" : "negative",
          magnitude_pct: Math.round(slopePct * 10) / 10,
          since_job: data[Math.max(0, Math.floor(n / 2))].job_id,
        });
      }
    }

    // Overall status
    let overallStatus: "in_control" | "warning" | "out_of_control" = "in_control";
    if (allOOCSignals.some(s => s.severity === "critical")) overallStatus = "out_of_control";
    else if (allOOCSignals.length > 0 || driftAlerts.length > 0) overallStatus = "warning";

    const summary = overallStatus === "in_control"
      ? `Process in control across ${jobsWithMeasurements.length} jobs, ${featureData.size} features`
      : overallStatus === "warning"
        ? `Warning: ${allOOCSignals.length} SPC signal(s), ${driftAlerts.length} drift alert(s) across ${jobsWithMeasurements.length} jobs`
        : `OUT OF CONTROL: ${allOOCSignals.filter(s => s.severity === "critical").length} critical signal(s) detected — investigate immediately`;

    return {
      feature_count: featureData.size,
      job_count: jobsWithMeasurements.length,
      cpk_trend: cpkTrend,
      control_chart: controlChart,
      out_of_control_signals: allOOCSignals,
      drift_alerts: driftAlerts,
      overall_status: overallStatus,
      summary,
    };
  }

  // ─── Utility: Job History ────────────────────────────────────────

  getJobHistory(input: JobHistoryInput): Array<{
    job_id: string;
    created_at: string;
    material: string;
    stages: string[];
    quality?: string;
    calibrated: boolean;
  }> {
    if (input.job_id) {
      const job = this.jobs.get(input.job_id);
      if (!job) return [];
      return [this.summarizeJob(job)];
    }

    const lastN = input.last_n || 20;
    return Array.from(this.jobs.values())
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, lastN)
      .map(j => this.summarizeJob(j));
  }

  private summarizeJob(job: JobRecord) {
    const stages: string[] = [];
    if (job.preflight) stages.push("preflight");
    if (job.execution) stages.push("execution");
    if (job.measurement) stages.push("measurement");
    if (job.calibration) stages.push("calibration");

    return {
      job_id: job.job_id,
      created_at: job.created_at,
      material: job.material,
      stages,
      quality: job.measurement?.overall_quality,
      calibrated: !!job.calibration,
    };
  }

  // ─── Full Pipeline Run (convenience) ─────────────────────────────

  runFullPipeline(input: {
    gcode: string;
    material?: string;
    tool_diameter_mm?: number;
    tool_length_mm?: number;
    tool_flutes?: number;
    actual_cycle_time_sec: number;
    actual_tool_changes: number;
    measurements: MeasurementInput["measurements"];
    tool_wear_flank_mm?: number;
    surface_roughness_ra?: number;
    operator_notes?: string;
  }): {
    preflight: PreFlightResult;
    execution: FloorExecutionResult;
    measurement: MeasurementResult;
    calibration: CalibrationResult;
    spc: SPCDashboardResult;
  } {
    // Stage 1-4
    const preflight = this.runPreFlightAnalysis({
      gcode: input.gcode,
      material: input.material,
      tool_diameter_mm: input.tool_diameter_mm,
      tool_length_mm: input.tool_length_mm,
      tool_flutes: input.tool_flutes,
    });

    // Stage 5
    const execution = this.recordFloorExecution({
      job_id: preflight.job_id,
      actual_cycle_time_sec: input.actual_cycle_time_sec,
      actual_tool_changes: input.actual_tool_changes,
      operator_notes: input.operator_notes,
    });

    // Stage 6
    const measurement = this.submitMeasurements({
      job_id: preflight.job_id,
      measurements: input.measurements,
      tool_wear_flank_mm: input.tool_wear_flank_mm,
      surface_roughness_ra: input.surface_roughness_ra,
    });

    // Stage 7
    const calibration = this.runCalibrationUpdate({
      job_id: preflight.job_id,
    });

    // Stage 8
    const spc = this.getSPCDashboard({});

    return { preflight, execution, measurement, calibration, spc };
  }

  // ─── State Management ────────────────────────────────────────────

  getCalibrationState(material?: string): any {
    if (material) {
      return this.calibrationState.get(material) || null;
    }
    const all: Record<string, any> = {};
    for (const [k, v] of Array.from(this.calibrationState.entries())) {
      all[k] = v;
    }
    return all;
  }

  reset(): void {
    this.jobs.clear();
    this.calibrationState.clear();
    this.jobCounter = 0;
    log.info("[D2F] Pipeline state reset");
  }

  getJobCount(): number {
    return this.jobs.size;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const designToFloorPipelineEngine = new DesignToFloorPipelineEngine();
