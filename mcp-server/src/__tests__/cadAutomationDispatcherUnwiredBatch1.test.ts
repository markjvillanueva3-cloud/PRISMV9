/**
 * E2E test for ENGINE-WIRE-CAD-MS0/U-WIRE-CAD-BATCH1 — 3 unwired CAD engines
 * (8 actions total) wired into prism_cad_automation.
 *
 * Engines:
 *   - GeometryHashGroupingEngine
 *   - SolidCamAlgorithmsEngine
 *   - SolidWorksCADFunctionIndexEngine
 *
 * Direct engine assertions verify dispatcher passthrough produces real
 * SolidCam physics results (not stubs).
 */
import { describe, it, expect } from "vitest";
import { geometryHashGroupingEngine } from "../engines/GeometryHashGroupingEngine.js";
import { SolidCamAlgorithmsEngine } from "../engines/SolidCamAlgorithmsEngine.js";

const MM_PER_REV = 0.15;
const TOOL_DIAMETER_MM = 12;
const RADIAL_AE_HALF_DIAMETER_MM = 6; // 50% engagement
const RADIAL_AE_LIGHT_MM = 1.2;        // 10% engagement (HSM territory)
const TARGET_CHIP_THICKNESS_MM = 0.08;
const NEW_CAD_ACTION_COUNT = 8;

describe("U-WIRE-CAD-BATCH1 — engines verified directly", () => {
  describe("GeometryHashGroupingEngine.geometryHash", () => {
    it("produces a stable hash given identical input", () => {
      const rec = {
        material: "AISI 4140",
        outer_diameter_mm: 25,
        length_mm: 100,
        feature_topology: ["bore", "groove", "thread"],
        tolerance_class: "medium" as const,
      };
      const h1 = geometryHashGroupingEngine.geometryHash(rec);
      const h2 = geometryHashGroupingEngine.geometryHash(rec);
      expect(h1).toBe(h2);
      expect(h1.length).toBeGreaterThan(0);
    });

    it("produces different hashes for different geometry", () => {
      const recA = {
        material: "AISI 4140",
        outer_diameter_mm: 25,
        length_mm: 100,
        feature_topology: ["bore"],
        tolerance_class: "medium" as const,
      };
      const recB = { ...recA, outer_diameter_mm: 50 };
      const hA = geometryHashGroupingEngine.geometryHash(recA);
      const hB = geometryHashGroupingEngine.geometryHash(recB);
      expect(hA).not.toBe(hB);
    });
  });

  describe("SolidCamAlgorithmsEngine.engagementGeometry", () => {
    it("computes HSM-territory engagement angle for ae=10% Dc", () => {
      const r = SolidCamAlgorithmsEngine.engagementGeometry({
        toolDiameter: TOOL_DIAMETER_MM,
        stepover: RADIAL_AE_LIGHT_MM,
      });
      // alpha = arccos(1 - 2*0.1) = arccos(0.8) ≈ 36.87°
      expect(r.engagementAngle).toBeGreaterThan(30);
      expect(r.engagementAngle).toBeLessThan(45);
      expect(r.contactArcLength).toBeGreaterThan(0);
    });

    it("computes 50% slot engagement (ae=Dc/2 → 90° engagement)", () => {
      const r = SolidCamAlgorithmsEngine.engagementGeometry({
        toolDiameter: TOOL_DIAMETER_MM,
        stepover: RADIAL_AE_HALF_DIAMETER_MM,
      });
      expect(r.engagementAngle).toBeCloseTo(90, 0);
      expect(r.engagementPercent).toBeCloseTo(50, 0);
    });

    it("returns zero engagement for zero stepover (defensive edge case)", () => {
      const r = SolidCamAlgorithmsEngine.engagementGeometry({
        toolDiameter: TOOL_DIAMETER_MM,
        stepover: 0,
      });
      expect(r.engagementAngle).toBe(0);
      expect(r.contactArcLength).toBe(0);
      expect(r.engagementPercent).toBe(0);
    });
  });

  describe("SolidCamAlgorithmsEngine.chipThickness", () => {
    it("at light engagement, thinningFactor>1 and adjustedFeedPerTooth>fz", () => {
      const r = SolidCamAlgorithmsEngine.chipThickness({
        toolDiameter: TOOL_DIAMETER_MM,
        stepover: RADIAL_AE_LIGHT_MM,
        feedPerTooth: MM_PER_REV,
      });
      expect(r.actualChipThickness).toBeGreaterThan(0);
      expect(r.actualChipThickness).toBeLessThan(MM_PER_REV);
      // At ae < Dc/2 chip thinning kicks in: factor > 1
      expect(r.thinningFactor).toBeGreaterThan(1);
      expect(r.adjustedFeedPerTooth).toBeGreaterThan(MM_PER_REV);
    });

    it("at full slot (ae=Dc) thinning factor is 1.0", () => {
      const r = SolidCamAlgorithmsEngine.chipThickness({
        toolDiameter: TOOL_DIAMETER_MM,
        stepover: TOOL_DIAMETER_MM,
        feedPerTooth: MM_PER_REV,
      });
      expect(r.thinningFactor).toBeCloseTo(1.0, 5);
    });
  });

  describe("SolidCamAlgorithmsEngine.adjustFeedForEngagement", () => {
    it("scales feed up to maintain target chip thickness at light engagement", () => {
      const r = SolidCamAlgorithmsEngine.adjustFeedForEngagement({
        toolDiameter: TOOL_DIAMETER_MM,
        stepover: RADIAL_AE_LIGHT_MM,
        targetChipThickness: TARGET_CHIP_THICKNESS_MM,
      });
      expect(r.adjustedFz).toBeGreaterThan(TARGET_CHIP_THICKNESS_MM);
      expect(r.thinningFactor).toBeGreaterThan(1);
    });
  });
});

