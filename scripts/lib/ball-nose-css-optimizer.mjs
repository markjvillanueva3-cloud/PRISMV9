/**
 * ball-nose-css-optimizer.mjs — CSS (Constant Surface Speed) scheduling
 * for ball-nose end mills. Ports the proven lathe CSS optimizer pattern
 * (variable RPM tracking effective diameter) to ball-nose milling.
 *
 * Physics:
 *   For a ball of radius R cutting at axial depth `ap` from the tip
 *   (ap ∈ [0, R]), the effective cutting radius at that depth is
 *     r_eff(ap) = sqrt(2·R·ap - ap²)
 *   so the effective cutting diameter is
 *     D_eff(ap) = 2·r_eff(ap)
 *
 *   Constant surface speed Vc (m/min) requires variable spindle RPM:
 *     n(ap) = (Vc × 1000) / (π × D_eff(ap))
 *
 *   At ap = R (full hemisphere engagement), D_eff = 2R = D (the ball's
 *   nominal diameter). As ap → 0 (toward the tip), D_eff → 0 and the
 *   required RPM diverges — this is the well-known "ball-nose tip dead
 *   zone" where Vc cannot be maintained at any practical RPM, and the
 *   workpiece sees Vc ≈ 0 against the tip.
 *
 * Echo soul: Vc is an INPUT to this module — the consumer routes Vc
 * through `cam_speedfeed_compute` / SFC ensemble. This module owns only
 * the per-Z-step RPM scheduling + dialect-aware S-word emission, NOT
 * the underlying speed-feed physics.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-LATHE-CSS-OPTIMIZER-TO-BALL-END
 * @slot echo · @date 2026-05-27
 */

export const BALL_NOSE_CSS_SCHEMA_VERSION = 1;

/** Below this effective diameter (mm), Vc cannot be maintained — refuse. */
export const BALL_NOSE_TIP_DEAD_ZONE_MM = 0.05;

/** Absolute floor for machine spindle max RPM (per JM-Die conservative). */
export const BALL_NOSE_DEFAULT_MAX_RPM = 12000;

/** Controller dialects supported for S-word emission. */
export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/**
 * Pure: effective cutting diameter (mm) at axial depth `ap` from ball tip.
 * Returns null on invalid input. Clamps ap to [0, R] internally.
 */
export function effectiveCuttingDiameterMm(ballDiameterMm, axialDepthMm) {
  if (!Number.isFinite(ballDiameterMm) || !Number.isFinite(axialDepthMm)) return null;
  if (ballDiameterMm <= 0) return null;
  if (axialDepthMm < 0) return null;
  const R = ballDiameterMm / 2;
  const ap = axialDepthMm > R ? R : axialDepthMm;
  const innerTerm = 2 * R * ap - ap * ap;
  if (innerTerm <= 0) return 0;
  return 2 * Math.sqrt(innerTerm);
}

/**
 * Pure: spindle RPM required to hold Vc_m_per_min at effective diameter.
 * Returns null on invalid input or zero effective diameter.
 */
export function cssRpmForEffectiveDiameter(Vc_m_per_min, effectiveDiameterMm) {
  if (!Number.isFinite(Vc_m_per_min) || !Number.isFinite(effectiveDiameterMm)) return null;
  if (Vc_m_per_min <= 0) return null;
  if (effectiveDiameterMm <= 0) return null;
  return (Vc_m_per_min * 1000) / (Math.PI * effectiveDiameterMm);
}

/**
 * Pure: full per-step RPM schedule for a ball-nose CSS profile.
 *
 * @param {Object} req
 * @param {number} req.ballDiameterMm — nominal ball diameter (mm)
 * @param {number} req.Vc_m_per_min — target surface speed (m/min, > 0)
 * @param {number[]} req.depthScheduleMm — axial depth steps from tip (mm)
 * @param {number} [req.machineMaxRpm] — clamp ceiling (default 12000)
 * @param {number} [req.tipDeadZoneMm] — refuse below this D_eff (default 0.05)
 * @returns {Object|null} { schedule: [{ap, dEff, rpmRaw, rpmClamped, status}], summary }
 */
