/**
 * Tests for MastercamMaterialBridgeEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP01
 */

import { describe, it, expect } from "vitest";
import { mastercamMaterialBridgeEngine } from "../engines/MastercamMaterialBridgeEngine.js";

describe("MastercamMaterialBridgeEngine", () => {
  describe("findMaterial", () => {
    it("should find material by ID", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("mc-4140");
      expect(mat).not.toBeNull();
      expect(mat?.name).toContain("4140");
    });

    it("should find material by name substring", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("inconel");
      expect(mat).not.toBeNull();
      expect(mat?.iso_group).toBe("S");
    });

    it("should find material by mastercam class", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("austenitic");
      expect(mat).not.toBeNull();
      expect(mat?.iso_group).toBe("M");
    });

    it("should return null for unknown material", () => {
      const mat = mastercamMaterialBridgeEngine.findMaterial("unobtanium");
      expect(mat).toBeNull();
    });
  });

  describe("getPhysicsProfile", () => {
    it("should return full physics profile for steel", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-4140");
      expect(profile).not.toBeNull();
      expect(profile?.kienzle.kc1_1).toBe(1800);
      expect(profile?.kienzle.mc).toBeCloseTo(0.25, 2);
      expect(profile?.taylor.C).toBe(350);
      expect(profile?.taylor.n).toBeCloseTo(0.25, 2);
    });

    it("should return correct profile for aluminum", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-6061");
      expect(profile?.material.iso_group).toBe("N");
      expect(profile?.kienzle.kc1_1).toBe(700);
      expect(profile?.machinability_rating).toBe(1.0);
    });

    it("should return correct profile for titanium", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-ti6al4v");
      expect(profile?.material.iso_group).toBe("S");
      expect(profile?.kienzle.kc1_1).toBe(2800);
      expect(profile?.recommended_coolant).toBe("high_pressure");
    });

    it("should return correct profile for hardened steel", () => {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile("mc-d2-hard");
      expect(profile?.material.iso_group).toBe("H");
      expect(profile?.kienzle.kc1_1).toBe(3200);
      expect(profile?.machinability_rating).toBe(0.15);
    });
  });

  describe("mapToISO", () => {
    it("should map steel to ISO P", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Steel - Low Carbon")).toBe("P");
    });

    it("should map stainless to ISO M", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Stainless Steel - Austenitic")).toBe("M");
    });

    it("should map cast iron to ISO K", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Cast Iron - Gray")).toBe("K");
    });

    it("should map aluminum to ISO N", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Aluminum - Wrought")).toBe("N");
    });

    it("should map titanium to ISO S", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Titanium - Alpha-Beta")).toBe("S");
    });

    it("should map hardened tool steel to ISO H", () => {
      expect(mastercamMaterialBridgeEngine.mapToISO("Tool Steel - Hardened")).toBe("H");
    });
  });

  describe("calculateCuttingForce", () => {
    it("should calculate cutting force for steel", () => {
      const result = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-4140", 5, 0.15);
      expect(result).not.toBeNull();
      expect(result?.force_N).toBeGreaterThan(500);
      expect(result?.specific_force_N_mm2).toBeGreaterThan(1500);
    });

    it("should calculate lower force for aluminum", () => {
      const steel = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-4140", 5, 0.15);
      const aluminum = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-6061", 5, 0.15);
      expect(aluminum?.force_N).toBeLessThan(steel?.force_N || 0);
    });

    it("should calculate higher force for hardened steel", () => {
      const soft = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-4140", 5, 0.15);
      const hard = mastercamMaterialBridgeEngine.calculateCuttingForce("mc-d2-hard", 5, 0.15);
      expect(hard?.force_N).toBeGreaterThan(soft?.force_N || 0);
    });
  });

  describe("estimateToolLife", () => {
    it("should estimate tool life for steel at moderate speed", () => {
      const result = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 150);
      expect(result).not.toBeNull();
      expect(result?.life_min).toBeGreaterThan(10);
    });

    it("should show reduced life at higher speeds", () => {
      const slow = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 150);
      const fast = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 300);
      expect(fast?.life_min).toBeLessThan(slow?.life_min || 0);
    });

    it("should show very short life for superalloys", () => {
      const steel = mastercamMaterialBridgeEngine.estimateToolLife("mc-4140", 100);
      const inconel = mastercamMaterialBridgeEngine.estimateToolLife("mc-inconel718", 50);
      expect(inconel?.life_min).toBeLessThan(steel?.life_min || 0);
    });
  });

  describe("listMaterials", () => {
    it("should list all materials", () => {
      const materials = mastercamMaterialBridgeEngine.listMaterials();
      expect(materials.length).toBeGreaterThan(10);
    });
  });

  describe("listByISO", () => {
    it("should filter materials by ISO group", () => {
      const steels = mastercamMaterialBridgeEngine.listByISO("P");
      expect(steels.length).toBeGreaterThan(2);
      expect(steels.every(m => m.iso_group === "P")).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return material statistics", () => {
      const stats = mastercamMaterialBridgeEngine.getStats();
      expect(stats.total_materials).toBeGreaterThan(10);
      expect(stats.by_iso_group.P).toBeGreaterThan(0);
      expect(stats.by_iso_group.N).toBeGreaterThan(0);
    });
  });
});
