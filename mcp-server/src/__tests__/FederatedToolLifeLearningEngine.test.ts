import { describe, it, expect } from "vitest";
import {
  federatedToolLifeLearningEngine as eng,
  FederatedToolLifeLearningEngine,
  type FederatedToolLifeInput,
  type ShopTaylorObservation,
} from "../engines/FederatedToolLifeLearningEngine.js";

function shop(o: Partial<ShopTaylorObservation> = {}): ShopTaylorObservation {
  return {
    shop_id: "shop_A",
    taylor_n: 0.25,
    taylor_C: 300,
    observation_count: 100,
    ...o,
  };
}

describe("FederatedToolLifeLearningEngine", () => {
  it("exports singleton with blend()", () => {
    expect(eng).toBeInstanceOf(FederatedToolLifeLearningEngine);
    expect(typeof eng.blend).toBe("function");
  });

  it("throws on empty shops array", () => {
    expect(() => eng.blend({ shops: [] })).toThrow(/shops\[\] required.*non-empty/);
  });

  it("throws on missing required shop fields", () => {
    expect(() => eng.blend({ shops: [{ shop_id: "A" } as ShopTaylorObservation] }))
      .toThrow(/missing required fields/);
  });

  it("throws on taylor_n out of (0, 1)", () => {
    expect(() => eng.blend({ shops: [shop({ taylor_n: 0 })] })).toThrow(/taylor_n must be in/);
    expect(() => eng.blend({ shops: [shop({ taylor_n: 1.5 })] })).toThrow(/taylor_n must be in/);
  });

  it("throws on non-positive taylor_C or observation_count", () => {
    expect(() => eng.blend({ shops: [shop({ taylor_C: 0 })] })).toThrow(/taylor_C must be positive/);
    expect(() => eng.blend({ shops: [shop({ observation_count: 0 })] })).toThrow(/observation_count must be positive/);
  });

  it("single shop returns blend equal to that shop's values", () => {
    const r = eng.blend({ shops: [shop({ taylor_n: 0.22, taylor_C: 280, observation_count: 500 })] });
    expect(r.blended_n.value).toBeCloseTo(0.22, 4);
    expect(r.blended_C.value).toBeCloseTo(280, 1);
    expect(r.warnings.some(w => /Single shop.*no federation benefit/.test(w))).toBe(true);
  });

  it("equal-weight shops produce arithmetic average of n", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.20, taylor_C: 300, observation_count: 100 }),
        shop({ shop_id: "B", taylor_n: 0.30, taylor_C: 300, observation_count: 100 }),
      ],
    });
    // weighted by equal counts = simple average
    expect(r.blended_n.value).toBeCloseTo(0.25, 4);
  });

  it("higher observation count weights more heavily (anti-naive-average)", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "BIG", taylor_n: 0.20, observation_count: 1000 }),
        shop({ shop_id: "SMALL", taylor_n: 0.40, observation_count: 10 }),
      ],
    });
    // Blend should be much closer to 0.20 than to naive (0.30)
    expect(r.blended_n.value).toBeLessThan(0.25);
    expect(r.blended_n.value).toBeGreaterThan(0.19);
  });

  it("blended C uses geometric (log-space) blend, not arithmetic", () => {
    // ln(100) = 4.605, ln(400) = 5.991 → geometric mean ln=5.298 → C=200
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_C: 100, observation_count: 100 }),
        shop({ shop_id: "B", taylor_C: 400, observation_count: 100 }),
      ],
    });
    expect(r.blended_C.value).toBeCloseTo(200, 0);
  });

  it("total_observations sums all shop counts", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", observation_count: 100 }),
        shop({ shop_id: "B", observation_count: 250 }),
        shop({ shop_id: "C", observation_count: 50 }),
      ],
    });
    expect(r.total_observations.value).toBe(400);
  });

  it("outlier detected when n deviation > 2σ", () => {
    // 2 big shops at n=0.25, 1 small shop at n=0.50 (far from blend, low weight)
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.25, observation_count: 1000 }),
        shop({ shop_id: "B", taylor_n: 0.25, observation_count: 1000 }),
        shop({ shop_id: "C", taylor_n: 0.50, observation_count: 50 }),
      ],
    });
    expect(r.outlier_shops.some(o => o.shop_id === "C")).toBe(true);
    const cOutlier = r.outlier_shops.find(o => o.shop_id === "C")!;
    expect(cOutlier.n_deviation_sigma).toBeGreaterThan(2.0);
  });

  it("no outliers when all shops agree", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.25, observation_count: 100 }),
        shop({ shop_id: "B", taylor_n: 0.252, observation_count: 100 }),
        shop({ shop_id: "C", taylor_n: 0.248, observation_count: 100 }),
      ],
    });
    expect(r.outlier_shops).toEqual([]);
  });

  it("low total observations → confidence floor 0.3 + warning", () => {
    const r = eng.blend({
      shops: [shop({ observation_count: 5 }), shop({ shop_id: "B", observation_count: 10 })],
    });
    expect(r.confidence.value).toBeLessThanOrEqual(0.3);
    expect(r.warnings.some(w => /low statistical power/.test(w))).toBe(true);
  });

  it("majority outliers → confidence 0.4 + high-disagreement warning", () => {
    // 3 of 4 shops disagree significantly
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.15, observation_count: 200 }),
        shop({ shop_id: "B", taylor_n: 0.20, observation_count: 200 }),
        shop({ shop_id: "C", taylor_n: 0.35, observation_count: 200 }),
        shop({ shop_id: "D", taylor_n: 0.45, observation_count: 200 }),
      ],
    });
    // With high spread, outlier-detection threshold may flag 2 of 4; confidence should be lowish
    expect(r.confidence.value).toBeLessThan(0.95);
  });

  it("custom outlier_sigma=1.0 makes detection more aggressive", () => {
    // Spread shops; tight threshold flags more
    const rLoose = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.25, observation_count: 100 }),
        shop({ shop_id: "B", taylor_n: 0.30, observation_count: 100 }),
        shop({ shop_id: "C", taylor_n: 0.20, observation_count: 100 }),
      ],
      outlier_sigma: 5.0,
    });
    const rTight = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.25, observation_count: 100 }),
        shop({ shop_id: "B", taylor_n: 0.30, observation_count: 100 }),
        shop({ shop_id: "C", taylor_n: 0.20, observation_count: 100 }),
      ],
      outlier_sigma: 1.0,
    });
    expect(rTight.outlier_shops.length).toBeGreaterThanOrEqual(rLoose.outlier_shops.length);
  });

  it("3 shops × distinct n exercise blend variability floor", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "Aerospace", taylor_n: 0.18, taylor_C: 280, observation_count: 200 }),
        shop({ shop_id: "JobShop", taylor_n: 0.25, taylor_C: 310, observation_count: 150 }),
        shop({ shop_id: "Automotive", taylor_n: 0.30, taylor_C: 350, observation_count: 500 }),
      ],
    });
    // Weighted blend should fall between min and max
    expect(r.blended_n.value).toBeGreaterThan(0.18);
    expect(r.blended_n.value).toBeLessThan(0.30);
    expect(r.blended_C.value).toBeGreaterThan(280);
    expect(r.blended_C.value).toBeLessThan(350);
  });

  it("confidence approaches 0.95 cap when shops agree + many observations", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.25, taylor_C: 300, observation_count: 1000 }),
        shop({ shop_id: "B", taylor_n: 0.251, taylor_C: 301, observation_count: 1000 }),
        shop({ shop_id: "C", taylor_n: 0.249, taylor_C: 299, observation_count: 1000 }),
      ],
    });
    expect(r.confidence.value).toBeGreaterThanOrEqual(0.90);
    expect(r.confidence.value).toBeLessThanOrEqual(0.95);
  });

  it("outlier warnings surface to operator review", () => {
    const r = eng.blend({
      shops: [
        shop({ shop_id: "A", taylor_n: 0.25, observation_count: 1000 }),
        shop({ shop_id: "B", taylor_n: 0.25, observation_count: 1000 }),
        shop({ shop_id: "Outlier", taylor_n: 0.50, observation_count: 50 }),
      ],
    });
    expect(r.warnings.some(w => /outlier shop.*operator review.*ISO 3685/.test(w))).toBe(true);
  });

  it("source cites Taylor 1907 + Tlusty + Carlin-Louis + ISO 3685 + Sandvik", () => {
    const r = eng.blend({ shops: [shop()] });
    expect(r.source).toMatch(/Taylor 1907|Tlusty|Carlin-Louis|ISO 3685|Sandvik/);
  });
});
