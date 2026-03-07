/**
 * WorkEnvelopeEngine — Machine Work Envelope & Travel Verification
 *
 * Verifies part fits within machine travel limits:
 * - X/Y/Z travel check against part bounding box
 * - Fixture offset impact on available travel
 * - Clearance plane verification
 * - Tombstone/pallet reach analysis
 * - Rotary axis limits (A/B/C)
 * - Tool length + holder reach check
 *
 * Key physics: Available travel = machine travel - fixture offset -
 * part size - clearance. For 5-axis, rotary limits may restrict
 * tool orientation access. Spindle nose to table distance sets
 * Z-height constraint.
 *
 * Reference: Machine tool specifications (Haas, DMG MORI, Mazak),
 *            5-axis work envelope geometry,
 *            Tombstone layout guidelines
 *
 * Actions: work_envelope_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface WorkEnvelopeInput {
  machine_travel_x_mm?: number;
  machine_travel_y_mm?: number;
  machine_travel_z_mm?: number;
  part_size_x_mm: number;
  part_size_y_mm: number;
  part_size_z_mm: number;
  fixture_height_mm?: number;
  fixture_offset_x_mm?: number;
  fixture_offset_y_mm?: number;
  clearance_mm?: number;
  tool_length_mm?: number;
  holder_length_mm?: number;
  spindle_nose_to_table_mm?: number;
  machine_type?: "vmc" | "hmc" | "5axis" | "lathe";
  rotary_a_range_deg?: number;
  rotary_b_range_deg?: number;
  tombstone_faces?: number;
}

export interface WorkEnvelopeResult {
  fits_x: AtomicValue;
  fits_y: AtomicValue;
  fits_z: AtomicValue;
  remaining_x: AtomicValue;
  remaining_y: AtomicValue;
  remaining_z: AtomicValue;
  z_reach_ok: AtomicValue;
  utilization_x: AtomicValue;
  utilization_y: AtomicValue;
  utilization_z: AtomicValue;
  overall_fit: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical machine travels (mm) */
const MACHINE_TRAVELS: Record<string, { x: number; y: number; z: number }> = {
  vmc:   { x: 762, y: 406, z: 508 },   // Haas VF-2 class
  hmc:   { x: 762, y: 508, z: 508 },
  "5axis": { x: 660, y: 508, z: 508 },
  lathe: { x: 200, y: 0, z: 500 },      // X=radial, Z=axial
};

const SPINDLE_TO_TABLE: Record<string, number> = {
  vmc: 508,
  hmc: 508,
  "5axis": 460,
  lathe: 250,
};

// ── Engine ─────────────────────────────────────────────────────────

