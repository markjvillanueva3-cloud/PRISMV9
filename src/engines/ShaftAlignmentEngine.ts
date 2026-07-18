/**
 * ShaftAlignmentEngine — Rotating Machinery Shaft Alignment Calculator
 *
 * Calculates laser/dial alignment corrections:
 * - Angular and offset misalignment from readings
 * - Shim corrections at each foot
 * - Thermal growth compensation
 * - Acceptable tolerance per ISO 10816 / API 686
 * - Soft foot detection threshold
 *
 * Key physics: Angular misalignment = gap_diff / diameter.
 * Offset misalignment = (TIR_12 + TIR_3-9) / 2 at coupling.
 * Thermal growth ΔL = α × L × ΔT. Shim correction projects
 * misalignment along machine length to each bolt foot.
 *
 * Reference: API 686 (machinery alignment),
 *            ISO 10816-3 (vibration limits),
 *            Shaft Alignment Handbook (Piotrowski)
 *
 * Actions: shaft_alignment_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ShaftAlignmentInput {
  /** Coupling diameter in mm */
  coupling_diameter_mm?: number;
  /** Gap difference top-bottom at coupling rim (mm) */
  rim_gap_top_bottom_mm?: number;
  /** Gap difference left-right at coupling rim (mm) */
  rim_gap_left_right_mm?: number;
  /** Face TIR reading at 12 o'clock (mm) */
  face_tir_12?: number;
  /** Face TIR reading at 3 o'clock (mm) */
  face_tir_3?: number;
  /** Face TIR reading at 6 o'clock (mm) */
  face_tir_6?: number;
  /** Face TIR reading at 9 o'clock (mm) */
  face_tir_9?: number;
  /** Distance from coupling to front feet (mm) */
  dist_coupling_to_front_mm?: number;
  /** Distance from coupling to rear feet (mm) */
  dist_coupling_to_rear_mm?: number;
  /** RPM of machine */
  rpm?: number;
  /** Machine type for tolerance lookup */
  machine_type?: "pump" | "motor" | "compressor" | "turbine" | "fan";
  /** Operating temperature of driver (°C) */
  driver_temp_c?: number;
  /** Operating temperature of driven (°C) */
  driven_temp_c?: number;
  /** Ambient temperature during alignment (°C) */
  ambient_temp_c?: number;
  /** Centerline height of driver shaft (mm) */
  driver_centerline_mm?: number;
  /** Centerline height of driven shaft (mm) */
  driven_centerline_mm?: number;
  /** Material CTE (µm/m/°C), default steel = 12 */
  cte_um_m_c?: number;
  /** Soft foot threshold (mm) */
  soft_foot_limit_mm?: number;
}

