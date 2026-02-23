/**
 * PRISM MCP Server - Manufacturer Catalog Parser Engine (R14-MS5)
 *
 * Parses tool manufacturer catalog data (CSV, JSON, or structured text) into
 * standardized CuttingTool records compatible with the ToolRegistry.
 *
 * Supports:
 *   - Sandvik Coromant, Kennametal, Iscar, Walter, Seco, Mitsubishi, OSG formats
 *   - Automatic column mapping (fuzzy header matching)
 *   - Unit normalization (inch→mm, SFM→m/min, IPT→mm/tooth)
 *   - Coating inference from grade codes
 *   - Performance recommendations extraction
 *
 * Actions:
 *   catalog_parse       - Parse raw catalog data into CuttingTool records
 *   catalog_validate    - Validate parsed records against schema
 *   catalog_enrich      - Enrich parsed records with inferred data
 *   catalog_stats       - Summary statistics of a parsed catalog
 */

import { log } from "../utils/Logger.js";
import type { CuttingTool, ToolGeometry, ToolCoating, ToolPerformance, ToolHolder } from "../registries/ToolRegistry.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Known manufacturer grade → coating mappings. */
const GRADE_COATING_MAP: Record<string, { type: string; hardness: number; maxTemp: number; friction: number; color: string }> = {
  // Sandvik grades
  GC1025: { type: "PVD-TiAlN", hardness: 3300, maxTemp: 900, friction: 0.35, color: "gold-violet" },
  GC1125: { type: "PVD-TiAlN", hardness: 3200, maxTemp: 900, friction: 0.35, color: "dark-gold" },
  GC4225: { type: "CVD-TiCN+Al2O3", hardness: 2800, maxTemp: 1000, friction: 0.30, color: "black" },
  GC4325: { type: "CVD-TiCN+Al2O3+TiN", hardness: 2900, maxTemp: 1100, friction: 0.28, color: "gold-black" },
  // Kennametal grades
  KC5010: { type: "PVD-TiAlN", hardness: 3100, maxTemp: 900, friction: 0.35, color: "bronze" },
  KC5025: { type: "CVD-TiCN+Al2O3", hardness: 2700, maxTemp: 1000, friction: 0.30, color: "black" },
  KC725M: { type: "PVD-AlTiN", hardness: 3400, maxTemp: 1000, friction: 0.32, color: "violet" },
  KCPK30: { type: "CVD-multilayer", hardness: 2600, maxTemp: 1100, friction: 0.28, color: "dark" },
  // Generic coatings
  TiN: { type: "TiN", hardness: 2400, maxTemp: 600, friction: 0.40, color: "gold" },
  TiCN: { type: "TiCN", hardness: 3000, maxTemp: 750, friction: 0.35, color: "blue-gray" },
  TiAlN: { type: "TiAlN", hardness: 3300, maxTemp: 900, friction: 0.35, color: "violet" },
  AlTiN: { type: "AlTiN", hardness: 3400, maxTemp: 1000, friction: 0.32, color: "dark-violet" },
  AlCrN: { type: "AlCrN", hardness: 3200, maxTemp: 1100, friction: 0.30, color: "gray" },
  DLC: { type: "DLC", hardness: 5000, maxTemp: 350, friction: 0.10, color: "dark-gray" },
  nACo: { type: "nACo", hardness: 4500, maxTemp: 1200, friction: 0.25, color: "blue-black" },
  MEGA: { type: "MEGA", hardness: 3600, maxTemp: 1100, friction: 0.28, color: "copper" },
};

