/**
 * Tests for the SFC full live-axis enumerator (SFC-DEEP-TEST-FULLSPACE-PLAN, Stage 1).
 *
 * Verifies the index<->cell BIJECTION, the partition invariants (no gap/overlap, sum), the overlay
 * decomposition (72 = 8x3x3, goal-fastest order), and fail-loud range guards. These are the accounting
 * guarantees the billions-scale streaming scan relies on -- a silent index wrap or a partition gap would
 * make a worker miss or double-count cells.
 */
import { describe, it, expect } from "vitest";
import {
  SFC_FULL_SPACE_SIZE as BASE_SPACE_SIZE,
  cellAtIndex as baseCellAtIndex,
} from "./sfc-combinatorial-enumerator.js";
import {
  SFC_FULLSPACE_SIZE,
  FULLSPACE_OVERLAY_COUNT,
  FULLSPACE_OVERLAY_BLOCK,
  COATING_SWEEP,
  RIGIDITY_SWEEP,
  GOAL_SWEEP,
  GOAL_IDX,
  fullCellAtIndex,
  indexOfFullCell,
  enumerateFactorOverlays,
  enumerateFullRange,
  partitionFullSpace,
  type FullCell,
} from "./sfc-fullspace-enumerator.js";

describe("SFC fullspace enumerator -- axes", () => {
  it("coating axis is the 8 canonical PVD coatings (drift-proof, from CoatingVcModifier)", () => {
    expect(COATING_SWEEP).toEqual([
      "UNCOATED", "TIN", "TICN", "TIALN", "ALTIN", "ALCRN", "DLC", "DIAMOND",
    ]);
  });

  it("rigidity axis is low/medium/high (from constants)", () => {
    expect(RIGIDITY_SWEEP).toEqual(["low", "medium", "high"]);
  });

  it("goal axis maps the 3 distinct optimize_for regimes to goalIdx 0/1/2", () => {
    expect(GOAL_SWEEP).toEqual(["tool_life", "balanced", "productivity"]);
    expect(GOAL_IDX).toEqual([0, 1, 2]);
  });
});

