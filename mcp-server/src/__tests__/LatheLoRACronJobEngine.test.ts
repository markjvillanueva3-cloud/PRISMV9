/**
 * LatheLoRACronJobEngine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRACronJobEngine } from "../engines/LatheLoRACronJobEngine.js";

describe("LatheLoRACronJobEngine", () => {
  beforeEach(() => {
    latheLoRACronJobEngine.reset();
  });

  describe("configuration", () => {
    it("should return default configuration", () => {
      const config = latheLoRACronJobEngine.getConfig();
      expect(config.max_concurrent_jobs).toBe(3);
      expect(config.default_timeout_ms).toBe(300000);
      expect(config.retry_on_failure).toBe(true);
      expect(config.max_retries).toBe(3);
    });

    it("should update configuration", () => {
      latheLoRACronJobEngine.setConfig({
        max_concurrent_jobs: 5,
        retry_on_failure: false,
      });
      const config = latheLoRACronJobEngine.getConfig();
      expect(config.max_concurrent_jobs).toBe(5);
      expect(config.retry_on_failure).toBe(false);
    });
  });

  describe("cron parsing", () => {
    it("should parse simple cron expression", () => {
      const parsed = latheLoRACronJobEngine.parseCron("0 * * * *");
      expect(parsed).not.toBeNull();
      expect(parsed!.minute).toEqual([0]);
      expect(parsed!.hour.length).toBe(24); // Every hour
    });

    it("should parse step expression", () => {
      const parsed = latheLoRACronJobEngine.parseCron("*/15 * * * *");
      expect(parsed).not.toBeNull();
      expect(parsed!.minute).toEqual([0, 15, 30, 45]);
    });

    it("should parse range expression", () => {
      const parsed = latheLoRACronJobEngine.parseCron("0 9-17 * * *");
      expect(parsed).not.toBeNull();
      expect(parsed!.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    it("should parse list expression", () => {
      const parsed = latheLoRACronJobEngine.parseCron("0 0 1,15 * *");
      expect(parsed).not.toBeNull();
      expect(parsed!.day_of_month).toEqual([1, 15]);
    });

    it("should parse complex expression", () => {
      const parsed = latheLoRACronJobEngine.parseCron("30 2 * * 0,6");
      expect(parsed).not.toBeNull();
      expect(parsed!.minute).toEqual([30]);
      expect(parsed!.hour).toEqual([2]);
      expect(parsed!.day_of_week).toEqual([0, 6]); // Sunday and Saturday
    });

    it("should return null for invalid expression", () => {
      expect(latheLoRACronJobEngine.parseCron("invalid")).toBeNull();
      expect(latheLoRACronJobEngine.parseCron("* * *")).toBeNull();
      expect(latheLoRACronJobEngine.parseCron("")).toBeNull();
    });
  });

  describe("cron validation", () => {
    it("should validate correct expression", () => {
      const result = latheLoRACronJobEngine.validateCron("0 0 * * *");
      expect(result.valid).toBe(true);
      expect(result.next_runs).toHaveLength(5);
    });

    it("should reject invalid expression", () => {
      const result = latheLoRACronJobEngine.validateCron("not valid");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid cron expression");
    });
  });

  describe("job creation", () => {
    it("should create job from template", () => {
      const job = latheLoRACronJobEngine.createJob("drift_check", "lathe-lora-v1");
      expect(job.id).toMatch(/^job-/);
      expect(job.type).toBe("drift_check");
      expect(job.model_id).toBe("lathe-lora-v1");
      expect(job.name).toBe("Drift Detection Check");
      expect(job.cron_expression).toBe("0 */6 * * *");
      expect(job.enabled).toBe(true);
      expect(job.next_run).toBeGreaterThan(Date.now());
    });

    it("should create job with overrides", () => {
      const job = latheLoRACronJobEngine.createJob("backup", undefined, {
        name: "Custom Backup",
        cron_expression: "0 1 * * *",
        enabled: false,
      });
      expect(job.name).toBe("Custom Backup");
      expect(job.cron_expression).toBe("0 1 * * *");
      expect(job.enabled).toBe(false);
    });

    it("should create all job types", () => {
      const types: Array<"drift_check" | "backup" | "metrics_export" | "model_health" | "cleanup" | "retraining" | "custom"> = [
        "drift_check",
        "backup",
        "metrics_export",
        "model_health",
        "cleanup",
        "retraining",
        "custom",
      ];

      for (const type of types) {
        const job = latheLoRACronJobEngine.createJob(type);
        expect(job.type).toBe(type);
        expect(job.cron_expression).toBeDefined();
      }
    });
  });

  describe("job queries", () => {
    beforeEach(() => {
      latheLoRACronJobEngine.createJob("drift_check", "model-1");
      latheLoRACronJobEngine.createJob("backup", "model-1");
      latheLoRACronJobEngine.createJob("drift_check", "model-2");
    });

    it("should get job by ID", () => {
      const job = latheLoRACronJobEngine.createJob("cleanup");
      const retrieved = latheLoRACronJobEngine.getJob(job.id);
      expect(retrieved?.id).toBe(job.id);
    });

    it("should get all jobs", () => {
      const jobs = latheLoRACronJobEngine.getAllJobs();
      expect(jobs.length).toBe(3);
    });

    it("should get jobs by type", () => {
      const driftJobs = latheLoRACronJobEngine.getJobsByType("drift_check");
      expect(driftJobs.length).toBe(2);
    });

    it("should get jobs by model", () => {
      const model1Jobs = latheLoRACronJobEngine.getJobsByModel("model-1");
      expect(model1Jobs.length).toBe(2);
    });
  });

  describe("job management", () => {
    it("should enable/disable job", () => {
      const job = latheLoRACronJobEngine.createJob("metrics_export");
      expect(job.enabled).toBe(true);

      latheLoRACronJobEngine.setJobEnabled(job.id, false);
      expect(latheLoRACronJobEngine.getJob(job.id)?.enabled).toBe(false);

      latheLoRACronJobEngine.setJobEnabled(job.id, true);
      expect(latheLoRACronJobEngine.getJob(job.id)?.enabled).toBe(true);
    });

    it("should update job schedule", () => {
      const job = latheLoRACronJobEngine.createJob("model_health");
      const originalNext = job.next_run;

      const success = latheLoRACronJobEngine.updateSchedule(job.id, "0 0 * * *");
      expect(success).toBe(true);

      const updated = latheLoRACronJobEngine.getJob(job.id);
      expect(updated?.cron_expression).toBe("0 0 * * *");
    });

    it("should reject invalid schedule update", () => {
      const job = latheLoRACronJobEngine.createJob("cleanup");
      const success = latheLoRACronJobEngine.updateSchedule(job.id, "invalid");
      expect(success).toBe(false);
    });

    it("should delete job", () => {
      const job = latheLoRACronJobEngine.createJob("custom");
      expect(latheLoRACronJobEngine.getJob(job.id)).toBeDefined();

      const deleted = latheLoRACronJobEngine.deleteJob(job.id);
      expect(deleted).toBe(true);
      expect(latheLoRACronJobEngine.getJob(job.id)).toBeUndefined();
    });
  });

  describe("next run calculation", () => {
    it("should calculate next run for hourly job", () => {
      const nextRun = latheLoRACronJobEngine.calculateNextRun("0 * * * *");
      expect(nextRun).toBeGreaterThan(Date.now());
      expect(nextRun - Date.now()).toBeLessThanOrEqual(3600000); // Within 1 hour
    });

    it("should calculate next run for daily job", () => {
      const nextRun = latheLoRACronJobEngine.calculateNextRun("0 0 * * *");
      expect(nextRun).toBeGreaterThan(Date.now());
      expect(nextRun - Date.now()).toBeLessThanOrEqual(86400000); // Within 24 hours
    });
  });

  describe("due jobs", () => {
    it("should find due jobs", () => {
      // Create job with past next_run
      const job = latheLoRACronJobEngine.createJob("drift_check");
      // Manually set next_run to past
      const retrieved = latheLoRACronJobEngine.getJob(job.id)!;
      retrieved.next_run = Date.now() - 1000;

      const dueJobs = latheLoRACronJobEngine.getDueJobs();
      expect(dueJobs.some(j => j.id === job.id)).toBe(true);
    });

    it("should exclude disabled jobs from due", () => {
      const job = latheLoRACronJobEngine.createJob("backup");
      const retrieved = latheLoRACronJobEngine.getJob(job.id)!;
      retrieved.next_run = Date.now() - 1000;

      latheLoRACronJobEngine.setJobEnabled(job.id, false);

      const dueJobs = latheLoRACronJobEngine.getDueJobs();
      expect(dueJobs.some(j => j.id === job.id)).toBe(false);
    });

    it("should exclude running jobs from due", () => {
      const job = latheLoRACronJobEngine.createJob("metrics_export");
      const retrieved = latheLoRACronJobEngine.getJob(job.id)!;
      retrieved.next_run = Date.now() - 1000;

      // Start execution
      latheLoRACronJobEngine.startExecution(job.id);

      const dueJobs = latheLoRACronJobEngine.getDueJobs();
      expect(dueJobs.some(j => j.id === job.id)).toBe(false);
    });
  });

  describe("job execution", () => {
    it("should start job execution", () => {
      const job = latheLoRACronJobEngine.createJob("model_health");
      const execution = latheLoRACronJobEngine.startExecution(job.id);

      expect(execution).not.toBeNull();
      expect(execution!.id).toMatch(/^exec-/);
      expect(execution!.job_id).toBe(job.id);
      expect(execution!.status).toBe("running");
    });

    it("should respect max concurrent jobs", () => {
      latheLoRACronJobEngine.setConfig({ max_concurrent_jobs: 2 });

      const job1 = latheLoRACronJobEngine.createJob("drift_check");
      const job2 = latheLoRACronJobEngine.createJob("backup");
      const job3 = latheLoRACronJobEngine.createJob("cleanup");

      latheLoRACronJobEngine.startExecution(job1.id);
      latheLoRACronJobEngine.startExecution(job2.id);
      const exec3 = latheLoRACronJobEngine.startExecution(job3.id);

      expect(exec3).toBeNull(); // Should be blocked
    });

    it("should complete execution successfully", () => {
      const job = latheLoRACronJobEngine.createJob("retraining");
      const execution = latheLoRACronJobEngine.startExecution(job.id)!;

      const completed = latheLoRACronJobEngine.completeExecution(execution.id, {
        models_retrained: 1,
        samples_used: 150,
      });

      expect(completed?.status).toBe("completed");
      expect(completed?.duration_ms).toBeGreaterThanOrEqual(0);
      expect(completed?.result?.models_retrained).toBe(1);

      const updatedJob = latheLoRACronJobEngine.getJob(job.id);
      expect(updatedJob?.run_count).toBe(1);
      expect(updatedJob?.last_run).toBeDefined();
    });

    it("should complete execution with error", () => {
      const job = latheLoRACronJobEngine.createJob("custom");
      const execution = latheLoRACronJobEngine.startExecution(job.id)!;

      const failed = latheLoRACronJobEngine.completeExecution(
        execution.id,
        undefined,
        "Connection timeout"
      );

      expect(failed?.status).toBe("failed");
      expect(failed?.error).toBe("Connection timeout");

      const updatedJob = latheLoRACronJobEngine.getJob(job.id);
      expect(updatedJob?.failure_count).toBe(1);
    });
  });

  describe("execution history", () => {
    it("should get execution history", () => {
      const job = latheLoRACronJobEngine.createJob("drift_check");

      for (let i = 0; i < 3; i++) {
        const exec = latheLoRACronJobEngine.startExecution(job.id)!;
        latheLoRACronJobEngine.completeExecution(exec.id, { run: i });
      }

      const executions = latheLoRACronJobEngine.getExecutions(job.id);
      expect(executions.length).toBe(3);
    });

    it("should limit execution history", () => {
      const job = latheLoRACronJobEngine.createJob("backup");

      for (let i = 0; i < 5; i++) {
        const exec = latheLoRACronJobEngine.startExecution(job.id)!;
        latheLoRACronJobEngine.completeExecution(exec.id, { run: i });
      }

      const executions = latheLoRACronJobEngine.getExecutions(job.id, 3);
      expect(executions.length).toBe(3);
    });

    it("should trim old executions", () => {
      latheLoRACronJobEngine.setConfig({ execution_history_limit: 5 });
      const job = latheLoRACronJobEngine.createJob("metrics_export");

      for (let i = 0; i < 10; i++) {
        const exec = latheLoRACronJobEngine.startExecution(job.id)!;
        latheLoRACronJobEngine.completeExecution(exec.id, { run: i });
      }

      const executions = latheLoRACronJobEngine.getExecutions();
      expect(executions.length).toBeLessThanOrEqual(5);
    });
  });

  describe("job statistics", () => {
    it("should calculate job statistics", () => {
      const job = latheLoRACronJobEngine.createJob("model_health");

      // Run 3 successful, 1 failed
      for (let i = 0; i < 3; i++) {
        const exec = latheLoRACronJobEngine.startExecution(job.id)!;
        latheLoRACronJobEngine.completeExecution(exec.id, { success: true });
      }
      const failExec = latheLoRACronJobEngine.startExecution(job.id)!;
      latheLoRACronJobEngine.completeExecution(failExec.id, undefined, "Error");

      const stats = latheLoRACronJobEngine.getJobStats(job.id);
      expect(stats).not.toBeNull();
      expect(stats!.total_runs).toBe(4);
      expect(stats!.success_rate).toBe(75); // 3/4
      expect(stats!.avg_duration_ms).toBeGreaterThanOrEqual(0);
      expect(stats!.last_status).toBe("failed");
    });

    it("should return null for unknown job", () => {
      const stats = latheLoRACronJobEngine.getJobStats("unknown-id");
      expect(stats).toBeNull();
    });
  });

  describe("schedule summary", () => {
    it("should generate schedule summary", () => {
      latheLoRACronJobEngine.createJob("drift_check", "model-1");
      latheLoRACronJobEngine.createJob("backup", "model-1");
      latheLoRACronJobEngine.createJob("cleanup");

      const summary = latheLoRACronJobEngine.getScheduleSummary();
      expect(summary).toContain("Cron Job Schedule");
      expect(summary).toContain("Total Jobs: 3");
      expect(summary).toContain("Running: 0");
      expect(summary).toContain("Drift Detection Check");
    });
  });
});
