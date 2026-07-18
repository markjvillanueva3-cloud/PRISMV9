/**
 * v11-per-shop-kc-identity.test.mjs — concrete-value tests for the
 * Bayesian per-shop Kienzle kc1.1 posterior.
 *
 * Bayesian math hand-check (single observation):
 *   priorVariance=40000, observationVariance=10000, fleetDefault=1800, measuredKc=2000
 *   priorPrecision = 1/40000 = 0.000025
 *   obsPrecision   = 1/10000 = 0.0001
 *   postPrecision  = 0.000025 + 0.0001 = 0.000125
 *   postVariance   = 1/0.000125 = 8000
 *   postMean       = 8000 × (1800 × 0.000025 + 2000/10000)
 *                  = 8000 × (0.045 + 0.2)
 *                  = 8000 × 0.245
 *                  = 1960
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-PER-SHOP-KC-IDENTITY
 * @slot echo · @iter 29 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KC_POSTERIOR_SCHEMA_VERSION,
  DEFAULT_PRIOR_VARIANCE,
  DEFAULT_OBS_VARIANCE,
  MIN_OBSERVATIONS_FOR_TRUST,
  DEFAULT_CI_Z,
  createKcPosterior,
  observeForce,
  getPosteriorMean,
  getPosteriorVariance,
  getConfidenceInterval,
  shouldUsePosterior,
  recommendKc,
  deviationFromFleetDefault,
  summarize,
} from "./v11-per-shop-kc-identity.mjs";

describe("constants", () => {
  it("KC_POSTERIOR_SCHEMA_VERSION = 1", () => {
    assert.equal(KC_POSTERIOR_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_PRIOR_VARIANCE = 40000", () => {
    assert.equal(DEFAULT_PRIOR_VARIANCE, 40000);
  });
  it("DEFAULT_OBS_VARIANCE = 10000", () => {
    assert.equal(DEFAULT_OBS_VARIANCE, 10000);
  });
  it("MIN_OBSERVATIONS_FOR_TRUST = 5", () => {
    assert.equal(MIN_OBSERVATIONS_FOR_TRUST, 5);
  });
  it("DEFAULT_CI_Z = 1.96 (95% Normal)", () => {
    assert.equal(DEFAULT_CI_Z, 1.96);
  });
});

describe("createKcPosterior", () => {
  it("fleetDefault=1800 → posteriorMean starts at 1800", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(p.posteriorMean, 1800);
  });
  it("fleetDefault=1800 → posteriorVariance starts at DEFAULT_PRIOR_VARIANCE (40000)", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(p.posteriorVariance, 40000);
  });
  it("fleetDefault=1800 → observationCount starts at 0", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(p.observationCount, 0);
  });
  it("custom priorVariance=25000 honored", () => {
    const p = createKcPosterior({ fleetDefault: 1800, priorVariance: 25000 });
    assert.equal(p.priorVariance, 25000);
  });
  it("custom observationVariance=5000 honored", () => {
    const p = createKcPosterior({ fleetDefault: 1800, observationVariance: 5000 });
    assert.equal(p.observationVariance, 5000);
  });
  it("schemaVersion = 1", () => {
    assert.equal(createKcPosterior({ fleetDefault: 1800 }).schemaVersion, 1);
  });
  it("material defaults to 'unknown'", () => {
    assert.equal(createKcPosterior({ fleetDefault: 1800 }).material, "unknown");
  });
  it("shopId defaults to 'default'", () => {
    assert.equal(createKcPosterior({ fleetDefault: 1800 }).shopId, "default");
  });
  it("material/shopId preserved when supplied", () => {
    const p = createKcPosterior({ fleetDefault: 1800, material: "1018-CRS", shopId: "jm-die" });
    assert.equal(p.material, "1018-CRS");
    assert.equal(p.shopId, "jm-die");
  });
  it("null args → null", () => {
    assert.equal(createKcPosterior(null), null);
  });
  it("fleetDefault=0 → null (invalid)", () => {
    assert.equal(createKcPosterior({ fleetDefault: 0 }), null);
  });
  it("fleetDefault=-100 → null (invalid)", () => {
    assert.equal(createKcPosterior({ fleetDefault: -100 }), null);
  });
  it("fleetDefault=NaN → null", () => {
    assert.equal(createKcPosterior({ fleetDefault: NaN }), null);
  });
  it("missing fleetDefault → null", () => {
    assert.equal(createKcPosterior({ shopId: "jm-die" }), null);
  });
});

describe("observeForce: Bayesian Normal-Normal update", () => {
  it("hand-check: prior=1800 ±√40000, obs=2000 σ²=10000, N=1 → postMean=1960 (±1e-9)", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000 });
    assert.equal(Math.abs(p1.posteriorMean - 1960) < 1e-9, true);
  });
  it("hand-check: same single-obs case → postVariance=8000 (±1e-9)", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000 });
    assert.equal(Math.abs(p1.posteriorVariance - 8000) < 1e-9, true);
  });
  it("observationCount increments from 0 → 1", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000 });
    assert.equal(p1.observationCount, 1);
  });
  it("sumObservations accumulates: 2000 added", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000 });
    assert.equal(p1.sumObservations, 2000);
  });
  it("immutable: original posterior unchanged after observeForce", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    observeForce(p0, { measuredKc: 2000 });
    assert.equal(p0.observationCount, 0);
    assert.equal(p0.posteriorMean, 1800);
  });
  it("posterior tightens: variance(N=2) < variance(N=1)", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000 });
    const p2 = observeForce(p1, { measuredKc: 2000 });
    assert.equal(p2.posteriorVariance < p1.posteriorVariance, true);
  });
  it("posterior pulls toward observed mean over many samples", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 20; i++) p = observeForce(p, { measuredKc: 2200 });
    assert.equal(p.posteriorMean > 2100, true);
  });
  it("null event → posterior unchanged (same ref OK)", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(observeForce(p0, null), p0);
  });
  it("measuredKc=0 → posterior unchanged (invalid)", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 0 });
    assert.equal(p1.posteriorMean, 1800);
    assert.equal(p1.observationCount, 0);
  });
  it("measuredKc=NaN → posterior unchanged", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: NaN });
    assert.equal(p1.observationCount, 0);
  });
  it("measuredKc=-500 → posterior unchanged (negative invalid)", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: -500 });
    assert.equal(p1.observationCount, 0);
  });
  it("timestampIso flows through to lastUpdatedIso", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000, timestampIso: "2026-05-27T18:00:00Z" });
    assert.equal(p1.lastUpdatedIso, "2026-05-27T18:00:00Z");
  });
});

describe("getPosteriorMean / getPosteriorVariance", () => {
  it("mean accessor returns posteriorMean field", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(getPosteriorMean(p), 1800);
  });
  it("variance accessor returns posteriorVariance field", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(getPosteriorVariance(p), 40000);
  });
  it("null posterior → mean null", () => {
    assert.equal(getPosteriorMean(null), null);
  });
  it("null posterior → variance null", () => {
    assert.equal(getPosteriorVariance(null), null);
  });
});

describe("getConfidenceInterval", () => {
  it("prior (mean=1800, var=40000): CI95 ≈ [1800 - 1.96×200, 1800 + 1.96×200] = [1408, 2192]", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    const [low, high] = getConfidenceInterval(p);
    assert.equal(Math.abs(low - 1408) < 1e-9, true);
    assert.equal(Math.abs(high - 2192) < 1e-9, true);
  });
  it("CI width = 2 × z × sd: 2 × 1.96 × √40000 = 784", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    const [low, high] = getConfidenceInterval(p);
    assert.equal(Math.abs((high - low) - 784) < 1e-9, true);
  });
  it("custom zScore=2.58 (99% CI) widens interval", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    const [low99, high99] = getConfidenceInterval(p, 2.58);
    const [low95, high95] = getConfidenceInterval(p, 1.96);
    assert.equal((high99 - low99) > (high95 - low95), true);
  });
  it("null posterior → null", () => {
    assert.equal(getConfidenceInterval(null), null);
  });
});

describe("shouldUsePosterior", () => {
  it("count=0 → false (below threshold)", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(shouldUsePosterior(p), false);
  });
  it("count=4 → false (below threshold of 5)", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 4; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(shouldUsePosterior(p), false);
  });
  it("count=5 → true (at threshold)", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(shouldUsePosterior(p), true);
  });
  it("count=10 → true (above threshold)", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 10; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(shouldUsePosterior(p), true);
  });
  it("custom minObservations=2 with count=3 → true", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 3; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(shouldUsePosterior(p, { minObservations: 2 }), true);
  });
  it("null posterior → false", () => {
    assert.equal(shouldUsePosterior(null), false);
  });
});

describe("recommendKc: fleet-default-until-trusted waterfall", () => {
  it("count=0 → returns fleetDefault 1800", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(recommendKc(p).kc, 1800);
  });
  it("count=0 → source = 'fleet_default'", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(recommendKc(p).source, "fleet_default");
  });
  it("count=3 (below threshold) → still fleet_default", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 3; i++) p = observeForce(p, { measuredKc: 2200 });
    assert.equal(recommendKc(p).source, "fleet_default");
    assert.equal(recommendKc(p).kc, 1800);
  });
  it("count=5 (at threshold) → switches to shop_posterior", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 2200 });
    assert.equal(recommendKc(p).source, "shop_posterior");
  });
  it("count=5 with 2200 observations → posterior kc > fleet 1800", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 2200 });
    assert.equal(recommendKc(p).kc > 1800, true);
  });
  it("count=5 with 1500 observations → posterior kc < fleet 1800", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 1500 });
    assert.equal(recommendKc(p).kc < 1800, true);
  });
  it("observationCount echoed in result", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 7; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(recommendKc(p).observationCount, 7);
  });
  it("null posterior → null", () => {
    assert.equal(recommendKc(null), null);
  });
});

describe("deviationFromFleetDefault", () => {
  it("fresh posterior → deviation 0 (mean == fleet)", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(deviationFromFleetDefault(p), 0);
  });
  it("posterior pulled to ~1960 (single 2000 obs) → deviation ≈ +0.0889", () => {
    const p0 = createKcPosterior({ fleetDefault: 1800 });
    const p1 = observeForce(p0, { measuredKc: 2000 });
    const dev = deviationFromFleetDefault(p1);
    assert.equal(Math.abs(dev - (1960 - 1800) / 1800) < 1e-9, true);
  });
  it("posterior pulled below fleet → negative deviation", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 1500 });
    assert.equal(deviationFromFleetDefault(p) < 0, true);
  });
  it("null posterior → null", () => {
    assert.equal(deviationFromFleetDefault(null), null);
  });
});

describe("summarize", () => {
  it("fresh posterior → trusted=false (no observations)", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(summarize(p).trusted, false);
  });
  it("after 5 obs at 2000 → trusted=true", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(summarize(p).trusted, true);
  });
  it("after 5 obs → observationCount = 5", () => {
    let p = createKcPosterior({ fleetDefault: 1800 });
    for (let i = 0; i < 5; i++) p = observeForce(p, { measuredKc: 2000 });
    assert.equal(summarize(p).observationCount, 5);
  });
  it("posteriorStdDev = sqrt(posteriorVariance)", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    const s = summarize(p);
    assert.equal(Math.abs(s.posteriorStdDev - Math.sqrt(40000)) < 1e-9, true);
  });
  it("material + shopId echoed", () => {
    const p = createKcPosterior({ fleetDefault: 1800, material: "1018-CRS", shopId: "jm-die" });
    const s = summarize(p);
    assert.equal(s.material, "1018-CRS");
    assert.equal(s.shopId, "jm-die");
  });
  it("fleetDefault echoed (1800)", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    assert.equal(summarize(p).fleetDefault, 1800);
  });
  it("ci95Low + ci95High included", () => {
    const p = createKcPosterior({ fleetDefault: 1800 });
    const s = summarize(p);
    assert.equal(Math.abs(s.ci95Low - 1408) < 1e-9, true);
    assert.equal(Math.abs(s.ci95High - 2192) < 1e-9, true);
  });
  it("null posterior → null", () => {
    assert.equal(summarize(null), null);
  });
});
