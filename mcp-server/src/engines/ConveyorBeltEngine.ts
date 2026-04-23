/**
 * ConveyorBeltEngine — Belt Conveyor Design Calculator
 *
 * Models: Flat and troughed belt conveyor systems.
 * - Belt tension from CEMA methodology
 * - Drive power from friction and lift
 * - Belt speed and capacity
 * - Sag between idlers
 * - Take-up force and counterweight
 * - Belt selection (ply rating)
 *
 * Key physics: Te = L×f×g×(2mi + mm + mb) + H×g×mm.
 * P = Te×v. Belt sag = w×l²/(8×T).
 *
 * Reference: CEMA — Belt Conveyors for Bulk Materials,
 *            DIN 22101 — Belt Conveyors,
 *            IS 11592 — Belt Conveyor Design
 *
 * Actions: conveyor_belt_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ConveyorBeltInput {
  belt_length_m?: number;
  lift_height_m?: number;
  belt_speed_m_s?: number;
  capacity_tph?: number;
  material_density_kg_m3?: number;
  belt_width_mm?: number;
  idler_spacing_m?: number;
  friction_factor?: number;
  drive_efficiency?: number;
  incline_deg?: number;
}

export interface ConveyorBeltResult {
  effective_tension: AtomicValue;
  drive_power: AtomicValue;
  motor_power: AtomicValue;
  belt_capacity: AtomicValue;
  tight_side_tension: AtomicValue;
  slack_side_tension: AtomicValue;
  counterweight: AtomicValue;
  belt_sag_pct: AtomicValue;
  min_belt_rating: AtomicValue;
  material_cross_section: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class ConveyorBeltEngine {
  calculate(input: ConveyorBeltInput): ConveyorBeltResult {
    const warnings: string[] = [];
    const Lconv = input.belt_length_m ?? 100;
    const H = input.lift_height_m ?? 5;
    const v = input.belt_speed_m_s ?? 1.5;
    const Q = input.capacity_tph ?? 200;
    const rho = input.material_density_kg_m3 ?? 1500;
    const bw = input.belt_width_mm ?? 800;
    const Si = input.idler_spacing_m ?? 1.2;
    const f = input.friction_factor ?? 0.025;
    const etaDrive = input.drive_efficiency ?? 0.90;
    const incDeg = input.incline_deg
      ?? (Lconv > 0 ? Math.atan(H / Lconv) * 180 / Math.PI : 0);

    const g = 9.81;

    // Material load (kg/m)
    const mm = v > 0 ? Q / (3.6 * v) : 0;

    // Belt mass (kg/m) — approx from width
    const mb = bw * 0.012; // ~12 kg/m per m width

    // Idler mass per meter (kg/m)
    const mi = 15; // typical rotating mass

    // Effective tension (CEMA simplified)
    const Tfriction = Lconv * f * g
      * (2 * mi + mm + mb);
    const Tlift = H * g * mm;
    const Te = Tfriction + Tlift;

    // Drive power
    const Pdrive = Te * v / 1000; // kW
    const Pmotor = Pdrive / etaDrive;

    // Belt tensions (wrap factor μ=0.35, wrap=210°)
    const Cw = 1.0 / (Math.exp(0.35 * 210 * Math.PI / 180) - 1);
    const T2 = Te * Cw; // slack side
    const T1 = Te + T2; // tight side

    // Counterweight (2 × T2 for gravity take-up)
    const Wcw = 2 * T2 / g;

    // Belt sag percentage
    const wLoad = (mm + mb) * g; // N/m
    const sagMm = Si > 0
      ? wLoad * Si * Si / (8 * Math.max(T2, 100)) * 1000
      : 0;
    const sagPct = Si > 0 ? sagMm / (Si * 1000) * 100 : 0;

    // Cross-section area for capacity
    const Across = v > 0
      ? Q / (3600 * rho / 1000 * v)
      : 0;

    // Belt capacity (theoretical max from width)
    const maxQ = 3600 * (bw / 1000) * (bw / 1000)
      * 0.07 * rho / 1000 * v; // tph approx

    // Min belt rating (kN/m)
    const beltRating = T1 / (bw / 1000) / 1000 * 10; // safety 10:1

    // Warnings
    if (sagPct > 3) {
      warnings.push(
        `Belt sag ${r1(sagPct)}% > 3% — reduce idler spacing`
      );
    }
    if (incDeg > 18) {
      warnings.push(
        `Incline ${r0(incDeg)}° > 18° — material may slide back`
      );
    }
    if (v > 5) {
      warnings.push(
        `Belt speed ${v} m/s > 5 — dust/spillage risk`
      );
    }
    if (Q > maxQ) {
      warnings.push(
        `Capacity ${Q} tph exceeds belt max ${r0(maxQ)} tph`
      );
    }
    if (Pmotor > 500) {
      warnings.push(
        `Motor ${r0(Pmotor)} kW — consider dual drive`
      );
    }
    if (T2 < 1000) {
      warnings.push("Low slack tension — belt may slip on drive");
    }

    const src = "ConveyorBeltEngine (CEMA/DIN 22101)";

    return {
      effective_tension: mkAv(r0(Te), "N", Te * 0.1,
        `friction + lift`),
      drive_power: mkAv(r1(Pdrive), "kW", Pdrive * 0.1,
        `Te×v`),
      motor_power: mkAv(r1(Pmotor), "kW", Pmotor * 0.1,
        `η=${etaDrive}`),
      belt_capacity: mkAv(r0(maxQ), "tph", maxQ * 0.15,
        `${bw}mm belt`),
      tight_side_tension: mkAv(r0(T1), "N", T1 * 0.1,
        `Te+T2`),
      slack_side_tension: mkAv(r0(T2), "N", T2 * 0.1,
        `Te×Cw`),
      counterweight: mkAv(r0(Wcw), "kg", Wcw * 0.1,
        `2×T2/g`),
      belt_sag_pct: mkAv(r2(sagPct), "%", sagPct * 0.15,
        `wl²/(8T) at ${Si}m`),
      min_belt_rating: mkAv(r0(beltRating), "kN/m",
        beltRating * 0.1, "10:1 SF"),
      material_cross_section: mkAv(r2(Across), "m²",
        Across * 0.1, src),
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
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const conveyorBeltEngine = new ConveyorBeltEngine();
