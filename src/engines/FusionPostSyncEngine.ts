/**
 * FusionPostSyncEngine — Analyze Fusion 360 .cps post processor files
 *
 * Reads .cps (JavaScript post processor) files from the Fusion POST PROCESSORS folder.
 * Extracts custom modifications made by the shop to identify gaps between
 * Fusion's default post and the shop's customized version.
 *
 * Feeds differences into PRISM's post engine so output matches shop Fusion customizations.
 *
 * @module FusionPostSyncEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Extracted customization from a .cps file */
export interface CpsCustomization {
  /** Type of customization */
  type: "property" | "function_override" | "gcode_map" | "mcode_map" |
        "format_change" | "safety_addition" | "comment_style";
  /** Name/identifier */
  name: string;
  /** Value or code snippet */
  value: string;
  /** Line number in .cps file */
  line: number;
  /** Whether this is a deviation from Fusion default */
  is_custom: boolean;
  /** Description */
  description: string;
}

/** Post processor profile extracted from .cps */
export interface CpsProfile {
  /** Filename */
  filename: string;
  /** Machine type this post targets */
  machine_type: string;
  /** Controller family detected */
  controller: string;
  /** Properties (user-configurable settings in Fusion) */
  properties: Array<{
    name: string;
    value: string | number | boolean;
    description: string;
  }>;
  /** Custom G-code mappings */
  gcode_overrides: Array<{ standard: string; custom: string; reason: string }>;
  /** Custom M-code mappings */
  mcode_overrides: Array<{ standard: string; custom: string; reason: string }>;
  /** Format customizations */
  format_customizations: CpsCustomization[];
  /** Total customizations found */
  total_customizations: number;
}

/** Sync input */
export interface FusionPostSyncInput {
  /** Content of the .cps file */
  cps_content: string;
  /** Filename */
  filename: string;
}

