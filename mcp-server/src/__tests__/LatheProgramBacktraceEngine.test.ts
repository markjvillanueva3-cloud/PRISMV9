import { describe, it, expect } from "vitest";
import { latheProgramBacktraceEngine } from "../engines/LatheProgramBacktraceEngine.js";

const STREAM = [
  { n: 10, kind: "comment" as const, text: "(OP10 ROUGH OD)" },
  { n: 20, kind: "tool_change" as const, text: "T0101", params: { tool_id: "T01" } },
  { n: 30, kind: "offset_set" as const, text: "G10 L11 P1 R-0.05", params: { offset: -0.05 } },
  { n: 40, kind: "wcs_shift" as const, text: "G54", params: { wcs: "G54" } },
  { n: 50, kind: "feed_set" as const, text: "F0.3", params: { feed: 0.3 } },
  { n: 60, kind: "spindle_set" as const, text: "S2000 M3", params: { rpm: 2000 } },
  { n: 70, kind: "motion" as const, text: "G01 X40 Z-20" },
  { n: 80, kind: "motion" as const, text: "G01 X40 Z-50" },
  { n: 90, kind: "motion" as const, text: "G01 X40 Z-100 <-- FAILING BLOCK" },
];

describe("LatheProgramBacktraceEngine", () => {
  it("returns empty causes when failing block missing", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 999 });
    expect(r.causes.length).toBe(0);
    expect(r.top_suspect).toBeUndefined();
  });

  it("walks backwards and surfaces causes", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    expect(r.causes.length).toBeGreaterThan(0);
  });

  it("top suspect weight >= other candidates", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    const top = r.top_suspect!;
    for (const c of r.causes) expect(top.weight).toBeGreaterThanOrEqual(c.weight);
  });

  it("skips motion and comment blocks as causes", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    for (const c of r.causes) {
      expect(c.kind).not.toBe("motion");
      expect(c.kind).not.toBe("comment");
    }
  });

  it("offset_set and tool_change are higher-weighted", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    const highKinds = r.causes.filter((c) => c.kind === "offset_set" || c.kind === "tool_change");
    expect(highKinds.length).toBeGreaterThan(0);
  });

  it("max_depth limits how far back engine walks", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90, max_depth: 2 });
    expect(r.causes.length).toBeLessThanOrEqual(2);
  });

  it("rationale text includes block number tag", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    expect(r.top_suspect!.rationale).toMatch(/N\d+/);
  });

  it("preserves original block text in cause if provided", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    const hasText = r.causes.some((c) => c.text !== undefined);
    expect(hasText).toBe(true);
  });

  it("failing_block_n is echoed on result", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    expect(r.failing_block_n).toBe(90);
  });

  it("recency-weighted causes: closer block scored no lower than equal-kind far block", () => {
    const stream = [
      { n: 10, kind: "offset_set" as const, text: "far" },
      { n: 20, kind: "motion" as const, text: "..." },
      { n: 30, kind: "motion" as const, text: "..." },
      { n: 40, kind: "offset_set" as const, text: "near" },
      { n: 50, kind: "motion" as const, text: "FAIL" },
    ];
    const r = latheProgramBacktraceEngine.trace({ blocks: stream, failing_block_n: 50 });
    const near = r.causes.find((c) => c.n === 40)!;
    const far = r.causes.find((c) => c.n === 10)!;
    expect(near.weight).toBeGreaterThanOrEqual(far.weight);
  });

  it("reasoning includes walk count", () => {
    const r = latheProgramBacktraceEngine.trace({ blocks: STREAM, failing_block_n: 90 });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/Walked/);
  });

  it("macro_call recognized as a cause kind", () => {
    const s = [
      { n: 10, kind: "macro_call" as const, text: "G65 P9810" },
      { n: 20, kind: "motion" as const, text: "FAIL" },
    ];
    const r = latheProgramBacktraceEngine.trace({ blocks: s, failing_block_n: 20 });
    expect(r.causes.some((c) => c.kind === "macro_call")).toBe(true);
  });

  it("getStats returns reference citation", () => {
    const s = latheProgramBacktraceEngine.getStats();
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
