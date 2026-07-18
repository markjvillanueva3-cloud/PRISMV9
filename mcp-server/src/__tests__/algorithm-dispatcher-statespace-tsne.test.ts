/**
 * U-ALGO-WIRE-ORPHANS guard (slot:bravo 2026-06-19).
 *
 * The ENGINE-ALGORITHM-FORMULA audit surfaced 3 complete-but-orphaned MIT-OCW algorithm ports
 * (not in AlgorithmRegistry, imported by no engine, absent from the gateway catalog). This wires
 * ALL 3 into prism_algorithm. These tests round-trip each new action THROUGH the real
 * algorithmDispatcher (R15: not the singleton in isolation) with hand-computed reference values
 * and deterministic invariants.
 *
 *  - control_statespace -> LinearStateSpaceModel: state-space (A,B,C,D) analysis. Reference system
 *    A=[[0,1],[-2,-3]] (eigenvalues -1,-2; char poly s^2+3s+2), fully controllable + observable.
 *  - ml_tsne -> TSNEAlgorithm.embed: nonlinear dim-reduction. Seeded mulberry32 RNG (integer seed)
 *    makes the stochastic embedding deterministic -> reproducibility is the load-bearing assertion.
 *  - num_fem_1d -> FiniteElementMethod1D: 1D linear FEM BVP solver. source(x) is serialized from a
 *    source_spec at the boundary. Reference: -u''=0, u(0)=0,u(1)=1 -> exact linear u(x)=x (1D linear
 *    FEM is nodally exact); -u''=2, u(0)=u(1)=0 -> u=x(1-x), max 0.25 at x=0.5 (nodally exact).
 */
import { describe, expect, it } from "vitest";

import { registerAlgorithmDispatcher } from "../tools/dispatchers/algorithmDispatcher.js";

interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }
function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  return { server: { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } }, tools };
}
async function callAction(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<{ raw: any; isError: boolean; json: any }> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return { raw: result, isError: result?.isError === true, json: text ? JSON.parse(text) : result };
}

const { server, tools } = createMockServer();
registerAlgorithmDispatcher(server);
const algoTool = tools.find((t) => t.name === "prism_algorithm")!;

// Controllable + observable 2nd-order system: x'' + 3x' + 2x = u  (companion form).
const SYS = {
  A: [[0, 1], [-2, -3]],
  B: [[0], [1]],
  C: [[1, 0]],
  D: [[0]],
};

