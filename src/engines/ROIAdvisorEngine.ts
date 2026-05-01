/**
 * ROIAdvisorEngine — Upgrade Suggestions with Payback Analysis
 *
 * Analyzes gap between current setup and optimal, suggests purchases
 * with ROI justification. Calculates payback period based on user's
 * part volume and per-part savings.
 */

export interface AtomicValue<T> { value: T; unit?: string; formula?: string; confidence?: number; source?: string; }

export interface CurrentSetup {
  tools: Array<{ type: string; diameter_mm: number; condition: string; cost_usd: number }>;
  machine: { name: string; max_rpm: number; power_kw: number; taper: string; age_years?: number };
  holders: Array<{ type: string; taper: string; runout_um: number }>;
  coolant: { type: "flood" | "mist" | "MQL" | "dry" | "through_tool" };
  workholding: { type: string; max_force_N?: number };
}

export interface OptimalSetup {
  tools: Array<{ type: string; diameter_mm: number; cost_usd: number; improvement_pct: number }>;
  machine?: { name: string; cost_usd: number; improvement_pct: number };
  holders?: Array<{ type: string; cost_usd: number; runout_reduction_um: number }>;
  coolant?: { type: string; cost_usd: number; improvement_pct: number };
  workholding?: { type: string; cost_usd: number; improvement_pct: number };
}

export interface ROISuggestion {
  category: "tool" | "holder" | "machine" | "coolant" | "workholding";
  item: string;
  current: string;
  recommended: string;
  cost_usd: number;
  savings_per_part_usd: number;
  payback_parts: number;
  payback_months: number;
  annual_savings_usd: number;
  priority: "high" | "medium" | "low";
  rationale: string;
}

export interface ROIResult {
  suggestions: ROISuggestion[];
  total_investment_usd: number;
  total_annual_savings_usd: number;
  overall_roi_pct: number;
  overall_payback_months: number;
  quick_wins: ROISuggestion[]; // payback < 3 months
}

export class ROIAdvisorEngine {
  readonly name = "ROIAdvisorEngine";

