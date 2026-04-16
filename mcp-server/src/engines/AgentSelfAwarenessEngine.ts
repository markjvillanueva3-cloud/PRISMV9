/**
 * AgentSelfAwarenessEngine — Unified PRISM Self-Awareness
 *
 * AGENT ROADMAP: U-AGT03 (MS1)
 *
 * Combines CapabilityIndexEngine and EngineDigestEngine to provide
 * complete self-awareness of PRISM's capabilities. This is the
 * foundation for the internal AI agent's knowledge of itself.
 *
 * Features:
 * - Unified view of dispatchers + engines
 * - Cross-referencing between actions and engines
 * - Capability summaries for context injection
 * - System health and statistics
 *
 * @module engines/AgentSelfAwarenessEngine
 */

import {
  capabilityIndexEngine,
  DispatcherCapability,
} from "./CapabilityIndexEngine.js";
import {
  engineDigestEngine,
  EngineDigest,
} from "./EngineDigestEngine.js";

/**
 * Complete system awareness summary
 */
export interface SystemAwareness {
  /** Summary statistics */
  stats: {
    dispatchers: number;
    actions: number;
    engines: number;
    totalLoc: number;
    categories: string[];
  };
  /** Top capabilities by category */
  topCapabilities: {
    category: string;
    count: number;
    examples: string[];
  }[];
  /** Top engines by size */
  topEngines: {
    name: string;
    loc: number;
    methods: number;
    category: string;
  }[];
  /** Last refresh timestamp */
  refreshedAt: Date;
}

/**
 * Unified search result
 */
export interface UnifiedSearchResult {
  type: "capability" | "engine";
  name: string;
  description: string;
  category: string;
  score: number;
  details: DispatcherCapability | EngineDigest;
}

/**
 * Context injection summary for LLM prompts
 */
export interface ContextSummary {
  /** One-line system description */
  oneLiner: string;
  /** Paragraph summary */
  paragraph: string;
  /** Bullet points of key capabilities */
  bullets: string[];
  /** Token-efficient capability list */
  compactList: string;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * AgentSelfAwarenessEngine — The agent's knowledge of itself
 */
export class AgentSelfAwarenessEngine {
  private awareness: SystemAwareness | null = null;
  private lastRefresh: Date | null = null;
  private refreshIntervalMs = 5 * 60 * 1000;

  /**
   * Build complete system awareness
   */
  async buildAwareness(forceRefresh = false): Promise<SystemAwareness> {
    if (
      this.awareness &&
      !forceRefresh &&
      this.lastRefresh &&
      Date.now() - this.lastRefresh.getTime() < this.refreshIntervalMs
    ) {
      return this.awareness;
    }

    const [capStats, engStats] = await Promise.all([
      capabilityIndexEngine.getStats(),
      engineDigestEngine.getStats(),
    ]);

    // Build top capabilities by category
    const topCapabilities: SystemAwareness["topCapabilities"] = [];
    for (const [category, count] of Object.entries(capStats.byCategory)) {
      const caps = await capabilityIndexEngine.getByCategory(category);
      topCapabilities.push({
        category,
        count,
        examples: caps.slice(0, 3).map((c) => c.fullPath),
      });
    }
    topCapabilities.sort((a, b) => b.count - a.count);

    // Build top engines
    const topEngines = engStats.topByLoc.map((e) => {
      const engine = engineDigestEngine
        .getAll()
        .then((all) => all.find((eng) => eng.className === e.name));
      return {
        name: e.name,
        loc: e.loc,
        methods: engStats.topByMethods.find((m) => m.name === e.name)?.methods || 0,
        category: "physics", // Will be filled in
      };
    });

    // Merge categories
    const allCategories = [
      ...new Set([...capStats.categories, ...engStats.categories]),
    ];

    this.awareness = {
      stats: {
        dispatchers: capStats.dispatcherCount,
        actions: capStats.actionCount,
        engines: engStats.engineCount,
        totalLoc: engStats.totalLoc,
        categories: allCategories,
      },
      topCapabilities: topCapabilities.slice(0, 10),
      topEngines,
      refreshedAt: new Date(),
    };

    this.lastRefresh = new Date();
    return this.awareness;
  }

