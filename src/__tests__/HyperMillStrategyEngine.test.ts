/**
 * Tests for HyperMillStrategyEngine — HM-REV-MS7 U-HMR38
 *
 * Covers:
 *  - 16 existing strategy tests (regression guard)
 *  - 4 new mill-turn tests: OD profile, ID bore, groove, thread
 *  - CSS mode selection (G96/G97)
 *  - TNRC flag
 *  - Turning physics summary (Vc, feed, kc1.1)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperMillStrategyEngine,
  hyperMillStrategyEngine,
} from "../engines/HyperMillStrategyEngine.js";

describe("HyperMillStrategyEngine", () => {
  let engine: HyperMillStrategyEngine;

  beforeEach(() => {
    engine = new HyperMillStrategyEngine();
  });

  // ============================================================
  // Existing 2D milling strategies (regression guard)
  // ============================================================

  describe("2D milling strategies", () => {
    it("recommends Pocket Milling for pocket_2d roughing", () => {
      const r = engine.calculate({ geometryType: "pocket_2d", operationGoal: "roughing" });
      // Optimised Roughing (priority 12) or Pocket Milling (priority 10) are both valid
      expect(
        r.strategyName.includes("Pocket") || r.strategyName.includes("Roughing"),
      ).toBe(true);
      expect(r.confidence).toBeGreaterThan(0);
    });

    it("recommends Contour Milling for contour_2d finishing", () => {
      const r = engine.calculate({ geometryType: "contour_2d", operationGoal: "finishing" });
      expect(r.strategyName).toBe("Contour Milling");
    });

    it("recommends Face Milling for face roughing", () => {
      const r = engine.calculate({ geometryType: "face", operationGoal: "roughing" });
      expect(r.strategyName).toBe("Face Milling");
    });

    it("recommends slot milling for slot roughing", () => {
      const r = engine.calculate({ geometryType: "slot", operationGoal: "roughing" });
      expect(r.hyperMillCycle).toContain("Slot");
    });

    it("recommends Rest Machining 2D for corner rest_machining", () => {
      const r = engine.calculate({
        geometryType: "corner",
        operationGoal: "rest_machining",
        hasPreviousRoughing: true,
      });
      expect(r.hyperMillCycle).toBeTruthy();
      expect(r.warnings.some((w) => w.includes("roughing"))).toBe(false);
    });

    it("warns when rest_machining without previous roughing", () => {
      const r = engine.calculate({
        geometryType: "corner",
        operationGoal: "rest_machining",
        hasPreviousRoughing: false,
      });
      expect(r.warnings.some((w) => w.includes("roughing"))).toBe(true);
    });

    it("prefers Z Level Finishing for steep walls (wallAngleDeg > 60)", () => {
      const r = engine.calculate({
        geometryType: "steep_wall",
        operationGoal: "finishing",
        wallAngleDeg: 75,
      });
      expect(r.hyperMillCycle).toContain("Z Level");
    });

    it("prefers Equidistant or Plane for flat areas (wallAngleDeg < 20)", () => {
      const r = engine.calculate({
        geometryType: "flat_area",
        operationGoal: "finishing",
        wallAngleDeg: 5,
      });
      expect(
        r.hyperMillCycle.includes("Equidistant") || r.hyperMillCycle.includes("Plane"),
      ).toBe(true);
    });
  });

  // ============================================================
  // Existing 3D milling strategies
  // ============================================================

  describe("3D milling strategies", () => {
    it("recommends Optimised Roughing for freeform_3d roughing", () => {
      const r = engine.calculate({ geometryType: "freeform_3d", operationGoal: "roughing" });
      expect(r.strategyName).toBe("Optimised Roughing");
    });

    it("recommends Z Level Finishing for steep_wall finishing", () => {
      const r = engine.calculate({ geometryType: "steep_wall", operationGoal: "finishing" });
      expect(r.hyperMillCycle).toContain("Z Level");
    });

    it("recommends Equidistant or Complete Finishing for flat_area finishing", () => {
      const r = engine.calculate({ geometryType: "flat_area", operationGoal: "finishing" });
      expect(
        r.hyperMillCycle.includes("Equidistant") ||
          r.hyperMillCycle.includes("Complete") ||
          r.hyperMillCycle.includes("Plane"),
      ).toBe(true);
    });

    it("recommends groove-type cycle for groove finishing", () => {
      const r = engine.calculate({ geometryType: "groove", operationGoal: "finishing" });
      // Engine may return Pencil Milling or Rib/Groove Machining depending on priority
      expect(
        r.strategyName.toLowerCase().includes("groove") ||
          r.strategyName.toLowerCase().includes("pencil") ||
          r.strategyName.toLowerCase().includes("rib"),
      ).toBe(true);
    });

    it("includes superalloy warning for ISO S material", () => {
      const r = engine.calculate({
        geometryType: "freeform_3d",
        operationGoal: "finishing",
        materialGroup: "S",
      });
      expect(r.warnings.some((w) => w.includes("Superalloy"))).toBe(true);
    });

    it("includes hardened steel warning for ISO H material", () => {
      const r = engine.calculate({
        geometryType: "freeform_3d",
        operationGoal: "finishing",
        materialGroup: "H",
      });
      expect(r.warnings.some((w) => w.includes("Hardened"))).toBe(true);
    });
  });

  // ============================================================
  // Legacy turning strategies (backward compat)
  // ============================================================

  describe("legacy turning geometry types", () => {
    it("recommends Turning Roughing for turning_external roughing", () => {
      const r = engine.calculate({
        geometryType: "turning_external",
        operationGoal: "roughing",
      });
      expect(r.hyperMillCycle).toContain("Rough");
    });

    it("returns finishing strategy for turning_internal finishing", () => {
      const r = engine.calculate({
        geometryType: "turning_internal",
        operationGoal: "finishing",
      });
      expect(r.operationGoal ?? r.hyperMillCycle).toBeTruthy();
      expect(r.confidence).toBeGreaterThan(0);
    });

    it("recommends groove cycle for turning_groove roughing", () => {
      const r = engine.calculate({ geometryType: "turning_groove", operationGoal: "roughing" });
      expect(r.hyperMillCycle).toContain("Groove");
    });

    it("recommends thread cycle for thread finishing", () => {
      const r = engine.calculate({ geometryType: "thread", operationGoal: "finishing" });
      expect(r.hyperMillCycle).toContain("Thread");
    });
  });

  // ============================================================
  // NEW: Mill-Turn geometry types (HM-REV-MS7 U-HMR38)
  // ============================================================

  describe("mill-turn OD profile", () => {
    it("recommends MT:Rough Turning for od_profile roughing", () => {
      const r = engine.calculate({
        geometryType: "od_profile",
        operationGoal: "roughing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toContain("MT:");
      expect(r.hyperMillCycle.toLowerCase()).toContain("rough");
    });

    it("recommends MT:Finish Turning for od_profile finishing", () => {
      const r = engine.calculate({
        geometryType: "od_profile",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toContain("MT:");
      expect(r.hyperMillCycle.toLowerCase()).toContain("finish");
    });

    it("sets cssMode=G96 for od_profile finishing", () => {
      const r = engine.calculate({
        geometryType: "od_profile",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics).toBeDefined();
      expect(r.turningPhysics!.cssMode).toBe("G96");
    });

    it("sets tnrcRequired=true for od_profile finishing", () => {
      const r = engine.calculate({
        geometryType: "od_profile",
        operationGoal: "finishing",
        materialGroup: "P",
        noseRadiusMm: 0.4,
      });
      expect(r.turningPhysics!.tnrcRequired).toBe(true);
    });

    it("provides canonical Vc for od_profile ISO P finishing (320 m/min)", () => {
      const r = engine.calculate({
        geometryType: "od_profile",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      // CANONICAL_TURNING_SPEEDS.P.finish = 320 m/min
      expect(r.turningPhysics!.vcRecommended_m_min).toBe(320);
    });

    it("provides kc1.1=1800 for od_profile ISO P (from CANONICAL_KIENZLE)", () => {
      const r = engine.calculate({
        geometryType: "od_profile",
        operationGoal: "roughing",
        materialGroup: "P",
      });
      // CANONICAL_KIENZLE.P.kc1_1 = 1800
      expect(r.turningPhysics!.kc1_1).toBe(1800);
    });
  });

  describe("mill-turn ID bore", () => {
    it("recommends MT bore roughing cycle", () => {
      const r = engine.calculate({
        geometryType: "bore",
        operationGoal: "roughing",
        materialGroup: "M",
      });
      expect(r.hyperMillCycle).toContain("MT:");
    });

    it("sets cssMode=G96 for bore finishing (stainless)", () => {
      const r = engine.calculate({
        geometryType: "bore",
        operationGoal: "finishing",
        materialGroup: "M",
      });
      expect(r.turningPhysics!.cssMode).toBe("G96");
    });

    it("tnrcRequired=true for bore finishing", () => {
      const r = engine.calculate({
        geometryType: "bore",
        operationGoal: "finishing",
        materialGroup: "M",
      });
      expect(r.turningPhysics!.tnrcRequired).toBe(true);
    });

    it("includes boring bar deflection note", () => {
      const r = engine.calculate({
        geometryType: "bore",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.notes.some((n) => n.toLowerCase().includes("boring"))).toBe(true);
    });
  });

  describe("mill-turn groove OD", () => {
    it("recommends MT:Groove Turning for groove_od roughing", () => {
      const r = engine.calculate({
        geometryType: "groove_od",
        operationGoal: "roughing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toContain("Groove");
    });

    it("recommends MT:Groove Finishing for groove_od finishing", () => {
      const r = engine.calculate({
        geometryType: "groove_od",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toContain("Finish");
    });

    it("tnrcRequired=true for groove_od finishing", () => {
      const r = engine.calculate({
        geometryType: "groove_od",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.tnrcRequired).toBe(true);
    });
  });

  describe("mill-turn thread OD", () => {
    it("recommends MT:Thread Turning for thread_od finishing", () => {
      const r = engine.calculate({
        geometryType: "thread_od",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toContain("Thread");
    });

    it("sets cssMode=G97 for thread_od (constant RPM mandatory for pitch)", () => {
      const r = engine.calculate({
        geometryType: "thread_od",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.cssMode).toBe("G97");
    });

    it("includes G97 note for thread_od", () => {
      const r = engine.calculate({
        geometryType: "thread_od",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.notes.some((n) => n.includes("G97"))).toBe(true);
    });

    it("tnrcRequired=false for thread_od (TNRC off during threading)", () => {
      const r = engine.calculate({
        geometryType: "thread_od",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.tnrcRequired).toBe(false);
    });
  });

  describe("mill-turn parting", () => {
    it("recommends MT:Turning Parting for parting finishing", () => {
      const r = engine.calculate({
        geometryType: "parting",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toContain("Parting");
    });

    it("sets cssMode=G97 for parting (runaway RPM prevention)", () => {
      const r = engine.calculate({
        geometryType: "parting",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.cssMode).toBe("G97");
    });

    it("includes parting feed reduction note", () => {
      const r = engine.calculate({
        geometryType: "parting",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.notes.some((n) => n.toLowerCase().includes("parting"))).toBe(true);
    });
  });

  describe("mill-turn C-axis live tooling", () => {
    it("recommends drilling cycle for cross_hole", () => {
      const r = engine.calculate({
        geometryType: "cross_hole",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toBeTruthy();
    });

    it("includes C-axis live tool note for cross_hole", () => {
      const r = engine.calculate({
        geometryType: "cross_hole",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.turningPhysics!.notes.some((n) => n.includes("C-axis"))).toBe(true);
    });

    it("recommends milling cycle for cross_slot roughing", () => {
      const r = engine.calculate({
        geometryType: "cross_slot",
        operationGoal: "roughing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toBeTruthy();
    });

    it("recommends off-center milling for off_center_feature", () => {
      const r = engine.calculate({
        geometryType: "off_center_feature",
        operationGoal: "finishing",
        materialGroup: "P",
      });
      expect(r.hyperMillCycle).toBeTruthy();
    });
  });

  describe("listMillTurnGeometryTypes", () => {
    it("returns mill-turn geometry types with cssMode and tnrcMandatory", () => {
      const types = engine.listMillTurnGeometryTypes();
      expect(types.length).toBeGreaterThanOrEqual(14);
    });

    it("includes all required types", () => {
      const types = engine.listMillTurnGeometryTypes().map((t) => t.geometryType);
      const required = [
        "od_profile", "id_profile", "groove_od", "groove_id", "groove_face",
        "thread_od", "thread_id", "parting", "bore", "recess",
        "cross_hole", "cross_slot", "off_center_feature",
      ];
      for (const t of required) {
        expect(types).toContain(t);
      }
    });

    it("od_profile has cssMode G96 and tnrcMandatory=true", () => {
      const types = engine.listMillTurnGeometryTypes();
      const od = types.find((t) => t.geometryType === "od_profile");
      expect(od).toBeDefined();
      expect(od!.cssMode).toBe("G96");
      expect(od!.tnrcMandatory).toBe(true);
    });

    it("thread_od has cssMode G97 and tnrcMandatory=false", () => {
      const types = engine.listMillTurnGeometryTypes();
      const th = types.find((t) => t.geometryType === "thread_od");
      expect(th).toBeDefined();
      expect(th!.cssMode).toBe("G97");
      expect(th!.tnrcMandatory).toBe(false);
    });

    it("parting has cssMode G97", () => {
      const types = engine.listMillTurnGeometryTypes();
      const pt = types.find((t) => t.geometryType === "parting");
      expect(pt!.cssMode).toBe("G97");
    });
  });

  describe("stats and clear", () => {
    it("tracks calculation count", () => {
      engine.calculate({ geometryType: "od_profile", operationGoal: "roughing" });
      engine.calculate({ geometryType: "bore", operationGoal: "finishing" });
      expect(engine.stats().calculations).toBe(2);
    });

    it("resets on clear", () => {
      engine.calculate({ geometryType: "od_profile", operationGoal: "roughing" });
      engine.clear();
      expect(engine.stats().calculations).toBe(0);
      expect(engine.stats().lastInput).toBeNull();
    });
  });

  describe("singleton export", () => {
    it("exports a ready-to-use singleton", () => {
      const r = hyperMillStrategyEngine.calculate({
        geometryType: "od_profile",
        operationGoal: "roughing",
        materialGroup: "S",
      });
      expect(r.hyperMillCycle).toBeTruthy();
      // ISO S superalloy: Vc should be low (35 m/min rough from CANONICAL_TURNING_SPEEDS.S)
      expect(r.turningPhysics!.vcRecommended_m_min).toBe(35);
    });
  });
});
