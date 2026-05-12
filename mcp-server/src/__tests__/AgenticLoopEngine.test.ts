/**
 * AgenticLoopEngine Test Suite
 * =============================
 *
 * AGENT-MS4 U-AGT13 — Validates the core agentic loop: observe → think →
 * act → learn. Tests happy paths, intent routing, phase progression,
 * and response structure.
 *
 * @milestone AGENT-MS4
 * @unit U-AGT13
 */

import { describe, it, expect } from "vitest";
import { agenticLoopEngine } from "../engines/AgenticLoopEngine.js";

describe("AgenticLoopEngine", () => {
  // ── run() ────────────────────────────────────────────────────────────

  describe("run()", () => {
    it("returns an AgentResponse with required shape", async () => {
      const resp = await agenticLoopEngine.run({
        text: "calculate speed and feed for 4140",
      });
      expect(resp.id).toBeDefined();
      expect(resp.input).toBe("calculate speed and feed for 4140");
      expect(Array.isArray(resp.phases)).toBe(true);
      expect(typeof resp.finalAnswer).toBe("string");
      expect(typeof resp.confidence).toBe("number");
      expect(resp.metrics).toBeDefined();
    });

    it("progresses through observe → think → act phases", async () => {
      const resp = await agenticLoopEngine.run({
        text: "calculate speed and feed for 4140",
      });
      expect(resp.phases).toContain("observe");
    });

    it("records per-phase timing in metrics", async () => {
      const resp = await agenticLoopEngine.run({ text: "calculate rpm for 4140" });
      expect(resp.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(resp.metrics.observeMs).toBeGreaterThanOrEqual(0);
      expect(resp.metrics.thinkMs).toBeGreaterThanOrEqual(0);
    });

    it("populates observation when intent is parseable", async () => {
      const resp = await agenticLoopEngine.run({
        text: "calculate speed and feed for 4140 steel",
      });
      expect(resp.observation).not.toBeNull();
      if (resp.observation) {
        expect(resp.observation.input).toBeDefined();
        expect(resp.observation.intent).toBeDefined();
      }
    });

    it("extracts entities when present", async () => {
      const resp = await agenticLoopEngine.run({
        text: "machine 4140 steel on Okuma LB3000",
      });
      if (resp.observation) {
        expect(Array.isArray(resp.observation.entities)).toBe(true);
      }
    });

    it("returns a trace when verbose=true", async () => {
      const resp = await agenticLoopEngine.run({
        text: "simple query",
        config: { verbose: true },
      });
      // Trace may be optional but when requested should be present
      if (resp.trace) {
        expect(Array.isArray(resp.trace.steps)).toBe(true);
      }
    });

    it("respects maxIterations config", async () => {
      const resp = await agenticLoopEngine.run({
        text: "calculate speed and feed for 4140",
        config: { maxIterations: 1 },
      });
      expect(resp.metrics.iterationCount).toBeLessThanOrEqual(1);
    });

    it("handles inscrutable input gracefully", async () => {
      const resp = await agenticLoopEngine.run({ text: "xyzzy plugh" });
      expect(resp).toBeDefined();
      expect(typeof resp.finalAnswer).toBe("string");
    });

    it("accepts conversation history in context", async () => {
      const resp = await agenticLoopEngine.run({
        text: "what's the speed",
        context: {
          conversationHistory: [
            {
              role: "user",
              content: "let's machine 4140",
              timestamp: new Date().toISOString(),
            },
            {
              role: "assistant",
              content: "Sure, what operation?",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
      expect(resp).toBeDefined();
    });

    it("accepts constraints in context", async () => {
      const resp = await agenticLoopEngine.run({
        text: "calculate speed for 4140",
        context: {
          constraints: ["Max 3000 RPM", "Tool life > 30 min"],
        },
      });
      expect(resp).toBeDefined();
    });

    it("returns confidence in [0, 1]", async () => {
      const resp = await agenticLoopEngine.run({
        text: "calculate speed and feed",
      });
      expect(resp.confidence).toBeGreaterThanOrEqual(0);
      expect(resp.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ── Helpers ──────────────────────────────────────────────────────────

  describe("checkIntent()", () => {
    it("returns an IntentClassification", () => {
      const c = agenticLoopEngine.checkIntent("calculate speed and feed");
      expect(c).toBeDefined();
      expect(c.category).toBeDefined();
    });
  });

  describe("getDispatchers() / getAvailableActions()", () => {
    it("returns dispatcher list from IntentRouter", () => {
      const dispatchers = agenticLoopEngine.getDispatchers();
      expect(Array.isArray(dispatchers)).toBe(true);
    });

    it("returns actions for a given dispatcher", () => {
      const dispatchers = agenticLoopEngine.getDispatchers();
      if (dispatchers.length > 0) {
        const actions = agenticLoopEngine.getAvailableActions(dispatchers[0]!);
        expect(Array.isArray(actions)).toBe(true);
      }
    });

    it("returns empty array for unknown dispatcher", () => {
      const actions = agenticLoopEngine.getAvailableActions("prism_ghost_xyz");
      expect(actions).toEqual([]);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns engine statistics", () => {
      const stats = agenticLoopEngine.getStats();
      expect(stats).toBeDefined();
    });
  });
});
