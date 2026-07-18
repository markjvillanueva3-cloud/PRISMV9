/**
 * LATHE-LORA-MS0/U-LLR-FUSION — real-behavior tests for the multi-source fusion engine.
 *
 * Pure + deterministic (no shared store, no I/O) → no isolation tokens needed. The physics
 * anchor is verified by an INDEPENDENT recomputation from the imported CANONICAL_KIENZLE /
 * CANONICAL_TAYLOR (R9: the test fails if the engine inlines a wrong constant or drifts the
 * documented formula — not just if it returns "a number").
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRAKnowledgeFusionEngine as fusion } from "../engines/LatheLoRAKnowledgeFusionEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

describe("LatheLoRAKnowledgeFusionEngine — guards", () => {
  it("throws on missing/empty operation", () => {
    expect(() => fusion.fuse({ operation: "" }, [{ source: "a", vc: 100 }])).toThrow(/operation/);
    expect(() => fusion.fuse({} as never, [{ source: "a", vc: 100 }])).toThrow(/operation/);
  });

  it("throws on empty / non-array candidates", () => {
    expect(() => fusion.fuse({ operation: "od_rough" }, [])).toThrow(/non-empty array/);
    expect(() => fusion.fuse({ operation: "od_rough" }, null as never)).toThrow(/non-empty array/);
  });

  it("throws when no candidate supplies a valid positive parameter", () => {
    expect(() =>
      fusion.fuse({ operation: "od_rough" }, [
        { source: "x", vc: -5 },
        { source: "y", feed: 0 },
        { source: "z" },
      ]),
    ).toThrow(/no candidate supplied a valid positive parameter/);
  });
});

describe("LatheLoRAKnowledgeFusionEngine — fusion math", () => {
  it("single candidate → fused equals its values, zero conflicts", () => {
    const r = fusion.fuse({ operation: "od_finish" }, [{ source: "physics", vc: 150, feed: 0.15, ap: 1.5 }]);
    expect(r.fusedParams.vc).toBe(150);
    expect(r.fusedParams.feed).toBe(0.15);
    expect(r.fusedParams.ap).toBe(1.5);
    expect(r.conflicts.length).toBe(0);
    expect(r.candidateCount).toBe(1);
  });

  it("confidence-weighted mean biases toward the higher-confidence source", () => {
    const r = fusion.fuse({ operation: "od_rough" }, [
      { source: "lowconf", vc: 100, confidence: 0.2 },
      { source: "hiconf", vc: 200, confidence: 0.8 },
    ]);
    // (100·0.2 + 200·0.8)/1.0 = 180 — pulled toward the 0.8-confidence source.
    expect(r.fusedParams.vc).toBe(180);
  });

  it("all-zero confidence → equal-weight fallback (still fuses a unanimous-but-unconfident set)", () => {
    const r = fusion.fuse({ operation: "id_bore" }, [
      { source: "a", ap: 100, confidence: 0 },
      { source: "b", ap: 300, confidence: 0 },
    ]);
    expect(r.fusedParams.ap).toBe(200); // simple mean
  });

  it("fusedParams is null for a parameter no source supplied", () => {
    const r = fusion.fuse({ operation: "thread" }, [{ source: "a", vc: 120 }]);
    expect(r.fusedParams.vc).toBe(120);
    expect(r.fusedParams.feed).toBeNull();
    expect(r.fusedParams.ap).toBeNull();
  });

  it("malformed candidates are skipped + counted (empty source, no params)", () => {
    const r = fusion.fuse({ operation: "face" }, [
      { source: "good", vc: 100 },
      { source: "", vc: 50 }, // empty source
      { vc: 60 } as never, // no source
      { source: "noparams" }, // no valid param
    ]);
    expect(r.candidateCount).toBe(1);
    expect(r.skipped).toBe(3);
  });
});

describe("LatheLoRAKnowledgeFusionEngine — R7 conflict surfacing", () => {
  it("flags a conflict when source spread exceeds the default ratio (1.5)", () => {
    const r = fusion.fuse({ operation: "od_rough" }, [
      { source: "lora", vc: 100 },
      { source: "physics", vc: 250 }, // 2.5× spread
    ]);
    const vcParam = r.perParam.find((p) => p.param === "vc");
    expect(vcParam?.conflict).toBe(true);
    expect(vcParam?.spreadRatio).toBe(2.5);
    expect(r.conflicts.some((c) => c.param === "vc")).toBe(true);
    expect(r.summary).toMatch(/conflict/i);
  });

  it("no conflict when sources agree within the ratio", () => {
    const r = fusion.fuse({ operation: "od_rough" }, [
      { source: "a", vc: 100 },
      { source: "b", vc: 120 }, // 1.2× < 1.5
    ]);
    expect(r.conflicts.length).toBe(0);
    expect(r.summary).toMatch(/agreement/i);
  });

  it("a single source is never a conflict (needs ≥2 to disagree)", () => {
    const r = fusion.fuse({ operation: "part_off" }, [{ source: "solo", vc: 999 }]);
    expect(r.conflicts.length).toBe(0);
  });

  it("conflictSpreadRatio override tightens/loosens detection", () => {
    const cands = [
      { source: "a", feed: 0.1 },
      { source: "b", feed: 0.13 }, // 1.3× spread
    ];
    expect(fusion.fuse({ operation: "od_finish" }, cands).conflicts.length).toBe(0); // 1.3 < 1.5 default
    expect(fusion.fuse({ operation: "od_finish" }, cands, { conflictSpreadRatio: 1.2 }).conflicts.length).toBe(1);
  });
});

describe("LatheLoRAKnowledgeFusionEngine — canonical physics anchor", () => {
  it("Kienzle Fc matches an independent computation from CANONICAL_KIENZLE[P]", () => {
    const r = fusion.fuse({ operation: "od_rough", isoGroup: "P" }, [{ source: "p", ap: 2, feed: 0.2 }]);
    const { kc1_1, mc } = CANONICAL_KIENZLE.P;
    const expected = kc1_1 * 2 * Math.pow(0.2, 1 - mc); // 1800·2·0.2^0.75
    expect(r.physicsAnchor?.kc1_1).toBe(kc1_1);
    expect(r.physicsAnchor?.referenceForceN).toBeCloseTo(expected, 2);
  });

  it("Taylor tool life matches an independent computation from CANONICAL_TAYLOR[P]", () => {
    const r = fusion.fuse({ operation: "od_rough", isoGroup: "P" }, [{ source: "p", vc: 200 }]);
    const { C, n } = CANONICAL_TAYLOR.P;
    const expected = Math.pow(C / 200, 1 / n); // (350/200)^4 = 9.3789…
    expect(r.physicsAnchor?.referenceToolLifeMin).toBeCloseTo(expected, 2);
  });

  it("anchor uses the queried ISO group's own constants (S ≠ N)", () => {
    const rS = fusion.fuse({ operation: "od_rough", isoGroup: "S" }, [{ source: "p", ap: 1, feed: 0.1 }]);
    const rN = fusion.fuse({ operation: "od_rough", isoGroup: "N" }, [{ source: "p", ap: 1, feed: 0.1 }]);
    expect(rS.physicsAnchor?.kc1_1).toBe(CANONICAL_KIENZLE.S.kc1_1);
    expect(rN.physicsAnchor?.kc1_1).toBe(CANONICAL_KIENZLE.N.kc1_1);
    // S is far stiffer than N → higher reference force at identical geometry.
    expect(rS.physicsAnchor!.referenceForceN!).toBeGreaterThan(rN.physicsAnchor!.referenceForceN!);
  });

  it("no isoGroup → physicsAnchor is null", () => {
    const r = fusion.fuse({ operation: "od_rough" }, [{ source: "p", ap: 2, feed: 0.2 }]);
    expect(r.physicsAnchor).toBeNull();
  });

  it("invalid isoGroup → physicsAnchor is null", () => {
    const r = fusion.fuse({ operation: "od_rough", isoGroup: "Z" as never }, [{ source: "p", ap: 2, feed: 0.2 }]);
    expect(r.physicsAnchor).toBeNull();
  });

  it("partial anchor: only vc supplied → force null, life computed, note flags the gap", () => {
    const r = fusion.fuse({ operation: "od_rough", isoGroup: "P" }, [{ source: "p", vc: 200 }]);
    expect(r.physicsAnchor?.referenceForceN).toBeNull();
    expect(r.physicsAnchor?.referenceToolLifeMin).not.toBeNull();
    expect(r.physicsAnchor?.note).toMatch(/ap\+feed/);
  });
});

describe("LATHE-LORA-MS0/U-LLR-FUSION — dispatcher + schema wiring", () => {
  it("turningDispatcher source has the ACTIONS entry + case-block for lathe_lora_fuse_knowledge", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
      "utf8",
    );
    expect(src.includes('case "lathe_lora_fuse_knowledge":')).toBe(true);
    expect(src.includes('"lathe_lora_fuse_knowledge",')).toBe(true);
  });

  it("schema requires operation + candidates array; rejects missing operation + null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(typeof m.lathe_lora_fuse_knowledge?.safeParse).toBe("function");
    expect(
      m.lathe_lora_fuse_knowledge!.safeParse({ operation: "od_rough", candidates: [{ source: "a", vc: 100 }] })
        .success,
    ).toBe(true);
    expect(m.lathe_lora_fuse_knowledge!.safeParse({ candidates: [{ source: "a", vc: 100 }] }).success).toBe(
      false,
    ); // missing operation
    expect(m.lathe_lora_fuse_knowledge!.safeParse(null).success).toBe(false);
  });
});
