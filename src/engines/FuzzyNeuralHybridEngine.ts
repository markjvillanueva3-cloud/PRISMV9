/**
 * FuzzyNeuralHybridEngine — Neuro-fuzzy parameter optimization for CNC machining
 *
 * Methods: ANFIS, Fuzzy Taguchi, Type-2 Fuzzy Sets, Fuzzy AHP
 * References: Jang (1993) ANFIS, Mendel (2001) Type-2 FL, Saaty (1980) AHP
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface FuzzySet { name: string; type: 'gaussian' | 'triangular' | 'trapezoidal'; params: number[] }

export interface ANFISInput {
  inputs: Array<{ name: string; value: number; sets: FuzzySet[] }>;
  rules?: Array<{ antecedents: number[]; consequent_coeffs: number[] }>;
  training_data?: Array<{ inputs: number[]; output: number }>;
  learning_rate?: number; epochs?: number;
}

export interface FuzzyTaguchi {
  factors: Array<{ name: string; levels: number[] }>;
  responses: Array<{
    name: string; values: number[][]; target: 'larger' | 'smaller' | 'nominal'; weight?: number;
  }>;
}

export interface FuzzyAHPInput {
  criteria: string[];
  comparisons: Array<{ i: number; j: number; value: number }>;
  alternatives: string[];
  alt_comparisons: Array<{
    criterion_idx: number; comparisons: Array<{ i: number; j: number; value: number }>;
  }>;
}

export interface FuzzyNeuralInput {
  method: 'anfis' | 'fuzzy_taguchi' | 'type2_fuzzy' | 'fuzzy_ahp';
  anfis?: ANFISInput; taguchi?: FuzzyTaguchi;
  type2?: {
    sets: Array<{ name: string; lower_mf: FuzzySet; upper_mf: FuzzySet }>;
    input: number;
  };
  ahp?: FuzzyAHPInput;
}

export interface ANFISResult {
  output: number; firing_strengths: number[]; rule_outputs: number[];
  trained: boolean; training_rmse?: number;
}
export interface TaguchiFuzzyResult {
  optimal_levels: Record<string, number>; sn_ratios: number[];
  fuzzy_desirability: number[]; best_combination: Record<string, number>;
}
export interface Type2Result {
  defuzzified_value: number; uncertainty_range: [number, number];
  centroid_interval: [number, number];
}
export interface AHPResult {
  criteria_weights: number[];
  alternative_scores: Array<{ name: string; score: number }>;
  best_alternative: string; consistency_ratio: number; consistent: boolean;
}

export interface FuzzyNeuralResult {
  method: string; anfis_result?: ANFISResult; taguchi_result?: TaguchiFuzzyResult;
  type2_result?: Type2Result; ahp_result?: AHPResult; warnings: string[]; formula: string;
}

const R6 = (v: number): number => Math.round(v * 1e6) / 1e6;
const RI: Record<number, number> = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };

// ─── Engine ────────────────────────────────────────────────────────

export class FuzzyNeuralHybridEngine {
  /** Gaussian MF: exp(-0.5 * ((x - mean) / sigma)²) */
  gaussianMF(x: number, mean: number, sigma: number): number {
    if (sigma === 0) return x === mean ? 1 : 0;
    const z = (x - mean) / sigma;
    return Math.exp(-0.5 * z * z);
  }

  /** Triangular MF with vertices a ≤ b ≤ c */
  triangularMF(x: number, a: number, b: number, c: number): number {
    if (x <= a || x >= c) return 0;
    return x <= b ? (x - a) / (b - a || 1) : (c - x) / (c - b || 1);
  }

  private trapezoidalMF(x: number, a: number, b: number, c: number, d: number): number {
    if (x <= a || x >= d) return 0;
    if (x >= b && x <= c) return 1;
    return x < b ? (x - a) / (b - a || 1) : (d - x) / (d - c || 1);
  }

  private evalMF(x: number, set: FuzzySet): number {
    const p = set.params;
    switch (set.type) {
      case 'gaussian': return this.gaussianMF(x, p[0], p[1]);
      case 'triangular': return this.triangularMF(x, p[0], p[1], p[2]);
      case 'trapezoidal': return this.trapezoidalMF(x, p[0], p[1], p[2], p[3]);
    }
  }

  /** Main dispatcher */
  compute(input: FuzzyNeuralInput): FuzzyNeuralResult {
    const w: string[] = [];
    const base: FuzzyNeuralResult = { method: input.method, warnings: w, formula: '' };
    switch (input.method) {
      case 'anfis':
        if (!input.anfis) { w.push('Missing anfis input'); return base; }
        base.anfis_result = this.anfisPredict(input.anfis, w);
        base.formula = 'ANFIS: f = Σ(w̄ᵢ·fᵢ), fᵢ = pᵢx + qᵢy + rᵢ (Sugeno)'; break;
      case 'fuzzy_taguchi':
        if (!input.taguchi) { w.push('Missing taguchi input'); return base; }
        base.taguchi_result = this.fuzzyTaguchi(input.taguchi, w);
        base.formula = 'S/N = -10·log₁₀(Σyᵢ²/n) → fuzzy desirability ∈ [0,1]'; break;
      case 'type2_fuzzy':
        if (!input.type2) { w.push('Missing type2 input'); return base; }
        base.type2_result = this.type2Defuzzify(input.type2.sets, input.type2.input, w);
        base.formula = 'IT2-FS: centroid ∈ [c_l, c_r] via KM algorithm'; break;
      case 'fuzzy_ahp':
        if (!input.ahp) { w.push('Missing ahp input'); return base; }
        base.ahp_result = this.fuzzyAHP(input.ahp, w);
        base.formula = 'AHP: Aw = λ_max·w, CR = CI/RI, CI = (λ_max - n)/(n - 1)'; break;
      default: w.push(`Unknown method: ${input.method}`);
    }
    return base;
  }

  /** ANFIS forward pass + optional gradient-descent training on Sugeno consequent params */
  anfisPredict(input: ANFISInput, warnings: string[] = []): ANFISResult {
    const { inputs, training_data } = input;
    const lr = input.learning_rate ?? 0.01, epochs = input.epochs ?? 50;
    const setCounts = inputs.map(inp => inp.sets.length);
    const ruleCount = setCounts.reduce((a, b) => a * b, 1);

    // Build default rules if not provided (cartesian product of set indices)
    let rules = input.rules;
    if (!rules || rules.length === 0) {
      rules = [];
      for (let r = 0; r < ruleCount; r++) {
        let idx = r;
        const ant: number[] = [];
        for (let i = inputs.length - 1; i >= 0; i--) {
          ant.unshift(idx % setCounts[i]);
          idx = Math.floor(idx / setCounts[i]);
        }
        const coeffs = inputs.map(() => 0.1 * (Math.random() - 0.5));
        coeffs.push(0.5);
        rules.push({ antecedents: ant, consequent_coeffs: coeffs });
      }
    }

    const rp = rules.map(r => ({ antecedents: [...r.antecedents], consequent_coeffs: [...r.consequent_coeffs] }));
    let rmse = 0;
    const trained = !!(training_data && training_data.length > 0);

    if (trained && training_data) {
      if (training_data.length < 3) warnings.push('Training data < 3 samples; results may be unreliable');
      for (let epoch = 0; epoch < epochs; epoch++) {
        let sse = 0;
        for (const sample of training_data) {
          const fwd = this.anfisForward(sample.inputs, inputs, rp, setCounts);
          const err = sample.output - fwd.output;
          sse += err * err;
          for (let r = 0; r < rp.length; r++) {
            const c = rp[r].consequent_coeffs;
            for (let j = 0; j < sample.inputs.length; j++) c[j] += lr * err * fwd.firingNorm[r] * sample.inputs[j];
            c[c.length - 1] += lr * err * fwd.firingNorm[r];
          }
        }
        rmse = Math.sqrt(sse / training_data.length);
      }
    }

    const fwd = this.anfisForward(inputs.map(inp => inp.value), inputs, rp, setCounts);
    return {
      output: R6(fwd.output), firing_strengths: fwd.firingNorm.map(R6),
      rule_outputs: fwd.ruleOutputs.map(R6), trained,
      training_rmse: trained ? R6(rmse) : undefined,
    };
  }

  private anfisForward(vals: number[], defs: ANFISInput['inputs'],
    rules: Array<{ antecedents: number[]; consequent_coeffs: number[] }>, setCounts: number[]
  ): { output: number; firingNorm: number[]; ruleOutputs: number[] } {
    const mf: number[][] = defs.map((inp, i) => inp.sets.map(s => this.evalMF(vals[i], s)));
    const raw = rules.map(r => r.antecedents.reduce((p, si, i) => p * mf[i][si], 1));
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    const norm = raw.map(w => w / sum);
    const ro = rules.map(r => {
      const c = r.consequent_coeffs;
      let f = c[c.length - 1];
      for (let j = 0; j < vals.length && j < c.length - 1; j++) f += c[j] * vals[j];
      return f;
    });
    return { output: norm.reduce((s, w, i) => s + w * ro[i], 0), firingNorm: norm, ruleOutputs: ro };
  }

  /** Fuzzy Taguchi — robust parameter design with fuzzy desirability */
  fuzzyTaguchi(input: FuzzyTaguchi, warnings: string[] = []): TaguchiFuzzyResult {
    const { factors, responses } = input;
    if (factors.length === 0) {
      warnings.push('No factors provided');
      return { optimal_levels: {}, sn_ratios: [], fuzzy_desirability: [], best_combination: {} };
    }
    const lc = factors.map(f => f.levels.length);
    const numExp = lc.reduce((a, b) => a * b, 1);

    // S/N ratios per response per experiment
    const snByResp: number[][] = responses.map(resp => resp.values.map(reps => {
      const n = reps.length; if (n === 0) return 0;
      switch (resp.target) {
        case 'larger': return -10 * Math.log10(reps.reduce((s, y) => s + 1 / (y * y || 1), 0) / n);
        case 'smaller': return -10 * Math.log10(reps.reduce((s, y) => s + y * y, 0) / n);
        case 'nominal': {
          const m = reps.reduce((a, b) => a + b, 0) / n;
          const v = reps.reduce((s, y) => s + (y - m) ** 2, 0) / n || 1e-12;
          return 10 * Math.log10((m * m) / v);
        }
      }
    }));

    // Normalize S/N → [0,1] per response
    const normSN = snByResp.map(arr => {
      const mn = Math.min(...arr), rng = Math.max(...arr) - mn || 1;
      return arr.map(v => (v - mn) / rng);
    });

    const wts = responses.map(r => r.weight ?? 1);
    const tw = wts.reduce((a, b) => a + b, 0) || 1;
    const nw = wts.map(w => w / tw);
    const ec = normSN[0]?.length ?? 0;

    // Fuzzy desirability: weighted geometric mean
    const fd: number[] = [];
    const cSN: number[] = [];
    for (let e = 0; e < ec; e++) {
      let ls = 0, sn = 0;
      for (let r = 0; r < normSN.length; r++) {
        ls += nw[r] * Math.log(Math.max(normSN[r][e], 1e-12));
        sn += nw[r] * (snByResp[r][e] ?? 0);
      }
      fd.push(R6(Math.exp(ls)));
      cSN.push(Math.round(sn * 1e4) / 1e4);
    }

    // Optimal level per factor via average composite S/N
    const opt: Record<string, number> = {};
    for (let f = 0; f < factors.length; f++) {
      let bestSN = -Infinity, bestLvl = factors[f].levels[0];
      for (let l = 0; l < factors[f].levels.length; l++) {
        let sum = 0, cnt = 0;
        for (let e = 0; e < numExp; e++) {
          let idx = e, li = 0;
          for (let ff = factors.length - 1; ff >= 0; ff--) {
            const x = idx % lc[ff]; idx = Math.floor(idx / lc[ff]);
            if (ff === f) li = x;
          }
          if (li === l && e < cSN.length) { sum += cSN[e]; cnt++; }
        }
        const avg = cnt > 0 ? sum / cnt : 0;
        if (avg > bestSN) { bestSN = avg; bestLvl = factors[f].levels[l]; }
      }
      opt[factors[f].name] = bestLvl;
    }
    return { optimal_levels: opt, sn_ratios: cSN, fuzzy_desirability: fd, best_combination: { ...opt } };
  }

  /** Type-2 fuzzy defuzzification via Karnik-Mendel type reduction */
  type2Defuzzify(
    sets: Array<{ name: string; lower_mf: FuzzySet; upper_mf: FuzzySet }>,
    input: number, warnings: string[] = []
  ): Type2Result {
    if (sets.length === 0) {
      warnings.push('No Type-2 fuzzy sets provided');
      return { defuzzified_value: 0, uncertainty_range: [0, 0], centroid_interval: [0, 0] };
    }
    const lo = sets.map(s => this.evalMF(input, s.lower_mf));
    const up = sets.map(s => this.evalMF(input, s.upper_mf));
    for (let i = 0; i < sets.length; i++) {
      if (up[i] < lo[i] - 1e-9) { warnings.push(`Set "${sets[i].name}": upper MF < lower MF`); up[i] = lo[i]; }
    }

    // Set centroids for KM discrete points
    const ctr = sets.map(s => {
      const p = s.lower_mf.params;
      return s.lower_mf.type === 'gaussian' ? p[0] : s.lower_mf.type === 'triangular' ? p[1] : (p[1] + p[2]) / 2;
    });
    const idx = ctr.map((_, i) => i).sort((a, b) => ctr[a] - ctr[b]);
    const sx = idx.map(i => ctr[i]), sl = idx.map(i => lo[i]), su = idx.map(i => up[i]);
    const cL = this.kmEndpoint(sx, sl, su, 'left'), cR = this.kmEndpoint(sx, sl, su, 'right');

    return {
      defuzzified_value: R6((cL + cR) / 2),
      uncertainty_range: [R6(Math.min(...lo)), R6(Math.max(...up))],
      centroid_interval: [R6(cL), R6(cR)],
    };
  }

  private kmEndpoint(x: number[], lower: number[], upper: number[], side: 'left' | 'right'): number {
    const n = x.length; if (n === 0) return 0;
    const w = [...upper]; let sp = Math.floor(n / 2);
    for (let it = 0; it < 20; it++) {
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) { num += x[i] * w[i]; den += w[i]; }
      const c = den > 0 ? num / den : 0;
      let ns = n - 1;
      for (let i = 0; i < n - 1; i++) { if (x[i] <= c && c < x[i + 1]) { ns = i; break; } }
      if (ns === sp) break;
      sp = ns;
      for (let i = 0; i < n; i++) {
        w[i] = side === 'left' ? (i <= sp ? upper[i] : lower[i]) : (i <= sp ? lower[i] : upper[i]);
      }
    }
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += x[i] * w[i]; den += w[i]; }
    return den > 0 ? num / den : 0;
  }

  /** Fuzzy AHP — multi-criteria decision with consistency check (CR < 0.1) */
  fuzzyAHP(input: FuzzyAHPInput, warnings: string[] = []): AHPResult {
    const { criteria, comparisons, alternatives, alt_comparisons } = input;
    const n = criteria.length;
    if (n < 2) {
      warnings.push('AHP requires at least 2 criteria');
      return { criteria_weights: [1], alternative_scores: [], best_alternative: '', consistency_ratio: 0, consistent: true };
    }

    const cMatrix = this.buildMatrix(n, comparisons);
    const { weights: cw, cr } = this.ahpEigen(cMatrix, n);
    const consistent = cr < 0.1;
    if (!consistent) warnings.push(`Criteria CR=${cr.toFixed(4)} exceeds 0.1`);

    const m = alternatives.length, scores = new Array(m).fill(0) as number[];
    for (const ac of alt_comparisons) {
      if (ac.criterion_idx < 0 || ac.criterion_idx >= n) { warnings.push(`Invalid criterion index: ${ac.criterion_idx}`); continue; }
      const { weights: aw, cr: acr } = this.ahpEigen(this.buildMatrix(m, ac.comparisons), m);
      if (acr >= 0.1) warnings.push(`Alt CR=${acr.toFixed(4)} for "${criteria[ac.criterion_idx]}"`);
      for (let j = 0; j < m; j++) scores[j] += cw[ac.criterion_idx] * aw[j];
    }

    const altScores = alternatives.map((name, i) => ({ name, score: R6(scores[i]) }));
    const bi = scores.indexOf(Math.max(...scores));
    return { criteria_weights: cw.map(R6), alternative_scores: altScores, best_alternative: alternatives[bi] ?? '', consistency_ratio: R6(cr), consistent };
  }

  private buildMatrix(n: number, comps: Array<{ i: number; j: number; value: number }>): number[][] {
    const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(1) as number[]);
    for (const { i, j, value } of comps) {
      if (i >= 0 && i < n && j >= 0 && j < n && value > 0) { m[i][j] = value; m[j][i] = 1 / value; }
    }
    return m;
  }

  /** Geometric mean eigenvector + consistency ratio */
  private ahpEigen(matrix: number[][], n: number): { weights: number[]; cr: number } {
    const gm: number[] = [];
    for (let i = 0; i < n; i++) {
      let p = 1; for (let j = 0; j < n; j++) p *= matrix[i][j];
      gm.push(Math.pow(p, 1 / n));
    }
    const s = gm.reduce((a, b) => a + b, 0) || 1;
    const w = gm.map(g => g / s);
    let lm = 0;
    for (let i = 0; i < n; i++) {
      let rs = 0; for (let j = 0; j < n; j++) rs += matrix[i][j] * w[j];
      lm += w[i] > 0 ? rs / w[i] : 0;
    }
    lm /= n;
    const ci = n > 1 ? (lm - n) / (n - 1) : 0;
    const ri = RI[n] ?? 1.49;
    return { weights: w, cr: Math.max(0, ri > 0 ? ci / ri : 0) };
  }
}

export const fuzzyNeuralHybridEngine = new FuzzyNeuralHybridEngine();
