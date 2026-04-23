/**
 * Tests for SafetyScoreOverlayEngine (U-CAM95)
 *
 * Scope: verify band classification (green/yellow/red/transition), color
 * mapping, hard-stop assertion logic (red OR upstream flag), per-plugin
 * payload encoding, session aggregates, and state isolation across sessions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SafetyScoreOverlayEngine } from "../engines/SafetyScoreOverlayEngine.js";
import type {
  OperationPoint,
  PhysicsOverlay,
} from "../engines/PRISMVerificationPluginEngine.js";

const BASE_POINT: OperationPoint = {
  operation_id: "OP-SX-001",
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

function overlayWithSafety(
  score: number,
  verdict: "PASS" | "WARNING" | "FAIL",
  hard_stop: boolean,
  components: {
    force: number; stability: number; deflection: number;
    thermal: number; tool_life: number;
  } = { force: 0.9, stability: 0.9, deflection: 0.9, thermal: 0.9, tool_life: 0.9 },
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
      remaining_pct: 80,
      estimated_remaining_min: 40,
      change_recommended: false,
      status: "good",
    },
    safety_score: {
      value: score,
      components,
      verdict,
      hard_stop,
    },
  };
}

describe("SafetyScoreOverlayEngine", () => {
  beforeEach(() => {
    SafetyScoreOverlayEngine.resetSession("S1");
    SafetyScoreOverlayEngine.resetSession("S2");
  });

  describe("classify — pure band logic", () => {
    it("classifies >= 0.85 as green", () => {
      expect(SafetyScoreOverlayEngine.classify(0.85)).toBe("green");
      expect(SafetyScoreOverlayEngine.classify(0.92)).toBe("green");
      expect(SafetyScoreOverlayEngine.classify(1.0)).toBe("green");
    });

    it("classifies 0.70 <= S < 0.85 as yellow", () => {
      expect(SafetyScoreOverlayEngine.classify(0.70)).toBe("yellow");
      expect(SafetyScoreOverlayEngine.classify(0.80)).toBe("yellow");
      expect(SafetyScoreOverlayEngine.classify(0.8499)).toBe("yellow");
    });

    it("classifies < 0.70 as red", () => {
      expect(SafetyScoreOverlayEngine.classify(0.6999)).toBe("red");
      expect(SafetyScoreOverlayEngine.classify(0.5)).toBe("red");
      expect(SafetyScoreOverlayEngine.classify(0)).toBe("red");
    });

    it("exposes the boundary constants for cross-engine alignment", () => {
      expect(SafetyScoreOverlayEngine.GREEN_THRESHOLD).toBeCloseTo(0.85, 5);
      expect(SafetyScoreOverlayEngine.YELLOW_THRESHOLD).toBeCloseTo(0.70, 5);
    });
  });

  describe("renderFrame — basic structure", () => {
    it("returns a valid green frame for S >= 0.85", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithSafety(0.92, "PASS", false),
      );
      expect(frame.session_id).toBe("S1");
      expect(frame.operation_id).toBe("OP-SX-001");
      expect(frame.safety_score).toBeCloseTo(0.92, 5);
      expect(frame.band).toBe("green");
      expect(frame.color_hex).toBe("#22c55e");
      expect(frame.hard_stop).toBe(false);
      expect(frame.transition).toBe(false);
    });

    it("echoes the point position and components", () => {
      const comps = { force: 0.95, stability: 0.88, deflection: 0.9, thermal: 0.92, tool_life: 0.85 };
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, position: { x: 5.5, y: 1.1, z: -2.0 } },
        overlayWithSafety(0.91, "PASS", false, comps),
      );
      expect(frame.position).toEqual({ x: 5.5, y: 1.1, z: -2.0 });
      expect(frame.components).toEqual(comps);
    });

    it("propagates the upstream verdict verbatim", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithSafety(0.78, "WARNING", false),
      );
      expect(frame.verdict).toBe("WARNING");
      expect(frame.band).toBe("yellow");
      expect(frame.color_hex).toBe("#eab308");
    });
  });

  describe("band classification from overlay score", () => {
    it("maps green score to green band", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.95, "PASS", false));
      expect(frame.band).toBe("green");
      expect(frame.color_hex).toBe("#22c55e");
    });

    it("maps yellow score to yellow band", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.78, "WARNING", false));
      expect(frame.band).toBe("yellow");
      expect(frame.color_hex).toBe("#eab308");
    });

    it("maps red score to red band", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.55, "FAIL", true));
      expect(frame.band).toBe("red");
      expect(frame.color_hex).toBe("#dc2626");
    });

    it("treats S = 0.85 exactly as green (inclusive lower bound)", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.85, "PASS", false));
      expect(frame.band).toBe("green");
    });

    it("treats S = 0.70 exactly as yellow (inclusive lower bound)", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.70, "WARNING", false));
      expect(frame.band).toBe("yellow");
    });
  });

  describe("hard_stop assertion logic", () => {
    it("asserts hard_stop when upstream flag is true (even if green)", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.95, "PASS", true));
      expect(frame.hard_stop).toBe(true);
    });

    it("asserts hard_stop whenever band is red (even if upstream flag false)", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.45, "FAIL", false));
      expect(frame.hard_stop).toBe(true);
    });

    it("does NOT assert hard_stop for yellow with upstream flag false", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.75, "WARNING", false));
      expect(frame.hard_stop).toBe(false);
    });

    it("records first and last hard_stop times in stats", () => {
      SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 1.0 }, overlayWithSafety(0.95, "PASS", false));
      SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 2.0 }, overlayWithSafety(0.45, "FAIL", false));
      SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 3.0 }, overlayWithSafety(0.40, "FAIL", true));
      const stats = SafetyScoreOverlayEngine.getStats("S1");
      expect(stats.hard_stop_count).toBe(2);
      expect(stats.first_hard_stop_time_s).toBeCloseTo(2.0, 5);
      expect(stats.last_hard_stop_time_s).toBeCloseTo(3.0, 5);
    });
  });

  describe("transition detection", () => {
    it("does not flag the first frame as a transition", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame(
        "S1", BASE_POINT, overlayWithSafety(0.95, "PASS", false));
      expect(frame.transition).toBe(false);
    });

    it("flags a green → red transition with magenta override", () => {
      SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 0 }, overlayWithSafety(0.95, "PASS", false));
      const flip = SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 0.5 }, overlayWithSafety(0.40, "FAIL", true));
      expect(flip.transition).toBe(true);
      expect(flip.band).toBe("transition");
      expect(flip.color_hex).toBe("#d946ef");
      // hard_stop MUST still be true through a transition frame
      expect(flip.hard_stop).toBe(true);
    });

    it("does not re-flag transition when band holds steady", () => {
      const f1 = SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 0 }, overlayWithSafety(0.78, "WARNING", false));
      const f2 = SafetyScoreOverlayEngine.renderFrame(
        "S1", { ...BASE_POINT, time_s: 0.1 }, overlayWithSafety(0.76, "WARNING", false));
      expect(f1.transition).toBe(false);
      expect(f2.transition).toBe(false);
      expect(f2.band).toBe("yellow");
    });

    it("flips the transition flag on each band change", () => {
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.95, "PASS", false));
      const f1 = SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.78, "WARNING", false));
      const f2 = SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.76, "WARNING", false));
      const f3 = SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.40, "FAIL", true));
      const f4 = SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.92, "PASS", false));
      expect(f1.transition).toBe(true);
      expect(f2.transition).toBe(false);
      expect(f3.transition).toBe(true);
      expect(f4.transition).toBe(true);
    });
  });

  describe("plugin target encoding", () => {
    const point: OperationPoint = { ...BASE_POINT, operation_id: "OP-SX-X" };
    const overlay = overlayWithSafety(0.42, "FAIL", true);

    it("encodes hyperMILL XML-RPC frame", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame("S1", point, overlay, "hypermill");
      expect(frame.target).toBe("hypermill");
      expect(frame.payload).toContain("<methodCall>");
      expect(frame.payload).toContain("PRISM.SafetyScoreOverlay");
      expect(frame.payload).toContain("OP-SX-X");
      expect(frame.payload).toContain("0.420");
      expect(frame.payload).toContain("red");
      expect(frame.payload).toContain("FAIL");
    });

    it("encodes Fusion 360 JSON-RPC frame", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame("S1", point, overlay, "fusion360");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("cam.safetyScoreOverlay");
      expect(parsed.params.operationId).toBe("OP-SX-X");
      expect(parsed.params.safetyScore).toBeCloseTo(0.42, 5);
      expect(parsed.params.verdict).toBe("FAIL");
      expect(parsed.params.hardStop).toBe(true);
      expect(parsed.params.band).toBe("red");
      expect(parsed.params.components).toBeDefined();
    });

    it("encodes Inventor HSM JSON frame", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame("S1", point, overlay, "inventor_hsm");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("hsm.safetyScoreOverlay");
      expect(parsed.operationId).toBe("OP-SX-X");
      expect(parsed.safetyScore).toBeCloseTo(0.42, 5);
      expect(parsed.hardStop).toBe(true);
      expect(parsed.band).toBe("red");
    });

    it("encodes Mastercam NET-Hook pipe record", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame("S1", point, overlay, "mastercam");
      expect(frame.payload.startsWith("SAFE|OP-SX-X|0.420|")).toBe(true);
      const fields = frame.payload.split("|");
      expect(fields).toHaveLength(8);
      expect(fields[3]).toBe("red");
      expect(fields[4]).toBe("FAIL");
      expect(fields[5]).toBe("#dc2626");
      expect(fields[6]).toBe("1");
    });

    it("defaults to generic JSON when target omitted", () => {
      const frame = SafetyScoreOverlayEngine.renderFrame("S1", point, overlay);
      expect(frame.target).toBe("generic");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("safety_score_overlay");
      expect(parsed.safety_score).toBeCloseTo(0.42, 5);
      expect(parsed.components).toBeDefined();
    });

    it("lists all supported plugin targets", () => {
      const targets = SafetyScoreOverlayEngine.supportedTargets();
      expect(targets).toEqual(["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"]);
    });
  });

  describe("session statistics", () => {
    it("returns zeros for unknown sessions", () => {
      const stats = SafetyScoreOverlayEngine.getStats("never-existed");
      expect(stats.frames).toBe(0);
      expect(stats.red_count).toBe(0);
      expect(stats.hard_stop_count).toBe(0);
      expect(stats.min_safety_score).toBe(Infinity);
      expect(stats.max_safety_score).toBe(-Infinity);
      expect(stats.first_hard_stop_time_s).toBeNull();
      expect(stats.last_hard_stop_time_s).toBeNull();
    });

    it("accumulates counts per band and verdict", () => {
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.92, "PASS", false));
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.76, "WARNING", false));
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.60, "FAIL", true));
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.45, "FAIL", true));
      const stats = SafetyScoreOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(4);
      expect(stats.green_count).toBe(1);
      expect(stats.yellow_count).toBe(1);
      expect(stats.red_count).toBe(2);
      expect(stats.verdict_pass_count).toBe(1);
      expect(stats.verdict_warning_count).toBe(1);
      expect(stats.verdict_fail_count).toBe(2);
    });

    it("tracks min and max safety_score across frames", () => {
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.92, "PASS", false));
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.55, "FAIL", true));
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.78, "WARNING", false));
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.98, "PASS", false));
      const stats = SafetyScoreOverlayEngine.getStats("S1");
      expect(stats.min_safety_score).toBeCloseTo(0.55, 5);
      expect(stats.max_safety_score).toBeCloseTo(0.98, 5);
    });
  });

  describe("session isolation", () => {
    it("keeps per-session state independent", () => {
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.40, "FAIL", true));
      const frameS2 = SafetyScoreOverlayEngine.renderFrame(
        "S2", BASE_POINT, overlayWithSafety(0.95, "PASS", false));
      expect(frameS2.transition).toBe(false);
      expect(frameS2.band).toBe("green");

      const s1 = SafetyScoreOverlayEngine.getStats("S1");
      const s2 = SafetyScoreOverlayEngine.getStats("S2");
      expect(s1.red_count).toBe(1);
      expect(s1.hard_stop_count).toBe(1);
      expect(s2.red_count).toBe(0);
      expect(s2.green_count).toBe(1);
    });

    it("resetSession clears only the requested session", () => {
      SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithSafety(0.40, "FAIL", true));
      SafetyScoreOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithSafety(0.78, "WARNING", false));
      SafetyScoreOverlayEngine.resetSession("S1");
      const s1 = SafetyScoreOverlayEngine.getStats("S1");
      const s2 = SafetyScoreOverlayEngine.getStats("S2");
      expect(s1.frames).toBe(0);
      expect(s2.frames).toBe(1);
    });
  });

  describe("input validation", () => {
    it("rejects a safety_score value > 1", () => {
      const bad = overlayWithSafety(0.9, "PASS", false);
      (bad.safety_score as { value: number }).value = 1.5;
      expect(() =>
        SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });

    it("rejects a missing verdict", () => {
      const bad = overlayWithSafety(0.9, "PASS", false) as unknown as PhysicsOverlay;
      delete (bad.safety_score as { verdict?: unknown }).verdict;
      expect(() =>
        SafetyScoreOverlayEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });
  });
});
