/**
 * BusinessIntelligenceEngine — Cost/Benefit Analysis for PRISM
 * ============================================================
 * Provides business decision-making capabilities:
 *   - Make vs Buy analysis
 *   - Upgrade vs Outsource decisions
 *   - Capital investment justification (ROI, NPV, payback)
 *   - Capacity planning optimization
 *   - Cost driver analysis
 *   - Break-even analysis
 *
 * All decisions include full financial justification with
 * sensitivity analysis and risk assessment.
 *
 * @module engines/BusinessIntelligenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Financial analysis type */
export type AnalysisType =
  | "make_vs_buy"
  | "upgrade_vs_outsource"
  | "capital_investment"
  | "capacity_planning"
  | "break_even";

/** Cost category */
export interface CostCategory {
  id: string;
  name: string;
  type: "fixed" | "variable" | "semi_variable" | "one_time";
  amount: number;
  unit: string;  // e.g., "$/hour", "$/part", "$"
  volume_dependent: boolean;
  notes?: string;
}

/** Make option for make vs buy */
export interface MakeOption {
  setup_cost: number;
  material_cost_per_unit: number;
  labor_cost_per_unit: number;
  overhead_cost_per_unit: number;
  cycle_time_minutes: number;
  machine_hourly_rate: number;
  tool_cost_per_unit: number;
  quality_cost_per_unit: number;  // Inspection, scrap, rework
  lead_time_days: number;
  capacity_units_per_month: number;
  learning_curve_factor?: number;  // 0.8 = 80% learning curve
}

/** Buy option for make vs buy */
export interface BuyOption {
  supplier: string;
  unit_price: number;
  minimum_order_quantity: number;
  lead_time_days: number;
  shipping_cost_per_unit: number;
  quality_risk: "low" | "medium" | "high";
  reliability_score: number;  // 0-1
  tooling_cost?: number;  // One-time tooling charge
  volume_discounts?: Array<{ min_qty: number; price: number }>;
}

/** Make vs Buy analysis result */
export interface MakeVsBuyAnalysis {
  analysis_id: string;
  recommendation: "make" | "buy" | "hybrid";
  confidence: number;

  make_analysis: {
    total_cost: number;
    cost_per_unit: number;
    break_even_volume: number;
    cost_breakdown: CostCategory[];
    pros: string[];
    cons: string[];
  };

  buy_analysis: {
    total_cost: number;
    cost_per_unit: number;
    suppliers_evaluated: number;
    best_supplier: string;
    cost_breakdown: CostCategory[];
    pros: string[];
    cons: string[];
  };

  comparison: {
    cost_difference: number;
    cost_difference_percent: number;
    break_even_volume: number;
    crossover_chart: Array<{ volume: number; make_cost: number; buy_cost: number }>;
  };

  sensitivity: {
    sensitive_to: string[];
    scenarios: Array<{
      scenario: string;
      make_cost: number;
      buy_cost: number;
      recommendation: "make" | "buy";
    }>;
  };

  strategic_factors: {
    intellectual_property: "critical" | "important" | "not_relevant";
    quality_control: "essential" | "preferred" | "acceptable";
    flexibility_needs: "high" | "medium" | "low";
    capacity_utilization: number;
    core_competency: boolean;
  };

  reasoning: string[];
}

/** Upgrade option */
export interface UpgradeOption {
  description: string;
  capital_cost: number;
  installation_cost: number;
  training_cost: number;
  downtime_days: number;
  downtime_cost_per_day: number;

  benefits: {
    productivity_increase_percent: number;
    quality_improvement_percent: number;
    cost_reduction_per_unit: number;
    capacity_increase_percent: number;
    new_capabilities: string[];
  };

  maintenance: {
    annual_cost: number;
    expected_life_years: number;
  };

  financing?: {
    type: "cash" | "lease" | "loan";
    interest_rate?: number;
    term_months?: number;
  };
}

/** Outsource option */
export interface OutsourceOption {
  supplier: string;
  unit_price: number;
  setup_fee: number;
  minimum_commitment?: number;
  contract_length_months: number;

  quality: {
    expected_defect_rate: number;
    inspection_cost_per_unit: number;
  };

  logistics: {
    lead_time_days: number;
    shipping_cost_per_unit: number;
    inventory_buffer_cost: number;
  };

  risks: {
    supply_disruption: "low" | "medium" | "high";
    quality_consistency: "low" | "medium" | "high";
    ip_exposure: "low" | "medium" | "high";
  };
}

/** Upgrade vs Outsource analysis */
export interface UpgradeVsOutsourceAnalysis {
  analysis_id: string;
  recommendation: "upgrade" | "outsource" | "status_quo";
  confidence: number;

  current_state: {
    annual_volume: number;
    current_cost_per_unit: number;
    current_capacity: number;
    utilization: number;
  };

  upgrade_analysis: {
    total_investment: number;
    annual_savings: number;
    payback_period_years: number;
    npv: number;
    irr: number;
    roi: number;
    risk_adjusted_npv: number;
  };

  outsource_analysis: {
    annual_cost: number;
    cost_vs_current: number;
    freed_capacity: number;
    freed_capital: number;
    risk_factors: string[];
  };

  comparison: {
    year_by_year: Array<{
      year: number;
      upgrade_cumulative_cost: number;
      outsource_cumulative_cost: number;
      difference: number;
    }>;
    break_even_year: number | null;
  };

  strategic_alignment: {
    supports_core_business: boolean;
    enables_growth: boolean;
    reduces_risk: boolean;
    improves_flexibility: boolean;
  };

  reasoning: string[];
}

/** Capital investment analysis */
export interface CapitalInvestmentAnalysis {
  analysis_id: string;
  recommendation: "approve" | "reject" | "defer" | "modify";
  confidence: number;

  investment: {
    name: string;
    total_cost: number;
    useful_life_years: number;
    salvage_value: number;
  };

