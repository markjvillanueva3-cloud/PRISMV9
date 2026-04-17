/**
 * MCAT-MS0 P3-U05: Acquisition Recommendation Engine
 *
 * Generates ranked budget, standard, and premium acquisition recommendations
 * with purchase-popup reuse, cutting-data confidence, compatibility scoring,
 * ROI calculation, payback analysis, and distributor evidence.
 *
 * Features:
 * - Three-tier recommendations (budget/standard/premium)
 * - ROI and payback period calculations
 * - Compatibility scoring with existing equipment
 * - Cutting-data confidence from manufacturer specs
 * - Distributor availability and pricing
 * - Purchase history and reuse tracking
 *
 * @module engines/AcquisitionRecommendationEngine
 * @milestone MCAT-MS0/P3-U05
 */

import { log } from "../utils/Logger.js";
import {
  machineConsumerBindingEngine,
  type BoundMachineContext,
} from "./MachineConsumerBindingEngine.js";
import { calculatorPRISMModeEngine } from "./CalculatorPRISMModeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type PriceTier = "budget" | "standard" | "premium";

export interface AcquisitionInput {
  /** Machine ID for compatibility check */
  machine_id: string;
  /** Category of item to acquire */
  category: "tooling" | "holder" | "coolant" | "software" | "accessory";
  /** Specific item type needed */
  item_type: string;
  /** Operation context */
  operation_type?: string;
  /** Material ISO group */
  material_iso_group?: string;
  /** Budget constraint (max price) */
  max_budget?: number;
  /** Preferred brands */
  preferred_brands?: string[];
  /** Exclude items already owned */
  exclude_owned?: string[];
}

export interface AcquisitionRecommendation {
  /** Unique recommendation ID */
  id: string;
  /** Price tier */
  tier: PriceTier;
  /** Item category */
  category: string;
  /** Item name */
  name: string;
  /** Manufacturer/brand */
  brand: string;
  /** Model/part number */
  model: string;
  /** Unit price */
  price: number;
  /** Currency */
  currency: string;
  /** Compatibility score (0-100) */
  compatibility_score: number;
  /** Cutting data confidence (0-1) */
  cutting_data_confidence: number;
  /** ROI analysis */
  roi: {
    estimated_savings_per_year: number;
    payback_months: number;
    roi_percentage: number;
  };
  /** Why this is recommended */
  reason: string;
  /** Key features */
  features: string[];
  /** Distributor info */
  distributor: {
    name: string;
    availability: "in_stock" | "ships_1_week" | "ships_2_weeks" | "backorder";
    lead_time_days: number;
  };
  /** Purchase popup reuse (previous similar purchases) */
  purchase_history?: {
    last_purchased?: string;
    quantity_owned: number;
    reorder_recommended: boolean;
  };
}

export interface TieredRecommendations {
  machine_id: string;
  category: string;
  item_type: string;
  budget: AcquisitionRecommendation[];
  standard: AcquisitionRecommendation[];
  premium: AcquisitionRecommendation[];
  best_value: AcquisitionRecommendation | null;
  best_performance: AcquisitionRecommendation | null;
  comparison_notes: string[];
}

export interface ROICalculation {
  item_cost: number;
  annual_usage_hours: number;
  productivity_gain_pct: number;
  tool_life_improvement_pct: number;
  estimated_savings: number;
  payback_months: number;
  roi_3_year: number;
}

export interface DistributorInfo {
  name: string;
  website?: string;
  phone?: string;
  availability: "in_stock" | "ships_1_week" | "ships_2_weeks" | "backorder";
  price: number;
  lead_time_days: number;
  minimum_order?: number;
}

export interface AcquisitionStats {
  total_recommendations: number;
  by_tier: Record<PriceTier, number>;
  average_roi: number;
  last_calculation: string;
}

