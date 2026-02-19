/**
 * PRISM MCP Server - Task Agent Classifier
 * D1.3: Automatic agent and swarm pattern recommendation based on task characteristics
 * 
 * Maps incoming tasks (dispatcher+action, complexity, domain keywords) to:
 * - Recommended agent(s) from AgentRegistry
 * - Recommended swarm pattern (if multi-agent beneficial)
 * - Recommended tier (opus/sonnet/haiku)
 * 
 * Used by: autoAgentRecommend cadence, autoPreTaskRecon, _context injection
 * 
 * @version 1.0.0
 * @date 2026-02-12
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AgentRecommendation {
  agent_id: string;
  name: string;
  reason: string;
  confidence: number; // 0-1
  tier: "opus" | "sonnet" | "haiku";
}

export interface SwarmRecommendation {
  pattern: string;
  agents: string[];
  reason: string;
  confidence: number;
  estimated_cost_tier: "low" | "medium" | "high";
}

export interface TaskClassification {
  complexity: "simple" | "moderate" | "complex" | "critical";
  domain: string;
  recommended_agents: AgentRecommendation[];
  recommended_swarm: SwarmRecommendation | null;
  recommended_tier: "opus" | "sonnet" | "haiku";
  auto_orchestrate: boolean; // Should AutoPilot handle this?
  reasoning: string;
}

// ============================================================================
// DOMAIN DETECTION MAPS
// ============================================================================

/** Map dispatcher+action patterns to manufacturing domains */
const DOMAIN_MAP: Record<string, string[]> = {
  // Material domain
  "prism_data:material_get": ["materials"],
  "prism_data:material_search": ["materials"],
  "prism_data:material_compare": ["materials", "analysis"],
  "prism_validate:material": ["materials", "validation"],
  "prism_validate:kienzle": ["materials", "physics"],
  "prism_validate:johnson_cook": ["materials", "physics"],
  // Machine domain
  "prism_data:machine_get": ["machines"],
  "prism_data:machine_search": ["machines"],
  "prism_data:machine_capabilities": ["machines", "analysis"],
  // Tool domain
  "prism_data:tool_get": ["tooling"],
  "prism_data:tool_search": ["tooling"],
  "prism_data:tool_recommend": ["tooling", "optimization"],
  "prism_data:tool_facets": ["tooling"],
  // Calculation domain
  "prism_calc:cutting_force": ["calculations", "physics"],
  "prism_calc:tool_life": ["calculations", "tooling"],
  "prism_calc:speed_feed": ["calculations", "machining"],
  "prism_calc:flow_stress": ["calculations", "physics"],
  "prism_calc:surface_finish": ["calculations", "quality"],
  "prism_calc:mrr": ["calculations", "productivity"],
  "prism_calc:power": ["calculations", "machines"],
  "prism_calc:chip_load": ["calculations", "machining"],
  "prism_calc:stability": ["calculations", "physics", "safety"],
  "prism_calc:deflection": ["calculations", "physics", "safety"],
  "prism_calc:thermal": ["calculations", "physics", "safety"],
  "prism_calc:cost_optimize": ["calculations", "optimization"],
  "prism_calc:multi_optimize": ["calculations", "optimization"],
  // Safety domain
  "prism_safety:check_toolpath_collision": ["safety", "toolpath"],
  "prism_safety:validate_rapid_moves": ["safety", "toolpath"],
  "prism_safety:predict_tool_breakage": ["safety", "tooling"],
  "prism_safety:check_spindle_torque": ["safety", "machines"],
  "prism_safety:validate_workholding_setup": ["safety", "workholding"],
  // Alarm domain
  "prism_data:alarm_decode": ["alarms", "troubleshooting"],
  "prism_data:alarm_search": ["alarms", "troubleshooting"],
  "prism_data:alarm_fix": ["alarms", "troubleshooting"],
  // Toolpath domain
  "prism_toolpath:strategy_select": ["toolpath", "machining"],
  "prism_toolpath:params_calculate": ["toolpath", "calculations"],
  "prism_toolpath:material_strategies": ["toolpath", "materials"],
  // Thread domain
  "prism_thread:calculate_tap_drill": ["threading", "calculations"],
  "prism_thread:calculate_thread_mill_params": ["threading", "calculations"],
  "prism_thread:generate_thread_gcode": ["threading", "gcode"],
  // Orchestration
  "prism_orchestrate:agent_execute": ["orchestration"],
  "prism_orchestrate:swarm_execute": ["orchestration"],
  "prism_orchestrate:swarm_consensus": ["orchestration", "validation"],
  // ATCS (Autonomous Task Completion)
  "prism_atcs:task_init": ["orchestration", "planning"],
  "prism_atcs:task_resume": ["orchestration"],
  "prism_atcs:queue_next": ["orchestration"],
  "prism_atcs:unit_complete": ["orchestration", "validation"],
  "prism_atcs:batch_validate": ["orchestration", "validation", "quality"],
  "prism_atcs:checkpoint": ["orchestration"],
  "prism_atcs:replan": ["orchestration", "planning"],
  "prism_atcs:assemble": ["orchestration"],
  "prism_atcs:stub_scan": ["development", "validation"],
  // Development
  "prism_dev:build": ["development"],
  "prism_dev:code_search": ["development"],
  "prism_sp:brainstorm": ["planning"],
  "prism_sp:plan": ["planning"],
  "prism_sp:execute": ["development"],
  "prism_sp:review_spec": ["validation", "quality"],
  "prism_sp:review_quality": ["validation", "quality"],
  "prism_sp:debug": ["development", "troubleshooting"],
  // F1: Predictive Failure Prevention
  "prism_pfp:get_dashboard": ["diagnostics", "safety"],
  "prism_pfp:assess_risk": ["safety", "validation"],
  "prism_pfp:get_patterns": ["diagnostics", "analysis"],
  "prism_pfp:force_extract": ["diagnostics"],
  // F2: Memory Graph
  "prism_memory:get_health": ["diagnostics"],
  "prism_memory:trace_decision": ["analysis"],
  "prism_memory:find_similar": ["analysis"],
  // F3: Telemetry
  "prism_telemetry:get_dashboard": ["diagnostics"],
  "prism_telemetry:get_anomalies": ["diagnostics", "safety"],
  "prism_telemetry:get_optimization": ["optimization"],
  // F5: Multi-Tenant
  "prism_tenant:create": ["administration"],
  "prism_tenant:publish_pattern": ["orchestration", "optimization"],
  "prism_tenant:consume_patterns": ["orchestration", "optimization"],
  // F6: NL Hooks
  "prism_nl_hook:create": ["development", "orchestration"],
  "prism_nl_hook:approve": ["validation"],
  // F7: Protocol Bridge
  "prism_bridge:register_endpoint": ["administration"],
  "prism_bridge:create_key": ["administration", "safety"],
  "prism_bridge:route": ["orchestration"],
  "prism_bridge:health": ["diagnostics"],
  // F8: Compliance
  "prism_compliance:apply_template": ["compliance", "quality"],
  "prism_compliance:check_compliance": ["compliance", "validation"],
  "prism_compliance:gap_analysis": ["compliance", "analysis"],
  "prism_compliance:audit_status": ["compliance", "quality"],
};

