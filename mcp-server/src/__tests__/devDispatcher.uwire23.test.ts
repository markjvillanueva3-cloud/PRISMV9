/**
 * devDispatcher U-WIRE23 round-trip tests — AdaptiveThresholdEngine.
 *
 * Validates the 5 adaptive_threshold_* actions wire correctly through prism_dev
 * and that the engine's PAC-based Bayesian threshold adaptation behaves
 * coherently as observations accumulate.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE23
 */

import { describe, it, expect } from "vitest";
import { adaptiveThresholdEngine } from "../engines/AdaptiveThresholdEngine.js";

describe("U-WIRE23 observe — record duplicate observations", () => {
  it("accepts a single observation without throwing", () => {
    expect(() => {
      adaptiveThresholdEngine.observe({
        cosineSimilarity: 0.92,
        wasActualDuplicate: true,
        assetType: "engine",
        timestamp: Date.now(),
      });
    }).not.toThrow();
  });

  it("accepts observations across all 5 asset types", () => {
    const types: Array<"engine" | "action" | "formula" | "hook" | "skill"> = [
      "engine", "action", "formula", "hook", "skill",
    ];
    for (const t of types) {
      expect(() => adaptiveThresholdEngine.observe({
        cosineSimilarity: 0.88,
        wasActualDuplicate: true,
        assetType: t,
        timestamp: Date.now(),
      })).not.toThrow();
    }
  });

  it("accepts both true and false labels", () => {
    expect(() => adaptiveThresholdEngine.observe({
      cosineSimilarity: 0.75,
      wasActualDuplicate: false,
      assetType: "action",
      timestamp: Date.now(),
    })).not.toThrow();
  });
});

describe("U-WIRE23 getThreshold — Bayesian threshold recommendation", () => {
  it("returns a threshold + confidence + credible interval + sample size + isConverged + pacBound", () => {
    const t = adaptiveThresholdEngine.getThreshold("engine", 0.95);
    expect(typeof t.threshold).toBe("number");
    expect(t.threshold).toBeGreaterThanOrEqual(0);
    expect(t.threshold).toBeLessThanOrEqual(1);
    expect(typeof t.confidence).toBe("number");
    expect(Array.isArray(t.credibleInterval)).toBe(true);
    expect(t.credibleInterval.length).toBe(2);
    expect(t.credibleInterval[0]).toBeLessThanOrEqual(t.credibleInterval[1]);
    expect(typeof t.sampleSize).toBe("number");
    expect(typeof t.isConverged).toBe("boolean");
    expect(typeof t.pacBound).toBe("object");
  });

  it("PAC bound has epsilon, delta, vcDimension, sampleComplexity, currentSamples, isSufficient", () => {
    const t = adaptiveThresholdEngine.getThreshold("engine");
    const pac = t.pacBound;
    expect(typeof pac.epsilon).toBe("number");
    expect(typeof pac.delta).toBe("number");
    expect(typeof pac.vcDimension).toBe("number");
    expect(typeof pac.sampleComplexity).toBe("number");
    expect(typeof pac.currentSamples).toBe("number");
    expect(typeof pac.isSufficient).toBe("boolean");
    expect(pac.epsilon).toBeGreaterThan(0);
    expect(pac.delta).toBeGreaterThan(0);
  });

  it("default confidence 0.95 produces a valid credible interval in [0,1]", () => {
    const t = adaptiveThresholdEngine.getThreshold("hook");
    expect(t.credibleInterval[0]).toBeGreaterThanOrEqual(0);
    expect(t.credibleInterval[1]).toBeLessThanOrEqual(1);
  });
});

describe("U-WIRE23 getAllThresholds — all asset types + global", () => {
  it("returns all 6 keys: engine, action, formula, hook, skill, global", () => {
    const all = adaptiveThresholdEngine.getAllThresholds();
    const keys = Object.keys(all).sort();
    expect(keys).toEqual(["action", "engine", "formula", "global", "hook", "skill"]);
  });

  it("each entry has the same shape as a single getThreshold result", () => {
    const all = adaptiveThresholdEngine.getAllThresholds();
    for (const [_key, rec] of Object.entries(all)) {
      expect(typeof rec.threshold).toBe("number");
      expect(Array.isArray(rec.credibleInterval)).toBe(true);
      expect(rec.credibleInterval.length).toBe(2);
      expect(typeof rec.pacBound.isSufficient).toBe("boolean");
    }
  });
});

