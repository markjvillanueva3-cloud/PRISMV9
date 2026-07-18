/**
 * DEA-MS0 P05 — spc_calculate_with_statistical_monitoring
 *
 * Orchestrator-bridge test: QualityPredictionEngine.predictQualityWithStatisticalMonitoring
 * lazy-chains StatisticalProcessMonitoringEngine (Hotelling T², combined SPC,
 * Wald SPRT) without coupling either engine to the other at compile time.
 *
 * Covers: happy path · gate-by-source-flag · partial-overlay · 3 failure modes
 *         (empty data / negative sigma / NaN inputs) · adversarial inputs ·
 *         backwards-compat (base predict still works without overlay) ·
 *         dispatcher round-trip via prism_quality.
 */
import { describe, it, expect } from "vitest";
import {
  qualityPredictionEngine,
  type QualityInput,
  type SPMOverlayInput,
} from "../engines/QualityPredictionEngine.js";

// ── Test fixtures ─────────────────────────────────────────────────────────

/** Realistic JM-Die roughing pass: 12.7mm carbide endmill in P-group steel. */
const BASE_INPUT: QualityInput = {
  operation_type: "milling_roughing",
  material_iso_group: "P",
  tool_diameter_mm: 12.7,
  spindle_rpm: 3200,
  feed_rate_mmmin: 640,
  depth_of_cut_mm: 2.5,
  coolant: true,
  machine_accuracy_mm: 0.005,
  tolerance_mm: 0.025,
  surface_finish_target_Ra: 1.6,
  tool_condition: "normal",
};

