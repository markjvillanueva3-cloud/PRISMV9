/**
 * GearTrainEngine — Spur & Helical Gear Pair Calculator
 *
 * Models: Gear geometry, Lewis bending stress, Hertz contact stress.
 * - Module/DP sizing, pitch circle, center distance
 * - Lewis bending stress: σ = Wt/(F×m×Y) × Ka×Kv×Km
 * - AGMA contact stress: σc = Cp × √(Wt×Ka×Kv×Km/(F×d×I))
 * - Gear ratio, output speed/torque
 * - Efficiency per mesh (~98% spur, ~97% helical)
 *
 * Reference: AGMA 2001-D04 (fundamental rating factors),
 *            ISO 6336 (gear strength calculation),
 *            Shigley Ch.13 (Gears — General)
 *
 * Actions: gear_train_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface GearTrainInput {
  module_mm?: number;
  pinion_teeth?: number;
  gear_teeth?: number;
  face_width_mm?: number;
  input_power_kw?: number;
  input_rpm?: number;
  pressure_angle_deg?: number;
  helix_angle_deg?: number;
  pinion_material_yield_mpa?: number;
  gear_material_yield_mpa?: number;
  hardness_hrc?: number;
  application_factor?: number;
  quality_grade?: number;
}

export interface GearTrainResult {
  gear_ratio: AtomicValue;
  output_rpm: AtomicValue;
  output_torque: AtomicValue;
  center_distance: AtomicValue;
  pitch_diameter_pinion: AtomicValue;
  pitch_diameter_gear: AtomicValue;
  tangential_force: AtomicValue;
  lewis_bending_stress: AtomicValue;
  contact_stress: AtomicValue;
  bending_safety_factor: AtomicValue;
  contact_safety_factor: AtomicValue;
  mesh_efficiency: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Lewis form factor Y by number of teeth (20° full-depth) */
const LEWIS_Y: [number, number][] = [
  [12, 0.245], [14, 0.276], [16, 0.295], [18, 0.309],
  [20, 0.322], [24, 0.337], [28, 0.353], [32, 0.365],
  [40, 0.389], [50, 0.408], [60, 0.422], [80, 0.436],
  [100, 0.446], [150, 0.458], [200, 0.463], [300, 0.471],
];

function getLewisY(teeth: number): number {
  if (teeth <= LEWIS_Y[0][0]) return LEWIS_Y[0][1];
  for (let i = 1; i < LEWIS_Y.length; i++) {
    if (teeth <= LEWIS_Y[i][0]) {
      const frac = (teeth - LEWIS_Y[i - 1][0]) /
        (LEWIS_Y[i][0] - LEWIS_Y[i - 1][0]);
      return LEWIS_Y[i - 1][1] + frac * (LEWIS_Y[i][1] - LEWIS_Y[i - 1][1]);
    }
  }
  return LEWIS_Y[LEWIS_Y.length - 1][1];
}

/** AGMA elastic coefficient Cp for steel-on-steel */
const CP_STEEL = 191; // √MPa

/** Dynamic factor Kv by AGMA quality (simplified) */
function calcKv(quality: number, pitchLineVel: number): number {
  // Barth equation approximation
  const B = 0.25 * (12 - quality) ** (2 / 3);
  const A = 50 + 56 * (1 - B);
  return ((A + Math.sqrt(pitchLineVel)) / A) ** B;
}

// ── Engine ─────────────────────────────────────────────────────────

