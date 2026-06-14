/**
 * CADCanonicalTreeAdapterEngine — vitest suite (CAD-REVERSE-ENGINEER-MS0/U2).
 *
 * Closed-form assertions on CanonicalFeatureTree → CADOperation[]
 * translation: type→kind mapping, suppressed/non-authoring filtering,
 * pattern linear/circular refinement, parameter pass-through, the
 * one-call reverseEngineerTree path, R12 fail-loud.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADCanonicalTreeAdapterEngine,
  cadCanonicalTreeAdapterEngine,
} from "../engines/CADCanonicalTreeAdapterEngine.js";
import type { CanonicalFeatureTree, CanonicalFeature } from "../engines/GroundTruthFeatureTreeExtractor.js";

const feat = (
  id: string,
  type: CanonicalFeature["type"],
  extra: Partial<CanonicalFeature> = {},
): CanonicalFeature => ({ id, type, name: `${type}-${id}`, ...extra });

const tree = (features: CanonicalFeature[]): CanonicalFeatureTree => ({
  schemaVersion: "1.0.0",
  sourceFile: "part.FCStd",
  sourceFormat: "FCStd",
  features,
  coverage: 1,
  signature: "0".repeat(64),
  warnings: [],
});

describe("CADCanonicalTreeAdapterEngine — U2", () => {
  let eng: CADCanonicalTreeAdapterEngine;
  beforeEach(() => {
    eng = new CADCanonicalTreeAdapterEngine();
  });

  // ── R12 fail-loud ─────────────────────────────────────────────────────────

  it("R12 fail-loud: non-tree / missing features array throws TypeError", () => {
    expect(() => eng.toOperations(null as never)).toThrow(TypeError);
    expect(() => eng.toOperations("nope" as never)).toThrow(TypeError);
    expect(() => eng.toOperations({ sourceFile: "x" } as never)).toThrow(TypeError);
  });

  // ── Type → kind mapping ───────────────────────────────────────────────────

  it("maps the core authoring types to draw-stack op kinds", () => {
    const r = eng.toOperations(tree([
      feat("1", "Sketch"),
      feat("2", "Extrude"),
      feat("3", "Revolve"),
      feat("4", "Fillet"),
      feat("5", "Chamfer"),
      feat("6", "Hole"),
      feat("7", "Shell"),
    ]));
    expect(r.ops.map((o) => o.kind)).toEqual([
      "sketch_create", "feature_extrude", "feature_revolve",
      "feature_fillet", "feature_chamfer", "feature_hole", "feature_shell",
    ]);
    expect(r.skipped).toHaveLength(0);
  });

  it("non-authoring types (Component / Spreadsheet / Other) are skipped with reason", () => {
    const r = eng.toOperations(tree([
      feat("1", "Extrude"),
      feat("2", "Component"),
      feat("3", "Spreadsheet"),
      feat("4", "Other"),
    ]));
    expect(r.ops).toHaveLength(1);
    expect(r.skipped).toHaveLength(3);
    expect(r.skipped.every((s) => s.reason === "non-authoring")).toBe(true);
  });

  it("Body type maps to boolean_union placeholder (STEP single-body case)", () => {
    const r = eng.toOperations(tree([feat("1", "Body")]));
    expect(r.ops).toHaveLength(1);
    expect(r.ops[0].kind).toBe("boolean_union");
  });

  // ── Suppressed filtering ──────────────────────────────────────────────────

  it("suppressed features are excluded from ops, recorded in skipped", () => {
    const r = eng.toOperations(tree([
      feat("1", "Extrude"),
      feat("2", "Fillet", { suppressed: true }),
      feat("3", "Hole"),
    ]));
    expect(r.ops.map((o) => o.kind)).toEqual(["feature_extrude", "feature_hole"]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].reason).toBe("suppressed");
    expect(r.skipped[0].id).toBe("2");
  });

  // ── Pattern linear/circular refinement ───────────────────────────────────

  it("Pattern with polar/circular sourceType → feature_pattern_circular", () => {
    const r = eng.toOperations(tree([
      feat("1", "Pattern", { sourceType: "PartDesign::PolarPattern" }),
      feat("2", "Pattern", { sourceType: "circular pattern" }),
    ]));
    expect(r.ops[0].kind).toBe("feature_pattern_circular");
    expect(r.ops[1].kind).toBe("feature_pattern_circular");
  });

  it("Pattern with no/linear sourceType → feature_pattern_linear default", () => {
    const r = eng.toOperations(tree([
      feat("1", "Pattern"),
      feat("2", "Pattern", { sourceType: "PartDesign::LinearPattern" }),
    ]));
    expect(r.ops[0].kind).toBe("feature_pattern_linear");
    expect(r.ops[1].kind).toBe("feature_pattern_linear");
  });

  // ── Parameter pass-through ────────────────────────────────────────────────

  it("feature parameters become op args; scalar types preserved", () => {
    const r = eng.toOperations(tree([
      feat("1", "Extrude", { parameters: { length: 25, reversed: false, profile: "sk1" } }),
    ]));
    expect(r.ops[0].args.length).toBe(25);
    expect(r.ops[0].args.reversed).toBe(false);
    expect(r.ops[0].args.profile).toBe("sk1");
  });

  it("feature with no parameters → empty args object, no crash", () => {
    const r = eng.toOperations(tree([feat("1", "Hole")]));
    expect(r.ops[0].args).toEqual({});
  });

  it("operationId + description carried from feature id + name", () => {
    const r = eng.toOperations(tree([feat("xyz", "Extrude")]));
    expect(r.ops[0].operationId).toBe("xyz");
    expect(r.ops[0].description).toBe("Extrude-xyz");
  });

  // ── Malformed features ────────────────────────────────────────────────────

  it("malformed feature (missing type) dropped with a warning, others survive", () => {
    const r = eng.toOperations(tree([
      feat("1", "Extrude"),
      { id: "2", name: "broken" } as never,
      feat("3", "Hole"),
    ]));
    expect(r.ops).toHaveLength(2);
    expect(r.warnings.some((w) => w.includes("malformed"))).toBe(true);
  });

  // ── reverseEngineerTree one-call path ─────────────────────────────────────

  it("reverseEngineerTree chains adapt + reverse-engineer into a categorized template", () => {
    const result = eng.reverseEngineerTree(tree([
      feat("1", "Sketch"),
      feat("2", "Extrude", { parameters: { length: 40 } }),
      feat("3", "Hole", { parameters: { diameter: 8 } }),
      feat("4", "Pattern", { sourceType: "circular" }),
    ]));
    expect(result.template.category).toBe("flange"); // hole + circular pattern
    expect(result.template.opTemplate).toHaveLength(4);
    expect(result.sourceFile).toBe("part.FCStd");
    expect(result.sourceFormat).toBe("FCStd");
    expect(result.adapt.ops).toHaveLength(4);
  });

  it("reverseEngineerTree on a STEP single-Body tree → assembly_body category", () => {
    const stepTree: CanonicalFeatureTree = {
      ...tree([feat("1", "Body")]),
      sourceFile: "imported.step",
      sourceFormat: "step",
    };
    const result = eng.reverseEngineerTree(stepTree);
    expect(result.adapt.ops).toHaveLength(1);
    expect(result.adapt.ops[0].kind).toBe("boolean_union");
    expect(result.template.category).toBe("assembly_body");
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  it("getStats tracks trees, ops emitted, features skipped", () => {
    eng.toOperations(tree([feat("1", "Extrude"), feat("2", "Component")]));
    eng.toOperations(tree([feat("3", "Hole")]));
    const s = eng.getStats();
    expect(s.totalTreesAdapted).toBe(2);
    expect(s.totalOpsEmitted).toBe(2); // extrude + hole
    expect(s.totalFeaturesSkipped).toBe(1); // component
  });

  it("_resetForTests zeroes all counters", () => {
    eng.toOperations(tree([feat("1", "Extrude")]));
    eng._resetForTests();
    const s = eng.getStats();
    expect(s.totalTreesAdapted).toBe(0);
    expect(s.totalOpsEmitted).toBe(0);
    expect(s.totalFeaturesSkipped).toBe(0);
  });

  // ── Static mapping ────────────────────────────────────────────────────────

  it("static getTypeMapping exposes the canonical→kind table", () => {
    const map = CADCanonicalTreeAdapterEngine.getTypeMapping();
    expect(map.Extrude).toBe("feature_extrude");
    expect(map.Fillet).toBe("feature_fillet");
    expect(map.Component).toBe(null);
    expect(map.Spreadsheet).toBe(null);
  });

  it("sourceFeatureCount reflects the raw tree size before filtering", () => {
    const r = eng.toOperations(tree([
      feat("1", "Extrude"), feat("2", "Component"), feat("3", "Hole"),
    ]));
    expect(r.sourceFeatureCount).toBe(3);
    expect(r.ops.length + r.skipped.length).toBe(3);
  });

  it("singleton export is usable independent of fresh instances", () => {
    cadCanonicalTreeAdapterEngine._resetForTests();
    const r = cadCanonicalTreeAdapterEngine.toOperations(tree([feat("1", "Revolve")]));
    expect(r.ops[0].kind).toBe("feature_revolve");
    expect(eng.getStats().totalTreesAdapted).toBe(0);
    cadCanonicalTreeAdapterEngine._resetForTests();
  });
});
