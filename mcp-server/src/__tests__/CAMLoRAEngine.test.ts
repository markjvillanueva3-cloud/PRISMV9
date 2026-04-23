/**
 * CAMLoRAEngine tests — U-CAM107 (PHASE-8 / CAM-EXHAUST-MS0)
 *
 * Coverage:
 *   - Happy path: predict / applyDelta / load / save / list / select / ensemble
 *   - ≥3 failure modes: bad input, dim mismatch, missing file
 *   - ≥2 adversarial: NaN feature, oversized vector
 *   - ≥3 CAM systems exercised: mastercam, hypermill, fusion360 (variability floor)
 *   - Reference values: hand-computed deltas + algebraic invariants
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMLoRAEngine,
  camLoRAEngine,
  STALE_AGE_DAYS,
  HARD_STALE_AGE_DAYS,
  MIN_IMPROVEMENT_PCT,
} from "../engines/CAMLoRAEngine.js";
import type {
  LoRAAdapter,
  Priority4CAM,
  LoRAConfig,
} from "../engines/CAMLoRAAdapterTrainerEngine.js";
import type { TargetName, BayesianRidgeModel } from "../engines/CAMBaselineRegressorEngine.js";

// ─── Fixtures ───────────────────────────────────────────────────────

const D_IN = 4;
const RANK = 2;
const ALPHA = 4; // scale = alpha/rank = 2

const BASE_CONFIG: LoRAConfig = {
  rank: RANK,
  alpha: ALPHA,
  learning_rate: 0.01,
  n_epochs: 50,
  batch_size: 4,
  weight_decay: 0,
  seed: 1,
};

function makeAdapter(
  cam: Priority4CAM,
  target: TargetName,
  opts: Partial<LoRAAdapter> = {}
): LoRAAdapter {
  return {
    cam_slug: cam,
    target,
    config: BASE_CONFIG,
    // A: rank × d_in
    A: [
      [1, 0, 0, 0],   // r=0
      [0, 1, 0, 0],   // r=1
    ],
    B: [0.5, 0.25],   // 1 × rank
    d_in: D_IN,
    trained_on: 100,
    final_train_loss: 0.05,
    improvement_over_baseline_mae_pct: 12.5,
    trained_at: new Date().toISOString(),
    ...opts,
  };
}

function makeBaseline(weights: number[] = [0.5, 0.5, 0.5, 0.5]): BayesianRidgeModel {
  return {
    target: "spindle_rpm_midpoint" as TargetName,
    weights,
    bias: 0,
    alpha_used: 1,
    lambda_used: 1,
    feature_stats: {
      mean: new Array(weights.length).fill(0),
      std: new Array(weights.length).fill(1),
    },
    categorical_vocab: {} as BayesianRidgeModel["categorical_vocab"],
    n_train: 100,
    train_mae: 0.1,
    train_r2: 0.9,
  } as BayesianRidgeModel;
}

// Allow-list os.tmpdir() for the path-guard — tests must be able to save/load
// adapters in tmp dirs without tripping the security check.
process.env.CAM_LORA_ALLOW_TMP = "1";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-lora-test-"));
});
afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("CAMLoRAEngine — happy path math", () => {
  it("applyDelta computes (B·A·x) · (α/r) exactly", () => {
    const eng = new CAMLoRAEngine();
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const xStd = [1, 2, 3, 4];
    // A·x = [1, 2]   (since A is identity-like on first 2 dims)
    // B·(A·x) = 0.5·1 + 0.25·2 = 1.0
    // delta = 1.0 · (α/r) = 1.0 · 2 = 2.0
    const delta = eng.applyDelta(adapter, xStd);
    expect(delta).toBeCloseTo(2.0, 10);
  });

  it("predict returns baseline + delta with correct slug+target", () => {
    const eng = new CAMLoRAEngine();
    const adapter = makeAdapter("hypermill", "feed_mm_min_midpoint");
    const baseline = makeBaseline([1, 1, 1, 1]); // baseline·x = 1+2+3+4 = 10
    const xStd = [1, 2, 3, 4];
    const r = eng.predict({ adapter, baseline, xStd });
    expect(r.baseline_value).toBeCloseTo(10, 10);
    expect(r.adapter_delta).toBeCloseTo(2.0, 10);
    expect(r.final_value).toBeCloseTo(12.0, 10);
    expect(r.cam_slug).toBe("hypermill");
    expect(r.target).toBe("feed_mm_min_midpoint");
  });

  it("zero-B adapter yields zero delta (LoRA initialization invariant)", () => {
    const eng = new CAMLoRAEngine();
    const adapter = makeAdapter("fusion360", "spindle_rpm_midpoint", {
      B: [0, 0],
    });
    expect(eng.applyDelta(adapter, [99, -99, 7, 13])).toBe(0);
  });

  it("standardize is pure z-score on well-formed inputs", () => {
    const eng = new CAMLoRAEngine();
    const out = eng.standardize([10, 20, 30], [5, 20, 30], [5, 2, 10]);
    // (10-5)/5 = 1, (20-20)/2 = 0, (30-30)/10 = 0
    expect(out).toEqual([1, 0, 0]);
  });

  it("standardize throws on zero std (was silent-fallback, now hard-fail after scrutiny)", () => {
    const eng = new CAMLoRAEngine();
    expect(() =>
      eng.standardize([10, 20, 30], [5, 20, 30], [5, 0, 10])
    ).toThrow(/zero std at index 1/);
  });

  it("ensemble equal-weights yields mean delta", () => {
    const eng = new CAMLoRAEngine();
    const a1 = makeAdapter("mastercam", "spindle_rpm_midpoint");
    // Second adapter has B=[1, 0.5] → delta = (1·1 + 0.5·2)·2 = 4.0
    const a2 = makeAdapter("hypermill", "spindle_rpm_midpoint", {
      B: [1, 0.5],
    });
    const baseline = makeBaseline([0, 0, 0, 0]); // baseline = 0
    const xStd = [1, 2, 3, 4];
    const r = eng.ensemble({ adapters: [a1, a2], baseline, xStd });
    // Mean of 2.0 and 4.0 = 3.0
    expect(r.weighted_delta).toBeCloseTo(3.0, 10);
    expect(r.final_value).toBeCloseTo(3.0, 10);
    expect(r.per_adapter_deltas).toHaveLength(2);
    expect(r.per_adapter_deltas[0].cam).toBe("mastercam");
    expect(r.per_adapter_deltas[1].cam).toBe("hypermill");
  });

  it("ensemble custom weights normalize properly", () => {
    const eng = new CAMLoRAEngine();
    const a1 = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const a2 = makeAdapter("hypermill", "spindle_rpm_midpoint", {
      B: [1, 0.5],
    });
    const baseline = makeBaseline([0, 0, 0, 0]);
    const xStd = [1, 2, 3, 4];
    // weights 3:1 → 0.75·2.0 + 0.25·4.0 = 1.5 + 1.0 = 2.5
    const r = eng.ensemble({ adapters: [a1, a2], baseline, xStd, weights: [3, 1] });
    expect(r.weighted_delta).toBeCloseTo(2.5, 10);
  });
});

describe("CAMLoRAEngine — variability across CAM systems (≥3)", () => {
  const eng = new CAMLoRAEngine();
  const baseline = makeBaseline([1, 1, 1, 1]);
  const xStd = [1, 1, 1, 1]; // baseline·x = 4
  // Same A but different B per CAM to simulate per-system corrections
  const cases: Array<{ cam: Priority4CAM; B: number[]; expectedDelta: number }> = [
    // delta = (B0·1 + B1·1)·2
    { cam: "mastercam",     B: [0.5, 0.5],  expectedDelta: 2.0 },  // (0.5+0.5)·2
    { cam: "hypermill",     B: [1.0, -0.5], expectedDelta: 1.0 },  // (1.0-0.5)·2
    { cam: "fusion360",     B: [0.0, 1.0],  expectedDelta: 2.0 },  // (0+1)·2
    { cam: "inventor-hsm",  B: [-0.25, 0.25], expectedDelta: 0.0 }, // (-0.25+0.25)·2
  ];
  for (const tc of cases) {
    it(`${tc.cam} adapter produces correct delta`, () => {
      const adapter = makeAdapter(tc.cam, "spindle_rpm_midpoint", { B: tc.B });
      const r = eng.predict({ adapter, baseline, xStd });
      expect(r.adapter_delta).toBeCloseTo(tc.expectedDelta, 10);
      expect(r.final_value).toBeCloseTo(4 + tc.expectedDelta, 10);
      expect(r.cam_slug).toBe(tc.cam);
    });
  }
});

describe("CAMLoRAEngine — failure modes", () => {
  const eng = new CAMLoRAEngine();

  it("FAIL #1: bad input — adapter with mismatched A.row.length throws via predict", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      A: [[1, 2, 3], [4, 5, 6]], // d_in says 4 but rows have 3
    });
    expect(() =>
      eng.predict({ adapter, baseline: makeBaseline(), xStd: [1, 2, 3, 4] })
    ).toThrow(/A row width inconsistent/);
  });

  it("FAIL #2: boundary — xStd shorter than adapter.d_in throws", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.predict({ adapter, baseline: makeBaseline(), xStd: [1, 2, 3] })
    ).toThrow(/d_in.*4.*expected feature dim.*3/);
  });

  it("FAIL #3: resource exhaustion / missing file — loadAdapter throws ENOENT-style", () => {
    const missing = path.join(tmpDir, "does-not-exist.json");
    expect(() => eng.loadAdapter(missing)).toThrow(/file not found/);
  });

  it("FAIL #4: corrupt JSON file throws descriptive error", () => {
    const bad = path.join(tmpDir, "broken.json");
    fs.writeFileSync(bad, "{this is not json");
    expect(() => eng.loadAdapter(bad)).toThrow(/invalid JSON/);
  });

  it("FAIL #5: baseline weight length differs from xStd → predict throws", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const wrongBaseline = makeBaseline([1, 1, 1]); // length 3, xStd length 4
    expect(() =>
      eng.predict({ adapter, baseline: wrongBaseline, xStd: [1, 2, 3, 4] })
    ).toThrow(/baseline\.weights length.*does not match/);
  });

  it("FAIL #6: ensemble with empty adapter list throws", () => {
    expect(() =>
      eng.ensemble({ adapters: [], baseline: makeBaseline(), xStd: [1, 2, 3, 4] })
    ).toThrow(/at least one adapter/);
  });

  it("FAIL #7: ensemble weights sum ≤ 0 throws", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.ensemble({ adapters: [a], baseline: makeBaseline(), xStd: [1, 2, 3, 4], weights: [0] })
    ).toThrow(/weights must sum to > 0/);
  });
});

describe("CAMLoRAEngine — adversarial inputs", () => {
  const eng = new CAMLoRAEngine();

  it("ADV #1: NaN feature in xStd is rejected by predict", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.predict({ adapter, baseline: makeBaseline(), xStd: [1, NaN, 3, 4] })
    ).toThrow(/non-finite feature at index 1/);
  });

  it("ADV #2: Infinity feature is rejected", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.predict({ adapter, baseline: makeBaseline(), xStd: [1, 2, Infinity, 4] })
    ).toThrow(/non-finite feature at index 2/);
  });

  it("ADV #3: oversized xStd (length > d_in) caught by validation", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const huge = new Array(10000).fill(0);
    huge[0] = 1;
    expect(() =>
      eng.predict({ adapter, baseline: makeBaseline(), xStd: huge })
    ).toThrow(/d_in.*4.*expected feature dim.*10000/);
  });

  it("ADV #4: empty xStd does not crash validation, returns false-valid", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const v = eng.validateAdapterFor(adapter, 0);
    expect(v.valid).toBe(false);
    expect(v.issues.some((s) => s.includes("≠ expected feature dim (0)"))).toBe(true);
  });
});

describe("CAMLoRAEngine — adapter health checks", () => {
  const eng = new CAMLoRAEngine();
  const now = new Date("2026-04-22T00:00:00Z");

  it("fresh adapter with good metrics → recommendation 'use'", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      trained_at: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      improvement_over_baseline_mae_pct: 15,
    });
    const h = eng.checkAdapter(adapter, now);
    expect(h.recommendation).toBe("use");
    expect(h.is_stale).toBe(false);
    expect(h.age_days).toBeCloseTo(5, 1);
  });

  it("adapter aged ≥ STALE_AGE_DAYS → 'retrain_recommended'", () => {
    const adapter = makeAdapter("hypermill", "spindle_rpm_midpoint", {
      trained_at: new Date(now.getTime() - (STALE_AGE_DAYS + 1) * 24 * 3600 * 1000).toISOString(),
      improvement_over_baseline_mae_pct: 15,
    });
    const h = eng.checkAdapter(adapter, now);
    expect(h.recommendation).toBe("retrain_recommended");
    expect(h.is_stale).toBe(true);
  });

  it("adapter aged ≥ HARD_STALE_AGE_DAYS → 'retrain_required'", () => {
    const adapter = makeAdapter("fusion360", "spindle_rpm_midpoint", {
      trained_at: new Date(now.getTime() - (HARD_STALE_AGE_DAYS + 1) * 24 * 3600 * 1000).toISOString(),
      improvement_over_baseline_mae_pct: 15,
    });
    const h = eng.checkAdapter(adapter, now);
    expect(h.recommendation).toBe("retrain_required");
  });

  it(`adapter improvement < ${MIN_IMPROVEMENT_PCT}% → 'retrain_required' regardless of age`, () => {
    const adapter = makeAdapter("inventor-hsm", "spindle_rpm_midpoint", {
      trained_at: now.toISOString(),
      improvement_over_baseline_mae_pct: 0.5,
    });
    const h = eng.checkAdapter(adapter, now);
    expect(h.recommendation).toBe("retrain_required");
    expect(h.reason).toMatch(/improvement.*<.*min/);
  });

  it("adapter trained_on < 3 → 'retrain_required'", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      trained_on: 2,
      improvement_over_baseline_mae_pct: 50,
    });
    const h = eng.checkAdapter(adapter, now);
    expect(h.recommendation).toBe("retrain_required");
    expect(h.reason).toMatch(/trained_on=2 < min 3/);
  });
});

describe("CAMLoRAEngine — disk I/O round-trip", () => {
  const eng = new CAMLoRAEngine();

  it("save → load preserves adapter byte-for-byte", () => {
    const original = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const p = path.join(tmpDir, "mastercam", "spindle.json");
    eng.saveAdapter(original, p);
    expect(fs.existsSync(p)).toBe(true);
    const loaded = eng.loadAdapter(p);
    expect(loaded).toEqual(original);
  });

  it("listAdapters discovers adapters across nested CAM dirs", () => {
    const a1 = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const a2 = makeAdapter("hypermill", "feed_mm_min_midpoint");
    const a3 = makeAdapter("fusion360", "spindle_rpm_midpoint");
    eng.saveAdapter(a1, path.join(tmpDir, "mastercam", "spindle.json"));
    eng.saveAdapter(a2, path.join(tmpDir, "hypermill", "feed.json"));
    eng.saveAdapter(a3, path.join(tmpDir, "fusion360", "spindle.json"));
    const idx = eng.listAdapters(tmpDir);
    expect(idx).toHaveLength(3);
    const cams = idx.map((e) => e.cam_slug).sort();
    expect(cams).toEqual(["fusion360", "hypermill", "mastercam"]);
  });

  it("listAdapters on nonexistent dir returns empty", () => {
    const idx = eng.listAdapters(path.join(tmpDir, "missing"));
    expect(idx).toEqual([]);
  });

  it("listAdapters skips garbage files without throwing", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    eng.saveAdapter(a, path.join(tmpDir, "mastercam", "good.json"));
    fs.writeFileSync(path.join(tmpDir, "mastercam", "garbage.json"), "{not json");
    const idx = eng.listAdapters(tmpDir);
    expect(idx).toHaveLength(1);
    expect(idx[0].cam_slug).toBe("mastercam");
  });

  it("selectAdapter picks first usable adapter for (cam, target)", () => {
    const fresh = makeAdapter("mastercam", "spindle_rpm_midpoint");
    eng.saveAdapter(fresh, path.join(tmpDir, "mastercam", "spindle.json"));
    const result = eng.selectAdapter(tmpDir, "mastercam", "spindle_rpm_midpoint", D_IN);
    expect(result).not.toBeNull();
    expect(result!.adapter.cam_slug).toBe("mastercam");
  });

  it("selectAdapter skips adapters that fail validation", () => {
    const broken = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      d_in: 99, // expectedDim will be 4
    });
    eng.saveAdapter(broken, path.join(tmpDir, "mastercam", "spindle.json"));
    const result = eng.selectAdapter(tmpDir, "mastercam", "spindle_rpm_midpoint", D_IN);
    expect(result).toBeNull();
  });

  it("selectAdapter skips adapters flagged retrain_required", () => {
    const stale = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      improvement_over_baseline_mae_pct: 0.1,
    });
    eng.saveAdapter(stale, path.join(tmpDir, "mastercam", "spindle.json"));
    const result = eng.selectAdapter(tmpDir, "mastercam", "spindle_rpm_midpoint", D_IN);
    expect(result).toBeNull();
  });
});

describe("CAMLoRAEngine — singleton + defaults", () => {
  it("module exports a usable singleton", () => {
    expect(camLoRAEngine).toBeInstanceOf(CAMLoRAEngine);
    expect(camLoRAEngine.name).toBe("CAMLoRAEngine");
  });

  it("defaultConfig matches trainer DEFAULT_LORA_CONFIG", () => {
    const cfg = camLoRAEngine.defaultConfig();
    expect(cfg.rank).toBe(4);
    expect(cfg.alpha).toBe(8);
    expect(cfg.alpha / cfg.rank).toBe(2); // canonical scale
  });
});

describe("CAMLoRAEngine — scrutiny-pass edge cases (rank-0, bad dates, Infinity weights)", () => {
  const eng = new CAMLoRAEngine();

  it("rank-0 adapter (empty A matrix) is rejected by validateAdapterFor", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      A: [],
      B: [],
    });
    const v = eng.validateAdapterFor(adapter, D_IN);
    expect(v.valid).toBe(false);
    expect(v.issues.some((s) => /rank 0/.test(s))).toBe(true);
  });

  it("negative alpha is rejected by validateAdapterFor", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      config: { ...BASE_CONFIG, alpha: -1 },
    });
    const v = eng.validateAdapterFor(adapter, D_IN);
    expect(v.valid).toBe(false);
    expect(v.issues.some((s) => /alpha must be > 0|rank and.*alpha must be > 0/.test(s))).toBe(true);
  });

  it("negative rank is rejected by validateAdapterFor", () => {
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      config: { ...BASE_CONFIG, rank: -1 },
    });
    const v = eng.validateAdapterFor(adapter, D_IN);
    expect(v.valid).toBe(false);
  });

  it("invalid trained_at ISO forces retrain_required", () => {
    const adapter = makeAdapter("hypermill", "spindle_rpm_midpoint", {
      trained_at: "not-a-date",
    });
    const h = eng.checkAdapter(adapter);
    expect(h.recommendation).toBe("retrain_required");
    expect(h.reason).toMatch(/invalid trained_at/);
    expect(Number.isNaN(h.age_days)).toBe(true);
  });

  it("Infinity weight in ensemble is rejected", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.ensemble({
        adapters: [a, a],
        baseline: makeBaseline(),
        xStd: [1, 2, 3, 4],
        weights: [1, Infinity],
      })
    ).toThrow(/non-finite weight at index 1/);
  });

  it("negative weight in ensemble is rejected", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.ensemble({
        adapters: [a, a],
        baseline: makeBaseline(),
        xStd: [1, 2, 3, 4],
        weights: [-1, 2],
      })
    ).toThrow(/negative weight at index 0/);
  });

  it("ensemble weights of wrong length throws", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.ensemble({
        adapters: [a, a],
        baseline: makeBaseline(),
        xStd: [1, 2, 3, 4],
        weights: [1], // one weight for two adapters
      })
    ).toThrow(/weights length 1.*adapters length 2/);
  });

  it("saveAdapter refuses to write onto an existing directory", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const dirAsFile = path.join(tmpDir, "mastercam");
    fs.mkdirSync(dirAsFile, { recursive: true });
    expect(() => eng.saveAdapter(a, dirAsFile)).toThrow(/target is a directory/);
  });

  it("loadAdapter rejects paths outside allowed roots", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    // Save to tmp (allowed via CAM_LORA_ALLOW_TMP) then try to load from a
    // fabricated path clearly outside tmp and allowed roots.
    const bogus = "H:/prism/mcp-server/src/engines/CAMLoRAEngine.ts";
    expect(() => eng.loadAdapter(bogus)).toThrow(/outside allowed roots/);
  });

  it("saveAdapter rejects paths outside allowed roots", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    expect(() =>
      eng.saveAdapter(a, "H:/prism/mcp-server/src/bogus-target.json")
    ).toThrow(/outside allowed roots/);
  });

  it("listAdaptersWithWarnings surfaces malformed files as warnings", () => {
    const a = makeAdapter("mastercam", "spindle_rpm_midpoint");
    eng.saveAdapter(a, path.join(tmpDir, "mastercam", "ok.json"));
    fs.writeFileSync(path.join(tmpDir, "mastercam", "broken.json"), "{not json");
    fs.writeFileSync(path.join(tmpDir, "mastercam", "empty-obj.json"), "{}");
    const result = eng.listAdaptersWithWarnings(tmpDir);
    expect(result.entries).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.warnings.some((w) => /broken\.json/.test(w.path))).toBe(true);
  });

  it("selectAdapter picks highest-improvement adapter when multiple match", () => {
    const lowImprov = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      improvement_over_baseline_mae_pct: 5,
    });
    const highImprov = makeAdapter("mastercam", "spindle_rpm_midpoint", {
      improvement_over_baseline_mae_pct: 25,
    });
    eng.saveAdapter(lowImprov, path.join(tmpDir, "mastercam", "low.json"));
    eng.saveAdapter(highImprov, path.join(tmpDir, "mastercam", "high.json"));
    const result = eng.selectAdapter(tmpDir, "mastercam", "spindle_rpm_midpoint", D_IN);
    expect(result).not.toBeNull();
    expect(result!.adapter.improvement_over_baseline_mae_pct).toBe(25);
  });
});

describe("CAMLoRAEngine — dispatcher round-trip E2E", () => {
  it("Zod schemas accept canonical inputs for every cam_lora_* action", async () => {
    const { ACTION_CAM_LORA_FRAMEWORK_SCHEMAS } = await import(
      "../schemas/camLoRAFrameworkActionSchemas.js"
    );
    const adapter = makeAdapter("mastercam", "spindle_rpm_midpoint");
    const baseline = makeBaseline();
    const xStd = [1, 2, 3, 4];

    // cam_lora_predict
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_predict.safeParse({
        adapter, baseline, x_std: xStd,
      }).success
    ).toBe(true);

    // cam_lora_apply_delta
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_apply_delta.safeParse({
        adapter, x_std: xStd,
      }).success
    ).toBe(true);

    // cam_lora_validate
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_validate.safeParse({
        adapter, expected_dim: 4,
      }).success
    ).toBe(true);

    // cam_lora_check_health
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_check_health.safeParse({
        adapter, now: new Date().toISOString(),
      }).success
    ).toBe(true);

    // cam_lora_list
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_list.safeParse({
        model_dir: tmpDir,
      }).success
    ).toBe(true);

    // cam_lora_select
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_select.safeParse({
        model_dir: tmpDir,
        cam_slug: "fusion360",
        target: "spindle_rpm_midpoint",
        expected_dim: 4,
      }).success
    ).toBe(true);

    // cam_lora_ensemble
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_ensemble.safeParse({
        adapters: [adapter],
        baseline,
        x_std: xStd,
        weights: [1],
      }).success
    ).toBe(true);

    // cam_lora_standardize
    expect(
      ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_standardize.safeParse({
        raw: [10, 20], mean: [5, 15], std: [5, 5],
      }).success
    ).toBe(true);
  });

  it("Zod schemas reject malformed inputs", async () => {
    const { ACTION_CAM_LORA_FRAMEWORK_SCHEMAS } = await import(
      "../schemas/camLoRAFrameworkActionSchemas.js"
    );
    // Bad cam_slug
    const bad1 = ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_validate.safeParse({
      adapter: makeAdapter("not-a-cam" as any, "spindle_rpm_midpoint"),
      expected_dim: 4,
    });
    expect(bad1.success).toBe(false);

    // Empty adapter list for ensemble
    const bad2 = ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_ensemble.safeParse({
      adapters: [],
      baseline: makeBaseline(),
      x_std: [1, 2],
    });
    expect(bad2.success).toBe(false);

    // Negative expected_dim
    const bad3 = ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_validate.safeParse({
      adapter: makeAdapter("mastercam", "spindle_rpm_midpoint"),
      expected_dim: -1,
    });
    expect(bad3.success).toBe(false);
  });

  it("dispatcher action enum includes all 8 cam_lora_* actions", async () => {
    const dispText = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts"),
      "utf-8"
    );
    const requiredActions = [
      "cam_lora_predict", "cam_lora_apply_delta", "cam_lora_validate",
      "cam_lora_check_health", "cam_lora_list", "cam_lora_select",
      "cam_lora_ensemble", "cam_lora_standardize",
    ];
    for (const a of requiredActions) {
      // Both in the enum and in a switch case
      expect(dispText.includes(`"${a}"`)).toBe(true);
      expect(dispText.includes(`case "${a}"`)).toBe(true);
    }
  });

  it("dispatcher invocation path: schema-validated params → engine call → typed result (cam_lora_predict)", async () => {
    // E2E: simulate the dispatcher's path — validate params, then dispatch to engine.
    const { ACTION_CAM_LORA_FRAMEWORK_SCHEMAS } = await import(
      "../schemas/camLoRAFrameworkActionSchemas.js"
    );
    const adapter = makeAdapter("hypermill", "spindle_rpm_midpoint");
    const baseline = makeBaseline([1, 1, 1, 1]);
    const params = { adapter, baseline, x_std: [1, 2, 3, 4] };

    // Step 1: validate (what dispatcher does first)
    const parsed = ACTION_CAM_LORA_FRAMEWORK_SCHEMAS.cam_lora_predict.safeParse(params);
    expect(parsed.success).toBe(true);

    // Step 2: lazy-import engine (mirror dispatcher's pattern)
    const { camLoRAEngine: dispatchedEngine } = await import("../engines/CAMLoRAEngine.js");

    // Step 3: invoke
    const result = dispatchedEngine.predict({
      adapter: parsed.data!.adapter as any,
      baseline: parsed.data!.baseline as any,
      xStd: parsed.data!.x_std,
    });

    // Step 4: typed result has the expected shape
    expect(result).toHaveProperty("baseline_value");
    expect(result).toHaveProperty("adapter_delta");
    expect(result).toHaveProperty("final_value");
    expect(result.cam_slug).toBe("hypermill");
    expect(result.baseline_value).toBeCloseTo(10, 10);
    expect(result.adapter_delta).toBeCloseTo(2.0, 10);
    expect(result.final_value).toBeCloseTo(12.0, 10);
  });
});
