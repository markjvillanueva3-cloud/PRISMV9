/**
 * SFC batch WORK-UNIT addressing layer (U-FT-03, SFC-FULLTUNE-BUILDOUT).
 *
 * The semantic partition the batch coordinator (U-FT-05) fans out to a worker
 * pool (U-FT-04) and the reducer (U-FT-06) folds by regime. Where the ENUMERATOR
 * (`sfc-combinatorial-enumerator.ts`) is an arbitrary flat-index bijection over
 * the 20,321,280-cell space, this module slices that space into the 1,152
 * REGIME-ALIGNED atoms the plan's downstream design assumes: one
 * (validity-cell x ISO-band) pair per unit.
 *
 * WHY this falls out for free: the enumerator's mixed-radix ladder puts
 * VALID_CELLS (most significant) then ISO_BANDS (next) as the top two digits, so
 *
 *   flatIndex = validCellIdx * (ISO * dia * flute * power * hardness * coolant)
 *             + isoIdx       * (dia * flute * power * hardness * coolant)
 *             + subIndex                              (subIndex in [0, 17640))
 *             = unitId * CELLS_PER_UNIT + subIndex,   unitId = validCellIdx*6 + isoIdx
 *
 * i.e. EACH unit is an EXACT contiguous index range `[unitId*17640, +17640)` and
 * every cell inside it shares the same (operation, strategy, cut_type,
 * tool_material, iso_group) regime. That alignment is what lets U-FT-06 reduce
 * per-(iso,op) regime shard-by-shard without re-grouping, and lets the manifest
 * key resume on a stable, human-readable unitId.
 *
 * CELLS_PER_UNIT is structurally 17,640 = (105,840 axis product) / (6 ISO),
 * INDEPENDENT of the validity-cell count -- so it stays exact even if the
 * validity matrix gains/loses op-combos (only UNIT_COUNT tracks that). A
 * module-load assertion fails loud if that ever stops being a whole number.
 *
 * Pure combinatorics -- ZERO physics. Cells come from the enumerator (canonical
 * axis values, never inlined); emits the SAME `SampledCell` shape the CSFH driver
 * consumes.
 *
 * @module data/sfc-batch-units
 */
import {
  SFC_FULL_SPACE_SIZE,
  enumerateRange,
  cellAtIndex,
} from "./sfc-combinatorial-enumerator.js";
import { enumerateValidCells, type CombinatorialCellKey } from "./sfc-combinatorial-validity.js";
import { ISO_BANDS } from "./sfc-combinatorial-axes.js";
import type { SampledCell } from "./sfc-combinatorial-sampler.js";

/** Validity cells in the same deterministic order the enumerator's top digit uses. */
const VALID_CELLS: readonly CombinatorialCellKey[] = enumerateValidCells();

/** Number of ISO bands -- the second-most-significant enumerator digit. */
export const ISO_COUNT: number = ISO_BANDS.length;

/** Total work units = one (validity-cell x ISO-band) atom each. 192 x 6 = 1,152. */
export const UNIT_COUNT: number = VALID_CELLS.length * ISO_COUNT;

/**
 * Cells per work unit = the continuous-axis product (dia x flute x power x
 * hardness x coolant) = full-space size / unit count. Structurally a whole number
 * (105,840 / 6 = 17,640); asserted at load so a future axis change can never
 * silently produce a fractional, gap-leaving slice.
 */
export const CELLS_PER_UNIT: number = SFC_FULL_SPACE_SIZE / UNIT_COUNT;

if (!Number.isInteger(CELLS_PER_UNIT)) {
  throw new Error(
    `sfc-batch-units: SFC_FULL_SPACE_SIZE (${SFC_FULL_SPACE_SIZE}) not divisible by ` +
      `UNIT_COUNT (${UNIT_COUNT}) -- the (validCell x ISO) partition would leave a ` +
      `gap. Check the enumerator radix order / axis cardinalities.`,
  );
}

