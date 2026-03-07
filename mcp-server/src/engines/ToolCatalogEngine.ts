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

import { TUNGALOY_HOLDERS, type TungaloyHolder } from "../data/tungaloy-holder-catalog.js";
import { TUNGALOY_ENDMILLS } from "../data/tungaloy-endmill-catalog.js";
import { TUNGALOY_DRILLS } from "../data/tungaloy-drill-catalog.js";

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
      } else if (!input.finish_required && (t.flute_count ?? 0) <= 3) {
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
      if (["SGS", "Sandvik", "Kennametal", "ISCAR"].includes(t.manufacturer)) {
        score += 5;
        reasons.push("premium manufacturer");
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
      holders: HOLDER_DIMS.length + TUNGALOY_HOLDERS.length,
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
      return {
        type: `${tungaloyMatch.holder_type}_${tungaloyMatch.collet ?? tungaloyMatch.bore_diameter_mm ?? ""}`,
        taper: tungaloyMatch.taper,
        bore_min: tungaloyMatch.bore_min_mm ?? tungaloyMatch.bore_diameter_mm ?? shank_mm,
        bore_max: tungaloyMatch.bore_max_mm ?? tungaloyMatch.bore_diameter_mm ?? shank_mm,
        gauge_length: tungaloyMatch.gauge_length_mm,
        body_diameter: tungaloyMatch.body_diameter_mm,
        max_rpm: 25000, // conservative default for Tungaloy
        runout_um: 5,
      };
    }

    // 2. Fall back to generic HOLDER_DIMS
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

    // Load Tungaloy catalog tools
    this._loadTungaloyEndmills();
    this._loadTungaloyDrills();
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
}

export const toolCatalogEngine = new ToolCatalogEngine();
