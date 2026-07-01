#!/usr/bin/env node
/**
 * fix-hook-output-shapes.mjs — Bulk-fix hook JSON output schema violations.
 *
 * BACKGROUND:
 * `hook-schema-audit.mjs` discovered 30+ hooks emitting JSON shapes Claude Code's
 * harness rejects, producing `hook_non_blocking_error` entries on every event.
 * Hooks still inject context (non-blocking), but each fires a logged error.
 * Across 5 active chats × 80 errors/session that becomes a "wall of errors".
 *
 * Three fixable bug classes:
 *
 *   A. `hookSpecificOutput: <string>`  (raw string, not object)
 *      → `systemMessage: <string>`
 *
 *   B. `hookSpecificOutput: { hookEventName: "Stop"|"PreCompact"|"SessionStart"
 *                           |"SessionEnd", additionalContext: <expr> }`
 *      (only PreToolUse/UserPromptSubmit/PostToolUse/PostToolBatch are valid)
 *      → `systemMessage: <expr>`
 *
 *   C. `hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: <expr> }`
 *      (PreToolUse schema accepts hookEventName/permissionDecision/
 *       permissionDecisionReason/updatedInput — NOT additionalContext)
 *      → `systemMessage: <expr>`
 *
 * The transform is conservative: only matches the literal patterns above.
 * Anything else (block/allow decisions, valid UserPromptSubmit shapes, raw
 * permissionDecision blocks) is left untouched.
 *
 * Usage:
 *   node H:/prism/.claude/scripts/fix-hook-output-shapes.mjs --dry-run
 *   node H:/prism/.claude/scripts/fix-hook-output-shapes.mjs
 *
 * SAFETY:
 *   - Backs each modified file up to <file>.bak before writing.
 *   - Re-parses each file as JS (basic syntax sanity) after the rewrite;
 *     if the rewrite breaks parse, restores from backup.
 *   - Run --dry-run first to preview diffs.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const HOOK_DIRS = [
  "H:/prism/.claude/hooks",
  "H:/.claude/hooks",
];
const DRY_RUN = process.argv.includes("--dry-run");

// Match a hookSpecificOutput object whose hookEventName is in the bad-event set
// OR PreToolUse with an additionalContext field. Captures the additionalContext expression.
//
// The inner expression can span multiple lines and contain template literals,
// string concatenations, function calls, ternaries — but NOT nested braces in
// our hook corpus (verified by manual inspection 2026-05-08). If a hook nests
// braces inside additionalContext, this regex will under-match and the file
// will be left untouched (safe).
const BAD_EVENTS_SHAPE_B = /hookSpecificOutput:\s*\{\s*hookEventName:\s*"(Stop|PreCompact|SessionStart|SessionEnd)"\s*,\s*additionalContext:\s*([^{}]+?)\s*,?\s*\}/g;
const PRE_TOOL_USE_WITH_ADDCONTEXT = /hookSpecificOutput:\s*\{\s*hookEventName:\s*"PreToolUse"\s*,\s*additionalContext:\s*([^{}]+?)\s*,?\s*\}/g;
// String-shape: `hookSpecificOutput: <identifier>` (where identifier has been
// declared as a string elsewhere in the file). Match `hookSpecificOutput,`
// (shorthand) or `hookSpecificOutput: <ident>`. We rewrite both keys
// simultaneously: the variable declaration and the property reference.
//
// We detect this only when the file ALSO declares `const hookSpecificOutput = ` or
// similar with a string-y RHS (template literal or string concat).
function fixStringShape(content) {
  const declMatch = content.match(/(\bconst\s+)hookSpecificOutput(\s*=\s*[`'"][\s\S]*?[`'"][^;]*;)/);
  if (!declMatch) return content;
  const refRegex = /(\{\s*continue:\s*true\s*,\s*)hookSpecificOutput(\s*,?\s*\})/g;
  if (!refRegex.test(content)) return content;
  refRegex.lastIndex = 0;
  let out = content.replace(/(\bconst\s+)hookSpecificOutput(\s*=)/, "$1systemMessage$2");
  out = out.replace(refRegex, (_, pre, post) => `${pre}systemMessage${post}`);
  return out;
}

// Class D: Non-JSON output. Hook emits plain informational text via
// `process.stdout.write(<text-expr>)` or `console.log(<text-expr>)` where the
// expression is a string/template literal (NOT already a JSON.stringify call,
// NOT already a JSON object literal). The harness rejects this with
// "non-JSON output". Fix: wrap in `JSON.stringify({continue:true,systemMessage:<expr>})`.
//
// We match SINGLE-statement emits where the argument is a template literal,
// double-quoted string, or simple identifier known to hold a string. Skipped
// when the expression contains `JSON.stringify` or `{` (already JSON).
const NONJSON_PROCESS_STDOUT = /process\.stdout\.write\(\s*(`[^`]*?`|"[^"]*?")\s*\)/g;
const NONJSON_CONSOLE_LOG = /console\.log\(\s*(`[^`]*?`|"[^"]*?")\s*\)/g;

function fixNonJsonOutput(src) {
  let out = src;
  // Only transform when the matched literal doesn't look like JSON already
  out = out.replace(NONJSON_PROCESS_STDOUT, (m, lit) => {
    if (lit.includes("JSON.stringify") || lit.startsWith('"{') || lit.startsWith("`{")) return m;
    return `process.stdout.write(JSON.stringify({ continue: true, systemMessage: ${lit} }))`;
  });
  out = out.replace(NONJSON_CONSOLE_LOG, (m, lit) => {
    if (lit.includes("JSON.stringify") || lit.startsWith('"{') || lit.startsWith("`{")) return m;
    return `console.log(JSON.stringify({ continue: true, systemMessage: ${lit} }))`;
  });
  return out;
}

// Class E: Unknown top-level keys. Specific known offenders use top-level
// `additionalContext`, `result`, `quality_alerts`, `refreshed` — the schema
// only accepts continue/suppressOutput/stopReason/decision/reason/systemMessage/
// permissionDecision/hookSpecificOutput. We rewrite the well-known bad keys
// to systemMessage where the value is a string-ish payload, or move under
// hookSpecificOutput where appropriate.
const TOP_LEVEL_ADDCONTEXT = /JSON\.stringify\(\s*\{\s*continue:\s*true\s*,\s*additionalContext:\s*([^{}]+?)\s*,?\s*\}\s*\)/g;

function fixTopLevelKeys(src) {
  let out = src;
  out = out.replace(TOP_LEVEL_ADDCONTEXT, (_, expr) => {
    return `JSON.stringify({ continue: true, systemMessage: ${expr.trim()} })`;
  });
  return out;
}

// Files where Class D (non-JSON output) and Class E (top-level additionalContext)
// should be applied. Restricted to audit-confirmed offenders to avoid
// false-positive matches on debug `console.log` calls in other hooks.
const CLASS_DE_ALLOWLIST = new Set([
  // Class D — non-JSON output (audit-flagged)
  "portable-node-guard.mjs",
  "verify-hook-refs.mjs",
  "portable-python-guard.mjs",
  "multi-computer-awareness.mjs",
  "plugin-path-fixer.mjs",
  "git-sync-fetch.mjs",
  "roadmap-resume.mjs",
  "git-sync-stop.mjs",
  "roadmap-checkpoint.mjs",
  // Class E — unknown top-level keys
  "octopus-provider-probe.mjs",
]);

function transform(src, file) {
  const isAllowedDE = CLASS_DE_ALLOWLIST.has(path.basename(file));
  let out = src;
  let changes = 0;
  const before1 = out;
  out = out.replace(BAD_EVENTS_SHAPE_B, (_, _ev, expr) => `systemMessage: ${expr.trim()}`);
  out = out.replace(PRE_TOOL_USE_WITH_ADDCONTEXT, (_, expr) => `systemMessage: ${expr.trim()}`);
  if (out !== before1) changes++;
  const before2 = out;
  out = fixStringShape(out);
  if (out !== before2) changes++;
  if (isAllowedDE) {
    const before3 = out;
    out = fixNonJsonOutput(out);
    if (out !== before3) changes++;
    const before4 = out;
    out = fixTopLevelKeys(out);
    if (out !== before4) changes++;
  }
  return { out, changes };
}

function listHookFiles() {
  const files = [];
  for (const dir of HOOK_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".mjs") || f.endsWith(".js") || f.endsWith(".cjs")) {
        files.push(path.join(dir, f));
      }
    }
  }
  return files;
}

function syntaxCheck(file) {
  // Quick parse via node --check; returns true if syntactically valid.
  // Use process.execPath (current node binary) — bare "node" doesn't resolve
  // in some sandboxed environments and returns status:null which we'd
  // mis-interpret as "syntax broken".
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status === null) {
    process.stderr.write(`syntaxCheck: spawn failed for ${file}: ${r.error?.message ?? "unknown"}\n`);
    return true; // do not block on infra failure
  }
  return r.status === 0;
}

function main() {
  const files = listHookFiles();
  const fixed = [];
  const skipped = [];
  const broken = [];

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const { out, changes } = transform(src, file);
    if (changes === 0) continue;

    if (DRY_RUN) {
      console.log(`[dry-run] would fix ${file} (${changes} change-blocks)`);
      // Show first diff hunk
      const orig = src.split("\n");
      const next = out.split("\n");
      for (let i = 0; i < Math.min(orig.length, next.length); i++) {
        if (orig[i] !== next[i]) {
          console.log(`  L${i + 1}:`);
          console.log(`    -  ${orig[i].trim().slice(0, 100)}`);
          console.log(`    +  ${next[i].trim().slice(0, 100)}`);
          break;
        }
      }
      fixed.push(file);
      continue;
    }

    const bak = file + ".bak";
    fs.writeFileSync(bak, src);
    fs.writeFileSync(file, out);
    if (!syntaxCheck(file)) {
      console.error(`SYNTAX BROKEN: ${file} — restoring from backup`);
      fs.writeFileSync(file, src);
      fs.unlinkSync(bak);
      broken.push(file);
    } else {
      fs.unlinkSync(bak);
      fixed.push(file);
      console.log(`fixed ${path.basename(file)} (${changes} block(s))`);
    }
  }

  console.log("");
  console.log(`== SUMMARY ==`);
  console.log(`  fixed:   ${fixed.length}`);
  console.log(`  broken:  ${broken.length}`);
  console.log(`  skipped: ${skipped.length}`);
  if (DRY_RUN) console.log(`  (dry-run — no files written)`);
}

main();
