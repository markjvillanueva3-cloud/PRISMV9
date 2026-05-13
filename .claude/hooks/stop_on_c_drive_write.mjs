#!/usr/bin/env node
// tier: T0
/**
 * stop_on_c_drive_write.mjs — Stop Hook
 *
 * Defense-in-depth companion to the PreToolUse `h-drive-enforcement.mjs` hook.
 * PreToolUse blocks writes BEFORE they happen. This Stop hook catches writes
 * that slipped through (subagents, spawned processes, tools outside the
 * PreToolUse matcher) AT SESSION END.
 *
 * False-positive guard: C:\Users\*\.claude\ is mirrored from H:\.claude\ by a
 * sync helper, so a C: file that also exists on H: is just a sync copy — not
 * a violation. We flag only files that exist on C: with NO counterpart on H:
 * (a genuine "written to C: only, skipping the canonical H: source").
 *
 * Forbidden C: paths (mirror h-drive-enforcement DENIED_C_CLAUDE_PATTERNS):
 *   - C:\Users\*\.claude\{commands,agents,hooks,skills,rules,plans}\**
 *   - C:\Users\*\.claude\hookify-*.md, hookify.*.md
 *
 * Output:
 *   - No violations → exit 0 with {"result":"pass"}
 *   - Violations    → exit 0 with {"decision":"block","reason":...} so
 *                     Claude surfaces the violations before stopping.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

// Note: "plans" deliberately excluded — Claude Code's plan-mode auto-writes
// whimsical-named files to ~/.claude/plans/ (e.g. composed-swinging-piglet.md).
// Those are CLI-managed transient artifacts, not source-controlled assets, and
// have no portability concern. Keeping it in the list caused every Stop event
// to block on plan-mode side effects.
const USER_AUTHORED_SUBDIRS = ["commands", "agents", "hooks", "skills", "rules"];
const HOOKIFY_FILE_RE = /^hookify[.\-][^/\\]+\.md$/i;
const H_CLAUDE_ROOT = "H:/.claude";
const MAX_DEPTH = 12;
const REPORT_LIMIT = 8;

function walk(dir, cb, depth = 0) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name);
    try {
      if (e.isDirectory()) walk(full, cb, depth + 1);
      else if (e.isFile()) cb(full);
    } catch { /* ignore permission errors */ }
  }
}

function hasHCounterpart(cFilePath, cClaudeRoot) {
  // cFilePath:   C:/Users/<u>/.claude/commands/foo.md
  // cClaudeRoot: C:/Users/<u>/.claude
  // Equivalent:  H:/.claude/commands/foo.md
  const rel = relative(cClaudeRoot, cFilePath).replace(/\\/g, "/");
  const hPath = `${H_CLAUDE_ROOT}/${rel}`;
  try { return statSync(hPath).isFile(); } catch { return false; }
}

function scanUserClaudeDirs() {
  const violations = [];
  let userHomes = [];
  try {
    userHomes = readdirSync("C:/Users", { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith(".") && d.name !== "Public")
      .map(d => join("C:/Users", d.name, ".claude").replace(/\\/g, "/"));
  } catch { return violations; }

  for (const claudeDir of userHomes) {
    if (!existsSync(claudeDir)) continue;

    // Forbidden user-authored subdirs
    for (const sub of USER_AUTHORED_SUBDIRS) {
      const target = join(claudeDir, sub).replace(/\\/g, "/");
      if (!existsSync(target)) continue;
      walk(target, (f) => {
        const norm = f.replace(/\\/g, "/");
        if (!hasHCounterpart(norm, claudeDir)) violations.push(norm);
      });
    }

    // hookify-*.md at .claude root
    try {
      const rootEntries = readdirSync(claudeDir, { withFileTypes: true });
      for (const e of rootEntries) {
        if (!e.isFile() || !HOOKIFY_FILE_RE.test(e.name)) continue;
        const full = join(claudeDir, e.name).replace(/\\/g, "/");
        if (!hasHCounterpart(full, claudeDir)) violations.push(full);
      }
    } catch { /* ignore */ }
  }

  return violations;
}

async function readStdin() {
  return new Promise(resolve => {
    let d = "";
    process.stdin.on("data", c => (d += c));
    process.stdin.on("end", () => resolve(d));
    process.stdin.on("error", () => resolve(""));
  });
}

async function main() {
  try { JSON.parse(await readStdin()); } catch { /* tolerate missing stdin */ }

  const violations = scanUserClaudeDirs();

  if (violations.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const shown = violations.slice(0, REPORT_LIMIT);
  const extra = violations.length > REPORT_LIMIT
    ? `\n  ...(${violations.length - REPORT_LIMIT} more)`
    : "";

  console.log(JSON.stringify({
    continue: false,
    reason:
      `C: drive violation — ${violations.length} user-authored file(s) written ` +
      `to forbidden C:\\Users\\*\\.claude\\{${USER_AUTHORED_SUBDIRS.join(",")}}\\ ` +
      `during this session. These must live on H:\\.claude\\ for drive-swap portability.\n` +
      `Violations:\n  - ${shown.join("\n  - ")}${extra}\n` +
      `Fix: move each file to H:\\.claude\\<subdir>\\ and delete the C: copy, ` +
      `or (for CLI-managed runtime files) confirm the path is in the allowlist ` +
      `of h-drive-enforcement.mjs.`,
  }));
}

main().catch(() => {
  // Never break Stop on our own errors — fail open.
  console.log(JSON.stringify({ continue: true }));
});
