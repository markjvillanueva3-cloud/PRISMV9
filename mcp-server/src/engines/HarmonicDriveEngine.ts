/**
 * HarmonicDriveEngine — Strain wave gear (harmonic drive) sizing
 *
 * Models: Gear ratio ((Zfs-Zcs)/Zfs), torque capacity,
 *         torsional stiffness, lost motion, fatigue life
 * References: Harmonic Drive AG, Musser patent
 */

export interface HarmonicDriveInput {
  output_torque_Nm: number;
  gear_ratio?: number;                  // default 100
  input_speed_rpm?: number;             // default 3000
  duty_cycle_pct?: number;              // default 100
  required_life_hours?: number;         // default 10000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface HarmonicDriveResult {
  frame_size: AtomicValue;
  rated_torque_Nm: AtomicValue;
  peak_torque_Nm: AtomicValue;
  torsional_stiffness_Nm_arcmin: AtomicValue;
  lost_motion_arcmin: AtomicValue;
  efficiency_pct: AtomicValue;
  weight_kg: AtomicValue;
  calculated_life_hours: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Harmonic drive sizes (frame, rated torque, peak torque, weight, stiffness)
const HD_SIZES = [
  { frame: 14, rated: 3.9, peak: 9.8, wt: 0.06, stiff: 1.2 },
  { frame: 17, rated: 7.8, peak: 23, wt: 0.12, stiff: 2.5 },
  { frame: 20, rated: 14, peak: 34, wt: 0.19, stiff: 4.5 },
  { frame: 25, rated: 34, peak: 78, wt: 0.40, stiff: 9.0 },
  { frame: 32, rated: 78, peak: 167, wt: 0.85, stiff: 16 },
  { frame: 40, rated: 137, peak: 343, wt: 1.6, stiff: 28 },
  { frame: 50, rated: 294, peak: 686, wt: 3.5, stiff: 54 },
  { frame: 65, rated: 588, peak: 1470, wt: 8.0, stiff: 108 },
  { frame: 80, rated: 1078, peak: 2744, wt: 14, stiff: 180 },
  { frame: 100, rated: 2058, peak: 4900, wt: 25, stiff: 350 },
];

export class HarmonicDriveEngine {
  calculate(input: HarmonicDriveInput): HarmonicDriveResult {
    const {
      output_torque_Nm: T,
      gear_ratio = 100,
      input_speed_rpm: Nin = 3000,
      duty_cycle_pct = 100,
      required_life_hours = 10000,
    } = input;

    const recs: string[] = [];

    // Select frame size
    const dutyFactor = duty_cycle_pct / 100;
    const effectiveTorque = T * Math.sqrt(dutyFactor);
    const selected = HD_SIZES.find(s => s.rated >= effectiveTorque)
      ?? HD_SIZES[HD_SIZES.length - 1];

    // Efficiency (typically 70-85% for harmonic drives)
    const eta = gear_ratio <= 50 ? 0.85 : gear_ratio <= 100 ? 0.80 : 0.75;

    // Lost motion (backlash)
    const lostMotion = 1.0; // arcmin typical

    // Life estimate (inverse cube of torque ratio)
    const torqueRatio = selected.rated / effectiveTorque;
    const life = required_life_hours * Math.pow(torqueRatio, 3);

    // Output speed
    const Nout = Nin / gear_ratio;

    const isSafe = T <= selected.peak && effectiveTorque <= selected.rated;

    if (T > selected.rated) recs.push(`Torque ${T}Nm > rated ${selected.rated}Nm — intermittent use only`);
    if (T > selected.peak) recs.push(`EXCEEDS peak torque ${selected.peak}Nm — select larger frame`);
    if (Nin > 3500) recs.push(`High input speed ${Nin}rpm — verify bearing life and heating`);
    if (gear_ratio < 30) recs.push(`Low ratio ${gear_ratio} — strain wave less efficient, consider planetary`);
    if (gear_ratio > 160) recs.push(`High ratio ${gear_ratio} — verify flex spline fatigue`);
    if (recs.length === 0) recs.push(`Harmonic drive nominal — frame ${selected.frame}, ${selected.rated}Nm rated, η=${(eta * 100).toFixed(0)}%`);

    return {
      frame_size: mkAv(selected.frame, "mm", 0, "torque_selection"),
      rated_torque_Nm: mkAv(selected.rated, "Nm", selected.rated * 0.05, "catalog"),
      peak_torque_Nm: mkAv(selected.peak, "Nm", selected.peak * 0.05, "catalog"),
      torsional_stiffness_Nm_arcmin: mkAv(selected.stiff, "Nm/arcmin", selected.stiff * 0.10, "catalog"),
      lost_motion_arcmin: mkAv(lostMotion, "arcmin", 0.3, "catalog"),
      efficiency_pct: mkAv(eta * 100, "%", 3, "ratio_dependent"),
      weight_kg: mkAv(selected.wt, "kg", selected.wt * 0.05, "catalog"),
      calculated_life_hours: mkAv(Math.round(life), "h", life * 0.20, "torque_life"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const harmonicDriveEngine = new HarmonicDriveEngine();
