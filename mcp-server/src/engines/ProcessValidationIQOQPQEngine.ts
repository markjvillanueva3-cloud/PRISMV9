/**
 * ProcessValidationIQOQPQEngine
 * ===============================
 *
 * FDA Process Validation protocol generator for regulated manufacturing.
 * Builds IQ, OQ, PQ protocols per FDA 2011 Process Validation Guidance
 * and GHTF SG3/N99-10 (medical device harmonization).
 *
 * Three stages (FDA nomenclature):
 *   Stage 1 — Process Design: formally not IQ/OQ/PQ but feeds them
 *   Stage 2 — Process Qualification:
 *     IQ  (Installation Qualification): correct installation + utilities
 *     OQ  (Operational Qualification): operating ranges + worst-case
 *     PQ  (Performance Qualification): reproducibility at intended use
 *   Stage 3 — Continued Process Verification (CPV): ongoing monitoring
 *
 * IQ checklist:
 *   - Equipment matches P&ID / installation drawings
 *   - Utilities (electrical, compressed air, coolant, data) connected
 *   - Calibration certificates for critical instruments
 *   - SOPs & training records
 *
 * OQ: exercise the process across its operating range
 *   - Parameter worst-case combinations
 *   - Alarm / interlock verification
 *   - Minimum 3 replicate runs at each condition (typical)
 *
 * PQ: demonstrate consistent performance
 *   - Minimum 3 consecutive successful runs at nominal + target
 *   - CTQ (Critical to Quality) metrics meet spec with Cpk ≥ 1.33
 *
 * Acceptance:
 *   - Each stage pass/fail by checklist completion + data
 *   - Process Validation overall valid only when IQ∩OQ∩PQ all pass
 *
 * References:
 *   - FDA Guidance for Industry: Process Validation (Jan 2011)
 *   - GHTF SG3/N99-10:2004 Quality Management Systems - Process Validation
 *   - ICH Q8/Q9/Q10 Pharmaceutical development
 *
 * @module engines/ProcessValidationIQOQPQEngine
 * @milestone LATHE-PRO-MS9
 */

export type IQItemStatus = "pass" | "fail" | "not_applicable";

export interface IQItem {
  id: string;
  description: string;
  status: IQItemStatus;
  evidence?: string;
}

export interface OQRun {
  run_id: string;
  /** Parameter set name (e.g., "worst_case_high_speed") */
  condition: string;
  /** Did the run complete within spec? */
  pass: boolean;
  measured_ctq?: Record<string, number>;
}

export interface PQRun {
  run_id: string;
  /** Was this run at nominal conditions? */
  nominal: boolean;
  /** Critical-to-Quality metric values (e.g., { diameter_mm: 10.002, Ra_um: 1.2 }) */
  ctq: Record<string, number>;
  /** Spec limits for each CTQ: { diameter_mm: [9.98, 10.02] } */
  spec?: Record<string, [number, number]>;
}

export interface PVInput {
  process_name: string;
  /** IQ checklist items */
  iq_items: IQItem[];
  /** OQ runs across operating range */
  oq_runs: OQRun[];
  /** PQ runs at nominal */
  pq_runs: PQRun[];
  /** Minimum OQ replicates per condition (default 3) */
  min_oq_replicates?: number;
  /** Minimum consecutive PQ runs (default 3) */
  min_pq_runs?: number;
  /** Target Cpk (default 1.33) */
  target_cpk?: number;
}

export interface PVResult {
  iq: { pass: boolean; completed_pct: number; failed_items: string[]; na_items: string[] };
  oq: {
    pass: boolean;
    conditions_tested: number;
    conditions_passed: number;
    insufficient_replicates: string[];
  };
  pq: {
    pass: boolean;
    consecutive_pass_count: number;
    cpk_estimates: Record<string, number>;
    cpk_failures: string[];
  };
  overall_validated: boolean;
  reasoning: string[];
  next_step: string;
}

