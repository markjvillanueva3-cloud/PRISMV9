// WIRE-EXEMPT: search() surface is reachable via intelligenceDispatcher:catalog_unified_match
// → CatalogUnifiedQueryEngine.query() (aggregator sub-query #8, MONOLITH-WIRE, line ~279).
// NOT a direct-dispatch orphan — the system-viz ghost.unwired label is a FALSE POSITIVE
// (classifier follows only DIRECT dispatcher edges, missing indirect reachability through
// aggregator wrappers). Type-taxonomy lookups beyond search() are intentionally unexposed —
// a deliberate consuming-galaxy opportunity (kilo CAM tool-selection), NOT a romeo wiring gap.
// (slot:romeo, U-WIRE-EXEMPT-MONOLITH, 2026-06-04)
/**
 * MonolithToolTypesDatabaseEngine — U-DB-MONOLITH-TOOL-TYPES-LOADER
 *
 * TS-typed port of `PRISM_TOOL_TYPES_COMPLETE.js` from the v8.89 monolith
 * extraction (`extracted/tools/PRISM_TOOL_TYPES_COMPLETE.js`).
 *
 * Carries 55 tool type definitions across 11 categories:
 *   - endmill (10): flat, ball, bullnose, chamfer, rougher, finisher,
 *     highfeed, variable_helix, tapered, lollipop
 *   - facemill (5): 45/75/90 lead, round-insert, high-feed
 *   - shellmill (1)
 *   - drill (15): twist, stub, jobber, taper_length, extra_long, spade,
 *     indexable, modular, gun, bta, center, spot, countersink,
 *     counterbore, step
 *   - reamer (4): chucking, shell, adjustable, taper
 *   - boring (4): bar, fine_boring, back_boring, head
 *   - threadmill (4): solid, indexable, single_point, multi_form
 *   - tap (5): spiral_point, spiral_flute, straight_flute, form, thread_forming
 *   - specialty (6): slot, t_slot, dovetail, woodruff, keyseat, fly_cutter
 *   - engrave (1): v_cutter
 *
 * Each record carries category + geometry/type + structural arrays
 * (flutes, helix, angles, point_angles, taper_per_side, tapers) and
 * boolean flags (indexable, replaceable, combined, etc.) per the
 * source monolith schema.
 *
 * Data-only engine following the canonical PRISM port pattern
 * (ToolHolderDatabaseEngine, MonolithWorkholdingDatabaseEngine).
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-TOOL-TYPES-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted/tools/PRISM_TOOL_TYPES_COMPLETE.js (PRISM v8.89)
 */

export interface ToolTypeSpec {
  id: string;
  category:
    | "endmill" | "facemill" | "shellmill" | "drill" | "reamer"
    | "boring" | "threadmill" | "tap" | "specialty" | "engrave";
  geometry?: string;
  type?: string;
  flutes?: number[];
  helix?: number[];
  angles?: number[];
  point_angles?: number[];
  taper_per_side?: number[];
  tapers?: string[];
  lead_angle?: number;
  l_d_ratio?: number;
  indexable?: boolean;
  arbor_mount?: boolean;
  straight_shank?: boolean;
  through_hole?: boolean;
  blind_hole?: boolean;
  chipless?: boolean;
  cold_forming?: boolean;
  center_cutting?: boolean;
  combined?: boolean;
  micrometer_adjust?: boolean;
  adjustable?: boolean;
  high_feed?: boolean;
  replaceable?: boolean;
  replaceable_head?: boolean;
  multiple_diameters?: boolean;
  insert?: string;
  inserts?: boolean;
  pilot?: boolean;
  single_point?: boolean;
}

