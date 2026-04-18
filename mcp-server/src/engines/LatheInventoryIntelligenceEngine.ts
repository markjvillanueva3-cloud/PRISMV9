/**
 * LatheInventoryIntelligenceEngine — Intelligent Inventory Analytics
 *
 * U-LTH53: AI-driven inventory forecasting, ABC analysis, trend detection
 * Uses InventoryAwareToolSelectorEngine + EOQEngine + DemandForecastingEngine patterns
 *
 * @module engines/LatheInventoryIntelligenceEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryRecord {
  item_id: string;
  item_type: "material" | "tool" | "consumable";
  description: string;
  current_quantity: number;
  unit_cost: number;
  annual_demand: number;
  lead_time_days: number;
  order_cost: number;
  holding_cost_pct: number;
  safety_stock: number;
  reorder_point: number;
  eoq: number;
  abc_class: "A" | "B" | "C";
  last_usage: string;
  usage_history: UsageEvent[];
}

export interface UsageEvent {
  date: string;
  job_id: string;
  quantity_used: number;
  unit_cost_at_time: number;
}

export interface DemandForecast {
  item_id: string;
  forecast_period: string;
  predicted_demand: number;
  confidence_interval: { lower: number; upper: number };
  trend: "increasing" | "stable" | "decreasing";
  seasonality_factor: number;
  method: "moving_average" | "exponential_smoothing" | "regression";
}

export interface ABCAnalysis {
  class_A: Array<{ item_id: string; annual_value: number; cumulative_pct: number }>;
  class_B: Array<{ item_id: string; annual_value: number; cumulative_pct: number }>;
  class_C: Array<{ item_id: string; annual_value: number; cumulative_pct: number }>;
  total_items: number;
  total_annual_value: number;
  class_thresholds: { A: number; B: number };
}

export interface StockoutRisk {
  item_id: string;
  description: string;
  current_quantity: number;
  days_of_supply: number;
  risk_level: "critical" | "warning" | "watch" | "safe";
  expected_stockout_date: string | null;
  recommended_action: string;
}

export interface TurnoverAnalysis {
  item_id: string;
  description: string;
  turns_per_year: number;
  days_inventory_on_hand: number;
  classification: "fast_moving" | "moderate" | "slow_moving" | "dead_stock";
  recommendation: string;
}

export interface InventoryHealthReport {
  total_inventory_value: number;
  abc_distribution: { A_pct: number; B_pct: number; C_pct: number };
  average_turnover: number;
  stockout_risk_items: number;
  overstock_items: number;
  dead_stock_items: number;
  fill_rate: number;
  recommendations: string[];
}

export interface EOQCalculation {
  item_id: string;
  annual_demand: number;
  order_cost: number;
  holding_cost: number;
  eoq: number;
  reorder_point: number;
  safety_stock: number;
  annual_ordering_cost: number;
  annual_holding_cost: number;
  total_annual_cost: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_LEVEL_Z = 1.65; // 95% service level
const WORKING_DAYS_PER_YEAR = 250;

// ============================================================================
// ENGINE
// ============================================================================

class LatheInventoryIntelligenceEngine {
  private inventory: Map<string, InventoryRecord> = new Map();

  constructor() {
    this.initializeDefaultInventory();
  }

  private initializeDefaultInventory(): void {
    const items: Omit<InventoryRecord, "abc_class" | "eoq" | "reorder_point" | "safety_stock">[] = [
      {
        item_id: "MAT-4140",
        item_type: "material",
        description: "4140 Alloy Steel Round Bar",
        current_quantity: 500,
        unit_cost: 2.80,
        annual_demand: 2400,
        lead_time_days: 5,
        order_cost: 50,
        holding_cost_pct: 0.25,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "MAT-6061",
        item_type: "material",
        description: "6061-T6 Aluminum Round Bar",
        current_quantity: 800,
        unit_cost: 3.50,
        annual_demand: 3600,
        lead_time_days: 3,
        order_cost: 50,
        holding_cost_pct: 0.25,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "MAT-303SS",
        item_type: "material",
        description: "303 Stainless Steel Round Bar",
        current_quantity: 200,
        unit_cost: 6.50,
        annual_demand: 600,
        lead_time_days: 7,
        order_cost: 75,
        holding_cost_pct: 0.25,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "TOOL-CNMG",
        item_type: "tool",
        description: "CNMG 120408 Turning Insert",
        current_quantity: 24,
        unit_cost: 12.50,
        annual_demand: 180,
        lead_time_days: 2,
        order_cost: 25,
        holding_cost_pct: 0.30,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "TOOL-THREAD",
        item_type: "tool",
        description: "16ER 2.0 ISO Threading Insert",
        current_quantity: 12,
        unit_cost: 18.00,
        annual_demand: 60,
        lead_time_days: 3,
        order_cost: 25,
        holding_cost_pct: 0.30,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "TOOL-GROOVE",
        item_type: "tool",
        description: "GIP 3.00 Grooving Insert",
        current_quantity: 8,
        unit_cost: 16.50,
        annual_demand: 36,
        lead_time_days: 3,
        order_cost: 25,
        holding_cost_pct: 0.30,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "CONS-COOLANT",
        item_type: "consumable",
        description: "Water-Soluble Cutting Coolant",
        current_quantity: 100,
        unit_cost: 45.00,
        annual_demand: 200,
        lead_time_days: 1,
        order_cost: 20,
        holding_cost_pct: 0.20,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
      {
        item_id: "CONS-OIL",
        item_type: "consumable",
        description: "Way Oil ISO 68",
        current_quantity: 20,
        unit_cost: 38.00,
        annual_demand: 48,
        lead_time_days: 2,
        order_cost: 20,
        holding_cost_pct: 0.20,
        last_usage: new Date().toISOString(),
        usage_history: [],
      },
    ];

    for (const item of items) {
      const eoqCalc = this.calculateEOQ(item);
      const record: InventoryRecord = {
        ...item,
        abc_class: "C",
        eoq: eoqCalc.eoq,
        reorder_point: eoqCalc.reorder_point,
        safety_stock: eoqCalc.safety_stock,
      };
      this.inventory.set(item.item_id, record);
    }

    this.updateABCClassification();
  }

  // --------------------------------------------------------------------------
  // EOQ Calculations
  // --------------------------------------------------------------------------

  calculateEOQ(item: {
    annual_demand: number;
    order_cost: number;
    unit_cost: number;
    holding_cost_pct: number;
    lead_time_days: number;
  }): EOQCalculation {
    const D = item.annual_demand;
    const S = item.order_cost;
    const H = item.unit_cost * item.holding_cost_pct;

    const eoq = Math.ceil(Math.sqrt((2 * D * S) / H));

    const dailyDemand = D / WORKING_DAYS_PER_YEAR;
    const leadTimeDemand = dailyDemand * item.lead_time_days;

    const demandStdDev = dailyDemand * 0.3;
    const safetyStock = Math.ceil(SERVICE_LEVEL_Z * demandStdDev * Math.sqrt(item.lead_time_days));
    const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

    const ordersPerYear = D / eoq;
    const annualOrderingCost = ordersPerYear * S;
    const avgInventory = eoq / 2 + safetyStock;
    const annualHoldingCost = avgInventory * H;

    return {
      item_id: "",
      annual_demand: D,
      order_cost: S,
      holding_cost: H,
      eoq,
      reorder_point: reorderPoint,
      safety_stock: safetyStock,
      annual_ordering_cost: Math.round(annualOrderingCost * 100) / 100,
      annual_holding_cost: Math.round(annualHoldingCost * 100) / 100,
      total_annual_cost: Math.round((annualOrderingCost + annualHoldingCost) * 100) / 100,
    };
  }

  getEOQForItem(itemId: string): EOQCalculation | null {
    const item = this.inventory.get(itemId);
    if (!item) return null;

    const calc = this.calculateEOQ(item);
    calc.item_id = itemId;
    return calc;
  }

  // --------------------------------------------------------------------------
  // ABC Analysis
  // --------------------------------------------------------------------------

  performABCAnalysis(): ABCAnalysis {
    const items = Array.from(this.inventory.values());
    const itemValues = items.map((item) => ({
      item_id: item.item_id,
      annual_value: item.annual_demand * item.unit_cost,
    }));

    itemValues.sort((a, b) => b.annual_value - a.annual_value);

    const totalValue = itemValues.reduce((sum, i) => sum + i.annual_value, 0);

    const classA: ABCAnalysis["class_A"] = [];
    const classB: ABCAnalysis["class_B"] = [];
    const classC: ABCAnalysis["class_C"] = [];

    let cumulative = 0;
    for (const item of itemValues) {
      cumulative += item.annual_value;
      const cumulativePct = (cumulative / totalValue) * 100;

      const entry = {
        item_id: item.item_id,
        annual_value: Math.round(item.annual_value * 100) / 100,
        cumulative_pct: Math.round(cumulativePct * 10) / 10,
      };

      if (cumulativePct <= 80) {
        classA.push(entry);
      } else if (cumulativePct <= 95) {
        classB.push(entry);
      } else {
        classC.push(entry);
      }
    }

    return {
      class_A: classA,
      class_B: classB,
      class_C: classC,
      total_items: items.length,
      total_annual_value: Math.round(totalValue * 100) / 100,
      class_thresholds: { A: 80, B: 95 },
    };
  }

  private updateABCClassification(): void {
    const analysis = this.performABCAnalysis();

    for (const item of analysis.class_A) {
      const record = this.inventory.get(item.item_id);
      if (record) {
        record.abc_class = "A";
        this.inventory.set(item.item_id, record);
      }
    }

    for (const item of analysis.class_B) {
      const record = this.inventory.get(item.item_id);
      if (record) {
        record.abc_class = "B";
        this.inventory.set(item.item_id, record);
      }
    }

    for (const item of analysis.class_C) {
      const record = this.inventory.get(item.item_id);
      if (record) {
        record.abc_class = "C";
        this.inventory.set(item.item_id, record);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Demand Forecasting
  // --------------------------------------------------------------------------

  forecastDemand(itemId: string, periodsAhead: number = 3): DemandForecast[] {
    const item = this.inventory.get(itemId);
    if (!item) return [];

    const forecasts: DemandForecast[] = [];
    const monthlyDemand = item.annual_demand / 12;

    let trend: DemandForecast["trend"] = "stable";
    if (item.usage_history.length >= 6) {
      const recentUsage = item.usage_history.slice(-3).reduce((s, u) => s + u.quantity_used, 0);
      const olderUsage = item.usage_history.slice(-6, -3).reduce((s, u) => s + u.quantity_used, 0);
      if (recentUsage > olderUsage * 1.1) trend = "increasing";
      else if (recentUsage < olderUsage * 0.9) trend = "decreasing";
    }

    const trendFactor = trend === "increasing" ? 1.05 : trend === "decreasing" ? 0.95 : 1.0;
    const stdDev = monthlyDemand * 0.2;

    for (let i = 1; i <= periodsAhead; i++) {
      const predictedDemand = Math.round(monthlyDemand * Math.pow(trendFactor, i));
      const periodDate = new Date();
      periodDate.setMonth(periodDate.getMonth() + i);

      forecasts.push({
        item_id: itemId,
        forecast_period: periodDate.toISOString().substring(0, 7),
        predicted_demand: predictedDemand,
        confidence_interval: {
          lower: Math.round(predictedDemand - 1.96 * stdDev),
          upper: Math.round(predictedDemand + 1.96 * stdDev),
        },
        trend,
        seasonality_factor: 1.0,
        method: "exponential_smoothing",
      });
    }

    return forecasts;
  }

  // --------------------------------------------------------------------------
  // Stockout Risk Analysis
  // --------------------------------------------------------------------------

  assessStockoutRisk(): StockoutRisk[] {
    const risks: StockoutRisk[] = [];

    for (const item of this.inventory.values()) {
      const dailyDemand = item.annual_demand / WORKING_DAYS_PER_YEAR;
      const daysOfSupply = dailyDemand > 0 ? item.current_quantity / dailyDemand : 999;

      let riskLevel: StockoutRisk["risk_level"];
      let recommendedAction: string;

      if (daysOfSupply <= item.lead_time_days) {
        riskLevel = "critical";
        recommendedAction = `URGENT: Order ${item.eoq} units immediately`;
      } else if (item.current_quantity <= item.reorder_point) {
        riskLevel = "warning";
        recommendedAction = `Place order for ${item.eoq} units`;
      } else if (item.current_quantity <= item.reorder_point * 1.5) {
        riskLevel = "watch";
        recommendedAction = "Monitor closely, prepare to reorder";
      } else {
        riskLevel = "safe";
        recommendedAction = "No action required";
      }

      const expectedStockoutDate =
        riskLevel === "critical" || riskLevel === "warning"
          ? new Date(Date.now() + daysOfSupply * 24 * 60 * 60 * 1000).toISOString()
          : null;

      risks.push({
        item_id: item.item_id,
        description: item.description,
        current_quantity: item.current_quantity,
        days_of_supply: Math.round(daysOfSupply * 10) / 10,
        risk_level: riskLevel,
        expected_stockout_date: expectedStockoutDate,
        recommended_action: recommendedAction,
      });
    }

    return risks.sort((a, b) => {
      const riskOrder = { critical: 0, warning: 1, watch: 2, safe: 3 };
      return riskOrder[a.risk_level] - riskOrder[b.risk_level];
    });
  }

  // --------------------------------------------------------------------------
  // Turnover Analysis
  // --------------------------------------------------------------------------

  analyzeTurnover(): TurnoverAnalysis[] {
    const analyses: TurnoverAnalysis[] = [];

    for (const item of this.inventory.values()) {
      const avgInventory = item.current_quantity;
      const turnsPerYear = avgInventory > 0 ? item.annual_demand / avgInventory : 0;
      const daysOnHand = turnsPerYear > 0 ? 365 / turnsPerYear : 999;

      let classification: TurnoverAnalysis["classification"];
      let recommendation: string;

      if (turnsPerYear >= 12) {
        classification = "fast_moving";
        recommendation = "Consider increasing safety stock";
      } else if (turnsPerYear >= 4) {
        classification = "moderate";
        recommendation = "Inventory levels appropriate";
      } else if (turnsPerYear >= 1) {
        classification = "slow_moving";
        recommendation = "Reduce order quantities, consider alternatives";
      } else {
        classification = "dead_stock";
        recommendation = "Review for obsolescence, liquidate if possible";
      }

      analyses.push({
        item_id: item.item_id,
        description: item.description,
        turns_per_year: Math.round(turnsPerYear * 10) / 10,
        days_inventory_on_hand: Math.round(daysOnHand),
        classification,
        recommendation,
      });
    }

    return analyses.sort((a, b) => b.turns_per_year - a.turns_per_year);
  }

  // --------------------------------------------------------------------------
  // Inventory Health Report
  // --------------------------------------------------------------------------

  generateHealthReport(): InventoryHealthReport {
    const items = Array.from(this.inventory.values());
    const abcAnalysis = this.performABCAnalysis();
    const stockoutRisks = this.assessStockoutRisk();
    const turnoverAnalysis = this.analyzeTurnover();

    const totalValue = items.reduce((sum, i) => sum + i.current_quantity * i.unit_cost, 0);

    const aValue = abcAnalysis.class_A.reduce((s, i) => s + i.annual_value, 0);
    const bValue = abcAnalysis.class_B.reduce((s, i) => s + i.annual_value, 0);
    const cValue = abcAnalysis.class_C.reduce((s, i) => s + i.annual_value, 0);
    const totalAnnualValue = abcAnalysis.total_annual_value;

    const avgTurnover =
      turnoverAnalysis.reduce((s, t) => s + t.turns_per_year, 0) / turnoverAnalysis.length || 0;

    const stockoutRiskItems = stockoutRisks.filter(
      (r) => r.risk_level === "critical" || r.risk_level === "warning"
    ).length;

    const overstockItems = items.filter((i) => i.current_quantity > i.eoq * 2).length;
    const deadStockItems = turnoverAnalysis.filter((t) => t.classification === "dead_stock").length;

    const itemsWithStock = items.filter((i) => i.current_quantity > 0).length;
    const fillRate = (itemsWithStock / items.length) * 100;

    const recommendations: string[] = [];

    if (stockoutRiskItems > 0) {
      recommendations.push(`${stockoutRiskItems} items at stockout risk - review and reorder`);
    }

    if (overstockItems > 0) {
      recommendations.push(`${overstockItems} items overstocked - reduce order quantities`);
    }

    if (deadStockItems > 0) {
      recommendations.push(`${deadStockItems} items are dead stock - evaluate for liquidation`);
    }

    if (avgTurnover < 4) {
      recommendations.push("Overall turnover below target - review inventory levels");
    }

    if (recommendations.length === 0) {
      recommendations.push("Inventory health is good - maintain current practices");
    }

    return {
      total_inventory_value: Math.round(totalValue * 100) / 100,
      abc_distribution: {
        A_pct: Math.round((aValue / totalAnnualValue) * 1000) / 10,
        B_pct: Math.round((bValue / totalAnnualValue) * 1000) / 10,
        C_pct: Math.round((cValue / totalAnnualValue) * 1000) / 10,
      },
      average_turnover: Math.round(avgTurnover * 10) / 10,
      stockout_risk_items: stockoutRiskItems,
      overstock_items: overstockItems,
      dead_stock_items: deadStockItems,
      fill_rate: Math.round(fillRate * 10) / 10,
      recommendations,
    };
  }

  // --------------------------------------------------------------------------
  // Record Usage
  // --------------------------------------------------------------------------

  recordUsage(itemId: string, jobId: string, quantity: number): InventoryRecord | null {
    const item = this.inventory.get(itemId);
    if (!item) return null;

    item.current_quantity = Math.max(0, item.current_quantity - quantity);
    item.last_usage = new Date().toISOString();
    item.usage_history.push({
      date: item.last_usage,
      job_id: jobId,
      quantity_used: quantity,
      unit_cost_at_time: item.unit_cost,
    });

    this.inventory.set(itemId, item);
    return item;
  }

  // --------------------------------------------------------------------------
  // Accessors
  // --------------------------------------------------------------------------

  getInventoryItem(itemId: string): InventoryRecord | null {
    return this.inventory.get(itemId) || null;
  }

  getAllInventory(): InventoryRecord[] {
    return Array.from(this.inventory.values());
  }

  getItemsByClass(abcClass: "A" | "B" | "C"): InventoryRecord[] {
    return Array.from(this.inventory.values()).filter((i) => i.abc_class === abcClass);
  }

  getItemsBelowReorderPoint(): InventoryRecord[] {
    return Array.from(this.inventory.values()).filter(
      (i) => i.current_quantity <= i.reorder_point
    );
  }

  updateInventory(itemId: string, updates: Partial<Omit<InventoryRecord, "item_id">>): InventoryRecord | null {
    const item = this.inventory.get(itemId);
    if (!item) return null;

    const updated = { ...item, ...updates };

    if (updates.annual_demand || updates.order_cost || updates.unit_cost || updates.holding_cost_pct) {
      const eoqCalc = this.calculateEOQ(updated);
      updated.eoq = eoqCalc.eoq;
      updated.reorder_point = eoqCalc.reorder_point;
      updated.safety_stock = eoqCalc.safety_stock;
    }

    this.inventory.set(itemId, updated);
    this.updateABCClassification();

    return updated;
  }

  addInventoryItem(item: Omit<InventoryRecord, "abc_class" | "eoq" | "reorder_point" | "safety_stock">): InventoryRecord {
    const eoqCalc = this.calculateEOQ(item);
    const record: InventoryRecord = {
      ...item,
      abc_class: "C",
      eoq: eoqCalc.eoq,
      reorder_point: eoqCalc.reorder_point,
      safety_stock: eoqCalc.safety_stock,
    };

    this.inventory.set(item.item_id, record);
    this.updateABCClassification();

    return record;
  }

  clearAll(): void {
    this.inventory.clear();
    this.initializeDefaultInventory();
  }
}

export const latheInventoryIntelligenceEngine = new LatheInventoryIntelligenceEngine();
