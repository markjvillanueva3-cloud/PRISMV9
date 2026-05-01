/**
 * BallMillEngine — Ball Mill Sizing & Power Calculator
 *
 * Models: Tumbling ball mill for grinding/milling.
 * - Critical speed Nc = 42.3/√D
 * - Operating speed as % of critical
 * - Bond work index power estimation
 * - Ball charge volume and weight
 * - Mill throughput capacity
 * - Grinding media sizing
 *
 * Key physics: Nc = 42.3/√(D-d). P = Wi×Q×(10/√P80 - 10/√F80).
 * Charge volume ~40% of mill volume.
 *
 * Reference: Bond — Crushing and Grinding Calculations,
 *            SME Mining Engineering Handbook,
 *            Metso Grinding Handbook
 *
 * Actions: ball_mill_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BallMillInput {
  mill_diameter_m?: number;
  mill_length_m?: number;
  ball_diameter_mm?: number;
  operating_speed_pct?: number;
  feed_size_um?: number;
  product_size_um?: number;
  work_index_kwh_t?: number;
  throughput_tph?: number;
  ball_density_kg_m3?: number;
  charge_volume_pct?: number;
}

export interface BallMillResult {
  critical_speed: AtomicValue;
  operating_speed: AtomicValue;
  power_required: AtomicValue;
  ball_charge_weight: AtomicValue;
  mill_volume: AtomicValue;
  specific_energy: AtomicValue;
  reduction_ratio: AtomicValue;
  ball_top_size: AtomicValue;
  residence_time: AtomicValue;
  power_intensity: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class BallMillEngine {
  calculate(input: BallMillInput): BallMillResult {
    const warnings: string[] = [];
    const D = input.mill_diameter_m ?? 3.0;
    const L = input.mill_length_m ?? 4.5;
    const dBall = input.ball_diameter_mm ?? 50;
    const opPct = input.operating_speed_pct ?? 75;
    const F80 = input.feed_size_um ?? 5000;
    const P80 = input.product_size_um ?? 75;
    const Wi = input.work_index_kwh_t ?? 15;
    const Q = input.throughput_tph ?? 50;
    const rhoBall = input.ball_density_kg_m3 ?? 7800;
    const Jcharge = (input.charge_volume_pct ?? 40) / 100;

    // Critical speed (RPM)
    const dBallM = dBall / 1000;
    const Nc = 42.3 / Math.sqrt(D - dBallM);

    // Operating speed
    const Nop = Nc * opPct / 100;

    // Mill volume
    const Vmill = Math.PI / 4 * D * D * L; // m³

    // Ball charge
    const Vballs = Vmill * Jcharge;
    const bulkDensity = rhoBall * 0.6; // packing ~60%
    const Wballs = Vballs * bulkDensity / 1000; // tonnes

    // Bond power equation: P = 10×Wi×Q×(1/√P80 - 1/√F80)
    const Pbond = 10 * Wi * Q
      * (1 / Math.sqrt(P80) - 1 / Math.sqrt(F80)); // kW

    // Specific energy
    const specEnergy = Q > 0 ? Pbond / Q : 0; // kWh/t

    // Reduction ratio
    const RR = F80 / Math.max(P80, 1);

    // Bond ball sizing: B = (F80/K)^0.5 × (ρ×Wi/(100×%Nc×√D))^0.33
    const K = 350; // constant for wet grinding
    const Btop = Math.pow(F80 / K, 0.5)
      * Math.pow(rhoBall / 1000 * Wi
        / (100 * opPct / 100 * Math.sqrt(D * 1000)), 0.33)
      * 25.4; // mm

    // Residence time (minutes)
    const Vhold = Vmill * (1 - Jcharge) * 0.4; // hold-up ~40% of void
    const rhoSlurry = 1.5; // t/m³
    const tRes = Q > 0
      ? Vhold * rhoSlurry * 60 / Q
      : 0;

    // Power intensity (kW/m³)
    const Pi = Vmill > 0 ? Pbond / Vmill : 0;

    // Warnings
    if (opPct > 90) {
      warnings.push(
        `Operating at ${opPct}% critical — cataracting regime`
      );
    }
    if (opPct < 60) {
      warnings.push(
        `Operating at ${opPct}% critical — cascading too slow`
      );
    }
    if (RR > 100) {
      warnings.push(
        `Reduction ratio ${r0(RR)} > 100 — use two-stage grinding`
      );
    }
    if (Jcharge > 0.45) {
      warnings.push("Charge volume > 45% — overloading risk");
    }
    if (specEnergy > 30) {
      warnings.push(
        `Specific energy ${r1(specEnergy)} kWh/t very high`
      );
    }
    if (dBall > 100) {
      warnings.push("Ball size > 100mm — check liner compatibility");
    }

    const src = "BallMillEngine (Bond/SME)";

    return {
      critical_speed: mkAv(r1(Nc), "RPM",
        Nc * 0.02, `42.3/√(D-d)`),
      operating_speed: mkAv(r1(Nop), "RPM", 0,
        `${opPct}% of Nc`),
      power_required: mkAv(r0(Pbond), "kW",
        Pbond * 0.15, "Bond equation"),
      ball_charge_weight: mkAv(r1(Wballs), "tonnes",
        Wballs * 0.1, `${r0(Jcharge * 100)}% fill`),
      mill_volume: mkAv(r1(Vmill), "m³", 0,
        `πD²L/4`),
      specific_energy: mkAv(r1(specEnergy), "kWh/t",
        specEnergy * 0.15, `P/Q`),
      reduction_ratio: mkAv(r0(RR), ":1", 0,
        `F80/P80`),
      ball_top_size: mkAv(r0(Btop), "mm",
        Btop * 0.15, "Bond formula"),
      residence_time: mkAv(r1(tRes), "min",
        tRes * 0.2, "hold-up based"),
      power_intensity: mkAv(r1(Pi), "kW/m³",
        Pi * 0.15, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }

export const ballMillEngine = new BallMillEngine();
