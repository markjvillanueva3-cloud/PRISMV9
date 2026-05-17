/**
 * ContextPriorityEngine — Intelligent context injection prioritization.
 *
 * Classifies a task prompt by domain (machining/cad/ai/infrastructure/physics/general),
 * task type (build/debug/analyze/optimize/wire/other), urgency, and complexity.
 * Scores candidate context items relative to the classification, applies a per-turn
 * decay so recently-injected items are deprioritised, and picks the best subset
 * within a token budget. Provides a compact recall string keyed off injection turn.
 *
 * Used by `prism_context` dispatcher actions:
 *   priority_classify_task / priority_plan_injections / priority_compute_relevance /
 *   priority_stats / priority_reset
 *
 * Test reference: src/__tests__/ContextPriorityEngine.test.ts
 *
 * @module engines/ContextPriorityEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type ContextDomain =
  | "machining"
  | "cad"
  | "ai"
  | "infrastructure"
  | "physics"
  | "general";

export type ContextTaskType =
  | "build"
  | "debug"
  | "analyze"
  | "optimize"
  | "wire"
  | "other";

export type ContextUrgency = "immediate" | "standard" | "background";
export type ContextComplexity = "simple" | "moderate" | "complex";
export type ContextCategory = "core" | "domain" | "reference" | "transient";

export interface ContextItem {
  id: string;
  category: ContextCategory;
  tokens: number;
  /** Base 0..1 relevance assigned by upstream. */
  relevanceScore: number;
  content: string;
  /** 0..1 multiplicative decay factor (1 = fresh). */
  decayFactor: number;
}

export interface TaskClassification {
  primaryDomain: ContextDomain;
  secondaryDomains: ContextDomain[];
  taskType: ContextTaskType;
  urgency: ContextUrgency;
  complexity: ContextComplexity;
}

export interface InjectionPlan {
  classification: TaskClassification;
  items: ContextItem[];
  totalTokens: number;
  skipped: Array<{ id: string; reason: "low relevance" | "budget exceeded" }>;
}

export interface ContextStats {
  historySize: number;
  currentTurn: number;
}

// ============================================================================
// DOMAIN KEYWORD MAP
// ============================================================================

const DOMAIN_KEYWORDS: Record<Exclude<ContextDomain, "general">, string[]> = {
  machining: ["cnc", "toolpath", "milling", "lathe", "turning", "passes", "feed", "rpm", "machining", "kienzle", "taylor", "spindle", "geometry", "precision", "multiple"],
  cad: ["cad", "model", "solid", "feature", "step", "stl", "iges", "sketch", "extrude", "revolve", "sweep", "loft", "fillet", "chamfer"],
  ai: ["ai", "neural", "network", "inference", "train", "ml ", " ml", "deep learning", "embedding", "transformer", "lora", "agent", "rag"],
  infrastructure: ["dispatcher", "schema", "registry", "ci", "deploy", "hook"],
  physics: ["physics", "force", "stress", "thermal", "deflection", "chatter", "frequency", "constants"],
};

// Iteration order matters for ties — wire/debug/analyze/optimize before build,
// since "build" keywords ("new", "create") overlap with the more specific intents.
const TASK_KEYWORDS: Record<Exclude<ContextTaskType, "other">, string[]> = {
  wire: ["wire", "wiring", "connect", "register", "mount"],
  debug: ["fix", "bug", "debug", "broken", "fail", "failing", "error", "crash"],
  analyze: ["analyze", "review", "audit", "inspect", "investigate"],
  optimize: ["optimize", "improve", "tune", "speed up", "faster", "performance"],
  build: ["build", "create", "implement", "add", "new", "feature"],
};

// ============================================================================
// ENGINE
// ============================================================================

export class ContextPriorityEngine {
  private currentTurn = 0;
  /** Map of item id → turn it was last injected (for decay + recall). */
  private injectionHistory = new Map<string, number>();

