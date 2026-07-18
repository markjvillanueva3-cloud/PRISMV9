/**
 * CrossProcessMediationAnalyzerEngine — XPROC-NEURAL Tier 9 (T9-04)
 *
 * Decomposes the total causal effect of treatment X on outcome Y into
 * direct and indirect (mediated) components, given a candidate mediator M
 * and a DAG from T9-01.
 *
 * Definitions (Pearl 2001 / Robins & Greenland 1992):
 *
 *   Total Effect (TE):
 *     TE = E[Y | do(X = x_treat)] - E[Y | do(X = x_ref)]
 *     The full causal contrast — captures direct AND indirect channels.
 *
 *   Natural Direct Effect (NDE):
 *     NDE = E[Y | do(X = x_treat), do(M = M_x_ref)] - E[Y | do(X = x_ref)]
 *     Effect of changing X while holding M at the value it WOULD HAVE
 *     under x_ref. Captures the X→Y direct channel.
 *
 *   Natural Indirect Effect (NIE):
 *     NIE = TE - NDE = E[Y | do(X = x_ref), do(M = M_x_treat)] - E[Y | do(X = x_ref)]
 *     Effect of changing M from M_x_ref to M_x_treat while holding X at x_ref.
 *     Captures the X→M→Y mediated channel.
 *
 * For linear structural-equation models with one mediator, the standard
 * Baron-Kenny decomposition emerges:
 *
 *      Y = β_0 + β_X·X + β_M·M + ε_Y
 *      M = α_0 + α_X·X + ε_M
 *      ⇒ NDE = β_X · (x_treat - x_ref)
 *        NIE = α_X · β_M · (x_treat - x_ref)
 *        TE  = NDE + NIE  (under no XM-interaction assumption)
 *
 * We use the linear formulation here because PRISM XPROC variables are
 * approximately linear post-encoding and we already have a regression
 * primitive from T9-02/T9-03. Non-linear extensions (mediation under
 * interaction) require Monte Carlo and are deferred.
 *
 * References:
 *   - Pearl (2001). Direct and Indirect Effects. UAI 411-420.
 *   - Robins & Greenland (1992). Identifiability and exchangeability for
 *     direct and indirect effects. Epidemiology 3:143-155.
 *   - Baron & Kenny (1986). The moderator-mediator variable distinction.
 *
 * @module CrossProcessMediationAnalyzerEngine
 */

import { z } from "zod";
import { PRISM_VARS, type PrismVar, type Event, type CausalDAG } from "./CrossProcessCausalGraphLearnerEngine.js";

const MediationInputSchema = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({}).passthrough(),
  treatment: z.enum(PRISM_VARS),
  mediator: z.enum(PRISM_VARS),
  outcome: z.enum(PRISM_VARS),
  x_treat: z.number().finite(),
  x_ref: z.number().finite(),
});
export type MediationInput = z.infer<typeof MediationInputSchema>;

export interface MediationResult {
  total_effect: number;
  direct_effect: number;       // NDE
  indirect_effect: number;      // NIE
  proportion_mediated: number;  // NIE / TE  (clamped to [0, 1] when sign-consistent)
  beta_X_on_M: number;          // α_X
  beta_M_on_Y: number;          // β_M
  beta_X_on_Y_direct: number;   // β_X (after adjusting for M)
  mediator_path_strength: number;  // |α_X · β_M|
  identifiable: boolean;
  warnings: string[];
  rationale: string;
}

const PROCESS_VOCAB = ["mill", "lathe", "wedm"];
const MATERIAL_VOCAB = ["P", "M", "K", "N", "S", "H"];
const OUTCOME_VOCAB = ["pass", "marginal", "fail"];

function encodeVar(value: unknown, varName: PrismVar): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  if (varName === "process") return PROCESS_VOCAB.indexOf(value as string);
  if (varName === "material_iso") return MATERIAL_VOCAB.indexOf((value as string).toUpperCase());
  if (varName === "outcome_class") return OUTCOME_VOCAB.indexOf(value as string);
  return 0;
}

function getCol(events: Event[], v: PrismVar): number[] {
  return events.map((e) => encodeVar((e as Record<string, unknown>)[v], v));
}

