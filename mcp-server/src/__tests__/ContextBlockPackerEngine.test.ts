/**
 * ContextBlockPackerEngine tests — HMEMV07.  Asserts exact arithmetic on
 * used/remaining tokens, greedy priority-DESC selection, required-block
 * overflow semantics.
 */
import { describe, it, expect } from "vitest";
import {
  ContextBlockPackerEngine,
  type ContextBlock,
} from "../engines/ContextBlockPackerEngine.js";

const blk = (
  id: string, tokens: number, priority: number, required = false,
): ContextBlock => ({ block_id: id, kind: "test", tokens, priority, required });

describe("ContextBlockPackerEngine.plan — happy path arithmetic", () => {
  it("fits all 3 blocks under budget: used=600, remaining=400, no overflow", () => {
    const p = ContextBlockPackerEngine.plan(
      [blk("a", 200, 10), blk("b", 300, 5), blk("c", 100, 1)], 1000,
    );
    expect(p.used_tokens).toBe(600);
    expect(p.remaining_tokens).toBe(400);
    expect(p.kept).toHaveLength(3);
    expect(p.dropped).toHaveLength(0);
    expect(p.overflow).toBe(false);
  });

  it("drops lowest-priority block when budget tight", () => {
    const p = ContextBlockPackerEngine.plan(
      [blk("hi", 600, 10), blk("mid", 300, 5), blk("lo", 200, 1)], 1000,
    );
    expect(p.used_tokens).toBe(900);
    expect(p.kept.map((b) => b.block_id).sort()).toEqual(["hi", "mid"]);
    expect(p.dropped.map((b) => b.block_id)).toEqual(["lo"]);
  });

  it("includes required block even when exceeds budget (overflow=true)", () => {
    const p = ContextBlockPackerEngine.plan([blk("must", 2000, 1, true)], 1000);
    expect(p.kept.map((b) => b.block_id)).toEqual(["must"]);
    expect(p.used_tokens).toBe(2000);
    expect(p.remaining_tokens).toBe(0);
    expect(p.overflow).toBe(true);
  });

  it("selects in priority DESC order (greedy)", () => {
    const p = ContextBlockPackerEngine.plan([
      blk("p1", 400, 1), blk("p5", 400, 5), blk("p3", 400, 3),
    ], 1000);
    // Budget 1000, each 400 → fits 2: highest 2 priorities = p5 + p3.
    const keptIds = p.kept.map((b) => b.block_id).sort();
    expect(keptIds).toEqual(["p3", "p5"]);
    expect(p.dropped.map((b) => b.block_id)).toEqual(["p1"]);
  });
});

describe("ContextBlockPackerEngine — failure modes", () => {
  it("rejects negative budget (adversarial)", () => {
    expect(() => ContextBlockPackerEngine.plan([], -1)).toThrow(/budget/);
  });

  it("rejects NaN budget (adversarial)", () => {
    expect(() => ContextBlockPackerEngine.plan([], NaN)).toThrow(/budget/);
  });

  it("rejects non-array blocks (failure mode)", () => {
    expect(() => ContextBlockPackerEngine.plan(null as never, 1000)).toThrow(/array/);
  });

  it("empty blocks → all-empty plan", () => {
    const p = ContextBlockPackerEngine.plan([], 1000);
    expect(p.used_tokens).toBe(0);
    expect(p.remaining_tokens).toBe(1000);
    expect(p.kept).toEqual([]);
    expect(p.overflow).toBe(false);
  });
});

describe("ContextBlockPackerEngine.renderPlan", () => {
  it("emits OK status when no overflow", () => {
    const p = ContextBlockPackerEngine.plan([blk("a", 100, 5)], 1000);
    expect(ContextBlockPackerEngine.renderPlan(p).includes("[PACK OK]")).toBe(true);
  });

  it("emits OVERFLOW when required blocks exceed budget", () => {
    const p = ContextBlockPackerEngine.plan([blk("must", 2000, 1, true)], 1000);
    expect(ContextBlockPackerEngine.renderPlan(p).includes("[PACK OVERFLOW]")).toBe(true);
  });
});
