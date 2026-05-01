/**
 * UniversalToolExportEngine — CAMX-MS10 U04 (E1124)
 *
 * Export PRISM tools in 4 universal interchange formats:
 *   ISO 13399 (GTC) — Global Tooling Classification XML
 *   STEP-NC (AP238) — ISO 14649 tool definition
 *   MTConnect Assets — CuttingTool asset XML
 *   Generic CSV — tabular dimensional + cutting data
 *
 * Actions (via camDispatcher):
 *   universal_tool_export
 *
 * Methods:
 *   exportISO13399(tools, options?)  → { xml: string, tool_count: number }
 *   exportSTEPNC(tools)              → { step_data: string, tool_count: number }
 *   exportMTConnect(tools)           → { xml: string, tool_count: number }
 *   exportCSV(tools)                 → { csv: string, tool_count: number }
 *   export(tools, format)            → universal entry point
 *
 * No external dependencies — pure computation.
 */

// ============================================================================
// TYPES
// ============================================================================

/** A PRISM tool record as passed by callers. Fields are union of naming
 *  conventions used across PRISM (SmartToolSelectorEngine, ToolAssemblyEngine). */
export interface PRISMTool {
  id?: string;
  designation?: string;
  manufacturer?: string;
  tool_type?: string;
  type?: string;

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

  // Flutes
  flutes?: number;
  flute_count?: number;

  // Holder / assembly
  taper?: string;
  gauge_length_mm?: number;
  holder_type?: string;

  // Material / coating
  material?: string;
  coating?: string;
  grade?: string;

  // Technology / cutting data (per-material or default)
  spindle_rpm?: number;
  feed_mm_min?: number;
  cutting_speed_m_min?: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;

  // Lifecycle
  tool_life_min?: number;
  serial_number?: string;
  status?: string;

  // Passthrough
  [key: string]: any;
}

export type ExportFormat = "iso13399" | "stepnc" | "mtconnect" | "csv";

export interface ISO13399Options {
  /** Include ToolAssembly records combining cutting + adaptive items. Default true. */
  include_assembly?: boolean;
  /** Schema version string. Default "2.2". */
  schema_version?: string;
  /** Units: "mm" | "inch". Default "mm". */
  units?: "mm" | "inch";
}

export interface ExportISO13399Result {
  xml: string;
  tool_count: number;
  format: "iso13399";
}

export interface ExportSTEPNCResult {
  step_data: string;
  tool_count: number;
  format: "stepnc";
}

export interface ExportMTConnectResult {
  xml: string;
  tool_count: number;
  format: "mtconnect";
}

export interface ExportCSVResult {
  csv: string;
  tool_count: number;
  format: "csv";
  column_count: number;
}

export type ExportResult =
  | ExportISO13399Result
  | ExportSTEPNCResult
  | ExportMTConnectResult
  | ExportCSVResult;

// ============================================================================
// GTC CLASS CODE MAP
// ============================================================================

/** ISO 13399 GTC class codes for common cutting tool types. */
const GTC_CLASS_MAP: Record<string, string> = {
  endmill:        "211",
  end_mill:       "211",
  solid_endmill:  "211",
  ballnose:       "212",
  ball_nosed:     "212",
  ball_end:       "212",
  bull_nosed:     "213",
  bull_nose:      "213",
  facemill:       "221",
  face_mill:      "221",
  shellmill:      "222",
  shell_mill:     "222",
  slotmill:       "231",
  slot_mill:      "231",
  drill:          "111",
  twist_drill:    "111",
  spot_drill:     "112",
  center_drill:   "113",
  peck_drill:     "114",
  reamer:         "121",
  tap:            "131",
  thread_mill:    "132",
  boring_bar:     "141",
  boring:         "141",
  chamfer:        "241",
  chamfer_mill:   "241",
  dovetail:       "251",
  tslot:          "252",
  t_slot:         "252",
  form_mill:      "261",
  turning:        "311",
  insert:         "312",
  grooving:       "321",
};

