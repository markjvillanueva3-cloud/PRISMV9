/**
 * InventoryAwareToolSelectorEngine
 *
 * Matches machining features to the user's actual tool inventory.
 * For each feature, finds the best available tool from what the user owns.
 * Flags missing tools with purchase recommendations from the 46,590-tool catalog.
 * Derates worn tools (reduced S/F recommendations).
 * Suggests tool consolidation (one tool for multiple features).
 */

export interface AtomicValue<T> { value: T; unit?: string; formula?: string; confidence?: number; source?: string; }

export interface UserTool {
  id: string;
  type: "endmill" | "drill" | "tap" | "reamer" | "insert" | "boring_bar" | "face_mill";
  diameter_mm: number;
  flutes?: number;
  material: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  max_depth_mm?: number;
  corner_radius_mm?: number;
  condition: "new" | "good" | "worn" | "needs_regrind" | "retired";
  magazine_position?: number;
  holder_type?: string;
  notes?: string;
}

export interface PartFeature {
  id: string;
  type: "hole" | "pocket" | "slot" | "face" | "contour" | "thread" | "counterbore" | "countersink" | "chamfer" | "drill" | "bore" | "ream";
  diameter_mm?: number;
  width_mm?: number;
  depth_mm?: number;
  length_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  material?: string;
}

export interface ToolAssignment {
  feature_id: string;
  feature_type: string;
  tool: UserTool | null;
  from_inventory: boolean;
  condition_factor: number; // 1.0 = new, 0.85 = worn
  confidence: number;
  notes: string;
}

export interface MissingTool {
  feature_id: string;
  feature_type: string;
  recommended_type: string;
  recommended_diameter_mm: number;
  estimated_cost_usd: number;
  reason: string;
  priority: "critical" | "recommended" | "optional";
}

export interface ToolConsolidation {
  tool: UserTool;
  features_served: string[];
  savings_tool_changes: number;
}

export interface SelectionResult {
  assignments: ToolAssignment[];
  missing_tools: MissingTool[];
  consolidations: ToolConsolidation[];
  magazine_layout: Array<{ position: number; tool_id: string; features: string[] }>;
  total_tool_changes: number;
  inventory_coverage_pct: number;
}

export class InventoryAwareToolSelectorEngine {
  readonly name = "InventoryAwareToolSelectorEngine";

  select(features: PartFeature[], inventory: UserTool[]): AtomicValue<SelectionResult> {
    const assignments: ToolAssignment[] = [];
    const missing: MissingTool[] = [];
    const toolUsage = new Map<string, string[]>();

    // Active tools only (not retired)
    const available = inventory.filter(t => t.condition !== "retired");

    for (const feat of features) {
      const match = this.findBestTool(feat, available);

      if (match) {
        const condFactor = this.conditionFactor(match.condition);
        assignments.push({
          feature_id: feat.id,
          feature_type: feat.type,
          tool: match,
          from_inventory: true,
          condition_factor: condFactor,
          confidence: condFactor > 0.8 ? 0.9 : 0.7,
          notes: condFactor < 1 ? `Tool ${match.condition} — derate S/F by ${((1 - condFactor) * 100).toFixed(0)}%` : "Good match from inventory",
        });

        // Track tool usage for consolidation
        const usages = toolUsage.get(match.id) ?? [];
        usages.push(feat.id);
        toolUsage.set(match.id, usages);
      } else {
        const rec = this.recommendPurchase(feat);
        assignments.push({
          feature_id: feat.id,
          feature_type: feat.type,
          tool: null,
          from_inventory: false,
          condition_factor: 1,
          confidence: 0.3,
          notes: `No suitable tool in inventory — purchase recommended`,
        });
        missing.push(rec);
      }
    }

    // Build consolidation suggestions
    const consolidations: ToolConsolidation[] = [];
    for (const [toolId, feats] of toolUsage) {
      if (feats.length > 1) {
        const tool = available.find(t => t.id === toolId)!;
        consolidations.push({
          tool,
          features_served: feats,
          savings_tool_changes: feats.length - 1,
        });
      }
    }

    // Build magazine layout
    const usedTools = new Map<string, { tool: UserTool; features: string[] }>();
    for (const a of assignments) {
      if (a.tool && !usedTools.has(a.tool.id)) {
        usedTools.set(a.tool.id, { tool: a.tool, features: [] });
      }
      if (a.tool) usedTools.get(a.tool.id)!.features.push(a.feature_id);
    }

    const magazine = Array.from(usedTools.entries()).map(([id, { tool, features }], i) => ({
      position: tool.magazine_position ?? (i + 1),
      tool_id: id,
      features,
    }));

    const covered = assignments.filter(a => a.from_inventory).length;
    const total = features.length;
    const coverage = total > 0 ? (covered / total) * 100 : 0;

    return {
      value: {
        assignments,
        missing_tools: missing,
        consolidations,
        magazine_layout: magazine,
        total_tool_changes: usedTools.size - 1,
        inventory_coverage_pct: Math.round(coverage * 10) / 10,
      },
      confidence: coverage > 80 ? 0.85 : coverage > 50 ? 0.65 : 0.4,
      source: this.name,
    };
  }

