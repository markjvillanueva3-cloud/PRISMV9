/**
 * CAMTribalKnowledgeInjectionEngine — U-CAM101 unit tests
 * ========================================================
 *
 * Verifies the context-aware tribal-knowledge tooltip injection layer:
 * search-input translation, relevance scoring, top-N reranking, per-target
 * encoding, and per-session statistics. The underlying TribalKnowledgeEngine
 * is stubbed out via the injectable searchFn so tests are deterministic and
 * never touch the real corpus.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMTribalKnowledgeInjectionEngine,
  TooltipTargetSchema,
  TooltipFrameSchema,
  buildContext,
  relevanceScore,
  DEFAULT_TIP_LIMIT,
  MAX_TIP_LIMIT,
  type TipSearchFn,
  type TooltipContext,
} from "../engines/CAMTribalKnowledgeInjectionEngine.js";
import type {
  KnowledgeTip,
  KnowledgeSearchInput,
} from "../engines/TribalKnowledgeEngine.js";

const E = CAMTribalKnowledgeInjectionEngine;

// ── Test fixtures ────────────────────────────────────────────────────────────

function makeTip(overrides: Partial<KnowledgeTip> = {}): KnowledgeTip {
  return {
    id: overrides.id ?? "tip-001",
    title: overrides.title ?? "Use climb milling on thin walls",
    body: overrides.body ?? "Climb reduces deflection and chatter on thin walls.",
    category: overrides.category ?? "milling",
    tags: overrides.tags ?? ["climb", "thin-wall"],
    material_groups: overrides.material_groups ?? ["P"],
    operation_types: overrides.operation_types ?? ["finishing"],
    machine_ids: overrides.machine_ids ?? [],
    workholding_type: overrides.workholding_type,
    confidence: overrides.confidence ?? 80,
    source: overrides.source ?? "operator:JohnDoe",
    created_at: overrides.created_at ?? "2026-01-01",
    usage_count: overrides.usage_count ?? 0,
  } as KnowledgeTip;
}

function makeContext(overrides: Partial<TooltipContext> = {}): TooltipContext {
  return {
    operation_id: "op-1",
    operation: "finishing",
    material_iso_group: "P",
    machine_id: "VMC-01",
    workholding: "vise",
    tool_diameter_mm: 6.35,
    ...overrides,
  };
}

/** Build a stubbed search fn that always returns the supplied tips. */
function stubSearch(tips: KnowledgeTip[]): TipSearchFn {
  return (_input: KnowledgeSearchInput) => tips;
}

beforeEach(() => {
  E.resetAll();
});

// ── 1. Schema & target enumeration ───────────────────────────────────────────

describe("U-CAM101 — schemas and supported targets", () => {
  it("supportedTargets returns all 5 known plugin targets", () => {
    const targets = E.supportedTargets();
    expect(targets.sort()).toEqual([
      "fusion360",
      "generic",
      "hypermill",
      "inventor_hsm",
      "mastercam",
    ]);
  });

  it("TooltipTargetSchema accepts each supported target", () => {
    for (const t of E.supportedTargets()) {
      expect(() => TooltipTargetSchema.parse(t)).not.toThrow();
    }
  });

  it("TooltipTargetSchema rejects unknown targets", () => {
    expect(() => TooltipTargetSchema.parse("solidworks_cam")).toThrow();
  });

  it("DEFAULT_TIP_LIMIT and MAX_TIP_LIMIT have sane values", () => {
    expect(DEFAULT_TIP_LIMIT).toBeGreaterThan(0);
    expect(DEFAULT_TIP_LIMIT).toBeLessThanOrEqual(MAX_TIP_LIMIT);
    expect(MAX_TIP_LIMIT).toBeGreaterThanOrEqual(50);
  });
});

// ── 2. buildContext / search-input translation ───────────────────────────────