describe("SFC fullspace enumerator -- size accounting", () => {
  it("overlay count = coating x rigidity x goal = 72", () => {
    expect(FULLSPACE_OVERLAY_COUNT).toBe(COATING_SWEEP.length * RIGIDITY_SWEEP.length * GOAL_SWEEP.length);
    expect(FULLSPACE_OVERLAY_COUNT).toBe(72);
  });

  it("overlay block = the whole base grid", () => {
    expect(FULLSPACE_OVERLAY_BLOCK).toBe(BASE_SPACE_SIZE);
  });

  it("full space = base x 72 = 1,463,132,160 (pins the 20,321,280 base; flags any base regression)", () => {
    expect(SFC_FULLSPACE_SIZE).toBe(BASE_SPACE_SIZE * FULLSPACE_OVERLAY_COUNT);
    expect(SFC_FULLSPACE_SIZE).toBe(1_463_132_160);
    expect(SFC_FULLSPACE_SIZE).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

describe("SFC fullspace enumerator -- bijection", () => {
  // Sample boundary + interior indices spanning multiple overlay blocks.
  const sample = [
    0,
    1,
    BASE_SPACE_SIZE - 1,
    BASE_SPACE_SIZE, // first cell of overlay 1
    BASE_SPACE_SIZE + 1,
    2 * BASE_SPACE_SIZE, // overlay 2
    3 * BASE_SPACE_SIZE, // overlay 3 = coating0/rigidity1(medium)/goal0 -- exercises the middle rigidity digit
    Math.floor(SFC_FULLSPACE_SIZE / 2),
    SFC_FULLSPACE_SIZE - 1, // last cell (overlay 71)
  ];

  // NOTE: this round-trip ALONE is not a radix-order oracle (a swapped coating<->rigidity significance
  // self-cancels because encode + decode share the order). The ACTUAL order oracles are the explicit
  // anchor tests below ("overlay digit varies goal fastest", "last cell", "blockOffset aligns") -- do
  // NOT delete those thinking this round-trip covers digit order.
  it("fullCellAtIndex and indexOfFullCell are exact inverses (both directions)", () => {
    for (const i of sample) {
      const cell = fullCellAtIndex(i);
      expect(indexOfFullCell(cell)).toBe(i); // decode -> encode
      expect(fullCellAtIndex(indexOfFullCell(cell))).toEqual(cell); // encode -> decode (independent cell)
    }
  });

  it("the base part of fullCellAtIndex matches the base enumerator", () => {
    for (const i of sample) {
      const cell = fullCellAtIndex(i);
      const base = baseCellAtIndex(i % BASE_SPACE_SIZE);
      expect(cell.operation).toBe(base.operation);
      expect(cell.iso_group).toBe(base.iso_group);
      expect(cell.diameter_mm).toBe(base.diameter_mm);
      expect(cell.coolant).toBe(base.coolant);
    }
  });

  it("cell 0 = base cell 0 with the first overlay (coating0/rigidity0/goal0)", () => {
    const c = fullCellAtIndex(0);
    expect(c.tool_coating).toBe(COATING_SWEEP[0]);
    expect(c.machine_rigidity).toBe(RIGIDITY_SWEEP[0]);
    expect(c.optimize_for).toBe(GOAL_SWEEP[0]);
    expect(c.goal_idx).toBe(GOAL_IDX[0]);
  });

  it("overlay digit varies goal fastest: cell at BASE_SPACE_SIZE has goal index 1, same base cell", () => {
    const c0 = fullCellAtIndex(0);
    const c1 = fullCellAtIndex(BASE_SPACE_SIZE);
    expect(c1.optimize_for).toBe(GOAL_SWEEP[1]); // goal advanced
    expect(c1.machine_rigidity).toBe(RIGIDITY_SWEEP[0]); // rigidity unchanged
    expect(c1.tool_coating).toBe(COATING_SWEEP[0]); // coating unchanged
    expect(c1.operation).toBe(c0.operation); // SAME base cell
    expect(c1.diameter_mm).toBe(c0.diameter_mm);
  });

  it("the last cell is overlay 71 = (coating7, rigidity2, goal2) on base cell (BASE-1)", () => {
    const c = fullCellAtIndex(SFC_FULLSPACE_SIZE - 1);
    expect(c.tool_coating).toBe(COATING_SWEEP[COATING_SWEEP.length - 1]);
    expect(c.machine_rigidity).toBe(RIGIDITY_SWEEP[RIGIDITY_SWEEP.length - 1]);
    expect(c.optimize_for).toBe(GOAL_SWEEP[GOAL_SWEEP.length - 1]);
    const base = baseCellAtIndex(BASE_SPACE_SIZE - 1);
    expect(c.operation).toBe(base.operation);
  });

  it("fullCellAtIndex throws fail-loud on out-of-range / non-integer", () => {
    expect(() => fullCellAtIndex(-1)).toThrow(RangeError);
    expect(() => fullCellAtIndex(SFC_FULLSPACE_SIZE)).toThrow(RangeError);
    expect(() => fullCellAtIndex(1.5)).toThrow(RangeError);
    expect(() => fullCellAtIndex(NaN)).toThrow(RangeError);
  });

  it("indexOfFullCell returns -1 for an off-grid component (unknown coating)", () => {
    const valid = fullCellAtIndex(123_456);
    const bad: FullCell = { ...valid, tool_coating: "NOTACOATING" };
    expect(indexOfFullCell(bad)).toBe(-1);
  });

  it("indexOfFullCell returns -1 for an off-grid rigidity/goal", () => {
    const valid = fullCellAtIndex(7);
    expect(indexOfFullCell({ ...valid, machine_rigidity: "ultra" as never })).toBe(-1);
    expect(indexOfFullCell({ ...valid, optimize_for: "nonsense" as never })).toBe(-1);
  });
});

describe("SFC fullspace enumerator -- factor overlays", () => {
  it("enumerates exactly 72 distinct overlays covering the full coating x rigidity x goal product", () => {
    const overlays = enumerateFactorOverlays();
    expect(overlays).toHaveLength(72);
    const keys = new Set(overlays.map(o => `${o.tool_coating}|${o.machine_rigidity}|${o.optimize_for}`));
    expect(keys.size).toBe(72); // all distinct
    // every (coating, rigidity, goal) triple present
    for (const c of COATING_SWEEP) {
      for (const r of RIGIDITY_SWEEP) {
        for (const g of GOAL_SWEEP) {
          expect(keys.has(`${c}|${r}|${g}`)).toBe(true);
        }
      }
    }
  });

  it("overlay blockOffset = overlayIdx * BASE_SPACE_SIZE and aligns with fullCellAtIndex", () => {
    const overlays = enumerateFactorOverlays();
    for (const o of overlays) {
      expect(o.blockOffset).toBe(o.overlayIdx * BASE_SPACE_SIZE);
      // the first cell of an overlay block carries that overlay's axes + base cell 0
      const c = fullCellAtIndex(o.blockOffset);
      expect(c.tool_coating).toBe(o.tool_coating);
      expect(c.machine_rigidity).toBe(o.machine_rigidity);
      expect(c.optimize_for).toBe(o.optimize_for);
      expect(c.goal_idx).toBe(o.goal_idx);
    }
  });
});

describe("SFC fullspace enumerator -- partition", () => {
  for (const chunks of [1, 7, 72, 1000]) {
    it(`partitionFullSpace(${chunks}) covers the space with no gap/overlap and exact sum`, () => {
      const parts = partitionFullSpace(chunks);
      expect(parts.length).toBe(Math.min(chunks, SFC_FULLSPACE_SIZE));
      let cursor = 0;
      let total = 0;
      for (const p of parts) {
        expect(p.offset).toBe(cursor); // contiguous, no gap/overlap
        expect(p.count).toBeGreaterThan(0);
        cursor += p.count;
        total += p.count;
      }
      expect(total).toBe(SFC_FULLSPACE_SIZE);
      expect(cursor).toBe(SFC_FULLSPACE_SIZE);
    });
  }

  it("partition counts differ by at most 1 (near-equal load balance)", () => {
    const parts = partitionFullSpace(7);
    const counts = parts.map(p => p.count);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

describe("SFC fullspace enumerator -- enumerateFullRange (small slices only)", () => {
  it("materializes a small contiguous slice correctly", () => {
    const slice = enumerateFullRange(BASE_SPACE_SIZE - 2, 4);
    expect(slice).toHaveLength(4);
    expect(indexOfFullCell(slice[0]!)).toBe(BASE_SPACE_SIZE - 2);
    expect(indexOfFullCell(slice[3]!)).toBe(BASE_SPACE_SIZE + 1);
    // crosses an overlay boundary: slice[1] is last of overlay0, slice[2] first of overlay1
    expect(slice[1]!.optimize_for).toBe(GOAL_SWEEP[0]);
    expect(slice[2]!.optimize_for).toBe(GOAL_SWEEP[1]);
  });

  it("returns [] for non-positive count and clamps at the end", () => {
    expect(enumerateFullRange(0, 0)).toEqual([]);
    expect(enumerateFullRange(0, -5)).toEqual([]);
    expect(enumerateFullRange(SFC_FULLSPACE_SIZE - 2, 10)).toHaveLength(2); // clamped
  });

  it("throws on a negative / non-integer offset", () => {
    expect(() => enumerateFullRange(-1, 1)).toThrow(RangeError);
    expect(() => enumerateFullRange(1.5, 1)).toThrow(RangeError);
  });
});