/** Map domains to best-fit agents */
const DOMAIN_AGENT_MAP: Record<string, { agent_id: string; name: string; tier: "opus" | "sonnet" | "haiku" }[]> = {
  materials: [
    { agent_id: "AGT-EXPERT-MATERIALS", name: "Materials Expert", tier: "sonnet" }
  ],
  machines: [
    { agent_id: "AGT-EXPERT-MACHINES", name: "Machine Expert", tier: "sonnet" }
  ],
  tooling: [
    { agent_id: "AGT-EXPERT-TOOLING", name: "Tooling Expert", tier: "sonnet" }
  ],
  calculations: [
    { agent_id: "AGT-TASK-SPEED-FEED", name: "Speed & Feed Calculator", tier: "sonnet" }
  ],
  alarms: [
    { agent_id: "AGT-TASK-ALARM-DECODE", name: "Alarm Decoder", tier: "sonnet" }
  ],
  safety: [
    { agent_id: "AGT-COORD-VALIDATOR", name: "Safety Validator", tier: "opus" }
  ],
  validation: [
    { agent_id: "AGT-COORD-VALIDATOR", name: "Result Validator", tier: "sonnet" }
  ],
  optimization: [
    { agent_id: "AGT-COG-REASONING", name: "Reasoning Engine", tier: "sonnet" }
  ],
  orchestration: [
    { agent_id: "AGT-COORD-ORCHESTRATOR", name: "Task Orchestrator", tier: "sonnet" }
  ],
  troubleshooting: [
    { agent_id: "AGT-COG-REASONING", name: "Reasoning Engine", tier: "sonnet" },
    { agent_id: "AGT-TASK-ALARM-DECODE", name: "Alarm Decoder", tier: "haiku" }
  ],
  planning: [
    { agent_id: "AGT-COG-REASONING", name: "Reasoning Engine", tier: "sonnet" }
  ],
  physics: [
    { agent_id: "AGT-COORD-VALIDATOR", name: "Physics Validator", tier: "opus" }
  ],
  quality: [
    { agent_id: "AGT-COORD-VALIDATOR", name: "Quality Validator", tier: "sonnet" }
  ],
  diagnostics: [
    { agent_id: "AGT-COG-REASONING", name: "Diagnostics Analyst", tier: "sonnet" }
  ],
  administration: [
    { agent_id: "AGT-COORD-ORCHESTRATOR", name: "Admin Orchestrator", tier: "sonnet" }
  ],
  compliance: [
    { agent_id: "AGT-COORD-VALIDATOR", name: "Compliance Validator", tier: "opus" }
  ],
  analysis: [
    { agent_id: "AGT-COG-REASONING", name: "Analysis Engine", tier: "sonnet" }
  ],
};