/** A single fan-out atom: one (validity-cell x ISO-band) regime = a contiguous slice. */
export interface BatchUnit {
  /** Stable id `0..UNIT_COUNT-1`, equal to `validCellIdx * ISO_COUNT + isoIdx`. */
  unitId: number;
  /** Index into the validity-cell list (`0..VALID_CELLS.length-1`). */
  validCellIdx: number;
  /** Index into ISO_BANDS (`0..ISO_COUNT-1`). */
  isoIdx: number;
  /** The op-combo every cell in this unit shares. */
  validCell: CombinatorialCellKey;
  /** The ISO group every cell in this unit shares (e.g. "P"). */
  isoGroup: string;
  /** First flat enumerator index of this unit's slice. */
  offset: number;
  /** Cell count in this unit -- always {@link CELLS_PER_UNIT}. */
  count: number;
}

/** Throw (fail-loud) on a non-integer / out-of-range unit id -- a bad id would mis-slice. */
function assertUnitId(unitId: number): void {
  if (!Number.isInteger(unitId) || unitId < 0 || unitId >= UNIT_COUNT) {
    throw new RangeError(`sfc-batch-units: unitId ${unitId} out of range [0, ${UNIT_COUNT})`);
  }
}

/**
 * Compose the stable unit id from its (validity-cell, ISO) coordinates. Inverse of
 * the `validCellIdx`/`isoIdx` fields {@link describeUnit} decodes. Throws on an
 * off-grid coordinate.
 */
export function unitIdFor(validCellIdx: number, isoIdx: number): number {
  if (!Number.isInteger(validCellIdx) || validCellIdx < 0 || validCellIdx >= VALID_CELLS.length) {
    throw new RangeError(
      `sfc-batch-units: validCellIdx ${validCellIdx} out of range [0, ${VALID_CELLS.length})`,
    );
  }
  if (!Number.isInteger(isoIdx) || isoIdx < 0 || isoIdx >= ISO_COUNT) {
    throw new RangeError(`sfc-batch-units: isoIdx ${isoIdx} out of range [0, ${ISO_COUNT})`);
  }
  return validCellIdx * ISO_COUNT + isoIdx;
}

/** The contiguous flat-index slice `{ offset, count }` a worker enumerates for this unit. */
export function unitRange(unitId: number): { offset: number; count: number } {
  assertUnitId(unitId);
  return { offset: unitId * CELLS_PER_UNIT, count: CELLS_PER_UNIT };
}

/** Which unit a flat enumerator index belongs to -- handy for the reducer to bucket a shard. */
export function unitIdOfIndex(flatIndex: number): number {
  if (!Number.isInteger(flatIndex) || flatIndex < 0 || flatIndex >= SFC_FULL_SPACE_SIZE) {
    throw new RangeError(
      `sfc-batch-units: flatIndex ${flatIndex} out of range [0, ${SFC_FULL_SPACE_SIZE})`,
    );
  }
  return Math.floor(flatIndex / CELLS_PER_UNIT);
}

/** Full {@link BatchUnit} descriptor (coordinates + regime metadata + slice) for a unit id. */
export function describeUnit(unitId: number): BatchUnit {
  assertUnitId(unitId);
  const validCellIdx = Math.floor(unitId / ISO_COUNT);
  const isoIdx = unitId % ISO_COUNT;
  return {
    unitId,
    validCellIdx,
    isoIdx,
    validCell: VALID_CELLS[validCellIdx]!,
    isoGroup: ISO_BANDS[isoIdx]!.iso,
    offset: unitId * CELLS_PER_UNIT,
    count: CELLS_PER_UNIT,
  };
}

/** All {@link UNIT_COUNT} unit descriptors in id order -- the coordinator's fan-out list. */
export function enumerateUnits(): BatchUnit[] {
  const out: BatchUnit[] = new Array(UNIT_COUNT);
  for (let unitId = 0; unitId < UNIT_COUNT; unitId++) out[unitId] = describeUnit(unitId);
  return out;
}

/**
 * Materialize the {@link CELLS_PER_UNIT} `SampledCell`s of one unit (the slice a
 * worker drives through the real engine). Every returned cell shares this unit's
 * (op-combo, ISO) regime by construction. 17,640 small objects (~a few MB) is well
 * within a worker heap; the 20.3M full space is never materialized at once.
 */
export function cellsForUnit(unitId: number): SampledCell[] {
  const { offset, count } = unitRange(unitId);
  return enumerateRange(offset, count);
}

/**
 * The single representative (first) cell of a unit -- cheap regime probe for the
 * coordinator/manifest without materializing all 17,640 cells.
 */
export function representativeCell(unitId: number): SampledCell {
  const { offset } = unitRange(unitId);
  return cellAtIndex(offset);
}
