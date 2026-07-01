/**
 * FleetLearningStrategyEngine — CAMX-MS15/U04 (E1140)
 *
 * Aggregates strategy performance across multiple machines, shops, and users
 * to produce fleet-level intelligence. Enables transfer learning from similar
 * contexts (materials, features, machine types) so new shops benefit from
 * fleet-wide experience immediately.
 *
 * Core algorithms:
 *   1. Hierarchical Bayesian shrinkage — pulls shop-level estimates toward
 *      the fleet mean when sample size is small, retains shop-specific
 *      data when sample is large (James-Stein estimator, 1961)
 *   2. Transfer learning via material/feature similarity — uses cosine
 *      similarity between feature vectors to weight prior data
 *   3. Fleet aggregation — weighted average across shops, weighted by
 *      sample size and recency (exponential decay, half-life = 90 days)
 *
 * Statistical model:
 *   θ_shop ~ N(θ_fleet, σ²_between)
 *   y_ij | θ_shop ~ N(θ_shop, σ²_within)
 *
 *   Shrinkage factor B = σ²_within / (σ²_within + n_i * σ²_between)
 *   Shrunk estimate: θ̂_shop = B * θ_fleet + (1 - B) * ȳ_shop
 *
 * References:
 *   - James & Stein (1961): "Estimation with Quadratic Loss"
 *   - Efron & Morris (1975): "Data Analysis Using Stein's Estimator"
 *   - StrategyPerformanceTrackerEngine (E1131) — individual shop data source
 *   - Gelman et al. "BDA3" Ch.5: hierarchical models
 *
 * @module FleetLearningStrategyEngine
 * @shortcode E1140
 * @dispatcher camDispatcher
 * @actions fleet_aggregate, fleet_transfer, fleet_insights
 * @milestone CAMX-MS15/U04
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum observations for a shop to contribute to fleet stats */
const MIN_SHOP_OBSERVATIONS = 3;

/** Recency half-life [days] for exponential decay weighting */
const RECENCY_HALF_LIFE_DAYS = 90;

/** Minimum similarity threshold for transfer learning [0-1] */
const MIN_SIMILARITY_THRESHOLD = 0.3;

/** Maximum shrinkage factor (never fully ignore shop data) */
const MAX_SHRINKAGE = 0.95;

/** Minimum shrinkage factor (always some fleet influence) */
const MIN_SHRINKAGE = 0.05;

/** Default number of top strategies to return in insights */
const DEFAULT_TOP_K = 5;

/** Confidence level for Wilson interval */
const Z_95 = 1.96;

// ============================================================================
// TYPES
// ============================================================================

/** ISO material group */
export type FleetIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Strategy execution outcome */
export type FleetOutcome = "success" | "failure" | "partial";

/** Performance record from a single shop */
export interface ShopPerformanceRecord {
  /** Shop identifier */
  shop_id: string;
  /** Machine identifier */
  machine_id: string;
  /** Strategy identifier */
  strategy_id: string;
  /** Feature type */
  feature_type: string;
  /** Material ISO group */
  material_iso: FleetIsoGroup;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Measured cycle time [min] */
  cycle_time_min: number;
  /** Measured tool life [min] */
  tool_life_min?: number;
  /** Measured surface roughness Ra [um] */
  Ra_um?: number;
  /** Outcome */
  outcome: FleetOutcome;
  /** Timestamp ISO-8601 */
  timestamp: string;
  /** User identifier (optional) */
  user_id?: string;
  /** Additional context tags */
  tags?: Record<string, string>;
}

/** Aggregated shop data input */
export interface ShopData {
  /** Shop identifier */
  shop_id: string;
  /** Shop name */
  shop_name?: string;
  /** Number of machines */
  machine_count?: number;
  /** Performance records */
  records: ShopPerformanceRecord[];
}

/** Context for transfer learning */
export interface TransferContext {
  /** Feature type (e.g., "pocket", "contour", "drill_hole") */
  feature_type: string;
  /** Material ISO group */
  material_iso: FleetIsoGroup;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Machine type */
  machine_type?: "3axis" | "5axis" | "lathe" | "mill_turn";
  /** Target strategy to evaluate */
  strategy_id?: string;
  /** Material hardness HRC (optional, improves similarity) */
  hardness_HRC?: number;
}

