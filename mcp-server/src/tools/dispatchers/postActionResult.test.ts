/**
 * postActionResult -- honest post-action verdict helper (U-PP-HONEST-SUCCESS-HELPER, slot:echo 2026-06-27).
 *
 * Verifies the helper is STRICTLY SAFER than the legacy hardcoded `success:true`: it flips to
 * success:false ONLY on a confident failure signal, and preserves success:true otherwise (the
 * no-false-negative / no-regression property -- the test that matters most is "unknown shape stays true").
 */
import { describe, it, expect } from "vitest";
import { postActionResult } from "./postActionResult.js";

describe("postActionResult -- honest success/failure verdict", () => {
  it("null / undefined -> success:false (action returned no result)", () => {
    for (const v of [null, undefined]) {
      const r = postActionResult("FooEngine", v);
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/no result/i);
    }
  });

  it("non-object (string, number) -> success:false", () => {
    expect(postActionResult("FooEngine", "oops").success).toBe(false);
    expect(postActionResult("FooEngine", 42).success).toBe(false);
  });

  it("the dispatcher not-callable fallback object -> success:false with the note as error", () => {
    const r = postActionResult("WEDMPostSodickEngine", { engine: "WEDMPostSodickEngine", note: "generate not callable" });
    expect(r.success).toBe(false);
    expect(r.error).toBe("generate not callable");
  });

  it("an explicit success:false from the engine -> success:false, surfacing its error/warning", () => {
    expect(postActionResult("E", { success: false, error: "boom" })).toMatchObject({ success: false, error: "boom" });
    expect(postActionResult("E", { success: false, warnings: ["bad input"] })).toMatchObject({ success: false, error: "bad input" });
    expect(postActionResult("E", { success: false }).error).toMatch(/reported failure/i);
  });

  it("a recognizably EMPTY program -> success:false (line_count===0 / empty gcode / empty lines)", () => {
    // The exact AGI empty error-result shape that started this.
    expect(postActionResult("AGI", { gcode: "", line_count: 0, warnings: ["No segments or G-code provided"] }))
      .toMatchObject({ success: false, error: "No segments or G-code provided" });
    expect(postActionResult("E", { gcode: [], line_count: 0 }).success).toBe(false);
    expect(postActionResult("E", { lines: [] }).success).toBe(false);
    expect(postActionResult("E", { program: "" }).success).toBe(false);
  });

  it("a REAL non-empty program -> success:true (no false-negative), several shapes", () => {
    expect(postActionResult("E", { gcode: ["G0 X0", "M30"], line_count: 2 }).success).toBe(true);
    expect(postActionResult("E", { gcode: "G0 X0\nM30", line_count: 5 }).success).toBe(true);
    expect(postActionResult("E", { success: true, gcode: "G0", line_count: 1 }).success).toBe(true);
    expect(postActionResult("E", { program: "%\nO1\nM30\n%" }).success).toBe(true);
  });

  it("CRITICAL no-regression: an UNRECOGNIZED shape with no failure signal stays success:true", () => {
    // A working action whose result this helper does not model must NOT be flipped to false.
    const r = postActionResult("SomeOtherEngine", { widgets: 42, status: "ok", payload: { a: 1 } });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ widgets: 42, status: "ok", payload: { a: 1 } });
  });

  it("data is always passed through unchanged", () => {
    const payload = { gcode: ["G0"], line_count: 1, meta: { k: "v" } };
    expect(postActionResult("E", payload).data).toBe(payload);
  });
});
