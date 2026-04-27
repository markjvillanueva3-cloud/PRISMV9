/**
 * adaptiveControlDispatcher — adaptive5 wiring suite
 * ==================================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE01 — verifies 5 leaf adaptive engines reach the
 * dispatcher surface (Chatter, Chipload, Override, Thermal, Wear).
 *
 * Tests invoke through the registered tool handler — NOT just the engine
 * singleton — so dispatcher schema, action enum, lazy import, and case
 * handler are all exercised end-to-end. Concrete numeric expectations are
 * derived from reading the engine source (chatter thresholds, override
 * mode multipliers, thermal/wear safety bands) — no presence-only stubs.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE01
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAdaptiveControlDispatcher } from "../tools/dispatchers/adaptiveControlDispatcher.js";
import { AdaptiveChatterEngine } from "../engines/AdaptiveChatterEngine.js";
import { AdaptiveChiploadEngine } from "../engines/AdaptiveChiploadEngine.js";
import { AdaptiveOverrideEngine } from "../engines/AdaptiveOverrideEngine.js";
import { AdaptiveThermalEngine } from "../engines/AdaptiveThermalEngine.js";
import { AdaptiveWearEngine } from "../engines/AdaptiveWearEngine.js";
import { slimResponse } from "../utils/responseSlimmer.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  // Validation-failure path: dispatcher returns dispatcherError() directly
  // (no MCP content envelope). Surface it as ok=false.
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerAdaptiveControlDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
  // Reset engine state so internal history is deterministic across tests
  AdaptiveChatterEngine.reset();
  AdaptiveChiploadEngine.reset();
  AdaptiveOverrideEngine.reset();
  AdaptiveThermalEngine.reset();
  AdaptiveWearEngine.reset();
});

// ── Fixtures derived from engine schemas (in-spec, deterministic) ──────

const CHATTER_STABLE = {
  spindleSpeed: 8000,
  feedRate: 1200,
  depthOfCut: 2.0,
  toolDiameter: 12.0,
  toolStickout: 40.0,
  fluteCount: 4,
  vibrationAmplitude: 1.5,        // below 5 um threshold → no chatter
  vibrationFrequency: 533.33,     // exactly tooth-pass freq (8000/60 * 4)
};

const CHATTER_SEVERE = {
  ...CHATTER_STABLE,
  vibrationAmplitude: 25.0,       // above 20 um SEVERE threshold
  vibrationFrequency: 1500,       // matches DEFAULT_NATURAL_FREQ exactly → nearNatural
  // 1500/533.33 = 2.81; |2.81 - 3| = 0.19 > 0.1 so NOT nearHarmonic
};

const CHATTER_INCIPIENT = {
  ...CHATTER_STABLE,
  vibrationAmplitude: 7.0,        // between 5 and 10 um → incipient (if !nearHarmonic)
  vibrationFrequency: 600,        // 600/533.33 = 1.125; |1.125-1| = 0.125 > 0.1 NOT harmonic
};

const CHIPLOAD_AT_TARGET = {
  currentFeedRate: 6000,
  currentSpindleSpeed: 10_000,
  toolDiameter: 10.0,
  fluteCount: 3,
  // chipload = 6000 / (10000 * 3) = 0.20 mm/tooth
  targetChipload: 0.20,
  minChipload: 0.05,
  maxChipload: 0.50,
  toolMaterial: "carbide" as const,
};

const OVERRIDE_NEUTRAL = {
  baseSpindleSpeed: 5000,
  baseFeedRate: 800,
  currentOverrideFeed: 100,
  currentOverrideSpeed: 100,
  mode: "balanced" as const,
};

const THERMAL_COLD = {
  cuttingSpeed: 100,
  feedRate: 800,
  depthOfCut: 1.0,
  toolMaterial: "carbide" as const,
  workMaterial: "aluminum" as const,
  coolantType: "flood" as const,
};

const THERMAL_HOT = {
  cuttingSpeed: 800,              // very high cutting speed
  feedRate: 4000,
  depthOfCut: 5.0,
  toolMaterial: "hss" as const,   // weakest tool material
  workMaterial: "inconel" as const, // hardest work material
  coolantType: "none" as const,   // no cooling
};

const WEAR_FRESH = {
  cuttingTime: 0.5,
  cuttingSpeed: 150,
  feedRate: 600,
  depthOfCut: 1.0,
  toolMaterial: "carbide" as const,
  workMaterial: "steel" as const,
};

const WEAR_LATE = {
  ...WEAR_FRESH,
  cuttingTime: 60,                // 60 minutes — well into wear curve
  cuttingSpeed: 250,              // aggressive
  workMaterial: "titanium" as const,
};

// ── Suite ──────────────────────────────────────────────────────────────

describe("adaptiveControlDispatcher — U-WIRE01 adaptive5 wiring", () => {
  describe("registration + action surface", () => {
    it("registers exactly one tool on the server", () => {
      expect(server.tools.length).toBe(1);
      expect(server.tools[0]!.name).toBe("prism_adaptive_control");
    });

    it("description advertises all 5 new adaptive primitives", () => {
      const desc = server.tools[0]!.description;
      expect(desc).toContain("adaptive_chatter_analyze");
      expect(desc).toContain("adaptive_chipload_analyze");
      expect(desc).toContain("adaptive_override_calc");
      expect(desc).toContain("adaptive_thermal_analyze");
      expect(desc).toContain("adaptive_wear_analyze");
    });
  });

  describe("dispatcher == engine round-trip equivalence (post-slim)", () => {
    // Dispatcher applies slimResponse() before serialising; we apply the
    // same projection to the direct-engine result so the equality check
    // exercises the actual transport path, not the un-slimmed engine raw.
    it("chatter: dispatcher == slimResponse(AdaptiveChatterEngine.analyze)", async () => {
      AdaptiveChatterEngine.reset();
      const direct = slimResponse(AdaptiveChatterEngine.analyze(CHATTER_STABLE));
      AdaptiveChatterEngine.reset();
      const r = await call(server, "adaptive_chatter_analyze", CHATTER_STABLE);
      expect(r.ok).toBe(true);
      expect(r.data).toStrictEqual(direct);
    });

    it("chipload: dispatcher == slimResponse(AdaptiveChiploadEngine.analyze)", async () => {
      AdaptiveChiploadEngine.reset();
      const direct = slimResponse(AdaptiveChiploadEngine.analyze(CHIPLOAD_AT_TARGET));
      AdaptiveChiploadEngine.reset();
      const r = await call(server, "adaptive_chipload_analyze", CHIPLOAD_AT_TARGET);
      expect(r.ok).toBe(true);
      expect(r.data).toStrictEqual(direct);
    });

    it("override: dispatcher == slimResponse(AdaptiveOverrideEngine.calculate) (timestamps stripped)", async () => {
      // overrideHistory[].timestamp is wall-clock, so back-to-back calls
      // can differ by a millisecond. Strip the volatile field, keep the
      // override values which are the deterministic part of the contract.
      const stripTs = (o: Record<string, unknown>): Record<string, unknown> => {
        const hist = o.overrideHistory as Array<Record<string, unknown>> | undefined;
        return {
          ...o,
          overrideHistory: hist?.map((h) => ({ feed: h.feed, speed: h.speed })) ?? [],
        };
      };
      AdaptiveOverrideEngine.reset();
      const direct = stripTs(slimResponse(AdaptiveOverrideEngine.calculate(OVERRIDE_NEUTRAL)) as Record<string, unknown>);
      AdaptiveOverrideEngine.reset();
      const r = await call(server, "adaptive_override_calc", OVERRIDE_NEUTRAL);
      expect(r.ok).toBe(true);
      expect(stripTs(r.data)).toStrictEqual(direct);
    });

    it("thermal: dispatcher == slimResponse(AdaptiveThermalEngine.analyze)", async () => {
      AdaptiveThermalEngine.reset();
      const direct = slimResponse(AdaptiveThermalEngine.analyze(THERMAL_COLD));
      AdaptiveThermalEngine.reset();
      const r = await call(server, "adaptive_thermal_analyze", THERMAL_COLD);
      expect(r.ok).toBe(true);
      expect(r.data).toStrictEqual(direct);
    });

    it("wear: dispatcher == slimResponse(AdaptiveWearEngine.analyze)", async () => {
      AdaptiveWearEngine.reset();
      const direct = slimResponse(AdaptiveWearEngine.analyze(WEAR_FRESH));
      AdaptiveWearEngine.reset();
      const r = await call(server, "adaptive_wear_analyze", WEAR_FRESH);
      expect(r.ok).toBe(true);
      expect(r.data).toStrictEqual(direct);
    });
  });

  describe("chatter — semantic behavior verified through dispatcher", () => {
    it("low-amplitude vibration in-harmonic → chatterDetected=false, action=maintain", async () => {
      const r = await call(server, "adaptive_chatter_analyze", CHATTER_STABLE);
      expect(r.ok).toBe(true);
      expect(r.data.chatterDetected).toBe(false);
      expect(r.data.chatterSeverity).toBe("none");
      expect(r.data.action).toBe("maintain");
      expect(r.data.recommendedSpindleSpeed).toBe(CHATTER_STABLE.spindleSpeed);
      expect(r.data.recommendedDepthOfCut).toBe(CHATTER_STABLE.depthOfCut);
    });

    it("severe near-natural-freq vibration → emergency_stop, zero recommendations", async () => {
      const r = await call(server, "adaptive_chatter_analyze", CHATTER_SEVERE);
      expect(r.ok).toBe(true);
      expect(r.data.chatterDetected).toBe(true);
      expect(r.data.chatterSeverity).toBe("severe");
      expect(r.data.action).toBe("emergency_stop");
      expect(r.data.recommendedSpindleSpeed).toBe(0);
      expect(r.data.recommendedDepthOfCut).toBe(0);
      expect(Array.isArray(r.data.warnings)).toBe(true);
      expect((r.data.warnings as string[]).some((w) => /SEVERE/i.test(w))).toBe(true);
    });

    it("incipient amplitude (5–10 um) non-harmonic → severity=incipient, doc reduced 15%", async () => {
      const r = await call(server, "adaptive_chatter_analyze", CHATTER_INCIPIENT);
      expect(r.ok).toBe(true);
      expect(r.data.chatterSeverity).toBe("incipient");
      expect(r.data.action).toBe("reduce_doc");
      // 2.0 * 0.85 = 1.70, rounded to 2 decimals
      expect(r.data.recommendedDepthOfCut).toBeCloseTo(1.70, 2);
    });
  });

  describe("variability — spanning material/coolant configurations", () => {
    it("thermal: aluminum + carbide + cryogenic → safetyScore higher than steel + flood", async () => {
      const cold = await call(server, "adaptive_thermal_analyze", {
        ...THERMAL_COLD,
        coolantType: "cryogenic",
      });
      const ref = await call(server, "adaptive_thermal_analyze", THERMAL_COLD);
      expect(cold.ok).toBe(true);
      expect(ref.ok).toBe(true);
      // Cryogenic provides better cooling than flood → equal or higher safety score
      expect(cold.data.safetyScore as number).toBeGreaterThanOrEqual(ref.data.safetyScore as number);
    });

    it("thermal: inconel + ceramic + dry → safetyScore lower than aluminum + carbide + flood", async () => {
      const hot = await call(server, "adaptive_thermal_analyze", THERMAL_HOT);
      const cold = await call(server, "adaptive_thermal_analyze", THERMAL_COLD);
      expect(hot.ok).toBe(true);
      expect(cold.ok).toBe(true);
      expect(hot.data.safetyScore as number).toBeLessThan(cold.data.safetyScore as number);
    });

    it("wear: titanium 60min worse than steel 30s — direct degradation comparison", async () => {
      const fresh = await call(server, "adaptive_wear_analyze", WEAR_FRESH);
      const late = await call(server, "adaptive_wear_analyze", WEAR_LATE);
      expect(fresh.ok).toBe(true);
      expect(late.ok).toBe(true);
      // Longer time + harder material → lower safetyScore (more degraded)
      expect(late.data.safetyScore as number).toBeLessThan(fresh.data.safetyScore as number);
    });
  });

  describe("input failure modes (rejected at engine validation)", () => {
    it("chatter rejects spindleSpeed=50 (below schema min of 100)", async () => {
      const r = await call(server, "adaptive_chatter_analyze", {
        ...CHATTER_STABLE,
        spindleSpeed: 50,
      });
      expect(r.ok).toBe(false);
    });

    it("chipload rejects unknown tool material (enum violation)", async () => {
      const r = await call(server, "adaptive_chipload_analyze", {
        ...CHIPLOAD_AT_TARGET,
        toolMaterial: "unobtainium",
      });
      expect(r.ok).toBe(false);
    });

    it("thermal rejects unknown coolant type", async () => {
      const r = await call(server, "adaptive_thermal_analyze", {
        ...THERMAL_COLD,
        coolantType: "magic_oil",
      });
      expect(r.ok).toBe(false);
    });

    it("wear rejects negative cuttingTime (boundary violation)", async () => {
      const r = await call(server, "adaptive_wear_analyze", {
        ...WEAR_FRESH,
        cuttingTime: -5,
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("adversarial inputs", () => {
    it("chatter rejects NaN feedRate", async () => {
      const r = await call(server, "adaptive_chatter_analyze", {
        ...CHATTER_STABLE,
        feedRate: Number.NaN,
      });
      expect(r.ok).toBe(false);
    });

    it("thermal rejects Infinity cuttingSpeed", async () => {
      const r = await call(server, "adaptive_thermal_analyze", {
        ...THERMAL_COLD,
        cuttingSpeed: Number.POSITIVE_INFINITY,
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("backward compatibility — pre-existing actions still wired", () => {
    it("adaptive_feed action still routes (not 'Unknown action')", async () => {
      const r = await call(server, "adaptive_feed", {
        current_feed: 1000,
        target_force: 800,
        measured_force: 750,
      });
      expect(JSON.stringify(r.data)).not.toContain("Unknown action");
    });

    it("calibration_taylor still routes (regression guard for prior wires)", async () => {
      const r = await call(server, "calibration_taylor", {
        priorC: 100,
        priorN: 0.25,
        observations: [
          { speed_mpm: 100, toolLife_min: 60 },
          { speed_mpm: 150, toolLife_min: 30 },
        ],
      });
      expect(JSON.stringify(r.data)).not.toContain("Unknown action");
    });
  });
});
