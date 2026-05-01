/**
 * Dedicated tests for SpeedFeedOrchestratorEngine
 * Method: compute() — unified speed/feed recommendation pipeline
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

describe("SpeedFeedOrchestratorEngine", () => {
  describe("basic aluminum milling", () => {
    it("should produce speed/feed for aluminum with minimal inputs", () => {
      const r = speedFeedOrchestratorEngine.compute({
        material: "aluminum 6061",
        tool_diameter_mm: 10,
        flutes: 3,
        operation: "milling",
      });
      expect(r.confidence).toBeGreaterThan(0);
      const v = r.value;
      expect(v.cutting_speed_mpm).toBeGreaterThan(50);
      expect(v.spindle_rpm).toBeGreaterThan(1000);
      expect(v.feed_rate_mmmin).toBeGreaterThan(100);
      expect(v.feed_per_tooth_mm).toBeGreaterThan(0);
    });
  });

  describe("steel milling", () => {
    it("should recommend lower speeds for steel vs aluminum", () => {
      const al = speedFeedOrchestratorEngine.compute({
        material: "aluminum 6061",
        tool_diameter_mm: 10,
        flutes: 3,
        operation: "milling",
      });
      const st = speedFeedOrchestratorEngine.compute({
        material: "steel 1045",
        tool_diameter_mm: 10,
        flutes: 3,
        operation: "milling",
      });
      expect(st.value.cutting_speed_mpm).toBeLessThan(al.value.cutting_speed_mpm);
    });
  });

  describe("tool steel milling", () => {
    it("should handle D2 tool steel conservatively", () => {
      const toolSteel = speedFeedOrchestratorEngine.compute({
        material: "D2 tool steel",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        tool_material: "carbide",
      });
      const steel = speedFeedOrchestratorEngine.compute({
        material: "steel 1045",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        tool_material: "carbide",
      });
      const v = toolSteel.value;
      expect(v.cutting_speed_mpm).toBeGreaterThan(0);
      expect(v.cutting_speed_mpm).toBeLessThan(steel.value.cutting_speed_mpm);
      expect(v.playbook_warnings.length).toBeGreaterThan(0);
    });
  });

  describe("titanium milling", () => {
    it("should produce conservative parameters for Ti-6Al-4V", () => {
      const r = speedFeedOrchestratorEngine.compute({
        material: "titanium ti-6al-4v",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        tool_material: "carbide",
      });
      const v = r.value;
      // Titanium requires very low speeds (typically 5-60 m/min for carbide)
      expect(v.cutting_speed_mpm).toBeLessThan(120);
      expect(v.cutting_speed_mpm).toBeGreaterThan(0);
      expect(v.feed_per_tooth_mm).toBeGreaterThan(0);
    });
  });

  describe("stainless steel", () => {
    it("should handle stainless steel 304", () => {
      const r = speedFeedOrchestratorEngine.compute({
        material: "stainless steel 304",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
      });
      const v = r.value;
      // Stainless can be low speed (10-80 m/min range)
      expect(v.cutting_speed_mpm).toBeGreaterThan(0);
      expect(v.spindle_rpm).toBeGreaterThan(0);
      expect(v.axial_depth_mm).toBeGreaterThan(0);
    });
  });

  describe("machine constraints", () => {
    it("should respect machine max RPM", () => {
      const r = speedFeedOrchestratorEngine.compute({
        material: "aluminum 6061",
        tool_diameter_mm: 3,
        flutes: 2,
        operation: "milling",
        machine_max_rpm: 8000,
      });
      expect(r.value.spindle_rpm).toBeLessThanOrEqual(8000);
    });

    it("should respect machine power limit", () => {
      const r = speedFeedOrchestratorEngine.compute({
        material: "steel 4340",
        tool_diameter_mm: 25,
        flutes: 4,
        operation: "milling",
        machine_power_kw: 7.5,
      });
      expect(r.value).toBeDefined();
      expect(r.value.spindle_rpm).toBeGreaterThan(0);
    });
  });

  describe("output structure", () => {
    it("should include playbook_warnings and source provenance", () => {
      const r = speedFeedOrchestratorEngine.compute({
        material: "aluminum 6061",
        tool_diameter_mm: 10,
        flutes: 3,
        operation: "milling",
      });
      expect(r.value.playbook_warnings).toBeDefined();
      expect(Array.isArray(r.value.playbook_warnings)).toBe(true);
      expect(r.source).toBeDefined();
    });
  });
});
