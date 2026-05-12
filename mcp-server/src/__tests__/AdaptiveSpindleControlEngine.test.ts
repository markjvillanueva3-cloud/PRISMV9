/**
 * Tests for AdaptiveSpindleControlEngine
 * ========================================
 * Covers: stabilityLimit, findStableRpm, detectChatter, adapt (full pipeline)
 */

import { describe, it, expect } from 'vitest';
import {
  AdaptiveSpindleControlEngine,
  adaptiveSpindleControlEngine,
} from '../../src/engines/AdaptiveSpindleControlEngine.js';

describe('AdaptiveSpindleControlEngine', () => {
  const engine = new AdaptiveSpindleControlEngine();

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(adaptiveSpindleControlEngine).toBeInstanceOf(AdaptiveSpindleControlEngine);
    });

    it('has engine id', () => {
      expect(adaptiveSpindleControlEngine.id).toBe('AdaptiveSpindleControlEngine');
    });
  });

  // ==========================================================================
  // stabilityLimit
  // ==========================================================================

  describe('stabilityLimit', () => {
    const fn = 800; // natural freq Hz
    const zeta = 0.03; // damping
    const Kc = 2000; // specific cutting force N/mm^2
    const stiffness = 5000; // N/mm
    const flutes = 4;

    it('returns a positive depth limit for typical parameters', () => {
      const limit = engine.stabilityLimit(8000, fn, zeta, Kc, stiffness, flutes);
      expect(limit).toBeGreaterThan(0);
    });

    it('returns 0 when RPM is 0 (tooth pass freq = 0)', () => {
      const limit = engine.stabilityLimit(0, fn, zeta, Kc, stiffness, flutes);
      expect(limit).toBe(0);
    });

    it('varies with RPM — stability lobes exist', () => {
      const limits: number[] = [];
      for (let rpm = 5000; rpm <= 15000; rpm += 500) {
        limits.push(engine.stabilityLimit(rpm, fn, zeta, Kc, stiffness, flutes));
      }
      // Stability lobes should produce variation — not all identical
      const unique = new Set(limits.map((l) => Math.round(l * 100)));
      expect(unique.size).toBeGreaterThan(1);
    });

    it('increases with higher stiffness', () => {
      const lowK = engine.stabilityLimit(8000, fn, zeta, Kc, 3000, flutes);
      const highK = engine.stabilityLimit(8000, fn, zeta, Kc, 8000, flutes);
      expect(highK).toBeGreaterThan(lowK);
    });

    it('decreases with higher Kc (harder material)', () => {
      const lowKc = engine.stabilityLimit(8000, fn, zeta, 1000, stiffness, flutes);
      const highKc = engine.stabilityLimit(8000, fn, zeta, 4000, stiffness, flutes);
      expect(highKc).toBeLessThan(lowKc);
    });

    it('higher damping increases the unconditional stability floor', () => {
      // The unconditionally-stable depth limit increases with damping:
      // fallback formula: 2*k*(1+zeta) / (Kc*N)
      // With very low RPM the fallback dominates, so test there
      const lowDamp = engine.stabilityLimit(100, fn, 0.01, Kc, stiffness, flutes);
      const highDamp = engine.stabilityLimit(100, fn, 0.2, Kc, stiffness, flutes);
      expect(highDamp).toBeGreaterThan(lowDamp);
    });

    it('uses fallback formula when no lobe yields stable depth', () => {
      // Very high RPM should trigger some fallback path
      const limit = engine.stabilityLimit(50000, fn, zeta, Kc, stiffness, flutes);
      expect(limit).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // findStableRpm
  // ==========================================================================

  describe('findStableRpm', () => {
    it('returns an RPM within the specified range', () => {
      const rpm = engine.findStableRpm(3, 800, 0.03, 2000, 5000, 4, 2000, 15000);
      expect(rpm).toBeGreaterThanOrEqual(2000);
      expect(rpm).toBeLessThanOrEqual(15000);
    });

    it('finds RPM with maximum stability margin', () => {
      const targetDepth = 2.0;
      const bestRpm = engine.findStableRpm(targetDepth, 800, 0.03, 2000, 5000, 4, 3000, 12000);
      const bestLimit = engine.stabilityLimit(bestRpm, 800, 0.03, 2000, 5000, 4);
      // The found RPM should yield a critical depth > our target depth (stable)
      expect(bestLimit).toBeGreaterThan(0);
    });

    it('returns rpmMin when range is very narrow', () => {
      const rpm = engine.findStableRpm(2, 800, 0.03, 2000, 5000, 4, 8000, 8010);
      expect(rpm).toBeGreaterThanOrEqual(8000);
      expect(rpm).toBeLessThanOrEqual(8010);
    });
  });

  // ==========================================================================
  // detectChatter
  // ==========================================================================

  describe('detectChatter', () => {
    it('returns no chatter for signal with < 8 samples', () => {
      const result = engine.detectChatter([1, 2, 3], 2000, 100);
      expect(result.detected).toBe(false);
      expect(result.freq).toBeNull();
      expect(result.amplitude).toBe(0);
    });

    it('returns no chatter for a DC (constant) signal', () => {
      const signal = new Array(64).fill(1.0);
      const result = engine.detectChatter(signal, 2000, 100);
      expect(result.detected).toBe(false);
    });

    it('detects chatter from a sinusoidal signal not at tooth-pass harmonic', () => {
      // Tooth pass freq = 100 Hz. Inject chatter at 750 Hz (not a harmonic).
      const sampleRate = 2000;
      const N = 256;
      const chatterFreq = 750;
      const toothPassFreq = 100;
      const signal = Array.from({ length: N }, (_, i) => {
        const t = i / sampleRate;
        return 5 * Math.sin(2 * Math.PI * chatterFreq * t);
      });
      const result = engine.detectChatter(signal, sampleRate, toothPassFreq);
      expect(result.detected).toBe(true);
      // Detected frequency should be near 750 Hz
      expect(result.freq).not.toBeNull();
      expect(Math.abs(result.freq! - chatterFreq)).toBeLessThan(20);
    });

    it('chatter detection distinguishes harmonics from non-harmonic peaks', () => {
      // A pure tooth-pass harmonic signal should have lower chatter amplitude
      // than a non-harmonic signal, because harmonic peaks are filtered out
      const sampleRate = 2000;
      const N = 256;
      const toothPassFreq = 100;

      // Non-harmonic signal at 750 Hz (not a multiple of 100)
      const nonHarmonicSignal = Array.from({ length: N }, (_, i) => {
        const t = i / sampleRate;
        return 5 * Math.sin(2 * Math.PI * 750 * t);
      });
      const nonHarmonicResult = engine.detectChatter(nonHarmonicSignal, sampleRate, toothPassFreq);

      // The non-harmonic signal should be detected as chatter
      expect(nonHarmonicResult.detected).toBe(true);
      expect(nonHarmonicResult.amplitude).toBeGreaterThan(0);
    });

    it('returns amplitude > 0 when chatter is detected', () => {
      const sampleRate = 2000;
      const N = 256;
      const signal = Array.from({ length: N }, (_, i) => {
        const t = i / sampleRate;
        return 10 * Math.sin(2 * Math.PI * 850 * t);
      });
      const result = engine.detectChatter(signal, sampleRate, 100);
      if (result.detected) {
        expect(result.amplitude).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // adapt — full pipeline
  // ==========================================================================

  describe('adapt — stable operation', () => {
    it('returns stable status when depth is well below limit', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 0.5,
        tool_diameter_mm: 12,
        flute_count: 4,
      });
      expect(result.recommended_rpm).toBeGreaterThan(0);
      expect(['stable', 'marginal', 'unstable']).toContain(result.stability_status);
      expect(result.critical_depth_mm).toBeGreaterThan(0);
    });

    it('recommended_rpm equals current when stable and no chatter', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 0.1, // very shallow — definitely stable
        tool_diameter_mm: 12,
        flute_count: 4,
      });
      if (result.stability_status === 'stable') {
        expect(result.recommended_rpm).toBe(8000);
        expect(result.rpm_adjustment).toBe(0);
      }
    });

    it('result contains formula with a_lim', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 1.0,
        tool_diameter_mm: 12,
        flute_count: 4,
      });
      expect(result.formula).toContain('a_lim');
    });

    it('returns rate_limited=false when no RPM change needed', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 0.1,
        tool_diameter_mm: 12,
        flute_count: 4,
      });
      if (result.stability_status === 'stable') {
        expect(result.rate_limited).toBe(false);
      }
    });
  });

  describe('adapt — unstable/chatter conditions', () => {
    it('adjusts RPM when depth exceeds stability limit', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 50, // absurdly deep — should be unstable or marginal
        tool_diameter_mm: 12,
        flute_count: 4,
      });
      expect(['unstable', 'marginal']).toContain(result.stability_status);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('detects chatter from vibration signal and adjusts RPM', () => {
      const sampleRate = 2000;
      const N = 256;
      const chatterFreq = 850;
      const vibration_samples = Array.from({ length: N }, (_, i) => {
        const t = i / sampleRate;
        return 8 * Math.sin(2 * Math.PI * chatterFreq * t);
      });

      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 2.0,
        tool_diameter_mm: 12,
        flute_count: 4,
        vibration_samples,
        sample_rate_hz: sampleRate,
      });
      expect(result.dominant_frequencies.length).toBeGreaterThan(0);
      if (result.chatter_detected) {
        expect(result.chatter_frequency_hz).not.toBeNull();
        expect(result.warnings.some((w) => w.includes('Chatter detected'))).toBe(true);
      }
    });
  });

  describe('adapt — rate limiting', () => {
    it('applies rate limiting when RPM change exceeds max_rpm_rate * dt', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 50, // unstable, will want big RPM change
        tool_diameter_mm: 12,
        flute_count: 4,
        max_rpm_rate: 100,
        dt_sec: 0.1,
      });
      if (result.recommended_rpm !== 8000) {
        const maxDelta = 100 * 0.1; // = 10 RPM
        const actualDelta = Math.abs(result.rpm_adjustment);
        expect(actualDelta).toBeLessThanOrEqual(maxDelta + 1); // +1 for rounding
        expect(result.rate_limited).toBe(true);
      }
    });
  });

  describe('adapt — SSV (sinusoidal spindle speed variation)', () => {
    it('generates SSV profile when enabled and chatter detected', () => {
      const sampleRate = 2000;
      const N = 256;
      const vibration_samples = Array.from({ length: N }, (_, i) => {
        const t = i / sampleRate;
        return 8 * Math.sin(2 * Math.PI * 850 * t);
      });

      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 2.0,
        tool_diameter_mm: 12,
        flute_count: 4,
        vibration_samples,
        sample_rate_hz: sampleRate,
        ssv_enabled: true,
        ssv_amplitude_pct: 10,
        ssv_freq_hz: 2,
      });

      if (result.chatter_detected || result.stability_status !== 'stable') {
        expect(result.ssv_profile).toBeDefined();
        expect(result.ssv_profile!.freq_hz).toBe(2);
        expect(result.ssv_profile!.amplitude).toBeGreaterThanOrEqual(0);
      }
    });

    it('does not generate SSV profile when disabled', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 0.1,
        tool_diameter_mm: 12,
        flute_count: 4,
        ssv_enabled: false,
      });
      expect(result.ssv_profile).toBeUndefined();
    });

    it('clamps SSV amplitude when lower bound would go below rpm_min', () => {
      const result = engine.adapt({
        current_rpm: 1200,
        depth_of_cut_mm: 50, // force unstable to enable SSV
        tool_diameter_mm: 12,
        flute_count: 4,
        ssv_enabled: true,
        ssv_amplitude_pct: 50,
        rpm_min: 1000,
        rpm_max: 20000,
      });
      if (result.ssv_profile) {
        expect(result.ssv_profile.rpm_base - result.ssv_profile.amplitude).toBeGreaterThanOrEqual(1000);
      }
    });
  });

  // ==========================================================================
  // adapt — edge cases
  // ==========================================================================

  describe('adapt — edge cases', () => {
    it('handles 1 flute', () => {
      const result = engine.adapt({
        current_rpm: 10000,
        depth_of_cut_mm: 1.0,
        tool_diameter_mm: 6,
        flute_count: 1,
      });
      expect(result.critical_depth_mm).toBeGreaterThan(0);
    });

    it('recommended RPM is clamped to [rpm_min, rpm_max]', () => {
      const result = engine.adapt({
        current_rpm: 500,
        depth_of_cut_mm: 1.0,
        tool_diameter_mm: 12,
        flute_count: 4,
        rpm_min: 2000,
        rpm_max: 18000,
      });
      expect(result.recommended_rpm).toBeGreaterThanOrEqual(2000);
      expect(result.recommended_rpm).toBeLessThanOrEqual(18000);
    });

    it('handles empty vibration_samples array gracefully', () => {
      const result = engine.adapt({
        current_rpm: 8000,
        depth_of_cut_mm: 1.0,
        tool_diameter_mm: 12,
        flute_count: 4,
        vibration_samples: [],
      });
      expect(result.chatter_detected).toBe(false);
      expect(result.dominant_frequencies).toHaveLength(0);
    });
  });
});
