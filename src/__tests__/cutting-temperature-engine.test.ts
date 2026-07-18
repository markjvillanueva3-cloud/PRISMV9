/**
 * CuttingTemperatureEngine — Unit Tests
 * @milestone FORGE-ENGINES-B19
 */
import { describe, it, expect } from "vitest";
import {
  cuttingTemperatureEngine,
} from "../engines/CuttingTemperatureEngine.js";

describe("CuttingTemperatureEngine", () => {
  it("calculates interface temperature for steel", () => {
    const r = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      material_type: "steel",
    });
    expect(r.interface_temperature.value).toBeGreaterThan(100);
    expect(r.tool_temperature.value).toBeGreaterThan(20);
  });

  it("higher speed = higher temperature", () => {
    const slow = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 100,
      feed_mm: 0.2,
    });
    const fast = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 300,
      feed_mm: 0.2,
    });
    expect(fast.interface_temperature.value).toBeGreaterThan(
      slow.interface_temperature.value
    );
  });

  it("titanium runs hotter than aluminum", () => {
    const alum = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 100,
      feed_mm: 0.15,
      material_type: "aluminum",
    });
    const ti = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 100,
      feed_mm: 0.15,
      material_type: "titanium",
    });
    expect(ti.interface_temperature.value).toBeGreaterThan(
      alum.interface_temperature.value
    );
  });

  it("flood coolant reduces temperature vs dry", () => {
    const dry = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      coolant: "dry",
    });
    const flood = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      coolant: "flood",
    });
    expect(flood.interface_temperature.value).toBeLessThan(
      dry.interface_temperature.value
    );
    expect(flood.coolant_reduction.value).toBeGreaterThan(0);
  });

  it("cryogenic coolant most effective", () => {
    const flood = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      coolant: "flood",
    });
    const cryo = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
      coolant: "cryogenic",
    });
    expect(cryo.interface_temperature.value).toBeLessThan(
      flood.interface_temperature.value
    );
  });

  it("warns when tool temp exceeds coating limit", () => {
    const r = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 400,
      feed_mm: 0.3,
      material_type: "titanium",
      tool_coating: "TiN",
      coolant: "dry",
    });
    expect(
      r.warnings.some(w => w.includes("coating") ||
        w.includes("exceeds"))
    ).toBe(true);
  });

  it("coating limit matches coating type", () => {
    const tin = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 150,
      feed_mm: 0.15,
      tool_coating: "TiN",
    });
    const tialn = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 150,
      feed_mm: 0.15,
      tool_coating: "TiAlN",
    });
    expect(tialn.coating_limit.value).toBeGreaterThan(
      tin.coating_limit.value
    );
  });

  it("heat partition: most goes to chip", () => {
    const r = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 200,
      feed_mm: 0.2,
    });
    expect(r.heat_partition_chip.value).toBeGreaterThan(50);
  });

  it("warns dry titanium cutting", () => {
    const r = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 60,
      feed_mm: 0.1,
      material_type: "titanium",
      coolant: "dry",
    });
    expect(
      r.warnings.some(w => w.includes("fire"))
    ).toBe(true);
  });

  it("thermal damage risk increases with temperature", () => {
    const cool = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 80,
      feed_mm: 0.1,
      coolant: "flood",
    });
    const hot = cuttingTemperatureEngine.calculate({
      cutting_speed_mpm: 400,
      feed_mm: 0.3,
      coolant: "dry",
      material_type: "stainless",
    });
    expect(hot.thermal_damage_risk.value).toBeGreaterThan(
      cool.thermal_damage_risk.value
    );
  });
});
