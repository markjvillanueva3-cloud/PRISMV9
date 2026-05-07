/**
 * E2E test for ENGINE-WIRE-CAM-MS0/U-WIRE-CAM-BATCH1 — 6 unwired CAM engines
 * wired into camDispatcher (prism_cam).
 */
import { describe, it, expect } from "vitest";
import { CAMRecommendEngine } from "../engines/CAMRecommendEngine.js";
import { HSMDwellAtCornerEngine } from "../engines/HSMDwellAtCornerEngine.js";

const TOOL_DIA_MM = 12;
const FZ_MM = 0.1;
const RPM = 8000;
const NEW_CAM_ACTION_COUNT = 6;
const HSM_FEED_RATE_MM_MIN = 5000;
const SERVO_MAX_ACCEL_MM_S2 = 5000;
const SERVO_MAX_JERK_MM_S3 = 50000;
const SERVO_LAG_MS = 10;
const LOOK_AHEAD_BLOCKS = 200;

describe("U-WIRE-CAM-BATCH1 — engines verified directly", () => {
  describe("CAMRecommendEngine.recommend", () => {
    it("produces strategy recommendations for pocket feature", () => {
      const recs = CAMRecommendEngine.recommend({
        material: "AISI 4140",
        xSize: 100,
        ySize: 80,
        zSize: 25,
        features: ["pocket"],
        quantity: 10,
      });
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
      const pocketStrategy = recs.find((r) =>
        r.strategy.includes("pocket") || r.strategy.includes("adaptive"),
      );
      expect(pocketStrategy?.strategy.length ?? 0).toBeGreaterThan(0);
    });

    it("produces hole-drilling recommendation for hole feature", () => {
      const recs = CAMRecommendEngine.recommend({
        material: "Aluminum 6061",
        xSize: 50,
        ySize: 50,
        zSize: 20,
        features: ["hole"],
        quantity: 1,
      });
      expect(recs.length).toBeGreaterThan(0);
      const drilling = recs.find((r) => r.operationType === "drilling");
      expect(drilling?.operationType).toBe("drilling");
      expect(drilling?.confidence).toBeGreaterThan(0);
    });
  });

  describe("HSMDwellAtCornerEngine.analyzeDwell", () => {
    it("returns physics-trace dwell analysis for a 90° corner", () => {
      const result = HSMDwellAtCornerEngine.analyzeDwell(
        {
          angle_deg: 90,
          approach_vector: { x: 1, y: 0 },
          exit_vector: { x: 0, y: 1 },
          programmed_radius_mm: 0.5,
          tolerance_mm: 0.01,
        },
        {
          max_acceleration_mm_s2: SERVO_MAX_ACCEL_MM_S2,
          max_jerk_mm_s3: SERVO_MAX_JERK_MM_S3,
          look_ahead_blocks: LOOK_AHEAD_BLOCKS,
        },
        {
          programmed_feed_mm_min: HSM_FEED_RATE_MM_MIN,
          hsm_mode: "g05p2",
          tolerance_mm: 0.01,
        },
      );
      expect(typeof result.recommended_dwell_ms).toBe("number");
      expect(Number.isFinite(result.recommended_dwell_ms)).toBe(true);
      expect(result.recommended_dwell_ms).toBeGreaterThanOrEqual(0);
      expect(result.actual_corner_radius_mm).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.physics_trace.formulas_used)).toBe(true);
      expect(result.physics_trace.formulas_used.length).toBeGreaterThan(0);
    });
  });
});

describe("U-WIRE-CAM-BATCH1 — dispatcher wiring verified", () => {
  const NEW_ACTIONS = [
    "cam_recommend",
    "cam_strategy_optimal_select",
    "cam_toolpath_force_profile",
    "cam_toolpath_segment_optimize",
    "cam_toolpath_strategy_route",
    "cam_hsm_dwell_at_corner",
  ] as const;

  it("registers all 6 new actions in camDispatcher ACTIONS", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    const present = NEW_ACTIONS.filter((a) =>
      (mod.ACTIONS as readonly string[]).includes(a),
    );
    expect(present.length).toBe(NEW_CAM_ACTION_COUNT);
  });

  it("registers all 6 schemas in ACTION_CAM_SCHEMAS", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof ACTION_CAM_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(NEW_CAM_ACTION_COUNT);
  });

  it("schema accepts valid cam_recommend payload", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["cam_recommend"]!.safeParse({
      analysis: {
        material: "steel",
        xSize: 100,
        ySize: 50,
        zSize: 25,
        features: ["pocket"],
        quantity: 1,
      },
      machineType: "mill",
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects cam_recommend with no analysis", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["cam_recommend"]!.safeParse({});
    expect(r.success).toBe(false);
  });

  it("schema rejects cam_toolpath_force_profile with empty segments", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["cam_toolpath_force_profile"]!.safeParse({ segments: [] });
    expect(r.success).toBe(false);
  });

  it("schema accepts cam_toolpath_strategy_route with optional fields", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["cam_toolpath_strategy_route"]!.safeParse({
      material: "AISI 4140",
      operation: "roughing",
      priority: "speed",
    });
    expect(r.success).toBe(true);
  });

  it("schema rejects cam_toolpath_strategy_route with invalid priority enum", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["cam_toolpath_strategy_route"]!.safeParse({
      priority: "yolo_invalid",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects cam_hsm_dwell_at_corner missing servo", async () => {
    const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
    const r = ACTION_CAM_SCHEMAS["cam_hsm_dwell_at_corner"]!.safeParse({
      corner: {},
      hsm: {},
    });
    expect(r.success).toBe(false);
  });
});