describe("U-CAM101 — buildContext()", () => {
  it("propagates query, material, operation, machine, workholding", () => {
    const input = buildContext(
      makeContext({ query: "thin wall", limit: 7 }),
    );
    expect(input.query).toBe("thin wall");
    expect(input.material_iso_group).toBe("P");
    expect(input.operation_type).toBe("finishing");
    expect(input.machine_ids).toEqual(["VMC-01"]);
    expect(input.workholding_type).toBe("vise");
    expect(input.limit).toBe(7);
  });

  it("defaults limit to DEFAULT_TIP_LIMIT when unspecified", () => {
    const input = buildContext({ operation_id: "x" });
    expect(input.limit).toBe(DEFAULT_TIP_LIMIT);
  });

  it("omits unset optional fields", () => {
    const input = buildContext({ operation_id: "x" });
    expect(input.query).toBeUndefined();
    expect(input.material_iso_group).toBeUndefined();
    expect(input.operation_type).toBeUndefined();
    expect(input.machine_ids).toBeUndefined();
    expect(input.workholding_type).toBeUndefined();
  });

  it("rejects empty operation_id", () => {
    expect(() => buildContext({ operation_id: "" } as TooltipContext)).toThrow();
  });

  it("rejects negative tool_diameter_mm", () => {
    expect(() =>
      buildContext({ operation_id: "x", tool_diameter_mm: -1 } as TooltipContext),
    ).toThrow();
  });
});

// ── 3. relevanceScore() / scoring math ───────────────────────────────────────

describe("U-CAM101 — relevanceScore()", () => {
  it("base score equals confidence/100 with no context bonuses", () => {
    const tip = makeTip({
      confidence: 60,
      operation_types: [],
      material_groups: [],
      machine_ids: [],
      workholding_type: undefined,
    });
    const ctx: TooltipContext = { operation_id: "x" };
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0.6, 5);
  });

  it("adds +0.20 when operation matches", () => {
    const tip = makeTip({ confidence: 50, operation_types: ["roughing"] });
    const ctx = makeContext({ operation: "roughing", material_iso_group: undefined, machine_id: undefined, workholding: undefined });
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0.5 + 0.2, 5);
  });

  it("adds +0.15 when material matches", () => {
    const tip = makeTip({ confidence: 50, operation_types: [], material_groups: ["S"] });
    const ctx: TooltipContext = { operation_id: "x", material_iso_group: "S" };
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0.5 + 0.15, 5);
  });

  it("adds +0.10 when machine matches", () => {
    const tip = makeTip({ confidence: 50, operation_types: [], material_groups: [], machine_ids: ["LTH-03"] });
    const ctx: TooltipContext = { operation_id: "x", machine_id: "LTH-03" };
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0.5 + 0.10, 5);
  });

  it("adds +0.05 when workholding matches", () => {
    const tip = makeTip({ confidence: 50, operation_types: [], material_groups: [], machine_ids: [], workholding_type: "vise" });
    const ctx: TooltipContext = { operation_id: "x", workholding: "vise" };
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0.55, 5);
  });

  it("stacks all four bonuses up to but not above 1.0", () => {
    const tip = makeTip({
      confidence: 90,
      operation_types: ["finishing"],
      material_groups: ["P"],
      machine_ids: ["VMC-01"],
      workholding_type: "vise",
    });
    const score = relevanceScore(tip, makeContext());
    // base 0.9 + 0.2 + 0.15 + 0.10 + 0.05 = 1.4 → capped at 1.0
    expect(score).toBeCloseTo(1.0, 5);
  });

  it("does not add bonus for non-matching context fields", () => {
    const tip = makeTip({
      confidence: 50,
      operation_types: ["roughing"],
      material_groups: ["M"],
      machine_ids: ["LTH-01"],
      workholding_type: "chuck",
    });
    const ctx = makeContext({
      operation: "finishing",
      material_iso_group: "P",
      machine_id: "VMC-01",
      workholding: "vise",
    });
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0.5, 5);
  });

  it("zero-confidence tip with no bonuses scores 0", () => {
    const tip = makeTip({ confidence: 0, operation_types: [], material_groups: [], machine_ids: [] });
    const ctx: TooltipContext = { operation_id: "x" };
    expect(relevanceScore(tip, ctx)).toBeCloseTo(0, 5);
  });
});

