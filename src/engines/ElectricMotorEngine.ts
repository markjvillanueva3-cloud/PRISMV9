/**
 * ElectricMotorEngine — Electric Motor Sizing & Selection Calculator
 *
 * Models: Motor selection for machine tool and industrial drives.
 * - Torque/power from load requirements
 * - Motor sizing with service factor
 * - Efficiency and power factor estimation
 * - Starting current (locked rotor)
 * - Thermal duty cycle (S1-S6 ratings)
 * - VFD sizing for variable speed
 * - Energy cost estimation
 *
 * Key physics: P = T × ω, P_elec = P_mech / η.
 * Starting torque ≈ 1.5-3× rated. Thermal: RMS torque
 * over duty cycle must be ≤ rated torque.
 *
 * Reference: NEMA MG-1 (motors and generators),
 *            IEC 60034 (rotating electrical machines),
 *            Electricity cost from DOE industrial averages
 *
 * Actions: electric_motor_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ElectricMotorInput {
  load_torque_nm?: number;
  load_power_kw?: number;
  speed_rpm?: number;
  load_inertia_kgm2?: number;
  accel_time_s?: number;
  duty_cycle?: "S1_continuous" | "S2_short" | "S3_intermittent" | "S6_continuous_periodic";
  duty_on_pct?: number;
  motor_type?: "induction" | "servo" | "pm_sync" | "dc_brush";
  voltage?: number;
  frequency_hz?: number;
  supply_phases?: 1 | 3;
  service_factor?: number;
  electricity_cost_kwh?: number;
  hours_per_year?: number;
}

export interface ElectricMotorResult {
  required_power: AtomicValue;
  rated_motor_power: AtomicValue;
  rated_torque: AtomicValue;
  accel_torque: AtomicValue;
  peak_torque: AtomicValue;
  efficiency: AtomicValue;
  power_factor: AtomicValue;
  full_load_current: AtomicValue;
  starting_current: AtomicValue;
  annual_energy_cost: AtomicValue;
  motor_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Standard motor sizes (kW) — IEC frame sizes */
const STD_SIZES = [
  0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5,
  11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250,
];

/** Efficiency by power range (IE3 premium) */
function motorEfficiency(kw: number, type: string): number {
  if (type === "servo" || type === "pm_sync") {
    return kw < 1 ? 0.88 : kw < 10 ? 0.92 : 0.95;
  }
  if (type === "dc_brush") {
    return kw < 1 ? 0.75 : kw < 10 ? 0.82 : 0.88;
  }
  // Induction IE3
  if (kw < 1) return 0.82;
  if (kw < 5) return 0.87;
  if (kw < 15) return 0.91;
  if (kw < 50) return 0.93;
  return 0.95;
}

/** Power factor by load */
function powerFactor(kw: number): number {
  if (kw < 1) return 0.65;
  if (kw < 5) return 0.78;
  if (kw < 20) return 0.84;
  return 0.88;
}

// ── Engine ─────────────────────────────────────────────────────────

