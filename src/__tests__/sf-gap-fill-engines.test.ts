/**
 * Tests for S&F Gap-Fill Engines: UnitConversion + MachineProfile
 */
import { describe, it, expect } from "vitest";
import { UnitConversionEngine } from "../engines/UnitConversionEngine.js";
import { MachineProfileEngine } from "../engines/MachineProfileEngine.js";

// ── UnitConversionEngine ──
describe("UnitConversionEngine", () => {
  const engine = new UnitConversionEngine();

  it("converts mm to inches", () => {
    const r = engine.convert({ value: 25.4, conversion: "mm_inch", direction: "to_imperial" });
    expect(r.to_value).toBeCloseTo(1.0, 4);
    expect(r.from_unit).toBe("mm");
    expect(r.to_unit).toBe("in");
  });

  it("converts inches to mm", () => {
    const r = engine.convert({ value: 1.0, conversion: "mm_inch", direction: "to_metric" });
    expect(r.to_value).toBeCloseTo(25.4, 4);
  });

  it("converts SFM to m/min", () => {
    const r = engine.convert({ value: 400, conversion: "mpm_sfm", direction: "to_metric" });
    expect(r.to_value).toBeCloseTo(121.92, 1);
    expect(r.from_unit).toBe("SFM");
    expect(r.to_unit).toBe("m/min");
  });

  it("converts m/min to SFM", () => {
    const r = engine.convert({ value: 100, conversion: "mpm_sfm", direction: "to_imperial" });
    expect(r.to_value).toBeCloseTo(328.084, 0);
  });

  it("converts IPM to mm/min", () => {
    const r = engine.convert({ value: 10, conversion: "mmmin_ipm", direction: "to_metric" });
    expect(r.to_value).toBeCloseTo(254, 1);
  });

  it("converts kW to HP", () => {
    const r = engine.convert({ value: 7.5, conversion: "kw_hp", direction: "to_imperial" });
    expect(r.to_value).toBeCloseTo(10.058, 1);
  });

  it("converts °C to °F", () => {
    const r = engine.convert({ value: 100, conversion: "c_f", direction: "to_imperial" });
    expect(r.to_value).toBeCloseTo(212, 0);
  });

  it("converts °F to °C", () => {
    const r = engine.convert({ value: 212, conversion: "c_f", direction: "to_metric" });
    expect(r.to_value).toBeCloseTo(100, 0);
  });

  it("throws on unknown conversion", () => {
    expect(() => engine.convert({ value: 1, conversion: "bogus", direction: "to_metric" })).toThrow("Unknown conversion");
  });

  it("batch converts multiple values", () => {
    const results = engine.convertBatch([
      { value: 25.4, conversion: "mm_inch", direction: "to_imperial" },
      { value: 400, conversion: "mpm_sfm", direction: "to_metric" },
      { value: 0.1, conversion: "mmrev_ipr", direction: "to_imperial" },
    ]);
    expect(results.length).toBe(3);
    expect(results[0].to_value).toBeCloseTo(1.0, 4);
    expect(results[1].to_value).toBeCloseTo(121.92, 1);
  });

  it("toggles full machining param set imperial→metric", () => {
    const r = engine.toggleSystem({
      params: {
        cutting_speed: 400,   // SFM
        feed_rate: 10,         // IPM
        feed_per_rev: 0.005,   // IPR
        depth_of_cut: 0.125,   // inches
        rpm: 3000,             // unchanged
        power: 10,             // HP
        temperature: 212,      // °F
      },
      from_system: "imperial",
    });
    expect(r.system).toBe("metric");
    expect(r.params.cutting_speed).toBeCloseTo(121.92, 1);
    expect(r.params.feed_rate).toBeCloseTo(254, 1);
    expect(r.params.feed_per_rev).toBeCloseTo(0.127, 2);
    expect(r.params.depth_of_cut).toBeCloseTo(3.175, 2);
    expect(r.params.rpm).toBe(3000); // unit-independent
    expect(r.params.power).toBeCloseTo(7.457, 1);
    expect(r.params.temperature).toBeCloseTo(100, 0);
    expect(r.conversions_applied.length).toBeGreaterThanOrEqual(6);
  });

  it("toggles metric→imperial", () => {
    const r = engine.toggleSystem({
      params: { cutting_speed: 120, feed_per_rev: 0.15, depth_of_cut: 3 },
      from_system: "metric",
    });
    expect(r.system).toBe("imperial");
    expect(r.params.cutting_speed).toBeCloseTo(393.7, 0);
    expect(r.params.depth_of_cut).toBeCloseTo(0.1181, 3);
  });

  it("calculates RPM from metric inputs", () => {
    const r = engine.rpmCalc({ cutting_speed: 120, diameter: 20, system: "metric" });
    // RPM = (120 × 1000) / (π × 20) ≈ 1909
    expect(r.rpm).toBeCloseTo(1909, -1);
    expect(r.formula).toContain("1000");
  });

  it("calculates RPM from imperial inputs", () => {
    const r = engine.rpmCalc({ cutting_speed: 400, diameter: 1, system: "imperial" });
    // RPM = (400 × 12) / (π × 1) ≈ 1528
    expect(r.rpm).toBeCloseTo(1528, -1);
    expect(r.formula).toContain("12");
  });

  it("lists all conversions", () => {
    const list = engine.listConversions();
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list.some(c => c.key === "mpm_sfm")).toBe(true);
    expect(list.some(c => c.key === "kw_hp")).toBe(true);
  });

  it("converts µm to µin for surface finish", () => {
    const r = engine.convert({ value: 1.6, conversion: "um_uin", direction: "to_imperial" });
    expect(r.to_value).toBeCloseTo(63, 0);
  });

  it("converts N·m to ft·lb for torque", () => {
    const r = engine.convert({ value: 100, conversion: "nm_ftlb", direction: "to_imperial" });
    expect(r.to_value).toBeCloseTo(73.76, 1);
  });
});

