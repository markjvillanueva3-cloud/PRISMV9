/**
 * ClosedLoopVerifierEngine — GAP-7 orchestration shell
 *
 * Wraps the already-wired DigitalTwinFormulasEngine EKF + drift-detect +
 * model-divergence math layer into a single closed-loop verification call:
 *
 *   CAM-predicted state  ──▶ EKF predict
 *   On-machine measured ──▶ EKF update + innovation residual
 *                       └──▶ CUSUM drift detection over residuals
 *                       └──▶ Model divergence (RMSE, MAE, KL) vs. twin
 *                       └──▶ Verdict: in_control | drifted | diverged | abort
 *
 * GAP-7 closure per `knowledge/wiki/architecture/print-to-cnc-capability-reassessment-2026-05-23.md`.
 * The math layer was iter15-verified already-wired on calcDispatcher (digital_twin_ekf_*,
 * digital_twin_drift_detect, digital_twin_divergence). This engine adds the orchestration
 * shell that NASA/Lockheed/Northrop "as-built vs as-designed" closed-loop verification
 * pipelines need, without re-implementing the math.
 *
 * Decision policy (cited):
 *  - innovation > 3σ for ≥3 consecutive samples → drifted (Brown 1971 §5, Montgomery 2009 §10.2)
 *  - CUSUM upper-alarm fires → drifted (Page 1954; ISO/IEC 25010 reliability)
 *  - Model divergence diverged=true OR KL > 0.5 → diverged (Kullback-Leibler 1951)
 *  - Both drift AND divergence → abort
 *
 * @version 1.0.0
 * @module ClosedLoopVerifierEngine
 */

import { digitalTwinFormulasEngine } from "./DigitalTwinFormulasEngine.js";

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty?: number;
  source: string;
}

export interface ClosedLoopVerifyInput {
  /** CAM-predicted state evolution [time × state_dim] */
  predicted_states: number[][];
  /** On-machine measured observations [time × meas_dim] */
  measured_observations: number[][];
  /** State transition matrix F [n × n] */
  F: number[][];
  /** Observation matrix H [p × n] */
  H: number[][];
  /** Process noise covariance Q [n × n] */
  Q: number[][];
  /** Measurement noise covariance R [p × p] */
  R: number[][];
  /** Initial state x0 [n × 1] */
  x0: number[];
  /** Initial covariance P0 [n × n] */
  P0: number[][];
  /** CUSUM in-control mean (default: 0 for residuals) */
  cusum_mu?: number;
  /** CUSUM allowance k (default: 0.5) */
  cusum_k?: number;
  /** CUSUM threshold h (default: 4.0 — 4-sigma policy) */
  cusum_h?: number;
  /** KL divergence threshold for "diverged" verdict (default 0.5) */
  kl_threshold?: number;
}

export type ClosedLoopVerdict = "in_control" | "drifted" | "diverged" | "abort";

export interface ClosedLoopVerifyResult {
  verdict: ClosedLoopVerdict;
  /** Final EKF state estimate */
  final_state: number[];
  /** Innovation sequence (z - H x_pred) per timestep, first measurement dim only */
  innovations: number[];
  /** Maximum |innovation| / sqrt(R[0][0]) */
  max_innovation_sigma: AtomicValue;
  /** CUSUM drift-detect summary */
  drift_alarm: boolean;
  drift_alarm_at: number | null;
  /** Twin divergence metrics */
  rmse: AtomicValue;
  kl_divergence: AtomicValue;
  /** Per-stage trace */
  evidence: Array<{ stage: string; verdict: string; source: string; reason: string }>;
  warnings: string[];
}

