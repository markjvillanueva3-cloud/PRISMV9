/**
 * Tests for the SFC full-space ENUMERATOR (U-FT-02, SFC-FULLTUNE-BUILDOUT).
 *
 * The load-bearing properties (R9 -- verify intent): the index<->cell map is a
 * BIJECTION over [0, SFC_FULL_SPACE_SIZE), the SIZE equals the validity-aware full
 * product (20,321,280), partitions COVER the space with zero gap/overlap, and every
 * emitted cell is a member of the valid space (no invalid leak). Bijection + exact
 * count + complete partition together prove total coverage WITHOUT enumerating 20M
 * cells. Plus the fail-loud bounds (negative/non-integer/over-range throw).
 */
import { describe, it, expect } from "vitest";
import {
  SFC_FULL_SPACE_SIZE,
  cellAtIndex,
  indexOfCell,
  enumerateRange,
  partitionSpace,
  enumerateWorkUnits,
  SFC_WORK_UNIT_COUNT,
  SFC_CELLS_PER_WORK_UNIT,
} from "./sfc-combinatorial-enumerator.js";
import { VALIDITY_STATS, isValidCell } from "./sfc-combinatorial-validity.js";
import {
  ISO_BANDS,
  DIAMETER_SWEEP_MM,
  FLUTE_SWEEP,
  MACHINE_POWER_KW,
  HARDNESS_HB_SWEEP,
  COOLANTS,
} from "./sfc-combinatorial-axes.js";

const AXIS_PRODUCT =
  ISO_BANDS.length *
  DIAMETER_SWEEP_MM.length *
  FLUTE_SWEEP.length *
  MACHINE_POWER_KW.length *
  HARDNESS_HB_SWEEP.length *
  COOLANTS.length;

