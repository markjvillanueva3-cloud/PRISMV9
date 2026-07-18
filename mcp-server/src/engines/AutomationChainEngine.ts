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

// ACP-MS0A contract enums are single-sourced from the frozen Zod schema (not
// re-declared) so this runtime + its type-import sites (AutomationChainTelemetry,
// ChainFailureRecovery, ContextChain, SpeedFeedAutopilot, TokenEconomy, tests --
// each importing only the contract names it needs) follow the contract
// automatically: a TaskClass added to the schema can never silently diverge from
// this runtime (R7 single-source-of-truth). Type-only import: erased at runtime,
// one-way (the schema imports nothing back), so no cycle. ACP-MS2 additionally
// imports TIER_FAIL_RULES (a value) for the executeChain executor below.
import { TIER_FAIL_RULES } from "../schemas/automationChainSchema.js";
import type {
  TaskClass, ChainTier, FailBehavior, TelemetryEvent, TelemetryEventStatus,
} from "../schemas/automationChainSchema.js";

// ============================================================================
// TYPES
// ============================================================================

// Re-exported so this engine stays the public type-import site the 6 consumers
// already use, while automationChainSchema.ts is the single source. The enum
// members (frozen by automationChainSchema.test.ts): TaskClass = backend | web |
// cad_python | roadmap | audit | speed_feed | post_process | erp | general;
// ChainTier = critical | standard | background; FailBehavior = fail_closed |
// degrade_silent | degrade_warn | ask_user.
export type { TaskClass, ChainTier, FailBehavior, TelemetryEvent, TelemetryEventStatus };

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

// TelemetryEvent is single-sourced from automationChainSchema.ts (imported +
// re-exported above, R7). The schema's status union is the canonical 6-value set
// (started|completed|failed|skipped|timeout|budget_exceeded) -- the previous
// local 4-value redeclaration could not even express budget_exceeded/timeout,
// the exact statuses the executor below now PRODUCES (ACP-MS2).

// ─── Chain execution (ACP-MS2: the telemetry PRODUCER) ──────────────────────

/** Per-step outcome in a chain run. */
export interface ChainStepResult {
  step_id: string;
  action: string;
  status: TelemetryEventStatus;   // completed | failed | skipped | timeout
  token_cost: number;
  latency_ms: number;
  attempts: number;               // 1 + retries actually performed
  error?: string;
}

/** Result of executing a full chain. */
export interface ChainExecutionResult {
  chain_id: string;
  task_class: TaskClass;
  tier: ChainTier;
  status: "completed" | "failed" | "timeout" | "budget_exceeded";
  steps: ChainStepResult[];
  token_cost_total: number;
  token_budget: number;
  budget_remaining: number;       // max(0, budget - spent)
  latency_ms_total: number;
  aborted_at_step: string | null; // step id where the chain stopped, or null
  telemetry: TelemetryEvent[];    // chain-level started + terminal events emitted
}

/**
 * Caller-supplied step executor. The engine stays pure: ALL I/O (running tsc,
 * reading files, calling an LLM, etc.) lives in this callback. It returns the
 * token cost the step consumed; throwing (or exceeding `step.timeout_ms`) is a
 * step failure handled by {@link AutomationChainEngine.executeChain}.
 */
export type ChainStepRunner = (
  step: ChainStep,
  ctx: { chain_id: string; task_class: TaskClass; tokens_spent: number; budget_remaining: number },
) => Promise<{ token_cost: number; output?: unknown }> | { token_cost: number; output?: unknown };

/** Sentinel thrown internally when a step exceeds its timeout_ms. */
class ChainStepTimeoutError extends Error {
  constructor(public readonly stepId: string, public readonly timeoutMs: number) {
    super(`step '${stepId}' exceeded timeout ${timeoutMs}ms`);
    this.name = "ChainStepTimeoutError";
  }
}

/** Options for {@link AutomationChainEngine.executeChain}. */
export interface ExecuteChainOptions {
  /**
   * When true, the chain-level `started` + terminal telemetry events are
   * ingested into AutomationChainTelemetryEngine (so prism_telemetry queries
   * see them). Default false -- the engine stays pure + does not mutate the
   * shared singleton unless the caller opts in.
   */
  ingest?: boolean;
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