  financials: {
    npv: number;
    irr: number;
    payback_period: number;
    discounted_payback: number;
    profitability_index: number;
    roi: number;
  };

  cash_flows: Array<{
    year: number;
    inflows: number;
    outflows: number;
    net: number;
    cumulative: number;
    discounted: number;
  }>;

  sensitivity: {
    npv_at_different_rates: Array<{ rate: number; npv: number }>;
    break_even_utilization: number;
    volume_sensitivity: Array<{ volume_change: number; npv: number }>;
  };

  risks: Array<{
    risk: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;

  reasoning: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class BusinessIntelligenceEngine {
  private static readonly DEFAULT_DISCOUNT_RATE = 0.10;  // 10%
  private static readonly DEFAULT_TAX_RATE = 0.21;  // 21%
  private static readonly ANALYSIS_HORIZON_YEARS = 5;

  /**
   * Analyze make vs buy decision
   */
  static analyzeMakeVsBuy(
    annualVolume: number,
    makeOption: MakeOption,
    buyOptions: BuyOption[],
    strategicFactors: MakeVsBuyAnalysis["strategic_factors"]
  ): MakeVsBuyAnalysis {
    const analysisId = `mvb-${Date.now()}`;

    log.info("[BusinessIntelligence] Starting Make vs Buy analysis", {
      analysis_id: analysisId,
      volume: annualVolume,
      buy_options: buyOptions.length,
    });

    // Calculate make costs
    const makeCosts = this.calculateMakeCosts(annualVolume, makeOption);

    // Find best buy option
    const buyAnalyses = buyOptions.map(opt => this.calculateBuyCosts(annualVolume, opt));
    buyAnalyses.sort((a, b) => a.total_cost - b.total_cost);
    const bestBuy = buyAnalyses[0];

    // Calculate break-even
    const breakEvenVolume = this.calculateBreakEven(makeOption, buyOptions[0]);

    // Generate crossover chart
    const crossoverChart = this.generateCrossoverChart(makeOption, buyOptions[0], annualVolume);

    // Run sensitivity scenarios
    const sensitivity = this.runMakeVsBuySensitivity(annualVolume, makeOption, buyOptions[0]);

    // Make recommendation
    const costDiff = makeCosts.total_cost - bestBuy.total_cost;
    const costDiffPercent = (costDiff / bestBuy.total_cost) * 100;

    let recommendation: "make" | "buy" | "hybrid" = costDiff < 0 ? "make" : "buy";

    // Adjust for strategic factors
    if (strategicFactors.intellectual_property === "critical" && recommendation === "buy") {
      // Strong push toward make for IP protection
      if (Math.abs(costDiffPercent) < 20) {
        recommendation = "make";
      }
    }

    if (strategicFactors.core_competency && recommendation === "buy") {
      // Push toward make for core competencies
      if (Math.abs(costDiffPercent) < 15) {
        recommendation = "make";
      }
    }

    if (strategicFactors.capacity_utilization < 0.5 && recommendation === "buy") {
      // Underutilized capacity suggests making
      if (Math.abs(costDiffPercent) < 10) {
        recommendation = "make";
      }
    }

    // Consider hybrid for large volumes with capacity constraints
    if (annualVolume > makeOption.capacity_units_per_month * 12 && recommendation === "make") {
      recommendation = "hybrid";
    }

    const reasoning = this.generateMakeVsBuyReasoning(
      recommendation,
      makeCosts,
      bestBuy,
      strategicFactors,
      breakEvenVolume,
      annualVolume
    );

    log.info("[BusinessIntelligence] Make vs Buy analysis complete", {
      recommendation,
      make_cost: makeCosts.total_cost,
      buy_cost: bestBuy.total_cost,
    });

    return {
      analysis_id: analysisId,
      recommendation,
      confidence: this.calculateMakeVsBuyConfidence(costDiffPercent, sensitivity),

      make_analysis: {
        ...makeCosts,
        pros: this.getMakeProsCons(makeOption, strategicFactors).pros,
        cons: this.getMakeProsCons(makeOption, strategicFactors).cons,
      },

      buy_analysis: {
        ...bestBuy,
        suppliers_evaluated: buyOptions.length,
        best_supplier: buyOptions[0].supplier,
        pros: this.getBuyProsCons(buyOptions[0]).pros,
        cons: this.getBuyProsCons(buyOptions[0]).cons,
      },

      comparison: {
        cost_difference: costDiff,
        cost_difference_percent: costDiffPercent,
        break_even_volume: breakEvenVolume,
        crossover_chart: crossoverChart,
      },

      sensitivity,
      strategic_factors: strategicFactors,
      reasoning,
    };
  }

  /**
   * Analyze upgrade vs outsource decision
   */
  static analyzeUpgradeVsOutsource(
    currentState: {
      annual_volume: number;
      current_cost_per_unit: number;
      current_capacity: number;
      machine_age_years: number;
      machine_book_value: number;
    },
    upgradeOption: UpgradeOption,
    outsourceOption: OutsourceOption,
    discountRate: number = this.DEFAULT_DISCOUNT_RATE
  ): UpgradeVsOutsourceAnalysis {
    const analysisId = `uvo-${Date.now()}`;

    log.info("[BusinessIntelligence] Starting Upgrade vs Outsource analysis", {
      analysis_id: analysisId,
      volume: currentState.annual_volume,
    });

    const utilization = currentState.annual_volume / currentState.current_capacity;

    // Analyze upgrade option
    const upgradeAnalysis = this.analyzeUpgrade(
      currentState,
      upgradeOption,
      discountRate
    );

    // Analyze outsource option
    const outsourceAnalysis = this.analyzeOutsource(
      currentState,
      outsourceOption
    );

    // Year-by-year comparison
    const yearByYear = this.generateYearByYearComparison(
      currentState,
      upgradeOption,
      outsourceOption,
      discountRate
    );

    // Find break-even year
    const breakEvenYear = yearByYear.find(y => y.difference <= 0)?.year ?? null;

    // Determine recommendation
    let recommendation: "upgrade" | "outsource" | "status_quo";

    if (upgradeAnalysis.npv > 0 && upgradeAnalysis.npv > -outsourceAnalysis.cost_vs_current) {
      recommendation = "upgrade";
    } else if (outsourceAnalysis.cost_vs_current < 0) {
      recommendation = "outsource";
    } else {
      recommendation = "status_quo";
    }

    // Strategic alignment
    const strategicAlignment = {
      supports_core_business: true,  // Assume manufacturing is core
      enables_growth: upgradeOption.benefits.capacity_increase_percent > 20,
      reduces_risk: recommendation === "upgrade" ? upgradeAnalysis.roi > 0.2 : false,
      improves_flexibility: recommendation === "outsource",
    };

    const reasoning = this.generateUpgradeVsOutsourceReasoning(
      recommendation,
      upgradeAnalysis,
      outsourceAnalysis,
      currentState
    );

    log.info("[BusinessIntelligence] Upgrade vs Outsource analysis complete", {
      recommendation,
      upgrade_npv: upgradeAnalysis.npv,
      outsource_savings: -outsourceAnalysis.cost_vs_current,
    });

    return {
      analysis_id: analysisId,
      recommendation,
      confidence: recommendation === "status_quo" ? 0.5 : 0.75,

      current_state: {
        annual_volume: currentState.annual_volume,
        current_cost_per_unit: currentState.current_cost_per_unit,
        current_capacity: currentState.current_capacity,
        utilization,
      },

      upgrade_analysis: upgradeAnalysis,
      outsource_analysis: outsourceAnalysis,

      comparison: {
        year_by_year: yearByYear,
        break_even_year: breakEvenYear,
      },

      strategic_alignment: strategicAlignment,
      reasoning,
    };
  }

  /**
   * Analyze capital investment (NPV, IRR, payback)
   */
  static analyzeCapitalInvestment(
    investmentCost: number,
    annualBenefits: number,
    annualCosts: number,
    usefulLifeYears: number,
    salvageValue: number = 0,
    discountRate: number = this.DEFAULT_DISCOUNT_RATE
  ): CapitalInvestmentAnalysis {
    const analysisId = `cap-${Date.now()}`;

    log.info("[BusinessIntelligence] Starting capital investment analysis", {
      analysis_id: analysisId,
      investment: investmentCost,
      useful_life: usefulLifeYears,
    });

    // Calculate cash flows
    const cashFlows = this.calculateCashFlows(
      investmentCost,
      annualBenefits,
      annualCosts,
      usefulLifeYears,
      salvageValue,
      discountRate
    );

    // Calculate NPV
    const npv = cashFlows[cashFlows.length - 1].discounted +
      (salvageValue / Math.pow(1 + discountRate, usefulLifeYears));

    // Calculate IRR (Newton-Raphson approximation)
    const irr = this.calculateIRR(cashFlows, investmentCost, salvageValue);

    // Calculate payback period
    const paybackPeriod = this.calculatePaybackPeriod(cashFlows);
    const discountedPayback = this.calculateDiscountedPaybackPeriod(cashFlows);

    // Calculate profitability index
    const totalPV = cashFlows.reduce((sum, cf) => sum + (cf.discounted > 0 ? cf.discounted : 0), 0);
    const profitabilityIndex = totalPV / investmentCost;

    // Calculate ROI
    const totalNetBenefit = cashFlows.reduce((sum, cf) => sum + cf.net, 0);
    const roi = totalNetBenefit / investmentCost;

    // Sensitivity analysis
    const sensitivity = this.runCapitalSensitivity(
      investmentCost,
      annualBenefits,
      annualCosts,
      usefulLifeYears,
      salvageValue
    );

    // Risk assessment
    const risks = this.assessCapitalRisks(
      investmentCost,
      annualBenefits,
      usefulLifeYears,
      irr
    );

    // Determine recommendation
    let recommendation: "approve" | "reject" | "defer" | "modify";
    if (npv > 0 && irr > discountRate && paybackPeriod < usefulLifeYears * 0.6) {
      recommendation = "approve";
    } else if (npv < 0 || irr < discountRate * 0.5) {
      recommendation = "reject";
    } else if (irr > discountRate * 0.8) {
      recommendation = "modify";  // Close, might work with modifications
    } else {
      recommendation = "defer";
    }

    const reasoning = this.generateCapitalInvestmentReasoning(
      recommendation,
      npv,
      irr,
      paybackPeriod,
      discountRate,
      risks
    );

    log.info("[BusinessIntelligence] Capital investment analysis complete", {
      recommendation,
      npv,
      irr,
      payback: paybackPeriod,
    });

    return {
      analysis_id: analysisId,
      recommendation,
      confidence: recommendation === "approve" ? 0.85 : 0.7,

      investment: {
        name: "Capital Investment",
        total_cost: investmentCost,
        useful_life_years: usefulLifeYears,
        salvage_value: salvageValue,
      },

      financials: {
        npv,
        irr,
        payback_period: paybackPeriod,
        discounted_payback: discountedPayback,
        profitability_index: profitabilityIndex,
        roi,
      },

      cash_flows: cashFlows,
      sensitivity,
      risks,
      reasoning,
    };
  }

  /**
   * Calculate break-even volume
   */
  static calculateBreakEvenAnalysis(
    fixedCosts: number,
    variableCostPerUnit: number,
    sellingPricePerUnit: number
  ): {
    break_even_units: number;
    break_even_revenue: number;
    contribution_margin: number;
    contribution_margin_ratio: number;
    chart: Array<{ units: number; revenue: number; total_cost: number; profit: number }>;
  } {
    const contributionMargin = sellingPricePerUnit - variableCostPerUnit;
    const breakEvenUnits = fixedCosts / contributionMargin;
    const breakEvenRevenue = breakEvenUnits * sellingPricePerUnit;
    const contributionMarginRatio = contributionMargin / sellingPricePerUnit;

    // Generate chart data
    const chart: Array<{ units: number; revenue: number; total_cost: number; profit: number }> = [];
    const maxUnits = breakEvenUnits * 2;

    for (let units = 0; units <= maxUnits; units += maxUnits / 10) {
      chart.push({
        units,
        revenue: units * sellingPricePerUnit,
        total_cost: fixedCosts + units * variableCostPerUnit,
        profit: units * contributionMargin - fixedCosts,
      });
    }

    return {
      break_even_units: breakEvenUnits,
      break_even_revenue: breakEvenRevenue,
      contribution_margin: contributionMargin,
      contribution_margin_ratio: contributionMarginRatio,
      chart,
    };
  }

  /**
   * Analyze cost drivers
   */
  static analyzeCostDrivers(
    costs: CostCategory[],
    volume: number
  ): {
    total_cost: number;
    cost_per_unit: number;
    fixed_portion: number;
    variable_portion: number;
    drivers: Array<{
      category: string;
      amount: number;
      percent_of_total: number;
      type: string;
      controllability: "high" | "medium" | "low";
    }>;
    reduction_opportunities: Array<{
      category: string;
      potential_savings: number;
      action: string;
    }>;
  } {
    let totalCost = 0;
    let fixedPortion = 0;
    let variablePortion = 0;

    const drivers = costs.map(c => {
      let amount: number;

      switch (c.type) {
        case "fixed":
          amount = c.amount;
          fixedPortion += amount;
          break;
        case "variable":
          amount = c.amount * volume;
          variablePortion += amount;
          break;
        case "semi_variable":
          const fixedPart = c.amount * 0.3;  // Assume 30% fixed
          const varPart = c.amount * 0.7 * volume;
          amount = fixedPart + varPart;
          fixedPortion += fixedPart;
          variablePortion += varPart;
          break;
        case "one_time":
          amount = c.amount;
          fixedPortion += amount;
          break;
        default:
          amount = c.amount;
      }

      totalCost += amount;

      return {
        category: c.name,
        amount,
        percent_of_total: 0,  // Calculated after total known
        type: c.type,
        controllability: this.assessControllability(c),
      };
    });

    // Calculate percentages
    for (const driver of drivers) {
      driver.percent_of_total = (driver.amount / totalCost) * 100;
    }

    // Sort by amount
    drivers.sort((a, b) => b.amount - a.amount);

    // Identify reduction opportunities
    const reductionOpportunities = drivers
      .filter(d => d.controllability !== "low" && d.percent_of_total > 10)
      .map(d => ({
        category: d.category,
        potential_savings: d.amount * 0.1,  // Assume 10% reduction possible
        action: this.suggestCostReductionAction(d.category, d.type),
      }));

    return {
      total_cost: totalCost,
      cost_per_unit: totalCost / volume,
      fixed_portion: fixedPortion,
      variable_portion: variablePortion,
      drivers,
      reduction_opportunities: reductionOpportunities,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static calculateMakeCosts(
    volume: number,
    option: MakeOption
  ): {
    total_cost: number;
    cost_per_unit: number;
    cost_breakdown: CostCategory[];
  } {
    const machiningCost = (option.cycle_time_minutes / 60) * option.machine_hourly_rate * volume;
    const materialCost = option.material_cost_per_unit * volume;
    const laborCost = option.labor_cost_per_unit * volume;
    const overheadCost = option.overhead_cost_per_unit * volume;
    const toolCost = option.tool_cost_per_unit * volume;
    const qualityCost = option.quality_cost_per_unit * volume;
    const setupCost = option.setup_cost;

    const totalCost = machiningCost + materialCost + laborCost + overheadCost +
      toolCost + qualityCost + setupCost;

    return {
      total_cost: totalCost,
      cost_per_unit: totalCost / volume,
      cost_breakdown: [
        { id: "material", name: "Material", type: "variable", amount: materialCost, unit: "$", volume_dependent: true },
        { id: "machining", name: "Machining", type: "variable", amount: machiningCost, unit: "$", volume_dependent: true },
        { id: "labor", name: "Labor", type: "variable", amount: laborCost, unit: "$", volume_dependent: true },
        { id: "overhead", name: "Overhead", type: "semi_variable", amount: overheadCost, unit: "$", volume_dependent: true },
        { id: "tooling", name: "Tooling", type: "variable", amount: toolCost, unit: "$", volume_dependent: true },
        { id: "quality", name: "Quality", type: "variable", amount: qualityCost, unit: "$", volume_dependent: true },
        { id: "setup", name: "Setup", type: "fixed", amount: setupCost, unit: "$", volume_dependent: false },
      ],
    };
  }

  private static calculateBuyCosts(
    volume: number,
    option: BuyOption
  ): {
    total_cost: number;
    cost_per_unit: number;
    cost_breakdown: CostCategory[];
  } {
    // Apply volume discounts
    let unitPrice = option.unit_price;
    if (option.volume_discounts) {
      for (const discount of option.volume_discounts.sort((a, b) => b.min_qty - a.min_qty)) {
        if (volume >= discount.min_qty) {
          unitPrice = discount.price;
          break;
        }
      }
    }

    const purchaseCost = unitPrice * volume;
    const shippingCost = option.shipping_cost_per_unit * volume;
    const toolingCost = option.tooling_cost ?? 0;

    // Add quality risk premium
    const riskPremium = option.quality_risk === "high" ? 0.05 :
      option.quality_risk === "medium" ? 0.02 : 0;
    const qualityRiskCost = purchaseCost * riskPremium;

    const totalCost = purchaseCost + shippingCost + toolingCost + qualityRiskCost;

    return {
      total_cost: totalCost,
      cost_per_unit: totalCost / volume,
      cost_breakdown: [
        { id: "purchase", name: "Purchase", type: "variable", amount: purchaseCost, unit: "$", volume_dependent: true },
        { id: "shipping", name: "Shipping", type: "variable", amount: shippingCost, unit: "$", volume_dependent: true },
        { id: "tooling", name: "Tooling", type: "one_time", amount: toolingCost, unit: "$", volume_dependent: false },
        { id: "quality_risk", name: "Quality Risk Premium", type: "variable", amount: qualityRiskCost, unit: "$", volume_dependent: true },
      ],
    };
  }

  private static calculateBreakEven(make: MakeOption, buy: BuyOption): number {
    // Fixed costs for make
    const makeFixed = make.setup_cost;

    // Variable cost per unit for make
    const makeVariable = make.material_cost_per_unit + make.labor_cost_per_unit +
      make.overhead_cost_per_unit + make.tool_cost_per_unit + make.quality_cost_per_unit +
      (make.cycle_time_minutes / 60) * make.machine_hourly_rate;

    // Fixed costs for buy
    const buyFixed = buy.tooling_cost ?? 0;

    // Variable cost per unit for buy
    const buyVariable = buy.unit_price + buy.shipping_cost_per_unit;

    // Break-even: makeFixed + makeVariable * Q = buyFixed + buyVariable * Q
    // Q = (makeFixed - buyFixed) / (buyVariable - makeVariable)

    if (buyVariable <= makeVariable) {
      return Infinity;  // Buy is always cheaper per unit
    }

    return (makeFixed - buyFixed) / (buyVariable - makeVariable);
  }

  private static generateCrossoverChart(
    make: MakeOption,
    buy: BuyOption,
    targetVolume: number
  ): Array<{ volume: number; make_cost: number; buy_cost: number }> {
    const chart: Array<{ volume: number; make_cost: number; buy_cost: number }> = [];
    const maxVolume = targetVolume * 2;
    const step = maxVolume / 20;

    for (let vol = 0; vol <= maxVolume; vol += step) {
      const makeCosts = this.calculateMakeCosts(vol || 1, make);
      const buyCosts = this.calculateBuyCosts(vol || 1, buy);

      chart.push({
        volume: vol,
        make_cost: makeCosts.total_cost,
        buy_cost: buyCosts.total_cost,
      });
    }

    return chart;
  }

  private static runMakeVsBuySensitivity(
    volume: number,
    make: MakeOption,
    buy: BuyOption
  ): MakeVsBuyAnalysis["sensitivity"] {
    const scenarios: Array<{
      scenario: string;
      make_cost: number;
      buy_cost: number;
      recommendation: "make" | "buy";
    }> = [];

    // Scenario: +20% volume
    const highVolume = volume * 1.2;
    const makeHighVol = this.calculateMakeCosts(highVolume, make);
    const buyHighVol = this.calculateBuyCosts(highVolume, buy);
    scenarios.push({
      scenario: "+20% volume",
      make_cost: makeHighVol.cost_per_unit,
      buy_cost: buyHighVol.cost_per_unit,
      recommendation: makeHighVol.cost_per_unit < buyHighVol.cost_per_unit ? "make" : "buy",
    });

    // Scenario: -20% volume
    const lowVolume = volume * 0.8;
    const makeLowVol = this.calculateMakeCosts(lowVolume, make);
    const buyLowVol = this.calculateBuyCosts(lowVolume, buy);
    scenarios.push({
      scenario: "-20% volume",
      make_cost: makeLowVol.cost_per_unit,
      buy_cost: buyLowVol.cost_per_unit,
      recommendation: makeLowVol.cost_per_unit < buyLowVol.cost_per_unit ? "make" : "buy",
    });

    // Scenario: Material cost +10%
    const makeHighMat = { ...make, material_cost_per_unit: make.material_cost_per_unit * 1.1 };
    const makeHighMatCost = this.calculateMakeCosts(volume, makeHighMat);
    const buyBase = this.calculateBuyCosts(volume, buy);
    scenarios.push({
      scenario: "+10% material cost",
      make_cost: makeHighMatCost.cost_per_unit,
      buy_cost: buyBase.cost_per_unit,
      recommendation: makeHighMatCost.cost_per_unit < buyBase.cost_per_unit ? "make" : "buy",
    });

    // Scenario: Supplier price +10%
    const buyHigh = { ...buy, unit_price: buy.unit_price * 1.1 };
    const buyHighCost = this.calculateBuyCosts(volume, buyHigh);
    const makeBase = this.calculateMakeCosts(volume, make);
    scenarios.push({
      scenario: "+10% supplier price",
      make_cost: makeBase.cost_per_unit,
      buy_cost: buyHighCost.cost_per_unit,
      recommendation: makeBase.cost_per_unit < buyHighCost.cost_per_unit ? "make" : "buy",
    });

    // Identify what decision is sensitive to
    const sensitiveTo: string[] = [];
    const baseRec = scenarios[0].recommendation;

    if (scenarios.some(s => s.recommendation !== baseRec)) {
      sensitiveTo.push("volume changes");
    }
    if (scenarios[2].recommendation !== baseRec) {
      sensitiveTo.push("material cost changes");
    }
    if (scenarios[3].recommendation !== baseRec) {
      sensitiveTo.push("supplier price changes");
    }

    return { sensitive_to: sensitiveTo, scenarios };
  }

  private static getMakeProsCons(
    option: MakeOption,
    strategic: MakeVsBuyAnalysis["strategic_factors"]
  ): { pros: string[]; cons: string[] } {
    const pros: string[] = [
      "Full quality control",
      "Flexible scheduling",
      "No minimum order quantities",
    ];

    const cons: string[] = [
      "Capital tied up in equipment",
      "Requires skilled labor",
      "Capacity constraints",
    ];

    if (strategic.core_competency) {
      pros.push("Builds internal capability");
    }
    if (strategic.intellectual_property === "critical") {
      pros.push("Protects intellectual property");
    }
    if (strategic.capacity_utilization < 0.5) {
      pros.push("Utilizes existing capacity");
    }
    if (option.lead_time_days < 5) {
      pros.push("Short lead time");
    }

    return { pros, cons };
  }

  private static getBuyProsCons(option: BuyOption): { pros: string[]; cons: string[] } {
    const pros: string[] = [
      "No capital investment",
      "Scales easily with volume",
      "Frees internal capacity",
    ];

    const cons: string[] = [
      "Less quality control",
      "Lead time dependency",
      "Minimum order requirements",
    ];

    if (option.reliability_score > 0.9) {
      pros.push("Reliable supplier");
    }
    if (option.volume_discounts && option.volume_discounts.length > 0) {
      pros.push("Volume discounts available");
    }
    if (option.quality_risk === "high") {
      cons.push("High quality risk");
    }

    return { pros, cons };
  }

  private static calculateMakeVsBuyConfidence(
    costDiffPercent: number,
    sensitivity: MakeVsBuyAnalysis["sensitivity"]
  ): number {
    let confidence = 0.8;

    // Higher cost difference = higher confidence
    confidence += Math.min(0.15, Math.abs(costDiffPercent) / 100);

    // Sensitivity reduces confidence
    confidence -= sensitivity.sensitive_to.length * 0.05;

    // If scenarios flip decision, reduce confidence
    const flips = sensitivity.scenarios.filter(
      (s, i) => i > 0 && s.recommendation !== sensitivity.scenarios[0].recommendation
    );
    confidence -= flips.length * 0.05;

    return Math.max(0.4, Math.min(0.95, confidence));
  }

  private static generateMakeVsBuyReasoning(
    recommendation: "make" | "buy" | "hybrid",
    makeCosts: { total_cost: number; cost_per_unit: number },
    buyCosts: { total_cost: number; cost_per_unit: number },
    strategic: MakeVsBuyAnalysis["strategic_factors"],
    breakEven: number,
    volume: number
  ): string[] {
    const reasoning: string[] = [];

    if (recommendation === "make") {
      reasoning.push(`Making in-house costs $${makeCosts.cost_per_unit.toFixed(2)}/unit vs buying at $${buyCosts.cost_per_unit.toFixed(2)}/unit`);

      if (strategic.intellectual_property === "critical") {
        reasoning.push("IP protection supports in-house manufacturing");
      }
      if (strategic.core_competency) {
        reasoning.push("This is a core competency that should be retained");
      }
      if (strategic.capacity_utilization < 0.6) {
        reasoning.push(`Current capacity utilization (${(strategic.capacity_utilization * 100).toFixed(0)}%) supports additional in-house work`);
      }
    } else if (recommendation === "buy") {
      reasoning.push(`Buying at $${buyCosts.cost_per_unit.toFixed(2)}/unit is ${((buyCosts.cost_per_unit - makeCosts.cost_per_unit) / makeCosts.cost_per_unit * -100).toFixed(1)}% cheaper than making`);

      if (strategic.flexibility_needs === "high") {
        reasoning.push("Outsourcing provides volume flexibility");
      }
      reasoning.push("Frees internal capacity for higher-value work");
    } else {
      reasoning.push("Hybrid approach recommended due to capacity constraints");
      reasoning.push(`Make internally up to capacity, outsource overflow`);
    }

    if (breakEven < volume) {
      reasoning.push(`Volume (${volume}) exceeds break-even (${Math.round(breakEven)}) favoring make`);
    } else {
      reasoning.push(`Volume (${volume}) below break-even (${Math.round(breakEven)}) favoring buy`);
    }

    return reasoning;
  }

  private static analyzeUpgrade(
    currentState: { annual_volume: number; current_cost_per_unit: number; machine_book_value: number },
    option: UpgradeOption,
    discountRate: number
  ): UpgradeVsOutsourceAnalysis["upgrade_analysis"] {
    // Total investment
    const totalInvestment = option.capital_cost + option.installation_cost +
      option.training_cost + (option.downtime_days * option.downtime_cost_per_day);

    // Annual benefits
    const productivitySavings = currentState.annual_volume *
      currentState.current_cost_per_unit *
      (option.benefits.productivity_increase_percent / 100);

    const costSavings = currentState.annual_volume * option.benefits.cost_reduction_per_unit;

    const annualBenefits = productivitySavings + costSavings - option.maintenance.annual_cost;

    // NPV calculation
    let npv = -totalInvestment;
    for (let year = 1; year <= option.maintenance.expected_life_years; year++) {
      npv += annualBenefits / Math.pow(1 + discountRate, year);
    }

    // Payback period
    const paybackYears = totalInvestment / annualBenefits;

    // IRR approximation
    const irr = annualBenefits / totalInvestment;  // Simplified

    // ROI
    const totalReturn = annualBenefits * option.maintenance.expected_life_years;
    const roi = (totalReturn - totalInvestment) / totalInvestment;

    // Risk-adjusted NPV (20% discount for risk)
    const riskAdjustedNpv = npv * 0.8;

    return {
      total_investment: totalInvestment,
      annual_savings: annualBenefits,
      payback_period_years: paybackYears,
      npv,
      irr,
      roi,
      risk_adjusted_npv: riskAdjustedNpv,
    };
  }

  private static analyzeOutsource(
    currentState: { annual_volume: number; current_cost_per_unit: number; current_capacity: number },
    option: OutsourceOption
  ): UpgradeVsOutsourceAnalysis["outsource_analysis"] {
    const currentAnnualCost = currentState.annual_volume * currentState.current_cost_per_unit;

    const outsourceAnnualCost = currentState.annual_volume *
      (option.unit_price + option.quality.inspection_cost_per_unit + option.logistics.shipping_cost_per_unit) +
      option.setup_fee +
      option.logistics.inventory_buffer_cost;

    const costVsCurrent = outsourceAnnualCost - currentAnnualCost;

    const riskFactors: string[] = [];
    if (option.risks.supply_disruption === "high") riskFactors.push("High supply disruption risk");
    if (option.risks.quality_consistency === "high") riskFactors.push("Quality consistency concerns");
    if (option.risks.ip_exposure === "high") riskFactors.push("IP exposure risk");

    return {
      annual_cost: outsourceAnnualCost,
      cost_vs_current: costVsCurrent,
      freed_capacity: currentState.current_capacity,
      freed_capital: 0,  // Would need more context
      risk_factors: riskFactors,
    };
  }

  private static generateYearByYearComparison(
    currentState: { annual_volume: number; current_cost_per_unit: number },
    upgrade: UpgradeOption,
    outsource: OutsourceOption,
    discountRate: number
  ): UpgradeVsOutsourceAnalysis["comparison"]["year_by_year"] {
    const years: UpgradeVsOutsourceAnalysis["comparison"]["year_by_year"] = [];

    const upgradeInitial = upgrade.capital_cost + upgrade.installation_cost +
      upgrade.training_cost + (upgrade.downtime_days * upgrade.downtime_cost_per_day);

    const upgradeAnnualSavings = currentState.annual_volume *
      (currentState.current_cost_per_unit * upgrade.benefits.productivity_increase_percent / 100 +
       upgrade.benefits.cost_reduction_per_unit) -
      upgrade.maintenance.annual_cost;

    const outsourceAnnualCost = currentState.annual_volume *
      (outsource.unit_price + outsource.quality.inspection_cost_per_unit);

    let upgradeCumulative = upgradeInitial;
    let outsourceCumulative = outsource.setup_fee;

    for (let year = 1; year <= this.ANALYSIS_HORIZON_YEARS; year++) {
      upgradeCumulative += -upgradeAnnualSavings;  // Savings are negative cost
      outsourceCumulative += outsourceAnnualCost;

      years.push({
        year,
        upgrade_cumulative_cost: upgradeCumulative,
        outsource_cumulative_cost: outsourceCumulative,
        difference: outsourceCumulative - upgradeCumulative,
      });
    }

    return years;
  }

  private static generateUpgradeVsOutsourceReasoning(
    recommendation: "upgrade" | "outsource" | "status_quo",
    upgrade: UpgradeVsOutsourceAnalysis["upgrade_analysis"],
    outsource: UpgradeVsOutsourceAnalysis["outsource_analysis"],
    currentState: { annual_volume: number; current_cost_per_unit: number }
  ): string[] {
    const reasoning: string[] = [];

    if (recommendation === "upgrade") {
      reasoning.push(`Upgrade NPV of $${upgrade.npv.toFixed(0)} justifies the investment`);
      reasoning.push(`Payback period of ${upgrade.payback_period_years.toFixed(1)} years is acceptable`);
      reasoning.push(`ROI of ${(upgrade.roi * 100).toFixed(0)}% exceeds hurdle rate`);
    } else if (recommendation === "outsource") {
      if (outsource.cost_vs_current < 0) {
        reasoning.push(`Outsourcing saves $${(-outsource.cost_vs_current).toFixed(0)} annually`);
      }
      reasoning.push("Frees capacity for higher-value work");
      if (outsource.risk_factors.length === 0) {
        reasoning.push("Low risk profile for outsourcing");
      }
    } else {
      reasoning.push("Neither option provides sufficient return");
      reasoning.push("Current state remains most cost-effective");
    }

    return reasoning;
  }

  private static calculateCashFlows(
    investment: number,
    annualBenefits: number,
    annualCosts: number,
    years: number,
    salvage: number,
    discountRate: number
  ): CapitalInvestmentAnalysis["cash_flows"] {
    const flows: CapitalInvestmentAnalysis["cash_flows"] = [];
    let cumulative = -investment;
    let cumulativeDiscounted = -investment;

    // Year 0
    flows.push({
      year: 0,
      inflows: 0,
      outflows: investment,
      net: -investment,
      cumulative,
      discounted: cumulativeDiscounted,
    });

    for (let year = 1; year <= years; year++) {
      const inflows = annualBenefits + (year === years ? salvage : 0);
      const outflows = annualCosts;
      const net = inflows - outflows;
      cumulative += net;
      const discounted = net / Math.pow(1 + discountRate, year);
      cumulativeDiscounted += discounted;

      flows.push({
        year,
        inflows,
        outflows,
        net,
        cumulative,
        discounted: cumulativeDiscounted,
      });
    }

    return flows;
  }

  private static calculateIRR(
    cashFlows: CapitalInvestmentAnalysis["cash_flows"],
    investment: number,
    salvage: number
  ): number {
    // Newton-Raphson for IRR
    let rate = 0.1;
    const maxIterations = 50;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = -investment;
      let derivative = 0;

      for (let j = 1; j < cashFlows.length; j++) {
        const t = j;
        const cf = cashFlows[j].net;
        npv += cf / Math.pow(1 + rate, t);
        derivative -= t * cf / Math.pow(1 + rate, t + 1);
      }

      if (Math.abs(npv) < tolerance) break;
      if (derivative === 0) break;

      rate = rate - npv / derivative;
    }

    return rate;
  }

  private static calculatePaybackPeriod(
    cashFlows: CapitalInvestmentAnalysis["cash_flows"]
  ): number {
    for (let i = 1; i < cashFlows.length; i++) {
      if (cashFlows[i].cumulative >= 0) {
        // Interpolate
        const prev = cashFlows[i - 1];
        const fraction = -prev.cumulative / cashFlows[i].net;
        return (i - 1) + fraction;
      }
    }
    return Infinity;
  }

  private static calculateDiscountedPaybackPeriod(
    cashFlows: CapitalInvestmentAnalysis["cash_flows"]
  ): number {
    for (let i = 1; i < cashFlows.length; i++) {
      if (cashFlows[i].discounted >= 0) {
        const prev = cashFlows[i - 1];
        const thisDiscounted = cashFlows[i].discounted - prev.discounted;
        const fraction = -prev.discounted / thisDiscounted;
        return (i - 1) + fraction;
      }
    }
    return Infinity;
  }

  private static runCapitalSensitivity(
    investment: number,
    benefits: number,
    costs: number,
    years: number,
    salvage: number
  ): CapitalInvestmentAnalysis["sensitivity"] {
    const npvAtRates: Array<{ rate: number; npv: number }> = [];

    for (const rate of [0.05, 0.08, 0.10, 0.12, 0.15, 0.20]) {
      let npv = -investment + salvage / Math.pow(1 + rate, years);
      for (let y = 1; y <= years; y++) {
        npv += (benefits - costs) / Math.pow(1 + rate, y);
      }
      npvAtRates.push({ rate, npv });
    }

    // Break-even utilization
    const fixedBenefits = benefits;  // Simplified
    const breakEvenUtil = (investment / years + costs) / fixedBenefits;

    // Volume sensitivity
    const volumeSensitivity: Array<{ volume_change: number; npv: number }> = [];
    for (const change of [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) {
      const adjBenefits = benefits * (1 + change);
      let npv = -investment + salvage / Math.pow(1 + 0.1, years);
      for (let y = 1; y <= years; y++) {
        npv += (adjBenefits - costs) / Math.pow(1 + 0.1, y);
      }
      volumeSensitivity.push({ volume_change: change, npv });
    }

    return {
      npv_at_different_rates: npvAtRates,
      break_even_utilization: breakEvenUtil,
      volume_sensitivity: volumeSensitivity,
    };
  }

  private static assessCapitalRisks(
    investment: number,
    benefits: number,
    years: number,
    irr: number
  ): CapitalInvestmentAnalysis["risks"] {
    const risks: CapitalInvestmentAnalysis["risks"] = [];

    if (investment > benefits * 3) {
      risks.push({
        risk: "High upfront investment relative to annual benefits",
        probability: 0.3,
        impact: investment * 0.2,
        mitigation: "Negotiate phased payments or lease options",
      });
    }

    if (years > 7) {
      risks.push({
        risk: "Technology obsolescence over long asset life",
        probability: 0.4,
        impact: investment * 0.3,
        mitigation: "Include upgrade provisions in contract",
      });
    }

    if (irr < 0.15) {
      risks.push({
        risk: "Marginal returns - sensitive to assumptions",
        probability: 0.5,
        impact: benefits * 2,
        mitigation: "Lock in key assumptions with contracts",
      });
    }

    risks.push({
      risk: "Market demand uncertainty",
      probability: 0.3,
      impact: benefits * years * 0.3,
      mitigation: "Diversify product applications for equipment",
    });

    return risks;
  }

  private static generateCapitalInvestmentReasoning(
    recommendation: "approve" | "reject" | "defer" | "modify",
    npv: number,
    irr: number,
    payback: number,
    hurdle: number,
    risks: CapitalInvestmentAnalysis["risks"]
  ): string[] {
    const reasoning: string[] = [];

    if (recommendation === "approve") {
      reasoning.push(`Positive NPV of $${npv.toFixed(0)} indicates value creation`);
      reasoning.push(`IRR of ${(irr * 100).toFixed(1)}% exceeds hurdle rate of ${(hurdle * 100).toFixed(1)}%`);
      if (payback < 3) {
        reasoning.push(`Quick payback of ${payback.toFixed(1)} years reduces risk`);
      }
    } else if (recommendation === "reject") {
      if (npv < 0) {
        reasoning.push(`Negative NPV of $${npv.toFixed(0)} destroys value`);
      }
      if (irr < hurdle) {
        reasoning.push(`IRR of ${(irr * 100).toFixed(1)}% below hurdle rate`);
      }
    } else if (recommendation === "modify") {
      reasoning.push("Investment is close to acceptable returns");
      reasoning.push("Consider negotiating better terms or phased approach");
    } else {
      reasoning.push("Market conditions uncertain - defer decision");
      reasoning.push("Revisit when demand outlook improves");
    }

    if (risks.length > 0) {
      const highRisks = risks.filter(r => r.probability > 0.3);
      if (highRisks.length > 0) {
        reasoning.push(`Note: ${highRisks.length} significant risks identified`);
      }
    }

    return reasoning;
  }

  private static assessControllability(cost: CostCategory): "high" | "medium" | "low" {
    const uncontrollable = ["overhead", "rent", "insurance", "depreciation", "tax"];
    const partiallyControllable = ["utilities", "maintenance", "supplies"];

    if (uncontrollable.some(u => cost.name.toLowerCase().includes(u))) {
      return "low";
    }
    if (partiallyControllable.some(p => cost.name.toLowerCase().includes(p))) {
      return "medium";
    }
    return "high";
  }

  private static suggestCostReductionAction(category: string, type: string): string {
    const catLower = category.toLowerCase();

    if (catLower.includes("material")) {
      return "Negotiate volume discounts or find alternative suppliers";
    }
    if (catLower.includes("labor")) {
      return "Improve process efficiency or automate";
    }
    if (catLower.includes("tool")) {
      return "Optimize cutting parameters to extend tool life";
    }
    if (catLower.includes("energy") || catLower.includes("utilit")) {
      return "Implement energy-efficient practices";
    }
    if (catLower.includes("shipping") || catLower.includes("freight")) {
      return "Consolidate shipments or renegotiate rates";
    }
    if (type === "fixed") {
      return "Review necessity and explore alternatives";
    }
    return "Analyze root causes and identify waste reduction opportunities";
  }
}

// Export singleton
export const businessIntelligenceEngine = new BusinessIntelligenceEngine();
