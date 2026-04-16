/**
 * SignalProcessingToolkitEngine — Comprehensive Signal Processing for Manufacturing Sensor Data
 *
 * Digital filtering, spectral analysis, envelope/cepstral analysis, order tracking,
 * and signal quality metrics for CNC machine monitoring and diagnostics.
 *
 *   - Digital Filters (FIR/IIR: Butterworth, Chebyshev, Moving Average)
 *   - Spectral Analysis (Periodogram, Welch, Blackman-Tukey PSD estimation)
 *   - Envelope Analysis (Hilbert transform for bearing/gear fault detection)
 *   - Cepstral Analysis (echo/harmonic detection in machine vibration)
 *   - Order Analysis (order tracking for rotating machinery)
 *   - Signal Quality Metrics (SNR, THD, crest factor, kurtosis)
 *
 * @module engines/SignalProcessingToolkitEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface DigitalFilterInput {
  signal: number[];
  sample_rate_hz: number;
  filter_type: "lowpass" | "highpass" | "bandpass" | "notch";
  cutoff_hz: number | [number, number];
  order?: number;
  method: "butterworth" | "chebyshev" | "moving_average";
}

export interface DigitalFilterResult {
  filtered_signal: number[];
  frequency_response: { freq: number[]; magnitude_db: number[] };
  group_delay_samples: number;
  attenuation_at_cutoff_db: number;
}

export interface SpectralAnalysisInput {
  signal: number[];
  sample_rate_hz: number;
  method: "periodogram" | "welch" | "blackman_tukey";
  window?: "hanning" | "hamming" | "blackman" | "rectangular";
  n_fft?: number;
  overlap_pct?: number;
}

export interface SpectralPeak {
  freq: number;
  power: number;
  snr_db: number;
}

export interface SpectralAnalysisResult {
  frequencies_hz: number[];
  psd: number[];
  dominant_frequency_hz: number;
  total_power: number;
  spectral_peaks: SpectralPeak[];
  bandwidth_3db_hz: number;
}

export interface EnvelopeAnalysisInput {
  signal: number[];
  sample_rate_hz: number;
  bandpass?: [number, number];
}

export interface EnvelopeAnalysisResult {
  envelope: number[];
  instantaneous_frequency: number[];
  envelope_spectrum: { freq: number[]; amplitude: number[] };
  characteristic_frequencies: { name: string; freq_hz: number }[];
}

export interface CepstralAnalysisInput {
  signal: number[];
  sample_rate_hz: number;
}

export interface CepstralAnalysisResult {
  cepstrum: number[];
  quefrency_s: number[];
  rahmonics: { quefrency_s: number; amplitude: number }[];
  fundamental_period_s?: number;
}

export interface OrderAnalysisInput {
  signal: number[];
  rpm_signal: number[] | number;
  sample_rate_hz: number;
  max_orders?: number;
}

export interface OrderAnalysisResult {
  orders: number[];
  amplitudes: number[];
  dominant_orders: { order: number; amplitude: number }[];
  synchronous_average: number[];
}

export interface SignalQualityInput {
  signal: number[];
  noise_signal?: number[];
}

export interface SignalQualityResult {
  snr_db: number;
  thd_pct: number;
  crest_factor: number;
  kurtosis: number;
  rms: number;
  peak_to_peak: number;
  assessment: "normal" | "warning" | "critical";
}

// ============================================================================
// HELPERS
// ============================================================================

/** Compute mean of array */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Compute RMS of array */
function rms(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
}

/** Compute standard deviation */
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

/** Compute kurtosis (excess kurtosis, Fisher definition) */
function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const m4 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0) / n;
  // Excess kurtosis
  return m4 - 3;
}

/** Compute skewness */
function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const n = arr.length;
  return arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0) / n;
}

/** Next power of 2 >= n */
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Discrete Fourier Transform (radix-2 Cooley-Tukey FFT).
 * Input length must be power of 2. Returns [real[], imag[]].
 */
