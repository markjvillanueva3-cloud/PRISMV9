/**
 * ToolCalloutCardEngine — U-BOX61
 *
 * For each tool in a parsed program, generates an interactive card with:
 *   - Station number and operation description
 *   - Original insert type/radius from the program
 *   - Current S/F from the program
 *   - Suggested optimal S/F from PRISM physics
 *   - Compatibility warnings
 *   - Shop library match suggestions
 *
 * @module engines/ToolCalloutCardEngine
 */

import { log } from "../utils/Logger.js";
import type { AnalyzedTool, SpeedFeedEntry } from "./ProgramUploadAnalyzerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolCalloutCard {
  station: number;
  description: string;
  operation_types: string[];
  original_sf: {
    speed_rpm: number | null;
    css_sfm: number | null;
    feed_rate: number | null;
  };
  suggested_sf: {
    speed_rpm: number | null;
    css_sfm: number | null;
    feed_rate: number | null;
    source: string;
  } | null;
  delta_pct: {
    speed: number | null;
    feed: number | null;
  };
  insert_info: {
    type: string | null;
    nose_radius: number | null;
    grade: string | null;
  };
  shop_match: {
    matched: boolean;
    tool_id: string | null;
    tool_name: string | null;
    confidence: number;
  };
  warnings: string[];
  severity: "ok" | "advisory" | "warning" | "critical";
}

export interface ToolCalloutInput {
  tools: AnalyzedTool[];
  speed_feeds: SpeedFeedEntry[];
  material: string | null;
  machine_type: string | null;
  unit_system: "imperial" | "metric";
  /** Pre-selected shop library tools per station */
  shop_selections?: Record<number, string>;
}

export interface ToolCalloutResult {
  cards: ToolCalloutCard[];
  summary: {
    total_tools: number;
    tools_with_warnings: number;
    tools_with_shop_match: number;
    speed_delta_avg_pct: number | null;
  };
}

// ============================================================================
// INSERT EXTRACTION PATTERNS
// ============================================================================

