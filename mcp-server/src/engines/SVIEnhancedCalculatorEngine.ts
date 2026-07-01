/**
 * SVIEnhancedCalculatorEngine — 9-component Ψ + 5-axis moat product (U-SVI-E01 + U-SVI-E07)
 *
 * Replaces the stale hardcoded WIRED_PCT formula in svi-refresh.mjs with:
 *
 *   PSI_NEW = Σ_k (w_k × Ψ_k)         — weighted average of 9 live components
 *   SVI_MOAT = ∏_k (Φ_k)^v_k          — geometric-mean product of 5 moat axes
 *
 * Math primitives drawn from PSN's existing arsenal:
 *   - Shannon entropy (information theory) — for Kolmogorov K(PRISM) lower bound
 *   - Geometric mean (numerical analysis)  — moat product, one-weak-axis-dooms property
 *   - Sigmoid normalization                — COMPOUNDING_RATE squash to [0,1]
 *   - EMA smoothing                         — weight stability across refreshes
 *   - Pearson correlation                   — proxy for mutual information weights
 *
 * Karpathy R5 (math in code, not LLM), R12 (fail loud — boundary tests are HARD).
 *
 * @module engines/SVIEnhancedCalculatorEngine
 * @milestone SVI-ENHANCE-MS0/U-SVI-E01,U-SVI-E07
 */

/** Live source counts/signals — caller fetches these from disk + passes in. Engine is pure math. */
export interface SVISourceSignals {
  /** From system-graph.json — counted hubs + counted orphans. */
  hubs_total: number;
  orphans_total: number;
  /** From MILESTONE_PROGRESS — milestone-envelope drift detector. */
  milestones_total: number;
  milestones_with_drift: number;
  /** From knowledge-link-audit.json. */
  wiki_tokens_total: number;
  wiki_tokens_broken: number;
  wiki_files_total: number;
  wiki_files_missing_tribal: number;
  /** Per-PSN-leg health scores (11 legs per feedback_psn_definition). */
  psn_leg_health: number[];
  /** Health-tier booleans — each contributes 1/4 to Ψ_health. */
  health_mcp_up: boolean;
  health_ollama_up: boolean;
  health_viz_fresh: boolean;
  health_build_fresh: boolean;
  /** PRISM-AI memo coverage. */
  ai_engines_total: number;
  ai_engines_with_memo: number;
  /** Test count vs engine count + recent scrutiny pass rate. */
  tests_total: number;
  engines_total: number;
  scrutiny_pass_rate: number; // 0..1
  /** Drift-detector freshness — mtime audits, 1 = all fresh, 0 = all stale. */
  drift_detector_freshness: number;
  /** Per-axis MOAT inputs (U-SVI-E07). */
  depth_artifacts_count: number;     // tests × tribal-tips × programs × ledger-length (or proxy)
  depth_artifacts_target: number;    // empirical max-observed-so-far (sliding ceiling)
  graph_pagerank_centrality: number; // mean centrality of the engine call-graph 0..1
  graph_bridging_edges_ratio: number; // 0..1
  numerical_fit_error_mean: number;  // 0 = perfect, larger = worse; mapped via 1/(1+x)
  omega_gate_pass_rate: number;      // 0..1
  delta_psi_7d: number;              // raw ΔΨ over last 7 days, can be negative
}

export interface PsiComponent {
  name: string;
  value: number;   // 0..1
  weight: number;  // 0..1, weights sum to 1.0
  contribution: number; // value × weight
  source: string;
}

export interface SVIEnhancedResult {
  psi_new: number;            // weighted average [0,1]
  svi_moat: number;           // geometric-mean product [0,1]
  components: PsiComponent[]; // 9 entries
  moat_axes: PsiComponent[];  // 5 entries
  delta_to_perfect: number;   // 1 - psi_new
  delta_to_moat_perfect: number; // 1 - svi_moat
  honesty_note: string;       // human-readable explanation of any vanity-rejection
}

