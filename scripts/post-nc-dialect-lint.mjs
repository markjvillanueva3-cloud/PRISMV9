#!/usr/bin/env node
/**
 * post-nc-dialect-lint.mjs — static NC / G-code dialect & safety linter (slot:echo)
 *
 * Lints emitted G-code TEXT (.nc / .min / .eia / .tap / .ngc / .h) against the
 * canonical controller-dialect gotchas + universal safety-ordering rules. PURE
 * STATIC — no engine, no `dist/` build, no MCP. Runs on any emitted NC file or
 * post-processor output (CI artifacts, golden archives) in milliseconds.
 * NOTE: a `.cps` is a Fusion post *definition* (JavaScript), NOT emitted NC —
 * do not lint those with this tool; lint the NC they produce.
 *
 * This is DISTINCT from the existing post-proc tooling (verified via /dedup):
 *   - scripts/find-cross-dialect-leaks.mjs  → runs the BUILT engine on scenarios (runtime validator)
 *   - .claude/hooks/auto-lint-post-edit.mjs → generic TS eslint on .ts source files
 *   - scripts/audit-post-processor-coverage.mjs → static engine-FILE coverage matrix
 * None of them lint emitted NC text against dialect rules. This does.
 *
 * Rule source: knowledge/wiki/architecture/post-processor-controller-dialect-matrix.md
 * (echo-authored) — the domain's #1 prove-out failure mode is dialect mismatch.
 *
 * Usage:
 *   node scripts/post-nc-dialect-lint.mjs <file...> [--dialect <name>] [--json] [--strict] [--quiet]
 *   cat program.nc | node scripts/post-nc-dialect-lint.mjs --dialect fanuc
 *
 * Dialects: fanuc | fanuc-generic | haas | hurco | mazak | mitsubishi | brother
 *           | doosan | fagor | okuma | siemens | heidenhain | generic | auto (default)
 *
 * Exit: 0 = no errors · 1 = ≥1 ERROR finding (or any finding with --strict) · 2 = bad invocation
 *
 * Authored 2026-05-29 by slot:echo (claude-223d9a61) — /goal "generate skills,
 * scripts and hooks for your domain for better efficiency, higher quality output".
 */

import { readFileSync, existsSync, statSync } from "node:fs";

// ── dialect families ────────────────────────────────────────────────────────
// Comment delimiter convention (the matrix: Okuma OSP uses [], Fanuc/Haas/Hurco use ()).
const FANUC_FAMILY = new Set([
  "fanuc", "fanuc-generic", "haas", "hurco", "mazak", "mitsubishi",
  "brother", "doosan", "fagor", "dmg_mori", "dmg-mori", "citizen", "generic",
]);
const OKUMA_FAMILY = new Set(["okuma"]);
const SIEMENS_FAMILY = new Set(["siemens"]);
const KNOWN_DIALECTS = new Set([
  ...FANUC_FAMILY, ...OKUMA_FAMILY, ...SIEMENS_FAMILY, "heidenhain",
]);

const SEVERITY_RANK = { ERROR: 3, WARN: 2, INFO: 1 };

// ── token helpers ───────────────────────────────────────────────────────────
// Strip parenthetical comments for code-token detection (standard Fanuc-style).
function stripParenComments(line) {
  return line.replace(/\([^)]*\)/g, " ");
}
// Uppercased, comment-stripped view for matching G/M/S/F words.
function codeView(line) {
  return stripParenComments(line).toUpperCase();
}
// Find whole G/M codes (G0, G00, M6, M06, G94 …) tolerating optional leading zeros.
function hasCode(view, letter, num) {
  // \bM0?8\b style — matches M8 and M08
  const n = String(num);
  const padded = n.length === 1 ? `0?${n}` : n;
  return new RegExp(`(?:^|[^A-Z0-9])${letter}${padded}(?![0-9])`, "").test(view);
}
function hasAnyCode(view, letter, nums) {
  return nums.some((n) => hasCode(view, letter, n));
}

