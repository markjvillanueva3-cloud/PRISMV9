/**
 * Algorithm Engine — Unified typed algorithm management
 *
 * Wraps ALGORITHM_REGISTRY (50 Algorithm<I,O> implementations) into a
 * production engine with dispatch by ID, metadata queries, domain filtering,
 * and batch execution. Complements AlgorithmGatewayEngine (legacy 10 inline)
 * and AlgorithmRegistry (monolith JS scan-based catalog).
 *
 * Actions:
 * - algorithm_calculate: Run a typed algorithm by ID
 * - algorithm_validate: Validate input without running
 * - algorithm_list: List all 50 algorithms with metadata
 * - algorithm_info: Get metadata for a specific algorithm
 * - algorithm_batch: Run multiple algorithms in sequence
 * - algorithm_benchmark: Time a single algorithm execution
 *
 * L1-P2-MS1: Algorithm Engine & Wiring
 */

import {
  ALGORITHM_REGISTRY,
  createAlgorithm,
  listAlgorithms,
  type AlgorithmId,
} from "../algorithms/index.js";

import type { AlgorithmMeta, ValidationResult } from "../algorithms/types.js";

// ── Types ───────────────────────────────────────────────────────────

export interface AlgorithmCalculateInput {
  algorithm_id: string;
  params: Record<string, any>;
}

export interface AlgorithmCalculateResult {
  algorithm_id: string;
  algorithm_name: string;
  result: any;
  warnings: string[];
  execution_time_ms: number;
}

export interface AlgorithmValidateResult {
  algorithm_id: string;
  validation: ValidationResult;
}

export interface AlgorithmListResult {
  algorithms: AlgorithmMeta[];
  total: number;
  domains: string[];
  safety_summary: { critical: number; standard: number; informational: number };
}

export interface AlgorithmBatchInput {
  calculations: AlgorithmCalculateInput[];
  stop_on_error?: boolean;
}

export interface AlgorithmBatchResult {
  results: Array<AlgorithmCalculateResult | { algorithm_id: string; error: string }>;
  total: number;
  succeeded: number;
  failed: number;
  total_time_ms: number;
}

export interface AlgorithmBenchmarkResult {
  algorithm_id: string;
  algorithm_name: string;
  execution_time_ms: number;
  validation_time_ms: number;
  total_time_ms: number;
}

// ── Engine ──────────────────────────────────────────────────────────

export class AlgorithmEngine {

  /**
   * Execute a typed algorithm by ID with full validation.
   */
  calculate(input: AlgorithmCalculateInput): AlgorithmCalculateResult {
    const algo = createAlgorithm(input.algorithm_id);
    if (!algo) {
      throw new Error(`Unknown algorithm: "${input.algorithm_id}". Use algorithm_list to see available IDs.`);
    }

    const meta = algo.getMetadata();

    // Validate first
    const validation = algo.validate(input.params as any);
    if (!validation.valid) {
      const errors = validation.issues
        .filter(i => i.severity === "error")
        .map(i => `${i.field}: ${i.message}`);
      throw new Error(`Validation failed for ${meta.name}: ${errors.join("; ")}`);
    }

    // Execute with timing
    const t0 = performance.now();
    const result = algo.calculate(input.params as any);
    const elapsed = performance.now() - t0;

    return {
      algorithm_id: input.algorithm_id,
      algorithm_name: meta.name,
      result,
      warnings: [
        ...validation.issues.filter(i => i.severity === "warning").map(i => `${i.field}: ${i.message}`),
        ...((result as any)?.warnings ?? []),
      ],
      execution_time_ms: Math.round(elapsed * 100) / 100,
    };
  }

  /**
   * Validate algorithm input without executing.
   */
  validate(input: AlgorithmCalculateInput): AlgorithmValidateResult {
    const algo = createAlgorithm(input.algorithm_id);
    if (!algo) {
      return {
        algorithm_id: input.algorithm_id,
        validation: {
          valid: false,
          issues: [{ field: "algorithm_id", message: `Unknown algorithm: "${input.algorithm_id}"`, severity: "error" }],
        },
      };
    }
    return {
      algorithm_id: input.algorithm_id,
      validation: algo.validate(input.params as any),
    };
  }

  /**
   * List all available algorithms with optional domain/safety filtering.
   */
  list(options?: { domain?: string; safety_class?: string }): AlgorithmListResult {
    const ids = listAlgorithms();
    let metas: AlgorithmMeta[] = [];

    for (const id of ids) {
      const algo = createAlgorithm(id);
      if (!algo) continue;
      metas.push(algo.getMetadata());
    }

    // Filter by domain
    if (options?.domain) {
      metas = metas.filter(m => m.domain === options.domain);
    }
    // Filter by safety class
    if (options?.safety_class) {
      metas = metas.filter(m => m.safety_class === options.safety_class);
    }

    // Collect unique domains
    const domains = [...new Set(metas.map(m => m.domain))].sort();

    // Safety summary
    const safety = { critical: 0, standard: 0, informational: 0 };
    for (const m of metas) {
      if (m.safety_class === "critical") safety.critical++;
      else if (m.safety_class === "standard") safety.standard++;
      else safety.informational++;
    }

    return { algorithms: metas, total: metas.length, domains, safety_summary: safety };
  }

  /**
   * Get metadata for a single algorithm.
   */
  info(algorithmId: string): AlgorithmMeta | null {
    const algo = createAlgorithm(algorithmId);
    if (!algo) return null;
    return algo.getMetadata();
  }

  /**
   * Execute multiple algorithms in sequence.
   */
  batch(input: AlgorithmBatchInput): AlgorithmBatchResult {
    const results: Array<AlgorithmCalculateResult | { algorithm_id: string; error: string }> = [];
    let succeeded = 0;
    let failed = 0;
    const t0 = performance.now();

    for (const calc of input.calculations) {
      try {
        const result = this.calculate(calc);
        results.push(result);
        succeeded++;
      } catch (err: any) {
        results.push({ algorithm_id: calc.algorithm_id, error: err.message });
        failed++;
        if (input.stop_on_error) break;
      }
    }

    return {
      results,
      total: input.calculations.length,
      succeeded,
      failed,
      total_time_ms: Math.round((performance.now() - t0) * 100) / 100,
    };
  }

  /**
   * Benchmark a single algorithm execution.
   */
  benchmark(input: AlgorithmCalculateInput): AlgorithmBenchmarkResult {
    const algo = createAlgorithm(input.algorithm_id);
    if (!algo) {
      throw new Error(`Unknown algorithm: "${input.algorithm_id}"`);
    }

    const meta = algo.getMetadata();

    const tv0 = performance.now();
    algo.validate(input.params as any);
    const validationTime = performance.now() - tv0;

    const tc0 = performance.now();
    algo.calculate(input.params as any);
    const executionTime = performance.now() - tc0;

    return {
      algorithm_id: input.algorithm_id,
      algorithm_name: meta.name,
      validation_time_ms: Math.round(validationTime * 100) / 100,
      execution_time_ms: Math.round(executionTime * 100) / 100,
      total_time_ms: Math.round((validationTime + executionTime) * 100) / 100,
    };
  }

  /**
   * Get count of registered algorithms.
   */
  get count(): number {
    return listAlgorithms().length;
  }

  /**
   * Get all algorithm IDs.
   */
  get algorithmIds(): string[] {
    return listAlgorithms();
  }
}

// Singleton
export const algorithmEngine = new AlgorithmEngine();