/** Column header aliases for fuzzy matching. */
const HEADER_ALIASES: Record<string, string[]> = {
  catalog_number: ["catalog", "cat_no", "part_number", "part_no", "item", "sku", "order_no", "product_id"],
  name: ["description", "desc", "product_name", "tool_name", "designation"],
  type: ["tool_type", "category", "style", "application_type"],
  manufacturer: ["mfg", "brand", "vendor", "maker", "mfr"],
  diameter: ["dia", "d", "cutting_diameter", "dc", "d1", "tool_diameter"],
  overall_length: ["oal", "total_length", "l", "lt"],
  flute_length: ["loc", "cutting_length", "ap_max", "l2", "lc"],
  shank_diameter: ["shank", "ds", "d2", "shank_dia"],
  flutes: ["z", "teeth", "number_of_flutes", "flute_count", "n_flutes"],
  helix_angle: ["helix", "lambda"],
  corner_radius: ["cr", "re", "nose_radius", "corner_rad"],
  coating: ["coat", "surface_treatment", "finish"],
  grade: ["carbide_grade", "substrate_grade", "insert_grade"],
  substrate: ["material", "tool_material", "base_material"],
  price: ["cost", "unit_price", "list_price"],
  speed_sfm: ["sfm", "vc_sfm", "cutting_speed_sfm", "surface_speed"],
  speed_mpm: ["vc", "vc_mpm", "cutting_speed", "mpm"],
  feed_ipt: ["ipt", "fz_ipt", "feed_per_tooth_ipt"],
  feed_mm: ["fz", "fz_mm", "feed_per_tooth", "feed_per_tooth_mm"],
  doc_max: ["ap_max", "max_doc", "max_depth_of_cut"],
  woc_max: ["ae_max", "max_woc", "max_radial_engagement"],
  material_groups: ["iso_groups", "workpiece_materials", "application_materials"],
  coolant: ["coolant_type", "coolant_delivery", "cooling"],
};

/** Manufacturer identification patterns. */
const MANUFACTURER_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /sandvik|coromant/i, name: "Sandvik Coromant" },
  { pattern: /kennametal/i, name: "Kennametal" },
  { pattern: /iscar/i, name: "Iscar" },
  { pattern: /walter/i, name: "Walter" },
  { pattern: /seco/i, name: "Seco Tools" },
  { pattern: /mitsubishi/i, name: "Mitsubishi Materials" },
  { pattern: /osg/i, name: "OSG" },
  { pattern: /dormer|pramet/i, name: "Dormer Pramet" },
  { pattern: /widia/i, name: "WIDIA" },
  { pattern: /ingersoll/i, name: "Ingersoll" },
  { pattern: /kyocera|ceratip/i, name: "Kyocera" },
  { pattern: /tungaloy/i, name: "Tungaloy" },
  { pattern: /sumitomo/i, name: "Sumitomo" },
  { pattern: /nachi/i, name: "Nachi" },
  { pattern: /guhring/i, name: "Guhring" },
  { pattern: /emuge|franken/i, name: "Emuge-Franken" },
];

// ============================================================================
// PARSING ENGINE
// ============================================================================

/** Parse a CSV string into rows of key-value objects. */
function parseCSV(raw: string): Array<Record<string, string>> {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = vals[j] || "";
    }
    rows.push(row);
  }
  return rows;
}

/** Map raw column names to standardized field names using fuzzy matching. */
function mapColumns(rawHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const rawH of rawHeaders) {
    const normalized = rawH.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    for (const [stdField, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
        mapping[rawH] = stdField;
        break;
      }
      // Exact match on the standard field name itself
      if (normalized === stdField || normalized.includes(stdField)) {
        mapping[rawH] = stdField;
        break;
      }
    }
  }
  return mapping;
}

/** Convert inches to mm. */
function inchToMm(val: number): number { return Math.round(val * 25.4 * 1000) / 1000; }

/** Convert SFM to m/min. */
function sfmToMpm(val: number): number { return Math.round(val * 0.3048 * 100) / 100; }

/** Convert IPT to mm/tooth. */
function iptToMm(val: number): number { return Math.round(val * 25.4 * 10000) / 10000; }

/** Detect if values are likely in imperial units. */
function detectUnits(rows: Array<Record<string, string>>, diamCol: string): "metric" | "imperial" {
  const diameters = rows.slice(0, 10).map((r) => parseFloat(r[diamCol] || "0")).filter((d) => d > 0);
  if (diameters.length === 0) return "metric";
  const avg = diameters.reduce((s, d) => s + d, 0) / diameters.length;
  return avg < 3 ? "imperial" : "metric"; // if avg diameter < 3, likely inches
}

