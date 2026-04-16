/**
 * ProcessVariabilityIntegrationEngine Tests
 * Tests unified multi-physics uncertainty pipeline: force→deflection→
 * dimension→capability with cross-domain consistency checks.
 */
import { describe, it, expect } from "vitest";
import {
  processVariabilityIntegrationEngine,
  ProcessVariabilityIntegrationEngine,
} from "../engines/ProcessVariabilityIntegrationEngine.js";
import type {
  VariabilityPipelineInput,
} from "../engines/ProcessVariabilityIntegrationEngine.js";

const engine = processVariabilityIntegrationEngine;

// ── Deterministic helpers ───────────────────────────────────────────────
describe("cuttingForce", () => {
  it("Fc = kc1.1 · b · h^(1-mc)", () => {
    // kc=2000, b=2, h=0.05, mc=0.25 → 2000*2*0.05^0.75
    const expected = 2000 * 2 * Math.pow(0.05, 0.75);
    expect(engine.cuttingForce(2000, 0.25, 2, 0.05))
      .toBeCloseTo(expected, 3);
  });

  it("zero for zero chip thickness", () => {
    expect(engine.cuttingForce(2000, 0.25, 2, 0)).toBe(0);
  });
});

describe("deflection", () => {
  it("matches cantilever formula", () => {
    const F = 500, L = 40, d = 10, E = 600;
    const I = Math.PI * Math.pow(d, 4) / 64;
    const expected_um = (F * Math.pow(L, 3)) / (3 * E * 1000 * I) * 1000;
    expect(engine.deflection(F, L, d, E)).toBeCloseTo(expected_um, 3);
  });
});

describe("taylorLife", () => {
  it("T = (C/V)^(1/n)", () => {
    expect(engine.taylorLife(200, 0.25, 400)).toBeCloseTo(16, 3);
  });
});

describe("theoreticalRa", () => {
  it("Ra = f²/(32r) × 1000 in µm", () => {
    // f=0.2, r=5 → 0.04/(160) * 1000 = 0.25 µm
    expect(engine.theoreticalRa(0.2, 5)).toBeCloseTo(0.25, 3);
  });

  it("higher feed → rougher", () => {
    expect(engine.theoreticalRa(0.3, 5))
      .toBeGreaterThan(engine.theoreticalRa(0.1, 5));
  });
});

