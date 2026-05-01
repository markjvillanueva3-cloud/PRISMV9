/**
 * CouplingSelectionEngine — Shaft Coupling Sizing Calculator
 *
 * Models: Flexible and rigid coupling selection.
 * - Service factor by application (AGMA 9002)
 * - Design torque = T_nominal × SF
 * - Bore capacity and keyway verification
 * - Misalignment capacity (angular, parallel, axial)
 * - Torsional stiffness and natural frequency
 * - Coupling type recommendation
 *
 * Key physics: T = P×9549/n. Design_T = T×SF.
 * f_n = (1/2π)√(K_t/J). Max bore ≈ OD/2.
 *
 * Reference: AGMA 9002 — Bores and Keyways,
 *            Mancuso — Couplings and Joints,
 *            Lovejoy/Rexnord coupling catalogs
 *
 * Actions: coupling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CouplingSelectionInput {
  power_kw?: number;
  speed_rpm?: number;
  application?: "pump" | "fan" | "compressor" | "conveyor" | "crusher" | "general";
  coupling_type?: "jaw" | "disc" | "gear" | "grid" | "oldham" | "rigid";
  shaft_diameter_mm?: number;
  angular_misalignment_deg?: number;
  parallel_misalignment_mm?: number;
  axial_displacement_mm?: number;
  ambient_temp_c?: number;
}

export interface CouplingSelectionResult {
  nominal_torque: AtomicValue;
  service_factor: AtomicValue;
  design_torque: AtomicValue;
  recommended_size: AtomicValue;
  max_bore: AtomicValue;
  torsional_stiffness: AtomicValue;
  natural_frequency: AtomicValue;
  misalignment_ok: AtomicValue;
  max_speed: AtomicValue;
  coupling_type_rec: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Service factors by application */
const SERVICE_FACTORS: Record<string, number> = {
  pump: 1.5, fan: 1.5, compressor: 1.75, conveyor: 1.75, crusher: 2.5, general: 1.5,
};

/** Coupling catalog: [max_torque_Nm, max_bore_mm, max_rpm, torsional_stiffness_Nm_rad,
 *                     angular_cap_deg, parallel_cap_mm, axial_cap_mm] */
const COUPLING_DATA: Record<string, [number, number, number, number, number, number, number][]> = {
  jaw: [
    [30, 19, 10000, 500, 1.0, 0.2, 1.5],
    [90, 28, 8000, 1500, 1.0, 0.2, 1.5],
    [250, 42, 6500, 4000, 1.0, 0.3, 2.0],
    [700, 55, 5000, 10000, 1.0, 0.3, 2.0],
    [1700, 70, 4000, 25000, 1.0, 0.4, 2.5],
    [4000, 90, 3500, 60000, 1.0, 0.5, 3.0],
  ],
  disc: [
    [100, 25, 15000, 8000, 1.5, 0.5, 2.0],
    [400, 42, 12000, 30000, 1.5, 0.8, 3.0],
    [1200, 60, 9000, 80000, 1.5, 1.0, 4.0],
    [3500, 80, 7000, 200000, 1.5, 1.2, 5.0],
    [8000, 100, 5500, 500000, 1.5, 1.5, 6.0],
  ],
  gear: [
    [500, 35, 8000, 100000, 0.5, 0.3, 5.0],
    [2000, 55, 6000, 400000, 0.5, 0.3, 8.0],
    [8000, 80, 4500, 1000000, 0.5, 0.5, 10.0],
    [25000, 110, 3500, 3000000, 0.5, 0.5, 12.0],
    [80000, 150, 2500, 8000000, 0.5, 0.8, 15.0],
  ],
  grid: [
    [200, 30, 6000, 5000, 0.3, 0.3, 3.0],
    [800, 50, 5000, 20000, 0.3, 0.5, 5.0],
    [3000, 75, 4000, 60000, 0.3, 0.8, 8.0],
    [10000, 100, 3000, 150000, 0.3, 1.0, 10.0],
  ],
  oldham: [
    [50, 20, 5000, 200, 0.5, 2.0, 1.0],
    [200, 35, 4000, 800, 0.5, 3.0, 1.5],
    [600, 50, 3000, 2500, 0.5, 4.0, 2.0],
    [1500, 65, 2500, 6000, 0.5, 5.0, 2.5],
  ],
  rigid: [
    [500, 35, 15000, 10000000, 0, 0, 0],
    [2000, 55, 12000, 10000000, 0, 0, 0],
    [8000, 80, 9000, 10000000, 0, 0, 0],
    [25000, 110, 6000, 10000000, 0, 0, 0],
  ],
};

// ── Engine ─────────────────────────────────────────────────────────

