#!/usr/bin/env node
/**
 * hooks-health-gate.mjs — pre-commit gate
 *
 * Blocks any commit that would ship a broken Claude Code hook.
 *
 * Every error we hit came from the same three bug classes — this gate
 * detects all three before they land:
 *
 *   1. SYNTAX — node --check on every staged .claude/hooks/*.{mjs,cjs,js}
 *
 *   2. BRACE-BLEED — mass search-replace pattern that left `}` inside a
 *      template literal instead of closing the outer JS block:
 *        `...${var } }...`    ← `}` leaked from JS into the string
 *      Signature: ${<ident><whitespace>}<whitespace>} inside backticks.
 *
 *   3. INVALID STOP SCHEMA — Stop hooks output `hookSpecificOutput` which
 *      Claude Code's Stop schema does NOT accept (only
 *      PreToolUse/UserPromptSubmit/PostToolUse/PostToolBatch do). The
 *      runtime rejects such output and the hook effectively stops working.
 *      Use `systemMessage` for Stop instead.
 *
 * Scope: STAGED files only — fast, surgical, no noise from unrelated dirty
 * files in the working tree. Exits non-zero → git aborts the commit.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Resolve node binary — same fallback chain as portable-node
function findNode() {
  const candidates = [
    "H:\\Tools\\nodejs\\node.exe",
    "/h/Tools/nodejs/node.exe",
    "C:\\Program Files\\nodejs\\node.exe",
    process.execPath, // whatever is running us
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* skip */ }
  }
  return "node";
}
const NODE = findNode();

function stagedHookFiles() {
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) {
    // If git itself broke, don't block the commit — just warn.
    console.error("[hooks-health-gate] git diff failed; skipping check.");
    return [];
  }
  return r.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((p) => /\.claude[\\/]hooks[\\/].+\.(mjs|cjs|js)$/.test(p));
}

function syntaxCheck(file) {
  const r = spawnSync(NODE, ["--check", file], { encoding: "utf8", windowsHide: true });
  if (r.status === 0) return null;
  const msg = String(r.stderr || r.stdout || "").trim();
  const first = msg.split("\n").find((l) => /SyntaxError|ReferenceError/.test(l)) || msg.split("\n")[0];
  return first.slice(0, 200);
}

// Brace-bleed: `...${<ident><whitespace>}<whitespace>}...` inside a template literal.
// The first `}` closes an interpolation; the second `}` should have been OUTSIDE
// the backticks, closing an outer JS block. If we find this inside backticks,
// it's almost always the bug.
const BRACE_BLEED_RE = /`[^`]*\$\{\s*[a-zA-Z_$][\w.$]*\s+\}\s*\}[^`]*`/;

// Invalid Stop schema: hookSpecificOutput with hookEventName "Stop".
// Multi-line aware via [\s\S] to cover both one-liner and pretty-printed forms.
const INVALID_STOP_RE = /hookSpecificOutput\s*:\s*\{[\s\S]{0,400}?hookEventName\s*:\s*["']Stop["']/;

// Bare-node spawn: spawn("node", ...) / spawnSync("node", ...) / exec("node ...")
// These fail under bash when PATH doesn't include a `node` binary (bare `node`
// resolves to node.cmd on cmd.exe but not in Git Bash). Use process.execPath.
const BARE_NODE_SPAWN_RE = /(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(\s*["']node["']/;

function patternCheck(file) {
  let content;
  try { content = fs.readFileSync(file, "utf8"); } catch { return null; }
  const issues = [];
  if (BRACE_BLEED_RE.test(content)) {
    const m = content.match(BRACE_BLEED_RE);
    issues.push(`brace-bleed pattern found — a \`}\` leaked into a template literal (see: ${JSON.stringify(m[0].slice(0, 60))}...)`);
  }
  if (INVALID_STOP_RE.test(content)) {
    issues.push(`invalid Stop schema — Stop hooks may NOT output hookSpecificOutput; use 'systemMessage' instead`);
  }
  if (BARE_NODE_SPAWN_RE.test(content)) {
    issues.push(`bare \`node\` spawn — bash can't resolve bare "node" on Windows. Use process.execPath instead`);
  }
  return issues.length ? issues : null;
}

// ---- main ----
const files = stagedHookFiles();
if (files.length === 0) process.exit(0);

const failures = [];
for (const rel of files) {
  const abs = path.resolve(rel);
  if (!fs.existsSync(abs)) continue; // staged-for-delete — already skipped by filter, but defensive
  const syn = syntaxCheck(abs);
  const pat = patternCheck(abs);
  if (syn || pat) {
    failures.push({ file: rel, syntax: syn, patterns: pat });
  }
}

if (failures.length === 0) {
  console.log(`[hooks-health-gate] ✓ ${files.length} staged hook(s) pass syntax + pattern checks`);
  process.exit(0);
}

console.error("");
console.error("═══════════════════════════════════════════════════════════════════════════");
console.error(" HOOKS HEALTH GATE — COMMIT BLOCKED");
console.error("═══════════════════════════════════════════════════════════════════════════");
for (const { file, syntax, patterns } of failures) {
  console.error(`\n  ${file}`);
  if (syntax) console.error(`    • syntax: ${syntax}`);
  if (patterns) for (const p of patterns) console.error(`    • ${p}`);
}
console.error("");
console.error("  Fix these hooks before committing. Reference:");
console.error("    - Run:  node --check <hook>.mjs");
console.error("    - Stop hook output schema: { continue, systemMessage, suppressOutput, stopReason }");
console.error("    - hookSpecificOutput is ONLY for PreToolUse/UserPromptSubmit/PostToolUse/PostToolBatch");
console.error("═══════════════════════════════════════════════════════════════════════════");
console.error("");
process.exit(1);
