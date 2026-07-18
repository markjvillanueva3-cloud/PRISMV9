/**
 * ShopToolLibraryEngine — Production Tool Library Access
 *
 * Provides access to the user's ACTUAL production tool library — real tools
 * with proven speeds/feeds from their shop floor. Data sourced from Fusion 360
 * CSV exports covering turning, end mills, boring bars, insert drills, and
 * twist drills.
 *
 * Actions: loadAll, getByCategory, getByToolNumber, search, getSpeedFeed,
 *          getSummary, getByDiameter
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";

// ============================================================================
// TYPES
// ============================================================================



export interface ShopTool {
  id: string;
  category: string;
  type: string;
  description: string;
  diameter: number;
  unit: string;
  toolNumber: number;
  flutes?: number;
  fluteLength?: number;
  overallLength?: number;
  shoulderLength?: number;
  cornerRadius?: number;
  tipAngle?: number;
  insertType?: string;
  insertSize?: string;
  material?: string;
  clockwise?: boolean;
  // Proven cutting parameters
  spindleSpeed?: number;
  surfaceSpeed?: number;
  feedCutting?: number;
  feedPerTooth?: number;
  feedPerRevolution?: number;
  feedPlunge?: number;
  feedRamp?: number;
  depthOfCut?: number;
  stepdown?: number;
  stepover?: number;
  coolant?: string;
  // Holder
  holderDescription?: string;
  holderVendor?: string;
  assemblyGaugeLength?: number;
  holderGaugeLength?: number;
  // Shank
  shankHeight?: number;
  shankWidth?: number;
  shaftDiameter?: number;
  // Always true — these are real production tools
  shopProven: true;
}

export interface SpeedFeedData {
  toolNumber: number;
  description: string;
  category: string;
  spindleSpeed?: number;
  surfaceSpeed?: number;
  feedCutting?: number;
  feedPerTooth?: number;
  feedPerRevolution?: number;
  feedPlunge?: number;
  feedRamp?: number;
  depthOfCut?: number;
  stepdown?: number;
  stepover?: number;
  coolant?: string;
  unit: string;
}

export interface LibrarySummary {
  totalTools: number;
  byCategory: Record<string, number>;
  categories: string[];
}

// ============================================================================
// CSV DATA SOURCES
// ============================================================================

const DATA_DIR = join(import.meta.dirname, "..", "data");

const CSV_SOURCES: { file: string; category: string }[] = [
  { file: "shop-tools-turning.csv", category: "turning" },
  { file: "shop-tools-endmills.csv", category: "endmill" },
  { file: "shop-tools-boring-finish.csv", category: "boring_finish" },
  { file: "shop-tools-boring-rough.csv", category: "boring_rough" },
  { file: "shop-tools-insert-drills-130.csv", category: "insert_drill_130" },
  { file: "shop-tools-insert-drills-180.csv", category: "insert_drill_180" },
  { file: "shop-tools-twist-drills.csv", category: "twist_drill" },
];

// ============================================================================
// CSV PARSER
// ============================================================================

/**
 * Parse a single CSV line respecting quoted fields (handles commas inside quotes
 * and doubled-quote escaping from Fusion 360 exports).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    i++;
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Extract field name from Fusion 360 header format: `"Display Name (field_name)"`
 * Returns the parenthesized field name, or the raw header if no parens found.
 */
function extractFieldName(header: string): string {
  const match = header.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : header;
}

/**
 * Parse a numeric value; returns undefined if empty or non-numeric.
 */
