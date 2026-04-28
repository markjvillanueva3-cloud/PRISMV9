/**
 * LathePartFamilyPlanningEngine (E110)
 * =====================================
 *
 * Predicts the likelihood that a given part will spawn a family of similar
 * parts over time, based on customer industry patterns and archive history.
 * Recommends an upfront investment level (none / macro / template /
 * full_family_program) and quantifies ROI via the cost model (E109).
 *
 * Decision factors:
 *   - Customer industry (fasteners = high repeat; aerospace one-off = low repeat)
 *   - Existing similar programs for that customer (LatheProgramCatalogEngine)
 *   - Revision history heuristic
 *   - Current lot size + stated family_parts_expected
 *
 * API:
 *   - analyzeFamilyPotential(partSpec, customer) → FamilyPlanningResult
 *   - recommendInvestment(familyLikelihood, lotSize) → InvestmentLevel
 *   - computeMacroROI(partSpec, macroInvestmentHr) → MacroROIResult
 *
 * Leverages:
 *   - LatheProgramCatalogEngine — customer history + program count
 *   - LatheProgrammingCostEngine — break-even + cost calculations
 *
 * @module engines/LathePartFamilyPlanningEngine
 * @milestone LATHE-AWARE-HARDEN MS12 (U-LAT83-U-LAT87)
 * @version 1.0.0
 */

import { latheProgramCatalogEngine } from "./LatheProgramCatalogEngine.js";
import { latheProgrammingCostEngine } from "./LatheProgrammingCostEngine.js";
import type { PartComplexity } from "./LatheProgrammingStyleSelectorEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type CustomerIndustry =
  | "fasteners"
  | "automotive"
  | "medical"
  | "aerospace"
  | "energy"
  | "defense"
  | "general_machining"
  | "unknown";

export type InvestmentLevel =
  | "none"
  | "macro"
  | "template"
  | "full_family_program";

export interface FamilyPartSpec {
  part_family?: string;
  part_complexity: PartComplexity;
  lot_size: number;
  family_parts_expected?: number;
  features?: string[];
  material?: string;
  variable_dimensions?: string[]; // e.g. ["OD", "length", "thread_pitch"]
}

export interface FamilyPlanningResult {
  family_likelihood: number; // 0..1
  recommended_investment: InvestmentLevel;
  roi_estimate: {
    breakeven_quantity: number | null;
    year_1_savings: number;
    net_present_value_year_1: number;
  };
  template_recommendations: string[];
  variable_dimensions: string[];
  reasoning: string[];
  customer: string;
  industry: CustomerIndustry;
  archive_evidence: {
    customer_program_count: number;
    similar_programs_found: number;
    most_common_style: string | null;
  };
}

export interface MacroROIResult {
  macro_investment_hr: number;
  breakeven_quantity: number | null;
  year_1_savings_usd: number;
  three_year_savings_usd: number;
  roi_percent_year_1: number;
  recommendation: string;
}

// ── Customer Industry Heuristic Table ──────────────────────────────────────

/**
 * Baseline repeat likelihood per industry. These numbers reflect typical
 * job-shop patterns from the JM Die archive (fastener industry → high repeat,
 * aerospace prototypes → low repeat).
 */
const INDUSTRY_REPEAT_SCORE: Record<CustomerIndustry, number> = {
  fasteners: 0.85,
  automotive: 0.7,
  medical: 0.65,
  defense: 0.5,
  energy: 0.55,
  aerospace: 0.35,
  general_machining: 0.4,
  unknown: 0.4,
};

/**
 * Keyword → industry mapping used when we don't have explicit customer data.
 * Matches against customer name tokens.
 */
const CUSTOMER_NAME_HINTS: Array<{ pattern: RegExp; industry: CustomerIndustry }> = [
  { pattern: /\b(fastenal|holo.?krome|itw|alcoa|optimas|sfs|textron|acument)\b/i, industry: "fasteners" },
  { pattern: /\b(gm|ford|toyota|honda|bosch|magna|stellantis|mahle)\b/i, industry: "automotive" },
  { pattern: /\b(medtronic|stryker|zimmer|abbott|j&j|biomet|smith.?nephew)\b/i, industry: "medical" },
  { pattern: /\b(boeing|lockheed|spirit|northrop|pratt|rolls.?royce|ge.?aviation)\b/i, industry: "aerospace" },
  { pattern: /\b(chevron|bp|halliburton|shlumberger|baker.?hughes|cat|caterpillar)\b/i, industry: "energy" },
  { pattern: /\b(raytheon|general.?dynamics|bae|dod|saic)\b/i, industry: "defense" },
];

