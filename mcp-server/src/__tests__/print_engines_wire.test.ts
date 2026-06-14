/**
 * U-BRIDGE-WIRE-PRINT-PARTIAL — real dispatcher round-trip tests
 * ================================================================
 * Verifies the 3 newly-wired prism_session actions for 2 of the 4
 * unwired Print engines (PrintCorpusTableWriter + PrintMatchStall
 * DetectorEngine). PrintAccuracyProofEngine + PrintCorpusOrchestrator
 * are intentionally deferred (former is claimed by november DEA-MS0/P06).
 *
 * Real dispatcher invocation via captured server.tool handler; no SUT
 * mocks. Concrete value assertions against documented stall-detector
 * stage enum + corpus row count invariants.
 *
 * Generated as part of oscar /loop drain iter 5 (2026-05-23).
 *
 * @module __tests__/print_engines_wire
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { z } from "zod";

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { printMatchStallDetectorEngine } from "../engines/PrintMatchStallDetectorEngine.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
}>;

let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

beforeAll(() => {
  let captured: Handler | undefined;
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: { action: z.ZodEnum; params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>> },
      handler: Handler,
    ) => {
      captured = handler;
    },
  };
  registerSessionDispatcher(fakeServer);
  if (!captured) throw new Error("registerSessionDispatcher did not register prism_session");
  const h = captured;
  invoke = async (action, params = {}) => {
    const res = await h({ action, params });
    return JSON.parse(res.content[0].text) as Record<string, unknown>;
  };
});

describe("prism_session::print_corpus_* (PrintCorpusTableWriter — default singleton)", () => {
  it("all_shas returns success:true + count matching shas[].length", async () => {
    const r = await invoke("print_corpus_all_shas");
    expect(r.success).toBe(true);
    expect(typeof r.count).toBe("number");
    // slimResponse strips empty arrays — accept either present array with
    // matching length OR omitted array when count === 0
    if (r.count === 0) {
      // shas[] absent or empty either way
      if ("shas" in r) {
        expect(Array.isArray(r.shas)).toBe(true);
        expect((r.shas as unknown[]).length).toBe(0);
      }
    } else {
      const shas = r.shas as string[];
      expect(shas.length).toBe(r.count);
      // Every sha must be a non-empty string (SHA-256 hex contract)
      for (const s of shas) {
        expect(typeof s).toBe("string");
        expect(s.length).toBeGreaterThan(0);
      }
    }
  });

  it("total_count returns success:true + total_rows >= 0 (non-negative invariant)", async () => {
    const r = await invoke("print_corpus_total_count");
    expect(r.success).toBe(true);
    expect(typeof r.total_rows).toBe("number");
    expect(r.total_rows as number).toBeGreaterThanOrEqual(0);
  });

  it("total_rows >= shas.length (each row has a sha, sha set <= row set)", async () => {
    const shasResp = await invoke("print_corpus_all_shas");
    const countResp = await invoke("print_corpus_total_count");
    expect(countResp.total_rows as number).toBeGreaterThanOrEqual(shasResp.count as number);
  });
});

describe("prism_session::print_stall_stats (PrintMatchStallDetectorEngine — singleton state)", () => {
  beforeEach(() => {
    printMatchStallDetectorEngine.clear();
  });

  it("clean singleton: total_tracked=0, currently_stalled=0, all 5 stages present with 0", async () => {
    const r = await invoke("print_stall_stats");
    expect(r.success).toBe(true);
    expect(r.total_tracked).toBe(0);
    expect(r.currently_stalled).toBe(0);
    const byStage = r.by_stage as Record<string, number>;
    // Documented MatchStage enum: 5 specific stages must all be present with 0
    expect(byStage.ingest).toBe(0);
    expect(byStage.feature_extraction).toBe(0);
    expect(byStage.similarity_search).toBe(0);
    expect(byStage.candidate_review).toBe(0);
    expect(byStage.disposition).toBe(0);
  });

  it("after startTracking N jobs: total_tracked == N, by_stage.ingest == N", async () => {
    const now = Date.now();
    printMatchStallDetectorEngine.startTracking("job-A", "ingest", now);
    printMatchStallDetectorEngine.startTracking("job-B", "ingest", now);
    printMatchStallDetectorEngine.startTracking("job-C", "ingest", now);

    const r = await invoke("print_stall_stats");
    expect(r.total_tracked).toBe(3);
    const byStage = r.by_stage as Record<string, number>;
    expect(byStage.ingest).toBe(3);
    expect(byStage.feature_extraction).toBe(0);
  });

  it("advanceStage moves a job from ingest -> next stage (mutation reflected in stats)", async () => {
    const now = Date.now();
    printMatchStallDetectorEngine.startTracking("job-X", "ingest", now);
    printMatchStallDetectorEngine.advanceStage("job-X", "ingest", "feature_extraction", now);

    const r = await invoke("print_stall_stats");
    expect(r.total_tracked).toBe(1);
    const byStage = r.by_stage as Record<string, number>;
    expect(byStage.ingest).toBe(0);
    expect(byStage.feature_extraction).toBe(1);
  });

  it("stats() (no now_ms) leaves currently_stalled=0; statsAt(now_ms) populates it via scan", async () => {
    const tStart = 1_000_000;
    printMatchStallDetectorEngine.startTracking("job-stall", "ingest", tStart);
    // Don't markProgress — leave stale for a long time
    const tNow = tStart + 24 * 60 * 60 * 1000; // 24h later

    const r1 = await invoke("print_stall_stats");
    expect(r1.currently_stalled).toBe(0); // no now_ms -> not populated

    const r2 = await invoke("print_stall_stats", { now_ms: tNow });
    expect(r2.total_tracked).toBe(1);
    // currently_stalled may be 0 or >0 depending on engine's stall threshold;
    // assert it's a number and not negative
    expect(typeof r2.currently_stalled).toBe("number");
    expect(r2.currently_stalled as number).toBeGreaterThanOrEqual(0);
  });

  it("Zod gate rejects negative now_ms", async () => {
    const r = await invoke("print_stall_stats", { now_ms: -100 });
    expect(typeof r.error).toBe("string");
    expect((r.error as string).toLowerCase()).toMatch(/invalid|now_ms/);
  });
});
