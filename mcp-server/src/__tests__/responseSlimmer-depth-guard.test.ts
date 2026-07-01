// Tests the maxDepth recursion guard added to slimResponse() (MCP reliability
// hardening). R9: asserts the crash the guard closes (stack overflow / circular
// would throw RangeError and fail the test implicitly) AND that the default
// slimming behavior is byte-identical (regression guard) via full-shape toEqual.
import { describe, it, expect } from "vitest";
import { slimResponse } from "../utils/responseSlimmer.js";

describe("slimResponse depth guard", () => {
  it("preserves a 40-level nested object and keeps the leaf (no stack overflow)", () => {
    let deep: any = { leaf: 1 };
    for (let i = 0; i < 40; i++) deep = { a: deep };
    const out = slimResponse(deep) as any; // pre-fix: RangeError -> test fails
    let n: any = out;
    let levels = 0;
    while (n && typeof n === "object" && "a" in n) { n = n.a; levels++; }
    expect(levels).toBe(40); // whole "a" chain preserved (slimmed above cap, intact below)
    expect(n).toEqual({ leaf: 1 }); // terminal value intact
  });

  it("returns a usable object for a circular reference instead of overflowing", () => {
    const obj: any = { name: "x" };
    obj.self = obj;
    const out = slimResponse(obj) as any; // pre-fix: infinite recursion -> RangeError
    expect(out.name).toBe("x");
    expect(typeof out.self).toBe("object");
  });

  it("default path strips null/undefined/empty-array exactly as before (regression guard)", () => {
    const input = { keep: 1, dropNull: null, dropUndef: undefined, dropEmpty: [], nested: { a: null, b: 2 } };
    expect(slimResponse(input)).toEqual({ keep: 1, nested: { b: 2 } });
  });

  it("does not misread Array.map index/array args as maxDepth/depth", () => {
    expect(slimResponse([{ x: null, y: 1 }, { z: 2 }])).toEqual([{ y: 1 }, { z: 2 }]);
  });

  it("an explicit shallow maxDepth returns the subtree intact at the cap", () => {
    const input = { a: { b: { c: { d: null, keep: 1 } } } };
    const out = slimResponse(input, 1) as any;
    expect(out.a).toEqual({ b: { c: { d: null, keep: 1 } } }); // un-slimmed below cap (d:null kept)
  });

  it("a value below the cap is still slimmed (depth threading is correct)", () => {
    // maxDepth 5: a is at depth 1 < 5, so its null is stripped.
    expect(slimResponse({ a: { keep: 1, drop: null } }, 5)).toEqual({ a: { keep: 1 } });
  });

  it("coerces a legacy SlimLevel string in the maxDepth slot so the guard still fires", () => {
    // calcDispatcher passes getSlimLevel(...) ("L2") here. Without coercion,
    // `depth >= "L2"` is NaN -> guard disabled -> this circular ref overflows.
    const obj: any = { name: "x" };
    obj.self = obj;
    const out = slimResponse(obj, "L2") as any;
    expect(out.name).toBe("x");
    expect(typeof out.self).toBe("object");
  });

  it("a legacy SlimLevel string does not alter slimming of a normal payload", () => {
    expect(slimResponse({ keep: 1, drop: null, empty: [] }, "L4")).toEqual({ keep: 1 });
  });
});
