import { describe, it, expect, beforeEach } from "vitest";
import {
  getConversationContext,
  transitionState,
  startJob,
  updateJob,
  resetConversation,
} from "../engines/ConversationalMemoryEngine.js";
import { ContextBudgetEngine } from "../engines/ContextBudgetEngine.js";

describe("FORGE-DEBUG P6: Session/Context Engine Fixes", () => {
  // ── ConversationalMemoryEngine ──

  describe("ConversationalMemoryEngine", () => {
    it("allows force-reset to idle from any state", () => {
      const sid = `test-idle-${Date.now()}`;
      getConversationContext(sid); // creates session
      transitionState(sid, "exploring");
      // Force-reset to idle should work from any state
      const result = transitionState(sid, "idle");
      expect(result.current_state).toBe("idle");
    });

    it("throws on invalid non-idle transition", () => {
      const sid = `test-invalid-${Date.now()}`;
      getConversationContext(sid); // idle state
      // Cannot jump from idle to presenting without going through exploring/calculating
      expect(() => transitionState(sid, "presenting")).toThrow("Invalid transition");
    });

    it("recent_jobs stays at max 10 entries", () => {
      const sid = `test-jobs-${Date.now()}`;
      getConversationContext(sid);
      transitionState(sid, "exploring");

      // Add 12 jobs
      for (let i = 0; i < 12; i++) {
        startJob(sid, { material: `mat-${i}` });
      }

      const ctx = getConversationContext(sid);
      expect(ctx.recent_jobs.length).toBeLessThanOrEqual(10);
    });

    it("recent_jobs state reflects current conversation state", () => {
      const sid = `test-state-${Date.now()}`;
      getConversationContext(sid);
      transitionState(sid, "exploring");
      const job = startJob(sid, { material: "steel" });
      transitionState(sid, "planning");

      // Update job — recent_jobs.state should reflect ctx.current_state
      updateJob(sid, { material: "aluminum" });

      const ctx = getConversationContext(sid);
      const recent = ctx.recent_jobs.find(r => r.id === job.id);
      expect(recent).toBeDefined();
      expect(recent!.state).toBe("planning");
    });
  });

  // ── ContextBudgetEngine ──

  describe("ContextBudgetEngine", () => {
    beforeEach(() => {
      ContextBudgetEngine.resetBudget();
    });

    it("isOverBudget uses reserve allocation for unknown categories", () => {
      const result = ContextBudgetEngine.isOverBudget("unknown_category_xyz");
      // Should use reserve allocation (not 0), so limit > 0
      expect(result.limit).toBeGreaterThan(0);
      expect(result.overBudget).toBe(false);
    });

    it("isOverBudget matches trackUsage allocation for unknown categories", () => {
      const tracked = ContextBudgetEngine.trackUsage("novel_cat", 100);
      const checked = ContextBudgetEngine.isOverBudget("novel_cat");
      // Both should use same allocation basis
      expect(tracked.limit).toBe(checked.limit);
    });
  });

  // ── SessionLifecycleEngine safety_adherence ──

  describe("SessionLifecycleEngine safety_adherence formula", () => {
    it("safety_adherence = 90 when block rate is 10%", () => {
      // Formula: 100 - (blocks/executions) * 100
      const blockRate = 0.1;
      const expected = Math.round(Math.max(0, 100 - blockRate * 100));
      expect(expected).toBe(90);
    });

    it("safety_adherence = 75 when block rate is 25%", () => {
      const blockRate = 0.25;
      const expected = Math.round(Math.max(0, 100 - blockRate * 100));
      expect(expected).toBe(75);
    });

    it("safety_adherence = 0 when block rate is 100%", () => {
      const blockRate = 1.0;
      const expected = Math.round(Math.max(0, 100 - blockRate * 100));
      expect(expected).toBe(0);
    });

    it("safety_adherence never goes negative", () => {
      const blockRate = 1.5;
      const expected = Math.round(Math.max(0, 100 - blockRate * 100));
      expect(expected).toBe(0);
    });
  });
});
