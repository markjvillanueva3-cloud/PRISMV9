/**
 * VibratoryFeederEngine — Vibratory bowl/linear feeder process analysis
 *
 * Models: Conveying velocity (throw angle, amplitude, frequency),
 *         feed rate, track design, part orientation probability
 * References: Boothroyd "Assembly Automation", Stöckel, FMC guidelines
 */

export type FeederType = "bowl" | "linear" | "step" | "centrifugal" | "flex";
export type PartShape = "cylindrical" | "prismatic" | "spherical" | "flat" | "irregular" | "threaded";

export interface VibratoryFeederInput {
  type?: FeederType;
  part_shape?: PartShape;
  part_mass_g?: number;              // default 5
  part_length_mm?: number;           // default 20
  frequency_Hz?: number;             // default 60
  amplitude_mm?: number;             // default 0.5
  throw_angle_deg?: number;          // default 20
  bowl_diameter_mm?: number;         // default 300
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface VibratoryFeederResult {
  conveying_velocity_mm_s: AtomicValue;
  feed_rate_parts_min: AtomicValue;
  throw_factor: AtomicValue;
  orientation_efficiency_pct: AtomicValue;
  power_W: AtomicValue;
  track_velocity_mm_s: AtomicValue;
  vibration_intensity_g: AtomicValue;
  optimal_frequency_Hz: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class VibratoryFeederEngine {
  calculate(input: VibratoryFeederInput): VibratoryFeederResult {
    const {
      type = "bowl",
      part_shape = "cylindrical",
      part_mass_g: mass = 5,
      part_length_mm: partLen = 20,
      frequency_Hz: freq = 60,
      amplitude_mm: amp = 0.5,
      throw_angle_deg: theta = 20,
      bowl_diameter_mm: bowlD = 300,
    } = input;

    const recs: string[] = [];
    const thetaRad = theta * Math.PI / 180;

    // Vibration intensity (dimensionless): Γ = Aω²sin(θ) / g
    const omega = 2 * Math.PI * freq;
    const intensity = amp / 1000 * omega * omega * Math.sin(thetaRad) / 9.81;

    // Throw factor (must be > 1 for conveying, ideally 1.5-3.0)
    const throwFactor = amp / 1000 * omega * omega / (9.81 * Math.cos(thetaRad));

    // Conveying velocity: v = A × ω × cos(θ) × f(Γ)
    // Simplified: v ≈ k × A × f × sin(θ) for micro-throw
    const conveyK = throwFactor > 1 ? 2.0 : 1.0; // efficiency
    const convVelocity = conveyK * amp * freq * Math.sin(thetaRad); // mm/s

    // Track velocity (on bowl track circumference)
    const trackCirc = Math.PI * bowlD; // mm
    const trackVelocity = type === "bowl" ? convVelocity : convVelocity;

    // Parts per minute (based on part length spacing on track)
    const spacing = partLen * 1.5; // 50% gap between parts
    const feedRate = trackVelocity / spacing * 60;

    // Orientation efficiency (Boothroyd method simplified)
    const orientEff = part_shape === "cylindrical" ? 65 :
      part_shape === "prismatic" ? 50 :
      part_shape === "spherical" ? 95 :
      part_shape === "flat" ? 55 :
      part_shape === "threaded" ? 40 : 30;

    // Effective feed rate (after orientation rejection)
    const effectiveFeed = feedRate * orientEff / 100;

    // Power consumption
    const movingMass = type === "bowl" ? bowlD / 300 * 2 : 1; // kg estimate
    const power = movingMass * amp / 1000 * omega * omega * 0.1; // W (with losses)

    // Optimal frequency (natural freq of spring-mass system)
    const optFreq = type === "bowl" ? 50 : type === "linear" ? 60 : 45;

    const isSafe = throwFactor > 0.5 && throwFactor < 10 && intensity < 15;

    if (throwFactor < 1) recs.push(`Throw factor ${throwFactor.toFixed(2)} < 1 — parts won't advance, increase amplitude`);
    if (throwFactor > 5) recs.push(`Throw factor ${throwFactor.toFixed(1)} very high — parts bouncing, reduce amplitude`);
    if (mass > 50) recs.push(`Heavy parts ${mass}g — consider step feeder or centrifugal`);
    if (orientEff < 50) recs.push(`Low orientation efficiency ${orientEff}% for ${part_shape} — add tooling/baffles`);
    if (Math.abs(freq - optFreq) > 15) recs.push(`Frequency ${freq}Hz far from natural ${optFreq}Hz — tune springs`);
    if (recs.length === 0) recs.push(`Feeder nominal — ${effectiveFeed.toFixed(0)}ppm, v=${convVelocity.toFixed(0)}mm/s, Γ=${intensity.toFixed(1)}`);

    return {
      conveying_velocity_mm_s: mkAv(Math.round(convVelocity * 10) / 10, "mm/s", convVelocity * 0.10, "throw_model"),
      feed_rate_parts_min: mkAv(Math.round(effectiveFeed * 10) / 10, "ppm", effectiveFeed * 0.15, "velocity_spacing"),
      throw_factor: mkAv(Math.round(throwFactor * 1000) / 1000, "—", throwFactor * 0.05, "Aω²_gcosθ"),
      orientation_efficiency_pct: mkAv(orientEff, "%", orientEff * 0.15, "Boothroyd"),
      power_W: mkAv(Math.round(power * 10) / 10, "W", power * 0.20, "mass_amp_freq"),
      track_velocity_mm_s: mkAv(Math.round(trackVelocity * 10) / 10, "mm/s", trackVelocity * 0.10, "conveying"),
      vibration_intensity_g: mkAv(Math.round(intensity * 100) / 100, "g", intensity * 0.05, "Aω²sinθ_g"),
      optimal_frequency_Hz: mkAv(optFreq, "Hz", optFreq * 0.10, "spring_mass"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const vibratoryFeederEngine = new VibratoryFeederEngine();
