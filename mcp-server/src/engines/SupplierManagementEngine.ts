/**
 * SupplierManagementEngine — R25-MS1
 *
 * Supplier scorecard, performance tracking, risk assessment, and supplier comparison.
 *
 * Actions:
 *   sup_scorecard — Supplier performance scorecard with KPIs
 *   sup_risk      — Supplier risk assessment and mitigation
 *   sup_audit     — Supplier audit tracking and compliance
 *   sup_compare   — Multi-supplier comparison and ranking
 */

// ── Supplier Database ──────────────────────────────────────────────────────

interface Supplier {
  supplier_id: string;
  name: string;
  country: string;
  category: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  materials_supplied: string[];
  certifications: string[];
  contract_value_usd: number;
  contract_expiry: string;
  lead_time_days: number;
  on_time_delivery_pct: number;
  quality_reject_pct: number;
  responsiveness_score: number; // 1-5
  financial_stability: "STRONG" | "STABLE" | "WATCH" | "AT_RISK";
  relationship_years: number;
  last_audit_date: string;
  audit_score: number; // 0-100
  corrective_actions_open: number;
}

const SUPPLIER_DB: Supplier[] = [
  {
    supplier_id: "SUP-001", name: "Sandvik Coromant", country: "Sweden", category: "Cutting Tools",
    tier: "TIER_1", materials_supplied: ["Carbide Inserts", "End Mills", "Drills", "Tool Holders"],
    certifications: ["ISO 9001", "ISO 14001", "IATF 16949"],
    contract_value_usd: 285000, contract_expiry: "2026-12-31", lead_time_days: 5,
    on_time_delivery_pct: 97.2, quality_reject_pct: 0.3, responsiveness_score: 5,
    financial_stability: "STRONG", relationship_years: 12, last_audit_date: "2025-03-15", audit_score: 96, corrective_actions_open: 0,
  },
  {
    supplier_id: "SUP-002", name: "Kennametal Inc", country: "USA", category: "Cutting Tools",
    tier: "TIER_1", materials_supplied: ["Carbide Inserts", "Ceramic Inserts", "End Mills"],
    certifications: ["ISO 9001", "AS9100D"],
    contract_value_usd: 195000, contract_expiry: "2026-06-30", lead_time_days: 3,
    on_time_delivery_pct: 95.8, quality_reject_pct: 0.5, responsiveness_score: 4,
    financial_stability: "STRONG", relationship_years: 8, last_audit_date: "2025-01-20", audit_score: 92, corrective_actions_open: 1,
  },
  {
    supplier_id: "SUP-003", name: "Thyssen Krupp Materials", country: "Germany", category: "Raw Materials",
    tier: "TIER_1", materials_supplied: ["Ti-6Al-4V Bar", "Inconel 718 Bar", "Steel 4340 Bar", "Aluminum 7075 Plate"],
    certifications: ["ISO 9001", "AS9120", "NADCAP"],
    contract_value_usd: 520000, contract_expiry: "2027-03-31", lead_time_days: 14,
    on_time_delivery_pct: 93.5, quality_reject_pct: 0.8, responsiveness_score: 4,
    financial_stability: "STRONG", relationship_years: 15, last_audit_date: "2024-11-10", audit_score: 94, corrective_actions_open: 1,
  },
  {
    supplier_id: "SUP-004", name: "Alcoa Specialty Metals", country: "USA", category: "Raw Materials",
    tier: "TIER_1", materials_supplied: ["Aluminum 6061 Bar", "Aluminum 7075 Bar", "Aluminum 2024 Plate"],
    certifications: ["ISO 9001", "AS9100D", "NADCAP"],
    contract_value_usd: 340000, contract_expiry: "2026-09-30", lead_time_days: 10,
    on_time_delivery_pct: 96.1, quality_reject_pct: 0.2, responsiveness_score: 4,
    financial_stability: "STRONG", relationship_years: 10, last_audit_date: "2025-02-28", audit_score: 95, corrective_actions_open: 0,
  },
  {
    supplier_id: "SUP-005", name: "Mitutoyo America", country: "Japan", category: "Metrology",
    tier: "TIER_1", materials_supplied: ["CMM Probes", "Micrometers", "Calipers", "Gauge Blocks"],
    certifications: ["ISO 9001", "ISO 17025"],
    contract_value_usd: 85000, contract_expiry: "2026-03-31", lead_time_days: 7,
    on_time_delivery_pct: 98.5, quality_reject_pct: 0.1, responsiveness_score: 5,
    financial_stability: "STRONG", relationship_years: 9, last_audit_date: "2025-04-10", audit_score: 98, corrective_actions_open: 0,
  },
  {
    supplier_id: "SUP-006", name: "Pacific Precision Metals", country: "USA", category: "Raw Materials",
    tier: "TIER_2", materials_supplied: ["SS 316L Bar", "SS 304 Bar", "Brass C360"],
    certifications: ["ISO 9001"],
    contract_value_usd: 125000, contract_expiry: "2025-12-31", lead_time_days: 7,
    on_time_delivery_pct: 91.2, quality_reject_pct: 1.2, responsiveness_score: 3,
    financial_stability: "STABLE", relationship_years: 5, last_audit_date: "2024-08-15", audit_score: 82, corrective_actions_open: 3,
  },
  {
    supplier_id: "SUP-007", name: "Global Coolant Systems", country: "USA", category: "Consumables",
    tier: "TIER_2", materials_supplied: ["Metalworking Fluid", "Coolant Concentrate", "Cutting Oil"],
    certifications: ["ISO 9001", "ISO 14001"],
    contract_value_usd: 45000, contract_expiry: "2026-01-31", lead_time_days: 3,
    on_time_delivery_pct: 94.8, quality_reject_pct: 0.4, responsiveness_score: 4,
    financial_stability: "STABLE", relationship_years: 6, last_audit_date: "2024-09-20", audit_score: 88, corrective_actions_open: 0,
  },
  {
    supplier_id: "SUP-008", name: "Haimer GmbH", country: "Germany", category: "Tool Holding",
    tier: "TIER_1", materials_supplied: ["Shrink Fit Holders", "Power Chucks", "Balancing Equipment"],
    certifications: ["ISO 9001", "DIN ISO 12164"],
    contract_value_usd: 95000, contract_expiry: "2026-06-30", lead_time_days: 12,
    on_time_delivery_pct: 96.7, quality_reject_pct: 0.1, responsiveness_score: 4,
    financial_stability: "STRONG", relationship_years: 7, last_audit_date: "2025-01-05", audit_score: 97, corrective_actions_open: 0,
  },
  {
    supplier_id: "SUP-009", name: "East Coast Alloys", country: "USA", category: "Raw Materials",
    tier: "TIER_3", materials_supplied: ["Tool Steel D2", "Tool Steel H13", "Tool Steel A2"],
    certifications: ["ISO 9001"],
    contract_value_usd: 68000, contract_expiry: "2025-09-30", lead_time_days: 21,
    on_time_delivery_pct: 85.3, quality_reject_pct: 2.1, responsiveness_score: 2,
    financial_stability: "WATCH", relationship_years: 3, last_audit_date: "2024-06-10", audit_score: 71, corrective_actions_open: 5,
  },
  {
    supplier_id: "SUP-010", name: "Schunk Intec", country: "Germany", category: "Work Holding",
    tier: "TIER_1", materials_supplied: ["Hydraulic Chucks", "Vices", "Clamping Systems", "Grippers"],
    certifications: ["ISO 9001", "ISO 14001"],
    contract_value_usd: 72000, contract_expiry: "2026-04-30", lead_time_days: 15,
    on_time_delivery_pct: 95.4, quality_reject_pct: 0.3, responsiveness_score: 4,
    financial_stability: "STRONG", relationship_years: 6, last_audit_date: "2025-03-01", audit_score: 93, corrective_actions_open: 1,
  },
];

