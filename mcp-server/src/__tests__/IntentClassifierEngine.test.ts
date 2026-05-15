// IntentClassifierEngine.test.ts — basic coverage for the natural-language
// intent classifier consumed today by kar-ms6-puoa-routes.test.ts and
// kar-ms7-unified-orchestrator.test.ts (PUOA tier routing). Production
// dispatcher wiring tracked as iter21 unit U-INTENT-WIRE.
import { describe, it, expect } from "vitest";
import { IntentClassifierEngine } from "../engines/IntentClassifierEngine.js";

const engine = new IntentClassifierEngine();

describe("IntentClassifierEngine", () => {
  it("classify('calculate cutting force for steel') returns category='calculate'", () => {
    const r = engine.classify("calculate cutting force for steel", null);
    expect(r.category).toBe("calculate");
    expect(r.normalized_intent).toBe("calculate cutting force for steel");
  });

  it("classify('optimize my cycle time for productivity') returns category='optimize'", () => {
    const r = engine.classify("optimize my cycle time for productivity", null);
    expect(r.category).toBe("optimize");
  });

  it("classify('what is kc1.1?') returns category='query'", () => {
    const r = engine.classify("what is kc1.1?", null);
    expect(r.category).toBe("query");
  });

  it("classify('validate my safety check') returns category='validate'", () => {
    const r = engine.classify("validate my safety check", null);
    expect(r.category).toBe("validate");
  });

  it("classify('generate g-code for my part') returns category='generate'", () => {
    const r = engine.classify("generate g-code for my part", null);
    expect(r.category).toBe("generate");
  });

  it("classify('troubleshoot my spindle alarm') returns category='troubleshoot'", () => {
    const r = engine.classify("troubleshoot my spindle alarm", null);
    expect(r.category).toBe("troubleshoot");
  });

  it("classify('compare carbide versus hss endmills') returns category='compare'", () => {
    const r = engine.classify("compare carbide versus hss endmills", null);
    expect(r.category).toBe("compare");
  });

  it("normalizeIntent strips punctuation + lowercases + collapses whitespace", () => {
    expect(engine.normalizeIntent("  Hello, World!  ")).toBe("hello world");
    expect(engine.normalizeIntent("CALCULATE\tTHE   force")).toBe("calculate the force");
  });

  it("quickClassify returns minimal routing shape with tier + primary_domain + complexity + category", () => {
    const r = engine.quickClassify("calculate force");
    expect(Object.keys(r).sort()).toEqual(["category", "complexity", "primary_domain", "tier"]);
    expect(r.category).toBe("calculate");
    expect(typeof r.tier).toBe("string");
    expect(typeof r.complexity).toBe("string");
  });

  it("detectCategoryWithScores reports scores per category + ambiguity detection", () => {
    const r = engine.detectCategoryWithScores("calculate the force");
    expect(r.category).toBe("calculate");
    expect(typeof r.scores).toBe("object");
    expect(r.scores.calculate).toBeGreaterThan(0);
    expect(r.scores.optimize).toBe(0);
    expect(typeof r.ambiguity).toBe("object");
    expect(typeof r.ambiguity.detected).toBe("boolean");
    expect(typeof r.ambiguity.gap).toBe("number");
  });

  it("extractEntities pulls material + machine + tool tokens out of a manufacturing intent", () => {
    const entities = engine.extractEntities("aluminum 6061 endmill on a haas vmc");
    expect(Array.isArray(entities)).toBe(true);
    expect(entities.length).toBeGreaterThan(0);
    const types = entities.map((e: any) => e.type);
    expect(types).toContain("material");
    expect(types).toContain("machine");
    expect(types).toContain("tool");
  });

  it("classify on unknown gibberish falls through to category='unknown' or low confidence", () => {
    const r = engine.classify("xyzzy plugh frobnitz", null);
    expect(["unknown", "query"]).toContain(r.category);
    expect(typeof r.confidence).toBe("number");
    expect(r.confidence).toBeLessThanOrEqual(1.0);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
  });
});