function fft(real: number[], imag?: number[]): [number[], number[]] {
  const n = real.length;
  const re = [...real];
  const im = imag ? [...imag] : new Array(n).fill(0);

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Cooley-Tukey butterfly
  for (let step = 2; step <= n; step *= 2) {
    const half = step / 2;
    const angle = -2 * Math.PI / step;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let g = 0; g < n; g += step) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < half; k++) {
        const tRe = curRe * re[g + k + half] - curIm * im[g + k + half];
        const tIm = curRe * im[g + k + half] + curIm * re[g + k + half];
        re[g + k + half] = re[g + k] - tRe;
        im[g + k + half] = im[g + k] - tIm;
        re[g + k] += tRe;
        im[g + k] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
  return [re, im];
}

/** Inverse FFT */
function ifft(real: number[], imag: number[]): [number[], number[]] {
  const n = real.length;
  // Conjugate
  const conjIm = imag.map((v) => -v);
  const [re, im] = fft(real, conjIm);
  return [re.map((v) => v / n), im.map((v) => -v / n)];
}

/** Zero-pad signal to power of 2 */
function zeroPad(signal: number[], nfft?: number): number[] {
  const targetLen = nfft || nextPow2(signal.length);
  const padded = new Array(targetLen).fill(0);
  for (let i = 0; i < signal.length; i++) padded[i] = signal[i];
  return padded;
}

/** Apply window function */
function applyWindow(signal: number[], windowType: string): number[] {
  const n = signal.length;
  return signal.map((v, i) => {
    switch (windowType) {
      case "hanning":
        return v * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      case "hamming":
        return v * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
      case "blackman":
        return v * (0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) +
          0.08 * Math.cos((4 * Math.PI * i) / (n - 1)));
      case "rectangular":
      default:
        return v;
    }
  });
}

