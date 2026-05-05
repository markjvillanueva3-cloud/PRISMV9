/**
 * ConsensusDriftDetectorEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DRIFT-DETECTOR.
 *
 * Verifies regression detection over two perf-state snapshots:
 *   - severity classification (none/minor/moderate/severe)
 *   - cold-start exemption (n < minObservations on either side)
 *   - vendor-task disappearance → severe drift
 *   - vendor-task appearance → exempt
 *   - threshold validation
 *   - improvement (positive delta) never flagged
 *   - sort order (severe first, then by |delta|)
 *   - hasActionableDrift gate
 *   - input mutation guarantees (engine is pure)
 */
import { describe, it, expect } from "vitest";
import { ConsensusDriftDetectorEngine } from "../engines/ConsensusDriftDetectorEngine.js";
import type { PerformanceState } from "../engines/ConsensusModelPerformanceEngine.js";

const detector = new ConsensusDriftDetectorEngine();

function makeState(spec: Record<string, Record<string, { ema: number; n: number }>>): PerformanceState {
  const vendors: PerformanceState["vendors"] = {};
  for (const [vendor, tasks] of Object.entries(spec)) {
    const vendorTasks: Record<string, { ema: number; n: number }> = {};
    for (const [taskType, stats] of Object.entries(tasks)) {
      vendorTasks[taskType] = { ema: stats.ema, n: stats.n };
    }
    vendors[vendor] = { tasks: vendorTasks };
  }
  return { schemaVersion: "1.0.0", vendors };
}

