/**
 * EditImpactPredictorEngine
 *
 * Predicts which tests and files might break before an edit is made.
 * Analyzes TypeScript import graphs to identify:
 * - Direct test files for the edited file
 * - Files that import the edited file (dependents)
 * - Transitive impact through the dependency chain
 *
 * Used by pre-edit-impact-analyzer.mjs hook to warn about potential breakage.
 *
 * @module engines/EditImpactPredictorEngine
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

export interface FileNode {
  path: string;
  imports: string[];
  importedBy: string[];
  isTest: boolean;
  isEngine: boolean;
}

export interface ImpactPrediction {
  targetFile: string;
  directTests: string[];
  affectedFiles: string[];
  affectedTests: string[];
  impactScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  suggestions: string[];
}

export interface DependencyGraph {
  nodes: Map<string, FileNode>;
  lastBuilt: number;
}

const IMPORT_REGEX = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

export class EditImpactPredictorEngine {
  private graph: DependencyGraph = { nodes: new Map(), lastBuilt: 0 };
  private cacheValidMs = 300000;
  private srcRoot = "";

  async buildGraph(srcRoot: string): Promise<number> {
    this.srcRoot = srcRoot;
    const t0 = Date.now();
    this.graph.nodes.clear();

    const files = this.walkDir(srcRoot, [".ts", ".tsx"]);

    for (const file of files) {
      const node = this.parseFile(file);
      this.graph.nodes.set(this.normalizePath(file), node);
    }

    for (const [path, node] of this.graph.nodes) {
      for (const imp of node.imports) {
        const resolved = this.resolveImport(path, imp);
        const targetNode = this.graph.nodes.get(resolved);
        if (targetNode && !targetNode.importedBy.includes(path)) {
          targetNode.importedBy.push(path);
        }
      }
    }

    this.graph.lastBuilt = Date.now();
    return this.graph.nodes.size;
  }

  private walkDir(dir: string, extensions: string[]): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) return results;

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;
        const full = join(dir, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) {
            results.push(...this.walkDir(full, extensions));
          } else if (extensions.some((ext) => entry.endsWith(ext))) {
            results.push(full);
          }
        } catch {
          // Skip inaccessible files
        }
      }
    } catch {
      // Skip inaccessible directories
    }
    return results;
  }

  private parseFile(filePath: string): FileNode {
    const normalized = this.normalizePath(filePath);
    const name = basename(filePath);
    const isTest = name.includes(".test.") || name.includes(".spec.") || filePath.includes("__tests__");
    const isEngine = name.endsWith("Engine.ts") && !isTest;

    let content = "";
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      // File unreadable
    }

    const imports: string[] = [];
    let match: RegExpExecArray | null;

    IMPORT_REGEX.lastIndex = 0;
    while ((match = IMPORT_REGEX.exec(content)) !== null) {
      imports.push(match[1]);
    }

    DYNAMIC_IMPORT_REGEX.lastIndex = 0;
    while ((match = DYNAMIC_IMPORT_REGEX.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return {
      path: normalized,
      imports,
      importedBy: [],
      isTest,
      isEngine,
    };
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, "/").toLowerCase();
  }

  private resolveImport(fromFile: string, importPath: string): string {
    if (!importPath.startsWith(".")) {
      return importPath;
    }

    const dir = dirname(fromFile);
    let resolved = resolve(dir, importPath);

    resolved = resolved.replace(/\.js$/, ".ts");

    if (!resolved.endsWith(".ts") && !resolved.endsWith(".tsx")) {
      if (this.graph.nodes.has(this.normalizePath(resolved + ".ts"))) {
        resolved += ".ts";
      } else if (this.graph.nodes.has(this.normalizePath(resolved + "/index.ts"))) {
        resolved += "/index.ts";
      }
    }

    return this.normalizePath(resolved);
  }

  async predict(filePath: string): Promise<ImpactPrediction> {
    const normalized = this.normalizePath(filePath);
    const node = this.graph.nodes.get(normalized);

    if (!node) {
      return {
        targetFile: filePath,
        directTests: [],
        affectedFiles: [],
        affectedTests: [],
        impactScore: 0,
        riskLevel: "low",
        suggestions: ["File not in dependency graph - run buildGraph first"],
      };
    }

    const directTests = this.findDirectTests(normalized);
    const affectedFiles = this.findAffectedFiles(normalized);
    const affectedTests = this.findAffectedTests(affectedFiles);

    const impactScore = this.calculateImpactScore(node, directTests.length, affectedFiles.length, affectedTests.length);
    const riskLevel = this.assessRiskLevel(impactScore, node.isEngine);
    const suggestions = this.generateSuggestions(node, directTests, affectedFiles, affectedTests);

    return {
      targetFile: filePath,
      directTests,
      affectedFiles,
      affectedTests,
      impactScore,
      riskLevel,
      suggestions,
    };
  }

  private findDirectTests(filePath: string): string[] {
    const tests: string[] = [];
    const name = basename(filePath).replace(/\.tsx?$/, "");

    for (const [path, node] of this.graph.nodes) {
      if (!node.isTest) continue;

      const testName = basename(path);
      if (testName.includes(name)) {
        tests.push(path);
        continue;
      }

      for (const imp of node.imports) {
        const resolved = this.resolveImport(path, imp);
        if (resolved === filePath || resolved.includes(name)) {
          tests.push(path);
          break;
        }
      }
    }

    return [...new Set(tests)];
  }

  private findAffectedFiles(filePath: string, visited = new Set<string>()): string[] {
    if (visited.has(filePath)) return [];
    visited.add(filePath);

    const node = this.graph.nodes.get(filePath);
    if (!node) return [];

    const affected: string[] = [];
    for (const dependent of node.importedBy) {
      if (!visited.has(dependent)) {
        affected.push(dependent);
        affected.push(...this.findAffectedFiles(dependent, visited));
      }
    }

    return affected;
  }

  private findAffectedTests(affectedFiles: string[]): string[] {
    const tests: string[] = [];

    for (const file of affectedFiles) {
      const node = this.graph.nodes.get(file);
      if (node?.isTest) {
        tests.push(file);
      }
    }

    for (const file of affectedFiles) {
      tests.push(...this.findDirectTests(file));
    }

    return [...new Set(tests)];
  }

  private calculateImpactScore(
    node: FileNode,
    directTestCount: number,
    affectedFileCount: number,
    affectedTestCount: number
  ): number {
    let score = 0;

    score += Math.min(node.importedBy.length * 5, 25);
    score += Math.min(directTestCount * 10, 30);
    score += Math.min(affectedFileCount * 2, 20);
    score += Math.min(affectedTestCount * 5, 25);

    if (node.isEngine) score += 10;
    if (node.path.includes("dispatcher")) score += 15;
    if (node.path.includes("schema")) score += 10;
    if (node.path.includes("physics")) score += 10;

    return Math.min(score, 100);
  }

  private assessRiskLevel(score: number, isEngine: boolean): "low" | "medium" | "high" | "critical" {
    if (score >= 80 || (isEngine && score >= 60)) return "critical";
    if (score >= 60) return "high";
    if (score >= 30) return "medium";
    return "low";
  }

  private generateSuggestions(
    node: FileNode,
    directTests: string[],
    affectedFiles: string[],
    affectedTests: string[]
  ): string[] {
    const suggestions: string[] = [];

    if (directTests.length === 0 && node.isEngine) {
      suggestions.push(`No direct tests found - consider adding ${basename(node.path).replace(".ts", ".test.ts")}`);
    }

    if (directTests.length > 0) {
      suggestions.push(`Run tests: ${directTests.map((t) => basename(t)).join(", ")}`);
    }

    if (affectedTests.length > 5) {
      suggestions.push(`High blast radius: ${affectedTests.length} tests may be affected - consider smaller change`);
    }

    if (affectedFiles.length > 10) {
      suggestions.push(`${affectedFiles.length} files depend on this - ensure backward compatibility`);
    }

    if (node.path.includes("dispatcher")) {
      suggestions.push("Dispatcher change: verify MCP action routing + test affected actions");
    }

    if (node.path.includes("schema")) {
      suggestions.push("Schema change: verify all consumers handle new shape");
    }

    return suggestions;
  }

  getGraphStats(): { nodeCount: number; edgeCount: number; testCount: number; engineCount: number } {
    let edgeCount = 0;
    let testCount = 0;
    let engineCount = 0;

    for (const node of this.graph.nodes.values()) {
      edgeCount += node.imports.length;
      if (node.isTest) testCount++;
      if (node.isEngine) engineCount++;
    }

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount,
      testCount,
      engineCount,
    };
  }

  isGraphFresh(): boolean {
    return Date.now() - this.graph.lastBuilt < this.cacheValidMs;
  }

  getNode(filePath: string): FileNode | undefined {
    return this.graph.nodes.get(this.normalizePath(filePath));
  }
}

export const editImpactPredictorEngine = new EditImpactPredictorEngine();
