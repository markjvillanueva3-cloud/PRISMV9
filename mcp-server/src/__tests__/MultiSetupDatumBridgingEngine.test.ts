import { describe, it, expect } from "vitest";
import {
  multiSetupDatumBridgingEngine as eng,
  MultiSetupDatumBridgingEngine,
  type DatumPoint3D,
  type MultiSetupDatumInput,
} from "../engines/MultiSetupDatumBridgingEngine.js";

function pt(id: string, x: number, y: number, z: number = 0): DatumPoint3D {
  return { id, x, y, z };
}

describe("MultiSetupDatumBridgingEngine", () => {
  it("exports singleton with bridge()", () => {
    expect(eng).toBeInstanceOf(MultiSetupDatumBridgingEngine);
    expect(typeof eng.bridge).toBe("function");
  });

  it("throws on missing array inputs", () => {
    expect(() => eng.bridge({} as MultiSetupDatumInput)).toThrow(/op1_points \+ op2_points arrays required/);
  });

  it("throws on length mismatch", () => {
    expect(() => eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 1, 0)],
      op2_points: [pt("a", 0, 0)],
      alignment_tolerance_um: 50,
    })).toThrow(/same length/);
  });

  it("throws on non-positive alignment_tolerance", () => {
    expect(() => eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 1, 0), pt("c", 0, 1)],
      op2_points: [pt("a", 0, 0), pt("b", 1, 0), pt("c", 0, 1)],
      alignment_tolerance_um: 0,
    })).toThrow(/positive alignment_tolerance/);
  });

  it("throws on insufficient points (default min=3)", () => {
    expect(() => eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 1, 0)],
      op2_points: [pt("a", 0, 0), pt("b", 1, 0)],
      alignment_tolerance_um: 50,
    })).toThrow(/≥3 points required/);
  });

  it("throws on id mismatch between op1 and op2", () => {
    expect(() => eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 1, 0), pt("c", 0, 1)],
      op2_points: [pt("a", 0, 0), pt("X", 1, 0), pt("c", 0, 1)],
      alignment_tolerance_um: 50,
    })).toThrow(/point 1 id mismatch.*b ≠ X/);
  });

  it("identity transform (op1 == op2) → near-zero residual + accept", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10)],
      op2_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10)],
      alignment_tolerance_um: 10,
    });
    expect(r.delta_x_mm.value).toBeCloseTo(0, 5);
    expect(r.delta_y_mm.value).toBeCloseTo(0, 5);
    expect(r.theta_z_deg.value).toBeCloseTo(0, 4);
    expect(r.residual_rms_um.value).toBeLessThan(0.01);
    expect(r.verdict).toBe("accept");
    expect(r.meets_tolerance).toBe(true);
  });

  it("pure translation (5mm X) recovered exactly", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10)],
      op2_points: [pt("a", 5, 0), pt("b", 15, 0), pt("c", 15, 10), pt("d", 5, 10)],
      alignment_tolerance_um: 10,
    });
    expect(r.delta_x_mm.value).toBeCloseTo(5, 5);
    expect(r.delta_y_mm.value).toBeCloseTo(0, 5);
    expect(r.theta_z_deg.value).toBeCloseTo(0, 4);
    expect(r.residual_rms_um.value).toBeLessThan(0.01);
    expect(r.verdict).toBe("accept");
  });

  it("pure Z-translation (3mm Z) recovered exactly", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0, 0), pt("b", 10, 0, 0), pt("c", 10, 10, 0), pt("d", 0, 10, 0)],
      op2_points: [pt("a", 0, 0, 3), pt("b", 10, 0, 3), pt("c", 10, 10, 3), pt("d", 0, 10, 3)],
      alignment_tolerance_um: 10,
    });
    expect(r.delta_z_mm.value).toBeCloseTo(3, 5);
    expect(r.theta_z_deg.value).toBeCloseTo(0, 4);
    expect(r.residual_rms_um.value).toBeLessThan(0.01);
  });

  it("pure rotation (90° Z) about origin recovered", () => {
    // Rotate +90° about origin: (x, y) → (-y, x)
    const r = eng.bridge({
      op1_points: [pt("a", 10, 0), pt("b", 10, 10), pt("c", 0, 10), pt("d", 5, 5)],
      op2_points: [pt("a", 0, 10), pt("b", -10, 10), pt("c", -10, 0), pt("d", -5, 5)],
      alignment_tolerance_um: 10,
    });
    expect(r.theta_z_deg.value).toBeCloseTo(90, 2);
    expect(r.residual_rms_um.value).toBeLessThan(0.01);
    // Large rotation triggers fixture-alignment warning
    expect(r.warnings.some(w => /Z-rotation.*fixture orientation/.test(w))).toBe(true);
  });

  it("combined translation + 30° rotation recovered", () => {
    // Op1 → rotate +30° about origin then translate (+2mm X, +3mm Y)
    const theta = 30 * Math.PI / 180;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const op1 = [pt("a", 10, 0), pt("b", 10, 10), pt("c", 0, 10), pt("d", 5, 5)];
    const op2 = op1.map(p => pt(p.id, cos * p.x - sin * p.y + 2, sin * p.x + cos * p.y + 3));
    const r = eng.bridge({ op1_points: op1, op2_points: op2, alignment_tolerance_um: 10 });
    expect(r.theta_z_deg.value).toBeCloseTo(30, 2);
    expect(r.delta_x_mm.value).toBeCloseTo(2, 4);
    expect(r.delta_y_mm.value).toBeCloseTo(3, 4);
    expect(r.residual_rms_um.value).toBeLessThan(0.1);
    expect(r.verdict).toBe("accept");
  });

  it("noise within tolerance → accept verdict", () => {
    // Add ±5μm = ±0.005mm random noise
    const op1 = [pt("a", 0, 0), pt("b", 50, 0), pt("c", 50, 50), pt("d", 0, 50), pt("e", 25, 25)];
    const op2 = op1.map((p, i) => pt(p.id, p.x + 0.003 * (i % 2 === 0 ? 1 : -1), p.y + 0.003 * (i % 2 === 0 ? -1 : 1)));
    const r = eng.bridge({ op1_points: op1, op2_points: op2, alignment_tolerance_um: 15 });
    expect(r.verdict).toBe("accept");
    expect(r.residual_rms_um.value).toBeLessThan(15);
  });

  it("noise exceeds 3× tolerance → reject verdict", () => {
    // RMS noise ~ 100μm, tolerance 10μm → reject
    const op1 = [pt("a", 0, 0), pt("b", 50, 0), pt("c", 50, 50), pt("d", 0, 50), pt("e", 25, 25)];
    const op2 = [pt("a", 0.10, 0), pt("b", 50, 0.10), pt("c", 50.10, 50), pt("d", 0, 50.10), pt("e", 25.10, 25)];
    const r = eng.bridge({ op1_points: op1, op2_points: op2, alignment_tolerance_um: 10 });
    expect(r.verdict).toBe("reject");
    expect(r.recommended_action).toMatch(/setup error suspected|re-fixture/);
  });

  it("noise between tolerance and 3× → reprobe verdict + outlier identified", () => {
    // RMS ~30μm with one big outlier, tolerance 10μm → reprobe (2-3× range)
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 50, 0), pt("c", 50, 50), pt("d", 0, 50), pt("e", 25, 25)],
      op2_points: [
        pt("a", 0, 0),
        pt("b", 50.002, 0),
        pt("c", 50, 50.002),
        pt("d", 0, 50.002),
        pt("e", 25.030, 25),  // outlier 30μm
      ],
      alignment_tolerance_um: 10,
    });
    expect(r.verdict).toBe("reprobe");
    expect(r.recommended_action).toMatch(/marginal|reprobe outlier/);
    expect(r.warnings.some(w => /Outlier feature: e/.test(w))).toBe(true);
  });

  it("3 points with < 5 triggers low-point warning", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 0, 10)],
      op2_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 0, 10)],
      alignment_tolerance_um: 10,
    });
    expect(r.warnings.some(w => /recommend ≥5 for robust 4-DOF/.test(w))).toBe(true);
  });

  it("≥5 points does NOT trigger low-point warning", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10), pt("e", 5, 5)],
      op2_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10), pt("e", 5, 5)],
      alignment_tolerance_um: 10,
    });
    expect(r.warnings.some(w => /robust 4-DOF/.test(w))).toBe(false);
  });

  it("per-point residuals returned for outlier diagnosis", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10)],
      op2_points: [pt("a", 0, 0), pt("b", 10, 0), pt("c", 10, 10), pt("d", 0, 10)],
      alignment_tolerance_um: 10,
    });
    expect(r.point_residuals_um.length).toBe(4);
    expect(r.point_residuals_um[0].id).toBe("a");
    expect(typeof r.point_residuals_um[0].residual_um).toBe("number");
  });

  it("RMS ≤ max residual (geometric invariant)", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 50, 0), pt("c", 50, 50), pt("d", 0, 50), pt("e", 25, 25)],
      op2_points: [
        pt("a", 0, 0),
        pt("b", 50, 0.002),
        pt("c", 50, 50),
        pt("d", 0, 50.005),
        pt("e", 25.002, 25),
      ],
      alignment_tolerance_um: 50,
    });
    expect(r.residual_rms_um.value).toBeLessThanOrEqual(r.residual_max_um.value + 0.01);
  });

  it("source cites ASME B89.4.10 + Renishaw OMV + Horn 1987 + Umeyama 1991 + ISO 230-1", () => {
    const r = eng.bridge({
      op1_points: [pt("a", 0, 0), pt("b", 1, 0), pt("c", 0, 1)],
      op2_points: [pt("a", 0, 0), pt("b", 1, 0), pt("c", 0, 1)],
      alignment_tolerance_um: 10,
    });
    expect(r.source).toMatch(/ASME B89.4.10|Renishaw OMV|Horn 1987|Umeyama 1991|ISO 230-1/);
  });
});
