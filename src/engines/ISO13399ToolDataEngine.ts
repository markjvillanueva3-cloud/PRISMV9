/**
 * ISO13399ToolDataEngine — CAMX-MS20 U03 (E1133)
 *
 * Full ISO 13399 (GTC — Global Tooling Classification) tool data interchange.
 * Handles import AND export of ISO 13399 XML for cutting tool data exchange.
 *
 * ISO 13399 standard: Computer representation and exchange of cutting tool data.
 * XML format with GTC class codes for universal tool identification.
 *
 * Import capabilities:
 *   - Parse ISO 13399 XML (versions 2.0–2.2)
 *   - Extract CuttingItems, AdaptiveItems, ToolAssemblies
 *   - Map GTC class codes to PRISM tool types
 *   - Return structured PRISMTool records + ToolAssembly records
 *
 * Export capabilities (supplements UniversalToolExportEngine):
 *   - Generate full ISO 13399 XML from PRISM tools
 *   - Include dimensional parameters per GTC class
 *   - Include cutting data per material group (ISO P/M/K/N/S/H)
 *   - Include holder/adaptive item data
 *
 * GTC Class codes (primary):
 *   111 = Solid drill         121 = Indexable drill
 *   211 = Solid end mill      212 = Ball nose end mill
 *   213 = Bull nose end mill  221 = Indexable end mill
 *   311 = Face mill           411 = Threading tool
 *   511 = Boring bar          611 = Reamer
 *   711 = Tap
 *
 * Actions (via camDispatcher):
 *   iso13399_import   — parse ISO 13399 XML → PRISMTool[]
 *   iso13399_export   — PRISMTool[] → ISO 13399 XML
 *   iso13399_validate — check ISO 13399 XML for structural validity
 *
 * No external dependencies — pure computation.
 */

// ============================================================================
// TYPES
// ============================================================================

/** A PRISM tool record. Field names follow multi-engine conventions. */
export interface PRISMTool {
  id?: string;
  designation?: string;
  manufacturer?: string;
  tool_type?: string;
  type?: string;
  gtc_class?: string;

  // Dimensional
  diameter_mm?: number;
  cutting_diameter_mm?: number;
  shank_diameter_mm?: number;
  cutting_length_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  length_mm?: number;
  corner_radius_mm?: number;
  helix_angle_deg?: number;
  point_angle_deg?: number;

  // Flutes / inserts
  flutes?: number;
  flute_count?: number;
  insert_count?: number;

  // Holder / assembly
  taper?: string;
  gauge_length_mm?: number;
  holder_type?: string;

  // Material / coating
  material?: string;
  coating?: string;
  grade?: string;

  // Cutting data (default)
  spindle_rpm?: number;
  feed_mm_min?: number;
  cutting_speed_m_min?: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;

  // Cutting data per material group (ISO P/M/K/N/S/H)
  cutting_data_per_material?: CuttingDataPerMaterial[];

  // Lifecycle
  tool_life_min?: number;
  serial_number?: string;
  status?: string;

  [key: string]: any;
}

/** Cutting data for a specific ISO material group. */
export interface CuttingDataPerMaterial {
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  cutting_speed_m_min?: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;
}

/** A tool assembly linking cutting item + adaptive item. */
export interface ToolAssembly {
  assembly_id: string;
  cutting_item_id: string;
  adaptive_item_id: string;
  assembly_length_mm?: number;
  description?: string;
}

/** Result of importISO13399. */
export interface ISO13399ImportResult {
  tools: PRISMTool[];
  assemblies: ToolAssembly[];
  warnings: string[];
  schema_version?: string;
  units?: string;
  tool_count: number;
  assembly_count: number;
}

/** Result of exportISO13399. */
export interface ISO13399ExportResult {
  xml: string;
  tool_count: number;
  format: "iso13399";
}

/** Options for exportISO13399. */
export interface ISO13399ExportOptions {
  /** Include ToolAssembly records. Default true. */
  include_assembly?: boolean;
  /** Schema version. Default "2.2". */
  schema_version?: string;
  /** Units: "mm" | "inch". Default "mm". */
  units?: "mm" | "inch";
  /** Include per-material cutting data blocks. Default true. */
  include_cutting_data?: boolean;
}

/** Result of validateISO13399. */
export interface ISO13399ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schema_version?: string;
  cutting_item_count?: number;
  adaptive_item_count?: number;
  assembly_count?: number;
}

/** PRISMToolType string union for mapGTCClass return. */
export type PRISMToolType =
  | "solid_drill"
  | "indexable_drill"
  | "solid_endmill"
  | "ballnose"
  | "bull_nose"
  | "indexable_endmill"
  | "face_mill"
  | "threading_tool"
  | "boring_bar"
  | "reamer"
  | "tap"
  | "turning_insert"
  | "grooving_tool"
  | "parting_tool"
  | "chamfer_mill"
  | "dovetail_mill"
  | "t_slot_mill"
  | "form_mill"
  | "shell_mill"
  | "spot_drill"
  | "center_drill"
  | "unknown";

// ============================================================================
// GTC CLASS MAPS
// ============================================================================

