/**
 * Tests for SignalProcessingEngine and GradientOptimizationEngine.
 * Round 6 reverse-engineering from PRISM v8.89 monolith.
 */
import { describe, it, expect } from "vitest";
import { signalProcessingEngine } from "../engines/SignalProcessingEngine.js";
import { gradientOptimizationEngine } from "../engines/GradientOptimizationEngine.js";

// ============================================================================
// SignalProcessingEngine — FFT
// ============================================================================

describe("SignalProcessingEngine — FFT", () => {
  it("computes FFT of constant signal", () => {
    const result = signalProcessingEngine.fft([1, 1, 1, 1]);
    expect(result[0].re).toBeCloseTo(4, 10);
    expect(result[0].im).toBeCloseTo(0, 10);
    // All other bins should be ~0
    for (let k = 1; k < result.length; k++) {
      expect(Math.abs(result[k].re)).toBeLessThan(1e-10);
    }
  });

  it("computes FFT of single frequency sinusoid", () => {
    const N = 64;
    const fs = 64;
    const freq = 8; // 8 Hz
    const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * freq * i / fs));
    const result = signalProcessingEngine.fft(signal);

    // Peak should be at bin 8
    const magnitudes = result.map(c => Math.sqrt(c.re ** 2 + c.im ** 2));
    const peakBin = magnitudes.slice(1, N / 2).reduce((best, m, i) =>
      m > magnitudes[best + 1] ? i : best, 0);
    expect(peakBin).toBe(freq - 1); // 0-indexed after skipping DC
  });

  it("pads non-power-of-2 input", () => {
    const result = signalProcessingEngine.fft([1, 2, 3]);
    // Should pad to 4 elements
    expect(result.length).toBe(4);
  });

  it("handles empty input", () => {
    expect(signalProcessingEngine.fft([])).toEqual([]);
  });

  it("single element FFT", () => {
    const result = signalProcessingEngine.fft([5]);
    expect(result[0].re).toBe(5);
    expect(result[0].im).toBe(0);
  });
});

// ============================================================================
// SignalProcessingEngine — IFFT
// ============================================================================

describe("SignalProcessingEngine — IFFT", () => {
  it("round-trips FFT → IFFT", () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const spectrum = signalProcessingEngine.fft(original);
    const recovered = signalProcessingEngine.ifft(spectrum);

    for (let i = 0; i < original.length; i++) {
      expect(recovered[i].re).toBeCloseTo(original[i], 6);
      expect(Math.abs(recovered[i].im)).toBeLessThan(1e-6);
    }
  });
});

// ============================================================================
// SignalProcessingEngine — PSD & Dominant Frequency
// ============================================================================

