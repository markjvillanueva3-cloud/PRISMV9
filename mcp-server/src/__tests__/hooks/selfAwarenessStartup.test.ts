/**
 * Tests for selfAwarenessStartup hook
 */

import { describe, it, expect } from "vitest";
import {
  runSelfAwarenessStartup,
  quickSelfAwarenessCheck,
  getSelfAwarenessContext,
  sessionStartHook,
  compactSurvivalHook,
} from "../../hooks/selfAwarenessStartup.js";

describe("selfAwarenessStartup", () => {
  describe("runSelfAwarenessStartup", () => {
    it("should complete startup successfully", async () => {
      const result = await runSelfAwarenessStartup({
        reportToStdout: false
      });

      expect(result.success).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.manifest?.counts.dispatchers).toBe(82);
    });

    it("should return timing metrics", async () => {
      const result = await runSelfAwarenessStartup({
        reportToStdout: false
      });

      expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
      expect(result.timing.manifestMs).toBeGreaterThanOrEqual(0);
    });

    it("should use full context when budget allows", async () => {
      const result = await runSelfAwarenessStartup({
        contextMode: "auto",
        maxTokenBudget: 10000,
        reportToStdout: false
      });

      expect(result.contextSize).toBe("full");
    });

    it("should use minimal context when budget is tight", async () => {
      const result = await runSelfAwarenessStartup({
        contextMode: "auto",
        maxTokenBudget: 100,
        reportToStdout: false
      });

      expect(result.contextSize).toBe("minimal");
    });

    it("should respect explicit context mode", async () => {
      const fullResult = await runSelfAwarenessStartup({
        contextMode: "full",
        reportToStdout: false
      });
      expect(fullResult.contextSize).toBe("full");

      const minimalResult = await runSelfAwarenessStartup({
        contextMode: "minimal",
        reportToStdout: false
      });
      expect(minimalResult.contextSize).toBe("minimal");
    });

    it("should include success message", async () => {
      const result = await runSelfAwarenessStartup({
        reportToStdout: false
      });

      expect(result.message).toContain("Self-awareness loaded");
      expect(result.message).toContain("82d");
    });
  });

  describe("quickSelfAwarenessCheck", () => {
    it("should return compact status string", () => {
      const status = quickSelfAwarenessCheck();

      expect(status).toContain("PRISM:");
      expect(status).toContain("ready");
      expect(status).toMatch(/\d+d\/\d+a\/\d+e/);
    });

    it("should be under 100 characters", () => {
      const status = quickSelfAwarenessCheck();
      expect(status.length).toBeLessThan(100);
    });
  });

  describe("getSelfAwarenessContext", () => {
    it("should return full context by default", () => {
      const context = getSelfAwarenessContext();

      expect(context).toContain("# PRISM Agent Self-Awareness Context");
      expect(context.length).toBeGreaterThan(1000);
    });

    it("should return minimal context when requested", () => {
      const context = getSelfAwarenessContext("minimal");

      expect(context).toContain("PRISM:");
      expect(context.length).toBeLessThan(500);
    });

    it("should include key information in both modes", () => {
      const full = getSelfAwarenessContext("full");
      const minimal = getSelfAwarenessContext("minimal");

      // Both should mention dispatchers/actions/engines
      expect(full).toContain("Dispatchers");
      expect(minimal).toMatch(/\d+d/); // dispatchers count
    });
  });

  describe("sessionStartHook", () => {
    it("should have correct hook metadata", () => {
      expect(sessionStartHook.name).toBe("self-awareness-startup");
      expect(sessionStartHook.phase).toBe("pre");
      expect(sessionStartHook.priority).toBe(100);
    });

    it("should execute successfully", async () => {
      const result = await sessionStartHook.execute();

      expect(result.success).toBe(true);
      expect(result.output).toContain("Self-awareness");
    });
  });

  describe("compactSurvivalHook", () => {
    it("should have correct hook metadata", () => {
      expect(compactSurvivalHook.name).toBe("self-awareness-survival");
      expect(compactSurvivalHook.phase).toBe("post");
    });

    it("should execute and preserve context", async () => {
      const result = await compactSurvivalHook.execute();

      expect(result.success).toBe(true);
      expect(result.output).toContain("Self-awareness preserved");
      expect(result.output).toContain("PRISM:");
    });
  });
});
