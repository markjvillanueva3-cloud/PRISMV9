/**
 * ParallelismEngine — Parallelism/Flatness Tolerance Calculator
 *
 * Calculates parallelism and flatness parameters:
 * - Required indicator readings for parallelism verification
 * - Flatness tolerance from GD&T callout
 * - Number of measurement points needed
 * - Shim/scrape allowance for correction
 * - Surface plate setup and indicator placement
 *
 * Key physics: Parallelism is the total variation of a
 * surface relative to a datum plane. It is measured as the
 * difference between max and min indicator readings across
 * the surface. Flatness is self-referencing (no datum).
 * Both are controlled by machining rigidity, thermal
 * effects, and clamping distortion.
 *
 * Reference: ASME Y14.5 (GD&T),
 *            ISO 1101 (Geometrical tolerancing),
 *            Machinery's Handbook Ch.12 (Tolerances)
 *
 * Actions: parallelism_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ParallelismInput {
  surface_length_mm: number;
  surface_width_mm: number;
  tolerance_mm: number;
  check_type?: "parallelism" | "flatness" | "perpendicularity";
  machining_process?: "milling" | "grinding" | "lapping"
    | "scraping";
  material_type?: "steel" | "aluminum" | "cast_iron"
    | "granite";
  cte_delta_deg_c?: number;
}

export interface ParallelismResult {
  measurement_points: AtomicValue;
  grid_spacing: AtomicValue;
  indicator_resolution: AtomicValue;
  thermal_error: AtomicValue;
  achievable_tolerance: AtomicValue;
  process_capability: AtomicValue;
  shim_thickness: AtomicValue;
  measurement_uncertainty: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** CTE in μm/m/°C */
const CTE: Record<string, number> = {
  steel: 12,
  aluminum: 23,
  cast_iron: 10.5,
  granite: 6,
};

/** Achievable flatness by process (μm per 300mm) */
const PROCESS_FLAT: Record<string, number> = {
  milling: 20,
  grinding: 5,
  lapping: 1,
  scraping: 2,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ParallelismEngine {
  calculate(input: ParallelismInput): ParallelismResult {
    const warnings: string[] = [];
    const L = input.surface_length_mm;
    const W = input.surface_width_mm;
    const tol = input.tolerance_mm;
    const checkType = input.check_type ?? "parallelism";
    const process = input.machining_process ?? "milling";
    const mat = input.material_type ?? "steel";
    const tempDelta = input.cte_delta_deg_c ?? 1;

    // Measurement points: minimum 9 (3×3), more for larger surfaces
    const area = L * W;
    const basePoints = 9;
    const areaFactor = Math.ceil(area / 10000); // per 100cm²
    const nPoints = Math.max(basePoints, basePoints * areaFactor);

    // Grid spacing
    const nRows = Math.ceil(Math.sqrt(nPoints * (L / W)));
    const nCols = Math.ceil(nPoints / nRows);
    const gridSpacing = Math.min(
      L / Math.max(nRows - 1, 1),
      W / Math.max(nCols - 1, 1)
    );

    // Indicator resolution: 10× better than tolerance
    const indicatorRes = tol / 10;

    // Thermal error: ΔL = CTE × L × ΔT
    const cte = CTE[mat] ?? 12;
    // CTE (μm/m/°C) × L(mm→m) × ΔT → mm
    const thermalError = cte * 1e-6 * (L / 1000) * tempDelta * 1000;

    // Achievable tolerance for process
    const processFlatPer300 = PROCESS_FLAT[process] ?? 20;
    const achievable = (processFlatPer300 * L / 300) / 1000; // mm

    // Process capability: Cp = tolerance / (6 × sigma)
    const sigma = achievable / 3; // rough estimate
    const cp = sigma > 0 ? tol / (6 * sigma) : 0;

    // Shim thickness for correction (if needed)
    const shimThickness = tol > achievable ? 0
      : Math.max(0, achievable - tol);

    // Measurement uncertainty (indicator + thermal + setup)
    const indicatorUncertainty = indicatorRes * 0.5;
    const setupUncertainty = 0.002; // 2μm typical
    const totalUncertainty = Math.sqrt(
      indicatorUncertainty ** 2
      + thermalError ** 2
      + setupUncertainty ** 2
    );

    // Warnings
    if (thermalError > tol * 0.3) {
      warnings.push(
        `Thermal error ${r4(thermalError)}mm is ${r0(thermalError / tol * 100)}% ` +
        "of tolerance — temperature-control the measurement"
      );
    }
    if (achievable > tol) {
      warnings.push(
        `${process} typically achieves ${r3(achievable)}mm — ` +
        `tighter than ${r3(tol)}mm tolerance. ` +
        "Upgrade process or add finishing"
      );
    }
    if (cp < 1.33) {
      warnings.push(
        `Process capability Cp=${r2(cp)} < 1.33 — ` +
        "may not meet tolerance consistently"
      );
    }
    if (tol < 0.005 && process === "milling") {
      warnings.push(
        "Tolerance < 5μm by milling alone is unreliable — " +
        "add grinding or lapping"
      );
    }
    if (totalUncertainty > tol * 0.25) {
      warnings.push(
        "Measurement uncertainty > 25% of tolerance — " +
        "improve measurement conditions"
      );
    }
    if (checkType === "perpendicularity" && L > 500) {
      warnings.push(
        "Large surface perpendicularity — use precision square " +
        "and multiple readings"
      );
    }

    return {
      measurement_points: av(nPoints, "points", 0,
        `${nRows}×${nCols} grid over ${L}×${W}mm`),
      grid_spacing: av(r1(gridSpacing), "mm", 1,
        "Min of row/column spacing"),
      indicator_resolution: av(r4(indicatorRes), "mm", 0,
        "Tolerance / 10"),
      thermal_error: av(r4(thermalError), "mm", 0.001,
        `CTE=${cte} × ${L}mm × ${tempDelta}°C`),
      achievable_tolerance: av(r4(achievable), "mm", 0.001,
        `${process}: ${processFlatPer300}μm/300mm`),
      process_capability: av(r2(cp), "Cp", 0.1,
        "Tol / (6σ)"),
      shim_thickness: av(r4(shimThickness), "mm", 0.001,
        shimThickness > 0
          ? "Correction needed"
          : "Process can meet tolerance"),
      measurement_uncertainty: av(r4(totalUncertainty), "mm",
        0.001,
        "RSS of indicator + thermal + setup"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const parallelismEngine = new ParallelismEngine();