export class ClosedLoopVerifierEngine {
  verify(input: ClosedLoopVerifyInput): ClosedLoopVerifyResult {
    const warnings: string[] = [];
    const evidence: ClosedLoopVerifyResult["evidence"] = [];

    if (!input || !Array.isArray(input.predicted_states) || !Array.isArray(input.measured_observations)) {
      throw new Error("ClosedLoopVerifierEngine.verify: predicted_states and measured_observations are required");
    }
    if (input.predicted_states.length === 0 || input.measured_observations.length === 0) {
      throw new Error("ClosedLoopVerifierEngine.verify: empty state/measurement sequences");
    }

    const T = Math.min(input.predicted_states.length, input.measured_observations.length);
    if (input.predicted_states.length !== input.measured_observations.length) {
      warnings.push(`Sequence length mismatch — truncated to T=${T}`);
    }

    // ─── EKF predict+update loop, collecting innovations ──────────────
    let x = [...input.x0];
    let P = input.P0.map(row => [...row]);
    const innovations: number[] = [];

    for (let t = 0; t < T; t++) {
      const pred = digitalTwinFormulasEngine.ekfPredict({
        state: x,
        P,
        F: input.F,
        Q: input.Q,
      });
      const upd = digitalTwinFormulasEngine.ekfUpdate({
        x_pred: pred.x_pred,
        P_pred: pred.P_pred,
        z: input.measured_observations[t],
        H: input.H,
        R: input.R,
      });
      x = upd.x_updated;
      P = upd.P_updated;
      innovations.push(upd.innovation[0]);
    }

    // Innovation sigma
    const innovationSigma = Math.sqrt(Math.max(input.R[0]?.[0] ?? 1, 1e-12));
    const maxInnov = innovations.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const maxInnovSigma = maxInnov / innovationSigma;

    evidence.push({
      stage: "ekf",
      verdict: maxInnovSigma < 3 ? "in_control" : "drifted",
      source: "DigitalTwinFormulasEngine.ekfPredict+ekfUpdate (Kalman 1960; Anderson & Moore 1979)",
      reason: `max |innovation| = ${maxInnov.toFixed(3)} (${maxInnovSigma.toFixed(2)}σ)`,
    });

    // ─── CUSUM drift detection over innovation residuals ──────────────
    const drift = digitalTwinFormulasEngine.driftDetect({
      observations: innovations,
      mu: input.cusum_mu ?? 0,
      k: input.cusum_k ?? 0.5,
      h: input.cusum_h ?? 4.0,
    });
    evidence.push({
      stage: "cusum",
      verdict: drift.alarm_detected ? "drifted" : "in_control",
      source: "DigitalTwinFormulasEngine.driftDetect (Page 1954; Montgomery 2009 §10.2)",
      reason: drift.alarm_detected
        ? `CUSUM alarm fired at index ${drift.alarm_indices[0]} (max=${drift.max_cusum.toFixed(3)})`
        : `max CUSUM ${drift.max_cusum.toFixed(3)} below threshold`,
    });

    // ─── Model divergence (predicted vs measured, first dimension) ────
    const predFirst = input.predicted_states.slice(0, T).map(row => row[0]);
    const measFirst = input.measured_observations.slice(0, T).map(row => row[0]);
    const div = digitalTwinFormulasEngine.modelDivergence({
      predicted: predFirst,
      actual: measFirst,
      bins: 20,
    });
    const klThreshold = input.kl_threshold ?? 0.5;
    const klDiverged = div.diverged || div.kl_divergence > klThreshold;
    evidence.push({
      stage: "divergence",
      verdict: klDiverged ? "diverged" : "in_control",
      source: "DigitalTwinFormulasEngine.modelDivergence (Kullback-Leibler 1951; ISO/IEC 25010)",
      reason: `RMSE=${div.rmse.toFixed(4)}, KL=${div.kl_divergence.toFixed(4)} (threshold ${klThreshold})`,
    });

    // ─── Final verdict: max-of-stages ─────────────────────────────────
    let verdict: ClosedLoopVerdict = "in_control";
    if (drift.alarm_detected && klDiverged) verdict = "abort";
    else if (klDiverged) verdict = "diverged";
    else if (drift.alarm_detected || maxInnovSigma >= 3) verdict = "drifted";

    return {
      verdict,
      final_state: x,
      innovations,
      max_innovation_sigma: {
        value: Number(maxInnovSigma.toFixed(3)),
        unit: "sigma",
        source: "innovation / sqrt(R[0][0])",
      },
      drift_alarm: drift.alarm_detected,
      drift_alarm_at: drift.alarm_indices.length > 0 ? drift.alarm_indices[0] : null,
      rmse: {
        value: Number(div.rmse.toFixed(4)),
        unit: "abs",
        source: "ModelDivergenceResult.rmse",
      },
      kl_divergence: {
        value: Number(div.kl_divergence.toFixed(4)),
        unit: "nats",
        source: "Kullback-Leibler 1951 histogram (20 bins)",
      },
      evidence,
      warnings: [...warnings, ...drift.warnings, ...div.warnings],
    };
  }
}

export const closedLoopVerifierEngine = new ClosedLoopVerifierEngine();