describe("prism_algorithm:control_statespace (LinearStateSpaceModel round-trip)", () => {
  it("registers the dispatcher hosting the new actions", () => {
    expect(algoTool?.name).toBe("prism_algorithm");
  });

  it("computes the characteristic polynomial of A (s^2+3s+2 -> |coeffs|={1,2,3})", async () => {
    const { isError, json } = await callAction(algoTool, "control_statespace", { input: { ...SYS } });
    expect(isError).toBe(false);
    expect(Array.isArray(json.char_poly)).toBe(true);
    expect(json.char_poly).toHaveLength(3); // degree-2 polynomial -> 3 coefficients
    const mags = json.char_poly.map((c: any) => Math.abs(c.value)).sort((a: number, b: number) => a - b);
    expect(mags[0]).toBeCloseTo(1, 6);
    expect(mags[1]).toBeCloseTo(2, 6);
    expect(mags[2]).toBeCloseTo(3, 6);
  });

  it("default operation returns a transfer function whose denominator is the char poly", async () => {
    const { isError, json } = await callAction(algoTool, "control_statespace", { input: { ...SYS } });
    expect(isError).toBe(false);
    expect(json.operation).toBe("transfer_function");
    expect(Array.isArray(json.transfer_function.num)).toBe(true);
    expect(Array.isArray(json.transfer_function.den)).toBe(true);
    // denominator of a SISO TF is the char poly: s^2+3s+2 -> largest |coeff| = 3
    const den = json.transfer_function.den.map((x: number) => Math.abs(x)).sort((a: number, b: number) => a - b);
    expect(den[den.length - 1]).toBeCloseTo(3, 6);
  });

  it("operation 'ranks' proves controllability + observability (rank 2 each)", async () => {
    const { isError, json } = await callAction(algoTool, "control_statespace", { input: { ...SYS, operation: "ranks" } });
    expect(isError).toBe(false);
    expect(json.ranks.n).toBe(2);
    expect(json.ranks.controllability).toBe(2);
    expect(json.ranks.observability).toBe(2);
    expect(json.ranks.controllable).toBe(true);
    expect(json.ranks.observable).toBe(true);
  });

  it("an UNCONTROLLABLE mode reports controllable:false (intent check, R9)", async () => {
    // A=diag(-1,-2), B touches only mode 1 -> mode 2 unreachable -> controllability rank 1.
    const { isError, json } = await callAction(algoTool, "control_statespace", {
      input: { A: [[-1, 0], [0, -2]], B: [[1], [0]], C: [[1, 1]], D: [[0]], operation: "ranks" },
    });
    expect(isError).toBe(false);
    expect(json.ranks.controllability).toBe(1);
    expect(json.ranks.controllable).toBe(false);
  });

  it("rejects operation 'simulate' (needs a non-serializable u(t) function) -- fail loud", async () => {
    const { isError, json } = await callAction(algoTool, "control_statespace", { input: { ...SYS, operation: "simulate" } });
    expect(isError).toBe(true);
    expect(json.error).toMatch(/simulate/);
  });

  it("rejects a missing input param", async () => {
    const { isError, json } = await callAction(algoTool, "control_statespace", {});
    expect(isError).toBe(true);
    expect(json.error).toMatch(/Missing required param: input/);
  });

  it("rejects a non-square / dimension-mismatched system (validate path)", async () => {
    const { isError } = await callAction(algoTool, "control_statespace", {
      input: { A: [[0, 1, 0], [-2, -3, 0]], B: [[0], [1]], C: [[1, 0]], D: [[0]] }, // A is 2x3, not square
    });
    expect(isError).toBe(true);
  });
});

describe("prism_algorithm:ml_tsne (TSNEAlgorithm.embed round-trip)", () => {
  // Two well-separated clusters in 4-D. n=10 points (> perplexity).
  const clusterA = Array.from({ length: 5 }, (_, i) => [0 + i * 0.01, 0, 0, 0]);
  const clusterB = Array.from({ length: 5 }, (_, i) => [10 + i * 0.01, 10, 10, 10]);
  const X = [...clusterA, ...clusterB];

  it("embeds n points into the requested dimensionality with all-finite coordinates", async () => {
    const { isError, json } = await callAction(algoTool, "ml_tsne", { X, dims: 2, perplexity: 3, max_iter: 250, seed: 42 });
    expect(isError).toBe(false);
    expect(json.Y).toHaveLength(10);
    expect(json.Y.every((p: number[]) => p.length === 2)).toBe(true);
    expect(json.Y.every((p: number[]) => p.every((v) => Number.isFinite(v)))).toBe(true);
    expect(json.iterations).toBeGreaterThan(0);
  });

  it("is DETERMINISTIC for a fixed integer seed (the whole point of the seed param, R9)", async () => {
    const a = await callAction(algoTool, "ml_tsne", { X, dims: 2, perplexity: 3, max_iter: 200, seed: 123 });
    const b = await callAction(algoTool, "ml_tsne", { X, dims: 2, perplexity: 3, max_iter: 200, seed: 123 });
    expect(a.json.Y).toEqual(b.json.Y); // identical embedding for identical seed
  });

  it("produces a DIFFERENT embedding for a different seed", async () => {
    const a = await callAction(algoTool, "ml_tsne", { X, dims: 2, perplexity: 3, max_iter: 200, seed: 1 });
    const b = await callAction(algoTool, "ml_tsne", { X, dims: 2, perplexity: 3, max_iter: 200, seed: 2 });
    expect(a.json.Y).not.toEqual(b.json.Y);
  });

  it("rejects X with fewer than 2 points", async () => {
    const { isError, json } = await callAction(algoTool, "ml_tsne", { X: [[1, 2, 3]] });
    expect(isError).toBe(true);
    expect(json.error).toMatch(/X/);
  });

  it("rejects a missing X param", async () => {
    const { isError } = await callAction(algoTool, "ml_tsne", {});
    expect(isError).toBe(true);
  });
});

