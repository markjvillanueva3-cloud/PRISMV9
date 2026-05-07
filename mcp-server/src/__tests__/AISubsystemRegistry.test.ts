/**
 * AISubsystemRegistry Tests
 *
 * Tests the central registry for 348 AI engines with capability-based discovery.
 */

import { describe, it, expect } from "vitest";
import { aiSubsystemRegistry } from "../registries/AISubsystemRegistry.js";

describe("AISubsystemRegistry", () => {
  describe("getTotalCount", () => {
    it("should have 70+ registered engines", () => {
      const count = aiSubsystemRegistry.getTotalCount();
      expect(count).toBeGreaterThanOrEqual(70);
    });
  });

  describe("getSubsystem", () => {
    it("should return reasoning engines sorted by priority", () => {
      const reasoning = aiSubsystemRegistry.getSubsystem("reasoning");

      expect(reasoning.length).toBeGreaterThan(10);
      expect(reasoning[0].subsystem).toBe("reasoning");

      // Verify sorted by priority descending
      for (let i = 1; i < reasoning.length; i++) {
        expect(reasoning[i - 1].priority).toBeGreaterThanOrEqual(reasoning[i].priority);
      }
    });

    it("should return neural engines", () => {
      const neural = aiSubsystemRegistry.getSubsystem("neural");

      expect(neural.length).toBeGreaterThan(10);
      expect(neural.every(e => e.subsystem === "neural")).toBe(true);
    });

    it("should return adaptive engines", () => {
      const adaptive = aiSubsystemRegistry.getSubsystem("adaptive");

      expect(adaptive.length).toBeGreaterThan(10);
      expect(adaptive.some(e => e.capabilities.includes("feed_control"))).toBe(true);
    });

    it("should return knowledge engines including tribal", () => {
      const knowledge = aiSubsystemRegistry.getSubsystem("knowledge");

      expect(knowledge.length).toBeGreaterThan(0);
      expect(knowledge.some(e => e.capabilities.includes("tribal"))).toBe(true);
    });
  });

  describe("queryCapability", () => {
    it("should find force prediction engines", () => {
      const engines = aiSubsystemRegistry.queryCapability({
        capability: "force_prediction",
      });

      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].capabilities).toContain("force_prediction");
    });

    it("should filter by machine type", () => {
      const latheEngines = aiSubsystemRegistry.queryCapability({
        machineType: "lathe",
      });

      const millOnlyEngines = latheEngines.filter(e =>
        e.machineTypes.includes("mill") && !e.machineTypes.includes("lathe") && !e.machineTypes.includes("all")
      );

      // No mill-only engines should appear in lathe query
      expect(millOnlyEngines.length).toBe(0);
    });

    it("should filter by subsystem and capability", () => {
      const engines = aiSubsystemRegistry.queryCapability({
        subsystem: "adaptive",
        capability: "chatter_suppression",
      });

      expect(engines.length).toBeGreaterThan(0);
      expect(engines.every(e => e.subsystem === "adaptive")).toBe(true);
      expect(engines.every(e => e.capabilities.includes("chatter_suppression"))).toBe(true);
    });

    it("should filter by minimum priority", () => {
      const highPriority = aiSubsystemRegistry.queryCapability({
        minPriority: 9,
      });

      expect(highPriority.every(e => e.priority >= 9)).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return stats for all subsystems", () => {
      const stats = aiSubsystemRegistry.getStats();

      expect(stats.length).toBeGreaterThanOrEqual(6);

      const subsystemNames = stats.map(s => s.subsystem);
      expect(subsystemNames).toContain("reasoning");
      expect(subsystemNames).toContain("neural");
      expect(subsystemNames).toContain("adaptive");
      expect(subsystemNames).toContain("meta");
      expect(subsystemNames).toContain("xai");
    });

    it("should have capabilities for populated subsystems", () => {
      const stats = aiSubsystemRegistry.getStats();
      const populated = stats.filter(s => s.engineCount > 0);

      expect(populated.length).toBeGreaterThan(5);

      for (const s of populated) {
        expect(s.capabilities.length).toBeGreaterThan(0);
        expect(s.topEngines.length).toBeGreaterThan(0);
      }
    });
  });

  describe("findByName", () => {
    it("should find engine by class name", () => {
      const engine = aiSubsystemRegistry.findByName("CausalReasoningEngine");

      expect(engine).toBeDefined();
      expect(engine!.name).toBe("CausalReasoningEngine");
    });

    it("should find engine by export name", () => {
      const engine = aiSubsystemRegistry.findByName("causalReasoningEngine");

      expect(engine).toBeDefined();
      expect(engine!.exportName).toBe("causalReasoningEngine");
    });

    it("should return undefined for unknown engine", () => {
      const engine = aiSubsystemRegistry.findByName("NonExistentEngine");

      expect(engine).toBeUndefined();
    });
  });

  describe("getForMachineType", () => {
    it("should return all engines for 'all' machine type", () => {
      const allEngines = aiSubsystemRegistry.getForMachineType("all");
      const totalCount = aiSubsystemRegistry.getTotalCount();

      expect(allEngines.length).toBe(totalCount);
    });

    it("should return lathe-compatible engines", () => {
      const latheEngines = aiSubsystemRegistry.getForMachineType("lathe");

      // Should include lathe-specific and 'all' engines
      expect(latheEngines.length).toBeGreaterThan(50);

      for (const e of latheEngines) {
        expect(
          e.machineTypes.includes("lathe") || e.machineTypes.includes("all")
        ).toBe(true);
      }
    });

    it("should include machine-specific engines", () => {
      const latheEngines = aiSubsystemRegistry.getForMachineType("lathe");
      const latheNames = latheEngines.map(e => e.name);

      expect(latheNames).toContain("LatheDeepReasoningEngine");
      expect(latheNames).toContain("LatheAdaptiveMachiningEngine");
    });
  });

  describe("getAllCapabilities", () => {
    it("should return unique sorted capabilities", () => {
      const caps = aiSubsystemRegistry.getAllCapabilities();

      expect(caps.length).toBeGreaterThan(50);

      // Verify sorted
      for (let i = 1; i < caps.length; i++) {
        expect(caps[i - 1] <= caps[i]).toBe(true);
      }

      // Verify common capabilities exist
      expect(caps).toContain("force_prediction");
      expect(caps).toContain("chatter_suppression");
      expect(caps).toContain("tribal");
    });
  });

  describe("recommendForContext", () => {
    it("should recommend engines for milling context", () => {
      const recommendations = aiSubsystemRegistry.recommendForContext(
        "mill",
        ["force_prediction", "chatter_suppression"]
      );

      expect(recommendations.size).toBeGreaterThan(0);

      // Should have neural recommendations for force prediction
      const neural = recommendations.get("neural");
      expect(neural).toBeDefined();
      expect(neural!.some(e => e.capabilities.includes("force_prediction"))).toBe(true);

      // Should have adaptive recommendations for chatter
      const adaptive = recommendations.get("adaptive");
      expect(adaptive).toBeDefined();
    });

    it("should limit recommendations to 5 per subsystem", () => {
      const recommendations = aiSubsystemRegistry.recommendForContext("mill", []);

      for (const [, engines] of recommendations) {
        expect(engines.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
