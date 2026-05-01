/**
 * U-W100-27: WEDM Feedback Calibration Loop Tests
 *
 * Validates WEDMFeedbackCalibrationEngine:
 *   - Operator submits actual Ra, cycle_time vs predicted
 *   - Deviation >10% flags calibration
 *   - Bayesian update adjusts k_ra (Ra model) and eta_mrr (MRR efficiency)
 *   - Bounded adjustments prevent oscillation (max ±30% step, ±50% cumulative)
 *   - Calibration stored and applied to future programs
 *
 * Ref: Bayesian conjugate normal update, Klocke 2013, Kunieda 2005
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WEDMFeedbackCalibrationEngine } from '../engines/WEDMFeedbackCalibrationEngine.js';
import type { WEDMFeedback } from '../engines/WEDMFeedbackCalibrationEngine.js';

let engine: WEDMFeedbackCalibrationEngine;

beforeEach(() => {
  engine = new WEDMFeedbackCalibrationEngine();
});

function makeFeedback(overrides: Partial<WEDMFeedback> = {}): WEDMFeedback {
  return {
    material: 'D2',
    thickness_mm: 25.4,
    predicted_ra_um: 0.8,
    actual_ra_um: 0.8,
    predicted_time_min: 30,
    actual_time_min: 30,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('U-W100-27: WEDM Feedback Calibration Loop', () => {

  describe('Basic feedback acceptance', () => {
    it('accepts valid feedback', () => {
      const r = engine.submit_feedback(makeFeedback());
      expect(r.accepted).toBe(true);
    });

    it('rejects feedback with zero predicted Ra', () => {
      const r = engine.submit_feedback(makeFeedback({ predicted_ra_um: 0 }));
      expect(r.accepted).toBe(false);
    });

    it('rejects feedback with negative time', () => {
      const r = engine.submit_feedback(makeFeedback({ predicted_time_min: -5 }));
      expect(r.accepted).toBe(false);
    });

    it('computes Ra deviation percentage correctly', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0, // 25% deviation
      }));
      expect(r.ra_deviation_pct).toBeCloseTo(25.0, 0);
    });

    it('computes time deviation percentage correctly', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_time_min: 30,
        actual_time_min: 36, // 20% deviation
      }));
      expect(r.time_deviation_pct).toBeCloseTo(20.0, 0);
    });
  });

  describe('Deviation flagging (>10% threshold)', () => {
    it('does NOT flag when Ra within 10%', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 0.85, // 6.25% — under threshold
      }));
      expect(r.ra_flagged).toBe(false);
    });

    it('flags when Ra deviates >10%', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0, // 25% deviation
      }));
      expect(r.ra_flagged).toBe(true);
    });

    it('does NOT flag when time within 10%', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_time_min: 30,
        actual_time_min: 32, // 6.7% — under threshold
      }));
      expect(r.time_flagged).toBe(false);
    });

    it('flags when time deviates >10%', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_time_min: 30,
        actual_time_min: 40, // 33% deviation
      }));
      expect(r.time_flagged).toBe(true);
    });
  });

  describe('Bayesian calibration adjustment', () => {
    it('adjusts k_ra when Ra flagged', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0, // actual higher → k_ra should increase
      }));
      expect(r.calibrations.length).toBeGreaterThanOrEqual(1);
      const kra = r.calibrations.find(c => c.param === 'k_ra');
      expect(kra).toBeDefined();
      expect(kra!.posterior_value).toBeGreaterThan(kra!.prior_value);
    });

    it('adjusts eta_mrr when time flagged', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_time_min: 30,
        actual_time_min: 45, // actual longer → eta_mrr should decrease
      }));
      const eta = r.calibrations.find(c => c.param === 'eta_mrr');
      expect(eta).toBeDefined();
      expect(eta!.posterior_value).toBeLessThan(eta!.prior_value);
    });

    it('no calibration entries when within tolerance', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 0.83,
        predicted_time_min: 30,
        actual_time_min: 31,
      }));
      expect(r.calibrations.length).toBe(0);
    });

    it('k_ra approaches observed ratio after multiple samples', () => {
      // Consistently observe 20% higher Ra → k_ra should converge toward 1.2
      for (let i = 0; i < 5; i++) {
        engine.submit_feedback(makeFeedback({
          predicted_ra_um: 0.8,
          actual_ra_um: 0.96, // ratio = 1.2
        }));
      }
      const cal = engine.get_calibration('D2');
      expect(cal.k_ra).toBeGreaterThan(1.05); // Should be moving toward 1.2
      expect(cal.k_ra).toBeLessThan(1.5);     // Bounded
    });
  });

  describe('Bounded adjustments (prevent oscillation)', () => {
    it('single step limited to ±30%', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 2.0, // 150% deviation — should be clamped
      }));
      const kra = r.calibrations.find(c => c.param === 'k_ra');
      expect(kra).toBeDefined();
      // Posterior should not jump more than ~30% from prior
      expect(Math.abs(kra!.posterior_value - kra!.prior_value)).toBeLessThan(0.35);
    });

    it('cumulative adjustment bounded to ±50%', () => {
      // Keep submitting extreme feedback to try to push beyond bounds
      for (let i = 0; i < 20; i++) {
        engine.submit_feedback(makeFeedback({
          predicted_ra_um: 0.8,
          actual_ra_um: 2.0, // extreme high
        }));
      }
      const cal = engine.get_calibration('D2');
      expect(cal.k_ra).toBeLessThanOrEqual(1.5); // Max 50% above default
      expect(cal.k_ra).toBeGreaterThanOrEqual(0.5); // Min 50% below default
    });

    it('does not oscillate with alternating feedback', () => {
      // Submit alternating high/low feedback
      const values: number[] = [];
      for (let i = 0; i < 10; i++) {
        const actual = i % 2 === 0 ? 1.2 : 0.6;
        engine.submit_feedback(makeFeedback({
          predicted_ra_um: 0.8,
          actual_ra_um: actual,
        }));
        values.push(engine.get_calibration('D2').k_ra);
      }
      // The k_ra should be relatively stable, not swinging wildly
      const range = Math.max(...values) - Math.min(...values);
      expect(range).toBeLessThan(0.5); // Shouldn't swing more than 0.5
    });
  });

  describe('Material stratification', () => {
    it('different materials have independent calibrations', () => {
      engine.submit_feedback(makeFeedback({
        material: 'D2',
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0,
      }));
      engine.submit_feedback(makeFeedback({
        material: '6061',
        predicted_ra_um: 0.8,
        actual_ra_um: 0.6,
      }));
      const d2Cal = engine.get_calibration('D2');
      const alCal = engine.get_calibration('6061');
      // D2 k_ra should increase (actual > predicted)
      // 6061 k_ra should decrease (actual < predicted)
      expect(d2Cal.k_ra).toBeGreaterThan(alCal.k_ra);
    });

    it('calibrating one material does not affect another', () => {
      const beforeAl = engine.get_calibration('6061');
      engine.submit_feedback(makeFeedback({
        material: 'D2',
        predicted_ra_um: 0.8,
        actual_ra_um: 1.2,
      }));
      const afterAl = engine.get_calibration('6061');
      expect(afterAl.k_ra).toEqual(beforeAl.k_ra);
    });
  });

  describe('History and state', () => {
    it('stores feedback in history', () => {
      engine.submit_feedback(makeFeedback());
      const hist = engine.get_history();
      expect(hist.length).toBe(1);
      expect(hist[0].feedback.material).toBe('D2');
    });

    it('history is ordered most recent first', () => {
      engine.submit_feedback(makeFeedback({ material: 'D2' }));
      engine.submit_feedback(makeFeedback({ material: '6061' }));
      const hist = engine.get_history();
      expect(hist[0].feedback.material).toBe('6061');
      expect(hist[1].feedback.material).toBe('D2');
    });

    it('reset_calibration restores defaults', () => {
      engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.2,
      }));
      const before = engine.get_calibration('D2');
      expect(before.k_ra).not.toEqual(1.0);
      engine.reset_calibration('D2');
      const after = engine.get_calibration('D2');
      expect(after.k_ra).toEqual(1.0);
    });
  });

  describe('Result summary messages', () => {
    it('summary mentions deviation percentages', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0,
      }));
      expect(r.summary).toContain('Ra deviation');
      expect(r.summary).toContain('FLAGGED');
    });

    it('summary says no calibration needed when within tolerance', () => {
      const r = engine.submit_feedback(makeFeedback());
      expect(r.summary.toLowerCase()).toContain('no calibration');
    });

    it('summary includes calibration details when flagged', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.2,
      }));
      expect(r.summary).toContain('k_ra');
      expect(r.summary).toContain('→');
    });
  });

  describe('EXIT GATE', () => {
    it('feedback captures actual vs predicted Ra and time', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0,
        predicted_time_min: 30,
        actual_time_min: 35,
      }));
      expect(r.accepted).toBe(true);
      expect(r.ra_deviation_pct).toBeGreaterThan(0);
      expect(r.time_deviation_pct).toBeGreaterThan(0);
    });

    it('deviation >10% flags for calibration', () => {
      const r = engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0, // 25% deviation
      }));
      expect(r.ra_flagged).toBe(true);
      expect(r.calibrations.length).toBeGreaterThan(0);
    });

    it('calibration adjustments stored and applied to future lookups', () => {
      engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 1.0,
      }));
      const cal = engine.get_calibration('D2');
      expect(cal.k_ra).not.toEqual(1.0); // Was adjusted
      expect(cal.samples).toBeGreaterThan(5); // Default 5 + 1 update
    });

    it('bounded adjustment prevents oscillation', () => {
      // Extreme high feedback
      engine.submit_feedback(makeFeedback({
        predicted_ra_um: 0.8,
        actual_ra_um: 5.0, // extreme
      }));
      const cal = engine.get_calibration('D2');
      expect(cal.k_ra).toBeLessThanOrEqual(1.5); // Max cumulative bound
    });
  });
});
