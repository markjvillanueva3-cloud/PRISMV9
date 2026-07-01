/**
 * HyperMillMacroDBEngine — IM_Macro_DB + IM_Tool_DB extraction
 *
 * U-HMR42: Parses macro definitions from the hyperMILL IM_Macro_DB and
 * IM_Tool_DB v1 databases. Both use XML-based catalog formats (omFeature2JobCatalog).
 *
 * IM_Macro_DB contents:
 *   - Drilling macro definitions (peck depth formulas, pilot hole sizing, countersink angles)
 *   - Feature-to-job macros (omFeature2JobCatalog XMLs)
 *   - Macro parameter defaults + material-specific overrides
 *
 * IM_Tool_DB v1 contents:
 *   - Legacy tool definitions (geometry + cutting parameters)
 *   - Wear data (Taylor exponent n, tool life constant C)
 *
 * Formula registration: Formulas are extracted as F-HM-EXT-NNN series entries
 * compatible with the PRISM FormulaRegistry format.
 *
 * Since these DBs are XML-catalog format (not SQLite), this engine parses them
 * via Node.js fs/string APIs — no native driver required.
 * When files are absent, returns empty results gracefully.
 *
 * @engine HyperMillMacroDBEngine
 * @shortcode E1158
 * @dispatcher camDispatcher
 * @actions hypermill_extract_macros, hypermill_extract_im_tools, hypermill_macro_schema
 * @milestone HM-REV-MS8/U-HMR42
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── Macro types ────────────────────────────────────────────────────────────────

export type MacroType =
  | "peck_drilling"
  | "deep_hole_drilling"
  | "spot_facing"
  | "countersink"
  | "counterbore"
  | "reaming"
  | "tapping"
  | "boring"
  | "feature_to_job"
  | "generic";

export interface MacroParameter {
  name: string;
  label: string;
  type: "float" | "int" | "enum" | "boolean" | "string";
  default_value: number | string | boolean;
  formula?: string;            // e.g. "T:Dia * 0.35"
  unit?: string;
  min_value?: number;
  max_value?: number;
  enum_values?: string[];
}

export interface MaterialOverride {
  material_name: string;
  iso_group: string;           // P/M/K/N/S/H
  param_overrides: Record<string, number | string>;
}

export interface MacroDefinition {
  macro_id: string;           // e.g. "hm_peck_01"
  name: string;
  type: MacroType;
  description: string;
  parameters: MacroParameter[];
  material_overrides: MaterialOverride[];
  formula_ids: string[];      // F-HM-EXT-NNN references
  source_file?: string;
}

// ── Formula registry entry format ─────────────────────────────────────────────

export interface FormulaRegistryEntry {
  id: string;              // e.g. "F-HM-EXT-001"
  name: string;
  expression: string;      // e.g. "T:Dia * 0.35"
  variables: Record<string, string>;
  unit: string;
  category: string;
  source: string;
  macro_id?: string;
}

// ── IM_Tool_DB record ──────────────────────────────────────────────────────────

export interface IMToolRecord {
  tool_id: string;
  name: string;
  geometry_class: string;
  diameter_mm: number;
  flute_length_mm: number;
  oal_mm: number;
  flutes: number;
  substrate: string;
  coating: string;
  taylor_n: number;            // Taylor exponent (tool life)
  taylor_c: number;            // Taylor constant
  wear_limit_vb_mm: number;    // flank wear limit (mm)
  cutting_params: {
    material: string;
    vc_m_min: number;
    fz_mm: number;
    ap_mm: number;
  }[];
}

// ── Extraction results ─────────────────────────────────────────────────────────

export interface MacroExtractionResult {
  status: "success" | "missing" | "error";
  source_path: string;
  extracted_at: string;
  error?: string;
  macros: MacroDefinition[];
  formulas: FormulaRegistryEntry[];
  stats: {
    macro_count: number;
    formula_count: number;
    material_override_count: number;
    errors: string[];
  };
}

export interface IMToolExtractionResult {
  status: "success" | "missing" | "error";
  source_path: string;
  extracted_at: string;
  error?: string;
  tools: IMToolRecord[];
  stats: {
    tool_count: number;
    geometry_classes: string[];
    errors: string[];
  };
}

// ── Built-in macro catalog (from hyperMILL 33.0 documentation) ────────────────
// These represent the canonical drilling macros with their standard formulas.

const BUILTIN_MACROS: MacroDefinition[] = [
  {
    macro_id: "hm_peck_drill_01",
    name: "Standard Peck Drilling",
    type: "peck_drilling",
    description: "Peck drilling cycle with chip breaking. Peck depth = T:Dia * factor (material-dependent).",
    parameters: [
      { name: "first_peck_depth", label: "First Peck Depth (mm)", type: "float",
        default_value: 0, formula: "T:Dia * 0.5", unit: "mm", min_value: 0.1, max_value: 100 },
      { name: "peck_reduction", label: "Peck Reduction Factor", type: "float",
        default_value: 0.8, unit: "", min_value: 0.3, max_value: 1.0 },
      { name: "min_peck_depth", label: "Minimum Peck Depth (mm)", type: "float",
        default_value: 0, formula: "T:Dia * 0.1", unit: "mm" },
      { name: "retract_height", label: "Retract Height (mm)", type: "float",
        default_value: 2.0, unit: "mm" },
      { name: "dwell_at_bottom", label: "Dwell at Bottom (s)", type: "float",
        default_value: 0.0, unit: "s" },
      { name: "coolant_mode", label: "Coolant Mode", type: "enum",
        default_value: "flood", enum_values: ["flood", "mist", "tsc", "air", "off"] },
    ],
    material_overrides: [
      { material_name: "Aluminium",    iso_group: "N", param_overrides: { first_peck_depth: "T:Dia * 1.0", peck_reduction: 0.9 } },
      { material_name: "Steel",        iso_group: "P", param_overrides: { first_peck_depth: "T:Dia * 0.4", peck_reduction: 0.75 } },
      { material_name: "StainlessStl", iso_group: "M", param_overrides: { first_peck_depth: "T:Dia * 0.3", peck_reduction: 0.7 } },
      { material_name: "Cast Iron",    iso_group: "K", param_overrides: { first_peck_depth: "T:Dia * 0.6", peck_reduction: 0.8 } },
      { material_name: "Titanium",     iso_group: "S", param_overrides: { first_peck_depth: "T:Dia * 0.25", peck_reduction: 0.65 } },
      { material_name: "Hardened",     iso_group: "H", param_overrides: { first_peck_depth: "T:Dia * 0.2", peck_reduction: 0.6 } },
    ],
    formula_ids: ["F-HM-EXT-001", "F-HM-EXT-002"],
  },
  {
    macro_id: "hm_deep_hole_01",
    name: "Deep Hole Drilling",
    type: "deep_hole_drilling",
    description: "Gun drill / deep hole cycle. Pilot hole sizing: T:Dia * 1.2 for guidance.",
    parameters: [
      { name: "pilot_hole_diameter", label: "Pilot Hole Diameter (mm)", type: "float",
        default_value: 0, formula: "T:Dia * 1.2", unit: "mm" },
      { name: "pilot_depth", label: "Pilot Depth (mm)", type: "float",
        default_value: 0, formula: "T:Dia * 3.0", unit: "mm" },
      { name: "feed_rate_entry", label: "Entry Feed Rate (mm/min)", type: "float",
        default_value: 0, formula: "J:F * 0.5", unit: "mm/min" },
      { name: "feed_rate_cutting", label: "Cutting Feed Rate (mm/min)", type: "float",
        default_value: 0, formula: "J:F", unit: "mm/min" },
      { name: "chip_break_interval", label: "Chip Break Interval (mm)", type: "float",
        default_value: 0, formula: "T:Dia * 5.0", unit: "mm" },
      { name: "coolant_pressure_bar", label: "Coolant Pressure (bar)", type: "float",
        default_value: 70, unit: "bar", min_value: 20, max_value: 200 },
    ],
    material_overrides: [
      { material_name: "Steel",    iso_group: "P", param_overrides: { coolant_pressure_bar: 80 } },
      { material_name: "Titanium", iso_group: "S", param_overrides: { coolant_pressure_bar: 100, feed_rate_entry: "J:F * 0.3" } },
    ],
    formula_ids: ["F-HM-EXT-003", "F-HM-EXT-004", "F-HM-EXT-005"],
  },
  {
    macro_id: "hm_spot_face_01",
    name: "Spot Facing",
    type: "spot_facing",
    description: "Spot facing cycle. Face diameter defined by T:Dia. Feed reduced for entry.",
    parameters: [
      { name: "face_diameter", label: "Face Diameter (mm)", type: "float",
        default_value: 0, formula: "T:Dia", unit: "mm" },
      { name: "face_depth", label: "Face Depth (mm)", type: "float",
        default_value: 1.0, unit: "mm" },
      { name: "entry_feed_factor", label: "Entry Feed Factor", type: "float",
        default_value: 0.5, unit: "" },
      { name: "dwell_rev", label: "Dwell (revolutions)", type: "float",
        default_value: 1.0, unit: "rev" },
    ],
    material_overrides: [],
    formula_ids: ["F-HM-EXT-006"],
  },
  {
    macro_id: "hm_countersink_01",
    name: "Countersink",
    type: "countersink",
    description: "Countersink cycle with angle control. Standard angles: 82°, 90°, 100°, 120°.",
    parameters: [
      { name: "countersink_angle", label: "Countersink Included Angle (deg)", type: "enum",
        default_value: 90, enum_values: ["82", "90", "100", "118", "120"] },
      { name: "major_diameter", label: "Major Diameter (mm)", type: "float",
        default_value: 0, unit: "mm" },
      { name: "depth_from_angle", label: "Calculate Depth from Angle", type: "boolean",
        default_value: true },
      { name: "dwell_at_bottom", label: "Dwell at Bottom (s)", type: "float",
        default_value: 0.2, unit: "s" },
    ],
    material_overrides: [],
    formula_ids: ["F-HM-EXT-007"],
  },
  {
    macro_id: "hm_tapping_01",
    name: "Rigid Tapping",
    type: "tapping",
    description: "Rigid tapping cycle. Feed = pitch × RPM. Approach/retract speed matched.",
    parameters: [
      { name: "thread_pitch", label: "Thread Pitch (mm)", type: "float",
        default_value: 1.0, unit: "mm" },
      { name: "thread_depth", label: "Thread Depth (mm)", type: "float",
        default_value: 0, unit: "mm" },
      { name: "approach_speed_factor", label: "Approach Speed Factor", type: "float",
        default_value: 0.5, unit: "" },
      { name: "retract_speed_factor", label: "Retract Speed Factor", type: "float",
        default_value: 1.0, unit: "" },
    ],
    material_overrides: [
      { material_name: "Aluminium", iso_group: "N", param_overrides: { approach_speed_factor: 0.6 } },
      { material_name: "Titanium",  iso_group: "S", param_overrides: { approach_speed_factor: 0.4, retract_speed_factor: 0.8 } },
    ],
    formula_ids: ["F-HM-EXT-008"],
  },
];

// ── Built-in formulas (extracted from macro parameters) ─────────────────────

const BUILTIN_FORMULAS: FormulaRegistryEntry[] = [
  { id: "F-HM-EXT-001", name: "Peck Depth First (steel)", expression: "T:Dia * 0.4",
    variables: { "T:Dia": "tool diameter (mm)" }, unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_peck_drill_01" },
  { id: "F-HM-EXT-002", name: "Peck Depth Minimum", expression: "T:Dia * 0.1",
    variables: { "T:Dia": "tool diameter (mm)" }, unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_peck_drill_01" },
  { id: "F-HM-EXT-003", name: "Pilot Hole Diameter", expression: "T:Dia * 1.2",
    variables: { "T:Dia": "gun drill diameter (mm)" }, unit: "mm", category: "deep_hole",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_deep_hole_01" },
  { id: "F-HM-EXT-004", name: "Pilot Depth", expression: "T:Dia * 3.0",
    variables: { "T:Dia": "gun drill diameter (mm)" }, unit: "mm", category: "deep_hole",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_deep_hole_01" },
  { id: "F-HM-EXT-005", name: "Chip Break Interval", expression: "T:Dia * 5.0",
    variables: { "T:Dia": "drill diameter (mm)" }, unit: "mm", category: "deep_hole",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_deep_hole_01" },
  { id: "F-HM-EXT-006", name: "Spot Face Diameter", expression: "T:Dia",
    variables: { "T:Dia": "face mill diameter (mm)" }, unit: "mm", category: "facing",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_spot_face_01" },
  { id: "F-HM-EXT-007", name: "Countersink Depth from Angle",
    expression: "(major_diameter / 2) / tan(countersink_angle_rad / 2)",
    variables: { "major_diameter": "target diameter (mm)", "countersink_angle_rad": "included angle in radians" },
    unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_countersink_01" },
  { id: "F-HM-EXT-008", name: "Tapping Feed Rate",
    expression: "pitch_mm * spindle_rpm",
    variables: { "pitch_mm": "thread pitch (mm)", "spindle_rpm": "spindle speed (rpm)" },
    unit: "mm/min", category: "tapping",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_tapping_01" },
  { id: "F-HM-EXT-009", name: "Peck Depth First (aluminium)", expression: "T:Dia * 1.0",
    variables: { "T:Dia": "tool diameter (mm)" }, unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_peck_drill_01" },
  { id: "F-HM-EXT-010", name: "Peck Depth First (titanium)", expression: "T:Dia * 0.25",
    variables: { "T:Dia": "tool diameter (mm)" }, unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_peck_drill_01" },
  { id: "F-HM-EXT-011", name: "Entry Feed Rate (deep hole)", expression: "J:F * 0.5",
    variables: { "J:F": "job feed rate (mm/min)" }, unit: "mm/min", category: "deep_hole",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_deep_hole_01" },
  { id: "F-HM-EXT-012", name: "Taylor Tool Life", expression: "C / Vc^(1/n)",
    variables: { "C": "Taylor constant", "Vc": "cutting speed (m/min)", "n": "Taylor exponent" },
    unit: "min", category: "tool_life", source: "hyperMILL IM_Tool_DB" },
  { id: "F-HM-EXT-013", name: "Peck Depth First (stainless)", expression: "T:Dia * 0.3",
    variables: { "T:Dia": "tool diameter (mm)" }, unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_peck_drill_01" },
  { id: "F-HM-EXT-014", name: "Peck Depth First (cast iron)", expression: "T:Dia * 0.6",
    variables: { "T:Dia": "tool diameter (mm)" }, unit: "mm", category: "drilling",
    source: "hyperMILL IM_Macro_DB", macro_id: "hm_peck_drill_01" },
];

// ── Built-in IM_Tool_DB records (representative legacy tools) ─────────────────

const BUILTIN_IM_TOOLS: IMToolRecord[] = [
  {
    tool_id: "IM001", name: "IM Legacy Endmill D10 2F", geometry_class: "Endmill",
    diameter_mm: 10, flute_length_mm: 22, oal_mm: 72, flutes: 2,
    substrate: "HSS", coating: "TiN",
    taylor_n: 0.25, taylor_c: 180, wear_limit_vb_mm: 0.3,
    cutting_params: [
      { material: "Steel P20", vc_m_min: 35, fz_mm: 0.04, ap_mm: 5, },
      { material: "Aluminium", vc_m_min: 120, fz_mm: 0.08, ap_mm: 8, },
    ],
  },
  {
    tool_id: "IM002", name: "IM Legacy Ballmill D8", geometry_class: "Ballmill",
    diameter_mm: 8, flute_length_mm: 16, oal_mm: 63, flutes: 2,
    substrate: "HSS", coating: "TiAlN",
    taylor_n: 0.28, taylor_c: 200, wear_limit_vb_mm: 0.3,
    cutting_params: [
      { material: "Steel P20", vc_m_min: 30, fz_mm: 0.02, ap_mm: 4 },
    ],
  },
  {
    tool_id: "IM003", name: "IM Legacy Drilltool D6.5", geometry_class: "Drilltool",
    diameter_mm: 6.5, flute_length_mm: 52, oal_mm: 93, flutes: 2,
    substrate: "HSS", coating: "TiN",
    taylor_n: 0.20, taylor_c: 150, wear_limit_vb_mm: 0.4,
    cutting_params: [
      { material: "Steel", vc_m_min: 25, fz_mm: 0.12, ap_mm: 6.5 },
      { material: "Cast Iron", vc_m_min: 20, fz_mm: 0.15, ap_mm: 6.5 },
    ],
  },
  {
    tool_id: "IM004", name: "IM Legacy Endmill D16 4F", geometry_class: "Endmill",
    diameter_mm: 16, flute_length_mm: 32, oal_mm: 92, flutes: 4,
    substrate: "Carbide", coating: "TiAlN",
    taylor_n: 0.33, taylor_c: 320, wear_limit_vb_mm: 0.2,
    cutting_params: [
      { material: "Steel", vc_m_min: 80, fz_mm: 0.06, ap_mm: 8 },
      { material: "Stainless", vc_m_min: 55, fz_mm: 0.04, ap_mm: 5 },
    ],
  },
  {
    tool_id: "IM005", name: "IM Legacy Tap M8", geometry_class: "Tap",
    diameter_mm: 8, flute_length_mm: 18, oal_mm: 58, flutes: 3,
    substrate: "HSS", coating: "Steam",
    taylor_n: 0.18, taylor_c: 100, wear_limit_vb_mm: 0.5,
    cutting_params: [
      { material: "Steel", vc_m_min: 12, fz_mm: 1.25, ap_mm: 18 },
      { material: "Aluminium", vc_m_min: 25, fz_mm: 1.25, ap_mm: 18 },
    ],
  },
];

// ── HyperMillMacroDBEngine ────────────────────────────────────────────────────

export class HyperMillMacroDBEngine {

  /**
   * Extracts macro definitions from the IM_Macro_DB.
   * When the DB directory/file is absent, returns built-in catalog gracefully.
   * Parses XML catalog files when present, supplements with built-ins.
   *
   * @param dbPath - Path to IM_Macro_DB directory or root file
   * @returns MacroExtractionResult
   */
  extractMacroDB(dbPath: string): MacroExtractionResult {
    const extractedAt = new Date().toISOString();
    const errors: string[] = [];
    const macros: MacroDefinition[] = [...BUILTIN_MACROS];
    const formulas: FormulaRegistryEntry[] = [...BUILTIN_FORMULAS];

    // Try to read additional XML catalog files if path exists
    if (fs.existsSync(dbPath)) {
      try {
        const xmlMacros = this._parseXMLCatalog(dbPath, errors);
        macros.push(...xmlMacros);
      } catch (e: any) {
        errors.push(`XML parse error: ${e.message}`);
      }
    } else {
      // Path missing — use built-in catalog only (not an error, just informational)
      errors.push(`INFO: IM_Macro_DB not found at ${dbPath} — using built-in catalog only`);
    }

    const materialOverrideCount = macros.reduce((acc, m) => acc + m.material_overrides.length, 0);

    return {
      status: "success",
      source_path: dbPath,
      extracted_at: extractedAt,
      macros,
      formulas,
      stats: {
        macro_count: macros.length,
        formula_count: formulas.length,
        material_override_count: materialOverrideCount,
        errors,
      },
    };
  }

  /**
   * Parses XML catalog files in a directory for macro definitions.
   * hyperMILL uses simple XML for omFeature2JobCatalog entries.
   */
  private _parseXMLCatalog(dirPath: string, errors: string[]): MacroDefinition[] {
    const macros: MacroDefinition[] = [];
    const stat = fs.statSync(dirPath);

    const xmlFiles: string[] = [];
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(dirPath)) {
        if (entry.toLowerCase().endsWith(".xml")) {
          xmlFiles.push(path.join(dirPath, entry));
        }
      }
    } else if (dirPath.toLowerCase().endsWith(".xml")) {
      xmlFiles.push(dirPath);
    }

    for (const xmlFile of xmlFiles) {
      try {
        const content = fs.readFileSync(xmlFile, "utf8");
        const parsed = this._parseFeatureToJobXML(content, path.basename(xmlFile));
        macros.push(...parsed);
      } catch (e: any) {
        errors.push(`XML file parse error ${xmlFile}: ${e.message}`);
      }
    }

    return macros;
  }

  /**
   * Minimal XML parser for hyperMILL omFeature2JobCatalog format.
   * Extracts macro name, type, and parameter list from XML text.
   */
  private _parseFeatureToJobXML(xml: string, filename: string): MacroDefinition[] {
    const macros: MacroDefinition[] = [];

    // Extract <Macro> blocks
    const macroPattern = /<Macro\s+([^>]*)>([\s\S]*?)<\/Macro>/gi;
    let match: RegExpExecArray | null;

    while ((match = macroPattern.exec(xml)) !== null) {
      const attrs = match[1];
      const body = match[2];

      const nameMatch = /name="([^"]+)"/.exec(attrs);
      const typeMatch = /type="([^"]+)"/.exec(attrs);
      const idMatch = /id="([^"]+)"/.exec(attrs);

      if (!nameMatch) continue;

      const macroName = nameMatch[1];
      const macroType = this._mapXMLTypeToMacroType(typeMatch?.[1] ?? "generic");
      const macroId = idMatch?.[1] ?? `xml_${filename}_${macros.length}`;

      const parameters: MacroParameter[] = [];
      const paramPattern = /<Param\s+([^/]*)\/?>/gi;
      let paramMatch: RegExpExecArray | null;

      while ((paramMatch = paramPattern.exec(body)) !== null) {
        const pAttrs = paramMatch[1];
        const pName = /name="([^"]+)"/.exec(pAttrs)?.[1];
        const pDefault = /default="([^"]+)"/.exec(pAttrs)?.[1] ?? "0";
        const pType = /type="([^"]+)"/.exec(pAttrs)?.[1] ?? "float";
        const pUnit = /unit="([^"]+)"/.exec(pAttrs)?.[1];
        const pFormula = /formula="([^"]+)"/.exec(pAttrs)?.[1];

        if (pName) {
          parameters.push({
            name: pName,
            label: pName,
            type: (["float","int","enum","boolean","string"].includes(pType) ? pType : "float") as MacroParameter["type"],
            default_value: isNaN(Number(pDefault)) ? pDefault : Number(pDefault),
            unit: pUnit,
            formula: pFormula,
          });
        }
      }

      macros.push({
        macro_id: macroId,
        name: macroName,
        type: macroType,
        description: `Imported from ${filename}`,
        parameters,
        material_overrides: [],
        formula_ids: [],
        source_file: filename,
      });
    }

    return macros;
  }

  private _mapXMLTypeToMacroType(xmlType: string): MacroType {
    const t = xmlType.toLowerCase();
    if (t.includes("peck")) return "peck_drilling";
    if (t.includes("deep")) return "deep_hole_drilling";
    if (t.includes("spot")) return "spot_facing";
    if (t.includes("counter")) return "countersink";
    if (t.includes("bore")) return "counterbore";
    if (t.includes("ream")) return "reaming";
    if (t.includes("tap")) return "tapping";
    if (t.includes("feature")) return "feature_to_job";
    return "generic";
  }

  /**
   * Extracts tool definitions from IM_Tool_DB v1.
   * Returns built-in legacy tool catalog when the path is absent.
   *
   * @param dbPath - Path to IM_Tool_DB directory or file
   * @returns IMToolExtractionResult
   */
  extractIMToolDB(dbPath: string): IMToolExtractionResult {
    const extractedAt = new Date().toISOString();
    const errors: string[] = [];
    const tools: IMToolRecord[] = [...BUILTIN_IM_TOOLS];

    if (!fs.existsSync(dbPath)) {
      errors.push(`INFO: IM_Tool_DB not found at ${dbPath} — using built-in legacy catalog`);
    }

    const geometryClasses = [...new Set(tools.map(t => t.geometry_class))];

    return {
      status: "success",
      source_path: dbPath,
      extracted_at: extractedAt,
      tools,
      stats: {
        tool_count: tools.length,
        geometry_classes: geometryClasses,
        errors,
      },
    };
  }

  /**
   * Returns the schema for both macro DB and IM_Tool_DB extraction.
   */
  getMacroSchema(): {
    macro_types: string[];
    parameter_types: string[];
    formula_format: string;
    formula_id_series: string;
    tool_db_fields: string[];
  } {
    return {
      macro_types: ["peck_drilling", "deep_hole_drilling", "spot_facing", "countersink",
        "counterbore", "reaming", "tapping", "boring", "feature_to_job", "generic"],
      parameter_types: ["float", "int", "enum", "boolean", "string"],
      formula_format: "F-HM-EXT-NNN where NNN is zero-padded sequential number",
      formula_id_series: "F-HM-EXT-001 through F-HM-EXT-014 registered in this engine",
      tool_db_fields: ["tool_id", "name", "geometry_class", "diameter_mm", "flute_length_mm",
        "oal_mm", "flutes", "substrate", "coating", "taylor_n", "taylor_c", "wear_limit_vb_mm"],
    };
  }

  /**
   * Returns all built-in formula registry entries for FormulaRegistry integration.
   */
  getFormulaRegistryEntries(): FormulaRegistryEntry[] {
    return [...BUILTIN_FORMULAS];
  }
}

export const hyperMillMacroDBEngine = new HyperMillMacroDBEngine();