// ── Risk Factors ───────────────────────────────────────────────────────────

interface RiskFactor {
  category: string;
  factor: string;
  weight: number;
  thresholds: { low: number; medium: number; high: number; critical: number };
  direction: "lower_is_better" | "higher_is_better";
}

const RISK_FACTORS: RiskFactor[] = [
  { category: "Delivery", factor: "on_time_delivery_pct", weight: 0.25, thresholds: { low: 98, medium: 95, high: 90, critical: 85 }, direction: "higher_is_better" },
  { category: "Quality", factor: "quality_reject_pct", weight: 0.25, thresholds: { low: 0.5, medium: 1.0, high: 2.0, critical: 3.0 }, direction: "lower_is_better" },
  { category: "Financial", factor: "financial_stability", weight: 0.15, thresholds: { low: 0, medium: 0, high: 0, critical: 0 }, direction: "higher_is_better" },
  { category: "Audit", factor: "audit_score", weight: 0.15, thresholds: { low: 95, medium: 85, high: 75, critical: 65 }, direction: "higher_is_better" },
  { category: "Responsiveness", factor: "responsiveness_score", weight: 0.10, thresholds: { low: 5, medium: 4, high: 3, critical: 2 }, direction: "higher_is_better" },
  { category: "Corrective Actions", factor: "corrective_actions_open", weight: 0.10, thresholds: { low: 0, medium: 2, high: 4, critical: 6 }, direction: "lower_is_better" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function calcSupplierScore(sup: Supplier): { score: number; rating: string; details: { category: string; score: number; risk: string }[] } {
  const details: { category: string; score: number; risk: string }[] = [];
  let totalScore = 0;

  for (const rf of RISK_FACTORS) {
    let value: number;
    switch (rf.factor) {
      case "on_time_delivery_pct": value = sup.on_time_delivery_pct; break;
      case "quality_reject_pct": value = sup.quality_reject_pct; break;
      case "financial_stability": value = sup.financial_stability === "STRONG" ? 100 : sup.financial_stability === "STABLE" ? 75 : sup.financial_stability === "WATCH" ? 40 : 15; break;
      case "audit_score": value = sup.audit_score; break;
      case "responsiveness_score": value = sup.responsiveness_score * 20; break;
      case "corrective_actions_open": value = sup.corrective_actions_open; break;
      default: value = 50;
    }

    let catScore: number;
    if (rf.direction === "higher_is_better") {
      catScore = Math.min(100, Math.max(0, value));
    } else {
      catScore = Math.max(0, 100 - value * 20);
    }

    let risk = "LOW";
    if (rf.direction === "higher_is_better") {
      if (value < rf.thresholds.critical) risk = "CRITICAL";
      else if (value < rf.thresholds.high) risk = "HIGH";
      else if (value < rf.thresholds.medium) risk = "MEDIUM";
    } else {
      if (value > rf.thresholds.critical) risk = "CRITICAL";
      else if (value > rf.thresholds.high) risk = "HIGH";
      else if (value > rf.thresholds.medium) risk = "MEDIUM";
    }

    details.push({ category: rf.category, score: Math.round(catScore), risk });
    totalScore += catScore * rf.weight;
  }

  const score = Math.round(totalScore);
  const rating = score >= 90 ? "PREFERRED" : score >= 75 ? "APPROVED" : score >= 60 ? "CONDITIONAL" : "UNDER_REVIEW";
  return { score, rating, details };
}

function getSupplier(params: Record<string, unknown>): Supplier | undefined {
  const id = String(params.supplier_id || "").toUpperCase();
  if (id) return SUPPLIER_DB.find(s => s.supplier_id === id);
  const name = String(params.supplier_name || params.name || "").toLowerCase();
  if (name) return SUPPLIER_DB.find(s => s.name.toLowerCase().includes(name));
  return undefined;
}

// ── Action: sup_scorecard ──────────────────────────────────────────────────

function supScorecard(params: Record<string, unknown>): unknown {
  const supplier = getSupplier(params);
  const category = String(params.category || "").toLowerCase();
  const tier = String(params.tier || "").toUpperCase();

  if (supplier) {
    const { score, rating, details } = calcSupplierScore(supplier);
    const daysToExpiry = Math.round((new Date(supplier.contract_expiry).getTime() - new Date("2025-06-15").getTime()) / 86400000);

    return {
      action: "sup_scorecard",
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      country: supplier.country,
      category: supplier.category,
      tier: supplier.tier,
      overall_score: score,
      rating,
      kpi_details: details,
      performance: {
        on_time_delivery_pct: supplier.on_time_delivery_pct,
        quality_reject_pct: supplier.quality_reject_pct,
        responsiveness_score: supplier.responsiveness_score,
        audit_score: supplier.audit_score,
        financial_stability: supplier.financial_stability,
      },
      contract: {
        value_usd: supplier.contract_value_usd,
        expiry: supplier.contract_expiry,
        days_to_expiry: daysToExpiry,
        renewal_alert: daysToExpiry < 90 ? "RENEW_SOON" : daysToExpiry < 180 ? "PLAN_RENEWAL" : "OK",
      },
      certifications: supplier.certifications,
      materials_supplied: supplier.materials_supplied,
      relationship_years: supplier.relationship_years,
      corrective_actions_open: supplier.corrective_actions_open,
    };
  }

  // Fleet scorecard
  let suppliers = [...SUPPLIER_DB];
  if (category) suppliers = suppliers.filter(s => s.category.toLowerCase().includes(category));
  if (tier) suppliers = suppliers.filter(s => s.tier === tier);

  const scored = suppliers.map(s => {
    const { score, rating } = calcSupplierScore(s);
    return { ...s, score, rating };
  }).sort((a, b) => b.score - a.score);

  return {
    action: "sup_scorecard",
    filters: { category: category || "all", tier: tier || "all" },
    total_suppliers: scored.length,
    suppliers: scored.map(s => ({
      supplier_id: s.supplier_id,
      name: s.name,
      category: s.category,
      tier: s.tier,
      score: s.score,
      rating: s.rating,
      on_time_pct: s.on_time_delivery_pct,
      reject_pct: s.quality_reject_pct,
      contract_value_usd: s.contract_value_usd,
    })),
    summary: {
      avg_score: Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length),
      preferred: scored.filter(s => s.rating === "PREFERRED").length,
      approved: scored.filter(s => s.rating === "APPROVED").length,
      conditional: scored.filter(s => s.rating === "CONDITIONAL").length,
      under_review: scored.filter(s => s.rating === "UNDER_REVIEW").length,
      total_contract_value_usd: scored.reduce((sum, s) => sum + s.contract_value_usd, 0),
    },
  };
}

// ── Action: sup_risk ───────────────────────────────────────────────────────

function supRisk(params: Record<string, unknown>): unknown {
  const supplier = getSupplier(params);

  const assessSupplierRisk = (sup: Supplier) => {
    const { score, details } = calcSupplierScore(sup);
    const risks: { category: string; level: string; description: string; mitigation: string }[] = [];

    if (sup.on_time_delivery_pct < 92) risks.push({ category: "Delivery", level: "HIGH", description: `On-time delivery at ${sup.on_time_delivery_pct}% — below 92% threshold`, mitigation: "Increase safety stock, establish backup supplier, negotiate delivery SLA penalties" });
    if (sup.quality_reject_pct > 1.5) risks.push({ category: "Quality", level: "HIGH", description: `Reject rate at ${sup.quality_reject_pct}% — above 1.5% threshold`, mitigation: "Implement incoming inspection, require supplier SPC data, schedule quality audit" });
    if (sup.financial_stability === "WATCH" || sup.financial_stability === "AT_RISK") risks.push({ category: "Financial", level: sup.financial_stability === "AT_RISK" ? "CRITICAL" : "HIGH", description: `Financial stability: ${sup.financial_stability}`, mitigation: "Diversify supply base, establish alternative sources, monitor financial reports quarterly" });
    if (sup.corrective_actions_open > 3) risks.push({ category: "Compliance", level: "MEDIUM", description: `${sup.corrective_actions_open} open corrective actions`, mitigation: "Schedule follow-up audit, set deadline for closure, escalate to supplier management" });

    const daysToExpiry = Math.round((new Date(sup.contract_expiry).getTime() - new Date("2025-06-15").getTime()) / 86400000);
    if (daysToExpiry < 90) risks.push({ category: "Contract", level: "HIGH", description: `Contract expires in ${daysToExpiry} days`, mitigation: "Initiate renewal negotiations, benchmark pricing, evaluate alternatives" });
    if (daysToExpiry < 0) risks.push({ category: "Contract", level: "CRITICAL", description: `Contract EXPIRED ${Math.abs(daysToExpiry)} days ago`, mitigation: "Emergency renewal, verify continued supply terms, assess legal exposure" });

    if (sup.lead_time_days > 15) risks.push({ category: "Lead Time", level: "MEDIUM", description: `Lead time ${sup.lead_time_days} days — potential supply disruption risk`, mitigation: "Maintain buffer stock, establish VMI agreement, identify local alternatives" });

    const singleSource = SUPPLIER_DB.filter(s => s.category === sup.category).length === 1;
    if (singleSource) risks.push({ category: "Concentration", level: "HIGH", description: `Single source for ${sup.category}`, mitigation: "Qualify second source immediately, dual-source critical materials" });

    const overallRisk = risks.length === 0 ? "LOW" : risks.some(r => r.level === "CRITICAL") ? "CRITICAL" : risks.some(r => r.level === "HIGH") ? "HIGH" : "MEDIUM";

    return { supplier_id: sup.supplier_id, name: sup.name, overall_risk: overallRisk, score, risk_count: risks.length, risks };
  };

  if (supplier) {
    const assessment = assessSupplierRisk(supplier);
    return { action: "sup_risk", ...assessment };
  }

  // Fleet risk assessment
  const assessments = SUPPLIER_DB.map(assessSupplierRisk).sort((a, b) => {
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (riskOrder[a.overall_risk as keyof typeof riskOrder] || 3) - (riskOrder[b.overall_risk as keyof typeof riskOrder] || 3);
  });

  return {
    action: "sup_risk",
    total_suppliers: assessments.length,
    assessments: assessments.map(a => ({
      supplier_id: a.supplier_id,
      name: a.name,
      overall_risk: a.overall_risk,
      risk_count: a.risk_count,
      top_risk: a.risks[0]?.category || "none",
    })),
    summary: {
      critical_risk: assessments.filter(a => a.overall_risk === "CRITICAL").length,
      high_risk: assessments.filter(a => a.overall_risk === "HIGH").length,
      medium_risk: assessments.filter(a => a.overall_risk === "MEDIUM").length,
      low_risk: assessments.filter(a => a.overall_risk === "LOW").length,
      total_risk_items: assessments.reduce((s, a) => s + a.risk_count, 0),
    },
  };
}

// ── Action: sup_audit ──────────────────────────────────────────────────────

function supAudit(params: Record<string, unknown>): unknown {
  const supplier = getSupplier(params);
  const overdue = String(params.overdue || "").toLowerCase() === "true";

  const now = new Date("2025-06-15");
  const auditInterval = 365; // annual audit requirement

  const assessAudit = (sup: Supplier) => {
    const lastAudit = new Date(sup.last_audit_date);
    const daysSinceAudit = Math.round((now.getTime() - lastAudit.getTime()) / 86400000);
    const nextAuditDue = new Date(lastAudit.getTime() + auditInterval * 86400000);
    const daysUntilDue = Math.round((nextAuditDue.getTime() - now.getTime()) / 86400000);
    const isOverdue = daysUntilDue < 0;

    return {
      supplier_id: sup.supplier_id,
      name: sup.name,
      category: sup.category,
      tier: sup.tier,
      last_audit: sup.last_audit_date,
      audit_score: sup.audit_score,
      days_since_audit: daysSinceAudit,
      next_audit_due: nextAuditDue.toISOString().split("T")[0],
      days_until_due: daysUntilDue,
      status: isOverdue ? "OVERDUE" : daysUntilDue < 60 ? "DUE_SOON" : "CURRENT",
      corrective_actions_open: sup.corrective_actions_open,
      certifications: sup.certifications,
      score_trend: sup.audit_score >= 90 ? "STRONG" : sup.audit_score >= 80 ? "ACCEPTABLE" : "NEEDS_IMPROVEMENT",
    };
  };

  if (supplier) {
    return { action: "sup_audit", ...assessAudit(supplier) };
  }

  let audits = SUPPLIER_DB.map(assessAudit);
  if (overdue) audits = audits.filter(a => a.status === "OVERDUE" || a.status === "DUE_SOON");
  audits.sort((a, b) => a.days_until_due - b.days_until_due);

  return {
    action: "sup_audit",
    total_suppliers: audits.length,
    audits,
    summary: {
      overdue: audits.filter(a => a.status === "OVERDUE").length,
      due_soon: audits.filter(a => a.status === "DUE_SOON").length,
      current: audits.filter(a => a.status === "CURRENT").length,
      avg_audit_score: Math.round(audits.reduce((s, a) => s + a.audit_score, 0) / audits.length),
      total_open_corrective_actions: audits.reduce((s, a) => s + a.corrective_actions_open, 0),
    },
  };
}

// ── Action: sup_compare ────────────────────────────────────────────────────

function supCompare(params: Record<string, unknown>): unknown {
  const category = String(params.category || "").toLowerCase();
  const material = String(params.material || "").toLowerCase();
  const ids = params.supplier_ids ? (Array.isArray(params.supplier_ids) ? params.supplier_ids as string[] : String(params.supplier_ids).split(",").map(s => s.trim().toUpperCase())) : [];

  let candidates: Supplier[];
  if (ids.length > 0) {
    candidates = SUPPLIER_DB.filter(s => ids.includes(s.supplier_id));
  } else if (material) {
    candidates = SUPPLIER_DB.filter(s => s.materials_supplied.some(m => m.toLowerCase().includes(material)));
  } else if (category) {
    candidates = SUPPLIER_DB.filter(s => s.category.toLowerCase().includes(category));
  } else {
    candidates = [...SUPPLIER_DB];
  }

  const compared = candidates.map(sup => {
    const { score, rating, details } = calcSupplierScore(sup);
    return {
      supplier_id: sup.supplier_id,
      name: sup.name,
      country: sup.country,
      category: sup.category,
      tier: sup.tier,
      overall_score: score,
      rating,
      on_time_delivery_pct: sup.on_time_delivery_pct,
      quality_reject_pct: sup.quality_reject_pct,
      lead_time_days: sup.lead_time_days,
      contract_value_usd: sup.contract_value_usd,
      responsiveness: sup.responsiveness_score,
      audit_score: sup.audit_score,
      certifications: sup.certifications.length,
      kpi_breakdown: details,
    };
  }).sort((a, b) => b.overall_score - a.overall_score);

  const best = compared[0];
  const worst = compared[compared.length - 1];

  return {
    action: "sup_compare",
    filters: { category: category || "all", material: material || "all", supplier_ids: ids.length > 0 ? ids : "all" },
    total_compared: compared.length,
    ranking: compared,
    comparison_highlights: {
      best_overall: best ? { name: best.name, score: best.overall_score } : null,
      best_quality: compared.length > 0 ? { name: [...compared].sort((a, b) => a.quality_reject_pct - b.quality_reject_pct)[0].name } : null,
      best_delivery: compared.length > 0 ? { name: [...compared].sort((a, b) => b.on_time_delivery_pct - a.on_time_delivery_pct)[0].name } : null,
      fastest_lead_time: compared.length > 0 ? { name: [...compared].sort((a, b) => a.lead_time_days - b.lead_time_days)[0].name, days: [...compared].sort((a, b) => a.lead_time_days - b.lead_time_days)[0].lead_time_days } : null,
      lowest_cost: compared.length > 0 ? { name: [...compared].sort((a, b) => a.contract_value_usd - b.contract_value_usd)[0].name } : null,
    },
    summary: {
      suppliers_compared: compared.length,
      avg_score: Math.round(compared.reduce((s, c) => s + c.overall_score, 0) / compared.length),
      score_spread: best && worst ? best.overall_score - worst.overall_score : 0,
    },
  };
}

// ── Public Entry Point ─────────────────────────────────────────────────────

export function executeSupplierManagementAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "sup_scorecard":
      return supScorecard(params);
    case "sup_risk":
      return supRisk(params);
    case "sup_audit":
      return supAudit(params);
    case "sup_compare":
      return supCompare(params);
    default:
      throw new Error(`Unknown SupplierManagementEngine action: ${action}`);
  }
}