/** Infer coating from grade string. */
function inferCoating(grade: string, coatingStr?: string): ToolCoating | undefined {
  // Direct coating string
  if (coatingStr) {
    const upper = coatingStr.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const [key, val] of Object.entries(GRADE_COATING_MAP)) {
      if (upper.includes(key.toUpperCase())) {
        return { type: val.type, thickness: 3, hardness: val.hardness, max_temperature: val.maxTemp, friction_coefficient: val.friction, color: val.color };
      }
    }
  }
  // Grade-based inference
  if (grade) {
    const gradeUpper = grade.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const [key, val] of Object.entries(GRADE_COATING_MAP)) {
      if (gradeUpper.includes(key.toUpperCase()) || gradeUpper === key.toUpperCase()) {
        return { type: val.type, thickness: 3, hardness: val.hardness, max_temperature: val.maxTemp, friction_coefficient: val.friction, color: val.color };
      }
    }
  }
  return undefined;
}

/** Identify manufacturer from catalog number or name. */
function identifyManufacturer(catalogNo: string, nameStr: string): string {
  const combined = `${catalogNo} ${nameStr}`;
  for (const { pattern, name } of MANUFACTURER_PATTERNS) {
    if (pattern.test(combined)) return name;
  }
  return "Unknown";
}

/** Infer tool type from name/description. */
function inferToolType(name: string, catNo: string): string {
  const combined = `${name} ${catNo}`.toLowerCase();
  if (/face.?mill|shell.?mill/i.test(combined)) return "face_mill";
  if (/ball.?(nose|end)/i.test(combined)) return "ball_endmill";
  if (/bull.?nose|corner.?rad/i.test(combined)) return "corner_radius_endmill";
  if (/end.?mill|square/i.test(combined)) return "endmill";
  if (/drill|boring/i.test(combined)) return "drill";
  if (/tap|thread.?mill/i.test(combined)) return "thread_mill";
  if (/reamer/i.test(combined)) return "reamer";
  if (/insert|cnmg|wnmg|dnmg|vnmg|tnmg|ccmt|dcmt|vcmt/i.test(combined)) return "insert";
  if (/slot|groove/i.test(combined)) return "slot_mill";
  if (/chamfer/i.test(combined)) return "chamfer_mill";
  return "endmill"; // default
}

