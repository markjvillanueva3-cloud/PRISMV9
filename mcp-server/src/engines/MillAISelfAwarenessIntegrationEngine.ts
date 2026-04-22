/**
 * MillAISelfAwarenessIntegrationEngine — Milling Capability Registry
 * ===================================================================
 * Maintains a self-refreshing registry of all milling-related engines:
 *   - Mill*.ts (orchestrators, facades, turn)
 *   - Milling*.ts (AGI, LoRA, neural)
 *   - FiveAxis*.ts (5-axis kinematics)
 *   - MultiAxis*.ts (multi-axis P2P)
 *
 * Integrates with PRISMSelfAwarenessEngine via recommendMillFeatures().
 *
 * @module engines/MillAISelfAwarenessIntegrationEngine
 * @milestone MILL-MASTER/P1-U04-SA-INTEG
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MillEngineEntry {
  name: string;
  path: string;
  category: MillEngineCategory;
  capabilities: string[];
  description: string;
  priority: number;
}

export type MillEngineCategory =
  | "orchestrator"
  | "agi"
  | "physics"
  | "kinematics"
  | "lora"
  | "neural"
  | "strategy"
  | "validation"
  | "tribal";

export interface MillFeatureRecommendation {
  feature: string;
  reason: string;
  priority: number;
  engines: string[];
  actions: string[];
  strategies: string[];
}

export interface MillCapabilityMatch {
  engine: string;
  path: string;
  capability: string;
  confidence: number;
  category: MillEngineCategory;
}

export interface MillRegistryStats {
  totalEngines: number;
  byCategory: Record<MillEngineCategory, number>;
  lastRefresh: string;
  version: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENGINES_DIR = "H:/prism/mcp-server/src/engines";
const MILL_PATTERNS = ["Mill*.ts", "Milling*.ts", "FiveAxis*.ts", "MultiAxis*.ts"];

const CATEGORY_PATTERNS: Record<string, MillEngineCategory> = {
  orchestrator: "orchestrator",
  facade: "orchestrator",
  agi: "agi",
  master: "agi",
  lora: "lora",
  dataset: "lora",
  neural: "neural",
  fiveaxis: "kinematics",
  multiaxis: "kinematics",
  physics: "physics",
  force: "physics",
  deflection: "physics",
  strategy: "strategy",
  validation: "validation",
  validator: "validation",
  tribal: "tribal",
  knowledge: "tribal",
};

// ============================================================================
// ENGINE
// ============================================================================

class MillAISelfAwarenessIntegrationEngine {
  private registry: MillEngineEntry[] = [];
  private lastRefresh: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the current milling engine registry, refreshing if stale
   */
  getRegistry(): MillEngineEntry[] {
    if (this.lastRefresh) {
      const age = Date.now() - this.lastRefresh.getTime();
      if (age < this.CACHE_TTL_MS && this.registry.length > 0) {
        return this.registry;
      }
    }
    return this.refreshRegistry();
  }

  /**
   * Force refresh the milling engine registry
   */
  refreshRegistry(): MillEngineEntry[] {
    this.registry = [];
    const seen = new Set<string>();

    try {
      const files = fs.readdirSync(ENGINES_DIR).filter(f =>
        f.endsWith(".ts") &&
        !f.endsWith(".test.ts") &&
        (f.startsWith("Mill") || f.startsWith("Milling") ||
         f.startsWith("FiveAxis") || f.startsWith("MultiAxis"))
      );

      for (const file of files) {
        const name = path.basename(file, ".ts");
        if (seen.has(name)) continue;
        seen.add(name);

        this.registry.push({
          name,
          path: `src/engines/${file}`,
          category: this.inferCategory(name),
          capabilities: this.inferCapabilities(name),
          description: this.generateDescription(name),
          priority: this.computePriority(name),
        });
      }

      this.lastRefresh = new Date();
      log.info(`[MillAISelfAwareness] Refreshed registry: ${this.registry.length} engines`);
    } catch (err) {
      log.error(`[MillAISelfAwareness] Failed to refresh registry: ${err}`);
    }

    return this.registry;
  }

  /**
   * Find milling engines matching a task/query
   */
  findEngines(query: string): MillCapabilityMatch[] {
    const registry = this.getRegistry();
    const matches: MillCapabilityMatch[] = [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    for (const engine of registry) {
      const nameLower = engine.name.toLowerCase();
      const descLower = engine.description.toLowerCase();
      const capsLower = engine.capabilities.join(" ").toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (nameLower.includes(term)) score += 3;
        if (descLower.includes(term)) score += 2;
        if (capsLower.includes(term)) score += 1;
      }

      if (score > 0) {
        matches.push({
          engine: engine.name,
          path: engine.path,
          capability: engine.capabilities[0] || "milling",
          confidence: Math.min(score / queryTerms.length / 3, 1),
          category: engine.category,
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches;
  }

  /**
   * Recommend milling features for a task
   */
  recommendFeatures(task: string): MillFeatureRecommendation[] {
    const matches = this.findEngines(task);
    const recommendations: MillFeatureRecommendation[] = [];

    // Group by category
    const byCategory = new Map<MillEngineCategory, MillCapabilityMatch[]>();
    for (const match of matches) {
      if (!byCategory.has(match.category)) {
        byCategory.set(match.category, []);
      }
      byCategory.get(match.category)!.push(match);
    }

    // Create recommendations per category
    const categoryPriority: Record<MillEngineCategory, number> = {
      orchestrator: 10,
      agi: 9,
      strategy: 8,
      physics: 7,
      kinematics: 6,
      validation: 5,
      neural: 4,
      lora: 3,
      tribal: 2,
    };

    for (const [category, caps] of byCategory) {
      const strategies = this.inferStrategies(category, caps);
      recommendations.push({
        feature: this.formatCategoryName(category),
        reason: `${caps.length} milling engine(s) for ${category}`,
        priority: categoryPriority[category] || 1,
        engines: caps.map(c => c.engine),
        actions: this.inferActions(category),
        strategies,
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get registry statistics
   */
  getStats(): MillRegistryStats {
    const registry = this.getRegistry();
    const byCategory: Record<MillEngineCategory, number> = {
      orchestrator: 0,
      agi: 0,
      physics: 0,
      kinematics: 0,
      lora: 0,
      neural: 0,
      strategy: 0,
      validation: 0,
      tribal: 0,
    };

    for (const engine of registry) {
      byCategory[engine.category]++;
    }

    return {
      totalEngines: registry.length,
      byCategory,
      lastRefresh: this.lastRefresh?.toISOString() || "never",
      version: "1.0.0",
    };
  }

  /**
   * Get all engines in a category
   */
  getByCategory(category: MillEngineCategory): MillEngineEntry[] {
    return this.getRegistry().filter(e => e.category === category);
  }

  /**
   * Check if a capability exists
   */
  hasCapability(capability: string): boolean {
    const registry = this.getRegistry();
    const capLower = capability.toLowerCase();
    return registry.some(e =>
      e.capabilities.some(c => c.toLowerCase().includes(capLower))
    );
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private inferCategory(engineName: string): MillEngineCategory {
    const nameLower = engineName.toLowerCase();

    // Check prefix-based categories first (higher priority)
    if (nameLower.startsWith("fiveaxis")) return "kinematics";
    if (nameLower.startsWith("multiaxis")) return "kinematics";
    if (nameLower.startsWith("millingagi")) return "agi";

    // Then check pattern-based categories
    for (const [pattern, category] of Object.entries(CATEGORY_PATTERNS)) {
      if (nameLower.includes(pattern)) {
        return category;
      }
    }

    return "strategy";
  }

  private inferCapabilities(engineName: string): string[] {
    const capabilities: string[] = ["milling"];
    const nameLower = engineName.toLowerCase();

    if (nameLower.includes("agi") || nameLower.includes("reasoning")) {
      capabilities.push("reasoning", "chain_of_thought");
    }
    if (nameLower.includes("orchestrator") || nameLower.includes("facade")) {
      capabilities.push("orchestration", "routing");
    }
    if (nameLower.includes("lora")) {
      capabilities.push("fine_tuning", "adaptation");
    }
    if (nameLower.includes("fiveaxis") || nameLower.includes("5axis")) {
      capabilities.push("5_axis", "tcp", "kinematics");
    }
    if (nameLower.includes("multiaxis")) {
      capabilities.push("multi_axis", "simultaneous");
    }
    if (nameLower.includes("turn")) {
      capabilities.push("mill_turn", "live_tooling");
    }
    if (nameLower.includes("force") || nameLower.includes("physics")) {
      capabilities.push("cutting_force", "kienzle");
    }
    if (nameLower.includes("strategy")) {
      capabilities.push("hsm", "adaptive_clearing", "trochoidal");
    }
    if (nameLower.includes("dataset")) {
      capabilities.push("training_data", "dataset_generation");
    }
    if (nameLower.includes("cadence")) {
      capabilities.push("scheduling", "cadence");
    }

    return capabilities;
  }

  private generateDescription(engineName: string): string {
    const category = this.inferCategory(engineName);
    const descriptions: Record<MillEngineCategory, string> = {
      orchestrator: "Unified milling operations orchestrator",
      agi: "AGI-powered milling reasoning",
      physics: "Physics-backed milling calculations",
      kinematics: "Multi-axis kinematic transformations",
      lora: "LoRA fine-tuning for milling",
      neural: "Neural network milling optimization",
      strategy: "Milling strategy selection",
      validation: "Milling program validation",
      tribal: "Milling tribal knowledge",
    };
    return descriptions[category] || "Milling engine";
  }

  private computePriority(engineName: string): number {
    const nameLower = engineName.toLowerCase();

    if (nameLower.includes("master") || nameLower.includes("orchestrator")) return 100;
    if (nameLower.includes("agi")) return 90;
    if (nameLower.includes("facade")) return 85;
    if (nameLower.includes("fiveaxis")) return 80;
    if (nameLower.includes("strategy")) return 70;
    if (nameLower.includes("validation")) return 60;
    if (nameLower.includes("lora")) return 50;

    return 40;
  }

  private inferStrategies(category: MillEngineCategory, matches: MillCapabilityMatch[]): string[] {
    const strategies: string[] = [];

    if (category === "orchestrator" || category === "agi") {
      strategies.push("adaptive_clearing", "trochoidal", "hsm", "pencil_cleanup");
    }
    if (category === "kinematics") {
      strategies.push("swarf", "flowline", "multiaxis_roughing");
    }
    if (category === "strategy") {
      strategies.push("rest_machining", "scallop", "parallel_finish");
    }

    return strategies;
  }

  private inferActions(category: MillEngineCategory): string[] {
    const actions: Record<MillEngineCategory, string[]> = {
      orchestrator: ["prism_mill:orchestrate", "prism_mill:plan_process", "prism_mill:recognize_features"],
      agi: ["prism_mill:agi_reason", "prism_mill:recommend_strategy"],
      physics: ["prism_calc:cutting_force", "prism_calc:deflection", "prism_calc:power_torque"],
      kinematics: ["prism_5axis:rtcp_calc", "prism_5axis:inverse_kin", "prism_5axis:work_envelope"],
      lora: ["prism_ml:train_model", "prism_ml:generate_dataset"],
      neural: ["prism_ml:predict", "prism_ml:optimize"],
      strategy: ["prism_cam:cam_strategy_recommend", "prism_toolpath:strategy_select"],
      validation: ["prism_mill:validate", "prism_safety:check_toolpath_collision"],
      tribal: ["prism_knowledge:tribal_search", "prism_mill:wisdom"],
    };

    return actions[category] || [];
  }

  private formatCategoryName(category: MillEngineCategory): string {
    const names: Record<MillEngineCategory, string> = {
      orchestrator: "Mill Orchestration",
      agi: "Mill AGI Reasoning",
      physics: "Milling Physics",
      kinematics: "Multi-Axis Kinematics",
      lora: "Mill LoRA Training",
      neural: "Mill Neural Network",
      strategy: "Milling Strategy",
      validation: "Mill Validation",
      tribal: "Mill Tribal Knowledge",
    };
    return names[category] || category;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millAISelfAwarenessIntegrationEngine = new MillAISelfAwarenessIntegrationEngine();
