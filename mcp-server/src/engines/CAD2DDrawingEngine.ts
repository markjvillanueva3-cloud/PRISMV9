/**
 * CAD2DDrawingEngine -- generate an orthographic 2D drawing LAYOUT from a 3D model (model -> 2D ortho
 * views). Closes the coverage-meter "2d-drawing" GENERATION gap and feeds T3 print-gen. Distinct from
 * the existing cad_drawing_2d_* EXTRACTION actions (Drawing2DExtractionEngine reads DXF/DWG entities);
 * this PROJECTS a solid to the three standard views and lays them out per the projection standard.
 *
 * Standard view placement (geometry-first; cite the standard exactly, delta soul):
 *   - third_angle (ASME Y14.3, US):  TOP view ABOVE the front view, RIGHT-side view to the RIGHT.
 *   - first_angle (ISO 128, EU):     TOP view BELOW the front view, RIGHT-side view to the LEFT.
 * The front view sits at the origin; top/right are offset by the view spacing. The sign of the offset
 * is the only thing the projection standard changes (+ for third-angle, - for first-angle).
 *
 * Overlap clearance (U-CAD-2D-DRAWING-HARDEN): when the part bounding box is known, the per-axis
 * center-to-center spacing must clear the adjacent view half-extents plus a white-space gap --
 *   front<->top   (vertical):   spacing_y >= Z/2 + Y/2 + gap   (front height Z, top height Y)
 *   front<->right (horizontal): spacing_x >= X/2 + Y/2 + gap   (front width X, right width Y)
 * A requested spacing below the minimum is RAISED (never silently overlapped) with a loud note and
 * `spacing_adjusted: true`. Degenerate geometry (zero/negative/non-finite extent) is a structured
 * failure -- a zero-extent solid cannot be projected to 3 meaningful orthographic views.
 *
 * Units (UNITS FIRST, [[feedback_check_units_first]]): the engine core is mm. `apply()` accepts a
 * declared `units` ("mm" | "in"/"inch"); inch input is converted via the canonical INCH_TO_MM
 * (physics/unit-conversions.ts, NIST SP 811) and the conversion is recorded in `notes`. Mixing
 * `units:"inch"` with `*_mm`-suffixed params is a structured failure -- never silently mix.
 *
 * PMI (delta soul refuse: dropping-pmi-data-on-import): this is a LAYOUT engine -- it does not place
 * dimension/GD&T callouts. PMI-ish inputs (pmi/gdt/dimensions/...) are surfaced in
 * `unplaced_pmi_keys` + a note so they are never dropped silently, and never heuristic-filled.
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw), units mm.
 */

import { INCH_TO_MM } from "../physics/unit-conversions.js";

/** Projection convention. */
export type DrawingProjection = "first_angle" | "third_angle";

/** A placed orthographic view. */
export interface DrawingView {
  name: "front" | "top" | "right";
  x_mm: number;
  y_mm: number;
  /** View direction (the axis the camera looks ALONG to produce this view). */
  view_dir: string;
  /** Paper extents of the view outline -- present only when the part bounding box is known. */
  width_mm?: number;
  height_mm?: number;
}

/** Result of an orthographic-drawing layout. */
export interface DrawingResult {
  projection: DrawingProjection;
  success: boolean;
  views: DrawingView[];
  cadquery_op: string;
  notes: string[];
  /** True when a requested spacing was raised to clear view overlap (a note names the axis + numbers). */
  spacing_adjusted?: boolean;
  /** PMI/dimension input keys this layout engine does NOT place -- surfaced, never dropped silently. */
  unplaced_pmi_keys?: string[];
}

/** Optional geometry-aware layout inputs (all mm). */
export interface OrthoViewOpts {
  /** Part bounding box extents, mm: x = width, y = depth, z = height. */
  partSizeMm?: { x: number; y: number; z: number };
  /** Minimum white-space gap between adjacent view outlines, mm (default DEFAULT_VIEW_GAP_MM). */
  minGapMm?: number;
}

const PROJECTIONS = new Set<DrawingProjection>(["first_angle", "third_angle"]);

/**
 * House layout default: ~25 mm (~1 in) minimum white space between adjacent view outlines --
 * common drafting practice, NOT an ISO/ASME-mandated value. Override via `minGapMm` / `min_gap_mm`.
 */
const DEFAULT_VIEW_GAP_MM = 25;

/** Params keys that carry PMI/dimension data this layout engine cannot place (surface, never drop). */
const PMI_PARAM_KEYS = ["pmi", "gdt", "dimensions", "annotations", "callouts", "tolerances", "datums"] as const;

