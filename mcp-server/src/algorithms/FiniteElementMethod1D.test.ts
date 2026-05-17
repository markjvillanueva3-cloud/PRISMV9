/**
 * FiniteElementMethod1D.test.ts — vitest
 *
 * Real analytical references (CLAUDE.md R9 — no weak stubs):
 *  - −u″=1, u(0)=u(1)=0 → 1D-P1 nodal values are EXACT = xᵢ(1−xᵢ)/2
 *    (classic 1D superconvergence for constant-coeff −u″=f)
 *  - −u″=π²sin(πx) → exact sin(πx); O(h²) convergence in L∞
 *  - coefficient scaling −a·u″=a → same shape (a cancels)
 *  - mixed Dirichlet/Neumann: −u″=0, u(0)=0, a·u′(L)=1 → exact u=x
 *  - reaction term −u″+u manufactured solution
 *  - validation + adversarial + singular pure-Neumann warning
 *
 * @module algorithms/FiniteElementMethod1D.test
 */

import { describe, it, expect } from "vitest";
import { FiniteElementMethod1D } from "./FiniteElementMethod1D.js";
import type { FiniteElementMethod1DInput } from "./FiniteElementMethod1D.js";

const dirichlet0: FiniteElementMethod1DInput["bc"] = {
  left: { kind: "dirichlet", value: 0 },
  right: { kind: "dirichlet", value: 0 },
};

// ─── nodal exactness (superconvergence) ────────────────────────────

describe("FiniteElementMethod1D — 1D P1 nodal exactness", () => {
  it("−u″=1, u(0)=u(1)=0 → nodal values EXACTLY xᵢ(1−xᵢ)/2", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 8, a: 1, c: 0, source: () => 1, bc: dirichlet0,
    });
    for (let i = 0; i < out.nodes.length; i += 1) {
      const x = out.nodes[i];
      const exact = (x * (1 - x)) / 2;
      expect(out.solution[i]).toBeCloseTo(exact, 10); // exact at nodes
    }
    // boundary nodes are exactly the Dirichlet values
    expect(out.solution[0]).toBe(0);
    expect(out.solution[out.solution.length - 1]).toBe(0);
  });

  it("nodal exactness is mesh-independent (coarse 3-elem also exact)", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 3, a: 1, c: 0, source: () => 1, bc: dirichlet0,
    });
    for (let i = 0; i < out.nodes.length; i += 1) {
      const x = out.nodes[i];
      expect(out.solution[i]).toBeCloseTo((x * (1 - x)) / 2, 10);
    }
  });

  it("coefficient a scales out: −2u″=2 same as −u″=1", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 6, a: 2, c: 0, source: () => 2, bc: dirichlet0,
    });
    for (let i = 0; i < out.nodes.length; i += 1) {
      const x = out.nodes[i];
      expect(out.solution[i]).toBeCloseTo((x * (1 - x)) / 2, 10);
    }
  });
});

// ─── convergence O(h²) for a smooth non-polynomial source ──────────

describe("FiniteElementMethod1D — O(h²) convergence", () => {
  // −u″ = π²·sin(πx), u(0)=u(1)=0 → exact u = sin(πx)
  function maxErr(elements: number): number {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements, a: 1, c: 0,
      source: (x) => Math.PI * Math.PI * Math.sin(Math.PI * x),
      bc: dirichlet0,
    });
    let e = 0;
    for (let i = 0; i < out.nodes.length; i += 1) {
      e = Math.max(e, Math.abs(out.solution[i] - Math.sin(Math.PI * out.nodes[i])));
    }
    return e;
  }

  it("error halves-squared when the mesh doubles (≈4x drop)", () => {
    const eCoarse = maxErr(20);
    const eFine = maxErr(40);
    expect(eCoarse / eFine).toBeGreaterThan(3.5); // ≈4 for 2nd-order P1
    expect(eFine).toBeLessThan(1e-2);
  });

  it("solution recovers sin(πx) shape at the midpoint", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 100, a: 1, c: 0,
      source: (x) => Math.PI * Math.PI * Math.sin(Math.PI * x),
      bc: dirichlet0,
    });
    const mid = 50; // x = 0.5, sin(π/2)=1
    expect(out.nodes[mid]).toBeCloseTo(0.5, 12);
    expect(out.solution[mid]).toBeCloseTo(1.0, 3);
  });
});

// ─── mixed Dirichlet / Neumann ─────────────────────────────────────

describe("FiniteElementMethod1D — Neumann (natural) BC", () => {
  it("−u″=0, u(0)=0, a·u′(1)=1 → exact u=x (a=1)", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 10, a: 1, c: 0, source: () => 0,
      bc: { left: { kind: "dirichlet", value: 0 }, right: { kind: "neumann", flux: 1 } },
    });
    for (let i = 0; i < out.nodes.length; i += 1) {
      expect(out.solution[i]).toBeCloseTo(out.nodes[i], 8); // u=x
    }
  });

  it("Neumann flux scales with 1/a: −2u″=0, u(0)=0, 2·u′(1)=2 → u=x", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 10, a: 2, c: 0, source: () => 0,
      bc: { left: { kind: "dirichlet", value: 0 }, right: { kind: "neumann", flux: 2 } },
    });
    for (let i = 0; i < out.nodes.length; i += 1) {
      expect(out.solution[i]).toBeCloseTo(out.nodes[i], 8);
    }
  });
});

