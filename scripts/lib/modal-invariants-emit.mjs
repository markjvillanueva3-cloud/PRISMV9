/**
 * modal-invariants-emit.mjs — formal modal-state invariant checks on
 * G-code emit. PRISM-only differentiator: catches the operator
 * pitfalls from the slot soul (coolant-before-spindle, missing safe
 * retract before T-change, feed-mode drift, missing M5 before M30) as
 * pre-emit hard gates rather than post-prove-out surprises.
 *
 * Why "modal invariants at emit":
 *   Standard posts emit raw event sequences. Operators discover broken
 *   modal state on the prove-out (wet floor before tool engages,
 *   spindle off mid-tap, feed-mode mismatch causing rapid where they
 *   expected slow). This lib checks every emit against 5 hand-curated
 *   modal invariants and surfaces violations as dialect-aware comments
 *   on the program HEADER so the operator sees the issue before press-
 *   ing CYCLE-START.
 *
 *   Echo-soul: pure event-stream observability. No physics, no
 *   feed/speed values inlined. The emit is a sequence of events; this
 *   lib reasons about temporal ordering of those events.
 *
 *   Failure mode the unit prevents: silent modal-state corruption
 *   between operations (R12 — never emit a program known to violate
 *   a modal invariant without surfacing the violation).
 *
 * The 5 hand-curated invariants (sourced from echo slot-soul pitfalls):
 *   1. SPINDLE_BEFORE_CUT   — M3/M4 must precede first G1/G2/G3 in program
 *   2. COOLANT_AFTER_SPINDLE — M7/M8 must come AFTER (or same block as)
 *                              M3/M4 (wet floor before tool engages = M8
 *                              before M3 = scrap)
 *   3. RETRACT_BEFORE_TOOL_CHANGE — Z >= safeZ when M6 (or T<n> M6) emitted
 *   4. SPINDLE_OFF_BEFORE_PROGRAM_END — M5 must appear before M30
 *   5. FEED_MODE_PRESERVED  — G93/G94/G95 must not silently flip
 *                              between blocks without explicit re-emit
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-LTL-MODAL-INVARIANTS
 * @phase 6 EMIT-side · @row 38 · @effort 4d
 * @slot echo · @date 2026-05-27
 */

export const MODAL_INVARIANTS_EMIT_SCHEMA_VERSION = 1;

export const DEFAULT_DECIMAL_PLACES = 3;

/** Default safeZ for retract-before-tool-change check (mm above part top). */
export const DEFAULT_SAFE_Z = 5.0;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/** Modal codes recognized. */
export const MOTION_CODES = ["G0", "G00", "G1", "G01", "G2", "G02", "G3", "G03"];
export const SPINDLE_ON_CODES = ["M3", "M03", "M4", "M04"];
export const SPINDLE_OFF_CODES = ["M5", "M05"];
export const COOLANT_ON_CODES = ["M7", "M07", "M8", "M08"];
export const COOLANT_OFF_CODES = ["M9", "M09"];
export const TOOL_CHANGE_CODES = ["M6", "M06"];
export const PROGRAM_END_CODES = ["M2", "M02", "M30"];
export const FEED_MODE_CODES = ["G93", "G94", "G95"];

/** The 5 named invariants. */
export const SUPPORTED_INVARIANTS = [
  "SPINDLE_BEFORE_CUT",
  "COOLANT_AFTER_SPINDLE",
  "RETRACT_BEFORE_TOOL_CHANGE",
  "SPINDLE_OFF_BEFORE_PROGRAM_END",
  "FEED_MODE_PRESERVED",
];

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/** Pure: dialect-aware comment wrap (mirrors iter51-57). */
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
 * Pure: extract modal-relevant tokens from a single G-code line.
 * Strips inline comments (Fanuc parens; Heidenhain/Siemens semicolons).
 * Returns array of upper-case tokens (G/M codes only) + parsed Z value.
 *
 * @param {string} line
 * @returns {{tokens: string[], zValue: number|null}|null}
 */