function fail(projection: DrawingProjection, note: string): DrawingResult {
  return { projection, success: false, views: [], cadquery_op: "", notes: [note] };
}

/** Present-and-non-empty check for PMI passthrough params. */
function carriesData(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
  return v !== "" && v !== false;
}

/** Orthographic 2D-drawing layout engine. */
export class CAD2DDrawingEngine {
  /**
   * Lay out the three standard orthographic views (front/top/right) at `spacingMm`. The projection
   * standard sets only the OFFSET SIGN: third-angle places top above (+y) and right to the right (+x);
   * first-angle places top below (-y) and right to the left (-x).
   *
   * @param projection first_angle (ISO 128) | third_angle (ASME Y14.3)
   * @param spacingMm  requested center-to-center view spacing, mm (> 0, finite)
   * @param opts       optional part bounding box + white-space gap (mm) for overlap clearance
   * @returns typed DrawingResult; edge cases return structured {success:false}, never throw
   */
  orthoViews(projection: DrawingProjection, spacingMm: number, opts: OrthoViewOpts = {}): DrawingResult {
    if (!PROJECTIONS.has(projection)) return fail("third_angle", `unknown projection '${projection}' (expected first_angle|third_angle)`);
    if (typeof spacingMm !== "number" || !Number.isFinite(spacingMm)) return fail(projection, "non-finite view_spacing_mm");
    if (spacingMm <= 0) return fail(projection, "view_spacing_mm must be > 0");

    const gap = opts.minGapMm ?? DEFAULT_VIEW_GAP_MM;
    if (typeof gap !== "number" || !Number.isFinite(gap) || gap < 0) return fail(projection, "min_gap_mm must be a finite number >= 0");

    // Degenerate-geometry guard: every extent must be a finite positive length or the projection is
    // meaningless (zero-thickness plate / single point / NaN import). Fail loud, never emit NaN coords.
    const size = opts.partSizeMm;
    if (size !== undefined) {
      for (const axis of ["x", "y", "z"] as const) {
        const v = size[axis];
        if (typeof v !== "number" || !Number.isFinite(v)) return fail(projection, `non-finite part_size_mm.${axis} (${String(v)})`);
        if (v <= 0) return fail(projection, `degenerate part_size_mm.${axis}=${v} -- zero/negative extent cannot be projected to 3 orthographic views`);
      }
    }

    const notes: string[] = [];
    let spacing_adjusted = false;
    // Per-axis spacing: raised (never silently overlapped) when the part extents would collide.
    // front view = X wide x Z tall; top view = X wide x Y tall; right view = Y wide x Z tall.
    let spacingX = spacingMm;
    let spacingY = spacingMm;
    if (size) {
      const minX = size.x / 2 + size.y / 2 + gap; // front<->right horizontal clearance
      const minY = size.z / 2 + size.y / 2 + gap; // front<->top vertical clearance
      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return fail(projection, "clearance overflow: part extents + gap exceed representable spacing (non-finite minimum)");
      if (spacingX < minX) {
        spacingX = minX;
        spacing_adjusted = true;
        notes.push(`view overlap: requested spacing ${spacingMm}mm < front<->right minimum ${minX}mm (X/2 + Y/2 + ${gap}mm gap) -- raised to ${minX}mm`);
      }
      if (spacingY < minY) {
        spacingY = minY;
        spacing_adjusted = true;
        notes.push(`view overlap: requested spacing ${spacingMm}mm < front<->top minimum ${minY}mm (Z/2 + Y/2 + ${gap}mm gap) -- raised to ${minY}mm`);
      }
    }

    const sign = projection === "third_angle" ? 1 : -1;
    const offX = sign * spacingX;
    const offY = sign * spacingY;
    const views: DrawingView[] = [
      { name: "front", x_mm: 0, y_mm: 0, view_dir: "-Y" },   // look along -Y at the XZ plane
      { name: "top", x_mm: 0, y_mm: offY, view_dir: "-Z" },  // 3rd: above (+y) / 1st: below (-y)
      { name: "right", x_mm: offX, y_mm: 0, view_dir: "-X" },// 3rd: right (+x) / 1st: left (-x)
    ];
    if (size) {
      views[0].width_mm = size.x; views[0].height_mm = size.z; // front: XZ
      views[1].width_mm = size.x; views[1].height_mm = size.y; // top: XY
      views[2].width_mm = size.y; views[2].height_mm = size.z; // right: YZ
    }
    return {
      projection, success: true, views,
      cadquery_op: `# ortho drawing (${projection}): front@(0,0), top@(0,${offY}), right@(${offX},0) -- project solid via .section()/exporters SVG per view_dir`,
      notes,
      ...(spacing_adjusted ? { spacing_adjusted } : {}),
    };
  }

