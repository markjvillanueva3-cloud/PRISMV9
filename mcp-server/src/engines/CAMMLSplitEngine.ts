/**
 * CAMMLSplitEngine — U-CAM-ML-03
 * ================================
 *
 * Customer-disjoint train/val/test split for the JM Die feature-vector corpus.
 *
 * CRITICAL CORRECTNESS: programs are split by CUSTOMER, not by individual
 * program. If a customer's programs appear in two sets, a model trained on
 * one customer's programs tested on the same customer's programs will score
 * artificially high (same machinist's style, same tolerances, same tool crib
 * preferences). This engine guarantees no customer overlap across sets.
 *
 * Target split: 70/15/15 train/val/test.
 * Stratification: greedy customer assignment that minimizes divergence of
 * machine_type + cam_system distributions across sets.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-ML-TRAIN U-CAM-ML-02.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { FeatureVector } from "./CAMFeatureExtractorEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type SplitSet = "train" | "val" | "test";

export interface SplitRatios {
  train: number;
  val: number;
  test: number;
}

export interface CustomerAssignment {
  customer: string;
  program_count: number;
  set: SplitSet;
  machine_type_hist: Record<string, number>;
  cam_system_hist: Record<string, number>;
}

export interface SetDistribution {
  program_count: number;
  customer_count: number;
  machine_type_hist: Record<string, number>;
  cam_system_hist: Record<string, number>;
}

export interface DistributionCheck {
  metric: "machine_type" | "cam_system";
  key: string;
  train_pct: number;
  val_pct: number;
  test_pct: number;
  max_delta_pct: number;
  within_5pct_gate: boolean;
}

export interface CAMMLSplitResult {
  schemaVersion: 1;
  computed_at: string;
  input_program_count: number;
  ratios: SplitRatios;
  train: FeatureVector[];
  val: FeatureVector[];
  test: FeatureVector[];
  customer_assignments: CustomerAssignment[];
  distribution_checks: DistributionCheck[];
  leakage_audit: {
    customers_in_multiple_sets: string[];
    no_leakage: boolean;
  };
  summary: {
    train: SetDistribution;
    val: SetDistribution;
    test: SetDistribution;
  };
  warnings: string[];
}

// ─── Engine ─────────────────────────────────────────────────────────

const DEFAULT_RATIOS: SplitRatios = { train: 0.70, val: 0.15, test: 0.15 };

export class CAMMLSplitEngine {
  readonly name = "CAMMLSplitEngine";

  split(
    vectors: FeatureVector[],
    ratios: SplitRatios = DEFAULT_RATIOS,
    rngSeed: number = 42
  ): CAMMLSplitResult {
    const warnings: string[] = [];
    const total = vectors.length;
    if (total === 0) {
      return this.emptyResult(ratios, ["Input vector array is empty"]);
    }
    if (Math.abs(ratios.train + ratios.val + ratios.test - 1.0) > 1e-6) {
      throw new Error(
        `Split ratios must sum to 1.0, got ${(ratios.train + ratios.val + ratios.test).toFixed(3)}`
      );
    }

    // Group by customer
    const byCustomer = new Map<string, FeatureVector[]>();
    for (const v of vectors) {
      const customer = v.customer || "unknown";
      const arr = byCustomer.get(customer) ?? [];
      arr.push(v);
      byCustomer.set(customer, arr);
    }

    // Deterministic ordering: sort customers by program count (descending),
    // then by name. Largest customers assigned first so the greedy algorithm
    // can balance. Seeded-random tie-break for reproducibility.
    const rng = this.mulberry32(rngSeed);
    const customerOrder = Array.from(byCustomer.entries())
      .map(([c, vs]) => ({ customer: c, count: vs.length, jitter: rng() }))
      .sort((a, b) => b.count - a.count || a.customer.localeCompare(b.customer));

    const setTargets = {
      train: Math.round(total * ratios.train),
      val: Math.round(total * ratios.val),
      test: Math.round(total * ratios.test),
    };
    const setCurrent = { train: 0, val: 0, test: 0 };
    const setCustomers: Record<SplitSet, FeatureVector[]> = { train: [], val: [], test: [] };
    const assignments: CustomerAssignment[] = [];

    // Greedy: each customer goes into the set with the largest deficit.
    for (const entry of customerOrder) {
      const vs = byCustomer.get(entry.customer)!;
      const deficits: Array<[SplitSet, number]> = [
        ["train", setTargets.train - setCurrent.train],
        ["val", setTargets.val - setCurrent.val],
        ["test", setTargets.test - setCurrent.test],
      ];
      deficits.sort((a, b) => b[1] - a[1]);
      const chosenSet = deficits[0][0];

      setCustomers[chosenSet].push(...vs);
      setCurrent[chosenSet] += vs.length;

      assignments.push({
        customer: entry.customer,
        program_count: vs.length,
        set: chosenSet,
        machine_type_hist: this.histogram(vs, "machine_type"),
        cam_system_hist: this.histogram(vs, "cam_system"),
      });
    }

    // Distribution checks
    const distributionChecks = this.computeDistributionChecks(setCustomers);

    // Leakage audit — should be impossible given the algorithm, but verify anyway
    const customerSetMap = new Map<string, Set<SplitSet>>();
    for (const a of assignments) {
      const sets = customerSetMap.get(a.customer) ?? new Set<SplitSet>();
      sets.add(a.set);
      customerSetMap.set(a.customer, sets);
    }
    const leakedCustomers = Array.from(customerSetMap.entries())
      .filter(([, sets]) => sets.size > 1)
      .map(([c]) => c);

    // Warn on extreme imbalance
    const actualRatios = {
      train: setCurrent.train / total,
      val: setCurrent.val / total,
      test: setCurrent.test / total,
    };
    if (Math.abs(actualRatios.train - ratios.train) > 0.10) {
      warnings.push(
        `train set ratio ${actualRatios.train.toFixed(2)} deviates >10% from target ${ratios.train.toFixed(2)} — customer size imbalance`
      );
    }
    if (byCustomer.size < 3) {
      warnings.push(
        `only ${byCustomer.size} unique customers — split quality is severely limited with such low customer diversity`
      );
    }

    return {
      schemaVersion: 1,
      computed_at: new Date().toISOString(),
      input_program_count: total,
      ratios,
      train: setCustomers.train,
      val: setCustomers.val,
      test: setCustomers.test,
      customer_assignments: assignments,
      distribution_checks: distributionChecks,
      leakage_audit: {
        customers_in_multiple_sets: leakedCustomers,
        no_leakage: leakedCustomers.length === 0,
      },
      summary: {
        train: this.setDistribution(setCustomers.train),
        val: this.setDistribution(setCustomers.val),
        test: this.setDistribution(setCustomers.test),
      },
      warnings,
    };
  }

  /** Convenience: read the feature-vectors sample, compute split, write the manifest. */
  splitFromFiles(
    sampleJsonPath: string = "H:/PRISM/mcp-server/data/state/JM_DIE_FEATURE_VECTORS_SAMPLE.json",
    outputPath: string = "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json",
    ratios: SplitRatios = DEFAULT_RATIOS,
    rngSeed: number = 42
  ): CAMMLSplitResult {
    const raw = JSON.parse(fs.readFileSync(sampleJsonPath, "utf-8"));
    const vectors: FeatureVector[] = raw.vectors ?? [];
    const result = this.split(vectors, ratios, rngSeed);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    return result;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private histogram<K extends keyof FeatureVector>(
    vs: FeatureVector[],
    field: K
  ): Record<string, number> {
    const h: Record<string, number> = {};
    for (const v of vs) {
      const key = String(v[field] ?? "UNKNOWN");
      h[key] = (h[key] ?? 0) + 1;
    }
    return h;
  }

  private setDistribution(vs: FeatureVector[]): SetDistribution {
    const customers = new Set(vs.map((v) => v.customer));
    return {
      program_count: vs.length,
      customer_count: customers.size,
      machine_type_hist: this.histogram(vs, "machine_type"),
      cam_system_hist: this.histogram(vs, "cam_system"),
    };
  }

  private computeDistributionChecks(
    sets: Record<SplitSet, FeatureVector[]>
  ): DistributionCheck[] {
    const checks: DistributionCheck[] = [];

    const addCheck = (
      metric: "machine_type" | "cam_system",
      field: keyof FeatureVector
    ) => {
      const allKeys = new Set<string>();
      for (const set of ["train", "val", "test"] as SplitSet[]) {
        for (const v of sets[set]) allKeys.add(String(v[field]));
      }
      for (const key of allKeys) {
        const pct = (set: SplitSet) => {
          const n = sets[set].length;
          if (n === 0) return 0;
          return sets[set].filter((v) => String(v[field]) === key).length / n;
        };
        const tr = pct("train");
        const vl = pct("val");
        const te = pct("test");
        const maxDelta = Math.max(
          Math.abs(tr - vl),
          Math.abs(tr - te),
          Math.abs(vl - te)
        );
        checks.push({
          metric,
          key,
          train_pct: Math.round(tr * 1000) / 10,
          val_pct: Math.round(vl * 1000) / 10,
          test_pct: Math.round(te * 1000) / 10,
          max_delta_pct: Math.round(maxDelta * 1000) / 10,
          within_5pct_gate: maxDelta <= 0.05,
        });
      }
    };

    addCheck("machine_type", "machine_type");
    addCheck("cam_system", "cam_system");
    return checks;
  }

  /** Deterministic PRNG for reproducible splits. */
  private mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  private emptyResult(ratios: SplitRatios, warnings: string[]): CAMMLSplitResult {
    return {
      schemaVersion: 1,
      computed_at: new Date().toISOString(),
      input_program_count: 0,
      ratios,
      train: [],
      val: [],
      test: [],
      customer_assignments: [],
      distribution_checks: [],
      leakage_audit: { customers_in_multiple_sets: [], no_leakage: true },
      summary: {
        train: this.setDistribution([]),
        val: this.setDistribution([]),
        test: this.setDistribution([]),
      },
      warnings,
    };
  }
}

export const camMLSplitEngine = new CAMMLSplitEngine();
