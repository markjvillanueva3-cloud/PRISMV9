/**
 * Tests for LatheLoRADeploymentEngine — LATHE-LORA-MS0 U-LLR48
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRADeploymentEngine } from "../engines/LatheLoRADeploymentEngine.js";

describe("LatheLoRADeploymentEngine", () => {
  beforeEach(() => {
    latheLoRADeploymentEngine.reset();
    latheLoRADeploymentEngine.registerTarget({
      id: "prod-1",
      name: "Production",
      environment: "production",
      capacity: 100,
    });
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const c = latheLoRADeploymentEngine.getConfig();
      expect(c.default_strategy).toBe("canary");
      expect(c.canary_initial_percent).toBe(10);
    });

    it("should update config", () => {
      latheLoRADeploymentEngine.setConfig({ default_strategy: "blue_green" });
      expect(latheLoRADeploymentEngine.getConfig().default_strategy).toBe("blue_green");
    });
  });

  describe("Target Management", () => {
    it("should register target", () => {
      const t = latheLoRADeploymentEngine.getTarget("prod-1");
      expect(t).toBeDefined();
      expect(t!.environment).toBe("production");
    });

    it("should list targets", () => {
      expect(latheLoRADeploymentEngine.getTargets().length).toBe(1);
    });
  });

  describe("Deployment Creation", () => {
    it("should create deployment", () => {
      const d = latheLoRADeploymentEngine.deploy("model-a", "v1.0", "prod-1");
      expect(d).not.toBeNull();
      expect(d!.status).toBe("pending");
      expect(d!.strategy).toBe("canary");
      expect(d!.canary_percent).toBe(10);
    });

    it("should return null for unknown target", () => {
      expect(latheLoRADeploymentEngine.deploy("m", "v1", "unknown")).toBeNull();
    });

    it("should set canary=100 for immediate strategy", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1", "immediate");
      expect(d!.canary_percent).toBe(100);
    });
  });

  describe("Deployment Lifecycle", () => {
    it("should begin deployment", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      expect(latheLoRADeploymentEngine.beginDeployment(d!.id)).toBe(true);
      expect(d!.status).toBe("deploying");
    });

    it("should activate deployment", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.beginDeployment(d!.id);
      latheLoRADeploymentEngine.activate(d!.id);
      expect(d!.status).toBe("active");
      expect(d!.canary_percent).toBe(100);
    });

    it("should supersede previous active deployment", () => {
      const d1 = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.activate(d1!.id);
      const d2 = latheLoRADeploymentEngine.deploy("m", "v2", "prod-1");
      latheLoRADeploymentEngine.activate(d2!.id);
      expect(d1!.status).toBe("superseded");
      expect(d2!.status).toBe("active");
    });
  });

  describe("Canary Rollout", () => {
    it("should advance canary percent", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.beginDeployment(d!.id);
      latheLoRADeploymentEngine.advanceCanary(d!.id);
      expect(d!.canary_percent).toBe(30);
    });

    it("should activate when canary reaches 100", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.beginDeployment(d!.id);
      for (let i = 0; i < 5; i++) {
        latheLoRADeploymentEngine.advanceCanary(d!.id);
      }
      expect(d!.status).toBe("active");
    });

    it("should rollback on unhealthy canary", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.beginDeployment(d!.id);
      d!.health_score = 0.5;
      latheLoRADeploymentEngine.advanceCanary(d!.id);
      expect(d!.status).toBe("rolled_back");
    });
  });

  describe("Health Updates", () => {
    it("should update health", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.updateHealth(d!.id, 0.85);
      expect(d!.health_score).toBe(0.85);
    });

    it("should clamp to [0,1]", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.updateHealth(d!.id, 1.5);
      expect(d!.health_score).toBe(1);
    });

    it("should trigger rollback on low health", () => {
      const d1 = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.activate(d1!.id);
      const d2 = latheLoRADeploymentEngine.deploy("m", "v2", "prod-1");
      latheLoRADeploymentEngine.activate(d2!.id);
      latheLoRADeploymentEngine.updateHealth(d2!.id, 0.5);
      expect(d2!.status).toBe("rolled_back");
      expect(d1!.status).toBe("active"); // restored
    });
  });

  describe("Rollback", () => {
    it("should rollback deployment", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.activate(d!.id);
      latheLoRADeploymentEngine.rollback(d!.id);
      expect(d!.status).toBe("rolled_back");
      expect(d!.rolled_back_at).toBeDefined();
    });
  });

  describe("Lookups", () => {
    it("should get active deployment for target", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.activate(d!.id);
      const active = latheLoRADeploymentEngine.getActiveDeployment("prod-1");
      expect(active!.id).toBe(d!.id);
    });

    it("should get deployments for target", () => {
      latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.deploy("m", "v2", "prod-1");
      expect(latheLoRADeploymentEngine.getDeploymentsForTarget("prod-1").length).toBe(2);
    });
  });

  describe("Stats", () => {
    it("should compute stats", () => {
      const d = latheLoRADeploymentEngine.deploy("m", "v1", "prod-1");
      latheLoRADeploymentEngine.activate(d!.id);
      const stats = latheLoRADeploymentEngine.getStats();
      expect(stats.total_deployments).toBe(1);
      expect(stats.active).toBe(1);
    });

    it("should return summary", () => {
      expect(latheLoRADeploymentEngine.getSummary()).toContain("Deployment");
    });
  });
});
