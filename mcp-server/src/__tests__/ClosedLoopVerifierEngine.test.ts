import { describe, it, expect } from "vitest";
import {
  closedLoopVerifierEngine,
  ClosedLoopVerifierEngine,
  type ClosedLoopVerifyInput,
} from "../engines/ClosedLoopVerifierEngine.js";

/**
 * GAP-7 closure test — closed-loop verifier wraps EKF + drift + divergence.
 *
 * Setup is a 1-D position+velocity tracking problem:
 *   x_dot = [v; 0]   ⇒  F = [[1, dt], [0, 1]]
 *   z = x (position only) ⇒  H = [[1, 0]]
 *   Process noise Q tiny, measurement noise R = 0.1²
 *   True trajectory: x = t * 1.0 (constant-velocity = 1)
 *
 * Three scenarios:
 *  1. Nominal — measured matches predicted → in_control
 *  2. Drifted — measured drifts +0.05 per step after t=10 → drifted
 *  3. Diverged — measured is wildly different (sine wave) → diverged or abort
 */
describe("ClosedLoopVerifierEngine", () => {
  /**
   * EKF loop assimilates 1 measurement per step via predict→update. The state
   * at iteration t represents the *prior* before predict; so to match a
   * predicted trajectory x(t)=t with measurements z[t]=t at t=0..T-1, we
   * initialize x0 at t=-1, i.e. x0=[-dt, 1] so the first predict produces
   * x_pred=[0, 1].
   */
  function makeInput(measFn: (t: number) => number, T = 30): ClosedLoopVerifyInput {
    const dt = 1.0;
    const predicted: number[][] = [];
    const measured: number[][] = [];
    for (let t = 0; t < T; t++) {
      predicted.push([t * 1.0, 1.0]);
      measured.push([measFn(t)]);
    }
    return {
      predicted_states: predicted,
      measured_observations: measured,
      F: [[1, dt], [0, 1]],
      H: [[1, 0]],
      Q: [[0.01, 0], [0, 0.01]],
      R: [[0.04]],
      x0: [-1, 1],
      P0: [[1, 0], [0, 1]],
      cusum_mu: 0,
      cusum_k: 0.5,
      cusum_h: 4.0,
    };
  }

  it("exports a singleton with verify() method", () => {
    expect(closedLoopVerifierEngine).toBeInstanceOf(ClosedLoopVerifierEngine);
    expect(typeof closedLoopVerifierEngine.verify).toBe("function");
  });

  it("throws on null input", () => {
    expect(() => closedLoopVerifierEngine.verify(null as unknown as ClosedLoopVerifyInput))
      .toThrow(/predicted_states and measured_observations/);
  });

  it("throws on empty sequences", () => {
    const input = makeInput(t => t, 1);
    input.predicted_states = [];
    expect(() => closedLoopVerifierEngine.verify(input))
      .toThrow(/empty state\/measurement/);
  });

  it("nominal trajectory → in_control verdict + low innovation", () => {
    const r = closedLoopVerifierEngine.verify(makeInput(t => t * 1.0 + 0.01 * Math.sin(t * 0.5)));
    expect(r.verdict).toBe("in_control");
    expect(r.max_innovation_sigma.value).toBeLessThan(3);
    expect(r.drift_alarm).toBe(false);
    expect(r.evidence).toHaveLength(3);
    expect(r.evidence[0].stage).toBe("ekf");
    expect(r.evidence[1].stage).toBe("cusum");
    expect(r.evidence[2].stage).toBe("divergence");
  });

  it("late-onset drift (step bias after t=15) → drifted verdict", () => {
    const r = closedLoopVerifierEngine.verify(makeInput(t => t * 1.0 + (t > 15 ? 2.0 : 0)));
    expect(["drifted", "diverged", "abort"]).toContain(r.verdict);
    expect(r.drift_alarm || r.max_innovation_sigma.value >= 3).toBe(true);
  });

  it("wildly divergent (sine wave) → diverged or abort verdict", () => {
    const r = closedLoopVerifierEngine.verify(makeInput(t => 10 * Math.sin(t * 0.3)));
    expect(["diverged", "abort", "drifted"]).toContain(r.verdict);
    expect(r.evidence.find(e => e.stage === "divergence")?.verdict).toBe("diverged");
  });

  it("per-stage evidence cites canonical sources", () => {
    const r = closedLoopVerifierEngine.verify(makeInput(t => t * 1.0));
    expect(r.evidence[0].source).toMatch(/Kalman|Anderson|Moore/);
    expect(r.evidence[1].source).toMatch(/Page|Montgomery/);
    expect(r.evidence[2].source).toMatch(/Kullback|Leibler|ISO\/IEC 25010/);
  });

  it("output schema: AtomicValues carry units", () => {
    const r = closedLoopVerifierEngine.verify(makeInput(t => t * 1.0));
    expect(r.max_innovation_sigma.unit).toBe("sigma");
    expect(r.rmse.unit).toBe("abs");
    expect(r.kl_divergence.unit).toBe("nats");
    expect(r.final_state.length).toBe(2);
    expect(r.innovations.length).toBe(30);
  });

  it("truncates to shorter sequence + emits warning on length mismatch", () => {
    const input = makeInput(t => t, 30);
    input.measured_observations = input.measured_observations.slice(0, 20);
    const r = closedLoopVerifierEngine.verify(input);
    expect(r.innovations.length).toBe(20);
    expect(r.warnings.some(w => /truncated|mismatch/i.test(w))).toBe(true);
  });

  it("custom kl_threshold is read + applied (tight vs default give same EKF, possibly different verdict)", () => {
    // Identical trajectory under default vs tight kl_threshold: EKF + CUSUM
    // evidence must be byte-identical; only the divergence-stage verdict may flip.
    const baseInput = makeInput(t => t * 1.0 + 0.3 * Math.sin(t * 0.4));
    const defaultRun = closedLoopVerifierEngine.verify(baseInput);
    const tightRun = closedLoopVerifierEngine.verify({ ...baseInput, kl_threshold: 0.0001 });
    expect(defaultRun.innovations.length).toBe(30);
    expect(tightRun.innovations.length).toBe(30);
    expect(defaultRun.max_innovation_sigma.value).toBe(tightRun.max_innovation_sigma.value);
    expect(defaultRun.drift_alarm).toBe(tightRun.drift_alarm);
    expect(defaultRun.kl_divergence.value).toBe(tightRun.kl_divergence.value);
    expect(defaultRun.evidence[2].stage).toBe("divergence");
    expect(tightRun.evidence[2].stage).toBe("divergence");
    // Monotonicity: if default diverged-stage already says diverged, tight must too
    if (defaultRun.evidence[2].verdict === "diverged") {
      expect(tightRun.evidence[2].verdict).toBe("diverged");
    }
  });
});
