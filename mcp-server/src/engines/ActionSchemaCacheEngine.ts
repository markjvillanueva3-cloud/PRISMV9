/**
 * ActionSchemaCacheEngine — Cached action parameter schemas
 *
 * Scans dispatchers to extract action parameter patterns from switch
 * cases, caching them so the AI knows what params each action expects
 * without reading full dispatcher source files.
 *
 * Token savings: Eliminates need to read 500+ line dispatcher files
 * just to discover an action's parameters.
 *
 * @version 1.0.0
 */

import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { log } from "../utils/Logger.js";

const DISPATCHERS_DIR = join(import.meta.dirname, "../tools/dispatchers");

export interface ActionSchema {
  action: string;
  dispatcher: string;
  params: string[];
  hasOptional: boolean;
}

export interface SchemaSearchResult {
  action: string;
  dispatcher: string;
  params: string[];
  signature: string;
}

export class ActionSchemaCacheEngine {
  private cache: Map<string, ActionSchema> | null = null;
  private lastScan = 0;
  private readonly cacheTTL = 120_000; // 2 minutes

  /**
   * Get schema for a specific action.
   */
  getSchema(actionName: string): ActionSchema | null {
    this.ensureLoaded();
    return this.cache!.get(actionName) || null;
  }

  /**
   * Get schemas matching a query.
   */
  searchSchemas(query: string, max = 10): SchemaSearchResult[] {
    this.ensureLoaded();
    const q = query.toLowerCase();
    const results: SchemaSearchResult[] = [];

    for (const [action, schema] of this.cache!) {
      if (action.includes(q) || schema.dispatcher.includes(q)) {
        results.push({
          action,
          dispatcher: schema.dispatcher,
          params: schema.params,
          signature: `${action}(${schema.params.join(", ")})`,
        });
        if (results.length >= max) break;
      }
    }
    return results;
  }

  /**
   * Get a compact param hint for an action (for inline help).
   */
  getParamHint(actionName: string): string {
    const schema = this.getSchema(actionName);
    if (!schema) return `${actionName}: [unknown action]`;
    if (schema.params.length === 0) return `${actionName}: no params`;
    return `${actionName}(${schema.params.join(", ")})`;
  }

  /**
   * Get all actions for a dispatcher with their params.
   */
  getDispatcherActions(dispatcherName: string): SchemaSearchResult[] {
    this.ensureLoaded();
    const results: SchemaSearchResult[] = [];
    const name = dispatcherName.replace(/Dispatcher$/, "")
      .replace(/\.ts$/, "");

    for (const [action, schema] of this.cache!) {
      if (schema.dispatcher.includes(name)) {
        results.push({
          action,
          dispatcher: schema.dispatcher,
          params: schema.params,
          signature: `${action}(${schema.params.join(", ")})`,
        });
      }
    }
    return results;
  }

  /**
   * Get total cached action count.
   */
  getStats(): { actions: number; dispatchers: number; withParams: number } {
    this.ensureLoaded();
    const dispatchers = new Set<string>();
    let withParams = 0;
    for (const schema of this.cache!.values()) {
      dispatchers.add(schema.dispatcher);
      if (schema.params.length > 0) withParams++;
    }
    return {
      actions: this.cache!.size,
      dispatchers: dispatchers.size,
      withParams,
    };
  }

  /**
   * Force cache refresh.
   */
  invalidate(): void {
    this.cache = null;
    this.lastScan = 0;
  }

  // ── Private ──────────────────────────────────────────────────

  private ensureLoaded(): void {
    if (this.cache && Date.now() - this.lastScan < this.cacheTTL) return;
    this.scan();
  }

  private scan(): void {
    const cache = new Map<string, ActionSchema>();

    try {
      const files = readdirSync(DISPATCHERS_DIR).filter(f => f.endsWith(".ts"));

      for (const file of files) {
        const content = readFileSync(join(DISPATCHERS_DIR, file), "utf-8");
        const dispName = file.replace(".ts", "");

        // Find case blocks and extract param usage
        const caseRegex = /case\s+"([^"]+)":\s*\{([\s\S]*?)(?:return\s|break\s)/g;
        let match;

        while ((match = caseRegex.exec(content)) !== null) {
          const action = match[1];
          const body = match[2];
          const params = this.extractParams(body);

          cache.set(action, {
            action,
            dispatcher: dispName,
            params,
            hasOptional: body.includes("|| ") || body.includes("?? "),
          });
        }
      }
    } catch (e: any) {
      log.warn(`[ActionSchemaCache] Scan failed: ${e.message}`);
    }

    this.cache = cache;
    this.lastScan = Date.now();
    log.info(`[ActionSchemaCache] Cached ${cache.size} action schemas`);
  }

  private extractParams(caseBody: string): string[] {
    const params = new Set<string>();

    // Match params.X or params["X"] patterns
    const dotRegex = /params\.(\w+)/g;
    const bracketRegex = /params\["([^"]+)"\]/g;
    const bracketRegex2 = /params\['([^']+)'\]/g;

    let m;
    while ((m = dotRegex.exec(caseBody)) !== null) {
      if (m[1] !== "length" && m[1] !== "toString") {
        params.add(m[1]);
      }
    }
    while ((m = bracketRegex.exec(caseBody)) !== null) params.add(m[1]);
    while ((m = bracketRegex2.exec(caseBody)) !== null) params.add(m[1]);

    return Array.from(params).sort();
  }
}

export const actionSchemaCacheEngine = new ActionSchemaCacheEngine();
