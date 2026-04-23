/**
 * Tests for DeflectionOverlayEngine (U-CAM92)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeflectionOverlayEngine } from "../engines/DeflectionOverlayEngine.js";
import type {
  OperationPoint,
  PhysicsOverlay,
} from "../engines/PRISMVerificationPluginEngine.js";

const BASE_POINT: OperationPoint = {
  operation_id: "OP-DEFL-001",
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

function overlayWithDeflection(
  status: "nominal" | "warning" | "critical",
  value: number,
  tolerance_impact: number,
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
      stability_margin: 0.4,
      status: "stable",
    },
    deflection: {
      value,
      unit: "mm",
      tolerance_impact,
      status,
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

describe("DeflectionOverlayEngine", () => {
  beforeEach(() => {
    DeflectionOverlayEngine.resetSession("S1");
    DeflectionOverlayEngine.resetSession("S2");
  });

  describe("renderFrame — basic structure", () => {
    it("returns a valid frame for nominal input", () => {
      const frame = DeflectionOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithDeflection("nominal", 0.003, 5),
      );
      expect(frame.session_id).toBe("S1");
      expect(frame.operation_id).toBe("OP-DEFL-001");
      expect(frame.deflection_mm).toBeCloseTo(0.003, 6);
      expect(frame.tolerance_impact_pct).toBe(5);
      expect(frame.state).toBe("nominal");
      expect(frame.color_hex).toBe("#22c55e");
      expect(frame.transition).toBe(false);
    });

    it("echoes the point position", () => {
      const frame = DeflectionOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, position: { x: 10, y: 20, z: -5 } },
        overlayWithDeflection("nominal", 0.002, 2),
      );
      expect(frame.position).toEqual({ x: 10, y: 20, z: -5 });
    });
  });

  describe("state classification", () => {
    it("classifies nominal as green", () => {
      const frame = DeflectionOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithDeflection("nominal", 0.001, 3),
      );
      expect(frame.state).toBe("nominal");
      expect(frame.color_hex).toBe("#22c55e");
    });

    it("classifies warning as amber", () => {
      const frame = DeflectionOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithDeflection("warning", 0.015, 60),
      );
      expect(frame.state).toBe("warning");
      expect(frame.color_hex).toBe("#eab308");
    });

    it("classifies critical as red", () => {
      const frame = DeflectionOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithDeflection("critical", 0.030, 110),
      );
      expect(frame.state).toBe("critical");
      expect(frame.color_hex).toBe("#dc2626");
    });
  });

  describe("transition detection", () => {
    it("does not flag the first frame as a transition", () => {
      const frame = DeflectionOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithDeflection("nominal", 0.001, 2),
      );
      expect(frame.transition).toBe(false);
    });

    it("flags nominal → critical transition (magenta override)", () => {
      DeflectionOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithDeflection("nominal", 0.002, 5),
      );
      const flip = DeflectionOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.1 },
        overlayWithDeflection("critical", 0.020, 115),
      );
      expect(flip.transition).toBe(true);
      expect(flip.state).toBe("transition");
      expect(flip.color_hex).toBe("#d946ef");
    });

    it("does not flag consecutive same-status frames", () => {
      const f1 = DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("warning", 0.010, 55));
      const f2 = DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("warning", 0.012, 60));
      expect(f1.transition).toBe(false);
      expect(f2.transition).toBe(false);
    });

    it("re-flips on further transitions", () => {
      DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("nominal", 0.001, 2));
      const f1 = DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("warning", 0.010, 55));
      const f2 = DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("warning", 0.011, 56));
      const f3 = DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("critical", 0.020, 110));
      expect(f1.transition).toBe(true);
      expect(f2.transition).toBe(false);
      expect(f3.transition).toBe(true);
    });
  });

  describe("plugin target encoding", () => {
    const point: OperationPoint = { ...BASE_POINT, operation_id: "OP-Y" };
    const overlay = overlayWithDeflection("warning", 0.0125, 62);

    it("encodes hyperMILL XML-RPC frame", () => {
      const frame = DeflectionOverlayEngine.renderFrame("S1", point, overlay, "hypermill");
      expect(frame.target).toBe("hypermill");
      expect(frame.payload).toContain("<methodCall>");
      expect(frame.payload).toContain("PRISM.DeflectionOverlay");
      expect(frame.payload).toContain("OP-Y");
      expect(frame.payload).toContain("0.0125");
      expect(frame.payload).toContain("62.0");
    });

    it("encodes Fusion 360 JSON-RPC frame", () => {
      const frame = DeflectionOverlayEngine.renderFrame("S1", point, overlay, "fusion360");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("cam.deflectionOverlay");
      expect(parsed.params.deflectionMm).toBe(0.0125);
      expect(parsed.params.toleranceImpactPct).toBe(62);
      expect(parsed.params.state).toBe("warning");
    });

    it("encodes Inventor HSM JSON frame", () => {
      const frame = DeflectionOverlayEngine.renderFrame("S1", point, overlay, "inventor_hsm");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("hsm.deflectionOverlay");
      expect(parsed.deflection).toBe(0.0125);
      expect(parsed.toleranceImpact).toBe(62);
    });

    it("encodes Mastercam NET-Hook pipe record", () => {
      const frame = DeflectionOverlayEngine.renderFrame("S1", point, overlay, "mastercam");
      expect(frame.payload.startsWith("DEFL|OP-Y|0.0125|")).toBe(true);
      const fields = frame.payload.split("|");
      expect(fields).toHaveLength(7);
      expect(fields[3]).toBe("warning");
      expect(fields[5]).toBe("62.0");
    });

    it("defaults to generic JSON when target omitted", () => {
      const frame = DeflectionOverlayEngine.renderFrame("S1", point, overlay);
      expect(frame.target).toBe("generic");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("deflection_overlay");
    });
  });

  describe("session statistics", () => {
    it("returns zeros for unknown sessions", () => {
      const stats = DeflectionOverlayEngine.getStats("never-existed");
      expect(stats.frames).toBe(0);
      expect(stats.critical_count).toBe(0);
      expect(stats.last_critical_time_s).toBeNull();
    });

    it("accumulates counts per classification", () => {
      DeflectionOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0 }, overlayWithDeflection("nominal", 0.002, 3));
      DeflectionOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.1 }, overlayWithDeflection("warning", 0.012, 60));
      DeflectionOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.2 }, overlayWithDeflection("critical", 0.025, 115));
      const stats = DeflectionOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(3);
      expect(stats.nominal_count).toBe(1);
      expect(stats.warning_count).toBe(1);
      expect(stats.critical_count).toBe(1);
      expect(stats.last_critical_time_s).toBeCloseTo(0.2, 5);
    });

    it("tracks max deflection and tolerance impact across frames", () => {
      DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("nominal", 0.002, 5));
      DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("warning", 0.011, 55));
      DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("critical", 0.030, 120));
      const stats = DeflectionOverlayEngine.getStats("S1");
      expect(stats.max_deflection_mm).toBeCloseTo(0.030, 6);
      expect(stats.max_tolerance_impact_pct).toBe(120);
    });

    it("isolates statistics between sessions", () => {
      DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("critical", 0.030, 120));
      DeflectionOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithDeflection("nominal", 0.001, 2));
      expect(DeflectionOverlayEngine.getStats("S1").critical_count).toBe(1);
      expect(DeflectionOverlayEngine.getStats("S2").critical_count).toBe(0);
      expect(DeflectionOverlayEngine.getStats("S2").nominal_count).toBe(1);
    });

    it("resetSession clears all state", () => {
      DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithDeflection("critical", 0.020, 110));
      DeflectionOverlayEngine.resetSession("S1");
      const stats = DeflectionOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(0);
    });
  });

  describe("supportedTargets", () => {
    it("lists the four CAM adapters plus generic", () => {
      const targets = DeflectionOverlayEngine.supportedTargets();
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
        DeflectionOverlayEngine.renderFrame("S1", bad, overlayWithDeflection("nominal", 0.001, 2)),
      ).toThrow();
    });

    it("rejects a PhysicsOverlay with an invalid deflection status", () => {
      const bad = overlayWithDeflection("nominal", 0.001, 2);
      (bad.deflection as unknown as { status: string }).status = "floppy";
      expect(() =>
        DeflectionOverlayEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });
  });
});
