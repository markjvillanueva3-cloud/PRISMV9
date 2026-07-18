#!/usr/bin/env node
/**
 * post-block-audit.mjs -- block-by-block G-code analyzer for emitted NC (slot:echo)
 *
 * Walks an emitted NC program ONE BLOCK AT A TIME and produces a per-block
 * annotated report: for every block it reports the line number, the parsed
 * address words, a motion/intent CLASS, the modal-state snapshot AFTER the
 * block executes, and any within-block / safety / dialect issues. It also
 * carries a modal-state FSM across blocks so end-of-program invariants
 * (units declared? feed-mode set? WCS selected? spindle/coolant left ON?
 * program ended?) can be checked.
 *
 * This is the operator's "fully analyze every single block" surface -- the
 * thing you read before feeding the post's output to the CIMCO simulator,
 * and the precondition the CIMCO report cross-checks. PURE STATIC -- no
 * engine, no `dist/` build, no MCP; runs on any emitted NC in milliseconds
 * and is reaper-safe (short-lived node process).
 *
 * DISTINCT from existing post-proc tooling (verified via /dedup, R8):
 *   - scripts/post-nc-dialect-lint.mjs       -> whole-file line-keyed dialect/safety FINDINGS (composed here).
 *   - PPBlockCompositionValidatorEngine (TS) -> within-block layout rules (multiple-M, word-count); a BUILT
 *                                              engine reachable via prism_pp, not an operator per-block REPORT.
 *   - scripts/lib/nc-dialect-masks.mjs       -> golden round-trip byte classification, not a per-block walk.
 *   - PostValidationSuiteEngine (TS)         -> backplot gouge/rapid-into-material, geometry not block-report.
 * None of them emit a per-block annotated walk + a modal-state trace + a
 * golden-vocabulary cross-reference. This does.
 *
 * Usage:
 *   node scripts/post-block-audit.mjs <file...> [--dialect <name>] [--json]
 *        [--golden <ref.nc>] [--issues-only] [--max-blocks N] [--strict] [--quiet]
 *   cat program.nc | node scripts/post-block-audit.mjs --dialect hurco
 *
 * --golden cross-references the candidate's emitted G/M vocabulary against a
 *   real golden NC for the same machine: codes the post emits that the golden
 *   NEVER used (surprise/promise check) + golden codes the post omits.
 *
 * Exit: 0 = no block-level ERROR; 1 = >=1 ERROR (or any issue with --strict); 2 = bad invocation
 *
 * Authored 2026-06-25 by slot:echo -- operator /goal: validate JM Die posts
 * block-by-block (CIMCO precondition).
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { lintNc } from "./post-nc-dialect-lint.mjs";

// -- bounds (never scan a pathological file forever) --------------------------
const MAX_LINES = 200_000;
const MAX_LINE_LEN = 50_000;
const RAW_PREVIEW_LEN = 60; // chars of the raw block shown in the text report

// -- modal groups (Fanuc/RS-274 canonical; the safety-relevant subset) --------
const MOTION_RAPID = [0];
const MOTION_FEED = [1];
const MOTION_ARC = [2, 3];
const MOTION_DWELL = [4];
const CANNED = [73, 74, 76, 81, 82, 83, 84, 85, 86, 87, 88, 89];
const WCS = [54, 55, 56, 57, 58, 59];
const GROUP1 = [0, 1, 2, 3, ...CANNED]; // motion modal group

// -- address-word tokenizer ---------------------------------------------------
// An NC "word" is a letter address + numeric value: G0, X10.5, M06, F250, S1200,
// I-.5, R2., H03, T4. We tokenize a comment-stripped, uppercased view so we never
// mis-read a coordinate inside a comment.
const WORD_RE = /([A-Z])\s*([+\-]?(?:\d+\.?\d*|\.\d+))/g;

// Strip BOTH Fanuc-style () and Okuma-style [] comments for code detection.
// An Okuma [] expression is a MACRO (keep in the word view) only if it references
// a variable (#) or contains arithmetic between numerics ([#100+5], [#1*#2], [2+3]).
// A bare hyphen between letters/words is PROSE -- on Okuma (where [] IS the comment
// delimiter) a comment like [ROUGH-PASS] or [X-2 RAPID] must be stripped so it never
// injects phantom address words. (Fixes per-file-scrutiny P1: '-' was mis-read as
// arithmetic, leaking hyphenated Okuma comments into tokenization -> phantom G-1/X-2.)
function looksLikeMacro(inner) {
  if (inner.includes("#")) return true;                       // variable reference
  return /[\d#)]\s*[+\-*/=]\s*[\d#(.]/.test(inner);            // arithmetic flanked by numerics
}
function stripComments(line) {
  let s = line.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\[([^\[\]]*)\]/g, (m, inner) => (looksLikeMacro(inner) ? m : " "));
  return s;
}

