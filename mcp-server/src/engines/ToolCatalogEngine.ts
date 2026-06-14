/**
 * ToolCatalogEngine — Unified Cutting Tool Catalog with Physical Dimensions
 *
 * Consolidates all tool data sources (SGS, BIG DAISHOWA, Orange Vise, ToolRegistry)
 * into a queryable catalog with physical dimensions for collision avoidance,
 * operation recommendation, and speed/feed parameter lookup.
 *
 * @engine ToolCatalogEngine
 * @dispatcher calcDispatcher
 * @actions tool_catalog_search, tool_catalog_lookup, tool_catalog_assembly,
 *          tool_catalog_collision_envelope, tool_catalog_recommend, tool_catalog_stats
 */

// ── Lazy-loaded catalogs (Layer 2 bundle splitting) ──
// Large catalogs are loaded from dist/data/*.json on first access
// instead of being baked into the 60MB bundle. See src/data/catalogLoader.ts.
import { loadCatalog, loadCatalogExport } from "../data/catalogLoader.js";

// Types only — zero runtime cost (erased by TS compiler)
import type { TungaloyHolder } from "../data/tungaloy-holder-catalog.js";
import type { ManufacturerGrade } from "../data/multi-manufacturer-grades.js";

// ── Small catalogs still imported directly (< 200KB each) ──
import { TUNGALOY_HOLDERS } from "../data/tungaloy-holder-catalog.js";
import { TUNGALOY_ENDMILLS } from "../data/tungaloy-endmill-catalog.js";
import { TUNGALOY_DRILLS } from "../data/tungaloy-drill-catalog.js";
import { SGS_ENDMILL_PARTS_ZR, SGS_ENDMILL_PARTS_ZRM, SGS_QUICK_SPEED_FEED } from "../data/sgs-tool-catalog.js";
import { ALL_MANUFACTURER_GRADES } from "../data/multi-manufacturer-grades.js";
import { BIG_DAISHOWA_HOLDERS } from "../data/big-daishowa-holders.js";
import { HAIMER_HOLDERS } from "../data/haimer-holder-catalog.js";
import { GUHRING_HOLDERS } from "../data/guhring-holder-catalog.js";
import { SECO_TOOLS } from "../data/seco-tool-catalog.js";
import { INGERSOLL_TOOLS, INGERSOLL_INSERTS } from "../data/ingersoll-tool-catalog.js";
import { REGOFIX_HOLDERS } from "../data/regofix-holder-catalog.js";
import { ZENIT_TOOLS } from "../data/zenit-tool-catalog.js";
import { getGlobalCNCDimension } from "../data/global-cnc-dimensions.js";
import { TUNGALOY_US_TOOLS, TUNGALOY_US_CUTTING_CONDITIONS } from "../data/tungaloy-us-tool-catalog.js";
import { SANDVIK_2022_TOOLS } from "../data/sandvik-2022-tool-catalog.js";
import { WIDIA_2022_INCH_TOOLS } from "../data/widia-2022-inch-catalog.js";
import { MITSUBISHI_TURNING_INSERTS, MITSUBISHI_END_MILLS, MITSUBISHI_DRILLS } from "../data/mitsubishi-tool-catalog.js";
import { OSG_SPEED_FEED } from "../data/osg-speed-feed-data.js";
import { GUHRING_SPEED_FEED, ISCAR_SPEED_FEED } from "../data/guhring-iscar-speed-feed-data.js";
import { lookupSpeedFeed, findSpeedFeedByPartialSeries } from "../data/manufacturer-speed-feed-data.js";
import { HELICAL_SPEED_FEED } from "../data/helical-speed-feed-data.js";
import { HORN_TOOLS } from "../data/horn-tool-catalog.js";
import { NIAGARA_TOOLS } from "../data/niagara-tool-catalog.js";
import { DORMER_TOOLS } from "../data/dormer-pramet-tool-catalog.js";
import { dimensionImputationEngine } from "./DimensionImputationEngine.js";

// ── Lazy catalog accessors (loaded from JSON on first call) ──
const getOsgTools = () => loadCatalog<any[]>("osg-tools.json");
const getGuhringTools = () => loadCatalog<any[]>("guhring-tools.json");
const getSandvikTools = () => loadCatalog<any[]>("sandvik-tools.json");
const getAdditionalTools = () => loadCatalog<any[]>("additional-tools.json");
const getIndexableTools = () => loadCatalog<any[]>("indexable-tools.json");
const getEmugeTools = () => loadCatalog<any[]>("emuge-tools.json");
const getAmpcTools = () => loadCatalogExport<any[]>("ampc-tools.json", "AMPC_TOOLS");
const getAmpcCuttingData = () => loadCatalogExport<any[]>("ampc-tools.json", "AMPC_CUTTING_DATA");
const getGlobalCncTools = () => loadCatalog<any[]>("global-cnc-tools.json");
const getSandvik2018RotatingTools = () => loadCatalog<any[]>("sandvik-2018-rotating.json");
const getKennametalTurningTools = () => loadCatalog<any[]>("kennametal-turning.json");
const getHelicalToolCatalog = () => loadCatalog<any[]>("helical-tools.json");
const getSumitomoToolCatalog = () => loadCatalog<any[]>("sumitomo-tools.json");
const getTungaloyTurningInserts = () => loadCatalogExport<any[]>("tungaloy-turning.json", "TUNGALOY_TURNING_INSERTS");
const getTungaloyTurningGrades = () => loadCatalogExport<any[]>("tungaloy-turning.json", "TUNGALOY_TURNING_GRADES");
const getTungaloyGroovingInserts = () => loadCatalogExport<any[]>("tungaloy-turning.json", "TUNGALOY_GROOVING_INSERTS");

// ── Unified Tool Types ──

export interface ToolPhysicalDimensions {
  cutting_diameter_mm: number;
  shank_diameter_mm: number;
  overall_length_mm: number;
  flute_length_mm: number;      // LOC (Length of Cut)
  neck_length_mm?: number;       // reduced-neck reach
  neck_diameter_mm?: number;
  corner_radius_mm?: number;
  point_angle_deg?: number;      // drills
  nose_radius_mm?: number;       // turning inserts
}

export interface ToolCollisionEnvelope {
  /** Max tool body diameter at each Z position from tip */
  profile: Array<{ z_mm: number; diameter_mm: number }>;
  /** Holder gauge length from spindle face */
  holder_gauge_length_mm: number;
  /** Total reach from spindle face to tool tip */
  total_reach_mm: number;
  /** Min clearance radius at any Z position */
  min_clearance_radius_mm: number;
  /** Max holder diameter for interference check */
  holder_max_diameter_mm: number;
}

export interface CatalogTool {
  id: string;
  manufacturer: string;
  series: string;
  designation: string;           // ordering code
  type: "end_mill" | "ball_mill" | "bull_mill" | "face_mill" | "drill" | "tap" |
        "reamer" | "boring_bar" | "insert" | "turning_tool" | "threading_tool" |
        "grooving_tool" | "chamfer_mill" | "slot_drill";
  subtype?: string;              // e.g., "square", "roughing", "finishing", "high_feed"
  material: "carbide" | "hss" | "hss_cobalt" | "cermet" | "ceramic" | "cbn" | "pcd" | "indexable";
  coating?: string;
  physical: ToolPhysicalDimensions;
  flute_count?: number;
  helix_angle_deg?: number;
  rake_angle_deg?: number;
  center_cutting?: boolean;
  max_ramp_angle_deg?: number;
  /** ISO material suitability P/M/K/N/S/H */
  iso_groups: string[];
  /** Recommended operations */
  operations: string[];
  /** Speed/feed recommendations per ISO group */
  cutting_data?: Record<string, {
    vc_min: number;    // m/min
    vc_max: number;
    fz_min: number;    // mm/tooth
    fz_max: number;
    ap_max?: number;   // mm
    ae_max?: number;   // mm
  }>;
  /** Holder compatibility */
  holder_interface?: string;     // e.g., "Weldon", "ER32", "HSK-A63"
  coolant?: "flood" | "through_tool" | "mql" | "dry" | "any";
  source: string;                // catalog name
  catalog_page?: number;
  price_usd?: number;
}

export interface ToolAssembly {
  tool: CatalogTool;
  holder_id?: string;
  holder_gauge_length_mm: number;
  tool_stickout_mm: number;
  total_reach_mm: number;
  collision_envelope: ToolCollisionEnvelope;
}

// ── Standard Tool Dimension Tables ──
// These are industry-standard dimension ratios. Real catalog data overrides.

const END_MILL_STANDARD_DIMS: Record<number, { oal: number; shank: number; loc_2x: number; loc_3x: number }> = {
  // diameter_mm → { overall_length, shank_diameter, flute_length_2xD, flute_length_3xD }
  1:    { oal: 38,  shank: 3,  loc_2x: 2,   loc_3x: 3 },
  1.5:  { oal: 38,  shank: 3,  loc_2x: 3,   loc_3x: 4.5 },
  2:    { oal: 38,  shank: 3,  loc_2x: 4,   loc_3x: 6 },
  2.5:  { oal: 38,  shank: 3,  loc_2x: 5,   loc_3x: 7.5 },
  3:    { oal: 38,  shank: 3,  loc_2x: 6,   loc_3x: 9 },
  4:    { oal: 50,  shank: 4,  loc_2x: 8,   loc_3x: 12 },
  5:    { oal: 50,  shank: 5,  loc_2x: 10,  loc_3x: 15 },
  6:    { oal: 50,  shank: 6,  loc_2x: 12,  loc_3x: 18 },
  8:    { oal: 63,  shank: 8,  loc_2x: 16,  loc_3x: 24 },
  10:   { oal: 72,  shank: 10, loc_2x: 20,  loc_3x: 30 },
  12:   { oal: 83,  shank: 12, loc_2x: 24,  loc_3x: 36 },
  14:   { oal: 83,  shank: 14, loc_2x: 28,  loc_3x: 42 },
  16:   { oal: 92,  shank: 16, loc_2x: 32,  loc_3x: 48 },
  18:   { oal: 92,  shank: 18, loc_2x: 36,  loc_3x: 54 },
  20:   { oal: 104, shank: 20, loc_2x: 40,  loc_3x: 60 },
  25:   { oal: 121, shank: 25, loc_2x: 50,  loc_3x: 75 },
  32:   { oal: 150, shank: 32, loc_2x: 64,  loc_3x: 96 },
};

const DRILL_STANDARD_DIMS: Record<number, { oal: number; flute_length: number }> = {
  1:    { oal: 34,  flute_length: 12 },
  1.5:  { oal: 38,  flute_length: 18 },
  2:    { oal: 44,  flute_length: 24 },
  2.5:  { oal: 50,  flute_length: 30 },
  3:    { oal: 57,  flute_length: 33 },
  3.5:  { oal: 65,  flute_length: 39 },
  4:    { oal: 70,  flute_length: 43 },
  4.5:  { oal: 75,  flute_length: 47 },
  5:    { oal: 82,  flute_length: 52 },
  5.5:  { oal: 85,  flute_length: 57 },
  6:    { oal: 91,  flute_length: 63 },
  6.5:  { oal: 97,  flute_length: 69 },
  7:    { oal: 100, flute_length: 69 },
  7.5:  { oal: 104, flute_length: 69 },
  8:    { oal: 107, flute_length: 75 },
  9:    { oal: 115, flute_length: 81 },
  10:   { oal: 121, flute_length: 87 },
  11:   { oal: 130, flute_length: 94 },
  12:   { oal: 136, flute_length: 101 },
  13:   { oal: 145, flute_length: 101 },
  14:   { oal: 152, flute_length: 108 },
  15:   { oal: 160, flute_length: 114 },
  16:   { oal: 170, flute_length: 120 },
  18:   { oal: 185, flute_length: 130 },
  20:   { oal: 200, flute_length: 140 },
  22:   { oal: 210, flute_length: 145 },
  25:   { oal: 235, flute_length: 160 },
};

// ── Holder Physical Dimensions (from BIG DAISHOWA + industry standard) ──
interface HolderPhysical {
  type: string;
  taper: string;
  bore_min: number;      // mm
  bore_max: number;      // mm
  gauge_length: number;  // mm
  body_diameter: number; // mm
  max_rpm: number;
  runout_um: number;
}

