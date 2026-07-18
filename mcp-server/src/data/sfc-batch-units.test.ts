/**
 * Tests for the SFC batch WORK-UNIT layer (U-FT-03, SFC-FULLTUNE-BUILDOUT).
 *
 * The load-bearing properties (R9 -- verify intent):
 *  - the 1,152 units PARTITION the full 20,321,280-cell space exactly: union ==
 *    SIZE, contiguous, zero gap, zero overlap (the coordinator must sweep every
 *    cell once, never twice);
 *  - each unit is REGIME-ALIGNED: every one of its 17,640 cells shares the same
 *    (operation, strategy, cut_type, tool_material, iso_group) -- the property
 *    the per-(iso,op) reducer (U-FT-06) relies on to fold shard-by-shard;
 *  - unitId <-> (validCellIdx, isoIdx) is a clean bijection;
 *  - cells come straight from the enumerator (no drift, no re-grouping);
 *  - fail-loud bounds on every id/coord/index entry point.
 */
import { describe, it, expect } from "vitest";
import {
  ISO_COUNT,
  UNIT_COUNT,
  CELLS_PER_UNIT,
  unitIdFor,
  unitRange,
  unitIdOfIndex,
  describeUnit,
  enumerateUnits,
  cellsForUnit,
  representativeCell,
} from "./sfc-batch-units.js";
import { SFC_FULL_SPACE_SIZE, cellAtIndex, enumerateRange } from "./sfc-combinatorial-enumerator.js";
import { enumerateValidCells } from "./sfc-combinatorial-validity.js";
import { ISO_BANDS } from "./sfc-combinatorial-axes.js";

const VALID = enumerateValidCells();

function sameRegime(a: { operation: string; strategy: string; cut_type: string; tool_material: string; iso_group: string },
                    b: { operation: string; strategy: string; cut_type: string; tool_material: string; iso_group: string }): boolean {
  return a.operation === b.operation && a.strategy === b.strategy && a.cut_type === b.cut_type &&
    a.tool_material === b.tool_material && a.iso_group === b.iso_group;
}