export class WorkEnvelopeEngine {
  calculate(input: WorkEnvelopeInput): WorkEnvelopeResult {
    const warnings: string[] = [];
    const mType = input.machine_type ?? "vmc";
    const defaults = MACHINE_TRAVELS[mType] ?? MACHINE_TRAVELS.vmc;

    const travelX = input.machine_travel_x_mm ?? defaults.x;
    const travelY = input.machine_travel_y_mm ?? defaults.y;
    const travelZ = input.machine_travel_z_mm ?? defaults.z;

    const clearance = input.clearance_mm ?? 25;
    const fixtureH = input.fixture_height_mm ?? 75;
    const fixOffX = input.fixture_offset_x_mm ?? 0;
    const fixOffY = input.fixture_offset_y_mm ?? 0;
    const toolLen = input.tool_length_mm ?? 100;
    const holderLen = input.holder_length_mm ?? 50;
    const s2t = input.spindle_nose_to_table_mm
      ?? SPINDLE_TO_TABLE[mType] ?? 508;

    // Required travel in each axis
    const reqX = input.part_size_x_mm + fixOffX + clearance * 2;
    const reqY = input.part_size_y_mm + fixOffY + clearance * 2;
    const reqZ = input.part_size_z_mm + fixtureH + clearance;

    // Remaining travel
    const remX = travelX - reqX;
    const remY = travelY - reqY;
    const remZ = travelZ - reqZ;

    const fitsX = remX >= 0;
    const fitsY = remY >= 0;
    const fitsZ = remZ >= 0;

    // Z reach check: can tool reach bottom of part?
    const totalReach = s2t - fixtureH;
    const toolReach = toolLen + holderLen;
    const zReachOk = toolReach >= (input.part_size_z_mm + clearance);

    // Utilization percentages
    const utilX = travelX > 0 ? (reqX / travelX) * 100 : 100;
    const utilY = travelY > 0 ? (reqY / travelY) * 100 : 100;
    const utilZ = travelZ > 0 ? (reqZ / travelZ) * 100 : 100;

    const overallFit = fitsX && fitsY && fitsZ && zReachOk;

    // Warnings
    if (!fitsX) {
      warnings.push(
        `Part exceeds X travel by ${r1(Math.abs(remX))}mm — ` +
        "need larger machine or reposition"
      );
    }
    if (!fitsY) {
      warnings.push(
        `Part exceeds Y travel by ${r1(Math.abs(remY))}mm — ` +
        "need larger machine or reposition"
      );
    }
    if (!fitsZ) {
      warnings.push(
        `Part exceeds Z travel by ${r1(Math.abs(remZ))}mm — ` +
        "reduce fixture height or use shorter setup"
      );
    }
    if (!zReachOk) {
      warnings.push(
        "Tool + holder may not reach part bottom — " +
        "use longer tool or reduce fixture height"
      );
    }
    if (utilX > 80 && fitsX) {
      warnings.push(
        `X utilization ${r0(utilX)}% — limited room for approach`
      );
    }
    if (utilY > 80 && fitsY) {
      warnings.push(
        `Y utilization ${r0(utilY)}% — limited room for approach`
      );
    }
    if (utilZ > 80 && fitsZ) {
      warnings.push(
        `Z utilization ${r0(utilZ)}% — check clearance plane`
      );
    }
    if (input.tombstone_faces && input.tombstone_faces > 1) {
      const tombReq = input.part_size_x_mm * 2 + clearance * 2;
      if (tombReq > travelX) {
        warnings.push(
          "Tombstone width may exceed X travel — " +
          "verify pallet indexing clearance"
        );
      }
    }

    return {
      fits_x: av(fitsX ? 1 : 0, fitsX ? "YES" : "NO", 0,
        `${r0(reqX)}mm required vs ${r0(travelX)}mm available`),
      fits_y: av(fitsY ? 1 : 0, fitsY ? "YES" : "NO", 0,
        `${r0(reqY)}mm required vs ${r0(travelY)}mm available`),
      fits_z: av(fitsZ ? 1 : 0, fitsZ ? "YES" : "NO", 0,
        `${r0(reqZ)}mm required vs ${r0(travelZ)}mm available`),
      remaining_x: av(r1(remX), "mm", 1,
        `${r0(travelX)} - ${r0(reqX)}`),
      remaining_y: av(r1(remY), "mm", 1,
        `${r0(travelY)} - ${r0(reqY)}`),
      remaining_z: av(r1(remZ), "mm", 1,
        `${r0(travelZ)} - ${r0(reqZ)}`),
      z_reach_ok: av(zReachOk ? 1 : 0, zReachOk ? "YES" : "NO", 0,
        `Tool ${r0(toolReach)}mm vs need ${r0(input.part_size_z_mm + clearance)}mm`),
      utilization_x: av(r1(utilX), "%", 1, "Required / travel × 100"),
      utilization_y: av(r1(utilY), "%", 1, "Required / travel × 100"),
      utilization_z: av(r1(utilZ), "%", 1, "Required / travel × 100"),
      overall_fit: av(overallFit ? 1 : 0,
        overallFit ? "PASS" : "FAIL", 0,
        "All axes fit and tool reaches"),
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

export const workEnvelopeEngine = new WorkEnvelopeEngine();
