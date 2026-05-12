/**
 * SVIImpactProjectorEngine — Project Ψ delta for a proposed creation
 *
 * Phase 0.14 U-SVI2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a proposed
 * new asset (engine, action, route, schema, dispatcher), estimate whether it
 * will raise or lower the system's Reachability (Ψ). Used by the PreTool hook
 * to gate new-surface creation and emit +Ψ badges on likely wins.
 *
 * Design intent:
 *   - No I/O. Callers pass evidence in the proposal; the engine scores it.
 *   - Heuristic but tunable. Weights live in PROJECTION_WEIGHTS.
 *   - Transparent. Every projection returns an explanation list so hooks
 *     can show the user *why* Ψ is projected up or down.
 *
 * The output is not the actual post-creation Ψ; it is an *expected* delta in
 * percentage points, typically in the range [-5, +5]. A post-tool hook records
 * the realized delta to the ledger so the heuristic can be calibrated.
 *
 * @module engines/SVIImpactProjectorEngine
 * @milestone PP-0.14-U-SVI2
 */

export type ProposedAssetType = "engine" | "action" | "route" | "schema" | "dispatcher" | "skill" | "hook";

export interface ProposedAsset {
  type: ProposedAssetType;
  name: string;
  description?: string;
  keywords?: string[];
  /** Dispatchers/routes/consumers the asset is wired to (if any). */
  wiredConsumers?: string[];
  /** Tests targeting this asset. */
  testCoverage?: number;
  /** True if the proposal targets an already-watched surface in SVI-watch-status. */
  touchesWatchedSurface?: boolean;
  /** True if this is a bug fix / refactor — legitimately Ψ-neutral. */
  isMaintenance?: boolean;
}

export interface ProjectionWeights {
  baseByType: Record<ProposedAssetType, number>;
  wiringBonus: number; // per wired consumer
  wiringBonusCap: number;
  testCoverageBonus: number; // at 100% coverage
  watchedSurfaceBonus: number;
  orphanPenalty: number; // no wired consumers
  maintenancePenalty: number; // bug fixes are neutral by default
}

export const DEFAULT_WEIGHTS: ProjectionWeights = Object.freeze({
  baseByType: {
    engine: 0.4,
    action: 0.3,
    route: 0.3,
    schema: 0.2,
    dispatcher: 0.6,
    skill: 0.2,
    hook: 0.2,
  },
  wiringBonus: 0.5,
  wiringBonusCap: 2.0,
  testCoverageBonus: 1.0,
  watchedSurfaceBonus: 1.5,
  orphanPenalty: 1.0,
  maintenancePenalty: 0.0,
});

export interface ProjectionResult {
  psiDelta: number; // percentage points
  rationale: string[];
  risk: "low" | "medium" | "high";
  badge: string; // short human-readable tag
}

export class SVIImpactProjectorEngine {
  private readonly weights: ProjectionWeights;

  constructor(weights: ProjectionWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  project(proposal: ProposedAsset): ProjectionResult {
    this.assertValid(proposal);

    const rationale: string[] = [];
    let delta = 0;

    if (proposal.isMaintenance) {
      const d = -this.weights.maintenancePenalty;
      delta += d;
      rationale.push(`maintenance: Δ ${fmt(d)}`);
      return this.finalize(delta, rationale);
    }

    const base = this.weights.baseByType[proposal.type];
    delta += base;
    rationale.push(`base (${proposal.type}): +${base.toFixed(2)}`);

    const wired = proposal.wiredConsumers?.length ?? 0;
    if (wired === 0) {
      delta -= this.weights.orphanPenalty;
      rationale.push(`no wired consumers: -${this.weights.orphanPenalty.toFixed(2)}`);
    } else {
      const bonus = Math.min(this.weights.wiringBonusCap, wired * this.weights.wiringBonus);
      delta += bonus;
      rationale.push(`${wired} wired consumer(s): +${bonus.toFixed(2)}`);
    }

    const coverage = this.clampCoverage(proposal.testCoverage);
    if (coverage > 0) {
      const bonus = coverage * this.weights.testCoverageBonus;
      delta += bonus;
      rationale.push(`test coverage ${(coverage * 100).toFixed(0)}%: +${bonus.toFixed(2)}`);
    } else {
      rationale.push("no test coverage");
    }

    if (proposal.touchesWatchedSurface) {
      delta += this.weights.watchedSurfaceBonus;
      rationale.push(`watched surface: +${this.weights.watchedSurfaceBonus.toFixed(2)}`);
    }

    return this.finalize(delta, rationale);
  }

  /** Pure helper: decide risk class from a raw delta. */
  classify(delta: number): ProjectionResult["risk"] {
    if (delta <= -0.5) return "high";
    if (delta <= 0.5) return "medium";
    return "low";
  }

  badgeFor(delta: number): string {
    const sign = delta >= 0 ? "+" : "";
    return `Ψ ${sign}${delta.toFixed(2)}`;
  }

  // --- internals ---------------------------------------------------------

  private finalize(rawDelta: number, rationale: string[]): ProjectionResult {
    const psiDelta = Math.round(rawDelta * 100) / 100;
    return {
      psiDelta,
      rationale,
      risk: this.classify(psiDelta),
      badge: this.badgeFor(psiDelta),
    };
  }

  private assertValid(proposal: ProposedAsset): void {
    if (!proposal.type) throw new Error("ProposedAsset.type is required");
    if (!proposal.name || proposal.name.trim() === "") {
      throw new Error("ProposedAsset.name must be non-empty");
    }
    if (!(proposal.type in this.weights.baseByType)) {
      throw new Error(`Unknown asset type: ${proposal.type}`);
    }
    if (proposal.testCoverage !== undefined) {
      if (!Number.isFinite(proposal.testCoverage) || proposal.testCoverage < 0 || proposal.testCoverage > 1) {
        throw new Error("testCoverage must be in [0, 1]");
      }
    }
  }

  private clampCoverage(coverage?: number): number {
    if (coverage === undefined || coverage === null) return 0;
    return Math.max(0, Math.min(1, coverage));
  }
}

function fmt(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

export const sviImpactProjectorEngine = new SVIImpactProjectorEngine();
