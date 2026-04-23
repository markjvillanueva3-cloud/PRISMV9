/**
 * LATHE-PRO-MS5.4 — Cpk surrogate ML test.
 *
 * Covers TurningCpkSurrogateEngine end-to-end:
 *   • Engine fit/predict/crossValidate with REAL reference values
 *     (synthetic data where the answer is algebraically known).
 *   • Adversarial inputs (NaN, Infinity, empty, degenerate, oversize).
 *   • Variability across 3 ISO-group-flavoured feature distributions.
 *   • Dispatcher round-trip via a stub MCP server.
 *
 * No toBeDefined() stubs. Every assertion pins a numeric or structural
 * invariant that would fail if the engine were silently broken.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  turningCpkSurrogateEngine,
  TurningCpkSurrogateEngine,
  type SurrogateSample,
  type FitResult,
} from "../engines/TurningCpkSurrogateEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

// ───────────────── Test helpers ─────────────────

/** Make a sample with explicit features; unspecified fields default to 0. */
function s(
  features: Partial<{
    Vc_m_min: number;
    f_mm_rev: number;
    ap_mm: number;
    vb_failure_um: number;
    approach_angle_deg: number;
    probe_interval: number;
  }>,
  cpk: number,
): SurrogateSample {
  return { features, cpk };
}

/** Reproducible synthetic dataset: y = 0.01*Vc + 10*f + 0.2*ap + ε(seed). */
function linearDataset(n: number, seed = 1): SurrogateSample[] {
  let state = seed;
  const rand = () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: SurrogateSample[] = [];
  for (let i = 0; i < n; i++) {
    const Vc = 150 + rand() * 200; // 150..350
    const f = 0.1 + rand() * 0.3; // 0.1..0.4
    const ap = 0.5 + rand() * 3.5; // 0.5..4.0
    const y = 0.01 * Vc + 10 * f + 0.2 * ap;
    out.push(s({ Vc_m_min: Vc, f_mm_rev: f, ap_mm: ap }, y));
  }
  return out;
}

/** Quadratic synthetic: y = 1 + 0.5*f - 0.3*ap² + 0.1*Vc*f. */
function quadraticDataset(n: number, seed = 2): SurrogateSample[] {
  let state = seed;
  const rand = () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: SurrogateSample[] = [];
  for (let i = 0; i < n; i++) {
    const Vc = 100 + rand() * 300;
    const f = 0.05 + rand() * 0.4;
    const ap = 0.5 + rand() * 4;
    const y = 1 + 0.5 * f - 0.3 * ap * ap + 0.1 * Vc * f;
    out.push(s({ Vc_m_min: Vc, f_mm_rev: f, ap_mm: ap }, y));
  }
  return out;
}

// ───────────────── Engine tests ─────────────────

