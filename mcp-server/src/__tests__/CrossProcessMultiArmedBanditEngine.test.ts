/**
 * CrossProcessMultiArmedBanditEngine.test.ts — XPROC-NEURAL Tier 4 (T4-04)
 *
 * Verifies UCB1 (Auer 2002) and Thompson Sampling (Thompson 1933) math +
 * the regret-bound acceptance criterion from XPROC-NEURAL-ROADMAP.md
 * Tier 4 R4 using a synthetic 5-arm Bernoulli bandit.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessMultiArmedBanditEngine,
  crossProcessMultiArmedBandit,
} from "../engines/CrossProcessMultiArmedBanditEngine.js";

beforeEach(() => CrossProcessMultiArmedBanditEngine.reset());

describe("registerArm() + invalid_state guards", () => {
  it("rejects empty armId", () => {
    const r = CrossProcessMultiArmedBanditEngine.registerArm({ armId: "" });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("registers an arm and reports it in stats", () => {
    const r = CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    expect(r.ok).toBe(true);
    const stats = CrossProcessMultiArmedBanditEngine.getStats();
    expect(stats.arms.length).toBe(1);
    expect(stats.arms[0].armId).toBe("A");
    expect(stats.arms[0].pulls).toBe(0);
  });

  it("re-registering existing arm is idempotent", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    const r = CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    expect(r.ok).toBe(true);
    const stats = CrossProcessMultiArmedBanditEngine.getStats();
    expect(stats.arms.length).toBe(1);
  });

  it("selectArm with no arms registered → invalid_state", () => {
    const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1" });
    expect(r).toMatchObject({ ok: false, error: "invalid_state" });
  });
});

describe("update() — input validation", () => {
  it("rejects unknown arm", () => {
    const r = CrossProcessMultiArmedBanditEngine.update({
      armId: "never_registered", reward: 1,
    });
    expect(r).toMatchObject({ ok: false, error: "unknown_arm" });
  });

  it("rejects NaN reward", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    const r = CrossProcessMultiArmedBanditEngine.update({
      armId: "A", reward: Number.NaN,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects Infinity reward", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    const r = CrossProcessMultiArmedBanditEngine.update({
      armId: "A", reward: Number.POSITIVE_INFINITY,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("UCB1 — untried arms first", () => {
  it("first selectArm chooses an untried arm with INF score", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "C" });
    const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1" });
    if (r.ok) {
      expect(r.result.untriedArm).toBe(true);
      expect(r.result.score).toBe(Number.POSITIVE_INFINITY);
      expect(r.result.isExploration).toBe(true);
    }
  });

  it("after pulling all arms once, UCB1 returns finite scores", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
    CrossProcessMultiArmedBanditEngine.update({ armId: "B", reward: 0.5 });
    const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1" });
    if (r.ok) {
      expect(r.result.untriedArm).toBe(false);
      expect(Number.isFinite(r.result.score)).toBe(true);
    }
  });

  it("UCB1 is deterministic given identical history", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
    CrossProcessMultiArmedBanditEngine.update({ armId: "B", reward: 0.3 });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 0.9 });
    const r1 = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1", c: 1 });
    const r2 = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1", c: 1 });
    if (r1.ok && r2.ok) {
      expect(r1.result.armId).toBe(r2.result.armId);
      expect(r1.result.score).toBeCloseTo(r2.result.score, 8);
    }
  });
});

describe("UCB1 — score formula (white-box)", () => {
  it("UCB1 score = mean + c·√(2·ln(N) / n_a)", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    // Pull A 10 times with reward 0.5 average; pull B once with reward 0.0
    for (let i = 0; i < 10; i++) {
      CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 0.5 });
    }
    CrossProcessMultiArmedBanditEngine.update({ armId: "B", reward: 0 });
    // N = 11. Score(A) = 0.5 + 1·√(2·ln(11)/10) = 0.5 + √(2·2.398/10) ≈ 0.5 + 0.693 ≈ 1.193
    // Score(B) = 0 + 1·√(2·ln(11)/1) ≈ √(4.795) ≈ 2.190
    // → B should win (less-pulled arm gets higher exploration bonus)
    const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1", c: 1 });
    if (r.ok) {
      expect(r.result.armId).toBe("B");
      expect(r.result.score).toBeCloseTo(2.190, 2);
    }
  });

  it("c=0 forces pure exploitation (argmax of mean rewards)", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1.0 });
    CrossProcessMultiArmedBanditEngine.update({ armId: "B", reward: 0.0 });
    const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1", c: 0 });
    if (r.ok) {
      expect(r.result.armId).toBe("A");
      expect(r.result.score).toBe(1.0);
    }
  });
});

describe("Thompson Sampling — Beta posterior", () => {
  it("after many pulls, TS converges to argmax-arm with high probability", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "good" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "bad" });
    // 100 pulls each with clear separation
    for (let i = 0; i < 100; i++) {
      CrossProcessMultiArmedBanditEngine.update({ armId: "good", reward: 1, successOverride: true });
      CrossProcessMultiArmedBanditEngine.update({ armId: "bad", reward: 0, successOverride: false });
    }
    let goodCount = 0;
    for (let trial = 0; trial < 200; trial++) {
      const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "thompson" });
      if (r.ok && r.result.armId === "good") goodCount++;
    }
    // With α_good=101, β_good=1, α_bad=1, β_bad=101, samples are vastly
    // separated → "good" picked > 95% of the time
    expect(goodCount / 200).toBeGreaterThan(0.95);
  });

  it("TS scores are in [0, 1] (Beta domain)", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 0.5 });
    CrossProcessMultiArmedBanditEngine.update({ armId: "B", reward: 0.3 });
    for (let trial = 0; trial < 50; trial++) {
      const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "thompson" });
      if (r.ok) {
        expect(r.result.score).toBeGreaterThanOrEqual(0);
        expect(r.result.score).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("acceptance — regret bound on synthetic 5-arm Bernoulli bandit", () => {
  /**
   * 5-arm Bernoulli bandit with true means [0.1, 0.3, 0.5, 0.7, 0.9]. Best
   * arm has mean 0.9. Pseudo-regret over T pulls is:
   *   R_T = T·μ* − Σ_t r_t = T·0.9 − total reward
   *
   * UCB1 theoretical regret bound: O(√(K·T·ln T)) (Auer 2002 Thm 1).
   * For K=5, T=1000: bound ≈ √(5 · 1000 · ln(1000)) ≈ √34538 ≈ 186.
   * Acceptance criterion (XPROC-NEURAL-ROADMAP.md Tier 4 R4): regret holds
   * within 2× theoretical → R_T < 372.
   */
  it("UCB1 cumulative regret < 2× theoretical bound on 1000-pull synthetic bandit", () => {
    const armMeans = [0.1, 0.3, 0.5, 0.7, 0.9];
    const T = 1000;
    const K = armMeans.length;
    for (let i = 0; i < K; i++) {
      CrossProcessMultiArmedBanditEngine.registerArm({ armId: `${i}` });
    }
    let cumReward = 0;
    // Use deterministic PRNG for reproducibility
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let t = 0; t < T; t++) {
      const sel = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1", c: 1 });
      if (!sel.ok) throw new Error("selectArm failed");
      const armIdx = parseInt(sel.result.armId, 10);
      const reward = rand() < armMeans[armIdx] ? 1 : 0;
      cumReward += reward;
      CrossProcessMultiArmedBanditEngine.update({ armId: sel.result.armId, reward });
    }
    const theoreticalBound = Math.sqrt(K * T * Math.log(T));  // ≈ 186 for K=5, T=1000
    const pseudoRegret = T * 0.9 - cumReward;
    expect(pseudoRegret).toBeLessThan(2 * theoreticalBound);  // < 372
  });
});

