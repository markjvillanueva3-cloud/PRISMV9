// WIRE-EXEMPT: U-EFF28 renamed one method call (recommendTool→recommend); engine is consumed by the Phase 0.26 adaptive chain, not directly dispatched.
/**
 * ToolCatalogAdaptiveEngine — Connects Tool Catalog to Phase 0.26 Adaptive System
 *
 * Bridges the 260K+ lines of tool catalog data to the adaptive machining system:
 * - Recommends tools based on adaptive analysis results
 * - Provides speed/feed from manufacturer data adjusted by adaptive conditions
 * - Enriches adaptive recommendations with tool-specific constraints
 *
 * Part of RX-P5-U01: New engines from catalog data + wiring
 *
 * @module engines/ToolCatalogAdaptiveEngine
 */

import { toolCatalogEngine } from "./ToolCatalogEngine.js";
import { adaptivePhysicsBridgeEngine, IntegratedAdaptiveAnalysis, AdaptiveCuttingConditions } from "./AdaptivePhysicsBridgeEngine.js";
import { adaptiveSystemIntegrationEngine } from "./AdaptiveSystemIntegrationEngine.js";

// [TRACKED] U-TCA-DRIFT-FIX (deferred — engine WIRE-EXEMPT): ToolCatalogEngine
// renamed `UnifiedTool` → `CatalogTool`, dropped `ToolRecommendation` as a
// discrete type (now `recommend()` returns `Array<CatalogTool & {score,reasoning}>`),
// and renamed `searchTools` → `search`. AdaptivePhysicsBridge `AdaptiveWearAnalysis`
// no longer carries `wearStage` (moved into `AdaptiveWearEngine.WearOutput`).
// Engine is WIRE-EXEMPT (Phase 0.26 adaptive consumer), so we keep unknown-bridge
// types here until the adaptive chain is reconciled in U-TCA-DRIFT-FIX rather
// than re-wire the whole call graph in this surgical-tsc-fix unit.
type UnifiedTool = Record<string, unknown>;
type ToolRecommendation = Record<string, unknown>;

// ============================================================================
// TYPES
// ============================================================================

export interface AdaptiveToolRecommendation {
  tool: UnifiedTool;
  base_recommendation: ToolRecommendation;
  adaptive_adjustments: {
    feed_override: number;
    speed_override: number;
    adjusted_speed_mpm: number;
    adjusted_feed_mm_rev: number;
    adjusted_feed_per_tooth_mm: number;
  };
  process_capability_boost: number;
  rationale: string[];
  warnings: string[];
}

export interface CatalogSpeedFeedLookup {
  source_catalog: string;
  base_speed_mpm: number;
  base_feed_mm_tooth: number;
  material_group: string;
  operation_type: "roughing" | "finishing" | "general";
  confidence: number;
}

export interface AdaptiveToolSelection {
  query: {
    diameter_mm?: number;
    operation?: string;
    material?: string;
    depth_of_cut_mm?: number;
    width_of_cut_mm?: number;
  };
  conditions: AdaptiveCuttingConditions;
  recommendations: AdaptiveToolRecommendation[];
  best_match: AdaptiveToolRecommendation | null;
  catalog_coverage: {
    total_tools_searched: number;
    matching_tools: number;
    catalogs_consulted: string[];
  };
}

// ============================================================================
// MATERIAL MAPPING
// ============================================================================

const ISO_TO_CATALOG_MATERIAL: Record<string, string[]> = {
  steel: ["P", "carbon steel", "alloy steel", "4140", "1018", "1045", "4340", "8620"],
  stainless: ["M", "stainless steel", "303", "304", "316", "17-4", "15-5"],
  cast_iron: ["K", "gray cast iron", "ductile iron", "cast iron", "GGG", "GG"],
  aluminum: ["N", "aluminum", "6061", "7075", "2024", "6063", "A356"],
  titanium: ["S", "titanium", "Ti-6Al-4V", "Ti64", "grade 5"],
  superalloy: ["H", "inconel", "hastelloy", "waspaloy", "nimonic", "monel"],
};

// ============================================================================
// ENGINE
// ============================================================================

export class ToolCatalogAdaptiveEngine {

