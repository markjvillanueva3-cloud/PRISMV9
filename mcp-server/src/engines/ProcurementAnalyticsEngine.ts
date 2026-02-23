/**
 * ProcurementAnalyticsEngine — R25-MS4: Spend Analysis & Contract Management
 *
 * Actions:
 *   proc_spend    — analyze procurement spending patterns by category, supplier, period
 *   proc_contract — manage and evaluate supplier contracts
 *   proc_optimize — recommend procurement optimization strategies
 *   proc_report   — generate procurement performance reports
 *
 * Depends on: R1 registries, R25-MS1 (supplier data), R25-MS2 (material pricing)
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

interface PurchaseRecord {
  po_id: string;
  supplier_id: string;
  supplier_name: string;
  category: "raw_material" | "tooling" | "consumables" | "spare_parts" | "services";
  material_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  currency: string;
  order_date: string;
  delivery_date: string;
  quality_score: number;  // 1-10
  on_time: boolean;
}

interface SupplierContract {
  contract_id: string;
  supplier_id: string;
  supplier_name: string;
  contract_type: "fixed_price" | "volume_discount" | "blanket" | "framework" | "spot";
  categories: string[];
  start_date: string;
  end_date: string;
  status: "active" | "expiring_soon" | "expired" | "under_review";
  annual_value: number;
  discount_pct: number;
  payment_terms_days: number;
  min_order_value: number;
  penalty_clause: boolean;
  performance_threshold: number; // min quality score
  renewal_option: boolean;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const PURCHASE_HISTORY: PurchaseRecord[] = [
  { po_id: "PO-2024-101", supplier_id: "SUP001", supplier_name: "SteelCorp Global", category: "raw_material", material_id: "MAT001", description: "4140 Steel Bar 25mm", quantity: 1000, unit: "kg", unit_price: 3.20, total_cost: 3200, currency: "USD", order_date: "2024-07-15", delivery_date: "2024-08-01", quality_score: 8, on_time: true },
  { po_id: "PO-2024-102", supplier_id: "SUP002", supplier_name: "PrecisionAlloys Inc", category: "raw_material", material_id: "MAT002", description: "Ti-6Al-4V Rod 12mm", quantity: 100, unit: "kg", unit_price: 85.00, total_cost: 8500, currency: "USD", order_date: "2024-07-20", delivery_date: "2024-08-22", quality_score: 9, on_time: false },
  { po_id: "PO-2024-103", supplier_id: "SUP003", supplier_name: "AlumTech Solutions", category: "raw_material", material_id: "MAT003", description: "7075-T6 Plate 10mm", quantity: 500, unit: "kg", unit_price: 8.50, total_cost: 4250, currency: "USD", order_date: "2024-08-01", delivery_date: "2024-08-12", quality_score: 9, on_time: true },
  { po_id: "PO-2024-104", supplier_id: "SUP004", supplier_name: "CarbideMasters Ltd", category: "tooling", material_id: "MAT004", description: "Tungsten Carbide Inserts CNMG", quantity: 200, unit: "pcs", unit_price: 12.50, total_cost: 2500, currency: "USD", order_date: "2024-08-10", delivery_date: "2024-09-02", quality_score: 7, on_time: true },
  { po_id: "PO-2024-105", supplier_id: "SUP005", supplier_name: "ToolPro Industries", category: "tooling", material_id: "MAT005", description: "HSS End Mill 10mm 4-flute", quantity: 50, unit: "pcs", unit_price: 22.00, total_cost: 1100, currency: "USD", order_date: "2024-08-15", delivery_date: "2024-08-23", quality_score: 8, on_time: true },
  { po_id: "PO-2024-106", supplier_id: "SUP001", supplier_name: "SteelCorp Global", category: "raw_material", material_id: "MAT006", description: "316L Stainless Sheet 3mm", quantity: 300, unit: "kg", unit_price: 6.80, total_cost: 2040, currency: "USD", order_date: "2024-09-01", delivery_date: "2024-09-20", quality_score: 8, on_time: false },
  { po_id: "PO-2024-107", supplier_id: "SUP006", supplier_name: "CompositeTech Asia", category: "raw_material", material_id: "MAT007", description: "Carbon Fiber Prepreg 300gsm", quantity: 20, unit: "rolls", unit_price: 450.00, total_cost: 9000, currency: "USD", order_date: "2024-09-10", delivery_date: "2024-10-18", quality_score: 9, on_time: false },
  { po_id: "PO-2024-108", supplier_id: "SUP008", supplier_name: "FastBrass Co", category: "raw_material", material_id: "MAT010", description: "C360 Brass Rod 16mm", quantity: 500, unit: "kg", unit_price: 5.60, total_cost: 2800, currency: "USD", order_date: "2024-09-15", delivery_date: "2024-09-21", quality_score: 8, on_time: true },
  { po_id: "PO-2024-109", supplier_id: "SUP004", supplier_name: "CarbideMasters Ltd", category: "tooling", material_id: "MAT004", description: "Carbide Inserts WNMG", quantity: 150, unit: "pcs", unit_price: 14.00, total_cost: 2100, currency: "USD", order_date: "2024-10-01", delivery_date: "2024-10-25", quality_score: 6, on_time: false },
  { po_id: "PO-2024-110", supplier_id: "SUP003", supplier_name: "AlumTech Solutions", category: "raw_material", material_id: "MAT008", description: "6061-T6 Extrusion 50x50", quantity: 200, unit: "kg", unit_price: 7.20, total_cost: 1440, currency: "USD", order_date: "2024-10-05", delivery_date: "2024-10-18", quality_score: 9, on_time: true },
  { po_id: "PO-2024-111", supplier_id: "SUP007", supplier_name: "CeramPro GmbH", category: "raw_material", material_id: "MAT009", description: "Silicon Nitride Blanks 50mm", quantity: 10, unit: "pcs", unit_price: 320.00, total_cost: 3200, currency: "USD", order_date: "2024-10-10", delivery_date: "2024-11-28", quality_score: 10, on_time: false },
  { po_id: "PO-2024-112", supplier_id: "SUP005", supplier_name: "ToolPro Industries", category: "consumables", material_id: "CON001", description: "Coolant concentrate 20L", quantity: 10, unit: "drums", unit_price: 85.00, total_cost: 850, currency: "USD", order_date: "2024-10-20", delivery_date: "2024-10-28", quality_score: 7, on_time: true },
  { po_id: "PO-2024-113", supplier_id: "SUP001", supplier_name: "SteelCorp Global", category: "raw_material", material_id: "MAT001", description: "4140 Steel Bar 32mm", quantity: 800, unit: "kg", unit_price: 3.40, total_cost: 2720, currency: "USD", order_date: "2024-11-01", delivery_date: "2024-11-18", quality_score: 8, on_time: true },
  { po_id: "PO-2024-114", supplier_id: "SUP002", supplier_name: "PrecisionAlloys Inc", category: "raw_material", material_id: "MAT002", description: "Ti-6Al-4V Sheet 2mm", quantity: 50, unit: "kg", unit_price: 92.00, total_cost: 4600, currency: "USD", order_date: "2024-11-10", delivery_date: "2024-12-15", quality_score: 9, on_time: true },
  { po_id: "PO-2024-115", supplier_id: "SUP008", supplier_name: "FastBrass Co", category: "raw_material", material_id: "MAT010", description: "C360 Brass Hex 12mm", quantity: 400, unit: "kg", unit_price: 5.80, total_cost: 2320, currency: "USD", order_date: "2024-11-15", delivery_date: "2024-11-21", quality_score: 9, on_time: true },
  { po_id: "PO-2024-116", supplier_id: "SUP006", supplier_name: "CompositeTech Asia", category: "raw_material", material_id: "MAT007", description: "Carbon Fiber Prepreg 200gsm", quantity: 15, unit: "rolls", unit_price: 420.00, total_cost: 6300, currency: "USD", order_date: "2024-12-01", delivery_date: "2025-01-10", quality_score: 8, on_time: false },
];

const SUPPLIER_CONTRACTS: SupplierContract[] = [
  { contract_id: "CTR-001", supplier_id: "SUP001", supplier_name: "SteelCorp Global", contract_type: "volume_discount", categories: ["raw_material"], start_date: "2024-01-01", end_date: "2025-06-30", status: "active", annual_value: 25000, discount_pct: 8, payment_terms_days: 30, min_order_value: 500, penalty_clause: true, performance_threshold: 7, renewal_option: true },
  { contract_id: "CTR-002", supplier_id: "SUP002", supplier_name: "PrecisionAlloys Inc", contract_type: "framework", categories: ["raw_material"], start_date: "2024-03-01", end_date: "2025-02-28", status: "expiring_soon", annual_value: 40000, discount_pct: 5, payment_terms_days: 45, min_order_value: 2000, penalty_clause: false, performance_threshold: 8, renewal_option: true },
  { contract_id: "CTR-003", supplier_id: "SUP003", supplier_name: "AlumTech Solutions", contract_type: "blanket", categories: ["raw_material"], start_date: "2024-06-01", end_date: "2025-05-31", status: "active", annual_value: 15000, discount_pct: 10, payment_terms_days: 30, min_order_value: 300, penalty_clause: false, performance_threshold: 7, renewal_option: true },
  { contract_id: "CTR-004", supplier_id: "SUP004", supplier_name: "CarbideMasters Ltd", contract_type: "fixed_price", categories: ["tooling"], start_date: "2024-04-01", end_date: "2025-03-31", status: "active", annual_value: 12000, discount_pct: 6, payment_terms_days: 30, min_order_value: 200, penalty_clause: true, performance_threshold: 7, renewal_option: false },
  { contract_id: "CTR-005", supplier_id: "SUP005", supplier_name: "ToolPro Industries", contract_type: "blanket", categories: ["tooling", "consumables"], start_date: "2024-07-01", end_date: "2025-06-30", status: "active", annual_value: 8000, discount_pct: 7, payment_terms_days: 15, min_order_value: 100, penalty_clause: false, performance_threshold: 7, renewal_option: true },
  { contract_id: "CTR-006", supplier_id: "SUP006", supplier_name: "CompositeTech Asia", contract_type: "framework", categories: ["raw_material"], start_date: "2024-01-01", end_date: "2024-12-31", status: "expired", annual_value: 35000, discount_pct: 4, payment_terms_days: 60, min_order_value: 5000, penalty_clause: true, performance_threshold: 8, renewal_option: true },
  { contract_id: "CTR-007", supplier_id: "SUP007", supplier_name: "CeramPro GmbH", contract_type: "spot", categories: ["raw_material"], start_date: "2024-09-01", end_date: "2025-08-31", status: "active", annual_value: 10000, discount_pct: 0, payment_terms_days: 30, min_order_value: 1000, penalty_clause: false, performance_threshold: 9, renewal_option: false },
  { contract_id: "CTR-008", supplier_id: "SUP008", supplier_name: "FastBrass Co", contract_type: "volume_discount", categories: ["raw_material"], start_date: "2024-06-01", end_date: "2025-05-31", status: "active", annual_value: 12000, discount_pct: 12, payment_terms_days: 15, min_order_value: 200, penalty_clause: false, performance_threshold: 7, renewal_option: true },
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (groups[k] ??= []).push(item);
  }
  return groups;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length * 100) / 100 : 0;
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

function handleProcSpend(params: Record<string, unknown>): unknown {
  const category = params.category as string | undefined;
  const supplierId = params.supplier_id as string | undefined;
  const period = params.period as string | undefined; // "Q3-2024", "2024", etc.

  let records = PURCHASE_HISTORY;
  if (category) records = records.filter(r => r.category === category);
  if (supplierId) records = records.filter(r => r.supplier_id === supplierId);
  if (period) {
    if (period.startsWith("Q")) {
      const [q, year] = period.split("-");
      const qNum = parseInt(q.replace("Q", ""));
      const startMonth = (qNum - 1) * 3;
      records = records.filter(r => {
        const d = new Date(r.order_date);
        return d.getFullYear() === parseInt(year) && d.getMonth() >= startMonth && d.getMonth() < startMonth + 3;
      });
    } else {
      records = records.filter(r => r.order_date.startsWith(period));
    }
  }

  const totalSpend = records.reduce((s, r) => s + r.total_cost, 0);
  const totalOrders = records.length;

  // Category breakdown
  const byCategory = groupBy(records, r => r.category);
  const categoryBreakdown = Object.entries(byCategory).map(([cat, recs]) => ({
    category: cat,
    total_spend: recs.reduce((s, r) => s + r.total_cost, 0),
    order_count: recs.length,
    pct_of_total: totalSpend > 0 ? Math.round(recs.reduce((s, r) => s + r.total_cost, 0) / totalSpend * 1000) / 10 : 0,
  })).sort((a, b) => b.total_spend - a.total_spend);

  // Supplier breakdown
  const bySupplier = groupBy(records, r => r.supplier_name);
  const supplierBreakdown = Object.entries(bySupplier).map(([sup, recs]) => ({
    supplier: sup,
    total_spend: recs.reduce((s, r) => s + r.total_cost, 0),
    order_count: recs.length,
    avg_quality: avg(recs.map(r => r.quality_score)),
    on_time_pct: Math.round(recs.filter(r => r.on_time).length / recs.length * 100),
  })).sort((a, b) => b.total_spend - a.total_spend);

  return {
    action: "proc_spend",
    total_spend: totalSpend,
    total_orders: totalOrders,
    avg_order_value: totalOrders > 0 ? Math.round(totalSpend / totalOrders * 100) / 100 : 0,
    category_breakdown: categoryBreakdown,
    supplier_breakdown: supplierBreakdown,
    summary: {
      top_category: categoryBreakdown[0]?.category || "none",
      top_supplier: supplierBreakdown[0]?.supplier || "none",
      top_supplier_spend: supplierBreakdown[0]?.total_spend || 0,
      avg_quality_score: avg(records.map(r => r.quality_score)),
      overall_on_time_pct: records.length > 0 ? Math.round(records.filter(r => r.on_time).length / records.length * 100) : 0,
    },
  };
}

function handleProcContract(params: Record<string, unknown>): unknown {
  const contractId = params.contract_id as string | undefined;
  const status = params.status as string | undefined;
  const supplierId = params.supplier_id as string | undefined;

  let contracts = SUPPLIER_CONTRACTS;
  if (contractId) contracts = contracts.filter(c => c.contract_id === contractId);
  if (status) contracts = contracts.filter(c => c.status === status);
  if (supplierId) contracts = contracts.filter(c => c.supplier_id === supplierId);

  // Enrich with purchase performance
  const enriched = contracts.map(c => {
    const purchases = PURCHASE_HISTORY.filter(p => p.supplier_id === c.supplier_id);
    const actualSpend = purchases.reduce((s, p) => s + p.total_cost, 0);
    const avgQuality = avg(purchases.map(p => p.quality_score));
    const onTimePct = purchases.length > 0
      ? Math.round(purchases.filter(p => p.on_time).length / purchases.length * 100)
      : 0;
    const meetsThreshold = avgQuality >= c.performance_threshold;
    const daysToExpiry = Math.round(
      (new Date(c.end_date).getTime() - new Date("2025-02-07").getTime()) / 86400000
    );

    return {
      ...c,
      performance: {
        actual_spend: actualSpend,
        utilization_pct: c.annual_value > 0 ? Math.round(actualSpend / c.annual_value * 100) : 0,
        avg_quality: avgQuality,
        on_time_pct: onTimePct,
        meets_threshold: meetsThreshold,
        order_count: purchases.length,
      },
      days_to_expiry: daysToExpiry,
      recommendation: daysToExpiry <= 0 ? "RENEW_IMMEDIATELY"
        : daysToExpiry <= 30 ? "RENEW_SOON"
        : !meetsThreshold ? "REVIEW_PERFORMANCE"
        : "MAINTAIN",
    };
  });

  const expiring = enriched.filter(c => c.status === "expiring_soon" || c.days_to_expiry <= 30);
  const underperforming = enriched.filter(c => !c.performance.meets_threshold);
  const totalValue = enriched.reduce((s, c) => s + c.annual_value, 0);

  return {
    action: "proc_contract",
    total_contracts: enriched.length,
    contracts: enriched,
    summary: {
      total_annual_value: totalValue,
      active_count: enriched.filter(c => c.status === "active").length,
      expiring_count: expiring.length,
      expired_count: enriched.filter(c => c.status === "expired").length,
      underperforming_count: underperforming.length,
      avg_discount_pct: avg(enriched.map(c => c.discount_pct)),
      renewal_needed: expiring.map(c => c.supplier_name),
    },
  };
}

function handleProcOptimize(params: Record<string, unknown>): unknown {
  const focusArea = params.focus as string | undefined; // "cost", "quality", "consolidation"
  const targetSavingsPct = (params.target_savings_pct as number) || 10;

  const spendData = handleProcSpend({}) as { total_spend: number; supplier_breakdown: Array<{ supplier: string; total_spend: number; avg_quality: number; on_time_pct: number; order_count: number }> };
  const contractData = handleProcContract({}) as { contracts: Array<{ supplier_name: string; discount_pct: number; contract_type: string; performance: { utilization_pct: number; avg_quality: number }; days_to_expiry: number }> };

  const opportunities: Array<{
    type: string; description: string; estimated_savings: number;
    impact: "high" | "medium" | "low"; effort: "high" | "medium" | "low";
    suppliers_affected: string[];
  }> = [];

  // Volume consolidation opportunities
  const supplierSpend = spendData.supplier_breakdown;
  const smallSuppliers = supplierSpend.filter(s => s.total_spend < 3000);
  if (smallSuppliers.length >= 2) {
    const consolidatable = smallSuppliers.reduce((s, sup) => s + sup.total_spend, 0);
    opportunities.push({
      type: "Volume Consolidation",
      description: `Consolidate ${smallSuppliers.length} low-volume suppliers into fewer vendors for volume discounts`,
      estimated_savings: Math.round(consolidatable * 0.08),
      impact: "medium",
      effort: "medium",
      suppliers_affected: smallSuppliers.map(s => s.supplier),
    });
  }

  // Contract renegotiation — expiring contracts with good performance
  const expiringGood = contractData.contracts.filter(
    c => c.days_to_expiry <= 90 && c.performance.avg_quality >= 8
  );
  for (const c of expiringGood) {
    const sup = supplierSpend.find(s => s.supplier === c.supplier_name);
    if (sup) {
      opportunities.push({
        type: "Contract Renegotiation",
        description: `Renegotiate ${c.supplier_name} contract — leverage strong performance (quality ${c.performance.avg_quality}) for better terms`,
        estimated_savings: Math.round(sup.total_spend * 0.05),
        impact: "high",
        effort: "low",
        suppliers_affected: [c.supplier_name],
      });
    }
  }

  // Payment term optimization
  const longTerms = contractData.contracts.filter(c => c.discount_pct < 5);
  if (longTerms.length > 0) {
    opportunities.push({
      type: "Early Payment Discount",
      description: `Negotiate 2% early payment discounts with ${longTerms.length} suppliers lacking volume discounts`,
      estimated_savings: Math.round(longTerms.reduce((s, c) => s + c.performance.utilization_pct * c.discount_pct, 0) * 0.02 * 100),
      impact: "medium",
      effort: "low",
      suppliers_affected: longTerms.map(c => c.supplier_name),
    });
  }

  // Quality-based switching
  const lowQuality = supplierSpend.filter(s => s.avg_quality < 7.5);
  for (const lq of lowQuality) {
    opportunities.push({
      type: "Supplier Quality Switch",
      description: `Replace ${lq.supplier} (quality ${lq.avg_quality}/10) with higher-quality alternative to reduce rework costs`,
      estimated_savings: Math.round(lq.total_spend * 0.12),
      impact: "high",
      effort: "high",
      suppliers_affected: [lq.supplier],
    });
  }

  // Sort by savings potential
  opportunities.sort((a, b) => b.estimated_savings - a.estimated_savings);

  const totalPotentialSavings = opportunities.reduce((s, o) => s + o.estimated_savings, 0);
  const savingsPct = spendData.total_spend > 0
    ? Math.round(totalPotentialSavings / spendData.total_spend * 1000) / 10
    : 0;

  return {
    action: "proc_optimize",
    current_spend: spendData.total_spend,
    total_opportunities: opportunities.length,
    opportunities,
    target_savings_pct: targetSavingsPct,
    summary: {
      total_potential_savings: totalPotentialSavings,
      savings_pct: savingsPct,
      meets_target: savingsPct >= targetSavingsPct,
      top_opportunity: opportunities[0]?.type || "none",
      high_impact_count: opportunities.filter(o => o.impact === "high").length,
      quick_wins: opportunities.filter(o => o.effort === "low").length,
    },
  };
}

function handleProcReport(params: Record<string, unknown>): unknown {
  const reportType = (params.report_type as string) || "executive";

  // Gather all data
  const spend = handleProcSpend({}) as { total_spend: number; total_orders: number; avg_order_value: number; summary: Record<string, unknown>; category_breakdown: unknown[]; supplier_breakdown: Array<{ supplier: string; total_spend: number; avg_quality: number; on_time_pct: number }> };
  const contracts = handleProcContract({}) as { total_contracts: number; summary: Record<string, unknown> };
  const optimization = handleProcOptimize({}) as { total_opportunities: number; summary: Record<string, unknown> };

  // KPI calculations
  const topSuppliers = spend.supplier_breakdown.slice(0, 3);
  const concentration = spend.total_spend > 0
    ? Math.round(topSuppliers.reduce((s, sup) => s + sup.total_spend, 0) / spend.total_spend * 100)
    : 0;

  const kpis = {
    total_procurement_spend: spend.total_spend,
    total_purchase_orders: spend.total_orders,
    avg_order_value: spend.avg_order_value,
    supplier_count: spend.supplier_breakdown.length,
    active_contracts: contracts.summary.active_count,
    avg_quality_score: spend.summary.avg_quality_score,
    on_time_delivery_pct: spend.summary.overall_on_time_pct,
    top3_supplier_concentration_pct: concentration,
    potential_savings_pct: (optimization.summary as Record<string, unknown>).savings_pct,
    contracts_expiring_soon: contracts.summary.expiring_count,
  };

  // Risk flags
  const risks: string[] = [];
  if (concentration > 60) risks.push(`High supplier concentration: top 3 suppliers = ${concentration}% of spend`);
  if ((contracts.summary.expiring_count as number) > 0) risks.push(`${contracts.summary.expiring_count} contract(s) expiring soon — review needed`);
  if ((contracts.summary.underperforming_count as number) > 0) risks.push(`${contracts.summary.underperforming_count} supplier(s) below performance threshold`);
  if ((spend.summary.overall_on_time_pct as number) < 80) risks.push(`Overall on-time delivery ${spend.summary.overall_on_time_pct}% — below 80% target`);

  return {
    action: "proc_report",
    report_type: reportType,
    kpis,
    risks,
    spend_overview: spend.category_breakdown,
    contract_overview: contracts.summary,
    optimization_overview: optimization.summary,
    summary: {
      health_score: Math.round(
        ((kpis.avg_quality_score as number) / 10 * 30) +
        ((kpis.on_time_delivery_pct as number) / 100 * 30) +
        (Math.max(0, 100 - concentration) / 100 * 20) +
        ((kpis.potential_savings_pct as number) > 0 ? 20 : 0)
      ),
      risk_count: risks.length,
      top_risk: risks[0] || "No significant risks",
      recommendation: risks.length === 0 ? "Procurement health is good — maintain current strategy"
        : risks.length <= 2 ? "Address flagged items in next review cycle"
        : "Multiple risk areas identified — schedule procurement review meeting",
    },
  };
}

// ─── Public Dispatcher ────────────────────────────────────────────────────────

export function executeProcurementAnalyticsAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "proc_spend":    return handleProcSpend(params);
    case "proc_contract": return handleProcContract(params);
    case "proc_optimize": return handleProcOptimize(params);
    case "proc_report":   return handleProcReport(params);
    default:
      throw new Error(`ProcurementAnalyticsEngine: unknown action "${action}"`);
  }
}
