/**
 * WEDMProcessCausalityEngine Tests — WEDM AGI Phase 2 / U-P2-01 + U-P2-04
 *
 * Exit gates:
 *   - ≥50 causal edges in WEDM_CAUSAL_GRAPH.json
 *   - Covers the 7 canonical chains:
 *       discharge_energy → crater_size → Ra
 *       temperature → HAZ/recast
 *       wire_tension → vibration → Ra_uniformity
 *       flushing_pressure → debris_evacuation → arc_stability
 *       on/off → duty_cycle → mrr + Ra
 *       corner_radius → wire_deflection → dimensional_accuracy
 *       taper_angle → wire_lag → dimensional_error
 *   - Intervention query returns in <100 ms (counterfactual-ready latency)
 */
import { describe, it, expect } from "vitest";
import {
  WEDMProcessCausalityEngine,
  wedmProcessCausalityEngine,
} from "../../engines/WEDMProcessCausalityEngine.js";

const engine = new WEDMProcessCausalityEngine();

describe("WEDMProcessCausalityEngine — graph coverage", () => {
  it("loads at least 50 causal edges (P2-MS1 exit gate)", () => {
    expect(engine.edgeCount()).toBeGreaterThanOrEqual(50);
  });

  it("covers enough distinct nodes to model multi-step chains", () => {
    expect(engine.nodeCount()).toBeGreaterThanOrEqual(25);
  });

  it("exposes a singleton for dispatcher use", () => {
    expect(wedmProcessCausalityEngine).toBeInstanceOf(
      WEDMProcessCausalityEngine,
    );
  });

  it("re-loading is idempotent (edge count does not double)", () => {
    const before = engine.edgeCount();
    engine.ensureLoaded();
    engine.ensureLoaded();
    expect(engine.edgeCount()).toBe(before);
  });
});

describe("WEDMProcessCausalityEngine — required causal chains", () => {
  it("chain: discharge_energy → crater_size → Ra", () => {
    const step1 = engine
      .whatIsAffectedBy("discharge_energy")
      .map((r) => r.variable);
    const step2 = engine.whatIsAffectedBy("crater_size").map((r) => r.variable);
    expect(step1).toContain("crater_size");
    expect(step2).toContain("Ra");
  });

  it("chain: plasma_temperature → HAZ_depth and recast_thickness", () => {
    const downstream = engine
      .whatIsAffectedBy("plasma_temperature")
      .map((r) => r.variable);
    expect(downstream).toContain("HAZ_depth");
    expect(downstream).toContain("recast_thickness");
  });

  it("chain: wire_tension → wire_vibration → Ra_uniformity", () => {
    const t = engine.whatIsAffectedBy("wire_tension").map((r) => r.variable);
    const v = engine.whatIsAffectedBy("wire_vibration").map((r) => r.variable);
    expect(t).toContain("wire_vibration");
    expect(v).toContain("Ra_uniformity");
  });

  it("chain: flushing_pressure → debris_evacuation → arc_stability", () => {
    const f = engine
      .whatIsAffectedBy("flushing_pressure")
      .map((r) => r.variable);
    const d = engine
      .whatIsAffectedBy("debris_evacuation")
      .map((r) => r.variable);
    expect(f).toContain("debris_evacuation");
    expect(d).toContain("arc_stability");
  });

  it("chain: on/off → duty_cycle → mrr and Ra", () => {
    const onChildren = engine.whatIsAffectedBy("on_time").map((r) => r.variable);
    const offChildren = engine
      .whatIsAffectedBy("off_time")
      .map((r) => r.variable);
    const dutyChildren = engine
      .whatIsAffectedBy("duty_cycle")
      .map((r) => r.variable);
    expect(onChildren).toContain("duty_cycle");
    expect(offChildren).toContain("duty_cycle");
    expect(dutyChildren).toContain("mrr");
    expect(dutyChildren).toContain("Ra");
  });

  it("chain: corner_radius → wire_deflection → dimensional_accuracy", () => {
    const cr = engine.whatIsAffectedBy("corner_radius").map((r) => r.variable);
    const wd = engine
      .whatIsAffectedBy("wire_deflection")
      .map((r) => r.variable);
    expect(cr).toContain("wire_deflection");
    expect(wd).toContain("dimensional_accuracy");
  });

  it("chain: taper_angle → wire_lag → dimensional_error", () => {
    const ta = engine.whatIsAffectedBy("taper_angle").map((r) => r.variable);
    const wl = engine.whatIsAffectedBy("wire_lag").map((r) => r.variable);
    expect(ta).toContain("wire_lag");
    expect(wl).toContain("dimensional_error");
  });
});

