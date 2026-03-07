/**
 * ToolRouterEngine — Intent-based tool routing for token efficiency
 *
 * Maps natural-language intents to the most efficient tool/action path.
 * Prevents wasted dispatcher calls by recommending the shortest path
 * to the answer (e.g., use QuickCalcEngine directly instead of going
 * through calcDispatcher for simple RPM calculations).
 *
 * Token savings: Eliminates trial-and-error tool exploration.
 *
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

export interface RouteResult {
  /** Recommended approach */
  route: string;
  /** Engine or dispatcher to use */
  target: string;
  /** Specific action or method */
  action: string;
  /** Parameters hint */
  params?: string;
  /** Why this route was chosen */
  reason: string;
  /** Estimated token cost (lower is better) */
  estimatedTokens: number;
}

interface RoutePattern {
  keywords: string[];
  route: string;
  target: string;
  action: string;
  params?: string;
  reason: string;
  estimatedTokens: number;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  // Quick calculations — use QuickCalcEngine directly
  { keywords: ["rpm", "spindle speed", "surface speed to rpm"], route: "direct", target: "QuickCalcEngine", action: "rpm(sfm, diameter, metric?)", reason: "Direct calc, no dispatcher overhead", estimatedTokens: 50 },
  { keywords: ["feed rate", "feedrate", "ipm", "feed per tooth"], route: "direct", target: "QuickCalcEngine", action: "feedRate(rpm, chipLoad, flutes, metric?)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["mrr", "material removal", "removal rate"], route: "direct", target: "QuickCalcEngine", action: "mrr(woc, doc, feedRate, metric?)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["chip load", "chipload"], route: "direct", target: "QuickCalcEngine", action: "chipLoad(feedRate, rpm, flutes)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["tap drill", "tapping drill"], route: "direct", target: "QuickCalcEngine", action: "tapDrill(majorDia, pitch)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["scallop", "cusp height", "ball nose finish"], route: "direct", target: "QuickCalcEngine", action: "scallopHeight(toolRadius, stepover)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["cutting time", "machining time", "cycle time estimate"], route: "direct", target: "QuickCalcEngine", action: "cuttingTime(distance, feedRate)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["horsepower", "cutting power", "hp required"], route: "direct", target: "QuickCalcEngine", action: "cuttingPower(mrr, material)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["thread pitch", "tpi to metric"], route: "direct", target: "QuickCalcEngine", action: "threadPitch(tpi)", reason: "Direct calc", estimatedTokens: 50 },

  // System info — use snapshot engines
  { keywords: ["system status", "how many engines", "system counts"], route: "direct", target: "SystemSnapshotEngine", action: "getCompactSnapshot()", reason: "Cached snapshot, ~100 tokens", estimatedTokens: 100 },
  { keywords: ["what changed", "recent changes", "delta"], route: "direct", target: "SessionDeltaEngine", action: "getRecentActivity(hours)", reason: "Git-based delta", estimatedTokens: 150 },
  { keywords: ["drift", "count mismatch", "docs outdated"], route: "direct", target: "SystemSnapshotEngine", action: "getDriftReport()", reason: "Cached drift check", estimatedTokens: 200 },

  // Action discovery — use DispatcherMapEngine
  { keywords: ["find action", "which dispatcher", "action search", "what actions"], route: "direct", target: "DispatcherMapEngine", action: "searchActions(query) or findAction(name)", reason: "Cached action index", estimatedTokens: 100 },
  { keywords: ["dispatcher list", "all dispatchers", "dispatcher map"], route: "direct", target: "DispatcherMapEngine", action: "getCompactMap()", reason: "Cached map", estimatedTokens: 200 },

  // Material lookup — use materialDispatcher
  { keywords: ["material properties", "material lookup", "hardness", "tensile strength"], route: "dispatcher", target: "materialDispatcher", action: "material_lookup", reason: "Full material DB query", estimatedTokens: 300 },
  { keywords: ["material strategy", "speed and feed for", "cutting parameters for"], route: "dispatcher", target: "strategyDispatcher", action: "strategy_recommend", reason: "Strategy DB with 66 material-op combos", estimatedTokens: 400 },

  // Tool selection
  { keywords: ["tool selection", "which end mill", "tool recommend", "cutter for"], route: "dispatcher", target: "toolDispatcher", action: "tool_recommend", reason: "Tool catalog search", estimatedTokens: 400 },

  // Batch operations
  { keywords: ["batch", "multiple actions", "bulk query"], route: "direct", target: "BatchQueryEngine", action: "executeBatch(actions[])", reason: "N actions in 1 call", estimatedTokens: 100 },
];

export class ToolRouterEngine {
  /**
   * Route an intent to the most token-efficient path.
   */
  route(intent: string): RouteResult[] {
    const q = intent.toLowerCase();
    const matches: Array<RoutePattern & { score: number }> = [];

    for (const pattern of ROUTE_PATTERNS) {
      let score = 0;
      for (const kw of pattern.keywords) {
        if (q.includes(kw)) {
          score += kw.length; // Longer keyword matches = higher confidence
        }
      }
      if (score > 0) {
        matches.push({ ...pattern, score });
      }
    }

    // Sort by score desc, then by estimated tokens asc
    matches.sort((a, b) => b.score - a.score || a.estimatedTokens - b.estimatedTokens);

    const results = matches.slice(0, 3).map(m => ({
      route: m.route,
      target: m.target,
      action: m.action,
      params: m.params,
      reason: m.reason,
      estimatedTokens: m.estimatedTokens,
    }));

    if (results.length === 0) {
      log.debug(`[ToolRouter] No route found for: ${intent}`);
    }

    return results;
  }

  /**
   * Get the single best route for an intent.
   */
  bestRoute(intent: string): RouteResult | null {
    const routes = this.route(intent);
    return routes[0] || null;
  }

  /**
   * Get all registered route patterns (for debugging/discovery).
   */
  getPatterns(): Array<{ keywords: string[]; target: string; action: string }> {
    return ROUTE_PATTERNS.map(p => ({
      keywords: p.keywords,
      target: p.target,
      action: p.action,
    }));
  }

  /**
   * Get pattern count.
   */
  getStats(): { patterns: number; targets: number; avgTokens: number } {
    const targets = new Set(ROUTE_PATTERNS.map(p => p.target));
    const avgTokens = Math.round(
      ROUTE_PATTERNS.reduce((sum, p) => sum + p.estimatedTokens, 0) / ROUTE_PATTERNS.length
    );
    return { patterns: ROUTE_PATTERNS.length, targets: targets.size, avgTokens };
  }
}

export const toolRouterEngine = new ToolRouterEngine();
