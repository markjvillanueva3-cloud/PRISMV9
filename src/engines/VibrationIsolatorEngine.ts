/**
 * VibrationIsolatorEngine — Vibration isolation mount design
 *
 * Models: Transmissibility (T=1/√((1-(f/fn)²)²+(2ζf/fn)²)),
 *         natural frequency, static deflection, isolation efficiency
 * References: Harris "Shock and Vibration Handbook", DIN 4150
 * Safety: Resonance avoidance, stability, seismic restraint
 */

export type IsolatorType = "rubber" | "spring" | "air" | "wire_rope" | "elastomer_pad";

export interface VibrationIsolatorInput {
  machine_mass_kg: number;
  disturbing_frequency_Hz: number;
  required_isolation_pct?: number;      // default 90%
  isolator_type?: IsolatorType;
  damping_ratio?: number;               // default 0.05
  num_mounts?: number;                  // default 4
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface VibrationIsolatorResult {
  natural_frequency_Hz: AtomicValue;
  static_deflection_mm: AtomicValue;
  stiffness_per_mount_N_mm: AtomicValue;
  transmissibility: AtomicValue;
  isolation_efficiency_pct: AtomicValue;
  frequency_ratio: AtomicValue;
  load_per_mount_kg: AtomicValue;
  recommended_deflection_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class VibrationIsolatorEngine {
  calculate(input: VibrationIsolatorInput): VibrationIsolatorResult {
    const {
      machine_mass_kg: M,
      disturbing_frequency_Hz: fd,
      required_isolation_pct = 90,
      isolator_type = "rubber",
      damping_ratio: zeta = 0.05,
      num_mounts = 4,
    } = input;

    const recs: string[] = [];

    // Required transmissibility
    const T_req = 1 - required_isolation_pct / 100;

    // For T < 1, we need f/fn > √2 (isolation region)
    // T = 1/√((1-r²)² + (2ζr)²) where r = fd/fn
    // Solve for fn: need r such that T = T_req
    // For low damping: T ≈ 1/(r²-1), so r = √(1 + 1/T)
    const r_req = Math.sqrt(1 + 1 / T_req);
    const fn = fd / r_req;

    // Static deflection: δ = g/(2πfn)² = 250/fn² (mm)
    const delta = 250 / (fn * fn); // mm (g/(2πfn)² × 1000)

    // Total stiffness: k = M × (2πfn)²
    const k_total = M * Math.pow(2 * Math.PI * fn, 2); // N/m
    const k_per_mount = k_total / num_mounts / 1000; // N/mm

    // Actual transmissibility
    const r = fd / fn;
    const T_actual = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
    const isolation = (1 - T_actual) * 100;

    // Load per mount
    const loadPerMount = M / num_mounts;

    // Type-specific limits
    const maxDeflection = isolator_type === "rubber" ? 10
      : isolator_type === "spring" ? 50
      : isolator_type === "air" ? 100
      : isolator_type === "wire_rope" ? 25 : 5;

    const isSafe = r > 1.5 && delta <= maxDeflection && isolation >= required_isolation_pct * 0.9;

    if (delta > maxDeflection) recs.push(`Deflection ${delta.toFixed(1)}mm exceeds ${isolator_type} limit ${maxDeflection}mm — use spring or air mount`);
    if (r < 2) recs.push(`Frequency ratio ${r.toFixed(1)} — close to resonance, increase isolation`);
    if (fn > fd * 0.5) recs.push(`Natural freq ${fn.toFixed(1)}Hz too close to ${fd}Hz — lower fn`);
    if (isolation < required_isolation_pct) recs.push(`Achieved ${isolation.toFixed(0)}% < required ${required_isolation_pct}% — softer mounts needed`);
    if (recs.length === 0) recs.push(`Isolation nominal — fn=${fn.toFixed(1)}Hz, T=${T_actual.toFixed(3)}, ${isolation.toFixed(0)}% isolated`);

    return {
      natural_frequency_Hz: mkAv(Math.round(fn * 10) / 10, "Hz", fn * 0.08, "isolation_target"),
      static_deflection_mm: mkAv(Math.round(delta * 10) / 10, "mm", delta * 0.08, "gravity_frequency"),
      stiffness_per_mount_N_mm: mkAv(Math.round(k_per_mount * 10) / 10, "N/mm", k_per_mount * 0.08, "mass_frequency"),
      transmissibility: mkAv(Math.round(T_actual * 10000) / 10000, "ratio", T_actual * 0.10, "sdof_model"),
      isolation_efficiency_pct: mkAv(Math.round(isolation * 10) / 10, "%", 2, "transmissibility"),
      frequency_ratio: mkAv(Math.round(r * 100) / 100, "ratio", r * 0.05, "fd_fn"),
      load_per_mount_kg: mkAv(Math.round(loadPerMount * 10) / 10, "kg", 0, "weight_division"),
      recommended_deflection_mm: mkAv(Math.round(delta * 10) / 10, "mm", delta * 0.10, "fn_target"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const vibrationIsolatorEngine = new VibrationIsolatorEngine();