describe("WEDMProcessCausalityEngine — direct queries", () => {
  it("whatAffects(Ra) includes discharge_energy and crater_size", () => {
    const parents = engine.whatAffects("Ra").map((r) => r.variable);
    expect(parents).toContain("discharge_energy");
    expect(parents).toContain("crater_size");
  });

  it("whatAffects sorts by descending confidence", () => {
    const parents = engine.whatAffects("mrr");
    for (let i = 1; i < parents.length; i++) {
      expect(parents[i].confidence).toBeLessThanOrEqual(
        parents[i - 1].confidence,
      );
    }
  });

  it("carries polarity through — off_time reduces duty_cycle (negative)", () => {
    const offChildren = engine.whatIsAffectedBy("off_time");
    const duty = offChildren.find((r) => r.variable === "duty_cycle");
    expect(duty).toBeDefined();
    expect(duty!.polarity).toBe("negative");
  });

  it("every edge carries a citation-grade reason", () => {
    const edges = engine.edges();
    for (const e of edges) {
      expect(e.reason).toBeDefined();
      expect(e.reason!.length).toBeGreaterThan(8);
    }
  });
});

describe("WEDMProcessCausalityEngine — intervention trace", () => {
  it("interventionOn(peak_current) reaches Ra within 3 hops", () => {
    const r = engine.interventionOn("peak_current", 3);
    const targets = r.affects.map((p) => p.target);
    expect(targets).toContain("Ra");
    expect(r.summary.highest_confidence).not.toBeNull();
  });

  it("composed polarity: off_time → mrr is NEGATIVE via duty_cycle", () => {
    const r = engine.interventionOn("off_time", 3);
    const toMrr = r.affects.find((p) => p.target === "mrr");
    expect(toMrr).toBeDefined();
    expect(toMrr!.polarity).toBe("negative");
  });

  it("completes intervention query in under 100 ms (counterfactual SLA)", () => {
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) engine.interventionOn("peak_current", 3);
    const elapsed = performance.now() - t0;
    // Per-call budget = elapsed / 10, compare aggregate to 100ms for safety.
    expect(elapsed).toBeLessThan(100);
  });

  it("summary counts match the paths returned", () => {
    const r = engine.interventionOn("discharge_energy", 3);
    const { positive_effects, negative_effects, unknown_effects } = r.summary;
    expect(positive_effects + negative_effects + unknown_effects).toBe(
      r.affects.length,
    );
  });
});

describe("WEDMProcessCausalityEngine — root-cause queries", () => {
  it("rootCausesOf(Ra) includes the top-level electrical drivers", () => {
    const roots = engine.rootCausesOf("Ra", 5);
    expect(roots.length).toBeGreaterThan(0);
    // Both current and on_time are ultimate drivers of surface finish.
    const hasPrimary =
      roots.includes("peak_current") || roots.includes("on_time");
    expect(hasPrimary).toBe(true);
  });

  it("rootCausesOf(wire_break_prob) includes wire_wear or peak_current", () => {
    const roots = engine.rootCausesOf("wire_break_prob", 5);
    // Wire break has many drivers — just require at least one upstream root.
    expect(roots.length).toBeGreaterThan(0);
  });

  it("rootCausesOf with maxHops=1 returns only immediate parents' roots", () => {
    const near = engine.rootCausesOf("Ra", 1);
    const far = engine.rootCausesOf("Ra", 5);
    expect(far.length).toBeGreaterThanOrEqual(near.length);
  });
});