const HOLDER_DIMS: HolderPhysical[] = [
  // ER Collet Chucks
  { type: "ER16", taper: "BT40", bore_min: 1, bore_max: 10, gauge_length: 70, body_diameter: 42, max_rpm: 25000, runout_um: 5 },
  { type: "ER25", taper: "BT40", bore_min: 1, bore_max: 16, gauge_length: 80, body_diameter: 50, max_rpm: 20000, runout_um: 5 },
  { type: "ER32", taper: "BT40", bore_min: 2, bore_max: 20, gauge_length: 90, body_diameter: 55, max_rpm: 18000, runout_um: 5 },
  { type: "ER40", taper: "BT40", bore_min: 3, bore_max: 26, gauge_length: 100, body_diameter: 63, max_rpm: 15000, runout_um: 8 },
  { type: "ER16", taper: "CAT40", bore_min: 1, bore_max: 10, gauge_length: 75, body_diameter: 42, max_rpm: 25000, runout_um: 5 },
  { type: "ER32", taper: "CAT40", bore_min: 2, bore_max: 20, gauge_length: 95, body_diameter: 55, max_rpm: 18000, runout_um: 5 },
  { type: "ER16", taper: "HSK-A63", bore_min: 1, bore_max: 10, gauge_length: 60, body_diameter: 42, max_rpm: 30000, runout_um: 3 },
  { type: "ER32", taper: "HSK-A63", bore_min: 2, bore_max: 20, gauge_length: 80, body_diameter: 55, max_rpm: 22000, runout_um: 3 },
  // Shrink Fit
  { type: "Shrink_6", taper: "BT40", bore_min: 6, bore_max: 6, gauge_length: 75, body_diameter: 28, max_rpm: 40000, runout_um: 3 },
  { type: "Shrink_10", taper: "BT40", bore_min: 10, bore_max: 10, gauge_length: 80, body_diameter: 32, max_rpm: 35000, runout_um: 3 },
  { type: "Shrink_12", taper: "BT40", bore_min: 12, bore_max: 12, gauge_length: 85, body_diameter: 35, max_rpm: 30000, runout_um: 3 },
  { type: "Shrink_16", taper: "BT40", bore_min: 16, bore_max: 16, gauge_length: 90, body_diameter: 40, max_rpm: 28000, runout_um: 3 },
  { type: "Shrink_20", taper: "BT40", bore_min: 20, bore_max: 20, gauge_length: 100, body_diameter: 45, max_rpm: 25000, runout_um: 3 },
  // Hydraulic
  { type: "Hydraulic_12", taper: "BT40", bore_min: 12, bore_max: 12, gauge_length: 85, body_diameter: 40, max_rpm: 30000, runout_um: 3 },
  { type: "Hydraulic_16", taper: "BT40", bore_min: 16, bore_max: 16, gauge_length: 95, body_diameter: 48, max_rpm: 25000, runout_um: 3 },
  { type: "Hydraulic_20", taper: "BT40", bore_min: 20, bore_max: 20, gauge_length: 100, body_diameter: 55, max_rpm: 22000, runout_um: 3 },
  // Milling Chuck
  { type: "Weldon_6", taper: "BT40", bore_min: 6, bore_max: 6, gauge_length: 80, body_diameter: 35, max_rpm: 20000, runout_um: 10 },
  { type: "Weldon_10", taper: "BT40", bore_min: 10, bore_max: 10, gauge_length: 85, body_diameter: 40, max_rpm: 18000, runout_um: 10 },
  { type: "Weldon_12", taper: "BT40", bore_min: 12, bore_max: 12, gauge_length: 90, body_diameter: 42, max_rpm: 16000, runout_um: 10 },
  { type: "Weldon_16", taper: "BT40", bore_min: 16, bore_max: 16, gauge_length: 95, body_diameter: 50, max_rpm: 14000, runout_um: 10 },
  { type: "Weldon_20", taper: "BT40", bore_min: 20, bore_max: 20, gauge_length: 100, body_diameter: 55, max_rpm: 12000, runout_um: 10 },
  { type: "Weldon_25", taper: "BT40", bore_min: 25, bore_max: 25, gauge_length: 110, body_diameter: 63, max_rpm: 10000, runout_um: 12 },
  // Shell Mill Arbor (for face mills)
  { type: "Shell_22", taper: "BT40", bore_min: 22, bore_max: 22, gauge_length: 50, body_diameter: 38, max_rpm: 15000, runout_um: 8 },
  { type: "Shell_27", taper: "BT40", bore_min: 27, bore_max: 27, gauge_length: 55, body_diameter: 45, max_rpm: 12000, runout_um: 8 },
  { type: "Shell_32", taper: "BT40", bore_min: 32, bore_max: 32, gauge_length: 60, body_diameter: 50, max_rpm: 10000, runout_um: 10 },
  // CAT50 variants
  { type: "ER32", taper: "CAT50", bore_min: 2, bore_max: 20, gauge_length: 100, body_diameter: 60, max_rpm: 14000, runout_um: 5 },
  { type: "Shell_32", taper: "CAT50", bore_min: 32, bore_max: 32, gauge_length: 65, body_diameter: 55, max_rpm: 8000, runout_um: 10 },
];

// ── Built-in Speed/Feed Recommendations (from SGS + industry standard) ──
interface SpeedFeedRec {
  iso_group: string;
  tool_type: string;
  vc_min: number; vc_max: number;  // m/min
  fz_min: number; fz_max: number;  // mm/tooth
  ap_max_xD?: number;              // max DOC as multiple of diameter
  ae_max_xD?: number;              // max WOC as multiple of diameter
}

const SPEED_FEED_BASE: SpeedFeedRec[] = [
  // End mills — carbide coated
  { iso_group: "P", tool_type: "end_mill", vc_min: 120, vc_max: 300, fz_min: 0.04, fz_max: 0.15, ap_max_xD: 1.5, ae_max_xD: 0.5 },
  { iso_group: "M", tool_type: "end_mill", vc_min: 60, vc_max: 180, fz_min: 0.03, fz_max: 0.12, ap_max_xD: 1.0, ae_max_xD: 0.4 },
  { iso_group: "K", tool_type: "end_mill", vc_min: 100, vc_max: 250, fz_min: 0.05, fz_max: 0.18, ap_max_xD: 1.5, ae_max_xD: 0.5 },
  { iso_group: "N", tool_type: "end_mill", vc_min: 200, vc_max: 800, fz_min: 0.05, fz_max: 0.20, ap_max_xD: 2.0, ae_max_xD: 0.6 },
  { iso_group: "S", tool_type: "end_mill", vc_min: 25, vc_max: 80, fz_min: 0.02, fz_max: 0.08, ap_max_xD: 0.8, ae_max_xD: 0.3 },
  { iso_group: "H", tool_type: "end_mill", vc_min: 40, vc_max: 120, fz_min: 0.02, fz_max: 0.06, ap_max_xD: 0.5, ae_max_xD: 0.2 },
  // Drills — carbide coated
  { iso_group: "P", tool_type: "drill", vc_min: 80, vc_max: 200, fz_min: 0.10, fz_max: 0.30 },
  { iso_group: "M", tool_type: "drill", vc_min: 50, vc_max: 120, fz_min: 0.08, fz_max: 0.25 },
  { iso_group: "K", tool_type: "drill", vc_min: 70, vc_max: 180, fz_min: 0.12, fz_max: 0.35 },
  { iso_group: "N", tool_type: "drill", vc_min: 100, vc_max: 300, fz_min: 0.10, fz_max: 0.35 },
  { iso_group: "S", tool_type: "drill", vc_min: 15, vc_max: 50, fz_min: 0.05, fz_max: 0.15 },
  { iso_group: "H", tool_type: "drill", vc_min: 30, vc_max: 80, fz_min: 0.04, fz_max: 0.12 },
  // Face mills — indexable
  { iso_group: "P", tool_type: "face_mill", vc_min: 150, vc_max: 350, fz_min: 0.10, fz_max: 0.30 },
  { iso_group: "M", tool_type: "face_mill", vc_min: 80, vc_max: 200, fz_min: 0.08, fz_max: 0.25 },
  { iso_group: "K", tool_type: "face_mill", vc_min: 120, vc_max: 300, fz_min: 0.12, fz_max: 0.35 },
  { iso_group: "N", tool_type: "face_mill", vc_min: 300, vc_max: 1000, fz_min: 0.10, fz_max: 0.25 },
  // Turning inserts
  { iso_group: "P", tool_type: "turning_tool", vc_min: 150, vc_max: 400, fz_min: 0.10, fz_max: 0.40 },
  { iso_group: "M", tool_type: "turning_tool", vc_min: 80, vc_max: 200, fz_min: 0.08, fz_max: 0.30 },
  { iso_group: "K", tool_type: "turning_tool", vc_min: 120, vc_max: 350, fz_min: 0.10, fz_max: 0.40 },
  { iso_group: "N", tool_type: "turning_tool", vc_min: 250, vc_max: 1000, fz_min: 0.08, fz_max: 0.30 },
  { iso_group: "S", tool_type: "turning_tool", vc_min: 25, vc_max: 70, fz_min: 0.05, fz_max: 0.15 },
  { iso_group: "H", tool_type: "turning_tool", vc_min: 60, vc_max: 200, fz_min: 0.04, fz_max: 0.15 },
];

// ── Engine ──

export class ToolCatalogEngine {
  private tools = new Map<string, CatalogTool>();

  constructor() {
    this._loadStandardTools();
  }

  /** Search catalog by criteria */
  search(query: {
    type?: string;
    diameter_mm?: number;
    diameter_range?: [number, number];
    iso_group?: string;
    manufacturer?: string;
    operation?: string;
    coating?: string;
    flute_count?: number;
    max_results?: number;
  }): CatalogTool[] {
    let results = [...this.tools.values()];

    if (query.type) results = results.filter(t => t.type === query.type || t.subtype === query.type);
    if (query.diameter_mm) results = results.filter(t =>
      Math.abs(t.physical.cutting_diameter_mm - query.diameter_mm!) < 0.1);
    if (query.diameter_range) results = results.filter(t =>
      t.physical.cutting_diameter_mm >= query.diameter_range![0] &&
      t.physical.cutting_diameter_mm <= query.diameter_range![1]);
    if (query.iso_group) results = results.filter(t => t.iso_groups.includes(query.iso_group!));
    if (query.manufacturer) results = results.filter(t =>
      t.manufacturer.toLowerCase().includes(query.manufacturer!.toLowerCase()));
    if (query.operation) results = results.filter(t =>
      t.operations.some(o => o.toLowerCase().includes(query.operation!.toLowerCase())));
    if (query.coating) results = results.filter(t => t.coating === query.coating);
    if (query.flute_count) results = results.filter(t => t.flute_count === query.flute_count);

    return results.slice(0, query.max_results ?? 20);
  }

  /** Get a specific tool by ID */
  lookup(id: string): CatalogTool | null {
    return this.tools.get(id) ?? null;
  }

  /** Build a tool assembly with collision envelope */
  assembly(input: {
    tool_id: string;
    holder_type?: string;
    holder_taper?: string;
    stickout_mm?: number;
  }): ToolAssembly {
    const tool = this.tools.get(input.tool_id);
    if (!tool) throw new Error(`Tool not found: ${input.tool_id}`);

    // Find compatible holder — check Tungaloy real data first, then fall back to generic
    const taper = input.holder_taper ?? "BT40";
    const shank = tool.physical.shank_diameter_mm;
    const holder = this._findHolder(taper, shank, input.holder_type);

    if (!holder) throw new Error(`No compatible holder for ${shank}mm shank in ${taper}`);

    const stickout = input.stickout_mm ?? (tool.physical.flute_length_mm + 5); // default: LOC + 5mm clearance
    const totalReach = holder.gauge_length + stickout;

    // Build collision envelope
    const envelope = this._buildEnvelope(tool, holder, stickout);

    return {
      tool,
      holder_id: `${holder.type}_${holder.taper}`,
      holder_gauge_length_mm: holder.gauge_length,
      tool_stickout_mm: stickout,
      total_reach_mm: totalReach,
      collision_envelope: envelope,
    };
  }

  /** Get collision envelope for a tool assembly */
  collisionEnvelope(input: {
    tool_id: string;
    holder_type?: string;
    holder_taper?: string;
    stickout_mm?: number;
  }): ToolCollisionEnvelope {
    return this.assembly(input).collision_envelope;
  }

  /** Get collision data for all tools (batch) — physical dimensions needed for gouge checking */
  collisionDataBatch(input?: {
    manufacturer?: string;
    type?: string;
    min_diameter_mm?: number;
    max_diameter_mm?: number;
  }): Array<{
    id: string;
    manufacturer: string;
    type: string;
    cutting_diameter_mm: number;
    shank_diameter_mm: number;
    flute_length_mm: number;
    overall_length_mm: number;
    neck_diameter_mm?: number;
    neck_length_mm?: number;
    corner_radius_mm?: number;
    flute_count: number;
    max_radial_depth_mm: number;
    collision_zones: Array<{ zone: string; z_start_mm: number; z_end_mm: number; diameter_mm: number }>;
  }> {
    let tools = [...this.tools.values()];
    if (input?.manufacturer) tools = tools.filter(t => t.manufacturer === input.manufacturer);
    if (input?.type) tools = tools.filter(t => t.type === input.type);
    if (input?.min_diameter_mm) tools = tools.filter(t => t.physical.cutting_diameter_mm >= input.min_diameter_mm!);
    if (input?.max_diameter_mm) tools = tools.filter(t => t.physical.cutting_diameter_mm <= input.max_diameter_mm!);

    return tools.map(t => {
      const p = t.physical;
      const zones: Array<{ zone: string; z_start_mm: number; z_end_mm: number; diameter_mm: number }> = [];

      // Zone 1: Cutting (tip to end of flutes)
      zones.push({ zone: "cutting", z_start_mm: 0, z_end_mm: p.flute_length_mm, diameter_mm: p.cutting_diameter_mm });

      // Zone 2: Neck (if exists)
      if (p.neck_length_mm && p.neck_diameter_mm) {
        const neckStart = p.flute_length_mm;
        zones.push({ zone: "neck", z_start_mm: neckStart, z_end_mm: neckStart + p.neck_length_mm, diameter_mm: p.neck_diameter_mm });
      }

      // Zone 3: Shank (from end of neck/flutes to OAL)
      const shankStart = p.neck_length_mm ? p.flute_length_mm + p.neck_length_mm : p.flute_length_mm;
      zones.push({ zone: "shank", z_start_mm: shankStart, z_end_mm: p.overall_length_mm, diameter_mm: p.shank_diameter_mm });

      return {
        id: t.id,
        manufacturer: t.manufacturer,
        type: t.type,
        cutting_diameter_mm: p.cutting_diameter_mm,
        shank_diameter_mm: p.shank_diameter_mm,
        flute_length_mm: p.flute_length_mm,
        overall_length_mm: p.overall_length_mm,
        ...(p.neck_diameter_mm != null ? { neck_diameter_mm: p.neck_diameter_mm } : {}),
        ...(p.neck_length_mm != null ? { neck_length_mm: p.neck_length_mm } : {}),
        ...(p.corner_radius_mm != null ? { corner_radius_mm: p.corner_radius_mm } : {}),
        flute_count: t.flute_count ?? (t.type === "drill" ? 2 : 4),
        max_radial_depth_mm: p.cutting_diameter_mm / 2,
        collision_zones: zones,
      };
    });
  }

