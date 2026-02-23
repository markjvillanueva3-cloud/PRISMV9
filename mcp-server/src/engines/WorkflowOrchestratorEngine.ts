/**
 * WorkflowOrchestratorEngine — R20-MS1
 *
 * Goal-driven multi-engine workflow composition. Takes a high-level manufacturing
 * goal (e.g., "optimize surface finish for Ti6Al4V turning") and automatically
 * decomposes it into a sequence of engine calls, executes them in dependency order,
 * and synthesizes results.
 *
 * Builds on ManusATCSBridge/TaskAgentClassifier for task classification,
 * and CCELiteEngine for recipe-based composition.
 *
 * Actions:
 *   wfo_plan     — create a workflow plan from a manufacturing goal
 *   wfo_execute  — execute a planned workflow step-by-step (dry run)
 *   wfo_status   — get status of available engines and capabilities
 *   wfo_optimize — suggest workflow improvements based on goal + constraints
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  engine: string;
  action: string;
  description: string;
  params_needed: string[];
  depends_on: string[];
  estimated_effort: "low" | "medium" | "high";
  optional: boolean;
}

interface WorkflowPlan {
  goal: string;
  goal_type: string;
  material: string;
  total_steps: number;
  parallel_groups: string[][];
  steps: WorkflowStep[];
  estimated_complexity: "simple" | "moderate" | "complex";
  coverage: string[];
}

// ── Engine Capability Registry ─────────────────────────────────────────────

interface EngineCapability {
  engine: string;
  actions: string[];
  category: string;
  provides: string[];
  requires: string[];
  description: string;
}

const ENGINE_REGISTRY: EngineCapability[] = [
  // R15 Physics
  { engine: "calc", actions: ["calculate_kienzle", "calculate_taylor", "calculate_surface_finish"], category: "physics", provides: ["cutting_force", "tool_life", "surface_finish"], requires: ["material", "cutting_params"], description: "Core physics: Kienzle force, Taylor tool life, surface finish" },

  // R16 Simulation
  { engine: "calc", actions: ["cs_full_sim", "cs_quick_sim"], category: "simulation", provides: ["cutting_simulation", "force_profile", "thermal_profile"], requires: ["material", "cutting_params", "tool_geometry"], description: "Cutting simulation with force/thermal profiles" },
  { engine: "calc", actions: ["dt_state", "dt_predict"], category: "simulation", provides: ["digital_twin", "state_prediction"], requires: ["machine_state"], description: "Digital twin state management" },
  { engine: "calc", actions: ["pv_verify", "pv_limits"], category: "simulation", provides: ["process_verification"], requires: ["material", "cutting_params"], description: "Process parameter verification" },

  // R17 Closed-Loop
  { engine: "calc", actions: ["mfb_record", "mfb_compare", "mfb_error_stats"], category: "feedback", provides: ["measurement_data", "model_error"], requires: ["measurements", "predictions"], description: "Measurement feedback and error analysis" },
  { engine: "calc", actions: ["spc_xbar_r", "spc_cusum", "spc_ewma", "spc_capability"], category: "spc", provides: ["process_control", "capability_index", "drift_detection"], requires: ["measurement_series"], description: "Statistical process control" },
  { engine: "calc", actions: ["cal_update", "cal_status"], category: "calibration", provides: ["model_calibration"], requires: ["measurement_data", "model_error"], description: "Bayesian model calibration" },
  { engine: "calc", actions: ["batch_kpi", "batch_trend"], category: "analytics", provides: ["kpi_metrics", "trend_analysis"], requires: ["batch_data"], description: "Batch analytics and KPIs" },

  // R18 Quality
  { engine: "calc", actions: ["gdt_chain_montecarlo", "gdt_chain_allocate", "gdt_chain_sensitivity"], category: "tolerance", provides: ["tolerance_analysis", "allocation"], requires: ["tolerance_chain"], description: "GD&T tolerance chain analysis" },
  { engine: "calc", actions: ["mps_roughing_plan", "mps_finish_plan", "mps_full_strategy"], category: "strategy", provides: ["multi_pass_strategy", "cycle_time"], requires: ["material", "stock_removal"], description: "Multi-pass machining strategy" },
  { engine: "calc", actions: ["cpk_analyze", "cpk_improve"], category: "capability", provides: ["process_capability", "improvement_plan"], requires: ["measurements", "specification"], description: "Process capability analysis" },
  { engine: "calc", actions: ["twc_predict", "twc_compensate", "twc_schedule"], category: "compensation", provides: ["wear_prediction", "compensation_offset", "tool_schedule"], requires: ["material", "cutting_params"], description: "Tool wear compensation" },

  // R19 Decision Support
  { engine: "calc", actions: ["ds_recommend", "ds_validate", "ds_compare", "ds_explain"], category: "decision", provides: ["parameter_recommendation", "validation", "comparison", "explanation"], requires: ["material", "operation"], description: "Decision support for parameter selection" },
  { engine: "calc", actions: ["pr_assess", "pr_checklist", "pr_risk", "pr_approve"], category: "readiness", provides: ["readiness_assessment", "risk_analysis", "approval"], requires: ["material", "process_config"], description: "Production readiness assessment" },
  { engine: "calc", actions: ["rca_diagnose", "rca_tree", "rca_correlate", "rca_action_plan"], category: "diagnosis", provides: ["root_cause", "fault_tree", "corrective_actions"], requires: ["defect_type", "process_data"], description: "Root cause analysis" },
  { engine: "calc", actions: ["cqt_pareto", "cqt_optimize", "cqt_sensitivity", "cqt_scenario"], category: "optimization", provides: ["pareto_frontier", "optimal_params", "sensitivity"], requires: ["material", "tolerance", "cost_data"], description: "Cost-quality tradeoff optimization" },
];

// ── Goal Classification ────────────────────────────────────────────────────

const GOAL_TEMPLATES: Record<string, {
  type: string;
  required_capabilities: string[];
  workflow_steps: { action: string; description: string; depends_on: string[]; optional: boolean }[];
}> = {
  optimize_surface_finish: {
    type: "quality_optimization",
    required_capabilities: ["parameter_recommendation", "surface_finish", "multi_pass_strategy", "process_capability"],
    workflow_steps: [
      { action: "ds_recommend", description: "Get parameter recommendation optimized for quality", depends_on: [], optional: false },
      { action: "ds_validate", description: "Validate recommended parameters against constraints", depends_on: ["ds_recommend"], optional: false },
      { action: "mps_finish_plan", description: "Generate finish pass strategy for surface quality", depends_on: ["ds_recommend"], optional: false },
      { action: "cpk_analyze", description: "Analyze expected process capability", depends_on: [], optional: true },
      { action: "ds_explain", description: "Explain the decision rationale", depends_on: ["ds_recommend"], optional: true },
    ],
  },
  maximize_productivity: {
    type: "productivity_optimization",
    required_capabilities: ["parameter_recommendation", "multi_pass_strategy", "cycle_time", "wear_prediction"],
    workflow_steps: [
      { action: "ds_recommend", description: "Get parameter recommendation optimized for productivity", depends_on: [], optional: false },
      { action: "mps_full_strategy", description: "Generate full multi-pass strategy for maximum MRR", depends_on: ["ds_recommend"], optional: false },
      { action: "twc_predict", description: "Predict tool wear at aggressive parameters", depends_on: ["ds_recommend"], optional: false },
      { action: "twc_schedule", description: "Optimize tool change schedule", depends_on: ["twc_predict"], optional: false },
      { action: "cqt_optimize", description: "Verify cost-quality tradeoff is acceptable", depends_on: [], optional: true },
    ],
  },
  minimize_cost: {
    type: "cost_optimization",
    required_capabilities: ["pareto_frontier", "optimal_params", "wear_prediction", "multi_pass_strategy"],
    workflow_steps: [
      { action: "cqt_pareto", description: "Generate cost-quality Pareto frontier", depends_on: [], optional: false },
      { action: "cqt_optimize", description: "Find optimal cost-weighted operating point", depends_on: [], optional: false },
      { action: "twc_predict", description: "Predict tool consumption", depends_on: ["cqt_optimize"], optional: false },
      { action: "mps_full_strategy", description: "Generate multi-pass strategy for cost efficiency", depends_on: ["cqt_optimize"], optional: false },
      { action: "cqt_sensitivity", description: "Analyze cost sensitivity to parameter changes", depends_on: [], optional: true },
    ],
  },
  production_setup: {
    type: "setup_validation",
    required_capabilities: ["readiness_assessment", "risk_analysis", "parameter_recommendation", "process_verification"],
    workflow_steps: [
      { action: "ds_recommend", description: "Get baseline parameter recommendation", depends_on: [], optional: false },
      { action: "ds_validate", description: "Validate parameters against machine limits", depends_on: ["ds_recommend"], optional: false },
      { action: "pr_assess", description: "Run full production readiness assessment", depends_on: [], optional: false },
      { action: "pr_risk", description: "Identify production risks", depends_on: [], optional: false },
      { action: "pr_approve", description: "Generate approval decision", depends_on: ["pr_assess", "pr_risk"], optional: false },
    ],
  },
  diagnose_quality_issue: {
    type: "quality_diagnosis",
    required_capabilities: ["root_cause", "fault_tree", "corrective_actions", "process_control"],
    workflow_steps: [
      { action: "rca_diagnose", description: "Diagnose root cause from symptoms", depends_on: [], optional: false },
      { action: "rca_tree", description: "Generate fault tree (Ishikawa)", depends_on: [], optional: false },
      { action: "rca_correlate", description: "Correlate process parameters with defect", depends_on: [], optional: false },
      { action: "rca_action_plan", description: "Generate corrective action plan", depends_on: ["rca_diagnose"], optional: false },
      { action: "spc_capability", description: "Check current process capability", depends_on: [], optional: true },
    ],
  },
  full_optimization: {
    type: "comprehensive_optimization",
    required_capabilities: ["parameter_recommendation", "pareto_frontier", "multi_pass_strategy", "process_capability", "wear_prediction"],
    workflow_steps: [
      { action: "ds_recommend", description: "Initial parameter recommendation", depends_on: [], optional: false },
      { action: "cqt_pareto", description: "Map full cost-quality frontier", depends_on: [], optional: false },
      { action: "cqt_optimize", description: "Find balanced optimal point", depends_on: ["cqt_pareto"], optional: false },
      { action: "mps_full_strategy", description: "Generate complete machining strategy", depends_on: ["cqt_optimize"], optional: false },
      { action: "twc_predict", description: "Predict tool wear", depends_on: ["cqt_optimize"], optional: false },
      { action: "cpk_analyze", description: "Analyze process capability", depends_on: [], optional: false },
      { action: "ds_compare", description: "Compare top scenarios", depends_on: ["ds_recommend", "cqt_optimize"], optional: true },
      { action: "pr_assess", description: "Readiness assessment", depends_on: [], optional: true },
    ],
  },
};

// ── Helper Functions ───────────────────────────────────────────────────────

function classifyGoal(goalText: string): string {
  const lower = goalText.toLowerCase();
  if (lower.includes("surface") || lower.includes("finish") || lower.includes("roughness") || lower.includes("ra")) return "optimize_surface_finish";
  if (lower.includes("productiv") || lower.includes("speed") || lower.includes("fast") || lower.includes("mrr") || lower.includes("cycle time")) return "maximize_productivity";
  if (lower.includes("cost") || lower.includes("cheap") || lower.includes("econom") || lower.includes("budget")) return "minimize_cost";
  if (lower.includes("setup") || lower.includes("ready") || lower.includes("production") || lower.includes("launch")) return "production_setup";
  if (lower.includes("diagnos") || lower.includes("defect") || lower.includes("quality issue") || lower.includes("root cause") || lower.includes("scrap")) return "diagnose_quality_issue";
  return "full_optimization";
}

function buildWorkflowSteps(template: typeof GOAL_TEMPLATES[string]): WorkflowStep[] {
  return template.workflow_steps.map((ws, idx) => {
    const cap = ENGINE_REGISTRY.find(e => e.actions.includes(ws.action));
    return {
      id: `S${idx + 1}`,
      engine: cap?.engine ?? "calc",
      action: ws.action,
      description: ws.description,
      params_needed: cap?.requires ?? [],
      depends_on: ws.depends_on.map(d => {
        const depIdx = template.workflow_steps.findIndex(s => s.action === d);
        return depIdx >= 0 ? `S${depIdx + 1}` : d;
      }),
      estimated_effort: ws.optional ? "low" : "medium",
      optional: ws.optional,
    };
  });
}

function computeParallelGroups(steps: WorkflowStep[]): string[][] {
  const groups: string[][] = [];
  const completed = new Set<string>();

  while (completed.size < steps.length) {
    const group: string[] = [];
    for (const s of steps) {
      if (completed.has(s.id)) continue;
      if (s.depends_on.every(d => completed.has(d))) {
        group.push(s.id);
      }
    }
    if (group.length === 0) break; // Prevent infinite loop
    groups.push(group);
    for (const id of group) completed.add(id);
  }
  return groups;
}

// ── Action Handlers ────────────────────────────────────────────────────────

function wfoPlan(params: Record<string, unknown>): unknown {
  const goal = String(params.goal ?? "optimize manufacturing process");
  const material = String(params.material ?? "steel_1045");
  const includeOptional = params.include_optional !== false;

  const goalType = classifyGoal(goal);
  const template = GOAL_TEMPLATES[goalType] ?? GOAL_TEMPLATES.full_optimization;
  const allSteps = buildWorkflowSteps(template);
  const steps = includeOptional ? allSteps : allSteps.filter(s => !s.optional);
  const parallelGroups = computeParallelGroups(steps);

  const plan: WorkflowPlan = {
    goal,
    goal_type: goalType,
    material,
    total_steps: steps.length,
    parallel_groups: parallelGroups,
    steps,
    estimated_complexity: steps.length <= 3 ? "simple" : steps.length <= 6 ? "moderate" : "complex",
    coverage: template.required_capabilities,
  };

  return {
    plan,
    summary: {
      goal_classified_as: goalType,
      total_steps: steps.length,
      required_steps: steps.filter(s => !s.optional).length,
      optional_steps: steps.filter(s => s.optional).length,
      parallel_execution_groups: parallelGroups.length,
      max_parallelism: Math.max(...parallelGroups.map(g => g.length)),
      capabilities_used: template.required_capabilities,
    },
    execution_order: parallelGroups.map((group, idx) => ({
      phase: idx + 1,
      steps: group,
      parallel: group.length > 1,
    })),
  };
}

function wfoExecute(params: Record<string, unknown>): unknown {
  const goal = String(params.goal ?? "optimize manufacturing process");
  const material = String(params.material ?? "steel_1045");
  const dryRun = params.dry_run !== false; // Default true

  const goalType = classifyGoal(goal);
  const template = GOAL_TEMPLATES[goalType] ?? GOAL_TEMPLATES.full_optimization;
  const steps = buildWorkflowSteps(template);
  const parallelGroups = computeParallelGroups(steps);

  // Build execution trace
  const trace: { phase: number; step_id: string; action: string; status: string; description: string }[] = [];

  for (let gi = 0; gi < parallelGroups.length; gi++) {
    for (const stepId of parallelGroups[gi]) {
      const step = steps.find(s => s.id === stepId);
      if (!step) continue;
      trace.push({
        phase: gi + 1,
        step_id: stepId,
        action: step.action,
        status: dryRun ? "dry_run_planned" : "would_execute",
        description: step.description,
      });
    }
  }

  return {
    goal,
    goal_type: goalType,
    material,
    dry_run: dryRun,
    execution_trace: trace,
    total_phases: parallelGroups.length,
    total_actions: trace.length,
    note: dryRun
      ? "Dry run — no actions executed. Use individual actions or CCE recipes to execute."
      : "Execution plan generated. Use CCE decision_pipeline or production_readiness recipes for actual execution.",
    recommended_cce_recipe: goalType === "setup_validation" ? "production_readiness"
      : goalType === "quality_diagnosis" ? null
      : "decision_pipeline",
  };
}

function wfoStatus(params: Record<string, unknown>): unknown {
  const category = params.category ? String(params.category) : undefined;

  const engines = category
    ? ENGINE_REGISTRY.filter(e => e.category === category)
    : ENGINE_REGISTRY;

  const categories = [...new Set(ENGINE_REGISTRY.map(e => e.category))];
  const totalActions = ENGINE_REGISTRY.reduce((s, e) => s + e.actions.length, 0);
  const totalCapabilities = [...new Set(ENGINE_REGISTRY.flatMap(e => e.provides))];

  return {
    filter_category: category ?? "all",
    total_engine_groups: engines.length,
    total_actions: category ? engines.reduce((s, e) => s + e.actions.length, 0) : totalActions,
    categories: categories.map(cat => ({
      name: cat,
      engine_count: ENGINE_REGISTRY.filter(e => e.category === cat).length,
      action_count: ENGINE_REGISTRY.filter(e => e.category === cat).reduce((s, e) => s + e.actions.length, 0),
    })),
    engines: engines.map(e => ({
      engine: e.engine,
      category: e.category,
      actions: e.actions,
      provides: e.provides,
      requires: e.requires,
      description: e.description,
    })),
    available_goals: Object.keys(GOAL_TEMPLATES),
    total_unique_capabilities: totalCapabilities.length,
  };
}

function wfoOptimize(params: Record<string, unknown>): unknown {
  const goal = String(params.goal ?? "optimize manufacturing process");
  const material = String(params.material ?? "steel_1045");
  const constraint = String(params.constraint ?? "balanced");

  const goalType = classifyGoal(goal);
  const template = GOAL_TEMPLATES[goalType] ?? GOAL_TEMPLATES.full_optimization;
  const steps = buildWorkflowSteps(template);
  const parallelGroups = computeParallelGroups(steps);

  // Suggest optimizations
  const suggestions: { type: string; description: string; impact: string }[] = [];

  // Check if steps can be further parallelized
  if (parallelGroups.some(g => g.length === 1)) {
    suggestions.push({
      type: "parallelization",
      description: "Some workflow phases have single steps — consider adding complementary analyses",
      impact: "Reduced total execution time",
    });
  }

  // Check if optional steps would add value
  const optionalSteps = steps.filter(s => s.optional);
  if (optionalSteps.length > 0) {
    suggestions.push({
      type: "coverage",
      description: `${optionalSteps.length} optional steps available: ${optionalSteps.map(s => s.action).join(", ")}`,
      impact: "More comprehensive analysis at cost of additional computation",
    });
  }

  // Constraint-specific suggestions
  if (constraint === "speed") {
    suggestions.push({
      type: "simplification",
      description: "Skip optional steps and use quick simulation modes",
      impact: "50% faster execution with slightly less comprehensive results",
    });
  } else if (constraint === "thoroughness") {
    suggestions.push({
      type: "enhancement",
      description: "Include all optional steps and add SPC + batch analytics",
      impact: "Most comprehensive analysis covering all dimensions",
    });
  }

  // Material-specific suggestions
  const difficultMaterials = ["titanium_ti6al4v", "inconel_718", "stainless_304"];
  if (difficultMaterials.includes(material)) {
    suggestions.push({
      type: "material_specific",
      description: `${material} is difficult-to-machine — add tool wear monitoring and thermal analysis`,
      impact: "Prevents tool failure and thermal damage",
    });
  }

  return {
    goal,
    goal_type: goalType,
    material,
    constraint,
    current_plan_steps: steps.length,
    current_parallel_groups: parallelGroups.length,
    optimization_suggestions: suggestions,
    alternative_goals: Object.keys(GOAL_TEMPLATES).filter(g => g !== goalType).map(g => ({
      goal: g,
      steps: GOAL_TEMPLATES[g].workflow_steps.length,
      capabilities: GOAL_TEMPLATES[g].required_capabilities.length,
    })),
    recommended_recipe: goalType.includes("setup") ? "production_readiness" : "decision_pipeline",
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeWorkflowOrchestratorAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "wfo_plan":     return wfoPlan(params);
    case "wfo_execute":  return wfoExecute(params);
    case "wfo_status":   return wfoStatus(params);
    case "wfo_optimize": return wfoOptimize(params);
    default:
      throw new Error(`WorkflowOrchestratorEngine: unknown action "${action}"`);
  }
}
