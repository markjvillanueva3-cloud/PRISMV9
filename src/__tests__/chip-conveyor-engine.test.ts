/**
 * ChipConveyorEngine — Unit Tests
 * @milestone FORGE-ENGINES-B24
 */
import { describe, it, expect } from "vitest";
import { chipConveyorEngine } from "../engines/ChipConveyorEngine.js";

describe("ChipConveyorEngine", () => {
  it("calculates chip volume rate from MRR", () => {
    const r = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      work_material: "steel",
    });
    expect(r.chip_volume_rate.value).toBeGreaterThan(50);
  });

  it("stringy chips have lower packing density", () => {
    const broken = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      chip_type: "broken",
    });
    const stringy = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      chip_type: "stringy",
    });
    expect(stringy.chip_volume_rate.value).toBeGreaterThan(
      broken.chip_volume_rate.value
    );
  });

  it("higher MRR fills bin faster", () => {
    const low = chipConveyorEngine.calculate({ mrr_cm3_min: 20 });
    const high = chipConveyorEngine.calculate({ mrr_cm3_min: 200 });
    expect(high.bin_fill_time.value).toBeLessThan(
      low.bin_fill_time.value
    );
  });

  it("warns magnetic conveyor for aluminum", () => {
    const r = chipConveyorEngine.calculate({
      work_material: "aluminum",
      conveyor_type: "magnetic",
    });
    expect(
      r.warnings.some(w => w.includes("non-ferrous") ||
        w.includes("Magnetic"))
    ).toBe(true);
  });

  it("warns stringy chips in auger", () => {
    const r = chipConveyorEngine.calculate({
      chip_type: "stringy",
      conveyor_type: "auger",
    });
    expect(
      r.warnings.some(w => w.includes("Auger") || w.includes("auger"))
    ).toBe(true);
  });

  it("titanium has highest scrap value", () => {
    const steel = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      work_material: "steel",
    });
    const ti = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      work_material: "titanium",
    });
    expect(ti.chip_value_per_shift.value).toBeGreaterThan(
      steel.chip_value_per_shift.value
    );
  });

  it("multiple machines increase volume rate", () => {
    const one = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      machines_served: 1,
    });
    const four = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      machines_served: 4,
    });
    expect(four.chip_volume_rate.value).toBeGreaterThan(
      one.chip_volume_rate.value
    );
  });

  it("conveyor adequacy check works", () => {
    const r = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
    });
    expect(r.conveyor_adequate.value).toBe(1);
  });

  it("coolant carryoff calculated", () => {
    const r = chipConveyorEngine.calculate({
      mrr_cm3_min: 100,
      coolant_on_chips_pct: 20,
    });
    expect(r.coolant_carryoff.value).toBeGreaterThan(0);
  });

  it("bins per shift > 0", () => {
    const r = chipConveyorEngine.calculate({
      mrr_cm3_min: 50,
      bin_volume_liters: 500,
    });
    expect(r.bins_per_shift.value).toBeGreaterThan(0);
  });
});
