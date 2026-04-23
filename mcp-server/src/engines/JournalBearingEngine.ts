/**
 * JournalBearingEngine — Plain/journal bearing design
 *
 * Models: Sommerfeld number, minimum film thickness,
 *         eccentricity ratio, friction coefficient, heat generation
 * References: Raimondi & Boyd charts, DIN 31652
 * Safety: Minimum film thickness, temperature rise, PV limit
 */

export interface JournalBearingInput {
  shaft_diameter_mm: number;
  bearing_length_mm?: number;           // default = diameter
  radial_load_N: number;
  speed_rpm: number;
  oil_viscosity_Pa_s?: number;          // default 0.03 (ISO VG 32 at 50°C)
  diametral_clearance_mm?: number;      // default D/1000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface JournalBearingResult {
  sommerfeld_number: AtomicValue;
  eccentricity_ratio: AtomicValue;
  min_film_thickness_um: AtomicValue;
  friction_coefficient: AtomicValue;
  power_loss_W: AtomicValue;
  temperature_rise_C: AtomicValue;
  bearing_pressure_MPa: AtomicValue;
  pv_value_MPa_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class JournalBearingEngine {
  calculate(input: JournalBearingInput): JournalBearingResult {
    const {
      shaft_diameter_mm: D,
      radial_load_N: W,
      speed_rpm: N,
      oil_viscosity_Pa_s: mu = 0.03,
    } = input;

    const recs: string[] = [];
    const L = input.bearing_length_mm ?? D;
    const c = input.diametral_clearance_mm ?? D / 1000;
    const R = D / 2; // mm
    const r = R / 1000; // m
    const c_r = c / 2 / 1000; // radial clearance, m

    const omega = 2 * Math.PI * N / 60;
    const Lm = L / 1000;

    // Bearing pressure
    const P = W / (D * L); // N/mm² = MPa

    // Sommerfeld number: S = (μ×N/60 × R² ) / (P × c²)
    const S = mu * (N / 60) * (r * r) / (P * 1e6 * c_r * c_r);

    // Eccentricity ratio from Sommerfeld (approximate for L/D=1)
    // ε ≈ 1 - 2×S for small S, or from chart interpolation
    const epsilon = Math.min(1 - 0.5 * Math.sqrt(S), 0.95);
    const epsilonClamped = Math.max(epsilon, 0.1);

    // Minimum film thickness
    const hMin = c_r * (1 - epsilonClamped) * 1e6; // μm

    // Friction coefficient (Petroff + correction)
    const f = 2 * Math.PI * Math.PI * S / (epsilonClamped * Math.sqrt(1 - epsilonClamped * epsilonClamped)) * c_r / r;
    const fClamped = Math.max(Math.min(f, 0.05), 0.001);

    // Power loss
    const frictionForce = fClamped * W;
    const surfaceSpeed = omega * r;
    const powerLoss = frictionForce * surfaceSpeed;

    // Temperature rise (assuming oil carries all heat)
    const oilFlowRate = 0.5 * c_r * Lm * surfaceSpeed * epsilonClamped; // m³/s approx
    const rhoOil = 870;
    const cpOil = 2000;
    const dT = powerLoss / (rhoOil * cpOil * Math.max(oilFlowRate, 1e-8));

    // PV value
    const surfaceSpeedMM = omega * R / 1000; // m/s
    const PV = P * surfaceSpeedMM;

    const isSafe = hMin > 5 && PV < 10 && dT < 40;

    if (hMin < 10) recs.push(`Thin film ${hMin.toFixed(1)}μm — mixed lubrication, increase clearance or viscosity`);
    if (PV > 5) recs.push(`High PV=${PV.toFixed(1)} — thermal limit, consider forced lubrication`);
    if (dT > 30) recs.push(`High temp rise ${dT.toFixed(0)}°C — add oil cooling`);
    if (S < 0.01) recs.push(`Low Sommerfeld ${S.toFixed(4)} — bearing heavily loaded`);
    if (recs.length === 0) recs.push(`Bearing nominal — S=${S.toFixed(3)}, hmin=${hMin.toFixed(0)}μm, P=${powerLoss.toFixed(1)}W`);

    return {
      sommerfeld_number: mkAv(Math.round(S * 10000) / 10000, "dimensionless", S * 0.10, "raimondi_boyd"),
      eccentricity_ratio: mkAv(Math.round(epsilonClamped * 1000) / 1000, "ratio", epsilonClamped * 0.10, "sommerfeld"),
      min_film_thickness_um: mkAv(Math.round(hMin * 10) / 10, "μm", hMin * 0.12, "clearance_eccentricity"),
      friction_coefficient: mkAv(Math.round(fClamped * 10000) / 10000, "ratio", fClamped * 0.15, "petroff"),
      power_loss_W: mkAv(Math.round(powerLoss * 10) / 10, "W", powerLoss * 0.12, "friction_speed"),
      temperature_rise_C: mkAv(Math.round(dT * 10) / 10, "°C", dT * 0.15, "energy_balance"),
      bearing_pressure_MPa: mkAv(Math.round(P * 100) / 100, "MPa", P * 0.05, "load_area"),
      pv_value_MPa_m_s: mkAv(Math.round(PV * 100) / 100, "MPa·m/s", PV * 0.08, "pressure_velocity"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const journalBearingEngine = new JournalBearingEngine();