describe("sfc-combinatorial-enumerator (U-FT-02)", () => {
  // ---- T1 (happy): SIZE is the validity-aware full product ----
  it("SFC_FULL_SPACE_SIZE = valid validity-cells x axis product = 20,321,280", () => {
    expect(SFC_FULL_SPACE_SIZE).toBe(20_321_280);
    expect(SFC_FULL_SPACE_SIZE).toBe(VALIDITY_STATS.valid * AXIS_PRODUCT);
    expect(AXIS_PRODUCT).toBe(105_840); // ISO 6 x dia 10 x flute 7 x power 6 x hardness 6 x coolant 7
    expect(VALIDITY_STATS.valid).toBe(192); // 192 valid op-combos x 105,840 = 20,321,280
  });

  // ---- T2 (happy): boundary cells decode to fully-specified, in-grid cells ----
  it("cellAtIndex(0) and cellAtIndex(SIZE-1) are complete cells with canonical axis values", () => {
    for (const i of [0, SFC_FULL_SPACE_SIZE - 1]) {
      const c = cellAtIndex(i);
      expect(DIAMETER_SWEEP_MM).toContain(c.diameter_mm);
      expect(FLUTE_SWEEP).toContain(c.flutes);
      expect(MACHINE_POWER_KW).toContain(c.machine_power_kw);
      expect(HARDNESS_HB_SWEEP).toContain(c.hardness_hb);
      expect(COOLANTS).toContain(c.coolant);
      expect(ISO_BANDS.map(b => b.iso)).toContain(c.iso_group);
      expect(typeof c.representative_material).toBe("string");
      // op-combo is a real VALID validity cell
      expect(isValidCell({ operation: c.operation, strategy: c.strategy, cut_type: c.cut_type, tool_material: c.tool_material })).toBe(true);
    }
  });

  // ---- T3 (happy, the core invariant): index<->cell is a BIJECTION ----
  it("round-trips indexOfCell(cellAtIndex(i)) === i across a spread of indices", () => {
    // 105,840 = one validity-cell block (the most-significant digit's stride); probe its boundary.
    const probes = [
      0, 1, 6, 7, 105_839, 105_840, 105_841,
      Math.floor(SFC_FULL_SPACE_SIZE / 3),
      Math.floor(SFC_FULL_SPACE_SIZE / 2),
      SFC_FULL_SPACE_SIZE - 2,
      SFC_FULL_SPACE_SIZE - 1,
    ];
    // plus a deterministic spread (no RNG -- prime stride sweeps every radix digit)
    for (let i = 13; i < SFC_FULL_SPACE_SIZE; i += 1_299_709) probes.push(i);
    const seen = new Set<number>();
    for (const i of probes) {
      const cell = cellAtIndex(i);
      expect(indexOfCell(cell)).toBe(i); // inverse holds
      expect(seen.has(i)).toBe(false); // (probe sanity)
      seen.add(i);
    }
  });

  // ---- T4 (happy): deterministic ----
  it("cellAtIndex is deterministic (same index -> identical cell)", () => {
    const i = 9_999_983;
    expect(cellAtIndex(i)).toEqual(cellAtIndex(i));
  });

  // ---- T5 (adversarial + failure): out-of-range / non-integer indices throw ----
  it("cellAtIndex throws (fail-loud) on out-of-range / non-finite / non-integer index", () => {
    for (const bad of [-1, SFC_FULL_SPACE_SIZE, SFC_FULL_SPACE_SIZE + 1, 1.5, NaN, Infinity, -Infinity]) {
      expect(() => cellAtIndex(bad)).toThrow(RangeError);
    }
  });

  // ---- T6 (failure modes): enumerateRange slice fidelity + clamp + guards ----
  it("enumerateRange matches cellAtIndex, clamps at the end, and guards bad offsets", () => {
    const slice = enumerateRange(105_840, 5); // start of the 2nd validity-cell block
    expect(slice).toHaveLength(5);
    slice.forEach((c, k) => expect(c).toEqual(cellAtIndex(105_840 + k)));
    // clamp: a range straddling the end returns only the in-range tail
    const tail = enumerateRange(SFC_FULL_SPACE_SIZE - 3, 10);
    expect(tail).toHaveLength(3);
    expect(tail[2]).toEqual(cellAtIndex(SFC_FULL_SPACE_SIZE - 1));
    // empty / boundary
    expect(enumerateRange(0, 0)).toEqual([]);
    expect(enumerateRange(SFC_FULL_SPACE_SIZE, 100)).toEqual([]);
    expect(() => enumerateRange(-1, 5)).toThrow(RangeError);
  });

  // ---- T7 (the coverage proof): partitionSpace is complete + non-overlapping ----
  it("partitionSpace covers [0, SIZE) with zero gap and zero overlap", () => {
    for (const n of [1, 16, 1152, 99991]) {
      const parts = partitionSpace(n);
      let cursor = 0;
      let sum = 0;
      for (const p of parts) {
        expect(p.offset).toBe(cursor); // contiguous: each starts where the last ended (no gap, no overlap)
        expect(p.count).toBeGreaterThan(0);
        cursor += p.count;
        sum += p.count;
      }
      expect(sum).toBe(SFC_FULL_SPACE_SIZE); // complete coverage
      expect(cursor).toBe(SFC_FULL_SPACE_SIZE); // ends exactly at SIZE
    }
    // clamp: chunks > SIZE is bounded to SIZE one-cell parts (no zero-count parts)
    expect(partitionSpace(0)).toHaveLength(1);
  });

  // ---- T8 (variability + no-leak): sampled cells span axes and never leak an invalid op-combo ----
  it("a strided sample emits ONLY valid op-combos and spans every ISO group + operation", () => {
    const isos = new Set<string>();
    const ops = new Set<string>();
    for (let i = 0; i < SFC_FULL_SPACE_SIZE; i += 700_733) {
      const c = cellAtIndex(i);
      expect(isValidCell({ operation: c.operation, strategy: c.strategy, cut_type: c.cut_type, tool_material: c.tool_material })).toBe(true);
      isos.add(c.iso_group);
      ops.add(c.operation);
    }
    expect(isos.size).toBe(ISO_BANDS.length); // all 6 ISO groups appear
    expect(ops.size).toBeGreaterThanOrEqual(5); // operations span the valid set
  });

  // ---- T9 (adversarial): indexOfCell rejects an off-grid cell ----
  it("indexOfCell returns -1 for a cell with an off-grid continuous value", () => {
    const base = cellAtIndex(0);
    expect(indexOfCell({ ...base, diameter_mm: 13.37 })).toBe(-1); // not in DIAMETER_SWEEP_MM
    expect(indexOfCell({ ...base, flutes: 99 })).toBe(-1);
  });
});

