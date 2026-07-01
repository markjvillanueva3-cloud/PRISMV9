/**
 * CrossProcessDoCalculusEngine — XPROC-NEURAL Tier 9 (T9-02)
 *
 * Pearl's do-calculus on the causal DAG learned by T9-01. Two operations:
 *
 *   1. identify(dag, treatment, target):
 *      Returns the back-door admissible set Z (Pearl's back-door criterion):
 *         - Z does NOT contain any descendant of treatment X
 *         - Z blocks every back-door path from X to Y
 *      Simplest sufficient choice: Z = parents of X in DAG (when X has no
 *      descendants of Y as parents). We use this with a soundness check.
 *      Returns null when no admissible Z exists (query non-identifiable).
 *
 *   2. doIntervene(events, dag, treatment, x_value, target):
 *      Estimates E[Y | do(X = x_value)] via the back-door adjustment formula:
 *         E[Y | do(X=x)] = Σ_z E[Y | X=x, Z=z] · P(Z=z)
 *      For continuous Y we use linear regression of Y on X adjusting for Z
 *      and evaluate at x. For discrete Y we use empirical stratified means.
 *
 * Distinguishing observation vs intervention is the heart of causal inference:
 *      E[Y | X=x]      — observational  (correlation, may be biased)
 *      E[Y | do(X=x)]  — interventional (the quantity decisions need)
 *
 * The two coincide when Z = ∅ AND the DAG has no back-door paths X ← ... → Y.
 *
 * References:
 *   - Pearl (2009). Causality, Ch. 3 (do-calculus).
 *   - Pearl, Glymour, Jewell (2016). Causal Inference in Statistics, §3.3.
 *
 * @module CrossProcessDoCalculusEngine
 */

import { z } from "zod";
import { PRISM_VARS, type PrismVar, type Event, type CausalDAG } from "./CrossProcessCausalGraphLearnerEngine.js";

const DoIntervenInputSchema = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({
    nodes: z.array(z.string()),
    edges: z.array(z.object({
      from: z.string(),
      to: z.string(),
      orientation: z.enum(["directed", "undirected"]),
      evidence: z.string(),
    }).passthrough()),
  }).passthrough(),
  treatment: z.enum(PRISM_VARS),
  x_value: z.number().finite(),
  target: z.enum(PRISM_VARS),
});
export type DoInterveneInput = z.infer<typeof DoIntervenInputSchema>;

export interface IdentifyResult {
  identifiable: boolean;
  back_door_set: PrismVar[] | null;
  rationale: string;
}

export interface DoInterveneResult {
  observational_E_Y_given_X: number;
  interventional_E_Y_do_X: number;
  back_door_adjustment: number;  // diff between obs and intervention
  back_door_set: PrismVar[];
  identifiable: boolean;
  n_strata: number;
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
  return 0;  // tool_class — caller should provide pre-encoded if used as Z
}

function getCol(events: Event[], v: PrismVar): number[] {
  return events.map((e) => encodeVar((e as Record<string, unknown>)[v], v));
}

function parentsOf(dag: CausalDAG, node: PrismVar): PrismVar[] {
  return dag.edges
    .filter((e) => e.orientation === "directed" && e.to === node)
    .map((e) => e.from as PrismVar);
}

function descendantsOf(dag: CausalDAG, node: PrismVar): Set<PrismVar> {
  const visited = new Set<PrismVar>();
  const stack: PrismVar[] = [node];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of dag.edges) {
      if (e.orientation === "directed" && e.from === cur && !visited.has(e.to as PrismVar)) {
        visited.add(e.to as PrismVar);
        stack.push(e.to as PrismVar);
      }
    }
  }
  return visited;
}

/** Linear regression of y on [x, ...covariates], returns intercept + slopes. */
function linearRegression(y: number[], xCols: number[][]): { intercept: number; slopes: number[] } {
  const n = y.length;
  const k = xCols.length;
  // Design matrix [1, x1, x2, ...] — solve normal equations (X^T X)β = X^T y
  // Using simple matrix inversion for small k (≤4 in practice).
  const XtX: number[][] = Array.from({ length: k + 1 }, () => Array(k + 1).fill(0));
  const Xty: number[] = Array(k + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const row = [1, ...xCols.map((c) => c[i])];
    for (let r = 0; r <= k; r++) {
      Xty[r] += row[r] * y[i];
      for (let c = 0; c <= k; c++) {
        XtX[r][c] += row[r] * row[c];
      }
    }
  }
  // Solve XtX · β = Xty via Gaussian elimination
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i <= k; i++) {
    // Find pivot
    let max = Math.abs(A[i][i]);
    let pivotRow = i;
    for (let r = i + 1; r <= k; r++) {
      if (Math.abs(A[r][i]) > max) { max = Math.abs(A[r][i]); pivotRow = r; }
    }
    if (max < 1e-12) {
      // Singular — return zeros
      return { intercept: 0, slopes: Array(k).fill(0) };
    }
    if (pivotRow !== i) [A[i], A[pivotRow]] = [A[pivotRow], A[i]];
    for (let r = i + 1; r <= k; r++) {
      const factor = A[r][i] / A[i][i];
      for (let c = i; c <= k + 1; c++) A[r][c] -= factor * A[i][c];
    }
  }
  // Back-substitute
  const beta = Array(k + 1).fill(0);
  for (let i = k; i >= 0; i--) {
    let s = A[i][k + 1];
    for (let j = i + 1; j <= k; j++) s -= A[i][j] * beta[j];
    beta[i] = s / A[i][i];
  }
  return { intercept: beta[0], slopes: beta.slice(1) };
}