  /**
   * Dispatcher entrypoint: route a params object to the drawing generator.
   *
   * Units contract (UNITS FIRST): `units` defaults to "mm". With units="in"/"inch", use the
   * UNSUFFIXED fields (`view_spacing`, `part_size`, `min_gap`) -- passing any `*_mm` field alongside
   * inch units is a structured failure (never silently mix). Unsuffixed fields also work in mm.
   * Passing BOTH the suffixed and unsuffixed twin of a field is ambiguous -> structured failure.
   *
   * @param params dispatcher params (see cad2DDrawingSchema)
   * @returns typed DrawingResult; all invalid inputs return structured {success:false}, never throw
   */
  apply(params: Record<string, unknown>): DrawingResult {
    const op = String(params.op ?? params.operation ?? params.type ?? "ortho_views");
    if (op !== "ortho_views") return this.surfacePmi(params, fail("third_angle", `unknown drawing op '${op}' (expected ortho_views)`));
    const projection = String(params.projection ?? "third_angle") as DrawingProjection;

    // ---- UNITS FIRST: resolve declared units before touching any length ----
    const unitsRaw = String(params.units ?? params.unit ?? "mm").toLowerCase();
    const isInch = unitsRaw === "in" || unitsRaw === "inch" || unitsRaw === "inches";
    if (!isInch && unitsRaw !== "mm") {
      return this.surfacePmi(params, fail(projection, `unknown units '${unitsRaw}' (expected mm|in|inch) -- units must be declared, never assumed`));
    }
    if (isInch && (params.view_spacing_mm !== undefined || params.part_size_mm !== undefined || params.min_gap_mm !== undefined)) {
      return this.surfacePmi(params, fail(projection, "mixed units: units='inch' with *_mm params -- use view_spacing/part_size/min_gap (interpreted in inch) or declare units='mm'"));
    }
    for (const [plain, suffixed] of [["view_spacing", "view_spacing_mm"], ["part_size", "part_size_mm"], ["min_gap", "min_gap_mm"]] as const) {
      if (params[plain] !== undefined && params[suffixed] !== undefined) {
        return this.surfacePmi(params, fail(projection, `ambiguous input: both ${plain} and ${suffixed} given -- pass exactly one`));
      }
    }
    const scale = isInch ? INCH_TO_MM : 1;

    const spacingRaw = params.view_spacing ?? params.view_spacing_mm;
    const spacing = spacingRaw !== undefined ? Number(spacingRaw) * scale : 100;

    const sizeRaw = params.part_size ?? params.part_size_mm;
    let partSizeMm: OrthoViewOpts["partSizeMm"];
    if (sizeRaw !== undefined) {
      if (typeof sizeRaw !== "object" || sizeRaw === null || Array.isArray(sizeRaw)) {
        return this.surfacePmi(params, fail(projection, "part_size must be an object {x,y,z} (bounding-box extents)"));
      }
      const s = sizeRaw as Record<string, unknown>;
      partSizeMm = { x: Number(s.x) * scale, y: Number(s.y) * scale, z: Number(s.z) * scale };
    }

    const gapRaw = params.min_gap ?? params.min_gap_mm;
    const minGapMm = gapRaw !== undefined ? Number(gapRaw) * scale : undefined;

    const result = this.orthoViews(projection, spacing, { partSizeMm, minGapMm });
    if (result.success && isInch) {
      result.notes.push(`inch input converted to mm at ${INCH_TO_MM} mm/in (NIST SP 811, canonical physics/unit-conversions.ts); output coordinates are mm`);
    }
    return this.surfacePmi(params, result);
  }

  /**
   * Surface PMI-ish inputs this layout engine cannot place (refuse-list: dropping-pmi-data-on-import).
   * Adds `unplaced_pmi_keys` + a loud note; never drops silently, never heuristic-fills.
   */
  private surfacePmi(params: Record<string, unknown>, result: DrawingResult): DrawingResult {
    const keys = PMI_PARAM_KEYS.filter((k) => carriesData(params[k]));
    if (keys.length > 0) {
      result.unplaced_pmi_keys = [...keys];
      result.notes.push(`PMI/dimension inputs [${keys.join(", ")}] are NOT placed by cad_drawing_generate (layout-only) -- carry them to the annotation stage; surfaced here so they are never dropped silently`);
    }
    return result;
  }
}

export const cad2DDrawingEngine = new CAD2DDrawingEngine();
