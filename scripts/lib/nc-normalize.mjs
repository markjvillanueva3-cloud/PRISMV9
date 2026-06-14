// nc-normalize.mjs — strict NC/G-code normalizer + byte-equivalence comparator.
//
// The shared CORE of the Haas golden round-trip / byte-equivalence harness (echo's
// refuse-clause: "shipping-post-without-byte-equivalence-vs-golden") AND the CIMCO
// File-Compare consumer of SPINE-1 (`prism_cimco`). CIMCO File Compare is too lenient
// (it silently ignores block renumber + spacing); PRISM does its OWN strict diff so a
// real format drift can never hide behind that leniency.
//
// DESIGN — conservative-strict + policy-free:
//   By default we normalize ONLY documented non-semantic differences (block renumber,
//   line endings, trailing whitespace, blank-line runs). We PRESERVE everything that
//   can carry meaning: case, every address word (G/M/X/Y/Z/A/B/C/I/J/K/R/F/S/T/H/D/…),
//   decimals, comments, tape markers (`%`, `O####`), and ordering. Volatile-comment
//   policy (DATE=/TIME=/file-path headers that never round-trip) is the CALLER's to
//   supply via `volatileCommentMask` — the normalizer ships no built-in masks, so it
//   stays a pure primitive and the harness owns the verification policy.
//
// Pure functions, zero deps, deterministic. Tests: scripts/lib/nc-normalize.test.mjs.
// Wiki: [[cimco-verification-simulation-integration]]. Memory: reference_cimco_bridge_engine_spine1_2026_06_02.

/**
 * @typedef {Object} NormalizeOptions
 * @property {boolean} [stripBlockNumbers=true] strip a leading sequence number `^[ \t]*N\d+[ \t]?` (block renumber is non-semantic).
 * @property {boolean} [normalizeEol=true] convert CRLF / lone CR to LF.
 * @property {boolean} [stripTrailingWs=true] strip trailing spaces/tabs on each line.
 * @property {boolean} [collapseBlankRuns=true] collapse runs of >=2 blank lines to one + trim leading/trailing blank lines.
 * @property {boolean} [collapseInnerSpacing=false] collapse runs of inner spaces/tabs to a single space (OFF: spacing may be meaningful in comments).
 * @property {boolean} [dropComments=false] remove `(...)` and `;...` comments entirely.
 * @property {boolean} [upperCase=false] upper-case the whole program (NC codes are case-insensitive; OFF preserves comment text).
 * @property {Array<{pattern: string, replacement?: string, flags?: string}>} [volatileCommentMask] caller-supplied line substitutions (e.g. mask DATE=/TIME=/paths). Applied per line BEFORE structural collapse. `replacement` defaults to "".
 */

/** Strip `(...)` and `;...` comments from a single line, preserving non-comment content. */
function stripLineComments(line) {
  // remove parenthesised comments (Fanuc/Haas) then semicolon-to-EOL comments
  return line.replace(/\([^)]*\)/g, "").replace(/;.*$/, "");
}

/**
 * Normalize an NC/G-code program for strict byte-equivalence comparison.
 * @param {string} text - raw NC program text.
 * @param {NormalizeOptions} [opts]
 * @returns {string} normalized program (LF-joined, no trailing newline).
 */