/** Parse one raw NC line -> { line, raw, comment, blockSkip, words:[{addr,val,raw}], hasCode }. */
export function parseBlock(rawLine, lineNo) {
  const raw = rawLine.length > MAX_LINE_LEN ? rawLine.slice(0, MAX_LINE_LEN) : rawLine;
  const commentMatch = raw.match(/\([^)]*\)|\[[^\[\]]*[A-Za-z]\s[^\[\]]*\]/);
  const comment = commentMatch ? commentMatch[0] : null;
  const blockSkip = /^\s*\//.test(raw);
  let view;
  try { view = stripComments(raw).toUpperCase(); } catch { view = ""; }
  const words = [...view.matchAll(WORD_RE)].map((m) => ({ addr: m[1], val: m[2], raw: `${m[1]}${m[2]}` }));
  return { line: lineNo, raw: raw.trimEnd(), comment, blockSkip, words, hasCode: words.length > 0 };
}

// Normalize a numeric code value: G0/G00 -> "0", G02 -> "2", G08.1 -> "8.1".
function normCode(val) { return String(Number(val)); }
function gcodes(words) { return words.filter((w) => w.addr === "G").map((w) => normCode(w.val)); }
function mcodes(words) { return words.filter((w) => w.addr === "M").map((w) => normCode(w.val)); }
function hasG(words, ...nums) {
  const set = new Set(gcodes(words));
  return nums.some((n) => set.has(String(n)));
}
function hasM(words, ...nums) {
  const set = new Set(mcodes(words));
  return nums.some((n) => set.has(String(n)));
}

/** Classify a block's primary INTENT (most safety-salient code wins). */
export function classifyBlock(b) {
  if (!b.hasCode) return b.comment ? "comment" : "blank";
  const w = b.words;
  if (hasM(w, 30, 2)) return "program-end";
  if (hasM(w, 0, 1)) return "program-stop";
  if (hasM(w, 6)) return "tool-change";
  if (hasG(w, ...CANNED)) return "canned-cycle";
  if (hasG(w, ...MOTION_DWELL)) return "dwell";
  if (hasG(w, ...MOTION_ARC)) return "arc-feed";
  if (hasG(w, ...MOTION_FEED)) return "linear-feed";
  if (hasG(w, ...MOTION_RAPID)) return "rapid";
  if (hasM(w, 3, 4)) return "spindle";
  if (hasM(w, 7, 8, 9)) return "coolant";
  if (hasG(w, ...WCS)) return "wcs-select";
  if (hasG(w, 28, 53)) return "home/machine-ref";
  if (hasM(w, 98, 99)) return "subprogram";
  if (hasG(w, 17, 18, 19, 20, 21, 40, 90, 91, 93, 94, 95)) return "modal-setup";
  if (w.some((x) => "XYZABCUVW".includes(x.addr))) return "motion-cont"; // bare-coord move
  return "other";
}

/**
 * Walk an NC program block-by-block. Returns { dialect, blocks, modal, invariants,
 * vocabulary, histogram, counts }. See file header for the full contract.
 */
