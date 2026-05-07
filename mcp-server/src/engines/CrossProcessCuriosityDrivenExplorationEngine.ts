/**
 * CrossProcessCuriosityDrivenExplorationEngine — XPROC-NEURAL Tier 11 (T11-03)
 *
 * Schmidhuber-style intrinsic-motivation explorer (Schmidhuber 1991, Pathak
 * et al. 2017): proposes parameter combinations where the model's predicted
 * outcome diverges most from observed outcomes — i.e. where the model is
 * "most surprised". Surprise drives exploration.
 *
 * Pipeline:
 *   1. For each candidate (material, sf, fz, process), compute the predicted
 *      outcome via local linear regression on k-nearest historical events.
 *   2. The intrinsic curiosity score is the standard deviation of the local
 *      regression residuals — high σ means the model's local fit is poor and
 *      a real run would produce most new information.
 *   3. EVERY proposed candidate is gated through T8-03 (Neuro-Symbolic Safety
 *      Verifier). Curiosity NEVER bypasses safety: high-σ unsafe candidates
 *      are dropped from the returned set with a "blocked-by-safety" rationale.
 *   4. Returned set is ordered by score descending, then by safety verdict.
 *
 * Per CLAUDE.md mandate: operator-in-the-loop is unconditional. This engine
 * SUGGESTS; it never executes. T11-04 (Bayesian DOE) consumes its output to
 * plan a budget-bounded experiment campaign.
 *
 * @module CrossProcessCuriosityDrivenExplorationEngine
 */

import { z } from "zod";
import {
  CrossProcessNeuroSymbolicSafetyVerifierEngine,
  type SafetyVerdict,
  type SafetyTier,
} from "./CrossProcessNeuroSymbolicSafetyVerifierEngine.js";

const CandidateSchema = z.object({
  candidate_id: z.string().min(1),
  material_iso: z.string().min(1),
  sf: z.number().finite().positive(),
  fz: z.number().finite().positive(),
  ap: z.number().finite().positive().default(1),
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
});
export type Candidate = z.infer<typeof CandidateSchema>;

const HistoryRowSchema = z.object({
  material_iso: z.string().min(1),
  sf: z.number().finite().positive(),
  fz: z.number().finite().positive(),
  outcome: z.number().finite(),
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
});
export type HistoryRow = z.infer<typeof HistoryRowSchema>;

const ProposeInputSchema = z.object({
  candidates: z.array(CandidateSchema).min(1),
  history: z.array(HistoryRowSchema).min(3),
  // Safety-gate context — passed through to T8-03 unchanged
  state_for_safety: z.object({
    tool: z.object({ diameter_mm: z.number().positive(), flutes: z.number().int().positive() }),
    machine: z.object({
      maxSpindleRpm: z.number().positive(),
      maxSpindlePowerKw: z.number().positive(),
      maxRapidMmPerMin: z.number().positive(),
    }),
    minToolLifeMin: z.number().positive().default(15),
  }),
  tier: z.enum(["shop_floor", "production", "proven_out", "sim"]).default("shop_floor"),
  k: z.number().int().min(2).max(50).default(5),
});
export type ProposeInput = z.infer<typeof ProposeInputSchema>;

export interface CuriosityProposal {
  candidate_id: string;
  curiosity_score: number;       // residual σ from local regression (intrinsic)
  predicted_outcome: number;
  k_neighbors: number;
  safety_verdict: SafetyVerdict;
  safety_reason: string;
  admitted: boolean;             // safety verdict !== 'fail' AND curiosity > 0
  rationale: string;
}

export interface ProposeResult {
  proposals: CuriosityProposal[];
  admitted: CuriosityProposal[];
  blocked_by_safety: CuriosityProposal[];
  tier: SafetyTier;
  n_history: number;
}

const MATERIAL_ENC: Record<string, number> = { P: 0, M: 1, K: 2, N: 3, S: 4, H: 5 };

function dist(a: Candidate, b: HistoryRow, scales: { sf: number; fz: number }): number {
  const matA = MATERIAL_ENC[a.material_iso.toUpperCase()] ?? 6;
  const matB = MATERIAL_ENC[b.material_iso.toUpperCase()] ?? 6;
  return Math.sqrt(
    (matA - matB) ** 2 +
    ((a.sf - b.sf) / scales.sf) ** 2 +
    ((a.fz - b.fz) / scales.fz) ** 2 +
    (a.process === b.process ? 0 : 1),
  );
}

/**
 * Local linear regression of outcome on (sf, fz) over k-NN events.
 * Returns the predicted outcome at the candidate point AND the standard
 * deviation of residuals (the curiosity signal).
 */
