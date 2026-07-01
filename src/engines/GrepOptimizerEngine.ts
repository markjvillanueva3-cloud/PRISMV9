/**
 * GrepOptimizerEngine - Optimizes Grep tool call parameters
 *
 * Analyzes Grep patterns and suggests optimizations: narrower paths,
 * better output modes, appropriate limits. Prevents overly broad
 * searches that waste tokens on irrelevant results.
 *
 * @version 1.0.0
 */

export interface GrepOptimization {
  original: GrepParams;
  optimized: GrepParams;
  suggestions: string[];
  estimatedSavings: number;
}

export interface GrepParams {
  pattern: string;
  path?: string;
  glob?: string;
  output_mode?: string;
  head_limit?: number;
  type?: string;
}

export class GrepOptimizerEngine {
  /**
   * Optimize a Grep call's parameters.
   */
  optimize(params: GrepParams): GrepOptimization {
    const suggestions: string[] = [];
    const optimized = { ...params };
    let savings = 0;

    // 1. No path specified - suggest narrowing
    if (!params.path || params.path === "." || params.path === "./") {
      suggestions.push("Add a specific path to narrow search scope");
      savings += 500;
    }

    // 2. No output mode - default is files_with_matches which is good
    // But if they want content, suggest head_limit
    if (params.output_mode === "content" && !params.head_limit) {
      optimized.head_limit = 20;
      suggestions.push("Add head_limit to cap content output (default: unlimited)");
      savings += 300;
    }

    // 3. No glob filter and searching content
    if (!params.glob && !params.type && params.output_mode === "content") {
      suggestions.push("Add glob or type filter to skip binary/irrelevant files");
      savings += 200;
    }

    // 4. Very broad pattern
    if (params.pattern.length < 3 && !params.pattern.includes("\\")) {
      suggestions.push("Pattern is very short - may match too many results");
      savings += 400;
    }

    // 5. Suggest count mode for existence checks
    if (params.pattern && !params.output_mode) {
      // Default mode is files_with_matches which is already efficient
    }

    // 6. Large context requested
    if (params.output_mode === "content") {
      // Check for excessive context in the params (not directly available but hint)
      suggestions.push("Use files_with_matches first, then Read specific files");
      savings += 200;
    }

    return {
      original: params,
      optimized,
      suggestions,
      estimatedSavings: savings,
    };
  }

  /**
   * Suggest the best output_mode for a use case.
   */
  suggestMode(useCase: string): string {
    const uc = useCase.toLowerCase();
    if (uc.includes("exist") || uc.includes("which file") || uc.includes("find"))
      return "files_with_matches";
    if (uc.includes("count") || uc.includes("how many"))
      return "count";
    if (uc.includes("context") || uc.includes("around") || uc.includes("see the code"))
      return "content";
    return "files_with_matches";
  }

  /**
   * Check if a Grep is likely wasteful.
   */
  isWasteful(params: GrepParams): { wasteful: boolean; reason?: string } {
    if (!params.path && params.output_mode === "content" && !params.head_limit) {
      return {
        wasteful: true,
        reason: "Unbounded content search with no path or limit",
      };
    }
    if (params.pattern === "." || params.pattern === ".*") {
      return {
        wasteful: true,
        reason: "Pattern matches everything - not a useful search",
      };
    }
    if (params.pattern.length === 1 && !params.glob) {
      return {
        wasteful: true,
        reason: "Single-character pattern matches too broadly",
      };
    }
    return { wasteful: false };
  }

  /**
   * Estimate token cost of a Grep result.
   */
  estimateCost(params: GrepParams): number {
    const baseCost = 50; // overhead
    const modeCost: Record<string, number> = {
      files_with_matches: 100,
      count: 30,
      content: 500,
    };
    const mode = params.output_mode ?? "files_with_matches";
    let cost = baseCost + (modeCost[mode] ?? 200);

    if (params.head_limit) {
      cost = Math.min(cost, baseCost + params.head_limit * 20);
    }
    if (!params.path) cost *= 2; // broader search = more results

    return cost;
  }
}

export const grepOptimizerEngine = new GrepOptimizerEngine();
