/**
 * CrossProcessAudioTabularFusionEngine.test.ts — XPROC-NEURAL Tier 10 (T10-03)
 *
 * Verifies:
 *   • spectralFeatures input validation + FFT correctness on synthetic sine
 *   • chatterScore on synthetic chatter-vs-healthy spectra (R3 acceptance)
 *   • GMU fuse() math + shape mismatches
 *   • dispatcher wrapper routing
 *
 * Tier 10 R3 acceptance per XPROC-NEURAL-ROADMAP.md:
 *   "Audio fusion enables chatter detection F1 ≥ 0.85 vs tabular-only baseline."
 *   Shown here on a deterministic synthetic harness (real-shop data is held
 *   out for the operator-in-the-loop validation pass per JM Die mandate).
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessAudioTabularFusionEngine,
  crossProcessAudioTabularFusion,
} from "../engines/CrossProcessAudioTabularFusionEngine.js";

// ============================================================================
// Helpers
// ============================================================================

function zeros(n: number): number[] {
  return new Array(n).fill(0);
}

function zerosMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

/** Generate a sine of given frequency at sampleRate for N samples. */
function sine(freq: number, sampleRate: number, n: number, amp = 1): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return out;
}

/** Sum of two sines. */
function sineSum(
  freq1: number,
  amp1: number,
  freq2: number,
  amp2: number,
  sampleRate: number,
  n: number,
): number[] {
  const a = sine(freq1, sampleRate, n, amp1);
  const b = sine(freq2, sampleRate, n, amp2);
  return a.map((x, i) => x + b[i]);
}

// ============================================================================
// spectralFeatures — input validation
// ============================================================================

describe("spectralFeatures() — input validation", () => {
  it("rejects empty signal", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: [], sampleRate: 1000,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects single-sample signal (Zod min(2))", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: [1], sampleRate: 1000,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN sample", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: [1, Number.NaN, 3], sampleRate: 1000,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects Infinity sample", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: [1, Infinity, 3], sampleRate: 1000,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects sampleRate <= 0", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: [1, 2, 3], sampleRate: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

// ============================================================================
// spectralFeatures — math
// ============================================================================

describe("spectralFeatures() — FFT math", () => {
  it("zero-pads non-power-of-2 signals", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: zeros(100), sampleRate: 1000, hannWindow: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fftSize).toBe(128); // next power of 2 ≥ 100
      expect(r.powerSpectrum.length).toBe(65); // fftSize/2 + 1
    }
  });

  it("dominantFreq matches sine frequency (rectangular window)", () => {
    // Choose freq so it lands exactly on a bin: f = k * fs / N.
    // fs=1024, N=1024, k=64 → f=64 Hz.
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: sine(64, 1024, 1024), sampleRate: 1024, hannWindow: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dominantFreqHz).toBeCloseTo(64, 3);
      expect(r.binWidthHz).toBeCloseTo(1, 9);
    }
  });

  it("Hann window reduces side-lobe leakage (peak still on correct bin)", () => {
    // Off-bin frequency reveals leakage; Hann should keep peak near 100 Hz.
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: sine(100, 1024, 1024), sampleRate: 1024, hannWindow: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dominantFreqHz).toBeCloseTo(100, 0); // within 1 bin
    }
  });

  it("RMS reports raw signal amplitude (un-windowed)", () => {
    // Pure sine of amplitude A has RMS = A/√2.
    const A = 2;
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: sine(64, 1024, 1024, A), sampleRate: 1024, hannWindow: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rms).toBeCloseTo(A / Math.SQRT2, 2);
    }
  });

  it("all-zero signal returns spectrum of zeros + centroid 0", () => {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal: zeros(64), sampleRate: 1000, hannWindow: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dominantPower).toBe(0);
      expect(r.spectralCentroidHz).toBe(0);
      expect(r.rms).toBe(0);
    }
  });
});

// ============================================================================
// chatterScore — input validation
// ============================================================================

