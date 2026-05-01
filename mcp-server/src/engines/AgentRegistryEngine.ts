/**
 * AgentRegistryEngine — Inventory of Task-tool agents with trigger keywords
 *
 * Phase 0.17 U-PLG1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Holds a catalog
 * of 100+ Task-tool agents (general-purpose, Explore, Plan, sparc:*,
 * pr-review-toolkit:*, superpowers:*, claude-flow:*, plus PRISM-specific
 * agents like `physics-reviewer`, `dispatcher-wirer`, `catalog-enricher`).
 * Used by SlashCommandRecommenderEngine and `/aware` to surface relevant
 * agents on UserPromptSubmit.
 *
 * Engine is in-memory and loaded by callers. Persistence to
 * `data/state/AGENT_REGISTRY.json` happens in the hook/script layer.
 *
 * @module engines/AgentRegistryEngine
 * @milestone PP-0.17-U-PLG1
 */

export type AgentCategory =
  | "general"
  | "explorer"
  | "planner"
  | "reviewer"
  | "sparc"
  | "prism"
  | "claude-flow"
  | "superpowers"
  | "pr-review"
  | "flow-nexus"
  | "other";

export type CostTier = "low" | "medium" | "high";

export interface AgentEntry {
  name: string;
  category: AgentCategory;
  description: string;
  triggers: string[]; // keyword list for prompt matching
  exampleInvocations?: string[];
  costTier: CostTier;
}

export interface AgentMatch {
  agent: AgentEntry;
  score: number;
  matchedTriggers: string[];
}

function normalizeKeyword(k: string): string {
  return k.trim().toLowerCase();
}

export class AgentRegistryEngine {
  private readonly agents = new Map<string, AgentEntry>();

  register(entry: AgentEntry): AgentEntry {
    this.validate(entry);
    const normalized: AgentEntry = {
      ...entry,
      triggers: [...new Set(entry.triggers.map(normalizeKeyword))],
    };
    this.agents.set(entry.name, normalized);
    return normalized;
  }

  registerAll(entries: readonly AgentEntry[]): void {
    for (const e of entries) this.register(e);
  }

  unregister(name: string): boolean {
    return this.agents.delete(name);
  }

  get(name: string): AgentEntry | null {
    return this.agents.get(name) ?? null;
  }

  list(): AgentEntry[] {
    return [...this.agents.values()];
  }

  listByCategory(category: AgentCategory): AgentEntry[] {
    return this.list().filter((a) => a.category === category);
  }

  /**
   * Match the prompt against registered agents. Returns sorted matches by
   * score (trigger-overlap count, tie-broken by lower cost tier, then name).
   */
  match(prompt: string, limit = 3): AgentMatch[] {
    const tokens = new Set(
      (prompt.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((t) => t.length > 1)
    );
    if (tokens.size === 0) return [];

    const matches: AgentMatch[] = [];
    for (const agent of this.agents.values()) {
      const matched: string[] = [];
      for (const trigger of agent.triggers) {
        if (tokens.has(trigger) || this.multiWordHit(prompt, trigger)) {
          matched.push(trigger);
        }
      }
      if (matched.length === 0) continue;
      matches.push({
        agent,
        score: Math.round((matched.length / Math.max(1, agent.triggers.length)) * 10000) / 10000,
        matchedTriggers: matched,
      });
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const tierRank = (t: CostTier) => (t === "low" ? 0 : t === "medium" ? 1 : 2);
      const ta = tierRank(a.agent.costTier);
      const tb = tierRank(b.agent.costTier);
      if (ta !== tb) return ta - tb;
      return a.agent.name.localeCompare(b.agent.name);
    });

    return limit > 0 ? matches.slice(0, limit) : matches;
  }

  size(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
  }

  /**
   * Load agents from AGENT_REGISTRY.json produced by
   * `scripts/build-agent-registry.ts`. Idempotent — safe to call on every
   * session boot. Returns number of entries loaded.
   */
  loadFromRegistryFile(filePath: string): number {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("node:fs");
    const raw = readFileSync(filePath, "utf8");
    const doc = JSON.parse(raw) as { entries?: AgentEntry[] };
    const entries = doc.entries ?? [];
    this.registerAll(entries);
    return entries.length;
  }

  private validate(entry: AgentEntry): void {
    if (!entry.name || entry.name.trim() === "") throw new Error("AgentEntry.name required");
    if (!entry.category) throw new Error("AgentEntry.category required");
    if (!entry.description || entry.description.trim() === "") throw new Error("AgentEntry.description required");
    if (!Array.isArray(entry.triggers) || entry.triggers.length === 0) {
      throw new Error("AgentEntry.triggers must be a non-empty array");
    }
    if (!["low", "medium", "high"].includes(entry.costTier)) {
      throw new Error(`AgentEntry.costTier must be low/medium/high, got ${entry.costTier}`);
    }
  }

  private multiWordHit(prompt: string, trigger: string): boolean {
    if (!trigger.includes(" ")) return false;
    return prompt.toLowerCase().includes(trigger);
  }
}

export const agentRegistryEngine = new AgentRegistryEngine();
