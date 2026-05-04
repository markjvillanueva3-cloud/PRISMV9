/**
 * ModelRouterEngine — Tiered model selection across the local Ollama stack + Claude
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P20-U03
 *
 * Pure classifier from TaskInput → RoutingDecision. Stateless except for an
 * optional adaptive-thresholds object that P23 can mutate from telemetry.
 * Has no I/O — caller invokes the chosen model itself (via OllamaClientEngine
 * or the Claude path).
 *
 * Tier table (default):
 *   0 embed       nomic-embed-text       — vector backbone, RAG
 *   1 code-simple qwen2.5-coder:7b       — boilerplate, classify, lint
 *   2 code-medium qwen2.5-coder:14b      — multi-file edits, error triage
 *   3 reason      deepseek-r1:14b        — chain-of-thought, pre-Claude review
 *   4 vision      llama3.2-vision:11b    — PDF/blueprint OCR, diagram parsing
 *   5 deep        claude (escalate)      — safety, physics, manufacturing
 *
 * Selection rules (priority order, first hit wins):
 *   1. forceTier override (if 0 ≤ n ≤ 5)
 *   2. kind === "embed"            → tier 0
 *   3. hasImage / kind === "vision"→ tier 4
 *   4. domain ∈ SAFETY_DOMAINS     → tier 5 (escalate)
 *   5. needsChainOfThought         → tier 3
 *   6. complexity === "complex" || promptTokens > 6000 → tier 3
 *   7. complexity === "medium"     → tier 2
 *   8. default                     → tier 1
 *
 * @module engines/ModelRouterEngine
 */

export type ModelTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const MIN_TIER = 0 as const;
const MAX_TIER = 6 as const;

export type TaskKind = "embed" | "code" | "reason" | "vision" | "review" | "general";

export type TaskComplexity = "simple" | "medium" | "complex";

export interface TaskInput {
  kind: TaskKind;
  complexity?: TaskComplexity;
  promptTokens?: number;
  hasImage?: boolean;
  needsChainOfThought?: boolean;
  domain?: string;
  forceTier?: number;
  /**
   * Set true to escalate this task to multi-model consensus (Claude + Codex/gpt-5.5 +
   * Ollama-deepseek-r1) instead of single Claude. Useful for high-stakes safety/physics
   * tasks where cross-vendor agreement is the goal.
   */
  consensus?: boolean;
}

export interface RoutingDecision {
  tier: ModelTier;
  model: string;
  kind: "embed" | "chat" | "vision" | "escalate" | "consensus";
  reason: string;
  fallback: string | null;
}

export interface TierThresholds {
  largeContextTokens: number;       // tokens above which we bump simple→medium or medium→complex
  complexContextTokens: number;     // tokens above which we route to tier-3 reasoning regardless
}

const DEFAULT_THRESHOLDS: TierThresholds = Object.freeze({
  largeContextTokens: 3000,
  complexContextTokens: 6000,
});

const SAFETY_DOMAINS: ReadonlySet<string> = new Set([
  "safety",
  "physics",
  "kienzle",
  "taylor",
  "deflection",
  "thermal",
  "manufacturing-novel",
  "compliance",
]);

const TIER_TABLE: ReadonlyArray<{ tier: ModelTier; model: string; kind: RoutingDecision["kind"]; fallback: string | null }> = Object.freeze([
  { tier: 0, model: "nomic-embed-text",     kind: "embed",    fallback: null },
  { tier: 1, model: "qwen2.5-coder:7b",     kind: "chat",     fallback: "qwen2.5-coder:14b" },
  { tier: 2, model: "qwen2.5-coder:14b",    kind: "chat",     fallback: "qwen2.5-coder:7b" },
  { tier: 3, model: "deepseek-r1:14b",      kind: "chat",     fallback: "qwen2.5-coder:32b" },
  { tier: 4, model: "llama3.2-vision:11b",  kind: "vision",   fallback: null },
  { tier: 5, model: "claude",               kind: "escalate", fallback: null },
  { tier: 6, model: "consensus",            kind: "consensus", fallback: "claude" },
]);

const DEFAULT_THRESHOLDS_FILE = "H:/prism/mcp-server/data/state/router-thresholds.json";

export class ModelRouterEngine {
  private thresholds: TierThresholds = { ...DEFAULT_THRESHOLDS };

  /**
   * Load persisted thresholds from disk (written by adapt-router-thresholds.mjs).
   * Returns true if a file existed and parsed; false if defaults are still in use.
   * Errors swallow → defaults remain — never throw on this path so MCP boot is unblocked.
   */
  async loadFromState(filePath: string = DEFAULT_THRESHOLDS_FILE): Promise<boolean> {
    try {
      const { promises: fs } = await import("node:fs");
      const raw = await fs.readFile(filePath, "utf-8");
      const j: unknown = JSON.parse(raw);
      if (!j || typeof j !== "object") return false;
      const obj = j as Record<string, unknown>;
      const candidate: Partial<TierThresholds> = {};
      if (typeof obj.largeContextTokens === "number") candidate.largeContextTokens = obj.largeContextTokens;
      if (typeof obj.complexContextTokens === "number") candidate.complexContextTokens = obj.complexContextTokens;
      if (candidate.largeContextTokens === undefined && candidate.complexContextTokens === undefined) return false;
      // setThresholds enforces invariants — if the file was tampered, we keep current values
      const before = { ...this.thresholds };
      try {
        this.setThresholds(candidate);
        return true;
      } catch {
        this.thresholds = before;
        return false;
      }
    } catch {
      return false;
    }
  }

