/**
 * ProductionReadinessEngine — R19-MS2
 *
 * Pre-production go/no-go assessment engine that evaluates manufacturing readiness
 * across multiple dimensions: tooling, fixturing, programming, material, quality plan,
 * and process capability. Synthesizes R15-R18 data sources for holistic readiness scoring.
 *
 * Actions:
 *   pr_assess   — full production readiness assessment with weighted scoring
 *   pr_checklist — generate category-specific readiness checklist
 *   pr_risk     — risk analysis with probability/impact matrix
 *   pr_approve  — approval workflow with sign-off requirements
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface ReadinessCategory {
  name: string;
  weight: number;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  description: string;
  category: string;
  required: boolean;
  status: "pass" | "fail" | "warning" | "not_evaluated";
  score: number; // 0-100
  details?: string;
}

interface RiskItem {
  id: string;
  description: string;
  category: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  risk_score: number; // 1-9
  mitigation: string;
  owner?: string;
}

// ── Material & Process Databases ───────────────────────────────────────────

const MATERIAL_DB: Record<string, {
  machinability_rating: number;
  typical_cpk: number;
  thermal_sensitivity: "low" | "medium" | "high";
  tool_wear_rate: "low" | "medium" | "high";
  requires_coolant: boolean;
  special_handling: string[];
}> = {
  steel_1045:       { machinability_rating: 0.65, typical_cpk: 1.5, thermal_sensitivity: "medium", tool_wear_rate: "medium", requires_coolant: true, special_handling: [] },
  steel_4140:       { machinability_rating: 0.55, typical_cpk: 1.4, thermal_sensitivity: "medium", tool_wear_rate: "medium", requires_coolant: true, special_handling: ["hardness_check"] },
  aluminum_6061:    { machinability_rating: 0.90, typical_cpk: 1.8, thermal_sensitivity: "low", tool_wear_rate: "low", requires_coolant: false, special_handling: ["burr_control"] },
  aluminum_7075:    { machinability_rating: 0.85, typical_cpk: 1.6, thermal_sensitivity: "low", tool_wear_rate: "low", requires_coolant: true, special_handling: ["stress_relieve"] },
  titanium_ti6al4v: { machinability_rating: 0.25, typical_cpk: 1.2, thermal_sensitivity: "high", tool_wear_rate: "high", requires_coolant: true, special_handling: ["low_speed", "high_pressure_coolant", "fire_risk"] },
  stainless_304:    { machinability_rating: 0.45, typical_cpk: 1.3, thermal_sensitivity: "medium", tool_wear_rate: "high", requires_coolant: true, special_handling: ["work_hardening"] },
  cast_iron:        { machinability_rating: 0.70, typical_cpk: 1.5, thermal_sensitivity: "low", tool_wear_rate: "medium", requires_coolant: false, special_handling: ["dust_extraction"] },
  inconel_718:      { machinability_rating: 0.15, typical_cpk: 1.1, thermal_sensitivity: "high", tool_wear_rate: "high", requires_coolant: true, special_handling: ["low_speed", "high_pressure_coolant", "ceramic_tooling"] },
};

const READINESS_CATEGORIES: ReadinessCategory[] = [
  {
    name: "tooling",
    weight: 0.20,
    items: [
      { id: "T1", description: "Cutting tools specified and available", category: "tooling", required: true, status: "not_evaluated", score: 0 },
      { id: "T2", description: "Tool life validated for material", category: "tooling", required: true, status: "not_evaluated", score: 0 },
      { id: "T3", description: "Backup tooling available", category: "tooling", required: false, status: "not_evaluated", score: 0 },
      { id: "T4", description: "Tool presetter calibrated", category: "tooling", required: true, status: "not_evaluated", score: 0 },
      { id: "T5", description: "Insert grades match material", category: "tooling", required: true, status: "not_evaluated", score: 0 },
    ],
  },
  {
    name: "fixturing",
    weight: 0.15,
    items: [
      { id: "F1", description: "Workholding designed and validated", category: "fixturing", required: true, status: "not_evaluated", score: 0 },
      { id: "F2", description: "Clamping force sufficient for cutting loads", category: "fixturing", required: true, status: "not_evaluated", score: 0 },
      { id: "F3", description: "Datum surfaces accessible", category: "fixturing", required: true, status: "not_evaluated", score: 0 },
      { id: "F4", description: "Repeatability verified (<0.01mm)", category: "fixturing", required: false, status: "not_evaluated", score: 0 },
    ],
  },
  {
    name: "programming",
    weight: 0.20,
    items: [
      { id: "P1", description: "CAM program verified (simulation)", category: "programming", required: true, status: "not_evaluated", score: 0 },
      { id: "P2", description: "Post-processor validated for controller", category: "programming", required: true, status: "not_evaluated", score: 0 },
      { id: "P3", description: "Cutting parameters within safe limits", category: "programming", required: true, status: "not_evaluated", score: 0 },
      { id: "P4", description: "Collision check passed", category: "programming", required: true, status: "not_evaluated", score: 0 },
      { id: "P5", description: "Toolpath optimized for cycle time", category: "programming", required: false, status: "not_evaluated", score: 0 },
    ],
  },
  {
    name: "material",
    weight: 0.15,
    items: [
      { id: "M1", description: "Material certification available", category: "material", required: true, status: "not_evaluated", score: 0 },
      { id: "M2", description: "Stock dimensions verified", category: "material", required: true, status: "not_evaluated", score: 0 },
      { id: "M3", description: "Material lot traceability established", category: "material", required: false, status: "not_evaluated", score: 0 },
      { id: "M4", description: "Special handling requirements addressed", category: "material", required: true, status: "not_evaluated", score: 0 },
    ],
  },
  {
    name: "quality_plan",
    weight: 0.20,
    items: [
      { id: "Q1", description: "Inspection plan defined", category: "quality_plan", required: true, status: "not_evaluated", score: 0 },
      { id: "Q2", description: "GD&T interpretation documented", category: "quality_plan", required: true, status: "not_evaluated", score: 0 },
      { id: "Q3", description: "Measurement equipment calibrated", category: "quality_plan", required: true, status: "not_evaluated", score: 0 },
      { id: "Q4", description: "SPC plan established for critical dims", category: "quality_plan", required: false, status: "not_evaluated", score: 0 },
      { id: "Q5", description: "First article inspection procedure ready", category: "quality_plan", required: true, status: "not_evaluated", score: 0 },
    ],
  },
  {
    name: "process_capability",
    weight: 0.10,
    items: [
      { id: "C1", description: "Target Cpk >= 1.33 achievable", category: "process_capability", required: true, status: "not_evaluated", score: 0 },
      { id: "C2", description: "Process stability demonstrated", category: "process_capability", required: false, status: "not_evaluated", score: 0 },
      { id: "C3", description: "Measurement system analysis (MSA) done", category: "process_capability", required: false, status: "not_evaluated", score: 0 },
    ],
  },
];

const PROBABILITY_MAP: Record<string, number> = { low: 1, medium: 2, high: 3 };
const IMPACT_MAP: Record<string, number> = { low: 1, medium: 2, high: 3 };

// ── Helper Functions ───────────────────────────────────────────────────────

function evaluateChecklist(
  material: string,
  params: Record<string, unknown>,
): ChecklistItem[] {
  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;
  const items: ChecklistItem[] = [];

  for (const cat of READINESS_CATEGORIES) {
    for (const item of cat.items) {
      const evaluated = { ...item };
      evaluated.score = evaluateItem(evaluated.id, mat, params);
      evaluated.status =
        evaluated.score >= 80 ? "pass" :
        evaluated.score >= 50 ? "warning" : "fail";
      if (evaluated.score >= 80) evaluated.details = "Meets requirements";
      else if (evaluated.score >= 50) evaluated.details = "Partial — needs attention";
      else evaluated.details = "Does not meet requirements";
      items.push(evaluated);
    }
  }

  return items;
}

function evaluateItem(
  id: string,
  mat: typeof MATERIAL_DB[string],
  params: Record<string, unknown>,
): number {
  // Heuristic scoring based on provided parameters and material properties
  const hasParam = (key: string) => params[key] !== undefined && params[key] !== null;

  switch (id) {
    // Tooling
    case "T1": return hasParam("tool_type") ? 90 : hasParam("operation") ? 60 : 30;
    case "T2": return mat.tool_wear_rate === "low" ? 85 : mat.tool_wear_rate === "medium" ? 70 : 50;
    case "T3": return hasParam("backup_tools") ? 90 : 40;
    case "T4": return hasParam("presetter_date") ? 90 : 60;
    case "T5": return hasParam("insert_grade") ? 85 : mat.machinability_rating > 0.6 ? 70 : 45;

    // Fixturing
    case "F1": return hasParam("fixture_type") ? 85 : 40;
    case "F2": {
      const force = Number(params.cutting_force_n ?? 0);
      const clamp = Number(params.clamping_force_n ?? 0);
      if (clamp > 0 && force > 0) return clamp > force * 2.5 ? 95 : clamp > force * 1.5 ? 70 : 40;
      return hasParam("fixture_type") ? 60 : 30;
    }
    case "F3": return hasParam("datum_scheme") ? 85 : 55;
    case "F4": return hasParam("fixture_repeatability_mm") ? (Number(params.fixture_repeatability_mm) < 0.01 ? 95 : 60) : 50;

    // Programming
    case "P1": return hasParam("simulation_verified") ? (params.simulation_verified ? 95 : 40) : 30;
    case "P2": return hasParam("controller") ? 80 : 40;
    case "P3": {
      const vc = Number(params.cutting_speed_m_min ?? 0);
      if (vc > 0) {
        const maxVc = mat.machinability_rating * 400;
        return vc <= maxVc ? 90 : vc <= maxVc * 1.2 ? 60 : 30;
      }
      return 40;
    }
    case "P4": return hasParam("collision_check") ? (params.collision_check ? 95 : 20) : 30;
    case "P5": return hasParam("cycle_time_min") ? 75 : 50;

    // Material
    case "M1": return hasParam("material_cert") ? (params.material_cert ? 95 : 30) : 40;
    case "M2": return hasParam("stock_dimensions") ? 85 : 45;
    case "M3": return hasParam("lot_number") ? 90 : 50;
    case "M4": {
      if (mat.special_handling.length === 0) return 90;
      const addressed = Number(params.special_handling_addressed ?? 0);
      return addressed >= mat.special_handling.length ? 90 : addressed > 0 ? 60 : 30;
    }

    // Quality plan
    case "Q1": return hasParam("inspection_plan") ? 85 : 35;
    case "Q2": return hasParam("gdt_interpreted") ? (params.gdt_interpreted ? 90 : 40) : 45;
    case "Q3": return hasParam("measurement_calibrated") ? (params.measurement_calibrated ? 95 : 30) : 50;
    case "Q4": return hasParam("spc_plan") ? (params.spc_plan ? 90 : 40) : 45;
    case "Q5": return hasParam("fai_procedure") ? 85 : 40;

    // Process capability
    case "C1": {
      const cpk = Number(params.expected_cpk ?? mat.typical_cpk);
      return cpk >= 1.67 ? 95 : cpk >= 1.33 ? 80 : cpk >= 1.0 ? 55 : 30;
    }
    case "C2": return hasParam("process_stable") ? (params.process_stable ? 90 : 40) : 50;
    case "C3": return hasParam("msa_complete") ? (params.msa_complete ? 90 : 35) : 40;

    default: return 50;
  }
}

function computeCategoryScores(items: ChecklistItem[]): Record<string, { score: number; pass_count: number; total: number; required_failures: number }> {
  const result: Record<string, { score: number; pass_count: number; total: number; required_failures: number }> = {};

  for (const cat of READINESS_CATEGORIES) {
    const catItems = items.filter(i => i.category === cat.name);
    const totalScore = catItems.reduce((s, i) => s + i.score, 0);
    const passCount = catItems.filter(i => i.status === "pass").length;
    const reqFailures = catItems.filter(i => i.required && i.status === "fail").length;

    result[cat.name] = {
      score: catItems.length > 0 ? totalScore / catItems.length : 0,
      pass_count: passCount,
      total: catItems.length,
      required_failures: reqFailures,
    };
  }

  return result;
}

function computeOverallScore(categoryScores: Record<string, { score: number }>): number {
  let weighted = 0;
  for (const cat of READINESS_CATEGORIES) {
    const cs = categoryScores[cat.name];
    if (cs) weighted += cs.score * cat.weight;
  }
  return Math.round(weighted * 10) / 10;
}

function generateRisks(
  material: string,
  params: Record<string, unknown>,
  categoryScores: Record<string, { score: number; required_failures: number }>,
): RiskItem[] {
  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;
  const risks: RiskItem[] = [];

  // Material-based risks
  if (mat.thermal_sensitivity === "high") {
    risks.push({
      id: "R-MAT-1",
      description: "High thermal sensitivity may cause dimensional drift",
      category: "material",
      probability: "high",
      impact: "high",
      risk_score: 9,
      mitigation: "Implement thermal compensation and controlled environment",
    });
  }

  if (mat.tool_wear_rate === "high") {
    risks.push({
      id: "R-MAT-2",
      description: "High tool wear rate increases scrap risk",
      category: "material",
      probability: "high",
      impact: "medium",
      risk_score: 6,
      mitigation: "Use tool wear monitoring and schedule preventive changes",
    });
  }

  if (mat.special_handling.length > 0) {
    const addressed = Number(params.special_handling_addressed ?? 0);
    if (addressed < mat.special_handling.length) {
      risks.push({
        id: "R-MAT-3",
        description: `Special handling not fully addressed: ${mat.special_handling.join(", ")}`,
        category: "material",
        probability: "medium",
        impact: "high",
        risk_score: 6,
        mitigation: "Review and address all special handling requirements before production",
      });
    }
  }

  // Category-based risks
  for (const [catName, cs] of Object.entries(categoryScores)) {
    if (cs.required_failures > 0) {
      risks.push({
        id: `R-CAT-${catName.toUpperCase()}`,
        description: `${cs.required_failures} required item(s) failing in ${catName}`,
        category: catName,
        probability: "high",
        impact: "high",
        risk_score: 9,
        mitigation: `Address all required items in ${catName} category before proceeding`,
      });
    } else if (cs.score < 60) {
      risks.push({
        id: `R-CAT-${catName.toUpperCase()}`,
        description: `Low readiness score (${Math.round(cs.score)}%) in ${catName}`,
        category: catName,
        probability: "medium",
        impact: "medium",
        risk_score: 4,
        mitigation: `Review and improve ${catName} preparations`,
      });
    }
  }

  // Process-specific risks
  const batchSize = Number(params.batch_size ?? 1);
  if (batchSize > 100 && !params.spc_plan) {
    risks.push({
      id: "R-PROC-1",
      description: "Large batch without SPC plan risks undetected drift",
      category: "process_capability",
      probability: "medium",
      impact: "high",
      risk_score: 6,
      mitigation: "Establish SPC monitoring for critical dimensions",
    });
  }

  const tightestTol = Number(params.tightest_tolerance_mm ?? 0.1);
  if (tightestTol < 0.02) {
    risks.push({
      id: "R-PROC-2",
      description: `Tight tolerance (${tightestTol}mm) requires high process capability`,
      category: "quality_plan",
      probability: mat.typical_cpk >= 1.33 ? "low" : "high",
      impact: "high",
      risk_score: mat.typical_cpk >= 1.33 ? 3 : 9,
      mitigation: "Validate Cpk >= 1.67 for critical dimensions with first article inspection",
    });
  }

  // Sort by risk score descending
  risks.sort((a, b) => b.risk_score - a.risk_score);
  return risks;
}

function determineApproval(
  overallScore: number,
  categoryScores: Record<string, { required_failures: number }>,
  risks: RiskItem[],
): { decision: "approved" | "conditional" | "rejected"; conditions: string[]; blockers: string[] } {
  const blockers: string[] = [];
  const conditions: string[] = [];

  // Check for critical failures
  for (const [catName, cs] of Object.entries(categoryScores)) {
    if (cs.required_failures > 0) {
      blockers.push(`${catName}: ${cs.required_failures} required item(s) failing`);
    }
  }

  // Check for critical risks (score 9)
  const criticalRisks = risks.filter(r => r.risk_score === 9);
  for (const r of criticalRisks) {
    if (!blockers.some(b => b.includes(r.category))) {
      blockers.push(`Critical risk: ${r.description}`);
    }
  }

  // High risks become conditions
  const highRisks = risks.filter(r => r.risk_score >= 6 && r.risk_score < 9);
  for (const r of highRisks) {
    conditions.push(`Mitigate: ${r.description}`);
  }

  if (blockers.length > 0) {
    return { decision: "rejected", conditions, blockers };
  }

  if (overallScore < 60) {
    return { decision: "rejected", conditions, blockers: [`Overall readiness score (${overallScore}%) below 60% threshold`] };
  }

  if (overallScore < 80 || conditions.length > 0) {
    return { decision: "conditional", conditions, blockers: [] };
  }

  return { decision: "approved", conditions: [], blockers: [] };
}

// ── Action Handlers ────────────────────────────────────────────────────────

function prAssess(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;

  const items = evaluateChecklist(material, params);
  const categoryScores = computeCategoryScores(items);
  const overallScore = computeOverallScore(categoryScores);
  const risks = generateRisks(material, params, categoryScores);
  const approval = determineApproval(overallScore, categoryScores, risks);

  return {
    material,
    material_info: {
      machinability_rating: mat.machinability_rating,
      thermal_sensitivity: mat.thermal_sensitivity,
      tool_wear_rate: mat.tool_wear_rate,
      special_handling: mat.special_handling,
    },
    overall_score: overallScore,
    overall_status: overallScore >= 80 ? "ready" : overallScore >= 60 ? "conditional" : "not_ready",
    category_scores: categoryScores,
    checklist_summary: {
      total_items: items.length,
      passed: items.filter(i => i.status === "pass").length,
      warnings: items.filter(i => i.status === "warning").length,
      failed: items.filter(i => i.status === "fail").length,
      required_failures: items.filter(i => i.required && i.status === "fail").length,
    },
    risk_summary: {
      total_risks: risks.length,
      critical: risks.filter(r => r.risk_score === 9).length,
      high: risks.filter(r => r.risk_score >= 6 && r.risk_score < 9).length,
      medium: risks.filter(r => r.risk_score >= 3 && r.risk_score < 6).length,
      low: risks.filter(r => r.risk_score < 3).length,
    },
    approval,
  };
}

function prChecklist(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const category = params.category ? String(params.category) : undefined;

  const items = evaluateChecklist(material, params);
  const filtered = category ? items.filter(i => i.category === category) : items;

  // Group by category
  const grouped: Record<string, { items: ChecklistItem[]; category_score: number; pass_rate: number }> = {};
  for (const cat of READINESS_CATEGORIES) {
    const catItems = filtered.filter(i => i.category === cat.name);
    if (catItems.length === 0) continue;
    const avgScore = catItems.reduce((s, i) => s + i.score, 0) / catItems.length;
    grouped[cat.name] = {
      items: catItems,
      category_score: Math.round(avgScore * 10) / 10,
      pass_rate: Math.round((catItems.filter(i => i.status === "pass").length / catItems.length) * 100),
    };
  }

  return {
    material,
    filter_category: category ?? "all",
    total_items: filtered.length,
    passed: filtered.filter(i => i.status === "pass").length,
    warnings: filtered.filter(i => i.status === "warning").length,
    failed: filtered.filter(i => i.status === "fail").length,
    categories: grouped,
  };
}

function prRisk(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");

  const items = evaluateChecklist(material, params);
  const categoryScores = computeCategoryScores(items);
  const risks = generateRisks(material, params, categoryScores);

  // Build probability-impact matrix
  const matrix: Record<string, string[]> = {
    "high-high": [], "high-medium": [], "high-low": [],
    "medium-high": [], "medium-medium": [], "medium-low": [],
    "low-high": [], "low-medium": [], "low-low": [],
  };
  for (const r of risks) {
    const key = `${r.probability}-${r.impact}`;
    if (matrix[key]) matrix[key].push(r.id);
  }

  // Mitigation plan
  const mitigationPlan = risks
    .filter(r => r.risk_score >= 4)
    .map(r => ({
      risk_id: r.id,
      description: r.description,
      risk_score: r.risk_score,
      mitigation: r.mitigation,
      priority: r.risk_score >= 9 ? "immediate" : r.risk_score >= 6 ? "high" : "medium",
    }));

  return {
    material,
    total_risks: risks.length,
    risk_distribution: {
      critical: risks.filter(r => r.risk_score === 9).length,
      high: risks.filter(r => r.risk_score >= 6 && r.risk_score < 9).length,
      medium: risks.filter(r => r.risk_score >= 3 && r.risk_score < 6).length,
      low: risks.filter(r => r.risk_score < 3).length,
    },
    max_risk_score: risks.length > 0 ? risks[0].risk_score : 0,
    probability_impact_matrix: matrix,
    risks,
    mitigation_plan: mitigationPlan,
  };
}

function prApprove(params: Record<string, unknown>): unknown {
  const material = String(params.material ?? "steel_1045");
  const approverRole = String(params.approver_role ?? "process_engineer");
  const batchSize = Number(params.batch_size ?? 1);

  const items = evaluateChecklist(material, params);
  const categoryScores = computeCategoryScores(items);
  const overallScore = computeOverallScore(categoryScores);
  const risks = generateRisks(material, params, categoryScores);
  const approval = determineApproval(overallScore, categoryScores, risks);

  // Determine required sign-offs based on risk level and batch size
  const signOffs: { role: string; required: boolean; reason: string }[] = [
    { role: "process_engineer", required: true, reason: "Process parameter validation" },
    { role: "quality_engineer", required: true, reason: "Quality plan and inspection verification" },
  ];

  if (batchSize > 50) {
    signOffs.push({ role: "production_manager", required: true, reason: "Production capacity and scheduling" });
  }

  if (risks.some(r => r.risk_score >= 6)) {
    signOffs.push({ role: "safety_officer", required: true, reason: "Risk mitigation verification" });
  }

  const mat = MATERIAL_DB[material] ?? MATERIAL_DB.steel_1045;
  if (mat.special_handling.includes("fire_risk")) {
    signOffs.push({ role: "safety_officer", required: true, reason: "Fire risk assessment" });
  }

  if (mat.machinability_rating < 0.3) {
    signOffs.push({ role: "tooling_specialist", required: true, reason: "Difficult-to-machine material tooling review" });
  }

  // De-duplicate sign-offs
  const uniqueSignOffs = signOffs.filter((s, idx) =>
    signOffs.findIndex(x => x.role === s.role) === idx
  );

  return {
    material,
    batch_size: batchSize,
    overall_score: overallScore,
    decision: approval.decision,
    blockers: approval.blockers,
    conditions: approval.conditions,
    required_sign_offs: uniqueSignOffs,
    approver_role: approverRole,
    approval_status: approval.decision === "approved" ? "ready_for_production" :
                     approval.decision === "conditional" ? "conditional_approval" : "hold",
    next_steps: approval.decision === "approved"
      ? ["Schedule production run", "Prepare first article inspection", "Set up SPC monitoring"]
      : approval.decision === "conditional"
        ? ["Address conditions listed above", "Re-assess after mitigations", "Obtain all required sign-offs"]
        : ["Resolve all blockers", "Re-run readiness assessment", "Escalate if timeline impacted"],
    timestamp: new Date().toISOString(),
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeProductionReadinessAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "pr_assess":    return prAssess(params);
    case "pr_checklist": return prChecklist(params);
    case "pr_risk":      return prRisk(params);
    case "pr_approve":   return prApprove(params);
    default:
      throw new Error(`ProductionReadinessEngine: unknown action "${action}"`);
  }
}