// ============================================================================
// CATALOG DATA (simplified for demonstration)
// ============================================================================

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  tier: PriceTier;
  price: number;
  category: string;
  item_type: string;
  features: string[];
  cutting_data_confidence: number;
  compatible_with: string[];
  distributor: string;
  availability: "in_stock" | "ships_1_week" | "ships_2_weeks" | "backorder";
}

const TOOLING_CATALOG: CatalogItem[] = [
  // Budget tier
  { id: "tool-b1", name: "Economy End Mill 4-Flute", brand: "Generic", model: "EM4F-12", tier: "budget", price: 25, category: "tooling", item_type: "end_mill", features: ["Uncoated", "General purpose"], cutting_data_confidence: 0.6, compatible_with: ["mill", "vmc"], distributor: "MSC", availability: "in_stock" },
  { id: "tool-b2", name: "Standard Drill Bit Set", brand: "Chicago-Latrobe", model: "DBS-135", tier: "budget", price: 45, category: "tooling", item_type: "drill", features: ["HSS", "135° split point"], cutting_data_confidence: 0.7, compatible_with: ["mill", "vmc", "lathe"], distributor: "Grainger", availability: "in_stock" },
  { id: "tool-b3", name: "Basic Turning Insert CNMG", brand: "Korloy", model: "CNMG120408-VM", tier: "budget", price: 8, category: "tooling", item_type: "turning_insert", features: ["CVD coated", "General steel"], cutting_data_confidence: 0.65, compatible_with: ["lathe"], distributor: "MSC", availability: "in_stock" },

  // Standard tier
  { id: "tool-s1", name: "Performance End Mill TiAlN", brand: "OSG", model: "EXOCARB-WXL", tier: "standard", price: 85, category: "tooling", item_type: "end_mill", features: ["TiAlN coating", "Variable helix", "High-speed"], cutting_data_confidence: 0.85, compatible_with: ["mill", "vmc"], distributor: "MSC", availability: "in_stock" },
  { id: "tool-s2", name: "Solid Carbide Drill", brand: "Guhring", model: "RT100U", tier: "standard", price: 120, category: "tooling", item_type: "drill", features: ["Through coolant", "TiAlN", "140°"], cutting_data_confidence: 0.88, compatible_with: ["mill", "vmc"], distributor: "KBC Tools", availability: "ships_1_week" },
  { id: "tool-s3", name: "Premium Turning Insert", brand: "Sandvik", model: "CNMG120408-PM", tier: "standard", price: 18, category: "tooling", item_type: "turning_insert", features: ["PVD coated", "Wiper geometry"], cutting_data_confidence: 0.9, compatible_with: ["lathe"], distributor: "Sandvik", availability: "in_stock" },

  // Premium tier
  { id: "tool-p1", name: "Aerospace End Mill", brand: "Kennametal", model: "HARVI-III", tier: "premium", price: 250, category: "tooling", item_type: "end_mill", features: ["Nano-coating", "Chip breaker", "Titanium optimized"], cutting_data_confidence: 0.95, compatible_with: ["mill", "vmc"], distributor: "Kennametal", availability: "ships_1_week" },
  { id: "tool-p2", name: "High-Performance Drill", brand: "Walter", model: "DC170-Supreme", tier: "premium", price: 280, category: "tooling", item_type: "drill", features: ["Through coolant", "Nano-A coating", "Self-centering"], cutting_data_confidence: 0.95, compatible_with: ["mill", "vmc"], distributor: "Walter", availability: "ships_1_week" },
  { id: "tool-p3", name: "CBN Turning Insert", brand: "Sumitomo", model: "BNC200", tier: "premium", price: 85, category: "tooling", item_type: "turning_insert", features: ["CBN", "Hardened steel", "Mirror finish"], cutting_data_confidence: 0.92, compatible_with: ["lathe"], distributor: "Sumitomo", availability: "ships_2_weeks" },
];

