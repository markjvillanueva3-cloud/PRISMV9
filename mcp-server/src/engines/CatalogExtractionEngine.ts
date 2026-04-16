/**
 * CatalogExtractionEngine.ts
 *
 * PDF-EXT-MS1: Catalog Extraction Sprint
 *
 * Extracts cutting data from manufacturer catalogs:
 * - Sandvik: speeds, feeds, grades, geometries
 * - Kennametal: turning data, milling data
 * - Walter: ISO-based recommendations
 * - ISCAR: application data
 *
 * Merges with existing catalog data, resolving conflicts
 * via authority ranking (manufacturer > handbook > calculated).
 *
 * @module engines/CatalogExtractionEngine
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/Logger.js";
import {
  resourceExtractionStateEngine,
  type ResourceEntry,
  type ExtractionResult,
} from "./ResourceExtractionStateEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CatalogTool {
  id: string;
  manufacturer: string;
  designation: string;
  type: ToolType;
  geometry: ToolGeometry;
  cuttingData?: CuttingDataSet[];
  materials?: string[];
  coatings?: string[];
  applications?: string[];
  source: DataSource;
}

export type ToolType =
  | "end_mill"
  | "ball_mill"
  | "drill"
  | "tap"
  | "reamer"
  | "boring_bar"
  | "turning_insert"
  | "milling_insert"
  | "thread_mill"
  | "chamfer_mill"
  | "face_mill"
  | "slitting_saw";

export interface ToolGeometry {
  diameter_mm: number;
  shank_diameter_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  corner_radius_mm?: number;
  flute_count?: number;
  helix_angle_deg?: number;
  rake_angle_deg?: number;
  relief_angle_deg?: number;
  point_angle_deg?: number;
  nose_radius_mm?: number;
  insert_size?: string;
}

export interface CuttingDataSet {
  isoGroup: "P" | "M" | "K" | "N" | "S" | "H";
  operation?: string;
  Vc_min_mpm?: number;
  Vc_max_mpm?: number;
  Vc_recommended_mpm?: number;
  fz_min_mm?: number;
  fz_max_mm?: number;
  fz_recommended_mm?: number;
  ap_max_mm?: number;
  ae_max_mm?: number;
  conditions?: string;
  coolant?: "flood" | "mist" | "air" | "dry" | "through_tool";
  source: DataSource;
}

export interface DataSource {
  type: "manufacturer" | "handbook" | "calculated" | "user";
  catalog?: string;
  page?: number;
  extractedAt?: string;
  confidence?: number;
}

export interface MergeResult {
  action: "added" | "updated" | "skipped" | "conflict";
  toolId: string;
  reason?: string;
  previousSource?: DataSource;
  newSource?: DataSource;
}

export interface ExtractionOptions {
  manufacturer: string;
  catalogPath?: string;
  mergeStrategy: "prefer_new" | "prefer_existing" | "prefer_manufacturer" | "merge_all";
  minConfidence?: number;
  dryRun?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTHORITY RANKING
// ═══════════════════════════════════════════════════════════════════════════

const AUTHORITY_RANK: Record<DataSource["type"], number> = {
  manufacturer: 100,   // Highest authority
  handbook: 80,        // Trusted reference
  calculated: 60,      // Physics-based estimate
  user: 40,            // User-provided (may be shop-specific)
};

const MANUFACTURER_PRIORITY: Record<string, number> = {
  sandvik: 100,
  kennametal: 95,
  walter: 90,
  iscar: 90,
  seco: 85,
  mitsubishi: 85,
  tungaloy: 80,
  kyocera: 80,
  sumitomo: 75,
  horn: 75,
  guhring: 70,
  osg: 70,
  emuge: 70,
  dormer: 65,
  widia: 65,
  ingersoll: 60,
  sgs: 55,
  helical: 50,
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const CUTTING_DATA_PATTERNS = {
  // Speed patterns (m/min or sfm)
  speed: [
    /Vc\s*[:=]?\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*m\/min/gi,
    /cutting\s*speed\s*[:=]?\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/gi,
    /(\d+)\s*[-–]\s*(\d+)\s*m\/min/g,
    /(\d+)\s*[-–]\s*(\d+)\s*sfm/gi,
  ],

  // Feed patterns (mm/tooth or mm/rev)
  feed: [
    /fz\s*[:=]?\s*(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*mm/gi,
    /feed\s*[:=]?\s*(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/gi,
    /(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*mm\/(?:tooth|z)/gi,
    /(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*mm\/rev/gi,
  ],

  // Depth patterns
  depth: [
    /ap\s*(?:max)?\s*[:=]?\s*(\d+\.?\d*)\s*mm/gi,
    /ae\s*(?:max)?\s*[:=]?\s*(\d+\.?\d*)\s*mm/gi,
    /depth\s*[:=]?\s*(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/gi,
  ],

  // ISO material group
  isoGroup: [
    /\b([PMKNSH])\s*(?:steel|stainless|cast|aluminum|super|hard)/gi,
    /ISO\s*([PMKNSH])/gi,
    /material\s*group\s*[:=]?\s*([PMKNSH])/gi,
  ],

  // Tool designation
  designation: [
    /([A-Z0-9]{4,20}(?:-[A-Z0-9]+)*)/g,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class CatalogExtractionEngine {
  private outputDir: string;
  private extractedTools: Map<string, CatalogTool> = new Map();
  private existingCatalogs: Map<string, number> = new Map(); // manufacturer -> tool count

  constructor() {
    this.outputDir = path.join(process.cwd(), "data", "catalog-extractions");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    await this.loadExistingCatalogCounts();
    logger.info("[CatalogExtraction] Engine initialized");
  }

  // ─── Load Existing Catalog Counts ──────────────────────────────────────

  private async loadExistingCatalogCounts(): Promise<void> {
    const dataDir = path.join(process.cwd(), "src", "data");

    const catalogFiles = [
      { file: "sandvik-tool-catalog.ts", manufacturer: "sandvik" },
      { file: "sandvik-2022-tool-catalog.ts", manufacturer: "sandvik" },
      { file: "sandvik-2018-rotating-catalog.ts", manufacturer: "sandvik" },
      { file: "kennametal-turning-catalog.ts", manufacturer: "kennametal" },
      { file: "kennametal-tooling-systems-catalog.ts", manufacturer: "kennametal" },
      { file: "tungaloy-tooling-catalog.ts", manufacturer: "tungaloy" },
      { file: "guhring-tool-catalog.ts", manufacturer: "guhring" },
      { file: "osg-tool-catalog.ts", manufacturer: "osg" },
      { file: "emuge-tool-catalog.ts", manufacturer: "emuge" },
      { file: "ingersoll-tool-catalog.ts", manufacturer: "ingersoll" },
      { file: "sgs-tool-catalog.ts", manufacturer: "sgs" },
      { file: "helical-tool-catalog.ts", manufacturer: "helical" },
      { file: "dormer-pramet-tool-catalog.ts", manufacturer: "dormer" },
      { file: "horn-tool-catalog.ts", manufacturer: "horn" },
      { file: "widia-2022-inch-catalog.ts", manufacturer: "widia" },
    ];

    for (const { file, manufacturer } of catalogFiles) {
      try {
        const content = await fs.readFile(path.join(dataDir, file), "utf-8");
        // Count array entries (rough estimate)
        const matches = content.match(/\{designation:/g);
        const count = matches?.length || 0;

        const existing = this.existingCatalogs.get(manufacturer) || 0;
        this.existingCatalogs.set(manufacturer, existing + count);
      } catch {
        // File doesn't exist
      }
    }

    logger.info(
      `[CatalogExtraction] Found existing catalogs: ${JSON.stringify(
        Object.fromEntries(this.existingCatalogs)
      )}`
    );
  }

  // ─── Main Extraction ───────────────────────────────────────────────────

  async extractFromPDF(
    resourceId: string,
    text: string,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const tools: CatalogTool[] = [];
    const errors: string[] = [];

    try {
      // Update state to extracting
      resourceExtractionStateEngine.updateStatus(resourceId, "extracting");

      // Parse text for cutting data tables
      const extractedData = this.parseContent(text, options.manufacturer);

      for (const data of extractedData) {
        const tool = this.createCatalogTool(data, options);
        if (tool) {
          tools.push(tool);
          this.extractedTools.set(tool.id, tool);
        }
      }

      // Save extracted data
      if (tools.length > 0 && !options.dryRun) {
        await this.saveExtracted(options.manufacturer, tools);
      }

      const result: ExtractionResult = {
        success: true,
        extractedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        counts: {
          tools: tools.length,
        },
        errors: errors.length > 0 ? errors : undefined,
        outputFiles: tools.length > 0
          ? [path.join(this.outputDir, `${options.manufacturer}-extracted.json`)]
          : undefined,
        targetRegistries: ["ToolRegistry"],
      };

      resourceExtractionStateEngine.updateStatus(resourceId, "extracted", result);

      logger.info(
        `[CatalogExtraction] Extracted ${tools.length} tools from ${options.manufacturer}`
      );

      return result;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      errors.push(error);

      const result: ExtractionResult = {
        success: false,
        extractedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        counts: { tools: 0 },
        errors,
      };

      resourceExtractionStateEngine.updateStatus(resourceId, "failed", result);

      return result;
    }
  }

  // ─── Content Parsing ───────────────────────────────────────────────────

  private parseContent(
    text: string,
    manufacturer: string
  ): Array<{
    designation: string;
    cuttingData: Partial<CuttingDataSet>;
    geometry: Partial<ToolGeometry>;
  }> {
    const results: Array<{
      designation: string;
      cuttingData: Partial<CuttingDataSet>;
      geometry: Partial<ToolGeometry>;
    }> = [];

    // Split into sections (by page markers or large gaps)
    const sections = text.split(/\f|\n{4,}/);

    for (const section of sections) {
      // Extract tool designations
      const designations = this.extractDesignations(section, manufacturer);

      for (const designation of designations) {
        const cuttingData = this.extractCuttingData(section);
        const geometry = this.extractGeometry(section, designation);

        if (Object.keys(cuttingData).length > 0 || Object.keys(geometry).length > 0) {
          results.push({ designation, cuttingData, geometry });
        }
      }
    }

    return results;
  }

  private extractDesignations(text: string, manufacturer: string): string[] {
    const designations: Set<string> = new Set();

    // Manufacturer-specific patterns
    const patterns: Record<string, RegExp[]> = {
      sandvik: [
        /\b([A-Z]\d{1,2}[A-Z0-9]{2,}(?:-[A-Z0-9]+)*)\b/g,
        /\b(CNMG|DNMG|TNMG|VNMG|WNMG)\d{6}[A-Z]{2,}/g,
      ],
      kennametal: [
        /\b(K[A-Z]{2,}\d{2,}[A-Z0-9]*)\b/g,
        /\b(CNMG|DNMG|TNMG)\d+[A-Z]+\b/g,
      ],
      walter: [
        /\b(F\d{4}[A-Z0-9]+)\b/g,
        /\b(P\d{4}[A-Z0-9]+)\b/g,
      ],
      iscar: [
        /\b(IC\d{3,})\b/g,
        /\b([A-Z]{3,}\d{2,}[A-Z0-9]*)\b/g,
      ],
    };

    const mfrPatterns = patterns[manufacturer.toLowerCase()] || [];

    for (const pattern of mfrPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length >= 4) {
          designations.add(match[1]);
        }
      }
    }

    return Array.from(designations);
  }

  private extractCuttingData(text: string): Partial<CuttingDataSet> {
    const data: Partial<CuttingDataSet> = {};

    // Extract speed range
    for (const pattern of CUTTING_DATA_PATTERNS.speed) {
      const match = text.match(pattern);
      if (match) {
        let min = parseFloat(match[1]);
        let max = parseFloat(match[2]);

        // Convert SFM to m/min if needed
        if (/sfm/i.test(match[0])) {
          min *= 0.3048;
          max *= 0.3048;
        }

        data.Vc_min_mpm = min;
        data.Vc_max_mpm = max;
        data.Vc_recommended_mpm = (min + max) / 2;
        break;
      }
    }

    // Extract feed range
    for (const pattern of CUTTING_DATA_PATTERNS.feed) {
      const match = text.match(pattern);
      if (match) {
        data.fz_min_mm = parseFloat(match[1]);
        data.fz_max_mm = parseFloat(match[2]);
        data.fz_recommended_mm = (data.fz_min_mm + data.fz_max_mm) / 2;
        break;
      }
    }

    // Extract depth
    for (const pattern of CUTTING_DATA_PATTERNS.depth) {
      const match = text.match(pattern);
      if (match) {
        if (match[0].toLowerCase().includes("ae")) {
          data.ae_max_mm = parseFloat(match[1]);
        } else {
          data.ap_max_mm = parseFloat(match[1]);
        }
      }
    }

    // Extract ISO group
    for (const pattern of CUTTING_DATA_PATTERNS.isoGroup) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.isoGroup = match[1].toUpperCase() as CuttingDataSet["isoGroup"];
        break;
      }
    }

    return data;
  }

  private extractGeometry(text: string, designation: string): Partial<ToolGeometry> {
    const geometry: Partial<ToolGeometry> = {};

    // Extract diameter (look near designation)
    const diameterMatch = text.match(
      new RegExp(`${designation}[^\\n]*?(\\d+(?:\\.\\d+)?)\\s*mm`, "i")
    );
    if (diameterMatch) {
      geometry.diameter_mm = parseFloat(diameterMatch[1]);
    }

    // Extract from designation encoding (common patterns)
    // e.g., W4N1M10005RJT -> 10mm diameter
    const sizeMatch = designation.match(/(\d{2})(?:\d{3})/);
    if (sizeMatch && !geometry.diameter_mm) {
      geometry.diameter_mm = parseFloat(sizeMatch[1]);
    }

    // Extract flute count
    const fluteMatch = text.match(/(\d)\s*flute/i);
    if (fluteMatch) {
      geometry.flute_count = parseInt(fluteMatch[1]);
    }

    // Extract corner radius
    const radiusMatch = text.match(/r(?:adius)?\s*[:=]?\s*(\d+\.?\d*)/i);
    if (radiusMatch) {
      geometry.corner_radius_mm = parseFloat(radiusMatch[1]);
    }

    return geometry;
  }

  private createCatalogTool(
    data: {
      designation: string;
      cuttingData: Partial<CuttingDataSet>;
      geometry: Partial<ToolGeometry>;
    },
    options: ExtractionOptions
  ): CatalogTool | null {
    // Must have at least designation and some geometry
    if (!data.designation || !data.geometry.diameter_mm) {
      return null;
    }

    const source: DataSource = {
      type: "manufacturer",
      catalog: options.catalogPath,
      extractedAt: new Date().toISOString(),
      confidence: 0.85,
    };

    const tool: CatalogTool = {
      id: `${options.manufacturer}-${data.designation}`.toLowerCase(),
      manufacturer: options.manufacturer,
      designation: data.designation,
      type: this.inferToolType(data.designation, data.geometry),
      geometry: data.geometry as ToolGeometry,
      source,
    };

    // Add cutting data if present
    if (Object.keys(data.cuttingData).length > 0) {
      tool.cuttingData = [
        {
          ...data.cuttingData,
          isoGroup: data.cuttingData.isoGroup || "P",
          source,
        } as CuttingDataSet,
      ];
    }

    return tool;
  }

  private inferToolType(designation: string, geometry: Partial<ToolGeometry>): ToolType {
    const d = designation.toUpperCase();

    if (/CNMG|DNMG|TNMG|VNMG|WNMG/.test(d)) return "turning_insert";
    if (/APMT|APKT|SDMT/.test(d)) return "milling_insert";
    if (/DRILL|DR/.test(d)) return "drill";
    if (/TAP|TC/.test(d)) return "tap";
    if (/REAM/.test(d)) return "reamer";
    if (/BALL/.test(d) || (geometry.corner_radius_mm && geometry.corner_radius_mm === geometry.diameter_mm! / 2)) {
      return "ball_mill";
    }
    if (/BORE|BAR/.test(d)) return "boring_bar";
    if (/THREAD/.test(d)) return "thread_mill";
    if (/CHAMFER/.test(d)) return "chamfer_mill";
    if (/FACE/.test(d)) return "face_mill";

    return "end_mill";
  }

  // ─── Merging ───────────────────────────────────────────────────────────

  async mergeWithExisting(
    manufacturer: string,
    strategy: ExtractionOptions["mergeStrategy"] = "prefer_manufacturer"
  ): Promise<MergeResult[]> {
    const results: MergeResult[] = [];
    const extractedFile = path.join(this.outputDir, `${manufacturer}-extracted.json`);

    try {
      const content = await fs.readFile(extractedFile, "utf-8");
      const extracted = JSON.parse(content) as { tools: CatalogTool[] };

      for (const tool of extracted.tools) {
        const result = await this.mergeTool(tool, strategy);
        results.push(result);
      }

      // Update state to merged
      const stats = {
        added: results.filter(r => r.action === "added").length,
        updated: results.filter(r => r.action === "updated").length,
        skipped: results.filter(r => r.action === "skipped").length,
        conflicts: results.filter(r => r.action === "conflict").length,
      };

      logger.info(
        `[CatalogExtraction] Merge complete: ${stats.added} added, ` +
          `${stats.updated} updated, ${stats.skipped} skipped, ${stats.conflicts} conflicts`
      );
    } catch (e) {
      logger.error(`[CatalogExtraction] Merge failed: ${e}`);
    }

    return results;
  }

  private async mergeTool(
    tool: CatalogTool,
    strategy: ExtractionOptions["mergeStrategy"]
  ): Promise<MergeResult> {
    const existingTool = this.extractedTools.get(tool.id);

    if (!existingTool) {
      this.extractedTools.set(tool.id, tool);
      return { action: "added", toolId: tool.id };
    }

    // Compare authority
    const existingRank = this.calculateAuthorityRank(existingTool.source);
    const newRank = this.calculateAuthorityRank(tool.source);

    switch (strategy) {
      case "prefer_new":
        this.extractedTools.set(tool.id, tool);
        return {
          action: "updated",
          toolId: tool.id,
          previousSource: existingTool.source,
          newSource: tool.source,
        };

      case "prefer_existing":
        return {
          action: "skipped",
          toolId: tool.id,
          reason: "Existing entry preserved",
        };

      case "prefer_manufacturer":
        if (newRank > existingRank) {
          this.extractedTools.set(tool.id, tool);
          return {
            action: "updated",
            toolId: tool.id,
            reason: `New source (${newRank}) > existing (${existingRank})`,
            previousSource: existingTool.source,
            newSource: tool.source,
          };
        }
        return {
          action: "skipped",
          toolId: tool.id,
          reason: `Existing source (${existingRank}) >= new (${newRank})`,
        };

      case "merge_all":
        // Merge cutting data sets
        if (tool.cuttingData && existingTool.cuttingData) {
          const merged = [...existingTool.cuttingData];
          for (const newData of tool.cuttingData) {
            const existing = merged.find(d => d.isoGroup === newData.isoGroup);
            if (!existing) {
              merged.push(newData);
            }
          }
          existingTool.cuttingData = merged;
        }
        return {
          action: "updated",
          toolId: tool.id,
          reason: "Merged cutting data",
        };

      default:
        return {
          action: "conflict",
          toolId: tool.id,
          reason: "Unknown merge strategy",
        };
    }
  }

  private calculateAuthorityRank(source: DataSource): number {
    let rank = AUTHORITY_RANK[source.type] || 0;

    if (source.catalog) {
      const mfr = source.catalog.split("/").pop()?.split("-")[0]?.toLowerCase() || "";
      rank += (MANUFACTURER_PRIORITY[mfr] || 0) / 10;
    }

    if (source.confidence) {
      rank *= source.confidence;
    }

    return rank;
  }

  // ─── Save/Export ───────────────────────────────────────────────────────

  private async saveExtracted(manufacturer: string, tools: CatalogTool[]): Promise<void> {
    const outputFile = path.join(this.outputDir, `${manufacturer}-extracted.json`);

    await fs.writeFile(
      outputFile,
      JSON.stringify(
        {
          manufacturer,
          extractedAt: new Date().toISOString(),
          toolCount: tools.length,
          tools,
        },
        null,
        2
      )
    );

    logger.info(`[CatalogExtraction] Saved ${tools.length} tools to ${outputFile}`);
  }

  async exportToTypeScript(manufacturer: string): Promise<string> {
    const tools = Array.from(this.extractedTools.values()).filter(
      t => t.manufacturer.toLowerCase() === manufacturer.toLowerCase()
    );

    if (tools.length === 0) {
      return "";
    }

    const lines = [
      `// Auto-generated by CatalogExtractionEngine - ${new Date().toISOString()}`,
      `// Manufacturer: ${manufacturer}`,
      `// Total: ${tools.length} tools`,
      "",
      `export interface ${manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1)}Tool {`,
      "  designation: string;",
      '  type: "end_mill" | "drill" | "turning_insert" | "milling_insert";',
      "  diameter_mm: number;",
      "  corner_radius_mm?: number;",
      "  flute_count?: number;",
      "  Vc_min_mpm?: number;",
      "  Vc_max_mpm?: number;",
      "  fz_recommended_mm?: number;",
      "}",
      "",
      `export const ${manufacturer.toUpperCase()}_TOOLS: ${
        manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1)
      }Tool[] = [`,
    ];

    for (const tool of tools) {
      const cd = tool.cuttingData?.[0];
      const entry = {
        designation: tool.designation,
        type: tool.type,
        diameter_mm: tool.geometry.diameter_mm,
        corner_radius_mm: tool.geometry.corner_radius_mm,
        flute_count: tool.geometry.flute_count,
        Vc_min_mpm: cd?.Vc_min_mpm,
        Vc_max_mpm: cd?.Vc_max_mpm,
        fz_recommended_mm: cd?.fz_recommended_mm,
      };

      const json = JSON.stringify(entry);
      lines.push(`  ${json},`);
    }

    lines.push("];", "");

    return lines.join("\n");
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  getStats(): {
    extractedCount: number;
    byManufacturer: Record<string, number>;
    existingCounts: Record<string, number>;
    withCuttingData: number;
  } {
    const byManufacturer: Record<string, number> = {};
    let withCuttingData = 0;

    for (const tool of this.extractedTools.values()) {
      const mfr = tool.manufacturer.toLowerCase();
      byManufacturer[mfr] = (byManufacturer[mfr] || 0) + 1;
      if (tool.cuttingData && tool.cuttingData.length > 0) {
        withCuttingData++;
      }
    }

    return {
      extractedCount: this.extractedTools.size,
      byManufacturer,
      existingCounts: Object.fromEntries(this.existingCatalogs),
      withCuttingData,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const catalogExtractionEngine = new CatalogExtractionEngine();
