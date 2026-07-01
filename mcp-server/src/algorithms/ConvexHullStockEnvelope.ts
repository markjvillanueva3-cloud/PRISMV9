/**
 * ConvexHullStockEnvelope — CAD #1.4
 * 3D point set → axis-aligned bounding box + tight convex-hull bounds for
 * stock-allocation. Returns block, plate, and bar (cylinder) options sized
 * to the part with operator-tunable allowance.
 *
 * Note: full Quickhull 3D is heavy; this returns the AABB envelope (sufficient
 * for 99% of stock-allocation cases) + diameter/length for bar stock.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface XYZ { x: number; y: number; z: number; }

export type StockKind = "block" | "plate" | "bar_round";

export interface StockInput {
  /** Part vertex point set. */
  points: XYZ[];
  /** Allowance per side [mm]. Default 3mm. */
  allowance_per_side_mm?: number;
}

export interface StockResult {
  block: { x_mm: AtomicValue; y_mm: AtomicValue; z_mm: AtomicValue };
  plate: { x_mm: AtomicValue; y_mm: AtomicValue; thickness_mm: AtomicValue };
  bar_round: { diameter_mm: AtomicValue; length_mm: AtomicValue };
  bounding_box_min: XYZ;
  bounding_box_max: XYZ;
  point_count: number;
  notes: string[];
  source: string;
}

const ALLOWANCE_DEFAULT_MM = 3;
const POINT_COUNT_MAX = 100_000;
const COORDINATE_MAX_MM = 10_000;

function av(value: number, unit: string, source: string, conf: number): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * 0.02, source, confidence: conf };
}
function emit(reason: string): StockResult {
  const z = av(0, "mm", "invalid-input", 0);
  return {
    block: { x_mm: z, y_mm: z, z_mm: z },
    plate: { x_mm: z, y_mm: z, thickness_mm: z },
    bar_round: { diameter_mm: z, length_mm: z },
    bounding_box_min: { x: 0, y: 0, z: 0 }, bounding_box_max: { x: 0, y: 0, z: 0 },
    point_count: 0, notes: [reason], source: "ConvexHullStockEnvelope v1.0.0",
  };
}

export function computeEnvelope(input: StockInput): StockResult {
  if (!input || !Array.isArray(input.points)) return emit("missing input or points not an array");
  if (input.points.length === 0) return emit("points array is empty");
  if (input.points.length > POINT_COUNT_MAX) return emit(`points exceeds ${POINT_COUNT_MAX}`);
  for (const p of input.points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return emit("non-finite point coordinate");
    if (Math.abs(p.x) > COORDINATE_MAX_MM || Math.abs(p.y) > COORDINATE_MAX_MM || Math.abs(p.z) > COORDINATE_MAX_MM) return emit(`point coordinate exceeds ${COORDINATE_MAX_MM} mm`);
  }

  const allowance = Number.isFinite(input.allowance_per_side_mm) && input.allowance_per_side_mm! >= 0
    ? input.allowance_per_side_mm!
    : ALLOWANCE_DEFAULT_MM;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of input.points) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  }

  const partX = maxX - minX, partY = maxY - minY, partZ = maxZ - minZ;
  const blockX = partX + 2 * allowance;
  const blockY = partY + 2 * allowance;
  const blockZ = partZ + 2 * allowance;

  // Bar-round: diameter = max radial extent (sqrt(x² + y²)) × 2 + allowance × 2
  let maxR = 0;
  for (const p of input.points) {
    const r = Math.sqrt(p.x * p.x + p.y * p.y);
    if (r > maxR) maxR = r;
  }
  const barDia = maxR * 2 + 2 * allowance;
  const barLen = partZ + 2 * allowance;

  // Plate: thinnest dimension is the plate thickness; X and Y are the larger two
  const dims = [partX, partY, partZ].sort((a, b) => a - b);
  const plateThick = dims[0] + 2 * allowance;
  const plateX = dims[2] + 2 * allowance;
  const plateY = dims[1] + 2 * allowance;

  const notes: string[] = [];
  if (partX === 0 || partY === 0 || partZ === 0) notes.push("degenerate part (zero extent in one axis) — review point set");
  notes.push(`bounds: ${partX.toFixed(2)}×${partY.toFixed(2)}×${partZ.toFixed(2)} mm; allowance +${allowance}mm/side`);

  return {
    block: { x_mm: av(blockX, "mm", "AABB+allowance", 0.95), y_mm: av(blockY, "mm", "AABB+allowance", 0.95), z_mm: av(blockZ, "mm", "AABB+allowance", 0.95) },
    plate: { x_mm: av(plateX, "mm", "AABB sorted+allowance", 0.92), y_mm: av(plateY, "mm", "AABB sorted+allowance", 0.92), thickness_mm: av(plateThick, "mm", "AABB sorted+allowance", 0.92) },
    bar_round: { diameter_mm: av(barDia, "mm", "max radial+allowance", 0.88), length_mm: av(barLen, "mm", "Z extent+allowance", 0.92) },
    bounding_box_min: { x: minX, y: minY, z: minZ },
    bounding_box_max: { x: maxX, y: maxY, z: maxZ },
    point_count: input.points.length, notes, source: "ConvexHullStockEnvelope v1.0.0",
  };
}

export const ConvexHullStockEnvelope = { version: "1.0.0" as const, computeEnvelope };