/** Fleet-level performance statistics for a strategy+material combo */
export interface FleetPerformanceStats {
  /** Strategy identifier */
  strategy_id: string;
  /** Material ISO group */
  material_iso: FleetIsoGroup;
  /** Feature type */
  feature_type: string;
  /** Number of contributing shops */
  contributing_shops: number;
  /** Total observations across fleet */
  total_observations: number;
  /** Fleet mean cycle time [min] */
  fleet_mean_cycle_time_min: number;
  /** Fleet std dev cycle time [min] */
  fleet_std_cycle_time_min: number;
  /** Fleet mean tool life [min] */
  fleet_mean_tool_life_min: number | null;
  /** Fleet mean Ra [um] */
  fleet_mean_Ra_um: number | null;
  /** Success rate across fleet [0-1] */
  fleet_success_rate: number;
  /** Wilson 95% CI on success rate */
  success_rate_ci_lower: number;
  success_rate_ci_upper: number;
  /** Between-shop variance component */
  between_shop_variance: number;
  /** Within-shop variance component */
  within_shop_variance: number;
  /** Per-shop shrunk estimates */
  shop_estimates: ShopEstimate[];
}

/** Shrunk estimate for a single shop */
export interface ShopEstimate {
  shop_id: string;
  /** Raw shop mean */
  raw_mean_cycle_time: number;
  /** Shrunk estimate (toward fleet mean) */
  shrunk_cycle_time: number;
  /** Shrinkage factor B (0 = all shop data, 1 = all fleet data) */
  shrinkage_factor: number;
  /** Number of observations */
  n_observations: number;
  /** Shop success rate */
  success_rate: number;
}

/** Transfer learning result */
export interface TransferLearningResult {
  /** Source context description */
  source_context: string;
  /** Target context description */
  target_context: string;
  /** Similarity score [0-1] */
  similarity: number;
  /** Transferred performance prediction */
  predicted_cycle_time_min: number;
  /** Confidence in prediction [0-1] */
  confidence: number;
  /** Number of source observations used */
  source_observations: number;
  /** Recommended strategies (ranked by expected performance) */
  recommended_strategies: StrategyRecommendation[];
  /** Adjustments applied for context differences */
  adjustments: TransferAdjustment[];
  /** Warnings */
  warnings: string[];
}

/** A recommended strategy from transfer learning */
export interface StrategyRecommendation {
  strategy_id: string;
  /** Expected cycle time [min] */
  expected_cycle_time_min: number;
  /** Expected success rate [0-1] */
  expected_success_rate: number;
  /** Confidence [0-1] */
  confidence: number;
  /** Number of supporting observations */
  supporting_observations: number;
  /** Rationale */
  rationale: string;
}

/** Adjustment applied during transfer */
export interface TransferAdjustment {
  parameter: string;
  factor: number;
  reason: string;
}

