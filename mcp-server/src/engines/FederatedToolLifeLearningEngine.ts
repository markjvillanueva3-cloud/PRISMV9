/**
 * FederatedToolLifeLearningEngine — Bayesian Taylor curve blend across shops
 *
 * Closes the iter20 P2 "federated cross-shop tool-life learning" gap. When a
 * tool runs across N shops, each shop builds its own empirical Taylor curve
 * (V × T^n = C). Naive averaging ignores observation count — a shop with 1000
 * cuts deserves more weight than a shop with 5. Bayesian blend uses
 * observation-count posterior weighting:
 *
 *   n_blend = Σᵢ (wᵢ × nᵢ) / Σᵢ wᵢ
 *   C_blend = exp( Σᵢ (wᵢ × ln(Cᵢ)) / Σᵢ wᵢ )
 *   wᵢ = observation_countᵢ
 *
 * Plus disagreement detection: if any shop's n or C is >2σ from blended mean,
 * surface as outlier (operator review needed — could be material lot variation,
 * coolant differences, or measurement error).
 *
 * Reference: Taylor FW (1907) "On the Art of Cutting Metals" §13; Tlusty (2000)
 *   "Manufacturing Processes and Equipment" §3 (tool life); Carlin BP, Louis TA
 *   (2008) "Bayesian Methods for Data Analysis" §5 (hierarchical models); ISO
 *   3685 (tool-life testing); Sandvik Coromant Tool Wear Application Guide §C.
 *
 * @version 1.0.0
 * @module FederatedToolLifeLearningEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface ShopTaylorObservation {
  shop_id: string;
  /** Taylor exponent n (V × T^n = C); typical 0.10-0.35 */
  taylor_n: number;
  /** Taylor constant C (units m/min depending on V units) */
  taylor_C: number;
  /** Number of independent tool-life observations contributing */
  observation_count: number;
}

export interface FederatedToolLifeInput {
  shops: ShopTaylorObservation[];
  /** Outlier threshold in σ (default 2.0) */
  outlier_sigma?: number;
  /** Minimum total observations required for blend (default 30) */
  min_total_observations?: number;
}

export interface BlendedTaylor {
  blended_n: AtomicValue;
  blended_C: AtomicValue;
  total_observations: AtomicValue<number>;
  n_std_dev: AtomicValue;
  C_std_dev: AtomicValue;
  outlier_shops: Array<{ shop_id: string; reason: string; n_deviation_sigma: number; C_deviation_sigma: number }>;
  /** Confidence in blended curve (0-1) */
  confidence: AtomicValue;
  warnings: string[];
  source: string;
}