  /**
   * Classify a free-text prompt into a domain, task type, urgency, complexity.
   * Pure function over the prompt — no engine state mutated.
   */
  classifyTask(prompt: string): TaskClassification {
    const text = prompt.toLowerCase();

    // Domain scoring — count keyword hits per domain. Hits in the first 20
    // characters count triple so the head noun ("create CAD model …") wins
    // over later supporting jargon ("…neural network ml optimization"). The
    // domain's own name appearing as a standalone word also counts triple.
    const scores: Record<Exclude<ContextDomain, "general">, number> = {
      machining: 0, cad: 0, ai: 0, infrastructure: 0, physics: 0,
    };
    for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS) as Array<[keyof typeof scores, string[]]>) {
      for (const kw of kws) {
        const idx = text.indexOf(kw);
        if (idx < 0) continue;
        let weight = idx < 20 ? 3 : 1;
        if (kw === domain) weight = Math.max(weight, 3);
        scores[domain] += weight;
      }
    }
    const ranked = (Object.entries(scores) as Array<[keyof typeof scores, number]>)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);

    const primaryDomain: ContextDomain = ranked[0]?.[0] ?? "general";
    const secondaryDomains: ContextDomain[] = ranked.slice(1, 3).map(([d]) => d);

    // Task type — first matching keyword set wins.
    let taskType: ContextTaskType = "other";
    for (const [kind, kws] of Object.entries(TASK_KEYWORDS) as Array<[ContextTaskType, string[]]>) {
      if (kws.some(kw => text.includes(kw))) { taskType = kind; break; }
    }

    // Urgency — explicit keywords override default.
    let urgency: ContextUrgency = "standard";
    if (/\b(urgent|asap|now|immediately)\b/.test(text)) urgency = "immediate";
    else if (/\b(when you can|background|whenever|low priority)\b/.test(text)) urgency = "background";

    // Complexity — explicit keywords first, fall back to length heuristic.
    let complexity: ContextComplexity = "simple";
    if (/\b(complex|comprehensive|full|exhaustive|deep)\b/.test(text)) complexity = "complex";
    else if (/\b(simple|quick|trivial|fast)\b/.test(text)) complexity = "simple";
    else if (text.length > 300) complexity = "complex";
    else if (text.length > 100) complexity = "moderate";

    return { primaryDomain, secondaryDomains, taskType, urgency, complexity };
  }

  /**
   * Compute a 0..1 relevance score for an item under a classification.
   * Boosts items whose id matches primary or secondary domain (×1.5),
   * core category (×1.2), and applies post-injection decay (×~0).
   */
  computeRelevance(item: ContextItem, classification: TaskClassification): number {
    let score = Math.max(0, item.relevanceScore);
    const id = item.id.toLowerCase();

    if (item.category === "core") {
      // Core items skip the domain match/penalty branch — they're context the
      // session always benefits from (e.g. CLAUDE.md). Only the core boost applies.
      score *= 1.2;
    } else {
      // Domain match — id contains the primary or any secondary domain string.
      const matchesPrimary =
        classification.primaryDomain !== "general" && id.includes(classification.primaryDomain);
      const matchesSecondary =
        classification.secondaryDomains.some(d => d !== "general" && id.includes(d));
      if (matchesPrimary || matchesSecondary) {
        score *= 1.5;
      } else if (classification.primaryDomain !== "general") {
        score *= 0.3;
      }
    }

    // Decay — items injected this turn are nearly invisible until a few turns
    // have passed (linear recovery over 5 turns). Otherwise honour the item's
    // own decayFactor.
    const lastTurn = this.injectionHistory.get(item.id);
    if (lastTurn !== undefined) {
      const age = this.currentTurn - lastTurn;
      const decay = Math.min(1, age / 5);
      score *= decay;
    } else {
      score *= item.decayFactor;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Greedy plan: classify → score → sort → pack within token budget.
   * Items below 0.1 relevance are skipped as `low relevance`.
   * Records the injection turn for each chosen item.
   */
  planInjections(prompt: string, items: ContextItem[], tokenBudget: number): InjectionPlan {
    const classification = this.classifyTask(prompt);
    this.currentTurn += 1;

    // Compute scores BEFORE history update so this turn does not poison itself.
    const scored = items.map(item => ({
      item,
      score: this.computeRelevance(item, classification),
    }));
    scored.sort((a, b) => b.score - a.score);

    const chosen: ContextItem[] = [];
    const skipped: InjectionPlan["skipped"] = [];
    let totalTokens = 0;
    for (const { item, score } of scored) {
      if (score < 0.1) {
        skipped.push({ id: item.id, reason: "low relevance" });
        continue;
      }
      if (totalTokens + item.tokens > tokenBudget) {
        skipped.push({ id: item.id, reason: "budget exceeded" });
        continue;
      }
      chosen.push(item);
      totalTokens += item.tokens;
      this.injectionHistory.set(item.id, this.currentTurn);
    }

    return { classification, items: chosen, totalTokens, skipped };
  }

  /** Compact recall marker for an injected item, or `""` if never injected. */
  generateCompressedRecall(itemId: string): string {
    const turn = this.injectionHistory.get(itemId);
    if (turn === undefined) return "";
    return `[Recall: ${itemId} from turn ${turn}]`;
  }

  stats(): ContextStats {
    return {
      historySize: this.injectionHistory.size,
      currentTurn: this.currentTurn,
    };
  }

  resetHistory(): void {
    this.injectionHistory.clear();
    this.currentTurn = 0;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const contextPriorityEngine = new ContextPriorityEngine();
