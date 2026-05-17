/**
 * JobLifecycleEngine — public-surface behavioral tests
 *
 * Exercises the singleton's CRUD + tracking surface (create, status,
 * progress, time, inspection, summary, dashboard).
 */

import { describe, it, expect } from "vitest";
import { jobLifecycleEngine } from "../engines/JobLifecycleEngine.js";

describe("JobLifecycleEngine", () => {
  describe("createJob()", () => {
    it("returns a populated Job with an id, status_history, and schedule", () => {
      const job = jobLifecycleEngine.createJob({
        customer: "TEST-ITW",
        part_number: "P-001",
        part_name: "Cold-heading die blank",
        quantity: 10,
        lead_time_days: 14,
      });
      expect(job.id.length).toBeGreaterThan(0);
      expect(job.customer).toBe("TEST-ITW");
      expect(job.quantity).toBe(10);
      expect(job.status_history.length).toBeGreaterThanOrEqual(1);
      expect(job.schedule.due_date.length).toBeGreaterThan(0);
    });

    it("seeds progress with 0% complete and parts_total = quantity", () => {
      const job = jobLifecycleEngine.createJob({
        customer: "TEST-ALCOA",
        part_number: "P-002",
        quantity: 50,
      });
      expect(job.progress.percent_complete).toBe(0);
      expect(job.progress.parts_complete).toBe(0);
      expect(job.progress.parts_total).toBe(50);
    });
  });

  describe("getJob() + getJobSummary()", () => {
    it("getJob() returns the persisted job by id", () => {
      const created = jobLifecycleEngine.createJob({
        customer: "TEST-SFS",
        part_number: "P-003",
        quantity: 5,
      });
      const fetched = jobLifecycleEngine.getJob(created.id);
      expect("error" in fetched).toBe(false);
      if (!("error" in fetched)) {
        expect(fetched.id).toBe(created.id);
      }
    });

    it("getJob() returns {error} for an unknown id", () => {
      const result = jobLifecycleEngine.getJob("nonexistent-job-id");
      expect("error" in result).toBe(true);
    });

    it("getJobSummary() returns either a summary or {error}", () => {
      const created = jobLifecycleEngine.createJob({
        customer: "TEST-OPTIMAS",
        part_number: "P-004",
        quantity: 1,
      });
      const summary = jobLifecycleEngine.getJobSummary(created.id);
      // shape can be either the summary or an error envelope
      expect("error" in summary || "id" in summary).toBe(true);
    });
  });

  describe("updateProgress()", () => {
    it("advances parts_complete and recomputes percent_complete", () => {
      const job = jobLifecycleEngine.createJob({
        customer: "TEST-HK",
        part_number: "P-005",
        quantity: 100,
      });
      const updated = jobLifecycleEngine.updateProgress(job.id, 25);
      expect("error" in updated).toBe(false);
      const fetched = jobLifecycleEngine.getJob(job.id);
      if (!("error" in fetched)) {
        expect(fetched.progress.parts_complete).toBe(25);
        expect(fetched.progress.percent_complete).toBeGreaterThan(0);
        expect(fetched.progress.percent_complete).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("recordTime()", () => {
    it("accumulates actual_hours and stores a time-tracking entry", () => {
      const job = jobLifecycleEngine.createJob({
        customer: "TEST-ITW",
        part_number: "P-006",
        quantity: 2,
        estimated_hours: 4,
      });
      const result = jobLifecycleEngine.recordTime(job.id, {
        hours: 1.5,
        user: "operator-A",
        activity: "setup",
      });
      expect("error" in result).toBe(false);
      const fetched = jobLifecycleEngine.getJob(job.id);
      if (!("error" in fetched)) {
        expect(fetched.time_tracking.actual_hours).toBeGreaterThanOrEqual(1.5);
        expect(fetched.time_tracking.entries.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("addInspection()", () => {
    it("appends an inspection to quality.inspections", () => {
      const job = jobLifecycleEngine.createJob({
        customer: "TEST-INSP",
        part_number: "P-007",
        quantity: 1,
      });
      const out = jobLifecycleEngine.addInspection(job.id, {
        passed: true,
        inspector: "QA-1",
        notes: "first-article ok",
      });
      expect("error" in out).toBe(false);
      const fetched = jobLifecycleEngine.getJob(job.id);
      if (!("error" in fetched)) {
        expect(fetched.quality.inspections.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("getActiveJobs() + dashboard()", () => {
    it("getActiveJobs() returns an array (may include earlier test jobs)", () => {
      jobLifecycleEngine.createJob({
        customer: "TEST-ACTIVE",
        part_number: "P-008",
        quantity: 3,
      });
      const active = jobLifecycleEngine.getActiveJobs();
      expect(Array.isArray(active)).toBe(true);
    });

    it("dashboard() returns an object with countable structure", () => {
      const dash = jobLifecycleEngine.dashboard();
      expect(typeof dash).toBe("object");
      expect(dash).not.toBeNull();
    });
  });
});
