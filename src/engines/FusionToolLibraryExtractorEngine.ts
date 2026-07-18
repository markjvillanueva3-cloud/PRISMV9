/**
 * FusionToolLibraryExtractorEngine — U-BOX56
 *
 * Extracts Fusion 360 tool libraries and maps them to PRISM's
 * ToolCatalogEngine format. Bidirectional: also exports PRISM tools
 * as Fusion-compatible JSON.
 *
 * @module engines/FusionToolLibraryExtractorEngine
 */

import { log } from "../utils/Logger.js";
import type { CAMToolExtract } from "./FusionCAMExtractorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FusionToolLibrary {
  name: string;
  source: "fusion_cloud" | "fusion_local" | "cam_extraction" | "manual";
  tools: FusionToolEntry[];
  extracted_at: string;
}

export interface FusionToolEntry {
  description: string;
  type: string;
  diameter_mm: number;
  flute_count: number;
  flute_length_mm: number | null;
  overall_length_mm: number | null;
  corner_radius_mm: number | null;
  helix_angle_deg: number | null;
  shank_diameter_mm: number | null;
  holder: string | null;
  /** Programs/setups where this tool was used */
  usage_count: number;
  usage_programs: string[];
  /** Speed/feed data from Fusion CAM setups */
  speed_feed_presets: Array<{
    material_hint: string | null;
    rpm: number;
    feed_mm_min: number;
    stepdown_mm: number | null;
    stepover_mm: number | null;
  }>;
}

export interface PRISMToolMapping {
  fusion_description: string;
  fusion_type: string;
  prism_tool_type: string;
  prism_catalog_match: string | null;
  diameter_mm: number;
  confidence: number;
}

export interface ToolLibraryExtractionResult {
  library: FusionToolLibrary;
  prism_mappings: PRISMToolMapping[];
  unmapped_count: number;
  duplicate_count: number;
}

// ============================================================================
// TOOL TYPE MAPPING
// ============================================================================

const FUSION_TO_PRISM_TYPE: Record<string, string> = {
  "flat end mill": "endmill_flat",
  "ball end mill": "endmill_ball",
  "bull nose end mill": "endmill_bullnose",
  "face mill": "facemill",
  "drill": "drill_twist",
  "spot drill": "drill_spot",
  "center drill": "drill_center",
  "tap": "tap",
  "reamer": "reamer",
  "boring bar": "boring_bar",
  "chamfer mill": "chamfer_mill",
  "slot mill": "slot_mill",
  "thread mill": "thread_mill",
  "dovetail": "dovetail_cutter",
  "lollipop": "endmill_lollipop",
  "form tool": "form_tool",
};

// ============================================================================
// ENGINE
// ============================================================================

export class FusionToolLibraryExtractorEngine {
  /**
   * Build a tool library from CAM extraction results.
   * Deduplicates tools by type + diameter and aggregates usage data.
   */
  buildFromCAMData(
    camTools: Array<{ tool: CAMToolExtract; program: string; speed_feed?: { rpm: number; feed_mm_min: number; stepdown_mm?: number; stepover_mm?: number } }>,
    libraryName = "JM Die Shop Library",
  ): ToolLibraryExtractionResult {
    const toolMap = new Map<string, FusionToolEntry>();
    let duplicateCount = 0;

    for (const { tool, program, speed_feed } of camTools) {
      const key = `${tool.type}_${tool.diameter_mm.toFixed(3)}`;
      const existing = toolMap.get(key);

      if (existing) {
        duplicateCount++;
        existing.usage_count++;
        if (!existing.usage_programs.includes(program)) {
          existing.usage_programs.push(program);
        }
        if (speed_feed) {
          existing.speed_feed_presets.push({
            material_hint: null,
            rpm: speed_feed.rpm,
            feed_mm_min: speed_feed.feed_mm_min,
            stepdown_mm: speed_feed.stepdown_mm ?? null,
            stepover_mm: speed_feed.stepover_mm ?? null,
          });
        }
      } else {
        const entry: FusionToolEntry = {
          description: tool.description,
          type: tool.type,
          diameter_mm: tool.diameter_mm,
          flute_count: tool.flute_count,
          flute_length_mm: null,
          overall_length_mm: null,
          corner_radius_mm: null,
          helix_angle_deg: null,
          shank_diameter_mm: null,
          holder: null,
          usage_count: 1,
          usage_programs: [program],
          speed_feed_presets: speed_feed ? [{
            material_hint: null,
            rpm: speed_feed.rpm,
            feed_mm_min: speed_feed.feed_mm_min,
            stepdown_mm: speed_feed.stepdown_mm ?? null,
            stepover_mm: speed_feed.stepover_mm ?? null,
          }] : [],
        };
        toolMap.set(key, entry);
      }
    }

    const tools = Array.from(toolMap.values());
    const library: FusionToolLibrary = {
      name: libraryName,
      source: "cam_extraction",
      tools,
      extracted_at: new Date().toISOString(),
    };

    const prismMappings = tools.map(t => this._mapToPRISM(t));
    const unmapped = prismMappings.filter(m => m.confidence < 0.5).length;

    log.info(`[FusionToolLibraryExtractor] Built library "${libraryName}": ` +
      `${tools.length} unique tools, ${duplicateCount} duplicates merged, ${unmapped} unmapped`);

    return {
      library,
      prism_mappings: prismMappings,
      unmapped_count: unmapped,
      duplicate_count: duplicateCount,
    };
  }

  /**
   * Map a Fusion tool type to PRISM's tool catalog type system.
   */
  private _mapToPRISM(tool: FusionToolEntry): PRISMToolMapping {
    const fusionType = tool.type.toLowerCase();
    const prismType = FUSION_TO_PRISM_TYPE[fusionType] ?? "unknown";
    const confidence = prismType !== "unknown" ? 0.95 : 0.2;

    return {
      fusion_description: tool.description,
      fusion_type: tool.type,
      prism_tool_type: prismType,
      prism_catalog_match: null,
      diameter_mm: tool.diameter_mm,
      confidence,
    };
  }
}

// Singleton
export const fusionToolLibraryExtractorEngine = new FusionToolLibraryExtractorEngine();
