/**
 * GroupRelativeRewardNormalizerEngine tests (ULTRACODE-SYNERGY-MS0 Order 3).
 * Reference-value GRPO checks + failure modes + adversarial inputs.
 * Run: npx vitest run src/__tests__/GroupRelativeRewardNormalizerEngine.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  GroupRelativeRewardNormalizerEngine as GRPO,
  groupRelativeRewardNormalizerEngine,
} from "../engines/GroupRelativeRewardNormalizerEngine.js";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;

describe("GroupRelativeRewardNormalizerEngine — GRPO group-relative advantage", () => {
  // ── HAPPY PATH: reference-value z-score over a 16-sample group ──
  it("z-scores a 16-sample group: mean≈0, std≈1, order preserved", () => {
    // 16 rewards (DeepSeek GRPO default group size). Use a known spread.
    const rewards = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6, 0.5, 0.0, 1.0, 0.45, 0.55, 0.35, 0.65, 0.25];
    const r = GRPO.normalizeGroup(rewards);
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("zscore");
    expect(r.stats.n).toBe(16);
    const adv = r.advantages.map((a) => a.advantage);
    // mean of advantages ≈ 0 (group-baseline subtraction)
    expect(Math.abs(mean(adv))).toBeLessThan(1e-9);
    // std of advantages ≈ 1 (divided by group std; ε makes it very slightly <1)
    const advStd = Math.sqrt(mean(adv.map((a) => (a - mean(adv)) ** 2)));
    expect(advStd).toBeGreaterThan(0.999);
    expect(advStd).toBeLessThanOrEqual(1.0);
    // order preservation: the max reward (1.0) gets the max advantage; min (0.0) the min.
    const maxIdx = rewards.indexOf(1.0);
    const minIdx = rewards.indexOf(0.0);
    expect(adv[maxIdx]).toBe(Math.max(...adv));
    expect(adv[minIdx]).toBe(Math.min(...adv));
  });

  it("advantages are returned in INPUT order (index preserved)", () => {
    const rewards = [5, 1, 3];
    const r = GRPO.normalizeGroup(rewards);
    expect(r.advantages.map((a) => a.index)).toEqual([0, 1, 2]);
    expect(r.advantages.map((a) => a.reward)).toEqual([5, 1, 3]);
    // reward 5 (idx0) is best → highest advantage; reward 1 (idx1) is worst → lowest
    expect(r.advantages[0].advantage).toBeGreaterThan(r.advantages[2].advantage);
    expect(r.advantages[2].advantage).toBeGreaterThan(r.advantages[1].advantage);
  });

  it("reference value: 2-element group {0,2} → advantages {-1,+1} (mean 0, std 1)", () => {
    // mean=1, population std=1, denom=1+ε → (0-1)/1≈-1, (2-1)/1≈+1
    const r = GRPO.normalizeGroup([0, 2]);
    expect(r.mode).toBe("zscore");
    expect(r.advantages[0].advantage).toBeCloseTo(-1, 6);
    expect(r.advantages[1].advantage).toBeCloseTo(1, 6);
  });

  it("advantages() convenience returns bare vector in order", () => {
    expect(GRPO.advantages([0, 2])[0]).toBeCloseTo(-1, 6);
    expect(GRPO.advantages([0, 2])[1]).toBeCloseTo(1, 6);
  });

  // ── FAILURE MODE 1: truly-constant group → all-zero, no NaN ──
  it("constant group (all identical) → all-zero advantages, no NaN", () => {
    const r = GRPO.normalizeGroup([7, 7, 7, 7]);
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("constant-zero");
    expect(r.advantages.every((a) => a.advantage === 0)).toBe(true);
    expect(r.advantages.every((a) => Number.isFinite(a.advantage))).toBe(true);
    expect(r.warning).toMatch(/identical/);
  });

  // ── FAILURE MODE 2: degenerate std (≈0 but ordered) → rank fallback, bounded ──
  it("near-degenerate std → rank-fallback to bounded [-1,1], no blowup", () => {
    // values differ only at the 1e-12 level → std below STD_FLOOR(EPS=1e-8) but max!=min
    const r = GRPO.normalizeGroup([1.0, 1.0 + 1e-12, 1.0 + 2e-12, 1.0 + 3e-12]);
    expect(r.mode).toBe("rank-fallback");
    const adv = r.advantages.map((a) => a.advantage);
    expect(Math.min(...adv)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...adv)).toBeLessThanOrEqual(1);
    // ordering preserved: largest input got the largest advantage
    expect(adv[3]).toBe(Math.max(...adv));
    expect(adv[0]).toBe(Math.min(...adv));
    // mean of evenly-spaced symmetric ranks ≈ 0
    expect(Math.abs(mean(adv))).toBeLessThan(1e-9);
  });

  it("std exactly at the EPS floor → rank-fallback owns the ε-dominated regime (no blowup)", () => {
    // scrutiny P2: STD_FLOOR pinned to EPS(1e-8) so a group whose std ≤ EPS routes to the
    // bounded rank-normalizer, never an ε-dominated z-score. Construct std ≈ 5e-9 (< EPS).
    const r = GRPO.normalizeGroup([1.0, 1.0 + 1e-8]);
    expect(r.mode).toBe("rank-fallback");
    const adv = r.advantages.map((a) => a.advantage);
    expect(adv.every((a) => Number.isFinite(a))).toBe(true);
    expect(Math.max(...adv)).toBeLessThanOrEqual(1);
    expect(Math.min(...adv)).toBeGreaterThanOrEqual(-1);
  });

  it("rank-fallback handles ties: equal rewards get equal advantage", () => {
    // two pairs of ties, all within STD_FLOOR
    const r = GRPO.normalizeGroup([1.0, 1.0, 1.0 + 1e-12, 1.0 + 1e-12]);
    expect(r.mode).toBe("rank-fallback");
    const adv = r.advantages.map((a) => a.advantage);
    expect(adv[0]).toBe(adv[1]); // first tie pair equal
    expect(adv[2]).toBe(adv[3]); // second tie pair equal
    expect(adv[2]).toBeGreaterThan(adv[0]); // higher-reward tie ranks above
  });

  // ── FAILURE MODE 3: empty + single-element groups ──
  it("empty group → ok:false, no advantages, warning", () => {
    const r = GRPO.normalizeGroup([]);
    expect(r.ok).toBe(false);
    expect(r.advantages).toEqual([]);
    expect(r.warning).toMatch(/empty/);
  });

  it("single-element group → ok:true, advantage 0 (no relative baseline)", () => {
    const r = GRPO.normalizeGroup([3.14]);
    expect(r.ok).toBe(true);
    expect(r.advantages).toEqual([{ index: 0, reward: 3.14, advantage: 0 }]);
    expect(r.warning).toMatch(/size 1/);
  });

  // ── ADVERSARIAL 1: NaN / Infinity poison the group → rejected, zeroed ──
  it("NaN in group → ok:false, all-zero, names the bad index (no silent drop)", () => {
    const r = GRPO.normalizeGroup([1, NaN, 3]);
    expect(r.ok).toBe(false);
    expect(r.advantages.every((a) => a.advantage === 0)).toBe(true);
    expect(r.advantages.length).toBe(3); // not dropped — group preserved
    expect(r.warning).toMatch(/non-finite/);
    expect(r.warning).toMatch(/index 1/);
  });

  it("Infinity in group → ok:false, zeroed (would NaN the mean otherwise)", () => {
    const r = GRPO.normalizeGroup([1, Infinity, 3]);
    expect(r.ok).toBe(false);
    expect(r.advantages.every((a) => Number.isFinite(a.advantage))).toBe(true);
    expect(r.warning).toMatch(/non-finite/);
  });

  // ── ADVERSARIAL 2: non-array / non-number inputs ──
  it("non-array input → ok:false, structured (never throws)", () => {
    // @ts-expect-error deliberately passing wrong type
    const r = GRPO.normalizeGroup("not an array");
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/must be an array/);
  });

  it("array with a non-number member → treated as NaN, rejected", () => {
    // @ts-expect-error deliberate
    const r = GRPO.normalizeGroup([1, "x", 3]);
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/non-finite/);
  });

  // ── ADVERSARIAL 3: large group + negative rewards (RL rewards are signed) ──
  it("handles negative + large rewards (signed RL rewards) without overflow", () => {
    const rewards = Array.from({ length: 64 }, (_, i) => (i - 32) * 1e6);
    const r = GRPO.normalizeGroup(rewards);
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("zscore");
    const adv = r.advantages.map((a) => a.advantage);
    expect(adv.every((a) => Number.isFinite(a))).toBe(true);
    expect(Math.abs(mean(adv))).toBeLessThan(1e-6);
  });

  it("singleton export is the same class", () => {
    expect(groupRelativeRewardNormalizerEngine).toBeInstanceOf(GRPO);
    expect(GRPO.getSelfAwareness().reference).toMatch(/GRPO/);
  });
});
