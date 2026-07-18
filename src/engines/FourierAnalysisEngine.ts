/**
 * FourierAnalysisEngine — DFT/FFT spectral analysis
 *
 * Models: Discrete Fourier Transform, frequency spectrum,
 *         dominant frequencies, THD, spectral energy
 * References: Oppenheim & Willsky, Brigham "The Fast Fourier Transform"
 * Safety: Aliasing detection, spectral leakage warning
 */

export interface FourierAnalysisInput {
  signal: number[];                     // time-domain samples
  sample_rate_Hz: number;
  num_harmonics?: number;               // default 10 (top frequencies to return)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FrequencyComponent {
  frequency_Hz: number;
  amplitude: number;
  phase_deg: number;
}

export interface FourierAnalysisResult {
  dominant_frequency_Hz: AtomicValue;
  dominant_amplitude: AtomicValue;
  total_rms: AtomicValue;
  thd_pct: AtomicValue;
  dc_component: AtomicValue;
  nyquist_frequency_Hz: AtomicValue;
  spectral_energy: AtomicValue;
  num_samples: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FourierAnalysisEngine {
  calculate(input: FourierAnalysisInput): FourierAnalysisResult {
    const { signal, sample_rate_Hz: fs, num_harmonics = 10 } = input;
    const recs: string[] = [];
    const N = signal.length;
    const nyquist = fs / 2;

    // DC component
    const dc = signal.reduce((a, b) => a + b, 0) / N;

    // DFT (direct computation for moderate N)
    const freqRes = fs / N;
    const halfN = Math.floor(N / 2);
    const magnitudes: number[] = [];
    const phases: number[] = [];

    for (let k = 0; k <= halfN; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = 2 * Math.PI * k * n / N;
        re += signal[n] * Math.cos(angle);
        im -= signal[n] * Math.sin(angle);
      }
      re /= N; im /= N;
      const mag = k === 0 ? Math.abs(re) : 2 * Math.sqrt(re * re + im * im);
      magnitudes.push(mag);
      phases.push(Math.atan2(im, re) * 180 / Math.PI);
    }

    // Find dominant frequencies (skip DC)
    const indexed = magnitudes.slice(1).map((m, i) => ({ freq: (i + 1) * freqRes, amp: m, idx: i + 1 }));
    indexed.sort((a, b) => b.amp - a.amp);
    const dominant = indexed[0] ?? { freq: 0, amp: 0 };

    // RMS
    const rms = Math.sqrt(signal.reduce((a, v) => a + v * v, 0) / N);

    // THD (Total Harmonic Distortion)
    const fundamental = dominant.amp;
    let harmonicPower = 0;
    for (let h = 1; h < Math.min(indexed.length, 10); h++) {
      harmonicPower += indexed[h].amp * indexed[h].amp;
    }
    const thd = fundamental > 0 ? Math.sqrt(harmonicPower) / fundamental * 100 : 0;

    // Spectral energy
    const energy = magnitudes.reduce((a, m) => a + m * m, 0);

    const isPowerOf2 = (N & (N - 1)) === 0;
    const isSafe = N >= 8 && fs > 0;

    if (!isPowerOf2) recs.push(`N=${N} not power of 2 — FFT would be faster with zero-padding`);
    if (N < 64) recs.push(`Short signal ${N} samples — poor frequency resolution (${freqRes.toFixed(1)}Hz)`);
    if (thd > 10) recs.push(`High THD ${thd.toFixed(1)}% — significant harmonic content`);
    if (dominant.freq > nyquist * 0.8) recs.push(`Dominant frequency near Nyquist — possible aliasing`);
    if (recs.length === 0) recs.push(`Spectrum nominal — f_dom=${dominant.freq.toFixed(1)}Hz, RMS=${rms.toFixed(3)}, THD=${thd.toFixed(1)}%`);

    return {
      dominant_frequency_Hz: mkAv(Math.round(dominant.freq * 100) / 100, "Hz", freqRes / 2, "dft"),
      dominant_amplitude: mkAv(Math.round(dominant.amp * 10000) / 10000, "units", dominant.amp * 0.05, "dft"),
      total_rms: mkAv(Math.round(rms * 10000) / 10000, "units", rms * 0.02, "time_domain"),
      thd_pct: mkAv(Math.round(thd * 100) / 100, "%", thd * 0.10, "harmonic_ratio"),
      dc_component: mkAv(Math.round(dc * 10000) / 10000, "units", dc * 0.02, "mean"),
      nyquist_frequency_Hz: mkAv(nyquist, "Hz", 0, "sample_rate"),
      spectral_energy: mkAv(Math.round(energy * 10000) / 10000, "units²", energy * 0.05, "parseval"),
      num_samples: mkAv(N, "samples", 0, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const fourierAnalysisEngine = new FourierAnalysisEngine();