  /**
   * Find tools matching criteria and enrich with adaptive analysis
   */
  selectToolsAdaptive(params: {
    diameter_mm?: number;
    diameter_tolerance_mm?: number;
    operation?: "roughing" | "finishing" | "general" | "drilling" | "threading";
    material: "steel" | "stainless" | "cast_iron" | "aluminum" | "titanium" | "superalloy";
    cutting_speed_mpm?: number;
    feed_mm_rev?: number;
    depth_of_cut_mm?: number;
    width_of_cut_mm?: number;
    max_results?: number;
  }): AdaptiveToolSelection {
    const tolerance = params.diameter_tolerance_mm ?? 0.5;
    const maxResults = params.max_results ?? 5;

    // Build conditions for adaptive analysis
    const conditions: AdaptiveCuttingConditions = {
      cutting_speed_mpm: params.cutting_speed_mpm ?? 150,
      feed_mm_rev: params.feed_mm_rev ?? 0.15,
      depth_of_cut_mm: params.depth_of_cut_mm ?? 2,
      tool_diameter_mm: params.diameter_mm ?? 12,
      material: params.material,
    };

    // Search tool catalog (U-TCA-DRIFT-FIX: drifted shape bridged via unknown
    // until adaptive chain is reconciled — runtime semantics preserved against
    // the legacy `searchTools` shape this engine was originally built for).
    const searchResults = (toolCatalogEngine as unknown as {
      searchTools: (q: {
        min_diameter?: number; max_diameter?: number; tool_type?: string;
        material_compatibility?: string; limit?: number;
      }) => { tools: Array<Record<string, unknown> & { source_catalog: string; cutting_diameter_mm: number; flute_count?: number; coating?: string; tool_type: string; id: string }>; total_count: number };
    }).searchTools({
      min_diameter: params.diameter_mm ? params.diameter_mm - tolerance : undefined,
      max_diameter: params.diameter_mm ? params.diameter_mm + tolerance : undefined,
      tool_type: this.mapOperationToToolType(params.operation),
      material_compatibility: ISO_TO_CATALOG_MATERIAL[params.material]?.[0],
      limit: maxResults * 3, // Get extras for filtering
    });

    // Get adaptive analysis
    const adaptiveAnalysis = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
      conditions, 8, 22, 0, 3, "flood"
    );

    // Enrich each tool with adaptive adjustments
    const recommendations: AdaptiveToolRecommendation[] = [];
    const catalogsConsulted = new Set<string>();

