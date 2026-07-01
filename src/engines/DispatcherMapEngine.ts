/**
 * DispatcherMapEngine — Complete dispatcher action catalog
 *
 * Scans all dispatchers at runtime and builds a compact action map.
 * Eliminates the need to grep through 54 dispatcher files to find
 * which action to use.
 *
 * Token savings: Replaces /action-search tool calls with cached data.
 *
 * @version 1.0.0
 */

import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const DISPATCHERS_DIR = join(import.meta.dirname, "../tools/dispatchers");

export interface DispatcherInfo {
  name: string;
  file: string;
  actionCount: number;
  actions: string[];
}

export interface ActionSearchResult {
  action: string;
  dispatcher: string;
  file: string;
}

export class DispatcherMapEngine {
  private map: Map<string, DispatcherInfo> | null = null;
  private actionIndex: Map<string, string> | null = null;
  private lastScan = 0;
  private readonly cacheTTL = 60_000; // 1 minute

  /**
   * Get the complete dispatcher map (cached).
   */
  getMap(): DispatcherInfo[] {
    this.ensureLoaded();
    return Array.from(this.map!.values()).sort((a, b) => b.actionCount - a.actionCount);
  }

  /**
   * Get a compact summary of all dispatchers (suitable for context injection).
   * Format: "dispName(N): action1, action2, ... | dispName2(N): ..."
   */
  getCompactMap(maxActionsPerDispatcher = 5): string {
    const dispatchers = this.getMap();
    return dispatchers.map(d => {
      const shown = d.actions.slice(0, maxActionsPerDispatcher);
      const more = d.actions.length > maxActionsPerDispatcher ? ` +${d.actions.length - maxActionsPerDispatcher}` : "";
      return `${d.name}(${d.actionCount}): ${shown.join(", ")}${more}`;
    }).join("\n");
  }

  /**
   * Search for actions matching a query string.
   */
  searchActions(query: string, maxResults = 20): ActionSearchResult[] {
    this.ensureLoaded();
    const q = query.toLowerCase();
    const results: ActionSearchResult[] = [];

    for (const [action, dispatcher] of this.actionIndex!) {
      if (action.includes(q)) {
        results.push({ action, dispatcher, file: `${dispatcher}.ts` });
        if (results.length >= maxResults) break;
      }
    }

    return results;
  }

  /**
   * Find which dispatcher handles a specific action.
   */
  findAction(actionName: string): ActionSearchResult | null {
    this.ensureLoaded();
    const dispatcher = this.actionIndex!.get(actionName);
    if (!dispatcher) return null;
    return { action: actionName, dispatcher, file: `${dispatcher}.ts` };
  }

  /**
   * Get total counts.
   */
  getCounts(): { dispatchers: number; actions: number; avgActions: number } {
    const map = this.getMap();
    const totalActions = map.reduce((sum, d) => sum + d.actionCount, 0);
    return {
      dispatchers: map.length,
      actions: totalActions,
      avgActions: Math.round(totalActions / map.length)
    };
  }

  /**
   * Get top N dispatchers by action count.
   */
  getTopDispatchers(n = 10): Array<{ name: string; actions: number }> {
    return this.getMap().slice(0, n).map(d => ({ name: d.name, actions: d.actionCount }));
  }

  /**
   * Force cache refresh.
   */
  invalidate(): void {
    this.map = null;
    this.actionIndex = null;
    this.lastScan = 0;
  }

  // ── Private ──────────────────────────────────────────────────

  private ensureLoaded(): void {
    if (this.map && Date.now() - this.lastScan < this.cacheTTL) return;
    this.scan();
  }

  private scan(): void {
    const map = new Map<string, DispatcherInfo>();
    const actionIndex = new Map<string, string>();

    try {
      const files = readdirSync(DISPATCHERS_DIR).filter(f => f.endsWith(".ts"));

      for (const file of files) {
        const content = readFileSync(join(DISPATCHERS_DIR, file), "utf-8");
        const actions: string[] = [];
        const regex = /case\s+"([^"]+)"/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const action = match[1];
          if (!actions.includes(action)) {
            actions.push(action);
          }
        }

        const name = file.replace(".ts", "");
        map.set(name, {
          name,
          file,
          actionCount: actions.length,
          actions: actions.sort()
        });

        for (const action of actions) {
          actionIndex.set(action, name);
        }
      }
    } catch (e: any) {
      log.warn(`[DispatcherMap] Scan failed: ${e.message}`);
    }

    this.map = map;
    this.actionIndex = actionIndex;
    this.lastScan = Date.now();
    log.info(`[DispatcherMap] Scanned ${map.size} dispatchers, ${actionIndex.size} actions`);
  }
}

export const dispatcherMapEngine = new DispatcherMapEngine();
