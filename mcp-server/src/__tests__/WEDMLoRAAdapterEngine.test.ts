/**
 * WEDMLoRAAdapterEngine.test.ts — MS-P4-DL-CORE / U-P4-DL-02
 *
 * Exit-criteria coverage:
 *   • rank is exactly 4 (envelope requirement)
 *   • forward pass matches Hu 2021 §4.1 hand-computed reference ±1%
 *   • backward pass matches finite-difference numerical gradient ±0.5%
 *   • weights serialise + reload bit-exact
 *   • Klocke (base) output unchanged when scale=0 (identity invariant)
 *   • B=0 at init ⇒ ΔW=0 ⇒ forward returns zero vector
 *   • applyGradients is pure (no input mutation)
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LoRAWeightsFileSchema,
  WEDMLoRAAdapterEngine,
  type LoRAAdapter,
} from "../engines/WEDMLoRAAdapterEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// HAND-CRAFTED REFERENCE (Hu 2021 §3 formulation, rank=4)
// ─────────────────────────────────────────────────────────────────────────────
// rank=4, input_dim=2, output_dim=2, alpha=8 ⇒ α/r = 2
//   A = [[1,0],[0,1],[0.5,0.5],[0.3,0.7]]            (4×2)
//   B = [[1,0,0,0],[0,1,0,0]]                          (2×4)
//   x = [1, 2]
//   A·x    = [1, 2, 1.5, 1.7]
//   B·(Ax) = [1, 2]
//   forward = (α/r)·B·A·x = 2·[1,2] = [2, 4]
//
//   gradOutput = [1, 1]
//   gradB = (α/r)·gradOutput ⊗ (A·x) = 2·[[1·1,1·2,1·1.5,1·1.7],[1·1,1·2,1·1.5,1·1.7]]
//         = [[2,4,3,3.4],[2,4,3,3.4]]
//   Bᵀ·gradOutput = [1, 1, 0, 0]
//   gradA = (α/r)·Bᵀ·grad ⊗ x = 2·[[1·1,1·2],[1·1,1·2],[0,0],[0,0]]
//         = [[2,4],[2,4],[0,0],[0,0]]
function referenceAdapter(): LoRAAdapter {
  return {
    name: "hu-2021-reference",
    rank: 4,
    alpha: 8,
    input_dim: 2,
    output_dim: 2,
    A: [
      [1, 0],
      [0, 1],
      [0.5, 0.5],
      [0.3, 0.7],
    ],
    B: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
    ],
    training_steps: 0,
    created_at: "2026-04-21T18:00:00Z",
    base_model: "hand-crafted",
    seed: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

let tmpDir: string;
let tmpFile: string;
let engine: WEDMLoRAAdapterEngine;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wedm-lora-"));
  tmpFile = join(tmpDir, "WEDM_LORA_WEIGHTS.json");
  engine = new WEDMLoRAAdapterEngine({ filePath: tmpFile });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("WEDMLoRAAdapterEngine — Hu 2021 rank-4 LoRA math", () => {
  it("rank is LOCKED at 4 (envelope requirement)", () => {
    expect(engine.rank).toBe(4);
    const a = engine.createAdapter({ name: "t", inputDim: 3, outputDim: 3, seed: 42 });
    expect(a.rank).toBe(4);
    expect(a.A).toHaveLength(4);
    expect(a.B[0]).toHaveLength(4);
  });

  it("forward pass matches hand-computed reference exactly [2, 4]", () => {
    const a = referenceAdapter();
    const y = engine.forward(a, [1, 2]);
    expect(y).toHaveLength(2);
    // Tolerance 1e-12 beats the envelope's ±1% by ~10 orders of magnitude.
    expect(y[0]).toBeCloseTo(2, 12);
    expect(y[1]).toBeCloseTo(4, 12);
  });

  it("forward pass is within ±1% of Hu 2021 §4.1 formulation (envelope gate)", () => {
    const a = referenceAdapter();
    const expected = [2, 4];
    const y = engine.forward(a, [1, 2]);
    for (let i = 0; i < expected.length; i++) {
      const relErr = Math.abs((y[i] - expected[i]) / expected[i]);
      // 0.01 = 1%. Relative error must be strictly under.
      expect(relErr).toBeLessThan(0.01);
    }
  });

  it("backward pass: dL/dA and dL/dB match hand-computed reference", () => {
    const a = referenceAdapter();
    const grads = engine.backward(a, [1, 2], [1, 1]);
    // dL/dB = 2 · [[1,2,1.5,1.7],[1,2,1.5,1.7]]
    const expectedGradB = [
      [2, 4, 3, 3.4],
      [2, 4, 3, 3.4],
    ];
    // dL/dA = 2 · [[1,2],[1,2],[0,0],[0,0]]
    const expectedGradA = [
      [2, 4],
      [2, 4],
      [0, 0],
      [0, 0],
    ];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        expect(grads.gradB[i][j]).toBeCloseTo(expectedGradB[i][j], 12);
      }
    }
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        expect(grads.gradA[i][j]).toBeCloseTo(expectedGradA[i][j], 12);
      }
    }
  });

  it("backward pass matches finite-difference numerical gradient ±0.5%", () => {
    // Random-seeded adapter, verify backward agrees with central-difference
    // approximation of the loss gradient. Loss: L = 0.5 * ||y - target||²
    const a = engine.createAdapter({
      name: "fd-check",
      inputDim: 3,
      outputDim: 2,
      alpha: 4,
      seed: 7,
    });
    // Manually set B to non-zero so the gradient is non-trivial
    a.B = [
      [0.3, -0.2, 0.1, 0.4],
      [0.5, 0.1, -0.3, 0.2],
    ];
    const x = [0.8, -0.4, 0.2];
    const target = [1.0, -0.5];

    // Analytical gradients via backward (dL/dy = y - target)
    const y = engine.forward(a, x);
    const gradOutput = y.map((yi, i) => yi - target[i]);
    const grads = engine.backward(a, x, gradOutput);

    // Numerical gradient for B via central difference
    const h = 1e-5;
    const L = (adapter: LoRAAdapter) => {
      const yOut = engine.forward(adapter, x);
      let s = 0;
      for (let i = 0; i < yOut.length; i++) {
        const d = yOut[i] - target[i];
        s += 0.5 * d * d;
      }
      return s;
    };
    for (let i = 0; i < a.output_dim; i++) {
      for (let j = 0; j < a.rank; j++) {
        const plus = engine.clone(a);
        plus.B[i][j] += h;
        const minus = engine.clone(a);
        minus.B[i][j] -= h;
        const numerical = (L(plus) - L(minus)) / (2 * h);
        const analytical = grads.gradB[i][j];
        // relative error; allow small floor for near-zero grads
        const denom = Math.max(Math.abs(numerical), 1e-6);
        const relErr = Math.abs(numerical - analytical) / denom;
        expect(relErr).toBeLessThan(0.005);
      }
    }
    // Numerical gradient for A
    for (let i = 0; i < a.rank; i++) {
      for (let j = 0; j < a.input_dim; j++) {
        const plus = engine.clone(a);
        plus.A[i][j] += h;
        const minus = engine.clone(a);
        minus.A[i][j] -= h;
        const numerical = (L(plus) - L(minus)) / (2 * h);
        const analytical = grads.gradA[i][j];
        const denom = Math.max(Math.abs(numerical), 1e-6);
        const relErr = Math.abs(numerical - analytical) / denom;
        expect(relErr).toBeLessThan(0.005);
      }
    }
  });

  it("identity invariant at init: B=0 ⇒ forward returns zero vector", () => {
    const a = engine.createAdapter({
      name: "fresh",
      inputDim: 16,
      outputDim: 3,
      seed: 12345,
    });
    // Every entry of B should be exactly 0 at init (Hu 2021 §4.1).
    for (const row of a.B) {
      for (const v of row) expect(v).toBe(0);
    }
    const x = new Array(16).fill(0).map((_, i) => Math.sin(i));
    const y = engine.forward(a, x);
    expect(y).toHaveLength(3);
    for (const yi of y) expect(yi).toBe(0);
  });

  it("identity invariant at scale=0: forwardWithBase returns basePrediction bit-exact", () => {
    // Even with a trained (non-zero) B, scale=0 must leave base unchanged.
    const a = referenceAdapter();
    const basePrediction = [0.75, 42.0];
    engine.setScale(0);
    const out = engine.forwardWithBase(a, [1, 2], basePrediction);
    expect(out).toEqual(basePrediction);
    expect(out[0]).toBe(0.75);
    expect(out[1]).toBe(42.0);
    engine.setScale(1);
  });

  it("forwardWithBase composes additively: y = base + (α/r)·B·A·x", () => {
    const a = referenceAdapter();
    const base = [10, 20];
    const out = engine.forwardWithBase(a, [1, 2], base);
    expect(out[0]).toBeCloseTo(10 + 2, 12);
    expect(out[1]).toBeCloseTo(20 + 4, 12);
  });

  it("serialize → reload bit-exact via file round-trip", () => {
    const a = engine.createAdapter({
      name: "klocke-ra-D2",
      inputDim: 5,
      outputDim: 1,
      alpha: 16,
      seed: 2026,
      baseModel: "Klocke-Ra-v1",
      material: "D2",
    });
    // Mutate B so the test exercises both matrices on disk
    a.B[0] = [0.1, 0.2, 0.3, 0.4];
    engine.saveAdapter(a);
    const raw = readFileSync(tmpFile, "utf8");
    const parsed = LoRAWeightsFileSchema.parse(JSON.parse(raw));
    expect(parsed.schemaVersion).toBe(1);
    const reloaded = parsed.adapters[a.name];
    expect(reloaded).toBeDefined();
    // Deep equality — every weight byte-for-byte.
    expect(reloaded.A).toEqual(a.A);
    expect(reloaded.B).toEqual(a.B);
    expect(reloaded.alpha).toBe(16);
    expect(reloaded.material).toBe("D2");
    expect(reloaded.base_model).toBe("Klocke-Ra-v1");
    expect(reloaded.seed).toBe(2026);
  });

  it("multiple adapters coexist in one file (keyed by name)", () => {
    const a1 = engine.createAdapter({
      name: "klocke-D2",
      inputDim: 4,
      outputDim: 1,
      seed: 1,
      material: "D2",
    });
    const a2 = engine.createAdapter({
      name: "klocke-M2",
      inputDim: 4,
      outputDim: 1,
      seed: 2,
      material: "M2",
    });
    engine.saveAdapter(a1);
    engine.saveAdapter(a2);
    expect(engine.listAdapters().sort()).toEqual(["klocke-D2", "klocke-M2"]);
    expect(engine.getAdapter("klocke-D2")?.material).toBe("D2");
    expect(engine.getAdapter("klocke-M2")?.material).toBe("M2");
    expect(engine.getAdapter("absent")).toBeNull();
  });

  it("deterministic init: same seed produces identical A matrix", () => {
    const a1 = engine.createAdapter({
      name: "s",
      inputDim: 8,
      outputDim: 2,
      seed: 99,
    });
    const a2 = engine.createAdapter({
      name: "s2",
      inputDim: 8,
      outputDim: 2,
      seed: 99,
    });
    expect(a1.A).toEqual(a2.A);
  });

  it("different seeds produce different A matrices", () => {
    const a1 = engine.createAdapter({
      name: "s",
      inputDim: 4,
      outputDim: 2,
      seed: 1,
    });
    const a2 = engine.createAdapter({
      name: "s",
      inputDim: 4,
      outputDim: 2,
      seed: 2,
    });
    expect(a1.A).not.toEqual(a2.A);
  });

  it("forward throws on input-dim mismatch", () => {
    const a = referenceAdapter();
    expect(() => engine.forward(a, [1, 2, 3])).toThrowError(/input_dim/);
  });

  it("applyGradients is pure (does not mutate input adapter)", () => {
    const a = referenceAdapter();
    const snapshotA = JSON.parse(JSON.stringify(a.A));
    const snapshotB = JSON.parse(JSON.stringify(a.B));
    const grads = engine.backward(a, [1, 2], [1, 1]);
    const a2 = engine.applyGradients(a, grads, 0.01);
    // Input adapter unchanged
    expect(a.A).toEqual(snapshotA);
    expect(a.B).toEqual(snapshotB);
    expect(a.training_steps).toBe(0);
    // New adapter has updated state
    expect(a2.training_steps).toBe(1);
    expect(a2.A).not.toEqual(a.A);
    expect(a2.B).not.toEqual(a.B);
  });

  it("SGD reduces a quadratic loss over several steps", () => {
    // Sanity check the full training loop: after 200 steps of SGD on a
    // random target, loss should strictly decrease.
    let a = engine.createAdapter({
      name: "sgd-sanity",
      inputDim: 3,
      outputDim: 2,
      alpha: 4,
      seed: 13,
    });
    // Non-zero B (so backward has gradient signal through A too)
    a = engine.applyGradients(
      a,
      { gradA: a.A.map((r) => r.map(() => 0)), gradB: a.B.map((r) => r.map(() => -0.1)) },
      1.0,
    );
    const x = [0.5, -0.3, 0.8];
    const target = [1.2, -0.4];
    const lossOf = (adapter: LoRAAdapter) => {
      const y = engine.forward(adapter, x);
      let s = 0;
      for (let i = 0; i < y.length; i++) {
        const d = y[i] - target[i];
        s += 0.5 * d * d;
      }
      return s;
    };
    const L0 = lossOf(a);
    let lr = 0.05;
    for (let step = 0; step < 200; step++) {
      const y = engine.forward(a, x);
      const gradOutput = y.map((yi, i) => yi - target[i]);
      const grads = engine.backward(a, x, gradOutput);
      a = engine.applyGradients(a, grads, lr);
    }
    const L1 = lossOf(a);
    expect(L1).toBeLessThan(L0 * 0.1); // ≥ 10× reduction
  });

  it("schema rejects non-rank-4 adapter on load", () => {
    const bad = {
      schemaVersion: 1,
      generated_at: "2026-04-21T00:00:00Z",
      adapters: {
        bad: {
          name: "bad",
          rank: 2, // violates z.literal(4)
          alpha: 8,
          input_dim: 2,
          output_dim: 2,
          A: [
            [1, 0],
            [0, 1],
          ],
          B: [
            [1, 0],
            [0, 1],
          ],
          training_steps: 0,
          created_at: "2026-04-21T00:00:00Z",
        },
      },
    };
    expect(() => LoRAWeightsFileSchema.parse(bad)).toThrowError();
  });

  it("setScale rejects non-finite values", () => {
    expect(() => engine.setScale(Number.NaN)).toThrowError(/finite/);
    expect(() => engine.setScale(Number.POSITIVE_INFINITY)).toThrowError(/finite/);
  });

  it("scale multiplies forward output linearly", () => {
    const a = referenceAdapter();
    engine.setScale(1);
    const y1 = engine.forward(a, [1, 2]);
    engine.setScale(3);
    const y3 = engine.forward(a, [1, 2]);
    for (let i = 0; i < y1.length; i++) {
      expect(y3[i]).toBeCloseTo(3 * y1[i], 12);
    }
    engine.setScale(1);
  });
});
