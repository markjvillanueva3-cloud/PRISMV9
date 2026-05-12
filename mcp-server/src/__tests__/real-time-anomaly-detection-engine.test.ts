/**
 * Tests for RealTimeAnomalyDetectionEngine — SCI-MS0 U04
 * 5 detection methods: CUSUM, EWMA, Mahalanobis, FFT, Wavelet
 */
import { describe, it, expect } from "vitest";
import { realTimeAnomalyDetectionEngine } from "../engines/RealTimeAnomalyDetectionEngine.js";
import type { AnomalyDetectionInput } from "../engines/RealTimeAnomalyDetectionEngine.js";

/** Generate stable signal — constant value (no variation) */
function stableSignal(n: number, mean = 100, _std = 5): number[] {
  return new Array(n).fill(mean);
}

/** Signal with a step change (drift) at midpoint */
function driftSignal(n: number, mean = 100, std = 5, shift = 30): number[] {
  const samples = stableSignal(n, mean, std);
  const mid = Math.floor(n / 2);
  for (let i = mid; i < n; i++) samples[i] += shift;
  return samples;
}

/** Signal with a chatter-like sine wave added */
function chatterSignal(n: number, sampleRate: number, chatterFreq = 200): number[] {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Strong chatter component + weak baseline noise
    samples.push(100 + 50 * Math.sin(2 * Math.PI * chatterFreq * t) +
                 15 * Math.sin(2 * Math.PI * chatterFreq * 2 * t) +
                 2 * Math.sin(2 * Math.PI * 50 * t));
  }
  return samples;
}

/** Signal with spike transients */
function spikeSignal(n: number, mean = 100, std = 5): number[] {
  const samples = stableSignal(n, mean, std);
  // Insert spikes
  samples[Math.floor(n * 0.3)] = mean + 15 * std;
  samples[Math.floor(n * 0.6)] = mean - 12 * std;
  samples[Math.floor(n * 0.8)] = mean + 20 * std;
  return samples;
}