export function parseModalTokens(line) {
  if (typeof line !== "string") return null;
  // Strip comments
  let work = line;
  const parenIdx = work.indexOf("(");
  if (parenIdx >= 0) work = work.slice(0, parenIdx);
  const semiIdx = work.indexOf(";");
  if (semiIdx >= 0) work = work.slice(0, semiIdx);
  work = work.trim();
  if (work.length === 0) return { tokens: [], zValue: null };
  // Normalize spacing for tokenization
  const parts = work.split(/\s+/);
  const tokens = [];
  let zValue = null;
  for (const p of parts) {
    const u = p.toUpperCase();
    // G/M codes — match leading G or M followed by digits
    const gm = u.match(/^([GM])(\d+)$/);
    if (gm) {
      tokens.push(`${gm[1]}${parseInt(gm[2], 10)}`); // canonicalize G01 → G1
      // also preserve the raw padded form for membership-testing flexibility
      if (gm[2].length > 1) tokens.push(u);
      continue;
    }
    // Z value
    const zm = u.match(/^Z(-?\d+(?:\.\d+)?)$/);
    if (zm) {
      const v = parseFloat(zm[1]);
      if (Number.isFinite(v)) zValue = v;
    }
  }
  return { tokens, zValue };
}

/**
 * Pure: build an event-stream view over a program (array of lines).
 * Each event = { lineNum (1-based), line, tokens, zValue }.
 * Empty / comment-only / pure-coordinate lines still appear but with empty tokens.
 */
export function buildEventStream(programLines) {
  if (!Array.isArray(programLines)) return null;
  const events = [];
  for (let i = 0; i < programLines.length; i++) {
    const parsed = parseModalTokens(programLines[i]);
    if (parsed == null) return null;
    events.push({
      lineNum: i + 1,
      line: programLines[i],
      tokens: parsed.tokens,
      zValue: parsed.zValue,
    });
  }
  return events;
}

const containsAny = (tokens, set) => tokens.some((t) => set.includes(t));

/**
 * Pure: SPINDLE_BEFORE_CUT — M3/M4 must precede first G1/G2/G3.
 * Returns { ok, violations: [{lineNum, reason}] }.
 */
export function checkSpindleBeforeCut(events) {
  if (!Array.isArray(events)) return null;
  let spindleSeen = false;
  for (const e of events) {
    if (containsAny(e.tokens, SPINDLE_ON_CODES)) spindleSeen = true;
    if (containsAny(e.tokens, MOTION_CODES) && !e.tokens.some((t) => t === "G0" || t === "G00")) {
      // G1/G2/G3 (cutting motion); G0 is rapid and OK without spindle
      if (!spindleSeen) {
        return {
          ok: false,
          violations: [{
            lineNum: e.lineNum,
            reason: "cutting motion before spindle-on (M3/M4)",
          }],
        };
      }
      // After first cut, no further check needed
      return { ok: true, violations: [] };
    }
  }
  return { ok: true, violations: [] };
}

/**
 * Pure: COOLANT_AFTER_SPINDLE — M7/M8 must come AFTER (or on same block as) M3/M4.
 * Coolant before spindle at speed = wet floor before tool engages = scrap.
 */
export function checkCoolantAfterSpindle(events) {
  if (!Array.isArray(events)) return null;
  let spindleSeen = false;
  for (const e of events) {
    const hasCoolantOn = containsAny(e.tokens, COOLANT_ON_CODES);
    const hasSpindleOn = containsAny(e.tokens, SPINDLE_ON_CODES);
    if (hasSpindleOn) spindleSeen = true;
    if (hasCoolantOn && !spindleSeen && !hasSpindleOn) {
      return {
        ok: false,
        violations: [{
          lineNum: e.lineNum,
          reason: "coolant-on (M7/M8) emitted before spindle-on (M3/M4)",
        }],
      };
    }
  }
  return { ok: true, violations: [] };
}

/**
 * Pure: RETRACT_BEFORE_TOOL_CHANGE — Z must be ≥ safeZ when M6 emitted.
 * Tracks the most recent Z value seen in the event stream; if M6 appears
 * before any Z >= safeZ has been issued (after the last cutting motion),
 * flag a violation.
 */