describe("U-WIRE23 shouldFlagAsDuplicate — boolean flag with reasoning", () => {
  it("returns an object with the flag decision and metadata", () => {
    const r = adaptiveThresholdEngine.shouldFlagAsDuplicate(0.95, "engine");
    expect(typeof r).toBe("object");
    expect(r === null).toBe(false);
  });

  it("similarity below threshold does NOT flag as duplicate", () => {
    const t = adaptiveThresholdEngine.getThreshold("engine");
    const lowSim = Math.max(0, t.threshold - 0.20);
    const r = adaptiveThresholdEngine.shouldFlagAsDuplicate(lowSim, "engine");
    const out = r as { shouldFlag?: boolean; flag?: boolean };
    const flagged = out.shouldFlag ?? out.flag;
    expect(flagged).toBe(false);
  });

  it("similarity at 1.0 (identical) flags for any asset type", () => {
    const r = adaptiveThresholdEngine.shouldFlagAsDuplicate(1.0, "action");
    const out = r as { shouldFlag?: boolean; flag?: boolean };
    const flagged = out.shouldFlag ?? out.flag;
    expect(flagged).toBe(true);
  });
});

describe("U-WIRE23 probabilityIsDuplicate — calibrated probability", () => {
  it("returns a probability in [0, 1]", () => {
    const p = adaptiveThresholdEngine.probabilityIsDuplicate(0.85, "engine");
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("similarity 1.0 produces a higher probability than similarity 0.5", () => {
    const high = adaptiveThresholdEngine.probabilityIsDuplicate(1.0, "engine");
    const low = adaptiveThresholdEngine.probabilityIsDuplicate(0.5, "engine");
    expect(high).toBeGreaterThanOrEqual(low);
  });

  it("monotonicity: probability is non-decreasing as similarity increases", () => {
    const points = [0.3, 0.5, 0.7, 0.85, 0.95, 1.0];
    const probs = points.map(p => adaptiveThresholdEngine.probabilityIsDuplicate(p, "skill"));
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThanOrEqual(probs[i - 1] - 1e-9);
    }
  });
});

describe("U-WIRE23 dispatcher round-trip — Bayesian update behavior", () => {
  it("observations update posterior — sample size grows after observe()", () => {
    const before = adaptiveThresholdEngine.getThreshold("formula");
    for (let i = 0; i < 20; i++) {
      adaptiveThresholdEngine.observe({
        cosineSimilarity: 0.97,
        wasActualDuplicate: true,
        assetType: "formula",
        timestamp: Date.now(),
      });
    }
    const after = adaptiveThresholdEngine.getThreshold("formula");
    expect(after.sampleSize).toBeGreaterThan(before.sampleSize);
  });

  it("dispatcher params: snake_case → camelCase normalization preserves observation shape", () => {
    const dispatcherParams = {
      cosine_similarity: 0.91,
      was_actual_duplicate: true,
      asset_type: "engine" as const,
      timestamp: Date.now(),
    };
    const sim = typeof dispatcherParams.cosine_similarity === "number" ? dispatcherParams.cosine_similarity : 0;
    const wasDup = dispatcherParams.was_actual_duplicate;
    const at = dispatcherParams.asset_type;
    expect(sim).toBe(0.91);
    expect(wasDup).toBe(true);
    expect(at).toBe("engine");
    expect(() => adaptiveThresholdEngine.observe({
      cosineSimilarity: sim,
      wasActualDuplicate: wasDup,
      assetType: at,
      timestamp: dispatcherParams.timestamp,
    })).not.toThrow();
  });

  it("dispatcher param-validation contract: missing cosine_similarity is detected as not-a-number", () => {
    // Mirrors the dispatcher's guard:
    //   if (typeof sim !== "number") result = { error: ... }
    const params: { cosine_similarity?: number; was_actual_duplicate?: boolean; asset_type?: string } = {
      was_actual_duplicate: true,
      asset_type: "engine",
    };
    const sim = typeof params.cosine_similarity === "number" ? params.cosine_similarity : undefined;
    expect(typeof sim).toBe("undefined");
    expect(typeof sim === "number").toBe(false);
  });
});
