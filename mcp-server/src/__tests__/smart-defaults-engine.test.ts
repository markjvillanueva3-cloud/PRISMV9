import { describe, it, expect } from "vitest";
import { SmartDefaultsEngine } from "../engines/SmartDefaultsEngine.js";

describe("SmartDefaultsEngine", () => {
  const engine = new SmartDefaultsEngine();

  describe("getDefaults", () => {
    it("returns defaults for aluminum", () => {
      const d = engine.getDefaults("6061", 0.5, 3);
      expect(d.rpm).toBeGreaterThan(3000);
      expect(d.feed_ipm).toBeGreaterThan(0);
      expect(d.doc_in).toBeGreaterThan(0);
      expect(d.woc_in).toBeGreaterThan(0);
      expect(d.coolant).toBe("flood");
    });

    it("returns lower speeds for titanium", () => {
      const al = engine.getDefaults("6061", 0.5, 3);
      const ti = engine.getDefaults("titanium", 0.5, 3);
      expect(ti.rpm).toBeLessThan(al.rpm);
    });

    it("returns high-pressure coolant for titanium", () => {
      const d = engine.getDefaults("ti6al4v", 0.5, 3);
      expect(d.coolant).toContain("high-pressure");
    });
  });

  describe("getSFM", () => {
    it("returns SFM for known material", () => {
      expect(engine.getSFM("6061")).toBe(800);
      expect(engine.getSFM("titanium")).toBe(150);
    });

    it("varies by tool material", () => {
      expect(engine.getSFM("6061", "hss")).toBeLessThan(engine.getSFM("6061", "carbide"));
    });
  });

  describe("getChipload", () => {
    it("returns chipload for known diameter", () => {
      expect(engine.getChipload(0.5)).toBe(0.004);
    });

    it("finds closest match", () => {
      const cl = engine.getChipload(0.49);
      expect(cl).toBeGreaterThan(0);
    });
  });

  describe("getEngagement", () => {
    it("returns DOC and WOC", () => {
      const e = engine.getEngagement(0.5, "aluminum");
      expect(e.doc).toBeGreaterThan(0);
      expect(e.woc).toBeGreaterThan(0);
    });

    it("reduces engagement for hard materials", () => {
      const al = engine.getEngagement(0.5, "aluminum");
      const ti = engine.getEngagement(0.5, "titanium");
      expect(ti.doc).toBeLessThan(al.doc);
    });

    it("adjusts for finishing operation", () => {
      const rough = engine.getEngagement(0.5, "steel", "roughing");
      const finish = engine.getEngagement(0.5, "steel", "finishing");
      expect(finish.doc).toBeLessThan(rough.doc);
    });
  });

  describe("oneLiner", () => {
    it("returns compact defaults string", () => {
      const line = engine.oneLiner("6061", 0.5);
      expect(line).toContain("RPM=");
      expect(line).toContain("F=");
      expect(line).toContain("DOC=");
    });
  });

  describe("listMaterials", () => {
    it("lists all supported materials", () => {
      const mats = engine.listMaterials();
      expect(mats.length).toBeGreaterThan(10);
      expect(mats).toContain("6061");
      expect(mats).toContain("titanium");
    });
  });
});
