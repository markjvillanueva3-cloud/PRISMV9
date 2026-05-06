/**
 * StopGateChain — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U08.
 *
 * Pure-function tests for .claude/hooks/stop-gate-chain.mjs — the
 * unified Stop event runner that consolidates 16+ stop_on_* hooks into
 * one invocation.
 *
 * Asserts:
 *   1. STOP_GATE_LIST is non-empty + carries the canonical 16+ hook
 *      paths in priority order; no duplicates.
 *   2. parseGateOutput recognises both modern hookSpecificOutput shape
 *      and legacy decision/reason shape; tolerant of stderr-noise prefix
 *      before JSON; null on malformed input.
 *   3. aggregateGateResults computes pass/block/error counts correctly,
 *      flags first blocker, ignores malformed entries.
 *   4. buildResponse produces a valid Claude Code Stop envelope (block
 *      vs pass) with chainSummary attached.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(HERE, "../../../.claude/hooks/stop-gate-chain.mjs");

let STOP_GATE_LIST: any, parseGateOutput: any, aggregateGateResults: any, buildResponse: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(HOOK).href);
  STOP_GATE_LIST = mod.STOP_GATE_LIST;
  parseGateOutput = mod.parseGateOutput;
  aggregateGateResults = mod.aggregateGateResults;
  buildResponse = mod.buildResponse;
});

describe("P11-U08 STOP_GATE_LIST", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(STOP_GATE_LIST)).toBe(true);
    expect(STOP_GATE_LIST.length).toBeGreaterThan(0);
  });

  it("contains at least 16 gates per the milestone exit_condition", () => {
    expect(STOP_GATE_LIST.length).toBeGreaterThanOrEqual(16);
  });

  it("every entry is a repo-relative .claude/hooks/stop_on_*.mjs path", () => {
    for (const p of STOP_GATE_LIST) {
      expect(typeof p).toBe("string");
      expect(p.startsWith(".claude/hooks/stop_on_")).toBe(true);
      expect(p.endsWith(".mjs")).toBe(true);
    }
  });

  it("contains no duplicates", () => {
    expect(new Set(STOP_GATE_LIST).size).toBe(STOP_GATE_LIST.length);
  });

  it("includes the documented canonical gates", () => {
    expect(STOP_GATE_LIST).toContain(".claude/hooks/stop_on_dirty_registry.mjs");
    expect(STOP_GATE_LIST).toContain(".claude/hooks/stop_on_failing_tests.mjs");
    expect(STOP_GATE_LIST).toContain(".claude/hooks/stop_on_awareness_degraded.mjs");
    expect(STOP_GATE_LIST).toContain(".claude/hooks/stop_on_extraction_incomplete.mjs");
    expect(STOP_GATE_LIST).toContain(".claude/hooks/stop_on_circular_deps.mjs");
    expect(STOP_GATE_LIST).toContain(".claude/hooks/stop_on_hook_unregistered.mjs");
  });
});

describe("P11-U08 parseGateOutput", () => {
  it("recognises legacy decision:'block' shape", () => {
    const r = parseGateOutput('{"continue":false,"decision":"block","reason":"missing test"}');
    expect(r).toEqual({ decision: "block", reason: "missing test" });
  });

  it("recognises continue:false alone as block", () => {
    const r = parseGateOutput('{"continue":false}');
    expect(r!.decision).toBe("block");
  });

  it("recognises continue:true as pass", () => {
    const r = parseGateOutput('{"continue":true}');
    expect(r!.decision).toBe("pass");
  });

  it("recognises modern hookSpecificOutput.permissionDecision:'deny'", () => {
    const r = parseGateOutput('{"hookSpecificOutput":{"permissionDecision":"deny","reason":"foo"}}');
    expect(r).toEqual({ decision: "block", reason: "foo" });
  });

  it("uses permissionDecisionReason when reason is absent on hookSpecificOutput", () => {
    const r = parseGateOutput('{"hookSpecificOutput":{"permissionDecision":"deny","permissionDecisionReason":"bar"}}');
    expect(r!.reason).toBe("bar");
  });

  it("falls through to pass when hookSpecificOutput.permissionDecision !== deny", () => {
    const r = parseGateOutput('{"hookSpecificOutput":{"permissionDecision":"allow"}}');
    expect(r!.decision).toBe("pass");
  });

  it("tolerates stderr noise before the JSON object", () => {
    const r = parseGateOutput("warning: something noisy\n{\"continue\":false,\"decision\":\"block\",\"reason\":\"bad\"}");
    expect(r).toEqual({ decision: "block", reason: "bad" });
  });

  it("returns null for malformed JSON", () => {
    expect(parseGateOutput("{not json")).toBeNull();
    expect(parseGateOutput("")).toBeNull();
    expect(parseGateOutput(null as any)).toBeNull();
    expect(parseGateOutput(undefined as any)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseGateOutput(42 as any)).toBeNull();
    expect(parseGateOutput({} as any)).toBeNull();
  });

  it("returns 'blocked' as default reason when block decision lacks reason", () => {
    const r = parseGateOutput('{"continue":false}');
    expect(r!.reason).toBe("blocked");
  });
});

describe("P11-U08 aggregateGateResults", () => {
  function res(over: any = {}) {
    return { gate: "stop_on_x.mjs", decision: "pass", reason: "", durationMs: 10, ...over };
  }

  it("all-pass aggregation", () => {
    const a = aggregateGateResults([res(), res(), res()]);
    expect(a.passed).toBe(true);
    expect(a.blocked).toBe(false);
    expect(a.blocker).toBeUndefined();
    expect(a.summary).toEqual({ ranCount: 3, passCount: 3, blockCount: 0, errorCount: 0 });
  });

  it("flags first blocker + carries reason", () => {
    const a = aggregateGateResults([
      res({ gate: "g1" }),
      res({ gate: "g2", decision: "block", reason: "first-block" }),
      res({ gate: "g3", decision: "block", reason: "second-block" }),
    ]);
    expect(a.passed).toBe(false);
    expect(a.blocked).toBe(true);
    expect(a.blocker).toBe("g2");
    expect(a.blockReason).toBe("first-block");
    expect(a.summary.blockCount).toBe(2);
  });

  it("counts error decisions separately from block + pass", () => {
    const a = aggregateGateResults([
      res(),
      res({ decision: "error", reason: "boom" }),
      res({ decision: "error" }),
    ]);
    expect(a.summary).toEqual({ ranCount: 3, passCount: 1, blockCount: 0, errorCount: 2 });
    expect(a.passed).toBe(true);  // errors don't count as blocks
    expect(a.blocked).toBe(false);
  });

  it("ignores malformed entries (null/non-object)", () => {
    const a = aggregateGateResults([res(), null, undefined, 42, res()]);
    expect(a.summary.ranCount).toBe(5); // we count input length
    expect(a.summary.passCount).toBe(2); // but only count valid pass entries
  });

  it("non-array input → empty summary, passed=true", () => {
    const a = aggregateGateResults(null);
    expect(a.passed).toBe(true);
    expect(a.summary.ranCount).toBe(0);
  });

  it("empty array → passed=true, all counts zero", () => {
    const a = aggregateGateResults([]);
    expect(a.passed).toBe(true);
    expect(a.summary).toEqual({ ranCount: 0, passCount: 0, blockCount: 0, errorCount: 0 });
  });
});

describe("P11-U08 buildResponse", () => {
  it("emits {continue:true} for an all-pass aggregation", () => {
    const agg = aggregateGateResults([{ gate: "g", decision: "pass", reason: "", durationMs: 5 }]);
    const r = buildResponse(agg);
    expect(r.continue).toBe(true);
    expect(r.hookSpecificOutput.chainSummary.passCount).toBe(1);
  });

  it("emits a block envelope when blocked", () => {
    const agg = aggregateGateResults([
      { gate: "stop_on_x", decision: "block", reason: "missing test" },
    ]);
    const r = buildResponse(agg);
    expect(r.continue).toBe(false);
    expect(r.decision).toBe("block");
    expect(r.reason).toContain("stop_on_x");
    expect(r.reason).toContain("missing test");
    expect(r.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(r.hookSpecificOutput.chainSummary.blockCount).toBe(1);
  });

  it("includes chainSummary on both pass and block envelopes", () => {
    const passAgg = aggregateGateResults([{ gate: "g1", decision: "pass" }]);
    expect(buildResponse(passAgg).hookSpecificOutput.chainSummary).toBeDefined();
    const blockAgg = aggregateGateResults([{ gate: "g1", decision: "block", reason: "x" }]);
    expect(buildResponse(blockAgg).hookSpecificOutput.chainSummary).toBeDefined();
  });

  it("safe on null input — emits {continue:true}", () => {
    expect(buildResponse(null)).toEqual({ continue: true });
    expect(buildResponse(undefined)).toEqual({ continue: true });
  });

  it("block reason includes 'no reason given' fallback when blockReason is missing", () => {
    const agg = { blocked: true, passed: false, blocker: "g", summary: {} };
    const r = buildResponse(agg);
    expect(r.reason).toContain("no reason given");
  });
});
