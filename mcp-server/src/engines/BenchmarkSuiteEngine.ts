/**
 * PRISM MCP Server — Benchmark Suite Engine
 *
 * Curated benchmark machining scenarios with known-good results for
 * algorithm validation. 18 scenarios covering 5 materials × 3+ tool types,
 * with ISO/textbook-sourced reference ranges for force, temperature, Ra,
 * deflection, cycle time, and tool life.
 *
 * @module BenchmarkSuiteEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BenchmarkScenario {
  id: string;
  name: string;
  category: "tool_life" | "surface_finish" | "force" | "thermal" | "deflection" | "cycle_time";
  material: string;
  tool: { type: string; diameter_mm: number; flute_count: number };
  conditions: { vc_m_min: number; fz_mm: number; ap_mm: number; ae_mm: number; rpm: number; feed_mmmin: number };
  expected: {
    force_N?: { min: number; max: number };
    temperature_C?: { min: number; max: number };
    ra_um?: { min: number; max: number };
    deflection_um?: { min: number; max: number };
    cycle_time_sec?: { min: number; max: number };
    tool_life_min?: { min: number; max: number };
  };
  source: string;
  algorithm?: string;
}

export interface BenchmarkInput {
  predictor: (scenario: BenchmarkScenario) => Record<string, number>;
  scenarios?: string[];
  baseline?: Record<string, Record<string, number>>;
}

export interface BenchmarkDeviation {
  value: number;
  within_range: boolean;
  pct_error?: number;
}

export interface BenchmarkScenarioResult {
  scenario_id: string;
  scenario_name: string;
  passed: boolean;
  predictions: Record<string, number>;
  expected_ranges: Record<string, { min: number; max: number }>;
  deviations: Record<string, BenchmarkDeviation>;
}

export interface BenchmarkRegression {
  scenario_id: string;
  metric: string;
  old_value: number;
  new_value: number;
  degradation_pct: number;
}

export interface BenchmarkResult {
  total: number;
  passed: number;
  failed: number;
  results: BenchmarkScenarioResult[];
  pass_rate_pct: number;
  regressions: BenchmarkRegression[];
  grade: "A" | "B" | "C" | "D" | "F";
  warnings: string[];
  formula: string;
}

// ============================================================================
// BUILT-IN SCENARIOS (18)
// ============================================================================

const SCENARIOS: BenchmarkScenario[] = [
  // --- ISO 8688 Tool Life (5 materials) ---
  {
    id: "TL-AL6061", name: "ISO 8688 Tool Life — Al 6061-T6", category: "tool_life",
    material: "Al6061-T6", tool: { type: "endmill", diameter_mm: 12, flute_count: 3 },
    conditions: { vc_m_min: 300, fz_mm: 0.08, ap_mm: 3, ae_mm: 6, rpm: 7958, feed_mmmin: 1910 },
    expected: { force_N: { min: 80, max: 180 }, temperature_C: { min: 80, max: 160 }, tool_life_min: { min: 90, max: 240 } },
    source: "ISO 8688-1:1989, Machining Data Handbook (Metcut)"
  },
  {
    id: "TL-1045", name: "ISO 8688 Tool Life — AISI 1045", category: "tool_life",
    material: "AISI1045", tool: { type: "endmill", diameter_mm: 12, flute_count: 4 },
    conditions: { vc_m_min: 180, fz_mm: 0.10, ap_mm: 3, ae_mm: 6, rpm: 4775, feed_mmmin: 1910 },
    expected: { force_N: { min: 350, max: 700 }, temperature_C: { min: 300, max: 550 }, tool_life_min: { min: 30, max: 90 } },
    source: "ISO 8688-1:1989, Sandvik Coromant Technical Guide"
  },
  {
    id: "TL-SS316L", name: "ISO 8688 Tool Life — SS 316L", category: "tool_life",
    material: "SS316L", tool: { type: "endmill", diameter_mm: 10, flute_count: 4 },
    conditions: { vc_m_min: 100, fz_mm: 0.06, ap_mm: 2, ae_mm: 5, rpm: 3183, feed_mmmin: 764 },
    expected: { force_N: { min: 280, max: 600 }, temperature_C: { min: 400, max: 700 }, tool_life_min: { min: 15, max: 50 } },
    source: "ISO 8688-1:1989, ISCAR Machining Guide"
  },
  {
    id: "TL-TI64", name: "ISO 8688 Tool Life — Ti-6Al-4V", category: "tool_life",
    material: "Ti6Al4V", tool: { type: "endmill", diameter_mm: 10, flute_count: 5 },
    conditions: { vc_m_min: 60, fz_mm: 0.05, ap_mm: 2, ae_mm: 3, rpm: 1910, feed_mmmin: 477 },
    expected: { force_N: { min: 300, max: 650 }, temperature_C: { min: 500, max: 800 }, tool_life_min: { min: 10, max: 40 } },
    source: "ISO 8688-1:1989, Boyer et al. Ti-6Al-4V Machining Handbook"
  },
  {
    id: "TL-IN718", name: "ISO 8688 Tool Life — Inconel 718", category: "tool_life",
    material: "Inconel718", tool: { type: "endmill", diameter_mm: 10, flute_count: 6 },
    conditions: { vc_m_min: 30, fz_mm: 0.04, ap_mm: 1.5, ae_mm: 2, rpm: 955, feed_mmmin: 229 },
    expected: { force_N: { min: 350, max: 800 }, temperature_C: { min: 600, max: 950 }, tool_life_min: { min: 5, max: 25 } },
    source: "ISO 8688-1:1989, Choudhury & El-Baradie Ni-alloy review"
  },
  // --- Pocket Milling ---
  {
    id: "PKT-AL50", name: "Standard Pocket 50×50×20 — Al 6061", category: "cycle_time",
    material: "Al6061-T6", tool: { type: "endmill", diameter_mm: 16, flute_count: 3 },
    conditions: { vc_m_min: 350, fz_mm: 0.10, ap_mm: 5, ae_mm: 10, rpm: 6963, feed_mmmin: 2089 },
    expected: { cycle_time_sec: { min: 25, max: 55 }, force_N: { min: 120, max: 280 } },
    source: "Sandvik Coromant Application Guide — Pocket Milling"
  },
  {
    id: "PKT-ST30", name: "Standard Pocket 30×30×15 — AISI 1045", category: "cycle_time",
    material: "AISI1045", tool: { type: "endmill", diameter_mm: 10, flute_count: 4 },
    conditions: { vc_m_min: 160, fz_mm: 0.08, ap_mm: 3, ae_mm: 6, rpm: 5093, feed_mmmin: 1630 },
    expected: { cycle_time_sec: { min: 18, max: 45 }, force_N: { min: 250, max: 550 } },
    source: "Sandvik Coromant Application Guide — Pocket Milling"
  },
  // --- Thin Wall (PTDC validation) ---
  {
    id: "TW-AL2MM", name: "Thin Wall 2mm × 50mm height — Al 6061", category: "deflection",
    material: "Al6061-T6", tool: { type: "endmill", diameter_mm: 8, flute_count: 2 },
    conditions: { vc_m_min: 250, fz_mm: 0.04, ap_mm: 1, ae_mm: 0.5, rpm: 9947, feed_mmmin: 796 },
    expected: { deflection_um: { min: 5, max: 50 }, force_N: { min: 20, max: 80 }, ra_um: { min: 0.4, max: 1.6 } },
    source: "Budak & Altintas thin-wall deflection model", algorithm: "PTDC"
  },
  // --- High-Speed Aluminium (CFCM validation) ---
  {
    id: "HSM-AL20K", name: "High-Speed Al 20000 RPM — Al 7075", category: "thermal",
    material: "Al7075-T6", tool: { type: "endmill", diameter_mm: 10, flute_count: 3 },
    conditions: { vc_m_min: 628, fz_mm: 0.06, ap_mm: 2, ae_mm: 3, rpm: 20000, feed_mmmin: 3600 },
    expected: { temperature_C: { min: 90, max: 200 }, force_N: { min: 50, max: 150 }, ra_um: { min: 0.2, max: 1.0 } },
    source: "Schulz & Moriwaki HSM review, CIRP Annals", algorithm: "CFCM"
  },
  // --- Deep Pocket 5×D (VCER validation) ---
  {
    id: "DP-5XD", name: "Deep Pocket 5×D — AISI 4140", category: "force",
    material: "AISI4140", tool: { type: "endmill", diameter_mm: 10, flute_count: 4 },
    conditions: { vc_m_min: 120, fz_mm: 0.06, ap_mm: 50, ae_mm: 2, rpm: 3820, feed_mmmin: 917 },
    expected: { force_N: { min: 400, max: 900 }, temperature_C: { min: 350, max: 600 } },
    source: "Tlusty deep-pocket stability guidelines", algorithm: "VCER"
  },
  // --- Full Slotting ---
  {
    id: "SLOT-1045", name: "Full-Width Slotting — AISI 1045", category: "force",
    material: "AISI1045", tool: { type: "endmill", diameter_mm: 12, flute_count: 4 },
    conditions: { vc_m_min: 140, fz_mm: 0.08, ap_mm: 4, ae_mm: 12, rpm: 3714, feed_mmmin: 1189 },
    expected: { force_N: { min: 500, max: 1100 }, temperature_C: { min: 350, max: 600 }, tool_life_min: { min: 15, max: 50 } },
    source: "Altintas Manufacturing Automation Ch.2"
  },
  // --- Ball Endmill Finishing ---
  {
    id: "FIN-BALL", name: "Ball Endmill Finishing — Ti-6Al-4V", category: "surface_finish",
    material: "Ti6Al4V", tool: { type: "ball_endmill", diameter_mm: 8, flute_count: 2 },
    conditions: { vc_m_min: 50, fz_mm: 0.03, ap_mm: 0.3, ae_mm: 0.5, rpm: 1989, feed_mmmin: 119 },
    expected: { ra_um: { min: 0.3, max: 1.2 }, force_N: { min: 15, max: 70 }, temperature_C: { min: 200, max: 450 } },
    source: "Ozturk & Budak ball-end finish model, CIRP 2010"
  },
  // --- Drilling ---
  {
    id: "DRL-AL10", name: "Drilling ∅10 — Al 6061", category: "force",
    material: "Al6061-T6", tool: { type: "drill", diameter_mm: 10, flute_count: 2 },
    conditions: { vc_m_min: 200, fz_mm: 0.15, ap_mm: 30, ae_mm: 10, rpm: 6366, feed_mmmin: 1910 },
    expected: { force_N: { min: 200, max: 500 }, temperature_C: { min: 80, max: 180 } },
    source: "Shaw Metal Cutting Principles, drill thrust model"
  },
  {
    id: "DRL-1045-10", name: "Drilling ∅10 — AISI 1045", category: "force",
    material: "AISI1045", tool: { type: "drill", diameter_mm: 10, flute_count: 2 },
    conditions: { vc_m_min: 80, fz_mm: 0.12, ap_mm: 30, ae_mm: 10, rpm: 2546, feed_mmmin: 611 },
    expected: { force_N: { min: 600, max: 1400 }, temperature_C: { min: 250, max: 450 } },
    source: "Shaw Metal Cutting Principles, drill thrust model"
  },
  {
    id: "DRL-TI10", name: "Drilling ∅10 — Ti-6Al-4V", category: "force",
    material: "Ti6Al4V", tool: { type: "drill", diameter_mm: 10, flute_count: 2 },
    conditions: { vc_m_min: 35, fz_mm: 0.08, ap_mm: 25, ae_mm: 10, rpm: 1114, feed_mmmin: 178 },
    expected: { force_N: { min: 500, max: 1200 }, temperature_C: { min: 400, max: 700 } },
    source: "Sharif & Rahim Ti drilling experiments, J Mfg Proc"
  },
  // --- Thread Milling ---
  {
    id: "THR-M12", name: "Thread Mill M12×1.75 — AISI 1045", category: "force",
    material: "AISI1045", tool: { type: "thread_mill", diameter_mm: 10, flute_count: 3 },
    conditions: { vc_m_min: 80, fz_mm: 0.05, ap_mm: 1.75, ae_mm: 1, rpm: 2546, feed_mmmin: 382 },
    expected: { force_N: { min: 100, max: 350 }, ra_um: { min: 0.8, max: 3.2 } },
    source: "Emuge Thread Milling Technical Guide"
  },
  // --- Finishing Pass (surface finish focus) ---
  {
    id: "FIN-SS316", name: "Finishing Pass — SS 316L", category: "surface_finish",
    material: "SS316L", tool: { type: "endmill", diameter_mm: 8, flute_count: 4 },
    conditions: { vc_m_min: 90, fz_mm: 0.03, ap_mm: 0.5, ae_mm: 4, rpm: 3581, feed_mmmin: 430 },
    expected: { ra_um: { min: 0.4, max: 1.6 }, force_N: { min: 50, max: 180 }, temperature_C: { min: 250, max: 500 } },
    source: "Diniz & Marcondes SS finishing parameters, J Mat Proc Tech"
  },
  // --- Roughing Inconel ---
  {
    id: "RGH-IN718", name: "Roughing — Inconel 718", category: "thermal",
    material: "Inconel718", tool: { type: "endmill", diameter_mm: 12, flute_count: 6 },
    conditions: { vc_m_min: 25, fz_mm: 0.05, ap_mm: 3, ae_mm: 4, rpm: 663, feed_mmmin: 199 },
    expected: { force_N: { min: 600, max: 1400 }, temperature_C: { min: 650, max: 1000 }, tool_life_min: { min: 3, max: 15 } },
    source: "Choudhury & El-Baradie Ni-alloy review, Int J Mach Tools"
  },
];

// ============================================================================
// METRIC KEYS — used for iteration
// ============================================================================

const METRIC_KEYS = ["force_N", "temperature_C", "ra_um", "deflection_um", "cycle_time_sec", "tool_life_min"] as const;
type MetricKey = typeof METRIC_KEYS[number];

// ============================================================================
// ENGINE
// ============================================================================

export class BenchmarkSuiteEngine {
  private readonly scenarios: BenchmarkScenario[] = SCENARIOS;

  /** Return all scenarios, optionally filtered by category. */
  getScenarios(category?: string): BenchmarkScenario[] {
    if (!category) return [...this.scenarios];
    return this.scenarios.filter(s => s.category === category);
  }

  /** Look up a single scenario by ID. */
  getScenario(id: string): BenchmarkScenario | undefined {
    return this.scenarios.find(s => s.id === id);
  }

  /** Run the full benchmark suite against a predictor function. */
  run(input: BenchmarkInput): BenchmarkResult {
    const warnings: string[] = [];

    // Resolve which scenarios to run
    const selected = input.scenarios
      ? this.scenarios.filter(s => input.scenarios!.includes(s.id))
      : this.scenarios;

    if (input.scenarios) {
      const missing = input.scenarios.filter(id => !this.scenarios.find(s => s.id === id));
      if (missing.length > 0) warnings.push(`Unknown scenario IDs skipped: ${missing.join(", ")}`);
    }

    if (selected.length === 0) {
      return {
        total: 0, passed: 0, failed: 0, results: [],
        pass_rate_pct: 0, regressions: [], grade: "F",
        warnings: [...warnings, "No scenarios matched the provided IDs"],
        formula: "grade = F (no scenarios run)"
      };
    }

    const results: BenchmarkScenarioResult[] = [];
    const regressions: BenchmarkRegression[] = [];

    for (const scenario of selected) {
      let predictions: Record<string, number>;
      try {
        predictions = input.predictor(scenario);
      } catch (err) {
        warnings.push(`Predictor threw for ${scenario.id}: ${err instanceof Error ? err.message : String(err)}`);
        results.push({
          scenario_id: scenario.id, scenario_name: scenario.name,
          passed: false, predictions: {}, expected_ranges: this.extractRanges(scenario),
          deviations: {}
        });
        continue;
      }

      const expected_ranges = this.extractRanges(scenario);
      const deviations: Record<string, BenchmarkDeviation> = {};
      let scenarioPassed = true;

      for (const key of METRIC_KEYS) {
        const range = scenario.expected[key];
        if (!range) continue;
        const predicted = predictions[key];
        if (predicted === undefined || predicted === null) {
          deviations[key] = { value: NaN, within_range: false };
          scenarioPassed = false;
          continue;
        }
        const within = predicted >= range.min && predicted <= range.max;
        const midpoint = (range.min + range.max) / 2;
        const pct_error = midpoint !== 0 ? Math.abs(predicted - midpoint) / midpoint * 100 : 0;
        deviations[key] = { value: predicted, within_range: within, pct_error: Math.round(pct_error * 100) / 100 };
        if (!within) scenarioPassed = false;
      }

      results.push({
        scenario_id: scenario.id, scenario_name: scenario.name,
        passed: scenarioPassed, predictions, expected_ranges, deviations
      });

      // Regression check against baseline
      if (input.baseline) {
        const prev = input.baseline[scenario.id];
        if (prev) {
          for (const key of METRIC_KEYS) {
            const range = scenario.expected[key];
            if (!range) continue;
            const oldVal = prev[key];
            const newVal = predictions[key];
            if (oldVal === undefined || newVal === undefined) continue;
            const midpoint = (range.min + range.max) / 2;
            const oldErr = Math.abs(oldVal - midpoint);
            const newErr = Math.abs(newVal - midpoint);
            if (newErr > oldErr && oldErr > 0) {
              const degradation = ((newErr - oldErr) / oldErr) * 100;
              if (degradation > 5) {
                regressions.push({
                  scenario_id: scenario.id, metric: key,
                  old_value: oldVal, new_value: newVal,
                  degradation_pct: Math.round(degradation * 100) / 100
                });
              }
            }
          }
        }
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const pass_rate_pct = results.length > 0 ? Math.round((passed / results.length) * 10000) / 100 : 0;
    const grade = this.computeGrade(pass_rate_pct, regressions.length);

    if (regressions.length > 0) {
      warnings.push(`${regressions.length} regression(s) detected vs. baseline`);
    }

    return {
      total: results.length, passed, failed, results,
      pass_rate_pct, regressions, grade, warnings,
      formula: `grade = ${grade} | pass_rate=${pass_rate_pct}% (${passed}/${results.length}), regressions=${regressions.length} | thresholds: A≥95% B≥80% C≥60% D≥40% F<40%, each regression downgrades by one letter`
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private extractRanges(scenario: BenchmarkScenario): Record<string, { min: number; max: number }> {
    const out: Record<string, { min: number; max: number }> = {};
    for (const key of METRIC_KEYS) {
      const range = scenario.expected[key];
      if (range) out[key] = { min: range.min, max: range.max };
    }
    return out;
  }

  private computeGrade(passRate: number, regressionCount: number): "A" | "B" | "C" | "D" | "F" {
    const grades: Array<"A" | "B" | "C" | "D" | "F"> = ["A", "B", "C", "D", "F"];
    let idx: number;
    if (passRate >= 95) idx = 0;
    else if (passRate >= 80) idx = 1;
    else if (passRate >= 60) idx = 2;
    else if (passRate >= 40) idx = 3;
    else idx = 4;

    // Each regression downgrades by one letter, capped at F
    idx = Math.min(idx + regressionCount, 4);
    return grades[idx];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const benchmarkSuiteEngine = new BenchmarkSuiteEngine();