  /**
   * Build a telemetry event AND auto-ingest it into AutomationChainTelemetryEngine
   * (ACP-MS6 P1-U01). Use this instead of {@link createTelemetryEvent} when you
   * want the event aggregated for `prism_telemetry:automation_chain_*` queries.
   * Falls back silently if the telemetry engine is not available (test isolation).
   * @returns The created event (same shape as createTelemetryEvent).
   */
  async recordTelemetryEvent(
    chainId: string,
    stepId: string,
    status: TelemetryEvent["status"],
    tokenCost: number,
    latencyMs: number,
    error?: string,
  ): Promise<TelemetryEvent> {
    const event = this.createTelemetryEvent(chainId, stepId, status, tokenCost, latencyMs, error);
    try {
      const mod = await import("./AutomationChainTelemetryEngine.js");
      mod.automationChainTelemetryEngine.ingest(event);
    } catch {
      // Telemetry engine optional — keep emit path resilient.
    }
    return event;
  }

  /**
   * Seed AutomationChainTelemetryEngine with the declared `token_budget` for
   * every TaskClass (ACP-MS6 P1-U03 token_budget_utilization). Idempotent.
   * Returns the count of chains registered.
   */
  async seedTelemetryBudgets(): Promise<number> {
    const mod = await import("./AutomationChainTelemetryEngine.js");
    let count = 0;
    for (const taskClass of Object.keys(CHAINS) as TaskClass[]) {
      const chain = CHAINS[taskClass];
      mod.automationChainTelemetryEngine.recordChainBudget(chain.id, taskClass, chain.token_budget);
      count += 1;
    }
    return count;
  }

  /**
   * Execute a chain's steps via a caller-supplied {@link ChainStepRunner},
   * enforcing the chain's `token_budget` and each step's `timeout_ms`, applying
   * the tier's {@link TIER_FAIL_RULES} (retries on a required step), and EMITTING
   * the previously-unproducible `budget_exceeded` / `timeout` telemetry statuses
   * (ACP-MS2 -- this is the telemetry PRODUCER the schema's 6-status union and
   * the aggregator's allow-set were always designed for).
   *
   * Semantics:
   *  - REQUIRED step error/timeout: retried up to TIER_FAIL_RULES.max_retries
   *    (when retry_allowed); still failing -> chain aborts with terminal status
   *    `failed` (error) or `timeout`.
   *  - NON-REQUIRED step error/timeout: recorded as `skipped` for that step;
   *    chain degrades and CONTINUES (terminal can still be `completed`).
   *  - Cumulative token_cost EXCEEDING token_budget after a step -> chain aborts
   *    with terminal `budget_exceeded` (the over-budget step's cost is still
   *    counted; later steps do not run). A degenerate already-exhausted budget
   *    before a step also aborts `budget_exceeded`.
   *  - All steps succeed (or only non-required degrade) -> `completed`.
   *
   * Exactly TWO chain-level telemetry events are emitted per run -- one
   * `started` and one terminal (status === the chain's terminal status) -- so
   * the aggregator's per-chain fire/completion/downgrade rates stay in [0,1].
   * Full per-step detail is returned in `steps` (not ingested).
   *
   * Pure unless `opts.ingest` is set (then the two chain-level events are fed to
   * AutomationChainTelemetryEngine). Never throws on a step failure -- failures
   * are captured as result status. Throws only on an unknown taskClass.
   *
   * @param taskClass - one of the 9 task classes.
   * @param runner - caller-supplied step executor (all I/O lives here).
   * @param opts - {@link ExecuteChainOptions}.
   * @returns {@link ChainExecutionResult}.
   */
  async executeChain(
    taskClass: TaskClass,
    runner: ChainStepRunner,
    opts: ExecuteChainOptions = {},
  ): Promise<ChainExecutionResult> {
    if (!CHAINS[taskClass]) {
      throw new Error(`executeChain: unknown task class '${taskClass}'`);
    }
    const chain = this.getChain(taskClass);
    const tierRules = TIER_FAIL_RULES.find(r => r.tier === chain.tier);
    const maxRetries = tierRules && tierRules.retry_allowed ? tierRules.max_retries : 0;
    const budget = chain.token_budget;
    const ingest = opts.ingest === true;

    const steps: ChainStepResult[] = [];
    const telemetry: TelemetryEvent[] = [];
    let spent = 0;
    let terminal: ChainExecutionResult["status"] = "completed";
    let abortedAt: string | null = null;

    const t0 = Date.now();
    telemetry.push(await this.emitChainEvent(chain.id, "chain", "started", 0, 0, undefined, ingest, budget));

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];

      // Budget gate BEFORE running: an already-exhausted budget cannot fund a step.
      if (spent >= budget) { terminal = "budget_exceeded"; abortedAt = step.id; break; }

