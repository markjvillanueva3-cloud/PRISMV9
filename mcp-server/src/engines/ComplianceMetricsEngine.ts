/**
 * ComplianceMetricsEngine — compliance KPIs, audit scores, overdue tracking, dashboards
 * Phase R32-MS4: Compliance & Regulatory Intelligence
 *
 * Actions:
 *   comp_kpi       — compliance KPI tracking and trending
 *   comp_score     — audit scoring and grading
 *   comp_overdue   — overdue finding and action tracking
 *   comp_dashboard — consolidated compliance dashboard
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface ComplianceKPI {
  id: string;
  name: string;
  category: string;
  target: number;
  actual: number;
  unit: string;
  period: string;
  trend: 'improving' | 'stable' | 'declining';
}

interface AuditScore {
  audit_id: string;
  audit_name: string;
  standard: string;
  score: number;
  max_score: number;
  grade: string;
  date: string;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const COMPLIANCE_KPIS: ComplianceKPI[] = [
  { id: 'KPI-C01', name: 'CAPA Closure Rate', category: 'Quality', target: 95, actual: 88, unit: '%', period: '2025-Q1', trend: 'improving' },
  { id: 'KPI-C02', name: 'Audit Finding Closure', category: 'Quality', target: 90, actual: 85, unit: '%', period: '2025-Q1', trend: 'stable' },
  { id: 'KPI-C03', name: 'Regulatory Submission On-Time', category: 'Regulatory', target: 100, actual: 80, unit: '%', period: '2025-Q1', trend: 'declining' },
  { id: 'KPI-C04', name: 'Calibration Compliance', category: 'Metrology', target: 98, actual: 96, unit: '%', period: '2025-Q1', trend: 'stable' },
  { id: 'KPI-C05', name: 'Training Compliance', category: 'Workforce', target: 95, actual: 92, unit: '%', period: '2025-Q1', trend: 'improving' },
  { id: 'KPI-C06', name: 'Document Currency', category: 'DocControl', target: 100, actual: 97, unit: '%', period: '2025-Q1', trend: 'stable' },
  { id: 'KPI-C07', name: 'Safety Incident Rate', category: 'Safety', target: 0.5, actual: 0.3, unit: 'per 200k hrs', period: '2025-Q1', trend: 'improving' },
  { id: 'KPI-C08', name: 'Customer Complaint Response', category: 'Quality', target: 48, actual: 36, unit: 'hours', period: '2025-Q1', trend: 'improving' },
  { id: 'KPI-C09', name: 'Permit Renewal On-Time', category: 'Regulatory', target: 100, actual: 80, unit: '%', period: '2025-Q1', trend: 'declining' },
  { id: 'KPI-C10', name: 'Supplier Audit Coverage', category: 'SupplyChain', target: 80, actual: 75, unit: '%', period: '2025-Q1', trend: 'stable' },
];

const AUDIT_SCORES: AuditScore[] = [
  { audit_id: 'AUD-001', audit_name: 'ISO 9001 Internal - Production', standard: 'ISO 9001:2015', score: 82, max_score: 100, grade: 'B', date: '2025-03-15' },
  { audit_id: 'AUD-003', audit_name: 'Customer Audit - Aerospace', standard: 'AS9100D', score: 91, max_score: 100, grade: 'A', date: '2025-02-20' },
  { audit_id: 'AUD-005', audit_name: 'OSHA Safety Compliance', standard: 'OSHA 29 CFR', score: 88, max_score: 100, grade: 'B+', date: '2025-01-28' },
  { audit_id: 'SC-2024-Q4', audit_name: 'ISO 9001 Surveillance', standard: 'ISO 9001:2015', score: 94, max_score: 100, grade: 'A', date: '2024-12-10' },
  { audit_id: 'SC-2024-Q2', audit_name: 'ISO 14001 Recertification', standard: 'ISO 14001:2015', score: 89, max_score: 100, grade: 'B+', date: '2024-06-15' },
];

const OVERDUE_ITEMS = [
  { type: 'CAPA', id: 'CAPA-001', description: 'Pump seal leakage corrective action', due_date: '2025-03-15', days_overdue: 17, priority: 'critical', owner: 'D. Johnson' },
  { type: 'Finding', id: 'FND-002', description: 'Calibration stickers fading', due_date: '2025-04-30', days_overdue: 0, priority: 'low', owner: 'Quality' },
  { type: 'Submission', id: 'SUB-005', description: 'PPAP package for new part', due_date: '2025-02-15', days_overdue: 44, priority: 'major', owner: 'Engineering' },
  { type: 'Permit', id: 'PRM-005', description: 'Boiler operating license renewal', due_date: '2025-01-01', days_overdue: 90, priority: 'critical', owner: 'Facilities' },
  { type: 'Training', id: 'TRN-012', description: 'Hazmat handler recertification', due_date: '2025-03-01', days_overdue: 31, priority: 'major', owner: 'Safety' },
];

// ── Action Implementations ─────────────────────────────────────────────────

function compKPI(params: Record<string, unknown>): unknown {
  const category = params.category as string | undefined;

  let kpis = COMPLIANCE_KPIS;
  if (category) kpis = kpis.filter(k => k.category.toLowerCase().includes((category as string).toLowerCase()));

  const meetingTarget = kpis.filter(k => {
    if (k.name === 'Safety Incident Rate' || k.name === 'Customer Complaint Response') return k.actual <= k.target;
    return k.actual >= k.target;
  });

  return {
    total_kpis: kpis.length,
    kpis,
    summary: {
      meeting_target: meetingTarget.length,
      below_target: kpis.length - meetingTarget.length,
      target_achievement: Math.round(meetingTarget.length / Math.max(kpis.length, 1) * 1000) / 10,
      improving: kpis.filter(k => k.trend === 'improving').length,
      declining: kpis.filter(k => k.trend === 'declining').length,
    },
  };
}

function compScore(params: Record<string, unknown>): unknown {
  const standard = params.standard as string | undefined;

  let scores = AUDIT_SCORES;
  if (standard) scores = scores.filter(s => s.standard.toLowerCase().includes((standard as string).toLowerCase()));

  const avgScore = Math.round(scores.reduce((s, sc) => s + sc.score, 0) / Math.max(scores.length, 1) * 10) / 10;
  const avgPct = Math.round(scores.reduce((s, sc) => s + sc.score / sc.max_score * 100, 0) / Math.max(scores.length, 1) * 10) / 10;

  return {
    total_scores: scores.length,
    scores,
    summary: {
      avg_score: avgScore,
      avg_percentage: avgPct,
      best_score: scores.reduce((b, s) => s.score > b.score ? s : b, scores[0]),
      worst_score: scores.reduce((w, s) => s.score < w.score ? s : w, scores[0]),
      overall_grade: avgPct >= 90 ? 'A' : avgPct >= 85 ? 'B+' : avgPct >= 80 ? 'B' : avgPct >= 75 ? 'C+' : 'C',
    },
  };
}

function compOverdue(params: Record<string, unknown>): unknown {
  const type = params.type as string | undefined;
  const priority = params.priority as string | undefined;

  let items = OVERDUE_ITEMS.filter(i => i.days_overdue > 0);
  if (type) items = items.filter(i => i.type.toLowerCase() === (type as string).toLowerCase());
  if (priority) items = items.filter(i => i.priority === priority);

  return {
    total_overdue: items.length,
    overdue_items: items.sort((a, b) => b.days_overdue - a.days_overdue),
    summary: {
      critical: items.filter(i => i.priority === 'critical').length,
      major: items.filter(i => i.priority === 'major').length,
      avg_days_overdue: Math.round(items.reduce((s, i) => s + i.days_overdue, 0) / Math.max(items.length, 1)),
      max_days_overdue: Math.max(...items.map(i => i.days_overdue), 0),
      by_type: {
        capa: items.filter(i => i.type === 'CAPA').length,
        finding: items.filter(i => i.type === 'Finding').length,
        submission: items.filter(i => i.type === 'Submission').length,
        permit: items.filter(i => i.type === 'Permit').length,
        training: items.filter(i => i.type === 'Training').length,
      },
    },
  };
}

function compDashboard(params: Record<string, unknown>): unknown {
  const period = params.period as string || '2025-Q1';

  const kpis = COMPLIANCE_KPIS.filter(k => k.period === period);
  const meetingTarget = kpis.filter(k => {
    if (k.name === 'Safety Incident Rate' || k.name === 'Customer Complaint Response') return k.actual <= k.target;
    return k.actual >= k.target;
  });

  const scores = AUDIT_SCORES;
  const overdue = OVERDUE_ITEMS.filter(i => i.days_overdue > 0);

  return {
    period,
    compliance_health: {
      overall_score: Math.round(meetingTarget.length / Math.max(kpis.length, 1) * 100),
      status: meetingTarget.length === kpis.length ? 'excellent' : meetingTarget.length / kpis.length >= 0.8 ? 'good' : meetingTarget.length / kpis.length >= 0.6 ? 'needs_attention' : 'critical',
    },
    kpi_summary: {
      total: kpis.length,
      meeting_target: meetingTarget.length,
      improving: kpis.filter(k => k.trend === 'improving').length,
      declining: kpis.filter(k => k.trend === 'declining').length,
    },
    audit_summary: {
      total_audits: scores.length,
      avg_score: Math.round(scores.reduce((s, sc) => s + sc.score, 0) / Math.max(scores.length, 1)),
    },
    overdue_summary: {
      total_overdue: overdue.length,
      critical_overdue: overdue.filter(i => i.priority === 'critical').length,
      avg_days: Math.round(overdue.reduce((s, i) => s + i.days_overdue, 0) / Math.max(overdue.length, 1)),
    },
    risk_areas: kpis.filter(k => k.trend === 'declining').map(k => ({ kpi: k.name, category: k.category, gap: Math.round((k.target - k.actual) * 100) / 100 })),
  };
}

// ── Public Dispatcher ──────────────────────────────────────────────────────

export function executeComplianceMetricsAction(
  action: string,
  params: Record<string, unknown>
): unknown {
  switch (action) {
    case 'comp_kpi':       return compKPI(params);
    case 'comp_score':     return compScore(params);
    case 'comp_overdue':   return compOverdue(params);
    case 'comp_dashboard': return compDashboard(params);
    default:
      return { error: `Unknown ComplianceMetrics action: ${action}` };
  }
}