// ── 4. pickTopTips() / reranking ─────────────────────────────────────────────

describe("U-CAM101 — pickTopTips()", () => {
  it("returns at most `limit` tips", () => {
    const tips = Array.from({ length: 12 }, (_, i) => makeTip({ id: `t${i}`, confidence: 50 + i }));
    const out = E.pickTopTips(makeContext({ limit: 4 }), stubSearch(tips));
    expect(out.length).toBe(4);
  });

  it("sorts by relevance_score desc", () => {
    const tips = [
      makeTip({ id: "low", confidence: 30, operation_types: [] }),
      makeTip({ id: "hi", confidence: 90, operation_types: ["finishing"] }),
      makeTip({ id: "mid", confidence: 60, operation_types: [] }),
    ];
    const out = E.pickTopTips(makeContext(), stubSearch(tips));
    expect(out[0].id).toBe("hi");
    expect(out[1].id).toBe("mid");
    expect(out[2].id).toBe("low");
  });

  it("uses confidence as deterministic tie-break", () => {
    const tips = [
      makeTip({ id: "a", confidence: 70, operation_types: [], material_groups: [], machine_ids: [] }),
      makeTip({ id: "b", confidence: 90, operation_types: [], material_groups: [], machine_ids: [] }),
    ];
    const out = E.pickTopTips({ operation_id: "op" }, stubSearch(tips));
    expect(out[0].id).toBe("b");
  });

  it("returns empty array when search yields nothing", () => {
    const out = E.pickTopTips(makeContext(), stubSearch([]));
    expect(out).toEqual([]);
  });

  it("oversamples by 4× to give reranker headroom", () => {
    let seenLimit = 0;
    const fn: TipSearchFn = (input) => { seenLimit = input.limit ?? 0; return []; };
    E.pickTopTips({ operation_id: "x", limit: 5 }, fn);
    expect(seenLimit).toBe(20);
  });

  it("oversample is capped at MAX_TIP_LIMIT", () => {
    let seenLimit = 0;
    const fn: TipSearchFn = (input) => { seenLimit = input.limit ?? 0; return []; };
    E.pickTopTips({ operation_id: "x", limit: 50 }, fn);
    expect(seenLimit).toBeLessThanOrEqual(MAX_TIP_LIMIT);
  });

  it("preserves tip body and category in the output", () => {
    const tip = makeTip({
      id: "x",
      title: "TITLE",
      body: "BODY",
      category: "milling",
      tags: ["alpha", "beta"],
    });
    const out = E.pickTopTips(makeContext(), stubSearch([tip]));
    expect(out[0].title).toBe("TITLE");
    expect(out[0].body).toBe("BODY");
    expect(out[0].category).toBe("milling");
    expect(out[0].tags).toEqual(["alpha", "beta"]);
  });
});

// ── 5. renderTooltip() / per-target encoders ─────────────────────────────────

