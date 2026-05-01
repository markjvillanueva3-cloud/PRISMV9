/**
 * EngineRegistryEngine — Lightweight engine capability registry
 *
 * Maps engine names to their key methods and descriptions without
 * needing to read source files. Built from JSDoc/export scanning
 * with manual enrichment for the most important engines.
 *
 * Token savings: Eliminates "what does XEngine do?" file reads.
 *
 * @version 1.0.0
 */

import { readdirSync, readFileSync } from "fs";
import { join, basename, dirname } from "path";
import { log } from "../utils/Logger.js";

const ENGINES_DIR = join(import.meta.dirname, ".");

export interface EngineEntry {
  name: string;
  file: string;
  description: string;
  methods: string[];
  category: string;
  singleton: string | null;
}

export class EngineRegistryEngine {
  private registry: Map<string, EngineEntry> | null = null;
  private lastScan = 0;
  private readonly cacheTTL = 300_000; // 5 minutes

  /**
   * Get all registered engines.
   */
  getAll(): EngineEntry[] {
    this.ensureLoaded();
    return Array.from(this.registry!.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get a specific engine by name.
   */
  get(name: string): EngineEntry | null {
    this.ensureLoaded();
    // Try exact match first
    const entry = this.registry!.get(name);
    if (entry) return entry;

    // Try partial match
    const lower = name.toLowerCase();
    for (const [key, val] of this.registry!) {
      if (key.toLowerCase().includes(lower)) return val;
    }
    return null;
  }

  /**
   * Search engines by keyword.
   */
  search(query: string, max = 10): EngineEntry[] {
    this.ensureLoaded();
    const q = query.toLowerCase();
    const results: EngineEntry[] = [];

    for (const entry of this.registry!.values()) {
      if (
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q) ||
        entry.methods.some(m => m.toLowerCase().includes(q))
      ) {
        results.push(entry);
        if (results.length >= max) break;
      }
    }
    return results;
  }

  /**
   * Get engines by category.
   */
  byCategory(category: string): EngineEntry[] {
    this.ensureLoaded();
    return Array.from(this.registry!.values())
      .filter(e => e.category === category);
  }

  /**
   * Get all categories with counts.
   */
  getCategories(): Record<string, number> {
    const cats: Record<string, number> = {};
    for (const entry of this.getAll()) {
      cats[entry.category] = (cats[entry.category] || 0) + 1;
    }
    return cats;
  }

  /**
   * Get compact listing (name + description only).
   */
  getCompactList(): string {
    return this.getAll()
      .map(e => `${e.name}: ${e.description}`)
      .join("\n");
  }

  /**
   * Get stats.
   */
  getStats(): { total: number; categories: number; withMethods: number } {
    const all = this.getAll();
    return {
      total: all.length,
      categories: Object.keys(this.getCategories()).length,
      withMethods: all.filter(e => e.methods.length > 0).length,
    };
  }

  /**
   * Force refresh.
   */
  invalidate(): void {
    this.registry = null;
    this.lastScan = 0;
  }

  // ── Private ──────────────────────────────────────────────────

  private ensureLoaded(): void {
    if (this.registry && Date.now() - this.lastScan < this.cacheTTL) return;
    this.scan();
  }

  private scan(): void {
    const registry = new Map<string, EngineEntry>();

    try {
      const files = readdirSync(ENGINES_DIR)
        .filter(f => f.endsWith("Engine.ts") && f !== "index.ts");

      for (const file of files) {
        const name = file.replace(".ts", "");
        const content = readFileSync(join(ENGINES_DIR, file), "utf-8");

        const description = this.extractDescription(content);
        const methods = this.extractMethods(content);
        const category = this.categorize(name, content);
        const singleton = this.extractSingleton(content);

        registry.set(name, {
          name,
          file,
          description,
          methods,
          category,
          singleton,
        });
      }
    } catch (e: any) {
      log.warn(`[EngineRegistry] Scan failed: ${e.message}`);
    }

    this.registry = registry;
    this.lastScan = Date.now();
    log.info(`[EngineRegistry] Scanned ${registry.size} engines`);
  }

  private extractDescription(content: string): string {
    // Try JSDoc first line after /**
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(\w[^\n]*)/);
    if (jsdocMatch) {
      return jsdocMatch[1].replace(/\s*—\s*/, " — ").trim();
    }
    return "No description";
  }

  private extractMethods(content: string): string[] {
    const methods: string[] = [];
    const regex = /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const method = match[1];
      if (method !== "constructor" && !method.startsWith("_") &&
          !["ensureLoaded", "scan", "load", "save"].includes(method)) {
        methods.push(method);
      }
    }
    return [...new Set(methods)].slice(0, 10);
  }

  private extractSingleton(content: string): string | null {
    const match = content.match(/export\s+const\s+(\w+)\s*=\s*new\s+\w+/);
    return match ? match[1] : null;
  }

  private categorize(name: string, content: string): string {
    const lower = name.toLowerCase();
    if (lower.includes("calc") || lower.includes("math") || lower.includes("formula")) return "calculation";
    if (lower.includes("material") || lower.includes("alloy")) return "material";
    if (lower.includes("tool") || lower.includes("cutter")) return "tooling";
    if (lower.includes("session") || lower.includes("context") || lower.includes("compact")) return "session";
    if (lower.includes("dispatcher") || lower.includes("action") || lower.includes("router")) return "routing";
    if (lower.includes("cache") || lower.includes("budget") || lower.includes("frequent")) return "optimization";
    if (lower.includes("safety") || lower.includes("guard")) return "safety";
    if (lower.includes("cam") || lower.includes("hyper") || lower.includes("toolpath")) return "cam";
    if (lower.includes("machine") || lower.includes("spindle")) return "machine";
    if (lower.includes("thread") || lower.includes("tap")) return "threading";
    if (lower.includes("test") || lower.includes("validation")) return "validation";
    if (lower.includes("diff") || lower.includes("git") || lower.includes("replay")) return "vcs";
    if (lower.includes("prompt") || lower.includes("template")) return "template";
    if (lower.includes("cost") || lower.includes("quote") || lower.includes("estimate")) return "quoting";
    return "general";
  }
}

export const engineRegistryEngine = new EngineRegistryEngine();
