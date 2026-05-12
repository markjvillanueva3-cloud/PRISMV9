/**
 * WEDMTradeoffElicitationEngine — WEDM AGI Phase 2 / U-P2-07
 *
 * Interactive preference elicitation over a WEDM Pareto frontier.
 *
 *   Input:  a frontier of non-dominated solutions (Ra, MRR, reliability)
 *           + user preference statements ("prefer Ra over MRR", strength 0.6)
 *   Output: ranked solutions by a weighted utility score, where weights
 *           are derived from the preference statements, plus the best-pick.
 *
 * Method:
 *   - Normalise each objective across the frontier to [0, 1] (min-max).
 *   - Flip MRR_inv so that larger MRR wins (same-sign-as-Ra: lower=better
 *     utility = 1 − normalised_cost).
 *   - Utility = Σ wᵢ · utilityᵢ.
 *   - Preference statement "prefer A over B with strength s ∈ (0,1]"
 *       shifts mass from w_B to w_A:
 *         w_A += s · min(w_B, 0.5)
 *         w_B  = max(w_B · (1 − s), 0)
 *       then re-normalise to Σw = 1.
 *
 * Exit gate (P2-MS2):
 *   Tradeoff engine correctly adjusts weights based on user preference —
 *   i.e., preferring Ra shifts the top-ranked solution to one with lower Ra.
 */

import type {
  WEDMFrontierSolution,
} from "./WEDMParetoFrontierSearchEngine.js";

// ────────────────────────── Types ──────────────────────────

export type TradeoffObjective = "Ra" | "MRR" | "reliability";

export interface PreferenceWeights {
  Ra: number;
  MRR: number;
  reliability: number;
}

export interface PreferenceStatement {
  prefer: TradeoffObjective;
  over: TradeoffObjective;
  strength: number; // (0, 1]
}

export interface RankedSolution {
  solution: WEDMFrontierSolution;
  utility: number;
  components: {
    Ra_utility: number;
    MRR_utility: number;
    reliability_utility: number;
  };
  rank: number;
}

export interface TradeoffRanking {
  weights: PreferenceWeights;
  ranked: RankedSolution[];
  best: RankedSolution | null;
  notes: string[];
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMTradeoffElicitationEngine {
  /** Default equal-weight preference vector. */
  uniformWeights(): PreferenceWeights {
    return { Ra: 1 / 3, MRR: 1 / 3, reliability: 1 / 3 };
  }

  /**
   * Rank the frontier under a given weight vector.
   * Weights are automatically re-normalised so ∑w = 1.
   */
  rankByWeights(
    frontier: WEDMFrontierSolution[],
    weights: PreferenceWeights,
  ): TradeoffRanking {
    if (!frontier.length) {
      return {
        weights: this.normaliseWeights(weights),
        ranked: [],
        best: null,
        notes: ["empty frontier"],
      };
    }
    const w = this.normaliseWeights(weights);

    const raVals = frontier.map((s) => s.objectives.Ra_um);
    const mrrVals = frontier.map((s) => s.derived.MRR_rel);
    const wbVals = frontier.map((s) => s.objectives.wire_break_prob);

    const [raLo, raHi] = [Math.min(...raVals), Math.max(...raVals)];
    const [mrrLo, mrrHi] = [Math.min(...mrrVals), Math.max(...mrrVals)];
    const [wbLo, wbHi] = [Math.min(...wbVals), Math.max(...wbVals)];

    const ranked: RankedSolution[] = frontier
      .map((sol, i) => {
        // utility = 1 when best-on-this-axis, 0 when worst-on-this-axis.
        const raU = 1 - norm(raVals[i], raLo, raHi); // lower Ra → higher utility
        const mrrU = norm(mrrVals[i], mrrLo, mrrHi); // higher MRR → higher utility
        const wbU = 1 - norm(wbVals[i], wbLo, wbHi); // lower break prob → higher utility
        const utility =
          w.Ra * raU + w.MRR * mrrU + w.reliability * wbU;
        return {
          solution: sol,
          utility,
          components: {
            Ra_utility: raU,
            MRR_utility: mrrU,
            reliability_utility: wbU,
          },
          rank: 0,
        };
      })
      .sort((a, b) => b.utility - a.utility)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    const notes: string[] = [];
    if (ranked.length >= 2 && ranked[1].utility > ranked[0].utility * 0.98) {
      notes.push(
        `Close call: top-2 utilities within 2% (${ranked[0].utility.toFixed(
          4,
        )} vs ${ranked[1].utility.toFixed(4)}).`,
      );
    }

    return { weights: w, ranked, best: ranked[0], notes };
  }

  /**
   * Apply one preference statement to a weight vector, shifting mass
   * from the less-preferred to the more-preferred objective.
   */
  adjustWeights(
    current: PreferenceWeights,
    statement: PreferenceStatement,
  ): PreferenceWeights {
    this.validateStatement(statement);
    if (statement.prefer === statement.over) return this.normaliseWeights(current);

    const next: PreferenceWeights = { ...current };
    const s = clip(statement.strength, 0, 1);
    const fromKey = statement.over;
    const toKey = statement.prefer;

    const from = Math.max(next[fromKey], 0);
    const shift = s * Math.min(from, 0.5);
    next[fromKey] = Math.max(from - shift, 0);
    next[toKey] = Math.max(next[toKey], 0) + shift;

    return this.normaliseWeights(next);
  }

  /**
   * Full elicitation: start from uniform (or given) weights, fold each
   * preference statement in sequence, return the final ranking.
   */
  elicit(
    frontier: WEDMFrontierSolution[],
    preferences: PreferenceStatement[],
    initial?: PreferenceWeights,
  ): TradeoffRanking {
    let w: PreferenceWeights = initial
      ? this.normaliseWeights(initial)
      : this.uniformWeights();
    for (const p of preferences) {
      w = this.adjustWeights(w, p);
    }
    return this.rankByWeights(frontier, w);
  }

  // ─── internals ────────────────────────────────────────────

  private validateStatement(s: PreferenceStatement): void {
    const keys: TradeoffObjective[] = ["Ra", "MRR", "reliability"];
    if (!keys.includes(s.prefer) || !keys.includes(s.over)) {
      throw new Error(
        `invalid objective in preference: prefer=${s.prefer} over=${s.over}`,
      );
    }
    if (!Number.isFinite(s.strength) || s.strength <= 0 || s.strength > 1) {
      throw new Error(
        `preference strength must lie in (0, 1], got ${s.strength}`,
      );
    }
  }

  private normaliseWeights(w: PreferenceWeights): PreferenceWeights {
    const ra = Math.max(w.Ra, 0);
    const mrr = Math.max(w.MRR, 0);
    const rel = Math.max(w.reliability, 0);
    const total = ra + mrr + rel;
    if (total <= 0) return this.uniformWeights();
    return { Ra: ra / total, MRR: mrr / total, reliability: rel / total };
  }
}

function norm(x: number, lo: number, hi: number): number {
  if (hi - lo < 1e-12) return 0.5;
  return (x - lo) / (hi - lo);
}
function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export const wedmTradeoffElicitationEngine =
  new WEDMTradeoffElicitationEngine();
