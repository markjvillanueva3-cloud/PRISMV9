/**
 * GnnDeployStatusEngine -- MCP-surface reader for the GraphSAGE GNN (tier-5
 * wiring-inference) deploy-gate verdict.
 *
 * U-GNN-DEPLOY-STATUS-MCP (slot:india 2026-06-22). The GNN selective-deploy
 * evaluation (`scripts/lib/nn-graph-eval.mjs` runAssessment) writes its graded
 * verdict to `state/shared/nn-graph/NN-EVAL.json`, and the hook-side reader
 * `.claude/hooks/nn-graph-health-inject.mjs::classifyGnn` surfaces it for the
 * per-prompt PSN-leg injection. That verdict was queryable ONLY by reading the
 * JSON or running a script -- never through the MCP surface. This engine closes
 * that R15 gap: it READS the already-graded report and surfaces the stored
 * verdict so a dispatcher consumer (`prism_dev:gnn_deploy_status`) can ask
 * "is tier-5 deploy-ready? at what AUROC / Brier / coverage?" programmatically.
 *
 * IMPORTANT (india doctrine): this is a pure READER. It surfaces the STORED
 * grade / gates / metrics that runAssessment already computed -- it NEVER
 * re-grades and NEVER inlines a gate threshold (the gates come from the report's
 * own `gates` field; the soul's rule is "cite the canonical reader, never
 * re-inline a threshold"). Sibling hook-reader: `classifyGnn` (same source, hook
 * injection surface). Read priority mirrors classifyGnn: graded `metrics.auroc`
 * is the deploy gate; a DEFERRED report's `checkpointMeta.auroc` is the weaker
 * link-pred PRETEXT diagnostic, surfaced clearly labeled and never conflated.
 *
 * Dedup (verified 2026-06-22 via grep + ENGINE_DIGEST): no existing engine
 * exposes NN-EVAL.json. `ToolLifeGnnEngine` is a DIFFERENT tool-life-prediction
 * GNN; `QuoteOutcomeFeedEngine` is quoting. This is the only wiring-inference
 * deploy-verdict reader on the engine layer.
 */

import * as fs from "fs";
import * as path from "path";
import { resolveRepoRoot } from "../utils/resolve-repo-root.js";

/** Canonical location of the GNN deploy-gate eval report (repo-root-relative). */
export const DEFAULT_NN_EVAL_PATH = "state/shared/nn-graph/NN-EVAL.json";

export interface GnnGateThresholds {
  auroc: number | null;
  macroF1: number | null;
  brier: number | null;
}

export interface GnnMetrics {
  auroc: number | null;
  macroF1: number | null;
  brier: number | null;
  accuracy: number | null;
}

export interface GnnFullCoverageGrade {
  pass: boolean;
  verdict: string;
  failures: string[];
}

export interface GnnSelectiveOperatingPoint {
  tau: number | null;
  coverage: number | null;
  emitted: number | null;
  brier: number | null;
  macroF1: number | null;
  accuracy: number | null;
  classesEmitted: number | null;
  totalClasses: number | null;
}

export interface GnnSelectiveDeploy {
  ready: boolean;
  verdict: string;
  productionGate: number | null;
  robustAboveGate: boolean;
  /**
   * Coverage concentrated in few classes. Surfaced HERE (at the deployGrade level) to match the
   * stored `selective.deployGrade.concentrated` schema. NOTE: the sibling hook reader classifyGnn
   * reshapes this field INTO its returned `selectiveOperatingPoint` object as a convenience -- a
   * consumer querying THIS MCP surface must read it here (top-level), not under `operatingPoint`.
   */
  concentrated: boolean;
  globalAuroc: number | null;
  operatingPoint: GnnSelectiveOperatingPoint | null;
}

export interface GnnDegeneracy {
  isDegenerate: boolean;
  mode: string;
  detail: string;
}

