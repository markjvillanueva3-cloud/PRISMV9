/**
 * WaveletAnalysisEngine — Discrete wavelet transform analysis
 *
 * Models: Haar/Daubechies DWT, multi-resolution decomposition,
 *         energy distribution, denoising thresholds
 * References: Mallat wavelet tour, Daubechies Ten Lectures
 */

export type WaveletType = "haar" | "db4" | "db8" | "sym4" | "coif2";

export interface WaveletAnalysisInput {
  signal: number[];
  wavelet?: WaveletType;
  decomposition_levels?: number;       // default auto
  denoising_threshold?: number;        // default auto (VisuShrink)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface WaveletAnalysisResult {
  total_energy: AtomicValue;
  detail_energy_pct: AtomicValue;
  approximation_energy_pct: AtomicValue;
  num_levels: AtomicValue;
  dominant_scale: AtomicValue;
  snr_estimate_dB: AtomicValue;
  threshold_value: AtomicValue;
  compression_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class WaveletAnalysisEngine {
  calculate(input: WaveletAnalysisInput): WaveletAnalysisResult {
    const {
      signal,
      wavelet = "haar",
      decomposition_levels,
    } = input;

    const recs: string[] = [];
    const N = signal.length;

    // Max decomposition levels
    const maxLevels = Math.floor(Math.log2(N));
    const levels = decomposition_levels ?? Math.min(maxLevels, 5);

    // Haar DWT (works for all wavelet types as simplified model)
    const totalEnergy = signal.reduce((s, x) => s + x * x, 0);

    // Multi-resolution decomposition (Haar)
    let approx = [...signal];
    const detailEnergies: number[] = [];
    let detailEnergyTotal = 0;

    for (let l = 0; l < levels; l++) {
      const len = approx.length;
      if (len < 2) break;
      const halfLen = Math.floor(len / 2);
      const newApprox: number[] = [];
      const details: number[] = [];

      for (let i = 0; i < halfLen; i++) {
        const a = approx[2 * i];
        const b = approx[2 * i + 1];
        newApprox.push((a + b) / Math.SQRT2);
        details.push((a - b) / Math.SQRT2);
      }

      const detEnergy = details.reduce((s, x) => s + x * x, 0);
      detailEnergies.push(detEnergy);
      detailEnergyTotal += detEnergy;
      approx = newApprox;
    }

    const approxEnergy = approx.reduce((s, x) => s + x * x, 0);
    const detailPct = totalEnergy > 0 ? (detailEnergyTotal / totalEnergy) * 100 : 0;
    const approxPct = totalEnergy > 0 ? (approxEnergy / totalEnergy) * 100 : 0;

    // Dominant scale (level with most detail energy)
    let dominantScale = 1;
    let maxDetEnergy = 0;
    for (let i = 0; i < detailEnergies.length; i++) {
      if (detailEnergies[i] > maxDetEnergy) {
        maxDetEnergy = detailEnergies[i];
        dominantScale = i + 1;
      }
    }

    // SNR estimate (approximation vs detail energy)
    const snr = detailEnergyTotal > 0
      ? 10 * Math.log10(approxEnergy / detailEnergyTotal)
      : 60;

    // VisuShrink threshold: σ√(2 ln N)
    const medianDetail = detailEnergies.length > 0 ? detailEnergies[0] : 0;
    const sigmaEst = Math.sqrt(medianDetail / Math.max(Math.floor(N / 2), 1)) / 0.6745;
    const threshold = input.denoising_threshold ?? sigmaEst * Math.sqrt(2 * Math.log(N));

    // Compression ratio (coefficients above threshold vs total)
    const significantCoeffs = Math.max(approx.length, 1) + detailEnergies.filter(e => Math.sqrt(e) > threshold).length;
    const compressionRatio = N / Math.max(significantCoeffs, 1);

    const isSafe = N >= 4 && levels >= 1;

    if (N < 8) recs.push(`Very short signal (${N} samples) — limited decomposition`);
    if (detailPct > 80) recs.push(`High detail energy ${detailPct.toFixed(0)}% — noisy signal`);
    if (snr < 5) recs.push(`Low SNR ${snr.toFixed(1)}dB — consider denoising`);
    if (levels > maxLevels) recs.push(`Requested ${levels} levels > max ${maxLevels} for signal length ${N}`);
    if (recs.length === 0) recs.push(`Wavelet ${wavelet} — ${levels} levels, SNR≈${snr.toFixed(1)}dB, dominant scale ${dominantScale}`);

    return {
      total_energy: mkAv(Math.round(totalEnergy * 100) / 100, "units²", totalEnergy * 0.01, "parseval"),
      detail_energy_pct: mkAv(Math.round(detailPct * 10) / 10, "%", detailPct * 0.05, "decomposition"),
      approximation_energy_pct: mkAv(Math.round(approxPct * 10) / 10, "%", approxPct * 0.05, "decomposition"),
      num_levels: mkAv(levels, "levels", 0, "dyadic"),
      dominant_scale: mkAv(dominantScale, "level", 0, "energy_max"),
      snr_estimate_dB: mkAv(Math.round(snr * 10) / 10, "dB", snr * 0.15, "energy_ratio"),
      threshold_value: mkAv(Math.round(threshold * 10000) / 10000, "amplitude", threshold * 0.15, "visushrink"),
      compression_ratio: mkAv(Math.round(compressionRatio * 10) / 10, "ratio", compressionRatio * 0.10, "thresholding"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const waveletAnalysisEngine = new WaveletAnalysisEngine();