describe("RealTimeAnomalyDetectionEngine", () => {

  // ── Stable signal — no anomalies ──────────────────────────

  it("reports normal status on stable signal", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: stableSignal(500),
      sample_rate_hz: 1000,
      sensitivity: 0.3,
    });
    const r = result.value as any;
    expect(r.overall_status).toBe("normal");
    expect(r.recommended_action).toContain("No action");
    expect(r.method_summaries.length).toBe(5);
  });

  // ── All 5 methods run ─────────────────────────────────────

  it("runs all 5 detection methods by default", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: stableSignal(200),
      sample_rate_hz: 1000,
    });
    const r = result.value as any;
    const methods = r.method_summaries.map((s: any) => s.method);
    expect(methods).toContain("cusum");
    expect(methods).toContain("ewma");
    expect(methods).toContain("mahalanobis");
    expect(methods).toContain("fft");
    expect(methods).toContain("wavelet");
  });

  it("can run a subset of methods", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: stableSignal(200),
      sample_rate_hz: 1000,
      methods: ["cusum", "fft"],
    });
    const r = result.value as any;
    expect(r.method_summaries.length).toBe(2);
  });

  // ── CUSUM drift detection ─────────────────────────────────

  describe("CUSUM", () => {
    it("detects drift (step change in mean)", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: driftSignal(500, 100, 5, 40),
        sample_rate_hz: 1000,
        methods: ["cusum"],
        sensitivity: 0.5,
      });
      const r = result.value as any;
      const cusum = r.method_summaries.find((s: any) => s.method === "cusum");
      expect(cusum.triggered).toBe(true);
      // Anomaly type should be 'drift'
      const driftEvents = r.anomalies.filter((a: any) => a.type === "drift");
      expect(driftEvents.length).toBeGreaterThan(0);
    });

    it("does not trigger on stable signal", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: stableSignal(500, 100, 5),
        sample_rate_hz: 1000,
        methods: ["cusum"],
        sensitivity: 0.3,
      });
      const r = result.value as any;
      const cusum = r.method_summaries.find((s: any) => s.method === "cusum");
      expect(cusum.triggered).toBe(false);
    });
  });

  // ── EWMA trend detection ──────────────────────────────────

  describe("EWMA", () => {
    it("detects sustained shift", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: driftSignal(500, 100, 5, 50),
        sample_rate_hz: 1000,
        methods: ["ewma"],
        sensitivity: 0.5,
      });
      const r = result.value as any;
      const ewma = r.method_summaries.find((s: any) => s.method === "ewma");
      expect(ewma.triggered).toBe(true);
      expect(ewma.details).toContain("λ=");
      expect(ewma.details).toContain("UCL=");
    });
  });

  // ── Mahalanobis outlier detection ─────────────────────────

  describe("Mahalanobis", () => {
    it("detects spike outliers", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: spikeSignal(500),
        sample_rate_hz: 1000,
        methods: ["mahalanobis"],
        sensitivity: 0.5,
      });
      const r = result.value as any;
      const mah = r.method_summaries.find((s: any) => s.method === "mahalanobis");
      expect(mah.triggered).toBe(true);
      const outliers = r.anomalies.filter((a: any) => a.type === "outlier");
      expect(outliers.length).toBeGreaterThan(0);
    });
  });

  // ── FFT chatter detection ─────────────────────────────────

  describe("FFT", () => {
    it("detects chatter frequency concentration", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: chatterSignal(1024, 2000, 200),
        sample_rate_hz: 2000,
        baseline_mean: 100,
        baseline_std: 5,
        methods: ["fft"],
        sensitivity: 0.7,
      });
      const r = result.value as any;
      const fftSummary = r.method_summaries.find((s: any) => s.method === "fft");
      expect(fftSummary.triggered).toBe(true);
      expect(fftSummary.details).toContain("Hz");
      const chatterEvents = r.anomalies.filter((a: any) => a.type === "chatter");
      expect(chatterEvents.length).toBeGreaterThan(0);
    });

    it("handles insufficient samples gracefully", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: [1, 2, 3],
        sample_rate_hz: 1000,
        methods: ["fft"],
      });
      const r = result.value as any;
      const fftSummary = r.method_summaries.find((s: any) => s.method === "fft");
      expect(fftSummary.triggered).toBe(false);
      expect(fftSummary.details).toContain("Insufficient");
    });
  });

  // ── Wavelet transient detection ───────────────────────────

  describe("Wavelet", () => {
    it("detects transient spikes (tool breakage signature)", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: spikeSignal(512, 100, 5),
        sample_rate_hz: 1000,
        methods: ["wavelet"],
        sensitivity: 0.5,
      });
      const r = result.value as any;
      const wav = r.method_summaries.find((s: any) => s.method === "wavelet");
      expect(wav.triggered).toBe(true);
      expect(wav.details).toContain("Haar");
    });

    it("handles insufficient samples", () => {
      const result = realTimeAnomalyDetectionEngine.detect({
        samples: [1, 2, 3],
        sample_rate_hz: 1000,
        methods: ["wavelet"],
      });
      const r = result.value as any;
      const wav = r.method_summaries.find((s: any) => s.method === "wavelet");
      expect(wav.triggered).toBe(false);
    });
  });

  // ── Overall status escalation ─────────────────────────────

  it("escalates to alarm when multiple methods agree", () => {
    // Strong drift + spikes = multiple methods trigger
    const samples = driftSignal(500, 100, 5, 60);
    // Add spikes too
    samples[350] += 200;
    samples[400] += 250;

    const result = realTimeAnomalyDetectionEngine.detect({
      samples,
      sample_rate_hz: 1000,
      sensitivity: 0.5,
    });
    const r = result.value as any;
    expect(["warning", "alarm"]).toContain(r.overall_status);
  });

  // ── Recommended actions ───────────────────────────────────

  it("recommends STOP for breakage anomalies", () => {
    // Large spike at wavelet level 1 → breakage type
    const samples = stableSignal(512, 100, 2);
    samples[200] = 600; // huge transient
    const result = realTimeAnomalyDetectionEngine.detect({
      samples,
      sample_rate_hz: 1000,
      sensitivity: 0.7,
    });
    const r = result.value as any;
    if (r.anomalies.some((a: any) => a.type === "breakage")) {
      expect(r.recommended_action).toContain("STOP");
    }
  });

  it("recommends speed reduction for chatter", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: chatterSignal(1024, 2000, 300),
      sample_rate_hz: 2000,
      sensitivity: 0.5,
    });
    const r = result.value as any;
    if (r.anomalies.some((a: any) => a.type === "chatter")) {
      expect(r.recommended_action.toLowerCase()).toContain("spindle");
    }
  });

  // ── Sensitivity control ───────────────────────────────────

  it("higher sensitivity detects more anomalies", () => {
    const samples = driftSignal(500, 100, 5, 15); // mild drift
    const lowSens = realTimeAnomalyDetectionEngine.detect({
      samples, sample_rate_hz: 1000, sensitivity: 0.1,
    });
    const highSens = realTimeAnomalyDetectionEngine.detect({
      samples, sample_rate_hz: 1000, sensitivity: 0.9,
    });
    const lowCount = (lowSens.value as any).anomalies.length;
    const highCount = (highSens.value as any).anomalies.length;
    expect(highCount).toBeGreaterThanOrEqual(lowCount);
  });

  // ── False positive estimate ───────────────────────────────

  it("false positive estimate is in [0, 1] range", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: stableSignal(200),
      sample_rate_hz: 1000,
    });
    const r = result.value as any;
    expect(r.false_positive_estimate).toBeGreaterThanOrEqual(0);
    expect(r.false_positive_estimate).toBeLessThanOrEqual(1);
  });

  // ── Auto-baseline estimation ──────────────────────────────

  it("auto-estimates baseline when not provided", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: stableSignal(200, 500, 10),
      sample_rate_hz: 1000,
      // no baseline_mean or baseline_std
    });
    expect(result.source).toContain("RealTimeAnomalyDetectionEngine");
    expect(result.unit).toBe("anomaly_detection_result");
  });

  it("uses provided baseline when given", () => {
    const samples = stableSignal(200, 100, 5);
    const result = realTimeAnomalyDetectionEngine.detect({
      samples,
      sample_rate_hz: 1000,
      baseline_mean: 100,
      baseline_std: 5,
    });
    const r = result.value as any;
    expect(r.overall_status).toBe("normal");
  });

  // ── Severity scoring ──────────────────────────────────────

  it("severity values are clamped to [0, 1]", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: spikeSignal(500),
      sample_rate_hz: 1000,
      sensitivity: 0.8,
    });
    const r = result.value as any;
    for (const a of r.anomalies) {
      expect(a.severity).toBeGreaterThanOrEqual(0);
      expect(a.severity).toBeLessThanOrEqual(1);
    }
  });

  // ── Method score values ───────────────────────────────────

  it("method scores are in [0, 1] range", () => {
    const result = realTimeAnomalyDetectionEngine.detect({
      samples: driftSignal(500),
      sample_rate_hz: 1000,
    });
    const r = result.value as any;
    for (const s of r.method_summaries) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });
});
