/**
 * PPAGIBenchmarkEngine — PP-AGI quality benchmarks
 *
 * Runs deterministic benchmark tests against known-correct outcomes to
 * measure PP-AGI prediction quality. Provides objective metrics for
 * regression detection and quality assurance.
 *
 * Benchmark categories:
 *   - Controller dialect inference accuracy
 *   - Material similarity consistency
 *   - Scenario recommendation quality
 *   - Toolpath classification correctness
 *   - Cross-domain fusion stability
 *
 * Each benchmark has: inputs, expected outcome, tolerance, pass/fail.
 * Results feed into overall quality score + regression alerts.
 *
 * @module PPAGIBenchmarkEngine
 */

import { ppDialectTransferEngine } from "./PPDialectTransferEngine.js";
import { ppControllerEmbeddingEngine } from "./PPControllerEmbeddingEngine.js";
import { ppMaterialPropertyVectorEngine } from "./PPMaterialPropertyVectorEngine.js";
import { ppToolpathStrategyEncoderEngine } from "./PPToolpathStrategyEncoderEngine.js";
import { ppMultiModalFusionEngine } from "./PPMultiModalFusionEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type BenchmarkCategory =
  | "controller_inference"
  | "material_similarity"
  | "toolpath_classification"
  | "fusion_stability"
  | "embedding_consistency";

export interface BenchmarkCase {
  id: string;
  category: BenchmarkCategory;
  description: string;
  expected: unknown;
  actual?: unknown;
  passed?: boolean;
  error?: string;
  latency_ms?: number;
}

export interface BenchmarkResult {
  timestamp: number;
  total_cases: number;
  passed: number;
  failed: number;
  by_category: Record<string, { passed: number; failed: number }>;
  overall_score: number;         // 0-1
  cases: BenchmarkCase[];
  regressions: string[];
  avg_latency_ms: number;
}

// ── Benchmark definitions ─────────────────────────────────────────────