/**
 * Map from GTC class code → PRISMToolType.
 * Reference: ISO 13399:2021, GTC classification table.
 *
 * Drilling (1xx): 111 solid drill, 112 spot drill, 113 center drill,
 *   114 deep hole drill, 115 gun drill, 121 indexable drill,
 *   122 indexable spot drill, 131 step drill, 141 combined drill-reamer
 *
 * Milling (2xx): 211 solid end mill, 212 ball nose, 213 bull nose,
 *   214 taper end mill, 221 indexable end mill, 222 shell mill,
 *   223 indexable face mill, 231 slot mill, 232 T-slot mill,
 *   241 chamfer mill, 251 dovetail mill, 261 form mill, 271 thread mill
 *
 * Face milling (3xx): 311 face mill, 312 high-feed mill, 321 porcupine mill
 *
 * Threading (4xx): 411 threading tool (turning), 421 thread whirling
 *
 * Boring (5xx): 511 boring bar, 512 fine boring head, 521 back boring
 *
 * Reaming (6xx): 611 reamer, 612 adjustable reamer, 621 combined drill-reamer
 *
 * Tapping (7xx): 711 tap, 712 thread forming tap, 713 thread milling-tapping
 *
 * Turning (8xx): 811 turning insert holder, 812 grooving, 813 parting,
 *   814 threading turning
 *
 * Grinding/other (9xx): 911 grinding wheel, 921 honing tool
 */
const GTC_TO_PRISM: Record<string, PRISMToolType> = {
  // Drilling
  "111": "solid_drill",
  "112": "spot_drill",
  "113": "center_drill",
  "114": "solid_drill",       // deep hole — closest PRISM type
  "115": "solid_drill",       // gun drill
  "121": "indexable_drill",
  "122": "indexable_drill",
  "131": "solid_drill",       // step drill
  "141": "solid_drill",       // combined drill-reamer
  // Milling
  "211": "solid_endmill",
  "212": "ballnose",
  "213": "bull_nose",
  "214": "solid_endmill",     // taper end mill
  "221": "indexable_endmill",
  "222": "shell_mill",
  "223": "face_mill",
  "231": "solid_endmill",     // slot mill
  "232": "t_slot_mill",
  "241": "chamfer_mill",
  "251": "dovetail_mill",
  "261": "form_mill",
  "271": "threading_tool",    // thread mill
  // Face milling
  "311": "face_mill",
  "312": "face_mill",         // high-feed mill
  "321": "face_mill",         // porcupine mill
  // Threading (turning)
  "411": "threading_tool",
  "421": "threading_tool",
  // Boring
  "511": "boring_bar",
  "512": "boring_bar",
  "521": "boring_bar",
  // Reaming
  "611": "reamer",
  "612": "reamer",
  "621": "reamer",
  // Tapping
  "711": "tap",
  "712": "tap",
  "713": "tap",
  // Turning
  "811": "turning_insert",
  "812": "grooving_tool",
  "813": "parting_tool",
  "814": "threading_tool",
  // Grinding / honing (mapped as unknown — PRISM has no dedicated type)
  "911": "unknown",
  "921": "unknown",
};

/** Map from PRISM tool type → GTC class code (primary/preferred code). */
const PRISM_TO_GTC: Record<string, string> = {
  solid_drill:       "111",
  twist_drill:       "111",
  drill:             "111",
  spot_drill:        "112",
  center_drill:      "113",
  indexable_drill:   "121",
  solid_endmill:     "211",
  endmill:           "211",
  end_mill:          "211",
  ballnose:          "212",
  ball_nose:         "212",
  ball_end:          "212",
  bull_nose:         "213",
  bull_nosed:        "213",
  corner_radius:     "213",
  indexable_endmill: "221",
  indexable_end:     "221",
  shell_mill:        "222",
  shellmill:         "222",
  face_mill:         "311",
  facemill:          "311",
  high_feed_mill:    "312",
  chamfer_mill:      "241",
  chamfer:           "241",
  dovetail_mill:     "251",
  dovetail:          "251",
  t_slot_mill:       "232",
  tslot:             "232",
  form_mill:         "261",
  thread_mill:       "271",
  threading_tool:    "411",
  boring_bar:        "511",
  boring:            "511",
  reamer:            "611",
  tap:               "711",
  thread_forming_tap:"712",
  turning_insert:    "811",
  turning:           "811",
  grooving_tool:     "812",
  grooving:          "812",
  parting_tool:      "813",
  parting:           "813",
};

/** ISO material group abbreviation display names. */
const ISO_GROUP_NAMES: Record<string, string> = {
  P: "P (Steel)",
  M: "M (Stainless)",
  K: "K (Cast Iron)",
  N: "N (Non-ferrous)",
  S: "S (HRSA/Titanium)",
  H: "H (Hardened Steel)",
};

// ============================================================================
// XML HELPERS
// ============================================================================

/** Escape XML special characters in a string value. */
function escXml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Convert mm to inches with 5 decimal precision. */
function mmToInch(mm: number): number {
  return Math.round((mm / 25.4) * 100000) / 100000;
}

/** Format a dimensional value with unit conversion applied. */
function fmtDim(value: number, units: "mm" | "inch"): string {
  if (units === "inch") return mmToInch(value).toFixed(5);
  return value.toFixed(4);
}

/** Format a number as a fixed decimal string. */
function fmtNum(n: number, decimals = 4): string {
  return isFinite(n) ? n.toFixed(decimals) : "0.0000";
}

// ============================================================================
// FIELD RESOLUTION HELPERS
// ============================================================================

function resolveField<T>(tool: PRISMTool, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (tool[k] !== undefined && tool[k] !== null) return tool[k] as T;
  }
  return undefined;
}

function getDiameter(tool: PRISMTool): number {
  return resolveField<number>(tool, "diameter_mm", "cutting_diameter_mm") ?? 0;
}

