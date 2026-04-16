/**
 * HM-KC-MS2 U-HKC13: Stock Model + WCS/Datum Parameter Schema Tests
 *
 * Validates all stock creation and WCS/datum schemas for correct parameter
 * counts, defaults, ranges, enum values, and AC Python setter namespaces.
 */

import { describe, it, expect } from "vitest";
import {
  stockBoundingBoxSchema,
  stockOffsetSolidSchema,
  stockFromBodySchema,
  stockCylinderSchema,
  STOCK_MODEL_SCHEMA_MAP,
  STOCK_MODEL_METADATA,
  STOCK_MODEL_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/fixture/stockModelSchemas.js";
import {
  wcsFrameAssignmentSchema,
  datumTransferSchema,
  probeVerificationSchema,
  multiSetupCoordinationSchema,
  WCS_SCHEMA_MAP,
  WCS_METADATA,
  WCS_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/fixture/wcsSchemas.js";

// =============================================================================
// Stock Model Schemas
// =============================================================================

describe("Stock Model Schemas", () => {
  describe("schema map completeness", () => {
    it("contains exactly 4 stock types", () => {
      const keys = Object.keys(STOCK_MODEL_SCHEMA_MAP);
      expect(keys).toHaveLength(4);
      expect(keys).toContain("bounding_box");
      expect(keys).toContain("offset_solid");
      expect(keys).toContain("from_body");
      expect(keys).toContain("cylinder");
    });

    it("has 18 total parameters across all stock schemas", () => {
      expect(STOCK_MODEL_TOTAL_PARAM_COUNT).toBe(18);
    });
  });

  describe("stockBoundingBoxSchema", () => {
    it("applies correct offset defaults (5, 5, 2)", () => {
      const result = stockBoundingBoxSchema.parse({});
      expect(result.offset_x).toBe(5);
      expect(result.offset_y).toBe(5);
      expect(result.offset_z).toBe(2);
    });

    it("defaults round_to_increment to 1.0", () => {
      const result = stockBoundingBoxSchema.parse({});
      expect(result.round_to_increment).toBe(1.0);
    });

    it("defaults material to aluminum_6061", () => {
      const result = stockBoundingBoxSchema.parse({});
      expect(result.material).toBe("aluminum_6061");
    });

    it("rejects offset_x above 100", () => {
      expect(() =>
        stockBoundingBoxSchema.parse({ offset_x: 101 })
      ).toThrow();
    });
  });

  describe("stockOffsetSolidSchema", () => {
    it("defaults uniform_offset to 2.0", () => {
      const result = stockOffsetSolidSchema.parse({});
      expect(result.uniform_offset).toBe(2.0);
    });

    it("defaults simplify_result to true", () => {
      const result = stockOffsetSolidSchema.parse({});
      expect(result.simplify_result).toBe(true);
    });

    it("defaults keep_sharp_edges to false", () => {
      const result = stockOffsetSolidSchema.parse({});
      expect(result.keep_sharp_edges).toBe(false);
    });

    it("rejects tolerance below 0.001", () => {
      expect(() =>
        stockOffsetSolidSchema.parse({ tolerance: 0.0001 })
      ).toThrow();
    });
  });

  describe("stockFromBodySchema", () => {
    it("requires source_body (no default)", () => {
      expect(() => stockFromBodySchema.parse({})).toThrow();
    });

    it("requires boolean_mode (no default)", () => {
      expect(() =>
        stockFromBodySchema.parse({ source_body: "body_1" })
      ).toThrow();
    });

    it("accepts valid boolean modes", () => {
      const result = stockFromBodySchema.parse({
        source_body: "body_1",
        boolean_mode: "intersect",
      });
      expect(result.boolean_mode).toBe("intersect");
      expect(result.verify_containment).toBe(true);
    });
  });

  describe("stockCylinderSchema", () => {
    it("requires diameter (no default)", () => {
      expect(() =>
        stockCylinderSchema.parse({ length: 100 })
      ).toThrow();
    });

    it("requires length (no default)", () => {
      expect(() =>
        stockCylinderSchema.parse({ diameter: 50 })
      ).toThrow();
    });

    it("defaults center_axis to z", () => {
      const result = stockCylinderSchema.parse({ diameter: 50, length: 100 });
      expect(result.center_axis).toBe("z");
    });

    it("defaults bar_stock_standard to none", () => {
      const result = stockCylinderSchema.parse({ diameter: 50, length: 100 });
      expect(result.bar_stock_standard).toBe("none");
    });

    it("rejects diameter above 5000", () => {
      expect(() =>
        stockCylinderSchema.parse({ diameter: 5001, length: 100 })
      ).toThrow();
    });
  });

  describe("AC Python setter namespaces", () => {
    it("all stock metadata setters start with hm.stock.", () => {
      for (const [key, meta] of Object.entries(STOCK_MODEL_METADATA)) {
        expect(meta.acPythonSetter).toMatch(/^hm\.stock\./);
      }
    });
  });
});

// =============================================================================
// WCS / Datum Schemas
// =============================================================================

describe("WCS / Datum Schemas", () => {
  describe("schema map completeness", () => {
    it("contains exactly 4 WCS types", () => {
      const keys = Object.keys(WCS_SCHEMA_MAP);
      expect(keys).toHaveLength(4);
      expect(keys).toContain("frame_assignment");
      expect(keys).toContain("datum_transfer");
      expect(keys).toContain("probe_verification");
      expect(keys).toContain("multi_setup_coordination");
    });

    it("has 25 total parameters across all WCS schemas", () => {
      expect(WCS_TOTAL_PARAM_COUNT).toBe(25);
    });
  });

  describe("wcsFrameAssignmentSchema", () => {
    it("frame_id enum includes g54 through g59", () => {
      const frames = ["g54", "g55", "g56", "g57", "g58", "g59"];
      for (const frame of frames) {
        const result = wcsFrameAssignmentSchema.parse({
          frame_id: frame,
          origin_x: 0,
          origin_y: 0,
          origin_z: 0,
        });
        expect(result.frame_id).toBe(frame);
      }
    });

    it("frame_id enum includes extended g54p1 through g54p48", () => {
      const result = wcsFrameAssignmentSchema.parse({
        frame_id: "g54p48",
        origin_x: 0,
        origin_y: 0,
        origin_z: 0,
      });
      expect(result.frame_id).toBe("g54p48");
    });

    it("defaults rotation angles to 0", () => {
      const result = wcsFrameAssignmentSchema.parse({
        frame_id: "g54",
        origin_x: 100,
        origin_y: 200,
        origin_z: -50,
      });
      expect(result.rotation_a).toBe(0);
      expect(result.rotation_b).toBe(0);
      expect(result.rotation_c).toBe(0);
    });

    it("defaults active to true", () => {
      const result = wcsFrameAssignmentSchema.parse({
        frame_id: "g54",
        origin_x: 0,
        origin_y: 0,
        origin_z: 0,
      });
      expect(result.active).toBe(true);
    });

    it("label is optional", () => {
      const result = wcsFrameAssignmentSchema.parse({
        frame_id: "g54",
        origin_x: 0,
        origin_y: 0,
        origin_z: 0,
      });
      expect(result.label).toBeUndefined();
    });

    it("accepts label when provided", () => {
      const result = wcsFrameAssignmentSchema.parse({
        frame_id: "g55",
        origin_x: 0,
        origin_y: 0,
        origin_z: 0,
        label: "OP1 TOP",
      });
      expect(result.label).toBe("OP1 TOP");
    });
  });

  describe("datumTransferSchema", () => {
    it("requires source_frame and target_frame", () => {
      expect(() => datumTransferSchema.parse({})).toThrow();
    });

    it("defaults verify_after_transfer to true", () => {
      const result = datumTransferSchema.parse({
        source_frame: "g54",
        target_frame: "g55",
        transform_type: "translate",
      });
      expect(result.verify_after_transfer).toBe(true);
    });

    it("defaults tolerance to 0.01", () => {
      const result = datumTransferSchema.parse({
        source_frame: "g54",
        target_frame: "g55",
        transform_type: "compound",
      });
      expect(result.tolerance).toBe(0.01);
    });
  });

  describe("probeVerificationSchema", () => {
    it("calibration_sphere_diameter range is 3..50 with default 6.0", () => {
      const result = probeVerificationSchema.parse({
        probe_type: "touch",
      });
      expect(result.calibration_sphere_diameter).toBe(6.0);
    });

    it("rejects calibration_sphere_diameter below 3", () => {
      expect(() =>
        probeVerificationSchema.parse({
          probe_type: "touch",
          calibration_sphere_diameter: 2.5,
        })
      ).toThrow();
    });

    it("rejects calibration_sphere_diameter above 50", () => {
      expect(() =>
        probeVerificationSchema.parse({
          probe_type: "touch",
          calibration_sphere_diameter: 51,
        })
      ).toThrow();
    });

    it("defaults auto_update_wcs to false", () => {
      const result = probeVerificationSchema.parse({
        probe_type: "optical",
      });
      expect(result.auto_update_wcs).toBe(false);
    });

    it("defaults approach_feed to 500", () => {
      const result = probeVerificationSchema.parse({
        probe_type: "laser",
      });
      expect(result.approach_feed).toBe(500);
    });
  });

  describe("multiSetupCoordinationSchema", () => {
    it("defaults setup_count to 1", () => {
      const result = multiSetupCoordinationSchema.parse({
        alignment_method: "3_2_1",
      });
      expect(result.setup_count).toBe(1);
    });

    it("defaults flip_axis to none", () => {
      const result = multiSetupCoordinationSchema.parse({
        alignment_method: "best_fit",
      });
      expect(result.flip_axis).toBe("none");
    });

    it("defaults position_uncertainty to 0.05", () => {
      const result = multiSetupCoordinationSchema.parse({
        alignment_method: "datum_target",
      });
      expect(result.position_uncertainty).toBe(0.05);
    });

    it("reference_feature is optional", () => {
      const result = multiSetupCoordinationSchema.parse({
        alignment_method: "edge_find",
      });
      expect(result.reference_feature).toBeUndefined();
    });
  });

  describe("AC Python setter namespaces", () => {
    it("all WCS metadata setters start with hm.wcs.", () => {
      for (const [key, meta] of Object.entries(WCS_METADATA)) {
        expect(meta.acPythonSetter).toMatch(/^hm\.wcs\./);
      }
    });
  });
});
