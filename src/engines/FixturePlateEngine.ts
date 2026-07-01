/**
 * FixturePlateEngine — Fixture Plate Layout & Clamping Calculator
 *
 * Calculates fixture plate specifications:
 * - Grid hole pattern (16mm or 5/8" standard)
 * - Part placement with minimum clamp clearance
 * - Required clamping force from cutting forces
 * - Number of clamps needed
 * - Plate deflection under clamping load
 * - Datum reference verification
 *
 * Key physics: Clamping force must overcome cutting force with
 * safety factor: F_clamp × μ × n_clamps ≥ F_cut × SF.
 * Plate deflection δ = F·a²·(3L-a)/(6EI) for cantilever
 * sections between support points. Grid spacing determines
 * minimum clamp-to-part distance.
 *
 * Reference: Carr Lane fixture design handbook,
 *            Jergens modular fixturing guide,
 *            Kurt workholding engineering data
 *
 * Actions: fixture_plate_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FixturePlateInput {
  plate_length_mm?: number;
  plate_width_mm?: number;
  plate_thickness_mm?: number;
  grid_spacing_mm?: number;
  part_length_mm: number;
  part_width_mm: number;
  part_count?: number;
  cutting_force_n?: number;
  clamp_force_per_n?: number;
  friction_coefficient?: number;
  safety_factor?: number;
  plate_material?: "aluminum" | "steel" | "cast_iron";
  clamp_type?: "toe" | "strap" | "screw" | "toggle";
}

export interface FixturePlateResult {
  grid_holes_x: AtomicValue;
  grid_holes_y: AtomicValue;
  parts_fit: AtomicValue;
  min_clamps_needed: AtomicValue;
  total_clamp_force: AtomicValue;
  plate_deflection: AtomicValue;
  clamp_spacing: AtomicValue;
  usable_area: AtomicValue;
  area_utilization: AtomicValue;
  datum_clearance: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Clamp force by type (N per clamp) */
const CLAMP_FORCES: Record<string, number> = {
  toe: 4500,
  strap: 8900,
  screw: 6700,
  toggle: 11000,
};

