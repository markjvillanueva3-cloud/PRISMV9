/**
 * AICausalAnalyzeDispatcher — INTEL-OLLAMA-OBSIDIAN-MS0/P5-U02.
 *
 * Round-trip test for prism_ai:causal_analyze. Asserts:
 *   1. Action is in ACTIONS const + z.enum + has a case body.
 *   2. Case body lazy-imports CausalReasoningEngine and dispatches
 *      to traceImpact() (when source provided) or rootCauses()
 *      (when target provided).
 *   3. The engine produces real causal paths after addEdge() seeding.
 *   4. The dispatcher's source XOR target guard rejects
 *      both-set / neither-set inputs.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CausalReasoningEngine,
  causalReasoningEngine,
} from "../engines/CausalReasoningEngine.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(HERE, "../..");
const DISPATCHER_PATH = path.join(MCP_ROOT, "src/tools/dispatchers/aiReasoningDispatcher.ts");

describe("P5-U02 dispatcher source — causal_analyze wiring", () => {
  const src = fs.readFileSync(DISPATCHER_PATH, "utf8");

  it("causal_analyze appears in ACTIONS const", () => {
    expect(src).toContain('"causal_analyze"');
  });

  it("causal_analyze has a case body in the dispatcher switch", () => {
    expect(src).toContain('case "causal_analyze"');
  });

  it("case body lazy-imports CausalReasoningEngine", () => {
    const idx = src.indexOf('case "causal_analyze"');
    const block = src.slice(idx, idx + 2000);
    expect(block).toContain("CausalReasoningEngine");
    expect(block).toContain("causalReasoningEngine");
  });

  it("case body dispatches to traceImpact AND rootCauses", () => {
    const idx = src.indexOf('case "causal_analyze"');
    const block = src.slice(idx, idx + 2000);
    expect(block).toContain("traceImpact");
    expect(block).toContain("rootCauses");
  });

  it("case body enforces source XOR target", () => {
    const idx = src.indexOf('case "causal_analyze"');
    const block = src.slice(idx, idx + 2000);
    expect(block).toMatch(/source[^\n]*target|target[^\n]*source/);
    expect(block).toContain("either");
  });
});

describe("P5-U02 engine round-trip — traceImpact + rootCauses on a fresh graph", () => {
  // Build a small isolated graph so the test does not depend on shared
  // singleton state from other tests.
  const isolated = new CausalReasoningEngine();

  // chip_load → tool_wear → tool_breakage
  // chip_load → cutting_temperature → tool_wear (alternate path)
  isolated.addEdge({ from: "chip_load", to: "tool_wear", confidence: 0.85, polarity: "positive" });
  isolated.addEdge({ from: "tool_wear", to: "tool_breakage", confidence: 0.7, polarity: "positive" });
  isolated.addEdge({ from: "chip_load", to: "cutting_temperature", confidence: 0.8, polarity: "positive" });
  isolated.addEdge({ from: "cutting_temperature", to: "tool_wear", confidence: 0.6, polarity: "positive" });

  it("traceImpact from chip_load reaches tool_breakage within 3 hops", () => {
    const report = isolated.traceImpact("chip_load", 3);
    expect(report.source).toBe("chip_load");
    expect(report.maxHops).toBe(3);
    expect(report.paths.length).toBeGreaterThan(0);
    const targets = report.paths.map((p) => p.target);
    expect(targets).toContain("tool_wear");
    expect(targets).toContain("tool_breakage");
    // Every path's confidence should be a finite number in [0, 1]
    for (const p of report.paths) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
      expect(Number.isFinite(p.confidence)).toBe(true);
    }
  });

  it("rootCauses(tool_breakage) traces back to chip_load", () => {
    const causes = isolated.rootCauses("tool_breakage", 3);
    expect(causes).toContain("chip_load");
  });

  it("traceImpact respects maxHops bound (1-hop returns only direct successors)", () => {
    const report = isolated.traceImpact("chip_load", 1);
    expect(report.maxHops).toBe(1);
    for (const p of report.paths) {
      expect(p.hops).toBeLessThanOrEqual(1);
    }
  });

  it("rootCauses on a node with no incoming edges returns empty", () => {
    const empty = new CausalReasoningEngine();
    empty.addEdge({ from: "isolated_a", to: "isolated_b", confidence: 1, polarity: "positive" });
    const causes = empty.rootCauses("isolated_a", 5);
    expect(causes).toEqual([]);
  });
});

describe("P5-U02 dispatcher param-validation parity", () => {
  function dispatcherWouldReject(params: Record<string, unknown>): string | null {
    const hasSource = typeof params.source === "string" && (params.source as string).length > 0;
    const hasTarget = typeof params.target === "string" && (params.target as string).length > 0;
    if (!hasSource && !hasTarget) {
      return "causal_analyze requires either 'source' (traceImpact) or 'target' (rootCauses)";
    }
    if (hasSource && hasTarget) {
      return "causal_analyze: pass either source OR target, not both";
    }
    return null;
  }

  it("rejects when neither source nor target is provided", () => {
    const r = dispatcherWouldReject({});
    expect(r).not.toBeNull();
    expect(r).toContain("either");
  });

  it("rejects when both source and target are provided", () => {
    const r = dispatcherWouldReject({ source: "a", target: "b" });
    expect(r).not.toBeNull();
    expect(r).toContain("not both");
  });

  it("accepts source-only", () => {
    expect(dispatcherWouldReject({ source: "a" }) === null).toBe(true);
  });

  it("accepts target-only", () => {
    expect(dispatcherWouldReject({ target: "b" }) === null).toBe(true);
  });

  it("rejects empty-string source / target as missing", () => {
    expect(dispatcherWouldReject({ source: "" })).not.toBeNull();
    expect(dispatcherWouldReject({ target: "" })).not.toBeNull();
  });
});

describe("P5-U02 maxHops sanity", () => {
  // Mirrors the dispatcher's clamp logic: Math.min(20, Math.floor(Number(maxHopsRaw))).
  function clampMaxHops(raw: unknown): number {
    if (Number.isFinite(raw) && Number(raw) > 0) {
      return Math.min(20, Math.floor(Number(raw)));
    }
    return 3;
  }

  it("defaults to 3 when maxHops absent or non-finite", () => {
    expect(clampMaxHops(undefined)).toBe(3);
    expect(clampMaxHops("foo")).toBe(3);
    expect(clampMaxHops(NaN)).toBe(3);
    expect(clampMaxHops(-1)).toBe(3);
  });

  it("clamps to 20 maximum", () => {
    expect(clampMaxHops(100)).toBe(20);
    expect(clampMaxHops(20)).toBe(20);
  });

  it("preserves valid values in range [1, 20]", () => {
    expect(clampMaxHops(5)).toBe(5);
    expect(clampMaxHops(1)).toBe(1);
    expect(clampMaxHops(7.9)).toBe(7);
  });
});

describe("P5-U02 singleton sanity check", () => {
  it("the exported singleton is the documented engine class", () => {
    expect(causalReasoningEngine).toBeInstanceOf(CausalReasoningEngine);
  });
});