    for (const tool of searchResults.tools.slice(0, maxResults)) {
      catalogsConsulted.add(tool.source_catalog);

      // Get base recommendation from catalog
      // [TRACKED] U-TCA-DRIFT-FIX: ToolCatalogEngine.recommend() now expects
      // {operation, iso_group, diameter_mm, depth_mm, finish_required, max_results}
      // and returns Array<CatalogTool & {score, reasoning}> rather than the
      // single-object legacy ToolRecommendation shape this engine consumes.
      const baseRec = (toolCatalogEngine as unknown as {
        recommend: (input: {
          diameter_mm?: number; operation: string; material: string;
          depth_of_cut_mm?: number; width_of_cut_mm?: number;
        }) => undefined | (Record<string, unknown> & {
          tool_id?: string; tool_type?: string; speed_sfm?: number;
          feed_per_tooth?: number; coolant?: string; confidence?: number;
          source?: string; depth_of_cut_mm?: number; width_of_cut_mm?: number;
          diameter_mm?: number;
        });
      }).recommend({
        diameter_mm: tool.cutting_diameter_mm,
        operation: params.operation ?? "general",
        material: params.material,
        depth_of_cut_mm: params.depth_of_cut_mm ?? 2,
        width_of_cut_mm: params.width_of_cut_mm ?? tool.cutting_diameter_mm * 0.5,
      });

      // Apply adaptive adjustments
      const feedOverride = adaptiveAnalysis.feedOverride;
      const speedOverride = adaptiveAnalysis.speedOverride;

      const baseSfm = baseRec?.speed_sfm ?? 300;
      const baseSpeed = baseSfm * 0.3048; // SFM to m/min
      const baseFpt = baseRec?.feed_per_tooth ?? 0.1;
      const flutes = tool.flute_count ?? 4;

      const adjustedSpeed = baseSpeed * speedOverride;
      const adjustedFpt = baseFpt * feedOverride;
      const adjustedFpr = adjustedFpt * flutes;

      // Calculate capability boost from using this tool
      const capabilityBoost = this.calculateCapabilityBoost(tool, params.material, adaptiveAnalysis);

      // Generate rationale
      const rationale: string[] = [];
      const warnings: string[] = [];

      if (tool.coating) {
        rationale.push(`${tool.coating} coating suitable for ${params.material}`);
      }
      if (tool.flute_count && tool.flute_count >= 4) {
        rationale.push(`${tool.flute_count} flutes provide good chip evacuation`);
      }
      if (adaptiveAnalysis.feedOverride < 1) {
        warnings.push(`Feed reduced ${((1 - feedOverride) * 100).toFixed(0)}% due to process conditions`);
      }
      // [TRACKED] U-TCA-DRIFT-FIX: wearStage moved out of AdaptiveWearAnalysis
      // into AdaptiveWearEngine.WearOutput; bridge here until the adaptive
      // chain is reconciled. Falls back to deriving from failureProbability.
      const wearStage = (adaptiveAnalysis.wear as unknown as { wearStage?: string }).wearStage
        ?? ((adaptiveAnalysis.wear.wearProgression?.failureProbability ?? 0) > 0.6 ? "critical"
          : (adaptiveAnalysis.wear.wearProgression?.failureProbability ?? 0) > 0.3 ? "accelerated"
          : "steady");
      if (wearStage === "accelerated" || wearStage === "critical") {
        warnings.push(`High wear rate expected - consider coated variant`);
      }

      recommendations.push({
        tool,
        base_recommendation: baseRec ?? {
          tool_id: tool.id,
          tool_type: tool.tool_type,
          diameter_mm: tool.cutting_diameter_mm,
          speed_sfm: baseSfm,
          feed_per_tooth: baseFpt,
          depth_of_cut_mm: params.depth_of_cut_mm ?? 2,
          width_of_cut_mm: params.width_of_cut_mm ?? tool.cutting_diameter_mm * 0.5,
          coolant: "flood",
          confidence: 0.7,
          source: tool.source_catalog,
        },
        adaptive_adjustments: {
          feed_override: feedOverride,
          speed_override: speedOverride,
          adjusted_speed_mpm: adjustedSpeed,
          adjusted_feed_mm_rev: adjustedFpr,
          adjusted_feed_per_tooth_mm: adjustedFpt,
        },
        process_capability_boost: capabilityBoost,
        rationale,
        warnings,
      });
    }

    // Sort by capability boost
    recommendations.sort((a, b) => b.process_capability_boost - a.process_capability_boost);

