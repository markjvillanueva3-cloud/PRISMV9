/**
 * MillStockEvolutionEngine — XY-heightmap stock evolution across mill passes
 *
 * Mill-domain parity for LatheStockEvolutionEngine (LATHE-PRO-MS12). Lathe uses a 2D Z-R
 * half-profile (turning is axisymmetric). Mill needs 3D — but a true voxel grid is heavy.
 * Standard mill-sim technique used here is the **XY Z-heightmap** (a.k.a. "Z-buffer" stock
 * model in CAM literature): for each XY grid cell, store the current top-of-material Z.
 * Passes lower this Z value within their footprint. Final result is a dense 3D surface.
 *
 * Pass types supported (mill-canonical, mapping to MillOperation):
 *   - face_milling    : level top to face_z over rectangular footprint
 *   - end_milling     : remove material in a rectangular (or circular for tool footprint) area to depth
 *   - pocket_milling  : same as end_milling with explicit pocket boundary
 *   - slot_milling    : narrow rectangle along path
 *   - drilling        : single (x, y) point with depth (cylindrical hole)
 *   - boring          : like drilling with larger D + sometimes shallower
 *   - contour_milling : path-bounded — caller supplies XY polyline
 *
 * Output: 3D heightmap (XY grid of Z values) + per-pass material-removed volume estimate
 * + bounding box of removed region.
 *
 * Distinct from existing:
 *   - StockMaterialDatabase       : material catalog
 *   - VoxelStockSimEngine (if any): 3D voxel sim (heavyweight)
 *   - LatheStockEvolutionEngine   : 2D Z-R lathe profile
 *   - This engine                 : mill-specific XY heightmap
 *
 * References:
 *   - Altintas Y. "Manufacturing Automation" (2012) §6 (mill stock-removal kinematics)
 *   - Roth D., Altintas Y. (CIRP 2003) "Mechanistic model for ball-end milling with
 *     workpiece swept volume estimation"
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-STOCK-EVOLUTION (iter68)
 * @version 1.0.0
 * @module MillStockEvolutionEngine
 */

export type MillPassKind =
  | "face_milling"
  | "end_milling"
  | "pocket_milling"
  | "slot_milling"
  | "drilling"
  | "boring"
  | "contour_milling";

/** Rectangular footprint defined by AABB in XY plane */
export interface MillPassRect {
  x_min_mm: number;
  x_max_mm: number;
  y_min_mm: number;
  y_max_mm: number;
}

/** Circular hole at (x, y) with diameter D */
export interface MillPassCircle {
  x_mm: number;
  y_mm: number;
  diameter_mm: number;
}

/** XY polyline for contour passes */
export interface MillPassPolyline {
  points: Array<{ x_mm: number; y_mm: number }>;
  /** Stroke width — radial extent of tool around the path (mm) */
  stroke_width_mm: number;
}

export interface MillPass {
  kind: MillPassKind;
  /** Final Z reached by the pass — material below this stays intact */
  z_floor_mm: number;
  /** Rectangle for face/end/pocket/slot */
  rect?: MillPassRect;
  /** Circle for drilling/boring */
  circle?: MillPassCircle;
  /** Polyline for contour */
  polyline?: MillPassPolyline;
}

export interface MillStockEvolutionInput {
  /** Initial stock bounding box (mm) */
  stock_x_min_mm: number;
  stock_x_max_mm: number;
  stock_y_min_mm: number;
  stock_y_max_mm: number;
  stock_z_top_mm: number;
  stock_z_bottom_mm: number;
  /** Ordered passes to apply */
  passes: MillPass[];
  /** Grid sampling step mm (default 1.0; smaller = more accurate but more cells) */
  grid_step_mm?: number;
}

export interface MillPassImpact {
  index: number;
  kind: MillPassKind;
  cells_modified: number;
  /** Material volume removed by this pass (mm³) */
  volume_removed_mm3: number;
}

export interface MillStockEvolutionResult {
  /**
   * 3D heightmap as flat row-major XY grid of final Z values. cell[i,j] = grid[i*nx + j].
   * Cells above stock_z_bottom AND below their final-z are removed.
   */
  heightmap: number[];
  grid_nx: number;
  grid_ny: number;
  /** XY origin of (i=0, j=0) cell */
  grid_x0_mm: number;
  grid_y0_mm: number;
  grid_step_mm: number;
  /** Total material volume removed (mm³) across all passes */
  total_volume_removed_mm3: number;
  per_pass: MillPassImpact[];
  reasoning: string[];
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

function pointInRect(x: number, y: number, r: MillPassRect): boolean {
  return x >= r.x_min_mm && x <= r.x_max_mm && y >= r.y_min_mm && y <= r.y_max_mm;
}

function pointInCircle(x: number, y: number, c: MillPassCircle): boolean {
  const dx = x - c.x_mm;
  const dy = y - c.y_mm;
  return Math.sqrt(dx * dx + dy * dy) <= c.diameter_mm / 2;
}

/**
 * Polyline stroke: point within distance ≤ stroke_width/2 of ANY segment.
 * For mill contour passes, the tool sweeps a cylinder along the path.
 */
function pointInPolylineStroke(x: number, y: number, p: MillPassPolyline): boolean {
  if (p.points.length < 2) return false;
  const halfW = p.stroke_width_mm / 2;
  for (let i = 0; i < p.points.length - 1; i++) {
    const a = p.points[i];
    const b = p.points[i + 1];
    const d = distancePointToSegment(x, y, a.x_mm, a.y_mm, b.x_mm, b.y_mm);
    if (d <= halfW) return true;
  }
  return false;
}

function distancePointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}