const HOLDER_CATALOG: CatalogItem[] = [
  { id: "hold-b1", name: "ER Collet Chuck", brand: "Techniks", model: "ER32-BT40", tier: "budget", price: 95, category: "holder", item_type: "collet_chuck", features: ["ER32", "BT40 taper"], cutting_data_confidence: 0.7, compatible_with: ["mill", "vmc"], distributor: "MSC", availability: "in_stock" },
  { id: "hold-s1", name: "Hydraulic Chuck", brand: "Schunk", model: "TENDO-E", tier: "standard", price: 450, category: "holder", item_type: "hydraulic", features: ["<3µm TIR", "Balanced G2.5"], cutting_data_confidence: 0.9, compatible_with: ["mill", "vmc"], distributor: "Schunk", availability: "in_stock" },
  { id: "hold-p1", name: "Shrink Fit Holder", brand: "Haimer", model: "Power-Shrink", tier: "premium", price: 380, category: "holder", item_type: "shrink_fit", features: ["<1µm TIR", "G2.5@25000RPM"], cutting_data_confidence: 0.95, compatible_with: ["mill", "vmc"], distributor: "Haimer", availability: "ships_1_week" },
];

const DISTRIBUTOR_INFO: Record<string, Omit<DistributorInfo, "price" | "availability" | "lead_time_days">> = {
  MSC: { name: "MSC Industrial", website: "mscdirect.com", phone: "800-645-7270" },
  Grainger: { name: "Grainger", website: "grainger.com", phone: "800-472-4643" },
  Kennametal: { name: "Kennametal Direct", website: "kennametal.com" },
  Sandvik: { name: "Sandvik Coromant", website: "sandvik.coromant.com" },
  "KBC Tools": { name: "KBC Tools", website: "kbctools.com" },
  Schunk: { name: "Schunk", website: "schunk.com" },
  Haimer: { name: "Haimer USA", website: "haimer-usa.com" },
  Walter: { name: "Walter Tools", website: "walter-tools.com" },
  Sumitomo: { name: "Sumitomo Electric", website: "sumitool.com" },
};

// ============================================================================
// ENGINE
// ============================================================================

class AcquisitionRecommendationEngine {
  private statsCache: AcquisitionStats = {
    total_recommendations: 0,
    by_tier: { budget: 0, standard: 0, premium: 0 },
    average_roi: 0,
    last_calculation: "never",
  };

  private purchaseHistory = new Map<string, { last_purchased: string; quantity: number }>();

  /**
   * Get tiered acquisition recommendations.
   */
  getRecommendations(input: AcquisitionInput): TieredRecommendations | null {
    const binding = machineConsumerBindingEngine.bind(input.machine_id);
    if (!binding.success || !binding.context) {
      log.warn(`[AcquisitionRecommendation] No binding for ${input.machine_id}`);
      return null;
    }

    const ctx = binding.context;
    const catalog = this.getCatalogForCategory(input.category);

    // Filter by item type and compatibility
    const compatible = catalog.filter(item => {
      if (item.item_type !== input.item_type && input.item_type !== "any") {
        return false;
      }
      if (!this.isCompatible(item, ctx)) {
        return false;
      }
      if (input.max_budget && item.price > input.max_budget) {
        return false;
      }
      if (input.exclude_owned?.includes(item.id)) {
        return false;
      }
      return true;
    });

    // Generate recommendations by tier
    const budget = this.buildRecommendations(
      compatible.filter(i => i.tier === "budget"),
      ctx, input
    );
    const standard = this.buildRecommendations(
      compatible.filter(i => i.tier === "standard"),
      ctx, input
    );
    const premium = this.buildRecommendations(
      compatible.filter(i => i.tier === "premium"),
      ctx, input
    );

    // Find best value and best performance
    const allRecs = [...budget, ...standard, ...premium];
    const bestValue = this.findBestValue(allRecs);
    const bestPerformance = this.findBestPerformance(allRecs);

    // Generate comparison notes
    const notes = this.generateComparisonNotes(budget, standard, premium);

    // Update stats
    this.updateStats(allRecs);

    return {
      machine_id: input.machine_id,
      category: input.category,
      item_type: input.item_type,
      budget,
      standard,
      premium,
      best_value: bestValue,
      best_performance: bestPerformance,
      comparison_notes: notes,
    };
  }

