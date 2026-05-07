/**
 * AIReasoningDispatcher.tier10-wire.test.ts
 * U-XPROC-T10-PRISM-AI-WIRE — round-trip smoke through prism_ai for all
 * 4 Tier 10 fusion engines (T10-01 vision, T10-02 timeseries, T10-03 audio,
 * T10-04 modality dropout). Verifies the systemic dual-wiring closure raised
 * by 3-of-3 scrutiny on T10-03 (CLAUDE.md "wire to all consumers" rule).
 *
 * Each test invokes a concrete action through executeAIReasoningAction and
 * asserts the engine's actual numeric/structural output — no toBeTruthy /
 * toBeDefined stubs.
 */

import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("prism_ai — Tier 10 fusion engines (U-XPROC-T10-PRISM-AI-WIRE)", () => {
  // ============================================================================
  // T10-01 — Vision-tabular fusion (concat + projection)
  // ============================================================================

  it("xproc_vision_constants exposes T10-01 dimension limits", async () => {
    const r = await executeAIReasoningAction("xproc_vision_constants", {});
    expect(r.success).toBe(true);
    const d = r.data as { MAX_VISION_DIM: number; MAX_TABULAR_DIM: number; MAX_OUTPUT_DIM: number };
    expect(d.MAX_VISION_DIM).toBe(4096);
    expect(d.MAX_TABULAR_DIM).toBe(256);
    expect(d.MAX_OUTPUT_DIM).toBe(1024);
  });

  it("xproc_vision_fuse rejects empty embedding through prism_ai", async () => {
    const r = await executeAIReasoningAction("xproc_vision_fuse", {
      visionEmbedding: [],
      tabularFeatures: [1],
      projectionMatrix: [[1, 1]],
      bias: [0],
    });
    expect(r.success).toBe(true);
    const d = r.data as { ok: boolean; error?: string };
    expect(d.ok).toBe(false);
    expect(d.error).toBe("invalid_input");
  });

  // ============================================================================
  // T10-02 — TimeSeries-tabular fusion (Gated Multimodal Unit + windowing)
  // ============================================================================

  it("xproc_timeseries_constants exposes T10-02 dimension limits", async () => {
    const r = await executeAIReasoningAction("xproc_timeseries_constants", {});
    expect(r.success).toBe(true);
    const d = r.data as { MAX_TS_DIM: number; MAX_WINDOW_SIZE: number };
    expect(d.MAX_TS_DIM).toBe(4096);
    expect(d.MAX_WINDOW_SIZE).toBe(16384);
  });

  it("xproc_timeseries_segment chops a known signal into 3 non-overlapping windows", async () => {
    const r = await executeAIReasoningAction("xproc_timeseries_segment", {
      signal: [1, 2, 3, 4, 5, 6],
      windowSize: 2,
      stride: 2,
      zscore: false,
    });
    expect(r.success).toBe(true);
    const d = r.data as { ok: boolean; windowCount: number; windows: number[][]; coverage: number };
    expect(d.ok).toBe(true);
    expect(d.windowCount).toBe(3);
    expect(d.windows).toEqual([[1, 2], [3, 4], [5, 6]]);
    expect(d.coverage).toBe(6);
  });

  // ============================================================================
  // T10-03 — Audio-tabular fusion (FFT + chatter score + GMU)
  // ============================================================================

  it("xproc_audio_constants exposes T10-03 dimension + FFT limits", async () => {
    const r = await executeAIReasoningAction("xproc_audio_constants", {});
    expect(r.success).toBe(true);
    const d = r.data as { MAX_AUDIO_DIM: number; MAX_FFT_SIZE: number; MAX_HARMONICS: number };
    expect(d.MAX_AUDIO_DIM).toBe(4096);
    expect(d.MAX_FFT_SIZE).toBe(1_048_576);
    expect(d.MAX_HARMONICS).toBe(16);
  });

  it("xproc_audio_spectral on a 64-Hz sine lands the dominant peak on bin 64", async () => {
    // f=64 lands exactly on a bin: f = k*fs/N → k=64 when fs=N=1024.
    const N = 1024;
    const FS = 1024;
    const signal = new Array<number>(N);
    for (let i = 0; i < N; i++) signal[i] = Math.sin((2 * Math.PI * 64 * i) / FS);
    const r = await executeAIReasoningAction("xproc_audio_spectral", {
      signal, sampleRate: FS, hannWindow: false,
    });
    expect(r.success).toBe(true);
    const d = r.data as {
      ok: boolean; fftSize: number; binWidthHz: number; dominantFreqHz: number;
    };
    expect(d.ok).toBe(true);
    expect(d.fftSize).toBe(1024);
    expect(d.binWidthHz).toBeCloseTo(1, 9);
    expect(d.dominantFreqHz).toBeCloseTo(64, 3);
  });

  it("xproc_audio_chatter_score returns 0 on an all-zero spectrum", async () => {
    // 33-bin spectrum corresponds to fftSize=64. Empty energy → score = 0.
    const r = await executeAIReasoningAction("xproc_audio_chatter_score", {
      powerSpectrum: new Array(33).fill(0),
      sampleRate: 1000,
      toothPassingFreqHz: 100,
    });
    expect(r.success).toBe(true);
    const d = r.data as {
      ok: boolean; score: number; totalEnergy: number; offHarmonicEnergy: number;
    };
    expect(d.ok).toBe(true);
    expect(d.score).toBe(0);
    expect(d.totalEnergy).toBe(0);
    expect(d.offHarmonicEnergy).toBe(0);
  });

  it("xproc_audio_fuse rejects empty audio embedding through prism_ai", async () => {
    const r = await executeAIReasoningAction("xproc_audio_fuse", {
      audioEmbedding: [],
      tabularFeatures: [1],
      wAudio: [[1]],
      wTabular: [[1]],
      wGate: [[1, 1]],
      biasGate: [0],
    });
    expect(r.success).toBe(true);
    const d = r.data as { ok: boolean; error?: string };
    expect(d.ok).toBe(false);
    expect(d.error).toBe("invalid_input");
  });

  // ============================================================================
  // T10-04 — Modality dropout robustifier (graceful missing-modality fusion)
  // ============================================================================

  it("xproc_modality_constants exposes T10-04 modality + embedding limits", async () => {
    const r = await executeAIReasoningAction("xproc_modality_constants", {});
    expect(r.success).toBe(true);
    const d = r.data as { MAX_MODALITIES: number; MAX_EMBEDDING_DIM: number };
    expect(d.MAX_MODALITIES).toBe(16);
    expect(d.MAX_EMBEDDING_DIM).toBe(4096);
  });

  it("xproc_modality_availability reports per-modality availability through prism_ai", async () => {
    const r = await executeAIReasoningAction("xproc_modality_availability", {
      modalities: [
        { modalityName: "vision", embedding: [0.1, 0.2], available: true },
        { modalityName: "audio", embedding: [0.3, 0.4], available: false },
      ],
    });
    expect(r.success).toBe(true);
    const d = r.data as {
      ok: boolean; total: number; present: number; absent: number;
      presentNames: string[]; absentNames: string[];
    };
    expect(d.ok).toBe(true);
    expect(d.total).toBe(2);
    expect(d.present).toBe(1);
    expect(d.absent).toBe(1);
    expect(d.presentNames).toEqual(["vision"]);
    expect(d.absentNames).toEqual(["audio"]);
  });

  // ============================================================================
  // Negative path — unknown xproc_* action surfaces dispatcher error
  // ============================================================================

  it("rejects an unwired xproc action with a structured error", async () => {
    // xproc_audio_bogus is not in AI_REASONING_ACTIONS — Zod enum rejects.
    // Cast through unknown to bypass TS exhaustive-action check (the validator
    // is the system under test here).
    const r = await executeAIReasoningAction(
      "xproc_audio_bogus" as unknown as Parameters<typeof executeAIReasoningAction>[0],
      {},
    );
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});