export function auditNc(text, opts = {}) {
  const src = text == null ? "" : String(text);
  const allLines = src.split(/\r\n|\r|\n/);
  const lines = allLines.slice(0, MAX_LINES);

  // Compose the existing dialect/safety linter -- attach its findings per block.
  const lint = lintNc(src, { dialect: opts.dialect, filename: opts.filename });
  const findingsByLine = new Map();
  for (const f of lint.findings) {
    if (!findingsByLine.has(f.line)) findingsByLine.set(f.line, []);
    findingsByLine.get(f.line).push(f);
  }

  // Modal-state FSM carried across blocks (safety-relevant subset).
  const modal = {
    units: null, motion: null, feedMode: null, wcs: null, absInc: null,
    plane: null, comp: null, spindle: "off", coolant: "off", tool: null,
  };

  const blocks = [];
  const vocabG = new Set();
  const vocabM = new Set();
  const maxBlocks = Number.isFinite(opts.maxBlocks) ? opts.maxBlocks : Infinity;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] == null || lines[i].trim() === "") continue; // blank lines are not blocks
    if (blocks.length >= maxBlocks) break;
    const b = parseBlock(lines[i], i + 1);

    for (const g of gcodes(b.words)) vocabG.add(g);
    for (const m of mcodes(b.words)) vocabM.add(m);

    // -- update modal state --
    if (hasG(b.words, 20)) modal.units = "in";
    if (hasG(b.words, 21)) modal.units = "mm";
    if (hasG(b.words, 90)) modal.absInc = "abs";
    if (hasG(b.words, 91)) modal.absInc = "inc";
    if (hasG(b.words, 17)) modal.plane = "XY";
    if (hasG(b.words, 18)) modal.plane = "XZ";
    if (hasG(b.words, 19)) modal.plane = "YZ";
    if (hasG(b.words, 93)) modal.feedMode = "inverse-time";
    if (hasG(b.words, 94)) modal.feedMode = "ipm/mmpm";
    if (hasG(b.words, 95)) modal.feedMode = "ipr/mmpr";
    if (hasG(b.words, 40)) modal.comp = "off";
    if (hasG(b.words, 41)) modal.comp = "left";
    if (hasG(b.words, 42)) modal.comp = "right";
    for (const w of WCS) if (hasG(b.words, w)) modal.wcs = w;
    const g1Here = gcodes(b.words).map(Number).filter((g) => GROUP1.includes(g));
    if (g1Here.length) modal.motion = g1Here[g1Here.length - 1];
    // G80 cancels a canned cycle, but only clears the motion mode when no other
    // group-1 motion is commanded in the SAME block (G80 G0 Z1. retains rapid).
    if (hasG(b.words, 80) && g1Here.length === 0) modal.motion = null;
    if (hasM(b.words, 3)) modal.spindle = "cw";
    if (hasM(b.words, 4)) modal.spindle = "ccw";
    if (hasM(b.words, 5)) modal.spindle = "off";
    if (hasM(b.words, 7, 8)) modal.coolant = "on";
    if (hasM(b.words, 9)) modal.coolant = "off";
    const tWord = b.words.find((w) => w.addr === "T");
    if (tWord) modal.tool = tWord.val;

    // -- per-block issues: composed lint findings + within-block layout --
    const issues = [];
    for (const f of findingsByLine.get(b.line) || []) issues.push({ severity: f.severity, rule: f.rule, message: f.message });
    if (mcodes(b.words).length > 1) {
      issues.push({ severity: "WARN", rule: "multiple-m-per-block",
        message: `${mcodes(b.words).length} M-codes in one block -- older controls alarm` });
    }
    if (g1Here.length > 1) {
      issues.push({ severity: "WARN", rule: "multiple-motion-per-block",
        message: `multiple group-1 motion codes (${g1Here.map((x) => "G" + x).join(" ")}) -- second wins silently` });
    }

    blocks.push({
      line: b.line,
      class: classifyBlock(b),
      blockSkip: b.blockSkip,
      raw: b.raw,
      comment: b.comment,
      codes: { g: gcodes(b.words).map((x) => "G" + x), m: mcodes(b.words).map((x) => "M" + x) },
      words: b.words.map((w) => w.raw),
      issues,
      modalAfter: { ...modal },
    });
  }

  // -- invariants --
  // (a) lint findings that did NOT attach to a block (end-of-file findings like
  //     missing-program-end / file-truncated land on a trailing blank line that is
  //     not a block) are folded here so they reach `counts` instead of being
  //     silently dropped. lintNc is the single source of program-end + truncation.
  // (b) modal-state-derived checks lintNc cannot produce. Heidenhain conversational
  //     is FSM-exempt (no G20/G54/G94 vocabulary) -- mirrors lintNc's suppression.
  const invariants = [];
  const inv = (severity, rule, message) => invariants.push({ severity, rule, message });
  const blockLines = new Set(blocks.map((b) => b.line));
  for (const f of lint.findings) {
    if (!blockLines.has(f.line)) inv(f.severity, f.rule, f.message);
  }
  if (lint.dialect !== "heidenhain") {
    if (modal.units === null) inv("WARN", "units-undeclared", "no G20/G21 units declaration found -- controller uses last-modal/default units");
    if (modal.feedMode === null && (vocabG.has("1") || vocabG.has("2") || vocabG.has("3")))
      inv("WARN", "feedmode-undeclared", "cutting moves present but no feed mode (G93/G94/G95) ever set");
    if (modal.wcs === null && !vocabG.has("53")) inv("INFO", "wcs-unselected", "no work-coordinate system (G54-G59) selected");
    if (modal.spindle !== "off") inv("WARN", "spindle-on-at-end", `program ends with spindle ${modal.spindle} (no M5)`);
    if (modal.coolant !== "off") inv("WARN", "coolant-on-at-end", "program ends with coolant ON (no M9)");
  }

  const counts = { ERROR: 0, WARN: 0, INFO: 0 };
  for (const blk of blocks) for (const is of blk.issues) counts[is.severity] = (counts[is.severity] || 0) + 1;
  for (const is of invariants) counts[is.severity] = (counts[is.severity] || 0) + 1;

  const histogram = {};
  for (const blk of blocks) histogram[blk.class] = (histogram[blk.class] || 0) + 1;

  return {
    schemaVersion: "1.0.0",
    dialect: lint.dialect,
    dialectKnown: lint.dialectKnown,
    blockCount: blocks.length,
    blocks,
    modal,
    invariants,
    vocabulary: { g: [...vocabG].sort((a, b) => Number(a) - Number(b)), m: [...vocabM].sort((a, b) => Number(a) - Number(b)) },
    histogram,
    counts,
    lintFindingCount: lint.findings.length,
  };
}

