/**
 * CouplingEngine — Shaft coupling selection and sizing
 *
 * Models: Torque capacity (service factor), misalignment tolerance,
 *         torsional stiffness, critical speed influence
 * References: AGMA 9002, Lovejoy, Rexnord
 */

export type CouplingType = "jaw" | "disc" | "gear" | "grid" | "oldham" | "bellows" | "universal";

export interface CouplingInput {
  transmitted_power_kW: number;
  speed_rpm: number;
  shaft_diameter_mm?: number;           // auto-sized
  coupling_type?: CouplingType;
  angular_misalignment_deg?: number;    // default 0.5
  parallel_misalignment_mm?: number;    // default 0.2
  service_factor?: number;              // default 1.5
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CouplingResult {
  design_torque_Nm: AtomicValue;
  coupling_size_mm: AtomicValue;
  max_bore_mm: AtomicValue;
  torsional_stiffness_Nm_rad: AtomicValue;
  max_speed_rpm: AtomicValue;
  weight_kg: AtomicValue;
  angular_capacity_deg: AtomicValue;
  parallel_capacity_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

const COUPLING_DATA: Record<CouplingType, {
  angCap: number; parCap: number; maxSpeedFactor: number; stiffFactor: number
}> = {
  jaw:       { angCap: 1.0, parCap: 0.3, maxSpeedFactor: 1.0, stiffFactor: 5000 },
  disc:      { angCap: 1.5, parCap: 0.5, maxSpeedFactor: 1.5, stiffFactor: 20000 },
  gear:      { angCap: 0.5, parCap: 0.1, maxSpeedFactor: 2.0, stiffFactor: 50000 },
  grid:      { angCap: 0.25, parCap: 0.3, maxSpeedFactor: 1.2, stiffFactor: 30000 },
  oldham:    { angCap: 0.5, parCap: 2.0, maxSpeedFactor: 0.5, stiffFactor: 3000 },
  bellows:   { angCap: 3.0, parCap: 1.0, maxSpeedFactor: 1.5, stiffFactor: 2000 },
  universal: { angCap: 25, parCap: 5.0, maxSpeedFactor: 0.8, stiffFactor: 10000 },
};

export class CouplingEngine {
  calculate(input: CouplingInput): CouplingResult {
    const {
      transmitted_power_kW: P,
      speed_rpm: N,
      coupling_type = "jaw",
      angular_misalignment_deg = 0.5,
      parallel_misalignment_mm = 0.2,
      service_factor = 1.5,
    } = input;

    const recs: string[] = [];
    const cd = COUPLING_DATA[coupling_type];

    // Nominal torque
    const T = P * 1000 / (2 * Math.PI * N / 60);
    const Tdesign = T * service_factor;

    // Coupling size (approximate from torque)
    const size = Math.pow(Tdesign / 2, 0.33) * 20; // rough OD mm
    const stdSizes = [42, 55, 65, 75, 90, 105, 120, 140, 168, 194, 225, 260, 305];
    const couplingSize = stdSizes.find(s => s >= size) ?? stdSizes[stdSizes.length - 1];

    // Max bore
    const maxBore = Math.round(couplingSize * 0.45);
    const shaftDia = input.shaft_diameter_mm ?? maxBore;

    // Max speed
    const maxSpeed = Math.round(cd.maxSpeedFactor * 100000 / couplingSize);

    // Stiffness
    const stiffness = cd.stiffFactor * Math.pow(couplingSize / 100, 2);

    // Weight
    const weight = Math.pow(couplingSize / 100, 3) * 3; // kg rough

    const isSafe = angular_misalignment_deg <= cd.angCap &&
      parallel_misalignment_mm <= cd.parCap && N <= maxSpeed;

    if (angular_misalignment_deg > cd.angCap) recs.push(`Angular ${angular_misalignment_deg}° > ${coupling_type} limit ${cd.angCap}° — use disc or universal`);
    if (parallel_misalignment_mm > cd.parCap) recs.push(`Parallel ${parallel_misalignment_mm}mm > limit ${cd.parCap}mm — use oldham or universal`);
    if (N > maxSpeed * 0.9) recs.push(`Speed near max ${maxSpeed}rpm — verify balance grade`);
    if (shaftDia > maxBore) recs.push(`Shaft ${shaftDia}mm > max bore ${maxBore}mm — select larger coupling`);
    if (recs.length === 0) recs.push(`Coupling nominal — ${coupling_type} size ${couplingSize}mm, Td=${Tdesign.toFixed(0)}Nm`);

    return {
      design_torque_Nm: mkAv(Math.round(Tdesign * 10) / 10, "Nm", Tdesign * 0.08, "service_factor"),
      coupling_size_mm: mkAv(couplingSize, "mm", 0, "torque_sizing"),
      max_bore_mm: mkAv(maxBore, "mm", 0, "size_ratio"),
      torsional_stiffness_Nm_rad: mkAv(Math.round(stiffness), "Nm/rad", stiffness * 0.15, "type_size"),
      max_speed_rpm: mkAv(maxSpeed, "rpm", maxSpeed * 0.10, "balance"),
      weight_kg: mkAv(Math.round(weight * 10) / 10, "kg", weight * 0.15, "size_estimate"),
      angular_capacity_deg: mkAv(cd.angCap, "deg", 0, "catalog"),
      parallel_capacity_mm: mkAv(cd.parCap, "mm", 0, "catalog"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const couplingEngine = new CouplingEngine();