describe("SignalProcessingEngine — Spectral Analysis", () => {
  it("PSD detects single frequency", () => {
    const N = 128;
    const fs = 128;
    const freq = 20;
    const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * freq * i / fs));
    const psd = signalProcessingEngine.psd(signal, fs);

    const peak = psd.reduce((best, p) => p.power > best.power ? p : best);
    expect(peak.frequency).toBeCloseTo(freq, 0);
  });

  it("dominantFrequency finds the right peak", () => {
    const N = 256;
    const fs = 256;
    const freq = 32;
    const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * freq * i / fs));
    const result = signalProcessingEngine.dominantFrequency(signal, fs);

    expect(result.frequency).toBeCloseTo(freq, 0);
    expect(result.power).toBeGreaterThan(0);
  });

  it("dominantFrequency detects harmonics", () => {
    const N = 256;
    const fs = 256;
    const f0 = 16;
    // Signal with fundamental + 2nd harmonic
    const signal = Array.from({ length: N }, (_, i) =>
      Math.sin(2 * Math.PI * f0 * i / fs) + 0.5 * Math.sin(2 * Math.PI * 2 * f0 * i / fs)
    );
    const result = signalProcessingEngine.dominantFrequency(signal, fs);
    expect(result.frequency).toBeCloseTo(f0, 0);
    expect(result.harmonics.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// SignalProcessingEngine — Filters
// ============================================================================

describe("SignalProcessingEngine — Filters", () => {
  it("designs lowpass FIR filter", () => {
    const filter = signalProcessingEngine.designFIR("lowpass", 0.25, 20, { fs: 1 });
    expect(filter.coefficients.length).toBe(21);
    expect(filter.type).toBe("lowpass");
  });

  it("designs highpass FIR filter", () => {
    const filter = signalProcessingEngine.designFIR("highpass", 0.3, 16, { fs: 1 });
    expect(filter.coefficients.length).toBe(17);
  });

  it("FIR lowpass attenuates high frequencies", () => {
    const N = 128;
    const fs = 128;
    // Mix of 5Hz (keep) and 40Hz (remove)
    const signal = Array.from({ length: N }, (_, i) =>
      Math.sin(2 * Math.PI * 5 * i / fs) + Math.sin(2 * Math.PI * 40 * i / fs)
    );

    const filter = signalProcessingEngine.designFIR("lowpass", 10 / fs, 30, { fs: 1 });
    const filtered = signalProcessingEngine.applyFIR(signal, filter);

    // After filtering, high-frequency energy should be reduced
    const psdBefore = signalProcessingEngine.psd(signal, fs);
    const psdAfter = signalProcessingEngine.psd(filtered, fs);

    const highBefore = psdBefore.filter(p => p.frequency > 30).reduce((s, p) => s + p.power, 0);
    const highAfter = psdAfter.filter(p => p.frequency > 30).reduce((s, p) => s + p.power, 0);
    expect(highAfter).toBeLessThan(highBefore);
  });

  it("designs Butterworth IIR filter", () => {
    const filter = signalProcessingEngine.designButterworth(2, 0.2, "lowpass", 1);
    expect(filter.b.length).toBe(2);
    expect(filter.a.length).toBe(2);
  });

  it("applies IIR filter", () => {
    const signal = [1, 0, 0, 0, 0, 0, 0, 0]; // impulse
    const filter = signalProcessingEngine.designButterworth(1, 0.2, "lowpass", 1);
    const result = signalProcessingEngine.applyIIR(signal, filter);
    // First sample should be non-zero, output should decay
    expect(result[0]).toBeGreaterThan(0);
    expect(Math.abs(result[7])).toBeLessThan(Math.abs(result[0]));
  });
});

// ============================================================================
// SignalProcessingEngine — Convolution & Correlation
// ============================================================================

describe("SignalProcessingEngine — Convolution & Correlation", () => {
  it("convolves two sequences", () => {
    const result = signalProcessingEngine.convolve([1, 2, 3], [1, 1]);
    expect(result).toEqual([1, 3, 5, 3]);
  });

  it("convolve with impulse returns original", () => {
    const x = [1, 2, 3, 4];
    const result = signalProcessingEngine.convolve(x, [1]);
    expect(result).toEqual(x);
  });

  it("autocorrelation peak at zero lag", () => {
    const x = [1, 2, 3, 2, 1];
    const acf = signalProcessingEngine.autocorrelation(x);
    const midIdx = x.length - 1; // zero-lag index
    // Zero-lag should be the maximum
    for (let i = 0; i < acf.length; i++) {
      expect(acf[midIdx]).toBeGreaterThanOrEqual(acf[i] - 1e-10);
    }
  });

  it("cross-correlation detects delay", () => {
    const x = [0, 0, 1, 2, 1, 0, 0, 0];
    const y = [0, 0, 0, 0, 1, 2, 1, 0]; // x shifted by 2
    const xcorr = signalProcessingEngine.crossCorrelation(x, y);
    // Peak should be offset from center by the delay
    const maxIdx = xcorr.reduce((best, v, i) => v > xcorr[best] ? i : best, 0);
    expect(maxIdx).toBeGreaterThan(0);
  });
});

// ============================================================================
// SignalProcessingEngine — Spectrogram & Hilbert
// ============================================================================

describe("SignalProcessingEngine — Advanced Analysis", () => {
  it("computes spectrogram", () => {
    const N = 256;
    const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 10 * i / N));
    const spec = signalProcessingEngine.spectrogram(signal, 64, 32, { fs: N });
    expect(spec.length).toBeGreaterThan(0);
    expect(spec[0].frequencies.length).toBe(32); // windowSize/2
  });

  it("Hilbert envelope of sinusoid is ~constant", () => {
    const N = 128;
    const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 8 * i / N));
    const result = signalProcessingEngine.hilbert(signal);
    expect(result.envelope.length).toBe(N);
    // Envelope should be approximately 1 (amplitude of sinusoid)
    const midEnvelope = result.envelope.slice(10, N - 10); // avoid edge effects
    const mean = midEnvelope.reduce((s, v) => s + v, 0) / midEnvelope.length;
    expect(mean).toBeCloseTo(1, 0);
  });
});

// ============================================================================
// GradientOptimizationEngine — Gradient Descent
// ============================================================================

