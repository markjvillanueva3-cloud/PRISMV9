/**
 * CapabilityIndexEngine — Live Dispatcher Introspection
 *
 * AGENT ROADMAP: U-AGT01 (MS1)
 *
 * Introspects all PRISM dispatchers at runtime, extracts action schemas,
 * and builds a searchable capability index. No hardcoded lists — always
 * live from source for self-awareness.
 *
 * Features:
 * - Live introspection of 83 dispatchers
 * - Action schema extraction
 * - Semantic search over capabilities
 * - Automatic refresh on build
 *
 * @module engines/CapabilityIndexEngine
 */

import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";

/**
 * Represents a single dispatcher capability
 */
export interface DispatcherCapability {
  /** Dispatcher name (e.g., "aiReasoningDispatcher") */
  dispatcherName: string;
  /** MCP tool name (e.g., "prism_ai") */
  toolName: string;
  /** Action name (e.g., "speed_feed") */
  action: string;
  /** Full action path (e.g., "prism_ai:speed_feed") */
  fullPath: string;
  /** Action description from JSDoc or comments */
  description: string;
  /** Category extracted from dispatcher grouping */
  category: string;
  /** Effort tier: quick (<100ms), standard (<1s), intensive (<10s) */
  effortTier: "quick" | "standard" | "intensive" | "unknown";
}

/**
 * Represents the full capability index
 */
export interface CapabilityIndex {
  /** Total number of dispatchers */
  dispatcherCount: number;
  /** Total number of actions */
  actionCount: number;
  /** Map of toolName to actions */
  byTool: Map<string, DispatcherCapability[]>;
  /** Map of category to actions */
  byCategory: Map<string, DispatcherCapability[]>;
  /** Flat list of all capabilities */
  all: DispatcherCapability[];
  /** Index build timestamp */
  builtAt: Date;
  /** Source directory */
  sourceDir: string;
}

/**
 * Search result with relevance score
 */
export interface CapabilitySearchResult {
  capability: DispatcherCapability;
  score: number;
  matchedOn: ("action" | "description" | "tool" | "category")[];
}

/**
 * CapabilityIndexEngine — Live self-awareness of PRISM capabilities
 */
export class CapabilityIndexEngine {
  private index: CapabilityIndex | null = null;
  private dispatcherDir: string;
  private lastRefresh: Date | null = null;
  private refreshIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor(dispatcherDir?: string) {
    // Default to relative path from engine location
    this.dispatcherDir =
      dispatcherDir ||
      join(process.cwd(), "src", "tools", "dispatchers");
  }

  /**
   * Build the capability index from dispatcher source files
   */
  async buildIndex(forceRefresh = false): Promise<CapabilityIndex> {
    // Return cached if recent enough and not forced
    if (
      this.index &&
      !forceRefresh &&
      this.lastRefresh &&
      Date.now() - this.lastRefresh.getTime() < this.refreshIntervalMs
    ) {
      return this.index;
    }

    const files = await readdir(this.dispatcherDir);
    const dispatcherFiles = files.filter(
      (f) => f.endsWith("Dispatcher.ts") && !f.startsWith("index")
    );

    const byTool = new Map<string, DispatcherCapability[]>();
    const byCategory = new Map<string, DispatcherCapability[]>();
    const all: DispatcherCapability[] = [];

    for (const file of dispatcherFiles) {
      const filePath = join(this.dispatcherDir, file);
      const content = await readFile(filePath, "utf-8");
      const capabilities = this.extractCapabilities(file, content);

      for (const cap of capabilities) {
        all.push(cap);

        // Index by tool
        if (!byTool.has(cap.toolName)) {
          byTool.set(cap.toolName, []);
        }
        byTool.get(cap.toolName)!.push(cap);

        // Index by category
        if (!byCategory.has(cap.category)) {
          byCategory.set(cap.category, []);
        }
        byCategory.get(cap.category)!.push(cap);
      }
    }

    this.index = {
      dispatcherCount: dispatcherFiles.length,
      actionCount: all.length,
      byTool,
      byCategory,
      all,
      builtAt: new Date(),
      sourceDir: this.dispatcherDir,
    };

    this.lastRefresh = new Date();
    return this.index;
  }

