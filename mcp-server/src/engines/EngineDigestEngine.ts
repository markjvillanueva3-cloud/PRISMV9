/**
 * EngineDigestEngine — Engine Inventory with Semantic Metadata
 *
 * AGENT ROADMAP: U-AGT02 (MS1)
 *
 * Catalogs all PRISM engines with semantic metadata for self-awareness.
 * Extracts LOC, public methods, dependencies, and categorization from source.
 *
 * Features:
 * - Live introspection of 1500+ engine files
 * - Public method extraction
 * - Dependency graph building
 * - Semantic categorization
 *
 * @module engines/EngineDigestEngine
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, basename, relative } from "path";

/**
 * Represents a single engine's metadata
 */
export interface EngineDigest {
  /** Engine filename (e.g., "KienzleForceModel.ts") */
  filename: string;
  /** Engine class name (e.g., "KienzleForceModel") */
  className: string;
  /** Relative path from engines directory */
  relativePath: string;
  /** Lines of code */
  loc: number;
  /** Number of public methods */
  publicMethods: number;
  /** List of public method names */
  methodNames: string[];
  /** Imported engines (dependencies) */
  dependencies: string[];
  /** Category based on name/content */
  category: string;
  /** Subcategory for more specific grouping */
  subcategory: string;
  /** Brief description from JSDoc */
  description: string;
  /** Whether it exports a singleton */
  hasSingleton: boolean;
  /** Last modified timestamp */
  modifiedAt: Date;
}

/**
 * Full engine inventory
 */
export interface EngineInventory {
  /** Total engine count */
  engineCount: number;
  /** Total lines of code */
  totalLoc: number;
  /** Engines by category */
  byCategory: Map<string, EngineDigest[]>;
  /** Engines by subcategory */
  bySubcategory: Map<string, EngineDigest[]>;
  /** All engines */
  all: EngineDigest[];
  /** Dependency graph: engine -> engines it imports */
  dependencyGraph: Map<string, string[]>;
  /** Reverse dependency graph: engine -> engines that import it */
  reverseDependencies: Map<string, string[]>;
  /** Build timestamp */
  builtAt: Date;
}

/**
 * Engine search result
 */
export interface EngineSearchResult {
  engine: EngineDigest;
  score: number;
  matchedOn: string[];
}

/**
 * EngineDigestEngine — Self-awareness of PRISM engine inventory
 */
export class EngineDigestEngine {
  private inventory: EngineInventory | null = null;
  private engineDir: string;
  private lastRefresh: Date | null = null;
  private refreshIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor(engineDir?: string) {
    this.engineDir = engineDir || join(process.cwd(), "src", "engines");
  }

  /**
   * Build the engine inventory from source files
   */
  async buildInventory(forceRefresh = false): Promise<EngineInventory> {
    if (
      this.inventory &&
      !forceRefresh &&
      this.lastRefresh &&
      Date.now() - this.lastRefresh.getTime() < this.refreshIntervalMs
    ) {
      return this.inventory;
    }

    const engineFiles = await this.findEngineFiles(this.engineDir);
    const byCategory = new Map<string, EngineDigest[]>();
    const bySubcategory = new Map<string, EngineDigest[]>();
    const all: EngineDigest[] = [];
    const dependencyGraph = new Map<string, string[]>();
    let totalLoc = 0;

    for (const filePath of engineFiles) {
      const content = await readFile(filePath, "utf-8");
      const fileStats = await stat(filePath);
      const digest = this.extractDigest(
        filePath,
        content,
        fileStats.mtime
      );

      all.push(digest);
      totalLoc += digest.loc;
      dependencyGraph.set(digest.className, digest.dependencies);

      // Index by category
      if (!byCategory.has(digest.category)) {
        byCategory.set(digest.category, []);
      }
      byCategory.get(digest.category)!.push(digest);

      // Index by subcategory
      if (!bySubcategory.has(digest.subcategory)) {
        bySubcategory.set(digest.subcategory, []);
      }
      bySubcategory.get(digest.subcategory)!.push(digest);
    }

    // Build reverse dependency graph
    const reverseDependencies = new Map<string, string[]>();
    for (const [engine, deps] of dependencyGraph) {
      for (const dep of deps) {
        if (!reverseDependencies.has(dep)) {
          reverseDependencies.set(dep, []);
        }
        reverseDependencies.get(dep)!.push(engine);
      }
    }

    this.inventory = {
      engineCount: all.length,
      totalLoc,
      byCategory,
      bySubcategory,
      all,
      dependencyGraph,
      reverseDependencies,
      builtAt: new Date(),
    };

    this.lastRefresh = new Date();
    return this.inventory;
  }

