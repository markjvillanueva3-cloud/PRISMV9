/**
 * SFC combinatorial FULL-SPACE ENUMERATOR (U-FT-02, SFC-FULLTUNE-BUILDOUT).
 *
 * The index-addressable primitive the batch sweep is built on. Where the SAMPLER
 * (`sfc-combinatorial-sampler.ts`) draws a stratified ~1716-cell DOE *sample*, this
 * module deterministically ENUMERATES the entire valid discrete cross-product as a
 * bijection between a flat index `[0, SFC_FULL_SPACE_SIZE)` and a `SampledCell`, so a
 * fleet of workers can each take a contiguous `[offset, offset+count)` slice WITHOUT
 * any worker materializing the 20M-cell array (mixed-radix decode, O(1) per cell).
 *
 * Space = enumerateValidCells() (192 valid op x strategy x cut x toolmat) x the 6
 * continuous/discrete axes (ISO 6 x diameter 10 x flute 7 x power 6 x hardness 6 x
 * coolant 7) = 192 x 105,840 = 20,321,280 cells. The 192 is READ from the validity
 * matrix (never hard-coded), so if the validity rules change the total tracks them.
 *
 * Pure combinatorics -- ZERO physics. Emits the SAME `SampledCell` shape the existing
 * driver (`sfc-combinatorial-driver.ts`) consumes, so the batch runner reuses the
 * driver verbatim. The continuous-axis VALUES come from the canonical axis arrays
 * (`sfc-combinatorial-axes.ts`); nothing is inlined here.
 *
 * @module data/sfc-combinatorial-enumerator
 */
import {
  ISO_BANDS,
  DIAMETER_SWEEP_MM,
  FLUTE_SWEEP,
  MACHINE_POWER_KW,
  HARDNESS_HB_SWEEP,
  COOLANTS,
} from "./sfc-combinatorial-axes.js";
import { enumerateValidCells, type CombinatorialCellKey } from "./sfc-combinatorial-validity.js";
import type { SampledCell } from "./sfc-combinatorial-sampler.js";

/**
 * The validity cells, enumerated once in the validity matrix's deterministic order.
 * This is the most-significant "digit" of the mixed-radix index, so the enumeration
 * order is stable as long as `enumerateValidCells()` is (it is -- a pure iteration).
 */
const VALID_CELLS: readonly CombinatorialCellKey[] = enumerateValidCells();

/**
 * Mixed-radix digit ladder, least-significant FIRST. The flat index decodes by
 * successive (value = arr[r % len]; r = floor(r / len)) from coolant up to the
 * validity cell. Order is fixed + documented so the index<->cell map never drifts.
 */
const RADIX = [
  COOLANTS.length, // least significant
  HARDNESS_HB_SWEEP.length,
  MACHINE_POWER_KW.length,
  FLUTE_SWEEP.length,
  DIAMETER_SWEEP_MM.length,
  ISO_BANDS.length,
  VALID_CELLS.length, // most significant
] as const;

/** Total valid discrete cells = product of every axis cardinality (validity-aware). */
export const SFC_FULL_SPACE_SIZE: number = RADIX.reduce((a, b) => a * b, 1);

/**
 * Decode a flat index into its fully-specified {@link SampledCell}. Bijective over
 * `[0, SFC_FULL_SPACE_SIZE)`: every index maps to a distinct cell and every valid
 * cell has exactly one index. Throws (fail-loud) on an out-of-range / non-integer
 * index -- a silent wrap would corrupt a batch worker's slice accounting.
 */
