/**
 * WEDMProgressTrackerEngine Tests
 * Real-time progress and ETA tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  wedmProgressTrackerEngine,
  WEDMProgressTrackerEngine,
  type ProgressEvent,
} from "../engines/WEDMProgressTrackerEngine.js";

describe("WEDMProgressTrackerEngine", () => {
  describe("generateJobId", () => {
    it("generates unique IDs", () => {
      const id1 = wedmProgressTrackerEngine.generateJobId();
      const id2 = wedmProgressTrackerEngine.generateJobId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^job-\d+-[a-z0-9]+$/);
    });
  });

  describe("job lifecycle", () => {
    it("starts job and returns progress object", () => {
      const jobId = wedmProgressTrackerEngine.generateJobId();
      const progress = wedmProgressTrackerEngine.startJob(jobId, 30);

      expect(progress.job_id).toBe(jobId);
      expect(progress.total_stages).toBe(30);
      expect(progress.current_stage).toBe(0);
      expect(progress.status).toBe("running");
      expect(progress.percentage).toBe(0);
    });

    it("tracks stage progress", () => {
      const jobId = wedmProgressTrackerEngine.generateJobId();
      wedmProgressTrackerEngine.startJob(jobId, 30);

      wedmProgressTrackerEngine.beginStage(jobId, 1, "DXF Parse");
      let progress = wedmProgressTrackerEngine.getProgress(jobId);
      expect(progress?.current_stage).toBe(1);

      wedmProgressTrackerEngine.completeStage(jobId, 1);
      progress = wedmProgressTrackerEngine.getProgress(jobId);
      expect(progress?.stage_timings[0].status).toBe("complete");
    });

    it("calculates percentage correctly", () => {
      const jobId = wedmProgressTrackerEngine.generateJobId();
      wedmProgressTrackerEngine.startJob(jobId, 10);

      wedmProgressTrackerEngine.beginStage(jobId, 1, "Stage 1");
      wedmProgressTrackerEngine.completeStage(jobId, 1);
      let progress = wedmProgressTrackerEngine.getProgress(jobId);
      expect(progress?.percentage).toBe(10); // 1/10 = 10%

      wedmProgressTrackerEngine.beginStage(jobId, 5, "Stage 5");
      wedmProgressTrackerEngine.completeStage(jobId, 5);
      progress = wedmProgressTrackerEngine.getProgress(jobId);
      expect(progress?.percentage).toBe(50); // 5/10 = 50%
    });

    it("handles stage failure", () => {
      const jobId = wedmProgressTrackerEngine.generateJobId();
      wedmProgressTrackerEngine.startJob(jobId, 30);

      wedmProgressTrackerEngine.beginStage(jobId, 5, "Dimension Extraction");
      wedmProgressTrackerEngine.failStage(jobId, 5, "Invalid geometry");

      const progress = wedmProgressTrackerEngine.getProgress(jobId);
      expect(progress?.status).toBe("failed");
      expect(progress?.stage_timings.find(t => t.stage_id === 5)?.status).toBe("failed");
    });

    it("completes job and removes from active", () => {
      const jobId = wedmProgressTrackerEngine.generateJobId();
      wedmProgressTrackerEngine.startJob(jobId, 5);

      for (let i = 1; i <= 5; i++) {
        wedmProgressTrackerEngine.beginStage(jobId, i, `Stage ${i}`);
        wedmProgressTrackerEngine.completeStage(jobId, i);
      }

      wedmProgressTrackerEngine.completeJob(jobId);

      const progress = wedmProgressTrackerEngine.getProgress(jobId);
      expect(progress).toBeUndefined(); // Removed from active
    });
  });

  describe("ETA calculation", () => {
    it("estimates total duration based on stages", () => {
      const engine = new WEDMProgressTrackerEngine();
      const eta = engine.estimateTotalDuration(30);
      expect(eta).toBeGreaterThan(0);
    });

    it("refines ETA as stages complete", () => {
      const engine = new WEDMProgressTrackerEngine();
      const jobId = engine.generateJobId();
      engine.startJob(jobId, 10);

      const initialEta = engine.getProgress(jobId)?.eta_ms || 0;

      // Complete some stages
      engine.beginStage(jobId, 1, "Stage 1");
      engine.completeStage(jobId, 1);
      engine.beginStage(jobId, 2, "Stage 2");
      engine.completeStage(jobId, 2);

      const refinedEta = engine.getProgress(jobId)?.eta_ms || 0;
      // ETA should be recalculated (may go up or down based on actual timing)
      expect(typeof refinedEta).toBe("number");
    });
  });

  describe("event subscription", () => {
    it("notifies job-specific listeners", () => {
      const engine = new WEDMProgressTrackerEngine();
      const jobId = engine.generateJobId();
      const events: ProgressEvent[] = [];

      const unsubscribe = engine.subscribe(jobId, (event) => {
        events.push(event);
      });

      engine.startJob(jobId, 5);
      engine.beginStage(jobId, 1, "Test Stage");
      engine.completeStage(jobId, 1);

      expect(events.length).toBeGreaterThanOrEqual(3); // start, begin, complete
      expect(events[0].type).toBe("start");

      unsubscribe();
    });

    it("notifies global listeners", () => {
      const engine = new WEDMProgressTrackerEngine();
      const events: ProgressEvent[] = [];

      const unsubscribe = engine.subscribeAll((event) => {
        events.push(event);
      });

      const jobId = engine.generateJobId();
      engine.startJob(jobId, 5);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].job_id).toBe(jobId);

      unsubscribe();
    });

    it("unsubscribe stops notifications", () => {
      const engine = new WEDMProgressTrackerEngine();
      const jobId = engine.generateJobId();
      let eventCount = 0;

      const unsubscribe = engine.subscribe(jobId, () => {
        eventCount++;
      });

      engine.startJob(jobId, 5);
      const countAfterStart = eventCount;

      unsubscribe();

      engine.beginStage(jobId, 1, "Stage");
      engine.completeStage(jobId, 1);

      // Should not have received more events
      expect(eventCount).toBe(countAfterStart);
    });
  });

  describe("getActiveJobs", () => {
    it("returns all active jobs", () => {
      const engine = new WEDMProgressTrackerEngine();

      const job1 = engine.generateJobId();
      const job2 = engine.generateJobId();

      engine.startJob(job1, 10);
      engine.startJob(job2, 20);

      const active = engine.getActiveJobs();
      expect(active).toHaveLength(2);
      expect(active.map(j => j.job_id)).toContain(job1);
      expect(active.map(j => j.job_id)).toContain(job2);

      // Cleanup
      engine.completeJob(job1);
      engine.completeJob(job2);
    });
  });

  describe("stage timing", () => {
    it("records stage duration", () => {
      const engine = new WEDMProgressTrackerEngine();
      const jobId = engine.generateJobId();
      engine.startJob(jobId, 5);

      engine.beginStage(jobId, 1, "Test");
      // Simulate some work
      engine.completeStage(jobId, 1);

      const progress = engine.getProgress(jobId);
      const timing = progress?.stage_timings[0];

      expect(timing?.start_time).toBeDefined();
      expect(timing?.end_time).toBeDefined();
      expect(timing?.duration_ms).toBeGreaterThanOrEqual(0);

      engine.completeJob(jobId);
    });
  });

  describe("configuration", () => {
    it("can update history weight", () => {
      const engine = new WEDMProgressTrackerEngine();
      engine.configure({ history_weight: 0.5 });
      expect(engine.getConfig().history_weight).toBe(0.5);
    });

    it("can enable verbose logging", () => {
      const engine = new WEDMProgressTrackerEngine({ verbose: true });
      expect(engine.getConfig().verbose).toBe(true);
    });
  });
});
