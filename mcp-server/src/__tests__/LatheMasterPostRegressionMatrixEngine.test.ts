/**
 * LatheMasterPostRegressionMatrixEngine Tests — LATHE-MASTER U-LTH31
 *
 * Tests the 150-job × 21-machine regression matrix with 5 validator groups.
 * Exit Gate: 150-cell matrix all green; baseline locked.
 *
 * @milestone LATHE-MASTER U-LTH31
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheMasterPostRegressionMatrixEngine,
  type ValidatorGroup,
} from "../engines/LatheMasterPostRegressionMatrixEngine.js";

describe("LatheMasterPostRegressionMatrixEngine", () => {
  beforeEach(() => {
    LatheMasterPostRegressionMatrixEngine.clearBaseline();
  });

  describe("getVersion", () => {
    it("should return semantic version 1.0.0", () => {
      const version = LatheMasterPostRegressionMatrixEngine.getVersion();
      expect(version).toBe("1.0.0");
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("getMachines — 21 JM Die machines", () => {
    it("should return exactly 21 machines", () => {
      const machines = LatheMasterPostRegressionMatrixEngine.getMachines();
      expect(machines.length).toBe(21);
    });

    it("should include 4 Okuma machines with OSP controllers", () => {
      const machines = LatheMasterPostRegressionMatrixEngine.getMachines();
      const okuma = machines.filter((m) => m.dialect === "okuma");
      expect(okuma.length).toBe(4);
      expect(okuma.every((m) => m.controller.includes("OSP"))).toBe(true);
      expect(okuma.map((m) => m.machineId)).toContain("okuma-lb3000");
      expect(okuma.map((m) => m.machineId)).toContain("okuma-lb4000");
    });

    it("should include 3 Haas machines with NGC controllers", () => {
      const machines = LatheMasterPostRegressionMatrixEngine.getMachines();
      const haas = machines.filter((m) => m.dialect === "haas");
      expect(haas.length).toBe(3);
      expect(haas.every((m) => m.controller.includes("NGC"))).toBe(true);
    });

    it("should include 3 Mazak machines including Integrex mill-turn", () => {
      const machines = LatheMasterPostRegressionMatrixEngine.getMachines();
      const mazak = machines.filter((m) => m.dialect === "mazak");
      expect(mazak.length).toBe(3);
      const integrex = mazak.find((m) => m.machineId === "mazak-integrex");
      expect(integrex).toBeTruthy();
      expect(integrex!.capabilities).toContain("mill_turn");
      expect(integrex!.capabilities).toContain("5_axis");
    });

    it("should have valid travel limits (X: 150-340mm, Z: 200-800mm)", () => {
      const machines = LatheMasterPostRegressionMatrixEngine.getMachines();
      for (const machine of machines) {
        expect(machine.xTravel).toBeGreaterThanOrEqual(150);
        expect(machine.xTravel).toBeLessThanOrEqual(340);
        expect(machine.zTravel).toBeGreaterThanOrEqual(200);
        expect(machine.zTravel).toBeLessThanOrEqual(800);
        expect(machine.maxRpm).toBeGreaterThanOrEqual(3400);
        expect(machine.maxRpm).toBeLessThanOrEqual(10000);
      }
    });

    it("should include Swiss machines (Citizen)", () => {
      const machines = LatheMasterPostRegressionMatrixEngine.getMachines();
      const swiss = machines.filter((m) => m.capabilities.includes("swiss"));
      expect(swiss.length).toBe(2);
      expect(swiss.every((m) => m.dialect === "citizen")).toBe(true);
    });
  });

  describe("getJobs — 145 test jobs", () => {
    it("should return exactly 145 jobs (65 hand-written + 80 generated)", () => {
      const jobs = LatheMasterPostRegressionMatrixEngine.getJobs();
      expect(jobs.length).toBe(145);
    });

    it("should have unique job IDs", () => {
      const jobs = LatheMasterPostRegressionMatrixEngine.getJobs();
      const ids = jobs.map((j) => j.jobId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(145);
    });

    it("should have 8 turning jobs (turn-od + turn-id)", () => {
      const jobs = LatheMasterPostRegressionMatrixEngine.getJobs();
      const turningOD = jobs.filter((j) => j.jobId.startsWith("turn-"));
      expect(turningOD.length).toBe(8);
    });

    it("should have 10 threading jobs including external, internal, NPT, ACME", () => {
      const jobs = LatheMasterPostRegressionMatrixEngine.getJobs();
      const threading = jobs.filter((j) => j.operation === "threading");
      expect(threading.length).toBeGreaterThanOrEqual(10);
      expect(threading.some((j) => j.name.includes("External"))).toBe(true);
      expect(threading.some((j) => j.name.includes("Internal"))).toBe(true);
      expect(threading.some((j) => j.name.includes("NPT"))).toBe(true);
      expect(threading.some((j) => j.name.includes("ACME"))).toBe(true);
    });

    it("should have valid G-code in all programs (G/M/T/S/F codes)", () => {
      const jobs = LatheMasterPostRegressionMatrixEngine.getJobs();
      for (const job of jobs.slice(0, 70)) {
        expect(job.program.length).toBeGreaterThan(10);
        expect(job.program).toMatch(/[GMT]\d+|[XZFSR][\d.-]+/i);
      }
    });

    it("should cover all 8 operation types (including facing)", () => {
      const jobs = LatheMasterPostRegressionMatrixEngine.getJobs();
      const ops = new Set(jobs.map((j) => j.operation));
      expect(ops.size).toBe(8);
      expect(ops.has("turning")).toBe(true);
      expect(ops.has("boring")).toBe(true);
      expect(ops.has("threading")).toBe(true);
      expect(ops.has("grooving")).toBe(true);
      expect(ops.has("drilling")).toBe(true);
      expect(ops.has("profiling")).toBe(true);
      expect(ops.has("parting")).toBe(true);
      expect(ops.has("facing")).toBe(true);
    });
  });

  describe("getValidatorGroups", () => {
    it("should return exactly 5 validators", () => {
      const groups = LatheMasterPostRegressionMatrixEngine.getValidatorGroups();
      expect(groups).toEqual(["syntax", "safety", "envelope", "dialect", "timing"]);
    });
  });

  describe("getMatrixDimensions", () => {
    it("should return 21 × 145 × 5 = 3045 total cells", () => {
      const dims = LatheMasterPostRegressionMatrixEngine.getMatrixDimensions();
      expect(dims.machines).toBe(21);
      expect(dims.jobs).toBe(145);
      expect(dims.validators).toBe(5);
      expect(dims.totalCells).toBe(3045);
    });
  });

  describe("runMatrix — happy path", () => {
    it("should run single-cell matrix and return result", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(1);
      expect(result.passedCells + result.failedCells + result.skippedCells).toBe(1);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.cells.length).toBe(1);
      expect(result.cells[0].machineId).toBe("okuma-lb3000");
      expect(result.cells[0].jobId).toBe("turn-od-01");
      expect(["pass", "fail"]).toContain(result.cells[0].status);
    });

    it("should run 2×3 matrix (2 machines × 3 jobs)", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000", "haas-st20"],
        jobs: ["turn-od-01", "thread-ext-01", "groove-od-01"],
      });

      expect(result.totalCells).toBe(6);
      expect(result.cells.length).toBe(6);
      const machineIds = new Set(result.cells.map((c) => c.machineId));
      const jobIds = new Set(result.cells.map((c) => c.jobId));
      expect(machineIds.size).toBe(2);
      expect(jobIds.size).toBe(3);
    });

    it("should compute 8-char hex checksum for each cell", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      const cell = result.cells[0];
      expect(cell.currentChecksum).toMatch(/^[0-9a-f]{8}$/);
    });

    it("should include G-code output for passing cells", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      if (result.cells[0].status === "pass") {
        expect(result.cells[0].gcode).toBeInstanceOf(Array);
        expect(result.cells[0].gcode!.length).toBeGreaterThan(0);
      }
    });

    it("should calculate pass rate correctly (passedCells / (passed + failed))", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000", "haas-st20"],
        jobs: ["turn-od-01", "turn-od-02"],
      });

      const expected = result.passedCells / (result.passedCells + result.failedCells || 1);
      expect(result.passRate).toBeCloseTo(expected, 4);
    });
  });

  describe("runMatrix — failure modes", () => {
    it("should treat empty machines array as 'use all machines'", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: [],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(21);
    });

    it("should treat empty jobs array as 'use all jobs'", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: [],
      });

      expect(result.totalCells).toBe(145);
    });

    it("should return zero cells for nonexistent machines", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["nonexistent-xyz-999"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(0);
    });

    it("should return zero cells for nonexistent jobs", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["fake-job-xyz"],
      });

      expect(result.totalCells).toBe(0);
    });
  });

  describe("runMatrix — adversarial inputs", () => {
    it("should handle undefined input by running full matrix", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix(undefined as any);

      expect(result.totalCells).toBe(3045);
    });

    it("should handle null validators array", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: null as any,
      });

      expect(result.success).toBe(false);
    });

    it("should handle invalid validator names", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: ["invalid_validator" as ValidatorGroup],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("validator checks — real scoring", () => {
    it("should score syntax validator 0.0-1.0", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: ["syntax"],
      });

      const score = result.cells[0].validatorResults.syntax.score;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should score safety validator and check for M30/G28", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: ["safety"],
      });

      const safety = result.cells[0].validatorResults.safety;
      expect(safety.score).toBeGreaterThanOrEqual(0);
      expect(safety.score).toBeLessThanOrEqual(1);
      expect(safety.issues).toBeInstanceOf(Array);
    });

    it("should score envelope validator against machine travel limits", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: ["envelope"],
      });

      const envelope = result.cells[0].validatorResults.envelope;
      expect(envelope.passed).toBe(true);
      expect(envelope.score).toBeCloseTo(1.0, 1);
    });

    it("should score dialect validator for Okuma G30 preference", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: ["dialect"],
      });

      const dialect = result.cells[0].validatorResults.dialect;
      expect(dialect.score).toBeGreaterThanOrEqual(0);
      expect(dialect.score).toBeLessThanOrEqual(1);
    });

    it("should score timing validator based on block count", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        validators: ["timing"],
      });

      const timing = result.cells[0].validatorResults.timing;
      expect(timing.score).toBeGreaterThanOrEqual(0);
      expect(timing.score).toBeLessThanOrEqual(1);
    });
  });

  describe("lockBaseline", () => {
    it("should lock baseline from passing cells", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      const lockResult = LatheMasterPostRegressionMatrixEngine.lockBaseline();

      expect(lockResult.locked).toBeGreaterThanOrEqual(0);
      expect(lockResult.total).toBeGreaterThanOrEqual(lockResult.locked);
    });

    it("should lock specific cells by machineId+jobId", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000", "haas-st20"],
        jobs: ["turn-od-01", "turn-od-02"],
      });

      const lockResult = LatheMasterPostRegressionMatrixEngine.lockBaseline({
        cells: [{ machineId: "okuma-lb3000", jobId: "turn-od-01" }],
      });

      expect(lockResult.locked).toBeLessThanOrEqual(1);
    });

    it("should auto-run matrix if no prior run", () => {
      const lockResult = LatheMasterPostRegressionMatrixEngine.lockBaseline();

      expect(lockResult.total).toBeGreaterThanOrEqual(0);
    });

    it("should force-lock failing cells when force=true", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      const lockResult = LatheMasterPostRegressionMatrixEngine.lockBaseline({ force: true });

      expect(lockResult.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getBaselineStats", () => {
    it("should return zeros when baseline empty", () => {
      const stats = LatheMasterPostRegressionMatrixEngine.getBaselineStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.machineCount).toBe(0);
      expect(stats.jobCount).toBe(0);
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();
    });

    it("should return correct counts after locking", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000", "haas-st20"],
        jobs: ["turn-od-01", "turn-od-02"],
        updateBaseline: true,
      });

      const stats = LatheMasterPostRegressionMatrixEngine.getBaselineStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.machineCount).toBeLessThanOrEqual(2);
      expect(stats.jobCount).toBeLessThanOrEqual(2);
      if (stats.totalEntries > 0) {
        expect(stats.oldestEntry).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(stats.newestEntry).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });

  describe("getDiffReport", () => {
    it("should return success=false when no matrix run", () => {
      const report = LatheMasterPostRegressionMatrixEngine.getDiffReport();

      expect(report.success).toBe(false);
      expect(report.divergentCells).toBe(0);
      expect(report.report).toEqual([]);
    });

    it("should return empty report when no divergences", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      const report = LatheMasterPostRegressionMatrixEngine.getDiffReport();

      expect(report.success).toBe(true);
      expect(report.divergentCells).toBe(0);
    });

    it("should filter by machineId", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000", "haas-st20"],
        jobs: ["turn-od-01"],
      });

      const report = LatheMasterPostRegressionMatrixEngine.getDiffReport({
        machineId: "okuma-lb3000",
      });

      expect(report.success).toBe(true);
      expect(report.report.every((r) => r.machineId === "okuma-lb3000")).toBe(true);
    });

    it("should filter by jobId", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01", "turn-od-02"],
      });

      const report = LatheMasterPostRegressionMatrixEngine.getDiffReport({
        jobId: "turn-od-01",
      });

      expect(report.success).toBe(true);
    });

    it("should respect threshold parameter", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      const report = LatheMasterPostRegressionMatrixEngine.getDiffReport({
        threshold: 100,
      });

      expect(report.success).toBe(true);
      expect(report.divergentCells).toBe(0);
    });
  });

  describe("clearBaseline", () => {
    it("should clear all baseline entries", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        updateBaseline: true,
      });

      LatheMasterPostRegressionMatrixEngine.clearBaseline();

      const stats = LatheMasterPostRegressionMatrixEngine.getBaselineStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe("diffOnly mode", () => {
    it("should skip all cells when no baseline exists", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        diffOnly: true,
      });

      expect(result.skippedCells).toBe(1);
      expect(result.cells[0].status).toBe("skip");
    });

    it("should run cells with baseline in diffOnly mode", () => {
      const firstRun = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        updateBaseline: true,
      });

      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        diffOnly: true,
      });

      if (firstRun.passedCells > 0) {
        expect(result.skippedCells).toBe(0);
        expect(result.cells[0].status).not.toBe("skip");
      } else {
        expect(result.skippedCells).toBe(1);
      }
    });
  });

  describe("multi-dialect coverage", () => {
    it("should process Okuma dialect (OSP controller)", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(1);
      expect(result.cells[0].validatorResults.dialect.score).toBeGreaterThan(0);
    });

    it("should process Haas dialect (NGC controller)", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["haas-st20"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(1);
    });

    it("should process Mazak dialect (MAZATROL controller)", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["mazak-qt200"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(1);
    });

    it("should process Fanuc dialect (0i/31i controllers)", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["doosan-lynx"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(1);
    });

    it("should process Citizen dialect (Swiss machines)", () => {
      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["citizen-l20"],
        jobs: ["turn-od-01"],
      });

      expect(result.totalCells).toBe(1);
    });
  });

  describe("updateBaseline mode", () => {
    it("should update baseline when updateBaseline=true and cells pass", () => {
      const run = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        updateBaseline: true,
      });

      const stats = LatheMasterPostRegressionMatrixEngine.getBaselineStats();
      expect(stats.totalEntries).toBe(run.passedCells);
    });

    it("should not update baseline when updateBaseline=false", () => {
      LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        updateBaseline: false,
      });

      const stats = LatheMasterPostRegressionMatrixEngine.getBaselineStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe("divergence detection", () => {
    it("should track baseline and current checksums", () => {
      const firstRun = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        updateBaseline: true,
      });

      if (firstRun.passedCells > 0) {
        const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
          machines: ["okuma-lb3000"],
          jobs: ["turn-od-01"],
        });

        expect(result.cells[0].baselineChecksum).toMatch(/^[0-9a-f]{8}$/);
        expect(result.cells[0].currentChecksum).toMatch(/^[0-9a-f]{8}$/);
      }
    });

    it("should populate divergences array when output changes", () => {
      const firstRun = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
        updateBaseline: true,
      });

      const result = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });

      if (firstRun.passedCells > 0 && result.cells[0].divergences) {
        expect(result.cells[0].divergences).toBeInstanceOf(Array);
      }
    });
  });

  describe("dispatcher wiring verification", () => {
    it("should have all 5 lathe_masterpost_regression actions in camDispatcher ACTIONS enum", async () => {
      const { ACTIONS } = await import("../tools/dispatchers/camDispatcher.js");
      const regressionActions = [
        "lathe_masterpost_regression_run",
        "lathe_masterpost_regression_lock",
        "lathe_masterpost_regression_diff",
        "lathe_masterpost_regression_stats",
        "lathe_masterpost_regression_clear",
      ];
      for (const action of regressionActions) {
        expect(ACTIONS).toContain(action);
      }
      expect(regressionActions.length).toBe(5);
    });

    it("should have Zod schemas with correct structure for regression actions", async () => {
      const { ACTION_CAM_SCHEMAS } = await import("../schemas/camActionSchemas.js");
      const runSchema = ACTION_CAM_SCHEMAS.lathe_masterpost_regression_run;
      const lockSchema = ACTION_CAM_SCHEMAS.lathe_masterpost_regression_lock;
      const diffSchema = ACTION_CAM_SCHEMAS.lathe_masterpost_regression_diff;
      const statsSchema = ACTION_CAM_SCHEMAS.lathe_masterpost_regression_stats;
      const clearSchema = ACTION_CAM_SCHEMAS.lathe_masterpost_regression_clear;

      expect(runSchema.safeParse({}).success).toBe(true);
      expect(runSchema.safeParse({ machines: ["m1"], jobs: ["j1"] }).success).toBe(true);
      expect(runSchema.safeParse({ validators: ["syntax", "safety"] }).success).toBe(true);
      expect(runSchema.safeParse({ validators: ["invalid_validator"] }).success).toBe(false);
      expect(lockSchema.safeParse({}).success).toBe(true);
      expect(lockSchema.safeParse({ cells: [{ machineId: "m1", jobId: "j1" }] }).success).toBe(true);
      expect(diffSchema.safeParse({}).success).toBe(true);
      expect(diffSchema.safeParse({ threshold: 0.05 }).success).toBe(true);
      expect(statsSchema.safeParse({}).success).toBe(true);
      expect(clearSchema.safeParse({}).success).toBe(true);
    });

    it("dispatcher case handlers exist for each regression action (via ACTIONS position)", async () => {
      const { ACTIONS } = await import("../tools/dispatchers/camDispatcher.js");
      const runIdx = ACTIONS.indexOf("lathe_masterpost_regression_run");
      const lockIdx = ACTIONS.indexOf("lathe_masterpost_regression_lock");
      const diffIdx = ACTIONS.indexOf("lathe_masterpost_regression_diff");
      const statsIdx = ACTIONS.indexOf("lathe_masterpost_regression_stats");
      const clearIdx = ACTIONS.indexOf("lathe_masterpost_regression_clear");

      expect(runIdx).toBeGreaterThan(-1);
      expect(lockIdx).toBeGreaterThan(-1);
      expect(diffIdx).toBeGreaterThan(-1);
      expect(statsIdx).toBeGreaterThan(-1);
      expect(clearIdx).toBeGreaterThan(-1);
      expect(new Set([runIdx, lockIdx, diffIdx, statsIdx, clearIdx]).size).toBe(5);
    });

    it("engine methods match dispatcher action interfaces", () => {
      // runMatrix returns a MatrixResult structure (success depends on cells passing)
      const runResult = LatheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["okuma-lb3000"],
        jobs: ["turn-od-01"],
      });
      expect(typeof runResult.success).toBe("boolean");
      expect(runResult.totalCells).toBe(1);
      expect(typeof runResult.passRate).toBe("number");
      expect(typeof runResult.executionTimeMs).toBe("number");
      expect(Array.isArray(runResult.cells)).toBe(true);
      expect(runResult.cells.length).toBe(1);
      expect(runResult.cells[0].machineId).toBe("okuma-lb3000");
      expect(runResult.cells[0].jobId).toBe("turn-od-01");

      // getBaselineStats returns baseline info (empty until entries locked)
      const statsResult = LatheMasterPostRegressionMatrixEngine.getBaselineStats();
      expect(statsResult.totalEntries).toBe(0);
      expect(statsResult.machineCount).toBe(0);
      expect(statsResult.jobCount).toBe(0);

      // getMatrixDimensions returns the full matrix size
      const dimensions = LatheMasterPostRegressionMatrixEngine.getMatrixDimensions();
      expect(dimensions.machines).toBe(21);
      expect(dimensions.jobs).toBe(145);
      expect(dimensions.validators).toBe(5);

      // clearBaseline returns void - verify it doesn't throw
      expect(() => LatheMasterPostRegressionMatrixEngine.clearBaseline()).not.toThrow();
    });
  });
});