/** Fleet insights for a strategy+material combo */
export interface FleetInsightsResult {
  /** Strategy analyzed */
  strategy_id: string;
  /** Material analyzed */
  material_iso: FleetIsoGroup;
  /** Performance stats */
  performance: FleetPerformanceStats;
  /** Best-performing shops */
  top_shops: Array<{ shop_id: string; mean_cycle_time: number; success_rate: number }>;
  /** Worst-performing shops */
  bottom_shops: Array<{ shop_id: string; mean_cycle_time: number; success_rate: number }>;
  /** Trend (improving/stable/declining) */
  trend: "improving" | "stable" | "declining";
  /** Days of data span */
  data_span_days: number;
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class FleetLearningStrategyEngine {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. aggregateFleet — Hierarchical Bayesian shrinkage across shops
  // ──────────────────────────────────────────────────────────────────────────

  aggregateFleet(
    shopData: ShopData[],
    strategyFilter?: string,
    materialFilter?: FleetIsoGroup,
  ): FleetPerformanceStats[] {
    const results: FleetPerformanceStats[] = [];

    // Group all records by (strategy_id, material_iso, feature_type)
    const groups = new Map<string, Map<string, ShopPerformanceRecord[]>>();

    for (const shop of shopData) {
      for (const rec of shop.records) {
        if (strategyFilter && rec.strategy_id !== strategyFilter) continue;
        if (materialFilter && rec.material_iso !== materialFilter) continue;

        const groupKey = `${rec.strategy_id}|${rec.material_iso}|${rec.feature_type}`;
        if (!groups.has(groupKey)) groups.set(groupKey, new Map());
        const shopMap = groups.get(groupKey)!;
        if (!shopMap.has(rec.shop_id)) shopMap.set(rec.shop_id, []);
        shopMap.get(rec.shop_id)!.push(rec);
      }
    }

    for (const [groupKey, shopMap] of groups) {
      const [strategy_id, material_iso, feature_type] = groupKey.split("|");

      // Filter shops with minimum observations
      const qualifiedShops: Array<{ shop_id: string; records: ShopPerformanceRecord[] }> = [];
      for (const [shop_id, records] of shopMap) {
        if (records.length >= MIN_SHOP_OBSERVATIONS) {
          qualifiedShops.push({ shop_id, records });
        }
      }

      if (qualifiedShops.length === 0) continue;

      // Apply recency weighting
      const now = Date.now();
      const weightedRecords = (recs: ShopPerformanceRecord[]) => {
        return recs.map(r => {
          const ageDays = (now - new Date(r.timestamp).getTime()) / (86400000);
          const weight = Math.exp(-Math.LN2 * ageDays / RECENCY_HALF_LIFE_DAYS);
          return { ...r, weight };
        });
      };

      // Compute per-shop statistics
      const shopStats = qualifiedShops.map(({ shop_id, records }) => {
        const weighted = weightedRecords(records);
        const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
        const meanCT = weighted.reduce((s, w) => s + w.cycle_time_min * w.weight, 0) / totalWeight;
        const varCT = weighted.reduce((s, w) => s + w.weight * (w.cycle_time_min - meanCT) ** 2, 0) / totalWeight;
        const successCount = records.filter(r => r.outcome === "success").length;
        const toolLifeRecs = records.filter(r => r.tool_life_min != null);
        const raRecs = records.filter(r => r.Ra_um != null);

        return {
          shop_id,
          n: records.length,
          mean_ct: meanCT,
          var_ct: varCT,
          success_rate: successCount / records.length,
          mean_tool_life: toolLifeRecs.length > 0
            ? toolLifeRecs.reduce((s, r) => s + r.tool_life_min!, 0) / toolLifeRecs.length
            : null,
          mean_Ra: raRecs.length > 0
            ? raRecs.reduce((s, r) => s + r.Ra_um!, 0) / raRecs.length
            : null,
        };
      });

      // Fleet-level statistics
      const totalObs = shopStats.reduce((s, sh) => s + sh.n, 0);
      const fleetMeanCT = shopStats.reduce((s, sh) => s + sh.mean_ct * sh.n, 0) / totalObs;

      // Between-shop variance (variance of shop means)
      const betweenVar = shopStats.length > 1
        ? shopStats.reduce((s, sh) => s + (sh.mean_ct - fleetMeanCT) ** 2, 0) / (shopStats.length - 1)
        : 0;

      // Within-shop variance (average of within-shop variances)
      const withinVar = shopStats.reduce((s, sh) => s + sh.var_ct, 0) / shopStats.length;

      // James-Stein shrinkage estimates
      const shopEstimates: ShopEstimate[] = shopStats.map(sh => {
        const B = withinVar > 0
          ? Math.min(MAX_SHRINKAGE, Math.max(MIN_SHRINKAGE, withinVar / (withinVar + sh.n * betweenVar)))
          : MIN_SHRINKAGE;
        const shrunk = B * fleetMeanCT + (1 - B) * sh.mean_ct;
        return {
          shop_id: sh.shop_id,
          raw_mean_cycle_time: Math.round(sh.mean_ct * 100) / 100,
          shrunk_cycle_time: Math.round(shrunk * 100) / 100,
          shrinkage_factor: Math.round(B * 1000) / 1000,
          n_observations: sh.n,
          success_rate: Math.round(sh.success_rate * 1000) / 1000,
        };
      });

      // Fleet success rate with Wilson CI
      const totalSuccess = shopStats.reduce((s, sh) => s + sh.success_rate * sh.n, 0);
      const pHat = totalSuccess / totalObs;
      const wilson = this.wilsonCI(pHat, totalObs);

      // Fleet tool life and Ra
      const toolLifeShops = shopStats.filter(sh => sh.mean_tool_life !== null);
      const fleetToolLife = toolLifeShops.length > 0
        ? toolLifeShops.reduce((s, sh) => s + sh.mean_tool_life!, 0) / toolLifeShops.length
        : null;

      const raShops = shopStats.filter(sh => sh.mean_Ra !== null);
      const fleetRa = raShops.length > 0
        ? raShops.reduce((s, sh) => s + sh.mean_Ra!, 0) / raShops.length
        : null;

      results.push({
        strategy_id,
        material_iso: material_iso as FleetIsoGroup,
        feature_type,
        contributing_shops: qualifiedShops.length,
        total_observations: totalObs,
        fleet_mean_cycle_time_min: Math.round(fleetMeanCT * 100) / 100,
        fleet_std_cycle_time_min: Math.round(Math.sqrt(betweenVar + withinVar) * 100) / 100,
        fleet_mean_tool_life_min: fleetToolLife !== null ? Math.round(fleetToolLife * 100) / 100 : null,
        fleet_mean_Ra_um: fleetRa !== null ? Math.round(fleetRa * 100) / 100 : null,
        fleet_success_rate: Math.round(pHat * 1000) / 1000,
        success_rate_ci_lower: wilson.lower,
        success_rate_ci_upper: wilson.upper,
        between_shop_variance: Math.round(betweenVar * 1000) / 1000,
        within_shop_variance: Math.round(withinVar * 1000) / 1000,
        shop_estimates: shopEstimates,
      });
    }

    log.info(`[FleetLearning] Aggregated ${results.length} strategy-material groups from ${shopData.length} shops`);
    return results;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. transferLearning — Apply fleet knowledge to new context
  // ──────────────────────────────────────────────────────────────────────────

  transferLearning(
    sourceData: ShopData[],
    sourceContext: TransferContext,
    targetContext: TransferContext,
  ): TransferLearningResult {
    const warnings: string[] = [];
    const adjustments: TransferAdjustment[] = [];

    // Compute similarity between source and target contexts
    const similarity = this.contextSimilarity(sourceContext, targetContext);

    if (similarity < MIN_SIMILARITY_THRESHOLD) {
      warnings.push(`Context similarity ${similarity.toFixed(3)} below threshold ${MIN_SIMILARITY_THRESHOLD} — predictions may be unreliable`);
    }

    // Gather relevant records from source data
    const relevantRecords: ShopPerformanceRecord[] = [];
    for (const shop of sourceData) {
      for (const rec of shop.records) {
        if (rec.feature_type === sourceContext.feature_type &&
            rec.material_iso === sourceContext.material_iso) {
          if (!sourceContext.strategy_id || rec.strategy_id === sourceContext.strategy_id) {
            relevantRecords.push(rec);
          }
        }
      }
    }

    if (relevantRecords.length === 0) {
      return {
        source_context: this.contextToString(sourceContext),
        target_context: this.contextToString(targetContext),
        similarity,
        predicted_cycle_time_min: 0,
        confidence: 0,
        source_observations: 0,
        recommended_strategies: [],
        adjustments: [],
        warnings: ["No source data found for transfer"],
      };
    }

    // Compute adjustments for context differences
    let adjustmentFactor = 1.0;

    // Material group adjustment
    if (sourceContext.material_iso !== targetContext.material_iso) {
      const matFactor = this.materialAdjustmentFactor(sourceContext.material_iso, targetContext.material_iso);
      adjustmentFactor *= matFactor;
      adjustments.push({
        parameter: "material_group",
        factor: matFactor,
        reason: `${sourceContext.material_iso} -> ${targetContext.material_iso}: machinability adjustment`,
      });
    }

    // Tool diameter adjustment (cycle time roughly proportional to 1/ae, ae proportional to D)
    if (sourceContext.tool_diameter_mm !== targetContext.tool_diameter_mm) {
      const diamFactor = sourceContext.tool_diameter_mm / targetContext.tool_diameter_mm;
      adjustmentFactor *= Math.sqrt(diamFactor); // sub-linear due to MRR scaling
      adjustments.push({
        parameter: "tool_diameter",
        factor: Math.round(Math.sqrt(diamFactor) * 1000) / 1000,
        reason: `D ${sourceContext.tool_diameter_mm}mm -> ${targetContext.tool_diameter_mm}mm`,
      });
    }

    // Machine type adjustment
    if (sourceContext.machine_type && targetContext.machine_type &&
        sourceContext.machine_type !== targetContext.machine_type) {
      const machFactor = this.machineTypeAdjustment(sourceContext.machine_type, targetContext.machine_type);
      adjustmentFactor *= machFactor;
      adjustments.push({
        parameter: "machine_type",
        factor: machFactor,
        reason: `${sourceContext.machine_type} -> ${targetContext.machine_type}`,
      });
    }

    // Group by strategy and compute predicted performance
    const strategyGroups = new Map<string, ShopPerformanceRecord[]>();
    for (const rec of relevantRecords) {
      const g = strategyGroups.get(rec.strategy_id) ?? [];
      g.push(rec);
      strategyGroups.set(rec.strategy_id, g);
    }

    const recommendations: StrategyRecommendation[] = [];
    for (const [stratId, recs] of strategyGroups) {
      const meanCT = recs.reduce((s, r) => s + r.cycle_time_min, 0) / recs.length;
      const adjustedCT = meanCT * adjustmentFactor;
      const successRate = recs.filter(r => r.outcome === "success").length / recs.length;
      // Confidence: similarity * sample size factor * recency
      const sizeFactor = Math.min(1, Math.sqrt(recs.length / 20));
      const confidence = similarity * sizeFactor;

      recommendations.push({
        strategy_id: stratId,
        expected_cycle_time_min: Math.round(adjustedCT * 100) / 100,
        expected_success_rate: Math.round(successRate * 1000) / 1000,
        confidence: Math.round(confidence * 1000) / 1000,
        supporting_observations: recs.length,
        rationale: `Based on ${recs.length} observations with similarity ${similarity.toFixed(2)}, adjusted by factor ${adjustmentFactor.toFixed(3)}`,
      });
    }

    // Sort by expected cycle time (fastest first)
    recommendations.sort((a, b) => a.expected_cycle_time_min - b.expected_cycle_time_min);

    const bestCT = recommendations.length > 0 ? recommendations[0].expected_cycle_time_min : 0;
    const bestConfidence = recommendations.length > 0 ? recommendations[0].confidence : 0;

    log.info(`[FleetLearning] Transfer: ${relevantRecords.length} source obs, similarity=${similarity.toFixed(3)}, ${recommendations.length} strategies ranked`);

    return {
      source_context: this.contextToString(sourceContext),
      target_context: this.contextToString(targetContext),
      similarity: Math.round(similarity * 1000) / 1000,
      predicted_cycle_time_min: bestCT,
      confidence: bestConfidence,
      source_observations: relevantRecords.length,
      recommended_strategies: recommendations,
      adjustments,
      warnings,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. getFleetInsights — Fleet-level performance intelligence
  // ──────────────────────────────────────────────────────────────────────────

  getFleetInsights(
    shopData: ShopData[],
    strategy_id: string,
    material_iso: FleetIsoGroup,
    top_k: number = DEFAULT_TOP_K,
  ): FleetInsightsResult {
    const recommendations: string[] = [];

    // Aggregate for this specific strategy+material
    const stats = this.aggregateFleet(shopData, strategy_id, material_iso);
    const performance = stats.length > 0 ? stats[0] : null;

    if (!performance) {
      return {
        strategy_id,
        material_iso,
        performance: {
          strategy_id, material_iso, feature_type: "unknown",
          contributing_shops: 0, total_observations: 0,
          fleet_mean_cycle_time_min: 0, fleet_std_cycle_time_min: 0,
          fleet_mean_tool_life_min: null, fleet_mean_Ra_um: null,
          fleet_success_rate: 0, success_rate_ci_lower: 0, success_rate_ci_upper: 0,
          between_shop_variance: 0, within_shop_variance: 0, shop_estimates: [],
        },
        top_shops: [], bottom_shops: [],
        trend: "stable", data_span_days: 0,
        recommendations: ["Insufficient data for fleet insights"],
      };
    }

    // Rank shops by performance
    const sorted = [...performance.shop_estimates].sort((a, b) => a.shrunk_cycle_time - b.shrunk_cycle_time);
    const topShops = sorted.slice(0, top_k).map(s => ({
      shop_id: s.shop_id,
      mean_cycle_time: s.shrunk_cycle_time,
      success_rate: s.success_rate,
    }));
    const bottomShops = sorted.slice(-top_k).reverse().map(s => ({
      shop_id: s.shop_id,
      mean_cycle_time: s.shrunk_cycle_time,
      success_rate: s.success_rate,
    }));

    // Compute trend from timestamps
    const allRecords: ShopPerformanceRecord[] = [];
    for (const shop of shopData) {
      for (const rec of shop.records) {
        if (rec.strategy_id === strategy_id && rec.material_iso === material_iso) {
          allRecords.push(rec);
        }
      }
    }

    const trend = this.computeTrend(allRecords);

    // Data span
    const timestamps = allRecords.map(r => new Date(r.timestamp).getTime()).filter(t => !isNaN(t));
    const dataSpanDays = timestamps.length > 1
      ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 86400000)
      : 0;

    // Generate recommendations
    if (performance.between_shop_variance > performance.within_shop_variance * 2) {
      recommendations.push("High between-shop variance — investigate machine/setup differences across shops");
    }
    if (performance.fleet_success_rate < 0.85) {
      recommendations.push(`Fleet success rate ${(performance.fleet_success_rate * 100).toFixed(1)}% is below 85% target — review strategy parameters`);
    }
    if (sorted.length >= 2) {
      const bestCT = sorted[0].shrunk_cycle_time;
      const worstCT = sorted[sorted.length - 1].shrunk_cycle_time;
      if (worstCT > bestCT * 1.5) {
        recommendations.push(`${((worstCT / bestCT - 1) * 100).toFixed(0)}% cycle time gap between best and worst shops — transfer best practices from ${sorted[0].shop_id}`);
      }
    }
    if (trend === "declining") {
      recommendations.push("Performance trending downward — check for tooling degradation or material batch variation");
    }

    log.info(`[FleetLearning] Insights: ${strategy_id}/${material_iso} — ${performance.contributing_shops} shops, trend=${trend}`);

    return {
      strategy_id,
      material_iso,
      performance,
      top_shops: topShops,
      bottom_shops: bottomShops,
      trend,
      data_span_days: dataSpanDays,
      recommendations,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Wilson score interval for binomial proportion */
  private wilsonCI(p: number, n: number): { lower: number; upper: number } {
    if (n === 0) return { lower: 0, upper: 0 };
    const z = Z_95;
    const denom = 1 + z * z / n;
    const center = (p + z * z / (2 * n)) / denom;
    const margin = (z / denom) * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return {
      lower: Math.round(Math.max(0, center - margin) * 1000) / 1000,
      upper: Math.round(Math.min(1, center + margin) * 1000) / 1000,
    };
  }

  /** Compute similarity between two manufacturing contexts */
  private contextSimilarity(a: TransferContext, b: TransferContext): number {
    let score = 0;
    let dimensions = 0;

    // Feature type match (exact or partial)
    dimensions++;
    if (a.feature_type === b.feature_type) {
      score += 1.0;
    } else {
      // Partial match for related features
      const featureGroups: Record<string, string[]> = {
        "hole": ["drill_hole", "bore", "ream", "thread_hole"],
        "prismatic": ["pocket", "slot", "step", "contour"],
        "surface": ["face", "planar", "freeform"],
      };
      for (const group of Object.values(featureGroups)) {
        if (group.includes(a.feature_type) && group.includes(b.feature_type)) {
          score += 0.6;
          break;
        }
      }
    }

    // Material group match
    dimensions++;
    if (a.material_iso === b.material_iso) {
      score += 1.0;
    } else {
      // Partial match for similar groups
      const matSimilarity: Record<string, Record<string, number>> = {
        "P": { "M": 0.5, "K": 0.3, "N": 0.2, "S": 0.3, "H": 0.4 },
        "M": { "P": 0.5, "K": 0.4, "N": 0.2, "S": 0.6, "H": 0.3 },
        "K": { "P": 0.3, "M": 0.4, "N": 0.3, "S": 0.3, "H": 0.3 },
        "N": { "P": 0.2, "M": 0.2, "K": 0.3, "S": 0.2, "H": 0.1 },
        "S": { "P": 0.3, "M": 0.6, "K": 0.3, "N": 0.2, "H": 0.5 },
        "H": { "P": 0.4, "M": 0.3, "K": 0.3, "N": 0.1, "S": 0.5 },
      };
      score += (matSimilarity[a.material_iso]?.[b.material_iso] ?? 0.1);
    }

    // Tool diameter similarity (Gaussian falloff)
    dimensions++;
    const diamRatio = Math.min(a.tool_diameter_mm, b.tool_diameter_mm) / Math.max(a.tool_diameter_mm, b.tool_diameter_mm);
    score += diamRatio; // 1.0 for identical, drops for very different diameters

    // Machine type match
    if (a.machine_type && b.machine_type) {
      dimensions++;
      if (a.machine_type === b.machine_type) {
        score += 1.0;
      } else if (
        (a.machine_type === "3axis" && b.machine_type === "5axis") ||
        (a.machine_type === "5axis" && b.machine_type === "3axis")
      ) {
        score += 0.6;
      } else {
        score += 0.2;
      }
    }

    return dimensions > 0 ? score / dimensions : 0;
  }

  /** Context to human-readable string */
  private contextToString(ctx: TransferContext): string {
    const parts = [ctx.feature_type, `ISO-${ctx.material_iso}`, `D${ctx.tool_diameter_mm}mm`];
    if (ctx.machine_type) parts.push(ctx.machine_type);
    if (ctx.strategy_id) parts.push(ctx.strategy_id);
    return parts.join(" / ");
  }

  /** Material group machinability adjustment factor */
  private materialAdjustmentFactor(from: FleetIsoGroup, to: FleetIsoGroup): number {
    // Relative machinability index (P steel = 1.0 baseline)
    const machinability: Record<FleetIsoGroup, number> = {
      "P": 1.0,   // Steel
      "M": 0.65,  // Stainless steel (harder to machine)
      "K": 1.3,   // Cast iron (easier)
      "N": 1.8,   // Non-ferrous (easiest)
      "S": 0.40,  // Superalloys (hardest)
      "H": 0.55,  // Hardened steel
    };
    // If moving from easy to hard material, cycle time increases
    return machinability[from] / machinability[to];
  }

  /** Machine type adjustment factor for cycle time */
  private machineTypeAdjustment(from: string, to: string): number {
    const speed: Record<string, number> = {
      "3axis": 1.0,
      "5axis": 0.85,    // 5-axis often faster (fewer setups)
      "lathe": 0.9,
      "mill_turn": 0.8, // Mill-turn fastest (combined ops)
    };
    return (speed[from] ?? 1.0) / (speed[to] ?? 1.0);
  }

  /** Compute trend from time-series records */
  private computeTrend(records: ShopPerformanceRecord[]): "improving" | "stable" | "declining" {
    if (records.length < 6) return "stable";

    // Sort by timestamp
    const sorted = [...records].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Compare first-half average to second-half average cycle time
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const avgFirst = firstHalf.reduce((s, r) => s + r.cycle_time_min, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, r) => s + r.cycle_time_min, 0) / secondHalf.length;

    const changePct = (avgSecond - avgFirst) / avgFirst * 100;

    if (changePct < -5) return "improving";   // Cycle time decreased
    if (changePct > 5) return "declining";     // Cycle time increased
    return "stable";
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const fleetLearningStrategyEngine = new FleetLearningStrategyEngine();
