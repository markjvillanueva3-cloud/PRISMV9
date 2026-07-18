/**
 * hsm-entry-geometry-emit.mjs — HSM (High Speed Machining) entry-
 * geometry pre-emit refuse gate. Encodes the canonical operator wisdom
 * for how an end mill is allowed to engage material in HSM contexts:
 *   - Helix entry  — 1° ≤ angle ≤ 3° (tribal wisdom)
 *   - Ramp entry   — angle ≤ 2°
 *   - Plunge entry — REFUSED (HSM never plunges into solid material)
 *   - Lead-in arc  — radius ≥ 0.1 × tool_diameter
 *
 * Why "HSM entry geometry at emit":
 *   Sheared end mills are the #1 cause of unscheduled-spindle-stop in
 *   HSM shops. Almost always the failure mode is wrong entry geometry:
 *   straight plunge, helix at 5° (too steep), or ramp at 4° (too steep
 *   for HSM cutter coatings to survive). The pitfall is silent —
 *   nothing in the CAM-output catches it; the operator finds out when
 *   the spindle alarm trips. This lib is a pre-emit hard gate that
 *   refuses to emit programs with bad entry geometry, emitting BLOCK
 *   comments naming the violating entry move + recommended bounds.
 *
 *   Echo-soul: pure geometric observability. The cutter geometry
 *   (helix angle, ramp angle, plunge depth, arc radius) is INPUT —
 *   this lib only validates against the canonical tribal bounds.
 *   NO inline cutting physics.
 *
 *   Failure mode the unit prevents: silent emission of HSM programs
 *   with operator-broken entry-geometry (R12 — never emit a program
 *   known to violate canonical HSM entry rules without surfacing it).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-TRIBAL-HSM-ENTRY-GEOMETRY-VALIDATOR
 * @phase 8 TRIBAL · @row 51 · @effort 2d
 * @slot echo · @date 2026-05-27
 */

export const HSM_ENTRY_GEOMETRY_EMIT_SCHEMA_VERSION = 1;

export const DEFAULT_DECIMAL_PLACES = 3;

/** Canonical tribal bounds. Hand-curated from the slot soul + JM Die corpus. */
export const HELIX_MIN_ANGLE_DEG = 1.0;
export const HELIX_MAX_ANGLE_DEG = 3.0;
export const RAMP_MAX_ANGLE_DEG = 2.0;
export const ARC_LEAD_IN_MIN_RADIUS_FRACTION = 0.10; // 10% of tool diameter

export const SUPPORTED_ENTRY_KINDS = ["helix", "ramp", "plunge", "arc-lead-in"];

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