  /**
   * Get single best recommendation for quick purchase.
   */
  getBestRecommendation(input: AcquisitionInput): AcquisitionRecommendation | null {
    const recs = this.getRecommendations(input);
    if (!recs) return null;

    // Prefer best value, fall back to standard tier
    return recs.best_value || recs.standard[0] || recs.budget[0] || null;
  }

  /**
   * Calculate ROI for a specific item.
   */
  calculateROI(input: {
    item_cost: number;
    annual_usage_hours: number;
    hourly_rate: number;
    productivity_gain_pct: number;
    tool_life_improvement_pct: number;
  }): ROICalculation {
    const productivitySavings = input.annual_usage_hours * input.hourly_rate *
      (input.productivity_gain_pct / 100);
    const toolLifeSavings = input.item_cost * (input.tool_life_improvement_pct / 100) * 2;
    const totalSavings = productivitySavings + toolLifeSavings;

    const paybackMonths = totalSavings > 0
      ? Math.ceil((input.item_cost / totalSavings) * 12)
      : 999;

    const roi3Year = totalSavings > 0
      ? ((totalSavings * 3 - input.item_cost) / input.item_cost) * 100
      : 0;

    return {
      item_cost: input.item_cost,
      annual_usage_hours: input.annual_usage_hours,
      productivity_gain_pct: input.productivity_gain_pct,
      tool_life_improvement_pct: input.tool_life_improvement_pct,
      estimated_savings: totalSavings,
      payback_months: paybackMonths,
      roi_3_year: Math.round(roi3Year),
    };
  }

  /**
   * Get distributor information for an item.
   */
  getDistributorInfo(item_id: string): DistributorInfo | null {
    const allItems = [...TOOLING_CATALOG, ...HOLDER_CATALOG];
    const item = allItems.find(i => i.id === item_id);
    if (!item) return null;

    const distInfo = DISTRIBUTOR_INFO[item.distributor];
    if (!distInfo) return null;

    return {
      ...distInfo,
      price: item.price,
      availability: item.availability,
      lead_time_days: this.getLeadTimeDays(item.availability),
    };
  }

  /**
   * Record a purchase for history tracking.
   */
  recordPurchase(item_id: string, quantity: number): void {
    const existing = this.purchaseHistory.get(item_id);
    this.purchaseHistory.set(item_id, {
      last_purchased: new Date().toISOString(),
      quantity: (existing?.quantity || 0) + quantity,
    });
    log.info(`[AcquisitionRecommendation] Recorded purchase: ${item_id} x${quantity}`);
  }

  /**
   * Get purchase history for an item.
   */
  getPurchaseHistory(item_id: string): { last_purchased?: string; quantity: number } | null {
    return this.purchaseHistory.get(item_id) || null;
  }

  /**
   * Compare multiple items side by side.
   */
  compareItems(item_ids: string[]): {
    items: (CatalogItem & { roi: ROICalculation })[];
    winner: string;
    reason: string;
  } | null {
    const allItems = [...TOOLING_CATALOG, ...HOLDER_CATALOG];
    const items = item_ids
      .map(id => allItems.find(i => i.id === id))
      .filter((i): i is CatalogItem => i !== undefined);

    if (items.length === 0) return null;

    const withROI = items.map(item => ({
      ...item,
      roi: this.calculateROI({
        item_cost: item.price,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: this.estimateProductivityGain(item),
        tool_life_improvement_pct: this.estimateToolLifeImprovement(item),
      }),
    }));

    // Winner is best ROI
    const sorted = withROI.sort((a, b) => b.roi.roi_3_year - a.roi.roi_3_year);
    const winner = sorted[0];

    return {
      items: withROI,
      winner: winner.id,
      reason: `${winner.name} offers best 3-year ROI of ${winner.roi.roi_3_year}% with ${winner.roi.payback_months} month payback`,
    };
  }

