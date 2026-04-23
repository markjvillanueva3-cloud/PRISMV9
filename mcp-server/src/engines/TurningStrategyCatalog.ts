/**
 * CAMX-MS19/U13 — Turning Strategy Catalog
 *
 * 40+ canonical turning / lathe strategies with category + capability tags.
 * Consumed by turning_strategy_list and turning_strategy_select dispatcher actions.
 *
 * Categories:
 *   rough          — bulk material removal
 *   finish         — final surface generation
 *   groove         — parting / grooving / recessing
 *   thread         — single-point / chasing threading
 *   bore           — internal turning / boring
 *   drill          — axial drilling on lathe
 *   contour        — profile / contour turning
 *   specialty      — hard turning, cryo, interrupted, polygon, etc.
 */

export interface TurningStrategyEntry {
  id: string;
  name: string;
  category: "rough" | "finish" | "groove" | "thread" | "bore" | "drill" | "contour" | "specialty";
  operation_tags: string[];
  material_tags?: string[];
  typical_Ra_um?: [number, number];
  notes?: string;
}

export const TURNING_STRATEGY_CATALOG: readonly TurningStrategyEntry[] = [
  // Roughing (6)
  { id: "turning_rough_longitudinal",   name: "Longitudinal roughing (G71)",        category: "rough",   operation_tags: ["od_rough", "longitudinal"] },
  { id: "turning_rough_face",           name: "Face roughing (G72)",                category: "rough",   operation_tags: ["face_rough"] },
  { id: "turning_rough_pattern",        name: "Pattern roughing (G73)",             category: "rough",   operation_tags: ["pattern_rough", "contour_rough"] },
  { id: "turning_rough_plunge",         name: "Plunge roughing",                    category: "rough",   operation_tags: ["plunge_rough"] },
  { id: "turning_rough_ramp",           name: "Ramp roughing",                      category: "rough",   operation_tags: ["ramp_rough"] },
  { id: "turning_rough_trochoidal",     name: "Trochoidal turning",                 category: "rough",   operation_tags: ["trochoidal"] , notes: "Constant chip load for hard alloys" },

  // Finishing (6)
  { id: "turning_finish_profile",       name: "Profile finishing (G70)",            category: "finish",  operation_tags: ["finish"], typical_Ra_um: [0.8, 3.2] },
  { id: "turning_finish_wiper",         name: "Wiper-insert finish",                category: "finish",  operation_tags: ["finish", "wiper"], typical_Ra_um: [0.4, 1.6] },
  { id: "turning_finish_spring_pass",   name: "Spring pass / zero-DOC skim",        category: "finish",  operation_tags: ["spring_pass"], typical_Ra_um: [0.4, 1.2] },
  { id: "turning_finish_high_feed",     name: "High-feed finishing",                category: "finish",  operation_tags: ["high_feed", "finish"] },
  { id: "turning_finish_taper",         name: "Taper finishing",                    category: "finish",  operation_tags: ["taper", "finish"] },
  { id: "turning_finish_super",         name: "Super-finish (micro-turning)",       category: "finish",  operation_tags: ["super_finish"], typical_Ra_um: [0.05, 0.4] },

  // Grooving / parting (6)
  { id: "turning_groove_radial",        name: "Radial grooving",                    category: "groove",  operation_tags: ["groove_od", "radial_groove"] },
  { id: "turning_groove_face",          name: "Face grooving",                      category: "groove",  operation_tags: ["groove_face"] },
  { id: "turning_groove_id",            name: "Internal grooving",                  category: "groove",  operation_tags: ["groove_id"] },
  { id: "turning_groove_profile",       name: "Profile grooving (form)",            category: "groove",  operation_tags: ["groove_profile"] },
  { id: "turning_part_off",             name: "Part-off / cut-off",                 category: "groove",  operation_tags: ["part_off"] },
  { id: "turning_groove_multi_pass",    name: "Multi-pass wide grooving",           category: "groove",  operation_tags: ["groove_wide"] },

  // Threading (6)
  { id: "turning_thread_single_point",  name: "Single-point threading (G76)",       category: "thread",  operation_tags: ["thread_sp", "od_thread"] },
  { id: "turning_thread_radial_infeed", name: "Radial-infeed threading",            category: "thread",  operation_tags: ["thread_sp", "radial"] },
  { id: "turning_thread_modified_flank",name: "Modified-flank infeed threading",    category: "thread",  operation_tags: ["thread_sp", "modified_flank"] },
  { id: "turning_thread_alternating",   name: "Alternating-flank threading",        category: "thread",  operation_tags: ["thread_sp", "alternating"] },
  { id: "turning_thread_chase",         name: "Thread chasing (repeat)",            category: "thread",  operation_tags: ["thread_chase"] },
  { id: "turning_thread_multi_start",   name: "Multi-start threading",              category: "thread",  operation_tags: ["thread_multi_start"] },

  // Boring (4)
  { id: "turning_bore_rough",           name: "Bore roughing",                      category: "bore",    operation_tags: ["bore_rough"] },
  { id: "turning_bore_finish",          name: "Bore finishing",                     category: "bore",    operation_tags: ["bore_finish"] },
  { id: "turning_bore_profile",         name: "Bore contour profiling",             category: "bore",    operation_tags: ["bore_contour"] },
  { id: "turning_bore_back",            name: "Back-boring (sub-spindle)",          category: "bore",    operation_tags: ["bore_back", "sub_spindle"] },

  // Drilling on lathe (4)
  { id: "turning_drill_center",         name: "Center drilling",                    category: "drill",   operation_tags: ["center_drill"] },
  { id: "turning_drill_axial",          name: "Axial drilling",                     category: "drill",   operation_tags: ["drill_axial"] },
  { id: "turning_drill_peck",           name: "Peck drilling",                      category: "drill",   operation_tags: ["drill_peck"] },
  { id: "turning_drill_gun",            name: "Gun drilling",                       category: "drill",   operation_tags: ["drill_gun"], notes: "Deep-hole straightness" },

  // Contour (4)
  { id: "turning_contour_cnc",          name: "CNC contour turning",                category: "contour", operation_tags: ["contour"] },
  { id: "turning_contour_eccentric",    name: "Eccentric / offset contour",         category: "contour", operation_tags: ["eccentric"] },
  { id: "turning_contour_polygon",      name: "Polygon turning",                    category: "contour", operation_tags: ["polygon"] },
  { id: "turning_contour_helical",      name: "Helical contour",                    category: "contour", operation_tags: ["helical_contour"] },

  // Specialty (8)
  { id: "turning_hard",                 name: "Hard turning (CBN)",                 category: "specialty", operation_tags: ["hard_turn"], material_tags: ["hardened_steel"], typical_Ra_um: [0.2, 0.8] },
  { id: "turning_cryo",                 name: "Cryogenic turning (LN2)",            category: "specialty", operation_tags: ["cryo"], material_tags: ["titanium", "inconel"] },
  { id: "turning_diamond",              name: "Single-point diamond turning",       category: "specialty", operation_tags: ["spdt"], typical_Ra_um: [0.002, 0.05] },
  { id: "turning_interrupted",          name: "Interrupted-cut turning",            category: "specialty", operation_tags: ["interrupted"] },
  { id: "turning_form",                 name: "Form-tool turning",                  category: "specialty", operation_tags: ["form_tool"] },
  { id: "turning_knurling",             name: "Knurling",                           category: "specialty", operation_tags: ["knurl"] },
  { id: "turning_skiving",              name: "Power skiving",                      category: "specialty", operation_tags: ["skiving", "gear"] },
  { id: "turning_swiss",                name: "Swiss-type sliding headstock",       category: "specialty", operation_tags: ["swiss", "guide_bushing"] },
];