/** Map ISO material group codes from string. */
function parseISOGroups(str: string): string[] {
  if (!str) return ["P"];
  const groups: string[] = [];
  const upper = str.toUpperCase();
  if (upper.includes("P") || /steel/i.test(str)) groups.push("P");
  if (upper.includes("M") || /stainless/i.test(str)) groups.push("M");
  if (upper.includes("K") || /cast.?iron/i.test(str)) groups.push("K");
  if (upper.includes("N") || /alum|non.?ferr/i.test(str)) groups.push("N");
  if (upper.includes("S") || /titan|super.?alloy|inconel/i.test(str)) groups.push("S");
  if (upper.includes("H") || /hard/i.test(str)) groups.push("H");
  return groups.length > 0 ? groups : ["P"];
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

interface ParseOptions {
  format?: "csv" | "json" | "auto";
  manufacturer?: string;
  units?: "metric" | "imperial" | "auto";
  enrich?: boolean;
}

function parseCatalog(data: string | Array<Record<string, any>>, options: ParseOptions = {}): {
  tools: CuttingTool[];
  stats: { total_parsed: number; enriched: number; warnings: string[]; column_mapping: Record<string, string> };
} {
  const warnings: string[] = [];
  let rows: Array<Record<string, string>>;

  // -- Parse raw data --
  if (typeof data === "string") {
    // Try JSON first
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        rows = parsed.map((r) => {
          const row: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) row[k] = String(v ?? "");
          return row;
        });
      } else {
        rows = parseCSV(data);
      }
    } catch {
      rows = parseCSV(data);
    }
  } else {
    rows = data.map((r) => {
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) row[k] = String(v ?? "");
      return row;
    });
  }

  if (rows.length === 0) return { tools: [], stats: { total_parsed: 0, enriched: 0, warnings: ["No data rows found"], column_mapping: {} } };

  // -- Column mapping --
  const rawHeaders = Object.keys(rows[0]);
  const colMap = mapColumns(rawHeaders);
  const unmapped = rawHeaders.filter((h) => !colMap[h]);
  if (unmapped.length > 0) warnings.push(`Unmapped columns: ${unmapped.join(", ")}`);

  // -- Unit detection --
  const units = options.units === "auto" || !options.units
    ? (colMap[Object.keys(colMap).find((k) => colMap[k] === "diameter") || ""] ? detectUnits(rows, Object.keys(colMap).find((k) => colMap[k] === "diameter")!) : "metric")
    : options.units;
  const isImperial = units === "imperial";

  // -- Parse each row into CuttingTool --
  const tools: CuttingTool[] = [];
  let enriched = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = (field: string): string => {
      const rawCol = Object.keys(colMap).find((k) => colMap[k] === field);
      return rawCol ? (row[rawCol] || "") : "";
    };
    const getNum = (field: string): number => {
      const v = parseFloat(get(field));
      return isNaN(v) ? 0 : v;
    };

    const catNo = get("catalog_number") || `ITEM-${i + 1}`;
    const name = get("name") || catNo;
    const manufacturer = options.manufacturer || get("manufacturer") || identifyManufacturer(catNo, name);
    const type = get("type") || inferToolType(name, catNo);
    const grade = get("grade") || "";
    const substrate = get("substrate") || (grade.startsWith("GC") || grade.startsWith("KC") ? "carbide" : "carbide");

    // Geometry
    let diameter = getNum("diameter");
    let oal = getNum("overall_length");
    let fluteLen = getNum("flute_length");
    let shankDia = getNum("shank_diameter");
    let cornerRad = getNum("corner_radius");

    if (isImperial) {
      diameter = inchToMm(diameter);
      oal = inchToMm(oal);
      fluteLen = inchToMm(fluteLen);
      shankDia = inchToMm(shankDia);
      cornerRad = inchToMm(cornerRad);
    }

    // Defaults for missing geometry
    if (diameter <= 0) { diameter = 12; warnings.push(`Row ${i + 1}: No diameter, defaulting to 12mm`); }
    if (oal <= 0) oal = diameter * 6;
    if (fluteLen <= 0) fluteLen = diameter * 3;
    if (shankDia <= 0) shankDia = diameter;

    const flutes = getNum("flutes") || (type.includes("drill") ? 2 : 4);
    const helixAngle = getNum("helix_angle") || 30;

    const geometry: ToolGeometry = {
      diameter, overall_length: oal, flute_length: fluteLen, shank_diameter: shankDia,
      flutes, helix_angle: helixAngle, rake_angle: 12, relief_angle: 8,
      ...(cornerRad > 0 ? { corner_radius: cornerRad } : {}),
    };

    // Coating
    const coating = inferCoating(grade, get("coating"));
    if (coating) enriched++;

    // Performance
    let speedMin = getNum("speed_sfm") || getNum("speed_mpm");
    let feedMin = getNum("feed_ipt") || getNum("feed_mm");
    if (get("speed_sfm") && speedMin > 0) speedMin = sfmToMpm(speedMin);
    if (get("feed_ipt") && feedMin > 0) feedMin = iptToMm(feedMin);

    const isoGroups = parseISOGroups(get("material_groups"));
    const recommendations: Record<string, any> = {};
    for (const grp of isoGroups) {
      recommendations[grp] = {
        speed_sfm: { min: Math.round(speedMin * 0.7 / 0.3048), max: Math.round(speedMin * 1.3 / 0.3048) },
        feed_ipt: { min: Math.round(feedMin * 0.7 / 25.4 * 10000) / 10000, max: Math.round(feedMin * 1.3 / 25.4 * 10000) / 10000 },
        doc_max: getNum("doc_max") || fluteLen,
        woc_max: getNum("woc_max") || diameter * 0.6,
        coolant: (get("coolant") as any) || "flood",
      };
    }

    const performance: ToolPerformance = {
      recommendations,
      expected_life_minutes: 60,
      wear_pattern: "flank",
      max_speed_sfm: speedMin > 0 ? Math.round(speedMin * 1.5 / 0.3048) : 800,
      max_feed_ipt: feedMin > 0 ? Math.round(feedMin * 1.5 / 25.4 * 10000) / 10000 : 0.008,
      max_radial_engagement: 100,
      max_axial_engagement: 100,
      achievable_surface_finish: type.includes("ball") ? 0.4 : type.includes("finish") ? 0.8 : 1.6,
      achievable_tolerance: type.includes("reamer") ? "IT7" : "IT9",
    };

    const tool: CuttingTool = {
      id: `${manufacturer.replace(/\s+/g, "_").toLowerCase()}_${catNo}`.replace(/[^a-z0-9_-]/gi, ""),
      name,
      type,
      manufacturer,
      catalog_number: catNo,
      substrate,
      grade,
      ...(coating ? { coating } : {}),
      geometry,
      performance,
      material_groups: isoGroups,
      application: type.includes("drill") ? ["drilling"] : type.includes("ball") ? ["finishing", "profiling"] : ["roughing", "finishing"],
      ...(getNum("price") > 0 ? { price: getNum("price") } : {}),
      last_updated: new Date().toISOString().split("T")[0],
    };

    tools.push(tool);
  }

  log.info(`[CatalogParser] Parsed ${tools.length} tools from ${rows.length} rows, ${enriched} enriched, ${warnings.length} warnings`);

  return { tools, stats: { total_parsed: tools.length, enriched, warnings, column_mapping: colMap } };
}

