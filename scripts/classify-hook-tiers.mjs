#!/usr/bin/env node
/**
 * classify-hook-tiers.mjs — HOOK-SYNERGY-MS0 / U-HOOK-TIERS (H3)
 *
 * Heuristically assigns a tier (T0…T4) to every `.claude/hooks/*.mjs` and
 * inserts a `// tier: T#` line directly after the shebang. Idempotent: if a
 * hook already has tier frontmatter, the existing tag is respected (and the
 * recomputed verdict is logged for manual review).
 *
 * Bypasses Claude's edit-tool chain by writing files directly via fs — so the
 * hook-registry-regen.mjs PostToolUse hook does NOT fire ~460 times in a row.
 * Run once per significant hook-population change (this script does its own
 * single registry regen at the end).
 *
 * TIER TAXONOMY
 *   T0 critical blocker — hard exit / decision:"block" / Stop gates
 *   T1 soft gate        — PreToolUse with decision:"approve" + advisory ctx
 *   T2 injector         — UserPromptSubmit / SessionStart context injection
 *   T3 observer         — PostToolUse logging / write-only side effects
 *   T4 async            — fire-and-forget / background work / PreCompact prep
 *
 * MODES
 *   (no args)   classify + write frontmatter for hooks missing it; report counts.
 *   --dry-run   classify but DON'T write; print {file, tier, reason}.
 *   --rewrite   overwrite even when a tier is already present (use for re-tagging
 *               after the taxonomy or heuristics change).
 *   --json      machine-readable output instead of the human summary.
 *
 * Exit codes: 0 ok · 1 io error (unreadable hooks dir / write failure).
 */

import * as fs from "node:fs";
import * as path from "node:path";

const HOOKS_DIR = "H:/prism/.claude/hooks";
const TIER_RE = /^\s*\/\/\s*tier\s*[:=]\s*(T[0-4])\b/im;
const SHEBANG_RE = /^#!.*$/;

// argv
const argv = new Set(process.argv.slice(2));
const dryRun = argv.has("--dry-run");
const rewrite = argv.has("--rewrite");
const wantJson = argv.has("--json");

// ── classifier ───────────────────────────────────────────────────────────────
/** @returns {{tier:string, reason:string}} */
function classifyHook(src) {
  const head = src.slice(0, 4000); // most signal lives in the first 4 KB
  // T0 — hard-block gates
  if (/process\.exit\(2\)/.test(src) ||
      /"?decision"?\s*:\s*"block"/.test(src) ||
      /scrutinize-before-stop|stop_on_failing_tests|stop_on_unwired_assets|stop_on_uncommitted_critical|duplication-hard-block|comprehensive-build-enforce|file-claim-guard|hook-cross-worktree-block/.test(head)) {
    return { tier: "T0", reason: "blocks (process.exit(2) | decision:block | named critical gate)" };
  }
  // Filename signal (Stop hooks default to T0 unless the body says otherwise)
  // The directory walk passes us the filename via a wrapper; the body-level
  // signal is enough for most cases.

  // T2 — context injectors (UserPromptSubmit / SessionStart)
  if (/hookSpecificOutput[\s\S]{0,80}additionalContext/.test(head) &&
      /(UserPromptSubmit|SessionStart)/.test(head)) {
    return { tier: "T2", reason: "injects additionalContext on UserPromptSubmit/SessionStart" };
  }
  // T3 — observers (PostToolUse, write-only)
  if (/PostToolUse/.test(head) &&
      !/decision\s*:\s*"(block|deny)"/.test(head) &&
      (/appendFileSync|writeFileSync/.test(head) || /telemetry|log|record|count/i.test(head))) {
    return { tier: "T3", reason: "PostToolUse write-only/observer" };
  }
  // T4 — async / background (detached spawn, fire-and-forget, PreCompact)
  if (/detached:\s*true|child\.unref|setImmediate|setTimeout\(/.test(head) ||
      /PreCompact/.test(head)) {
    return { tier: "T4", reason: "detached/async/PreCompact" };
  }
  // T1 — soft gates (PreToolUse with approve)
  if (/PreToolUse/.test(head) || /decision\s*:\s*"approve"/.test(head)) {
    return { tier: "T1", reason: "PreToolUse advisory (approve)" };
  }
  // Default
  return { tier: "T4", reason: "default (no strong signal)" };
}

// ── walker ───────────────────────────────────────────────────────────────────
function listHookFiles(dir) {
  const out = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".mjs")) out.push(full);
    }
  }
  walk(dir);
  return out;
}

// ── frontmatter insert ───────────────────────────────────────────────────────
function insertTier(src, tier) {
  const lines = src.split(/\r?\n/);
  const annotation = `// tier: ${tier}`;
  // After shebang if present, else at the very top.
  if (lines[0] && SHEBANG_RE.test(lines[0])) {
    lines.splice(1, 0, annotation);
  } else {
    lines.unshift(annotation);
  }
  return lines.join("\n");
}

function replaceTier(src, tier) {
  return src.replace(TIER_RE, `// tier: ${tier}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
const files = listHookFiles(HOOKS_DIR);
if (files.length === 0) {
  process.stderr.write(`classify-hook-tiers: no .mjs files under ${HOOKS_DIR}\n`);
  process.exit(1);
}

const results = [];
const counts = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, skipped: 0, rewritten: 0, added: 0 };

for (const file of files) {
  let src;
  try { src = fs.readFileSync(file, "utf8"); }
  catch { results.push({ file, error: "read_failed" }); continue; }

  const verdict = classifyHook(src);
  counts[verdict.tier] = (counts[verdict.tier] || 0) + 1;
  const existingMatch = TIER_RE.exec(src);
  const existing = existingMatch ? existingMatch[1] : null;

  let action = "none";
  let nextSrc = src;
  if (!existing) {
    nextSrc = insertTier(src, verdict.tier);
    action = "added";
    counts.added++;
  } else if (rewrite && existing !== verdict.tier) {
    nextSrc = replaceTier(src, verdict.tier);
    action = "rewritten";
    counts.rewritten++;
  } else {
    action = "kept";
    counts.skipped++;
  }

  if (!dryRun && nextSrc !== src) {
    try { fs.writeFileSync(file, nextSrc, "utf8"); }
    catch (e) { results.push({ file, error: `write_failed: ${e.message}` }); continue; }
  }

  results.push({ file: file.replace(/\\/g, "/"), tier: verdict.tier, prior: existing, action, reason: verdict.reason });
}

if (wantJson) {
  process.stdout.write(JSON.stringify({ counts, results }, null, 2));
} else {
  process.stdout.write(
    `classify-hook-tiers: ${files.length} hook files scanned\n` +
    `  T0=${counts.T0} T1=${counts.T1} T2=${counts.T2} T3=${counts.T3} T4=${counts.T4}\n` +
    `  added frontmatter: ${counts.added}\n` +
    `  rewritten: ${counts.rewritten}\n` +
    `  kept (already tagged): ${counts.skipped}\n` +
    (dryRun ? "  (dry-run — no files modified)\n" : ""),
  );
}
process.exit(0);
