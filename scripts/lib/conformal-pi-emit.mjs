/**
 * conformal-pi-emit.mjs — emit conformal prediction intervals (PI) as
 * G-code comments at op boundaries. Wraps iter31's split-conformal
 * regression library and renders dialect-specific cycle-time advisories
 * into the actual emitted program.
 *
 * Why "R12 fail-loud win":
 *   Operators currently see point estimates ("Est cycle: 245s") with no
 *   uncertainty. When the actual differs by 30s, they assume the program
 *   broke. This unit emits a CALIBRATED interval at the program head AND
 *   per-op headers, so a 30s overage is visible as "within band" or
 *   "above P=90 band → check tool wear".
 *
 *   Failure mode the unit prevents: silent point-estimate confidence
 *   inflation (R12 — never hide uncertainty).
 *
 * Pipeline:
 *   1. Caller provides operations[] with point predictions (minutes)
 *   2. Caller provides a calibrated ConformalState (residual buffer
 *      populated via iter31.recordOutcome() across N≥5 prior jobs)
 *   3. This lib wraps each predictedMin in a PI via iter31.predictInterval
 *   4. Emits dialect-specific comments at program head + per-op headers
 *
 * Echo-soul: post-processor observability emission ONLY. The conformal
 * physics (split-conformal quantile math) lives in iter31; this lib is
 * the emit-layer adapter. No inline Kienzle/Taylor — Vc/feed/etc are
 * upstream of cycle-time prediction.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-CONFORMAL-PI-BANDS
 * @slot echo · @date 2026-05-27
 */

import { predictInterval } from "./v11-cycle-time-conformal.mjs";

export const CONFORMAL_PI_EMIT_SCHEMA_VERSION = 1;

/** Default decimal precision for emitted cycle-time values. */
export const DEFAULT_DECIMAL_PLACES = 2;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/** Comment delimiter syntax per dialect. */
const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/**
 * Pure: format a comment string for the target dialect.
 * Strips embedded `(` and `)` from `text` for Fanuc-family dialects (they
 * are nesting-illegal); ascii-safe pass-through for Heidenhain/Siemens.
 * Returns null on unknown dialect.
 */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safeText = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safeText}${d.close}`;
}

/** Pure: format an interval band as text (no comment wrapping). */
export function formatBandText(predictedMin, interval, options) {
  if (!Number.isFinite(Number(predictedMin)) || predictedMin < 0) return null;
  if (!interval || typeof interval !== "object") return null;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const predStr = Number(predictedMin).toFixed(dp);
  if (interval.source === "invalid_input") {
    return `cycle ${predStr} min  [PI: invalid input]`;
  }
  if (interval.source === "undertrained_point_estimate" || interval.quantile == null) {
    return `cycle ${predStr} min  [PI: undertrained, point-only]`;
  }
  const lower = Number(interval.lower).toFixed(dp);
  const upper = Number(interval.upper).toFixed(dp);
  const cov = Math.round((Number(interval.coverage) ?? 0) * 100);
  return `cycle ${predStr} min  [${lower} - ${upper} min  P=${cov}%]`;
}

/**
 * Pure: build a program-header advisory line for the given dialect.
 * Returns null on bad input.
 */
export function buildProgramHeaderComment({ totalPredictedMin, conformalState, dialect, options }) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (!Number.isFinite(Number(totalPredictedMin)) || totalPredictedMin < 0) return null;
  if (!conformalState || typeof conformalState !== "object") return null;
  const interval = predictInterval(conformalState, totalPredictedMin);
  const bandText = formatBandText(totalPredictedMin, interval, options);
  if (bandText == null) return null;
  return formatComment(dialect, `PROGRAM ${bandText}`);
}

/**
 * Pure: build a per-op advisory line for the given dialect.
 */
export function buildOpHeaderComment({ opId, predictedMin, conformalState, dialect, options }) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof opId !== "string" || opId.length === 0) return null;
  if (!Number.isFinite(Number(predictedMin)) || predictedMin < 0) return null;
  if (!conformalState || typeof conformalState !== "object") return null;
  const interval = predictInterval(conformalState, predictedMin);
  const bandText = formatBandText(predictedMin, interval, options);
  if (bandText == null) return null;
  return formatComment(dialect, `OP ${opId} ${bandText}`);
}

/**
 * Pure: emit a full conformal-PI-annotated program.
 *
 * @param {Object} req
 * @param {Array} req.operations — [{ id, predictedMin, rawLines: string[] }]
 * @param {Object} req.conformalState — iter31 ConformalState
 * @param {string} req.dialect — one of SUPPORTED_DIALECTS
 * @param {Object} [req.options]
 * @param {boolean} [req.options.emitProgramHeader=true]
 * @param {boolean} [req.options.emitOpHeaders=true]
 * @param {number} [req.options.decimalPlaces=2]
 * @returns {Object|null} { annotatedLines, summary }
 */
export function emitConformalPIProgram(req) {
  if (!req || typeof req !== "object") return null;
  const { operations, conformalState, dialect } = req;
  if (!Array.isArray(operations) || operations.length === 0) return null;
  if (!conformalState || typeof conformalState !== "object") return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const options = req.options || {};
  const emitProgramHeader = options.emitProgramHeader !== false;
  const emitOpHeaders = options.emitOpHeaders !== false;

  const lines = [];
  let totalPredictedMin = 0;
  let opAdvisories = 0;
  for (const op of operations) {
    if (!op || typeof op !== "object") continue;
    if (!Number.isFinite(Number(op.predictedMin))) continue;
    totalPredictedMin += Number(op.predictedMin);
  }

  if (emitProgramHeader) {
    const hdr = buildProgramHeaderComment({
      totalPredictedMin,
      conformalState,
      dialect,
      options,
    });
    if (hdr != null) lines.push(hdr);
  }

  for (const op of operations) {
    if (!op || typeof op !== "object") continue;
    if (emitOpHeaders && Number.isFinite(Number(op.predictedMin))) {
      const opLine = buildOpHeaderComment({
        opId: op.id,
        predictedMin: Number(op.predictedMin),
        conformalState,
        dialect,
        options,
      });
      if (opLine != null) {
        lines.push(opLine);
        opAdvisories++;
      }
    }
    if (Array.isArray(op.rawLines)) {
      for (const rl of op.rawLines) {
        if (typeof rl === "string") lines.push(rl);
      }
    }
  }

  const interval = predictInterval(conformalState, totalPredictedMin);
  return {
    annotatedLines: lines,
    summary: {
      operationCount: operations.length,
      totalPredictedMin,
      programInterval: interval,
      opAdvisoryCount: opAdvisories,
      dialect,
      schemaVersion: CONFORMAL_PI_EMIT_SCHEMA_VERSION,
    },
  };
}
