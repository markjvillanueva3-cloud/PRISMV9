/**
 * Tests for PSNAutonomyLoopEngine — Primitives 2-5 of the PSN self-learning loop.
 *
 * Real-math assertions (no toBeDefined() stubs per CLAUDE.md §SAFETY).
 *
 * Author: charlie slot (claude-451f7328) /goal-9 iter3, 2026-05-23.
 */

import { describe, it, expect } from "vitest";
import { PSNAutonomyLoopEngine, SignalEvent } from "../engines/PSNAutonomyLoopEngine.js";

const eng = new PSNAutonomyLoopEngine();

describe("PSNAutonomyLoopEngine.scoreEvent (Primitive #2)", () => {
  it("scrutiny_outcome passed → reward 0.35", () => {
    const r = eng.scoreEvent({ type: "scrutiny_outcome", ts: "2026-05-23T00:00:00Z", passed: true } as SignalEvent);
    expect(r.reward).toBeCloseTo(0.35, 5);
    expect(r.signals_considered).toBe(1);
  });
  it("scrutiny_outcome failed → reward 0", () => {
    const r = eng.scoreEvent({ type: "scrutiny_outcome", ts: "2026-05-23T00:00:00Z", passed: false } as SignalEvent);
    expect(r.reward).toBe(0);
  });
  it("unit_shipped → reward 0.30", () => {
    const r = eng.scoreEvent({ type: "unit_shipped", ts: "x" } as SignalEvent);
    expect(r.reward).toBeCloseTo(0.30, 5);
  });
  it("scoped_commit → reward 0.10", () => {
    const r = eng.scoreEvent({ type: "scoped_commit", ts: "x" } as SignalEvent);
    expect(r.reward).toBeCloseTo(0.10, 5);
  });
  it("clamps to [0,1] for non-psi events", () => {
    const r = eng.scoreEvent({ type: "scrutiny_outcome", ts: "x", passed: true } as SignalEvent);
    expect(r.reward).toBeLessThanOrEqual(1);
    expect(r.reward).toBeGreaterThanOrEqual(0);
  });
  // U-SVI-E02 — ΔΨ reward synergy
  it("psi_delta positive → reward = delta × 10 (default scale)", () => {
    const r = eng.scoreEvent({ type: "psi_delta", ts: "x", delta: 0.01 } as SignalEvent);
    expect(r.reward).toBeCloseTo(0.10, 5);
    expect(r.components.psi_delta).toBeCloseTo(0.10, 5);
  });
  it("psi_delta negative → reward becomes penalty (clamped at -1)", () => {
    const r = eng.scoreEvent({ type: "psi_delta", ts: "x", delta: -0.05 } as SignalEvent);
    expect(r.reward).toBeCloseTo(-0.50, 5);
  });
  it("psi_delta clamps to [-1, 1] on huge deltas", () => {
    const big = eng.scoreEvent({ type: "psi_delta", ts: "x", delta: 1.0 } as SignalEvent);
    expect(big.reward).toBe(1);
    const huge_neg = eng.scoreEvent({ type: "psi_delta", ts: "x", delta: -1.0 } as SignalEvent);
    expect(huge_neg.reward).toBe(-1);
  });
  it("psi_delta with missing/NaN delta → 0 reward (fail-soft)", () => {
    const r1 = eng.scoreEvent({ type: "psi_delta", ts: "x" } as SignalEvent);
    expect(r1.reward).toBe(0);
    const r2 = eng.scoreEvent({ type: "psi_delta", ts: "x", delta: NaN } as SignalEvent);
    expect(r2.reward).toBe(0);
  });
});

describe("PSNAutonomyLoopEngine.buildTrainerManifest (Primitive #3)", () => {
  it("aggregates per-slot mean reward", () => {
    const events: SignalEvent[] = [
      { type: "scrutiny_outcome", ts: "x", slot: "charlie", passed: true },
      { type: "unit_shipped",    ts: "x", slot: "charlie" },
      { type: "scoped_commit",   ts: "x", slot: "charlie" },
      { type: "scoped_commit",   ts: "x", slot: "alpha" },
    ];
    const m = eng.buildTrainerManifest(events);
    expect(m.window_events).toBe(4);
    const charlie = m.high_reward_slots.find((s) => s.slot === "charlie");
    expect(charlie?.n).toBe(3);
    // mean = (0.35 + 0.30 + 0.10) / 3 = 0.25
    expect(charlie?.mean_reward).toBeCloseTo(0.25, 5);
    const alpha = m.high_reward_slots.find((s) => s.slot === "alpha");
    expect(alpha?.mean_reward).toBeCloseTo(0.10, 5);
  });
  it("recommends only slots with mean_reward ≥ 0.20 AND n ≥ 3", () => {
    const events: SignalEvent[] = [
      { type: "scrutiny_outcome", ts: "x", slot: "charlie", passed: true },
      { type: "unit_shipped",    ts: "x", slot: "charlie" },
      { type: "scoped_commit",   ts: "x", slot: "charlie" },
      { type: "scoped_commit",   ts: "x", slot: "alpha" },
    ];
    const m = eng.buildTrainerManifest(events);
    expect(m.recommended_targets.map((r) => r.slot)).toEqual(["charlie"]);
  });
  it("ignores events without a slot", () => {
    const events: SignalEvent[] = [
      { type: "scoped_commit", ts: "x" },
      { type: "scoped_commit", ts: "x", slot: "delta" },
    ];
    const m = eng.buildTrainerManifest(events);
    expect(m.high_reward_slots.length).toBe(1);
    expect(m.high_reward_slots[0].slot).toBe("delta");
  });
});