/** Plate material properties */
const PLATE_MATERIALS: Record<string, {
  E_gpa: number; density: number; cost_factor: number;
}> = {
  aluminum:  { E_gpa: 70,  density: 2.7, cost_factor: 1.5 },
  steel:     { E_gpa: 200, density: 7.8, cost_factor: 1.0 },
  cast_iron: { E_gpa: 120, density: 7.2, cost_factor: 0.8 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class FixturePlateEngine {
  calculate(input: FixturePlateInput): FixturePlateResult {
    const warnings: string[] = [];
    const plateL = input.plate_length_mm ?? 600;
    const plateW = input.plate_width_mm ?? 400;
    const plateT = input.plate_thickness_mm ?? 25;
    const grid = input.grid_spacing_mm ?? 50; // 50mm ≈ 2" grid
    const partL = input.part_length_mm;
    const partW = input.part_width_mm;
    const partCount = input.part_count ?? 1;
    const cuttingForce = input.cutting_force_n ?? 2000;
    const mu = input.friction_coefficient ?? 0.3;
    const sf = input.safety_factor ?? 2.0;
    const plateMat = input.plate_material ?? "steel";
    const clampType = input.clamp_type ?? "toe";

    const matProps = PLATE_MATERIALS[plateMat] ?? PLATE_MATERIALS.steel;
    const clampForce = input.clamp_force_per_n
      ?? CLAMP_FORCES[clampType] ?? 4500;

    // Grid holes
    const gridHolesX = Math.floor(plateL / grid) + 1;
    const gridHolesY = Math.floor(plateW / grid) + 1;

    // Usable area (leave 1 grid spacing border)
    const usableL = plateL - 2 * grid;
    const usableW = plateW - 2 * grid;
    const usableArea = usableL * usableW;

    // Parts that fit (with clamp clearance = 1 grid spacing around each part)
    const partWithClampL = partL + grid;
    const partWithClampW = partW + grid;
    const partsX = partWithClampL > 0
      ? Math.floor(usableL / partWithClampL) : 0;
    const partsY = partWithClampW > 0
      ? Math.floor(usableW / partWithClampW) : 0;
    const partsFit = Math.max(partsX * partsY, 0);

    // Clamping force required per part
    // F_clamp × μ × n_clamps ≥ F_cut × SF
    const forceNeeded = cuttingForce * sf;
    const minClampsFloat = forceNeeded / (clampForce * mu);
    const minClamps = Math.max(Math.ceil(minClampsFloat), 2); // min 2 clamps
    const totalClampForce = minClamps * clampForce;

    // Plate deflection (simplified: beam between supports)
    // δ = F·L³/(48·E·I) for center-loaded simply-supported beam
    const E_mpa = matProps.E_gpa * 1000; // GPa → MPa
    const I = (plateW * Math.pow(plateT, 3)) / 12; // mm⁴
    const span = plateL * 0.7; // effective span
    const totalLoad = totalClampForce * partCount;
    const deflection = (totalLoad * Math.pow(span, 3)) /
      (48 * E_mpa * I);

    // Clamp spacing
    const clampSpacing = partL > 0
      ? partL / Math.max(minClamps - 1, 1) : grid;

    // Area utilization
    const partArea = partL * partW * partCount;
    const areaUtil = usableArea > 0
      ? (partArea / usableArea) * 100 : 0;

    // Datum clearance (distance from part edge to nearest grid hole)
    const datumClear = grid / 2;

    // Warnings
    if (partsFit < partCount) {
      warnings.push(
        `Only ${partsFit} parts fit on plate (requested ${partCount}) — ` +
        "use larger plate or smaller parts"
      );
    }
    if (deflection > 0.025) {
      warnings.push(
        `Plate deflection ${r3(deflection)}mm exceeds 0.025mm — ` +
        "increase plate thickness or add supports"
      );
    }
    if (deflection > 0.050) {
      warnings.push(
        "Excessive plate deflection — part accuracy at risk"
      );
    }
    if (minClamps > 6) {
      warnings.push(
        `${minClamps} clamps needed — consider stronger clamp type`
      );
    }
    if (areaUtil > 80) {
      warnings.push(
        `Area utilization ${r0(areaUtil)}% — limited clamp access`
      );
    }
    if (plateT < 20 && plateMat === "aluminum") {
      warnings.push(
        "Aluminum plate < 20mm may flex under clamping — " +
        "use steel or increase thickness"
      );
    }
    if (clampSpacing < grid) {
      warnings.push(
        `Clamp spacing ${r0(clampSpacing)}mm < grid ${grid}mm — ` +
        "clamps may not align with grid holes"
      );
    }

    return {
      grid_holes_x: av(gridHolesX, "holes", 0,
        `floor(${plateL} / ${grid}) + 1`),
      grid_holes_y: av(gridHolesY, "holes", 0,
        `floor(${plateW} / ${grid}) + 1`),
      parts_fit: av(partsFit, "pcs", 0,
        `${partsX} × ${partsY} in ${r0(usableL)}×${r0(usableW)}mm`),
      min_clamps_needed: av(minClamps, "clamps", 0,
        `F_cut×SF / (F_clamp×μ) = ${r1(minClampsFloat)}`),
      total_clamp_force: av(r0(totalClampForce), "N", 50,
        `${minClamps} × ${clampForce} N`),
      plate_deflection: av(r4(deflection), "mm", 0.005,
        `F·L³/(48·E·I), ${plateMat}`),
      clamp_spacing: av(r1(clampSpacing), "mm", 1,
        `Part length / (clamps - 1)`),
      usable_area: av(r0(usableArea), "mm²", 10,
        `(${plateL}-${2 * grid}) × (${plateW}-${2 * grid})`),
      area_utilization: av(r1(areaUtil), "%", 1,
        "Part area / usable area × 100"),
      datum_clearance: av(r1(datumClear), "mm", 0.5,
        "Grid spacing / 2"),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
function r4(n: number): number { return Math.round(n * 10000) / 10000; }

export const fixturePlateEngine = new FixturePlateEngine();