// ─── reaction term ─────────────────────────────────────────────────

describe("FiniteElementMethod1D — reaction term c·u", () => {
  it("−u″+u with manufactured solution u=sin(πx): converges O(h²)", () => {
    // −u″ + u = (π²+1)·sin(πx), u(0)=u(1)=0 → exact sin(πx)
    const solveErr = (ne: number): number => {
      const out = FiniteElementMethod1D.calculate({
        length: 1, elements: ne, a: 1, c: 1,
        source: (x) => (Math.PI * Math.PI + 1) * Math.sin(Math.PI * x),
        bc: dirichlet0,
      });
      let e = 0;
      for (let i = 0; i < out.nodes.length; i += 1) {
        e = Math.max(e, Math.abs(out.solution[i] - Math.sin(Math.PI * out.nodes[i])));
      }
      return e;
    };
    const eC = solveErr(20);
    const eF = solveErr(40);
    expect(eC / eF).toBeGreaterThan(3.5);
    expect(eF).toBeLessThan(1e-2);
  });

  it("non-homogeneous Dirichlet: u(0)=1, u(1)=3, −u″=0 → linear u=1+2x", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 1, elements: 8, a: 1, c: 0, source: () => 0,
      bc: { left: { kind: "dirichlet", value: 1 }, right: { kind: "dirichlet", value: 3 } },
    });
    for (let i = 0; i < out.nodes.length; i += 1) {
      expect(out.solution[i]).toBeCloseTo(1 + 2 * out.nodes[i], 9);
    }
  });
});

// ─── validation + adversarial ──────────────────────────────────────

describe("FiniteElementMethod1D.validate — failure modes", () => {
  const src = () => 1;

  it("rejects non-positive length / a", () => {
    expect(FiniteElementMethod1D.validate({ length: 0, elements: 4, a: 1, c: 0, source: src, bc: dirichlet0 }).valid).toBe(false);
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 4, a: 0, c: 0, source: src, bc: dirichlet0 }).valid).toBe(false);
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 4, a: -1, c: 0, source: src, bc: dirichlet0 }).valid).toBe(false);
  });

  it("rejects elements < 1 / non-integer", () => {
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 0, a: 1, c: 0, source: src, bc: dirichlet0 }).valid).toBe(false);
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 3.5, a: 1, c: 0, source: src, bc: dirichlet0 }).valid).toBe(false);
  });

  it("rejects negative reaction c and missing source", () => {
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 4, a: 1, c: -1, source: src, bc: dirichlet0 }).valid).toBe(false);
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 4, a: 1, c: 0, source: undefined as unknown as (x: number) => number, bc: dirichlet0 }).valid).toBe(false);
  });

  it("rejects malformed / missing bc and bad kinds", () => {
    expect(FiniteElementMethod1D.validate({ length: 1, elements: 4, a: 1, c: 0, source: src, bc: undefined as unknown as FiniteElementMethod1DInput["bc"] }).valid).toBe(false);
    expect(FiniteElementMethod1D.validate({
      length: 1, elements: 4, a: 1, c: 0, source: src,
      bc: { left: { kind: "robin" } as unknown as { kind: "dirichlet"; value: number }, right: { kind: "dirichlet", value: 0 } },
    }).valid).toBe(false);
  });

  it("warns (does not reject) singular pure-Neumann with c=0", () => {
    const v = FiniteElementMethod1D.validate({
      length: 1, elements: 4, a: 1, c: 0, source: src,
      bc: { left: { kind: "neumann", flux: 0 }, right: { kind: "neumann", flux: 0 } },
    });
    expect(v.valid).toBe(true);
    expect(v.warnings!.some((w) => /singular/.test(w))).toBe(true);
  });

  it("calculate() throws on validation failure", () => {
    expect(() => FiniteElementMethod1D.calculate({
      length: -1, elements: 4, a: 1, c: 0, source: src, bc: dirichlet0,
    })).toThrow(/validation failed/);
  });
});

// ─── metadata ──────────────────────────────────────────────────────

describe("FiniteElementMethod1D — metadata", () => {
  it("getMetadata cites Hughes + Strang-Fix, numerical domain, weak_form_fem", () => {
    const meta = FiniteElementMethod1D.getMetadata();
    expect(meta.id).toBe("finite_element_method_1d");
    expect(meta.domain).toBe("numerical");
    expect(meta.category).toBe("weak_form_fem");
    expect(meta.references.some((r) => /Hughes/.test(r.authors))).toBe(true);
    expect(meta.references.some((r) => /Strang/.test(r.authors) && /Fix/.test(r.authors))).toBe(true);
    expect(meta.applicable_materials).toEqual([]);
    expect(meta.limitations.length).toBeGreaterThanOrEqual(3);
  });

  it("h reports L/elements with formula", () => {
    const out = FiniteElementMethod1D.calculate({
      length: 4, elements: 8, a: 1, c: 0, source: () => 0, bc: dirichlet0,
    });
    expect(out.h.value).toBeCloseTo(0.5, 12);
    expect(out.h.formula).toMatch(/L\/elements = 4\/8/);
  });
});
