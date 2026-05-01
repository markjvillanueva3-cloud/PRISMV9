/**
 * LeadScrewEngine — Lead screw / power screw design
 *
 * Models: Torque to raise/lower (T=Fd×tan(λ+φ)/2), efficiency,
 *         self-locking, critical speed, column buckling
 * References: Shigley Ch.8, ANSI/ASME B1.5
 */

export type ThreadForm = "acme" | "trapezoidal" | "square" | "buttress";

export interface LeadScrewInput {
  major_diameter_mm: number;
  lead_mm: number;
  axial_load_N: number;
  screw_length_mm?: number;           // default 500
  thread_form?: ThreadForm;           // default acme
  friction_coefficient?: number;      // default 0.15
  collar_friction?: number;           // default 0.12
  collar_diameter_mm?: number;        // default 1.5× major
  screw_speed_rpm?: number;           // default 200
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface LeadScrewResult {
  torque_raise_Nm: AtomicValue;
  torque_lower_Nm: AtomicValue;
  efficiency_pct: AtomicValue;
  is_self_locking: AtomicValue;
  linear_velocity_mm_s: AtomicValue;
  power_required_W: AtomicValue;
  critical_speed_rpm: AtomicValue;
  buckling_load_N: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class LeadScrewEngine {
  calculate(input: LeadScrewInput): LeadScrewResult {
    const {
      major_diameter_mm: d,
      lead_mm: l,
      axial_load_N: F,
      screw_length_mm: L = 500,
      thread_form = "acme",
      friction_coefficient: mu = 0.15,
      collar_friction: muc = 0.12,
      screw_speed_rpm: n = 200,
    } = input;

    const recs: string[] = [];
    const dc = input.collar_diameter_mm ?? 1.5 * d;

    // Thread geometry
    const alphaHalf = thread_form === "square" ? 0 : thread_form === "acme" || thread_form === "trapezoidal" ? 14.5 : 7;
    const alphaRad = alphaHalf * Math.PI / 180;

    // Mean diameter (approximate)
    const dm = d - 0.5 * (thread_form === "square" ? l / (Math.PI * d / l) : l / (Math.PI * d / l));
    const dmM = Math.max(dm, d * 0.85); // ensure reasonable

    // Lead angle
    const lambda = Math.atan(l / (Math.PI * dmM));

    // Friction angle (adjusted for thread form)
    const muAdj = mu / Math.cos(alphaRad);
    const phi = Math.atan(muAdj);

    // Torque to raise
    const Tr = F * dmM / 2000 * Math.tan(lambda + phi) + F * muc * dc / 2000;

    // Torque to lower
    const Tl = F * dmM / 2000 * Math.tan(phi - lambda) + F * muc * dc / 2000;

    // Self-locking check (phi > lambda)
    const selfLocking = phi > lambda;

    // Efficiency
    const eta = Math.tan(lambda) / Math.tan(lambda + phi);

    // Linear velocity
    const vLin = l * n / 60; // mm/s

    // Power
    const power = 2 * Math.PI * n / 60 * Tr; // W

    // Critical speed (simply supported)
    const E = 200000; // MPa
    const I = Math.PI / 64 * Math.pow(d * 0.8, 4); // minor diameter
    const Ncrit = 60 / (2 * L * L * 1e-6) * Math.sqrt(E * 1e6 * I * 1e-12 * Math.PI * Math.PI / (7800 * Math.PI / 4 * (d * 0.8 / 1000) ** 2));
    const NcritSimp = 4.72e6 * d * 0.8 / (L * L) * 1000; // simplified

    // Euler buckling
    const Pcr = Math.PI * Math.PI * E * I / (L * L); // N (fixed-free factor = 0.25 applied)

    const isSafe = F < Pcr * 0.5 && n < NcritSimp * 0.8;

    if (F > Pcr * 0.5) recs.push(`Axial load ${F}N > 50% buckling load ${Math.round(Pcr)}N — increase diameter`);
    if (n > NcritSimp * 0.6) recs.push(`Speed near critical ${NcritSimp.toFixed(0)}rpm — reduce speed or shorten`);
    if (!selfLocking) recs.push(`Not self-locking (λ>${(phi * 180 / Math.PI).toFixed(1)}°) — need brake/holding device`);
    if (eta < 0.30) recs.push(`Low efficiency ${(eta * 100).toFixed(0)}% — consider ball screw`);
    if (recs.length === 0) recs.push(`Lead screw nominal — T=${Tr.toFixed(1)}Nm, η=${(eta * 100).toFixed(0)}%, v=${vLin.toFixed(1)}mm/s`);

    return {
      torque_raise_Nm: mkAv(Math.round(Tr * 10) / 10, "Nm", Tr * 0.08, "thread_mechanics"),
      torque_lower_Nm: mkAv(Math.round(Math.max(Tl, 0) * 10) / 10, "Nm", Math.abs(Tl) * 0.08, "thread_mechanics"),
      efficiency_pct: mkAv(Math.round(eta * 1000) / 10, "%", eta * 5, "tan_ratio"),
      is_self_locking: mkAv(selfLocking ? 1 : 0, "boolean", 0, "friction_angle"),
      linear_velocity_mm_s: mkAv(Math.round(vLin * 10) / 10, "mm/s", vLin * 0.02, "kinematics"),
      power_required_W: mkAv(Math.round(power), "W", power * 0.08, "torque_speed"),
      critical_speed_rpm: mkAv(Math.round(NcritSimp), "rpm", NcritSimp * 0.15, "euler_bernoulli"),
      buckling_load_N: mkAv(Math.round(Pcr), "N", Pcr * 0.10, "euler"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const leadScrewEngine = new LeadScrewEngine();