function getFlutes(tool: PRISMTool): number {
  return resolveField<number>(tool, "flutes", "flute_count") ?? 0;
}

function getCuttingLength(tool: PRISMTool): number {
  return resolveField<number>(tool, "cutting_length_mm", "flute_length_mm") ?? 0;
}

function getOverallLength(tool: PRISMTool): number {
  return resolveField<number>(tool, "overall_length_mm", "length_mm") ?? 0;
}

function getToolType(tool: PRISMTool): string {
  return resolveField<string>(tool, "tool_type", "type") ?? "endmill";
}

function getToolId(tool: PRISMTool, index: number): string {
  return resolveField<string>(tool, "id", "designation") ?? `TOOL-${index + 1}`;
}

function getGTCClass(tool: PRISMTool): string {
  // Honor explicit gtc_class if provided
  if (tool.gtc_class) return tool.gtc_class;
  const t = getToolType(tool).toLowerCase().replace(/[\s-]+/g, "_");
  return PRISM_TO_GTC[t] ?? "299";
}

// ============================================================================
// XML SIMPLE PARSER
// ============================================================================

/**
 * Minimal XML tag extractor. Returns all occurrences of <tagName ...>content</tagName>
 * as objects with { attrs: Record<string,string>, content: string, raw: string }.
 * Not a full DOM parser — works for well-formed ISO 13399 XML.
 */
function extractTags(
  xml: string,
  tagName: string,
): Array<{ attrs: Record<string, string>; content: string; raw: string }> {
  const results: Array<{ attrs: Record<string, string>; content: string; raw: string }> = [];
  // Match self-closing and paired tags
  const paired = new RegExp(
    `<${tagName}((?:\\s+[^>]*)?)>([\\s\\S]*?)<\\/${tagName}>`,
    "gi",
  );
  const selfClose = new RegExp(
    `<${tagName}((?:\\s+[^>]*)?)\\/?>`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = paired.exec(xml)) !== null) {
    results.push({
      attrs: parseAttrs(m[1] ?? ""),
      content: m[2] ?? "",
      raw: m[0],
    });
  }
  if (results.length === 0) {
    while ((m = selfClose.exec(xml)) !== null) {
      results.push({
        attrs: parseAttrs(m[1] ?? ""),
        content: "",
        raw: m[0],
      });
    }
  }
  return results;
}

