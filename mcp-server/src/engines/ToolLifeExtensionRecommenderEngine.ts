/**
 * ToolLifeExtensionRecommenderEngine -- ranks tool-life-EXTENSION levers by predicted life gain
 * per productivity cost, using the canonical Taylor tool-life law (NO inline constants: Taylor n
 * comes from getTaylor(material) -> CANONICAL_TAYLOR, uncertainty from CANONICAL_TAYLOR_LIFE_CV).
 *
 * UNIT-0012 (Tool Life Extension Strategies). The individual levers already exist across engines
 * (CoatingVcModifier, cryo_tool_life, WearPatternRefinish, ToolLifeAdaptive/Weibull); what was
 * missing (verified: grep life.?extension across src found only per-engine advisories, no
 * composer) is an engine that quantifies each lever's LIFE MULTIPLIER on one Taylor basis and
 * ranks them. This ships the two FUNDAMENTAL, fully-Taylor-citable levers -- speed reduction and
 * coating upgrade -- as a pure, self-contained core; coolant/cryo/refinish/Weibull are additional
 * levers noted as extensions (they require their own engines' outputs and are not fabricated here).
 *
 * Taylor relations (T = (C/Vc)^(1/n)):
 *   - SPEED REDUCTION by fraction r: at the lower Vc' = Vc*(1-r), tool life rises by
 *     T'/T = (Vc/Vc')^(1/n) = (1/(1-r))^(1/n). Productivity (MRR ~ Vc) falls ~r.
 *   - COATING UPGRADE with a Vc-multiplier k (k*Vc allowed at CONSTANT life): keeping the SAME Vc
 *     instead spends that capability as LIFE -> T'/T = k^(1/n), at ~zero productivity cost.
 *
 * PURE + NEVER-THROWS (matches BUEOnsetThresholdEngine): invalid levers are skipped with a warning.
 * Uncertainty: the 1/n exponent amplifies Taylor-constant scatter (CANONICAL_TAYLOR_LIFE_CV.C_cv),
 * so low-n materials correctly report wider life-multiplier bands -- the real physics, not a defect.
 * Sources: Taylor (1907); ISO 3685:1993; Trent & Wright "Metal Cutting" 4e; Gilbert 1950 (min-cost V).
 */

import { getTaylor, CANONICAL_TAYLOR_LIFE_CV } from "../physics/constants.js";

// --- Types ------------------------------------------------------------------

export type LifeExtensionLever =
  | { type: "speed_reduction"; vc_reduction_pct: number } // lower Vc by this % (0-90)
  | { type: "coating_upgrade"; vc_multiplier: number };   // coating allows k*Vc at constant life (k>1)

export interface LifeExtensionInput {
  material: string;
  current_vc_m_min: number;
  /** Optional current tool life (min); if given, resulting_life_min = baseline * multiplier. */
  baseline_life_min?: number;
  levers: LifeExtensionLever[];
}

export interface RankedLever {
  type: string;
  /** Predicted T_new / T_current (>1 = life extension). */
  life_multiplier: number;
  /** Absolute +/- uncertainty on life_multiplier (Taylor scatter, 1/n-amplified). */
  life_multiplier_uncertainty: number;
  resulting_life_min: number | null;
  /** Throughput/MRR loss as a % (0 for coating -- same Vc, more life). */
  productivity_cost_pct: number;
  /** Ranking metric: life gain (multiplier-1) per unit fractional productivity cost. */
  life_gain_per_cost: number;
  detail: string;
}

export interface LifeExtensionResult {
  material: string;
  iso_taylor_n: number;
  ranked_levers: RankedLever[]; // best-first
  best: RankedLever | null;
  warnings: string[];
  source: string;
  note: string;
}

// --- Named constants --------------------------------------------------------

/** Coating with zero productivity cost is ranked ahead of any speed trade; large finite sentinel. */
const FREE_LIFE_RANK = 1e6;
/** Max speed reduction we will model (below this Vc the cut may stall / rub -- reject beyond). */
const MAX_VC_REDUCTION_PCT = 90;

// --- Engine -----------------------------------------------------------------

