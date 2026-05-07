/**
 * Tests for ToolLifeOverlayEngine (U-CAM94)
 *
 * Scope: verify state classification (good/monitor/change_soon/change_now/
 * transition), color mapping, remaining_pct + estimated_remaining_min
 * passthrough, per-plugin payload encoding, session aggregates, and state
 * isolation across sessions. Taylor grounding is upstream; this tests only
 * the presentation layer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ToolLifeOverlayEngine } from "../engines/ToolLifeOverlayEngine.js";
import type {
  OperationPoint,
  PhysicsOverlay,
} from "../engines/PRISMVerificationPluginEngine.js";

const BASE_POINT: OperationPoint = {
  operation_id: "OP-TL-001",
  time_s: 0,
  position: { x: 0, y: 0, z: 0 },
  cutting: {
    spindle_rpm: 8000,
    feed_rate_mmpm: 1600,
    depth_of_cut_mm: 2.0,
    width_of_cut_mm: 4.0,
  },
  tool: {
    tool_id: "T-EM-10",
    diameter_mm: 10,
    flutes: 4,
    material: "carbide",
    overhang_mm: 40,
  },
  material: {
    material_id: "1.2379",
    iso_group: "P",
  },
};

function overlayWithToolLife(
  status: "good" | "monitor" | "change_soon" | "change_now",
  remaining_pct: number,
  estimated_remaining_min: number,
  change_recommended: boolean,
): PhysicsOverlay {
  return {
    force: {
      value: 300,
      unit: "N",
      confidence: 0.85,
      warning_threshold: 500,
      critical_threshold: 1000,
      status: "nominal",
    },
    chatter: {
      stable: true,
      stability_margin: 0.5,
      status: "stable",
    },
    deflection: {
      value: 0.005,
      unit: "mm",
      tolerance_impact: 5,
      status: "nominal",
    },
    temperature: {
      value: 200,
      unit: "°C",
      thermal_damage_risk: 0.1,
      status: "nominal",
    },
    tool_life: {
      remaining_pct,
      estimated_remaining_min,
      change_recommended,
      status,
    },
    safety_score: {
      value: 0.9,
      components: {
        force: 0.9,
        stability: 1.0,
        deflection: 0.95,
        thermal: 0.9,
        tool_life: 0.8,
      },
      verdict: "PASS",
      hard_stop: false,
    },
  };
}

describe("ToolLifeOverlayEngine", () => {
  beforeEach(() => {
    ToolLifeOverlayEngine.resetSession("S1");
    ToolLifeOverlayEngine.resetSession("S2");
  });

  describe("renderFrame — basic structure", () => {
    it("returns a valid frame for good input", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("good", 85, 42.5, false),
      );
      expect(frame.session_id).toBe("S1");
      expect(frame.operation_id).toBe("OP-TL-001");
      expect(frame.tool_id).toBe("T-EM-10");
      expect(frame.remaining_pct).toBeCloseTo(85, 5);
      expect(frame.estimated_remaining_min).toBeCloseTo(42.5, 5);
      expect(frame.change_recommended).toBe(false);
      expect(frame.state).toBe("good");
      expect(frame.color_hex).toBe("#22c55e");
      expect(frame.transition).toBe(false);
    });

    it("echoes the point position into the frame", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, position: { x: 5.5, y: 1.1, z: -2.0 } },
        overlayWithToolLife("good", 90, 45, false),
      );
      expect(frame.position).toEqual({ x: 5.5, y: 1.1, z: -2.0 });
    });

    it("propagates change_recommended flag from upstream", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("change_now", 8, 2.1, true),
      );
      expect(frame.change_recommended).toBe(true);
    });
  });

  describe("state classification", () => {
    it("classifies upstream good as good (green)", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("good", 85, 42, false),
      );
      expect(frame.state).toBe("good");
      expect(frame.color_hex).toBe("#22c55e");
    });

    it("classifies upstream monitor as monitor (yellow)", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("monitor", 55, 25, false),
      );
      expect(frame.state).toBe("monitor");
      expect(frame.color_hex).toBe("#eab308");
    });

    it("classifies upstream change_soon as change_soon (orange)", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("change_soon", 22, 10, false),
      );
      expect(frame.state).toBe("change_soon");
      expect(frame.color_hex).toBe("#f97316");
    });

    it("classifies upstream change_now as change_now (red)", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("change_now", 5, 1.5, true),
      );
      expect(frame.state).toBe("change_now");
      expect(frame.color_hex).toBe("#dc2626");
    });

    it("accepts the full remaining_pct range [0,100]", () => {
      const empty = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("change_now", 0, 0, true),
      );
      ToolLifeOverlayEngine.resetSession("S1");
      const full = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("good", 100, 60, false),
      );
      expect(empty.remaining_pct).toBe(0);
      expect(full.remaining_pct).toBe(100);
    });
  });

  describe("transition detection", () => {
    it("does not flag the first frame as a transition", () => {
      const frame = ToolLifeOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithToolLife("good", 85, 42, false),
      );
      expect(frame.transition).toBe(false);
    });

    it("flags a good → change_now transition with magenta override", () => {
      ToolLifeOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithToolLife("good", 85, 42, false),
      );
      const flip = ToolLifeOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.5 },
        overlayWithToolLife("change_now", 5, 1.5, true),
      );
      expect(flip.transition).toBe(true);
      expect(flip.state).toBe("transition");
      expect(flip.color_hex).toBe("#d946ef");
    });

    it("does not re-flag transition when state holds steady", () => {
      const f1 = ToolLifeOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithToolLife("monitor", 55, 25, false),
      );
      const f2 = ToolLifeOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.1 },
        overlayWithToolLife("monitor", 52, 24, false),
      );
      expect(f1.transition).toBe(false);
      expect(f2.transition).toBe(false);
      expect(f2.state).toBe("monitor");
    });

    it("flips the transition flag on each classification change", () => {
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("good", 90, 45, false));
      const f1 = ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("monitor", 55, 25, false));
      const f2 = ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("monitor", 52, 24, false));
      const f3 = ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_soon", 22, 10, false));
      const f4 = ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_now", 5, 1.5, true));
      expect(f1.transition).toBe(true);
      expect(f2.transition).toBe(false);
      expect(f3.transition).toBe(true);
      expect(f4.transition).toBe(true);
    });
  });

  describe("plugin target encoding", () => {
    const point: OperationPoint = {
      ...BASE_POINT,
      operation_id: "OP-TL-X",
      tool: { ...BASE_POINT.tool, tool_id: "T-BN-06" },
    };
    const overlay = overlayWithToolLife("change_now", 7.5, 2.25, true);

    it("encodes hyperMILL XML-RPC frame", () => {
      const frame = ToolLifeOverlayEngine.renderFrame("S1", point, overlay, "hypermill");
      expect(frame.target).toBe("hypermill");
      expect(frame.payload).toContain("<methodCall>");
      expect(frame.payload).toContain("PRISM.ToolLifeOverlay");
      expect(frame.payload).toContain("OP-TL-X");
      expect(frame.payload).toContain("T-BN-06");
      expect(frame.payload).toContain("7.5");
      expect(frame.payload).toContain("2.25");
      expect(frame.payload).toContain("change_now");
    });

    it("encodes Fusion 360 JSON-RPC frame", () => {
      const frame = ToolLifeOverlayEngine.renderFrame("S1", point, overlay, "fusion360");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("cam.toolLifeOverlay");
      expect(parsed.params.operationId).toBe("OP-TL-X");
      expect(parsed.params.toolId).toBe("T-BN-06");
      expect(parsed.params.remainingPct).toBeCloseTo(7.5, 5);
      expect(parsed.params.estimatedRemainingMin).toBeCloseTo(2.25, 5);
      expect(parsed.params.changeRecommended).toBe(true);
      expect(parsed.params.state).toBe("change_now");
    });

    it("encodes Inventor HSM JSON frame", () => {
      const frame = ToolLifeOverlayEngine.renderFrame("S1", point, overlay, "inventor_hsm");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("hsm.toolLifeOverlay");
      expect(parsed.operationId).toBe("OP-TL-X");
      expect(parsed.toolId).toBe("T-BN-06");
      expect(parsed.remainingPct).toBeCloseTo(7.5, 5);
      expect(parsed.changeRecommended).toBe(true);
    });

    it("encodes Mastercam NET-Hook pipe record", () => {
      const frame = ToolLifeOverlayEngine.renderFrame("S1", point, overlay, "mastercam");
      expect(frame.payload.startsWith("TOOLLIFE|OP-TL-X|T-BN-06|")).toBe(true);
      const fields = frame.payload.split("|");
      expect(fields).toHaveLength(9);
      expect(fields[3]).toBe("7.5");
      expect(fields[4]).toBe("2.25");
      expect(fields[5]).toBe("change_now");
      expect(fields[6]).toBe("#dc2626");
      expect(fields[7]).toBe("1");
    });

    it("defaults to generic JSON when target omitted", () => {
      const frame = ToolLifeOverlayEngine.renderFrame("S1", point, overlay);
      expect(frame.target).toBe("generic");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("tool_life_overlay");
      expect(parsed.remaining_pct).toBeCloseTo(7.5, 5);
    });

    it("lists all supported plugin targets", () => {
      const targets = ToolLifeOverlayEngine.supportedTargets();
      expect(targets).toEqual(["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"]);
    });
  });

  describe("session statistics", () => {
    it("returns zeros for unknown sessions", () => {
      const stats = ToolLifeOverlayEngine.getStats("never-existed");
      expect(stats.frames).toBe(0);
      expect(stats.change_now_count).toBe(0);
      expect(stats.min_remaining_pct).toBe(Infinity);
      expect(stats.min_remaining_min).toBe(Infinity);
      expect(stats.first_change_now_time_s).toBeNull();
    });

    it("accumulates counts per classification", () => {
      ToolLifeOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0 }, overlayWithToolLife("good", 90, 45, false));
      ToolLifeOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 1 }, overlayWithToolLife("monitor", 55, 25, false));
      ToolLifeOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 2 }, overlayWithToolLife("change_soon", 22, 10, false));
      ToolLifeOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 3 }, overlayWithToolLife("change_now", 5, 1.5, true));
      const stats = ToolLifeOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(4);
      expect(stats.good_count).toBe(1);
      expect(stats.monitor_count).toBe(1);
      expect(stats.change_soon_count).toBe(1);
      expect(stats.change_now_count).toBe(1);
      expect(stats.first_change_now_time_s).toBeCloseTo(3, 5);
    });

    it("remembers the earliest change_now event, not the latest", () => {
      ToolLifeOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 10 }, overlayWithToolLife("change_now", 4, 1, true));
      ToolLifeOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 20 }, overlayWithToolLife("change_now", 3, 0.5, true));
      const stats = ToolLifeOverlayEngine.getStats("S1");
      expect(stats.first_change_now_time_s).toBeCloseTo(10, 5);
      expect(stats.change_now_count).toBe(2);
    });

    it("tracks minimum remaining pct and minutes across frames", () => {
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("good", 90, 45, false));
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("monitor", 55, 25, false));
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_now", 3, 0.5, true));
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_soon", 22, 10, false));
      const stats = ToolLifeOverlayEngine.getStats("S1");
      expect(stats.min_remaining_pct).toBeCloseTo(3, 5);
      expect(stats.min_remaining_min).toBeCloseTo(0.5, 5);
    });

    it("counts change_recommended occurrences and transitions independently", () => {
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("good", 90, 45, false));
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_now", 5, 1.5, true));
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_now", 4, 1.0, true));
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("good", 88, 44, false));
      const stats = ToolLifeOverlayEngine.getStats("S1");
      expect(stats.change_recommended_count).toBe(2);
      expect(stats.transition_count).toBe(2);
    });
  });

  describe("session isolation", () => {
    it("keeps per-session state independent", () => {
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_now", 5, 1.5, true));
      const frameS2 = ToolLifeOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithToolLife("good", 88, 44, false));
      expect(frameS2.transition).toBe(false);
      expect(frameS2.state).toBe("good");

      const s1Stats = ToolLifeOverlayEngine.getStats("S1");
      const s2Stats = ToolLifeOverlayEngine.getStats("S2");
      expect(s1Stats.change_now_count).toBe(1);
      expect(s2Stats.change_now_count).toBe(0);
      expect(s2Stats.good_count).toBe(1);
    });

    it("resetSession clears only the requested session", () => {
      ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithToolLife("change_now", 5, 1.5, true));
      ToolLifeOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithToolLife("monitor", 55, 25, false));
      ToolLifeOverlayEngine.resetSession("S1");
      const s1 = ToolLifeOverlayEngine.getStats("S1");
      const s2 = ToolLifeOverlayEngine.getStats("S2");
      expect(s1.frames).toBe(0);
      expect(s2.frames).toBe(1);
    });
  });

  describe("input validation", () => {
    it("rejects an overlay with remaining_pct out of range", () => {
      const bad = overlayWithToolLife("good", 110, 45, false);
      expect(() =>
        ToolLifeOverlayEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });

    it("rejects a malformed OperationPoint via Zod parse", () => {
      const bad = { ...BASE_POINT, operation_id: 42 as unknown as string };
      expect(() =>
        ToolLifeOverlayEngine.renderFrame(
          "S1",
          bad as OperationPoint,
          overlayWithToolLife("good", 90, 45, false),
        ),
      ).toThrow();
    });
  });
});