export function cellAtIndex(index: number): SampledCell {
  if (!Number.isInteger(index) || index < 0 || index >= SFC_FULL_SPACE_SIZE) {
    throw new RangeError(
      `cellAtIndex: index ${index} out of range [0, ${SFC_FULL_SPACE_SIZE})`,
    );
  }
  let r = index;
  const coolant = COOLANTS[r % COOLANTS.length]!;
  r = Math.floor(r / COOLANTS.length);
  const hardness_hb = HARDNESS_HB_SWEEP[r % HARDNESS_HB_SWEEP.length]!;
  r = Math.floor(r / HARDNESS_HB_SWEEP.length);
  const machine_power_kw = MACHINE_POWER_KW[r % MACHINE_POWER_KW.length]!;
  r = Math.floor(r / MACHINE_POWER_KW.length);
  const flutes = FLUTE_SWEEP[r % FLUTE_SWEEP.length]!;
  r = Math.floor(r / FLUTE_SWEEP.length);
  const diameter_mm = DIAMETER_SWEEP_MM[r % DIAMETER_SWEEP_MM.length]!;
  r = Math.floor(r / DIAMETER_SWEEP_MM.length);
  const band = ISO_BANDS[r % ISO_BANDS.length]!;
  r = Math.floor(r / ISO_BANDS.length);
  const vcell = VALID_CELLS[r]!; // r is now in [0, VALID_CELLS.length)

  return {
    operation: vcell.operation,
    strategy: vcell.strategy,
    cut_type: vcell.cut_type,
    tool_material: vcell.tool_material,
    iso_group: band.iso,
    representative_material: band.representative,
    diameter_mm,
    flutes,
    machine_power_kw,
    hardness_hb,
    coolant,
  };
}

/**
 * Encode a {@link SampledCell} back to its flat index (the inverse of
 * {@link cellAtIndex}). Returns -1 if the cell is not a member of the valid
 * enumerable space (e.g. an off-grid continuous value, or an invalid op-combo) --
 * lets a consumer verify membership / dedup without throwing.
 */
export function indexOfCell(cell: SampledCell): number {
  const di = DIAMETER_SWEEP_MM.indexOf(cell.diameter_mm);
  const fi = FLUTE_SWEEP.indexOf(cell.flutes);
  const pi = MACHINE_POWER_KW.indexOf(cell.machine_power_kw);
  const hi = HARDNESS_HB_SWEEP.indexOf(cell.hardness_hb);
  const ci = COOLANTS.indexOf(cell.coolant);
  const bi = ISO_BANDS.findIndex(b => b.iso === cell.iso_group);
  const vi = VALID_CELLS.findIndex(
    v =>
      v.operation === cell.operation &&
      v.strategy === cell.strategy &&
      v.cut_type === cell.cut_type &&
      v.tool_material === cell.tool_material,
  );
  if ([di, fi, pi, hi, ci, bi, vi].some(ix => ix < 0)) return -1;
  // Horner over the SAME most-significant-first ladder cellAtIndex decodes.
  return ((((((vi * ISO_BANDS.length + bi) * DIAMETER_SWEEP_MM.length + di) * FLUTE_SWEEP.length + fi) * MACHINE_POWER_KW.length + pi) * HARDNESS_HB_SWEEP.length + hi) * COOLANTS.length + ci);
}

/**
 * Materialize a contiguous slice `[offset, offset + count)` of the enumeration -- the
 * unit of work a batch runner hands to one worker. `count` is clamped to the space
 * end (a final partial slice is fine); a non-positive count yields []. Throws on a
 * negative / non-integer offset (a worker can never start mid-cell).
 */
export function enumerateRange(offset: number, count: number): SampledCell[] {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError(`enumerateRange: offset ${offset} must be a non-negative integer`);
  }
  if (!Number.isInteger(count) || count <= 0 || offset >= SFC_FULL_SPACE_SIZE) return [];
  const end = Math.min(offset + count, SFC_FULL_SPACE_SIZE);
  const out: SampledCell[] = new Array(end - offset);
  for (let i = offset; i < end; i++) out[i - offset] = cellAtIndex(i);
  return out;
}

/**
 * Partition the whole space into `chunks` near-equal contiguous slices (the offsets a
 * coordinator hands to N workers). Returns `{ offset, count }[]` whose counts sum to
 * SFC_FULL_SPACE_SIZE with zero overlap and zero gap. The last chunk absorbs the
 * remainder. `chunks` is clamped to [1, SFC_FULL_SPACE_SIZE].
 */
