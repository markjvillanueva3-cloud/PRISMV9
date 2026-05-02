/**
 * MastercamGrindingBridge — Mastercam grinding workflow routing
 *
 * Mastercam doesn't ship a dedicated grinding product but covers cylindrical
 * + surface grinding via the Mill product (with grinding-specific tool
 * geometry + low-feed/high-RPM cycle parameters). This engine routes a
 * grinding feature descriptor to the appropriate cycle code + wheel
 * dressing + spark-out parameters.
 *
 * Sister engine: HyperMillGrindingBridge (same shape, hyperMILL-specific).
 *
 * @module engines/MastercamGrindingBridge
 * @milestone CAM-EXHAUST-MS0 U-CAM-MC-GRIND-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const GrindingKindSchema = z.enum([
  "surface_horizontal",
  "surface_vertical",
  "cylindrical_od",
  "cylindrical_id",
  "centerless",
  "creep_feed",
  "form_grinding",
  "jig_grinding",
]);
export type GrindingKind = z.infer<typeof GrindingKindSchema>;

export const WheelGritSchema = z.enum([
  "rough_46",      // 46 grit — heavy stock removal
  "medium_60",     // 60 grit — general purpose
  "medium_80",     // 80 grit — semi-finishing
  "fine_120",      // 120 grit — finishing
  "extra_fine_220",// 220 grit — fine finishing
  "polish_400",    // 400 grit — polishing
]);
export type WheelGrit = z.infer<typeof WheelGritSchema>;

export const GrindingFeatureSchema = z.object({
  kind: GrindingKindSchema,
  name: z.string().min(1),
  workpiece_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  stock_to_remove_mm: z.number().positive(),
  surface_finish_ra_um: z.number().positive(),
  wheel_dia_mm: z.number().positive(),
  wheel_width_mm: z.number().positive(),
  workpiece_dia_mm: z.number().positive().optional(),  // for cylindrical kinds
});
export type GrindingFeature = z.infer<typeof GrindingFeatureSchema>;

export const GrindingPlanSchema = z.object({
  cycle_code: z.string().min(1),
  wheel_grit: WheelGritSchema,
  rough_pass_count: z.number().int().nonnegative(),
  finish_pass_count: z.number().int().nonnegative(),
  spark_out_passes: z.number().int().nonnegative(),
  wheel_rpm: z.number().int().positive(),
  feed_per_pass_mm: z.number().positive(),
  needs_dressing_between_finish: z.boolean(),
  rationale: z.string().min(1),
});
export type GrindingPlan = z.infer<typeof GrindingPlanSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const TARGET_SURFACE_SPEED_MS: Readonly<Record<string, number>> = Object.freeze({
  // Conventional aluminum-oxide / silicon-carbide wheels
  alox: 30,    // 30 m/s — typical for ferrous workpieces
  sic: 25,     // 25 m/s — softer for non-ferrous
  cbn: 60,     // 60 m/s — CBN can run much faster
  diamond: 30, // 30 m/s — diamond, used on carbide / ceramic
});

// Pick wheel surface speed by ISO group (heuristic).
function wheelSurfaceSpeedFor(iso: string): number {
  switch (iso) {
    case "P": return TARGET_SURFACE_SPEED_MS.alox;     // steel
    case "M": return TARGET_SURFACE_SPEED_MS.alox;     // stainless
    case "K": return TARGET_SURFACE_SPEED_MS.sic;      // cast iron — slower wheel
    case "N": return TARGET_SURFACE_SPEED_MS.sic;      // alu / non-ferrous
    case "S": return TARGET_SURFACE_SPEED_MS.cbn;      // superalloy — CBN speed
    case "H": return TARGET_SURFACE_SPEED_MS.cbn;      // hardened — CBN speed
  }
  return TARGET_SURFACE_SPEED_MS.alox;
}

// Pick wheel grit by target surface finish Ra.
function gritForFinishRa(ra_um: number): WheelGrit {
  if (ra_um >= 1.6)  return "rough_46";
  if (ra_um >= 0.8)  return "medium_60";
  if (ra_um >= 0.4)  return "medium_80";
  if (ra_um >= 0.2)  return "fine_120";
  if (ra_um >= 0.1)  return "extra_fine_220";
  return "polish_400";
}

const CYCLE_CODE_BY_KIND: Readonly<Record<GrindingKind, string>> = Object.freeze({
  surface_horizontal: "GRIND:Surface:H",
  surface_vertical:   "GRIND:Surface:V",
  cylindrical_od:     "GRIND:Cyl:OD",
  cylindrical_id:     "GRIND:Cyl:ID",
  centerless:         "GRIND:Centerless",
  creep_feed:         "GRIND:CreepFeed",
  form_grinding:      "GRIND:Form",
  jig_grinding:       "GRIND:Jig",
});

// ── Engine ───────────────────────────────────────────────────────────────────

export class MastercamGrindingBridge {
  static readonly TARGET_SURFACE_SPEED_MS = TARGET_SURFACE_SPEED_MS;

  /**
   * Compute wheel RPM from target surface speed:
   *   Vc = π × D × n / 60000  ⇒  n = Vc × 60000 / (π × D)
   * Vc in m/s, D in mm, n in rev/min.
   */
  static wheelRpmFromSurfaceSpeed(wheel_dia_mm: number, surface_speed_ms: number): number {
    if (wheel_dia_mm <= 0) throw new Error(`MastercamGrindingBridge: wheel_dia_mm must be > 0, got ${wheel_dia_mm}`);
    if (surface_speed_ms <= 0) throw new Error(`MastercamGrindingBridge: surface_speed_ms must be > 0, got ${surface_speed_ms}`);
    return Math.round((surface_speed_ms * 60000) / (Math.PI * wheel_dia_mm));
  }

  /** Build a complete grinding plan for the feature. */
  static plan(feature: GrindingFeature): GrindingPlan {
    const f = GrindingFeatureSchema.parse(feature);
    const cycle_code = CYCLE_CODE_BY_KIND[f.kind];
    const wheel_grit = gritForFinishRa(f.surface_finish_ra_um);
    const surface_speed = wheelSurfaceSpeedFor(f.workpiece_iso_group);
    const wheel_rpm = MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(f.wheel_dia_mm, surface_speed);

    // Pass scheduling:
    //   roughing pass count scales with stock to remove (cap at 8)
    //   finishing always 2 passes for ≥0.4 µm, 3 for finer finishes
    //   spark-out passes proportional to finish quality
    const rough_pass_count = Math.min(8, Math.max(1, Math.ceil(f.stock_to_remove_mm / 0.05)));
    const finish_pass_count = f.surface_finish_ra_um >= 0.4 ? 2 : 3;
    const spark_out_passes = f.surface_finish_ra_um >= 1.6 ? 1 :
                             f.surface_finish_ra_um >= 0.4 ? 2 : 3;

    // Feed per pass: rougher takes more, finisher takes less
    const feed_per_pass_mm = f.surface_finish_ra_um >= 1.6 ? 0.05 :
                             f.surface_finish_ra_um >= 0.4 ? 0.02 : 0.005;

    // Dressing between finish passes is required for fine finishes (Ra < 0.4 µm)
    const needs_dressing_between_finish = f.surface_finish_ra_um < 0.4;

    const rationale = [
      `${f.kind}: ${rough_pass_count} rough + ${finish_pass_count} finish + ${spark_out_passes} spark-out`,
      `wheel grit ${wheel_grit} for Ra ${f.surface_finish_ra_um} µm`,
      `wheel ${wheel_rpm} rpm at ${surface_speed} m/s for ISO ${f.workpiece_iso_group}`,
    ].join("; ");

    return GrindingPlanSchema.parse({
      cycle_code,
      wheel_grit,
      rough_pass_count,
      finish_pass_count,
      spark_out_passes,
      wheel_rpm,
      feed_per_pass_mm,
      needs_dressing_between_finish,
      rationale,
    });
  }

  /** All cycle codes — useful for the safety / scenario layer. */
  static cycleCodes(): Record<GrindingKind, string> {
    return { ...CYCLE_CODE_BY_KIND };
  }

  static auditEngine(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    // Every grinding kind must have a cycle code.
    for (const kind of GrindingKindSchema.options) {
      if (CYCLE_CODE_BY_KIND[kind] === undefined) errors.push(`kind ${kind} missing cycle code`);
    }
    // Surface speed table must have all 4 wheel materials.
    for (const m of ["alox", "sic", "cbn", "diamond"]) {
      if (TARGET_SURFACE_SPEED_MS[m] === undefined) errors.push(`surface speed table missing ${m}`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const mastercamGrindingBridge = MastercamGrindingBridge;