describe("sfc-batch-units (U-FT-03)", () => {
  // ---- T1 (happy): the constants are the validity-aware partition ----
  it("UNIT_COUNT = validCells x ISO, CELLS_PER_UNIT x UNIT_COUNT = full space", () => {
    expect(ISO_COUNT).toBe(ISO_BANDS.length);
    expect(ISO_COUNT).toBe(6);
    expect(UNIT_COUNT).toBe(VALID.length * ISO_COUNT);
    expect(UNIT_COUNT).toBe(1152); // 192 x 6
    expect(CELLS_PER_UNIT).toBe(17_640); // 10 x 7 x 6 x 6 x 7 (continuous axes / 6 ISO? no -- per-ISO already a digit)
    expect(CELLS_PER_UNIT * UNIT_COUNT).toBe(SFC_FULL_SPACE_SIZE);
    expect(CELLS_PER_UNIT * UNIT_COUNT).toBe(20_321_280);
  });

  // ---- T2 (happy): unitId <-> (validCellIdx, isoIdx) bijection ----
  it("unitIdFor composes and describeUnit decodes the same coordinates", () => {
    for (const [vci, isoIdx] of [[0, 0], [0, 5], [1, 0], [191, 5], [97, 3]] as const) {
      const unitId = unitIdFor(vci, isoIdx);
      expect(unitId).toBe(vci * ISO_COUNT + isoIdx);
      const d = describeUnit(unitId);
      expect(d.validCellIdx).toBe(vci);
      expect(d.isoIdx).toBe(isoIdx);
      expect(d.unitId).toBe(unitId);
      expect(d.isoGroup).toBe(ISO_BANDS[isoIdx]!.iso);
      expect(d.validCell).toEqual(VALID[vci]);
      expect(d.count).toBe(CELLS_PER_UNIT);
      expect(d.offset).toBe(unitId * CELLS_PER_UNIT);
    }
  });

  // ---- T3 (the coverage proof): units partition [0, SIZE) exactly ----
  it("unitRange over all units is contiguous + complete, zero gap/overlap", () => {
    const units = enumerateUnits();
    expect(units).toHaveLength(UNIT_COUNT);
    let cursor = 0;
    let sum = 0;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]!;
      expect(u.unitId).toBe(i); // id order
      expect(u.offset).toBe(cursor); // contiguous: starts where the last ended
      expect(u.count).toBe(CELLS_PER_UNIT);
      cursor += u.count;
      sum += u.count;
    }
    expect(sum).toBe(SFC_FULL_SPACE_SIZE); // complete
    expect(cursor).toBe(SFC_FULL_SPACE_SIZE); // ends exactly at SIZE
  });

  // ---- T4 (the regime-alignment invariant): every cell in a unit shares one regime ----
  it("cellsForUnit emits exactly CELLS_PER_UNIT cells, all of one (op-combo, ISO) regime", () => {
    // Probe units at the boundaries + interior; scan EACH fully (17,640 cells is cheap).
    for (const unitId of [0, 1, 6, 7, UNIT_COUNT - 1, Math.floor(UNIT_COUNT / 2)]) {
      const d = describeUnit(unitId);
      const cells = cellsForUnit(unitId);
      expect(cells).toHaveLength(CELLS_PER_UNIT);
      const regime = {
        operation: d.validCell.operation,
        strategy: d.validCell.strategy,
        cut_type: d.validCell.cut_type,
        tool_material: d.validCell.tool_material,
        iso_group: d.isoGroup,
      };
      for (const c of cells) {
        expect(sameRegime(c, regime)).toBe(true);
      }
    }
  });

  // ---- T5: unitIdOfIndex is the floor-division inverse and lands the index inside the unit ----
  it("unitIdOfIndex(flatIndex) returns the owning unit, whose range contains the index", () => {
    const probes = [0, 17_639, 17_640, 17_641, SFC_FULL_SPACE_SIZE - 1,
      Math.floor(SFC_FULL_SPACE_SIZE / 3), 9_999_983];
    for (const idx of probes) {
      const unitId = unitIdOfIndex(idx);
      expect(unitId).toBe(Math.floor(idx / CELLS_PER_UNIT));
      const { offset, count } = unitRange(unitId);
      expect(idx).toBeGreaterThanOrEqual(offset);
      expect(idx).toBeLessThan(offset + count);
    }
  });

  // ---- T6 (adversarial + failure): fail-loud bounds on every entry point ----
  it("throws (fail-loud) on out-of-range / non-integer ids, coords, indices", () => {
    for (const bad of [-1, UNIT_COUNT, UNIT_COUNT + 1, 1.5, NaN, Infinity]) {
      expect(() => describeUnit(bad)).toThrow(RangeError);
      expect(() => unitRange(bad)).toThrow(RangeError);
      expect(() => cellsForUnit(bad)).toThrow(RangeError);
      expect(() => representativeCell(bad)).toThrow(RangeError);
    }
    expect(() => unitIdFor(-1, 0)).toThrow(RangeError);
    expect(() => unitIdFor(VALID.length, 0)).toThrow(RangeError);
    expect(() => unitIdFor(0, ISO_COUNT)).toThrow(RangeError);
    expect(() => unitIdFor(0, -1)).toThrow(RangeError);
    expect(() => unitIdFor(1.5, 0)).toThrow(RangeError);
    for (const bad of [-1, SFC_FULL_SPACE_SIZE, 1.5, NaN]) {
      expect(() => unitIdOfIndex(bad)).toThrow(RangeError);
    }
  });

  // ---- T7: cellsForUnit is exactly the enumerator slice (no drift) + boundary adjacency ----
  it("cellsForUnit == enumerateRange(offset,count); adjacent units are enumerator-contiguous", () => {
    const unitId = 3; // arbitrary interior unit
    const { offset, count } = unitRange(unitId);
    const cells = cellsForUnit(unitId);
    const direct = enumerateRange(offset, count);
    expect(cells).toHaveLength(direct.length);
    expect(cells[0]).toEqual(direct[0]);
    expect(cells[count - 1]).toEqual(direct[count - 1]);
    expect(cells[0]).toEqual(cellAtIndex(offset));
    expect(cells[count - 1]).toEqual(cellAtIndex(offset + count - 1));
    // last cell of unit u and first cell of unit u+1 are enumerator-adjacent (no gap)
    const lastOfU = cellAtIndex(offset + count - 1);
    const firstOfNext = cellAtIndex(offset + count);
    expect(lastOfU).toEqual(cellsForUnit(unitId)[count - 1]);
    expect(firstOfNext).toEqual(cellsForUnit(unitId + 1)[0]);
  });

  // ---- T8: representativeCell is the cheap first-cell probe ----
  it("representativeCell(unitId) equals cellsForUnit(unitId)[0]", () => {
    for (const unitId of [0, 42, UNIT_COUNT - 1]) {
      expect(representativeCell(unitId)).toEqual(cellsForUnit(unitId)[0]);
    }
  });

  // ---- T9 (no-leak across the whole unit list): every unit's representative is a real regime ----
  it("every unit's representative cell matches its descriptor regime (all 1,152)", () => {
    for (const u of enumerateUnits()) {
      const rep = representativeCell(u.unitId);
      expect(rep.operation).toBe(u.validCell.operation);
      expect(rep.strategy).toBe(u.validCell.strategy);
      expect(rep.cut_type).toBe(u.validCell.cut_type);
      expect(rep.tool_material).toBe(u.validCell.tool_material);
      expect(rep.iso_group).toBe(u.isoGroup);
    }
  });
});