/**
 * Golden-vocabulary cross-reference: which codes does the candidate post emit
 * that the GOLDEN NC for this machine never used (surprise/promise check), and
 * which golden codes does the candidate omit (coverage). Answers the operator's
 * "ensure the post does everything we promise" -- a post that emits codes the
 * shop's proven goldens never contain is a prove-out risk.
 */
export function crossRefGolden(candidate, golden) {
  const candG = new Set(candidate.vocabulary.g), candM = new Set(candidate.vocabulary.m);
  const goldG = new Set(golden.vocabulary.g), goldM = new Set(golden.vocabulary.m);
  const diff = (a, b, p) => [...a].filter((x) => !b.has(x)).map((x) => p + x);
  return {
    surprise_g: diff(candG, goldG, "G"), // candidate emits, golden never used
    surprise_m: diff(candM, goldM, "M"),
    missing_g: diff(goldG, candG, "G"),   // golden used, candidate omits
    missing_m: diff(goldM, candM, "M"),
  };
}

// -- CLI ----------------------------------------------------------------------
function parseArgs(argv) {
  const o = { files: [], dialect: "auto", json: false, golden: null, issuesOnly: false, maxBlocks: Infinity, quiet: false, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dialect") o.dialect = (argv[++i] || "auto").toLowerCase();
    else if (a === "--json") o.json = true;
    else if (a === "--golden") o.golden = argv[++i];
    else if (a === "--issues-only") o.issuesOnly = true;
    else if (a === "--strict") o.strict = true;
    else if (a === "--quiet") o.quiet = true;
    else if (a === "--max-blocks") o.maxBlocks = Number(argv[++i]) || Infinity;
    else if (a === "--help" || a === "-h") o.help = true;
    else if (a.startsWith("--")) o.bad = a;
    else o.files.push(a);
  }
  return o;
}
function readStdin() { try { return readFileSync(0, "utf8"); } catch { return ""; } }

