/**
 * DependencyGraphEngine — TypeScript Import Dependency Graph
 *
 * Phase 0.2 from AGI proximity plan. Parses TS AST import edges and
 * exposes dependentsOf() and impactedBy() for impact analysis.
 *
 * Refreshed by PostWrite hook. Wired into CRITICAL-file pre-edit guards.
 *
 * @module engines/DependencyGraphEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

export interface DependencyNode {
  file: string;
  imports: string[]; // Files this file imports
  importedBy: string[]; // Files that import this file
  isEngine: boolean;
  isDispatcher: boolean;
  isCritical: boolean;
}

export interface ImpactAnalysis {
  file: string;
  directDependents: string[];
  transitiveDependents: string[];
  impactLevel: "low" | "medium" | "high" | "critical";
  affectedEngines: string[];
  affectedDispatchers: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CRITICAL_FILES = new Set([
  "constants.ts",
  "KienzleForceModelEngine.ts",
  "TaylorToolLifeEngine.ts",
  "SafetyEngine.ts",
  "DuplicationGuardEngine.ts",
]);

// ============================================================================
// CACHE STATE
// ============================================================================

let GRAPH_CACHE: Map<string, DependencyNode> | null = null;
let CACHE_LOADED_AT = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

// ============================================================================
// ENGINE
// ============================================================================

export class DependencyGraphEngine {
  private baseDir: string;
  private graphPath: string;

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    this.graphPath = path.join(this.baseDir, "data", "state", "DEP_GRAPH.json");
    log.info("[DependencyGraph] Initialized — import dependency graph");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Get all files that directly import the given file
   */
  async dependentsOf(filePath: string): Promise<string[]> {
    const graph = await this.loadGraph();
    const normalized = this.normalizePath(filePath);
    const node = graph.get(normalized);
    return node?.importedBy || [];
  }

  /**
   * Get all files that the given file imports
   */
  async dependenciesOf(filePath: string): Promise<string[]> {
    const graph = await this.loadGraph();
    const normalized = this.normalizePath(filePath);
    const node = graph.get(normalized);
    return node?.imports || [];
  }

  /**
   * Get full impact analysis for a file (all transitive dependents)
   */
  async impactedBy(filePath: string): Promise<ImpactAnalysis> {
    const graph = await this.loadGraph();
    const normalized = this.normalizePath(filePath);
    const node = graph.get(normalized);

    const directDependents = node?.importedBy || [];
    const transitiveDependents = this.computeTransitiveDependents(graph, normalized);
    const affectedEngines = transitiveDependents.filter((f) => f.includes("/engines/"));
    const affectedDispatchers = transitiveDependents.filter((f) => f.includes("/dispatchers/"));

    // Determine impact level
    let impactLevel: "low" | "medium" | "high" | "critical";
    const fileName = path.basename(filePath);

    if (CRITICAL_FILES.has(fileName) || node?.isCritical) {
      impactLevel = "critical";
    } else if (affectedDispatchers.length > 0 || transitiveDependents.length > 20) {
      impactLevel = "high";
    } else if (transitiveDependents.length > 5) {
      impactLevel = "medium";
    } else {
      impactLevel = "low";
    }

    return {
      file: normalized,
      directDependents,
      transitiveDependents,
      impactLevel,
      affectedEngines,
      affectedDispatchers,
    };
  }

  /**
   * Check if a file is critical (affects many dependents or is in critical list)
   */
  async isCritical(filePath: string): Promise<boolean> {
    const fileName = path.basename(filePath);
    if (CRITICAL_FILES.has(fileName)) return true;

    const graph = await this.loadGraph();
    const normalized = this.normalizePath(filePath);
    const node = graph.get(normalized);
    return node?.isCritical || false;
  }

  /**
   * Get dependency graph statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalEdges: number;
    engineCount: number;
    dispatcherCount: number;
    criticalCount: number;
    maxDependents: number;
    avgDependents: number;
  }> {
    const graph = await this.loadGraph();

    let totalEdges = 0;
    let engineCount = 0;
    let dispatcherCount = 0;
    let criticalCount = 0;
    let maxDependents = 0;
    let sumDependents = 0;

    for (const node of graph.values()) {
      totalEdges += node.imports.length;
      if (node.isEngine) engineCount++;
      if (node.isDispatcher) dispatcherCount++;
      if (node.isCritical) criticalCount++;
      maxDependents = Math.max(maxDependents, node.importedBy.length);
      sumDependents += node.importedBy.length;
    }

    return {
      totalFiles: graph.size,
      totalEdges,
      engineCount,
      dispatcherCount,
      criticalCount,
      maxDependents,
      avgDependents: graph.size > 0 ? sumDependents / graph.size : 0,
    };
  }

  /**
   * Rebuild graph from source files (called by hook or manually)
   */
  async rebuildGraph(): Promise<void> {
    log.info("[DependencyGraph] Rebuilding graph from source files...");
    const graph = new Map<string, DependencyNode>();

    // Scan src directory
    const srcDir = path.join(this.baseDir, "src");
    await this.scanDirectory(srcDir, graph);

    // Build reverse edges (importedBy)
    for (const [file, node] of graph) {
      for (const imported of node.imports) {
        const importedNode = graph.get(imported);
        if (importedNode && !importedNode.importedBy.includes(file)) {
          importedNode.importedBy.push(file);
        }
      }
    }

    // Mark critical files
    for (const [file, node] of graph) {
      const fileName = path.basename(file);
      if (CRITICAL_FILES.has(fileName) || node.importedBy.length > 30) {
        node.isCritical = true;
      }
    }

    // Persist and update cache
    await this.persistGraph(graph);
    GRAPH_CACHE = graph;
    CACHE_LOADED_AT = Date.now();

    log.info(`[DependencyGraph] Rebuilt graph with ${graph.size} files`);
  }

  /**
   * Update graph for a single file (called by PostWrite hook)
   */
  async updateFile(filePath: string): Promise<void> {
    const graph = await this.loadGraph();
    const normalized = this.normalizePath(filePath);

    // Remove old edges
    const oldNode = graph.get(normalized);
    if (oldNode) {
      for (const imported of oldNode.imports) {
        const importedNode = graph.get(imported);
        if (importedNode) {
          importedNode.importedBy = importedNode.importedBy.filter((f) => f !== normalized);
        }
      }
    }

    // Parse new imports
    const absolutePath = path.join(this.baseDir, filePath);
    if (!fs.existsSync(absolutePath)) {
      // File deleted
      graph.delete(normalized);
    } else {
      const content = fs.readFileSync(absolutePath, "utf-8");
      const imports = this.parseImports(content, normalized);

      const newNode: DependencyNode = {
        file: normalized,
        imports,
        importedBy: oldNode?.importedBy || [],
        isEngine: normalized.includes("/engines/"),
        isDispatcher: normalized.includes("/dispatchers/"),
        isCritical: CRITICAL_FILES.has(path.basename(filePath)),
      };

      graph.set(normalized, newNode);

      // Add reverse edges
      for (const imported of imports) {
        const importedNode = graph.get(imported);
        if (importedNode && !importedNode.importedBy.includes(normalized)) {
          importedNode.importedBy.push(normalized);
        }
      }
    }

    await this.persistGraph(graph);
    log.info(`[DependencyGraph] Updated graph for ${filePath}`);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async loadGraph(): Promise<Map<string, DependencyNode>> {
    if (GRAPH_CACHE && Date.now() - CACHE_LOADED_AT < CACHE_TTL_MS) {
      return GRAPH_CACHE;
    }

    log.info("[DependencyGraph] Loading graph...");
    const graph = new Map<string, DependencyNode>();

    try {
      if (fs.existsSync(this.graphPath)) {
        const content = JSON.parse(fs.readFileSync(this.graphPath, "utf-8"));
        for (const [file, node] of Object.entries(content.nodes || {})) {
          graph.set(file, node as DependencyNode);
        }
      } else {
        // Build initial graph
        await this.rebuildGraph();
        return GRAPH_CACHE!;
      }
    } catch (err) {
      log.warn(`[DependencyGraph] Could not load graph: ${err}`);
    }

    GRAPH_CACHE = graph;
    CACHE_LOADED_AT = Date.now();

    log.info(`[DependencyGraph] Loaded graph with ${graph.size} files`);
    return graph;
  }

  private async scanDirectory(dir: string, graph: Map<string, DependencyNode>): Promise<void> {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          await this.scanDirectory(fullPath, graph);
        } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const relativePath = this.normalizePath(path.relative(this.baseDir, fullPath));
          const imports = this.parseImports(content, relativePath);

          graph.set(relativePath, {
            file: relativePath,
            imports,
            importedBy: [],
            isEngine: relativePath.includes("/engines/"),
            isDispatcher: relativePath.includes("/dispatchers/"),
            isCritical: false,
          });
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  private parseImports(content: string, fromFile: string): string[] {
    const imports: string[] = [];
    const importPattern = /import\s+.*?\s+from\s+["']([^"']+)["']/g;

    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const importPath = match[1];

      // Skip external packages
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
        continue;
      }

      // Resolve relative path
      const fromDir = path.dirname(fromFile);
      let resolved = path.join(fromDir, importPath);

      // Add .ts extension if missing
      if (!resolved.endsWith(".ts") && !resolved.endsWith(".js")) {
        resolved += ".ts";
      }

      // Normalize
      resolved = this.normalizePath(resolved);
      imports.push(resolved);
    }

    return imports;
  }

  private computeTransitiveDependents(
    graph: Map<string, DependencyNode>,
    startFile: string
  ): string[] {
    const visited = new Set<string>();
    const queue = [startFile];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = graph.get(current);
      if (node) {
        for (const dependent of node.importedBy) {
          if (!visited.has(dependent)) {
            queue.push(dependent);
          }
        }
      }
    }

    visited.delete(startFile); // Don't include the starting file
    return Array.from(visited);
  }

  private async persistGraph(graph: Map<string, DependencyNode>): Promise<void> {
    const content = {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      nodes: Object.fromEntries(graph),
    };

    const dir = path.dirname(this.graphPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.graphPath, JSON.stringify(content));
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").replace(/\.js$/, ".ts");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const dependencyGraphEngine = new DependencyGraphEngine();
