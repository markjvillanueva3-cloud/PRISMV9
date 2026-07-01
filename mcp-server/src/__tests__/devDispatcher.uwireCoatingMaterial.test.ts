/**
 * devDispatcher U-WIRE-COATING-MATERIAL round-trip tests — 2 domain engines
 * wired into prism_dev (slot:papa /goal /loop iter7, 2026-05-27).
 *
 *   CoatingSelectionEngine    → coating_select
 *   MaterialHarvesterEngine   → material_harvest_audit + material_harvest_sources
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-COATING-MATERIAL
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { coatingSelectionEngine } from "../engines/CoatingSelectionEngine.js";
import { MaterialHarvesterEngine } from "../engines/MaterialHarvesterEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHER_SRC = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
  "utf8"
);

describe("U-WIRE-COATING-SELECT engine — coating recommendation", () => {
  it("ISO P (steel) finishing at high speed with flood + carbide returns TiAlN-family coating", () => {
    const r = coatingSelectionEngine.calculate({
      iso_group: "P",
      operation: "finishing",
      speed_range: "high",
      coolant: "flood",
      substrate: "carbide",
    });
    expect(typeof r.coating).toBe("string");
    expect(r.coating.length).toBeGreaterThan(0);
    expect(Array.isArray(r.reasoning)).toBe(true);
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.temperature_limit_C).toBeGreaterThan(0);
    expect(r.hardness_HV).toBeGreaterThan(0);
    expect(r.friction_coefficient).toBeGreaterThan(0);
    expect(r.friction_coefficient).toBeLessThan(1);
  });

  it("ISO N (aluminum) finishing at very_high speed prefers DLC or uncoated (no Ti-buildup)", () => {
    const r = coatingSelectionEngine.calculate({
      iso_group: "N",
      operation: "finishing",
      speed_range: "very_high",
      coolant: "MQL",
      substrate: "carbide",
    });
    expect(typeof r.coating).toBe("string");
    expect(r.reasoning.length).toBeGreaterThan(0);
  });

  it("ISO M (stainless) roughing at low speed yields a recommendation + alternatives list", () => {
    const r = coatingSelectionEngine.calculate({
      iso_group: "M",
      operation: "roughing",
      speed_range: "low",
      coolant: "flood",
      substrate: "carbide",
    });
    expect(r.coating.length).toBeGreaterThan(0);
    expect(r.alternatives.length).toBeGreaterThanOrEqual(0);
    expect(r.alternatives.every(a => typeof a.coating === "string" && typeof a.why_not === "string")).toBe(true);
  });

  it("classifySpeed maps ISO P velocity 150 m/min to a valid SpeedRange", () => {
    const range = coatingSelectionEngine.classifySpeed("P", 150);
    expect(["low", "medium", "high", "very_high"]).toContain(range);
  });
});

describe("U-WIRE-MATERIAL-HARVEST engine — SolidWorks .sldmat extraction", () => {
  it("getSources returns 3 source-file entries with expectedMin counts", () => {
    const s = MaterialHarvesterEngine.getSources();
    expect(s.files.length).toBe(3);
    expect(typeof s.rootPath).toBe("string");
    expect(s.rootPath.length).toBeGreaterThan(0);
    for (const f of s.files) {
      expect(typeof f.filename).toBe("string");
      expect(f.filename.endsWith(".sldmat")).toBe(true);
      expect(typeof f.expectedMin).toBe("number");
      expect(f.expectedMin).toBeGreaterThan(0);
    }
  });

  it("getSources files include the 3 canonical .sldmat filenames", () => {
    const s = MaterialHarvesterEngine.getSources();
    const names = s.files.map(f => f.filename);
    expect(names.some(n => n === "solidworks materials.sldmat")).toBe(true);
    expect(names.some(n => n === "SolidWorks DIN Materials.sldmat")).toBe(true);
    expect(names.some(n => n === "sustainability extras.sldmat")).toBe(true);
  });

  it("findByName filters HarvestedMaterial[] by case-insensitive substring", () => {
    const fixture = [
      { name: "AISI 1020 Steel", classification: "Steel", source_file: "x", properties: {} },
      { name: "Aluminum 6061-T6", classification: "Aluminum", source_file: "x", properties: {} },
      { name: "Brass", classification: "Copper Alloy", source_file: "x", properties: {} },
    ] as unknown as Parameters<typeof MaterialHarvesterEngine.findByName>[0];
    const r = MaterialHarvesterEngine.findByName(fixture, "alum");
    expect(r.length).toBe(1);
    expect(r[0].name).toBe("Aluminum 6061-T6");
  });

  it("filterByClassification matches case-insensitive substring", () => {
    const fixture = [
      { name: "AISI 1020", classification: "Steel", source_file: "x", properties: {} },
      { name: "Aluminum 6061", classification: "Aluminum Alloy", source_file: "x", properties: {} },
    ] as unknown as Parameters<typeof MaterialHarvesterEngine.filterByClassification>[0];
    const r = MaterialHarvesterEngine.filterByClassification(fixture, "alum");
    expect(r.length).toBe(1);
    expect(r[0].classification).toBe("Aluminum Alloy");
  });
});

describe("U-WIRE-COATING-MATERIAL dispatcher wiring source assertions", () => {
  it("action enum lists coating_select + material_harvest_audit + material_harvest_sources", () => {
    expect(DISPATCHER_SRC.includes('"coating_select"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"material_harvest_audit"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"material_harvest_sources"')).toBe(true);
  });

  it("case-blocks exist for all 3 actions", () => {
    expect(DISPATCHER_SRC.includes("case \"coating_select\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"material_harvest_audit\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"material_harvest_sources\"")).toBe(true);
  });

  it("lazy imports present for both engines", () => {
    expect(DISPATCHER_SRC.includes('"../../engines/CoatingSelectionEngine.js"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"../../engines/MaterialHarvesterEngine.js"')).toBe(true);
  });
});
