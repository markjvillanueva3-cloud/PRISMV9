/**
 * CADReferenceGeometryEngine -- first-class reference/construction geometry for PRISM CAD: datum
 * planes (offset from a base plane), datum axes (through two points), and datum points. Closes the
 * coverage-meter "reference-geometry: absent" gap.
 *
 * Pure geometric construction (no material/physics params): a datum plane carries a base plane +
 * signed offset and emits the CadQuery `.workplane(offset=...)` op; a datum axis carries the unit
 * direction + length between two points; a datum point carries coordinates. These are the anchors
 * other features (holes, pockets, patterns) are positioned against.
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw), units mm.
 */

/** A reference-geometry kind. */
export type DatumKind = "plane" | "axis" | "point";

/** Result of a reference-geometry construction. */
export interface DatumResult {
  datum: DatumKind;
  success: boolean;
  /** Base plane for a datum plane ("XY"|"YZ"|"XZ"); "" for axis/point. */
  base_plane: string;
  /** Signed offset (mm) for a datum plane; 0 otherwise. */
  offset_mm: number;
  /** Unit direction [x,y,z] for an axis; [0,0,0] otherwise. */
  direction: [number, number, number];
  /** Length (mm) between the two axis points; 0 otherwise. */
  length_mm: number;
  /** Point coordinates [x,y,z] for a datum point; [0,0,0] otherwise. */
  point: [number, number, number];
  cadquery_op: string;
  notes: string[];
}

const PLANES = new Set(["XY", "YZ", "XZ"]);

function allFinite(...vals: number[]): boolean {
  return vals.every((v) => typeof v === "number" && Number.isFinite(v));
}

function base(datum: DatumKind): DatumResult {
  return { datum, success: false, base_plane: "", offset_mm: 0, direction: [0, 0, 0], length_mm: 0, point: [0, 0, 0], cadquery_op: "", notes: [] };
}

function fail(datum: DatumKind, note: string): DatumResult {
  const r = base(datum); r.notes = [note]; return r;
}

/** Reference / construction-geometry engine. */
export class CADReferenceGeometryEngine {
  /** Datum plane parallel to `basePlane` (XY|YZ|XZ) at signed `offsetMm`. */
  datumPlane(basePlane: string, offsetMm: number): DatumResult {
    if (!allFinite(offsetMm)) return fail("plane", "non-finite offset");
    const p = String(basePlane || "").toUpperCase();
    if (!PLANES.has(p)) return fail("plane", `base plane must be XY|YZ|XZ (got '${basePlane}')`);
    const r = base("plane"); r.success = true; r.base_plane = p; r.offset_mm = offsetMm;
    r.cadquery_op = `.workplane(offset=${offsetMm})  # datum plane || ${p}`;
    return r;
  }

  /** Datum axis from point p1 to p2 -> unit direction + length (mm). */
  datumAxis(p1: [number, number, number], p2: [number, number, number]): DatumResult {
    if (!Array.isArray(p1) || !Array.isArray(p2) || p1.length !== 3 || p2.length !== 3) return fail("axis", "p1 and p2 must be [x,y,z]");
    if (!allFinite(...p1, ...p2)) return fail("axis", "non-finite point coordinate");
    const d: [number, number, number] = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    const len = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    if (len === 0) return fail("axis", "p1 and p2 are coincident -- axis undefined");
    const dir: [number, number, number] = [d[0] / len, d[1] / len, d[2] / len];
    const r = base("axis"); r.success = true; r.direction = dir; r.length_mm = len;
    r.cadquery_op = `# datum axis (${p1.join(",")})->(${p2.join(",")}), dir=(${dir.map((v) => v.toFixed(4)).join(",")})`;
    return r;
  }

  /** Datum point at [x,y,z] (mm). */
  datumPoint(x: number, y: number, z: number): DatumResult {
    if (!allFinite(x, y, z)) return fail("point", "non-finite coordinate");
    const r = base("point"); r.success = true; r.point = [x, y, z];
    r.cadquery_op = `# datum point (${x}, ${y}, ${z})`;
    return r;
  }

  /** Dispatcher entrypoint: route a params object to the right datum constructor. */
  apply(params: Record<string, unknown>): DatumResult {
    const kind = String(params.kind ?? params.datum ?? "");
    const n = (k: string): number => Number(params[k]);
    const arr = (k: string): [number, number, number] => {
      const v = params[k];
      return Array.isArray(v) ? [Number(v[0]), Number(v[1]), Number(v[2])] : [NaN, NaN, NaN];
    };
    switch (kind) {
      case "plane": return this.datumPlane(String(params.base_plane ?? params.plane ?? ""), n("offset_mm"));
      case "axis": return this.datumAxis(arr("p1"), arr("p2"));
      case "point": return this.datumPoint(n("x"), n("y"), n("z"));
      default: return fail("plane", `unknown datum kind '${kind}' (expected plane|axis|point)`);
    }
  }
}

export const cadReferenceGeometryEngine = new CADReferenceGeometryEngine();
