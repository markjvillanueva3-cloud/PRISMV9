/**
 * sessionDispatcher.lifecycle-wire.test.ts
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SESSION-LIFECYCLE —
 * round-trip wire tests for the 5 new actions wrapping
 * SessionLifecycleEngine through prism_session.
 *
 * Engine is a process-wide singleton (getInstance()), so these tests
 * assert structural properties (shape, types, value ranges) rather
 * than exact metric values — the singleton may carry state from other
 * tests in the same vitest worker. SessionLifecycleEngine has NO
 * `.reset()` API and uses a private constructor + static instance, so
 * isolation between tests is intentionally NOT supported.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerSessionDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_session lifecycle_* wire (OBSIDIAN-PRISM-OS-MS0)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---------------------------------------------------------------------
  // lifecycle_metrics
  // ---------------------------------------------------------------------

  describe("lifecycle_metrics", () => {
    it("returns full SessionMetrics shape", async () => {
      const r = await call(handler, "lifecycle_metrics", {});
      expect(r.success).toBe(true);
      expect(typeof r.metrics.session_id).toBe("string");
      expect(r.metrics.session_id).toMatch(/^SESSION-\d+$/);
      expect(typeof r.metrics.start_time).toBe("string");
      expect(typeof r.metrics.tool_calls).toBe("number");
      expect(r.metrics.tool_calls).toBeGreaterThanOrEqual(0);
      expect(typeof r.metrics.peak_pressure_pct).toBe("number");
    });

    it("returns successful_calls + failed_calls summing to tool_calls", async () => {
      const r = await call(handler, "lifecycle_metrics", {});
      expect(r.success).toBe(true);
      const m = r.metrics;
      // Invariant: every tool call is classified as either success or failure
      expect(m.successful_calls + m.failed_calls).toBe(m.tool_calls);
    });
  });

  // ---------------------------------------------------------------------
  // lifecycle_quality_score
  // ---------------------------------------------------------------------

  describe("lifecycle_quality_score", () => {
    it("returns 5-dimension score with overall + grade + recommendation", async () => {
      const r = await call(handler, "lifecycle_quality_score", {});
      expect(r.success).toBe(true);
      const s = r.score;
      expect(typeof s.overall).toBe("number");
      expect(s.overall).toBeGreaterThanOrEqual(0);
      expect(s.overall).toBeLessThanOrEqual(100);
      expect(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"]).toContain(s.grade);
      expect(typeof s.recommendation).toBe("string");
      expect(s.recommendation.length).toBeGreaterThan(5);
    });

    it("returns all 5 dimensions in [0,100]", async () => {
      const r = await call(handler, "lifecycle_quality_score", {});
      expect(r.success).toBe(true);
      const dims = r.score.dimensions;
      for (const key of ["task_completion", "reliability", "safety_adherence", "efficiency", "continuity"]) {
        expect(typeof dims[key]).toBe("number");
        expect(dims[key]).toBeGreaterThanOrEqual(0);
        expect(dims[key]).toBeLessThanOrEqual(100);
      }
    });

    it("grade matches the documented score bands", async () => {
      const r = await call(handler, "lifecycle_quality_score", {});
      expect(r.success).toBe(true);
      const { overall, grade } = r.score;
      // Cross-check the grade against the documented threshold table from the engine
      const expectedGrade =
        overall >= 97 ? "A+" :
        overall >= 93 ? "A" :
        overall >= 90 ? "A-" :
        overall >= 87 ? "B+" :
        overall >= 83 ? "B" :
        overall >= 80 ? "B-" :
        overall >= 77 ? "C+" :
        overall >= 73 ? "C" :
        overall >= 70 ? "C-" :
        overall >= 60 ? "D" : "F";
      expect(grade).toBe(expectedGrade);
    });
  });

  // ---------------------------------------------------------------------
  // lifecycle_session_id + lifecycle_call_count
  // ---------------------------------------------------------------------

  describe("lifecycle_session_id", () => {
    it("returns a SESSION-{epochMs} formatted id", async () => {
      const r = await call(handler, "lifecycle_session_id", {});
      expect(r.success).toBe(true);
      expect(typeof r.session_id).toBe("string");
      expect(r.session_id).toMatch(/^SESSION-\d{10,}$/);
    });

    it("session_id is stable across consecutive calls (singleton invariant)", async () => {
      const a = await call(handler, "lifecycle_session_id", {});
      const b = await call(handler, "lifecycle_session_id", {});
      expect(a.session_id).toBe(b.session_id);
    });
  });

  describe("lifecycle_call_count", () => {
    it("returns a non-negative integer", async () => {
      const r = await call(handler, "lifecycle_call_count", {});
      expect(r.success).toBe(true);
      expect(typeof r.call_count).toBe("number");
      expect(Number.isInteger(r.call_count)).toBe(true);
      expect(r.call_count).toBeGreaterThanOrEqual(0);
    });

    it("matches tool_calls from lifecycle_metrics (same underlying counter)", async () => {
      // Call both back-to-back; even if cadence wrapper increments between,
      // call_count must be >= metrics.tool_calls (count is monotonic).
      const m = await call(handler, "lifecycle_metrics", {});
      const c = await call(handler, "lifecycle_call_count", {});
      expect(c.call_count).toBeGreaterThanOrEqual(m.metrics.tool_calls);
    });
  });

  // ---------------------------------------------------------------------
  // lifecycle_final_handoff
  // ---------------------------------------------------------------------

  describe("lifecycle_final_handoff", () => {
    it("generates handoff with required fields when phase+quick_resume given", async () => {
      const r = await call(handler, "lifecycle_final_handoff", {
        phase: "OBSIDIAN-PRISM-OS-MS0/wire-test",
        quick_resume: "test handoff generation",
        pending_tasks: ["task A", "task B"],
        key_findings: ["wire test executed"],
      });
      expect(r.success).toBe(true);
      expect(r.handoff.session_id).toMatch(/^SESSION-\d+$/);
      expect(r.handoff.phase).toBe("OBSIDIAN-PRISM-OS-MS0/wire-test");
      expect(r.handoff.quick_resume).toBe("test handoff generation");
      expect(typeof r.handoff.session_duration_ms).toBe("number");
      expect(r.handoff.session_duration_ms).toBeGreaterThanOrEqual(0);
      expect(r.handoff.quality_score.overall).toBeGreaterThanOrEqual(0);
      expect(r.handoff.quality_score.overall).toBeLessThanOrEqual(100);
    });

    it("includes metrics_summary with success_rate string", async () => {
      const r = await call(handler, "lifecycle_final_handoff", {
        phase: "metrics-summary-test",
        quick_resume: "verify summary shape",
      });
      expect(r.success).toBe(true);
      const s = r.handoff.metrics_summary;
      expect(typeof s.tool_calls).toBe("number");
      // success_rate is either an "NN.N%" string or "N/A"
      expect(typeof s.success_rate).toBe("string");
      expect(s.success_rate === "N/A" || /^\d+(\.\d+)?%$/.test(s.success_rate)).toBe(true);
    });

    it("truncates pending_tasks to ≤10 and key_findings to ≤5", async () => {
      const r = await call(handler, "lifecycle_final_handoff", {
        phase: "truncation-test",
        quick_resume: "verify slice limits",
        pending_tasks: Array(20).fill(0).map((_, i) => `task ${i}`),
        key_findings: Array(20).fill(0).map((_, i) => `finding ${i}`),
      });
      expect(r.success).toBe(true);
      expect(r.handoff.pending_tasks.length).toBe(10);
      expect(r.handoff.key_findings.length).toBe(5);
      expect(r.handoff.resume_context.do_not_forget.length).toBe(3);
    });

    it("flags low-quality sessions with a warning in resume_context", async () => {
      const r = await call(handler, "lifecycle_final_handoff", {
        phase: "warning-shape-test",
        quick_resume: "check warning surface",
      });
      expect(r.success).toBe(true);
      // slimResponse may strip empty arrays — normalize before asserting
      const warnings = r.handoff.resume_context.warnings ?? [];
      expect(Array.isArray(warnings)).toBe(true);
      if (r.handoff.quality_score.overall < 70) {
        expect(warnings.length).toBeGreaterThan(0);
      } else {
        expect(warnings.length).toBe(0);
      }
    });
  });
});
