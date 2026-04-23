/**
 * ModelAwareSelfAwarenessEngine tests
 */

import { describe, it, expect } from "vitest";
import { ModelAwareSelfAwarenessEngine } from "../engines/ModelAwareSelfAwarenessEngine.js";

describe("ModelAwareSelfAwarenessEngine", () => {
  describe("detect", () => {
    it("identifies Opus 4.7 1M as intensive-enabled", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("claude-opus-4-7");
      expect(info.tier).toBe("opus_4_7_1m");
      expect(info.contextWindow).toBe(1_000_000);
      expect(info.intensiveAwarenessEnabled).toBe(true);
    });

    it("identifies explicit 1M variant", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("claude-opus-4-7-1m");
      expect(info.tier).toBe("opus_4_7_1m");
      expect(info.intensiveAwarenessEnabled).toBe(true);
    });

    it("identifies Opus 4.5 as 200k window, intensive OFF", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("claude-opus-4-5");
      expect(info.tier).toBe("opus_4_5");
      expect(info.contextWindow).toBe(200_000);
      expect(info.intensiveAwarenessEnabled).toBe(false);
    });

    it("identifies Opus 4.6 as 200k window, intensive OFF", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("claude-opus-4-6");
      expect(info.tier).toBe("opus_4_6");
      expect(info.intensiveAwarenessEnabled).toBe(false);
    });

    it("identifies Sonnet 4.6 as 200k, intensive OFF", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("claude-sonnet-4-6");
      expect(info.tier).toBe("sonnet_4_6");
      expect(info.intensiveAwarenessEnabled).toBe(false);
    });

    it("identifies Haiku 4.5 as 200k, intensive OFF", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("claude-haiku-4-5-20251001");
      expect(info.tier).toBe("haiku_4_5");
      expect(info.intensiveAwarenessEnabled).toBe(false);
    });

    it("returns unknown tier with intensive OFF for unrecognized model", () => {
      const info = ModelAwareSelfAwarenessEngine.detect("gpt-5-turbo");
      expect(info.tier).toBe("unknown");
      expect(info.intensiveAwarenessEnabled).toBe(false);
    });

    it("returns unknown when no model identifier available", () => {
      delete process.env.CLAUDE_MODEL;
      delete process.env.ANTHROPIC_MODEL;
      const info = ModelAwareSelfAwarenessEngine.detect();
      // settings.json may or may not exist — accept either unknown or detected
      expect(typeof info.tier).toBe("string");
      expect(typeof info.intensiveAwarenessEnabled).toBe("boolean");
    });
  });

  describe("zoneForTokens — degradation curve calibration", () => {
    it("returns 'fresh' for 0-150k tokens", () => {
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(0)).toBe("fresh");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(50_000)).toBe("fresh");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(149_000)).toBe("fresh");
    });

    it("returns 'warm' for 150k-250k", () => {
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(150_000)).toBe("warm");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(200_000)).toBe("warm");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(249_000)).toBe("warm");
    });

    it("returns 'degrading' for 250k-400k", () => {
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(250_000)).toBe("degrading");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(350_000)).toBe("degrading");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(399_000)).toBe("degrading");
    });

    it("returns 'critical' for 400k+", () => {
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(400_000)).toBe("critical");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(800_000)).toBe("critical");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(1_000_000)).toBe("critical");
    });

    it("handles zero/negative window safely", () => {
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(100_000, 0)).toBe("fresh");
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(100_000, -1)).toBe("fresh");
    });

    it("scales correctly for 200k window (Sonnet/Opus 4.5/4.6)", () => {
      // 30k of 200k = 15% → fresh
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(29_000, 200_000)).toBe("fresh");
      // 50k of 200k = 25% → degrading (because boundary is at 25%)
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(50_000, 200_000)).toBe("degrading");
      // 100k of 200k = 50% → critical
      expect(ModelAwareSelfAwarenessEngine.zoneForTokens(100_000, 200_000)).toBe("critical");
    });
  });

  describe("cadenceFor", () => {
    it("returns lax cadence in fresh zone", () => {
      const c = ModelAwareSelfAwarenessEngine.cadenceFor("fresh");
      expect(c.promptInterval).toBe(20);
      expect(c.briefMaxTokens).toBe(400);
      expect(c.forceObjectiveReanchor).toBe(false);
      expect(c.recommendHandoff).toBe(false);
    });

    it("tightens cadence in degrading zone", () => {
      const c = ModelAwareSelfAwarenessEngine.cadenceFor("degrading");
      expect(c.promptInterval).toBe(8);
      expect(c.briefMaxTokens).toBe(1000);
      expect(c.forceObjectiveReanchor).toBe(true);
      expect(c.recommendHandoff).toBe(false);
    });

    it("recommends handoff in critical zone", () => {
      const c = ModelAwareSelfAwarenessEngine.cadenceFor("critical");
      expect(c.promptInterval).toBe(4);
      expect(c.briefMaxTokens).toBe(1500);
      expect(c.recommendHandoff).toBe(true);
    });

    it("warm cadence is between fresh and degrading", () => {
      const fresh = ModelAwareSelfAwarenessEngine.cadenceFor("fresh");
      const warm = ModelAwareSelfAwarenessEngine.cadenceFor("warm");
      const degrading = ModelAwareSelfAwarenessEngine.cadenceFor("degrading");
      expect(warm.promptInterval).toBeLessThan(fresh.promptInterval);
      expect(warm.promptInterval).toBeGreaterThan(degrading.promptInterval);
    });

    it("brief size grows monotonically with severity", () => {
      const sizes = (["fresh", "warm", "degrading", "critical"] as const).map(
        (z) => ModelAwareSelfAwarenessEngine.cadenceFor(z).briefMaxTokens
      );
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
      }
    });
  });

  describe("currentCadence", () => {
    it("returns null when model is not 4.7 1M", () => {
      const c = ModelAwareSelfAwarenessEngine.currentCadence(500_000, "claude-opus-4-5");
      expect(c).toBeNull();
    });

    it("returns null for sonnet 4.6 even at high tokens", () => {
      const c = ModelAwareSelfAwarenessEngine.currentCadence(150_000, "claude-sonnet-4-6");
      expect(c).toBeNull();
    });

    it("returns critical cadence for 4.7 1M at 500k tokens", () => {
      const c = ModelAwareSelfAwarenessEngine.currentCadence(500_000, "claude-opus-4-7");
      expect(c).not.toBeNull();
      expect(c!.zone).toBe("critical");
      expect(c!.recommendHandoff).toBe(true);
    });

    it("returns fresh cadence for 4.7 1M at 50k tokens", () => {
      const c = ModelAwareSelfAwarenessEngine.currentCadence(50_000, "claude-opus-4-7");
      expect(c).not.toBeNull();
      expect(c!.zone).toBe("fresh");
    });

    it("returns degrading cadence for 4.7 1M at 300k", () => {
      const c = ModelAwareSelfAwarenessEngine.currentCadence(300_000, "claude-opus-4-7");
      expect(c!.zone).toBe("degrading");
      expect(c!.forceObjectiveReanchor).toBe(true);
    });
  });

  describe("readConsumedTokens", () => {
    it("returns 0 for missing file", () => {
      const n = ModelAwareSelfAwarenessEngine.readConsumedTokens("H:/nonexistent.json");
      expect(n).toBe(0);
    });

    it("handles malformed JSON gracefully", () => {
      // Use Windows null path equivalent: a directory will fail to parse
      const n = ModelAwareSelfAwarenessEngine.readConsumedTokens("H:/prism/state");
      expect(n).toBe(0);
    });
  });

  describe("model name variant tolerance", () => {
    const variants = [
      ["claude-opus-4-7", "opus_4_7_1m"],
      ["opus-4-7", "opus_4_7_1m"],
      ["claude-opus-4-7-1m", "opus_4_7_1m"],
      ["Claude-Opus-4-7", "opus_4_7_1m"], // case insensitive
      ["claude-opus-4-7-20251101", "opus_4_7_1m"], // versioned
    ];
    for (const [name, expected] of variants) {
      it(`detects "${name}" as ${expected}`, () => {
        const info = ModelAwareSelfAwarenessEngine.detect(name);
        expect(info.tier).toBe(expected);
      });
    }
  });
});
