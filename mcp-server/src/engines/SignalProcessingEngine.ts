/**
 * SignalProcessingEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * FFT, filtering, spectral analysis, and signal processing primitives.
 * Manufacturing applications: vibration analysis, chatter detection,
 * surface finish frequency content, spindle runout analysis.
 *
 * Source: PRISM_SIGNAL_ALGORITHMS (MIT 18.086, Berkeley EE120/EE123)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Complex {
  re: number;
  im: number;
}

export interface PSDPoint {
  frequency: number;
  power: number;
}

export interface SpectrogramFrame {
  time: number;
  frequencies: Array<{ frequency: number; magnitude: number }>;
}

export interface FIRFilter {
  coefficients: number[];
  order: number;
  type: string;
  window: string;
}

export interface IIRFilter {
  b: number[];
  a: number[];
  type: string;
  order: number;
}

export interface HilbertResult {
  envelope: number[];
  instantPhase: number[];
  analytic: Complex[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class SignalProcessingEngineImpl {

  /**
   * Cooley-Tukey FFT. Input is zero-padded to next power of 2.
   */
  fft(x: number[]): Complex[] {
    const n = x.length;
    if (n === 0) return [];
    if (n === 1) return [{ re: x[0], im: 0 }];

    // Pad to next power of 2
    if (n & (n - 1)) {
      const nextPow2 = Math.pow(2, Math.ceil(Math.log2(n)));
      const padded = [...x, ...new Array(nextPow2 - n).fill(0)];
      return this.fft(padded);
    }

    const even: number[] = [];
    const odd: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i % 2 === 0) even.push(x[i]);
      else odd.push(x[i]);
    }

    const evenFFT = this.fft(even);
    const oddFFT = this.fft(odd);

    const result = new Array<Complex>(n);
    for (let k = 0; k < n / 2; k++) {
      const angle = -2 * Math.PI * k / n;
      const twiddle: Complex = { re: Math.cos(angle), im: Math.sin(angle) };
      const t = this._complexMult(twiddle, oddFFT[k]);

      result[k] = { re: evenFFT[k].re + t.re, im: evenFFT[k].im + t.im };
      result[k + n / 2] = { re: evenFFT[k].re - t.re, im: evenFFT[k].im - t.im };
    }

    return result;
  }

  /**
   * Inverse FFT via conjugate trick.
   */
  ifft(X: Complex[]): Complex[] {
    const n = X.length;
    if (n === 0) return [];

    const conjX = X.map(x => x.re); // Take real of conjugate for FFT input
    // Full IFFT: conjugate → FFT → conjugate → scale
    const realConj = X.map(c => c.re);
    const imagConj = X.map(c => -c.im);

    // Build real array from conjugate for recursive FFT
    // Use DFT definition directly for correctness
    const result: Complex[] = new Array(n);
    for (let k = 0; k < n; k++) {
      let re = 0, im = 0;
      for (let j = 0; j < n; j++) {
        const angle = 2 * Math.PI * j * k / n;
        re += X[j].re * Math.cos(angle) - X[j].im * Math.sin(angle);
        im += X[j].re * Math.sin(angle) + X[j].im * Math.cos(angle);
      }
      result[k] = { re: re / n, im: im / n };
    }
    return result;
  }

  /**
   * Power Spectral Density estimate.
   */
  psd(x: number[], fs: number = 1): PSDPoint[] {
    const X = this.fft(x);
    const n = X.length;
    const result: PSDPoint[] = [];

    for (let k = 0; k < n / 2; k++) {
      const mag = X[k].re * X[k].re + X[k].im * X[k].im;
      result.push({ frequency: k * fs / n, power: mag / n });
    }

    return result;
  }

  /**
   * Dominant frequency detection — finds peak in PSD.
   */
  dominantFrequency(x: number[], fs: number = 1): { frequency: number; power: number; harmonics: PSDPoint[] } {
    const spectrum = this.psd(x, fs);
    if (spectrum.length === 0) return { frequency: 0, power: 0, harmonics: [] };

    // Skip DC component
    let maxPower = 0;
    let maxIdx = 1;
    for (let i = 1; i < spectrum.length; i++) {
      if (spectrum[i].power > maxPower) {
        maxPower = spectrum[i].power;
        maxIdx = i;
      }
    }

    const fundamental = spectrum[maxIdx];

    // Find harmonics (2x, 3x, 4x fundamental)
    const harmonics: PSDPoint[] = [fundamental];
    for (let h = 2; h <= 4; h++) {
      const targetFreq = fundamental.frequency * h;
      const closest = spectrum.reduce((best, p) =>
        Math.abs(p.frequency - targetFreq) < Math.abs(best.frequency - targetFreq) ? p : best
      );
      if (Math.abs(closest.frequency - targetFreq) < fs / x.length * 2) {
        harmonics.push(closest);
      }
    }

    return { frequency: fundamental.frequency, power: fundamental.power, harmonics };
  }

  /**
   * FIR filter design via window method.
   */
  designFIR(
    type: "lowpass" | "highpass",
    cutoff: number,
    order: number,
    options: { window?: "hamming" | "hanning" | "blackman" | "rectangular"; fs?: number } = {}
  ): FIRFilter {
    const window = options.window ?? "hamming";
    const fs = options.fs ?? 1;

    const N = order + 1;
    const wc = 2 * Math.PI * cutoff / fs;
    const h = new Array(N);

    for (let n = 0; n < N; n++) {
      const m = n - order / 2;
      if (Math.abs(m) < 1e-15) {
        h[n] = type === "lowpass" ? wc / Math.PI : 1 - wc / Math.PI;
      } else {
        const sinc = Math.sin(wc * m) / (Math.PI * m);
        h[n] = type === "lowpass" ? sinc : -sinc;
      }
    }

    const w = this._getWindow(window, N);
    for (let n = 0; n < N; n++) {
      h[n] *= w[n];
    }

    return { coefficients: h, order, type, window };
  }

  /**
   * Butterworth IIR filter (1st-order bilinear transform approximation).
   */
  designButterworth(
    order: number,
    cutoff: number,
    type: "lowpass" | "highpass" = "lowpass",
    fs: number = 1
  ): IIRFilter {
    const alpha = Math.sin(Math.PI * cutoff / fs) / Math.cos(Math.PI * cutoff / fs);

    const b: number[] = [];
    const a: number[] = [1];

    if (type === "lowpass") {
      b.push(alpha / (1 + alpha));
      b.push(alpha / (1 + alpha));
    } else {
      b.push(1 / (1 + alpha));
      b.push(-1 / (1 + alpha));
    }
    a.push((alpha - 1) / (1 + alpha));

    return { b, a, type, order };
  }

  /**
   * Apply FIR filter via convolution.
   */
  applyFIR(x: number[], filter: FIRFilter): number[] {
    return this.convolve(x, filter.coefficients).slice(0, x.length);
  }

  /**
   * Apply IIR filter (Direct Form II).
   */
  applyIIR(x: number[], filter: IIRFilter): number[] {
    const { b, a } = filter;
    const n = x.length;
    const y = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < b.length; j++) {
        if (i - j >= 0) y[i] += b[j] * x[i - j];
      }
      for (let j = 1; j < a.length; j++) {
        if (i - j >= 0) y[i] -= a[j] * y[i - j];
      }
    }

    return y;
  }

  /**
   * Linear convolution of two sequences.
   */
  convolve(x: number[], h: number[]): number[] {
    const nx = x.length;
    const nh = h.length;
    const ny = nx + nh - 1;
    const y = new Array(ny).fill(0);

    for (let n = 0; n < ny; n++) {
      for (let k = 0; k < nh; k++) {
        if (n - k >= 0 && n - k < nx) {
          y[n] += h[k] * x[n - k];
        }
      }
    }

    return y;
  }

  /**
   * Cross-correlation between two signals.
   */
  crossCorrelation(x: number[], y: number[]): number[] {
    const nx = x.length;
    const ny = y.length;
    const n = nx + ny - 1;
    const result = new Array(n).fill(0);

    for (let lag = -(ny - 1); lag < nx; lag++) {
      let sum = 0;
      for (let i = 0; i < ny; i++) {
        const j = i + lag;
        if (j >= 0 && j < nx) sum += x[j] * y[i];
      }
      result[lag + ny - 1] = sum;
    }

    return result;
  }

  /**
   * Autocorrelation of a signal.
   */
  autocorrelation(x: number[]): number[] {
    return this.crossCorrelation(x, x);
  }

  /**
   * Short-Time Fourier Transform (spectrogram).
   */
  spectrogram(
    x: number[],
    windowSize: number,
    hopSize: number,
    options: { window?: "hamming" | "hanning" | "blackman" | "rectangular"; fs?: number } = {}
  ): SpectrogramFrame[] {
    const window = options.window ?? "hamming";
    const fs = options.fs ?? 1;

    const w = this._getWindow(window, windowSize);
    const numFrames = Math.floor((x.length - windowSize) / hopSize) + 1;
    const frames: SpectrogramFrame[] = [];

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      const segment = x.slice(start, start + windowSize).map((xi, i) => xi * w[i]);
      const fftResult = this.fft(segment);

      const magnitudes: Array<{ frequency: number; magnitude: number }> = [];
      for (let k = 0; k < windowSize / 2; k++) {
        const mag = Math.sqrt(fftResult[k].re ** 2 + fftResult[k].im ** 2);
        magnitudes.push({ frequency: k * fs / windowSize, magnitude: mag });
      }

      frames.push({ time: start / fs, frequencies: magnitudes });
    }

    return frames;
  }

  /**
   * Hilbert transform for envelope and instantaneous phase.
   */
  hilbert(x: number[]): HilbertResult {
    const n = x.length;
    if (n === 0) return { envelope: [], instantPhase: [], analytic: [] };

    const X = this.fft(x);
    const paddedN = X.length;

    // Create analytic signal spectrum
    const H: Complex[] = new Array(paddedN);
    H[0] = X[0];
    for (let k = 1; k < paddedN / 2; k++) {
      H[k] = { re: 2 * X[k].re, im: 2 * X[k].im };
    }
    if (paddedN % 2 === 0) {
      H[paddedN / 2] = X[paddedN / 2];
    }
    for (let k = Math.ceil(paddedN / 2) + 1; k < paddedN; k++) {
      H[k] = { re: 0, im: 0 };
    }

    const analytic = this.ifft(H).slice(0, n);

    return {
      envelope: analytic.map(a => Math.sqrt(a.re ** 2 + a.im ** 2)),
      instantPhase: analytic.map(a => Math.atan2(a.im, a.re)),
      analytic,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _complexMult(a: Complex, b: Complex): Complex {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re,
    };
  }

  private _getWindow(type: string, N: number): number[] {
    const w = new Array(N);
    for (let n = 0; n < N; n++) {
      switch (type) {
        case "hamming":
          w[n] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
          break;
        case "hanning":
          w[n] = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
          break;
        case "blackman":
          w[n] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1));
          break;
        default:
          w[n] = 1;
      }
    }
    return w;
  }
}

export const signalProcessingEngine = new SignalProcessingEngineImpl();