describe("graduated flag (per-arm threshold)", () => {
  it("arm with < 30 pulls reports graduated=false", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
    const r = CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
    if (r.ok) expect(r.arm.graduated).toBe(false);
  });

  it("arm reaches graduated=true at exactly 30 pulls", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    let lastResult;
    for (let i = 0; i < 30; i++) {
      lastResult = CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
    }
    if (lastResult?.ok) expect(lastResult.arm.graduated).toBe(true);
  });

  it("selectArm reports allArmsGraduated=true when ALL arms ≥ threshold", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "B" });
    for (let i = 0; i < 30; i++) {
      CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
      CrossProcessMultiArmedBanditEngine.update({ armId: "B", reward: 1 });
    }
    const r = CrossProcessMultiArmedBanditEngine.selectArm({ strategy: "ucb1" });
    if (r.ok) expect(r.result.allArmsGraduated).toBe(true);
  });
});

describe("getStats() + reset()", () => {
  it("stats includes per-arm pulls/mean/successes/failures", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1, successOverride: true });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 0, successOverride: false });
    const stats = CrossProcessMultiArmedBanditEngine.getStats();
    expect(stats.arms[0].pulls).toBe(2);
    expect(stats.arms[0].meanReward).toBeCloseTo(0.5, 8);
    expect(stats.arms[0].successes).toBe(1);
    expect(stats.arms[0].failures).toBe(1);
    expect(stats.totalPulls).toBe(2);
    expect(stats.threshold).toBe(30);
  });

  it("reset clears all arms and counters", () => {
    CrossProcessMultiArmedBanditEngine.registerArm({ armId: "A" });
    CrossProcessMultiArmedBanditEngine.update({ armId: "A", reward: 1 });
    CrossProcessMultiArmedBanditEngine.reset();
    const stats = CrossProcessMultiArmedBanditEngine.getStats();
    expect(stats.arms.length).toBe(0);
    expect(stats.totalPulls).toBe(0);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_bandit_register_arm", () => {
    const r = crossProcessMultiArmedBandit("xproc_bandit_register_arm", {
      armId: "A",
    }) as { ok: boolean; armId?: string };
    expect(r.ok).toBe(true);
    expect(r.armId).toBe("A");
  });

  it("routes xproc_bandit_select", () => {
    crossProcessMultiArmedBandit("xproc_bandit_register_arm", { armId: "A" });
    const r = crossProcessMultiArmedBandit("xproc_bandit_select", { strategy: "ucb1" }) as {
      ok: boolean;
      result?: { armId: string; untriedArm: boolean };
    };
    expect(r.result?.armId).toBe("A");
    expect(r.result?.untriedArm).toBe(true);
  });

  it("routes xproc_bandit_update", () => {
    crossProcessMultiArmedBandit("xproc_bandit_register_arm", { armId: "A" });
    const r = crossProcessMultiArmedBandit("xproc_bandit_update", {
      armId: "A", reward: 1,
    }) as { ok: boolean; arm?: { pulls: number } };
    expect(r.ok).toBe(true);
    expect(r.arm?.pulls).toBe(1);
  });

  it("routes xproc_bandit_constants", () => {
    const c = crossProcessMultiArmedBandit("xproc_bandit_constants", {}) as {
      DEFAULT_UCB_C: number;
      COMMITTED_PULLS_THRESHOLD: number;
    };
    expect(c.DEFAULT_UCB_C).toBe(1.0);
    expect(c.COMMITTED_PULLS_THRESHOLD).toBe(30);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessMultiArmedBandit("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
