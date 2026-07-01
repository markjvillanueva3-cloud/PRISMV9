import { describe, it, expect } from "vitest";
import {
  stockVerificationEngine as eng,
  StockVerificationEngine,
  type StockVerificationInput,
} from "../engines/StockVerificationEngine.js";

function nominal(o: Partial<StockVerificationInput> = {}): StockVerificationInput {
  return {
    lot_id: "JMDIE-LOT-001",
    spec: {
      designation: "Aluminum 6061-T6",
      hardness_min: 90, hardness_max: 100, hardness_scale: "HRB",
      composition: { Al: { min: 95.8, max: 98.6 }, Mg: { min: 0.8, max: 1.2 } },
      dim_x_mm: 100, dim_y_mm: 100, dim_z_mm: 25,
    },
    measurement: {
      xrf: { Al: 97.5, Mg: 1.0 },
      hardness: 95,
      hardness_scale: "HRB",
      measured_x_mm: 100.0, measured_y_mm: 100.0, measured_z_mm: 25.0,
      cert_present: true,
      cert_designation: "Aluminum 6061-T6",
    },
    ...o,
  };
}

describe("StockVerificationEngine", () => {
  it("exports a singleton with verify()", () => {
    expect(eng).toBeInstanceOf(StockVerificationEngine);
    expect(typeof eng.verify).toBe("function");
  });

  it("throws on missing input", () => {
    expect(() => eng.verify({} as StockVerificationInput)).toThrow(/lot_id \+ spec \+ measurement/);
  });

  it("stock_verified on nominal Al-6061 with everything in band", () => {
    const r = eng.verify(nominal());
    expect(r.verdict).toBe("stock_verified");
    expect(r.critical_count).toBe(0);
    expect(r.confidence.value).toBe(1);
  });

  it("stock_block on missing certificate", () => {
    const r = eng.verify(nominal({ measurement: { cert_present: false } }));
    expect(r.verdict).toBe("stock_block");
    expect(r.violations.some(v => v.kind === "cert_missing")).toBe(true);
  });

  it("stock_block on cert designation mismatch (wrong alloy)", () => {
    const r = eng.verify(nominal({
      measurement: { cert_present: true, cert_designation: "Stainless 304" },
    }));
    expect(r.verdict).toBe("stock_block");
    expect(r.violations.some(v => v.kind === "cert_mismatch")).toBe(true);
  });

  it("stock_block on hardness below band (too soft)", () => {
    const m = nominal().measurement;
    m.hardness = 60;
    const r = eng.verify({ ...nominal(), measurement: m });
    expect(r.verdict).toBe("stock_block");
    expect(r.violations.some(v => v.kind === "hardness_out_of_band")).toBe(true);
  });

  it("stock_block on hardness above band (over-aged or wrong temper)", () => {
    const m = nominal().measurement;
    m.hardness = 120;
    const r = eng.verify({ ...nominal(), measurement: m });
    expect(r.verdict).toBe("stock_block");
    expect(r.violations.some(v => v.kind === "hardness_out_of_band")).toBe(true);
  });

  it("stock_block on XRF composition out of band (Mg too high — likely 5052 not 6061)", () => {
    const m = nominal().measurement;
    m.xrf = { Al: 95, Mg: 3.0 };
    const r = eng.verify({ ...nominal(), measurement: m });
    expect(r.verdict).toBe("stock_block");
    expect(r.violations.some(v => v.kind === "composition_out_of_band")).toBe(true);
  });

  it("stock_warn on dimension out of tolerance (250μm default)", () => {
    const m = nominal().measurement;
    m.measured_x_mm = 100.5;
    const r = eng.verify({ ...nominal(), measurement: m });
    expect(r.verdict).toBe("stock_warn");
    expect(r.violations.some(v => v.kind === "dimension_out_of_tol")).toBe(true);
  });

  it("custom dim_tol_um is honored", () => {
    const input = nominal();
    input.spec.dim_tol_um = 50;  // tight tolerance
    input.measurement.measured_x_mm = 100.1;  // 0.1mm > 50μm
    const r = eng.verify(input);
    expect(r.verdict).toBe("stock_warn");
  });

  it("works for stainless: HRC scale + Cr-Ni composition", () => {
    const r = eng.verify({
      lot_id: "SS-001",
      spec: {
        designation: "Stainless 304",
        hardness_min: 20, hardness_max: 35, hardness_scale: "HRC",
        composition: { Cr: { min: 18, max: 20 }, Ni: { min: 8, max: 10.5 } },
        dim_x_mm: 50, dim_y_mm: 50, dim_z_mm: 25,
      },
      measurement: {
        hardness: 28,
        xrf: { Cr: 19, Ni: 9 },
        cert_present: true, cert_designation: "Stainless 304",
        measured_x_mm: 50, measured_y_mm: 50, measured_z_mm: 25,
      },
    });
    expect(r.verdict).toBe("stock_verified");
  });

  it("multiple violations counted; critical wins over warning", () => {
    const r = eng.verify({
      lot_id: "BAD-001",
      spec: { designation: "Al 6061", hardness_min: 90, hardness_max: 100, dim_x_mm: 100, dim_y_mm: 100, dim_z_mm: 25 },
      measurement: { cert_present: false, hardness: 50, measured_x_mm: 102 },
    });
    expect(r.verdict).toBe("stock_block");
    expect(r.critical_count).toBeGreaterThanOrEqual(2);
    expect(r.warning_count).toBeGreaterThanOrEqual(1);
  });

  it("source cites ASTM + ISO + SAE + JM Die", () => {
    const r = eng.verify(nominal());
    expect(r.source).toMatch(/ASTM E1085|E18|ISO 6892|SAE|JM Die/);
  });
});