class ProcessValidationIQOQPQEngineImpl {
  validate(i: PVInput): PVResult {
    const reasoning: string[] = [];

    // --- IQ evaluation ---
    const iqApplicable = i.iq_items.filter((x) => x.status !== "not_applicable");
    const iqPass = iqApplicable.filter((x) => x.status === "pass");
    const iqFail = iqApplicable.filter((x) => x.status === "fail").map((x) => x.id);
    const iqCompletedPct = iqApplicable.length > 0 ? (iqPass.length / iqApplicable.length) * 100 : 0;
    const iqOk = iqFail.length === 0 && iqCompletedPct >= 100;
    reasoning.push(`IQ: ${iqPass.length}/${iqApplicable.length} pass (${round1(iqCompletedPct)}%)`);

    // --- OQ evaluation ---
    const minReps = i.min_oq_replicates ?? 3;
    const byCondition = new Map<string, OQRun[]>();
    for (const r of i.oq_runs) {
      if (!byCondition.has(r.condition)) byCondition.set(r.condition, []);
      byCondition.get(r.condition)!.push(r);
    }
    const conditionsTested = byCondition.size;
    let conditionsPassed = 0;
    const insufficient: string[] = [];
    for (const [cond, runs] of byCondition) {
      if (runs.length < minReps) {
        insufficient.push(cond);
        continue;
      }
      if (runs.every((r) => r.pass)) conditionsPassed++;
    }
    const oqOk = conditionsTested > 0 && conditionsPassed === conditionsTested && insufficient.length === 0;
    reasoning.push(`OQ: ${conditionsPassed}/${conditionsTested} conditions pass, ${insufficient.length} with insufficient reps`);

    // --- PQ evaluation ---
    const minPq = i.min_pq_runs ?? 3;
    const targetCpk = i.target_cpk ?? 1.33;
    const nominalRuns = i.pq_runs.filter((r) => r.nominal);

    // Longest consecutive passing run — need to define "pass". Use spec bounds if provided.
    let consecutivePass = 0;
    let maxConsecutive = 0;
    const passing: boolean[] = nominalRuns.map((r) => {
      if (!r.spec) return true; // no spec = assume pass
      for (const [key, value] of Object.entries(r.ctq)) {
        const s = r.spec[key];
        if (!s) continue;
        if (value < s[0] || value > s[1]) return false;
      }
      return true;
    });
    for (const p of passing) {
      if (p) {
        consecutivePass++;
        if (consecutivePass > maxConsecutive) maxConsecutive = consecutivePass;
      } else {
        consecutivePass = 0;
      }
    }

    // Cpk estimates per CTQ (if spec provided)
    const cpkEstimates: Record<string, number> = {};
    const cpkFailures: string[] = [];
    if (nominalRuns.length >= 2) {
      const ctqKeys = new Set<string>();
      for (const r of nominalRuns) for (const k of Object.keys(r.ctq)) ctqKeys.add(k);
      for (const key of ctqKeys) {
        const values = nominalRuns.map((r) => r.ctq[key]).filter((v): v is number => typeof v === "number");
        if (values.length < 2) continue;
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
        const sigma = Math.sqrt(variance);
        const spec = nominalRuns[0]?.spec?.[key];
        if (!spec || sigma === 0) continue;
        // Cpk = min((USL - μ) / 3σ, (μ - LSL) / 3σ)
        const cpk = Math.min((spec[1] - mean) / (3 * sigma), (mean - spec[0]) / (3 * sigma));
        cpkEstimates[key] = round2(cpk);
        if (cpk < targetCpk) cpkFailures.push(key);
      }
    }

    const pqOk =
      maxConsecutive >= minPq &&
      cpkFailures.length === 0 &&
      nominalRuns.length >= minPq;
    reasoning.push(
      `PQ: max ${maxConsecutive} consecutive passes (need ${minPq}); ${cpkFailures.length} CTQ below Cpk ${targetCpk}`
    );

    const overallValidated = iqOk && oqOk && pqOk;

    let nextStep: string;
    if (!iqOk) nextStep = "Remediate IQ failures before proceeding to OQ";
    else if (!oqOk) nextStep = "Complete OQ replicates across all operating conditions";
    else if (!pqOk) nextStep = "Execute additional PQ runs until Cpk target met";
    else nextStep = "Process validated — proceed to Continued Process Verification (CPV)";

    return {
      iq: { pass: iqOk, completed_pct: round1(iqCompletedPct), failed_items: iqFail, na_items: i.iq_items.filter((x) => x.status === "not_applicable").map((x) => x.id) },
      oq: {
        pass: oqOk,
        conditions_tested: conditionsTested,
        conditions_passed: conditionsPassed,
        insufficient_replicates: insufficient,
      },
      pq: {
        pass: pqOk,
        consecutive_pass_count: maxConsecutive,
        cpk_estimates: cpkEstimates,
        cpk_failures: cpkFailures,
      },
      overall_validated: overallValidated,
      reasoning,
      next_step: nextStep,
    };
  }

  getStats(): { stages: string[]; reference: string } {
    return {
      stages: ["IQ (Installation)", "OQ (Operational)", "PQ (Performance)", "CPV (Continued)"],
      reference: "FDA Process Validation Guidance 2011; GHTF SG3/N99-10",
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

export const processValidationIQOQPQEngine = new ProcessValidationIQOQPQEngineImpl();
export type { ProcessValidationIQOQPQEngineImpl };
