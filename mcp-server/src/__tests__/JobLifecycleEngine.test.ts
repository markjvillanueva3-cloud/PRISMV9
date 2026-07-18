/**
 * JobLifecycleEngine — public-surface behavioral tests
 *
 * Exercises the singleton's CRUD + tracking surface (create, status,
 * progress, time, inspection, summary, dashboard).
 */

import { describe, it, expect } from "vitest";
import { jobLifecycleEngine, JOB_STATUS } from "../engines/JobLifecycleEngine.js";

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

  describe("operationsKpis()", () => {
    it("returns a real, bounded KPI rollup once jobs exist", () => {
      jobLifecycleEngine.createJob({ customer: "TEST-OPS", part_number: "OPS-1", quantity: 1 });
      const k = jobLifecycleEngine.operationsKpis();
      expect(k.data_available).toBe(true);
      expect(k.total_jobs).toBeGreaterThan(0);
      expect(typeof k.by_status).toBe("object");
      // percentages are either null (no qualifying jobs) or bounded to [0,100]
      for (const v of [k.on_time_delivery_rate, k.schedule_health_pct]) {
        if (v !== null) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
      expect(k.overdue_pct).toBeGreaterThanOrEqual(0);
      expect(k.at_risk_pct).toBeLessThanOrEqual(100);
    });

    it("counts an active past-due job as overdue (derived from real due_date, not fabricated)", () => {
      const before = jobLifecycleEngine.operationsKpis();
      jobLifecycleEngine.createJob({
        customer: "TEST-OVERDUE", part_number: "OD-1", quantity: 1,
        due_date: "2020-01-01T00:00:00.000Z",
      });
      const after = jobLifecycleEngine.operationsKpis();
      expect(after.overdue).toBe(before.overdue + 1);
    });

    it("does NOT count a far-future-due active job as overdue", () => {
      const before = jobLifecycleEngine.operationsKpis();
      jobLifecycleEngine.createJob({
        customer: "TEST-FUTURE", part_number: "FT-1", quantity: 1,
        due_date: "2099-01-01T00:00:00.000Z",
      });
      const after = jobLifecycleEngine.operationsKpis();
      expect(after.overdue).toBe(before.overdue);
      expect(after.active_jobs).toBe(before.active_jobs + 1);
    });

    it("on-time-delivery rate uses actual_end vs due_date: an on-time ship lifts it, a late ship never raises it", () => {
      // On-time: future due, shipped now -> actual_end <= due_date.
      const onTime = jobLifecycleEngine.createJob({
        customer: "TEST-ONTIME", part_number: "OT-1", quantity: 1,
        due_date: "2099-01-01T00:00:00.000Z",
      });
      jobLifecycleEngine.updateStatus(onTime.id, JOB_STATUS.SHIPPED);
      const mid = jobLifecycleEngine.operationsKpis();
      expect(mid.on_time_delivery_rate).not.toBeNull();
      expect(mid.on_time_delivery_rate as number).toBeGreaterThan(0);

      // Late: past due, shipped now -> actual_end > due_date. Adding a late ship cannot raise the rate.
      const late = jobLifecycleEngine.createJob({
        customer: "TEST-LATE", part_number: "LT-1", quantity: 1,
        due_date: "2020-01-01T00:00:00.000Z",
      });
      jobLifecycleEngine.updateStatus(late.id, JOB_STATUS.SHIPPED);
      const after = jobLifecycleEngine.operationsKpis();
      expect(after.completed_jobs).toBe(mid.completed_jobs + 1);
      expect(after.on_time_delivery_rate as number).toBeLessThanOrEqual(mid.on_time_delivery_rate as number);
    });
  });
});
