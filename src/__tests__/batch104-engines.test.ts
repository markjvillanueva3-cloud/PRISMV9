/**
 * Batch 104 — ResistanceWelding, SolderingProcess, BrazingProcess
 * @milestone FORGE-ENGINES-BATCH104
 */
import { describe, it, expect } from "vitest";
import { resistanceWeldingEngine } from "../engines/ResistanceWeldingEngine.js";
import { solderingProcessEngine } from "../engines/SolderingProcessEngine.js";
import { brazingProcessEngine } from "../engines/BrazingProcessEngine.js";

describe("ResistanceWeldingEngine", () => {
  const base = { sheet_thickness_mm: 1.5 };
  it("nugget diameter > 0", () => {
    expect(resistanceWeldingEngine.calculate(base).nugget_diameter_mm.value).toBeGreaterThan(0);
  });
  it("weld current > 0", () => {
    expect(resistanceWeldingEngine.calculate(base).weld_current_kA.value).toBeGreaterThan(0);
  });
  it("heat input > 0", () => {
    expect(resistanceWeldingEngine.calculate(base).heat_input_J.value).toBeGreaterThan(0);
  });
  it("shear strength > 0", () => {
    expect(resistanceWeldingEngine.calculate(base).shear_strength_kN.value).toBeGreaterThan(0);
  });
  it("electrode force > 0", () => {
    expect(resistanceWeldingEngine.calculate(base).electrode_force_kN.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(resistanceWeldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("SolderingProcessEngine", () => {
  const base = { board_thickness_mm: 1.6 };
  it("peak temp above liquidus", () => {
    expect(solderingProcessEngine.calculate(base).peak_temperature_C.value).toBeGreaterThan(217);
  });
  it("wetting angle < 45°", () => {
    expect(solderingProcessEngine.calculate(base).wetting_angle_deg.value).toBeLessThan(45);
  });
  it("SnBi lower peak temp than SAC305", () => {
    const sac = solderingProcessEngine.calculate({ ...base, alloy: "SAC305" }).peak_temperature_C.value;
    const snbi = solderingProcessEngine.calculate({ ...base, alloy: "SnBi58" }).peak_temperature_C.value;
    expect(snbi).toBeLessThan(sac);
  });
  it("joint strength > 0", () => {
    expect(solderingProcessEngine.calculate(base).joint_strength_MPa.value).toBeGreaterThan(0);
  });
  it("process window > 0", () => {
    expect(solderingProcessEngine.calculate(base).process_window_C.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(solderingProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("BrazingProcessEngine", () => {
  const base = { joint_area_mm2: 100 };
  it("brazing temp > 0", () => {
    expect(brazingProcessEngine.calculate(base).brazing_temp_C.value).toBeGreaterThan(0);
  });
  it("filler volume > 0", () => {
    expect(brazingProcessEngine.calculate(base).filler_volume_mm3.value).toBeGreaterThan(0);
  });
  it("joint strength > 0", () => {
    expect(brazingProcessEngine.calculate(base).joint_strength_MPa.value).toBeGreaterThan(0);
  });
  it("cycle time > heating time", () => {
    const r = brazingProcessEngine.calculate(base);
    expect(r.cycle_time_min.value).toBeGreaterThan(r.heating_time_min.value);
  });
  it("BNi higher temp than BAg", () => {
    const ag = brazingProcessEngine.calculate({ ...base, filler: "BAg" }).brazing_temp_C.value;
    const ni = brazingProcessEngine.calculate({ ...base, filler: "BNi" }).brazing_temp_C.value;
    expect(ni).toBeGreaterThan(ag);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(brazingProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});