describe("TurningCpkSurrogateEngine.fit — reference values", () => {
  it("fits a linear dataset with degree=1 to R² ≈ 1", () => {
    const data = linearDataset(60, 11);
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    expect(m.r_squared).toBeGreaterThan(0.999);
    expect(m.mse_train).toBeLessThan(1e-5);
    expect(m.n_samples).toBe(60);
    // degree 1 → 1 intercept + 6 linear features = 7
    expect(m.n_features).toBe(7);
  });

  it("fits a quadratic dataset with degree=2 to near-perfect R²", () => {
    const data = quadraticDataset(80, 22);
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 2 });
    expect(m.r_squared).toBeGreaterThan(0.999);
    // degree 2 → 1 + 6 + 6 (squares) + 15 (pairs) = 28
    expect(m.n_features).toBe(28);
  });

  it("degree=2 captures quadratic data that degree=1 cannot", () => {
    const data = quadraticDataset(80, 22);
    const linear = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    const quad = turningCpkSurrogateEngine.fit({ samples: data, degree: 2 });
    expect(quad.r_squared).toBeGreaterThan(linear.r_squared);
    expect(quad.mse_train).toBeLessThan(linear.mse_train);
  });

  it("standardize=true produces model that predicts identical to raw for same inputs", () => {
    const data = linearDataset(50, 33);
    const mRaw = turningCpkSurrogateEngine.fit({ samples: data, degree: 2, standardize: false });
    const mStd = turningCpkSurrogateEngine.fit({ samples: data, degree: 2, standardize: true });
    // At a test point, predictions from both should agree to ~3 decimals
    const testFeat = { Vc_m_min: 220, f_mm_rev: 0.2, ap_mm: 2.0 };
    const pRaw = turningCpkSurrogateEngine.predict({ model: mRaw, features: testFeat });
    const pStd = turningCpkSurrogateEngine.predict({ model: mStd, features: testFeat });
    expect(pStd.cpk_pred).toBeCloseTo(pRaw.cpk_pred, 2);
  });

  it("fit + predict round-trip recovers training y within mse", () => {
    const data = linearDataset(40, 44);
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    let maxErr = 0;
    for (const sample of data) {
      const p = turningCpkSurrogateEngine.predict({ model: m, features: sample.features });
      maxErr = Math.max(maxErr, Math.abs(p.cpk_pred - sample.cpk));
    }
    expect(maxErr).toBeLessThan(0.01);
  });

  it("ridge regularisation shrinks coefficients vs. no ridge on collinear data", () => {
    // Construct highly collinear data: Vc and ap almost proportional
    const data: SurrogateSample[] = [];
    for (let i = 0; i < 30; i++) {
      const Vc = 200 + i;
      const ap = 2 + 0.01 * i; // near-linear w/ Vc
      data.push(s({ Vc_m_min: Vc, ap_mm: ap }, 0.01 * Vc + 0.2 * ap));
    }
    const lowRidge = turningCpkSurrogateEngine.fit({ samples: data, degree: 1, ridge: 1e-9 });
    const highRidge = turningCpkSurrogateEngine.fit({ samples: data, degree: 1, ridge: 0.1 });
    const norm = (coefs: number[]) => Math.sqrt(coefs.reduce((s, v) => s + v * v, 0));
    expect(norm(highRidge.coefficients)).toBeLessThanOrEqual(norm(lowRidge.coefficients));
  });
});

describe("TurningCpkSurrogateEngine.predict — invariants", () => {
  it("predict is linear in coefficients (doubling β doubles prediction)", () => {
    const data = linearDataset(30, 55);
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    const m2: FitResult = { ...m, coefficients: m.coefficients.map((c) => 2 * c) };
    const feat = { Vc_m_min: 250, f_mm_rev: 0.25, ap_mm: 2.0 };
    const p1 = turningCpkSurrogateEngine.predict({ model: m, features: feat });
    const p2 = turningCpkSurrogateEngine.predict({ model: m2, features: feat });
    expect(p2.cpk_pred).toBeCloseTo(2 * p1.cpk_pred, 4);
  });

  it("predict at zero features returns the intercept", () => {
    const data = linearDataset(20, 66);
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    const p = turningCpkSurrogateEngine.predict({ model: m, features: {} });
    // Intercept is coefficients[0] since feature vector starts with 1
    expect(p.cpk_pred).toBeCloseTo(Math.round(m.coefficients[0] * 100000) / 100000, 3);
  });
});

// ───────────────── Adversarial + failure modes ─────────────────

describe("TurningCpkSurrogateEngine.fit — adversarial inputs", () => {
  it("rejects empty samples array", () => {
    expect(() => turningCpkSurrogateEngine.fit({ samples: [] })).toThrow(
      /non-empty/,
    );
  });

  it("rejects NaN in cpk", () => {
    expect(() =>
      turningCpkSurrogateEngine.fit({
        samples: [s({ Vc_m_min: 200 }, NaN)],
      }),
    ).toThrow(/not finite/);
  });

  it("rejects Infinity in feature value", () => {
    expect(() =>
      turningCpkSurrogateEngine.fit({
        samples: [s({ Vc_m_min: Infinity }, 1.0)],
      }),
    ).toThrow(/not finite/);
  });

  it("handles degenerate all-identical-x data without crash (zero variance)", () => {
    const data: SurrogateSample[] = [];
    for (let i = 0; i < 10; i++) {
      // Same x, varying y → model fits to mean, R² = 0 (or clamps to 1 when sst=0)
      data.push(s({ Vc_m_min: 200, f_mm_rev: 0.2, ap_mm: 2 }, 1.0 + 0.01 * i));
    }
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    expect(Number.isFinite(m.r_squared)).toBe(true);
    expect(m.n_samples).toBe(10);
  });

  it("handles very small training set (n=3, degree=1)", () => {
    const data = [
      s({ Vc_m_min: 100, f_mm_rev: 0.1, ap_mm: 1 }, 1.0),
      s({ Vc_m_min: 200, f_mm_rev: 0.2, ap_mm: 2 }, 2.0),
      s({ Vc_m_min: 300, f_mm_rev: 0.3, ap_mm: 3 }, 3.0),
    ];
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    expect(Number.isFinite(m.r_squared)).toBe(true);
    expect(m.n_samples).toBe(3);
  });

  it("handles oversize training set (n=500) without exploding", () => {
    const data = linearDataset(500, 77);
    const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 2 });
    expect(m.n_samples).toBe(500);
    expect(m.r_squared).toBeGreaterThan(0.99);
  });

  it("predict rejects NaN in feature query", () => {
    const m = turningCpkSurrogateEngine.fit({ samples: linearDataset(20, 88), degree: 1 });
    expect(() =>
      turningCpkSurrogateEngine.predict({ model: m, features: { Vc_m_min: NaN } }),
    ).toThrow(/not finite/);
  });
});