export class FederatedToolLifeLearningEngine {
  blend(input: FederatedToolLifeInput): BlendedTaylor {
    if (!input || !Array.isArray(input.shops) || input.shops.length === 0) {
      throw new Error("FederatedToolLifeLearningEngine.blend: shops[] required (non-empty)");
    }

    for (const shop of input.shops) {
      if (!shop.shop_id || shop.taylor_n == null || shop.taylor_C == null || shop.observation_count == null) {
        throw new Error(`FederatedToolLifeLearningEngine.blend: shop ${shop.shop_id || "?"} missing required fields`);
      }
      if (shop.taylor_n <= 0 || shop.taylor_n >= 1) {
        throw new Error(`FederatedToolLifeLearningEngine.blend: shop ${shop.shop_id} taylor_n must be in (0, 1) — got ${shop.taylor_n}`);
      }
      if (shop.taylor_C <= 0) {
        throw new Error(`FederatedToolLifeLearningEngine.blend: shop ${shop.shop_id} taylor_C must be positive`);
      }
      if (shop.observation_count <= 0) {
        throw new Error(`FederatedToolLifeLearningEngine.blend: shop ${shop.shop_id} observation_count must be positive`);
      }
    }

    const sigmaThreshold = input.outlier_sigma ?? 2.0;
    const minTotal = input.min_total_observations ?? 30;
    const warnings: string[] = [];

    // ── Observation-count-weighted blend ──────────────────────────────
    let totalW = 0, sumWN = 0, sumWLnC = 0;
    for (const s of input.shops) {
      totalW += s.observation_count;
      sumWN += s.observation_count * s.taylor_n;
      sumWLnC += s.observation_count * Math.log(s.taylor_C);
    }
    const blendedN = sumWN / totalW;
    const blendedC = Math.exp(sumWLnC / totalW);

    // ── Weighted std dev for outlier detection ────────────────────────
    let sumWSqN = 0, sumWSqLnC = 0;
    for (const s of input.shops) {
      sumWSqN += s.observation_count * (s.taylor_n - blendedN) ** 2;
      sumWSqLnC += s.observation_count * (Math.log(s.taylor_C) - Math.log(blendedC)) ** 2;
    }
    const nStdDev = Math.sqrt(sumWSqN / totalW);
    const cStdDevLn = Math.sqrt(sumWSqLnC / totalW);

    // ── Outlier detection (>2σ deviation) ─────────────────────────────
    const outliers: BlendedTaylor["outlier_shops"] = [];
    for (const s of input.shops) {
      const nDevSigma = nStdDev > 1e-9 ? Math.abs(s.taylor_n - blendedN) / nStdDev : 0;
      const cDevSigma = cStdDevLn > 1e-9 ? Math.abs(Math.log(s.taylor_C) - Math.log(blendedC)) / cStdDevLn : 0;
      if (nDevSigma > sigmaThreshold || cDevSigma > sigmaThreshold) {
        const reasons: string[] = [];
        if (nDevSigma > sigmaThreshold) reasons.push(`taylor_n deviation ${nDevSigma.toFixed(2)}σ > ${sigmaThreshold}σ`);
        if (cDevSigma > sigmaThreshold) reasons.push(`taylor_C deviation ${cDevSigma.toFixed(2)}σ > ${sigmaThreshold}σ`);
        outliers.push({
          shop_id: s.shop_id,
          reason: reasons.join("; "),
          n_deviation_sigma: Number(nDevSigma.toFixed(2)),
          C_deviation_sigma: Number(cDevSigma.toFixed(2)),
        });
      }
    }

    // ── Confidence (decreases with low obs OR high disagreement) ──────
    let confidence: number;
    if (totalW < minTotal) {
      confidence = 0.3;
      warnings.push(`Total observations ${totalW} < ${minTotal} — confidence floor 0.3 (low statistical power)`);
    } else if (outliers.length > input.shops.length / 2) {
      confidence = 0.4;
      warnings.push(`${outliers.length}/${input.shops.length} shops flagged as outliers — high disagreement; review material lot/coolant/measurement consistency`);
    } else {
      // Confidence = 1 - normalized n-stddev (higher stddev → less confidence)
      // Cap at 0.95 (never fully certain with empirical data)
      const nSpread = nStdDev / Math.max(blendedN, 0.05);
      confidence = Math.min(0.95, Math.max(0.4, 1.0 - nSpread));
    }

    if (input.shops.length === 1) {
      warnings.push("Single shop — no federation benefit; blend equals input. Add ≥2 shops for true cross-shop learning");
    }
    if (outliers.length > 0) {
      warnings.push(`${outliers.length} outlier shop(s) flagged — surface to operator review (ISO 3685 tool-life testing variance check)`);
    }

    return {
      blended_n: {
        value: Number(blendedN.toFixed(4)),
        unit: "exponent",
        source: "Σ(wᵢ × nᵢ) / Σ wᵢ (observation-count-weighted)",
      },
      blended_C: {
        value: Number(blendedC.toFixed(2)),
        unit: "m/min·min^n",
        source: "exp(Σ(wᵢ × ln(Cᵢ)) / Σ wᵢ) (geometric blend)",
      },
      total_observations: {
        value: totalW,
        unit: "obs",
        source: "Σ observation_count across all shops",
      },
      n_std_dev: {
        value: Number(nStdDev.toFixed(4)),
        unit: "exponent",
        source: "weighted RMS deviation of taylor_n",
      },
      C_std_dev: {
        value: Number((cStdDevLn).toFixed(4)),
        unit: "ln(m/min·min^n)",
        source: "weighted RMS deviation of ln(C)",
      },
      outlier_shops: outliers,
      confidence: {
        value: Number(confidence.toFixed(2)),
        unit: "score 0-1",
        source: "1 - normalized n-spread, floored by obs-count + outlier-fraction",
      },
      warnings,
      source: "FederatedToolLifeLearningEngine — Taylor 1907 §13 + Tlusty §3 + Carlin-Louis §5 + ISO 3685 + Sandvik Tool Wear §C",
    };
  }
}

export const federatedToolLifeLearningEngine = new FederatedToolLifeLearningEngine();