const TOOL_TYPES: Record<string, Omit<ToolTypeSpec, "id">> = {
  // --- Endmills (10) ---
  ENDMILL_FLAT:           { category: "endmill", geometry: "flat",          flutes: [2,3,4,5,6], helix: [30,35,40,45] },
  ENDMILL_BALL:           { category: "endmill", geometry: "ball",          flutes: [2,3,4],     helix: [30,35] },
  ENDMILL_BULLNOSE:       { category: "endmill", geometry: "corner_radius", flutes: [2,3,4,5],   helix: [30,35,40] },
  ENDMILL_CHAMFER:        { category: "endmill", geometry: "chamfer",       angles: [30,45,60,90] },
  ENDMILL_ROUGHER:        { category: "endmill", geometry: "chipbreaker",   flutes: [3,4,5,6] },
  ENDMILL_FINISHER:       { category: "endmill", geometry: "fine_pitch",    flutes: [6,8,10,12] },
  ENDMILL_HIGHFEED:       { category: "endmill", geometry: "high_feed",     flutes: [3,4,5] },
  ENDMILL_VARIABLE_HELIX: { category: "endmill", geometry: "variable",      helix: [35,37,40,42] },
  ENDMILL_TAPERED:        { category: "endmill", geometry: "tapered",       taper_per_side: [0.5,1,2,3,5] },
  ENDMILL_LOLLIPOP:       { category: "endmill", geometry: "lollipop",      flutes: [2,3] },

  // --- Facemills (5) ---
  FACEMILL_45:        { category: "facemill", lead_angle: 45, indexable: true },
  FACEMILL_75:        { category: "facemill", lead_angle: 75, indexable: true },
  FACEMILL_90:        { category: "facemill", lead_angle: 90, indexable: true },
  FACEMILL_ROUND:     { category: "facemill", lead_angle: 0,  insert: "round" },
  FACEMILL_HIGH_FEED: { category: "facemill", high_feed: true },

  // --- Shellmills (1) ---
  SHELLMILL: { category: "shellmill", indexable: true, arbor_mount: true },

  // --- Drills (15) ---
  DRILL_TWIST:        { category: "drill", type: "twist",        point_angles: [118,130,135,140] },
  DRILL_STUB:         { category: "drill", type: "stub",         l_d_ratio: 3 },
  DRILL_JOBBER:       { category: "drill", type: "jobber",       l_d_ratio: 8 },
  DRILL_TAPER_LENGTH: { category: "drill", type: "taper_length", l_d_ratio: 12 },
  DRILL_EXTRA_LONG:   { category: "drill", type: "extra_long",   l_d_ratio: 20 },
  DRILL_SPADE:        { category: "drill", type: "spade",        replaceable: true },
  DRILL_INDEXABLE:    { category: "drill", type: "indexable",    inserts: true },
  DRILL_MODULAR:      { category: "drill", type: "modular",      replaceable_head: true },
  DRILL_GUN:          { category: "drill", type: "gun",          l_d_ratio: 40 },
  DRILL_BTA:          { category: "drill", type: "bta",          l_d_ratio: 100 },
  DRILL_CENTER:       { category: "drill", type: "center",       combined: true },
  DRILL_SPOT:         { category: "drill", type: "spot",         angles: [60,82,90,120,142] },
  DRILL_COUNTERSINK:  { category: "drill", type: "countersink",  angles: [60,82,90,100,120] },
  DRILL_COUNTERBORE:  { category: "drill", type: "counterbore",  pilot: true },
  DRILL_STEP:         { category: "drill", type: "step",         multiple_diameters: true },

  // --- Reamers (4) ---
  REAMER_CHUCKING:   { category: "reamer", type: "chucking",   straight_shank: true },
  REAMER_SHELL:      { category: "reamer", type: "shell",      arbor_mount: true },
  REAMER_ADJUSTABLE: { category: "reamer", type: "adjustable" },
  REAMER_TAPER:      { category: "reamer", type: "taper",      tapers: ["morse","brown_sharpe"] },

  // --- Boring (4) ---
  BORING_BAR:      { category: "boring", type: "standard" },
  BORING_BAR_FINE: { category: "boring", type: "fine_boring", micrometer_adjust: true },
  BORING_BAR_BACK: { category: "boring", type: "back_boring" },
  BORING_HEAD:     { category: "boring", type: "head",        adjustable: true },

  // --- Threadmills (4) ---
  THREADMILL_SOLID:        { category: "threadmill", type: "solid" },
  THREADMILL_INDEXABLE:    { category: "threadmill", type: "indexable" },
  THREADMILL_SINGLE_POINT: { category: "threadmill", type: "single_point" },
  THREADMILL_MULTI_FORM:   { category: "threadmill", type: "multi_form" },

  // --- Taps (5) ---
  TAP_SPIRAL_POINT:    { category: "tap", type: "spiral_point",    through_hole: true },
  TAP_SPIRAL_FLUTE:    { category: "tap", type: "spiral_flute",    blind_hole: true },
  TAP_STRAIGHT_FLUTE:  { category: "tap", type: "straight_flute" },
  TAP_FORM:            { category: "tap", type: "form",            chipless: true },
  TAP_THREAD_FORMING:  { category: "tap", type: "thread_forming",  cold_forming: true },

  // --- Specialty (6) ---
  SLOT_DRILL:        { category: "specialty", type: "slot",       center_cutting: true },
  T_SLOT_CUTTER:     { category: "specialty", type: "t_slot" },
  DOVETAIL_CUTTER:   { category: "specialty", type: "dovetail",   angles: [45,55,60] },
  WOODRUFF_CUTTER:   { category: "specialty", type: "woodruff" },
  KEYSEAT_CUTTER:    { category: "specialty", type: "keyseat" },
  FLY_CUTTER:        { category: "specialty", type: "fly_cutter", single_point: true },

  // --- Engrave (1) ---
  ENGRAVER: { category: "engrave", type: "v_cutter", angles: [30,60,90,120] },
};

export type ToolTypeCategory = ToolTypeSpec["category"];

export class MonolithToolTypesDatabaseEngine {
  /** All tool-type records with `id` materialized. */
  list(): ToolTypeSpec[] {
    return Object.entries(TOOL_TYPES).map(([id, spec]) => ({ id, ...spec }));
  }

  /** Single record by id, or null on miss. Never throws. */
  get(id: string): ToolTypeSpec | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const spec = TOOL_TYPES[id];
    return spec ? { id, ...spec } : null;
  }

  /** Filter by category. Never throws on unknown category. */
  listByCategory(category: ToolTypeCategory): ToolTypeSpec[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Fuzzy search across id + category + geometry + type fields.
   * Returns hits capped at `limit`. Empty / non-string / invalid-limit → [].
   */
  search(query: string, limit = 20): ToolTypeSpec[] {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: ToolTypeSpec[] = [];
    for (const t of this.list()) {
      const hay = `${t.id} ${t.category} ${t.geometry ?? ""} ${t.type ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push(t);
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  /** All distinct category names — useful for UI dropdowns. */
  listCategories(): ToolTypeCategory[] {
    const set = new Set<ToolTypeCategory>();
    for (const t of this.list()) set.add(t.category);
    return Array.from(set).sort();
  }

  /** Counts — telemetry. */
  stats(): { total: number; by_category: Record<string, number> } {
    const byCat: Record<string, number> = {};
    for (const t of this.list()) {
      byCat[t.category] = (byCat[t.category] ?? 0) + 1;
    }
    return { total: Object.keys(TOOL_TYPES).length, by_category: byCat };
  }
}

export const monolithToolTypesDatabaseEngine = new MonolithToolTypesDatabaseEngine();
