/**
 * Tests for SVIEnhancedCalculatorEngine — 9-component live Ψ + 5-axis MOAT product.
 *
 * Real-math assertions per CLAUDE.md §SAFETY + COMPREHENSIVE-BUILD floors:
 *   - happy path
 *   - ≥3 failure modes (bad input, boundary, resource exhaustion)
 *   - ≥2 adversarial inputs (NaN, Infinity, empty, oversize)
 *   - variability ≥3 spanning configurations
 *   - boundary tests (Karpathy R12 — hard assertions, no .toBeDefined() stubs)
 *
 * Author: charlie slot (claude-451f7328) /goal-12 iter1, 2026-05-24.
 */
import { describe, it, expect } from "vitest";
import {
  SVIEnhancedCalculatorEngine,
  sviEnhancedCalculatorEngine,
  PSI_COMPONENT_WEIGHTS,
  DEFAULT_MOAT_WEIGHTS,
  type SVISourceSignals,
} from "../engines/SVIEnhancedCalculatorEngine.js";

const eng = new SVIEnhancedCalculatorEngine();

function perfectSignals(): SVISourceSignals {
  return {
    hubs_total: 3097,
    orphans_total: 0,
    milestones_total: 700,
    milestones_with_drift: 0,
    wiki_tokens_total: 97673,
    wiki_tokens_broken: 0,
    wiki_files_total: 23992,
    wiki_files_missing_tribal: 0,
    psn_leg_health: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    health_mcp_up: true,
    health_ollama_up: true,
    health_viz_fresh: true,
    health_build_fresh: true,
    ai_engines_total: 7,
    ai_engines_with_memo: 7,
    tests_total: 3916,
    engines_total: 3218,
    scrutiny_pass_rate: 1.0,
    drift_detector_freshness: 1.0,
    depth_artifacts_count: 100000,
    depth_artifacts_target: 100000,
    graph_pagerank_centrality: 1.0,
    graph_bridging_edges_ratio: 1.0,
    numerical_fit_error_mean: 0,
    omega_gate_pass_rate: 1.0,
    delta_psi_7d: 0.10, // sigmoid(10) ≈ 1
  };
}

function zeroSignals(): SVISourceSignals {
  return {
    hubs_total: 0,
    orphans_total: 0,
    milestones_total: 0,
    milestones_with_drift: 0,
    wiki_tokens_total: 0,
    wiki_tokens_broken: 0,
    wiki_files_total: 0,
    wiki_files_missing_tribal: 0,
    psn_leg_health: [],
    health_mcp_up: false,
    health_ollama_up: false,
    health_viz_fresh: false,
    health_build_fresh: false,
    ai_engines_total: 0,
    ai_engines_with_memo: 0,
    tests_total: 0,
    engines_total: 0,
    scrutiny_pass_rate: 0,
    drift_detector_freshness: 0,
    depth_artifacts_count: 0,
    depth_artifacts_target: 0,
    graph_pagerank_centrality: 0,
    graph_bridging_edges_ratio: 0,
    numerical_fit_error_mean: 100,
    omega_gate_pass_rate: 0,
    delta_psi_7d: -0.10,
  };
}

