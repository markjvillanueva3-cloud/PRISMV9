/**
 * Tests for CADTribalDrawInjectionEngine (U-CADDRAW-TRIBAL-INJECT) -- per-feature tribal feed.
 *
 * Coverage: context-relevance (step-emit surfaces inch-units/periodic-bspline/lint; electrode
 * surfaces spark-gap/archetype/periodic-bspline) + universal-tip default + featureType + query +
 * limit + empty + ordering + LIVE-DATA (reads the real seeded cad-draw-tribal-tips.jsonl) +
 * dispatcher round-trip. Real reference tips, not stubs.
 */

import { describe, it, expect } from "vitest";
import {
  cadTribalDrawInjectionEngine as engine,
  type CADTribalTip,
} from "../engines/CADTribalDrawInjectionEngine.js";
import { CAD_DRAW_TRIBAL_TIPS } from "../data/cadDrawTribalTips.js";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

// The 6 canonical CAD drawing lessons (mirror of state/shared/cad-draw-tribal-tips.jsonl).
const CORPUS: CADTribalTip[] = [
  { id: "delta-tribal-001", slug: "step-periodic-bspline-blank-doc", kind: "failure-mode", consume: "cad-step emit / electrode generation", tip: "NEVER emit a closed-periodic B_SPLINE ... Fusion opens a BLANK document. Lint W3." },
  { id: "delta-tribal-002", slug: "step-inch-unit-drift", kind: "failure-mode", consume: "cad-step emit", tip: "STEP defaults to mm; JM is INCH. Set CONVERSION_BASED_UNIT('INCH'). Lint W1." },
  { id: "delta-tribal-003", slug: "archetype-match-before-scale", kind: "failure-mode", consume: "cad-replicate-from-template / electrode gen", tip: "Match the archetype FIRST, then generate parametrically." },
  { id: "delta-tribal-004", slug: "topology-before-tolerance", kind: "doctrine", consume: "all cad mutation", tip: "Topology before tolerance; never inline ISO 286; never drop PMI." },
  { id: "delta-tribal-005", slug: "sinker-edm-spark-gap", kind: "convention", consume: "electrode generation / cad->cam(kilo)", tip: "Electrode spark gap = -.003in total; undersize the electrode." },
  { id: "delta-tribal-006", slug: "lint-step-before-ship", kind: "process", consume: "cad-step emit / VERIFY gate", tip: "Run cad-step-lint on a generated .step before ship." },
];