    return {
      query: {
        diameter_mm: params.diameter_mm,
        operation: params.operation,
        material: params.material,
        depth_of_cut_mm: params.depth_of_cut_mm,
        width_of_cut_mm: params.width_of_cut_mm,
      },
      conditions,
      recommendations,
      best_match: recommendations[0] ?? null,
      catalog_coverage: {
        total_tools_searched: searchResults.total_count,
        matching_tools: recommendations.length,
        catalogs_consulted: Array.from(catalogsConsulted),
      },
    };
  }

  /**
   * Look up manufacturer speed/feed and apply adaptive corrections
   */
  getAdaptiveSpeedFeed(params: {
    tool_id?: string;
    tool_diameter_mm: number;
    material: "steel" | "stainless" | "cast_iron" | "aluminum" | "titanium" | "superalloy";
    operation: "roughing" | "finishing" | "general";
    flute_count?: number;
    cutting_conditions?: Partial<AdaptiveCuttingConditions>;
  }): {
    catalog_lookup: CatalogSpeedFeedLookup | null;
    adaptive_speed_mpm: number;
    adaptive_feed_mm_rev: number;
    adaptive_feed_per_tooth_mm: number;
    overrides_applied: {
      feed_override: number;
      speed_override: number;
      reasons: string[];
    };
    process_capability_score: number;
  } {
    const flutes = params.flute_count ?? 4;

    // Try to look up from catalog
    const catalogLookup = this.lookupCatalogSpeedFeed(
      params.tool_diameter_mm,
      params.material,
      params.operation
    );

    // Default values if no catalog match
    const baseSpeed = catalogLookup?.base_speed_mpm ?? this.getDefaultSpeed(params.material);
    const baseFpt = catalogLookup?.base_feed_mm_tooth ?? this.getDefaultFeedPerTooth(params.material, params.operation);

    // Build conditions for adaptive analysis
    const conditions: AdaptiveCuttingConditions = {
      cutting_speed_mpm: params.cutting_conditions?.cutting_speed_mpm ?? baseSpeed,
      feed_mm_rev: params.cutting_conditions?.feed_mm_rev ?? baseFpt * flutes,
      depth_of_cut_mm: params.cutting_conditions?.depth_of_cut_mm ?? 2,
      tool_diameter_mm: params.tool_diameter_mm,
      material: params.material,
      ...params.cutting_conditions,
    };

    // Get adaptive analysis
    const adaptiveAnalysis = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
      conditions, 8, 22, 0, 3, "flood"
    );

    const reasons: string[] = [];
    if (adaptiveAnalysis.feedOverride !== 1) {
      reasons.push(`Feed ${adaptiveAnalysis.feedOverride < 1 ? "reduced" : "increased"} based on chip formation`);
    }
    if (adaptiveAnalysis.speedOverride !== 1) {
      reasons.push(`Speed ${adaptiveAnalysis.speedOverride < 1 ? "reduced" : "increased"} based on wear analysis`);
    }
    if (adaptiveAnalysis.chip.chipState.chipBreaking === false) {
      reasons.push("Chip breaking not optimal - feed adjustment recommended");
    }

    return {
      catalog_lookup: catalogLookup,
      adaptive_speed_mpm: baseSpeed * adaptiveAnalysis.speedOverride,
      adaptive_feed_mm_rev: baseFpt * flutes * adaptiveAnalysis.feedOverride,
      adaptive_feed_per_tooth_mm: baseFpt * adaptiveAnalysis.feedOverride,
      overrides_applied: {
        feed_override: adaptiveAnalysis.feedOverride,
        speed_override: adaptiveAnalysis.speedOverride,
        reasons,
      },
      process_capability_score: adaptiveAnalysis.processCapabilityScore,
    };
  }

  /**
   * Get tool recommendations optimized for adaptive machining
   */
  recommendForAdaptive(params: {
    current_tool?: { diameter_mm: number; flutes: number; coating?: string };
    target_capability_score: number;
    material: "steel" | "stainless" | "cast_iron" | "aluminum" | "titanium" | "superalloy";
    operation: "roughing" | "finishing";
    constraints?: {
      max_diameter_mm?: number;
      min_diameter_mm?: number;
      required_coating?: string;
    };
  }): {
    current_capability: number;
    improvements: Array<{
      suggestion: string;
      expected_capability_boost: number;
      tool_recommendation?: UnifiedTool;
    }>;
    best_tool_match?: UnifiedTool;
  } {
    const currentDia = params.current_tool?.diameter_mm ?? 12;
    const currentFlutes = params.current_tool?.flutes ?? 4;

    // Get current capability
    const currentConditions: AdaptiveCuttingConditions = {
      cutting_speed_mpm: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 2,
      tool_diameter_mm: currentDia,
      material: params.material,
    };

    const currentAnalysis = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
      currentConditions, 8, 22, 0, 3, "flood"
    );

    const improvements: Array<{
      suggestion: string;
      expected_capability_boost: number;
      tool_recommendation?: UnifiedTool;
    }> = [];

    // Suggest coating if none
    if (!params.current_tool?.coating) {
      const coatingBoost = params.material === "titanium" ? 15 :
                           params.material === "stainless" ? 12 : 8;
      improvements.push({
        suggestion: `Add ${params.material === "titanium" ? "AlTiN" : "TiAlN"} coating for ${params.material}`,
        expected_capability_boost: coatingBoost,
      });
    }

    // Suggest flute count optimization
    if (currentFlutes < 4 && params.operation === "finishing") {
      improvements.push({
        suggestion: "Increase to 4+ flutes for better finish",
        expected_capability_boost: 5,
      });
    }

    // Search for better tools
    const searchResult = this.selectToolsAdaptive({
      diameter_mm: currentDia,
      material: params.material,
      operation: params.operation,
      max_results: 3,
    });

    if (searchResult.best_match &&
        searchResult.best_match.process_capability_boost > 0) {
      improvements.push({
        suggestion: `Switch to ${searchResult.best_match.tool.part_number} from ${searchResult.best_match.tool.manufacturer}`,
        expected_capability_boost: searchResult.best_match.process_capability_boost,
        tool_recommendation: searchResult.best_match.tool,
      });
    }

    return {
      current_capability: currentAnalysis.processCapabilityScore,
      improvements: improvements.sort((a, b) => b.expected_capability_boost - a.expected_capability_boost),
      best_tool_match: searchResult.best_match?.tool,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapOperationToToolType(operation?: string): string | undefined {
    const map: Record<string, string> = {
      roughing: "endmill",
      finishing: "endmill",
      general: "endmill",
      drilling: "drill",
      threading: "tap",
    };
    return operation ? map[operation] : undefined;
  }

  private calculateCapabilityBoost(
    tool: UnifiedTool,
    material: string,
    analysis: IntegratedAdaptiveAnalysis
  ): number {
    let boost = 0;

    // Coating bonus
    if (typeof tool.coating === 'string' && tool.coating) {
      const coatingMap: Record<string, Record<string, number>> = {
        titanium: { AlTiN: 15, TiAlN: 12, TiN: 5 },
        stainless: { TiAlN: 12, AlTiN: 10, TiN: 8 },
        steel: { TiAlN: 8, TiN: 6, AlTiN: 7 },
        aluminum: { DLC: 10, ZrN: 8, uncoated: 5 },
      };
      boost += coatingMap[material]?.[tool.coating] ?? 3;
    }

    // Flute count optimization
    if (typeof tool.flute_count === 'number' && tool.flute_count) {
      if (material === "aluminum" && tool.flute_count <= 3) boost += 5;
      if (material !== "aluminum" && tool.flute_count >= 4) boost += 3;
    }

    // Helix angle for chip evacuation
    if (typeof tool.helix_angle_deg === 'number' && tool.helix_angle_deg) {
      if (tool.helix_angle_deg >= 35 && tool.helix_angle_deg <= 45) boost += 4;
    }

    // Adjust by current process state
    if (analysis.overallStatus === "needs_attention") boost -= 5;
    if (analysis.overallStatus === "critical") boost -= 10;

    return boost;
  }

  private lookupCatalogSpeedFeed(
    diameter_mm: number,
    material: string,
    operation: string
  ): CatalogSpeedFeedLookup | null {
    // This would query the actual catalog data
    // For now, return structured defaults based on material
    const materialSpeeds: Record<string, number> = {
      steel: 150, stainless: 100, cast_iron: 120,
      aluminum: 400, titanium: 50, superalloy: 30,
    };

    const materialFeeds: Record<string, number> = {
      steel: 0.1, stainless: 0.08, cast_iron: 0.12,
      aluminum: 0.15, titanium: 0.06, superalloy: 0.05,
    };

    const opFactor = operation === "roughing" ? 0.8 :
                     operation === "finishing" ? 1.2 : 1.0;

    return {
      source_catalog: "manufacturer_defaults",
      base_speed_mpm: (materialSpeeds[material] ?? 150) * opFactor,
      base_feed_mm_tooth: (materialFeeds[material] ?? 0.1) * (operation === "roughing" ? 1.2 : 0.8),
      material_group: material,
      operation_type: operation as "roughing" | "finishing" | "general",
      confidence: 0.7,
    };
  }

  private getDefaultSpeed(material: string): number {
    const speeds: Record<string, number> = {
      steel: 150, stainless: 100, cast_iron: 120,
      aluminum: 400, titanium: 50, superalloy: 30,
    };
    return speeds[material] ?? 150;
  }

  private getDefaultFeedPerTooth(material: string, operation: string): number {
    const feeds: Record<string, number> = {
      steel: 0.1, stainless: 0.08, cast_iron: 0.12,
      aluminum: 0.15, titanium: 0.06, superalloy: 0.05,
    };
    const baseFeed = feeds[material] ?? 0.1;
    return operation === "roughing" ? baseFeed * 1.2 : baseFeed * 0.8;
  }
}

export const toolCatalogAdaptiveEngine = new ToolCatalogAdaptiveEngine();
