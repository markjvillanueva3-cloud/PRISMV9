/**
 * PRISM MCP Server — Financial Analysis Engine
 *
 * Capital investment analysis for manufacturing: NPV, IRR, payback,
 * break-even, ROI, and full machine investment evaluation.
 *
 * Ported from PRISM_FINANCIAL_ENGINE.js (monolith R2.3.1).
 *
 * @module FinancialAnalysisEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface NPVResult {
  npv: number;
  formatted: string;
  viable: boolean;
  recommendation: string;
}

/** I R R Result configuration/data structure.
 */
export interface IRRResult {
  irr: number;
  formatted: string;
  iterations: number;
  converged: boolean;
}

/** Payback Result configuration/data structure.
 */
export interface PaybackResult {
  years: number;
  formatted: string;
  acceptable: boolean;
  recommendation: string;
}

/** Break Even Result configuration/data structure.
 */
export interface BreakEvenResult {
  units: number;
  revenue: number;
  contribution_margin: number;
  margin_percent: number;
}

/** R O I Result configuration/data structure.
 */
export interface ROIResult {
  roi: number;
  formatted: string;
  profitable: boolean;
}

/** Machine Investment Input configuration/data structure.
 */
export interface MachineInvestmentInput {
  machine_cost: number;
  installation_cost?: number;
  training_cost?: number;
  annual_revenue: number;
  annual_operating_cost: number;
  useful_life?: number;
  salvage_value?: number;
  discount_rate?: number;
}

/** Depreciation Result configuration/data structure.
 */
export interface DepreciationResult {
  method: string;
  annual: number;
  book_value_year_5: number;
}

/** Investment Recommendation configuration/data structure.
 */
export interface InvestmentRecommendation {
  recommendation: string;
  score: number;
  factors: string[];
}

/** Machine Investment Result configuration/data structure.
 */
export interface MachineInvestmentResult {
  summary: {
    total_investment: number;
    annual_cash_flow: number;
    useful_life: number;
  };
  npv: NPVResult;
  irr: IRRResult;
  payback: PaybackResult;
  roi: ROIResult;
  depreciation: DepreciationResult;
  recommendation: InvestmentRecommendation;
}

// ============================================================================
// ENGINE
// ============================================================================

class FinancialAnalysisEngineImpl {

  /**
   * Net Present Value — discounted cash flow valuation
   */
  calculateNPV(cashFlows: number[], discountRate: number): NPVResult {
    let npv = 0;
    for (let year = 0; year < cashFlows.length; year++) {
      npv += cashFlows[year] / Math.pow(1 + discountRate, year);
    }
    return {
      npv: Math.round(npv * 100) / 100,
      formatted: `$${npv.toFixed(2)}`,
      viable: npv > 0,
      recommendation: npv > 0
        ? "Project is financially viable"
        : "Project does not meet hurdle rate",
    };
  }

