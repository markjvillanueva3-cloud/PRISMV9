/**
 * CAMOperationSelectorEngine — CAM-AI-TRAINING-MS0/U-CAMT-OPSELECT
 *
 * Given a classified FeatureClass (from CAMFeatureClassClassifierEngine),
 * select the best canonical CamOperation to machine it. Bridges the
 * classifier → template generator without forcing the consumer to know
 * the full taxonomy mapping.
 *
 * Pure rule-based selector. The ranking honors the operation spec's
 * featureClasses list AND the natural specificity (drill_peck > drill
 * for deep_hole; impeller_blade_5axis > swarf_5axis for impeller_blade).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";
import type { FeatureClass } from "./CAMTemplateGeneratorEngine.js";

// Priority overrides where the natural taxonomy ordering doesn't pick the
// best specialty op. Higher priority wins (default 0).
const PRIORITY: Partial<Record<FeatureClass, Partial<Record<CamOperation, number>>>> = {
  deep_hole:       { drill_deep: 10, drill_peck: 5 },
  tapped_hole:     { tap_rigid: 10, thread_mill: 5, tap_floating: 3 },
  thru_hole:       { drill: 10 },
  blind_hole:      { drill: 10 },
  hole_ream:       { ream: 10 },
  hole_bore:       { bore: 10 },
  counterbore:     { counterbore: 10 },
  countersink:     { countersink: 10 },
  impeller_blade:  { impeller_blade_5axis: 10 },
  blisk:           { blade_hub_shroud_5axis: 10 },
  ruled_surface:   { swarf_5axis: 10 },
  external_thread: { turn_thread: 10, thread_turn: 8 },
  internal_thread: { thread_mill: 10 },
  thru_profile:    { wedm_2axis: 10 },
  tapered_thru:    { wedm_4axis_taper: 10 },
  blind_cavity:    { sinker_edm: 10 },
  part_off:        { turn_part: 10 },
  groove:          { turn_groove: 10 },
  od_groove:       { turn_groove: 10 },
  id_groove:       { turn_groove: 10 },
  external_profile:{ contour_2d: 5, turn_finish: 8 },
  internal_profile:{ contour_2d: 5, turn_bore: 8 },
  pocket:          { adaptive_clearing_2d: 8, pocket_2d: 6 },
  closed_pocket:   { pocket_2d: 10 },
  open_pocket:     { adaptive_clearing_2d: 10 },
  "3d_pocket":     { adaptive_clearing_3d: 10 },
  face:            { face: 10 },
  top_surface:     { face: 10 },
  slot:            { slot_2d: 10 },
  keyway:          { slot_2d: 10 },
  chamfer:         { chamfer_2d: 10 },
  edge:            { edge_break: 10 },
  burr:            { deburr: 10 },
  text:            { engrave_2d: 10 },
  marking:         { laser_engrave: 10 },
  added_geometry:  { additive_deposition: 10 },
  datum:           { probe_wcs: 10 },
  measured_feature:{ probe_part_inspect: 10 },
  tool_offset:     { probe_tool_measure: 10 },
  surface:         { parallel_3d: 5, scallop_3d: 5, waterline_3d: 5 },
  complex_surface: { tilt_5axis_simultaneous: 8, scallop_3d: 5 },
};

export interface OperationSelection {
  feature: FeatureClass;
  best: CamOperation | null;
  candidates: Array<{ op: CamOperation; priority: number; reason: string }>;
}

export class CAMOperationSelectorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMOperationSelectorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "FeatureClass → best canonical CamOperation selector.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "select",        description: "Best op for a feature class",       actions: ["cam_op_select"] },
      { name: "candidates",    description: "Ranked candidate ops + reasons",    actions: ["cam_op_candidates"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMOperationSelectorEngine", note: "use typed methods" };
  }

  /**
   * Select the best canonical op for a given feature class.
   * Honors explicit PRIORITY overrides + taxonomy spec.featureClasses list.
   */
  select(feature: FeatureClass): OperationSelection {
    const candidates: Array<{ op: CamOperation; priority: number; reason: string }> = [];
    const overrides = PRIORITY[feature] ?? {};

    for (const op of camOperationTaxonomyEngine.listOperations()) {
      const spec = camOperationTaxonomyEngine.getSpec(op);
      const matches = spec?.featureClasses?.includes(feature);
      if (!matches) continue;
      const explicit = overrides[op];
      const priority = explicit ?? 1;
      const reason = explicit
        ? `explicit-priority(${explicit}) feature-class-match`
        : "feature-class-match";
      candidates.push({ op, priority, reason });
    }

    candidates.sort((a, b) => b.priority - a.priority);
    return { feature, best: candidates[0]?.op ?? null, candidates };
  }
}

export const camOperationSelectorEngine = new CAMOperationSelectorEngine();
