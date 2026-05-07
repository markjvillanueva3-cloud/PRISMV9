/**
 * Tests for ThermalOverlayEngine (U-CAM93)
 *
 * Scope: verify state classification (nominal/elevated/critical/transition),
 * color mapping, temperature + damage_risk passthrough, per-plugin payload
 * encoding, session aggregates, and state isolation across sessions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ThermalOverlayEngine } from "../engines/ThermalOverlayEngine.js";
import type {
  OperationPoint,
  PhysicsOverlay,
} from "../engines/PRISMVerificationPluginEngine.js";

const BASE_POINT: OperationPoint = {
  operation_id: "OP-THM-001",
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

function overlayWithTemp(
  status: "nominal" | "elevated" | "critical",
  temperature_c: number,
  thermal_damage_risk: number,
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
      value: temperature_c,
      unit: "°C",
      thermal_damage_risk,
      status,
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

describe("ThermalOverlayEngine", () => {
  beforeEach(() => {
    ThermalOverlayEngine.resetSession("S1");
    ThermalOverlayEngine.resetSession("S2");
  });

  describe("renderFrame — basic structure", () => {
    it("returns a valid frame for nominal input", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("nominal", 180, 0.08),
      );
      expect(frame.session_id).toBe("S1");
      expect(frame.operation_id).toBe("OP-THM-001");
      expect(frame.temperature_c).toBeCloseTo(180, 5);
      expect(frame.thermal_damage_risk).toBeCloseTo(0.08, 5);
      expect(frame.state).toBe("nominal");
      expect(frame.color_hex).toBe("#22c55e");
      expect(frame.transition).toBe(false);
    });

    it("echoes the point position into the frame", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, position: { x: 5.5, y: 1.1, z: -2.0 } },
        overlayWithTemp("nominal", 150, 0.05),
      );
      expect(frame.position).toEqual({ x: 5.5, y: 1.1, z: -2.0 });
    });

    it("carries temperature.value unchanged from the overlay", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("critical", 823.7, 0.95),
      );
      expect(frame.temperature_c).toBeCloseTo(823.7, 5);
      expect(frame.thermal_damage_risk).toBeCloseTo(0.95, 5);
    });
  });

  describe("state classification", () => {
    it("classifies upstream critical as critical (red)", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("critical", 850, 0.92),
      );
      expect(frame.state).toBe("critical");
      expect(frame.color_hex).toBe("#dc2626");
    });

    it("classifies upstream elevated as elevated (amber)", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("elevated", 450, 0.45),
      );
      expect(frame.state).toBe("elevated");
      expect(frame.color_hex).toBe("#eab308");
    });

    it("classifies upstream nominal as nominal (green)", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("nominal", 200, 0.1),
      );
      expect(frame.state).toBe("nominal");
      expect(frame.color_hex).toBe("#22c55e");
    });

    it("accepts the full thermal_damage_risk range [0,1]", () => {
      const low = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("nominal", 100, 0.0),
      );
      ThermalOverlayEngine.resetSession("S1");
      const high = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("critical", 900, 1.0),
      );
      expect(low.thermal_damage_risk).toBe(0.0);
      expect(high.thermal_damage_risk).toBe(1.0);
    });
  });

  describe("transition detection", () => {
    it("does not flag the first frame as a transition", () => {
      const frame = ThermalOverlayEngine.renderFrame(
        "S1",
        BASE_POINT,
        overlayWithTemp("nominal", 200, 0.1),
      );
      expect(frame.transition).toBe(false);
    });

    it("flags a nominal → critical transition with magenta override", () => {
      ThermalOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithTemp("nominal", 200, 0.1),
      );
      const flip = ThermalOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.1 },
        overlayWithTemp("critical", 880, 0.95),
      );
      expect(flip.transition).toBe(true);
      expect(flip.state).toBe("transition");
      expect(flip.color_hex).toBe("#d946ef");
    });

    it("does not re-flag transition when state holds steady", () => {
      const f1 = ThermalOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0 },
        overlayWithTemp("elevated", 500, 0.5),
      );
      const f2 = ThermalOverlayEngine.renderFrame(
        "S1",
        { ...BASE_POINT, time_s: 0.1 },
        overlayWithTemp("elevated", 510, 0.52),
      );
      expect(f1.transition).toBe(false);
      expect(f2.transition).toBe(false);
      expect(f2.state).toBe("elevated");
    });

    it("flips the transition flag on each classification change", () => {
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("nominal", 150, 0.05));
      const f1 = ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("elevated", 450, 0.4));
      const f2 = ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("elevated", 470, 0.45));
      const f3 = ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("critical", 870, 0.9));
      const f4 = ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("nominal", 180, 0.08));
      expect(f1.transition).toBe(true);
      expect(f2.transition).toBe(false);
      expect(f3.transition).toBe(true);
      expect(f4.transition).toBe(true);
    });
  });

  describe("plugin target encoding", () => {
    const point: OperationPoint = {
      ...BASE_POINT,
      operation_id: "OP-THM-X",
    };
    const overlay = overlayWithTemp("critical", 825.6, 0.91);

    it("encodes hyperMILL XML-RPC frame", () => {
      const frame = ThermalOverlayEngine.renderFrame("S1", point, overlay, "hypermill");
      expect(frame.target).toBe("hypermill");
      expect(frame.payload).toContain("<methodCall>");
      expect(frame.payload).toContain("PRISM.ThermalOverlay");
      expect(frame.payload).toContain("OP-THM-X");
      expect(frame.payload).toContain("825.6");
      expect(frame.payload).toContain("0.910");
      expect(frame.payload).toContain("critical");
    });

    it("encodes Fusion 360 JSON-RPC frame", () => {
      const frame = ThermalOverlayEngine.renderFrame("S1", point, overlay, "fusion360");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.method).toBe("cam.thermalOverlay");
      expect(parsed.params.operationId).toBe("OP-THM-X");
      expect(parsed.params.temperatureC).toBeCloseTo(825.6, 5);
      expect(parsed.params.damageRisk).toBeCloseTo(0.91, 5);
      expect(parsed.params.state).toBe("critical");
      expect(parsed.params.colorHex).toBe("#dc2626");
    });

    it("encodes Inventor HSM JSON frame", () => {
      const frame = ThermalOverlayEngine.renderFrame("S1", point, overlay, "inventor_hsm");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("hsm.thermalOverlay");
      expect(parsed.operationId).toBe("OP-THM-X");
      expect(parsed.temperature).toBeCloseTo(825.6, 5);
      expect(parsed.damageRisk).toBeCloseTo(0.91, 5);
      expect(parsed.state).toBe("critical");
    });

    it("encodes Mastercam NET-Hook pipe record", () => {
      const frame = ThermalOverlayEngine.renderFrame("S1", point, overlay, "mastercam");
      expect(frame.payload.startsWith("THERM|OP-THM-X|825.6|")).toBe(true);
      const fields = frame.payload.split("|");
      expect(fields).toHaveLength(7);
      expect(fields[3]).toBe("critical");
      expect(fields[4]).toBe("#dc2626");
      expect(fields[5]).toBe("0.910");
    });

    it("defaults to generic JSON when target omitted", () => {
      const frame = ThermalOverlayEngine.renderFrame("S1", point, overlay);
      expect(frame.target).toBe("generic");
      const parsed = JSON.parse(frame.payload);
      expect(parsed.type).toBe("thermal_overlay");
      expect(parsed.temperature_c).toBeCloseTo(825.6, 5);
    });

    it("lists all supported plugin targets", () => {
      const targets = ThermalOverlayEngine.supportedTargets();
      expect(targets).toEqual(["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"]);
    });
  });

  describe("session statistics", () => {
    it("returns zeros for unknown sessions", () => {
      const stats = ThermalOverlayEngine.getStats("never-existed");
      expect(stats.frames).toBe(0);
      expect(stats.critical_count).toBe(0);
      expect(stats.elevated_count).toBe(0);
      expect(stats.max_temperature_c).toBe(-Infinity);
      expect(stats.max_damage_risk).toBe(0);
      expect(stats.last_critical_time_s).toBeNull();
    });

    it("accumulates counts per classification", () => {
      ThermalOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0 }, overlayWithTemp("nominal", 200, 0.1));
      ThermalOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.1 }, overlayWithTemp("nominal", 210, 0.11));
      ThermalOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.2 }, overlayWithTemp("elevated", 480, 0.45));
      ThermalOverlayEngine.renderFrame("S1", { ...BASE_POINT, time_s: 0.3 }, overlayWithTemp("critical", 870, 0.93));
      const stats = ThermalOverlayEngine.getStats("S1");
      expect(stats.frames).toBe(4);
      expect(stats.nominal_count).toBe(2);
      expect(stats.elevated_count).toBe(1);
      expect(stats.critical_count).toBe(1);
      expect(stats.last_critical_time_s).toBeCloseTo(0.3, 5);
    });

    it("tracks max temperature and max damage risk across frames", () => {
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("nominal", 180, 0.08));
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("elevated", 520, 0.5));
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("critical", 905, 0.97));
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("elevated", 460, 0.42));
      const stats = ThermalOverlayEngine.getStats("S1");
      expect(stats.max_temperature_c).toBeCloseTo(905, 5);
      expect(stats.max_damage_risk).toBeCloseTo(0.97, 5);
    });

    it("counts transitions separately from classifications", () => {
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("nominal", 180, 0.08));
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("critical", 880, 0.95));
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("critical", 890, 0.96));
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("nominal", 190, 0.09));
      const stats = ThermalOverlayEngine.getStats("S1");
      expect(stats.transition_count).toBe(2);
      expect(stats.critical_count).toBe(2);
      expect(stats.nominal_count).toBe(2);
    });
  });

  describe("session isolation", () => {
    it("keeps per-session state independent", () => {
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("critical", 900, 0.95));
      const frameS2 = ThermalOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithTemp("nominal", 180, 0.08));
      // S2's first frame cannot be a transition — S1 state must not leak.
      expect(frameS2.transition).toBe(false);
      expect(frameS2.state).toBe("nominal");

      const s1Stats = ThermalOverlayEngine.getStats("S1");
      const s2Stats = ThermalOverlayEngine.getStats("S2");
      expect(s1Stats.critical_count).toBe(1);
      expect(s2Stats.critical_count).toBe(0);
      expect(s2Stats.nominal_count).toBe(1);
    });

    it("resetSession clears only the requested session", () => {
      ThermalOverlayEngine.renderFrame("S1", BASE_POINT, overlayWithTemp("critical", 900, 0.95));
      ThermalOverlayEngine.renderFrame("S2", BASE_POINT, overlayWithTemp("elevated", 500, 0.5));
      ThermalOverlayEngine.resetSession("S1");

      const s1 = ThermalOverlayEngine.getStats("S1");
      const s2 = ThermalOverlayEngine.getStats("S2");
      expect(s1.frames).toBe(0);
      expect(s2.frames).toBe(1);
    });
  });

  describe("input validation", () => {
    it("rejects a malformed overlay via Zod parse", () => {
      const bad = overlayWithTemp("nominal", 200, 0.1) as unknown as PhysicsOverlay;
      // invalidate thermal_damage_risk (range [0..1])
      (bad.temperature as { thermal_damage_risk: number }).thermal_damage_risk = 1.5;
      expect(() =>
        ThermalOverlayEngine.renderFrame("S1", BASE_POINT, bad),
      ).toThrow();
    });

    it("rejects a malformed OperationPoint via Zod parse", () => {
      const bad = { ...BASE_POINT, time_s: "zero" as unknown as number };
      expect(() =>
        ThermalOverlayEngine.renderFrame(
          "S1",
          bad as OperationPoint,
          overlayWithTemp("nominal", 200, 0.1),
        ),
      ).toThrow();
    });
  });
});
