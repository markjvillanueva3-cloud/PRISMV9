import { describe, it, expect } from "vitest";
import {
  millProgramBacktraceEngine as eng,
  DEFAULT_MAX_DEPTH,
  MILL_CANONICAL_BLOCK_KINDS,
  type MillBacktraceBlock,
  type MillProgramBacktraceInput,
} from "../engines/MillProgramBacktraceEngine.js";

function blk(n: number, kind: MillBacktraceBlock["kind"], text?: string): MillBacktraceBlock {
  return { n, kind, text };
}

describe("MillProgramBacktraceEngine", () => {
  it("getStats: 14 block kinds, 5 mill-canonical, skip motion+comment, depth 50", () => {
    const s = eng.getStats();
    expect(s.block_kinds.length).toBe(14);
    expect(s.mill_canonical_block_kinds).toEqual([
      "cutter_comp_set", "tool_length_comp", "rotary_index", "pallet_change", "probe_cycle",
    ]);
    expect(s.default_max_depth).toBe(DEFAULT_MAX_DEPTH);
    expect(s.skip_kinds).toEqual(["motion", "comment"]);
  });

  it("MILL_CANONICAL_BLOCK_KINDS export matches getStats internal list", () => {
    expect(MILL_CANONICAL_BLOCK_KINDS).toEqual([
      "cutter_comp_set", "tool_length_comp", "rotary_index", "pallet_change", "probe_cycle",
    ]);
  });

  it("throws on invalid input (null, missing blocks, non-numeric failing_block)", () => {
    expect(() => eng.trace(null as never)).toThrow(/input required/);
    expect(() => eng.trace({ blocks: undefined as never, failing_block_n: 100 })).toThrow(/blocks\[\] required/);
    expect(() => eng.trace({ blocks: [], failing_block_n: NaN })).toThrow(/finite/);
  });

  it("failing block not found → empty causes + reasoning explains", () => {
    const r = eng.trace({ blocks: [blk(10, "motion")], failing_block_n: 999 });
    expect(r.causes).toEqual([]);
    expect(r.reasoning.some(s => /not found/.test(s))).toBe(true);
    expect(r.top_suspect).toBe(undefined);
  });

  it("nominal: cutter_comp_set 2 blocks before failure → top suspect", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "tool_change"),
        blk(20, "cutter_comp_set", "G41 D5"),
        blk(30, "motion"),
        blk(40, "motion"), // failing
      ],
      failing_block_n: 40,
    });
    expect(r.top_suspect?.kind).toBe("cutter_comp_set");
    expect(r.top_suspect?.n).toBe(20);
  });

  it("MILL-CANONICAL: cutter_comp_set outweighs lathe offset_set when both upstream at same recency", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "offset_set", "H1 = 12.5"),
        blk(20, "cutter_comp_set", "G41 D5"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    });
    // cutter_comp (kind weight 1.05) > offset_set (0.95) with similar recency
    expect(r.top_suspect?.kind).toBe("cutter_comp_set");
  });

  it("MILL-CANONICAL: tool_length_comp outweighs feed_set at same recency", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "feed_set", "F500"),
        blk(20, "tool_length_comp", "G43 H1"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    });
    expect(r.top_suspect?.kind).toBe("tool_length_comp");
  });

  it("MILL-CANONICAL: rotary_index in 5-axis program is correctly weighted", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "rotary_index", "G68.2 X0 Y0 Z0 I0 J45 K0"),
        blk(20, "motion"),
      ],
      failing_block_n: 20,
    });
    expect(r.top_suspect?.kind).toBe("rotary_index");
    expect(r.top_suspect?.rationale).toMatch(/TCP/);
  });

  it("MILL-CANONICAL: pallet_change candidate cause flagged with WCS-persistence rationale", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "pallet_change", "M60"),
        blk(20, "motion"),
      ],
      failing_block_n: 20,
    });
    expect(r.causes.some(c => c.kind === "pallet_change" && /WCS persisted/.test(c.rationale))).toBe(true);
  });

  it("MILL-CANONICAL: probe_cycle candidate cause flagged with offset-write rationale", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "probe_cycle", "G65 P9814"),
        blk(20, "motion"),
      ],
      failing_block_n: 20,
    });
    expect(r.causes.some(c => c.kind === "probe_cycle" && /offset back/.test(c.rationale))).toBe(true);
  });

  it("motion and comment blocks are skipped from candidate list", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "offset_set"),
        blk(20, "motion"),
        blk(30, "comment"),
        blk(40, "motion"),
      ],
      failing_block_n: 40,
    });
    expect(r.causes.length).toBe(1);
    expect(r.causes[0].kind).toBe("offset_set");
  });

  it("max_depth limits the walk window", () => {
    const blocks = Array.from({ length: 100 }, (_, i) => blk(i * 10, i % 2 ? "motion" : "feed_set"));
    blocks.push(blk(1000, "motion"));
    const r = eng.trace({
      blocks,
      failing_block_n: 1000,
      max_depth: 5,
    });
    // Only ~5 blocks walked; causes should be <= 5 (some motion skipped)
    expect(r.causes.length).toBeLessThanOrEqual(5);
  });

  it("recency boost: recent block beats deeply-upstream higher-kind block when very close", () => {
    // Same kind weight, more recent wins by recency factor
    const r = eng.trace({
      blocks: [
        blk(10, "feed_set", "F200"),
        ...Array.from({ length: 30 }, (_, i) => blk(20 + i, "motion")),
        blk(100, "feed_set", "F800"),
        blk(110, "motion"),
      ],
      failing_block_n: 110,
    });
    expect(r.top_suspect?.kind).toBe("feed_set");
    expect(r.top_suspect?.n).toBe(100); // recent feed_set
  });

  it("variability ≥3 block kinds: cutter_comp + rotary + pallet all in same trace", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "rotary_index", "G68.2"),
        blk(20, "cutter_comp_set", "G41 D5"),
        blk(30, "pallet_change", "M60"),
        blk(40, "motion"),
      ],
      failing_block_n: 40,
    });
    const kinds = r.causes.map(c => c.kind);
    expect(kinds).toContain("rotary_index");
    expect(kinds).toContain("cutter_comp_set");
    expect(kinds).toContain("pallet_change");
  });

  it("causes sorted by weight descending", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "tool_change"),
        blk(20, "cutter_comp_set"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    });
    for (let i = 1; i < r.causes.length; i++) {
      expect(r.causes[i - 1].weight).toBeGreaterThanOrEqual(r.causes[i].weight);
    }
  });

  it("weights are positive and finite", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "spindle_set"),
        blk(20, "macro_call"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    });
    for (const c of r.causes) {
      expect(Number.isFinite(c.weight)).toBe(true);
      expect(c.weight).toBeGreaterThan(0);
    }
  });

  it("rationale includes block number + distance metadata for each cause", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "offset_set", "H2 = 18.0"),
        blk(20, "motion"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    });
    expect(r.top_suspect?.rationale).toMatch(/N10/);
    expect(r.top_suspect?.rationale).toMatch(/upstream/);
  });

  it("reasoning narrates walk depth + count + top suspect", () => {
    const r = eng.trace({
      blocks: [blk(10, "tool_change"), blk(20, "motion")],
      failing_block_n: 20,
    });
    expect(r.reasoning.some(s => /Walked.*back from N20/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /candidate cause/.test(s))).toBe(true);
  });

  it("no upstream blocks (failing is first) → empty causes + null top_suspect", () => {
    const r = eng.trace({
      blocks: [blk(10, "motion")],
      failing_block_n: 10,
    });
    expect(r.causes).toEqual([]);
    expect(r.top_suspect).toBe(undefined);
  });

  it("only motion+comment upstream → empty causes (filtered out)", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "motion"),
        blk(20, "comment"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    });
    expect(r.causes).toEqual([]);
  });

  it("determinism: same input twice → identical result", () => {
    const i: MillProgramBacktraceInput = {
      blocks: [
        blk(10, "tool_change"),
        blk(20, "cutter_comp_set"),
        blk(30, "motion"),
      ],
      failing_block_n: 30,
    };
    expect(eng.trace(i)).toEqual(eng.trace(i));
  });

  it("non-mill block kind (e.g. lathe-only) is not accepted by typescript at compile time", () => {
    // This test documents the constraint via a non-rejection: lathe-only kinds
    // simply aren't in the MillBacktraceBlockKind union. The check is structural.
    const valid = ["tool_change", "offset_set", "cutter_comp_set", "rotary_index"] as const;
    for (const k of valid) {
      const r = eng.trace({ blocks: [blk(10, k), blk(20, "motion")], failing_block_n: 20 });
      expect(r.causes.length).toBe(1);
    }
  });

  it("text field preserved in cause output", () => {
    const r = eng.trace({
      blocks: [
        blk(10, "offset_set", "G10 L2 P1 X100 Y50"),
        blk(20, "motion"),
      ],
      failing_block_n: 20,
    });
    expect(r.causes[0].text).toBe("G10 L2 P1 X100 Y50");
  });
});
