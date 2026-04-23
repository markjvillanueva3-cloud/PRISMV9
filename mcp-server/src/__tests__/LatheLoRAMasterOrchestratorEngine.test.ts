/**
 * Tests for LatheLoRAMasterOrchestratorEngine — LATHE-LORA-MS0 U-LLR50
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAMasterOrchestratorEngine } from "../engines/LatheLoRAMasterOrchestratorEngine.js";

describe("LatheLoRAMasterOrchestratorEngine", () => {
  beforeEach(() => {
    latheLoRAMasterOrchestratorEngine.reset();
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const c = latheLoRAMasterOrchestratorEngine.getConfig();
      expect(c.auto_transition).toBe(true);
      expect(c.degraded_subsystem_threshold).toBe(0.3);
    });

    it("should update config", () => {
      latheLoRAMasterOrchestratorEngine.setConfig({ auto_transition: false });
      expect(latheLoRAMasterOrchestratorEngine.getConfig().auto_transition).toBe(false);
    });
  });

  describe("Initialization", () => {
    it("should initialize system", () => {
      const s = latheLoRAMasterOrchestratorEngine.initialize();
      expect(s.id).toMatch(/^master-/);
      expect(s.current_phase).toBe("data_collection");
      expect(s.overall_health).toBe("initializing");
    });

    it("should return null state when not initialized", () => {
      expect(latheLoRAMasterOrchestratorEngine.getState()).toBeNull();
    });
  });

  describe("Subsystem Management", () => {
    it("should register subsystem", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      expect(
        latheLoRAMasterOrchestratorEngine.registerSubsystem("trainer", "training"),
      ).toBe(true);
      const s = latheLoRAMasterOrchestratorEngine.getState();
      expect(s!.subsystems.size).toBe(1);
    });

    it("should fail to register without init", () => {
      expect(
        latheLoRAMasterOrchestratorEngine.registerSubsystem("trainer", "training"),
      ).toBe(false);
    });

    it("should update subsystem status", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.registerSubsystem("trainer", "training");
      latheLoRAMasterOrchestratorEngine.updateSubsystem("trainer", { health: "healthy" });
      const s = latheLoRAMasterOrchestratorEngine.getState();
      expect(s!.subsystems.get("trainer")!.health).toBe("healthy");
    });

    it("should update subsystem metrics", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.registerSubsystem("trainer", "training");
      latheLoRAMasterOrchestratorEngine.updateMetrics("trainer", { loss: 0.3 });
      const s = latheLoRAMasterOrchestratorEngine.getState();
      expect(s!.subsystems.get("trainer")!.metrics.loss).toBe(0.3);
    });
  });

  describe("Phase Transitions", () => {
    it("should transition forward", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      expect(latheLoRAMasterOrchestratorEngine.transition("training")).toBe(true);
      expect(latheLoRAMasterOrchestratorEngine.getState()!.current_phase).toBe("training");
    });

    it("should allow transition to maintenance from anywhere", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.transition("training");
      latheLoRAMasterOrchestratorEngine.transition("production");
      expect(latheLoRAMasterOrchestratorEngine.transition("maintenance")).toBe(true);
    });

    it("should reject backwards transition", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.transition("training");
      expect(latheLoRAMasterOrchestratorEngine.transition("data_collection")).toBe(false);
    });
  });

  describe("Operations Tracking", () => {
    it("should track operations", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.beginOperation();
      latheLoRAMasterOrchestratorEngine.beginOperation();
      latheLoRAMasterOrchestratorEngine.endOperation();
      const s = latheLoRAMasterOrchestratorEngine.getState();
      expect(s!.active_operations).toBe(1);
      expect(s!.total_operations).toBe(2);
    });
  });

  describe("Health Computation", () => {
    it("should report healthy when all subsystems healthy", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.registerSubsystem("s1", "production");
      latheLoRAMasterOrchestratorEngine.updateSubsystem("s1", { health: "healthy" });
      expect(latheLoRAMasterOrchestratorEngine.healthCheck()).toBe("healthy");
    });

    it("should report unhealthy when many subsystems unhealthy", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.registerSubsystem("s1", "production");
      latheLoRAMasterOrchestratorEngine.registerSubsystem("s2", "production");
      latheLoRAMasterOrchestratorEngine.updateSubsystem("s1", { health: "unhealthy" });
      latheLoRAMasterOrchestratorEngine.updateSubsystem("s2", { health: "healthy" });
      const h = latheLoRAMasterOrchestratorEngine.healthCheck();
      expect(["degraded", "unhealthy"]).toContain(h);
    });

    it("should report initializing when no subsystems", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      expect(latheLoRAMasterOrchestratorEngine.healthCheck()).toBe("initializing");
    });
  });

  describe("Events", () => {
    it("should record events", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.registerSubsystem("s1", "training");
      latheLoRAMasterOrchestratorEngine.transition("training");
      const events = latheLoRAMasterOrchestratorEngine.getEvents();
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("Shutdown", () => {
    it("should shutdown system", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      expect(latheLoRAMasterOrchestratorEngine.shutdown()).toBe(true);
      expect(latheLoRAMasterOrchestratorEngine.getState()!.current_phase).toBe("decommissioning");
    });
  });

  describe("Stats", () => {
    it("should return empty stats when not initialized", () => {
      const stats = latheLoRAMasterOrchestratorEngine.getStats();
      expect(stats.initialized).toBe(false);
    });

    it("should compute stats", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      latheLoRAMasterOrchestratorEngine.registerSubsystem("s1", "training");
      latheLoRAMasterOrchestratorEngine.updateSubsystem("s1", { health: "healthy" });
      const stats = latheLoRAMasterOrchestratorEngine.getStats();
      expect(stats.initialized).toBe(true);
      expect(stats.total_subsystems).toBe(1);
      expect(stats.healthy_subsystems).toBe(1);
    });

    it("should return summary when initialized", () => {
      latheLoRAMasterOrchestratorEngine.initialize();
      expect(latheLoRAMasterOrchestratorEngine.getSummary()).toContain("LatheLoRA Master");
    });

    it("should return uninitialized summary", () => {
      expect(latheLoRAMasterOrchestratorEngine.getSummary()).toContain("Not initialized");
    });
  });
});
