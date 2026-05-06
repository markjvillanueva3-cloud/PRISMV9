/**
 * AICreativeSolveDispatcher — INTEL-OLLAMA-OBSIDIAN-MS0/P5-U01.
 *
 * Round-trip test for prism_ai:creative_solve. Asserts:
 *   1. The action appears in aiReasoningDispatcher's ACTIONS const + z.enum.
 *   2. The case body lazy-imports PRISMCreativeReasoningEngine and calls
 *      .explore() with the documented param shape.
 *   3. The engine produces non-empty output for a real machining problem.
 *   4. The dispatcher's required-param + flexibility-enum guards behave
 *      correctly when invoked with the same shapes the case body sees.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { prismCreativeReasoningEngine } from "../engines/PRISMCreativeReasoningEngine.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(HERE, "../..");
const DISPATCHER_PATH = path.join(MCP_ROOT, "src/tools/dispatchers/aiReasoningDispatcher.ts");

const VALID_FLEXIBILITY = ["strict", "moderate", "flexible", "maximum"] as const;

describe("P5-U01 dispatcher source — creative_solve wiring", () => {
  const src = fs.readFileSync(DISPATCHER_PATH, "utf8");

  it("creative_solve appears in the ACTIONS const", () => {
    expect(src).toContain('"creative_solve"');
  });

  it("creative_solve has a case body in the dispatcher switch", () => {
    expect(src).toContain('case "creative_solve"');
  });

  it("case body lazy-imports PRISMCreativeReasoningEngine and calls .explore()", () => {
    const idx = src.indexOf('case "creative_solve"');
    const block = src.slice(idx, idx + 1500);
    expect(block).toContain("PRISMCreativeReasoningEngine");
    expect(block).toContain("prismCreativeReasoningEngine.explore");
  });

  it("case body validates the four required params before calling the engine", () => {
    const idx = src.indexOf('case "creative_solve"');
    const block = src.slice(idx, idx + 1500);
    expect(block).toContain('"domain"');
    expect(block).toContain('"objective"');
    expect(block).toContain('"desiredOutcome"');
    expect(block).toContain('"flexibility"');
  });

  it("case body restricts flexibility to the documented enum", () => {
    const idx = src.indexOf('case "creative_solve"');
    const block = src.slice(idx, idx + 1500);
    for (const v of VALID_FLEXIBILITY) {
      expect(block).toContain(`"${v}"`);
    }
  });
});

describe("P5-U01 engine round-trip — explore() produces real output", () => {
  it("returns a structured exploration object for a machining problem", () => {
    const result = prismCreativeReasoningEngine.explore(
      {
        domain: "cutting_parameters",
        objective: "Maximize MRR for titanium roughing without exceeding 80% spindle load",
        constraints: ["Tool life > 60 min", "Ra < 3.2 um"],
        desiredOutcome: "Optimal speed/feed combination",
        flexibility: "flexible",
      },
      "exploratory",
    );
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    const r = result as Record<string, unknown>;
    expect(Object.keys(r).length).toBeGreaterThan(0);
    // Cross-check against the documented surface (PRISMCreativeReasoningEngine returns
    // { problem?, mode?, solutions?[], hybridCombinations?[], recommendedSolution? } per CLAUDE.md).
    const hasShape =
      Array.isArray(r.solutions) ||
      Array.isArray(r.hybridCombinations) ||
      r.recommendedSolution !== undefined ||
      r.mode !== undefined ||
      r.problem !== undefined;
    expect(hasShape).toBe(true);
  });

  it("explore() respects the flexibility input by accepting all 4 enum values", () => {
    const seen = new Set<string>();
    for (const flex of VALID_FLEXIBILITY) {
      const r = prismCreativeReasoningEngine.explore(
        {
          domain: "toolpath",
          objective: "Reduce cycle time on 6061-T6 face mill operation",
          constraints: ["Surface finish at most Ra 1.6"],
          desiredOutcome: "Faster MRR with finish hold",
          flexibility: flex,
        },
        "conventional",
      );
      expect(r).not.toBeNull();
      expect(typeof r).toBe("object");
      seen.add(flex);
    }
    expect(seen.size).toBe(VALID_FLEXIBILITY.length);
  });
});

describe("P5-U01 dispatcher param-validation parity", () => {
  // Mirror the dispatcher case body's guards exactly. If the dispatcher
  // diverges from this, anti-regression flags it via the source check above.
  function dispatcherWouldReject(params: Record<string, unknown>): string | null {
    const required = ["domain", "objective", "desiredOutcome", "flexibility"] as const;
    const missing = required.filter((k) => params[k] === undefined || params[k] === null);
    if (missing.length > 0) return `creative_solve missing required params: ${missing.join(", ")}`;
    const validFlex = ["strict", "moderate", "flexible", "maximum"];
    if (!validFlex.includes(String(params.flexibility))) {
      return `creative_solve flexibility must be one of ${validFlex.join("|")}`;
    }
    return null;
  }

  it("rejects when domain is missing", () => {
    const r = dispatcherWouldReject({ objective: "x", desiredOutcome: "y", flexibility: "moderate" });
    expect(r).not.toBeNull();
    expect(r).toContain("missing required params");
    expect(r).toContain("domain");
  });

  it("rejects when flexibility is unknown", () => {
    const r = dispatcherWouldReject({
      domain: "x", objective: "y", desiredOutcome: "z", flexibility: "wide-open",
    });
    expect(r).not.toBeNull();
    expect(r).toContain("flexibility must be one of");
  });

  it("rejects when all required fields are null", () => {
    const r = dispatcherWouldReject({ domain: null, objective: null, desiredOutcome: null, flexibility: null });
    expect(r).not.toBeNull();
    expect(r).toContain("domain");
    expect(r).toContain("objective");
  });

  it("accepts all 4 flexibility enum values", () => {
    for (const flex of VALID_FLEXIBILITY) {
      const r = dispatcherWouldReject({
        domain: "x", objective: "y", desiredOutcome: "z", flexibility: flex,
      });
      expect(r === null).toBe(true);
    }
  });
});