// A line is a "pure comment" if, after trimming an optional block number, the
// remaining content is wholly enclosed in () or [].
function pureCommentDelim(rawLine) {
  const t = rawLine.replace(/^\s*\/?\s*N\d+\s*/i, "").trim(); // drop leading /N123
  if (/^\([^()]*\)$/.test(t)) return "(";
  if (/^\[[^\[\]]*\]$/.test(t)) return "[";
  return null;
}
// Bracket content that looks like PROSE (an Okuma-style comment leaked into a
// Fanuc post) vs a macro expression. Prose = letters+spaces, no '#' and no
// arithmetic operators.
function bracketLooksLikeComment(rawLine) {
  const m = rawLine.match(/\[([^\[\]]*)\]/);
  if (!m) return false;
  const inner = m[1];
  if (/[#+\-*/=]/.test(inner)) return false;       // macro / arithmetic → not a comment
  return /[A-Za-z]/.test(inner) && /\s/.test(inner); // has a word and a space → prose
}

// ── dialect autodetection (best-effort) ─────────────────────────────────────
function autodetectDialect(text, filename) {
  const fn = (filename || "").toLowerCase();
  if (/heid|\.h$|\.htc/.test(fn)) return "heidenhain";
  if (/okuma|osp/.test(fn)) return "okuma";
  if (/haas/.test(fn)) return "haas";
  if (/hurco|winmax/.test(fn)) return "hurco";
  if (/fanuc/.test(fn)) return "fanuc";
  if (/siemens|sinumerik/.test(fn)) return "siemens";
  if (/\bBEGIN\s+PGM\b/.test(text)) return "heidenhain";
  // Heuristic: many prose [] comments → okuma; otherwise fanuc-generic.
  const bracketComments = (text.match(/\[[^\[\]]*[A-Za-z]\s[^\[\]]*\]/g) || []).length;
  const parenComments = (text.match(/\([^()]*\)/g) || []).length;
  if (bracketComments > parenComments && bracketComments >= 2) return "okuma";
  return "fanuc-generic";
}

// ── core linter ─────────────────────────────────────────────────────────────
const MAX_LINES = 200_000; // bound — never scan a pathological file forever
const MAX_LINE_LEN = 50_000; // bound per-line regex cost (stripParenComments is O(n^2) on a minified single line)

export function lintNc(text, opts = {}) {
  const findings = [];
  const src = text == null ? "" : String(text); // normalize first — guards null/number/undefined
  const rawDialect = (opts.dialect || "auto").toLowerCase();
  const dialect = rawDialect === "auto" ? autodetectDialect(src, opts.filename) : rawDialect;
  const dialectKnown = KNOWN_DIALECTS.has(dialect);
  const isHeidenhain = dialect === "heidenhain";
  const isOkuma = OKUMA_FAMILY.has(dialect);
  const isFanucFam = FANUC_FAMILY.has(dialect);
  const isSiemens = SIEMENS_FAMILY.has(dialect);

  const allLines = src.split(/\r\n|\r|\n/);
  const lines = allLines.slice(0, MAX_LINES);
  const truncated = allLines.length > MAX_LINES;

  // Turning context: G96/G97 (CSS / constant-RPM) or a G50 spindle-speed clamp.
  // On lathes, coolant-before-spindle (M8 before M3) is conventional — NOT the
  // mill "wet floor before engagement" hazard — so R1 is downgraded there.
  const upper = src.toUpperCase();
  const isTurning = /\bG9[67]\b/.test(upper) || /\bG50\b[^\r\n]*\bS\d/.test(upper);

  const add = (line, severity, rule, message) =>
    findings.push({ line, severity, rule, message });

  // modal / one-shot state
  let spindleStarted = false;
  let sawAnyS = false;
  let feedModeSeen = false;
  let flaggedFeedMode = false;
  let sawProgramEnd = false;
  let sawBeginPgm = false;
  let cutSinceRetract = false; // true once a cut is open with no intervening Z retract

  for (let i = 0; i < lines.length; i++) {
    const rawFull = lines[i];
    const ln = i + 1;
    if (rawFull == null) continue;
    // Truncating a >50k-char line is safe — real NC blocks are short; this only
    // affects corrupt/minified input and bounds the O(n^2) comment-strip regex.
    const raw = rawFull.length > MAX_LINE_LEN ? rawFull.slice(0, MAX_LINE_LEN) : rawFull;
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    let view;
    try {
      view = codeView(raw);
    } catch {
      continue; // never crash on a pathological line
    }

    // ── Heidenhain conversational: only program-end applies ──
    if (isHeidenhain) {
      if (/\bBEGIN\s+PGM\b/.test(raw.toUpperCase())) sawBeginPgm = true;
      if (/\bEND\s+PGM\b/.test(raw.toUpperCase())) sawProgramEnd = true;
      continue;
    }

    // ── R3 program end ──
    if (hasAnyCode(view, "M", [30, 2])) sawProgramEnd = true;

    // ── R1 coolant-before-spindle (ERROR, universal) ──
    const spindleOnHere = hasAnyCode(view, "M", [3, 4]);
    // M7 mist / M8 flood are universal coolant-on. M50/M51 are aux (chip conveyor,
    // parts catcher, work light, aux axis) on many controllers — NOT coolant — so
    // excluded to avoid a false ERROR (R1 is the only ERROR-severity rule).
    const coolantOnHere = hasAnyCode(view, "M", [7, 8]);
    if (coolantOnHere && !spindleStarted && !spindleOnHere) {
      if (isTurning) {
        add(ln, "INFO", "coolant-before-spindle",
          "coolant (M7/M8) before spindle start — conventional on turning (G96/G97 CSS); verify for this machine");
      } else {
        add(ln, "ERROR", "coolant-before-spindle",
          "coolant (M7/M8) commanded before spindle start (M3/M4) — flood on a non-rotating tool / wet floor before engagement");
      }
    }

    // ── R2 spindle-start-no-speed (WARN) ──
    if (/(?:^|[^A-Z0-9])S\d/.test(view)) sawAnyS = true;
    if (spindleOnHere) {
      const sOnThisLine = /(?:^|[^A-Z0-9])S\d/.test(view);
      if (!sOnThisLine && !sawAnyS) {
        add(ln, "WARN", "spindle-start-no-speed",
          "spindle start (M3/M4) with no S word commanded on or before this line");
      }
      spindleStarted = true;
    }

    // ── feed-mode tracking (R5) ──
    if (hasAnyCode(view, "G", [93, 94, 95])) feedModeSeen = true;
    const cuttingMoveWithF = (hasAnyCode(view, "G", [1, 2, 3])) && /(?:^|[^A-Z0-9])F\d*\.?\d/.test(view);
    if (cuttingMoveWithF && !feedModeSeen && !flaggedFeedMode) {
      add(ln, "WARN", "feed-no-feedmode",
        "first feed-bearing cutting move (G1/G2/G3 F…) before any feed-mode (G93/G94/G95) is established — feed units ambiguous");
      flaggedFeedMode = true;
    }

    // ── R4 tool-change-no-retract (WARN) — fires only when a cut is OPEN (tool potentially
    // in stock). A tool change at program start, or right after a retract, is safe. ──
    if (hasCode(view, "M", 6) && cutSinceRetract) {
      add(ln, "WARN", "tool-change-no-retract",
        "tool change (M6) while a cut is open with no intervening Z retract (G28/G53/G0 Z) — rapid-through-stock risk");
    }
    const isRetract = hasCode(view, "G", 28) || hasCode(view, "G", 53) ||
      (hasCode(view, "G", 0) && /(?:^|[^A-Z0-9])Z/.test(view));
    if (isRetract) cutSinceRetract = false;
    if (hasAnyCode(view, "G", [1, 2, 3])) cutSinceRetract = true;

    // ── R6 / R7 comment-style dialect ──
    const delim = pureCommentDelim(raw);
    if (dialectKnown) {
      if (isOkuma && delim === "(") {
        add(ln, "WARN", "comment-style-okuma",
          "Okuma OSP convention is [] for comments; this line uses ()");
      }
      if (isFanucFam && bracketLooksLikeComment(raw)) {
        add(ln, "WARN", "comment-style-fanuc",
          `${dialect} convention is () for comments; this line has an Okuma-style [] prose comment`);
      }
    }

    // ── R8 modal-tap dialect ──
    if (isSiemens && hasCode(view, "G", 84)) {
      add(ln, "WARN", "modal-tap-dialect",
        "Siemens uses MCALL/CYCLE84 for tapping, not Fanuc G84");
    }
    if (isFanucFam && /(?:^|[^A-Z])MCALL\b/.test(view)) {
      add(ln, "WARN", "modal-tap-dialect",
        `${dialect} uses G84 modal tapping, not Siemens MCALL`);
    }

    // -- R9 dwell-dialect (Okuma) -- CORPUS-GROUNDED (slot:echo, 2026-06-28) --
    // The real JM Okuma lathe corpus uses `G4 F<sec>` for dwell 25,000+ times and the
    // Fanuc `G04 P<ms>` form ZERO times. A `G4 P...` on an Okuma OSP post is the wrong
    // dialect: the OSP control reads dwell off the F-address (seconds), so `G04 P0.5`
    // is malformed (~0.5 ms, effectively no dwell where a clamp-settle / chip-clear was
    // intended). Okuma dwell is `G4 F<seconds>`. (hasCode(G,4) matches G4/G04 but not
    // G40/G41/G43; the P-word gate confirms a dwell-time argument is present.)
    if (isOkuma && hasCode(view, "G", 4) && /(?:^|[^A-Z0-9])P\d/.test(view)) {
      add(ln, "WARN", "dwell-dialect-okuma",
        "Okuma OSP dwell is G4 F<seconds>, not Fanuc G04 P<ms> -- this G4 P... dwell is the wrong dialect");
    }

    // -- R9 threading-dialect (Okuma) -- CORPUS-GROUNDED (slot:echo, 2026-06-28) --
    // On Okuma OSP the threading cycle is the SINGLE-LINE G71 (G71 X Z B D U H F M33 M73).
    // Verified vs Mark's running JM programs (JM DIE/CNC LATHE/A05-LSC-25-B.MIN:149 "3-16",
    // THREAD M8X125.MIN:60 M8x1.25) and the JM Multus .cps onCyclePoint "thread-turning"
    // writeBlock (.cps:3364-3378, G71/G33 -- never G76). Fanuc/Haas G76 multi-pass threading
    // is the WRONG dialect on an OSP control: it alarms or mis-cycles.
    // NARROWED (scrutiny arm A): on Okuma OSP `G76 X.. L..` is a VALID grooving/continuous-cut
    // cycle used in ~984 real JM .MIN programs (e.g. ACME/A-11-10049-0.MIN G76 X.216 L.012), so a
    // bare G76 must NOT be flagged. Fanuc THREADING G76 always carries a P-word (G76 P______ Q.. R..
    // / G76 X.. Z.. P.. Q.. F..); gate on the P-word so ONLY mis-dialected Fanuc threading is flagged
    // and legitimate OSP G76 X/L grooving is left alone. (hasCode(G,76) matches G76 but never G760.)
    if (isOkuma && hasCode(view, "G", 76) && /(?:^|[^A-Z0-9])P\d/.test(view)) {
      add(ln, "WARN", "thread-dialect-okuma",
        "Okuma OSP threading is the single-line G71 cycle, not Fanuc G76 P.. -- this G76 P-word form is the wrong dialect (OSP G76 X/L grooving is fine)");
    }

    // -- R9 grooving/part-off-dialect (Okuma) -- CORPUS-GROUNDED (slot:echo, 2026-06-29) --
    // Okuma OSP grooving + part-off are EXPLICIT (G1 plunge + G4 F<sec> dwell + retract), NOT the
    // Fanuc G75 peck/grooving cycle. The real JM hand-written corpus uses G75 ZERO times (vs G85
    // LAP 12,103x) -- so ANY G75 on an okuma post is the wrong dialect. Unlike G76 (which has a
    // valid OSP X/L grooving form), G75 has NO valid OSP use, so no P-word gate is needed.
    // (hasCode(G,75) matches G75/G075 but never G750.)
    if (isOkuma && hasCode(view, "G", 75)) {
      add(ln, "WARN", "groove-dialect-okuma",
        "Okuma OSP grooving/part-off is explicit (G1 plunge + G4 dwell), not Fanuc G75 -- this G75 is the wrong dialect");
    }
  }

  // ── end-of-program checks ──
  if (!sawProgramEnd && !isHeidenhain) {
    add(lines.length, "WARN", "missing-program-end",
      "no program end (M30/M2) found");
  }
  if (isHeidenhain && sawBeginPgm && !sawProgramEnd) {
    add(lines.length, "WARN", "missing-program-end",
      "Heidenhain program has BEGIN PGM but no END PGM");
  }

  if (truncated) {
    add(MAX_LINES, "INFO", "file-truncated",
      `file exceeds ${MAX_LINES} lines; only the first ${MAX_LINES} were linted`);
  }

  const counts = { ERROR: 0, WARN: 0, INFO: 0 };
  for (const f of findings) counts[f.severity]++;
  return { dialect, dialectKnown, lineCount: lines.length, findings, counts };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { files: [], dialect: "auto", json: false, strict: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dialect") opts.dialect = (argv[++i] || "auto").toLowerCase();
    else if (a === "--json") opts.json = true;
    else if (a === "--strict") opts.strict = true;
    else if (a === "--quiet") opts.quiet = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a.startsWith("--")) { opts.bad = a; }
    else opts.files.push(a);
  }
  return opts;
}

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function formatText(file, res) {
  const out = [];
  for (const f of res.findings) {
    out.push(`${file}:${f.line}  [${f.severity}] ${f.rule}  ${f.message}`);
  }
  return out.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log("Usage: node scripts/post-nc-dialect-lint.mjs <file...> [--dialect <name>] [--json] [--strict] [--quiet]");
    process.exit(0);
  }
  if (opts.bad) {
    console.error(`unknown flag: ${opts.bad}`);
    process.exit(2);
  }

  const targets = [];
  if (opts.files.length === 0) {
    targets.push({ name: "<stdin>", text: readStdin() });
  } else {
    for (const f of opts.files) {
      if (!existsSync(f)) { console.error(`not found: ${f}`); process.exit(2); }
      const st = statSync(f);
      if (!st.isFile()) { console.error(`not a file: ${f}`); process.exit(2); }
      targets.push({ name: f, text: readFileSync(f, "utf8") });
    }
  }

  const results = [];
  let worst = 0;
  let totalErr = 0, totalWarn = 0;
  for (const t of targets) {
    const res = lintNc(t.text, { dialect: opts.dialect, filename: t.name });
    results.push({ file: t.name, ...res });
    totalErr += res.counts.ERROR;
    totalWarn += res.counts.WARN;
    for (const f of res.findings) worst = Math.max(worst, SEVERITY_RANK[f.severity] || 0);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ schemaVersion: "1.0.0", results }, null, 2) + "\n");
  } else if (!opts.quiet) {
    for (const r of results) {
      const body = formatText(r.file, r);
      if (body) console.log(body);
      console.log(`${r.file}: dialect=${r.dialect}${r.dialectKnown ? "" : " (unknown)"} · ${r.counts.ERROR} error · ${r.counts.WARN} warn · ${r.counts.INFO} info (${r.lineCount} lines)`);
    }
    console.log(`— total: ${totalErr} error · ${totalWarn} warn across ${results.length} file(s)`);
  }

  // exit policy
  if (totalErr > 0) process.exit(1);
  if (opts.strict && totalWarn > 0) process.exit(1);
  process.exit(0);
}

// run only when invoked directly (not when imported by the test)
const invokedDirectly = process.argv[1] && /post-nc-dialect-lint\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) main();
