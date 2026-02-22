/**
 * WorkflowChainsEngine.ts — R8-MS2 Pre-Built Workflow Chains
 * ============================================================
 *
 * 10 pre-built execution chains covering 90% of manufacturing questions.
 * Each workflow is a named, trigger-matched chain of MCP actions with
 * estimated cost (steps, tokens, time) and persona affinity.
 *
 * The IntentDecompositionEngine can match against these before attempting
 * free-form decomposition for "happy path" fast resolution.
 *
 * @version 1.0.0 — R8-MS2
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkflowId =
  | "plan_job"
  | "quick_params"
  | "compare_strategies"
  | "quote_part"
  | "fix_chatter"
  | "tool_select"
  | "capability_check"
  | "schedule_shop"
  | "diagnose_alarm"
  | "teach_me";

export type WorkflowPersona = "machinist" | "programmer" | "manager" | "all";

export interface WorkflowStep {
  action: string;
  /** Which dispatcher this action lives in */
  dispatcher: string;
  /** Human label */
  label: string;
  /** Params template — keys with "$" prefix are resolved from prior step outputs */
  params_template: Record<string, any>;
  /** Which prior step(s) this depends on (by index) */
  depends_on: number[];
  /** If true, this step fans out (e.g. "for each strategy" or "for top 3 tools") */
  fan_out?: boolean;
  /** Optional: only execute if condition is met */
  condition?: string;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description: string;
  trigger_phrases: string[];
  trigger_patterns: RegExp[];
  persona: WorkflowPersona;
  steps: WorkflowStep[];
  estimated_steps: number;
  estimated_tokens: number;
  estimated_time_sec: number;
}

export interface WorkflowMatch {
  workflow: WorkflowDefinition;
  confidence: number;
  matched_trigger: string;
}

export interface WorkflowListItem {
  id: WorkflowId;
  name: string;
  description: string;
  persona: WorkflowPersona;
  steps: number;
  estimated_tokens: number;
  trigger_phrases: string[];
}

// ─── Workflow Definitions ───────────────────────────────────────────────────

