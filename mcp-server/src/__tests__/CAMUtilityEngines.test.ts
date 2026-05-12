import { describe, it, expect } from "vitest";
import {
  ProgramCompareEngine,
  CAMResultCacheEngine,
  BatchCAMEngine,
} from "../engines/CAMUtilityEngines.js";

describe("ProgramCompareEngine", () => {
  const engine = new ProgramCompareEngine();

  it("compares two G-code programs", () => {
    const a = "O1000\nG90\nG00 X0 Y0 Z5\nG01 X50 Y0 Z-5 F2000\nM30";
    const b = "O2000\nG90\nG00 X0 Y0 Z5\nG01 X50 Y0 Z-5 F3000\nM30";
    const r = engine.compare(a, b);
    expect(r.line_count.a).toBe(5);
    expect(r.line_count.b).toBe(5);
    expect(r.feed_stats.a_avg).toBe(2000);
    expect(r.feed_stats.b_avg).toBe(3000);
    expect(r.verdict).toBeDefined();
  });

  it("detects line count differences", () => {
    const a = "G00 X0\nG01 X10 F1000\nM30";
    const b = "G00 X0\nG01 X10 F1000\nG01 X20 F1000\nM30";
    const r = engine.compare(a, b);
    expect(r.line_count.diff).toBe(1);
  });
});

describe("CAMResultCacheEngine", () => {
  const cache = new CAMResultCacheEngine();

  it("stores and retrieves results", () => {
    const params = { type: "pocket", material: "P20" };
    cache.set(params, { gcode: "G00 X0" });
    const r = cache.get(params);
    expect(r).toBeDefined();
    expect(r.gcode).toBe("G00 X0");
  });

  it("returns null for cache miss", () => {
    const r = cache.get({ type: "nonexistent" });
    expect(r).toBeNull();
  });

  it("tracks cache size", () => {
    cache.clear();
    cache.set({ a: 1 }, { result: 1 });
    cache.set({ a: 2 }, { result: 2 });
    expect(cache.size).toBe(2);
  });
});

describe("BatchCAMEngine", () => {
  const engine = new BatchCAMEngine();

  it("processes multiple parts", async () => {
    const result = await engine.generateBatch(
      [
        { part_id: "p1", features: [{ type: "pocket" }],
          material: "P20", machine_name: "generic" },
        { part_id: "p2", features: [{ type: "drill" }],
          material: "Al", machine_name: "generic" },
      ],
      async (params) => ({
        success: true,
        gcode: "G00 X0\nG01 X10\nM30",
        cycle_time: { p50_min: 2.5 },
      }),
    );
    expect(result.total_parts).toBe(2);
    expect(result.successful).toBe(2);
    expect(result.total_cycle_time_min).toBe(5);
  });

  it("handles failures gracefully", async () => {
    const result = await engine.generateBatch(
      [{ part_id: "bad", features: [],
        material: "X", machine_name: "none" }],
      async () => { throw new Error("bad input"); },
    );
    expect(result.failed).toBe(1);
    expect(result.results[0].errors?.length).toBeGreaterThan(0);
  });
});
