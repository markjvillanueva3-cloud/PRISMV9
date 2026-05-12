/**
 * Smoke test for engine test harness.
 * Verifies the harness is importable and fixtures are well-formed.
 *
 * @milestone SYS-MS2-U00
 */

import { describe, it, expect } from "vitest";
import {
  STEEL_1045, ALUMINUM_6061, TITANIUM_6AL4V,
  STAINLESS_316L, CAST_IRON_GG25, HARDENED_D2,
  MATERIAL_FIXTURES,
  makeCuttingConditions, makeFinishingConditions, makeExtremeConditions,
  makeCoolantSystem, makeMQLSystem, makeDrySystem, makeCoolantOperationParams,
  makeSpeedFeedInput, makeChuckForceInput,
  CARBIDE_ENDMILL_50MM, HSS_DRILL_10MM, CBN_INSERT,
  CNC_3AXIS_VERTICAL, CNC_5AXIS, CNC_LATHE,
  JC_AISI_1045, JC_TI6AL4V,
  expectApprox, expectShape, expectPhysicalValue, expectSafetyResult,
  forEachMaterial,
} from "./helpers/engineTestHarness.js";

describe("Engine Test Harness — Smoke Tests", () => {
  describe("Material Fixtures", () => {
    it("has all 6 ISO groups", () => {
      expect(Object.keys(MATERIAL_FIXTURES)).toEqual(["P", "N", "S", "M", "K", "H"]);
    });

    forEachMaterial((material, group) => {
      expect(material.iso_group).toBe(group);
      expect(material.hardness_hb).toBeGreaterThan(0);
      expect(material.kienzle.kc1_1).toBeGreaterThan(0);
      expect(material.taylor.C).toBeGreaterThan(0);
      expect(material.taylor.n).toBeGreaterThan(0);
      expect(material.taylor.n).toBeLessThan(1);
    });
  });

  describe("Cutting Condition Factories", () => {
    it("produces valid roughing conditions", () => {
      const cond = makeCuttingConditions();
      expectShape(cond, ["cutting_speed", "feed_per_tooth", "axial_depth", "radial_depth", "tool_diameter", "number_of_teeth"]);
      expectPhysicalValue(cond.cutting_speed, "cutting_speed", 1, 2000);
      expectPhysicalValue(cond.feed_per_tooth, "feed_per_tooth", 0.001, 2);
    });

    it("allows overrides", () => {
      const cond = makeCuttingConditions({ cutting_speed: 500 });
      expect(cond.cutting_speed).toBe(500);
      expect(cond.feed_per_tooth).toBe(0.15); // default preserved
    });

    it("finishing conditions have lighter cuts", () => {
      const rough = makeCuttingConditions();
      const finish = makeFinishingConditions();
      expect(finish.axial_depth).toBeLessThan(rough.axial_depth);
      expect(finish.feed_per_tooth).toBeLessThan(rough.feed_per_tooth);
    });

    it("extreme conditions push limits", () => {
      const extreme = makeExtremeConditions();
      expect(extreme.cutting_speed).toBeGreaterThan(1000);
      expect(extreme.feed_per_tooth).toBeGreaterThan(1.0);
    });
  });

  describe("Coolant Fixtures", () => {
    it("flood system has reasonable flow", () => {
      const sys = makeCoolantSystem();
      expect(sys.delivery).toBe("FLOOD");
      expectPhysicalValue(sys.flowRate, "flowRate", 1, 200);
    });

    it("MQL system has minimal flow", () => {
      const mql = makeMQLSystem();
      expect(mql.delivery).toBe("MQL");
      expect(mql.flowRate).toBeLessThan(1);
    });

    it("dry system has zero flow", () => {
      const dry = makeDrySystem();
      expect(dry.delivery).toBe("DRY");
      expect(dry.flowRate).toBe(0);
    });
  });

  describe("Tool Fixtures", () => {
    it("carbide endmill has correct properties", () => {
      expect(CARBIDE_ENDMILL_50MM.material).toBe("Carbide");
      expect(CARBIDE_ENDMILL_50MM.diameter).toBe(50);
      expect(CARBIDE_ENDMILL_50MM.number_of_teeth).toBe(4);
    });

    it("HSS drill has correct properties", () => {
      expect(HSS_DRILL_10MM.material).toBe("HSS");
      expect(HSS_DRILL_10MM.diameter).toBe(10);
    });
  });

  describe("Machine Fixtures", () => {
    it("3-axis has 3 axes", () => {
      expect(CNC_3AXIS_VERTICAL.axes).toBe(3);
    });

    it("5-axis has rotary axes", () => {
      expect(CNC_5AXIS.axes).toBe(5);
      expect(CNC_5AXIS.work_envelope.a).toBeDefined();
      expect(CNC_5AXIS.work_envelope.c).toBeDefined();
    });

    it("lathe is turning type", () => {
      expect(CNC_LATHE.type).toBe("turning");
    });
  });

  describe("Assertion Helpers", () => {
    it("expectApprox passes within tolerance", () => {
      expectApprox(105, 100, 10); // 5% off within 10% tolerance
    });

    it("expectPhysicalValue validates bounds", () => {
      expectPhysicalValue(42, "test", 0, 100);
    });

    it("expectShape validates object structure", () => {
      expectShape({ a: 1, b: "x", c: true }, ["a", "b", "c"]);
    });

    it("expectSafetyResult validates safety structure", () => {
      expectSafetyResult({
        is_safe: true,
        safety_factor: 2.5,
        warnings: [],
        recommendations: ["use flood coolant"],
      });
    });
  });

  describe("Johnson-Cook Fixtures", () => {
    it("AISI 1045 has valid J-C coefficients", () => {
      expect(JC_AISI_1045.A).toBeGreaterThan(0);
      expect(JC_AISI_1045.T_melt).toBeGreaterThan(JC_AISI_1045.T_ref);
    });

    it("Ti-6Al-4V has higher yield than 1045", () => {
      expect(JC_TI6AL4V.A).toBeGreaterThan(JC_AISI_1045.A);
    });
  });
});
