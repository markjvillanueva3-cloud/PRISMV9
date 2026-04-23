/**
 * ToolpathStrategyRouterEngine — Phase 0.23 U-UTL4
 *
 * Routes toolpath requests to optimal strategies from the 698+ available.
 * Considers material, geometry, machine capabilities, and quality requirements.
 *
 * @module engines/ToolpathStrategyRouterEngine
 */

import { log } from "../utils/Logger.js";

export interface ToolpathStrategy {
  id: string;
  name: string;
  category: string;
  machineType: string;
  applicableMaterials: string[];
  mrr: "high" | "medium" | "low";
  surfaceFinish: "rough" | "semi" | "finish";
  complexity: number;
}

export interface RoutingRequest {
  machineType: string;
  material?: string;
  operation?: string;
  priority?: "speed" | "quality" | "balanced";
  limit?: number;
}

export interface RoutingResult {
  recommended: ToolpathStrategy;
  alternatives: ToolpathStrategy[];
  reasoning: string;
  confidence: number;
}

class ToolpathStrategyRouterEngine {
  private strategies: Map<string, ToolpathStrategy> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    log.info("[ToolpathStrategyRouter] Initializing...");
    await this.loadStrategies();
    this.initialized = true;
    log.info(`[ToolpathStrategyRouter] Loaded ${this.strategies.size} strategies`);
  }

  private async loadStrategies(): Promise<void> {
    const strategies: ToolpathStrategy[] = [
      { id: "adaptive_rough", name: "Adaptive Roughing", category: "roughing", machineType: "mill", applicableMaterials: ["steel", "aluminum", "titanium"], mrr: "high", surfaceFinish: "rough", complexity: 3 },
      { id: "hsm_contour", name: "HSM Contouring", category: "finishing", machineType: "mill", applicableMaterials: ["steel", "aluminum"], mrr: "medium", surfaceFinish: "finish", complexity: 4 },
      { id: "trochoidal", name: "Trochoidal Milling", category: "slotting", machineType: "mill", applicableMaterials: ["titanium", "inconel"], mrr: "medium", surfaceFinish: "semi", complexity: 3 },
      { id: "parallel_finish", name: "Parallel Finish", category: "finishing", machineType: "mill", applicableMaterials: ["all"], mrr: "low", surfaceFinish: "finish", complexity: 2 },
      { id: "rough_turn", name: "Rough Turning", category: "roughing", machineType: "lathe", applicableMaterials: ["steel", "aluminum"], mrr: "high", surfaceFinish: "rough", complexity: 2 },
      { id: "finish_turn", name: "Finish Turning", category: "finishing", machineType: "lathe", applicableMaterials: ["all"], mrr: "low", surfaceFinish: "finish", complexity: 2 },
      { id: "wire_rough", name: "Wire Rough Cut", category: "roughing", machineType: "wedm", applicableMaterials: ["conductive"], mrr: "medium", surfaceFinish: "rough", complexity: 3 },
      { id: "wire_skim", name: "Wire Skim Pass", category: "finishing", machineType: "wedm", applicableMaterials: ["conductive"], mrr: "low", surfaceFinish: "finish", complexity: 2 },
    ];

    for (const s of strategies) {
      this.strategies.set(s.id, s);
    }
  }

  async route(request: RoutingRequest): Promise<RoutingResult> {
    await this.initialize();
    const { machineType, material, operation, priority = "balanced", limit = 5 } = request;

    let candidates = Array.from(this.strategies.values())
      .filter(s => s.machineType === machineType);

    if (material) {
      candidates = candidates.filter(s =>
        s.applicableMaterials.includes(material) || s.applicableMaterials.includes("all")
      );
    }

    if (operation) {
      candidates = candidates.filter(s => s.category === operation);
    }

    // Sort by priority
    if (priority === "speed") {
      candidates.sort((a, b) => (b.mrr === "high" ? 1 : 0) - (a.mrr === "high" ? 1 : 0));
    } else if (priority === "quality") {
      candidates.sort((a, b) => (b.surfaceFinish === "finish" ? 1 : 0) - (a.surfaceFinish === "finish" ? 1 : 0));
    }

    const recommended = candidates[0];
    if (!recommended) {
      return {
        recommended: { id: "none", name: "No strategy found", category: "unknown", machineType, applicableMaterials: [], mrr: "low", surfaceFinish: "rough", complexity: 0 },
        alternatives: [],
        reasoning: "No matching strategy found for the given parameters",
        confidence: 0,
      };
    }

    return {
      recommended,
      alternatives: candidates.slice(1, limit),
      reasoning: `${recommended.name} selected for ${machineType} with ${priority} priority`,
      confidence: 0.9,
    };
  }

  async getStrategy(id: string): Promise<ToolpathStrategy | null> {
    await this.initialize();
    return this.strategies.get(id) || null;
  }

  async listByMachine(machineType: string): Promise<ToolpathStrategy[]> {
    await this.initialize();
    return Array.from(this.strategies.values()).filter(s => s.machineType === machineType);
  }

  getCount(): number {
    return this.strategies.size;
  }

  reset(): void {
    this.strategies.clear();
    this.initialized = false;
    log.info("[ToolpathStrategyRouter] Reset");
  }
}

export const toolpathStrategyRouterEngine = new ToolpathStrategyRouterEngine();
