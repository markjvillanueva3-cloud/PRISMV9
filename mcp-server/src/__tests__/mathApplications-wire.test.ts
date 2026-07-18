import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { registerQualityDispatcher } from "../tools/dispatchers/qualityDispatcher.js";

/**
 * Round-trip WIRE tests for the 5 MATH-APPLICATIONS engines through their dispatchers
 * (prism_calc: mesh_topology_invariants / tda_condition_monitor / importance_sampling_reliability;
 *  prism_dev: commutative_diagram_validate; prism_quality: distribution_drift_detect).
 *
 * These invoke THROUGH the dispatcher (not the engine singleton) so a broken action enum / lazy
 * import / schema / snake->camel normalization surfaces as a divergence. The deep math is covered
 * by each engine's own unit tests; here we assert the wiring routes and returns the real result.
 */
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }
function capture(register: (server: any) => void): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  register(server);
  return tools[0];
}
async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}

describe("MATH-APPLICATIONS dispatcher wiring (round-trip)", () => {
  const calc = capture(registerCalcDispatcher);
  const dev = capture(registerDevDispatcher);
  const quality = capture(registerQualityDispatcher);

  it("prism_quality distribution_drift_detect -> Wasserstein W1 = 5, severe drift", async () => {
    // qualityDispatcher wraps as { success, data } -> result is under .data
    const r = await call(quality, "distribution_drift_detect", { baseline: [1, 2, 3], current: [6, 7, 8], tolerance: 1, metric: "w1" });
    expect(r.data.distance).toBeCloseTo(5, 10); // mean(|1-6|,|2-7|,|3-8|) = 5
    expect(r.data.drifted).toBe(true);
    expect(r.data.severity).toBe("severe"); // ratio 5 > 4
  });

  it("prism_quality distribution_drift_detect -> identical samples, W = 0, no drift", async () => {
    const r = await call(quality, "distribution_drift_detect", { baseline: [1, 2, 3], current: [1, 2, 3], tolerance: 0.5 });
    expect(r.data.distance).toBe(0);
    expect(r.data.drifted).toBe(false);
  });

  it("prism_calc mesh_topology_invariants -> tetrahedron chi=2, 1 component, watertight, genus 0", async () => {
    const tetra = { vertices: 4, faces: [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]] };
    const r = await call(calc, "mesh_topology_invariants", tetra);
    expect(r.eulerCharacteristic).toBe(2); // chi = V-E+F = 4-6+4
    expect(r.components).toBe(1);
    expect(r.isManifold).toBe(true);
    expect(r.isWatertight).toBe(true);
    expect(r.betti.b0).toBe(1); // b0 = connected components (winding-independent)
  });

  it("prism_calc tda_condition_monitor -> a clean sine wave yields >=1 significant persistent loop", async () => {
    const series = Array.from({ length: 240 }, (_, i) => Math.sin((2 * Math.PI * i) / 24));
    const r = await call(calc, "tda_condition_monitor", { series, dimension: 2 });
    expect(r.embedding.dimension).toBe(2);
    expect(r.significantLoopCount).toBeGreaterThanOrEqual(1); // periodic signal embeds to a loop
  });

  it("prism_calc importance_sampling_reliability -> P(Z>4.5) ~ 3.4e-6 via a JSON linear limit state", async () => {
    // g(x) = 4.5 - x ; failure (below, g<=0) when x >= 4.5 ; standard-normal input N(0,1)
    const r = await call(calc, "importance_sampling_reliability", {
      mean: [0], std: [1], coefficients: [1], failure_threshold: 4.5, n_samples: 40000, seed: 42,
    });
    expect(r.failureProbability).toBeGreaterThan(1e-6);
    expect(r.failureProbability).toBeLessThan(1e-5); // exact 3.40e-6, IS recovers it
    expect(r.varianceReductionRatio).toBeGreaterThan(1); // IS beats naive MC on the rare tail
  });

  it("prism_dev commutative_diagram_validate -> disjoint field rewrites commute", async () => {
    const r = await call(dev, "commutative_diagram_validate", {
      specA: { kind: "scale", field: "feed", factor: 2 },
      specB: { kind: "map", field: "spindle", table: { M03: "M3" } },
      inputs: [{ feed: 10, spindle: "M03" }],
    });
    expect(r.commutes).toBe(true);
  });

  it("prism_dev commutative_diagram_validate -> scale vs clamp do NOT commute (counterexample surfaced)", async () => {
    const r = await call(dev, "commutative_diagram_validate", {
      specA: { kind: "scale", field: "feed", factor: 2 },
      specB: { kind: "clamp", field: "feed", max: 100 },
      inputs: [{ feed: 60 }], // scale->120->clamp->100  vs  clamp->60->scale->120
    });
    expect(r.commutes).toBe(false);
    expect(r.counterexample).toBeTruthy();
  });
});