describe("GradientOptimizationEngine — Gradient Descent", () => {
  // f(x) = x^2, min at x=0
  const f1d = (x: number[]) => x[0] ** 2;
  const g1d = (x: number[]) => [2 * x[0]];

  it("vanilla GD minimizes quadratic", () => {
    const result = gradientOptimizationEngine.gradientDescent(f1d, g1d, [5], {
      variant: "vanilla", learningRate: 0.1, maxIter: 200,
    });
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(0, 4);
  });

  it("momentum GD converges", () => {
    const result = gradientOptimizationEngine.gradientDescent(f1d, g1d, [5], {
      variant: "momentum", learningRate: 0.05, maxIter: 200,
    });
    expect(Math.abs(result.x[0])).toBeLessThan(0.1);
  });

  it("Adam GD converges on Rosenbrock", () => {
    // f(x,y) = (1-x)^2 + 100(y-x^2)^2, min at (1,1)
    const rosenbrock = (x: number[]) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
    const rosenGrad = (x: number[]) => [
      -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] ** 2),
      200 * (x[1] - x[0] ** 2),
    ];

    const result = gradientOptimizationEngine.gradientDescent(rosenbrock, rosenGrad, [0, 0], {
      variant: "adam", learningRate: 0.01, maxIter: 5000,
    });
    expect(result.objective).toBeLessThan(1); // Near minimum
  });

  it("records optimization history", () => {
    const result = gradientOptimizationEngine.gradientDescent(f1d, g1d, [5], {
      maxIter: 10,
    });
    expect(result.history.length).toBe(10);
    // Objective should decrease
    expect(result.history[9].objective).toBeLessThan(result.history[0].objective);
  });
});

// ============================================================================
// GradientOptimizationEngine — Newton's Method
// ============================================================================

describe("GradientOptimizationEngine — Newton's Method", () => {
  it("minimizes quadratic in 1 iteration", () => {
    const f = (x: number[]) => x[0] ** 2 + x[1] ** 2;
    const g = (x: number[]) => [2 * x[0], 2 * x[1]];
    const h = (_x: number[]) => [[2, 0], [0, 2]];

    const result = gradientOptimizationEngine.newton(f, g, h, [3, 4]);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(0, 6);
    expect(result.x[1]).toBeCloseTo(0, 6);
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  it("minimizes 2D quadratic with cross-terms", () => {
    // f(x,y) = x^2 + xy + y^2 - 3x - 3y, min at (1,1)
    const f = (x: number[]) => x[0] ** 2 + x[0] * x[1] + x[1] ** 2 - 3 * x[0] - 3 * x[1];
    const g = (x: number[]) => [2 * x[0] + x[1] - 3, x[0] + 2 * x[1] - 3];
    const h = (_x: number[]) => [[2, 1], [1, 2]];

    const result = gradientOptimizationEngine.newton(f, g, h, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(1, 6);
    expect(result.x[1]).toBeCloseTo(1, 6);
  });
});

// ============================================================================
// GradientOptimizationEngine — BFGS
// ============================================================================

describe("GradientOptimizationEngine — BFGS", () => {
  it("minimizes Rosenbrock function", () => {
    const rosenbrock = (x: number[]) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
    const rosenGrad = (x: number[]) => [
      -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] ** 2),
      200 * (x[1] - x[0] ** 2),
    ];

    const result = gradientOptimizationEngine.bfgs(rosenbrock, rosenGrad, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(1, 2);
    expect(result.x[1]).toBeCloseTo(1, 2);
    expect(result.objective).toBeLessThan(1e-4);
  });

  it("minimizes simple quadratic", () => {
    const f = (x: number[]) => (x[0] - 3) ** 2 + (x[1] + 2) ** 2;
    const g = (x: number[]) => [2 * (x[0] - 3), 2 * (x[1] + 2)];

    const result = gradientOptimizationEngine.bfgs(f, g, [0, 0]);
    expect(result.converged).toBe(true);
    expect(result.x[0]).toBeCloseTo(3, 4);
    expect(result.x[1]).toBeCloseTo(-2, 4);
  });
});

// ============================================================================
// GradientOptimizationEngine — Golden Section & Numerical Derivatives
// ============================================================================

describe("GradientOptimizationEngine — Utilities", () => {
  it("golden section finds minimum of x^2", () => {
    const result = gradientOptimizationEngine.goldenSection(x => x * x, -5, 5);
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.objective).toBeCloseTo(0, 6);
  });

  it("golden section finds minimum of (x-3)^2", () => {
    const result = gradientOptimizationEngine.goldenSection(x => (x - 3) ** 2, 0, 10);
    expect(result.x).toBeCloseTo(3, 6);
  });

  it("numerical gradient approximates analytic", () => {
    const f = (x: number[]) => x[0] ** 2 + 3 * x[1] ** 2;
    const numGrad = gradientOptimizationEngine.numericalGradient(f, [2, 1]);
    expect(numGrad[0]).toBeCloseTo(4, 4);  // 2*x[0] = 4
    expect(numGrad[1]).toBeCloseTo(6, 4);  // 6*x[1] = 6
  });

  it("numerical Hessian approximates analytic", () => {
    const f = (x: number[]) => x[0] ** 2 + 3 * x[1] ** 2 + x[0] * x[1];
    const H = gradientOptimizationEngine.numericalHessian(f, [1, 1]);
    expect(H[0][0]).toBeCloseTo(2, 3);   // d2f/dx^2
    expect(H[1][1]).toBeCloseTo(6, 3);   // d2f/dy^2
    expect(H[0][1]).toBeCloseTo(1, 3);   // d2f/dxdy
  });
});