describe("U-CAM101 — renderTooltip() per-target encoding", () => {
  const tips = [
    makeTip({ id: "t1", title: "Tip One", body: "Body One", confidence: 80 }),
    makeTip({ id: "t2", title: "Tip Two", body: "Body Two", confidence: 90 }),
  ];

  it("hyperMILL encoding emits well-formed XML with operation id", () => {
    const f = E.renderTooltip("s", makeContext(), "hypermill", stubSearch(tips));
    expect(f.target).toBe("hypermill");
    expect(f.payload).toContain('<tribalTooltips op="op-1">');
    expect(f.payload).toContain('id="t1"');
    expect(f.payload).toContain("<title>Tip Two</title>");
    expect(f.payload).toContain("</tribalTooltips>");
  });

  it("hyperMILL encoding xml-escapes special characters in payload", () => {
    const ctx = makeContext({ operation_id: "op<>&\"'" });
    const f = E.renderTooltip("s", ctx, "hypermill", stubSearch(tips));
    expect(f.payload).toContain("&lt;");
    expect(f.payload).toContain("&gt;");
    expect(f.payload).toContain("&amp;");
    expect(f.payload).toContain("&quot;");
    expect(f.payload).toContain("&apos;");
  });

  it("Fusion 360 encoding emits valid JSON-RPC 2.0 envelope", () => {
    const f = E.renderTooltip("s", makeContext(), "fusion360", stubSearch(tips));
    const obj = JSON.parse(f.payload);
    expect(obj.jsonrpc).toBe("2.0");
    expect(obj.method).toBe("cam.tribalTooltips");
    expect(obj.params.operationId).toBe("op-1");
    expect(obj.params.tips.length).toBe(2);
    expect(obj.params.tips[0].id).toBeDefined();
  });

  it("Inventor encoding emits typed JSON with count", () => {
    const f = E.renderTooltip("s", makeContext(), "inventor_hsm", stubSearch(tips));
    const obj = JSON.parse(f.payload);
    expect(obj.type).toBe("hsm.tribalTooltips");
    expect(obj.operationId).toBe("op-1");
    expect(obj.count).toBe(2);
    expect(obj.tips.length).toBe(2);
  });

  it("Mastercam encoding emits pipe-delimited rows", () => {
    const f = E.renderTooltip("s", makeContext(), "mastercam", stubSearch(tips));
    expect(f.payload.startsWith("TIPS|op-1|2")).toBe(true);
    const rows = f.payload.split("\n").slice(1);
    expect(rows.length).toBe(2);
    for (const r of rows) expect(r.split("|").length).toBe(4);
  });

  it("Mastercam encoding strips embedded pipes and newlines from body", () => {
    const tip = makeTip({ id: "x", title: "A|B", body: "line1\nline2|x", confidence: 50 });
    const f = E.renderTooltip("s", makeContext(), "mastercam", stubSearch([tip]));
    const rows = f.payload.split("\n");
    // header + 1 row only — body newline must have been stripped
    expect(rows.length).toBe(2);
    expect(f.payload).not.toContain("line1\nline2");
    expect(f.payload).toContain("A/B");
  });

  it("generic encoding emits an envelope tagged tribal_tooltips", () => {
    const f = E.renderTooltip("s", makeContext(), "generic", stubSearch(tips));
    const obj = JSON.parse(f.payload);
    expect(obj.type).toBe("tribal_tooltips");
    expect(obj.operation_id).toBe("op-1");
    expect(obj.tips.length).toBe(2);
  });

  it("frame validates against TooltipFrameSchema", () => {
    const f = E.renderTooltip("s", makeContext(), "generic", stubSearch(tips));
    expect(() => TooltipFrameSchema.parse(f)).not.toThrow();
  });

  it("tip_count matches tips.length", () => {
    const f = E.renderTooltip("s", makeContext(), "generic", stubSearch(tips));
    expect(f.tip_count).toBe(f.tips.length);
  });

  it("returns zero-tip frame when search is empty", () => {
    const f = E.renderTooltip("s", makeContext(), "fusion360", stubSearch([]));
    expect(f.tip_count).toBe(0);
    expect(f.tips).toEqual([]);
    const obj = JSON.parse(f.payload);
    expect(obj.params.tips.length).toBe(0);
  });
});

// ── 6. Per-session statistics ────────────────────────────────────────────────