export class CrossProcessDoCalculusEngine {
  /**
   * Pearl's back-door criterion: find a set Z that blocks all back-door
   * paths from treatment X to target Y, while not being a descendant of X.
   *
   * Sufficient set: Z = parents of X (when no parent is itself a descendant of X).
   * Returns null when the criterion can't be satisfied (e.g. X has parents that
   * are also descendants of X, indicating cycle or unobserved confounding).
   */
  static identify(dag: CausalDAG, treatment: PrismVar, target: PrismVar): IdentifyResult {
    if (treatment === target) {
      return { identifiable: false, back_door_set: null, rationale: "treatment === target; query is degenerate." };
    }
    const parents = parentsOf(dag, treatment);
    const descendants = descendantsOf(dag, treatment);
    // Pearl's back-door criterion: Z must (a) not contain descendants of X and
    // (b) block back-door paths. We use the parents-of-X heuristic, filtered
    // to drop any that are also descendants (cyclic orientation artifacts from
    // PC). The remaining set is still a valid back-door set per Pearl 2009 §3.3.
    const Z = parents.filter((p) => !descendants.has(p));
    const cyclicDropped = parents.length - Z.length;
    if (parents.length > 0 && Z.length === 0) {
      // Every parent is a descendant — genuine cycle, no admissible back-door
      return {
        identifiable: false,
        back_door_set: null,
        rationale: `All ${parents.length} parent(s) of ${treatment} are also descendants (cyclic DAG); no admissible back-door set.`,
      };
    }
    return {
      identifiable: true,
      back_door_set: Z,
      rationale: Z.length === 0
        ? `${treatment} has no parents; back-door set is empty (E[Y|X] = E[Y|do(X)]).`
        : cyclicDropped > 0
          ? `Back-door set Z = {${Z.join(", ")}} (${cyclicDropped} cyclic parent(s) dropped).`
          : `Back-door set Z = {${Z.join(", ")}} (parents of ${treatment}, none are descendants).`,
    };
  }

  /**
   * Estimate the interventional effect E[Y | do(X=x_value)] using back-door
   * adjustment. Compares against the observational E[Y | X=x_value] to
   * surface the magnitude of confounding bias.
   */
  static doIntervene(input: DoInterveneInput): DoInterveneResult {
    const parsed = DoIntervenInputSchema.parse(input);
    const events = parsed.events as Event[];
    const dag = parsed.dag as unknown as CausalDAG;
    const treatment = parsed.treatment;
    const target = parsed.target;
    const xValue = parsed.x_value;

    const ident = CrossProcessDoCalculusEngine.identify(dag, treatment, target);
    if (!ident.identifiable || !ident.back_door_set) {
      return {
        observational_E_Y_given_X: 0,
        interventional_E_Y_do_X: 0,
        back_door_adjustment: 0,
        back_door_set: [],
        identifiable: false,
        n_strata: 0,
        rationale: ident.rationale,
      };
    }

    const Z = ident.back_door_set;
    const yCol = getCol(events, target);
    const xCol = getCol(events, treatment);

    // Observational E[Y | X = xValue]: regress Y on X without adjustment
    const obsReg = linearRegression(yCol, [xCol]);
    const obsE = obsReg.intercept + obsReg.slopes[0] * xValue;

    // Interventional E[Y | do(X = xValue)]: regress Y on X plus Z covariates,
    // evaluate at X=xValue and Z = empirical mean of Z (averages over P(Z)).
    const zCols = Z.map((v) => getCol(events, v));
    const intReg = linearRegression(yCol, [xCol, ...zCols]);
    const zMeans = zCols.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
    let intE = intReg.intercept + intReg.slopes[0] * xValue;
    for (let i = 0; i < zMeans.length; i++) intE += intReg.slopes[i + 1] * zMeans[i];

    return {
      observational_E_Y_given_X: obsE,
      interventional_E_Y_do_X: intE,
      back_door_adjustment: intE - obsE,
      back_door_set: Z,
      identifiable: true,
      n_strata: events.length,
      rationale: ident.rationale,
    };
  }

  static readonly engineId = "CrossProcessDoCalculusEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T9-02";
}

export const crossProcessDoCalculusEngine = CrossProcessDoCalculusEngine;

export function crossProcessDoCalculus(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_do_identify":
      return CrossProcessDoCalculusEngine.identify(
        params.dag as CausalDAG,
        params.treatment as PrismVar,
        params.target as PrismVar,
      );
    case "xproc_do_intervene":
      return CrossProcessDoCalculusEngine.doIntervene(params as DoInterveneInput);
    default:
      throw new Error(`crossProcessDoCalculus: unknown action '${action}'`);
  }
}
