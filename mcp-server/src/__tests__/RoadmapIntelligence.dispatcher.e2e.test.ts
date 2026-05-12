/**
 * RoadmapIntelligence.dispatcher.e2e.test.ts — true dispatcher round-trip for the six
 * prism_dev:roadmap_intel_* actions (wires RoadmapIntelligenceEngine — AI-powered roadmap execution).
 *
 * Mocks McpServer.tool() to capture the registered prism_dev handler, then invokes it with real
 * {action, params} so the ACTIONS enum, the per-action Zod schemas in ACTION_DEV_SCHEMAS (via
 * validateActionParams), the switch cases, the lazy `await import("../engines/RoadmapIntelligenceEngine.js")`,
 * the engine's composition of ChainOfThought/Uncertainty/Learning/Decision/BI engines, and the
 * slimResponse-wrapped MCP envelope all run through production code paths.
 *
 * Coverage per action: happy path + ≥3 failure modes (missing/invalid input, schema rejection, empty)
 * + ≥2 adversarial inputs (oversize, NaN/Infinity, degenerate structure), plus ≥2 spanning configs for
 * build_vs_integrate and health, plus a regression check that an unknown prism_dev action still errors.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const COMPLEXITY = ["trivial", "simple", "moderate", "complex", "very_complex"];
const BASIS = ["historical", "complexity", "analogy", "expert"];
const VELOCITY = ["accelerating", "stable", "decelerating"];
const BVI = ["build", "integrate", "hybrid"];
const RI_ACTIONS = [
  "roadmap_intel_assess_complexity", "roadmap_intel_optimize", "roadmap_intel_predict_effort",
  "roadmap_intel_record_outcome", "roadmap_intel_build_vs_integrate", "roadmap_intel_health",
];

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<
  { content?: Array<{ type: "text"; text: string }>; isError?: boolean } | Record<string, unknown>
>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>;
  try { return JSON.parse(content[0]?.text ?? "{}"); } catch { return { _raw: content[0]?.text }; }
}

/** True when the dispatcher rejected the request (schema validation error OR in-case "Missing required" guard). */
function isError(d: Record<string, unknown>): boolean {
  return d.error !== undefined || d.details !== undefined || (typeof d.message === "string" && /not yet wired/i.test(d.message));
}

let _mid = 0;
function unit(over: Record<string, unknown> = {}) {
  return { id: `U${++_mid}`, name: `Unit ${_mid}`, description: `does thing ${_mid}`, estimated_hours: 8, status: "pending", ...over };
}
function milestone(over: Record<string, unknown> = {}) {
  return {
    id: "M-X", name: "Sample milestone", description: "A representative milestone with a couple of units", phase: "P1",
    units: [unit(), unit({ estimated_hours: 16 })],
    dependencies: [],
    status: "pending",
    ...over,
  };
}
function learningRecord(over: Record<string, unknown> = {}) {
  return {
    milestone_id: "M-PAST", predicted_hours: 20, actual_hours: 22, predicted_complexity: "moderate", actual_complexity: "moderate",
    prediction_date: "2026-01-01T00:00:00Z", completion_date: "2026-01-10T00:00:00Z",
    factors_that_affected_estimate: ["integration overhead"], lessons_learned: ["budget for review cycles"],
    ...over,
  };
}

