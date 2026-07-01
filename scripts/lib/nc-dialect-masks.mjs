// nc-dialect-masks.mjs — per-dialect volatile-comment masks + golden round-trip classifier.
//
// The arm of CIMCO post-proof that is provable OFFLINE today: given a golden NC program and a
// candidate (re-emitted, or a re-saved sibling), classify the difference as
//   - byte-identical        : equal even raw
//   - volatile-header-only  : equal AFTER masking volatile header comments (dates/times/paths) →
//                             SAME program, only the non-semantic header churned (SAFE).
//   - semantic-drift        : differs even after masking → genuine content/version difference (NOT safe;
//                             must be reconciled before it can be a golden baseline).
// CIMCO File Compare is too lenient (ignores renumber+spacing); we do a strict diff and mask ONLY the
// header lines that are provably non-semantic. The masks are derived from JM's OWN golden files (not any
// vendor manual — echo refuses re-deriving dialect codes from copyrighted manuals).
//
// SAFETY: a mask must NEVER alter semantic G-code (motion / tool / material / offset / O-number). Every
// pattern below is anchored to a header-comment token (DATE=/TIME=/FILE -/source:/paren-only-date) that
// cannot appear in real motion. Tests assert masks leave a clean G-code body untouched.
//
// Plugs into scripts/lib/nc-normalize.mjs `compareNC(..., { volatileCommentMask })`. No deps beyond it.
// Tests: scripts/lib/nc-dialect-masks.test.mjs. Wiki: [[cimco-verification-simulation-integration]].

import { compareNC, normalizeNC } from "./nc-normalize.mjs";

// Reusable volatile patterns (JS regex STRINGS; applied per-line before structural collapse).
// SAFETY (P0 hardening, adversarial-review-driven): every pattern is PAREN-ANCHORED (requires `(`…`)`)
// and FAILS CLOSED — if a non-volatile token is appended inside the comment (e.g. `=A`), the pattern
// no longer matches and the line is left intact (the difference surfaces as drift). Unanchored/greedy
// tails would otherwise swallow semantic G-code on a paren-less line or a sibling token in the same paren.
// `normalizeNC` applies these per line with no "is-comment?" gate, so the regex IS the only safety boundary.
const P = {
  // (DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40) — DATE(+optional TIME) ONLY. A trailing `=token` (e.g.
  // " SETUP=A") contains `=`, which is excluded from the value class → no match → not masked (fail-closed).
  mastercamDate: { name: "date", pattern: "\\(\\s*DATE=[\\w:\\- ]*(?:TIME=[\\w:\\- ]*)?\\)", replacement: "(DATE)", flags: "gi" },
  mastercamTime: { name: "time", pattern: "\\(\\s*TIME=[\\w:\\- ]*\\)", replacement: "(TIME)", flags: "gi" },
  // (MCX|MCAM|NC FILE - <path>) — paren-anchored; path tail excludes `=` so an appended `TOOL=T1` fails closed.
  mastercamFile: { name: "srcfile", pattern: "\\(\\s*(?:MCX|MCAM|NC)\\s*FILE\\s*-\\s*[^)=\\n]*\\)", replacement: "(FILE)", flags: "gi" },
  // (  source: H:\\PRISM\\...nc) PRISM header — paren-anchored; `=`-excluded tail.
  prismSource: { name: "prism-source", pattern: "\\(\\s*source:\\s*[^)=\\n]*\\)", replacement: "(source)", flags: "gi" },
  // Mitsubishi EDM: a comment whose SOLE content is a dd/dd/dd date, e.g. "(03/07/22)". Gated to the
  // mitsubishi-edm dialect ONLY (never in a union) so a stray date-shaped comment elsewhere is not collapsed.
  mitsubishiDate: { name: "edm-date", pattern: "\\(\\s*\\d{2}/\\d{2}/\\d{2}\\s*\\)", replacement: "(DATE)", flags: "g" },
  // Okuma OSP main-program-name header — a line-1 token like `$CASEWSR.MIN%` that ECHOES the file's own
  // name (zero machining semantics; two copies of the same program differ ONLY here). Anchored to a line
  // that STARTS with `$`, ends `.MIN%` — a real OSP motion line never matches, so masking is fail-closed.
  // Derived from JM's own native-OSP goldens (recon 2026-06-03), NOT a manual.
  okumaProgName: { name: "okuma-progname", pattern: "^\\$[^\\n]*\\.MIN%", replacement: "(OKUMA-PROG)", flags: "gim" },
};

