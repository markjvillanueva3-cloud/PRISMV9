/**
 * WireRopeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B46
 */
import { describe, it, expect } from "vitest";
import { wireRopeEngine } from "../engines/WireRopeEngine.js";

describe("WireRopeEngine", () => {
  it("MBL > 0", () => {
    const r = wireRopeEngine.calculate({});
    expect(r.minimum_breaking_load.value).toBeGreaterThan(0);
  });

  it("WLL < MBL", () => {
    const r = wireRopeEngine.calculate({});
    expect(r.working_load_limit.value).toBeLessThan(
      r.minimum_breaking_load.value
    );
  });

  it("larger diameter increases MBL", () => {
    const small = wireRopeEngine.calculate({ rope_diameter_mm: 10 });
    const large = wireRopeEngine.calculate({ rope_diameter_mm: 32 });
    expect(large.minimum_breaking_load.value).toBeGreaterThan(
      small.minimum_breaking_load.value
    );
  });

  it("higher grade increases MBL", () => {
    const lo = wireRopeEngine.calculate({ rope_grade: "1570" });
    const hi = wireRopeEngine.calculate({ rope_grade: "2160" });
    expect(hi.minimum_breaking_load.value).toBeGreaterThan(
      lo.minimum_breaking_load.value
    );
  });

  it("system efficiency < 1 with sheaves", () => {
    const r = wireRopeEngine.calculate({ num_sheaves: 4 });
    expect(r.system_efficiency.value).toBeLessThan(1);
  });

  it("more sheaves reduces efficiency", () => {
    const few = wireRopeEngine.calculate({ num_sheaves: 1 });
    const many = wireRopeEngine.calculate({ num_sheaves: 6 });
    expect(many.system_efficiency.value).toBeLessThan(
      few.system_efficiency.value
    );
  });

  it("line pull > 0", () => {
    const r = wireRopeEngine.calculate({});
    expect(r.line_pull.value).toBeGreaterThan(0);
  });

  it("severe service has higher design factor", () => {
    const normal = wireRopeEngine.calculate({ service: "normal" });
    const severe = wireRopeEngine.calculate({ service: "severe" });
    expect(severe.design_factor.value).toBeGreaterThan(
      normal.design_factor.value
    );
  });

  it("D/d ratio > 0", () => {
    const r = wireRopeEngine.calculate({});
    expect(r.d_d_ratio_sheave.value).toBeGreaterThan(0);
  });

  it("warns small sheave D/d", () => {
    const r = wireRopeEngine.calculate({
      rope_diameter_mm: 20,
      sheave_diameter_mm: 200,
      construction: "6x19",
    });
    expect(r.warnings.some(w => w.includes("D/d") || w.includes("wear"))).toBe(true);
  });
});
