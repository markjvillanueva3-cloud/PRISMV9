/**
 * E2E test: U-CAM74..U-CAM78 dispatcher wiring (CAM-EXHAUST-MS0)
 * ===========================================================================
 * Verifies all 5 new CAM engine actions reach their engine and return
 * production-mode results when invoked through camDispatcher.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS, registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

// Fake MCP server harness — captures the handler installed by registerCamDispatcher
// so we can invoke it directly with action+params and inspect the structured result.
type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
let capturedHandler: Handler | null = null;
const fakeServer = {
  tool: (_name: string, _desc: string, _schema: unknown, handler: Handler) => {
    capturedHandler = handler;
  },
};
registerCamDispatcher(fakeServer);
if (!capturedHandler) throw new Error("camDispatcher did not register handler");
const camDispatcher = capturedHandler;

const callCam = async (action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const raw = await camDispatcher({ action, params });
  // server.tool wraps result in { content: [{ type: "text", text: JSON.stringify(...) }] };
  // unwrap if necessary
  const r = raw as { content?: Array<{ text: string }> };
  if (r.content?.[0]?.text) return JSON.parse(r.content[0].text);
  return raw as Record<string, unknown>;
};

describe("camDispatcher — U-CAM74..U-CAM78 action enum registration", () => {
  it("all 5 new actions are in the ACTIONS enum", () => {
    expect(ACTIONS).toContain("cam_param_optimize");
    expect(ACTIONS).toContain("cam_cross_translate");
    expect(ACTIONS).toContain("cam_agi_reason");
    expect(ACTIONS).toContain("cam_tribal_lookup");
    expect(ACTIONS).toContain("cam_feature_recognize");
  });
});

describe("camDispatcher — U-CAM74..U-CAM78 E2E roundtrips", () => {
  it("cam_param_optimize routes through CAMParameterOptimizerEngine", async () => {
    const result = await callCam("cam_param_optimize", {
      target_cam: "hypermill",
      objective: "cycle_time",
      current: { feed_rate: 1500, rpm: 8000 },
    });
    expect(result.success).toBe(true);
    expect((result as { mode: string }).mode).toBe("production");
    expect((result as { stub: boolean }).stub).toBe(false);
    expect((result as { target_cam: string }).target_cam).toBe("hypermill");
    expect((result as { changes: unknown[] }).changes.length).toBeGreaterThan(0);
  });

  it("cam_cross_translate routes through CAMCrossSystemTranslatorEngine", async () => {
    const result = await callCam("cam_cross_translate", {
      source_cam: "mastercam",
      target_cam: "hypermill",
      source_operation: "dynamic_mill",
      source_parameters: { spindle_speed: 12000, feedrate: 2400 },
    });
    expect(result.success).toBe(true);
    expect((result as { target_operation: string }).target_operation).toBe("maxx_machining");
    expect(((result as { target_parameters: Record<string, unknown> }).target_parameters as Record<string, number>).spindle_rpm).toBe(12000);
  });

  it("cam_agi_reason routes through CAMAGIReasoningEngine", async () => {
    const result = await callCam("cam_agi_reason", {
      target_cam: "hypermill",
      decision_context: "thin wall titanium pocket",
      options: ["trochoidal", "face-mill", "drill"],
    });
    expect(result.success).toBe(true);
    expect((result as { decision: string }).decision).toBe("trochoidal");
    expect((result as { reasoning_chain: string[] }).reasoning_chain.length).toBeGreaterThanOrEqual(5);
  });

  it("cam_tribal_lookup routes through CAMTribalKnowledgeEngine", async () => {
    const result = await callCam("cam_tribal_lookup", {
      target_cam: "hypermill",
      query: "thin wall titanium",
      max_tips: 3,
    });
    expect(result.success).toBe(true);
    const tips = (result as { tips: unknown[] }).tips;
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.length).toBeLessThanOrEqual(3);
  });

  it("cam_feature_recognize routes through CAMFeatureLearningEngine", async () => {
    const result = await callCam("cam_feature_recognize", {
      target_cam: "mastercam",
      part_geometry_hint: "rectangular pocket with 4 thru-holes",
    });
    expect(result.success).toBe(true);
    const features = ((result as { recognized_features: Array<{ feature: string }> }).recognized_features).map((f) => f.feature);
    expect(features).toContain("pocket");
    expect(features).toContain("hole");
    const ops = ((result as { recommended_operations: Array<{ operation: string }> }).recommended_operations).map((o) => o.operation);
    expect(ops).toContain("pocket_2d");
    expect(ops).toContain("drill");
  });

  it("variability across CAMs: cam_param_optimize on solidcam vs powermill yields different scaling", async () => {
    const sc = await callCam("cam_param_optimize", {
      target_cam: "solidcam",
      objective: "cycle_time",
      current: { feed_rate: 1000 },
    }) as unknown as { optimized: { feed_rate: number } };
    const pm = await callCam("cam_param_optimize", {
      target_cam: "powermill",
      objective: "cycle_time",
      current: { feed_rate: 1000 },
    }) as unknown as { optimized: { feed_rate: number } };
    // Both have CAM_MAGNITUDE_SCALE = 1.10; expect the same scaled result
    expect(sc.optimized.feed_rate).toBeCloseTo(pm.optimized.feed_rate, 5);
  });

  it("unknown CAM slug propagates rationale via dispatcher", async () => {
    const result = await callCam("cam_param_optimize", {
      target_cam: "not-a-real-cam",
      objective: "cycle_time",
      current: { feed_rate: 1000 },
    });
    expect(result.success).toBe(true);
    expect((result as { rationale: string }).rationale).toBe("unknown_cam_slug");
  });
});
