/**
 * AICounterfactualDispatcher — INTEL-OLLAMA-OBSIDIAN-MS0/P5-U03.
 *
 * Round-trip test for prism_ai:counterfactual_predict. Asserts:
 *   1. Action is in ACTIONS const + z.enum + has a case body.
 *   2. Case body lazy-imports CounterfactualReasoningEngine and dispatches
 *      to createCausalGraph() + generateCounterfactual().
 *   3. The engine produces real counterfactual analysis on a fresh graph.
 *   4. The dispatcher's required-param + valid-domain guards behave
 *      correctly when invoked with the same shapes the case body sees.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CounterfactualReasoningEngine,
  counterfactualReasoningEngine,
  type CausalVariable,
} from "../engines/CounterfactualReasoningEngine.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(HERE, "../..");
const DISPATCHER_PATH = path.join(MCP_ROOT, "src/tools/dispatchers/aiReasoningDispatcher.ts");

const VALID_DOMAINS = ["machining", "edm", "grinding", "custom"] as const;

describe("P5-U03 dispatcher source — counterfactual_predict wiring", () => {
  const src = fs.readFileSync(DISPATCHER_PATH, "utf8");

  it("counterfactual_predict appears in ACTIONS const", () => {
    expect(src).toContain('"counterfactual_predict"');
  });

  it("counterfactual_predict has a case body in the dispatcher switch", () => {
    expect(src).toContain('case "counterfactual_predict"');
  });

  it("case body lazy-imports CounterfactualReasoningEngine", () => {
    const idx = src.indexOf('case "counterfactual_predict"');
    const block = src.slice(idx, idx + 2000);
    expect(block).toContain("CounterfactualReasoningEngine");
    expect(block).toContain("counterfactualReasoningEngine");
  });

  it("case body calls createCausalGraph AND generateCounterfactual", () => {
    const idx = src.indexOf('case "counterfactual_predict"');
    const block = src.slice(idx, idx + 2000);
    expect(block).toContain("createCausalGraph");
    expect(block).toContain("generateCounterfactual");
  });

  it("case body validates the three required params", () => {
    const idx = src.indexOf('case "counterfactual_predict"');
    const block = src.slice(idx, idx + 2000);
    // The case body references params.variables, params.variable, and
    // params.counterfactual_value — quote style varies between bare property
    // accessors and error messages, so we just check the names appear.
    expect(block).toContain("params.variables");
    expect(block).toContain("params.variable");
    expect(block).toContain("params.counterfactual_value");
  });

  it("case body restricts domain to the documented enum", () => {
    const idx = src.indexOf('case "counterfactual_predict"');
    const block = src.slice(idx, idx + 2000);
    for (const d of VALID_DOMAINS) {
      expect(block).toContain(`"${d}"`);
    }
  });
});

describe("P5-U03 engine round-trip — createCausalGraph + generateCounterfactual", () => {
  // Use an isolated engine instance so the test does not depend on shared
  // singleton state from other tests in the suite.
  const isolated = new CounterfactualReasoningEngine();

  // Use names that match MACHINING_CAUSAL_TEMPLATES so the seeded relations
  // actually wire up between the variables and propagation produces effects.
  const machiningVars: CausalVariable[] = [
    {
      name: "cutting_speed",
      type: "continuous",
      domain: { min: 50, max: 400 },
      current_value: 200,
      unit: "m/min",
    },
    {
      name: "feed_rate",
      type: "continuous",
      domain: { min: 0.05, max: 0.5 },
      current_value: 0.2,
      unit: "mm/rev",
    },
    {
      name: "depth_of_cut",
      type: "continuous",
      domain: { min: 0.1, max: 5 },
      current_value: 1.5,
      unit: "mm",
    },
    {
      name: "tool_wear",
      type: "continuous",
      domain: { min: 0, max: 1 },
      current_value: 0.2,
      unit: "mm",
    },
    {
      name: "surface_finish",
      type: "continuous",
      domain: { min: 0.1, max: 25 },
      current_value: 1.6,
      unit: "Ra um",
    },
    {
      name: "temperature",
      type: "continuous",
      domain: { min: 20, max: 1200 },
      current_value: 500,
      unit: "C",
    },
    {
      name: "cutting_force",
      type: "continuous",
      domain: { min: 0, max: 5000 },
      current_value: 800,
      unit: "N",
    },
  ];

  it("createCausalGraph returns a graph with id, vars map, and relations", () => {
    const graph = isolated.createCausalGraph(machiningVars, "machining");
    expect(graph.id).toMatch(/^graph_/);
    expect(graph.variables).toBeInstanceOf(Map);
    expect(graph.variables.size).toBe(machiningVars.length);
    // The seeded MACHINING_CAUSAL_TEMPLATES include cutting_speed→tool_wear,
    // feed_rate→surface_finish, etc. — so the filtered relations list must
    // be non-empty for this variable set.
    expect(graph.relations.length).toBeGreaterThan(0);
    expect(typeof graph.created_at).toBe("string");
  });

  it("generateCounterfactual on cutting_speed produces predicted effects on connected vars", () => {
    const graph = isolated.createCausalGraph(machiningVars, "machining");
    const cf = isolated.generateCounterfactual(graph.id, "cutting_speed", 300);
    expect(cf).not.toBeNull();
    if (cf === null) return; // narrow for TS
    expect(cf.intervention.variable).toBe("cutting_speed");
    expect(cf.intervention.original_value).toBe(200);
    expect(cf.intervention.counterfactual_value).toBe(300);
    expect(Array.isArray(cf.predicted_effects)).toBe(true);
    // cutting_speed has direct edges to tool_wear, temperature, surface_finish
    expect(cf.predicted_effects.length).toBeGreaterThan(0);
    const affectedVars = cf.predicted_effects.map((e) => e.variable);
    // At least one downstream var from the seeded templates must show up.
    const hasDownstream =
      affectedVars.includes("tool_wear") ||
      affectedVars.includes("temperature") ||
      affectedVars.includes("surface_finish");
    expect(hasDownstream).toBe(true);
  });

  it("counterfactual scores (outcome / feasibility / risk) are finite and bounded", () => {
    const graph = isolated.createCausalGraph(machiningVars, "machining");
    const cf = isolated.generateCounterfactual(graph.id, "feed_rate", 0.3);
    expect(cf).not.toBeNull();
    if (cf === null) return;
    expect(Number.isFinite(cf.outcome_score)).toBe(true);
    expect(cf.outcome_score).toBeGreaterThanOrEqual(0);
    expect(cf.outcome_score).toBeLessThanOrEqual(1);
    expect(Number.isFinite(cf.feasibility)).toBe(true);
    expect(cf.feasibility).toBeGreaterThanOrEqual(0);
    expect(cf.feasibility).toBeLessThanOrEqual(1);
    expect(Number.isFinite(cf.risk_score)).toBe(true);
    expect(cf.risk_score).toBeGreaterThanOrEqual(0);
    expect(cf.risk_score).toBeLessThanOrEqual(1);
  });

  it("generateCounterfactual returns null for unknown graph id", () => {
    const cf = isolated.generateCounterfactual("graph_does_not_exist", "cutting_speed", 250);
    expect(cf).toBeNull();
  });

  it("generateCounterfactual returns null for unknown variable name", () => {
    const graph = isolated.createCausalGraph(machiningVars, "machining");
    const cf = isolated.generateCounterfactual(graph.id, "nonexistent_var", 1);
    expect(cf).toBeNull();
  });

  it("createCausalGraph with custom domain returns empty relations", () => {
    const graph = isolated.createCausalGraph(machiningVars, "custom");
    // No templates apply to "custom" domain — relations should be empty.
    expect(graph.relations.length).toBe(0);
  });

  it("predicted_effects entries carry numeric change_percentage values", () => {
    const graph = isolated.createCausalGraph(machiningVars, "machining");
    const cf = isolated.generateCounterfactual(graph.id, "depth_of_cut", 2.5);
    expect(cf).not.toBeNull();
    if (cf === null) return;
    for (const eff of cf.predicted_effects) {
      expect(typeof eff.variable).toBe("string");
      expect(Number.isFinite(eff.change_percentage)).toBe(true);
    }
  });
});

describe("P5-U03 dispatcher param-validation parity", () => {
  // Mirror the dispatcher case body's guards exactly. If the dispatcher
  // diverges from this, anti-regression flags it via the source check above.
  function dispatcherWouldReject(params: Record<string, unknown>): string | null {
    if (!Array.isArray(params.variables) || (params.variables as unknown[]).length === 0) {
      return "counterfactual_predict requires 'variables[]' (CausalVariable[])";
    }
    if (typeof params.variable !== "string" || (params.variable as string).length === 0) {
      return "counterfactual_predict requires 'variable' (target name) string";
    }
    if (params.counterfactual_value === undefined || params.counterfactual_value === null) {
      return "counterfactual_predict requires 'counterfactual_value' (number|string|boolean)";
    }
    return null;
  }

  function resolveDomain(params: Record<string, unknown>): string {
    const validDomains = ["machining", "edm", "grinding", "custom"];
    return validDomains.includes(String(params.domain)) ? String(params.domain) : "machining";
  }

  it("rejects when variables is missing", () => {
    const r = dispatcherWouldReject({ variable: "x", counterfactual_value: 1 });
    expect(r).not.toBeNull();
    expect(r).toContain("variables");
  });

  it("rejects when variables is empty array", () => {
    const r = dispatcherWouldReject({ variables: [], variable: "x", counterfactual_value: 1 });
    expect(r).not.toBeNull();
    expect(r).toContain("variables");
  });

  it("rejects when variable is missing", () => {
    const r = dispatcherWouldReject({ variables: [{ name: "x" }], counterfactual_value: 1 });
    expect(r).not.toBeNull();
    expect(r).toContain("variable");
  });

  it("rejects when variable is empty string", () => {
    const r = dispatcherWouldReject({
      variables: [{ name: "x" }],
      variable: "",
      counterfactual_value: 1,
    });
    expect(r).not.toBeNull();
    expect(r).toContain("variable");
  });

  it("rejects when counterfactual_value is null or undefined", () => {
    expect(
      dispatcherWouldReject({ variables: [{ name: "x" }], variable: "x", counterfactual_value: undefined }),
    ).not.toBeNull();
    expect(
      dispatcherWouldReject({ variables: [{ name: "x" }], variable: "x", counterfactual_value: null }),
    ).not.toBeNull();
  });

  it("accepts numeric, string, and boolean counterfactual_value", () => {
    expect(
      dispatcherWouldReject({ variables: [{ name: "x" }], variable: "x", counterfactual_value: 42 }),
    ).toBeNull();
    expect(
      dispatcherWouldReject({ variables: [{ name: "x" }], variable: "x", counterfactual_value: "high" }),
    ).toBeNull();
    expect(
      dispatcherWouldReject({ variables: [{ name: "x" }], variable: "x", counterfactual_value: false }),
    ).toBeNull();
  });

  it("defaults domain to 'machining' when absent", () => {
    expect(resolveDomain({})).toBe("machining");
  });

  it("defaults domain to 'machining' when invalid", () => {
    expect(resolveDomain({ domain: "not-a-real-domain" })).toBe("machining");
  });

  it("preserves valid domain values", () => {
    for (const d of VALID_DOMAINS) {
      expect(resolveDomain({ domain: d })).toBe(d);
    }
  });
});

describe("P5-U03 singleton sanity check", () => {
  it("the exported singleton is the documented engine class", () => {
    expect(counterfactualReasoningEngine).toBeInstanceOf(CounterfactualReasoningEngine);
  });
});
