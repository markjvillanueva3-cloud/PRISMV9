/**
 * TurningStochasticPlanEngine — LATHE-PRO-MS5 stochastic wrapper.
 *
 * Runs a Monte Carlo simulation over the MS1 (insert life) × MS2
 * (offset compensation) cascade. Perturbs (Vc, f, ap) on every op
 * with independent Gaussian noise on each MC trial, then reports
 * P5/P50/P95 quantiles on Cpk plus medians on edges used and
 * average VB per part.
 *
 * This engine is the SHIPPED source of truth — the turning dispatcher
 * case `turning_stochastic_production_plan` delegates here, and tests
 * call it directly. Do not inline this logic anywhere else.
 */
import {
  turningInsertLifeEngine,
  type OpSpec,
} from "./TurningInsertLifeEngine.js";
import { turningOffsetCompensationEngine } from "./TurningOffsetCompensationEngine.js";

export interface StochasticPlanInput {
  ops: OpSpec[];
  batch_size: number;
  nominal_mm: number;
  tolerance_mm: number;
  n_trials?: number;
  seed?: number;
  sigma_vc_rel?: number;
  sigma_feed_rel?: number;
  sigma_ap_rel?: number;
  reliability_threshold?: number;
  vb_failure_um?: number;
  approach_angle_deg?: number;
  auto_offset_enabled?: boolean;
  probe_interval?: number;
}

export interface StochasticPlanResult {
  trials_attempted: number;
  trials_feasible: number;
  cpk_p05: number;
  cpk_p50: number;
  cpk_p95: number;
  edges_p50: number;
  wears_p50: number;
  /** Raw feasible samples for callers that want custom aggregation. */
  cpks: number[];
  edges: number[];
  wears: number[];
  source: string;
}

class TurningStochasticPlanEngine {
  /** Seeded mulberry32 + Box-Muller normal, exposed for engines that want
   *  the same PRNG (robust optimizer reuses these rules). */
  makeSeededRandom(seed: number): { rand: () => number; normal: () => number } {
    let state = seed;
    const rand = () => {
      let t = (state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const normal = () => {
      const u1 = Math.max(rand(), 1e-10);
      const u2 = rand();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    return { rand, normal };
  }

  /** Canonical empirical quantile with linear clamp. */
  quantile(arr: number[], q: number): number {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(Math.max(Math.floor(q * s.length), 0), s.length - 1)];
  }

  /** Evaluate the MS1+MS2 cascade under a single sampled condition set.
   *  Returns Cpk, edges_needed, and avgVB — or null when infeasible. */
  evaluateCascadeSample(input: {
    ops: OpSpec[];
    batch_size: number;
    nominal_mm: number;
    tolerance_mm: number;
    reliability_threshold: number;
    vb_failure_um: number;
    approach_angle_deg: number;
    auto_offset_enabled: boolean;
    probe_interval: number;
  }): { cpk: number; edges: number; avgVb: number } | null {
    try {
      const sched = turningInsertLifeEngine.insertChangeSchedule({
        ops: input.ops,
        batch_size: input.batch_size,
        reliability_threshold: input.reliability_threshold,
      });
      const wearTraj = turningInsertLifeEngine.wearAccumulation({
        ops: input.ops,
        current_wear_fraction: 0,
        failure_wear_fraction: input.reliability_threshold,
      });
      const avgVb =
        (wearTraj.final_wear / Math.max(sched.parts_per_edge, 1)) *
        input.vb_failure_um;
      const acc = turningOffsetCompensationEngine.predictAccuracy({
        iso_group: input.ops[0].conditions.iso_group,
        nominal_mm: input.nominal_mm,
        tolerance_mm: input.tolerance_mm,
        batch_size: input.batch_size,
        wear_per_part_um: avgVb,
        approach_angle_deg: input.approach_angle_deg,
        auto_offset_enabled: input.auto_offset_enabled,
        probe_interval: input.probe_interval,
      });
      const cpk = acc.cpk_compensated ?? acc.cpk_uncompensated;
      return { cpk, edges: sched.edges_needed, avgVb };
    } catch {
      return null;
    }
  }

  /** Run Monte Carlo stochastic production plan. */
  run(input: StochasticPlanInput): StochasticPlanResult {
    const trials = input.n_trials ?? 100;
    const seed = input.seed ?? 1;
    const sVc = input.sigma_vc_rel ?? 0.05;
    const sF = input.sigma_feed_rel ?? 0.05;
    const sAp = input.sigma_ap_rel ?? 0.05;
    const vbFailure = input.vb_failure_um ?? 300;
    const threshold = input.reliability_threshold ?? 0.85;
    const approachDeg = input.approach_angle_deg ?? 90;
    const autoOffset = input.auto_offset_enabled ?? true;
    const probeInterval = Math.max(
      Math.round(input.probe_interval ?? 5),
      1,
    );

    const { normal } = this.makeSeededRandom(seed);
    const cpks: number[] = [];
    const edges: number[] = [];
    const wears: number[] = [];

    for (let t = 0; t < trials; t++) {
      const sampledOps: OpSpec[] = input.ops.map((o) => ({
        conditions: {
          ...o.conditions,
          Vc_m_min: Math.max(o.conditions.Vc_m_min * (1 + normal() * sVc), 10),
          f_mm_rev: Math.max(o.conditions.f_mm_rev * (1 + normal() * sF), 0.01),
          ap_mm: Math.max(o.conditions.ap_mm * (1 + normal() * sAp), 0.05),
        },
        duration_min: o.duration_min,
        label: o.label,
      }));
      const r = this.evaluateCascadeSample({
        ops: sampledOps,
        batch_size: input.batch_size,
        nominal_mm: input.nominal_mm,
        tolerance_mm: input.tolerance_mm,
        reliability_threshold: threshold,
        vb_failure_um: vbFailure,
        approach_angle_deg: approachDeg,
        auto_offset_enabled: autoOffset,
        probe_interval: probeInterval,
      });
      if (r !== null) {
        cpks.push(r.cpk);
        edges.push(r.edges);
        wears.push(r.avgVb);
      }
    }

    return {
      trials_attempted: trials,
      trials_feasible: cpks.length,
      cpk_p05: this.quantile(cpks, 0.05),
      cpk_p50: this.quantile(cpks, 0.5),
      cpk_p95: this.quantile(cpks, 0.95),
      edges_p50: this.quantile(edges, 0.5),
      wears_p50: this.quantile(wears, 0.5),
      cpks,
      edges,
      wears,
      source:
        "TurningStochasticPlanEngine.run (MC over MS1+MS2 with Gaussian Vc/f/ap)",
    };
  }
}

export const turningStochasticPlanEngine = new TurningStochasticPlanEngine();
export { TurningStochasticPlanEngine };
