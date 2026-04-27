/**
 * IterativeRetrievalEngine — behavioural tests.
 * Asserts concrete relevance ordering, cycle counts, and gap detection
 * against a controlled fixture codebase.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { IterativeRetrievalEngine, RetrievalRequestSchema } from "../engines/IterativeRetrievalEngine.js";

let tmpRoot: string;
let mcpRoot: string;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "iterret-"));
  mcpRoot = path.join(tmpRoot, "mcp-server");
  const enginesDir = path.join(mcpRoot, "src", "engines");
  fs.mkdirSync(enginesDir, { recursive: true });

  fs.writeFileSync(
    path.join(enginesDir, "KienzleCuttingForceEngine.ts"),
    `// Kienzle cutting force calculation engine
// Implements Fc = kc1.1 * ap * fz^(1-mc) per Kienzle 1952
export class KienzleCuttingForceEngine {
  computeKienzleForce(kc: number, ap: number, fz: number, mc: number) {
    return kc * ap * Math.pow(fz, 1 - mc);
  }
}`,
  );
  fs.writeFileSync(
    path.join(enginesDir, "FeedRateForceEngine.ts"),
    `// feed-rate driven force lookup; mentions cutting in passing
export class FeedRateForceEngine { compute() { return 100; } }`,
  );
  fs.writeFileSync(
    path.join(enginesDir, "ChipFlowEngine.ts"),
    `// chip flow analysis. force is computed elsewhere.
export class ChipFlowEngine { flow() { return 0; } }`,
  );
  fs.writeFileSync(
    path.join(enginesDir, "AssemblyPlannerEngine.ts"),
    `// schedule packaging dispatch
export class AssemblyPlannerEngine { plan() {} }`,
  );
});

afterAll(() => {
  if (tmpRoot && fs.existsSync(tmpRoot)) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("IterativeRetrievalEngine — schema", () => {
  it("rejects empty query string", () => {
    expect(() => RetrievalRequestSchema.parse({ query: "" })).toThrow();
  });

  it("rejects max_cycles=0", () => {
    expect(() => RetrievalRequestSchema.parse({ query: "x", max_cycles: 0 })).toThrow();
  });

  it("rejects max_cycles=99 (above ceiling of 5)", () => {
    expect(() => RetrievalRequestSchema.parse({ query: "x", max_cycles: 99 })).toThrow();
  });

  it("rejects min_relevance=1.5 (above 1.0)", () => {
    expect(() => RetrievalRequestSchema.parse({ query: "x", min_relevance: 1.5 })).toThrow();
  });

  it("accepts and round-trips a minimal valid request", () => {
    const parsed = RetrievalRequestSchema.parse({ query: "kienzle" });
    expect(parsed).toEqual({ query: "kienzle" });
  });
});

describe("IterativeRetrievalEngine — relevance ordering", () => {
  it("ranks Kienzle file at relevance >= 0.7 for 'kienzle force' query", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle force",
      dispatch_target: "engines_only",
      max_cycles: 1,
    });
    const top = result.candidates[0];
    expect(top.path).toMatch(/KienzleCuttingForceEngine\.ts$/);
    expect(top.relevance).toBeGreaterThanOrEqual(0.7);
    expect(top.matched_keywords).toEqual(expect.arrayContaining(["kienzle", "force"]));
  });

  it("ranks Kienzle at index 0 and FeedRateForce after it", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle force",
      dispatch_target: "engines_only",
      max_cycles: 1,
    });
    const kienzleIdx = result.candidates.findIndex((c) => c.path.includes("Kienzle"));
    const feedIdx = result.candidates.findIndex((c) => c.path.includes("FeedRateForce"));
    expect(kienzleIdx).toBe(0);
    expect(feedIdx).toBe(1);
    expect(result.candidates[0].relevance).toBeGreaterThan(result.candidates[1].relevance);
  });

  it("excludes AssemblyPlanner entirely when no shared keywords", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle cutting force",
      dispatch_target: "engines_only",
      max_cycles: 1,
    });
    const assemblyHits = result.candidates.filter((c) => c.path.includes("Assembly"));
    expect(assemblyHits).toEqual([]);
  });

  it("preview snippet contains the matched keyword and stays within 240 chars", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle",
      dispatch_target: "engines_only",
      max_cycles: 1,
    });
    expect(result.candidates[0].preview.toLowerCase()).toContain("kienzle");
    expect(result.candidates[0].preview.length).toBeLessThanOrEqual(240);
  });
});

describe("IterativeRetrievalEngine — termination semantics", () => {
  it("terminates in 1 cycle when target met and no gaps", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle",
      dispatch_target: "engines_only",
      max_cycles: 5,
      target_count: 1,
      min_relevance: 0.4,
    });
    expect(result.cycles_run).toBe(1);
    expect(result.terminated_early).toBe(true);
    expect(result.termination_reason).toMatch(/^target_met:/);
  });

  it("runs exactly max_cycles=2 when termination unreachable", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle force",
      dispatch_target: "engines_only",
      max_cycles: 2,
      target_count: 50,
      min_relevance: 0.99,
    });
    expect(result.cycles_run).toBe(2);
    expect(result.terminated_early).toBe(false);
    expect(result.termination_reason).toBe("max_cycles_reached");
  });

  it("runs exactly max_cycles=3 with unreachable target", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "force",
      dispatch_target: "engines_only",
      max_cycles: 3,
      target_count: 50,
      min_relevance: 0.99,
    });
    expect(result.cycles_run).toBe(3);
  });
});

describe("IterativeRetrievalEngine — refinement & dedup", () => {
  it("each candidate path appears exactly once across cycles", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle force cutting",
      dispatch_target: "engines_only",
      max_cycles: 3,
      target_count: 50,
      min_relevance: 0.99,
    });
    const paths = result.candidates.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("excluded path is filtered out — Kienzle absent when excluded", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "cutting force",
      dispatch_target: "engines_only",
      exclude_patterns: ["Kienzle"],
      max_cycles: 1,
    });
    const kienzleHits = result.candidates.filter((c) => c.path.includes("Kienzle"));
    expect(kienzleHits).toEqual([]);
  });

  it("cycle 1 keywords_used contains all initial query tokens", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "kienzle cutting force",
      dispatch_target: "engines_only",
      max_cycles: 1,
    });
    expect(result.cycles[0].keywords_used).toEqual(
      expect.arrayContaining(["kienzle", "cutting", "force"]),
    );
  });
});

describe("IterativeRetrievalEngine — failure modes", () => {
  it("throws Error with expected message when search root does not exist", () => {
    const engine = new IterativeRetrievalEngine("Z:\\does\\not\\exist", "Z:\\does\\not\\exist");
    expect(() => engine.retrieve({ query: "x", dispatch_target: "codebase" })).toThrow(
      /search root does not exist/,
    );
  });

  it("returns empty candidates and empty high_relevance for nonsense query", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    const result = engine.retrieve({
      query: "zxqvjkl_no_such_token",
      dispatch_target: "engines_only",
      min_relevance: 0.7,
    });
    expect(result.candidates).toEqual([]);
    expect(result.high_relevance).toEqual([]);
  });

  it("retrieve() rejects empty query via Zod parse error", () => {
    const engine = new IterativeRetrievalEngine(mcpRoot, tmpRoot);
    expect(() => engine.retrieve({ query: "" })).toThrow();
  });
});
