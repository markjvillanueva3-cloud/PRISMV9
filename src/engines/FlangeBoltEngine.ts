/**
 * FlangeBoltEngine — Flanged joint bolt load and gasket analysis
 *
 * Models: ASME PCC-1 bolt load (Wm1, Wm2), gasket seating,
 *         bolt stress, required torque, flange rating verification
 * References: ASME B16.5, ASME PCC-1, EN 1591
 * Safety: Bolt yield, gasket crush, joint leak tightness
 */

export type FlangeClass = "150" | "300" | "600" | "900" | "1500" | "2500";
export type GasketType = "spiral_wound" | "sheet_fiber" | "ptfe" | "ring_joint"
  | "kamm_profile" | "corrugated_metal";

export interface FlangeBoltInput {
  pipe_od_mm: number;
  design_pressure_bar: number;
  design_temp_C?: number;
  flange_class?: FlangeClass;
  gasket_type?: GasketType;
  bolt_material?: "B7" | "B8" | "L7" | "B16";
  num_bolts?: number;                  // auto-selected
  bolt_diameter_mm?: number;           // auto-selected
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FlangeBoltResult {
  bolt_load_operating_kN: AtomicValue;
  bolt_load_seating_kN: AtomicValue;
  bolt_stress_MPa: AtomicValue;
  bolt_torque_Nm: AtomicValue;
  gasket_stress_MPa: AtomicValue;
  num_bolts: AtomicValue;
  bolt_diameter_mm: AtomicValue;
  hydrostatic_force_kN: AtomicValue;
  flange_rating_adequate: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const GASKET_M: Record<GasketType, { m: number; y_MPa: number }> = {
  spiral_wound:    { m: 3.0, y_MPa: 69 },
  sheet_fiber:     { m: 2.0, y_MPa: 11 },
  ptfe:            { m: 2.0, y_MPa: 7 },
  ring_joint:      { m: 6.5, y_MPa: 179 },
  kamm_profile:    { m: 3.5, y_MPa: 45 },
  corrugated_metal:{ m: 3.0, y_MPa: 38 },
};

const BOLT_PROPS: Record<string, { ys_MPa: number; uts_MPa: number }> = {
  B7:  { ys_MPa: 724, uts_MPa: 862 },
  B8:  { ys_MPa: 207, uts_MPa: 517 },
  L7:  { ys_MPa: 724, uts_MPa: 862 },
  B16: { ys_MPa: 690, uts_MPa: 862 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FlangeBoltEngine {
  calculate(input: FlangeBoltInput): FlangeBoltResult {
    const {
      pipe_od_mm: OD,
      design_pressure_bar: P,
      design_temp_C = 20,
      flange_class = "300",
      gasket_type = "spiral_wound",
      bolt_material = "B7",
    } = input;

    const recs: string[] = [];
    const gp = GASKET_M[gasket_type];
    const bp = BOLT_PROPS[bolt_material];
    const P_MPa = P * 0.1;

    // Gasket geometry (simplified)
    const gasketOD = OD + 30; // mm
    const gasketID = OD;
    const gasketWidth = (gasketOD - gasketID) / 2;
    const G = (gasketOD + gasketID) / 2; // mean gasket diameter
    const b = gasketWidth / 2; // effective seating width
    const gasketArea = Math.PI * G * b; // mm²

    // Hydrostatic end force: H = π/4 × G² × P
    const H = Math.PI / 4 * G * G * P_MPa / 1000; // kN

    // ASME Wm1 (operating): Wm1 = H + 2×b×π×G×m×P
    const Wm1 = H + 2 * b * Math.PI * G * gp.m * P_MPa / 1000; // kN

    // ASME Wm2 (seating): Wm2 = π×b×G×y
    const Wm2 = Math.PI * b * G * gp.y_MPa / 1000; // kN

    const W = Math.max(Wm1, Wm2);

    // Bolt sizing
    let nBolts = input.num_bolts;
    let boltDia = input.bolt_diameter_mm;
    if (!nBolts || !boltDia) {
      // Rule: bolt circle ≈ OD + 80mm, bolts spaced 3-4× bolt dia
      boltDia = boltDia ?? (OD < 100 ? 16 : OD < 300 ? 20 : OD < 600 ? 24 : 30);
      const boltCircle = Math.PI * (OD + 80);
      nBolts = nBolts ?? Math.max(4, Math.ceil(boltCircle / (boltDia * 3.5)));
      nBolts = Math.ceil(nBolts / 4) * 4; // round to multiple of 4
    }

    // Bolt stress
    const boltArea = Math.PI * boltDia * boltDia / 4 * 0.75; // stress area ≈ 75%
    const totalBoltArea = nBolts * boltArea;
    const boltStress = W * 1000 / totalBoltArea;

    // Bolt torque: T = K × D × F, K ≈ 0.18 for lubricated
    const forcePerBolt = W * 1000 / nBolts; // N
    const boltTorque = 0.18 * (boltDia / 1000) * forcePerBolt;

    // Gasket stress
    const gasketStress = W * 1000 / gasketArea;

    // Flange rating check (simplified — class vs pressure)
    const classRating: Record<string, number> = {
      "150": 19.6, "300": 51.1, "600": 102.1,
      "900": 153.2, "1500": 255.3, "2500": 425.5,
    };
    const maxP = classRating[flange_class] ?? 51.1;
    const ratingOk = P_MPa <= maxP;

    const sf = bp.ys_MPa / Math.max(boltStress, 1);
    const isSafe = sf >= 1.5 && ratingOk && gasketStress < gp.y_MPa * 3;

    if (sf < 2.0) recs.push(`Bolt stress SF=${sf.toFixed(2)} — increase bolt size or count`);
    if (!ratingOk) recs.push(`Pressure ${P}bar exceeds Class ${flange_class} rating — upgrade class`);
    if (gasketStress > gp.y_MPa * 2) recs.push(`High gasket stress ${gasketStress.toFixed(0)}MPa — verify crush resistance`);
    if (design_temp_C > 400 && bolt_material === "B7") recs.push(`B7 bolts at ${design_temp_C}°C — use B16 for high temp`);
    if (recs.length === 0) recs.push(`Flange joint nominal — ${nBolts}×M${boltDia}, ${boltTorque.toFixed(0)}Nm torque`);

    return {
      bolt_load_operating_kN: mkAv(Math.round(Wm1 * 10) / 10, "kN", Wm1 * 0.05, "asme_pcc1"),
      bolt_load_seating_kN: mkAv(Math.round(Wm2 * 10) / 10, "kN", Wm2 * 0.05, "asme_pcc1"),
      bolt_stress_MPa: mkAv(Math.round(boltStress * 10) / 10, "MPa", boltStress * 0.08, "load_area"),
      bolt_torque_Nm: mkAv(Math.round(boltTorque), "Nm", boltTorque * 0.15, "torque_formula"),
      gasket_stress_MPa: mkAv(Math.round(gasketStress * 10) / 10, "MPa", gasketStress * 0.10, "load_area"),
      num_bolts: mkAv(nBolts, "bolts", 0, "spacing_rule"),
      bolt_diameter_mm: mkAv(boltDia, "mm", 0, "sizing_rule"),
      hydrostatic_force_kN: mkAv(Math.round(H * 10) / 10, "kN", H * 0.03, "pressure_area"),
      flange_rating_adequate: mkAv(ratingOk ? 1 : 0, "boolean", 0, "b16_5"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const flangeBoltEngine = new FlangeBoltEngine();