// ───────────────── Variability: 3 ISO-group-flavoured distributions ─────────────────

describe("TurningCpkSurrogateEngine — variability across ISO groups", () => {
  const isoDistributions = [
    { label: "P (steel)", vcCenter: 250, fCenter: 0.25, apCenter: 2.0 },
    { label: "M (stainless)", vcCenter: 180, fCenter: 0.20, apCenter: 1.5 },
    { label: "K (cast iron)", vcCenter: 220, fCenter: 0.30, apCenter: 2.5 },
  ];

  it.each(isoDistributions)(
    "fits to R² > 0.99 under $label operating envelope",
    ({ vcCenter, fCenter, apCenter }) => {
      const data: SurrogateSample[] = [];
      let state = 1000 + vcCenter;
      const rand = () => {
        let t = (state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = 0; i < 50; i++) {
        const Vc = vcCenter * (0.8 + 0.4 * rand());
        const f = fCenter * (0.8 + 0.4 * rand());
        const ap = apCenter * (0.8 + 0.4 * rand());
        const y = 0.005 * Vc + 8 * f + 0.1 * ap;
        data.push(s({ Vc_m_min: Vc, f_mm_rev: f, ap_mm: ap }, y));
      }
      const m = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
      expect(m.r_squared).toBeGreaterThan(0.99);
    },
  );

  it("different distributions produce meaningfully different coefficients", () => {
    const models = isoDistributions.map(({ vcCenter, fCenter, apCenter }) => {
      const data: SurrogateSample[] = [];
      for (let i = 0; i < 30; i++) {
        const Vc = vcCenter + (i - 15) * 5;
        const f = fCenter + (i - 15) * 0.005;
        const ap = apCenter + (i - 15) * 0.05;
        // Non-linear term makes surrogates differ
        const y = 0.005 * Vc * Vc + 8 * f + 0.1 * ap;
        data.push(s({ Vc_m_min: Vc, f_mm_rev: f, ap_mm: ap }, y));
      }
      return turningCpkSurrogateEngine.fit({ samples: data, degree: 2 });
    });
    // At least one pair of models must have different coefficient vectors
    const norm = (a: number[], b: number[]) =>
      a.reduce((acc, v, i) => acc + Math.abs(v - b[i]), 0);
    const d01 = norm(models[0].coefficients, models[1].coefficients);
    const d02 = norm(models[0].coefficients, models[2].coefficients);
    expect(Math.max(d01, d02)).toBeGreaterThan(0.01);
  });
});

// ───────────────── Cross-validation ─────────────────

describe("TurningCpkSurrogateEngine.crossValidate", () => {
  it("k-fold CV returns non-negative MSE and finite R²", () => {
    const data = linearDataset(40, 101);
    const cv = turningCpkSurrogateEngine.crossValidate({ samples: data, k: 5, degree: 1, seed: 1 });
    expect(cv.mse_mean).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(cv.r2_mean)).toBe(true);
    expect(cv.n_samples).toBe(40);
    expect(cv.k).toBeGreaterThanOrEqual(2);
    expect(cv.k).toBeLessThanOrEqual(5);
    for (const mse of cv.mse_folds) expect(mse).toBeGreaterThanOrEqual(0);
  });

  it("CV on linear data with degree=1 yields very high R² (≥ 0.99)", () => {
    const data = linearDataset(50, 111);
    const cv = turningCpkSurrogateEngine.crossValidate({ samples: data, k: 5, degree: 1, seed: 2 });
    expect(cv.r2_mean).toBeGreaterThan(0.99);
  });

  it("CV is reproducible under fixed seed", () => {
    const data = linearDataset(40, 121);
    const a = turningCpkSurrogateEngine.crossValidate({ samples: data, k: 4, seed: 99 });
    const b = turningCpkSurrogateEngine.crossValidate({ samples: data, k: 4, seed: 99 });
    expect(a.mse_mean).toBe(b.mse_mean);
    expect(a.mse_folds).toEqual(b.mse_folds);
  });

  it("CV with k clamped to [2, n]", () => {
    const data = linearDataset(10, 131);
    const cv = turningCpkSurrogateEngine.crossValidate({ samples: data, k: 100, seed: 1 });
    expect(cv.k).toBeLessThanOrEqual(10);
  });

  it("CV rejects empty samples", () => {
    expect(() =>
      turningCpkSurrogateEngine.crossValidate({ samples: [], k: 5 }),
    ).toThrow(/non-empty/);
  });
});

