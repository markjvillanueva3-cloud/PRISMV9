#!/usr/bin/env node
/**
 * audit-fabricated-output.mjs (ENGINE-AUDIT, slot:bravo 2026-06-19)
 *
 * Codifies the manual fabricated-output sweep that found + fixed 7 defects (feedrate=1000,
 * pathLength=100, cycleTime=5, annualParts=5000, toolCost=15, estimatedVolume=50, mrr=10).
 *
 * A FABRICATED-OUTPUT candidate = a hardcoded numeric literal assigned with an "estimate-marker"
 * comment (placeholder / assumed / rough / hardcoded / for now / TODO ...) in an engine. The
 * REGRESSION GUARD: re-run after edits; a NEW high-signal hit in a cost/quote/estimate engine that
 * is NOT on the documented allowlist (real value already in scope, or a parser-state/material-branched
 * default) fails the audit so the fabrication is caught before it ships.
 *
 * This is a CANDIDATE detector (regex over source), NOT a value-flow prover -- every NEW hit still
 * needs the human "does it reach a returned/emitted output un-overwritten?" trace (R12). The value is
 * surfacing the candidates cheaply + flagging regressions in the engines already audited.
 *
 * Usage:
 *   node scripts/audit-fabricated-output.mjs            # full report (exit 0)
 *   node scripts/audit-fabricated-output.mjs --json     # machine-readable
 *   node scripts/audit-fabricated-output.mjs --guard    # exit 1 if a NON-ALLOWLISTED hit exists
 *
 * Pure-core (`scanSource`, `classifyHit`) is exported for the node:test sibling -- no disk in the core.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINES_DIR = "mcp-server/src/engines";

// Estimate-marker words that, on a numeric-literal assignment, flag a fabricated-output candidate.
const MARKER_RE =
  /\/\/[^\n]*\b(placeholder|assumed?|estimate|hardcoded|for now|TODO|FIXME|stub|magic|fabricat)/i;
// A numeric-literal assignment: `... = 123;` or `... = 1.5` (const/let/field/property), capturing the value.
const ASSIGN_RE = /(?:^|[\s.;{(])(?:const|let|var|readonly)?\s*([A-Za-z_$][\w$]*)\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*[;,)]?\s*(\/\/.*)?$/;

/**
 * Classify a candidate hit. Returns { severity, reason }.
 * - "benign" when the surrounding line/comment marks it a parser-state / material-branched /
 *   if-not-specified / internal-estimate default (the documented healthy idiom).
 * - "review" otherwise (a NEW one of these in a cost/estimate engine is the guard-worthy case).
 */
export function classifyHit(varName, value, comment, fileName) {
  const c = (comment || "").toLowerCase();
  const v = varName.toLowerCase();
  // Documented healthy-idiom signals -> benign (these are the patterns the sweep verified as correct).
  if (/if not specified|default if|default for|parser|modal|no nose radius|material|steel|alloy|aluminum|ambient|room temp|conservative default|rapid|look-?ahead/.test(c)) {
    return { severity: "benign", reason: "documented default-if-absent / parser-state / material-branched" };
  }
  // A var literally named *_default / current* (parser modal state) -> benign.
  if (/^current[A-Z]|default$|_default/.test(varName)) {
    return { severity: "benign", reason: "named-default / parser-modal-state variable" };
  }
  // Cost/time/volume estimate words in a cost-bearing engine = the high-signal fabricated-output class.
  const costEngine = /quote|cost|estimat|pricing|roi|cycle|toolpath|mrr|volume/i.test(fileName);
  const costVar = /cost|price|rate|time|volume|parts|annual|mrr|feed|cycle/i.test(v);
  if (costEngine && costVar) {
    return { severity: "review", reason: "hardcoded cost/time/volume literal in a cost-bearing engine" };
  }
  return { severity: "review", reason: "estimate-marked hardcoded literal" };
}

/**
 * Pure scanner over a single source string. Returns candidate hits with classification.
 * @param {string} src  file contents
 * @param {string} fileName  basename (for classification + reporting)
 */
export function scanSource(src, fileName) {
  const hits = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!MARKER_RE.test(line)) continue;
    const m = line.match(ASSIGN_RE);
    if (!m) continue;
    const [, varName, valueStr] = m;
    const value = Number(valueStr);
    // Ignore trivial 0/1 toggles + array indices -- they are rarely fabricated outputs.
    if (value === 0 || value === 1) continue;
    const commentIdx = line.indexOf("//");
    const comment = commentIdx >= 0 ? line.slice(commentIdx) : "";
    const cls = classifyHit(varName, value, comment, fileName);
    hits.push({ file: fileName, line: i + 1, var: varName, value, comment: comment.trim(), ...cls });
  }
  return hits;
}

// ── BASELINE: the committed set of KNOWN candidate keys (`file::var`) as of the last --write-baseline.
// This is a RATCHET, not a clean bill of health: the baseline is the acknowledged triage backlog
// (most are benign internal estimates; a few may be untraced real fabrications). --guard fails ONLY on
// a NEW key not in the baseline -- so it prevents ADDING fabrications without forcing the whole backlog
// to be cleared first. Regenerate after triaging/fixing: `node scripts/audit-fabricated-output.mjs --write-baseline`.
const BASELINE_PATH = "state/shared/fabricated-output-baseline.json";
const keyOf = (h) => `${h.file}::${h.var}`;

function loadBaseline() {
  try {
    const j = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
    return new Set(j.keys || []);
  } catch {
    return new Set();
  }
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const guard = args.includes("--guard");
  const writeBaseline = args.includes("--write-baseline");
  const files = walk(ENGINES_DIR);
  let all = [];
  for (const f of files) {
    try { all.push(...scanSource(readFileSync(f, "utf8"), basename(f))); } catch { /* unreadable -> skip */ }
  }
  const review = all.filter((h) => h.severity === "review");

  if (writeBaseline) {
    const keys = [...new Set(review.map(keyOf))].sort();
    const out = {
      generated: "run-stamped-by-caller",
      note: "Acknowledged fabricated-output CANDIDATE backlog (file::var). NOT a clean bill of health: most are benign internal estimates, some may be untraced. --guard fails on NEW keys not listed here (ratchet). Regenerate after triage: node scripts/audit-fabricated-output.mjs --write-baseline",
      count: keys.length,
      keys,
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + "\n");
    console.log(`wrote ${keys.length} baseline keys -> ${BASELINE_PATH}`);
    return;
  }

  const baseline = loadBaseline();
  const novel = review.filter((h) => !baseline.has(keyOf(h)));
  if (json) {
    console.log(JSON.stringify({ scanned: files.length, total: all.length, review: review.length, baseline: baseline.size, novel }, null, 2));
  } else {
    console.log(`audit-fabricated-output: scanned ${files.length} engines, ${all.length} candidates, ${review.length} review-severity, ${baseline.size} baselined, ${novel.length} NEW.`);
    for (const h of novel) console.log(`  NEW ${h.file}:${h.line}  ${h.var}=${h.value}  -- ${h.reason}\n    ${h.comment}`);
    if (novel.length === 0) console.log("  OK: no NEW fabricated-output candidates beyond the baseline.");
  }
  if (guard && novel.length > 0) {
    console.error(`\n[guard] ${novel.length} NEW fabricated-output candidate(s) beyond baseline -- trace each (does it reach a returned/emitted output un-overwritten?), then fix, or accept via --write-baseline.`);
    process.exit(1);
  }
}

// Run only as CLI, not when imported by the test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
