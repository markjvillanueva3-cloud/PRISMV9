/**
 * CADReverseTemplateEngine — vitest suite (CAD-REVERSE-ENGINEER-MS0/U1).
 *
 * Closed-form assertions on feature-tree → template reverse-engineering:
 * category rule ordering, deterministic naming, param extraction,
 * round-trip losslessness (opTemplate deep-equals input), R12 fail-loud,
 * adversarial inputs (NaN/Infinity args, malformed ops, empty).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADReverseTemplateEngine,
  cadReverseTemplateEngine,
} from "../engines/CADReverseTemplateEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

const op = (kind: string, args: Record<string, unknown> = {}): CADOperation =>
  ({ kind, args } as CADOperation);

describe("CADReverseTemplateEngine — U1", () => {
  let eng: CADReverseTemplateEngine;
  beforeEach(() => {
    eng = new CADReverseTemplateEngine();
  });

  // ── R12 fail-loud ─────────────────────────────────────────────────────────

  it("R12 fail-loud: non-array input throws TypeError", () => {
    expect(() => eng.reverseEngineer(null as never)).toThrow(TypeError);
    expect(() => eng.reverseEngineer("nope" as never)).toThrow(TypeError);
    expect(() => eng.reverseEngineer({} as never)).toThrow(TypeError);
    expect(() => eng.categorizeOnly(null as never)).toThrow(TypeError);
  });

  // ── Empty / degenerate ────────────────────────────────────────────────────

  it("empty op list → category 'empty', confidence 0, zero params", () => {
    const t = eng.reverseEngineer([]);
    expect(t.category).toBe("empty");
    expect(t.confidence).toBe(0);
    expect(t.params).toHaveLength(0);
    expect(t.opTemplate).toHaveLength(0);
    expect(t.name).toBe("empty_0mm_0op_0000");
  });

  // ── Category rule ordering (most-specific first) ──────────────────────────

  it("revolve present → turned_part (highest-priority rule)", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"), op("feature_revolve", { angle: 360 }),
    ]);
    expect(t.category).toBe("turned_part");
  });

  it("shell present → housing (beats extrude/hole)", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"), op("feature_extrude", { distance: 40 }),
      op("feature_hole", { diameter: 6 }), op("feature_shell", { thickness: 2 }),
    ]);
    expect(t.category).toBe("housing");
  });

  it("pattern_circular + hole → flange", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"), op("feature_extrude", { distance: 12 }),
      op("feature_hole", { diameter: 8 }),
      op("feature_pattern_circular", { count: 6 }),
    ]);
    expect(t.category).toBe("flange");
  });

  it("pattern_linear + hole → bracket", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"), op("feature_extrude", { distance: 10 }),
      op("feature_hole", { diameter: 5 }),
      op("feature_pattern_linear", { count: 4 }),
    ]);
    expect(t.category).toBe("bracket");
  });

  it("hole alone (no pattern) → drilled_block", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"), op("feature_extrude", { distance: 25 }),
      op("feature_hole", { diameter: 10 }),
    ]);
    expect(t.category).toBe("drilled_block");
  });

  it("boolean op (no hole/shell/revolve) → assembly_body", () => {
    const t = eng.reverseEngineer([
      op("feature_extrude", { distance: 10 }),
      op("boolean_subtract", {}),
    ]);
    expect(t.category).toBe("assembly_body");
  });

  it("extrude only → extruded_profile", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"), op("feature_extrude", { distance: 30 }),
    ]);
    expect(t.category).toBe("extruded_profile");
  });

  it("sketch-only part → prismatic_part fallback, confidence floored at 0.3", () => {
    const t = eng.reverseEngineer([op("sketch_create"), op("sketch_circle", { radius: 5 })]);
    expect(t.category).toBe("prismatic_part");
    expect(t.confidence).toBe(0.3);
  });

  // ── Confidence math ───────────────────────────────────────────────────────

  it("confidence = signalOps/total, clamped to [0.3, 1.0]", () => {
    // 1 revolve op in a 4-op part → 1/4 = 0.25 → floored to 0.3
    const lowSignal = eng.reverseEngineer([
      op("sketch_create"), op("sketch_circle"), op("sketch_line"),
      op("feature_revolve", { angle: 360 }),
    ]);
    expect(lowSignal.confidence).toBe(0.3);
    // all-revolve 2-op part → 2/2 = 1.0
    const highSignal = eng.reverseEngineer([
      op("feature_revolve", { angle: 180 }), op("feature_revolve", { angle: 360 }),
    ]);
    expect(highSignal.confidence).toBe(1);
  });

  // ── Param extraction ──────────────────────────────────────────────────────

  it("extractParams emits one named param per finite numeric arg", () => {
    const t = eng.reverseEngineer([
      op("feature_extrude", { distance: 20, operation: "new_body" }),
      op("feature_fillet", { radius: 2 }),
    ]);
    expect(t.params).toHaveLength(2); // distance, radius — "operation" is a string
    const byName: Record<string, number> = {};
    for (const p of t.params) byName[p.name] = p.value;
    expect(byName["distance_op0"]).toBe(20);
    expect(byName["radius_op1"]).toBe(2);
  });

  it("param names encode opIndex; opIndex + argKey fields are correct", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"),
      op("feature_extrude", { distance: 15 }),
    ]);
    expect(t.params).toHaveLength(1);
    expect(t.params[0].name).toBe("distance_op1");
    expect(t.params[0].opIndex).toBe(1);
    expect(t.params[0].argKey).toBe("distance");
    expect(t.params[0].value).toBe(15);
  });

  it("adversarial: NaN / Infinity / -Infinity args are excluded from params", () => {
    const t = eng.reverseEngineer([
      op("feature_extrude", {
        distance: Number.NaN,
        depth: Number.POSITIVE_INFINITY,
        radius: Number.NEGATIVE_INFINITY,
        height: 12,
      }),
    ]);
    expect(t.params).toHaveLength(1);
    expect(t.params[0].argKey).toBe("height");
    expect(t.params[0].value).toBe(12);
  });

  it("op with no args object → contributes zero params, no crash", () => {
    const t = eng.reverseEngineer([{ kind: "feature_extrude" } as CADOperation]);
    expect(t.params).toHaveLength(0);
    expect(t.category).toBe("extruded_profile");
  });

  it("legacy 'params' alias is read when 'args' is absent (older CAD generators)", () => {
    // ICADCodeGenerator declares both args + params; a legacy feature tree
    // may carry numerics on `params` instead of `args`.
    const legacyOp = { kind: "feature_extrude", params: { distance: 35 } } as unknown as CADOperation;
    const t = eng.reverseEngineer([legacyOp]);
    expect(t.params).toHaveLength(1);
    expect(t.params[0].argKey).toBe("distance");
    expect(t.params[0].value).toBe(35);
    expect(t.name).toMatch(/^extruded_profile_35mm_1op_[0-9a-f]{4}$/);
  });

  it("caller mutating returned opTemplate does NOT corrupt the input array", () => {
    const input = [op("feature_extrude", { distance: 20 })];
    const t = eng.reverseEngineer(input);
    // Mutate the returned op-level field.
    t.opTemplate[0].kind = "feature_revolve";
    // Input op is untouched — opTemplate holds shallow clones.
    expect(input[0].kind).toBe("feature_extrude");
  });

  // ── Round-trip losslessness (the redraw proof) ────────────────────────────

  it("round-trip: opTemplate deep-equals the valid input ops (lossless redraw)", () => {
    const input = [
      op("sketch_create", { plane: "XY" }),
      op("feature_extrude", { distance: 50 }),
      op("feature_hole", { diameter: 8, x: 10, y: 10 }),
      op("feature_pattern_circular", { count: 6 }),
      op("export_step", { path: "/out/flange.step" }),
    ];
    const t = eng.reverseEngineer(input);
    // opTemplate is exactly the input — feeding it to cad_draw_any_part redraws the part.
    expect(t.opTemplate).toEqual(input);
    expect(t.opTemplate).toHaveLength(5);
    expect(t.opTemplate[4].kind).toBe("export_step");
  });

  it("malformed ops (missing kind / non-object) dropped from opTemplate, counted in skippedOps", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"),
      null as never,
      { args: { x: 1 } } as never, // no kind
      op("feature_extrude", { distance: 10 }),
      "garbage" as never,
    ]);
    expect(t.opTemplate).toHaveLength(2);
    expect(t.skippedOps).toBe(3);
    expect(t.opTemplate[0].kind).toBe("sketch_create");
    expect(t.opTemplate[1].kind).toBe("feature_extrude");
  });

  // ── Deterministic naming ──────────────────────────────────────────────────

  it("name format: <category>_<dim>mm_<n>op_<hash4>; dim = max dimension arg", () => {
    const t = eng.reverseEngineer([
      op("sketch_create"),
      op("feature_extrude", { distance: 50 }),
      op("feature_hole", { diameter: 80, depth: 12 }),
    ]);
    // max dimension arg = 80 (diameter), 3 ops, category drilled_block
    expect(t.name).toMatch(/^drilled_block_80mm_3op_[0-9a-f]{4}$/);
  });

  it("naming is deterministic — same ops → same name across instances", () => {
    const ops = [
      op("sketch_create"), op("feature_revolve", { angle: 360, radius: 25 }),
    ];
    const a = new CADReverseTemplateEngine().reverseEngineer(ops);
    const b = new CADReverseTemplateEngine().reverseEngineer(ops);
    expect(a.name).toBe(b.name);
  });

  it("different op sequences with same dim+count+category get distinct hash suffixes", () => {
    const seqA = eng.reverseEngineer([
      op("sketch_create"), op("feature_extrude", { distance: 20 }),
    ]);
    const seqB = eng.reverseEngineer([
      op("sketch_circle"), op("feature_extrude", { distance: 20 }),
    ]);
    // same category (extruded_profile), same dim (20), same count (2) — only hash differs
    expect(seqA.name).not.toBe(seqB.name);
    expect(seqA.name.startsWith("extruded_profile_20mm_2op_")).toBe(true);
    expect(seqB.name.startsWith("extruded_profile_20mm_2op_")).toBe(true);
  });

  // ── Histogram ─────────────────────────────────────────────────────────────

  it("opKindHistogram counts each kind exactly", () => {
    const t = eng.reverseEngineer([
      op("feature_hole"), op("feature_hole"), op("feature_hole"),
      op("sketch_create"),
    ]);
    expect(t.opKindHistogram["feature_hole"]).toBe(3);
    expect(t.opKindHistogram["sketch_create"]).toBe(1);
  });

  // ── categorizeOnly fast path ──────────────────────────────────────────────

  it("categorizeOnly returns the same category as full reverseEngineer", () => {
    const ops = [op("sketch_create"), op("feature_shell", { thickness: 2 })];
    const full = eng.reverseEngineer(ops);
    const fast = eng.categorizeOnly(ops);
    expect(fast.category).toBe(full.category);
    expect(fast.confidence).toBe(full.confidence);
    expect(fast.category).toBe("housing");
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  it("getStats tracks runs, params, and per-category counts", () => {
    eng.reverseEngineer([op("feature_revolve", { angle: 360 })]);
    eng.reverseEngineer([op("feature_revolve", { angle: 180 })]);
    eng.reverseEngineer([op("feature_extrude", { distance: 10 })]);
    const s = eng.getStats();
    expect(s.totalReverseEngineered).toBe(3);
    expect(s.totalParamsExtracted).toBe(3); // angle + angle + distance
    expect(s.categoryCounts["turned_part"]).toBe(2);
    expect(s.categoryCounts["extruded_profile"]).toBe(1);
  });

  it("_resetForTests zeroes all counters", () => {
    eng.reverseEngineer([op("feature_extrude", { distance: 5 })]);
    eng._resetForTests();
    const s = eng.getStats();
    expect(s.totalReverseEngineered).toBe(0);
    expect(s.totalParamsExtracted).toBe(0);
    expect(Object.keys(s.categoryCounts).length).toBe(0);
  });

  // ── Static helpers ────────────────────────────────────────────────────────

  it("static getCategoryVocabulary returns all 9 categories", () => {
    const vocab = CADReverseTemplateEngine.getCategoryVocabulary();
    expect(vocab).toHaveLength(9);
    expect(vocab).toContain("flange");
    expect(vocab).toContain("turned_part");
    expect(vocab).toContain("empty");
  });

  it("static isKnownOpKind validates against the canonical CAD vocabulary", () => {
    expect(CADReverseTemplateEngine.isKnownOpKind("feature_extrude")).toBe(true);
    expect(CADReverseTemplateEngine.isKnownOpKind("sketch_create")).toBe(true);
    expect(CADReverseTemplateEngine.isKnownOpKind("not_a_real_op")).toBe(false);
  });

  it("singleton export is usable and independent of fresh instances", () => {
    cadReverseTemplateEngine._resetForTests();
    const t = cadReverseTemplateEngine.reverseEngineer([op("feature_extrude", { distance: 9 })]);
    expect(t.category).toBe("extruded_profile");
    expect(eng.getStats().totalReverseEngineered).toBe(0);
    cadReverseTemplateEngine._resetForTests();
  });
});