function linearRegression(y: number[], xCols: number[][]): { intercept: number; slopes: number[] } {
  const n = y.length;
  const k = xCols.length;
  const XtX: number[][] = Array.from({ length: k + 1 }, () => Array(k + 1).fill(0));
  const Xty: number[] = Array(k + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const row = [1, ...xCols.map((c) => c[i])];
    for (let r = 0; r <= k; r++) {
      Xty[r] += row[r] * y[i];
      for (let c = 0; c <= k; c++) XtX[r][c] += row[r] * row[c];
    }
  }
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i <= k; i++) {
    let max = Math.abs(A[i][i]);
    let pivotRow = i;
    for (let r = i + 1; r <= k; r++) {
      if (Math.abs(A[r][i]) > max) { max = Math.abs(A[r][i]); pivotRow = r; }
    }
    if (max < 1e-12) return { intercept: 0, slopes: Array(k).fill(0) };
    if (pivotRow !== i) [A[i], A[pivotRow]] = [A[pivotRow], A[i]];
    for (let r = i + 1; r <= k; r++) {
      const factor = A[r][i] / A[i][i];
      for (let c = i; c <= k + 1; c++) A[r][c] -= factor * A[i][c];
    }
  }
  const beta = Array(k + 1).fill(0);
  for (let i = k; i >= 0; i--) {
    let s = A[i][k + 1];
    for (let j = i + 1; j <= k; j++) s -= A[i][j] * beta[j];
    beta[i] = s / A[i][i];
  }
  return { intercept: beta[0], slopes: beta.slice(1) };
}

/** Verify the DAG admits the X → M → Y mediator pattern with no shortcut bypass. */
function isValidMediator(dag: CausalDAG, treatment: PrismVar, mediator: PrismVar, outcome: PrismVar): { valid: boolean; reason: string } {
  if (treatment === mediator || treatment === outcome || mediator === outcome) {
    return { valid: false, reason: "treatment, mediator, outcome must be distinct" };
  }
  // Check directed edges X → M and M → Y exist (or path exists). For DAG
  // produced by T9-01 with possibly partial orientation, we accept both
  // directed and undirected edges as evidence of structural connection.
  const hasXtoM = dag.edges.some((e) =>
    (e.from === treatment && e.to === mediator) ||
    (e.orientation === "undirected" && e.from === mediator && e.to === treatment),
  );
  const hasMtoY = dag.edges.some((e) =>
    (e.from === mediator && e.to === outcome) ||
    (e.orientation === "undirected" && e.from === outcome && e.to === mediator),
  );
  if (!hasXtoM) return { valid: false, reason: `No X→M edge in DAG (${treatment} → ${mediator})` };
  if (!hasMtoY) return { valid: false, reason: `No M→Y edge in DAG (${mediator} → ${outcome})` };
  return { valid: true, reason: "DAG admits X→M→Y mediator chain" };
}

