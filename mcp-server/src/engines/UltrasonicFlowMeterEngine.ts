/**
 * UltrasonicFlowMeterEngine — Transit-time & Doppler ultrasonic flow measurement
 *
 * Models: Transit time difference (Δt=2VLcosθ/c²), path configuration,
 *         Reynolds correction, clamp-on vs inline
 * References: ISO 12242, AGA Report No. 9
 */

export type MeterMode = "transit_time" | "doppler";
export type MountType = "inline" | "clamp_on" | "insertion";

export interface UltrasonicFlowMeterInput {
  pipe_diameter_mm: number;
  flow_velocity_m_s?: number;        // default 2
  fluid_density_kg_m3?: number;      // default 1000
  speed_of_sound_m_s?: number;       // default 1480 (water)
  mode?: MeterMode;                  // default transit_time
  mount_type?: MountType;            // default inline
  num_paths?: number;                // 1-8, default 2
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface UltrasonicFlowMeterResult {
  flow_rate_m3_h: AtomicValue;
  transit_time_diff_ns: AtomicValue;
  path_angle_deg: AtomicValue;
  reynolds_number: AtomicValue;
  accuracy_pct: AtomicValue;
  min_velocity_m_s: AtomicValue;
  max_velocity_m_s: AtomicValue;
  signal_strength_dB: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class UltrasonicFlowMeterEngine {
  calculate(input: UltrasonicFlowMeterInput): UltrasonicFlowMeterResult {
    const {
      pipe_diameter_mm: D,
      flow_velocity_m_s: V = 2,
      fluid_density_kg_m3: rho = 1000,
      speed_of_sound_m_s: c = 1480,
      mode = "transit_time",
      mount_type = "inline",
      num_paths: nPaths = 2,
    } = input;

    const recs: string[] = [];
    const Dm = D / 1000;
    const A = Math.PI / 4 * Dm * Dm;

    // Path angle (typical 45° or 60°)
    const theta = nPaths >= 4 ? 45 : 60;
    const thetaRad = theta * Math.PI / 180;

    // Path length
    const L = Dm / Math.sin(thetaRad);

    // Transit time difference
    const dt = 2 * V * L * Math.cos(thetaRad) / (c * c); // seconds
    const dtNs = dt * 1e9;

    // Flow rate
    const Q = V * A * 3600; // m³/h

    // Reynolds number
    const mu = 1e-3; // water viscosity
    const Re = rho * V * Dm / mu;

    // Accuracy depends on paths and mount type
    let baseAcc = mode === "transit_time" ? 0.5 : 2.0;
    if (nPaths >= 4) baseAcc *= 0.6; // multi-path improvement
    if (mount_type === "clamp_on") baseAcc *= 2.5; // clamp-on penalty
    if (mount_type === "insertion") baseAcc *= 1.5;

    // Velocity limits
    const minV = mode === "transit_time" ? 0.01 : 0.3;
    const maxV = mode === "transit_time" ? 15 : 6;

    // Signal strength (decreases with pipe size and clamp-on)
    let signalDb = 80 - D / 10;
    if (mount_type === "clamp_on") signalDb -= 20;
    if (mode === "doppler") signalDb -= 10;

    const isSafe = V >= minV && V <= maxV && signalDb > 20;

    if (V < minV * 2) recs.push(`Low velocity ${V}m/s — accuracy degrades below ${minV}m/s`);
    if (V > maxV * 0.8) recs.push(`High velocity ${V}m/s — approaching limit ${maxV}m/s`);
    if (mount_type === "clamp_on" && D < 25) recs.push(`Small pipe ${D}mm — clamp-on challenging, use inline`);
    if (signalDb < 30) recs.push(`Low signal ${signalDb.toFixed(0)}dB — check coupling/alignment`);
    if (nPaths < 2 && Re > 1e6) recs.push(`Single path at high Re — profile errors, add paths`);
    if (recs.length === 0) recs.push(`UFM nominal — Q=${Q.toFixed(1)}m³/h, Δt=${dtNs.toFixed(1)}ns, ±${baseAcc.toFixed(1)}%`);

    return {
      flow_rate_m3_h: mkAv(Math.round(Q * 10) / 10, "m³/h", Q * baseAcc / 100, "transit_time"),
      transit_time_diff_ns: mkAv(Math.round(dtNs * 10) / 10, "ns", dtNs * 0.05, "path_geometry"),
      path_angle_deg: mkAv(theta, "deg", 0, "design"),
      reynolds_number: mkAv(Math.round(Re), "dimensionless", Re * 0.05, "pipe_flow"),
      accuracy_pct: mkAv(Math.round(baseAcc * 100) / 100, "%", baseAcc * 0.2, "iso_12242"),
      min_velocity_m_s: mkAv(minV, "m/s", 0, "technology"),
      max_velocity_m_s: mkAv(maxV, "m/s", 0, "technology"),
      signal_strength_dB: mkAv(Math.round(signalDb), "dB", 5, "empirical"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ultrasonicFlowMeterEngine = new UltrasonicFlowMeterEngine();
