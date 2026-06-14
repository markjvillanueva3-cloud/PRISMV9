/**
 * CryogenicMQLStrategySelectorEngine — coolant strategy selector
 *
 * Closes the iter20 P2 "cryo/MQL strategy" gap. Recommends optimal coolant
 * approach from {dry / MQL / flood / cryo-LN2 / cryo-CO2} given material +
 * cut intensity + sustainability target. Pairs with iter30 material-coolant
 * compatibility (which CHECKS) by RECOMMENDING the strategy.
 *
 * Decision drivers per Sandvik Coromant Coolant Application Guide §A-2 +
 * Cimcool MQL Guide + ASTM E2275 + Lawrence Berkeley sustainability studies:
 *   - Titanium/Inconel: cryo-LN2 prefers (cools tool tip + chip exits clean)
 *   - Aluminum + high MRR: flood (heat removal dominates)
 *   - Aluminum + finishing: MQL or dry (chip welding risk)
 *   - Cast iron: dry preferred (water + Fe → rust); MQL acceptable
 *   - Magnesium: dry or neat-oil MQL (water = fire hazard, NFPA 484)
 *   - Steel + production: flood (cost-optimal)
 *   - Stainless: flood or MQL (work-hardening sensitive)
 *
 * Sustainability tier: dry > MQL > cryo-CO2 > cryo-LN2 > flood (in order of
 * decreasing eco-friendliness; flood has waste-disposal + energy cost).
 *
 * Reference: Sandvik Coromant Coolant Application Guide §A-2; Cimcool MQL
 *   (Minimum Quantity Lubrication) Best Practice Guide §3; ASTM E2275
 *   (water-miscible MWF stability); LBNL "Sustainability of Coolant Strategies"
 *   2019; Mazak Cryogenic Machining Application Notes §B-1; NFPA 484.
 *
 * @version 1.0.0
 * @module CryogenicMQLStrategySelectorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type Material = "aluminum" | "steel" | "stainless" | "titanium" | "inconel" | "cast_iron" | "magnesium" | "brass" | "tool_steel_hardened";
export type Operation = "roughing" | "finishing" | "drilling" | "tapping" | "milling_2d" | "milling_3d" | "turning" | "grinding";
export type SustainabilityTarget = "min_cost" | "balanced" | "low_carbon" | "zero_emission";

export interface CoolantStrategyInput {
  material: Material;
  operation: Operation;
  /** Material removal rate (cm³/min) — drives cooling capacity requirement */
  mrr_cm3_min: number;
  /** Tool diameter (mm) — affects flood vs MQL effectiveness */
  tool_diameter_mm: number;
  /** Production volume (parts/year) — drives strategy ROI */
  annual_volume?: number;
  /** Sustainability priority */
  sustainability: SustainabilityTarget;
}

export type CoolantStrategy = "dry" | "mql" | "flood" | "cryo_co2" | "cryo_ln2";

export interface CoolantStrategyResult {
  recommended_strategy: AtomicValue<CoolantStrategy>;
  /** Confidence in recommendation (0-1) */
  confidence: AtomicValue;
  /** Alternative strategies, ranked */
  alternatives: Array<{ strategy: CoolantStrategy; score: number; reason: string }>;
  /** Estimated tool-life multiplier vs flood baseline */
  expected_tool_life_multiplier: AtomicValue;
  /** Carbon footprint tier (low / medium / high) */
  carbon_footprint_tier: AtomicValue<string>;
  warnings: string[];
  source: string;
}

interface StrategyScore {
  strategy: CoolantStrategy;
  score: number;
  reason: string;
}

const CARBON_TIER: Record<CoolantStrategy, string> = {
  dry: "low",
  mql: "low",
  flood: "high",
  cryo_co2: "medium",
  cryo_ln2: "medium",
};