  /**
   * Internal Rate of Return — Newton-Raphson iteration
   */
  calculateIRR(cashFlows: number[], guess = 0.1): IRRResult {
    const maxIterations = 100;
    const tolerance = 0.0001;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;
      for (let year = 0; year < cashFlows.length; year++) {
        npv += cashFlows[year] / Math.pow(1 + rate, year);
        if (year > 0) {
          derivative -= (year * cashFlows[year]) / Math.pow(1 + rate, year + 1);
        }
      }
      if (Math.abs(derivative) < 1e-12) break; // avoid div/0
      const newRate = rate - npv / derivative;
      if (Math.abs(newRate - rate) < tolerance) {
        return {
          irr: Math.round(newRate * 10000) / 10000,
          formatted: `${(newRate * 100).toFixed(2)}%`,
          iterations: i + 1,
          converged: true,
        };
      }
      rate = newRate;
    }
    return {
      irr: Math.round(rate * 10000) / 10000,
      formatted: `${(rate * 100).toFixed(2)}%`,
      iterations: maxIterations,
      converged: false,
    };
  }

  /**
   * Simple payback period
   */
  calculatePayback(initialInvestment: number, annualCashFlow: number): PaybackResult {
    if (annualCashFlow <= 0) {
      return {
        years: Infinity,
        formatted: "Never",
        acceptable: false,
        recommendation: "Negative or zero annual cash flow — investment never recovers",
      };
    }
    const years = initialInvestment / annualCashFlow;
    return {
      years: Math.round(years * 100) / 100,
      formatted: `${years.toFixed(2)} years`,
      acceptable: years <= 3,
      recommendation: years <= 3
        ? "Investment recovers within acceptable timeframe"
        : "Payback period exceeds typical 3-year threshold",
    };
  }

  /**
   * Break-even analysis — fixed + variable cost model
   */
  calculateBreakEven(
    fixedCosts: number,
    pricePerUnit: number,
    variableCostPerUnit: number,
  ): BreakEvenResult {
    const margin = pricePerUnit - variableCostPerUnit;
    if (margin <= 0) {
      return { units: Infinity, revenue: Infinity, contribution_margin: margin, margin_percent: 0 };
    }
    const units = Math.ceil(fixedCosts / margin);
    return {
      units,
      revenue: Math.round(units * pricePerUnit * 100) / 100,
      contribution_margin: Math.round(margin * 100) / 100,
      margin_percent: Math.round((margin / pricePerUnit) * 1000) / 10,
    };
  }

  /**
   * Return on Investment
   */
  calculateROI(gain: number, cost: number): ROIResult {
    if (cost === 0) return { roi: 0, formatted: "0.0%", profitable: false };
    const roi = (gain - cost) / cost;
    return {
      roi: Math.round(roi * 1000) / 1000,
      formatted: `${(roi * 100).toFixed(1)}%`,
      profitable: roi > 0,
    };
  }

  /**
   * Full machine investment analysis — NPV + IRR + payback + ROI + depreciation
   */
  analyzeMachineInvestment(input: MachineInvestmentInput): MachineInvestmentResult {
    const {
      machine_cost,
      installation_cost = 0,
      training_cost = 0,
      annual_revenue,
      annual_operating_cost,
      useful_life = 10,
      salvage_value = 0,
      discount_rate = 0.10,
    } = input;

    const totalInvestment = machine_cost + installation_cost + training_cost;
    const annualCashFlow = annual_revenue - annual_operating_cost;

    // Build cash flow array
    const cashFlows = [-totalInvestment];
    for (let year = 1; year <= useful_life; year++) {
      cashFlows.push(year === useful_life ? annualCashFlow + salvage_value : annualCashFlow);
    }

    const npv = this.calculateNPV(cashFlows, discount_rate);
    const irr = this.calculateIRR(cashFlows);
    const payback = this.calculatePayback(totalInvestment, annualCashFlow);
    const roi = this.calculateROI(annualCashFlow * useful_life + salvage_value, totalInvestment);
    const annualDepreciation = (totalInvestment - salvage_value) / useful_life;

    return {
      summary: {
        total_investment: totalInvestment,
        annual_cash_flow: annualCashFlow,
        useful_life,
      },
      npv,
      irr,
      payback,
      roi,
      depreciation: {
        method: "Straight-line",
        annual: Math.round(annualDepreciation),
        book_value_year_5: Math.round(totalInvestment - annualDepreciation * Math.min(5, useful_life)),
      },
      recommendation: this._generateRecommendation(npv.npv, irr.irr, payback.years, discount_rate),
    };
  }

  private _generateRecommendation(
    npv: number, irr: number, payback: number, hurdleRate: number,
  ): InvestmentRecommendation {
    let score = 0;
    const factors: string[] = [];

    if (npv > 0) { score += 2; factors.push("Positive NPV"); }
    else { factors.push("Negative NPV — does not meet return requirements"); }

    if (irr > hurdleRate) {
      score += 2;
      factors.push(`IRR (${(irr * 100).toFixed(1)}%) exceeds hurdle rate (${(hurdleRate * 100).toFixed(1)}%)`);
    } else { factors.push("IRR below hurdle rate"); }

    if (payback <= 3) { score += 1; factors.push("Payback within 3 years"); }
    else if (payback <= 5) { factors.push("Payback within 5 years — moderate risk"); }
    else { factors.push("Long payback period — higher risk"); }

    let recommendation: string;
    if (score >= 4) recommendation = "STRONGLY RECOMMEND — All financial metrics favorable";
    else if (score >= 3) recommendation = "RECOMMEND — Most financial metrics favorable";
    else if (score >= 2) recommendation = "CONDITIONAL — Some concerns, requires further analysis";
    else recommendation = "NOT RECOMMENDED — Financial metrics unfavorable";

    return { recommendation, score, factors };
  }
}

/** Financial Analysis Engine constant.
 */
export const financialAnalysisEngine = new FinancialAnalysisEngineImpl();
