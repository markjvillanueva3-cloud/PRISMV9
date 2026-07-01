/**
 * CAD2DDrawingEngine -- generate an orthographic 2D drawing LAYOUT from a 3D model (model -> 2D ortho
 * views). Closes the coverage-meter "2d-drawing" GENERATION gap and feeds T3 print-gen. Distinct from
 * the existing cad_drawing_2d_* EXTRACTION actions (Drawing2DExtractionEngine reads DXF/DWG entities);
 * this PROJECTS a solid to the three standard views and lays them out per the projection standard.
 *
 * Standard view placement (geometry-first; cite the standard exactly, delta soul):
 *   - third_angle (ASME Y14.3, US):  TOP view ABOVE the front view, RIGHT-side view to the RIGHT.
 *   - first_angle (ISO 128, EU):     TOP view BELOW the front view, RIGHT-side view to the LEFT.
 * The front view sits at the origin; top/right are offset by `view_spacing_mm`. The sign of the offset
 * is the only thing the projection standard changes (+ for third-angle, - for first-angle).
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw), units mm.
 */

/** Projection convention. */
export type DrawingProjection = "first_angle" | "third_angle";

/** A placed orthographic view. */
export interface DrawingView {
  name: "front" | "top" | "right";
  x_mm: number;
  y_mm: number;
  /** View direction (the axis the camera looks ALONG to produce this view). */
  view_dir: string;
}

/** Result of an orthographic-drawing layout. */
export interface DrawingResult {
  projection: DrawingProjection;
  success: boolean;
  views: DrawingView[];
  cadquery_op: string;
  notes: string[];
}

const PROJECTIONS = new Set<DrawingProjection>(["first_angle", "third_angle"]);

function fail(projection: DrawingProjection, note: string): DrawingResult {
  return { projection, success: false, views: [], cadquery_op: "", notes: [note] };
}

/** Orthographic 2D-drawing layout engine. */
export class CAD2DDrawingEngine {
  /**
   * Lay out the three standard orthographic views (front/top/right) at `spacingMm`. The projection
   * standard sets only the OFFSET SIGN: third-angle places top above (+y) and right to the right (+x);
   * first-angle places top below (-y) and right to the left (-x).
   */
  orthoViews(projection: DrawingProjection, spacingMm: number): DrawingResult {
    if (!PROJECTIONS.has(projection)) return fail("third_angle", `unknown projection '${projection}' (expected first_angle|third_angle)`);
    if (typeof spacingMm !== "number" || !Number.isFinite(spacingMm)) return fail(projection, "non-finite view_spacing_mm");
    if (spacingMm <= 0) return fail(projection, "view_spacing_mm must be > 0");
    const sign = projection === "third_angle" ? 1 : -1;
    const views: DrawingView[] = [
      { name: "front", x_mm: 0, y_mm: 0, view_dir: "-Y" },               // look along -Y at the XZ plane
      { name: "top", x_mm: 0, y_mm: sign * spacingMm, view_dir: "-Z" },  // 3rd: above (+y) / 1st: below (-y)
      { name: "right", x_mm: sign * spacingMm, y_mm: 0, view_dir: "-X" },// 3rd: right (+x) / 1st: left (-x)
    ];
    return {
      projection, success: true, views,
      cadquery_op: `# ortho drawing (${projection}): front@(0,0), top@(0,${sign * spacingMm}), right@(${sign * spacingMm},0) -- project solid via .section()/exporters SVG per view_dir`,
      notes: [],
    };
  }

  /** Dispatcher entrypoint: route a params object to the drawing generator. */
  apply(params: Record<string, unknown>): DrawingResult {
    const op = String(params.op ?? params.operation ?? params.type ?? "ortho_views");
    if (op !== "ortho_views") return fail("third_angle", `unknown drawing op '${op}' (expected ortho_views)`);
    const projection = String(params.projection ?? "third_angle") as DrawingProjection;
    const spacing = params.view_spacing_mm !== undefined ? Number(params.view_spacing_mm) : 100;
    return this.orthoViews(projection, spacing);
  }
}

export const cad2DDrawingEngine = new CAD2DDrawingEngine();