function parseNum(val: string): number | undefined {
  if (val === "" || val === undefined) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

/**
 * Parse a boolean value from Fusion 360 CSV (true/false strings).
 */
function parseBool(val: string): boolean | undefined {
  if (val === "true") return true;
  if (val === "false") return false;
  return undefined;
}

/**
 * Parse a string value; returns undefined if empty.
 */
function parseStr(val: string): string | undefined {
  return val === "" ? undefined : val;
}

/**
 * Parse a single CSV file into ShopTool records.
 */
function parseCsvFile(filePath: string, category: string): ShopTool[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header row to build field name index
  const headerFields = parseCsvLine(lines[0]);
  const fieldNames = headerFields.map(extractFieldName);
  const fieldIndex = new Map<string, number>();
  fieldNames.forEach((name, idx) => {
    fieldIndex.set(name, idx);
  });

  // Helper to get a value by field name from a parsed row
  const get = (row: string[], field: string): string => {
    const idx = fieldIndex.get(field);
    if (idx === undefined || idx >= row.length) return "";
    return row[idx];
  };

  const tools: ShopTool[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 5) continue;

    const toolNumber = parseNum(get(row, "tool_number"));
    const diameter = parseNum(get(row, "tool_diameter"));
    if (toolNumber === undefined || diameter === undefined) continue;

    const tool: ShopTool = {
      id: `shop-T${toolNumber}`,
      category,
      type: get(row, "tool_type") || category,
      description: get(row, "tool_description") || "",
      diameter,
      unit: get(row, "tool_unit") || "inches",
      toolNumber,
      shopProven: true,
    };

    // Optional fields
    const flutes = parseNum(get(row, "tool_numberOfFlutes"));
    if (flutes !== undefined) tool.flutes = flutes;

    const fluteLength = parseNum(get(row, "tool_fluteLength"));
    if (fluteLength !== undefined) tool.fluteLength = fluteLength;

    const overallLength = parseNum(get(row, "tool_overallLength"));
    if (overallLength !== undefined) tool.overallLength = overallLength;

    const shoulderLength = parseNum(get(row, "tool_shoulderLength"));
    if (shoulderLength !== undefined) tool.shoulderLength = shoulderLength;

    const cornerRadius = parseNum(get(row, "tool_cornerRadius"));
    if (cornerRadius !== undefined) tool.cornerRadius = cornerRadius;

    const tipAngle = parseNum(get(row, "tool_tipAngle"));
    if (tipAngle !== undefined) tool.tipAngle = tipAngle;

    const insertType = parseStr(get(row, "tool_insertType"));
    if (insertType !== undefined) tool.insertType = insertType;

    const insertSize = parseStr(get(row, "tool_insertSize"));
    if (insertSize !== undefined) tool.insertSize = insertSize;

    const material = parseStr(get(row, "tool_material"));
    if (material !== undefined) tool.material = material;

    const clockwise = parseBool(get(row, "tool_clockwise"));
    if (clockwise !== undefined) tool.clockwise = clockwise;

    // Cutting parameters
    const spindleSpeed = parseNum(get(row, "tool_spindleSpeed"));
    if (spindleSpeed !== undefined) tool.spindleSpeed = spindleSpeed;

    const surfaceSpeed = parseNum(get(row, "tool_surfaceSpeed"));
    if (surfaceSpeed !== undefined) tool.surfaceSpeed = surfaceSpeed;

    const feedCutting = parseNum(get(row, "tool_feedCutting"));
    if (feedCutting !== undefined) tool.feedCutting = feedCutting;

    const feedPerTooth = parseNum(get(row, "tool_feedPerTooth"));
    if (feedPerTooth !== undefined) tool.feedPerTooth = feedPerTooth;

    const feedPerRevolution = parseNum(get(row, "tool_feedPerRevolution"));
    if (feedPerRevolution !== undefined) tool.feedPerRevolution = feedPerRevolution;

    const feedPlunge = parseNum(get(row, "tool_feedPlunge"));
    if (feedPlunge !== undefined) tool.feedPlunge = feedPlunge;

    const feedRamp = parseNum(get(row, "tool_feedRamp"));
    if (feedRamp !== undefined) tool.feedRamp = feedRamp;

    const depthOfCut = parseNum(get(row, "tool_depthOfCut"));
    if (depthOfCut !== undefined) tool.depthOfCut = depthOfCut;

    const stepdown = parseNum(get(row, "tool_stepdown"));
    if (stepdown !== undefined) tool.stepdown = stepdown;

    const stepover = parseNum(get(row, "tool_stepover"));
    if (stepover !== undefined) tool.stepover = stepover;

    const coolant = parseStr(get(row, "tool_coolant"));
    if (coolant !== undefined) tool.coolant = coolant;

    // Holder
    const holderDescription = parseStr(get(row, "holder_description"));
    if (holderDescription !== undefined) tool.holderDescription = holderDescription;

    const holderVendor = parseStr(get(row, "holder_vendor"));
    if (holderVendor !== undefined) tool.holderVendor = holderVendor;

    const assemblyGaugeLength = parseNum(get(row, "tool_assemblyGaugeLength"));
    if (assemblyGaugeLength !== undefined) tool.assemblyGaugeLength = assemblyGaugeLength;

    const holderGaugeLength = parseNum(get(row, "tool_holderGaugeLength"));
    if (holderGaugeLength !== undefined) tool.holderGaugeLength = holderGaugeLength;

    // Shank
    const shankHeight = parseNum(get(row, "tool_shankHeight"));
    if (shankHeight !== undefined) tool.shankHeight = shankHeight;

    const shankWidth = parseNum(get(row, "tool_shankWidth"));
    if (shankWidth !== undefined) tool.shankWidth = shankWidth;

    const shaftDiameter = parseNum(get(row, "tool_shaftDiameter"));
    if (shaftDiameter !== undefined) tool.shaftDiameter = shaftDiameter;

    tools.push(tool);
  }

  return tools;
}