class ToolLifeExtensionRecommenderEngineImpl {
  /**
   * Rank life-extension levers by predicted life gain per productivity cost.
   * Never throws -- invalid levers are skipped and reported in `warnings`.
   *
   * @param input material (-> Taylor n) + current Vc + candidate levers.
   * @returns ranked levers with life multiplier + uncertainty, best-first.
   */
  recommend(input: LifeExtensionInput): LifeExtensionResult {
    const warnings: string[] = [];
    const n = getTaylor(input.material).n;
    const ranked: RankedLever[] = [];

    if (!(n > 0)) {
      warnings.push(`Taylor exponent n resolved to ${n} for "${input.material}" -- cannot compute life multipliers.`);
      return { material: input.material, iso_taylor_n: n, ranked_levers: [], best: null, warnings, source: SOURCE, note: NOTE };
    }

    // 1/n-amplified relative life uncertainty from the Taylor constant CV (the dominant term).
    const relLifeUnc = (CANONICAL_TAYLOR_LIFE_CV.C_cv / 100) / n;
    const baseline = input.baseline_life_min;

    for (const lever of input.levers ?? []) {
      if (lever.type === "speed_reduction") {
        const r = lever.vc_reduction_pct / 100;
        if (!(lever.vc_reduction_pct > 0) || lever.vc_reduction_pct > MAX_VC_REDUCTION_PCT) {
          warnings.push(`speed_reduction ${lever.vc_reduction_pct}% out of (0, ${MAX_VC_REDUCTION_PCT}] -- skipped.`);
          continue;
        }
        const mult = Math.pow(1 / (1 - r), 1 / n);
        const prodCostPct = lever.vc_reduction_pct; // MRR ~ Vc, so ~linear throughput loss
        ranked.push(this.mk("speed_reduction", mult, relLifeUnc, baseline, prodCostPct,
          `Lower Vc ${lever.vc_reduction_pct}% (Vc ${Math.round(input.current_vc_m_min)} -> ${Math.round(input.current_vc_m_min * (1 - r))} m/min): T x${mult.toFixed(2)} via Taylor (1/(1-r))^(1/n), n=${n}. Throughput ~-${lever.vc_reduction_pct}%.`));
      } else if (lever.type === "coating_upgrade") {
        if (!(lever.vc_multiplier > 1)) {
          warnings.push(`coating_upgrade vc_multiplier ${lever.vc_multiplier} must be > 1 -- skipped.`);
          continue;
        }
        const mult = Math.pow(lever.vc_multiplier, 1 / n);
        ranked.push(this.mk("coating_upgrade", mult, relLifeUnc, baseline, 0,
          `Coating allows ${lever.vc_multiplier}x Vc at constant life; spent as LIFE at the same Vc: T x${mult.toFixed(2)} = k^(1/n), n=${n}. ~zero throughput cost.`));
      } else {
        warnings.push(`Unknown lever type -- skipped.`);
      }
    }

    ranked.sort((a, b) => b.life_gain_per_cost - a.life_gain_per_cost);
    return {
      material: input.material, iso_taylor_n: n,
      ranked_levers: ranked, best: ranked[0] ?? null,
      warnings, source: SOURCE, note: NOTE,
    };
  }

  private mk(type: string, mult: number, relUnc: number, baseline: number | undefined, prodCostPct: number, detail: string): RankedLever {
    const gain = mult - 1;
    const lifeGainPerCost = prodCostPct <= 0 ? FREE_LIFE_RANK : gain / (prodCostPct / 100);
    return {
      type,
      life_multiplier: +mult.toFixed(4),
      life_multiplier_uncertainty: +(mult * relUnc).toFixed(4),
      resulting_life_min: baseline != null && baseline > 0 ? +(baseline * mult).toFixed(1) : null,
      productivity_cost_pct: prodCostPct,
      life_gain_per_cost: +lifeGainPerCost.toFixed(4),
      detail,
    };
  }
}

const SOURCE = "ToolLifeExtensionRecommenderEngine (canonical Taylor T=(C/Vc)^(1/n); n from CANONICAL_TAYLOR, life uncertainty from CANONICAL_TAYLOR_LIFE_CV 1/n-amplified; Taylor 1907 / ISO 3685:1993)";
const NOTE = "Ships the two fully-Taylor-citable levers (speed_reduction, coating_upgrade). Coolant/cryo (cryo_tool_life improvement_factor), refinish (WearPatternRefinish), and replacement-timing (Weibull ToolLifeAdaptive) are additional levers -- add via their engines' own outputs, not fabricated here.";

/** Singleton export per PRISM engine convention. */
export const toolLifeExtensionRecommenderEngine = new ToolLifeExtensionRecommenderEngineImpl();