export const VERDICT_PASS = "PASS";
export const VERDICT_BLOCK = "BLOCK";

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/** Pure: dialect-aware comment wrap. */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safe = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safe}${d.close}`;
}

/**
 * Pure: validate a helix entry. Returns { verdict, reason, recommendedAngleDeg }.
 * Bounds: HELIX_MIN_ANGLE_DEG ≤ angle ≤ HELIX_MAX_ANGLE_DEG (inclusive).
 */
export function validateHelixEntry(angleDeg) {
  if (!Number.isFinite(angleDeg)) return null;
  if (angleDeg < 0) return null;
  if (angleDeg < HELIX_MIN_ANGLE_DEG) {
    return {
      verdict: VERDICT_BLOCK,
      reason: `helix angle ${angleDeg.toFixed(2)}° below min ${HELIX_MIN_ANGLE_DEG}°`,
      recommendedAngleDeg: HELIX_MIN_ANGLE_DEG,
    };
  }
  if (angleDeg > HELIX_MAX_ANGLE_DEG) {
    return {
      verdict: VERDICT_BLOCK,
      reason: `helix angle ${angleDeg.toFixed(2)}° above max ${HELIX_MAX_ANGLE_DEG}°`,
      recommendedAngleDeg: HELIX_MAX_ANGLE_DEG,
    };
  }
  return { verdict: VERDICT_PASS, reason: null, recommendedAngleDeg: null };
}

/**
 * Pure: validate a ramp entry. Returns { verdict, reason, recommendedAngleDeg }.
 * Bounds: 0 ≤ angle ≤ RAMP_MAX_ANGLE_DEG.
 */
export function validateRampEntry(angleDeg) {
  if (!Number.isFinite(angleDeg)) return null;
  if (angleDeg < 0) return null;
  if (angleDeg > RAMP_MAX_ANGLE_DEG) {
    return {
      verdict: VERDICT_BLOCK,
      reason: `ramp angle ${angleDeg.toFixed(2)}° above max ${RAMP_MAX_ANGLE_DEG}°`,
      recommendedAngleDeg: RAMP_MAX_ANGLE_DEG,
    };
  }
  return { verdict: VERDICT_PASS, reason: null, recommendedAngleDeg: null };
}

/**
 * Pure: validate a plunge entry. Always REFUSED in HSM contexts.
 * (Plunge into solid material is non-HSM; if the program is non-HSM,
 *  caller should not invoke this gate.)
 */
export function validatePlungeEntry() {
  return {
    verdict: VERDICT_BLOCK,
    reason: "plunge entry into solid material — refused for HSM",
    recommendedAngleDeg: null,
  };
}

/**
 * Pure: validate an arc lead-in. Returns { verdict, reason, recommendedRadiusMm }.
 * Bounds: arcRadiusMm ≥ ARC_LEAD_IN_MIN_RADIUS_FRACTION × toolDiameterMm.
 */
export function validateArcLeadIn(arcRadiusMm, toolDiameterMm) {
  if (!Number.isFinite(arcRadiusMm) || !Number.isFinite(toolDiameterMm)) return null;
  if (arcRadiusMm < 0 || toolDiameterMm <= 0) return null;
  const minRadius = ARC_LEAD_IN_MIN_RADIUS_FRACTION * toolDiameterMm;
  if (arcRadiusMm < minRadius) {
    return {
      verdict: VERDICT_BLOCK,
      reason: `arc lead-in radius ${arcRadiusMm.toFixed(3)} mm below min ${minRadius.toFixed(3)} mm (10% × tool diameter)`,
      recommendedRadiusMm: minRadius,
    };
  }
  return { verdict: VERDICT_PASS, reason: null, recommendedRadiusMm: null };
}

/**
 * Pure: validate an entry-move descriptor.
 *
 * @param {Object} entry — { kind, angleDeg?, arcRadiusMm?, toolDiameterMm? }
 * @returns {Object|null} { kind, verdict, reason, recommendedAngleDeg, recommendedRadiusMm }
 */
export function validateEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (!SUPPORTED_ENTRY_KINDS.includes(entry.kind)) return null;
  let result = null;
  if (entry.kind === "helix") {
    result = validateHelixEntry(entry.angleDeg);
  } else if (entry.kind === "ramp") {
    result = validateRampEntry(entry.angleDeg);
  } else if (entry.kind === "plunge") {
    result = validatePlungeEntry();
  } else if (entry.kind === "arc-lead-in") {
    result = validateArcLeadIn(entry.arcRadiusMm, entry.toolDiameterMm);
  }
  if (result == null) return null;
  return {
    kind: entry.kind,
    verdict: result.verdict,
    reason: result.reason,
    recommendedAngleDeg: result.recommendedAngleDeg ?? null,
    recommendedRadiusMm: result.recommendedRadiusMm ?? null,
  };
}

/**
 * Pure: validate a sequence of entries (one per CAM op typically).
 * Returns { totalCount, blockCount, results: [...] }.
 */
export function validateEntrySequence(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const results = [];
  let blockCount = 0;
  for (let i = 0; i < entries.length; i++) {
    const r = validateEntry(entries[i]);
    if (r == null) return null;
    results.push({ index: i, ...r });
    if (r.verdict === VERDICT_BLOCK) blockCount++;
  }
  return {
    totalCount: entries.length,
    blockCount,
    passCount: entries.length - blockCount,
    results,
  };
}

/**
 * Pure: format the validation result as a comment line per dialect.
 */
export function formatEntryVerdictLine(result, dialect, options) {
  if (!result || typeof result !== "object") return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (![VERDICT_PASS, VERDICT_BLOCK].includes(result.verdict)) return null;
  const idxStr = Number.isInteger(result.index) ? `idx=${result.index} ` : "";
  let text;
  if (result.verdict === VERDICT_PASS) {
    text = `HSM-ENTRY PASS ${idxStr}kind=${result.kind}`;
  } else {
    text = `HSM-ENTRY BLOCK ${idxStr}kind=${result.kind} reason: ${result.reason}`;
  }
  return formatComment(dialect, text);
}

/**
 * Pure: full emit pipeline.
 *
 * @param {Object} req
 * @param {Array} req.entries — [{kind, angleDeg?, arcRadiusMm?, toolDiameterMm?}, ...]
 * @param {string} req.dialect
 * @param {Object} [req.options]
 * @returns {Object|null} { lines, allowed, summary }
 *
 * If any entry BLOCKs, allowed=false and the caller MUST refuse to
 * emit the underlying program (or route through operator approval).
 */
export function emitHSMEntryReport(req) {
  if (!req || typeof req !== "object") return null;
  const { entries, dialect } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const seq = validateEntrySequence(entries);
  if (seq == null) return null;
  const lines = [];
  const headerText = `HSM-ENTRY-VALIDATOR total=${seq.totalCount} pass=${seq.passCount} block=${seq.blockCount}`;
  const headerLine = formatComment(dialect, headerText);
  if (headerLine == null) return null;
  lines.push(headerLine);
  for (const r of seq.results) {
    const line = formatEntryVerdictLine(r, dialect, req.options);
    if (line == null) return null;
    lines.push(line);
  }
  return {
    lines,
    allowed: seq.blockCount === 0,
    summary: {
      totalCount: seq.totalCount,
      passCount: seq.passCount,
      blockCount: seq.blockCount,
      dialect,
      schemaVersion: HSM_ENTRY_GEOMETRY_EMIT_SCHEMA_VERSION,
    },
  };
}
