/**
 * PipelineMetricsEngine.test.ts — CPP-MS5-U-CPP37
 *
 * Unit tests for the pure metrics-collection engine. Covers byte aggregate
 * math, handoff roundtrip calc, empty-link rate, zero/edge cases, and the
 * full collect() snapshot shape.
 *
 * @milestone CPP-MS5-U-CPP37
 */

import { describe, it, expect } from "vitest";
import {
  PipelineMetricsEngine,
  type PipelineMetricsInput,
} from "../engines/PipelineMetricsEngine.js";

const engine = new PipelineMetricsEngine();

describe("PipelineMetricsEngine.computeSurvivalBytes", () => {
  it("returns all-zero stats for empty input", () => {
    const stats = engine.computeSurvivalBytes([]);
    expect(stats).toEqual({ count: 0, total: 0, max: 0, min: 0, avg: 0 });
  });

  it("computes count/total/max/min/avg across survival files", () => {
    const stats = engine.computeSurvivalBytes([
      { path: "/a.md", bytes: 100, mtimeMs: 0 },
      { path: "/b.md", bytes: 200, mtimeMs: 0 },
      { path: "/c.md", bytes: 300, mtimeMs: 0 },
    ]);
    expect(stats.count).toBe(3);
    expect(stats.total).toBe(600);
    expect(stats.max).toBe(300);
    expect(stats.min).toBe(100);
    expect(stats.avg).toBe(200);
  });

  it("max and min are equal for single-file input", () => {
    const stats = engine.computeSurvivalBytes([{ path: "/x", bytes: 42, mtimeMs: 0 }]);
    expect(stats.max).toBe(42);
    expect(stats.min).toBe(42);
    expect(stats.avg).toBe(42);
  });

  it("rounds avg to integer", () => {
    const stats = engine.computeSurvivalBytes([
      { path: "/a", bytes: 100, mtimeMs: 0 },
      { path: "/b", bytes: 101, mtimeMs: 0 },
      { path: "/c", bytes: 102, mtimeMs: 0 },
    ]);
    expect(stats.avg).toBe(101); // (100+101+102)/3 = 101 exact
  });
});

describe("PipelineMetricsEngine.computeHandoffRoundtrip", () => {
  it("returns 0 for empty list", () => {
    expect(engine.computeHandoffRoundtrip([])).toBe(0);
  });

  it("returns 0 for single file (no delta)", () => {
    expect(engine.computeHandoffRoundtrip([{ path: "/x", mtimeMs: 1000 }])).toBe(0);
  });

  it("returns max - min across handoff mtimes", () => {
    const result = engine.computeHandoffRoundtrip([
      { path: "/a", mtimeMs: 1_000_000 },
      { path: "/b", mtimeMs: 1_005_000 },
      { path: "/c", mtimeMs: 1_002_000 },
    ]);
    expect(result).toBe(5000);
  });

  it("handles unsorted input", () => {
    const result = engine.computeHandoffRoundtrip([
      { path: "/a", mtimeMs: 2000 },
      { path: "/b", mtimeMs: 100 },
      { path: "/c", mtimeMs: 999 },
    ]);
    expect(result).toBe(1900);
  });
});

describe("PipelineMetricsEngine.collect (full snapshot)", () => {
  const baseInput: PipelineMetricsInput = {
    survivalFiles: [
      { path: "/s1.md", bytes: 2000, mtimeMs: 1_000_000 },
      { path: "/s2.md", bytes: 2500, mtimeMs: 1_000_100 },
    ],
    handoffFiles: [
      { path: "/h1.md", mtimeMs: 2_000_000 },
      { path: "/h2.md", mtimeMs: 2_050_000 },
    ],
    integrityLinks: [
      { stage: "compaction_survival", empty: false },
      { stage: "handoff", empty: false },
      { stage: "session_artifacts", empty: false },
    ],
    capturedAt: "2026-04-17T02:00:00.000Z",
  };

  it("returns schemaVersion 1", () => {
    const out = engine.collect(baseInput);
    expect(out.schemaVersion).toBe(1);
  });

  it("compactionCount equals number of survival files", () => {
    const out = engine.collect(baseInput);
    expect(out.compactionCount).toBe(2);
  });

  it("handoffRoundtripMs = max−min across handoff mtimes", () => {
    const out = engine.collect(baseInput);
    expect(out.handoffRoundtripMs).toBe(50_000);
  });

  it("emptyFileRate=0 for all-healthy chain; correctly reports 0/total", () => {
    const out = engine.collect(baseInput);
    expect(out.emptyFileRate).toBe(0);
    expect(out.emptyLinkCount).toBe(0);
    expect(out.totalLinkCount).toBe(3);
  });

  it("emptyFileRate = 0.3333 for 1 empty / 3 links", () => {
    const out = engine.collect({
      ...baseInput,
      integrityLinks: [
        { stage: "compaction_survival", empty: false },
        { stage: "handoff", empty: true },
        { stage: "session_artifacts", empty: false },
      ],
    });
    expect(out.emptyFileRate).toBe(0.3333);
    expect(out.emptyLinkCount).toBe(1);
  });

  it("emptyFileRate = 1.0 when every link empty", () => {
    const out = engine.collect({
      ...baseInput,
      integrityLinks: [
        { stage: "a", empty: true },
        { stage: "b", empty: true },
      ],
    });
    expect(out.emptyFileRate).toBe(1);
  });

  it("emptyFileRate = 0 for empty link list (defensive)", () => {
    const out = engine.collect({ ...baseInput, integrityLinks: [] });
    expect(out.emptyFileRate).toBe(0);
    expect(out.totalLinkCount).toBe(0);
  });

  it("survivalBytes stat block reflects input files", () => {
    const out = engine.collect(baseInput);
    expect(out.survivalBytes.count).toBe(2);
    expect(out.survivalBytes.total).toBe(4500);
    expect(out.survivalBytes.max).toBe(2500);
    expect(out.survivalBytes.min).toBe(2000);
    expect(out.survivalBytes.avg).toBe(2250);
  });

  it("capturedAt passes through when provided, else uses now()", () => {
    const out1 = engine.collect(baseInput);
    expect(out1.capturedAt).toBe("2026-04-17T02:00:00.000Z");
    const out2 = engine.collect({ ...baseInput, capturedAt: undefined });
    expect(out2.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("zero-file scenario produces stable all-zero snapshot", () => {
    const out = engine.collect({
      survivalFiles: [],
      handoffFiles: [],
      integrityLinks: [],
      capturedAt: "2026-04-17T00:00:00.000Z",
    });
    expect(out.compactionCount).toBe(0);
    expect(out.survivalBytes.total).toBe(0);
    expect(out.handoffRoundtripMs).toBe(0);
    expect(out.emptyFileRate).toBe(0);
    expect(out.totalLinkCount).toBe(0);
  });

  it("handoffCount reflects input length", () => {
    const out = engine.collect({ ...baseInput, handoffFiles: [
      { path: "/a", mtimeMs: 1 },
      { path: "/b", mtimeMs: 2 },
      { path: "/c", mtimeMs: 3 },
    ]});
    expect(out.handoffCount).toBe(3);
  });
});
