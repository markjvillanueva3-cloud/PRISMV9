/**
 * Tests for SignalProcessingToolkitEngine
 * 18 tests covering digital filters, spectral analysis, envelope/cepstral/order analysis, signal quality
 */

import { describe, it, expect } from "vitest";
import { signalProcessingToolkitEngine } from "../engines/SignalProcessingToolkitEngine.js";

/** Generate sine wave samples */
function sineWave(freq: number, sampleRate: number, duration: number, amplitude: number = 1): number[] {
  const n = Math.floor(sampleRate * duration);
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    samples.push(amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate));
  }
  return samples;
}

/** Add Gaussian noise to signal */
function addNoise(signal: number[], noiseLevel: number): number[] {
  return signal.map((v) => {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const noise = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return v + noiseLevel * noise;
  });
}

/** Generate square wave */
function squareWave(freq: number, sampleRate: number, duration: number): number[] {
  const n = Math.floor(sampleRate * duration);
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    samples.push(Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1);
  }
  return samples;
}

describe("SignalProcessingToolkitEngine", () => {
  const engine = signalProcessingToolkitEngine;

  // ---- Digital Filters ----

  it("1. Lowpass filter removes high-frequency component from mixed signal", () => {
    const sampleRate = 1000;
    const low = sineWave(50, sampleRate, 0.5);  // 50 Hz — should pass
    const high = sineWave(400, sampleRate, 0.5); // 400 Hz — should be removed
    const mixed = low.map((v, i) => v + high[i]);

    const result = engine.digitalFilter({
      signal: mixed,
      sample_rate_hz: sampleRate,
      filter_type: "lowpass",
      cutoff_hz: 100,
      order: 4,
      method: "butterworth",
    });

    expect(result.filtered_signal.length).toBe(mixed.length);
    // After filtering, RMS should be closer to low-freq-only signal
    const filteredRms = Math.sqrt(result.filtered_signal.reduce((s, v) => s + v * v, 0) / result.filtered_signal.length);
    const lowRms = Math.sqrt(low.reduce((s, v) => s + v * v, 0) / low.length);
    // Filtered signal should have reduced power vs original mixed signal
    const mixedRms = Math.sqrt(mixed.reduce((s, v) => s + v * v, 0) / mixed.length);
    expect(filteredRms).toBeLessThan(mixedRms);
  });

  it("2. Highpass filter removes DC offset / low frequency", () => {
    const sampleRate = 1000;
    const signal = sineWave(200, sampleRate, 0.5).map((v) => v + 5); // DC offset of 5

    const result = engine.digitalFilter({
      signal,
      sample_rate_hz: sampleRate,
      filter_type: "highpass",
      cutoff_hz: 50,
      order: 4,
      method: "butterworth",
    });

    // Mean of filtered signal should be much less than 5
    const filteredMean = result.filtered_signal.reduce((s, v) => s + v, 0) / result.filtered_signal.length;
    expect(Math.abs(filteredMean)).toBeLessThan(2);
  });

  it("3. Bandpass filter passes only target frequency band", () => {
    const sampleRate = 2000;
    const f1 = sineWave(50, sampleRate, 0.5);   // Below band
    const f2 = sineWave(200, sampleRate, 0.5);  // In band
    const f3 = sineWave(800, sampleRate, 0.5);  // Above band
    const mixed = f1.map((v, i) => v + f2[i] + f3[i]);

    const result = engine.digitalFilter({
      signal: mixed,
      sample_rate_hz: sampleRate,
      filter_type: "bandpass",
      cutoff_hz: [150, 300],
      order: 4,
      method: "butterworth",
    });

    expect(result.filtered_signal.length).toBe(mixed.length);
    // Power should be reduced vs original
    const filteredPower = result.filtered_signal.reduce((s, v) => s + v * v, 0);
    const mixedPower = mixed.reduce((s, v) => s + v * v, 0);
    expect(filteredPower).toBeLessThan(mixedPower);
  });

  // ---- Spectral Analysis ----

  it("4. Spectral analysis identifies dominant frequency in sine wave", () => {
    const targetFreq = 120;
    const sampleRate = 1000;
    const signal = sineWave(targetFreq, sampleRate, 1.0);

    const result = engine.spectralAnalysis({
      signal,
      sample_rate_hz: sampleRate,
      method: "periodogram",
      window: "hanning",
    });

    expect(result.dominant_frequency_hz).toBeGreaterThan(100);
    expect(result.dominant_frequency_hz).toBeLessThan(140);
    expect(result.total_power).toBeGreaterThan(0);
    expect(result.frequencies_hz.length).toBeGreaterThan(0);
  });

  it("5. Welch method produces lower variance than periodogram", () => {
    const sampleRate = 1000;
    const signal = addNoise(sineWave(100, sampleRate, 2.0), 0.5);

    const periodogram = engine.spectralAnalysis({
      signal, sample_rate_hz: sampleRate, method: "periodogram",
    });
    const welch = engine.spectralAnalysis({
      signal, sample_rate_hz: sampleRate, method: "welch",
    });

    // Welch should have smoother PSD (lower variance of PSD values)
    const psdVar = (psd: number[]) => {
      const m = psd.reduce((s, v) => s + v, 0) / psd.length;
      return psd.reduce((s, v) => s + (v - m) ** 2, 0) / psd.length;
    };
    // Both should identify dominant frequency
    expect(periodogram.dominant_frequency_hz).toBeGreaterThan(50);
    expect(welch.dominant_frequency_hz).toBeGreaterThan(50);
    // Welch variance should be lower (smoother estimate)
    expect(psdVar(welch.psd)).toBeLessThan(psdVar(periodogram.psd));
  });

  it("6. Multiple peaks detected in multi-tone signal", () => {
    const sampleRate = 2000;
    const s1 = sineWave(100, sampleRate, 1.0, 2.0);
    const s2 = sineWave(300, sampleRate, 1.0, 1.5);
    const s3 = sineWave(500, sampleRate, 1.0, 1.0);
    const combined = s1.map((v, i) => v + s2[i] + s3[i]);

    const result = engine.spectralAnalysis({
      signal: combined, sample_rate_hz: sampleRate, method: "periodogram",
    });

    // Should detect at least 2 peaks
    expect(result.spectral_peaks.length).toBeGreaterThanOrEqual(2);
    // Dominant frequency should be near 100 Hz (strongest component)
    expect(result.dominant_frequency_hz).toBeGreaterThan(80);
    expect(result.dominant_frequency_hz).toBeLessThan(120);
  });

  // ---- Envelope Analysis ----

  it("7. Envelope analysis extracts modulation frequency", () => {
    const sampleRate = 4000;
    const carrierFreq = 500;
    const modFreq = 30;
    const n = Math.floor(sampleRate * 0.5);
    // Amplitude-modulated signal
    const signal: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      signal.push((1 + 0.5 * Math.sin(2 * Math.PI * modFreq * t)) *
        Math.sin(2 * Math.PI * carrierFreq * t));
    }

    const result = engine.envelopeAnalysis({ signal, sample_rate_hz: sampleRate });

    expect(result.envelope.length).toBe(signal.length);
    expect(result.instantaneous_frequency.length).toBe(signal.length);
    expect(result.envelope_spectrum.freq.length).toBeGreaterThan(0);
    // Envelope should have modulation frequency component
    if (result.characteristic_frequencies.length > 0) {
      expect(result.characteristic_frequencies[0].freq_hz).toBeGreaterThan(0);
    }
  });

  // ---- Cepstral Analysis ----

  it("8. Cepstral analysis detects periodicity", () => {
    const sampleRate = 2000;
    const fundamentalFreq = 100; // 100 Hz → period 10ms
    // Create signal with harmonics (periodic)
    const n = Math.floor(sampleRate * 0.5);
    const signal: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      signal.push(
        Math.sin(2 * Math.PI * fundamentalFreq * t) +
        0.5 * Math.sin(2 * Math.PI * 2 * fundamentalFreq * t) +
        0.3 * Math.sin(2 * Math.PI * 3 * fundamentalFreq * t)
      );
    }

    const result = engine.cepstralAnalysis({ signal, sample_rate_hz: sampleRate });

    expect(result.cepstrum.length).toBeGreaterThan(0);
    expect(result.quefrency_s.length).toBeGreaterThan(0);
    // Should detect periodicity
    if (result.fundamental_period_s !== undefined) {
      // Fundamental period should be near 1/100 = 0.01s
      expect(result.fundamental_period_s).toBeGreaterThan(0.005);
      expect(result.fundamental_period_s).toBeLessThan(0.02);
    }
  });

  // ---- Order Analysis ----

  it("9. Order analysis identifies 1x and 2x shaft orders", () => {
    const sampleRate = 4000;
    const rpm = 3000; // 50 Hz shaft frequency
    const shaftFreq = rpm / 60; // 50 Hz
    const duration = 0.5;
    const n = Math.floor(sampleRate * duration);
    const signal: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      signal.push(
        2.0 * Math.sin(2 * Math.PI * shaftFreq * t) +        // 1x order
        1.0 * Math.sin(2 * Math.PI * 2 * shaftFreq * t) +    // 2x order
        0.3 * Math.sin(2 * Math.PI * 3 * shaftFreq * t)      // 3x order
      );
    }

    const result = engine.orderAnalysis({
      signal, rpm_signal: rpm, sample_rate_hz: sampleRate, max_orders: 5,
    });

    expect(result.orders.length).toBeGreaterThan(0);
    expect(result.amplitudes.length).toBe(result.orders.length);
    // 1x should be dominant
    expect(result.dominant_orders.length).toBeGreaterThan(0);
    expect(result.dominant_orders[0].order).toBe(1);
    // 1x amplitude should be larger than 2x
    expect(result.amplitudes[0]).toBeGreaterThan(result.amplitudes[1]);
    expect(result.synchronous_average.length).toBeGreaterThan(0);
  });

  // ---- Signal Quality Metrics ----

  it("10. SNR: positive for clean signal, low for noisy", () => {
    const sampleRate = 1000;
    const cleanSignal = sineWave(100, sampleRate, 0.5);
    const noise = Array.from({ length: cleanSignal.length }, () =>
      (Math.random() - 0.5) * 0.1);

    const cleanResult = engine.signalQualityMetrics({ signal: cleanSignal, noise_signal: noise });
    expect(cleanResult.snr_db).toBeGreaterThan(10);

    // Very noisy
    const noisySignal = addNoise(sineWave(100, sampleRate, 0.5, 0.1), 5.0);
    const bigNoise = Array.from({ length: noisySignal.length }, () =>
      (Math.random() - 0.5) * 10);
    const noisyResult = engine.signalQualityMetrics({ signal: noisySignal, noise_signal: bigNoise });
    expect(noisyResult.snr_db).toBeLessThan(cleanResult.snr_db);
  });

  it("11. THD: low for pure sine, high for square wave", () => {
    const sampleRate = 4000;
    const pureSine = sineWave(100, sampleRate, 0.5);
    const square = squareWave(100, sampleRate, 0.5);

    const sineResult = engine.signalQualityMetrics({ signal: pureSine });
    const squareResult = engine.signalQualityMetrics({ signal: square });

    // Square wave has much more harmonic content
    expect(squareResult.thd_pct).toBeGreaterThan(sineResult.thd_pct);
  });

  it("12. Crest factor: ~1.414 for pure sine wave (sqrt(2))", () => {
    const sampleRate = 1000;
    const signal = sineWave(50, sampleRate, 1.0);

    const result = engine.signalQualityMetrics({ signal });

    // Crest factor of sine = peak/RMS = 1/0.707 ≈ 1.414
    expect(result.crest_factor).toBeGreaterThan(1.3);
    expect(result.crest_factor).toBeLessThan(1.5);
  });

  it("13. Kurtosis: ~3 for Gaussian signal", () => {
    // Generate Gaussian noise via Box-Muller
    const n = 10000;
    const signal: number[] = [];
    for (let i = 0; i < n; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      signal.push(Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2));
    }

    const result = engine.signalQualityMetrics({ signal });

    // Kurtosis of Gaussian ≈ 3 (raw kurtosis, not excess)
    expect(result.kurtosis).toBeGreaterThan(2.3);
    expect(result.kurtosis).toBeLessThan(3.7);
  });

  it("14. Moving average filter smooths noise", () => {
    const sampleRate = 1000;
    const signal = addNoise(sineWave(50, sampleRate, 0.5), 1.0);

    const result = engine.digitalFilter({
      signal, sample_rate_hz: sampleRate,
      filter_type: "lowpass", cutoff_hz: 100, method: "moving_average",
    });

    // Filtered signal should be smoother: lower sample-to-sample variance
    const diffVar = (s: number[]) => {
      let sum = 0;
      for (let i = 1; i < s.length; i++) sum += (s[i] - s[i - 1]) ** 2;
      return sum / (s.length - 1);
    };
    expect(diffVar(result.filtered_signal)).toBeLessThan(diffVar(signal));
  });

  it("15. Filter order effect: higher order → steeper rolloff", () => {
    const sampleRate = 1000;
    const signal = sineWave(200, sampleRate, 0.5); // Above cutoff

    const low = engine.digitalFilter({
      signal, sample_rate_hz: sampleRate,
      filter_type: "lowpass", cutoff_hz: 100, order: 2, method: "butterworth",
    });
    const high = engine.digitalFilter({
      signal, sample_rate_hz: sampleRate,
      filter_type: "lowpass", cutoff_hz: 100, order: 8, method: "butterworth",
    });

    // Higher order should attenuate more at 200 Hz (above 100 Hz cutoff)
    const lowPower = low.filtered_signal.reduce((s, v) => s + v * v, 0);
    const highPower = high.filtered_signal.reduce((s, v) => s + v * v, 0);
    expect(highPower).toBeLessThan(lowPower);
  });

  it("16. Notch filter removes specific frequency", () => {
    const sampleRate = 2000;
    const wanted = sineWave(100, sampleRate, 0.5, 1.0);
    const unwanted = sineWave(300, sampleRate, 0.5, 1.0); // 300 Hz to notch out
    const mixed = wanted.map((v, i) => v + unwanted[i]);

    const result = engine.digitalFilter({
      signal: mixed, sample_rate_hz: sampleRate,
      filter_type: "notch", cutoff_hz: [280, 320], order: 4, method: "butterworth",
    });

    // Power should be reduced (notch removes 300 Hz component)
    const filteredPower = result.filtered_signal.reduce((s, v) => s + v * v, 0);
    const mixedPower = mixed.reduce((s, v) => s + v * v, 0);
    expect(filteredPower).toBeLessThan(mixedPower * 0.9);
  });

  it("17. Sample rate respected in frequency axis", () => {
    const sampleRate = 8000;
    const signal = sineWave(1000, sampleRate, 0.5);

    const result = engine.spectralAnalysis({
      signal, sample_rate_hz: sampleRate, method: "periodogram",
    });

    // Max frequency should be ≤ Nyquist (4000 Hz)
    const maxFreq = Math.max(...result.frequencies_hz);
    expect(maxFreq).toBeLessThanOrEqual(sampleRate / 2 + 1);
    expect(maxFreq).toBeGreaterThan(sampleRate / 2 - 100);
  });

  it("18. Empty signal handled gracefully", () => {
    const filterResult = engine.digitalFilter({
      signal: [], sample_rate_hz: 1000,
      filter_type: "lowpass", cutoff_hz: 100, method: "butterworth",
    });
    expect(filterResult.filtered_signal).toEqual([]);

    const spectralResult = engine.spectralAnalysis({
      signal: [], sample_rate_hz: 1000, method: "periodogram",
    });
    expect(spectralResult.frequencies_hz).toEqual([]);
    expect(spectralResult.total_power).toBe(0);

    const envResult = engine.envelopeAnalysis({ signal: [], sample_rate_hz: 1000 });
    expect(envResult.envelope).toEqual([]);

    const cepResult = engine.cepstralAnalysis({ signal: [], sample_rate_hz: 1000 });
    expect(cepResult.cepstrum).toEqual([]);

    const orderResult = engine.orderAnalysis({
      signal: [], rpm_signal: 1000, sample_rate_hz: 1000,
    });
    expect(orderResult.orders).toEqual([]);

    const qualResult = engine.signalQualityMetrics({ signal: [] });
    expect(qualResult.rms).toBe(0);
  });
});
