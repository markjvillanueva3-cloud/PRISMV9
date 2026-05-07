/**
 * orchestrationDispatcher — Learning Loop wiring round-trip suite
 * ================================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH7
 *
 * Wires 3 self-learning / continual-learning engines into prism_orchestrate
 * with deterministic structural assertions:
 *   - LearningAdaptationEngine.getTrackRecord -> cognitive_learning_get_track_record
 *   - learningLoopEngine.getStats              -> cognitive_learning_loop_stats
 *   - incrementalLearningEngine.listJobs       -> cognitive_learning_incremental_list_jobs
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH7
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

const PREDICTION_CATEGORIES = ["cutting_force", "tool_life", "speed_feed", "surface_finish", "thermal", "deflection", "wear", "stability", "general"] as const;

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerOrchestrationDispatcher(server as unknown as Parameters<typeof registerOrchestrationDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH7 / LearningAdaptationEngine.getTrackRecord", () => {
  it("get_track_record without category returns count === track_records.length invariant", async () => {
    const r = await call(server, "cognitive_learning_get_track_record");
    expect(r.ok).toBe(true);
    const records = (r.data.track_records as unknown[] | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(records.length);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("get_track_record(category=cutting_force) returns 0..1 records (one per category invariant)", async () => {
    const r = await call(server, "cognitive_learning_get_track_record", { category: "cutting_force" });
    expect(r.ok).toBe(true);
    const records = (r.data.track_records as Array<{ category: string }> | undefined) ?? [];
    // Track record is keyed by category; supplying one filters to <=1 result.
    expect(records.length).toBeLessThanOrEqual(1);
    for (const rec of records) {
      expect(rec.category).toBe("cutting_force");
    }
  });

  it.each(PREDICTION_CATEGORIES.slice(0, 3).map(c => [c] as const))("get_track_record category=%s returns matching records only", async (cat) => {
    const r = await call(server, "cognitive_learning_get_track_record", { category: cat });
    expect(r.ok).toBe(true);
    const records = (r.data.track_records as Array<{ category: string }> | undefined) ?? [];
    for (const rec of records) {
      expect(rec.category).toBe(cat);
    }
  });
});

describe("U-WIRE-COG-BATCH7 / LearningLoopEngine.getStats", () => {
  it("loop_stats returns LearningStats with numeric counters", async () => {
    const r = await call(server, "cognitive_learning_loop_stats");
    expect(r.ok).toBe(true);
    const stats = r.data.stats as { total?: number; verified?: number; pending?: number; correct_count?: number; incorrect_count?: number } | null | undefined;
    // Engine returns LearningStats; if present, numeric counters must be non-negative integers.
    if (stats) {
      for (const k of Object.keys(stats) as Array<keyof typeof stats>) {
        const v = stats[k];
        if (typeof v === "number") {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(v)).toBe(true);
          expect(Number.isInteger(v)).toBe(true);
        }
      }
    }
  });
});

describe("U-WIRE-COG-BATCH7 / IncrementalLearningEngine.listJobs", () => {
  it("incremental_list_jobs returns count === jobs.length invariant with valid JobStatus values", async () => {
    const r = await call(server, "cognitive_learning_incremental_list_jobs");
    expect(r.ok).toBe(true);
    const jobs = (r.data.jobs as Array<{ status: string; jobId?: string }> | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(jobs.length);
    const VALID_STATUSES = ["pending", "running", "succeeded", "failed", "skipped", "cancelled", "completed"];
    for (const job of jobs) {
      expect(VALID_STATUSES).toContain(job.status);
    }
  });
});

describe("U-WIRE-COG-BATCH7 / schema rejections", () => {
  it("rejects cognitive_learning_get_track_record with invalid category", async () => {
    const r = await call(server, "cognitive_learning_get_track_record", { category: "not_a_category" });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH7 / regression guards", () => {
  it("all 3 batch-7 actions reachable from dispatcher and never throw out of the envelope", async () => {
    const a = await call(server, "cognitive_learning_get_track_record");
    const b = await call(server, "cognitive_learning_loop_stats");
    const c = await call(server, "cognitive_learning_incremental_list_jobs");
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(true);
  });

  it("get_track_record is idempotent across two consecutive calls (same count)", async () => {
    const a = await call(server, "cognitive_learning_get_track_record");
    const b = await call(server, "cognitive_learning_get_track_record");
    expect(a.data.count).toBe(b.data.count);
  });
});
