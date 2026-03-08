/**
 * BucketElevatorEngine — Bucket elevator capacity, power, and belt sizing
 *
 * Models: CEMA capacity (Q = V×Bph×ρ×fill), discharge analysis,
 *         centrifugal vs gravity discharge, belt tension
 * References: CEMA #300, Continental Conveyors
 * Safety: Belt tension limits, bucket speed, head shaft torque
 */

export type DischargeType = "centrifugal" | "gravity" | "continuous";
export type BucketStyle = "aa" | "aa_heavy" | "sc" | "sc_heavy";

export interface BucketElevatorInput {
  capacity_tph: number;
  lift_height_m: number;
  material_density_kg_m3?: number;     // default 800
  discharge_type?: DischargeType;
  bucket_style?: BucketStyle;
  bucket_width_mm?: number;            // auto-sized
  belt_speed_m_s?: number;             // default based on discharge
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BucketElevatorResult {
  drive_power_kW: AtomicValue;
  belt_speed_m_s: AtomicValue;
  bucket_width_mm: AtomicValue;
  bucket_spacing_mm: AtomicValue;
  buckets_per_min: AtomicValue;
  belt_tension_kN: AtomicValue;
  head_shaft_torque_Nm: AtomicValue;
  bucket_fill_pct: AtomicValue;
  discharge_velocity_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const STD_WIDTHS = [150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900];

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BucketElevatorEngine {
  calculate(input: BucketElevatorInput): BucketElevatorResult {
    const {
      capacity_tph: C,
      lift_height_m: H,
      material_density_kg_m3: rho = 800,
      discharge_type = "centrifugal",
      bucket_style = "aa",
    } = input;

    const recs: string[] = [];

    // Belt speed
    const vBelt = input.belt_speed_m_s ?? (
      discharge_type === "centrifugal" ? 2.0
      : discharge_type === "gravity" ? 1.2 : 0.8
    );

    // Bucket sizing
    // Volume per bucket (liters): V ≈ 0.6 × W² × 0.001 (simplified)
    let bw = input.bucket_width_mm;
    if (!bw) {
      // Auto-size: need Q m³/h = C×1000/rho
      const Qm3h = C * 1000 / rho;
      // Q = V_bucket × buckets/h × fill_factor
      // buckets/h = v_belt × 3600 / spacing
      // Try each width
      for (const w of STD_WIDTHS) {
        const Vbucket = 0.6 * w * w * 1e-6; // m³ (approximate)
        const spacing = w * 2; // bucket spacing ≈ 2× width
        const bph = vBelt * 1000 * 3600 / spacing;
        const cap = Vbucket * bph * 0.75 * rho / 1000; // tph
        if (cap >= C) { bw = w; break; }
      }
      bw = bw ?? STD_WIDTHS[STD_WIDTHS.length - 1];
    }

    const spacing = bw * 2;
    const Vbucket = 0.6 * bw * bw * 1e-6; // m³
    const bph = vBelt * 1000 * 3600 / spacing;
    const fillPct = (C * 1000 / rho) / (Vbucket * bph) * 100;

    // Drive power: P = (C × H × 9.81) / (3600 × η)
    const eta = 0.85;
    const Pmaterial = C * 1000 * 9.81 * H / (3600 * 1000 * eta);
    // Empty belt/chain power ≈ 20% of material power
    const Pempty = Pmaterial * 0.20;
    const totalPower = (Pmaterial + Pempty) * 1.15; // 15% margin

    // Belt tension
    const beltTension = C * 1000 / 3600 * 9.81 * H / (vBelt * 1000) + Pempty * 1000 / vBelt;

    // Head shaft torque
    const headPulleyDia = bw * 1.5; // mm
    const torque = totalPower * 1000 / (2 * Math.PI * vBelt / (headPulleyDia / 2000));

    // Discharge velocity
    const dischargeV = vBelt;

    const isSafe = fillPct <= 85 && vBelt <= 3.5;

    if (fillPct > 75) recs.push(`High bucket fill ${fillPct.toFixed(0)}% — risk of spillage, increase bucket size`);
    if (vBelt > 3.0) recs.push(`High belt speed ${vBelt.toFixed(1)}m/s — wear and noise increase`);
    if (H > 50) recs.push(`Tall elevator ${H}m — verify belt tension and takeup travel`);
    if (discharge_type === "centrifugal" && vBelt < 1.5) recs.push(`Low speed for centrifugal discharge — material won't clear`);
    if (recs.length === 0) recs.push(`Bucket elevator nominal — ${bw}mm buckets, ${vBelt}m/s, ${totalPower.toFixed(1)}kW`);

    return {
      drive_power_kW: mkAv(Math.round(totalPower * 10) / 10, "kW", totalPower * 0.12, "cema_formula"),
      belt_speed_m_s: mkAv(vBelt, "m/s", vBelt * 0.05, "discharge_type"),
      bucket_width_mm: mkAv(bw, "mm", 0, "capacity_sizing"),
      bucket_spacing_mm: mkAv(spacing, "mm", 0, "width_ratio"),
      buckets_per_min: mkAv(Math.round(bph / 60), "bpm", bph / 60 * 0.05, "speed_spacing"),
      belt_tension_kN: mkAv(Math.round(beltTension * 10) / 10 / 1000, "kN", beltTension / 1000 * 0.12, "force_balance"),
      head_shaft_torque_Nm: mkAv(Math.round(torque), "Nm", torque * 0.12, "power_speed"),
      bucket_fill_pct: mkAv(Math.round(fillPct * 10) / 10, "%", fillPct * 0.10, "capacity_ratio"),
      discharge_velocity_m_s: mkAv(dischargeV, "m/s", dischargeV * 0.05, "belt_speed"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const bucketElevatorEngine = new BucketElevatorEngine();
