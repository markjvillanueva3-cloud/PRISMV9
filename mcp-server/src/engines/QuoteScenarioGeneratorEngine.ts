/**
 * QuoteScenarioGeneratorEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT05
 *
 * Deterministic, seeded synthetic-scenario generator for breadth training.
 * Produces N XometryQuoteInputs records sampled across the full input space:
 *
 *   material:        all 4 (aluminum_6061 / steel_a36 / stainless_304 / copper_c110)
 *   process:         all 4 (mill / lathe / wedm / sinker_edm)
 *   dimensions:      uniform on [10, 200] mm per axis
 *   tolerance:       all 4 classes
 *   surface_finish:  {3.2, 1.6, 0.8, 0.4} um Ra
 *   quantity:        uniform on [1, 500]
 *   lead_time_days:  uniform on [1, 30]
 *
 * Seeded mulberry32 PRNG → identical seed produces identical scenarios across
 * runs + machines (per ML R1: reproducibility, never test data leakage).
 *
 * Scales to millions: generation is O(N) memory + zero I/O. Caller streams in
 * chunks if needed.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT05
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */

import type { XometryQuoteInputs, QuoteMaterial, QuoteProcess, ToleranceClass } from "./XometryStyleQuoteInputsEngine.js";

const MATERIALS: QuoteMaterial[] = ["aluminum_6061", "steel_a36", "stainless_304", "copper_c110"];
const PROCESSES: QuoteProcess[] = ["mill", "lathe", "wedm", "sinker_edm"];
const TOLERANCES: ToleranceClass[] = ["coarse", "medium", "fine", "very_fine"];
const FINISH_RA_OPTIONS = [3.2, 1.6, 0.8, 0.4];

const DEFAULT_SEED = 0x9E3779B1;     // golden-ratio constant
const DIM_MIN_MM = 10;
const DIM_MAX_MM = 200;
const QTY_MIN = 1;
const QTY_MAX = 500;
const LEAD_MIN_DAYS = 1;
const LEAD_MAX_DAYS = 30;

/** mulberry32 — deterministic 32-bit PRNG. Same seed → same sequence. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangeInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(lo + rng() * (hi - lo + 1));
}

function rangeFloat(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

export interface ScenarioGenOptions {
  count: number;
  seed?: number;
  /** Restrict to specific materials (default: all 4). */
  materials?: QuoteMaterial[];
  /** Restrict to specific processes (default: all 4). */
  processes?: QuoteProcess[];
}

export interface ScenarioBatch {
  ok: boolean;
  count: number;
  seed: number;
  scenarios: XometryQuoteInputs[];
  reason?: string;
}

export class QuoteScenarioGeneratorEngine {
  generate(opts: ScenarioGenOptions): ScenarioBatch {
    const empty: ScenarioBatch = { ok: false, count: 0, seed: 0, scenarios: [] };
    if (!opts || !Number.isInteger(opts.count) || opts.count <= 0) {
      return { ...empty, reason: "count-must-be-positive-integer" };
    }
    const seed = opts.seed ?? DEFAULT_SEED;
    const rng = mulberry32(seed);
    const materials = (opts.materials && opts.materials.length > 0) ? opts.materials : MATERIALS;
    const processes = (opts.processes && opts.processes.length > 0) ? opts.processes : PROCESSES;
    const scenarios: XometryQuoteInputs[] = [];
    for (let i = 0; i < opts.count; i++) {
      scenarios.push({
        material: pick(rng, materials),
        process: pick(rng, processes),
        length_mm: round1(rangeFloat(rng, DIM_MIN_MM, DIM_MAX_MM)),
        width_mm: round1(rangeFloat(rng, DIM_MIN_MM, DIM_MAX_MM)),
        height_mm: round1(rangeFloat(rng, DIM_MIN_MM, DIM_MAX_MM)),
        tolerance_class: pick(rng, TOLERANCES),
        surface_finish_um: pick(rng, FINISH_RA_OPTIONS),
        quantity: rangeInt(rng, QTY_MIN, QTY_MAX),
        lead_time_days: rangeInt(rng, LEAD_MIN_DAYS, LEAD_MAX_DAYS),
      });
    }
    return { ok: true, count: scenarios.length, seed, scenarios };
  }

  /** Generator-style for million-scale workloads — yields one scenario at a time. */
  *stream(opts: ScenarioGenOptions): Generator<XometryQuoteInputs> {
    if (!Number.isInteger(opts.count) || opts.count <= 0) return;
    const rng = mulberry32(opts.seed ?? DEFAULT_SEED);
    const materials = (opts.materials && opts.materials.length > 0) ? opts.materials : MATERIALS;
    const processes = (opts.processes && opts.processes.length > 0) ? opts.processes : PROCESSES;
    for (let i = 0; i < opts.count; i++) {
      yield {
        material: pick(rng, materials),
        process: pick(rng, processes),
        length_mm: round1(rangeFloat(rng, DIM_MIN_MM, DIM_MAX_MM)),
        width_mm: round1(rangeFloat(rng, DIM_MIN_MM, DIM_MAX_MM)),
        height_mm: round1(rangeFloat(rng, DIM_MIN_MM, DIM_MAX_MM)),
        tolerance_class: pick(rng, TOLERANCES),
        surface_finish_um: pick(rng, FINISH_RA_OPTIONS),
        quantity: rangeInt(rng, QTY_MIN, QTY_MAX),
        lead_time_days: rangeInt(rng, LEAD_MIN_DAYS, LEAD_MAX_DAYS),
      };
    }
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

export const quoteScenarioGeneratorEngine = new QuoteScenarioGeneratorEngine();
