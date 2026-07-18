/**
 * RollingBearingEngine — Rolling element bearing analysis
 *
 * Models: ISO 281 basic rating life (L10), adjusted life (L10a),
 *         equivalent dynamic load, static safety factor, speed limits
 * References: ISO 281:2007, SKF General Catalogue
 */

export type BearingType = "deep_groove" | "angular_contact" | "cylindrical_roller" | "tapered_roller" | "spherical_roller" | "thrust_ball";

export interface RollingBearingInput {
  bearing_type?: BearingType;
  dynamic_capacity_kN: number;       // C — basic dynamic load rating
  static_capacity_kN?: number;       // C0, default 0.6×C
  radial_load_kN: number;
  axial_load_kN?: number;            // default 0
  speed_rpm: number;
  reliability?: number;              // 0-1, default 0.90 (L10)
  contamination_factor?: number;     // eC, default 0.5
  viscosity_ratio?: number;          // kappa, default 1.0
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RollingBearingResult {
  equivalent_load_kN: AtomicValue;
  basic_life_Mrev: AtomicValue;
  basic_life_hours: AtomicValue;
  adjusted_life_hours: AtomicValue;
  static_safety_factor: AtomicValue;
  dn_value: AtomicValue;
  power_loss_W: AtomicValue;
  min_load_kN: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Bearing params: [life_exponent, X_radial, Y_axial, e_threshold, friction_coeff]
const BEARING_DATA: Record<BearingType, [number, number, number, number, number]> = {
  deep_groove:       [3, 1.0, 0.50, 0.22, 0.0015],
  angular_contact:   [3, 1.0, 0.73, 0.68, 0.0020],
  cylindrical_roller:[10/3, 1.0, 0, 0, 0.0011],
  tapered_roller:    [10/3, 0.4, 1.50, 0.40, 0.0018],
  spherical_roller:  [10/3, 1.0, 2.10, 0.27, 0.0025],
  thrust_ball:       [3, 0, 1.0, 0, 0.0013],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RollingBearingEngine {
  calculate(input: RollingBearingInput): RollingBearingResult {
    const {
      bearing_type = "deep_groove",
      dynamic_capacity_kN: C,
      radial_load_kN: Fr,
      axial_load_kN: Fa = 0,
      speed_rpm: n,
      reliability = 0.90,
      contamination_factor: eC = 0.5,
      viscosity_ratio: kappa = 1.0,
    } = input;
    const C0 = input.static_capacity_kN ?? C * 0.6;

    const recs: string[] = [];
    const [p, X, Y, e, mu] = BEARING_DATA[bearing_type];

    // Equivalent dynamic load P = X×Fr + Y×Fa
    let P: number;
    if (Fa / (Fr + 0.001) <= e || Y === 0) {
      P = Fr; // pure radial or below threshold
    } else {
      P = X * Fr + Y * Fa;
    }
    P = Math.max(P, 0.001);

    // Basic rating life L10 (millions of revolutions)
    const L10_Mrev = Math.pow(C / P, p);
    const L10_hours = L10_Mrev * 1e6 / (60 * Math.max(n, 1));

    // Reliability adjustment (a1)
    const a1 = reliability <= 0.90 ? 1.0 :
      reliability <= 0.95 ? 0.64 :
      reliability <= 0.96 ? 0.55 :
      reliability <= 0.97 ? 0.47 :
      reliability <= 0.98 ? 0.37 :
      reliability <= 0.99 ? 0.25 : 0.093;

    // Life modification factor (a_ISO)
    const aISO = Math.min(50, eC * Math.pow(kappa, 0.5) * 2);

    // Adjusted life
    const L10a_hours = a1 * aISO * L10_hours;

    // Static safety factor
    const s0 = C0 / P;

    // DN value (bore approx from C)
    const bore_mm = Math.pow(C / 0.5, 1 / 1.8) * 5; // rough estimate
    const dn = bore_mm * n;

    // Power loss
    const powerLoss = mu * P * 1000 * Math.PI * bore_mm / 1000 * n / 60; // W (simplified)

    // Minimum load (0.02×C for ball, 0.02×C for roller)
    const minLoad = 0.02 * C;

    const isSafe = s0 > 1.0 && L10_hours > 1000 && P > minLoad;

    if (s0 < 1.5) recs.push(`Static safety factor s0=${s0.toFixed(2)} — minimum 1.5 recommended`);
    if (L10_hours < 5000) recs.push(`Short L10 life ${L10_hours.toFixed(0)}h — consider larger bearing`);
    if (dn > 500000) recs.push(`DN=${(dn / 1000).toFixed(0)}k — exceeds typical grease limit, use oil`);
    if (P < minLoad) recs.push(`Load ${P.toFixed(2)}kN < minimum ${minLoad.toFixed(2)}kN — skidding risk`);
    if (recs.length === 0) recs.push(`Bearing nominal — L10=${L10_hours.toFixed(0)}h, s0=${s0.toFixed(1)}, DN=${(dn / 1000).toFixed(0)}k`);

    return {
      equivalent_load_kN: mkAv(Math.round(P * 100) / 100, "kN", P * 0.05, "iso281"),
      basic_life_Mrev: mkAv(Math.round(L10_Mrev * 10) / 10, "Mrev", L10_Mrev * 0.10, "iso281"),
      basic_life_hours: mkAv(Math.round(L10_hours), "hours", L10_hours * 0.10, "iso281"),
      adjusted_life_hours: mkAv(Math.round(L10a_hours), "hours", L10a_hours * 0.20, "iso281_adjusted"),
      static_safety_factor: mkAv(Math.round(s0 * 100) / 100, "ratio", s0 * 0.05, "C0_P"),
      dn_value: mkAv(Math.round(dn), "mm·rpm", dn * 0.10, "bore_speed"),
      power_loss_W: mkAv(Math.round(powerLoss * 10) / 10, "W", powerLoss * 0.25, "friction"),
      min_load_kN: mkAv(Math.round(minLoad * 100) / 100, "kN", minLoad * 0.10, "skid_prevent"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rollingBearingEngine = new RollingBearingEngine();