const WORKFLOWS: WorkflowDefinition[] = [
  // ── WORKFLOW 1: Plan This Job ──
  {
    id: "plan_job",
    name: "Plan This Job",
    description: "Full manufacturing plan: material → tool → parameters → strategy → cost → setup sheet",
    trigger_phrases: ["plan this job", "how should I make this", "set up for", "machining plan", "full plan"],
    trigger_patterns: [
      /\bplan\s+(this\s+)?job\b/i,
      /\bhow\s+should\s+I\s+make\b/i,
      /\bmachining\s+plan\b/i,
      /\bset\s*up\s+for\b/i,
      /\bfull\s+plan\b/i,
    ],
    persona: "all",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Look up material properties", params_template: { name: "$material" }, depends_on: [] },
      { action: "machine_get", dispatcher: "prism_data", label: "Look up machine specs", params_template: { id: "$machine" }, depends_on: [] },
      { action: "tool_recommend", dispatcher: "prism_intelligence", label: "Recommend cutting tool", params_template: { material: "$material", operation: "$operation" }, depends_on: [0] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Calculate speed & feed", params_template: { material: "$material", tool_diameter: "$tool_diameter", operation: "$operation" }, depends_on: [0, 2] },
      { action: "strategy_select", dispatcher: "prism_toolpath", label: "Select toolpath strategy", params_template: { feature: "$feature", material_group: "$iso_group" }, depends_on: [0] },
      { action: "stability", dispatcher: "prism_calc", label: "Check chatter stability", params_template: { rpm: "$rpm", ap: "$ap", ae: "$ae" }, depends_on: [3] },
      { action: "surface_finish", dispatcher: "prism_calc", label: "Predict surface finish", params_template: { fz: "$fz", tool_radius: "$tool_radius" }, depends_on: [3] },
      { action: "process_cost", dispatcher: "prism_intelligence", label: "Estimate process cost", params_template: { material: "$material", cycle_time_min: "$cycle_time" }, depends_on: [3] },
      { action: "setup_sheet", dispatcher: "prism_intelligence", label: "Generate setup sheet", params_template: { material: "$material", operations: "$operations" }, depends_on: [3, 4, 5] },
    ],
    estimated_steps: 9,
    estimated_tokens: 8000,
    estimated_time_sec: 4,
  },

  // ── WORKFLOW 2: Quick Parameters ──
  {
    id: "quick_params",
    name: "Quick Parameters",
    description: "Speed, feed, DOC, WOC, coolant — nothing else",
    trigger_phrases: ["what speed", "what feed", "parameters for", "rpm for", "speeds and feeds"],
    trigger_patterns: [
      /\bwhat\s+speed\b/i,
      /\bwhat\s+feed\b/i,
      /\bparameters?\s+for\b/i,
      /\brpm\s+for\b/i,
      /\bspeeds?\s+and\s+feeds?\b/i,
      /\bwhat\s+(?:should\s+I\s+)?run\b/i,
    ],
    persona: "machinist",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Look up material", params_template: { name: "$material" }, depends_on: [] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Calculate speed & feed", params_template: { material: "$material", tool_diameter: "$tool_diameter", operation: "$operation" }, depends_on: [0] },
    ],
    estimated_steps: 2,
    estimated_tokens: 2000,
    estimated_time_sec: 1,
  },

  // ── WORKFLOW 3: Compare Strategies ──
  {
    id: "compare_strategies",
    name: "Compare Strategies",
    description: "Compare toolpath strategies with cycle time, tool life, and risk analysis",
    trigger_phrases: ["compare", "which strategy", "trochoidal vs", "best approach for", "best strategy"],
    trigger_patterns: [
      /\bcompare\s+(?:strategies|toolpath)/i,
      /\bwhich\s+strategy\b/i,
      /\btrochoidal\s+vs\b/i,
      /\bbest\s+(?:approach|strategy)\s+for\b/i,
      /\bvs\.?\s+(?:adaptive|conventional|trochoidal|hsm)/i,
    ],
    persona: "programmer",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Look up material", params_template: { name: "$material" }, depends_on: [] },
      { action: "machine_get", dispatcher: "prism_data", label: "Look up machine", params_template: { id: "$machine" }, depends_on: [] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Calculate baseline parameters", params_template: { material: "$material", tool_diameter: "$tool_diameter" }, depends_on: [0] },
      { action: "strategy_select", dispatcher: "prism_toolpath", label: "Evaluate all strategies", params_template: { feature: "$feature", material_group: "$iso_group", compare: true }, depends_on: [0], fan_out: true },
      { action: "process_cost", dispatcher: "prism_intelligence", label: "Cost each strategy", params_template: { material: "$material" }, depends_on: [2, 3], fan_out: true },
    ],
    estimated_steps: 6,
    estimated_tokens: 6000,
    estimated_time_sec: 3,
  },

  // ── WORKFLOW 4: Quote This Part ──
  {
    id: "quote_part",
    name: "Quote This Part",
    description: "Per-part cost breakdown, recommended quote price, margin analysis",
    trigger_phrases: ["quote", "rfq", "cost to make", "price this", "how much"],
    trigger_patterns: [
      /\bquote\b/i,
      /\brfq\b/i,
      /\bcost\s+to\s+make\b/i,
      /\bprice\s+this\b/i,
      /\bhow\s+much\s+(?:to|does|will|would)\b/i,
      /\bcost\s+per\s+part\b/i,
    ],
    persona: "manager",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Look up material", params_template: { name: "$material" }, depends_on: [] },
      { action: "tool_recommend", dispatcher: "prism_intelligence", label: "Recommend tools", params_template: { material: "$material", operation: "$operation" }, depends_on: [0] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Calculate parameters", params_template: { material: "$material", tool_diameter: "$tool_diameter" }, depends_on: [0, 1] },
      { action: "process_cost", dispatcher: "prism_intelligence", label: "Calculate cost", params_template: { material: "$material", cycle_time_min: "$cycle_time" }, depends_on: [2] },
      { action: "format_response", dispatcher: "prism_intelligence", label: "Format for manager", params_template: { persona: "manager", result: "$cost_result" }, depends_on: [3] },
    ],
    estimated_steps: 5,
    estimated_tokens: 10000,
    estimated_time_sec: 3,
  },

  // ── WORKFLOW 5: Fix My Chatter ──
  {
    id: "fix_chatter",
    name: "Fix My Chatter",
    description: "Diagnose chatter, find stable RPM pockets, suggest parameter adjustments",
    trigger_phrases: ["getting chatter", "vibration", "squealing", "tool is chattering", "chatter problem"],
    trigger_patterns: [
      /\bchatter(?:ing)?\b/i,
      /\bvibration\b/i,
      /\bsquealing\b/i,
      /\btool\s+is\s+(?:chattering|vibrating|squealing)/i,
      /\bgetting\s+(?:chatter|vibration)/i,
    ],
    persona: "machinist",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Check material", params_template: { name: "$material" }, depends_on: [] },
      { action: "stability", dispatcher: "prism_calc", label: "Run stability analysis", params_template: { rpm: "$rpm", ap: "$ap", ae: "$ae" }, depends_on: [] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Find stable alternatives", params_template: { material: "$material", optimize: "stability" }, depends_on: [0, 1], condition: "unstable" },
    ],
    estimated_steps: 3,
    estimated_tokens: 4000,
    estimated_time_sec: 2,
  },

  // ── WORKFLOW 6: What Tool Should I Use? ──
  {
    id: "tool_select",
    name: "Tool Selection",
    description: "Find top tools for the job with parameters, pros/cons, cost comparison",
    trigger_phrases: ["what tool", "tool for", "which endmill", "recommend a drill", "which insert"],
    trigger_patterns: [
      /\bwhat\s+tool\b/i,
      /\btool\s+for\b/i,
      /\bwhich\s+(?:endmill|drill|insert|tool|cutter)\b/i,
      /\brecommend\s+a?\s*(?:tool|drill|endmill|insert)\b/i,
    ],
    persona: "all",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Look up material", params_template: { name: "$material" }, depends_on: [] },
      { action: "tool_search", dispatcher: "prism_data", label: "Search compatible tools", params_template: { material: "$material", operation: "$operation" }, depends_on: [0] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Calculate params for top tools", params_template: { material: "$material" }, depends_on: [0, 1], fan_out: true },
    ],
    estimated_steps: 5,
    estimated_tokens: 5000,
    estimated_time_sec: 2,
  },

  // ── WORKFLOW 7: Can My Machine Do This? ──
  {
    id: "capability_check",
    name: "Capability Check",
    description: "Check if your machine can handle the job — power, torque, RPM, envelope",
    trigger_phrases: ["can I run", "will my machine", "is my machine capable", "enough power", "can my machine"],
    trigger_patterns: [
      /\bcan\s+(?:I|my\s+machine)\s+(?:run|do|handle)\b/i,
      /\bwill\s+my\s+machine\b/i,
      /\benough\s+(?:power|torque|rpm)\b/i,
      /\bmachine\s+capable\b/i,
    ],
    persona: "machinist",
    steps: [
      { action: "material_get", dispatcher: "prism_data", label: "Look up material", params_template: { name: "$material" }, depends_on: [] },
      { action: "machine_get", dispatcher: "prism_data", label: "Get machine specs", params_template: { id: "$machine" }, depends_on: [] },
      { action: "speed_feed", dispatcher: "prism_calc", label: "Calculate required parameters", params_template: { material: "$material", tool_diameter: "$tool_diameter" }, depends_on: [0] },
      { action: "power", dispatcher: "prism_calc", label: "Check power & torque requirements", params_template: { Fc: "$cutting_force", Vc: "$cutting_speed" }, depends_on: [2] },
    ],
    estimated_steps: 4,
    estimated_tokens: 3000,
    estimated_time_sec: 2,
  },

  // ── WORKFLOW 8: Schedule My Shop ──
  {
    id: "schedule_shop",
    name: "Schedule My Shop",
    description: "Assign jobs to machines, timeline, utilization, bottleneck analysis",
    trigger_phrases: ["schedule", "which machine for", "assign jobs", "utilization", "shop floor"],
    trigger_patterns: [
      /\bschedule\s+(?:my\s+)?(?:shop|jobs|work)\b/i,
      /\bwhich\s+machine\s+for\b/i,
      /\bassign\s+jobs\b/i,
      /\butilization\b/i,
      /\bshop\s+floor\b/i,
    ],
    persona: "manager",
    steps: [
      { action: "shop_schedule", dispatcher: "prism_intelligence", label: "Generate schedule", params_template: { jobs: "$jobs", machines: "$machines", optimize_for: "$optimize" }, depends_on: [] },
      { action: "machine_utilization", dispatcher: "prism_intelligence", label: "Analyze utilization", params_template: { machines: "$machines", schedule: "$schedule" }, depends_on: [0] },
    ],
    estimated_steps: 4,
    estimated_tokens: 8000,
    estimated_time_sec: 3,
  },

  // ── WORKFLOW 9: Diagnose This Alarm ──
  {
    id: "diagnose_alarm",
    name: "Diagnose Alarm",
    description: "Decode alarm code, root cause analysis, recovery procedure, prevention",
    trigger_phrases: ["alarm", "error code", "machine says", "what does alarm", "fault code"],
    trigger_patterns: [
      /\balarm\s+(?:code\s+)?\d+/i,
      /\berror\s+code\b/i,
      /\bmachine\s+says\b/i,
      /\bfault\s+code\b/i,
      /\bwhat\s+(?:does|is)\s+alarm\b/i,
    ],
    persona: "machinist",
    steps: [
      { action: "alarm_decode", dispatcher: "prism_data", label: "Decode alarm", params_template: { code: "$alarm_code", controller: "$controller" }, depends_on: [] },
      { action: "alarm_fix", dispatcher: "prism_data", label: "Get fix procedure", params_template: { code: "$alarm_code" }, depends_on: [0] },
      { action: "failure_diagnose", dispatcher: "prism_intelligence", label: "Root cause analysis", params_template: { symptoms: "$symptoms", alarm: "$alarm_code" }, depends_on: [0] },
    ],
    estimated_steps: 3,
    estimated_tokens: 3000,
    estimated_time_sec: 1,
  },

  // ── WORKFLOW 10: Teach Me ──
  {
    id: "teach_me",
    name: "Teach Me",
    description: "Explain manufacturing concepts with practical examples and calculations",
    trigger_phrases: ["why", "explain", "how does", "what's the difference between", "teach me"],
    trigger_patterns: [
      /\bwhy\s+(?:does|do|is|are|should)\b/i,
      /\bexplain\s+(?:how|what|why)\b/i,
      /\bhow\s+does\s+\w+\s+work\b/i,
      /\bwhat(?:'s| is)\s+the\s+difference\s+between\b/i,
      /\bteach\s+me\b/i,
    ],
    persona: "all",
    steps: [
      { action: "search", dispatcher: "prism_knowledge", label: "Search knowledge base", params_template: { query: "$query" }, depends_on: [] },
      { action: "formula_get", dispatcher: "prism_data", label: "Get relevant formula", params_template: { name: "$formula" }, depends_on: [], condition: "has_formula" },
    ],
    estimated_steps: 2,
    estimated_tokens: 4000,
    estimated_time_sec: 1,
  },
];

