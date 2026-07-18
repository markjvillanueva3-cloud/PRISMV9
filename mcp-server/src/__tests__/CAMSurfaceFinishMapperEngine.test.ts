/**
 * CAMSurfaceFinishMapperEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-FINISH-MAPPER
 */
import { describe, it, expect } from "vitest";
import { CAMSurfaceFinishMapperEngine } from "../engines/CAMSurfaceFinishMapperEngine.js";

const engine = new CAMSurfaceFinishMapperEngine();

describe("CAMSurfaceFinishMapperEngine", () => {

  it("Ra 0.05 → lap+polish secondary required", () => {
    const r = engine.map(0.05);
    expect(r.strategies).toContain("lap_polish");
    expect(r.needsSecondaryOp).toBe(true);
    expect(r.stepoverMm).toBe(0.025);
  });

  it("Ra 0.4 → ball_scallop_tight, no secondary", () => {
    const r = engine.map(0.4);
    expect(r.strategies).toEqual(["ball_scallop_tight"]);
    expect(r.needsSecondaryOp).toBe(false);
    expect(r.stepoverMm).toBe(0.05);
  });

  it("Ra 0.8 → ball_scallop_pencil", () => {
    const r = engine.map(0.8);
    expect(r.strategies).toEqual(["ball_scallop_pencil"]);
    expect(r.stepoverMm).toBe(0.10);
  });

  it("Ra 1.6 → contour_waterline", () => {
    const r = engine.map(1.6);
    expect(r.strategies).toEqual(["contour_waterline"]);
    expect(r.stepoverMm).toBe(0.20);
  });

  it("Ra 3.2 → semi_finish", () => {
    const r = engine.map(3.2);
    expect(r.strategies).toEqual(["semi_finish"]);
    expect(r.stepoverMm).toBe(0.30);
  });

  it("Ra 6.3 → rough_only (no finish pass)", () => {
    const r = engine.map(6.3);
    expect(r.strategies).toEqual(["rough_only"]);
    expect(r.needsSecondaryOp).toBe(false);
  });

  it("monotonicity: tighter Ra → smaller stepover", () => {
    const stepovers = [0.05, 0.4, 0.8, 1.6, 3.2, 6.3].map((ra) => engine.map(ra).stepoverMm);
    for (let i = 1; i < stepovers.length; i++) {
      expect(stepovers[i]).toBeGreaterThanOrEqual(stepovers[i - 1]);
    }
  });

  it("monotonicity: tighter Ra → smaller scallop", () => {
    const scallops = [0.05, 0.4, 0.8, 1.6, 3.2, 6.3].map((ra) => engine.map(ra).scallopMm);
    for (let i = 1; i < scallops.length; i++) {
      expect(scallops[i]).toBeGreaterThanOrEqual(scallops[i - 1]);
    }
  });

  it("Ra 0 clamped to floor 0.001 → still maps to lap_polish band", () => {
    const r = engine.map(0);
    expect(r.raMicrometers).toBeCloseTo(0.001, 3);
    expect(r.strategies).toContain("lap_polish");
  });

  it("Ra at exact boundary 0.1 maps to lap_polish band (inclusive)", () => {
    const r = engine.map(0.1);
    expect(r.strategies).toContain("lap_polish");
  });

  it("Ra at exact boundary 0.4 maps to ball_scallop_tight (inclusive upper)", () => {
    const r = engine.map(0.4);
    expect(r.strategies).toEqual(["ball_scallop_tight"]);
  });

  it("Ra just above 0.4 (0.41) moves to ball_scallop_pencil", () => {
    const r = engine.map(0.41);
    expect(r.strategies).toEqual(["ball_scallop_pencil"]);
  });

  it("strategies() returns all 6 FinishStrategy values", () => {
    const s = engine.strategies();
    expect(s.length).toBe(6);
    expect(s).toContain("lap_polish");
    expect(s).toContain("rough_only");
  });

  it("thresholds() returns the 5 Ra-band boundaries", () => {
    const t = engine.thresholds();
    expect(t.lap).toBe(0.1);
    expect(t.ballTight).toBe(0.4);
    expect(t.ballPencil).toBe(0.8);
    expect(t.contour).toBe(1.6);
    expect(t.semi).toBe(3.2);
  });

  it("rationale string is informative for every band", () => {
    for (const ra of [0.05, 0.4, 0.8, 1.6, 3.2, 6.3]) {
      const r = engine.map(ra);
      expect(r.rationale.length).toBeGreaterThan(10);
    }
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes map + strategies + thresholds", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("map");
    expect(names).toContain("strategies");
    expect(names).toContain("thresholds");
  });
});