  /**
   * Extract capabilities from a single dispatcher file
   */
  private extractCapabilities(
    filename: string,
    content: string
  ): DispatcherCapability[] {
    const dispatcherName = basename(filename, ".ts");
    const capabilities: DispatcherCapability[] = [];

    // Extract tool name from JSDoc or function name
    const toolNameMatch = content.match(/Tool:\s*(\w+)/i);
    const toolName = toolNameMatch
      ? toolNameMatch[1]
      : this.inferToolName(dispatcherName);

    // Extract category from dispatcher name
    const category = this.inferCategory(dispatcherName);

    // Extract actions from multiple patterns:

    // Pattern 1: const ACTIONS = ["action1", "action2", ...]
    const actionsArrayMatch = content.match(
      /(?:const|let)\s+ACTIONS\s*=\s*\[([\s\S]*?)\]/
    );
    if (actionsArrayMatch) {
      const actionStrings = actionsArrayMatch[1].match(/"([^"]+)"/g);
      if (actionStrings) {
        for (const actionStr of actionStrings) {
          const action = actionStr.replace(/"/g, "");
          capabilities.push(
            this.createCapability(
              dispatcherName,
              toolName,
              action,
              category,
              content
            )
          );
        }
      }
    }

    // Pattern 2: z.enum(["action1", "action2", ...])
    const enumMatch = content.match(/z\.enum\(\s*\[([\s\S]*?)\]\s*\)/);
    if (enumMatch && !actionsArrayMatch) {
      const actionStrings = enumMatch[1].match(/"([^"]+)"/g);
      if (actionStrings) {
        for (const actionStr of actionStrings) {
          const action = actionStr.replace(/"/g, "");
          capabilities.push(
            this.createCapability(
              dispatcherName,
              toolName,
              action,
              category,
              content
            )
          );
        }
      }
    }

    // Pattern 3: case "action_name": (fallback for switch statements)
    if (capabilities.length === 0) {
      const caseMatches = content.matchAll(/case\s+"([^"]+)":/g);
      for (const match of caseMatches) {
        const action = match[1];
        if (!action.startsWith("_")) {
          // Skip internal actions
          capabilities.push(
            this.createCapability(
              dispatcherName,
              toolName,
              action,
              category,
              content
            )
          );
        }
      }
    }

