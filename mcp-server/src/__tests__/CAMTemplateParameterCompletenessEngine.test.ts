/**
 * CAMTemplateParameterCompletenessEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-PARAM-COMPLETE
 */
import { describe, it, expect } from "vitest";
import { CAMTemplateParameterCompletenessEngine } from "../engines/CAMTemplateParameterCompletenessEngine.js";
import type { ParameterSpec, TemplateRecord } from "../engines/CAMTemplateParameterCompletenessEngine.js";

const engine = new CAMTemplateParameterCompletenessEngine();

const FACE_SCHEMA: ParameterSpec[] = [
  { id: "spindle_rpm", required: true, type: "number", default: 8000 },
  { id: "cutting_feed", required: true, type: "number", default: 1200 },
  { id: "plunge_feed", required: true, type: "number", default: 400 },
  { id: "tool", required: true, type: "string" }, // no default — must be supplied
  { id: "coolant", required: false, type: "enum", enum: ["off", "flood", "mist"], default: "flood" },
];

describe("CAMTemplateParameterCompletenessEngine", () => {

  it("complete template (all required present) → 100% completion, no default-fill", () => {
    const t: TemplateRecord = {
      id: "face__fusion360__face",
      op: "face",
      system: "fusion360",
      parameters: { spindle_rpm: 8000, cutting_feed: 1200, plunge_feed: 400, tool: "T1" },
    };
    const r = engine.check(t, FACE_SCHEMA);
    expect(r.completionPct).toBe(100);
    expect(r.presentRequired).toBe(4);
    expect(r.filledFromDefault).toBe(0);
    expect(r.missingRequired.length).toBe(0);
  });

  it("missing default-able parameter → filled from default, still 100%", () => {
    const t: TemplateRecord = {
      id: "face__hypermill__face_milling",
      op: "face",
      system: "hypermill",
      parameters: { tool: "T1" }, // spindle/feed/plunge missing
    };
    const r = engine.check(t, FACE_SCHEMA);
    expect(r.filledFromDefault).toBe(3);
    expect(r.filledParameters.spindle_rpm).toBe(8000);
    expect(r.filledParameters.cutting_feed).toBe(1200);
    expect(r.completionPct).toBe(100);
    expect(r.missingRequired.length).toBe(0);
  });

  it("missing required parameter WITHOUT default → reported as missing, completion <100%", () => {
    const t: TemplateRecord = {
      id: "face__mastercam__facing",
      op: "face",
      system: "mastercam",
      parameters: { spindle_rpm: 8000, cutting_feed: 1200, plunge_feed: 400 },
      // tool: missing AND has no default
    };
    const r = engine.check(t, FACE_SCHEMA);
    expect(r.missingRequired).toContain("tool");
    expect(r.completionPct).toBeCloseTo(75, 1); // 3 of 4 cleared
  });

  it("null-valued parameter counts as missing", () => {
    const t: TemplateRecord = {
      id: "test",
      op: "face",
      system: "fusion360",
      parameters: { spindle_rpm: null, cutting_feed: 1200, plunge_feed: 400, tool: "T1" },
    };
    const r = engine.check(t, FACE_SCHEMA);
    // spindle_rpm null → default-filled from 8000
    expect(r.filledFromDefault).toBeGreaterThan(0);
    expect(r.filledParameters.spindle_rpm).toBe(8000);
  });

  it("non-required params don't affect completion", () => {
    const t: TemplateRecord = {
      id: "test",
      op: "face",
      system: "fusion360",
      parameters: { spindle_rpm: 8000, cutting_feed: 1200, plunge_feed: 400, tool: "T1" },
      // coolant is non-required — absence doesn't reduce completion
    };
    const r = engine.check(t, FACE_SCHEMA);
    expect(r.completionPct).toBe(100);
  });

  it("empty schema → 100% completion (no required params to satisfy)", () => {
    const t: TemplateRecord = { id: "x", op: "trace", system: "fusion360", parameters: {} };
    const r = engine.check(t, []);
    expect(r.completionPct).toBe(100);
    expect(r.totalRequired).toBe(0);
  });

  it("corpus check: 2 templates, one complete one missing", () => {
    const templates: TemplateRecord[] = [
      { id: "a", op: "face", system: "fusion360", parameters: { spindle_rpm: 8000, cutting_feed: 1200, plunge_feed: 400, tool: "T1" } },
      { id: "b", op: "face", system: "mastercam", parameters: { spindle_rpm: 8000, cutting_feed: 1200, plunge_feed: 400 } },
    ];
    const r = engine.check_corpus(templates, () => FACE_SCHEMA);
    expect(r.totalTemplates).toBe(2);
    expect(r.completeTemplates).toBe(1);
    expect(r.failingSample.length).toBe(1);
    expect(r.failingSample[0].templateId).toBe("b");
  });

  it("corpus check: perSystem buckets aggregate correctly", () => {
    const templates: TemplateRecord[] = [
      { id: "a", op: "face", system: "fusion360", parameters: { tool: "T1" } }, // 75% via default-fill of 3
      { id: "b", op: "face", system: "fusion360", parameters: { tool: "T1" } }, // same
      { id: "c", op: "face", system: "mastercam", parameters: { tool: "T1", spindle_rpm: 8000, cutting_feed: 1200, plunge_feed: 400 } }, // 100%
    ];
    const r = engine.check_corpus(templates, () => FACE_SCHEMA);
    expect(r.perSystem.fusion360.templates).toBe(2);
    expect(r.perSystem.fusion360.completionPctAvg).toBe(100);
    expect(r.perSystem.mastercam.templates).toBe(1);
    expect(r.perSystem.mastercam.completionPctAvg).toBe(100);
  });

  it("schemaLookup callback can return per-(op,system) different schemas", () => {
    const SIMPLE_SCHEMA: ParameterSpec[] = [{ id: "a", required: true, default: 1 }];
    const STRICT_SCHEMA: ParameterSpec[] = [{ id: "x", required: true }, { id: "y", required: true, default: 2 }];
    const templates: TemplateRecord[] = [
      { id: "t1", op: "face", system: "fusion360", parameters: {} },
      { id: "t2", op: "drill_peck", system: "hypermill", parameters: {} },
    ];
    const r = engine.check_corpus(templates, (op, sys) => op === "face" ? SIMPLE_SCHEMA : STRICT_SCHEMA);
    // t1 completes via default; t2 fails (x has no default)
    expect(r.completeTemplates).toBe(1);
  });

  it("empty corpus → zero rollup", () => {
    const r = engine.check_corpus([], () => FACE_SCHEMA);
    expect(r.totalTemplates).toBe(0);
    expect(r.completeTemplates).toBe(0);
    expect(r.completionPctAvg).toBe(0);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes check + check_corpus", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("check");
    expect(names).toContain("check_corpus");
  });
});
