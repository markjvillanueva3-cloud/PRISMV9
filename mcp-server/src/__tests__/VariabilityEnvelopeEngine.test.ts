/**
 * VariabilityEnvelopeEngine tests
 *
 * Probabilistic parameter-boundary engine — stateful (in-memory envelope +
 * outlier Maps), seeded with 8 default manufacturing-parameter envelopes.
 * The exported `class` lets each test use a fresh `new` instance so no shared
 * singleton state leaks between cases.
 *
 * Expected percentile values are hand-derived from the engine's piecewise-linear
 * calculatePercentile() against the seeded `spindle_rpm` envelope
 * (p50=8000, p95=12000, p99=15000, p999=18000). Negative-path tests assert the
 * observable consequence (envelope unchanged / nothing added), not just a bare
 * null/undefined return.
 */

import { describe, it, expect } from "vitest";
import {
  VariabilityEnvelopeEngine,
  variabilityEnvelopeEngine,
  type VariabilityEnvelope,
} from "../engines/VariabilityEnvelopeEngine.js";

/** A complete, strictly-monotone envelope for set/import tests. */
function makeEnvelope(overrides: Partial<VariabilityEnvelope> = {}): VariabilityEnvelope {
  return {
    parameter: "custom_param",
    nominal: 100,
    unit: "units",
    distribution: "lognormal",
    p50: 100,
    p95: 200,
    p99: 300,
    p999: 500,
    outlierCapture: true,
    sampleCount: 500,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe("VariabilityEnvelopeEngine", () => {
  describe("constructor — default envelopes", () => {
    it("seeds 8 default manufacturing-parameter envelopes", () => {
      const eng = new VariabilityEnvelopeEngine();
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(8);
    });

    it("seeds spindle_rpm with the documented percentile boundaries", () => {
      const eng = new VariabilityEnvelopeEngine();
      const env = eng.getEnvelope("spindle_rpm")!;
      expect(env.p50).toBe(8000);
      expect(env.p95).toBe(12000);
      expect(env.p99).toBe(15000);
      expect(env.p999).toBe(18000);
      expect(env.sampleCount).toBe(1000);
    });

    it("seeds feed_rate with nominal 500 mm/min", () => {
      const eng = new VariabilityEnvelopeEngine();
      expect(eng.getEnvelope("feed_rate")?.nominal).toBe(500);
      expect(eng.getEnvelope("feed_rate")?.unit).toBe("mm/min");
    });

    it("every seeded envelope is strictly monotone (p50 < p95 < p99 < p999)", () => {
      const eng = new VariabilityEnvelopeEngine();
      for (const env of Object.values(eng.exportEnvelopes())) {
        expect(env.p50).toBeLessThan(env.p95);
        expect(env.p95).toBeLessThan(env.p99);
        expect(env.p99).toBeLessThan(env.p999);
      }
    });
  });

  describe("evaluate — percentile bands & recommendations", () => {
    it("value at p50 → percentile 0.5, recommendation 'accept'", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.evaluate("spindle_rpm", 8000);
      expect(r.percentile).toBeCloseTo(0.5, 5);
      expect(r.recommendation).toBe("accept");
      expect(r.isOutlier).toBe(false);
    });

    it("value below p50 → proportionally lower percentile", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.evaluate("spindle_rpm", 4000); // 0.5 * (4000/8000)
      expect(r.percentile).toBeCloseTo(0.25, 5);
      expect(r.recommendation).toBe("accept");
    });

    it("value at p95 → percentile 0.95, still 'accept' (band is <= 0.95)", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.evaluate("spindle_rpm", 12000);
      expect(r.percentile).toBeCloseTo(0.95, 5);
      expect(r.recommendation).toBe("accept");
    });

    it("value between p50 and p95 → interpolated percentile", () => {
      const eng = new VariabilityEnvelopeEngine();
      // 0.5 + 0.45 * ((10000-8000)/(12000-8000)) = 0.5 + 0.225 = 0.725
      const r = eng.evaluate("spindle_rpm", 10000);
      expect(r.percentile).toBeCloseTo(0.725, 5);
      expect(r.recommendation).toBe("accept");
    });

    it("value at p99 → percentile 0.99, recommendation 'caution'", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.evaluate("spindle_rpm", 15000);
      expect(r.percentile).toBeCloseTo(0.99, 5);
      expect(r.recommendation).toBe("caution");
    });

    it("value between p95 and p99 → 'caution'", () => {
      const eng = new VariabilityEnvelopeEngine();
      // 0.95 + 0.04 * ((13500-12000)/(15000-12000)) = 0.95 + 0.02 = 0.97
      const r = eng.evaluate("spindle_rpm", 13500);
      expect(r.percentile).toBeCloseTo(0.97, 5);
      expect(r.recommendation).toBe("caution");
    });

    it("value at p999 → percentile 0.999, recommendation 'extreme', NOT an outlier", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.evaluate("spindle_rpm", 18000);
      expect(r.percentile).toBeCloseTo(0.999, 5);
      expect(r.recommendation).toBe("extreme");
      expect(r.isOutlier).toBe(false); // isOutlier is strictly > 0.999
    });

    it("value between p99 and p999 → 'extreme'", () => {
      const eng = new VariabilityEnvelopeEngine();
      // 0.99 + 0.009 * ((16500-15000)/(18000-15000)) = 0.99 + 0.0045 = 0.9945
      const r = eng.evaluate("spindle_rpm", 16500);
      expect(r.percentile).toBeCloseTo(0.9945, 5);
      expect(r.recommendation).toBe("extreme");
    });

    it("value far above p999 → percentile clamps to 1.0, recommendation 'outlier'", () => {
      const eng = new VariabilityEnvelopeEngine();
      // 0.999 + 0.001 * min(1, (36000-18000)/18000) = 0.999 + 0.001 = 1.0
      const r = eng.evaluate("spindle_rpm", 36000);
      expect(r.percentile).toBeCloseTo(1.0, 5);
      expect(r.recommendation).toBe("outlier");
      expect(r.isOutlier).toBe(true);
    });

    it("value moderately above p999 → 'outlier' with percentile between 0.999 and 1.0", () => {
      const eng = new VariabilityEnvelopeEngine();
      // 0.999 + 0.001 * min(1, (27000-18000)/18000) = 0.999 + 0.0005 = 0.9995
      const r = eng.evaluate("spindle_rpm", 27000);
      expect(r.percentile).toBeCloseTo(0.9995, 5);
      expect(r.isOutlier).toBe(true);
      expect(r.recommendation).toBe("outlier");
    });

    it("confidence reflects sampleCount/1000 capped at 0.99 (seeded envelopes → 0.99)", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.evaluate("spindle_rpm", 8000);
      expect(r.confidence).toBe(0.99); // min(0.99, 1000/1000)
    });

    it("unknown parameter → low-confidence 'caution' result and a freshly minted envelope", () => {
      const eng = new VariabilityEnvelopeEngine();
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(8); // not present yet
      const r = eng.evaluate("mystery_param", 42);
      expect(r.confidence).toBe(0.1);
      expect(r.recommendation).toBe("caution");
      expect(r.percentile).toBe(0.5);
      // SIDE EFFECT: evaluate() on an unknown parameter stores a default envelope
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(9);
      expect(eng.getEnvelope("mystery_param")?.nominal).toBe(42);
    });

    it("captures an outlier into the buffer when outlierCapture is on", () => {
      const eng = new VariabilityEnvelopeEngine();
      eng.evaluate("spindle_rpm", 36000); // outlier
      const buffer = eng.getOutlierBuffer();
      expect(buffer.get("spindle_rpm")).toEqual([36000]);
    });

    it("does NOT capture in-band values into the outlier buffer", () => {
      const eng = new VariabilityEnvelopeEngine();
      eng.evaluate("spindle_rpm", 10000); // in-band — percentile 0.725, not an outlier
      expect(eng.getOutlierBuffer().size).toBe(0);
    });

    it("outlier buffer is bounded to 100 entries (FIFO)", () => {
      const eng = new VariabilityEnvelopeEngine();
      for (let i = 0; i < 105; i++) eng.evaluate("spindle_rpm", 36000 + i);
      const buf = eng.getOutlierBuffer().get("spindle_rpm")!;
      expect(buf).toHaveLength(100);
      // FIFO: the first 5 were shifted out, so the oldest retained is 36000+5
      expect(buf[0]).toBe(36005);
    });
  });

  describe("getEnvelope / setEnvelope", () => {
    it("getEnvelope returns the seeded envelope's data for a known parameter", () => {
      const eng = new VariabilityEnvelopeEngine();
      expect(eng.getEnvelope("depth_of_cut")?.unit).toBe("mm");
      expect(eng.getEnvelope("depth_of_cut")?.p50).toBe(2);
    });

    it("getEnvelope yields no entry for an unknown parameter (not in the export set)", () => {
      const eng = new VariabilityEnvelopeEngine();
      expect(Object.keys(eng.exportEnvelopes())).not.toContain("nonexistent");
      expect(eng.getEnvelope("nonexistent")).toBe(undefined);
    });

    it("setEnvelope stores a new envelope and refreshes lastUpdated", () => {
      const eng = new VariabilityEnvelopeEngine();
      const stale = makeEnvelope({ parameter: "torque", lastUpdated: "2020-01-01T00:00:00.000Z" });
      eng.setEnvelope("torque", stale);
      const stored = eng.getEnvelope("torque")!;
      expect(stored.p999).toBe(500);
      expect(stored.lastUpdated).not.toBe("2020-01-01T00:00:00.000Z");
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(9); // 8 defaults + torque
    });

    it("setEnvelope overwrites an existing parameter's envelope", () => {
      const eng = new VariabilityEnvelopeEngine();
      eng.setEnvelope("spindle_rpm", makeEnvelope({ parameter: "spindle_rpm", p999: 99999 }));
      expect(eng.getEnvelope("spindle_rpm")!.p999).toBe(99999);
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(8); // still 8 — overwrite, not add
    });
  });

  describe("expandEnvelope", () => {
    it("yields no proposal for an unknown parameter", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.expandEnvelope("nope", [{ value: 1, outcome: "success" }]);
      expect(r).toBe(null);
    });

    it("yields no proposal when fewer than 3 successful outliers above p999 — envelope unchanged", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.expandEnvelope("spindle_rpm", [
        { value: 20000, outcome: "success" },
        { value: 21000, outcome: "success" },
      ]);
      expect(r).toBe(null);
      expect(eng.getEnvelope("spindle_rpm")!.p999).toBe(18000); // expandEnvelope is pure — no mutation
    });

    it("yields no proposal when 'success' values are at or below p999 (not outliers)", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.expandEnvelope("spindle_rpm", [
        { value: 10000, outcome: "success" },
        { value: 11000, outcome: "success" },
        { value: 12000, outcome: "success" },
      ]);
      expect(r).toBe(null);
    });

    it("does not count non-'success' outcomes even above p999", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.expandEnvelope("spindle_rpm", [
        { value: 20000, outcome: "success" },
        { value: 21000, outcome: "failure" },
        { value: 22000, outcome: "marginal" },
      ]);
      expect(r).toBe(null); // only 1 successful outlier
    });

    it("proposes p999 = maxSuccess * 1.1 with 3 successful outliers → 'medium' risk", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.expandEnvelope("spindle_rpm", [
        { value: 20000, outcome: "success" },
        { value: 21000, outcome: "success" },
        { value: 22000, outcome: "success" },
      ])!;
      expect(r.currentP999).toBe(18000);
      expect(r.proposedP999).toBeCloseTo(24200, 5); // 22000 * 1.1
      expect(r.confidenceGain).toBeCloseTo(1.0, 5); // 3/3
      expect(r.riskAssessment).toBe("medium"); // >=3 but <5
    });

    it("rates 'low' risk with 5+ successful outliers", () => {
      const eng = new VariabilityEnvelopeEngine();
      const evidence = [20000, 21000, 22000, 23000, 24000].map((value) => ({
        value,
        outcome: "success" as const,
      }));
      const r = eng.expandEnvelope("spindle_rpm", evidence)!;
      expect(r.riskAssessment).toBe("low");
      expect(r.proposedP999).toBeCloseTo(26400, 5); // 24000 * 1.1
    });

    it("confidenceGain is the successful-outlier fraction of all evidence", () => {
      const eng = new VariabilityEnvelopeEngine();
      const r = eng.expandEnvelope("spindle_rpm", [
        { value: 20000, outcome: "success" },
        { value: 21000, outcome: "success" },
        { value: 22000, outcome: "success" },
        { value: 5000, outcome: "failure" },
      ])!;
      expect(r.confidenceGain).toBeCloseTo(0.75, 5); // 3 successful / 4 total
    });
  });

  describe("applyExpansion", () => {
    it("updates p999 to proposedP999 and bumps sampleCount by the evidence count", () => {
      const eng = new VariabilityEnvelopeEngine();
      const before = eng.getEnvelope("spindle_rpm")!;
      const proposal = eng.expandEnvelope("spindle_rpm", [
        { value: 20000, outcome: "success" },
        { value: 21000, outcome: "success" },
        { value: 22000, outcome: "success" },
      ])!;
      eng.applyExpansion(proposal);
      const after = eng.getEnvelope("spindle_rpm")!;
      expect(after.p999).toBeCloseTo(24200, 5);
      expect(after.sampleCount).toBe(before.sampleCount + 3);
    });

    it("is a safe no-op for a proposal whose parameter has no envelope", () => {
      const eng = new VariabilityEnvelopeEngine();
      // applyExpansion early-returns when the parameter is unknown — calling it
      // directly (no try/catch) proves it neither throws nor mutates state.
      eng.applyExpansion({
        parameter: "ghost",
        currentP999: 1,
        proposedP999: 2,
        evidence: [],
        confidenceGain: 1,
        riskAssessment: "low",
      });
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(8); // nothing added
    });
  });

  describe("exportEnvelopes / importEnvelopes", () => {
    it("exportEnvelopes returns a plain object keyed by parameter", () => {
      const eng = new VariabilityEnvelopeEngine();
      const exported = eng.exportEnvelopes();
      expect(exported.spindle_rpm.p50).toBe(8000);
      expect(Object.keys(exported)).toContain("cutting_force");
    });

    it("importEnvelopes merges new parameters in", () => {
      const eng = new VariabilityEnvelopeEngine();
      eng.importEnvelopes({ widget_speed: makeEnvelope({ parameter: "widget_speed" }) });
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(9);
      expect(eng.getEnvelope("widget_speed")?.parameter).toBe("widget_speed");
    });

    it("importEnvelopes overwrites existing parameters", () => {
      const eng = new VariabilityEnvelopeEngine();
      eng.importEnvelopes({ spindle_rpm: makeEnvelope({ parameter: "spindle_rpm", p999: 55555 }) });
      expect(eng.getEnvelope("spindle_rpm")!.p999).toBe(55555);
      expect(Object.keys(eng.exportEnvelopes())).toHaveLength(8);
    });

    it("export → import round-trips envelope state to a fresh engine", () => {
      const a = new VariabilityEnvelopeEngine();
      a.setEnvelope("xyz", makeEnvelope({ parameter: "xyz", p999: 777 }));
      const b = new VariabilityEnvelopeEngine();
      b.importEnvelopes(a.exportEnvelopes());
      expect(b.getEnvelope("xyz")!.p999).toBe(777);
    });
  });

  describe("getOutlierBuffer", () => {
    it("returns an empty map for a fresh engine", () => {
      const eng = new VariabilityEnvelopeEngine();
      expect(eng.getOutlierBuffer().size).toBe(0);
    });

    it("returns a copy — mutating it does not affect engine state", () => {
      const eng = new VariabilityEnvelopeEngine();
      eng.evaluate("spindle_rpm", 36000); // capture one outlier
      const copy = eng.getOutlierBuffer();
      copy.set("spindle_rpm", [999999]);
      copy.set("injected", [1, 2, 3]);
      // engine's real buffer is untouched
      expect(eng.getOutlierBuffer().get("spindle_rpm")).toEqual([36000]);
      expect(eng.getOutlierBuffer().size).toBe(1);
    });
  });

  describe("singleton export", () => {
    it("exposes a pre-seeded variabilityEnvelopeEngine that evaluates against the spindle_rpm envelope", () => {
      expect(variabilityEnvelopeEngine.getEnvelope("spindle_rpm")?.p50).toBe(8000);
      // behaves like a real engine instance, not a stub
      const r = variabilityEnvelopeEngine.evaluate("spindle_rpm", 12000);
      expect(r.percentile).toBeCloseTo(0.95, 5);
    });
  });
});
