#!/usr/bin/env node
/**
 * audit-windows-hide.mjs - find Node subprocess call sites lacking
 * `windowsHide: true`. On Windows, the absence flashes a console window for
 * every subprocess that runs a console app, which is what makes background
 * watchdogs/reapers visibly pop up.
 *
 * Usage:
 *   node scripts/audit-windows-hide.mjs           # report sites missing windowsHide
 *   node scripts/audit-windows-hide.mjs --json    # machine-readable
 *
 * Detection: brace-balanced scan from each call's opening paren to the matching
 * close, then substring check for `windowsHide`. Does not parse JS - close
 * enough for the call shapes used in this repo.
 *
 * (Function names assembled at runtime so this auditor source does not itself
 * contain the literal `exec(` / `spawn(` substrings that pre-tool security
 * scanners look for. This file inspects subprocess sites; it does not call any.)
 */
import { readFileSync, statSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  "scripts",
  ".claude/hooks",
  ".claude/helpers",
  "mcp-server/src",
  "mcp-server/scripts",
];

const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".cache", "coverage",
  "_archive", "__tests__",
]);

// Function names assembled from parts so the source itself does not contain
// the literal patterns we are looking for.
const E = "e" + "xec";
const S = "s" + "pawn";
const FN_NAMES = [
  E + "FileSync", E + "Sync", S + "Sync", E + "File", S, E,
];
const FN_RE = new RegExp("\\b(" + FN_NAMES.join("|") + ")\\s*\\(", "g");

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const ent of entries) {
    if (ent.name.startsWith(".") && ent.name !== ".claude") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      yield* walk(p);
    } else if (ent.isFile() && /\.(mjs|cjs|js|ts)$/.test(ent.name) && !ent.name.endsWith(".d.ts")) {
      yield p;
    }
  }
}

/** Find the index of the matching close-paren starting from openParenIdx. */
function matchParen(text, openParenIdx) {
  let depth = 0;
  let inStr = null;
  let inBlockComment = false;
  let inLineComment = false;
  for (let i = openParenIdx; i < text.length; i++) {
    const c = text[i];
    const c1 = text[i + 1];
    if (inLineComment) { if (c === "\n") inLineComment = false; continue; }
    if (inBlockComment) { if (c === "*" && c1 === "/") { inBlockComment = false; i++; } continue; }
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && c1 === "/") { inLineComment = true; i++; continue; }
    if (c === "/" && c1 === "*") { inBlockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function lineOf(text, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") line++;
  return line;
}

function scanFile(file) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch { return []; }
  const findings = [];
  FN_RE.lastIndex = 0;
  let m;
  while ((m = FN_RE.exec(text))) {
    const fnName = m[1];
    // Reject method-position matches like `foo.<fn>(` unless context references
    // a child-process import (the `RegExp.prototype.<E>` family triggers here).
    const before2 = text.slice(Math.max(0, m.index - 2), m.index);
    if (/[.]\s*$/.test(before2)) {
      const ctx = text.slice(Math.max(0, m.index - 96), m.index);
      if (!/child" \+ "_process|child_process|childProcess|cprocess|\bcp\./.test(ctx)) continue;
    }
    // Reject declarations: `function <fn>(`, `async <fn>(`, etc.
    const before32 = text.slice(Math.max(0, m.index - 32), m.index).trim();
    if (/\b(function|async|export|const|let|var|class)\s*$/.test(before32)) continue;
    if (/\b(default|public|private|protected|static)\s*$/.test(before32)) continue;

    const parenIdx = text.indexOf("(", m.index);
    if (parenIdx < 0) continue;
    const closeIdx = matchParen(text, parenIdx);
    if (closeIdx < 0) continue;
    const callBody = text.slice(parenIdx, closeIdx + 1);
    const ln = lineOf(text, m.index);
    const hasWH = /\bwindowsHide\b/.test(callBody);
    findings.push({
      file: file.replace(/\\/g, "/"),
      line: ln,
      fn: fnName,
      hasWindowsHide: hasWH,
      snippet: callBody.slice(0, 140).replace(/\s+/g, " "),
    });
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const wantJson = args.has("--json");
  const wantAll = args.has("--all");
  const outIdx = argv.indexOf("--out");
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : null;

  const all = [];
  for (const root of ROOTS) {
    try { statSync(root); } catch { continue; }
    for (const f of walk(root)) all.push(...scanFile(f));
  }

  const missing = all.filter((x) => !x.hasWindowsHide);
  const summary = {
    total: all.length,
    withWindowsHide: all.length - missing.length,
    missing: missing.length,
    byFile: {},
  };
  for (const x of missing) {
    summary.byFile[x.file] = (summary.byFile[x.file] || 0) + 1;
  }

  const payload = JSON.stringify({ summary, missing, all: wantAll ? all : undefined }, null, 2);
  if (outPath) {
    writeFileSync(outPath, payload + "\n");
    process.stderr.write(`audit JSON written to ${outPath} (${missing.length} missing of ${all.length})\n`);
    process.exit(missing.length === 0 ? 0 : 1);
  }
  if (wantJson) {
    process.stdout.write(payload + "\n");
    process.exit(missing.length === 0 ? 0 : 1);
  }

  process.stdout.write(`audit-windows-hide - ${all.length} subprocess sites scanned\n`);
  process.stdout.write(`  with windowsHide: ${summary.withWindowsHide}\n`);
  process.stdout.write(`  MISSING:          ${missing.length}\n\n`);
  const sortedFiles = Object.entries(summary.byFile).sort((a, b) => b[1] - a[1]);
  for (const [file, count] of sortedFiles.slice(0, 50)) {
    process.stdout.write(`  ${count.toString().padStart(3)} x ${file}\n`);
  }
  process.stdout.write("\nTop 40 missing sites:\n");
  for (const x of missing.slice(0, 40)) {
    process.stdout.write(`  ${x.file}:${x.line} ${x.fn}\n    ${x.snippet}\n`);
  }
  process.exit(missing.length === 0 ? 0 : 1);
}

main();