const INSERT_PATTERNS: Array<{ pattern: RegExp; type: string; radius_group?: number }> = [
  { pattern: /CNMG\s*(\d{2})(\d{2})(\d{2})/i, type: "CNMG", radius_group: 3 },
  { pattern: /DNMG\s*(\d{2})(\d{2})(\d{2})/i, type: "DNMG", radius_group: 3 },
  { pattern: /WNMG\s*(\d{2})(\d{2})(\d{2})/i, type: "WNMG", radius_group: 3 },
  { pattern: /VNMG\s*(\d{2})(\d{2})(\d{2})/i, type: "VNMG", radius_group: 3 },
  { pattern: /TNMG\s*(\d{2})(\d{2})(\d{2})/i, type: "TNMG", radius_group: 3 },
  { pattern: /CCMT\s*(\d{2})(\d{2})(\d{2})/i, type: "CCMT", radius_group: 3 },
  { pattern: /(\d+\/\d+)\s*EM/i, type: "endmill" },
  { pattern: /(\d+\.?\d*)MM\s*EM/i, type: "endmill" },
  { pattern: /#(\d+)\s*DRILL/i, type: "drill" },
  { pattern: /(\d+\.?\d*)MM?\s*DRILL/i, type: "drill" },
  { pattern: /BORING\s*BAR/i, type: "boring_bar" },
];

const NOSE_RADIUS_MAP: Record<string, number> = {
  "02": 0.2, "04": 0.4, "08": 0.8, "12": 1.2, "16": 1.6,
};

// ============================================================================
// ENGINE
// ============================================================================

export class ToolCalloutCardEngine {
  /**
   * Generate tool callout cards from analyzed program data.
   */
  generate(input: ToolCalloutInput): ToolCalloutResult {
    const cards: ToolCalloutCard[] = [];
    const speedDeltas: number[] = [];

    for (const tool of input.tools) {
      const sf = input.speed_feeds.find(s => s.tool_station === tool.station);
      const insertInfo = this._extractInsertInfo(tool.description);
      const suggested = this._suggestSpeedFeed(tool, input.material, input.unit_system);
      const delta = this._computeDelta(sf, suggested);
      const warnings = this._generateWarnings(tool, sf, suggested, delta);

      if (delta.speed !== null) speedDeltas.push(Math.abs(delta.speed));

      const card: ToolCalloutCard = {
        station: tool.station,
        description: tool.description ?? `Tool ${tool.station}`,
        operation_types: tool.operation_types,
        original_sf: {
          speed_rpm: sf?.speed_rpm ?? tool.speed_rpm ?? null,
          css_sfm: sf?.css_sfm ?? null,
          feed_rate: sf?.feed_rate ?? tool.feed_rate ?? null,
        },
        suggested_sf: suggested,
        delta_pct: delta,
        insert_info: insertInfo,
        shop_match: {
          matched: false,
          tool_id: null,
          tool_name: null,
          confidence: 0,
        },
        warnings,
        severity: this._computeSeverity(warnings, delta),
      };

      cards.push(card);
    }

    const avgDelta = speedDeltas.length > 0
      ? Math.round(speedDeltas.reduce((a, b) => a + b, 0) / speedDeltas.length)
      : null;

    log.debug(`[ToolCalloutCard] Generated ${cards.length} cards, ` +
      `${cards.filter(c => c.warnings.length > 0).length} with warnings`);

    return {
      cards,
      summary: {
        total_tools: cards.length,
        tools_with_warnings: cards.filter(c => c.warnings.length > 0).length,
        tools_with_shop_match: cards.filter(c => c.shop_match.matched).length,
        speed_delta_avg_pct: avgDelta,
      },
    };
  }

  // ────────────────────────────────────────────────────────────────

  private _extractInsertInfo(description: string | null): ToolCalloutCard["insert_info"] {
    if (!description) return { type: null, nose_radius: null, grade: null };

    for (const pat of INSERT_PATTERNS) {
      const match = description.match(pat.pattern);
      if (match) {
        let noseRadius: number | null = null;
        if (pat.radius_group && match[pat.radius_group]) {
          noseRadius = NOSE_RADIUS_MAP[match[pat.radius_group]] ?? null;
        }
        return {
          type: pat.type,
          nose_radius: noseRadius,
          grade: null,
        };
      }
    }
    return { type: null, nose_radius: null, grade: null };
  }

  private _suggestSpeedFeed(
    tool: AnalyzedTool,
    material: string | null,
    unitSystem: string,
  ): ToolCalloutCard["suggested_sf"] | null {
    // Basic heuristic suggestions based on operation type
    // Real implementation would call SpeedFeedOrchestratorEngine
    if (!material) return null;

    const isMild = /1018|1020|1045|STEEL/i.test(material);
    const isAlum = /6061|7075|ALUMINUM/i.test(material);
    const isSS = /304|316|STAINLESS/i.test(material);

    const opType = tool.operation_types[0] ?? "unknown";
    let sfm = 0;
    let feed = 0;

    if (opType.includes("rough") || opType === "od_rough") {
      sfm = isMild ? 600 : isAlum ? 800 : isSS ? 350 : 500;
      feed = isMild ? 0.012 : isAlum ? 0.015 : isSS ? 0.008 : 0.010;
    } else if (opType.includes("finish") || opType === "od_finish") {
      sfm = isMild ? 800 : isAlum ? 1000 : isSS ? 450 : 600;
      feed = isMild ? 0.006 : isAlum ? 0.008 : isSS ? 0.004 : 0.005;
    } else if (opType.includes("drill")) {
      sfm = isMild ? 300 : isAlum ? 500 : isSS ? 200 : 250;
      feed = isMild ? 0.008 : isAlum ? 0.010 : isSS ? 0.005 : 0.006;
    } else {
      sfm = isMild ? 500 : isAlum ? 700 : isSS ? 300 : 400;
      feed = isMild ? 0.010 : isAlum ? 0.012 : isSS ? 0.006 : 0.008;
    }

    return {
      speed_rpm: null,
      css_sfm: unitSystem === "imperial" ? sfm : Math.round(sfm * 0.3048),
      feed_rate: unitSystem === "imperial" ? feed : Math.round(feed * 25.4 * 1000) / 1000,
      source: "prism_heuristic",
    };
  }

  private _computeDelta(
    original: SpeedFeedEntry | undefined,
    suggested: ToolCalloutCard["suggested_sf"] | null,
  ): ToolCalloutCard["delta_pct"] {
    if (!original || !suggested) return { speed: null, feed: null };

    const origSpeed = original.css_sfm ?? original.speed_rpm;
    const sugSpeed = suggested.css_sfm ?? suggested.speed_rpm;
    const speedDelta = (origSpeed && sugSpeed)
      ? Math.round(((sugSpeed - origSpeed) / origSpeed) * 100)
      : null;

    const origFeed = original.feed_rate;
    const sugFeed = suggested.feed_rate;
    const feedDelta = (origFeed && sugFeed)
      ? Math.round(((sugFeed - origFeed) / origFeed) * 100)
      : null;

    return { speed: speedDelta, feed: feedDelta };
  }

  private _generateWarnings(
    tool: AnalyzedTool,
    sf: SpeedFeedEntry | undefined,
    suggested: ToolCalloutCard["suggested_sf"] | null,
    delta: ToolCalloutCard["delta_pct"],
  ): string[] {
    const warnings: string[] = [];

    if (!sf?.speed_rpm && !sf?.css_sfm) {
      warnings.push("No speed value found for this tool");
    }
    if (!sf?.feed_rate) {
      warnings.push("No feed rate found for this tool");
    }
    if (delta.speed !== null && delta.speed > 50) {
      warnings.push(`Speed ${delta.speed}% above recommended — risk of tool wear`);
    }
    if (delta.speed !== null && delta.speed < -40) {
      warnings.push(`Speed ${Math.abs(delta.speed)}% below recommended — productivity loss`);
    }
    if (delta.feed !== null && delta.feed > 60) {
      warnings.push(`Feed ${delta.feed}% above recommended — risk of tool breakage`);
    }
    if (tool.has_cutter_comp && !tool.has_tlc) {
      warnings.push("Cutter comp active without TLC — verify offset setup");
    }

    return warnings;
  }

  private _computeSeverity(warnings: string[], delta: ToolCalloutCard["delta_pct"]): ToolCalloutCard["severity"] {
    if (warnings.some(w => w.includes("breakage"))) return "critical";
    if (warnings.some(w => w.includes("wear") || w.includes("No speed"))) return "warning";
    if (warnings.length > 0) return "advisory";
    return "ok";
  }
}

export const toolCalloutCardEngine = new ToolCalloutCardEngine();