export function checkRetractBeforeToolChange(events, options) {
  if (!Array.isArray(events)) return null;
  const safeZ = Number.isFinite(options?.safeZ) ? options.safeZ : DEFAULT_SAFE_Z;
  const violations = [];
  let lastZ = null;
  for (const e of events) {
    if (e.zValue != null) lastZ = e.zValue;
    if (containsAny(e.tokens, TOOL_CHANGE_CODES)) {
      if (lastZ == null || lastZ < safeZ) {
        violations.push({
          lineNum: e.lineNum,
          reason: `tool change (M6) at Z=${lastZ == null ? "unknown" : lastZ} below safeZ=${safeZ}`,
        });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Pure: SPINDLE_OFF_BEFORE_PROGRAM_END — M5 must appear before M30/M2.
 */
export function checkSpindleOffBeforeProgramEnd(events) {
  if (!Array.isArray(events)) return null;
  let spindleEverOn = false;
  let spindleOffSeen = false;
  for (const e of events) {
    if (containsAny(e.tokens, SPINDLE_ON_CODES)) {
      spindleEverOn = true;
      spindleOffSeen = false;
    }
    if (containsAny(e.tokens, SPINDLE_OFF_CODES)) spindleOffSeen = true;
    if (containsAny(e.tokens, PROGRAM_END_CODES)) {
      if (spindleEverOn && !spindleOffSeen) {
        return {
          ok: false,
          violations: [{
            lineNum: e.lineNum,
            reason: "program end (M30/M2) reached without spindle-off (M5)",
          }],
        };
      }
      return { ok: true, violations: [] };
    }
  }
  return { ok: true, violations: [] };
}

/**
 * Pure: FEED_MODE_PRESERVED — G93/G94/G95 must not silently flip between
 * blocks without explicit re-emit (flag every change-without-explicit
 * emit). Reports any block where the inferred feed mode changes vs the
 * previously-explicitly-set mode without that block carrying its own
 * feed-mode token.
 *
 * For this lib, "preserved" means: once a feed mode is set explicitly,
 * subsequent blocks either re-emit the same mode OR contain no motion.
 * A different feed-mode code can ONLY appear on a block that also emits
 * it explicitly — which is the canonical safe pattern.
 *
 * We flag the simpler case: any feed-mode flip is logged for operator
 * review (since flipping G94↔G95 mid-program is a common silent bug).
 */
export function checkFeedModePreserved(events) {
  if (!Array.isArray(events)) return null;
  let currentMode = null;
  const violations = [];
  for (const e of events) {
    for (const t of e.tokens) {
      if (FEED_MODE_CODES.includes(t)) {
        if (currentMode != null && currentMode !== t) {
          violations.push({
            lineNum: e.lineNum,
            reason: `feed-mode flip ${currentMode} → ${t}`,
          });
        }
        currentMode = t;
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Pure: run all 5 invariants over a program. Returns a structured report.
 */
export function runAllInvariants(programLines, options) {
  const events = buildEventStream(programLines);
  if (events == null) return null;
  const results = {
    SPINDLE_BEFORE_CUT: checkSpindleBeforeCut(events),
    COOLANT_AFTER_SPINDLE: checkCoolantAfterSpindle(events),
    RETRACT_BEFORE_TOOL_CHANGE: checkRetractBeforeToolChange(events, options),
    SPINDLE_OFF_BEFORE_PROGRAM_END: checkSpindleOffBeforeProgramEnd(events),
    FEED_MODE_PRESERVED: checkFeedModePreserved(events),
  };
  let totalViolations = 0;
  for (const k of SUPPORTED_INVARIANTS) {
    if (results[k] == null) return null;
    totalViolations += results[k].violations.length;
  }
  return {
    results,
    totalViolations,
    allOk: totalViolations === 0,
    eventCount: events.length,
  };
}

/**
 * Pure: emit dialect-aware comment lines summarizing the invariant report.
 * Returns array of comment lines (1 header + 1 line per violating invariant).
 * If allOk → emits a single PASS line.
 */
export function emitInvariantReport(req) {
  if (!req || typeof req !== "object") return null;
  const { programLines, dialect } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const report = runAllInvariants(programLines, req.options);
  if (report == null) return null;
  const lines = [];
  if (report.allOk) {
    const h = formatComment(dialect, `MODAL-INVARIANTS PASS (5/5 checks) events=${report.eventCount}`);
    if (h == null) return null;
    lines.push(h);
  } else {
    const h = formatComment(
      dialect,
      `MODAL-INVARIANTS BLOCK violations=${report.totalViolations} events=${report.eventCount}`,
    );
    if (h == null) return null;
    lines.push(h);
    for (const name of SUPPORTED_INVARIANTS) {
      const r = report.results[name];
      if (r.ok) continue;
      for (const v of r.violations) {
        const line = formatComment(dialect, `BLOCK ${name} line=${v.lineNum} reason: ${v.reason}`);
        if (line == null) return null;
        lines.push(line);
      }
    }
  }
  return {
    lines,
    report,
    summary: {
      allOk: report.allOk,
      totalViolations: report.totalViolations,
      eventCount: report.eventCount,
      dialect,
      schemaVersion: MODAL_INVARIANTS_EMIT_SCHEMA_VERSION,
    },
  };
}