/** Complexity indicators per action */
const COMPLEX_ACTIONS = new Set([
  "multi_optimize", "cost_optimize", "stability", "deflection", "thermal",
  "brainstorm", "plan", "review_spec", "review_quality",
  "swarm_consensus", "swarm_pipeline", "agent_pipeline",
  "check_toolpath_collision", "validate_rapid_moves", "predict_tool_breakage",
  "gap_analysis", "resolve_conflicts", "assess_risk", "trace_decision"
]);

const SIMPLE_ACTIONS = new Set([
  "material_get", "machine_get", "tool_get", "alarm_decode", "alarm_search",
  "formula_get", "skill_get", "script_get", "skill_list", "script_list",
  "thread_specifications", "get_go_nogo_gauges", "strategy_list", "strategy_info",
  "state_load", "state_save", "todo_read", "todo_update",
  "list", "get", "status", "stats", "coverage",
  "get_dashboard", "get_health", "list_templates", "list_endpoints", "list_keys",
  "route_map", "health", "slb_stats", "audit_status"
]);

const SAFETY_CRITICAL_ACTIONS = new Set([
  "check_toolpath_collision", "validate_rapid_moves", "check_fixture_clearance",
  "predict_tool_breakage", "calculate_tool_stress", "check_chip_load_limits",
  "check_spindle_torque", "check_spindle_power", "validate_workholding_setup",
  "validate_coolant_flow", "stability", "deflection"
]);

/** Swarm pattern recommendation rules */
const SWARM_TRIGGERS: Array<{
  condition: (ctx: { domains: string[]; complexity: string; action: string; params: any }) => boolean;
  pattern: string;
  agents: string[];
  reason: string;
  cost_tier: "low" | "medium" | "high";
}> = [
  {
    // Multi-material comparison → parallel extract
    condition: (ctx) => ctx.action === "material_compare" || 
      (ctx.domains.includes("materials") && ctx.params?.materials?.length > 2),
    pattern: "parallel_extract",
    agents: ["AGT-EXPERT-MATERIALS", "AGT-COORD-VALIDATOR", "AGT-COG-REASONING"],
    reason: "Multi-material analysis benefits from parallel expert extraction",
    cost_tier: "medium"
  },
  {
    // Optimization tasks → ralph_loop (generate→critique→refine)
    condition: (ctx) => ctx.action === "multi_optimize" || ctx.action === "cost_optimize",
    pattern: "ralph_loop",
    agents: ["AGT-COG-REASONING", "AGT-COORD-VALIDATOR", "AGT-EXPERT-MATERIALS"],
    reason: "Optimization needs generate→critique→refine cycle",
    cost_tier: "medium"
  },
  {
    // Safety validation → redundant_verify (3-agent cross-check)
    condition: (ctx) => ctx.domains.includes("safety") && ctx.complexity === "critical",
    pattern: "redundant_verify",
    agents: ["AGT-COORD-VALIDATOR", "AGT-EXPERT-TOOLING", "AGT-COG-REASONING"],
    reason: "Safety-critical calculations need redundant verification",
    cost_tier: "high"
  },
  {
    // Troubleshooting → specialist_team
    condition: (ctx) => ctx.domains.includes("troubleshooting") && ctx.params?.alarm_codes?.length > 3,
    pattern: "specialist_team",
    agents: ["AGT-TASK-ALARM-DECODE", "AGT-EXPERT-MACHINES", "AGT-COG-REASONING"],
    reason: "Multiple alarm codes need specialist analysis from different angles",
    cost_tier: "medium"
  },
  {
    // Complex multi-step planning → pipeline
    condition: (ctx) => ctx.action === "plan" && ctx.params?.steps?.length > 5,
    pattern: "pipeline",
    agents: ["AGT-COG-REASONING", "AGT-COORD-ORCHESTRATOR", "AGT-COORD-VALIDATOR"],
    reason: "Multi-step plan benefits from sequential pipeline with validation",
    cost_tier: "medium"
  },
  {
    // Multi-domain analysis (materials + machines + tooling) → specialist_team
    condition: (ctx) => {
      const cross = ["materials", "machines", "tooling"].filter(d => ctx.domains.includes(d));
      return cross.length >= 2;
    },
    pattern: "specialist_team",
    agents: ["AGT-EXPERT-MATERIALS", "AGT-EXPERT-MACHINES", "AGT-EXPERT-TOOLING", "AGT-COORD-ORCHESTRATOR"],
    reason: "Cross-domain analysis needs specialists from each domain",
    cost_tier: "medium"
  }
];

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