export function normalizeNC(text, opts = {}) {
  if (typeof text !== "string") throw new Error("normalizeNC: text must be a string");
  const o = {
    stripBlockNumbers: true,
    normalizeEol: true,
    stripTrailingWs: true,
    collapseBlankRuns: true,
    collapseInnerSpacing: false,
    dropComments: false,
    upperCase: false,
    volatileCommentMask: [],
    ...opts,
  };

  // 1. line endings → LF, then split.
  let src = text;
  if (o.normalizeEol) src = src.replace(/\r\n?/g, "\n");
  let lines = src.split("\n");

  // 2. compiled volatile-comment masks (caller policy).
  const masks = (o.volatileCommentMask || []).map((m) => ({
    re: new RegExp(m.pattern, m.flags ?? "g"),
    rep: m.replacement ?? "",
  }));

  lines = lines.map((line) => {
    let s = line;
    for (const m of masks) s = s.replace(m.re, m.rep);
    if (o.dropComments) s = stripLineComments(s);
    if (o.stripBlockNumbers) s = s.replace(/^[ \t]*[Nn]\d+[ \t]?/, "");
    if (o.collapseInnerSpacing) s = s.replace(/[ \t]+/g, " ");
    if (o.stripTrailingWs) s = s.replace(/[ \t]+$/, "");
    if (o.upperCase) s = s.toUpperCase();
    return s;
  });

  // 3. blank-line handling.
  if (o.collapseBlankRuns) {
    const out = [];
    let prevBlank = false;
    for (const s of lines) {
      const blank = s.trim() === "";
      if (blank && prevBlank) continue; // collapse run
      out.push(s);
      prevBlank = blank;
    }
    while (out.length && out[0].trim() === "") out.shift(); // trim leading
    while (out.length && out[out.length - 1].trim() === "") out.pop(); // trim trailing
    lines = out;
  }

  return lines.join("\n");
}

/**
 * @typedef {Object} CompareResult
 * @property {boolean} equal - true iff the two programs are byte-equal AFTER normalization.
 * @property {number} lineCountA
 * @property {number} lineCountB
 * @property {{line: number, a: string|null, b: string|null}|null} firstDiff - 1-based first differing line (null if equal).
 * @property {string} summary
 */

/**
 * Strict byte-equivalence comparison of two NC programs after identical normalization.
 * @param {string} a
 * @param {string} b
 * @param {NormalizeOptions} [opts]
 * @returns {CompareResult}
 */
export function compareNC(a, b, opts = {}) {
  const na = normalizeNC(a, opts);
  const nb = normalizeNC(b, opts);
  const equal = na === nb;
  const la = na.split("\n");
  const lb = nb.split("\n");
  let firstDiff = null;
  if (!equal) {
    const n = Math.max(la.length, lb.length);
    for (let i = 0; i < n; i++) {
      if (la[i] !== lb[i]) {
        firstDiff = { line: i + 1, a: la[i] ?? null, b: lb[i] ?? null };
        break;
      }
    }
  }
  const summary = equal
    ? `NC byte-equivalent after normalization (${la.length} lines)`
    : `NC DIFFERS — first diff @ line ${firstDiff?.line} (A:${la.length} lines / B:${lb.length} lines)`;
  return { equal, lineCountA: la.length, lineCountB: lb.length, firstDiff, summary };
}

// ─── CLI (argv-guarded): normalize a file to stdout, or compare two files ─────
function _main(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const flag = (name) => argv.includes(`--${name}`);
  const opts = {
    stripBlockNumbers: !flag("keep-numbers"),
    collapseInnerSpacing: flag("collapse-spacing"),
    dropComments: flag("drop-comments"),
    upperCase: flag("upper"),
  };
  try {
    const { readFileSync } = (() => require("node:fs"))();
    if (args.length >= 2) {
      const r = compareNC(readFileSync(args[0], "utf8"), readFileSync(args[1], "utf8"), opts);
      process.stdout.write(JSON.stringify(r) + "\n");
      return r.equal ? 0 : 1;
    }
    if (args.length === 1) {
      process.stdout.write(normalizeNC(readFileSync(args[0], "utf8"), opts) + "\n");
      return 0;
    }
    process.stderr.write("usage: nc-normalize <file> | nc-normalize <golden> <candidate> [--keep-numbers --collapse-spacing --drop-comments --upper]\n");
    return 2;
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
}

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const _argv1 = process.argv[1];
if (_argv1 && (_argv1.endsWith("nc-normalize.mjs") || _argv1.endsWith("nc-normalize"))) {
  process.exit(_main(process.argv.slice(2)));
}
