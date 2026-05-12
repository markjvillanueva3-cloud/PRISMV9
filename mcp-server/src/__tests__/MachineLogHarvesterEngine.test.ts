/**
 * MachineLogHarvesterEngine Tests � U-AWR30
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MachineLogHarvesterEngine } from "../engines/MachineLogHarvesterEngine.js";

describe("MachineLogHarvesterEngine", () => {
  beforeEach(() => { MachineLogHarvesterEngine.reset(); });

  describe("registerFile", () => {
    it("registers a log file", () => {
      MachineLogHarvesterEngine.registerFile("/logs/machine.log");
      const stats = MachineLogHarvesterEngine.getQueueStats();
      expect(stats.queued).toBe(1);
    });
  });

  describe("registerBatch", () => {
    it("registers multiple files", () => {
      MachineLogHarvesterEngine.registerBatch(["/a.log", "/b.ini", "/c.cfg"]);
      const stats = MachineLogHarvesterEngine.getQueueStats();
      expect(stats.queued).toBe(3);
    });
  });

  describe("harvestFile", () => {
    it("harvests patterns from log content", () => {
      MachineLogHarvesterEngine.registerFile("/machine.log");
      const result = MachineLogHarvesterEngine.harvestFile("/machine.log", "ALARM 123\nERROR: Motor fault");
      expect(result.success).toBe(true);
      expect(result.alarms.length).toBeGreaterThan(0);
    });

    it("parses INI-style config files", () => {
      MachineLogHarvesterEngine.registerFile("/config.ini");
      const result = MachineLogHarvesterEngine.harvestFile("/config.ini", "[Settings]\nSpeed=1000\nFeed=0.1");
      expect(result.parameters.length).toBeGreaterThan(0);
    });

    it("detects file type from extension", () => {
      MachineLogHarvesterEngine.registerFile("/data.cfg");
      const result = MachineLogHarvesterEngine.harvestFile("/data.cfg", "key=value");
      expect(result.metadata.type).toBe("cfg");
    });

    it("extracts alarm codes", () => {
      MachineLogHarvesterEngine.registerFile("/machine.log");
      const result = MachineLogHarvesterEngine.harvestFile("/machine.log", "ALARM 100\nALARM 200\nALARM 100");
      expect(result.alarms).toContain("100");
      expect(result.alarms).toContain("200");
    });

    it("generates insights for high alarm count", () => {
      MachineLogHarvesterEngine.registerFile("/machine.log");
      const content = Array(10).fill("ALARM 999").join("\n");
      const result = MachineLogHarvesterEngine.harvestFile("/machine.log", content);
      expect(result.insights.some(i => i.includes("alarm"))).toBe(true);
    });
  });

  describe("harvestBatch", () => {
    it("processes all registered files", () => {
      MachineLogHarvesterEngine.registerBatch(["/a.log", "/b.ini"]);
      const contentMap = new Map([["/a.log", "data"], ["/b.ini", "key=val"]]);
      const results = MachineLogHarvesterEngine.harvestBatch(contentMap);
      expect(results.totalFiles).toBe(2);
    });
  });

  describe("getResult", () => {
    it("retrieves cached result", () => {
      MachineLogHarvesterEngine.registerFile("/machine.log");
      MachineLogHarvesterEngine.harvestFile("/machine.log", "data");
      expect(MachineLogHarvesterEngine.getResult("/machine.log")).not.toBeNull();
    });

    it("returns null for unknown file", () => {
      expect(MachineLogHarvesterEngine.getResult("/unknown.log")).toBeNull();
    });
  });

  describe("findByAlarm", () => {
    it("finds files containing alarm code", () => {
      MachineLogHarvesterEngine.registerFile("/a.log");
      MachineLogHarvesterEngine.registerFile("/b.log");
      MachineLogHarvesterEngine.harvestFile("/a.log", "ALARM 123");
      MachineLogHarvesterEngine.harvestFile("/b.log", "ALARM 456");
      const found = MachineLogHarvesterEngine.findByAlarm("123");
      expect(found).toHaveLength(1);
    });
  });

  describe("getGlobalPatternStats", () => {
    it("returns global pattern statistics", () => {
      MachineLogHarvesterEngine.registerFile("/a.log");
      MachineLogHarvesterEngine.harvestFile("/a.log", "ALARM 100\nALARM 100\nALARM 200");
      const stats = MachineLogHarvesterEngine.getGlobalPatternStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byCategory.alarm).toBeGreaterThan(0);
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      MachineLogHarvesterEngine.registerBatch(["/a.log", "/b.log", "/c.ini"]);
      const stats = MachineLogHarvesterEngine.getQueueStats();
      expect(stats.queued).toBe(3);
      expect(stats.byType.log).toBe(2);
      expect(stats.byType.ini).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      MachineLogHarvesterEngine.registerFile("/machine.log");
      MachineLogHarvesterEngine.harvestFile("/machine.log", "ALARM 123");
      MachineLogHarvesterEngine.reset();
      expect(MachineLogHarvesterEngine.getQueueStats().queued).toBe(0);
      expect(MachineLogHarvesterEngine.getAllResults()).toHaveLength(0);
      expect(MachineLogHarvesterEngine.getGlobalPatternStats().total).toBe(0);
    });
  });
});
