/**
 * FlyingShearEngine — Flying shear/cutoff synchronization and force
 *
 * Models: Shear force (F = L×t×τ), crank kinematics for synchronization,
 *         blade overlap timing, cut quality vs speed
 * References: Rolling Mill Engineering, AISE steel design
 * Safety: Blade overlap timing, motor torque peaks
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ShearMaterial = "mild_steel" | "stainless" | "aluminum"
  | "copper" | "hot_steel";

export interface FlyingShearInput {
  strip_width_mm: number;
  strip_thickness_mm: number;
  line_speed_m_min: number;
  cut_length_mm: number;
  material?: ShearMaterial;
  blade_rake_angle_deg?: number;       // default 2°
  blade_clearance_pct?: number;        // default 5% of thickness
  overlap_mm?: number;                 // blade overlap, default 3
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FlyingShearResult {
  shear_force_kN: AtomicValue;
  cuts_per_min: AtomicValue;
  blade_speed_m_min: AtomicValue;
  synchronization_window_ms: AtomicValue;
  shear_energy_J: AtomicValue;
  motor_power_kW: AtomicValue;
  peak_torque_Nm: AtomicValue;
  blade_life_cuts: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const SHEAR_MAT: Record<ShearMaterial, {
  shear_MPa: number; hardness_factor: number
}> = {
  mild_steel: { shear_MPa: 300, hardness_factor: 1.0 },
  stainless:  { shear_MPa: 480, hardness_factor: 0.7 },
  aluminum:   { shear_MPa: 130, hardness_factor: 1.5 },
  copper:     { shear_MPa: 180, hardness_factor: 1.3 },
  hot_steel:  { shear_MPa: 120, hardness_factor: 1.2 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FlyingShearEngine {
  calculate(input: FlyingShearInput): FlyingShearResult {
    const {
      strip_width_mm: W,
      strip_thickness_mm: t,
      line_speed_m_min: vLine,
      cut_length_mm: cutLen,
      material = "mild_steel",
      blade_rake_angle_deg: rake = 2,
      blade_clearance_pct: clearPct = 5,
      overlap_mm: overlap = 3,
    } = input;

    const recs: string[] = [];
    const mp = SHEAR_MAT[material];

    // Shear force with rake angle reduction
    // F = τ × t² / (2 × tan(rake)) for raked blade
    const rakeRad = rake * Math.PI / 180;
    const shearForce = rake > 0
      ? mp.shear_MPa * t * t / (2 * Math.tan(rakeRad)) / 1000 // kN
      : mp.shear_MPa * W * t / 1000; // flat blade

    // Cuts per minute
    const cutsPerMin = (vLine * 1000) / cutLen;

    // Blade must match line speed during cut
    const bladeSpeed = vLine; // synchronized

    // Synchronization window: time the blade travels through overlap
    const cutTime_s = (overlap / 1000) / (vLine / 60); // s
    const syncWindow_ms = cutTime_s * 1000;

    // Shear energy per cut: E = F × penetration
    const penetration = t * 0.7; // effective shear penetration
    const shearEnergy = shearForce * 1000 * penetration / 1000; // J

    // Motor power (average)
    const motorPower = shearEnergy * cutsPerMin / 60 / 1000; // kW
    // Add acceleration/deceleration power
    const accelPower = motorPower * 2; // crank accel dominates
    const totalPower = motorPower + accelPower;

    // Peak torque (crank mechanism, approximate)
    const crankRadius = 150; // mm typical
    const peakTorque = shearForce * 1000 * crankRadius / 1000; // Nm

    // Blade life estimate (cuts)
    const bladeLife = Math.round(50000 * mp.hardness_factor / (t / 2));

    const isSafe = syncWindow_ms > 5 && cutsPerMin < 300;

    if (syncWindow_ms < 10) {
      recs.push(`Tight sync window ${syncWindow_ms.toFixed(1)}ms — precision servo required`);
    }
    if (cutsPerMin > 200) {
      recs.push(`High cut rate ${cutsPerMin.toFixed(0)}/min — verify blade cooling and wear`);
    }
    if (t > 6 && material === "stainless") {
      recs.push(`Thick stainless ${t}mm — high shear force, verify frame rigidity`);
    }
    if (cutLen < 100) {
      recs.push(`Short cut length ${cutLen}mm — blade must accelerate/decelerate rapidly`);
    }
    if (recs.length === 0) {
      recs.push(`Flying shear nominal — ${cutsPerMin.toFixed(0)} cuts/min, ${shearForce.toFixed(1)}kN`);
    }

    return {
      shear_force_kN: mkAv(Math.round(shearForce * 10) / 10, "kN", shearForce * 0.12, "raked_shear"),
      cuts_per_min: mkAv(Math.round(cutsPerMin * 10) / 10, "cuts/min", cutsPerMin * 0.02, "speed_length"),
      blade_speed_m_min: mkAv(Math.round(bladeSpeed * 10) / 10, "m/min", bladeSpeed * 0.02, "sync_speed"),
      synchronization_window_ms: mkAv(Math.round(syncWindow_ms * 10) / 10, "ms", syncWindow_ms * 0.10, "overlap_time"),
      shear_energy_J: mkAv(Math.round(shearEnergy * 10) / 10, "J", shearEnergy * 0.15, "force_distance"),
      motor_power_kW: mkAv(Math.round(totalPower * 10) / 10, "kW", totalPower * 0.15, "energy_rate"),
      peak_torque_Nm: mkAv(Math.round(peakTorque), "Nm", peakTorque * 0.12, "crank_mechanism"),
      blade_life_cuts: mkAv(bladeLife, "cuts", bladeLife * 0.25, "empirical_estimate"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const flyingShearEngine = new FlyingShearEngine();
