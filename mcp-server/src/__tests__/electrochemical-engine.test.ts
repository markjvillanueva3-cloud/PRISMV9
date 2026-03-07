/**
 * ElectrochemicalEngine — Unit Tests
 * @milestone FORGE-ENGINES-B35
 */
import { describe, it, expect } from "vitest";
import { electrochemicalEngine } from "../engines/ElectrochemicalEngine.js";

describe("ElectrochemicalEngine", () => {
  it("current from Faraday's law > 0", () => {
    const r = electrochemicalEngine.calculate({});
    expect(r.current_required.value).toBeGreaterThan(0);
  });

  it("larger area needs more current", () => {
    const small = electrochemicalEngine.calculate({ machining_area_mm2: 100 });
    const large = electrochemicalEngine.calculate({ machining_area_mm2: 1000 });
    expect(large.current_required.value).toBeGreaterThan(
      small.current_required.value
    );
  });

  it("MRR increases with current", () => {
    const low = electrochemicalEngine.calculate({ voltage_v: 6 });
    const high = electrochemicalEngine.calculate({ voltage_v: 18 });
    expect(high.mrr.value).toBeGreaterThan(low.mrr.value);
  });

  it("smaller gap increases current density", () => {
    const wide = electrochemicalEngine.calculate({ gap_mm: 0.5 });
    const narrow = electrochemicalEngine.calculate({ gap_mm: 0.1 });
    expect(narrow.current_density.value).toBeGreaterThan(
      wide.current_density.value
    );
  });

  it("power = V × I", () => {
    const r = electrochemicalEngine.calculate({
      voltage_v: 12,
      machining_area_mm2: 500,
    });
    expect(r.power_required.value).toBeGreaterThan(0);
  });

  it("process time proportional to depth", () => {
    const shallow = electrochemicalEngine.calculate({ depth_mm: 2 });
    const deep = electrochemicalEngine.calculate({ depth_mm: 10 });
    expect(deep.process_time.value).toBeGreaterThan(
      shallow.process_time.value
    );
  });

  it("ECM gives good surface finish", () => {
    const r = electrochemicalEngine.calculate({ process: "ecm" });
    expect(r.surface_roughness.value).toBeLessThan(3);
  });

  it("warns titanium passivation", () => {
    const r = electrochemicalEngine.calculate({
      workpiece_material: "titanium",
    });
    expect(r.warnings.some(w => w.includes("passivation"))).toBe(true);
  });

  it("warns NaCl stray corrosion", () => {
    const r = electrochemicalEngine.calculate({ electrolyte: "NaCl" });
    expect(r.warnings.some(w => w.includes("stray"))).toBe(true);
  });

  it("electrolyte flow > 0", () => {
    const r = electrochemicalEngine.calculate({});
    expect(r.electrolyte_flow.value).toBeGreaterThan(0);
  });
});
