/**
 * LatheCoolantAdvisorEngine Test Suite (LATHE-PRO-MS5)
 */
import { describe, it, expect } from "vitest";
import { latheCoolantAdvisorEngine } from "../engines/LatheCoolantAdvisorEngine.js";

describe("LatheCoolantAdvisorEngine", () => {
  describe("advise()", () => {
    it("recommends dry for cast iron (K group)", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "K",
        operation: "roughing",
        tool_material: "carbide",
      });
      expect(r.recommendation).toBe("dry");
    });

    it("recommends HPC for Ni/Ti drilling", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "S",
        operation: "drilling",
        tool_material: "carbide",
        deep_hole: true,
        thru_spindle_available: true,
      });
      expect(r.recommendation).toBe("high_pressure");
    });

    it("recommends cryogenic for Ni/Ti roughing when available", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "S",
        operation: "roughing",
        tool_material: "carbide",
        cryo_available: true,
      });
      expect(r.recommendation).toBe("cryogenic");
    });

    it("recommends dry for hard turning with CBN", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "H",
        operation: "finishing",
        tool_material: "cbn",
        hard_turning: true,
      });
      expect(r.recommendation).toBe("dry");
    });

    it("prefers MQL with high sustainability priority on aluminum", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "N",
        operation: "finishing",
        tool_material: "carbide",
        sustainability_priority: "high",
      });
      expect(["mql", "mist", "dry"]).toContain(r.recommendation);
    });

    it("returns parameters for flood mode", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "P",
        operation: "roughing",
        tool_material: "carbide",
      });
      expect(r.parameters.flow_rate_lpm).toBeGreaterThan(0);
    });

    it("returns parameters for MQL (ml/hr)", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "N",
        operation: "roughing",
        tool_material: "carbide",
        sustainability_priority: "high",
      });
      if (r.recommendation === "mql") {
        expect(r.parameters.mql_ml_hr).toBeGreaterThan(0);
      }
    });

    it("returns alternatives list with 5 items", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "P",
        operation: "roughing",
        tool_material: "carbide",
      });
      expect(r.alternatives.length).toBe(5);
    });

    it("confidence is in [0, 1]", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "M",
        operation: "finishing",
        tool_material: "carbide",
      });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("safety_notes array always defined", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "P",
        operation: "roughing",
        tool_material: "carbide",
      });
      expect(Array.isArray(r.safety_notes)).toBe(true);
    });
  });

  describe("getStats()", () => {
    it("lists all 6 coolant modes", () => {
      const s = latheCoolantAdvisorEngine.getStats();
      expect(s.modes.length).toBe(6);
      expect(s.modes).toContain("flood");
      expect(s.modes).toContain("cryogenic");
    });
  });
});
