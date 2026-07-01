/**
 * CAMX-MS20 U03 Action Schemas — Zod
 *
 * 3 dispatcher actions (ISO13399ToolDataEngine E1133):
 *   iso13399_import   — parse ISO 13399 XML → PRISMTool[] + ToolAssembly[]
 *   iso13399_export   — PRISMTool[] → ISO 13399 XML
 *   iso13399_validate — structural validation of ISO 13399 XML
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

/** Per-material-group cutting data carried inside a PRISMTool record. */
const CuttingDataPerMaterialSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe(
    "ISO material group: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous, S=HRSA/Ti, H=Hardened"
  ),
  cutting_speed_m_min: z.number().positive().optional().describe("Cutting speed, m/min"),
  feed_per_tooth_mm:   z.number().positive().optional().describe("Feed per tooth (fz), mm"),
  depth_of_cut_mm:     z.number().positive().optional().describe("Axial depth of cut (ap), mm"),
  width_of_cut_mm:     z.number().positive().optional().describe("Radial width of cut (ae), mm"),
}).describe("Cutting data for one ISO material group");

/** A PRISM tool record used for ISO 13399 export. */
const PRISMToolSchema = z.object({
  id:            z.string().optional().describe("Tool identifier / catalogue number"),
  designation:   z.string().optional().describe("Full tool designation string"),
  manufacturer:  z.string().optional().describe("Tool manufacturer name"),
  tool_type:     z.string().optional().describe(
    "Tool type string: endmill, drill, tap, reamer, ballnose, bull_nose, face_mill, boring_bar, turning_insert, etc."
  ),
  type:          z.string().optional().describe("Alias for tool_type"),
  gtc_class:     z.string().optional().describe(
    "GTC class code override (e.g. '211', '111'). Auto-derived from tool_type when omitted."
  ),

  // Dimensional
  diameter_mm:          z.number().positive().optional().describe("Cutting / nominal diameter, mm"),
  cutting_diameter_mm:  z.number().positive().optional().describe("Alias for diameter_mm"),
  shank_diameter_mm:    z.number().positive().optional().describe("Shank diameter, mm"),
  cutting_length_mm:    z.number().positive().optional().describe("Cutting edge / flute length, mm"),
  flute_length_mm:      z.number().positive().optional().describe("Alias for cutting_length_mm"),
  overall_length_mm:    z.number().positive().optional().describe("Overall tool length (OAL), mm"),
  length_mm:            z.number().positive().optional().describe("Alias for overall_length_mm"),
  corner_radius_mm:     z.number().min(0).optional().describe("Corner / nose radius, mm (0 = sharp)"),
  helix_angle_deg:      z.number().min(0).max(90).optional().describe("Helix angle, degrees"),
  point_angle_deg:      z.number().min(0).max(180).optional().describe("Drill point angle, degrees"),

  // Flutes / inserts
  flutes:        z.number().int().positive().optional().describe("Number of cutting flutes"),
  flute_count:   z.number().int().positive().optional().describe("Alias for flutes"),
  insert_count:  z.number().int().positive().optional().describe("Number of inserts (indexable tools)"),

  // Holder / assembly
  taper:         z.string().optional().describe("Spindle taper interface: CAT40, BT40, HSK-A63, SK40, etc."),
  gauge_length_mm: z.number().positive().optional().describe("Gauge / projection length from spindle face, mm"),
  holder_type:   z.string().optional().describe("Holder style: ER_collet, shrink_fit, hydraulic, straight_shank, etc."),

  // Material / coating
  material:      z.string().optional().describe("Substrate: carbide, hss, cermet, cbn, pcd, ceramic"),
  coating:       z.string().optional().describe("Coating: TiAlN, AlCrN, TiN, DLC, uncoated"),
  grade:         z.string().optional().describe("Insert / substrate grade code"),

  // Default cutting data
  cutting_speed_m_min: z.number().positive().optional().describe("Default cutting speed, m/min"),
  feed_per_tooth_mm:   z.number().positive().optional().describe("Default feed per tooth, mm"),
  depth_of_cut_mm:     z.number().positive().optional().describe("Default axial depth of cut, mm"),
  width_of_cut_mm:     z.number().positive().optional().describe("Default radial width of cut, mm"),

  // Per-material cutting data
  cutting_data_per_material: z.array(CuttingDataPerMaterialSchema).optional().describe(
    "Cutting data indexed by ISO material group (P/M/K/N/S/H). Exported as individual CuttingData blocks."
  ),

  // Lifecycle
  tool_life_min:  z.number().min(0).optional().describe("Expected tool life, minutes"),
  serial_number:  z.string().optional().describe("Tool serial number"),
  status:         z.string().optional().describe("Tool status: active | available | worn | expired | broken | new"),
}).passthrough().describe("A PRISM tool record for ISO 13399 exchange");

