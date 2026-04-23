/**
 * Tests for LatheLoRAResourceManagerEngine — LATHE-LORA-MS0 U-LLR46
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAResourceManagerEngine } from "../engines/LatheLoRAResourceManagerEngine.js";

describe("LatheLoRAResourceManagerEngine", () => {
  beforeEach(() => {
    latheLoRAResourceManagerEngine.reset();
    latheLoRAResourceManagerEngine.setPool("cpu_cores", 16);
    latheLoRAResourceManagerEngine.setPool("ram_mb", 64000);
    latheLoRAResourceManagerEngine.setPool("gpu_memory_mb", 24000);
  });

  describe("Configuration", () => {
    it("should have default config", () => {
      const c = latheLoRAResourceManagerEngine.getConfig();
      expect(c.quota_soft_limit).toBe(0.8);
      expect(c.quota_hard_limit).toBe(0.95);
    });

    it("should update config", () => {
      latheLoRAResourceManagerEngine.setConfig({ enable_quotas: false });
      expect(latheLoRAResourceManagerEngine.getConfig().enable_quotas).toBe(false);
    });
  });

  describe("Pool Management", () => {
    it("should set a pool", () => {
      const p = latheLoRAResourceManagerEngine.getPool("cpu_cores");
      expect(p!.total).toBe(16);
    });

    it("should list all pools", () => {
      expect(latheLoRAResourceManagerEngine.getPools().length).toBe(3);
    });
  });

  describe("Can Allocate", () => {
    it("should allow fitting allocation", () => {
      expect(latheLoRAResourceManagerEngine.canAllocate({ cpu_cores: 4 })).toBe(true);
    });

    it("should reject exceeding allocation", () => {
      expect(latheLoRAResourceManagerEngine.canAllocate({ cpu_cores: 20 })).toBe(false);
    });

    it("should reject unknown pool", () => {
      expect(latheLoRAResourceManagerEngine.canAllocate({ disk_mb: 100 })).toBe(false);
    });

    it("should enforce hard quota", () => {
      latheLoRAResourceManagerEngine.allocate("owner1", { cpu_cores: 15 });
      expect(latheLoRAResourceManagerEngine.canAllocate({ cpu_cores: 1 })).toBe(false);
    });
  });

  describe("Allocation", () => {
    it("should allocate resources", () => {
      const a = latheLoRAResourceManagerEngine.allocate("owner1", { cpu_cores: 4, ram_mb: 8000 });
      expect(a).not.toBeNull();
      expect(a!.owner).toBe("owner1");
    });

    it("should update pool allocated amount", () => {
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 4 });
      const p = latheLoRAResourceManagerEngine.getPool("cpu_cores");
      expect(p!.allocated).toBe(4);
    });

    it("should return null if cannot fit", () => {
      expect(latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 100 })).toBeNull();
    });
  });

  describe("Release", () => {
    it("should release resources", () => {
      const a = latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 4 });
      latheLoRAResourceManagerEngine.release(a!.id);
      const p = latheLoRAResourceManagerEngine.getPool("cpu_cores");
      expect(p!.allocated).toBe(0);
    });

    it("should handle unknown id", () => {
      expect(latheLoRAResourceManagerEngine.release("unknown")).toBe(false);
    });
  });

  describe("Reservation", () => {
    it("should reserve resources", () => {
      expect(latheLoRAResourceManagerEngine.reserve({ cpu_cores: 2 })).toBe(true);
      expect(latheLoRAResourceManagerEngine.getPool("cpu_cores")!.reserved).toBe(2);
    });

    it("should unreserve resources", () => {
      latheLoRAResourceManagerEngine.reserve({ cpu_cores: 2 });
      latheLoRAResourceManagerEngine.unreserve({ cpu_cores: 2 });
      expect(latheLoRAResourceManagerEngine.getPool("cpu_cores")!.reserved).toBe(0);
    });
  });

  describe("Utilization", () => {
    it("should compute utilization", () => {
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 8 });
      expect(latheLoRAResourceManagerEngine.getUtilization("cpu_cores")).toBe(0.5);
    });

    it("should return 0 for unknown pool", () => {
      expect(latheLoRAResourceManagerEngine.getUtilization("disk_mb")).toBe(0);
    });
  });

  describe("Owner Lookup", () => {
    it("should list owner allocations", () => {
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 2 });
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 2 });
      latheLoRAResourceManagerEngine.allocate("o2", { cpu_cores: 2 });
      expect(latheLoRAResourceManagerEngine.getOwnerAllocations("o1").length).toBe(2);
    });
  });

  describe("Preemption", () => {
    it("should find low-priority allocations for preemption", () => {
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 10 }, "low");
      latheLoRAResourceManagerEngine.allocate("o2", { cpu_cores: 4 }, "high");
      const preempt = latheLoRAResourceManagerEngine.findPreemptable({ cpu_cores: 8 });
      expect(preempt.length).toBeGreaterThan(0);
      expect(preempt[0].priority).toBe("low");
    });

    it("should not preempt critical priority", () => {
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 16 }, "critical");
      const preempt = latheLoRAResourceManagerEngine.findPreemptable({ cpu_cores: 8 });
      expect(preempt.every(p => p.priority !== "critical")).toBe(true);
    });
  });

  describe("Stats", () => {
    it("should compute stats", () => {
      latheLoRAResourceManagerEngine.allocate("o1", { cpu_cores: 8 });
      const stats = latheLoRAResourceManagerEngine.getStats();
      expect(stats.total_pools).toBe(3);
      expect(stats.total_allocations).toBe(1);
    });

    it("should return summary", () => {
      expect(latheLoRAResourceManagerEngine.getSummary()).toContain("Resource Manager");
    });
  });
});
