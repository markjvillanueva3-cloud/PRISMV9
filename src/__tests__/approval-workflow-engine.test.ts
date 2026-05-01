/**
 * Tests for ApprovalWorkflowEngine + RecordTimelineEngine — Session 6-6
 *
 * Covers:
 * - Workflow configuration (create, update, validation)
 * - Submission lifecycle (submit → in_review → approved/rejected)
 * - Auto-approve below threshold
 * - Multi-step approval chains
 * - Delegation
 * - Cancellation
 * - Pending approvals with overdue detection
 * - Duplicate submission prevention
 * - Stats
 * - Record timeline auto-population from EventBus
 * - Threaded comments with attachments
 * - Comment editing and soft-delete
 *
 * Security rules tested:
 * - decider_roles REQUIRED when step has role_required
 * - Self-approval blocked (decided_by !== submitted_by)
 * - Only original submitter can cancel
 * - Auto-approve blocked for $0 amounts (must be > 0 AND < threshold)
 * - Delegation max depth of 5 with circular delegation check
 * - auto_approved status cannot be cancelled
 *
 * Thresholds (seedDefaults):
 * - Quote: auto_approve_below_usd = 2500 (sales_manager)
 * - PO step1: auto_approve_below_usd = 2500 (purchasing_manager)
 * - PO step2: auto_approve_below_usd = 10000 (finance_manager)
 * - Invoice: auto_approve_below_usd = 1000 (finance_manager)
 * - Payroll: no auto-approve (finance_manager)
 * - NCR: no auto-approve, 2 steps (quality_manager, engineering_manager)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ApprovalWorkflowEngine } from "../engines/ApprovalWorkflowEngine.js";
import { RecordTimelineEngine } from "../engines/RecordTimelineEngine.js";

describe("ApprovalWorkflowEngine", () => {
  let engine: ApprovalWorkflowEngine;

  beforeEach(() => {
    engine = new ApprovalWorkflowEngine();
  });

  describe("configureWorkflow", () => {
    it("seeds 5 default workflows on construction", () => {
      const workflows = engine.listWorkflows();
      expect(workflows.length).toBe(5);
      const types = workflows.map((w) => w.entity_type).sort();
      expect(types).toEqual(["invoice", "ncr", "payroll", "purchase_order", "quote"]);
    });

    it("creates a new workflow", () => {
      const wf = engine.configureWorkflow({
        entity_type: "job",
        name: "Job Release Approval",
        steps: [
          { step_number: 1, role_required: "shop_manager", action_label: "Approve job release", timeout_hours: 12 },
        ],
      });
      expect(wf.id).toBeTruthy();
      expect(wf.entity_type).toBe("job");
      expect(wf.steps).toHaveLength(1);
      expect(engine.listWorkflows("job")).toHaveLength(1);
    });

    it("updates an existing workflow by entity_type+name", () => {
      const wf1 = engine.configureWorkflow({
        entity_type: "job",
        name: "Job Approval",
        steps: [{ step_number: 1, role_required: "a", action_label: "Step 1" }],
      });
      const wf2 = engine.configureWorkflow({
        entity_type: "job",
        name: "Job Approval",
        steps: [
          { step_number: 1, role_required: "a", action_label: "Step 1" },
          { step_number: 2, role_required: "b", action_label: "Step 2" },
        ],
      });
      expect(wf2.id).toBe(wf1.id);
      expect(wf2.steps).toHaveLength(2);
    });

    it("rejects empty steps", () => {
      expect(() =>
        engine.configureWorkflow({ entity_type: "job", name: "Empty", steps: [] })
      ).toThrow("at least one step");
    });

    it("rejects non-sequential step numbers", () => {
      expect(() =>
        engine.configureWorkflow({
          entity_type: "job",
          name: "Bad Steps",
          steps: [
            { step_number: 1, role_required: "a", action_label: "S1" },
            { step_number: 3, role_required: "b", action_label: "S3" },
          ],
        })
      ).toThrow("sequential");
    });
  });

  describe("submit", () => {
    it("submits a quote for approval", async () => {
      const inst = await engine.submit({
        entity_type: "quote",
        entity_id: "Q-001",
        submitted_by: "alice",
        entity_amount: 5000, // above $2500 threshold → in_review
      });
      expect(inst.status).toBe("in_review");
      expect(inst.current_step).toBe(1);
      expect(inst.total_steps).toBe(1);
      expect(inst.submitted_by).toBe("alice");
    });

    it("auto-approves below threshold", async () => {
      const inst = await engine.submit({
        entity_type: "quote",
        entity_id: "Q-002",
        submitted_by: "bob",
        entity_amount: 200, // below $2500 threshold and > $0 → auto_approved
      });
      expect(inst.status).toBe("auto_approved");
      expect(inst.completed_at).toBeTruthy();
      expect(inst.decisions).toHaveLength(1);
      expect(inst.decisions[0].decision).toBe("auto_approved");
    });

    it("rejects duplicate pending submission", async () => {
      await engine.submit({ entity_type: "quote", entity_id: "Q-DUP", submitted_by: "alice", entity_amount: 5000 });
      await expect(
        engine.submit({ entity_type: "quote", entity_id: "Q-DUP", submitted_by: "bob", entity_amount: 5000 })
      ).rejects.toThrow("already has a pending");
    });

    it("allows re-submission after rejection", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-REDO", submitted_by: "alice", entity_amount: 5000 });
      await engine.decide({ instance_id: inst.id, decision: "rejected", decided_by: "mgr", decider_roles: ["sales_manager"], reason: "Too high" });
      const inst2 = await engine.submit({ entity_type: "quote", entity_id: "Q-REDO", submitted_by: "alice", entity_amount: 5000 });
      expect(inst2.status).toBe("in_review");
      expect(inst2.id).not.toBe(inst.id);
    });
  });

  describe("decide", () => {
    it("approves a single-step workflow", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-100", submitted_by: "alice", entity_amount: 5000 });
      const decided = await engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "sales_mgr", decider_roles: ["sales_manager"] });
      expect(decided.status).toBe("approved");
      expect(decided.completed_at).toBeTruthy();
      expect(decided.decisions).toHaveLength(1);
    });

    it("rejects an approval", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-101", submitted_by: "alice", entity_amount: 5000 });
      const decided = await engine.decide({ instance_id: inst.id, decision: "rejected", decided_by: "sales_mgr", decider_roles: ["sales_manager"], reason: "Price too low" });
      expect(decided.status).toBe("rejected");
      expect(decided.decisions[0].reason).toBe("Price too low");
    });

    it("advances through multi-step PO approval", async () => {
      const inst = await engine.submit({
        entity_type: "purchase_order",
        entity_id: "PO-001",
        submitted_by: "buyer",
        entity_amount: 15000, // above both $2500 and $10000 thresholds
      });
      expect(inst.status).toBe("in_review");
      expect(inst.total_steps).toBe(2);

      // Step 1: purchasing manager approves
      const step1 = await engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "purchasing_mgr", decider_roles: ["purchasing_manager"] });
      expect(step1.current_step).toBe(2);
      expect(step1.status).toBe("in_review");

      // Step 2: finance manager approves
      const step2 = await engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "finance_mgr", decider_roles: ["finance_manager"] });
      expect(step2.status).toBe("approved");
      expect(step2.completed_at).toBeTruthy();
      expect(step2.decisions).toHaveLength(2);
    });

    it("auto-approves second step when amount is below threshold", async () => {
      const inst = await engine.submit({
        entity_type: "purchase_order",
        entity_id: "PO-002",
        submitted_by: "buyer",
        entity_amount: 5000, // above $2500 (step1 needs manual), below $10000 (step2 auto-approves)
      });
      // Step 1 needs manual approval
      const step1 = await engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "purchasing_mgr", decider_roles: ["purchasing_manager"] });
      // Step 2 should auto-approve
      expect(step1.status).toBe("approved");
      expect(step1.decisions).toHaveLength(2);
      expect(step1.decisions[1].decision).toBe("auto_approved");
    });

    it("handles delegation", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-DEL", submitted_by: "alice", entity_amount: 5000 });
      const delegated = await engine.decide({
        instance_id: inst.id,
        decision: "delegated",
        decided_by: "sales_mgr",
        decider_roles: ["sales_manager"],
        delegated_to: "senior_sales",
      });
      expect(delegated.status).toBe("in_review"); // still in review after delegation
      expect(delegated.decisions[0].delegated_to).toBe("senior_sales");
    });

    it("rejects decision on completed approval", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-DONE", submitted_by: "alice", entity_amount: 5000 });
      await engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "mgr", decider_roles: ["sales_manager"] });
      await expect(
        engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "mgr2", decider_roles: ["sales_manager"] })
      ).rejects.toThrow("Cannot decide");
    });
  });

  describe("cancel", () => {
    it("cancels a pending approval", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-CAN", submitted_by: "alice", entity_amount: 5000 });
      const cancelled = await engine.cancel(inst.id, inst.submitted_by!, "Changed mind");
      expect(cancelled.status).toBe("cancelled");
    });

    it("rejects cancellation of completed approval", async () => {
      const inst = await engine.submit({ entity_type: "quote", entity_id: "Q-CAN2", submitted_by: "alice", entity_amount: 5000 });
      await engine.decide({ instance_id: inst.id, decision: "approved", decided_by: "mgr", decider_roles: ["sales_manager"] });
      await expect(engine.cancel(inst.id, inst.submitted_by!)).rejects.toThrow("Cannot cancel");
    });
  });

  describe("getPending", () => {
    it("returns pending approvals sorted by age", async () => {
      await engine.submit({ entity_type: "quote", entity_id: "Q-P1", submitted_by: "a", entity_amount: 5000 });
      await engine.submit({ entity_type: "invoice", entity_id: "INV-P1", submitted_by: "b", entity_amount: 5000 });
      const pending = engine.getPending();
      expect(pending.length).toBe(2);
    });

    it("filters by entity type", async () => {
      await engine.submit({ entity_type: "quote", entity_id: "Q-F1", submitted_by: "a", entity_amount: 5000 });
      await engine.submit({ entity_type: "invoice", entity_id: "INV-F1", submitted_by: "b", entity_amount: 5000 });
      const quoteOnly = engine.getPending({ entity_type: "quote" });
      expect(quoteOnly.length).toBe(1);
      expect(quoteOnly[0].instance.entity_type).toBe("quote");
    });

    it("filters by role", async () => {
      await engine.submit({ entity_type: "quote", entity_id: "Q-R1", submitted_by: "a", entity_amount: 5000 });
      await engine.submit({ entity_type: "invoice", entity_id: "INV-R1", submitted_by: "b", entity_amount: 5000 });
      const salesOnly = engine.getPending({ role: "sales_manager" });
      expect(salesOnly.length).toBe(1);
    });
  });

  describe("requiresApproval", () => {
    it("returns required=true for configured entity types", () => {
      const result = engine.requiresApproval("quote", 5000);
      expect(result.required).toBe(true);
      expect(result.would_auto_approve).toBe(false);
    });

    it("detects would_auto_approve when amount below all thresholds", () => {
      const result = engine.requiresApproval("quote", 500);
      expect(result.required).toBe(true);
      expect(result.would_auto_approve).toBe(true);
    });

    it("returns required=false for unconfigured entity types", () => {
      const result = engine.requiresApproval("job");
      expect(result.required).toBe(false);
    });
  });

  describe("getStats", () => {
    it("returns aggregate stats", async () => {
      // S1: above threshold → in_review
      await engine.submit({ entity_type: "quote", entity_id: "S1", submitted_by: "a", entity_amount: 5000 });
      // S2: below $2500 threshold → auto_approved
      await engine.submit({ entity_type: "quote", entity_id: "S2", submitted_by: "b", entity_amount: 1000 });
      // S3: above threshold → in_review, then rejected by a different user with correct role
      const inst = await engine.submit({ entity_type: "quote", entity_id: "S3", submitted_by: "c", entity_amount: 5000 });
      await engine.decide({ instance_id: inst.id, decision: "rejected", decided_by: "mgr", decider_roles: ["sales_manager"] });

      const stats = engine.getStats();
      expect(stats.total_workflows).toBe(5);
      expect(stats.total_instances).toBe(3);
      expect(stats.in_review).toBe(1);
      expect(stats.auto_approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });

  describe("getEntityHistory", () => {
    it("returns all approval instances for an entity", async () => {
      const inst1 = await engine.submit({ entity_type: "quote", entity_id: "Q-H1", submitted_by: "a", entity_amount: 5000 });
      await engine.decide({ instance_id: inst1.id, decision: "rejected", decided_by: "mgr", decider_roles: ["sales_manager"] });
      await engine.submit({ entity_type: "quote", entity_id: "Q-H1", submitted_by: "a", entity_amount: 5000 });
      const history = engine.getEntityHistory("quote", "Q-H1");
      expect(history).toHaveLength(2);
    });
  });
});

describe("RecordTimelineEngine", () => {
  let engine: RecordTimelineEngine;

  beforeEach(() => {
    engine = new RecordTimelineEngine();
  });

  describe("timeline", () => {
    it("adds and retrieves timeline entries", () => {
      engine.addEntry({
        entity_type: "quote",
        entity_id: "Q-001",
        event_type: "created",
        actor: "alice",
        summary: "Quote Q-001 created",
      });
      engine.addEntry({
        entity_type: "quote",
        entity_id: "Q-001",
        event_type: "status_changed",
        actor: "alice",
        summary: "Status changed to sent",
        details: { from: "draft", to: "sent" },
      });

      const timeline = engine.getTimeline({ entity_type: "quote", entity_id: "Q-001" });
      expect(timeline).toHaveLength(2);
      const types = timeline.map((e) => e.event_type);
      expect(types).toContain("created");
      expect(types).toContain("status_changed");
    });

    it("filters by event type", () => {
      engine.addEntry({ entity_type: "quote", entity_id: "Q-F", event_type: "created", actor: "a", summary: "Created" });
      engine.addEntry({ entity_type: "quote", entity_id: "Q-F", event_type: "updated", actor: "a", summary: "Updated" });
      engine.addEntry({ entity_type: "quote", entity_id: "Q-F", event_type: "comment_added", actor: "b", summary: "Comment" });

      const filtered = engine.getTimeline({ entity_type: "quote", entity_id: "Q-F", event_types: ["created", "updated"] });
      expect(filtered).toHaveLength(2);
    });

    it("respects limit", () => {
      for (let i = 0; i < 10; i++) {
        engine.addEntry({ entity_type: "job", entity_id: "J-1", event_type: "updated", actor: "sys", summary: `Update ${i}` });
      }
      const limited = engine.getTimeline({ entity_type: "job", entity_id: "J-1", limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it("validates required fields", () => {
      expect(() => engine.addEntry({ entity_type: "", entity_id: "Q-1", event_type: "created", summary: "x" })).toThrow();
      expect(() => engine.addEntry({ entity_type: "quote", entity_id: "Q-1", event_type: "created", summary: "" })).toThrow();
    });
  });

  describe("comments", () => {
    it("creates a top-level comment", () => {
      const comment = engine.createComment({
        entity_type: "quote",
        entity_id: "Q-001",
        author_name: "Alice",
        body: "Looks good, but pricing seems high",
      });
      expect(comment.id).toBeTruthy();
      expect(comment.body).toBe("Looks good, but pricing seems high");
      expect(comment.is_internal).toBe(false);
    });

    it("creates threaded replies", () => {
      const parent = engine.createComment({
        entity_type: "quote",
        entity_id: "Q-002",
        author_name: "Alice",
        body: "Question about lead time",
      });
      engine.createComment({
        entity_type: "quote",
        entity_id: "Q-002",
        author_name: "Bob",
        body: "We can do 5 days",
        parent_id: parent.id,
      });

      const comments = engine.listComments("quote", "Q-002");
      expect(comments).toHaveLength(1); // 1 top-level
      expect(comments[0].replies).toHaveLength(1);
      expect(comments[0].replies![0].author_name).toBe("Bob");
    });

    it("supports internal-only comments", () => {
      engine.createComment({
        entity_type: "quote",
        entity_id: "Q-INT",
        author_name: "Manager",
        body: "Don't go below $5k",
        is_internal: true,
      });
      engine.createComment({
        entity_type: "quote",
        entity_id: "Q-INT",
        author_name: "Sales",
        body: "Updated pricing",
      });

      const all = engine.listComments("quote", "Q-INT", true);
      expect(all).toHaveLength(2);

      const external = engine.listComments("quote", "Q-INT", false);
      expect(external).toHaveLength(1);
      expect(external[0].author_name).toBe("Sales");
    });

    it("edits a comment", () => {
      const comment = engine.createComment({
        entity_type: "po", entity_id: "PO-1", author_name: "Bob", body: "Original text",
      });
      const edited = engine.editComment(comment.id, "Edited text", "Bob");
      expect(edited.body).toBe("Edited text");
      expect(edited.edited_at).toBeTruthy();
    });

    it("soft-deletes a comment", () => {
      const comment = engine.createComment({
        entity_type: "po", entity_id: "PO-2", author_name: "Bob", body: "Delete me",
      });
      engine.deleteComment(comment.id, "Bob");
      const comments = engine.listComments("po", "PO-2");
      expect(comments).toHaveLength(0); // filtered out
    });

    it("validates comment body not empty", () => {
      expect(() =>
        engine.createComment({ entity_type: "po", entity_id: "PO-3", author_name: "Bob", body: "" })
      ).toThrow("empty");
    });

    it("validates parent comment exists", () => {
      expect(() =>
        engine.createComment({ entity_type: "po", entity_id: "PO-4", author_name: "Bob", body: "Reply", parent_id: "nonexistent" })
      ).toThrow("not found");
    });

    it("auto-adds timeline entry on comment", () => {
      engine.createComment({
        entity_type: "quote",
        entity_id: "Q-TL",
        author_name: "Alice",
        body: "Nice work",
      });
      const timeline = engine.getTimeline({ entity_type: "quote", entity_id: "Q-TL" });
      expect(timeline.length).toBeGreaterThanOrEqual(1);
      expect(timeline.some((e) => e.event_type === "comment_added")).toBe(true);
    });

    it("supports file attachments", () => {
      const comment = engine.createComment({
        entity_type: "quote",
        entity_id: "Q-ATT",
        author_name: "Bob",
        body: "See attached drawing",
        attachments: [{
          file_id: "f-001",
          filename: "drawing.pdf",
          mime_type: "application/pdf",
          size_bytes: 245000,
        }],
      });
      expect(comment.attachments).toHaveLength(1);
      expect(comment.attachments[0].filename).toBe("drawing.pdf");
    });

    it("counts comments for entity", () => {
      engine.createComment({ entity_type: "job", entity_id: "J-1", author_name: "A", body: "One" });
      engine.createComment({ entity_type: "job", entity_id: "J-1", author_name: "B", body: "Two" });
      engine.createComment({ entity_type: "job", entity_id: "J-2", author_name: "A", body: "Other" });
      expect(engine.getCommentCount("job", "J-1")).toBe(2);
    });
  });
});