// ============================================================================
// HELPERS
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

function getGTCClass(tool: PRISMTool): string {
  const t = getToolType(tool).toLowerCase().replace(/\s+/g, "_");
  return GTC_CLASS_MAP[t] ?? "299"; // 299 = unclassified milling
}

function getToolId(tool: PRISMTool, index: number): string {
  return resolveField<string>(tool, "id", "designation") ?? `TOOL-${index + 1}`;
}

function escXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mmToInch(mm: number): number {
  return Math.round((mm / 25.4) * 100000) / 100000;
}

function convertUnits(value: number, units: "mm" | "inch"): string {
  if (units === "inch") return mmToInch(value).toFixed(5);
  return value.toFixed(4);
}

// ============================================================================
// ISO 13399 EXPORT
// ============================================================================

function buildISO13399XML(tools: PRISMTool[], opts: ISO13399Options): string {
  const version = opts.schema_version ?? "2.2";
  const units = opts.units ?? "mm";
  const includeAssembly = opts.include_assembly !== false;
  const unitCode = units === "inch" ? "INCH" : "MM";
  const ts = new Date().toISOString();

  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<ISO13399_ToolData version="${version}" units="${unitCode}" created="${ts}">`);

  // CuttingItems
  lines.push(`  <CuttingItems count="${tools.length}">`);
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const id = getToolId(t, i);
    const gtcClass = getGTCClass(t);
    const d = getDiameter(t);
    const fl = getFlutes(t);
    const cuttingLen = getCuttingLength(t);
    const cornerR = t.corner_radius_mm ?? 0;
    const helix = t.helix_angle_deg ?? 0;
    const mfr = escXml(t.manufacturer ?? "Unknown");
    const mat = escXml(t.material ?? "Carbide");
    const coat = escXml(t.coating ?? "");

    lines.push(`    <CuttingItem id="${escXml(id)}" gtc_class="${gtcClass}">`);
    lines.push(`      <Manufacturer>${mfr}</Manufacturer>`);
    lines.push(`      <ToolType>${escXml(getToolType(t))}</ToolType>`);
    lines.push(`      <Material>${mat}</Material>`);
    if (coat) lines.push(`      <Coating>${coat}</Coating>`);
    lines.push(`      <Geometry>`);
    lines.push(`        <CuttingDiameter unit="${unitCode}">${convertUnits(d, units)}</CuttingDiameter>`);
    lines.push(`        <NumberOfFlutes>${fl}</NumberOfFlutes>`);
    lines.push(`        <CuttingEdgeLength unit="${unitCode}">${convertUnits(cuttingLen, units)}</CuttingEdgeLength>`);
    lines.push(`        <CornerRadius unit="${unitCode}">${convertUnits(cornerR, units)}</CornerRadius>`);
    lines.push(`        <HelixAngle unit="DEG">${helix.toFixed(2)}</HelixAngle>`);
    if (t.point_angle_deg !== undefined) {
      lines.push(`        <PointAngle unit="DEG">${t.point_angle_deg.toFixed(2)}</PointAngle>`);
    }
    lines.push(`      </Geometry>`);
    lines.push(`    </CuttingItem>`);
  }
  lines.push(`  </CuttingItems>`);

  // AdaptiveItems
  lines.push(`  <AdaptiveItems count="${tools.length}">`);
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const id = getToolId(t, i);
    const taper = escXml(t.taper ?? "CAT40");
    const gaugeLen = t.gauge_length_mm ?? getOverallLength(t) ?? 0;
    const holderType = escXml(t.holder_type ?? "straight_shank");

    lines.push(`    <AdaptiveItem id="${escXml(id)}_HOLDER">`);
    lines.push(`      <HolderType>${holderType}</HolderType>`);
    lines.push(`      <Taper>${taper}</Taper>`);
    lines.push(`      <GaugeLength unit="${unitCode}">${convertUnits(gaugeLen, units)}</GaugeLength>`);
    if (t.shank_diameter_mm !== undefined) {
      lines.push(`      <ShankDiameter unit="${unitCode}">${convertUnits(t.shank_diameter_mm, units)}</ShankDiameter>`);
    }
    lines.push(`    </AdaptiveItem>`);
  }
  lines.push(`  </AdaptiveItems>`);

  // ToolAssemblies
  if (includeAssembly) {
    lines.push(`  <ToolAssemblies count="${tools.length}">`);
    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      const id = getToolId(t, i);
      const totalLen = (t.gauge_length_mm ?? 0) + getCuttingLength(t);

      lines.push(`    <ToolAssembly id="${escXml(id)}_ASSEMBLY">`);
      lines.push(`      <CuttingItemRef>${escXml(id)}</CuttingItemRef>`);
      lines.push(`      <AdaptiveItemRef>${escXml(id)}_HOLDER</AdaptiveItemRef>`);
      lines.push(`      <AssemblyLength unit="${unitCode}">${convertUnits(totalLen, units)}</AssemblyLength>`);
      lines.push(`    </ToolAssembly>`);
    }
    lines.push(`  </ToolAssemblies>`);
  }

  lines.push(`</ISO13399_ToolData>`);
  return lines.join("\n");
}

// ============================================================================
// STEP-NC (AP238) EXPORT
// ============================================================================

function buildSTEPNCData(tools: PRISMTool[]): string {
  const ts = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`ISO-10303-21;`);
  lines.push(`HEADER;`);
  lines.push(`FILE_DESCRIPTION(('PRISM STEP-NC Tool Data Export','AP238 ISO 14649'),'2;1');`);
  lines.push(`FILE_NAME('prism_tools_export.p21','${ts}',('PRISM'),('PRISM MCP Server'),'','UniversalToolExportEngine','');`);
  lines.push(`FILE_SCHEMA(('INTEGRATED_CNC_SCHEMA'));`);
  lines.push(`ENDSEC;`);
  lines.push(`DATA;`);

  let entityId = 1;
  const toolRefs: number[] = [];

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const id = getToolId(t, i);
    const d = getDiameter(t);
    const fl = getFlutes(t);
    const cuttingLen = getCuttingLength(t);
    const overallLen = getOverallLength(t);
    const cornerR = t.corner_radius_mm ?? 0;
    const helix = t.helix_angle_deg ?? 0;
    const pointAngle = t.point_angle_deg ?? 118; // standard drill
    const mat = (t.material ?? "carbide").toUpperCase();
    const toolType = getToolType(t).toUpperCase();

    // TOOL_DIMENSION entity
    const dimId = entityId++;
    lines.push(`#${dimId}=TOOL_DIMENSION(${d.toFixed(4)},${cuttingLen.toFixed(4)},${overallLen.toFixed(4)},${cornerR.toFixed(4)},${helix.toFixed(4)});`);

    // CUTTING_COMPONENT entity
    const ccId = entityId++;
    lines.push(`#${ccId}=CUTTING_COMPONENT(${d.toFixed(4)},${cornerR.toFixed(4)},${helix.toFixed(4)},${pointAngle.toFixed(4)},${fl},'${mat}');`);

    // TOOL_BODY_GEOMETRY
    const geomId = entityId++;
    lines.push(`#${geomId}=TOOL_BODY_GEOMETRY(${d.toFixed(4)},${overallLen.toFixed(4)});`);

    // TECHNOLOGY_DATA (speed/feed)
    let techId = 0;
    if (t.spindle_rpm !== undefined || t.feed_mm_min !== undefined || t.cutting_speed_m_min !== undefined) {
      techId = entityId++;
      const rpm = t.spindle_rpm ?? 0;
      const feed = t.feed_mm_min ?? 0;
      const vc = t.cutting_speed_m_min ?? 0;
      const fz = t.feed_per_tooth_mm ?? 0;
      lines.push(`#${techId}=TECHNOLOGY_DATA(${rpm.toFixed(0)}.,${feed.toFixed(4)},${vc.toFixed(4)},${fz.toFixed(6)});`);
    }

    // MILLING_TOOL
    const mtId = entityId++;
    const techRef = techId > 0 ? `#${techId}` : "$";
    lines.push(`#${mtId}=MILLING_TOOL('${id}','${toolType}',#${dimId},#${ccId},#${geomId},${techRef});`);
    toolRefs.push(mtId);
  }

  // TOOL_LIST referencing all milling tools
  const listId = entityId++;
  const refs = toolRefs.map(r => `#${r}`).join(",");
  lines.push(`#${listId}=TOOL_LIST(${refs});`);

  lines.push(`ENDSEC;`);
  lines.push(`END-ISO-10303-21;`);
  return lines.join("\n");
}