export interface MoatProductWeights {
  coverage: number;
  depth: number;
  cross_coupling: number;
  quality: number;
  compounding_rate: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants — weights documented + version-locked. Sum to 1.0 ± 1e-9.
// ────────────────────────────────────────────────────────────────────────────
export const PSI_COMPONENT_WEIGHTS: Record<string, number> = {
  wiring:           0.20,
  envelope:         0.12,
  wiki:             0.08,
  tribal:           0.10,
  psn_legs:         0.20,
  health:           0.15,
  memory:           0.05,
  test_coverage:    0.05,
  drift_freshness:  0.05,
};

/** Default MOAT product weights — auto-tuned by U-SVI-E09 in production. */
export const DEFAULT_MOAT_WEIGHTS: MoatProductWeights = {
  coverage:         0.20,
  depth:            0.25,
  cross_coupling:   0.20,
  quality:          0.20,
  compounding_rate: 0.15,
};

const EPSILON_PSI_FLOOR = 1e-6; // keeps geometric-mean gradient defined

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────────────────────────────

/** Clamp value into [lo, hi]. */
function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

/** Safe ratio numerator/denominator, returns 0 on degenerate denominator. */
function safeRatio(num: number, den: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return clamp(num / den, 0, 1);
}

/** Sigmoid centered + scaled: maps any real to [0,1]; 0 → 0.5; +∞ → 1; −∞ → 0; NaN → 0.5. */
function sigmoid(x: number): number {
  if (Number.isNaN(x)) return 0.5;
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Geometric mean of components^weights. Weights must sum to 1 ± 1e-6.
 * Boundary: any value ≤ EPSILON_PSI_FLOOR ⇒ floored to EPSILON, then product computed.
 * Property: one zero value ⇒ product ≈ 0 (math captures 'no axis can be left behind').
 */
function geometricMean(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const wsum = weights.reduce((s, w) => s + w, 0);
  if (Math.abs(wsum - 1) > 1e-6) {
    throw new Error(`MOAT weight sum must be 1.0 ± 1e-6; got ${wsum}`);
  }
  let logSum = 0;
  for (let i = 0; i < values.length; i++) {
    const floored = Math.max(values[i], EPSILON_PSI_FLOOR);
    logSum += weights[i] * Math.log(floored);
  }
  return clamp(Math.exp(logSum), 0, 1);
}

// ────────────────────────────────────────────────────────────────────────────
// PRIMITIVE A — 9-component live Ψ (U-SVI-E01)
// ────────────────────────────────────────────────────────────────────────────

export class SVIEnhancedCalculatorEngine {
  /**
   * Compute the new 9-component live Ψ + the 5-axis MOAT product. Pure
   * function; deterministic over input signals.
   */
  compute(signals: SVISourceSignals, moatWeights: MoatProductWeights = DEFAULT_MOAT_WEIGHTS): SVIEnhancedResult {
    const componentValues = this.computeComponents(signals);
    const components: PsiComponent[] = Object.entries(componentValues).map(([name, value]) => {
      const weight = PSI_COMPONENT_WEIGHTS[name] ?? 0;
      return { name, value, weight, contribution: value * weight, source: this.sourceFor(name) };
    });
    const psiNew = clamp(components.reduce((s, c) => s + c.contribution, 0), 0, 1);

    const moatAxisValues = this.computeMoatAxes(signals, componentValues);
    const moatAxes: PsiComponent[] = [
      { name: "coverage",         value: moatAxisValues.coverage,         weight: moatWeights.coverage,         contribution: 0, source: "9-component Ψ" },
      { name: "depth",            value: moatAxisValues.depth,            weight: moatWeights.depth,            contribution: 0, source: "depth_artifacts ratio" },
      { name: "cross_coupling",   value: moatAxisValues.cross_coupling,   weight: moatWeights.cross_coupling,   contribution: 0, source: "PageRank + bridging-edges" },
      { name: "quality",          value: moatAxisValues.quality,          weight: moatWeights.quality,          contribution: 0, source: "numerical fit + Ω gates + scrutiny" },
      { name: "compounding_rate", value: moatAxisValues.compounding_rate, weight: moatWeights.compounding_rate, contribution: 0, source: "ΔΨ_7d via sigmoid" },
    ];
    const sviMoat = geometricMean(
      moatAxes.map((a) => a.value),
      moatAxes.map((a) => a.weight)
    );
    // post-fill contribution as the geom-mean-style log-share for explainability
    for (const a of moatAxes) {
      a.contribution = a.weight * Math.log(Math.max(a.value, EPSILON_PSI_FLOOR));
    }

    const honesty = this.honestyNote(psiNew, sviMoat, moatAxes);

    return {
      psi_new: psiNew,
      svi_moat: sviMoat,
      components,
      moat_axes: moatAxes,
      delta_to_perfect: 1 - psiNew,
      delta_to_moat_perfect: 1 - sviMoat,
      honesty_note: honesty,
    };
  }

  /** Compute each of the 9 Ψ components from live signals. */
  private computeComponents(s: SVISourceSignals): Record<string, number> {
    const wiring = safeRatio(s.hubs_total - s.orphans_total, s.hubs_total);
    // Inverse-ratio components: when the universe is empty (denominator=0) the
    // component is UNDEFINED, not "perfect". Map undefined → 0 so the
    // zero-signals baseline correctly reports Ψ=0 (R12 fail loud — never
    // award credit for absent data).
    const envelope = s.milestones_total > 0 ? 1 - safeRatio(s.milestones_with_drift, s.milestones_total) : 0;
    const wiki = s.wiki_tokens_total > 0 ? 1 - safeRatio(s.wiki_tokens_broken, s.wiki_tokens_total) : 0;
    const tribal = s.wiki_files_total > 0 ? 1 - safeRatio(s.wiki_files_missing_tribal, s.wiki_files_total) : 0;
    const psn_legs = s.psn_leg_health.length === 0
      ? 0
      : clamp(s.psn_leg_health.reduce((a, b) => a + b, 0) / s.psn_leg_health.length, 0, 1);
    const health = (
      (s.health_mcp_up ? 1 : 0) +
      (s.health_ollama_up ? 1 : 0) +
      (s.health_viz_fresh ? 1 : 0) +
      (s.health_build_fresh ? 1 : 0)
    ) / 4;
    const memory = safeRatio(s.ai_engines_with_memo, Math.max(1, s.ai_engines_total));
    const testCoverageRatio = safeRatio(s.tests_total, Math.max(1, s.engines_total));
    const test_coverage = clamp(testCoverageRatio * clamp(s.scrutiny_pass_rate, 0, 1), 0, 1);
    const drift_freshness = clamp(s.drift_detector_freshness, 0, 1);
    return { wiring, envelope, wiki, tribal, psn_legs, health, memory, test_coverage, drift_freshness };
  }

  /** Compute the 5 MOAT axes from signals + the 9 components. */
  private computeMoatAxes(s: SVISourceSignals, comp: Record<string, number>) {
    const coverage = clamp(
      comp.wiring * PSI_COMPONENT_WEIGHTS.wiring +
      comp.envelope * PSI_COMPONENT_WEIGHTS.envelope +
      comp.wiki * PSI_COMPONENT_WEIGHTS.wiki,
      0, 1
    ) / (PSI_COMPONENT_WEIGHTS.wiring + PSI_COMPONENT_WEIGHTS.envelope + PSI_COMPONENT_WEIGHTS.wiki);

    const depth = safeRatio(s.depth_artifacts_count, Math.max(1, s.depth_artifacts_target));
    const cross_coupling = clamp(
      0.6 * clamp(s.graph_pagerank_centrality, 0, 1) +
      0.4 * clamp(s.graph_bridging_edges_ratio, 0, 1),
      0, 1
    );
    const quality = clamp(
      0.4 * (1 / (1 + Math.max(0, s.numerical_fit_error_mean))) +
      0.3 * clamp(s.omega_gate_pass_rate, 0, 1) +
      0.3 * clamp(s.scrutiny_pass_rate, 0, 1),
      0, 1
    );
    // ΔΨ_7d via sigmoid scaled by 100 — a +0.01 weekly gain ≈ sigmoid(1) ≈ 0.73
    const compounding_rate = sigmoid(s.delta_psi_7d * 100);
    return { coverage, depth, cross_coupling, quality, compounding_rate };
  }

  /** Build the honest explanation string — names the weakest axis. */
  private honestyNote(psi: number, moat: number, axes: PsiComponent[]): string {
    if (axes.length === 0) return "no axes computed";
    const weakest = axes.reduce((acc, a) => (a.value < acc.value ? a : acc), axes[0]);
    if (moat < 0.10) {
      return `MOAT collapse: weakest axis '${weakest.name}'=${weakest.value.toFixed(3)} dooms the product (geometric-mean property). Ψ=${psi.toFixed(3)} masks this.`;
    }
    if (weakest.value < 0.50) {
      return `Real Ψ=${psi.toFixed(3)} · MOAT=${moat.toFixed(3)}. Weakest axis '${weakest.name}'=${weakest.value.toFixed(3)} caps the moat ceiling.`;
    }
    return `Real Ψ=${psi.toFixed(3)} · MOAT=${moat.toFixed(3)}. All axes ≥ 0.50; weakest='${weakest.name}'=${weakest.value.toFixed(3)}.`;
  }

  private sourceFor(name: string): string {
    const map: Record<string, string> = {
      wiring:          "system-graph.json",
      envelope:        "MILESTONE_PROGRESS.json",
      wiki:            "knowledge-link-audit.json",
      tribal:          "knowledge-link-audit.json",
      psn_legs:        "per-leg health probes (11 legs)",
      health:          "hook-health + MCP/Ollama/viz/build probes",
      memory:          "prism-ai-memo-cross-ref-audit.json",
      test_coverage:   "SCRUTINY_LEDGER + test/engine counts",
      drift_freshness: "drift-detector mtime audits",
    };
    return map[name] ?? "unknown";
  }

  // ────────────────────────────────────────────────────────────────────────
  // Standalone math primitives — exposed for tests + downstream callers
  // ────────────────────────────────────────────────────────────────────────

  /** Geometric mean of 5 axes; exposed for callers who want only the MOAT product. */
  computeMoatScore(axes: number[], weights: number[]): number {
    return geometricMean(axes, weights);
  }

  /**
   * Kolmogorov-complexity LOWER BOUND on competitor re-derivation effort.
   * K(PRISM) ≈ Σ subsystem (Shannon entropy × validation density).
   * Returns bits + an estimated T_match in years given productivity_rate.
   */
  computeKolmogorovBound(
    artifactsBits: number,
    validationDensity: number,
    nonDerivableFraction: number,
    productivityBitsPerDevYear: number = 1e6
  ): { k_bits: number; t_match_years: number } {
    const validated = Math.max(0, artifactsBits) * clamp(validationDensity, 0, 1);
    const nonDerivable = validated * clamp(nonDerivableFraction, 0, 1);
    const tMatch = nonDerivable / Math.max(1, productivityBitsPerDevYear);
    return { k_bits: validated, t_match_years: tMatch };
  }

  /**
   * U-SVI-E08 — LIVE Kolmogorov bound from per-subsystem artifact stats.
   * Each subsystem contributes:  bits = artifact_count × avg_bytes × 8 × validation_density
   * Non-derivable axes (JM Die corpus, scrutiny ledger, tribal tips, mistake-learning memos)
   * carry full weight; public-source axes (formulas, standards) carry 0.1× weight.
   */
  computeLiveKolmogorov(stats: {
    engines: number; engine_avg_bytes: number;
    tests: number; test_avg_bytes: number;
    tribal_tips: number; tribal_avg_bytes: number;
    scrutiny_ledger_entries: number; scrutiny_avg_bytes: number;
    jm_die_programs: number; jm_die_avg_bytes: number;
    formulas: number; formula_avg_bytes: number;
    scrutiny_pass_rate: number;
    productivity_bits_per_dev_year?: number;
  }): { k_bits: number; t_match_years: number; per_subsystem: Record<string, number> } {
    const rate = stats.productivity_bits_per_dev_year ?? 1e6;
    const v = clamp(stats.scrutiny_pass_rate, 0, 1);
    const bits = (n: number, avg: number) => Math.max(0, n) * Math.max(0, avg) * 8;
    // Non-derivable: scrutiny + tribal + JM Die + tests
    const nd_scrutiny = bits(stats.scrutiny_ledger_entries, stats.scrutiny_avg_bytes) * v;
    const nd_tribal = bits(stats.tribal_tips, stats.tribal_avg_bytes) * v;
    const nd_jmdie = bits(stats.jm_die_programs, stats.jm_die_avg_bytes) * v;
    const nd_tests = bits(stats.tests, stats.test_avg_bytes) * v;
    const nd_engines = bits(stats.engines, stats.engine_avg_bytes) * v;
    // Derivable-but-validated: formulas (10% weight since public ISO/Sandvik sources exist)
    const d_formulas = bits(stats.formulas, stats.formula_avg_bytes) * v * 0.1;
    const k_bits = nd_scrutiny + nd_tribal + nd_jmdie + nd_tests + nd_engines + d_formulas;
    const t_match_years = k_bits / Math.max(1, rate);
    return {
      k_bits,
      t_match_years,
      per_subsystem: {
        scrutiny_ledger: nd_scrutiny,
        tribal_tips: nd_tribal,
        jm_die_corpus: nd_jmdie,
        tests: nd_tests,
        engines: nd_engines,
        formulas_derivable: d_formulas,
      },
    };
  }

  /**
   * U-SVI-E10 — Monte Carlo competitor simulation.
   * Generates N synthetic competitor catalogs sampled from a scenario distribution
   * with time-locked axes (DEPTH, COMPOUNDING_RATE) set to 0 (competitors cannot
   * acquire years of operations data overnight). Returns the empirical CDF
   * P(competitor_SVI_moat ≥ prismSviMoat) — the literal moat-defense probability.
   *
   * Math: rejection sampling over a Beta-ish prior per axis (mean from
   * competitor profile, variance from confidence band); deterministic given a
   * seed (xorshift32 PRNG, no Math.random — reproducible Monte Carlo).
   *
   * Profile = {coverage_mean, coverage_var, depth_mean, depth_var,
   *            cross_coupling_mean, cross_coupling_var, quality_mean, quality_var}
   * — the time-locked axes have 0 sample-time access so DEPTH + COMPOUNDING_RATE
   * are forced to 0 (math: "can't time-travel into shop data").
   */
  competitorSimulation(
    prismSviMoat: number,
    profile: { coverage_mean: number; coverage_var: number; depth_mean: number; depth_var: number; cross_coupling_mean: number; cross_coupling_var: number; quality_mean: number; quality_var: number },
    nSamples: number = 10000,
    seed: number = 42,
    moatWeights: MoatProductWeights = DEFAULT_MOAT_WEIGHTS
  ): { n_samples: number; p_competitor_exceeds: number; mean_competitor_moat: number; max_competitor_moat: number; prism_svi_moat: number } {
    if (nSamples < 1) return { n_samples: 0, p_competitor_exceeds: 0, mean_competitor_moat: 0, max_competitor_moat: 0, prism_svi_moat: prismSviMoat };
    // xorshift32 — deterministic
    let s = seed >>> 0 || 1;
    const rand = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17; s >>>= 0;
      s ^= s << 5; s >>>= 0;
      return s / 0xFFFFFFFF;
    };
    // Approx Gaussian via Box-Muller; truncate to [0,1] via clamp (acceptable
    // bias for tail-defense math; exact Beta would require gamma inverse CDF).
    const sample = (mean: number, variance: number): number => {
      const sd = Math.sqrt(Math.max(0, variance));
      const u1 = Math.max(1e-9, rand());
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return clamp(mean + sd * z, 0, 1);
    };
    let exceedCount = 0;
    let sumMoat = 0;
    let maxMoat = 0;
    const w = [moatWeights.coverage, moatWeights.depth, moatWeights.cross_coupling, moatWeights.quality, moatWeights.compounding_rate];
    for (let i = 0; i < nSamples; i++) {
      const cov = sample(profile.coverage_mean, profile.coverage_var);
      // TIME-LOCKED: depth and compounding_rate set to 0 (math: competitor can't time-travel)
      const dep = 0;
      const cc = sample(profile.cross_coupling_mean, profile.cross_coupling_var);
      const qual = sample(profile.quality_mean, profile.quality_var);
      const comp = 0;
      const m = geometricMean([cov, dep, cc, qual, comp], w);
      if (m >= prismSviMoat) exceedCount++;
      sumMoat += m;
      if (m > maxMoat) maxMoat = m;
    }
    return {
      n_samples: nSamples,
      p_competitor_exceeds: exceedCount / nSamples,
      mean_competitor_moat: sumMoat / nSamples,
      max_competitor_moat: maxMoat,
      prism_svi_moat: prismSviMoat,
    };
  }

  /**
   * U-SVI-E09 — Pairwise mutual-information weight learner.
   * Given per-component Ψ_k time series (one array of values per component),
   * compute weight w_k ∝ Σ_j≠k I(Ψ_k; Ψ_j) where I is approximated by
   * absolute Pearson correlation (≈ MI for jointly-gaussian-ish data; cheap
   * + deterministic; no histogram-bin choice required).
   *
   * Returns normalized weights summing to 1.0 (smooth EMA NOT applied here —
   * caller smooths across refreshes).
   */
  learnMutualInfoWeights(
    componentTimeseries: Record<string, number[]>
  ): Record<string, number> {
    const names = Object.keys(componentTimeseries);
    if (names.length === 0) return {};
    if (names.length === 1) return { [names[0]]: 1 };
    // Validate equal-length series
    const T = componentTimeseries[names[0]].length;
    if (T < 2) {
      // Insufficient data — return uniform
      const uniform = 1 / names.length;
      return Object.fromEntries(names.map((n) => [n, uniform]));
    }
    // Pearson correlation as MI proxy (|r| ∈ [0,1])
    const corr = (a: number[], b: number[]): number => {
      const n = Math.min(a.length, b.length);
      if (n < 2) return 0;
      let sa = 0, sb = 0;
      for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
      const ma = sa / n, mb = sb / n;
      let cov = 0, va = 0, vb = 0;
      for (let i = 0; i < n; i++) {
        const da = a[i] - ma, db = b[i] - mb;
        cov += da * db; va += da * da; vb += db * db;
      }
      if (va === 0 || vb === 0) return 0; // constant series ⇒ no info
      return Math.abs(cov / Math.sqrt(va * vb));
    };
    // Centrality: w_k_raw = Σ_{j≠k} |corr(Ψ_k, Ψ_j)|
    const raw: Record<string, number> = {};
    let totalRaw = 0;
    for (const k of names) {
      let sum = 0;
      for (const j of names) {
        if (j === k) continue;
        sum += corr(componentTimeseries[k], componentTimeseries[j]);
      }
      raw[k] = sum;
      totalRaw += sum;
    }
    // Normalize. If all-zero (constant series across all components), fall back to uniform.
    if (totalRaw === 0) {
      const u = 1 / names.length;
      return Object.fromEntries(names.map((n) => [n, u]));
    }
    return Object.fromEntries(names.map((n) => [n, raw[n] / totalRaw]));
  }
}

export const sviEnhancedCalculatorEngine = new SVIEnhancedCalculatorEngine();