// ── Action schemas ─────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS20_U03_SCHEMAS: ActionSchemaMap = {

  /**
   * Parse an ISO 13399 XML document into structured PRISM tool records.
   *
   * Extracts:
   *   tools        — array of PRISMTool records from CuttingItems
   *   assemblies   — array of ToolAssembly records (CuttingItem + AdaptiveItem refs)
   *   warnings     — non-fatal parse issues (missing fields, unknown GTC codes, etc.)
   *   schema_version, units, tool_count, assembly_count — metadata
   *
   * Holder data from AdaptiveItems is automatically merged into the
   * corresponding tool record (taper, holder_type, gauge_length_mm).
   *
   * Supported ISO 13399 versions: 2.0 – 2.2
   * Units: auto-detected from root element attribute (MM / INCH)
   */
  iso13399_import: z.object({
    xml: z.string().min(10).describe(
      "Full ISO 13399 XML document text. Must contain <ISO13399_ToolData> root element with at least one <CuttingItem>."
    ),
  }),

  /**
   * Export PRISM tool records as a full ISO 13399 XML document.
   *
   * Generates:
   *   CuttingItems   — one per tool with GTC class code + dimensional geometry
   *   AdaptiveItems  — one holder record per tool
   *   ToolAssemblies — assembly linkage (optional, default included)
   *   CuttingData    — per-material group blocks when cutting_data_per_material is provided
   *   DefaultCuttingData — single block from cutting_speed_m_min / feed_per_tooth_mm fields
   *
   * GTC class is auto-derived from tool_type when gtc_class is not explicit:
   *   endmill → 211 | ballnose → 212 | bull_nose → 213 | drill → 111
   *   face_mill → 311 | boring_bar → 511 | reamer → 611 | tap → 711 | etc.
   */
  iso13399_export: z.object({
    tools: z.array(PRISMToolSchema).min(1).max(1000).describe(
      "Array of PRISM tool records to export (1–1000 tools). Each tool should include at minimum id/designation and diameter_mm."
    ),
    include_assembly: z.boolean().optional().describe(
      "Include ToolAssembly section linking CuttingItem + AdaptiveItem (default true)"
    ),
    schema_version: z.string().optional().describe(
      "ISO 13399 schema version to declare in root element (default '2.2')"
    ),
    units: z.enum(["mm", "inch"]).optional().describe(
      "Unit system for all dimensional output values (default 'mm')"
    ),
    include_cutting_data: z.boolean().optional().describe(
      "Include DefaultCuttingData and per-material CuttingData blocks (default true)"
    ),
  }),

  /**
   * Validate the structure of an ISO 13399 XML document.
   *
   * Checks performed:
   *   - Root element <ISO13399_ToolData> present
   *   - Version attribute present and plausible (1.0–3.0)
   *   - At least one CuttingItem present
   *   - Each CuttingItem has required 'id' attribute
   *   - Each CuttingItem contains CuttingDiameter dimensional data
   *   - GTC class codes are recognized (warns on unknown, does not block)
   *   - ToolAssembly elements have both CuttingItemRef and AdaptiveItemRef
   *
   * Returns:
   *   valid          — true if no errors (warnings are non-blocking)
   *   errors         — blocking structural issues
   *   warnings       — non-blocking quality issues
   *   schema_version — version string from root element
   *   cutting_item_count, adaptive_item_count, assembly_count — structure counts
   */
  iso13399_validate: z.object({
    xml: z.string().min(1).describe(
      "ISO 13399 XML document to validate. Returns errors and warnings without modifying the document."
    ),
  }),
};