    return capabilities;
  }

  /**
   * Create a capability object with extracted metadata
   */
  private createCapability(
    dispatcherName: string,
    toolName: string,
    action: string,
    category: string,
    content: string
  ): DispatcherCapability {
    return {
      dispatcherName,
      toolName,
      action,
      fullPath: `${toolName}:${action}`,
      description: this.extractActionDescription(content, action),
      category,
      effortTier: this.inferEffortTier(action, content),
    };
  }

  /**
   * Infer tool name from dispatcher filename
   */
  private inferToolName(dispatcherName: string): string {
    // aiReasoningDispatcher -> prism_ai
    // calcDispatcher -> prism_calc
    const base = dispatcherName.replace(/Dispatcher$/, "");
    return "prism_" + this.toSnakeCase(base);
  }

  /**
   * Infer category from dispatcher name
   */
  private inferCategory(dispatcherName: string): string {
    const name = dispatcherName.toLowerCase();
    if (name.includes("ai") || name.includes("intelligence"))
      return "intelligence";
    if (name.includes("calc") || name.includes("physics")) return "physics";
    if (name.includes("safety") || name.includes("guard")) return "safety";
    if (name.includes("session") || name.includes("context")) return "session";
    if (name.includes("data") || name.includes("knowledge")) return "data";
    if (name.includes("thread") || name.includes("turning")) return "turning";
    if (name.includes("cam") || name.includes("toolpath")) return "cam";
    if (name.includes("valid") || name.includes("quality")) return "quality";
    if (name.includes("business") || name.includes("quote")) return "business";
    if (name.includes("auth") || name.includes("tenant")) return "auth";
    return "general";
  }

  /**
   * Extract action description from comments
   */
  private extractActionDescription(content: string, action: string): string {
    // Look for comment before case statement or in JSDoc
    const patterns = [
      new RegExp(`//\\s*${action}[:\\s-]+([^\\n]+)`, "i"),
      new RegExp(`\\*\\s*${action}[:\\s-]+([^\\n*]+)`, "i"),
      new RegExp(`case\\s+"${action}":[^}]*//\\s*([^\\n]+)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Default description from action name
    return this.actionToDescription(action);
  }

  /**
   * Convert action name to human-readable description
   */
  private actionToDescription(action: string): string {
    return action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  /**
   * Infer effort tier from action name and context
   */
  private inferEffortTier(
    action: string,
    content: string
  ): "quick" | "standard" | "intensive" | "unknown" {
    const actionLower = action.toLowerCase();

    // Quick operations
    if (
      actionLower.includes("get") ||
      actionLower.includes("list") ||
      actionLower.includes("stats") ||
      actionLower.includes("status")
    ) {
      return "quick";
    }

    // Intensive operations
    if (
      actionLower.includes("optimize") ||
      actionLower.includes("simulate") ||
      actionLower.includes("generate") ||
      actionLower.includes("train") ||
      actionLower.includes("batch")
    ) {
      return "intensive";
    }

    // Standard for most others
    if (
      actionLower.includes("calc") ||
      actionLower.includes("validate") ||
      actionLower.includes("analyze")
    ) {
      return "standard";
    }

    return "unknown";
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
  }

  /**
   * Search capabilities by query string
   */
  async search(
    query: string,
    limit = 10
  ): Promise<CapabilitySearchResult[]> {
    const index = await this.buildIndex();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
    const results: CapabilitySearchResult[] = [];

    for (const cap of index.all) {
      const matchedOn: ("action" | "description" | "tool" | "category")[] = [];
      let score = 0;

      // Exact action match (highest score)
      if (cap.action.toLowerCase() === queryLower) {
        score += 100;
        matchedOn.push("action");
      } else if (cap.action.toLowerCase().includes(queryLower)) {
        score += 50;
        matchedOn.push("action");
      }

      // Full path match
      if (cap.fullPath.toLowerCase().includes(queryLower)) {
        score += 40;
        if (!matchedOn.includes("action")) matchedOn.push("action");
      }

      // Tool name match
      if (cap.toolName.toLowerCase().includes(queryLower)) {
        score += 30;
        matchedOn.push("tool");
      }

      // Category match
      if (cap.category.toLowerCase().includes(queryLower)) {
        score += 20;
        matchedOn.push("category");
      }

      // Description match
      const descLower = cap.description.toLowerCase();
      for (const term of queryTerms) {
        if (descLower.includes(term)) {
          score += 10;
          if (!matchedOn.includes("description")) matchedOn.push("description");
        }
      }

      // Action name contains query terms
      const actionLower = cap.action.toLowerCase();
      for (const term of queryTerms) {
        if (actionLower.includes(term)) {
          score += 15;
          if (!matchedOn.includes("action")) matchedOn.push("action");
        }
      }

      if (score > 0) {
        results.push({ capability: cap, score, matchedOn });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Get capabilities by tool name
   */
  async getByTool(toolName: string): Promise<DispatcherCapability[]> {
    const index = await this.buildIndex();
    return index.byTool.get(toolName) || [];
  }

  /**
   * Get capabilities by category
   */
  async getByCategory(category: string): Promise<DispatcherCapability[]> {
    const index = await this.buildIndex();
    return index.byCategory.get(category) || [];
  }

  /**
   * Get summary statistics
   */
  async getStats(): Promise<{
    dispatcherCount: number;
    actionCount: number;
    categories: string[];
    tools: string[];
    byCategory: Record<string, number>;
    byTool: Record<string, number>;
    builtAt: Date;
  }> {
    const index = await this.buildIndex();

    const byCategory: Record<string, number> = {};
    for (const [cat, caps] of index.byCategory) {
      byCategory[cat] = caps.length;
    }

    const byTool: Record<string, number> = {};
    for (const [tool, caps] of index.byTool) {
      byTool[tool] = caps.length;
    }

    return {
      dispatcherCount: index.dispatcherCount,
      actionCount: index.actionCount,
      categories: Array.from(index.byCategory.keys()),
      tools: Array.from(index.byTool.keys()),
      byCategory,
      byTool,
      builtAt: index.builtAt,
    };
  }

  /**
   * Force refresh the index
   */
  async refresh(): Promise<CapabilityIndex> {
    return this.buildIndex(true);
  }

  /**
   * Get all capabilities as flat list
   */
  async getAll(): Promise<DispatcherCapability[]> {
    const index = await this.buildIndex();
    return index.all;
  }

  /**
   * Find capability by exact action path
   */
  async findByPath(fullPath: string): Promise<DispatcherCapability | null> {
    const index = await this.buildIndex();
    return index.all.find((c) => c.fullPath === fullPath) || null;
  }

  /**
   * Get capabilities matching a pattern
   */
  async findByPattern(pattern: RegExp): Promise<DispatcherCapability[]> {
    const index = await this.buildIndex();
    return index.all.filter(
      (c) =>
        pattern.test(c.action) ||
        pattern.test(c.fullPath) ||
        pattern.test(c.description)
    );
  }
}

// Export singleton instance
export const capabilityIndexEngine = new CapabilityIndexEngine();