interface InternalCase {
  case: BenchmarkCase;
  run: () => { actual: unknown; passed: boolean; error?: string };
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPAGIBenchmarkEngine {
  /**
   * Run all benchmarks and return results.
   */
  runAll(): BenchmarkResult {
    const cases = this.buildAllCases();
    return this.executeCases(cases);
  }

  /**
   * Run benchmarks for a specific category.
   */
  runCategory(category: BenchmarkCategory): BenchmarkResult {
    const cases = this.buildAllCases().filter(c => c.case.category === category);
    return this.executeCases(cases);
  }

  /**
   * Quick smoke test (subset of cases, for CI).
   */
  quickCheck(): BenchmarkResult {
    // Take one case per category
    const all = this.buildAllCases();
    const byCategory = new Map<BenchmarkCategory, InternalCase>();
    for (const c of all) {
      if (!byCategory.has(c.case.category)) byCategory.set(c.case.category, c);
    }
    return this.executeCases([...byCategory.values()]);
  }

  // ── Private ──────────────────────────────────────────────────────────

  private buildAllCases(): InternalCase[] {
    const cases: InternalCase[] = [];

    // ─── Controller inference benchmarks ─────────────────
    cases.push({
      case: {
        id: "ctrl_infer_fanuc_m98",
        category: "controller_inference",
        description: "Detect Fanuc from M98 subprogram call",
        expected: "fanuc",
      },
      run: () => {
        const result = ppDialectTransferEngine.inferFamily([
          "%", "O0001", "G90 G21", "M98 P1000", "M30", "%"
        ]);
        return {
          actual: result.family,
          passed: result.family === "fanuc",
        };
      },
    });

    cases.push({
      case: {
        id: "ctrl_infer_siemens_cycle",
        category: "controller_inference",
        description: "Detect Siemens from CYCLE81",
        expected: "siemens",
      },
      run: () => {
        const result = ppDialectTransferEngine.inferFamily([
          "DEF REAL _X", "CYCLE81(100,0,1,-25)", "M30"
        ]);
        return {
          actual: result.family,
          passed: result.family === "siemens",
        };
      },
    });

    cases.push({
      case: {
        id: "ctrl_infer_heidenhain_tool_call",
        category: "controller_inference",
        description: "Detect Heidenhain from TOOL CALL + BLK FORM",
        expected: "heidenhain",
      },
      run: () => {
        const result = ppDialectTransferEngine.inferFamily([
          "BLK FORM 0.1 Z X-50 Y-50 Z-30",
          "TOOL CALL 5 Z S5000",
        ]);
        return {
          actual: result.family,
          passed: result.family === "heidenhain",
        };
      },
    });

    // ─── Material similarity benchmarks ─────────────────
    cases.push({
      case: {
        id: "mat_sim_identity",
        category: "material_similarity",
        description: "Material is most similar to itself (sim=1.0)",
        expected: 1.0,
      },
      run: () => {
        const all = ppMaterialPropertyVectorEngine.embedAll();
        if (all.length === 0) return { actual: null, passed: true };
        const sim = ppMaterialPropertyVectorEngine.cosineSimilarity(
          all[0].vector, all[0].vector
        );
        return { actual: sim, passed: Math.abs(sim - 1) < 0.001 };
      },
    });

    cases.push({
      case: {
        id: "mat_sim_symmetry",
        category: "material_similarity",
        description: "Similarity is symmetric: sim(A,B) = sim(B,A)",
        expected: true,
      },
      run: () => {
        const all = ppMaterialPropertyVectorEngine.embedAll();
        if (all.length < 2) return { actual: true, passed: true };
        const ab = ppMaterialPropertyVectorEngine.cosineSimilarity(all[0].vector, all[1].vector);
        const ba = ppMaterialPropertyVectorEngine.cosineSimilarity(all[1].vector, all[0].vector);
        return { actual: { ab, ba }, passed: Math.abs(ab - ba) < 1e-9 };
      },
    });

    // ─── Toolpath classification benchmarks ─────────────────
    cases.push({
      case: {
        id: "toolpath_adaptive_matches_roughing",
        category: "toolpath_classification",
        description: "Adaptive 3D pocket matches a roughing strategy",
        expected: "roughing",
      },
      run: () => {
        const rec = ppToolpathStrategyEncoderEngine.recommend({
          operation_type: "pocket", dimension: "3d", phase: "roughing",
          stepover_ratio: 0.1, adaptive: true, hsm: true,
        }, 1);
        const top = rec.recommendations[0];
        return {
          actual: top?.strategy.phase,
          passed: top?.strategy.phase === "roughing",
        };
      },
    });

    cases.push({
      case: {
        id: "toolpath_contour_matches_finishing",
        category: "toolpath_classification",
        description: "3D contour finish matches finishing strategy",
        expected: "finishing",
      },
      run: () => {
        const rec = ppToolpathStrategyEncoderEngine.recommend({
          operation_type: "contour", dimension: "3d", phase: "finishing",
          surface_priority: 0.9, stepover_ratio: 0.05,
        }, 1);
        const top = rec.recommendations[0];
        return {
          actual: top?.strategy.phase,
          passed: top?.strategy.phase === "finishing",
        };
      },
    });

    // ─── Fusion stability benchmarks ─────────────────
    cases.push({
      case: {
        id: "fusion_dim_120",
        category: "fusion_stability",
        description: "Fused vector is exactly 120-dimensional",
        expected: 120,
      },
      run: () => {
        const ctrls = ppControllerEmbeddingEngine.embedAll();
        if (ctrls.length === 0) return { actual: 0, passed: false };
        const fused = ppMultiModalFusionEngine.fuse({
          controller_id: ctrls[0].controller_id,
          machine_id: "haas-vf2",
          material_id: "1018",
        });
        return {
          actual: fused?.dimension ?? 0,
          passed: fused?.dimension === 120,
        };
      },
    });

    cases.push({
      case: {
        id: "fusion_self_similarity",
        category: "fusion_stability",
        description: "Identical scenarios have fusion similarity 1",
        expected: 1.0,
      },
      run: () => {
        const ctrls = ppControllerEmbeddingEngine.embedAll();
        if (ctrls.length === 0) return { actual: null, passed: true };
        const scenario = {
          controller_id: ctrls[0].controller_id,
          machine_id: "haas-vf2",
          material_id: "1018",
        };
        const a = ppMultiModalFusionEngine.fuse(scenario);
        const b = ppMultiModalFusionEngine.fuse(scenario);
        if (!a || !b) return { actual: null, passed: false };
        const sim = ppMultiModalFusionEngine.cosineSimilarity(a.fused_vector, b.fused_vector);
        return { actual: sim, passed: Math.abs(sim - 1) < 0.001 };
      },
    });

    // ─── Embedding consistency benchmarks ─────────────────
    cases.push({
      case: {
        id: "embed_consistency_controller",
        category: "embedding_consistency",
        description: "Same controller always produces same embedding",
        expected: true,
      },
      run: () => {
        const ctrls = ppControllerEmbeddingEngine.embedAll();
        if (ctrls.length === 0) return { actual: true, passed: true };
        const a = ppControllerEmbeddingEngine.embed(ctrls[0].controller_id);
        const b = ppControllerEmbeddingEngine.embed(ctrls[0].controller_id);
        const allEqual = a.vector.every((v, i) => v === b.vector[i]);
        return { actual: allEqual, passed: allEqual };
      },
    });

    cases.push({
      case: {
        id: "embed_one_hot_family_valid",
        category: "embedding_consistency",
        description: "Controller family one-hot sums to 1 for all controllers",
        expected: true,
      },
      run: () => {
        const all = ppControllerEmbeddingEngine.embedAll();
        for (const c of all) {
          const sum = c.vector.slice(0, 6).reduce((s, v) => s + v, 0);
          if (Math.abs(sum - 1) > 0.01) {
            return { actual: { controller: c.controller_id, sum }, passed: false };
          }
        }
        return { actual: true, passed: true };
      },
    });

    cases.push({
      case: {
        id: "embed_fanuc_nearest_is_fanuc",
        category: "embedding_consistency",
        description: "Fanuc 31i nearest neighbor is another Fanuc",
        expected: "fanuc",
      },
      run: () => {
        const nearest = ppControllerEmbeddingEngine.findNearest("fanuc_31i", 1);
        const top = nearest.neighbors[0];
        return {
          actual: top?.controller_id,
          passed: top?.controller_id?.startsWith("fanuc") ?? false,
        };
      },
    });

    return cases;
  }

  private executeCases(cases: InternalCase[]): BenchmarkResult {
    const byCategory: Record<string, { passed: number; failed: number }> = {};
    let totalLatency = 0;
    const regressions: string[] = [];

    for (const c of cases) {
      const start = Date.now();
      try {
        const { actual, passed, error } = c.run();
        c.case.actual = actual;
        c.case.passed = passed;
        c.case.error = error;
      } catch (e: any) {
        c.case.passed = false;
        c.case.error = e?.message ?? String(e);
      }
      c.case.latency_ms = Date.now() - start;
      totalLatency += c.case.latency_ms;

      const cat = c.case.category;
      if (!byCategory[cat]) byCategory[cat] = { passed: 0, failed: 0 };
      if (c.case.passed) byCategory[cat].passed++;
      else {
        byCategory[cat].failed++;
        regressions.push(`${c.case.id}: ${c.case.description}`);
      }
    }

    const passed = cases.filter(c => c.case.passed).length;
    const failed = cases.length - passed;
    const score = cases.length > 0 ? passed / cases.length : 0;
    const avgLatency = cases.length > 0 ? totalLatency / cases.length : 0;

    return {
      timestamp: Date.now(),
      total_cases: cases.length,
      passed,
      failed,
      by_category: byCategory,
      overall_score: round4(score),
      cases: cases.map(c => c.case),
      regressions,
      avg_latency_ms: round2(avgLatency),
    };
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppAGIBenchmarkEngine = new PPAGIBenchmarkEngine();