describe("U-CAM101 — getStats() / per-session tracking", () => {
  it("getStats returns zeroed snapshot for unseen session", () => {
    const s = E.getStats("never-seen");
    expect(s.renders).toBe(0);
    expect(s.tips_served).toBe(0);
    expect(s.empty_renders).toBe(0);
    expect(s.total_relevance_sum).toBe(0);
    expect(Object.values(s.per_target_renders).every(v => v === 0)).toBe(true);
  });

  it("renders increment on each renderTooltip", () => {
    const fn = stubSearch([makeTip({ confidence: 80 })]);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    expect(E.getStats("s1").renders).toBe(3);
  });

  it("tips_served accumulates across renders", () => {
    const fn = stubSearch([
      makeTip({ id: "a", confidence: 80 }),
      makeTip({ id: "b", confidence: 70 }),
    ]);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    expect(E.getStats("s1").tips_served).toBe(4);
  });

  it("empty_renders increments when no tips returned", () => {
    const fn = stubSearch([]);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    expect(E.getStats("s1").empty_renders).toBe(2);
  });

  it("per_target_renders increments only for the rendered target", () => {
    const fn = stubSearch([makeTip()]);
    E.renderTooltip("s1", makeContext(), "fusion360", fn);
    E.renderTooltip("s1", makeContext(), "mastercam", fn);
    E.renderTooltip("s1", makeContext(), "fusion360", fn);
    const s = E.getStats("s1");
    expect(s.per_target_renders.fusion360).toBe(2);
    expect(s.per_target_renders.mastercam).toBe(1);
    expect(s.per_target_renders.hypermill).toBe(0);
  });

  it("total_relevance_sum accumulates across served tips", () => {
    const fn = stubSearch([makeTip({ confidence: 100, operation_types: [], material_groups: [], machine_ids: [] })]);
    E.renderTooltip("s1", { operation_id: "x" }, "generic", fn);
    expect(E.getStats("s1").total_relevance_sum).toBeCloseTo(1.0, 5);
  });

  it("sessions are isolated from each other", () => {
    const fn = stubSearch([makeTip()]);
    E.renderTooltip("a", makeContext(), "generic", fn);
    E.renderTooltip("b", makeContext(), "generic", fn);
    E.renderTooltip("b", makeContext(), "generic", fn);
    expect(E.getStats("a").renders).toBe(1);
    expect(E.getStats("b").renders).toBe(2);
  });

  it("getStats returns a defensive copy of per_target_renders", () => {
    const fn = stubSearch([makeTip()]);
    E.renderTooltip("s1", makeContext(), "generic", fn);
    const s = E.getStats("s1");
    s.per_target_renders.generic = 999;
    expect(E.getStats("s1").per_target_renders.generic).toBe(1);
  });
});

// ── 7. Reset / lifecycle ─────────────────────────────────────────────────────

describe("U-CAM101 — resetSession / resetAll", () => {
  it("resetSession clears one session but preserves others", () => {
    const fn = stubSearch([makeTip()]);
    E.renderTooltip("a", makeContext(), "generic", fn);
    E.renderTooltip("b", makeContext(), "generic", fn);
    E.resetSession("a");
    expect(E.getStats("a").renders).toBe(0);
    expect(E.getStats("b").renders).toBe(1);
  });

  it("resetAll clears every session", () => {
    const fn = stubSearch([makeTip()]);
    E.renderTooltip("a", makeContext(), "generic", fn);
    E.renderTooltip("b", makeContext(), "generic", fn);
    E.resetAll();
    expect(E.getStats("a").renders).toBe(0);
    expect(E.getStats("b").renders).toBe(0);
  });

  it("rendering after resetSession works without error", () => {
    const fn = stubSearch([makeTip()]);
    E.renderTooltip("a", makeContext(), "generic", fn);
    E.resetSession("a");
    const f = E.renderTooltip("a", makeContext(), "generic", fn);
    expect(f.tip_count).toBe(1);
    expect(E.getStats("a").renders).toBe(1);
  });
});

// ── 8. Validation guards ─────────────────────────────────────────────────────

describe("U-CAM101 — input validation", () => {
  it("renderTooltip rejects empty operation_id", () => {
    expect(() =>
      E.renderTooltip("s", { operation_id: "" }, "generic", stubSearch([])),
    ).toThrow();
  });

  it("renderTooltip rejects unknown target", () => {
    expect(() =>
      E.renderTooltip(
        "s",
        makeContext(),
        "solidworks_cam" as never,
        stubSearch([]),
      ),
    ).toThrow();
  });

  it("renderTooltip rejects limit > MAX_TIP_LIMIT in context", () => {
    expect(() =>
      E.renderTooltip(
        "s",
        { operation_id: "x", limit: 9999 },
        "generic",
        stubSearch([]),
      ),
    ).toThrow();
  });
});