  /**
   * Get statistics.
   */
  getStats(): AcquisitionStats {
    return { ...this.statsCache };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getCatalogForCategory(category: string): CatalogItem[] {
    switch (category) {
      case "tooling": return TOOLING_CATALOG;
      case "holder": return HOLDER_CATALOG;
      default: return TOOLING_CATALOG;
    }
  }

  private isCompatible(item: CatalogItem, ctx: BoundMachineContext): boolean {
    const machineType = ctx.machine_type.toLowerCase();
    return item.compatible_with.some(c =>
      machineType.includes(c) || c.includes(machineType)
    );
  }

  private buildRecommendations(
    items: CatalogItem[],
    ctx: BoundMachineContext,
    input: AcquisitionInput
  ): AcquisitionRecommendation[] {
    return items.map(item => {
      const compatScore = this.calculateCompatibilityScore(item, ctx);
      const roi = this.calculateROI({
        item_cost: item.price,
        annual_usage_hours: 500,
        hourly_rate: ctx.machine_rate_per_hour,
        productivity_gain_pct: this.estimateProductivityGain(item),
        tool_life_improvement_pct: this.estimateToolLifeImprovement(item),
      });

      const history = this.purchaseHistory.get(item.id);

      return {
        id: item.id,
        tier: item.tier,
        category: item.category,
        name: item.name,
        brand: item.brand,
        model: item.model,
        price: item.price,
        currency: "USD",
        compatibility_score: compatScore,
        cutting_data_confidence: item.cutting_data_confidence,
        roi: {
          estimated_savings_per_year: roi.estimated_savings,
          payback_months: roi.payback_months,
          roi_percentage: roi.roi_3_year,
        },
        reason: this.generateReason(item, ctx, input),
        features: item.features,
        distributor: {
          name: DISTRIBUTOR_INFO[item.distributor]?.name || item.distributor,
          availability: item.availability,
          lead_time_days: this.getLeadTimeDays(item.availability),
        },
        purchase_history: history ? {
          last_purchased: history.last_purchased,
          quantity_owned: history.quantity,
          reorder_recommended: history.quantity < 3,
        } : undefined,
      };
    }).sort((a, b) => b.compatibility_score - a.compatibility_score);
  }

  private calculateCompatibilityScore(item: CatalogItem, ctx: BoundMachineContext): number {
    let score = 70; // Base score

    // Machine type compatibility
    const machineType = ctx.machine_type.toLowerCase();
    if (item.compatible_with.includes(machineType)) {
      score += 15;
    }

    // RPM compatibility for high-speed items
    if (item.features.some(f => f.toLowerCase().includes("high-speed"))) {
      if (ctx.spindle.max_rpm > 12000) score += 10;
      else score -= 10;
    }

    // Cutting data confidence bonus
    score += item.cutting_data_confidence * 5;

    return Math.min(100, Math.max(0, score));
  }

  private generateReason(
    item: CatalogItem,
    ctx: BoundMachineContext,
    input: AcquisitionInput
  ): string {
    const reasons: string[] = [];

    if (item.tier === "budget") {
      reasons.push("Cost-effective option for general use");
    } else if (item.tier === "standard") {
      reasons.push("Balanced performance and value");
    } else {
      reasons.push("Maximum performance for demanding applications");
    }

    if (item.cutting_data_confidence > 0.85) {
      reasons.push("manufacturer-verified cutting data");
    }

    if (item.availability === "in_stock") {
      reasons.push("immediately available");
    }

    return reasons.join("; ");
  }

  private findBestValue(recs: AcquisitionRecommendation[]): AcquisitionRecommendation | null {
    if (recs.length === 0) return null;

    // Best value = highest (compatibility * ROI) / price
    return recs.reduce((best, curr) => {
      const bestScore = (best.compatibility_score * best.roi.roi_percentage) / best.price;
      const currScore = (curr.compatibility_score * curr.roi.roi_percentage) / curr.price;
      return currScore > bestScore ? curr : best;
    });
  }

  private findBestPerformance(recs: AcquisitionRecommendation[]): AcquisitionRecommendation | null {
    if (recs.length === 0) return null;

    // Best performance = highest cutting_data_confidence + compatibility
    return recs.reduce((best, curr) => {
      const bestScore = best.cutting_data_confidence * 50 + best.compatibility_score;
      const currScore = curr.cutting_data_confidence * 50 + curr.compatibility_score;
      return currScore > bestScore ? curr : best;
    });
  }

  private generateComparisonNotes(
    budget: AcquisitionRecommendation[],
    standard: AcquisitionRecommendation[],
    premium: AcquisitionRecommendation[]
  ): string[] {
    const notes: string[] = [];

    if (budget.length > 0 && premium.length > 0) {
      const priceDiff = premium[0].price - budget[0].price;
      const roiDiff = premium[0].roi.roi_percentage - budget[0].roi.roi_percentage;
      notes.push(`Premium tier costs $${priceDiff} more but offers ${roiDiff}% higher ROI`);
    }

    if (standard.length > 0) {
      const avgPayback = standard.reduce((s, r) => s + r.roi.payback_months, 0) / standard.length;
      notes.push(`Standard tier average payback: ${Math.round(avgPayback)} months`);
    }

    const inStock = [...budget, ...standard, ...premium]
      .filter(r => r.distributor.availability === "in_stock").length;
    notes.push(`${inStock} options available for immediate shipping`);

    return notes;
  }

  private getLeadTimeDays(availability: string): number {
    switch (availability) {
      case "in_stock": return 2;
      case "ships_1_week": return 7;
      case "ships_2_weeks": return 14;
      case "backorder": return 30;
      default: return 7;
    }
  }

  private estimateProductivityGain(item: CatalogItem): number {
    if (item.tier === "premium") return 15;
    if (item.tier === "standard") return 8;
    return 3;
  }

  private estimateToolLifeImprovement(item: CatalogItem): number {
    if (item.tier === "premium") return 40;
    if (item.tier === "standard") return 20;
    return 5;
  }

  private updateStats(recs: AcquisitionRecommendation[]): void {
    const byTier = { budget: 0, standard: 0, premium: 0 };
    let totalROI = 0;

    for (const rec of recs) {
      byTier[rec.tier]++;
      totalROI += rec.roi.roi_percentage;
    }

    this.statsCache = {
      total_recommendations: recs.length,
      by_tier: byTier,
      average_roi: recs.length > 0 ? Math.round(totalROI / recs.length) : 0,
      last_calculation: new Date().toISOString(),
    };
  }

  /**
   * Self-awareness metadata.
   */
  getSelfAwareness() {
    return {
      engine: "AcquisitionRecommendationEngine",
      milestone: "MCAT-MS0/P3-U05",
      purpose: "Generates tiered acquisition recommendations with ROI analysis",
      capabilities: [
        "getRecommendations",
        "getBestRecommendation",
        "calculateROI",
        "getDistributorInfo",
        "recordPurchase",
        "compareItems",
        "getStats",
      ],
      tiers: ["budget", "standard", "premium"],
      categories: ["tooling", "holder", "coolant", "software", "accessory"],
      integrations: [
        "MachineConsumerBindingEngine",
        "CalculatorPRISMModeEngine",
      ],
    };
  }
}

export const acquisitionRecommendationEngine = new AcquisitionRecommendationEngine();
