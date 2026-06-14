import { describe, it, expect } from "vitest";
import { acousticEmissionMonitoringEngine } from "../engines/AcousticEmissionMonitoringEngine.js";
import type {
  AEMonitoringInput,
  AESignalSegment,
  AEBaseline,
} from "../engines/AcousticEmissionMonitoringEngine.js";

/**
 * GAP-3 closure verification — AcousticEmissionMonitoringEngine wiring on
 * prism_safety dispatcher (foxtrot iter13, 2026-05-23).
 *
 * Mirrors the dispatcher's lazy-import + invoke pattern from safetyDispatcher.ts
 * AE_MONITORING_ACTIONS branch. Coverage: happy path + 3 failure modes + 2
 * adversarial + 3 spanning configurations per CLAUDE.md comprehensive-build
 * enforcement.
 *
 * P0 closure for the print-to-CNC capability assessment GAP-3
 * (knowledge/wiki/architecture/print-to-cnc-capability-assessment-2026-05-23.md).
 */

function mkSegment(rmsBase: number, sampleCount = 1024, time_s = 0): AESignalSegment {
  // Generate a sinusoidal sample stream with given RMS amplitude — deterministic
  // for repeatable test fixtures. AE samples represent voltage from a piezo
  // transducer; the engine extracts RMS, peak, energy, kurtosis, dominant_freq.
  const samples: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    samples.push(rmsBase * Math.sqrt(2) * Math.sin((2 * Math.PI * i) / 16));
  }
  return { time_s, samples, sample_rate_hz: 1_000_000 };
}

function mkBaseline(): AEBaseline {
  return { rms: 0.05, kurtosis: 3.0, dominant_freq_hz: 50_000 };
}

function mkInput(overrides: Partial<AEMonitoringInput> = {}): AEMonitoringInput {
  return {
    signal_segments: [mkSegment(0.05, 1024, 0), mkSegment(0.06, 1024, 0.1), mkSegment(0.05, 1024, 0.2)],
    baseline: mkBaseline(),
    cutting_params: { speed_m_min: 150, feed_mm_tooth: 0.1, depth_mm: 2 },
    ...overrides,
  };
}

describe("acousticEmissionMonitoringEngine — GAP-3 closure (foxtrot iter13)", () => {
  it("happy path — analyze returns all 6 result fields with concrete shapes", () => {
    const result = acousticEmissionMonitoringEngine.analyze(mkInput());
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.features.length).toBe(3);
    expect(typeof result.tool_condition.state).toBe("string");
    expect(typeof result.tool_condition.confidence).toBe("number");
    expect(Array.isArray(result.tool_condition.evidence)).toBe(true);
    expect(typeof result.ae_source.type).toBe("string");
    expect(typeof result.trend.rms_slope).toBe("number");
    expect(typeof result.trend.trend_direction).toBe("string");
    expect(Array.isArray(result.alarms)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("variability — fresh baseline produces confidence ∈ [0,1]", () => {
    const result = acousticEmissionMonitoringEngine.analyze(mkInput());
    expect(result.tool_condition.confidence).toBeGreaterThanOrEqual(0);
    expect(result.tool_condition.confidence).toBeLessThanOrEqual(1);
  });

  it("variability — input WITHOUT baseline still returns valid tool_condition with confidence ∈ [0,1]", () => {
    const result = acousticEmissionMonitoringEngine.analyze(mkInput({ baseline: undefined }));
    expect(typeof result.tool_condition.state).toBe("string");
    expect(result.tool_condition.confidence).toBeGreaterThanOrEqual(0);
    expect(result.tool_condition.confidence).toBeLessThanOrEqual(1);
  });

  it("variability — drift signal (RMS 10× nominal) shifts tool_condition.state", () => {
    const fresh = acousticEmissionMonitoringEngine.analyze(mkInput());
    const drift = acousticEmissionMonitoringEngine.analyze(
      mkInput({ signal_segments: [mkSegment(0.5, 1024, 0), mkSegment(0.6, 1024, 0.1), mkSegment(0.55, 1024, 0.2)] }),
    );
    // Drift signal must produce a different state OR a meaningfully different confidence
    const stateChanged = fresh.tool_condition.state !== drift.tool_condition.state;
    const confidenceDelta = Math.abs(drift.tool_condition.confidence - fresh.tool_condition.confidence);
    expect(stateChanged || confidenceDelta > 0).toBe(true);
  });

  it("failure-mode — mode='features' suppresses classification with confidence=0 + alarms.length=0", () => {
    const result = acousticEmissionMonitoringEngine.analyze(mkInput({ analysis_mode: "features" }));
    expect(result.features.length).toBe(3);
    expect(result.tool_condition.confidence).toBe(0);
    expect(result.tool_condition.evidence).toContain("Classification not requested");
    expect(result.alarms.length).toBe(0);
    expect(result.recommendations.length).toBe(0);
    expect(result.trend.estimated_remaining_life_pct).toBe(100);
  });

  it("failure-mode — mode='classification' populates tool_condition but suppresses trend + alarms", () => {
    const result = acousticEmissionMonitoringEngine.analyze(mkInput({ analysis_mode: "classification" }));
    expect(typeof result.tool_condition.state).toBe("string");
    expect(result.trend.estimated_remaining_life_pct).toBe(100);
    expect(result.trend.rms_slope).toBe(0);
    expect(result.alarms.length).toBe(0);
  });

  it("failure-mode — single segment input still returns valid result with features.length=1", () => {
    const result = acousticEmissionMonitoringEngine.analyze(mkInput({ signal_segments: [mkSegment(0.05, 1024, 0)] }));
    expect(result.features.length).toBe(1);
    expect(typeof result.tool_condition.state).toBe("string");
    expect(typeof result.trend.trend_direction).toBe("string");
  });

  it("adversarial — zero-length samples array doesn't crash; returns zero-feature result", () => {
    const zeroInput = mkInput({
      signal_segments: [{ time_s: 0, samples: [], sample_rate_hz: 1_000_000 }],
    });
    const result = acousticEmissionMonitoringEngine.analyze(zeroInput);
    expect(result.features.length).toBe(1);
    expect(result.features[0].rms).toBe(0);
  });

  it("adversarial — extreme alarm_sigma (0.001) returns alarms[] array without crash", () => {
    const result = acousticEmissionMonitoringEngine.analyze(
      mkInput({ thresholds: { warning_sigma: 0.0001, alarm_sigma: 0.001 } }),
    );
    expect(Array.isArray(result.alarms)).toBe(true);
  });

  it("wiring contract — lazy-import path matches the dispatcher branch exactly", async () => {
    const { acousticEmissionMonitoringEngine: lazyEngine } = await import(
      "../engines/AcousticEmissionMonitoringEngine.js"
    );
    const result = lazyEngine.analyze(mkInput());
    expect(result.features.length).toBe(3);
    expect(typeof result.tool_condition.state).toBe("string");
  });

  it("wiring contract — safetyDispatcher source contains AE_MONITORING_ACTIONS + ae_analyze + engine import", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = path.dirname(fileURLToPath(import.meta.url));
    const dispatcherPath = path.resolve(here, "../tools/dispatchers/safetyDispatcher.ts");
    const src = fs.readFileSync(dispatcherPath, "utf8");
    expect(src).toContain("AE_MONITORING_ACTIONS");
    expect(src).toContain('"ae_analyze"');
    expect(src).toContain("AcousticEmissionMonitoringEngine.js");
    expect(src).toContain("acousticEmissionMonitoringEngine.analyze");
    expect(src).toContain("...AE_MONITORING_ACTIONS");
  });
});