// ============================================================================
// VALIDATION
// ============================================================================

interface ValidationResult {
  valid: number;
  invalid: number;
  issues: Array<{ tool_id: string; field: string; issue: string }>;
}

function validateParsedTools(tools: CuttingTool[]): ValidationResult {
  const issues: Array<{ tool_id: string; field: string; issue: string }> = [];

  for (const tool of tools) {
    if (!tool.catalog_number || tool.catalog_number.startsWith("ITEM-")) {
      issues.push({ tool_id: tool.id, field: "catalog_number", issue: "Missing or auto-generated catalog number" });
    }
    if (tool.geometry.diameter <= 0 || tool.geometry.diameter > 200) {
      issues.push({ tool_id: tool.id, field: "geometry.diameter", issue: `Invalid diameter: ${tool.geometry.diameter}mm` });
    }
    if (tool.geometry.flutes < 1 || tool.geometry.flutes > 20) {
      issues.push({ tool_id: tool.id, field: "geometry.flutes", issue: `Invalid flute count: ${tool.geometry.flutes}` });
    }
    if (tool.geometry.flute_length > tool.geometry.overall_length) {
      issues.push({ tool_id: tool.id, field: "geometry.flute_length", issue: "Flute length exceeds overall length" });
    }
    if (tool.geometry.helix_angle < 0 || tool.geometry.helix_angle > 60) {
      issues.push({ tool_id: tool.id, field: "geometry.helix_angle", issue: `Unusual helix angle: ${tool.geometry.helix_angle}°` });
    }
    if (tool.manufacturer === "Unknown") {
      issues.push({ tool_id: tool.id, field: "manufacturer", issue: "Manufacturer not identified" });
    }
  }

  return { valid: tools.length - issues.length, invalid: issues.length, issues };
}

// ============================================================================
// ENRICHMENT
// ============================================================================

