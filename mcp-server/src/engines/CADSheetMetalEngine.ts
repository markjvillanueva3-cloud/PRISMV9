/**
 * CADSheetMetalEngine -- dispatcher-facing COMPOSER that exposes existing sheet-metal math on the cad
 * surface (closes the coverage-meter "sheet-metal: absent" cad-dispatcher gap). It does NOT reimplement
 * bend math (R8): it DELEGATES to the existing tested engines --
 *   - op "bend_allowance" -> BendAllowanceEngine.calculate (DIN 6935 / K-factor BA, BD, OSSB, springback)
 *   - op "flat_pattern"   -> FlatPatternEngine.calculate    (developed flat length over multi-bend legs)
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw) -- the delegated calculate() calls are wrapped so a downstream throw becomes a structured fail.
 */
import { bendAllowanceEngine, type BendAllowanceResult, type BendMethod } from "./BendAllowanceEngine.js";
import { flatPatternEngine, type FlatPatternResult } from "./FlatPatternEngine.js";

/** Sheet-metal operation kind. */
export type SheetMetalOp = "bend_allowance" | "flat_pattern";

/** Result of a sheet-metal composition (carries the delegated engine's full result). */
export interface SheetMetalResult {
  op: SheetMetalOp;
  success: boolean;
  /** The delegated engine's result (BendAllowanceResult | FlatPatternResult); null on failure. */
  result: BendAllowanceResult | FlatPatternResult | null;
  notes: string[];
}

function fail(op: SheetMetalOp, note: string): SheetMetalResult {
  return { op, success: false, result: null, notes: [note] };
}

/** Sheet-metal composer (delegates to BendAllowanceEngine / FlatPatternEngine). */
export class CADSheetMetalEngine {
  /** Bend allowance / deduction / springback -> BendAllowanceEngine. */
  bendAllowance(params: Record<string, unknown>): SheetMetalResult {
    const t = Number(params.thickness_mm);
    const angle = Number(params.bend_angle_deg);
    const radius = Number(params.inside_radius_mm);
    if (![t, angle, radius].every((v) => Number.isFinite(v))) {
      return fail("bend_allowance", "thickness_mm, bend_angle_deg, inside_radius_mm required + finite");
    }
    if (t <= 0 || radius < 0 || angle <= 0 || angle >= 180) {
      return fail("bend_allowance", "thickness>0, inside_radius>=0, bend_angle in (0,180)");
    }
    try {
      const result = bendAllowanceEngine.calculate({
        material: String(params.material ?? "mild_steel"),
        thickness_mm: t,
        bend_angle_deg: angle,
        inside_radius_mm: radius,
        k_factor: params.k_factor !== undefined ? Number(params.k_factor) : undefined,
        bend_method: String(params.bend_method ?? "air_bend") as BendMethod,
        die_opening_mm: params.die_opening_mm !== undefined ? Number(params.die_opening_mm) : undefined,
      });
      return { op: "bend_allowance", success: true, result, notes: [] };
    } catch (e) {
      return fail("bend_allowance", `delegate failed: ${(e as Error)?.message ?? String(e)}`);
    }
  }

  /** Multi-bend developed flat length -> FlatPatternEngine. */
  flatPattern(params: Record<string, unknown>): SheetMetalResult {
    const legs = Array.isArray(params.leg_lengths_mm) ? (params.leg_lengths_mm as unknown[]).map(Number) : undefined;
    const angles = Array.isArray(params.bend_angles_deg) ? (params.bend_angles_deg as unknown[]).map(Number) : undefined;
    // Require an explicit leg-bend-leg set -- never silently fall back to the engine's [50,30,50]
    // defaults and publish a developed length the caller never described (scrutiny P2).
    if (!legs || legs.length < 2) return fail("flat_pattern", "leg_lengths_mm required (>=2 legs for a bend)");
    if (!legs.every((v) => Number.isFinite(v) && v > 0)) return fail("flat_pattern", "leg_lengths_mm must be positive finite");
    if (angles && !angles.every((v) => Number.isFinite(v))) return fail("flat_pattern", "bend_angles_deg must be finite");
    // Validate the optional physical inputs (mirror the bend_allowance guard) -- a negative thickness /
    // radius otherwise produces a finite-but-nonsense developed length with no warning (scrutiny P2).
    if (params.thickness_mm !== undefined && (!Number.isFinite(Number(params.thickness_mm)) || Number(params.thickness_mm) <= 0)) {
      return fail("flat_pattern", "thickness_mm must be > 0");
    }
    if (params.bend_radius_mm !== undefined && (!Number.isFinite(Number(params.bend_radius_mm)) || Number(params.bend_radius_mm) < 0)) {
      return fail("flat_pattern", "bend_radius_mm must be >= 0");
    }
    try {
      const result = flatPatternEngine.calculate({
        material: params.material as "mild_steel" | "stainless" | "aluminum" | "copper" | "brass" | undefined,
        thickness_mm: params.thickness_mm !== undefined ? Number(params.thickness_mm) : undefined,
        bend_radius_mm: params.bend_radius_mm !== undefined ? Number(params.bend_radius_mm) : undefined,
        leg_lengths_mm: legs,
        bend_angles_deg: angles,
        k_factor_override: params.k_factor_override !== undefined ? Number(params.k_factor_override) : undefined,
      });
      return { op: "flat_pattern", success: true, result, notes: [] };
    } catch (e) {
      return fail("flat_pattern", `delegate failed: ${(e as Error)?.message ?? String(e)}`);
    }
  }

  /** Dispatcher entrypoint: route a params object to the right sheet-metal op. */
  apply(params: Record<string, unknown>): SheetMetalResult {
    const op = String(params.op ?? params.operation ?? params.type ?? "") as SheetMetalOp;
    switch (op) {
      case "bend_allowance": return this.bendAllowance(params);
      case "flat_pattern": return this.flatPattern(params);
      default: return fail("bend_allowance", `unknown sheet-metal op '${op}' (expected bend_allowance|flat_pattern)`);
    }
  }
}

export const cadSheetMetalEngine = new CADSheetMetalEngine();