export class CryogenicMQLStrategySelectorEngine {
  recommend(input: CoolantStrategyInput): CoolantStrategyResult {
    if (!input || !input.material || !input.operation || input.mrr_cm3_min == null) {
      throw new Error("CryogenicMQLStrategySelectorEngine.recommend: material + operation + mrr_cm3_min required");
    }
    if (input.mrr_cm3_min < 0 || input.tool_diameter_mm <= 0) {
      throw new Error("CryogenicMQLStrategySelectorEngine.recommend: non-negative mrr + positive tool_diameter required");
    }

    const warnings: string[] = [];
    const scores: StrategyScore[] = [];

    // ── Base material rules ───────────────────────────────────────────
    if (input.material === "titanium" || input.material === "inconel") {
      scores.push({ strategy: "cryo_ln2", score: 0.95, reason: `${input.material} edge temp control — cryo-LN2 doubles tool life (Mazak §B-1)` });
      scores.push({ strategy: "flood", score: 0.70, reason: "high-pressure flood (70+ bar) is fallback when cryo unavailable" });
      scores.push({ strategy: "mql", score: 0.40, reason: "MQL marginal on Ti/Inconel — heat removal limited" });
      scores.push({ strategy: "dry", score: 0.10, reason: "dry on Ti/Inconel → rapid tool wear, NOT recommended" });
    } else if (input.material === "magnesium") {
      scores.push({ strategy: "dry", score: 0.90, reason: "magnesium + water = fire hazard (NFPA 484); dry strongly preferred" });
      scores.push({ strategy: "mql", score: 0.75, reason: "MQL with neat-oil base only (no water phase)" });
      scores.push({ strategy: "flood", score: 0.00, reason: "FORBIDDEN — water-base coolant on Mg = exothermic H₂ generation" });
      scores.push({ strategy: "cryo_co2", score: 0.65, reason: "CO2 inert — acceptable for high-MRR Mg work" });
    } else if (input.material === "cast_iron") {
      scores.push({ strategy: "dry", score: 0.85, reason: "cast iron + water → rust; dry preferred for production volume" });
      scores.push({ strategy: "mql", score: 0.75, reason: "MQL acceptable — minimal residue + no rust risk" });
      scores.push({ strategy: "flood", score: 0.55, reason: "flood OK if rust inhibitor + immediate post-cut dry" });
    } else if (input.material === "aluminum") {
      if (input.operation === "finishing") {
        scores.push({ strategy: "mql", score: 0.85, reason: "aluminum finishing — MQL avoids chip welding + clean surface" });
        scores.push({ strategy: "dry", score: 0.70, reason: "dry with sharp tool acceptable for light finishing" });
        scores.push({ strategy: "flood", score: 0.60, reason: "flood OK but harder to manage chip wash" });
      } else {
        scores.push({ strategy: "flood", score: 0.90, reason: "aluminum + high MRR — flood for heat removal + chip wash" });
        scores.push({ strategy: "mql", score: 0.60, reason: "MQL acceptable below 100 cm³/min" });
        scores.push({ strategy: "cryo_ln2", score: 0.55, reason: "cryo for very high-MRR aluminum (>500 cm³/min)" });
      }
    } else if (input.material === "stainless" || input.material === "tool_steel_hardened") {
      scores.push({ strategy: "flood", score: 0.85, reason: "stainless work-hardening sensitive — flood prevents BUE + heat" });
      scores.push({ strategy: "cryo_ln2", score: 0.80, reason: "cryo excellent for stainless (controls work-hardening)" });
      scores.push({ strategy: "mql", score: 0.55, reason: "MQL marginal — stainless prefers heat sink" });
    } else {
      // steel default
      scores.push({ strategy: "flood", score: 0.85, reason: "steel + production — flood cost-optimal" });
      scores.push({ strategy: "mql", score: 0.70, reason: "MQL viable for short-run + sustainability priority" });
      scores.push({ strategy: "dry", score: 0.45, reason: "dry steel OK with cermet/PCBN tools only" });
    }

    // ── MRR adjustments ───────────────────────────────────────────────
    if (input.mrr_cm3_min > 500) {
      // High MRR penalizes MQL + dry (heat removal insufficient)
      scores.forEach(s => { if (s.strategy === "mql" || s.strategy === "dry") s.score *= 0.6; });
      warnings.push(`High MRR ${input.mrr_cm3_min} cm³/min — MQL/dry heat removal limited; flood or cryo preferred`);
    } else if (input.mrr_cm3_min < 50) {
      // Low MRR favors MQL + dry (sustainability + cost)
      scores.forEach(s => { if (s.strategy === "mql" || s.strategy === "dry") s.score *= 1.2; });
    }

    // ── Sustainability bias ───────────────────────────────────────────
    if (input.sustainability === "zero_emission") {
      scores.forEach(s => { if (s.strategy === "dry" || s.strategy === "mql") s.score *= 1.3; });
      scores.forEach(s => { if (s.strategy === "flood") s.score *= 0.5; });
    } else if (input.sustainability === "low_carbon") {
      scores.forEach(s => { if (s.strategy === "dry" || s.strategy === "mql") s.score *= 1.15; });
      scores.forEach(s => { if (s.strategy === "flood") s.score *= 0.85; });
    } else if (input.sustainability === "min_cost") {
      scores.forEach(s => { if (s.strategy === "flood") s.score *= 1.15; });
      scores.forEach(s => { if (s.strategy === "cryo_ln2" || s.strategy === "cryo_co2") s.score *= 0.7; });
    }

    // ── Cap scores at 1.0, sort descending ────────────────────────────
    scores.forEach(s => s.score = Math.min(1.0, s.score));
    scores.sort((a, b) => b.score - a.score);

    const recommended = scores[0];
    const toolLifeMultiplier = recommended.strategy === "cryo_ln2" ? 2.0
      : recommended.strategy === "cryo_co2" ? 1.6
      : recommended.strategy === "flood" ? 1.0
      : recommended.strategy === "mql" ? 0.85
      : 0.70;  // dry

    if (input.annual_volume !== undefined && input.annual_volume > 10000 && recommended.strategy === "cryo_ln2") {
      warnings.push(`Annual volume ${input.annual_volume}/yr × cryo-LN2 — verify LN2 supply contract economics ($0.30-0.80/L)`);
    }

    return {
      recommended_strategy: {
        value: recommended.strategy,
        unit: "strategy",
        source: `top-scored ${recommended.score.toFixed(2)} per Sandvik §A-2 + Cimcool MQL Guide`,
      },
      confidence: {
        value: Number(recommended.score.toFixed(2)),
        unit: "score 0-1",
        source: "base material rule + MRR + sustainability adjustments",
      },
      alternatives: scores.slice(1, 4).map(s => ({ strategy: s.strategy, score: Number(s.score.toFixed(2)), reason: s.reason })),
      expected_tool_life_multiplier: {
        value: toolLifeMultiplier,
        unit: "× flood baseline",
        source: "Sandvik §A-2 typical tool-life multipliers",
      },
      carbon_footprint_tier: {
        value: CARBON_TIER[recommended.strategy],
        unit: "tier",
        source: "LBNL 2019 Sustainability of Coolant Strategies",
      },
      warnings,
      source: "CryogenicMQLStrategySelectorEngine — Sandvik §A-2 + Cimcool MQL §3 + ASTM E2275 + LBNL 2019 + Mazak §B-1 + NFPA 484",
    };
  }
}

export const cryogenicMQLStrategySelectorEngine = new CryogenicMQLStrategySelectorEngine();
