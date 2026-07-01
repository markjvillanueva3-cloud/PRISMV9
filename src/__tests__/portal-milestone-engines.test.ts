/**
 * Tests for Session 6-9: MilestoneTrackingEngine + CustomerPortalEngine
 *
 * Coverage:
 * - MilestoneTrackingEngine: 14-milestone template, create/advance/skip, auto-advance, events
 * - CustomerPortalEngine: token CRUD, validation, rate limiting, portal views, quality docs, messages
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MilestoneIntelligenceEngine } from "../engines/MilestoneIntelligenceEngine.js";
import { MilestoneTrackingEngine, milestoneTrackingEngine } from "../engines/MilestoneTrackingEngine.js";
import { CustomerPortalEngine } from "../engines/CustomerPortalEngine.js";

// ─── MilestoneTrackingEngine ─────────────────────────────────────────────────

describe("MilestoneTrackingEngine", () => {
  let engine: MilestoneTrackingEngine;

  beforeEach(() => {
    engine = new MilestoneTrackingEngine();
  });

  describe("createTimeline", () => {
    it("creates 14-milestone timeline with first active", () => {
      const tl = engine.createTimeline({ job_id: "JOB-001" });
      expect(tl.milestones).toHaveLength(14);
      expect(tl.milestones[0].status).toBe("active");
      expect(tl.milestones[0].milestone_key).toBe("quote_sent");
      expect(tl.milestones[1].status).toBe("pending");
      expect(tl.current_milestone).toBe("quote_sent");
      expect(tl.current_idx).toBe(0);
      expect(tl.progress_pct).toBe(0);
      expect(tl.total_milestones).toBe(14);
    });

    it("starts at specified milestone with prior ones completed", () => {
      const tl = engine.createTimeline({ job_id: "JOB-002", start_at_milestone: "programming" });
      expect(tl.current_milestone).toBe("programming");
      // milestones 0-5 completed, 6 active, 7-13 pending
      const completed = tl.milestones.filter((m) => m.status === "completed");
      expect(completed).toHaveLength(6);
      expect(tl.milestones[6].status).toBe("active");
      expect(tl.milestones[6].milestone_key).toBe("programming");
    });

    it("includes quote_id and customer_id", () => {
      const tl = engine.createTimeline({
        job_id: "JOB-003", quote_id: "Q-100", customer_id: "CUST-50",
      });
      expect(tl.quote_id).toBe("Q-100");
      expect(tl.customer_id).toBe("CUST-50");
    });

    it("throws on duplicate timeline", () => {
      engine.createTimeline({ job_id: "JOB-DUP" });
      expect(() => engine.createTimeline({ job_id: "JOB-DUP" })).toThrow("already exists");
    });

    it("throws on invalid start_at_milestone key", () => {
      expect(() => engine.createTimeline({
        job_id: "JOB-BAD-START", start_at_milestone: "nonexistent_key" as any,
      })).toThrow("Invalid start_at_milestone");
    });
  });

  describe("advanceMilestone", () => {
    it("completes current active and activates next", () => {
      engine.createTimeline({ job_id: "JOB-A1" });
      const tl = engine.advanceMilestone({ job_id: "JOB-A1" });
      expect(tl.milestones[0].status).toBe("completed");
      expect(tl.milestones[0].completed_at).toBeTruthy();
      expect(tl.milestones[1].status).toBe("active");
      expect(tl.current_milestone).toBe("quote_accepted");
      expect(tl.progress_pct).toBe(Math.round(100 / 14));
    });

    it("advances specific milestone by key", () => {
      engine.createTimeline({ job_id: "JOB-A2", start_at_milestone: "programming" });
      const tl = engine.advanceMilestone({ job_id: "JOB-A2", milestone_key: "programming" });
      expect(tl.milestones[6].status).toBe("completed");
      expect(tl.milestones[7].status).toBe("active");
    });

    it("throws when no active milestone", () => {
      engine.createTimeline({ job_id: "JOB-A3" });
      // Advance all 14
      for (let i = 0; i < 14; i++) {
        engine.advanceMilestone({ job_id: "JOB-A3" });
      }
      expect(() => engine.advanceMilestone({ job_id: "JOB-A3" })).toThrow("No active milestone");
    });

    it("throws on already completed milestone", () => {
      engine.createTimeline({ job_id: "JOB-A4" });
      engine.advanceMilestone({ job_id: "JOB-A4" }); // completes quote_sent
      expect(() =>
        engine.advanceMilestone({ job_id: "JOB-A4", milestone_key: "quote_sent" }),
      ).toThrow("already completed");
    });

    it("records notes and advanced_by in metadata", () => {
      engine.createTimeline({ job_id: "JOB-A5" });
      const tl = engine.advanceMilestone({
        job_id: "JOB-A5", notes: "Customer confirmed", advanced_by: "admin",
      });
      expect(tl.milestones[0].notes).toBe("Customer confirmed");
      expect(tl.milestones[0].metadata.advanced_by).toBe("admin");
    });
  });

  describe("skipMilestone", () => {
    it("skips a pending milestone and activates next", () => {
      engine.createTimeline({ job_id: "JOB-S1" });
      engine.advanceMilestone({ job_id: "JOB-S1" }); // complete quote_sent, active=quote_accepted
      const tl = engine.skipMilestone({ job_id: "JOB-S1", milestone_key: "quote_accepted", reason: "No approval needed" });
      expect(tl.milestones[1].status).toBe("skipped");
      expect(tl.milestones[1].notes).toContain("No approval needed");
      expect(tl.milestones[2].status).toBe("active");
    });

    it("throws on completed milestone skip", () => {
      engine.createTimeline({ job_id: "JOB-S2" });
      engine.advanceMilestone({ job_id: "JOB-S2" });
      expect(() =>
        engine.skipMilestone({ job_id: "JOB-S2", milestone_key: "quote_sent" }),
      ).toThrow("Cannot skip completed");
    });

    it("counts skipped milestones in progress", () => {
      engine.createTimeline({ job_id: "JOB-S3" });
      engine.skipMilestone({ job_id: "JOB-S3", milestone_key: "quote_sent" });
      const tl = engine.getTimeline("JOB-S3")!;
      expect(tl.completed_count).toBe(1); // skipped counts as "done"
      expect(tl.progress_pct).toBe(Math.round(100 / 14));
    });
  });

  describe("onJobStatusChange (auto-advance)", () => {
    it("auto-advances to programming when job becomes scheduled", () => {
      engine.createTimeline({ job_id: "JOB-AUTO1" });
      const tl = engine.onJobStatusChange("JOB-AUTO1", "scheduled")!;
      // Should complete milestones 0-5 and activate programming (6)
      expect(tl.milestones[6].status).toBe("active");
      expect(tl.milestones[5].status).toBe("completed");
      expect(tl.milestones[5].metadata.auto_advanced).toBe(true);
    });

    it("returns null for unknown job status", () => {
      engine.createTimeline({ job_id: "JOB-AUTO2" });
      const result = engine.onJobStatusChange("JOB-AUTO2", "unknown_status");
      expect(result).toBeNull();
    });

    it("returns null for job without timeline", () => {
      const result = engine.onJobStatusChange("NO-SUCH-JOB", "scheduled");
      expect(result).toBeNull();
    });

    it("does not re-advance already completed milestones", () => {
      engine.createTimeline({ job_id: "JOB-AUTO3", start_at_milestone: "production" });
      const tl = engine.onJobStatusChange("JOB-AUTO3", "finishing")!;
      expect(tl.milestones[11].status).toBe("active"); // finishing
      // production (idx 9) was already completed from start
    });
  });

  describe("getTimeline / getEvents / listTrackedJobs / deleteTimeline", () => {
    it("getTimeline returns null for unknown job", () => {
      expect(engine.getTimeline("NOPE")).toBeNull();
    });

    it("getEvents filters by job", () => {
      engine.createTimeline({ job_id: "JOB-E1" });
      engine.createTimeline({ job_id: "JOB-E2" });
      engine.advanceMilestone({ job_id: "JOB-E1" });
      const events = engine.getEvents("JOB-E1");
      expect(events.length).toBeGreaterThanOrEqual(2); // created + advanced
      expect(events.every((e) => e.job_id === "JOB-E1")).toBe(true);
    });

    it("listTrackedJobs returns all job IDs", () => {
      engine.createTimeline({ job_id: "JOB-L1" });
      engine.createTimeline({ job_id: "JOB-L2" });
      expect(engine.listTrackedJobs()).toContain("JOB-L1");
      expect(engine.listTrackedJobs()).toContain("JOB-L2");
    });

    it("deleteTimeline removes job", () => {
      engine.createTimeline({ job_id: "JOB-D1" });
      expect(engine.deleteTimeline("JOB-D1")).toEqual({ deleted: true });
      expect(engine.getTimeline("JOB-D1")).toBeNull();
    });

    it("deleteTimeline returns false for unknown job", () => {
      expect(engine.deleteTimeline("NOPE")).toEqual({ deleted: false });
    });
  });

  describe("estimated delivery", () => {
    it("provides estimated delivery date for incomplete timeline", () => {
      const tl = engine.createTimeline({ job_id: "JOB-ETA1" });
      expect(tl.estimated_delivery).toBeTruthy();
      // Should be a date string in YYYY-MM-DD format
      expect(tl.estimated_delivery).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns undefined delivery for fully completed timeline", () => {
      engine.createTimeline({ job_id: "JOB-ETA2" });
      for (let i = 0; i < 14; i++) {
        engine.advanceMilestone({ job_id: "JOB-ETA2" });
      }
      const tl = engine.getTimeline("JOB-ETA2")!;
      expect(tl.estimated_delivery).toBeUndefined();
      expect(tl.progress_pct).toBe(100);
    });
  });
});

// ─── CustomerPortalEngine ────────────────────────────────────────────────────

describe("MilestoneIntelligenceEngine", () => {
  let engine: MilestoneIntelligenceEngine;

  beforeEach(() => {
    engine = new MilestoneIntelligenceEngine();
    milestoneTrackingEngine.deleteTimeline("JOB-SYNC-1");
    milestoneTrackingEngine.deleteTimeline("JOB-SYNC-2");
    milestoneTrackingEngine.deleteTimeline("JOB-SYNC-3");
    milestoneTrackingEngine.deleteTimeline("JOB-SYNC-4");
    milestoneTrackingEngine.deleteTimeline("JOB-SYNC-5");
    milestoneTrackingEngine.deleteTimeline("JOB-SYNC-6");
  });

  it("seeds a programming-start timeline for newly released jobs", () => {
    const result = engine.syncMutation({
      job_id: "JOB-SYNC-1",
      source: "jobs-desk",
      trigger: "job-created",
      note: "Dispatch released the traveler.",
    });

    expect(result.refresh_timeline).toBe(true);
    expect(result.event.outcome).toBe("seeded");
    expect(result.timeline?.current_milestone).toBe("programming");
    expect(result.event.cli_command).toContain("prism milestone align");
  });

  it("stops on larger drift instead of silently skipping multiple execution stages", () => {
    milestoneTrackingEngine.createTimeline({ job_id: "JOB-SYNC-2" });

    const result = engine.syncMutation({
      job_id: "JOB-SYNC-2",
      source: "order-tracking",
      trigger: "order-production-logged",
      quantity_completed: 8,
      note: "Operator posted completed quantity.",
    });

    expect(result.refresh_timeline).toBe(false);
    expect(result.event.outcome).toBe("drift");
    expect(result.event.details.join(" ")).toContain("missing handoff history");
  });

  it("returns recent sync memory in reverse chronological order", () => {
    engine.syncMutation({
      job_id: "JOB-SYNC-3",
      source: "jobs-desk",
      trigger: "job-created",
    });
    engine.syncMutation({
      job_id: "JOB-SYNC-3",
      source: "jobs-desk",
      trigger: "job-status-changed",
      status: "planned",
    });

    const events = engine.listSyncEvents("JOB-SYNC-3", 2);
    expect(events).toHaveLength(2);
    expect(events[0].trigger).toBe("job-status-changed");
    expect(events[1].trigger).toBe("job-created");
  });

  it("maps traveler setup starts into the setup execution band", () => {
    const result = engine.syncMutation({
      job_id: "JOB-SYNC-4",
      source: "traveler-desk",
      trigger: "traveler-step-started",
      action: "setup",
      step_number: 20,
      operation: "Run cycle",
      department: "Machining",
      note: "Setup timer started from the traveler desk.",
    });

    expect(result.event.outcome).toBe("seeded");
    expect(result.timeline?.current_milestone).toBe("setup");
    expect(result.event.summary).toContain("traveler timeline");
  });

  it("records dispatch what-if passes without forcing timeline creation", () => {
    const result = engine.syncMutation({
      job_id: "JOB-SYNC-5",
      source: "dispatch-board",
      trigger: "dispatch-what-if-ran",
      machine_id: "VF-2SS",
      note: "What-if projected 18 minutes of downstream delay.",
    });

    expect(result.refresh_timeline).toBe(false);
    expect(result.timeline).toBeNull();
    expect(result.event.outcome).toBe("observed");
    expect(result.event.details.join(" ")).toContain("what-if");
  });

  it("aligns shop-floor department check-ins to the department-owned milestone", () => {
    const result = engine.syncMutation({
      job_id: "JOB-SYNC-6",
      source: "shop-floor-clock",
      trigger: "shop-floor-department-check-in",
      department: "Quality",
      operation: "Inspection",
      note: "Packet checked into quality from the floor kiosk.",
    });

    expect(result.refresh_timeline).toBe(true);
    expect(result.event.outcome).toBe("seeded");
    expect(result.timeline?.current_milestone).toBe("quality_inspection");
  });
});

describe("CustomerPortalEngine", () => {
  let engine: CustomerPortalEngine;

  beforeEach(() => {
    engine = new CustomerPortalEngine();
  });

  describe("token management", () => {
    it("creates a token with defaults", () => {
      const token = engine.createToken({ token_type: "quote", entity_id: "Q-100" });
      expect(token.token).toBeTruthy();
      expect(token.token.length).toBeGreaterThan(20);
      expect(token.token_type).toBe("quote");
      expect(token.entity_id).toBe("Q-100");
      expect(token.scope).toEqual(["view"]);
      expect(token.rate_limit).toBe(10);
      expect(token.revoked).toBe(false);
      expect(token.access_count).toBe(0);
    });

    it("creates token with custom scope and expiry", () => {
      const token = engine.createToken({
        token_type: "order",
        entity_id: "JOB-001",
        scope: ["view", "documents", "messages"],
        expires_in_days: 7,
        rate_limit: 20,
      });
      expect(token.scope).toEqual(["view", "documents", "messages"]);
      expect(token.rate_limit).toBe(20);
    });

    it("rejects invalid expiry range", () => {
      expect(() =>
        engine.createToken({ token_type: "quote", entity_id: "Q-1", expires_in_days: 0 }),
      ).toThrow("between 1 and 365");
      expect(() =>
        engine.createToken({ token_type: "quote", entity_id: "Q-1", expires_in_days: 999 }),
      ).toThrow("between 1 and 365");
    });

    it("rejects invalid rate limit", () => {
      expect(() =>
        engine.createToken({ token_type: "quote", entity_id: "Q-1", rate_limit: 0 }),
      ).toThrow("between 1 and 100");
    });

    it("revokes a token", () => {
      const token = engine.createToken({ token_type: "quote", entity_id: "Q-200" });
      expect(engine.revokeToken(token.token)).toEqual({ revoked: true });

      const validation = engine.validateToken(token.token);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("revoked");
    });

    it("throws on revoking unknown token", () => {
      expect(() => engine.revokeToken("nonexistent")).toThrow("not found");
    });

    it("lists tokens for entity", () => {
      engine.createToken({ token_type: "quote", entity_id: "Q-300" });
      engine.createToken({ token_type: "quote", entity_id: "Q-300" });
      engine.createToken({ token_type: "quote", entity_id: "Q-OTHER" });
      const tokens = engine.listTokens("Q-300");
      expect(tokens).toHaveLength(2);
    });
  });

  describe("token validation", () => {
    it("validates a valid token", () => {
      const token = engine.createToken({ token_type: "quote", entity_id: "Q-V1" });
      const result = engine.validateToken(token.token);
      expect(result.valid).toBe(true);
      expect(result.token).toBeTruthy();
    });

    it("rejects nonexistent token", () => {
      const result = engine.validateToken("fake-token");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not found");
    });

    it("rejects expired token", () => {
      const token = engine.createToken({
        token_type: "quote", entity_id: "Q-EXP", expires_in_days: 1,
      });
      // Manually expire it
      (token as any).expires_at = new Date(Date.now() - 86400000).toISOString();
      const result = engine.validateToken(token.token);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("checks scope requirement", () => {
      const token = engine.createToken({
        token_type: "quote", entity_id: "Q-SCOPE", scope: ["view"],
      });
      expect(engine.validateToken(token.token, "view").valid).toBe(true);
      expect(engine.validateToken(token.token, "respond").valid).toBe(false);
    });

    it("enforces rate limiting", () => {
      const token = engine.createToken({
        token_type: "quote", entity_id: "Q-RATE", rate_limit: 3,
      });
      expect(engine.validateToken(token.token).valid).toBe(true);
      expect(engine.validateToken(token.token).valid).toBe(true);
      expect(engine.validateToken(token.token).valid).toBe(true);
      const result = engine.validateToken(token.token);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Rate limit");
    });

    it("updates access stats on successful validation", () => {
      const token = engine.createToken({ token_type: "quote", entity_id: "Q-STATS" });
      engine.validateToken(token.token);
      engine.validateToken(token.token);
      expect(token.access_count).toBe(2);
      expect(token.last_accessed).toBeTruthy();
    });
  });

  describe("portal quote view", () => {
    it("returns customer-safe quote view", () => {
      const view = engine.getQuoteView({
        quote_id: "Q-500",
        revision: {
          revision_number: 2,
          unit_price_usd: 45.00,
          total_price_usd: 4500.00,
          quantity: 100,
          quantity_breaks: [{ quantity: 250, unit_price: 38.00, total_price: 9500.00 }],
          lead_time_options: [{ tier: "standard", days: 14, unit_price: 45.00 }],
          dfm_score: 85,
          dfm_issues: [
            { severity: "warning", message: "Tight tolerance on bore" },
            { severity: "internal", message: "Cost driver: custom fixture" },
          ],
        },
        status: "sent",
      });
      expect(view.unit_price_usd).toBe(45.00);
      expect(view.quantity_breaks).toHaveLength(1);
      // Internal DFM issues should be filtered out
      expect(view.dfm_issues).toHaveLength(1);
      expect(view.dfm_issues[0].severity).toBe("warning");
    });

    it("throws without revision data", () => {
      expect(() => engine.getQuoteView({ quote_id: "Q-501" })).toThrow("revision data required");
    });
  });

  describe("quote response", () => {
    it("records accept response", () => {
      const result = engine.respondToQuote({
        quote_id: "Q-600",
        response: "accept",
        customer_name: "Acme Corp",
        message: "Looks good, let's proceed",
      });
      expect(result.recorded).toBe(true);
      expect(result.response).toBe("accept");
      expect(result.message_id).toBeTruthy();
    });

    it("records request_changes with details", () => {
      const result = engine.respondToQuote({
        quote_id: "Q-601",
        response: "request_changes",
        customer_name: "Widget Inc",
        requested_changes: ["Lower qty break at 50", "Add anodize option"],
      });
      expect(result.recorded).toBe(true);
      const msgs = engine.listMessages("quote", "Q-601");
      expect(msgs[0].message).toContain("Lower qty break");
    });

    it("rejects invalid response", () => {
      expect(() =>
        engine.respondToQuote({
          quote_id: "Q-602",
          response: "maybe" as any,
          customer_name: "Test",
        }),
      ).toThrow("must be");
    });
  });

  describe("order status", () => {
    it("returns order status with milestones", () => {
      const status = engine.getOrderStatus({
        job_id: "JOB-700",
        job: { part_number: "WIDGET-001", quantity: 50, status: "in_progress" },
        timeline: {
          milestones: [
            { milestone_key: "quote_sent", label: "Quote Sent", status: "completed" },
            { milestone_key: "production", label: "Production", status: "active" },
          ],
          current_milestone: "production",
          progress_pct: 64,
          estimated_delivery: "2026-04-15",
        },
      });
      expect(status.part_number).toBe("WIDGET-001");
      expect(status.milestones).toHaveLength(2);
      expect(status.progress_pct).toBe(64);
      expect(status.estimated_delivery).toBe("2026-04-15");
    });

    it("handles missing job/timeline gracefully", () => {
      const status = engine.getOrderStatus({ job_id: "JOB-701" });
      expect(status.part_number).toBe("N/A");
      expect(status.milestones).toEqual([]);
      expect(status.progress_pct).toBe(0);
    });
  });

  describe("quality documents", () => {
    it("adds a quality document", () => {
      const doc = engine.addQualityDocument({
        job_id: "JOB-800",
        doc_type: "fai_as9102",
        title: "FAI Report — WIDGET-001",
        file_id: "file-123",
      });
      expect(doc.id).toBeTruthy();
      expect(doc.doc_type).toBe("fai_as9102");
      expect(doc.status).toBe("draft");
    });

    it("updates document status to approved", () => {
      const doc = engine.addQualityDocument({
        job_id: "JOB-801",
        doc_type: "material_cert",
        title: "Mat Cert — 6061-T6",
      });
      const updated = engine.updateQualityDocument({
        doc_id: doc.id,
        job_id: "JOB-801",
        status: "approved",
        reviewed_by: "QC Manager",
      });
      expect(updated.status).toBe("approved");
      expect(updated.reviewed_by).toBe("QC Manager");
      expect(updated.reviewed_at).toBeTruthy();
    });

    it("portal mode only shows approved docs", () => {
      engine.addQualityDocument({ job_id: "JOB-802", doc_type: "coc", title: "CoC Draft" });
      const approved = engine.addQualityDocument({ job_id: "JOB-802", doc_type: "fai_as9102", title: "FAI" });
      engine.updateQualityDocument({ doc_id: approved.id, job_id: "JOB-802", status: "approved" });

      const all = engine.listQualityDocuments("JOB-802", false);
      expect(all).toHaveLength(2);
      const portalView = engine.listQualityDocuments("JOB-802", true);
      expect(portalView).toHaveLength(1);
      expect(portalView[0].status).toBe("approved");
    });

    it("getQualityDocument returns specific doc", () => {
      const doc = engine.addQualityDocument({ job_id: "JOB-803", doc_type: "ndt_report", title: "NDT" });
      expect(engine.getQualityDocument("JOB-803", doc.id)).toBeTruthy();
      expect(engine.getQualityDocument("JOB-803", "fake")).toBeNull();
    });

    it("throws on missing job_id or title", () => {
      expect(() => engine.addQualityDocument({ job_id: "", doc_type: "coc", title: "T" })).toThrow("job_id");
      expect(() => engine.addQualityDocument({ job_id: "J", doc_type: "coc", title: "" })).toThrow("title");
    });
  });

  describe("messages", () => {
    it("adds and lists messages", () => {
      engine.addMessage({
        entity_type: "order", entity_id: "JOB-900",
        sender_type: "customer", sender_name: "John", message: "When will my order ship?",
      });
      engine.addMessage({
        entity_type: "order", entity_id: "JOB-900",
        sender_type: "shop", sender_name: "Shop Manager", message: "Tomorrow!",
      });
      const msgs = engine.listMessages("order", "JOB-900");
      expect(msgs).toHaveLength(2);
      const texts = msgs.map((m) => m.message);
      expect(texts).toContain("When will my order ship?");
      expect(texts).toContain("Tomorrow!");
    });

    it("rejects empty messages", () => {
      expect(() =>
        engine.addMessage({
          entity_type: "quote", entity_id: "Q-901",
          sender_type: "customer", sender_name: "Test", message: "   ",
        }),
      ).toThrow("cannot be empty");
    });

    it("rejects messages over 5000 chars", () => {
      expect(() =>
        engine.addMessage({
          entity_type: "quote", entity_id: "Q-902",
          sender_type: "customer", sender_name: "Test", message: "x".repeat(5001),
        }),
      ).toThrow("5000");
    });

    it("marks messages as read", () => {
      engine.addMessage({
        entity_type: "order", entity_id: "JOB-903",
        sender_type: "customer", sender_name: "Jane", message: "Question",
      });
      const count = engine.markMessagesRead("order", "JOB-903", "customer");
      expect(count).toBe(1);
      const msgs = engine.listMessages("order", "JOB-903");
      expect(msgs[0].read_at).toBeTruthy();
    });

    it("does not re-mark already read messages", () => {
      engine.addMessage({
        entity_type: "order", entity_id: "JOB-904",
        sender_type: "shop", sender_name: "Admin", message: "Update",
      });
      engine.markMessagesRead("order", "JOB-904", "shop");
      const count = engine.markMessagesRead("order", "JOB-904", "shop");
      expect(count).toBe(0);
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        engine.addMessage({
          entity_type: "order", entity_id: "JOB-905",
          sender_type: "customer", sender_name: "User", message: `Message ${i}`,
        });
      }
      expect(engine.listMessages("order", "JOB-905", 3)).toHaveLength(3);
    });
  });

  describe("stripInternalFields", () => {
    it("removes cost fields from objects", () => {
      const data = {
        name: "Widget",
        cost_breakdown: { material: 10, labor: 20 },
        margin: 0.35,
        unit_price: 50,
        markup: 1.5,
      };
      const clean = CustomerPortalEngine.stripInternalFields(data);
      expect(clean.name).toBe("Widget");
      expect(clean.unit_price).toBe(50);
      expect((clean as any).cost_breakdown).toBeUndefined();
      expect((clean as any).margin).toBeUndefined();
      expect((clean as any).markup).toBeUndefined();
    });
  });
});