// ───────────────── Dispatcher round-trip (wiring verification) ─────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

describe("turning_cpk_surrogate — dispatcher round-trip", () => {
  let handler: CapturedTool["handler"];

  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });

  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try {
      return JSON.parse(text) as any;
    } catch {
      return { __raw: text };
    }
  }

  it("fit action reaches engine and returns a FitResult shape", async () => {
    const samples = linearDataset(20, 201);
    const res = await invoke("turning_cpk_surrogate_fit", { samples, degree: 1 });
    // Schema result is wrapped — find either direct FitResult or nested .result
    const fit = res.coefficients !== undefined ? res : (res.result ?? res.data ?? res);
    expect(Array.isArray(fit.coefficients)).toBe(true);
    expect(fit.n_samples).toBe(20);
    expect(fit.r_squared).toBeGreaterThan(0.99);
    expect(fit.source).toContain("TurningCpkSurrogateEngine.fit");
  });

  it("predict action uses a fitted model and returns numeric cpk_pred", async () => {
    const samples = linearDataset(25, 211);
    const fitRes = await invoke("turning_cpk_surrogate_fit", { samples, degree: 1 });
    const model = fitRes.coefficients !== undefined ? fitRes : (fitRes.result ?? fitRes.data ?? fitRes);
    const predRes = await invoke("turning_cpk_surrogate_predict", {
      model,
      features: { Vc_m_min: 250, f_mm_rev: 0.25, ap_mm: 2.0 },
    });
    const pred = predRes.cpk_pred !== undefined ? predRes : (predRes.result ?? predRes.data ?? predRes);
    expect(typeof pred.cpk_pred).toBe("number");
    expect(Number.isFinite(pred.cpk_pred)).toBe(true);
  });

  it("cv action returns a CrossValidateResult shape", async () => {
    const samples = linearDataset(20, 221);
    const res = await invoke("turning_cpk_surrogate_cv", {
      samples,
      k: 4,
      degree: 1,
      seed: 5,
    });
    const cv = res.mse_folds !== undefined ? res : (res.result ?? res.data ?? res);
    expect(Array.isArray(cv.mse_folds)).toBe(true);
    expect(cv.n_samples).toBe(20);
    expect(cv.mse_mean).toBeGreaterThanOrEqual(0);
  });

  it("dispatcher registers all three new actions in the action enum", async () => {
    const server = makeStubServer();
    registerTurningDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    expect(tool).toBeDefined();
    expect(tool!.description).toContain("turning_cpk_surrogate_fit");
    expect(tool!.description).toContain("turning_cpk_surrogate_predict");
    expect(tool!.description).toContain("turning_cpk_surrogate_cv");
  });

  it("fresh engine instance produces same fit as singleton on same data", () => {
    const data = linearDataset(30, 301);
    const fresh = new TurningCpkSurrogateEngine();
    const mSingleton = turningCpkSurrogateEngine.fit({ samples: data, degree: 1 });
    const mFresh = fresh.fit({ samples: data, degree: 1 });
    // Coefficients should match bit-for-bit since no randomness
    expect(mFresh.coefficients).toEqual(mSingleton.coefficients);
  });

  it("featureOrder exposes canonical six-feature ordering", () => {
    expect(turningCpkSurrogateEngine.featureOrder()).toEqual([
      "Vc_m_min",
      "f_mm_rev",
      "ap_mm",
      "vb_failure_um",
      "approach_angle_deg",
      "probe_interval",
    ]);
  });
});