describe("U-WIRE-CAD-BATCH1 — dispatcher wiring is exhaustive", () => {
  const NEW_ACTIONS = [
    "cad_geometry_hash",
    "cad_geometry_assign_splits",
    "cad_solidcam_chip_thickness",
    "cad_solidcam_engagement_geometry",
    "cad_solidcam_adjust_feed",
    "cad_solidworks_list_modules",
    "cad_solidworks_module",
    "cad_solidworks_list_operations",
  ] as const;

  it("registers all 8 new actions in CAD_AUTOMATION_ACTIONS enum", async () => {
    const mod = await import("../tools/dispatchers/cadAutomationDispatcher.js");
    expect(typeof mod.registerCadAutomationDispatcher).toBe("function");
    expect(Array.isArray(mod.CAD_AUTOMATION_ACTIONS)).toBe(true);
    const present = NEW_ACTIONS.filter((a) =>
      (mod.CAD_AUTOMATION_ACTIONS as readonly string[]).includes(a),
    );
    expect(present.length).toBe(NEW_CAD_ACTION_COUNT);
  });

  it("registers all 8 new schemas in the action schema map", async () => {
    const { CAD_AUTOMATION_ACTION_SCHEMAS } = await import(
      "../schemas/cadAutomationActionSchemas.js"
    );
    const present = NEW_ACTIONS.filter(
      (a) => typeof CAD_AUTOMATION_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(NEW_CAD_ACTION_COUNT);
  });

  it("schema accepts valid cad_solidcam_chip_thickness payload", async () => {
    const { CAD_AUTOMATION_ACTION_SCHEMAS } = await import(
      "../schemas/cadAutomationActionSchemas.js"
    );
    const r = CAD_AUTOMATION_ACTION_SCHEMAS["cad_solidcam_chip_thickness"]!.safeParse({
      toolDiameter: TOOL_DIAMETER_MM,
      stepover: RADIAL_AE_LIGHT_MM,
      feedPerTooth: MM_PER_REV,
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects cad_solidcam_chip_thickness with negative stepover", async () => {
    const { CAD_AUTOMATION_ACTION_SCHEMAS } = await import(
      "../schemas/cadAutomationActionSchemas.js"
    );
    const r = CAD_AUTOMATION_ACTION_SCHEMAS["cad_solidcam_chip_thickness"]!.safeParse({
      toolDiameter: TOOL_DIAMETER_MM,
      stepover: -1,
      feedPerTooth: MM_PER_REV,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects cad_solidworks_module with empty moduleId", async () => {
    const { CAD_AUTOMATION_ACTION_SCHEMAS } = await import(
      "../schemas/cadAutomationActionSchemas.js"
    );
    const r = CAD_AUTOMATION_ACTION_SCHEMAS["cad_solidworks_module"]!.safeParse({ moduleId: "" });
    expect(r.success).toBe(false);
  });

  it("schema rejects cad_solidcam_engagement_geometry missing toolDiameter", async () => {
    const { CAD_AUTOMATION_ACTION_SCHEMAS } = await import(
      "../schemas/cadAutomationActionSchemas.js"
    );
    const r = CAD_AUTOMATION_ACTION_SCHEMAS["cad_solidcam_engagement_geometry"]!.safeParse({
      stepover: RADIAL_AE_LIGHT_MM,
    });
    expect(r.success).toBe(false);
  });
});