// Known JM Die customer industry (canonical test shop — all fasteners)
const JM_DIE_CUSTOMERS_FASTENERS = new Set(
  ["alcoa", "itw", "fastenal", "holo-krome", "optimas", "sfs", "textron"].map(
    (s) => s.toLowerCase()
  )
);

// ── Engine Implementation ──────────────────────────────────────────────────

class LathePartFamilyPlanningEngineImpl {
  /**
   * Analyze family potential for a part spec + customer.
   *
   * @param partSpec Part description (complexity, lot, features)
   * @param customer Customer name (or folder name)
   * @returns Structured family-planning recommendation
   */
  analyzeFamilyPotential(
    partSpec: FamilyPartSpec,
    customer: string
  ): FamilyPlanningResult {
    const industry = this.detectIndustry(customer);
    const archive = this.queryArchive(customer, partSpec);
    const likelihood = this.computeFamilyLikelihood(partSpec, industry, archive);

    const investment = this.recommendInvestment(
      likelihood,
      partSpec.lot_size,
      partSpec.family_parts_expected ?? 1
    );

    const roi = this.estimateROI(partSpec, investment, likelihood);

    const reasoning = this.buildReasoning(partSpec, industry, archive, likelihood, investment);
    const templates = this.suggestTemplates(partSpec, archive);
    const varDims = this.extractVariableDimensions(partSpec);

    return {
      family_likelihood: round3(likelihood),
      recommended_investment: investment,
      roi_estimate: {
        breakeven_quantity: roi.breakeven_quantity,
        year_1_savings: round2(roi.year_1_savings_usd),
        net_present_value_year_1: round2(roi.year_1_savings_usd * 0.95), // 5% discount
      },
      template_recommendations: templates,
      variable_dimensions: varDims,
      reasoning,
      customer,
      industry,
      archive_evidence: {
        customer_program_count: archive.program_count,
        similar_programs_found: archive.similar_count,
        most_common_style: archive.most_common_style,
      },
    };
  }

  /**
   * Recommend an investment level based on family likelihood, lot size,
   * and expected family variants.
   */
  recommendInvestment(
    familyLikelihood: number,
    lotSize: number,
    familyPartsExpected: number
  ): InvestmentLevel {
    // Hard floor: below 0.3 likelihood, never invest
    if (familyLikelihood < 0.3) return "none";

    // Full family program only when future parts are explicitly expected
    if (familyPartsExpected >= 5 && familyLikelihood >= 0.75) {
      return "full_family_program";
    }
    // Template for medium-family expectation OR high likelihood + moderate lot
    if (familyPartsExpected >= 3 || (familyLikelihood >= 0.65 && lotSize >= 20)) {
      return "template";
    }
    // Macro for moderate-likelihood one-off with lot amortization potential
    if (familyLikelihood >= 0.5 || lotSize >= 50) {
      return "macro";
    }
    return "none";
  }

