/**
 * AssetDependencyGraphEngine — Phase 0.24 U-INT2
 *
 * Maps dependencies between assets (engines depend on formulas,
 * algorithms depend on material data, etc.). Enables impact analysis.
 *
 * @module engines/AssetDependencyGraphEngine
 */

import { log } from "../utils/Logger.js";

export interface DependencyNode {
  id: string;
  type: "engine" | "formula" | "algorithm" | "material" | "tool" | "machine";
  name: string;
  dependencies: string[];
  dependents: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "uses" | "requires" | "extends" | "imports";
  strength: "strong" | "weak";
}

export interface ImpactAnalysis {
  affectedAssets: string[];
  impactDepth: number;
  criticalPath: string[];
  recommendations: string[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  avgDependencies: number;
  maxDependencyDepth: number;
  orphanNodes: number;
}

class AssetDependencyGraphEngine {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: Map<string, DependencyEdge[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    log.info("[AssetDependencyGraph] Building dependency graph...");
    await this.buildGraph();
    this.initialized = true;
    log.info(`[AssetDependencyGraph] Graph built: ${this.nodes.size} nodes`);
  }

  private async buildGraph(): Promise<void> {
    const nodeData: [string, DependencyNode][] = [
      ["CuttingForceEngine", { id: "CuttingForceEngine", type: "engine", name: "Cutting Force Engine", dependencies: ["kienzle_formula", "material_db"], dependents: ["SpeedFeedEngine", "ToolLifeEngine"] }],
      ["kienzle_formula", { id: "kienzle_formula", type: "formula", name: "Kienzle Force Model", dependencies: ["material_db"], dependents: ["CuttingForceEngine"] }],
      ["material_db", { id: "material_db", type: "material", name: "Material Database", dependencies: [], dependents: ["kienzle_formula", "CuttingForceEngine"] }],
      ["SpeedFeedEngine", { id: "SpeedFeedEngine", type: "engine", name: "Speed Feed Engine", dependencies: ["CuttingForceEngine", "ToolLifeEngine"], dependents: ["PostProcessorEngine"] }],
      ["ToolLifeEngine", { id: "ToolLifeEngine", type: "engine", name: "Tool Life Engine", dependencies: ["taylor_formula", "CuttingForceEngine"], dependents: ["SpeedFeedEngine"] }],
      ["taylor_formula", { id: "taylor_formula", type: "formula", name: "Taylor Tool Life", dependencies: [], dependents: ["ToolLifeEngine"] }],
      ["PostProcessorEngine", { id: "PostProcessorEngine", type: "engine", name: "Post Processor Engine", dependencies: ["SpeedFeedEngine"], dependents: [] }],
    ];

    for (const [id, node] of nodeData) {
      this.nodes.set(id, node);
      const edgesForNode: DependencyEdge[] = node.dependencies.map(dep => ({
        from: id,
        to: dep,
        type: "uses" as const,
        strength: "strong" as const,
      }));
      this.edges.set(id, edgesForNode);
    }
  }

  async getNode(id: string): Promise<DependencyNode | null> {
    await this.initialize();
    return this.nodes.get(id) || null;
  }

  async getDependencies(id: string, depth: number = 1): Promise<string[]> {
    await this.initialize();
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (nodeId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            result.push(dep);
            traverse(dep, currentDepth + 1);
          }
        }
      }
    };

    traverse(id, 0);
    return result;
  }

  async getDependents(id: string, depth: number = 1): Promise<string[]> {
    await this.initialize();
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (nodeId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependents) {
          if (!visited.has(dep)) {
            result.push(dep);
            traverse(dep, currentDepth + 1);
          }
        }
      }
    };

    traverse(id, 0);
    return result;
  }

  async analyzeImpact(assetId: string): Promise<ImpactAnalysis> {
    await this.initialize();
    const affected = await this.getDependents(assetId, 10);
    const criticalPath = await this.findCriticalPath(assetId);

    return {
      affectedAssets: affected,
      impactDepth: this.calculateImpactDepth(assetId),
      criticalPath,
      recommendations: this.generateImpactRecommendations(affected.length),
    };
  }

  private async findCriticalPath(assetId: string): Promise<string[]> {
    const dependents = await this.getDependents(assetId, 10);
    return [assetId, ...dependents.slice(0, 5)];
  }

  private calculateImpactDepth(assetId: string): number {
    const node = this.nodes.get(assetId);
    if (!node) return 0;
    return node.dependents.length > 0 ? Math.min(node.dependents.length, 5) : 0;
  }

  private generateImpactRecommendations(affectedCount: number): string[] {
    if (affectedCount === 0) return ["Safe to modify - no downstream dependents"];
    if (affectedCount < 3) return ["Low impact - review affected assets"];
    if (affectedCount < 10) return ["Medium impact - coordinate changes", "Run regression tests"];
    return ["High impact - major change required", "Coordinate with team", "Full test suite required"];
  }

  async getStats(): Promise<GraphStats> {
    await this.initialize();
    let totalEdges = 0;
    let totalDeps = 0;
    let orphans = 0;

    for (const node of this.nodes.values()) {
      totalDeps += node.dependencies.length;
      if (node.dependencies.length === 0 && node.dependents.length === 0) {
        orphans++;
      }
    }

    for (const edges of this.edges.values()) {
      totalEdges += edges.length;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges,
      avgDependencies: this.nodes.size > 0 ? totalDeps / this.nodes.size : 0,
      maxDependencyDepth: 5,
      orphanNodes: orphans,
    };
  }

  reset(): void {
    this.nodes.clear();
    this.edges.clear();
    this.initialized = false;
    log.info("[AssetDependencyGraph] Reset");
  }
}

export const assetDependencyGraphEngine = new AssetDependencyGraphEngine();