  /** Recommend tools for an operation */
  recommend(input: {
    operation: string;        // e.g., "pocket", "drill", "face", "slot", "profile"
    iso_group: string;        // P/M/K/N/S/H
    diameter_mm?: number;
    depth_mm?: number;
    finish_required?: boolean;
    max_results?: number;
  }): Array<CatalogTool & { score: number; reasoning: string }> {
    const opMap: Record<string, string[]> = {
      pocket: ["end_mill", "bull_mill"],
      slot: ["end_mill", "slot_drill"],
      drill: ["drill"],
      face: ["face_mill", "end_mill"],
      profile: ["end_mill", "ball_mill", "bull_mill"],
      bore: ["boring_bar"],
      ream: ["reamer"],
      thread: ["tap", "threading_tool"],
      turn: ["turning_tool", "insert"],
      groove: ["grooving_tool"],
      chamfer: ["chamfer_mill"],
      finish_3d: ["ball_mill"],
    };

    const types = opMap[input.operation] ?? ["end_mill"];
    let candidates = [...this.tools.values()]
      .filter(t => types.includes(t.type) && t.iso_groups.includes(input.iso_group));

    if (input.diameter_mm) {
      candidates = candidates.filter(t =>
        t.physical.cutting_diameter_mm <= input.diameter_mm! * 1.5 &&
        t.physical.cutting_diameter_mm >= input.diameter_mm! * 0.3);
    }

    // Score candidates
    const scored = candidates.map(t => {
      let score = 50;
      const reasons: string[] = [];

      // Exact diameter match bonus
      if (input.diameter_mm && Math.abs(t.physical.cutting_diameter_mm - input.diameter_mm) < 0.5) {
        score += 20;
        reasons.push("exact diameter match");
      }

      // Finishing: prefer more flutes, lower flute count for roughing
      if (input.finish_required && (t.flute_count ?? 0) >= 4) {
        score += 10;
        reasons.push("high flute count for finish");
      } else if (input.finish_required === false && (t.flute_count ?? 0) <= 3) {
        score += 5;
        reasons.push("low flute count for chip evacuation");
      }

      // Depth check
      if (input.depth_mm && t.physical.flute_length_mm >= input.depth_mm) {
        score += 10;
        reasons.push("LOC covers required depth");
      } else if (input.depth_mm && t.physical.flute_length_mm < input.depth_mm) {
        score -= 20;
        reasons.push("LOC insufficient for depth");
      }

      // Premium manufacturer bonus
      if (["SGS", "Sandvik", "Kennametal", "ISCAR", "Korloy", "Mitsubishi"].includes(t.manufacturer)) {
        score += 5;
        reasons.push("premium manufacturer");
      }

      // Multi-manufacturer grade suitability bonus
      const gradeMatch = ALL_MANUFACTURER_GRADES.find(g =>
        g.code === t.series && g.manufacturer === t.manufacturer);
      if (gradeMatch) {
        const suit = gradeMatch.iso_suitability[input.iso_group as keyof typeof gradeMatch.iso_suitability];
        if (suit === "first_choice") { score += 15; reasons.push(`${t.manufacturer} first-choice grade for ${input.iso_group}`); }
        else if (suit === "second_choice") { score += 8; reasons.push(`${t.manufacturer} second-choice grade`); }
      }

      return { ...t, score: Math.max(0, Math.min(100, score)), reasoning: reasons.join("; ") };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, input.max_results ?? 5);
  }

  /** Get catalog statistics */
  stats(): {
    total_tools: number;
    by_type: Record<string, number>;
    by_manufacturer: Record<string, number>;
    diameter_range_mm: [number, number];
    holders: number;
    speed_feed_entries: number;
  } {
    const byType: Record<string, number> = {};
    const byMfg: Record<string, number> = {};
    let minDia = Infinity, maxDia = 0;

    for (const t of this.tools.values()) {
      byType[t.type] = (byType[t.type] ?? 0) + 1;
      byMfg[t.manufacturer] = (byMfg[t.manufacturer] ?? 0) + 1;
      if (t.physical.cutting_diameter_mm < minDia) minDia = t.physical.cutting_diameter_mm;
      if (t.physical.cutting_diameter_mm > maxDia) maxDia = t.physical.cutting_diameter_mm;
    }

    return {
      total_tools: this.tools.size,
      by_type: byType,
      by_manufacturer: byMfg,
      diameter_range_mm: [minDia, maxDia],
      holders: HOLDER_DIMS.length + TUNGALOY_HOLDERS.length + BIG_DAISHOWA_HOLDERS.length + HAIMER_HOLDERS.length + GUHRING_HOLDERS.length,
      speed_feed_entries: SPEED_FEED_BASE.length,
    };
  }

  /** Add tools from external sources (PDF extraction, user input) */
  addTools(tools: CatalogTool[]): { added: number; duplicates: number } {
    let added = 0, duplicates = 0;
    for (const t of tools) {
      if (this.tools.has(t.id)) { duplicates++; continue; }
      this.tools.set(t.id, t);
      added++;
    }
    return { added, duplicates };
  }

  /** Search Tungaloy holder catalog */
  searchHolders(query: {
    taper?: string;
    holder_type?: string;
    bore_diameter_mm?: number;
    max_results?: number;
  }): TungaloyHolder[] {
    let results = [...TUNGALOY_HOLDERS];
    if (query.taper) results = results.filter(h => h.taper.includes(query.taper!));
    if (query.holder_type) results = results.filter(h => h.holder_type === query.holder_type);
    if (query.bore_diameter_mm) {
      const bore = query.bore_diameter_mm;
      results = results.filter(h => {
        if (h.bore_min_mm != null && h.bore_max_mm != null) {
          return bore >= h.bore_min_mm && bore <= h.bore_max_mm;
        }
        if (h.bore_diameter_mm != null) {
          return Math.abs(h.bore_diameter_mm - bore) < 0.5;
        }
        return false;
      });
    }
    return results.slice(0, query.max_results ?? 20);
  }

  // ── Private: Find compatible holder ──
  private _findHolder(taper: string, shank_mm: number, holderType?: string): HolderPhysical | null {
    // 1. Try Tungaloy real catalog data
    const tungaloyMatch = TUNGALOY_HOLDERS.find(h => {
      if (!h.taper.includes(taper.replace("HSK-", "HSK-"))) {
        // Normalize taper comparison: "HSK-A63" matches "HSK-A63"
        const normTaper = taper.replace(/-/g, "");
        const normHTaper = h.taper.replace(/-/g, "");
        if (!normHTaper.includes(normTaper) && !normTaper.includes(normHTaper)) return false;
      }
      // Check bore compatibility
      if (h.bore_min_mm != null && h.bore_max_mm != null) {
        if (shank_mm < h.bore_min_mm || shank_mm > h.bore_max_mm) return false;
      } else if (h.bore_diameter_mm != null) {
        if (Math.abs(h.bore_diameter_mm - shank_mm) > 0.5) return false;
      } else {
        return false;
      }
      if (holderType && !h.holder_type.toLowerCase().includes(holderType.toLowerCase())) return false;
      return true;
    });

    if (tungaloyMatch) {
      // Check BIG DAISHOWA for RPM/runout data for same taper+bore
      const bigMatch = BIG_DAISHOWA_HOLDERS.find(h => {
        const normBigTaper = h.taper.replace("BBT", "BT");
        return (normBigTaper === taper || h.taper === taper) &&
          shank_mm >= h.bore_range_mm[0] && shank_mm <= h.bore_range_mm[1];
      });

      return {
        type: `${tungaloyMatch.holder_type}_${tungaloyMatch.collet ?? tungaloyMatch.bore_diameter_mm ?? ""}`,
        taper: tungaloyMatch.taper,
        bore_min: tungaloyMatch.bore_min_mm ?? tungaloyMatch.bore_diameter_mm ?? shank_mm,
        bore_max: tungaloyMatch.bore_max_mm ?? tungaloyMatch.bore_diameter_mm ?? shank_mm,
        gauge_length: tungaloyMatch.gauge_length_mm,
        body_diameter: tungaloyMatch.body_diameter_mm,
        max_rpm: bigMatch?.max_rpm ?? 25000,
        runout_um: bigMatch?.runout_um ?? 5,
      };
    }

    // 2. Try Haimer catalog (real body_diameter + gauge_length for collision)
    const haimerMatch = HAIMER_HOLDERS.find(h => {
      const normTaper = taper.replace(/-/g, "");
      const normHTaper = h.taper.replace(/-/g, "");
      if (normHTaper !== normTaper && !normHTaper.includes(normTaper) && !normTaper.includes(normHTaper)) return false;
      if (Math.abs(h.bore_diameter_mm - shank_mm) > 0.5) return false;
      if (holderType && !h.holder_type.toLowerCase().includes(holderType.toLowerCase())) return false;
      return true;
    });
    if (haimerMatch) {
      return {
        type: `${haimerMatch.holder_type}_${haimerMatch.bore_diameter_mm}`,
        taper: haimerMatch.taper,
        bore_min: haimerMatch.bore_diameter_mm,
        bore_max: haimerMatch.bore_diameter_mm,
        gauge_length: haimerMatch.gauge_length_mm ?? 50,
        body_diameter: haimerMatch.body_diameter_mm ?? haimerMatch.bore_diameter_mm * 2.5,
        max_rpm: 42000,
        runout_um: 3,
      };
    }

    // 3. Try Guhring hydraulic holders (real body_diameter + gauge_length)
    const guhringMatch = GUHRING_HOLDERS.find(h => {
      if (!h.taper.includes(taper) && !taper.includes(h.taper)) return false;
      if (Math.abs(h.bore_diameter_mm - shank_mm) > 0.5) return false;
      if (holderType && !h.holder_type.toLowerCase().includes(holderType.toLowerCase())) return false;
      return true;
    });
    if (guhringMatch) {
      return {
        type: `hydraulic_${guhringMatch.series}_${guhringMatch.bore_diameter_mm}`,
        taper: guhringMatch.taper,
        bore_min: guhringMatch.bore_diameter_mm,
        bore_max: guhringMatch.bore_diameter_mm,
        gauge_length: guhringMatch.gauge_length_mm ?? 50,
        body_diameter: guhringMatch.body_diameter_mm,
        max_rpm: 50000,
        runout_um: 3,
      };
    }

    // 4. Try BIG DAISHOWA (has RPM/runout but no body_diameter — estimate from bore)
    const bigMatch = BIG_DAISHOWA_HOLDERS.find(h => {
      const normTaper = h.taper.replace("BBT", "BT");
      return (normTaper === taper || h.taper === taper) &&
        shank_mm >= h.bore_range_mm[0] && shank_mm <= h.bore_range_mm[1] &&
        (holderType ? h.type.toLowerCase().includes(holderType.toLowerCase()) : true);
    });
    if (bigMatch) {
      // Estimate body diameter from bore range (typ. 2-3x max bore)
      const estBodyDia = Math.max(bigMatch.bore_range_mm[1] * 2.5, 28);
      return {
        type: `${bigMatch.type}_${bigMatch.model}`,
        taper: bigMatch.taper,
        bore_min: bigMatch.bore_range_mm[0],
        bore_max: bigMatch.bore_range_mm[1],
        gauge_length: bigMatch.gauge_length_mm,
        body_diameter: estBodyDia,
        max_rpm: bigMatch.max_rpm,
        runout_um: bigMatch.runout_um,
      };
    }

    // 5. Fall back to generic HOLDER_DIMS
    return HOLDER_DIMS.find(h =>
      h.taper === taper && shank_mm >= h.bore_min && shank_mm <= h.bore_max &&
      (holderType ? h.type.toLowerCase().includes(holderType.toLowerCase()) : true)
    ) ?? HOLDER_DIMS.find(h => h.taper === taper && shank_mm >= h.bore_min && shank_mm <= h.bore_max) ?? null;
  }

  // ── Private: Build collision envelope ──
  private _buildEnvelope(tool: CatalogTool, holder: HolderPhysical, stickout: number): ToolCollisionEnvelope {
    const profile: ToolCollisionEnvelope["profile"] = [];
    const p = tool.physical;
    const holderGauge = holder.gauge_length;
    const totalReach = holderGauge + stickout;

    // Profile from tip upward (Z=0 is tool tip)
    // 1. Cutting zone: tool diameter
    profile.push({ z_mm: 0, diameter_mm: p.cutting_diameter_mm });
    profile.push({ z_mm: p.flute_length_mm, diameter_mm: p.cutting_diameter_mm });

    // 2. Neck zone (if neck exists)
    if (p.neck_length_mm && p.neck_diameter_mm) {
      profile.push({ z_mm: p.flute_length_mm + 0.1, diameter_mm: p.neck_diameter_mm });
      profile.push({ z_mm: p.flute_length_mm + p.neck_length_mm, diameter_mm: p.neck_diameter_mm });
    }

    // 3. Shank zone
    const shankStart = p.neck_length_mm ? p.flute_length_mm + p.neck_length_mm : p.flute_length_mm;
    profile.push({ z_mm: shankStart + 0.1, diameter_mm: p.shank_diameter_mm });
    profile.push({ z_mm: stickout, diameter_mm: p.shank_diameter_mm });

    // 4. Holder zone
    profile.push({ z_mm: stickout + 0.1, diameter_mm: holder.body_diameter });
    profile.push({ z_mm: totalReach, diameter_mm: holder.body_diameter });

    return {
      profile,
      holder_gauge_length_mm: holderGauge,
      total_reach_mm: totalReach,
      min_clearance_radius_mm: Math.min(p.cutting_diameter_mm, p.neck_diameter_mm ?? p.cutting_diameter_mm, p.shank_diameter_mm) / 2,
      holder_max_diameter_mm: holder.body_diameter,
    };
  }

  // ── Private: Load standard tools ──
  /**
   * Apply statistical dimension imputation to upgrade tools with estimated
   * dimensions (OAL=DC*6, LOC=DC*2) to data-driven predictions.
   * Only updates tools where imputation confidence > 0.7.
   */
  applyDimensionImputation(): { modelsBuilt: number; toolsImputed: number; avgConfidence: number } {
    const allTools = Array.from(this.tools.values());

    // Build regression models from tools with real dimensions
    const { modelsBuilt } = dimensionImputationEngine.buildModels(allTools);

    // Impute dimensions for tools with estimated values
    const results = dimensionImputationEngine.imputeDimensions(allTools);

    let toolsImputed = 0;
    let totalConfidence = 0;

    for (const result of results) {
      // Average confidence across all three dimensions
      const avgConf = (result.confidence.oal + result.confidence.loc + result.confidence.shank) / 3;
      if (avgConf <= 0.7) continue;

      // Find the tool in the catalog and update in-place
      const tool = this.tools.get(result.toolId);
      if (!tool) continue;

      // Skip standard reference tools — their dimensions are intentional
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((tool as any).source === "industry_standard") continue;

      tool.physical.overall_length_mm = result.imputed.oal;
      tool.physical.flute_length_mm = result.imputed.loc;
      tool.physical.shank_diameter_mm = result.imputed.shank;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tool as any).dimensionSource = "imputed";

      toolsImputed++;
      totalConfidence += avgConf;
    }

    return {
      modelsBuilt,
      toolsImputed,
      avgConfidence: toolsImputed > 0 ? Math.round((totalConfidence / toolsImputed) * 1000) / 1000 : 0,
    };
  }