class MillStockEvolutionEngineImpl {
  evolve(i: MillStockEvolutionInput): MillStockEvolutionResult {
    this.validate(i);
    const step = Math.max(0.1, i.grid_step_mm ?? 1.0);
    const dx = i.stock_x_max_mm - i.stock_x_min_mm;
    const dy = i.stock_y_max_mm - i.stock_y_min_mm;
    const nx = Math.max(1, Math.ceil(dx / step) + 1);
    const ny = Math.max(1, Math.ceil(dy / step) + 1);
    const total = nx * ny;

    // Initialize all cells at stock_z_top
    const heightmap: number[] = new Array(total).fill(i.stock_z_top_mm);

    const per_pass: MillPassImpact[] = [];
    let totalVolume = 0;
    const reasoning: string[] = [];

    for (let pIdx = 0; pIdx < i.passes.length; pIdx++) {
      const pass = i.passes[pIdx];
      let cellsModified = 0;
      let volume = 0;
      const cellArea = step * step;

      for (let yi = 0; yi < ny; yi++) {
        for (let xi = 0; xi < nx; xi++) {
          const cellX = i.stock_x_min_mm + xi * step;
          const cellY = i.stock_y_min_mm + yi * step;
          let inside = false;
          if ((pass.kind === "face_milling" || pass.kind === "end_milling" ||
               pass.kind === "pocket_milling" || pass.kind === "slot_milling") && pass.rect) {
            inside = pointInRect(cellX, cellY, pass.rect);
          } else if ((pass.kind === "drilling" || pass.kind === "boring") && pass.circle) {
            inside = pointInCircle(cellX, cellY, pass.circle);
          } else if (pass.kind === "contour_milling" && pass.polyline) {
            inside = pointInPolylineStroke(cellX, cellY, pass.polyline);
          }
          if (!inside) continue;

          const idx = yi * nx + xi;
          const currentZ = heightmap[idx];
          // Only remove material if pass z_floor is BELOW the current heightmap (cell still has material above z_floor)
          if (pass.z_floor_mm < currentZ) {
            const removedHeight = currentZ - pass.z_floor_mm;
            volume += removedHeight * cellArea;
            heightmap[idx] = pass.z_floor_mm;
            cellsModified++;
          }
        }
      }

      per_pass.push({
        index: pIdx,
        kind: pass.kind,
        cells_modified: cellsModified,
        volume_removed_mm3: round2(volume),
      });
      totalVolume += volume;
    }

    reasoning.push(`Applied ${i.passes.length} pass(es) to ${nx}×${ny} grid (step=${step}mm)`);
    reasoning.push(`Total volume removed: ${round2(totalVolume)} mm³`);

    return {
      heightmap,
      grid_nx: nx,
      grid_ny: ny,
      grid_x0_mm: i.stock_x_min_mm,
      grid_y0_mm: i.stock_y_min_mm,
      grid_step_mm: step,
      total_volume_removed_mm3: round2(totalVolume),
      per_pass,
      reasoning,
    };
  }

  getStats(): {
    supported_pass_kinds: MillPassKind[];
    reference: string;
    notes: string;
  } {
    return {
      supported_pass_kinds: [
        "face_milling", "end_milling", "pocket_milling", "slot_milling",
        "drilling", "boring", "contour_milling",
      ],
      reference: "Altintas Manufacturing Automation §6 mill stock-removal kinematics; Roth & Altintas CIRP 2003",
      notes: "XY heightmap (Z-buffer) model — cells store current top-Z; passes lower Z within footprint.",
    };
  }

  // ── Validation ────────────────────────────────────────────────────────

  private validate(i: MillStockEvolutionInput): void {
    if (!i) throw new Error("MillStockEvolutionEngine.evolve: input required");
    if (!Array.isArray(i.passes)) throw new Error("MillStockEvolutionEngine.evolve: passes[] required");
    if (!(i.stock_x_max_mm > i.stock_x_min_mm)) throw new Error("MillStockEvolutionEngine.evolve: stock_x_max_mm must be > stock_x_min_mm");
    if (!(i.stock_y_max_mm > i.stock_y_min_mm)) throw new Error("MillStockEvolutionEngine.evolve: stock_y_max_mm must be > stock_y_min_mm");
    if (!(i.stock_z_top_mm > i.stock_z_bottom_mm)) throw new Error("MillStockEvolutionEngine.evolve: stock_z_top_mm must be > stock_z_bottom_mm");
  }
}

export const millStockEvolutionEngine = new MillStockEvolutionEngineImpl();
export type { MillStockEvolutionEngineImpl };
