import { describe, it, expect } from "vitest";
import {
  coolantFlowVerificationEngine as eng,
  CoolantFlowVerificationEngine,
  type CoolantFlowVerificationInput,
} from "../engines/CoolantFlowVerificationEngine.js";

function flood(o: Partial<CoolantFlowVerificationInput> = {}): CoolantFlowVerificationInput {
  return {
    program_id: "PRG-001",
    spec: {
      type: "flood_soluble",
      concentration_min: 6,
      concentration_max: 10,
      pressure_min_bar: 5,
      tramp_oil_max_pct: 2,
      bacterial_max_cfu_ml: 100000,
    },
    measurement: {
      concentration: 8,
      pressure_bar: 8,
      tramp_oil_pct: 0.5,
      bacterial_cfu_ml: 10000,
    },
    ...o,
  };
}

describe("CoolantFlowVerificationEngine", () => {
  it("exports a singleton with verify() method", () => {
    expect(eng).toBeInstanceOf(CoolantFlowVerificationEngine);
    expect(typeof eng.verify).toBe("function");
  });

  it("throws on missing program_id / spec / measurement", () => {
    expect(() => eng.verify({} as CoolantFlowVerificationInput)).toThrow(/program_id \+ spec \+ measurement/);
  });

  it("coolant_ok on nominal flood-soluble (8% Brix, 8 bar, 0.5% tramp, low bact)", () => {
    const r = eng.verify(flood());
    expect(r.verdict).toBe("coolant_ok");
    expect(r.critical_count).toBe(0);
    expect(r.confidence.value).toBe(1);
  });

  it("coolant_block on concentration_low (3% < 6% min)", () => {
    const r = eng.verify(flood({ measurement: { concentration: 3, pressure_bar: 8 } }));
    expect(r.verdict).toBe("coolant_block");
    expect(r.violations[0].kind).toBe("concentration_low");
    expect(r.violations[0].expected).toMatch(/≥ 6/);
  });

  it("coolant_warn on concentration_high (12 > 10 max — non-critical, dilute)", () => {
    const r = eng.verify(flood({ measurement: { concentration: 12, pressure_bar: 8 } }));
    expect(r.verdict).toBe("coolant_warn");
    expect(r.violations[0].kind).toBe("concentration_high");
  });

  it("coolant_block on pressure_low (2 < 5 bar min)", () => {
    const r = eng.verify(flood({ measurement: { concentration: 8, pressure_bar: 2 } }));
    expect(r.verdict).toBe("coolant_block");
    expect(r.violations[0].kind).toBe("pressure_low");
    expect(r.violations[0].fix).toMatch(/pump|filter|manifold/i);
  });

  it("coolant_warn on tramp_oil_high (5% > 2% max)", () => {
    const r = eng.verify(flood({ measurement: { concentration: 8, pressure_bar: 8, tramp_oil_pct: 5 } }));
    expect(r.verdict).toBe("coolant_warn");
    expect(r.violations[0].kind).toBe("tramp_oil_high");
    expect(r.violations[0].fix).toMatch(/skimmer/i);
  });

  it("coolant_warn on bacterial_high (200K > 100K CFU/mL)", () => {
    const r = eng.verify(flood({ measurement: { concentration: 8, pressure_bar: 8, bacterial_cfu_ml: 200000 } }));
    expect(r.verdict).toBe("coolant_warn");
    expect(r.violations[0].kind).toBe("bacterial_high");
    expect(r.violations[0].fix).toMatch(/biocide/i);
  });

  it("coolant_block on EDM dielectric out of range", () => {
    const r = eng.verify({
      program_id: "PRG-EDM-01",
      spec: {
        type: "edm_water",
        concentration_min: 0, concentration_max: 100,
        pressure_min_bar: 0,
        dielectric_max_us_cm: 10,
      },
      measurement: {
        concentration: 50,
        pressure_bar: 2,
        dielectric_us_cm: 25,
      },
    });
    expect(r.verdict).toBe("coolant_block");
    expect(r.violations[0].kind).toBe("dielectric_out_of_range");
    expect(r.violations[0].fix).toMatch(/deionizer|resin/i);
  });

  it("coolant_ok on synthetic with pH in band", () => {
    const r = eng.verify({
      program_id: "PRG-SYN-01",
      spec: {
        type: "flood_synthetic",
        concentration_min: 8.5, concentration_max: 9.5,
        pressure_min_bar: 4,
      },
      measurement: {
        concentration: 9.0,
        pressure_bar: 6,
      },
    });
    expect(r.verdict).toBe("coolant_ok");
  });

  it("multiple violations counted; critical wins over warning", () => {
    const r = eng.verify(flood({ measurement: { concentration: 3, pressure_bar: 8, tramp_oil_pct: 5 } }));
    expect(r.verdict).toBe("coolant_block");
    expect(r.critical_count).toBe(1);
    expect(r.warning_count).toBe(1);
  });

  it("every violation cites a fix + expected", () => {
    const r = eng.verify(flood({ measurement: { concentration: 3, pressure_bar: 2 } }));
    for (const viol of r.violations) {
      expect(viol.fix.length).toBeGreaterThan(10);
      expect(viol.expected.length).toBeGreaterThan(2);
      expect(["critical", "warning"]).toContain(viol.severity);
    }
  });

  it("works for MQL coolant type", () => {
    const r = eng.verify({
      program_id: "PRG-MQL-01",
      spec: { type: "mql", concentration_min: 0, concentration_max: 100, pressure_min_bar: 3 },
      measurement: { concentration: 50, pressure_bar: 5 },
    });
    expect(r.verdict).toBe("coolant_ok");
    expect(r.spec_type).toBe("mql");
  });

  it("cites Master Chemical + Sandvik in source", () => {
    const r = eng.verify(flood());
    expect(r.source).toMatch(/Master Chemical|Sandvik/);
  });
});