  applyFieldInference(): { flutesFilled: number; helixFilled: number; coatingFilled: number; centerCuttingFilled: number } {
    let flutesFilled = 0;
    let helixFilled = 0;
    let coatingFilled = 0;
    let centerCuttingFilled = 0;

    for (const tool of this.tools.values()) {
      // 1. Flute count inference
      if (!tool.flute_count) {
        const isSpiralPoint = tool.subtype?.includes("spiral_point");
        const fluteMap: Record<string, number> = {
          drill: 2, reamer: 6, end_mill: 4, ball_mill: 2, boring_bar: 1,
          insert: 1, turning_tool: 1, grooving_tool: 1, threading_tool: 1,
          chamfer_mill: 4, slot_drill: 2,
        };
        if (tool.type === "tap") {
          tool.flute_count = isSpiralPoint ? 2 : 3;
          flutesFilled++;
        } else if (tool.type === "face_mill") {
          tool.flute_count = Math.round((tool.physical?.cutting_diameter_mm ?? 50) / 12);
          flutesFilled++;
        } else if (fluteMap[tool.type] !== undefined) {
          tool.flute_count = fluteMap[tool.type];
          flutesFilled++;
        }
      }

      // 2. Helix angle inference
      if (tool.helix_angle_deg == null) {
        const isSpiralPoint = tool.subtype?.includes("spiral_point");
        const helixMap: Record<string, number> = {
          drill: 30, end_mill: 35, ball_mill: 30,
          chamfer_mill: 35, reamer: 8,
        };
        if (tool.type === "tap") {
          tool.helix_angle_deg = isSpiralPoint ? 15 : 35;
          helixFilled++;
        } else if (tool.subtype === "roughing" && tool.type === "end_mill") {
          tool.helix_angle_deg = 38;
          helixFilled++;
        } else if (helixMap[tool.type] !== undefined) {
          tool.helix_angle_deg = helixMap[tool.type];
          helixFilled++;
        }
      }

      // 3. Coating inference
      if (tool.coating == null) {
        const mat = tool.material;
        const tp = tool.type;
        if (mat === "cbn" || mat === "pcd") {
          tool.coating = "uncoated";
        } else if (mat === "hss" || mat === "hss_cobalt") {
          tool.coating = "TiN";
        } else if (mat === "carbide" && tp === "tap") {
          tool.coating = "TiCN";
        } else if (mat === "carbide" && (tp.includes("mill") || tp === "drill")) {
          tool.coating = "TiAlN";
        } else {
          tool.coating = "TiAlN";
        }
        coatingFilled++;
      }

      // 4. Center cutting inference
      if (tool.center_cutting == null) {
        if (tool.type === "end_mill" && (tool.flute_count ?? 5) <= 4) {
          tool.center_cutting = true;
          centerCuttingFilled++;
        } else if (tool.type === "ball_mill" || tool.type === "drill" || tool.type === "chamfer_mill") {
          tool.center_cutting = true;
          centerCuttingFilled++;
        }
      }
    }

    return { flutesFilled, helixFilled, coatingFilled, centerCuttingFilled };
  }

  private _loadStandardTools(): void {
    // Generate standard end mills for each diameter
    for (const [diaStr, dims] of Object.entries(END_MILL_STANDARD_DIMS)) {
      const dia = Number(diaStr);
      for (const flutes of [2, 3, 4]) {
        // Standard length (2xD LOC)
        const id = `STD-EM-${dia}x${flutes}F-2xD`;
        const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "end_mill");
        const cuttingData: CatalogTool["cutting_data"] = {};
        for (const s of sf) {
          cuttingData[s.iso_group] = {
            vc_min: s.vc_min, vc_max: s.vc_max,
            fz_min: s.fz_min, fz_max: s.fz_max,
            ap_max: (s.ap_max_xD ?? 1) * dia,
            ae_max: (s.ae_max_xD ?? 0.5) * dia,
          };
        }

        this.tools.set(id, {
          id,
          manufacturer: "Standard",
          series: "Standard",
          designation: `End Mill ${dia}mm ${flutes}F`,
          type: "end_mill",
          subtype: flutes <= 2 ? "slotting" : flutes >= 4 ? "finishing" : "general",
          material: "carbide",
          coating: "TiAlN",
          physical: {
            cutting_diameter_mm: dia,
            shank_diameter_mm: dims.shank,
            overall_length_mm: dims.oal,
            flute_length_mm: dims.loc_2x,
          },
          flute_count: flutes,
          helix_angle_deg: flutes <= 2 ? 30 : 35,
          center_cutting: true,
          max_ramp_angle_deg: flutes <= 2 ? 5 : 3,
          iso_groups: ["P", "M", "K", "N", "S", "H"],
          operations: ["pocket", "slot", "profile", "face", "ramp"],
          cutting_data: cuttingData,
          holder_interface: "Weldon",
          coolant: "flood",
          source: "industry_standard",
        });

        // Long reach (3xD LOC)
        const idLong = `STD-EM-${dia}x${flutes}F-3xD`;
        this.tools.set(idLong, {
          ...this.tools.get(id)!,
          id: idLong,
          designation: `End Mill ${dia}mm ${flutes}F Long`,
          subtype: "long_reach",
          physical: {
            cutting_diameter_mm: dia,
            shank_diameter_mm: dims.shank,
            overall_length_mm: dims.oal + (dims.loc_3x - dims.loc_2x),
            flute_length_mm: dims.loc_3x,
          },
        });
      }

      // Ball mill
      const ballId = `STD-BM-${dia}x2F`;
      this.tools.set(ballId, {
        id: ballId,
        manufacturer: "Standard",
        series: "Standard",
        designation: `Ball Mill ${dia}mm 2F`,
        type: "ball_mill",
        material: "carbide",
        coating: "TiAlN",
        physical: {
          cutting_diameter_mm: dia,
          shank_diameter_mm: dims.shank,
          overall_length_mm: dims.oal,
          flute_length_mm: dims.loc_2x,
          corner_radius_mm: dia / 2,
        },
        flute_count: 2,
        helix_angle_deg: 30,
        center_cutting: true,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["finish_3d", "profile", "pocket"],
        source: "industry_standard",
      });
    }