export function buildBallNoseCssSchedule(req) {
  if (!req || typeof req !== "object") return null;
  const { ballDiameterMm, Vc_m_per_min, depthScheduleMm } = req;
  if (!Array.isArray(depthScheduleMm) || depthScheduleMm.length === 0) return null;
  if (!Number.isFinite(ballDiameterMm) || ballDiameterMm <= 0) return null;
  if (!Number.isFinite(Vc_m_per_min) || Vc_m_per_min <= 0) return null;
  const maxRpm = Number.isFinite(req.machineMaxRpm) && req.machineMaxRpm > 0
    ? req.machineMaxRpm
    : BALL_NOSE_DEFAULT_MAX_RPM;
  const tipDeadZone = Number.isFinite(req.tipDeadZoneMm) && req.tipDeadZoneMm > 0
    ? req.tipDeadZoneMm
    : BALL_NOSE_TIP_DEAD_ZONE_MM;
  const schedule = [];
  let deadZoneCount = 0;
  let clampedCount = 0;
  let validCount = 0;
  for (const ap of depthScheduleMm) {
    const dEff = effectiveCuttingDiameterMm(ballDiameterMm, ap);
    if (dEff == null) {
      schedule.push({ ap, dEff: null, rpmRaw: null, rpmClamped: null, status: "invalid" });
      continue;
    }
    if (dEff < tipDeadZone) {
      schedule.push({ ap, dEff, rpmRaw: null, rpmClamped: 0, status: "tip-dead-zone" });
      deadZoneCount++;
      continue;
    }
    const rpmRaw = cssRpmForEffectiveDiameter(Vc_m_per_min, dEff);
    if (rpmRaw == null) {
      schedule.push({ ap, dEff, rpmRaw: null, rpmClamped: null, status: "invalid" });
      continue;
    }
    const rpmClamped = rpmRaw > maxRpm ? maxRpm : rpmRaw;
    const status = rpmRaw > maxRpm ? "clamped-at-machine-max" : "ok";
    if (status === "clamped-at-machine-max") clampedCount++;
    if (status === "ok") validCount++;
    schedule.push({ ap, dEff, rpmRaw, rpmClamped, status });
  }
  return {
    schedule,
    summary: {
      ballDiameterMm,
      Vc_m_per_min,
      machineMaxRpm: maxRpm,
      tipDeadZoneMm: tipDeadZone,
      steps: schedule.length,
      validSteps: validCount,
      clampedSteps: clampedCount,
      deadZoneSteps: deadZoneCount,
      schemaVersion: BALL_NOSE_CSS_SCHEMA_VERSION,
    },
  };
}

/**
 * Pure: format S-word for a given controller dialect.
 * Returns null on unknown dialect or invalid RPM.
 */
export function formatSpindleSWord(dialect, rpm) {
  if (typeof dialect !== "string") return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (!Number.isFinite(rpm) || rpm < 0) return null;
  const rounded = Math.round(rpm);
  switch (dialect) {
    case "fanuc":
    case "haas":
    case "mitsubishi":
      return `S${rounded}`;
    case "heidenhain":
      return `S${rounded}`;
    case "siemens":
      return `S${rounded}`;
    default:
      return null;
  }
}

/**
 * Pure: emit dialect-specific G-code lines for a CSS profile.
 * Per echo soul: this is RPM scheduling ONLY — collision check + tool
 * selection happens upstream. Output is a flat string array, one line
 * per scheduled depth.
 *
 * Dialects:
 *   fanuc/haas/mitsubishi → "N{seq} G01 Z{ap} S{rpm} F{feed}"
 *   heidenhain            → "L Z{ap} F{feed} S{rpm}"
 *   siemens               → "G01 Z={ap} F={feed} S={rpm}"
 *
 * @param {Object} req
 * @param {Object} req.profile — output from buildBallNoseCssSchedule
 * @param {string} req.dialect — one of SUPPORTED_DIALECTS
 * @param {number} req.feed_mm_per_min — feed rate to emit per block
 * @param {number} [req.startSeq] — Fanuc-style sequence start (default 100)
 * @returns {string[]|null}
 */
export function emitVariableSpindleBlocks(req) {
  if (!req || typeof req !== "object") return null;
  const { profile, dialect, feed_mm_per_min } = req;
  if (!profile || !Array.isArray(profile.schedule)) return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (!Number.isFinite(feed_mm_per_min) || feed_mm_per_min <= 0) return null;
  const startSeq = Number.isFinite(req.startSeq) && req.startSeq > 0 ? req.startSeq : 100;
  const lines = [];
  let seq = startSeq;
  for (const step of profile.schedule) {
    if (step.status === "invalid") continue;
    if (step.status === "tip-dead-zone") {
      lines.push(`( TIP-DEAD-ZONE Z${step.ap.toFixed(4)} D_eff=${step.dEff.toFixed(4)} — RPM uncomputable )`);
      continue;
    }
    const sWord = formatSpindleSWord(dialect, step.rpmClamped);
    if (sWord == null) continue;
    const apStr = step.ap.toFixed(4);
    const feedStr = feed_mm_per_min.toFixed(2);
    let line;
    switch (dialect) {
      case "fanuc":
      case "haas":
      case "mitsubishi":
        line = `N${seq} G01 Z${apStr} ${sWord} F${feedStr}`;
        seq += 10;
        break;
      case "heidenhain":
        line = `L Z${apStr} F${feedStr} ${sWord}`;
        break;
      case "siemens":
        line = `G01 Z=${apStr} F=${feedStr} ${sWord}`;
        break;
    }
    if (step.status === "clamped-at-machine-max") {
      line += ` ( CLAMPED-AT-MACHINE-MAX raw=${step.rpmRaw.toFixed(1)} )`;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Pure: end-to-end orchestrator — schedule + emit.
 * Returns null on any validation failure (fail-loud per R12).
 */
export function ballNoseCssEmit(req) {
  if (!req || typeof req !== "object") return null;
  const profile = buildBallNoseCssSchedule(req);
  if (!profile) return null;
  const lines = emitVariableSpindleBlocks({
    profile,
    dialect: req.dialect,
    feed_mm_per_min: req.feed_mm_per_min,
    startSeq: req.startSeq,
  });
  if (lines == null) return null;
  return { profile, lines };
}