describe("prism_algorithm:num_fem_1d (FiniteElementMethod1D round-trip)", () => {
  const dirichlet = (value: number) => ({ kind: "dirichlet", value });

  it("solves -u''=0 with u(0)=0,u(1)=1 exactly (linear solution u(x)=x, nodally exact)", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {
      input: {
        length: 1, elements: 4, a: 1, c: 0,
        source_spec: { type: "constant", value: 0 },
        bc: { left: dirichlet(0), right: dirichlet(1) },
      },
    });
    expect(isError).toBe(false);
    expect(json.nodes).toEqual([0, 0.25, 0.5, 0.75, 1]);
    // 1D linear FEM is nodally exact for the Poisson problem: u == nodes.
    json.solution.forEach((u: number, i: number) => expect(u).toBeCloseTo(json.nodes[i], 9));
    expect(json.solution_max_abs).toBeCloseTo(1, 9);
  });

  it("solves -u''=2 with u(0)=u(1)=0 -> u=x(1-x), max 0.25 at x=0.5 (nodally exact)", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {
      input: {
        length: 1, elements: 10, a: 1, c: 0,
        source_spec: { type: "constant", value: 2 },
        bc: { left: dirichlet(0), right: dirichlet(0) },
      },
    });
    expect(isError).toBe(false);
    const mid = json.nodes.indexOf(0.5);
    expect(mid).toBeGreaterThan(-1);
    expect(json.solution[mid]).toBeCloseTo(0.25, 6); // x(1-x) at x=0.5
    expect(json.solution_max_abs).toBeCloseTo(0.25, 6);
  });

  it("accepts a polynomial source_spec (f(x)=x -> ascending coeffs [0,1])", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {
      input: {
        length: 1, elements: 8, a: 1, c: 0,
        source_spec: { type: "polynomial", coeffs: [0, 1] }, // f(x) = 0 + 1*x
        bc: { left: dirichlet(0), right: dirichlet(0) },
      },
    });
    expect(isError).toBe(false);
    // -u''=x, u(0)=u(1)=0 -> u=(x - x^3)/6, strictly positive interior, max ~0.0642 near x~0.577
    expect(json.solution_max_abs).toBeGreaterThan(0);
    expect(json.solution_max_abs).toBeLessThan(0.07);
  });

  it("defaults to a zero source when source_spec is omitted (still solves the BVP)", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {
      input: { length: 2, elements: 4, a: 1, c: 0, bc: { left: dirichlet(0), right: dirichlet(2) } },
    });
    expect(isError).toBe(false);
    // -u''=0, u(0)=0,u(2)=2 -> u(x)=x; nodally exact.
    json.solution.forEach((u: number, i: number) => expect(u).toBeCloseTo(json.nodes[i], 9));
  });

  it("rejects an unknown source_spec.type -- fail loud", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {
      input: {
        length: 1, elements: 4, a: 1, c: 0,
        source_spec: { type: "exponential" },
        bc: { left: dirichlet(0), right: dirichlet(1) },
      },
    });
    expect(isError).toBe(true);
    expect(json.error).toMatch(/Unknown source_spec\.type/);
  });

  it("rejects a polynomial source_spec with no coeffs", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {
      input: {
        length: 1, elements: 4, a: 1, c: 0,
        source_spec: { type: "polynomial" },
        bc: { left: dirichlet(0), right: dirichlet(1) },
      },
    });
    expect(isError).toBe(true);
    expect(json.error).toMatch(/coeffs/);
  });

  it("rejects an invalid mesh (elements < 1) via the engine validate path", async () => {
    const { isError } = await callAction(algoTool, "num_fem_1d", {
      input: {
        length: 1, elements: 0, a: 1, c: 0,
        source_spec: { type: "constant", value: 0 },
        bc: { left: dirichlet(0), right: dirichlet(1) },
      },
    });
    expect(isError).toBe(true);
  });

  it("rejects a missing input param", async () => {
    const { isError, json } = await callAction(algoTool, "num_fem_1d", {});
    expect(isError).toBe(true);
    expect(json.error).toMatch(/Missing required param: input/);
  });
});