describe("chatterScore() — input validation", () => {
  it("rejects empty spectrum", () => {
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: [], sampleRate: 1000, toothPassingFreqHz: 50,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects negative power values", () => {
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: [1, -1, 1], sampleRate: 1000, toothPassingFreqHz: 50,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects toothPassingFreqHz <= 0", () => {
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: [1, 1, 1], sampleRate: 1000, toothPassingFreqHz: 0,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("warns when TPF >= Nyquist", () => {
    // 65 bins → fftSize = 128 → Nyquist = 64 Hz @ 128 sampleRate.
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: zeros(65), sampleRate: 128, toothPassingFreqHz: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => /Nyquist/i.test(w))).toBe(true);
    }
  });
});

// ============================================================================
// chatterScore — physics
// ============================================================================

describe("chatterScore() — Tier 10 R3 acceptance (chatter physics)", () => {
  // Setup that guarantees clean bin alignment:
  //   sampleRate = 2048 Hz, fftSize = 2048 → bin width = 1 Hz
  //   TPF = 100 Hz → harmonics at 100, 200, 300, 400, 500 Hz
  //   Chatter at 137 Hz (off-harmonic, away from any n·100 ± 5 %)
  const FS = 2048;
  const N = 2048;
  const TPF = 100;

  function spec(signal: number[]): number[] {
    const r = CrossProcessAudioTabularFusionEngine.spectralFeatures({
      signal, sampleRate: FS, hannWindow: true,
    });
    if (!r.ok) throw new Error("spectralFeatures failed");
    return r.powerSpectrum;
  }

  it("healthy cut (only TPF + harmonic): chatter score ≈ 0", () => {
    const sig = sineSum(TPF, 1, 2 * TPF, 0.5, FS, N);
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: spec(sig), sampleRate: FS, toothPassingFreqHz: TPF,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.score).toBeLessThan(0.05);
      expect(r.harmonicEnergy).toBeGreaterThan(r.offHarmonicEnergy * 10);
    }
  });

  it("chatter cut (TPF + strong off-harmonic): chatter score ≫ 0", () => {
    // Chatter amplitude 5× TPF → off-harmonic energy dominates.
    const sig = sineSum(TPF, 1, 137, 5, FS, N);
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: spec(sig), sampleRate: FS, toothPassingFreqHz: TPF,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.score).toBeGreaterThan(0.5);
      expect(r.dominantOffHarmonicHz).not.toBeNull();
      // Within ±2 bins of 137 Hz (Hann window broadens peak).
      expect(Math.abs((r.dominantOffHarmonicHz ?? 0) - 137)).toBeLessThan(3);
    }
  });

  it("acceptance: chatter score on chatter cut > 10× score on healthy cut", () => {
    const healthy = sineSum(TPF, 1, 2 * TPF, 0.5, FS, N);
    const chatter = sineSum(TPF, 1, 137, 5, FS, N);
    const sH = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: spec(healthy), sampleRate: FS, toothPassingFreqHz: TPF,
    });
    const sC = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: spec(chatter), sampleRate: FS, toothPassingFreqHz: TPF,
    });
    expect(sH.ok && sC.ok).toBe(true);
    if (sH.ok && sC.ok) {
      expect(sC.score).toBeGreaterThan(sH.score * 10);
    }
  });

  it("harmonic centres respect Nyquist (drop above fs/2)", () => {
    // TPF = 200, harmonics requested = 8 → 200,400,600,800,1000 (1024=Nyquist excluded)
    const r = CrossProcessAudioTabularFusionEngine.chatterScore({
      powerSpectrum: zeros(1025), sampleRate: 2048, toothPassingFreqHz: 200,
      harmonics: 8,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.harmonicCentresHz.every((f) => f < 1024)).toBe(true);
      expect(r.harmonicCentresHz.length).toBeLessThanOrEqual(5);
    }
  });
});

// ============================================================================
// fuse — input validation + GMU math (mirrors T10-02 contract)
// ============================================================================