  private findBestTool(feat: PartFeature, tools: UserTool[]): UserTool | null {
    const candidates = tools.filter(t => this.toolFitsFeature(t, feat));
    if (candidates.length === 0) return null;

    // Score: prefer better condition, closer diameter match, more flutes for finishing
    candidates.sort((a, b) => {
      const condA = this.conditionScore(a.condition);
      const condB = this.conditionScore(b.condition);
      if (condA !== condB) return condB - condA;

      // Prefer closer diameter match
      const targetD = feat.diameter_mm ?? feat.width_mm ?? 12;
      const diffA = Math.abs(a.diameter_mm - targetD);
      const diffB = Math.abs(b.diameter_mm - targetD);
      return diffA - diffB;
    });

    return candidates[0];
  }

  private toolFitsFeature(tool: UserTool, feat: PartFeature): boolean {
    switch (feat.type) {
      case "hole":
      case "drill":
        return (tool.type === "drill" || tool.type === "endmill")
          && feat.diameter_mm != null
          && Math.abs(tool.diameter_mm - feat.diameter_mm) < 0.1;

      case "thread":
        return tool.type === "tap"
          && feat.diameter_mm != null
          && Math.abs(tool.diameter_mm - feat.diameter_mm) < 0.5;

      case "ream":
        return tool.type === "reamer"
          && feat.diameter_mm != null
          && Math.abs(tool.diameter_mm - feat.diameter_mm) < 0.05;

      case "bore":
        return tool.type === "boring_bar"
          && feat.diameter_mm != null
          && tool.diameter_mm <= feat.diameter_mm;

      case "pocket":
      case "slot":
      case "contour":
        return tool.type === "endmill"
          && feat.width_mm != null
          && tool.diameter_mm <= feat.width_mm
          && tool.diameter_mm >= feat.width_mm * 0.3; // not too small

      case "face":
        return tool.type === "face_mill" || tool.type === "endmill";

      case "counterbore":
      case "countersink":
        return tool.type === "drill" || tool.type === "endmill";

      case "chamfer":
        return tool.type === "endmill"; // chamfer mill

      default:
        return tool.type === "endmill";
    }
  }

  private conditionFactor(condition: UserTool["condition"]): number {
    switch (condition) {
      case "new": return 1.0;
      case "good": return 0.95;
      case "worn": return 0.85;
      case "needs_regrind": return 0.7;
      case "retired": return 0;
    }
  }

  private conditionScore(condition: UserTool["condition"]): number {
    switch (condition) {
      case "new": return 4;
      case "good": return 3;
      case "worn": return 2;
      case "needs_regrind": return 1;
      case "retired": return 0;
    }
  }

  private recommendPurchase(feat: PartFeature): MissingTool {
    const type = this.recommendedToolType(feat.type);
    const dia = feat.diameter_mm ?? feat.width_mm ?? 12;

    // U-BIZREG3: Try ToolRegistry for accurate catalog pricing
    let cost: number;
    let costSource = "estimate";
    try {
      const registry = require("../registries/ToolRegistry.js").toolRegistry;
      const results = registry.search?.({ type, diameter_min: dia * 0.9, diameter_max: dia * 1.1, limit: 1 });
      const match = Array.isArray(results) ? results[0] : results?.tools?.[0];
      if (match?.price && match.price > 0) {
        cost = Math.round(match.price);
        costSource = "ToolRegistry";
      } else {
        throw new Error("no match");
      }
    } catch {
      // Fallback: type-based rough cost estimation
      const baseCost = type === "tap" ? 25 : type === "reamer" ? 45 : type === "boring_bar" ? 120 : 35;
      const sizeFactor = Math.max(1, dia / 12);
      cost = Math.round(baseCost * sizeFactor);
    }

    const priority: MissingTool["priority"] =
      feat.tolerance_mm != null && feat.tolerance_mm < 0.05 ? "critical" :
      feat.type === "thread" || feat.type === "ream" ? "critical" : "recommended";

    return {
      feature_id: feat.id,
      feature_type: feat.type,
      recommended_type: type,
      recommended_diameter_mm: dia,
      estimated_cost_usd: cost,
      reason: `No ${type} ∅${dia.toFixed(2)}mm in inventory`,
      priority,
    };
  }

  private recommendedToolType(featureType: string): string {
    switch (featureType) {
      case "hole": case "drill": return "drill";
      case "thread": return "tap";
      case "ream": return "reamer";
      case "bore": return "boring_bar";
      case "face": return "face_mill";
      default: return "endmill";
    }
  }
}

export const inventoryAwareToolSelectorEngine = new InventoryAwareToolSelectorEngine();