  analyze(
    current: CurrentSetup,
    optimal: OptimalSetup,
    annualVolume: number,
    currentCycleTimeMin: number,
    currentCostPerPart: number,
  ): AtomicValue<ROIResult> {
    const suggestions: ROISuggestion[] = [];
    const monthlyVolume = annualVolume / 12;

    // Tool upgrade suggestions
    for (const optTool of optimal.tools) {
      const curTool = current.tools.find(t => t.type === optTool.type && Math.abs(t.diameter_mm - optTool.diameter_mm) < 0.5);
      if (!curTool || optTool.improvement_pct > 10) {
        const savingsPerPart = currentCostPerPart * (optTool.improvement_pct / 100);
        const paybackParts = Math.ceil(optTool.cost_usd / Math.max(0.01, savingsPerPart));
        const paybackMonths = paybackParts / Math.max(1, monthlyVolume);
        suggestions.push({
          category: "tool",
          item: `${optTool.type} ∅${optTool.diameter_mm}mm`,
          current: curTool ? `${curTool.type} ∅${curTool.diameter_mm}mm (${curTool.condition})` : "None",
          recommended: `${optTool.type} ∅${optTool.diameter_mm}mm`,
          cost_usd: optTool.cost_usd,
          savings_per_part_usd: Math.round(savingsPerPart * 100) / 100,
          payback_parts: paybackParts,
          payback_months: Math.round(paybackMonths * 10) / 10,
          annual_savings_usd: Math.round(savingsPerPart * annualVolume),
          priority: paybackMonths < 3 ? "high" : paybackMonths < 12 ? "medium" : "low",
          rationale: `${optTool.improvement_pct}% improvement in cycle time/tool life. Payback in ${paybackParts} parts.`,
        });
      }
    }

    // Holder upgrade
    if (optimal.holders) {
      for (const optHolder of optimal.holders) {
        const curHolder = current.holders.find(h => h.taper === optHolder.type);
        const improvement = optHolder.runout_reduction_um * 0.5; // rough: 0.5% per µm runout reduction
        const savingsPerPart = currentCostPerPart * (improvement / 100);
        const paybackParts = Math.ceil(optHolder.cost_usd / Math.max(0.01, savingsPerPart));
        const paybackMonths = paybackParts / Math.max(1, monthlyVolume);
        suggestions.push({
          category: "holder",
          item: optHolder.type,
          current: curHolder ? `${curHolder.type} (${curHolder.runout_um}µm TIR)` : "Unknown",
          recommended: `${optHolder.type} (reduced runout)`,
          cost_usd: optHolder.cost_usd,
          savings_per_part_usd: Math.round(savingsPerPart * 100) / 100,
          payback_parts: paybackParts,
          payback_months: Math.round(paybackMonths * 10) / 10,
          annual_savings_usd: Math.round(savingsPerPart * annualVolume),
          priority: paybackMonths < 6 ? "high" : "medium",
          rationale: `Reduced runout → better surface finish, longer tool life. TIR reduction: ${optHolder.runout_reduction_um}µm.`,
        });
      }
    }

    // Coolant upgrade
    if (optimal.coolant && optimal.coolant.type !== current.coolant.type) {
      const savingsPerPart = currentCostPerPart * (optimal.coolant.improvement_pct / 100);
      const paybackParts = Math.ceil(optimal.coolant.cost_usd / Math.max(0.01, savingsPerPart));
      const paybackMonths = paybackParts / Math.max(1, monthlyVolume);
      suggestions.push({
        category: "coolant",
        item: optimal.coolant.type,
        current: current.coolant.type,
        recommended: optimal.coolant.type,
        cost_usd: optimal.coolant.cost_usd,
        savings_per_part_usd: Math.round(savingsPerPart * 100) / 100,
        payback_parts: paybackParts,
        payback_months: Math.round(paybackMonths * 10) / 10,
        annual_savings_usd: Math.round(savingsPerPart * annualVolume),
        priority: paybackMonths < 6 ? "high" : "medium",
        rationale: `${optimal.coolant.type} upgrade: ${optimal.coolant.improvement_pct}% improvement via better chip evacuation and tool cooling.`,
      });
    }

    // Machine upgrade (big ticket)
    if (optimal.machine) {
      const savingsPerPart = currentCostPerPart * (optimal.machine.improvement_pct / 100);
      const paybackParts = Math.ceil(optimal.machine.cost_usd / Math.max(0.01, savingsPerPart));
      const paybackMonths = paybackParts / Math.max(1, monthlyVolume);
      suggestions.push({
        category: "machine",
        item: optimal.machine.name,
        current: current.machine.name,
        recommended: optimal.machine.name,
        cost_usd: optimal.machine.cost_usd,
        savings_per_part_usd: Math.round(savingsPerPart * 100) / 100,
        payback_parts: paybackParts,
        payback_months: Math.round(paybackMonths * 10) / 10,
        annual_savings_usd: Math.round(savingsPerPart * annualVolume),
        priority: paybackMonths < 24 ? "medium" : "low",
        rationale: `${optimal.machine.improvement_pct}% productivity gain. Higher spindle speed/power enables aggressive cutting.`,
      });
    }

    // Sort by payback (quickest first)
    suggestions.sort((a, b) => a.payback_months - b.payback_months);

    const totalInvestment = suggestions.reduce((s, r) => s + r.cost_usd, 0);
    const totalAnnualSavings = suggestions.reduce((s, r) => s + r.annual_savings_usd, 0);
    // Annual return rate = annualSavings / investment × 100 (NOT total ROI = (gain-cost)/cost)
    // Equivalent to 1/payback_years × 100. Use FinancialAnalysisEngine.calculateROI for total ROI.
    const overallROI = totalInvestment > 0 ? (totalAnnualSavings / totalInvestment) * 100 : 0;
    const overallPayback = totalAnnualSavings > 0 ? (totalInvestment / totalAnnualSavings) * 12 : Infinity;

    return {
      value: {
        suggestions,
        total_investment_usd: Math.round(totalInvestment),
        total_annual_savings_usd: Math.round(totalAnnualSavings),
        overall_roi_pct: Math.round(overallROI),
        overall_payback_months: Math.round(overallPayback * 10) / 10,
        quick_wins: suggestions.filter(s => s.payback_months < 3),
      },
      confidence: suggestions.length > 0 ? 0.75 : 0.5,
      source: this.name,
    };
  }
}

export const roiAdvisorEngine = new ROIAdvisorEngine();