export class CouplingSelectionEngine {
  calculate(input: CouplingSelectionInput): CouplingSelectionResult {
    const warnings: string[] = [];
    const P = input.power_kw ?? 10;
    const n = input.speed_rpm ?? 1500;
    const app = input.application ?? "general";
    const cType = input.coupling_type ?? "jaw";
    const shaftD = input.shaft_diameter_mm ?? 30;
    const angMis = input.angular_misalignment_deg ?? 0.5;
    const parMis = input.parallel_misalignment_mm ?? 0.2;
    const axMis = input.axial_displacement_mm ?? 1.0;
    const temp = input.ambient_temp_c ?? 25;

    // Nominal torque
    const T = n > 0 ? P * 9549 / n : 0;

    // Service factor
    const SF = SERVICE_FACTORS[app] ?? 1.5;
    const Td = T * SF;

    // Select coupling size from catalog
    const catalog = COUPLING_DATA[cType] ?? COUPLING_DATA.jaw;
    let selected = catalog[catalog.length - 1]; // default to largest
    let sizeIdx = catalog.length;
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i][0] >= Td) {
        selected = catalog[i];
        sizeIdx = i + 1;
        break;
      }
    }

    const [maxT, maxBore, maxRPM, Kt, angCap, parCap, axCap] = selected;

    // Check bore
    const boreOk = shaftD <= maxBore;

    // Check misalignment
    const angOk = angMis <= angCap;
    const parOk = parMis <= parCap;
    const axOk = axMis <= axCap;
    const misOk = angOk && parOk && axOk;

    // Torsional natural frequency (simplified: assumes equal inertia both sides)
    const Japprox = P > 0 ? T / (omega(n) * omega(n)) * 10 : 0.01; // rough estimate
    const fn = Kt > 0 && Japprox > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(Kt / Japprox) : 0;

    // Recommend coupling type if not specified
    let typeRec = cType;
    if (!input.coupling_type) {
      if (parMis > 1.0) typeRec = "oldham";
      else if (Td > 5000) typeRec = "gear";
      else if (n > 6000) typeRec = "disc";
      else typeRec = "jaw";
    }

    // Warnings
    if (Td > maxT) {
      warnings.push(`Design torque ${r0(Td)}N·m exceeds size ${sizeIdx} rating ${maxT}N·m — select larger coupling`);
    }
    if (!boreOk) {
      warnings.push(`Shaft ${shaftD}mm exceeds max bore ${maxBore}mm — select larger size`);
    }
    if (n > maxRPM) {
      warnings.push(`Speed ${n}rpm exceeds coupling max ${maxRPM}rpm — risk of dynamic imbalance`);
    }
    if (!angOk) {
      warnings.push(`Angular misalignment ${angMis}° exceeds ${angCap}° capacity`);
    }
    if (!parOk) {
      warnings.push(`Parallel offset ${parMis}mm exceeds ${parCap}mm capacity`);
    }
    if (!axOk) {
      warnings.push(`Axial displacement ${axMis}mm exceeds ${axCap}mm capacity`);
    }
    if (temp > 80 && cType === "jaw") {
      warnings.push("Temperature >80°C — jaw elastomer may degrade, consider metallic coupling");
    }
    if (cType === "rigid" && (angMis > 0.05 || parMis > 0.05)) {
      warnings.push("Rigid coupling with misalignment — use flexible type or improve alignment");
    }

    const src = "CouplingSelectionEngine (AGMA 9002/Mancuso)";

    return {
      nominal_torque: mkAv(r1(T), "N·m", T * 0.02, `${P}kW at ${n}rpm`),
      service_factor: mkAv(SF, "×", 0, `${app} per AGMA`),
      design_torque: mkAv(r1(Td), "N·m", Td * 0.05, `${r1(T)}×${SF}`),
      recommended_size: mkAv(sizeIdx, `size (${maxT}N·m rated)`, 0, `${cType} catalog`),
      max_bore: mkAv(maxBore, "mm", 0, `Size ${sizeIdx} ${cType}`),
      torsional_stiffness: mkAv(r0(Kt), "N·m/rad", Kt * 0.1, src),
      natural_frequency: mkAv(r0(fn), "Hz", fn * 0.15, `(1/2π)√(Kt/J)`),
      misalignment_ok: mkAv(misOk ? 1 : 0, misOk ? "PASS" : "FAIL", 0,
        `ang=${angMis}°/${angCap}° par=${parMis}/${parCap}mm ax=${axMis}/${axCap}mm`),
      max_speed: mkAv(maxRPM, "rpm", 0, `${cType} size ${sizeIdx}`),
      coupling_type_rec: mkAv(typeRec === cType ? 1 : 0, typeRec, 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function omega(rpm: number): number { return rpm * 2 * Math.PI / 60; }
function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const couplingSelectionEngine = new CouplingSelectionEngine();
