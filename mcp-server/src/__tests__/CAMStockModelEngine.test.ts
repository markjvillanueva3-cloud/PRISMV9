/**
 * CAMStockModelEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-STOCK
 */
import { describe, it, expect } from "vitest";
import { CAMStockModelEngine } from "../engines/CAMStockModelEngine.js";

const engine = new CAMStockModelEngine();

describe("CAMStockModelEngine", () => {

  it("rectangular block adds 2× per-side to X+Y, perSide+bottom to Z", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 50, z: 25 } },
      "rectangular_block",
      { perSideMm: 3, bottomMm: 5 },
    );
    expect(m.bbox.x).toBe(106);
    expect(m.bbox.y).toBe(56);
    expect(m.bbox.z).toBe(33);
    expect(m.stockVolumeMm3).toBe(106 * 56 * 33);
  });

  it("rectangular block defaults bottom to perSide when omitted", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 50, z: 25 } },
      "rectangular_block",
      { perSideMm: 3 },
    );
    expect(m.bbox.z).toBe(31);
  });

  it("round_bar computes cylinder volume from max(x,y) as diameter", () => {
    const m = engine.compute(
      { bbox: { x: 30, y: 30, z: 150 } },
      "round_bar",
      { perSideMm: 2 },
    );
    const dia = 34;
    const len = 154;
    expect(m.bbox.x).toBe(dia);
    expect(m.bbox.y).toBe(dia);
    expect(m.bbox.z).toBe(len);
    expect(m.stockVolumeMm3).toBeCloseTo(Math.PI * (dia / 2) ** 2 * len, 4);
  });

  it("tube computes annular volume from outer minus inner diameter", () => {
    const m = engine.compute(
      { bbox: { x: 50, y: 50, z: 100 } },
      "tube",
      { perSideMm: 2 },
    );
    const outerDia = 54;
    const innerDia = 42;
    const len = 104;
    const expected = Math.PI * ((outerDia / 2) ** 2 - (innerDia / 2) ** 2) * len;
    expect(m.stockVolumeMm3).toBeCloseTo(expected, 4);
  });

  it("near_net_casting uses hull volume + allowance shell", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 100, z: 50 }, hullVolumeMm3: 200000 },
      "near_net_casting",
      { perSideMm: 2 },
    );
    expect(m.partVolumeMm3).toBe(200000);
    expect(m.stockVolumeMm3).toBeGreaterThan(m.partVolumeMm3);
    expect(m.removalVolumeMm3).toBeGreaterThan(0);
  });

  it("removal volume = stock - part", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 100, z: 50 } },
      "rectangular_block",
      { perSideMm: 5 },
    );
    expect(m.removalVolumeMm3).toBe(m.stockVolumeMm3 - m.partVolumeMm3);
  });

  it("removal volume is never negative even when part hull is larger than stock", () => {
    const m = engine.compute(
      { bbox: { x: 10, y: 10, z: 10 }, hullVolumeMm3: 99999999 },
      "rectangular_block",
      { perSideMm: 0 },
    );
    expect(m.removalVolumeMm3).toBeGreaterThanOrEqual(0);
  });

  it("mass computation when density supplied (aluminum 2.7 g/cm^3)", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 100, z: 100 } },
      "rectangular_block",
      { perSideMm: 0 },
      { densityGCm3: 2.7 },
    );
    expect(m.stockMassG).toBeCloseTo(2700, 1);
    expect(m.partMassG).toBeCloseTo(2700, 1);
  });

  it("mass computation skipped when density omitted", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 100, z: 100 } },
      "rectangular_block",
      { perSideMm: 0 },
    );
    expect(typeof m.stockMassG === "undefined").toBe(true);
    expect(typeof m.partMassG === "undefined").toBe(true);
  });

  it("per-op leave returns leave for drilling = zero (no walls cut)", () => {
    const leave = engine.per_op_leave("drill_peck");
    expect(leave.wallMm).toBe(0);
    expect(leave.floorMm).toBe(0);
  });

  it("per-op leave returns leave for wire-edm = zero (cuts to size)", () => {
    const leave = engine.per_op_leave("wedm_2axis");
    expect(leave.wallMm).toBe(0);
    expect(leave.floorMm).toBe(0);
  });

  it("turning roughing leaves 0.4mm on walls", () => {
    const leave = engine.per_op_leave("turn_rough");
    expect(leave.wallMm).toBeCloseTo(0.4, 2);
    expect(leave.floorMm).toBeCloseTo(0.4, 2);
  });

  it("per-op leave map populated when opList supplied", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 100, z: 50 } },
      "rectangular_block",
      { perSideMm: 3 },
      { opList: ["face", "drill_peck", "wedm_2axis"] },
    );
    expect(typeof m.perOpLeave.face?.wallMm).toBe("number");
    expect(m.perOpLeave.drill_peck.wallMm).toBe(0);
    expect(m.perOpLeave.wedm_2axis.wallMm).toBe(0);
  });

  it("removal_volume returns same number as compute().removalVolumeMm3", () => {
    const part = { bbox: { x: 100, y: 100, z: 50 } };
    const allow = { perSideMm: 3 };
    const v = engine.removal_volume(part, "rectangular_block", allow);
    const m = engine.compute(part, "rectangular_block", allow);
    expect(v).toBe(m.removalVolumeMm3);
  });

  it("perSideMm is clamped to >=0 (negative treated as zero)", () => {
    const m = engine.compute(
      { bbox: { x: 100, y: 100, z: 50 } },
      "rectangular_block",
      { perSideMm: -5 },
    );
    expect(m.bbox.x).toBe(100);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes compute + removal_volume + per_op_leave", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("compute");
    expect(names).toContain("removal_volume");
    expect(names).toContain("per_op_leave");
  });
});