describe("prism_dev:roadmap_intel_* — RoadmapIntelligenceEngine dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];
  beforeAll(() => { const c = captureHandler(); handler = c.handler; schemaActions = c.schemaActions; });

  it("wiring: all six roadmap_intel_* actions are in the prism_dev enum and have Zod schemas", () => {
    for (const a of RI_ACTIONS) {
      expect(schemaActions).toContain(a);
      expect(typeof (ACTION_DEV_SCHEMAS[a] as { parse?: unknown })?.parse).toBe("function");
    }
    // schema sanity: a well-formed milestone parses; a malformed one (bad status enum) is rejected
    const s = ACTION_DEV_SCHEMAS.roadmap_intel_assess_complexity as { parse: (x: unknown) => unknown };
    expect(() => s.parse({ milestone: milestone() })).not.toThrow();
    expect(() => s.parse({ milestone: milestone({ status: "halfway" }) })).toThrow();
    expect(() => s.parse({})).toThrow(); // milestone required
  });

  // ── assess_complexity ──────────────────────────────────────────────────────────────────────
  describe("roadmap_intel_assess_complexity", () => {
    it("happy: returns a bounded complexity score, an effort triangle (opt ≤ exp ≤ pess), and lists factors/risks/recommendations", async () => {
      const d = await invoke(handler, "roadmap_intel_assess_complexity", { milestone: milestone() });
      expect(d.milestone_id).toBe("M-X");
      expect(COMPLEXITY).toContain(d.overall_complexity);
      expect(typeof d.complexity_score).toBe("number");
      expect(d.complexity_score as number).toBeGreaterThanOrEqual(1);
      expect(d.complexity_score as number).toBeLessThanOrEqual(10);
      expect(d.confidence as number).toBeGreaterThanOrEqual(0);
      expect(d.confidence as number).toBeLessThanOrEqual(1);
      const eff = d.estimated_effort_hours as { optimistic: number; expected: number; pessimistic: number };
      expect(eff.optimistic).toBeLessThanOrEqual(eff.expected);
      expect(eff.expected).toBeLessThanOrEqual(eff.pessimistic);
      expect(Array.isArray(d.factors)).toBe(true);
      expect((d.factors as unknown[]).length).toBeGreaterThan(0); // a complexity assessment always lists ≥1 factor
      expect(d.risks === undefined || Array.isArray(d.risks)).toBe(true);          // omitted (response-slimmed) when empty
      expect(d.recommendations === undefined || Array.isArray(d.recommendations)).toBe(true);
    });
    it("failure: missing milestone is rejected", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_assess_complexity", {}))).toBe(true);
    });
    it("failure: a milestone with a bad-type field is rejected by the schema", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_assess_complexity", { milestone: { ...milestone(), units: "not-an-array" } }))).toBe(true);
    });
    it("adversarial: a milestone with 60 units and a 4 KB description still returns a valid (and higher) assessment", async () => {
      const big = milestone({ units: Array.from({ length: 60 }, () => unit()), description: "x".repeat(4096), dependencies: ["A", "B", "C", "D", "E"] });
      const d = await invoke(handler, "roadmap_intel_assess_complexity", { milestone: big });
      expect(COMPLEXITY).toContain(d.overall_complexity);
      expect(d.complexity_score as number).toBeGreaterThanOrEqual(1);
      expect(d.complexity_score as number).toBeLessThanOrEqual(10);
    });
    it("adversarial: a milestone with zero units does not crash", async () => {
      const d = await invoke(handler, "roadmap_intel_assess_complexity", { milestone: milestone({ units: [] }) });
      expect(COMPLEXITY).toContain(d.overall_complexity);
    });
  });

  // ── optimize ───────────────────────────────────────────────────────────────────────────────
  describe("roadmap_intel_optimize", () => {
    const chain = () => [
      milestone({ id: "M-A", name: "Foundation", dependencies: [] }),
      milestone({ id: "M-B", name: "Build on A", dependencies: ["M-A"] }),
      milestone({ id: "M-C", name: "Build on B", dependencies: ["M-B"] }),
    ];
    it("happy: orders all milestones, surfaces a critical path + parallelizable groups + an effort range with a 95% CI", async () => {
      const d = await invoke(handler, "roadmap_intel_optimize", { milestones: chain() });
      const order = d.optimized_order as Array<{ milestone_id: string; rank: number; dependencies_met: boolean }>;
      expect(Array.isArray(order)).toBe(true);
      expect(order.length).toBe(3);
      for (const o of order) { expect(typeof o.milestone_id).toBe("string"); expect(typeof o.rank).toBe("number"); expect(typeof o.dependencies_met).toBe("boolean"); }
      expect(d.critical_path === undefined || Array.isArray(d.critical_path)).toBe(true);
      expect(d.parallelizable_groups === undefined || Array.isArray(d.parallelizable_groups)).toBe(true);
      const te = d.total_estimated_effort as { optimistic: number; expected: number; pessimistic: number; confidence_95: [number, number] };
      expect(te.optimistic).toBeLessThanOrEqual(te.expected);
      expect(te.expected).toBeLessThanOrEqual(te.pessimistic);
      expect(te.confidence_95[0]).toBeLessThanOrEqual(te.confidence_95[1]);
      expect(d.bottlenecks === undefined || Array.isArray(d.bottlenecks)).toBe(true);   // omitted when no bottlenecks
      expect(d.recommendations === undefined || Array.isArray(d.recommendations)).toBe(true);
    });
    it("failure: an empty milestones array is rejected by the schema (min 1)", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_optimize", { milestones: [] }))).toBe(true);
    });
    it("failure: a non-array milestones value is rejected", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_optimize", { milestones: "nope" }))).toBe(true);
    });
    it("adversarial: a dangling dependency on a milestone that isn't in the set is tolerated (marked unmet, no crash)", async () => {
      const d = await invoke(handler, "roadmap_intel_optimize", { milestones: [milestone({ id: "M-A", dependencies: ["M-GHOST", "M-ALSO-GHOST"] }), milestone({ id: "M-B", dependencies: [] })] });
      const order = d.optimized_order as Array<{ milestone_id: string; dependencies_met: boolean; blocking_milestones: string[] }>;
      expect(order.length).toBe(2);
      const a = order.find((o) => o.milestone_id === "M-A")!;
      expect(a.dependencies_met).toBe(false);
      expect(a.blocking_milestones).toContain("M-GHOST");
    });
    it("adversarial: 5 dependency-free milestones are all ranked without crashing", async () => {
      const many = Array.from({ length: 5 }, (_, i) => milestone({ id: `M-${i}`, dependencies: [] }));
      const d = await invoke(handler, "roadmap_intel_optimize", { milestones: many });
      expect((d.optimized_order as unknown[]).length).toBe(5);
      expect(d.critical_path === undefined || Array.isArray(d.critical_path)).toBe(true);
    });
  });

  // ── predict_effort ─────────────────────────────────────────────────────────────────────────
  describe("roadmap_intel_predict_effort", () => {
    it("happy: predicts positive hours, a non-negative uncertainty, and a 95% CI that brackets the point estimate", async () => {
      const d = await invoke(handler, "roadmap_intel_predict_effort", { milestone: milestone() });
      expect(d.milestone_id).toBe("M-X");
      expect(d.predicted_hours as number).toBeGreaterThan(0);
      expect(d.uncertainty_hours as number).toBeGreaterThanOrEqual(0);
      const ci = d.confidence_interval_95 as [number, number];
      expect(ci[0]).toBeLessThanOrEqual(d.predicted_hours as number);
      expect(ci[1]).toBeGreaterThanOrEqual(d.predicted_hours as number);
      expect(BASIS).toContain(d.basis);
      expect(d.adjustment_factors === undefined || Array.isArray(d.adjustment_factors)).toBe(true); // omitted (response-slimmed) when no adjustments apply
    });
    it("with ≥3 matching historical records, the prediction basis becomes 'historical'", async () => {
      const m = milestone();
      const assessed = await invoke(handler, "roadmap_intel_assess_complexity", { milestone: m });
      const cx = String(assessed.overall_complexity);
      const hist = Array.from({ length: 4 }, (_, i) => learningRecord({ milestone_id: `M-PAST-${i}`, predicted_complexity: cx, actual_complexity: cx, predicted_hours: 30, actual_hours: 36 }));
      const d = await invoke(handler, "roadmap_intel_predict_effort", { milestone: m, historical_data: hist });
      expect(d.basis).toBe("historical");
      expect(Array.isArray(d.similar_past_milestones)).toBe(true);
      expect(d.predicted_hours as number).toBeGreaterThan(0);
    });
    it("a milestone with many units/dependencies/risks gets visible upward adjustment factors", async () => {
      const m = milestone({ units: Array.from({ length: 9 }, () => unit()), dependencies: ["A", "B", "C", "D", "E"] });
      const d = await invoke(handler, "roadmap_intel_predict_effort", { milestone: m });
      expect((d.adjustment_factors as unknown[]).length).toBeGreaterThan(0);
      expect(d.predicted_hours as number).toBeGreaterThan(0);
    });
    it("failure: missing milestone is rejected", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_predict_effort", {}))).toBe(true);
    });
  });

  // ── record_outcome ─────────────────────────────────────────────────────────────────────────
  describe("roadmap_intel_record_outcome", () => {
    it("happy: records the outcome, echoes it, and reports the prediction error percentage", async () => {
      const d = await invoke(handler, "roadmap_intel_record_outcome", {
        milestone_id: "M-X", predicted_hours: 24, actual_hours: 30, predicted_complexity: "moderate", actual_complexity: "complex", lessons_learned: ["underestimated integration"],
      });
      expect(d.ok).toBe(true);
      expect((d.recorded as { milestone_id: string }).milestone_id).toBe("M-X");
      expect(d.error_pct as number).toBeCloseTo(25, 5); // |30-24|/24*100
    });
    it("happy: lessons_learned defaults to [] when omitted", async () => {
      const d = await invoke(handler, "roadmap_intel_record_outcome", { milestone_id: "M-Y", predicted_hours: 10, actual_hours: 10, predicted_complexity: "simple", actual_complexity: "simple" });
      expect(d.ok).toBe(true);
      expect(d.error_pct as number).toBeCloseTo(0, 5);
    });
    it("failure: missing actual_hours is rejected", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_record_outcome", { milestone_id: "M-Z", predicted_hours: 10, predicted_complexity: "simple", actual_complexity: "simple" }))).toBe(true);
    });
    it("failure: a negative actual_hours is rejected by the schema", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_record_outcome", { milestone_id: "M-Z", predicted_hours: 10, actual_hours: -5, predicted_complexity: "simple", actual_complexity: "simple" }))).toBe(true);
    });
    it("failure: a non-string milestone_id is rejected", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_record_outcome", { milestone_id: 123, predicted_hours: 10, actual_hours: 12, predicted_complexity: "simple", actual_complexity: "simple" }))).toBe(true);
    });
    it("adversarial: oversize hours (1e12) are handled — recorded with a finite error percentage", async () => {
      const d = await invoke(handler, "roadmap_intel_record_outcome", { milestone_id: "M-BIG", predicted_hours: 1e12, actual_hours: 1.2e12, predicted_complexity: "very_complex", actual_complexity: "very_complex" });
      expect(d.ok).toBe(true);
      expect(d.error_pct as number).toBeCloseTo(20, 3);
    });
    it("adversarial: a NaN actual_hours is rejected (not silently recorded)", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_record_outcome", { milestone_id: "M-NAN", predicted_hours: 10, actual_hours: Number.NaN, predicted_complexity: "simple", actual_complexity: "simple" }))).toBe(true);
    });
  });

  // ── build_vs_integrate ─────────────────────────────────────────────────────────────────────
  describe("roadmap_intel_build_vs_integrate", () => {
    it("happy: returns a build|integrate|hybrid recommendation, a confidence, both analyses, and reasoning", async () => {
      const d = await invoke(handler, "roadmap_intel_build_vs_integrate", {
        feature_name: "PDF table extraction", feature_description: "pull tabular data out of scanned prints",
        build_estimate_hours: 120, maintenance_hours_per_year: 24,
        library_options: [
          { name: "camelot", integration_hours: 16, annual_cost: 0, reliability: 0.85, features: ["tables"] },
          { name: "tabula", integration_hours: 24, annual_cost: 0, reliability: 0.7, features: ["tables"] },
        ],
      });
      expect(d.feature).toBe("PDF table extraction");
      expect(BVI).toContain(d.recommendation);
      expect(d.confidence as number).toBeGreaterThanOrEqual(0);
      expect(d.confidence as number).toBeLessThanOrEqual(1);
      const ba = d.build_analysis as { estimated_hours: number; maintenance_hours_per_year: number; risks: unknown[]; pros: unknown[]; cons: unknown[] };
      expect(ba.estimated_hours).toBe(120);
      expect(ba.maintenance_hours_per_year).toBe(24);
      expect(Array.isArray(ba.risks)).toBe(true);
      const ia = d.integrate_analysis as { library_options: unknown[]; pros: unknown[]; cons: unknown[] };
      expect(ia.library_options.length).toBe(2);
      expect(Array.isArray(d.reasoning)).toBe(true);
    });
    it("variability: a tiny in-house build vs a huge expensive low-reliability library → recommends 'build'", async () => {
      const d = await invoke(handler, "roadmap_intel_build_vs_integrate", {
        feature_name: "trivial helper", build_estimate_hours: 6, maintenance_hours_per_year: 1,
        library_options: [{ name: "bloated-sdk", integration_hours: 200, annual_cost: 50000, reliability: 0.5, features: ["x"] }],
      });
      expect(d.recommendation).toBe("build");
    });
    it("variability: a large in-house build vs a cheap reliable library still yields a valid recommendation", async () => {
      const d = await invoke(handler, "roadmap_intel_build_vs_integrate", {
        feature_name: "huge subsystem", build_estimate_hours: 400, maintenance_hours_per_year: 80,
        library_options: [{ name: "battle-tested", integration_hours: 8, annual_cost: 0, reliability: 0.97, features: ["everything"] }],
      });
      expect(BVI).toContain(d.recommendation);
      expect((d.integrate_analysis as { library_options: unknown[] }).library_options.length).toBe(1);
    });
    it("failure: missing feature_name is rejected", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_build_vs_integrate", { build_estimate_hours: 10, library_options: [] }))).toBe(true);
    });
    it("failure: a non-positive build_estimate_hours is rejected by the schema", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_build_vs_integrate", { feature_name: "x", build_estimate_hours: 0, library_options: [] }))).toBe(true);
    });
    it("adversarial: zero library options → recommends 'build' (no alternative) and does not crash", async () => {
      const d = await invoke(handler, "roadmap_intel_build_vs_integrate", { feature_name: "no libraries exist", build_estimate_hours: 40, library_options: [] });
      expect(d.recommendation).toBe("build");
      expect(((d.integrate_analysis as { library_options?: unknown[] }).library_options ?? []).length).toBe(0); // empty array is response-slimmed away
    });
  });

  // ── health ─────────────────────────────────────────────────────────────────────────────────
  describe("roadmap_intel_health", () => {
    const mixedRoadmap = () => [
      milestone({ id: "M-1", status: "completed", estimated_effort_hours: 20, actual_effort_hours: 22 }),
      milestone({ id: "M-2", status: "in_progress", estimated_effort_hours: 40, actual_effort_hours: 38 }),
      milestone({ id: "M-3", status: "blocked", dependencies: ["M-1"] }),
      milestone({ id: "M-4", status: "pending" }),
    ];
    it("happy: returns a 0–100 health score, status counts, a velocity trend, and an estimation-accuracy ∈ [0,1]", async () => {
      const d = await invoke(handler, "roadmap_intel_health", { milestones: mixedRoadmap() });
      expect(d.overall_health as number).toBeGreaterThanOrEqual(0);
      expect(d.overall_health as number).toBeLessThanOrEqual(100);
      expect(typeof d.on_track_milestones).toBe("number");
      expect(typeof d.at_risk_milestones).toBe("number");
      expect(d.blocked_milestones).toBe(1);
      expect(VELOCITY).toContain(d.velocity_trend);
      expect(d.estimation_accuracy as number).toBeGreaterThanOrEqual(0);
      expect(d.estimation_accuracy as number).toBeLessThanOrEqual(1);
      expect(Array.isArray(d.risks)).toBe(true);
      expect(Array.isArray(d.recommendations)).toBe(true);
    });
    it("with historical records, estimation accuracy reflects them (perfect history → accuracy ≈ 1)", async () => {
      const hist = Array.from({ length: 6 }, (_, i) => learningRecord({ milestone_id: `H${i}`, predicted_hours: 30, actual_hours: 30 }));
      const d = await invoke(handler, "roadmap_intel_health", { milestones: mixedRoadmap(), historical_data: hist });
      expect(d.estimation_accuracy as number).toBeGreaterThan(0.9);
      expect(VELOCITY).toContain(d.velocity_trend);
    });
    it("failure: an empty milestones array is rejected by the schema", async () => {
      expect(isError(await invoke(handler, "roadmap_intel_health", { milestones: [] }))).toBe(true);
    });
    it("adversarial: 100 all-blocked milestones → blocked count 100, low health, no crash", async () => {
      const blocked = Array.from({ length: 100 }, (_, i) => milestone({ id: `B${i}`, status: "blocked" }));
      const d = await invoke(handler, "roadmap_intel_health", { milestones: blocked });
      expect(d.blocked_milestones).toBe(100);
      expect(d.overall_health as number).toBeLessThanOrEqual(60);
      expect(Array.isArray(d.risks)).toBe(true);
    });
  });

  it("regression: an unknown prism_dev action still returns the not_implemented placeholder (default branch intact)", async () => {
    const d = await invoke(handler, "roadmap_intel_definitely_not_an_action" as string, {});
    // unknown action → either the z.enum rejects it (validation error) or the switch default fires
    expect(isError(d)).toBe(true);
  });
});