export function partitionSpace(chunks: number): Array<{ offset: number; count: number }> {
  const n = Math.max(1, Math.min(Math.floor(chunks) || 1, SFC_FULL_SPACE_SIZE));
  const base = Math.floor(SFC_FULL_SPACE_SIZE / n);
  const rem = SFC_FULL_SPACE_SIZE - base * n;
  const parts: Array<{ offset: number; count: number }> = [];
  let offset = 0;
  for (let k = 0; k < n; k++) {
    const count = base + (k < rem ? 1 : 0); // spread the remainder over the first `rem` chunks
    parts.push({ offset, count });
    offset += count;
  }
  return parts;
}

/** Cells per regime-aligned work unit = product of the 5 continuous/discrete axes. */
export const SFC_CELLS_PER_WORK_UNIT: number =
  DIAMETER_SWEEP_MM.length *
  FLUTE_SWEEP.length *
  MACHINE_POWER_KW.length *
  HARDNESS_HB_SWEEP.length *
  COOLANTS.length;

/**
 * The natural REGIME-ALIGNED work-unit count: one atomic unit per (validity-cell x ISO
 * band). Because the validity cell is the MOST-significant radix digit and ISO the next,
 * a partition into exactly this many contiguous slices makes each slice EXACTLY one
 * (validCellIdx, isoIdx) pair -- SFC_CELLS_PER_WORK_UNIT continuous-axis combos that all
 * share the same operation/strategy/cut/tool-material AND iso_group. By construction
 * SFC_WORK_UNIT_COUNT * SFC_CELLS_PER_WORK_UNIT === SFC_FULL_SPACE_SIZE.
 */
export const SFC_WORK_UNIT_COUNT: number = VALID_CELLS.length * ISO_BANDS.length;

/** One unit of work the coordinator (U-FT-05) hands a worker (U-FT-04). */
export interface SfcWorkUnit {
  /** Stable, sortable, filename-safe id (`u0000`..). The output shard is named by this. */
  unitId: string;
  /** Flat-index slice [offset, offset+count) -- feed to enumerateRange()/cellAtIndex(). */
  offset: number;
  count: number;
  /** Regime coordinates: this unit IS exactly one (validity-cell, ISO-band) pair. */
  validCellIdx: number;
  isoIdx: number;
}

/**
 * Enumerate the {@link SFC_WORK_UNIT_COUNT} regime-aligned work units -- the partition the
 * batch coordinator fans across workers. Each unit is a contiguous
 * {@link SFC_CELLS_PER_WORK_UNIT}-cell slice equal to exactly one (validCell, iso) regime,
 * so a worker's whole shard is regime-homogeneous (the reducer folds it under one
 * (iso, operation)) and resume is unit-granular. Pure combinatorics -- no engine, no
 * physics. The offset math mirrors the mixed-radix ladder cellAtIndex/partitionSpace use:
 * offset(k) = k * SFC_CELLS_PER_WORK_UNIT (validCell most-significant, ISO next).
 */
export function enumerateWorkUnits(): SfcWorkUnit[] {
  const perValidCell = ISO_BANDS.length * SFC_CELLS_PER_WORK_UNIT;
  const units: SfcWorkUnit[] = new Array(SFC_WORK_UNIT_COUNT);
  for (let k = 0; k < SFC_WORK_UNIT_COUNT; k++) {
    const validCellIdx = Math.floor(k / ISO_BANDS.length);
    const isoIdx = k % ISO_BANDS.length;
    units[k] = {
      unitId: `u${String(k).padStart(4, "0")}`,
      offset: validCellIdx * perValidCell + isoIdx * SFC_CELLS_PER_WORK_UNIT,
      count: SFC_CELLS_PER_WORK_UNIT,
      validCellIdx,
      isoIdx,
    };
  }
  return units;
}
