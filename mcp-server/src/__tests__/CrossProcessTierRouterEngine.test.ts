/**
 * CrossProcessTierRouterEngine — T12-01 tests.
 * Deterministic intent classification → tier routing.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessTierRouterEngine as Router,
  crossProcessTierRouter,
  type RouteInput,
} from "../engines/CrossProcessTierRouterEngine.js";

describe("route — intent classification", () => {
  it("routes 'predict SF for new material' to T1-02 + T7-02", () => {
    const r = Router.route({ query: "predict SF for new material" });
    expect(r.intent).toBe("predict");
    const tierIds = r.tiers.map((t) => t.tier_id);
    expect(tierIds).toContain("T1-02");
  });

  it("routes 'is this safe to run' to T8-03 (highest confidence)", () => {
    const r = Router.route({ query: "is this safe to run on the spindle" });
    expect(r.intent).toBe("safety_check");
    expect(r.tiers[0].tier_id).toBe("T8-03");
    expect(r.tiers[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("routes 'why did this fail' to T9-03 counterfactual", () => {
    const r = Router.route({ query: "why did this part fail inspection" });
    expect(r.intent).toBe("explain_failure");
    expect(r.tiers[0].tier_id).toBe("T9-03");
  });

  it("routes 'what if we changed feed rate' to T9-03 counterfactual", () => {
    const r = Router.route({ query: "what if we doubled the feed rate" });
    expect(r.intent).toBe("counterfactual");
    expect(r.tiers[0].tier_id).toBe("T9-03");
  });

  it("routes 'novel material' to T11-02 novelty", () => {
    const r = Router.route({ query: "is this material novel relative to history" });
    expect(r.intent).toBe("novelty_check");
    expect(r.tiers[0].tier_id).toBe("T11-02");
    expect(r.tiers[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("routes 'plan next experiments' to T11-04 DOE", () => {
    const r = Router.route({ query: "plan a budgeted DOE experiment set" });
    expect(r.intent).toBe("doe_plan");
    expect(r.tiers[0].tier_id).toBe("T11-04");
  });

  it("routes 'active learning batch' to T11-01 sampler", () => {
    const r = Router.route({ query: "active learning batch — which to run" });
    expect(r.intent).toBe("active_learning");
    expect(r.tiers[0].tier_id).toBe("T11-01");
  });

  it("routes 'causal effect of material' to T9-02 do-calculus", () => {
    const r = Router.route({ query: "what is the causal effect of material on tool life" });
    expect(r.intent).toBe("causal_effect");
    expect(r.tiers[0].tier_id).toBe("T9-02");
  });

  it("routes 'check kienzle constraint' to T8-01 enforcer", () => {
    const r = Router.route({ query: "check that the kienzle constraint holds" });
    expect(r.intent).toBe("constraint_check");
    expect(r.tiers[0].tier_id).toBe("T8-01");
  });

  it("flags T1-02 as unavailable when query needs prediction (T1 not yet built)", () => {
    const r = Router.route({ query: "predict speed and feed for inconel 718" });
    const t102 = r.tiers.find((t) => t.tier_id === "T1-02");
    expect(t102?.available).toBe(false);
    expect(r.unavailable_tiers).toContain("T1-02");
  });

  it("flags T11-04 as available (just shipped)", () => {
    const r = Router.route({ query: "plan a DOE experiment" });
    const t114 = r.tiers.find((t) => t.tier_id === "T11-04");
    expect(t114?.available).toBe(true);
  });

  it("respects max_tiers cap", () => {
    const r = Router.route({ query: "predict SF for new material", max_tiers: 2 });
    expect(r.tiers.length).toBeLessThanOrEqual(2);
  });

  it("falls back to context_hint when no matchers fire", () => {
    const r = Router.route({ query: "blah unintelligible asdfgh", context_hint: "safety" });
    expect(r.intent).toBe("safety_check");
    expect(r.tiers.length).toBeGreaterThan(0);
    expect(r.tiers[0].tier_id).toBe("T8-03");
  });

  it("returns empty tiers when no matchers fire AND hint is 'auto'", () => {
    const r = Router.route({ query: "qwerty random nonsense", context_hint: "auto" });
    expect(r.tiers).toEqual([]);
    expect(r.rationale).toMatch(/rephras/i);
  });

  it("tiers are ordered by descending confidence", () => {
    const r = Router.route({ query: "predict SF" });
    for (let i = 1; i < r.tiers.length; i++) {
      expect(r.tiers[i].confidence).toBeLessThanOrEqual(r.tiers[i - 1].confidence);
    }
  });

  it("rejects empty query (Zod min(1))", () => {
    expect(() => Router.route({ query: "" } as RouteInput)).toThrow();
  });

  it("rejects oversized query (Zod max(2000))", () => {
    expect(() => Router.route({ query: "x".repeat(2001) })).toThrow();
  });

  it("rejects max_tiers=0 (Zod min(1))", () => {
    expect(() => Router.route({ query: "predict SF", max_tiers: 0 })).toThrow();
  });

  it("rejects max_tiers>11 (Zod max(11))", () => {
    expect(() => Router.route({ query: "predict SF", max_tiers: 99 })).toThrow();
  });

  it("each routed tier has matching engine_id from canonical map", () => {
    const r = Router.route({ query: "is this safe" });
    for (const t of r.tiers) {
      expect(t.engine_id).toMatch(/^CrossProcess.*Engine$/);
      expect(t.engine_id.length).toBeGreaterThan(20);
    }
  });

  it("each routed tier has confidence in (0, 1]", () => {
    const r = Router.route({ query: "predict SF" });
    for (const t of r.tiers) {
      expect(t.confidence).toBeGreaterThan(0);
      expect(t.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("explain — audit trail", () => {
  it("returns intent + per-tier reason+available flags", () => {
    const r = Router.explain({ query: "is this safe" });
    expect(r.intent).toBe("safety_check");
    expect(r.explanations.length).toBeGreaterThanOrEqual(2);
    for (const e of r.explanations) {
      expect(e.reason.length).toBeGreaterThan(10);
      expect(typeof e.available).toBe("boolean");
    }
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T12-01", () => {
    expect(Router.engineId).toBe("CrossProcessTierRouterEngine");
    expect(Router.version).toBe("1.0.0");
    expect(Router.tier).toBe("T12-01");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_route_query returns RouteResult", () => {
    const r = crossProcessTierRouter("xproc_route_query", { query: "predict SF" }) as { intent: string; tiers: unknown[] };
    expect(r.intent).toBe("predict");
    expect(Array.isArray(r.tiers)).toBe(true);
    expect((r.tiers as Array<{ tier_id: string }>).length).toBeGreaterThan(0);
  });

  it("xproc_route_explain returns explanations array", () => {
    const r = crossProcessTierRouter("xproc_route_explain", { query: "is this safe" }) as { intent: string; explanations: unknown[] };
    expect(r.intent).toBe("safety_check");
    expect((r.explanations as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessTierRouter("unknown", {})).toThrow(/unknown action/i);
  });
});