// ============================================================================
// MTCONNECT ASSETS EXPORT
// ============================================================================

/** MTConnect tool status values. */
const MT_STATUS_MAP: Record<string, string> = {
  active:    "AVAILABLE",
  available: "AVAILABLE",
  new:       "NEW",
  worn:      "USED",
  expired:   "EXPIRED",
  broken:    "BROKEN",
  unknown:   "UNKNOWN",
};

function buildMTConnectXML(tools: PRISMTool[]): string {
  const ts = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<MTConnectAssets xmlns="urn:mtconnect.org:MTConnectAssets:1.7"`);
  lines.push(`  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`);
  lines.push(`  xsi:schemaLocation="urn:mtconnect.org:MTConnectAssets:1.7 MTConnectAssets_1.7.xsd">`);
  lines.push(`  <Header creationTime="${ts}" sender="PRISM-MCP" version="1.7" assetCount="${tools.length}" instanceId="1" bufferSize="${tools.length}"/>`);
  lines.push(`  <Assets>`);

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const id = getToolId(t, i);
    const serial = escXml(t.serial_number ?? id);
    const status = MT_STATUS_MAP[(t.status ?? "available").toLowerCase()] ?? "AVAILABLE";
    const mfr = escXml(t.manufacturer ?? "Unknown");
    const toolType = escXml(getToolType(t).replace(/_/g, " ").toUpperCase());
    const d = getDiameter(t);
    const fl = getFlutes(t);
    const cuttingLen = getCuttingLength(t);
    const overallLen = getOverallLength(t);
    const cornerR = t.corner_radius_mm ?? 0;
    const helix = t.helix_angle_deg ?? 0;
    const life = t.tool_life_min ?? 0;
    const mat = escXml(t.material ?? "CARBIDE");
    const coat = escXml(t.coating ?? "");

    lines.push(`    <CuttingTool serialNumber="${escXml(serial)}" toolId="${escXml(id)}" timestamp="${ts}" assetId="${escXml(id)}">`);
    lines.push(`      <Description manufacturer="${mfr}" serialNumber="${escXml(serial)}">${toolType}</Description>`);
    lines.push(`      <CuttingToolLifeCycle>`);
    lines.push(`        <ToolLife type="MINUTES" direction="DOWN" initial="${life.toFixed(0)}">${life.toFixed(0)}</ToolLife>`);
    lines.push(`        <ProgramToolNumber>${i + 1}</ProgramToolNumber>`);
    lines.push(`        <ConnectionCodeMachineSide>${escXml(t.taper ?? "CAT40")}</ConnectionCodeMachineSide>`);
    lines.push(`        <Measurements>`);
    lines.push(`          <FunctionalLength units="millimeter">${overallLen.toFixed(4)}</FunctionalLength>`);
    lines.push(`          <CuttingDiameterMax units="millimeter">${d.toFixed(4)}</CuttingDiameterMax>`);
    lines.push(`          <BodyDiameterMax units="millimeter">${(t.shank_diameter_mm ?? d).toFixed(4)}</BodyDiameterMax>`);
    lines.push(`          <FluteLengthMax units="millimeter">${cuttingLen.toFixed(4)}</FluteLengthMax>`);
    lines.push(`          <CornerRadius units="millimeter">${cornerR.toFixed(4)}</CornerRadius>`);
    lines.push(`          <HelixAngle units="degree">${helix.toFixed(2)}</HelixAngle>`);
    lines.push(`        </Measurements>`);
    lines.push(`        <CuttingItems count="${fl}">`);
    for (let fi = 0; fi < Math.max(fl, 1); fi++) {
      lines.push(`          <CuttingItem indices="${fi + 1}">`);
      lines.push(`            <Grade>${escXml(t.grade ?? mat)}</Grade>`);
      if (coat) lines.push(`            <Coating>${coat}</Coating>`);
      lines.push(`            <ItemLife type="MINUTES" direction="DOWN" initial="${life.toFixed(0)}">${life.toFixed(0)}</ItemLife>`);
      lines.push(`            <ItemStatus>${status}</ItemStatus>`);
      lines.push(`          </CuttingItem>`);
    }
    lines.push(`        </CuttingItems>`);
    lines.push(`      </CuttingToolLifeCycle>`);
    lines.push(`    </CuttingTool>`);
  }

  lines.push(`  </Assets>`);
  lines.push(`</MTConnectAssets>`);
  return lines.join("\n");
}

// ============================================================================
// CSV EXPORT
// ============================================================================

const CSV_COLUMNS = [
  "tool_id",
  "designation",
  "manufacturer",
  "tool_type",
  "gtc_class",
  "material",
  "coating",
  "grade",
  "diameter_mm",
  "shank_diameter_mm",
  "cutting_length_mm",
  "overall_length_mm",
  "corner_radius_mm",
  "helix_angle_deg",
  "point_angle_deg",
  "flutes",
  "taper",
  "holder_type",
  "gauge_length_mm",
  "spindle_rpm",
  "feed_mm_min",
  "cutting_speed_m_min",
  "feed_per_tooth_mm",
  "depth_of_cut_mm",
  "width_of_cut_mm",
  "tool_life_min",
  "serial_number",
  "status",
] as const;

function csvEscape(val: any): string {
  if (val === undefined || val === null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(tools: PRISMTool[]): string {
  const rows: string[] = [];
  rows.push(CSV_COLUMNS.join(","));

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const row: string[] = [
      csvEscape(getToolId(t, i)),
      csvEscape(t.designation ?? ""),
      csvEscape(t.manufacturer ?? ""),
      csvEscape(getToolType(t)),
      csvEscape(getGTCClass(t)),
      csvEscape(t.material ?? ""),
      csvEscape(t.coating ?? ""),
      csvEscape(t.grade ?? ""),
      csvEscape(getDiameter(t) || ""),
      csvEscape(t.shank_diameter_mm ?? ""),
      csvEscape(getCuttingLength(t) || ""),
      csvEscape(getOverallLength(t) || ""),
      csvEscape(t.corner_radius_mm ?? ""),
      csvEscape(t.helix_angle_deg ?? ""),
      csvEscape(t.point_angle_deg ?? ""),
      csvEscape(getFlutes(t) || ""),
      csvEscape(t.taper ?? ""),
      csvEscape(t.holder_type ?? ""),
      csvEscape(t.gauge_length_mm ?? ""),
      csvEscape(t.spindle_rpm ?? ""),
      csvEscape(t.feed_mm_min ?? ""),
      csvEscape(t.cutting_speed_m_min ?? ""),
      csvEscape(t.feed_per_tooth_mm ?? ""),
      csvEscape(t.depth_of_cut_mm ?? ""),
      csvEscape(t.width_of_cut_mm ?? ""),
      csvEscape(t.tool_life_min ?? ""),
      csvEscape(t.serial_number ?? ""),
      csvEscape(t.status ?? ""),
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class UniversalToolExportEngine {
  // ------------------------------------------------------------------
  // ISO 13399
  // ------------------------------------------------------------------

  exportISO13399(tools: PRISMTool[], options: ISO13399Options = {}): ExportISO13399Result {
    if (!tools?.length) {
      return { xml: '<?xml version="1.0" encoding="UTF-8"?><ISO13399_ToolData version="2.2" units="MM" count="0"/>', tool_count: 0, format: "iso13399" };
    }
    const xml = buildISO13399XML(tools, options);
    return { xml, tool_count: tools.length, format: "iso13399" };
  }

  // ------------------------------------------------------------------
  // STEP-NC AP238
  // ------------------------------------------------------------------

  exportSTEPNC(tools: PRISMTool[]): ExportSTEPNCResult {
    if (!tools?.length) {
      return {
        step_data: "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Empty export'),'2;1');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;",
        tool_count: 0,
        format: "stepnc",
      };
    }
    const step_data = buildSTEPNCData(tools);
    return { step_data, tool_count: tools.length, format: "stepnc" };
  }

  // ------------------------------------------------------------------
  // MTConnect Assets
  // ------------------------------------------------------------------

  exportMTConnect(tools: PRISMTool[]): ExportMTConnectResult {
    if (!tools?.length) {
      const ts = new Date().toISOString();
      return {
        xml: `<?xml version="1.0" encoding="UTF-8"?><MTConnectAssets xmlns="urn:mtconnect.org:MTConnectAssets:1.7"><Header creationTime="${ts}" sender="PRISM-MCP" version="1.7" assetCount="0" instanceId="1" bufferSize="0"/><Assets/></MTConnectAssets>`,
        tool_count: 0,
        format: "mtconnect",
      };
    }
    const xml = buildMTConnectXML(tools);
    return { xml, tool_count: tools.length, format: "mtconnect" };
  }

  // ------------------------------------------------------------------
  // CSV
  // ------------------------------------------------------------------

  exportCSV(tools: PRISMTool[]): ExportCSVResult {
    if (!tools?.length) {
      return { csv: CSV_COLUMNS.join(","), tool_count: 0, format: "csv", column_count: CSV_COLUMNS.length };
    }
    const csv = buildCSV(tools);
    return { csv, tool_count: tools.length, format: "csv", column_count: CSV_COLUMNS.length };
  }

  // ------------------------------------------------------------------
  // Universal entry point
  // ------------------------------------------------------------------

  export(tools: PRISMTool[], format: ExportFormat, options?: ISO13399Options): ExportResult {
    switch (format) {
      case "iso13399": return this.exportISO13399(tools, options);
      case "stepnc":   return this.exportSTEPNC(tools);
      case "mtconnect": return this.exportMTConnect(tools);
      case "csv":       return this.exportCSV(tools);
      default:
        throw new Error(`UniversalToolExportEngine: unknown format '${format}'. Use: iso13399 | stepnc | mtconnect | csv`);
    }
  }

  // ------------------------------------------------------------------
  // Utility: list supported formats with description
  // ------------------------------------------------------------------

  listFormats(): { format: ExportFormat; standard: string; description: string }[] {
    return [
      {
        format: "iso13399",
        standard: "ISO 13399",
        description: "Global Tooling Classification (GTC) XML — CuttingItem, AdaptiveItem, ToolAssembly with class codes",
      },
      {
        format: "stepnc",
        standard: "ISO 14649 / STEP-NC AP238",
        description: "Neutral STEP-NC P21 text file — Milling_tool, Cutting_component, Tool_dimension, Technology_data",
      },
      {
        format: "mtconnect",
        standard: "MTConnect 1.7 Assets",
        description: "MTConnect CuttingTool asset XML — lifecycle, measurements, cutting items with status/grade",
      },
      {
        format: "csv",
        standard: "Generic CSV",
        description: `Tabular export — ${CSV_COLUMNS.length} columns: dimensional, material, cutting data per tool`,
      },
    ];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const universalToolExportEngine = new UniversalToolExportEngine();