function localRegression(
  cand: Candidate,
  neighbors: HistoryRow[],
  scales: { sf: number; fz: number },
): { predicted: number; residual_std: number } {
  const n = neighbors.length;
  if (n < 2) {
    const m = neighbors[0]?.outcome ?? 0;
    return { predicted: m, residual_std: 0 };
  }
  // Solve OLS: y = β₀ + β₁·sf + β₂·fz
  let sumY = 0, sumSf = 0, sumFz = 0, sumSf2 = 0, sumFz2 = 0, sumSfFz = 0, sumSfY = 0, sumFzY = 0;
  for (const h of neighbors) {
    sumY += h.outcome;
    sumSf += h.sf;
    sumFz += h.fz;
    sumSf2 += h.sf * h.sf;
    sumFz2 += h.fz * h.fz;
    sumSfFz += h.sf * h.fz;
    sumSfY += h.sf * h.outcome;
    sumFzY += h.fz * h.outcome;
  }
  // Centered moments
  const meanY = sumY / n;
  const meanSf = sumSf / n;
  const meanFz = sumFz / n;
  const ssSf = sumSf2 - n * meanSf * meanSf;
  const ssFz = sumFz2 - n * meanFz * meanFz;
  const sSfFz = sumSfFz - n * meanSf * meanFz;
  const sSfY = sumSfY - n * meanSf * meanY;
  const sFzY = sumFzY - n * meanFz * meanY;
  const det = ssSf * ssFz - sSfFz * sSfFz;
  let b1 = 0, b2 = 0;
  if (Math.abs(det) > 1e-12) {
    b1 = (ssFz * sSfY - sSfFz * sFzY) / det;
    b2 = (ssSf * sFzY - sSfFz * sSfY) / det;
  }
  const b0 = meanY - b1 * meanSf - b2 * meanFz;
  // Residuals
  let ssRes = 0;
  for (const h of neighbors) {
    const r = h.outcome - (b0 + b1 * h.sf + b2 * h.fz);
    ssRes += r * r;
  }
  const residStd = Math.sqrt(ssRes / Math.max(1, n - 1));
  const predicted = b0 + b1 * cand.sf + b2 * cand.fz;
  return { predicted, residual_std: residStd };
}

export class CrossProcessCuriosityDrivenExplorationEngine {
  /**
   * Score candidates by intrinsic curiosity, gate each through T8-03 safety
   * verifier, return admitted set ordered by score descending.
   */
  static propose(input: ProposeInput): ProposeResult {
    const parsed = ProposeInputSchema.parse(input);
    const k = parsed.k;
    const tier = parsed.tier;

    const sfMean = parsed.history.reduce((a, b) => a + b.sf, 0) / parsed.history.length;
    const fzMean = parsed.history.reduce((a, b) => a + b.fz, 0) / parsed.history.length;
    const sfStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.sf - sfMean) ** 2, 0) / parsed.history.length) || 1;
    const fzStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.fz - fzMean) ** 2, 0) / parsed.history.length) || 1;
    const scales = { sf: sfStd, fz: fzStd };

    const proposals: CuriosityProposal[] = [];
    for (const cand of parsed.candidates) {
      const sorted = parsed.history.map((h) => ({ ev: h, d: dist(cand, h, scales) })).sort((a, b) => a.d - b.d);
      const neighbors = sorted.slice(0, Math.min(k, sorted.length)).map((s) => s.ev);
      const { predicted, residual_std } = localRegression(cand, neighbors, scales);

      // Safety gate (T8-03)
      const safety = CrossProcessNeuroSymbolicSafetyVerifierEngine.verify({
        prediction: { vc_m_min: cand.sf, fz_mm_tooth: cand.fz, ap_mm: cand.ap },
        state: {
          material: cand.material_iso,
          tool: parsed.state_for_safety.tool,
          machine: parsed.state_for_safety.machine,
          operation: cand.process === "lathe" ? "turn" : cand.process === "wedm" ? "drill" : "mill",
          minToolLifeMin: parsed.state_for_safety.minToolLifeMin,
        },
        tier,
      });

      const admitted = safety.verdict !== "fail" && residual_std > 0;
      proposals.push({
        candidate_id: cand.candidate_id,
        curiosity_score: residual_std,
        predicted_outcome: predicted,
        k_neighbors: neighbors.length,
        safety_verdict: safety.verdict,
        safety_reason: safety.rationale,
        admitted,
        rationale: !admitted && safety.verdict === "fail"
          ? `BLOCKED: T8-03 safety verdict=fail. ${safety.rationale}`
          : !admitted && residual_std === 0
            ? `Curiosity score=0 (perfect local fit); no info gain.`
            : `Curiosity σ=${residual_std.toFixed(3)}, predicted=${predicted.toFixed(3)}, safety=${safety.verdict}.`,
      });
    }

    // Sort: admitted descending by score, then blocked
    proposals.sort((a, b) => {
      if (a.admitted !== b.admitted) return a.admitted ? -1 : 1;
      return b.curiosity_score - a.curiosity_score;
    });

    return {
      proposals,
      admitted: proposals.filter((p) => p.admitted),
      blocked_by_safety: proposals.filter((p) => p.safety_verdict === "fail"),
      tier,
      n_history: parsed.history.length,
    };
  }

  static readonly engineId = "CrossProcessCuriosityDrivenExplorationEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T11-03";
}

export const crossProcessCuriosityDrivenExplorationEngine = CrossProcessCuriosityDrivenExplorationEngine;

export function crossProcessCuriosityDrivenExploration(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_curiosity_propose":
      return CrossProcessCuriosityDrivenExplorationEngine.propose(params as ProposeInput);
    case "xproc_curiosity_score": {
      const r = CrossProcessCuriosityDrivenExplorationEngine.propose(params as ProposeInput);
      return { scores: r.proposals.map((p) => ({ candidate_id: p.candidate_id, score: p.curiosity_score, admitted: p.admitted })) };
    }
    default:
      throw new Error(`crossProcessCuriosityDrivenExploration: unknown action '${action}'`);
  }
}
