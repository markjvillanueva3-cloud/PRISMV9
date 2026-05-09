/**
 * AISystemRouterEngine
 *
 * Routes incoming AI work to the most appropriate execution system based on
 * task class. Spec from /forge Phase 0 Self-Awareness Protocol:
 *
 *   | Task                | System                       |
 *   |---------------------|------------------------------|
 *   | Physics validation  | Docker: physics-agent        |
 *   | Engine building     | Opus (local — Claude)        |
 *   | ML inference        | Ollama: codellama / deepseek |
 *   | Batch >100 files    | Docker: batch-processor      |
 *
 * The engine is read-only / advisory: callers consult `route(task)` and decide
 * how to dispatch. It also reports which backends are reachable so callers can
 * gracefully degrade when (e.g.) Docker is offline.
 *
 * Created during SYS-UTIL-AUDIT-MS0 to repair a missing critical engine
 * referenced by CLAUDE.md and the /forge skill but never implemented.
 */

import { execSync } from "node:child_process";
import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type AIBackend =
  | "claude-opus"
  | "claude-sonnet"
  | "claude-haiku"
  | "ollama-codellama"
  | "ollama-deepseek"
  | "docker-physics-agent"
  | "docker-batch-processor"
  | "local-mcp";

export type TaskClass =
  | "physics_validation"
  | "engine_building"
  | "ml_inference"
  | "batch_processing"
  | "reasoning"
  | "code_review"
  | "search"
  | "calculation"
  | "unknown";

export interface RouteDecision {
  task: string;
  taskClass: TaskClass;
  primary: AIBackend;
  fallback: AIBackend[];
  reachable: boolean;
  reason: string;
  estimatedCost: "free" | "low" | "medium" | "high";
}

export interface BackendHealth {
  backend: AIBackend;
  reachable: boolean;
  lastChecked: string;
  detail?: string;
}

export class AISystemRouterEngine {
  private healthCache = new Map<AIBackend, BackendHealth>();
  private cacheTtlMs = 60_000;

  classify(taskDescription: string): TaskClass {
    const t = taskDescription.toLowerCase();
    if (/(physics|kienzle|taylor|johnson[- ]cook|stress|deflection|chatter)/.test(t)) {
      return "physics_validation";
    }
    if (/(build|create|new)\b.*\b(engine|dispatcher|hook)/.test(t)) {
      return "engine_building";
    }
    if (/(ml|neural|inference|predict|classif)/.test(t)) {
      return "ml_inference";
    }
    if (/(batch|>?\s*\d{3,}\s*(files?|programs?|parts?)|bulk)/.test(t)) {
      return "batch_processing";
    }
    if (/(reason|think|plan|design|strategy|why)/.test(t)) {
      return "reasoning";
    }
    if (/(review|audit|critique|check)/.test(t)) {
      return "code_review";
    }
    if (/(search|find|lookup|grep|locate)/.test(t)) {
      return "search";
    }
    if (/(calculate|compute|formula|equation)/.test(t)) {
      return "calculation";
    }
    return "unknown";
  }

  route(taskDescription: string): RouteDecision {
    const taskClass = this.classify(taskDescription);
    let primary: AIBackend;
    let fallback: AIBackend[];
    let reason: string;
    let estimatedCost: RouteDecision["estimatedCost"];

    switch (taskClass) {
      case "physics_validation":
        primary = "docker-physics-agent";
        fallback = ["claude-opus", "local-mcp"];
        reason = "Physics validation runs in Docker for isolation + repeatable env";
        estimatedCost = "low";
        break;
      case "engine_building":
        primary = "claude-opus";
        fallback = ["claude-sonnet"];
        reason = "Engine creation requires deep reasoning + dedup checks";
        estimatedCost = "high";
        break;
      case "ml_inference":
        primary = "ollama-codellama";
        fallback = ["ollama-deepseek", "claude-haiku"];
        reason = "ML inference is cheap on local Ollama; falls back to Haiku";
        estimatedCost = "free";
        break;
      case "batch_processing":
        primary = "docker-batch-processor";
        fallback = ["local-mcp"];
        reason = "Bulk file ops run in container for parallelism + memory bounds";
        estimatedCost = "low";
        break;
      case "reasoning":
        primary = "claude-opus";
        fallback = ["claude-sonnet"];
        reason = "Reasoning needs Opus-level synthesis";
        estimatedCost = "high";
        break;
      case "code_review":
        primary = "claude-sonnet";
        fallback = ["claude-opus"];
        reason = "Code review benefits from Sonnet (faster, focused)";
        estimatedCost = "medium";
        break;
      case "search":
        primary = "local-mcp";
        fallback = ["claude-haiku"];
        reason = "Search uses local indexes (Grep/MASTER_INDEX) — no LLM needed";
        estimatedCost = "free";
        break;
      case "calculation":
        primary = "local-mcp";
        fallback = ["claude-haiku"];
        reason = "Calculations dispatch to PRISM physics engines (deterministic)";
        estimatedCost = "free";
        break;
      default:
        primary = "claude-sonnet";
        fallback = ["claude-opus"];
        reason = "Unknown task class — default to Sonnet for general competence";
        estimatedCost = "medium";
    }

    const reachable = this.isReachable(primary);
    const decision: RouteDecision = { task: taskDescription, taskClass, primary, fallback, reachable, reason, estimatedCost };
    AISystemRouterEngine.appendLedger(decision);
    return decision;
  }