export interface ShaftAlignmentResult {
  angular_misalignment: AtomicValue;
  offset_misalignment: AtomicValue;
  front_foot_shim: AtomicValue;
  rear_foot_shim: AtomicValue;
  lateral_front_move: AtomicValue;
  lateral_rear_move: AtomicValue;
  thermal_growth_driver: AtomicValue;
  thermal_growth_driven: AtomicValue;
  tolerance_offset: AtomicValue;
  tolerance_angular: AtomicValue;
  alignment_status: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Acceptable misalignment (mm) by RPM range — API 686 */
const OFFSET_TOLERANCE: [number, number][] = [
  // [max_rpm, tolerance_mm]
  [1200, 0.10],
  [1800, 0.075],
  [3600, 0.05],
  [7200, 0.025],
  [Infinity, 0.013],
];

/** Angular tolerance (mm/100mm) by RPM range */
const ANGULAR_TOLERANCE: [number, number][] = [
  [1200, 0.10],
  [1800, 0.08],
  [3600, 0.05],
  [7200, 0.03],
  [Infinity, 0.02],
];

// ── Engine ─────────────────────────────────────────────────────────

export class ShaftAlignmentEngine {
  calculate(input: ShaftAlignmentInput): ShaftAlignmentResult {
    const warnings: string[] = [];
    const coupDia = input.coupling_diameter_mm ?? 200;
    const rpm = input.rpm ?? 1800;
    const dFront = input.dist_coupling_to_front_mm ?? 300;
    const dRear = input.dist_coupling_to_rear_mm ?? 600;
    const cte = input.cte_um_m_c ?? 12; // steel

    // Face readings (default 0 = perfectly aligned)
    const f12 = input.face_tir_12 ?? 0;
    const f3 = input.face_tir_3 ?? 0;
    const f6 = input.face_tir_6 ?? 0;
    const f9 = input.face_tir_9 ?? 0;

    // Rim readings
    const rimVert = input.rim_gap_top_bottom_mm ?? 0;
    const rimHoriz = input.rim_gap_left_right_mm ?? 0;

    // ── Vertical angular misalignment (from face readings)
    // Angular = (f12 - f6) / coupling_diameter
    const angularVert = (f12 - f6) / coupDia; // mm/mm = radians approx
    const angularVertPer100 = Math.abs(angularVert) * 100; // mm per 100mm

    // Horizontal angular
    const angularHoriz = (f9 - f3) / coupDia;
    const angularHorizPer100 = Math.abs(angularHoriz) * 100;

    // Total angular (RSS)
    const totalAngular = Math.sqrt(
      angularVertPer100 * angularVertPer100 +
      angularHorizPer100 * angularHorizPer100
    );

    // ── Offset misalignment (from rim readings)
    // Vertical offset = rimVert / 2
    const offsetVert = rimVert / 2;
    // Horizontal offset = rimHoriz / 2
    const offsetHoriz = rimHoriz / 2;
    const totalOffset = Math.sqrt(
      offsetVert * offsetVert + offsetHoriz * offsetHoriz
    );

    // ── Thermal growth
    const ambientT = input.ambient_temp_c ?? 20;
    const driverT = input.driver_temp_c ?? ambientT;
    const drivenT = input.driven_temp_c ?? ambientT;
    const driverCL = input.driver_centerline_mm ?? 300;
    const drivenCL = input.driven_centerline_mm ?? 300;

    // ΔL = α × L × ΔT (convert µm/m/°C to mm/mm/°C)
    const thermalDriver = cte * 1e-6 * driverCL * (driverT - ambientT);
    const thermalDriven = cte * 1e-6 * drivenCL * (drivenT - ambientT);

    // ── Shim corrections (vertical plane)
    // Project coupling misalignment to feet positions
    // Front shim = offset + angular × dFront
    const frontShim = offsetVert + angularVert * dFront - thermalDriver + thermalDriven;
    // Rear shim = offset + angular × dRear
    const rearShim = offsetVert + angularVert * dRear - thermalDriver + thermalDriven;

    // Lateral moves (horizontal plane)
    const latFront = offsetHoriz + angularHoriz * dFront;
    const latRear = offsetHoriz + angularHoriz * dRear;

    // ── Tolerances
    const tolOffset = lookupTol(OFFSET_TOLERANCE, rpm);
    const tolAngular = lookupTol(ANGULAR_TOLERANCE, rpm);

    // ── Status
    const offsetOk = totalOffset <= tolOffset;
    const angularOk = totalAngular <= tolAngular;
    const pass = offsetOk && angularOk;

    // ── Warnings
    if (!offsetOk) {
      warnings.push(
        `Offset ${r3(totalOffset)}mm exceeds ${tolOffset}mm tolerance at ${rpm} RPM`
      );
    }
    if (!angularOk) {
      warnings.push(
        `Angular ${r3(totalAngular)}mm/100mm exceeds ${tolAngular}mm/100mm at ${rpm} RPM`
      );
    }
    if (Math.abs(thermalDriver - thermalDriven) > 0.05) {
      warnings.push(
        `Thermal growth difference ${r3(Math.abs(thermalDriver - thermalDriven))}mm — ` +
        "pre-offset cold alignment recommended"
      );
    }
    const softFootLimit = input.soft_foot_limit_mm ?? 0.05;
    if (Math.abs(frontShim - rearShim) > 0.5) {
      warnings.push(
        `Large shim difference (${r3(Math.abs(frontShim - rearShim))}mm) — ` +
        "check for soft foot or base distortion"
      );
    }
    if (rpm > 3600) {
      warnings.push("High-speed machine — use laser alignment for best accuracy");
    }

    return {
      angular_misalignment: mkAv(r3(totalAngular), "mm/100mm", 0.005,
        `RSS of vert ${r3(angularVertPer100)} + horiz ${r3(angularHorizPer100)}`),
      offset_misalignment: mkAv(r3(totalOffset), "mm", 0.005,
        `RSS of vert ${r3(Math.abs(offsetVert))} + horiz ${r3(Math.abs(offsetHoriz))}`),
      front_foot_shim: mkAv(r3(frontShim), "mm", 0.025,
        `Offset + angular × ${dFront}mm ± thermal`),
      rear_foot_shim: mkAv(r3(rearShim), "mm", 0.025,
        `Offset + angular × ${dRear}mm ± thermal`),
      lateral_front_move: mkAv(r3(latFront), "mm", 0.01,
        `Horiz offset + angular × ${dFront}mm`),
      lateral_rear_move: mkAv(r3(latRear), "mm", 0.01,
        `Horiz offset + angular × ${dRear}mm`),
      thermal_growth_driver: mkAv(r3(thermalDriver), "mm", 0.01,
        `${cte}µm/m/°C × ${driverCL}mm × ${r1(driverT - ambientT)}°C`),
      thermal_growth_driven: mkAv(r3(thermalDriven), "mm", 0.01,
        `${cte}µm/m/°C × ${drivenCL}mm × ${r1(drivenT - ambientT)}°C`),
      tolerance_offset: mkAv(tolOffset, "mm", 0, `API 686 at ${rpm} RPM`),
      tolerance_angular: mkAv(tolAngular, "mm/100mm", 0, `API 686 at ${rpm} RPM`),
      alignment_status: mkAv(pass ? 1 : 0, pass ? "PASS" : "FAIL", 0,
        `Offset ${offsetOk ? "OK" : "FAIL"}, Angular ${angularOk ? "OK" : "FAIL"}`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function lookupTol(table: [number, number][], rpm: number): number {
  for (const [maxRpm, tol] of table) {
    if (rpm <= maxRpm) return tol;
  }
  return table[table.length - 1][1];
}

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const shaftAlignmentEngine = new ShaftAlignmentEngine();
