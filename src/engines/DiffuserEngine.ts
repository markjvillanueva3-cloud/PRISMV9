/**
 * DiffuserEngine — Subsonic/supersonic diffuser design
 *
 * Models: Pressure recovery (Cp), area ratio, boundary layer,
 *         stall limits, conical/annular geometry
 * References: ESDU 75024, Sovran & Klomp diffuser data
 */

export type DiffuserGeometry = "conical" | "annular" | "rectangular" | "radial";

export interface DiffuserInput {
  inlet_diameter_mm: number;
  outlet_diameter_mm: number;
  length_mm: number;
  inlet_velocity_m_s: number;
  fluid_density_kg_m3?: number;       // default 1.225
  geometry?: DiffuserGeometry;
  inlet_mach?: number;                // default subsonic
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface DiffuserResult {
  area_ratio: AtomicValue;
  half_angle_deg: AtomicValue;
  ideal_cp: AtomicValue;
  actual_cp: AtomicValue;
  pressure_recovery_Pa: AtomicValue;
  outlet_velocity_m_s: AtomicValue;
  diffuser_efficiency_pct: AtomicValue;
  stall_margin_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class DiffuserEngine {
  calculate(input: DiffuserInput): DiffuserResult {
    const {
      inlet_diameter_mm: D1,
      outlet_diameter_mm: D2,
      length_mm: L,
      inlet_velocity_m_s: V1,
      fluid_density_kg_m3: rho = 1.225,
      geometry = "conical",
    } = input;

    const recs: string[] = [];

    // Area ratio
    const AR = (D2 * D2) / (D1 * D1);

    // Half angle
    const halfAngle = Math.atan((D2 - D1) / (2 * L)) * 180 / Math.PI;

    // Ideal pressure recovery coefficient
    const CpIdeal = 1 - 1 / (AR * AR);

    // Actual Cp (depends on half angle and L/D1)
    // Sovran-Klomp: optimal around 3-4° half angle for conical
    const LD = L / D1;
    let etaDiff: number;
    if (halfAngle <= 4) {
      etaDiff = 0.85 - 0.01 * Math.abs(halfAngle - 3.5);
    } else if (halfAngle <= 8) {
      etaDiff = 0.80 - 0.02 * (halfAngle - 4);
    } else if (halfAngle <= 15) {
      etaDiff = 0.70 - 0.03 * (halfAngle - 8);
    } else {
      etaDiff = Math.max(0.30, 0.50 - 0.02 * (halfAngle - 15));
    }

    // Geometry correction
    if (geometry === "annular") etaDiff *= 0.95;
    if (geometry === "rectangular") etaDiff *= 0.90;
    if (geometry === "radial") etaDiff *= 0.88;

    const CpActual = CpIdeal * etaDiff;

    // Pressure recovery
    const q1 = 0.5 * rho * V1 * V1;
    const pressureRecovery = CpActual * q1;

    // Outlet velocity (continuity)
    const V2 = V1 / AR;

    // Stall margin (half angle relative to stall onset ~7-8° for conical)
    const stallAngle = geometry === "conical" ? 8 : geometry === "annular" ? 10 : 7;
    const stallMargin = (stallAngle - halfAngle) / stallAngle * 100;

    const isSafe = halfAngle < stallAngle && AR > 1 && AR < 6;

    if (halfAngle > stallAngle) recs.push(`Half angle ${halfAngle.toFixed(1)}° > stall limit ${stallAngle}° — flow separation likely`);
    if (halfAngle > stallAngle * 0.8) recs.push(`Near stall — consider boundary layer control or shorter diffuser`);
    if (AR > 4) recs.push(`High area ratio ${AR.toFixed(1)} — staged diffuser recommended`);
    if (halfAngle < 1) recs.push(`Very shallow angle ${halfAngle.toFixed(1)}° — unnecessarily long diffuser`);
    if (AR < 1.05) recs.push(`Negligible expansion — diffuser has minimal effect`);
    if (recs.length === 0) recs.push(`Diffuser nominal — AR=${AR.toFixed(2)}, θ=${halfAngle.toFixed(1)}°, Cp=${CpActual.toFixed(3)}`);

    return {
      area_ratio: mkAv(Math.round(AR * 100) / 100, "ratio", AR * 0.01, "geometry"),
      half_angle_deg: mkAv(Math.round(halfAngle * 10) / 10, "deg", halfAngle * 0.02, "geometry"),
      ideal_cp: mkAv(Math.round(CpIdeal * 10000) / 10000, "ratio", CpIdeal * 0.01, "bernoulli"),
      actual_cp: mkAv(Math.round(CpActual * 10000) / 10000, "ratio", CpActual * 0.10, "sovran_klomp"),
      pressure_recovery_Pa: mkAv(Math.round(pressureRecovery), "Pa", pressureRecovery * 0.10, "cp_dynamic"),
      outlet_velocity_m_s: mkAv(Math.round(V2 * 100) / 100, "m/s", V2 * 0.03, "continuity"),
      diffuser_efficiency_pct: mkAv(Math.round(etaDiff * 1000) / 10, "%", etaDiff * 5, "empirical"),
      stall_margin_pct: mkAv(Math.round(stallMargin * 10) / 10, "%", stallMargin * 0.15, "angle_limit"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const diffuserEngine = new DiffuserEngine();
