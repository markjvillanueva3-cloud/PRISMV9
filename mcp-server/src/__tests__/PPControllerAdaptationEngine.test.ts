/**
 * PPControllerAdaptationEngine Tests — PP-DL-MS1
 */
import { describe, it, expect } from "vitest";
import {
  PPControllerAdaptationEngine,
  ppControllerAdaptationEngine,
} from "../engines/PPControllerAdaptationEngine.js";

describe("PPControllerAdaptationEngine", () => {
  it("exports singleton", () => {
    expect(ppControllerAdaptationEngine).toBeInstanceOf(PPControllerAdaptationEngine);
  });

  describe("adapt — Haas NGC", () => {
    it("reduces feed by 15%", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "haas_ngc", operation: "roughing",
        feed_rate: 1000,
      });
      expect(r.adapted.feed_rate).toBe(850);
    });

    it("adds G187 for finishing", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "haas_ngc", operation: "finishing",
      });
      expect(r.adapted.additional_codes.some(c => c.includes("G187"))).toBe(true);
    });

    it("has high confidence for known profile", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "haas_ngc", operation: "roughing",
      });
      expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("adapt — Fanuc 31i", () => {
    it("keeps feed unchanged (factor 1.0)", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "fanuc_31i", operation: "roughing", feed_rate: 1000,
      });
      expect(r.adapted.feed_rate).toBe(1000);
    });

    it("adds G05.1 nano smoothing for finishing", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "fanuc_31i", operation: "finishing",
      });
      expect(r.adapted.additional_codes.some(c => c.includes("G05.1"))).toBe(true);
    });

    it("adds TCPC for 5-axis", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "fanuc_31i", operation: "5axis",
      });
      expect(r.adapted.tcpc_setting).toBeDefined();
      expect(r.adapted.tcpc_setting).toContain("G43.4");
    });
  });

  describe("adapt — Siemens 840D", () => {
    it("slightly increases feed (factor 1.05)", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "siemens_840d", operation: "roughing", feed_rate: 1000,
      });
      expect(r.adapted.feed_rate).toBe(1050);
    });

    it("adds CYCLE832 for finishing", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "siemens_840d", operation: "finishing",
      });
      expect(r.adapted.additional_codes.some(c => c.includes("CYCLE832"))).toBe(true);
    });
  });

  describe("adapt — Okuma OSP-P300", () => {
    it("adds G8.1 NURBS for finishing", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "okuma_osp_p300", operation: "finishing",
      });
      expect(r.adapted.additional_codes.some(c => c.includes("G8.1"))).toBe(true);
    });
  });

  describe("adapt — Hurco WinMax", () => {
    it("reduces feed by 10%", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "hurco_max5", operation: "roughing", feed_rate: 1000,
      });
      expect(r.adapted.feed_rate).toBe(900);
    });
  });

  describe("adapt — unknown controller", () => {
    it("returns lower confidence", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "unknown_xyz", operation: "roughing",
      });
      expect(r.confidence).toBeLessThan(0.9);
    });

    it("preserves original parameters", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "unknown_xyz", operation: "roughing",
        spindle_speed: 5000, feed_rate: 500,
      });
      expect(r.original.spindle_speed).toBe(5000);
      expect(r.original.feed_rate).toBe(500);
    });
  });

  describe("adjustments tracking", () => {
    it("records each adjustment with reason", () => {
      const r = ppControllerAdaptationEngine.adapt({
        controller_id: "haas_ngc", operation: "finishing", feed_rate: 1000,
      });
      expect(r.adjustments.length).toBeGreaterThan(0);
      for (const adj of r.adjustments) {
        expect(adj.parameter.length).toBeGreaterThan(0);
        expect(adj.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe("listProfiles / hasProfile", () => {
    it("lists known profiles", () => {
      const profiles = ppControllerAdaptationEngine.listProfiles();
      expect(profiles).toContain("haas_ngc");
      expect(profiles).toContain("fanuc_31i");
      expect(profiles).toContain("siemens_840d");
      expect(profiles).toContain("okuma_osp_p300");
    });

    it("hasProfile true for known", () => {
      expect(ppControllerAdaptationEngine.hasProfile("haas_ngc")).toBe(true);
    });

    it("hasProfile false for unknown", () => {
      expect(ppControllerAdaptationEngine.hasProfile("unknown_xyz")).toBe(false);
    });
  });

  describe("getNotes", () => {
    it("returns notes for known controller", () => {
      const notes = ppControllerAdaptationEngine.getNotes("haas_ngc");
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0]).toContain("Haas");
    });

    it("returns default for unknown", () => {
      const notes = ppControllerAdaptationEngine.getNotes("unknown_xyz");
      expect(notes.length).toBeGreaterThan(0);
    });
  });
});