  /**
   * Compute macro ROI for a given part spec and investment amount.
   *
   * @param partSpec Part description
   * @param macroInvestmentHr Additional upfront programming time vs hardcode
   * @param customer Customer name (used for family likelihood)
   */
  computeMacroROI(
    partSpec: FamilyPartSpec,
    macroInvestmentHr: number,
    customer = "unknown"
  ): MacroROIResult {
    const industry = this.detectIndustry(customer);
    const archive = this.queryArchive(customer, partSpec);
    const likelihood = this.computeFamilyLikelihood(partSpec, industry, archive);
    const roi = this.estimateROI(
      partSpec,
      this.recommendInvestment(likelihood, partSpec.lot_size, partSpec.family_parts_expected ?? 1),
      likelihood,
      macroInvestmentHr
    );

    const roiPct =
      roi.base_macro_cost === 0
        ? 0
        : (roi.year_1_savings_usd / roi.base_macro_cost) * 100;

    const recommendation = this.formatROIRecommendation(
      roi.breakeven_quantity,
      roi.year_1_savings_usd,
      likelihood
    );

    return {
      macro_investment_hr: macroInvestmentHr,
      breakeven_quantity: roi.breakeven_quantity,
      year_1_savings_usd: round2(roi.year_1_savings_usd),
      three_year_savings_usd: round2(roi.year_1_savings_usd * 3 * likelihood),
      roi_percent_year_1: round2(roiPct),
      recommendation,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private detectIndustry(customer: string): CustomerIndustry {
    if (!customer || customer.trim().length === 0) return "unknown";
    const lower = customer.toLowerCase();

    // JM Die customer — fasteners
    for (const fastenerCust of JM_DIE_CUSTOMERS_FASTENERS) {
      if (lower.includes(fastenerCust)) return "fasteners";
    }

    for (const hint of CUSTOMER_NAME_HINTS) {
      if (hint.pattern.test(customer)) return hint.industry;
    }

    return "unknown";
  }

  private queryArchive(
    customer: string,
    partSpec: FamilyPartSpec
  ): {
    program_count: number;
    similar_count: number;
    most_common_style: string | null;
  } {
    let program_count = 0;
    let similar_count = 0;
    let most_common_style: string | null = null;

    try {
      const history = latheProgramCatalogEngine.getProgrammingHistory(customer);
      program_count = history.program_count;
      most_common_style = history.most_common_style;

      const similar = latheProgramCatalogEngine.findSimilarPrograms(
        {
          customer,
          part_family: partSpec.part_family,
          features: partSpec.features,
          part_complexity: partSpec.part_complexity,
        },
        100
      );
      similar_count = similar.length;
    } catch {
      // Catalog may be empty in fresh sessions — treat as no evidence
    }

    return { program_count, similar_count, most_common_style };
  }

  private computeFamilyLikelihood(
    partSpec: FamilyPartSpec,
    industry: CustomerIndustry,
    archive: { program_count: number; similar_count: number }
  ): number {
    let score = INDUSTRY_REPEAT_SCORE[industry];

    // Boost from archive history (existing similar programs = higher repeat likelihood)
    if (archive.similar_count >= 10) score += 0.1;
    else if (archive.similar_count >= 3) score += 0.05;

    if (archive.program_count >= 50) score += 0.05;

    // Boost from explicit family_parts_expected
    const expected = partSpec.family_parts_expected ?? 1;
    if (expected >= 10) score += 0.1;
    else if (expected >= 3) score += 0.05;

    // Boost from lot size (recurring large lots → likely repeat work)
    if (partSpec.lot_size >= 100) score += 0.05;

    // Penalty for very_complex (usually one-off prototypes)
    if (partSpec.part_complexity === "very_complex") score -= 0.1;

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, score));
  }

  private estimateROI(
    partSpec: FamilyPartSpec,
    investment: InvestmentLevel,
    familyLikelihood: number,
    macroInvestmentHrOverride?: number
  ): {
    breakeven_quantity: number | null;
    year_1_savings_usd: number;
    base_macro_cost: number;
  } {
    if (investment === "none") {
      return { breakeven_quantity: null, year_1_savings_usd: 0, base_macro_cost: 0 };
    }

    const macroInvestmentHr = macroInvestmentHrOverride ?? this.defaultInvestmentHours(investment);
    const lotSizes = [10, 50, 100, 200, 500];
    const analysis = latheProgrammingCostEngine.breakEvenAnalysis(
      macroInvestmentHr,
      lotSizes,
      partSpec.part_complexity
    );

    const breakeven = analysis.break_even_lot_size;

    // Year 1 savings = expected annual lot × savings per lot at current lot size
    // Assumption: customer runs the family ~3-6x/year based on likelihood
    const annualRepeats = Math.round(3 + familyLikelihood * 6);
    const currentLotPoint = analysis.points.find((p) => p.lot_size === 100) ?? analysis.points[0]!;
    const savings_per_run = Math.max(0, currentLotPoint.macro_savings);
    const year_1_savings_usd = savings_per_run * annualRepeats * familyLikelihood;

    const base_macro_cost = latheProgrammingCostEngine.estimateProgrammingCost(
      "macro",
      partSpec.part_complexity,
      partSpec.lot_size
    ).total_cost;

    return { breakeven_quantity: breakeven, year_1_savings_usd, base_macro_cost };
  }

  private defaultInvestmentHours(investment: InvestmentLevel): number {
    switch (investment) {
      case "none":
        return 0;
      case "macro":
        return 2;
      case "template":
        return 4;
      case "full_family_program":
        return 8;
    }
  }

