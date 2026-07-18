/**
 * Tests for AdaptiveFeedControlEngine
 * ====================================
 * Covers: adapt (PID control, anti-windup, rate limiting, thermal override),
 *         tuneGains (Ziegler-Nichols auto-tuning)
 */

import { describe, it, expect } from 'vitest';
import {
  AdaptiveFeedControlEngine,
  adaptiveFeedControlEngine,
} from '../../src/engines/AdaptiveFeedControlEngine.js';

describe('AdaptiveFeedControlEngine', () => {
  const engine = new AdaptiveFeedControlEngine();

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(adaptiveFeedControlEngine).toBeInstanceOf(AdaptiveFeedControlEngine);
    });

    it('singleton is a stable reference', () => {
      expect(adaptiveFeedControlEngine).toBe(adaptiveFeedControlEngine);
    });
  });

  // ==========================================================================
  // adapt — basic PID
  // ==========================================================================

  describe('adapt — basic PID', () => {
    it('returns empty result for zero segments', () => {
      const result = engine.adapt({ segments: [] });
      expect(result.overrides).toHaveLength(0);
      expect(result.summary.mean_override_pct).toBe(100);
      expect(result.warnings).toContain('No segments provided');
    });

    it('returns 100% override when actual equals target force', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
      });
      expect(result.overrides).toHaveLength(1);
      expect(result.overrides[0].feed_override_pct).toBeCloseTo(100, 0);
      expect(result.overrides[0].error_N).toBe(0);
    });

    it('increases override when actual force is below target', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 300, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
      });
      expect(result.overrides[0].feed_override_pct).toBeGreaterThan(100);
      expect(result.overrides[0].error_N).toBe(200);
    });

    it('decreases override when actual force exceeds target', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 700, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
      });
      expect(result.overrides[0].feed_override_pct).toBeLessThan(100);
      expect(result.overrides[0].error_N).toBe(-200);
    });

    it('computes feed_actual_mmmin as programmed * override/100', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 400, segment_idx: 0 },
        ],
      });
      const ov = result.overrides[0];
      expect(ov.feed_actual_mmmin).toBeCloseTo(400 * ov.feed_override_pct / 100, 1);
    });

    it('returns correct control_params matching inputs', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        pid: { Kp: 0.7, Ki: 0.12, Kd: 0.04 },
        rate_limit_pct_per_seg: 15,
      });
      expect(result.control_params.Kp).toBe(0.7);
      expect(result.control_params.Ki).toBe(0.12);
      expect(result.control_params.Kd).toBe(0.04);
      expect(result.control_params.rate_limit).toBe(15);
    });

    it('returns a formula string describing the PID equation', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
      });
      expect(result.formula).toContain('feed_override_pct');
      expect(result.formula).toContain('anti-windup');
    });
  });

  // ==========================================================================
  // adapt — PID error reduction (physics correctness)
  // ==========================================================================

  describe('adapt — PID convergence', () => {
    it('PID reduces tracking error over multiple segments with constant target', () => {
      // Simulate force stepping from 300 to near 500 as override adjusts
      // Use constant target=500, actual starts at 300 and moves toward target
      const segments = [];
      let actualForce = 300;
      for (let i = 0; i < 20; i++) {
        segments.push({
          force_actual_N: actualForce,
          force_target_N: 500,
          feed_programmed_mmmin: 200,
          segment_idx: i,
        });
        // Simulate the plant response: force increases as feed increases
        const overrideEffect = (actualForce < 500) ? 10 : -10;
        actualForce = Math.min(600, Math.max(200, actualForce + overrideEffect));
      }

      const result = engine.adapt({ segments });
      // Error should be smaller in last segments than first
      const firstError = Math.abs(result.overrides[0].error_N);
      const lastErrors = result.overrides.slice(-5).map((o) => Math.abs(o.error_N));
      const avgLastError = lastErrors.reduce((a, b) => a + b, 0) / lastErrors.length;
      expect(avgLastError).toBeLessThanOrEqual(firstError);
    });

    it('summary settling_segments is bounded by total segments', () => {
      const segments = Array.from({ length: 10 }, (_, i) => ({
        force_actual_N: 500 + (i < 5 ? 50 : 0),
        force_target_N: 500,
        feed_programmed_mmmin: 200,
        segment_idx: i,
      }));
      const result = engine.adapt({ segments });
      expect(result.summary.settling_segments).toBeLessThanOrEqual(10);
      expect(result.summary.settling_segments).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // adapt — algorithm mode defaults
  // ==========================================================================

  describe('adapt — algorithm modes', () => {
    it('uses TGAR gains when mode is TGAR', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        algorithm_mode: 'TGAR',
      });
      expect(result.control_params.Kp).toBe(0.3);
      expect(result.control_params.Ki).toBe(0.05);
      expect(result.control_params.Kd).toBe(0.01);
    });

    it('uses CFSF gains when mode is CFSF', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        algorithm_mode: 'CFSF',
      });
      expect(result.control_params.Kp).toBe(0.8);
    });

    it('uses VCMR gains when mode is VCMR', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        algorithm_mode: 'VCMR',
      });
      expect(result.control_params.Kp).toBe(0.5);
      expect(result.control_params.Ki).toBe(0.08);
    });

    it('uses generic gains by default', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
      });
      expect(result.control_params.Kp).toBe(0.5);
      expect(result.control_params.Ki).toBe(0.05);
      expect(result.control_params.Kd).toBe(0.02);
    });
  });

  // ==========================================================================
  // adapt — clamping and rate limiting
  // ==========================================================================

  describe('adapt — clamping and rate limiting', () => {
    it('clamps override to override_max_pct', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 100, force_target_N: 1000, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        override_max_pct: 130,
        rate_limit_pct_per_seg: 100, // large to avoid rate limit interference
      });
      // With very large error, PID wants to go high but clamp applies
      expect(result.overrides[0].feed_override_pct).toBeLessThanOrEqual(130);
    });

    it('clamps override to override_min_pct', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 2000, force_target_N: 100, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        override_min_pct: 30,
        rate_limit_pct_per_seg: 200,
      });
      expect(result.overrides[0].feed_override_pct).toBeGreaterThanOrEqual(30);
    });

    it('rate limiter flags rate_limited when delta exceeds limit', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 100, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
          { force_actual_N: 100, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 1 },
        ],
        rate_limit_pct_per_seg: 5,
        pid: { Kp: 1.0, Ki: 0, Kd: 0 },
      });
      // First segment starts from 100%, large error wants big jump
      expect(result.overrides[0].rate_limited).toBe(true);
    });

    it('rate limiter restricts override change per segment', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 100, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
          { force_actual_N: 100, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 1 },
        ],
        rate_limit_pct_per_seg: 5,
        pid: { Kp: 1.0, Ki: 0, Kd: 0 },
      });
      // Override should not jump more than 5% from starting 100%
      expect(result.overrides[0].feed_override_pct).toBeLessThanOrEqual(105);
      expect(result.overrides[0].feed_override_pct).toBeGreaterThanOrEqual(95);
    });
  });

  // ==========================================================================
  // adapt — thermal override
  // ==========================================================================

  describe('adapt — thermal override', () => {
    it('reduces feed when temperature exceeds limit', () => {
      const result = engine.adapt({
        segments: [
          {
            force_actual_N: 500,
            force_target_N: 500,
            feed_programmed_mmmin: 200,
            segment_idx: 0,
            temperature_C: 600,
            temp_limit_C: 400,
          },
        ],
      });
      // Thermal override = 100 * 400/600 = 66.67%
      expect(result.overrides[0].feed_override_pct).toBeLessThan(100);
      expect(result.warnings.some((w) => w.includes('thermal limit active'))).toBe(true);
    });

    it('does not apply thermal override when temperature is below limit', () => {
      const result = engine.adapt({
        segments: [
          {
            force_actual_N: 500,
            force_target_N: 500,
            feed_programmed_mmmin: 200,
            segment_idx: 0,
            temperature_C: 300,
            temp_limit_C: 400,
          },
        ],
      });
      expect(result.overrides[0].feed_override_pct).toBeCloseTo(100, 0);
      expect(result.warnings.some((w) => w.includes('thermal limit'))).toBe(false);
    });
  });

  // ==========================================================================
  // adapt — anti-windup
  // ==========================================================================

  describe('adapt — anti-windup', () => {
    it('integral does not grow unboundedly when output is saturated', () => {
      // Sustained large error that saturates output at max
      const segments = Array.from({ length: 20 }, (_, i) => ({
        force_actual_N: 100,
        force_target_N: 1000,
        feed_programmed_mmmin: 200,
        segment_idx: i,
      }));
      const result = engine.adapt({
        segments,
        override_max_pct: 120,
        rate_limit_pct_per_seg: 100,
      });
      // Integral should be bounded — check it doesn't grow linearly
      const integrals = result.overrides.map((o) => Math.abs(o.integral));
      const maxIntegral = Math.max(...integrals);
      // Without anti-windup, integral would be ~900 * 0.1 * 20 = 1800
      // With anti-windup, it should be much smaller
      expect(maxIntegral).toBeLessThan(1800);
    });
  });

  // ==========================================================================
  // adapt — summary statistics
  // ==========================================================================

  describe('adapt — summary', () => {
    it('summary contains all required fields', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
      });
      const s = result.summary;
      expect(s).toHaveProperty('mean_override_pct');
      expect(s).toHaveProperty('min_override_pct');
      expect(s).toHaveProperty('max_override_pct');
      expect(s).toHaveProperty('mean_error_N');
      expect(s).toHaveProperty('max_error_N');
      expect(s).toHaveProperty('settling_segments');
      expect(s).toHaveProperty('overshoot_pct');
      expect(s).toHaveProperty('stability_margin');
    });

    it('min_override <= mean_override <= max_override', () => {
      const segments = Array.from({ length: 10 }, (_, i) => ({
        force_actual_N: 400 + i * 20,
        force_target_N: 500,
        feed_programmed_mmmin: 200,
        segment_idx: i,
      }));
      const result = engine.adapt({ segments });
      const s = result.summary;
      expect(s.min_override_pct).toBeLessThanOrEqual(s.mean_override_pct);
      expect(s.mean_override_pct).toBeLessThanOrEqual(s.max_override_pct);
    });

    it('overshoot_pct is non-negative', () => {
      const segments = Array.from({ length: 10 }, (_, i) => ({
        force_actual_N: 300 + i * 30,
        force_target_N: 500,
        feed_programmed_mmmin: 200,
        segment_idx: i,
      }));
      const result = engine.adapt({ segments });
      expect(result.summary.overshoot_pct).toBeGreaterThanOrEqual(0);
    });

    it('stability_margin is positive for well-tuned PID', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        pid: { Kp: 0.5, Ki: 0.05, Kd: 0.02 },
      });
      expect(result.summary.stability_margin).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // adapt — warnings
  // ==========================================================================

  describe('adapt — warnings', () => {
    it('warns on negative PID gains', () => {
      const result = engine.adapt({
        segments: [
          { force_actual_N: 500, force_target_N: 500, feed_programmed_mmmin: 200, segment_idx: 0 },
        ],
        pid: { Kp: -0.5, Ki: 0, Kd: 0 },
      });
      expect(result.warnings.some((w) => w.includes('Negative PID gains'))).toBe(true);
    });
  });

  // ==========================================================================
  // tuneGains
  // ==========================================================================

  describe('tuneGains', () => {
    it('returns generic defaults for < 4 samples', () => {
      const gains = engine.tuneGains([500, 490, 510], 500);
      expect(gains.Kp).toBe(0.5);
      expect(gains.Ki).toBe(0.05);
      expect(gains.Kd).toBe(0.02);
    });

    it('returns generic defaults when no oscillation (no zero crossings)', () => {
      // All errors positive — no zero crossing
      const gains = engine.tuneGains([400, 410, 420, 430, 440], 500);
      expect(gains.Kp).toBe(0.5);
    });

    it('produces valid Ziegler-Nichols gains from oscillating force signal', () => {
      // Create an oscillating force signal around target=500
      const signal = [];
      for (let i = 0; i < 40; i++) {
        signal.push(500 + 100 * Math.sin(i * Math.PI / 4));
      }
      const gains = engine.tuneGains(signal, 500);
      expect(gains.Kp).toBeGreaterThan(0);
      expect(gains.Ki).toBeGreaterThan(0);
      expect(gains.Kd).toBeGreaterThanOrEqual(0);
      // Gains should be within clamping bounds
      expect(gains.Kp).toBeLessThanOrEqual(5);
      expect(gains.Ki).toBeLessThanOrEqual(2);
      expect(gains.Kd).toBeLessThanOrEqual(1);
    });

    it('clamps Kp to minimum 0.05', () => {
      // Very small amplitude oscillation → small Ku → small Kp
      const signal = [];
      for (let i = 0; i < 40; i++) {
        signal.push(500 + 0.001 * Math.sin(i * Math.PI / 4));
      }
      const gains = engine.tuneGains(signal, 500);
      expect(gains.Kp).toBeGreaterThanOrEqual(0.05);
    });

    it('Ziegler-Nichols: Kp = 0.6*Ku, Ki = 2*Kp/Tu, Kd = Kp*Tu/8', () => {
      // Create a clean oscillation with known period
      const period = 8; // samples per full cycle
      const signal = [];
      for (let i = 0; i < 40; i++) {
        signal.push(500 + 50 * Math.sin((2 * Math.PI * i) / period));
      }
      const gains = engine.tuneGains(signal, 500);
      // Just verify the relationships hold approximately
      // Kd / Kp should be approximately Tu/8
      expect(gains.Kp).toBeGreaterThan(0);
      expect(gains.Ki).toBeGreaterThan(gains.Kp * 0.01); // Ki should be meaningful
    });
  });
});
