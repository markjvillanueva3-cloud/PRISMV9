/**
 * PartVariabilityRegressionHarnessEngine — L4 of the 4-layer per-part-type pipeline stack
 *
 * Asserts that a generated CNC program for a given (domain, part_class, fixture)
 * tuple is **cost-efficient, accurate, safe, and fully optimized** within
 * operator-supplied bounds. Returns a pass/fail verdict + per-axis evidence
 * + remediation hints when an axis fails.
 *
 * Acceptance axes (all must pass):
 *  1. cost:       expected_cost_usd ≤ budget_usd (within tolerance)
 *  2. accuracy:   max GD&T tolerance violation = 0; CMM-projected uncertainty ≤ budget
 *  3. safety:     S(x) ≥ safety_floor; no collision; ae_analyze + midcut verdict ≠ abort on dry-run
 *  4. cycle_time: predicted_cycle_s within ±3σ of expected_cycle_s
 *  5. closed_loop_verifier: verdict in_control on dry-run twin (GAP-7 iter17)
 *
 * Scope: this is the DEPENDABILITY PROOF engine. It does NOT generate the
 * program — it accepts a generated program (from L2 adapter → L3 master
 * pipeline) plus the expected bounds, and renders a verdict. Operator-actionable.
 *
 * Reference: ISO/IEC 25010 (software product quality — reliability + functional
 *  suitability axes); NIST/SEMATECH e-Handbook §8.2 (regression test design);
 *  Bohem (1981) "Software Engineering Economics" §16 (cost-quality tradeoffs).
 *
 * @version 1.0.0
 * @module PartVariabilityRegressionHarnessEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type Domain = "mill" | "lathe" | "wire-edm";

export type AcceptanceAxis = "cost" | "accuracy" | "safety" | "cycle_time" | "closed_loop";

export interface ExpectedBounds {
  budget_usd: number;
  budget_usd_tolerance?: number;          // default 0.10 (±10%)
  tolerance_violations_allowed?: number;  // default 0
  cmm_uncertainty_budget_um?: number;     // default 25
  safety_floor?: number;                  // default 0.95
  cycle_time_s: number;
  cycle_time_sigma_s?: number;            // default = 0.1 × cycle_time_s
  require_closed_loop_in_control?: boolean; // default true
}

export interface GeneratedProgramSummary {
  domain: Domain;
  part_class: string;
  fixture_id: string;
  predicted_cost_usd: number;
  tolerance_violations: number;
  cmm_projected_uncertainty_um: number;
  sx_safety_score: number;
  has_collision: boolean;
  midcut_verdict: "continue" | "reduce_feed" | "pull_off" | "abort";
  ae_verdict: "fresh" | "wear" | "chip" | "breakage" | "unknown";
  predicted_cycle_s: number;
  closed_loop_verdict: "in_control" | "drifted" | "diverged" | "abort";
}

export interface AxisVerdict {
  axis: AcceptanceAxis;
  pass: boolean;
  observed: number | string;
  expected: number | string;
  source: string;
  remediation?: string;
}

export interface HarnessInput {
  program: GeneratedProgramSummary;
  bounds: ExpectedBounds;
}

export interface HarnessResult {
  pass: boolean;
  domain: Domain;
  part_class: string;
  axes: AxisVerdict[];
  total_axes: number;
  failed_axes: number;
  confidence: AtomicValue;
  warnings: string[];
}

export class PartVariabilityRegressionHarnessEngine {
  /**
   * Assert that a generated program meets all 5 acceptance axes.
   * @param input Program summary + expected bounds
   * @returns Per-axis verdict + overall pass/fail
   */
  assert(input: HarnessInput): HarnessResult {
    if (!input || !input.program || !input.bounds) {
      throw new Error("PartVariabilityRegressionHarnessEngine.assert: program + bounds required");
    }
    const { program, bounds } = input;
    const warnings: string[] = [];
    const axes: AxisVerdict[] = [];

    // ─── 1. COST ──────────────────────────────────────────────────────
    const costTol = bounds.budget_usd_tolerance ?? 0.10;
    const costCap = bounds.budget_usd * (1 + costTol);
    const costPass = program.predicted_cost_usd <= costCap;
    axes.push({
      axis: "cost",
      pass: costPass,
      observed: program.predicted_cost_usd,
      expected: `≤ ${costCap.toFixed(2)}`,
      source: "Bohem (1981) §16; PipelineCostModelEngine",
      remediation: costPass ? undefined : "Reduce cycle time, switch to cheaper tooling, or re-quote",
    });

    // ─── 2. ACCURACY ─────────────────────────────────────────────────
    const tolMax = bounds.tolerance_violations_allowed ?? 0;
    const cmmCap = bounds.cmm_uncertainty_budget_um ?? 25;
    const accPass = program.tolerance_violations <= tolMax
      && program.cmm_projected_uncertainty_um <= cmmCap;
    axes.push({
      axis: "accuracy",
      pass: accPass,
      observed: `viol=${program.tolerance_violations}, U=${program.cmm_projected_uncertainty_um}μm`,
      expected: `viol≤${tolMax}, U≤${cmmCap}μm`,
      source: "ISO 1101 GD&T; ISO 14253 MetrologyBudgetEngine",
      remediation: accPass ? undefined : "Tighten datum scheme, add probe pass, or re-balance tolerance stackup",
    });

    // ─── 3. SAFETY ───────────────────────────────────────────────────
    const sxFloor = bounds.safety_floor ?? 0.95;
    const safetyPass = program.sx_safety_score >= sxFloor
      && !program.has_collision
      && program.midcut_verdict !== "abort"
      && program.ae_verdict !== "breakage";
    axes.push({
      axis: "safety",
      pass: safetyPass,
      observed: `S(x)=${program.sx_safety_score.toFixed(3)}, collision=${program.has_collision}, midcut=${program.midcut_verdict}, ae=${program.ae_verdict}`,
      expected: `S(x)≥${sxFloor}, no collision, midcut≠abort, ae≠breakage`,
      source: "ISO 13374-1; AcousticEmissionMonitoringEngine + MidCutDecisionOrchestratorEngine",
      remediation: safetyPass ? undefined : "Add safety margin to feed/speed, re-check fixture, re-run S(x) oracle",
    });

    // ─── 4. CYCLE TIME ───────────────────────────────────────────────
    const cycSigma = bounds.cycle_time_sigma_s ?? bounds.cycle_time_s * 0.1;
    const cycLow = bounds.cycle_time_s - 3 * cycSigma;
    const cycHigh = bounds.cycle_time_s + 3 * cycSigma;
    const cycPass = program.predicted_cycle_s >= cycLow && program.predicted_cycle_s <= cycHigh;
    axes.push({
      axis: "cycle_time",
      pass: cycPass,
      observed: program.predicted_cycle_s,
      expected: `${cycLow.toFixed(1)} ≤ t ≤ ${cycHigh.toFixed(1)} (±3σ)`,
      source: "NIST/SEMATECH §8.2 regression bounds",
      remediation: cycPass ? undefined : "Re-tune SpeedFeedOrchestrator, change CAM strategy, or re-quote",
    });

    // ─── 5. CLOSED-LOOP VERIFIER (GAP-7) ─────────────────────────────
    const requireClosedLoop = bounds.require_closed_loop_in_control ?? true;
    const clPass = !requireClosedLoop || program.closed_loop_verdict === "in_control";
    axes.push({
      axis: "closed_loop",
      pass: clPass,
      observed: program.closed_loop_verdict,
      expected: requireClosedLoop ? "in_control" : "any",
      source: "ClosedLoopVerifierEngine (foxtrot iter17 GAP-7 closure)",
      remediation: clPass ? undefined : "Re-run twin with updated F/H/Q/R model; check measurement-noise estimate",
    });

    const failedAxes = axes.filter(a => !a.pass).length;
    const pass = failedAxes === 0;

    if (pass) {
      warnings.push("All 5 acceptance axes PASSED — program is cost-efficient, accurate, safe, optimized.");
    }

    // Confidence — every passed axis adds 0.2 to a base 0.0; max 1.0
    const confidence = (axes.length - failedAxes) / axes.length;

    return {
      pass,
      domain: program.domain,
      part_class: program.part_class,
      axes,
      total_axes: axes.length,
      failed_axes: failedAxes,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "passed_axes / total_axes",
      },
      warnings,
    };
  }
}

export const partVariabilityRegressionHarnessEngine = new PartVariabilityRegressionHarnessEngine();