/** The classified status (the read layer adds `found` / `error` / `evalPath`). */
export interface GnnDeployStatusCore {
  /** stored: the holdout could not be built (e.g. empty reference pool). */
  deferred: boolean;
  /** structural: a real holdout was scored (NOT deferred AND a finite metrics.auroc). */
  graded: boolean;
  reason: string;
  assessedAt: string | null;
  /** nowMs - assessedAt, in ms (null when either is missing/unparseable). */
  stalenessMs: number | null;
  holdoutN: number | null;
  /** stored graded deploy-gate metrics (null on a deferred report). */
  metrics: GnnMetrics | null;
  /** DEFERRED-only link-pred PRETEXT auroc -- the weak sub-gate signal, never the deploy gate. */
  pretextAuroc: number | null;
  /** stored gate thresholds (NOT inlined -- read from the report). */
  gates: GnnGateThresholds | null;
  /** stored full-coverage grade verdict. */
  fullCoverage: GnnFullCoverageGrade | null;
  /** stored selective-deploy verdict (abstain-below-gate tier-5; null on legacy reports). */
  selectiveDeploy: GnnSelectiveDeploy | null;
  degeneracy: GnnDegeneracy | null;
}

export interface GnnDeployStatus extends GnnDeployStatusCore {
  /** the NN-EVAL.json file was read AND parsed. */
  found: boolean;
  /** read/parse failure detail when found === false; null otherwise. */
  error: string | null;
  /** the absolute path that was read (for operator transparency). */
  evalPath: string;
}

export interface ReadStatusOpts {
  /** override the eval report path (resolved against cwd); default DEFAULT_NN_EVAL_PATH under repoRoot. */
  evalPath?: string;
  /** repo root the default path resolves against (default process.cwd()). */
  repoRoot?: string;
  /** reference epoch ms for staleness (default: staleness not computed -> null). */
  nowMs?: number;
}

