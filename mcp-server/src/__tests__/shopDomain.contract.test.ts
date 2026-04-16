/**
 * ULT-MS0 P2-U02: Shop Domain Contract Regression Suite
 *
 * Validates canonical shop contracts parse correctly, entity naming
 * is consistent, and live event room conventions are followed.
 * Fails closed when IDs, payloads, or room names drift.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  Job, JobStatus, TravelerStep, TravelerStepStatus,
  LaborSession, LaborType, QuantityActual, Approval, Attachment,
  Provenance, ShopEntityId, ISOTimestamp,
} from "../schemas/shop/shopDomain.js";
import {
  ShopEvent, ShopEventType,
  JobCreatedPayload, JobStatusChangedPayload,
  LaborSessionStartedPayload, TravelerStepCompletedPayload,
  jobRoom, deptRoom, empRoom, shopBroadcast,
} from "../schemas/shop/liveEventContracts.js";
import { ShopStateEngine } from "../engines/ShopStateEngine.js";
import { InMemoryShopRepository } from "../engines/ShopRepositoryPort.js";

describe("Shop Domain Contracts", () => {

  describe("Schema validation", () => {
    it("Job schema validates a complete job object", () => {
      const valid: z.infer<typeof Job> = {
        id: "JOB-001",
        customer: "Acme Corp",
        part_number: "P-12345",
        part_name: "Bracket Assembly",
        status: "in_progress",
        status_history: [
          { status: "ordered", timestamp: "2026-01-15T08:00:00Z", user: "admin" },
          { status: "in_progress", previous_status: "ordered", timestamp: "2026-01-16T09:00:00Z", user: "shop-lead" },
        ],
        quantity: 100,
        schedule: { due_date: "2026-02-01T00:00:00Z", order_date: "2026-01-15T08:00:00Z" },
        progress: { percent_complete: 45, parts_complete: 45, parts_total: 100 },
        notes: ["Rush order"],
        provenance: { created_by: "admin", created_at: "2026-01-15T08:00:00Z" },
      };
      expect(() => Job.parse(valid)).not.toThrow();
    });

    it("Job rejects invalid status", () => {
      const invalid = {
        id: "JOB-001", customer: "X", part_number: "P-1", status: "banana",
        status_history: [], quantity: 1,
        schedule: { due_date: "2026-01-01T00:00:00Z" },
        progress: { percent_complete: 0, parts_complete: 0, parts_total: 1 },
        notes: [], provenance: { created_by: "a", created_at: "2026-01-01T00:00:00Z" },
      };
      expect(() => Job.parse(invalid)).toThrow();
    });

    it("LaborSession validates with pause periods", () => {
      const session: z.infer<typeof LaborSession> = {
        id: "LAB-001",
        employee_id: "EMP-01",
        job_id: "JOB-001",
        labor_type: "production_run",
        start_time: "2026-01-16T08:00:00Z",
        end_time: "2026-01-16T16:00:00Z",
        pause_periods: [
          { start: "2026-01-16T12:00:00Z", end: "2026-01-16T12:30:00Z", reason: "Lunch", reason_category: "break" },
        ],
        status: "completed",
        total_minutes: 480,
        productive_minutes: 450,
        good_parts: 45,
        provenance: { created_by: "EMP-01", created_at: "2026-01-16T08:00:00Z" },
      };
      expect(() => LaborSession.parse(session)).not.toThrow();
    });

    it("TravelerStep validates all status values", () => {
      const statuses: z.infer<typeof TravelerStepStatus>[] = ["pending", "setup", "running", "complete", "skipped", "hold"];
      for (const s of statuses) {
        expect(() => TravelerStepStatus.parse(s)).not.toThrow();
      }
    });

    it("JobStatus has all 13 lifecycle states", () => {
      const expected = [
        "quoted", "ordered", "scheduled", "in_progress", "on_hold",
        "qc_pending", "qc_passed", "qc_failed", "finishing",
        "complete", "shipped", "invoiced", "closed",
      ];
      for (const s of expected) {
        expect(() => JobStatus.parse(s)).not.toThrow();
      }
    });

    it("LaborType has all 9 process types", () => {
      const expected = [
        "setup", "production_run", "first_article", "rework",
        "inspection", "deburring", "secondary_ops", "programming", "material_handling",
      ];
      for (const t of expected) {
        expect(() => LaborType.parse(t)).not.toThrow();
      }
    });
  });

  describe("Live event contracts", () => {
    it("ShopEventType covers job + traveler + labor + quality + shift + attachment", () => {
      const categories = ["job.", "traveler.", "labor.", "quality.", "shift.", "attachment."];
      for (const cat of categories) {
        const matching = ShopEventType.options.filter((t: string) => t.startsWith(cat));
        expect(matching.length).toBeGreaterThan(0);
      }
    });

    it("Room name helpers follow convention", () => {
      expect(jobRoom("JOB-001")).toBe("job:JOB-001");
      expect(deptRoom("machining")).toBe("dept:machining");
      expect(empRoom("EMP-01")).toBe("emp:EMP-01");
      expect(shopBroadcast()).toBe("shop:all");
    });
  });

  describe("ShopStateEngine integration", () => {
    it("creates a job and emits event", async () => {
      const repo = new InMemoryShopRepository();
      const engine = new ShopStateEngine(repo);
      const events: any[] = [];
      engine.onEvent(e => events.push(e));

      const job = await engine.createJob({
        customer: "Test Inc",
        part_number: "TEST-001",
        quantity: 50,
        due_date: "2026-03-01T00:00:00Z",
        created_by: "test-user",
      });

      expect(job.id).toMatch(/^JOB-/);
      expect(job.status).toBe("ordered");
      expect(job.quantity).toBe(50);
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe("job.created");
      expect(events[0].room).toBe("shop:all");
    });

    it("tracks labor session lifecycle", async () => {
      const repo = new InMemoryShopRepository();
      const engine = new ShopStateEngine(repo);
      const events: any[] = [];
      engine.onEvent(e => events.push(e));

      const session = await engine.startLabor({
        employee_id: "EMP-01",
        job_id: "JOB-001",
        labor_type: "production_run",
      });
      expect(session.status).toBe("active");

      const paused = await engine.pauseLabor(session.id, "Tool change", "tool_change");
      expect(paused?.status).toBe("paused");

      const resumed = await engine.resumeLabor(session.id);
      expect(resumed?.status).toBe("active");

      const completed = await engine.completeLabor(session.id, 25, 2);
      expect(completed?.status).toBe("completed");
      expect(completed?.good_parts).toBe(25);
      expect(completed?.scrap_count).toBe(2);
      expect(completed?.total_minutes).toBeGreaterThanOrEqual(0);

      // Should have 4 events: started, paused, resumed, completed
      expect(events.length).toBe(4);
    });

    it("records quantity and emits event", async () => {
      const repo = new InMemoryShopRepository();
      const engine = new ShopStateEngine(repo);
      const events: any[] = [];
      engine.onEvent(e => events.push(e));

      const qty = await engine.recordQuantity({
        job_id: "JOB-001",
        good_parts: 10,
        scrap_parts: 1,
        rework_parts: 0,
        recorded_by: "inspector-1",
      });
      expect(qty.id).toMatch(/^QTY-/);
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe("labor.parts_recorded");
    });

    it("shop snapshot returns summary", async () => {
      const repo = new InMemoryShopRepository();
      const engine = new ShopStateEngine(repo);

      await engine.createJob({ customer: "A", part_number: "P1", quantity: 10, due_date: "2026-06-01T00:00:00Z", created_by: "u" });
      await engine.createJob({ customer: "B", part_number: "P2", quantity: 20, due_date: "2026-06-01T00:00:00Z", created_by: "u" });

      const snapshot = await engine.shopSnapshot();
      expect(snapshot.active_jobs).toBe(2);
      expect(snapshot.jobs_by_status["ordered"]).toBe(2);
    });
  });
});
