/**
 * CrossProcessQLearningTabularEngine.test.ts — XPROC-NEURAL Tier 4 (T4-03)
 *
 * Verifies tabular Q-learning math (Watkins 1989; Sutton & Barto §6.5) and
 * the convergence acceptance criterion from XPROC-NEURAL-ROADMAP.md Tier 4 R3
 * using a 5-state chain MDP.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessQLearningTabularEngine,
  crossProcessQLearningTabular,
} from "../engines/CrossProcessQLearningTabularEngine.js";

beforeEach(() => CrossProcessQLearningTabularEngine.reset());

describe("update() — input validation", () => {
  it("rejects NaN reward", () => {
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: Number.NaN, nextState: "s2",
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects α > 1 (would oscillate)", () => {
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 1, nextState: null, alpha: 1.5,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects negative action", () => {
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: -1, reward: 1, nextState: null,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects γ > 1", () => {
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 1, nextState: null, gamma: 1.5,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("update() — Q-learning math (white-box)", () => {
  it("first update from Q=0: newQ = α·(r + γ·0 − 0) = α·r (terminal)", () => {
    // α=0.5, r=10, terminal next → newQ = 0 + 0.5·(10 + 0.99·0 − 0) = 5.0
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 10, nextState: null, alpha: 0.5, gamma: 0.99,
    });
    if (r.ok) {
      expect(r.oldQ).toBe(0);
      expect(r.newQ).toBeCloseTo(5.0, 8);
      expect(r.tdError).toBeCloseTo(10, 8);
    }
  });

  it("non-terminal: newQ = α·(r + γ·max Q(s',·) − Q(s,a))", () => {
    // First seed Q(s2, 0) = some value
    CrossProcessQLearningTabularEngine.update({
      state: "s2", action: 0, reward: 20, nextState: null, alpha: 1.0, gamma: 0.9,
    });
    // Now Q(s2, 0) = 1.0·(20 + 0.9·0 − 0) = 20
    const seed = CrossProcessQLearningTabularEngine.getQRow("s2", 1);
    expect(seed?.[0]).toBeCloseTo(20, 8);

    // Update Q(s, 0) with nextState=s2
    // Q(s,0) starts at 0; α=0.5, r=5, γ=0.9, max Q(s2,·)=20
    // newQ = 0 + 0.5·(5 + 0.9·20 − 0) = 0.5·(5 + 18) = 11.5
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 5, nextState: "s2", numActionsNext: 3,
      alpha: 0.5, gamma: 0.9,
    });
    if (r.ok) {
      expect(r.newQ).toBeCloseTo(11.5, 8);
      expect(r.tdError).toBeCloseTo(23, 8);
    }
  });

  it("zero reward + terminal does not change Q (TD error = 0 from Q=0)", () => {
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 0, nextState: null,
    });
    if (r.ok) {
      expect(r.oldQ).toBe(0);
      expect(r.newQ).toBe(0);
      expect(r.tdError).toBe(0);
    }
  });

  it("repeated updates with same reward converge to r/(1-γ) for self-loop", () => {
    // Self-loop on state s with reward 1, γ=0.9 → fixed point Q* = 1/(1-0.9) = 10
    // 1000 iters at α=0.1 reaches Q ≈ 9.9 (asymptotic to 10).
    // (At 200 iters Q ≈ 8.66 — too few; convergence rate is (1-α(1-γ))^n.)
    for (let i = 0; i < 1000; i++) {
      CrossProcessQLearningTabularEngine.update({
        state: "s", action: 0, reward: 1, nextState: "s", numActionsNext: 1,
        alpha: 0.1, gamma: 0.9,
      });
    }
    const q = CrossProcessQLearningTabularEngine.getQRow("s", 1);
    // Tolerance: within 0.5 of fixed point 10
    expect(q?.[0]).toBeGreaterThan(9.5);
    expect(q?.[0]).toBeLessThanOrEqual(10);
  });
});

describe("argmax()", () => {
  it("unseen state returns null action + isFirstEncounter=true", () => {
    const r = CrossProcessQLearningTabularEngine.argmax({
      state: "never", numActions: 4,
    });
    if (r.ok) {
      expect(r.result.action).toBeNull();
      expect(r.result.qValues).toBeNull();
      expect(r.result.isFirstEncounter).toBe(true);
    }
  });

  it("returns argmax over Q-values", () => {
    // Train: action 2 dominates
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 1, nextState: null, alpha: 1.0,
    });
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 1, reward: 5, nextState: null, alpha: 1.0,
    });
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 2, reward: 10, nextState: null, alpha: 1.0,
    });
    const r = CrossProcessQLearningTabularEngine.argmax({
      state: "s", numActions: 3,
    });
    if (r.ok) {
      expect(r.result.action).toBe(2);
      expect(r.result.qValues?.[2]).toBeCloseTo(10, 8);
    }
  });
});

describe("epsilonGreedy() — exploration", () => {
  it("ε=0 always picks argmax", () => {
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 1, reward: 100, nextState: null, alpha: 1.0,
    });
    let exploreCount = 0;
    let argmaxCount = 0;
    for (let i = 0; i < 100; i++) {
      const r = CrossProcessQLearningTabularEngine.epsilonGreedy({
        state: "s", numActions: 3, epsilon: 0,
      });
      if (r.ok) {
        if (r.result.isExploration) exploreCount++;
        if (r.result.action === 1) argmaxCount++;
      }
    }
    expect(exploreCount).toBe(0);
    expect(argmaxCount).toBe(100);
  });

  it("ε=1 always explores (uniform random)", () => {
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 100, nextState: null, alpha: 1.0,
    });
    let exploreCount = 0;
    for (let i = 0; i < 100; i++) {
      const r = CrossProcessQLearningTabularEngine.epsilonGreedy({
        state: "s", numActions: 4, epsilon: 1.0,
      });
      if (r.ok && r.result.isExploration) exploreCount++;
    }
    expect(exploreCount).toBe(100);
  });
});

describe("acceptance — converges to optimal in 100 episodes (5-state chain MDP)", () => {
  /**
   * 5-state chain: states [0, 1, 2, 3, 4]. From any state, action 0 goes
   * left (or stays at 0), action 1 goes right (or stays at 4). State 4 is
   * terminal with reward +10. Optimal policy: always action 1 (go right).
   *
   * After 100 episodes of ε-greedy training (ε=0.1), Q-table should
   * converge such that argmax = 1 in every non-terminal state.
   */
  it("optimal policy = always-right after 100 episodes", () => {
    const NUM_STATES = 5;
    const TERMINAL = NUM_STATES - 1;
    const NUM_ACTIONS = 2;
    const TRAINING_EPISODES = 100;
    const ALPHA = 0.5;
    const GAMMA = 0.9;
    const EPSILON = 0.2;  // moderate exploration during training

    for (let ep = 0; ep < TRAINING_EPISODES; ep++) {
      let s = 0;
      while (s !== TERMINAL) {
        const sel = CrossProcessQLearningTabularEngine.epsilonGreedy({
          state: `${s}`, numActions: NUM_ACTIONS, epsilon: EPSILON,
        });
        if (!sel.ok) throw new Error("select failed");
        const a = sel.result.action;
        let nextS: number;
        if (a === 0) nextS = Math.max(0, s - 1);  // left
        else nextS = Math.min(TERMINAL, s + 1);    // right
        const r = nextS === TERMINAL ? 10 : 0;
        CrossProcessQLearningTabularEngine.update({
          state: `${s}`, action: a, reward: r,
          nextState: nextS === TERMINAL ? null : `${nextS}`,
          numActionsNext: NUM_ACTIONS, alpha: ALPHA, gamma: GAMMA,
        });
        s = nextS;
      }
    }

    // Verify: argmax in each non-terminal state is action 1 (right)
    for (let s = 0; s < TERMINAL; s++) {
      const r = CrossProcessQLearningTabularEngine.argmax({
        state: `${s}`, numActions: NUM_ACTIONS,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.result.action).toBe(1);
        // Q(s, right) > Q(s, left)
        expect(r.result.qValues?.[1]).toBeGreaterThan(r.result.qValues?.[0] ?? 0);
      }
    }
  });
});

