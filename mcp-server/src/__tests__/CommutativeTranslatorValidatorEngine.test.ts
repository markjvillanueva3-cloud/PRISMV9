/**
 * Tests for CommutativeTranslatorValidatorEngine — category-theory correctness harness.
 *
 * Reference-value tests (real numbers / structural invariants, no toBeDefined stubs):
 *   happy: identity commutes with anything; two disjoint-field rewrites commute;
 *          well-behaved lens is valid; array functor preserves id+composition;
 *          a genuine natural transformation commutes.
 *   failure/edge: order-dependent scale-vs-clamp DIVERGES with the exact counterexample;
 *          a field-dropping lens is invalid with the failing case; empty inputs are
 *          vacuously true; a reversing "functor" fails identity.
 *   adversarial: the G170/G168-class naturality break (target post differs from source
 *          post); a throw-vs-value divergence; Zod rejects a malformed rewrite spec.
 */

import { describe, it, expect } from "vitest";
import {
  CommutativeTranslatorValidatorEngine,
  commutativetranslatorEngine,
  type OpRecord,
} from "../engines/CommutativeTranslatorValidatorEngine.js";
import { INCH_TO_MM } from "../physics/unit-conversions.js";

const E = commutativetranslatorEngine;

describe("CommutativeTranslatorValidatorEngine — deepEqual primitives", () => {
  it("treats NaN===NaN and +0===-0 as equal, distinguishes real divergence", () => {
    expect(E.deepEqual({ a: NaN }, { a: NaN })).toBe(true);
    expect(E.deepEqual(0, -0)).toBe(true);
    expect(E.deepEqual({ feed: 10, code: "G01" }, { code: "G01", feed: 10 })).toBe(true); // key order irrelevant
    expect(E.deepEqual({ feed: 10 }, { feed: 11 })).toBe(false);
    expect(E.deepEqual([1, 2, 3], [1, 2])).toBe(false); // length mismatch
    expect(E.deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false); // extra key
  });
});

describe("checkCommutation — happy paths", () => {
  it("identity transform commutes with anything (id ∘ f === f ∘ id)", () => {
    const id = (x: OpRecord) => ({ ...x });
    const scaleFeed = (x: OpRecord) => ({ ...x, feed: (x.feed as number) * 2 });
    const r = E.checkCommutation<OpRecord>({
      f: id,
      g: scaleFeed,
      inputs: [{ feed: 10 }, { feed: 25 }, { feed: 60 }],
    });
    expect(r.commutes).toBe(true);
    expect(r.checked).toBe(3);
    expect(r.counterexample).toBeUndefined();
  });

  it("two independent field-rewrites (feed scale + spindle map) commute — no counterexample", () => {
    const ex = E.manufacturingExamples();
    expect(ex.feedAndSpindle.commutes).toBe(true);
    expect(ex.feedAndSpindle.checked).toBe(3);
    expect(ex.feedAndSpindle.counterexample).toBeUndefined();
  });

  it("feedrate in→mm conversion (uses canonical INCH_TO_MM) commutes with a block-prefix rewrite", () => {
    const ex = E.manufacturingExamples();
    expect(ex.unitAndPrefix.commutes).toBe(true);
    // Sanity: the conversion constant is the canonical 25.4, not an inlined literal.
    expect(INCH_TO_MM).toBe(25.4);
  });
});

describe("checkCommutation — order-dependent divergence (the silent-divergence bug class)", () => {
  it("scale-then-clamp ≠ clamp-then-scale: commutes:false with the EXACT counterexample", () => {
    const ex = E.manufacturingExamples();
    const r = ex.scaleVsClamp;
    expect(r.commutes).toBe(false);
    expect(r.checked).toBe(3);
    expect(r.counterexample).toBeTruthy();
    const c = r.counterexample!;
    // First divergence is at feed=60 (feed=10 and feed=25 both stay under the clamp).
    expect((c.input as OpRecord).feed).toBe(60);
    // left  = scaleFeed(clampFeed(60)) = 60*2   = 120
    // right = clampFeed(scaleFeed(60)) = min(120,100) = 100
    expect((c.leftPath as OpRecord).feed).toBe(120);
    expect((c.rightPath as OpRecord).feed).toBe(100);
    expect(c.firstDiff.path).toBe("$.feed");
    expect(c.firstDiff.left).toBe(120);
    expect(c.firstDiff.right).toBe(100);
  });

  it("the same divergence is caught through the safe JSON DSL surface (MCP entry point)", () => {
    const r = E.checkFieldRewriteCommutation({
      specA: { kind: "scale", field: "feed", factor: 2 },
      specB: { kind: "clamp", field: "feed", max: 100 },
      inputs: [{ feed: 10 }, { feed: 25 }, { feed: 60 }],
    });
    expect(r.commutes).toBe(false);
    expect((r.counterexample!.input as OpRecord).feed).toBe(60);
    expect(r.counterexample!.firstDiff.path).toBe("$.feed");
  });
});

