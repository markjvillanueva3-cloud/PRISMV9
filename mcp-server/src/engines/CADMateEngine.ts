/**
 * CADMateEngine -- first-class assembly MATE constraints for PRISM CAD: coincident / concentric /
 * distance / angle / parallel. Closes the coverage-meter "assembly-mates: absent" gap by computing the
 * resolved constraint descriptor + emitting the CadQuery `Assembly.constrain(...)` op the codegen lane
 * writes (CadQuery assembly constraints: "Plane" for face mates, "Axis" for concentric/angle, with an
 * optional `param` for a distance/angle value, then `.solve()`).
 *
 * Distinct from CADAssemblyGraphEngine (which models the assembly RELATIONSHIP GRAPH, not mate
 * constraints) -- this is the constraint-resolution layer. Pure calc: a mate carries a kind + the
 * relevant scalar (distance_mm for a distance mate, angle_deg for an angle mate); the engine validates
 * it and reports the resolved offset/angle + the constraint op.
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw), units mm / deg.
 */

/** Assembly mate kind. */
export type MateType = "coincident" | "concentric" | "distance" | "angle" | "parallel";

/** Result of a mate-constraint resolution. */
export interface MateResult {
  mate_type: MateType;
  success: boolean;
  /** Resolved linear offset (mm) -- the distance-mate value; 0 for coincident/concentric/parallel. */
  offset_mm: number;
  /** Resolved angle (deg) -- the angle-mate value; 0 for parallel and the non-angular mates. */
  angle_deg: number;
  /** CadQuery constraint kind ("Plane" for face mates, "Axis" for concentric/angle). */
  constraint: string;
  /** CadQuery assembly op the codegen lane emits. */
  cadquery_op: string;
  notes: string[];
}

const MATES = new Set<MateType>(["coincident", "concentric", "distance", "angle", "parallel"]);

function allFinite(...vals: number[]): boolean {
  return vals.every((v) => typeof v === "number" && Number.isFinite(v));
}

function fail(mate: MateType, note: string): MateResult {
  return { mate_type: mate, success: false, offset_mm: 0, angle_deg: 0, constraint: "", cadquery_op: "", notes: [note] };
}

/** Assembly-mate constraint engine. */
export class CADMateEngine {
  // `a`/`b` are the two assembly-component names the codegen substitutes into the CadQuery
  // `Assembly.constrain(a, b, ...)` call; they default to the "solidA"/"solidB" template placeholders
  // when the caller does not name the components (the op is then a clearly-marked template, not a
  // ready-to-run snippet -- the codegen lane fills the real registered component names).
  /** Two faces coincident (flush) -> Plane constraint, zero offset/angle. */
  coincident(a = "solidA", b = "solidB"): MateResult {
    return { mate_type: "coincident", success: true, offset_mm: 0, angle_deg: 0, constraint: "Plane",
      cadquery_op: `.constrain(${a}, ${b}, "Plane")`, notes: [] };
  }

  /** Two cylindrical faces share an axis -> Axis constraint, zero offset/angle. */
  concentric(a = "solidA", b = "solidB"): MateResult {
    return { mate_type: "concentric", success: true, offset_mm: 0, angle_deg: 0, constraint: "Axis",
      cadquery_op: `.constrain(${a}, ${b}, "Axis")`, notes: [] };
  }

  /** Two faces parallel (no contact) -> Plane constraint, angle 0; offset is free (not pinned here). */
  parallel(a = "solidA", b = "solidB"): MateResult {
    return { mate_type: "parallel", success: true, offset_mm: 0, angle_deg: 0, constraint: "Plane",
      cadquery_op: `.constrain(${a}, ${b}, "Plane")  # parallel (angle 0)`, notes: [] };
  }

  /** Two faces a fixed distance apart -> Plane constraint with a distance param (mm). */
  distance(distanceMm: number, a = "solidA", b = "solidB"): MateResult {
    if (!allFinite(distanceMm)) return fail("distance", "non-finite distance");
    if (distanceMm < 0) return fail("distance", "distance must be non-negative");
    return { mate_type: "distance", success: true, offset_mm: distanceMm, angle_deg: 0, constraint: "Plane",
      cadquery_op: `.constrain(${a}, ${b}, "Plane", param=${distanceMm})`, notes: [] };
  }

  /** Two axes/faces at a fixed angle -> Axis constraint with an angle param (deg, 0..180). */
  angle(angleDeg: number, a = "solidA", b = "solidB"): MateResult {
    if (!allFinite(angleDeg)) return fail("angle", "non-finite angle");
    if (angleDeg <= 0 || angleDeg >= 180) return fail("angle", "angle must be in (0,180) deg");
    return { mate_type: "angle", success: true, offset_mm: 0, angle_deg: angleDeg, constraint: "Axis",
      cadquery_op: `.constrain(${a}, ${b}, "Axis", param=${angleDeg})`, notes: [] };
  }

  /** Dispatcher entrypoint: route a params object to the right mate constructor. */
  apply(params: Record<string, unknown>): MateResult {
    const mate = String(params.mate_type ?? params.mate ?? params.type ?? "") as MateType;
    if (!MATES.has(mate)) return fail("coincident", `unknown mate '${mate}' (expected coincident|concentric|distance|angle|parallel)`);
    // optional component names -> substituted into the constraint op (default placeholders otherwise)
    const a = typeof params.solid_a === "string" && params.solid_a ? params.solid_a : "solidA";
    const b = typeof params.solid_b === "string" && params.solid_b ? params.solid_b : "solidB";
    switch (mate) {
      case "coincident": return this.coincident(a, b);
      case "concentric": return this.concentric(a, b);
      case "parallel": return this.parallel(a, b);
      case "distance": return this.distance(Number(params.distance_mm), a, b);
      case "angle": return this.angle(Number(params.angle_deg), a, b);
      default: return fail("coincident", `unhandled mate '${mate}'`);
    }
  }
}

export const cadMateEngine = new CADMateEngine();
