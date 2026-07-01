/**
 * AutomationChainEngine — ACP-MS0A + ACP-MS1
 *
 * Automation Control Plane: classifies user prompts into task types,
 * resolves context bundles, and routes to the correct automation chain.
 *
 * 9 task classes:
 *   backend, web, cad_python, roadmap, audit, speed_feed, post_process, erp, general
 *
 * Each class maps to a chain with:
 *   - Context bundles (files to load)
 *   - Token budget (max tokens for the chain)
 *   - Fail-closed behavior (what happens on error)
 *   - Downstream hooks to trigger
 *
 * Sources:
 *   - ACP-MS0A: Chain schema + contracts
 *   - ACP-MS1: Entry router + task classifier
 *   - AUTOMATION_CENSUS.json: Inventory of existing surfaces
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaskClass =
  | "backend"      // MCP server TypeScript code changes
  | "web"          // React/Vite frontend work
  | "cad_python"   // CadQuery/Fusion Python CAD engine
  | "roadmap"      // Roadmap execution, milestone work
  | "audit"        // Quality audits, reviews, scrutiny
  | "speed_feed"   // Speed/feed calculations, physics
  | "post_process" // Post processor, G-code optimization
  | "erp"          // Business, quoting, scheduling, ERP
  | "general";     // Catch-all for unclassified tasks

export type ChainTier = "critical" | "standard" | "background";
export type FailBehavior = "fail_closed" | "degrade_silent" | "degrade_warn" | "ask_user";

export interface AutomationChain {
  id: string;
  task_class: TaskClass;
  tier: ChainTier;
  token_budget: number;
  context_bundles: ContextBundle[];
  fail_behavior: FailBehavior;
  steps: ChainStep[];
  downstream_hooks: string[];
}

export interface ContextBundle {
  id: string;
  files: string[];
  purpose: string;
  token_cost_estimate: number;
}

export interface ChainStep {
  id: string;
  action: string;
  description: string;
  required: boolean;
  timeout_ms: number;
}

export interface ClassificationResult {
  task_class: TaskClass;
  confidence: number;
  matched_keywords: string[];
  chain_id: string;
  context_bundles: ContextBundle[];
  token_budget: number;
}

export interface TelemetryEvent {
  timestamp: string;
  chain_id: string;
  step_id: string;
  status: "started" | "completed" | "failed" | "skipped";
  token_cost: number;
  latency_ms: number;
  error?: string;
}

// ============================================================================
// KEYWORD CLASSIFIERS
// ============================================================================

const TASK_KEYWORDS: Record<TaskClass, string[]> = {
  backend: [
    "engine", "dispatcher", "action", "schema", "typescript", "ts error",
    "build", "tsc", "vitest", "test", "import", "export", "src/",
    "hook", "middleware", "route", "api", "mcp", "registry",
  ],
  web: [
    "react", "vite", "component", "page", "frontend", "ui", "web",
    "tailwind", "css", "button", "form", "dashboard", "calculator",
    "web/src", "jsx", "tsx",
  ],
  cad_python: [
    "cadquery", "cad", "python", "stl", "step", "brep", "geometry",
    "fusion", "opencascade", "cad-engine", "parametric", "sketch",
  ],
  roadmap: [
    "roadmap", "milestone", "session", "unit", "compact", "handoff",
    "continue", "pick-task", "next task", "resume", "track",
    "phase", "sprint", "rgs", "gap",
  ],
  audit: [
    "audit", "review", "scrutinize", "quality", "omega", "svi",
    "check", "verify", "validate", "coverage", "health",
    "prism-review", "fix", "remediat",
  ],
  speed_feed: [
    "speed", "feed", "rpm", "ipm", "sfm", "chip load", "mrr",
    "kienzle", "taylor", "cutting force", "tool life", "chatter",
    "deflection", "surface finish", "ra ", "physics",
    "calculate", "optimize", "calibrate",
  ],
  post_process: [
    "post", "g-code", "gcode", "program", "nc ", "cnc program",
    "fanuc", "siemens", "haas", "heidenhain", "okuma", "mazak",
    "controller", "dialect", "block", "line-by-line", "per-block",
    "m-code", "g-code", "tool change", "coolant",
  ],
  erp: [
    "quote", "cost", "price", "estimate", "rfq", "purchase order",
    "schedule", "capacity", "oee", "job", "invoice", "billing",
    "shipping", "inventory", "stock", "supplier", "customer",
    "lead time", "profit", "margin",
  ],
  general: [], // catch-all, no keywords
};

// ============================================================================
// CONTEXT BUNDLES
// ============================================================================

const CONTEXT_BUNDLES: Record<TaskClass, ContextBundle[]> = {
  backend: [
    { id: "engine-digest", files: ["data/docs/ENGINE_DIGEST.md"], purpose: "Engine names to avoid duplicates", token_cost_estimate: 300 },
    { id: "dispatcher-digest", files: ["data/docs/DISPATCHER_DIGEST.md"], purpose: "Dispatcher routing", token_cost_estimate: 200 },
  ],
  web: [
    { id: "web-structure", files: ["web/src/App.tsx"], purpose: "React app structure", token_cost_estimate: 200 },
  ],
  cad_python: [
    { id: "cad-structure", files: ["../cad-engine/README.md"], purpose: "CAD engine architecture", token_cost_estimate: 150 },
  ],
  roadmap: [
    { id: "position", files: ["../state/CURRENT_POSITION.md"], purpose: "Current roadmap position", token_cost_estimate: 100 },
    { id: "handoff", files: ["../state/HANDOFF.md"], purpose: "Last session handoff", token_cost_estimate: 200 },
  ],
  audit: [
    { id: "health", files: ["data/state/HEALTH_CHECK_REPORT.json"], purpose: "System health baseline", token_cost_estimate: 150 },
  ],
  speed_feed: [
    { id: "physics", files: ["src/physics/constants.ts"], purpose: "Canonical physics constants", token_cost_estimate: 400 },
  ],
  post_process: [
    { id: "pp-pipeline", files: ["data/docs/ENGINE_DIGEST.md"], purpose: "PP engine inventory", token_cost_estimate: 300 },
  ],
  erp: [
    { id: "biz-engines", files: ["data/docs/ENGINE_DIGEST.md"], purpose: "Business engine inventory", token_cost_estimate: 300 },
  ],
  general: [],
};

// ============================================================================
// CHAINS
// ============================================================================

const CHAINS: Record<TaskClass, Omit<AutomationChain, "context_bundles">> = {
  backend: {
    id: "chain-backend",
    task_class: "backend",
    tier: "critical",
    token_budget: 2000,
    fail_behavior: "fail_closed",
    steps: [
      { id: "classify", action: "classify_task", description: "Identify affected engines/dispatchers", required: true, timeout_ms: 1000 },
      { id: "load_context", action: "load_bundles", description: "Load ENGINE_DIGEST + DISPATCHER_DIGEST", required: true, timeout_ms: 2000 },
      { id: "edit", action: "code_change", description: "Make the code change", required: true, timeout_ms: 60000 },
      { id: "typecheck", action: "run_tsc", description: "npx tsc --noEmit", required: true, timeout_ms: 120000 },
      { id: "test", action: "run_tests", description: "Run affected test files", required: false, timeout_ms: 60000 },
    ],
    downstream_hooks: ["PostToolUse:Write", "PostToolUse:Edit"],
  },
  web: {
    id: "chain-web",
    task_class: "web",
    tier: "standard",
    token_budget: 1500,
    fail_behavior: "degrade_warn",
    steps: [
      { id: "classify", action: "classify_task", description: "Identify affected components", required: true, timeout_ms: 1000 },
      { id: "edit", action: "code_change", description: "Make the frontend change", required: true, timeout_ms: 60000 },
      { id: "typecheck", action: "run_tsc", description: "Type check web/", required: false, timeout_ms: 60000 },
    ],
    downstream_hooks: [],
  },
  cad_python: {
    id: "chain-cad",
    task_class: "cad_python",
    tier: "standard",
    token_budget: 1500,
    fail_behavior: "degrade_warn",
    steps: [
      { id: "edit", action: "code_change", description: "Make Python change", required: true, timeout_ms: 60000 },
      { id: "test", action: "run_pytest", description: "Run pytest on cad-engine/", required: false, timeout_ms: 60000 },
    ],
    downstream_hooks: [],
  },
  roadmap: {
    id: "chain-roadmap",
    task_class: "roadmap",
    tier: "standard",
    token_budget: 500,
    fail_behavior: "degrade_silent",
    steps: [
      { id: "load_position", action: "read_position", description: "Load CURRENT_POSITION + HANDOFF", required: true, timeout_ms: 2000 },
      { id: "pick_task", action: "pick_next", description: "Determine next work unit", required: true, timeout_ms: 5000 },
    ],
    downstream_hooks: ["Notification:milestone"],
  },
  audit: {
    id: "chain-audit",
    task_class: "audit",
    tier: "background",
    token_budget: 2000,
    fail_behavior: "degrade_warn",
    steps: [
      { id: "scan", action: "scan_codebase", description: "Identify audit targets", required: true, timeout_ms: 10000 },
      { id: "review", action: "run_review", description: "Multi-agent review", required: true, timeout_ms: 300000 },
    ],
    downstream_hooks: [],
  },
  speed_feed: {
    id: "chain-sf",
    task_class: "speed_feed",
    tier: "critical",
    token_budget: 1000,
    fail_behavior: "fail_closed",
    steps: [
      { id: "load_physics", action: "load_constants", description: "Load canonical constants", required: true, timeout_ms: 1000 },
      { id: "compute", action: "run_sfo", description: "Run SpeedFeedOrchestrator", required: true, timeout_ms: 5000 },
    ],
    downstream_hooks: [],
  },
  post_process: {
    id: "chain-pp",
    task_class: "post_process",
    tier: "critical",
    token_budget: 1500,
    fail_behavior: "fail_closed",
    steps: [
      { id: "detect", action: "detect_controller", description: "Auto-detect controller dialect", required: false, timeout_ms: 2000 },
      { id: "process", action: "run_pipeline", description: "Run 38-stage PP pipeline", required: true, timeout_ms: 30000 },
      { id: "verify", action: "safety_check", description: "Verify output safety", required: true, timeout_ms: 5000 },
    ],
    downstream_hooks: [],
  },
  erp: {
    id: "chain-erp",
    task_class: "erp",
    tier: "standard",
    token_budget: 1500,
    fail_behavior: "degrade_warn",
    steps: [
      { id: "classify", action: "classify_biz", description: "Identify business domain", required: true, timeout_ms: 1000 },
      { id: "compute", action: "run_engine", description: "Run business engine", required: true, timeout_ms: 10000 },
    ],
    downstream_hooks: [],
  },
  general: {
    id: "chain-general",
    task_class: "general",
    tier: "standard",
    token_budget: 500,
    fail_behavior: "degrade_silent",
    steps: [],
    downstream_hooks: [],
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class AutomationChainEngine {

  /**
   * Classify a user prompt into one of 9 task classes.
   * Uses keyword matching with weighted scoring.
   *
   * @param prompt User's message text
   * @returns Classification with confidence, chain, and context bundles
   */
  classify(prompt: string): ClassificationResult {
    const lower = prompt.toLowerCase();
    const scores: Record<TaskClass, { score: number; matched: string[] }> = {} as any;

    for (const [cls, keywords] of Object.entries(TASK_KEYWORDS) as [TaskClass, string[]][]) {
      const matched: string[] = [];
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          matched.push(kw);
          score += kw.length; // longer keywords = more specific = higher weight
        }
      }
      scores[cls] = { score, matched };
    }

    // Find best match
    let bestClass: TaskClass = "general";
    let bestScore = 0;
    for (const [cls, { score }] of Object.entries(scores) as [TaskClass, { score: number; matched: string[] }][]) {
      if (score > bestScore) {
        bestScore = score;
        bestClass = cls;
      }
    }

    // Confidence: normalize score relative to prompt length
    const maxPossibleScore = lower.length;
    const confidence = maxPossibleScore > 0 ? Math.min(1.0, bestScore / (maxPossibleScore * 0.3)) : 0;

    const chain = CHAINS[bestClass];
    const bundles = CONTEXT_BUNDLES[bestClass];

    return {
      task_class: bestClass,
      confidence: parseFloat(confidence.toFixed(3)),
      matched_keywords: scores[bestClass]?.matched || [],
      chain_id: chain.id,
      context_bundles: bundles,
      token_budget: chain.token_budget,
    };
  }

  /**
   * Get the full automation chain for a task class.
   */
  getChain(taskClass: TaskClass): AutomationChain {
    const base = CHAINS[taskClass];
    return {
      ...base,
      context_bundles: CONTEXT_BUNDLES[taskClass],
    };
  }

  /**
   * Get all defined chains for inspection.
   */
  listChains(): Array<{ id: string; task_class: TaskClass; tier: ChainTier; steps: number; token_budget: number }> {
    return Object.values(CHAINS).map(c => ({
      id: c.id,
      task_class: c.task_class,
      tier: c.tier,
      steps: c.steps.length,
      token_budget: c.token_budget,
    }));
  }

  /**
   * Generate a telemetry event for chain execution tracking.
   */
  createTelemetryEvent(
    chainId: string,
    stepId: string,
    status: TelemetryEvent["status"],
    tokenCost: number,
    latencyMs: number,
    error?: string,
  ): TelemetryEvent {
    return {
      timestamp: new Date().toISOString(),
      chain_id: chainId,
      step_id: stepId,
      status,
      token_cost: tokenCost,
      latency_ms: latencyMs,
      error,
    };
  }
}

export const automationChainEngine = new AutomationChainEngine();
