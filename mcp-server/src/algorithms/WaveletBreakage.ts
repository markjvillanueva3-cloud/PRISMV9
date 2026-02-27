/**
 * Wavelet Tool Breakage Detection — Continuous Wavelet Transform
 *
 * Implements Continuous Wavelet Transform (CWT) with Morlet wavelet for
 * detecting sudden tool breakage events in cutting force/vibration signals.
 * Tool breakage produces sharp transients that are well-localized by wavelets.
 *
 * Detects breakage by monitoring wavelet coefficient energy across scales.
 * A sudden spike in high-frequency wavelet coefficients indicates a breakage event.
 *
 * Manufacturing uses: tool breakage detection, tool chipping monitoring,
 * catastrophic failure prevention, automated machine stop triggering.
 *
 * References:
 * - Li, X. et al. (2006). "Wavelet Analysis of Cutting Force for Tool Breakage Detection"
 * - Tansel, I.N. et al. (2000). "Tool Wear Estimation in Micro-Machining Using Wavelet"
 * - Mallat, S. (2008). "A Wavelet Tour of Signal Processing"
 *
 * @module algorithms/WaveletBreakage
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface WaveletBreakageInput {
  /** Force or vibration signal samples. */
  signal: number[];
  /** Sampling rate [Hz]. */
  sample_rate: number;
  /** Number of wavelet scales to analyze. Default 16. */
  n_scales?: number;
  /** Minimum scale (highest frequency). Default 1. */
  min_scale?: number;
  /** Maximum scale (lowest frequency). Default 64. */
  max_scale?: number;
  /** Breakage detection threshold (multiples of baseline energy). Default 5. */
  threshold?: number;
  /** Morlet wavelet center frequency. Default 6. */
  omega0?: number;
  /** Baseline estimation window [samples]. Default first 10% of signal. */
  baseline_window?: number;
  /** Minimum breakage event duration [ms]. Default 0.5. */
  min_event_duration?: number;
}

export interface BreakageEvent {
  /** Time of breakage onset [s]. */
  time: number;
  /** Sample index of onset. */
  sample_index: number;
  /** Duration of event [ms]. */
  duration_ms: number;
  /** Peak wavelet energy ratio. */
  energy_ratio: number;
  /** Dominant scale at breakage. */
  dominant_scale: number;
  /** Estimated frequency of transient [Hz]. */
  frequency: number;
  /** Severity: chipping, fracture, catastrophic. */
  severity: "chipping" | "fracture" | "catastrophic";
}

export interface WaveletBreakageOutput extends WithWarnings {
  /** Whether any breakage event was detected. */
  breakage_detected: boolean;
  /** List of detected breakage events. */
  events: BreakageEvent[];
  /** Number of breakage events. */
  n_events: number;
  /** Wavelet energy time series (envelope). */
  energy_envelope: Array<{ time: number; energy: number; threshold: number }>;
  /** Baseline energy level. */
  baseline_energy: number;
  /** Maximum energy ratio observed. */
  max_energy_ratio: number;
  /** Overall signal health: healthy, warning, critical. */
  health_status: "healthy" | "warning" | "critical";
  /** Time of most severe event [s]. */
  most_severe_time: number;
  calculation_method: string;
}

export class WaveletToolBreakage implements Algorithm<WaveletBreakageInput, WaveletBreakageOutput> {