/** Per-dialect volatile-comment mask sets (derived from JM golden files). */
export const DIALECT_MASKS = {
  mastercam: [P.mastercamDate, P.mastercamTime, P.mastercamFile], // Mastercam-posted Haas/Okuma in-house
  "haas-nc": [P.mastercamDate, P.mastercamTime, P.mastercamFile],
  // Okuma OSP: the `$NAME.MIN%` program-name echo is the dominant volatile line on native goldens;
  // keep the Mastercam header masks too (some OSP .MIN carry a Mastercam-posted header — Family B).
  "okuma-osp": [P.okumaProgName, P.mastercamDate, P.mastercamTime, P.mastercamFile],
  prism: [P.prismSource, P.okumaProgName, P.mastercamDate, P.mastercamTime, P.mastercamFile], // PRISM's own output (lathe-upgrade is OSP)
  "mitsubishi-edm": [P.mitsubishiDate],
  hurco: [], // PRISM v11 .hnc — minimal header, no volatile lines observed
};

const _toMask = (arr) => arr.map((p) => ({ pattern: p.pattern, replacement: p.replacement, flags: p.flags }));

/**
 * The volatileCommentMask array for a dialect. FAIL-CLOSED: an unrecognized/unknown dialect masks NOTHING
 * (every difference is treated as potential semantic drift). A safety gate must never apply an unsure mask.
 */
export function maskFor(dialect) {
  const key = String(dialect || "").toLowerCase();
  return key in DIALECT_MASKS ? _toMask(DIALECT_MASKS[key]) : [];
}

/** Heuristic dialect detection from a program header (first ~1.2KB). */
export function detectDialect(text) {
  const t = String(text || "").slice(0, 1200);
  if (/===\s*PRISM\s+JM-Die/i.test(t)) return "prism";
  // Mitsubishi EDM needs a STRONG signal (Adaptive-Control M-code, or an L### label + an H-variable bank) —
  // NOT merely a date-shaped paren, which can appear in any dialect and would misroute onto the date-collapse mask.
  if (/M9\d\s*\(Adaptive Control/i.test(t) || (/^L\d{3}\b/m.test(t) && /^\s*H\d+\s*=/m.test(t))) return "mitsubishi-edm";
  if (/MCX\s*FILE|MCAM\s*FILE|DATE=DD-MM-YY/i.test(t)) return "mastercam"; // Mastercam-posted Haas/Okuma
  if (/^O1001\b/m.test(t)) return "hurco";
  // Native Okuma OSP (checked AFTER mastercam — a Mastercam-posted .MIN routes to mastercam): the
  // `$NAME.MIN%` program-name header, or OSP common-call blocks (DEF WORK / /CALL OBAR). Recon 2026-06-03.
  if (/^\$[^\n]*\.MIN%/im.test(t) || /^\s*DEF WORK\b/im.test(t) || /\/CALL OBAR\b/i.test(t)) return "okuma-osp";
  return "unknown";
}

/**
 * @typedef {Object} RoundTripResult
 * @property {string} dialect
 * @property {"byte-identical"|"volatile-header-only"|"semantic-drift"} classification
 * @property {boolean} safe - true iff the two are the same program (modulo volatile header churn).
 * @property {boolean} rawEqual
 * @property {boolean} maskedEqual
 * @property {{line:number,a:string|null,b:string|null}|null} firstDiff - first SEMANTIC diff (post-mask).
 */

/**
 * Classify golden-vs-candidate NC difference after masking dialect-volatile headers.
 * @param {string} goldenText
 * @param {string} candidateText
 * @param {{dialect?: string}} [opts] - dialect override; auto-detected from golden header if omitted.
 * @returns {RoundTripResult}
 */
export function roundTrip(goldenText, candidateText, opts = {}) {
  const dialect = opts.dialect || detectDialect(goldenText);
  const mask = maskFor(dialect);
  const raw = compareNC(goldenText, candidateText);
  const masked = compareNC(goldenText, candidateText, { volatileCommentMask: mask });
  let classification;
  if (raw.equal) classification = "byte-identical";
  else if (masked.equal) classification = "volatile-header-only";
  else classification = "semantic-drift";
  return {
    dialect,
    classification,
    safe: masked.equal,
    rawEqual: raw.equal,
    maskedEqual: masked.equal,
    firstDiff: masked.equal ? null : masked.firstDiff,
  };
}

// ─── CLI: classify two NC files ──────────────────────────────────────────────
function _main(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const di = argv.indexOf("--dialect");
  const dialect = di >= 0 ? argv[di + 1] : undefined;
  if (args.length < 2) {
    process.stderr.write("usage: nc-dialect-masks <golden> <candidate> [--dialect haas-nc|okuma-osp|mitsubishi-edm|prism|hurco]\n");
    return 2;
  }
  const { readFileSync } = (() => require("node:fs"))();
  const r = roundTrip(readFileSync(args[0], "utf8"), readFileSync(args[1], "utf8"), { dialect });
  process.stdout.write(JSON.stringify(r) + "\n");
  return r.safe ? 0 : 1;
}

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const _argv1 = process.argv[1] || "";
if (_argv1.endsWith("nc-dialect-masks.mjs")) process.exit(_main(process.argv.slice(2)));

// Re-export normalizeNC passthrough is intentional: callers commonly need both together.
export { normalizeNC };