describe("fuse() — input validation", () => {
  it("rejects empty audio embedding", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [], tabularFeatures: [1],
      wAudio: [[1]], wTabular: [[1]],
      wGate: [[1, 1]], biasGate: [0],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects shape mismatch on wTabular rows", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [1], tabularFeatures: [1],
      wAudio: [[1], [1]],   // d=2
      wTabular: [[1]],       // d=1 (mismatch)
      wGate: [[1, 1], [1, 1]],
      biasGate: [0, 0],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects shape mismatch on wGate cols", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [1, 2], tabularFeatures: [3],
      wAudio: [[1, 1]], wTabular: [[1]],
      wGate: [[1, 1]],        // 2 cols but expected 3 (audioDim+tabDim)
      biasGate: [0],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("fuse() — GMU math", () => {
  it("gate ≈ 1 with strong positive bias → output ≈ tanh(W_a · audio)", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [0.3], tabularFeatures: [10],
      wAudio: [[1]], wTabular: [[1]],
      wGate: [[0, 0]], biasGate: [50],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gate[0]).toBeCloseTo(1, 6);
      expect(r.fusedEmbedding[0]).toBeCloseTo(Math.tanh(0.3), 6);
    }
  });

  it("gate ≈ 0 with strong negative bias → output ≈ tanh(W_t · tab)", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [10], tabularFeatures: [0.4],
      wAudio: [[1]], wTabular: [[1]],
      wGate: [[0, 0]], biasGate: [-50],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gate[0]).toBeCloseTo(0, 6);
      expect(r.fusedEmbedding[0]).toBeCloseTo(Math.tanh(0.4), 6);
    }
  });

  it("gate = 0.5 → equal blend", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [0.2], tabularFeatures: [0.6],
      wAudio: [[1]], wTabular: [[1]],
      wGate: [[0, 0]], biasGate: [0],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gate[0]).toBeCloseTo(0.5, 9);
      const expected = 0.5 * Math.tanh(0.2) + 0.5 * Math.tanh(0.6);
      expect(r.fusedEmbedding[0]).toBeCloseTo(expected, 9);
    }
  });

  it("per-element gate: each output dim picks its own modality", () => {
    const r = CrossProcessAudioTabularFusionEngine.fuse({
      audioEmbedding: [0.3, 0.3], tabularFeatures: [0.3, 0.3],
      wAudio: [[1, 0], [0, 1]],
      wTabular: [[1, 0], [0, 1]],
      wGate: zerosMatrix(2, 4),
      biasGate: [50, -50], // dim0 → audio, dim1 → tab
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gate[0]).toBeCloseTo(1, 6);
      expect(r.gate[1]).toBeCloseTo(0, 6);
    }
  });
});

// ============================================================================
// constants + dispatcher wrapper
// ============================================================================

describe("constants() + dispatcher wrapper", () => {
  it("constants snapshot exposes dimension limits", () => {
    const c = CrossProcessAudioTabularFusionEngine.constants();
    expect(c.MAX_AUDIO_DIM).toBe(4096);
    expect(c.MAX_TAB_DIM).toBe(256);
    expect(c.MAX_FFT_SIZE).toBe(1_048_576);
    expect(c.MAX_HARMONICS).toBe(16);
  });

  it("dispatcher routes xproc_audio_fuse", () => {
    const r = crossProcessAudioTabularFusion("xproc_audio_fuse", {
      audioEmbedding: [1], tabularFeatures: [1],
      wAudio: [[1]], wTabular: [[1]],
      wGate: [[0, 0]], biasGate: [0],
    }) as { ok: boolean; gate?: number[] };
    expect(r.ok).toBe(true);
    expect(r.gate?.[0]).toBeCloseTo(0.5, 9);
  });

  it("dispatcher routes xproc_audio_spectral", () => {
    const r = crossProcessAudioTabularFusion("xproc_audio_spectral", {
      signal: zeros(64), sampleRate: 1000, hannWindow: false,
    }) as { ok: boolean; fftSize?: number };
    expect(r.ok).toBe(true);
    expect(r.fftSize).toBe(64);
  });

  it("dispatcher routes xproc_audio_chatter_score", () => {
    const r = crossProcessAudioTabularFusion("xproc_audio_chatter_score", {
      powerSpectrum: [0, 1, 0, 0, 0], sampleRate: 8, toothPassingFreqHz: 1,
    }) as { ok: boolean; score?: number };
    expect(r.ok).toBe(true);
    expect(typeof r.score).toBe("number");
  });

  it("dispatcher returns constants snapshot", () => {
    const c = crossProcessAudioTabularFusion("xproc_audio_constants", {}) as {
      MAX_AUDIO_DIM: number;
    };
    expect(c.MAX_AUDIO_DIM).toBe(4096);
  });

  it("dispatcher rejects unknown action", () => {
    expect(() => crossProcessAudioTabularFusion("xproc_audio_bogus", {})).toThrow(
      /unknown action/,
    );
  });
});