      const stepT0 = Date.now();
      let attempts = 0;
      let outcome: StepOutcome;
      do {
        attempts += 1;
        outcome = await this.runStepWithTimeout(step, runner, {
          chain_id: chain.id, task_class: taskClass,
          tokens_spent: spent, budget_remaining: Math.max(0, budget - spent),
        });
      } while (!outcome.ok && step.required && attempts <= maxRetries);

      const stepLatency = Date.now() - stepT0;
      spent += outcome.token_cost;

      if (outcome.ok) {
        steps.push({ step_id: step.id, action: step.action, status: "completed", token_cost: outcome.token_cost, latency_ms: stepLatency, attempts });
      } else {
        const failStatus: TelemetryEventStatus = outcome.reason === "timeout" ? "timeout" : "failed";
        steps.push({
          step_id: step.id, action: step.action,
          status: step.required ? failStatus : "skipped",
          token_cost: outcome.token_cost, latency_ms: stepLatency, attempts, error: outcome.error,
        });
        if (step.required) { terminal = failStatus; abortedAt = step.id; break; }
        // non-required -> degrade + continue
      }

      // Budget gate AFTER: a step that pushed cumulative spend over budget aborts the chain.
      if (spent > budget) { terminal = "budget_exceeded"; abortedAt = step.id; break; }
    }

    const latencyTotal = Date.now() - t0;
    const remaining = Math.max(0, budget - spent);
    const terminalError = terminal === "completed"
      ? undefined
      : `chain ${terminal}${abortedAt ? ` at step ${abortedAt}` : ""}`;
    telemetry.push(await this.emitChainEvent(chain.id, abortedAt ?? "chain", terminal, Math.round(spent), latencyTotal, terminalError, ingest, remaining));

    return {
      chain_id: chain.id, task_class: taskClass, tier: chain.tier,
      status: terminal, steps, token_cost_total: spent,
      token_budget: budget, budget_remaining: remaining,
      latency_ms_total: latencyTotal, aborted_at_step: abortedAt, telemetry,
    };
  }

  /**
   * Run a single step against the runner, racing it against `step.timeout_ms`.
   * Never throws -- returns a tagged outcome. The timer is always cleared.
   */
  private async runStepWithTimeout(
    step: ChainStep,
    runner: ChainStepRunner,
    ctx: { chain_id: string; task_class: TaskClass; tokens_spent: number; budget_remaining: number },
  ): Promise<StepOutcome> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutP = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new ChainStepTimeoutError(step.id, step.timeout_ms)), Math.max(1, step.timeout_ms));
      });
      const res = await Promise.race([Promise.resolve(runner(step, ctx)), timeoutP]);
      const cost = Math.max(0, Math.round(Number(res?.token_cost)) || 0);
      return { ok: true, token_cost: cost };
    } catch (e) {
      if (e instanceof ChainStepTimeoutError) {
        return { ok: false, reason: "timeout", error: e.message, token_cost: 0 };
      }
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, reason: "error", error: msg, token_cost: 0 };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Build a chain-level TelemetryEvent (schema-shaped) and, when `ingest`,
   * feed it to AutomationChainTelemetryEngine. Fail-soft on a missing telemetry
   * engine (test isolation). `latency_ms` / `token_cost` are integer-normalized
   * to satisfy the schema's int constraints.
   */
  private async emitChainEvent(
    chainId: string, stepId: string, status: TelemetryEventStatus,
    tokenCost: number, latencyMs: number, error: string | undefined,
    ingest: boolean, budgetRemaining: number,
  ): Promise<TelemetryEvent> {
    const event: TelemetryEvent = {
      timestamp: new Date().toISOString(),
      chain_id: chainId,
      step_id: stepId,
      status,
      token_cost: Math.max(0, Math.round(tokenCost) || 0),
      latency_ms: Math.max(0, Math.round(latencyMs) || 0),
      budget_remaining: Math.max(0, Math.round(budgetRemaining) || 0),
      ...(error ? { error } : {}),
    };
    if (ingest) {
      try {
        const mod = await import("./AutomationChainTelemetryEngine.js");
        mod.automationChainTelemetryEngine.ingest(event);
      } catch {
        // Telemetry engine optional -- keep the executor resilient.
      }
    }
    return event;
  }
}

/** Internal tagged outcome of a single step run. */
type StepOutcome =
  | { ok: true; token_cost: number }
  | { ok: false; reason: "timeout" | "error"; error: string; token_cost: number };

export const automationChainEngine = new AutomationChainEngine();