/** Deterministic Box-Muller normal sampler (seeded). */
function makeNormalRng(seed: number): () => number {
  let s = seed | 0 || 1;
  const u01 = (): number => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
  return (): number => {
    const u1 = Math.max(u01(), 1e-6);
    const u2 = u01();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

/** N in-control observations centered at target with given sigma. */
function genInControl(n: number, target: number, sigma: number): number[] {
  const out: number[] = [];
  const norm = makeNormalRng(7);
  for (let i = 0; i < n; i++) {
    out.push(target + sigma * norm());
  }
  return out;
}

/** 40 observations: first 20 in-control at target=100, then 20 shifted by +5σ
 *  starting at index 20 — should trigger SPC signal in second half. */
function genWithDrift(): number[] {
  const out: number[] = [];
  const norm = makeNormalRng(13);
  for (let i = 0; i < 40; i++) {
    const mean = i >= 20 ? 110 : 100;
    out.push(mean + 2.0 * norm());
  }
  return out;
}

/** 4-variable multivariate dataset: 25 in-control then 5 outliers. */
function genHotellingData(): number[][] {
  const out: number[][] = [];
  let s = 23;
  const u = (): number => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000 - 0.5;
  };
  for (let i = 0; i < 25; i++) {
    out.push([100 + u(), 50 + u() * 0.5, 200 + u() * 2, 75 + u()]);
  }
  for (let i = 0; i < 5; i++) {
    out.push([108 + u(), 55 + u() * 0.5, 215 + u() * 2, 80 + u()]);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────

describe("predictQualityWithStatisticalMonitoring (DEA-MS0 P05)", () => {

  // ── Happy path / gate-by-source-flag ────────────────────────────────────
  it("returns full base prediction + spm_source='no_data' when overlay absent", async () => {
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT);
    // Base prediction must produce realistic JM-Die roughing numbers
    expect(r.predicted_Cpk).toBeGreaterThan(0);
    expect(r.predicted_Cpk).toBeLessThan(10);
    expect(r.predicted_Ra_um).toBeGreaterThan(0);
    expect(r.predicted_Ra_um).toBeLessThan(20);
    expect(r.factors.length).toBe(4);
    // No overlay → exact no_data state
    expect(r.spm_overlay.spm_source).toBe("no_data");
    expect(r.spm_overlay.combined_spc).toBeUndefined();
    expect(r.spm_overlay.hotelling_t2).toBeUndefined();
    expect(r.spm_overlay.sprt).toBeUndefined();
    expect(r.spm_overlay.statistical_warnings).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("returns spm_source='not_applicable' when overlay object is empty", async () => {
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, {});
    expect(r.spm_overlay.spm_source).toBe("not_applicable");
    expect(r.spm_overlay.combined_spc).toBeUndefined();
    expect(r.spm_overlay.hotelling_t2).toBeUndefined();
    expect(r.spm_overlay.sprt).toBeUndefined();
    expect(r.warnings).toEqual([]);
  });

  // ── Combined SPC sub-block ─────────────────────────────────────────────
  it("combined_spc consulted: detection_chart ∈ documented enum, ARL finite positive", async () => {
    const overlay: SPMOverlayInput = {
      combined_spc: { observations: genInControl(40, 100, 2.0), target: 100, sigma: 2.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("consulted");
    const cs = r.spm_overlay.combined_spc!;
    expect(["none", "shewhart", "cusum", "ewma"]).toContain(cs.detection_chart);
    expect(cs.shewhart_signals_count).toBeGreaterThanOrEqual(0);
    expect(cs.cusum_signals_count).toBeGreaterThanOrEqual(0);
    expect(cs.ewma_signals_count).toBeGreaterThanOrEqual(0);
    expect(cs.arl_estimate).toBeGreaterThan(0);
    expect(Number.isFinite(cs.arl_estimate)).toBe(true);
  });

  it("combined_spc detects post-shift drift: first_signal_index ∈ [16, 40) and warning surfaced", async () => {
    const overlay: SPMOverlayInput = {
      combined_spc: { observations: genWithDrift(), target: 100, sigma: 2.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("consulted");
    const cs = r.spm_overlay.combined_spc!;
    // First signal must come during/after the drift window (drift starts at index 20)
    expect(cs.first_signal_index).toBeGreaterThan(15);
    expect(cs.first_signal_index).toBeLessThan(40);
    // At least one of the three charts caught the drift
    const total = cs.shewhart_signals_count + cs.cusum_signals_count + cs.ewma_signals_count;
    expect(total).toBeGreaterThan(0);
    // Drift warning surfaced
    const drifts = r.spm_overlay.statistical_warnings.filter(w => w.includes("Combined SPC"));
    expect(drifts.length).toBeGreaterThan(0);
    expect(drifts[0]).toMatch(/out-of-control signal at index \d+/);
    // Base prediction still populated and within JM-Die roughing envelope
    expect(r.predicted_Cpk).toBeGreaterThan(0);
  });

  // ── Hotelling T² sub-block ─────────────────────────────────────────────
  it("hotelling_t2 consulted: n_samples=30, n_characteristics=4, UCL>0, top_contributor∈[0,4)", async () => {
    const overlay: SPMOverlayInput = {
      hotelling_t2: { data: genHotellingData(), alpha: 0.01 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("consulted");
    const ht = r.spm_overlay.hotelling_t2!;
    expect(ht.n_samples).toBe(30);
    expect(ht.n_characteristics).toBe(4);
    expect(ht.ucl).toBeGreaterThan(0);
    expect(Number.isFinite(ht.ucl)).toBe(true);
    expect(ht.top_contributor_variable).toBeGreaterThanOrEqual(0);
    expect(ht.top_contributor_variable).toBeLessThan(4);
    expect(ht.out_of_control_count).toBeGreaterThanOrEqual(0);
    expect(ht.out_of_control_count).toBeLessThanOrEqual(30);
  });

  // ── SPRT sub-block ─────────────────────────────────────────────────────
  it("sprt accepts H1 on clear shift: decision='accept_H1', samples_used∈(0,11]", async () => {
    const observations = [105, 106, 104, 107, 105, 108, 105, 106, 105, 107, 106];
    const overlay: SPMOverlayInput = {
      sprt: { observations, h0_mean: 100, h1_mean: 105, sigma: 2.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("consulted");
    const sp = r.spm_overlay.sprt!;
    expect(sp.decision).toBe("accept_H1");
    expect(sp.samples_used).toBeGreaterThan(0);
    expect(sp.samples_used).toBeLessThanOrEqual(observations.length);
    expect(Number.isFinite(sp.log_likelihood_ratio)).toBe(true);
    expect(sp.log_likelihood_ratio).toBeGreaterThan(0); // H1 favored → positive LLR
    expect(Number.isFinite(sp.asn)).toBe(true);
    expect(sp.asn).toBeGreaterThan(0);
    // SPRT-specific warning surfaced
    const sprts = r.spm_overlay.statistical_warnings.filter(w => w.includes("SPRT"));
    expect(sprts.length).toBeGreaterThan(0);
    expect(sprts[0]).toMatch(/H1 accepted/);
  });

  // ── All-three combined ─────────────────────────────────────────────────
  it("all three sub-blocks consulted: emits all three sub-results with concrete values", async () => {
    const overlay: SPMOverlayInput = {
      combined_spc: { observations: genInControl(30, 100, 2.0), target: 100, sigma: 2.0 },
      hotelling_t2: { data: genHotellingData() },
      sprt: { observations: [102, 103, 102, 104, 103, 102], h0_mean: 100, h1_mean: 105, sigma: 2.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("consulted");
    expect(["none", "shewhart", "cusum", "ewma"]).toContain(r.spm_overlay.combined_spc!.detection_chart);
    expect(r.spm_overlay.hotelling_t2!.ucl).toBeGreaterThan(0);
    expect(["accept_H0", "accept_H1", "continue"]).toContain(r.spm_overlay.sprt!.decision);
  });

  // ── Failure mode 1: empty observations array ───────────────────────────
  it("graceful: empty combined_spc observations → not_applicable + named warning + no throw", async () => {
    const overlay: SPMOverlayInput = {
      combined_spc: { observations: [], target: 100, sigma: 2.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("not_applicable");
    expect(r.spm_overlay.combined_spc).toBeUndefined();
    const matched = r.warnings.filter(w => w.includes("observations array empty"));
    expect(matched.length).toBe(1);
    expect(r.predicted_Cpk).toBeGreaterThan(0);
  });

  // ── Failure mode 2: negative sigma in both sub-blocks ──────────────────
  it("graceful: negative sigma in combined_spc + sprt → both skipped, BOTH warnings present", async () => {
    const overlay: SPMOverlayInput = {
      combined_spc: { observations: genInControl(30, 100, 2.0), target: 100, sigma: -1.5 },
      sprt: { observations: [101, 102, 103], h0_mean: 100, h1_mean: 105, sigma: -1.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("not_applicable");
    expect(r.spm_overlay.combined_spc).toBeUndefined();
    expect(r.spm_overlay.sprt).toBeUndefined();
    const cs = r.warnings.filter(w => w.includes("combined_spc: sigma must be a positive"));
    const sp = r.warnings.filter(w => w.includes("sprt: sigma must be a positive"));
    expect(cs.length).toBe(1);
    expect(sp.length).toBe(1);
  });

  // ── Failure mode 3: NaN h0_mean in sprt ────────────────────────────────
  it("graceful: NaN h0_mean → sprt skipped + named warning, base prediction intact", async () => {
    const overlay: SPMOverlayInput = {
      sprt: { observations: [101, 102], h0_mean: NaN, h1_mean: 105, sigma: 2.0 },
    };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("not_applicable");
    expect(r.spm_overlay.sprt).toBeUndefined();
    const matched = r.warnings.filter(w => w.includes("h0_mean and h1_mean must be finite"));
    expect(matched.length).toBe(1);
    expect(r.predicted_Cpk).toBeGreaterThan(0);
  });

  // ── Hotelling guard: n ≤ p (degenerate covariance) ─────────────────────
  it("graceful: hotelling_t2 with n=3, p=5 → skipped + named warning identifies n>p violation", async () => {
    const data = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [3, 4, 5, 6, 7],
    ];
    const overlay: SPMOverlayInput = { hotelling_t2: { data } };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("not_applicable");
    expect(r.spm_overlay.hotelling_t2).toBeUndefined();
    const matched = r.warnings.filter(w => w.includes("needs n > p"));
    expect(matched.length).toBe(1);
    expect(matched[0]).toContain("n=3");
    expect(matched[0]).toContain("p=5");
  });

  // ── Adversarial: hotelling_t2 with non-array data ──────────────────────
  it("graceful: hotelling_t2 with non-array data → skipped + named warning, no throw", async () => {
    // @ts-expect-error — intentionally adversarial input type
    const overlay: SPMOverlayInput = { hotelling_t2: { data: "not an array" } };
    const r = await qualityPredictionEngine.predictQualityWithStatisticalMonitoring(BASE_INPUT, overlay);
    expect(r.spm_overlay.spm_source).toBe("not_applicable");
    expect(r.spm_overlay.hotelling_t2).toBeUndefined();
    const matched = r.warnings.filter(w => w.includes("hotelling_t2: data matrix needs"));
    expect(matched.length).toBe(1);
  });

  // ── Backwards compat: base predict() unchanged ─────────────────────────
  it("base predict() unchanged: produces identical realistic Cpk/Ra without spm_overlay key leakage", () => {
    const r = qualityPredictionEngine.predict(BASE_INPUT);
    expect(r.predicted_Cpk).toBeGreaterThan(0);
    expect(r.predicted_Cpk).toBeLessThan(10);
    expect(r.predicted_Ra_um).toBeGreaterThan(0);
    expect(r.predicted_Ra_um).toBeLessThan(20);
    expect(typeof r.predicted_dimensional_error_mm).toBe("number");
    expect(typeof r.within_tolerance).toBe("boolean");
    expect(r.factors.length).toBe(4);
    expect(["low", "moderate", "high", "critical"]).toContain(r.risk_level);
    expect(r).not.toHaveProperty("spm_overlay");
    expect(r).not.toHaveProperty("warnings");
  });

  // ── Dispatcher round-trip ──────────────────────────────────────────────
  it("dispatcher: spc_calculate_with_statistical_monitoring surfaces spm_source='consulted' via MCP envelope", async () => {
    const { registerQualityDispatcher } = await import("../tools/dispatchers/qualityDispatcher.js");
    type ToolHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>;
    let captured: ToolHandler | null = null;
    const fakeServer = {
      tool: (
        _name: string,
        _desc: string,
        _schema: unknown,
        fn: ToolHandler
      ): void => { captured = fn; },
    };
    registerQualityDispatcher(fakeServer);
    // Captured handler must be invocable — exercise it
    const handler = captured as ToolHandler | null;
    if (handler === null) {
      throw new Error("registerQualityDispatcher did not register a tool handler");
    }
    const res = await handler({
      action: "spc_calculate_with_statistical_monitoring",
      params: {
        operation_type: "milling_roughing",
        material_iso_group: "P",
        tool_diameter_mm: 12.7,
        spindle_rpm: 3200,
        feed_rate_mmmin: 640,
        depth_of_cut_mm: 2.5,
        coolant: true,
        machine_accuracy_mm: 0.005,
        tolerance_mm: 0.025,
        spm_overlay: {
          combined_spc: { observations: genInControl(30, 100, 2.0), target: 100, sigma: 2.0 },
        },
      },
    });
    // MCP tool envelope shape
    expect(Array.isArray(res.content)).toBe(true);
    expect(res.content.length).toBeGreaterThan(0);
    const text = res.content[0]?.text ?? "";
    expect(text.length).toBeGreaterThan(0);
    const parsed = JSON.parse(text);
    // Engine result must surface spm_source + base prediction
    expect(parsed.spm_overlay.spm_source).toBe("consulted");
    expect(parsed.predicted_Cpk).toBeGreaterThan(0);
    expect(parsed.predicted_Cpk).toBeLessThan(10);
    expect(["none", "shewhart", "cusum", "ewma"]).toContain(parsed.spm_overlay.combined_spc.detection_chart);
  });
});