  setThresholds(t: Partial<TierThresholds>): void {
    if (t.largeContextTokens !== undefined) {
      if (!Number.isFinite(t.largeContextTokens) || t.largeContextTokens <= 0) {
        throw new Error("largeContextTokens must be a positive number");
      }
      this.thresholds.largeContextTokens = t.largeContextTokens;
    }
    if (t.complexContextTokens !== undefined) {
      if (!Number.isFinite(t.complexContextTokens) || t.complexContextTokens <= 0) {
        throw new Error("complexContextTokens must be a positive number");
      }
      this.thresholds.complexContextTokens = t.complexContextTokens;
    }
    if (this.thresholds.complexContextTokens <= this.thresholds.largeContextTokens) {
      throw new Error("complexContextTokens must exceed largeContextTokens");
    }
  }

  getThresholds(): TierThresholds {
    return { ...this.thresholds };
  }

  resetThresholds(): void {
    this.thresholds = { ...DEFAULT_THRESHOLDS };
  }

  routeForTask(input: TaskInput): RoutingDecision {
    this.validate(input);

    // 1. Explicit override
    if (input.forceTier !== undefined) {
      const t = input.forceTier;
      if (!Number.isInteger(t) || t < MIN_TIER || t > MAX_TIER) {
        throw new Error(`forceTier must be integer ${MIN_TIER}..${MAX_TIER}, got ${t}`);
      }
      return this.decisionFor(t as ModelTier, `forceTier=${t}`);
    }

    // 2. Embedding always tier 0
    if (input.kind === "embed") {
      return this.decisionFor(0, "kind=embed");
    }

    // 3. Vision (image present OR explicit vision kind)
    if (input.hasImage === true || input.kind === "vision") {
      return this.decisionFor(4, input.hasImage ? "hasImage=true" : "kind=vision");
    }

    // 4a. Explicit consensus request → tier 6 (multi-model)
    if (input.consensus === true) {
      return this.decisionFor(6, "consensus=true (multi-model)");
    }

    // 4b. Safety / physics / manufacturing → AUTO-CONSENSUS (tier 6) unless
    //     caller explicitly opts out with consensus=false. This is the policy
    //     change: high-stakes domains earn cross-vendor cross-architecture
    //     review by default. Pass consensus=false to fall back to single-Claude.
    if (input.domain && SAFETY_DOMAINS.has(input.domain.toLowerCase())) {
      if (input.consensus === false) {
        return this.decisionFor(5, `domain=${input.domain} (safety/physics, consensus=false → claude-only)`);
      }
      return this.decisionFor(6, `domain=${input.domain} (safety/physics → AUTO-CONSENSUS)`);
    }

    // 5. Explicit chain-of-thought signal → reasoning tier
    if (input.needsChainOfThought === true) {
      return this.decisionFor(3, "needsChainOfThought=true");
    }

    // 6. Complexity-driven routing
    const tokens = input.promptTokens ?? 0;
    if (input.complexity === "complex" || tokens > this.thresholds.complexContextTokens) {
      return this.decisionFor(3, input.complexity === "complex"
        ? "complexity=complex"
        : `promptTokens=${tokens} > complexContextTokens=${this.thresholds.complexContextTokens}`);
    }
    if (input.complexity === "medium" || tokens > this.thresholds.largeContextTokens) {
      return this.decisionFor(2, input.complexity === "medium"
        ? "complexity=medium"
        : `promptTokens=${tokens} > largeContextTokens=${this.thresholds.largeContextTokens}`);
    }

    // 7. Default — cheapest competent
    return this.decisionFor(1, "default (kind=" + input.kind + ", complexity=" + (input.complexity ?? "simple") + ")");
  }

  classifyTier(input: TaskInput): ModelTier {
    return this.routeForTask(input).tier;
  }

  // ---- internals ----

  private decisionFor(tier: ModelTier, reason: string): RoutingDecision {
    const row = TIER_TABLE[tier];
    return { tier, model: row.model, kind: row.kind, reason, fallback: row.fallback };
  }

  private validate(input: TaskInput): void {
    if (!input || typeof input !== "object") throw new Error("TaskInput required");
    const validKinds: TaskKind[] = ["embed", "code", "reason", "vision", "review", "general"];
    if (!validKinds.includes(input.kind)) {
      throw new Error(`invalid kind '${input.kind}', expected one of ${validKinds.join("|")}`);
    }
    if (input.complexity !== undefined) {
      const valid: TaskComplexity[] = ["simple", "medium", "complex"];
      if (!valid.includes(input.complexity)) {
        throw new Error(`invalid complexity '${input.complexity}'`);
      }
    }
    if (input.promptTokens !== undefined) {
      if (!Number.isFinite(input.promptTokens) || input.promptTokens < 0) {
        throw new Error("promptTokens must be a non-negative number");
      }
    }
  }
}

export const modelRouterEngine = new ModelRouterEngine();