function formatReport(file, res, opts) {
  const out = [];
  out.push(`# block-by-block audit -- ${file}`);
  out.push(`dialect=${res.dialect}${res.dialectKnown ? "" : " (unknown)"} | ${res.blockCount} blocks | ${res.counts.ERROR} err | ${res.counts.WARN} warn | ${res.counts.INFO} info`);
  out.push("");
  for (const b of res.blocks) {
    if (opts.issuesOnly && b.issues.length === 0) continue;
    const tag = b.blockSkip ? "/" : " ";
    out.push(`${tag}${String(b.line).padStart(5)} [${b.class.padEnd(13)}] ${b.raw.slice(0, RAW_PREVIEW_LEN)}`);
    for (const is of b.issues) out.push(`        > [${is.severity}] ${is.rule}: ${is.message}`);
  }
  out.push("");
  out.push(`modal-final: units=${res.modal.units} feed=${res.modal.feedMode} wcs=${res.modal.wcs ? "G" + res.modal.wcs : null} spindle=${res.modal.spindle} coolant=${res.modal.coolant} tool=${res.modal.tool}`);
  out.push(`vocabulary: G[${res.vocabulary.g.join(" ")}] M[${res.vocabulary.m.join(" ")}]`);
  for (const is of res.invariants) out.push(`invariant [${is.severity}] ${is.rule}: ${is.message}`);
  return out.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log("Usage: node scripts/post-block-audit.mjs <file...> [--dialect <name>] [--json] [--golden <ref.nc>] [--issues-only] [--max-blocks N] [--strict] [--quiet]");
    process.exit(0);
  }
  if (opts.bad) { console.error(`unknown flag: ${opts.bad}`); process.exit(2); }

  const targets = [];
  if (opts.files.length === 0) targets.push({ name: "<stdin>", text: readStdin() });
  else for (const f of opts.files) {
    if (!existsSync(f)) { console.error(`not found: ${f}`); process.exit(2); }
    if (!statSync(f).isFile()) { console.error(`not a file: ${f}`); process.exit(2); }
    targets.push({ name: f, text: readFileSync(f, "utf8") });
  }

  let goldenAudit = null;
  if (opts.golden) {
    if (!existsSync(opts.golden)) { console.error(`golden not found: ${opts.golden}`); process.exit(2); }
    goldenAudit = auditNc(readFileSync(opts.golden, "utf8"), { dialect: opts.dialect, filename: opts.golden });
  }

  const results = [];
  let totalErr = 0, totalWarn = 0;
  for (const t of targets) {
    const res = auditNc(t.text, { dialect: opts.dialect, filename: t.name, maxBlocks: opts.maxBlocks });
    const xref = goldenAudit ? crossRefGolden(res, goldenAudit) : null;
    results.push({ file: t.name, audit: res, crossRef: xref });
    totalErr += res.counts.ERROR;
    totalWarn += res.counts.WARN;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ schemaVersion: "1.0.0", results }, null, 2) + "\n");
  } else if (!opts.quiet) {
    for (const r of results) {
      console.log(formatReport(r.file, r.audit, opts));
      if (r.crossRef) {
        console.log(`golden-xref vs ${opts.golden}:`);
        console.log(`  surprise codes (post emits, golden never used): G[${r.crossRef.surprise_g.join(" ")}] M[${r.crossRef.surprise_m.join(" ")}]`);
        console.log(`  missing codes  (golden used, post omits):        G[${r.crossRef.missing_g.join(" ")}] M[${r.crossRef.missing_m.join(" ")}]`);
      }
      console.log("");
    }
  }

  if (totalErr > 0) process.exit(1);
  if (opts.strict && totalWarn > 0) process.exit(1);
  process.exit(0);
}

const invokedDirectly = process.argv[1] && /post-block-audit\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) main();
