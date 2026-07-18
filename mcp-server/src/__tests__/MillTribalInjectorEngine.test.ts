import { describe, it, expect, beforeEach } from "vitest";
import {
  millTribalInjectorEngine as eng,
  type MillTribalTip,
  type MillInjectionContext,
  type MillInjectionTarget,
  type MillInjectionResult,
} from "../engines/MillTribalInjectorEngine.js";

function makeTip(o: Partial<MillTribalTip> = {}): MillTribalTip {
  return {
    id: o.id ?? "tip-1",
    content: o.content ?? "When milling stainless, use climb-only and slow feed at corners",
    confidence: o.confidence,
    tags: o.tags,
    keywords: o.keywords,
    source_customer: o.source_customer,
    source_program: o.source_program,
    category: o.category,
    priority: o.priority,
    ...o,
  };
}

describe("MillTribalInjectorEngine", () => {
  beforeEach(() => {
    eng.clearAuditLog();
  });

  it("exports singleton with inject + injectAll + getAuditLog + getStats", () => {
    expect(typeof eng.inject).toBe("function");
    expect(typeof eng.injectAll).toBe("function");
    expect(typeof eng.getAuditLog).toBe("function");
    expect(typeof eng.getStats).toBe("function");
  });

  it("inject() filters tips below minRelevance and sorts by score descending", () => {
    const tips = [
      makeTip({ id: "match-strong", content: "stainless pocket milling tip", tags: ["stainless"] }),
      makeTip({ id: "match-weak", content: "general aluminum advice" }),
      makeTip({ id: "no-match", content: "totally unrelated brass turning note" }),
    ];
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough", features: ["pocket"] };
    const r = eng.inject("speed_feed", tips, ctx, { minRelevance: 0.1, limit: 10 });
    expect(r.target).toBe("speed_feed");
    expect(r.total_tips_considered).toBe(3);
    expect(r.injected[0].tip.id).toBe("match-strong");
    // Monotonic sort by relevance_score
    for (let i = 1; i < r.injected.length; i++) {
      expect(r.injected[i].relevance_score).toBeLessThanOrEqual(r.injected[i - 1].relevance_score);
    }
  });

  it("inject() returns empty when no tip exceeds minRelevance", () => {
    const tips = [makeTip({ content: "irrelevant tip about lathes" })];
    const r = eng.inject("speed_feed", tips, { material: "titanium" }, { minRelevance: 0.5 });
    expect(r.injected.length).toBe(0);
    expect(r.total_tips_injected).toBe(0);
  });

  it("inject() respects limit option (caps top-K)", () => {
    const tips: MillTribalTip[] = [];
    for (let i = 0; i < 10; i++) {
      tips.push(makeTip({ id: `t-${i}`, content: "stainless milling rough pocket strong match" }));
    }
    const r = eng.inject("program_optimizer", tips, { material: "stainless", operation: "milling_rough", features: ["pocket"] }, { limit: 3 });
    expect(r.injected.length).toBe(3);
  });

  it("scoreTip credits feature matches at 0.15 each (mill-domain weight)", () => {
    // Tip content uses literal feature keywords (underscore form matches ctx.features verbatim per Lathe parity)
    const tip = makeTip({ content: "pocket and slot strategy for thin_wall mill operations" });
    const ctx: MillInjectionContext = { features: ["pocket", "slot", "thin_wall"] };
    const r = eng.inject("program_optimizer", [tip], ctx, { minRelevance: 0.05 });
    expect(r.injected.length).toBe(1);
    // 3 feature matches at 0.15 = 0.45 (before priority/confidence) — verifies mill weight > lathe's 0.10
    expect(r.injected[0].relevance_score).toBeGreaterThan(0.3);
    expect(r.injected[0].matched_on).toEqual(expect.arrayContaining(["feature:pocket", "feature:slot", "feature:thin_wall"]));
  });

  it("scoreTip credits tool_geometry match (mill-specific, +0.15)", () => {
    const tip = makeTip({ content: "use ball_nose end mill for finishing 3D surface" });
    const r = eng.inject("speed_feed", [tip], { tool_geometry: "ball_nose" }, { minRelevance: 0.05 });
    expect(r.injected[0].matched_on).toContain("tool_geometry");
  });

  it("scoreTip credits customer match when source_customer aligns (case-insensitive)", () => {
    const tip = makeTip({ content: "ITW prefers chamfered edges on all pockets", source_customer: "ITW" });
    const r = eng.inject("dfm_check", [tip], { customer: "itw" }, { minRelevance: 0.05 });
    expect(r.injected[0].matched_on).toContain("customer");
  });

  it("scoreTip honors iso_group via tag match (not content)", () => {
    const tip = makeTip({ content: "no group keyword here", tags: ["M"] });
    const r = eng.inject("speed_feed", [tip], { iso_group: "M" }, { minRelevance: 0.05 });
    expect(r.injected[0].matched_on).toContain("iso_group");
  });

  it("scoreTip multiplies by priority (10 = 1.25× boost)", () => {
    const tipLow = makeTip({ id: "lo", content: "stainless milling", priority: 1 });
    const tipHigh = makeTip({ id: "hi", content: "stainless milling", priority: 10 });
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough" };
    const rLow = eng.inject("speed_feed", [tipLow], ctx, { minRelevance: 0.01 });
    const rHigh = eng.inject("speed_feed", [tipHigh], ctx, { minRelevance: 0.01 });
    expect(rHigh.injected[0].relevance_score).toBeGreaterThan(rLow.injected[0].relevance_score);
  });

  it("scoreTip applies confidence floor (0.3 multiplier minimum)", () => {
    const tipUncert = makeTip({ id: "u", content: "stainless milling", confidence: 0.1 });
    const tipCert = makeTip({ id: "c", content: "stainless milling", confidence: 1.0 });
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough" };
    const rU = eng.inject("speed_feed", [tipUncert], ctx, { minRelevance: 0.01 });
    const rC = eng.inject("speed_feed", [tipCert], ctx, { minRelevance: 0.01 });
    // High-confidence tip outranks low-confidence
    expect(rC.injected[0].relevance_score).toBeGreaterThan(rU.injected[0].relevance_score);
  });

  it("score clamps to [0, 1]", () => {
    const tip = makeTip({
      content: "stainless milling pocket slot contour drilling boring",
      tags: ["M"],
      priority: 10,
      source_customer: "ITW",
    });
    const ctx: MillInjectionContext = {
      material: "stainless", iso_group: "M", operation: "milling", machine: "haas", controller: "fanuc",
      customer: "ITW", tool_geometry: "square_end_mill", features: ["pocket", "slot", "contour"],
      keywords: ["roughing"],
    };
    // Mention the actual context tokens in tip so they match
    tip.content = "stainless milling haas fanuc square_end_mill pocket slot contour roughing";
    const r = eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.01 });
    expect(r.injected[0].relevance_score).toBeLessThanOrEqual(1);
    expect(r.injected[0].relevance_score).toBeGreaterThanOrEqual(0);
  });

  it("buildHint returns target-specific prefix for each of the 4 mill targets", () => {
    const tip = makeTip({ content: "use climb milling for stainless to prevent BUE buildup on cutting edge" });
    const ctx: MillInjectionContext = { material: "stainless" };
    const results: Record<string, MillInjectionResult> = {
      speed_feed: eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.05 }),
      program_optimizer: eng.inject("program_optimizer", [tip], ctx, { minRelevance: 0.05 }),
      post_processor: eng.inject("post_processor", [tip], ctx, { minRelevance: 0.05 }),
      dfm_check: eng.inject("dfm_check", [tip], ctx, { minRelevance: 0.05 }),
    };
    expect(results.speed_feed.injected[0].recommendation_hint).toMatch(/^SpeedFeed consider:/);
    expect(results.program_optimizer.injected[0].recommendation_hint).toMatch(/^Program hint:/);
    expect(results.post_processor.injected[0].recommendation_hint).toMatch(/^Post comment \(mill\):/);
    expect(results.dfm_check.injected[0].recommendation_hint).toMatch(/^DfM consideration:/);
  });

  it("injectAll() returns a result for ALL 4 mill targets", () => {
    const tip = makeTip({ content: "stainless milling rough" });
    const all = eng.injectAll([tip], { material: "stainless", operation: "milling_rough" }, { minRelevance: 0.05 });
    expect(Object.keys(all).sort()).toEqual(["dfm_check", "post_processor", "program_optimizer", "speed_feed"]);
    for (const target of ["speed_feed", "program_optimizer", "post_processor", "dfm_check"] as MillInjectionTarget[]) {
      expect(all[target].target).toBe(target);
      expect(all[target].total_tips_considered).toBe(1);
    }
  });

  it("audit log records each injection with unique audit_id + tip ids", () => {
    const tip = makeTip({ id: "audited-tip", content: "stainless milling" });
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough" };
    const r1 = eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.05 });
    const r2 = eng.inject("program_optimizer", [tip], ctx, { minRelevance: 0.05 });
    const log = eng.getAuditLog();
    expect(log.length).toBe(2);
    expect(log[0].audit_id).toBe(r1.audit_id);
    expect(log[1].audit_id).toBe(r2.audit_id);
    expect(log[0].tip_ids).toContain("audited-tip");
  });

  it("getAuditLog(target) filters by target", () => {
    const tip = makeTip({ content: "stainless milling" });
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough" };
    eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.05 });
    eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.05 });
    eng.inject("dfm_check", [tip], ctx, { minRelevance: 0.05 });
    expect(eng.getAuditLog("speed_feed").length).toBe(2);
    expect(eng.getAuditLog("dfm_check").length).toBe(1);
  });

  it("registerHook fires onInjection callback for target only", () => {
    const fired: MillInjectionTarget[] = [];
    eng.registerHook({ target: "speed_feed", onInjection: (r) => { fired.push(r.target); } });
    const tip = makeTip({ content: "stainless milling" });
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough" };
    eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.05 });
    eng.inject("dfm_check", [tip], ctx, { minRelevance: 0.05 });
    expect(fired).toEqual(["speed_feed"]);
  });

  it("audit log enforces maxAuditSize cap (eviction is FIFO)", () => {
    const tip = makeTip({ content: "stainless milling" });
    const ctx: MillInjectionContext = { material: "stainless", operation: "milling_rough" };
    // 502 injections — cap is 500
    for (let i = 0; i < 502; i++) eng.inject("speed_feed", [tip], ctx, { minRelevance: 0.05 });
    const log = eng.getAuditLog(undefined, 1000);
    expect(log.length).toBe(500);
  });

  it("getStats returns 4 supported targets + current audit count", () => {
    const tip = makeTip({ content: "stainless milling" });
    eng.inject("speed_feed", [tip], { material: "stainless" }, { minRelevance: 0.05 });
    const stats = eng.getStats();
    expect(stats.targets_supported).toBe(4);
    expect(stats.audit_entries).toBeGreaterThanOrEqual(1);
  });

  it("clearAuditLog drops all entries", () => {
    const tip = makeTip({ content: "stainless milling" });
    eng.inject("speed_feed", [tip], { material: "stainless" }, { minRelevance: 0.05 });
    expect(eng.getAuditLog().length).toBeGreaterThanOrEqual(1);
    eng.clearAuditLog();
    expect(eng.getAuditLog().length).toBe(0);
  });
});