describe("CADTribalDrawInjectionEngine.recommend", () => {
  it("a STEP-emit context surfaces the inch-units + periodic-bspline + lint lessons (not spark-gap/archetype)", () => {
    const r = engine.recommend({ operation: "step-emit" }, CORPUS);
    const slugs = r.applied.map((t) => t.slug);
    expect(slugs).toContain("step-inch-unit-drift");
    expect(slugs).toContain("step-periodic-bspline-blank-doc");
    expect(slugs).toContain("lint-step-before-ship");
    expect(slugs).not.toContain("sinker-edm-spark-gap");
    expect(slugs).not.toContain("archetype-match-before-scale");
    // the two failure-mode STEP tips outrank the process lint tip
    expect(r.applied[0].relevanceScore).toBeGreaterThanOrEqual(r.applied[r.applied.length - 1].relevanceScore);
  });

  it("an electrode context surfaces spark-gap + archetype-match + periodic-bspline", () => {
    const r = engine.recommend({ operation: "electrode", featureType: "electrode" }, CORPUS);
    const slugs = r.applied.map((t) => t.slug);
    expect(slugs).toContain("sinker-edm-spark-gap");
    expect(slugs).toContain("archetype-match-before-scale");
    expect(slugs).toContain("step-periodic-bspline-blank-doc");
  });

  it("an empty context surfaces ONLY the universal 'all cad mutation' lesson", () => {
    const r = engine.recommend({}, CORPUS);
    expect(r.applied.map((t) => t.slug)).toEqual(["topology-before-tolerance"]);
  });

  it("a query token matches the lesson text", () => {
    const r = engine.recommend({ query: "bspline" }, CORPUS);
    expect(r.applied.map((t) => t.slug)).toContain("step-periodic-bspline-blank-doc");
  });

  it("respects the limit", () => {
    const r = engine.recommend({ operation: "step-emit", limit: 1 }, CORPUS);
    expect(r.applied).toHaveLength(1);
  });

  it("limit 0 injects nothing", () => {
    const r = engine.recommend({ operation: "step-emit", limit: 0 }, CORPUS);
    expect(r.applied).toHaveLength(0);
    expect(r.injectedCount).toBe(0);
  });

  it("an empty corpus injects nothing", () => {
    const r = engine.recommend({ operation: "step-emit" }, []);
    expect(r.considered).toBe(0);
    expect(r.applied).toHaveLength(0);
  });

  it("never injects an off-context tip on the kind boost alone", () => {
    // operation that matches nothing in any consume field, no universal -> only the universal tip
    const r = engine.recommend({ operation: "xyzzy-nonsense" }, CORPUS);
    expect(r.applied.map((t) => t.slug)).toEqual(["topology-before-tolerance"]);
  });

  it("stopword-only overlap does NOT match: a plain plate query no longer injects the electrode spark-gap tip (U-DELTA-CADGEN-SPARKGAP-P2)", () => {
    // Root fix: "...inch BY...inch...plate" matched sinker-edm-spark-gap ONLY via the stopword "by" in
    // the tip text -> the electrode undersize was injected onto a plain plate, undersizing ~16% of GEN
    // parts. The stopword filter removes "by" so the spurious overlap is gone (fails pre-fix).
    const plate = engine.recommend(
      { operation: "generate", featureType: "part", query: "a 2.0 inch by 1.0 inch by 0.5 inch rectangular plate" },
      CAD_DRAW_TRIBAL_TIPS,
    );
    expect(plate.applied.map((t) => t.slug)).not.toContain("sinker-edm-spark-gap");
    // an EXPLICIT electrode query still matches it (a content token, not a stopword)
    const elec = engine.recommend({ operation: "generate", query: "a sinker-EDM electrode plate" }, CAD_DRAW_TRIBAL_TIPS);
    expect(elec.applied.map((t) => t.slug)).toContain("sinker-edm-spark-gap");
  });

  it("CATALOG: ranks the tracked CAD_DRAW_TRIBAL_TIPS catalog for a step-emit context", () => {
    expect(CAD_DRAW_TRIBAL_TIPS.length).toBe(6);
    const r = engine.recommend({ operation: "step-emit" }, CAD_DRAW_TRIBAL_TIPS);
    expect(r.applied.map((t) => t.slug)).toContain("step-inch-unit-drift");
  });
});

describe("cadDispatcher round-trip (cad_tribal_draw_query)", () => {
  function callCad(action: string, params: Record<string, unknown>) {
    let handler: ((a: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>) | undefined;
    const server = { tool: (_n: string, _d: string, _s: unknown, h: any) => { handler = h; } };
    registerCadDispatcher(server as any);
    if (!handler) throw new Error("prism_cad handler was not registered");
    return handler({ action, params }).then((res) => JSON.parse(res.content[0].text));
  }

  it("round-trips an electrode query through prism_cad with an inline corpus", async () => {
    const r = await callCad("cad_tribal_draw_query", {
      operation: "electrode",
      featureType: "electrode",
      corpus: CORPUS,
    });
    expect(r.applied.map((t: CADTribalTip) => t.slug)).toContain("sinker-edm-spark-gap");
  });

  it("round-trips with the DEFAULT tracked catalog (no inline corpus) -- proves the wired default loads", async () => {
    const r = await callCad("cad_tribal_draw_query", { operation: "step-emit" });
    expect(r.considered).toBe(6);
    expect(r.applied.map((t: CADTribalTip) => t.slug)).toContain("step-inch-unit-drift");
  });
});
