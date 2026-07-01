/** HermesParallelVerdictAggregatorEngine tests — HZP04. */
import { describe, it, expect } from "vitest";
import {
  HermesParallelVerdictAggregatorEngine,
  type AgentVerdict,
} from "../engines/HermesParallelVerdictAggregatorEngine.js";

const v = (over: Partial<AgentVerdict> = {}): AgentVerdict => ({
  agent_id: "a",
  subtask_id: "st1",
  ok: true,
  quality: 0.8,
  duration_ms: 1000,
  files_written: [],
  ...over,
});

describe("HermesParallelVerdictAggregatorEngine.aggregate — happy", () => {
  it("all ok → ok_count = total, failure_count = 0", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a" }),
      v({ agent_id: "b" }),
    ]);
    expect(r.ok_count).toBe(2);
    expect(r.failure_count).toBe(0);
  });

  it("mean_ok_quality is the average across ok verdicts", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", quality: 0.6 }),
      v({ agent_id: "b", quality: 1.0 }),
    ]);
    expect(r.mean_ok_quality).toBeCloseTo(0.8);
  });

  it("best_agent_id picks highest quality (tiebreak lower duration)", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", quality: 0.9, duration_ms: 2000 }),
      v({ agent_id: "b", quality: 0.9, duration_ms: 500 }),
      v({ agent_id: "c", quality: 0.7 }),
    ]);
    expect(r.best_agent_id).toBe("b");
  });
});

describe("HermesParallelVerdictAggregatorEngine — file conflicts", () => {
  it("no overlap → file_conflicts empty", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", files_written: ["x.ts"] }),
      v({ agent_id: "b", files_written: ["y.ts"] }),
    ]);
    expect(r.file_conflicts).toEqual([]);
  });

  it("same file by 2 agents → file_conflicts has the pair", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", files_written: ["shared.ts"] }),
      v({ agent_id: "b", files_written: ["shared.ts"] }),
    ]);
    expect(r.file_conflicts.length).toBe(1);
    expect(r.file_conflicts[0].agents.sort()).toEqual(["a", "b"]);
  });

  it("path separator normalization across agents", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", files_written: ["src\\x.ts"] }),
      v({ agent_id: "b", files_written: ["src/x.ts"] }),
    ]);
    expect(r.file_conflicts.length).toBe(1);
  });

  it("failed agents' files do not count toward conflicts", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", ok: true, files_written: ["x.ts"] }),
      v({ agent_id: "b", ok: false, failure_reason: "boom", files_written: ["x.ts"] }),
    ]);
    expect(r.file_conflicts).toEqual([]);
  });
});

describe("HermesParallelVerdictAggregatorEngine — consensus + failures", () => {
  it("majority on same answer → has_consensus=true", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", answer: "YES" }),
      v({ agent_id: "b", answer: "YES" }),
      v({ agent_id: "c", answer: "NO" }),
    ]);
    expect(r.has_consensus).toBe(true);
    expect(r.answer_distribution[0].answer).toBe("YES");
  });

  it("split 50/50 → no consensus", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", answer: "X" }),
      v({ agent_id: "b", answer: "Y" }),
    ]);
    expect(r.has_consensus).toBe(false);
  });

  it("failed verdicts populate failures[]", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", ok: false, failure_reason: "timeout" }),
      v({ agent_id: "b" }),
    ]);
    expect(r.failures.length).toBe(1);
    expect(r.failures[0].reason).toBe("timeout");
  });

  it("all failed → ok_count=0, best_agent_id=null, mean_ok_quality=0", () => {
    const r = HermesParallelVerdictAggregatorEngine.aggregate([
      v({ agent_id: "a", ok: false }),
      v({ agent_id: "b", ok: false }),
    ]);
    expect(r.ok_count).toBe(0);
    expect(r.best_agent_id).toBeNull();
    expect(r.mean_ok_quality).toBe(0);
  });
});

describe("HermesParallelVerdictAggregatorEngine — validation + render", () => {
  it("empty array throws", () => {
    expect(() => HermesParallelVerdictAggregatorEngine.aggregate([])).toThrow();
  });

  it("non-array throws", () => {
    expect(() => HermesParallelVerdictAggregatorEngine.aggregate(null as never)).toThrow();
  });

  it("duplicate agent_id throws", () => {
    expect(() =>
      HermesParallelVerdictAggregatorEngine.aggregate([v({ agent_id: "a" }), v({ agent_id: "a" })]),
    ).toThrow();
  });

  it("quality > 1 → zod throws", () => {
    expect(() => HermesParallelVerdictAggregatorEngine.aggregate([v({ quality: 1.5 })])).toThrow();
  });

  it("renderResult shows OK tag on all-success", () => {
    const md = HermesParallelVerdictAggregatorEngine.renderResult(
      HermesParallelVerdictAggregatorEngine.aggregate([v()]),
    );
    expect(md.includes("[AGGREGATE OK]")).toBe(true);
  });

  it("renderResult shows PARTIAL tag on mixed", () => {
    const md = HermesParallelVerdictAggregatorEngine.renderResult(
      HermesParallelVerdictAggregatorEngine.aggregate([
        v({ agent_id: "a" }),
        v({ agent_id: "b", ok: false }),
      ]),
    );
    expect(md.includes("[AGGREGATE PARTIAL]")).toBe(true);
  });
});