describe("checkCommutation — edge cases", () => {
  it("empty input set → vacuously commutes with a warning", () => {
    const r = E.checkCommutation<OpRecord>({ f: (x) => x, g: (x) => x, inputs: [] });
    expect(r.commutes).toBe(true);
    expect(r.checked).toBe(0);
    expect(r.warning).toContain("vacuously");
  });

  it("throws a descriptive TypeError on non-function transforms (programmer misuse)", () => {
    // @ts-expect-error deliberate misuse
    expect(() => E.checkCommutation({ f: 5, g: (x) => x, inputs: [] })).toThrow(/must be functions/);
  });
});

describe("checkNaturality — the G170/G168-class regression", () => {
  it("a genuine natural transformation commutes (target post scales the renamed field consistently)", () => {
    // translate renames the target vocabulary feed -> f
    const translate = (s: OpRecord): OpRecord => ({ code: s.code, f: s.feed });
    const postSource = (s: OpRecord): OpRecord => ({ ...s, feed: (s.feed as number) * 2 });
    const postTarget = (t: OpRecord): OpRecord => ({ ...t, f: (t.f as number) * 2 });
    const r = E.checkNaturality<OpRecord, OpRecord>({
      translate,
      postSource,
      postTarget,
      inputs: [{ code: "G01", feed: 10 }, { code: "G02", feed: 25 }],
    });
    expect(r.commutes).toBe(true);
    expect(r.checked).toBe(2);
  });

  it("catches the shipped-bug shape: target-side post FORGETS the op the source-side post applied", () => {
    // Models G170/G168: one path applies the (correct) transform, the other does not.
    const translate = (s: OpRecord): OpRecord => ({ code: s.code, f: s.feed });
    const postSource = (s: OpRecord): OpRecord => ({ ...s, feed: (s.feed as number) * 2 });
    const postTargetBroken = (t: OpRecord): OpRecord => ({ ...t }); // <-- forgot to scale f
    const r = E.checkNaturality<OpRecord, OpRecord>({
      translate,
      postSource,
      postTarget: postTargetBroken,
      inputs: [{ code: "G01", feed: 10 }, { code: "G02", feed: 25 }],
    });
    expect(r.commutes).toBe(false);
    const c = r.counterexample!;
    // First input feed=10: left=postTarget(translate)= f:10 ; right=translate(postSource)= f:20
    expect((c.input as OpRecord).feed).toBe(10);
    expect((c.leftPath as OpRecord).f).toBe(10);
    expect((c.rightPath as OpRecord).f).toBe(20);
    expect(c.firstDiff.path).toBe("$.f");
    expect(c.firstDiff.left).toBe(10);
    expect(c.firstDiff.right).toBe(20);
  });
});

describe("checkCommutation — adversarial: throw vs value divergence", () => {
  it("a transform that throws on one path but returns a value on the other is caught", () => {
    const g = (op: OpRecord): OpRecord => ({ ...op, danger: true });
    const f = (op: OpRecord): OpRecord => {
      if (op.danger) throw new Error("boom");
      return { ...op, seen: true };
    };
    // left  = f(g(x)) : g sets danger -> f throws "boom"
    // right = g(f(x)) : f(no danger) -> {seen}; g adds danger -> a value
    const r = E.checkCommutation<OpRecord>({ f, g, inputs: [{ feed: 10 }] });
    expect(r.commutes).toBe(false);
    const c = r.counterexample!;
    expect(c.firstDiff.path).toBe("<throw-divergence>");
    expect(c.leftPath).toEqual({ threw: "boom" });
    expect((c.rightPath as OpRecord).seen).toBe(true);
  });
});

describe("checkIdentity + checkAssociativity", () => {
  it("confirms a real identity and rejects a non-identity", () => {
    const good = E.checkIdentity<OpRecord>({ f: (x) => ({ ...x }), inputs: [{ feed: 10 }, { feed: 60 }] });
    expect(good.holds).toBe(true);

    const bad = E.checkIdentity<OpRecord>({ f: (x) => ({ ...x, feed: (x.feed as number) + 1 }), inputs: [{ feed: 10 }] });
    expect(bad.holds).toBe(false);
    expect(bad.counterexample!.firstDiff.path).toBe("$.feed");
    expect(bad.counterexample!.firstDiff.left).toBe(11); // actual f(x).feed
    expect(bad.counterexample!.firstDiff.right).toBe(10); // expected x.feed
  });

  it("pure composition regroups freely (associativity holds)", () => {
    const f = (x: OpRecord) => ({ ...x, feed: (x.feed as number) * 2 });
    const g = (x: OpRecord) => ({ ...x, feed: (x.feed as number) + 5 });
    const h = (x: OpRecord) => ({ ...x, code: `N${x.code}` });
    const r = E.checkAssociativity<OpRecord>({ f, g, h, inputs: [{ code: "10", feed: 10 }, { code: "20", feed: 25 }] });
    expect(r.holds).toBe(true);
    expect(r.checked).toBe(2);
  });
});

