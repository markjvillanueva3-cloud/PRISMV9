/**
 * FusionToolLibraryEngine — Fusion 360 Tool Library CSV Parser
 *
 * RES-MS8 U-F360-02: Parses 7 Fusion 360 CSV tool library files from JM Die's
 * production tool crib. These are real tools used on the shop floor: turning
 * inserts, boring bars, drills, end mills — with feeds, speeds, holder info.
 *
 * Source: H:/prism/resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/
 * 7 CSV files, ~218 tools total
 *
 * @module FusionToolLibraryEngine
 */

import { readFile, readdir } from "fs/promises";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** A parsed tool from Fusion 360 CSV export. */
export interface FusionTool {
  /** Tool index from CSV */
  toolIndex: number;
  /** Preset name */
  presetName: string;
  /** Fusion tool type (turning general, drill, bull nose end mill, etc.) */
  toolType: string;
  /** Human description */
  description: string;
  /** Tool diameter in inches */
  diameterInch: number;
  /** Tool number (station) */
  toolNumber: number;
  /** Unit system */
  unit: "inches" | "mm";
  /** Holder description */
  holderDescription: string;
  /** Holder vendor */
  holderVendor: string;
  /** Tool material */
  toolMaterial: string;
  /** Number of flutes/inserts */
  fluteCount: number | null;
  /** Corner radius in inches */
  cornerRadius: number | null;
  /** Flute length in inches */
  fluteLength: number | null;
  /** Overall length in inches */
  overallLength: number | null;
  /** Feed per tooth or feed per rev */
  feedPerTooth: number | null;
  /** Cutting feedrate */
  feedCutting: number | null;
  /** Spindle speed (RPM) */
  spindleSpeed: number | null;
  /** Surface speed (SFM) */
  surfaceSpeed: number | null;
  /** Depth of cut */
  depthOfCut: number | null;
  /** Coolant type */
  coolant: string;
  /** Vendor/manufacturer */
  vendor: string;
  /** Product ID (manufacturer part number) */
  productId: string;
  /** Tip angle (for drills) */
  tipAngle: number | null;
  /** Insert shape (C, D, T, etc.) */
  insertShape: string | null;
  /** Source CSV file */
  sourceFile: string;
  /** Tool category inferred from source file */
  category: "turning" | "boring_rough" | "boring_finish" | "insert_drill" | "twist_drill" | "end_mill" | "unknown";
}

/** Result of parsing all tool library CSVs. */
export interface FusionToolLibraryResult {
  tools: FusionTool[];
  totalTools: number;
  byCategory: Record<string, number>;
  byToolType: Record<string, number>;
  byMaterial: Record<string, number>;
  byVendor: Record<string, number>;
  byFile: Record<string, number>;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOOL_LIBRARY_DIR = "H:/prism/resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY";

// Key CSV column names (Fusion 360 format)
const COL = {
  toolIndex: "Tool Index (tool_index)",
  presetName: "Preset Name (preset_name)",
  toolType: "Type (tool_type)",
  description: "Description (tool_description)",
  diameter: "Diameter (tool_diameter)",
  toolNumber: "Number (tool_number)",
  unit: "Unit (tool_unit)",
  holderDescription: "Holder Description (holder_description)",
  holderVendor: "Holder Vendor (holder_vendor)",
  material: "Material (tool_material)",
  fluteCount: "Number of Flutes (tool_numberOfFlutes)",
  cornerRadius: "Corner Radius (tool_cornerRadius)",
  fluteLength: "Flute Length (tool_fluteLength)",
  overallLength: "Overall Length (tool_overallLength)",
  feedPerTooth: "Feed per Tooth (tool_feedPerTooth)",
  feedCutting: "Cutting Feedrate (tool_feedCutting)",
  spindleSpeed: "Spindle Speed (tool_spindleSpeed)",
  surfaceSpeed: "Surface Speed (tool_surfaceSpeed)",
  depthOfCut: "Depth of Cut (tool_depthOfCut)",
  coolant: "Coolant (tool_coolant)",
  vendor: "Vendor (tool_vendor)",
  productId: "Product ID (tool_productId)",
  tipAngle: "Tip Angle (tool_tipAngle)",
  insertShape: "Shape (tool_insertType)",
};

// ============================================================================
// CSV PARSING HELPERS
// ============================================================================

/**
 * Parse a CSV line respecting quoted fields with commas inside.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseNum(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function classifyCategory(filename: string): FusionTool["category"] {
  const lower = filename.toLowerCase();
  if (lower.includes("turning")) return "turning";
  if (lower.includes("boring") && lower.includes("rough")) return "boring_rough";
  if (lower.includes("boring") && lower.includes("finish")) return "boring_finish";
  if (lower.includes("insert drill") || lower.includes("deg")) return "insert_drill";
  if (lower.includes("twist drill")) return "twist_drill";
  if (lower.includes("end mill")) return "end_mill";
  return "unknown";
}

// ============================================================================
// ENGINE
// ============================================================================

export class FusionToolLibraryEngine {
  static getSources() {
    return {
      rootPath: TOOL_LIBRARY_DIR,
      expectedFiles: 7,
      expectedTools: 218,
      description: "JM Die Fusion 360 tool library — 7 CSV files with 218 production tools",
    };
  }

  /**
   * Parse all 7 Fusion 360 CSV tool library files.
   */
  static async harvest(): Promise<FusionToolLibraryResult> {
    let files: string[] = [];
    try {
      const entries = await readdir(TOOL_LIBRARY_DIR);
      files = entries.filter((f) => f.toLowerCase().endsWith(".csv"));
    } catch {
      return emptyResult();
    }

    const allTools: FusionTool[] = [];
    const byFile: Record<string, number> = {};

    for (const file of files) {
      const filePath = path.join(TOOL_LIBRARY_DIR, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const tools = this.parseCsv(content, file);
        allTools.push(...tools);
        byFile[file] = tools.length;
      } catch {
        byFile[file] = 0;
      }
    }

    // Aggregate stats
    const byCategory: Record<string, number> = {};
    const byToolType: Record<string, number> = {};
    const byMaterial: Record<string, number> = {};
    const byVendor: Record<string, number> = {};

    for (const t of allTools) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
      if (t.toolType) byToolType[t.toolType] = (byToolType[t.toolType] ?? 0) + 1;
      if (t.toolMaterial) byMaterial[t.toolMaterial] = (byMaterial[t.toolMaterial] ?? 0) + 1;
      if (t.vendor) byVendor[t.vendor] = (byVendor[t.vendor] ?? 0) + 1;
    }

