/**
 * MastercamEDMBridge — Mastercam Wire / Sinker EDM workflow routing
 *
 * Routes Mastercam EDM operations to the canonical EDMProgramAssemblerEngine.
 * Mastercam ships a dedicated "Mastercam Wire" product for 2-axis and 4-axis
 * wire EDM (UV-XY independent control), and Mastercam Mill carries sinker
 * EDM electrode-machining capability.
 *
 * Mastercam Wire-specific features captured here:
 *   - Glue-stop tabs (auto-inserted on no-core profiles to hold the slug)
 *   - Conditional taper (taper changes mid-profile)
 *   - 4-axis UV-XY independent contour pairs
 *   - Multi-pass skim sequence (rough + 2-3 finishing skims)
 *
 * Sister engine: HyperMillEDMBridge (same shape, hyperMILL-specific).
 *
 * @module engines/MastercamEDMBridge
 * @milestone CAM-EXHAUST-MS0 U-CAM-MC-EDM-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const EDMRouteTypeSchema = z.enum(["wire_2axis", "wire_4axis", "sinker", "micro"]);
export type EDMRouteType = z.infer<typeof EDMRouteTypeSchema>;

export const MastercamEDMFeatureSchema = z.object({
  type: z.enum([
    "open_contour",          // wire 2-axis cut
    "closed_contour_no_core",// wire 2-axis no-core (needs glue tabs)
    "tapered_contour",       // wire 4-axis with taper angle
    "uv_xy_pair",            // wire 4-axis independent UV/XY paths
    "blind_cavity",          // sinker
    "through_pocket",        // sinker through-hole
    "rib_burn",              // sinker fine rib
    "micro_hole",            // micro EDM
  ]),
  name: z.string().min(1),
  contour_length_mm: z.number().nonnegative().optional(),
  depth_mm: z.number().nonnegative().optional(),
  taper_angle_deg: z.number().min(-30).max(30).optional(),
  electrode_undersize_mm: z.number().nonnegative().optional(),
  needs_glue_tabs: z.boolean().optional(),
  workpiece_thickness_mm: z.number().positive(),
});
export type MastercamEDMFeature = z.infer<typeof MastercamEDMFeatureSchema>;

export const MastercamEDMRouteSchema = z.object({
  route_type: EDMRouteTypeSchema,
  feature_name: z.string().min(1),
  cycle_code: z.string().min(1),
  rationale: z.string().min(1),
  recommended_skim_passes: z.number().int().min(0).max(8),
  needs_glue_tabs: z.boolean(),
});
export type MastercamEDMRoute = z.infer<typeof MastercamEDMRouteSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const SKIM_PASSES_BY_THICKNESS_MM: ReadonlyArray<{ max_thickness: number; passes: number }> = Object.freeze([
  { max_thickness: 10,  passes: 1 },
  { max_thickness: 25,  passes: 2 },
  { max_thickness: 50,  passes: 3 },
  { max_thickness: 100, passes: 4 },
  { max_thickness: Number.POSITIVE_INFINITY, passes: 5 },
]);

const MICRO_FEATURE_THRESHOLD_MM = 1.0;

// ── Engine ───────────────────────────────────────────────────────────────────

export class MastercamEDMBridge {
  /**
   * Pick the EDM route type for a Mastercam feature. Routing logic:
   *   - feature.depth < 1 mm OR contour_length < 1 mm → micro EDM
   *   - feature.type ∈ {blind_cavity, through_pocket, rib_burn} → sinker
   *   - feature.type ∈ {tapered_contour, uv_xy_pair} → wire_4axis
   *   - feature.type ∈ {open_contour, closed_contour_no_core} → wire_2axis
   */
  static pickRouteType(feature: MastercamEDMFeature): EDMRouteType {
    const f = MastercamEDMFeatureSchema.parse(feature);

    // Micro check first — applies regardless of feature type if dimensions are tiny.
    const cl = f.contour_length_mm ?? Number.POSITIVE_INFINITY;
    const dp = f.depth_mm ?? Number.POSITIVE_INFINITY;
    if (f.type === "micro_hole" || cl < MICRO_FEATURE_THRESHOLD_MM || dp < MICRO_FEATURE_THRESHOLD_MM) {
      return "micro";
    }

    switch (f.type) {
      case "blind_cavity":
      case "through_pocket":
      case "rib_burn":
        return "sinker";
      case "tapered_contour":
      case "uv_xy_pair":
        return "wire_4axis";
      case "open_contour":
      case "closed_contour_no_core":
        return "wire_2axis";
    }
  }

  /** Recommend the skim-pass count by workpiece thickness (Mastercam Wire defaults). */
  static recommendSkimPasses(workpiece_thickness_mm: number): number {
    if (workpiece_thickness_mm <= 0) {
      throw new Error(`MastercamEDMBridge: workpiece_thickness_mm must be > 0, got ${workpiece_thickness_mm}`);
    }
    for (const tier of SKIM_PASSES_BY_THICKNESS_MM) {
      if (workpiece_thickness_mm <= tier.max_thickness) return tier.passes;
    }
    return SKIM_PASSES_BY_THICKNESS_MM[SKIM_PASSES_BY_THICKNESS_MM.length - 1].passes;
  }

  /** Build the full route descriptor for a feature. */
  static route(feature: MastercamEDMFeature): MastercamEDMRoute {
    const f = MastercamEDMFeatureSchema.parse(feature);
    const route_type = MastercamEDMBridge.pickRouteType(f);
    const skim_passes = route_type === "sinker" || route_type === "micro"
      ? 0                                                       // sinker uses spark-gap not skim passes
      : MastercamEDMBridge.recommendSkimPasses(f.workpiece_thickness_mm);

    let cycle_code: string;
    let rationale: string;
    let needs_glue_tabs = false;

    switch (route_type) {
      case "wire_2axis":
        cycle_code = f.type === "closed_contour_no_core" ? "WEDM:Contour:NoCore" : "WEDM:Contour:2Axis";
        needs_glue_tabs = f.type === "closed_contour_no_core" || (f.needs_glue_tabs ?? false);
        rationale = needs_glue_tabs
          ? "Closed no-core profile — auto-insert glue-stop tabs to hold the slug"
          : `2-axis wire contour, ${skim_passes} skim pass(es) for finish`;
        break;
      case "wire_4axis":
        cycle_code = f.type === "uv_xy_pair" ? "WEDM:Contour:UV-XY" : "WEDM:Contour:Tapered";
        needs_glue_tabs = false;
        rationale = f.type === "uv_xy_pair"
          ? "4-axis independent UV/XY contour pair — Mastercam Wire UV-XY"
          : `4-axis tapered cut at ${f.taper_angle_deg ?? 0}° — conditional taper supported`;
        break;
      case "sinker":
        cycle_code = f.type === "rib_burn" ? "SEDM:Rib" :
                     f.type === "blind_cavity" ? "SEDM:Cavity:Blind" : "SEDM:Cavity:Through";
        rationale = f.type === "rib_burn"
          ? "Fine rib — single-electrode burn with low-energy finish setting"
          : `Sinker ${f.type === "blind_cavity" ? "blind" : "through"} cavity${f.electrode_undersize_mm !== undefined ? ` (electrode undersize ${f.electrode_undersize_mm} mm)` : ""}`;
        break;
      case "micro":
        cycle_code = "MicroEDM:Hole";
        rationale = `Feature dimension < ${MICRO_FEATURE_THRESHOLD_MM} mm — routed to micro-EDM (low energy, fine wire/electrode)`;
        break;
    }

    return MastercamEDMRouteSchema.parse({
      route_type,
      feature_name: f.name,
      cycle_code,
      rationale,
      recommended_skim_passes: skim_passes,
      needs_glue_tabs,
    });
  }

  /** Aggregate stats across a feature list. */
  static stats(features: MastercamEDMFeature[]): {
    total: number;
    by_route: Record<EDMRouteType, number>;
    glue_tab_count: number;
    avg_skim_passes: number;
  } {
    const routes = features.map(f => MastercamEDMBridge.route(f));
    const by_route: Record<EDMRouteType, number> = {
      wire_2axis: 0, wire_4axis: 0, sinker: 0, micro: 0,
    };
    let glue_tab_count = 0;
    let skim_total = 0;
    for (const r of routes) {
      by_route[r.route_type] += 1;
      if (r.needs_glue_tabs) glue_tab_count += 1;
      skim_total += r.recommended_skim_passes;
    }
    return {
      total: routes.length,
      by_route,
      glue_tab_count,
      avg_skim_passes: routes.length === 0 ? 0 : skim_total / routes.length,
    };
  }

  static auditEngine(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    // Verify skim-pass tiers are monotonic.
    for (let i = 1; i < SKIM_PASSES_BY_THICKNESS_MM.length; i++) {
      if (SKIM_PASSES_BY_THICKNESS_MM[i].max_thickness <= SKIM_PASSES_BY_THICKNESS_MM[i - 1].max_thickness) {
        errors.push(`skim-pass tier ${i} max_thickness not strictly increasing`);
      }
      if (SKIM_PASSES_BY_THICKNESS_MM[i].passes < SKIM_PASSES_BY_THICKNESS_MM[i - 1].passes) {
        errors.push(`skim-pass tier ${i} passes count regressed`);
      }
    }
    return { ok: errors.length === 0, errors };
  }
}

export const mastercamEDMBridge = MastercamEDMBridge;
