/**
 * CADOperationDecoderEngine — vitest suite (CAD-DRAW-MAX-MS0/P1-U06).
 *
 * Closed-form assertions on intent overrides, sequence templates, fallback,
 * top-K dedup + ordering, intent-number parse, R12 fail-loud, stats.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CADOperationDecoderEngine } from "../engines/CADOperationDecoderEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("CADOperationDecoderEngine — P1-U06", () => {
  let eng: CADOperationDecoderEngine;
  beforeEach(() => {
    eng = new CADOperationDecoderEngine();
  });

  it("empty context → sequence-template proposes sketch_create on plane XY", () => {
    const p = eng.proposeNextOp();
    expect(p?.op.kind).toBe("sketch_create");
    expect(p?.op.args.plane).toBe("XY");
    expect(p?.source).toBe("sequence-template");
    expect(p?.score).toBeGreaterThanOrEqual(0.8);
  });

  it("after sketch_create → proposes feature_extrude", () => {
    const history: CADOperation[] = [{ kind: "sketch_create", args: { plane: "XY" } }];
    const p = eng.proposeNextOp({ history });
    expect(p?.op.kind).toBe("feature_extrude");
    expect(p?.op.args.distance).toBe(10);
    expect(p?.op.args.operation).toBe("new_body");
  });

  it("after feature_extrude → proposes feature_fillet", () => {
    const history: CADOperation[] = [
      { kind: "sketch_create", args: {} },
      { kind: "feature_extrude", args: { distance: 5 } },
    ];
    const p = eng.proposeNextOp({ history });
    expect(p?.op.kind).toBe("feature_fillet");
  });

  it("intent='fillet 2.5mm radius' → feature_fillet with radius=2.5 (intent beats template)", () => {
    const history: CADOperation[] = [{ kind: "sketch_create", args: {} }]; // template would say extrude
    const p = eng.proposeNextOp({ history }, { intent: "fillet 2.5mm radius" });
    expect(p?.op.kind).toBe("feature_fillet");
    expect(p?.op.args.radius).toBe(2.5);
    expect(p?.source).toBe("intent");
    expect(p?.score).toBeGreaterThanOrEqual(0.9);
  });

  it("intent='drill a 6mm hole' → feature_hole with diameter=6", () => {
    const p = eng.proposeNextOp({}, { intent: "drill a 6mm hole" });
    expect(p?.op.kind).toBe("feature_hole");
    expect(p?.op.args.diameter).toBe(6);
  });

  it("intent='extrude 25 boss' → feature_extrude (new_body) with distance=25", () => {
    const p = eng.proposeNextOp({}, { intent: "extrude 25 boss" });
    expect(p?.op.kind).toBe("feature_extrude");
    expect(p?.op.args.distance).toBe(25);
    expect(p?.op.args.operation).toBe("new_body");
  });

  it("intent='cut pocket 3' → feature_extrude (cut) with distance=3", () => {
    const p = eng.proposeNextOp({}, { intent: "cut pocket 3" });
    expect(p?.op.kind).toBe("feature_extrude");
    expect(p?.op.args.operation).toBe("cut");
    expect(p?.op.args.distance).toBe(3);
  });

  it("intent without number → kind matched, args use default", () => {
    const p = eng.proposeNextOp({}, { intent: "fillet please" });
    expect(p?.op.kind).toBe("feature_fillet");
    expect(p?.op.args.radius).toBe(1); // fallback default
  });

  it("intent='export to step' → export_step with empty args", () => {
    const p = eng.proposeNextOp({}, { intent: "export to step" });
    expect(p?.op.kind).toBe("export_step");
  });

  it("after 5+ feature_* ops → proposes export_step (sequence template)", () => {
    const history: CADOperation[] = [
      { kind: "sketch_create", args: {} },
      { kind: "feature_extrude", args: {} },
      { kind: "feature_fillet", args: {} },
      { kind: "feature_hole", args: {} },
      { kind: "feature_chamfer", args: {} },
      { kind: "feature_shell", args: {} },
    ];
    const p = eng.proposeNextOp({ history });
    expect(p?.op.kind).toBe("export_step");
  });

  it("useFallback=false + no intent + nothing-matches → returns null + totalNullProposals++", () => {
    const history: CADOperation[] = [
      // Use a state that no template matches (export already done)
      { kind: "export_step", args: {} },
    ];
    const p = eng.proposeNextOp({ history }, { useFallback: false });
    expect(p).toBeNull();
    expect(eng.getStats().totalNullProposals).toBe(1);
  });

  it("useFallback=true (default) + nothing matches → fallback to feature_extrude (score=0.30)", () => {
    const history: CADOperation[] = [{ kind: "export_step", args: {} }];
    const p = eng.proposeNextOp({ history });
    expect(p?.op.kind).toBe("feature_extrude");
    expect(p?.source).toBe("fallback");
    expect(p?.score).toBe(0.3);
  });

  it("ctx.history non-array throws TypeError (R12)", () => {
    expect(() => eng.proposeNextOp({ history: "not-an-array" as never })).toThrow(TypeError);
  });

  it("topK=3 with empty intent → unique kinds, ordered by score", () => {
    const candidates = eng.proposeNextOpsTopK({}, {}, 3);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    // No duplicate kinds
    const kinds = candidates.map(c => c.op.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    // Ordered descending by score
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });

  it("topK=2 with intent matching multiple rules → intent matches first, deduped", () => {
    const candidates = eng.proposeNextOpsTopK({}, { intent: "fillet then chamfer" }, 2);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].op.kind).toBe("feature_fillet");
    expect(candidates[0].source).toBe("intent");
    expect(candidates[1].op.kind).toBe("feature_chamfer");
  });

  it("topK throws TypeError on k=0 / negative k / non-finite k (R12)", () => {
    expect(() => eng.proposeNextOpsTopK({}, {}, 0)).toThrow(TypeError);
    expect(() => eng.proposeNextOpsTopK({}, {}, -1)).toThrow(TypeError);
    expect(() => eng.proposeNextOpsTopK({}, {}, Number.NaN)).toThrow(TypeError);
  });

  it("getVocabulary() forwards CAD_OPERATION_KINDS verbatim (NN01 symmetry)", async () => {
    const { CAD_OPERATION_KINDS } = await import("../interfaces/ICADCodeGenerator.js");
    const vocab = eng.getVocabulary();
    expect(vocab.length).toBe(CAD_OPERATION_KINDS.length);
    expect(vocab).toContain("sketch_create");
    expect(vocab).toContain("feature_extrude");
    expect(vocab).toContain("export_step");
  });

  it("stats track all 5 counters across mixed call paths", () => {
    eng.proposeNextOp({}, { intent: "fillet 1mm" }); // intent
    eng.proposeNextOp(); // template (empty history → sketch)
    eng.proposeNextOp({ history: [{ kind: "export_step", args: {} }] }); // fallback
    eng.proposeNextOp({ history: [{ kind: "export_step", args: {} }] }, { useFallback: false }); // null
    const s = eng.getStats();
    expect(s.totalProposals).toBe(4);
    expect(s.totalIntentMatches).toBe(1);
    expect(s.totalTemplateMatches).toBe(1);
    expect(s.totalFallbacks).toBe(1);
    expect(s.totalNullProposals).toBe(1);
  });

  it("pattern intent → feature_pattern_linear with count clipped to ≥2", () => {
    const p = eng.proposeNextOp({}, { intent: "linear pattern 1" });
    expect(p?.op.kind).toBe("feature_pattern_linear");
    expect(p?.op.args.count).toBe(2); // clipped from 1 → 2
  });
});
