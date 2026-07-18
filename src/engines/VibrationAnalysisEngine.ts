/**
 * PRISM MCP Server — Vibration Analysis Engine
 *
 * Structural vibration analysis for machine tool dynamics:
 * - SDOF natural frequency, free/forced response
 * - Frequency Response Function (FRF) generation
 * - Multi-DOF modal analysis (eigenvalue extraction)
 * - Half-power bandwidth estimation
 *
 * Ported from PRISM_VIBRATION_ANALYSIS_ENGINE.js (monolith R2.3.1).
 *
 * @module VibrationAnalysisEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SDOFSystem {
  mass: number;        // kg
  stiffness: number;   // N/m
  damping?: number;    // N·s/m
}

export interface SDOFResult {
  undampedNaturalFreq_Hz: number;
  dampedNaturalFreq_Hz: number;
  dampingRatio: number;
  criticalDamping: number;
  logarithmicDecrement: number | null;
  qualityFactor: number;
  systemType: "underdamped" | "critically_damped" | "overdamped";
}

export interface ForcedResponseResult {
  amplitude: number;
  phase_deg: number;
  magnificationFactor: number;
  transmissibility: number;
  frequencyRatio: number;
  dampingRatio: number;
  isResonant: boolean;
  powerDissipated: number;
}

export interface FRFPoint {
  frequency_Hz: number;
  magnitude: number;
  phase_deg: number;
  real: number;
  imaginary: number;
}

export interface FRFResult {
  data: FRFPoint[];
  resonanceFreq: number;
  peakMagnitude: number;
  halfPowerBandwidth: number | null;
}

export interface ModalResult {
  numberOfModes: number;
  modes: Array<{
    modeNumber: number;
    frequency_Hz: number;
    modeShape: number[];
    modalMass: number;
    modalStiffness: number;
    participationFactor: number;
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

class VibrationAnalysisEngineImpl {

  /** SDOF natural frequency and system characteristics. */
  sdofNaturalFrequency(system: SDOFSystem): SDOFResult {
    const { mass: m, stiffness: k, damping: c = 0 } = system;
    const omega_n = Math.sqrt(k / m);
    const f_n = omega_n / (2 * Math.PI);
    const c_crit = 2 * Math.sqrt(k * m);
    const zeta = c / c_crit;
    const omega_d = omega_n * Math.sqrt(Math.max(0, 1 - zeta * zeta));
    const f_d = omega_d / (2 * Math.PI);
    const delta = zeta < 1
      ? 2 * Math.PI * zeta / Math.sqrt(1 - zeta * zeta) : null;
    const Q = zeta > 0 ? 1 / (2 * zeta) : Infinity;

    return {
      undampedNaturalFreq_Hz: r2(f_n),
      dampedNaturalFreq_Hz: r2(f_d),
      dampingRatio: r4(zeta),
      criticalDamping: r2(c_crit),
      logarithmicDecrement: delta !== null ? r4(delta) : null,
      qualityFactor: r2(Q),
      systemType: zeta < 1 ? "underdamped"
        : zeta === 1 ? "critically_damped" : "overdamped",
    };
  }

  /** Free vibration response at time t. */
  sdofFreeResponse(
    system: SDOFSystem,
    initial: { x0?: number; v0?: number },
    t: number,
  ): { position: number; velocity: number } {
    const { mass: m, stiffness: k, damping: c = 0 } = system;
    const { x0 = 0, v0 = 0 } = initial;
    const omega_n = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));

    let x: number, v: number;

    if (zeta < 1) {
      const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
      const A = x0;
      const B = (v0 + zeta * omega_n * x0) / omega_d;
      const env = Math.exp(-zeta * omega_n * t);
      x = env * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t));
      v = env * (
        -zeta * omega_n * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t))
        + omega_d * (-A * Math.sin(omega_d * t) + B * Math.cos(omega_d * t))
      );
    } else if (Math.abs(zeta - 1) < 1e-10) {
      const A = x0;
      const B = v0 + omega_n * x0;
      x = (A + B * t) * Math.exp(-omega_n * t);
      v = (B - omega_n * (A + B * t)) * Math.exp(-omega_n * t);
    } else {
      const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
      const A = (v0 - s2 * x0) / (s1 - s2);
      const B = (s1 * x0 - v0) / (s1 - s2);
      x = A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
      v = A * s1 * Math.exp(s1 * t) + B * s2 * Math.exp(s2 * t);
    }

    return { position: x, velocity: v };
  }

  /** Forced harmonic vibration steady-state response. */
  sdofForcedResponse(
    system: SDOFSystem,
    excitation: { amplitude: number; frequency: number },
  ): ForcedResponseResult {
    const { mass: m, stiffness: k, damping: c = 0 } = system;
    const { amplitude: F0, frequency: omega } = excitation;
    const omega_n = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));
    const r = omega / omega_n;

    const denom = Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
    const X = (F0 / k) / denom;
    const phi = Math.atan2(2 * zeta * r, 1 - r * r);
    const MF = X / (F0 / k);
    const TR = Math.sqrt(1 + (2 * zeta * r) ** 2) / denom;
    const P = 0.5 * c * X * X * omega * omega;

    return {
      amplitude: r4(X),
      phase_deg: r2(phi * 180 / Math.PI),
      magnificationFactor: r4(MF),
      transmissibility: r4(TR),
      frequencyRatio: r4(r),
      dampingRatio: r4(zeta),
      isResonant: Math.abs(r - 1) < 0.1,
      powerDissipated: r4(P),
    };
  }

  /** Generate FRF data over frequency range. */
  generateFRF(
    system: SDOFSystem,
    freqRange: { start: number; end: number; points: number },
  ): FRFResult {
    const { mass: m, stiffness: k, damping: c = 0 } = system;
    const data: FRFPoint[] = [];

    for (let i = 0; i < freqRange.points; i++) {
      const freq = freqRange.start
        + (freqRange.end - freqRange.start) * i / (freqRange.points - 1);
      const omega = 2 * Math.PI * freq;
      const real = k - m * omega * omega;
      const imag = c * omega;
      const denom = real * real + imag * imag;
      const magnitude = 1 / Math.sqrt(denom);
      const phase = -Math.atan2(imag, real);

      data.push({
        frequency_Hz: r2(freq),
        magnitude,
        phase_deg: r2(phase * 180 / Math.PI),
        real: real / denom,
        imaginary: -imag / denom,
      });
    }

    const peak = data.reduce((mx, d) =>
      d.magnitude > mx.magnitude ? d : mx,
    );
    const bw = this.halfPowerBandwidth(data, peak);

    return {
      data,
      resonanceFreq: peak.frequency_Hz,
      peakMagnitude: peak.magnitude,
      halfPowerBandwidth: bw,
    };
  }

  /** Multi-DOF modal analysis (simplified QR eigenvalue extraction). */
  modalAnalysis(M: number[][], K: number[][]): ModalResult {
    const n = M.length;
    const modes: ModalResult["modes"] = [];

    for (let mode = 0; mode < n; mode++) {
      let v = Array(n).fill(0);
      v[mode] = 1;
      v = v.map((x: number) => x + 0.01 * (Math.random() - 0.5));

      for (let iter = 0; iter < 50; iter++) {
        const Mv = matVec(M, v);
        const y = solveSystem(K, Mv);
        const norm = Math.sqrt(y.reduce((s, yi) => s + yi * yi, 0));
        v = y.map(yi => yi / (norm || 1));
      }

      const Kv = matVec(K, v);
      const Mv = matVec(M, v);
      const lambda = dot(v, Kv) / dot(v, Mv);
      const omega = Math.sqrt(Math.abs(lambda));
      const norm = Math.sqrt(v.reduce((s, p) => s + p * p, 0));
      const phi = v.map(p => p / (norm || 1));
      const modalMass = quadForm(phi, M, phi);
      const modalStiffness = quadForm(phi, K, phi);
      const ones = Array(n).fill(1);
      const pf = dot(phi, matVec(M, ones)) / dot(phi, matVec(M, phi));

      modes.push({
        modeNumber: mode + 1,
        frequency_Hz: r2(omega / (2 * Math.PI)),
        modeShape: phi.map(r4),
        modalMass: r4(modalMass),
        modalStiffness: r2(modalStiffness),
        participationFactor: r4(pf),
      });
    }

    modes.sort((a, b) => a.frequency_Hz - b.frequency_Hz);
    return { numberOfModes: modes.length, modes };
  }

  // ── internal ──

  private halfPowerBandwidth(
    data: FRFPoint[], peak: FRFPoint,
  ): number | null {
    const hp = peak.magnitude / Math.sqrt(2);
    let f1: number | null = null, f2: number | null = null;
    for (let i = 1; i < data.length; i++) {
      if (!f1 && data[i].magnitude >= hp && data[i - 1].magnitude < hp) {
        f1 = data[i].frequency_Hz;
      }
      if (f1 && data[i].magnitude < hp && data[i - 1].magnitude >= hp) {
        f2 = data[i].frequency_Hz;
        break;
      }
    }
    return f1 != null && f2 != null ? r2(f2 - f1) : null;
  }
}

// ── helpers ──

function matVec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, ai, i) => s + ai * b[i], 0);
}

function quadForm(v: number[], M: number[][], w: number[]): number {
  return dot(v, matVec(M, w));
}

function solveSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    if (Math.abs(aug[i][i]) < 1e-12) aug[i][i] = 1e-12;
    for (let k = i + 1; k < n; k++) {
      const f = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) aug[k][j] -= f * aug[i][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }

export const vibrationAnalysisEngine = new VibrationAnalysisEngineImpl();