  validate(input: WaveletBreakageInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.signal?.length || input.signal.length < 32) {
      issues.push({ field: "signal", message: "At least 32 samples required", severity: "error" });
    }
    if (!input.sample_rate || input.sample_rate <= 0) {
      issues.push({ field: "sample_rate", message: "Must be > 0", severity: "error" });
    }
    if ((input.threshold ?? 5) <= 1) {
      issues.push({ field: "threshold", message: "Should be > 1", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: WaveletBreakageInput): WaveletBreakageOutput {
    const warnings: string[] = [];
    const { signal, sample_rate } = input;
    const nScales = input.n_scales ?? 16;
    const minScale = input.min_scale ?? 1;
    const maxScale = input.max_scale ?? 64;
    const threshold = input.threshold ?? 5;
    const omega0 = input.omega0 ?? 6;
    const baselineWindow = input.baseline_window ?? Math.floor(signal.length * 0.1);
    const minEventDuration = (input.min_event_duration ?? 0.5) / 1000; // ms → s
    const minEventSamples = Math.max(1, Math.ceil(minEventDuration * sample_rate));

    const N = signal.length;

    // Generate logarithmically-spaced scales
    const scales: number[] = [];
    for (let i = 0; i < nScales; i++) {
      const scale = minScale * Math.pow(maxScale / minScale, i / (nScales - 1));
      scales.push(scale);
    }

    // Compute CWT using Morlet wavelet
    // ψ(t) = π^(-1/4) × exp(jω₀t) × exp(-t²/2)
    // CWT coefficient: W(a,b) = (1/√a) × Σ x(n) × ψ*((n-b)/a)
    const energyPerSample = new Array(N).fill(0);
    const scaleEnergy: number[][] = Array.from({ length: nScales }, () => new Array(N).fill(0));

    for (let si = 0; si < nScales; si++) {
      const a = scales[si];
      const sqrtA = Math.sqrt(a);
      const waveletHalfWidth = Math.ceil(3 * a); // Morlet has ~3σ support

      for (let b = 0; b < N; b++) {
        let realCoeff = 0;
        let imagCoeff = 0;

        for (let n = Math.max(0, b - waveletHalfWidth); n < Math.min(N, b + waveletHalfWidth); n++) {
          const t = (n - b) / a;
          // Morlet wavelet (real and imaginary parts)
          const envelope = Math.exp(-t * t / 2);
          const realPsi = envelope * Math.cos(omega0 * t);
          const imagPsi = envelope * Math.sin(omega0 * t);

          realCoeff += signal[n] * realPsi / sqrtA;
          imagCoeff += signal[n] * imagPsi / sqrtA;
        }

        const energy = realCoeff * realCoeff + imagCoeff * imagCoeff;
        scaleEnergy[si][b] = energy;
        energyPerSample[b] += energy;
      }
    }

    // Baseline energy estimation
    let baselineEnergy = 0;
    const blWindow = Math.min(baselineWindow, N);
    for (let i = 0; i < blWindow; i++) {
      baselineEnergy += energyPerSample[i];
    }
    baselineEnergy /= blWindow;
    if (baselineEnergy < 1e-15) baselineEnergy = 1e-15;

    // Build energy envelope and detect events
    const energyEnvelope: Array<{ time: number; energy: number; threshold: number }> = [];
    const thresholdLevel = baselineEnergy * threshold;

    // Subsample for output
    const step = Math.max(1, Math.floor(N / 500));
    for (let i = 0; i < N; i += step) {
      energyEnvelope.push({
        time: i / sample_rate,
        energy: energyPerSample[i],
        threshold: thresholdLevel,
      });
    }

    // Detect breakage events
    const events: BreakageEvent[] = [];
    let inEvent = false;
    let eventStart = 0;
    let eventPeakEnergy = 0;
    let eventPeakScale = 0;
    let eventPeakSample = 0;
    let maxEnergyRatio = 0;

    for (let i = 0; i < N; i++) {
      const ratio = energyPerSample[i] / baselineEnergy;
      maxEnergyRatio = Math.max(maxEnergyRatio, ratio);

      if (ratio > threshold && !inEvent) {
        inEvent = true;
        eventStart = i;
        eventPeakEnergy = ratio;
        eventPeakSample = i;
        eventPeakScale = 0;
      } else if (inEvent && ratio > eventPeakEnergy) {
        eventPeakEnergy = ratio;
        eventPeakSample = i;
      } else if (inEvent && ratio < threshold * 0.5) {
        // Event ended
        inEvent = false;
        const duration = (i - eventStart) / sample_rate;

        if (duration >= minEventDuration) {
          // Find dominant scale at peak
          let maxScaleEnergy = 0;
          for (let si = 0; si < nScales; si++) {
            if (scaleEnergy[si][eventPeakSample] > maxScaleEnergy) {
              maxScaleEnergy = scaleEnergy[si][eventPeakSample];
              eventPeakScale = si;
            }
          }

          // Estimate frequency from scale
          const freq = (omega0 * sample_rate) / (2 * Math.PI * scales[eventPeakScale]);

          // Classify severity
          let severity: "chipping" | "fracture" | "catastrophic";
          if (eventPeakEnergy < threshold * 3) severity = "chipping";
          else if (eventPeakEnergy < threshold * 10) severity = "fracture";
          else severity = "catastrophic";

          events.push({
            time: eventStart / sample_rate,
            sample_index: eventStart,
            duration_ms: duration * 1000,
            energy_ratio: eventPeakEnergy,
            dominant_scale: scales[eventPeakScale],
            frequency: freq,
            severity,
          });
        }
      }
    }

    // Close any open event
    if (inEvent) {
      const duration = (N - eventStart) / sample_rate;
      if (duration >= minEventDuration) {
        let maxScaleEnergy = 0;
        for (let si = 0; si < nScales; si++) {
          if (scaleEnergy[si][eventPeakSample] > maxScaleEnergy) {
            maxScaleEnergy = scaleEnergy[si][eventPeakSample];
            eventPeakScale = si;
          }
        }
        const freq = (omega0 * sample_rate) / (2 * Math.PI * scales[eventPeakScale]);
        let severity: "chipping" | "fracture" | "catastrophic";
        if (eventPeakEnergy < threshold * 3) severity = "chipping";
        else if (eventPeakEnergy < threshold * 10) severity = "fracture";
        else severity = "catastrophic";

        events.push({
          time: eventStart / sample_rate,
          sample_index: eventStart,
          duration_ms: duration * 1000,
          energy_ratio: eventPeakEnergy,
          dominant_scale: scales[eventPeakScale],
          frequency: freq,
          severity,
        });
      }
    }

    // Health status
    let health: "healthy" | "warning" | "critical";
    if (events.length === 0) health = "healthy";
    else if (events.some(e => e.severity === "catastrophic")) health = "critical";
    else if (events.some(e => e.severity === "fracture")) health = "critical";
    else health = "warning";

    const mostSevereTime = events.length > 0
      ? events.reduce((worst, e) => e.energy_ratio > worst.energy_ratio ? e : worst).time
      : -1;

    if (events.length > 0) {
      const worst = events.reduce((w, e) => e.energy_ratio > w.energy_ratio ? e : w);
      warnings.push(`BREAKAGE DETECTED: ${worst.severity} at t=${worst.time.toFixed(3)}s (${events.length} events total)`);
    }

    return {
      breakage_detected: events.length > 0,
      events,
      n_events: events.length,
      energy_envelope: energyEnvelope,
      baseline_energy: baselineEnergy,
      max_energy_ratio: maxEnergyRatio,
      health_status: health,
      most_severe_time: mostSevereTime,
      warnings,
      calculation_method: `CWT breakage detection (Morlet ω₀=${omega0}, ${nScales} scales, threshold=${threshold}×)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "wavelet-breakage",
      name: "Wavelet Tool Breakage Detection",
      description: "Continuous Wavelet Transform for real-time tool breakage/chipping detection",
      formula: "W(a,b) = (1/√a) Σ x(n)ψ*((n-b)/a); energy = |W|²; breakage if energy > threshold × baseline",
      reference: "Li et al. (2006); Tansel et al. (2000); Mallat (2008)",
      safety_class: "critical",
      domain: "signal",
      inputs: { signal: "Force/vibration samples", sample_rate: "Sampling frequency [Hz]" },
      outputs: { breakage_detected: "Detection flag", events: "Breakage event details", health_status: "healthy/warning/critical" },
    };
  }
}