/**
 * Classify a task and recommend agents/swarm/tier.
 * 
 * @param dispatcher - The PRISM dispatcher (e.g., "prism_calc", "prism_safety")
 * @param action - The specific action (e.g., "cutting_force", "check_toolpath_collision")
 * @param params - Action parameters (optional, for deeper analysis)
 * @param taskDescription - Free-text task description (optional)
 */
export function classifyTask(
  dispatcher: string,
  action: string,
  params?: Record<string, any>,
  taskDescription?: string
): TaskClassification {
  const key = `${dispatcher}:${action}`;
  const safeParams = params || {};
  
  // 1. Detect domains
  const domains = DOMAIN_MAP[key] || detectDomainsFromKeywords(action, taskDescription);
  
  // 2. Determine complexity
  const complexity = determineComplexity(action, safeParams, domains);
  
  // 3. Determine tier
  const tier = determineTier(action, complexity, domains);
  
  // 4. Find recommended agents
  const agents = findRecommendedAgents(domains, complexity, tier);
  
  // 5. Check swarm patterns
  const swarm = findSwarmPattern({ domains, complexity, action, params: safeParams });
  
  // 6. Should AutoPilot handle this?
  const autoOrchestrate = complexity !== "simple" && agents.length >= 2;
  
  const reasoning = buildReasoning(key, domains, complexity, tier, agents, swarm);
  
  return {
    complexity,
    domain: domains[0] || "general",
    recommended_agents: agents,
    recommended_swarm: swarm,
    recommended_tier: tier,
    auto_orchestrate: autoOrchestrate,
    reasoning
  };
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Detect domains from action name and description keywords */
function detectDomainsFromKeywords(action: string, description?: string): string[] {
  const text = `${action} ${description || ""}`.toLowerCase();
  const detected: string[] = [];
  
  const KEYWORD_MAP: Record<string, string[]> = {
    materials: ["material", "steel", "aluminum", "titanium", "alloy", "hardness", "hrc"],
    machines: ["machine", "spindle", "cnc", "lathe", "mill", "axis", "turret"],
    tooling: ["tool", "insert", "carbide", "endmill", "drill", "tap", "cutter"],
    calculations: ["calculate", "compute", "formula", "equation", "optimize"],
    safety: ["safety", "collision", "breakage", "overload", "crash", "limit"],
    alarms: ["alarm", "error", "fault", "code", "diagnostic"],
    toolpath: ["toolpath", "strategy", "trochoidal", "hsm", "adaptive", "contour"],
    threading: ["thread", "tap", "pitch", "helix", "m6", "m8", "unc", "unf"],
    quality: ["quality", "surface", "finish", "tolerance", "roughness", "ra"],
    physics: ["force", "stress", "thermal", "deflection", "vibration", "stability"],
    troubleshooting: ["troubleshoot", "diagnose", "fix", "repair", "problem"],
    optimization: ["optimize", "minimize", "maximize", "cost", "efficiency"],
    orchestration: ["orchestrate", "swarm", "agent", "pipeline", "parallel"],
    development: ["build", "code", "debug", "test", "deploy", "refactor"],
    planning: ["plan", "brainstorm", "design", "architect", "roadmap"],
  };
  
  for (const [domain, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => text.includes(kw))) {
      detected.push(domain);
    }
  }
  
  return detected.length > 0 ? detected : ["general"];
}