// ============================================================================
// ENGINE
// ============================================================================

class ShopToolLibraryEngineImpl {
  private _tools: ShopTool[] | null = null;

  /**
   * Lazy-load and cache all tools from all CSV files.
   */
  loadAll(): ShopTool[] {
    if (this._tools !== null) return this._tools;

    const all: ShopTool[] = [];
    for (const src of CSV_SOURCES) {
      const filePath = join(DATA_DIR, src.file);
      const tools = parseCsvFile(filePath, src.category);
      all.push(...tools);
    }
    this._tools = all;
    return all;
  }

  /**
   * Force reload from disk (useful if CSVs are updated).
   */
  reload(): ShopTool[] {
    this._tools = null;
    return this.loadAll();
  }

  /**
   * Filter tools by category.
   */
  getByCategory(category: string): ShopTool[] {
    const tools = this.loadAll();
    const cat = category.toLowerCase().replace(/[\s-]/g, "_");
    return tools.filter((t) => t.category === cat);
  }

  /**
   * Find a tool by its T-number. Returns the first match across all categories.
   */
  getByToolNumber(num: number): ShopTool | undefined {
    return this.loadAll().find((t) => t.toolNumber === num);
  }

  /**
   * Search tool descriptions (case-insensitive substring match).
   * Also matches against type, category, material, insertType, and holder fields.
   */
  search(query: string): ShopTool[] {
    const tools = this.loadAll();
    const q = query.toLowerCase();
    return tools.filter((t) => {
      const haystack = [
        t.description,
        t.type,
        t.category,
        t.material ?? "",
        t.insertType ?? "",
        t.holderDescription ?? "",
        t.holderVendor ?? "",
        t.coolant ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  /**
   * Get proven speed/feed data for a tool by T-number.
   */
  getSpeedFeed(toolNumber: number): SpeedFeedData | undefined {
    const tool = this.getByToolNumber(toolNumber);
    if (!tool) return undefined;

    return {
      toolNumber: tool.toolNumber,
      description: tool.description,
      category: tool.category,
      spindleSpeed: tool.spindleSpeed,
      surfaceSpeed: tool.surfaceSpeed,
      feedCutting: tool.feedCutting,
      feedPerTooth: tool.feedPerTooth,
      feedPerRevolution: tool.feedPerRevolution,
      feedPlunge: tool.feedPlunge,
      feedRamp: tool.feedRamp,
      depthOfCut: tool.depthOfCut,
      stepdown: tool.stepdown,
      stepover: tool.stepover,
      coolant: tool.coolant,
      unit: tool.unit,
    };
  }

  /**
   * Get library summary: total tool count and breakdown by category.
   */
  getSummary(): LibrarySummary {
    const tools = this.loadAll();
    const byCategory: Record<string, number> = {};
    for (const t of tools) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    }
    return {
      totalTools: tools.length,
      byCategory,
      categories: Object.keys(byCategory),
    };
  }

  /**
   * Find tools near a given diameter. Tolerance defaults to 0.001 (in tool units).
   */
  getByDiameter(dia: number, tolerance: number = 0.001): ShopTool[] {
    const tools = this.loadAll();
    return tools.filter((t) => Math.abs(t.diameter - dia) <= tolerance);
  }
}

export const shopToolLibraryEngine = new ShopToolLibraryEngineImpl();
