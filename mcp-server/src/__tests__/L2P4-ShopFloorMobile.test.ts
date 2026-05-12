/**
 * L2-P4-MS1/P0-U01: Shop Floor + Mobile Field Engines Tests
 * ==========================================================
 *
 * Comprehensive tests for all 11 engines in Batch 1-2:
 * - ShopFloorDashboardEngine
 * - ShopFloorJobEngine
 * - ShopFloorCostEngine
 * - ShopFloorQuoteEngine
 * - ShopFloorScheduleEngine
 * - ShopFloorReportEngine
 * - MobileLookupEngine
 * - MobileVoiceEngine
 * - MobileAlarmEngine
 * - MobileTimerEngine
 * - MobileCacheEngine
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ShopFloorDashboardEngine } from "../engines/ShopFloorDashboardEngine.js";
import { ShopFloorJobEngine } from "../engines/ShopFloorJobEngine.js";
import { ShopFloorCostEngine } from "../engines/ShopFloorCostEngine.js";
import { ShopFloorQuoteEngine } from "../engines/ShopFloorQuoteEngine.js";
import { ShopFloorScheduleEngine } from "../engines/ShopFloorScheduleEngine.js";
import { ShopFloorReportEngine } from "../engines/ShopFloorReportEngine.js";
import { MobileLookupEngine } from "../engines/MobileLookupEngine.js";
import { MobileVoiceEngine } from "../engines/MobileVoiceEngine.js";
import { MobileAlarmEngine } from "../engines/MobileAlarmEngine.js";
import { MobileTimerEngine } from "../engines/MobileTimerEngine.js";
import { MobileCacheEngine } from "../engines/MobileCacheEngine.js";

// ─── ShopFloorDashboardEngine ─────────────────────────────────────────────────

describe("ShopFloorDashboardEngine", () => {
  describe("getDashboard", () => {
    it("should return complete dashboard data", () => {
      const dashboard = ShopFloorDashboardEngine.getDashboard({ shopId: "jm-die" });
      expect(dashboard.shopId).toBe("jm-die");
      expect(dashboard.machines.length).toBeGreaterThan(0);
      expect(dashboard.activeJobs.length).toBeGreaterThan(0);
      expect(dashboard.oeeMetrics.oee).toBeGreaterThan(0);
      expect(dashboard.summary.totalMachines).toBeGreaterThan(0);
    });

    it("should filter by department", () => {
      const dashboard = ShopFloorDashboardEngine.getDashboard({
        shopId: "jm-die",
        departmentFilter: "okuma",
      });
      expect(dashboard.machines.every(m => m.name.toLowerCase().includes("okuma"))).toBe(true);
    });

    it("should exclude offline machines by default", () => {
      const dashboard = ShopFloorDashboardEngine.getDashboard({ shopId: "jm-die" });
      expect(dashboard.machines.every(m => m.status !== "offline")).toBe(true);
    });
  });

  describe("getMachineStatus", () => {
    it("should return status for known machine", () => {
      const status = ShopFloorDashboardEngine.getMachineStatus("okuma-lb3000-1");
      expect(status).toBeDefined();
      expect(status?.status).toBe("running");
    });

    it("should return undefined for unknown machine", () => {
      const status = ShopFloorDashboardEngine.getMachineStatus("unknown");
      expect(status).toBeUndefined();
    });
  });

  describe("getAlerts", () => {
    it("should return all alerts", () => {
      const alerts = ShopFloorDashboardEngine.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("should filter by severity", () => {
      const criticalAlerts = ShopFloorDashboardEngine.getAlerts("critical");
      expect(criticalAlerts.every(a => a.severity === "critical")).toBe(true);
    });
  });

  describe("calculateMachineOEE", () => {
    it("should return valid OEE metrics", () => {
      const oee = ShopFloorDashboardEngine.calculateMachineOEE("okuma-lb3000-1", 8);
      expect(oee.availability).toBeGreaterThan(0);
      expect(oee.performance).toBeGreaterThan(0);
      expect(oee.quality).toBeGreaterThan(0);
      expect(oee.oee).toBeGreaterThan(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("should return engine metadata", () => {
      const awareness = ShopFloorDashboardEngine.getSelfAwareness();
      expect(awareness.name).toBe("ShopFloorDashboardEngine");
      expect(awareness.capabilities).toContain("getDashboard");
    });
  });
});

// ─── ShopFloorJobEngine ───────────────────────────────────────────────────────

describe("ShopFloorJobEngine", () => {
  describe("createJob", () => {
    it("should create a new job", () => {
      const job = ShopFloorJobEngine.createJob({
        partNumber: "TEST-001",
        customer: "ALCOA",
        quantityRequired: 50,
        dueDate: "2024-12-31",
        operations: [
          { code: "OP10", description: "Turn OD", department: "Lathe", setupMinutes: 30, cycleMinutes: 5 },
        ],
      });
      expect(job.jobId).toBeDefined();
      expect(job.partNumber).toBe("TEST-001");
      expect(job.quantityRequired).toBe(50);
      expect(job.operations.length).toBe(1);
    });

    it("should default to normal priority", () => {
      const job = ShopFloorJobEngine.createJob({
        partNumber: "TEST-002",
        customer: "ITW",
        quantityRequired: 25,
        dueDate: "2024-12-31",
        operations: [],
      });
      expect(job.priority).toBe("normal");
    });
  });

  describe("getJob", () => {
    it("should return existing job", () => {
      const job = ShopFloorJobEngine.getJob("JOB-2024-001");
      expect(job).toBeDefined();
      expect(job?.partNumber).toBe("DIE-4512-A");
    });

    it("should return undefined for nonexistent job", () => {
      const job = ShopFloorJobEngine.getJob("NONEXISTENT");
      expect(job).toBeUndefined();
    });
  });

  describe("getJobs", () => {
    it("should return all jobs", () => {
      const jobs = ShopFloorJobEngine.getJobs();
      expect(jobs.length).toBeGreaterThan(0);
    });

    it("should filter by status", () => {
      const jobs = ShopFloorJobEngine.getJobs({ status: "in_progress" });
      expect(jobs.every(j => j.status === "in_progress")).toBe(true);
    });
  });

  describe("updateJob", () => {
    it("should update job properties", () => {
      const job = ShopFloorJobEngine.updateJob({
        jobId: "JOB-2024-001",
        quantityComplete: 40,
      });
      expect(job?.quantityComplete).toBe(40);
    });
  });

  describe("calculateCompletion", () => {
    it("should return completion percentage", () => {
      const completion = ShopFloorJobEngine.calculateCompletion("JOB-2024-001");
      expect(completion).toBeGreaterThanOrEqual(0);
      expect(completion).toBeLessThanOrEqual(100);
    });
  });
});

// ─── ShopFloorCostEngine ──────────────────────────────────────────────────────

describe("ShopFloorCostEngine", () => {
  describe("clockIn/clockOut", () => {
    it("should track labor time", () => {
      const entry = ShopFloorCostEngine.clockIn({
        jobId: "JOB-TEST-001",
        operationId: "OP10",
        employeeId: "EMP-200",
        employeeName: "Test User",
        department: "Lathe",
        hourlyRate: 45,
      });
      expect(entry.id).toBeDefined();
      expect(entry.hoursWorked).toBe(0);

      const completed = ShopFloorCostEngine.clockOut("JOB-TEST-001", "EMP-200");
      expect(completed).toBeDefined();
      expect(completed?.hoursWorked).toBeGreaterThanOrEqual(0);
    });

    it("should reject duplicate clock-in", () => {
      ShopFloorCostEngine.clockIn({
        jobId: "JOB-TEST-002",
        operationId: "OP10",
        employeeId: "EMP-201",
        employeeName: "Test User 2",
        department: "Mill",
        hourlyRate: 50,
      });

      expect(() => {
        ShopFloorCostEngine.clockIn({
          jobId: "JOB-TEST-002",
          operationId: "OP10",
          employeeId: "EMP-201",
          employeeName: "Test User 2",
          department: "Mill",
          hourlyRate: 50,
        });
      }).toThrow();

      ShopFloorCostEngine.clockOut("JOB-TEST-002", "EMP-201");
    });
  });

  describe("chargeMaterial", () => {
    it("should record material usage", () => {
      const usage = ShopFloorCostEngine.chargeMaterial({
        jobId: "JOB-2024-001",
        materialCode: "4140",
        description: "4140 Steel Round 2.5\"",
        quantityUsed: 5,
        unitCost: 45.00,
      });
      expect(usage.totalCost).toBe(225);
    });
  });

  describe("getJobCostSummary", () => {
    it("should return cost summary with variance", () => {
      const summary = ShopFloorCostEngine.getJobCostSummary("JOB-2024-001");
      expect(summary.jobId).toBe("JOB-2024-001");
      expect(summary.estimatedCost).toBeDefined();
      expect(summary.actualCost).toBeDefined();
      expect(summary.variance).toBeDefined();
    });
  });
});

// ─── ShopFloorQuoteEngine ─────────────────────────────────────────────────────

describe("ShopFloorQuoteEngine", () => {
  describe("generateQuote", () => {
    it("should generate complete quote", () => {
      const quote = ShopFloorQuoteEngine.generateQuote({
        partNumber: "DIE-4512-A",
        material: "4140",
        materialCostPerUnit: 25,
        quantity: 50,
        operations: [
          { code: "OP10", description: "Turn OD", department: "Lathe", setupMinutes: 30, cycleMinutes: 5 },
          { code: "OP20", description: "Mill Flats", department: "Mill", setupMinutes: 45, cycleMinutes: 8 },
        ],
      });
      expect(quote.quoteId).toBeDefined();
      expect(quote.totalPrice).toBeGreaterThan(0);
      expect(quote.pricePerUnit).toBeGreaterThan(0);
      expect(quote.operations.length).toBe(2);
    });

    it("should apply rush premium", () => {
      const normalQuote = ShopFloorQuoteEngine.generateQuote({
        partNumber: "RUSH-001",
        material: "4140",
        materialCostPerUnit: 20,
        quantity: 10,
        operations: [
          { code: "OP10", description: "Turn", department: "Lathe", setupMinutes: 30, cycleMinutes: 5 },
        ],
      });

      const rushQuote = ShopFloorQuoteEngine.generateQuote({
        partNumber: "RUSH-001",
        material: "4140",
        materialCostPerUnit: 20,
        quantity: 10,
        operations: [
          { code: "OP10", description: "Turn", department: "Lathe", setupMinutes: 30, cycleMinutes: 5 },
        ],
        rushOrder: true,
      });

      expect(rushQuote.rushPremium).toBeGreaterThan(0);
      expect(rushQuote.totalPrice).toBeGreaterThan(normalQuote.totalPrice);
    });
  });

  describe("getHistoricalJobs", () => {
    it("should return historical data for known part", () => {
      const history = ShopFloorQuoteEngine.getHistoricalJobs("DIE-4512-A");
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeMargin", () => {
    it("should flag low margin", () => {
      const analysis = ShopFloorQuoteEngine.analyzeMargin(1000, 900);
      expect(analysis.proposedMargin).toBeLessThan(15);
      expect(analysis.recommendation).toContain("Warning");
    });
  });
});

// ─── ShopFloorScheduleEngine ──────────────────────────────────────────────────

describe("ShopFloorScheduleEngine", () => {
  describe("scheduleOperation", () => {
    it("should schedule operation on machine", () => {
      const scheduled = ShopFloorScheduleEngine.scheduleOperation({
        jobId: "JOB-SCHED-001",
        operationCode: "OP10",
        machineId: "okuma-lb3000-1",
        durationMinutes: 120,
      });
      expect(scheduled.id).toBeDefined();
      expect(scheduled.machineId).toBe("okuma-lb3000-1");
    });

    it("should reject unknown machine", () => {
      expect(() => {
        ShopFloorScheduleEngine.scheduleOperation({
          jobId: "JOB-SCHED-002",
          operationCode: "OP10",
          machineId: "unknown-machine",
          durationMinutes: 60,
        });
      }).toThrow();
    });
  });

  describe("getMachineCapacity", () => {
    it("should return capacity for known machine", () => {
      const capacity = ShopFloorScheduleEngine.getMachineCapacity("okuma-lb3000-1");
      expect(capacity).toBeDefined();
      expect(capacity?.utilizationPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findAvailableSlot", () => {
    it("should find slot for machine type", () => {
      const slot = ShopFloorScheduleEngine.findAvailableSlot("lathe", 60);
      expect(slot).toBeDefined();
      expect(slot?.machineId).toBeDefined();
    });
  });
});

// ─── ShopFloorReportEngine ────────────────────────────────────────────────────

describe("ShopFloorReportEngine", () => {
  describe("getDailyProduction", () => {
    it("should return production data", () => {
      const data = ShopFloorReportEngine.getDailyProduction("2024-12-16");
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].partsProduced).toBeGreaterThan(0);
    });
  });

  describe("getMachineEfficiency", () => {
    it("should return efficiency for all machines", () => {
      const efficiency = ShopFloorReportEngine.getMachineEfficiency();
      expect(efficiency.length).toBeGreaterThan(0);
      expect(efficiency[0].oee).toBeGreaterThan(0);
    });
  });

  describe("getProductionSummary", () => {
    it("should return summary with KPIs", () => {
      const summary = ShopFloorReportEngine.getProductionSummary({
        startDate: "2024-12-16",
        endDate: "2024-12-17",
        reportType: "daily",
      });
      expect(summary.totalPartsProduced).toBeGreaterThan(0);
      expect(summary.avgOEE).toBeGreaterThan(0);
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getDepartmentComparison", () => {
    it("should compare departments", () => {
      const comparison = ShopFloorReportEngine.getDepartmentComparison();
      expect(comparison.length).toBeGreaterThan(0);
      expect(comparison.some(d => d.department === "Lathe")).toBe(true);
    });
  });
});

// ─── MobileLookupEngine ───────────────────────────────────────────────────────

describe("MobileLookupEngine", () => {
  describe("searchMaterials", () => {
    it("should find materials by code", () => {
      const results = MobileLookupEngine.searchMaterials("4140");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe("4140");
    });

    it("should find materials by category", () => {
      const results = MobileLookupEngine.searchMaterials("tool_steel");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("searchTools", () => {
    it("should find tools by ID", () => {
      const results = MobileLookupEngine.searchTools("EM-0500");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("searchGCodes", () => {
    it("should find G-codes", () => {
      const results = MobileLookupEngine.searchGCodes("G01");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe("G01");
    });

    it("should filter by controller", () => {
      const results = MobileLookupEngine.searchGCodes("G76", "fanuc");
      expect(results.every(g => g.controller === "fanuc" || g.controller === "universal")).toBe(true);
    });
  });

  describe("getSpeedFeed", () => {
    it("should return speed/feed for material", () => {
      const results = MobileLookupEngine.getSpeedFeed("4140");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].surfaceSpeed).toBeGreaterThan(0);
    });
  });
});

// ─── MobileVoiceEngine ────────────────────────────────────────────────────────

describe("MobileVoiceEngine", () => {
  describe("parseIntent", () => {
    it("should recognize material lookup", () => {
      const intent = MobileVoiceEngine.parseIntent({
        transcript: "lookup material 4140",
        confidence: 0.9,
        language: "en-US",
        timestamp: new Date().toISOString(),
      });
      expect(intent.intent).toBe("lookup_material");
    });

    it("should recognize clock in command", () => {
      const intent = MobileVoiceEngine.parseIntent({
        transcript: "clock in to job 2024-001",
        confidence: 0.85,
        language: "en-US",
        timestamp: new Date().toISOString(),
      });
      expect(intent.intent).toBe("clock_in");
    });

    it("should return unknown for unrecognized commands", () => {
      const intent = MobileVoiceEngine.parseIntent({
        transcript: "random gibberish words",
        confidence: 0.9,
        language: "en-US",
        timestamp: new Date().toISOString(),
      });
      expect(intent.intent).toBe("unknown");
    });
  });

  describe("processCommand", () => {
    it("should process machine status request", () => {
      const response = MobileVoiceEngine.processCommand({
        transcript: "machine status",
        confidence: 0.9,
        language: "en-US",
        timestamp: new Date().toISOString(),
      });
      expect(response.success).toBe(true);
      expect(response.response).toContain("running");
    });
  });

  describe("getSupportedCommands", () => {
    it("should return command categories", () => {
      const commands = MobileVoiceEngine.getSupportedCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(c => c.category === "Lookups")).toBe(true);
    });
  });
});

// ─── MobileAlarmEngine ────────────────────────────────────────────────────────

describe("MobileAlarmEngine", () => {
  describe("decodeAlarm", () => {
    it("should decode known alarm", () => {
      const alarm = MobileAlarmEngine.decodeAlarm({ code: "401", controller: "fanuc" });
      expect(alarm).toBeDefined();
      expect(alarm?.category).toBe("servo");
      expect(alarm?.severity).toBe("critical");
    });

    it("should return undefined for unknown alarm", () => {
      const alarm = MobileAlarmEngine.decodeAlarm({ code: "99999" });
      expect(alarm).toBeUndefined();
    });
  });

  describe("registerAlarm", () => {
    it("should create alarm event and notification", () => {
      const notification = MobileAlarmEngine.registerAlarm("okuma-lb3000-1", "Okuma LB3000 EX II #1", "401");
      expect(notification).toBeDefined();
      expect(notification?.alarmEvent.machineId).toBe("okuma-lb3000-1");
      expect(notification?.urgencyLevel).toBe(5);
    });
  });

  describe("getTroubleshootingSteps", () => {
    it("should return troubleshooting steps", () => {
      const steps = MobileAlarmEngine.getTroubleshootingSteps("410", "fanuc");
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].instruction).toContain("410");
    });
  });

  describe("searchAlarms", () => {
    it("should find alarms by description", () => {
      const results = MobileAlarmEngine.searchAlarms("spindle");
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

// ─── MobileTimerEngine ────────────────────────────────────────────────────────

describe("MobileTimerEngine", () => {
  describe("startTimer/stopTimer", () => {
    it("should track operation time", () => {
      const session = MobileTimerEngine.startTimer({
        jobId: "JOB-TIMER-001",
        operationId: "OP10",
        operatorId: "EMP-300",
        type: "run",
      });
      expect(session.id).toBeDefined();
      expect(session.status).toBe("running");

      const completed = MobileTimerEngine.stopTimer(session.id, "Test completed");
      expect(completed?.status).toBe("completed");
      expect(completed?.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe("pauseTimer/resumeTimer", () => {
    it("should pause and resume timer", () => {
      const session = MobileTimerEngine.startTimer({
        jobId: "JOB-TIMER-002",
        operationId: "OP20",
        operatorId: "EMP-301",
        type: "setup",
      });

      const paused = MobileTimerEngine.pauseTimer(session.id, "Break");
      expect(paused?.status).toBe("paused");
      expect(paused?.pauseHistory.length).toBe(1);

      const resumed = MobileTimerEngine.resumeTimer(session.id);
      expect(resumed?.status).toBe("running");

      MobileTimerEngine.stopTimer(session.id);
    });
  });

  describe("recordCycle", () => {
    it("should record cycle completion", () => {
      const session = MobileTimerEngine.startTimer({
        jobId: "JOB-TIMER-003",
        operationId: "OP30",
        operatorId: "EMP-302",
        type: "run",
      });

      const result = MobileTimerEngine.recordCycle(session.id, 1, "good");
      expect(result?.cycle.cycleNumber).toBe(1);
      expect(result?.session.cycleCount).toBe(1);

      MobileTimerEngine.stopTimer(session.id);
    });
  });

  describe("formatDuration", () => {
    it("should format seconds as HH:MM:SS", () => {
      expect(MobileTimerEngine.formatDuration(3661)).toBe("01:01:01");
      expect(MobileTimerEngine.formatDuration(0)).toBe("00:00:00");
    });
  });
});

// ─── MobileCacheEngine ────────────────────────────────────────────────────────

describe("MobileCacheEngine", () => {
  beforeEach(() => {
    MobileCacheEngine.clearExpired();
  });

  describe("set/get", () => {
    it("should store and retrieve data", () => {
      MobileCacheEngine.set("test-key", "material", { code: "4140" });
      const entry = MobileCacheEngine.get("test-key");
      expect(entry).toBeDefined();
      expect((entry?.data as Record<string, string>).code).toBe("4140");
    });

    it("should track version", () => {
      MobileCacheEngine.set("version-test", "tool", { id: "T1" });
      const v1 = MobileCacheEngine.get("version-test");
      expect(v1?.version).toBe(1);

      MobileCacheEngine.set("version-test", "tool", { id: "T1-updated" });
      const v2 = MobileCacheEngine.get("version-test");
      expect(v2?.version).toBe(2);
    });
  });

  describe("getByCategory", () => {
    it("should return entries by category", () => {
      MobileCacheEngine.set("mat-cat-1", "material", { code: "4140" });
      MobileCacheEngine.set("mat-cat-2", "material", { code: "D2" });
      MobileCacheEngine.set("tool-cat-1", "tool", { id: "T1" });

      const materials = MobileCacheEngine.getByCategory("material");
      expect(materials.length).toBeGreaterThanOrEqual(2);
      expect(materials.some(m => (m.data as Record<string, string>).code === "4140")).toBe(true);
    });
  });

  describe("queueSync/processSync", () => {
    it("should queue and process sync operations", () => {
      const sync = MobileCacheEngine.queueSync("create", "material", `sync-test-${Date.now()}`, { code: "TEST" });
      expect(sync.status).toBe("pending");
      expect(sync.id).toBeDefined();

      const pending = MobileCacheEngine.getPendingSync();
      expect(pending.some(p => p.id === sync.id)).toBe(true);

      const result = MobileCacheEngine.processSync();
      expect(result).toBeDefined();
      expect(typeof result.synced).toBe("number");
      expect(typeof result.failed).toBe("number");
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", () => {
      const stats = MobileCacheEngine.getStats();
      expect(stats.entryCount).toBeGreaterThanOrEqual(0);
      expect(stats.totalSizeBytes).toBeGreaterThanOrEqual(0);
    });
  });

  describe("prefetch", () => {
    it("should prefetch data for categories", () => {
      const results = MobileCacheEngine.prefetch(["material", "gcode"]);
      expect(results.length).toBe(2);
      expect(results.some(r => r.category === "material")).toBe(true);
    });
  });
});

// ─── Self-Awareness Verification ──────────────────────────────────────────────

describe("Self-Awareness Verification", () => {
  it("all engines should have milestone metadata", () => {
    const engines = [
      ShopFloorDashboardEngine.getSelfAwareness(),
      ShopFloorJobEngine.getSelfAwareness(),
      ShopFloorCostEngine.getSelfAwareness(),
      ShopFloorQuoteEngine.getSelfAwareness(),
      ShopFloorScheduleEngine.getSelfAwareness(),
      ShopFloorReportEngine.getSelfAwareness(),
      MobileLookupEngine.getSelfAwareness(),
      MobileVoiceEngine.getSelfAwareness(),
      MobileAlarmEngine.getSelfAwareness(),
      MobileTimerEngine.getSelfAwareness(),
      MobileCacheEngine.getSelfAwareness(),
    ];

    engines.forEach(engine => {
      expect(engine.milestone).toBe("L2-P4-MS1/P0-U01");
      expect(engine.version).toBe("1.0.0");
      expect(engine.capabilities.length).toBeGreaterThan(0);
    });
  });
});
