import { describe, it, expect } from "vitest";
import { reduceTree, CSGTreeOptimizer, type CSGNode } from "./CSGTreeOptimizer.js";

const leaf = (vol = 100): CSGNode => ({ kind: "leaf", primitive: "box", volume_mm3: vol });

describe("CSGTreeOptimizer", () => {
  it("leaf-only tree returns unchanged", () => {
    const r = reduceTree({ root: leaf() });
    expect(r.optimized.kind).toBe("leaf");
    expect(r.original_depth).toBe(1);
    expect(r.optimized_depth).toBe(1);
  });
  it("identity collapse: union(a) → a", () => {
    const r = reduceTree({ root: { kind: "op", op: "union", children: [leaf()] } });
    expect(r.optimized.kind).toBe("leaf");
    expect(r.identity_collapses).toBeGreaterThan(0);
  });
  it("associativity merge: union(union(a,b),c) → union(a,b,c) — depth drops by 1", () => {
    const r = reduceTree({ root: {
      kind: "op", op: "union",
      children: [{ kind: "op", op: "union", children: [leaf(), leaf()] }, leaf()],
    }});
    expect(r.associativity_merges).toBeGreaterThan(0);
    expect(r.optimized_depth).toBeLessThan(r.original_depth);
    expect(r.optimized.kind).toBe("op");
    expect(r.optimized.children?.length).toBe(3);
  });
  it("zero-volume leaf dropped from union", () => {
    const r = reduceTree({ root: { kind: "op", op: "union", children: [leaf(100), leaf(0)] } });
    expect(r.nodes_dropped).toBeGreaterThan(0);
    expect(r.optimized.kind).toBe("leaf");   // collapsed to single remaining leaf
  });
  it("intersect of single child collapses to child", () => {
    const r = reduceTree({ root: { kind: "op", op: "intersect", children: [leaf()] } });
    expect(r.optimized.kind).toBe("leaf");
  });
  it("difference is not subject to associativity rule (non-commutative)", () => {
    const r = reduceTree({ root: {
      kind: "op", op: "difference",
      children: [{ kind: "op", op: "difference", children: [leaf(), leaf()] }, leaf()],
    }});
    // depth NOT collapsed (3 → 3) because difference is non-commutative
    expect(r.optimized_depth).toBe(3);
    expect(r.associativity_merges).toBe(0);
  });
  it("complex 4-level tree depth drops with merges", () => {
    const r = reduceTree({ root: {
      kind: "op", op: "union",
      children: [
        { kind: "op", op: "union", children: [
          { kind: "op", op: "union", children: [leaf(), leaf()] },
          leaf(),
        ] },
        leaf(),
      ],
    }});
    expect(r.optimized_depth).toBeLessThan(r.original_depth);
  });
  it("missing input diagnostic", () => {
    expect(reduceTree(null as unknown as { root: CSGNode }).notes.join("|")).toContain("missing");
  });
  it("invalid root.kind diagnostic", () => {
    expect(reduceTree({ root: { kind: "wat" as CSGNode["kind"] } }).notes.join("|")).toContain("kind");
  });
  it("notes carry depth-delta summary", () => {
    const r = reduceTree({ root: leaf() });
    expect(r.notes.join("|")).toContain("depth");
  });
  it("version 1.0.0", () => {
    expect(CSGTreeOptimizer.version).toBe("1.0.0");
  });
});
