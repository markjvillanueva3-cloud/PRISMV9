/**
 * LeadTimeEngine — R25-MS3: Lead Time Forecasting & Delivery Tracking
 *
 * Actions:
 *   lt_forecast  — predict lead times based on historical data & supplier patterns
 *   lt_track     — track active orders and delivery status
 *   lt_disrupt   — identify supply chain disruptions and risk alerts
 *   lt_expedite  — recommend expediting strategies for critical orders
 *
 * Depends on: R1 registries (material data), R25-MS1 (supplier data)
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

interface SupplierLeadTime {
  supplier_id: string;
  supplier_name: string;
  material_id: string;
  material_name: string;
  quoted_days: number;
  historical_avg_days: number;
  historical_std_days: number;
  on_time_pct: number;         // 0-100
  last_delivery_days: number;
  trend: "improving" | "stable" | "degrading";
}

interface ActiveOrder {
  order_id: string;
  supplier_id: string;
  supplier_name: string;
  material_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  order_date: string;          // ISO date
  promised_date: string;       // ISO date
  status: "confirmed" | "in_production" | "shipped" | "in_transit" | "customs" | "delivered" | "delayed";
  tracking_ref?: string;
  last_update: string;
  estimated_arrival?: string;
  priority: "standard" | "high" | "critical";
}

interface DisruptionAlert {
  id: string;
  type: "supplier_delay" | "logistics" | "geopolitical" | "natural_disaster" | "quality_issue" | "capacity_constraint";
  severity: "low" | "medium" | "high" | "critical";
  affected_suppliers: string[];
  affected_materials: string[];
  region: string;
  description: string;
  start_date: string;
  estimated_resolution?: string;
  impact_days: number;
  mitigation: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const SUPPLIER_LEAD_TIMES: SupplierLeadTime[] = [
  { supplier_id: "SUP001", supplier_name: "SteelCorp Global", material_id: "MAT001", material_name: "4140 Steel Bar", quoted_days: 14, historical_avg_days: 16.2, historical_std_days: 3.1, on_time_pct: 78, last_delivery_days: 15, trend: "stable" },
  { supplier_id: "SUP002", supplier_name: "PrecisionAlloys Inc", material_id: "MAT002", material_name: "Ti-6Al-4V Rod", quoted_days: 28, historical_avg_days: 32.5, historical_std_days: 5.8, on_time_pct: 65, last_delivery_days: 35, trend: "degrading" },
  { supplier_id: "SUP003", supplier_name: "AlumTech Solutions", material_id: "MAT003", material_name: "7075-T6 Plate", quoted_days: 10, historical_avg_days: 11.1, historical_std_days: 2.0, on_time_pct: 88, last_delivery_days: 10, trend: "improving" },
  { supplier_id: "SUP004", supplier_name: "CarbideMasters Ltd", material_id: "MAT004", material_name: "Tungsten Carbide Inserts", quoted_days: 21, historical_avg_days: 23.8, historical_std_days: 4.5, on_time_pct: 72, last_delivery_days: 26, trend: "degrading" },
  { supplier_id: "SUP005", supplier_name: "ToolPro Industries", material_id: "MAT005", material_name: "HSS End Mills", quoted_days: 7, historical_avg_days: 7.5, historical_std_days: 1.2, on_time_pct: 92, last_delivery_days: 7, trend: "stable" },
  { supplier_id: "SUP001", supplier_name: "SteelCorp Global", material_id: "MAT006", material_name: "316L Stainless Sheet", quoted_days: 18, historical_avg_days: 20.3, historical_std_days: 3.8, on_time_pct: 74, last_delivery_days: 22, trend: "degrading" },
  { supplier_id: "SUP006", supplier_name: "CompositeTech Asia", material_id: "MAT007", material_name: "Carbon Fiber Prepreg", quoted_days: 35, historical_avg_days: 38.2, historical_std_days: 6.5, on_time_pct: 62, last_delivery_days: 40, trend: "degrading" },
  { supplier_id: "SUP003", supplier_name: "AlumTech Solutions", material_id: "MAT008", material_name: "6061-T6 Extrusion", quoted_days: 12, historical_avg_days: 12.8, historical_std_days: 1.8, on_time_pct: 86, last_delivery_days: 12, trend: "improving" },
  { supplier_id: "SUP007", supplier_name: "CeramPro GmbH", material_id: "MAT009", material_name: "Silicon Nitride Blanks", quoted_days: 42, historical_avg_days: 48.0, historical_std_days: 8.2, on_time_pct: 58, last_delivery_days: 52, trend: "degrading" },
  { supplier_id: "SUP008", supplier_name: "FastBrass Co", material_id: "MAT010", material_name: "C360 Brass Rod", quoted_days: 5, historical_avg_days: 5.3, historical_std_days: 0.8, on_time_pct: 95, last_delivery_days: 5, trend: "stable" },
];

const ACTIVE_ORDERS: ActiveOrder[] = [
  { order_id: "PO-2025-001", supplier_id: "SUP001", supplier_name: "SteelCorp Global", material_id: "MAT001", material_name: "4140 Steel Bar", quantity: 500, unit: "kg", order_date: "2025-01-15", promised_date: "2025-02-01", status: "in_transit", tracking_ref: "TRK-88421", last_update: "2025-01-28", estimated_arrival: "2025-02-03", priority: "standard" },
  { order_id: "PO-2025-002", supplier_id: "SUP002", supplier_name: "PrecisionAlloys Inc", material_id: "MAT002", material_name: "Ti-6Al-4V Rod", quantity: 50, unit: "kg", order_date: "2025-01-10", promised_date: "2025-02-10", status: "delayed", tracking_ref: "TRK-88305", last_update: "2025-02-05", estimated_arrival: "2025-02-18", priority: "critical" },
  { order_id: "PO-2025-003", supplier_id: "SUP003", supplier_name: "AlumTech Solutions", material_id: "MAT003", material_name: "7075-T6 Plate", quantity: 200, unit: "kg", order_date: "2025-01-20", promised_date: "2025-02-01", status: "delivered", last_update: "2025-01-30", priority: "standard" },
  { order_id: "PO-2025-004", supplier_id: "SUP004", supplier_name: "CarbideMasters Ltd", material_id: "MAT004", material_name: "Tungsten Carbide Inserts", quantity: 100, unit: "pcs", order_date: "2025-01-18", promised_date: "2025-02-10", status: "in_production", last_update: "2025-01-30", estimated_arrival: "2025-02-12", priority: "high" },
  { order_id: "PO-2025-005", supplier_id: "SUP005", supplier_name: "ToolPro Industries", material_id: "MAT005", material_name: "HSS End Mills", quantity: 50, unit: "pcs", order_date: "2025-01-25", promised_date: "2025-02-03", status: "shipped", tracking_ref: "TRK-88510", last_update: "2025-01-31", estimated_arrival: "2025-02-02", priority: "standard" },
  { order_id: "PO-2025-006", supplier_id: "SUP006", supplier_name: "CompositeTech Asia", material_id: "MAT007", material_name: "Carbon Fiber Prepreg", quantity: 30, unit: "rolls", order_date: "2025-01-05", promised_date: "2025-02-12", status: "customs", tracking_ref: "TRK-88199", last_update: "2025-02-06", estimated_arrival: "2025-02-14", priority: "high" },
  { order_id: "PO-2025-007", supplier_id: "SUP007", supplier_name: "CeramPro GmbH", material_id: "MAT009", material_name: "Silicon Nitride Blanks", quantity: 20, unit: "pcs", order_date: "2024-12-20", promised_date: "2025-02-05", status: "delayed", tracking_ref: "TRK-87990", last_update: "2025-02-01", estimated_arrival: "2025-02-20", priority: "critical" },
  { order_id: "PO-2025-008", supplier_id: "SUP008", supplier_name: "FastBrass Co", material_id: "MAT010", material_name: "C360 Brass Rod", quantity: 300, unit: "kg", order_date: "2025-01-28", promised_date: "2025-02-04", status: "confirmed", last_update: "2025-01-28", estimated_arrival: "2025-02-03", priority: "standard" },
];

const DISRUPTION_ALERTS: DisruptionAlert[] = [
  { id: "DISR-001", type: "logistics", severity: "high", affected_suppliers: ["SUP002", "SUP006"], affected_materials: ["MAT002", "MAT007"], region: "Asia-Pacific", description: "Port congestion at major Asian shipping hubs causing 5-10 day delays", start_date: "2025-01-20", estimated_resolution: "2025-02-15", impact_days: 8, mitigation: "Reroute via air freight for critical orders; negotiate partial shipments" },
  { id: "DISR-002", type: "supplier_delay", severity: "critical", affected_suppliers: ["SUP007"], affected_materials: ["MAT009"], region: "Europe", description: "CeramPro GmbH furnace breakdown — production halted for specialty ceramics", start_date: "2025-01-25", estimated_resolution: "2025-02-20", impact_days: 15, mitigation: "Source from alternate ceramic supplier Kyocera; accept longer lead time" },
  { id: "DISR-003", type: "geopolitical", severity: "medium", affected_suppliers: ["SUP001", "SUP006"], affected_materials: ["MAT001", "MAT006", "MAT007"], region: "Global", description: "New tariff regulations on steel and composite imports pending review", start_date: "2025-02-01", estimated_resolution: "2025-03-01", impact_days: 5, mitigation: "Stockpile affected materials; explore domestic sourcing alternatives" },
  { id: "DISR-004", type: "quality_issue", severity: "medium", affected_suppliers: ["SUP004"], affected_materials: ["MAT004"], region: "North America", description: "Recent carbide insert batch showed micro-porosity defects — under investigation", start_date: "2025-01-28", estimated_resolution: "2025-02-10", impact_days: 3, mitigation: "Increase incoming inspection; hold affected lot pending analysis" },
  { id: "DISR-005", type: "capacity_constraint", severity: "low", affected_suppliers: ["SUP005"], affected_materials: ["MAT005"], region: "North America", description: "ToolPro running at 95% capacity — may push standard orders by 1-2 days", start_date: "2025-02-01", estimated_resolution: "2025-02-15", impact_days: 2, mitigation: "Submit orders early; consolidate POs for priority processing" },
  { id: "DISR-006", type: "natural_disaster", severity: "high", affected_suppliers: ["SUP006"], affected_materials: ["MAT007"], region: "Southeast Asia", description: "Flooding in composite manufacturing region affecting raw material supply", start_date: "2025-02-03", estimated_resolution: "2025-03-01", impact_days: 12, mitigation: "Activate safety stock; source from European composite suppliers" },
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function forecastLeadTime(lt: SupplierLeadTime): {
  p50_days: number; p90_days: number; confidence: number; risk_flag: boolean;
} {
  // Simple statistical forecast: use mean + std dev for percentiles
  const trendAdj = lt.trend === "degrading" ? 1.15 : lt.trend === "improving" ? 0.92 : 1.0;
  const adjustedMean = lt.historical_avg_days * trendAdj;
  const p50 = Math.round(adjustedMean * 10) / 10;
  const p90 = Math.round((adjustedMean + 1.28 * lt.historical_std_days) * 10) / 10;
  const confidence = Math.min(99, Math.round(lt.on_time_pct * 0.8 + (1 / (1 + lt.historical_std_days)) * 20));
  const risk_flag = lt.on_time_pct < 70 || lt.trend === "degrading";
  return { p50_days: p50, p90_days: p90, confidence, risk_flag };
}

function calculateOrderRisk(order: ActiveOrder): {
  risk_level: "low" | "medium" | "high" | "critical";
  days_remaining: number;
  delay_probability: number;
} {
  const today = "2025-02-07"; // simulation reference date
  const daysToPromised = daysBetween(today, order.promised_date);
  const elapsed = daysBetween(order.order_date, today);
  const totalPlanned = daysBetween(order.order_date, order.promised_date);
  const progressPct = totalPlanned > 0 ? (elapsed / totalPlanned) * 100 : 100;

  let delayProb = 0;
  if (order.status === "delayed") delayProb = 85;
  else if (order.status === "customs") delayProb = 40;
  else if (order.status === "in_transit") delayProb = 15;
  else if (order.status === "in_production" && progressPct > 80) delayProb = 35;
  else if (order.status === "confirmed" && progressPct > 50) delayProb = 25;
  else delayProb = 10;

  // Adjust for priority and disruptions
  const disruptions = DISRUPTION_ALERTS.filter(d =>
    d.affected_suppliers.includes(order.supplier_id) && d.severity !== "low"
  );
  if (disruptions.length > 0) delayProb = Math.min(95, delayProb + disruptions.length * 15);

  const risk_level: "low" | "medium" | "high" | "critical" =
    delayProb >= 70 ? "critical" : delayProb >= 45 ? "high" : delayProb >= 25 ? "medium" : "low";

  return { risk_level, days_remaining: Math.max(0, daysToPromised), delay_probability: delayProb };
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

function handleLtForecast(params: Record<string, unknown>): unknown {
  const materialId = params.material_id as string | undefined;
  const supplierId = params.supplier_id as string | undefined;

  let entries = SUPPLIER_LEAD_TIMES;
  if (materialId) entries = entries.filter(e => e.material_id === materialId);
  if (supplierId) entries = entries.filter(e => e.supplier_id === supplierId);

  const forecasts = entries.map(e => {
    const fc = forecastLeadTime(e);
    return {
      supplier_id: e.supplier_id,
      supplier_name: e.supplier_name,
      material_id: e.material_id,
      material_name: e.material_name,
      quoted_days: e.quoted_days,
      forecast: fc,
      historical: {
        avg_days: e.historical_avg_days,
        std_days: e.historical_std_days,
        on_time_pct: e.on_time_pct,
        trend: e.trend,
      },
    };
  });

  const atRisk = forecasts.filter(f => f.forecast.risk_flag);
  const avgP50 = forecasts.length > 0
    ? Math.round(forecasts.reduce((s, f) => s + f.forecast.p50_days, 0) / forecasts.length * 10) / 10
    : 0;

  return {
    action: "lt_forecast",
    total_forecasts: forecasts.length,
    forecasts,
    summary: {
      avg_p50_days: avgP50,
      at_risk_count: atRisk.length,
      at_risk_suppliers: atRisk.map(f => f.supplier_name),
    },
  };
}

function handleLtTrack(params: Record<string, unknown>): unknown {
  const orderId = params.order_id as string | undefined;
  const status = params.status as string | undefined;
  const priority = params.priority as string | undefined;
  const supplierId = params.supplier_id as string | undefined;

  let orders = ACTIVE_ORDERS;
  if (orderId) orders = orders.filter(o => o.order_id === orderId);
  if (status) orders = orders.filter(o => o.status === status);
  if (priority) orders = orders.filter(o => o.priority === priority);
  if (supplierId) orders = orders.filter(o => o.supplier_id === supplierId);

  const tracked = orders.map(o => {
    const risk = calculateOrderRisk(o);
    return { ...o, risk_assessment: risk };
  });

  const delayed = tracked.filter(t => t.status === "delayed");
  const critical = tracked.filter(t => t.priority === "critical");
  const highRisk = tracked.filter(t => t.risk_assessment.risk_level === "critical" || t.risk_assessment.risk_level === "high");

  return {
    action: "lt_track",
    total_orders: tracked.length,
    orders: tracked,
    summary: {
      delayed_count: delayed.length,
      critical_priority: critical.length,
      high_risk_count: highRisk.length,
      status_breakdown: {
        confirmed: tracked.filter(t => t.status === "confirmed").length,
        in_production: tracked.filter(t => t.status === "in_production").length,
        shipped: tracked.filter(t => t.status === "shipped").length,
        in_transit: tracked.filter(t => t.status === "in_transit").length,
        customs: tracked.filter(t => t.status === "customs").length,
        delivered: tracked.filter(t => t.status === "delivered").length,
        delayed: delayed.length,
      },
    },
  };
}

function handleLtDisrupt(params: Record<string, unknown>): unknown {
  const severity = params.severity as string | undefined;
  const supplierId = params.supplier_id as string | undefined;
  const materialId = params.material_id as string | undefined;

  let alerts = DISRUPTION_ALERTS;
  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (supplierId) alerts = alerts.filter(a => a.affected_suppliers.includes(supplierId));
  if (materialId) alerts = alerts.filter(a => a.affected_materials.includes(materialId));

  // Cross-reference with active orders
  const impactedOrders = ACTIVE_ORDERS.filter(o =>
    alerts.some(a => a.affected_suppliers.includes(o.supplier_id))
  ).map(o => ({
    order_id: o.order_id,
    material_name: o.material_name,
    supplier_name: o.supplier_name,
    priority: o.priority,
    status: o.status,
  }));

  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const totalImpactDays = alerts.reduce((s, a) => s + a.impact_days, 0);

  return {
    action: "lt_disrupt",
    total_alerts: alerts.length,
    alerts,
    impacted_orders: impactedOrders,
    summary: {
      critical_count: criticalAlerts.length,
      total_impact_days: totalImpactDays,
      impacted_orders_count: impactedOrders.length,
      affected_regions: [...new Set(alerts.map(a => a.region))],
      severity_breakdown: {
        critical: alerts.filter(a => a.severity === "critical").length,
        high: alerts.filter(a => a.severity === "high").length,
        medium: alerts.filter(a => a.severity === "medium").length,
        low: alerts.filter(a => a.severity === "low").length,
      },
    },
  };
}

function handleLtExpedite(params: Record<string, unknown>): unknown {
  const orderId = params.order_id as string | undefined;
  const maxBudgetPct = (params.max_budget_increase_pct as number) || 30;

  // Find orders that need expediting
  const candidates = orderId
    ? ACTIVE_ORDERS.filter(o => o.order_id === orderId)
    : ACTIVE_ORDERS.filter(o =>
        o.status === "delayed" || o.priority === "critical" ||
        (o.priority === "high" && o.status !== "delivered")
      );

  const strategies = candidates.map(order => {
    const risk = calculateOrderRisk(order);
    const lt = SUPPLIER_LEAD_TIMES.find(l =>
      l.supplier_id === order.supplier_id && l.material_id === order.material_id
    );
    const disruptions = DISRUPTION_ALERTS.filter(d =>
      d.affected_suppliers.includes(order.supplier_id)
    );

    const options: Array<{
      method: string; cost_increase_pct: number; time_saved_days: number;
      feasibility: "high" | "medium" | "low"; recommendation: string;
    }> = [];

    // Air freight option
    if (["in_transit", "shipped", "customs"].includes(order.status)) {
      options.push({
        method: "Air Freight Upgrade",
        cost_increase_pct: 25,
        time_saved_days: Math.min(5, risk.days_remaining),
        feasibility: maxBudgetPct >= 25 ? "high" : "low",
        recommendation: "Convert sea/ground shipment to air freight",
      });
    }

    // Partial shipment
    if (["in_production", "confirmed"].includes(order.status)) {
      options.push({
        method: "Partial Shipment",
        cost_increase_pct: 10,
        time_saved_days: Math.round((lt?.historical_avg_days || 14) * 0.3),
        feasibility: "medium",
        recommendation: "Request 50% partial shipment to cover immediate needs",
      });
    }

    // Alternative supplier
    if (disruptions.length > 0 || (lt && lt.on_time_pct < 70)) {
      options.push({
        method: "Alternative Supplier",
        cost_increase_pct: 15,
        time_saved_days: Math.round((lt?.historical_avg_days || 14) * 0.4),
        feasibility: "medium",
        recommendation: "Source from backup supplier with better delivery performance",
      });
    }

    // Priority queue upgrade
    options.push({
      method: "Priority Queue Upgrade",
      cost_increase_pct: 8,
      time_saved_days: 2,
      feasibility: "high",
      recommendation: "Negotiate priority processing with supplier",
    });

    // Filter by budget
    const viable = options.filter(o => o.cost_increase_pct <= maxBudgetPct);
    const bestOption = viable.sort((a, b) => b.time_saved_days - a.time_saved_days)[0] || null;

    return {
      order_id: order.order_id,
      material_name: order.material_name,
      supplier_name: order.supplier_name,
      current_status: order.status,
      priority: order.priority,
      risk_level: risk.risk_level,
      delay_probability: risk.delay_probability,
      expedite_options: viable,
      recommended: bestOption,
      active_disruptions: disruptions.length,
    };
  });

  const totalSavings = strategies.reduce((s, st) =>
    s + (st.recommended?.time_saved_days || 0), 0
  );

  return {
    action: "lt_expedite",
    total_orders_evaluated: strategies.length,
    strategies,
    budget_constraint_pct: maxBudgetPct,
    summary: {
      orders_with_options: strategies.filter(s => s.expedite_options.length > 0).length,
      total_potential_days_saved: totalSavings,
      critical_orders: strategies.filter(s => s.risk_level === "critical").length,
      avg_cost_increase: strategies.length > 0
        ? Math.round(strategies.reduce((s, st) => s + (st.recommended?.cost_increase_pct || 0), 0) / strategies.length * 10) / 10
        : 0,
    },
  };
}

// ─── Public Dispatcher ────────────────────────────────────────────────────────

export function executeLeadTimeAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "lt_forecast":  return handleLtForecast(params);
    case "lt_track":     return handleLtTrack(params);
    case "lt_disrupt":   return handleLtDisrupt(params);
    case "lt_expedite":  return handleLtExpedite(params);
    default:
      throw new Error(`LeadTimeEngine: unknown action "${action}"`);
  }
}
