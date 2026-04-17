/**
 * Tests for MachineLogHarvesterEngine — U-AWR30
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MachineLogHarvesterEngine,
  HarvestResult,
  LogEntry,
  AlarmRecord,
} from "../engines/MachineLogHarvesterEngine.js";

describe("MachineLogHarvesterEngine", () => {
  beforeEach(() => {
    MachineLogHarvesterEngine.reset();
  });

  describe("harvestLog", () => {
    it("harvests a log file", () => {
      const result = MachineLogHarvesterEngine.harvestLog("machine.log");
      expect(result).toBeDefined();
      expect(result.filePath).toBe("machine.log");
    });

    it("uses provided machine info", () => {
      const result = MachineLogHarvesterEngine.harvestLog("log.txt", {
        machineId: "LATHE-01",
        machineType: "lathe",
      });
      expect(result.machineId).toBe("LATHE-01");
      expect(result.machineType).toBe("lathe");
    });

    it("detects controller type from content", () => {
      const result = MachineLogHarvesterEngine.harvestLog("fanuc.log", {
        simulatedLines: ["FANUC Series 0i-MF Controller", "Program started"],
      });
      expect(result.controllerType).toBe("fanuc");
    });

    it("parses log entries", () => {
      const result = MachineLogHarvesterEngine.harvestLog("machine.log", {
        simulatedLines: [
          "2026-04-17 10:00:00 CYCLE START",
          "2026-04-17 10:05:00 T1 M06",
          "2026-04-17 10:30:00 CYCLE END",
        ],
      });
      expect(result.entries.length).toBe(3);
    });

    it("extracts alarms", () => {
      const result = MachineLogHarvesterEngine.harvestLog("alarms.log", {
        simulatedLines: [
          "2026-04-17 10:00:00 ALARM 123 Servo error",
          "2026-04-17 10:01:00 ERROR 456 Overtravel",
          "2026-04-17 10:02:00 WARNING 789 Low coolant",
        ],
      });
      expect(result.alarms.length).toBe(3);
    });

    it("tracks tool usage", () => {
      const result = MachineLogHarvesterEngine.harvestLog("tools.log", {
        simulatedLines: [
          "T1 M06 Tool change",
          "T2 M06 Tool change",
          "T1 M06 Tool change",
          "T3 M06 Tool change",
        ],
      });
      expect(result.toolUsage.length).toBe(3); // T1, T2, T3
      const t1 = result.toolUsage.find((t) => t.toolNumber === 1);
      expect(t1?.usageCount).toBe(2);
    });

    it("computes cycles from start/end pairs", () => {
      const result = MachineLogHarvesterEngine.harvestLog("cycles.log", {
        simulatedLines: [
          "2026-04-17 10:00:00 CYCLE START",
          "2026-04-17 10:05:00 CYCLE END",
          "2026-04-17 10:10:00 CYCLE START",
          "2026-04-17 10:20:00 CYCLE END",
        ],
      });
      expect(result.cycles.length).toBe(2);
      expect(result.cycles[0].durationSeconds).toBe(300); // 5 minutes
      expect(result.cycles[1].durationSeconds).toBe(600); // 10 minutes
    });
  });

  describe("controller detection", () => {
    it("detects Okuma OSP", () => {
      const result = MachineLogHarvesterEngine.harvestLog("okuma.log", {
        simulatedLines: ["OSP-P300M Controller"],
      });
      expect(result.controllerType).toBe("okuma");
    });

    it("detects Haas", () => {
      const result = MachineLogHarvesterEngine.harvestLog("haas.log", {
        simulatedLines: ["HAAS NGC Control"],
      });
      expect(result.controllerType).toBe("haas");
    });

    it("detects Siemens Sinumerik", () => {
      const result = MachineLogHarvesterEngine.harvestLog("siemens.log", {
        simulatedLines: ["SINUMERIK 840D"],
      });
      expect(result.controllerType).toBe("siemens");
    });

    it("detects Mazak Mazatrol", () => {
      const result = MachineLogHarvesterEngine.harvestLog("mazak.log", {
        simulatedLines: ["MAZATROL SMOOTH"],
      });
      expect(result.controllerType).toBe("mazak");
    });

    it("detects Mitsubishi Meldas", () => {
      const result = MachineLogHarvesterEngine.harvestLog("mitsu.log", {
        simulatedLines: ["MELDAS M800"],
      });
      expect(result.controllerType).toBe("mitsubishi");
    });
  });

  describe("entry classification", () => {
    it("classifies cycle start", () => {
      const result = MachineLogHarvesterEngine.harvestLog("test.log", {
        simulatedLines: ["CYCLE START"],
      });
      expect(result.entries[0].type).toBe("cycle_start");
    });

    it("classifies cycle end", () => {
      const result = MachineLogHarvesterEngine.harvestLog("test.log", {
        simulatedLines: ["CYCLE END"],
      });
      expect(result.entries[0].type).toBe("cycle_end");
    });

    it("classifies tool change", () => {
      const result = MachineLogHarvesterEngine.harvestLog("test.log", {
        simulatedLines: ["T5 M06"],
      });
      expect(result.entries[0].type).toBe("tool_change");
    });

    it("classifies alarms", () => {
      const result = MachineLogHarvesterEngine.harvestLog("test.log", {
        simulatedLines: ["ALARM 100"],
      });
      expect(result.entries[0].type).toBe("alarm");
    });

    it("classifies maintenance entries", () => {
      const result = MachineLogHarvesterEngine.harvestLog("test.log", {
        simulatedLines: ["MAINTENANCE mode entered"],
      });
      expect(result.entries[0].type).toBe("maintenance");
    });
  });

  describe("alarm extraction", () => {
    it("extracts alarm code", () => {
      const result = MachineLogHarvesterEngine.harvestLog("alarms.log", {
        simulatedLines: ["ALARM 123 Servo overload"],
      });
      expect(result.alarms[0].alarmCode).toBe("123");
    });

    it("assigns severity levels", () => {
      const result = MachineLogHarvesterEngine.harvestLog("alarms.log", {
        simulatedLines: [
          "ALARM 100 Critical error",
          "WARNING 200 Low level",
        ],
      });
      expect(result.alarms[0].severity).toBe("critical");
      expect(result.alarms[1].severity).toBe("warning");
    });

    it("extracts associated tool number", () => {
      const result = MachineLogHarvesterEngine.harvestLog("alarms.log", {
        simulatedLines: ["ALARM 100 T5 Tool breakage"],
      });
      expect(result.alarms[0].toolNumber).toBe(5);
    });
  });

  describe("getHarvest", () => {
    it("returns null for unknown file", () => {
      expect(MachineLogHarvesterEngine.getHarvest("unknown.log")).toBeNull();
    });

    it("returns harvest for processed file", () => {
      MachineLogHarvesterEngine.harvestLog("test.log");
      expect(MachineLogHarvesterEngine.getHarvest("test.log")).not.toBeNull();
    });
  });

  describe("getByMachineType", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("lathe1.log", { machineType: "lathe" });
      MachineLogHarvesterEngine.harvestLog("lathe2.log", { machineType: "lathe" });
      MachineLogHarvesterEngine.harvestLog("mill1.log", { machineType: "mill" });
    });

    it("filters by machine type", () => {
      const lathes = MachineLogHarvesterEngine.getByMachineType("lathe");
      expect(lathes.length).toBe(2);

      const mills = MachineLogHarvesterEngine.getByMachineType("mill");
      expect(mills.length).toBe(1);
    });
  });

  describe("getByControllerType", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("fanuc1.log", {
        simulatedLines: ["FANUC 0i-MF"],
      });
      MachineLogHarvesterEngine.harvestLog("fanuc2.log", {
        simulatedLines: ["FANUC 30i"],
      });
    });

    it("filters by controller type", () => {
      const fanuc = MachineLogHarvesterEngine.getByControllerType("fanuc");
      expect(fanuc.length).toBe(2);
    });
  });

  describe("getAllAlarms", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("machine1.log", {
        simulatedLines: ["ALARM 100", "ALARM 101"],
      });
      MachineLogHarvesterEngine.harvestLog("machine2.log", {
        simulatedLines: ["ALARM 200"],
      });
    });

    it("aggregates alarms from all harvests", () => {
      const alarms = MachineLogHarvesterEngine.getAllAlarms();
      expect(alarms.length).toBe(3);
    });
  });

  describe("getAlarmsBySeverity", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("alarms.log", {
        simulatedLines: [
          "ALARM 100 Critical",
          "WARNING 200 Warning",
          "ERROR 300 Error",
        ],
      });
    });

    it("filters alarms by severity", () => {
      const critical = MachineLogHarvesterEngine.getAlarmsBySeverity("critical");
      expect(critical.length).toBe(2); // ALARM and ERROR
    });
  });

  describe("getAggregatedToolUsage", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("machine1.log", {
        machineId: "M1",
        simulatedLines: ["T1 M06", "T2 M06", "T1 M06"],
      });
      MachineLogHarvesterEngine.harvestLog("machine2.log", {
        machineId: "M2",
        simulatedLines: ["T1 M06", "T3 M06"],
      });
    });

    it("aggregates tool usage across machines", () => {
      const usage = MachineLogHarvesterEngine.getAggregatedToolUsage();
      const t1 = usage.get(1);
      expect(t1?.count).toBe(3); // 2 from M1 + 1 from M2
      expect(t1?.machines).toContain("M1");
      expect(t1?.machines).toContain("M2");
    });
  });

  describe("searchEntries", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("machine.log", {
        simulatedLines: [
          "Spindle overload detected",
          "Tool change T1",
          "Coolant level low",
        ],
      });
    });

    it("searches entries by keyword", () => {
      const results = MachineLogHarvesterEngine.searchEntries("spindle");
      expect(results.length).toBe(1);
    });

    it("is case insensitive", () => {
      const results = MachineLogHarvesterEngine.searchEntries("COOLANT");
      expect(results.length).toBe(1);
    });
  });

  describe("statistics", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("machine.log", {
        simulatedLines: [
          "2026-04-17 10:00:00 CYCLE START",
          "2026-04-17 10:00:30 T1 M06",
          "2026-04-17 10:01:00 T2 M06",
          "2026-04-17 10:05:00 CYCLE END",
          "2026-04-17 10:10:00 CYCLE START",
          "2026-04-17 10:15:00 CYCLE END",
          "2026-04-17 10:20:00 ALARM 100",
        ],
      });
    });

    it("counts total entries", () => {
      const harvest = MachineLogHarvesterEngine.getHarvest("machine.log");
      expect(harvest?.statistics.totalEntries).toBe(7);
    });

    it("counts total cycles", () => {
      const harvest = MachineLogHarvesterEngine.getHarvest("machine.log");
      expect(harvest?.statistics.totalCycles).toBe(2);
    });

    it("counts total alarms", () => {
      const harvest = MachineLogHarvesterEngine.getHarvest("machine.log");
      expect(harvest?.statistics.totalAlarms).toBe(1);
    });

    it("calculates average cycle time", () => {
      const harvest = MachineLogHarvesterEngine.getHarvest("machine.log");
      expect(harvest?.statistics.avgCycleTime).toBeGreaterThan(0);
    });

    it("identifies most used tools", () => {
      const harvest = MachineLogHarvesterEngine.getHarvest("machine.log");
      expect(harvest?.statistics.mostUsedTools.length).toBeGreaterThan(0);
    });
  });

  describe("getAggregateStatistics", () => {
    beforeEach(() => {
      MachineLogHarvesterEngine.harvestLog("lathe.log", {
        machineType: "lathe",
        simulatedLines: [
          "FANUC 0i-TF",
          "CYCLE START",
          "CYCLE END",
          "ALARM 100",
        ],
      });
      MachineLogHarvesterEngine.harvestLog("mill.log", {
        machineType: "mill",
        simulatedLines: [
          "HAAS NGC",
          "CYCLE START",
          "CYCLE END",
          "CYCLE START",
          "CYCLE END",
        ],
      });
    });

    it("counts total harvests", () => {
      const stats = MachineLogHarvesterEngine.getAggregateStatistics();
      expect(stats.totalHarvests).toBe(2);
    });

    it("groups by machine type", () => {
      const stats = MachineLogHarvesterEngine.getAggregateStatistics();
      expect(stats.byMachineType.lathe).toBe(1);
      expect(stats.byMachineType.mill).toBe(1);
    });

    it("groups by controller type", () => {
      const stats = MachineLogHarvesterEngine.getAggregateStatistics();
      expect(stats.byControllerType.fanuc).toBe(1);
      expect(stats.byControllerType.haas).toBe(1);
    });

    it("aggregates cycle counts", () => {
      const stats = MachineLogHarvesterEngine.getAggregateStatistics();
      expect(stats.totalCycles).toBe(3);
    });
  });

  describe("reset", () => {
    it("clears all harvests", () => {
      MachineLogHarvesterEngine.harvestLog("test.log");
      expect(MachineLogHarvesterEngine.getAllHarvests().length).toBe(1);

      MachineLogHarvesterEngine.reset();
      expect(MachineLogHarvesterEngine.getAllHarvests().length).toBe(0);
    });
  });
});
