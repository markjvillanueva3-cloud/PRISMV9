import { describe, it, expect } from 'vitest';
import { stochasticProcessEngine, StochasticProcessEngine } from '../../engines/StochasticProcessEngine.js';

describe('StochasticProcessEngine', () => {
  const engine = stochasticProcessEngine;

  // ── Singleton ──────────────────────────────────────────────────────
  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(StochasticProcessEngine);
  });

  // ── simulate() dispatch ────────────────────────────────────────────
  describe('simulate()', () => {
    it('dispatches to markov model', () => {
      const r = engine.simulate({
        model: 'markov',
        markov: {
          states: ['good', 'worn', 'failed'],
          transition_matrix: [
            [0.8, 0.15, 0.05],
            [0.0, 0.7, 0.3],
            [0.0, 0.0, 1.0],
          ],
        },
      });
      expect(r.model).toBe('markov');
      expect(r.markov_result).toBeDefined();
      expect(r.formula).toContain('steady-state');
    });

    it('dispatches to wiener model', () => {
      const r = engine.simulate({
        model: 'wiener',
        wiener: {
          vb_initial_mm: 0.05,
          drift_mm_per_min: 0.01,
          volatility_mm_per_sqrt_min: 0.002,
          threshold_mm: 0.3,
          n_simulations: 20,
        },
      });
      expect(r.model).toBe('wiener');
      expect(r.wiener_result).toBeDefined();
    });

    it('dispatches to poisson model', () => {
      const r = engine.simulate({
        model: 'poisson',
        poisson: { lambda_per_min: 0.02, time_window_min: 60 },
      });
      expect(r.model).toBe('poisson');
      expect(r.poisson_result).toBeDefined();
    });

    it('dispatches to hmm model', () => {
      const r = engine.simulate({
        model: 'hmm',
        hmm: { observations: [0, 1, 1, 2, 3, 4, 4] },
      });
      expect(r.model).toBe('hmm');
      expect(r.hmm_result).toBeDefined();
    });

    it('throws on missing model-specific input', () => {
      expect(() => engine.simulate({ model: 'markov' })).toThrow('markov field required');
      expect(() => engine.simulate({ model: 'wiener' })).toThrow('wiener field required');
      expect(() => engine.simulate({ model: 'poisson' })).toThrow('poisson field required');
      expect(() => engine.simulate({ model: 'hmm' })).toThrow('hmm field required');
    });

    it('throws on unknown model', () => {
      expect(() => engine.simulate({ model: 'unknown' as any })).toThrow('Unknown stochastic model');
    });
  });

  // ── Markov Chain ───────────────────────────────────────────────────
  describe('markovChain()', () => {
    it('computes steady-state probabilities that sum to 1', () => {
      const r = engine.markovChain({
        states: ['good', 'worn', 'failed'],
        transition_matrix: [
          [0.7, 0.2, 0.1],
          [0.0, 0.6, 0.4],
          [0.0, 0.0, 1.0],
        ],
      });
      const sum = r.steady_state.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('absorbing state gets probability 1 in steady state', () => {
      const r = engine.markovChain({
        states: ['good', 'worn', 'failed'],
        transition_matrix: [
          [0.7, 0.2, 0.1],
          [0.0, 0.6, 0.4],
          [0.0, 0.0, 1.0],
        ],
      });
      // With an absorbing state, steady-state should converge to it
      expect(r.steady_state[2]).toBeCloseTo(1.0, 3);
      expect(r.absorption_probability).toBe(1.0);
    });

    it('returns expected steps to failure > 0 for absorbing chain', () => {
      const r = engine.markovChain({
        states: ['good', 'worn', 'failed'],
        transition_matrix: [
          [0.8, 0.15, 0.05],
          [0.0, 0.7, 0.3],
          [0.0, 0.0, 1.0],
        ],
      });
      expect(r.expected_steps_to_failure).toBeGreaterThan(0);
    });

    it('generates state sequence of correct length', () => {
      const r = engine.markovChain({
        states: ['a', 'b'],
        transition_matrix: [[0.5, 0.5], [0.5, 0.5]],
        n_steps: 50,
      });
      // Initial state + n_steps transitions
      expect(r.state_sequence).toHaveLength(51);
    });

    it('throws on mismatched matrix dimensions', () => {
      expect(() =>
        engine.markovChain({
          states: ['a', 'b', 'c'],
          transition_matrix: [[0.5, 0.5], [0.5, 0.5]],
        })
      ).toThrow('Transition matrix must be 3×3');
    });

    it('warns on rows that do not sum to 1', () => {
      const warnings: string[] = [];
      engine.markovChain(
        {
          states: ['a', 'b'],
          transition_matrix: [[0.3, 0.3], [0.5, 0.5]],
        },
        warnings
      );
      expect(warnings.some(w => w.includes('sums to'))).toBe(true);
    });

    it('handles doubly-stochastic (symmetric) matrix', () => {
      const r = engine.markovChain({
        states: ['a', 'b'],
        transition_matrix: [[0.5, 0.5], [0.5, 0.5]],
        n_steps: 200,
      });
      // Steady state should be uniform
      expect(r.steady_state[0]).toBeCloseTo(0.5, 2);
      expect(r.steady_state[1]).toBeCloseTo(0.5, 2);
    });
  });

  // ── Wiener Process ─────────────────────────────────────────────────
  describe('wienerProcess()', () => {
    it('returns positive mean first passage time', () => {
      const r = engine.wienerProcess({
        vb_initial_mm: 0.05,
        drift_mm_per_min: 0.01,
        volatility_mm_per_sqrt_min: 0.002,
        threshold_mm: 0.3,
        n_simulations: 30,
      });
      expect(r.mean_first_passage_min).toBeGreaterThan(0);
    });

    it('analytical mean ≈ distance / drift', () => {
      const drift = 0.01;
      const vb0 = 0.05;
      const threshold = 0.3;
      const r = engine.wienerProcess({
        vb_initial_mm: vb0,
        drift_mm_per_min: drift,
        volatility_mm_per_sqrt_min: 0.0001, // Very low noise → close to analytical
        threshold_mm: threshold,
        n_simulations: 50,
      });
      const expected = (threshold - vb0) / drift; // 25 min
      expect(r.mean_first_passage_min).toBeCloseTo(expected, 0);
    });

    it('returns survival probability monotonically decreasing', () => {
      const r = engine.wienerProcess({
        vb_initial_mm: 0.0,
        drift_mm_per_min: 0.005,
        volatility_mm_per_sqrt_min: 0.001,
        threshold_mm: 0.3,
        n_simulations: 50,
      });
      const probs = r.survival_probability_at.map(s => s.probability);
      for (let i = 1; i < probs.length; i++) {
        expect(probs[i]).toBeLessThanOrEqual(probs[i - 1] + 0.01);
      }
    });

    it('returns sample paths (up to 5)', () => {
      const r = engine.wienerProcess({
        vb_initial_mm: 0.1,
        drift_mm_per_min: 0.02,
        volatility_mm_per_sqrt_min: 0.005,
        threshold_mm: 0.3,
        n_simulations: 10,
      });
      expect(r.sample_paths.length).toBeLessThanOrEqual(5);
      expect(r.sample_paths.length).toBeGreaterThan(0);
      // Each path starts at vb0
      for (const path of r.sample_paths) {
        expect(path[0]).toBeCloseTo(0.1, 3);
      }
    });

    it('throws on negative volatility', () => {
      expect(() =>
        engine.wienerProcess({
          vb_initial_mm: 0.05,
          drift_mm_per_min: 0.01,
          volatility_mm_per_sqrt_min: -0.01,
          threshold_mm: 0.3,
        })
      ).toThrow('Volatility');
    });

    it('warns when threshold <= initial wear', () => {
      const warnings: string[] = [];
      engine.wienerProcess(
        {
          vb_initial_mm: 0.5,
          drift_mm_per_min: 0.01,
          volatility_mm_per_sqrt_min: 0.001,
          threshold_mm: 0.3,
          n_simulations: 5,
        },
        warnings
      );
      expect(warnings.some(w => w.includes('already failed'))).toBe(true);
    });
  });

  // ── Poisson Process ────────────────────────────────────────────────
  describe('poissonProcess()', () => {
    it('expected events = lambda * T', () => {
      const r = engine.poissonProcess({ lambda_per_min: 0.05, time_window_min: 100 });
      expect(r.expected_events).toBeCloseTo(5.0, 4);
    });

    it('P(0) = e^{-lambdaT}', () => {
      const lamT = 0.05 * 100; // 5
      const r = engine.poissonProcess({ lambda_per_min: 0.05, time_window_min: 100 });
      expect(r.probability_zero).toBeCloseTo(Math.exp(-lamT), 6);
    });

    it('P(>=1) = 1 - P(0)', () => {
      const r = engine.poissonProcess({ lambda_per_min: 0.1, time_window_min: 10 });
      expect(r.probability_at_least_one).toBeCloseTo(1 - r.probability_zero, 8);
    });

    it('PMF probabilities sum to ~1', () => {
      const r = engine.poissonProcess({ lambda_per_min: 0.5, time_window_min: 4 });
      const sum = r.probabilities.reduce((s, p) => s + p.probability, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('throws on negative rate', () => {
      expect(() => engine.poissonProcess({ lambda_per_min: -1, time_window_min: 10 })).toThrow('non-negative');
    });

    it('throws on non-positive time window', () => {
      expect(() => engine.poissonProcess({ lambda_per_min: 1, time_window_min: 0 })).toThrow('positive');
    });

    it('handles zero rate (no events)', () => {
      const r = engine.poissonProcess({ lambda_per_min: 0, time_window_min: 100 });
      expect(r.expected_events).toBe(0);
      expect(r.probability_zero).toBeCloseTo(1.0, 8);
      expect(r.probability_at_least_one).toBeCloseTo(0.0, 8);
    });
  });

  // ── Hidden Markov Model ────────────────────────────────────────────
  describe('hiddenMarkov()', () => {
    it('Viterbi path has same length as observations', () => {
      const r = engine.hiddenMarkov({ observations: [0, 1, 2, 3, 4, 4, 4] });
      expect(r.most_likely_states).toHaveLength(7);
    });

    it('state probabilities rows sum to ~1', () => {
      const r = engine.hiddenMarkov({ observations: [0, 1, 2, 3, 4] });
      for (const row of r.state_probabilities) {
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 3);
      }
    });

    it('log-likelihood is finite and negative', () => {
      const r = engine.hiddenMarkov({ observations: [0, 0, 1, 1, 2] });
      expect(r.log_likelihood).toBeLessThan(0);
      expect(isFinite(r.log_likelihood)).toBe(true);
    });

    it('accepts custom transition and emission matrices', () => {
      const r = engine.hiddenMarkov({
        observations: [0, 1, 0, 1],
        n_hidden_states: 2,
        n_obs_symbols: 2,
        transition_matrix: [[0.9, 0.1], [0.2, 0.8]],
        emission_matrix: [[0.8, 0.2], [0.3, 0.7]],
      });
      expect(r.most_likely_states).toHaveLength(4);
      expect(r.state_probabilities).toHaveLength(4);
    });

    it('throws on empty observations', () => {
      expect(() => engine.hiddenMarkov({ observations: [] })).toThrow('empty');
    });

    it('throws on out-of-range observation', () => {
      expect(() =>
        engine.hiddenMarkov({ observations: [0, 1, 10], n_obs_symbols: 5 })
      ).toThrow('out of range');
    });

    it('Viterbi states are within valid range', () => {
      const nStates = 3;
      const r = engine.hiddenMarkov({
        observations: [0, 1, 2, 3, 4, 0, 1],
        n_hidden_states: nStates,
      });
      for (const s of r.most_likely_states) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(nStates);
      }
    });
  });
});
