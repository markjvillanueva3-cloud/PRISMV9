/**
 * SpindleSpeedVariationEngine — SSV for Chatter Suppression
 *
 * Calculates spindle speed variation (SSV) parameters:
 * - Optimal variation amplitude and frequency
 * - Stability lobe avoidance
 * - Speed range for chatter suppression
 * - Tooth passing frequency analysis
 *
 * Key physics: Chatter is a self-excited vibration at the
 * system's natural frequency. By continuously varying spindle
 * speed (sinusoidal or triangular), the regenerative effect
 * is disrupted — the current tooth pass doesn't align with
 * the previous surface waviness. Typical SSV amplitude is
 * 5-15% of nominal RPM with variation frequency 1-5 Hz.
 *
 * Reference: Altintas "Manufacturing Automation" Ch.4,
 *            Slavicek "Effect of irregular tooth pitch on
 *            stability" CIRP 1965,
 *            Insperger & Stepan "Semi-discretization for
 *            time-periodic systems" 2011
 *
 * Actions: ssv_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SSVInput {
  nominal_rpm: number;
  num_flutes: number;
  natural_frequency_hz?: number;
  variation_amplitude_pct?: number;
  variation_frequency_hz?: number;
  axial_depth_mm?: number;
  tool_diameter_mm?: number;
}

export interface SSVResult {
  nominal_rpm: AtomicValue;
  rpm_min: AtomicValue;
  rpm_max: AtomicValue;
  variation_amplitude: AtomicValue;
  variation_frequency: AtomicValue;
  tooth_passing_freq: AtomicValue;
  tooth_passing_freq_min: AtomicValue;
  tooth_passing_freq_max: AtomicValue;
  frequency_spread: AtomicValue;
  chatter_suppression_index: AtomicValue;
  waveform: "sinusoidal" | "triangular";
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class SpindleSpeedVariationEngine {
  /**
   * Calculate SSV parameters for chatter suppression.
   */
  calculate(input: SSVInput): SSVResult {
    const warnings: string[] = [];
    const N = input.nominal_rpm;
    const z = input.num_flutes;

    // Natural frequency estimate if not provided
    // Typical machine tool: 500-2000 Hz
    const fn = input.natural_frequency_hz ?? 800;

    // Variation amplitude: 5-15% of nominal
    const ampPct = input.variation_amplitude_pct ?? 10;
    const ampRpm = N * (ampPct / 100);
    const rpmMin = N - ampRpm;
    const rpmMax = N + ampRpm;

    // Variation frequency: 1-5 Hz (slow enough for spindle)
    // Optimal: ~1/4 of chatter frequency ratio
    const defaultVarFreq = Math.min(
      Math.max(fn / (z * N / 60) * 0.3, 0.5),
      5
    );
    const varFreq = input.variation_frequency_hz ?? r1(defaultVarFreq);

    // Tooth passing frequencies at min/nom/max RPM
    const tpfNom = (N * z) / 60; // Hz
    const tpfMin = (rpmMin * z) / 60;
    const tpfMax = (rpmMax * z) / 60;

    // Frequency spread — range of tooth passing frequencies
    const freqSpread = tpfMax - tpfMin;

    // Chatter suppression index (0-100)
    // Higher spread relative to natural frequency = better
    const csi = Math.min(
      (freqSpread / fn) * 500,
      100
    );

    // Waveform recommendation
    // Sinusoidal for servo drives, triangular for VFD
    const waveform: "sinusoidal" | "triangular" = "sinusoidal";

    // Warnings
    if (ampPct < 3) {
      warnings.push(
        "SSV amplitude < 3% — insufficient for chatter suppression"
      );
    }
    if (ampPct > 20) {
      warnings.push(
        "SSV amplitude > 20% — may cause spindle thermal issues"
      );
    }
    if (rpmMin < 100) {
      warnings.push(
        "Minimum RPM too low — spindle may stall"
      );
    }
    if (varFreq > 10) {
      warnings.push(
        "Variation frequency > 10 Hz — " +
        "spindle servo may not track accurately"
      );
    }
    if (tpfNom > fn * 0.9 && tpfNom < fn * 1.1) {
      warnings.push(
        "Tooth passing frequency near natural frequency — " +
        "consider changing nominal RPM"
      );
    }
    if (csi < 20) {
      warnings.push(
        "Low chatter suppression index — " +
        "increase amplitude or change RPM"
      );
    }

    return {
      nominal_rpm: av(N, "rev/min", 0, "User input"),
      rpm_min: av(Math.round(rpmMin), "rev/min", 0.05,
        "N - amplitude"),
      rpm_max: av(Math.round(rpmMax), "rev/min", 0.05,
        "N + amplitude"),
      variation_amplitude: av(r1(ampPct), "%", 0.05,
        "Percentage of nominal RPM"),
      variation_frequency: av(r1(varFreq), "Hz", 0.1,
        "SSV oscillation rate"),
      tooth_passing_freq: av(r1(tpfNom), "Hz", 0.05,
        "N × z / 60"),
      tooth_passing_freq_min: av(r1(tpfMin), "Hz", 0.05,
        "At minimum RPM"),
      tooth_passing_freq_max: av(r1(tpfMax), "Hz", 0.05,
        "At maximum RPM"),
      frequency_spread: av(r1(freqSpread), "Hz", 0.1,
        "TPF_max - TPF_min"),
      chatter_suppression_index: av(
        Math.round(csi), "score", 0.2,
        "spread/fn × 500 (0-100)"
      ),
      waveform,
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }

export const spindleSpeedVariationEngine =
  new SpindleSpeedVariationEngine();