function enrichTools(tools: CuttingTool[]): { tools: CuttingTool[]; enrichments: number } {
  let enrichments = 0;

  for (const tool of tools) {
    // Infer edge preparation from type
    if (!tool.geometry.edge_preparation) {
      if (tool.type === "reamer" || tool.type === "ball_endmill") {
        tool.geometry.edge_preparation = "honed";
        tool.geometry.edge_radius = 5;
        enrichments++;
      } else {
        tool.geometry.edge_preparation = "sharp";
      }
    }

    // Infer point angle for drills
    if (tool.type === "drill" && !tool.geometry.point_angle) {
      tool.geometry.point_angle = 140;
      enrichments++;
    }

    // Default coating for carbide without one
    if (tool.substrate === "carbide" && !tool.coating) {
      tool.coating = { type: "TiAlN", thickness: 3, hardness: 3300, max_temperature: 900, friction_coefficient: 0.35, color: "violet" };
      enrichments++;
    }

    // Add application categories
    if (tool.application.length <= 1) {
      if (tool.geometry.corner_radius && tool.geometry.corner_radius > 0) {
        tool.application = [...new Set([...tool.application, "profiling"])];
        enrichments++;
      }
      if (tool.geometry.flutes <= 3 && tool.material_groups.includes("N")) {
        tool.application = [...new Set([...tool.application, "aluminum_machining"])];
        enrichments++;
      }
    }

    // Estimate price if missing
    if (!tool.price) {
      const basePricePerMm = tool.substrate === "carbide" ? 3.5 : tool.substrate === "HSS" ? 1.0 : 8.0;
      const coatingMult = tool.coating ? 1.3 : 1.0;
      tool.price = Math.round(tool.geometry.diameter * basePricePerMm * coatingMult * 100) / 100;
      enrichments++;
    }
  }

  return { tools, enrichments };
}

// ============================================================================
// STATISTICS
// ============================================================================

function catalogStats(tools: CuttingTool[]): Record<string, any> {
  const byType: Record<string, number> = {};
  const byMfg: Record<string, number> = {};
  const bySubstrate: Record<string, number> = {};
  const byCoating: Record<string, number> = {};
  const diameters: number[] = [];
  const prices: number[] = [];

  for (const t of tools) {
    byType[t.type] = (byType[t.type] || 0) + 1;
    byMfg[t.manufacturer] = (byMfg[t.manufacturer] || 0) + 1;
    bySubstrate[t.substrate] = (bySubstrate[t.substrate] || 0) + 1;
    if (t.coating) byCoating[t.coating.type] = (byCoating[t.coating.type] || 0) + 1;
    diameters.push(t.geometry.diameter);
    if (t.price) prices.push(t.price);
  }

  diameters.sort((a, b) => a - b);
  prices.sort((a, b) => a - b);

  return {
    total_tools: tools.length,
    by_type: byType,
    by_manufacturer: byMfg,
    by_substrate: bySubstrate,
    by_coating: byCoating,
    diameter_range: { min: diameters[0] || 0, max: diameters[diameters.length - 1] || 0, median: diameters[Math.floor(diameters.length / 2)] || 0 },
    price_range: prices.length > 0 ? { min: prices[0], max: prices[prices.length - 1], median: prices[Math.floor(prices.length / 2)] } : null,
    iso_coverage: [...new Set(tools.flatMap((t) => t.material_groups))].sort(),
  };
}

// ============================================================================
// ACTION DISPATCHER
// ============================================================================

export function executeCatalogAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case "catalog_parse": {
      const data = params.data || params.csv || params.json || "";
      const options: ParseOptions = {
        format: params.format || "auto",
        manufacturer: params.manufacturer,
        units: params.units || "auto",
        enrich: params.enrich !== false,
      };
      const result = parseCatalog(data, options);
      if (options.enrich) {
        const enrichResult = enrichTools(result.tools);
        result.stats.enriched += enrichResult.enrichments;
      }
      return result;
    }

    case "catalog_validate": {
      const tools = params.tools as CuttingTool[] || [];
      return validateParsedTools(tools);
    }

    case "catalog_enrich": {
      const tools = params.tools as CuttingTool[] || [];
      return enrichTools(tools);
    }

    case "catalog_stats": {
      const tools = params.tools as CuttingTool[] || [];
      return catalogStats(tools);
    }

    default:
      return { error: `Unknown catalog action: ${action}` };
  }
}