export class GearTrainEngine {
  calculate(input: GearTrainInput): GearTrainResult {
    const warnings: string[] = [];
    const m = input.module_mm ?? 3;
    const Np = input.pinion_teeth ?? 20;
    const Ng = input.gear_teeth ?? 60;
    const F = input.face_width_mm ?? (m * 10);
    const P = input.input_power_kw ?? 5;
    const n1 = input.input_rpm ?? 1500;
    const phi = (input.pressure_angle_deg ?? 20) * Math.PI / 180;
    const helixDeg = input.helix_angle_deg ?? 0;
    const helix = helixDeg * Math.PI / 180;
    const Ka = input.application_factor ?? 1.25;
    const quality = input.quality_grade ?? 8;

    // Geometry
    const ratio = Ng / Np;
    const dp = m * Np; // pinion pitch diameter
    const dg = m * Ng; // gear pitch diameter
    const cd = (dp + dg) / 2; // center distance

    // Output
    const n2 = n1 / ratio;
    const torqueIn = (P * 1000 * 60) / (2 * Math.PI * n1); // N·m
    const eff = helixDeg > 0 ? 0.97 : 0.98;
    const torqueOut = torqueIn * ratio * eff;

    // Tangential force on pinion
    const Wt = (torqueIn * 1000 * 2) / dp; // N (torque N·m → N·mm)

    // Pitch line velocity (m/s)
    const V = Math.PI * dp * n1 / 60000;

    // Dynamic factor
    const Kv = calcKv(quality, V);

    // Size factor Ks ≈ 1.0 for module ≤ 5
    const Ks = m <= 5 ? 1.0 : 1.0 + (m - 5) * 0.02;

    // Load distribution Km
    const Km = F / dp <= 0.5 ? 1.3 : F / dp <= 1.0 ? 1.5 : 1.7;

    // Lewis bending stress (pinion — weaker)
    const Yp = getLewisY(Np);
    const sigmaB = (Wt * Ka * Kv * Ks * Km) / (F * m * Yp);

    // AGMA geometry factor I (for contact stress)
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const I = (sinPhi * cosPhi) / 2 * (ratio / (ratio + 1));

    // Contact stress
    const sigmaC = CP_STEEL * Math.sqrt(
      (Wt * Ka * Kv * Km) / (F * dp * I)
    );

    // Allowable stresses
    const yieldP = input.pinion_material_yield_mpa ?? 600;
    const hrc = input.hardness_hrc ?? 55;
    // AGMA allowable bending ≈ 0.33 × yield
    const sigmaAllowB = yieldP * 0.33;
    // AGMA allowable contact ≈ 2.8 × HRC (simplified)
    const sigmaAllowC = hrc * 28;

    // Safety factors
    const sfBend = sigmaAllowB / Math.max(sigmaB, 0.01);
    const sfContact = sigmaAllowC / Math.max(sigmaC, 0.01);

    // Warnings
    if (Np < 14) {
      warnings.push(`Pinion ${Np} teeth < 14 — interference risk at 20° pressure angle`);
    }
    if (sfBend < 1.5) {
      warnings.push(`Bending SF=${r2(sfBend)} < 1.5 — increase module or face width`);
    }
    if (sfContact < 1.2) {
      warnings.push(`Contact SF=${r2(sfContact)} < 1.2 — increase hardness or module`);
    }
    if (F / dp > 2.0) {
      warnings.push(`Face width ratio F/d=${r1(F / dp)} > 2.0 — uneven load distribution`);
    }
    if (V > 25) {
      warnings.push(`Pitch line velocity ${r1(V)} m/s — use high quality (AGMA 10+)`);
    }

    const src = "GearTrainEngine (AGMA 2001/ISO 6336)";

    return {
      gear_ratio: mkAv(r2(ratio), ":1", 0, `${Ng}/${Np}`),
      output_rpm: mkAv(r1(n2), "RPM", 1, `${n1}/${r2(ratio)}`),
      output_torque: mkAv(r1(torqueOut), "N·m", torqueOut * 0.02, src),
      center_distance: mkAv(r1(cd), "mm", 0.05, `(${dp}+${dg})/2`),
      pitch_diameter_pinion: mkAv(r1(dp), "mm", 0, `${m}×${Np}`),
      pitch_diameter_gear: mkAv(r1(dg), "mm", 0, `${m}×${Ng}`),
      tangential_force: mkAv(r0(Wt), "N", Wt * 0.05, src),
      lewis_bending_stress: mkAv(r0(sigmaB), "MPa", sigmaB * 0.1, "Lewis/AGMA"),
      contact_stress: mkAv(r0(sigmaC), "MPa", sigmaC * 0.1, "AGMA Cp=191"),
      bending_safety_factor: mkAv(r2(sfBend), "×", 0.1, src),
      contact_safety_factor: mkAv(r2(sfContact), "×", 0.1, src),
      mesh_efficiency: mkAv(r2(eff), "factor", 0.005, helixDeg > 0 ? "helical" : "spur"),
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

export const gearTrainEngine = new GearTrainEngine();