  private buildReasoning(
    partSpec: FamilyPartSpec,
    industry: CustomerIndustry,
    archive: { program_count: number; similar_count: number; most_common_style: string | null },
    likelihood: number,
    investment: InvestmentLevel
  ): string[] {
    const reasons: string[] = [];
    reasons.push(
      `Industry "${industry}" has baseline repeat score ${INDUSTRY_REPEAT_SCORE[industry].toFixed(2)}`
    );
    if (industry === "fasteners") {
      reasons.push("Fastener industry typically runs recurring part families — macro/template investment pays off quickly");
    }
    if (industry === "aerospace" && likelihood < 0.5) {
      reasons.push("Aerospace often runs one-off prototypes — low repeat likelihood");
    }
    if (archive.program_count > 0) {
      reasons.push(`Customer has ${archive.program_count} existing programs in archive`);
    }
    if (archive.similar_count >= 3) {
      reasons.push(`${archive.similar_count} similar programs found — strong family signal`);
    }
    if (archive.most_common_style) {
      reasons.push(`Customer's most common programming style is "${archive.most_common_style}"`);
    }
    if ((partSpec.family_parts_expected ?? 1) >= 3) {
      reasons.push(`Customer explicitly expects ${partSpec.family_parts_expected} family variants`);
    }
    reasons.push(`Family likelihood: ${round3(likelihood)} → recommendation: ${investment}`);
    return reasons;
  }

  private suggestTemplates(
    partSpec: FamilyPartSpec,
    archive: { most_common_style: string | null }
  ): string[] {
    const templates: string[] = [];
    if (partSpec.features?.includes("threading")) {
      templates.push("Threading macro (variable pitch + length)");
    }
    if (partSpec.features?.includes("grooving")) {
      templates.push("Parametric groove (width, depth, position)");
    }
    if (partSpec.features?.includes("boring")) {
      templates.push("Boring bar macro (depth + ID)");
    }
    if (archive.most_common_style === "cam") {
      templates.push("CAM strategy template (copy existing + update geometry)");
    }
    if (archive.most_common_style === "macro") {
      templates.push("Extend existing macro library with new variant");
    }
    if (templates.length === 0) {
      templates.push("Generic family template with OD/length parameters");
    }
    return templates;
  }

  private extractVariableDimensions(partSpec: FamilyPartSpec): string[] {
    if (partSpec.variable_dimensions && partSpec.variable_dimensions.length > 0) {
      return partSpec.variable_dimensions;
    }
    // Infer from features
    const dims: string[] = ["OD", "length"];
    if (partSpec.features?.includes("threading")) dims.push("thread_pitch", "thread_length");
    if (partSpec.features?.includes("grooving")) dims.push("groove_width", "groove_depth");
    if (partSpec.features?.includes("boring")) dims.push("bore_ID", "bore_depth");
    return dims;
  }

  private formatROIRecommendation(
    breakeven: number | null,
    year_1_savings: number,
    likelihood: number
  ): string {
    if (likelihood < 0.3) {
      return "Low family likelihood — skip macro investment and hardcode this one-off";
    }
    if (breakeven === null) {
      return `Macro does not break even in analyzed range (likelihood ${round3(likelihood)}). Consider only if customer patterns change.`;
    }
    if (year_1_savings > 1000) {
      return `Strong ROI: macro saves ~$${round2(year_1_savings)}/yr at likelihood ${round3(likelihood)}. Invest.`;
    }
    if (year_1_savings > 0) {
      return `Marginal ROI: $${round2(year_1_savings)}/yr at likelihood ${round3(likelihood)}. Consider if programmer has capacity.`;
    }
    return `Weak ROI: investment unlikely to pay off at current lot pattern.`;
  }

  /**
   * Lightweight stats for dispatcher status endpoint.
   */
  getStats(): {
    industries_supported: number;
    investment_levels: number;
    leverages_archive: boolean;
    leverages_cost_engine: boolean;
  } {
    return {
      industries_supported: Object.keys(INDUSTRY_REPEAT_SCORE).length,
      investment_levels: 4,
      leverages_archive: true,
      leverages_cost_engine: true,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const lathePartFamilyPlanningEngine = new LathePartFamilyPlanningEngineImpl();
export type { LathePartFamilyPlanningEngineImpl };