export class CrossProcessMediationAnalyzerEngine {
  /**
   * Decompose total effect of X on Y into direct (NDE) and indirect (NIE)
   * components via mediator M, using linear structural-equation approximation.
   */
  static decompose(input: MediationInput): MediationResult {
    const parsed = MediationInputSchema.parse(input);
    const events = parsed.events as Event[];
    const dag = parsed.dag as unknown as CausalDAG;
    const { treatment, mediator, outcome, x_treat, x_ref } = parsed;
    const warnings: string[] = [];

    const validation = isValidMediator(dag, treatment, mediator, outcome);
    if (!validation.valid) {
      return {
        total_effect: 0,
        direct_effect: 0,
        indirect_effect: 0,
        proportion_mediated: 0,
        beta_X_on_M: 0,
        beta_M_on_Y: 0,
        beta_X_on_Y_direct: 0,
        mediator_path_strength: 0,
        identifiable: false,
        warnings: [validation.reason],
        rationale: `Mediation not identifiable: ${validation.reason}`,
      };
    }

    const xCol = getCol(events, treatment);
    const mCol = getCol(events, mediator);
    const yCol = getCol(events, outcome);

    // Step 1: regress M on X → α_X = beta_X_on_M (path X → M)
    const mOnX = linearRegression(mCol, [xCol]);
    const alphaX = mOnX.slopes[0];

    // Step 2: regress Y on X and M jointly:
    //         β_X = direct effect (X → Y), β_M = mediator effect (M → Y)
    const yOnXM = linearRegression(yCol, [xCol, mCol]);
    const betaXdirect = yOnXM.slopes[0];
    const betaM = yOnXM.slopes[1];

    const dx = x_treat - x_ref;
    const NDE = betaXdirect * dx;
    const NIE = alphaX * betaM * dx;
    const TE = NDE + NIE;
    const pathStrength = Math.abs(alphaX * betaM);

    let proportionMediated = 0;
    if (Math.abs(TE) > 1e-12) {
      const raw = NIE / TE;
      // Sign-consistent clamp: when NDE and NIE have same sign, raw ∈ [0, 1]
      // When they oppose (suppressor effect), raw can be negative or > 1.
      proportionMediated = Math.max(-1, Math.min(2, raw));
      if (Math.sign(NDE) !== Math.sign(NIE) && Math.sign(NDE) !== 0 && Math.sign(NIE) !== 0) {
        warnings.push("Direct and indirect effects have opposite signs (inconsistent mediation / suppressor effect).");
      }
    } else {
      warnings.push("Total effect ≈ 0; proportion_mediated undefined, returned 0.");
    }

    return {
      total_effect: TE,
      direct_effect: NDE,
      indirect_effect: NIE,
      proportion_mediated: proportionMediated,
      beta_X_on_M: alphaX,
      beta_M_on_Y: betaM,
      beta_X_on_Y_direct: betaXdirect,
      mediator_path_strength: pathStrength,
      identifiable: true,
      warnings,
      rationale: `${treatment}→${outcome} decomposed via ${mediator}: TE=${TE.toFixed(4)} (NDE=${NDE.toFixed(4)}, NIE=${NIE.toFixed(4)}). ${(proportionMediated * 100).toFixed(1)}% mediated. ${validation.reason}.`,
    };
  }

  /**
   * Quick mediator path strength scan: given a treatment-outcome pair, returns
   * |α_X · β_M| for every candidate mediator in the DAG. Useful for ranking
   * which mediator carries the largest indirect effect.
   */
  static rankMediators(input: Omit<MediationInput, "mediator" | "x_treat" | "x_ref">): Array<{ mediator: PrismVar; strength: number; valid: boolean }> {
    const events = input.events as Event[];
    const dag = input.dag as unknown as CausalDAG;
    const ranked: Array<{ mediator: PrismVar; strength: number; valid: boolean }> = [];
    for (const m of PRISM_VARS) {
      if (m === input.treatment || m === input.outcome) continue;
      const validation = isValidMediator(dag, input.treatment, m, input.outcome);
      if (!validation.valid) {
        ranked.push({ mediator: m, strength: 0, valid: false });
        continue;
      }
      const xCol = getCol(events, input.treatment);
      const mCol = getCol(events, m);
      const yCol = getCol(events, input.outcome);
      const mOnX = linearRegression(mCol, [xCol]);
      const yOnXM = linearRegression(yCol, [xCol, mCol]);
      ranked.push({
        mediator: m,
        strength: Math.abs(mOnX.slopes[0] * yOnXM.slopes[1]),
        valid: true,
      });
    }
    return ranked.sort((a, b) => b.strength - a.strength);
  }

  static readonly engineId = "CrossProcessMediationAnalyzerEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T9-04";
}

export const crossProcessMediationAnalyzerEngine = CrossProcessMediationAnalyzerEngine;

export function crossProcessMediationAnalyzer(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_mediation_decompose":
      return CrossProcessMediationAnalyzerEngine.decompose(params as MediationInput);
    case "xproc_mediation_path_strength":
      return CrossProcessMediationAnalyzerEngine.rankMediators(params as Omit<MediationInput, "mediator" | "x_treat" | "x_ref">);
    default:
      throw new Error(`crossProcessMediationAnalyzer: unknown action '${action}'`);
  }
}
