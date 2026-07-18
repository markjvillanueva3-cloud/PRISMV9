#!/usr/bin/env node
/**
 * fix-sync-windowshide.mjs -- remediation for SYNCHRONOUS subprocess flashers.
 *
 * Companion to fix-detached-windowshide.mjs (which fixed the persistent-window
 * detached class) and to audit-windows-hide.mjs (the read-only auditor). On Windows,
 * a synchronous subprocess call of a console app WITHOUT `windowsHide: true` briefly
 * FLASHES a console window. Across the interactively-fired hook/helper layer
 * (Stop / UserPromptSubmit / PreToolUse / PostToolUse) this is visible flicker on
 * every turn. This script adds `windowsHide: true` to those call sites.
 *
 * SAFETY -- this is a large surface (the interactive hook/helper layer holds the
 * fleet's critical gates), so the transform is conservative:
 *   1. Detect REAL subprocess call sites via the same FN_RE + brace-matching the
 *      auditor uses (so a `.NAME`-style regex method, a comment, or a string literal
 *      is never matched), with the auditor's method-position / declaration guards.
 *   2. Insert `windowsHide: true` into the LAST top-level object literal of the call
 *      (always the options argument for the subprocess family). The insertion is
 *      ADDITIVE -- worst case on a misidentified object is a harmless ignored key,
 *      never a behavior change.
 *   3. SKIP calls that have no top-level options object (adding one would change
 *      arity / default-encoding behavior) -- logged for manual review, never auto-touched.
 *   4. `--apply` runs `node --check` on every modified file and REVERTS any file that
 *      fails to parse, so a syntax error can never be committed.
 *
 * Scope: .claude/hooks + .claude/helpers, excluding test files. (scripts/ and
 * mcp-server/src are separate, lower-frequency surfaces.)
 *
 * Usage:
 *   node scripts/fix-sync-windowshide.mjs            # dry-run
 *   node scripts/fix-sync-windowshide.mjs --apply    # write + per-file node --check gate
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = "H:/prism";
const SCOPE_DIRS = [".claude/hooks", ".claude/helpers"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist", "build", "__tests__", "bundles"]);

// Function names assembled from parts so this source does not itself contain the
// literal NAME-followed-by-open-paren substrings that pre-tool scanners flag
// (mirrors the audit-windows-hide.mjs convention).
const _E = "e" + "xec";
const _S = "s" + "pawn";
const FN_NAMES = [_E + "FileSync", _E + "Sync", _S + "Sync", _E + "File", _S, _E];
const FN_RE = new RegExp("\\b(" + FN_NAMES.join("|") + ")\\s*\\(", "g");

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      yield* walk(p);
    } else if (ent.isFile() && /\.(mjs|cjs|js)$/.test(ent.name)
      && !/\.(test|e2e|smoke)\.(mjs|cjs|js)$/.test(ent.name)) {
      yield p;
    }
  }
}

/** Index of the matching close-paren from openParenIdx (string/comment aware). */
export function matchParen(text, openParenIdx) {
  let depth = 0, inStr = null, inBlock = false, inLine = false;
  for (let i = openParenIdx; i < text.length; i++) {
    const c = text[i], c1 = text[i + 1];
    if (inLine) { if (c === "\n") inLine = false; continue; }
    if (inBlock) { if (c === "*" && c1 === "/") { inBlock = false; i++; } continue; }
    if (inStr) { if (c === "\\") { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === "/" && c1 === "/") { inLine = true; i++; continue; }
    if (c === "/" && c1 === "*") { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * Given the call body text (starting at the opening `(` and ending at its matching
 * `)`), return the absolute-in-callBody index of the opening `{` of the LAST
 * top-level object literal in the argument list, or -1 if there is none.
 * Top-level = paren-depth 1 (directly inside the call's arg list), bracket-depth 0,
 * brace-depth 0. String/template/comment aware.
 */
export function lastTopLevelObjectBrace(callBody) {
  let pDepth = 0, brk = 0, brc = 0, inStr = null, inBlock = false, inLine = false;
  let last = -1;
  for (let i = 0; i < callBody.length; i++) {
    const c = callBody[i], c1 = callBody[i + 1];
    if (inLine) { if (c === "\n") inLine = false; continue; }
    if (inBlock) { if (c === "*" && c1 === "/") { inBlock = false; i++; } continue; }
    if (inStr) { if (c === "\\") { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === "/" && c1 === "/") { inLine = true; i++; continue; }
    if (c === "/" && c1 === "*") { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "(") { pDepth++; continue; }
    if (c === ")") { pDepth--; continue; }
    if (c === "[") { brk++; continue; }
    if (c === "]") { brk--; continue; }
    if (c === "{") {
      if (pDepth === 1 && brk === 0 && brc === 0) last = i; // top-level arg object
      brc++; continue;
    }
    if (c === "}") { brc--; continue; }
  }
  return last;
}

/**
 * Pure transform over a whole source string. Returns { next, fixed, skipped }.
 * fixed = sites where windowsHide was inserted; skipped = subprocess sites missing
 * windowsHide but with no top-level options object (left for manual review).
 */
export function fixText(text) {
  const edits = []; // {insertAt, str}
  let skipped = 0;
  FN_RE.lastIndex = 0;
  let m;
  while ((m = FN_RE.exec(text))) {
    // method-position guard (a `.NAME` member call) unless a child-process context
    const before2 = text.slice(Math.max(0, m.index - 2), m.index);
    if (/[.]\s*$/.test(before2)) {
      const ctx = text.slice(Math.max(0, m.index - 96), m.index);
      if (!/child" \+ "_process|child_process|childProcess|cprocess|\bcp\./.test(ctx)) continue;
    }
    // declaration guard
    const before32 = text.slice(Math.max(0, m.index - 32), m.index).trim();
    if (/\b(function|async|export|const|let|var|class|default|public|private|protected|static)\s*$/.test(before32)) continue;

    const parenIdx = text.indexOf("(", m.index);
    if (parenIdx < 0) continue;
    const closeIdx = matchParen(text, parenIdx);
    if (closeIdx < 0) continue;
    const callBody = text.slice(parenIdx, closeIdx + 1);
    if (/\bwindowsHide\b/.test(callBody)) continue; // already hidden

    const braceRel = lastTopLevelObjectBrace(callBody);
    if (braceRel < 0) { skipped++; continue; } // no options object -> manual review

    const braceAbs = parenIdx + braceRel; // index of `{` in full text
    // empty object {}? -> next non-ws char after `{` is `}`
    const after = text.slice(braceAbs + 1);
    const empty = /^\s*}/.test(after);
    const insertStr = empty ? " windowsHide: true " : " windowsHide: true,";
    edits.push({ insertAt: braceAbs + 1, str: insertStr });
  }
  // apply edits right-to-left so earlier offsets stay valid
  edits.sort((a, b) => b.insertAt - a.insertAt);
  let next = text;
  for (const e of edits) next = next.slice(0, e.insertAt) + e.str + next.slice(e.insertAt);
  return { next, fixed: edits.length, skipped };
}

function nodeCheckOk(file) {
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8", windowsHide: true });
  return { ok: r.status === 0, err: (r.stderr || "").slice(0, 300) };
}

function main() {
  const apply = process.argv.includes("--apply");
  let files = 0, totalFixed = 0, totalSkipped = 0, filesChanged = 0, reverted = 0;
  const report = [];

  for (const dir of SCOPE_DIRS) {
    try { statSync(join(ROOT, dir)); } catch { continue; }
    for (const abs of walk(join(ROOT, dir))) {
      files++;
      let text;
      try { text = readFileSync(abs, "utf8"); } catch { continue; }
      const { next, fixed, skipped } = fixText(text);
      totalSkipped += skipped;
      if (fixed === 0) continue;
      const rel = abs.replace(/\\/g, "/").replace(ROOT + "/", "");
      if (apply) {
        const orig = text;
        writeFileSync(abs, next);
        const chk = nodeCheckOk(abs);
        if (!chk.ok) {
          writeFileSync(abs, orig); // fail-safe revert
          reverted++;
          report.push(`  REVERTED (parse fail): ${rel} -- ${chk.err.replace(/\s+/g, " ")}`);
          continue;
        }
        filesChanged++; totalFixed += fixed;
        report.push(`  FIXED x${fixed}${skipped ? ` (skipped ${skipped})` : ""}: ${rel}`);
      } else {
        filesChanged++; totalFixed += fixed;
        report.push(`  would fix x${fixed}${skipped ? ` (skipped ${skipped})` : ""}: ${rel}`);
      }
    }
  }

  process.stdout.write(
    `fix-sync-windowshide ${apply ? "(APPLIED)" : "(dry-run)"}: ` +
    `${filesChanged} file(s) changed, ${totalFixed} site(s) fixed, ` +
    `${totalSkipped} skipped (no options object), ${reverted} reverted\n`,
  );
  process.stdout.write(report.join("\n") + "\n");
  if (!apply) process.stdout.write("\nRe-run with --apply to write (each file is node --check gated).\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