/** Compute magnitude spectrum (one-sided) in dB */
function magnitudeSpectrum(re: number[], im: number[], n: number): number[] {
  const half = Math.floor(n / 2) + 1;
  const mag = new Array(half);
  for (let i = 0; i < half; i++) {
    mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return mag;
}

/** Butterworth magnitude response |H(f)|² = 1 / (1 + (f/fc)^(2n)) */
function butterworthResponse(freq: number, cutoff: number, order: number): number {
  const ratio = freq / cutoff;
  return 1 / Math.sqrt(1 + Math.pow(ratio, 2 * order));
}

/** Chebyshev Type I magnitude response with 1dB ripple */
function chebyshevResponse(freq: number, cutoff: number, order: number): number {
  const epsilon = 0.5088; // 1dB ripple: epsilon = sqrt(10^(Rp/10) - 1) ≈ 0.5088
  const ratio = freq / cutoff;
  // Chebyshev polynomial via recursion
  let Tn: number;
  if (ratio <= 1) {
    Tn = Math.cos(order * Math.acos(ratio));
  } else {
    Tn = Math.cosh(order * Math.acosh(ratio));
  }
  return 1 / Math.sqrt(1 + epsilon * epsilon * Tn * Tn);
}

// ============================================================================
// ENGINE
// ============================================================================

export class SignalProcessingToolkitEngine {

  /**
   * Digital filter — FIR/IIR for sensor signal conditioning.
   * Supports Butterworth, Chebyshev Type I, and Moving Average methods.
   */
  digitalFilter(params: DigitalFilterInput): DigitalFilterResult {
    log.info( "SignalProcessingToolkitEngine.digitalFilter", { filter_type: params.filter_type, method: params.method });

    const { signal, sample_rate_hz, filter_type, cutoff_hz, method } = params;
    const order = params.order ?? 4;

    if (signal.length === 0) {
      return {
        filtered_signal: [],
        frequency_response: { freq: [], magnitude_db: [] },
        group_delay_samples: 0,
        attenuation_at_cutoff_db: -3,
      };
    }

    const nyquist = sample_rate_hz / 2;

    // Moving average special case
    if (method === "moving_average") {
      const windowSize = Math.max(1, Math.round(sample_rate_hz / (Array.isArray(cutoff_hz) ? cutoff_hz[0] : cutoff_hz)));
      const filtered = this._movingAverage(signal, windowSize);
      const freqResp = this._computeFrequencyResponse(sample_rate_hz, nyquist, filter_type, cutoff_hz, order, "butterworth");
      return {
        filtered_signal: filtered,
        frequency_response: freqResp,
        group_delay_samples: Math.floor(windowSize / 2),
        attenuation_at_cutoff_db: -3,
      };
    }

    // Frequency-domain filtering for Butterworth/Chebyshev
    const nfft = nextPow2(Math.max(signal.length, 256));
    const padded = zeroPad(signal, nfft);
    const [fftRe, fftIm] = fft(padded);

    // Build frequency-domain filter
    const H = new Array(nfft).fill(0);
    for (let i = 0; i < nfft; i++) {
      const freq = (i <= nfft / 2) ? (i * sample_rate_hz / nfft) : ((nfft - i) * sample_rate_hz / nfft);
      H[i] = this._filterGain(freq, filter_type, cutoff_hz, order, method);
    }

    // Apply filter in frequency domain
    const filtRe = fftRe.map((v, i) => v * H[i]);
    const filtIm = fftIm.map((v, i) => v * H[i]);
    const [timeRe] = ifft(filtRe, filtIm);
    const filtered_signal = timeRe.slice(0, signal.length);

    // Frequency response for output
    const freqResp = this._computeFrequencyResponse(sample_rate_hz, nyquist, filter_type, cutoff_hz, order, method);

    // Group delay: order-dependent approximation
    const group_delay_samples = Math.round(order * 0.5);

    // Attenuation at cutoff
    const fc = Array.isArray(cutoff_hz) ? cutoff_hz[0] : cutoff_hz;
    const gainAtCutoff = this._filterGain(fc, filter_type, cutoff_hz, order, method);
    const attenuation_at_cutoff_db = 20 * Math.log10(Math.max(gainAtCutoff, 1e-10));

    return { filtered_signal, frequency_response: freqResp, group_delay_samples, attenuation_at_cutoff_db };
  }

  /**
   * Spectral analysis — Power spectral density estimation.
   * Supports periodogram, Welch, and Blackman-Tukey methods.
   */
  spectralAnalysis(params: SpectralAnalysisInput): SpectralAnalysisResult {
    log.info( "SignalProcessingToolkitEngine.spectralAnalysis", { method: params.method });

    const { signal, sample_rate_hz, method } = params;
    const windowType = params.window ?? "hanning";
    const overlap_pct = params.overlap_pct ?? 50;

    if (signal.length === 0) {
      return {
        frequencies_hz: [], psd: [], dominant_frequency_hz: 0,
        total_power: 0, spectral_peaks: [], bandwidth_3db_hz: 0,
      };
    }

    let frequencies_hz: number[];
    let psd: number[];

    if (method === "welch") {
      [frequencies_hz, psd] = this._welchPSD(signal, sample_rate_hz, windowType, params.n_fft, overlap_pct);
    } else if (method === "blackman_tukey") {
      [frequencies_hz, psd] = this._blackmanTukeyPSD(signal, sample_rate_hz, windowType, params.n_fft);
    } else {
      // Periodogram
      [frequencies_hz, psd] = this._periodogramPSD(signal, sample_rate_hz, windowType, params.n_fft);
    }

    // Total power
    const df = frequencies_hz.length > 1 ? frequencies_hz[1] - frequencies_hz[0] : 1;
    const total_power = psd.reduce((s, v) => s + v * df, 0);

    // Dominant frequency
    let maxPower = -Infinity;
    let domIdx = 0;
    for (let i = 1; i < psd.length; i++) {
      if (psd[i] > maxPower) {
        maxPower = psd[i];
        domIdx = i;
      }
    }
    const dominant_frequency_hz = frequencies_hz[domIdx] || 0;

    // Spectral peaks
    const spectral_peaks = this._findSpectralPeaks(frequencies_hz, psd, total_power);

    // 3dB bandwidth around dominant peak
    const bandwidth_3db_hz = this._compute3dBBandwidth(frequencies_hz, psd, domIdx);

    return { frequencies_hz, psd, dominant_frequency_hz, total_power, spectral_peaks, bandwidth_3db_hz };
  }

  /**
   * Envelope analysis — Hilbert transform envelope for bearing/gear fault detection.
   * Computes analytic signal z(t) = x(t) + j·H{x(t)}, envelope A(t) = |z(t)|.
   */
  envelopeAnalysis(params: EnvelopeAnalysisInput): EnvelopeAnalysisResult {
    log.info( "SignalProcessingToolkitEngine.envelopeAnalysis");

    let { signal, sample_rate_hz } = params;

    if (signal.length === 0) {
      return {
        envelope: [], instantaneous_frequency: [],
        envelope_spectrum: { freq: [], amplitude: [] },
        characteristic_frequencies: [],
      };
    }

    // Optional bandpass pre-filter
    if (params.bandpass) {
      const filtered = this.digitalFilter({
        signal, sample_rate_hz,
        filter_type: "bandpass",
        cutoff_hz: params.bandpass,
        order: 4,
        method: "butterworth",
      });
      signal = filtered.filtered_signal;
    }

    // Hilbert transform via FFT
    const nfft = nextPow2(signal.length);
    const padded = zeroPad(signal, nfft);
    const [fftRe, fftIm] = fft(padded);

    // Zero negative frequencies, double positive frequencies
    const hRe = [...fftRe];
    const hIm = [...fftIm];
    for (let i = 1; i < nfft / 2; i++) {
      hRe[i] *= 2;
      hIm[i] *= 2;
    }
    for (let i = nfft / 2 + 1; i < nfft; i++) {
      hRe[i] = 0;
      hIm[i] = 0;
    }

    const [analyticRe, analyticIm] = ifft(hRe, hIm);

    // Envelope = magnitude of analytic signal
    const envelope: number[] = [];
    const instPhase: number[] = [];
    for (let i = 0; i < signal.length; i++) {
      envelope.push(Math.sqrt(analyticRe[i] ** 2 + analyticIm[i] ** 2));
      instPhase.push(Math.atan2(analyticIm[i], analyticRe[i]));
    }

    // Instantaneous frequency: f(t) = dφ/dt / (2π)
    const instantaneous_frequency: number[] = [];
    for (let i = 0; i < signal.length; i++) {
      if (i === 0) {
        instantaneous_frequency.push(0);
      } else {
        let dPhase = instPhase[i] - instPhase[i - 1];
        // Unwrap
        while (dPhase > Math.PI) dPhase -= 2 * Math.PI;
        while (dPhase < -Math.PI) dPhase += 2 * Math.PI;
        instantaneous_frequency.push(Math.abs(dPhase * sample_rate_hz / (2 * Math.PI)));
      }
    }

    // Envelope spectrum
    const envNfft = nextPow2(envelope.length);
    const envPadded = zeroPad(envelope.map((v) => v - mean(envelope)), envNfft);
    const [envRe, envIm] = fft(envPadded);
    const half = Math.floor(envNfft / 2) + 1;
    const envFreq: number[] = [];
    const envAmplitude: number[] = [];
    for (let i = 0; i < half; i++) {
      envFreq.push((i * sample_rate_hz) / envNfft);
      envAmplitude.push(Math.sqrt(envRe[i] ** 2 + envIm[i] ** 2) / envNfft);
    }

    // Characteristic frequencies from envelope spectrum peaks
    const characteristic_frequencies = this._findCharacteristicFreqs(envFreq, envAmplitude);

    return {
      envelope, instantaneous_frequency,
      envelope_spectrum: { freq: envFreq, amplitude: envAmplitude },
      characteristic_frequencies,
    };
  }

  /**
   * Cepstral analysis — detects echoes and harmonics in machine vibration.
   * Real cepstrum: c(τ) = IFFT(log|FFT(x)|)
   */
  cepstralAnalysis(params: CepstralAnalysisInput): CepstralAnalysisResult {
    log.info( "SignalProcessingToolkitEngine.cepstralAnalysis");

    const { signal, sample_rate_hz } = params;

    if (signal.length === 0) {
      return {
        cepstrum: [], quefrency_s: [], rahmonics: [],
      };
    }

    const nfft = nextPow2(signal.length);
    const padded = zeroPad(signal, nfft);
    const [fftRe, fftIm] = fft(padded);

    // Log magnitude spectrum
    const logMag = new Array(nfft);
    for (let i = 0; i < nfft; i++) {
      const mag = Math.sqrt(fftRe[i] ** 2 + fftIm[i] ** 2);
      logMag[i] = Math.log(Math.max(mag, 1e-20));
    }

    // IFFT of log magnitude = real cepstrum
    const [cepRe] = ifft(logMag, new Array(nfft).fill(0));

    // Quefrency axis
    const quefrency_s: number[] = [];
    for (let i = 0; i < nfft; i++) {
      quefrency_s.push(i / sample_rate_hz);
    }

    // Use only first half (causal part)
    const halfLen = Math.floor(nfft / 2);
    const cepstrum = cepRe.slice(0, halfLen);
    const quefrencies = quefrency_s.slice(0, halfLen);

    // Find rahmonics (peaks in cepstrum, skip quefrency 0)
    const rahmonics: { quefrency_s: number; amplitude: number }[] = [];
    const cepMean = mean(cepstrum.slice(2));
    const cepStd = std(cepstrum.slice(2));
    const threshold = cepMean + 2 * cepStd;

    for (let i = 2; i < halfLen - 1; i++) {
      if (Math.abs(cepstrum[i]) > threshold &&
          Math.abs(cepstrum[i]) > Math.abs(cepstrum[i - 1]) &&
          Math.abs(cepstrum[i]) > Math.abs(cepstrum[i + 1])) {
        rahmonics.push({ quefrency_s: quefrencies[i], amplitude: Math.abs(cepstrum[i]) });
      }
    }

    // Sort by amplitude descending
    rahmonics.sort((a, b) => b.amplitude - a.amplitude);

    // Fundamental period = quefrency of highest rahmonic
    const fundamental_period_s = rahmonics.length > 0 ? rahmonics[0].quefrency_s : undefined;

    return { cepstrum, quefrency_s: quefrencies, rahmonics, fundamental_period_s };
  }

  /**
   * Order analysis — order tracking for rotating machinery.
   * Converts time-domain signals to angle-domain for RPM-dependent analysis.
   */
  orderAnalysis(params: OrderAnalysisInput): OrderAnalysisResult {
    log.info( "SignalProcessingToolkitEngine.orderAnalysis");

    const { signal, rpm_signal, sample_rate_hz } = params;
    const max_orders = params.max_orders ?? 10;

    if (signal.length === 0) {
      return {
        orders: [], amplitudes: [],
        dominant_orders: [], synchronous_average: [],
      };
    }

    // Get RPM (constant or average)
    const rpm = typeof rpm_signal === "number" ? rpm_signal : mean(rpm_signal);
    const shaft_freq = rpm / 60; // Hz

    // Compute spectrum
    const nfft = nextPow2(signal.length);
    const padded = zeroPad(signal, nfft);
    const windowed = applyWindow(padded, "hanning");
    const [fftRe, fftIm] = fft(windowed);

    const half = Math.floor(nfft / 2) + 1;
    const freqRes = sample_rate_hz / nfft;

    // Extract order amplitudes
    const orders: number[] = [];
    const amplitudes: number[] = [];
    const dominant_orders: { order: number; amplitude: number }[] = [];

    for (let ord = 1; ord <= max_orders; ord++) {
      const targetFreq = ord * shaft_freq;
      const binIdx = Math.round(targetFreq / freqRes);
      if (binIdx >= half) break;

      // Sum a few bins around target for spectral leakage
      let amp = 0;
      for (let b = Math.max(0, binIdx - 1); b <= Math.min(half - 1, binIdx + 1); b++) {
        const mag = Math.sqrt(fftRe[b] ** 2 + fftIm[b] ** 2) / nfft;
        amp = Math.max(amp, mag);
      }
      amp *= 2; // One-sided scaling

      orders.push(ord);
      amplitudes.push(amp);
    }

    // Sort for dominant orders
    const sorted = orders.map((o, i) => ({ order: o, amplitude: amplitudes[i] }));
    sorted.sort((a, b) => b.amplitude - a.amplitude);
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      if (sorted[i].amplitude > 0) {
        dominant_orders.push(sorted[i]);
      }
    }

    // Synchronous average: average signal over one revolution
    const samplesPerRev = Math.round(sample_rate_hz / shaft_freq);
    const nRevs = Math.floor(signal.length / samplesPerRev);
    const synchronous_average = new Array(samplesPerRev).fill(0);
    if (nRevs > 0) {
      for (let rev = 0; rev < nRevs; rev++) {
        for (let s = 0; s < samplesPerRev; s++) {
          synchronous_average[s] += signal[rev * samplesPerRev + s] / nRevs;
        }
      }
    }

    return { orders, amplitudes, dominant_orders, synchronous_average };
  }

  /**
   * Signal quality metrics — SNR, THD, crest factor, kurtosis.
   * Used for machine condition monitoring assessment.
   */
  signalQualityMetrics(params: SignalQualityInput): SignalQualityResult {
    log.info( "SignalProcessingToolkitEngine.signalQualityMetrics");

    const { signal } = params;

    if (signal.length === 0) {
      return {
        snr_db: 0, thd_pct: 0, crest_factor: 0, kurtosis: 0,
        rms: 0, peak_to_peak: 0, assessment: "normal",
      };
    }

    const sigRms = rms(signal);
    const sigMax = Math.max(...signal);
    const sigMin = Math.min(...signal);
    const peak_to_peak = sigMax - sigMin;
    const sigPeak = Math.max(Math.abs(sigMax), Math.abs(sigMin));
    const crest_factor = sigRms > 0 ? sigPeak / sigRms : 0;
    const kurt = kurtosis(signal) + 3; // Return raw kurtosis (not excess)

    // SNR
    let snr_db: number;
    if (params.noise_signal && params.noise_signal.length > 0) {
      const noiseRms = rms(params.noise_signal);
      snr_db = noiseRms > 0 ? 20 * Math.log10(sigRms / noiseRms) : 100;
    } else {
      // Estimate: signal power / noise power via spectral method
      const nfft = nextPow2(signal.length);
      const padded = zeroPad(signal, nfft);
      const [fftRe, fftIm] = fft(padded);
      const mags = magnitudeSpectrum(fftRe, fftIm, nfft);
      const sortedMags = [...mags].sort((a, b) => b - a);
      const signalPower = sortedMags.slice(0, Math.max(1, Math.floor(mags.length * 0.1)))
        .reduce((s, v) => s + v * v, 0);
      const noisePower = sortedMags.slice(Math.floor(mags.length * 0.1))
        .reduce((s, v) => s + v * v, 0);
      snr_db = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 100;
    }

    // THD: ratio of harmonic content to fundamental
    const thd_pct = this._computeTHD(signal);

    // Assessment
    let assessment: "normal" | "warning" | "critical";
    if (kurt > 7 || crest_factor > 5 || snr_db < 5) {
      assessment = "critical";
    } else if (kurt > 5 || crest_factor > 4 || snr_db < 15) {
      assessment = "warning";
    } else {
      assessment = "normal";
    }

    return { snr_db, thd_pct, crest_factor, kurtosis: kurt, rms: sigRms, peak_to_peak, assessment };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private _movingAverage(signal: number[], windowSize: number): number[] {
    const result: number[] = [];
    let sum = 0;
    const w = Math.min(windowSize, signal.length);
    for (let i = 0; i < signal.length; i++) {
      sum += signal[i];
      if (i >= w) sum -= signal[i - w];
      const count = Math.min(i + 1, w);
      result.push(sum / count);
    }
    return result;
  }

  private _filterGain(
    freq: number, filterType: string,
    cutoff: number | [number, number], order: number, method: string,
  ): number {
    const responseFn = method === "chebyshev" ? chebyshevResponse : butterworthResponse;

    if (filterType === "lowpass") {
      const fc = Array.isArray(cutoff) ? cutoff[0] : cutoff;
      return responseFn(freq, fc, order);
    } else if (filterType === "highpass") {
      const fc = Array.isArray(cutoff) ? cutoff[0] : cutoff;
      return fc > 0 ? responseFn(fc, freq, order) : 1;
    } else if (filterType === "bandpass") {
      const [fLow, fHigh] = Array.isArray(cutoff) ? cutoff : [cutoff * 0.8, cutoff * 1.2];
      const center = Math.sqrt(fLow * fHigh);
      const bw = fHigh - fLow;
      if (bw <= 0) return 0;
      const normalizedDist = Math.abs(freq - center) / (bw / 2);
      return butterworthResponse(normalizedDist, 1, order);
    } else if (filterType === "notch") {
      const [fLow, fHigh] = Array.isArray(cutoff) ? cutoff : [cutoff * 0.95, cutoff * 1.05];
      const center = Math.sqrt(fLow * fHigh);
      const bw = fHigh - fLow;
      if (bw <= 0) return 1;
      const normalizedDist = Math.abs(freq - center) / (bw / 2);
      return 1 - butterworthResponse(1, normalizedDist || 0.001, order);
    }
    return 1;
  }

  private _computeFrequencyResponse(
    sampleRate: number, nyquist: number,
    filterType: string, cutoff: number | [number, number],
    order: number, method: string,
  ): { freq: number[]; magnitude_db: number[] } {
    const nPoints = 128;
    const freq: number[] = [];
    const magnitude_db: number[] = [];
    for (let i = 0; i < nPoints; i++) {
      const f = (i / nPoints) * nyquist;
      freq.push(f);
      const gain = this._filterGain(f, filterType, cutoff, order, method);
      magnitude_db.push(20 * Math.log10(Math.max(gain, 1e-10)));
    }
    return { freq, magnitude_db };
  }

  private _periodogramPSD(
    signal: number[], sampleRate: number, windowType: string, nfft?: number,
  ): [number[], number[]] {
    const N = nfft || nextPow2(signal.length);
    const windowed = applyWindow(signal, windowType);
    const padded = zeroPad(windowed, N);
    const [re, im] = fft(padded);

    const half = Math.floor(N / 2) + 1;
    const freq: number[] = [];
    const psd: number[] = [];
    const scale = 1 / (sampleRate * signal.length);

    for (let i = 0; i < half; i++) {
      freq.push((i * sampleRate) / N);
      let p = (re[i] ** 2 + im[i] ** 2) * scale;
      if (i > 0 && i < half - 1) p *= 2; // One-sided
      psd.push(p);
    }
    return [freq, psd];
  }

  private _welchPSD(
    signal: number[], sampleRate: number, windowType: string,
    nfft?: number, overlapPct?: number,
  ): [number[], number[]] {
    const segLen = nfft || nextPow2(Math.floor(signal.length / 4));
    const overlap = Math.floor(segLen * (overlapPct ?? 50) / 100);
    const step = segLen - overlap;
    const segments: number[][] = [];

    for (let start = 0; start + segLen <= signal.length; start += step) {
      segments.push(signal.slice(start, start + segLen));
    }
    if (segments.length === 0) {
      segments.push(zeroPad(signal, segLen));
    }

    const N = nextPow2(segLen);
    const half = Math.floor(N / 2) + 1;
    const avgPsd = new Array(half).fill(0);

    for (const seg of segments) {
      const windowed = applyWindow(seg, windowType);
      const padded = zeroPad(windowed, N);
      const [re, im] = fft(padded);
      const scale = 1 / (sampleRate * segLen);
      for (let i = 0; i < half; i++) {
        let p = (re[i] ** 2 + im[i] ** 2) * scale;
        if (i > 0 && i < half - 1) p *= 2;
        avgPsd[i] += p / segments.length;
      }
    }

    const freq: number[] = [];
    for (let i = 0; i < half; i++) {
      freq.push((i * sampleRate) / N);
    }

    return [freq, avgPsd];
  }

  private _blackmanTukeyPSD(
    signal: number[], sampleRate: number, windowType: string, nfft?: number,
  ): [number[], number[]] {
    // Blackman-Tukey: PSD = FFT of windowed autocorrelation
    const maxLag = Math.min(signal.length - 1, Math.floor(signal.length / 2));
    const m = mean(signal);
    const centered = signal.map((v) => v - m);
    const acf = new Array(maxLag).fill(0);
    const variance = centered.reduce((s, v) => s + v * v, 0);

    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < centered.length - lag; i++) {
        sum += centered[i] * centered[i + lag];
      }
      acf[lag] = sum / variance;
    }

    // Window the autocorrelation
    const windowedAcf = applyWindow(acf, windowType);

    // FFT of windowed ACF
    const N = nfft || nextPow2(maxLag);
    const padded = zeroPad(windowedAcf, N);
    const [re] = fft(padded);

    const half = Math.floor(N / 2) + 1;
    const freq: number[] = [];
    const psd: number[] = [];
    const totalVar = variance / centered.length;

    for (let i = 0; i < half; i++) {
      freq.push((i * sampleRate) / N);
      psd.push(Math.max(0, re[i] * totalVar / sampleRate));
    }

    return [freq, psd];
  }

  private _findSpectralPeaks(freq: number[], psd: number[], totalPower: number): SpectralPeak[] {
    const peaks: SpectralPeak[] = [];
    const meanPower = totalPower / psd.length;

    for (let i = 1; i < psd.length - 1; i++) {
      if (psd[i] > psd[i - 1] && psd[i] > psd[i + 1] && psd[i] > meanPower * 2) {
        // SNR = peak power / average noise floor
        const snr = psd[i] / Math.max(meanPower, 1e-20);
        peaks.push({
          freq: freq[i],
          power: psd[i],
          snr_db: 10 * Math.log10(snr),
        });
      }
    }

    peaks.sort((a, b) => b.power - a.power);
    return peaks.slice(0, 10); // Top 10 peaks
  }

  private _compute3dBBandwidth(freq: number[], psd: number[], peakIdx: number): number {
    if (peakIdx <= 0 || peakIdx >= psd.length - 1) return 0;
    const halfPower = psd[peakIdx] / 2;

    let lowIdx = peakIdx;
    while (lowIdx > 0 && psd[lowIdx] > halfPower) lowIdx--;
    let highIdx = peakIdx;
    while (highIdx < psd.length - 1 && psd[highIdx] > halfPower) highIdx++;

    return freq[highIdx] - freq[lowIdx];
  }

  private _findCharacteristicFreqs(
    freq: number[], amplitude: number[],
  ): { name: string; freq_hz: number }[] {
    const results: { name: string; freq_hz: number }[] = [];
    const meanAmp = mean(amplitude.slice(1)); // Skip DC
    const threshold = meanAmp * 3;

    const peaks: { idx: number; amp: number }[] = [];
    for (let i = 2; i < amplitude.length - 1; i++) {
      if (amplitude[i] > threshold &&
          amplitude[i] > amplitude[i - 1] &&
          amplitude[i] > amplitude[i + 1]) {
        peaks.push({ idx: i, amp: amplitude[i] });
      }
    }
    peaks.sort((a, b) => b.amp - a.amp);

    for (let i = 0; i < Math.min(5, peaks.length); i++) {
      results.push({
        name: i === 0 ? "fundamental_modulation" : `harmonic_${i}`,
        freq_hz: freq[peaks[i].idx],
      });
    }

    return results;
  }

  private _computeTHD(signal: number[]): number {
    const nfft = nextPow2(signal.length);
    const padded = zeroPad(signal, nfft);
    const [re, im] = fft(padded);
    const half = Math.floor(nfft / 2) + 1;

    const mags: number[] = [];
    for (let i = 0; i < half; i++) {
      mags.push(Math.sqrt(re[i] ** 2 + im[i] ** 2));
    }

    // Find fundamental (highest magnitude, skip DC)
    let fundIdx = 1;
    let fundMag = 0;
    for (let i = 1; i < half; i++) {
      if (mags[i] > fundMag) {
        fundMag = mags[i];
        fundIdx = i;
      }
    }

    if (fundMag === 0) return 0;

    // Sum harmonic power
    let harmonicPower = 0;
    for (let h = 2; h <= 10; h++) {
      const hIdx = fundIdx * h;
      if (hIdx >= half) break;
      // Check a few bins around
      for (let b = Math.max(0, hIdx - 1); b <= Math.min(half - 1, hIdx + 1); b++) {
        harmonicPower = Math.max(harmonicPower, mags[b] ** 2);
      }
    }

    return Math.sqrt(harmonicPower) / fundMag * 100;
  }
}

export const signalProcessingToolkitEngine = new SignalProcessingToolkitEngine();