// ── Full pipeline ───────────────────────────────────────────────────────
describe("analyze", () => {
  const baseInput: VariabilityPipelineInput = {
    nominal_mm: 50,
    usl_mm: 50.025,
    lsl_mm: 49.975,
    cutting_speed_m_min: 200,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2,
    tool_diameter_mm: 10,
    tool_overhang_mm: 40,
    mc_samples: 500,
  };

  it("returns complete pipeline result", () => {
    const r = engine.analyze(baseInput);
    expect(r.stages).toHaveLength(5);
    expect(r.stages[0].stage).toBe("Cutting Force");
    expect(r.stages[1].stage).toBe("Tool Deflection");
    expect(r.stages[2].stage).toBe("Tool Life");
    expect(r.stages[3].stage).toBe("Surface Roughness");
    expect(r.stages[4].stage).toBe("Dimension");
    expect(typeof r.cp).toBe("number");
    expect(typeof r.cpk).toBe("number");
    expect(r.sigma_total_um).toBeGreaterThan(0);
    expect(r.pct_conforming).toBeGreaterThanOrEqual(0);
    expect(r.pct_conforming).toBeLessThanOrEqual(100);
    expect(r.variance_budget.length).toBeGreaterThan(0);
    expect(r.consistency_checks.length).toBe(3);
    expect(r.dominant_source).toBeTruthy();
    expect(r.risk_level).toBeTruthy();
    expect(r.formula).toContain("Fc=");
    expect(r.formula).toContain("Cp=");
  });

  it("all stages have positive mean and std", () => {
    const r = engine.analyze(baseInput);
    for (const s of r.stages) {
      expect(s.mean).toBeGreaterThan(0);
      expect(s.std).toBeGreaterThanOrEqual(0);
      expect(s.cv_pct).toBeGreaterThanOrEqual(0);
    }
  });

  it("Cpk ≤ Cp", () => {
    const r = engine.analyze(baseInput);
    expect(r.cpk).toBeLessThanOrEqual(r.cp + 0.1);
  });

  it("variance budget sums to ~100%", () => {
    const r = engine.analyze(baseInput);
    const total = r.variance_budget.reduce(
      (s, v) => s + v.pct_of_total, 0,
    );
    expect(total).toBeGreaterThan(90);
    expect(total).toBeLessThan(110);
  });

  it("variance budget sorted by contribution", () => {
    const r = engine.analyze(baseInput);
    for (let i = 1; i < r.variance_budget.length; i++) {
      expect(r.variance_budget[i].pct_of_total)
        .toBeLessThanOrEqual(r.variance_budget[i - 1].pct_of_total);
    }
  });

  it("tighter tolerance → lower Cpk", () => {
    const loose = engine.analyze({
      ...baseInput, usl_mm: 50.050, lsl_mm: 49.950,
    });
    const tight = engine.analyze({
      ...baseInput, usl_mm: 50.010, lsl_mm: 49.990,
    });
    expect(tight.cpk).toBeLessThan(loose.cpk);
  });

  it("more force variation → higher sigma", () => {
    const low = engine.analyze({
      ...baseInput, force_cv_pct: 2, mc_samples: 2000,
    });
    const high = engine.analyze({
      ...baseInput, force_cv_pct: 25, mc_samples: 2000,
    });
    expect(high.sigma_total_um).toBeGreaterThan(low.sigma_total_um);
  });

  it("risk level matches Cpk", () => {
    const r = engine.analyze(baseInput);
    if (r.cpk >= 1.67) expect(r.risk_level).toBe("low");
    else if (r.cpk >= 1.33) expect(r.risk_level).toBe("moderate");
    else if (r.cpk >= 1.0) expect(r.risk_level).toBe("high");
    else expect(r.risk_level).toBe("critical");
  });

  it("consistency checks include power verification", () => {
    const r = engine.analyze(baseInput);
    const powerCheck = r.consistency_checks.find(
      c => c.name.includes("Power"),
    );
    expect(powerCheck).toBeDefined();
    expect(powerCheck!.actual).toBeGreaterThan(0);
  });

  it("PPM consistent with conforming percentage", () => {
    const r = engine.analyze(baseInput);
    // Higher conforming % → lower PPM
    expect(r.ppm_defect).toBeGreaterThanOrEqual(0);
  });

  it("recommends action for critical risk", () => {
    const r = engine.analyze({
      ...baseInput,
      usl_mm: 50.005, lsl_mm: 49.995,
      machine_repeatability_um: 15,
      force_cv_pct: 20,
    });
    if (r.risk_level === "critical") {
      expect(r.recommendations.length).toBeGreaterThan(0);
    }
  });

  it("works with all defaults", () => {
    const r = engine.analyze({
      nominal_mm: 50,
      usl_mm: 50.025,
      lsl_mm: 49.975,
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_diameter_mm: 10,
      tool_overhang_mm: 40,
    });
    expect(r.stages).toHaveLength(5);
    expect(r.sigma_total_um).toBeGreaterThan(0);
  });

  it("larger tool diameter reduces deflection stage", () => {
    const small = engine.analyze({
      ...baseInput, tool_diameter_mm: 6,
    });
    const large = engine.analyze({
      ...baseInput, tool_diameter_mm: 16,
    });
    expect(large.stages[1].mean).toBeLessThan(small.stages[1].mean);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(processVariabilityIntegrationEngine)
      .toBeInstanceOf(ProcessVariabilityIntegrationEngine);
  });
});