describe("PSNAutonomyLoopEngine.shadowCompare (Primitive #4)", () => {
  it("returns {available:false} for < 10 pairs", () => {
    const r = eng.shadowCompare([{ old: 0.5, new: 0.6 }, { old: 0.4, new: 0.7 }]);
    expect(r.available).toBe(false);
    expect(r.reason).toMatch(/≥10 paired samples/);
  });
  it("promotes when new strictly dominates and p < 0.05", () => {
    const pairs = Array.from({ length: 12 }, (_, i) => ({ old: 0.5, new: 0.5 + 0.1 + i * 0.01 }));
    const r = eng.shadowCompare(pairs);
    expect(r.available).toBe(true);
    expect(r.n_pairs).toBe(12);
    expect(r.median_delta).toBeGreaterThan(0);
    expect(r.promote).toBe(true);
  });
  it("does NOT promote when new is worse", () => {
    const pairs = Array.from({ length: 12 }, (_, i) => ({ old: 0.5 + i * 0.01, new: 0.4 }));
    const r = eng.shadowCompare(pairs);
    expect(r.available).toBe(true);
    expect(r.median_delta).toBeLessThan(0);
    expect(r.promote).toBe(false);
  });
  it("does NOT promote when median delta is zero or mixed", () => {
    const pairs = Array.from({ length: 12 }, (_, i) => ({
      old: 0.5,
      new: 0.5 + (i % 2 === 0 ? 0.01 : -0.01),
    }));
    const r = eng.shadowCompare(pairs);
    expect(r.available).toBe(true);
    expect(r.promote).toBe(false);
  });
  it("filters out zero-difference pairs", () => {
    const pairs = [
      ...Array.from({ length: 8 }, () => ({ old: 0.5, new: 0.6 })),
      ...Array.from({ length: 4 }, () => ({ old: 0.5, new: 0.5 })),
    ];
    const r = eng.shadowCompare(pairs);
    expect(r.available).toBe(false);
  });
});

describe("PSNAutonomyLoopEngine.ewcRegularizeWeights (Primitive #5)", () => {
  it("computes L_reg = Σ (F_i/2)(θ_i − θ*_i)²", () => {
    const current = [1.0, 2.0];
    const reference = [0.5, 1.5];
    const fisher = [4.0, 2.0];
    const r = eng.ewcRegularizeWeights(current, reference, fisher);
    expect(r.regularization_term).toBeCloseTo(0.75, 5);
    expect(r.param_count).toBe(2);
    expect(r.per_param_contributions[0]).toBeCloseTo(0.5, 5);
    expect(r.per_param_contributions[1]).toBeCloseTo(0.25, 5);
  });
  it("returns 0 when weights match reference", () => {
    const r = eng.ewcRegularizeWeights([1.0, 2.0], [1.0, 2.0], [4.0, 4.0]);
    expect(r.regularization_term).toBe(0);
  });
  it("zero Fisher information → zero contribution from that parameter", () => {
    const r = eng.ewcRegularizeWeights([5.0, 5.0], [0.0, 0.0], [0.0, 1.0]);
    expect(r.per_param_contributions[0]).toBe(0);
    expect(r.per_param_contributions[1]).toBeCloseTo(12.5, 5);
  });
  it("throws on dimension mismatch", () => {
    expect(() => eng.ewcRegularizeWeights([1, 2], [1], [1, 1])).toThrow(/dimension mismatch/);
  });
  it("handles empty input (degenerate)", () => {
    const r = eng.ewcRegularizeWeights([], [], []);
    expect(r.regularization_term).toBe(0);
    expect(r.param_count).toBe(0);
  });
});