describe("capacity bound", () => {
  it("rejects new pair when at MAX_STATE_ACTION_PAIRS without evictLRU", () => {
    // Fill table to capacity. MAX = 1000.
    for (let i = 0; i < 1000; i++) {
      CrossProcessQLearningTabularEngine.update({
        state: `s-${i}`, action: 0, reward: 1, nextState: null,
      });
    }
    const stats = CrossProcessQLearningTabularEngine.stats();
    expect(stats.numStateActionPairs).toBe(1000);
    // Next add must fail
    const r = CrossProcessQLearningTabularEngine.update({
      state: "overflow", action: 0, reward: 1, nextState: null,
    });
    expect(r).toMatchObject({ ok: false, error: "capacity_exceeded" });
  });

  it("evictLRU=true allows new pair, removes oldest", () => {
    for (let i = 0; i < 1000; i++) {
      CrossProcessQLearningTabularEngine.update({
        state: `s-${i}`, action: 0, reward: 1, nextState: null,
      });
    }
    // s-0 was first inserted = oldest
    const r = CrossProcessQLearningTabularEngine.update({
      state: "new", action: 0, reward: 1, nextState: null, evictLRU: true,
    });
    if (r.ok) {
      expect(r.evicted?.state).toBe("s-0");
      expect(r.evicted?.action).toBe(0);
      expect(r.tableSize).toBe(1000);  // still at cap (one in, one out)
    }
  });

  it("re-updating an existing pair does NOT count as new (no capacity hit)", () => {
    for (let i = 0; i < 1000; i++) {
      CrossProcessQLearningTabularEngine.update({
        state: `s-${i}`, action: 0, reward: 1, nextState: null,
      });
    }
    // Re-update an existing pair — should succeed without eviction
    const r = CrossProcessQLearningTabularEngine.update({
      state: "s-500", action: 0, reward: 100, nextState: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.evicted).toBeNull();
  });
});

describe("stats() + reset()", () => {
  it("stats reports zero on fresh state", () => {
    const s = CrossProcessQLearningTabularEngine.stats();
    expect(s.numStates).toBe(0);
    expect(s.numStateActionPairs).toBe(0);
    expect(s.capacity).toBe(1000);
  });

  it("stats counts unique (state, action) pairs not states", () => {
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 1, nextState: null,
    });
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 1, reward: 1, nextState: null,
    });
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 2, reward: 1, nextState: null,
    });
    const s = CrossProcessQLearningTabularEngine.stats();
    expect(s.numStates).toBe(1);
    expect(s.numStateActionPairs).toBe(3);
  });

  it("reset clears table and counters", () => {
    CrossProcessQLearningTabularEngine.update({
      state: "s", action: 0, reward: 1, nextState: null,
    });
    CrossProcessQLearningTabularEngine.reset();
    expect(CrossProcessQLearningTabularEngine.stats().numStates).toBe(0);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_qlearn_update", () => {
    const r = crossProcessQLearningTabular("xproc_qlearn_update", {
      state: "s", action: 0, reward: 5, nextState: null, alpha: 1.0,
    }) as { ok: boolean; newQ?: number };
    expect(r.ok).toBe(true);
    expect(r.newQ).toBeCloseTo(5, 8);
  });

  it("routes xproc_qlearn_argmax", () => {
    crossProcessQLearningTabular("xproc_qlearn_update", {
      state: "s", action: 1, reward: 10, nextState: null, alpha: 1.0,
    });
    const r = crossProcessQLearningTabular("xproc_qlearn_argmax", {
      state: "s", numActions: 2,
    }) as { ok: boolean; result?: { action: number | null } };
    expect(r.result?.action).toBe(1);
  });

  it("routes xproc_qlearn_epsilon_greedy", () => {
    crossProcessQLearningTabular("xproc_qlearn_update", {
      state: "s", action: 0, reward: 10, nextState: null, alpha: 1.0,
    });
    const r = crossProcessQLearningTabular("xproc_qlearn_epsilon_greedy", {
      state: "s", numActions: 3, epsilon: 0,
    }) as { ok: boolean; result?: { action: number; isExploration: boolean } };
    expect(r.result?.action).toBe(0);
    expect(r.result?.isExploration).toBe(false);
  });

  it("routes xproc_qlearn_constants", () => {
    const r = crossProcessQLearningTabular("xproc_qlearn_constants", {}) as {
      MAX_STATE_ACTION_PAIRS: number;
    };
    expect(r.MAX_STATE_ACTION_PAIRS).toBe(1000);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessQLearningTabular("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