export class ElectricMotorEngine {
  calculate(input: ElectricMotorInput): ElectricMotorResult {
    const warnings: string[] = [];
    const rpm = input.speed_rpm ?? 1500;
    const motorType = input.motor_type ?? "induction";
    const sf = input.service_factor ?? 1.15;
    const V = input.voltage ?? 400;
    const phases = input.supply_phases ?? 3;
    const freq = input.frequency_hz ?? 50;
    const omega = 2 * Math.PI * rpm / 60;

    // Load torque/power
    let loadTorque: number;
    let loadPower: number;
    if (input.load_torque_nm !== undefined) {
      loadTorque = input.load_torque_nm;
      loadPower = loadTorque * omega / 1000;
    } else {
      loadPower = input.load_power_kw ?? 5;
      loadTorque = loadPower * 1000 / omega;
    }

    // Acceleration torque
    const J = input.load_inertia_kgm2 ?? (loadTorque / omega * 0.1); // estimate
    const tAccel = input.accel_time_s ?? 3;
    const accelTorque = J * omega / tAccel; // T_accel = J × α

    // Peak torque (load + acceleration)
    const peakTorque = loadTorque + accelTorque;

    // Duty cycle derating
    let dutyFactor = 1.0;
    const duty = input.duty_cycle ?? "S1_continuous";
    if (duty === "S2_short") dutyFactor = 0.85;
    if (duty === "S3_intermittent") {
      const onPct = input.duty_on_pct ?? 60;
      dutyFactor = Math.sqrt(onPct / 100);
    }
    if (duty === "S6_continuous_periodic") {
      const onPct = input.duty_on_pct ?? 40;
      dutyFactor = Math.sqrt(onPct / 100);
    }

    // Required motor power (with service factor)
    const reqPower = loadPower * sf / dutyFactor;

    // Select standard motor size
    const ratedPower = STD_SIZES.find(s => s >= reqPower) ?? reqPower;
    const ratedTorque = ratedPower * 1000 / omega;

    // Efficiency & power factor
    const eta = motorEfficiency(ratedPower, motorType);
    const pf = powerFactor(ratedPower);

    // Full load current
    let fla: number;
    if (phases === 3) {
      fla = (ratedPower * 1000) / (Math.sqrt(3) * V * eta * pf);
    } else {
      fla = (ratedPower * 1000) / (V * eta * pf);
    }

    // Starting current (LRA) — typically 6-8× FLA for induction
    const lraMultiplier = motorType === "induction" ? 7 :
      motorType === "dc_brush" ? 5 : 3; // servo/PM much lower with drive
    const startCurrent = fla * lraMultiplier;

    // Annual energy cost
    const hoursPerYear = input.hours_per_year ?? 4000;
    const costPerKwh = input.electricity_cost_kwh ?? 0.10;
    const annualEnergy = loadPower / eta * hoursPerYear;
    const annualCost = annualEnergy * costPerKwh;

    // Feasibility
    const feasible = ratedPower >= reqPower * 0.95 && peakTorque <= ratedTorque * 2.5;

    // Warnings
    if (peakTorque > ratedTorque * 2.0) {
      warnings.push(
        `Peak torque ${r1(peakTorque)} N·m > 2× rated ${r1(ratedTorque)} N·m — ` +
        "may stall during acceleration"
      );
    }
    if (motorType === "induction" && rpm > 3600) {
      warnings.push("Induction motor > 3600 RPM requires VFD with 2-pole motor");
    }
    if (phases === 1 && ratedPower > 3) {
      warnings.push("Single-phase motors typically limited to ≤3 kW — use 3-phase");
    }
    if (startCurrent > 100 && motorType === "induction") {
      warnings.push(
        `Starting current ${r0(startCurrent)}A — consider soft starter or VFD`
      );
    }
    if (eta < 0.85) {
      warnings.push(`Efficiency ${r0(eta * 100)}% — consider premium efficiency motor (IE3/IE4)`);
    }

    const src = "ElectricMotorEngine (NEMA MG-1/IEC 60034)";

    return {
      required_power: mkAv(r2(reqPower), "kW", reqPower * 0.05,
        `${r2(loadPower)}kW × ${sf} SF / ${r2(dutyFactor)} duty`),
      rated_motor_power: mkAv(ratedPower, "kW", 0, "Standard IEC frame"),
      rated_torque: mkAv(r1(ratedTorque), "N·m", ratedTorque * 0.02, src),
      accel_torque: mkAv(r1(accelTorque), "N·m", accelTorque * 0.1,
        `J=${r3(J)} × ω/${tAccel}s`),
      peak_torque: mkAv(r1(peakTorque), "N·m", peakTorque * 0.1,
        "Load + acceleration"),
      efficiency: mkAv(r2(eta), "ratio", 0.02, `${motorType} IE3 at ${ratedPower}kW`),
      power_factor: mkAv(r2(pf), "ratio", 0.03, src),
      full_load_current: mkAv(r1(fla), "A", fla * 0.05,
        `${phases}ph ${V}V`),
      starting_current: mkAv(r0(startCurrent), "A", startCurrent * 0.15,
        `${lraMultiplier}× FLA (${motorType})`),
      annual_energy_cost: mkAv(r0(annualCost), "USD/yr", annualCost * 0.1,
        `${r0(annualEnergy)}kWh × $${costPerKwh}`),
      motor_feasible: mkAv(feasible ? 1 : 0,
        feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const electricMotorEngine = new ElectricMotorEngine();