// ─── Build lookup map ───────────────────────────────────────────────────────

const WORKFLOW_MAP = new Map<WorkflowId, WorkflowDefinition>();
for (const wf of WORKFLOWS) {
  WORKFLOW_MAP.set(wf.id, wf);
}

// ─── Matching ───────────────────────────────────────────────────────────────

/**
 * Match a natural language query against pre-built workflows.
 * Returns all matching workflows sorted by confidence (highest first).
 */
export function matchWorkflows(query: string): WorkflowMatch[] {
  if (!query || typeof query !== "string") return [];
  const q = query.toLowerCase().trim();
  const matches: WorkflowMatch[] = [];

  for (const wf of WORKFLOWS) {
    let confidence = 0;
    let bestTrigger = "";

    // Check trigger phrases (exact substring match → high confidence)
    for (const phrase of wf.trigger_phrases) {
      if (q.includes(phrase.toLowerCase())) {
        const phraseConf = 0.7 + (phrase.length / q.length) * 0.3;
        if (phraseConf > confidence) {
          confidence = phraseConf;
          bestTrigger = phrase;
        }
      }
    }

    // Check trigger patterns (regex → medium-high confidence)
    for (const pattern of wf.trigger_patterns) {
      if (pattern.test(query)) {
        const patternConf = 0.6;
        if (patternConf > confidence) {
          confidence = patternConf;
          bestTrigger = pattern.source;
        }
      }
    }

    if (confidence > 0) {
      matches.push({ workflow: wf, confidence: Math.min(confidence, 1.0), matched_trigger: bestTrigger });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Find the best matching workflow for a query.
 * Returns null if no workflow matches with sufficient confidence.
 */
export function findBestWorkflow(query: string, minConfidence = 0.5): WorkflowMatch | null {
  const matches = matchWorkflows(query);
  if (matches.length === 0 || matches[0].confidence < minConfidence) return null;
  return matches[0];
}

// ─── Getters ────────────────────────────────────────────────────────────────

/** Get a workflow definition by ID */
export function getWorkflow(id: WorkflowId): WorkflowDefinition | undefined {
  return WORKFLOW_MAP.get(id);
}

/** List all workflows (summary form) */
export function listWorkflows(): WorkflowListItem[] {
  return WORKFLOWS.map(wf => ({
    id: wf.id,
    name: wf.name,
    description: wf.description,
    persona: wf.persona,
    steps: wf.estimated_steps,
    estimated_tokens: wf.estimated_tokens,
    trigger_phrases: wf.trigger_phrases,
  }));
}

/** Get all workflow definitions */
export function getAllWorkflows(): WorkflowDefinition[] {
  return [...WORKFLOWS];
}

// ─── Dispatcher Entry Point ─────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Supports: workflow_match, workflow_get, workflow_list
 */
export function workflowChains(action: string, params: Record<string, any>): any {
  switch (action) {
    case "workflow_match": {
      const { query, min_confidence } = params;
      if (!query) throw new Error("WorkflowChainsEngine: 'query' parameter is required");
      const matches = matchWorkflows(query);
      const filtered = min_confidence
        ? matches.filter(m => m.confidence >= min_confidence)
        : matches;
      return {
        query,
        matches: filtered.map(m => ({
          workflow_id: m.workflow.id,
          name: m.workflow.name,
          confidence: Math.round(m.confidence * 100) / 100,
          matched_trigger: m.matched_trigger,
          persona: m.workflow.persona,
          steps: m.workflow.estimated_steps,
          estimated_tokens: m.workflow.estimated_tokens,
          estimated_time_sec: m.workflow.estimated_time_sec,
        })),
        best: filtered.length > 0 ? {
          workflow_id: filtered[0].workflow.id,
          name: filtered[0].workflow.name,
          confidence: Math.round(filtered[0].confidence * 100) / 100,
          chain: filtered[0].workflow.steps.map(s => ({
            action: s.action,
            dispatcher: s.dispatcher,
            label: s.label,
            depends_on: s.depends_on,
          })),
        } : null,
        total_matches: filtered.length,
      };
    }

    case "workflow_get": {
      const { workflow_id } = params;
      if (!workflow_id) throw new Error("WorkflowChainsEngine: 'workflow_id' parameter is required");
      const wf = getWorkflow(workflow_id as WorkflowId);
      if (!wf) throw new Error(`WorkflowChainsEngine: unknown workflow "${workflow_id}"`);
      return {
        ...wf,
        trigger_patterns: wf.trigger_patterns.map(p => p.source), // serialize regex
      };
    }

    case "workflow_list": {
      return {
        workflows: listWorkflows(),
        total: WORKFLOWS.length,
      };
    }

    default:
      throw new Error(`WorkflowChainsEngine: unknown action "${action}"`);
  }
}