    return {
      tools: allTools,
      totalTools: allTools.length,
      byCategory,
      byToolType,
      byMaterial,
      byVendor,
      byFile,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse a single Fusion CSV file into tools.
   */
  static parseCsv(content: string, sourceFile: string): FusionTool[] {
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse header to get column indices
    const headers = parseCsvLine(lines[0]);
    const colIndex = new Map<string, number>();
    for (let i = 0; i < headers.length; i++) {
      colIndex.set(headers[i], i);
    }

    const get = (row: string[], col: string): string => {
      const idx = colIndex.get(col);
      return idx !== undefined && idx < row.length ? row[idx] : "";
    };

    const category = classifyCategory(sourceFile);
    const tools: FusionTool[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      if (fields.length < 5) continue;

      const tool: FusionTool = {
        toolIndex: parseNum(get(fields, COL.toolIndex)) ?? i,
        presetName: get(fields, COL.presetName),
        toolType: get(fields, COL.toolType),
        description: get(fields, COL.description),
        diameterInch: parseNum(get(fields, COL.diameter)) ?? 0,
        toolNumber: parseNum(get(fields, COL.toolNumber)) ?? 0,
        unit: get(fields, COL.unit) === "mm" ? "mm" : "inches",
        holderDescription: get(fields, COL.holderDescription),
        holderVendor: get(fields, COL.holderVendor),
        toolMaterial: get(fields, COL.material),
        fluteCount: parseNum(get(fields, COL.fluteCount)),
        cornerRadius: parseNum(get(fields, COL.cornerRadius)),
        fluteLength: parseNum(get(fields, COL.fluteLength)),
        overallLength: parseNum(get(fields, COL.overallLength)),
        feedPerTooth: parseNum(get(fields, COL.feedPerTooth)),
        feedCutting: parseNum(get(fields, COL.feedCutting)),
        spindleSpeed: parseNum(get(fields, COL.spindleSpeed)),
        surfaceSpeed: parseNum(get(fields, COL.surfaceSpeed)),
        depthOfCut: parseNum(get(fields, COL.depthOfCut)),
        coolant: get(fields, COL.coolant),
        vendor: get(fields, COL.vendor),
        productId: get(fields, COL.productId),
        tipAngle: parseNum(get(fields, COL.tipAngle)),
        insertShape: get(fields, COL.insertShape) || null,
        sourceFile,
        category,
      };

      tools.push(tool);
    }

    return tools;
  }

  /**
   * Find tools by description substring.
   */
  static findByDescription(
    tools: FusionTool[],
    query: string
  ): FusionTool[] {
    const lower = query.toLowerCase();
    return tools.filter((t) => t.description.toLowerCase().includes(lower));
  }

  /**
   * Filter tools by category.
   */
  static filterByCategory(
    tools: FusionTool[],
    category: FusionTool["category"]
  ): FusionTool[] {
    return tools.filter((t) => t.category === category);
  }

  /**
   * Get audit summary.
   */
  static async audit(): Promise<{
    totalTools: number;
    byCategory: Record<string, number>;
    byMaterial: Record<string, number>;
    fileCount: number;
    vendorCount: number;
  }> {
    const result = await this.harvest();
    return {
      totalTools: result.totalTools,
      byCategory: result.byCategory,
      byMaterial: result.byMaterial,
      fileCount: Object.keys(result.byFile).length,
      vendorCount: Object.keys(result.byVendor).length,
    };
  }
}

// ============================================================================
// HELPERS (private)
// ============================================================================

function emptyResult(): FusionToolLibraryResult {
  return {
    tools: [],
    totalTools: 0,
    byCategory: {},
    byToolType: {},
    byMaterial: {},
    byVendor: {},
    byFile: {},
    timestamp: new Date().toISOString(),
  };
}