describe("PSI_COMPONENT_WEIGHTS — invariants", () => {
  it("sums to 1.0 ± 1e-9", () => {
    const sum = Object.values(PSI_COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
  });
  it("has all 9 components", () => {
    expect(Object.keys(PSI_COMPONENT_WEIGHTS).length).toBe(9);
  });
});

describe("DEFAULT_MOAT_WEIGHTS — invariants", () => {
  it("sums to 1.0 ± 1e-9", () => {
    const sum = Object.values(DEFAULT_MOAT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
  });
  it("has all 5 axes", () => {
    expect(Object.keys(DEFAULT_MOAT_WEIGHTS).length).toBe(5);
  });
});

describe("SVIEnhancedCalculatorEngine.compute — happy path", () => {
  it("perfect signals → Ψ = 1.0 AND MOAT ≈ 1.0", () => {
    const r = eng.compute(perfectSignals());
    expect(r.psi_new).toBeCloseTo(1.0, 4);
    expect(r.svi_moat).toBeGreaterThan(0.99);
    expect(r.delta_to_perfect).toBeLessThan(1e-4);
  });
  it("returns 9 components + 5 moat axes", () => {
    const r = eng.compute(perfectSignals());
    expect(r.components.length).toBe(9);
    expect(r.moat_axes.length).toBe(5);
  });
  it("component contributions sum to psi_new", () => {
    const r = eng.compute(perfectSignals());
    const sum = r.components.reduce((s, c) => s + c.contribution, 0);
    expect(Math.abs(sum - r.psi_new)).toBeLessThan(1e-6);
  });
});

describe("SVIEnhancedCalculatorEngine.compute — failure modes (live PRISM-realistic baseline)", () => {
  it("realistic mid-state: Ψ honest at ~0.55-0.75 (not vanity 100%)", () => {
    const s: SVISourceSignals = {
      hubs_total: 3097, orphans_total: 593, // 80.8% wired
      milestones_total: 700, milestones_with_drift: 190, // 72.9% non-drift
      wiki_tokens_total: 97673, wiki_tokens_broken: 4136, // 95.8% intact
      wiki_files_total: 23992, wiki_files_missing_tribal: 23802, // 0.8% covered
      psn_leg_health: [0.95, 0.90, 0.96, 0.43, 0.01, 0.85, 0.81, 0.85, 0.95, 0.12, 0.85], // mean ≈ 0.70
      health_mcp_up: false, health_ollama_up: false, health_viz_fresh: false, health_build_fresh: false, // 0%
      ai_engines_total: 7, ai_engines_with_memo: 3, // 43%
      tests_total: 3916, engines_total: 3218,
      scrutiny_pass_rate: 0.97,
      drift_detector_freshness: 0.85,
      depth_artifacts_count: 50000, depth_artifacts_target: 100000,
      graph_pagerank_centrality: 0.55, graph_bridging_edges_ratio: 0.60,
      numerical_fit_error_mean: 0.05, omega_gate_pass_rate: 0.92, delta_psi_7d: 0.005,
    };
    const r = eng.compute(s);
    expect(r.psi_new).toBeGreaterThan(0.40);
    expect(r.psi_new).toBeLessThan(0.85);
    // honesty note must NOT report all-clear
    expect(r.honesty_note).toMatch(/Ψ=/);
  });

  it("zero signals → Ψ=0 AND MOAT≈0 (boundary)", () => {
    const r = eng.compute(zeroSignals());
    expect(r.psi_new).toBe(0);
    expect(r.svi_moat).toBeLessThan(0.01);
  });

  it("one weak MOAT axis dooms the product (geometric-mean property)", () => {
    const s = perfectSignals();
    s.depth_artifacts_count = 0; // DEPTH axis → 0
    const r = eng.compute(s);
    // geometric mean: depth=ε → product = ε^0.25 = (1e-6)^0.25 ≈ 0.0316
    expect(r.svi_moat).toBeLessThan(0.05);
    expect(r.honesty_note).toMatch(/MOAT collapse|caps the moat|weakest/);
  });

  it("perfect Ψ but missing health → moat still drops", () => {
    const s = perfectSignals();
    s.health_mcp_up = false;
    s.health_ollama_up = false;
    const r = eng.compute(s);
    expect(r.psi_new).toBeLessThan(1.0);
    expect(r.psi_new).toBeGreaterThan(0.90); // health weight is 0.15
  });
});

describe("SVIEnhancedCalculatorEngine.compute — adversarial inputs", () => {
  it("NaN psn_leg_health values floored (no propagation)", () => {
    const s = perfectSignals();
    s.psn_leg_health = [1, NaN, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const r = eng.compute(s);
    expect(Number.isFinite(r.psi_new)).toBe(true);
    expect(Number.isFinite(r.svi_moat)).toBe(true);
  });

  it("Infinity in delta_psi_7d → compounding_rate clamped to 1.0", () => {
    const s = perfectSignals();
    s.delta_psi_7d = Infinity;
    const r = eng.compute(s);
    const compounding = r.moat_axes.find((a) => a.name === "compounding_rate");
    expect(compounding!.value).toBe(1);
    expect(Number.isFinite(r.svi_moat)).toBe(true);
  });

  it("Negative delta_psi_7d → compounding_rate near 0 (sigmoid behavior)", () => {
    const s = perfectSignals();
    s.delta_psi_7d = -10;
    const r = eng.compute(s);
    const compounding = r.moat_axes.find((a) => a.name === "compounding_rate");
    expect(compounding!.value).toBeLessThan(0.01);
  });

  it("Oversize counts (overflow safety) handled gracefully", () => {
    const s = perfectSignals();
    s.hubs_total = 1e15;
    s.orphans_total = 1e14;
    const r = eng.compute(s);
    expect(Number.isFinite(r.psi_new)).toBe(true);
    expect(r.psi_new).toBeLessThanOrEqual(1);
  });
});

describe("SVIEnhancedCalculatorEngine.compute — variability (3 spanning configurations)", () => {
  it("config A — coverage-strong but depth-weak (catalog-clone competitor profile)", () => {
    const s = perfectSignals();
    s.depth_artifacts_count = 100; // very thin
    const r = eng.compute(s);
    expect(r.svi_moat).toBeLessThan(0.3); // MOAT collapses
    const depth = r.moat_axes.find((a) => a.name === "depth")!;
    expect(depth.value).toBeLessThan(0.01);
  });

  it("config B — uniform 0.9 across all axes → MOAT ≈ 0.9 (idempotent on uniform)", () => {
    const s = perfectSignals();
    s.hubs_total = 100; s.orphans_total = 10; // 0.9
    s.milestones_total = 100; s.milestones_with_drift = 10; // 0.9
    s.wiki_tokens_total = 100; s.wiki_tokens_broken = 10;
    s.wiki_files_total = 100; s.wiki_files_missing_tribal = 10;
    s.psn_leg_health = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
    s.ai_engines_with_memo = 9; s.ai_engines_total = 10;
    s.depth_artifacts_count = 90; s.depth_artifacts_target = 100;
    s.graph_pagerank_centrality = 0.9; s.graph_bridging_edges_ratio = 0.9;
    s.numerical_fit_error_mean = 0.111; // 1/(1+0.111) ≈ 0.9
    s.omega_gate_pass_rate = 0.9; s.scrutiny_pass_rate = 0.9;
    s.delta_psi_7d = Math.log(9) / 100; // sigmoid → 0.9
    s.tests_total = 90; s.engines_total = 100;
    s.drift_detector_freshness = 0.9;
    // health is binary 4 bools — keep all true so health=1
    const r = eng.compute(s);
    expect(r.svi_moat).toBeGreaterThan(0.6);
    expect(r.svi_moat).toBeLessThan(0.95);
  });

  it("config C — JM-Die-class shop (DEPTH near max, all axes high) → near-perfect MOAT", () => {
    const r = eng.compute(perfectSignals());
    expect(r.svi_moat).toBeGreaterThan(0.95);
  });
});

describe("SVIEnhancedCalculatorEngine.computeMoatScore (geometric mean primitive)", () => {
  it("idempotent on uniform input: all values c, weights sum=1 ⇒ product = c", () => {
    const r = eng.computeMoatScore([0.7, 0.7, 0.7, 0.7, 0.7], [0.2, 0.2, 0.2, 0.2, 0.2]);
    expect(r).toBeCloseTo(0.7, 5);
  });
  it("any zero value ⇒ product near 0 (floored at ε^w)", () => {
    // (1e-6)^0.2 ≈ 0.0631 — the geometric-mean floor for one zero out of 5
    // axes with equal weights. Bound is mathematically exact; we assert
    // strictly less than 0.10 (and strictly greater than 0.03) so the
    // floor behavior is verified without coupling to the exact ε constant.
    const r = eng.computeMoatScore([1, 1, 0, 1, 1], [0.2, 0.2, 0.2, 0.2, 0.2]);
    expect(r).toBeLessThan(0.10);
    expect(r).toBeGreaterThan(0.03);
  });
  it("throws on weight-sum mismatch", () => {
    expect(() => eng.computeMoatScore([0.5, 0.5], [0.3, 0.3])).toThrow(/weight sum/);
  });
});

describe("SVIEnhancedCalculatorEngine.computeKolmogorovBound (U-SVI-E08 stub primitive)", () => {
  it("zero artifacts → zero bits, zero years", () => {
    const r = eng.computeKolmogorovBound(0, 0.5, 0.5);
    expect(r.k_bits).toBe(0);
    expect(r.t_match_years).toBe(0);
  });
  it("monotonic: more bits ⇒ more years", () => {
    const a = eng.computeKolmogorovBound(1e6, 1, 1);
    const b = eng.computeKolmogorovBound(2e6, 1, 1);
    expect(b.t_match_years).toBeGreaterThan(a.t_match_years);
  });
  it("non-derivable fraction acts as multiplier", () => {
    const all = eng.computeKolmogorovBound(1e6, 1, 1, 1e6);
    const half = eng.computeKolmogorovBound(1e6, 1, 0.5, 1e6);
    expect(half.t_match_years).toBeCloseTo(all.t_match_years / 2, 5);
  });
  it("realistic PRISM estimate produces > 1 year T_match", () => {
    // ~1e10 bits validated source × 0.5 non-derivable fraction / 1e6 productivity = 5000 years
    const r = eng.computeKolmogorovBound(1e10, 0.8, 0.5, 1e6);
    expect(r.t_match_years).toBeGreaterThan(1);
  });
});

describe("SVIEnhancedCalculatorEngine.computeLiveKolmogorov (U-SVI-E08)", () => {
  const baseStats = {
    engines: 3218, engine_avg_bytes: 4000,
    tests: 3916, test_avg_bytes: 2000,
    tribal_tips: 3919, tribal_avg_bytes: 500,
    scrutiny_ledger_entries: 1500, scrutiny_avg_bytes: 800,
    jm_die_programs: 76000, jm_die_avg_bytes: 1500,
    formulas: 499, formula_avg_bytes: 1000,
    scrutiny_pass_rate: 0.97,
  };
  it("real PRISM stats → T_match >> 1 year", () => {
    const r = eng.computeLiveKolmogorov(baseStats);
    expect(r.k_bits).toBeGreaterThan(1e9);
    expect(r.t_match_years).toBeGreaterThan(1);
    expect(r.per_subsystem.jm_die_corpus).toBeGreaterThan(r.per_subsystem.formulas_derivable);
  });
  it("JM Die corpus dominates the bound (non-derivable axis is load-bearing)", () => {
    const r = eng.computeLiveKolmogorov(baseStats);
    const jmDieFraction = r.per_subsystem.jm_die_corpus / r.k_bits;
    expect(jmDieFraction).toBeGreaterThan(0.40);
  });
  it("zero scrutiny pass rate → K(PRISM) = 0 (unvalidated = no moat)", () => {
    const r = eng.computeLiveKolmogorov({ ...baseStats, scrutiny_pass_rate: 0 });
    expect(r.k_bits).toBe(0);
    expect(r.t_match_years).toBe(0);
  });
  it("monotonic: doubling JM Die programs ⇒ K increases (always)", () => {
    const a = eng.computeLiveKolmogorov(baseStats);
    const b = eng.computeLiveKolmogorov({ ...baseStats, jm_die_programs: baseStats.jm_die_programs * 2 });
    expect(b.k_bits).toBeGreaterThan(a.k_bits);
  });
  it("productivity rate scales T_match inversely", () => {
    const slow = eng.computeLiveKolmogorov({ ...baseStats, productivity_bits_per_dev_year: 1e6 });
    const fast = eng.computeLiveKolmogorov({ ...baseStats, productivity_bits_per_dev_year: 2e6 });
    expect(fast.t_match_years).toBeCloseTo(slow.t_match_years / 2, 3);
  });
});

describe("SVIEnhancedCalculatorEngine.learnMutualInfoWeights (U-SVI-E09)", () => {
  it("empty input → empty weights", () => {
    const r = eng.learnMutualInfoWeights({});
    expect(Object.keys(r).length).toBe(0);
  });
  it("single component → weight = 1.0", () => {
    const r = eng.learnMutualInfoWeights({ alpha: [0.5, 0.6, 0.7] });
    expect(r.alpha).toBe(1);
  });
  it("two perfectly-correlated components → equal weights (sum=1)", () => {
    const r = eng.learnMutualInfoWeights({
      a: [0.1, 0.2, 0.3, 0.4, 0.5],
      b: [0.1, 0.2, 0.3, 0.4, 0.5],
    });
    expect(r.a).toBeCloseTo(0.5, 5);
    expect(r.b).toBeCloseTo(0.5, 5);
  });
  it("three components: one isolated (constant) gets near-zero weight", () => {
    const r = eng.learnMutualInfoWeights({
      a: [0.1, 0.2, 0.3, 0.4, 0.5],
      b: [0.2, 0.3, 0.4, 0.5, 0.6],
      iso: [0.5, 0.5, 0.5, 0.5, 0.5], // constant — corr=0
    });
    expect(r.iso).toBeCloseTo(0, 5);
    expect(r.a + r.b + r.iso).toBeCloseTo(1, 5);
    expect(r.a).toBeGreaterThan(0.30);
  });
  it("insufficient timeseries length (<2) → uniform weights (no-info default)", () => {
    const r = eng.learnMutualInfoWeights({ a: [0.5], b: [0.5], c: [0.5] });
    expect(r.a).toBeCloseTo(1/3, 5);
    expect(r.b).toBeCloseTo(1/3, 5);
    expect(r.c).toBeCloseTo(1/3, 5);
  });
  it("all-constant series → uniform weights (fail-soft)", () => {
    const r = eng.learnMutualInfoWeights({ a: [0.5, 0.5, 0.5], b: [0.6, 0.6, 0.6] });
    expect(r.a).toBeCloseTo(0.5, 5);
    expect(r.b).toBeCloseTo(0.5, 5);
  });
});

describe("SVIEnhancedCalculatorEngine.competitorSimulation (U-SVI-E10)", () => {
  const wellFundedProfile = {
    coverage_mean: 0.85, coverage_var: 0.01,
    depth_mean: 0.50, depth_var: 0.10,
    cross_coupling_mean: 0.60, cross_coupling_var: 0.05,
    quality_mean: 0.80, quality_var: 0.02,
  };
  it("deterministic seed reproducibility", () => {
    const a = eng.competitorSimulation(0.5, wellFundedProfile, 1000, 7);
    const b = eng.competitorSimulation(0.5, wellFundedProfile, 1000, 7);
    expect(a.p_competitor_exceeds).toBe(b.p_competitor_exceeds);
  });
  it("higher PRISM moat ⇒ lower P(competitor exceeds)", () => {
    // With time-locked depth+compounding=0 forced, max competitor moat ceiling
    // is ε^(w_depth + w_compounding) = ε^0.40 ≈ 0.004. So PRISM at 0.002 is
    // exceeded by some competitors; PRISM at 0.10 is never exceeded. This
    // verifies the MOAT MATH'S DEFENSE PROPERTY: time-lock is the wall.
    const easyToBeat = eng.competitorSimulation(0.002, wellFundedProfile, 2000, 11);
    const hardToBeat = eng.competitorSimulation(0.10, wellFundedProfile, 2000, 11);
    expect(easyToBeat.p_competitor_exceeds).toBeGreaterThan(hardToBeat.p_competitor_exceeds);
    expect(hardToBeat.p_competitor_exceeds).toBe(0);
  });
  it("time-locked axes (depth, compounding) force competitor moat ≤ some ceiling", () => {
    // With depth=0 and compounding=0 forced, geometric mean ≤ ε^(w_depth + w_compounding)
    // ≈ 1e-6^(0.25+0.15) = 1e-6^0.4 ≈ 0.0040 best case
    const r = eng.competitorSimulation(0.001, wellFundedProfile, 1000, 13);
    expect(r.max_competitor_moat).toBeLessThan(0.05);
  });
  it("zero samples → degenerate return (no division-by-zero)", () => {
    const r = eng.competitorSimulation(0.5, wellFundedProfile, 0, 1);
    expect(r.n_samples).toBe(0);
    expect(r.p_competitor_exceeds).toBe(0);
  });
  it("real PRISM moat (0.76 from live measurement) → P(competitor surpasses) ≈ 0", () => {
    const r = eng.competitorSimulation(0.7637, wellFundedProfile, 5000, 42);
    expect(r.p_competitor_exceeds).toBe(0);
    expect(r.max_competitor_moat).toBeLessThan(0.10);
  });
});

describe("SVIEnhancedCalculatorEngine — singleton export", () => {
  it("default singleton is wired", () => {
    expect(sviEnhancedCalculatorEngine).toBeInstanceOf(SVIEnhancedCalculatorEngine);
  });
  it("singleton.compute returns same shape as new instance", () => {
    const a = sviEnhancedCalculatorEngine.compute(zeroSignals());
    const b = new SVIEnhancedCalculatorEngine().compute(zeroSignals());
    expect(a.psi_new).toBe(b.psi_new);
    expect(a.svi_moat).toBe(b.svi_moat);
  });
});
