/**
 * Tests for SLDOverlayEngine (U-CAM91)
 *
 * Scope: verify state classification (stable/marginal/unstable/transition),
 * color mapping, recommended_rpm passthrough, per-plugin payload encoding,
 * session aggregates, and state isolation across sessions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SLDOverlayEngine } from "../engines/SLDOverlayEngine.js";
import type {
  OperationPoint,
  PhysicsOverlay,
} from "../engines/PRISMVerificationPluginEngine.js";

const BASE_POINT: OperationPoint = {
  operation_id: "OP-SLD-001",
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
  },
};

function overlayWithChatter(
  status: "stable" | "marginal" | "unstable",
  stability_margin: number,
  recommended_rpm?: number,
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
      stable: status === "stable",
      stability_margin,
      recommended_rpm,
      status,
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

describe("SLDOverlayEngine", () => {
  beforeEach(() => {
    SLDOverlayEngine.resetSession("S1");
    SLDOverlayEngine.resetSession("S2");
  });

  describe("renderFrame — basic structure", () => {
    it("returns a valid frame for stable input", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("stable", 0.4),
      );
      expect(frame.session_id).toBe("S1");
      expect(frame.operation_id).toBe("OP-SLD-001");
      expect(frame.rpm).toBe(8000);
      expect(frame.state).toBe("stable");
      expect(frame.color_hex).toBe("#22c55e");
      expect(frame.transition).toBe(false);
    });

    it("echoes the point position", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, position: { x: 5.5, y: 1.1, z: -2.0 } },
        overlayWithChatter("stable", 0.4),
      );
      expect(frame.position).toEqual({ x: 5.5, y: 1.1, z: -2.0 });
    });

    it("carries recommended_rpm when the upstream overlay provides it", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("unstable", 0.0, 9200),
      );
      expect(frame.recommended_rpm).toBe(9200);
    });

    it("returns null recommended_rpm when upstream omits it", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("stable", 0.4),
      );
      expect(frame.recommended_rpm).toBeNull();
    });
  });

  describe("state classification", () => {
    it("classifies upstream unstable as unstable (red)", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("unstable", 0.0),
      );
      expect(frame.state).toBe("unstable");
      expect(frame.color_hex).toBe("#dc2626");
    });

    it("classifies upstream marginal as marginal (amber)", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("marginal", 0.05),
      );
      expect(frame.state).toBe("marginal");
      expect(frame.color_hex).toBe("#eab308");
    });

    it("promotes stable-but-narrow-margin to marginal (below 0.15 band)", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("stable", 0.10),
      );
      expect(frame.state).toBe("marginal");
    });

    it("keeps stable-with-wide-margin as stable", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("stable", 0.50),
      );
      expect(frame.state).toBe("stable");
    });
  });

  describe("transition detection", () => {
    it("does not flag the first frame as a transition", () => {
      const frame = SLDOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithChatter("stable", 0.4),
      );
      expect(frame.transition).toBe(false);
    });

    it("flags a stable → unstable transition (magenta override)", () => {
      SLDOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithChatter("stable", 0.4),
      );
      const flip = SLDOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.1 },
        overlayWithChatter("unstable", 0.0, 9500),
      );
      expect(flip.transition).toBe(true);
      expect(flip.state).toBe("transition");
      expect(flip.color_hex).toBe("#d946ef");
    });

    it("does not repeat the transition flag if state stays the same", () => {
      const u1 = SLDOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithChatter("unstable", 0.0),
      );
      const u2 = SLDOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.1 },
        overlayWithChatter("unstable", 0.0),
      );
      // u1 is first frame, no transition; u2 same as previous classified state
      expect(u1.transition).toBe(false);
      expect(u2.transition).toBe(false);
    });

    it("flips transition on each state change", () => {
      SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("stable", 0.4));
      const f1 = SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("unstable", 0.0));
      const f2 = SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("unstable", 0.0));
      const f3 = SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("stable", 0.4));
      expect(f1.transition).toBe(true);
      expect(f2.transition).toBe(false);
      expect(f3.transition).toBe(true);
    });
  });

  describe("plugin target encoding", () => {
    const point: OperationPoint = { ...BASE_POINT, operation_id: "OP-X", cutting: { ...BASE_POINT.cutting, spindle_rpm: 7500 } };
    const overlay = overlayWithChatter("unstable", 0.02, 9000);

    it("encodes hyperMILL XML-RPC frame", () => {
      const frame = SLDOverlayEngine.renderFrame("S1", point, overlay, "hypermill");
      expect(frame.target).toBe("hypermill");
      expect(frame.payload).toContain("<methodCall>");
      expect(frame.payload).toContain("PRISM.SLDOverlay");
      expect(frame.payload).toContain("OP-X");
      expect(frame.payload).toContain("7500.0");
      expect(frame.payload).toContain("9000.0");
    });

    it("encodes Fusion 360 JSON-RPC frame", () => {
      const frame = SLDOverlayEngine.renderFrame("S1", point, overlay, "fusion360");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("cam.sldOverlay");
      expect(parsed.params.rpm).toBe(7500);
      expect(parsed.params.recommendedRpm).toBe(9000);
      expect(parsed.params.state).toBe("unstable");
    });

    it("encodes Inventor HSM JSON frame", () => {
      const frame = SLDOverlayEngine.renderFrame("S1", point, overlay, "inventor_hsm");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("hsm.sldOverlay");
      expect(parsed.rpm).toBe(7500);
      expect(parsed.recommendedRpm).toBe(9000);
    });

    it("encodes Mastercam NET-Hook pipe record", () => {
      const frame = SLDOverlayEngine.renderFrame("S1", point, overlay, "mastercam");
      expect(frame.payload.startsWith("SLD|OP-X|7500.0|")).toBe(true);
      const fields = frame.payload.split("|");
      expect(fields).toHaveLength(8);
      expect(fields[3]).toBe("unstable");
      expect(fields[6]).toBe("9000");
    });

    it("defaults to generic JSON when target omitted", () => {
      const frame = SLDOverlayEngine.renderFrame("S1", point, overlay);
      expect(frame.target).toBe("generic");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("sld_overlay");
    });
  });

  describe("session statistics", () => {
    it("returns zeros for unknown sessions", () => {
      const stats = SLDOverlayEngine.getStats("never-existed");
      expect(stats.frames).toBe(0);
      expect(stats.unstable_count).toBe(0);
      expect(stats.min_stability_margin).toBe(Infinity);
      expect(stats.last_unstable_time_s).toBeNull();
    });

    it("accumulates counts per classification", () => {
      SLDOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0 }, overlayWithChatter("stable", 0.4));
      SLDOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.1 }, overlayWithChatter("stable", 0.4));
      SLDOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.2 }, overlayWithChatter("marginal", 0.05));
      SLDOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.3 }, overlayWithChatter("unstable", 0.0, 9500));
      const stats = SLDOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(4);
      expect(stats.stable_count).toBe(2);
      expect(stats.marginal_count).toBe(1);
      expect(stats.unstable_count).toBe(1);
      expect(stats.transition_count).toBeGreaterThanOrEqual(1);
      expect(stats.last_unstable_time_s).toBeCloseTo(0.3, 5);
      expect(stats.last_recommended_rpm).toBe(9500);
    });

    it("tracks min_stability_margin across frames", () => {
      SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("stable", 0.80));
      SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("stable", 0.40));
      SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("marginal", 0.02));
      const stats = SLDOverlayEngine.getStats("S1");
      expect(stats.min_stability_margin).toBeCloseTo(0.02, 5);
    });

    it("isolates statistics between sessions", () => {
      SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("unstable", 0.0));
      SLDOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithChatter("stable", 0.4));
      expect(SLDOverlayEngine.getStats("S1").unstable_count).toBe(1);
      expect(SLDOverlayEngine.getStats("S2").unstable_count).toBe(0);
      expect(SLDOverlayEngine.getStats("S2").stable_count).toBe(1);
    });

    it("resetSession clears all state", () => {
      SLDOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithChatter("unstable", 0.0));
      SLDOverlayEngine.resetSession("S1");
      const stats = SLDOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(0);
    });
  });

  describe("supportedTargets", () => {
    it("lists the four CAM adapters plus generic", () => {
      const targets = SLDOverlayEngine.supportedTargets();
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
        SLDOverlayEngine.renderFrame("S1", bad, overlayWithChatter("stable", 0.4)),
      ).toThrow();
    });

    it("rejects a PhysicsOverlay with an invalid chatter status", () => {
      const bad = overlayWithChatter("stable", 0.4);
      (bad.chatter as unknown as { status: string }).status = "wobbly";
      expect(() =>
        SLDOverlayEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });
  });
});
