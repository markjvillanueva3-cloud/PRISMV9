/**
 * CrossProcessCounterfactualPredictorEngine — XPROC-NEURAL Tier 9 (T9-03)
 *
 * Pearl's twin-network counterfactual: given a factual observation
 * (X = x_factual, Y = y_factual) plus optional covariate evidence W,
 * compute the counterfactual Y_x' = "what would Y have been had X been x'?".
 *
 * Three-step Pearl procedure:
 *   1. Abduction — condition on the factual observation to update the
 *      distribution of exogenous noise U. For linear-Gaussian-style models
 *      this reduces to extracting the residual u = y_factual - f(x_factual, W).
 *   2. Action  — perform do(X = x_counterfactual), replacing the structural
 *      equation for X. Other equations are unchanged.
 *   3. Prediction — compute Y from the modified model with the same noise U.
 *      For linear models: y_cf = f(x_cf, W) + u.
 *
 * For PRISM XPROC variables (continuous sf/fz, ordinal-encoded categoricals),
 * we approximate the structural equation Y = β_0 + β_X X + β_W W + U via
 * linear regression of Y on X plus the back-door adjustment set Z (parents
 * of X in the DAG, per T9-02). The counterfactual then has closed form:
 *
 *      y_cf = y_factual + β_X.Z · (x_counterfactual - x_factual)
 *
 * where β_X.Z is the regression coefficient on X adjusting for Z (the causal
 * slope, NOT the marginal slope which would mix in confounder effects).
 *
 * The counterfactual differs from interventional E[Y|do(X=x_cf)] because
 * counterfactuals condition on the same noise realization U as the factual
 * observation. Two different units with the same X = x but different Y
 * have different counterfactual responses to the same intervention.
 *
 * References:
 *   - Pearl (2009). Causality, Ch. 7 (counterfactuals).
 *   - Balke & Pearl (1994). Twin networks for counterfactuals.
 *
 * @module CrossProcessCounterfactualPredictorEngine
 */

import { z } from "zod";
import { PRISM_VARS, type PrismVar, type Event, type CausalDAG } from "./CrossProcessCausalGraphLearnerEngine.js";
import { CrossProcessDoCalculusEngine } from "./CrossProcessDoCalculusEngine.js";

const CounterfactualInputSchema = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({}).passthrough(),
  treatment: z.enum(PRISM_VARS),
  target: z.enum(PRISM_VARS),
  factual: z.object({
    x: z.number().finite().describe("Observed treatment value"),
    y: z.number().finite().describe("Observed target value"),
  }),
  counterfactual_x: z.number().finite().describe("What X would have been"),
});
export type CounterfactualInput = z.infer<typeof CounterfactualInputSchema>;

export interface CounterfactualResult {
  factual: { x: number; y: number };
  counterfactual_x: number;
  counterfactual_y: number;
  causal_slope: number;          // β_X.Z — the structural coefficient
  marginal_slope: number;         // β_X (no adjustment) — for contrast
  noise_residual: number;         // u = y - f(x, Z̄) extracted in abduction
  back_door_set: PrismVar[];
  identifiable: boolean;
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

export class CrossProcessCounterfactualPredictorEngine {
  /**
   * Compute the counterfactual y_cf given factual (x, y) and proposed x_cf.
   * Uses 3-step Pearl procedure (abduction, action, prediction) on a linear
   * structural equation approximation of the DAG.
   */
  static query(input: CounterfactualInput): CounterfactualResult {
    const parsed = CounterfactualInputSchema.parse(input);
    const events = parsed.events as Event[];
    const dag = parsed.dag as unknown as CausalDAG;
    const treatment = parsed.treatment;
    const target = parsed.target;
    const xFact = parsed.factual.x;
    const yFact = parsed.factual.y;
    const xCf = parsed.counterfactual_x;

    const ident = CrossProcessDoCalculusEngine.identify(dag, treatment, target);
    if (!ident.identifiable || !ident.back_door_set) {
      return {
        factual: { x: xFact, y: yFact },
        counterfactual_x: xCf,
        counterfactual_y: yFact,  // can't compute → return factual unchanged
        causal_slope: 0,
        marginal_slope: 0,
        noise_residual: 0,
        back_door_set: [],
        identifiable: false,
        rationale: ident.rationale + " Counterfactual not identifiable; returning factual.",
      };
    }

    const Z = ident.back_door_set;
    const yCol = getCol(events, target);
    const xCol = getCol(events, treatment);
    const zCols = Z.map((v) => getCol(events, v));

    // Marginal slope (observational, may be confounded)
    const margReg = linearRegression(yCol, [xCol]);
    const marginalSlope = margReg.slopes[0];

    // Causal slope: regress Y on X adjusting for Z. The coefficient on X is β_X.Z.
    const causalReg = linearRegression(yCol, [xCol, ...zCols]);
    const causalSlope = causalReg.slopes[0];

    // Step 1 — Abduction. The "noise" for the factual unit:
    //   u = y_fact - f(x_fact, Z̄)
    // where Z̄ is the empirical mean of Z (we don't have per-unit Z evidence in this API).
    const zMeans = zCols.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
    let yPredFact = causalReg.intercept + causalSlope * xFact;
    for (let i = 0; i < zMeans.length; i++) yPredFact += causalReg.slopes[i + 1] * zMeans[i];
    const u = yFact - yPredFact;

    // Step 2 — Action. do(X = x_cf): the structural equation for X is replaced.
    // Other equations carry through; for Y we use the same f with new X.
    // Step 3 — Prediction. y_cf = f(x_cf, Z̄) + u
    let yCfPred = causalReg.intercept + causalSlope * xCf;
    for (let i = 0; i < zMeans.length; i++) yCfPred += causalReg.slopes[i + 1] * zMeans[i];
    const yCf = yCfPred + u;

    return {
      factual: { x: xFact, y: yFact },
      counterfactual_x: xCf,
      counterfactual_y: yCf,
      causal_slope: causalSlope,
      marginal_slope: marginalSlope,
      noise_residual: u,
      back_door_set: Z,
      identifiable: true,
      rationale: `Counterfactual via 3-step Pearl: abduction extracted u=${u.toFixed(3)}, action set X=${xCf}, prediction y_cf = ${yCfPred.toFixed(3)} + u = ${yCf.toFixed(3)}. Causal slope ${causalSlope.toFixed(3)} vs marginal ${marginalSlope.toFixed(3)} (Δ measures confounding).`,
    };
  }

  static readonly engineId = "CrossProcessCounterfactualPredictorEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T9-03";
}

export const crossProcessCounterfactualPredictorEngine = CrossProcessCounterfactualPredictorEngine;

export function crossProcessCounterfactualPredictor(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_counterfactual_query":
      return CrossProcessCounterfactualPredictorEngine.query(params as CounterfactualInput);
    default:
      throw new Error(`crossProcessCounterfactualPredictor: unknown action '${action}'`);
  }
}