describe("checkLensLaws — print↔program↔CAD round-trip", () => {
  const get = (s: OpRecord) => s.feed as number;
  const put = (v: number, s: OpRecord): OpRecord => ({ ...s, feed: v });
  const states: OpRecord[] = [{ code: "G01", feed: 10 }, { code: "G02", feed: 25 }];
  const values = [10, 25, 60];

  it("a well-behaved field lens satisfies GetPut, PutGet and PutPut → valid", () => {
    const r = E.checkLensLaws<OpRecord, number>({ get, put, states, values });
    expect(r.valid).toBe(true);
    expect(r.getPut.holds).toBe(true);
    expect(r.putGet.holds).toBe(true);
    expect(r.putPut.holds).toBe(true);
    expect(r.putGet.checked).toBe(states.length * values.length); // 6
  });

  it("a lens whose put DROPS a field violates GetPut → invalid with the failing state", () => {
    const putDrops = (v: number, _s: OpRecord): OpRecord => ({ feed: v }); // drops `code`
    const r = E.checkLensLaws<OpRecord, number>({ get, put: putDrops, states, values });
    expect(r.valid).toBe(false);
    expect(r.getPut.holds).toBe(false);
    // put(get(s), s) = {feed:10} but s = {code:"G01", feed:10} -> missing `code`
    expect(r.getPut.counterexample!.firstDiff.path).toBe("$.code");
    expect(r.getPut.counterexample!.firstDiff.right).toBe("G01"); // expected (s) has code
    expect(r.getPut.counterexample!.firstDiff.left).toBeUndefined(); // actual dropped it
    // PutGet still holds (get(putDrops(v,s)) === v)
    expect(r.putGet.holds).toBe(true);
  });
});

describe("checkFunctorLaws — array functor", () => {
  const arrMap = <P, Q>(fn: (x: P) => Q, c: OpRecord): OpRecord => {
    const arr = (c.items as P[]) ?? [];
    return { ...c, items: arr.map(fn) };
  };

  it("array map preserves identity and composition → valid", () => {
    const r = E.checkFunctorLaws<OpRecord, number, number, number>({
      map: arrMap,
      f: (x: number) => x + 1,
      g: (x: number) => x * 2,
      inputs: [{ items: [1, 2, 3] }, { items: [10] }, { items: [] }],
    });
    expect(r.valid).toBe(true);
    expect(r.preservesIdentity.holds).toBe(true);
    expect(r.preservesComposition.holds).toBe(true);
  });

  it("a reversing pseudo-map fails the identity law → invalid (adversarial)", () => {
    const reversingMap = <P, Q>(fn: (x: P) => Q, c: OpRecord): OpRecord => {
      const arr = (c.items as P[]) ?? [];
      return { ...c, items: arr.map(fn).reverse() };
    };
    const r = E.checkFunctorLaws<OpRecord, number, number, number>({
      map: reversingMap,
      f: (x: number) => x + 1,
      g: (x: number) => x * 2,
      inputs: [{ items: [1, 2, 3] }],
    });
    expect(r.valid).toBe(false);
    expect(r.preservesIdentity.holds).toBe(false); // map(id,[1,2,3]) = [3,2,1] != [1,2,3]
  });
});

describe("buildTransform + Zod validation (MCP surface safety)", () => {
  it("compiles each rewrite kind to a pure function", () => {
    expect(E.buildTransform({ kind: "identity" })({ feed: 10 })).toEqual({ feed: 10 });
    expect(E.buildTransform({ kind: "scale", field: "feed", factor: 2 })({ feed: 10 })).toEqual({ feed: 20 });
    expect(E.buildTransform({ kind: "offset", field: "feed", delta: 5 })({ feed: 10 })).toEqual({ feed: 15 });
    expect(E.buildTransform({ kind: "clamp", field: "feed", max: 100 })({ feed: 150 })).toEqual({ feed: 100 });
    expect(E.buildTransform({ kind: "map", field: "s", table: { M03: "M3" } })({ s: "M03" })).toEqual({ s: "M3" });
    expect(E.buildTransform({ kind: "prefix", field: "code", prefix: "N100 " })({ code: "G01" })).toEqual({ code: "N100 G01" });
  });

  it("leaves non-numeric fields untouched for numeric rewrites (partial transform)", () => {
    expect(E.buildTransform({ kind: "scale", field: "feed", factor: 2 })({ feed: "fast" })).toEqual({ feed: "fast" });
  });

  it("rejects a malformed rewrite spec via Zod (invalid-input rejection)", () => {
    expect(() =>
      E.checkFieldRewriteCommutation({
        // @ts-expect-error missing required `field`
        specA: { kind: "scale", factor: 2 },
        specB: { kind: "identity" },
        inputs: [{ feed: 10 }],
      }),
    ).toThrow();
  });
});

describe("singleton + rendering", () => {
  it("exports a working singleton and renders verdicts", () => {
    expect(commutativetranslatorEngine).toBeInstanceOf(CommutativeTranslatorValidatorEngine);
    const ok = E.renderResult({ commutes: true, checked: 3 }, "unit+prefix");
    expect(ok).toContain("[unit+prefix OK]");
    const bad = E.renderResult(E.manufacturingExamples().scaleVsClamp, "scale-vs-clamp");
    expect(bad).toContain("DIVERGENCE");
    expect(bad).toContain("$.feed");
  });
});
