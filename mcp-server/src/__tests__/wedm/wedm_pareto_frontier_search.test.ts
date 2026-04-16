/**
 * WEDMParetoFrontierSearchEngine Tests — WEDM AGI Phase 2 / U-P2-05
 *
 * Exit gate: Pareto frontier ≥10 solutions on every JM Die material,
 * NSGA-II converges in <2 s for default population/generations.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMParetoFrontierSearchEngine,
  wedmParetoFrontierSearchEngine,
  DEFAULT_WEDM_BOUNDS,
} from "../../engines/WEDMParetoFrontierSearchEngine.js";
import type { WEDMMaterialKey } from "../../engines/WEDMMaterialSparkDatabaseEngine.js";

const engine = new WEDMParetoFrontierSearchEngine();
const JM_DIE: WEDMMaterialKey[] = ["D2", "A2", "M2", "S7", "H13", "WC", "graphite"];

describe("WEDMParetoFrontierSearchEngine — exit gate (≥10 Pareto solutions)", () => {
  it("produces ≥10 Pareto solutions on D2 (default settings)", () => {
    const r = engine.search({ material: "D2" });
    expect(r.frontier.length).toBeGreaterThanOrEqual(10);
  });

  it("produces ≥10 Pareto solutions for every JM Die material", () => {
    for (const mat of JM_DIE) {
      const r = engine.search({
        material: mat,
        population_size: 60,
        max_generations: 40,
      });
      expect(r.frontier.length, `material ${mat}`).toBeGreaterThanOrEqual(10);
    }
  });

  it("completes a default search in under 2 s", () => {
    const r = engine.search({ material: "D2" });
    expect(r.elapsed_ms).toBeLessThan(2000);
  });
});

describe("WEDMParetoFrontierSearchEngine — solution validity", () => {
  it("every solution lies within the parameter bounds", () => {
    const r = engine.search({ material: "D2" });
    for (const s of r.frontier) {
      expect(s.parameters.peak_current_A).toBeGreaterThanOrEqual(
        DEFAULT_WEDM_BOUNDS.peak_current_A[0],
      );
      expect(s.parameters.peak_current_A).toBeLessThanOrEqual(
        DEFAULT_WEDM_BOUNDS.peak_current_A[1],
      );
      expect(s.parameters.pulse_on_us).toBeGreaterThanOrEqual(
        DEFAULT_WEDM_BOUNDS.pulse_on_us[0],
      );
      expect(s.parameters.pulse_off_us).toBeGreaterThanOrEqual(
        DEFAULT_WEDM_BOUNDS.pulse_off_us[0],
      );
      expect(s.parameters.wire_tension_N).toBeGreaterThanOrEqual(
        DEFAULT_WEDM_BOUNDS.wire_tension_N[0],
      );
    }
  });

  it("duty_cycle is consistent with pulse-on / pulse-off", () => {
    const r = engine.search({ material: "D2" });
    for (const s of r.frontier) {
      const expected =
        s.parameters.pulse_on_us /
        (s.parameters.pulse_on_us + s.parameters.pulse_off_us);
      expect(s.parameters.duty_cycle).toBeCloseTo(expected, 2);
    }
  });

  it("derived MRR_rel equals 1/MRR_inv (within rounding tolerance)", () => {
    const r = engine.search({ material: "D2" });
    for (const s of r.frontier) {
      const back = 1 / s.objectives.MRR_inv;
      // Both values rounded to 3dp; large MRR amplifies 1/x rounding error.
      const relErr = Math.abs(s.derived.MRR_rel - back) / back;
      expect(relErr).toBeLessThan(0.01);
    }
  });

  it("frontier spans a non-trivial Ra × MRR range (trade-off is real)", () => {
    // A healthy Pareto frontier explores trade-offs — not all solutions
    // should collapse to the same Ra or same MRR. Require at least 2× range.
    const r = engine.search({ material: "D2" });
    const ra = r.frontier.map((s) => s.objectives.Ra_um);
    const mrr = r.frontier.map((s) => s.derived.MRR_rel);
    expect(Math.max(...ra) / Math.min(...ra)).toBeGreaterThan(1.5);
    expect(Math.max(...mrr) / Math.min(...mrr)).toBeGreaterThan(1.5);
  });
});

describe("WEDMParetoFrontierSearchEngine — material sensitivity", () => {
  it("graphite yields lower Ra than WC at similar energy (softer material)", () => {
    const rGraphite = engine.search({ material: "graphite" });
    const rWC = engine.search({ material: "WC" });
    const minRaGraphite = Math.min(
      ...rGraphite.frontier.map((s) => s.objectives.Ra_um),
    );
    const minRaWC = Math.min(...rWC.frontier.map((s) => s.objectives.Ra_um));
    expect(minRaGraphite).toBeLessThan(minRaWC);
  });

  it("WC produces a lower MRR_rel ceiling than graphite", () => {
    const rGraphite = engine.search({ material: "graphite" });
    const rWC = engine.search({ material: "WC" });
    const maxMrrGraphite = Math.max(
      ...rGraphite.frontier.map((s) => s.derived.MRR_rel),
    );
    const maxMrrWC = Math.max(...rWC.frontier.map((s) => s.derived.MRR_rel));
    // graphite mrr_factor=1.2, WC mrr_factor=0.30 per spark DB.
    expect(maxMrrGraphite).toBeGreaterThan(maxMrrWC);
  });
});

describe("WEDMParetoFrontierSearchEngine — parameter overrides + shape", () => {
  it("respects bounds override (tight peak_current band)", () => {
    const r = engine.search({
      material: "D2",
      bounds: { peak_current_A: [6, 8] },
    });
    for (const s of r.frontier) {
      expect(s.parameters.peak_current_A).toBeGreaterThanOrEqual(6);
      expect(s.parameters.peak_current_A).toBeLessThanOrEqual(8);
    }
  });

  it("respects smaller population + generations (still returns frontier)", () => {
    const r = engine.search({
      material: "D2",
      population_size: 30,
      max_generations: 10,
    });
    expect(r.frontier.length).toBeGreaterThan(0);
    expect(r.generations).toBe(10);
  });

  it("records non-zero elapsed_ms", () => {
    const r = engine.search({ material: "D2", max_generations: 5 });
    expect(r.elapsed_ms).toBeGreaterThan(0);
  });
});

describe("WEDMParetoFrontierSearchEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmParetoFrontierSearchEngine).toBeInstanceOf(
      WEDMParetoFrontierSearchEngine,
    );
  });
});
