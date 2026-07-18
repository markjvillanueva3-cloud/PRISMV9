/**
 * wedm-compound-cascade.ts — P0-3: COMPOUND / BI-MATERIAL cascade composition.
 *
 * The operator's third axis ("compound material cutting"). The comprehensive
 * validation (WEDM-P2P-COMPREHENSIVE-VALIDATION-2026-06-01.md) found the 42 KB
 * EDMBiMaterialCompensationEngine — which already models per-zone spark params for
 * steel→braze→carbide→braze→steel transitions — has ZERO linkage to the cascade
 * generator, and that there is NO carbide E-code family (WC zones would silently
 * get the steel recipe = large MRR error). This module is that linkage.
 *
 * generateCompoundJobCascade(zones, thickness) calls the engine for the per-zone
 * cutting parameters AND binds each STEEL zone to its shop-calibrated FA E-code
 * family (via selectECodeFamily). It does NOT fabricate carbide/braze E-codes —
 * those have no FA-10S calibration on file, so the cascade marks them
 * `needs_operator_ecode` and exposes the engine's computed spark params as the
 * operator's starting point. This is fail-loud about the carbide gap rather than
 * emitting a wrong (steel-recipe) carbide program.
 *
 * Pure composition over the engine + oracle. No inlined discharge constants —
 * spark params come from EDMBiMaterialCompensationEngine, E-codes from the oracle.
 *
 * @module data/wedm-compound-cascade
 */
import {
  edmBiMaterialCompensationEngine,
  type MaterialZone,
} from "../engines/EDMBiMaterialCompensationEngine.js";
import { selectECodeFamily } from "./jm-die-wedm-tech-tables.js";

/** Zone types that have a shop-calibrated FA E-code family (steel). */
const STEEL_ZONE_TYPES: ReadonlySet<MaterialZone["zone_type"]> = new Set([
  "primary_steel",
  "secondary_steel",
]);

/** One zone of a compound cascade: oracle E-family (steel) + engine spark params. */
export interface CompoundZoneCascade {
  zone_id: string;
  zone_type: MaterialZone["zone_type"];
  material: string;
  /** Oracle E-code family id for steel zones; null when none applies (carbide/braze). */
  e_family_id: string | null;
  /** Why the family is what it is (or why it is null). */
  e_family_reason: string;
  /** True when the operator must dial in E-codes (no FA calibration for this zone). */
  needs_operator_ecode: boolean;
  /** Engine-computed spark params for this zone (the starting point). */
  params: {
    t_on_us: number;
    t_off_us: number;
    peak_current_A: number;
    feed_rate_mm_min: number;
    wire_break_risk: number;
    flushing_pressure_bar: number;
  };
}

/** A full compound (bi-material) cascade with provenance + fail-loud caveats. */
export interface CompoundCascade {
  thickness_mm: number;
  zone_count: number;
  has_carbide: boolean;
  has_braze: boolean;
  overall_wire_break_risk: number;
  zones: CompoundZoneCascade[];
  /** Process/safety warnings surfaced by the engine (braze melt-back, carbide flush, etc.). */
  warnings: string[];
  /** Fail-loud: non-empty means NOT a validated 1:1 reproduction (carbide gap / unvalidated). */
  caveats: string[];
}

function round(n: number, dp: number): number {
  const k = Math.pow(10, dp);
  return Math.round(n * k) / k;
}

/**
 * Generate a compound (bi-material) cascade for a zoned profile. Returns null when
 * no zones are supplied. Steel zones bind to their FA E-code family; carbide/braze
 * zones are flagged `needs_operator_ecode` (no FA carbide calibration on file) with
 * the engine's spark params as guidance.
 */
export function generateCompoundJobCascade(params: {
  zones: MaterialZone[];
  thickness_mm: number;
  wire_diameter_mm?: number;
  pass_type?: "rough" | "semi_finish" | "finish" | "super_finish";
}): CompoundCascade | null {
  if (!Array.isArray(params.zones) || params.zones.length === 0) return null;
  if (!(typeof params.thickness_mm === "number" && Number.isFinite(params.thickness_mm) && params.thickness_mm > 0)) return null;

  const result = edmBiMaterialCompensationEngine.optimize({
    zones: params.zones,
    thickness_mm: params.thickness_mm,
    wire_diameter_mm: params.wire_diameter_mm,
    pass_type: params.pass_type,
  });

  const byId = new Map(result.zones.map((z) => [z.zone_id, z]));
  const zones: CompoundZoneCascade[] = params.zones.map((z) => {
    const zp = byId.get(z.zone_id);
    const isSteel = STEEL_ZONE_TYPES.has(z.zone_type);
    const fam = isSteel
      ? selectECodeFamily({
          material: z.material,
          thickness_mm: params.thickness_mm,
          taper_angle_deg: z.taper_angle_deg,
        })
      : null;
    const needsOperator = !isSteel || fam == null;
    const reason = isSteel
      ? fam
        ? "steel zone bound to shop-calibrated FA family " + fam.id
        : "steel zone but material '" + z.material + "' not in any FA family — operator dials in E-codes"
      : "no shop-calibrated FA-10S " + z.zone_type + " E-family on file — operator dials in E-codes (engine spark params are the starting point)";
    return {
      zone_id: z.zone_id,
      zone_type: z.zone_type,
      material: z.material,
      e_family_id: fam ? fam.id : null,
      e_family_reason: reason,
      needs_operator_ecode: needsOperator,
      params: {
        t_on_us: zp ? zp.t_on_us : 0,
        t_off_us: zp ? zp.t_off_us : 0,
        peak_current_A: zp ? zp.peak_current_A : 0,
        feed_rate_mm_min: zp ? zp.feed_rate_mm_min : 0,
        wire_break_risk: zp ? round(zp.wire_break_risk, 3) : 0,
        flushing_pressure_bar: zp ? zp.flushing_pressure_bar : 0,
      },
    };
  });

  const caveats: string[] = [];
  const carbideOrBraze = zones.filter((z) => z.needs_operator_ecode && z.zone_type !== "primary_steel" && z.zone_type !== "secondary_steel");
  if (carbideOrBraze.length > 0) {
    caveats.push(
      "no FA-10S carbide/braze E-code family exists — " + carbideOrBraze.length + " zone(s) flagged needs_operator_ecode; spark params are engine-computed guidance, NOT a posted program",
    );
  }
  caveats.push("compound/bi-material cascade is an engine-computed MODEL — UNVALIDATED vs a JM bi-material program (none on disk)");

  return {
    thickness_mm: params.thickness_mm,
    zone_count: result.profile.zone_count,
    has_carbide: result.profile.has_carbide,
    has_braze: result.profile.has_braze,
    overall_wire_break_risk: round(result.overall_wire_break_risk, 3),
    zones,
    warnings: result.warnings,
    caveats,
  };
}