describe("ConsensusDriftDetectorEngine", () => {
  // ---- classify() ----

  it("classifies positive delta as none (improvement is never flagged)", () => {
    const t = { minor: 0.05, moderate: 0.15, severe: 0.30 };
    expect(detector.classify(0.5, t)).toBe("none");
    expect(detector.classify(0.0, t)).toBe("none");
    expect(detector.classify(-0.04, t)).toBe("none");
  });

  it("classifies delta in [-minor, -moderate) as minor", () => {
    const t = { minor: 0.05, moderate: 0.15, severe: 0.30 };
    expect(detector.classify(-0.05, t)).toBe("minor");
    expect(detector.classify(-0.10, t)).toBe("minor");
    expect(detector.classify(-0.149, t)).toBe("minor");
  });

  it("classifies delta in [-moderate, -severe) as moderate", () => {
    const t = { minor: 0.05, moderate: 0.15, severe: 0.30 };
    expect(detector.classify(-0.15, t)).toBe("moderate");
    expect(detector.classify(-0.20, t)).toBe("moderate");
    expect(detector.classify(-0.299, t)).toBe("moderate");
  });

  it("classifies delta below -severe as severe", () => {
    const t = { minor: 0.05, moderate: 0.15, severe: 0.30 };
    expect(detector.classify(-0.30, t)).toBe("severe");
    expect(detector.classify(-0.50, t)).toBe("severe");
    expect(detector.classify(-1.0, t)).toBe("severe");
  });

  it("classifies NaN/+Infinity as none, -Infinity as severe (defensive)", () => {
    const t = { minor: 0.05, moderate: 0.15, severe: 0.30 };
    expect(detector.classify(Number.NaN, t)).toBe("none");
    expect(detector.classify(Number.POSITIVE_INFINITY, t)).toBe("none");
    expect(detector.classify(Number.NEGATIVE_INFINITY, t)).toBe("severe");
  });

  // ---- compare() — happy path ----

  it("compare flags moderate regression for plan task on Anthropic", () => {
    const before = makeState({ anthropic: { plan: { ema: 0.85, n: 20 } } });
    const after = makeState({ anthropic: { plan: { ema: 0.65, n: 25 } } });
    const report = detector.compare(before, after);
    expect(report.events).toHaveLength(1);
    expect(report.events[0]).toMatchObject({
      vendor: "anthropic",
      taskType: "plan",
      emaBefore: 0.85,
      emaAfter: 0.65,
      severity: "moderate",
    });
    expect(report.events[0].delta).toBeCloseTo(-0.20, 5);
    expect(report.counts.moderate).toBe(1);
    expect(report.counts.totalCompared).toBe(1);
  });

  it("compare flags severe regression when EMA drops past severe threshold", () => {
    const before = makeState({ openai: { decide: { ema: 0.92, n: 15 } } });
    const after = makeState({ openai: { decide: { ema: 0.50, n: 18 } } });
    const report = detector.compare(before, after);
    expect(report.counts.severe).toBe(1);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].severity).toBe("severe");
    expect(report.events[0].vendor).toBe("openai");
    expect(report.events[0].taskType).toBe("decide");
    expect(report.events[0].delta).toBeCloseTo(-0.42, 5);
  });

  it("compare records no events when EMAs are stable across snapshots", () => {
    const before = makeState({ google: { plan: { ema: 0.7, n: 10 } } });
    const after = makeState({ google: { plan: { ema: 0.71, n: 12 } } });
    const report = detector.compare(before, after);
    expect(report.events).toHaveLength(0);
    expect(report.counts.none).toBe(1);
    expect(report.counts.totalCompared).toBe(1);
  });

  it("compare does NOT flag improvements (positive delta)", () => {
    const before = makeState({ ollama: { decide: { ema: 0.40, n: 20 } } });
    const after = makeState({ ollama: { decide: { ema: 0.85, n: 30 } } });
    const report = detector.compare(before, after);
    expect(report.events).toHaveLength(0);
    expect(report.counts.none).toBe(1);
    expect(report.counts.severe).toBe(0);
    expect(report.counts.moderate).toBe(0);
    expect(report.counts.minor).toBe(0);
  });

  // ---- compare() — cold-start exemption ----

  it("compare exempts vendor-task with n < minObservations on before side", () => {
    const before = makeState({ xai: { plan: { ema: 0.9, n: 2 } } });
    const after = makeState({ xai: { plan: { ema: 0.4, n: 5 } } });
    const report = detector.compare(before, after);
    expect(report.events).toHaveLength(0);
    expect(report.exempt).toContainEqual({ vendor: "xai", taskType: "plan", reason: "below-min-obs" });
    expect(report.counts.exempt).toBe(1);
    expect(report.counts.totalCompared).toBe(0);
  });

  it("compare exempts vendor-task with n < minObservations on after side", () => {
    const before = makeState({ xai: { plan: { ema: 0.9, n: 50 } } });
    const after = makeState({ xai: { plan: { ema: 0.4, n: 3 } } });
    const report = detector.compare(before, after);
    expect(report.events).toHaveLength(0);
    expect(report.exempt).toHaveLength(1);
    expect(report.exempt[0]).toEqual({ vendor: "xai", taskType: "plan", reason: "below-min-obs" });
  });

  it("compare honors custom minObservations override", () => {
    const before = makeState({ xai: { plan: { ema: 0.9, n: 4 } } });
    const after = makeState({ xai: { plan: { ema: 0.4, n: 4 } } });
    const reportDefault = detector.compare(before, after);
    expect(reportDefault.exempt).toHaveLength(1);
    expect(reportDefault.events).toHaveLength(0);
    const reportLowered = detector.compare(before, after, { minObservations: 3 });
    expect(reportLowered.exempt).toHaveLength(0);
    expect(reportLowered.counts.severe).toBe(1);
    expect(reportLowered.events[0].severity).toBe("severe");
  });

  // ---- compare() — disappearance + appearance ----

  it("compare records severe drift when vendor-task disappears in after", () => {
    const before = makeState({ google: { plan: { ema: 0.8, n: 30 } } });
    const after = makeState({ google: { decide: { ema: 0.7, n: 30 } } });
    const report = detector.compare(before, after);
    const planDrifts = report.events.filter((e) => e.taskType === "plan");
    expect(planDrifts).toHaveLength(1);
    expect(planDrifts[0].severity).toBe("severe");
    expect(planDrifts[0].emaAfter).toBe(0);
    expect(planDrifts[0].emaBefore).toBe(0.8);
    expect(planDrifts[0].delta).toBeCloseTo(-0.8, 5);
    expect(planDrifts[0].nAfter).toBe(0);
    expect(planDrifts[0].nBefore).toBe(30);
  });

  it("compare exempts vendor-task that newly appears in after", () => {
    const before = makeState({ google: { plan: { ema: 0.8, n: 30 } } });
    const after = makeState({
      google: { plan: { ema: 0.79, n: 31 }, decide: { ema: 0.5, n: 10 } },
    });
    const report = detector.compare(before, after);
    expect(report.exempt).toContainEqual({ vendor: "google", taskType: "decide", reason: "new-in-after" });
    expect(report.events).toHaveLength(0);
    expect(report.counts.exempt).toBe(1);
  });

  // ---- compare() — sort order ----

  it("compare sorts events severe → moderate → minor, then by |delta| desc", () => {
    const before = makeState({
      a: { x: { ema: 0.9, n: 50 } },
      b: { x: { ema: 0.9, n: 50 } },
      c: { x: { ema: 0.9, n: 50 } },
      d: { x: { ema: 0.9, n: 50 } },
    });
    const after = makeState({
      a: { x: { ema: 0.50, n: 50 } },
      b: { x: { ema: 0.20, n: 50 } },
      c: { x: { ema: 0.78, n: 50 } },
      d: { x: { ema: 0.70, n: 50 } },
    });
    const report = detector.compare(before, after);
    const order = report.events.map((e) => e.vendor);
    expect(order).toEqual(["b", "a", "d", "c"]);
    const severities = report.events.map((e) => e.severity);
    expect(severities).toEqual(["severe", "severe", "moderate", "minor"]);
  });

  // ---- threshold validation ----

  it("compare throws if thresholds are not strictly ordered", () => {
    const before = makeState({ a: { x: { ema: 0.5, n: 10 } } });
    const after = makeState({ a: { x: { ema: 0.5, n: 10 } } });
    expect(() =>
      detector.compare(before, after, { minorThreshold: 0.20, moderateThreshold: 0.10, severeThreshold: 0.30 }),
    ).toThrow();
    expect(() =>
      detector.compare(before, after, { minorThreshold: 0.05, moderateThreshold: 0.15, severeThreshold: 0.10 }),
    ).toThrow();
    expect(() =>
      detector.compare(before, after, { minorThreshold: 0.10, moderateThreshold: 0.10, severeThreshold: 0.30 }),
    ).toThrow();
  });

  // ---- hasActionableDrift ----

  it("hasActionableDrift returns true when moderate or severe events exist", () => {
    const before = makeState({ a: { x: { ema: 0.9, n: 20 } } });
    const after = makeState({ a: { x: { ema: 0.7, n: 20 } } });
    const report = detector.compare(before, after);
    expect(detector.hasActionableDrift(report)).toBe(true);
  });

  it("hasActionableDrift returns false when only minor or no events", () => {
    const before = makeState({ a: { x: { ema: 0.9, n: 20 } } });
    const after = makeState({ a: { x: { ema: 0.85, n: 20 } } });
    const report = detector.compare(before, after);
    expect(detector.hasActionableDrift(report)).toBe(false);
    expect(report.counts.minor).toBe(1);
  });

  // ---- adversarial: empty / mutation ----

  it("compare handles two empty states (zero comparisons)", () => {
    const empty: PerformanceState = { schemaVersion: "1.0.0", vendors: {} };
    const report = detector.compare(empty, empty);
    expect(report.events).toHaveLength(0);
    expect(report.exempt).toHaveLength(0);
    expect(report.counts.totalCompared).toBe(0);
    expect(report.counts.none).toBe(0);
  });

  it("compare does not mutate either input snapshot", () => {
    const before = makeState({ a: { x: { ema: 0.9, n: 20 } } });
    const after = makeState({ a: { x: { ema: 0.4, n: 20 } } });
    const beforeFrozen = JSON.parse(JSON.stringify(before)) as PerformanceState;
    const afterFrozen = JSON.parse(JSON.stringify(after)) as PerformanceState;
    detector.compare(before, after);
    expect(before).toEqual(beforeFrozen);
    expect(after).toEqual(afterFrozen);
  });

  it("compare propagates beforeAt/afterAt timestamps into report metadata", () => {
    const before = makeState({});
    const after = makeState({});
    const report = detector.compare(before, after, {
      beforeAt: "2026-05-04T00:00:00.000Z",
      afterAt: "2026-05-05T00:00:00.000Z",
    });
    expect(report.beforeAt).toBe("2026-05-04T00:00:00.000Z");
    expect(report.afterAt).toBe("2026-05-05T00:00:00.000Z");
  });

  it("compare is deterministic for the same paired snapshots", () => {
    const before = makeState({
      a: { plan: { ema: 0.9, n: 20 }, decide: { ema: 0.7, n: 30 } },
      b: { plan: { ema: 0.8, n: 15 } },
    });
    const after = makeState({
      a: { plan: { ema: 0.6, n: 25 }, decide: { ema: 0.7, n: 31 } },
      b: { plan: { ema: 0.79, n: 16 } },
    });
    const report1 = detector.compare(before, after);
    const report2 = detector.compare(before, after);
    expect(report1.events).toEqual(report2.events);
    expect(report1.exempt).toEqual(report2.exempt);
    expect(report1.counts).toEqual(report2.counts);
  });

  // ---- end-to-end mixed scenario ----

  it("compare produces structured mixed report with severity buckets + exempt + disappear + appear", () => {
    const before = makeState({
      anthropic: { plan: { ema: 0.9, n: 30 }, decide: { ema: 0.85, n: 30 } },
      openai: { plan: { ema: 0.8, n: 20 }, decide: { ema: 0.7, n: 25 } },
      google: { plan: { ema: 0.75, n: 15 } },
      ollama: { plan: { ema: 0.6, n: 3 } },
    });
    const after = makeState({
      anthropic: { plan: { ema: 0.45, n: 35 }, decide: { ema: 0.83, n: 32 } },
      openai: { plan: { ema: 0.62, n: 22 }, decide: { ema: 0.55, n: 27 } },
      google: { decide: { ema: 0.5, n: 10 } },
      ollama: { plan: { ema: 0.65, n: 5 } },
      xai: { plan: { ema: 0.5, n: 8 } },
    });
    const report = detector.compare(before, after);
    expect(report.counts.severe).toBeGreaterThanOrEqual(2);
    expect(report.counts.moderate).toBeGreaterThanOrEqual(1);
    expect(report.counts.minor).toBeGreaterThanOrEqual(1);
    expect(report.counts.exempt).toBeGreaterThanOrEqual(2);
    expect(detector.hasActionableDrift(report)).toBe(true);
    const severeEvents = report.events.filter((e) => e.severity === "severe");
    expect(severeEvents.length).toBeGreaterThanOrEqual(2);
  });
});