/** Coerce to a finite number or null (a missing field never masquerades as 0). */
function num(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function str(x: unknown): string {
  return typeof x === "string" ? x : "";
}
function bool(x: unknown): boolean {
  return x === true;
}
function obj(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

export class GnnDeployStatusEngine {
  /**
   * Classify a parsed NN-EVAL report into the surfaced deploy status. PURE --
   * surfaces stored fields only; never re-grades, never inlines a threshold.
   * Defensive against any shape (legacy / partial / non-object) -- never throws.
   *
   * @param report parsed NN-EVAL.json contents (any shape).
   * @param opts.nowMs reference epoch ms for staleness (omitted -> stalenessMs null).
   * @returns the surfaced status core.
   */
  classify(report: unknown, opts: { nowMs?: number } = {}): GnnDeployStatusCore {
    const r = obj(report) ?? {};
    const deferred = bool(r.deferred);

    const metricsObj = obj(r.metrics);
    const metrics: GnnMetrics | null = metricsObj
      ? {
          auroc: num(metricsObj.auroc),
          macroF1: num(metricsObj.macroF1),
          brier: num(metricsObj.brier),
          accuracy: num(metricsObj.accuracy),
        }
      : null;
    // graded: a real holdout was scored. Structural check (NOT a threshold compare):
    // not deferred AND a finite deploy-gate auroc exists.
    const graded = !deferred && metrics !== null && metrics.auroc !== null;

    // A DEFERRED report carries only the link-pred PRETEXT auroc (checkpointMeta) --
    // surfaced clearly labeled; NEVER conflated with the deploy-gate metric (R7).
    const meta = obj(r.checkpointMeta);
    const pretextAuroc = meta ? num(meta.auroc) : null;

    const gatesObj = obj(r.gates);
    const gates: GnnGateThresholds | null = gatesObj
      ? { auroc: num(gatesObj.auroc), macroF1: num(gatesObj.macroF1), brier: num(gatesObj.brier) }
      : null;

    const gradeObj = obj(r.grade);
    const fullCoverage: GnnFullCoverageGrade | null = gradeObj
      ? {
          pass: bool(gradeObj.pass),
          verdict: str(gradeObj.verdict),
          failures: Array.isArray(gradeObj.failures)
            ? gradeObj.failures.filter((f): f is string => typeof f === "string")
            : [],
        }
      : null;

    const sel = obj(r.selective);
    const dg = sel ? obj(sel.deployGrade) : null;
    let selectiveDeploy: GnnSelectiveDeploy | null = null;
    if (dg) {
      const opObj = obj(dg.operatingPoint);
      selectiveDeploy = {
        ready: bool(dg.pass),
        verdict: str(dg.verdict),
        productionGate: num(dg.productionGate),
        robustAboveGate: bool(dg.robustAboveGate),
        concentrated: bool(dg.concentrated),
        globalAuroc: num(dg.globalAuroc),
        operatingPoint: opObj
          ? {
              tau: num(opObj.tau),
              coverage: num(opObj.coverage),
              emitted: num(opObj.emitted),
              brier: num(opObj.brier),
              macroF1: num(opObj.macroF1),
              accuracy: num(opObj.accuracy),
              classesEmitted: num(opObj.classesEmitted),
              totalClasses: num(opObj.totalClasses),
            }
          : null,
      };
    }

    const degObj = obj(r.degeneracy);
    const degeneracy: GnnDegeneracy | null = degObj
      ? { isDegenerate: bool(degObj.isDegenerate), mode: str(degObj.mode), detail: str(degObj.detail) }
      : null;

    const assessedAt = typeof r.assessedAt === "string" ? r.assessedAt : null;
    let stalenessMs: number | null = null;
    if (assessedAt !== null && typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs)) {
      const t = Date.parse(assessedAt);
      if (Number.isFinite(t)) stalenessMs = Math.max(0, opts.nowMs - t);
    }

    return {
      deferred,
      graded,
      reason: str(r.reason),
      assessedAt,
      stalenessMs,
      holdoutN: num(r.holdoutN),
      metrics,
      pretextAuroc,
      gates,
      fullCoverage,
      selectiveDeploy,
      degeneracy,
    };
  }

  /**
   * Read NN-EVAL.json from disk and classify it. FAIL-SOFT: a missing or
   * malformed report yields `{ found:false, error }` with an otherwise-empty
   * status -- it NEVER throws (the MCP surface treats a read failure as data,
   * not a dispatch error). Default-path anchor is `resolveRepoRoot()` (the
   * depth-independent repo-root finder), NOT `process.cwd()`: the production
   * runtime is the esbuild bundle started from `mcp-server/` (cwd = mcp-server),
   * so a cwd anchor resolved `mcp-server/state/shared/nn-graph/NN-EVAL.json`
   * which does not exist -- the report lives at the TRUE repo root. See
   * U-DISPATCHER-REPO-ROOT-FIX (2026-06-25, slot:india) for the bug-class.
   *
   * @param opts.evalPath override path; opts.repoRoot default-path anchor; opts.nowMs staleness ref.
   * @returns the full status with found/error/evalPath.
   */
  readStatus(opts: ReadStatusOpts = {}): GnnDeployStatus {
    const root = opts.repoRoot ?? resolveRepoRoot();
    const evalPath = opts.evalPath
      ? path.resolve(opts.evalPath)
      : path.resolve(root, DEFAULT_NN_EVAL_PATH);
    const empty = this.classify({}, {});

    let raw: string;
    try {
      raw = fs.readFileSync(evalPath, "utf8");
    } catch (e) {
      return { ...empty, found: false, error: `read_failed: ${(e as Error)?.message ?? String(e)}`, evalPath };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { ...empty, found: false, error: `parse_failed: ${(e as Error)?.message ?? String(e)}`, evalPath };
    }
    const core = this.classify(parsed, { nowMs: opts.nowMs });
    return { ...core, found: true, error: null, evalPath };
  }
}

export const gnnDeployStatusEngine = new GnnDeployStatusEngine();