    // Generate standard drills
    for (const [diaStr, dims] of Object.entries(DRILL_STANDARD_DIMS)) {
      const dia = Number(diaStr);
      const id = `STD-DR-${dia}`;
      const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "drill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sf) {
        cuttingData[s.iso_group] = { vc_min: s.vc_min, vc_max: s.vc_max, fz_min: s.fz_min, fz_max: s.fz_max };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Standard",
        series: "Standard",
        designation: `Drill ${dia}mm`,
        type: "drill",
        material: "carbide",
        coating: "TiAlN",
        physical: {
          cutting_diameter_mm: dia,
          shank_diameter_mm: dia,
          overall_length_mm: dims.oal,
          flute_length_mm: dims.flute_length,
          point_angle_deg: 140,
        },
        flute_count: 2,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["drill"],
        cutting_data: cuttingData,
        coolant: dia >= 5 ? "through_tool" : "flood",
        source: "industry_standard",
      });
    }

    // Standard face mills
    for (const dia of [50, 63, 80, 100]) {
      const id = `STD-FM-${dia}`;
      const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "face_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sf) {
        cuttingData[s.iso_group] = { vc_min: s.vc_min, vc_max: s.vc_max, fz_min: s.fz_min, fz_max: s.fz_max };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Standard",
        series: "Standard",
        designation: `Face Mill ${dia}mm`,
        type: "face_mill",
        material: "indexable",
        physical: {
          cutting_diameter_mm: dia,
          shank_diameter_mm: dia <= 63 ? 22 : 27,
          overall_length_mm: 50,
          flute_length_mm: 4, // insert cutting depth
        },
        flute_count: Math.round(dia / 12),
        iso_groups: ["P", "M", "K", "N"],
        operations: ["face"],
        cutting_data: cuttingData,
        holder_interface: dia <= 63 ? "Shell_22" : "Shell_27",
        source: "industry_standard",
      });
    }

    // Load manufacturer catalog tools
    this._loadTungaloyEndmills();
    this._loadTungaloyDrills();
    this._loadTungaloyTurning();
    this._loadTungaloyUSDrills();
    this._loadSGSEndmills();
    this._loadMultiManufacturerInserts();
    this._loadOSGTools();
    this._loadGuhringTools();
    this._loadSandvikTools();
    this._loadHaimerHolders();
    this._loadAdditionalTools();
    this._loadSecoTools();
    this._loadIndexableTools();
    this._loadIngersollTools();
    this._loadEmugeTools();
    this._loadRegofixHolders();
    this._loadZenitTools();
    this._loadAMPCTools();
    this._loadGlobalCNCTools();
    this._loadKennametalRotating();
    this._loadKennametalTurning();
    this._loadWidia2022();
    this._loadWidia2022Inch();
    this._loadMitsubishiTools();
    this._loadHelicalTools();
    this._loadHornTools();
    this._loadNiagaraTools();
    this._loadDormerPrametTools();
    this._loadSumitomoTools();

    // Apply statistical dimension imputation to upgrade estimated dimensions
    this.applyDimensionImputation();

    // Apply field inference for flute count, helix angle, coating, center cutting
    this.applyFieldInference();
  }

  private _loadTungaloyEndmills(): void {
    const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "end_mill");
    for (const te of TUNGALOY_ENDMILLS) {
      const id = `TNG-${te.designation}`;
      if (this.tools.has(id)) continue;

      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sf) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min, fz_max: s.fz_max,
          ap_max: (s.ap_max_xD ?? 1) * te.cutting_diameter_mm,
          ae_max: (s.ae_max_xD ?? 0.5) * te.cutting_diameter_mm,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Tungaloy",
        series: "SolidMeister",
        designation: te.designation,
        type: te.type as CatalogTool["type"],
        material: "carbide",
        coating: "AH725",
        physical: {
          cutting_diameter_mm: te.cutting_diameter_mm,
          shank_diameter_mm: te.shank_diameter_mm,
          overall_length_mm: te.overall_length_mm,
          flute_length_mm: te.flute_length_mm,
          corner_radius_mm: te.corner_radius_mm ?? (te.type === "ball_mill" ? te.cutting_diameter_mm / 2 : undefined),
        },
        flute_count: te.flute_count,
        helix_angle_deg: 35,
        center_cutting: true,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: te.type === "ball_mill"
          ? ["finish_3d", "profile", "pocket"]
          : ["pocket", "slot", "profile", "face", "ramp"],
        cutting_data: cuttingData,
        coolant: "flood",
        source: "Tungaloy_GC_2023-2024",
      });
    }
  }
  private _loadSGSEndmills(): void {
    const allParts = [...SGS_ENDMILL_PARTS_ZR, ...SGS_ENDMILL_PARTS_ZRM];
    for (const part of allParts) {
      const id = `SGS-${part.edp_number}`;
      if (this.tools.has(id)) continue;

      const dia_mm = Math.round(part.diameter_in * 25.4 * 100) / 100;
      const shank_mm = Math.round(part.shank_dia_in * 25.4 * 100) / 100;
      const loc_mm = Math.round(part.loc_in * 25.4 * 100) / 100;
      const oal_mm = Math.round(part.oal_in * 25.4 * 100) / 100;
      const cr_mm = part.corner_radius_in ? Math.round(part.corner_radius_in * 25.4 * 100) / 100 : undefined;

      // Build speed/feed from SGS_QUICK_SPEED_FEED for this series
      const seriesSF = SGS_QUICK_SPEED_FEED.filter(s => s.series === part.series);
      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of seriesSF) {
        const vc_profile = Math.round(s.profile_sfm * 0.3048);  // SFM → m/min
        const vc_slot = Math.round(s.slot_sfm * 0.3048);
        // Scale IPT from 1/2" reference to actual diameter
        const scale = dia_mm / 12.7;
        const fz = Math.round(s.ipt_half_inch_profile * 25.4 * Math.sqrt(scale) * 1000) / 1000;
        cuttingData[s.iso_group] = {
          vc_min: vc_slot, vc_max: vc_profile,
          fz_min: fz * 0.7, fz_max: fz * 1.3,
          ap_max: loc_mm, ae_max: dia_mm * 0.5,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "SGS",
        series: part.series,
        designation: `SGS ${part.series} EDP ${part.edp_number}`,
        type: "end_mill",
        material: "carbide",
        coating: part.coating,
        physical: {
          cutting_diameter_mm: dia_mm,
          shank_diameter_mm: shank_mm,
          overall_length_mm: oal_mm,
          flute_length_mm: loc_mm,
          corner_radius_mm: cr_mm,
        },
        flute_count: part.flute_count,
        helix_angle_deg: 36,
        center_cutting: true,
        iso_groups: part.application,
        operations: ["pocket", "slot", "profile", "face", "ramp"],
        cutting_data: cuttingData,
        coolant: "flood",
        source: "SGS_Global_Catalog_v26.1",
      });
    }
  }

  private _loadTungaloyDrills(): void {
    const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "drill");
    for (const td of TUNGALOY_DRILLS) {
      const id = `TNG-${td.designation}`;
      if (this.tools.has(id)) continue;

      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sf) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min, fz_max: s.fz_max,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Tungaloy",
        series: "DrillMeister",
        designation: td.designation,
        type: "drill",
        material: "carbide",
        coating: "AH725",
        physical: {
          cutting_diameter_mm: td.cutting_diameter_mm,
          shank_diameter_mm: td.shank_diameter_mm,
          overall_length_mm: td.overall_length_mm,
          flute_length_mm: td.flute_length_mm ?? td.cutting_diameter_mm * 3,
          point_angle_deg: td.point_angle_deg ?? 140,
        },
        flute_count: 2,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["drill"],
        cutting_data: cuttingData,
        coolant: td.cutting_diameter_mm >= 3 ? "through_tool" : "flood",
        source: "Tungaloy_GC_2023-2024",
      });
    }
  }

  /** Load Tungaloy US (inch-specific) drills from GC_2023-2024_US editions */
  private _loadTungaloyUSDrills(): void {
    // Convert US cutting conditions: SFM→m/min, IPR→mm/rev (approximate fz for 2-flute drills)
    const cuttingData: CatalogTool["cutting_data"] = {};
    for (const cc of TUNGALOY_US_CUTTING_CONDITIONS) {
      // SFM * 0.3048 = m/min; IPR * 25.4 = mm/rev; mm/rev / 2 flutes = fz
      const vc_min = Math.round(cc.vc_min_sfm * 0.3048 * 10) / 10;
      const vc_max = Math.round(cc.vc_max_sfm * 0.3048 * 10) / 10;
      const fz_min = Math.round(cc.feed_min_ipr * 25.4 / 2 * 1000) / 1000;
      const fz_max = Math.round(cc.feed_max_ipr * 25.4 / 2 * 1000) / 1000;
      // Use first entry per ISO group P (most conditions are for P-group turning inserts)
      if (!cuttingData["P"]) {
        cuttingData["P"] = { vc_min, vc_max, fz_min, fz_max };
      }
    }
    // Fallback: apply P data to all groups
    const fallback = cuttingData["P"] ?? { vc_min: 150, vc_max: 400, fz_min: 0.03, fz_max: 0.2 };
    for (const g of ["M", "K", "N", "S", "H"] as const) {
      if (!cuttingData[g]) cuttingData[g] = { ...fallback };
    }

    for (const td of TUNGALOY_US_TOOLS) {
      const id = `TNG-US-${td.designation}`;
      if (this.tools.has(id)) continue;

      this.tools.set(id, {
        id,
        manufacturer: "Tungaloy",
        series: "US-Edition",
        designation: td.designation,
        type: "drill",
        subtype: td.type.replace(/_/g, " "),
        material: td.type === "solid_drill" ? "carbide" : "indexable",
        coating: "AH725",
        physical: {
          cutting_diameter_mm: td.cutting_diameter_mm,
          shank_diameter_mm: td.shank_diameter_mm,
          overall_length_mm: td.overall_length_mm,
          flute_length_mm: td.flute_length_mm ?? td.cutting_diameter_mm * td.ld_ratio,
        },
        flute_count: 2,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["drill"],
        cutting_data: cuttingData,
        coolant: td.cutting_diameter_mm >= 3 ? "through_tool" : "flood",
        source: "Tungaloy_GC_2023-2024_US",
      });
    }
  }

  /** Load Tungaloy turning inserts from GC_2023-2024 catalog */
  private _loadTungaloyTurning(): void {
    // Create catalog entries for each insert + grade combination
    for (const insert of getTungaloyTurningInserts()) {
      const grades = insert.available_grades ?? getTungaloyTurningGrades().map((g: any) => g.grade);
      for (const gradeCode of grades) {
        const gradeInfo = getTungaloyTurningGrades().find((g: any) => g.grade === gradeCode);
        const suitableGroups = gradeInfo?.iso_groups ?? ["P"];
        if (suitableGroups.length === 0) continue;

        const ic = insert.ic_mm;
        const id = `TNG-T-${insert.shape_code}-${gradeCode}`;
        if (this.tools.has(id)) continue;

        // Infer substrate from grade description
        const desc = gradeInfo?.description?.toLowerCase() ?? '';
        const substrate = desc.includes('cermet') ? 'cermet' :
                          desc.includes('cbn') ? 'cbn' :
                          desc.includes('pcd') ? 'pcd' :
                          desc.includes('ceramic') ? 'ceramic' : 'carbide';
        const coated = desc.includes('coated') && !desc.includes('uncoated');

        this.tools.set(id, {
          id,
          manufacturer: "Tungaloy",
          series: "GC_2023-2024",
          designation: `${insert.designation} ${gradeCode}`,
          type: insert.shape_code.endsWith('A') ? "insert" : "turning_tool",
          subtype: insert.insert_shape,
          material: substrate,
          coating: coated ? 'PVD' : undefined,
          physical: {
            cutting_diameter_mm: ic,
            shank_diameter_mm: ic,
            overall_length_mm: ic * 1.2,
            flute_length_mm: ic * 0.5,
            nose_radius_mm: insert.nose_radius_mm ?? 0.8,
          },
          iso_groups: suitableGroups,
          operations: ["turning", "facing", "boring"],
          source: "Tungaloy_GC_2023-2024_Turning",
        });
      }
    }

    // Also load grooving inserts
    for (const gi of getTungaloyGroovingInserts()) {
      const cw = gi.width_mm ?? gi.cutting_width_mm ?? 3.0;
      const id = `TNG-G-${gi.family}-${gi.designation}`;
      if (this.tools.has(id)) continue;

      this.tools.set(id, {
        id,
        manufacturer: "Tungaloy",
        series: gi.family,
        designation: gi.designation,
        type: "grooving_tool",
        subtype: "grooving",
        material: "carbide",
        physical: {
          cutting_diameter_mm: cw,
          shank_diameter_mm: cw,
          overall_length_mm: 20,
          flute_length_mm: gi.max_grooving_depth_mm ?? 10,
        },
        iso_groups: gi.available_grades ?? [],
        operations: ["grooving", "parting", "turning"],
        source: "Tungaloy_GC_2023-2024_Turning",
      });
    }
  }
  private _loadMultiManufacturerInserts(): void {
    // ISCAR insert families — proprietary systems with representative geometries
    const iscarFamilies: Array<{
      family: string; type: CatalogTool["type"]; subtype: string;
      diameters: number[]; operations: string[]; iso_groups: string[];
      description: string;
    }> = [
      { family: "SUMO-TEC", type: "turning_tool", subtype: "turning",
        diameters: [12.7, 16, 20, 25], operations: ["turn", "face"],
        iso_groups: ["P", "M", "K"], description: "SUMO TEC CVD-coated turning inserts" },
      { family: "DOVE-IQ-MILL", type: "face_mill", subtype: "face",
        diameters: [50, 63, 80, 100], operations: ["face", "shoulder"],
        iso_groups: ["P", "M", "K", "S"], description: "DOVE-IQ 45° face milling system" },
      { family: "HELI-IQ-MILL", type: "end_mill", subtype: "shoulder",
        diameters: [25, 32, 40, 50], operations: ["shoulder", "profile", "pocket"],
        iso_groups: ["P", "M", "K"], description: "HELI-IQ-MILL 90° shoulder milling" },
      { family: "TANG-GRIP", type: "grooving_tool", subtype: "grooving",
        diameters: [2, 3, 4, 5, 6], operations: ["groove", "parting"],
        iso_groups: ["P", "M", "K", "S"], description: "TANG-GRIP tangential grooving/parting" },
      { family: "CHAM-IQ-DRILL", type: "drill", subtype: "indexable_drill",
        diameters: [14, 17, 20, 25, 30, 33, 40], operations: ["drill"],
        iso_groups: ["P", "M", "K"], description: "CHAM-IQ-DRILL indexable drill" },
      { family: "MULTI-MASTER", type: "end_mill", subtype: "modular",
        diameters: [8, 10, 12, 16, 20, 25], operations: ["pocket", "profile", "face", "slot"],
        iso_groups: ["P", "M", "K", "N", "S"], description: "MULTI-MASTER modular end mill system" },
    ];

    const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "end_mill");
    for (const fam of iscarFamilies) {
      for (const dia of fam.diameters) {
        const id = `ISCAR-${fam.family}-${dia}`;
        if (this.tools.has(id)) continue;

        const cuttingData: CatalogTool["cutting_data"] = {};
        for (const s of sf) {
          if (fam.iso_groups.includes(s.iso_group)) {
            cuttingData[s.iso_group] = {
              vc_min: s.vc_min, vc_max: s.vc_max,
              fz_min: s.fz_min, fz_max: s.fz_max,
              ap_max: (s.ap_max_xD ?? 1) * dia,
              ae_max: (s.ae_max_xD ?? 0.5) * dia,
            };
          }
        }

        this.tools.set(id, {
          id,
          manufacturer: "ISCAR",
          series: fam.family,
          designation: `${fam.family} ${dia}mm`,
          type: fam.type,
          subtype: fam.subtype,
          material: "carbide",
          coating: "SUMO TEC",
          physical: {
            cutting_diameter_mm: dia,
            shank_diameter_mm: dia <= 20 ? dia : Math.round(dia * 0.8),
            overall_length_mm: dia * 5,
            flute_length_mm: dia * 2,
          },
          iso_groups: fam.iso_groups,
          operations: fam.operations,
          cutting_data: cuttingData,
          coolant: dia >= 14 ? "through_tool" : "flood",
          source: "ISCAR_PART_1",
        });
      }
    }

    // Load multi-manufacturer grade data as insert entries (turning inserts per grade)
    for (const grade of ALL_MANUFACTURER_GRADES) {
      if (!grade.application.startsWith("turning")) continue;
      const id = `${grade.manufacturer.toUpperCase()}-${grade.code}`;
      if (this.tools.has(id)) continue;

      const isoGroups = (Object.entries(grade.iso_suitability) as Array<[string, string]>)
        .filter(([, v]) => v !== "not_recommended")
        .map(([k]) => k);

      this.tools.set(id, {
        id,
        manufacturer: grade.manufacturer,
        series: grade.code,
        designation: `${grade.manufacturer} ${grade.code} Insert`,
        type: "turning_tool",
        subtype: "insert",
        material: grade.substrate,
        coating: grade.coating === "uncoated" ? undefined : grade.coating,
        physical: {
          cutting_diameter_mm: 12.7, // standard IC
          shank_diameter_mm: 12.7,
          overall_length_mm: 12.7,
          flute_length_mm: 4,
        },
        iso_groups: isoGroups,
        operations: ["turn", "face", "bore"],
        source: `${grade.manufacturer}_catalog`,
      });
    }
  }

  private _loadOSGTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const osg of getOsgTools()) {
      const id = `OSG-${osg.edp}`;
      if (this.tools.has(id)) continue;

      const toolType = osg.type as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === (toolType === "ball_mill" ? "end_mill" : toolType));

      // Try OSG manufacturer S/F first, fall back to SPEED_FEED_BASE
      const cuttingData: CatalogTool["cutting_data"] = {};
      const seriesGuess = osg.edp?.substring(0, 3) ?? "";
      const osgMatch = OSG_SPEED_FEED.filter(s => osg.edp?.includes(s.series) || seriesGuess.includes(s.series.substring(0, 3)));
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = osgMatch.find(s => s.isoGroup === iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max,
            ...(toolType !== "drill" ? { ap_max: osg.flute_length_mm ?? osg.cutting_diameter_mm * 1.5, ae_max: osg.cutting_diameter_mm } : {}),
          };
        } else {
          const base = sfForType.find(s => s.iso_group === iso);
          if (base) {
            const scale = osg.cutting_diameter_mm > 0 ? Math.sqrt(osg.cutting_diameter_mm / 10) : 1;
            cuttingData[iso] = { vc_min: base.vc_min, vc_max: base.vc_max, fz_min: base.fz_min * scale, fz_max: base.fz_max * scale,
              ...(toolType !== "drill" ? { ap_max: osg.flute_length_mm ?? osg.cutting_diameter_mm * 1.5, ae_max: osg.cutting_diameter_mm } : {}),
            };
          }
        }
      }

      const shank = osg.shank_diameter_mm ?? osg.cutting_diameter_mm;
      const oal = osg.overall_length_mm ?? (toolType === "drill" ? osg.cutting_diameter_mm * 8 : osg.cutting_diameter_mm * 5);
      const loc = osg.flute_length_mm ?? osg.cutting_diameter_mm * 2;

      this.tools.set(id, {
        id,
        manufacturer: "OSG",
        series: toolType === "drill" ? "A Brand" : "EXOMILL",
        designation: osg.edp,
        type: toolType,
        material: osg.material === "hss" ? "hss" : "carbide",
        physical: {
          cutting_diameter_mm: osg.cutting_diameter_mm,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: loc,
          ...(osg.neck_length_mm ? { neck_length_mm: osg.neck_length_mm } : {}),
          ...(osg.neck_diameter_mm ? { neck_diameter_mm: osg.neck_diameter_mm } : {}),
          ...(toolType === "ball_mill" ? { corner_radius_mm: osg.cutting_diameter_mm / 2 } : {}),
        },
        flute_count: osg.flute_count,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "ball_mill" ? ["contour", "finish", "3d_finish"] :
                    ["pocket", "slot", "contour", "face"],
        cutting_data: cuttingData,
        coolant: osg.material === "carbide" ? "through_tool" : "flood",
        source: "OSG_catalog",
        catalog_page: Number((osg as unknown as Record<string, unknown>).page) || undefined,
      });
    }
  }

  private _loadGuhringTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const g of getGuhringTools()) {
      const id = `GUH-${g.designation}`;
      if (this.tools.has(id)) continue;

      const toolType = g.type as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === (toolType === "reamer" ? "drill" : toolType));

      // Try Guhring manufacturer S/F first
      const cuttingData: CatalogTool["cutting_data"] = {};
      const gSeries = g.article ?? "";
      const gMatch = GUHRING_SPEED_FEED.filter(s => gSeries.includes(s.series) || s.series === gSeries);
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = gMatch.find(s => s.isoGroup === iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max };
        } else {
          const base = sfForType.find(s => s.iso_group === iso);
          if (base) {
            const scale = g.cutting_diameter_mm > 0 ? Math.sqrt(g.cutting_diameter_mm / 10) : 1;
            cuttingData[iso] = { vc_min: base.vc_min, vc_max: base.vc_max, fz_min: base.fz_min * scale, fz_max: base.fz_max * scale };
          }
        }
      }

      const shank = g.shank_diameter_mm ?? g.cutting_diameter_mm;
      const oal = g.overall_length_mm ?? g.cutting_diameter_mm * 6;
      const loc = g.flute_length_mm ?? g.cutting_diameter_mm * 2;

      this.tools.set(id, {
        id,
        manufacturer: "Guhring",
        series: g.article,
        designation: g.designation,
        type: toolType === "reamer" ? "drill" : toolType,
        subtype: toolType === "reamer" ? "reamer" : undefined,
        material: "carbide",
        physical: {
          cutting_diameter_mm: g.cutting_diameter_mm,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: loc,
        },
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "reamer" ? ["ream"] :
                    ["pocket", "slot", "contour", "face"],
        cutting_data: cuttingData,
        coolant: g.cutting_diameter_mm >= 3 ? "through_tool" : "flood",
        source: "Guhring_catalog",
      });
    }
  }

  private _loadHaimerHolders(): void {
    // Haimer holders used directly in _findHolder() from HAIMER_HOLDERS import.
    // No tool entries needed — holders aren't cutting tools.
  }

  private _loadAdditionalTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const at of getAdditionalTools()) {
      const id = `ADD-${at.manufacturer.replace(/\s/g, "")}-${at.designation}`;
      if (this.tools.has(id)) continue;

      const toolType = at.type as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === toolType);

      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sfForType) {
        const scale = at.cutting_diameter_mm > 0 ? Math.sqrt(at.cutting_diameter_mm / 10) : 1;
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      const shank = at.shank_diameter_mm ?? at.cutting_diameter_mm;
      const oal = at.overall_length_mm ?? at.cutting_diameter_mm * 6;
      const loc = at.flute_length_mm ?? at.cutting_diameter_mm * 2;

      this.tools.set(id, {
        id,
        manufacturer: at.manufacturer,
        series: toolType,
        designation: at.designation,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: at.cutting_diameter_mm,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: loc,
          ...(at.corner_radius_mm ? { corner_radius_mm: at.corner_radius_mm } : {}),
        },
        flute_count: at.flute_count ?? (toolType === "drill" ? 2 : 4),
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "ball_mill" ? ["contour", "finishing"] :
                    ["pocket", "slot", "contour", "face"],
        cutting_data: cuttingData,
        coolant: at.cutting_diameter_mm >= 3 ? "through_tool" : "flood",
        source: `${at.manufacturer}_catalog`,
      });
    }
  }

  private _loadIndexableTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const it of getIndexableTools()) {
      const prefix = it.manufacturer === "ISCAR" ? "ISC" :
                     it.manufacturer === "Kennametal" ? "KEN" :
                     it.manufacturer === "Korloy" ? "KOR" :
                     it.manufacturer === "Allied" ? "ALD" :
                     it.manufacturer === "CAMFIX" ? "CFX" : "IDX";
      const id = `${prefix}-${it.designation}`;
      if (this.tools.has(id)) continue;

      // Skip inserts without cutting diameter (they're tracked separately)
      if (it.type === "insert" && !it.cutting_diameter_mm) continue;

      const toolType = (it.type === "milling" ? "end_mill" :
                        it.type === "turning" ? "end_mill" :
                        it.type) as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === toolType || s.tool_type === "end_mill");

      const cuttingData: CatalogTool["cutting_data"] = {};
      const dc = it.cutting_diameter_mm ?? 10;
      const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
      // For Kennametal/ISCAR tools, try manufacturer-specific S/F first
      const seriesMatch = it.manufacturer === "Kennametal" ? findSpeedFeedByPartialSeries(it.designation?.substring(0, 5) ?? "")
        : it.manufacturer === "ISCAR" ? ISCAR_SPEED_FEED.filter(s => (it.designation ?? "").includes(s.series) || (it.subtype ?? "").includes(s.series))
        : [];
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = seriesMatch.find(s => s.isoGroup === iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max };
        } else {
          const base = sfForType.find(s => s.iso_group === iso);
          if (base) {
            cuttingData[iso] = { vc_min: base.vc_min, vc_max: base.vc_max, fz_min: base.fz_min * scale, fz_max: base.fz_max * scale };
          }
        }
      }

      const shank = it.shank_diameter_mm ?? it.cutting_diameter_mm ?? 0;
      const oal = it.overall_length_mm ?? (dc * 4);
      const loc = it.flute_length_mm ?? it.max_depth_of_cut_mm ?? (dc * 1.5);

      this.tools.set(id, {
        id,
        manufacturer: it.manufacturer,
        series: it.subtype ?? "indexable",
        designation: it.designation,
        type: toolType,
        subtype: it.subtype,
        material: it.subtype === "indexable" ? "indexable" : "carbide",
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: loc,
          ...(it.corner_radius_mm ? { corner_radius_mm: it.corner_radius_mm } : {}),
        },
        flute_count: it.insert_count ?? (toolType === "drill" ? 2 : 4),
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "face_mill" ? ["face"] :
                    toolType === ("thread_mill" as string) ? ["thread_mill"] :
                    ["pocket", "slot", "contour", "face", "shoulder"],
        cutting_data: cuttingData,
        coolant: dc >= 10 ? "through_tool" : "flood",
        source: `${it.manufacturer}_Catalog`,
      });
    }
  }

  private _loadSecoTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const st of SECO_TOOLS) {
      const id = `SEC-${st.designation}`;
      if (this.tools.has(id)) continue;

      const toolType = st.type as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === toolType);

      // Try manufacturer-specific S/F first, fall back to SPEED_FEED_BASE
      const cuttingData: CatalogTool["cutting_data"] = {};
      const seriesMatch = findSpeedFeedByPartialSeries(st.designation?.substring(0, 5) ?? "");
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = seriesMatch.find(s => s.isoGroup === iso) ?? lookupSpeedFeed(st.designation ?? "", iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max };
        } else {
          const base = sfForType.find(s => s.iso_group === iso);
          if (base) {
            const scale = st.cutting_diameter_mm > 0 ? Math.sqrt(st.cutting_diameter_mm / 10) : 1;
            cuttingData[iso] = { vc_min: base.vc_min, vc_max: base.vc_max, fz_min: base.fz_min * scale, fz_max: base.fz_max * scale };
          }
        }
      }

      const shank = st.shank_diameter_mm ?? st.cutting_diameter_mm;
      const oal = st.overall_length_mm ?? st.cutting_diameter_mm * 6;
      const loc = st.flute_length_mm ?? st.cutting_diameter_mm * 2;

      this.tools.set(id, {
        id,
        manufacturer: "Seco",
        series: "Jabro-Solid2",
        designation: st.designation,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: st.cutting_diameter_mm,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: loc,
          ...(st.corner_radius_mm ? { corner_radius_mm: st.corner_radius_mm } : {}),
        },
        flute_count: st.flute_count ?? (toolType === "drill" ? 2 : 4),
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "ball_mill" ? ["3d_finishing", "contour", "pencil"] :
                    ["pocket", "slot", "contour", "face"],
        cutting_data: cuttingData,
        coolant: st.cutting_diameter_mm >= 3 ? "through_tool" : "flood",
        source: "Seco_Jabro_Solid_End_Mills",
      });
    }
  }

  private _loadSandvikTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const svk of getSandvikTools()) {
      const id = `SVK-${svk.designation}`;
      if (this.tools.has(id)) continue;

      const toolType = svk.type as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === toolType);

      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sfForType) {
        const scale = svk.cutting_diameter_mm > 0 ? Math.sqrt(svk.cutting_diameter_mm / 10) : 1;
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      const shank = svk.shank_diameter_mm ?? svk.cutting_diameter_mm;
      const oal = svk.overall_length_mm ?? svk.cutting_diameter_mm * 6;
      const loc = svk.flute_length_mm ?? svk.cutting_diameter_mm * 2;

      this.tools.set(id, {
        id,
        manufacturer: "Sandvik",
        series: toolType === "drill" ? "VariDrill" : "WCE/GP",
        designation: svk.designation,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: svk.cutting_diameter_mm,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: loc,
          ...(svk.corner_radius_mm ? { corner_radius_mm: svk.corner_radius_mm } : {}),
        },
        flute_count: svk.flute_count ?? (toolType === "drill" ? 2 : 4),
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    ["pocket", "slot", "contour", "face"],
        cutting_data: cuttingData,
        coolant: svk.cutting_diameter_mm >= 3 ? "through_tool" : "flood",
        source: "Sandvik_Master_2022",
      });
    }
  }
  private _loadIngersollTools(): void {
    const sf = SPEED_FEED_BASE;
    // Load cutter bodies / tools
    for (const it of INGERSOLL_TOOLS) {
      const id = `ING-${it.designation}`;
      if (this.tools.has(id)) continue;

      const toolType = (it.type === "indexable_end_mill" || it.type === "solid_carbide_end_mill" ? "end_mill" :
                        it.type === "face_mill" ? "face_mill" :
                        it.type === "turning_holder" ? "turning_tool" :
                        it.type) as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === toolType || s.tool_type === "end_mill");

      const cuttingData: CatalogTool["cutting_data"] = {};
      const dc = it.diameter_mm ?? 10;
      for (const s of sfForType) {
        const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      const shank = it.shank_diameter_mm ?? it.diameter_mm ?? 0;
      const oal = it.overall_length_mm ?? (dc * 4);

      this.tools.set(id, {
        id,
        manufacturer: "Ingersoll",
        series: it.series ?? toolType,
        designation: it.designation,
        type: toolType,
        material: (it.material as CatalogTool["material"]) ?? "indexable",
        coating: it.coating,
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: shank,
          overall_length_mm: oal,
          flute_length_mm: it.cutting_length_mm ?? dc * 1.5,
        },
        flute_count: it.flutes ?? it.num_inserts,
        helix_angle_deg: it.helix_angle,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "face_mill" ? ["face"] :
                    toolType === "turning_tool" ? ["turning"] :
                    ["pocket", "slot", "contour"],
        cutting_data: cuttingData,
        source: "Ingersoll_Cutting_Tools",
      });
    }

    // Load inserts
    for (const ins of INGERSOLL_INSERTS) {
      const id = `ING-INS-${ins.designation}`;
      if (this.tools.has(id)) continue;

      const sfIns = sf.filter(s => s.tool_type === "turning_tool");
      const insCuttingData: CatalogTool["cutting_data"] = {};
      const ic = ins.ic_mm ?? 10;
      for (const s of sfIns) {
        const scale = ic > 0 ? Math.sqrt(ic / 10) : 1;
        insCuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Ingersoll",
        series: ins.type ?? "insert",
        designation: ins.designation,
        type: "insert",
        material: "carbide",
        physical: {
          cutting_diameter_mm: ins.ic_mm ?? 10,
          shank_diameter_mm: ins.ic_mm ?? 10,
          overall_length_mm: ins.thickness_mm ?? (ins.ic_mm ?? 10) * 0.3,
          flute_length_mm: ins.thickness_mm ?? (ins.ic_mm ?? 10) * 0.3,
          nose_radius_mm: ins.nose_radius_mm,
        },
        iso_groups: ["P", "M", "K"],
        operations: ["turning", "milling"],
        cutting_data: insCuttingData,
        source: "Ingersoll_Cutting_Tools",
      });
    }
  }

  private _loadEmugeTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const et of getEmugeTools()) {
      const id = `EMG-${et.designation}`;
      if (this.tools.has(id)) continue;
      if (!et.diameter_mm || et.diameter_mm <= 0) continue;

      const toolType = (et.type === "twist_drill" || et.type === "chamfer_drill" ? "drill" :
                        et.type === "tap" || et.type === "cold_forming_tap" ? "tap" :
                        et.type === "thread_mill" ? "end_mill" :
                        et.type) as CatalogTool["type"];

      // Build cutting_data per tool type
      const emgCuttingData: CatalogTool["cutting_data"] = {};
      const dc = et.diameter_mm ?? 6;
      if (toolType === "tap") {
        // Taps: lower speeds, feed = pitch (approximated as fz range)
        const pitch = et.pitch_mm ?? (dc > 12 ? 1.75 : dc > 8 ? 1.25 : dc > 5 ? 0.8 : 0.5);
        emgCuttingData["P"] = { vc_min: 15, vc_max: 40, fz_min: pitch * 0.95, fz_max: pitch * 1.0 };
        emgCuttingData["M"] = { vc_min: 8, vc_max: 25, fz_min: pitch * 0.95, fz_max: pitch * 1.0 };
        emgCuttingData["K"] = { vc_min: 12, vc_max: 35, fz_min: pitch * 0.95, fz_max: pitch * 1.0 };
        emgCuttingData["N"] = { vc_min: 20, vc_max: 60, fz_min: pitch * 0.95, fz_max: pitch * 1.0 };
        emgCuttingData["S"] = { vc_min: 5, vc_max: 15, fz_min: pitch * 0.95, fz_max: pitch * 1.0 };
        emgCuttingData["H"] = { vc_min: 6, vc_max: 18, fz_min: pitch * 0.95, fz_max: pitch * 1.0 };
      } else if (toolType === "drill") {
        const sfDrill = sf.filter(s => s.tool_type === "drill");
        for (const s of sfDrill) {
          const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
          emgCuttingData[s.iso_group] = {
            vc_min: s.vc_min, vc_max: s.vc_max,
            fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
          };
        }
      } else {
        // Thread mills: moderate speeds, low feeds
        const sfMill = sf.filter(s => s.tool_type === "end_mill");
        for (const s of sfMill) {
          const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
          emgCuttingData[s.iso_group] = {
            vc_min: s.vc_min * 0.6, vc_max: s.vc_max * 0.7,
            fz_min: s.fz_min * scale * 0.5, fz_max: s.fz_max * scale * 0.6,
          };
        }
      }

      this.tools.set(id, {
        id,
        manufacturer: "Emuge",
        series: et.product_line ?? et.type,
        designation: et.designation,
        type: toolType,
        subtype: et.sub_type ?? et.type,
        material: (et.material as CatalogTool["material"]) ?? "hss_cobalt",
        coating: et.coating,
        physical: {
          cutting_diameter_mm: et.diameter_mm ?? 0,
          shank_diameter_mm: et.diameter_mm ?? 0,
          overall_length_mm: (et.diameter_mm ?? 0) * 6,
          flute_length_mm: (et.diameter_mm ?? 0) * 2,
        },
        flute_count: et.flutes,
        iso_groups: et.iso_groups ?? ["P", "M", "K"],
        operations: toolType === "tap" ? ["tap", "thread"] :
                    toolType === "drill" ? ["drill"] :
                    ["thread_mill"],
        cutting_data: emgCuttingData,
        source: "Emuge_Catalog_160",
      });
    }
  }

  private _loadRegofixHolders(): void {
    // REGO-FIX holders used directly in _findHolder() from REGOFIX_HOLDERS import.
    // No tool entries needed — holders aren't cutting tools.
  }

  private _loadZenitTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const zt of ZENIT_TOOLS) {
      const id = `ZEN-${zt.code}`;
      if (this.tools.has(id)) continue;

      const toolType = (zt.tool_type === "cut_off_blade" ? "grooving_tool" :
                        zt.tool_type === "boring_bar" ? "boring_bar" :
                        zt.tool_type === "solid_carbide_end_mill" ? "end_mill" :
                        zt.tool_type === "drill" ? "drill" :
                        zt.tool_type === "tap" ? "tap" :
                        zt.tool_type === "turning_holder" ? "turning_tool" :
                        zt.tool_type === "face_mill" ? "face_mill" :
                        zt.tool_type === "insert" ? "insert" :
                        "end_mill") as CatalogTool["type"];
      const sfForType = sf.filter(s => s.tool_type === toolType || s.tool_type === "end_mill");

      const cuttingData: CatalogTool["cutting_data"] = {};
      // Zenit uses inches — convert key dimensions
      const dInch = (zt.dimensions_inch?.D as number) ?? (zt.dimensions_inch?.d as number) ?? 0;
      const dc = dInch * 25.4;
      for (const s of sfForType) {
        const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Zenit",
        series: zt.category,
        designation: zt.code,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: dc,
          overall_length_mm: ((zt.dimensions_inch?.C as number) ?? (zt.dimensions_inch?.L as number) ?? dInch * 4) * 25.4,
          flute_length_mm: ((zt.dimensions_inch?.B as number) ?? dInch * 1.5) * 25.4,
        },
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "grooving_tool" ? ["groove", "cut_off"] :
                    toolType === "boring_bar" ? ["bore"] :
                    toolType === "turning_tool" ? ["turning"] :
                    toolType === "drill" ? ["drill"] :
                    toolType === "tap" ? ["tap", "thread"] :
                    toolType === "face_mill" ? ["face"] :
                    ["pocket", "slot", "contour"],
        cutting_data: cuttingData,
        source: "Zenit_2020_Catalog",
      });
    }
  }

  private _loadAMPCTools(): void {
    // Build cutting data lookup from AMPC_CUTTING_DATA: isoGroup → array of recommendations
    const ampcCuttingData = getAmpcCuttingData();
    const cuttingByIso = new Map<string, any[]>();
    for (const cd of ampcCuttingData) {
      const arr = cuttingByIso.get(cd.isoGroup) ?? [];
      arr.push(cd);
      cuttingByIso.set(cd.isoGroup, arr);
    }

    for (const at of getAmpcTools()) {
      const id = `AMPC-${at.partNumber}`;
      if (this.tools.has(id)) continue;

      const toolType = (at.type === "drill_insert" ? "insert" :
                        at.type === "drill_holder" ? "drill" :
                        at.type === "drill" ? "drill" :
                        at.type === "reamer" ? "reamer" :
                        at.type === "countersink" ? "drill" :
                        "drill") as CatalogTool["type"];

      const dc = at.diameterMm ?? ((at.diameterInch ?? 0) * 25.4);
      const fluteCount = toolType === "drill" || toolType === "insert" ? 2 : 4;

      // Enrich cutting_data from AMPC_CUTTING_DATA: convert SFM→m/min, IPR→mm/tooth
      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const [isoGroup, entries] of cuttingByIso) {
        // Average across hardness ranges for this ISO group
        let vcSum = 0, fzMinSum = 0, fzMaxSum = 0;
        for (const e of entries) {
          vcSum += e.speedSFM * 0.3048;                          // SFM → m/min
          fzMinSum += e.feedsIPR[0] * 25.4 / fluteCount;         // IPR → mm/tooth
          fzMaxSum += e.feedsIPR[e.feedsIPR.length - 1] * 25.4 / fluteCount;
        }
        const n = entries.length;
        const vc = vcSum / n;
        cuttingData[isoGroup] = {
          vc_min: Math.round(vc * 0.8 * 10) / 10,
          vc_max: Math.round(vc * 1.2 * 10) / 10,
          fz_min: Math.round(fzMinSum / n * 1000) / 1000,
          fz_max: Math.round(fzMaxSum / n * 1000) / 1000,
        };
      }

      // Enrich physical dimensions by tool type
      const overallLength = at.type === "drill_holder" ? dc * 5 :
                            at.type === "drill_insert" ? dc * 0.3 :
                            dc * 4;
      const fluteLength = at.type === "drill_holder" ? dc * 3 :
                          at.type === "drill_insert" ? 0 :
                          dc * 2;

      this.tools.set(id, {
        id,
        manufacturer: "Allied Machine",
        series: at.productLine,
        designation: at.partNumber,
        type: toolType,
        material: "carbide",
        coating: at.coating,
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: dc,
          overall_length_mm: overallLength,
          flute_length_mm: fluteLength,
        },
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "insert" ? ["drill"] :
                    toolType === "reamer" ? ["ream"] :
                    ["drill"],
        cutting_data: cuttingData,
        source: "AMPC_US-EN_Catalog",
      });
    }
  }

  private _loadGlobalCNCTools(): void {
    // DB-COVERAGE-GAPFILL-MS0/U-GCNC01. The Global CNC catalog source carries two
    // populations: ~2,416 guide BUSHINGS (work-guides, NOT cutting tools) + ~1,264
    // live-tooling HOLDERS across 9 families. The catalog must hold only the holders.
    //
    // IMPORTANT — source-agnostic filtering: in production the loader's JSON is emitted
    // by build-catalog-json.mjs from GLOBAL_CNC_TOOLS (includes every bushing); in tests
    // it is the pre-filtered src/data/global-cnc-tools.json. Filtering HERE (the single
    // chokepoint both paths flow through) keeps the catalog identical regardless of which
    // source feeds the loader, instead of relying on the upstream file being pre-cleaned.
    const MAX_PLAUSIBLE_BORE_MM = 200; // turret/holder bore ceiling; corpus has 1016mm (40") extraction errors
    for (const gt of getGlobalCncTools()) {
      const id = `GCNC-${gt.partNumber}`;
      if (this.tools.has(id)) continue;

      // Guide/collet bushings are not cutting tools — never enter the tool catalog.
      if (gt.type === "bushing") continue;

      // Map each holder family to the closest catalog type:
      //  - driven_* → end_mill   (live rotating mills/drills)
      //  - *_id/boring → boring_bar (internal/ID work)
      //  - od/vdi/capto/generic holders → turning_tool (OD turning + turret interfaces)
      const toolType = (gt.type === "driven_tool" || gt.type === "driven_drill_mill" || gt.type === "driven_toolholder" ? "end_mill" :
                        gt.type === "boring_bar_holder" || gt.type === "id_holder" ? "boring_bar" :
                        "turning_tool") as CatalogTool["type"];

      // Look up real dimensions from PDF-extracted data (565-page catalog).
      const dim = getGlobalCNCDimension(gt.partNumber);
      const boreDia = dim?.boreDia_mm ?? 0;
      const bodyOD = dim?.bodyOD_mm ?? 0;
      const oal = dim?.oal_mm ?? 0;

      // Drop records whose extracted geometry is unusable — an implausible bore or a
      // zero overall length would poison collision-envelope / feeds-speeds consumers
      // exactly as a bad cutting diameter would. Symmetric, fail-loud-by-omission guard.
      if (!(boreDia > 0) || boreDia > MAX_PLAUSIBLE_BORE_MM || !(oal > 0)) continue;

      // The bore is a cutting diameter only for ID/boring work; for OD-turning and pure
      // turret/interface holders it is the bar-seat bore, NOT a machining diameter — so
      // leave cutting_diameter_mm 0 there rather than posing a misleading cutting Ø.
      const cuttingDia = toolType === "boring_bar" ? boreDia : 0;

      this.tools.set(id, {
        id,
        manufacturer: "Global CNC",
        series: gt.productLine,
        designation: gt.partNumber,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: cuttingDia,
          shank_diameter_mm: bodyOD,
          overall_length_mm: oal,
          flute_length_mm: cuttingDia,
        },
        iso_groups: ["P", "M", "K"],
        operations: toolType === "boring_bar" ? ["bore"] :
                    toolType === "end_mill" ? ["pocket", "slot"] :
                    ["turning"],
        cutting_data: {},
        source: "Global_CNC_2023_Catalog",
      });
    }
  }

  private _loadKennametalRotating(): void {
    const sf = SPEED_FEED_BASE;
    for (const kt of getSandvik2018RotatingTools()) {
      const id = `KMT-${kt.partNumber}`;
      if (this.tools.has(id)) continue;
      const dc = kt.dc_mm ?? 0;
      if (dc <= 0) continue;

      const toolType = (kt.type === "drill" || kt.type === "modular_drill" || kt.type === "indexable_drill" ? "drill" :
                        kt.type === "ball_end_mill" ? "ball_mill" :
                        kt.type === "reamer" ? "reamer" :
                        kt.type === "roughing_end_mill" || kt.type === "ceramic_end_mill" || kt.type === "end_mill" ? "end_mill" :
                        kt.type.includes("tap") ? "tap" :
                        "end_mill") as CatalogTool["type"];

      const sfForType = sf.filter(s => s.tool_type === toolType || s.tool_type === "end_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
      const kSeries = kt.series ?? kt.partNumber?.substring(0, 4) ?? "";
      const kSeriesMatch = findSpeedFeedByPartialSeries(kSeries);
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = kSeriesMatch.find(s => s.isoGroup === iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max };
        } else {
          const base = sfForType.find(s => s.iso_group === iso);
          if (base) cuttingData[iso] = { vc_min: base.vc_min, vc_max: base.vc_max, fz_min: base.fz_min * scale, fz_max: base.fz_max * scale };
        }
      }

      this.tools.set(id, {
        id,
        manufacturer: "Kennametal",
        series: kt.series ?? kt.partNumber.substring(0, 4),
        designation: kt.partNumber,
        type: toolType,
        material: "carbide",
        coating: kt.grade,
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: kt.dconms_mm ?? dc,
          overall_length_mm: kt.oal_mm ?? dc * 6,
          flute_length_mm: kt.loc_mm ?? dc * 2,
          corner_radius_mm: kt.cornerRadius_mm,
          point_angle_deg: kt.pointAngle,
        },
        flute_count: kt.nof,
        helix_angle_deg: kt.helixAngle,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "reamer" ? ["ream"] :
                    toolType === "tap" ? ["tap", "thread"] :
                    toolType === "ball_mill" ? ["finish_3d", "profile"] :
                    ["pocket", "slot", "profile", "face"],
        cutting_data: cuttingData,
        source: "Kennametal_2018_Vol2_Rotating",
      });
    }
  }

  private _loadKennametalTurning(): void {
    const sf = SPEED_FEED_BASE.filter(s => s.tool_type === "turning_tool");
    for (const kt of getKennametalTurningTools()) {
      const id = `KMT-T-${(kt as any).catalogNumber ?? (kt as any).orderCode}`;
      if (this.tools.has(id)) continue;

      const toolType = (kt.type === "turning_insert" ? "insert" :
                        kt.type === "turning_holder" ? "turning_tool" :
                        kt.type === "boring_bar" ? "boring_bar" :
                        kt.type === "grooving_tool" ? "grooving_tool" :
                        kt.type === "threading_tool" ? "threading_tool" :
                        "turning_tool") as CatalogTool["type"];

      const ic = (kt as any).ic_mm ?? (kt as any).boreDia_mm ?? (kt as any).d_mm ?? 12.7;
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(ic / 10);
      const seriesMatch = findSpeedFeedByPartialSeries(kt.series ?? "");
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = seriesMatch.find(s => s.isoGroup === iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max };
        } else {
          const base = sf.find(s => s.iso_group === iso);
          if (base) {
            cuttingData[iso] = { vc_min: base.vc_min, vc_max: base.vc_max, fz_min: base.fz_min * scale, fz_max: base.fz_max * scale };
          }
        }
      }

      this.tools.set(id, {
        id,
        manufacturer: "Kennametal",
        series: kt.series ?? "Turning",
        designation: (kt as any).catalogNumber ?? (kt as any).orderCode,
        type: toolType,
        material: "carbide",
        coating: (kt as any).grade,
        physical: {
          cutting_diameter_mm: ic,
          shank_diameter_mm: (kt as any).shankDia_mm ?? ic,
          overall_length_mm: (kt as any).oal_mm ?? (kt as any).length_mm ?? ic * 4,
          flute_length_mm: (kt as any).thickness_mm ?? (kt as any).funcLength_mm ?? ic * 0.5,
          nose_radius_mm: (kt as any).cornerRadius_mm,
        },
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "insert" ? ["turning"] :
                    toolType === "boring_bar" ? ["bore"] :
                    toolType === "grooving_tool" ? ["groove", "cut_off"] :
                    toolType === "threading_tool" ? ["thread"] :
                    ["turning"],
        cutting_data: cuttingData,
        source: "Kennametal_2018_Vol1_Turning",
      });
    }
  }

  private _loadWidia2022(): void {
    const sf = SPEED_FEED_BASE;
    for (const wt of SANDVIK_2022_TOOLS) {
      const id = `WIDIA-${wt.orderCode}`;
      if (this.tools.has(id)) continue;
      const dc = wt.DC;
      if (dc <= 0) continue;

      const toolType = (wt.type === "ball_end_mill" ? "ball_mill" :
                        wt.type === "roughing_end_mill" ? "end_mill" :
                        wt.type === "indexable_mill" ? "face_mill" :
                        wt.type === "drill" ? "drill" :
                        "end_mill") as CatalogTool["type"];

      const sfForType = sf.filter(s => s.tool_type === toolType || s.tool_type === "end_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(dc / 10);
      for (const s of sfForType) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "WIDIA",
        series: wt.series.split("•")[0]?.trim() ?? wt.series,
        designation: wt.orderCode,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: wt.DCONMS ?? dc,
          overall_length_mm: wt.OAL,
          flute_length_mm: wt.LU ?? dc * 2,
          corner_radius_mm: wt.RE ?? undefined,
        },
        flute_count: wt.NOF ?? undefined,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "ball_mill" ? ["finish_3d", "profile"] :
                    toolType === "face_mill" ? ["face"] :
                    ["pocket", "slot", "profile", "face"],
        cutting_data: cuttingData,
        source: "WIDIA_Hanita_Master_2022",
      });
    }
  }

  private _loadWidia2022Inch(): void {
    const sf = SPEED_FEED_BASE;
    for (const wt of WIDIA_2022_INCH_TOOLS) {
      const id = `WIDIA-I-${wt.orderCode}`;
      if (this.tools.has(id)) continue;
      const dc = wt.DC;
      if (dc <= 0) continue;

      const toolType = (wt.type === "ball_end_mill" ? "ball_mill" :
                        wt.type === "indexable_mill" ? "face_mill" :
                        wt.type === "drill" || wt.type === "indexable_drill" ? "drill" :
                        wt.type === "turning_holder" ? "turning_tool" :
                        wt.type === "grooving_holder" ? "grooving_tool" :
                        wt.type === "threading_holder" ? "threading_tool" :
                        "end_mill") as CatalogTool["type"];

      const sfType = toolType === "drill" ? "drill" : toolType === "turning_tool" || toolType === "grooving_tool" || toolType === "threading_tool" ? "turning_tool" : "end_mill";
      const sfForType = sf.filter(s => s.tool_type === sfType || s.tool_type === "end_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(dc / 10);
      for (const s of sfForType) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "WIDIA",
        series: wt.series || "WIDIA",
        designation: wt.orderCode,
        type: toolType,
        material: "carbide",
        physical: {
          cutting_diameter_mm: dc,
          shank_diameter_mm: wt.DCONMS ?? dc,
          overall_length_mm: wt.OAL || dc * 6,
          flute_length_mm: wt.LU ?? dc * 2,
          corner_radius_mm: wt.RE ?? undefined,
        },
        flute_count: wt.NOF ?? undefined,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "drill" ? ["drill"] :
                    toolType === "ball_mill" ? ["finish_3d", "profile"] :
                    toolType === "face_mill" ? ["face"] :
                    toolType === "turning_tool" ? ["turning"] :
                    toolType === "grooving_tool" ? ["groove", "cut_off"] :
                    toolType === "threading_tool" ? ["thread"] :
                    ["pocket", "slot", "profile", "face"],
        cutting_data: cuttingData,
        source: "WIDIA_Hanita_Inch_2022",
      });
    }
  }

  private _loadMitsubishiTools(): void {
    const sf = SPEED_FEED_BASE;
    // Turning inserts
    for (const ins of MITSUBISHI_TURNING_INSERTS) {
      const id = `MIT-${ins.designation}`;
      if (this.tools.has(id)) continue;
      const ic = ins.ic_mm ?? 10;
      const sfTurn = sf.filter(s => s.tool_type === "turning_tool");
      const cd: CatalogTool["cutting_data"] = {};
      for (const s of sfTurn) { cd[s.iso_group] = { vc_min: s.vc_min, vc_max: s.vc_max, fz_min: s.fz_min, fz_max: s.fz_max }; }
      this.tools.set(id, {
        id, manufacturer: "Mitsubishi", series: ins.shape ?? "insert", designation: ins.designation,
        type: "insert", material: "carbide",
        physical: { cutting_diameter_mm: ic, shank_diameter_mm: ic, overall_length_mm: ins.thickness_mm ?? ic * 0.3, flute_length_mm: ins.thickness_mm ?? ic * 0.3, nose_radius_mm: ins.corner_radius_mm ?? undefined },
        iso_groups: ["P", "M", "K", "N", "S", "H"], operations: ["turning"], cutting_data: cd, source: "Mitsubishi_C010B",
      });
    }
    // End mills
    for (const em of MITSUBISHI_END_MILLS) {
      const id = `MIT-${em.designation}`;
      if (this.tools.has(id)) continue;
      const dc = em.cutting_diameter_mm ?? 10;
      const sfMill = sf.filter(s => s.tool_type === "end_mill");
      const cd: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(dc / 10);
      for (const s of sfMill) { cd[s.iso_group] = { vc_min: s.vc_min, vc_max: s.vc_max, fz_min: s.fz_min * scale, fz_max: s.fz_max * scale }; }
      this.tools.set(id, {
        id, manufacturer: "Mitsubishi", series: em.type ?? "VQ", designation: em.designation,
        type: "end_mill", material: "carbide",
        physical: { cutting_diameter_mm: dc, shank_diameter_mm: em.shank_diameter_mm ?? dc, overall_length_mm: em.overall_length_mm ?? dc * 6, flute_length_mm: em.flute_length_mm ?? dc * 2 },
        flute_count: em.flute_count ?? 4, iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["pocket", "slot", "profile", "face"], cutting_data: cd, source: "Mitsubishi_C010B",
      });
    }
    // Drills
    for (const dr of MITSUBISHI_DRILLS) {
      const id = `MIT-${dr.designation}`;
      if (this.tools.has(id)) continue;
      const dc = dr.cutting_diameter_mm ?? 10;
      const sfDrill = sf.filter(s => s.tool_type === "drill");
      const cd: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(dc / 10);
      for (const s of sfDrill) { cd[s.iso_group] = { vc_min: s.vc_min, vc_max: s.vc_max, fz_min: s.fz_min * scale, fz_max: s.fz_max * scale }; }
      this.tools.set(id, {
        id, manufacturer: "Mitsubishi", series: dr.series ?? "MVS", designation: dr.designation,
        type: "drill", material: "carbide",
        physical: { cutting_diameter_mm: dc, shank_diameter_mm: dc, overall_length_mm: dc * (dr.ld_ratio ?? 5), flute_length_mm: dc * (dr.ld_ratio ?? 3) },
        flute_count: 2, iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ["drill"], cutting_data: cd, source: "Mitsubishi_C010B",
      });
    }
  }

  private _loadHornTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const ht of HORN_TOOLS) {
      const id = `HORN-${ht.partNumber}`;
      if (this.tools.has(id)) continue;

      // Horn tools: grooving inserts and milling shanks
      const toolType: CatalogTool["type"] = ht.type === "insert" ? "grooving_tool" : "end_mill";

      // Dimensions: prefer mm fields, fall back to inch conversion
      const dc = ht.cuttingEdgeDia_in ? ht.cuttingEdgeDia_in * 25.4 :
                 ht.d1_mm ? ht.d1_mm :
                 ht.width_in ? ht.width_in * 25.4 : 6;
      const shankD = ht.shankDia_in ? ht.shankDia_in * 25.4 :
                     ht.d_mm ? ht.d_mm :
                     ht.d_in ? ht.d_in * 25.4 : dc;
      const oal = ht.l1_mm ? ht.l1_mm :
                  ht.l1_in ? ht.l1_in * 25.4 : dc * 5;
      const loc = ht.l2_mm ? ht.l2_mm :
                  ht.l2_in ? ht.l2_in * 25.4 :
                  ht.depth_in ? ht.depth_in * 25.4 : dc * 1.5;

      const sfForType = sf.filter(s => s.tool_type === "end_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
      for (const s of sfForType) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Horn",
        series: ht.system || "Horn",
        designation: ht.partNumber,
        type: toolType,
        subtype: ht.subType || ht.form,
        material: "carbide",
        physical: {
          cutting_diameter_mm: Math.round(dc * 1000) / 1000,
          shank_diameter_mm: Math.round(shankD * 1000) / 1000,
          overall_length_mm: Math.round(oal * 100) / 100,
          flute_length_mm: Math.round(loc * 100) / 100,
        },
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "grooving_tool" ? ["groove", "cut_off"] : ["groove_mill", "slot", "contour"],
        cutting_data: cuttingData,
        source: "Horn_Rotating_Tools_2020",
      });
    }
  }

  private _loadNiagaraTools(): void {
    const sf = SPEED_FEED_BASE;
    // Helper to parse fractional inch strings like "1/8", "1-1/2" to mm
    const fracToMM = (s: string): number => {
      if (!s) return 0;
      const parts = s.split("-");
      let total = 0;
      for (const p of parts) {
        if (p.includes("/")) {
          const [num, den] = p.split("/");
          total += parseFloat(num) / parseFloat(den);
        } else {
          total += parseFloat(p);
        }
      }
      return total * 25.4;
    };

    for (const nt of NIAGARA_TOOLS) {
      const id = `NIA-${nt.partNumber}`;
      if (this.tools.has(id)) continue;

      const dc = fracToMM(nt.fluteDia);
      if (dc <= 0) continue;
      const shankD = fracToMM(nt.shankDia);
      const oal = fracToMM(nt.oal);
      const loc = fracToMM(nt.loc);

      const toolType: CatalogTool["type"] = nt.type === "ball_mill" ? "ball_mill" : "end_mill";

      const sfForType = sf.filter(s => s.tool_type === "end_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(dc / 10);
      for (const s of sfForType) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Niagara",
        series: nt.series,
        designation: nt.partNumber,
        type: toolType,
        material: "carbide",
        coating: nt.coating || "AlTiN",
        physical: {
          cutting_diameter_mm: Math.round(dc * 1000) / 1000,
          shank_diameter_mm: Math.round(shankD * 1000) / 1000,
          overall_length_mm: Math.round(oal * 100) / 100,
          flute_length_mm: Math.round(loc * 100) / 100,
          corner_radius_mm: nt.cornerRadius ? fracToMM(nt.cornerRadius) : undefined,
          neck_diameter_mm: nt.neckDia ? fracToMM(nt.neckDia) : undefined,
        },
        flute_count: nt.flutes,
        center_cutting: true,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "ball_mill" ? ["finish_3d", "profile", "pencil"] : ["pocket", "slot", "profile", "face", "ramp"],
        cutting_data: cuttingData,
        source: "Niagara_Cutter_Catalog",
      });
    }
  }

  private _loadDormerPrametTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const dt of DORMER_TOOLS) {
      const id = `DOR-${dt.partNumber}`;
      if (this.tools.has(id)) continue;

      const dc = dt.diameter_mm;
      if (dc <= 0) continue;

      const sfForType = sf.filter(s => s.tool_type === "drill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = dc > 0 ? Math.sqrt(dc / 10) : 1;
      for (const s of sfForType) {
        cuttingData[s.iso_group] = {
          vc_min: s.vc_min, vc_max: s.vc_max,
          fz_min: s.fz_min * scale, fz_max: s.fz_max * scale,
        };
      }

      this.tools.set(id, {
        id,
        manufacturer: "Dormer Pramet",
        series: dt.series,
        designation: dt.partNumber,
        type: "drill",
        material: "hss",
        physical: {
          cutting_diameter_mm: dt.diameter_mm,
          shank_diameter_mm: dt.diameter_mm,
          overall_length_mm: dt.overallLength_mm,
          flute_length_mm: dt.fluteLength_mm,
          point_angle_deg: 118,
        },
        flute_count: 2,
        iso_groups: ["P", "M", "K", "N"],
        operations: ["drill"],
        cutting_data: cuttingData,
        source: "Dormer_Pramet_A100_Catalog",
      });
    }
  }

  private _loadHelicalTools(): void {
    const sf = SPEED_FEED_BASE;
    for (const ht of getHelicalToolCatalog()) {
      const id = `HEL-${ht.productId}`;
      if (this.tools.has(id)) continue;
      // Convert inches to mm if needed
      const toMM = ht.unit === "inches" ? 25.4 : 1;
      const dc = ht.diameter * toMM;
      if (dc <= 0) continue;

      const toolType = (ht.type === "ball_end_mill" ? "ball_mill" :
                        ht.type === "bull_nose_end_mill" ? "end_mill" :
                        "end_mill") as CatalogTool["type"];

      // Map Helical application to ISO group S/F
      const appToISO: Record<string, string[]> = {
        aluminum: ["N"], steel: ["P"], stainless_steel: ["M"],
        titanium: ["S"], hardened_steel: ["H"], copper: ["N"],
        high_temp_alloys: ["S"], medium_alloy: ["P", "M"],
      };
      const primaryISOs = appToISO[ht.application] ?? ["P", "M", "K", "N", "S", "H"];

      // Try Helical manufacturer S/F first, fall back to SPEED_FEED_BASE
      const sfForType = sf.filter(s => s.tool_type === "end_mill");
      const cuttingData: CatalogTool["cutting_data"] = {};
      const scale = Math.sqrt(dc / 10);
      const hMatch = HELICAL_SPEED_FEED.filter(s => ht.productId?.includes(s.series) || (ht.description ?? "").includes(s.series));
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const mfr = hMatch.find(s => s.isoGroup === iso);
        if (mfr) {
          cuttingData[iso] = { vc_min: mfr.vc_min, vc_max: mfr.vc_max, fz_min: mfr.fz_min, fz_max: mfr.fz_max };
        } else {
          const base = sfForType.find(s => s.iso_group === iso);
          if (base) {
            const boost = primaryISOs.includes(iso) ? 1.15 : 0.85;
            cuttingData[iso] = { vc_min: base.vc_min * boost, vc_max: base.vc_max * boost, fz_min: base.fz_min * scale * boost, fz_max: base.fz_max * scale * boost };
          }
        }
      }

      this.tools.set(id, {
        id,
        manufacturer: "Helical Solutions",
        series: ht.application || "Helical",
        designation: ht.productId,
        type: toolType,
        material: "carbide",
        coating: ht.coating || "AlTiN",
        physical: {
          cutting_diameter_mm: Math.round(dc * 1000) / 1000,
          shank_diameter_mm: Math.round(ht.shaftDiameter * toMM * 1000) / 1000,
          overall_length_mm: Math.round(ht.overallLength * toMM * 100) / 100,
          flute_length_mm: Math.round(ht.fluteLength * toMM * 100) / 100,
          corner_radius_mm: ht.cornerRadius > 0 ? Math.round(ht.cornerRadius * toMM * 1000) / 1000 : undefined,
        },
        flute_count: ht.numberOfFlutes,
        helix_angle_deg: ht.helixAngle > 0 ? ht.helixAngle : 35,
        center_cutting: true,
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: toolType === "ball_mill" ? ["finish_3d", "profile", "pencil"] : ["pocket", "slot", "profile", "face", "ramp"],
        cutting_data: cuttingData,
        source: "Helical_Solutions_HSMLib",
      });
    }
  }

  private _loadSumitomoTools(): void {
    const TYPE_MAP: Record<string, CatalogTool["type"]> = {
      drill: "drill",
      end_mill: "end_mill",
      ball_end_mill: "ball_mill",
      milling_cutter: "face_mill",
      turning_insert: "insert",
      boring_bar: "boring_bar",
      grooving: "grooving_tool",
      threading: "threading_tool",
      holder: "turning_tool",
    };

    for (const st of getSumitomoToolCatalog()) {
      const id = `SUM-${st.partNumber}`;
      if (this.tools.has(id)) continue;

      const toolType = TYPE_MAP[st.type] || "end_mill";
      const toMM = st.metric ? 1 : 25.4;
      const dc = (st.dc ?? 10) * toMM;
      const shank = (st.shank ?? dc) * toMM;
      const oal = (st.oal ?? dc * 5) * toMM;
      const loc = (st.loc ?? dc * 2) * toMM;

      // Scale speed/feed from SPEED_FEED_BASE by sqrt(dc/10)
      const sfType = toolType === "ball_mill" ? "end_mill" :
                     toolType === "insert" || toolType === "turning_tool" || toolType === "grooving_tool" || toolType === "threading_tool" ? "face_mill" :
                     toolType;
      const sfBase = SPEED_FEED_BASE.filter(s => s.tool_type === sfType);
      const scale = Math.sqrt(dc / 10);
      const cuttingData: CatalogTool["cutting_data"] = {};
      for (const s of sfBase) {
        cuttingData[s.iso_group] = {
          vc_min: Math.round(s.vc_min * scale),
          vc_max: Math.round(s.vc_max * scale),
          fz_min: Math.round(s.fz_min * scale * 1000) / 1000,
          fz_max: Math.round(s.fz_max * scale * 1000) / 1000,
          ap_max: (s.ap_max_xD ?? 1) * dc,
          ae_max: (s.ae_max_xD ?? 0.5) * dc,
        };
      }

      const ops = toolType === "drill" ? ["drill", "peck_drill", "spot_drill"] :
                  toolType === "end_mill" ? ["pocket", "slot", "profile", "face", "ramp"] :
                  toolType === "ball_mill" ? ["finish_3d", "profile", "pencil"] :
                  toolType === "face_mill" ? ["face", "shoulder"] :
                  toolType === "insert" ? ["turning", "facing", "boring"] :
                  toolType === "boring_bar" ? ["boring", "internal_turning"] :
                  toolType === "grooving_tool" ? ["grooving", "parting"] :
                  toolType === "threading_tool" ? ["threading"] :
                  toolType === "turning_tool" ? ["turning", "facing"] :
                  ["pocket", "profile"];

      this.tools.set(id, {
        id,
        manufacturer: "Sumitomo",
        series: st.subType || st.type,
        designation: st.partNumber,
        type: toolType,
        material: toolType === "insert" ? "indexable" : "carbide",
        coating: st.grade || "AlTiN",
        physical: {
          cutting_diameter_mm: Math.round(dc * 1000) / 1000,
          shank_diameter_mm: Math.round(shank * 1000) / 1000,
          overall_length_mm: Math.round(oal * 100) / 100,
          flute_length_mm: Math.round(loc * 100) / 100,
        },
        flute_count: st.flutes ?? (toolType === "drill" ? 2 : toolType === "end_mill" ? 4 : undefined),
        iso_groups: ["P", "M", "K", "N", "S", "H"],
        operations: ops,
        cutting_data: cuttingData,
        source: "Sumitomo_Electric",
      });
    }
  }
}

export const toolCatalogEngine = new ToolCatalogEngine();