export function selectTurningStrategy(query: {
  operation?: string;
  material?: string;
  geometry?: "od" | "id" | "face" | "groove" | "thread";
  tolerance_um?: number;
}): TurningStrategyEntry[] {
  const { operation, material, geometry, tolerance_um } = query;
  const op = (operation || "").toLowerCase();
  const mat = (material || "").toLowerCase();

  let candidates: TurningStrategyEntry[] = [...TURNING_STRATEGY_CATALOG];

  // Geometry filter
  if (geometry === "id") candidates = candidates.filter(s => s.category === "bore" || s.operation_tags.some(t => t.includes("id")));
  if (geometry === "face") candidates = candidates.filter(s => s.operation_tags.some(t => t.includes("face")) || s.category === "groove");
  if (geometry === "groove") candidates = candidates.filter(s => s.category === "groove");
  if (geometry === "thread") candidates = candidates.filter(s => s.category === "thread");

  // Operation filter
  if (op) candidates = candidates.filter(s => s.operation_tags.some(t => t.includes(op)) || s.name.toLowerCase().includes(op) || s.category === op);

  // Tolerance filter — if tight tolerance, prefer finish/specialty
  if (tolerance_um !== undefined && tolerance_um <= 10 && candidates.length > 0) {
    const tight = candidates.filter(s => s.category === "finish" || s.category === "specialty");
    if (tight.length > 0) candidates = tight;
  }

  // Material hint
  if (mat && candidates.length > 0) {
    const matMatch = candidates.filter(s => s.material_tags?.some(t => mat.includes(t) || t.includes(mat)));
    if (matMatch.length > 0) candidates = matMatch;
  }

  return candidates.slice(0, 10);
}