  private static readonly LEDGER_PATH = "H:/prism/knowledge/summaries/routing-decisions.jsonl";
  private static appendLedger(decision: RouteDecision): void {
    try {
      const dir = dirname(AISystemRouterEngine.LEDGER_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const line = JSON.stringify({ ts: new Date().toISOString(), ...decision }) + "\n";
      appendFileSync(AISystemRouterEngine.LEDGER_PATH, line, "utf8");
    } catch {
      // best-effort; never block routing on telemetry write failure
    }
  }

  isReachable(backend: AIBackend): boolean {
    const cached = this.healthCache.get(backend);
    if (cached && Date.now() - new Date(cached.lastChecked).getTime() < this.cacheTtlMs) {
      return cached.reachable;
    }
    const health = this.probe(backend);
    this.healthCache.set(backend, health);
    return health.reachable;
  }

  probe(backend: AIBackend): BackendHealth {
    const now = new Date().toISOString();
    let reachable = false;
    let detail: string | undefined;

    try {
      switch (backend) {
        case "claude-opus":
        case "claude-sonnet":
        case "claude-haiku":
          // assume reachable if we are running — we ARE Claude
          reachable = true;
          detail = "in-process (Claude Code)";
          break;
        case "local-mcp":
          reachable = existsSync("H:/prism/mcp-server/dist/index.js");
          detail = reachable ? "dist bundle present" : "dist bundle missing";
          break;
        case "docker-physics-agent":
        case "docker-batch-processor": {
          // Two-step probe: daemon up, then required image actually built.
          // Without the image-inspect check we report `reachable=true` even
          // though `prism-{physics-agent,batch-processor}:latest` were never
          // built — callers then route real physics/batch work into a void.
          try {
            execSync("docker ps", { stdio: "ignore", timeout: 2_000 });
          } catch {
            reachable = false;
            detail = "docker daemon unreachable";
            break;
          }
          const imageName = backend === "docker-physics-agent"
            ? "prism-physics-agent:latest"
            : "prism-batch-processor:latest";
          try {
            execSync(`docker image inspect ${imageName}`, { stdio: "ignore", timeout: 2_000 });
            reachable = true;
            detail = `docker daemon up + image ${imageName} present`;
          } catch {
            reachable = false;
            detail = `daemon up but image ${imageName} not built`;
          }
          break;
        }
        case "ollama-codellama":
        case "ollama-deepseek": {
          try {
            execSync("curl -s -m 2 http://localhost:11434/api/tags", { stdio: "ignore" });
            reachable = true;
            detail = "ollama up at :11434";
          } catch {
            reachable = false;
            detail = "ollama not reachable";
          }
          break;
        }
      }
    } catch (err) {
      reachable = false;
      detail = err instanceof Error ? err.message : String(err);
    }

    return { backend, reachable, lastChecked: now, detail };
  }

  healthReport(): BackendHealth[] {
    const all: AIBackend[] = [
      "claude-opus", "claude-sonnet", "claude-haiku",
      "ollama-codellama", "ollama-deepseek",
      "docker-physics-agent", "docker-batch-processor",
      "local-mcp",
    ];
    return all.map(b => this.probe(b));
  }

  getStats() {
    return {
      backends_known: 8,
      task_classes: 9,
      cache_ttl_ms: this.cacheTtlMs,
      cache_entries: this.healthCache.size,
    };
  }
}

export const aiSystemRouterEngine = new AISystemRouterEngine();

/**
 * Dispatcher function for intelligenceDispatcher wiring.
 * Routes AI system router actions to the singleton engine.
 */
export async function aiSystemRouterDispatch(
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    case "ai_route_task":
      return aiSystemRouterEngine.route(params.task as string);
    case "ai_classify_task":
      return aiSystemRouterEngine.classify(params.task as string);
    case "ai_backend_health":
      return aiSystemRouterEngine.healthReport();
    case "ai_backend_probe":
      return aiSystemRouterEngine.probe(params.backend as AIBackend);
    case "ai_router_stats":
      return aiSystemRouterEngine.getStats();
    default:
      throw new Error(`Unknown AI router action: ${action}`);
  }
}
