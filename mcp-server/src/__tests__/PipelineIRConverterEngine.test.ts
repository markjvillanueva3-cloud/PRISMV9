// PipelineIRConverterEngine.test.ts -- PIPELINE-IR-MS0/U-PIR02.
// Real graph invariants: topo-order correctness + cycle/dangling/self/duplicate detection.
import { describe, it, expect } from "vitest";
import { PipelineIRConverterEngine } from "../engines/PipelineIRConverterEngine.js";
import { PRINT_TO_PROGRAM_IR } from "../schemas/PipelineIR.js";

/** Invariant: in a valid topo order, every stage appears AFTER all its dependsOn. */
function assertTopoValid(order: string[], stages: { id: string; dependsOn: string[] }[]) {
  const pos = new Map(order.map((id, i) => [id, i]));
  for (const s of stages) {
    for (const dep of s.dependsOn) {
      expect(pos.get(dep)!).toBeLessThan(pos.get(s.id)!);
    }
  }
}

const stage = (id: string, dependsOn: string[] = []) => ({ id, dispatcher: "d", action: "a", dependsOn });

describe("PipelineIRConverterEngine -- valid graphs", () => {
  it("converts the worked print-to-program IR with a dependency-respecting order", () => {
    const r = PipelineIRConverterEngine.convert(PRINT_TO_PROGRAM_IR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order).toEqual(["extract", "speed_feed", "toolpath", "safety"]);
    assertTopoValid(r.order, r.ir.stages);
  });

  it("variability: single-stage pipeline", () => {
    const r = PipelineIRConverterEngine.convert({ id: "one", stages: [stage("only")] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order).toEqual(["only"]);
  });

  it("variability: diamond DAG (a -> b,c -> d) orders a first, d last", () => {
    const r = PipelineIRConverterEngine.convert({
      id: "diamond",
      stages: [stage("a"), stage("b", ["a"]), stage("c", ["a"]), stage("d", ["b", "c"])],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order[0]).toBe("a");
    expect(r.order[3]).toBe("d");
    assertTopoValid(r.order, r.ir.stages);
  });

  it("variability: two independent chains interleave but stay valid", () => {
    const r = PipelineIRConverterEngine.convert({
      id: "two-chains",
      stages: [stage("x1"), stage("x2", ["x1"]), stage("y1"), stage("y2", ["y1"])],
    });
    expect(r.ok).toBe(true);
    if (r.ok) assertTopoValid(r.order, r.ir.stages);
  });
});

describe("PipelineIRConverterEngine -- graph errors (failure modes)", () => {
  it("detects a 2-cycle (a->b->a)", () => {
    const r = PipelineIRConverterEngine.convert({ id: "c", stages: [stage("a", ["b"]), stage("b", ["a"])] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "cycle")).toBe(true);
      expect(r.errors.find((e) => e.code === "cycle")!.message).toMatch(/a|b/);
    }
  });

  it("detects a 3-cycle (a->b->c->a)", () => {
    const r = PipelineIRConverterEngine.convert({ id: "c3", stages: [stage("a", ["c"]), stage("b", ["a"]), stage("c", ["b"])] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "cycle")).toBe(true);
  });

  it("detects a dangling dependsOn", () => {
    const r = PipelineIRConverterEngine.convert({ id: "d", stages: [stage("a", ["ghost"])] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "dangling-depends-on")).toBe(true);
  });

  it("detects a dangling param ref", () => {
    const r = PipelineIRConverterEngine.convert({
      id: "dr",
      stages: [{ id: "a", dispatcher: "d", action: "a", params: { x: { ref: { stage: "ghost" } } } }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "dangling-ref")).toBe(true);
  });

  it("detects self-dependency", () => {
    const r = PipelineIRConverterEngine.convert({ id: "s", stages: [stage("a", ["a"])] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "self-dependency")).toBe(true);
  });

  it("detects duplicate stage ids", () => {
    const r = PipelineIRConverterEngine.convert({ id: "dup", stages: [stage("a"), stage("a")] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "duplicate-stage-id")).toBe(true);
  });

  it("surfaces schema errors for malformed input (no throw)", () => {
    const r = PipelineIRConverterEngine.convert({ id: "x", stages: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "schema")).toBe(true);
  });

  it("adversarial: null / non-object input is rejected structurally, never throws", () => {
    for (const bad of [null, undefined, 42, "str", []]) {
      const r = PipelineIRConverterEngine.convert(bad);
      expect(r.ok).toBe(false);
    }
  });

  it("reports MULTIPLE errors at once (full error list, not first-throw)", () => {
    const r = PipelineIRConverterEngine.convert({
      id: "multi",
      stages: [stage("a", ["ghost1"]), stage("b", ["b"]), stage("a")],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