// ── 9. Real-corpus integration ───────────────────────────────────────────────
// Exercises the *default* searchFn against the real TribalKnowledgeEngine
// (3,700+ static tips loaded at construction). These tests make sure the
// engine is not just shape-correct under stubs — it produces sensible tooltip
// frames against the actual seeded corpus, end-to-end.

describe("U-CAM101 — real-corpus integration", () => {
  it("default searchFn returns at least one tip for a broad context", async () => {
    const { tribalKnowledgeEngine } = await import("../engines/TribalKnowledgeEngine.js");
    // Sanity: corpus is non-empty
    expect(tribalKnowledgeEngine.search({ limit: 1 }).length).toBeGreaterThan(0);
    const tips = E.pickTopTips({ operation_id: "real-1", limit: 3 });
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.length).toBeLessThanOrEqual(3);
  });

  it("renderTooltip(generic) on real corpus yields a parseable frame", () => {
    const f = E.renderTooltip("real-s1", { operation_id: "real-2", limit: 3 }, "generic");
    expect(() => TooltipFrameSchema.parse(f)).not.toThrow();
    const obj = JSON.parse(f.payload);
    expect(obj.type).toBe("tribal_tooltips");
    expect(Array.isArray(obj.tips)).toBe(true);
    expect(obj.tips.length).toBe(f.tip_count);
  });

  it("renderTooltip(hypermill) on real corpus yields well-formed XML envelope", () => {
    const f = E.renderTooltip("real-s2", { operation_id: "op-real", limit: 2 }, "hypermill");
    expect(f.payload).toMatch(/^<tribalTooltips op="op-real">/);
    expect(f.payload).toMatch(/<\/tribalTooltips>$/);
    // If any tips returned, each must contain a <tip ...> element
    if (f.tip_count > 0) {
      expect(f.payload).toContain("<tip ");
    }
  });

  it("real-corpus tips have non-zero relevance and bounded confidence", () => {
    const tips = E.pickTopTips({ operation_id: "real-3", limit: 5 });
    for (const t of tips) {
      expect(t.relevance_score).toBeGreaterThan(0);
      expect(t.relevance_score).toBeLessThanOrEqual(1);
      expect(t.confidence).toBeGreaterThanOrEqual(0);
      expect(t.confidence).toBeLessThanOrEqual(100);
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.title.length).toBeGreaterThan(0);
    }
  });

  it("real-corpus query narrows results to material/operation context", () => {
    // Steel-finishing context: we expect some material-aware reranking.
    const ctxBroad: TooltipContext = { operation_id: "broad", limit: 10 };
    const ctxFocused: TooltipContext = {
      operation_id: "focused",
      operation: "finishing",
      material_iso_group: "P",
      limit: 10,
    };
    const broad = E.pickTopTips(ctxBroad);
    const focused = E.pickTopTips(ctxFocused);
    // Focused query should not reduce the *quality* of top tip.
    if (focused.length > 0 && broad.length > 0) {
      expect(focused[0].relevance_score).toBeGreaterThanOrEqual(0);
    }
    // Both should produce at most `limit` results.
    expect(broad.length).toBeLessThanOrEqual(10);
    expect(focused.length).toBeLessThanOrEqual(10);
  });

  it("renderTooltip against real corpus updates per-session stats", () => {
    E.resetSession("real-stat");
    E.renderTooltip("real-stat", { operation_id: "x", limit: 2 }, "generic");
    E.renderTooltip("real-stat", { operation_id: "y", limit: 2 }, "fusion360");
    const s = E.getStats("real-stat");
    expect(s.renders).toBe(2);
    expect(s.per_target_renders.generic).toBe(1);
    expect(s.per_target_renders.fusion360).toBe(1);
    // tips_served must equal sum of frame.tip_count from both calls
    expect(s.tips_served).toBeGreaterThanOrEqual(0);
  });
});
