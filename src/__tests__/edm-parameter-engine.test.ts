/**
 * EDMParameterEngine — Unit Tests
 * @milestone FORGE-ENGINES-B35
 */
import { describe, it, expect } from "vitest";
import { edmParameterEngine } from "../engines/EDMParameterEngine.js";

describe("EDMParameterEngine", () => {
  it("roughing has higher current than finishing", () => {
    const rough = edmParameterEngine.calculate({ cut_type: "roughing" });
    const finish = edmParameterEngine.calculate({ cut_type: "finishing" });
    expect(rough.peak_current.value).toBeGreaterThan(finish.peak_current.value);
  });

  it("roughing has higher MRR", () => {
    const rough = edmParameterEngine.calculate({ cut_type: "roughing" });
    const finish = edmParameterEngine.calculate({ cut_type: "finishing" });
    expect(rough.mrr.value).toBeGreaterThan(finish.mrr.value);
  });

  it("finishing gives better surface roughness", () => {
    const rough = edmParameterEngine.calculate({ cut_type: "roughing" });
    const finish = edmParameterEngine.calculate({ cut_type: "finishing" });
    expect(finish.surface_roughness.value).toBeLessThan(
      rough.surface_roughness.value
    );
  });

  it("wire EDM has wire speed and tension", () => {
    const r = edmParameterEngine.calculate({ edm_type: "wire" });
    expect(r.wire_speed.value).toBeGreaterThan(0);
    expect(r.wire_tension.value).toBeGreaterThan(0);
  });

  it("sinker EDM has zero wire speed", () => {
    const r = edmParameterEngine.calculate({ edm_type: "sinker" });
    expect(r.wire_speed.value).toBe(0);
  });

  it("carbide has lower MRR than steel", () => {
    const steel = edmParameterEngine.calculate({ workpiece_material: "steel" });
    const carb = edmParameterEngine.calculate({ workpiece_material: "carbide" });
    expect(carb.mrr.value).toBeLessThan(steel.mrr.value);
  });

  it("graphite electrode has lower wear than brass wire", () => {
    const graphite = edmParameterEngine.calculate({
      edm_type: "sinker",
      electrode_material: "graphite",
    });
    const brass = edmParameterEngine.calculate({
      edm_type: "wire",
      electrode_material: "brass_wire",
    });
    expect(graphite.electrode_wear_ratio.value).toBeLessThan(
      brass.electrode_wear_ratio.value
    );
  });

  it("roughing uses higher flushing pressure", () => {
    const rough = edmParameterEngine.calculate({ cut_type: "roughing" });
    const finish = edmParameterEngine.calculate({ cut_type: "finishing" });
    expect(rough.flushing_pressure.value).toBeGreaterThan(
      finish.flushing_pressure.value
    );
  });

  it("estimated time > 0", () => {
    const r = edmParameterEngine.calculate({});
    expect(r.estimated_time.value).toBeGreaterThan(0);
  });

  it("warns carbide roughing micro-cracking", () => {
    const r = edmParameterEngine.calculate({
      workpiece_material: "carbide",
      cut_type: "roughing",
    });
    expect(r.warnings.some(w => w.includes("micro-crack"))).toBe(true);
  });
});