  /**
   * Recursively find all engine files
   */
  private async findEngineFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip test directories and hidden dirs
        if (
          !entry.name.startsWith("__") &&
          !entry.name.startsWith(".")
        ) {
          const subFiles = await this.findEngineFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        // Include TypeScript files that look like engines
        if (this.isEngineFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Check if a file is likely an engine
   */
  private isEngineFile(filename: string): boolean {
    // Skip test files, index files, and type definitions
    if (
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename === "index.ts" ||
      filename.endsWith(".d.ts")
    ) {
      return false;
    }

    // Include files ending in Engine, Model, Calculator, Validator, etc.
    const enginePatterns = [
      /Engine\.ts$/,
      /Model\.ts$/,
      /Calculator\.ts$/,
      /Validator\.ts$/,
      /Analyzer\.ts$/,
      /Builder\.ts$/,
      /Manager\.ts$/,
      /Registry\.ts$/,
      /Handler\.ts$/,
      /Service\.ts$/,
      /Orchestrator\.ts$/,
      /Pipeline\.ts$/,
    ];

    return enginePatterns.some((p) => p.test(filename));
  }

  /**
   * Extract metadata from engine source
   */
  private extractDigest(
    filePath: string,
    content: string,
    modifiedAt: Date
  ): EngineDigest {
    const filename = basename(filePath);
    const relativePath = relative(this.engineDir, filePath);
    const lines = content.split("\n");
    const loc = lines.filter(
      (l) => l.trim() && !l.trim().startsWith("//")
    ).length;

    // Extract class name
    const classMatch = content.match(
      /(?:export\s+)?class\s+(\w+)/
    );
    const className = classMatch ? classMatch[1] : filename.replace(".ts", "");

    // Extract public methods
    const methodNames = this.extractPublicMethods(content);

    // Extract dependencies (imported engines)
    const dependencies = this.extractDependencies(content);

    // Categorize
    const { category, subcategory } = this.categorize(
      className,
      content
    );

    // Extract description from JSDoc
    const description = this.extractDescription(content);

    // Check for singleton export
    const hasSingleton =
      /export\s+const\s+\w+\s*=\s*new\s+\w+/.test(content);

    return {
      filename,
      className,
      relativePath,
      loc,
      publicMethods: methodNames.length,
      methodNames,
      dependencies,
      category,
      subcategory,
      description,
      hasSingleton,
      modifiedAt,
    };
  }

  /**
   * Extract public method names
   */
  private extractPublicMethods(content: string): string[] {
    const methods: string[] = [];

    // Match method declarations: async methodName( or methodName(
    const methodPattern =
      /(?:async\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
    let match;

    while ((match = methodPattern.exec(content)) !== null) {
      const methodName = match[1];
      // Skip constructors and private methods
      if (
        methodName !== "constructor" &&
        !methodName.startsWith("_") &&
        !methodName.startsWith("#")
      ) {
        methods.push(methodName);
      }
    }

    return [...new Set(methods)]; // Dedupe
  }

  /**
   * Extract imported engine dependencies
   */
  private extractDependencies(content: string): string[] {
    const deps: string[] = [];

    // Match imports from engines directory
    const importPattern =
      /import\s+(?:\{[^}]+\}|[^;]+)\s+from\s+["']\.\.?\/(?:engines\/)?(\w+)/g;
    let match;

    while ((match = importPattern.exec(content)) !== null) {
      const depName = match[1];
      if (depName && !depName.startsWith("_")) {
        deps.push(depName);
      }
    }

    return [...new Set(deps)];
  }

  /**
   * Categorize engine based on name and content
   */
  private categorize(
    className: string,
    content: string
  ): { category: string; subcategory: string } {
    const nameLower = className.toLowerCase();
    const contentLower = content.toLowerCase();

    // Physics & Force
    if (
      nameLower.includes("force") ||
      nameLower.includes("kienzle") ||
      nameLower.includes("cutting")
    ) {
      return { category: "physics", subcategory: "force" };
    }

    // Thermal
    if (
      nameLower.includes("thermal") ||
      nameLower.includes("temperature") ||
      nameLower.includes("heat")
    ) {
      return { category: "physics", subcategory: "thermal" };
    }

    // Vibration & Stability
    if (
      nameLower.includes("chatter") ||
      nameLower.includes("vibration") ||
      nameLower.includes("stability")
    ) {
      return { category: "physics", subcategory: "stability" };
    }

    // Deflection
    if (nameLower.includes("deflection") || nameLower.includes("bending")) {
      return { category: "physics", subcategory: "deflection" };
    }

    // Tool Life & Wear
    if (
      nameLower.includes("wear") ||
      nameLower.includes("life") ||
      nameLower.includes("taylor")
    ) {
      return { category: "physics", subcategory: "wear" };
    }

    // Surface Finish
    if (nameLower.includes("surface") || nameLower.includes("roughness")) {
      return { category: "physics", subcategory: "surface" };
    }

    // Speed & Feed
    if (
      nameLower.includes("speed") ||
      nameLower.includes("feed") ||
      nameLower.includes("sfm")
    ) {
      return { category: "machining", subcategory: "speedfeed" };
    }

    // Thread
    if (nameLower.includes("thread")) {
      return { category: "machining", subcategory: "threading" };
    }

    // Turning
    if (nameLower.includes("turn") || nameLower.includes("lathe")) {
      return { category: "machining", subcategory: "turning" };
    }

    // Milling
    if (nameLower.includes("mill") || nameLower.includes("face")) {
      return { category: "machining", subcategory: "milling" };
    }

    // Grinding
    if (nameLower.includes("grind")) {
      return { category: "machining", subcategory: "grinding" };
    }

    // EDM
    if (nameLower.includes("edm") || nameLower.includes("electrode")) {
      return { category: "machining", subcategory: "edm" };
    }

    // CAM & Toolpath
    if (
      nameLower.includes("toolpath") ||
      nameLower.includes("cam") ||
      nameLower.includes("post")
    ) {
      return { category: "cam", subcategory: "toolpath" };
    }

    // CAD
    if (nameLower.includes("cad") || nameLower.includes("geometry")) {
      return { category: "cam", subcategory: "cad" };
    }

    // Safety
    if (nameLower.includes("safety") || nameLower.includes("guard")) {
      return { category: "safety", subcategory: "validation" };
    }

    // Quality
    if (
      nameLower.includes("quality") ||
      nameLower.includes("spc") ||
      nameLower.includes("metrology")
    ) {
      return { category: "quality", subcategory: "spc" };
    }

    // Business
    if (
      nameLower.includes("quote") ||
      nameLower.includes("cost") ||
      nameLower.includes("pricing")
    ) {
      return { category: "business", subcategory: "quoting" };
    }

    // AI & Intelligence
    if (
      nameLower.includes("llm") ||
      nameLower.includes("intelligence") ||
      nameLower.includes("reasoning")
    ) {
      return { category: "ai", subcategory: "reasoning" };
    }

    // Memory
    if (nameLower.includes("memory") || nameLower.includes("context")) {
      return { category: "ai", subcategory: "memory" };
    }

    // Registry
    if (nameLower.includes("registry") || nameLower.includes("catalog")) {
      return { category: "data", subcategory: "registry" };
    }

    return { category: "general", subcategory: "utility" };
  }

  /**
   * Extract description from JSDoc
   */
  private extractDescription(content: string): string {
    // Match first JSDoc block
    const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\*\//);
    if (jsdocMatch) {
      // Get first line of description
      const lines = jsdocMatch[1]
        .split("\n")
        .map((l) => l.replace(/^\s*\*\s?/, "").trim())
        .filter((l) => l && !l.startsWith("@"));

      if (lines.length > 0) {
        return lines[0].slice(0, 200); // Limit length
      }
    }

    return "No description available";
  }

  /**
   * Search engines by query
   */
  async search(query: string, limit = 20): Promise<EngineSearchResult[]> {
    const inventory = await this.buildInventory();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
    const results: EngineSearchResult[] = [];

    for (const engine of inventory.all) {
      const matchedOn: string[] = [];
      let score = 0;

      // Class name match
      if (engine.className.toLowerCase().includes(queryLower)) {
        score += 50;
        matchedOn.push("className");
      }

      // Method name match
      for (const method of engine.methodNames) {
        if (method.toLowerCase().includes(queryLower)) {
          score += 20;
          if (!matchedOn.includes("methods")) matchedOn.push("methods");
        }
      }

      // Category match
      if (engine.category.includes(queryLower)) {
        score += 15;
        matchedOn.push("category");
      }

      // Description match
      if (engine.description.toLowerCase().includes(queryLower)) {
        score += 10;
        matchedOn.push("description");
      }

      // Term-by-term matching
      for (const term of queryTerms) {
        if (engine.className.toLowerCase().includes(term)) {
          score += 10;
        }
        if (engine.description.toLowerCase().includes(term)) {
          score += 5;
        }
      }

      if (score > 0) {
        results.push({ engine, score, matchedOn });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get engines by category
   */
  async getByCategory(category: string): Promise<EngineDigest[]> {
    const inventory = await this.buildInventory();
    return inventory.byCategory.get(category) || [];
  }

  /**
   * Get engines by subcategory
   */
  async getBySubcategory(subcategory: string): Promise<EngineDigest[]> {
    const inventory = await this.buildInventory();
    return inventory.bySubcategory.get(subcategory) || [];
  }

  /**
   * Get engines that depend on a given engine
   */
  async getDependents(engineName: string): Promise<string[]> {
    const inventory = await this.buildInventory();
    return inventory.reverseDependencies.get(engineName) || [];
  }

  /**
   * Get engines that a given engine depends on
   */
  async getDependencies(engineName: string): Promise<string[]> {
    const inventory = await this.buildInventory();
    return inventory.dependencyGraph.get(engineName) || [];
  }

  /**
   * Get inventory statistics
   */
  async getStats(): Promise<{
    engineCount: number;
    totalLoc: number;
    categories: string[];
    subcategories: string[];
    avgLoc: number;
    avgMethods: number;
    topByLoc: { name: string; loc: number }[];
    topByMethods: { name: string; methods: number }[];
  }> {
    const inventory = await this.buildInventory();

    const avgLoc = Math.round(inventory.totalLoc / inventory.engineCount);
    const avgMethods = Math.round(
      inventory.all.reduce((sum, e) => sum + e.publicMethods, 0) /
        inventory.engineCount
    );

    const topByLoc = [...inventory.all]
      .sort((a, b) => b.loc - a.loc)
      .slice(0, 10)
      .map((e) => ({ name: e.className, loc: e.loc }));

    const topByMethods = [...inventory.all]
      .sort((a, b) => b.publicMethods - a.publicMethods)
      .slice(0, 10)
      .map((e) => ({ name: e.className, methods: e.publicMethods }));

    return {
      engineCount: inventory.engineCount,
      totalLoc: inventory.totalLoc,
      categories: Array.from(inventory.byCategory.keys()),
      subcategories: Array.from(inventory.bySubcategory.keys()),
      avgLoc,
      avgMethods,
      topByLoc,
      topByMethods,
    };
  }

  /**
   * Find engine by class name
   */
  async findByName(name: string): Promise<EngineDigest | null> {
    const inventory = await this.buildInventory();
    return (
      inventory.all.find(
        (e) => e.className.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  /**
   * Get all engines
   */
  async getAll(): Promise<EngineDigest[]> {
    const inventory = await this.buildInventory();
    return inventory.all;
  }

  /**
   * Force refresh
   */
  async refresh(): Promise<EngineInventory> {
    return this.buildInventory(true);
  }
}

// Export singleton
export const engineDigestEngine = new EngineDigestEngine();
