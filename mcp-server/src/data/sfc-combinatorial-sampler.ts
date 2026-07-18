/**
 * SFC combinatorial DOE SAMPLER -- generates the sampled cell space the harness
 * driver runs through the SFC engine. Full-enumerates the discrete validity cells
 * (U-CSFH-02) and stratified-samples the continuous axes (diameter / flutes /
 * power / hardness / coolant) x the ISO-group axis, with a per-regime coverage
 * floor so even sparse operations (tapping has 2 valid cells, reaming 4) are
 * characterised, not just milling (126).
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-04-SAMPLER (slot:oscar, 2026-06-11).
 *
 * PURE + DETERMINISTIC -- a seeded PRNG (mulberry32) drives the stratified picks,
 * so the same seed yields byte-identical samples (reproducible sweeps + tests).
 * It does NOT call the cited-data source (U-CSFH-03): citation happens later in
 * the DRIVER (U-CSFH-06) where a manufacturer/tool context exists -- attaching an
 * always-unresolved citation here would be a no-op fake-reader. Lives in
 * `src/data/` with the CSFH harness family (axes/validity/gates/datasource).
 * No physics constants (it samples an input space, never computes cutting math).
 *
 * DOE shape: for each valid (operation x strategy x cut x toolmat) cell and each
 * ISO band, draw K cyclic-offset-stratified samples over the continuous axes (each
 * axis walked independently from a seeded offset; the axes advance in lockstep = a
 * correlated diagonal walk, NOT an independent LHS -- a per-regime sweep). K is RAISED per
 * operation so `numValidCells(op) x K >= floor` for every (iso, operation) regime
 * -- a flat K would leave tapping/reaming regimes under-sampled. The floor is
 * asserted fail-loud at the end (it is met by construction; the throw guards a
 * future axis/validity change that would silently break coverage).
 */
import { enumerateValidCells } from "./sfc-combinatorial-validity.js";
import {
  ISO_BANDS,
  DIAMETER_SWEEP_MM,
  FLUTE_SWEEP,
  MACHINE_POWER_KW,
  HARDNESS_HB_SWEEP,
  COOLANTS,
  type Operation,
  type Strategy,
  type CutType,
  type ToolMaterial,
  type ISOGroup,
  type CoolantType,
} from "./sfc-combinatorial-axes.js";

/** One fully-specified sample: a validity cell x ISO band x drawn continuous axes. */
export interface SampledCell {
  operation: Operation;
  strategy: Strategy;
  cut_type: CutType;
  tool_material: ToolMaterial;
  iso_group: ISOGroup;
  representative_material: string;
  diameter_mm: number;
  flutes: number;
  machine_power_kw: number;
  hardness_hb: number;
  coolant: CoolantType;
}

export interface SamplerOptions {
  /** PRNG seed -- same seed => identical samples. */
  seed?: number;
  /** Minimum samples drawn per validity cell (raised per-op to meet the floor). */
  baseSamplesPerCell?: number;
  /** Minimum samples every (iso_group, operation) regime must receive. */
  floorPerRegime?: number;
}

export interface SampleResult {
  samples: SampledCell[];
  /** "<iso>:<operation>" -> sample count (every value >= floorPerRegime). */
  perRegimeCounts: Record<string, number>;
  floorPerRegime: number;
  total: number;
}

/** mulberry32 -- a tiny deterministic 32-bit PRNG (no external dep). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CombinatorialCellSamplerEngine {
  /**
   * Generate the sampled cell space.
   * @param opts seed (default 0xC0FFEE), baseSamplesPerCell (default 1),
   *   floorPerRegime (default 20).
   * @returns the samples + per-regime counts + the floor used.
   * @throws if any (iso, operation) regime falls below the floor (coverage guard).
   */
  static sample(opts: SamplerOptions = {}): SampleResult {
    const seed = opts.seed ?? 0xc0ffee;
    const baseK = Math.max(1, opts.baseSamplesPerCell ?? 1);
    const floor = Math.max(0, opts.floorPerRegime ?? 20);

    const valid = enumerateValidCells(); // 192 valid cells (U-CSFH-02)

    // Validity-cell count per operation -> raise K so numCells(op)*K >= floor.
    const cellsPerOp = new Map<Operation, number>();
    for (const c of valid) cellsPerOp.set(c.operation, (cellsPerOp.get(c.operation) ?? 0) + 1);
    const kForOp = (op: Operation): number =>
      Math.max(baseK, floor > 0 ? Math.ceil(floor / (cellsPerOp.get(op) ?? 1)) : baseK);

    const rng = mulberry32(seed);
    // Cyclic-offset stratified: across i=0..K-1 each axis is walked independently
    // from its own seeded offset. Tapping (K=10) reaches every value of each axis
    // (lengths 6-10) within one (cell, iso) pass; reaming (K=5) and milling (K=1)
    // sample fewer per pass, with breadth coming from seeded-offset diversity ACROSS
    // cells (e.g. the 126 milling cells). The 5 axes advance in lockstep (a correlated
    // diagonal walk of the joint space), NOT an independent Latin hypercube -- adequate
    // for a per-regime sweep, not interaction-effect DOE (a future [SCOPED] upgrade).
    const pick = <T>(arr: readonly T[], i: number, off: number): T => arr[(off + i) % arr.length]!;

    const samples: SampledCell[] = [];
    for (const cell of valid) {
      const K = kForOp(cell.operation);
      for (const band of ISO_BANDS) {
        // Per-(cell, iso) seeded axis offsets -> deterministic variety across regimes.
        const dOff = Math.floor(rng() * DIAMETER_SWEEP_MM.length);
        const fOff = Math.floor(rng() * FLUTE_SWEEP.length);
        const pOff = Math.floor(rng() * MACHINE_POWER_KW.length);
        const hOff = Math.floor(rng() * HARDNESS_HB_SWEEP.length);
        const cOff = Math.floor(rng() * COOLANTS.length);
        for (let i = 0; i < K; i++) {
          samples.push({
            operation: cell.operation,
            strategy: cell.strategy,
            cut_type: cell.cut_type,
            tool_material: cell.tool_material,
            iso_group: band.iso,
            representative_material: band.representative,
            diameter_mm: pick(DIAMETER_SWEEP_MM, i, dOff),
            flutes: pick(FLUTE_SWEEP, i, fOff),
            machine_power_kw: pick(MACHINE_POWER_KW, i, pOff),
            hardness_hb: pick(HARDNESS_HB_SWEEP, i, hOff),
            coolant: pick(COOLANTS, i, cOff),
          });
        }
      }
    }

    const perRegimeCounts: Record<string, number> = {};
    for (const s of samples) {
      const key = `${s.iso_group}:${s.operation}`;
      perRegimeCounts[key] = (perRegimeCounts[key] ?? 0) + 1;
    }

    if (floor > 0) {
      const under = Object.entries(perRegimeCounts).filter(([, n]) => n < floor);
      if (under.length > 0) {
        throw new Error(
          `sampler: ${under.length} regime(s) below floor ${floor}: ` +
            under.map(([r, n]) => `${r}=${n}`).join(", "),
        );
      }
    }

    return { samples, perRegimeCounts, floorPerRegime: floor, total: samples.length };
  }
}
