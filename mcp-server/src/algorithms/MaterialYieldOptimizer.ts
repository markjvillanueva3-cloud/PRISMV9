/**
 * MaterialYieldOptimizer — Business/ERP #7.6
 * Bar / plate / sheet stock yield heuristic. Given part envelope + stock form,
 * computes nesting parts per stock + waste fraction + cost-per-part-material.
 * 1D for bar (length-based), 2D for plate/sheet (shelf-pack heuristic).
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export type StockForm = "bar_round" | "plate" | "sheet";

export interface MaterialYieldInput {
  stock_form: StockForm;
  /** Part envelope dimensions [mm]. For bar: only length used; plate/sheet: x,y used. */
  part_x_mm: number;
  part_y_mm: number;
  part_z_mm: number;
  /** Stock dimensions [mm]. */
  stock_x_mm: number;
  stock_y_mm: number;
  stock_z_mm: number;
  /** Cutoff loss per part [mm]. Default 5mm (kerf + part-off allowance). */
  cutoff_loss_mm?: number;
  /** Stock material cost per kg [USD]. */
  cost_per_kg_usd: number;
  /** Material density [g/cm³]. Default 7.85 (steel). */
  density_g_cm3?: number;
}

export interface MaterialYieldResult {
  parts_per_stock: AtomicValue;
  waste_pct: AtomicValue;
  stock_cost_usd: AtomicValue;
  cost_per_part_usd: AtomicValue;
  notes: string[];
  source: string;
}

const CUTOFF_DEFAULT_MM = 5;
const DENSITY_STEEL = 7.85;
const DIMENSION_MAX_MM = 10000;
const COST_PER_KG_MAX = 10000;
const VALID_FORMS = new Set(["bar_round", "plate", "sheet"]);

function av(v: number, unit: string, source: string, conf: number): AtomicValue {
  return { value: v, unit, uncertainty: Math.abs(v) * 0.05, source, confidence: conf };
}
function emit(reason: string): MaterialYieldResult {
  const z = av(0, "", "invalid-input", 0);
  return { parts_per_stock: { ...z, unit: "parts" }, waste_pct: { ...z, unit: "%" }, stock_cost_usd: { ...z, unit: "USD" }, cost_per_part_usd: { ...z, unit: "USD" }, notes: [reason], source: "MaterialYieldOptimizer v1.0.0" };
}

export function optimize(input: MaterialYieldInput): MaterialYieldResult {
  if (!input) return emit("missing input");
  if (!VALID_FORMS.has(input.stock_form)) return emit(`unknown stock_form: ${input.stock_form}`);
  const dims = [input.part_x_mm, input.part_y_mm, input.part_z_mm, input.stock_x_mm, input.stock_y_mm, input.stock_z_mm];
  for (const d of dims) {
    if (!Number.isFinite(d) || d <= 0 || d > DIMENSION_MAX_MM) return emit(`dimension outside (0, ${DIMENSION_MAX_MM}]`);
  }
  if (!Number.isFinite(input.cost_per_kg_usd) || input.cost_per_kg_usd <= 0 || input.cost_per_kg_usd > COST_PER_KG_MAX) return emit(`cost_per_kg_usd outside (0, ${COST_PER_KG_MAX}]`);

  const cutoff = Math.max(0, Number.isFinite(input.cutoff_loss_mm) ? input.cutoff_loss_mm! : CUTOFF_DEFAULT_MM);
  const density = Number.isFinite(input.density_g_cm3) ? Math.max(0.1, input.density_g_cm3!) : DENSITY_STEEL;

  let partsPerStock = 0;
  let partVolMm3 = 0;
  let stockVolMm3 = 0;

  if (input.stock_form === "bar_round") {
    // 1D packing along Z (length axis)
    const partLen = input.part_z_mm + cutoff;
    partsPerStock = Math.floor(input.stock_z_mm / partLen);
    partVolMm3 = Math.PI * Math.pow(input.stock_x_mm / 2, 2) * input.part_z_mm;  // bar dia, part len
    stockVolMm3 = Math.PI * Math.pow(input.stock_x_mm / 2, 2) * input.stock_z_mm;
  } else {
    // 2D shelf-pack: try part_x along X, part_y along Y; also try rotated 90°
    const partX = input.part_x_mm + cutoff;
    const partY = input.part_y_mm + cutoff;
    const fitA = Math.floor(input.stock_x_mm / partX) * Math.floor(input.stock_y_mm / partY);
    const fitB = Math.floor(input.stock_x_mm / partY) * Math.floor(input.stock_y_mm / partX);
    partsPerStock = Math.max(fitA, fitB);
    partVolMm3 = input.part_x_mm * input.part_y_mm * input.part_z_mm;
    stockVolMm3 = input.stock_x_mm * input.stock_y_mm * input.stock_z_mm;
  }

  const partsPerStockSafe = Math.max(0, partsPerStock);
  const usedVol = partsPerStockSafe * partVolMm3;
  const wasteFrac = stockVolMm3 > 0 ? Math.max(0, 1 - usedVol / stockVolMm3) : 1;
  // stock mass kg = volume mm³ × density g/cm³ × 1e-6 (cm³/mm³ × kg/g = 1e-3 × 1e-3 = 1e-6)
  const stockKg = stockVolMm3 * density * 1e-6;
  const stockCost = stockKg * input.cost_per_kg_usd;
  const costPerPart = partsPerStockSafe > 0 ? stockCost / partsPerStockSafe : 0;

  const notes: string[] = [];
  if (partsPerStockSafe === 0) notes.push("part exceeds stock — none fit; check dimensions");
  if (wasteFrac > 0.5) notes.push(`waste ${(wasteFrac * 100).toFixed(1)}% > 50% — consider smaller stock or larger batch`);
  if (input.stock_form !== "bar_round") notes.push(`2D shelf-pack heuristic; full nesting (e.g. SVGNest) may reclaim 5-15% more`);

  return {
    parts_per_stock: av(partsPerStockSafe, "parts", "1D/2D packing", 0.85),
    waste_pct: av(wasteFrac * 100, "%", "volumetric residual", 0.85),
    stock_cost_usd: av(stockCost, "USD", "kg × cost_per_kg", 0.92),
    cost_per_part_usd: av(costPerPart, "USD", "stock_cost / parts_per_stock", 0.85),
    notes, source: "MaterialYieldOptimizer v1.0.0",
  };
}

export const MaterialYieldOptimizer = { version: "1.0.0" as const, optimize };