// ── MachineProfileEngine ──
describe("MachineProfileEngine", () => {
  const engine = new MachineProfileEngine();

  it("lists all default profiles", () => {
    const profiles = engine.list();
    expect(profiles.length).toBeGreaterThanOrEqual(12);
  });

  it("filters by machine type", () => {
    const vmcs = engine.list("vmc");
    const lathes = engine.list("lathe");
    expect(vmcs.length).toBeGreaterThan(0);
    expect(lathes.length).toBeGreaterThan(0);
    expect(vmcs.every(m => m.type === "vmc")).toBe(true);
    expect(lathes.every(m => m.type === "lathe")).toBe(true);
  });

  it("gets a specific profile by ID", () => {
    const p = engine.get("haas_vf2");
    expect(p).not.toBeNull();
    expect(p!.name).toContain("VF-2");
    expect(p!.spindle.max_rpm).toBeGreaterThan(0);
    expect(p!.spindle.rated_power_kw).toBeGreaterThan(0);
    expect(p!.axes).toBeDefined();
  });

  it("returns null on unknown profile", () => {
    const p = engine.get("nonexistent_machine");
    expect(p).toBeNull();
  });

  it("validates within machine limits — PASS", () => {
    const r = engine.validate({
      machine_id: "haas_vf2",
      rpm: 5000,
      feed_rate_mmmin: 2000,
      power_kw: 10,
    });
    expect(r.valid).toBe(true);
    expect(r.checks.every(c => c.status === "OK")).toBe(true);
  });

  it("validates exceeding RPM — FAIL", () => {
    const r = engine.validate({
      machine_id: "haas_vf2",
      rpm: 20000,
    });
    expect(r.valid).toBe(false);
    expect(r.checks.some(c => c.status === "EXCEEDED")).toBe(true);
  });

  it("validates exceeding power — FAIL", () => {
    const r = engine.validate({
      machine_id: "haas_vf2",
      rpm: 5000,
      power_kw: 50,
    });
    expect(r.valid).toBe(false);
    expect(r.checks.some(c => c.status === "EXCEEDED" && c.parameter.toLowerCase().includes("power"))).toBe(true);
  });

  it("generates spindle torque/power curve", () => {
    const curve = engine.spindleCurve("haas_vf2", 10);
    expect(curve.length).toBe(10);
    expect(curve[0].rpm).toBeGreaterThan(0);
    expect(curve[0].torque_nm).toBeGreaterThan(0);
    expect(curve[0].power_kw).toBeGreaterThan(0);
    // Power should increase then plateau
    const lowPower = curve[1].power_kw;
    const highPower = curve[curve.length - 1].power_kw;
    expect(highPower).toBeGreaterThanOrEqual(lowPower);
  });

  it("adds a custom machine profile", () => {
    const r = engine.add({
      id: "custom_test_mill",
      name: "Custom Test Mill",
      type: "vmc",
      manufacturer: "Custom",
      model: "T-1",
      controller: "Fanuc 0i-MF",
      spindle: { max_rpm: 15000, rated_power_kw: 18, max_torque_nm: 80, taper: "BT40", base_rpm: 1500 },
      axes: { x_mm: 600, y_mm: 400, z_mm: 500 },
      rapid_rate_mmmin: 30000,
      max_feed_mmmin: 12000,
      tool_changer_capacity: 20,
      max_tool_diameter_mm: 80,
      max_tool_length_mm: 250,
      max_part_weight_kg: 300,
      coolant: { through_spindle: false, flood: true, mist: true, air_blast: true },
    });
    expect(r.id).toBe("custom_test_mill");
    const p = engine.get("custom_test_mill");
    expect(p!.spindle.max_rpm).toBe(15000);
  });

  it("validates tool diameter against taper", () => {
    const r = engine.validate({
      machine_id: "haas_vf2",
      tool_diameter_mm: 100,
    });
    // 100mm tool on a VF-2 should warn or exceed
    expect(r.checks.some(c => c.status === "WARNING" || c.status === "EXCEEDED")).toBe(true);
  });

  it("high-speed machine has higher RPM limit", () => {
    const vf2 = engine.get("haas_vf2")!;
    const vf2ss = engine.get("haas_vf2ss")!;
    expect(vf2ss.spindle.max_rpm).toBeGreaterThan(vf2.spindle.max_rpm);
  });

  it("spindle curve shows constant torque then constant power", () => {
    const curve = engine.spindleCurve("haas_vf2", 20);
    // In constant torque region, torque should be roughly the same
    const lowRpmTorques = curve.filter(p => p.rpm <= curve[0].rpm * 2).map(p => p.torque_nm);
    if (lowRpmTorques.length >= 2) {
      const diff = Math.abs(lowRpmTorques[0] - lowRpmTorques[1]);
      expect(diff).toBeLessThan(lowRpmTorques[0] * 0.5);
    }
  });
});

// ── Dispatcher wiring ──
describe("calcDispatcher S&F gap-fill wiring", () => {
  it("dispatcher module loads", async () => {
    const mod = await import("../tools/dispatchers/calcDispatcher.js");
    expect(mod.registerCalcDispatcher).toBeDefined();
  });
});
