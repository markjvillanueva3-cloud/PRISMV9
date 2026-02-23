/**
 * ECNManagementEngine — R27-MS1
 *
 * Engineering Change Notice (ECN) management: change tracking, impact analysis,
 * approval workflow automation, and implementation monitoring.
 *
 * Actions:
 *   ecn_create    — Create an ECN with affected items and justification
 *   ecn_impact    — Analyze downstream impact of a proposed change
 *   ecn_approve   — Manage approval workflow (review, approve, reject)
 *   ecn_implement — Track implementation status and completion
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ECNRecord {
  ecn_id: string;
  title: string;
  description: string;
  type: "design" | "process" | "material" | "tooling" | "specification";
  priority: "critical" | "high" | "medium" | "low";
  status: "draft" | "review" | "approved" | "in_progress" | "implemented" | "closed" | "rejected";
  requestor: string;
  affected_parts: string[];
  affected_documents: string[];
  affected_operations: string[];
  justification: string;
  cost_impact: number;
  schedule_impact_days: number;
  quality_impact: "positive" | "neutral" | "negative";
  created_date: string;
  target_date: string;
  implemented_date: string | null;
  approval_chain: ApprovalStep[];
}

interface ApprovalStep {
  role: string;
  approver: string;
  status: "pending" | "approved" | "rejected" | "deferred";
  date: string | null;
  comments: string;
}

interface ImpactRecord {
  part_id: string;
  part_name: string;
  impact_type: "redesign" | "retool" | "reprocess" | "retest" | "documentation" | "training";
  severity: "high" | "medium" | "low";
  estimated_effort_hours: number;
  affected_bom_levels: number[];
  downstream_assemblies: string[];
  inventory_at_risk: number;
  scrap_cost: number;
}

interface ImplementationTask {
  task_id: string;
  ecn_id: string;
  description: string;
  assignee: string;
  department: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  percent_complete: number;
  due_date: string;
  dependencies: string[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ECN_DATABASE: ECNRecord[] = [
  {
    ecn_id: "ECN-2024-001",
    title: "Material upgrade: AL-6061 to AL-7075 for bracket assembly",
    description: "Upgrade bracket material from 6061-T6 to 7075-T6 for improved fatigue life",
    type: "material",
    priority: "high",
    status: "implemented",
    requestor: "J. Chen",
    affected_parts: ["BRK-1001", "BRK-1002", "BRK-1003"],
    affected_documents: ["DWG-BRK-1001-R3", "DWG-BRK-1002-R2", "SPEC-MAT-AL"],
    affected_operations: ["OP-MILL-BRK", "OP-ANNEAL-BRK", "OP-INSPECT-BRK"],
    justification: "Field failure analysis revealed fatigue cracking in high-vibration applications",
    cost_impact: 2400,
    schedule_impact_days: 5,
    quality_impact: "positive",
    created_date: "2024-09-15",
    target_date: "2024-10-15",
    implemented_date: "2024-10-12",
    approval_chain: [
      { role: "Engineering", approver: "M. Torres", status: "approved", date: "2024-09-18", comments: "FEA confirms 40% fatigue life improvement" },
      { role: "Quality", approver: "S. Patel", status: "approved", date: "2024-09-19", comments: "Updated IQ/OQ protocols" },
      { role: "Manufacturing", approver: "R. Kim", status: "approved", date: "2024-09-20", comments: "Feeds/speeds adjustment needed for 7075" },
      { role: "Procurement", approver: "L. Davis", status: "approved", date: "2024-09-21", comments: "7075-T6 available from current supplier" },
    ],
  },
  {
    ecn_id: "ECN-2024-002",
    title: "Tolerance tightening on shaft bore diameter",
    description: "Tighten bore ID tolerance from ±0.05mm to ±0.025mm per customer requirement",
    type: "design",
    priority: "critical",
    status: "in_progress",
    requestor: "A. Johnson",
    affected_parts: ["SFT-2001", "SFT-2002"],
    affected_documents: ["DWG-SFT-2001-R5", "SPEC-BORE-TOL"],
    affected_operations: ["OP-BORE-SFT", "OP-GRIND-SFT", "OP-CMM-SFT"],
    justification: "Customer spec revision requires tighter fit for bearing interface",
    cost_impact: 8500,
    schedule_impact_days: 14,
    quality_impact: "positive",
    created_date: "2024-10-01",
    target_date: "2024-11-15",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "M. Torres", status: "approved", date: "2024-10-03", comments: "Process capability study initiated" },
      { role: "Quality", approver: "S. Patel", status: "approved", date: "2024-10-04", comments: "Cpk target 1.67 required" },
      { role: "Manufacturing", approver: "R. Kim", status: "approved", date: "2024-10-05", comments: "Need precision grinding added" },
      { role: "Finance", approver: "T. Wilson", status: "pending", date: null, comments: "" },
    ],
  },
  {
    ecn_id: "ECN-2024-003",
    title: "Process change: conventional to climb milling for housing",
    description: "Switch milling strategy from conventional to climb for improved surface finish",
    type: "process",
    priority: "medium",
    status: "approved",
    requestor: "R. Kim",
    affected_parts: ["HSG-3001", "HSG-3002", "HSG-3003", "HSG-3004"],
    affected_documents: ["CAM-HSG-3001", "SETUP-HSG-MILL"],
    affected_operations: ["OP-ROUGH-HSG", "OP-FINISH-HSG"],
    justification: "Climb milling reduces tool wear 25% and improves Ra from 1.6 to 0.8 µm",
    cost_impact: -1200,
    schedule_impact_days: 3,
    quality_impact: "positive",
    created_date: "2024-10-10",
    target_date: "2024-11-01",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "J. Chen", status: "approved", date: "2024-10-12", comments: "Test cuts verified" },
      { role: "Quality", approver: "S. Patel", status: "approved", date: "2024-10-13", comments: "Surface finish improvement confirmed" },
      { role: "Manufacturing", approver: "R. Kim", status: "approved", date: "2024-10-14", comments: "CAM programs ready" },
    ],
  },
  {
    ecn_id: "ECN-2024-004",
    title: "Tooling change: carbide insert grade upgrade for stainless turning",
    description: "Replace current KC5010 inserts with KC5525 for 316 stainless turning operations",
    type: "tooling",
    priority: "medium",
    status: "review",
    requestor: "B. Martinez",
    affected_parts: ["VLV-4001", "VLV-4002", "FTG-4003"],
    affected_documents: ["TOOL-LIST-TURN-SS", "SETUP-VLV-TURN"],
    affected_operations: ["OP-TURN-VLV", "OP-TURN-FTG"],
    justification: "KC5525 shows 35% longer tool life in stainless with improved chip control",
    cost_impact: 600,
    schedule_impact_days: 0,
    quality_impact: "positive",
    created_date: "2024-10-20",
    target_date: "2024-11-10",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "J. Chen", status: "approved", date: "2024-10-22", comments: "Tool life testing validates claim" },
      { role: "Manufacturing", approver: "R. Kim", status: "pending", date: null, comments: "" },
      { role: "Procurement", approver: "L. Davis", status: "pending", date: null, comments: "" },
    ],
  },
  {
    ecn_id: "ECN-2024-005",
    title: "Specification update: surface treatment change to hard anodize",
    description: "Change surface treatment from Type II to Type III (hard) anodize for wear resistance",
    type: "specification",
    priority: "high",
    status: "draft",
    requestor: "S. Patel",
    affected_parts: ["PLT-5001", "PLT-5002", "CVR-5003"],
    affected_documents: ["SPEC-SURFACE-PLT", "DWG-PLT-5001-R2", "QC-PLAN-PLT"],
    affected_operations: ["OP-ANODIZE-PLT", "OP-DIM-CHECK-PLT"],
    justification: "Wear testing shows Type III increases service life 3x in high-abrasion environment",
    cost_impact: 3800,
    schedule_impact_days: 7,
    quality_impact: "positive",
    created_date: "2024-10-25",
    target_date: "2024-12-01",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "M. Torres", status: "pending", date: null, comments: "" },
      { role: "Quality", approver: "S. Patel", status: "pending", date: null, comments: "" },
      { role: "Manufacturing", approver: "R. Kim", status: "pending", date: null, comments: "" },
      { role: "Procurement", approver: "L. Davis", status: "pending", date: null, comments: "" },
    ],
  },
  {
    ecn_id: "ECN-2024-006",
    title: "Design revision: add lightening pockets to mounting plate",
    description: "Add weight-reduction pockets to reduce plate weight by 30% while maintaining stiffness",
    type: "design",
    priority: "low",
    status: "rejected",
    requestor: "A. Johnson",
    affected_parts: ["PLT-6001"],
    affected_documents: ["DWG-PLT-6001-R4"],
    affected_operations: ["OP-MILL-PLT", "OP-DEBURR-PLT"],
    justification: "Weight reduction requested for aerospace application",
    cost_impact: 5200,
    schedule_impact_days: 21,
    quality_impact: "negative",
    created_date: "2024-08-15",
    target_date: "2024-09-30",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "M. Torres", status: "approved", date: "2024-08-18", comments: "FEA shows 12% stiffness reduction - marginal" },
      { role: "Quality", approver: "S. Patel", status: "rejected", date: "2024-08-20", comments: "Stiffness reduction unacceptable for critical mounting" },
    ],
  },
  {
    ecn_id: "ECN-2024-007",
    title: "Process optimization: reduce setup time with quick-change fixtures",
    description: "Implement quick-change pallet system to reduce setup time from 45 to 8 minutes",
    type: "process",
    priority: "high",
    status: "approved",
    requestor: "R. Kim",
    affected_parts: ["BLK-7001", "BLK-7002", "BLK-7003", "BLK-7004", "BLK-7005"],
    affected_documents: ["SETUP-BLK-MILL", "FIXTURE-PALLET-QC"],
    affected_operations: ["OP-SETUP-BLK", "OP-MILL-BLK"],
    justification: "Setup time reduction enables 18% throughput increase on bottleneck machine",
    cost_impact: -15000,
    schedule_impact_days: -10,
    quality_impact: "positive",
    created_date: "2024-10-05",
    target_date: "2024-11-20",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "J. Chen", status: "approved", date: "2024-10-07", comments: "Fixture design validated" },
      { role: "Manufacturing", approver: "R. Kim", status: "approved", date: "2024-10-08", comments: "Pilot run successful" },
      { role: "Finance", approver: "T. Wilson", status: "approved", date: "2024-10-10", comments: "ROI 4.2 months" },
    ],
  },
  {
    ecn_id: "ECN-2024-008",
    title: "Material substitution: titanium Grade 5 to Grade 23 for implant pin",
    description: "Substitute Ti-6Al-4V with Ti-6Al-4V ELI for improved biocompatibility",
    type: "material",
    priority: "critical",
    status: "in_progress",
    requestor: "M. Torres",
    affected_parts: ["IMP-8001", "IMP-8002"],
    affected_documents: ["DWG-IMP-8001-R6", "SPEC-MAT-TI", "DHF-IMP-8001"],
    affected_operations: ["OP-TURN-IMP", "OP-MILL-IMP", "OP-PASSIVATE-IMP", "OP-INSPECT-IMP"],
    justification: "FDA guidance update requires ELI grade for Class III implants",
    cost_impact: 12000,
    schedule_impact_days: 30,
    quality_impact: "positive",
    created_date: "2024-09-01",
    target_date: "2024-12-15",
    implemented_date: null,
    approval_chain: [
      { role: "Engineering", approver: "M. Torres", status: "approved", date: "2024-09-05", comments: "Material properties verified" },
      { role: "Quality", approver: "S. Patel", status: "approved", date: "2024-09-06", comments: "Biocompatibility testing planned" },
      { role: "Regulatory", approver: "K. Zhao", status: "approved", date: "2024-09-10", comments: "510(k) amendment required" },
      { role: "Manufacturing", approver: "R. Kim", status: "approved", date: "2024-09-12", comments: "ELI machinability similar to Grade 5" },
      { role: "Procurement", approver: "L. Davis", status: "approved", date: "2024-09-15", comments: "ELI premium ~$8/lb higher" },
    ],
  },
];

const IMPACT_DATABASE: ImpactRecord[] = [
  { part_id: "BRK-1001", part_name: "Bracket Assembly A", impact_type: "reprocess", severity: "medium", estimated_effort_hours: 8, affected_bom_levels: [1, 2], downstream_assemblies: ["ASSY-TOP-001", "ASSY-MAIN-001"], inventory_at_risk: 150, scrap_cost: 2250 },
  { part_id: "SFT-2001", part_name: "Drive Shaft", impact_type: "retool", severity: "high", estimated_effort_hours: 24, affected_bom_levels: [1], downstream_assemblies: ["ASSY-DRIVE-001"], inventory_at_risk: 45, scrap_cost: 6750 },
  { part_id: "HSG-3001", part_name: "Motor Housing", impact_type: "reprocess", severity: "low", estimated_effort_hours: 4, affected_bom_levels: [1, 2, 3], downstream_assemblies: ["ASSY-MOTOR-001", "ASSY-PUMP-001"], inventory_at_risk: 0, scrap_cost: 0 },
  { part_id: "VLV-4001", part_name: "Control Valve Body", impact_type: "retool", severity: "medium", estimated_effort_hours: 6, affected_bom_levels: [1], downstream_assemblies: ["ASSY-VALVE-001"], inventory_at_risk: 80, scrap_cost: 1600 },
  { part_id: "PLT-5001", part_name: "Wear Plate", impact_type: "retest", severity: "medium", estimated_effort_hours: 16, affected_bom_levels: [1, 2], downstream_assemblies: ["ASSY-GUARD-001"], inventory_at_risk: 200, scrap_cost: 4000 },
  { part_id: "IMP-8001", part_name: "Implant Pin A", impact_type: "redesign", severity: "high", estimated_effort_hours: 40, affected_bom_levels: [1], downstream_assemblies: ["ASSY-IMPLANT-001"], inventory_at_risk: 20, scrap_cost: 8000 },
  { part_id: "BLK-7001", part_name: "Block Component A", impact_type: "retool", severity: "low", estimated_effort_hours: 2, affected_bom_levels: [1], downstream_assemblies: ["ASSY-BASE-001"], inventory_at_risk: 0, scrap_cost: 0 },
  { part_id: "IMP-8002", part_name: "Implant Pin B", impact_type: "documentation", severity: "medium", estimated_effort_hours: 12, affected_bom_levels: [1], downstream_assemblies: ["ASSY-IMPLANT-002"], inventory_at_risk: 15, scrap_cost: 6000 },
  { part_id: "BRK-1002", part_name: "Bracket Assembly B", impact_type: "training", severity: "low", estimated_effort_hours: 4, affected_bom_levels: [2], downstream_assemblies: ["ASSY-TOP-001"], inventory_at_risk: 120, scrap_cost: 1800 },
  { part_id: "HSG-3003", part_name: "Pump Housing", impact_type: "reprocess", severity: "low", estimated_effort_hours: 3, affected_bom_levels: [1, 2], downstream_assemblies: ["ASSY-PUMP-002"], inventory_at_risk: 0, scrap_cost: 0 },
];

const IMPLEMENTATION_TASKS: ImplementationTask[] = [
  { task_id: "TASK-001-01", ecn_id: "ECN-2024-001", description: "Update CAM programs for 7075 feeds/speeds", assignee: "B. Martinez", department: "Engineering", status: "completed", percent_complete: 100, due_date: "2024-09-28", dependencies: [] },
  { task_id: "TASK-001-02", ecn_id: "ECN-2024-001", description: "Order 7075-T6 bar stock from supplier", assignee: "L. Davis", department: "Procurement", status: "completed", percent_complete: 100, due_date: "2024-10-01", dependencies: [] },
  { task_id: "TASK-001-03", ecn_id: "ECN-2024-001", description: "Run first article inspection", assignee: "S. Patel", department: "Quality", status: "completed", percent_complete: 100, due_date: "2024-10-10", dependencies: ["TASK-001-01", "TASK-001-02"] },
  { task_id: "TASK-002-01", ecn_id: "ECN-2024-002", description: "Qualify precision grinding process", assignee: "R. Kim", department: "Manufacturing", status: "in_progress", percent_complete: 60, due_date: "2024-11-01", dependencies: [] },
  { task_id: "TASK-002-02", ecn_id: "ECN-2024-002", description: "Update CMM inspection program", assignee: "S. Patel", department: "Quality", status: "in_progress", percent_complete: 30, due_date: "2024-11-05", dependencies: [] },
  { task_id: "TASK-002-03", ecn_id: "ECN-2024-002", description: "Validate Cpk ≥ 1.67 on 30-piece study", assignee: "S. Patel", department: "Quality", status: "not_started", percent_complete: 0, due_date: "2024-11-10", dependencies: ["TASK-002-01", "TASK-002-02"] },
  { task_id: "TASK-007-01", ecn_id: "ECN-2024-007", description: "Fabricate quick-change pallet fixtures", assignee: "B. Martinez", department: "Toolroom", status: "in_progress", percent_complete: 75, due_date: "2024-11-05", dependencies: [] },
  { task_id: "TASK-007-02", ecn_id: "ECN-2024-007", description: "Train operators on new pallet system", assignee: "R. Kim", department: "Manufacturing", status: "not_started", percent_complete: 0, due_date: "2024-11-12", dependencies: ["TASK-007-01"] },
  { task_id: "TASK-008-01", ecn_id: "ECN-2024-008", description: "Procure Ti-6Al-4V ELI bar stock", assignee: "L. Davis", department: "Procurement", status: "in_progress", percent_complete: 40, due_date: "2024-10-30", dependencies: [] },
  { task_id: "TASK-008-02", ecn_id: "ECN-2024-008", description: "Update machining parameters for ELI grade", assignee: "J. Chen", department: "Engineering", status: "not_started", percent_complete: 0, due_date: "2024-11-15", dependencies: ["TASK-008-01"] },
  { task_id: "TASK-008-03", ecn_id: "ECN-2024-008", description: "Submit 510(k) amendment to FDA", assignee: "K. Zhao", department: "Regulatory", status: "in_progress", percent_complete: 25, due_date: "2024-11-30", dependencies: [] },
  { task_id: "TASK-008-04", ecn_id: "ECN-2024-008", description: "Biocompatibility testing per ISO 10993", assignee: "S. Patel", department: "Quality", status: "not_started", percent_complete: 0, due_date: "2024-12-01", dependencies: ["TASK-008-01"] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getECNsByStatus(status?: string): ECNRecord[] {
  if (!status) return ECN_DATABASE;
  return ECN_DATABASE.filter((e) => e.status === status);
}

function getECNById(ecnId: string): ECNRecord | undefined {
  return ECN_DATABASE.find((e) => e.ecn_id === ecnId);
}

function getImpactForECN(ecnId: string): ImpactRecord[] {
  const ecn = getECNById(ecnId);
  if (!ecn) return [];
  return IMPACT_DATABASE.filter((i) => ecn.affected_parts.includes(i.part_id));
}

function getTasksForECN(ecnId: string): ImplementationTask[] {
  return IMPLEMENTATION_TASKS.filter((t) => t.ecn_id === ecnId);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function ecnCreate(params: Record<string, unknown>): unknown {
  const type = (params.type as string) || "all";
  const priority = params.priority as string | undefined;

  let ecns = type === "all" ? ECN_DATABASE : ECN_DATABASE.filter((e) => e.type === type);
  if (priority) ecns = ecns.filter((e) => e.priority === priority);

  const statusSummary: Record<string, number> = {};
  for (const e of ecns) {
    statusSummary[e.status] = (statusSummary[e.status] || 0) + 1;
  }

  const totalCostImpact = ecns.reduce((s, e) => s + e.cost_impact, 0);
  const avgScheduleImpact = ecns.length > 0
    ? Math.round(ecns.reduce((s, e) => s + e.schedule_impact_days, 0) / ecns.length)
    : 0;

  return {
    action: "ecn_create",
    total_ecns: ecns.length,
    status_distribution: statusSummary,
    ecns: ecns.map((e) => ({
      ecn_id: e.ecn_id,
      title: e.title,
      type: e.type,
      priority: e.priority,
      status: e.status,
      requestor: e.requestor,
      affected_parts_count: e.affected_parts.length,
      cost_impact: e.cost_impact,
      schedule_impact_days: e.schedule_impact_days,
      created_date: e.created_date,
      target_date: e.target_date,
      approval_progress: `${e.approval_chain.filter((a) => a.status === "approved").length}/${e.approval_chain.length}`,
    })),
    summary: {
      total_cost_impact: totalCostImpact,
      avg_schedule_impact_days: avgScheduleImpact,
      critical_count: ecns.filter((e) => e.priority === "critical").length,
      overdue_count: ecns.filter((e) => e.status !== "implemented" && e.status !== "closed" && e.status !== "rejected" && new Date(e.target_date) < new Date("2024-11-01")).length,
    },
  };
}

function ecnImpact(params: Record<string, unknown>): unknown {
  const ecnId = (params.ecn_id as string) || (params.ecnId as string) || "ECN-2024-002";
  const ecn = getECNById(ecnId);
  if (!ecn) {
    return { action: "ecn_impact", error: `ECN ${ecnId} not found`, available: ECN_DATABASE.map((e) => e.ecn_id) };
  }

  const impacts = getImpactForECN(ecnId);

  // Aggregate impact analysis
  const totalEffort = impacts.reduce((s, i) => s + i.estimated_effort_hours, 0);
  const totalScrapCost = impacts.reduce((s, i) => s + i.scrap_cost, 0);
  const totalInventoryAtRisk = impacts.reduce((s, i) => s + i.inventory_at_risk, 0);
  const allDownstream = [...new Set(impacts.flatMap((i) => i.downstream_assemblies))];
  const maxBomDepth = Math.max(...impacts.flatMap((i) => i.affected_bom_levels), 0);

  // Severity distribution
  const severityDist: Record<string, number> = {};
  for (const i of impacts) {
    severityDist[i.severity] = (severityDist[i.severity] || 0) + 1;
  }

  // Impact type breakdown
  const typeDist: Record<string, number> = {};
  for (const i of impacts) {
    typeDist[i.impact_type] = (typeDist[i.impact_type] || 0) + 1;
  }

  // Risk score: weighted by severity and scope
  const riskWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const riskScore = impacts.reduce((s, i) => s + (riskWeights[i.severity] || 1) * i.estimated_effort_hours, 0);
  const maxRisk = impacts.length * 3 * 40; // max severity * max hours
  const normalizedRisk = maxRisk > 0 ? Math.round((riskScore / maxRisk) * 100) : 0;

  return {
    action: "ecn_impact",
    ecn_id: ecnId,
    ecn_title: ecn.title,
    affected_parts: impacts.map((i) => ({
      part_id: i.part_id,
      part_name: i.part_name,
      impact_type: i.impact_type,
      severity: i.severity,
      effort_hours: i.estimated_effort_hours,
      scrap_cost: i.scrap_cost,
      inventory_at_risk: i.inventory_at_risk,
      bom_depth: Math.max(...i.affected_bom_levels),
      downstream_assemblies: i.downstream_assemblies,
    })),
    impact_summary: {
      total_parts_affected: impacts.length,
      total_effort_hours: totalEffort,
      total_scrap_cost: totalScrapCost,
      total_inventory_at_risk: totalInventoryAtRisk,
      downstream_assemblies_affected: allDownstream.length,
      max_bom_depth: maxBomDepth,
      severity_distribution: severityDist,
      impact_type_breakdown: typeDist,
      risk_score: normalizedRisk,
      risk_level: normalizedRisk > 60 ? "HIGH" : normalizedRisk > 30 ? "MEDIUM" : "LOW",
    },
    recommendation: normalizedRisk > 60
      ? "High-risk change — consider phased implementation with pilot run"
      : normalizedRisk > 30
        ? "Moderate-risk change — standard approval with enhanced monitoring"
        : "Low-risk change — proceed with standard change process",
  };
}

function ecnApprove(params: Record<string, unknown>): unknown {
  const ecnId = (params.ecn_id as string) || (params.ecnId as string) || "";
  const status = (params.status as string) || "all";

  let ecns = status === "all" ? ECN_DATABASE : getECNsByStatus(status);
  if (ecnId) {
    const single = getECNById(ecnId);
    ecns = single ? [single] : [];
  }

  const approvalAnalysis = ecns.map((e) => {
    const approved = e.approval_chain.filter((a) => a.status === "approved").length;
    const total = e.approval_chain.length;
    const pending = e.approval_chain.filter((a) => a.status === "pending");
    const rejected = e.approval_chain.filter((a) => a.status === "rejected");
    const daysSinceCreation = Math.round((new Date("2024-11-01").getTime() - new Date(e.created_date).getTime()) / 86400000);
    const daysToTarget = Math.round((new Date(e.target_date).getTime() - new Date("2024-11-01").getTime()) / 86400000);

    return {
      ecn_id: e.ecn_id,
      title: e.title,
      status: e.status,
      priority: e.priority,
      approval_progress: `${approved}/${total}`,
      percent_approved: Math.round((approved / total) * 100),
      pending_approvers: pending.map((a) => ({ role: a.role, approver: a.approver })),
      rejected_by: rejected.map((a) => ({ role: a.role, approver: a.approver, comments: a.comments })),
      days_in_process: daysSinceCreation,
      days_to_target: daysToTarget,
      at_risk: daysToTarget < 7 && e.status !== "implemented" && e.status !== "closed" && e.status !== "rejected",
      approval_timeline: e.approval_chain.map((a) => ({
        role: a.role,
        status: a.status,
        date: a.date,
        comments: a.comments,
      })),
    };
  });

  const bottlenecks = approvalAnalysis
    .filter((a) => a.pending_approvers.length > 0 && a.at_risk)
    .map((a) => ({
      ecn_id: a.ecn_id,
      blocking_approver: a.pending_approvers[0],
      days_to_target: a.days_to_target,
      priority: a.priority,
    }));

  return {
    action: "ecn_approve",
    ecn_count: approvalAnalysis.length,
    approvals: approvalAnalysis,
    bottlenecks,
    summary: {
      fully_approved: approvalAnalysis.filter((a) => a.percent_approved === 100).length,
      partially_approved: approvalAnalysis.filter((a) => a.percent_approved > 0 && a.percent_approved < 100).length,
      not_started: approvalAnalysis.filter((a) => a.percent_approved === 0).length,
      at_risk_count: approvalAnalysis.filter((a) => a.at_risk).length,
      avg_approval_days: Math.round(approvalAnalysis.reduce((s, a) => s + a.days_in_process, 0) / approvalAnalysis.length),
    },
  };
}

function ecnImplement(params: Record<string, unknown>): unknown {
  const ecnId = (params.ecn_id as string) || (params.ecnId as string) || "";
  const status = (params.status as string) || "all";

  let targetECNs = ECN_DATABASE.filter((e) => ["approved", "in_progress", "implemented"].includes(e.status));
  if (ecnId) {
    const single = getECNById(ecnId);
    targetECNs = single ? [single] : [];
  }

  const implementationStatus = targetECNs.map((e) => {
    const tasks = getTasksForECN(e.ecn_id);
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const overallProgress = tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.percent_complete, 0) / tasks.length)
      : 0;
    const blockedTasks = tasks.filter((t) => t.status === "blocked");
    const criticalPath = tasks.filter((t) => t.dependencies.length > 0 && t.status !== "completed");

    // Department workload
    const deptWorkload: Record<string, number> = {};
    for (const t of tasks.filter((t) => t.status !== "completed")) {
      deptWorkload[t.department] = (deptWorkload[t.department] || 0) + 1;
    }

    return {
      ecn_id: e.ecn_id,
      title: e.title,
      ecn_status: e.status,
      target_date: e.target_date,
      total_tasks: tasks.length,
      completed_tasks: completedTasks,
      overall_progress: overallProgress,
      tasks: tasks.map((t) => ({
        task_id: t.task_id,
        description: t.description,
        assignee: t.assignee,
        department: t.department,
        status: t.status,
        percent_complete: t.percent_complete,
        due_date: t.due_date,
        dependencies: t.dependencies,
      })),
      blocked_tasks: blockedTasks.length,
      critical_path_items: criticalPath.length,
      department_workload: deptWorkload,
      on_track: overallProgress >= 50 || e.status === "implemented",
    };
  });

  // Cross-ECN resource analysis
  const allOpenTasks = IMPLEMENTATION_TASKS.filter((t) => t.status !== "completed");
  const assigneeLoad: Record<string, number> = {};
  for (const t of allOpenTasks) {
    assigneeLoad[t.assignee] = (assigneeLoad[t.assignee] || 0) + 1;
  }
  const overloadedResources = Object.entries(assigneeLoad)
    .filter(([, count]) => count >= 3)
    .map(([name, count]) => ({ assignee: name, open_tasks: count }));

  return {
    action: "ecn_implement",
    ecn_count: implementationStatus.length,
    implementations: implementationStatus,
    resource_analysis: {
      total_open_tasks: allOpenTasks.length,
      assignee_workload: assigneeLoad,
      overloaded_resources: overloadedResources,
    },
    summary: {
      fully_implemented: implementationStatus.filter((i) => i.overall_progress === 100).length,
      on_track: implementationStatus.filter((i) => i.on_track).length,
      at_risk: implementationStatus.filter((i) => !i.on_track).length,
      blocked: implementationStatus.filter((i) => i.blocked_tasks > 0).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeECNManagementAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "ecn_create":
      return ecnCreate(params);
    case "ecn_impact":
      return ecnImpact(params);
    case "ecn_approve":
      return ecnApprove(params);
    case "ecn_implement":
      return ecnImplement(params);
    default:
      return { error: `Unknown ECN management action: ${action}` };
  }
}
