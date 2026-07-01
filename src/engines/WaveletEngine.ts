/**
 * WaveletEngine — Wavelet Transform & Analysis
 *
 * Provides wavelet analysis for signal processing:
 * - Haar wavelet transform (DWT)
 * - Daubechies D4 wavelet transform
 * - Continuous wavelet transform (Morlet)
 * - Multi-resolution analysis
 * - Denoising via thresholding
 * - Energy distribution across scales
 *
 * Manufacturing use: chatter detection in vibration signals,
 * tool wear signature analysis, surface texture decomposition,
 * bearing fault detection, adaptive filtering of sensor data.
 *
 * @module WaveletEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaveletResult {
  approximation: number[];
  details: number[][];
  levels: number;
  energy: number[];
}

export interface CWTResult {
  scales: number[];
  coefficients: number[][];
  frequencies: number[];
  maxEnergy: { scale: number; time: number; energy: number };
}

export interface DenoiseResult {
  denoised: number[];
  removed: number[];
  snrImprovement: number;
}

// ---------------------------------------------------------------------------
// Wavelet coefficients
// ---------------------------------------------------------------------------

const HAAR_LP = [1 / Math.SQRT2, 1 / Math.SQRT2];
const HAAR_HP = [1 / Math.SQRT2, -1 / Math.SQRT2];

const DB4_LP = [
  (1 + Math.sqrt(3)) / (4 * Math.SQRT2),
  (3 + Math.sqrt(3)) / (4 * Math.SQRT2),
  (3 - Math.sqrt(3)) / (4 * Math.SQRT2),
  (1 - Math.sqrt(3)) / (4 * Math.SQRT2),
];
const DB4_HP = [
  DB4_LP[3], -DB4_LP[2], DB4_LP[1], -DB4_LP[0],
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class WaveletEngineImpl {

  /**
   * Discrete Wavelet Transform (Haar).
   */
  haarDWT(signal: number[], levels?: number): WaveletResult {
    return this._dwt(signal, HAAR_LP, HAAR_HP, levels);
  }

  /**
   * Discrete Wavelet Transform (Daubechies D4).
   */
  db4DWT(signal: number[], levels?: number): WaveletResult {
    return this._dwt(signal, DB4_LP, DB4_HP, levels);
  }

  /**
   * Inverse Haar DWT (reconstruction).
   */
  haarIDWT(approximation: number[], details: number[][]): number[] {
    return this._idwt(approximation, details, HAAR_LP, HAAR_HP);
  }

  /**
   * Inverse Daubechies D4 DWT.
   */
  db4IDWT(approximation: number[], details: number[][]): number[] {
    return this._idwt(approximation, details, DB4_LP, DB4_HP);
  }

  /**
   * Continuous Wavelet Transform using Morlet wavelet.
   */
  morletCWT(
    signal: number[], sampleRate: number,
    scales?: number[], omega0: number = 6
  ): CWTResult {
    const n = signal.length;
    const defaultScales = scales ?? Array.from(
      { length: 32 }, (_, i) => 2 ** (1 + i * 0.25)
    );

    const coefficients: number[][] = [];
    const frequencies: number[] = [];
    let maxEnergy = { scale: 0, time: 0, energy: 0 };

    for (const scale of defaultScales) {
      const row: number[] = [];
      const freq = omega0 * sampleRate / (2 * Math.PI * scale);
      frequencies.push(freq);

      for (let t = 0; t < n; t++) {
        let real = 0, imag = 0;
        for (let tau = 0; tau < n; tau++) {
          const x = (tau - t) / scale;
          // Morlet: exp(-x²/2) * cos(omega0 * x)
          const envelope = Math.exp(-x * x / 2) / Math.sqrt(scale);
          real += signal[tau] * envelope * Math.cos(omega0 * x);
          imag += signal[tau] * envelope * Math.sin(omega0 * x);
        }
        const energy = real * real + imag * imag;
        row.push(Math.sqrt(energy));

        if (energy > maxEnergy.energy) {
          maxEnergy = { scale, time: t / sampleRate, energy };
        }
      }
      coefficients.push(row);
    }

    return { scales: defaultScales, coefficients, frequencies, maxEnergy };
  }

  /**
   * Wavelet denoising via soft thresholding.
   */
  denoise(
    signal: number[],
    wavelet: "haar" | "db4" = "haar",
    threshold?: number
  ): DenoiseResult {
    const dwt = wavelet === "db4"
      ? this.db4DWT(signal)
      : this.haarDWT(signal);

    // Universal threshold (VisuShrink): σ * sqrt(2 * ln(n))
    const n = signal.length;
    const finest = dwt.details[dwt.details.length - 1];
    const sigma = this._medianAbsDev(finest) / 0.6745;
    const thr = threshold ?? sigma * Math.sqrt(2 * Math.log(n));

    // Soft threshold detail coefficients
    const threshDetails = dwt.details.map(d =>
      d.map(v => Math.sign(v) * Math.max(0, Math.abs(v) - thr))
    );

    // Reconstruct
    const denoised = wavelet === "db4"
      ? this.db4IDWT(dwt.approximation, threshDetails)
      : this.haarIDWT(dwt.approximation, threshDetails);

    // Trim to original length
    const result = denoised.slice(0, n);
    const removed = signal.map((s, i) => s - (result[i] ?? 0));

    // SNR improvement
    const signalPower = signal.reduce((s, v) => s + v * v, 0) / n;
    const noisePower = removed.reduce((s, v) => s + v * v, 0) / n;
    const snrImprovement = noisePower > 0
      ? 10 * Math.log10(signalPower / noisePower) : 0;

    return { denoised: result, removed, snrImprovement };
  }

  /**
   * Multi-resolution energy analysis.
   * Returns energy at each decomposition level.
   */
  energyAnalysis(signal: number[], wavelet: "haar" | "db4" = "haar"): {
    levels: number;
    energy: number[];
    totalEnergy: number;
    dominantLevel: number;
    energyPercent: number[];
  } {
    const dwt = wavelet === "db4"
      ? this.db4DWT(signal)
      : this.haarDWT(signal);

    const energy = dwt.details.map(d =>
      d.reduce((s, v) => s + v * v, 0)
    );
    const approxEnergy = dwt.approximation.reduce((s, v) => s + v * v, 0);
    energy.unshift(approxEnergy);

    const totalEnergy = energy.reduce((s, e) => s + e, 0);
    const energyPercent = energy.map(e => totalEnergy > 0 ? (e / totalEnergy) * 100 : 0);
    const dominantLevel = energy.indexOf(Math.max(...energy));

    return {
      levels: dwt.levels,
      energy,
      totalEnergy,
      dominantLevel,
      energyPercent,
    };
  }

  // -------------------------------------------------------------------------
  // DWT internals
  // -------------------------------------------------------------------------

  private _dwt(signal: number[], lpFilter: number[], hpFilter: number[], levels?: number): WaveletResult {
    // Pad to power of 2
    let data = [...signal];
    const origLen = data.length;
    const nextPow2 = 2 ** Math.ceil(Math.log2(origLen));
    while (data.length < nextPow2) data.push(0);

    const maxLevels = levels ?? Math.floor(Math.log2(data.length));
    const details: number[][] = [];
    const energy: number[] = [];
    let approx = data;

    for (let level = 0; level < maxLevels; level++) {
      const n = approx.length;
      if (n < lpFilter.length) break;

      const halfN = Math.floor(n / 2);
      const newApprox = new Array(halfN);
      const detail = new Array(halfN);

      for (let i = 0; i < halfN; i++) {
        let lo = 0, hi = 0;
        for (let k = 0; k < lpFilter.length; k++) {
          const idx = (2 * i + k) % n;
          lo += lpFilter[k] * approx[idx];
          hi += hpFilter[k] * approx[idx];
        }
        newApprox[i] = lo;
        detail[i] = hi;
      }

      details.push(detail);
      energy.push(detail.reduce((s, v) => s + v * v, 0));
      approx = newApprox;
    }

    return { approximation: approx, details, levels: details.length, energy };
  }

  private _idwt(
    approximation: number[], details: number[][],
    lpFilter: number[], hpFilter: number[]
  ): number[] {
    let approx = [...approximation];

    for (let level = details.length - 1; level >= 0; level--) {
      const detail = details[level];
      const n = approx.length;
      const outLen = n * 2;
      const result = new Array(outLen).fill(0);

      // Upsampling + filtering
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < lpFilter.length; k++) {
          const idx = (2 * i + k) % outLen;
          result[idx] += lpFilter[k] * approx[i] + hpFilter[k] * detail[i];
        }
      }

      approx = result;
    }

    return approx;
  }

  private _medianAbsDev(data: number[]): number {
    const sorted = [...data].sort((a, b) => Math.abs(a) - Math.abs(b));
    const mid = Math.floor(sorted.length / 2);
    return Math.abs(sorted[mid]);
  }
}

export const waveletEngine = new WaveletEngineImpl();