/** Sync result */
export interface FusionPostSyncResult {
  /** Extracted profile */
  profile: CpsProfile;
  /** Recommendations for PRISM post engine */
  recommendations: string[];
  /** Gaps between Fusion default and shop custom */
  gaps: Array<{
    area: string;
    fusion_default: string;
    shop_custom: string;
    impact: string;
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class FusionPostSyncEngine {
  /**
   * Analyze a .cps file and extract customizations.
   */
  analyze(input: FusionPostSyncInput): FusionPostSyncResult {
    const lines = input.cps_content.split("\n");
    const properties = this._extractProperties(lines);
    const gcodeOverrides = this._extractGCodeOverrides(lines);
    const mcodeOverrides = this._extractMCodeOverrides(lines);
    const formatCustom = this._extractFormatCustomizations(lines);
    const machineType = this._detectMachineType(input.filename, lines);
    const controller = this._detectController(lines);

    const profile: CpsProfile = {
      filename: input.filename,
      machine_type: machineType,
      controller,
      properties,
      gcode_overrides: gcodeOverrides,
      mcode_overrides: mcodeOverrides,
      format_customizations: formatCustom,
      total_customizations: properties.length + gcodeOverrides.length +
        mcodeOverrides.length + formatCustom.length,
    };

    const recommendations = this._generateRecommendations(profile);
    const gaps = this._identifyGaps(profile);

    log.info(
      `[FusionPostSync] ${input.filename}: ${profile.total_customizations} customizations, ` +
      `${gaps.length} gaps, ${recommendations.length} recommendations`,
    );

    return { profile, recommendations, gaps };
  }

  // ── Private ─────────────────────────────────────────────────────────

  /** Extract user-configurable properties from .cps */
  private _extractProperties(lines: string[]): CpsProfile["properties"] {
    const props: CpsProfile["properties"] = [];

    for (let i = 0; i < lines.length; i++) {
      // Fusion CPS property pattern: properties.propertyName = { ... }
      // or: new BooleanProperty("name", ...)
      const propMatch = lines[i].match(
        /properties\.\s*(\w+)\s*=\s*(?:new\s+\w+Property\()?\s*["']?([^"'\n,)]+)/,
      );
      if (propMatch) {
        props.push({
          name: propMatch[1],
          value: propMatch[2].trim(),
          description: this._extractComment(lines, i),
        });
        continue;
      }

      // Also catch: var prop = machineConfiguration.getProperty(...)
      const getMatch = lines[i].match(
        /getProperty\(\s*["'](\w+)["']\s*(?:,\s*(.+?))?\)/,
      );
      if (getMatch) {
        props.push({
          name: getMatch[1],
          value: getMatch[2]?.trim() ?? "default",
          description: this._extractComment(lines, i),
        });
      }
    }

    return props;
  }

  /** Extract G-code overrides/mappings */
  private _extractGCodeOverrides(lines: string[]): CpsProfile["gcode_overrides"] {
    const overrides: CpsProfile["gcode_overrides"] = [];

    for (const line of lines) {
      // Pattern: gMotionModal.format(1) → custom mapping
      // or: writeBlock(gFormat.format(85)) — using non-standard G-code
      const gMatch = line.match(/gFormat\.format\((\d+)\)/);
      if (gMatch) {
        const code = parseInt(gMatch[1], 10);
        // Flag non-standard codes (G85, G87, G71 on Okuma)
        if ([85, 87, 83].includes(code)) {
          overrides.push({
            standard: `G${code < 10 ? "0" + code : code}`,
            custom: `G${code}`,
            reason: "Okuma-specific cycle code",
          });
        }
      }
    }

    return overrides;
  }

  /** Extract M-code overrides */
  private _extractMCodeOverrides(lines: string[]): CpsProfile["mcode_overrides"] {
    const overrides: CpsProfile["mcode_overrides"] = [];

    for (const line of lines) {
      const mMatch = line.match(/mFormat\.format\((\d+)\)/);
      if (mMatch) {
        const code = parseInt(mMatch[1], 10);
        if (code >= 100) {
          overrides.push({
            standard: `M${code}`,
            custom: `M${code}`,
            reason: "Machine-specific M-code",
          });
        }
      }
    }

    return overrides;
  }

  /** Extract format customizations */
  private _extractFormatCustomizations(lines: string[]): CpsCustomization[] {
    const customs: CpsCustomization[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Tool code format
      if (/createFormat.*tool/i.test(line)) {
        customs.push({
          type: "format_change",
          name: "tool_format",
          value: line.trim(),
          line: i + 1,
          is_custom: true,
          description: "Custom tool number format",
        });
      }

      // Coordinate format (decimal places)
      if (/createFormat.*decimals/i.test(line)) {
        customs.push({
          type: "format_change",
          name: "coordinate_format",
          value: line.trim(),
          line: i + 1,
          is_custom: true,
          description: "Custom coordinate decimal format",
        });
      }

      // Safety additions (custom safety blocks)
      if (/writeBlock.*[Ss]afe|[Rr]etract|[Hh]ome/i.test(line)) {
        customs.push({
          type: "safety_addition",
          name: "safety_block",
          value: line.trim(),
          line: i + 1,
          is_custom: true,
          description: "Custom safety retract/home code",
        });
      }
    }

    return customs;
  }

  /** Detect machine type from filename and content */
  private _detectMachineType(filename: string, lines: string[]): string {
    const upper = filename.toUpperCase();
    if (upper.includes("OKUMA")) return "Okuma lathe/mill";
    if (upper.includes("HAAS")) return "Haas mill";
    if (upper.includes("HURCO")) return "Hurco mill";

    // Check content for machine references
    const content = lines.slice(0, 50).join(" ").toLowerCase();
    if (content.includes("turning") || content.includes("lathe")) return "Lathe";
    if (content.includes("mill") || content.includes("3-axis")) return "Mill";
    return "Unknown";
  }

  /** Detect controller from content */
  private _detectController(lines: string[]): string {
    const content = lines.join(" ").toLowerCase();
    if (content.includes("osp") || content.includes("okuma")) return "Okuma OSP";
    if (content.includes("haas") || content.includes("ngc")) return "Haas NGC";
    if (content.includes("fanuc")) return "Fanuc";
    if (content.includes("mitsubishi")) return "Mitsubishi";
    return "Generic";
  }

  /** Extract nearby comment for context */
  private _extractComment(lines: string[], lineIdx: number): string {
    // Check line itself and previous line for comments
    for (let i = lineIdx; i >= Math.max(0, lineIdx - 2); i--) {
      const cmatch = lines[i].match(/\/\/\s*(.+)|\/\*\s*(.+?)\s*\*\//);
      if (cmatch) return (cmatch[1] ?? cmatch[2]).trim();
    }
    return "";
  }

  /** Generate recommendations for PRISM post engine */
  private _generateRecommendations(profile: CpsProfile): string[] {
    const recs: string[] = [];

    if (profile.gcode_overrides.length > 0) {
      recs.push(
        `Apply ${profile.gcode_overrides.length} G-code overrides to match shop's Fusion post ` +
        `(${profile.gcode_overrides.map(o => o.standard).join(", ")})`,
      );
    }

    if (profile.mcode_overrides.length > 0) {
      recs.push(
        `Map ${profile.mcode_overrides.length} machine-specific M-codes ` +
        `(${profile.mcode_overrides.map(o => o.standard).join(", ")})`,
      );
    }

    for (const prop of profile.properties) {
      recs.push(`Set post property "${prop.name}" = ${prop.value}`);
    }

    return recs;
  }

  /** Identify gaps between Fusion default and shop custom */
  private _identifyGaps(profile: CpsProfile): FusionPostSyncResult["gaps"] {
    const gaps: FusionPostSyncResult["gaps"] = [];

    for (const override of profile.gcode_overrides) {
      gaps.push({
        area: "G-code dialect",
        fusion_default: `Standard ${override.standard}`,
        shop_custom: `${override.custom} (${override.reason})`,
        impact: "PRISM must use shop dialect for this code",
      });
    }

    for (const custom of profile.format_customizations) {
      gaps.push({
        area: custom.name,
        fusion_default: "Fusion default format",
        shop_custom: custom.description,
        impact: "Match format for production acceptance",
      });
    }

    return gaps;
  }
}

export const fusionPostSyncEngine = new FusionPostSyncEngine();