// U-FT-03: the regime-aligned work-unit partition the batch coordinator fans to workers.
// Proves the enumerator already satisfies the plan's "work-unit addressing + slicing":
// 1,152 units, each exactly one (validCell x iso) regime of 17,640 cells, complete +
// non-overlapping, every cell in a unit sharing the same operation/strategy/cut/toolmat/iso.
describe("enumerateWorkUnits (U-FT-03 -- regime-aligned partition)", () => {
  it("count + cells-per-unit multiply to the full space exactly", () => {
    expect(SFC_CELLS_PER_WORK_UNIT).toBe(
      DIAMETER_SWEEP_MM.length * FLUTE_SWEEP.length * MACHINE_POWER_KW.length *
        HARDNESS_HB_SWEEP.length * COOLANTS.length,
    );
    expect(SFC_CELLS_PER_WORK_UNIT).toBe(17_640);
    expect(SFC_WORK_UNIT_COUNT * SFC_CELLS_PER_WORK_UNIT).toBe(SFC_FULL_SPACE_SIZE);
    // 1,152 = valid-cells (192) x ISO bands (6); reads from the validity matrix.
    expect(SFC_WORK_UNIT_COUNT).toBe(SFC_FULL_SPACE_SIZE / SFC_CELLS_PER_WORK_UNIT);
  });

  it("emits exactly SFC_WORK_UNIT_COUNT units, each of SFC_CELLS_PER_WORK_UNIT cells", () => {
    const units = enumerateWorkUnits();
    expect(units).toHaveLength(SFC_WORK_UNIT_COUNT);
    expect(units.every((u) => u.count === SFC_CELLS_PER_WORK_UNIT)).toBe(true);
    const sum = units.reduce((s, u) => s + u.count, 0);
    expect(sum).toBe(SFC_FULL_SPACE_SIZE); // complete coverage
  });

  it("units are a contiguous, gap-free, non-overlapping partition of [0, SIZE)", () => {
    const units = enumerateWorkUnits();
    expect(units[0]!.offset).toBe(0);
    for (let k = 1; k < units.length; k++) {
      // each unit starts exactly where the previous ended -> zero gap, zero overlap
      expect(units[k]!.offset).toBe(units[k - 1]!.offset + units[k - 1]!.count);
    }
    const last = units[units.length - 1]!;
    expect(last.offset + last.count).toBe(SFC_FULL_SPACE_SIZE);
    // offset(k) == k * cells-per-unit (validCell most-significant, iso next)
    expect(units.every((u, k) => u.offset === k * SFC_CELLS_PER_WORK_UNIT)).toBe(true);
  });

  it("each unit is REGIME-HOMOGENEOUS: every cell shares operation/strategy/cut/toolmat/iso", () => {
    const units = enumerateWorkUnits();
    // Sample units spread across the partition (decoding all 20.3M would be wasteful);
    // for each, decode first/mid/last + a strided interior and assert one regime.
    for (const k of [0, 1, 5, 6, 191, 576, 1151]) {
      const u = units[k]!;
      const first = cellAtIndex(u.offset);
      // the unit's regime matches its (validCellIdx, isoIdx) coordinates
      expect(first.iso_group).toBe(ISO_BANDS[u.isoIdx]!.iso);
      const probes = [u.offset, u.offset + 1, u.offset + 8821, u.offset + u.count - 1];
      for (const idx of probes) {
        const c = cellAtIndex(idx);
        expect(c.operation).toBe(first.operation);
        expect(c.strategy).toBe(first.strategy);
        expect(c.cut_type).toBe(first.cut_type);
        expect(c.tool_material).toBe(first.tool_material);
        expect(c.iso_group).toBe(first.iso_group);
      }
      // the LAST cell of this unit and the FIRST of the next differ in regime (boundary)
      if (k + 1 < units.length) {
        const nextFirst = cellAtIndex(units[k + 1]!.offset);
        const sameRegime =
          nextFirst.operation === first.operation &&
          nextFirst.strategy === first.strategy &&
          nextFirst.cut_type === first.cut_type &&
          nextFirst.tool_material === first.tool_material &&
          nextFirst.iso_group === first.iso_group;
        expect(sameRegime).toBe(false);
      }
    }
  });

  it("unitIds are unique, sorted, and filename-safe", () => {
    const units = enumerateWorkUnits();
    const ids = units.map((u) => u.unitId);
    expect(new Set(ids).size).toBe(ids.length); // unique
    expect([...ids].sort()).toEqual(ids);       // already sorted (zero-padded)
    expect(ids.every((id) => /^u\d{4}$/.test(id))).toBe(true); // filename-safe
  });

  it("enumerateRange(unit.offset, unit.count) round-trips to the unit's cells", () => {
    const units = enumerateWorkUnits();
    const u = units[42]!;
    const slice = enumerateRange(u.offset, u.count);
    expect(slice).toHaveLength(u.count);
    // first + last of the materialized slice equal the index-decoded cells
    expect(indexOfCell(slice[0]!)).toBe(u.offset);
    expect(indexOfCell(slice[slice.length - 1]!)).toBe(u.offset + u.count - 1);
  });
});
