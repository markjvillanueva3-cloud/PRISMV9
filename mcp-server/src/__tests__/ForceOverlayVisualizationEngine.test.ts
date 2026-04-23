/**
 * Tests for ForceOverlayVisualizationEngine (U-CAM90)
 *
 * Scope: verify gradient color mapping, peak detection, alert classification,
 * per-plugin payload encoding, session aggregates, and Kienzle reference helper.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ForceOverlayVisualizationEngine } from "../engines/ForceOverlayVisualizationEngine.js";
import type {
  OperationPoint,
  PhysicsOverlay,
} from "../engines/PRISMVerificationPluginEngine.js";

const BASE_POINT: OperationPoint = {
  operation_id: "OP-001",
  time_s: 0,
  position: { x: 0, y: 0, z: 0 },
  cutting: {
    spindle_rpm: 8000,
    feed_rate_mmpm: 1600,
    depth_of_cut_mm: 2.0,
    width_of_cut_mm: 4.0,
  },
  tool: {
    tool_id: "T1",
    diameter_mm: 10,
    flutes: 4,
    material: "carbide",
    overhang_mm: 40,
  },
  material: {
    material_id: "1.2379",
    iso_group: "P",
    hardness_hrc: 28,
  },
};

function overlayWithForce(force_n: number): PhysicsOverlay {
  const warning = 500;
  const critical = 1000;
  let status: "nominal" | "warning" | "critical" = "nominal";
  if (force_n >= critical) status = "critical";
  else if (force_n >= warning) status = "warning";
  return {
    force: {
      value: force_n,
      unit: "N",
      confidence: 0.85,
      warning_threshold: warning,
      critical_threshold: critical,
      status,
    },
    chatter: {
      stable: true,
      stability_margin: 0.4,
      status: "stable",
    },
    deflection: {
      value: 0.005,
      unit: "mm",
      tolerance_impact: 5.0,
      status: "nominal",
    },
    temperature: {
      value: 210,
      unit: "°C",
      thermal_damage_risk: 0.1,
      status: "nominal",
    },
    tool_life: {
      remaining_pct: 80,
      estimated_remaining_min: 40,
      change_recommended: false,
      status: "good",
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

describe("ForceOverlayVisualizationEngine", () => {
  beforeEach(() => {
    ForceOverlayVisualizationEngine.resetSession("S1");
    ForceOverlayVisualizationEngine.resetSession("S2");
  });

  describe("renderFrame — basic structure", () => {
    it("returns a valid frame for nominal force", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(100),
      );
      expect(frame.session_id).toBe("S1");
      expect(frame.operation_id).toBe("OP-001");
      expect(frame.force_n).toBe(100);
      expect(frame.alert_level).toBe("nominal");
      expect(frame.color_hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(frame.target).toBe("generic");
    });

    it("echoes the point position for viewport placement", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        { ...BASE_POINT, position: { x: 12.5, y: -3.4, z: 1.0 } },
        overlayWithForce(250),
      );
      expect(frame.position).toEqual({ x: 12.5, y: -3.4, z: 1.0 });
    });

    it("carries threshold metadata for plugin tooltips", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(200),
      );
      expect(frame.thresholds.warning_n).toBe(500);
      expect(frame.thresholds.critical_n).toBe(1000);
      expect(frame.thresholds.peak_n).toBeCloseTo(900, 5);
    });
  });

  describe("alert level classification", () => {
    it("nominal below warning threshold", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(100),
      );
      expect(frame.alert_level).toBe("nominal");
    });

    it("warning at/above warning threshold", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(600),
      );
      expect(frame.alert_level).toBe("warning");
    });

    it("critical at/above critical threshold", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(1100),
      );
      expect(frame.alert_level).toBe("critical");
    });
  });

  describe("color gradient", () => {
    it("nominal is close to green at low force", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(0),
      );
      expect(frame.color_hex).toBe("#22c55e");
    });

    it("amber near the mid band (~50% normalized)", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(500),
      );
      expect(frame.color_hex).toBe("#eab308");
    });

    it("critical is close to red at high force", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(1000),
      );
      expect(frame.color_hex).toBe("#dc2626");
    });

    it("saturates to red beyond critical", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithForce(5000),
      );
      expect(frame.color_hex).toBe("#dc2626");
      expect(frame.normalized).toBe(1);
    });
  });

  describe("peak detection", () => {
    it("does not flag peaks below the peak threshold", () => {
      const forces = [100, 400, 200, 300, 450];
      const frames = forces.map((f, i) =>
        ForceOverlayVisualizationEngine.renderFrame(
          "S1",
          { ...BASE_POINT, time_s: i * 0.1 },
          overlayWithForce(f),
        ),
      );
      expect(frames.every((f) => f.peak_detected === false)).toBe(true);
    });

    it("flags a rising-edge peak above the peak threshold", () => {
      // Causal streaming detection: current sample must exceed all prior
      // samples in the trailing window by the prominence margin AND be
      // above the peak threshold (90% of critical = 900 N).
      const forces = [500, 600, 700, 800, 960];
      const frames = forces.map((f, i) =>
        ForceOverlayVisualizationEngine.renderFrame(
          "S1",
          { ...BASE_POINT, time_s: i * 0.1 },
          overlayWithForce(f),
        ),
      );
      expect(frames[4].peak_detected).toBe(true);
      expect(frames[4].alert_level).toBe("peak");
      expect(frames[4].color_hex).toBe("#d946ef");
    });

    it("requires window fill before declaring a peak", () => {
      const forces = [1200, 1300, 1400]; // only 3 frames
      const frames = forces.map((f, i) =>
        ForceOverlayVisualizationEngine.renderFrame(
          "S1",
          { ...BASE_POINT, time_s: i * 0.1 },
          overlayWithForce(f),
        ),
      );
      expect(frames.every((f) => f.peak_detected === false)).toBe(true);
    });

    it("ignores a centre sample without sufficient prominence", () => {
      // All forces near critical but essentially flat — not a peak
      const forces = [970, 975, 980, 975, 970];
      const frames = forces.map((f, i) =>
        ForceOverlayVisualizationEngine.renderFrame(
          "S1",
          { ...BASE_POINT, time_s: i * 0.1 },
          overlayWithForce(f),
        ),
      );
      expect(frames[4].peak_detected).toBe(false);
    });
  });

  describe("plugin target encoding", () => {
    const point: OperationPoint = { ...BASE_POINT, operation_id: "OP-MC-7" };
    const overlay = overlayWithForce(650);

    it("encodes hyperMILL XML-RPC methodCall envelope", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        point,
        overlay,
        "hypermill",
      );
      expect(frame.target).toBe("hypermill");
      expect(frame.payload).toContain("<methodCall>");
      expect(frame.payload).toContain("PRISM.ForceOverlay");
      expect(frame.payload).toContain("OP-MC-7");
      expect(frame.payload).toContain("650.00");
    });

    it("encodes Fusion 360 JSON-RPC 2.0 frame", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        point,
        overlay,
        "fusion360",
      );
      const parsed = JSON.parse(frame.payload);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("cam.forceOverlay");
      expect(parsed.params.operationId).toBe("OP-MC-7");
      expect(parsed.params.forceN).toBe(650);
    });

    it("encodes Inventor HSM named-pipe JSON frame", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        point,
        overlay,
        "inventor_hsm",
      );
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("hsm.forceOverlay");
      expect(parsed.force).toBe(650);
      expect(parsed.color).toBe(frame.color_hex);
    });

    it("encodes Mastercam NET-Hook compact record", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame(
        "S1",
        point,
        overlay,
        "mastercam",
      );
      expect(frame.payload.startsWith("FORCE|OP-MC-7|")).toBe(true);
      const fields = frame.payload.split("|");
      expect(fields).toHaveLength(6);
      expect(fields[2]).toBe("650.00");
      expect(fields[4]).toBe("warning");
    });

    it("defaults to generic JSON when target omitted", () => {
      const frame = ForceOverlayVisualizationEngine.renderFrame("S1", point, overlay);
      expect(frame.target).toBe("generic");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("force_overlay");
    });
  });

  describe("session statistics", () => {
    it("returns zeros for unknown sessions", () => {
      const stats = ForceOverlayVisualizationEngine.getStats("never-existed");
      expect(stats.frames).toBe(0);
      expect(stats.max_force_n).toBe(0);
      expect(stats.last_peak_time_s).toBeNull();
    });

    it("tracks mean, max, and counts across frames", () => {
      const forces = [100, 600, 800, 1100, 300];
      forces.forEach((f, i) => {
        ForceOverlayVisualizationEngine.renderFrame(
          "S1",
          { ...BASE_POINT, time_s: i * 0.1 },
          overlayWithForce(f),
        );
      });
      const stats = ForceOverlayVisualizationEngine.getStats("S1");
      expect(stats.frames).toBe(5);
      expect(stats.max_force_n).toBe(1100);
      expect(stats.mean_force_n).toBeCloseTo(580, 1);
      expect(stats.warning_count).toBeGreaterThanOrEqual(1);
      expect(stats.critical_count).toBeGreaterThanOrEqual(1);
    });

    it("isolates statistics between sessions", () => {
      ForceOverlayVisualizationEngine.renderFrame("S1", BASE_POINT, overlayWithForce(200));
      ForceOverlayVisualizationEngine.renderFrame("S2", BASE_POINT, overlayWithForce(900));
      const s1 = ForceOverlayVisualizationEngine.getStats("S1");
      const s2 = ForceOverlayVisualizationEngine.getStats("S2");
      expect(s1.max_force_n).toBe(200);
      expect(s2.max_force_n).toBe(900);
    });

    it("resetSession clears all state for that session", () => {
      ForceOverlayVisualizationEngine.renderFrame("S1", BASE_POINT, overlayWithForce(500));
      ForceOverlayVisualizationEngine.resetSession("S1");
      const stats = ForceOverlayVisualizationEngine.getStats("S1");
      expect(stats.frames).toBe(0);
      expect(ForceOverlayVisualizationEngine._peekHistory("S1")).toEqual([]);
    });
  });

  describe("expectedKienzleForce reference", () => {
    it("matches Kienzle canonical form for P-group steel", () => {
      // P: kc1_1 = 1800, mc = 0.25, ap = 2, fz = 0.1
      // Fc = 1800 * 2 * 0.1^(1-0.25) = 1800 * 2 * 0.1^0.75
      const expected = 1800 * 2 * Math.pow(0.1, 0.75);
      const actual = ForceOverlayVisualizationEngine.expectedKienzleForce("P", 2, 0.1);
      expect(actual).toBeCloseTo(expected, 6);
    });

    it("rejects non-positive cutting parameters", () => {
      expect(() =>
        ForceOverlayVisualizationEngine.expectedKienzleForce("P", 0, 0.1),
      ).toThrow(/Non-positive/);
      expect(() =>
        ForceOverlayVisualizationEngine.expectedKienzleForce("P", 2, 0),
      ).toThrow(/Non-positive/);
    });

    it("rejects unknown ISO groups", () => {
      expect(() =>
        // @ts-expect-error — deliberate invalid group for error test
        ForceOverlayVisualizationEngine.expectedKienzleForce("Z", 2, 0.1),
      ).toThrow(/Unknown ISO group/);
    });
  });

  describe("supportedTargets", () => {
    it("lists the four CAM adapters plus generic", () => {
      const targets = ForceOverlayVisualizationEngine.supportedTargets();
      expect(targets).toEqual([
        "hypermill",
        "fusion360",
        "inventor_hsm",
        "mastercam",
        "generic",
      ]);
    });
  });

  describe("input validation", () => {
    it("rejects an OperationPoint missing required fields", () => {
      const bad = { ...BASE_POINT, operation_id: undefined as unknown as string };
      expect(() =>
        ForceOverlayVisualizationEngine.renderFrame("S1", bad, overlayWithForce(100)),
      ).toThrow();
    });

    it("rejects a PhysicsOverlay with an invalid force status", () => {
      const bad = overlayWithForce(100);
      (bad.force as unknown as { status: string }).status = "banana";
      expect(() =>
        ForceOverlayVisualizationEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });
  });
});