/** Parse XML attribute string into key=value map. */
function parseAttrs(attrStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /(\w[\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    result[m[1]] = m[2] ?? m[3] ?? "";
  }
  return result;
}

/** Extract the text content of the first matching tag within a block. */
function getTagText(xml: string, tagName: string): string | undefined {
  const tags = extractTags(xml, tagName);
  if (tags.length > 0) return tags[0].content.trim();
  return undefined;
}

/** Parse a numeric value from a tag's text content. Returns undefined if not found/not a number. */
function getTagNum(xml: string, tagName: string): number | undefined {
  const text = getTagText(xml, tagName);
  if (text === undefined || text === "") return undefined;
  const n = parseFloat(text);
  return isFinite(n) ? n : undefined;
}

/** Extract root element attributes from the XML declaration/root tag. */
function getRootAttrs(xml: string): Record<string, string> {
  const m = xml.match(/<ISO13399_ToolData([^>]*)>/i);
  if (!m) return {};
  return parseAttrs(m[1] ?? "");
}

// ============================================================================
// IMPORT IMPLEMENTATION
// ============================================================================

function parseUnits(unitCode: string): "mm" | "inch" {
  const u = (unitCode ?? "MM").toUpperCase();
  return u === "INCH" || u === "IN" || u === "INCHES" ? "inch" : "mm";
}

function convertToMM(value: number, units: "mm" | "inch"): number {
  return units === "inch" ? value * 25.4 : value;
}

function parseCuttingItem(
  itemXml: string,
  attrs: Record<string, string>,
  units: "mm" | "inch",
  warnings: string[],
): PRISMTool {
  const id = attrs["id"] ?? attrs["ID"] ?? "";
  const gtcClass = attrs["gtc_class"] ?? attrs["gtcClass"] ?? attrs["class"] ?? "299";

  const manufacturer = getTagText(itemXml, "Manufacturer") ?? getTagText(itemXml, "manufacturer");
  const toolTypeTxt  = getTagText(itemXml, "ToolType") ?? getTagText(itemXml, "toolType");
  const material     = getTagText(itemXml, "Material") ?? getTagText(itemXml, "material");
  const coating      = getTagText(itemXml, "Coating") ?? getTagText(itemXml, "coating");
  const grade        = getTagText(itemXml, "Grade") ?? getTagText(itemXml, "grade");
  const designation  = getTagText(itemXml, "Designation") ?? getTagText(itemXml, "designation");
  const serialNum    = getTagText(itemXml, "SerialNumber") ?? getTagText(itemXml, "serialNumber");

  // Geometry block
  const geomBlock = getTagText(itemXml, "Geometry") ?? itemXml;

  const rawDiam = getTagNum(geomBlock, "CuttingDiameter") ?? getTagNum(geomBlock, "Diameter");
  const rawFlLen = getTagNum(geomBlock, "CuttingEdgeLength") ?? getTagNum(geomBlock, "FluteLength");
  const rawOAL   = getTagNum(geomBlock, "OverallLength") ?? getTagNum(geomBlock, "TotalLength");
  const rawCR    = getTagNum(geomBlock, "CornerRadius") ?? 0;
  const rawHelix = getTagNum(geomBlock, "HelixAngle") ?? 0;
  const rawPoint = getTagNum(geomBlock, "PointAngle");
  const rawShank = getTagNum(geomBlock, "ShankDiameter") ?? getTagNum(itemXml, "ShankDiameter");
  const rawFlutes = getTagNum(geomBlock, "NumberOfFlutes") ?? getTagNum(geomBlock, "Flutes");
  const rawInserts = getTagNum(geomBlock, "NumberOfInserts") ?? getTagNum(geomBlock, "InsertCount");

  // Cutting data blocks (per material group)
  const cuttingDataPerMaterial: CuttingDataPerMaterial[] = [];
  const cdBlocks = extractTags(itemXml, "CuttingData");
  for (const cd of cdBlocks) {
    const isoGroup = (cd.attrs["iso_group"] ?? cd.attrs["isoGroup"] ?? cd.attrs["material_group"] ?? "").toUpperCase();
    if (["P", "M", "K", "N", "S", "H"].includes(isoGroup)) {
      const rawVc  = getTagNum(cd.content, "CuttingSpeed") ?? getTagNum(cd.content, "Vc");
      const rawFz  = getTagNum(cd.content, "FeedPerTooth") ?? getTagNum(cd.content, "Fz");
      const rawAp  = getTagNum(cd.content, "DepthOfCut") ?? getTagNum(cd.content, "Ap");
      const rawAe  = getTagNum(cd.content, "WidthOfCut") ?? getTagNum(cd.content, "Ae");
      cuttingDataPerMaterial.push({
        iso_group: isoGroup as CuttingDataPerMaterial["iso_group"],
        cutting_speed_m_min: rawVc !== undefined ? (units === "inch" ? rawVc * 0.3048 : rawVc) : undefined,
        feed_per_tooth_mm:   rawFz !== undefined ? convertToMM(rawFz, units) : undefined,
        depth_of_cut_mm:     rawAp !== undefined ? convertToMM(rawAp, units) : undefined,
        width_of_cut_mm:     rawAe !== undefined ? convertToMM(rawAe, units) : undefined,
      });
    }
  }

  // Default cutting data
  const defaultCd = extractTags(itemXml, "DefaultCuttingData");
  let defaultVc: number | undefined, defaultFz: number | undefined;
  let defaultAp: number | undefined, defaultAe: number | undefined;
  if (defaultCd.length > 0) {
    defaultVc = getTagNum(defaultCd[0].content, "CuttingSpeed") ?? getTagNum(defaultCd[0].content, "Vc");
    defaultFz = getTagNum(defaultCd[0].content, "FeedPerTooth") ?? getTagNum(defaultCd[0].content, "Fz");
    defaultAp = getTagNum(defaultCd[0].content, "DepthOfCut") ?? getTagNum(defaultCd[0].content, "Ap");
    defaultAe = getTagNum(defaultCd[0].content, "WidthOfCut") ?? getTagNum(defaultCd[0].content, "Ae");
  }

  // Validate mandatory field
  if (!id) {
    warnings.push(`CuttingItem missing id attribute — assigned placeholder`);
  }
  if (rawDiam === undefined) {
    warnings.push(`CuttingItem id="${id}": CuttingDiameter not found`);
  }

  const prismType = GTC_TO_PRISM[gtcClass] ?? "unknown";

  const tool: PRISMTool = {
    id: id || undefined,
    designation: designation,
    manufacturer,
    tool_type: toolTypeTxt ?? prismType,
    type: prismType,
    gtc_class: gtcClass,
    material,
    coating,
    grade,
    serial_number: serialNum,
    diameter_mm:          rawDiam !== undefined ? convertToMM(rawDiam, units) : undefined,
    cutting_length_mm:    rawFlLen !== undefined ? convertToMM(rawFlLen, units) : undefined,
    overall_length_mm:    rawOAL !== undefined ? convertToMM(rawOAL, units) : undefined,
    shank_diameter_mm:    rawShank !== undefined ? convertToMM(rawShank, units) : undefined,
    corner_radius_mm:     rawCR !== undefined ? convertToMM(rawCR, units) : undefined,
    helix_angle_deg:      rawHelix,
    point_angle_deg:      rawPoint,
    flutes:               rawFlutes !== undefined ? Math.round(rawFlutes) : undefined,
    insert_count:         rawInserts !== undefined ? Math.round(rawInserts) : undefined,
    cutting_speed_m_min:  defaultVc !== undefined ? (units === "inch" ? defaultVc * 0.3048 : defaultVc) : undefined,
    feed_per_tooth_mm:    defaultFz !== undefined ? convertToMM(defaultFz, units) : undefined,
    depth_of_cut_mm:      defaultAp !== undefined ? convertToMM(defaultAp, units) : undefined,
    width_of_cut_mm:      defaultAe !== undefined ? convertToMM(defaultAe, units) : undefined,
  };

  if (cuttingDataPerMaterial.length > 0) {
    tool.cutting_data_per_material = cuttingDataPerMaterial;
  }

  // Strip undefined fields for cleanliness
  for (const key of Object.keys(tool)) {
    if (tool[key] === undefined) delete tool[key];
  }

  return tool;
}

function parseAdaptiveItem(
  itemXml: string,
  attrs: Record<string, string>,
  units: "mm" | "inch",
): { id: string; holder_type?: string; taper?: string; gauge_length_mm?: number; shank_diameter_mm?: number } {
  const id = attrs["id"] ?? attrs["ID"] ?? "";
  const holderType  = getTagText(itemXml, "HolderType") ?? getTagText(itemXml, "holderType");
  const taper       = getTagText(itemXml, "Taper") ?? getTagText(itemXml, "SpindleInterface");
  const rawGauge    = getTagNum(itemXml, "GaugeLength");
  const rawShank    = getTagNum(itemXml, "ShankDiameter");

  return {
    id,
    holder_type:      holderType,
    taper,
    gauge_length_mm:  rawGauge !== undefined ? convertToMM(rawGauge, units) : undefined,
    shank_diameter_mm: rawShank !== undefined ? convertToMM(rawShank, units) : undefined,
  };
}

function parseToolAssembly(
  asmXml: string,
  attrs: Record<string, string>,
  units: "mm" | "inch",
): ToolAssembly | null {
  const id = attrs["id"] ?? attrs["ID"] ?? "";
  const cutRef = getTagText(asmXml, "CuttingItemRef") ?? getTagText(asmXml, "cuttingItemRef") ?? "";
  const adaRef = getTagText(asmXml, "AdaptiveItemRef") ?? getTagText(asmXml, "adaptiveItemRef") ?? "";
  if (!cutRef && !adaRef) return null;
  const rawLen = getTagNum(asmXml, "AssemblyLength");
  return {
    assembly_id:       id,
    cutting_item_id:   cutRef,
    adaptive_item_id:  adaRef,
    assembly_length_mm: rawLen !== undefined ? convertToMM(rawLen, units) : undefined,
    description: getTagText(asmXml, "Description"),
  };
}

// ============================================================================
// EXPORT IMPLEMENTATION
// ============================================================================

function buildISO13399ExportXML(
  tools: PRISMTool[],
  opts: ISO13399ExportOptions,
): string {
  const version        = opts.schema_version ?? "2.2";
  const units          = opts.units ?? "mm";
  const unitCode       = units === "inch" ? "INCH" : "MM";
  const includeAssembly     = opts.include_assembly !== false;
  const includeCuttingData  = opts.include_cutting_data !== false;
  const ts             = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<ISO13399_ToolData version="${escXml(version)}" units="${unitCode}" created="${ts}">`);

  // ── CuttingItems ────────────────────────────────────────────────────────────
  lines.push(`  <CuttingItems count="${tools.length}">`);
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const id        = escXml(getToolId(t, i));
    const gtcClass  = getGTCClass(t);
    const d         = getDiameter(t);
    const fl        = getFlutes(t);
    const cuttingLen = getCuttingLength(t);
    const oal       = getOverallLength(t);
    const cornerR   = t.corner_radius_mm ?? 0;
    const helix     = t.helix_angle_deg ?? 0;
    const mfr       = escXml(t.manufacturer ?? "");
    const mat       = escXml(t.material ?? "");
    const coat      = escXml(t.coating ?? "");
    const grade     = escXml(t.grade ?? "");
    const desig     = escXml(t.designation ?? getToolId(t, i));

    lines.push(`    <CuttingItem id="${id}" gtc_class="${gtcClass}">`);
    if (desig)   lines.push(`      <Designation>${desig}</Designation>`);
    if (mfr)     lines.push(`      <Manufacturer>${mfr}</Manufacturer>`);
    lines.push(`      <ToolType>${escXml(getToolType(t))}</ToolType>`);
    if (mat)     lines.push(`      <Material>${mat}</Material>`);
    if (coat)    lines.push(`      <Coating>${coat}</Coating>`);
    if (grade)   lines.push(`      <Grade>${grade}</Grade>`);

    lines.push(`      <Geometry>`);
    lines.push(`        <CuttingDiameter unit="${unitCode}">${fmtDim(d, units)}</CuttingDiameter>`);
    if (fl > 0) {
      const flTag = (gtcClass.startsWith("1") || gtcClass.startsWith("2") || gtcClass.startsWith("6") || gtcClass === "711")
        ? "NumberOfFlutes"
        : "NumberOfInserts";
      lines.push(`        <${flTag}>${fl}</${flTag}>`);
    }
    if (cuttingLen > 0)
      lines.push(`        <CuttingEdgeLength unit="${unitCode}">${fmtDim(cuttingLen, units)}</CuttingEdgeLength>`);
    if (oal > 0)
      lines.push(`        <OverallLength unit="${unitCode}">${fmtDim(oal, units)}</OverallLength>`);
    if (t.shank_diameter_mm !== undefined && t.shank_diameter_mm > 0)
      lines.push(`        <ShankDiameter unit="${unitCode}">${fmtDim(t.shank_diameter_mm, units)}</ShankDiameter>`);
    lines.push(`        <CornerRadius unit="${unitCode}">${fmtDim(cornerR, units)}</CornerRadius>`);
    lines.push(`        <HelixAngle unit="DEG">${fmtNum(helix, 2)}</HelixAngle>`);
    if (t.point_angle_deg !== undefined)
      lines.push(`        <PointAngle unit="DEG">${fmtNum(t.point_angle_deg, 2)}</PointAngle>`);
    lines.push(`      </Geometry>`);

    // Default cutting data block
    if (includeCuttingData) {
      const hasDefault = t.cutting_speed_m_min !== undefined
        || t.feed_per_tooth_mm !== undefined
        || t.depth_of_cut_mm !== undefined
        || t.width_of_cut_mm !== undefined;

      if (hasDefault) {
        const vcUnit = units === "inch" ? "SFM" : "M/MIN";
        lines.push(`      <DefaultCuttingData>`);
        if (t.cutting_speed_m_min !== undefined) {
          const vc = units === "inch"
            ? fmtNum(t.cutting_speed_m_min * 3.28084, 2)  // m/min → ft/min (SFM)
            : fmtNum(t.cutting_speed_m_min, 2);
          lines.push(`        <CuttingSpeed unit="${vcUnit}">${vc}</CuttingSpeed>`);
        }
        if (t.feed_per_tooth_mm !== undefined)
          lines.push(`        <FeedPerTooth unit="${unitCode}">${fmtDim(t.feed_per_tooth_mm, units)}</FeedPerTooth>`);
        if (t.depth_of_cut_mm !== undefined)
          lines.push(`        <DepthOfCut unit="${unitCode}">${fmtDim(t.depth_of_cut_mm, units)}</DepthOfCut>`);
        if (t.width_of_cut_mm !== undefined)
          lines.push(`        <WidthOfCut unit="${unitCode}">${fmtDim(t.width_of_cut_mm, units)}</WidthOfCut>`);
        lines.push(`      </DefaultCuttingData>`);
      }

      // Per-material cutting data
      const cdPerMat = t.cutting_data_per_material ?? [];
      for (const cd of cdPerMat) {
        const grp = cd.iso_group;
        const grpName = escXml(ISO_GROUP_NAMES[grp] ?? grp);
        const vcUnit = units === "inch" ? "SFM" : "M/MIN";
        lines.push(`      <CuttingData iso_group="${grp}" description="${grpName}">`);
        if (cd.cutting_speed_m_min !== undefined) {
          const vc = units === "inch"
            ? fmtNum(cd.cutting_speed_m_min * 3.28084, 2)
            : fmtNum(cd.cutting_speed_m_min, 2);
          lines.push(`        <CuttingSpeed unit="${vcUnit}">${vc}</CuttingSpeed>`);
        }
        if (cd.feed_per_tooth_mm !== undefined)
          lines.push(`        <FeedPerTooth unit="${unitCode}">${fmtDim(cd.feed_per_tooth_mm, units)}</FeedPerTooth>`);
        if (cd.depth_of_cut_mm !== undefined)
          lines.push(`        <DepthOfCut unit="${unitCode}">${fmtDim(cd.depth_of_cut_mm, units)}</DepthOfCut>`);
        if (cd.width_of_cut_mm !== undefined)
          lines.push(`        <WidthOfCut unit="${unitCode}">${fmtDim(cd.width_of_cut_mm, units)}</WidthOfCut>`);
        lines.push(`      </CuttingData>`);
      }
    }

    lines.push(`    </CuttingItem>`);
  }
  lines.push(`  </CuttingItems>`);

  // ── AdaptiveItems ───────────────────────────────────────────────────────────
  lines.push(`  <AdaptiveItems count="${tools.length}">`);
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const id        = escXml(getToolId(t, i));
    const taper     = escXml(t.taper ?? "");
    const holderType = escXml(t.holder_type ?? "straight_shank");
    const gaugeLen  = t.gauge_length_mm ?? getOverallLength(t);
    const shank     = t.shank_diameter_mm;

    lines.push(`    <AdaptiveItem id="${id}_HOLDER">`);
    lines.push(`      <HolderType>${holderType}</HolderType>`);
    if (taper) lines.push(`      <Taper>${taper}</Taper>`);
    if (gaugeLen > 0)
      lines.push(`      <GaugeLength unit="${unitCode}">${fmtDim(gaugeLen, units)}</GaugeLength>`);
    if (shank !== undefined && shank > 0)
      lines.push(`      <ShankDiameter unit="${unitCode}">${fmtDim(shank, units)}</ShankDiameter>`);
    lines.push(`    </AdaptiveItem>`);
  }
  lines.push(`  </AdaptiveItems>`);

  // ── ToolAssemblies ──────────────────────────────────────────────────────────
  if (includeAssembly) {
    lines.push(`  <ToolAssemblies count="${tools.length}">`);
    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      const id       = escXml(getToolId(t, i));
      const gaugeLen = t.gauge_length_mm ?? getOverallLength(t);
      const asmLen   = gaugeLen + getCuttingLength(t);

      lines.push(`    <ToolAssembly id="${id}_ASSEMBLY">`);
      lines.push(`      <CuttingItemRef>${id}</CuttingItemRef>`);
      lines.push(`      <AdaptiveItemRef>${id}_HOLDER</AdaptiveItemRef>`);
      if (asmLen > 0)
        lines.push(`      <AssemblyLength unit="${unitCode}">${fmtDim(asmLen, units)}</AssemblyLength>`);
      lines.push(`    </ToolAssembly>`);
    }
    lines.push(`  </ToolAssemblies>`);
  }

  lines.push(`</ISO13399_ToolData>`);
  return lines.join("\n");
}

// ============================================================================
// VALIDATION IMPLEMENTATION
// ============================================================================

function validateISO13399XML(xml: string): ISO13399ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!xml || xml.trim().length === 0) {
    return { valid: false, errors: ["Empty XML input"], warnings: [] };
  }

  // Must have XML declaration or ISO13399 root
  if (!xml.includes("<ISO13399_ToolData")) {
    errors.push("Root element <ISO13399_ToolData> not found");
  }

  // Check root attributes
  const rootAttrs = getRootAttrs(xml);
  const schemaVersion = rootAttrs["version"];
  if (!schemaVersion) {
    warnings.push("Root element missing 'version' attribute");
  } else {
    const ver = parseFloat(schemaVersion);
    if (isNaN(ver) || ver < 1.0 || ver > 3.0) {
      warnings.push(`Unusual schema version: ${schemaVersion}. Expected 2.0–2.2.`);
    }
  }

  const unitsAttr = rootAttrs["units"];
  if (unitsAttr && !["MM", "INCH", "IN", "INCHES"].includes(unitsAttr.toUpperCase())) {
    warnings.push(`Unrecognized units attribute: '${unitsAttr}'. Expected MM or INCH.`);
  }

  // Count sections
  const cuttingItems  = extractTags(xml, "CuttingItem");
  const adaptiveItems = extractTags(xml, "AdaptiveItem");
  const assemblies    = extractTags(xml, "ToolAssembly");

  if (cuttingItems.length === 0) {
    errors.push("No <CuttingItem> elements found — file contains no tool definitions");
  }

  // Validate each CuttingItem
  for (let i = 0; i < cuttingItems.length; i++) {
    const ci = cuttingItems[i];
    const itemId = ci.attrs["id"] ?? ci.attrs["ID"] ?? `[${i}]`;
    const gtcClass = ci.attrs["gtc_class"] ?? ci.attrs["gtcClass"] ?? ci.attrs["class"];

    if (!ci.attrs["id"] && !ci.attrs["ID"]) {
      warnings.push(`CuttingItem[${i}]: missing 'id' attribute`);
    }
    if (!gtcClass) {
      warnings.push(`CuttingItem id="${itemId}": missing 'gtc_class' attribute`);
    } else if (!GTC_TO_PRISM[gtcClass]) {
      warnings.push(`CuttingItem id="${itemId}": unknown GTC class '${gtcClass}'`);
    }

    // Must have at minimum a cutting diameter
    const hasDiameter =
      ci.content.includes("CuttingDiameter") ||
      ci.content.includes("Diameter");
    if (!hasDiameter) {
      errors.push(`CuttingItem id="${itemId}": missing CuttingDiameter — required dimensional data`);
    }
  }

  // Validate assembly refs
  for (let i = 0; i < assemblies.length; i++) {
    const asm = assemblies[i];
    const asmId = asm.attrs["id"] ?? `[${i}]`;
    const cutRef = getTagText(asm.content, "CuttingItemRef") ?? getTagText(asm.content, "cuttingItemRef");
    const adaRef = getTagText(asm.content, "AdaptiveItemRef") ?? getTagText(asm.content, "adaptiveItemRef");
    if (!cutRef) {
      errors.push(`ToolAssembly id="${asmId}": missing CuttingItemRef`);
    }
    if (!adaRef) {
      errors.push(`ToolAssembly id="${asmId}": missing AdaptiveItemRef`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schema_version:       schemaVersion,
    cutting_item_count:   cuttingItems.length,
    adaptive_item_count:  adaptiveItems.length,
    assembly_count:       assemblies.length,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ISO13399ToolDataEngine {

  // ── Import ─────────────────────────────────────────────────────────────────

  /**
   * Parse an ISO 13399 XML document into structured PRISM tool records.
   *
   * Extracts CuttingItems, AdaptiveItems, and ToolAssemblies.
   * Merges holder data from AdaptiveItems back into corresponding tool records.
   *
   * @param xml Full ISO 13399 XML string
   * @returns tools[], assemblies[], warnings[]
   */
  importISO13399(xml: string): ISO13399ImportResult {
    const warnings: string[] = [];

    if (!xml || xml.trim().length === 0) {
      return { tools: [], assemblies: [], warnings: ["Empty XML input"], tool_count: 0, assembly_count: 0 };
    }

    // Parse root attributes
    const rootAttrs = getRootAttrs(xml);
    const schemaVersion = rootAttrs["version"];
    const units = parseUnits(rootAttrs["units"] ?? "MM");

    // Parse cutting items
    const cuttingItemTags = extractTags(xml, "CuttingItem");
    const tools: PRISMTool[] = [];
    for (const tag of cuttingItemTags) {
      tools.push(parseCuttingItem(tag.content, tag.attrs, units, warnings));
    }

    // Parse adaptive items — build id→holder map
    const adaptiveItemTags = extractTags(xml, "AdaptiveItem");
    const holderMap = new Map<string, ReturnType<typeof parseAdaptiveItem>>();
    for (const tag of adaptiveItemTags) {
      const holder = parseAdaptiveItem(tag.content, tag.attrs, units);
      if (holder.id) holderMap.set(holder.id, holder);
    }

    // Merge holder data into tools by id (CuttingItem id → AdaptiveItem id conventions)
    for (const tool of tools) {
      if (!tool.id) continue;
      // Common convention: adaptive item id = cutting item id + "_HOLDER"
      const holderCandidates = [
        `${tool.id}_HOLDER`,
        `${tool.id}-HOLDER`,
        `${tool.id}_holder`,
        tool.id,
      ];
      for (const candidate of holderCandidates) {
        const holder = holderMap.get(candidate);
        if (holder) {
          if (holder.holder_type && !tool.holder_type) tool.holder_type = holder.holder_type;
          if (holder.taper && !tool.taper) tool.taper = holder.taper;
          if (holder.gauge_length_mm !== undefined && tool.gauge_length_mm === undefined)
            tool.gauge_length_mm = holder.gauge_length_mm;
          if (holder.shank_diameter_mm !== undefined && tool.shank_diameter_mm === undefined)
            tool.shank_diameter_mm = holder.shank_diameter_mm;
          break;
        }
      }
    }

    // Parse tool assemblies
    const assemblyTags = extractTags(xml, "ToolAssembly");
    const assemblies: ToolAssembly[] = [];
    for (const tag of assemblyTags) {
      const asm = parseToolAssembly(tag.content, tag.attrs, units);
      if (asm) assemblies.push(asm);
    }

    if (tools.length === 0) {
      warnings.push("No CuttingItem elements found — verify file is valid ISO 13399 XML");
    }

    return {
      tools,
      assemblies,
      warnings,
      schema_version: schemaVersion,
      units: units === "inch" ? "INCH" : "MM",
      tool_count: tools.length,
      assembly_count: assemblies.length,
    };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  /**
   * Export PRISM tool records as ISO 13399 XML.
   *
   * Generates CuttingItems, AdaptiveItems, and (optionally) ToolAssemblies.
   * Includes per-material cutting data blocks when provided.
   *
   * @param tools Array of PRISM tool records
   * @param options Export options (units, schema version, include_assembly, etc.)
   */
  exportISO13399(
    tools: PRISMTool[],
    options: ISO13399ExportOptions = {},
  ): ISO13399ExportResult {
    if (!tools?.length) {
      const ts = new Date().toISOString();
      const version = options.schema_version ?? "2.2";
      const unitCode = (options.units ?? "mm") === "inch" ? "INCH" : "MM";
      return {
        xml: `<?xml version="1.0" encoding="UTF-8"?>\n<ISO13399_ToolData version="${version}" units="${unitCode}" created="${ts}"><CuttingItems count="0"/></ISO13399_ToolData>`,
        tool_count: 0,
        format: "iso13399",
      };
    }
    const xml = buildISO13399ExportXML(tools, options);
    return { xml, tool_count: tools.length, format: "iso13399" };
  }

  // ── GTC Class Mapping ──────────────────────────────────────────────────────

  /**
   * Map a GTC class code to a PRISM tool type string.
   *
   * Returns "unknown" for unrecognized codes rather than throwing.
   *
   * @param gtc_code GTC class code (e.g. "211", "111", "611")
   */
  mapGTCClass(gtc_code: string): PRISMToolType {
    return GTC_TO_PRISM[String(gtc_code).trim()] ?? "unknown";
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  /**
   * Validate an ISO 13399 XML document for structural correctness.
   *
   * Checks:
   *   - Root element presence and version attribute
   *   - At least one CuttingItem present
   *   - Each CuttingItem has required id and CuttingDiameter
   *   - GTC class codes are recognized
   *   - ToolAssembly refs exist
   *
   * Does NOT validate against the full ISO 13399 XSD — performs pragmatic
   * structural validation sufficient for import decisions.
   *
   * @param xml ISO 13399 XML string to validate
   */
  validateISO13399(xml: string): ISO13399ValidationResult {
    return validateISO13399XML(xml);
  }

  // ── Utility: GTC reference table ───────────────────────────────────────────

  /**
   * Return the full GTC class code reference table.
   * Useful for UI dropdowns and documentation generation.
   */
  listGTCClasses(): Array<{ code: string; prism_type: PRISMToolType; description: string }> {
    return [
      { code: "111", prism_type: "solid_drill",       description: "Solid drill" },
      { code: "112", prism_type: "spot_drill",        description: "Spot drill" },
      { code: "113", prism_type: "center_drill",      description: "Center drill" },
      { code: "121", prism_type: "indexable_drill",   description: "Indexable drill" },
      { code: "211", prism_type: "solid_endmill",     description: "Solid end mill" },
      { code: "212", prism_type: "ballnose",          description: "Ball nose end mill" },
      { code: "213", prism_type: "bull_nose",         description: "Bull nose / corner radius end mill" },
      { code: "221", prism_type: "indexable_endmill", description: "Indexable end mill" },
      { code: "222", prism_type: "shell_mill",        description: "Shell mill" },
      { code: "232", prism_type: "t_slot_mill",       description: "T-slot mill" },
      { code: "241", prism_type: "chamfer_mill",      description: "Chamfer mill" },
      { code: "251", prism_type: "dovetail_mill",     description: "Dovetail mill" },
      { code: "261", prism_type: "form_mill",         description: "Form mill" },
      { code: "271", prism_type: "threading_tool",    description: "Thread mill" },
      { code: "311", prism_type: "face_mill",         description: "Face mill" },
      { code: "312", prism_type: "face_mill",         description: "High-feed face mill" },
      { code: "411", prism_type: "threading_tool",    description: "Threading tool (turning)" },
      { code: "511", prism_type: "boring_bar",        description: "Boring bar" },
      { code: "512", prism_type: "boring_bar",        description: "Fine boring head" },
      { code: "611", prism_type: "reamer",            description: "Reamer" },
      { code: "612", prism_type: "reamer",            description: "Adjustable reamer" },
      { code: "711", prism_type: "tap",               description: "Tap (cutting)" },
      { code: "712", prism_type: "tap",               description: "Thread forming tap" },
      { code: "811", prism_type: "turning_insert",    description: "Turning insert holder" },
      { code: "812", prism_type: "grooving_tool",     description: "Grooving tool" },
      { code: "813", prism_type: "parting_tool",      description: "Parting/cut-off tool" },
      { code: "814", prism_type: "threading_tool",    description: "Turning threading tool" },
    ];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const iso13399ToolDataEngine = new ISO13399ToolDataEngine();