/** Determine task complexity from action, params, and domains */
function determineComplexity(
  action: string, 
  params: Record<string, any>, 
  domains: string[]
): "simple" | "moderate" | "complex" | "critical" {
  // Safety-critical = always critical
  if (SAFETY_CRITICAL_ACTIONS.has(action)) return "critical";
  if (domains.includes("safety") && domains.includes("physics")) return "critical";
  
  // Simple lookups
  if (SIMPLE_ACTIONS.has(action)) return "simple";
  
  // Complex actions
  if (COMPLEX_ACTIONS.has(action)) return "complex";
  
  // Multi-domain = at least moderate
  if (domains.length >= 3) return "complex";
  if (domains.length >= 2) return "moderate";
  
  // Param-based complexity
  const paramCount = Object.keys(params).length;
  if (paramCount > 8) return "complex";
  if (paramCount > 4) return "moderate";
  
  return "moderate"; // Default conservative
}

/** Determine recommended tier based on task characteristics */
function determineTier(
  action: string, 
  complexity: string, 
  domains: string[]
): "opus" | "sonnet" | "haiku" {
  if (complexity === "critical") return "opus";
  if (SIMPLE_ACTIONS.has(action)) return "haiku";
  if (complexity === "simple") return "haiku";
  if (complexity === "complex") return "sonnet";
  if (domains.includes("safety") || domains.includes("physics")) return "sonnet";
  return "sonnet"; // Default balanced
}

/** Find recommended agents for the task domains and complexity */
function findRecommendedAgents(
  domains: string[], 
  complexity: string, 
  tier: "opus" | "sonnet" | "haiku"
): AgentRecommendation[] {
  const seen = new Set<string>();
  const recommendations: AgentRecommendation[] = [];
  
  for (const domain of domains) {
    const agents = DOMAIN_AGENT_MAP[domain];
    if (!agents) continue;
    
    for (const agent of agents) {
      if (seen.has(agent.agent_id)) continue;
      seen.add(agent.agent_id);
      
      // Adjust tier based on complexity
      let effectiveTier = agent.tier;
      if (complexity === "critical" && effectiveTier !== "opus") effectiveTier = "opus";
      if (complexity === "simple" && effectiveTier === "opus") effectiveTier = "sonnet";
      
      const confidence = domain === domains[0] ? 0.90 : 0.75; // Primary domain gets higher confidence
      
      recommendations.push({
        agent_id: agent.agent_id,
        name: agent.name,
        reason: `Domain match: ${domain}${complexity === "critical" ? " (safety-critical escalation)" : ""}`,
        confidence,
        tier: effectiveTier
      });
    }
  }
  
  // Always include validator for complex/critical tasks
  if ((complexity === "complex" || complexity === "critical") && !seen.has("AGT-COORD-VALIDATOR")) {
    recommendations.push({
      agent_id: "AGT-COORD-VALIDATOR",
      name: "Result Validator",
      reason: `${complexity} task requires validation`,
      confidence: 0.85,
      tier: complexity === "critical" ? "opus" : "sonnet"
    });
  }
  
  // Cap at 5 recommendations
  return recommendations.slice(0, 5);
}

/** Find matching swarm pattern for the task */
function findSwarmPattern(ctx: {
  domains: string[];
  complexity: string;
  action: string;
  params: any;
}): SwarmRecommendation | null {
  // Only recommend swarms for moderate+ complexity
  if (ctx.complexity === "simple") return null;
  
  for (const trigger of SWARM_TRIGGERS) {
    if (trigger.condition(ctx)) {
      return {
        pattern: trigger.pattern,
        agents: trigger.agents,
        reason: trigger.reason,
        confidence: ctx.complexity === "critical" ? 0.95 : 0.80,
        estimated_cost_tier: trigger.cost_tier
      };
    }
  }
  
  return null;
}

/** Build human-readable reasoning string */
function buildReasoning(
  key: string,
  domains: string[],
  complexity: string,
  tier: string,
  agents: AgentRecommendation[],
  swarm: SwarmRecommendation | null
): string {
  const parts: string[] = [];
  parts.push(`Task ${key} → domains: [${domains.join(", ")}], complexity: ${complexity}, tier: ${tier}`);
  
  if (agents.length > 0) {
    parts.push(`Recommended agents: ${agents.map(a => `${a.name} (${a.tier})`).join(", ")}`);
  }
  
  if (swarm) {
    parts.push(`Swarm: ${swarm.pattern} with ${swarm.agents.length} agents — ${swarm.reason}`);
  }
  
  return parts.join(". ");
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/** Quick classify for cadence functions — returns compact recommendation */
export function quickClassify(dispatcher: string, action: string, params?: Record<string, any>): {
  tier: string;
  agents: string[];
  swarm: string | null;
  complexity: string;
} {
  const result = classifyTask(dispatcher, action, params);
  return {
    tier: result.recommended_tier,
    agents: result.recommended_agents.map(a => a.agent_id),
    swarm: result.recommended_swarm?.pattern || null,
    complexity: result.complexity
  };
}