  /**
   * Unified search across capabilities and engines
   */
  async search(query: string, limit = 20): Promise<UnifiedSearchResult[]> {
    const [capResults, engResults] = await Promise.all([
      capabilityIndexEngine.search(query, limit),
      engineDigestEngine.search(query, limit),
    ]);

    const results: UnifiedSearchResult[] = [];

    // Add capability results
    for (const r of capResults) {
      results.push({
        type: "capability",
        name: r.capability.fullPath,
        description: r.capability.description,
        category: r.capability.category,
        score: r.score,
        details: r.capability,
      });
    }

    // Add engine results
    for (const r of engResults) {
      results.push({
        type: "engine",
        name: r.engine.className,
        description: r.engine.description,
        category: r.engine.category,
        score: r.score,
        details: r.engine,
      });
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Generate context summary for LLM injection
   */
  async getContextSummary(maxTokens = 500): Promise<ContextSummary> {
    const awareness = await this.buildAwareness();

    const oneLiner = `PRISM: ${awareness.stats.dispatchers} dispatchers, ${awareness.stats.actions} actions, ${awareness.stats.engines} engines, ${awareness.stats.totalLoc.toLocaleString()} LOC`;

    const paragraph = `PRISM is a manufacturing intelligence platform with ${awareness.stats.dispatchers} dispatchers exposing ${awareness.stats.actions} MCP actions. It contains ${awareness.stats.engines} calculation engines totaling ${awareness.stats.totalLoc.toLocaleString()} lines of code. Key domains: ${awareness.stats.categories.slice(0, 5).join(", ")}.`;

    const bullets = [
      `${awareness.stats.dispatchers} dispatchers (MCP tools)`,
      `${awareness.stats.actions} actions (callable methods)`,
      `${awareness.stats.engines} engines (${awareness.stats.totalLoc.toLocaleString()} LOC)`,
      `Categories: ${awareness.stats.categories.slice(0, 8).join(", ")}`,
      `Top engines: ${awareness.topEngines.slice(0, 3).map((e) => e.name).join(", ")}`,
    ];

    // Build compact list for token efficiency
    const compactList = this.buildCompactList(awareness, maxTokens);

    // Estimate tokens (rough: 4 chars = 1 token)
    const estimatedTokens = Math.ceil(
      (oneLiner.length + paragraph.length + bullets.join("").length) / 4
    );

    return {
      oneLiner,
      paragraph,
      bullets,
      compactList,
      estimatedTokens,
    };
  }

  /**
   * Build token-efficient capability list
   */
  private buildCompactList(
    awareness: SystemAwareness,
    maxTokens: number
  ): string {
    const lines: string[] = [];
    let currentTokens = 0;
    const tokensPerLine = 15; // Approximate

    for (const cap of awareness.topCapabilities) {
      if (currentTokens + tokensPerLine > maxTokens) break;
      lines.push(`${cap.category}(${cap.count}): ${cap.examples.join(", ")}`);
      currentTokens += tokensPerLine;
    }

    return lines.join("\n");
  }

  /**
   * Get capabilities for a specific domain
   */
  async getCapabilitiesForDomain(
    domain: string
  ): Promise<{
    actions: DispatcherCapability[];
    engines: EngineDigest[];
  }> {
    const [actions, engines] = await Promise.all([
      capabilityIndexEngine.getByCategory(domain),
      engineDigestEngine.getByCategory(domain),
    ]);

    return { actions, engines };
  }

  /**
   * Find the best tool for a task description
   */
  async findToolForTask(
    taskDescription: string
  ): Promise<UnifiedSearchResult[]> {
    return this.search(taskDescription, 5);
  }

  /**
   * Get system health check
   */
  async getHealthCheck(): Promise<{
    healthy: boolean;
    dispatchers: { count: number; status: "ok" | "low" };
    actions: { count: number; status: "ok" | "low" };
    engines: { count: number; status: "ok" | "low" };
    issues: string[];
  }> {
    const awareness = await this.buildAwareness();
    const issues: string[] = [];

    const dispatcherStatus =
      awareness.stats.dispatchers >= 50 ? "ok" : "low";
    const actionStatus = awareness.stats.actions >= 1000 ? "ok" : "low";
    const engineStatus = awareness.stats.engines >= 500 ? "ok" : "low";

    if (dispatcherStatus === "low") {
      issues.push(
        `Low dispatcher count: ${awareness.stats.dispatchers} (expected 50+)`
      );
    }
    if (actionStatus === "low") {
      issues.push(
        `Low action count: ${awareness.stats.actions} (expected 1000+)`
      );
    }
    if (engineStatus === "low") {
      issues.push(
        `Low engine count: ${awareness.stats.engines} (expected 500+)`
      );
    }

    return {
      healthy: issues.length === 0,
      dispatchers: { count: awareness.stats.dispatchers, status: dispatcherStatus },
      actions: { count: awareness.stats.actions, status: actionStatus },
      engines: { count: awareness.stats.engines, status: engineStatus },
      issues,
    };
  }

  /**
   * Get quick stats for display
   */
  async getQuickStats(): Promise<{
    dispatchers: number;
    actions: number;
    engines: number;
    loc: string;
    categories: number;
  }> {
    const awareness = await this.buildAwareness();
    return {
      dispatchers: awareness.stats.dispatchers,
      actions: awareness.stats.actions,
      engines: awareness.stats.engines,
      loc: `${Math.round(awareness.stats.totalLoc / 1000)}K`,
      categories: awareness.stats.categories.length,
    };
  }

  /**
   * Refresh all indexes
   */
  async refresh(): Promise<SystemAwareness> {
    await Promise.all([
      capabilityIndexEngine.refresh(),
      engineDigestEngine.refresh(),
    ]);
    return this.buildAwareness(true);
  }

  /**
   * Get recommended actions for a manufacturing task
   */
  async getRecommendedActions(task: string): Promise<{
    recommended: DispatcherCapability[];
    reasoning: string;
  }> {
    const results = await capabilityIndexEngine.search(task, 10);

    if (results.length === 0) {
      return {
        recommended: [],
        reasoning: `No specific actions found for "${task}". Try searching with different terms.`,
      };
    }

    const recommended = results.map((r) => r.capability);
    const topCategories = [
      ...new Set(recommended.map((r) => r.category)),
    ].slice(0, 3);

    return {
      recommended,
      reasoning: `Found ${results.length} relevant actions in categories: ${topCategories.join(", ")}. Top match: ${recommended[0].fullPath}`,
    };
  }
}

// Export singleton
export const agentSelfAwarenessEngine = new AgentSelfAwarenessEngine();
